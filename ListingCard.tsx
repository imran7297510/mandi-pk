import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Listing } from '../types';
import { formatPKR } from '../lib/utils';
import { 
  MapPin, 
  CheckCircle, 
  Trash2, 
  Share2, 
  Rocket, 
  Zap, 
  Heart,
  Clock,
  ShieldCheck,
  Star,
  MoreHorizontal,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { doc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ListingCardProps {
  listing: Listing;
  onUpdate?: () => void;
  premium?: boolean;
  dark?: boolean;
  key?: any;
}

export function ListingCard({ listing, onUpdate, premium, dark }: ListingCardProps) {
  const { user, isAdmin } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const navigate = useNavigate();
  
  const isOwner = Boolean(user && user.uid && listing.ownerId && user.uid === listing.ownerId);
  const isBoosted = listing.isBoosted || listing.isFeatured;

  const removeListing = async () => {
    if (!confirm('Are you sure you want to delete this listing?')) return;
    setUpdating(true);
    try {
      await deleteDoc(doc(db, 'listings', listing.id));
      if (onUpdate) onUpdate();
      else window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `listings/${listing.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const markAsCompleted = async () => {
    if (!confirm('Mark as sold?')) return;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'listings', listing.id), {
        status: 'SOLD',
        updatedAt: serverTimestamp()
      });
      if (onUpdate) onUpdate();
      else window.location.reload();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `listings/${listing.id}`);
    } finally {
      setUpdating(false);
    }
  };

  const timeAgo = () => {
    if (!listing.createdAt) return 'Just now';
    const date = listing.createdAt.toDate?.() || new Date(listing.createdAt.seconds * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className={cn(
      "group relative flex flex-col h-full rounded-[1.5rem] lg:rounded-[2rem] overflow-hidden transition-all duration-500",
      dark ? "bg-white/5 border border-white/10 hover:bg-white/10" : "bg-white border border-stone-100 shadow-sm hover:shadow-2xl hover:shadow-stone-200/50 hover:-translate-y-1",
      premium && "ring-2 ring-amber-500/20 shadow-xl shadow-amber-500/10"
    )}>
      
      {/* Image Container */}
      <div 
        className="relative aspect-[4/3] overflow-hidden cursor-pointer"
        onClick={() => navigate(`/listings/${listing.id}`)}
      >
        {listing.images && listing.images[0] ? (
          <img 
            src={listing.images[0]} 
            alt={listing.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
          />
        ) : (
          <div className="w-full h-full bg-stone-100 flex items-center justify-center">
            <Zap className="w-8 h-8 text-stone-200" />
          </div>
        )}

        {/* Badges Overlay */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {isBoosted && (
             <div className="bg-amber-500 text-stone-900 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xl shadow-amber-500/20 uppercase tracking-widest border border-amber-400">
                <Zap className="w-3.5 h-3.5 fill-stone-900" /> Boosted
             </div>
          )}
          {listing.status === 'SOLD' && (
             <div className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-xl uppercase tracking-widest border border-emerald-400">
                <CheckCircle className="w-3.5 h-3.5" /> Sold out
             </div>
          )}
        </div>

        {/* Action Buttons Overlay */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              setIsFavorite(!isFavorite); 
            }}
            className={cn(
              "w-10 h-10 rounded-full backdrop-blur-md flex items-center justify-center transition-all shadow-lg",
              isFavorite ? "bg-red-500 text-white" : "bg-white/80 text-stone-600 hover:bg-white"
            )}
          >
            <Heart className={cn("w-5 h-5", isFavorite && "fill-white")} />
          </button>
          <button 
             onClick={(e) => {
               e.stopPropagation();
               const url = `${window.location.origin}/listings/${listing.id}`;
               navigator.clipboard.writeText(url);
               alert('Link copied!');
             }}
             className="w-10 h-10 rounded-full bg-white/80 backdrop-blur-md text-stone-600 hover:bg-white flex items-center justify-center transition-all shadow-lg"
          >
             <Share2 className="w-5 h-5" />
          </button>
        </div>

        {/* Footer info overlay */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
           <div className="bg-stone-900/60 backdrop-blur-md px-3 py-1 rounded-lg text-[9px] font-black text-white uppercase tracking-widest border border-white/10">
              {listing.category}
           </div>
           {premium && (
              <div className="bg-white/90 backdrop-blur-md p-1.5 rounded-xl shadow-lg border border-white">
                 <ShieldCheck className="w-4 h-4 text-amber-500" />
              </div>
           )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 lg:p-8">
        <div className="flex justify-between items-start gap-3 mb-3">
           <h3 className={cn(
             "font-black text-base lg:text-xl line-clamp-1 italic uppercase tracking-tighter transition-colors",
             dark ? "text-white" : "text-stone-900 group-hover:text-amber-600"
           )}>
             {listing.title}
           </h3>
           <div className="flex items-center gap-1 bg-stone-50 rounded-lg px-2 py-1 shrink-0">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span className="text-[10px] font-black text-stone-400 uppercase">4.8</span>
           </div>
        </div>

        <p className="text-xl lg:text-3xl font-black text-amber-500 mb-5 drop-shadow-sm">
           {formatPKR(listing.price)}
        </p>

        <div className="mt-auto space-y-4 pt-4 border-t border-stone-100/10">
           <div className="flex items-center justify-between gap-3 text-[10px] font-black uppercase tracking-widest text-stone-400">
              <div className="flex items-center gap-1.5 truncate">
                 <MapPin className="w-4 h-4 text-stone-400 group-hover:text-amber-500 transition-colors" />
                 <span className="truncate">{listing.city}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                 <Clock className="w-4 h-4 text-stone-400" />
                 <span>{timeAgo()}</span>
              </div>
           </div>

           {/* Owner / Admin Tools */}
           {(isOwner || isAdmin) && (
              <div className="flex flex-wrap gap-2 pt-2">
                 {isOwner && listing.status === 'LIVE' && (
                    <Link 
                      to={`/promotions?listingId=${listing.id}`}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 text-stone-900 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                      <Zap className="w-3.5 h-3.5 fill-stone-900" /> Promote
                    </Link>
                 )}
                 {isOwner && listing.status === 'LIVE' && (
                    <button 
                      onClick={markAsCompleted}
                      disabled={updating}
                      className="flex-1 border border-stone-200 text-stone-600 hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 font-black py-3 rounded-xl text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                       {updating ? '...' : 'Sold'}
                    </button>
                 )}
                 <button 
                   onClick={removeListing}
                   disabled={updating}
                   className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-all border border-red-100 active:scale-95 translate-y-0.5"
                   title="Delete Listing"
                 >
                    <Trash2 className="w-5 h-5" />
                 </button>
              </div>
           )}
           
           {/* Public Contact Action (Only if not owner and not sold) */}
           {!isOwner && listing.status === 'LIVE' && (
              <Link 
                to={`/listings/${listing.id}`}
                className={cn(
                  "block w-full py-4 rounded-2xl font-black text-center text-xs uppercase tracking-[0.2em] transition-all active:scale-95 group/btn",
                  dark ? "bg-white text-stone-900 hover:bg-amber-500 hover:text-stone-900" : "bg-stone-900 text-white hover:bg-amber-500"
                )}
              >
                Connect Now <ArrowRight className="inline-block w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
              </Link>
           )}
        </div>
      </div>
      
      {/* Decorative corner */}
      <div className="absolute -bottom-1 -right-1 w-12 h-12 bg-amber-500/5 rotate-45 pointer-events-none" />
    </div>
  );
}
