import { useEffect, useState, useRef } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing } from '../types';
import { ListingCard } from '../components/ListingCard';
import { Link } from 'react-router-dom';
import { CATEGORIES } from '../constants';
import { 
  Rocket, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Star, 
  Shield, 
  MessageSquare, 
  TrendingUp, 
  Clock,
  CheckCircle2,
  Lock,
  Users
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Home() {
  const [boostedListings, setBoostedListings] = useState<Listing[]>([]);
  const [latestListings, setLatestListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const q = query(
          collection(db, 'listings'),
          where('status', '==', 'LIVE')
        );
        const snapshot = await getDocs(q);
        const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Listing));
        
        // Sort by date
        docs.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
          const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
          return timeB - timeA;
        });

        setBoostedListings(docs.filter(d => d.isBoosted || d.isFeatured).slice(0, 10));
        setLatestListings(docs.slice(0, 12));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'home');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="bg-white min-h-screen">
      {/* 1. Boosted / Featured Ads Section (Premium Slider) */}
      <section className="py-12 lg:py-20 bg-stone-50 overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between mb-8 lg:mb-12">
            <div>
              <div className="flex items-center gap-2 text-amber-600 font-black text-[10px] uppercase tracking-[0.3em] mb-3">
                <Zap className="w-3.5 h-3.5 fill-amber-500" /> Premium Picks
              </div>
              <h2 className="text-3xl lg:text-5xl font-black italic uppercase tracking-tighter text-stone-900 leading-none">
                Boosted <span className="text-stone-400">Discoveries</span>
              </h2>
            </div>
            <Link to="/listings?filter=boosted" className="hidden lg:flex items-center gap-2 text-xs font-black uppercase tracking-widest text-stone-400 hover:text-amber-500 transition-colors">
              Explore All <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {loading ? (
            <div className="h-96 flex items-center justify-center text-stone-400 font-black italic uppercase tracking-widest animate-pulse">Loading Treasures...</div>
          ) : boostedListings.length > 0 ? (
            <div 
              ref={scrollRef}
              className="flex gap-6 lg:gap-8 overflow-x-auto pb-12 snap-x snap-mandatory scrollbar-none"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
               {boostedListings.map(listing => (
                 <div key={listing.id} className="min-w-[260px] lg:min-w-[420px] snap-start shrink-0 first:ml-0">
                    <ListingCard listing={listing} premium />
                 </div>
               ))}
            </div>
          ) : (
            <div className="bg-white border-4 border-dashed border-stone-200 rounded-[3rem] p-24 text-center">
               <Rocket className="w-16 h-16 text-stone-200 mx-auto mb-6" />
               <p className="font-black text-stone-300 uppercase italic text-xl">Boost your ad to see it here</p>
               <Link to="/submit" className="mt-6 inline-block bg-stone-900 text-white px-8 py-3 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-500 hover:text-stone-900 transition-all">Post Now</Link>
            </div>
          )}
        </div>
      </section>

      {/* 2. Categories Section (Modern Responsive Grid) */}
      <section className="py-16 lg:py-24">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 text-center mb-12 lg:mb-20">
           <h2 className="text-2xl lg:text-4xl font-black italic uppercase tracking-tighter text-stone-900 mb-4">
              Browse <span className="text-amber-500">Categories</span>
           </h2>
           <p className="text-sm text-stone-500 font-medium max-w-2xl mx-auto">Discover exactly what you're looking for by exploring our curated specialized marketplace departments.</p>
        </div>

        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 lg:gap-6">
            {CATEGORIES.map(cat => (
              <Link 
                key={cat.id} 
                to={`/listings?category=${cat.id}`}
                className="group relative bg-stone-50 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-6 transition-all duration-500 hover:bg-white hover:shadow-[0_30px_60px_rgba(0,0,0,0.1)] hover:-translate-y-2 border border-transparent hover:border-amber-100"
              >
                <div className="w-16 h-16 bg-white rounded-3xl shadow-sm flex items-center justify-center group-hover:bg-amber-500 group-hover:rotate-12 transition-all duration-500">
                   <cat.icon className="w-7 h-7 text-stone-400 group-hover:text-white transition-colors" />
                </div>
                <div className="flex flex-col items-center">
                   <span className="text-xs font-black uppercase tracking-tight text-stone-900 mb-1">{cat.name}</span>
                   <span className="text-[10px] font-black italic text-stone-400 uppercase tracking-widest">{cat.count} Items</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Latest Ads Section */}
      <section className="py-16 lg:py-24 bg-stone-900 text-white rounded-t-[4rem] lg:rounded-t-[6rem]">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
           <div className="flex items-center justify-between mb-12 lg:mb-16">
              <div>
                <h2 className="text-3xl lg:text-5xl font-black italic uppercase tracking-tighter text-white leading-none mb-3">
                  Marketplace <span className="text-amber-500">Pulse</span>
                </h2>
                <div className="flex items-center gap-3">
                   <span className="w-10 h-1 bg-amber-500 rounded-full" />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">Fresh listings added minutes ago</p>
                </div>
              </div>
              <Link to="/listings" className="bg-white/10 hover:bg-white/20 border border-white/10 text-white px-8 py-4 rounded-2xl text-[10px] uppercase font-black tracking-widest transition-all active:scale-95">All Classifieds</Link>
           </div>

            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-10">
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="aspect-[4/5] bg-white/5 rounded-[2rem] animate-pulse" />
                ))
              ) : (
                latestListings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} dark />
                ))
              )}
           </div>
           
           <div className="mt-20 text-center">
              <Link to="/listings" className="inline-flex items-center gap-4 text-xs font-black uppercase tracking-[0.3em] text-amber-500 group">
                <span className="group-hover:mr-2 transition-all">Explore Complete Collection</span> <ArrowRight className="w-5 h-5" />
              </Link>
           </div>
        </div>
      </section>

      {/* 4. Trust & Safety Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
             <div className="space-y-10">
                <div>
                   <div className="px-5 py-2 bg-emerald-50 text-emerald-600 rounded-full inline-block text-[10px] font-black uppercase tracking-widest mb-6 border border-emerald-100">Zero Compromise Security</div>
                   <h2 className="text-3xl lg:text-6xl font-black italic uppercase tracking-tighter text-stone-900 leading-[0.9]">
                      Safe Marketplace <br /> <span className="text-stone-300">Trusted Community</span>
                   </h2>
                </div>
                
                <div className="grid gap-8">
                   <div className="flex gap-6 group">
                      <div className="w-16 h-16 shrink-0 bg-stone-900 rounded-3xl flex items-center justify-center text-white group-hover:bg-amber-500 transition-colors shadow-2xl">
                         <ShieldCheck className="w-8 h-8" />
                      </div>
                      <div>
                         <h4 className="font-black text-lg uppercase italic tracking-tight mb-2">Verified Merchants</h4>
                         <p className="text-sm text-stone-500 leading-relaxed">We strictly verify profiles with national identity to ensure you connect with real people and legitimate businesses.</p>
                      </div>
                   </div>

                   <div className="flex gap-6 group">
                      <div className="w-16 h-16 shrink-0 bg-stone-900 rounded-3xl flex items-center justify-center text-white group-hover:bg-amber-500 transition-colors shadow-2xl">
                         <MessageSquare className="w-8 h-8" />
                      </div>
                      <div>
                         <h4 className="font-black text-lg uppercase italic tracking-tight mb-2">Secure Internal Chat</h4>
                         <p className="text-sm text-stone-500 leading-relaxed">Communicate safely through our encrypted messaging system. No need to share personal details until you are ready.</p>
                      </div>
                   </div>

                   <div className="flex gap-6 group">
                      <div className="w-16 h-16 shrink-0 bg-stone-900 rounded-3xl flex items-center justify-center text-white group-hover:bg-amber-500 transition-colors shadow-2xl">
                         <Lock className="w-8 h-8" />
                      </div>
                      <div>
                         <h4 className="font-black text-lg uppercase italic tracking-tight mb-2">Buyer Protection</h4>
                         <p className="text-sm text-stone-500 leading-relaxed">Comprehensive guides and support tickets to help you navigate transactions securely and report suspicious behavior.</p>
                      </div>
                   </div>
                </div>
             </div>

             <div className="relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-stone-100 rounded-full blur-[100px] opacity-50" />
                <div className="relative bg-stone-900 rounded-[3rem] lg:rounded-[4rem] p-8 lg:p-16 text-white shadow-2xl overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                   <h3 className="text-3xl lg:text-4xl font-black italic uppercase tracking-tighter mb-8 max-w-xs leading-none">Ready to start <span className="text-amber-500">Trading?</span></h3>
                   <div className="space-y-3 lg:space-y-4">
                      <div className="bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex items-center gap-4 lg:gap-5">
                         <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-500 rounded-xl flex items-center justify-center font-black text-stone-900 text-sm lg:text-base">01</div>
                         <p className="text-xs lg:text-sm font-bold uppercase tracking-tight">Snap or Upload Item Photos</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex items-center gap-4 lg:gap-5">
                         <div className="w-10 h-10 lg:w-12 lg:h-12 bg-amber-500 rounded-xl flex items-center justify-center font-black text-stone-900 text-sm lg:text-base">02</div>
                         <p className="text-xs lg:text-sm font-bold uppercase tracking-tight">Set Price & Local Details</p>
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl lg:rounded-3xl p-4 lg:p-6 flex items-center gap-4 lg:gap-5">
                         <div className="w-10 h-10 lg:w-12 lg:h-12 bg-emerald-500 rounded-xl flex items-center justify-center font-black text-stone-900 text-sm lg:text-base">03</div>
                         <p className="text-xs lg:text-sm font-bold uppercase tracking-tight">Publish & Chat with Buyers</p>
                      </div>
                   </div>
                   <Link to="/submit" className="mt-8 lg:mt-12 block bg-white text-stone-900 text-center py-4 lg:py-5 rounded-2xl lg:rounded-3xl font-black uppercase text-xs tracking-widest hover:bg-amber-500 transition-all shadow-xl">Get Started Free</Link>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* 5. Why Choose Us Section */}
      <section className="py-24 lg:py-32 bg-stone-50">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
           <div className="text-center mb-16 lg:mb-24">
              <h2 className="text-3xl lg:text-5xl font-black italic uppercase tracking-tighter text-stone-900 mb-4">
                 Why Sellers <span className="text-stone-300">Choose us</span>
              </h2>
              <p className="text-stone-500 text-sm font-medium">Empowering the local economy through seamless digital trade.</p>
           </div>
           
           <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-12 rounded-[3.5rem] border border-stone-200 hover:shadow-2xl hover:shadow-stone-200/50 transition-all group">
                 <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 group-hover:bg-amber-500 group-hover:text-white transition-all mb-10 shadow-inner">
                    <TrendingUp className="w-8 h-8" />
                 </div>
                 <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-4">Large Audience Reach</h4>
                 <p className="text-stone-500 text-sm leading-relaxed">Connect with thousands of active buyers across all provinces. Your items get maximum visibility instantly.</p>
              </div>

              <div className="bg-white p-12 rounded-[3.5rem] border border-stone-200 hover:shadow-2xl hover:shadow-stone-200/50 transition-all group">
                 <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 group-hover:bg-amber-500 group-hover:text-white transition-all mb-10 shadow-inner">
                    <Clock className="w-8 h-8" />
                 </div>
                 <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-4">Fastest Browsing</h4>
                 <p className="text-stone-500 text-sm leading-relaxed">Optimized for speed and mobile efficiency. Find what you need or post an ad in less than 60 seconds.</p>
              </div>

              <div className="bg-white p-12 rounded-[3.5rem] border border-stone-200 hover:shadow-2xl hover:shadow-stone-200/50 transition-all group">
                 <div className="w-16 h-16 bg-stone-50 rounded-2xl flex items-center justify-center text-stone-900 group-hover:bg-amber-500 group-hover:text-white transition-all mb-10 shadow-inner">
                    <Users className="w-8 h-8" />
                 </div>
                 <h4 className="text-2xl font-black italic uppercase tracking-tighter mb-4">Merchant Dashboard</h4>
                 <p className="text-stone-500 text-sm leading-relaxed">Track views, manage active ads, and chat with clients through a professional, intuitive seller interface.</p>
              </div>
           </div>
        </div>
      </section>

    </div>
  );
}
