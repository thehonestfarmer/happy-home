"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Property {
  id: number;
  image: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  price: number;
  location: string;
}

export default function InquireDialog({ property }: { property: Property }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="default">Inquire</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogTitle>Inquire</DialogTitle>
        <DialogHeader>
          <DialogDescription>
            If you would like to learn more, please fill out the form below to
            contact the listing agent
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              defaultValue="Anthony Chung"
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">
              Email
            </Label>
            <Input
              id="email"
              defaultValue="anthony@happyhome.com"
              className="col-span-3"
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" onClick={() => {}}>
            Contact
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
