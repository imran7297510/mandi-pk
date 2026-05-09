import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, sendNotification } from '../lib/firebase';
import { Listing, UserProfile, Order } from '../types';
import { useAuth } from '../context/AuthContext';
import { formatPKR } from '../lib/utils';
import { MapPin, Phone, User, MessageCircle, AlertTriangle, ShieldCheck, Share2, Package, Truck, CheckCircle, ShoppingCart, X, Zap } from 'lucide-react';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import { CATEGORY_FIELDS } from '../lib/categoryFields';

export function ListingDetails() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [sellerProfile, setSellerProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [buyerDetails, setBuyerDetails] = useState({
    name: '',
    address: '',
    contact: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setBuyerDetails(prev => ({
        ...prev,
        name: user.displayName || '',
        contact: user.phoneNumber || ''
      }));
    }
  }, [user]);

  useEffect(() => {
    async function fetchListing() {
      if (!id) return;
      try {
        const docRef = doc(db, 'listings', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Listing;
          setListing(data);
          
          if (!user || user.uid !== data.ownerId) {
            try {
              await updateDoc(docRef, {
                views: increment(1)
              });
            } catch (err) {
              console.warn("Could not increment views", err);
            }
          }
          
          if (data.ownerId && data.ownerId !== 'guest') {
            const userRef = doc(db, 'users', data.ownerId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const uData = userSnap.data() as UserProfile;
              setSellerProfile(uData);
              
              // Fetch seller listing count
              const q = query(collection(db, 'listings'), where('ownerId', '==', data.ownerId), where('status', '==', 'LIVE'));
              const qSnap = await getDocs(q);
              (uData as any).listingCount = qSnap.size;
              setSellerProfile({ ...uData });
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `listings/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchListing();
  }, [id, user]);

  const updateBookingDetails = (field: string, value: string) => {
    setBuyerDetails(prev => ({ ...prev, [field]: value }));
  };

  const handleBookOrder = async () => {
    if (!user) {
      alert("Please login to book this item.");
      return;
    }
    if (!listing) return;

    if (!buyerDetails.name || !buyerDetails.address || !buyerDetails.contact) {
      alert("Please fill in all buyer details.");
      return;
    }

    setBooking(true);
    try {
      const orderRef = doc(collection(db, 'orders'));
      const totalPrice = (listing.price * quantity) + (listing.shippingCharges || 0);

      const orderData: Order = {
        listingId: listing.id!,
        listingTitle: listing.title,
        listingImage: listing.images[0],
        buyerId: user.uid,
        sellerId: listing.ownerId,
        quantity: quantity,
        unitPrice: listing.price,
        shippingCharges: listing.shippingCharges || 0,
        totalAmount: totalPrice,
        status: 'BOOKED',
        buyerName: buyerDetails.name,
        buyerAddress: buyerDetails.address,
        buyerContact: buyerDetails.contact,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(orderRef, orderData);
      
      // Update listing stock
      const listingRef = doc(db, 'listings', listing.id!);
      const newStock = (listing.quantity || 0) - quantity;
      
      await updateDoc(listingRef, {
        quantity: increment(-quantity),
        status: newStock === 0 ? 'BOOKED' : 'LIVE',
        updatedAt: serverTimestamp()
      });

      // Notification for seller with item details and link
      await sendNotification(
        listing.ownerId,
        "New Order Received! 🛒",
        `You have a new booking request for "${listing.title}" (Qty: ${quantity}). Total Amount: ${formatPKR(totalPrice)}. Check your sales dashboard to ship it!`,
        "NEW_ORDER",
        orderRef.id
      );

      setBookingSuccess(true);
      setShowBookingForm(false);
      setTimeout(() => setBookingSuccess(false), 5000);
    } catch (e) {
      console.error(e);
      handleFirestoreError(e, OperationType.CREATE, 'orders');
    } finally {
      setBooking(false);
    }
  };

  const handleStartBooking = () => {
    if (!user) {
      alert("Please login to book this item.");
      return;
    }
    if (!listing) return;
    if (listing.ownerId === user.uid) {
      alert("You cannot book your own listing.");
      return;
    }
    if (quantity > listing.quantity) {
      alert("Requested quantity is more than available stock.");
      return;
    }
    setShowBookingForm(true);
  };

  const handleStartChat = async () => {
    if (!user) {
      alert("Please login to chat with seller.");
      return;
    }
    if (!listing) return;
    
    try {
      const q = query(
        collection(db, 'chats'),
        where('listingId', '==', listing.id),
        where('buyerId', '==', user.uid)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        navigate(`/messages`);
        return;
      }
      
      const chatRef = doc(collection(db, 'chats'));
      await setDoc(chatRef, {
        listingId: listing.id,
        buyerId: user.uid,
        sellerId: listing.ownerId,
        lastMessage: '',
        updatedAt: serverTimestamp()
      });
      navigate(`/messages`);
    } catch (e) {
      console.error(e);
      alert("Failed to start chat.");
    }
  };

  const handleShare = async () => {
    if (!listing) return;
    const url = window.location.href;
    const title = listing.title;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error("Error sharing:", err);
        }
      }
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const handleReport = async () => {
    if (!user) {
      alert("Please login to report this listing.");
      return;
    }
    const reason = prompt("Why are you reporting this listing? (Spam, Fraud, etc.)");
    if (!reason || reason.trim().length === 0) return;
    
    try {
      const reportRef = doc(collection(db, 'reports'));
      await setDoc(reportRef, {
        listingId: listing!.id,
        reporterId: user.uid,
        reason: reason.trim(),
        status: 'OPEN',
        createdAt: serverTimestamp()
      });
      alert('Report submitted successfully. Our team will review it.');
    } catch (e) {
      console.error(e);
      alert('Failed to submit report.');
    }
  };

  const openLightbox = (index: number) => {
    setPhotoIndex(index);
    setLightboxOpen(true);
  };

  if (loading) return <div className="py-20 text-center text-stone-500">Loading...</div>;
  if (!listing) return <div className="py-20 text-center text-stone-500">Listing not found</div>;

  const slides = listing.images ? listing.images.map(url => ({ src: url })) : [];
  
  const displaySellerName = sellerProfile?.name || listing.sellerName;
  const displayCity = sellerProfile?.city || listing.city;
  const totalPrice = (listing.price * quantity) + (listing.shippingCharges || 0);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link to="/" className="text-amber-600 hover:text-amber-700 mb-6 flex items-center gap-2 font-medium w-fit">
        &larr; Back to listings
      </Link>
      
      <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        <div className="flex flex-col lg:flex-row">
          <div className="w-full lg:w-[55%] p-4 sm:p-6 bg-stone-50 border-r border-stone-100 flex flex-col">
            {listing.images && listing.images.length > 0 ? (
              <div 
                className="w-full aspect-[4/3] rounded-xl overflow-hidden cursor-pointer shadow-sm border border-stone-200 bg-black flex group items-center justify-center relative"
                onClick={() => openLightbox(0)}
              >
                <img 
                   src={listing.images[0]} 
                   alt={listing.title} 
                   className="w-full h-full object-contain bg-black/5 group-hover:scale-[1.02] transition-transform duration-300"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                   <div className="bg-white/90 text-stone-800 px-4 py-2 rounded-full font-medium text-sm shadow-lg flex items-center gap-2">
                     Click to enlarge
                   </div>
                </div>
              </div>
            ) : (
              <div className="w-full aspect-[4/3] bg-stone-100 flex items-center justify-center text-stone-400 rounded-xl border border-stone-200 shadow-sm">No Image Available</div>
            )}
            
            {listing.images && listing.images.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2 scrollbar-thin">
                 {listing.images.map((img, idx) => (
                    <img 
                       key={idx} 
                       src={img} 
                       onClick={() => openLightbox(idx)}
                       className={`w-24 h-24 object-cover rounded-lg shadow-sm border-2 cursor-pointer transition-all hover:opacity-100 ${idx === photoIndex ? 'border-amber-500 opacity-100' : 'border-transparent opacity-70 hover:border-amber-300'}`} 
                       alt={`Thumbnail ${idx + 1}`} 
                    />
                 ))}
              </div>
            )}
          </div>
          
          <div className="w-full lg:w-[45%] p-6 sm:p-8 flex flex-col">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h1 className="text-3xl font-extrabold text-stone-900 mb-2 leading-tight">{listing.title}</h1>
                <div className="text-4xl font-black text-amber-600 drop-shadow-sm">{formatPKR(listing.price)}</div>
              </div>
              <button 
                onClick={handleShare}
                className="p-3 bg-stone-100 border border-stone-200 hover:bg-stone-200 text-stone-700 rounded-full transition-colors flex shrink-0 items-center justify-center shadow-sm"
                title="Share Listing"
              >
                <Share2 className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-8 text-sm">
              <div className="flex items-center gap-1.5 text-stone-500">
                <Package className="w-4 h-4" />
                <span className="font-medium">{listing.quantity} available</span>
              </div>
              <div className="flex items-center gap-1.5 text-stone-500">
                <Truck className="w-4 h-4" />
                <span className="font-medium">{listing.shippingCharges ? `Shipping: ${formatPKR(listing.shippingCharges)}` : 'Free Shipping'}</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-8 text-xs font-bold uppercase tracking-wider">
                <span className="bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1 rounded">{listing.category}</span>
                {listing.subcategory && <span className="bg-stone-100 border border-stone-200 text-stone-700 px-3 py-1 rounded">{listing.subcategory}</span>}
                {listing.condition && <span className="bg-emerald-100 border border-emerald-200 text-emerald-700 px-3 py-1 rounded">{listing.condition}</span>}
            </div>
            
            {listing.customFields && Object.keys(listing.customFields).length > 0 && CATEGORY_FIELDS[listing.category] && (
               <div className="mb-8 grid grid-cols-2 gap-y-4 gap-x-6 bg-stone-50 p-5 rounded-xl border border-stone-100">
                 {CATEGORY_FIELDS[listing.category]
                   .filter(field => listing.customFields![field.name])
                   .map(field => (
                   <div key={field.name} className="flex flex-col">
                     <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">{field.label}</span>
                     <span className="text-base font-semibold text-stone-900">{listing.customFields![field.name]}</span>
                   </div>
                 ))}
               </div>
            )}
            
            <div className="prose prose-stone max-w-none mb-8">
                <h3 className="text-lg font-bold text-stone-900 border-b pb-2 mb-3">Item Description</h3>
                <p className="whitespace-pre-wrap text-stone-700 leading-relaxed text-sm">{listing.description}</p>
            </div>
            
            <div className="mt-auto space-y-6 pt-6 border-t border-stone-200">
               {/* Order Section */}
               {user?.uid !== listing.ownerId && listing.quantity > 0 && (
                 <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 space-y-4">
                    <h3 className="font-bold text-stone-900 flex items-center gap-2">
                       <ShoppingCart className="w-5 h-5" /> Book Your Order
                    </h3>
                    
                    <div className="flex items-center justify-between">
                       <div className="flex items-center gap-3 border bg-white rounded-lg p-1">
                          <button 
                            onClick={() => setQuantity(q => Math.max(1, q - 1))}
                            className="w-8 h-8 flex items-center justify-center font-bold hover:bg-stone-100 rounded"
                          >
                            -
                          </button>
                          <span className="w-8 text-center font-bold text-stone-800">{quantity}</span>
                          <button 
                            onClick={() => setQuantity(q => Math.min(listing.quantity, q + 1))}
                            className="w-8 h-8 flex items-center justify-center font-bold hover:bg-stone-100 rounded"
                          >
                            +
                          </button>
                       </div>
                       <div className="text-right">
                          <p className="text-xs text-stone-500 font-bold uppercase tracking-wider">Total Amount</p>
                          <p className="text-xl font-black text-amber-600">{formatPKR(totalPrice)}</p>
                       </div>
                    </div>

                    <div className="text-[10px] text-stone-500 italic">
                       * Includes {formatPKR(listing.shippingCharges || 0)} shipping charges. Payment via Cash on Delivery.
                    </div>

                    {bookingSuccess ? (
                      <div className="bg-emerald-500 text-white p-3 rounded-xl flex items-center justify-center gap-2 font-bold animate-in zoom-in-95">
                        <CheckCircle className="w-5 h-5" /> Order Booked Successfully!
                      </div>
                    ) : (
                      <>
                        <button 
                          disabled={booking || listing.quantity <= 0}
                          onClick={handleStartBooking}
                          className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white py-4 rounded-xl font-black transition-all shadow-lg flex items-center justify-center gap-2 text-lg active:scale-95"
                        >
                          Book Your Order (COD)
                        </button>

                        {showBookingForm && (
                          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
                            <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 sm:p-8 animate-in zoom-in-95 duration-200">
                               <div className="flex justify-between items-center mb-6">
                                  <h2 className="text-xl font-bold text-stone-900">Delivery Details</h2>
                                  <button onClick={() => setShowBookingForm(false)} className="text-stone-400 hover:text-stone-600">
                                     <X className="w-6 h-6" />
                                  </button>
                               </div>
                               <p className="text-sm text-stone-500 mb-6">Please provide your details for Cash on Delivery (COD).</p>
                               
                               <div className="space-y-4">
                                  <div>
                                     <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Full Name</label>
                                     <input 
                                       type="text" 
                                       value={buyerDetails.name}
                                       onChange={(e) => setBuyerDetails({...buyerDetails, name: e.target.value})}
                                       className="w-full border-stone-200 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                                       placeholder="Your name"
                                     />
                                  </div>
                                  <div>
                                     <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Delivery Address</label>
                                     <textarea 
                                       value={buyerDetails.address}
                                       onChange={(e) => setBuyerDetails({...buyerDetails, address: e.target.value})}
                                       className="w-full border-stone-200 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                                       rows={3}
                                       placeholder="House #, Street, Area, City"
                                     />
                                  </div>
                                  <div>
                                     <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Contact Number</label>
                                     <input 
                                       type="tel" 
                                       value={buyerDetails.contact}
                                       onChange={(e) => setBuyerDetails({...buyerDetails, contact: e.target.value})}
                                       className="w-full border-stone-200 rounded-lg focus:border-amber-500 focus:ring-amber-500"
                                       placeholder="03xx xxxxxxx"
                                     />
                                  </div>

                                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 grid grid-cols-2 gap-4 mt-6">
                                     <div>
                                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Unit Price</p>
                                        <p className="font-bold text-stone-800">{formatPKR(listing.price)}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Quantity</p>
                                        <p className="font-bold text-stone-800">{quantity} Units</p>
                                     </div>
                                     <div>
                                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Shipping</p>
                                        <p className="font-bold text-stone-800">{formatPKR(listing.shippingCharges || 0)}</p>
                                     </div>
                                     <div className="text-right">
                                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Total Amount</p>
                                        <p className="text-xl font-black text-amber-600">{formatPKR(totalPrice)}</p>
                                     </div>
                                  </div>

                                  <button 
                                    onClick={handleBookOrder}
                                    disabled={booking}
                                    className="w-full bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white py-4 rounded-xl font-black transition-all shadow-lg flex items-center justify-center gap-2 text-lg mt-6"
                                  >
                                    {booking ? 'Processing...' : 'Confirm Order'}
                                  </button>
                                  <button onClick={() => setShowBookingForm(false)} className="w-full text-stone-500 font-bold text-sm py-2">
                                     Cancel
                                  </button>
                               </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                 </div>
               )}

               <div className="bg-stone-50 rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
                   <div className="p-6">
                      <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">Seller Information</h3>
                      <div className="flex items-center gap-4 mb-6">
                         <div className="w-16 h-16 bg-white border-2 border-stone-100 rounded-2xl flex items-center justify-center text-stone-300 shadow-sm overflow-hidden shrink-0">
                           {sellerProfile?.photoURL ? (
                             <img src={sellerProfile.photoURL} alt={displaySellerName} className="w-full h-full object-cover" />
                           ) : (
                             <User className="w-8 h-8" />
                           )}
                         </div>
                         <div className="flex-grow">
                            <div className="font-black text-xl text-stone-900 flex items-center gap-2 leading-none mb-1">
                              {displaySellerName}
                              {sellerProfile?.isVerified && (
                                 <ShieldCheck 
                                   className={`w-5 h-5 ${sellerProfile.verifiedBadgeType === 'GOLDEN' ? 'text-amber-500' : sellerProfile.verifiedBadgeType === 'PREMIUM' ? 'text-amber-600' : 'text-blue-500'}`} 
                                   title={`${sellerProfile.verifiedBadgeType || 'BASIC'} Verified Seller`} 
                                 />
                              )}
                            </div>
                            <div className="text-xs font-bold text-stone-500 flex items-center gap-2">
                               <MapPin className="w-3.5 h-3.5" /> {displayCity}
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-6">
                         <div className="bg-white p-3 rounded-xl border border-stone-100 text-center">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Total Listings</p>
                            <p className="font-black text-stone-900">{(sellerProfile as any)?.listingCount || 0}</p>
                         </div>
                         <div className="bg-white p-3 rounded-xl border border-stone-100 text-center">
                            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-1">Seller Status</p>
                            <p className="font-black text-emerald-600 text-xs uppercase tracking-tighter">Active Now</p>
                         </div>
                      </div>

                      <Link 
                        to={`/user/${listing.ownerId}`}
                        className="block w-full text-center py-3 border-2 border-stone-900 text-stone-900 rounded-xl font-black text-sm hover:bg-stone-900 hover:text-white transition-all active:scale-95"
                      >
                         View Full Profile
                      </Link>
                   </div>
                </div>
               
                 <div className="grid grid-cols-2 gap-3">
                  {user?.uid !== listing.ownerId && (
                    <button 
                      onClick={handleStartChat}
                      className="col-span-2 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-stone-900 py-4 rounded-xl font-black transition-all shadow-md mt-2"
                    >
                      <MessageCircle className="w-6 h-6" /> Chat in App
                    </button>
                  )}

                  {user?.uid === listing.ownerId && listing.status !== 'SOLD' && (
                    <div className="col-span-2 space-y-3 mt-2">
                       <Link 
                         to={`/promotions?listingId=${listing.id}&type=FEATURED`}
                         className="flex items-center justify-center gap-2 bg-stone-900 hover:bg-amber-500 hover:text-stone-900 text-white py-4 rounded-xl font-black transition-all shadow-md w-full uppercase italic tracking-tighter"
                       >
                         <Zap className="w-6 h-6" /> Promote This Ad
                       </Link>
                       <div className="text-center">
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-lg border ${listing.promotionStatus === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : listing.promotionStatus === 'PENDING' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-stone-50 text-stone-400 border-stone-100'}`}>
                             Promotion Status: {listing.promotionStatus || 'Not Promoted'}
                          </span>
                       </div>
                    </div>
                  )}
                  
                  <a 
                    href={`tel:${listing.phoneNumber.replace(/[^0-9]/g, '')}`}
                    className="flex items-center justify-center gap-2 bg-stone-100 hover:bg-stone-200 text-stone-700 py-3.5 rounded-xl font-bold transition-all border border-stone-200"
                  >
                    <Phone className="w-5 h-5" /> Call
                  </a>
                  <a 
                    href={`https://wa.me/${listing.phoneNumber.replace(/[^0-9]/g, '')}`}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white py-3.5 rounded-xl font-bold transition-all shadow-sm"
                  >
                    <MessageCircle className="w-5 h-5" /> WhatsApp
                  </a>
               </div>
               
               {user?.uid !== listing.ownerId && (
                 <div className="text-center pt-2">
                    <button onClick={handleReport} className="text-stone-400 hover:text-red-500 text-xs inline-flex items-center gap-1.5 transition-colors font-bold uppercase tracking-widest p-2">
                       <AlertTriangle className="w-3.5 h-3.5" /> Report Advertisement
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      </div>
      
      {slides.length > 0 && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={photoIndex}
          slides={slides}
          plugins={[Zoom]}
          carousel={{ padding: 0 }}
        />
      )}
    </div>
  );
}
