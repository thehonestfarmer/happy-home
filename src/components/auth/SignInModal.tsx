"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { FeatureFlags } from "@/lib/featureFlags";
import { GoogleSignInButton } from "./GoogleSignInButton";
import { useOAuthListener } from "@/hooks/useOAuthListener";
import { useState } from "react";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const supabase = createClientComponentClient();
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Set up listener for OAuth callback messages
  useOAuthListener({
    onSuccess: () => {
      // Close the modal when sign-in is successful
      onClose();
      setIsSigningIn(false);
    },
    onError: (error) => {
      console.error("Sign in error:", error);
      setIsSigningIn(false);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isSigningIn) {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to Happy Home Japan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <GoogleSignInButton 
            variant="outline"
            onSignInStart={() => {
              setIsSigningIn(true);
            }}
            onSignInError={() => {
              setIsSigningIn(false);
            }}
          />

          {FeatureFlags.PROVIDERS_V2 && (
            <>
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                disabled
              >
                <Image 
                  src="/facebook.svg" 
                  alt="Facebook" 
                  width={20} 
                  height={20} 
                />
                Continue with Facebook
              </Button>

              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                disabled
              >
                <Image 
                  src="/apple.svg" 
                  alt="Apple" 
                  width={20} 
                  height={20} 
                />
                Continue with Apple
              </Button>

              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                disabled
              >
                <Image 
                  src="/line.svg" 
                  alt="LINE" 
                  width={20} 
                  height={20} 
                />
                Continue with LINE
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 