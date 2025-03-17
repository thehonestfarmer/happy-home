"use client";

import * as React from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export function DetailSlide({
  property,
  handleOpenAction,
  allImages,
  startIdx = 0,
}: {
  property: any;
  handleOpenAction: (idx: number, sIdx: number) => void;
  allImages?: boolean;
  startIdx?: number;
}) {
  return (
    <Image
      src={property.listingImages[startIdx]}
      alt={`Property ${property.id}`}
      onClick={() => handleOpenAction(property.id, startIdx)}
      priority
      height={480}
      width={480}
      className="w-full sm:w-[300px] object-cover my-2"
      style={{ objectFit: "cover" }}
    />
  );
}

export function DetailCarousel({
  property,
  handleOpenAction,
}: {
  property: any;
  handleOpenAction: (idx: number, sIdx: number) => void;
  allImages?: boolean;
  startIdx?: number;
}) {
  return (
    <Carousel className="w-full">
      <CarouselContent>
        {property.listingImages.slice(0,1).map((item, index) => (
          <CarouselItem
            key={index}
            onClick={(e) => {
              e.preventDefault();
              handleOpenAction(property.id, index);
            }}
            className="relative h-72"
          >
            <div className="absolute inset-0">
              <Image
                src={item}
                alt={`Property ${property.id}`}
                priority
                fill
                className="object-cover"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
