import * as React from "react"
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
} 

/**
 * A hook to create a scroll anchor and prevent auto-scrolling, especially useful for components that might 
 * cause page jumps like maps and other heavy components.
 * 
 * @param disabled Whether to disable the scroll anchoring behavior
 * @param thresholdPx How many pixels the scroll needs to move to trigger restoration (default: 100)
 * @param delayMs Delay in ms before scroll position check (default: 100)
 * @returns A ref to attach to an element that should serve as the scroll anchor
 */
export function useScrollAnchor(
  disabled = false, 
  thresholdPx = 100,
  delayMs = 100
): React.RefObject<HTMLDivElement> {
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const initializedRef = React.useRef(false);
  
  React.useEffect(() => {
    // Skip if disabled or already initialized
    if (disabled || !anchorRef.current || initializedRef.current) return;
    
    // Capture initial scroll position
    const initialScrollY = window.scrollY;
    
    // Function to restore scroll position
    const maintainScrollPosition = () => {
      // Only restore position if we've moved more than threshold from the initial position
      if (Math.abs(window.scrollY - initialScrollY) > thresholdPx) {
        window.scrollTo({
          top: initialScrollY,
          behavior: 'auto' // Use 'auto' for immediate repositioning without animation
        });
      }
    };
    
    // Set up the scroll position maintenance
    const timeoutId = setTimeout(() => {
      maintainScrollPosition();
      initializedRef.current = true;
    }, delayMs);
    
    // Backup timeout with longer delay
    const backupTimeoutId = setTimeout(() => {
      maintainScrollPosition();
    }, delayMs * 5);
    
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(backupTimeoutId);
    };
  }, [disabled, thresholdPx, delayMs]);
  
  return anchorRef;
} 