import { AppProvider } from "@/AppContext";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import "yet-another-react-lightbox/styles.css";
import "./globals.css";
import Header from "./header";

const fontHeading = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-heading",
});

const fontBody = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

export default function Layout({ children }) {
  return (
    <html lang="en">
      <body
        className={cn(
          "antialiased",
          fontHeading.variable,
          fontBody.variable,
          "flex",
          "flex-col",
        )}
      >
        <SidebarProvider>
          <AppProvider>
            <AppSidebar />

            <Header />
            {children}
          </AppProvider>
        </SidebarProvider>
      </body>
    </html>
  );
}
