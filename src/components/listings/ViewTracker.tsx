import { useEffect } from 'react';

interface ViewTrackerProps {
  listingId: string;
}

/**
 * Component that tracks when a listing is viewed and adds it to localStorage
 * This component doesn't render anything - it just handles the side effect
 */
export default function ViewTracker({ listingId }: ViewTrackerProps) {
  useEffect(() => {
    if (!listingId || typeof window === 'undefined') return;
    
    try {
      // Get existing viewed listings from localStorage
      let viewedListings: string[] = [];
      const viewedListingsString = localStorage.getItem('viewedListings');
      
      if (viewedListingsString) {
        viewedListings = JSON.parse(viewedListingsString);
        if (!Array.isArray(viewedListings)) viewedListings = [];
      }
      
      // Don't add duplicates
      if (!viewedListings.includes(listingId)) {
        // Add the new listing ID to the array
        viewedListings.push(listingId);
        
        // Limit to most recent 500 listings to prevent localStorage overflow
        if (viewedListings.length > 500) {
          viewedListings = viewedListings.slice(-500);
        }
        
        // Save back to localStorage
        localStorage.setItem('viewedListings', JSON.stringify(viewedListings));
      }
    } catch (e) {
      console.error('Error updating viewed listings in localStorage:', e);
    }
  }, [listingId]);
  
  // This component doesn't render anything
  return null;
} 