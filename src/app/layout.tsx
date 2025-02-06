import { AppProvider } from "@/AppContext";
import { Analytics } from "@vercel/analytics/react"
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Inter } from "next/font/google";
import "yet-another-react-lightbox/styles.css";
import "./globals.css";
import "react-virtualized/styles.css";
import { Metadata } from 'next';

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

export const metadata: Metadata = {
  title: 'Happy Home Japan',
  description: 'Happy Home Japan is a real estate company that helps you find the perfect home in Japan.',
  openGraph: {
    title: 'Happy Home Japan',
    description: 'Happy Home Japan is a real estate company that helps you find the perfect home in Japan.',
    images: [
      {
        url: '/sample-1.jpeg',
        width: 1200,
        height: 630,
        alt: 'Happy Home Japan',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Happy Home Japan',
    description: 'Happy Home Japan is a real estate company that helps you find the perfect home in Japan.',
    images: ['/sample-1.jpeg'],
    creator: '@yourtwitterhandle',
  },
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: '32x32',
        type: 'image/x-icon',
      },
      {
        url: '/icon.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        url: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/safari-pinned-tab.svg',
        color: '#5bbad5', // You can adjust this color to match your brand
      },
    ],
  },
  manifest: '/manifest.json',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {/* Add any additional meta tags here */}
      </head>
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
