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
          name: "Safari (Alt)",
          icon: "🌐", // Web globe icon
          deepLink: (url) => {
            // Alternative direct approach for Safari with query param
            return url.includes('?') ? `${url}&open_in_safari=1` : `${url}?open_in_safari=1`;
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
}