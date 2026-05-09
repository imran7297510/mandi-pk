import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithPopup, GoogleAuthProvider, browserPopupRedirectResolver } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp, query, collection, where, getDocs, updateDoc, increment } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthorizedAdmin: boolean;
  isVerified: boolean;
  loading: boolean;
  authError: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isIframe, setIsIframe] = useState(false);

  const isSuperAdmin = user?.email?.toLowerCase() === 'imran7297510@gmail.com';
  const isAdmin = isSuperAdmin || isAuthorizedAdmin;

  useEffect(() => {
    setIsIframe(window.self !== window.top);
    
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Check for authorized admin status regardless of whether profile exists
          // Using email as ID for authorizedAdmins collection
          const authAdminDoc = doc(db, 'authorizedAdmins', currentUser.email?.toLowerCase() || 'none');
          const authAdminSnap = await getDoc(authAdminDoc);
          setIsAuthorizedAdmin(authAdminSnap.exists());

          const userDoc = doc(db, 'users', currentUser.uid);
          const snap = await getDoc(userDoc);
          if (!snap.exists()) {
            
            // Generate a random referral code
            const newReferralCode = Math.random().toString(36).substring(2, 8).toUpperCase();
            
            // Check if there is a referral ref in the URL params
            const params = new URLSearchParams(window.location.search);
            const referredByCode = params.get('ref');
            
            let referredById = null;
            if (referredByCode) {
               // Find user with this referral code
               const referrerQuery = query(collection(db, 'users'), where('referralCode', '==', referredByCode));
               const referrerSnap = await getDocs(referrerQuery);
               if (!referrerSnap.empty) {
                  const referrerDoc = referrerSnap.docs[0];
                  referredById = referrerDoc.id;
                  const currentCount = referrerDoc.data().referralCount || 0;
                  
                  // Increment their count and grant badge if they hit 10
                  const newCount = currentCount + 1;
                  const updateData: any = { referralCount: increment(1) };
                  if (newCount === 10) {
                     updateData.isVerified = true;
                     updateData.verifiedBadgeType = 'PREMIUM';
                     const expiresAt = new Date();
                     expiresAt.setMonth(expiresAt.getMonth() + 6);
                     updateData.premiumExpiresAt = expiresAt;
                     
                     // Send notification
                     const notifRef = doc(collection(db, 'notifications'));
                     await setDoc(notifRef, {
                        userId: referredById,
                        title: "🎉 Congratulations!",
                        message: "You've referred 10 people! You have been awarded the PREMIUM SELLER BADGE for 6 months.",
                        read: false,
                        createdAt: serverTimestamp()
                     });
                  } else {
                      // Just a small notification for each referral
                      const notifRef = doc(collection(db, 'notifications'));
                      await setDoc(notifRef, {
                         userId: referredById,
                         title: "New Referral Signup",
                         message: `Someone just joined using your code! Total: ${newCount}/10 for Premium.`,
                         read: false,
                         createdAt: serverTimestamp()
                      });
                  }
                  
                  await updateDoc(doc(db, 'users', referredById), updateData);
               }
            }
            
            await setDoc(userDoc, {
              isVerified: false,
              name: currentUser.displayName || '',
              email: currentUser.email || '',
              photoURL: '', // Do NOT sync Google profile image automatically as requested
              referralCode: newReferralCode,
              referralCount: 0,
              referredBy: referredById,
              createdAt: serverTimestamp()
            });
            setIsVerified(false);
          } else {
            const userData = snap.data();
            setIsVerified(userData.isVerified === true);
            setIsBlocked(userData.isBlocked === true);
          }
        } catch (error) {
          console.error("Error creating/checking user profile", error);
        }
      } else {
        setIsVerified(false);
        setIsBlocked(false);
        setIsAuthorizedAdmin(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    if (isAuthenticating) {
      console.log("Login already in progress, ignoring duplicate call.");
      return;
    }
    
    try {
        setAuthError(null);
        setIsAuthenticating(true);
        console.log("Login with Google initiated...");
        
        const provider = new GoogleAuthProvider();
        
        console.log("Calling signInWithPopup with browserPopupRedirectResolver...");
        const result = await signInWithPopup(auth, provider, browserPopupRedirectResolver);
        console.log("SignInWithPopup SUCCESS:", result.user.email);
        setUser(result.user);
    } catch (error: any) {
        console.error("Google auth failed", error);
        const errorCode = error.code;
        const errorMessage = error.message;
        setAuthError(`${errorCode}: ${errorMessage}`);
        
        if (errorCode === 'auth/unauthorized-domain') {
          alert('Firebase Configuration Error: This domain (' + window.location.hostname + ') is not authorized for Google Sign-In. \n\nAdmin Action Required: Go to your Firebase Console > Authentication > Settings > Authorized Domains and add "' + window.location.hostname + '".');
        } else if (errorCode === 'auth/popup-blocked') {
          alert('The login popup was blocked by your browser. Please allow popups for this site or open the app in a new tab using the icon at the top right.');
        } else if (errorCode === 'auth/operation-not-allowed') {
          alert('Google Login is not enabled in your Firebase Project. Admin must enable "Google" as a sign-in provider in the Firebase Console.');
        } else if (errorCode === 'auth/popup-closed-by-user') {
           // Normal cancellation, no alert needed
        } else {
          alert('Login Failed: ' + errorMessage + ' (Code: ' + errorCode + ')');
        }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const logout = async () => {
    await auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAdmin, 
      isSuperAdmin,
      isAuthorizedAdmin,
      isVerified, 
      loading, 
      authError, 
      loginWithGoogle, 
      logout 
    }}>
      {!loading && (
        isBlocked ? (
          <div className="min-h-screen bg-stone-900 flex items-center justify-center p-4">
             <div className="bg-white p-12 rounded-[3rem] shadow-2xl max-w-lg w-full text-center border-t-8 border-red-500">
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                   </svg>
                </div>
                <h1 className="text-4xl font-black text-stone-900 uppercase italic tracking-tighter mb-4">Access Denied</h1>
                <p className="text-stone-500 font-medium mb-8 leading-relaxed">
                  Your account has been suspended by the Mandi.pk administration due to a violation of our community safety policies. 
                  <br /><br />
                  If you believe this is a mistake, please contact our support hotline.
                </p>
                <div className="flex flex-col gap-3">
                   <a href="tel:+923467297510" className="bg-stone-900 text-white py-4 rounded-2xl font-black uppercase italic tracking-widest text-xs hover:bg-stone-800 transition-all">
                      Call Support Verify
                   </a>
                   <button onClick={() => logout()} className="text-stone-400 font-black uppercase text-[10px] tracking-[0.3em] py-2">
                      Sign Out
                   </button>
                </div>
             </div>
          </div>
        ) : children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
