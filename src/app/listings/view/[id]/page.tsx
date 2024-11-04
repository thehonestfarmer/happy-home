"use client"

import { useState } from "react"
import Header from "@/app/header";
import InquireDialog from "@/app/InquireDialog";
import { DetailCarousel, ListingCarousel } from "@/app/ListingCarousel";
import Lightbox from "yet-another-react-lightbox";
import NextJsImage from "@/components/ui/nextjsimage";
import { SLIDES } from "@/app/fixtures";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Page({ params }: { params: { id: string } }) {
  const [open, setOpen] = useState(false);
  const property = { id: 1, image: "/sample-1.jpeg", bedrooms: 3, bathrooms: 2, sqft: 2000, price: 500000, location: "123 Fumoto, Yahiko, Niigata" }
  return (
    <div>
      <Header />
      <DetailCarousel
        handleOpen={(idx: number) => setOpen(true)}
        property={property} />
      <Lightbox
        open={open}
        close={() => setOpen(false)}
        slides={SLIDES}
        render={{ slide: NextJsImage }}
      />
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] md:p-4">
        <div className="bg-background rounded-lg shadow-sm p-6 md:col-span-2">
          <div className="p-2">
            <div className="flex justify-between items-center mb-2">
              <div className="flex flex-col">
                <div className="text-lg font-bold">${property.price.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">¥{(property.price * 150).toLocaleString()}</div>
              </div>
              <InquireDialog property={{ id: 1, image: "/sample-1.jpeg", bedrooms: 3, bathrooms: 2, sqft: 2000, price: 500000, location: "123 Main St, Anytown, USA" }} />
            </div>

            <div className="text-sm text-muted-foreground">
              {property.bedrooms} beds • {property.bathrooms} baths • {property.sqft} sqft
            </div>
            <div className="text-sm text-muted-foreground mt-2">{property.location}</div>
          </div>
          <div className="p-2">
            <p>Some text about the property here</p>
          </div>

          <div className="p-2">
            <Link href="/">
              <Button variant="outline">Back to Listings</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
