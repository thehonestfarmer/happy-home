"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import Link from "next/link";
import * as React from "react";

import { ChevronLeft, EyeIcon, ShareIcon } from "lucide-react";

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
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MailIcon } from "lucide-react";
import { useMediaQuery } from "usehooks-ts";

export function DrawerDialogDemo({ property }) {
  const [open, setOpen] = React.useState(false);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const handleMailto = () => {
    const email = "demo@demo.com";
    const subject = "Hello";
    const body = "This is a test email.";
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // Open the mailto link in a new window
    window.location.href = mailtoUrl;
  };

  const [title, desc] = property.addresses.split(",");
  console.log("attempting");

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
    <Drawer open={true} onOpenChange={setOpen}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{desc}</DrawerDescription>
        </DrawerHeader>
        <ListingDetailContent
          className="px-4"
          property={property}
          handleMailto={handleMailto}
        />
        <DrawerFooter className="pt-2">
          <DrawerClose asChild>
            <Button variant="outline">Cancel</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

function ProfileForm({ className }: React.ComponentProps<"form">) {
  return (
    <form className={cn("grid items-start gap-4", className)}>
      <div className="grid gap-2">
        <Label htmlFor="email">Email</Label>
        <Input type="email" id="email" defaultValue="shadcn@example.com" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" defaultValue="@shadcn" />
      </div>
      <Button type="submit">Save changes</Button>
    </form>
  );
}

function ListingDetailContent({ property, handleMailto }) {
  console.log(property, ">>>>");
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

        <div className="grid grid-cols-2">
          <div className="text-center">
            <div className="text-xl font-bold text-black">
              {parseInt(property.layout)}
            </div>
            <div className="text-sm text-gray-500">LDK</div>
          </div>

          <div className="text-center">
            <div className="text-xl font-bold text-black">
              {parseInt(property.landSqMeters)}
            </div>
            <div className="text-sm text-gray-500">Sq. Meters</div>
          </div>
        </div>
      </div>

      <div className="p-2 m-2 flex justify-between">
        <div>
          <Link href="/">
            <Button variant="outline">
              <ChevronLeft />
            </Button>
          </Link>
          <Button variant="outline">
            <EyeIcon />
          </Button>
        </div>

        <div>
          <Button
            variant="outline"
            onClick={() => {
              // if (navigator.share && !isAndroid) {
              //   navigator
              //     .share({
              //       title: document.title,
              //       url: window.location.href,
              //       text: "Check out this property in Niigata!",
              //     })
              //     .then(() => console.log("Successful share! 🎉"))
              //     .catch((err) => console.error(err));
              // }
              handleMailto();
              // open
              return;
            }}
          >
            <ShareIcon />
          </Button>
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

      <APIProvider apiKey={"AIzaSyDch1GvBut5KKB5iHrmayfPEGv9PHYgMLI"}>
        <Map
          style={{ width: "100vw", height: "45vh" }}
          defaultCenter={{ lat: 37.782979, lng: 139.05652 }}
          defaultZoom={6}
          gestureHandling={"greedy"}
          disableDefaultUI={false}
        >
          <Marker position={{ lat: 37.782979, lng: 139.05652 }} />
        </Map>
      </APIProvider>
    </div>
  );
}
