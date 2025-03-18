"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useMediaQuery } from "usehooks-ts";
import { MobileFilters } from "@/components/listings/MobileFilters";
import { motion, AnimatePresence } from "framer-motion";
import { useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from 'next/navigation';

export function AppSidebar() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { openMobile, setOpenMobile } = useSidebar();
  const pathname = usePathname();
  const isHomePage = pathname === '/' || pathname === '/listings';

  return (
    <Sidebar
      title="Filters"
      side={isDesktop ? "left" : "right"}
      className="z-[30]"
    >
      <AnimatePresence mode="wait">
        {openMobile && (
          <motion.div
            initial={{ x: "100%", boxShadow: "none" }}
            animate={{ 
              x: 0,
              boxShadow: "-4px 0 6px -1px rgb(0 0 0 / 0.1), -2px 0 4px -2px rgb(0 0 0 / 0.1)"
            }}
            exit={{ 
              x: "100%", 
              boxShadow: "none",
              transition: {
                type: "spring",
                damping: 40,
                stiffness: 400,
              }
            }}
            transition={{ 
              type: "spring",
              damping: 30,
              stiffness: 300,
              mass: 0.8
            }}
            className="fixed inset-y-0 right-0 w-[300px] bg-white border-l border-gray-200 overflow-hidden z-[999]"
          >
            <div className="flex items-center justify-between p-4 border-b bg-white sticky top-0 z-10">
              <h2 className="text-lg font-semibold text-gray-900">
                {isHomePage ? "Filters" : "Menu"}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenMobile(false)}
                className="h-8 w-8 rounded-full hover:bg-gray-100"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <SidebarContent className="h-[calc(100%-theme(spacing.16))] overflow-auto bg-gray-50/50">
              {isHomePage && (
                <div className="p-4">
                  <MobileFilters />
                </div>
              )}
              {/* Add other menu items here for non-home pages */}
            </SidebarContent>
            
            <SidebarFooter className="border-t bg-white p-4 sticky bottom-0 z-10 shadow-[0_-2px_4px_rgba(0,0,0,0.05)]">
              <div className="flex justify-between">
                <Button
                  variant="outline"
                  className="flex-1 mr-2"
                  onClick={() => setOpenMobile(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setOpenMobile(false)}
                >
                  Apply
                </Button>
              </div>
            </SidebarFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </Sidebar>
  );
}
