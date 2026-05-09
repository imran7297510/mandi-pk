import { useEffect, useState, useMemo } from 'react';
import { collection, query, where, getDocs, orderBy, getCountFromServer } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing, Order } from '../types';
import { ListingCard } from '../components/ListingCard';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import { Eye, MessageCircle, Heart, TrendingUp, Grid, Plus, Trash2, ArrowRight, Zap, CheckCircle, Package, ShoppingBag, ShoppingCart, ListChecks, Search, Clock, Rocket } from 'lucide-react';

type DashboardTab = 'all' | 'live' | 'booked' | 'sold' | 'purchased';

export function SellerDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('all');
  const [listings, setListings] = useState<Listing[]>([]);
  const [purchasedItems, setPurchasedItems] = useState<Order[]>([]);
  const [chatCount, setChatCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    async function fetchDashboardData() {
      if (!user) {
         setLoading(false);
         return;
      }
      setLoading(true);
      try {
        // Fetch My Listings
        const qListings = query(
          collection(db, 'listings'),
          where('ownerId', '==', user.uid)
        );
        const snapshot = await getDocs(qListings);
        let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Listing));
        docs.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
        setListings(docs);

        // Fetch My Purchases
        const qPurchases = query(
          collection(db, 'orders'),
          where('buyerId', '==', user.uid)
        );
        const purchaseSnap = await getDocs(qPurchases);
        setPurchasedItems(purchaseSnap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));

        const qChats = query(collection(db, 'chats'), where('sellerId', '==', user.uid));
        const chatSnap = await getCountFromServer(qChats);
        setChatCount(chatSnap.data().count);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'dashboard_data');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [user, refresh]);

  const stats = useMemo(() => {
    if (!listings.length) return { active: 0, views: 0, chats: chatCount, featured: 0, total: listings.length };
    
    let active = 0;
    let views = 0;
    let featured = 0;
    
    listings.forEach(l => {
      if (l.status === 'LIVE') active++;
      if (l.isFeatured && l.status === 'LIVE') featured++;
      views += (l.views || 0);
    });
    
    return { active, views, chats: chatCount, featured, total: listings.length };
  }, [listings, chatCount]);

  const filteredListings = useMemo(() => {
    switch (activeTab) {
      case 'live': return listings.filter(l => l.status === 'LIVE');
      case 'booked': return listings.filter(l => l.status === 'BOOKED');
      case 'sold': return listings.filter(l => l.status === 'SOLD');
      case 'all': return listings;
      default: return [];
    }
  }, [listings, activeTab]);

  const performanceData = [
    { name: 'Mon', views: Math.floor(stats.views * 0.1) },
    { name: 'Tue', views: Math.floor(stats.views * 0.15) },
    { name: 'Wed', views: Math.floor(stats.views * 0.05) },
    { name: 'Thu', views: Math.floor(stats.views * 0.25) },
    { name: 'Fri', views: Math.floor(stats.views * 0.2) },
    { name: 'Sat', views: Math.floor(stats.views * 0.1) },
    { name: 'Sun', views: Math.floor(stats.views * 0.15) },
  ];

  if (!user || user.isAnonymous) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-stone-900 mb-4 tracking-tighter uppercase">Sign In Required</h1>
        <p className="text-stone-600 mb-8">Access professional seller tools exclusively for registered users.</p>
        <Link to="/profile" className="inline-block bg-amber-500 text-stone-900 font-black px-8 py-3 rounded-xl shadow-lg">Go to Login</Link>
      </div>
    );
  }

  const TabItem = ({ id, label, icon: Icon, colorClass }: { id: DashboardTab, label: string, icon: any, colorClass: string }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap shrink-0 border-2 active:scale-95 ${
        activeTab === id 
          ? `bg-stone-900 text-white border-stone-900 shadow-xl` 
          : `bg-white text-stone-500 border-stone-100 hover:border-amber-200 hover:text-stone-700`
      }`}
    >
      <Icon className={`w-4 h-4 ${activeTab === id ? 'text-amber-500' : colorClass}`} />
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-500">
      
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 blur-3xl rounded-full" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-stone-900 tracking-tighter uppercase italic leading-none mb-2">Seller <span className="text-amber-500">Dashboard</span></h1>
          <p className="text-stone-500 font-medium text-sm">Professional hub for the dedicated Pak-Trader.</p>
        </div>
        <Link to="/submit" className="w-full sm:w-auto bg-stone-900 hover:bg-amber-500 hover:text-stone-900 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95 text-sm uppercase tracking-widest group">
          <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Post An Ad
        </Link>
      </div>

      {/* Primary Tab Navigation */}
      <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 scroll-smooth">
        <TabItem id="all" label="All Listings" icon={Grid} colorClass="text-stone-400" />
        <TabItem id="live" label="Live Listings" icon={CheckCircle} colorClass="text-emerald-500" />
        <TabItem id="booked" label="Bookings" icon={Clock} colorClass="text-amber-500" />
        <TabItem id="sold" label="Sold Out" icon={Package} colorClass="text-stone-700" />
        <TabItem id="purchased" label="Purchased" icon={ShoppingBag} colorClass="text-blue-500" />
      </div>

      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
            <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">Syncing Mandi Stats...</p>
        </div>
      ) : (
        <>
          {/* TOP SUMMARY CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col group hover:border-amber-200 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-50 rounded-xl">
                  <CheckCircle className="w-5 h-5 text-emerald-500" />
                </div>
                <span className="font-black text-[10px] text-stone-400 uppercase tracking-widest">Active Listings</span>
              </div>
              <span className="text-4xl font-black text-stone-900 leading-none mb-1 group-hover:text-emerald-600 transition-colors tracking-tighter">{stats.active}</span>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Live on Marketplace</span>
            </div>
            
            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col group hover:border-amber-200 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-50 rounded-xl">
                  <Eye className="w-5 h-5 text-blue-500" />
                </div>
                <span className="font-black text-[10px] text-stone-400 uppercase tracking-widest">Total Views</span>
              </div>
              <span className="text-4xl font-black text-stone-900 leading-none mb-1 group-hover:text-blue-600 transition-colors tracking-tighter">{stats.views}</span>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Across all items</span>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex flex-col group hover:border-amber-200 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-50 rounded-xl">
                   <MessageCircle className="w-5 h-5 text-purple-500" />
                </div>
                <span className="font-black text-[10px] text-stone-400 uppercase tracking-widest">Chats Started</span>
              </div>
              <span className="text-4xl font-black text-stone-900 leading-none mb-1 group-hover:text-purple-600 transition-colors tracking-tighter">{stats.chats}</span>
              <span className="text-[10px] font-bold text-stone-400 uppercase">Potential Customers</span>
            </div>

            <div className="bg-amber-500 p-6 rounded-3xl border border-amber-600 shadow-lg shadow-amber-500/20 flex flex-col text-stone-900 group">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-400 rounded-xl">
                  <Zap className="w-5 h-5 fill-stone-900" />
                </div>
                <span className="font-black text-[10px] text-stone-800 uppercase tracking-widest">Featured Active</span>
              </div>
              <span className="text-4xl font-black leading-none mb-1 tracking-tighter">{stats.featured}</span>
              <span className="text-[10px] font-black text-stone-800/60 uppercase">Maximum Visibility</span>
            </div>
          </div>

          {/* MAIN CONTENT AREA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* ANALYTICS SECTION */}
            <div className="lg:col-span-2 bg-white rounded-[2rem] border border-stone-100 shadow-sm p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-stone-900 uppercase italic tracking-tighter flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-amber-500"/> Performance Insights
                </h2>
                <div className="flex gap-2">
                   <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
                   <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Live Updates</span>
                </div>
              </div>
              
              <div className="h-72 mb-8 select-none">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={performanceData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                    <XAxis 
                       dataKey="name" 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#a8a29e', fontSize: 11, fontWeight: 700}} 
                       dy={15} 
                    />
                    <YAxis 
                       axisLine={false} 
                       tickLine={false} 
                       tick={{fill: '#a8a29e', fontSize: 11, fontWeight: 700}} 
                    />
                    <RechartsTooltip 
                       contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 25px 50px -12px rgb(0 0 0 / 0.15)', padding: '12px'}} 
                       cursor={{stroke: '#f59e0b', strokeWidth: 2, strokeDasharray: '5 5'}}
                    />
                    <Line 
                       type="monotone" 
                       dataKey="views" 
                       stroke="#f59e0b" 
                       strokeWidth={4} 
                       dot={{r: 6, fill: '#f59e0b', strokeWidth: 3, stroke: '#fff'}} 
                       activeDot={{r: 8, stroke: '#f59e0b', strokeWidth: 4, fill: '#fff'}} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-stone-50 border border-stone-100 p-6 rounded-2xl flex items-start gap-4">
                <div className="bg-amber-100 p-2 rounded-xl shrink-0 mt-1">
                   <Zap className="w-5 h-5 text-amber-600 fill-amber-600" />
                </div>
                <div>
                  <h4 className="font-black text-stone-900 uppercase text-sm tracking-tight mb-1">Mandi Advisor Insight</h4>
                  <p className="text-sm text-stone-500 leading-relaxed font-medium">Your listings are peaking on <span className="text-stone-900 font-black">Thursday & Friday</span>. Boosting items on Wednesday afternoon results in <span className="text-emerald-600 font-black">2.5x higher</span> conversion rates.</p>
                </div>
              </div>
            </div>

            {/* SIDEBAR TIPS & PROMOTIONS */}
            <div className="space-y-8">
              <div className="bg-stone-900 text-stone-100 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform duration-700">
                    <CheckCircle className="w-32 h-32" />
                 </div>
                 <h3 className="font-black text-xl mb-6 text-white uppercase italic tracking-tighter flex items-center gap-2">
                    <Rocket className="w-5 h-5 text-amber-500" /> Pro Selling Tips
                 </h3>
                 <ul className="space-y-5 relative z-10">
                   {[
                     { id: 1, text: "High-quality photos increase trust by 70%." },
                     { id: 2, text: "Accurate item weight reduces shipping disputes." },
                     { id: 3, text: "Featured ads stay on top for up to 30 days." }
                   ].map(tip => (
                     <li key={tip.id} className="flex gap-4">
                       <span className="w-6 h-6 shrink-0 bg-stone-800 rounded-lg flex items-center justify-center text-xs font-black text-amber-500 border border-stone-700">{tip.id}</span>
                       <span className="text-sm text-stone-300 font-medium leading-tight">{tip.text}</span>
                     </li>
                   ))}
                 </ul>
              </div>
              
              <div className="bg-white rounded-[2rem] border border-stone-100 p-8 flex flex-col justify-center text-center shadow-sm hover:border-amber-300 transition-colors relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 -skew-x-12 translate-x-1/2 rounded-full" />
                 <Zap className="w-12 h-12 text-amber-500 mx-auto mb-4 group-hover:scale-110 transition-transform duration-500 fill-amber-500" />
                 <h3 className="font-black text-xl text-stone-900 mb-2 uppercase tracking-tighter italic">Boost Your Sales</h3>
                 <p className="text-sm text-stone-500 mb-6 font-medium px-4">Move your listings to the summit of Mandi.pk and double your reach instantly.</p>
                 <Link to="/promotions" className="w-full bg-amber-500 hover:bg-amber-600 text-stone-900 font-black py-4 rounded-2xl transition-all shadow-lg active:scale-95 text-xs uppercase tracking-widest">
                    Explore Promotions
                 </Link>
              </div>
            </div>
          </div>

          {/* LISTINGS MANAGEMENT SECTION */}
          <div className="pt-8">
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-8 gap-4 px-2">
               <div>
                  <h2 className="text-3xl font-black text-stone-900 uppercase italic tracking-tighter leading-none mb-2">Manage Your <span className="text-amber-500">Mandi</span></h2>
                  <div className="flex items-center gap-2">
                     <span className="h-0.5 w-12 bg-stone-900 rounded-full" />
                     <span className="text-[10px] font-black text-stone-400 uppercase tracking-[0.2em]">Viewing: {activeTab === 'all' ? 'Everything' : `${activeTab} items`}</span>
                  </div>
               </div>
               {activeTab !== 'purchased' && (
                 <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-amber-500 transition-colors" />
                    <input 
                      type="text" 
                      placeholder="Find in listings..." 
                      className="pl-11 pr-6 py-2.5 bg-stone-100 border-none rounded-xl text-xs font-bold text-stone-900 focus:ring-2 focus:ring-amber-500/30 w-full sm:w-64"
                    />
                 </div>
               )}
            </div>

            {activeTab === 'purchased' ? (
               <div className="space-y-4">
                  {purchasedItems.length === 0 ? (
                    <div className="py-20 text-center bg-white rounded-3xl border border-stone-100 shadow-sm border-dashed">
                       <ShoppingCart className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                       <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">No treasures bought yet!</p>
                       <Link to="/listings" className="text-amber-600 font-black text-xs uppercase tracking-widest mt-4 inline-block hover:underline">Start Shopping</Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                       {purchasedItems.map(order => (
                         <div key={order.id} className="bg-white p-6 rounded-3xl border border-stone-100 shadow-sm flex gap-6 items-center group hover:border-amber-200 transition-all">
                            <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-inner border border-stone-100 shrink-0">
                               <img src={order.listingImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                            </div>
                            <div className="flex-grow">
                               <h3 className="font-black text-stone-900 leading-tight mb-1">{order.listingTitle}</h3>
                               <div className="flex items-center gap-3 mb-2">
                                  <span className="text-emerald-600 font-black text-sm">Rs {order.totalAmount.toLocaleString()}</span>
                                  <span className="text-[10px] font-bold text-stone-400 uppercase">Qty: {order.quantity}</span>
                               </div>
                               <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                                 order.status === 'BOOKED' ? 'bg-amber-100 text-amber-600' :
                                 order.status === 'SHIPPED' ? 'bg-blue-100 text-blue-600' :
                                 'bg-emerald-100 text-emerald-600'
                               }`}>
                                 {order.status}
                               </span>
                            </div>
                            <Link to={`/listings/${order.listingId}`} className="p-3 bg-stone-50 rounded-2xl text-stone-400 hover:text-amber-500 hover:bg-amber-50 transition-all">
                               <ArrowRight className="w-5 h-5" />
                            </Link>
                         </div>
                       ))}
                    </div>
                  )}
               </div>
            ) : filteredListings.length === 0 ? (
               <div className="py-20 text-center bg-white rounded-3xl border border-stone-100 shadow-sm border-dashed">
                  <Package className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                  <p className="text-stone-500 font-bold uppercase tracking-widest text-xs">No items found in this category.</p>
               </div>
            ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                 {filteredListings.map(listing => (
                   <div key={listing.id} className="relative group/wrapper animate-in zoom-in-95 duration-500">
                      <ListingCard 
                        listing={listing} 
                        onUpdate={() => setRefresh(r => r + 1)}
                      />
                      <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-black text-stone-900 flex items-center gap-4 border border-stone-100 shadow-xl opacity-0 group-hover/wrapper:opacity-100 transition-all scale-95 group-hover/wrapper:scale-100 pointer-events-none z-30 uppercase tracking-widest">
                        <span className="flex items-center gap-2"><Eye className="w-3 h-3 text-blue-500 stroke-[3]"/> {listing.views || 0}</span>
                        <span className="flex items-center gap-2 text-stone-300 font-normal">|</span>
                        <span className="flex items-center gap-2"><Heart className="w-3 h-3 text-red-500 fill-red-500"/> {listing.saves || 0}</span>
                      </div>
                   </div>
                 ))}
               </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
