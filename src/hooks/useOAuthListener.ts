"use client";

import { useState, useEffect, useCallback } from "react";

type OAuthListenerOptions = {
  onSuccess?: () => void;
  onError?: (error: string) => void;
};

/**
 * A hook that listens for OAuth callback messages from popup windows
 * This makes the communication between popup windows and the main application consistent
 */
export function useOAuthListener(options: OAuthListenerOptions = {}) {
  const [isListening, setIsListening] = useState(false);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Verify that the message is from our domain
      if (event.origin !== window.location.origin) {
        return;
      }

      // Check if this is a sign-in complete message
      if (
        event.data &&
        (event.data === "signInComplete" || // Support older message format
          (typeof event.data === "object" &&
            event.data.type === "signInComplete"))
      ) {
        // Call the success callback
        if (options.onSuccess) {
          options.onSuccess();
        }
      }

      // Check if this is an error message
      if (
        event.data &&
        typeof event.data === "object" &&
        event.data.type === "signInError"
      ) {
        // Call the error callback
        if (options.onError) {
          options.onError(event.data.message || "Unknown error");
        }
      }
    },
    [options]
  );

  // Set up the event listener
  useEffect(() => {
    window.addEventListener("message", handleMessage);
    setIsListening(true);

    return () => {
      window.removeEventListener("message", handleMessage);
      setIsListening(false);
    };
  }, [handleMessage]);

  return { isListening };
} 