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
import { useEffect } from "react";

export function ForSaleFilterContent() {
  const { filterState, setFilterState } = useAppContext();
  
  // Track both states, ensuring we handle undefined/null values correctly
  // Default showForSale to true if it's not explicitly false
  const showForSale = filterState.showForSale !== false;
  // Default showSold to false if not explicitly true
  const showSold = filterState.showSold === true;
  
  // Update ForSale state
  const updateForSaleState = (checked: boolean) => {
    console.log('[ForSaleFilter] Updating ForSale state to:', checked);
    // Create a deep copy to ensure all properties are maintained
    const newFilterState: FilterState = JSON.parse(JSON.stringify(filterState));
    // Update the specific property
    newFilterState.showForSale = checked;
    
    // Pass the new state object directly to setFilterState
    setFilterState(newFilterState);
  };
  
  // Update Sold state
  const updateSoldState = (checked: boolean) => {
    console.log('[ForSaleFilter] Updating Sold state to:', checked);
    // Create a deep copy to ensure all properties are maintained
    const newFilterState: FilterState = JSON.parse(JSON.stringify(filterState));
    // Update the specific property
    newFilterState.showSold = checked;
    
    console.log('[ForSaleFilter] New filter state will be:', newFilterState);
    // Pass the new state object directly to setFilterState
    setFilterState(newFilterState);
  };
  
  // Log changes when filter state updates
  useEffect(() => {
    console.log('[ForSaleFilter] Filter state changed:', { 
      showForSale: filterState.showForSale,
      showSold: filterState.showSold 
    });
  }, [filterState.showForSale, filterState.showSold]);
  
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
  
  // Track both states, ensuring we handle undefined/null values correctly
  const showForSale = filterState.showForSale !== false;
  const showSold = filterState.showSold === true;
  
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