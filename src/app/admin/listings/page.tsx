"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UndoIcon, SaveIcon, EyeIcon, ArrowUpDown, InstagramIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";

interface ListingData {
  id: string;
  addresses: string;
  isDuplicate?: boolean;
  tags: string;
  listingDetail: string;
  prices: string;
  layout: string;
  buildSqMeters: string;
  landSqMeters: string;
  listingImages?: string[];
  recommendedText?: string[];
  isDetailSoldPresent?: boolean;
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
}

type SortField = 'addresses' | 'prices';
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export default function ListingsPage() {
  const [listings, setListings] = useState<{ newListings: Record<string, ListingData> }>({ newListings: {} });
  const [originalListings, setOriginalListings] = useState<{ newListings: Record<string, ListingData> }>({ newListings: {} });
  const [changes, setChanges] = useState<Change[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showChangePreview, setShowChangePreview] = useState(false);
  const { toast } = useToast();
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'addresses',
    direction: 'asc'
  });

  const editableFields: EditableField[] = [
    { label: 'Address', key: 'addresses', type: 'text' },
    { label: 'Listing Details', key: 'listingDetail', type: 'textarea' },
    { label: 'Tags', key: 'tags', type: 'tags' },
    { label: 'Prices', key: 'prices', type: 'text' },
    { label: 'Layout', key: 'layout', type: 'text' },
    { label: 'Build Area (m²)', key: 'buildSqMeters', type: 'text' },
    { label: 'Land Area (m²)', key: 'landSqMeters', type: 'text' },
  ];

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/listings");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!data || !data.newListings) {
        throw new Error('Invalid data format received');
      }
      setListings(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch listings';
      setError(message);
      toast({
        title: "Error fetching listings",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await fetchListings();
      setOriginalListings(listings);
    };
    loadData();
  }, []);

  const addChange = (listingId: string, field: string, oldValue: any, newValue: any) => {
    setChanges(prev => [...prev, {
      timestamp: Date.now(),
      listingId,
      field,
      oldValue,
      newValue
    }]);
  };

  const toggleDuplicate = (id: string) => {
    const listing = listings.newListings[id];
    if (listing) {
      const oldValue = listing.isDuplicate;
      const newValue = !oldValue;
      
      setListings({
        newListings: {
          ...listings.newListings,
          [id]: {
            ...listing,
            isDuplicate: newValue
          },
        },
      });
      
      addChange(id, 'isDuplicate', oldValue, newValue);
    }
  };

  const handleSave = async () => {
    if (changes.length === 0) {
      toast({
        title: "No changes to save",
        description: "Make some changes first",
      });
      return;
    }

    try {
      setIsLoading(true);
      await fetch("/api/admin/listings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(listings),
      });
      
      toast({
        title: "Success",
        description: `Saved ${changes.length} changes successfully`,
      });
      
      // Reset changes and update original state
      setChanges([]);
      setOriginalListings(listings);
    } catch (error) {
      toast({
        title: "Error saving changes",
        description: error instanceof Error ? error.message : 'Failed to save changes',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const undoLastChange = () => {
    if (changes.length === 0) return;
    
    const lastChange = changes[changes.length - 1];
    setListings(prev => ({
      newListings: {
        ...prev.newListings,
        [lastChange.listingId]: {
          ...prev.newListings[lastChange.listingId],
          [lastChange.field]: lastChange.oldValue
        }
      }
    }));
    
    setChanges(prev => prev.slice(0, -1));
  };

  const handleFieldChange = (field: keyof ListingData, value: any) => {
    if (!selectedListing) return;

    const listing = listings.newListings[selectedListing];
    const oldValue = listing[field];
    
    if (oldValue === value) return; // Don't record if no change

    setListings({
      newListings: {
        ...listings.newListings,
        [selectedListing]: {
          ...listing,
          [field]: value
        }
      }
    });

    addChange(selectedListing, field as string, oldValue, value);
  };

  const getSortedListings = () => {
    if (!listings?.newListings) return [];
    
    const listingArray = Object.values(listings.newListings);
    
    return listingArray.sort((a, b) => {
      let aValue: string | number = a[sortConfig.field] || '';
      let bValue: string | number = b[sortConfig.field] || '';
      
      // For prices, convert to numbers for comparison
      if (sortConfig.field === 'prices') {
        // Extract first number from price string
        aValue = Number((aValue as string).match(/\d+/)?.[0] || 0);
        bValue = Number((bValue as string).match(/\d+/)?.[0] || 0);
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
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

  const hasListings = Object.keys(listings.newListings).length > 0;

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
        </div>
      </div>

      {showChangePreview && changes.length > 0 && (
        <div className="mb-6 p-4 border rounded-lg bg-muted">
          <h2 className="text-lg font-semibold mb-2">Pending Changes</h2>
          <div className="space-y-2">
            {changes.map((change, index) => (
              <div key={index} className="text-sm">
                <span className="font-medium">
                  {listings.newListings[change.listingId]?.addresses}
                </span>
                <span className="text-muted-foreground">
                  : {change.field} changed from {JSON.stringify(change.oldValue)} to{" "}
                  {JSON.stringify(change.newValue)}
                </span>
              </div>
            ))}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
          {/* Listings List */}
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Quick Actions</h2>
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
                      <SelectItem value="addresses">Address</SelectItem>
                      <SelectItem value="prices">Price</SelectItem>
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
            
            {/* Make the listings list scrollable */}
            <div className="space-y-2 overflow-y-auto flex-1 pr-2">
              {getSortedListings().map((listing) => (
                <div 
                  key={listing.id} 
                  className={`p-4 border rounded-lg flex justify-between items-center cursor-pointer hover:bg-muted/50 ${
                    selectedListing === listing.id ? 'border-primary bg-muted' : ''
                  }`}
                  onClick={() => setSelectedListing(listing.id)}
                >
                  <div>
                    <p className="font-medium">{listing.addresses}</p>
                    <p className="text-sm text-muted-foreground">ID: {listing.id}</p>
                  </div>
                  <Button
                    variant={listing.isDuplicate ? "destructive" : "outline"}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDuplicate(listing.id);
                    }}
                  >
                    {listing.isDuplicate ? "Marked Duplicate" : "Mark as Duplicate"}
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Property Editor */}
          <div className="h-full overflow-y-auto pr-2">
            <h2 className="text-xl font-semibold mb-4">Property Editor</h2>
            {selectedListing ? (
              <div className="space-y-4">
                {editableFields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <label className="text-sm font-medium">
                      {field.label}
                    </label>
                    {field.type === 'textarea' ? (
                      <Textarea
                        value={listings.newListings[selectedListing][field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="min-h-[100px]"
                      />
                    ) : field.type === 'tags' ? (
                      <Textarea
                        value={listings.newListings[selectedListing][field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder="Enter tags separated by commas"
                        className="min-h-[80px]"
                      />
                    ) : (
                      <input
                        type="text"
                        value={listings.newListings[selectedListing][field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-full p-2 border rounded-md"
                      />
                    )}
                  </div>
                ))}
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
  );
} 