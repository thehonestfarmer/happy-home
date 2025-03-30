import { ForSaleFilter } from "./filters/ForSaleFilter";
import { PriceFilter } from "./filters/PriceFilter";
import { LDKFilter } from "./filters/LDKFilter";
import { SortSelect } from "./filters/SortSelect";
import { CurrencySelector } from "./filters/CurrencySelector";
import { FavoritesFilter } from "./filters/FavoritesFilter";

export function ListingsToolbar() {
  return (
    <div className="sticky top-4 z-10 hidden lg:block">
      <div className="flex items-center gap-2 p-2 bg-white border-b shadow-sm">
        <FavoritesFilter />
        <div className="h-6 w-px bg-border" />
        <ForSaleFilter />
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          <CurrencySelector variant="toolbar" />
          <PriceFilter />
        </div>
        <div className="h-6 w-px bg-border" />
        <LDKFilter />
        <div className="flex-1" />
        <SortSelect />
      </div>
    </div>
  );
} 