"use client";

import { useAppContext } from "@/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback } from "react";

export default function FilterHeader() {
  const { filterState, setFilterState } = useAppContext();
  
  // Access the values with proper type safety
  const minLDK = filterState.layout?.minLDK ?? 0;
  const maxPrice = filterState.priceRange?.max ?? Infinity;
  
  const setMinLDK = useCallback(
    (value: string) => {
      // @ts-ignore - Using ts-ignore as the setFilterState type is complex
      setFilterState((draft) => {
        draft.layout.minLDK = Number(value) || null;
      });
    },
    [setFilterState],
  );

  const setMaxPrice = useCallback(
    (value: string) => {
      // @ts-ignore - Using ts-ignore as the setFilterState type is complex
      setFilterState((draft) => {
        // If "Infinity" is selected, set max to null (Any price)
        if (value === "Infinity") {
          draft.priceRange.min = null;
          draft.priceRange.max = null;
        } 
        // For specific price ranges, set both min and max accordingly
        else if (value === "50000") {
          draft.priceRange.min = 0;
          draft.priceRange.max = 50000;
        }
        else if (value === "100000") {
          draft.priceRange.min = 50000;
          draft.priceRange.max = 100000;
        }
        else if (value === "150000") {
          draft.priceRange.min = 100000;
          draft.priceRange.max = 150000;
        }
        else if (value === "200000") {
          draft.priceRange.min = 150000;
          draft.priceRange.max = 200000;
        }
        else if (value === "250000") {
          draft.priceRange.min = 200000;
          draft.priceRange.max = 250000;
        }
        else if (value === "300000") {
          draft.priceRange.min = 250000;
          draft.priceRange.max = 300000;
        }
        else if (value === "300000plus") {
          draft.priceRange.min = 300000;
          draft.priceRange.max = null;
        }
      });
    },
    [setFilterState],
  );

  // Determine which price range is currently selected
  const getCurrentPriceValue = () => {
    const min = filterState.priceRange.min;
    const max = filterState.priceRange.max;

    if (min === null && max === null) return "Infinity";
    if (min === 0 && max === 50000) return "50000";
    if (min === 50000 && max === 100000) return "100000";
    if (min === 100000 && max === 150000) return "150000";
    if (min === 150000 && max === 200000) return "200000";
    if (min === 200000 && max === 250000) return "250000";
    if (min === 250000 && max === 300000) return "300000";
    if (min === 300000 && max === null) return "300000plus";

    // If no exact match, default to "Infinity"
    return "Infinity";
  };

  return (
    <div className="bg-background rounded-lg shadow-sm p-1.5 w-full">
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div>
          <label className="block text-xs font-medium mb-1">Price</label>
          <Select value={getCurrentPriceValue()} onValueChange={setMaxPrice}>
            <SelectTrigger className="w-full h-8 text-xs py-0">
              <SelectValue placeholder="Select Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Infinity">Any Price</SelectItem>
              <SelectItem value="50000">Under $50K</SelectItem>
              <SelectItem value="100000">$50K-$100K</SelectItem>
              <SelectItem value="150000">$100K-$150K</SelectItem>
              <SelectItem value="200000">$150K-$200K</SelectItem>
              <SelectItem value="250000">$200K-$250K</SelectItem>
              <SelectItem value="300000">$250K-$300K</SelectItem>
              <SelectItem value="300000plus">$300K+</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">LDK</label>
          <Select value={minLDK === null ? "0" : String(minLDK)} onValueChange={setMinLDK}>
            <SelectTrigger className="w-full h-8 text-xs py-0">
              <SelectValue placeholder="Select LDK" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="0">Any</SelectItem>
              <SelectItem value="1">1+</SelectItem>
              <SelectItem value="2">2+</SelectItem>
              <SelectItem value="3">3+</SelectItem>
              <SelectItem value="4">4+</SelectItem>
              <SelectItem value="5">5+</SelectItem>
              <SelectItem value="6">6+</SelectItem>
              <SelectItem value="8">8+</SelectItem>
              <SelectItem value="10">10+</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
// <div>
//   <label htmlFor="location" className="block text-sm font-medium mb-2">
//     Location
//   </label>
//   <Input
//     id="location"
//     type="text"
//     placeholder="Enter location"
//     value={location}
//     onChange={(e) => setLocation(e.target.value)}
//   />
// </div>
