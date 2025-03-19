"use client";

import { Home, Heart, User, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Home",
    href: "/",
    icon: Home
  },
  {
    label: "Browse",
    href: "/listings",
    icon: Search
  },
  {
    label: "Favorites",
    href: "/favorites",
    icon: Heart
  },
  {
    label: "Account",
    href: "/account",
    icon: User
  }
];

export function BottomNav() {
  const pathname = usePathname();
  
  // Don't render the navigation on the home page
  if (pathname === '/') {
    return null;
  }
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="border-t bg-background">
        <div className="grid grid-cols-4 h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/listings' && pathname.startsWith('/listings/'));
              
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 text-muted-foreground",
                  isActive && "text-primary"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
} 