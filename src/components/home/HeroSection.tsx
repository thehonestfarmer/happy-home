import Link from 'next/link';
import Image from 'next/image';

export const HeroSection = () => {
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
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 max-w-4xl">
          Your Dream Japanese Home Awaits
        </h1>
        <p className="text-xl md:text-2xl mb-8 max-w-2xl">
          Connecting international buyers with authentic Japanese properties for lifestyle enrichment and cultural immersion.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link 
            href="/listings" 
            className="px-8 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-md transition-colors"
          >
            Browse Properties
          </Link>
          <Link 
            href="/guides/purchase" 
            className="px-8 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold rounded-md transition-colors"
          >
            How To Buy
          </Link>
        </div>
      </div>
    </section>
  );
}; 