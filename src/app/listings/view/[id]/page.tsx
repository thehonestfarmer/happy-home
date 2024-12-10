"use client";

import { DetailSlide } from "@/app/ListingCarousel";
import NextJsImage from "@/components/ui/nextjsimage";
import { useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";

import { DrawerDialogDemo } from "@/app/InquiryDialog";
import { useAppContext } from "@/AppContext";
import { useLoadListings } from "@/hooks";
import { useParams } from "next/navigation";

/**
 * TODO: move to util once you can use netrw better
 * Determine the mobile operating system.
 * This function returns one of 'iOS', 'Android', 'Windows Phone', or 'unknown'.
 *
 * @returns {String}
 */
function getMobileOperatingSystem() {
  var userAgent = navigator.userAgent || navigator.vendor || window.opera;

  // Windows Phone must come first because its UA also contains "Android"
  if (/windows phone/i.test(userAgent)) {
    return "Windows Phone";
  }

  if (/android/i.test(userAgent)) {
    return "Android";
  }

  // iOS detection from: http://stackoverflow.com/a/9039885/177710
  if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
    return "iOS";
  }

  return "unknown";
}

export default function Page() {
  const params = useParams<{ id: string }>();
  const listings = useLoadListings();
  const property = listings[params.id];
  const { displayState, setDisplayState } = useAppContext();
  const [_, listingImageIdx = 0] = displayState.lightboxListingIdx ?? [];

  const handleLightboxOpen = useCallback(
    (idx: number, sIdx: number) => {
      setDisplayState((draft) => {
        draft.lightboxListingIdx = [parseInt(idx), sIdx];
      });
    },
    [setDisplayState],
  );

  const lightboxSlides = (property.listingImages ?? []).map((i, idx) => ({
    width: 3840,
    height: 5760,
    src: i,
  }));

  return (
    <div className="pointer-events-auto overflow-y-auto">
      <div className="pointer-events-auto overflow-y-auto">
        {property.listingImages.map((li, idx) => (
          <DetailSlide
            key={li}
            className="mb-1"
            handleOpen={handleLightboxOpen}
            property={property}
            startIdx={idx}
          />
        ))}
        <Lightbox
          open={displayState.lightboxListingIdx !== null}
          close={() =>
            setDisplayState((draft) => {
              draft.lightboxListingIdx = null;
            })
          }
          slides={lightboxSlides}
          render={{ slide: NextJsImage }}
          index={listingImageIdx}
        />
      </div>
      <DrawerDialogDemo property={property} />
    </div>
  );
}
// <Button variant="outline">
//   <HeartIcon />
// </Button>
