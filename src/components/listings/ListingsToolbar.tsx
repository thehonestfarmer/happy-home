import { ForSaleFilter } from "./filters/ForSaleFilter";
import { PriceFilter } from "./filters/PriceFilter";
import { LDKFilter } from "./filters/LDKFilter";
import { SortSelect } from "./filters/SortSelect";
import { CurrencySelector } from "./filters/CurrencySelector";
import { FavoritesFilter } from "./filters/FavoritesFilter";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useAppContext, defaultFilterState } from "@/AppContext";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function ListingsToolbar() {
  const { filterState, setFilterState } = useAppContext();
  
  // Check if any filters are active (non-default)
  const hasActiveFilters = useMemo(() => {
    // Check if any filter is different from default
    const isDefaultForSale = filterState.showForSale === defaultFilterState.showForSale;
    const isDefaultSold = filterState.showSold === defaultFilterState.showSold;
    const isDefaultFavorites = filterState.showOnlyFavorites === defaultFilterState.showOnlyFavorites;
    const isDefaultSeen = filterState.showOnlySeen === defaultFilterState.showOnlySeen;
    const isDefaultPriceMin = filterState.priceRange.min === defaultFilterState.priceRange.min;
    const isDefaultPriceMax = filterState.priceRange.max === defaultFilterState.priceRange.max;
    const isDefaultLDK = filterState.layout.minLDK === defaultFilterState.layout.minLDK;
    const isDefaultSizeMin = filterState.size.minBuildSize === defaultFilterState.size.minBuildSize;
    const isDefaultSizeMax = filterState.size.maxBuildSize === defaultFilterState.size.maxBuildSize;
    
    return !(isDefaultForSale && isDefaultSold && isDefaultFavorites && isDefaultSeen && 
            isDefaultPriceMin && isDefaultPriceMax && isDefaultLDK && 
            isDefaultSizeMin && isDefaultSizeMax);
  }, [filterState]);
  
  // Function to reset all filters to default
  const handleClearAllFilters = () => {
    setFilterState(defaultFilterState);
  };
  
  return (
    <div className="sticky top-4 z-10 hidden lg:block">
      <div className="p-3 bg-white border shadow-sm rounded-md">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid grid-cols-2 gap-2">
            <FavoritesFilter />
            <ForSaleFilter />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="w-full flex">
              <CurrencySelector variant="toolbar" />
            </div>
            <PriceFilter />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <LDKFilter />
            <SortSelect />
          </div>
          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "text-muted-foreground",
                !hasActiveFilters && "opacity-50 cursor-not-allowed"
              )}
              onClick={hasActiveFilters ? handleClearAllFilters : undefined}
              disabled={!hasActiveFilters}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Clear All Filters
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
} 