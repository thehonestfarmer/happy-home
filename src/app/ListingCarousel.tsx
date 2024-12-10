"use client";

import * as React from "react";
import Image from "next/image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

function moveToFront(arr, index) {
  if (index >= 0 && index < arr.length) {
    const [item] = arr.splice(index, 1); // Remove the item at the specified index
    arr.unshift(item); // Add the item to the front of the array
  }
  return arr;
}

export function DetailSlide({
  property,
  handleOpen,
  allImages,
  startIdx = 0,
}: {
  property: any;
  handleOpen: (idx: number, sIdx: number) => void;
  allImages?: boolean;
  startIdx?: number;
}) {
  return (
    <Image
      src={property.listingImages[startIdx]}
      alt={`Property ${property.id}`}
      onClick={() => handleOpen(property.id, startIdx)}
      priority
      height={500}
      width={500}
      className="w-full sm:w-[300px] h-60 object-cover"
      style={{ aspectRatio: "400/300", objectFit: "cover" }}
    />
  );
}

export function DetailCarousel({
  property,
  handleOpen,
  allImages,
  startIdx = 0,
}: {
  property: any;
  handleOpen: (idx: number, sIdx: number) => void;
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
