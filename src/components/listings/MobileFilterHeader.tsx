"use client";

import { Button } from "@/components/ui/button";
import { ChevronDown, SlidersHorizontal, DollarSign } from "lucide-react";
import { useAppContext } from "@/AppContext";
import { useState } from "react";
import { ForSaleFilterContent } from "./filters/ForSaleFilter";
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

export function MobileFilterHeader() {
  const { filterState, setFilterState } = useAppContext();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  // Track filter states
  const showForSale = filterState.showForSale !== false; // Default to true if undefined
  const showSold = filterState.showSold === true; // Default to false if undefined
  const selectedCurrency = filterState.priceRange?.currency || "USD";
  
  // Determine the button text based on selected options
  const getFilterText = () => {
    if (showForSale && showSold) return "All Properties";
    if (showForSale) return "For Sale";
    if (showSold) return "Sold";
    return "None Selected"; // Edge case if both are false
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

  // Get available currencies
  const availableCurrencies = Object.keys(EXCHANGE_RATES) as Currency[];

  return (
    <>
      <div className="bg-white border-b shadow-sm p-2">
        <div className="flex gap-2 justify-between items-center">
          {/* For Sale/Sold Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className={cn(
                  "flex-1 items-center justify-between",
                  (showSold || !showForSale) && "bg-primary/10 border-primary/20"
                )}
              >
                {getFilterText()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-4">
              <ForSaleFilterContent />
            </PopoverContent>
          </Popover>
          
          {/* Currency Selector */}
          <Popover>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                className="flex-1 items-center justify-between"
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
          
          {/* Filters Button - Opens Bottom Drawer */}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIsDrawerOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            Filters
          </Button>
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