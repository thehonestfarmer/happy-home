"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UndoIcon, SaveIcon, EyeIcon, ArrowUpDown, Search, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { SearchX } from "lucide-react";

interface ListingData {
  id: string;
  address?: string;
  addresses?: string;
  englishAddress?: string;
  originalAddress?: string;
  isDuplicate?: boolean;
  tags?: string;
  listingDetail?: string;
  details?: string[];
  price?: string;
  prices?: string;
  floorPlan?: string;
  layout?: string;
  buildArea?: string;
  buildSqMeters?: string;
  landArea?: string;
  landSqMeters?: string;
  listingDetailUrl?: string;
  listingImages?: string[];
  recommendedText?: string[];
  isDetailSoldPresent?: boolean;
  scrapedAt?: string;
  [key: string]: any;
}

interface Change {
  timestamp: number;
  listingId: string;
  field: string;
  oldValue: any;
  newValue: any;
}

interface EditableField {
  label: string;
  key: keyof ListingData;
  type: 'text' | 'textarea' | 'boolean' | 'tags';
  fallbackKey?: keyof ListingData;
}

type SortField = 'address' | 'addresses' | 'price' | 'prices';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<Record<string, ListingData>>({});
  const [originalListings, setOriginalListings] = useState<Record<string, ListingData>>({});
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChangePreview, setShowChangePreview] = useState(false);
  const { toast } = useToast();
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'address',
    direction: 'asc'
  });
  const [searchTerm, setSearchTerm] = useState('');

  const editableFields: EditableField[] = [
    { label: 'Address', key: 'address', fallbackKey: 'addresses', type: 'text' },
    { label: 'Details', key: 'details', fallbackKey: 'listingDetail', type: 'textarea' },
    { label: 'Tags', key: 'tags', type: 'tags' },
    { label: 'Price', key: 'price', fallbackKey: 'prices', type: 'text' },
    { label: 'Floor Plan', key: 'floorPlan', fallbackKey: 'layout', type: 'text' },
    { label: 'Build Area (m²)', key: 'buildArea', fallbackKey: 'buildSqMeters', type: 'text' },
    { label: 'Land Area (m²)', key: 'landArea', fallbackKey: 'landSqMeters', type: 'text' },
    { label: 'Listing Detail URL', key: 'listingDetailUrl', fallbackKey: 'listingDetail', type: 'text' },
  ];

  const fetchListings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/listings');
      if (!response.ok) {
        throw new Error('Failed to fetch listings');
      }
      const data = await response.json();
      
      // Handle both old and new format 
      const listingsData = data.listings.newListings 
        ? data.listings.newListings 
        : data.listings;
        
      setListings(listingsData);
      setOriginalListings(listingsData);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
      toast({
        title: "Error",
        description: "Failed to load listings.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    // Try to load previously saved data from localStorage first
    try {
      const savedListings = localStorage.getItem('admin-listings');
      if (savedListings) {
        const parsedListings = JSON.parse(savedListings);
        if (parsedListings && parsedListings) {
          setListings(parsedListings);
          setOriginalListings(parsedListings);
          toast({
            title: "Loaded saved listings",
            description: "Using previously saved data from local storage"
          });
        }
      }
    } catch (error) {
      // If there's an error reading from localStorage, just proceed to fetch
      console.error("Error loading from localStorage:", error);
    }
    
    // Always fetch fresh data
    fetchListings();
  }, []);

  const addChange = (listingId: string, field: string, oldValue: any, newValue: any) => {
    const change: Change = {
      timestamp: Date.now(),
      listingId,
      field,
      oldValue,
      newValue
    };
    setChanges(prev => [...prev, change]);
  };

  const toggleDuplicate = (id: string) => {
    const listing = listings[id];
    if (!listing) return;

    setListings({
      ...listings,
      [id]: {
        ...listing,
        isDuplicate: !listing.isDuplicate
      }
    });

    addChange(
      id,
      'isDuplicate',
      listing.isDuplicate,
      !listing.isDuplicate
    );
  };

  const handleSave = async () => {
    try {
      const response = await fetch('/api/admin/listings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ listings })
      });

      if (!response.ok) {
        throw new Error('Failed to save listings');
      }

      // Clear changes and update original
      setChanges([]);
      setOriginalListings({...listings});

      toast({
        title: "Saved",
        description: "Listings updated successfully!",
      });
    } catch (err) {
      console.error('Error saving changes:', err);
      toast({
        title: "Error",
        description: "Failed to save changes.",
        variant: "destructive",
      });
    }
  };

  const undoLastChange = () => {
    if (changes.length === 0) return;

    const lastChange = changes[changes.length - 1];
    setListings(prev => ({
      ...prev,
      [lastChange.listingId]: {
        ...prev[lastChange.listingId],
        [lastChange.field]: lastChange.oldValue
      }
    }));

    setChanges(prev => prev.slice(0, -1));
  };

  const handleFieldChange = (field: keyof ListingData, value: any) => {
    if (!selectedListing) return;

    const listing = listings[selectedListing];
    if (!listing) return;

    // Store the original value for the undo history
    const oldValue = listing[field];

    // Update the listing
    setListings({
      ...listings,
      [selectedListing]: {
        ...listing,
        [field]: value
      }
    });

    // Add to change history
    addChange(selectedListing, field as string, oldValue, value);
  };

  const getFieldValue = (listing: ListingData, field: EditableField): string => {
    if (field.key === 'details' && Array.isArray(listing.details)) {
      return listing.details.join('\n');
    }
    
    const primaryValue = listing[field.key];
    if (primaryValue !== undefined) {
      return typeof primaryValue === 'string' ? primaryValue : JSON.stringify(primaryValue);
    }
    
    if (field.fallbackKey && listing[field.fallbackKey] !== undefined) {
      const fallbackValue = listing[field.fallbackKey];
      return typeof fallbackValue === 'string' ? fallbackValue : JSON.stringify(fallbackValue);
    }
    
    return '';
  };

  const setFieldValue = (field: EditableField, value: string) => {
    if (!selectedListing) return;
    
    const listing = listings[selectedListing];
    
    if (field.key === 'details' && (listing.details || field.fallbackKey === 'listingDetail')) {
      if (Array.isArray(listing.details)) {
        handleFieldChange('details', value.split('\n').filter(line => line.trim()));
      } else {
        handleFieldChange(field.fallbackKey || field.key, value);
      }
      return;
    }
    
    handleFieldChange(field.key, value);
  };

  const getSortedListings = useCallback(() => {
    // First filter by search term
    const filteredListings = Object.values(listings).filter(listing => {
      if (!searchTerm.trim()) return true;
      
      const searchTermLower = searchTerm.toLowerCase();
      const addressMatch = getDisplayAddress(listing).toLowerCase().includes(searchTermLower);
      const idMatch = listing.id.toLowerCase().includes(searchTermLower);
      
      return addressMatch || idMatch;
    });
    
    // Then sort the filtered results
    return filteredListings.sort((a, b) => {
      if (sortConfig.field === 'address') {
        const aAddress = getDisplayAddress(a).toLowerCase();
        const bAddress = getDisplayAddress(b).toLowerCase();
        return sortConfig.direction === 'asc'
          ? aAddress.localeCompare(bAddress)
          : bAddress.localeCompare(aAddress);
      } else if (sortConfig.field === 'price') {
        // Handle price as either string or number
        const aPrice = typeof a.price === 'number' ? a.price : 
          (typeof a.price === 'string' ? parseFloat(a.price.replace(/[^0-9.]/g, '') || '0') : 0);
        const bPrice = typeof b.price === 'number' ? b.price : 
          (typeof b.price === 'string' ? parseFloat(b.price.replace(/[^0-9.]/g, '') || '0') : 0);
          
        return sortConfig.direction === 'asc'
          ? aPrice - bPrice
          : bPrice - aPrice;
      }
      return 0;
    });
  }, [listings, sortConfig, searchTerm]);

  const getDisplayAddress = (listing: ListingData): string => {
    return listing.address || listing.addresses || 'No address';
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 min-h-screen grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading listings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4 min-h-screen grid place-items-center">
        <div className="flex flex-col items-center gap-4">
          <div className="text-destructive text-xl">⚠️</div>
          <h2 className="text-xl font-semibold">Error Loading Listings</h2>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={fetchListings}>Try Again</Button>
        </div>
      </div>
    );
  }

  const hasListings = Object.keys(listings).length > 0;

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Listing Administration</h1>
        <div className="flex gap-2">
          <Link href="/admin">
            <Button variant="outline" className="flex items-center gap-2">
              Back to Admin
            </Button>
          </Link>
          {changes.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangePreview(!showChangePreview)}
              >
                <EyeIcon className="w-4 h-4 mr-2" />
                {changes.length} Changes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={undoLastChange}
                disabled={changes.length === 0}
              >
                <UndoIcon className="w-4 h-4 mr-2" />
                Undo
              </Button>
              <Button
                onClick={handleSave}
                disabled={isLoading || changes.length === 0}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <SaveIcon className="w-4 h-4 mr-2" />
                )}
                Save {changes.length} Changes
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {showChangePreview && changes.length > 0 && (
          <div className="mb-6 p-4 border rounded-lg bg-muted">
            <h2 className="text-lg font-semibold mb-2">Pending Changes</h2>
            <div className="space-y-2">
              {changes.map((change, index) => {
                const listing = listings[change.listingId];
                return (
                  <div key={index} className="text-sm">
                    <span className="font-medium">
                      {getDisplayAddress(listing)}
                    </span>
                    <span className="text-muted-foreground">
                      : {change.field} changed from {JSON.stringify(change.oldValue)} to{" "}
                      {JSON.stringify(change.newValue)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!hasListings ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No listings found</p>
            <Button onClick={fetchListings} className="mt-4">
              Refresh Listings
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col border rounded-lg overflow-hidden shadow-sm">
              <div className="bg-muted/40 p-4 border-b">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h2 className="text-xl font-semibold">Properties</h2>
                    <p className="text-sm text-muted-foreground">
                      {searchTerm.trim() 
                        ? `${getSortedListings().length} of ${Object.keys(listings).length} listings` 
                        : `${Object.keys(listings).length} total listings`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Select
                        value={sortConfig.field}
                        onValueChange={(value: SortField) => 
                          setSortConfig(prev => ({ ...prev, field: value }))
                        }
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue placeholder="Sort by..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="address">Address</SelectItem>
                          <SelectItem value="price">Price</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setSortConfig(prev => ({
                          ...prev,
                          direction: prev.direction === 'asc' ? 'desc' : 'asc'
                        }))}
                      >
                        <ArrowUpDown className={`h-4 w-4 ${
                          sortConfig.direction === 'desc' ? 'rotate-180' : ''
                        } transition-transform`} />
                      </Button>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchListings}>
                      Refresh
                    </Button>
                  </div>
                </div>
                
                <div className="relative">
                  <Input
                    placeholder="Search by address or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-6 w-6 rounded-full p-0"
                      onClick={() => setSearchTerm('')}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              
              <div 
                className="overflow-y-auto p-3 space-y-2"
                style={{ maxHeight: '70vh' }}
              >
                {getSortedListings().length > 0 ? (
                  getSortedListings().map((listing) => (
                    <div 
                      key={listing.address} 
                      className={`p-4 border rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50 transition-colors ${
                        selectedListing === listing.id ? 'border-primary bg-muted' : ''
                      }`}
                      onClick={() => setSelectedListing(listing.address)}
                    >
                      <div>
                        <p className="font-medium">{getDisplayAddress(listing)}</p>
                        <p className="text-sm text-muted-foreground">ID: {listing.id}</p>
                      </div>
                      <Button
                        variant={listing.isDuplicate ? "destructive" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDuplicate(listing.id);
                        }}
                        size="sm"
                      >
                        {listing.isDuplicate ? "Marked Duplicate" : "Mark as Duplicate"}
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                      <SearchX className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-medium mb-2">No matching properties</h3>
                    <p className="text-muted-foreground max-w-md mb-4">
                      Try changing your search terms or clear the search to see all properties.
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setSearchTerm('')}
                    >
                      Clear Search
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="h-full overflow-y-auto pr-2">
              <h2 className="text-xl font-semibold mb-4">Property Editor</h2>
              {selectedListing ? (
                <div className="space-y-4">
                  {editableFields.map((field) => {
                    const listing = listings[selectedListing];
                    const fieldValue = getFieldValue(listing, field);
                    
                    return (
                      <div key={field.key.toString()} className="space-y-2">
                        <label className="text-sm font-medium">
                          {field.label}
                        </label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            value={fieldValue}
                            onChange={(e) => setFieldValue(field, e.target.value)}
                            className="min-h-[100px]"
                          />
                        ) : field.type === 'tags' ? (
                          <Textarea
                            value={fieldValue}
                            onChange={(e) => setFieldValue(field, e.target.value)}
                            placeholder="Enter tags separated by commas"
                            className="min-h-[80px]"
                          />
                        ) : (
                          <input
                            type="text"
                            value={fieldValue}
                            onChange={(e) => setFieldValue(field, e.target.value)}
                            className="w-full p-2 border rounded-md"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Select a listing to edit its properties
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 