import Image from 'next/image';
import Link from 'next/link';

export default function PurchaseGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* This would be a Prismic Slice in the future */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-6">How to Purchase a Home in Japan</h1>
        <div className="w-20 h-1 bg-indigo-600 mb-8"></div>
        <p className="text-gray-600 text-lg">
          A comprehensive guide to help international buyers navigate the Japanese property market, 
          from finding the perfect property to completing the purchase.
        </p>
      </div>

      {/* Hero image - would be a Prismic image field */}
      <div className="relative h-[400px] rounded-lg overflow-hidden mb-12">
        <Image
          src="/images/buy-house.svg"
          alt="Japanese real estate purchase process"
          fill
          className="object-contain"
        />
      </div>

      {/* Content sections - would be Prismic rich text or slices */}
      <section className="prose prose-lg max-w-none mb-12">
        <h2>Understanding the Japanese Property Market</h2>
        <p>
          Unlike many Western markets, Japanese real estate tends to depreciate over time, 
          with land retaining value but buildings typically depreciating. This creates a 
          unique market dynamic that foreign buyers should understand before investing.
        </p>
        <p>
          The Japanese property market offers several advantages for international buyers:
        </p>
        <ul>
          <li>No restrictions on foreign ownership</li>
          <li>Relatively affordable prices compared to other developed nations</li>
          <li>Low-interest rates for financing</li>
          <li>Minimal property taxes</li>
          <li>Freehold ownership structure</li>
        </ul>
        <p>
          However, the market also presents unique challenges, including language barriers, 
          cultural differences in business practices, and a different approach to property valuation.
        </p>
      </section>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>The Purchase Process Step-by-Step</h2>
        
        <h3>1. Property Search and Selection</h3>
        <p>
          Begin by defining your criteria (location, size, budget) and working with a 
          bilingual real estate agent who specializes in helping foreign buyers. Visit 
          properties in person when possible, or arrange virtual tours.
        </p>
        
        <h3>2. Making an Offer</h3>
        <p>
          Once you've found a property, your agent will help you make an offer. Unlike 
          some countries, there is typically less negotiation in Japanese real estate transactions, 
          with prices often set close to the final amount.
        </p>
        
        <h3>3. Signing the Purchase Agreement</h3>
        <p>
          Upon acceptance of your offer, you'll sign a purchase agreement (売買契約書, baibai keiyakusho). 
          This document outlines all terms of the sale, including price, payment schedule, and 
          conditions. At this stage, you'll typically pay a deposit of 10% of the purchase price.
        </p>
        
        <h3>4. Property Registration and Transfer</h3>
        <p>
          The final transfer of ownership requires registration with the Legal Affairs Bureau. 
          This process involves paying the remaining balance, various taxes and fees, and 
          completing paperwork to officially transfer the property title.
        </p>
      </section>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>Financing Options for Foreign Buyers</h2>
        <p>
          Securing financing as a foreign buyer can be challenging but is possible through:
        </p>
        <ul>
          <li>Japanese banks that offer mortgages to foreign residents</li>
          <li>International banks with branches in Japan</li>
          <li>Seller financing arrangements</li>
          <li>Cash purchases (most common for foreign investors)</li>
        </ul>
        <p>
          Mortgage options typically require established residency in Japan, a valid visa, 
          and stable income. Interest rates are generally very competitive compared to other countries.
        </p>
      </section>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>Taxes and Fees</h2>
        <p>
          Be prepared for various taxes and fees throughout the purchase process:
        </p>
        <ul>
          <li>Registration tax (0.4-2% of property value)</li>
          <li>Stamp duty (¥10,000-¥600,000 depending on purchase price)</li>
          <li>Real estate acquisition tax (3-4% of assessed value)</li>
          <li>Agent's commission (typically 3% + ¥60,000 + tax)</li>
          <li>Legal fees for judicial scrivener (司法書士, shiho shoshi)</li>
        </ul>
        <p>
          After purchase, ongoing costs include fixed asset tax (固定資産税, kotei shisan zei) 
          and city planning tax (都市計画税, toshi keikaku zei), typically totaling 1.4-1.7% 
          of the government's assessed value annually.
        </p>
      </section>

      {/* Call to action - would be a Prismic slice */}
      <div className="bg-muted p-8 rounded-lg">
        <h3 className="text-2xl font-bold mb-4">Ready to Start Your Property Journey?</h3>
        <p className="mb-6">
          Our team of experts can guide you through every step of purchasing your Japanese dream home.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/listings"
            className="px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-md hover:bg-primary/90 transition-colors text-center"
          >
            Browse Properties
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 border border-primary text-primary font-semibold rounded-md hover:bg-muted/80 transition-colors text-center"
          >
            Contact Our Experts
          </Link>
        </div>
      </div>
    </main>
  );
} 