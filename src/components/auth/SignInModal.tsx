"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import Image from "next/image";
import { FeatureFlags } from "@/lib/featureFlags";

interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SignInModal({ isOpen, onClose }: SignInModalProps) {
  const supabase = createClientComponentClient();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        console.error('OAuth error:', error.message);
      }
    } catch (error) {
      console.error('Error during sign in:', error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sign in to Happy Home Japan</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-4">
          <Button 
            variant="outline" 
            className="flex items-center gap-2" 
            onClick={handleGoogleLogin}
          >
            <Image 
              src="/google.svg" 
              alt="Google" 
              width={20} 
              height={20} 
            />
            Continue with Google
          </Button>

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