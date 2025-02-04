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

export function PriceFilter() {
  const { filterState, setFilterState } = useAppContext();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("JPY");
  const [selectedRangeIndex, setSelectedRangeIndex] = useState<number | null>(null);
  const [localRange, setLocalRange] = useState([0, 100_000_000]);
  const [open, setOpen] = useState(false);

  const priceRanges = getPriceRanges(selectedCurrency);

  // Update price range when currency changes
  const handleCurrencyChange = (newCurrency: Currency) => {
    setSelectedCurrency(newCurrency);
    setFilterState((draft) => {
      draft.priceRange.currency = newCurrency;
      // If we have a selected range index, update the price range to the new currency
      if (selectedRangeIndex !== null) {
        const newRange = getPriceRanges(newCurrency)[selectedRangeIndex];
        draft.priceRange.min = convertCurrency(newRange.min, newCurrency, "USD");
        draft.priceRange.max = newRange.max 
          ? convertCurrency(newRange.max, newCurrency, "USD")
          : null;
      }
    });
  };

  // Handle preset range selection
  const handleRangeSelect = (rangeIndex: number) => {
    const range = priceRanges[rangeIndex];
    setSelectedRangeIndex(rangeIndex);
    setFilterState((draft) => {
      draft.priceRange.min = convertCurrency(range.min, selectedCurrency, "USD");
      draft.priceRange.max = range.max 
        ? convertCurrency(range.max, selectedCurrency, "USD")
        : null;
    });
  };

  const handleReset = () => {
    setFilterState((draft) => {
      draft.priceRange.min = undefined;
      draft.priceRange.max = undefined;
    });
    setSelectedCurrency("JPY");
    setSelectedRangeIndex(null);
    setLocalRange([0, 100_000_000]);
  };

  const getButtonText = () => {
    if (!filterState.priceRange.min && !filterState.priceRange.max) {
      return "Any Price";
    }

    // If we have a selected range index, use its label
    if (selectedRangeIndex !== null) {
      return priceRanges[selectedRangeIndex].label;
    }

    // Otherwise show custom range
    const min = filterState.priceRange.min 
      ? formatPrice(convertCurrency(filterState.priceRange.min, "USD", selectedCurrency), selectedCurrency)
      : '0';
    const max = filterState.priceRange.max 
      ? formatPrice(convertCurrency(filterState.priceRange.max, "USD", selectedCurrency), selectedCurrency)
      : '∞';
    
    return `${min} - ${max}`;
  };

  const hasActiveFilter = filterState.priceRange.min !== null || filterState.priceRange.max !== null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "flex items-center gap-2 min-w-[180px]",
            (hasActiveFilter || open) && "bg-primary/10 border-primary/20"
          )}
        >
          {getButtonText()}
          <ChevronDown className="h-4 w-4 ml-auto flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-4">
        <div className="space-y-6">
          {/* Currency Selection */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <RadioGroup
              value={selectedCurrency}
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
                setSelectedRangeIndex(null);
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
                  selectedRangeIndex === index && "bg-primary/10 text-primary"
                )}
                onClick={() => handleRangeSelect(index)}
              >
                {range.label}
              </Button>
            ))}
          </div>

          {/* Custom Range Slider - Feature Flagged */}
          {FeatureFlags.showCustomPriceRange && (
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Custom Range</span>
                <span className="text-sm text-right">
                  {formatPrice(localRange[0], selectedCurrency)}
                  <br />
                  {formatPrice(localRange[1], selectedCurrency)}
                </span>
              </div>
              <Slider
                min={0}
                max={convertCurrency(100_000_000, "JPY", selectedCurrency)}
                step={convertCurrency(1_000_000, "JPY", selectedCurrency)}
                value={localRange}
                onValueChange={setLocalRange}
                onValueCommit={(value) =>
                  setFilterState((draft) => {
                    draft.priceRange.min = convertCurrency(value[0], selectedCurrency, "USD");
                    draft.priceRange.max = convertCurrency(value[1], selectedCurrency, "USD");
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
      </PopoverContent>
    </Popover>
  );
} 