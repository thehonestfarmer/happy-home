import { useState } from 'react';
import Image from 'next/image';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Loader2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

interface UploadStatus {
  imageId?: string;
  imageUrl?: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  containerId?: string;
  errorMessage?: string;
}

function formatImageName(imageId: string): string {
  // Extract filename from path if it exists, otherwise use the ID
  const parts = imageId.split('/');
  return parts.length > 1 ? parts[parts.length - 1] : imageId;
}

interface PostConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  selectedImages: string[];
  caption: string;
  tags: string[];
  isSubmitting: boolean;
  uploadStatuses: UploadStatus[];
  isPublishing: boolean;
  publishError?: string;
  publishSuccess: boolean;
  carouselContainerId?: string | null;
}

export default function PostConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  selectedImages,
  caption,
  tags,
  isSubmitting,
  uploadStatuses,
  isPublishing,
  publishError,
  publishSuccess,
  carouselContainerId
}: PostConfirmationModalProps) {
  const [showFullCaption, setShowFullCaption] = useState(false);
  
  // Format the caption with hashtags for display
  const formattedTags = tags.map(tag => `#${tag}`).join(' ');
  const fullCaption = `${caption}\n\n${formattedTags}`;
  
  // Determine if uploads are complete and all uploads successful
  const allMediaContainersCreated = uploadStatuses.length > 0 && 
    uploadStatuses.every(status => status.status === 'success');
  
  // Determine if any uploads failed
  const hasFailedUploads = uploadStatuses.some(status => status.status === 'error');
  
  // Determine current step
  const currentStep = !isSubmitting ? 0 : // Not started
                     hasFailedUploads ? -1 : // Error state
                     (!allMediaContainersCreated) ? 1 : // Step 1: Creating media containers
                     (!carouselContainerId && !publishSuccess) ? 2 : // Step 2: Creating carousel container
                     (carouselContainerId && !publishSuccess) ? 3 : // Step 3: Publishing
                     4; // Success
  
  // Get the overall status text
  const getStatusText = () => {
    if (publishSuccess) return 'Posted successfully!';
    if (publishError) return 'Publishing failed';
    if (!isSubmitting) return 'Ready to start';
    if (hasFailedUploads) return 'Some uploads failed';
    
    // In progress statuses
    if (uploadStatuses.some(status => status.status === 'uploading')) 
      return 'Creating media containers...';
    if (allMediaContainersCreated && !carouselContainerId && isPublishing) 
      return 'Creating carousel container...';
    if (carouselContainerId && isPublishing) 
      return 'Publishing to Instagram...';
    
    // Ready states
    if (allMediaContainersCreated && !carouselContainerId && !isPublishing) 
      return 'Media containers created';
    if (carouselContainerId && !isPublishing && !publishSuccess) 
      return 'Ready to publish';
    
    return 'Processing...';
  };
  
  // Get button text based on state
  const getButtonText = () => {
    if (!isSubmitting) return 'Create Containers';
    if (hasFailedUploads) return 'Retry Failed Uploads';
    
    if (currentStep === 1 && isPublishing) return 'Creating Containers...';
    if (currentStep === 2 && !isPublishing) return 'Create Carousel Container';
    if (currentStep === 2 && isPublishing) return 'Creating Carousel...';
    if (currentStep === 3 && !isPublishing) return 'Publish to Instagram';
    if (currentStep === 3 && isPublishing) return 'Publishing...';
    
    return 'Processing...';
  };
  
  // Determine if button should be disabled
  const isButtonDisabled = () => {
    if (hasFailedUploads) return false; // Allow retry
    if (isPublishing) return true; // Disabled during any publishing action
    
    // Step 1: Creating media containers - always enabled to start
    if (currentStep === 0) return false;
    
    // Step 2: Creating carousel container - need all media containers to be successful
    if (currentStep === 2 && !allMediaContainersCreated) return true;
    
    // Step 3: Publishing - make sure carousel container ID exists before enabling
    if (currentStep === 3 && !carouselContainerId) return true;
    
    // Enable in all other valid cases
    return false;
  };
  
  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Allow closing the modal even on failure
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {publishSuccess 
              ? "Instagram Post Published!" 
              : publishError 
                ? "Instagram Publishing Failed" 
                : "Instagram Post Process"}
          </DialogTitle>
          <DialogDescription>
            {publishSuccess 
              ? "Your carousel has been successfully posted to Instagram" 
              : publishError 
                ? "There was an error publishing your post to Instagram" 
                : "Complete the 3-step process to post to Instagram"}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-hidden flex flex-col min-h-0">
          {/* Status indicator */}
          <div className={`mb-4 p-3 rounded-md flex items-center gap-3 ${
            publishSuccess ? 'bg-green-50 text-green-700 border border-green-200' :
            hasFailedUploads || publishError ? 'bg-red-50 text-red-700 border border-red-200' :
            isSubmitting ? 'bg-blue-50 text-blue-700 border border-blue-200' :
            'bg-gray-50 text-gray-700 border border-gray-200'
          }`}>
            {publishSuccess ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            ) : hasFailedUploads || publishError ? (
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
            ) : isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
            ) : (
              <span className="h-5 w-5 flex items-center justify-center flex-shrink-0">📸</span>
            )}
            
            <div className="flex-grow">
              <div className="font-medium">{getStatusText()}</div>
              {publishError && (
                <div className="text-sm mt-1">{publishError}</div>
              )}
            </div>
          </div>
          
          {/* Success celebration banner - only show when published successfully */}
          {publishSuccess && (
            <div className="mb-4 p-6 bg-green-50 border border-green-200 rounded-md text-center">
              <div className="flex justify-center mb-2">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
              </div>
              <h3 className="text-lg font-medium text-green-800 mb-1">Successfully Posted!</h3>
              <p className="text-green-600">Your carousel post has been published to Instagram</p>
              <div className="mt-3 flex justify-center">
                <a 
                  href={`https://www.instagram.com`} 
                  target="_blank"
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800 underline text-sm"
                >
                  View on Instagram
                </a>
              </div>
            </div>
          )}
          
          {/* Instagram workflow steps - hide when post is successful */}
          {!publishSuccess && (
            <div className="mb-4 bg-gray-50 p-3 rounded-md">
              <div className="font-medium mb-2">Instagram 3-Step Process</div>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li className={currentStep === 1 ? 'text-blue-600 font-medium' : currentStep > 1 ? 'text-green-600' : ''}>
                  Create individual media containers
                  {currentStep === 1 && isPublishing && <span className="text-blue-600 ml-2">(in progress...)</span>}
                  {currentStep > 1 && <CheckCircle2 className="h-3 w-3 inline-block ml-1 text-green-600" />}
                </li>
                <li className={currentStep === 2 ? 'text-blue-600 font-medium' : currentStep > 2 ? 'text-green-600' : ''}>
                  Create carousel container 
                  {currentStep === 2 && isPublishing && <span className="text-blue-600 ml-2">(in progress...)</span>}
                  {currentStep > 2 && <CheckCircle2 className="h-3 w-3 inline-block ml-1 text-green-600" />}
                </li>
                <li className={currentStep === 3 ? 'text-blue-600 font-medium' : currentStep > 3 ? 'text-green-600' : ''}>
                  Publish to Instagram
                  {currentStep === 3 && isPublishing && <span className="text-blue-600 ml-2">(in progress...)</span>}
                  {currentStep > 3 && <CheckCircle2 className="h-3 w-3 inline-block ml-1 text-green-600" />}
                </li>
              </ol>
            </div>
          )}
          
          {/* Caption preview */}
          <div className="mb-4 bg-gray-50 p-3 rounded-md">
            <div className="font-medium mb-2">Caption</div>
            <div className="text-sm whitespace-pre-wrap">
              {showFullCaption ? fullCaption : (
                <>
                  {caption.length > 120 ? `${caption.substring(0, 120)}...` : caption}
                  {tags.length > 0 && !showFullCaption && (
                    <span className="text-blue-600 block mt-1">
                      +{tags.length} tags
                    </span>
                  )}
                </>
              )}
            </div>
            {(fullCaption.length > 120 || tags.length > 0) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullCaption(!showFullCaption)}
                className="mt-2 h-auto py-1 px-2 text-xs"
              >
                {showFullCaption ? "Show less" : "Show more"}
              </Button>
            )}
          </div>
          
          {/* Image previews with upload status */}
          <div className="flex-grow min-h-0 overflow-hidden">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">Selected Images ({uploadStatuses.length})</div>
              {uploadStatuses.length > 0 && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span>{uploadStatuses.filter(s => s.status === 'success').length} of {uploadStatuses.length} uploaded</span>
                  <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-300 ease-in-out"
                      style={{ 
                        width: `${(uploadStatuses.filter(s => s.status === 'success').length / uploadStatuses.length) * 100}%` 
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <ScrollArea className="h-full pr-3 max-h-[260px]">
              {/* Grid view for images */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                {uploadStatuses.map((status: UploadStatus, index: number) => (
                  <div 
                    key={status.imageUrl || index} 
                    className={`bg-gray-50 p-3 rounded-md relative border ${
                      status.status === 'error' ? 'border-red-200' :
                      status.status === 'success' ? 'border-green-200' :
                      status.status === 'uploading' ? 'border-blue-200' : 
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-20 h-20 relative flex-shrink-0">
                        {status.imageUrl ? (
                          <Image
                            src={status.imageUrl}
                            alt="Image preview"
                            fill
                            style={{ objectFit: "cover" }}
                            className="rounded-sm"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 rounded-sm flex items-center justify-center">
                            <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col flex-grow">
                        <div className="text-sm font-medium truncate mb-1">
                          {status.imageId ? formatImageName(status.imageId) : "Loading..."}
                        </div>
                        <div className="flex items-center gap-2">
                          {status.status === 'pending' && (
                            <Badge variant="outline" className="text-xs">Pending</Badge>
                          )}
                          {status.status === 'uploading' && (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs flex items-center gap-1">
                              <Loader2 className="h-3 w-3 animate-spin" />
                              <span>Uploading</span>
                            </Badge>
                          )}
                          {status.status === 'success' && (
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Success</span>
                            </Badge>
                          )}
                          {status.status === 'error' && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 text-xs flex items-center gap-1">
                              <XCircle className="h-3 w-3" />
                              <span>Failed</span>
                            </Badge>
                          )}
                          {status.containerId && (
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                              ID: {status.containerId.substring(0, 6)}...
                            </Badge>
                          )}
                        </div>
                        {status.errorMessage && (
                          <div className="text-xs text-red-500 mt-1">
                            {status.errorMessage}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Empty state */}
              {uploadStatuses.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <span>No images selected yet</span>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
        
        <Separator className="my-4" />
        
        <DialogFooter>
          {publishError ? (
            <div className="flex gap-2 justify-end w-full">
              <Button 
                variant="outline" 
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button 
                onClick={onConfirm}
                className="gap-2"
              >
                <span>Retry Publishing</span>
                {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>
            </div>
          ) : publishSuccess ? (
            <div className="flex gap-2 justify-end w-full">
              <Button 
                variant="outline"
                onClick={onClose}
                className="gap-2"
              >
                <span>Create New Post</span>
              </Button>
              <Button 
                onClick={onClose}
                className="gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Done</span>
              </Button>
            </div>
          ) : (
            <div className="flex w-full justify-between">
              <Button 
                variant="outline" 
                onClick={onClose}
                disabled={isPublishing}
              >
                Cancel
              </Button>
              
              <Button 
                onClick={onConfirm}
                disabled={isButtonDisabled()}
                className="gap-2"
              >
                <span>{getButtonText()}</span>
                {isPublishing && <Loader2 className="h-4 w-4 animate-spin" />}
              </Button>
              {isButtonDisabled() && !isPublishing && (
                <div className="text-xs text-gray-500 mt-2 text-right">
                  {currentStep === 2 && !allMediaContainersCreated && "Waiting for all media containers to be created"}
                  {currentStep === 3 && !carouselContainerId && "Waiting for carousel container to be created"}
                </div>
              )}
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 