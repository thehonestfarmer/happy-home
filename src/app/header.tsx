"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import Link from "next/link";
import { useMediaQuery } from "usehooks-ts";

export default function Header() {
  return (
    <header className="sticky top-0 bg-primary text-primary-foreground py-4 px-6 z-[1]">
      <div className="container mx-auto flex justify-between items-center">
        <Link href="/" prefetch={false}>
          <h1 className="text-2xl font-bold">Shiawase Home</h1>
        </Link>
        <div className="lg:hidden">
          <SidebarTrigger />
        </div>
      </div>
    </header>
  );
}
// <div className="sm:hidden">
//   <nav className="sm:hidden">
//     <ul className="flex space-x-4">
//       <li>
//         <Link href="#" prefetch={false}>
//           Listings
//         </Link>
//       </li>
//       <li>
//         <Link href="#" prefetch={false}>
//           Contact
//         </Link>
//       </li>
//     </ul>
//   </nav>
// </div>
