import { useAppContext } from "@/AppContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function ForSaleFilter() {
  const { filterState, setFilterState } = useAppContext();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "flex items-center gap-2",
            filterState.showSold && "bg-primary/10 border-primary/20"
          )}
        >
          {filterState.showSold ? "Sold" : "For Sale"}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <RadioGroup 
          value={filterState.showSold ? "sold" : "for-sale"}
          onValueChange={(value: string) => {
            setFilterState((draft) => {
              draft.showSold = value === "sold";
            });
          }}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="for-sale" id="for-sale" />
            <Label htmlFor="for-sale">For Sale</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="sold" id="sold" />
            <Label htmlFor="sold">Sold</Label>
          </div>
        </RadioGroup>
      </PopoverContent>
    </Popover>
  );
} 