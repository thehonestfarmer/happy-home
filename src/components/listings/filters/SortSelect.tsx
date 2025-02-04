import { useAppContext } from "@/AppContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown } from "lucide-react";

const sortOptions = [
  // { value: 'recommended', label: 'Recommended' },
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price (low to high)' },
  { value: 'price-desc', label: 'Price (high to low)' },
  // { value: 'sqft', label: 'Square feet' },
  // { value: 'lot-size', label: 'Lot size' },
  // { value: 'price-sqft', label: 'Price/sq. ft.' },
] as const;

export function SortSelect() {
  const { displayState, setDisplayState } = useAppContext();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>

        <Button variant="outline" className="w-[200px] justify-between">
          Sort by {sortOptions.find(opt => opt.value === displayState.sortBy)?.label}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {sortOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => {
              setDisplayState(draft => {
                draft.sortBy = option.value;
              });
            }}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 