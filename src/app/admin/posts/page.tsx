"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, SendHorizonal, ImageIcon, AlertCircle, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ImageSelector from "@/components/instagram/ImageSelector";
import TagInput from "@/components/instagram/TagInput";
import { Separator } from "@/components/ui/separator";
import PostConfirmationModal from "@/components/instagram/PostConfirmationModal";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  MediaContainerResult, 
  createMediaContainers as createMediaContainersApi,
} from "@/server/instagram/api";
import SchedulingOptions from "@/components/instagram/SchedulingOptions";

// Define upload status type
interface UploadStatus {
  imageUrl: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  containerId?: string;
  error?: string;
}

interface ListingData {
  id: string;
  addresses: string;
  address?: string;
  tags: string[];
  details: string[];
  price: string;
  floorPlan: string;
  buildArea: string;
  landArea: string;
  listingDetailUrl?: string;
  listingImages?: string[];
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

export default function InstagramPostsPage() {
  const [listings, setListings] = useState<Record<string, ListingData>>({});
  const [filteredListings, setFilteredListings] = useState<Record<string, ListingData>>({});
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedListingId, setSelectedListingId] = useState<string>("");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [caption, setCaption] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState<boolean>(false);
  
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
  
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    fetchListings();
  }, []);

  // Reset selections when listing changes
  useEffect(() => {
    setSelectedImages([]);
  }, [selectedListingId]);

  // Filter listings when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      // If no search query, show all listings
      setFilteredListings(listings);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = Object.entries(listings).reduce((acc, [id, listing]) => {
      if ((listing.address || listing.addresses || '').toLowerCase().includes(query)) {
        acc[id] = listing;
      }
      return acc;
    }, {} as Record<string, ListingData>);

    setFilteredListings(filtered);
  }, [searchQuery, listings]);

  // Fetch available listings
  const fetchListings = async () => {
    setIsLoading(true);
    try {
      // Read from all-listings.json instead of API
      const response = await fetch('/batch_test_results.json');
      const data = await response.json();
      
      // Handle both old and new format
      const listingsData = data.newListings ? data.newListings : data;
        
      // Update the ID for each listing
      const listingsWithIds = Object.entries(listingsData).reduce((acc, [id, listing]) => {
        acc[id] = {
          ...listing as ListingData,
          id
        };
        return acc;
      }, {} as Record<string, ListingData>);
      
      setListings(listingsWithIds);
      setFilteredListings(listingsWithIds);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load listings",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get current listing
  const currentListing = selectedListingId ? listings[selectedListingId] : null;

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

  // Handle the actual upload and publish process
  const handleUploadAndPublish = async () => {
    try {
      // If already submitted
      if (isSubmitting) {
        // If we have a carousel container ID and not currently publishing or retrying after a failure
        if (carouselContainerId && (!isPublishing || publishError)) {
          // This is the third step - publishing the carousel
          await publishCarousel();
          return;
        }
        
        // If all media containers are created but no carousel container yet
        if (uploadStatuses.every(status => status.status === 'success') && !carouselContainerId && !isPublishing) {
          // This is the second step - creating the carousel container
          await createCarouselContainerFromMedia();
          return;
        }
        
        // Handle "Retry Failed Uploads" button click
        if (uploadStatuses.some(status => status.status === 'error')) {
          console.log('Retrying failed uploads');
          
          // Get only the failed image URLs
          const failedImageUrls = uploadStatuses
            .filter(status => status.status === 'error')
            .map(status => status.imageUrl)
            .filter(Boolean);
          
          console.log('Failed image URLs to retry:', failedImageUrls);
          
          if (failedImageUrls.length === 0) {
            console.warn('No failed uploads to retry');
            return;
          }
          
          // Mark failed uploads as uploading again
          setUploadStatuses(prevStatuses => 
            prevStatuses.map(status => ({
              ...status,
              status: status.status === 'error' ? 'uploading' as const : status.status
            }))
          );
          
          // Retry only the failed uploads
          try {
            console.log('Creating media containers for retry with URLs:', failedImageUrls);
            const results = await createMediaContainersViaApi(failedImageUrls);
            console.log('API retry response for media containers:', results);
            
            // Update only the statuses of the retried uploads
            setUploadStatuses(prevStatuses => {
              const newStatuses = [...prevStatuses];
              
              // Update each retried upload with its new status
              results.forEach((result) => {
                const index = newStatuses.findIndex(s => s.imageUrl === result.imageUrl);
                if (index !== -1) {
                  newStatuses[index] = {
                    ...newStatuses[index],
                    status: result.success ? 'success' as const : 'error' as const,
                    containerId: result.containerId,
                    error: result.error
                  };
                }
              });
              
              return newStatuses;
            });
            
            // Check if all uploads are now successful
            setTimeout(() => {
              const allSuccessful = uploadStatuses.every(status => status.status === 'success');
              if (allSuccessful) {
                // If all uploads are now successful, proceed to create carousel container
                createCarouselContainerFromMedia();
              }
            }, 100);
          } catch (error) {
            console.error('Error retrying uploads:', error);
            toast({
              title: "Retry Failed",
              description: error instanceof Error ? error.message : "Failed to retry uploads",
              variant: "destructive",
            });
          }
          
          return;
        }
        
        // Already in progress or waiting for containers to be created
        return;
      }
      
      // First step - reset states and start media container creation
      setIsSubmitting(true);
      setPublishError(undefined);
      setPublishSuccess(false);
      setCarouselContainerId(null);
      
      // Get image URLs to upload - add debugging to see what's happening
      console.log('Selected image IDs:', selectedImages);
      console.log('Available listing images:', listings[selectedListingId]?.listingImages);
      
      // Get full URLs for selected images
      const imageUrls = selectedImages
        .map(imageId => {
          // Find the full URL from the listing images
          const fullUrl = listings[selectedListingId]?.listingImages?.find(img => img === imageId);
          console.log(`Mapping image ID ${imageId} to URL: ${fullUrl}`);
          return fullUrl || '';
        })
        .filter(url => url !== '');
      
      console.log('Mapped image URLs for upload:', imageUrls);
      
      // Update status to uploading for all
      setUploadStatuses(prevStatuses => 
        prevStatuses.map(status => ({
          ...status,
          status: 'uploading' as const
        }))
      );
      
      // Step 1: Create individual media containers
      try {
        // API call to create media containers
        console.log('Creating media containers with URLs:', imageUrls);
        const results = await createMediaContainersViaApi(imageUrls);
        console.log('API response for media containers:', results);
        
        // Update statuses based on results
        const newStatuses = results.map((result) => ({
          imageUrl: result.imageUrl,
          status: result.success ? 'success' as const : 'error' as const,
          containerId: result.containerId,
          error: result.error
        }));
        
        console.log('New upload statuses after container creation:', newStatuses);
        setUploadStatuses(newStatuses);
        
        // Check if all uploads were successful
        const allSuccessful = newStatuses.every(status => status.status === 'success');
        
        if (allSuccessful) {
          // Directly pass the new statuses to avoid timing issues with state updates
          await createCarouselContainerFromMedia(newStatuses);
        }
      } catch (error) {
        console.error('Error creating containers:', error);
        
        // Mark all as failed
        setUploadStatuses(prevStatuses => 
          prevStatuses.map(status => ({
            ...status,
            status: 'error' as const,
            error: error instanceof Error ? error.message : 'Failed to create containers'
          }))
        );
      }
    } catch (error) {
      console.error('Error in upload and publish process:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred during the upload process",
        variant: "destructive",
      });
    }
  };
  
  // Step 2: Create a carousel container from media containers via API
  const createCarouselContainerFromMedia = async (statusesToUse?: UploadStatus[]) => {
    try {
      // Use provided statuses or fall back to the state
      const currentStatuses = statusesToUse || uploadStatuses;
      console.log('Current upload statuses before creating carousel:', currentStatuses);
      
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
      const fullCaption = caption + (formattedTags ? `\n\n${formattedTags}` : '');
      
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
        
        // Optionally refetch listings to ensure data is fresh
        fetchListings();
        
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

      // Update the caption and tags with the generated content
      setCaption(result.data.caption);
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Instagram Posts</h1>
        <Button variant="outline" onClick={() => router.push('/admin')}>
          Back to Admin
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Create New Post</CardTitle>
          <CardDescription>
            Select a listing, choose photos, and add a caption to post to Instagram
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Row */}
            <div className="space-y-6">
              {/* Left Top: Listing Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search by Address</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Type to search for a property..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={isLoading || isSubmitting}
                />
              </div>
            
              {/* Listing selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Listing</label>
                <Select
                  value={selectedListingId}
                  onValueChange={setSelectedListingId}
                  disabled={isLoading || isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a listing" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(filteredListings).map(([id, listing]) => (
                      <SelectItem key={id} value={id}>
                        {listing.addresses}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Display the selected listing details */}
              {currentListing && (
                <div className="bg-muted/40 p-4 rounded-md space-y-2">
                  <div className="flex justify-between">
                    <h3 className="font-medium">{currentListing.addresses}</h3>
                    <span className="text-primary">{currentListing.price}</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {currentListing.details?.join(' ')}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {(Array.isArray(currentListing.tags) ? currentListing.tags : []).map((tag, index) => (
                      <span key={index} className="bg-muted text-xs px-2 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Top: Caption, Hashtags, and Scheduling Options */}
            <div className="space-y-6">
              {/* Caption */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">Caption</label>
                  <span className="text-xs text-gray-500">
                    {caption.length}/2200 characters
                  </span>
                </div>
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="outline"
                      className="mb-2" 
                      onClick={handleGenerateCaption}
                      disabled={isGeneratingCaption || !selectedListingId}
                    >
                      {isGeneratingCaption ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>Auto-generate caption & hashtags</>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Write a detailed caption for your Instagram post. Describe the property's key features, location benefits, and unique selling points."
                    className="min-h-[150px]"
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    disabled={isSubmitting || isGeneratingCaption}
                    maxLength={2200}
                  />
                </div>
              </div>

              {/* Tags */}
              <TagInput
                tags={tags}
                onChange={setTags}
                label="Hashtags"
                placeholder="Add hashtags (press Enter after each tag)"
              />

              {/* Scheduling Options */}
              <SchedulingOptions
                postScheduleType={postScheduleType}
                setPostScheduleType={setPostScheduleType}
                scheduledDate={scheduledDate}
                setScheduledDate={setScheduledDate}
              />
            </div>
          </div>

          {/* Bottom Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Left Bottom: Image Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Select Images for Post</label>
                {selectedImages.length > 0 && (
                  <span className="text-sm font-medium text-green-600">
                    Selected: {selectedImages.length} 
                    {selectedImages.length === 1 ? " image" : " images"}
                  </span>
                )}
              </div>
              
              {currentListing?.listingImages ? (
                <ImageSelector
                  key={`image-selector-${selectedListingId}`}
                  images={currentListing.listingImages}
                  onSelectionChange={setSelectedImages}
                  initialSelectedImages={selectedImages}
                  maxHeight="500px"
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
            </div>

            {/* Right Bottom: Selected Images Preview */}
            <div className="space-y-4">
              <div className="p-4 bg-white border rounded-md shadow-sm h-full">
                <h3 className="text-lg font-medium mb-3">Selected Images</h3>
                
                {selectedImages.length > 0 ? (
                  <>
                    {/* Selected images preview */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-2">
                        {selectedImages.map((img, index) => (
                          <div 
                            key={index} 
                            className="relative h-28 w-28 rounded-md overflow-hidden border border-gray-200"
                          >
                            <img 
                              src={img} 
                              alt={`Selected ${index + 1}`} 
                              className="object-cover w-full h-full"
                            />
                            <div className="absolute top-1 left-1 bg-black/70 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                              {index + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-2">
                        <span className="font-medium">Instagram Requirements:</span>
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1 list-disc pl-4">
                        <li>2-10 images for carousel posts</li>
                        <li>1:1 square ratio recommended</li>
                        <li>Maximum 2200 characters in caption</li>
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center p-8 text-center text-gray-500 border-2 border-dashed rounded-md border-gray-200">
                    <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                    <p>Select images from your listing to create an Instagram post</p>
                  </div>
                )}
              </div>
            </div>
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
                <Clock className="mr-2 h-4 w-4" />
                Schedule Post
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
      
      {/* Instagram post confirmation modal */}
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
  );
} 