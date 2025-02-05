import { Toaster } from "@/components/ui/toaster";

export default function ListingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <Toaster />
    </>
  );
} 