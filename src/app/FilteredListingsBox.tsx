"use client";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  AutoSizer as _AutoSizer,
  List as _List,
  AutoSizerProps,
  ListProps,
} from "react-virtualized";
import { DetailCarousel } from "./ListingCarousel";

import { DisplayState, useAppContext } from "@/AppContext";
import NextJsImage from "@/components/ui/nextjsimage";
import { useLoadListings } from "@/hooks";
import { CSSProperties, FC, useCallback } from "react";
import { useMediaQuery } from "usehooks-ts";
import Lightbox from "yet-another-react-lightbox";

const List = _List as unknown as FC<ListProps>;
const AutoSizer = _AutoSizer as unknown as FC<AutoSizerProps>;

export function FilteredListingsBox() {
  const listings = useLoadListings();
  const { listingState, displayState, setDisplayState } = useAppContext();

  const handleLightboxOpen = useCallback(
    (idx: number, sIdx: number) => {
      setDisplayState((draft) => {
        draft.lightboxListingIdx = [idx, sIdx];
      });
    },
    [setDisplayState],
  );

  const filteredListings = listings
    .filter(
      (property) =>
        property.priceUsd < listingState.maxPrice &&
        parseInt(property.layout) >= listingState.minLDK &&
        !property.isDetailSoldPresent,
    )
    .map((p) => ({
      ...p,
      listingImages: p.listingImages.slice(0, 3),
    }));

  const [listingsIdx, listingImageIdx = 0] =
    displayState.lightboxListingIdx ?? [];

  const lightboxSlides = (listings[listingsIdx]?.listingImages ?? [])
    .map((i: string) => ({
      src: i,
      width: 3840,
      height: 5760,
    }))
    .slice(0, 4);

  function rowRenderer({
    index,
    key,
    style,
  }: {
    index: number;
    key: string;
    style: CSSProperties;
  }) {
    return (
      <div style={style} key={key}>
        <ListingBox
          property={filteredListings[index]}
          handleLightboxOpen={handleLightboxOpen}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      <AutoSizer>
        {({ width, height }) => {
          return (
            <List
              height={height}
              rowCount={filteredListings.length}
              rowHeight={400}
              width={width}
              noRowsRenderer={() => (
                <h2>No listings. Try resetting your filters here</h2>
              )}
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
  );
}

function ListingBox({ property, handleLightboxOpen }) {
  return (
    <Link href={`/listings/view/${property.id}`}>
      <div
        key={property.id}
        className="bg-background rounded-xl shadow-sm overflow-hidden border border-gray-200"
      >
        <DetailCarousel
          property={property}
          handleOpenAction={handleLightboxOpen}
        />
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
