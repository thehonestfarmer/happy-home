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
    
    // Determine platform for better targeting
    const isIOS = /iPhone|iPad|iPod/i.test(navigator?.userAgent || '');
    const isAndroid = /Android/i.test(navigator?.userAgent || '');

    // Get the current URL (ensure it's fully qualified)
    const targetUrl = currentURL.startsWith('http') 
      ? currentURL 
      : `https://${window.location.host}${window.location.pathname}${window.location.search}`;
    
    try {
      if (isIOS) {
        // iOS - Try multiple approaches in sequence
        
        // 1. Try a special URL format that iOS might handle differently
        // This helps bypass internal WebView handlers by using a less common scheme variant
        const enhancedUrl = targetUrl.replace('https://', 'https-enhanced://').replace('http://', 'http-enhanced://');
        window.location.href = enhancedUrl;
        
        // 2. After a short delay, try Chrome (if installed)
        setTimeout(() => {
          window.location.href = `googlechrome://${targetUrl.replace(/^https?:\/\//, '')}`;
        }, 100);
        
        // 3. Then try Firefox (if installed)
        setTimeout(() => {
          window.location.href = `firefox://open-url?url=${encodeURIComponent(targetUrl)}`;
        }, 200);
        
        // 4. Finally fall back to regular Safari attempt
        setTimeout(() => {
          window.location.href = targetUrl;
        }, 300);
      } 
      else if (isAndroid) {
        // Android - Use an intent with specific flags to encourage external browser
        // The key is adding the ACTIVITY_NEW_TASK and ACTIVITY_CLEAR_TASK flags
        
        const androidIntent = `intent:${targetUrl.replace(/^https?:\/\//, '')}#Intent;`
          + `scheme=${targetUrl.startsWith('https') ? 'https' : 'http'};`
          + `action=android.intent.action.VIEW;`
          + `category=android.intent.category.BROWSABLE;`
          + `S.browser_fallback_url=${encodeURIComponent(targetUrl)};`
          + `launchFlags=0x10000000;` // FLAG_ACTIVITY_NEW_TASK
          + `end`;
          
        window.location.href = androidIntent;
      } 
      else {
        // Desktop or unknown device - use standard approach
        window.open(targetUrl, '_blank', 'noreferrer');
      }
      
      // Final attempt for all platforms as absolute fallback
      setTimeout(() => {
        // Create and click a special anchor with attributes designed to trigger external opening
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'external nofollow noreferrer';
        a.setAttribute('data-browser-open', 'true'); // Custom attribute that some browsers might recognize
        
        // Important! - visibility hidden but not display:none, this makes a difference
        a.style.position = 'absolute';
        a.style.left = '-9999px';
        a.style.visibility = 'hidden';
        
        document.body.appendChild(a);
        a.dispatchEvent(new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true,
          buttons: 1 // Primary button (simulates a real user click)
        }));
        setTimeout(() => document.body.removeChild(a), 100);
      }, 400);
    } catch (e) {
      console.error("Failed to open default browser:", e);
      window.location.href = targetUrl;
    }
    
    // Reset the UI state after a delay
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