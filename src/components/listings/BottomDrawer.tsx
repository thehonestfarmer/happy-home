"use client";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect } from "react";
import FilterHeader from "@/app/FilterHeader";
import { useAppContext } from "@/AppContext";

interface BottomDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BottomDrawer({ isOpen, onClose }: BottomDrawerProps) {
  const { filterState } = useAppContext();

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop - clicking this closes the drawer */}
          <motion.div
            className="fixed inset-0 bg-black/25 z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Drawer panel - auto height with max constraint */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-xl flex flex-col max-h-[85vh]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 300,
            }}
          >
            {/* Drawer header with handle - sticky */}
            <div className="flex flex-col items-center border-b sticky top-0 bg-white z-10">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full my-2" />
              
              <div className="flex items-center justify-between w-full px-4 py-2">
                <h2 className="text-lg font-semibold">Filters</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 rounded-full hover:bg-gray-100"
                >
                  <X className="h-4 w-4" />
                  <span className="sr-only">Close</span>
                </Button>
              </div>
            </div>
            
            {/* Drawer content - scrollable if needed */}
            <div className="overflow-y-auto p-4 pb-24 bg-gray-50/50">
              <div className="space-y-6">
                {/* Price and other filters */}
                <FilterHeader />
                
                {/* Additional filter sections can be added here */}
              </div>
            </div>
            
            {/* Drawer footer with actions - sticky */}
            <div className="border-t bg-white p-4 shadow-[0_-2px_4px_rgba(0,0,0,0.05)] sticky bottom-0 z-50">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  className="flex-1 mr-2"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={onClose}
                >
                  Apply
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 