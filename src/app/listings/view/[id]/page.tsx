"use client";

import { SLIDES } from "@/app/fixtures";
import { DetailCarousel } from "@/app/ListingCarousel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import NextJsImage from "@/components/ui/nextjsimage";
import Link from "next/link";
import { useCallback } from "react";
import Lightbox from "yet-another-react-lightbox";

import { useAppContext } from "@/AppContext";
import { useLoadListings } from "@/hooks";
import { useParams } from "next/navigation";
import { DrawerDialogDemo } from "@/app/InquiryDialog";
import { ChevronLeft, HeartIcon, ShareIcon } from "lucide-react";

export default function Page() {
  const params = useParams<{ id: string }>();
  // here we want to load/read the same json as the other root page
  const listings = useLoadListings();
  const property = listings[params.id];
  const { displayState, setDisplayState } = useAppContext();
  const [_, listingImageIdx = 0] = displayState.lightboxListingIdx ?? [];

  const handleLightboxOpen = useCallback(
    (idx: number, sIdx: number) => {
      setDisplayState((draft) => {
        draft.lightboxListingIdx = [parseInt(idx), sIdx];
      });
    },
    [setDisplayState],
  );

  const lightboxSlides = (property.listingImages ?? []).map((i, idx) => ({
    ...SLIDES[idx],
    src: i,
  }));

  const processedTags = property.tags.split(",");

  console.log(property, "<<");

  return (
    <div>
      <DetailCarousel handleOpen={handleLightboxOpen} property={property} />
      <Lightbox
        open={displayState.lightboxListingIdx !== null}
        close={() =>
          setDisplayState((draft) => {
            draft.lightboxListingIdx = null;
          })
        }
        slides={lightboxSlides}
        render={{ slide: NextJsImage }}
        index={listingImageIdx}
      />
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] md:p-4">
        <div className="flex justify-between p-4 bg-white rounded-lg shadow-sm">
          <div>
            <div className="text-center">
              <div className="text-xl font-bold text-black">
                $
                {(Math.round(property.priceUsd / 1000) * 1000).toLocaleString()}
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

        <div className="p-2 m-2 grid grid-cols-4">
          <Link href="/">
            <Button variant="outline">
              <ChevronLeft />
            </Button>
          </Link>
          <Button variant="outline">
            <ShareIcon />
          </Button>
          <Button variant="outline">
            <HeartIcon />
          </Button>
          <DrawerDialogDemo />
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
    </div>
  );
}
