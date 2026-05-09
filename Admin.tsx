import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, updateDoc, doc, deleteDoc, serverTimestamp, setDoc, where, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, Report, UserProfile, PromotionRequest, AuthorizedAdminEmail } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle, 
  XCircle, 
  Trash2, 
  Eye, 
  CheckSquare, 
  Database, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  MessageCircle, 
  User, 
  Users,
  Rocket, 
  Zap, 
  Clock,
  UserX,
  UserCheck,
  UserPlus,
  LayoutGrid,
  ClipboardList,
  AlertCircle,
  FileBadge,
  Ticket,
  Speaker,
  LogOut,
  Plus,
  Home as HomeIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatPKR } from '../lib/utils';
import { Link } from 'react-router-dom';

const SAMPLE_LISTINGS = [
  {
    title: "1948 Antique Pakistan 1 Rupee Coin",
    description: "Rare first edition 1 Rupee coin issued by the Government of Pakistan in 1948. Excellent condition with clear markings.",
    category: "Coins",
    price: 15000,
    quantity: 1,
    shippingCharges: 250,
    images: ["https://images.unsplash.com/photo-1621217596001-c85c292150a2?auto=format&fit=crop&q=80&w=800"],
    sellerName: "Ahmad Antiquities",
    phoneNumber: "+923001234567",
    city: "Lahore, Punjab",
    isFeatured: true,
    isBoosted: false,
    promotionStatus: 'APPROVED' as const,
    status: "LIVE" as const
  },
  {
    title: "Uncirculated 500 Rupee Note - 1980s Series",
    description: "Crisp, uncirculated 500 Rupee bank note from the 1980s. Sequential serial numbers available if buying multiple.",
    category: "Notes",
    price: 8000,
    quantity: 10,
    shippingCharges: 200,
    images: ["https://images.unsplash.com/photo-1625225233840-692558f60ea8?auto=format&fit=crop&q=80&w=800"],
    sellerName: "Karachi Collectibles",
    phoneNumber: "+923331234567",
    city: "Karachi, Sindh",
    isFeatured: false,
    isBoosted: false,
    promotionStatus: 'NONE' as const,
    status: "LIVE" as const
  }
];

export function Admin() {
  const { isAdmin, isSuperAdmin, user, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'listings' | 'reports' | 'profileReports' | 'users' | 'support' | 'broadcast' | 'promotions' | 'authAdmins' | 'allUsers'>('listings');
  
  const [listings, setListings] = useState<Listing[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [profileReports, setProfileReports] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [pendingVerifications, setPendingVerifications] = useState<UserProfile[]>([]);
  const [authAdmins, setAuthAdmins] = useState<AuthorizedAdminEmail[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);
  const [promotionRequests, setPromotionRequests] = useState<PromotionRequest[]>([]);
  
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [userSearch, setUserSearch] = useState('');
  
  const [supportFilter, setSupportFilter] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastLink, setBroadcastLink] = useState('');

  const cleanupExpiredPromotions = async () => {
    try {
      const now = new Date();
      
      // Cleanup Featured Listings
      const featuredQ = query(collection(db, 'listings'), where('isFeatured', '==', true), where('featuredUntil', '<', now));
      const featuredSnap = await getDocs(featuredQ);
      featuredSnap.docs.forEach(async (d) => {
        await updateDoc(doc(db, 'listings', d.id), { 
          isFeatured: false, 
          featuredUntil: null, 
          promotionStatus: 'NONE' 
        });
      });

      // Cleanup Boosted Listings
      const boostedQ = query(collection(db, 'listings'), where('isBoosted', '==', true), where('boostedUntil', '<', now));
      const boostedSnap = await getDocs(boostedQ);
      boostedSnap.docs.forEach(async (d) => {
        await updateDoc(doc(db, 'listings', d.id), { 
          isBoosted: false, 
          boostedUntil: null, 
          promotionStatus: 'NONE' 
        });
      });

      // Cleanup Verified Badges
      const verifiedQ = query(collection(db, 'users'), where('isVerified', '==', true), where('verifiedUntil', '<', now));
      const verifiedSnap = await getDocs(verifiedQ);
      verifiedSnap.docs.forEach(async (d) => {
        await updateDoc(doc(db, 'users', d.id), { 
          isVerified: false, 
          isPremiumVerified: false,
          verifiedUntil: null,
          verifiedBadgeType: null,
          verifiedBadgeRequestStatus: 'NONE'
        });
      });

      console.log("Promotions cleanup completed.");
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      cleanupExpiredPromotions();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin && !loading) {
      navigate('/');
    }
  }, [isAdmin, loading, navigate]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'listings') {
        const q = query(collection(db, 'listings'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setListings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Listing)));
      } else if (activeTab === 'reports') {
        const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
      } else if (activeTab === 'profileReports') {
        const q = query(collection(db, 'profileReports'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setProfileReports(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'users') {
        const q = query(
          collection(db, 'users'), 
          where('verifiedBadgeRequestStatus', '==', 'PENDING')
        );
        const snapshot = await getDocs(q);
        setPendingVerifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      } else if (activeTab === 'allUsers') {
        const q = query(collection(db, 'users'), limit(50));
        const snapshot = await getDocs(q);
        setAllUsers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      } else if (activeTab === 'authAdmins') {
        const snapshot = await getDocs(collection(db, 'authorizedAdmins'));
        setAuthAdmins(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AuthorizedAdminEmail)));
      } else if (activeTab === 'support') {
        const q = query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setSupportTickets(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
      } else if (activeTab === 'promotions') {
        const q = query(collection(db, 'promotionRequests'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        setPromotionRequests(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as PromotionRequest)));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, activeTab);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) fetchData();
  }, [isAdmin, activeTab]);

  const updateStatus = async (id: string, newStatus: Listing['status']) => {
    if (!confirm(`Are you sure you want to mark this as ${newStatus}?`)) return;
    try {
      await updateDoc(doc(db, 'listings', id), {
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `listings/${id}`);
    }
  };

  const deleteListing = async (id: string) => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    try {
      await deleteDoc(doc(db, 'listings', id));
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `listings/${id}`);
    }
  };

  const resolveProfileReport = async (id: string) => {
    if (!confirm('Mark profile report as resolved?')) return;
    try {
      await updateDoc(doc(db, 'profileReports', id), { status: 'RESOLVED' });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `profileReports/${id}`);
    }
  };

  const resolveReport = async (id: string) => {
    if (!confirm('Mark listing report as resolved?')) return;
    try {
      await updateDoc(doc(db, 'reports', id), { status: 'RESOLVED' });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${id}`);
    }
  };

  const revokeBadge = async (userId: string) => {
    if (!confirm('Revoke all verified badges for this user?')) return;
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: false,
        verifiedBadgeType: null,
        verifiedBadgeRequestStatus: 'NONE'
      });
      alert("Badges revoked.");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Failed to revoke badges.");
    }
  };

  const updateSupportStatus = async (id: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'supportTickets', id), { 
        status: newStatus,
        updatedAt: serverTimestamp()
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `supportTickets/${id}`);
    }
  };

  const toggleUserVerification = async (u: UserProfile, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? 'revoke' : 'grant Basic'} verification?`)) return;
    try {
      await updateDoc(doc(db, 'users', u.id), { 
        isVerified: !currentStatus,
        verifiedBadgeType: !currentStatus ? 'BASIC' : null,
        verifiedBadgeRequestStatus: 'NONE'
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${u.id}`);
    }
  };

  const approveBadgeRequest = async (id: string, type: 'BASIC' | 'GOLDEN') => {
    if (!confirm(`Approve ${type} Verification request for this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', id), {
        isVerified: true,
        verifiedBadgeType: type,
        verifiedBadgeRequestStatus: 'APPROVED'
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const rejectBadgeRequest = async (id: string) => {
    if (!confirm(`Reject Verification request for this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', id), {
        verifiedBadgeRequestStatus: 'REJECTED'
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${id}`);
    }
  };

  const approvePromotion = async (request: PromotionRequest) => {
    if (!confirm('Approve this promotion request? Payment will be verified and feature will be activated.')) return;
    try {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + request.durationDays);

      // 1. Update the request status
      await updateDoc(doc(db, 'promotionRequests', request.id), {
        status: 'APPROVED',
        updatedAt: serverTimestamp()
      });

      // 2. Activate the feature on the target
      if (request.type === 'FEATURED') {
        await updateDoc(doc(db, 'listings', request.targetId), {
          isFeatured: true,
          featuredUntil: expiryDate,
          promotionStatus: 'APPROVED'
        });
      } else if (request.type === 'BOOST') {
        await updateDoc(doc(db, 'listings', request.targetId), {
          isBoosted: true,
          boostedUntil: expiryDate,
          promotionStatus: 'APPROVED'
        });
      } else if (request.type === 'VERIFIED') {
        const badgeType = request.planName.includes('PREMIUM') || request.amount > 5000 ? 'GOLDEN' : 'BASIC';
        await updateDoc(doc(db, 'users', request.targetId), {
          isVerified: true,
          verifiedBadgeType: badgeType,
          isPremiumVerified: badgeType === 'GOLDEN',
          verifiedUntil: expiryDate,
          verifiedBadgeRequestStatus: 'APPROVED'
        });
      }

      // 3. Notify user
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId: request.userId,
        title: "✨ Promotion Activated!",
        message: `Your ${request.type} request for "${request.planName}" has been approved and is now active until ${expiryDate.toLocaleDateString()}.`,
        read: false,
        createdAt: serverTimestamp()
      });

      alert("Promotion approved and activated!");
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `promotionRequests/${request.id}`);
    }
  };

  const rejectPromotion = async (request: PromotionRequest) => {
    const reason = prompt("Reason for rejection:");
    if (reason === null) return;
    try {
      await updateDoc(doc(db, 'promotionRequests', request.id), {
        status: 'REJECTED',
        rejectionReason: reason,
        updatedAt: serverTimestamp()
      });

      if (request.type === 'VERIFIED') {
        await updateDoc(doc(db, 'users', request.targetId), {
          verifiedBadgeRequestStatus: 'REJECTED'
        });
      } else {
        await updateDoc(doc(db, 'listings', request.targetId), {
          promotionStatus: 'REJECTED'
        });
      }

      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId: request.userId,
        title: "❌ Promotion Request Rejected",
        message: `Your ${request.type} request was rejected. Reason: ${reason || 'Payment proof was invalid.'}`,
        read: false,
        createdAt: serverTimestamp()
      });

      alert("Promotion rejected.");
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `promotionRequests/${request.id}`);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastTitle || !broadcastMessage) {
      alert("Please enter title and message.");
      return;
    }
    if (!confirm(`Are you sure you want to send this broadcast to all users?`)) return;

    setBroadcasting(true);
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      const batchRequests = usersSnap.docs.map(async (u) => {
        const notifRef = doc(collection(db, 'notifications'));
        await setDoc(notifRef, {
          userId: u.id,
          title: broadcastTitle,
          message: broadcastMessage,
          link: broadcastLink,
          read: false,
          createdAt: serverTimestamp()
        });
      });
      await Promise.all(batchRequests);
      alert("Broadcast sent successfully!");
      setBroadcastTitle('');
      setBroadcastMessage('');
      setBroadcastLink('');
    } catch (error) {
      console.error(error);
      alert("Failed to send broadcast.");
    } finally {
      setBroadcasting(false);
    }
  };

  const sendWarning = async (userId: string, targetName: string) => {
    const warning = prompt(`Write a warning message to ${targetName}:`);
    if (!warning) return;
    try {
      const notifRef = doc(collection(db, 'notifications'));
      await setDoc(notifRef, {
        userId,
        title: "⚠️ Administrative Warning",
        message: warning,
        read: false,
        createdAt: serverTimestamp()
      });
      alert("Warning sent.");
    } catch (e) {
      console.error(e);
      alert("Failed to send warning.");
    }
  };

  const blockUser = async (userId: string, targetName: string) => {
    if (!confirm(`Are you sure you want to BLOCK ${targetName}? They will no longer be able to access the platform.`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: true });
      alert("User blocked successfully.");
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const unblockUser = async (userId: string, targetName: string) => {
    if (!confirm(`Unblock ${targetName}?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isBlocked: false });
      alert("User unblocked successfully.");
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const addAuthorizedAdmin = async () => {
    if (!newAdminEmail) return;
    const sanitizedEmail = newAdminEmail.toLowerCase().trim();
    try {
      const adminRef = doc(db, 'authorizedAdmins', sanitizedEmail);
      await setDoc(adminRef, {
        email: sanitizedEmail,
        addedAt: serverTimestamp(),
        addedBy: user?.email
      });
      setNewAdminEmail('');
      alert("Admin authorized successfully.");
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'authorizedAdmins');
    }
  };

  const removeAuthorizedAdmin = async (id: string) => {
    if (!confirm('Remove this email from authorized admins?')) return;
    try {
      await deleteDoc(doc(db, 'authorizedAdmins', id));
      fetchData();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `authorizedAdmins/${id}`);
    }
  };
  const initiateChat = async (targetUserId: string) => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'chats'),
        where('buyerId', '==', targetUserId),
        where('sellerId', '==', 'ADMIN')
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        navigate('/messages');
        return;
      }

      const chatRef = doc(collection(db, 'chats'));
      await setDoc(chatRef, {
        listingId: 'SUPPORT',
        buyerId: targetUserId,
        sellerId: 'ADMIN',
        lastMessage: '',
        updatedAt: serverTimestamp()
      });
      navigate('/messages');
    } catch (e) {
      console.error(e);
      alert('Failed to start chat.');
    }
  };

  const seedData = async () => {
    if (!user || !confirm('This will add 3 sample listings to the database. Proceed?')) return;
    setSeeding(true);
    try {
      for (const item of SAMPLE_LISTINGS) {
        const listingRef = doc(collection(db, 'listings'));
        await setDoc(listingRef, {
          ...item,
          paymentAccountDetails: "N/A",
          paymentProofImage: "",
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      alert('Sample listings added successfully!');
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'listings');
    } finally {
      setSeeding(false);
    }
  };

  const getTabTitle = () => {
    switch(activeTab) {
      case 'listings': return 'Marketplace Listings';
      case 'reports': return 'Reported Listings';
      case 'profileReports': return 'Reported Profiles';
      case 'users': return 'Verification Requests';
      case 'allUsers': return 'Accounts Management';
      case 'support': return 'Support Tickets';
      case 'promotions': return 'Promotion Requests';
      case 'broadcast': return 'Community Broadcast';
      case 'authAdmins': return 'Authorized Administrators';
      default: return activeTab.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-black text-stone-900 mb-4 tracking-tighter uppercase italic">Operational Access Needed</h1>
        <p className="text-stone-600 mb-8 font-medium">You must be logged in as an authorized administrator to access the Mandi controls.</p>
        <Link to="/" className="inline-block bg-amber-500 text-stone-900 font-black px-8 py-3 rounded-xl shadow-lg active:scale-95">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex h-screen overflow-hidden">
      {/* Persistent Sidebar */}
      <aside className="w-64 bg-stone-900 text-stone-400 shrink-0 border-r border-stone-800 hidden lg:flex flex-col h-screen">
         <div className="p-8 border-b border-stone-800">
            <h1 className="text-white font-black uppercase italic tracking-tighter text-xl leading-none">Mandi <span className="text-amber-500">Admin</span></h1>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] mt-2 text-stone-500">Control Center</p>
         </div>
         
         <nav className="flex-grow p-4 space-y-1 overflow-y-auto scrollbar-none">
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-4 py-4">Management</div>
            <SidebarLink id="listings" icon={LayoutGrid} label="Listings" />
            <SidebarLink id="reports" icon={ShieldAlert} label="Reported Listings" />
            <SidebarLink id="profileReports" icon={AlertCircle} label="Reported Profiles" />
            <SidebarLink id="users" icon={FileBadge} label="Verifications" />
            <SidebarLink id="allUsers" icon={User} label="Accounts" />
            
            <div className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-4 py-8">Communication</div>
            <SidebarLink id="support" icon={Ticket} label="Support Tickets" />
            <SidebarLink id="promotions" icon={Zap} label="Promotion Requests" />
            <SidebarLink id="broadcast" icon={Speaker} label="Community Broadcast" />

            {isSuperAdmin && (
              <>
                <div className="text-[10px] font-black uppercase tracking-widest text-stone-600 px-4 py-8">Master Controls</div>
                <SidebarLink id="authAdmins" icon={UserPlus} label="Authorized Admins" />
              </>
            )}
         </nav>

         <div className="p-4 border-t border-stone-800 space-y-2">
            <button 
              onClick={() => logout()}
              className="w-full flex items-center gap-3 bg-stone-800 text-stone-400 px-4 py-3 rounded-xl font-bold transition-all hover:bg-red-500 hover:text-white text-xs"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
         </div>
      </aside>

      <div className="flex-grow flex flex-col min-w-0 h-screen">
        <header className="bg-white border-b border-stone-200 h-20 flex items-center px-8 justify-between z-[60] shrink-0">
           <div className="flex items-center gap-4">
              <button onClick={() => navigate(-1)} className="lg:hidden p-2 bg-stone-100 rounded-xl"><HomeIcon className="w-5 h-5 text-stone-600" /></button>
              <h2 className="text-xl font-black text-stone-900 uppercase italic tracking-tighter">
                {getTabTitle()}
              </h2>
           </div>
           
           <div className="flex items-center gap-6">
              <div className="text-right hidden sm:block">
                 <div className="text-xs font-black text-stone-900 uppercase tracking-tighter leading-none">{user?.email}</div>
                 <div className="text-[9px] font-bold text-amber-600 uppercase tracking-widest mt-1">{isSuperAdmin ? 'Super Admin' : 'Authorized Admin'}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-amber-500 font-black italic">
                 {user?.email?.charAt(0).toUpperCase()}
              </div>
           </div>
        </header>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden bg-white border-b border-stone-200 z-[50] overflow-x-auto scrollbar-none flex px-4 shrink-0">
           {[
             { id: 'listings', label: 'Listings', icon: LayoutGrid },
             { id: 'reports', label: 'Reported Listings', icon: ShieldAlert },
             { id: 'profileReports', label: 'Reported Profiles', icon: AlertCircle },
             { id: 'users', label: 'Verifs', icon: FileBadge },
             { id: 'allUsers', label: 'Accounts', icon: User },
             { id: 'support', label: 'Support', icon: Ticket },
             { id: 'promotions', label: 'Promo', icon: Zap },
             { id: 'broadcast', label: 'Broad', icon: Speaker },
             ...(isSuperAdmin ? [{ id: 'authAdmins', label: 'Admins', icon: UserPlus }] : [])
           ].map(tab => (
             <button 
               key={tab.id}
               onClick={() => setActiveTab(tab.id as any)}
               className={`flex items-center gap-2 px-6 py-4 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all whitespace-nowrap ${
                 activeTab === tab.id ? 'border-amber-500 text-amber-600 bg-amber-50/20' : 'border-transparent text-stone-400'
               }`}
             >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
             </button>
           ))}
        </div>

         <main className="p-4 lg:p-8 flex-grow overflow-y-auto scrollbar-none pb-32 lg:pb-8">
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center">
               <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
               <p className="text-stone-400 font-bold uppercase text-[10px] tracking-widest">Accessing Mandi Database...</p>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 space-y-6">
               {activeTab === 'listings' && (
                 <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden shrink-0">
                    <div className="overflow-x-auto scrollbar-none">
                      <table className="min-w-full divide-y divide-stone-100 border-separate border-spacing-0">
                        <thead className="bg-stone-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Merchant/Product</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Category</th>
                            <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Status</th>
                            <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {listings.map((l) => (
                            <tr key={l.id} className="hover:bg-stone-50/50 transition-colors">
                              <td className="px-6 py-4">
                                <Link to={`/listings/${l.id}`} className="block">
                                  <div className="font-black text-stone-900 text-sm italic group-hover:text-amber-600 truncate max-w-[200px]">{l.title}</div>
                                  <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest truncate">{l.sellerName}</div>
                                </Link>
                              </td>
                              <td className="px-6 py-4">
                                <span className="text-[10px] font-black text-stone-500 bg-stone-100 px-2 py-1 rounded-md uppercase tracking-tight">{l.category}</span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`text-[9px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider ${l.status === 'LIVE' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                                  {l.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                <button onClick={() => updateStatus(l.id, l.status === 'LIVE' ? 'PENDING' : 'LIVE')} className="p-2 bg-stone-50 hover:bg-emerald-50 text-emerald-600 rounded-lg border border-stone-100 transition-all">
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button onClick={() => deleteListing(l.id)} className="p-2 bg-stone-50 hover:bg-red-50 text-red-600 rounded-lg border border-stone-100 transition-all">
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                 </div>
               )}

               {activeTab === 'allUsers' && (
                 <div className="space-y-6">
                    <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4">
                       <User className="text-amber-500 w-6 h-6" />
                       <input 
                         type="text" 
                         placeholder="Search user by email or name..." 
                         className="flex-grow bg-transparent border-none focus:ring-0 font-bold text-stone-900"
                         value={userSearch}
                         onChange={(e) => setUserSearch(e.target.value)}
                       />
                    </div>
                    
                    <div className="bg-white rounded-[2rem] shadow-sm border border-stone-100 overflow-hidden shrink-0">
                       <div className="overflow-x-auto scrollbar-none">
                          <table className="min-w-full divide-y divide-stone-100 border-separate border-spacing-0">
                             <thead className="bg-stone-50 sticky top-0 z-10">
                                <tr>
                                   <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Account</th>
                                   <th className="px-6 py-4 text-left text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Verify Status</th>
                                   <th className="px-6 py-4 text-right text-[10px] font-black text-stone-400 uppercase tracking-widest bg-stone-50">Actions</th>
                                </tr>
                             </thead>
                             <tbody className="divide-y divide-stone-50">
                             {allUsers.filter(u => u.email?.toLowerCase().includes(userSearch.toLowerCase()) || u.name?.toLowerCase().includes(userSearch.toLowerCase())).map(u => (
                               <tr key={u.id} className={`${u.isBlocked ? 'bg-red-50/30' : ''}`}>
                                  <td className="px-6 py-4">
                                     <div className="font-black text-stone-900 text-sm italic">{u.name}</div>
                                     <div className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{u.email}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                     {u.isVerified ? (
                                       <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg uppercase tracking-widest flex items-center gap-1.5 w-fit">
                                          <ShieldCheck className="w-3 h-3" /> VERIFIED
                                       </span>
                                     ) : (
                                       <span className="text-[9px] font-black text-stone-400 bg-stone-100 px-2.5 py-1 rounded-lg uppercase tracking-widest w-fit">UNVERIFIED</span>
                                     )}
                                  </td>
                                  <td className="px-6 py-4 text-right flex justify-end gap-2">
                                     <button onClick={() => sendWarning(u.id, u.name || 'User')} className="p-2 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white rounded-lg transition-all" title="Send Warning">
                                        <AlertCircle className="w-4 h-4" />
                                     </button>
                                     {u.isBlocked ? (
                                       <button onClick={() => unblockUser(u.id, u.name || 'User')} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-200">
                                          Unblock Account
                                       </button>
                                     ) : (
                                       <button onClick={() => blockUser(u.id, u.name || 'User')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200">
                                          Block Account
                                       </button>
                                     )}
                                     <Link to={`/user/${u.id}`} className="p-2 bg-stone-100 text-stone-500 hover:bg-stone-900 hover:text-white rounded-lg transition-all">
                                        <Eye className="w-4 h-4" />
                                     </Link>
                                  </td>
                               </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              </div>
            )}

               {activeTab === 'authAdmins' && (
                 <div className="space-y-8">
                    <div className="bg-white p-10 rounded-[2.5rem] border border-stone-100 shadow-sm">
                       <h3 className="text-xl font-black text-stone-900 uppercase italic tracking-tighter mb-6">Authorize Admin Access</h3>
                       <div className="flex gap-4">
                          <input 
                            type="email" 
                            placeholder="Type assistant email address..." 
                            className="flex-grow bg-stone-50 border-none rounded-2xl px-6 py-4 font-bold text-stone-900"
                            value={newAdminEmail}
                            onChange={(e) => setNewAdminEmail(e.target.value)}
                          />
                          <button onClick={addAuthorizedAdmin} className="bg-stone-900 text-white px-10 rounded-2xl font-black uppercase italic text-sm hover:bg-amber-500 hover:text-stone-900 transition-all">
                             Authorize
                          </button>
                       </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {authAdmins.map(adm => (
                         <div key={adm.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between group">
                            <div>
                               <div className="font-black text-stone-900 lowercase italic">{adm.email}</div>
                               <div className="text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">Added On: {adm.addedAt?.toDate()?.toLocaleDateString()}</div>
                            </div>
                            <button onClick={() => removeAuthorizedAdmin(adm.id)} className="p-2 text-stone-300 hover:text-red-500 transition-colors">
                               <UserX className="w-5 h-5" />
                            </button>
                         </div>
                       ))}
                    </div>
                 </div>
               )}

               {activeTab === 'broadcast' && (
                 <div className="max-w-3xl mx-auto bg-white p-12 rounded-[3.5rem] border border-stone-100 shadow-xl">
                    <div className="text-center mb-10">
                       <Speaker className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                       <h2 className="text-3xl font-black text-stone-900 uppercase italic tracking-tighter">Mandi Broadcast</h2>
                       <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px] mt-2">Send an instant notification to all active users</p>
                    </div>

                    <div className="space-y-6">
                       <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-4">Broadcast Title</label>
                          <input 
                             type="text" 
                             value={broadcastTitle}
                             onChange={(e) => setBroadcastTitle(e.target.value)}
                             className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 font-black text-stone-900 italic"
                             placeholder="Mandi Update!"
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-4">Message Body</label>
                          <textarea 
                             rows={4}
                             value={broadcastMessage}
                             onChange={(e) => setBroadcastMessage(e.target.value)}
                             className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 font-medium text-stone-900"
                             placeholder="Type your message here..."
                          />
                       </div>
                       <div>
                          <label className="block text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2 ml-4">Action Link (Optional)</label>
                          <input 
                             type="text" 
                             value={broadcastLink}
                             onChange={(e) => setBroadcastLink(e.target.value)}
                             className="w-full bg-stone-50 border-none rounded-2xl px-6 py-4 font-bold text-stone-500"
                             placeholder="https://mandi.pk/listings"
                          />
                       </div>
                       <button 
                         onClick={handleBroadcast}
                         disabled={broadcasting}
                         className="w-full bg-stone-900 hover:bg-amber-500 hover:text-stone-900 text-white font-black py-5 rounded-3xl uppercase italic tracking-widest text-lg transition-all active:scale-95 shadow-2xl flex items-center justify-center gap-4"
                       >
                          <Speaker className="w-6 h-6" /> {broadcasting ? 'Transmitting...' : 'Send Broadcast Now'}
                       </button>
                    </div>
                 </div>
               )}

               {activeTab === 'reports' && (
                 <div className="grid grid-cols-1 gap-4">
                  {reports.map((report) => (
                    <div key={report.id} className={`p-5 rounded-xl border-l-4 shadow-sm ${report.status === 'OPEN' ? 'border-red-500 bg-white' : 'border-stone-300 bg-stone-50'}`}>
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="flex-grow">
                          <div className="font-black text-red-600 mb-2 flex items-center gap-2 uppercase tracking-tighter">
                            <ShieldAlert className="w-5 h-5" /> Listing Report
                          </div>
                          <div className="text-stone-800 mb-3 bg-stone-50 p-4 rounded-lg border border-stone-100">
                             <span className="font-bold text-stone-900">Reason:</span> {report.reason}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 shrink-0 w-full md:w-auto">
                          <button onClick={() => resolveReport(report.id)} className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm font-black transition-all">Ignore</button>
                          <button onClick={() => deleteListing(report.listingId)} className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-lg text-sm font-black transition-all">Remove Listing</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {reports.length === 0 && <div className="py-20 text-center text-stone-500">No reports found</div>}
                </div>
               )}

               {activeTab === 'profileReports' && (
                 <div className="grid grid-cols-1 gap-4">
                  {profileReports.map((report) => (
                    <div key={report.id} className={`p-6 rounded-2xl border-l-8 shadow-md border-amber-500 ${report.status === 'OPEN' ? 'bg-white' : 'bg-stone-50 opacity-75'}`}>
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="flex-grow">
                           <h3 className="font-black text-stone-900 uppercase tracking-tighter text-xl mb-2">Profile Report</h3>
                           <p className="text-stone-800 font-bold mb-4">{report.reason}</p>
                           <Link to={`/user/${report.profileId}`} className="text-amber-600 font-black text-sm uppercase flex items-center gap-2 hover:underline">
                              <Eye className="w-4 h-4" /> Inspect Profile
                           </Link>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[200px]">
                           <button onClick={() => resolveProfileReport(report.id)} className="bg-stone-100 text-stone-700 font-black py-2 rounded-xl text-xs uppercase">Ignore</button>
                           <button onClick={() => blockUser(report.profileId, "User")} className="bg-red-600 text-white font-black py-2 rounded-xl text-xs uppercase">Block User</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
               )}

               {activeTab === 'users' && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {pendingVerifications.map((u) => (
                    <div key={u.id} className="p-6 rounded-2xl border-2 border-amber-100 bg-white shadow-sm flex flex-col gap-4 relative">
                       <div className="font-black text-stone-900 text-xl">{u.name || 'Anonymous'}</div>
                       <div className="text-sm text-stone-500">{u.email}</div>
                       <div className="bg-amber-50 p-4 rounded-xl">
                          <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2">Requested Badge: {u.verifiedBadgeType || 'BASIC'}</p>
                          <div className="flex gap-2">
                             <button onClick={() => approveBadgeRequest(u.id, u.verifiedBadgeType || 'BASIC')} className="flex-1 bg-green-600 text-white text-xs font-black py-2 rounded-lg">Approve</button>
                             <button onClick={() => rejectBadgeRequest(u.id)} className="flex-1 bg-white text-red-600 border border-red-50 text-xs font-black py-2 rounded-lg">Reject</button>
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
               )}

               {activeTab === 'support' && (
                 <div className="grid grid-cols-1 gap-4">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-6 rounded-xl border border-stone-200 bg-white shadow-sm">
                      <div className="flex justify-between items-start mb-4">
                         <h4 className="font-bold text-lg text-stone-900">{ticket.subject}</h4>
                         <span className="text-xs font-black text-amber-600 uppercase px-2 py-1 bg-amber-50 rounded">{ticket.status}</span>
                      </div>
                      <p className="text-stone-800 bg-stone-50 p-4 rounded-lg mb-4">{ticket.message}</p>
                      <button onClick={() => updateSupportStatus(ticket.id, 'RESOLVED')} className="bg-stone-900 text-white px-6 py-2 rounded-xl text-xs font-black uppercase">Mark Resolved</button>
                    </div>
                  ))}
                </div>
               )}

               {activeTab === 'promotions' && (
                 <div className="grid grid-cols-1 gap-6">
                  {promotionRequests.map((req) => (
                    <div key={req.id} className={`bg-white border-2 rounded-3xl overflow-hidden shadow-sm flex flex-col md:flex-row ${req.status === 'PENDING' ? 'border-amber-200' : 'border-stone-100'}`}>
                       <div className="w-full md:w-48 bg-stone-100"><img src={req.paymentProofImage} className="w-full h-full object-cover" /></div>
                       <div className="p-6 flex-grow flex flex-col md:flex-row gap-6 justify-between items-center">
                          <div>
                             <h3 className="font-black text-stone-900 italic uppercase">{req.type}</h3>
                             <p className="text-xs text-stone-400 font-black uppercase">{formatPKR(req.amount)}</p>
                          </div>
                          <div className="flex gap-2">
                             {req.status === 'PENDING' ? (
                               <>
                                  <button onClick={() => approvePromotion(req)} className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase">Approve</button>
                                  <button onClick={() => rejectPromotion(req)} className="bg-stone-100 text-stone-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase">Reject</button>
                               </>
                             ) : (
                               <span className="text-[10px] font-black text-stone-400 uppercase">{req.status}</span>
                             )}
                          </div>
                       </div>
                    </div>
                  ))}
                </div>
               )}
            </div>
          )}
        </main>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <div className="fixed inset-0 bg-stone-900/90 backdrop-blur-md flex items-center justify-center z-[1000] p-4 sm:p-20 overflow-y-auto" onClick={() => setPreviewImage(null)}>
           <div className="max-w-5xl w-full max-h-full">
              <img src={previewImage} className="w-full h-auto rounded-3xl shadow-2xl border-4 border-stone-800" />
           </div>
        </div>
      )}
    </div>
  );

  function SidebarLink({ id, icon: Icon, label }: { id: typeof activeTab, icon: any, label: string }) {
     return (
        <button
          onClick={() => setActiveTab(id)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all text-xs border border-transparent ${
            activeTab === id 
              ? 'bg-amber-500 text-stone-900 shadow-xl shadow-amber-500/10 italic' 
              : 'text-stone-500 hover:text-stone-300 hover:bg-stone-800/50'
          }`}
        >
          <Icon className={`w-4 h-4 ${activeTab === id ? 'text-stone-900' : 'text-stone-600'}`} />
          {label}
        </button>
     );
  }
}
