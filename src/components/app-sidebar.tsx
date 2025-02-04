"use client";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useMediaQuery } from "usehooks-ts";
import { MobileFilters } from "@/components/listings/MobileFilters";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";
import { useSidebar } from "@/components/ui/sidebar";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AppSidebar() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <Sidebar
      title="Filters"
      side={isDesktop ? "left" : "right"}
      className="z-[2]"
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
            className="fixed inset-y-0 right-0 w-[300px] bg-white border-l border-transparent"
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Filters</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpenMobile(false)}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>

            <SidebarContent className="h-[calc(100%-theme(spacing.16))] overflow-auto">
              <div className="lg:hidden">
                <MobileFilters />
              </div>
            </SidebarContent>
            <SidebarFooter className="border-t bg-white p-4">
              <p className="text-sm text-muted-foreground text-center">
                Made by Tony
              </p>
            </SidebarFooter>
          </motion.div>
        )}
      </AnimatePresence>
    </Sidebar>
  );
}
