import Image from 'next/image';
import Link from 'next/link';

export default function CountrysideGuidePage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12">
      {/* This would be a Prismic Slice in the future */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-6">Living in the Japanese Countryside</h1>
        <div className="w-20 h-1 bg-indigo-600 mb-8"></div>
        <p className="text-gray-600 text-lg">
          Discover the authentic charm, natural beauty, and rich cultural experiences of rural Japan, 
          and learn how to integrate into countryside communities as a foreign resident.
        </p>
      </div>

      {/* Hero image - would be a Prismic image field */}
      <div className="relative h-[400px] rounded-lg overflow-hidden mb-12">
        <Image
          src="/images/countryside.svg"
          alt="Beautiful Japanese countryside with mountains and traditional houses"
          fill
          className="object-contain"
        />
      </div>

      {/* Content sections - would be Prismic rich text or slices */}
      <section className="prose prose-lg max-w-none mb-12">
        <h2>The Appeal of Rural Japan</h2>
        <p>
          While Japan's bustling metropolises like Tokyo and Osaka capture global attention, 
          the countryside (田舎, inaka) offers a completely different lifestyle that many 
          international residents find deeply rewarding. Rural Japan presents:
        </p>
        <ul>
          <li>Stunning natural landscapes, from mountains and forests to coastlines and rice fields</li>
          <li>Well-preserved traditional architecture and cultural practices</li>
          <li>Strong community bonds and slower pace of life</li>
          <li>Significantly lower cost of living compared to urban centers</li>
          <li>Authentic experiences of Japanese traditions and seasonal celebrations</li>
        </ul>
        <p>
          For many foreign residents, countryside living offers the quintessential Japanese 
          experience that initially drew them to the country—a lifestyle increasingly difficult 
          to find in modernized urban areas.
        </p>
      </section>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>Regional Diversity</h2>
        <p>
          Japan's countryside is remarkably diverse, with each region offering distinct:
        </p>
        
        <h3>Climate Variations</h3>
        <p>
          From the snowy winters of Hokkaido and the Japan Sea coast to the subtropical 
          climate of southern Kyushu and Okinawa, Japan's countryside offers dramatically 
          different environmental experiences.
        </p>
        
        <h3>Cultural Traditions</h3>
        <p>
          Each region maintains unique festivals, crafts, dialects, and culinary traditions 
          that have developed over centuries, providing rich cultural diversity within the country.
        </p>
        
        <h3>Architectural Styles</h3>
        <p>
          Traditional housing styles vary significantly by region, from the heavy snow-resistant 
          designs of mountain areas to the open layouts of warmer regions, each adapted to local 
          environmental conditions.
        </p>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <div className="relative h-[300px] rounded-lg overflow-hidden">
          <Image 
            src="/images/countryside-seasons.jpg" 
            alt="Japanese countryside through four seasons"
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="text-2xl font-bold mb-4">Experiencing Four Distinct Seasons</h3>
          <p className="text-gray-700">
            Rural Japan offers a front-row seat to the country's celebrated seasonal changes: 
            cherry blossoms in spring, lush greenery and festivals in summer, vibrant foliage 
            in autumn, and often snow-covered landscapes in winter. These seasonal rhythms 
            deeply influence daily life, local cuisine, and cultural activities.
          </p>
        </div>
      </div>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>Practical Considerations for Foreign Residents</h2>
        
        <h3>Transportation</h3>
        <p>
          Rural areas typically have less frequent public transportation, making a car essential 
          for most countryside residents. Road systems are generally excellent, but mountain 
          areas may present challenging driving conditions, especially in winter.
        </p>
        
        <h3>Healthcare Access</h3>
        <p>
          While Japan boasts excellent healthcare, rural areas may have fewer medical facilities 
          and fewer English-speaking doctors. Consider proximity to hospitals when choosing a location, 
          especially if you have specific health concerns.
        </p>
        
        <h3>Internet and Connectivity</h3>
        <p>
          Japan has rolled out high-speed internet to most rural areas, though some very remote 
          locations may have more limited options. Mobile coverage is generally good throughout 
          the country.
        </p>
        
        <h3>Language Considerations</h3>
        <p>
          English proficiency tends to be lower in rural areas compared to major cities. 
          Basic Japanese language skills significantly enhance the countryside living experience 
          and are essential for community integration.
        </p>
      </section>

      <section className="prose prose-lg max-w-none mb-12">
        <h2>Community Integration</h2>
        <p>
          Rural Japanese communities often maintain stronger traditional social structures than urban areas. 
          Understanding and respecting these community dynamics is key to successful integration:
        </p>
        
        <h3>Neighborhood Associations</h3>
        <p>
          Many rural communities have active neighborhood associations (町内会, chōnaikai) that 
          organize local events, manage community spaces, and communicate important information. 
          Participating in these groups is an excellent way to integrate.
        </p>
        
        <h3>Local Customs and Etiquette</h3>
        <p>
          Rural areas often observe traditional customs more strictly than cities. Taking time 
          to learn about local etiquette—from proper greetings to gift-giving practices—demonstrates 
          respect and facilitates acceptance.
        </p>
        
        <h3>Seasonal Activities and Festivals</h3>
        <p>
          Participating in seasonal activities like rice planting, harvest festivals, or 
          local matsuri (festivals) provides natural opportunities to connect with neighbors 
          and experience authentic cultural traditions.
        </p>
      </section>

      {/* Testimonial - would be a Prismic slice */}
      <div className="bg-muted p-8 rounded-lg mb-12">
        <svg className="h-8 w-8 text-accent-yellow mb-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
        </svg>
        <p className="text-foreground italic text-lg mb-4">
          "Moving from London to rural Shimane Prefecture was a complete lifestyle transformation. 
          The natural beauty, slower pace, and warm community have given me a deeper connection 
          to Japan than I ever imagined possible. Learning the language and participating in 
          local traditions was essential to feeling at home here."
        </p>
        <div className="flex items-center">
          <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
            <Image
              src="/images/testimonial-countryside.jpg"
              alt="James Wilson"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h4 className="font-semibold">James Wilson</h4>
            <p className="text-muted-foreground text-sm">Living in Shimane since 2018</p>
          </div>
        </div>
      </div>

      {/* Call to action - would be a Prismic slice */}
      <div className="bg-primary text-primary-foreground p-8 rounded-lg">
        <h3 className="text-2xl font-bold mb-4">Ready to Explore Countryside Properties?</h3>
        <p className="mb-6">
          Discover authentic Japanese homes in beautiful rural settings, from traditional 
          kominka to modern countryside retreats.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/listings?region=countryside"
            className="px-6 py-3 bg-white text-primary font-semibold rounded-md hover:bg-gray-100 transition-colors text-center"
          >
            Browse Countryside Properties
          </Link>
          <Link
            href="/contact"
            className="px-6 py-3 border border-white text-white font-semibold rounded-md hover:bg-primary-foreground/10 transition-colors text-center"
          >
            Ask Us About Rural Living
          </Link>
        </div>
      </div>
    </main>
  );
} 