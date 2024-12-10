"use client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { DetailCarousel } from "./ListingCarousel";

import { useAppContext } from "@/AppContext";
import NextJsImage from "@/components/ui/nextjsimage";
import { useLoadListings } from "@/hooks";
import { useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";
import { SLIDES } from "./fixtures";
import { useMediaQuery } from "usehooks-ts";

export function FilteredListingsBox() {
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

  const [listingsIdx, listingImageIdx = 0] =
    displayState.lightboxListingIdx ?? [];

  const lightboxSlides = (listings[listingsIdx]?.listingImages ?? [])
    .map((i, idx) => ({
      ...SLIDES[idx],
      src: i,
    }))
    .slice(0, 10);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredListings.length ? (
        filteredListings
          .slice(0, 4)
          .map((property) => (
            <ListingBox
              key={property.id}
              property={property}
              handleLightboxOpen={handleLightboxOpen}
            />
          ))
      ) : (
        <h2>No listings. Try resetting your filters here</h2>
      )}
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
  const newTabProps = isDesktop
    ? {
        rel: "noopener noreferrer",
        target: "_blank",
      }
    : {};

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
