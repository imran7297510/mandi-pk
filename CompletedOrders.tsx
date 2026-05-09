import { useEffect, useState } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing } from '../types';
import { ListingCard } from '../components/ListingCard';

export function CompletedOrders() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      try {
        const q = query(
          collection(db, 'listings'),
          where('status', '==', 'COMPLETED'),
          orderBy('updatedAt', 'desc')
        );

        const snapshot = await getDocs(q);
        setListings(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Listing)));
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'listings');
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-stone-900 mb-2">Sold out</h1>
      <p className="text-stone-500 mb-8">Treasures that have successfully found new owners.</p>
      
      {loading ? (
        <div className="py-20 text-center text-stone-500">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="py-20 text-center text-stone-500">No sold out items to show yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 opacity-70">
          {listings.map(listing => (
            <div key={listing.id} className="relative">
               <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <div className="bg-red-600 text-white font-bold tracking-widest px-4 py-2 border-2 border-red-600 transform -rotate-12 rounded backdrop-blur-sm">
                    SOLD
                  </div>
               </div>
               <ListingCard listing={listing} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
