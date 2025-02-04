import { useAppContext } from "@/AppContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { SIZES } from "@/lib/listing-utils";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SizeFilter() {
  const { filterState, setFilterState } = useAppContext();

  const getLabel = () => {
    if (!filterState.size.minBuildSize && !filterState.size.minLandSize) {
      return "Size";
    }
    const parts = [];
    if (filterState.size.minBuildSize) {
      parts.push(`${filterState.size.minBuildSize}m²+ Build`);
    }
    if (filterState.size.minLandSize) {
      parts.push(`${filterState.size.minLandSize}m²+ Land`);
    }
    return parts.join(" • ");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          {getLabel()}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Building Size</Label>
            <Select
              value={filterState.size.minBuildSize?.toString() ?? ""}
              onValueChange={(value) =>
                setFilterState((draft) => {
                  draft.size.minBuildSize = value ? parseInt(value) : null;
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any size</SelectItem>
                {SIZES.build.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}m²+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Land Size</Label>
            <Select
              value={filterState.size.minLandSize?.toString() ?? ""}
              onValueChange={(value) =>
                setFilterState((draft) => {
                  draft.size.minLandSize = value ? parseInt(value) : null;
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Any size</SelectItem>
                {SIZES.land.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}m²+
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 