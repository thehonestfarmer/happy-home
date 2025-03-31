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
  
  // Advanced deep linking to external browsers
  const handleOpenInBrowser = () => {
    if (typeof window === 'undefined') return;
    
    setIsRedirecting(true);
    
    const encodedUrl = encodeURIComponent(currentURL);
    let opened = false;
    
    // Determine platform
    const isIOS = /iPhone|iPad|iPod/i.test(navigator?.userAgent || '');
    const isAndroid = /Android/i.test(navigator?.userAgent || '');
    
    // Platform-specific handling
    if (isIOS) {
      // Try iOS-specific methods
      
      // 1. Try direct https approach first for iOS
      try {
        // For newer iOS versions, we can often just use window.open with _blank
        const newWindow = window.open(currentURL, '_blank');
        if (newWindow) {
          // If we got a window reference, it might be opening in the webview
          // In that case, we'll try to close it and try other methods
          newWindow.close();
        } else {
          // If it returns null, iOS might be opening it in Safari already
          opened = true;
        }
      } catch (e) {
        console.log("iOS direct approach failed", e);
      }
      
      // 2. If direct approach doesn't work, try the explicit safari:// protocol 
      if (!opened) {
        try {
          // This protocol works better on some iOS versions
          // Construct the URL differently to avoid encoding the protocol itself
          const sanitizedUrl = currentURL.replace(/^https?:\/\//, '');
          window.location.href = `https://${sanitizedUrl}`;
          setTimeout(() => {
            window.location.href = currentURL;
          }, 100);
          opened = true;
        } catch (e) {
          console.log("iOS direct protocol failed", e);
        }
      }
      
      // 3. DOM approach as a fallback for iOS
      if (!opened) {
        try {
          // This uses a slight hack - we create a temporary anchor with target=_blank
          // iOS often treats _blank specially and opens the default browser
          const a = document.createElement('a');
          a.setAttribute('href', currentURL);
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
          
          // Hide the element and add it to the DOM
          a.style.display = 'none';
          document.body.appendChild(a);
          
          // Trigger a click and then remove it
          a.click();
          document.body.removeChild(a);
          opened = true;
        } catch (e) {
          console.log("iOS universal fallback failed", e);
        }
      }
    } else if (isAndroid) {
      // Try Android-specific methods
      
      // 1. Try Chrome intent URL (works on many Android devices)
      try {
        // Format: intent://host#Intent;scheme=https;package=com.android.chrome;end
        const urlParts = new URL(currentURL);
        const intentUrl = `intent://${urlParts.host}${urlParts.pathname}${urlParts.search}#Intent;scheme=${urlParts.protocol.replace(':', '')};package=com.android.chrome;end`;
        window.location.href = intentUrl;
        opened = true;
      } catch (e) {
        console.log("Android Chrome intent failed", e);
      }
      
      // 2. If that fails, try a universal approach
      if (!opened) {
        try {
          // Some Android browsers will try to open this in external browser
          window.open(currentURL, '_system');
          opened = true;
        } catch (e) {
          console.log("Android system open failed", e);
        }
      }
    }
    
    // Universal fallback for all platforms
    if (!opened) {
      // Last resort - just try to force a new window/tab
      // This may still open in the webview but it's our final fallback
      try {
        // Some mobile browsers might respect this
        const newTab = window.open(currentURL, '_blank');
        
        // If we can access the window, try to close it and redirect main window
        if (newTab) {
          newTab.close();
        }
        
        // Finally just try to redirect the main window
        window.location.href = currentURL;
      } catch (e) {
        console.log("Universal fallback failed", e);
      }
    }
    
    // Show a message to help user if automatic opening fails
    setTimeout(() => {
      setIsRedirecting(false);
      // Close modal after a moment
      setTimeout(() => onClose(), 500);
    }, 1500);
  };

  // Get platform-specific content
  const getPlatformContent = () => {
    let icon = '/icons/browser.svg'; // Default icon
    let platformName = 'your device\'s browser';
    let manualInstructions = 'copy this URL and paste it into your browser';
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.navigator) {
      return { icon, platformName, manualInstructions };
    }
    
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    
    if (browserType === 'Instagram') {
      icon = '/icons/instagram.svg';
      
      if (isIOS) {
        platformName = 'Safari';
        manualInstructions = 'tap the "..." menu and select "Open in Safari"';
      } else if (isAndroid) {
        platformName = 'Chrome';
        manualInstructions = 'tap the "..." menu and select "Open in Chrome"';
      } else {
        platformName = 'your default browser';
      }
    } else if (browserType === 'Facebook') {
      icon = '/icons/facebook.svg';
      manualInstructions = 'tap the "..." menu and select "Open in Browser"';
      platformName = isIOS ? 'Safari' : (isAndroid ? 'Chrome' : 'your default browser');
    } else if (isIOS) {
      platformName = 'Safari';
    } else if (isAndroid) {
      platformName = 'Chrome';
    }

    return { icon, platformName, manualInstructions };
  };

  const { platformName, manualInstructions } = getPlatformContent();

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
              We've detected you're using the <strong>{browserType}</strong> in-app browser, which has limited functionality for social logins.
            </p>
          </div>
          
          <div className="flex flex-col items-center space-y-2">
            <div className="rounded-full bg-primary/10 p-3">
              <ExternalLink className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-center">
              For the best experience, please open this page in {platformName}.
            </p>
          </div>
          
          {isRedirecting && (
            <div className="bg-green-50 border border-green-200 w-full p-3 rounded-lg text-center">
              <p className="text-sm text-green-800">
                Attempting to open your browser...
              </p>
              <p className="text-xs text-green-600 mt-1">
                If nothing happens, {manualInstructions}.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center gap-2 flex-col sm:flex-row">
          <Button
            variant="default"
            onClick={handleOpenInBrowser}
            disabled={isRedirecting}
            className="w-full sm:w-auto"
          >
            {isRedirecting ? "Opening..." : `Open in ${platformName}`}
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