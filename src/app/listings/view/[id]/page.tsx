"use client";

import { useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import NextJsImage from "@/components/ui/nextjsimage";
import { DrawerDialogDemo } from "@/app/InquiryDialog";
import { useAppContext } from "@/AppContext";
import { useLoadListings } from "@/hooks";
import { Badge } from "@/components/ui/badge";
import { ShareIcon, Copy } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

/**
 * TODO: move to util once you can use netrw better
 * Determine the mobile operating system.
 * This function returns one of 'iOS', 'Android', 'Windows Phone', or 'unknown'.
 *
 * @returns {String}
 */
// function getMobileOperatingSystem() {
//   var userAgent = navigator.userAgent || navigator.vendor || window.opera;
//
//   // Windows Phone must come first because its UA also contains "Android"
//   if (/windows phone/i.test(userAgent)) {
//     return "Windows Phone";
//   }
//
//   if (/android/i.test(userAgent)) {
//     return "Android";
//   }
//
//   // iOS detection from: http://stackoverflow.com/a/9039885/177710
//   if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
//     return "iOS";
//   }
//
//   return "unknown";
// }

export default function Page() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const idNum = Number(params.id);
  const listings = useLoadListings();
  const property = listings[idNum];
  const { displayState, setDisplayState } = useAppContext();
  const [_, listingImageIdx = 0] = displayState.lightboxListingIdx ?? [];

  const handleLightboxOpen = useCallback(
    (idx: number, sIdx: number) => {
      setDisplayState((draft) => {
        draft.lightboxListingIdx = [idx, sIdx];
      });
    },
    [setDisplayState],
  );

  const lightboxSlides = (property.listingImages ?? []).map((i: string) => ({
    width: 3840,
    height: 5760,
    src: i,
  }));

  const handleMailto = useCallback(() => {
    const email = "hello@happyhome.com";
    const subject = "Property inquiry";
    const body = `I'm interested in learning more about this property ${property.addresses}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  }, [property.addresses]);

  const handleCopyLink = useCallback(() => {
    // Get the current URL
    const url = window.location.href;
    
    // Copy to clipboard
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied!",
        description: "The listing URL has been copied to your clipboard",
        duration: 3000,
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    });
  }, [toast]);

  // Mobile view
  if (typeof window !== 'undefined' && window.innerWidth < 1024) {
    return (
      <div className="pointer-events-auto overflow-y-auto">
        <div className="flex items-center h-14 px-4">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to search
          </Button>
        </div>
        <div className="space-y-2">
          {property.listingImages.map((image: string, index: number) => (
            <div key={index} className="relative w-full aspect-[4/3]">
              <Image
                src={image}
                alt={`Property view ${index + 1}`}
                fill
                priority={index < 2}
                className="object-cover"
                onClick={() => handleLightboxOpen(idNum, index)}
              />
            </div>
          ))}
        </div>
        <Lightbox
          open={displayState.lightboxListingIdx !== null}
          close={() => setDisplayState((draft) => { draft.lightboxListingIdx = null; })}
          slides={lightboxSlides}
          render={{ slide: NextJsImage }}
          index={listingImageIdx}
        />
        <DrawerDialogDemo property={property} />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="w-full">
      {/* Navigation Toolbar */}
      <div className="flex items-center justify-between h-14 px-4 border-b">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Button>
        <Button variant="outline" onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </Button>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-12 gap-1 h-[480px]">
        {/* Main large image */}
        <div className="col-span-8 relative">
          <Image
            src={property.listingImages[0]}
            alt="Main property view"
            fill
            priority
            className="object-cover cursor-pointer"
            onClick={() => handleLightboxOpen(idNum, 0)}
          />
        </div>

        {/* Right side grid */}
        <div className="col-span-4 grid grid-rows-2 gap-1">
          {property.listingImages.slice(1, 5).map((image: string, index: number) => (
            <div key={index} className="relative">
              <Image
                src={image}
                alt={`Property view ${index + 2}`}
                fill
                priority
                className="object-cover cursor-pointer"
                onClick={() => handleLightboxOpen(idNum, index + 1)}
              />
              {index === 3 && property.listingImages.length > 5 && (
                <div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center text-white cursor-pointer"
                  onClick={() => handleLightboxOpen(idNum, 4)}
                >
                  <span className="text-xl font-semibold">+{property.listingImages.length - 5} more</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-semibold">{property.addresses.split(",")[0]}</h1>
              <p className="text-muted-foreground">{property.addresses.split(",")[1]}</p>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="font-semibold">{parseInt(property.layout)}</div>
                <div className="text-sm text-muted-foreground">LDK</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{property.buildSqMeters}</div>
                <div className="text-sm text-muted-foreground">Build m²</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{property.landSqMeters}</div>
                <div className="text-sm text-muted-foreground">Land m²</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">3</div>
                <div className="text-sm text-muted-foreground">Parking</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold mb-2">About this home</h2>
              <p className="text-muted-foreground">
                {property.recommendedText.join(". ")}
              </p>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {property.tags.split(",").map((tag: string) => (
                <Badge key={tag} variant="outline" className="px-2 py-1">
                  {tag.trim()}
                </Badge>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className="p-6 border rounded-lg shadow-sm">
              <div className="text-3xl font-bold mb-2">
                ¥{(parseFloat(property.prices) * 1_000_000).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground mb-6">
                Est. ${Math.round(property.priceUsd).toLocaleString()} USD
              </div>
              <Button className="w-full mb-2">Contact Agent</Button>
              <Button variant="outline" className="w-full" onClick={handleMailto}>
                Email
              </Button>
            </div>

            {/* Agent Card */}
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-4">Listed By</h3>
              <div className="space-y-2">
                <p>Shiawase Home Reuse</p>
                <a 
                  href={property.listingDetail}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View Original Listing →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Lightbox
        open={displayState.lightboxListingIdx !== null}
        close={() => setDisplayState((draft) => { draft.lightboxListingIdx = null; })}
        slides={lightboxSlides}
        render={{ slide: NextJsImage }}
        index={listingImageIdx}
      />
    </div>
  );
}
// <Button variant="outline">
//   <HeartIcon />
// </Button>
