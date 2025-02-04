import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown } from "lucide-react";
import { useState } from "react";

export function BedsFilter() {
  const [selectedBeds, setSelectedBeds] = useState<string | null>(null);
  const [selectedBaths, setSelectedBaths] = useState<string | null>(null);

  const bedOptions = ["Any", "Studio", "1", "2", "3", "4", "5+"];
  const bathOptions = ["Any", "1+", "1.5+", "2+", "2.5+", "3+", "4+"];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          Beds/Baths
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-4">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-3">Beds</h4>
            <p className="text-sm text-muted-foreground mb-3">Tap two numbers to select a range</p>
            <div className="flex gap-2">
              {bedOptions.map((option) => (
                <Button
                  key={option}
                  variant={selectedBeds === option ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedBeds(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-3">Baths</h4>
            <div className="flex gap-2">
              {bathOptions.map((option) => (
                <Button
                  key={option}
                  variant={selectedBaths === option ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setSelectedBaths(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
} 