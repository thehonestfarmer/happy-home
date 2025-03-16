"use client";
import Link from "next/link";
import { Home, Map, LayoutGrid, Calendar, Clock } from "lucide-react";

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
  // Handle undefined or null addresses
  if (!address) return 'Unknown Location';
  
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
  const location = extractCityAndPrefecture(property.englishAddress || property.address || '');
  return `${type} in ${location}`;
};

// Extract a date from a string (works with various formats)
const extractDateFromString = (dateString: string | null | undefined): Date | null => {
  if (!dateString) return null;
  
  // First try to parse Japanese dates like "令和6年12月22日" or "平成6年12月22日"
  const japaneseEraMatch = dateString.match(/(令和|平成|昭和)(\d+)年(\d+)月(\d+)日/);
  if (japaneseEraMatch) {
    const [_, era, yearInEra, month, day] = japaneseEraMatch;
    let year = parseInt(yearInEra);
    
    // Convert Japanese era to western year
    if (era === '令和') { // Reiwa era (2019-present)
      year += 2018;
    } else if (era === '平成') { // Heisei era (1989-2019)
      year += 1988;
    } else if (era === '昭和') { // Showa era (1926-1989)
      year += 1925;
    }
    
    return new Date(year, parseInt(month) - 1, parseInt(day));
  }
  
  // Try to extract a date with common formats: YYYY.MM.DD, MM/DD/YYYY, YYYY/MM/DD, etc.
  const dateRegex = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})|(\d{1,2})[-./](\d{1,2})[-./](\d{4})|(\w+)\s+(\d{1,2}),\s+(\d{4})/;
  const match = dateString.match(dateRegex);
  
  if (match) {
    // Process YYYY.MM.DD format
    if (match[1] && match[2] && match[3]) {
      return new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    }
    // Process MM/DD/YYYY format
    else if (match[4] && match[5] && match[6]) {
      return new Date(parseInt(match[6]), parseInt(match[4]) - 1, parseInt(match[5]));
    }
    // Process "Month DD, YYYY" format
    else if (match[7] && match[8] && match[9]) {
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const monthIndex = months.findIndex(m => m.toLowerCase().startsWith(match[7].toLowerCase()));
      if (monthIndex !== -1) {
        return new Date(parseInt(match[9]), monthIndex, parseInt(match[8]));
      }
    }
  }
  
  // If no match, return null
  return null;
};

// Format date using the browser's locale
const formatDateStandardized = (date: Date | null | undefined): string => {
  if (!date) return 'Unknown';
  
  try {
    // Format the date according to the user's locale
    return date.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Unknown';
  }
};

// Format date as relative time (e.g., "4 days ago")
const formatRelativeTime = (date: Date | null | undefined): string => {
  if (!date) return 'Unknown';
  
  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    // Convert to appropriate time unit
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    const diffWeek = Math.floor(diffDay / 7);
    const diffMonth = Math.floor(diffDay / 30);
    const diffYear = Math.floor(diffDay / 365);
    
    // Handle future dates (shouldn't normally happen with listing dates)
    if (diffMs < 0) {
      return 'in the future';
    }
    
    // Format with appropriate unit
    if (diffSec < 60) {
      return diffSec === 1 ? '1 second ago' : `${diffSec} seconds ago`;
    } else if (diffMin < 60) {
      return diffMin === 1 ? '1 minute ago' : `${diffMin} minutes ago`;
    } else if (diffHour < 24) {
      return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
    } else if (diffDay < 7) {
      return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
    } else if (diffWeek < 4) {
      return diffWeek === 1 ? '1 week ago' : `${diffWeek} weeks ago`;
    } else if (diffMonth < 12) {
      return diffMonth === 1 ? '1 month ago' : `${diffMonth} months ago`;
    } else {
      return diffYear === 1 ? '1 year ago' : `${diffYear} years ago`;
    }
  } catch (error) {
    console.error('Error calculating relative time:', error);
    return 'Unknown';
  }
};

export function ListingBox({ property, handleLightboxOpen }: { property: Listing, handleLightboxOpen: any }) {
  const { filterState } = useAppContext();
  const selectedCurrency = filterState.priceRange.currency || "USD";

  // Format price in millions
  const formatPriceWithCurrency = (price: number | string, currency: Currency): string => {
    const priceJPY = typeof price === 'string' ? parseJapanesePrice(price) : price;
    if (currency === 'JPY') {
      const millions = priceJPY / 1_000_000;
      return `¥${millions.toFixed(2)}M`;
    }
    const convertedPrice = convertCurrency(priceJPY, 'JPY', currency);
    return formatPrice(convertedPrice, currency);
  };

  const locationDisplay = extractCityAndPrefecture(property.englishAddress || property.address || '');
  const propertyTitle = generatePropertyTitle(property);

  // Get formatted build date
  const formattedBuildDate = formatDateStandardized(
    extractDateFromString(property.buildDate)
  );

  // Format listed date as relative time
  const relativeListedDate = property.dates?.datePosted 
    ? formatRelativeTime(extractDateFromString(property.dates.datePosted))
    : 'N/A';

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

          <div className="space-y-3 mt-1">
            {/* First row: Layout, Build Area, Land Area */}
            <div className="grid grid-cols-3 justify-between items-center text-gray-600">
              <div className="flex items-center gap-1.5">
                <LayoutGrid className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">{property.floorPlan || property.layout}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-center">
                <Home className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">{property.buildSqMeters}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-end">
                <Map className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">{property.landSqMeters}</span>
              </div>
            </div>

            {/* Second row: Build Date, Listed Date */}
            <div className="grid grid-cols-2 justify-between items-center text-gray-600">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 flex-shrink-0" />
                <span className="text-sm truncate">Built: {formattedBuildDate}</span>
              </div>
              {property.dates?.datePosted ? (
                <div className="flex items-center gap-1.5 justify-end">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">Listed: {relativeListedDate}</span>
                </div>
              ) : (
                // Empty div to maintain grid layout when no date posted
                <div />
              )}
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
