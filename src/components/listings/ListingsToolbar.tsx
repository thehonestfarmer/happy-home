import { ForSaleFilter } from "./filters/ForSaleFilter";
import { PriceFilter } from "./filters/PriceFilter";
import { LDKFilter } from "./filters/LDKFilter";

export function ListingsToolbar() {
  return (
    <div className="sticky top-4 z-10 hidden lg:block">
      <div className="flex items-center gap-2 p-2 bg-white border-b shadow-sm">
        <ForSaleFilter />
        <PriceFilter />
        <LDKFilter />
        {/* <Button variant="outline">Home Type</Button> */}
        {/* <Button variant="outline">All Filters</Button> */}
      </div>
    </div>
  );
} 