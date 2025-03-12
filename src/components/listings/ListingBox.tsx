"use client";
import Link from "next/link";


import { useAppContext } from "@/AppContext";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import {
  Currency,
  convertCurrency,
  formatPrice,
  parseJapanesePrice
} from "@/lib/listing-utils";
import { FavoriteButton } from "@/components/listings/FavoriteButton";

interface ListingBoxProps {
  property: {
    id: string;
    priceUsd: number;
    prices: string;
    layout: string;
    buildSqMeters: string;
    addresses: string;
    listingImages: string[];
  };
  handleLightboxOpen: (idx: number, sIdx: number) => void;
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
