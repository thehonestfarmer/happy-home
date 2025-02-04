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
      <div className="flex items-center h-14 px-4 border-b">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
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
            <div 
              key={index} 
              className="relative"
            >
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
// <Button variant="outline">
//   <HeartIcon />
// </Button>
