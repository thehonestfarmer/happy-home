"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import * as React from "react";

import { ChevronLeft, MailIcon, ShareIcon, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "usehooks-ts";

export function DrawerDialogDemo({ property }) {
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const handleMailto = React.useCallback(() => {
    const email = "thehonestfarmer@proton.me";
    const subject = "Property inquiry";
    const body = `I'm interested in learning more about this property ${property.addresses}`;
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

  const [title, desc] = property.addresses.split(",");
  const snapPoints = [0.24, 0.68, 0.96];
  const [snap, setSnap] = React.useState<number | string | null>(snapPoints[1]);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">Edit Profile</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Thank you for your interest</DialogTitle>
            <DialogDescription>
              Make changes to your profile here. Click save when you're done.
            </DialogDescription>
          </DialogHeader>
          <ListingDetailContent
            handleMailto={handleMailto}
            property={property}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer
      open
      dismissible={false}
      snapPoints={snapPoints}
      activeSnapPoint={snap}
      setActiveSnapPoint={setSnap}
      modal={false}
    >
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>
            <div className="flex items-center justify-between">
              <div>
                <div>{title}</div>
                <div className="text-sm text-muted-foreground">{desc}</div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyLink}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleMailto}
                >
                  <MailIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DrawerTitle>
        </DrawerHeader>
        <DrawerDescription></DrawerDescription>
        <ListingDetailContent property={property} handleMailto={handleMailto} />
      </DrawerContent>
    </Drawer>
  );
}

function ListingDetailContent({ property, handleMailto }) {
  const processedTags = property.tags.split(",");

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] md:p-4">
      <div className="flex justify-between p-4 bg-white rounded-lg shadow-sm">
        <div>
          <div className="text-center">
            <div className="text-xl font-bold text-black">
              ${(Math.round(property.priceUsd / 1000) * 1000).toLocaleString()}
            </div>
            <div className="text-sm text-gray-500">Price</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="text-center">
            <div className="text-xl font-bold text-black">
              {parseInt(property.layout)}
            </div>
            <div className="text-sm text-gray-500">LDK</div>
          </div>

          <div className="text-center">
            <div className="text-xl font-bold text-black">
              {`${parseInt(property.buildSqMeters)}`}
            </div>
            <div className="text-sm text-gray-500">Sq. Meters</div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-white rounded-b-lg">
        <h2 className="text-lg font-semibold text-black mb-2">
          About this home
        </h2>
        <p className="text-sm text-gray-600">
          {property.recommendedText.join(". ")}
        </p>
      </div>
      <div className="p-4">
        {processedTags.map((p) => (
          <Badge key={p} className="p-1 m-1" variant="outline">
            {p}
          </Badge>
        ))}
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
