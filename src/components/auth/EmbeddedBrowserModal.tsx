"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppContext } from "@/AppContext";

interface EmbeddedBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmbeddedBrowserModal({ isOpen, onClose }: EmbeddedBrowserModalProps) {
  const { browserType } = useAppContext();
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Get the current URL to open in the native browser
  const currentURL = typeof window !== 'undefined' ? window.location.href : '';

  // Handle opening in native browser
  const handleOpenInBrowser = () => {
    setIsRedirecting(true);
    
    // Different approaches for different platforms
    // This uses a common technique for iOS and Android
    setTimeout(() => {
      // For iOS, we can try location.href on a timeout
      window.location.href = currentURL;
      
      // For some Android browsers, this might help
      window.open(currentURL, '_system');
      
      setIsRedirecting(false);
      onClose();
    }, 100);
  };

  // Get platform-specific content
  const getPlatformContent = () => {
    let icon = '/icons/browser.svg'; // Default icon
    let platformName = 'your device\'s browser';
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.navigator) {
      return { icon, platformName };
    }
    
    if (browserType === 'Instagram') {
      icon = '/icons/instagram.svg';
      platformName = 'Safari or Chrome';
    } else if (browserType === 'Facebook') {
      icon = '/icons/facebook.svg';
      platformName = 'your default browser';
    } else if (/iPhone|iPad|iPod/.test(navigator.userAgent)) {
      platformName = 'Safari';
    } else if (/Android/.test(navigator.userAgent)) {
      platformName = 'Chrome';
    }

    return { icon, platformName };
  };

  const { platformName } = getPlatformContent();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Open in Browser</DialogTitle>
          <DialogDescription>
            Social login works better in your device's native browser.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4 space-y-4">
          <div className="bg-muted/50 w-full p-4 rounded-lg text-center">
            <p className="text-sm">
              We've detected you're using the <strong>{browserType}</strong> in-app browser, which can have limited functionality for social logins.
            </p>
          </div>
          
          <div className="flex flex-col items-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              <ExternalLink className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium">
              For the best experience, please open this page in {platformName}.
            </p>
          </div>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <Button
            variant="default"
            onClick={handleOpenInBrowser}
            disabled={isRedirecting}
            className="w-full sm:w-auto"
          >
            {isRedirecting ? "Opening..." : `Open in Browser`}
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Continue Anyway
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 