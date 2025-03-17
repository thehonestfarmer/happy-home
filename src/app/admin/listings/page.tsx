"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UndoIcon, SaveIcon, EyeIcon, ArrowUpDown, InstagramIcon, AlertCircle, RefreshCw, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

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
  listingUrl?: string;
  listingImages?: string[];
  recommendedText?: string[];
  isDetailSoldPresent?: boolean;
  scrapedAt?: string;
  [key: string]: any;
}

interface FailedJob {
  id: string;
  url: string;
  failedAt: string;
  reason: string;
  retryCount: number;
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
  const [listings, setListings] = useState<{ newListings: Record<string, ListingData> }>({ newListings: {} });
  const [originalListings, setOriginalListings] = useState<{ newListings: Record<string, ListingData> }>({ newListings: {} });
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
  const [activeTab, setActiveTab] = useState<string>("listings");
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [isLoadingFailedJobs, setIsLoadingFailedJobs] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [isRetrying, setIsRetrying] = useState(false);

  const editableFields: EditableField[] = [
    { label: 'Address', key: 'address', fallbackKey: 'addresses', type: 'text' },
    { label: 'English Address', key: 'englishAddress', type: 'text' },
    { label: 'Details', key: 'details', fallbackKey: 'listingDetail', type: 'textarea' },
    { label: 'Tags', key: 'tags', type: 'tags' },
    { label: 'Price', key: 'price', fallbackKey: 'prices', type: 'text' },
    { label: 'Floor Plan', key: 'floorPlan', fallbackKey: 'layout', type: 'text' },
    { label: 'Build Area (m²)', key: 'buildArea', fallbackKey: 'buildSqMeters', type: 'text' },
    { label: 'Land Area (m²)', key: 'landArea', fallbackKey: 'landSqMeters', type: 'text' },
    { label: 'Listing URL', key: 'listingUrl', type: 'text' },
  ];

  const fetchListings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Load from the public folder
      const response = await fetch("/all-listings.json");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (!data || !data.newListings) {
        throw new Error('Invalid data format received');
      }
      setListings(data);
      setOriginalListings(data); // Set original listings right away too
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
    // Try to load previously saved data from localStorage first
    try {
      const savedListings = localStorage.getItem('admin-listings');
      if (savedListings) {
        const parsedListings = JSON.parse(savedListings);
        if (parsedListings && parsedListings.newListings) {
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
      
      // First attempt to save via API (to local file)
      try {
        const response = await fetch("/api/admin/listings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(listings),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        toast({
          title: "Success",
          description: `Saved ${changes.length} changes successfully to server`,
        });
      } catch (apiError) {
        console.error("Error saving to API:", apiError);
        
        // If API fails, fall back to localStorage
        localStorage.setItem('admin-listings', JSON.stringify(listings));
        
        toast({
          title: "Saved locally only",
          description: `Changes saved to localStorage (server save failed)`,
          variant: "warning",
        });
      }
      
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
    
    const listing = listings.newListings[selectedListing];
    
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

  const getSortedListings = () => {
    if (!listings?.newListings) return [];
    
    const listingArray = Object.entries(listings.newListings).map(([id, listing]) => ({
      ...listing,
      id
    }));
    
    return listingArray.sort((a, b) => {
      let aValue: string = '';
      let bValue: string = '';
      
      if (sortConfig.field === 'address' || sortConfig.field === 'addresses') {
        aValue = a.address || a.addresses || a.englishAddress || '';
        bValue = b.address || b.addresses || b.englishAddress || '';
      }
      else if (sortConfig.field === 'price' || sortConfig.field === 'prices') {
        aValue = a.price || a.prices || '';
        bValue = b.price || b.prices || '';
        
        const aNum = Number((aValue.match(/\d+/)?.[0] || '0'));
        const bNum = Number((bValue.match(/\d+/)?.[0] || '0'));
        
        if (sortConfig.direction === 'asc') {
          return aNum - bNum;
        } else {
          return bNum - aNum;
        }
      }
      
      if (sortConfig.direction === 'asc') {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });
  };

  const getDisplayAddress = (listing: ListingData): string => {
    return listing.address || listing.addresses || listing.englishAddress || 'No address';
  };

  // New function to fetch failed jobs
  const fetchFailedJobs = async () => {
    try {
      setIsLoadingFailedJobs(true);
      const response = await fetch("/api/admin/listings/failed-jobs");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.failedJobs) {
        setFailedJobs(data.failedJobs);
      }
    } catch (error) {
      toast({
        title: "Error fetching failed jobs",
        description: error instanceof Error ? error.message : "Failed to fetch failed jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFailedJobs(false);
    }
  };

  // New function to retry selected jobs
  const retrySelectedJobs = async () => {
    if (selectedJobs.length === 0) {
      toast({
        title: "No jobs selected",
        description: "Please select at least one job to retry",
      });
      return;
    }

    try {
      setIsRetrying(true);
      const response = await fetch("/api/admin/listings/failed-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobIds: selectedJobs }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      toast({
        title: "Retrying jobs",
        description: `Started retry process for ${selectedJobs.length} jobs`,
      });
      
      // Clear selection and refresh the list after a short delay
      setSelectedJobs([]);
      setTimeout(() => {
        fetchFailedJobs();
      }, 3000);
    } catch (error) {
      toast({
        title: "Error retrying jobs",
        description: error instanceof Error ? error.message : "Failed to retry jobs",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  };

  // New function to clear all failed jobs
  const clearAllFailedJobs = async () => {
    if (!confirm("Are you sure you want to clear all failed jobs? This cannot be undone.")) {
      return;
    }

    try {
      setIsLoadingFailedJobs(true);
      const response = await fetch("/api/admin/listings/failed-jobs", {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast({
        title: "Cleared all jobs",
        description: "All failed jobs have been cleared",
      });
      
      setFailedJobs([]);
      setSelectedJobs([]);
    } catch (error) {
      toast({
        title: "Error clearing jobs",
        description: error instanceof Error ? error.message : "Failed to clear jobs",
        variant: "destructive",
      });
    } finally {
      setIsLoadingFailedJobs(false);
    }
  };

  // Fetch failed jobs when the tab changes to "failed-jobs"
  useEffect(() => {
    if (activeTab === "failed-jobs") {
      fetchFailedJobs();
    }
  }, [activeTab]);

  // Toggle job selection
  const toggleJobSelection = (jobId: string) => {
    if (selectedJobs.includes(jobId)) {
      setSelectedJobs(selectedJobs.filter(id => id !== jobId));
    } else {
      setSelectedJobs([...selectedJobs, jobId]);
    }
  };

  // Select all jobs
  const selectAllJobs = () => {
    if (selectedJobs.length === failedJobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(failedJobs.map(job => job.id));
    }
  };

  // Format date to be more readable
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
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
          {activeTab === "listings" && (
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="failed-jobs" className="flex items-center gap-2">
            Failed Jobs
            {failedJobs.length > 0 && (
              <span className="bg-destructive text-destructive-foreground rounded-full h-5 min-w-5 flex items-center justify-center text-xs px-1">
                {failedJobs.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="listings" className="space-y-4">
          {showChangePreview && changes.length > 0 && (
            <div className="mb-6 p-4 border rounded-lg bg-muted">
              <h2 className="text-lg font-semibold mb-2">Pending Changes</h2>
              <div className="space-y-2">
                {changes.map((change, index) => {
                  const listing = listings.newListings[change.listingId];
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[calc(100vh-200px)]">
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
                        <p className="font-medium">{getDisplayAddress(listing)}</p>
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

              <div className="h-full overflow-y-auto pr-2">
                <h2 className="text-xl font-semibold mb-4">Property Editor</h2>
                {selectedListing ? (
                  <div className="space-y-4">
                    {editableFields.map((field) => {
                      const listing = listings.newListings[selectedListing];
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
        </TabsContent>
        
        <TabsContent value="failed-jobs">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Failed Scraping Jobs</h2>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchFailedJobs}
                  disabled={isLoadingFailedJobs}
                >
                  {isLoadingFailedJobs ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Refresh
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={clearAllFailedJobs}
                  disabled={isLoadingFailedJobs || failedJobs.length === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
                <Button 
                  onClick={retrySelectedJobs}
                  disabled={isRetrying || selectedJobs.length === 0}
                >
                  {isRetrying ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Retry Selected ({selectedJobs.length})
                </Button>
              </div>
            </div>
            
            {isLoadingFailedJobs ? (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <p className="text-muted-foreground">Loading failed jobs...</p>
              </div>
            ) : failedJobs.length === 0 ? (
              <div className="p-8 border rounded-lg text-center">
                <AlertCircle className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Failed Jobs</h3>
                <p className="text-muted-foreground">All scraping jobs are running smoothly</p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-4 py-2 text-left">
                          <input 
                            type="checkbox" 
                            checked={selectedJobs.length === failedJobs.length}
                            onChange={selectAllJobs}
                            className="mr-2"
                          />
                          Select All
                        </th>
                        <th className="px-4 py-2 text-left">ID</th>
                        <th className="px-4 py-2 text-left">URL</th>
                        <th className="px-4 py-2 text-left">Failed At</th>
                        <th className="px-4 py-2 text-left">Reason</th>
                        <th className="px-4 py-2 text-center">Retry Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {failedJobs.map((job) => (
                        <tr key={job.id} className="border-t hover:bg-muted/50">
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox" 
                              checked={selectedJobs.includes(job.id)}
                              onChange={() => toggleJobSelection(job.id)}
                            />
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {job.id.length > 20 ? `${job.id.substring(0, 20)}...` : job.id}
                          </td>
                          <td className="px-4 py-3">
                            <a 
                              href={job.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline break-all"
                            >
                              {job.url.length > 30 ? `${job.url.substring(0, 30)}...` : job.url}
                            </a>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">{formatDate(job.failedAt)}</td>
                          <td className="px-4 py-3 text-red-500">
                            {job.reason.length > 50 ? `${job.reason.substring(0, 50)}...` : job.reason}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="bg-amber-100 text-amber-800 px-2 py-1 rounded-full text-xs font-medium">
                              {job.retryCount}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 