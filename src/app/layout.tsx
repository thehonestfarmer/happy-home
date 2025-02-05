import { AppProvider } from "@/AppContext";
import { Analytics } from "@vercel/analytics/react"
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import "yet-another-react-lightbox/styles.css";
import "./globals.css";
import "react-virtualized/styles.css";

import Header from "./header";
import { Toast } from "@/components/ui/toast";

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

const AnalyticsProdOnly = () => {
  if (process.env.NODE_ENV === "production") {
    return <Analytics />;
  }
  return null;
};

export default function Layout({ children }: { children: React.ReactNode }) {
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
        <AnalyticsProdOnly />
      </body>
    </html>
  );
}
