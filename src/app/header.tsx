"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { SignInModal } from "@/components/auth/SignInModal";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, User, LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { FeatureFlags } from "@/lib/featureFlags";
import { MobileFilters } from "@/components/listings/MobileFilters";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAppContext } from "@/AppContext";
import { usePathname } from 'next/navigation';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Image from "next/image";
import { ListingsToolbar } from "@/components/listings/ListingsToolbar";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { clearAuthData, getURL } from '@/lib/supabase/client';

function ConditionalToolbar({ path }: { path: string }) {
  if (path === '/listings') {
    return <ListingsToolbar />;
  }
  return null;
}

export default function Header() {
  const [showSignIn, setShowSignIn] = useState(false);
  const { user, browserType } = useAppContext();
  const supabase = createClientComponentClient();
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/listings';

  const handleSignOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // First, try the standard sign out
      const { error } = await supabase.auth.signOut({ 
        scope: 'local'
      });
      
      if (error) {
        console.log('Standard sign out failed, using fallback approach:', error.message);
        
        // Use our async helper function to clear auth data
        await clearAuthData();
      } else {
        console.log('Sign out successful via Supabase API');
        
        // Even if the Supabase API call succeeded, also call our server-side cleanup
        // This ensures all cookies are properly cleared
        await clearAuthData();
      }
      
      // Force a full page reload to clear any in-memory state
      console.log('Redirecting to home page...');
      window.location.href = '/';
    } catch (err) {
      console.error('Exception during sign out:', err);
      
      // Even if everything fails, try to clear data and redirect
      try {
        await clearAuthData();
      } catch (clearError) {
        console.error('Failed to clear auth data:', clearError);
      }
      window.location.href = '/';
    }
  };

  const AuthButton = () => {
    if (!user) {
      return (
        <GoogleSignInButton
          variant="outline"
          className="bg-white/90 text-primary border-primary/20 hover:bg-accent-blue/10 hover:text-primary hover:border-primary transition-colors"
        />
      );
    }

    // Only show user info on desktop
    return (
      <div className="hidden lg:flex items-center gap-2">
        <span className="text-sm">{user.email}</span>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
            >
              {user.user_metadata?.avatar_url ? (
                <Image
                  src={user.user_metadata.avatar_url}
                  alt="User avatar"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <User className="h-5 w-5" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-2">
            <div className="flex flex-col gap-1">
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                Signed in as
                <div className="truncate">{user.email}</div>
              </div>
              <div className="h-px bg-border my-1" />
              <Link 
                href="/account" 
                className="flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-md transition-colors"
              >
                <Settings size={16} />
                Account Settings
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-2 py-1.5 text-sm text-left hover:bg-accent rounded-md transition-colors w-full text-red-600"
              >
                <LogOut size={16} />
                Sign Out
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  return (
    <>
      {/* Construction Banner */}
      <div className="w-full bg-amber-500 text-black py-1.5 text-center text-sm font-medium">
        {browserType === 'Instagram' ? '👋 Hello Instagram!' : '🚧 Work in Progress! 🚧'}
      </div>
      
      <header className="bg-primary text-primary-foreground py-4 relative">
        <div className="flex justify-between items-center px-4">
          <Link href="/" prefetch={false}>
            <h1 className="text-2xl font-bold">Happy Home Japan</h1>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden lg:flex items-center gap-6">
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
              </>
            )}
            <AuthButton />
          </div>
        </div>
      </header>
      <ConditionalToolbar path={pathname} />

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