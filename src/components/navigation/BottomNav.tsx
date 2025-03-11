"use client";

import { Home, Heart, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Find Homes",
    href: "/",
    icon: Home
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
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
      <div className="border-t bg-background">
        <div className="grid grid-cols-3 h-16">
          {navItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href === '/' && pathname === '/listings');
              
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