import * as React from "react"
import Image from "next/image"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
} from "@/components/ui/carousel"

const LISTING_IMAGES = [
    "/listing-image-1.jpeg",
    "/listing-image-2.jpeg",
    "/listing-image-3.jpeg",
    "/listing-image-4.jpeg",
    "/listing-image-5.jpeg",
]

export function DetailCarousel({ property, handleOpen }: { property: Property, handleOpen: (idx: number) => void }) {
    const images = [property.image, ...LISTING_IMAGES]
    
    return (
        <Carousel className="flex flex-col w-full">
            <CarouselContent>
                {Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index} onClick={() => handleOpen(index)}>
                        <Image
                            src={images[index]}
                            alt={`Property ${property.id}`}
                            height={500}
                            width={500}
                            className="w-full sm:w-[300px] h-60 object-cover"
                            style={{ aspectRatio: "400/300", objectFit: "cover" }}
                        />
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    )
}
export function ListingCarousel({ property }: { property: Property }) {
    const images = [property.image, ...LISTING_IMAGES]
    
    return (
        <Carousel className="flex flex-col w-full max-w-xs">
            <CarouselContent>
                {Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index}>
                        <Image
                            src={images[index]}
                            alt={`Property ${property.id}`}
                            height={500}
                            width={500}
                            className="w-full sm:w-[300px] h-60 object-cover"
                            style={{ aspectRatio: "400/300", objectFit: "cover" }}
                        />
                    </CarouselItem>
                ))}
            </CarouselContent>
        </Carousel>
    )
}
