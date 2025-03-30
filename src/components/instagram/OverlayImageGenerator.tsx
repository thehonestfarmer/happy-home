import { useState, useRef, useEffect } from 'react';
import { Sparkles, Download, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface OverlayImageGeneratorProps {
  imageUrl: string;
  price: string;
  city?: string;
  prefecture?: string;
  onGenerated: (overlayImageUrl: string) => void;
  autoGeneratePriceOverlay?: (imageUrl: string, position?: 'top' | 'bottom') => Promise<string | undefined>;
}

export default function OverlayImageGenerator({ 
  imageUrl, 
  price, 
  city,
  prefecture,
  onGenerated,
  autoGeneratePriceOverlay 
}: OverlayImageGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [overlayPosition, setOverlayPosition] = useState<'top' | 'bottom'>('bottom');
  const [overlaySize, setOverlaySize] = useState<number>(100);
  const [corsError, setCorsError] = useState(false);
  const [attempts, setAttempts] = useState(0); // Track attempts to handle persistent CORS issues
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  // Reset CORS error state when the image URL changes
  useEffect(() => {
    setCorsError(false);
    setAttempts(0);
  }, [imageUrl]);
  
  // Generate overlay with current position
  const generateOverlay = async () => {
    if (!autoGeneratePriceOverlay || !imageUrl) {
      toast({
        title: "Error",
        description: "Cannot generate overlay. Missing required functionality.",
        variant: "destructive",
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log(`Generating overlay with position: ${overlayPosition}`);
      const dataUrl = await autoGeneratePriceOverlay(imageUrl, overlayPosition);
      
      if (dataUrl) {
        setPreviewUrl(dataUrl);
        onGenerated(dataUrl);
      } else {
        toast({
          title: "Error",
          description: "Failed to generate the image overlay.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error generating overlay:', error);
      toast({
        title: "Error",
        description: "Failed to generate the image overlay.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Update position and regenerate
  const updatePosition = (position: 'top' | 'bottom') => {
    console.log('Position changing to:', position);
    setOverlayPosition(position);
    
    if (previewUrl && !isGenerating && autoGeneratePriceOverlay) {
      setTimeout(() => generateOverlay(), 10);
    }
  };
  
  // Update size and regenerate
  const updateSize = (size: number) => {
    console.log('Size changing to:', size);
    setOverlaySize(size);
    
    if (previewUrl && !isGenerating && autoGeneratePriceOverlay) {
      setTimeout(() => generateOverlay(), 10);
    }
  };

  // Download the generated image
  const downloadImage = () => {
    if (!previewUrl) return;
    
    const link = document.createElement('a');
    link.href = previewUrl;
    link.download = `property-${price.replace(/[^0-9]/g, '')}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Price Overlay Generator</h3>
        {previewUrl && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={downloadImage}
            className="flex items-center gap-1"
          >
            <Download className="h-3 w-3" />
            Save
          </Button>
        )}
      </div>
      
      {corsError && (
        <div className="bg-amber-50 border border-amber-200 p-2 rounded-md flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-amber-800">
            The original image couldn't be accessed due to security restrictions. Using a property placeholder with price overlay instead.
          </p>
        </div>
      )}
      
      {/* Controls for overlay customization */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Position</label>
          <div className="grid grid-cols-2 gap-2">
            {(['top', 'bottom'] as const).map((pos) => (
              <button
                key={pos}
                className={cn(
                  "p-2 border rounded-md text-xs flex items-center justify-center h-10",
                  overlayPosition === pos 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-gray-200 hover:border-gray-300"
                )}
                onClick={() => {
                  console.log('Position button clicked:', pos);
                  updatePosition(pos);
                }}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Size: {overlaySize}%</label>
          <Slider
            value={[overlaySize]}
            min={50}
            max={150}
            step={5}
            onValueChange={(value) => {
              console.log('Size slider changed:', value[0]);
              updateSize(value[0]);
            }}
            className="my-3"
          />
        </div>
      </div>
      
      {/* Canvas for image generation (hidden) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      
      {/* Preview or generate button */}
      {previewUrl ? (
        <div className="relative rounded-md overflow-hidden border">
          <img 
            src={previewUrl} 
            alt="Preview with price overlay" 
            className="w-full h-auto object-contain" 
            style={{ maxHeight: '400px' }}
          />
          <div className="absolute bottom-2 right-2">
            <Button 
              size="sm" 
              onClick={() => {
                console.log('Regenerate button clicked with position:', overlayPosition);
                generateOverlay();
              }}
              disabled={isGenerating}
            >
              Regenerate
            </Button>
          </div>
        </div>
      ) : (
        <Button 
          className="w-full" 
          onClick={generateOverlay}
          disabled={isGenerating || !imageUrl || !autoGeneratePriceOverlay}
        >
          {isGenerating ? (
            <>Generating...</>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Price Overlay
            </>
          )}
        </Button>
      )}
    </div>
  );
}

// Function to analyze a region of the image for whitespace
const analyzeImageRegion = (imageData: ImageData, startY: number, height: number) => {
  const { data, width } = imageData;
  let totalBrightness = 0;
  let totalComplexity = 0;
  let edgeCount = 0;
  let houseFeatureScore = 0;
  let pixelCount = 0;
  
  // Sample pixels in the region (sparse sampling for performance)
  for (let y = startY; y < startY + height; y += 4) {
    for (let x = 0; x < width; x += 4) {
      const idx = (y * width + x) * 4;
      
      // Calculate brightness (0-255 range)
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      
      // Standard luminance formula
      const brightness = 0.299 * r + 0.587 * g + 0.114 * b;
      totalBrightness += brightness;
      
      // Calculate local complexity by checking difference with neighboring pixels
      if (x < width - 4 && y < startY + height - 4) {
        const rightIdx = (y * width + (x + 4)) * 4;
        const bottomIdx = ((y + 4) * width + x) * 4;
        
        const rightBrightness = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];
        const bottomBrightness = 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2];
        
        // Edge detection - higher difference means stronger edge
        const horizontalEdge = Math.abs(brightness - rightBrightness);
        const verticalEdge = Math.abs(brightness - bottomBrightness);
        const edgeStrength = horizontalEdge + verticalEdge;
        
        totalComplexity += edgeStrength;
        
        // Count significant edges (common in house features)
        if (edgeStrength > 20) {
          edgeCount++;
        }
        
        // Detect typical house colors and patterns
        // 1. Check for common house material colors (browns, grays, reds, etc.)
        const isHouseMaterialColor = 
          // Browns and tans (common in houses)
          (r > 100 && r < 200 && g > 80 && g < 180 && b > 50 && b < 150) ||
          // Grays (concrete, stone)
          (Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && r > 60 && r < 200) ||
          // Reds (brick)
          (r > 150 && g < 120 && b < 120) ||
          // Dark window colors
          (r < 80 && g < 80 && b < 80);
          
        // 2. Check for vertical/horizontal lines (common in architecture)
        const hasStructuralLine = horizontalEdge > 30 || verticalEdge > 30;
        
        // 3. Check for repeated patterns (like windows, bricks)
        // This is a simplified heuristic - real pattern detection would be more complex
        const hasRepeatedPattern = 
          x > 12 && y > 12 && 
          Math.abs(data[idx] - data[idx - (12 * 4)]) < 30 && 
          Math.abs(data[idx+1] - data[idx+1 - (12 * 4)]) < 30;
        
        // Combine house feature indicators
        if (isHouseMaterialColor) houseFeatureScore += 1.5;
        if (hasStructuralLine) houseFeatureScore += 1.0;
        if (hasRepeatedPattern) houseFeatureScore += 0.5;
      }
      
      pixelCount++;
    }
  }
  
  // Normalize scores (0-1)
  const avgBrightness = totalBrightness / (pixelCount * 255);
  const avgComplexity = totalComplexity / (pixelCount * 255 * 2); // Divide by 2 since we add two edge values
  const edgeDensity = edgeCount / pixelCount;
  const houseFeatureDensity = houseFeatureScore / pixelCount;
  
  // Calculate final score:
  // - Higher brightness (usually sky/background) is still somewhat good
  // - Lower complexity can be good BUT not if it's house-colored (might be walls)
  // - Lower edge density is better (fewer structural elements)
  // - Lower house feature density is much better (less likely to be house)
  
  // Combined score - inverse of house feature density is most important
  const score = 
    (avgBrightness * 0.2) +              // Mild preference for brighter areas
    ((1 - avgComplexity) * 0.1) +        // Mild preference for less complex areas
    ((1 - edgeDensity) * 0.3) +          // Stronger preference for fewer edges
    ((1 - houseFeatureDensity) * 0.4);   // Strongest preference for non-house areas
  
  return {
    brightness: avgBrightness,
    complexity: avgComplexity,
    edgeDensity,
    houseFeatureDensity,
    score
  };
}; 