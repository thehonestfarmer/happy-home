"use client";

import { useState, useRef } from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  // Get the current URL to open in the native browser
  const currentURL = typeof window !== 'undefined' ? window.location.href : '';
  
  // Handle copy to clipboard
  const handleCopyUrl = () => {
    if (typeof navigator === 'undefined') return;
    
    // Select the text field
    if (urlInputRef.current) {
      urlInputRef.current.select();
      urlInputRef.current.setSelectionRange(0, 99999); // For mobile devices
    }
    
    // Copy the URL to clipboard
    try {
      navigator.clipboard.writeText(currentURL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback copy method
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  // Attempt to force open in external browser
  const handleOpenInBrowser = () => {
    if (typeof window === 'undefined') return;
    
    setIsRedirecting(true);
    let opened = false;
    
    // Determine platform
    const isIOS = /iPhone|iPad|iPod/i.test(navigator?.userAgent || '');
    const isAndroid = /Android/i.test(navigator?.userAgent || '');
    
    // Platform-specific handling
    if (isIOS) {
      // Try more aggressive iOS methods
      try {
        // Use a scheme that will force a system prompt on iOS
        // This can sometimes break out of the webview containment
        window.location.href = `sms:&body=${encodeURIComponent("Open this link in Safari: " + currentURL)}`;
        opened = true;
        
        // After a short delay, try to redirect back to the URL
        // This sometimes works after the system prompt is shown
        setTimeout(() => {
          window.location.href = currentURL;
        }, 300);
      } catch (e) {
        console.log("iOS SMS approach failed", e);
      }
      
      // Try another iOS-specific scheme as backup
      if (!opened) {
        try {
          // This will attempt to open the App Store, which sometimes
          // allows escaping the WebView context
          window.location.href = "itms-apps://";
          opened = true;
          
          // After a short delay, try to redirect back to our URL
          setTimeout(() => {
            window.location.href = currentURL;
          }, 300);
        } catch (e) {
          console.log("App Store redirect failed", e);
        }
      }
    } else if (isAndroid) {
      // Try multiple Android browser packages
      const browserPackages = [
        "com.android.chrome",
        "com.android.browser",
        "org.mozilla.firefox",
        "com.opera.browser",
        "com.sec.android.app.sbrowser" // Samsung browser
      ];
      
      for (const pkg of browserPackages) {
        if (opened) break;
        
        try {
          const urlParts = new URL(currentURL);
          const intentUrl = `intent://${urlParts.host}${urlParts.pathname}${urlParts.search}#Intent;scheme=${urlParts.protocol.replace(':', '')};package=${pkg};end`;
          window.location.href = intentUrl;
          opened = true;
        } catch (e) {
          console.log(`Android ${pkg} intent failed`, e);
        }
      }
    }
    
    // Reset the UI after a delay regardless of success
    // By this point, the user should rely on manual methods
    setTimeout(() => {
      setIsRedirecting(false);
    }, 1500);
  };

  // Get platform-specific content
  const getPlatformContent = () => {
    let platformName = 'your device\'s browser';
    let manualInstructions = '';
    
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || !window.navigator) {
      return { platformName, manualInstructions };
    }
    
    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    
    if (browserType === 'Instagram') {
      if (isIOS) {
        platformName = 'Safari';
        manualInstructions = 'Tap the ••• menu in the top right corner and select "Open in Safari"';
      } else if (isAndroid) {
        platformName = 'Chrome';
        manualInstructions = 'Tap the ••• menu in the top right corner and select "Open in Chrome"';
      } else {
        platformName = 'your default browser';
      }
    } else if (browserType === 'Facebook') {
      manualInstructions = 'Tap the ••• menu in the bottom right corner and select "Open in Browser"';
      platformName = isIOS ? 'Safari' : (isAndroid ? 'Chrome' : 'your default browser');
    } else if (browserType === 'TikTok') {
      manualInstructions = 'Tap the ••• menu and select "Open in browser"';
      platformName = isIOS ? 'Safari' : (isAndroid ? 'Chrome' : 'your default browser');
    } else if (isIOS) {
      platformName = 'Safari';
      manualInstructions = 'Copy the URL and paste it into Safari';
    } else if (isAndroid) {
      platformName = 'Chrome';
      manualInstructions = 'Copy the URL and paste it into Chrome';
    }

    return { platformName, manualInstructions };
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
          
          {/* Manual instructions */}
          <div className="flex flex-col items-center space-y-2 w-full">
            <div className="rounded-full bg-primary/10 p-3">
              <ExternalLink className="h-6 w-6 text-primary" />
            </div>
            <div className="text-sm font-medium text-center space-y-1">
              <p>For the best experience, please open this page in {platformName}.</p>
              {manualInstructions && (
                <p className="text-sm font-semibold text-amber-600">
                  {manualInstructions}
                </p>
              )}
            </div>
          </div>
          
          {/* URL copy field */}
          <div className="w-full pt-2">
            <div className="flex items-center space-x-2">
              <input 
                ref={urlInputRef}
                type="text" 
                readOnly
                value={currentURL}
                className="w-full px-3 py-2 border rounded-md text-sm bg-muted/30 truncate"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyUrl}
                className="flex-shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {copied ? "URL copied to clipboard!" : "Copy this URL to paste in your browser"}
            </p>
          </div>
          
          {isRedirecting && (
            <div className="bg-green-50 border border-green-200 w-full p-3 rounded-lg text-center">
              <p className="text-sm text-green-800">
                Attempting to open your browser...
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
            {isRedirecting ? "Opening..." : `Try to open in ${platformName}`}
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