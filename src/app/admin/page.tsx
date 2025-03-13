"use client";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListIcon, InstagramIcon } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Listing Manager Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ListIcon className="h-5 w-5" />
              Listing Manager
            </CardTitle>
            <CardDescription>
              Manage your property listings, update details, and mark duplicates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Edit property information, update pricing, and manage property statuses.
              Mark listings as duplicates and maintain accurate property data.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/admin/listings" className="w-full">
              <Button className="w-full" size="lg">
                Open Listing Manager
              </Button>
            </Link>
          </CardFooter>
        </Card>
        
        {/* Instagram Posts Card */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <InstagramIcon className="h-5 w-5" />
              Instagram Posts
            </CardTitle>
            <CardDescription>
              Create and publish Instagram carousel posts for your properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Select property images, write engaging captions, and add relevant 
              hashtags to showcase your listings on Instagram.
            </p>
          </CardContent>
          <CardFooter>
            <Link href="/admin/posts" className="w-full">
              <Button className="w-full" size="lg">
                Open Instagram Manager
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
} 