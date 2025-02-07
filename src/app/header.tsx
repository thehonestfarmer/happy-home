"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { SignInModal } from "@/components/auth/SignInModal";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FeatureFlags } from "@/lib/featureFlags";
import { MobileFilters } from "@/components/listings/MobileFilters";

export default function Header() {
  const [showSignIn, setShowSignIn] = useState(false);

  return (
    <>
      <header className="sticky top-0 bg-primary text-primary-foreground py-4 z-[1]">
        <div className="flex justify-between items-center px-4">
          <Link href="/" prefetch={false}>
            <h1 className="text-2xl font-bold">Happy Home Japan</h1>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
            {/* V2 Navigation Items */}
            {FeatureFlags.showV2Features && (
              <>
                <nav className="flex items-center gap-4">
                  <Link href="/buy" className="hover:opacity-80">Buy</Link>
                  <Link href="/rent" className="hover:opacity-80">Rent</Link>
                  <Link href="/sell" className="hover:opacity-80">Sell</Link>
                  <Link href="/stay" className="hover:opacity-80">Stay</Link>
                  <Link href="/agents" className="hover:opacity-80">Real Estate Agents</Link>
                  <Link href="/feed" className="hover:opacity-80">Feed</Link>
                </nav>
                
                <Button 
                  variant="outline" 
                  className="bg-black text-primary border-black hover:bg-primary hover:text-black transition-colors"
                  onClick={() => setShowSignIn(true)}
                >
                  Join / Sign in
                </Button>
              </>
            )}
          </div>

          {/* Mobile Menu */}
          <div className="lg:hidden flex items-center gap-4">
            {FeatureFlags.showV2Features && (
              <Button 
                variant="outline" 
                className="bg-black text-primary border-black hover:bg-primary hover:text-black transition-colors"
                onClick={() => setShowSignIn(true)}
              >
                Sign in
              </Button>
            )}
            <SidebarTrigger>
              <SlidersHorizontal className="h-5 w-5" />
            </SidebarTrigger>
          </div>
        </div>
      </header>

      {/* V2 Sign In Modal */}
      {FeatureFlags.showV2Features && (
        <SignInModal 
          isOpen={showSignIn} 
          onClose={() => setShowSignIn(false)} 
        />
      )}
    </>
  );
}