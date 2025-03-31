"use client";

import { useState, useRef } from "react";
import { ExternalLink, Copy, Check, Smartphone } from "lucide-react";
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

type Browser = {
  name: string;
  icon: string;
  deepLink: (url: string) => string;
  package?: string; // For Android intents
};

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
  
  // Determine platform
  const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
  
  // Get browser options based on platform
  const getBrowserOptions = (): Browser[] => {
    // Target URL should be fully qualified
    const targetUrl = (url: string) => url.startsWith('http') 
      ? url 
      : `https://${window.location.host}${window.location.pathname}${window.location.search}`;
      
    if (isIOS) {
      return [
        {
          name: "Safari",
          icon: "🧭", // Safari compass icon
          deepLink: (url) => {
            // Try Safari-specific deep linking with x-web-search scheme
            return `x-web-search://?${encodeURIComponent(url)}`;
          }
        },
        {
          name: "Chrome",
          icon: "🔵", // Chrome icon
          deepLink: (url) => `googlechrome://${url.replace(/^https?:\/\//, '')}`
        },
        {
          name: "Firefox",
          icon: "🦊", // Firefox icon
          deepLink: (url) => `firefox://open-url?url=${encodeURIComponent(url)}`
        },
        {
          name: "Brave",
          icon: "🦁", // Brave lion icon
          deepLink: (url) => `brave://open-url?url=${encodeURIComponent(url)}`
        },
        {
          name: "Edge",
          icon: "📐", // Edge icon
          deepLink: (url) => `microsoft-edge-https://${url.replace(/^https?:\/\//, '')}`
        }
      ];
    } else if (isAndroid) {
      return [
        {
          name: "Chrome",
          icon: "🔵", // Chrome icon
          deepLink: (url) => {
            const intent = `intent:${url}#Intent;scheme=${url.startsWith('https') ? 'https' : 'http'};package=com.android.chrome;end`;
            return intent;
          },
          package: "com.android.chrome"
        },
        {
          name: "Firefox",
          icon: "🦊", // Firefox icon
          deepLink: (url) => {
            const intent = `intent:${url}#Intent;scheme=${url.startsWith('https') ? 'https' : 'http'};package=org.mozilla.firefox;end`;
            return intent;
          },
          package: "org.mozilla.firefox"
        },
        {
          name: "Samsung Internet",
          icon: "🌐", // Samsung Internet icon
          deepLink: (url) => {
            const intent = `intent:${url}#Intent;scheme=${url.startsWith('https') ? 'https' : 'http'};package=com.sec.android.app.sbrowser;end`;
            return intent;
          },
          package: "com.sec.android.app.sbrowser"
        },
        {
          name: "Brave",
          icon: "🦁", // Brave icon
          deepLink: (url) => {
            const intent = `intent:${url}#Intent;scheme=${url.startsWith('https') ? 'https' : 'http'};package=com.brave.browser;end`;
            return intent;
          },
          package: "com.brave.browser"
        },
        {
          name: "Default Browser",
          icon: "🌐", // Default browser icon
          deepLink: (url) => {
            // Generic intent to open URL in default browser
            return `intent:${url}#Intent;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end`;
          }
        }
      ];
    } else {
      // Desktop or unknown platform
      return [];
    }
  };
  
  // Get browser options
  const browserOptions = getBrowserOptions();
  
  // Handle browser selection
  const handleOpenInBrowser = (browser: Browser) => {
    if (typeof window === 'undefined') return;
    
    setIsRedirecting(true);
    
    // Get the current URL (ensure it's fully qualified)
    const targetUrl = currentURL.startsWith('http') 
      ? currentURL 
      : `https://${window.location.host}${window.location.pathname}${window.location.search}`;
    
    try {
      // Use the browser's deep link
      const deepLink = browser.deepLink(targetUrl);
      window.location.href = deepLink;
      
      // Add a fallback
      setTimeout(() => {
        // Create and click a link element as fallback
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'external noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, 500);
    } catch (e) {
      console.error(`Failed to open in ${browser.name}:`, e);
      // Last resort fallback
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
          
          {/* Browser selection */}
          {browserOptions.length > 0 ? (
            <div className="w-full space-y-3">
              <p className="text-sm font-medium text-center">Select a browser to open this page in:</p>
              <div className="grid grid-cols-2 gap-2">
                {browserOptions.map((browser, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="flex items-center justify-center space-x-2 py-3"
                    onClick={() => handleOpenInBrowser(browser)}
                    disabled={isRedirecting}
                  >
                    <span className="text-xl" role="img" aria-label={browser.name}>
                      {browser.icon}
                    </span>
                    <span>{browser.name}</span>
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            // For desktop users, show regular instructions
            <div className="flex flex-col items-center space-y-2 w-full">
              <div className="rounded-full bg-primary/10 p-3">
                <ExternalLink className="h-6 w-6 text-primary" />
              </div>
              <p className="text-sm font-medium text-center">
                Please open this link in a new browser window.
              </p>
            </div>
          )}
          
          {/* Manual instructions */}
          {manualInstructions && (
            <div className="bg-amber-50 border border-amber-200 w-full p-3 rounded-lg text-center">
              <p className="text-sm font-medium text-amber-800">
                Or manually: {manualInstructions}
              </p>
            </div>
          )}
          
          {/* URL copy field */}
          <div className="w-full pt-2">
            <p className="text-sm text-center mb-2">Copy URL to paste in your browser:</p>
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
              {copied ? "URL copied to clipboard!" : "Tap to copy"}
            </p>
          </div>
          
          {isRedirecting && (
            <div className="bg-green-50 border border-green-200 w-full p-3 rounded-lg text-center">
              <p className="text-sm text-green-800">
                Attempting to open selected browser...
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-center">
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