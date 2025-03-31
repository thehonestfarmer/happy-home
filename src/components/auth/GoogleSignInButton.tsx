"use client";

import { useState, useEffect } from "react";
import { Button, ButtonProps } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getRedirectURL, getURL } from "@/lib/supabase/client";
import { useAppContext } from "@/AppContext";
import { EmbeddedBrowserModal } from "./EmbeddedBrowserModal";

type ButtonVariant = "default" | "outline" | "ghost";

interface GoogleSignInButtonProps extends Omit<ButtonProps, "onClick" | "variant"> {
  mode?: "default" | "mobile" | "desktop";
  variant?: "primary" | "outline" | "ghost";
  onSignInStart?: () => void;
  onSignInError?: (error: any) => void;
  className?: string;
  showIcon?: boolean;
  text?: string;
  fullWidth?: boolean;
}

/**
 * A standardized Google Sign-In button that handles OAuth consistently
 * throughout the application. It ensures proper callback URL handling
 * and works correctly in various contexts (modals, pages, etc.)
 */
export function GoogleSignInButton({
  mode = "default",
  variant = "outline",
  onSignInStart,
  onSignInError,
  className,
  showIcon = true,
  text = "Sign in with Google",
  fullWidth = false,
  ...props
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showBrowserModal, setShowBrowserModal] = useState(false);
  const { isEmbeddedBrowser } = useAppContext();
  const supabase = createClientComponentClient();

  // Detect if this is a mobile device for UX optimizations
  useEffect(() => {
    // Only run on the client side
    if (typeof window === 'undefined' || !window.navigator) {
      return;
    }
    
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 768 || 
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Map our custom variants to the Button component variants
  const buttonVariantMap = {
    primary: "default" as ButtonVariant,
    outline: "outline" as ButtonVariant,
    ghost: "ghost" as ButtonVariant,
  };

  // Handle responsive classes based on mode
  const getResponsiveClasses = () => {
    switch (mode) {
      case "mobile":
        return "flex sm:hidden";
      case "desktop":
        return "hidden sm:flex";
      default:
        return "flex";
    }
  };

  const handleButtonClick = () => {
    // If in an embedded browser, show the warning modal instead of starting OAuth
    if (isEmbeddedBrowser) {
      setShowBrowserModal(true);
      return;
    }
    
    // Otherwise, proceed with normal OAuth flow
    handleGoogleLogin();
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      
      // Store current URL to return to this page after auth
      const currentPath = window.location.pathname + window.location.search;
      localStorage.setItem('authRedirectPath', currentPath);
      
      if (onSignInStart) {
        onSignInStart();
      }

      // Use the getRedirectURL helper to ensure proper environment-based URL
      const redirectUrl = getURL() + '/auth/callback';
      
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Auth redirect URL:', redirectUrl);
      
      // Determine whether to use a popup or redirect based on device
      // Popups work better on desktop, redirects on mobile
      const options = {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      };
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options
      });

      if (error) {
        if (onSignInError) {
          onSignInError(error);
        }
        console.error('OAuth error:', error.message);
      }
    } catch (error) {
      if (onSignInError) {
        onSignInError(error);
      }
      console.error('Error during sign in:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={buttonVariantMap[variant] as ButtonProps["variant"]}
        className={cn(
          getResponsiveClasses(),
          "items-center gap-2",
          isLoading && "opacity-70 cursor-not-allowed",
          fullWidth && "w-full",
          isMobile && "text-base py-6", // Taller button on mobile for easier tapping
          className
        )}
        onClick={handleButtonClick}
        disabled={isLoading}
        {...props}
      >
        {showIcon && (
          <Image
            src="/google.svg"
            alt="Google"
            width={isMobile ? 24 : 20}
            height={isMobile ? 24 : 20}
            className={isLoading ? "opacity-70" : ""}
          />
        )}
        {text}
      </Button>

      {/* Modal for embedded browser warning */}
      <EmbeddedBrowserModal 
        isOpen={showBrowserModal} 
        onClose={() => setShowBrowserModal(false)} 
      />
    </>
  );
} 