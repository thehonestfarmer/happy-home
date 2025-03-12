import Link from 'next/link';

export const CtaSection = () => {
  return (
    <section className="bg-primary py-16">
      <div className="max-w-5xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
          Ready to Find Your Dream Japanese Home?
        </h2>
        <p className="text-primary-foreground/90 text-lg mb-8 max-w-3xl mx-auto">
          Whether you're looking for a vacation property, permanent residence, or investment opportunity,
          we're here to help you navigate the Japanese real estate market with confidence.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            href="/listings"
            className="px-8 py-3 bg-white text-primary font-semibold rounded-md hover:bg-gray-100 transition-colors"
          >
            Browse Properties
          </Link>
          <Link 
            href="/contact"
            className="px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-md hover:bg-primary-foreground/10 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </section>
  );
}; 