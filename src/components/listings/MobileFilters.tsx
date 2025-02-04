import { ForSaleFilterContent } from "./filters/ForSaleFilter";
import { PriceFilterContent } from "./filters/PriceFilter";
import { LDKFilterContent } from "./filters/LDKFilter";

export function MobileFilters() {
  return (
    <div className="space-y-6 p-4">
      
      {/* Filter Sections */}
      <div className="space-y-6">
        <section>
          <h3 className="text-sm font-medium mb-3">Listing Status</h3>
          <div className="p-4 border rounded-lg">
            <ForSaleFilterContent />
          </div>
        </section>
        
        <section>
          <h3 className="text-sm font-medium mb-3">Price Range</h3>
          <div className="p-4 border rounded-lg">
            <PriceFilterContent />
          </div>
        </section>
        
        <section>
          <h3 className="text-sm font-medium mb-3">Layout</h3>
          <div className="p-4 border rounded-lg">
            <LDKFilterContent />
          </div>
        </section>
      </div>
    </div>
  );
} 