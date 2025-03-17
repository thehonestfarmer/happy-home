import { useAppContext, FilterState } from "@/AppContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ForSaleFilterContent() {
  const { filterState, setFilterState } = useAppContext();
  
  // Track both states explicitly
  const showForSale = filterState.showForSale !== false; // Default to true if undefined
  const showSold = filterState.showSold === true; // Default to false if undefined
  
  // Update ForSale state
  const updateForSaleState = (checked: boolean) => {
    // Create updated filter state
    const updatedState: FilterState = {
      ...filterState,
      showForSale: !!checked
    };
    setFilterState(updatedState);
  };
  
  // Update Sold state
  const updateSoldState = (checked: boolean) => {
    // Create updated filter state
    const updatedState: FilterState = {
      ...filterState,
      showSold: !!checked
    };
    setFilterState(updatedState);
  };
  
  return (
    <div className="flex flex-col space-y-3">
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="for-sale" 
          checked={showForSale}
          onCheckedChange={updateForSaleState}
        />
        <Label htmlFor="for-sale">For Sale</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Checkbox 
          id="sold" 
          checked={showSold}
          onCheckedChange={updateSoldState}
        />
        <Label htmlFor="sold">Sold</Label>
      </div>
    </div>
  );
}

export function ForSaleFilter() {
  const { filterState } = useAppContext();
  
  // Track both states explicitly
  const showForSale = filterState.showForSale !== false; // Default to true if undefined
  const showSold = filterState.showSold === true; // Default to false if undefined
  
  // Determine the button text based on selected options
  const getFilterText = () => {
    if (showForSale && showSold) return "All Properties";
    if (showForSale) return "For Sale";
    if (showSold) return "Sold";
    return "None Selected"; // Edge case if both are false
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "flex items-center gap-2",
            (showSold || !showForSale) && "bg-primary/10 border-primary/20"
          )}
        >
          {getFilterText()}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <ForSaleFilterContent />
      </PopoverContent>
    </Popover>
  );
} 