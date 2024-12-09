import { Calendar, Home, Inbox, Search, Settings } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import FilterHeader from "@/app/FilterHeader";
import { Dialog, DialogTitle } from "@radix-ui/react-dialog";

// Menu items.
const items = [
  {
    title: "Home",
    url: "#",
    icon: Home,
  },
  {
    title: "Inbox",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Calendar",
    url: "#",
    icon: Calendar,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
];

export function AppSidebar() {
  return (
    <Sidebar title="Find your happy home" side="right" className="z-[2]">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Filters</SidebarGroupLabel>
          <SidebarGroupContent>
            <FilterHeader />
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarContent>Made by Tony</SidebarContent>{" "}
      </SidebarFooter>
    </Sidebar>
  );
}
// {items.map((item) => (
//   <SidebarMenuItem key={item.title}>
//     <SidebarMenuButton asChild>
//       <a href={item.url}>
//         <item.icon />
//         <span>{item.title}</span>
//       </a>
//     </SidebarMenuButton>
//   </SidebarMenuItem>
// ))}
