import React, { useEffect, useState, useMemo } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Listing } from '../types';
import { ListingCard } from '../components/ListingCard';
import { useSearchParams } from 'react-router-dom';
import { CATEGORIES, CATEGORIES_WITH_SUBCATEGORIES } from '../lib/categories';
import { Search } from 'lucide-react';

export function Listings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const filterCat = searchParams.get('category') || '';
  const filterSubcat = searchParams.get('subcategory') || '';
  const filterCondition = searchParams.get('condition') || '';
  const filterKeyword = searchParams.get('q') || '';
  const filterMinPrice = searchParams.get('minPrice') || '';
  const filterMaxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sort') || 'newest';
  const filterPromoted = searchParams.get('filter') || ''; // 'featured' or 'boosted'

  const subcategoriesForCat = filterCat ? (CATEGORIES_WITH_SUBCATEGORIES[filterCat] || []) : [];

  const [localKeyword, setLocalKeyword] = useState(filterKeyword);
  const [localMin, setLocalMin] = useState(filterMinPrice);
  const [localMax, setLocalMax] = useState(filterMaxPrice);

  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        let q = query(
          collection(db, 'listings'),
          where('status', 'in', ['APPROVED', 'LIVE', 'SOLD']) 
        );

        const snapshot = await getDocs(q);
        let docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Listing));
        
        setListings(docs);
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'listings');
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  const filteredListings = useMemo(() => {
    let result = listings.filter(d => {
      // Handle status
      const isApproved = d.status === 'APPROVED' || d.status === 'LIVE';
      const isSold = d.status === 'COMPLETED' || d.status === 'SOLD';

      if (filterCat === 'Sold Out') {
        if (!isSold) return false;
      } else {
        if (!isApproved) return false;
        if (filterCat && d.category !== filterCat) return false;
      }

      if (filterPromoted === 'featured' && !d.isFeatured) return false;
      if (filterPromoted === 'boosted' && !d.isBoosted) return false;
      
      if (filterSubcat && d.subcategory !== filterSubcat) return false;
      if (filterCondition && d.condition !== filterCondition) return false;
      if (filterMinPrice && d.price < Number(filterMinPrice)) return false;
      if (filterMaxPrice && d.price > Number(filterMaxPrice)) return false;
      if (filterKeyword) {
        const query = filterKeyword.toLowerCase();
        const textToSearch = `${d.title} ${d.description} ${d.category} ${d.subcategory || ''}`.toLowerCase();
        if (!textToSearch.includes(query)) return false;
      }
      return true;
    });

    // Sorting with Promotion Prioritization
    result.sort((a, b) => {
      // 1. Featured items come first
      if (a.isFeatured && !b.isFeatured) return -1;
      if (!a.isFeatured && b.isFeatured) return 1;

      // 2. Boosted items come second
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;

      // 3. User selected sort
      if (sortBy === 'price_low') return a.price - b.price;
      if (sortBy === 'price_high') return b.price - a.price;
      
      // Default newest
      const timeA = a.createdAt?.toMillis?.() || (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
      const timeB = b.createdAt?.toMillis?.() || (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
      return timeB - timeA;
    });

    return result;
  }, [listings, filterCat, filterSubcat, filterCondition, filterMinPrice, filterMaxPrice, filterKeyword, sortBy, filterPromoted]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (localKeyword) params.set('q', localKeyword);
    else params.delete('q');
    if (localMin) params.set('minPrice', localMin);
    else params.delete('minPrice');
    if (localMax) params.set('maxPrice', localMax);
    else params.delete('maxPrice');
    setSearchParams(params);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-stone-900 mb-8">
        {filterCat === 'Sold Out' ? 'Sold Out Listings' 
          : filterCat ? `${filterCat}` 
          : 'Explore All Listings'}
      </h1>
      
      {/* Search Bar */}
      <form onSubmit={handleSearchSubmit} className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-stone-300 rounded-md leading-5 bg-white placeholder-stone-500 focus:outline-none focus:ring-amber-500 focus:border-amber-500 sm:text-sm"
            placeholder="Search for items, categories..."
            value={localKeyword}
            onChange={(e) => setLocalKeyword(e.target.value)}
          />
        </div>
        <div className="flex gap-2 min-w-[200px]">
          <input 
            type="number" 
            placeholder="Min Rs" 
            className="w-full py-2 px-3 border border-stone-300 rounded-md text-sm"
            value={localMin}
            onChange={(e) => setLocalMin(e.target.value)}
          />
          <input 
            type="number" 
            placeholder="Max Rs" 
            className="w-full py-2 px-3 border border-stone-300 rounded-md text-sm"
            value={localMax}
            onChange={(e) => setLocalMax(e.target.value)}
          />
        </div>
        <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-stone-900 font-bold py-2 px-6 rounded-md shadow-sm transition-colors whitespace-nowrap">
          Search
        </button>
      </form>

      {/* Filters (Basic client side / query params) */}
      <div className="flex flex-wrap gap-4 mb-8 pb-4 border-b">
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Category</label>
          <select 
            value={filterCat} 
            onChange={(e) => {
              const params = new URLSearchParams(searchParams);
              if (e.target.value) params.set('category', e.target.value);
              else params.delete('category');
              params.delete('subcategory');
              setSearchParams(params);
            }}
            className="border-stone-300 rounded shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm p-2 border bg-white"
          >
            <option value="">All Categories</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
            <option value="Sold Out">Sold Out</option>
          </select>
        </div>

        {subcategoriesForCat.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Subcategory</label>
            <select 
              value={filterSubcat} 
              onChange={(e) => {
                const params = new URLSearchParams(searchParams);
                if (e.target.value) params.set('subcategory', e.target.value);
                else params.delete('subcategory');
                setSearchParams(params);
              }}
              className="border-stone-300 rounded shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm p-2 border bg-white"
            >
              <option value="">All Subcategories</option>
              {subcategoriesForCat.map(sub => (
                <option key={sub} value={sub}>{sub}</option>
              ))}
            </select>
          </div>
        )}

        <div>
           <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Condition</label>
          <select 
            value={filterCondition} 
            onChange={(e) => {
              const params = new URLSearchParams(searchParams);
              if (e.target.value) params.set('condition', e.target.value);
              else params.delete('condition');
              setSearchParams(params);
            }}
            className="border-stone-300 rounded shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm p-2 border bg-white"
          >
            <option value="">Any Condition</option>
            <option value="New">New</option>
            <option value="Used">Used</option>
            <option value="Not Applicable">Not Applicable</option>
          </select>
        </div>

        <div>
           <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Sort By</label>
          <select 
            value={sortBy} 
            onChange={(e) => {
              const params = new URLSearchParams(searchParams);
              if (e.target.value) params.set('sort', e.target.value);
              else params.delete('sort');
              setSearchParams(params);
            }}
            className="border-stone-300 rounded shadow-sm focus:border-amber-500 focus:ring-amber-500 text-sm p-2 border bg-white"
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-stone-500">Loading...</div>
      ) : filteredListings.length === 0 ? (
        <div className="py-20 text-center text-stone-500">No listings found matching your criteria.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredListings.map(listing => <ListingCard key={listing.id} listing={listing} />)}
        </div>
      )}
    </div>
  );
}
