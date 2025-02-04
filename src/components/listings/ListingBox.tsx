import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DetailCarousel } from "@/app/ListingCarousel";

interface ListingBoxProps {
  property: {
    id: number;
    priceUsd: number;
    prices: string;
    layout: string;
    buildSqMeters: string;
    addresses: string;
    listingImages: string[];
  };
  handleLightboxOpen: (idx: number, sIdx: number) => void;
}

export function ListingBox({ property, handleLightboxOpen }: ListingBoxProps) {
  return (
    <Link href={`/listings/view/${property.id}`}>
      <div
        className="bg-background rounded-xl shadow-sm overflow-hidden border border-gray-200"
      >
        <DetailCarousel
          property={property}
          handleOpenAction={handleLightboxOpen}
        />
        <div className="p-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex flex-col">
              <div className="text-lg font-bold">
                ${property.priceUsd.toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                ¥{property.prices.toLocaleString()}
              </div>
            </div>
            <Button variant="outline" size="sm">
              View
            </Button>
          </div>
          <div className="text-sm text-muted-foreground">
            {property.layout} • {`${property.buildSqMeters} m²`}
          </div>
          <div className="text-sm text-muted-foreground mt-2">
            {property.addresses}
          </div>
        </div>
      </div>
    </Link>
  );
} 