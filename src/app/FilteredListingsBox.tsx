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

import { useAppContext } from "@/AppContext";
import NextJsImage from "@/components/ui/nextjsimage";
import { useLoadListings } from "@/hooks";
import { CSSProperties, FC, useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import {
  Currency,
  convertCurrency,
  formatPrice,
  parseJapanesePrice
} from "@/lib/listing-utils";
import { FavoriteButton } from "@/components/listings/FavoriteButton";

const List = _List as unknown as FC<ListProps>;
const AutoSizer = _AutoSizer as unknown as FC<AutoSizerProps>;

export function FilteredListingsBox() {
  const listings = useLoadListings();
  const { filterState, displayState, setDisplayState } = useAppContext();

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
        property.priceUsd < filterState.maxPrice &&
        parseInt(property.layout) >= filterState.minLDK &&
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

export function ListingBox({ property, handleLightboxOpen }: { property: any, handleLightboxOpen: any }) {
  const { filterState } = useAppContext();
  const selectedCurrency = filterState.priceRange.currency || "USD";

  const PriceDisplay = ({ prices, currency }: { prices: string; currency: Currency }) => {
    // Get the raw JPY amount
    const priceJPY = parseJapanesePrice(prices);
    // Convert to USD using the exchange rate
    const priceUSD = convertCurrency(priceJPY, "JPY", "USD");
    const secondaryPrice = ["USD", "JPY"].includes(currency) ? formatPrice(priceUSD, "USD") : formatPrice(convertCurrency(priceJPY, "JPY", currency), currency);

    return (
      <div className="space-y-1">
        <div className="font-medium">
          {secondaryPrice}
        </div>
      </div>
    );
  };

  return (
    <Link href={`/listings/view/${property.id}`}>
      <Card className="overflow-hidden">
        <div className="relative w-full aspect-[4/3]">
          <Image
            src={property.listingImages[0]}
            alt={`Property ${property.id}`}
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
            style={{ objectPosition: 'center' }}
          />
        </div>
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
              <div className="text-lg font-bold">
                ¥{property.prices.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                <PriceDisplay prices={property.prices} currency={selectedCurrency} />
              </div>
            </div>
            <FavoriteButton 
              listingId={property.id} 
              variant="ghost"
              size="sm"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {property.layout} • {`${property.buildSqMeters} m²`}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {property.addresses}
          </div>
        </div>
      </Card>
    </Link>
  );
}
