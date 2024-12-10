"use client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DetailCarousel } from "./ListingCarousel";
import {
  List as _List,
  ListProps,
  AutoSizer as _AutoSizer,
  AutoSizerProps,
} from "react-virtualized";

import { useAppContext } from "@/AppContext";
import NextJsImage from "@/components/ui/nextjsimage";
import { useLoadListings } from "@/hooks";
import { useCallback, FC } from "react";
import Lightbox from "yet-another-react-lightbox";
import { SLIDES } from "./fixtures";
import { useMediaQuery } from "usehooks-ts";

const List = _List as unknown as FC<ListProps>;
const AutoSizer = _AutoSizer as unknown as FC<AutoSizerProps>;

export function FilteredListingsBox() {
  console.log("LOADING");
  const listings = useLoadListings();
  const { listingState, displayState, setDisplayState } = useAppContext();

  const handleLightboxOpen = useCallback(
    (idx: number, sIdx: number) => {
      setDisplayState((draft) => {
        draft.lightboxListingIdx = [parseInt(idx), sIdx];
      });
    },
    [setDisplayState],
  );

  const filteredListings = listings.filter(
    (property) =>
      property.priceUsd < listingState.maxPrice &&
      parseInt(property.layout) >= listingState.minLDK,
  );
  // .map((p) => ({
  //   ...p,
  //   listingImages: p.listingImages.slice(0, 3),
  // }));

  const [listingsIdx, listingImageIdx = 0] =
    displayState.lightboxListingIdx ?? [];

  const lightboxSlides = (listings[listingsIdx]?.listingImages ?? [])
    .map((i, idx) => ({
      ...SLIDES[idx],
      src: i,
    }))
    .slice(0, 4);

  function rowRenderer({ index, key, style }) {
    return (
      <div style={style} key={key}>
        <ListingBox
          property={filteredListings[index]}
          handleLightboxOpen={handleLightboxOpen}
        />
      </div>
    );
  }

  console.log("am I re-rendering?");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <List
        height={750}
        rowCount={filteredListings.length}
        rowHeight={400}
        width={400}
        noRowsRenderer={() => (
          <h2>No listings. Try resetting your filters here</h2>
        )}
        rowRenderer={rowRenderer}
      />
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
  );
}

function ListingBox({ property, handleLightboxOpen }) {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const newTabProps = {
    // rel: "noopener noreferrer",
    // target: "_blank",
  };

  return (
    <Link href={`/listings/view/${property.id}`} {...newTabProps}>
      <div
        key={property.id}
        className="bg-background rounded-xl shadow-sm overflow-hidden border border-gray-200"
      >
        <DetailCarousel property={property} handleOpen={handleLightboxOpen} />
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
              <div className="text-lg font-bold">
                ${property.priceUsd.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                ¥{property.prices.toLocaleString()}
              </div>
            </div>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {property.layout} • {`${property.buildSqMeters} m²`}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {property.addresses}
          </div>
        </div>
      </div>
    </Link>
  );
}
