import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { UserProfile, Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import { ListingCard } from '../components/ListingCard';
import { User, MapPin, CheckCircle, Award, Eye, Calendar, ShieldCheck, Search, AlertTriangle, MessageCircle, X, Crown } from 'lucide-react';

export function PublicProfile() {
  const { id } = useParams<{ id: string }>();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      fetchProfileData(id);
    }
  }, [id]);

  const handleReportProfile = async () => {
    if (!user) {
      alert("Please login to report this profile.");
      return;
    }
    const reason = prompt("Why are you reporting this profile? (Fraud, Fake listings, Abusive content, etc.)");
    if (!reason || reason.trim().length === 0) return;
    
    try {
      const reportRef = doc(collection(db, 'profileReports'));
      await setDoc(reportRef, {
        profileId: id,
        reporterId: user.uid,
        reason: reason.trim(),
        status: 'OPEN',
        createdAt: serverTimestamp()
      });
      alert('Report submitted successfully. Our team will review this profile.');
    } catch (e) {
      console.error(e);
      alert('Failed to submit report.');
    }
  };

  const initiateChat = async () => {
    if (!user) {
      alert("Please login to chat.");
      return;
    }
    if (user.uid === id) return;
    try {
       const q = query(
         collection(db, 'chats'),
         where('buyerId', '==', user.uid),
         where('sellerId', '==', id)
       );
       const snapshot = await getDocs(q);
       if (!snapshot.empty) {
         navigate('/messages');
         return;
       }
       const chatRef = doc(collection(db, 'chats'));
       await setDoc(chatRef, {
         listingId: 'PROFILE_CHAT',
         buyerId: user.uid,
         sellerId: id,
         lastMessage: '',
         updatedAt: serverTimestamp()
       });
       navigate('/messages');
    } catch (e) {
      console.error(e);
    }
  };
  const fetchProfileData = async (userId: string) => {
    setLoading(true);
    try {
      // 1. Fetch User Profile
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        setLoading(false);
        return;
      }
      
      const userData = { id: userDoc.id, ...userDoc.data() } as UserProfile;
      setProfile(userData);

      // 2. Increment Profile Views
      try {
        await updateDoc(doc(db, 'users', userId), {
          views: increment(1)
        });
      } catch (err) {
        console.warn("Could not increment views", err);
      }

      // 3. Fetch User's Active Listings
      const q = query(collection(db, 'listings'), where('ownerId', '==', userId));
      const snap = await getDocs(q);
      setListings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Listing)));
      
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-stone-500">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="py-20 text-center text-stone-500">Profile not found.</div>;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 lg:py-12 flex-1 w-full">
      {/* Profile Header */}
      <div className="bg-white rounded-3xl p-8 mb-8 border border-stone-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-stone-800 to-amber-900" />
        
        <div className="relative pt-12 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start text-center md:text-left">
          
          <div className="relative shrink-0">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-white shadow-md bg-white overflow-hidden">
              {profile.photoURL ? (
                <img src={profile.photoURL} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-stone-100 text-stone-400">
                  <User className="w-16 h-16" />
                </div>
              )}
            </div>
            {profile.isVerified && (
              <div className="absolute bottom-2 right-2 bg-white rounded-full p-1.5 shadow-xl ring-4 ring-white">
                {profile.verifiedBadgeType === 'GOLDEN' || profile.isPremiumVerified ? (
                   <div className="bg-gradient-to-tr from-amber-400 to-yellow-600 p-2 rounded-full shadow-inner animate-pulse">
                      <Crown className="w-8 h-8 text-stone-900" />
                   </div>
                ) : (
                   <div className="bg-blue-500 p-2 rounded-full shadow-inner">
                      <CheckCircle className="w-8 h-8 text-white" />
                   </div>
                )}
              </div>
            )}
          </div>

          <div className="flex-1 mt-2 md:mt-16">
            <h1 className="text-3xl md:text-4xl font-black text-stone-900 mb-2 flex flex-col md:flex-row items-center gap-3">
              {profile.name || 'Anonymous User'}
              {profile.isVerified && (
                <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm border ${profile.isPremiumVerified ? 'bg-amber-500 text-stone-900 border-amber-600/20' : 'bg-blue-600 text-white border-blue-700'}`}>
                  {profile.isPremiumVerified ? (
                    <><Crown className="w-3.5 h-3.5" /> Premium Seller</>
                  ) : (
                    <><ShieldCheck className="w-3.5 h-3.5" /> Verified</>
                  )}
                </span>
              )}
            </h1>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-sm text-stone-600 mb-6">
              {profile.city && (
                <span className="flex items-center gap-1.5 bg-stone-100 px-3 py-1.5 rounded-lg font-medium">
                  <MapPin className="w-4 h-4 text-amber-600" /> {profile.city}
                </span>
              )}
              <span className="flex items-center gap-1.5 bg-stone-100 px-3 py-1.5 rounded-lg font-medium">
                <Calendar className="w-4 h-4 text-blue-600" /> Joined {profile.createdAt?.toDate().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </span>
              <span className="flex items-center gap-1.5 bg-stone-100 px-3 py-1.5 rounded-lg font-medium text-stone-400">
                <Eye className="w-4 h-4" /> {profile.views || 0} Views
              </span>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
               <button onClick={initiateChat} className="bg-stone-900 text-white px-8 py-3 rounded-xl font-black text-sm hover:bg-stone-800 transition-all flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" /> Message Seller
               </button>
               <button onClick={handleReportProfile} className="bg-stone-100 text-stone-500 px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-all flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> Report Profile
               </button>
            </div>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-stone-900">Listings by {profile.name}</h2>
          <span className="bg-stone-200 text-stone-700 px-3 py-1 rounded-full text-sm font-bold">{listings.length} Items</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
          {listings.length === 0 && (
            <div className="col-span-full py-20 text-center bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col items-center">
              <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-stone-400" />
              </div>
              <p className="text-stone-500 font-medium">This user has not listed any items yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
