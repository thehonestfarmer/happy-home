import { useAppContext } from "@/AppContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { useState, useEffect } from "react";
import { 
  EXCHANGE_RATES, 
  Currency, 
  convertCurrency,
  formatPrice,
} from "@/lib/listing-utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { FeatureFlags } from "@/lib/featureFlags";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMediaQuery } from "usehooks-ts";

// Dynamic price ranges based on currency
const getPriceRanges = (currency: Currency) => {
  const baseRanges = {
    JPY: [
      { min: 0, max: 15_000_000, label: "Under ¥15M" },
      { min: 15_000_000, max: 30_000_000, label: "¥15M-¥30M" },
      { min: 30_000_000, max: 45_000_000, label: "¥30M-¥45M" },
      { min: 45_000_000, max: 75_000_000, label: "¥45M-¥75M" },
      { min: 75_000_000, max: null, label: "¥75M+" },
    ],
    USD: [
      { min: 0, max: 50_000, label: "Under $50K" },
      { min: 50_000, max: 100_000, label: "$50K-$100K" },
      { min: 100_000, max: 150_000, label: "$100K-$150K" },
      { min: 150_000, max: 200_000, label: "$150K-$200K" },
      { min: 200_000, max: 250_000, label: "$200K-$250K" },
      { min: 250_000, max: 300_000, label: "$250K-$300K" },
      { min: 300_000, max: null, label: "$300K+" },
    ],
    AUD: [
      { min: 0, max: 50_000, label: "Under A$50K" },
      { min: 50_000, max: 100_000, label: "A$50K-$100K" },
      { min: 100_000, max: 150_000, label: "A$100K-$150K" },
      { min: 150_000, max: 200_000, label: "A$150K-$200K" },
      { min: 200_000, max: 250_000, label: "A$200K-$250K" },
      { min: 250_000, max: 300_000, label: "A$250K-$300K" },
      { min: 300_000, max: null, label: "A$300K+" },
    ],
    EUR: [
      { min: 0, max: 50_000, label: "Under €50K" },
      { min: 50_000, max: 100_000, label: "€50K-€100K" },
      { min: 100_000, max: 150_000, label: "€100K-€150K" },
      { min: 150_000, max: 200_000, label: "€150K-€200K" },
      { min: 200_000, max: 250_000, label: "€200K-€250K" },
      { min: 250_000, max: null, label: "€250K+" },
    ],
  };

  return baseRanges[currency];
};

export function PriceFilterContent() {
  const { filterState, setFilterState, priceFilterState, setPriceFilterState } = useAppContext();
  const isMobile = useMediaQuery("(max-width: 768px)");

  const handleCurrencyChange = (newCurrency: Currency) => {
    setPriceFilterState((draft) => {
      draft.selectedCurrency = newCurrency;
    });
    setFilterState((draft) => {
      draft.priceRange.currency = newCurrency;
      if (priceFilterState.selectedRangeIndex !== null) {
        const newRange = getPriceRanges(newCurrency)[priceFilterState.selectedRangeIndex];
        draft.priceRange.min = convertCurrency(newRange.min, newCurrency, "USD");
        draft.priceRange.max = newRange.max 
          ? convertCurrency(newRange.max, newCurrency, "USD")
          : null;
      }
    });
  };

  const handleRangeSelect = (rangeIndex: number) => {
    const range = getPriceRanges(priceFilterState.selectedCurrency)[rangeIndex];
    setPriceFilterState((draft) => {
      draft.selectedRangeIndex = rangeIndex;
    });
    setFilterState((draft) => {
      draft.priceRange.min = convertCurrency(range.min, priceFilterState.selectedCurrency, "USD");
      draft.priceRange.max = range.max 
        ? convertCurrency(range.max, priceFilterState.selectedCurrency, "USD")
        : null;
    });
  };

  const handleReset = () => {
    setFilterState((draft) => {
      draft.priceRange.min = undefined;
      draft.priceRange.max = undefined;
    });
    setPriceFilterState((draft) => {
      draft.selectedCurrency = "JPY";
      draft.selectedRangeIndex = null;
      draft.localRange = [0, 100_000_000];
    });
  };

  const priceRanges = getPriceRanges(priceFilterState.selectedCurrency);

  return (
    <div className="space-y-6">
      {/* Currency Selection */}
      <div className="space-y-2">
        <Label>Currency</Label>
        {isMobile ? (
          <Select
            value={priceFilterState.selectedCurrency}
            onValueChange={handleCurrencyChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Currency" />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(EXCHANGE_RATES).map((currency) => (
                <SelectItem key={currency} value={currency}>
                  {currency}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <RadioGroup
            value={priceFilterState.selectedCurrency}
            onValueChange={handleCurrencyChange}
            className="flex gap-4"
          >
            {Object.keys(EXCHANGE_RATES).map((currency) => (
              <div key={currency} className="flex items-center space-x-2">
                <RadioGroupItem value={currency} id={currency} />
                <Label htmlFor={currency}>{currency}</Label>
              </div>
            ))}
          </RadioGroup>
        )}
      </div>

      {/* Preset Ranges */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start font-normal",
            filterState.priceRange.min === undefined && "bg-primary/10 text-primary"
          )}
          onClick={() => {
            setPriceFilterState((draft) => {
              draft.selectedRangeIndex = null;
            });
            setFilterState((draft) => {
              draft.priceRange.min = undefined;
              draft.priceRange.max = undefined;
            });
          }}
        >
          Any Price
        </Button>
        {priceRanges.map((range, index) => (
          <Button
            key={range.label}
            variant="ghost"
            className={cn(
              "w-full justify-start font-normal",
              priceFilterState.selectedRangeIndex === index && "bg-primary/10 text-primary"
            )}
            onClick={() => handleRangeSelect(index)}
          >
            {range.label}
          </Button>
        ))}
      </div>

      {/* Custom Range Slider */}
      {FeatureFlags.showCustomPriceRange && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <span>Custom Range</span>
            <span className="text-sm text-right">
              {formatPrice(priceFilterState.localRange[0], priceFilterState.selectedCurrency)}
              <br />
              {formatPrice(priceFilterState.localRange[1], priceFilterState.selectedCurrency)}
            </span>
          </div>
          <Slider
            min={0}
            max={convertCurrency(100_000_000, "JPY", priceFilterState.selectedCurrency)}
            step={convertCurrency(1_000_000, "JPY", priceFilterState.selectedCurrency)}
            value={priceFilterState.localRange}
            onValueChange={(value) => 
              setPriceFilterState((draft) => {
                draft.localRange = value;
              })
            }
            onValueCommit={(value) =>
              setFilterState((draft) => {
                draft.priceRange.min = convertCurrency(value[0], priceFilterState.selectedCurrency, "USD");
                draft.priceRange.max = convertCurrency(value[1], priceFilterState.selectedCurrency, "USD");
              })
            }
          />
        </div>
      )}

      {/* Reset Button */}
      <div className="pt-2 border-t">
        <Button
          variant="ghost"
          className="w-full text-muted-foreground hover:text-foreground"
          onClick={handleReset}
        >
          Reset Filter
        </Button>
      </div>
    </div>
  );
}

export function PriceFilter() {
  const { filterState, priceFilterState } = useAppContext();

  const getButtonText = () => {
    if (!filterState.priceRange.min && !filterState.priceRange.max) {
      return "Any Price";
    }

    // If we have a selected range index, use its label
    if (priceFilterState.selectedRangeIndex !== null) {
      const priceRanges = getPriceRanges(priceFilterState.selectedCurrency);
      return priceRanges[priceFilterState.selectedRangeIndex].label;
    }

    // Otherwise show custom range
    const min = filterState.priceRange.min 
      ? formatPrice(convertCurrency(filterState.priceRange.min, "USD", priceFilterState.selectedCurrency), priceFilterState.selectedCurrency)
      : '0';
    const max = filterState.priceRange.max 
      ? formatPrice(convertCurrency(filterState.priceRange.max, "USD", priceFilterState.selectedCurrency), priceFilterState.selectedCurrency)
      : '∞';
    
    return `${min} - ${max}`;
  };

  const hasActiveFilter = filterState.priceRange.min !== null || filterState.priceRange.max !== null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "flex items-center gap-2 min-w-[180px]",
            hasActiveFilter && "bg-primary/10 border-primary/20"
          )}
        >
          {getButtonText()}
          <ChevronDown className="h-4 w-4 ml-auto flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-4">
        <PriceFilterContent />
      </PopoverContent>
    </Popover>
  );
} 