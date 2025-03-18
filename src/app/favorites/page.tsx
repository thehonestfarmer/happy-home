"use client";

import { useAppContext } from "@/AppContext";
import { useListings } from "@/contexts/ListingsContext";
import { ListingBox } from "@/components/listings/ListingBox";
import { Heart } from "lucide-react";
import { FeatureFlags } from "@/lib/featureFlags";

export default function FavoritesPage() {
  const { favorites } = useAppContext();
  const { listingsById } = useListings();
  const { displayState, setDisplayState } = useAppContext();
  
  const favoriteListings = favorites
    .map(id => listingsById[id])
    .filter(Boolean);

  const handleLightboxOpen = (idx: number, sIdx: number) => {
    setDisplayState((draft) => {
      draft.lightboxListingIdx = [idx, sIdx];
    });
  };

  const EmptyState = () => (
    <div className="grid place-items-center min-h-[50vh]">
      <div className="flex flex-col items-center justify-center text-center gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          <Heart className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold">No favorites yet</h1>
        <p className="text-muted-foreground max-w-md">
          Start saving your favorite homes by tapping the heart icon on any listing. 
          We'll keep them all here for you to revisit!
        </p>
      </div>
    </div>
  );
  console.log(favoriteListings);

  return (
    <main className="h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      <div className={`${FeatureFlags.showMap ? 'lg:w-7/12 lg:max-w-[960px]' : 'w-full'}`}>
        <div className="h-full overflow-y-auto">
          <div className="p-4">
            <h1 className="text-2xl font-semibold mb-6">Your Favorites</h1>
            {favoriteListings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {favoriteListings.map((property) => (
                  <ListingBox 
                    key={property.id} 
                    property={property}
                    handleLightboxOpen={handleLightboxOpen}
                  />
                ))}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </div>
      </div>
      
      {FeatureFlags.showMap && (
        <div className="hidden lg:block lg:w-5/12 lg:flex-1">
          <div className="h-full bg-muted" />
        </div>
      )}
    </main>
  );
} 