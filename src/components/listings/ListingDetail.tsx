"use client";

import { useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ShareIcon, Copy } from "lucide-react";
import Lightbox from "yet-another-react-lightbox";
import NextJsImage from "@/components/ui/nextjsimage";
import { PropertyDetailView } from "@/app/PropertyDetailView";
import { useAppContext } from "@/AppContext";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Listing } from "@/types"; // You may need to create/adjust this type

interface ListingDetailProps {
  listing: Listing;
}

export function ListingDetail({ listing }: ListingDetailProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { displayState, setDisplayState } = useAppContext();
  const [_, listingImageIdx = 0] = displayState.lightboxListingIdx ?? [];

  const handleLightboxOpen = useCallback(
    (idx: number, sIdx: number) => {
      setDisplayState((draft: any) => {
        draft.lightboxListingIdx = [idx, sIdx];
      });
    },
    [setDisplayState]
  );

  const lightboxSlides = (listing?.listingImages ?? []).map((i: string) => ({
    width: 3840,
    height: 5760,
    src: i,
  }));

  const handleMailto = useCallback(() => {
    const email = "thehonestfarmer@proton.me";
    const subject = "Property inquiry";
    const body = `I'm interested in learning more about this property ${listing?.addresses}`;
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    window.location.href = mailtoUrl;
  }, [listing?.addresses]);

  const handleCopyLink = useCallback(() => {
    const url = window.location.href;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast({
          title: "Link copied!",
          description: "The listing URL has been copied to your clipboard",
          duration: 3000,
        });
      })
      .catch(() => {
        toast({
          title: "Failed to copy",
          description: "Please try again",
          variant: "destructive",
          duration: 3000,
        });
      });
  }, [toast]);

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <Button variant="outline" onClick={handleCopyLink}>
            <ShareIcon className="mr-2 h-4 w-4" />
            Share
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listing.listingImages?.map((image, idx) => (
            <div
              key={idx}
              className="relative aspect-[3/2] cursor-pointer"
              onClick={() => handleLightboxOpen(0, idx)}
            >
              <Image
                src={image}
                alt={`Property image ${idx + 1}`}
                fill
                className="object-cover rounded-lg"
              />
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <h1 className="text-2xl font-bold">{listing.addresses}</h1>
          <div className="flex gap-2">
            <Badge>{listing.acres} acres</Badge>
            <Badge>${listing.price.toLocaleString()}</Badge>
          </div>
          <Separator />
          <p className="whitespace-pre-wrap">{listing.description}</p>
          <PropertyDetailView property={listing} />
        </div>
      </div>

      {displayState.lightboxListingIdx && (
        <Lightbox
          open={true}
          close={() =>
            setDisplayState((draft: any) => {
              draft.lightboxListingIdx = null;
            })
          }
          index={listingImageIdx}
          slides={lightboxSlides}
          render={{ slide: NextJsImage }}
        />
      )}
    </div>
  );
} 