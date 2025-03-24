import { useAppContext, SortOption } from "@/AppContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Clock, TrendingDown, TrendingUp } from "lucide-react";

const sortOptions = [
  // { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest', icon: Clock },
  { value: 'price-asc', label: 'Price: Low to High', icon: TrendingUp },
  { value: 'price-desc', label: 'Price: High to Low', icon: TrendingDown },
  // { value: 'sqft', label: 'Square feet' },
  // { value: 'lot-size', label: 'Lot size' },
  // { value: 'price-sqft', label: 'Price/sq. ft.' },
] as const;

export function SortSelect() {
  const { displayState, setDisplayState } = useAppContext();
  const selectedOption = sortOptions.find(opt => opt.value === displayState.sortBy) || sortOptions[0];
  const Icon = selectedOption.icon;

  // Helper function with properly typed callback
  const updateSortBy = (newSortValue: typeof sortOptions[number]['value']) => {
    // @ts-expect-error - The AppContext defines setDisplayState incorrectly for useImmer
    setDisplayState(draft => {
      draft.sortBy = newSortValue as SortOption;
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="justify-between space-x-1">
          <Icon className="h-4 w-4" />
          <span className="hidden sm:inline">Sort</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortOptions.map((option) => {
          const OptionIcon = option.icon;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => updateSortBy(option.value)}
              className="flex items-center space-x-2"
            >
              <OptionIcon className="h-4 w-4" />
              <span>{option.label}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 