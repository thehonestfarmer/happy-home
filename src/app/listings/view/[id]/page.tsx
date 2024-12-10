"use client";

import { DetailSlide } from "@/app/ListingCarousel";
import NextJsImage from "@/components/ui/nextjsimage";
import { FC, useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";

import { DrawerDialogDemo } from "@/app/InquiryDialog";
import { useAppContext } from "@/AppContext";
import { useLoadListings } from "@/hooks";
import { useParams } from "next/navigation";
import {
  List as _List,
  ListProps,
  AutoSizer as _AutoSizer,
  AutoSizerProps,
} from "react-virtualized";

const List = _List as unknown as FC<ListProps>;
const AutoSizer = _AutoSizer as unknown as FC<AutoSizerProps>;

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

  function rowRenderer({ index, key, style }) {
    return (
      <div style={style} key={key}>
        <DetailSlide
          property={property}
          handleOpen={handleLightboxOpen}
          startIdx={index}
        />
      </div>
    );
  }
  return (
    <div className="pointer-events-auto overflow-y-auto">
      <div className="pointer-events-auto overflow-y-auto h-screen">
        <AutoSizer>
          {({ width, height }) => {
            return (
              <List
                height={height}
                rowCount={property.listingImages.length}
                rowHeight={300}
                width={width}
                rowRenderer={rowRenderer}
              />
            );
          }}
        </AutoSizer>
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
    </div>
  );
}
// <Button variant="outline">
//   <HeartIcon />
// </Button>
