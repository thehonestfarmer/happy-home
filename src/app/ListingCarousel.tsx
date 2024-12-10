"use client";

import * as React from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

export function DetailCarousel({
  property,
  handleOpen,
  allImages,
}: {
  property: any;
  handleOpen: (idx: number, sIdx: number) => void;
  allImages?: boolean;
}) {
  const images = allImages
    ? property.listingImages
    : property.listingImages.slice(0, 5);

  return (
    <Carousel className="flex flex-col w-full">
      <CarouselContent>
        {images.map((item, index) => (
          <CarouselItem
            key={index}
            onClick={(e) => {
              e.preventDefault();
              handleOpen(property.id, index);
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
