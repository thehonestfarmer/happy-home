"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as React from "react";

import { MailIcon, Copy, LayoutGrid, Home, Map, DollarSign, Calendar, ArrowLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatArea, Currency, parseLayout, parseJapanesePrice, convertCurrency, formatPrice, EXCHANGE_RATES, CURRENCY_SYMBOLS } from "@/lib/listing-utils";
import { MapDisplay } from "@/components/map/MapPlaceholder";
import { useRouter } from "next/navigation";
import { Heart, Share, EyeOff } from "lucide-react";
import { useAppContext } from "@/AppContext";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useState, useEffect } from "react";
import { SignInModal } from "@/components/auth/SignInModal";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer, DrawerContent, DrawerHeader,
  DrawerTitle, DrawerDescription
} from "@/components/ui/drawer";
import { useMediaQuery } from "usehooks-ts";

// Extract year from arbitrary date strings
// Handles formats like "New construction unknown date: 1966" or "July 31, 1974"
const extractBuildYear = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';

  // First check for a 4-digit year anywhere in the string
  const yearMatch = dateString.match(/\b(19\d{2}|20\d{2})\b/);
  if (yearMatch) {
    return yearMatch[1];
  }

  // Try to extract a date using more formal patterns
  // Japanese era dates
  const japaneseEraMatch = dateString.match(/(令和|平成|昭和)(\d+)年/);
  if (japaneseEraMatch) {
    const [_, era, yearInEra] = japaneseEraMatch;
    let year = parseInt(yearInEra);

    // Convert Japanese era to western year
    if (era === '令和') { // Reiwa era (2019-present)
      year += 2018;
    } else if (era === '平成') { // Heisei era (1989-2019)
      year += 1988;
    } else if (era === '昭和') { // Showa era (1926-1989)
      year += 1925;
    }

    return year.toString();
  }

  // Regular date formats
  const dateRegex = /(\d{4})[-./](\d{1,2})[-./](\d{1,2})|(\d{1,2})[-./](\d{1,2})[-./](\d{4})|(\w+)\s+(\d{1,2}),\s+(\d{4})/;
  const match = dateString.match(dateRegex);

  if (match) {
    // YYYY.MM.DD format
    if (match[1]) return match[1];
    // MM/DD/YYYY format
    else if (match[6]) return match[6];
    // "Month DD, YYYY" format
    else if (match[9]) return match[9];
  }

  // If no year found, return the original string or a default
  return dateString.includes('unknown') ? 'Unknown' : dateString;
};

function ActionToolbar({ property }: { property: any }) {
  const { toast } = useToast();
  const { user, favorites, setFavorites } = useAppContext();
  const [isLoading, setIsLoading] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const supabase = createClientComponentClient();

  // Check if this listing is in favorites
  const isFavorited = favorites.includes(property.id);

  // Check if listing is hidden on component mount
  useEffect(() => {
    if (typeof window !== 'undefined' && property.id) {
      const hiddenListings = JSON.parse(localStorage.getItem('hiddenListings') || '[]');
      setIsHidden(hiddenListings.includes(property.id));
    }
  }, [property.id]);

  // Handle favorite toggle
  const handleFavoriteToggle = async () => {
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
          .eq('listing_id', property.id);

        setFavorites(favorites.filter(id => id !== property.id));

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
            listing_id: property.id,
          });

        setFavorites([...favorites, property.id]);

        toast({
          title: "Saved to favorites",
          description: "Property added to your saved listings",
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

  // Handle hide listing
  const handleHideListing = () => {
    if (typeof window !== 'undefined' && property.id) {
      const hiddenListings = JSON.parse(localStorage.getItem('hiddenListings') || '[]');

      if (isHidden) {
        // Remove from hidden
        const updatedHiddenListings = hiddenListings.filter((id: string) => id !== property.id);
        localStorage.setItem('hiddenListings', JSON.stringify(updatedHiddenListings));
        setIsHidden(false);
        toast({
          title: "Listing unhidden",
          description: "This property will now appear in your search results",
        });
      } else {
        // Add to hidden
        const updatedHiddenListings = [...hiddenListings, property.id];
        localStorage.setItem('hiddenListings', JSON.stringify(updatedHiddenListings));
        setIsHidden(true);
        toast({
          title: "Listing hidden",
          description: "This property won't appear in your search results",
        });
      }
    }
  };

  // Handle share listing
  const handleShareListing = async () => {
    const title = property.propertyTitle || property.address || 'Property Listing';
    const text = `Check out this property: ${title}`;
    const url = window.location.href;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url
        });
      } catch (error) {
        console.error('Error sharing:', error);
        // Fall back to copy link if sharing fails
        navigator.clipboard.writeText(url).then(() => {
          toast({
            title: "Link copied!",
            description: "The listing URL has been copied to your clipboard",
          });
        });
      }
    } else {
      // Fallback for browsers that don't support Web Share API
      navigator.clipboard.writeText(url).then(() => {
        toast({
          title: "Link copied!",
          description: "The listing URL has been copied to your clipboard",
        });
      });
    }
  };

  return (
    <>
      <div className="w-[95%] mx-auto p-2 px-4 mt-4 bg-muted/30 rounded-md border mb-3 flex gap-2 md:hidden justify-around">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleHideListing}
          className="flex flex-col items-center rounded-lg py-2 flex-1"
        >
          <EyeOff className={cn("h-5 w-5", isHidden ? "text-red-500" : "text-muted-foreground")} />
          <span className="text-xs mt-1">{isHidden ? "Unhide" : "Hide"}</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleFavoriteToggle}
          disabled={isLoading}
          className="flex flex-col items-center rounded-lg py-2 flex-1"
        >
          <Heart className={cn(
            "h-5 w-5",
            isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"
          )} />
          <span className="text-xs mt-1">Favorite</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShareListing}
          className="flex flex-col items-center rounded-lg py-2 flex-1"
        >
          <Share className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs mt-1">Share</span>
        </Button>
      </div>

      <SignInModal
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
      />
    </>
  );
}

function ActionButtons({ onCopy, onEmail }: {
  onCopy: () => void;
  onEmail: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 bg-background border-t md:hidden">
      <Button
        className="w-full"
        onClick={onEmail}
      >
        <MailIcon className="h-4 w-4 mr-2" />
        Contact Agent
      </Button>
    </div>
  );
}

export function PropertyDetailView({ property, selectedCurrency, hidePopup }: { property: any, selectedCurrency?: Currency, hidePopup?: boolean }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const handleMailto = React.useCallback(() => {
    const email = "thehonestfarmer@proton.me";
    const subject = "Property inquiry";
    const body = `I'm interested in learning more about this property ${property.address}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  }, [property]);

  const handleCopyLink = React.useCallback(() => {
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

  // Use propertyTitle as the main title if available, otherwise use address
  const propertyTitle = property.propertyTitle || (property.address ? property.address.split(",")[0] : "Property");
  const addressDisplay = property.address || "Address unavailable";
  const snapPoints = [0.5, 0.8, 1.1];
  const [snap, setSnap] = React.useState<number | string | null>(snapPoints[1]);
  const drawerContentRef = React.useRef<HTMLDivElement>(null);

  // Listen for scroll events on the listing images and snap drawer to smallest size
  React.useEffect(() => {
    const handleImageScroll = () => {
      // Always snap to the smallest size (first snap point) on any scroll event
      setSnap(snapPoints[0]);
    };

    // Add event listener for custom scroll event
    window.addEventListener('listing-images-scroll', handleImageScroll);

    // Cleanup
    return () => {
      window.removeEventListener('listing-images-scroll', handleImageScroll);
    };
  }, [snapPoints]);

  // Use the passed selectedCurrency or default to USD
  const currencyToUse = selectedCurrency || 'USD' as Currency;

  // Restore drawer state when navigating back from map view
  React.useEffect(() => {
    // Restore scroll position and drawer state from sessionStorage when component mounts
    if (typeof window !== 'undefined' && property.id) {
      try {
        const savedState = sessionStorage.getItem(`property-drawer-${property.id}`);
        if (savedState) {
          const { snapPoint, scrollTop } = JSON.parse(savedState);

          // Restore snap point (drawer height)
          if (snapPoint !== null && snapPoint !== undefined) {
            setSnap(snapPoint);
          }

          // Restore scroll position after a short delay to ensure drawer has rendered
          if (scrollTop && drawerContentRef.current) {
            setTimeout(() => {
              if (drawerContentRef.current) {
                drawerContentRef.current.scrollTop = scrollTop;
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error restoring drawer state:', error);
      }
    }
  }, [property.id]);

  // Extract property specs for subtitle
  const buildYear = extractBuildYear(property.buildDate);
  const layoutDisplay = parseLayout(property.layout);
  const buildAreaDisplay = property.buildSqMeters
    ? formatArea(property.buildSqMeters, currencyToUse, false).split(' ')[0]
    : 'N/A';
  const landAreaDisplay = property.landSqMeters
    ? formatArea(property.landSqMeters, currencyToUse, false).split(' ')[0]
    : 'N/A';
  const specsSubtitle = `${layoutDisplay} LDK · ${buildAreaDisplay}${currencyToUse === 'USD' ? 'ft²' : 'm²'} · ${buildYear}`;

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">View Property Details</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{propertyTitle}</DialogTitle>
            <DialogDescription>
              {specsSubtitle}
            </DialogDescription>
          </DialogHeader>
          <ListingDetailContent
            handleMailto={handleMailto}
            property={property}
            selectedCurrency={selectedCurrency}
            hidePopup={hidePopup}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // For mobile view, enhance the drawer header with price information
  const isSold = Boolean(property.isSold || property.isDetailSoldPresent);

  // Format price display for the title
  const getPriceDisplay = () => {
    const priceJPY = parseJapanesePrice(property.price ?? "0");
    const primaryPrice = currencyToUse === "JPY"
      ? `¥${(priceJPY / 1_000_000).toFixed(2)}M`
      : formatPrice(convertCurrency(priceJPY, "JPY", currencyToUse), currencyToUse);
    return primaryPrice;
  };

  const priceForTitle = getPriceDisplay();

  return (
    <>
      <Drawer
        open
        dismissible={false}
        snapPoints={snapPoints}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
      >
        <DrawerContent className="max-w-full h-full" showHandle={true}>
          {/* Using the built-in handle instead of custom indicator */}
          
          <DrawerHeader className="text-left">
            <DrawerTitle>
              <div className={isSold ? 'text-red-600' : ''}>
                <div className="text-xl font-bold">{priceForTitle}</div>
              </div>
            </DrawerTitle>
            <DrawerDescription>
              <span className="text-sm">{propertyTitle}</span>
            </DrawerDescription>
          </DrawerHeader>

          <div
            ref={drawerContentRef}
            className="flex-1 overflow-y-auto overflow-x-hidden w-full h-full pb-24"
          >
            <ListingDetailContent
              handleMailto={handleMailto}
              property={property}
              selectedCurrency={currencyToUse}
              drawerContentRef={drawerContentRef}
              snap={snap}
              hidePopup={hidePopup}
            />
          </div>
        </DrawerContent>
      </Drawer>
      <ActionButtons
        onCopy={handleCopyLink}
        onEmail={handleMailto}
      />
    </>
  );
}

function ListingDetailContent({ property, handleMailto, selectedCurrency = 'USD', drawerContentRef, snap, hidePopup }: {
  property: any,
  handleMailto: () => void,
  selectedCurrency?: Currency,
  drawerContentRef?: React.RefObject<HTMLDivElement>,
  snap?: number | string | null,
  hidePopup?: boolean
}) {
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

  const prices = getPriceDisplay();
  const isSold = Boolean(property.isSold || property.isDetailSoldPresent);

  // Extract build year from the buildDate string
  const buildYear = extractBuildYear(property.buildDate);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const router = useRouter();
  const addressDisplay = property.address || "Address unavailable";

  // Split address into main location and city/prefecture
  const formatAddress = (address: string) => {
    if (!address || address === "Address unavailable") {
      return { mainLocation: address, cityPrefecture: "" };
    }

    // Assuming address format with commas: specific location, city, prefecture
    const parts = address.split(',');

    if (parts.length <= 1) {
      return { mainLocation: address, cityPrefecture: "" };
    }

    // Take the last two parts (usually city and prefecture) for the second line
    const cityPrefecture = parts.slice(-2).join(', ').trim();
    // Take the remaining parts for the first line
    const mainLocation = parts.slice(0, -2).join(', ').trim();

    return {
      mainLocation: mainLocation || parts[0], // Fallback if splitting doesn't work as expected
      cityPrefecture
    };
  };

  const { mainLocation, cityPrefecture } = formatAddress(addressDisplay);

  const handleMapClick = () => {
    // Save current drawer state before navigating
    if (typeof window !== 'undefined' && drawerContentRef?.current && property.id) {
      try {
        const state = {
          snapPoint: snap,
          scrollTop: drawerContentRef.current.scrollTop
        };
        sessionStorage.setItem(`property-drawer-${property.id}`, JSON.stringify(state));
      } catch (error) {
        console.error('Error saving drawer state:', error);
      }
    }

    // Navigate to the full-screen map view with the property ID
    if (property.id) {
      router.push(`/map-view/${property.id}`);
    }
  };

  return (
    <div className="flex flex-col w-full h-full md:grid md:grid-cols-[240px_1fr] md:p-4">
      <div className={`bg-white rounded-lg shadow-sm ${isDesktop ? 'p-4' : 'p-2.5'} h-auto`}>
        {/* Property details with icons in a horizontal row */}
        <div className="grid grid-cols-4 gap-2 text-center py-1 max-w-full">
          {/* LDK */}
          <div className="flex flex-col items-center">
            <div className={`font-bold ${isDesktop ? 'text-base mb-1.5' : 'text-sm mb-1'}`}>
              {parseLayout(property.layout)} <span className="text-xs">LDK</span>
            </div>
            <LayoutGrid className="h-4 w-4 text-gray-500" />
          </div>

          {/* Build Area */}
          <div className="flex flex-col items-center">
            <div className={`font-bold ${isDesktop ? 'text-base mb-1.5' : 'text-sm mb-1'}`}>
              {property.buildSqMeters ? formatArea(property.buildSqMeters, selectedCurrency, false).split(' ')[0] : 'N/A'}
              <span className="text-xs"> {selectedCurrency === 'USD' ? 'ft²' : 'm²'}</span>
            </div>
            <Home className="h-4 w-4 text-gray-500" />
          </div>

          {/* Land Area */}
          <div className="flex flex-col items-center">
            <div className={`font-bold ${isDesktop ? 'text-base mb-1.5' : 'text-sm mb-1'}`}>
              {property.landSqMeters ? formatArea(property.landSqMeters, selectedCurrency, false).split(' ')[0] : 'N/A'}
              <span className="text-xs"> {selectedCurrency === 'USD' ? 'ft²' : 'm²'}</span>
            </div>
            <Map className="h-4 w-4 text-gray-500" />
          </div>

          {/* Year Built */}
          <div className="flex flex-col items-center">
            <div className={`font-bold ${isDesktop ? 'text-base mb-1.5' : 'text-sm mb-1'}`}>
              {buildYear}
            </div>
            <Calendar className="h-4 w-4 text-gray-500" />
          </div>
        </div>

        {/* Show sold badge if applicable */}
        {isSold && (
          <div className="mt-2 text-center">
            <Badge variant="destructive" className="px-2 py-0.5 text-sm">SOLD</Badge>
          </div>
        )}
      </div>

      <div className="flex flex-col flex-1 w-full h-full">
        {/* Map Display Section with Address moved above map */}
        <div className={`w-full ${isDesktop ? 'p-4' : 'p-3'} mb-3`}>
          <h2 className={`font-semibold text-black ${isDesktop ? 'text-lg mb-2' : 'text-base mb-1.5'} flex justify-between items-center`}>
            Property Location
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground flex items-center gap-1 h-7 px-2"
              onClick={handleMapClick}
            >
              View Map <ChevronRight className="h-4 w-4" />
            </Button>
          </h2>

          {/* Address display above the map - split into two rows */}
          <div className="mb-2 pl-1 flex flex-col">
            <span className="text-sm font-semibold">{mainLocation}</span>
            {cityPrefecture && (
              <span className="text-xs text-muted-foreground mt-0.5">{cityPrefecture}</span>
            )}
          </div>

          <div
            className="border rounded-md overflow-hidden h-[120px] relative cursor-pointer"
            onClick={handleMapClick}
          >
            {property.coordinates?.lat && property.coordinates?.long ? (
              <>
                <MapDisplay
                  listings={[property]}
                  singlePropertyMode={true}
                  showPropertyPopup={false}
                  currentRoute="/listings"
                  customZoom={10}
                  initialLatitude={property.coordinates?.lat}
                  initialLongitude={property.coordinates?.long}
                  maintainMapPosition={false}
                  useSimpleMarker={true}
                  hidePopup={hidePopup ?? true}
                />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors flex items-center justify-center">
                  {/* This div creates a subtle hover effect */}
                </div>
              </>
            ) : (
              <div className="h-full bg-muted/30 flex items-center justify-center flex-col gap-2">
                <p className="text-muted-foreground">Location coordinates not available</p>
              </div>
            )}
          </div>
        </div>

        {/* Add the ActionToolbar component here for mobile only */}
        {!isDesktop && <ActionToolbar property={property} />}

        {/* About this home section */}
        <div className={`bg-white w-full ${isDesktop ? 'p-4' : 'p-3'} mb-3`}>
          <h2 className={`font-semibold text-black ${isDesktop ? 'text-lg mb-2' : 'text-base mb-1.5'}`}>
            About this home
          </h2>
          {property.propertyCaption ? (
            <div className="text-muted-foreground bg-muted/30 border rounded-md p-3 min-h-[100px] overflow-y-auto">
              {property.propertyCaption.split('\n').map((paragraph: string, index: number) => (
                <p key={index} className={index > 0 ? 'mt-2' : ''}>
                  {paragraph}
                </p>
              ))}
            </div>
          ) : property.listingDetail ? (
            <ul className="list-disc pl-5 space-y-1.5 text-muted-foreground p-3 bg-muted/30 border rounded-md min-h-[100px]">
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
            <p className="text-muted-foreground p-3 bg-muted/30 border rounded-md min-h-[100px]">No details available for this property.</p>
          )}
        </div>


        {/* Tables Container - Scrollable if needed */}
        <div className={`w-full overflow-visible flex-1 ${isDesktop ? 'px-4' : 'px-3'}`}>
          {/* Facilities Section Header */}
          <h2 className={`font-semibold text-black ${isDesktop ? 'text-lg mb-2' : 'text-base mb-1.5'}`}>
            Property Facilities
          </h2>
          {/* Utilities Table */}
          <div className="border rounded-md overflow-hidden w-full mb-3">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-muted">
                  <th colSpan={2} className="px-3 py-1.5 text-left font-semibold">Utilities</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground w-1/3">Water</td>
                  <td className="px-3 py-1.5 truncate">{property.facilities?.water || 'Not specified'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground">Gas</td>
                  <td className="px-3 py-1.5 truncate">{property.facilities?.gas || 'Not specified'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground">Sewage</td>
                  <td className="px-3 py-1.5 truncate">{property.facilities?.sewage || 'Not specified'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Schools Table */}
          <div className="border rounded-md overflow-hidden w-full mb-3">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-muted">
                  <th colSpan={2} className="px-3 py-1.5 text-left font-semibold">Schools</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground w-1/3">Primary School</td>
                  <td className="px-3 py-1.5 truncate">{property.schools?.primary || 'Not specified'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground">Junior High</td>
                  <td className="px-3 py-1.5 truncate">{property.schools?.juniorHigh || 'Not specified'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Facilities Table - NEW */}
          <div className="border rounded-md overflow-hidden w-full mb-3">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-muted">
                  <th colSpan={2} className="px-3 py-1.5 text-left font-semibold">Facilities</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {/* Parking */}
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground w-1/3">Parking</td>
                  <td className="px-3 py-1.5 truncate">{property.facilities?.parking || property.parking || 'Not specified'}</td>
                </tr>
                {/* Internet/Broadband */}
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground">Internet</td>
                  <td className="px-3 py-1.5 truncate">{property.facilities?.internet || 'Not specified'}</td>
                </tr>
                {/* Structure Type */}
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground">Structure</td>
                  <td className="px-3 py-1.5 truncate">{property.structureType || 'Not specified'}</td>
                </tr>
                {/* Construction */}
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground">Construction</td>
                  <td className="px-3 py-1.5 truncate">{property.construction || 'Not specified'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Property Information Table */}
          <div className="border rounded-md overflow-hidden w-full mb-3">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-muted">
                  <th colSpan={2} className="px-3 py-1.5 text-left font-semibold">Property Information</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground w-1/3">Build Date</td>
                  <td className="px-3 py-1.5 truncate">{property.buildDate || 'Not specified'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-1.5 font-medium text-muted-foreground">Date Posted</td>
                  <td className="px-3 py-1.5 truncate">{property.dates?.datePosted || 'Not specified'}</td>
                </tr>
                {property.dates?.dateRenovated && (
                  <tr>
                    <td className="px-3 py-1.5 font-medium text-muted-foreground">Date Renovated</td>
                    <td className="px-3 py-1.5 truncate">{property.dates.dateRenovated}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Helper element to ensure visibility and debug */}
          <div className="h-8 w-full my-4 text-xs text-center text-muted-foreground border-t pt-2">
            End of property details
          </div>
        </div>
      </div>
    </div>
  );
} 