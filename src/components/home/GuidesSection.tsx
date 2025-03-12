import Link from 'next/link';
import Image from 'next/image';

const guides = [
  {
    id: 'purchase',
    title: 'How to Purchase a Home in Japan',
    description: 'A comprehensive guide to navigating the Japanese real estate purchase process for international buyers.',
    imageUrl: '/images/buy-house.svg',
    link: '/guides/purchase'
  },
  {
    id: 'countryside',
    title: 'Living in the Japanese Countryside',
    description: 'Discover the unique charms and lifestyle benefits of rural Japan, from natural beauty to community connections.',
    imageUrl: '/images/countryside.svg',
    link: '/guides/countryside'
  },
  {
    id: 'renovation',
    title: 'Renovating Traditional Japanese Homes',
    description: 'Learn about preserving heritage while modernizing traditional Japanese properties for contemporary living.',
    imageUrl: '/images/renovating-home.svg',
    link: '/guides/renovation'
  }
];

export const GuidesSection = () => {
  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Essential Guides</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Expert information to help you navigate the Japanese property market and find your ideal home.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {guides.map((guide) => (
          <Link key={guide.id} href={guide.link} className="group">
            <div className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow h-full flex flex-col">
              <div className="relative h-52 p-4 bg-muted/30">
                <Image
                  src={guide.imageUrl}
                  alt={guide.title}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">{guide.title}</h3>
                <p className="text-muted-foreground mb-4 flex-grow">{guide.description}</p>
                <div className="inline-flex items-center text-primary font-medium">
                  Read Guide
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1 group-hover:translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}; 