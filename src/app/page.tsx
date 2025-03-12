import { HeroSection } from "@/components/home/HeroSection";
import { AboutSection } from "@/components/home/AboutSection";
import { FeaturedListings } from "@/components/home/FeaturedListings";
import { GuidesSection } from "@/components/home/GuidesSection";
import { FaqSection } from "@/components/home/FaqSection";
import { CtaSection } from "@/components/home/CtaSection";

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <FeaturedListings />
      <AboutSection />
      <GuidesSection />
      <FaqSection />
      <CtaSection />
    </main>
  );
}
