import { ForSaleFilter } from "./filters/ForSaleFilter";
import { PriceFilter } from "./filters/PriceFilter";
import { LDKFilter } from "./filters/LDKFilter";

export function MobileFilters() {
  return (
    <div className="space-y-6 p-4">
      
      {/* Filter Sections */}
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-medium mb-3">Listing Status</h3>
          <div className="space-y-2">
            <ForSaleFilter />
          </div>
        </section>
        
        <section>
          <h3 className="text-sm font-medium mb-3">Price Range</h3>
          <div className="space-y-2">
            <PriceFilter />
          </div>
        </section>
        
        <section>
          <h3 className="text-sm font-medium mb-3">Layout</h3>
          <div className="space-y-2">
            <LDKFilter />
          </div>
        </section>
      </div>
    </div>
  );
} 