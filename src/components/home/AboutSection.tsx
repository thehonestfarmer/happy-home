import Link from 'next/link';
import Image from 'next/image';

export const AboutSection = () => {
  return (
    <section className="py-16 bg-muted">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="relative h-[400px] rounded-lg overflow-hidden shadow-xl bg-muted/30 p-4">
          <Image 
            src="/images/home-sweet-home.svg"
            alt="Happy Home Japan team"
            fill
            className="object-contain"
          />
        </div>
        
        <div>
          <h2 className="text-3xl font-bold mb-6">Who is Happy Home Japan?</h2>
          <p className="text-foreground mb-4">
            Happy Home Japan is a specialized real estate platform connecting international buyers with Japanese property opportunities. 
            We bridge cultural and language barriers to make purchasing a home in Japan accessible and enjoyable.
          </p>
          <p className="text-foreground mb-6">
            Our team combines deep local knowledge with international expertise to guide you through every step of finding 
            and purchasing your dream Japanese property. We focus on the unique qualitative benefits of Japanese 
            property ownership, helping you find a home that enhances your lifestyle and provides authentic cultural experiences.
          </p>
          
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-card p-4 rounded-lg shadow-sm">
              <div className="text-primary text-2xl font-bold mb-2">10+</div>
              <div className="text-muted-foreground">Years of Experience</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm">
              <div className="text-primary text-2xl font-bold mb-2">300+</div>
              <div className="text-muted-foreground">Properties Sold</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm">
              <div className="text-primary text-2xl font-bold mb-2">20+</div>
              <div className="text-muted-foreground">Regions Covered</div>
            </div>
            <div className="bg-card p-4 rounded-lg shadow-sm">
              <div className="text-primary text-2xl font-bold mb-2">100%</div>
              <div className="text-muted-foreground">Client Satisfaction</div>
            </div>
          </div>
          
          <Link 
            href="/about"
            className="inline-flex items-center text-primary font-medium hover:text-primary/80 transition-colors"
          >
            Learn more about our story
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}; 