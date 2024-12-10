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
  allImages,
  startIdx = 0,
}: {
  property: any;
  handleOpenAction: (idx: number, sIdx: number) => void;
  allImages?: boolean;
  startIdx?: number;
}) {
  return (
    <Carousel className="flex flex-col w-full">
      <CarouselContent>
        {property.listingImages.map((item, index) => (
          <CarouselItem
            key={index}
            onClick={(e) => {
              e.preventDefault();
              handleOpenAction(property.id, index);
            }}
          >
            <Image
              src={item}
              alt={`Property ${item.id}`}
              priority
              height={500}
              width={500}
              className="w-full sm:w-[300px] h-60 object-cover"
              style={{ aspectRatio: "400/300", objectFit: "cover" }}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
