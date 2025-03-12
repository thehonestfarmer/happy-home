import { useState } from 'react';
import Image from 'next/image';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ImageSelectorProps {
  images: string[];
  onSelectionChange: (selectedImages: string[]) => void;
  initialSelectedImages?: string[];
  maxSelection?: number;
  maxHeight?: string;
}

/**
 * A component for selecting multiple images from a scrollable grid
 */
export default function ImageSelector({
  images,
  onSelectionChange,
  initialSelectedImages = [],
  maxSelection = 10,
  maxHeight = '400px'
}: ImageSelectorProps) {
  const [selectedImages, setSelectedImages] = useState<string[]>(initialSelectedImages);
  
  const toggleImageSelection = (imageUrl: string) => {
    let newSelectedImages;
    
    if (selectedImages.includes(imageUrl)) {
      // Remove image if already selected
      newSelectedImages = selectedImages.filter(url => url !== imageUrl);
    } else {
      // Add image if not at max selection
      if (selectedImages.length >= maxSelection) {
        return;
      }
      newSelectedImages = [...selectedImages, imageUrl];
    }
    
    setSelectedImages(newSelectedImages);
    onSelectionChange(newSelectedImages);
  };
  
  const clearSelection = () => {
    setSelectedImages([]);
    onSelectionChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">
          Select Images ({selectedImages.length}/{maxSelection})
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {images.length} photos available
          </span>
          {selectedImages.length > 0 && (
            <button
              onClick={clearSelection}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="h-4 w-4" />
              Clear selection
            </button>
          )}
        </div>
      </div>
      
      {images.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          No images available for this listing
        </div>
      ) : (
        <ScrollArea className={`border rounded-md p-2`} style={{ height: maxHeight }}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 p-1">
            {images.map((imageUrl, index) => {
              const isSelected = selectedImages.includes(imageUrl);
              
              return (
                <div 
                  key={`${imageUrl}-${index}`} 
                  className={cn(
                    "relative aspect-square rounded-md overflow-hidden cursor-pointer border-2",
                    isSelected ? "border-primary ring-2 ring-primary" : "border-transparent hover:border-gray-300"
                  )}
                  onClick={() => toggleImageSelection(imageUrl)}
                >
                  <Image
                    src={imageUrl}
                    alt={`Listing image ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
                  />
                  
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                  )}
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 text-center">
                    {index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
} 