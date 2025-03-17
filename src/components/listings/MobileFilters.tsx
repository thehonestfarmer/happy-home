import { ForSaleFilterContent } from "./filters/ForSaleFilter";
import { PriceFilterContent } from "./filters/PriceFilter";
import { LDKFilterContent } from "./filters/LDKFilter";
import { CurrencySelector } from "./filters/CurrencySelector";

export function MobileFilters() {
  return (
    <div className="space-y-4">
      <div className="border-b pb-4">
        <h3 className="font-medium mb-2 px-4">Listing Type</h3>
        <ForSaleFilterContent />
      </div>
      
      <div className="space-y-4 border-b pb-4">
        <div>
          <h3 className="font-medium mb-2 px-4">Currency</h3>
          <CurrencySelector variant="sidebar" />
        </div>
        <div>
          <h3 className="font-medium mb-2 px-4">Price Range</h3>
          <PriceFilterContent />
        </div>
      </div>

      <div className="border-b pb-4">
        <h3 className="font-medium mb-2 px-4">Layout</h3>
        <LDKFilterContent />
      </div>
    </div>
  );
} 