"use client";

import { useAppContext } from "@/AppContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCallback, useMemo } from "react";

export function FilteredListings({ listings }) {
  const filteredProperties = useMemo(() => {
    return listings.filter(
      (property) => true,
      // property.price >= priceRange[0] &&
      // property.price <= priceRange[1] &&
      // (bedroom === null || property.bedrooms === bedroom) &&
      // (bathroom === null || property.bathrooms === bathroom) &&
      // (location === "" || property.location.toLowerCase().includes(location.toLowerCase())),
    );
  }, [listings]);

  return (
    <div>
      {filteredProperties.map((f) => (
        <ListingItem {...f} />
      ))}
    </div>
  );
}

export default function FilterHeader() {
  const {
    location,
    setLocation,
    setFilterState,
    filterState: { minLDK, minLivingSize, minPropertySize, maxPrice },
  } = useAppContext();
  const setMinLDK = useCallback(
    (value: string) => {
      setFilterState((draft) => {
        draft.minLDK = Number(value);
      });
    },
    [setFilterState],
  );

  const setMaxPrice = useCallback(
    (value: string) => {
      setFilterState((draft) => {
        draft.maxPrice = Number(value);
      });
    },
    [setFilterState],
  );

  return (
    <div className="bg-background rounded-lg shadow-sm p-2">
      <div className="grid gap-6">
        <div>
          <label className="block text-sm font-medium mb-2">Price</label>
          <Select value={maxPrice} onValueChange={setMaxPrice}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={Infinity}>Any</SelectItem>
              <SelectItem value={50000}>{"<50,000 USD"}</SelectItem>
              <SelectItem value={75000}>{"<75,000 USD"}</SelectItem>
              <SelectItem value={100000}>{"<100,000 USD"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">LDK</label>
          <Select value={minLDK} onValueChange={setMinLDK}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select LDK" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={0}>Any</SelectItem>
              <SelectItem value={4}>4+</SelectItem>
              <SelectItem value={6}>6+</SelectItem>
              <SelectItem value={8}>8+</SelectItem>
              <SelectItem value={10}>10+</SelectItem>
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
