"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Copy, Heart } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import NextJsImage from "@/components/ui/nextjsimage";
import { DrawerDialogDemo } from "@/app/InquiryDialog";
import { useAppContext, DisplayState } from "@/AppContext";
import { useListings } from "@/contexts/ListingsContext";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FavoriteButton } from "@/components/listings/FavoriteButton";
import { Skeleton } from "@/components/ui/skeleton";
import type { Draft } from "immer";
import { parseJapanesePrice, convertCurrency, formatPrice, EXCHANGE_RATES, CURRENCY_SYMBOLS, Listing as ListingType, formatArea, parseLayout } from "@/lib/listing-utils";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { cn } from "@/lib/utils";
import { SignInModal } from "@/components/auth/SignInModal";

/**
 * Format date string to match buildDate format
 * @param dateStr The date string to format
 * @returns Formatted date string
 */
function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Not specified';
  
  // Try to extract a date with common formats: YYYY.MM.DD, MM/DD/YYYY, YYYY/MM/DD, etc.
  const dateRegex = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})|(\d{1,2})[-./](\d{1,2})[-./](\d{4})/;
  const match = dateStr.match(dateRegex);
  
  if (match) {
    // Process YYYY.MM.DD format
    if (match[1] && match[2] && match[3]) {
      return `${match[1]}.${match[2]}.${match[3]}`;
    }
    // Process MM/DD/YYYY format
    else if (match[4] && match[5] && match[6]) {
      return `${match[6]}.${match[4]}.${match[5]}`;
    }
  }
  
  // Try to parse Japanese dates like "令和6年12月22日" or "平成6年12月22日"
  const japaneseEraMatch = dateStr.match(/(令和|平成|昭和)(\d+)年(\d+)月(\d+)日/);
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
    
    return `${year}.${month}.${day}`;
  }
  
  // If no match, return the original string
  return dateStr;
}

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

function ListingPageSkeleton() {
  return (
    <div className="w-full">
      {/* Navigation Toolbar Skeleton */}
      <div className="flex items-center justify-between h-14 px-4 border-b">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>

      {/* Image Gallery Skeleton */}
      <div className="grid grid-cols-12 gap-1 h-[480px]">
        <div className="col-span-8">
          <Skeleton className="h-full w-full" />
        </div>
        <div className="col-span-4 grid grid-rows-2 gap-1">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-full w-full" />
          ))}
        </div>
      </div>

      {/* Content Section Skeleton */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            <div>
              <Skeleton className="h-8 w-3/4 mb-2" />
              <Skeleton className="h-6 w-1/2" />
            </div>
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="h-6 w-16 mx-auto mb-2" />
                  <Skeleton className="h-4 w-24 mx-auto" />
                </div>
              ))}
            </div>
            <div>
              <Skeleton className="h-6 w-40 mb-4" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

interface PropertyViewProps {
  property: ListingType;
  listingId: string;
}

function PropertyView({ property, listingId }: PropertyViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const { displayState, setDisplayState, filterState, user, favorites, setFavorites } = useAppContext();
  const [_, listingImageIdx = 0] = displayState.lightboxListingIdx ?? [];
  const selectedCurrency = filterState.priceRange.currency || "USD";
  const [showSignIn, setShowSignIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClientComponentClient();
  const [isMobile, setIsMobile] = useState(false);
  
  // Create refs at the top level - they'll be used only in mobile view
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastScrollPosition = useRef(0);
  const lastScrollTime = useRef(0);
  
  // Check if we're on mobile when component mounts
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMobile(window.innerWidth < 1024);
      
      // Hide header and construction banner on mobile for better UX
      if (window.innerWidth < 1024) {
        // Select the header and construction banner
        const header = document.querySelector('header');
        const constructionBanner = document.querySelector('div[class*="bg-amber-500"]');
        
        // Hide them on mobile for this page - use type casting for TypeScript
        if (header) (header as HTMLElement).style.display = 'none';
        if (constructionBanner) (constructionBanner as HTMLElement).style.display = 'none';
        
        // Restore them when component unmounts
        return () => {
          if (header) (header as HTMLElement).style.display = '';
          if (constructionBanner) (constructionBanner as HTMLElement).style.display = '';
        };
      }
    }
  }, []);
  
  // Function to handle scroll events with throttling - defined at top level
  const handleScroll = useCallback(() => {
    const now = Date.now();
    // Throttle to max once every 150ms for performance
    if (now - lastScrollTime.current > 150) {
      if (scrollRef.current) {
        const currentPosition = scrollRef.current.scrollTop;
        
        // Any scroll action (up or down) should collapse the drawer
        if (Math.abs(currentPosition - lastScrollPosition.current) > 10) {
          // Send event to collapse the drawer regardless of scroll direction
          window.dispatchEvent(new CustomEvent('listing-images-scroll'));
        }
        
        lastScrollPosition.current = currentPosition;
        lastScrollTime.current = now;
      }
    }
  }, []);
  
  const handleLightboxOpen = useCallback(
    (sIdx: number) => {
      setDisplayState({
        ...displayState,
        lightboxListingIdx: [parseInt(listingId), sIdx]
      });
    },
    [setDisplayState, listingId, displayState],
  );

  const lightboxSlides = (property.listingImages ?? []).map((i: string) => ({
    width: 3840,
    height: 5760,
    src: i,
  }));

  const handleMailto = useCallback(() => {
    const email = "thehonestfarmer@proton.me";
    const subject = "Property inquiry";
    const body = `I'm interested in learning more about this property ${property.address}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoUrl;
  }, [property.address]);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      toast({
        title: "Link copied!",
        description: "The listing URL has been copied to your clipboard",
        duration: 3000,
      });
    }).catch(() => {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
        duration: 3000,
      });
    });
  }, [toast]);

  // Format price display based on selected currency
  const getPriceDisplay = () => {
    // Use optional chaining and provide default values
    const priceJPY = parseJapanesePrice(property.price ?? "0");
    
    // Primary price in selected currency
    const primaryPrice = selectedCurrency === "JPY"
      ? `¥${(priceJPY / 1_000_000).toFixed(2)}M`
      : formatPrice(convertCurrency(priceJPY, "JPY", selectedCurrency), selectedCurrency);
    
    // Secondary price (always show JPY if another currency is selected, or USD if JPY is selected)
    const secondaryCurrency = selectedCurrency === "JPY" ? "USD" : "JPY";
    const secondaryPrice = secondaryCurrency === "JPY"
      ? `¥${(priceJPY / 1_000_000).toFixed(2)}M`
      : formatPrice(convertCurrency(priceJPY, "JPY", secondaryCurrency), secondaryCurrency);
    
    // Exchange rate
    const rate = selectedCurrency === "JPY" 
      ? `(¥${EXCHANGE_RATES.USD}/$)`
      : `(¥${EXCHANGE_RATES[selectedCurrency]}/${CURRENCY_SYMBOLS[selectedCurrency]}1)`;

    return {
      primary: primaryPrice,
      secondary: secondaryPrice,
      rate
    };
  };

  // Check if this listing is favorited
  const isFavorited = favorites.includes(listingId);
  
  // Handle favorite toggle
  const handleFavoriteToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      setShowSignIn(true);
      return;
    }

    setIsLoading(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('listing_id', listingId);
        
        setFavorites(favorites.filter(id => id !== listingId));
        
        toast({
          title: "Removed from favorites",
          description: "Property removed from your saved listings",
        });
      } else {
        // Add to favorites
        await supabase
          .from('user_favorites')
          .insert({
            user_id: user.id,
            listing_id: listingId,
          });
        
        setFavorites([...favorites, listingId]);
        
        toast({
          title: "Saved to favorites",
          description: "Property added to your saved listings",
          variant: "success",
        });
      }
    } catch (error) {
      console.error('Error updating favorite:', error);
      toast({
        title: "Error",
        description: "There was a problem updating your favorites",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Prepare values needed for both views
  const prices = getPriceDisplay();
  const isSold = Boolean(property.isSold || property.isDetailSoldPresent);

  // Mobile view rendering
  if (isMobile) {
    return (
      <div 
        ref={scrollRef}
        className="pointer-events-auto overflow-y-auto relative"
        onScroll={handleScroll}
      >
        {/* Fixed back button that stays visible while scrolling */}
        <div className="fixed top-4 left-4 z-50">
          <Button 
            variant="ghost"
            size="sm"
            onClick={() => router.push('/listings')}
            className="h-9 w-9 p-0 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center bg-black/20 hover:bg-black/30"
            aria-label="Back to listings"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </Button>
        </div>

        {/* Fixed favorite button in top right */}
        <div className="fixed top-4 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFavoriteToggle}
            disabled={isLoading}
            className="h-9 w-9 p-0 rounded-full backdrop-blur-sm shadow-sm flex items-center justify-center bg-black/20 hover:bg-black/30"
            aria-label={isFavorited ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart 
              className={cn(
                "h-5 w-5",
                isFavorited ? "fill-red-500 text-red-500" : "text-white"
              )}
            />
          </Button>
        </div>

        {/* Content with appropriate padding */}
        <div className="space-y-2">
          {property.listingImages?.map((image: string, index: number) => (
            <div key={index} className="relative w-full aspect-[4/3]">
              <Image
                src={image || '/placeholder-property.jpg'}
                alt={`Property view ${index + 1}`}
                fill
                priority={index < 2}
                className="object-cover"
                onClick={() => handleLightboxOpen(index)}
              />
              
              {index === 0 && isSold && (
                <div className="absolute top-4 right-4">
                  <Badge variant="destructive" className="px-3 py-1.5 text-base font-semibold">SOLD</Badge>
                </div>
              )}
            </div>
          ))}
        </div>
        
        <Lightbox
          open={displayState.lightboxListingIdx !== null}
          close={() => setDisplayState({
            ...displayState,
            lightboxListingIdx: null
          })}
          slides={lightboxSlides}
          render={{ slide: NextJsImage }}
          index={listingImageIdx}
        />
        <DrawerDialogDemo property={property} />
        
        {/* Sign in modal */}
        <SignInModal 
          isOpen={showSignIn} 
          onClose={() => setShowSignIn(false)}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="w-full">
      {/* Navigation Toolbar */}
      <div className="flex items-center justify-between h-14 px-4 border-b">
        <Button 
          variant="ghost" 
          onClick={() => router.push('/listings')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to search
        </Button>
        <Button variant="outline" onClick={handleCopyLink}>
          <Copy className="h-4 w-4 mr-2" />
          Copy Link
        </Button>
      </div>

      {/* Image Gallery */}
      <div className="grid grid-cols-12 gap-1 h-[480px]">
        {/* Main large image */}
        <div className="col-span-8 relative">
          <Image
            src={property.listingImages?.[0] || '/placeholder-property.jpg'}
            alt={property.propertyTitle || "Property image"}
            fill
            priority
            className="object-cover cursor-pointer"
            onClick={() => handleLightboxOpen(0)}
          />
          {isSold && (
            <div className="absolute top-6 right-6">
              <Badge variant="destructive" className="px-3 py-1.5 text-lg font-semibold shadow-md">SOLD</Badge>
            </div>
          )}
        </div>

        {/* Right side grid */}
        <div className="col-span-4 grid grid-rows-2 gap-1">
          {property.listingImages?.slice(1, 5).map((image: string, index: number) => (
            <div key={index} className="relative">
              <Image
                src={image || '/placeholder-property.jpg'}
                alt={`Property view ${index + 2}`}
                fill
                priority
                className="object-cover cursor-pointer"
                onClick={() => handleLightboxOpen(index + 1)}
              />
              {index === 3 && property.listingImages && property.listingImages.length > 5 && (
                <div 
                  className="absolute inset-0 bg-black/50 flex items-center justify-center text-white cursor-pointer"
                  onClick={() => handleLightboxOpen(4)}
                >
                  <span className="text-xl font-semibold">+{property.listingImages.length - 5} more</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="col-span-2 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{property.propertyTitle || property.address?.split(",")[0] || "Property"}</h1>
                <p className="text-muted-foreground">{property.address || "Address unavailable"}</p>
              </div>
            </div>

            {/* Key Features */}
            <div className="grid grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="font-semibold">{parseLayout(property.layout)}</div>
                <div className="text-sm text-muted-foreground">LDK</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{formatArea(property.buildSqMeters || '', selectedCurrency)}</div>
                <div className="text-sm text-muted-foreground">{selectedCurrency === 'USD' ? 'Build Area' : 'Build m²'}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{formatArea(property.landSqMeters || '', selectedCurrency)}</div>
                <div className="text-sm text-muted-foreground">{selectedCurrency === 'USD' ? 'Land Area' : 'Land m²'}</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">3</div>
                <div className="text-sm text-muted-foreground">Parking</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold mb-2">About this home</h2>
              {property.propertyCaption ? (
                <div className="text-muted-foreground whitespace-pre-line p-4 bg-muted/30 border rounded-md">
                  {property.propertyCaption}
                </div>
              ) : property.listingDetail ? (
                <ul className="list-disc pl-5 space-y-2 text-muted-foreground p-4 bg-muted/30 border rounded-md">
                  {property.listingDetail.split('★')
                    .filter((item: string) => item.trim().length > 0)
                    .map((item: string, index: number) => (
                      <li key={index} className="leading-relaxed">
                        {item.trim()}
                      </li>
                    ))
                  }
                </ul>
              ) : (
                <p className="text-muted-foreground p-4 bg-muted/30 border rounded-md">No details available for this property.</p>
              )}
            </div>

            {/* Utilities and Schools Tables */}
            <div className="mt-6">
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th colSpan={2} className="px-3 py-2 text-left font-semibold">Utilities</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2 font-medium text-muted-foreground w-1/3">Water</td>
                      <td className="px-3 py-2">{property.facilities?.water || 'Not specified'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-muted-foreground">Gas</td>
                      <td className="px-3 py-2">{property.facilities?.gas || 'Not specified'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-muted-foreground">Sewage</td>
                      <td className="px-3 py-2">{property.facilities?.sewage || 'Not specified'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th colSpan={2} className="px-3 py-2 text-left font-semibold">Schools</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2 font-medium text-muted-foreground w-1/3">Primary School</td>
                      <td className="px-3 py-2">{property.schools?.primary || 'Not specified'}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-muted-foreground">Junior High</td>
                      <td className="px-3 py-2">{property.schools?.juniorHigh || 'Not specified'}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              <div className="border rounded-md overflow-hidden mt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th colSpan={2} className="px-3 py-2 text-left font-semibold">Property Information</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="px-3 py-2 font-medium text-muted-foreground w-1/3">Build Date</td>
                      <td className="px-3 py-2">{formatDate(property.buildDate)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-medium text-muted-foreground">Date Posted</td>
                      <td className="px-3 py-2">{formatDate(property.dates?.datePosted)}</td>
                    </tr>
                    {property.dates?.dateRenovated && (
                      <tr>
                        <td className="px-3 py-2 font-medium text-muted-foreground">Date Renovated</td>
                        <td className="px-3 py-2">{formatDate(property.dates.dateRenovated)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Price Card */}
            <div className={`p-6 border rounded-lg shadow-sm ${isSold ? 'border-red-200 bg-red-50' : ''}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-3xl font-bold">
                    {prices.primary}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <span>{prices.secondary}</span>
                    <span className="text-xs">{prices.rate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <FavoriteButton listingId={listingId} />
                </div>
              </div>
              <Button 
                className="w-full mb-2" 
                onClick={handleMailto}
                disabled={isSold}
              >
                {isSold ? 'Property Unavailable' : 'Contact Agent'}
              </Button>
            </div>

            {/* Agent Card */}
            <div className="p-6 border rounded-lg">
              <h3 className="font-semibold mb-4">Listed By</h3>
              <div className="space-y-2">
                <p>Shiawase Home Reuse</p>
                <a 
                  href={property.listingDetailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  View Original Listing →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Lightbox
        open={displayState.lightboxListingIdx !== null}
        close={() => setDisplayState({
          ...displayState,
          lightboxListingIdx: null
        })}
        slides={lightboxSlides}
        render={{ slide: NextJsImage }}
        index={listingImageIdx}
      />
      
      {/* Sign in modal */}
      <SignInModal 
        isOpen={showSignIn} 
        onClose={() => setShowSignIn(false)}
      />
    </div>
  );
}

export default function Page() {
  const router = useRouter();
  const { listingsById, isLoading } = useListings();
  const params = useParams<{ id: string }>();
  
  if (isLoading) {
    return <ListingPageSkeleton />;
  }

  const property = listingsById[params.id];

  if (!property) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
          <h1 className="text-2xl font-bold">Property Not Found</h1>
          <p className="text-muted-foreground">The property you're looking for doesn't exist or has been removed.</p>
          <Button variant="outline" onClick={() => router.push('/listings')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Listings
          </Button>
        </div>
      </div>
    );
  }

  return <PropertyView property={property} listingId={params.id} />;
}
// <Button variant="outline">
//   <HeartIcon />
// </Button>
