import Image from 'next/image';
import Link from 'next/link';

// Team members data - would be from Prismic in the future
const teamMembers = [
  {
    id: '1',
    name: 'Anthony Chung', // Replace with your actual name
    role: 'Founder',
    bio: 'As the founder of Happy Home Japan, I bring dedicated service and personal attention to each client. With extensive knowledge of the Japanese real estate market, I help international buyers navigate the unique aspects of purchasing property in Japan.',
    imageUrl: '/images/engineer-coding.svg' // Replace with your actual photo
  }
];

// Partnership data
const partnerCompany = {
  name: 'Shiawase Home',
  description: 'Happy Home Japan operates in partnership with Shiawase Home, a respected Japanese real estate company. This strategic alliance allows us to offer our clients the best of both worlds: personalized international service combined with deep local expertise and resources.',
  imageUrl: '/images/shiawase-logo.jpg' // Replace with actual logo/image
};

export default function AboutPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      {/* Mission Statement */}
      <section className="mb-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <h1 className="text-4xl font-bold mb-6">About Happy Home Japan</h1>
          <div className="w-20 h-1 bg-primary mx-auto mb-8"></div>
          <p className="text-xl text-foreground mb-8">
            We connect international buyers with authentic Japanese properties,
            making the dream of owning a home in Japan accessible, enjoyable, and enriching.
          </p>
        </div>
        
        <div className="relative h-[500px] rounded-xl overflow-hidden mb-12">
          <Image
            src="/images/japan.svg"
            alt="Happy Home Japan team and properties"
            fill
            className="object-contain"
          />
        </div>
      </section>
      
      {/* Our Story */}
      <section className="mb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6">Our Story</h2>
            <p className="text-gray-700 mb-4">
              Happy Home Japan was founded in 2015 with a simple mission: to help international 
              buyers discover the unique joys of owning a home in Japan. We recognized that while 
              there was growing interest in Japanese real estate among foreign buyers, there were 
              few resources that truly understood their needs and concerns.
            </p>
            <p className="text-gray-700 mb-4">
              Our founder, Anthony Chung, had witnessed firsthand the challenges faced by international 
              friends trying to purchase property in Japan. Language barriers, cultural differences, 
              and lack of familiarity with local procedures created unnecessary obstacles for what 
              should be an exciting journey.
            </p>
            <p className="text-gray-700">
              What began as a small consultancy has grown into a comprehensive platform connecting 
              buyers from over 30 countries with properties throughout Japan. Throughout our growth, 
              we&apos;ve maintained our core commitment: providing personalized, culturally-sensitive 
              guidance that helps each client find not just a property, but a home that enhances 
              their connection to Japan.
            </p>
          </div>
          <div className="relative h-[400px] rounded-lg overflow-hidden">
            <Image 
              src="/images/best-place.svg" 
              alt="Happy Home Japan&apos;s journey"
              fill
              className="object-contain"
            />
          </div>
        </div>
      </section>
      
      {/* Our Values */}
      <section className="mb-16 bg-muted p-12 rounded-xl">
        <h2 className="text-3xl font-bold mb-8 text-center">Our Values</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Cultural Bridge</h3>
            <p className="text-muted-foreground">
              We don&apos;t just translate language – we translate cultural context, helping clients 
              understand the unique aspects of Japanese property ownership and community life.
            </p>
          </div>
          <div className="text-center">
            <div className="bg-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Authenticity</h3>
            <p className="text-muted-foreground">
              We present Japanese properties honestly, setting realistic expectations about both 
              benefits and challenges, ensuring clients make informed decisions.
            </p>
          </div>
          <div className="text-center">
            <div className="bg-accent rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-3">Community Focus</h3>
            <p className="text-muted-foreground">
              We believe a home is more than a building – it&apos;s a connection to community. 
              We help clients find properties where they can truly belong.
            </p>
          </div>
        </div>
      </section>
      
      {/* Our Team */}
      <section className="mb-16">
        <h2 className="text-3xl font-bold mb-8 text-center">Who We Are</h2>
        
        {/* Founder Card */}
        {teamMembers.map((member) => (
          <div key={member.id} className="bg-card rounded-lg shadow-md overflow-hidden flex flex-col md:flex-row mb-10">
            <div className="relative w-full md:w-1/3 h-64 md:h-auto">
              <Image
                src={member.imageUrl}
                alt={member.name}
                fill
                className="object-contain"
              />
            </div>
            <div className="p-6 md:w-2/3">
              <h3 className="text-xl font-semibold mb-1">{member.name}</h3>
              <p className="text-primary mb-4">{member.role}</p>
              <p className="text-muted-foreground">{member.bio}</p>
            </div>
          </div>
        ))}
        
        {/* Partnership Section */}
        <h3 className="text-2xl font-semibold mb-6 text-center mt-12">Our Partnership</h3>
        <div className="bg-card rounded-lg shadow-md overflow-hidden p-6">
          <div className="flex flex-col md:flex-row items-center gap-6 mb-4">
            <div className="relative w-full md:w-1/4 h-48">
              <Image
                src={partnerCompany.imageUrl}
                alt={partnerCompany.name}
                fill
                className="object-contain"
              />
            </div>
            <div className="md:w-3/4">
              <h4 className="text-xl font-semibold mb-3">{partnerCompany.name}</h4>
              <p className="text-muted-foreground">{partnerCompany.description}</p>
            </div>
          </div>
          <div className="mt-4">
            <h4 className="text-lg font-semibold mb-2">What This Means For You:</h4>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li className="mb-1">Personalized service with a direct relationship to the founder</li>
              <li className="mb-1">Access to established networks and resources in the Japanese real estate market</li>
              <li className="mb-1">Expertise in both international client needs and local Japanese property practices</li>
              <li>Streamlined communication with a single point of contact who coordinates all aspects of your property journey</li>
            </ul>
          </div>
        </div>
      </section>
      
      {/* CTA */}
      <section className="bg-primary text-primary-foreground p-12 rounded-xl text-center">
        <h2 className="text-3xl font-bold mb-6">Ready to Start Your Japanese Property Journey?</h2>
        <p className="text-xl mb-8 max-w-3xl mx-auto">
          I'm ready to help you find the perfect Japanese property that matches your lifestyle, 
          goals, and dreams. Let's begin the journey together.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link 
            href="/listings"
            className="px-8 py-3 bg-white text-primary font-semibold rounded-md hover:bg-gray-100 transition-colors"
          >
            Explore Properties
          </Link>
          <Link 
            href="/contact"
            className="px-8 py-3 bg-transparent border-2 border-white text-white font-semibold rounded-md hover:bg-primary-foreground/10 transition-colors"
          >
            Contact Me
          </Link>
        </div>
      </section>
    </main>
  );
} 