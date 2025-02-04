import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useAppContext } from "@/AppContext";
import { InfoIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LDK_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 8, 10];

export function LDKFilterContent() {
  const { filterState, setFilterState } = useAppContext();

  return (
    <div className="space-y-4">
      {/* Options section */}
      <div>
        <h4 className="font-medium mb-3">Minimum Rooms</h4>
        <div className="grid grid-cols-3 gap-2">
          {LDK_OPTIONS.map((option) => (
            <Button
              key={option}
              variant={filterState.layout.minLDK === option ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setFilterState((draft) => {
                  draft.layout.minLDK = option;
                })
              }
            >
              {option === 0 ? "Any" : `${option}+`}
            </Button>
          ))}
        </div>
      </div>

      {/* Info section */}
      <div className="flex items-start gap-2 pt-2 mt-2 border-t">
        <InfoIcon className="h-4 w-4 mt-1 flex-shrink-0 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          LDK stands for Living, Dining, Kitchen. The number represents
          additional rooms, e.g., 3LDK means 3 rooms plus LDK area.
        </p>
      </div>
    </div>
  );
}

export function LDKFilter() {
  const { filterState } = useAppContext();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "flex items-center gap-2",
            filterState.layout.minLDK && "bg-primary/10 border-primary/20"
          )}
        >
          LDK {filterState.layout.minLDK ? `${filterState.layout.minLDK}+` : "Any"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-4">
        <LDKFilterContent />
      </PopoverContent>
    </Popover>
  );
} 