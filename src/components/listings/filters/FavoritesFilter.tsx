import { useAppContext, FilterState } from "@/AppContext";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ChevronDown, Eye } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { useListings } from "@/contexts/ListingsContext";
import { getValidFavoritesCount } from "@/lib/favorites-utils";

// Create a type for the filter options
type ViewOption = "all" | "favorites" | "seen";

// Helper function to get viewed listings from localStorage
const getViewedListingsFromStorage = (): string[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const viewedListingsString = localStorage.getItem('viewedListings');
    if (!viewedListingsString) return [];
    
    const viewedListings = JSON.parse(viewedListingsString);
    return Array.isArray(viewedListings) ? viewedListings : [];
  } catch (error) {
    console.error('Error reading viewed listings from localStorage:', error);
    return [];
  }
};

export function FavoritesFilterContent() {
  const { filterState, setFilterState, favorites, user } = useAppContext();
  const { listings } = useListings();
  const [viewedListings, setViewedListings] = useState<string[]>([]);
  
  // Load viewed listings from localStorage on mount
  useEffect(() => {
    setViewedListings(getViewedListingsFromStorage());
  }, []);
  
  // Calculate the valid favorites count
  const validFavoritesCount = useMemo(() => {
    return getValidFavoritesCount(favorites, listings || []);
  }, [favorites, listings]);
  
  // Calculate the valid viewed listings count
  const validViewedCount = useMemo(() => {
    if (!listings || !viewedListings.length) return 0;
    
    // Count how many listings in the current list have been viewed
    return listings.filter(listing => 
      listing && listing.id && viewedListings.includes(listing.id)
    ).length;
  }, [listings, viewedListings]);
  
  // Get the current view option based on filter state
  const viewOption: ViewOption = 
    filterState.showOnlySeen ? "seen" :
    filterState.showOnlyFavorites ? "favorites" : "all";

  // If user switches to "all" after logging out, update the filter state
  useEffect(() => {
    if (!user && filterState.showOnlyFavorites) {
      // If no user is logged in but favorites filter is active, reset to "all"
      const newFilterState: FilterState = JSON.parse(JSON.stringify(filterState));
      newFilterState.showOnlyFavorites = false;
      setFilterState(newFilterState);
    }
  }, [user, filterState, setFilterState]);
  
  // Update the filter state when the view option changes
  const handleViewOptionChange = (value: ViewOption) => {
    // Create a deep copy to ensure all properties are maintained
    const newFilterState: FilterState = JSON.parse(JSON.stringify(filterState));
    
    // Update the filter properties based on the selected option
    newFilterState.showOnlyFavorites = value === "favorites";
    newFilterState.showOnlySeen = value === "seen";
    
    // Pass the new state object directly to setFilterState
    setFilterState(newFilterState);
  };
  
  return (
    <div className="flex flex-col space-y-3 py-1">
      <RadioGroup 
        value={viewOption} 
        onValueChange={(value) => handleViewOptionChange(value as ViewOption)}
      >
        <div className="flex items-center space-x-2 mb-2">
          <RadioGroupItem value="all" id="all-listings" />
          <Label htmlFor="all-listings">All Listings</Label>
        </div>
        
        <div className={`flex items-center space-x-2 ${!user ? 'opacity-50' : ''}`}>
          <RadioGroupItem 
            value="favorites" 
            id="favorites" 
            disabled={!user}
          />
          <Label 
            htmlFor="favorites"
            className={!user ? 'cursor-not-allowed' : ''}
          >
            Favorites
            {validFavoritesCount > 0 && (
              <span className="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                {validFavoritesCount}
              </span>
            )}
          </Label>
          {!user && (
            <span className="text-xs text-gray-500 italic ml-1">
              (Login required)
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2 mt-2">
          <RadioGroupItem 
            value="seen" 
            id="seen-listings"
            disabled={validViewedCount === 0}
          />
          <Label 
            htmlFor="seen-listings"
            className={validViewedCount === 0 ? 'cursor-not-allowed opacity-50' : ''}
          >
            Previously Viewed
            {validViewedCount > 0 && (
              <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                {validViewedCount}
              </span>
            )}
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}

export function FavoritesFilter() {
  const { filterState, favorites } = useAppContext();
  const { listings } = useListings();
  const [viewedListings, setViewedListings] = useState<string[]>([]);
  
  // Load viewed listings from localStorage on mount
  useEffect(() => {
    setViewedListings(getViewedListingsFromStorage());
  }, []);
  
  // Calculate the valid favorites count
  const validFavoritesCount = useMemo(() => {
    return getValidFavoritesCount(favorites, listings || []);
  }, [favorites, listings]);
  
  // Calculate the valid viewed listings count
  const validViewedCount = useMemo(() => {
    if (!listings || !viewedListings.length) return 0;
    
    // Count how many listings in the current list have been viewed
    return listings.filter(listing => 
      listing && listing.id && viewedListings.includes(listing.id)
    ).length;
  }, [listings, viewedListings]);
  
  // Get the current view option based on filter state
  const viewOption: ViewOption = 
    filterState.showOnlySeen ? "seen" :
    filterState.showOnlyFavorites ? "favorites" : "all";
  
  // Determine the button text based on selected option
  const getFilterText = () => {
    if (viewOption === "all") return "All Listings";
    if (viewOption === "seen") return "Previously Viewed";
    return "Favorites";
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="outline" 
          className={cn(
            "flex items-center gap-2",
            viewOption === "favorites" && "bg-primary/10 border-primary/20",
            viewOption === "seen" && "bg-blue-50 border-blue-200"
          )}
        >
          {getFilterText()}
          {viewOption === "favorites" && validFavoritesCount > 0 && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {validFavoritesCount}
            </span>
          )}
          {viewOption === "seen" && validViewedCount > 0 && (
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
              {validViewedCount}
            </span>
          )}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-4">
        <FavoritesFilterContent />
      </PopoverContent>
    </Popover>
  );
} 