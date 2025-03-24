"use client";

import { useState, useEffect } from 'react';
import { Bug, X, Trash2, Eye, ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface LocalStorageItem {
  key: string;
  value: string;
  size: number;
}

export function DebugMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLocalhost, setIsLocalhost] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [localStorageItems, setLocalStorageItems] = useState<LocalStorageItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Only show in development/localhost environments
  useEffect(() => {
    setIsMounted(true);
    const hostname = window.location.hostname;
    setIsLocalhost(hostname === 'localhost' || hostname === '127.0.0.1');
  }, []);

  // Update the list of localStorage items when the menu is opened
  useEffect(() => {
    if (isOpen && typeof window !== 'undefined') {
      const items: LocalStorageItem[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          items.push({
            key,
            value,
            size: value.length
          });
        }
      }
      setLocalStorageItems(items);
    }
  }, [isOpen]);

  // If not on localhost or component hasn't mounted yet, don't render anything
  if (!isMounted || !isLocalhost) return null;

  const clearLocalStorage = () => {
    localStorage.clear();
    setLocalStorageItems([]);
    setExpandedItem(null);
    alert('localStorage cleared successfully');
  };

  const clearViewedListings = () => {
    localStorage.removeItem('viewedListings');
    setLocalStorageItems(prev => prev.filter(item => item.key !== 'viewedListings'));
    if (expandedItem === 'viewedListings') {
      setExpandedItem(null);
    }
    alert('Viewed listings cleared successfully');
  };

  const toggleItemExpand = (key: string) => {
    setExpandedItem(expandedItem === key ? null : key);
  };

  const formatStorageValue = (value: string): string => {
    try {
      // Try to parse as JSON for pretty display
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      // If not valid JSON, return as is
      return value;
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-50">
      {/* Toggle Button */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className="h-10 w-10 rounded-full bg-yellow-500 hover:bg-yellow-600 shadow-lg"
      >
        {isOpen ? (
          <X className="h-5 w-5 text-white" />
        ) : (
          <Bug className="h-5 w-5 text-white" />
        )}
        <span className="sr-only">Toggle Debug Menu</span>
      </Button>

      {/* Debug Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-12 right-0 mb-2 w-80 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg overflow-hidden"
          >
            <div className="bg-yellow-100 px-4 py-2 border-b border-yellow-200">
              <h3 className="font-medium text-yellow-800 text-sm">Debug Menu</h3>
              <p className="text-yellow-700 text-xs">Localhost Only</p>
            </div>
            
            <div className="p-3 space-y-2">
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-yellow-800">localStorage Management</h4>
                
                {/* Clear viewed listings */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full flex items-center justify-center text-xs h-8 border-yellow-300"
                  onClick={clearViewedListings}
                >
                  <Eye className="h-3.5 w-3.5 mr-1.5" />
                  Clear Viewed Listings
                </Button>
                
                {/* Clear all localStorage */}
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full flex items-center justify-center text-xs h-8"
                  onClick={clearLocalStorage}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Clear All localStorage
                </Button>
              </div>
              
              {/* Show localStorage contents */}
              {localStorageItems.length > 0 && (
                <div className="space-y-1 mt-2">
                  <h4 className="text-xs font-medium text-yellow-800">Current Items (click to inspect):</h4>
                  <div className="max-h-64 overflow-y-auto bg-yellow-100 rounded p-2">
                    {localStorageItems.map((item) => (
                      <div key={item.key} className="text-xs mb-1">
                        <button 
                          onClick={() => toggleItemExpand(item.key)}
                          className="w-full text-left flex items-center justify-between hover:bg-yellow-200 p-1 rounded"
                        >
                          <div className="flex items-center">
                            {expandedItem === item.key ? 
                              <ChevronDown className="h-3 w-3 mr-1 text-yellow-700" /> : 
                              <ChevronRight className="h-3 w-3 mr-1 text-yellow-700" />
                            }
                            <span className="font-medium text-yellow-800">{item.key}</span>
                          </div>
                          <span className="text-yellow-600 text-xs">{item.size} bytes</span>
                        </button>
                        
                        {expandedItem === item.key && (
                          <div className="mt-1 ml-4 p-2 bg-white rounded border border-yellow-200 overflow-x-auto">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap break-words">
                              {formatStorageValue(item.value)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Version info */}
              <div className="pt-1 text-xs text-yellow-600 italic border-t border-yellow-200 mt-2">
                Debug panel v1.0
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 