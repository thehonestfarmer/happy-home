"use client";
import Link from "next/link";
<<<<<<< HEAD


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
=======
import Image from "next/image";
import { DetailCarousel } from "@/app/ListingCarousel";
>>>>>>> d3fb97d (wip)

interface ListingBoxProps {
  property: {
    id: string;
    priceUsd: number;
    price: string;
    layout: string;
    buildSqMeters: string;
    address: string;
    listingImages: string[];
  };
  handleLightboxOpen: (idx: number, sIdx: number) => void;
}

<<<<<<< HEAD
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
=======
export function ListingBox({ property, handleLightboxOpen }: ListingBoxProps) {
  console.log(property);
  return (
    <Link href={`/listings/view/${property.id}`}>
      <div className="bg-background rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <DetailCarousel
          property={property}
          handleOpenAction={handleLightboxOpen}
        />
        <div className="p-4 space-y-3">
          <div>
            <div className="text-2xl font-bold">
              ¥{property.price?.toLocaleString()}
            </div>
            <div className="text-gray-500">
              ${property.priceUsd.toLocaleString()}
            </div>
>>>>>>> d3fb97d (wip)
          </div>

          <div className="text-gray-600">
            {property.floorPlan} • {property.landArea} • {property.buildArea}
          </div>

          <div className="text-gray-500">
            {property.englishAddress}
          </div>
        </div>
      </Card>
    </Link>
  );
}
