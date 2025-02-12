import Image from "next/image";

interface ListingCardProps {
  listing: {
    id: number;
    price: number;
    beds: number;
    baths: number;
    sqft: number;
    address: string;
    listingImages: string[];
  };
}

export function ListingCard({ listing }: ListingCardProps) {
  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
      <div className="relative aspect-[4/3]">
        <Image
          src={listing.listingImages[0]}
          alt={`Property at ${listing.address}`}
          fill
          className="object-cover"
        />
      </div>
      
      <div className="p-4">
        <div className="mb-2">
          <p className="text-2xl font-bold">${listing.price.toLocaleString()}</p>
        </div>
        
        <div className="text-sm text-muted-foreground">
          {listing.beds} beds • {listing.baths} baths • {listing.buildSqMeters.toLocaleString()} sq m
        </div>
        
        <p className="text-sm text-muted-foreground mt-2">
          {listing.address}
        </p>
      </div>
    </div>
  );
} 