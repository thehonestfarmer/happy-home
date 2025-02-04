import { ListingsGrid } from "@/components/listings/ListingsGrid";
import { MapPlaceholder } from "@/components/map/MapPlaceholder";
import { FeatureFlags } from "@/lib/featureFlags";

export default function HomePage() {
  return (
    <main className="h-[calc(100vh-64px)] flex flex-col lg:flex-row">
      {/* Listings section - takes full width when map is disabled */}
      <div className={`${FeatureFlags.showMap ? 'lg:w-7/12 lg:max-w-[960px]' : 'w-full'}`}>
        <ListingsGrid />
      </div>
      
      {/* Map section - only shown when feature flag is enabled */}
      {FeatureFlags.showMap && (
        <div className="hidden lg:block lg:w-5/12 lg:flex-1">
          <MapPlaceholder />
        </div>
      )}
    </main>
  );
}
