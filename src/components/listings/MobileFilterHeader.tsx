"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, SlidersHorizontal, RotateCcw } from "lucide-react";
import { useAppContext, defaultFilterState } from "@/AppContext";
import { useState, useMemo, useEffect } from "react";
import { ForSaleFilterContent } from "./filters/ForSaleFilter";
import { FavoritesFilterContent } from "./filters/FavoritesFilter";
import { 
  Popover, 
  PopoverContent, 
  PopoverTrigger 
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { BottomDrawer } from "./BottomDrawer";
import { CURRENCY_SYMBOLS, EXCHANGE_RATES, Currency } from "@/lib/listing-utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useListings } from "@/contexts/ListingsContext";
import { getValidFavoritesCount } from "@/lib/favorites-utils";

export function MobileFilterHeader() {
  const { filterState, setFilterState, favorites, user } = useAppContext();
  const { listings } = useListings();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Calculate the valid favorites count
  const validFavoritesCount = useMemo(() => {
    return getValidFavoritesCount(favorites, listings || []);
  }, [favorites, listings]);
  
  // Track filter states
  const showForSale = filterState.showForSale !== false; // Default to true if undefined
  const showSold = filterState.showSold === true; // Default to false if undefined
  const showOnlyFavorites = filterState.showOnlyFavorites;
  const selectedCurrency = filterState.priceRange?.currency || "USD";
  
  // Check if the property filter is in a non-default state
  // Default is both "For Sale" and "Sold" selected
  const isPropertyFilterModified = !(showForSale && showSold);
  
  // Reset favorites filter if user logs out
  useEffect(() => {
    if (!user && showOnlyFavorites) {
      setFilterState({
        ...filterState,
        showOnlyFavorites: false
      });
    }
  }, [user, showOnlyFavorites, filterState, setFilterState]);
  
  // Determine the property filter text based on selected options
  const getPropertyFilterText = () => {
    if (showForSale && showSold) return "All Properties";
    if (showForSale) return "For Sale";
    if (showSold) return "Sold";
    return "None Selected"; // Edge case if both are false
  };
  
  // Determine the favorites filter text
  const getFavoritesFilterText = () => {
    return showOnlyFavorites ? "Favorites" : "All Listings";
  };

  // Format exchange rate display
  const getExchangeRateText = (currency: Currency): string => {
    if (currency === 'JPY') {
      return 'Native currency';
    }
    const rate = EXCHANGE_RATES[currency];
    return `¥${rate.toLocaleString()} = ${CURRENCY_SYMBOLS[currency]}1`;
  };

  // Handle currency change
  const handleCurrencyChange = (currency: Currency) => {
    setFilterState({
      ...filterState,
      priceRange: {
        ...filterState.priceRange,
        currency
      }
    });
  };

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    // Check if any filter is different from default
    const isDefaultForSale = filterState.showForSale === defaultFilterState.showForSale;
    const isDefaultSold = filterState.showSold === defaultFilterState.showSold;
    const isDefaultFavorites = filterState.showOnlyFavorites === defaultFilterState.showOnlyFavorites;
    const isDefaultSeen = filterState.showOnlySeen === defaultFilterState.showOnlySeen;
    const isDefaultPriceMin = filterState.priceRange.min === defaultFilterState.priceRange.min;
    const isDefaultPriceMax = filterState.priceRange.max === defaultFilterState.priceRange.max;
    const isDefaultLDK = filterState.layout.minLDK === defaultFilterState.layout.minLDK;
    const isDefaultSize = 
      filterState.size.minBuildSize === defaultFilterState.size.minBuildSize &&
      filterState.size.maxBuildSize === defaultFilterState.size.maxBuildSize &&
      filterState.size.minLandSize === defaultFilterState.size.minLandSize &&
      filterState.size.maxLandSize === defaultFilterState.size.maxLandSize;
    
    return !(isDefaultForSale && isDefaultSold && isDefaultFavorites && isDefaultSeen && 
             isDefaultPriceMin && isDefaultPriceMax && isDefaultLDK && isDefaultSize);
  }, [filterState]);

  // Function to reset all filters to default
  const handleClearAllFilters = () => {
    setFilterState(defaultFilterState);
  };

  // Get available currencies
  const availableCurrencies = Object.keys(EXCHANGE_RATES) as Currency[];

  return (
    <>
      <div className="bg-white border-b shadow-sm p-2">
        <div className="grid grid-cols-2 gap-2">
          {/* Row 1 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full items-center justify-between",
                  showOnlyFavorites && "bg-primary/10 border-primary/20"
                )}
              >
                {getFavoritesFilterText()}
                {showOnlyFavorites && validFavoritesCount > 0 && (
                  <span className="ml-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                    {validFavoritesCount}
                  </span>
                )}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-4">
              <FavoritesFilterContent />
            </PopoverContent>
          </Popover>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "w-full items-center justify-between",
                  isPropertyFilterModified && "bg-primary/10 border-primary/20"
                )}
              >
                {getPropertyFilterText()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-4">
              <ForSaleFilterContent />
            </PopoverContent>
          </Popover>
          
          {/* Row 2 */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="w-full items-center justify-between"
              >
                {selectedCurrency}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-4">
              <div className="space-y-3">
                <h3 className="text-sm font-medium mb-2">Select Currency</h3>
                <RadioGroup
                  defaultValue={selectedCurrency}
                  onValueChange={(value) => handleCurrencyChange(value as Currency)}
                  className="space-y-2"
                >
                  {availableCurrencies.map((currency) => (
                    <div 
                      key={currency}
                      className={cn(
                        "flex items-center justify-between rounded-md border p-2 transition-colors",
                        selectedCurrency === currency 
                          ? "border-green-500 bg-green-50" 
                          : "hover:bg-gray-50"
                      )}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem 
                          value={currency} 
                          id={`currency-dropdown-${currency}`}
                          className={selectedCurrency === currency ? "text-green-600" : ""}
                        />
                        <Label 
                          htmlFor={`currency-dropdown-${currency}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          {currency}
                        </Label>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {getExchangeRateText(currency)}
                      </span>
                    </div>
                  ))}
                </RadioGroup>
              </div>
            </PopoverContent>
          </Popover>
          
          <Button
            variant="outline"
            className={cn(
              "w-full",
              hasActiveFilters && "bg-primary/10 border-primary/20"
            )}
            onClick={() => setIsDrawerOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                •
              </span>
            )}
          </Button>
          
          {/* Clear All Filters button - only shown when there are active filters */}
          {hasActiveFilters && (
            <div className="col-span-2 mt-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={handleClearAllFilters}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Drawer for Filters */}
      <BottomDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </>
  );
} 