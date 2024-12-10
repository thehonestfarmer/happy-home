"use client";
import FilterHeader from "@/app/FilterHeader";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { useMediaQuery } from "usehooks-ts";

export function AppSidebar() {
  const isDesktop = useMediaQuery("(min-width: 768px)");
  if (!isDesktop) return null;
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
