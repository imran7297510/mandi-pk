import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LogIn, 
  Menu, 
  X, 
  MessageCircle, 
  User, 
  Bell, 
  LogOut, 
  LayoutDashboard as LayoutDashboardIcon, 
  PlusCircle, 
  BookOpen, 
  ArrowRight, 
  Zap,
  Search,
  MapPin,
  Heart,
  ChevronDown,
  Home as HomeIcon,
  Compass,
  PlusSquare,
  Package,
  AlertCircle
} from 'lucide-react';
import { doc, getDocs, collection, query, where, setDoc, serverTimestamp, onSnapshot, orderBy, limit, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { CATEGORIES, LOCATIONS } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MyNotification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: any;
}

export function Layout() {
  const { user, isAdmin, loading: authLoading, loginWithGoogle, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [notifications, setNotifications] = useState<MyNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showCategoriesMenu, setShowCategoriesMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Pakistan');
  const navigate = useNavigate();
  const location = useLocation();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const locationMenuRef = useRef<HTMLDivElement>(null);
  const categoriesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as MyNotification)));
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setShowProfileMenu(false);
      if (locationMenuRef.current && !locationMenuRef.current.contains(event.target as Node)) setShowLocationMenu(false);
      if (categoriesMenuRef.current && !categoriesMenuRef.current.contains(event.target as Node)) setShowCategoriesMenu(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllAsRead = async () => {
    if (!user) return;
    const unread = notifications.filter(n => !n.read);
    for (const n of unread) {
      try {
        await updateDoc(doc(db, 'notifications', n.id), { read: true });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedLocation !== 'All Pakistan') params.set('location', selectedLocation);
    navigate(`/listings?${params.toString()}`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-white font-sans text-stone-900">
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-[100] bg-white border-b border-stone-100 shadow-sm transition-all duration-300">
        {/* Top Navbar */}
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20 gap-4 lg:gap-8">
            
            {/* Logo */}
            <Link to="/" className="shrink-0 flex items-center">
              <img src="/logo.png" alt="Mandi.pk" className="h-8 lg:h-12 w-auto object-contain" />
            </Link>

            {/* Smart Search Bar (Desktop) */}
            <div className="hidden lg:flex flex-1 items-center gap-2 max-w-3xl">
              <form onSubmit={handleSearch} className="flex-1 flex items-center bg-stone-50 border-2 border-stone-100 rounded-xl overflow-hidden focus-within:border-amber-400 focus-within:shadow-lg focus-within:shadow-amber-400/10 transition-all">
                {/* Location Selector */}
                <div className="relative border-r border-stone-200" ref={locationMenuRef}>
                    <button 
                      type="button"
                      onClick={() => setShowLocationMenu(!showLocationMenu)}
                      className="flex items-center gap-2 px-4 py-3 text-xs font-black text-stone-600 hover:bg-stone-100 transition-colors whitespace-nowrap uppercase tracking-tighter"
                    >
                      <MapPin className="w-4 h-4 text-amber-500" />
                      {selectedLocation.split(' ')[0]}
                      <ChevronDown className={cn("w-3 h-3 transition-transform", showLocationMenu && "rotate-180")} />
                    </button>
                    {showLocationMenu && (
                      <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-stone-100 rounded-xl shadow-2xl py-2 z-[210] max-h-80 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                        {LOCATIONS.map(loc => (
                          <button
                            key={loc}
                            onClick={() => { setSelectedLocation(loc); setShowLocationMenu(false); }}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-xs font-bold hover:bg-stone-50 transition-colors",
                              selectedLocation === loc ? "text-amber-600 bg-amber-50/50" : "text-stone-600"
                            )}
                          >
                            {loc}
                          </button>
                        ))}
                      </div>
                    )}
                </div>

                {/* Categories Selector */}
                <div className="relative border-r border-stone-200 hidden xl:block" ref={categoriesMenuRef}>
                   <button 
                     type="button"
                     onClick={() => setShowCategoriesMenu(!showCategoriesMenu)}
                     className="flex items-center gap-2 px-4 py-3 text-xs font-black text-stone-600 hover:bg-stone-100 transition-colors whitespace-nowrap uppercase tracking-tighter"
                   >
                     Categories
                     <ChevronDown className={cn("w-3 h-3 transition-transform", showCategoriesMenu && "rotate-180")} />
                   </button>
                   {showCategoriesMenu && (
                     <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-stone-100 rounded-xl shadow-2xl py-2 z-[210] grid grid-cols-1 animate-in fade-in zoom-in-95 duration-200">
                       {CATEGORIES.map(cat => (
                         <Link
                           key={cat.id}
                           to={`/listings?category=${cat.id}`}
                           onClick={() => setShowCategoriesMenu(false)}
                           className="flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-stone-600 hover:bg-stone-50 transition-colors"
                         >
                           <cat.icon className="w-4 h-4 text-stone-400" />
                           {cat.name}
                         </Link>
                       ))}
                     </div>
                   )}
                </div>

                <input 
                  type="text" 
                  placeholder="What are you looking for?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-sm font-bold text-stone-800 placeholder:text-stone-400 placeholder:font-normal"
                />
                
                <button type="submit" className="bg-stone-900 hover:bg-black text-white px-6 py-3 transition-all flex items-center justify-center">
                  <Search className="w-5 h-5" />
                </button>
              </form>
            </div>

            {/* Actions (Desktop) */}
            <div className="hidden lg:flex items-center gap-4">
              {user && !user.isAnonymous ? (
                <>
                  <Link to="/messages" className="p-3 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all relative">
                    <MessageCircle className="w-6 h-6 outline-none" />
                    {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full border-2 border-white flex items-center justify-center animate-pulse">!</span>}
                  </Link>

                  <div className="relative">
                    <button 
                      onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications) markAllAsRead(); }}
                      className={cn("p-3 rounded-xl transition-all relative", showNotifications ? "bg-amber-50 text-amber-600" : "text-stone-500 hover:bg-amber-50")}
                    >
                      <Bell className="w-6 h-6" />
                      {unreadCount > 0 && <span className="absolute top-2.5 right-2.5 w-4 h-4 bg-amber-500 rounded-full border-2 border-white" />}
                    </button>
                    {showNotifications && (
                      <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.2)] border border-stone-100 z-[210] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                        <div className="p-4 bg-stone-50 border-b border-stone-100 flex justify-between items-center">
                          <h3 className="font-black text-[10px] uppercase tracking-widest text-stone-400">Notifications</h3>
                          <button onClick={() => setShowNotifications(false)}><X className="w-4 h-4 text-stone-400" /></button>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                          {notifications.length === 0 ? (
                            <div className="p-12 text-center text-stone-400 text-[10px] uppercase font-black italic tracking-widest">Clear Skies</div>
                          ) : (
                            notifications.map(n => (
                              <div key={n.id} className={cn("p-5 border-b border-stone-50 transition-colors hover:bg-stone-50", !n.read && "bg-amber-50/20")}>
                                <p className="font-black text-xs text-stone-900 mb-1 leading-tight">{n.title}</p>
                                <p className="text-[11px] text-stone-500 leading-relaxed font-medium">{n.message}</p>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <Link to="/profile" className="p-3 text-stone-500 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all" title="Favorites">
                    <Heart className="w-6 h-6" />
                  </Link>

                  <div className="relative" ref={profileMenuRef}>
                    <button 
                      onClick={() => setShowProfileMenu(!showProfileMenu)}
                      className="flex items-center gap-2 p-1.5 pl-3 pr-2 bg-stone-50 border-2 border-stone-100 rounded-2xl hover:bg-stone-100 transition-all"
                    >
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-stone-200 border border-white shadow-sm flex-shrink-0">
                        {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User className="w-full h-full p-2 text-stone-400" />}
                      </div>
                      <ChevronDown className={cn("w-4 h-4 text-stone-400 transition-transform duration-300", showProfileMenu && "rotate-180")} />
                    </button>
                    {showProfileMenu && (
                      <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.2)] border border-stone-100 z-[210] overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                        <div className="p-5 bg-stone-900 text-white">
                          <p className="font-black text-xs uppercase tracking-widest leading-none mb-1">{user.displayName || 'Seller'}</p>
                          <p className="text-[10px] text-stone-400 truncate opacity-80">{user.email}</p>
                        </div>
                        <div className="p-2 flex flex-col gap-1">
                          <Link to="/profile" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black text-stone-600 hover:bg-stone-50 rounded-xl transition-colors">
                            <User className="w-4 h-4" /> My Profile
                          </Link>
                          <Link to="/dashboard" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black text-stone-600 hover:bg-stone-50 rounded-xl transition-colors">
                            <LayoutDashboardIcon className="w-4 h-4" /> Seller Dashboard
                          </Link>
                          <Link to="/listings?sellerId=me" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black text-stone-600 hover:bg-stone-50 rounded-xl transition-colors">
                            <Package className="w-4 h-4" /> My Ads
                          </Link>
                          {isAdmin && (
                            <Link to="/admin" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 text-xs font-black text-amber-600 hover:bg-amber-50 rounded-xl transition-colors">
                              <AlertCircle className="w-4 h-4" /> Admin Dashboard
                            </Link>
                          )}
                          <div className="border-t border-stone-100 my-1"></div>
                          <button onClick={logout} className="flex items-center gap-3 w-full text-left px-4 py-3 text-xs font-black text-red-600 hover:bg-red-50 rounded-xl transition-colors">
                            <LogOut className="w-4 h-4" /> Log out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                   <button onClick={handleLogin} className="px-6 py-3 text-xs font-black text-stone-500 uppercase tracking-widest hover:text-stone-900 transition-colors">Login</button>
                   <button onClick={handleLogin} className="px-7 py-3 text-xs font-black text-white bg-stone-900 rounded-2xl hover:bg-black transition-all shadow-xl shadow-stone-900/10 uppercase tracking-widest">Register</button>
                </div>
              )}

              {/* POST AD BUTTON */}
              <Link to="/submit" className="flex items-center gap-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-900 font-black px-7 py-4 rounded-2xl transition-all shadow-xl shadow-amber-500/30 active:scale-95 border-b-4 border-amber-600/30 uppercase italic text-[11px] tracking-[0.1em] ml-2 group">
                <PlusSquare className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Post Your Item
              </Link>
            </div>

            {/* Mobile Header Icons */}
            <div className="lg:hidden flex items-center gap-1">
               <button onClick={() => navigate('/messages')} className="p-2 text-stone-500 hover:bg-stone-50 rounded-xl"><MessageCircle className="w-6 h-6" /></button>
               <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-stone-500 hover:bg-stone-50 rounded-xl relative">
                  <Bell className="w-6 h-6" />
                  {unreadCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full border-2 border-white" />}
               </button>
               <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-stone-500 hover:bg-stone-50 rounded-xl"><Menu className="w-6 h-6" /></button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden">
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setMobileMenuOpen(false)}></div>
           <div className="absolute top-0 right-0 bottom-0 w-80 bg-white shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto elastic-scroll">
              <div className="p-8 border-b border-stone-100 flex justify-between items-center bg-stone-50">
                 <Link to="/" onClick={() => setMobileMenuOpen(false)}><img src="/logo.png" className="h-10 w-auto" /></Link>
                 <button onClick={() => setMobileMenuOpen(false)} className="p-3 bg-white border border-stone-200 rounded-2xl shadow-sm"><X className="w-6 h-6 text-stone-400" /></button>
              </div>
              
              <div className="p-6 flex flex-col gap-2">
                 {user && !user.isAnonymous && (
                   <div className="bg-stone-900 rounded-3xl p-6 mb-4 text-white">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-white/20">
                          {user.photoURL ? <img src={user.photoURL} className="w-full h-full object-cover" /> : <User className="w-full h-full p-3 text-stone-500" />}
                        </div>
                        <div>
                          <p className="font-black text-lg leading-none mb-1">{user.displayName || 'Seller'}</p>
                          <p className="text-[10px] uppercase font-black tracking-widest text-stone-500 opacity-80">Connected</p>
                        </div>
                      </div>
                      <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block w-full bg-white/10 hover:bg-white/20 text-center py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors mb-2">View Profile</Link>
                      <Link to="/submit" onClick={() => setMobileMenuOpen(false)} className="block w-full bg-amber-500 hover:bg-amber-600 text-stone-900 text-center py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">Start Selling</Link>
                   </div>
                 )}

                 <Link to="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><HomeIcon className="w-5 h-5" /></div>
                    Home
                 </Link>
                 <Link to="/listings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><Compass className="w-5 h-5" /></div>
                    Marketplace
                 </Link>
                 <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><LayoutDashboardIcon className="w-5 h-5" /></div>
                    Seller Hub
                 </Link>
                 {isAdmin && (
                   <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-amber-600 hover:bg-amber-50 rounded-3xl transition-all group">
                      <div className="w-10 h-10 bg-amber-50/50 rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-colors"><AlertCircle className="w-5 h-5" /></div>
                       Admin Dashboard
                   </Link>
                 )}
                 <Link to="/messages" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-5 p-5 text-sm font-black text-stone-600 hover:bg-stone-50 rounded-3xl transition-all group">
                    <div className="w-10 h-10 bg-stone-100 rounded-2xl flex items-center justify-center group-hover:bg-amber-50 group-hover:text-amber-600 transition-colors"><MessageCircle className="w-5 h-5" /></div>
                    Chats & Offers
                 </Link>

                 <div className="border-t border-stone-100 my-6"></div>
                 
                 <div className="px-4 mb-2 text-[10px] font-black uppercase tracking-widest text-stone-400">Support & Legal</div>
                 <Link to="/faqs" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 text-xs font-black text-stone-500 hover:text-stone-900 transition-colors">Help Center & FAQs</Link>
                 <Link to="/verified" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 text-xs font-black text-stone-500 hover:text-stone-900 transition-colors">Verified Program</Link>
                 <Link to="/contact" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-4 p-4 text-xs font-black text-stone-500 hover:text-stone-900 transition-colors">Contact Support</Link>

                 <div className="mt-8 px-2">
                    {user && !user.isAnonymous ? (
                      <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="w-full bg-red-50 text-red-600 font-black py-5 rounded-3xl text-sm uppercase tracking-widest hover:bg-red-100 transition-colors">Exit Application</button>
                    ) : (
                      <button onClick={() => { handleLogin(); setMobileMenuOpen(false); }} className="w-full bg-stone-900 text-white font-black py-5 rounded-3xl text-sm uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-stone-900/20">Login / Create Account</button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-grow pb-20">
        <Outlet />
      </main>

      {/* Modern Bottom Navigation Bar (Always Visible) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-stone-100 h-20 px-4 md:px-8 flex items-center justify-between z-[150] shadow-[0_-20px_50px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto w-full flex items-center justify-between">
          <Link to="/" className={cn("flex flex-col items-center gap-1.5 transition-all group", location.pathname === "/" ? "text-amber-600 scale-110" : "text-stone-300 hover:text-stone-400")}>
            <HomeIcon className={cn("w-6 h-6", location.pathname === "/" ? "fill-amber-600/10" : "")} />
            <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Home</span>
          </Link>
          <Link to="/listings" className={cn("flex flex-col items-center gap-1.5 transition-all group", location.pathname === "/listings" ? "text-amber-600 scale-110" : "text-stone-300 hover:text-stone-400")}>
            <Search className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Explore</span>
          </Link>
          
          {/* Mobile POST Button Center */}
          <Link to="/submit" className="relative -top-8 flex flex-col items-center justify-center">
             <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[22px] shadow-[0_15px_40px_rgba(245,158,11,0.5)] flex items-center justify-center border-4 border-white rotate-45 group hover:rotate-[225deg] transition-all duration-700">
                <PlusSquare className="w-8 h-8 text-stone-900 -rotate-45 group-hover:rotate-[225deg] transition-all duration-700" />
             </div>
             <span className="text-[8px] font-black uppercase tracking-[0.2em] text-stone-400 mt-3 hidden xs:block">Post Ad</span>
          </Link>
  
          <Link to="/messages" className={cn("flex flex-col items-center gap-1.5 transition-all group", location.pathname === "/messages" ? "text-amber-600 scale-110" : "text-stone-300 hover:text-stone-400")}>
            <MessageCircle className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Chat</span>
          </Link>
          <Link to="/profile" className={cn("flex flex-col items-center gap-1.5 transition-all group", location.pathname === "/profile" ? "text-amber-600 scale-110" : "text-stone-300 hover:text-stone-400")}>
            <User className="w-6 h-6" />
            <span className="text-[9px] font-black uppercase tracking-widest hidden xs:block">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
