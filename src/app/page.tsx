"use client"

import { useState, useMemo } from "react"
import Link from "next/link"

import Image from 'next/image'

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import Header from "./header"
import { PROPERTIES, SLIDES } from "./fixtures"
import { DetailCarousel, ListingCarousel } from "./ListingCarousel"
import Lightbox from "yet-another-react-lightbox"
import NextJsImage from "@/components/ui/nextjsimage"


export default function Component() {
  const [priceRange, setPriceRange] = useState([100000, 700000])
  const [bedroom, setBedroom] = useState(null)
  const [bathroom, setBathroom] = useState(null)
  const [location, setLocation] = useState("")
  const filteredProperties = useMemo(() => {
    return PROPERTIES.filter(
      (property) =>
        property.price >= priceRange[0] &&
        property.price <= priceRange[1] &&
        (bedroom === null || property.bedrooms === bedroom) &&
        (bathroom === null || property.bathrooms === bathroom) &&
        (location === "" || property.location.toLowerCase().includes(location.toLowerCase())),
    )
  }, [priceRange, bedroom, bathroom, location])
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Header />
      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-8 p-4 md:p-8">
        <div className="bg-background rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold mb-4">Filters</h2>
          <div className="grid gap-6">
            {/* <div>
              <label htmlFor="price-range" className="block text-sm font-medium mb-2">
                Price Range
              </label>
              <div />
            </div> */}
            <div>
              <label className="block text-sm font-medium mb-2">Bedrooms</label>
              <Select value={bedroom} onValueChange={(value) => setBedroom(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bedrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Any</SelectItem>
                  <SelectItem value={1}>1+</SelectItem>
                  <SelectItem value={2}>2+</SelectItem>
                  <SelectItem value={3}>3+</SelectItem>
                  <SelectItem value={4}>4+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Bathrooms</label>
              <Select value={bathroom} onValueChange={(value) => setBathroom(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select bathrooms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>Any</SelectItem>
                  <SelectItem value={1}>1+</SelectItem>
                  <SelectItem value={2}>2+</SelectItem>
                  <SelectItem value={3}>3+</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-2">
                Location
              </label>
              <Input
                id="location"
                type="text"
                placeholder="Enter location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property) => (
            <div key={property.id} className="bg-background rounded-lg shadow-sm overflow-hidden">
              <DetailCarousel property={property} handleOpen={() => setOpen(true)} />
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex flex-col">
                    <div className="text-lg font-bold">${property.price.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">¥{(property.price * 150).toLocaleString()}</div>
                  </div>
                  <Link href={`/listings/view/${property.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground">
                  {property.bedrooms} beds • {property.bathrooms} baths • {property.sqft} sqft
                </div>
                <div className="text-sm text-muted-foreground mt-2">{property.location}</div>
              </div>
            </div>
          ))}
          <Lightbox
            open={open}
            close={() => setOpen(false)}
            slides={SLIDES}
            render={{ slide: NextJsImage }}
            index={2}
          />
        </div>
      </div>
    </div>
  )
}