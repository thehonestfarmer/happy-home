"use client"
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export const HeroSection = () => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Trigger animations after component mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Animation classes based on visibility state
  const titleClasses = `text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl 
    transform transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`;
  
  const descriptionClasses = `text-xl md:text-2xl mb-8 max-w-2xl 
    transform transition-all duration-700 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`;
  
  const buttonsClasses = `flex flex-col sm:flex-row gap-4 
    transform transition-all duration-700 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5'}`;
  
  return (
    <section className="relative h-[70vh] min-h-[600px] w-full overflow-hidden">
      {/* Background image with overlay */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-black/40 z-10" />
        <Image 
          src="/images/hero-bg.avif" 
          alt="Beautiful Japanese home with mountain view"
          fill
          priority
          className="object-cover"
          placeholder="blur"
          blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88P/BfwAJKwN8QIlJ2gAAAABJRU5ErkJggg=="
        />
      </div>
      
      {/* Content */}
      <div className="relative z-20 h-full flex flex-col justify-center items-center px-4 text-center text-white">
        {/* Title with animation */}
        <h1 className={titleClasses}>
          Your Dream Japanese Home Awaits
        </h1>
        
        {/* Description with animation */}
        <p className={descriptionClasses}>
          Connecting international buyers with authentic Japanese properties for lifestyle enrichment and cultural immersion.
        </p>
        
        {/* Buttons with animation */}
        <div className={buttonsClasses}>
          <Link 
            href="/listings" 
            className="inline-block px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md transition-colors hover:scale-105 active:scale-95"
          >
            Browse Properties
          </Link>
          
          <Link 
            href="/guides/purchase" 
            className="inline-block px-8 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-md transition-colors hover:scale-105 active:scale-95"
          >
            How To Buy
          </Link>
        </div>
      </div>
    </section>
  );
}; 