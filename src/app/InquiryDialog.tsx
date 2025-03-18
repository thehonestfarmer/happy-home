"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import * as React from "react";

import { MailIcon, Copy, LayoutGrid, Home, Map, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatArea, Currency, parseLayout } from "@/lib/listing-utils";

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
  const snapPoints = [0.6, 0.96];
  const [snap, setSnap] = React.useState<number | string | null>(snapPoints[0]);
  
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
        <DrawerContent className="pb-[72px] max-w-full">
          <DrawerHeader className="text-left">
            <DrawerTitle>
              <div>
                <div className="text-lg font-semibold">{propertyTitle}</div>
              </div>
            </DrawerTitle>
            <DrawerDescription>
              {addressDisplay}
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="flex-1 overflow-y-auto overflow-x-hidden w-full">
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
  return (
    <div className="flex flex-col w-full max-w-full md:grid md:grid-cols-[240px_1fr] md:p-4">
      <div className="p-4 bg-white rounded-lg shadow-sm">
        {/* Property details with icons in a horizontal row */}
        <div className="grid grid-cols-4 gap-3 text-center py-2 max-w-full">
          {/* Price */}
          <div className="flex flex-col items-center">
            <div className="text-base font-bold mb-1.5">
              {property.priceUsd 
                ? `$${(Math.round(property.priceUsd / 1000) * 1000).toLocaleString()}`
                : property.price || 'N/A'
              }
            </div>
            <DollarSign className="h-5 w-5 text-gray-500" />
          </div>
          
          {/* LDK */}
          <div className="flex flex-col items-center">
            <div className="text-base font-bold mb-1.5">
              {parseLayout(property.layout)} <span className="text-xs">LDK</span>
            </div>
            <LayoutGrid className="h-5 w-5 text-gray-500" />
          </div>
          
          {/* Build Area */}
          <div className="flex flex-col items-center">
            <div className="text-base font-bold mb-1.5">
              {property.buildSqMeters ? formatArea(property.buildSqMeters, selectedCurrency, false).split(' ')[0] : 'N/A'}
              <span className="text-xs"> {selectedCurrency === 'USD' ? 'ft²' : 'm²'}</span>
            </div>
            <Home className="h-5 w-5 text-gray-500" />
          </div>
          
          {/* Land Area */}
          <div className="flex flex-col items-center">
            <div className="text-base font-bold mb-1.5">
              {property.landSqMeters ? formatArea(property.landSqMeters, selectedCurrency, false).split(' ')[0] : 'N/A'}
              <span className="text-xs"> {selectedCurrency === 'USD' ? 'ft²' : 'm²'}</span>
            </div>
            <Map className="h-5 w-5 text-gray-500" />
          </div>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden w-full">
        <div className="p-4 bg-white w-full">
          <h2 className="text-lg font-semibold text-black mb-2">
            About this home
          </h2>
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

        {/* Utilities and Schools Table */}
        <div className="p-4 pt-0 w-full max-w-full">
          <div className="border rounded-md overflow-hidden w-full max-w-full">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-muted">
                  <th colSpan={2} className="px-3 py-2 text-left font-semibold">Utilities</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-2 font-medium text-muted-foreground w-1/3">Water</td>
                  <td className="px-3 py-2 truncate">{property.facilities?.water || 'Not specified'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-muted-foreground">Gas</td>
                  <td className="px-3 py-2 truncate">{property.facilities?.gas || 'Not specified'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-muted-foreground">Sewage</td>
                  <td className="px-3 py-2 truncate">{property.facilities?.sewage || 'Not specified'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border rounded-md overflow-hidden mt-4 w-full">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-muted">
                  <th colSpan={2} className="px-3 py-2 text-left font-semibold">Schools</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-2 font-medium text-muted-foreground w-1/3">Primary School</td>
                  <td className="px-3 py-2 truncate">{property.schools?.primary || 'Not specified'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-muted-foreground">Junior High</td>
                  <td className="px-3 py-2 truncate">{property.schools?.juniorHigh || 'Not specified'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="border rounded-md overflow-hidden mt-4 w-full">
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-muted">
                  <th colSpan={2} className="px-3 py-2 text-left font-semibold">Property Information</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr>
                  <td className="px-3 py-2 font-medium text-muted-foreground w-1/3">Build Date</td>
                  <td className="px-3 py-2 truncate">{property.buildDate || 'Not specified'}</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium text-muted-foreground">Date Posted</td>
                  <td className="px-3 py-2 truncate">{property.dates?.datePosted || 'Not specified'}</td>
                </tr>
                {property.dates?.dateRenovated && (
                  <tr>
                    <td className="px-3 py-2 font-medium text-muted-foreground">Date Renovated</td>
                    <td className="px-3 py-2 truncate">{property.dates.dateRenovated}</td>
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
