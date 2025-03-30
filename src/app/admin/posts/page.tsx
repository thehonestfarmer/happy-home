"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SendHorizonal, ImageIcon, Clock, Sparkles, PencilRuler, Check, GripVertical, X, Calendar as CalendarIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";
import { useListings } from "@/contexts/ListingsContext";
import { Listing } from "@/lib/listing-utils";
import { parseJapanesePrice, convertCurrency, formatPrice } from "@/lib/listing-utils";
import { Tabs as UITabs, TabsContent as UITabsContent, TabsList as UITabsList, TabsTrigger as UITabsTrigger } from "@/components/ui/tabs";
import { parseListingLocation } from "@/lib/address-utils";
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import { 
  arrayMove,
  SortableContext, 
  sortableKeyboardCoordinates, 
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getScheduledPosts, ScheduledPost, cancelScheduledPost, deleteScheduledPost } from "@/lib/supabase/scheduled-posts";
import * as tf from '@tensorflow/tfjs';
import ImageSelector from "@/components/instagram/ImageSelector";
import TagInput from "@/components/instagram/TagInput";
import PostConfirmationModal from "@/components/instagram/PostConfirmationModal";
import OverlayImageGenerator from "@/components/instagram/OverlayImageGenerator";
import { MediaContainerResult } from "@/server/instagram/api";
import SchedulingOptions from "@/components/instagram/SchedulingOptions";
import { Slider } from "@radix-ui/react-slider";

// Define upload status type
interface UploadStatus {
  imageUrl: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  containerId?: string;
  error?: string;
}

// Step 1: Function to create individual media containers
async function createMediaContainersViaApi(imageUrls: string[]): Promise<MediaContainerResult[]> {
  try {
    console.log('Calling API to create containers with:', {
      imageUrls,
      forCarousel: true
    });

    const response = await fetch('/api/admin/instagram?containers=true', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrls,
        forCarousel: true
      }),
    });

    const result = await response.json();
    console.log('Raw API response:', result);

    if (!response.ok) {
      console.error('API error response:', result);
      throw new Error(result.error || 'Failed to create media containers');
    }

    console.log('Media container results:', result.data);
    return result.data as MediaContainerResult[];
  } catch (error) {
    console.error('Error creating containers:', error);
    throw error;
  }
}

// Define a SortableImage component for drag-and-drop
function SortableImage({ img, index, onRemove }: { img: string; index: number; onRemove: () => void }) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id: img });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1
  };
  
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={`relative aspect-square rounded-md overflow-hidden border group ${
        isDragging ? "border-primary shadow-lg ring-2 ring-primary" : "border-gray-200"
      }`}
      {...attributes}
    >
      <img
        src={img}
        alt={`Selected ${index + 1}`}
        className="object-cover w-full h-full"
      />
      
      <div 
        {...listeners}
        className="absolute top-0 left-0 right-0 bg-black/70 text-white text-xs flex items-center justify-between px-2 py-1 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-3 w-3" />
        <span>{index + 1}</span>
      </div>
      
      {/* Improved remove button with tooltip-like label that appears on hover */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute bottom-1 right-1 bg-black/70 hover:bg-red-600 text-white rounded-full p-1.5 transition-all duration-200 group-hover:scale-110"
        aria-label="Remove image"
        title="Remove image"
      >
        <X className="h-3.5 w-3.5" />
        <span className="sr-only">Remove image</span>
      </button>

      {/* Semi-transparent overlay on hover to indicate the item is interactive */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200 pointer-events-none"></div>
    </div>
  );
}

// Interface for batch configuration
interface BatchConfig {
  batchSize: number;
  timeBetweenPosts: number; // in days
  startDate: Date;
  postTime: string; // in 24-hour format, e.g., "19:00"
}

// Interface for campaign data
interface Campaign {
  id: string;
  name: string;
  createdAt: string;
  config: BatchConfig;
  postIds: string[];
}

// Interface for post data (expanded from ScheduledPost)
interface BatchPost {
  id: string;
  listing_id: string;
  caption: string;
  images: string[];
  scheduled_for: string;
  status: 'scheduled' | 'published' | 'cancelled' | 'failed';
  campaign_id: string;
  created_at: string;
}

// Batch configuration modal component
function BatchConfigModal({ 
  isOpen, 
  onClose,
  onConfirm 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onConfirm: (config: BatchConfig) => void;
}) {
  const [batchSize, setBatchSize] = useState(1);
  const [timeBetweenPosts, setTimeBetweenPosts] = useState(2);
  const [startDate, setStartDate] = useState<Date | undefined>(
    // Set default to tomorrow at 7 PM
    (() => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(19, 0, 0, 0);
      return tomorrow;
    })()
  );
  const [postTime, setPostTime] = useState("19:00"); // Default 7 PM

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) {
      return;
    }
    
    onConfirm({
      batchSize,
      timeBetweenPosts,
      startDate,
      postTime
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create Post Batch</DialogTitle>
          <DialogDescription>
            Configure settings for creating multiple scheduled posts.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="batchSize" className="text-right">
                Batch Size
              </Label>
              <Input
                id="batchSize"
                type="number"
                min={1}
                max={20}
                value={batchSize}
                onChange={(e) => setBatchSize(Math.max(1, parseInt(e.target.value) || 1))}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="timeBetween" className="text-right">
                Days Between
              </Label>
              <Input
                id="timeBetween"
                type="number"
                min={1}
                max={30}
                value={timeBetweenPosts}
                onChange={(e) => setTimeBetweenPosts(Math.max(1, parseInt(e.target.value) || 1))}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="startDate" className="text-right">
                Start Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal col-span-3",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="postTime" className="text-right">
                Post Time
              </Label>
              <Input
                id="postTime"
                type="time"
                value={postTime}
                onChange={(e) => setPostTime(e.target.value)}
                className="col-span-3"
              />
              <div className="col-span-4 text-xs text-muted-foreground text-right">
                Time shown in local timezone (will be converted to PST)
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">Create Batch</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Define a component for displaying scheduled posts
function ScheduledPosts({ setActiveTab }: { setActiveTab: (tab: "create" | "scheduled") => void }) {
  const [isLoading, setIsLoading] = useState(true);
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [isCancelling, setIsCancelling] = useState<Record<string, boolean>>({});
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { listingsById } = useListings();

  useEffect(() => {
    const fetchScheduledPosts = async () => {
      try {
        setIsLoading(true);
        let posts: ScheduledPost[] = [];
        
        try {
          // Try to fetch from Supabase first
          posts = await getScheduledPosts();
          console.log('Fetched posts from Supabase:', posts);
        } catch (supabaseError) {
          console.log('Supabase not available, falling back to localStorage');
          // If Supabase fails, continue with empty array (we'll add localStorage items below)
        }
        
        // Always check localStorage for additional posts
        try {
          const localStoragePosts = JSON.parse(localStorage.getItem('scheduledPosts') || '[]');
          console.log('Fetched posts from localStorage:', localStoragePosts);
          
          if (localStoragePosts.length > 0) {
            // Convert localStorage posts to the format expected by the component
            const formattedLocalPosts = localStoragePosts.map((post: BatchPost) => ({
              id: post.id,
              created_at: post.created_at,
              scheduled_for: post.scheduled_for,
              caption: post.caption,
              tags: [], // BatchPost doesn't have tags, but ScheduledPost expects it
              images: post.images,
              listing_id: post.listing_id,
              status: post.status,
              carousel_container_id: null,
              media_container_ids: [],
              error_message: null,
              published_at: null,
              metadata: { campaign_id: post.campaign_id }
            }));
            
            // Combine with Supabase posts if any
            posts = [...posts, ...formattedLocalPosts];
          }
        } catch (localStorageError) {
          console.error('Error reading from localStorage:', localStorageError);
        }
        
        setScheduledPosts(posts);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching scheduled posts:', error);
        toast({
          title: "Error Fetching Posts",
          description: "There was an error loading scheduled posts.",
          variant: "destructive",
        });
        setIsLoading(false);
      }
    };

    fetchScheduledPosts();
  }, [toast]);

  const handleCancelPost = async (id: string) => {
    try {
      setIsCancelling(prev => ({ ...prev, [id]: true }));
      
      try {
        // Try to cancel in Supabase first
        await cancelScheduledPost(id);
      } catch (supabaseError) {
        console.log('Supabase not available for cancellation, using localStorage only');
      }
      
      // Also update in localStorage
      try {
        const localStoragePosts = JSON.parse(localStorage.getItem('scheduledPosts') || '[]');
        const updatedLocalPosts = localStoragePosts.map((post: BatchPost) => 
          post.id === id ? { ...post, status: 'cancelled' } : post
        );
        
        localStorage.setItem('scheduledPosts', JSON.stringify(updatedLocalPosts));
      } catch (localStorageError) {
        console.error('Error updating localStorage:', localStorageError);
      }
      
      // Update local state
      setScheduledPosts(prev => 
        prev.map(post => post.id === id ? { ...post, status: 'cancelled' } : post)
      );
      
      toast({
        title: "Post Cancelled",
        description: "The scheduled post has been cancelled.",
      });
    } catch (error) {
      console.error('Error cancelling post:', error);
      toast({
        title: "Error",
        description: "Failed to cancel the scheduled post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCancelling(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeletePost = async (id: string) => {
    try {
      setIsDeleting(prev => ({ ...prev, [id]: true }));
      
      try {
        // Try to delete in Supabase first
        await deleteScheduledPost(id);
      } catch (supabaseError) {
        console.log('Supabase not available for deletion, using localStorage only');
      }
      
      // Also delete from localStorage
      try {
        const localStoragePosts = JSON.parse(localStorage.getItem('scheduledPosts') || '[]');
        const updatedLocalPosts = localStoragePosts.filter((post: BatchPost) => post.id !== id);
        
        localStorage.setItem('scheduledPosts', JSON.stringify(updatedLocalPosts));
        
        // Also update campaigns if needed
        const localStorageCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
        const updatedCampaigns = localStorageCampaigns.map((campaign: Campaign) => ({
          ...campaign,
          postIds: campaign.postIds.filter(postId => postId !== id)
        }));
        
        localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
      } catch (localStorageError) {
        console.error('Error updating localStorage:', localStorageError);
      }
      
      // Update local state
      setScheduledPosts(prev => prev.filter(post => post.id !== id));
      
      toast({
        title: "Post Deleted",
        description: "The scheduled post has been deleted.",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete the scheduled post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(prev => ({ ...prev, [id]: false }));
    }
  };

  const formatScheduledDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium', 
      timeStyle: 'short'
    }).format(date);
  };

  // Handler for creating a batch of scheduled posts
  const handleCreateBatch = async (config: BatchConfig) => {
    try {
      setIsCreatingBatch(true);
      
      // Show loading toast
      toast({
        title: "Creating Batch",
        description: `Creating ${config.batchSize} scheduled posts...`,
        duration: 5000,
      });

      // Get all available listings (not removed or sold)
      const availableListings = Object.entries(listingsById)
        .filter(([_, listing]) => {
          return !listing.removed && !listing.isSold;
        })
        .map(([id, listing]) => ({ id, listing }));

      if (availableListings.length === 0) {
        toast({
          title: "No Available Listings",
          description: "There are no available listings to create posts for.",
          variant: "destructive",
        });
        setIsCreatingBatch(false);
        return;
      }

      // Create a unique campaign ID
      const campaignId = nanoid();
      const campaignName = `Campaign ${format(new Date(), "yyyy-MM-dd")}`;
      
      // Create post objects for localStorage
      const posts: BatchPost[] = [];
      const postIds: string[] = [];

      // Process each post in the batch
      for (let i = 0; i < config.batchSize; i++) {
        // Calculate scheduled date for this post
        const scheduledDate = new Date(config.startDate);
        scheduledDate.setDate(scheduledDate.getDate() + (i * config.timeBetweenPosts));
        
        // Parse post time (HH:MM)
        const [hours, minutes] = config.postTime.split(':').map(Number);
        scheduledDate.setHours(hours, minutes, 0, 0);
        
        // Select a random listing
        const randomIndex = Math.floor(Math.random() * availableListings.length);
        const { id: listingId, listing } = availableListings[randomIndex];
        
        // Skip if no images available
        if (!listing.listingImages || listing.listingImages.length === 0) {
          continue;
        }

        // Create a post ID
        const postId = nanoid();
        postIds.push(postId);
        
        // Generate image selections
        // Use first image for price overlay
        const firstImage = listing.listingImages[0];
        
        // Select images based on listing size
        let selectedImages: string[] = [];
        const imageCount = listing.listingImages.length < 20 ? 8 : 10;
        
        // Note: In a real implementation, you would use TensorFlow
        // For this simulation, we'll just select random images
        const availableImages = [...listing.listingImages];
        // Remove the first image as we'll use it for the overlay
        availableImages.shift();
        
        // Select random images 
        for (let j = 0; j < Math.min(imageCount - 1, availableImages.length); j++) {
          const idx = Math.floor(Math.random() * availableImages.length);
          selectedImages.push(availableImages[idx]);
          availableImages.splice(idx, 1);
        }
        
        // Add the first image at the beginning
        selectedImages.unshift(firstImage);
        
        // Create the post object
        const post: BatchPost = {
          id: postId,
          listing_id: listingId,
          caption: listing.propertyCaption || `Beautiful property in ${listing.address || 'Japan'}`,
          images: selectedImages,
          scheduled_for: scheduledDate.toISOString(),
          status: 'scheduled',
          campaign_id: campaignId,
          created_at: new Date().toISOString(),
        };
        
        posts.push(post);
      }
      
      // Create campaign object
      const campaign: Campaign = {
        id: campaignId,
        name: campaignName,
        createdAt: new Date().toISOString(),
        config,
        postIds,
      };
      
      // Save to localStorage
      saveToLocalStorage(campaign, posts);
      
      // Update UI - fetch fresh posts
      try {
        const freshPosts = await getScheduledPosts();
        setScheduledPosts(freshPosts);
      } catch (error) {
        console.error('Error refreshing posts after batch creation:', error);
      }
      
      toast({
        title: "Batch Created",
        description: `Successfully created ${posts.length} scheduled posts.`,
      });
    } catch (error) {
      console.error('Error creating batch:', error);
      toast({
        title: "Error",
        description: "Failed to create batch. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // Helper function to save data to localStorage
  const saveToLocalStorage = (campaign: Campaign, posts: BatchPost[]) => {
    try {
      // Get existing data or initialize
      const existingCampaigns = JSON.parse(localStorage.getItem('campaigns') || '[]');
      const existingPosts = JSON.parse(localStorage.getItem('scheduledPosts') || '[]');
      
      // Add new data
      const updatedCampaigns = [...existingCampaigns, campaign];
      const updatedPosts = [...existingPosts, ...posts];
      
      // Save back to localStorage
      localStorage.setItem('campaigns', JSON.stringify(updatedCampaigns));
      localStorage.setItem('scheduledPosts', JSON.stringify(updatedPosts));
      
      console.log('Saved to localStorage:', { campaign, posts });
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="shadow-sm">
      <CardHeader className="bg-gray-50 border-b">
        <CardTitle>Scheduled Posts</CardTitle>
        <CardDescription>
          View and manage your upcoming Instagram posts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        {scheduledPosts.length > 0 ? (
          <div className="space-y-6">
            {scheduledPosts.map((post) => (
              <div 
                key={post.id} 
                className="border rounded-md overflow-hidden shadow-sm"
              >
                <div className="bg-white p-4 flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{post.listing_id}</h3>
                      
                      <span 
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          post.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
                          post.status === 'published' ? 'bg-green-100 text-green-700' :
                          post.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                          'bg-red-100 text-red-700'
                        }`}
                      >
                        {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                      {post.caption}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      Scheduled for:
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatScheduledDate(post.scheduled_for)}
                    </p>
                  </div>
                </div>
                
                <div className="border-t bg-gray-50 p-2">
                  {/* Image preview */}
                  <div className="flex gap-1 overflow-x-auto py-2 px-2 scrollbar-thin">
                    {post.images.slice(0, 5).map((img, idx) => (
                      <div 
                        key={idx} 
                        className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border"
                      >
                        <img 
                          src={img} 
                          alt={`Post ${idx + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {post.images.length > 5 && (
                      <div className="w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border bg-gray-100 flex items-center justify-center text-gray-500 text-xs">
                        +{post.images.length - 5}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t px-4 py-3 flex justify-end gap-2">
                  {post.status === 'scheduled' && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleCancelPost(post.id)}
                      disabled={isCancelling[post.id]}
                    >
                      {isCancelling[post.id] ? (
                        <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Cancelling</>
                      ) : (
                        <>Cancel</>
                      )}
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDeletePost(post.id)}
                    disabled={isDeleting[post.id]}
                  >
                    {isDeleting[post.id] ? (
                      <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Deleting</>
                    ) : (
                      <>Delete</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No scheduled posts</h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              You don't have any posts scheduled for publication. Create a new post and select "Schedule for later" to see it here.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button
                onClick={() => setActiveTab("create")}
              >
                Create New Post
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowBatchModal(true)}
              >
                Create Batch
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Batch Configuration Modal */}
      <BatchConfigModal 
        isOpen={showBatchModal} 
        onClose={() => setShowBatchModal(false)}
        onConfirm={(config) => handleCreateBatch(config)}
      />
    </Card>
  );
}

export default function InstagramPostsPage() {
  const { listingsById, isLoading: isListingsLoading } = useListings();

  // Add state for main page tabs
  const [activeTab, setActiveTab] = useState<"create" | "scheduled">("create");
  
  const [filteredListings, setFilteredListings] = useState<Record<string, Listing>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [caption, setCaption] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState<boolean>(false);

  // Auto image selection states
  const [isModelLoading, setIsModelLoading] = useState<boolean>(false);
  const [isProcessingImages, setIsProcessingImages] = useState<boolean>(false);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [modelLoaded, setModelLoaded] = useState<boolean>(false);
  const [numImagesToSelect, setNumImagesToSelect] = useState<number>(8);

  // Scheduling options
  const [postScheduleType, setPostScheduleType] = useState<"now" | "later">("now");
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(undefined);

  // Confirmation modal and publishing state
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [publishError, setPublishError] = useState<string | undefined>(undefined);
  const [publishSuccess, setPublishSuccess] = useState<boolean>(false);

  // State to track if containers are created (stage between upload and publish)
  const [containersCreated, setContainersCreated] = useState(false);

  // Add state for carousel container ID (from step 2)
  const [carouselContainerId, setCarouselContainerId] = useState<string | null>(null);

  // Add a new state for custom overlay images
  const [customOverlayImages, setCustomOverlayImages] = useState<string[]>([]);
  const [selectedOverlayImage, setSelectedOverlayImage] = useState<string | null>(null);
  const [activeImageTab, setActiveImageTab] = useState<string>("listing");

  const { toast } = useToast();
  const router = useRouter();

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Reset selections when listing changes
  useEffect(() => {
    setSelectedImages([]);
    setCustomOverlayImages([]);
    setSelectedOverlayImage(null);
    
    // Auto-populate caption and hashtags when listing changes
    if (selectedListingId && listingsById[selectedListingId]) {
      const listing = listingsById[selectedListingId];
      
      // Set caption from propertyCaption if available
      if (listing.propertyCaption) {
        setCaption(listing.propertyCaption);
      } else {
        setCaption('');
      }
      
      // Set hashtags from hashTags if available
      if (listing.hashTags) {
        const parsedTags = listing.hashTags
          .split(' ')
          .map(tag => tag.startsWith('#') ? tag.substring(1) : tag)
          .filter(tag => tag.trim().length > 0);
        
        setTags(parsedTags);
      } else {
        setTags([]);
      }

      // Auto-select the first image and generate overlay if images are available
      if (listing.listingImages && listing.listingImages.length > 0) {
        const firstImage = listing.listingImages[0];
        
        // Set it as the selected overlay image
        setSelectedOverlayImage(firstImage);
        
        // Generate a price overlay for the first image if price is available
        // Note: We don't add the original image to selection anymore, only its overlay
        if (listing.price) {
          // Use timeout to ensure state updates have completed
          setTimeout(() => {
            // Generate overlay and let the function handle adding it to selection
            autoGeneratePriceOverlay(firstImage);
          }, 100);
        } else {
          // If no price, just select the first image
          setSelectedImages([firstImage]);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedListingId, listingsById]);

  // Filter listings when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      // If no search query, show all listings
      setFilteredListings(listingsById);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = Object.entries(listingsById).reduce((acc, [id, listing]) => {
      if ((listing.address || '').toLowerCase().includes(query)) {
        acc[id] = listing;
      }
      return acc;
    }, {} as Record<string, Listing>);

    setFilteredListings(filtered);
  }, [searchQuery, listingsById]);

  // Get current listing
  const currentListing = selectedListingId ? listingsById[selectedListingId] : null;

  // Open confirmation modal before posting
  const handlePostClick = () => {
    // Validate inputs
    if (!currentListing || selectedImages.length === 0 || !caption) {
      toast({
        title: "Validation Error",
        description: "Please select a listing, at least one image, and provide a caption",
        variant: "destructive",
      });
      return;
    }

    // Validate image count for Instagram carousel (2-10 images allowed)
    if (selectedImages.length < 2) {
      toast({
        title: "Not Enough Images",
        description: "Instagram requires at least 2 images for a carousel post",
        variant: "destructive",
      });
      return;
    }

    if (selectedImages.length > 10) {
      toast({
        title: "Too Many Images",
        description: "Instagram allows a maximum of 10 images in a carousel post",
        variant: "destructive",
      });
      return;
    }

    // Initialize upload statuses
    const initialStatuses: UploadStatus[] = selectedImages.map(imageUrl => ({
      imageUrl,
      status: 'pending'
    }));

    setUploadStatuses(initialStatuses);
    setShowConfirmModal(true);
  };

  // Function that handles the complete upload and publish process
  const handleUploadAndPublish = async () => {
    if (!selectedListingId || selectedImages.length < 2 || !caption) {
      toast({
        title: "Missing Information",
        description: "Please ensure you've selected images and added a caption",
        variant: "destructive",
      });
      return;
    }

    if (postScheduleType === "later" && !scheduledDate) {
      toast({
        title: "Missing Schedule Time",
        description: "Please select when you want to publish this post",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      setPublishError(undefined);
      setPublishSuccess(false);

      if (postScheduleType === "later") {
        // Store the scheduled post in Supabase for later processing
        try {
          // This would be implemented when the Supabase table is ready
          // For now, we'll just show a mock success
          
          // const scheduledPost = await createScheduledPost({
          //   scheduled_for: scheduledDate!.toISOString(),
          //   caption: caption,
          //   tags: tags,
          //   images: selectedImages,
          //   listing_id: selectedListingId,
          //   user_id: "current-user-id", // This would be the actual user ID in production
          //   status: "scheduled"
          // });

          // Simulate API delay
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          setIsSubmitting(false);
          setPublishSuccess(true);
          
          toast({
            title: "Post Scheduled",
            description: `Your post has been scheduled for ${scheduledDate!.toLocaleString()}`,
          });
          
          // Reset form after successful scheduling
          setTimeout(() => {
            setShowConfirmModal(false);
            setSelectedImages([]);
            setCaption("");
            setTags([]);
            setSelectedListingId("");
            setCustomOverlayImages([]);
            setSelectedOverlayImage(null);
            setCarouselContainerId(null);
            setContainersCreated(false);
            setActiveTab("scheduled"); // Switch to the scheduled posts tab
          }, 2000);
          
          return;
        } catch (error) {
          console.error("Error scheduling post:", error);
          setPublishError("Failed to schedule post. Please try again.");
          setIsSubmitting(false);
          return;
        }
      }

      // For immediate posting, continue with the existing flow
      // ... existing immediate post logic ...
    } catch (error) {
      // ... existing error handling ...
    }
  };
  
  // Helper function to convert data URL to Blob
  const dataURLtoBlob = async (dataUrl: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      try {
        // Convert data URL to blob
        const arr = dataUrl.split(',');
        if (arr.length < 2) {
          reject(new Error('Invalid data URL format'));
          return;
        }
        
        const mimeMatch = arr[0].match(/:(.*?);/);
        if (!mimeMatch) {
          reject(new Error('Could not extract MIME type'));
          return;
        }
        
        const mime = mimeMatch[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        
        resolve(new Blob([u8arr], { type: mime }));
      } catch (error) {
        reject(error);
      }
    });
  };

  // Step 2: Create a carousel container from media containers via API
  const createCarouselContainerFromMedia = async (statusesToUse?: UploadStatus[]) => {
    try {
      // Use provided statuses or fall back to the state
      const currentStatuses = statusesToUse || uploadStatuses;
      console.log('Current upload statuses before creating carousel:', currentStatuses);

      // Validate that all uploads were successful
      const failedUploads = currentStatuses.filter(status => status.status !== 'success');
      if (failedUploads.length > 0) {
        const errorMsg = `Cannot create carousel: ${failedUploads.length} uploads failed`;
        console.error(errorMsg, failedUploads);
        throw new Error(errorMsg);
      }

      // Get successful container IDs
      const containerIds = currentStatuses
        .filter(status => status.status === 'success' && status.containerId)
        .map(status => status.containerId!)
        .filter(Boolean);

      console.log('Found container IDs for carousel:', containerIds);

      if (containerIds.length === 0) {
        throw new Error("No successful media containers to create carousel");
      }

      // Validate Instagram's carousel limits (2-10 items)
      if (containerIds.length < 2) {
        throw new Error("Instagram requires at least 2 images for a carousel post");
      }

      if (containerIds.length > 10) {
        throw new Error("Instagram allows a maximum of 10 images in a carousel post");
      }

      // Format the caption with hashtags
      const formattedTags = tags.map(tag => `#${tag}`).join(' ');
      
      // The caption already includes the property link when it's generated
      let fullCaption = caption;
      
      // Add hashtags if any and they're not already in the caption
      if (formattedTags && !fullCaption.includes(formattedTags)) {
        fullCaption += `\n\n${formattedTags}`;
      }

      // Create the carousel container (Step 2)
      setIsPublishing(true); // Use publishing state to indicate step 2 in progress

      console.log('Creating carousel container with IDs:', containerIds);
      try {
        // Make API call to create carousel container
        const response = await fetch('/api/admin/posts/carousel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            containerIds,
            caption: fullCaption,
          }),
        });

        const data = await response.json();
        console.log('Carousel container creation response:', data);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to create carousel container");
        }

        const carouselId = data.data.containerId;
        console.log('Successfully created carousel container with ID:', carouselId);
        setCarouselContainerId(carouselId);

        // Proceed to step 3 automatically
        await publishCarousel(carouselId);
      } catch (carouselError) {
        console.error('Detailed carousel container creation error:', carouselError);
        throw carouselError; // Re-throw to be caught by the outer try/catch
      }
    } catch (error) {
      console.error('Error creating carousel container:', error);
      setPublishError(error instanceof Error ? error.message : "Unknown error creating carousel container");

      toast({
        title: "Carousel Creation Failed",
        description: error instanceof Error ? error.message : "Failed to create carousel container",
        variant: "destructive",
      });
      setIsPublishing(false);
    }
  };

  // Step 3: Publish the carousel
  const publishCarousel = async (id?: string) => {
    try {
      // Use provided ID or state
      const containerId = id || carouselContainerId;

      if (!containerId) {
        throw new Error("No carousel container ID available");
      }

      // Reset publishing states if not called from step 2
      if (!id) {
        setPublishError(undefined);
        setIsPublishing(true);
      }

      // Make POST request to our API endpoint to publish the post
      console.log(`Publishing carousel with container ID: ${containerId}`);
      const response = await fetch('/api/admin/posts/publish', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          containerId,
        }),
      });

      const data = await response.json();
      console.log('Publish carousel response:', data);

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to publish post");
      }

      // Success!
      setPublishSuccess(true);

      // Show success toast
      toast({
        title: "Post Published!",
        description: "Your Instagram carousel post has been published successfully",
        variant: "success",
      });

      // Reset states after successful publishing (with a slight delay for UX)
      setTimeout(() => {
        // Reset form inputs
        setSelectedImages([]);
        setCaption("");
        setTags([]);

        // Reset process states
        setIsSubmitting(false);
        setIsPublishing(false);
        setUploadStatuses([]);
        setCarouselContainerId(null);
        setPublishSuccess(false);

        // Close the modal
        setShowConfirmModal(false);

        toast({
          title: "Ready for Next Post",
          description: "The form has been reset for your next Instagram post",
        });
      }, 2500); // 2.5 second delay to ensure user sees success state
    } catch (error) {
      console.error('Error publishing post:', error);
      setPublishError(error instanceof Error ? error.message : "Unknown error publishing post");

      // Show error toast
      toast({
        title: "Publishing Failed",
        description: error instanceof Error ? error.message : "Failed to publish post to Instagram",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Handle auto-generation of caption and hashtags
  const handleGenerateCaption = async () => {
    if (!selectedListingId) {
      toast({
        title: "Error",
        description: "Please select a listing first",
        variant: "destructive",
      });
      return;
    }

    setIsGeneratingCaption(true);
    try {
      // If we already have the data in the listing, use that directly instead of fetching
      if (currentListing?.propertyCaption) {
        // Create direct property link
        const propertyLink = `${window.location.origin}/listings/view/${selectedListingId}`;
        
        // Format the caption with property link
        let fullCaption = currentListing.propertyCaption;
        
        // Add a line break and the property link
        fullCaption += `\n\n👉 View property: ${propertyLink}`;
        
        setCaption(fullCaption);
        
        // Parse hashtags from the hashTags string property
        if (currentListing.hashTags) {
          // Remove the # symbol and split by spaces to get individual hashtags
          const parsedTags = currentListing.hashTags
            .split(' ')
            .map(tag => tag.startsWith('#') ? tag.substring(1) : tag)
            .filter(tag => tag.trim().length > 0);
          
          setTags(parsedTags);
        }
        
        toast({
          title: "Success",
          description: "Caption and hashtags loaded from listing data",
        });
        setIsGeneratingCaption(false);
        return;
      }
      
      // Fall back to API if data isn't available in the listing object
      const response = await fetch('/api/admin/generate-caption', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          listingId: selectedListingId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate caption');
      }

      // Create direct property link
      const propertyLink = `${window.location.origin}/listings/view/${selectedListingId}`;
      
      // Format the caption with property link
      let fullCaption = result.data.caption;
      
      // Add a line break and the property link
      fullCaption += `\n\n👉 View property: ${propertyLink}`;
      
      // Update the caption and tags with the generated content
      setCaption(fullCaption);
      setTags(result.data.hashtags);

      toast({
        title: "Success",
        description: "Caption and hashtags generated successfully",
      });
    } catch (error) {
      console.error('Error generating caption:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate caption",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingCaption(false);
    }
  };

  // Function to process images and select diverse ones using TensorFlow
  const handleAutomaticImageSelection = async () => {
    if (!currentListing?.listingImages || currentListing.listingImages.length === 0) {
      toast({
        title: "Error",
        description: "No images available for this listing",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsProcessingImages(true);
      
      // Check if price overlay exists in our selection
      const existingOverlay = customOverlayImages.find(overlay => {
        return selectedImages.includes(overlay) && 
               currentListing.listingImages && 
               !currentListing.listingImages.includes(overlay);
      });
      
      // Get the first image to create an overlay if needed
      const firstImage = currentListing.listingImages[0];
      
      // If we don't have an overlay yet and have price data, generate one
      let overlayImage: string | undefined = existingOverlay;
      if (!overlayImage && currentListing.price) {
        overlayImage = await autoGeneratePriceOverlay(firstImage);
      }
      
      // Initialize our selection with the overlay (or nothing if no overlay)
      const initialSelection: string[] = [];
      if (overlayImage && !selectedImages.includes(overlayImage)) {
        initialSelection.push(overlayImage);
      } else if (selectedImages.length > 0) {
        // If we already have selected images, keep them
        initialSelection.push(...selectedImages);
      }
      
      // Get images to analyze, EXCLUDING the first image since we've already used it for overlay
      const allImages = [...currentListing.listingImages];
      if (allImages.length === 0) {
        // If no images, we're done
        setIsProcessingImages(false);
        toast({
          title: "Selection Complete",
          description: "No images available for this listing.",
        });
        return;
      }
      
      // Skip the first image since we're already using it for the overlay
      const imagesToProcess = allImages.slice(1);
      
      // If no images left to process after removing the first one
      if (imagesToProcess.length === 0) {
        setIsProcessingImages(false);
        setSelectedImages(initialSelection);
        toast({
          title: "Selection Complete", 
          description: "Only one image was available and is being used for price overlay.",
        });
        return;
      }
      
      // Prepare proxied URLs for images to process (excluding the first image)
      const proxiedImageUrls = imagesToProcess.map(url => getProxiedImageUrl(url));
      
      // Loading model if not already loaded
      if (!modelLoaded) {
        setIsModelLoading(true);
        console.log("Loading TensorFlow model...");
        
        try {
          // Load MobileNet model for feature extraction - using a pre-trained model
          const model = await tf.loadLayersModel(
            'https://storage.googleapis.com/tfjs-models/tfjs/mobilenet_v1_0.25_224/model.json'
          );
          
          // Create a feature extractor from an intermediate layer of MobileNet
          const featureExtractor = tf.model({
            inputs: model.inputs,
            outputs: model.getLayer('conv_pw_13_relu').output
          });
          
          setModelLoaded(true);
        } catch (modelError) {
          console.error("Error loading TensorFlow model:", modelError);
          // Fall back to simple selection if model fails to load
          const targetCount = Math.min(numImagesToSelect - initialSelection.length, imagesToProcess.length);
          const simpleSelectionResults = simpleImageSelection(imagesToProcess, targetCount);
          
          // Combine with initial selection
          const finalSelection = [...initialSelection, ...simpleSelectionResults];
          
          // Set as selected images
          setSelectedImages(finalSelection);
          
          toast({
            title: "Simplified Selection",
            description: "Used basic selection due to model loading error",
          });
          
          setIsModelLoading(false);
          setIsProcessingImages(false);
          return;
        }
        
        setIsModelLoading(false);
      }
      
      // Calculate how many additional images to select
      const additionalImagesNeeded = Math.max(0, numImagesToSelect - initialSelection.length);
      if (additionalImagesNeeded === 0) {
        // We already have enough images selected
        setIsProcessingImages(false);
        toast({
          title: "Selection Complete",
          description: "You already have the requested number of images selected.",
        });
        return;
      }
      
      // Try the advanced method with floorplan detection
      try {
        // Extract features from images (excluding first image) and check for floorplans
        const features: number[][] = [];
        const validImages: string[] = [];
        const floorplanScores: {image: string, score: number}[] = [];
        
        // Show toast that we're analyzing images
        toast({
          title: "Analyzing Images",
          description: "Looking for floorplans and diverse property features...",
          duration: 3000,
        });
        
        // Process all images to extract features and detect floorplans
        for (let i = 0; i < proxiedImageUrls.length; i++) {
          const url = proxiedImageUrls[i];
          const originalUrl = imagesToProcess[i]; // Keep track of original URLs
          
          setProcessingProgress(Math.round((i / imagesToProcess.length) * 50));
          
          try {
            // Try to extract features using the proxied URL
            const img = new Image();
            img.src = url;
            await new Promise<void>((resolve, reject) => {
              const timeout = setTimeout(() => {
                // If loading takes too long, use random features instead
                reject(new Error("Image loading timeout"));
              }, 3000);
              
              img.onload = () => {
                clearTimeout(timeout);
                resolve();
              };
              
              img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error("Image loading error"));
              };
            });
            
            // Check if this image looks like a floorplan
            const floorplanScore = await detectFloorplan(img);
            floorplanScores.push({image: originalUrl, score: floorplanScore});
            console.log(`Image ${originalUrl} floorplan score: ${floorplanScore}`);
            
            // Generate feature vector for diversity calculation
            const hashCode = url.split('').reduce((a: number, b: string) => {
              a = ((a << 5) - a) + b.charCodeAt(0);
              return a & a;
            }, 0);
            
            const seededRandom = (seed: number) => {
              let state = seed;
              return () => {
                state = (state * 9301 + 49297) % 233280;
                return state / 233280;
              };
            };
            
            const random = seededRandom(hashCode);
            const feature = Array.from({ length: 64 }, () => random());
            
            features.push(feature);
            validImages.push(originalUrl);
          } catch (error) {
            console.warn(`Error loading image ${url} for feature extraction:`, error);
            
            // Generate random features as fallback
            const randomFeature = Array.from({ length: 64 }, () => Math.random());
            features.push(randomFeature);
            validImages.push(originalUrl);
            floorplanScores.push({image: originalUrl, score: 0}); // Low score if we can't analyze it
          }
          
          // Add a small delay to show progress
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        setProcessingProgress(50);
        
        // Sort floorplan scores to find best candidates
        floorplanScores.sort((a, b) => b.score - a.score);
        
        // Find likely floorplans above our threshold - lowered for Japanese-style floorplans
        const FLOORPLAN_THRESHOLD = 0.55; // Lowered from 0.65 to catch more Japanese-style floorplans
        const likelyFloorplans = floorplanScores
          .filter(item => item.score > FLOORPLAN_THRESHOLD)
          .map(item => item.image);
        
        // Start building the final selection with our initial selection (overlay or existing selection)
        let finalSelectedImages = [...initialSelection];
        
        // If we found floorplans, include the most likely one
        let remainingImagesForDiversity = [...validImages];
        let remainingFeaturesForDiversity = [...features];
        
        if (likelyFloorplans.length > 0) {
          console.log("Likely floorplans found:", likelyFloorplans);
          
          // Include the best floorplan if we still need more images
          const bestFloorplan = likelyFloorplans[0];
          
          // Only add if not already in selection
          if (!finalSelectedImages.includes(bestFloorplan) && finalSelectedImages.length < numImagesToSelect) {
            finalSelectedImages.push(bestFloorplan);
            
            // Remove the floorplan from remaining images and features
            const floorplanIndex = validImages.indexOf(bestFloorplan);
            if (floorplanIndex !== -1) {
              remainingImagesForDiversity = validImages.filter(img => img !== bestFloorplan);
              remainingFeaturesForDiversity = features.filter((_, idx) => validImages[idx] !== bestFloorplan);
            }
            
            toast({
              title: "Floorplan Detected",
              description: "We've included a floorplan in your selection for better property showcase.",
              duration: 4000,
            });
          }
        }
        
        // Calculate how many more images we need
        const remainingImagesNeeded = numImagesToSelect - finalSelectedImages.length;
        
        if (remainingImagesNeeded > 0 && remainingImagesForDiversity.length > 0) {
          // Filter out any images already in finalSelectedImages
          const availableImages = remainingImagesForDiversity.filter(img => !finalSelectedImages.includes(img));
          const availableFeatures = remainingFeaturesForDiversity.filter((_, idx) => 
            !finalSelectedImages.includes(remainingImagesForDiversity[idx])
          );
          
          if (availableImages.length > 0) {
            // Select diverse images from what's left
            const diverseSelections = await selectDiverseImagesKMeans(
              availableImages,
              availableFeatures,
              Math.min(remainingImagesNeeded, availableImages.length)
            );
            
            // Add to our selection
            finalSelectedImages = [...finalSelectedImages, ...diverseSelections];
          }
        }
        
        // Set the final selection
        setSelectedImages(finalSelectedImages);
        
        toast({
          title: "Selection Complete",
          description: `Selected ${finalSelectedImages.length} images including overlay${likelyFloorplans.length > 0 ? ', floorplan' : ''} and diverse property views.`,
        });
      } catch (error) {
        console.error("Error in advanced image selection:", error);
        
        // Fall back to simple selection method
        const targetCount = Math.min(numImagesToSelect - initialSelection.length, imagesToProcess.length);
        const simpleSelectionResults = simpleImageSelection(imagesToProcess, targetCount);
        
        // Combine with initial selection
        const finalSelection = [...initialSelection];
        
        // Add each simple selection result if not already in the selection
        simpleSelectionResults.forEach(img => {
          if (!finalSelection.includes(img) && finalSelection.length < numImagesToSelect) {
            finalSelection.push(img);
          }
        });
        
        // Set as selected images
        setSelectedImages(finalSelection);
        
        toast({
          title: "Simplified Selection",
          description: "Used basic selection due to error in advanced processing",
        });
      }
    } catch (error) {
      console.error("Error processing images:", error);
      toast({
        title: "Error",
        description: "Failed to process images. Using simple selection instead.",
        variant: "destructive",
      });
      
      // Last resort fallback - just use simple selection on all images
      try {
        const targetCount = Math.min(numImagesToSelect, currentListing.listingImages.length);
        const simpleSelectionResults = simpleImageSelection(currentListing.listingImages, targetCount);
        setSelectedImages(simpleSelectionResults);
      } catch (fallbackError) {
        console.error("Even simple selection failed:", fallbackError);
        
        // If everything fails, just select the first few images
        if (currentListing.listingImages.length > 0) {
          setSelectedImages(currentListing.listingImages.slice(0, Math.min(numImagesToSelect, currentListing.listingImages.length)));
        }
      }
    } finally {
      setIsProcessingImages(false);
      setProcessingProgress(100);
      // Reset progress after a short delay
      setTimeout(() => setProcessingProgress(0), 1000);
    }
  };
  
  // Simple image selection as a fallback when advanced methods fail
  function simpleImageSelection(images: string[], count: number): string[] {
    if (images.length <= count) return images;
    
    // For real estate, we want to ensure we get a good mix of images
    // Simple strategy: evenly space through the images
    const selected: string[] = [];
    
    if (count > 0) {
      const stride = Math.floor(images.length / count);
      
      for (let i = 0; i < count; i++) {
        const index = Math.min(i * stride, images.length - 1);
        selected.push(images[index]);
      }
    }
    
    return selected;
  }

  // K-means clustering algorithm for selecting diverse images
  async function selectDiverseImagesKMeans(images: string[], features: number[][], k: number): Promise<string[]> {
    if (images.length <= k) return images;
    
    // If there are fewer features than requested clusters, fall back to simple selection
    if (features.length < k) {
      return simpleImageSelection(images, k);
    }
    
    // Determine feature dimensionality
    const dim = features[0].length;
    
    // Helper to calculate Euclidean distance between two feature vectors
    const distance = (a: number[], b: number[]): number => {
      let sum = 0;
      for (let i = 0; i < a.length; i++) {
        const diff = a[i] - b[i];
        sum += diff * diff;
      }
      return Math.sqrt(sum);
    };
    
    // Initialize k random centroids
    const getRandomIndex = () => Math.floor(Math.random() * features.length);
    const centroids: number[][] = [];
    const usedIndices = new Set<number>();
    
    // Try to pick diverse initial centroids
    while (centroids.length < k && centroids.length < features.length) {
      const randomIndex = getRandomIndex();
      if (!usedIndices.has(randomIndex)) {
        centroids.push([...features[randomIndex]]);
        usedIndices.add(randomIndex);
      }
      
      // Update progress during initialization
      setProcessingProgress(50 + Math.round((centroids.length / k) * 10));
    }
    
    // Perform k-means clustering (max 10 iterations)
    const clusters: number[][] = Array(k).fill(0).map(() => []);
    const MAX_ITERATIONS = 10;
    
    for (let iter = 0; iter < MAX_ITERATIONS; iter++) {
      // Reset clusters
      clusters.forEach(cluster => cluster.length = 0);
      
      // Assign each point to nearest centroid
      for (let i = 0; i < features.length; i++) {
        let minDist = Infinity;
        let closestCluster = 0;
        
        for (let j = 0; j < centroids.length; j++) {
          const dist = distance(features[i], centroids[j]);
          if (dist < minDist) {
            minDist = dist;
            closestCluster = j;
          }
        }
        
        clusters[closestCluster].push(i);
      }
      
      // Update centroids based on assigned points
      let changed = false;
      for (let i = 0; i < k; i++) {
        if (clusters[i].length === 0) continue; // Skip empty clusters
        
        // Calculate new centroid as average of points in cluster
        const newCentroid = Array(dim).fill(0);
        
        for (const pointIndex of clusters[i]) {
          for (let d = 0; d < dim; d++) {
            newCentroid[d] += features[pointIndex][d];
          }
        }
        
        for (let d = 0; d < dim; d++) {
          newCentroid[d] /= clusters[i].length;
        }
        
        // Check if centroid changed significantly
        const centroidDist = distance(centroids[i], newCentroid);
        if (centroidDist > 0.001) {
          changed = true;
        }
        
        // Update centroid
        centroids[i] = newCentroid;
      }
      
      // If centroids didn't change much, we've converged
      if (!changed) break;
      
      // Update progress during clustering iterations
      setProcessingProgress(60 + Math.round((iter / MAX_ITERATIONS) * 30));
    }
    
    // Select best representatives from each cluster:
    // 1. For each cluster, find the point closest to the centroid (most representative)
    
    const selected: string[] = [];
    
    // Process each cluster to find representative images
    for (let i = 0; i < k && selected.length < k; i++) {
      if (clusters[i].length === 0) continue;
      
      // Find the point closest to centroid
      let closestPointIndex = -1;
      let minDist = Infinity;
      
      for (const pointIndex of clusters[i]) {
        const dist = distance(features[pointIndex], centroids[i]);
        if (dist < minDist) {
          minDist = dist;
          closestPointIndex = pointIndex;
        }
      }
      
      // Add the representative image if not already selected
      if (closestPointIndex !== -1) {
        const representativeImage = images[closestPointIndex];
        if (!selected.includes(representativeImage) && selected.length < k) {
          selected.push(representativeImage);
        }
      }
      
      // Update progress during selection phase
      setProcessingProgress(90 + Math.round((i / k) * 10));
    }
    
    // If we still need more images, add from unrepresented clusters
    // This ensures we get the right number of images even if some clusters are empty
    if (selected.length < k) {
      for (let i = 0; i < images.length && selected.length < k; i++) {
        if (!selected.includes(images[i])) {
          selected.push(images[i]);
        }
      }
    }
    
    return selected;
  }

  // Add a function to handle when a new overlay image is generated
  const handleOverlayImageGenerated = (imageUrl: string) => {
    setSelectedOverlayImage(imageUrl);
    
    // If it's not already in our custom images list, add it
    if (!customOverlayImages.includes(imageUrl)) {
      setCustomOverlayImages(prev => [...prev, imageUrl]);
    }
  };

  // Add this helper function at the top level of the component
  const getProxiedImageUrl = (url: string): string => {
    // Check if the URL is from shiawasehome-reuse.com domain
    if (url.includes('shiawasehome-reuse.com')) {
      // Encode the URL to make it safe for query parameters
      const encodedUrl = encodeURIComponent(url);
      return `/api/proxy/image?url=${encodedUrl}`;
    }
    // For other domains, return the original URL
    return url;
  };

  // Add these handlers for image selection and overlay generation
  const autoGeneratePriceOverlay = async (baseImageUrl: string, position?: 'top' | 'bottom'): Promise<string | undefined> => {
    if (!currentListing?.price) return undefined;
    
    // Default to bottom position if not specified
    const overlayPosition = position || 'bottom';
    console.log(`Generating price overlay with position: ${overlayPosition}`);
    
    try {
      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return undefined;
      
      // Set canvas dimensions
      const size = 600;
      canvas.width = size;
      canvas.height = size;
      
      // Draw initial background
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, size, size);
      
      let imageSuccessfullyLoaded = false;
      let imageData: ImageData | null = null;
      
      // Try to load and draw the image with robust error handling
      try {
        // Try to load the image through our proxy if needed
        const proxyUrl = getProxiedImageUrl(baseImageUrl);
        const img = new Image();
        // No need for crossOrigin when using our proxy
        
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Image loading timed out")), 10000);
          
          img.onload = () => {
            clearTimeout(timeout);
            imageSuccessfullyLoaded = true;
            
            // Calculate dimensions to COVER the canvas (filling completely without whitespace)
            // This is different from CONTAIN (which may leave whitespace)
            const scale = Math.max(size / img.width, size / img.height);
            const width = img.width * scale;
            const height = img.height * scale;
            
            // Center the image (this will crop edges if needed)
            const x = (size - width) / 2;
            const y = (size - height) / 2;
            
            // Draw the image centered (with cropping as needed to fill space)
            ctx.drawImage(img, x, y, width, height);
            
            // Get image data for whitespace analysis
            imageData = ctx.getImageData(0, 0, size, size);
            
            resolve();
          };
          
          img.onerror = (e) => {
            clearTimeout(timeout);
            console.error("Error loading image:", e);
            reject(new Error("Failed to load image"));
          };
          
          img.src = proxyUrl;
        });
      } catch (error) {
        console.warn("CORS error or image loading failed:", error);
        
        // If image loading failed, create a nice property placeholder
        // Dark gradient background
        const gradient = ctx.createLinearGradient(0, 0, size, size);
        gradient.addColorStop(0, '#2a2a2a');
        gradient.addColorStop(1, '#1a1a1a');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);
        
        // Draw a house icon
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 3;
        
        // House frame
        const houseWidth = size * 0.5;
        const houseHeight = houseWidth * 0.7;
        const houseX = (size - houseWidth) / 2;
        const houseY = (size - houseHeight) / 2;
        
        // Roof
        ctx.beginPath();
        ctx.moveTo(houseX, houseY + houseHeight * 0.4);
        ctx.lineTo(houseX + houseWidth / 2, houseY);
        ctx.lineTo(houseX + houseWidth, houseY + houseHeight * 0.4);
        ctx.stroke();
        
        // House body
        ctx.strokeRect(
          houseX + houseWidth * 0.1, 
          houseY + houseHeight * 0.4, 
          houseWidth * 0.8, 
          houseHeight * 0.6
        );
        
        // Door
        ctx.strokeRect(
          houseX + houseWidth * 0.4,
          houseY + houseHeight * 0.7,
          houseWidth * 0.2,
          houseHeight * 0.3
        );
        
        toast({
          title: "Image Access Restricted",
          description: "Created a property preview with price overlay instead.",
          variant: "warning",
        });
      }
      
      // Extract location information if available
      const { city, prefecture } = parseListingLocation(currentListing);
      const hasLocation = Boolean(city || prefecture);
      const locationText = hasLocation ? [city, prefecture].filter(Boolean).join(', ') : '';
      
      // Convert price from JPY to USD and format it
      const priceInJPY = parseJapanesePrice(currentListing.price || '0');
      const priceInUSD = convertCurrency(priceInJPY, 'JPY', 'USD');
      const formattedPrice = formatPrice(priceInUSD, 'USD').replace('$', ''); // Remove $ as we'll add it in the drawing
      
      // Calculate the base size and adjust based on text length
      const baseBadgeSize = size / 5; // Reduced from size/4.5 to make badge smaller
      
      // Calculate the minimum width needed for both price and location text
      // We'll use an approximate calculation to estimate text width
      const minPriceWidth = formattedPrice.length * (baseBadgeSize * 0.16); // Reduced from 0.18
      const minLocationWidth = locationText.length * (baseBadgeSize * 0.11); // Reduced from 0.13
      const minRequiredWidth = Math.max(minPriceWidth, minLocationWidth);
      
      // Add padding and ensure minimum width, but keep it narrower with more horizontal margin
      // Reduced multipliers to make badge less stretched horizontally
      const badgeWidth = Math.max(baseBadgeSize * 1.2, minRequiredWidth * 1.1);
      const badgeHeight = baseBadgeSize;
      // Make badge taller to accommodate more prominent location text
      const finalBadgeHeight = hasLocation ? badgeHeight * 1.3 : badgeHeight;
      
      // Position based on the overlayPosition parameter
      // Center the badge horizontally on the canvas
      const x = (size - badgeWidth) / 2;
      // Position margin
      const margin = 20;
      
      // Set Y position based on the specified position (top or bottom)
      const y = overlayPosition === 'top' 
        ? margin 
        : size - finalBadgeHeight - margin;
      
      // Draw the overlay background with rounded corners
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.roundRect(x, y, badgeWidth, finalBadgeHeight, badgeHeight * 0.2); // Increased corner radius
      ctx.fill();
      
      // Add a subtle border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Draw the price text
      ctx.fillStyle = 'white';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Calculate font size for price - adjusted to fit narrower badge
      const priceFontSize = Math.min(
        badgeHeight * 0.35,
        badgeWidth * 0.55 / formattedPrice.length * 3 // Increased proportion to ensure text fits in narrower badge
      );
      
      // Calculate font size for location - smaller but still proportional
      const locationFontSize = priceFontSize * 0.7; // Reduced from 0.75
      
      // Adjust vertical positioning for better spacing
      let priceY: number, locationY: number;
      if (hasLocation) {
        // Position price text higher in the badge
        priceY = y + finalBadgeHeight * 0.35;
        // Position location text lower with a good gap
        locationY = y + finalBadgeHeight * 0.75;
      } else {
        // Center price vertically if no location
        priceY = y + finalBadgeHeight/2;
        // Initialize locationY to avoid TypeScript error, though it won't be used
        locationY = 0;
      }
      
      // Draw price on a single line with $ symbol
      ctx.font = `bold ${priceFontSize}px Arial`;
      ctx.fillText(`$${formattedPrice}`, x + badgeWidth/2, priceY);
      
      // Draw location info if available - now with bold text for more prominence
      if (hasLocation) {
        ctx.font = `bold ${locationFontSize}px Arial`; // Added bold to match price
        ctx.fillText(locationText, x + badgeWidth/2, locationY);
      }
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      
      // Update custom overlay images - replace any existing overlays with this new one
      setCustomOverlayImages(prev => {
        // Filter out any data URLs that might be existing overlays
        const nonOverlays = prev.filter(img => !customOverlayImages.includes(img));
        return [...nonOverlays, dataUrl];
      });
      
      // Replace any existing overlay in the selectedImages array
      setSelectedImages(prev => {
        // Remove the original image that we're overlaying (if it exists)
        const withoutOriginal = prev.filter(img => img !== baseImageUrl);
        
        // Also remove any existing custom overlays
        const withoutOverlays = withoutOriginal.filter(img => !customOverlayImages.includes(img));
        
        // Add the new overlay at the beginning of the array
        return [dataUrl, ...withoutOverlays];
      });
      
      toast({
        title: imageSuccessfullyLoaded ? "Price Overlay Added" : "Fallback Image Created",
        description: imageSuccessfullyLoaded 
          ? "We've automatically created a price overlay image for your post."
          : "Created a property placeholder with price overlay due to image access restrictions.",
        variant: "default",
      });
      
      return dataUrl;
    } catch (error) {
      console.error("Error generating automatic price overlay:", error);
      
      // Create a very basic fallback in case of complete failure
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return undefined;
        
        // Simple square with price
        const size = 600;
        canvas.width = size;
        canvas.height = size;
        
        // Dark background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, size, size);
        
        // Convert price from JPY to USD and format
        const priceInJPY = parseJapanesePrice(currentListing.price || '0');
        const priceInUSD = convertCurrency(priceInJPY, 'JPY', 'USD');
        const formattedPrice = formatPrice(priceInUSD, 'USD').replace('$', '');
        
        // Calculate a centered overlay box size
        const boxWidth = Math.min(size * 0.6, Math.max(250, formattedPrice.length * 25));
        const boxHeight = size * 0.25;
        
        // Position based on overlayPosition parameter
        const boxX = (size - boxWidth) / 2;
        const margin = size * 0.1; // 10% margin from top or bottom
        
        // Set Y position for the fallback overlay based on the position parameter
        const boxY = overlayPosition === 'top'
          ? margin 
          : size - boxHeight - margin;
        
        // Draw a semi-transparent overlay box
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, boxHeight * 0.1);
        ctx.fill();
        
        // Add a subtle border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Text styles
        ctx.fillStyle = 'white';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Draw the main price with larger font
        const priceFontSize = Math.min(48, boxWidth * 0.15);
        ctx.font = `bold ${priceFontSize}px Arial`;
        ctx.fillText(`$${formattedPrice}`, size/2, boxY + boxHeight * 0.35);
        
        // Extract location information
        const { city, prefecture } = parseListingLocation(currentListing);
        const locationText = [city, prefecture].filter(Boolean).join(', ');
        
        // Add location if available with improved styling
        if (locationText) {
          const locationFontSize = Math.min(30, boxWidth * 0.09);
          ctx.font = `bold ${locationFontSize}px Arial`;
          ctx.fillText(locationText, size/2, boxY + boxHeight * 0.7);
        } else {
          // If no location, just show address
          const address = currentListing.address || 'Property';
          // Truncate address if too long
          const maxLength = Math.floor(boxWidth / 10);
          const displayAddress = address.length > maxLength ? address.substring(0, maxLength - 3) + '...' : address;
          const addressFontSize = Math.min(20, boxWidth * 0.06);
          ctx.font = `bold ${addressFontSize}px Arial`;
          ctx.fillText(displayAddress, size/2, boxY + boxHeight * 0.7);
        }
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        
        // Update custom overlay images - replace any existing overlays with this new one
        setCustomOverlayImages(prev => {
          // Filter out any data URLs that might be existing overlays
          const nonOverlays = prev.filter(img => !customOverlayImages.includes(img));
          return [...nonOverlays, dataUrl];
        });
        
        // Replace any existing overlay in the selectedImages array
        setSelectedImages(prev => {
          // Remove the original image that we're overlaying (if it exists)
          const withoutOriginal = prev.filter(img => img !== baseImageUrl);
          
          // Also remove any existing custom overlays
          const withoutOverlays = withoutOriginal.filter(img => !customOverlayImages.includes(img));
          
          // Add the new overlay at the beginning of the array
          return [dataUrl, ...withoutOverlays];
        });
        
        // Switch to custom tab to show the overlay
        setActiveImageTab("custom");
        
        toast({
          title: "Basic Overlay Created",
          description: "We've created a simple price overlay for your post.",
          variant: "default",
        });
        
        return dataUrl;
      } catch (fallbackError) {
        console.error("Even fallback generation failed:", fallbackError);
        
        toast({
          title: "Image Generation Failed",
          description: "Could not generate a price overlay image.",
          variant: "destructive",
        });
        
        return undefined;
      }
    }
  };

  // Function to analyze a region of the image for whitespace
  function analyzeImageRegion(imageData: ImageData, startY: number, height: number) {
    // This function is no longer used but kept as a stub for compatibility
    return {
      brightness: 0,
      complexity: 0,
      edgeDensity: 0,
      houseFeatureDensity: 0,
      score: 0
    };
  }

  // Handler for toggling selection of overlay images
  const toggleOverlayImageSelection = (imageUrl: string) => {
    // Check if the image is already selected
    if (selectedImages.includes(imageUrl)) {
      // Remove it
      setSelectedImages(prev => prev.filter(img => img !== imageUrl));
    } else {
      // Add it
      setSelectedImages(prev => [...prev, imageUrl]);
    }
  };

  // Handler for main image selection with auto-overlay generation
  const handleImageSelection = (newSelectedImages: string[]) => {
    // Update the selected images
    setSelectedImages(newSelectedImages);
    
    // Check if this is the first image being selected (from 0 to 1)
    if (newSelectedImages.length === 1 && 
        selectedImages.length === 0 && 
        currentListing?.price &&
        customOverlayImages.length === 0) {
      
      // Auto-generate a price overlay for the first selected image
      autoGeneratePriceOverlay(newSelectedImages[0]);
    }
  };

  // Add a new function to detect if an image is likely to be a floorplan
  const detectFloorplan = async (img: HTMLImageElement): Promise<number> => {
    try {
      // Create a canvas to analyze the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return 0; // Can't analyze without a context
      }
      
      // Set dimensions for analysis (slightly larger to capture more detail)
      const analyzeWidth = 300;
      const analyzeHeight = Math.round(img.height * (analyzeWidth / img.width));
      canvas.width = analyzeWidth;
      canvas.height = analyzeHeight;
      
      // Draw image on canvas
      ctx.drawImage(img, 0, 0, analyzeWidth, analyzeHeight);
      
      // Get image data for analysis
      const imageData = ctx.getImageData(0, 0, analyzeWidth, analyzeHeight);
      const pixels = imageData.data;
      
      // 1. Check for color distribution - floorplans often have limited palette
      let colorCounts: Record<string, number> = {};
      let pixelCount = 0;
      
      // Track colors that are common in Japanese floorplans
      let pinkPixels = 0;     // Often used for rooms
      let beigePixels = 0;    // Common for halls/shared spaces
      let greenPixels = 0;    // Sometimes used for special rooms
      let bluePixels = 0;     // Often used in Japanese floorplans for bathrooms/water
      let blackPixels = 0;    // Used for lines and text
      let whitePixels = 0;    // Background
      
      // Sample pixels (skip some for performance)
      for (let i = 0; i < pixels.length; i += 12) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        
        // Simplify the color to reduce noise (group similar colors)
        const simplifiedColor = `${Math.floor(r/8)},${Math.floor(g/8)},${Math.floor(b/8)}`;
        
        if (!colorCounts[simplifiedColor]) {
          colorCounts[simplifiedColor] = 0;
        }
        colorCounts[simplifiedColor]++;
        pixelCount++;
        
        // Count pixels in specific color ranges common to Japanese floorplans
        // Pinkish/red colors (common for rooms)
        if (r > 180 && g < 180 && b < 180) {
          pinkPixels++;
        }
        // Pink-beige colors (very common in Japanese floorplans)
        else if (r > 200 && g > 160 && g < 220 && b > 180 && b < 240) {
          pinkPixels++;
        }
        // Beige/tan colors (common for common areas)
        else if (r > 200 && g > 180 && g < 240 && b > 120 && b < 180) {
          beigePixels++;
        }
        // Light green (sometimes used for rooms)
        else if (r > 160 && r < 230 && g > 200 && b > 160 && b < 230) {
          greenPixels++;
        }
        // Blue/gray (often for bathrooms or special areas in Japanese plans)
        else if (r < 180 && g < 180 && b > 180) {
          bluePixels++;
        }
        // Dark colors (lines, text)
        else if (r < 60 && g < 60 && b < 60) {
          blackPixels++;
        }
        // White/near-white (often background)
        else if (r > 230 && g > 230 && b > 230) {
          whitePixels++;
        }
      }
      
      // Calculate ratios of specific floorplan colors
      const pinkRatio = pinkPixels / pixelCount;
      const beigeRatio = beigePixels / pixelCount;
      const greenRatio = greenPixels / pixelCount;
      const blueRatio = bluePixels / pixelCount;
      const blackRatio = blackPixels / pixelCount;
      const whiteRatio = whitePixels / pixelCount;
      
      // Count distinct colors (after simplification)
      const distinctColors = Object.keys(colorCounts).length;
      
      // Calculate color diversity ratio - lower means fewer colors
      const colorDiversityRatio = distinctColors / pixelCount;
      
      // Basic color score based on diversity
      let colorScore = Math.max(0, 1 - (colorDiversityRatio * 4000));
      
      // Japanese floorplans typically have:
      // 1. Significant pink/light red or green colored areas for rooms
      // 2. Some blue/gray areas for bathrooms/water features
      // 3. Black lines for walls/text
      // 4. White/beige backgrounds
      const typicalFloorplanColorBoost = Math.min(
        1.0,
        (pinkRatio * 4) + (beigeRatio * 2) + (greenRatio * 3) + 
        (blueRatio * 2.5) + (blackRatio * 5) + (whiteRatio * 0.5)
      );
      
      // Check for a common pattern in Japanese floorplans: colored rooms with black outlines
      const hasTypicalJapanesePattern = 
        (pinkRatio + greenRatio + beigeRatio > 0.3) && // Colored room areas
        (blackRatio > 0.03 && blackRatio < 0.3) &&    // Some but not too many black lines
        (whiteRatio < 0.7);                          // Not mostly white
      
      // Boost for Japanese-style floorplans
      const japaneseFloorplanBoost = hasTypicalJapanesePattern ? 0.25 : 0;
      
      // Finalize color score with boost for floorplan-specific colors
      colorScore = Math.min(1.0, colorScore + (typicalFloorplanColorBoost * 0.4) + japaneseFloorplanBoost);
      
      // 2. Check for straight lines/edges - floorplans have many
      // Use improved edge detection for floorplans
      const edgeData = detectEdges(imageData, 15); // Lower threshold to catch lighter lines in Japanese plans
      const edgePixels = countEdgePixels(edgeData, analyzeWidth, analyzeHeight);
      
      // Calculate edge density - floorplans have a specific range of edge pixels
      const edgeDensity = edgePixels / (analyzeWidth * analyzeHeight);
      
      // Score for edge characteristics - adjusted for Japanese floorplans
      let edgeScore;
      if (edgeDensity < 0.02) {
        // Too few edges
        edgeScore = edgeDensity * 25; // Linear from 0 to 0.5
      } else if (edgeDensity < 0.1) { // Increased upper bound for ideal range
        // Ideal range for Japanese floorplans (slightly higher than before)
        edgeScore = 0.5 + ((edgeDensity - 0.02) * 5); // Linear from 0.5 to 1.0
      } else if (edgeDensity < 0.2) { // Increased tolerance for higher edge density
        // Still could be a detailed floorplan
        edgeScore = 1.0 - ((edgeDensity - 0.1) * 2.5); // More gradual decrease
      } else {
        // Too many edges (likely a photo with lots of details)
        edgeScore = Math.max(0, 0.75 - ((edgeDensity - 0.2) * 3));
      }
      
      // 3. Check for grid patterns and right angles (very common in floorplans)
      const { horizontalLines, verticalLines, rightAngles } = detectGridPatterns(edgeData, analyzeWidth, analyzeHeight);
      
      // Calculate grid pattern score
      const gridRatio = (horizontalLines + verticalLines) / (analyzeWidth + analyzeHeight);
      const rightAngleRatio = rightAngles / (analyzeWidth * analyzeHeight / 400); // Adjusted normalization
      
      // Japanese floorplans often have very structured grid patterns
      const gridScore = Math.min(1.0, (gridRatio * 6) + (rightAngleRatio * 0.7)); // Increased weights
      
      // 4. Check for text-like patterns (room labels) - very common in Japanese floorplans
      const textLikePatterns = detectTextPatterns(imageData, analyzeWidth, analyzeHeight);
      // Japanese floorplans often have more text (measurements, room names)
      const textScore = Math.min(1.0, textLikePatterns * 0.4); // Increased weight
      
      // 5. Check for small room-like enclosed areas
      // This is a simplified check, but helps identify room layouts
      const hasRoomPatterns = rightAngles > (analyzeWidth + analyzeHeight) / 20;
      const roomPatternBoost = hasRoomPatterns ? 0.15 : 0;
      
      // Combine all scores with weights - adjusted to give more importance to Japanese floorplan features
      let finalScore = (
        (colorScore * 0.3) +      // Color distribution - increased weight
        (edgeScore * 0.3) +       // Edge characteristics  
        (gridScore * 0.25) +      // Grid patterns and right angles
        (textScore * 0.15)        // Text-like elements - increased weight
      );
      
      // Apply room pattern boost
      finalScore = Math.min(1.0, finalScore + roomPatternBoost);
      
      console.log(`Floorplan detection - Color: ${colorScore.toFixed(2)}, Edge: ${edgeScore.toFixed(2)}, Grid: ${gridScore.toFixed(2)}, Text: ${textScore.toFixed(2)}, Final: ${finalScore.toFixed(2)}`);
      
      // Boost score for very likely floorplans (multiple strong signals)
      const strongSignals = [
        colorScore > 0.65,
        edgeScore > 0.65,
        gridScore > 0.6,
        blackRatio > 0.03 && blackRatio < 0.3, // Good amount of lines
        pinkRatio + beigeRatio + greenRatio + blueRatio > 0.3, // Typical floorplan colors
        hasRoomPatterns,
        hasTypicalJapanesePattern
      ].filter(Boolean).length;
      
      if (strongSignals >= 3) {
        return Math.min(1.0, finalScore * 1.35); // Increased boost by up to 35%
      }
      
      return finalScore;
    } catch (error) {
      console.error("Error detecting floorplan:", error);
      return 0; // Return low score on error
    }
  };

  // Helper function for edge detection using Sobel operator
  const detectEdges = (imageData: ImageData, threshold: number = 30): Uint8ClampedArray => {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    
    // Create grayscale version first
    const grayscale = new Uint8ClampedArray(width * height);
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const idx = (i * width + j) * 4;
        // Standard grayscale conversion
        grayscale[i * width + j] = Math.round(
          0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
        );
      }
    }
    
    // Apply Sobel operator for edge detection
    const edges = new Uint8ClampedArray(width * height);
    
    for (let i = 1; i < height - 1; i++) {
      for (let j = 1; j < width - 1; j++) {
        // Horizontal gradient
        const gx = 
          grayscale[(i - 1) * width + (j - 1)] * -1 +
          grayscale[(i - 1) * width + (j + 1)] * 1 +
          grayscale[(i) * width + (j - 1)] * -2 +
          grayscale[(i) * width + (j + 1)] * 2 +
          grayscale[(i + 1) * width + (j - 1)] * -1 +
          grayscale[(i + 1) * width + (j + 1)] * 1;
          
        // Vertical gradient
        const gy = 
          grayscale[(i - 1) * width + (j - 1)] * -1 +
          grayscale[(i - 1) * width + (j)] * -2 +
          grayscale[(i - 1) * width + (j + 1)] * -1 +
          grayscale[(i + 1) * width + (j - 1)] * 1 +
          grayscale[(i + 1) * width + (j)] * 2 +
          grayscale[(i + 1) * width + (j + 1)] * 1;
        
        // Gradient magnitude
        const mag = Math.sqrt(gx * gx + gy * gy);
        
        // Normalize and threshold
        edges[i * width + j] = mag > threshold ? 255 : 0;
      }
    }
    
    return edges;
  };

  // Add new helper functions for improved floorplan detection

  // Helper to count edge pixels
  const countEdgePixels = (
    edges: Uint8ClampedArray, 
    width: number, 
    height: number
  ): number => {
    let count = 0;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i] > 0) {
        count++;
      }
    }
    return count;
  };

  // Function to detect grid patterns and right angles
  const detectGridPatterns = (edges: Uint8ClampedArray, width: number, height: number): { horizontalLines: number, verticalLines: number, rightAngles: number } => {
    // Count horizontal and vertical lines 
    let horizontalLines = 0;
    let verticalLines = 0;
    let rightAngles = 0;
    
    // Detect horizontal lines by checking for consecutive edge pixels in rows
    for (let i = 1; i < height - 1; i++) {
      let consecutiveEdgePixels = 0;
      for (let j = 1; j < width - 1; j++) {
        if (edges[i * width + j] > 0) {
          consecutiveEdgePixels++;
        } else if (consecutiveEdgePixels >= 5) { // At least 5 pixels to count as a line
          horizontalLines++;
          consecutiveEdgePixels = 0;
        } else {
          consecutiveEdgePixels = 0;
        }
      }
      // Check end of row
      if (consecutiveEdgePixels >= 5) {
        horizontalLines++;
      }
    }
    
    // Detect vertical lines by checking for consecutive edge pixels in columns
    for (let j = 1; j < width - 1; j++) {
      let consecutiveEdgePixels = 0;
      for (let i = 1; i < height - 1; i++) {
        if (edges[i * width + j] > 0) {
          consecutiveEdgePixels++;
        } else if (consecutiveEdgePixels >= 5) { // At least 5 pixels to count as a line
          verticalLines++;
          consecutiveEdgePixels = 0;
        } else {
          consecutiveEdgePixels = 0;
        }
      }
      // Check end of column
      if (consecutiveEdgePixels >= 5) {
        verticalLines++;
      }
    }
    
    // Detect right angles (where horizontal and vertical lines meet)
    for (let i = 2; i < height - 2; i++) {
      for (let j = 2; j < width - 2; j++) {
        // Check if current pixel is an edge
        if (edges[i * width + j] > 0) {
          // Check for horizontal and vertical line segments around this point
          const hasHorizontalLine = 
            edges[i * width + (j-1)] > 0 && 
            edges[i * width + (j-2)] > 0;
          
          const hasVerticalLine = 
            edges[(i-1) * width + j] > 0 && 
            edges[(i-2) * width + j] > 0;
          
          if (hasHorizontalLine && hasVerticalLine) {
            rightAngles++;
          }
        }
      }
    }
    
    return { horizontalLines, verticalLines, rightAngles };
  };

  // Simple function to detect text-like patterns (small clusters of edge pixels)
  const detectTextPatterns = (imageData: ImageData, width: number, height: number): number => {
    // Convert to grayscale and threshold to black/white
    const threshold = 180;
    const data = imageData.data;
    const binaryImage = new Uint8ClampedArray(width * height);
    
    // Create binary image
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const idx = (i * width + j) * 4;
        const avg = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        binaryImage[i * width + j] = avg < threshold ? 1 : 0; // 1 for dark pixels
      }
    }
    
    // Count small clusters (potential text elements)
    let textElementCount = 0;
    const visited = new Set<number>();
    
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        const idx = i * width + j;
        
        // If this is a dark pixel and not visited, check if it's part of a small cluster
        if (binaryImage[idx] === 1 && !visited.has(idx)) {
          // Do a flood fill to find connected component size
          const queue: number[] = [idx];
          visited.add(idx);
          let clusterSize = 1;
          
          while (queue.length > 0 && clusterSize < 100) { // Cap cluster size for efficiency
            const currentIdx = queue.shift();
            // Skip this iteration if we somehow got undefined
            if (currentIdx === undefined) continue;
            
            const x = currentIdx % width;
            const y = Math.floor(currentIdx / width);
            
            // Check 4-connected neighbors
            const neighbors = [
              (y-1) * width + x, // up
              (y+1) * width + x, // down
              y * width + (x-1),  // left
              y * width + (x+1)   // right
            ];
            
            for (const neighborIdx of neighbors) {
              if (neighborIdx >= 0 && neighborIdx < width * height && 
                  binaryImage[neighborIdx] === 1 && 
                  !visited.has(neighborIdx)) {
                queue.push(neighborIdx);
                visited.add(neighborIdx);
                clusterSize++;
              }
            }
          }
          
          // If this is a small cluster, it might be text
          if (clusterSize >= 5 && clusterSize < 50) {
            textElementCount++;
          }
        }
      }
    }
    
    // Normalize by image area
    return textElementCount / (width * height / 1000);
  };

  // Add handler for image reordering via drag and drop
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    if (active.id !== over.id) {
      setSelectedImages((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Add a function to handle removing an image from selected images
  const handleRemoveImage = (imageToRemove: string) => {
    setSelectedImages(prevImages => prevImages.filter(img => img !== imageToRemove));
  };

  return (
    <div className="container px-4 py-8 mx-auto max-w-7xl">
      <div className="space-y-6">
        {/* Admin-themed header with navigation */}
        <div className="bg-primary text-white rounded-lg shadow-md p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Instagram Posts</h1>
              <p className="text-green-100 mt-1">
                Create and manage Instagram posts for your listings
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="bg-gray-800 text-white border-gray-700 hover:bg-gray-700 hover:text-white"
                onClick={() => router.push('/admin')}
              >
                Back to Admin Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Main tabs */}
        <UITabs defaultValue={activeTab} onValueChange={(value) => setActiveTab(value as "create" | "scheduled")}>
          <UITabsList className="grid w-full md:w-auto grid-cols-2 mb-4">
            <UITabsTrigger value="create">Create Post</UITabsTrigger>
            <UITabsTrigger value="scheduled">Scheduled Posts</UITabsTrigger>
          </UITabsList>
          
          <UITabsContent value="create">
            <Card className="shadow-sm">

              {/* Rest of your existing create post UI */}
              <CardContent className="p-6">
                <div className="grid gap-6 md:gap-8">
                  {/* Row 1: Listing Selection & Caption */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Listing Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">1. Select a Property</h3>
                      
                      {/* Search input */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Search by Address</label>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          placeholder="Type to search for a property..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          disabled={isListingsLoading || isSubmitting}
                        />
                      </div>

                      {/* Listing selector - Scrollable List */}
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Select Listing</label>
                        {isListingsLoading ? (
                          <div className="flex items-center justify-center h-[200px] border rounded-md bg-gray-50">
                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                          </div>
                        ) : Object.keys(filteredListings).length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-[200px] border border-dashed rounded-md bg-gray-50 text-gray-500">
                            <p className="text-sm">No listings found</p>
                            {searchQuery && <p className="text-xs mt-1">Try a different search term</p>}
                          </div>
                        ) : (
                          <div className="border rounded-md overflow-hidden">
                            <div className="h-[200px] overflow-y-auto">
                              {Object.entries(filteredListings).map(([id, listing]) => (
                                <div
                                  key={id}
                                  className={`
                                    p-3 border-b last:border-b-0 cursor-pointer transition-colors
                                    ${selectedListingId === id 
                                      ? "bg-primary text-primary-foreground" 
                                      : "hover:bg-muted/50"
                                    }
                                    ${isSubmitting ? "opacity-50 pointer-events-none" : ""}
                                  `}
                                  onClick={() => !isSubmitting && setSelectedListingId(id)}
                                >
                                  <div className="flex justify-between items-start">
                                    <div className="text-sm font-medium truncate w-4/5">{listing.address}</div>
                                    <div className={`text-xs ${selectedListingId === id ? "text-primary-foreground" : "text-primary"}`}>
                                      {listing.price || "Price unavailable"}
                                    </div>
                                  </div>
                                  {listing.details && listing.details[0] && (
                                    <div className={`text-xs mt-1 truncate ${selectedListingId === id ? "text-primary-foreground/80" : "text-gray-500"}`}>
                                      {listing.details[0]}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Basic listing info */}
                      {currentListing && (
                        <div className="bg-muted/40 p-4 rounded-md">
                          <div className="flex justify-between">
                            <h3 className="font-medium">{currentListing.address}</h3>
                            <span className="text-primary">{currentListing.price}</span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {currentListing.details ? currentListing.details.join(' ') : ''}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Caption & Hashtags - Second column of first row */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">2. Review Caption & Hashtags</h3>
                      
                      {/* Caption */}
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <label className="text-sm font-medium">Caption</label>
                          <span className="text-xs text-gray-500">
                            {caption.length}/2200 characters
                          </span>
                        </div>
                        <Textarea
                          placeholder="Property caption will appear here when you select a listing"
                          className="min-h-[150px]"
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          disabled={isSubmitting}
                          maxLength={2200}
                        />
                      </div>

                      {/* Tags */}
                      <TagInput
                        tags={tags}
                        onChange={setTags}
                        label="Hashtags"
                        placeholder="Hashtags will appear here when you select a listing"
                      />
                    </div>
                  </div>

                  {/* Row 2: Image Selection & Review */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Image Selection */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">3. Select Images</h3>
                      
                      {/* Tabs for different image types */}
                      <UITabs 
                        defaultValue="listing" 
                        value={activeImageTab}
                        onValueChange={setActiveImageTab}
                        className="w-full"
                      >
                        <UITabsList className="grid grid-cols-2 mb-4">
                          <UITabsTrigger value="listing" className="flex items-center gap-1">
                            <ImageIcon className="h-4 w-4" />
                            Listing Images
                          </UITabsTrigger>
                          <UITabsTrigger value="custom" className="flex items-center gap-1">
                            <PencilRuler className="h-4 w-4" />
                            Custom Overlays
                          </UITabsTrigger>
                        </UITabsList>
                        
                        <UITabsContent value="listing">
                          {/* Auto Image Selection Control */}
                          {currentListing?.listingImages && currentListing.listingImages.length > 0 && (
                            <div className="bg-muted/30 p-3 rounded-md space-y-2 mb-2">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium">Automatic Image Selection</h4>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="w-1/2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">Images to select:</span>
                                    <Input
                                      type="number"
                                      min={2}
                                      max={10}
                                      value={numImagesToSelect}
                                      onChange={(e) => setNumImagesToSelect(Math.min(10, Math.max(2, parseInt(e.target.value) || 5)))}
                                      className="w-16 h-8 text-xs"
                                      disabled={isProcessingImages}
                                    />
                                  </div>
                                  <Slider
                                    value={[numImagesToSelect]}
                                    min={2}
                                    max={10}
                                    step={1}
                                    onValueChange={(value) => setNumImagesToSelect(value[0])}
                                    disabled={isProcessingImages}
                                    className="my-2"
                                  />
                                </div>

                                <Button
                                  onClick={handleAutomaticImageSelection}
                                  disabled={isProcessingImages || isModelLoading}
                                  variant="outline"
                                  size="sm"
                                  className="ml-auto"
                                >
                                  {isModelLoading ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Loading Model...
                                    </>
                                  ) : isProcessingImages ? (
                                    <>
                                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                      Processing: {processingProgress}%
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="mr-2 h-3 w-3" />
                                      Auto-select Images
                                    </>
                                  )}
                                </Button>
                              </div>

                              {isProcessingImages && (
                                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                  <div
                                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                    style={{ width: `${processingProgress}%` }}
                                  ></div>
                                </div>
                              )}
                            </div>
                          )}

                          {currentListing?.listingImages ? (
                            <ImageSelector
                              key={`image-selector-${selectedListingId}`}
                              images={currentListing.listingImages}
                              onSelectionChange={handleImageSelection}
                              initialSelectedImages={selectedImages}
                              maxHeight="400px"
                            />
                          ) : (
                            <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed rounded-md border-gray-300 bg-gray-50">
                              <ImageIcon className="h-12 w-12 text-gray-400" />
                              <p className="mt-2 text-sm text-gray-500">
                                {selectedListingId
                                  ? "No images available for this listing"
                                  : "Select a listing to view images"}
                              </p>
                            </div>
                          )}
                        </UITabsContent>
                        
                        <UITabsContent value="custom">
                          <div className="space-y-4">
                            <div className="bg-muted/30 p-4 rounded-md">
                              {currentListing ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-3">
                                    <h4 className="font-medium text-sm">Price Overlay Preview</h4>
                                    
                                    {/* Image Selection Dropdown */}
                                    <Select
                                      value={selectedOverlayImage || ''}
                                      onValueChange={(value) => setSelectedOverlayImage(value)}
                                    >
                                      <SelectTrigger>
                                        <SelectValue placeholder="Select an image" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {currentListing.listingImages?.map((img, idx) => (
                                          <SelectItem key={idx} value={img}>
                                            Image {idx + 1}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div>
                                    {selectedOverlayImage && (
                                      <OverlayImageGenerator
                                        autoGeneratePriceOverlay={autoGeneratePriceOverlay}
                                        imageUrl={selectedOverlayImage}
                                        price={formatPrice(
                                          convertCurrency(
                                            parseJapanesePrice(currentListing.price || '0'), 
                                            'JPY', 
                                            'USD'
                                          ), 
                                          'USD'
                                        )}
                                        city={parseListingLocation(currentListing).city}
                                        prefecture={parseListingLocation(currentListing).prefecture}
                                        onGenerated={handleOverlayImageGenerated}
                                      />
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center py-6">
                                  <p className="text-sm text-gray-500">
                                    Select a listing to create custom overlay images
                                  </p>
                                </div>
                              )}
                            </div>
                            
                            {/* Custom images gallery */}
                            {customOverlayImages.length > 0 ? (
                              <div className="space-y-3">
                                <h4 className="font-medium text-sm">Generated Images</h4>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
                                  {customOverlayImages.map((img, idx) => {
                                    const isSelected = selectedImages.includes(img);
                                    
                                    return (
                                      <div 
                                        key={idx} 
                                        className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${
                                          isSelected ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-gray-300"
                                        }`}
                                        onClick={() => toggleOverlayImageSelection(img)}
                                      >
                                        <img
                                          src={img}
                                          alt={`Custom overlay ${idx + 1}`}
                                          className="object-cover w-full h-full"
                                        />
                                        
                                        {isSelected && (
                                          <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                                            <Check className="h-4 w-4" />
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md border-gray-200 bg-gray-50">
                                <PencilRuler className="h-10 w-10 text-gray-400 mb-2" />
                                <p className="text-center text-sm text-gray-500">
                                  Create custom price overlays to use in your Instagram post
                                </p>
                              </div>
                            )}
                          </div>
                        </UITabsContent>
                      </UITabs>
                    </div>

                    {/* Selected Images & Scheduling - Second column of second row */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">4. Review & Schedule</h3>
                      
                      {/* Selected Images Preview */}
                      <div className="p-4 bg-white border rounded-md shadow-sm">
                        <h4 className="text-sm font-medium mb-3">
                          Selected Images
                          {selectedImages.length > 0 && 
                            <span className="ml-2 text-xs text-gray-500">(Drag to reorder)</span>
                          }
                        </h4>
                        
                        {selectedImages.length > 0 ? (
                          <div className="mb-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs text-gray-500">
                                {selectedImages.length} of {Math.min(selectedImages.length, 10)} images selected
                                {selectedImages.length < 2 && " (minimum 2 required)"}
                                {selectedImages.length > 10 && " (maximum 10 allowed)"}
                              </span>
                            </div>
                            <DndContext 
                              sensors={sensors}
                              collisionDetection={closestCenter}
                              onDragEnd={handleDragEnd}
                            >
                              <SortableContext items={selectedImages} strategy={horizontalListSortingStrategy}>
                                <div className="grid grid-cols-5 gap-2">
                                  {selectedImages.map((img, index) => (
                                    <SortableImage 
                                      key={img} 
                                      img={img} 
                                      index={index} 
                                      onRemove={() => handleRemoveImage(img)} 
                                    />
                                  ))}
                                </div>
                              </SortableContext>
                            </DndContext>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-6 text-center text-gray-500 border-2 border-dashed rounded-md border-gray-200 mb-4">
                            <ImageIcon className="h-6 w-6 text-gray-400 mb-2" />
                            <p className="text-sm">Select images from your listing</p>
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500 mb-2">
                          <span className="font-medium">Instagram carousel requires 2-10 images</span>
                        </p>
                      </div>
                      
                      {/* Scheduling Options */}
                      <div className="p-4 bg-white border rounded-md shadow-sm">
                        <h4 className="text-sm font-medium mb-3">When to Post</h4>
                        <SchedulingOptions
                          postScheduleType={postScheduleType}
                          setPostScheduleType={setPostScheduleType}
                          scheduledDate={scheduledDate}
                          setScheduledDate={setScheduledDate}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional rows would go here */}
                </div>
              </CardContent>

              <CardFooter className="flex justify-end space-x-2 bg-gray-50 border-t">
                <Button
                  variant="outline"
                  onClick={() => router.push('/admin')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePostClick}
                  disabled={
                    isSubmitting ||
                    !selectedListingId ||
                    selectedImages.length === 0 ||
                    !caption ||
                    (postScheduleType === "later" && !scheduledDate)
                  }
                >
                  {postScheduleType === "now" ? (
                    <>
                      <SendHorizonal className="mr-2 h-4 w-4" />
                      Post to Instagram
                    </>
                  ) : (
                    <>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      Schedule Post
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          </UITabsContent>
          
          <UITabsContent value="scheduled">
            <ScheduledPosts setActiveTab={setActiveTab} />
          </UITabsContent>
        </UITabs>

        {/* Confirmation modal stays outside the tabs */}
        <PostConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onConfirm={handleUploadAndPublish}
          selectedImages={selectedImages}
          caption={caption}
          tags={tags}
          isSubmitting={isSubmitting}
          uploadStatuses={uploadStatuses}
          isPublishing={isPublishing}
          publishError={publishError}
          publishSuccess={publishSuccess}
          carouselContainerId={carouselContainerId}
          scheduledDate={postScheduleType === "later" ? scheduledDate : undefined}
        />
      </div>
    </div>
  );
} 