import Image from 'next/image';
import Link from 'next/link';

export default function RenovationGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* This would be a Prismic Slice in the future */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-6">Renovating Traditional Japanese Homes</h1>
        <div className="w-20 h-1 bg-primary mb-8"></div>
        <p className="text-muted-foreground text-lg">
          Discover how to breathe new life into traditional Japanese properties while 
          preserving their unique heritage, cultural value, and architectural charm.
        </p>
      </div>

      {/* Hero image - would be a Prismic image field */}
      <div className="relative h-[400px] rounded-lg overflow-hidden mb-12">
        <Image
          src="/images/renovating-home.svg"
          alt="Traditional Japanese home being renovated"
          fill
          className="object-cover"
        />
      </div>

      {/* Content sections - would be Prismic rich text or slices */}
      <section className="prose prose-lg max-w-none mb-12">
        <h2>The Charm of Traditional Japanese Architecture</h2>
        <p>
          Traditional Japanese homes, often referred to as <em>kominka</em> (古民家), represent 
          centuries of architectural wisdom and cultural values. These buildings feature distinctive 
          elements that reflect Japan's deep connection to nature, minimalism, and seasonal change:
        </p>
        <ul>
          <li><strong>Wood-frame structures</strong> built with traditional joinery techniques that use few nails</li>
          <li><strong>Tatami flooring</strong> made from woven rush grass over compressed rice straw</li>
          <li><strong>Shoji screens</strong> - translucent paper sliding doors that filter natural light</li>
          <li><strong>Fusuma</strong> - opaque sliding panels used to flexibly divide interior spaces</li>
          <li><strong>Engawa</strong> - wooden verandas that connect indoor and outdoor spaces</li>
          <li><strong>Tiled roofs</strong> with deep eaves to protect walls from rain and sun</li>
        </ul>
        <p>
          While these homes embody timeless aesthetic principles, they often require significant 
          updates to meet modern comfort standards and building codes.
        </p>
      </section>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>Common Renovation Challenges</h2>
        
        <h3>Structural Integrity</h3>
        <p>
          Many traditional homes were built before modern earthquake codes. Foundation reinforcement, 
          beam strengthening, and wall bracing are often necessary to meet current safety standards 
          while preserving the home's character.
        </p>
        
        <h3>Insulation and Climate Control</h3>
        <p>
          Traditional homes were designed for seasonal ventilation rather than insulation. Adding 
          appropriate insulation to walls, floors, and ceilings without compromising the structure's 
          breathability is a key challenge. Many renovators opt for natural insulation materials like 
          wool, cellulose, or modern reflective barriers that work with the home's original design principles.
        </p>
        
        <h3>Plumbing and Electrical Systems</h3>
        <p>
          Installing modern utilities while preserving historical features requires creative solutions. 
          Running electrical wiring through traditional post-and-beam structures or installing 
          plumbing in homes with elevated wooden floors demands specialized approaches.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="relative h-[300px] rounded-lg overflow-hidden">
          <Image 
            src="/images/renovation-traditional-modern.jpg" 
            alt="Traditional Japanese home with modern elements"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="text-2xl font-bold mb-4">Balancing Tradition and Modern Comfort</h3>
          <p className="text-foreground">
            Successful renovation finds harmony between preserving traditional elements and 
            incorporating modern necessities. The most satisfying projects maintain the soul of 
            the original structure while enhancing livability with thoughtful updates to kitchens, 
            bathrooms, and living spaces that complement rather than conflict with the home's character.
          </p>
        </div>
      </div>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>The Renovation Process</h2>
        
        <h3>1. Assessment and Planning</h3>
        <p>
          Begin with a thorough structural inspection by professionals experienced with traditional 
          Japanese architecture. Document original features worth preserving and identify areas 
          requiring repair or modification.
        </p>
        
        <h3>2. Permitting and Regulations</h3>
        <p>
          Navigating Japan's building codes for renovations can be complex, especially for properties 
          with historical value. Some areas offer incentives for preserving traditional homes, while 
          others have strict requirements for structural updates. Working with architects and builders 
          familiar with local regulations is essential.
        </p>
        
        <h3>3. Finding Specialized Craftspeople</h3>
        <p>
          Traditional Japanese carpentry (<em>miyadaiku</em>) and other traditional crafts involve 
          specialized techniques passed down through generations. Finding artisans skilled in these 
          traditional methods is crucial for authentic restoration work but may require searching 
          beyond your immediate area.
        </p>
        
        <h3>4. Material Sourcing</h3>
        <p>
          Authentic materials like hand-made tiles, specific wood species, and traditional 
          plasters might be difficult to source. Some renovators incorporate reclaimed materials 
          from other old structures or carefully selected modern alternatives that respect the 
          original aesthetic.
        </p>
      </section>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>Cost Considerations</h2>
        <p>
          Renovating traditional Japanese homes involves unique cost factors:
        </p>
        <ul>
          <li><strong>Specialized labor:</strong> Traditional craftspeople command premium rates for their expertise</li>
          <li><strong>Unexpected issues:</strong> Old structures often reveal hidden problems once work begins</li>
          <li><strong>Quality materials:</strong> Authentic traditional materials can be costly and difficult to source</li>
          <li><strong>Modern systems integration:</strong> Retrofitting heating, cooling, and plumbing requires creative solutions</li>
        </ul>
        <p>
          While initial purchase prices for traditional homes can be surprisingly affordable, 
          renovation budgets should typically account for 1.5 to 3 times the purchase price 
          depending on the property's condition and the scope of updates planned.
        </p>
      </section>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>Preservation vs. Adaptation</h2>
        <p>
          Successful renovations find the right balance between preserving historical elements 
          and adapting the home for contemporary living. Consider:
        </p>
        
        <h3>Elements Worth Preserving</h3>
        <p>
          Certain features define the character of traditional Japanese homes and should be 
          maintained whenever possible:
        </p>
        <ul>
          <li>Original structural timber frames and joinery</li>
          <li>Traditional tatami rooms</li>
          <li>Tokonoma (decorative alcoves)</li>
          <li>Shoji and fusuma screens</li>
          <li>Engawa verandas</li>
          <li>Custom-made traditional fixtures</li>
        </ul>
        
        <h3>Areas for Modernization</h3>
        <p>
          Certain spaces benefit most from contemporary updates:
        </p>
        <ul>
          <li>Kitchens and bathrooms</li>
          <li>Heating and cooling systems</li>
          <li>Electrical systems and lighting</li>
          <li>Foundations and structural reinforcement</li>
          <li>Insulation and weatherproofing</li>
        </ul>
      </section>

      {/* Testimonial - would be a Prismic slice */}
      <div className="bg-muted p-8 rounded-lg mb-12">
        <svg className="h-8 w-8 text-accent-yellow mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="text-foreground italic text-lg mb-4">
          "Renovating our 90-year-old kominka in rural Shikoku was both the most challenging and 
          rewarding project of our lives. Working with local craftsmen to preserve the hand-hewn 
          beams and original roof structure while modernizing the kitchen and bathrooms gave us 
          a profound appreciation for Japanese architectural traditions. The house now feels both 
          authentically historical and perfectly suited to contemporary living."
        </p>
        <div className="flex items-center">
          <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
            <Image
              src="/images/testimonial-renovation.jpg"
              alt="David and Mariko Suzuki"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h4 className="font-semibold">David and Mariko Suzuki</h4>
            <p className="text-muted-foreground text-sm">Kominka renovators in Tokushima</p>
          </div>
        </div>
      </div>

      {/* Call to action - would be a Prismic slice */}
      <div className="bg-primary text-primary-foreground p-8 rounded-lg">
        <h3 className="text-2xl font-bold mb-4">Ready to Explore Renovation Opportunities?</h3>
        <p className="mb-6">
          Discover traditional Japanese properties with renovation potential in our carefully 
          curated listings. Our team can connect you with experienced architects, craftspeople, 
          and renovation experts.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/listings?type=traditional"
            className="px-6 py-3 bg-white text-primary font-semibold rounded-md hover:bg-gray-100 transition-colors text-center"
          >
            View Traditional Properties
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 border border-white text-white font-semibold rounded-md hover:bg-primary-foreground/10 transition-colors text-center"
          >
            Consult Our Renovation Experts
          </Link>
        </div>
      </div>
    </main>
  );
} 