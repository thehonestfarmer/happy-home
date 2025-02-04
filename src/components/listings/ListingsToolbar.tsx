import { ForSaleFilter } from "./filters/ForSaleFilter";
import { PriceFilter } from "./filters/PriceFilter";
import { LDKFilter } from "./filters/LDKFilter";
import { SortSelect } from "./filters/SortSelect";

export function ListingsToolbar() {
  return (
    <div className="sticky top-4 z-10 hidden lg:block">
      <div className="flex items-center gap-2 p-2 bg-white border-b shadow-sm">
        <ForSaleFilter />
        <PriceFilter />
        <LDKFilter />
        <div className="flex-1" />
        <SortSelect />
      </div>
    </div>
  );
} 