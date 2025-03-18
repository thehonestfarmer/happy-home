import { ListingsGrid } from "@/components/listings/ListingsGrid";
import { MapPlaceholder } from "@/components/map/MapPlaceholder";
import { FeatureFlags } from "@/lib/featureFlags";
import { MobileFilterHeader } from "@/components/listings/MobileFilterHeader";
import Header from "../header";

export default function ListingsPage() {
  return (
    <div className="flex flex-col min-h-screen">
        
      {/* Main content */}
      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Mobile Filter Header - only visible on mobile and explicitly sticky */}
        <div className="lg:hidden sticky top-0 z-30">
          <MobileFilterHeader />
        </div>

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
    </div>
  );
} 