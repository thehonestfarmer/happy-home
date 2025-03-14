import { useAppContext } from "@/AppContext";
import { EXCHANGE_RATES, Currency, CURRENCY_SYMBOLS } from "@/lib/listing-utils";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "usehooks-ts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CurrencySelectorProps {
  variant?: 'toolbar' | 'sidebar';
}

export function CurrencySelector({ variant = 'toolbar' }: CurrencySelectorProps) {
  const { filterState, setFilterState } = useAppContext();
  const isMobile = useMediaQuery("(max-width: 768px)");
  const selectedCurrency = filterState.priceRange.currency || "USD";

  // Format exchange rate display
  const getExchangeRateText = (currency: Currency): string => {
    if (currency === 'JPY') {
      return 'Native currency';
    }
    const rate = EXCHANGE_RATES[currency];
    return `¥${rate.toLocaleString()} = ${CURRENCY_SYMBOLS[currency]}1`;
  };

  const handleCurrencyChange = (currency: Currency) => {
    setFilterState({
      ...filterState,
      priceRange: {
        ...filterState.priceRange,
        currency,
      },
    });
  };

  // Mobile or Sidebar view
  if (isMobile || variant === 'sidebar') {
    return (
      <div className="space-y-2 px-4 py-2">
        <Select
          value={selectedCurrency}
          onValueChange={handleCurrencyChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Currency" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(EXCHANGE_RATES) as Currency[]).map((currency) => (
              <SelectItem key={currency} value={currency}>
                <div className="flex items-center justify-between w-full">
                  <span>{currency}</span>
                  <span className="text-xs text-muted-foreground">
                    {getExchangeRateText(currency)}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Desktop toolbar view
  return (
    <div className="flex items-center gap-2">
      <div className="flex rounded-md overflow-hidden border">
        {(Object.keys(EXCHANGE_RATES) as Currency[]).map((currency) => (
          <button
            key={currency}
            onClick={() => handleCurrencyChange(currency)}
            className={cn(
              "px-2.5 py-1 text-sm font-medium transition-colors",
              selectedCurrency === currency
                ? "bg-primary text-primary-foreground"
                : "bg-background hover:bg-muted"
            )}
          >
            {currency}
          </button>
        ))}
      </div>
      <span className="text-xs text-muted-foreground min-w-[100px]">
        {getExchangeRateText(selectedCurrency)}
      </span>
    </div>
  );
} 