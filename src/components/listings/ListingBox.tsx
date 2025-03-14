"use client";
import Link from "next/link";
import { Home, Map, LayoutGrid } from "lucide-react";

import { useAppContext } from "@/AppContext";
import { Card } from "@/components/ui/card";
import {
  Currency,
  Listing,
  convertCurrency,
  formatPrice,
  parseJapanesePrice
} from "@/lib/listing-utils";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import Image from "next/image";
import { DetailCarousel } from "@/app/ListingCarousel";

const extractCityAndPrefecture = (address: string): string => {
  // Handle English addresses like "Shibuya, Tokyo"
  if (address.includes(",")) {
    const parts = address.split(",").map(part => part.trim());
    return parts.slice(0, 2).join(", ");
  }
  
  // Handle Japanese addresses which typically end with 県, 府, 都, or 市
  const prefectureMatch = address.match(/([^県都府]+)[県都府]/) || address.match(/(.+?市)/);
  if (prefectureMatch) {
    return prefectureMatch[1];
  }
  
  // Fallback: return first two parts or full address if can't parse
  const parts = address.split(/[,\s]/).filter(Boolean);
  return parts.slice(0, 2).join(" ") || address;
};

const generatePropertyTitle = (property: Listing): string => {
  const type = property.layout?.includes('LDK') ? 'House' : 'Property';
  const location = extractCityAndPrefecture(property.englishAddress || property.address);
  return `${type} in ${location}`;
};

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

export function ListingBox({ property, handleLightboxOpen }: { property: Listing, handleLightboxOpen: any }) {
  const { filterState } = useAppContext();
  const selectedCurrency = filterState.priceRange.currency || "USD";

  // Format price in millions
  const formatPriceWithCurrency = (priceStr: string, currency: Currency): string => {
    const priceJPY = parseJapanesePrice(priceStr);
    if (currency === 'JPY') {
      const millions = priceJPY / 1_000_000;
      return `¥${millions.toFixed(2)}M`;
    }
    const convertedPrice = convertCurrency(priceJPY, 'JPY', currency);
    return formatPrice(convertedPrice, currency);
  };

  const locationDisplay = extractCityAndPrefecture(property.englishAddress || property.address);
  const propertyTitle = generatePropertyTitle(property);

  return (
    <Link href={`/listings/view/${property.id}`}>
      <Card className="group h-full flex flex-col hover:shadow-md transition-shadow duration-200">
        <div className="relative w-full aspect-[16/9]">
          <Image
            src={property.listingImages?.[0] || '/placeholder-property.jpg'}
            alt={propertyTitle}
            fill
            priority
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-200"
            style={{ objectPosition: 'center' }}
          />
        </div>
        <div className="p-4 flex flex-col gap-2.5">
          <div className="flex justify-between items-start gap-2">
            <div className="flex flex-col min-w-0">
              <div className="text-xl font-bold truncate">
                {formatPriceWithCurrency(property.price, selectedCurrency)}
              </div>
              <div className="text-base font-medium text-gray-700 truncate">
                {propertyTitle}
              </div>
            </div>
            <div className="flex-shrink-0 pr-2">
              <FavoriteButton 
                listingId={property.id} 
                variant="ghost"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-4 text-gray-600">
              <div className="flex items-center gap-1.5">
                <Home className="h-4 w-4" />
                <span className="text-base">{property.buildArea}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Map className="h-4 w-4" />
                <span className="text-base">{property.landArea}</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-gray-600">
              <LayoutGrid className="h-4 w-4" />
              <span className="text-base">{property.floorPlan || property.layout}</span>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
