"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as React from "react";

import { MailIcon, Copy, LayoutGrid, Home, Map, DollarSign, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatArea, Currency, parseLayout, parseJapanesePrice, convertCurrency, formatPrice, EXCHANGE_RATES, CURRENCY_SYMBOLS } from "@/lib/listing-utils";

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

function ActionButtons({ onCopy, onEmail }: { 
  onCopy: () => void;
  onEmail: () => void;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[60] p-4 bg-background border-t flex gap-2 md:hidden">
      <Button
        variant="outline"
        className="flex-1"
        onClick={onCopy}
      >
        <Copy className="h-4 w-4 mr-2" />
        Share
      </Button>
      <Button
        className="flex-1"
        onClick={onEmail}
      >
        <MailIcon className="h-4 w-4 mr-2" />
        Contact Agent
      </Button>
    </div>
  );
}

export function DrawerDialogDemo({ property }: { property: any }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
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
  const snapPoints = [0.5, 0.68, 1.12];
  const [snap, setSnap] = React.useState<number | string | null>(snapPoints[0]);
  
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
  
  // Get the selected currency from the property or default to USD
  const selectedCurrency = property.selectedCurrency || 'USD' as Currency;

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
              {addressDisplay}
            </DialogDescription>
          </DialogHeader>
          <ListingDetailContent
            handleMailto={handleMailto}
            property={property}
            selectedCurrency={selectedCurrency}
          />
        </DialogContent>
      </Dialog>
    );
  }

  // For mobile view, enhance the drawer header with price information
  const isSold = Boolean(property.isSold || property.isDetailSoldPresent);

  return (
    <>
      <Drawer
        open
        dismissible={false}
        snapPoints={snapPoints}
        activeSnapPoint={snap}
        setActiveSnapPoint={setSnap}
        // modal={false}
        // preventScrollRestoration={false}
      >
        <DrawerContent className="pb-[72px] max-w-full h-full">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              <div className={isSold ? 'text-red-600' : ''}>
                <div className="text-lg font-semibold">{propertyTitle}</div>
              </div>
            </DrawerTitle>
            <DrawerDescription>
              {addressDisplay}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full h-full">
            <ListingDetailContent 
              property={property} 
              handleMailto={handleMailto} 
              selectedCurrency={selectedCurrency} 
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

function ListingDetailContent({ property, handleMailto, selectedCurrency = 'USD' }: { 
  property: any, 
  handleMailto: () => void,
  selectedCurrency?: Currency 
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

  return (
    <div className="flex flex-col w-full h-full md:grid md:grid-cols-[240px_1fr] md:p-4">
      <div className={`bg-white rounded-lg shadow-sm ${isDesktop ? 'p-4' : 'p-2.5'} h-auto`}>
        {/* Price section (enhanced for mobile) */}
        <div className={`${isDesktop ? 'mb-4' : 'mb-2'} ${isSold ? 'text-red-600' : ''}`}>
          <div className="text-xl font-bold">{prices.primary}</div>
          <div className="text-sm text-muted-foreground">
            {prices.secondary} {prices.rate}
          </div>
          {isSold && (
            <div className="mt-1">
              <Badge variant="destructive" className="px-2 py-0.5 text-sm">SOLD</Badge>
            </div>
          )}
        </div>

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
      </div>

      <div className="flex flex-col flex-1 w-full h-full">
        {/* About this home section */}
        <div className={`bg-white w-full ${isDesktop ? 'p-4' : 'p-3'} mb-3`}>
          <h2 className={`font-semibold text-black ${isDesktop ? 'text-lg mb-2' : 'text-base mb-1.5'}`}>
            About this home
          </h2>
          {property.propertyCaption ? (
            <div className="text-muted-foreground bg-muted/30 border rounded-md p-3 min-h-[100px]">
              {property.propertyCaption}
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
        <div className={`w-full overflow-y-auto flex-1 ${isDesktop ? 'px-4' : 'px-3'}`}>
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
        </div>
      </div>
    </div>
  );
}
// <APIProvider apiKey={"AIzaSyDch1GvBut5KKB5iHrmayfPEGv9PHYgMLI"}>
//   <Map
//     style={{ width: "100vw", height: "450px" }}
//     defaultCenter={{ lat: 37.782979, lng: 139.05652 }}
//     defaultZoom={6}
//     gestureHandling={"greedy"}
//     disableDefaultUI={false}
//   >
//     <Marker position={{ lat: 37.782979, lng: 139.05652 }} />
//   </Map>
// </APIProvider>
