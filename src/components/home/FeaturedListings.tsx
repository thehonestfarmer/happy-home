import Link from 'next/link';
import Image from 'next/image';

// This would typically come from an API call
const FEATURED_PROPERTIES = [
  {
    id: '1',
    title: 'Modern Kyoto Townhouse',
    price: '¥35,000,000',
    location: 'Kyoto, Japan',
    bedrooms: 3,
    bathrooms: 2,
    size: '120m²',
    imageUrl: '/images/property-1.jpg'
  },
  {
    id: '2',
    title: 'Mountain View Cabin',
    price: '¥28,500,000',
    location: 'Nagano, Japan',
    bedrooms: 2,
    bathrooms: 1,
    size: '85m²',
    imageUrl: '/images/property-2.jpg'
  },
  {
    id: '3',
    title: 'Renovated Traditional Home',
    price: '¥42,000,000',
    location: 'Nara, Japan',
    bedrooms: 4,
    bathrooms: 2,
    size: '150m²',
    imageUrl: '/images/property-3.jpg'
  }
];

export const FeaturedListings = () => {
  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Featured Properties</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover our handpicked selection of distinctive Japanese properties, from traditional homes to modern living spaces.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {FEATURED_PROPERTIES.map((property) => (
          <div key={property.id} className="bg-card rounded-lg overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <div className="relative h-60">
              <Image
                src={property.imageUrl}
                alt={property.title}
                fill
                className="object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold mb-2">{property.title}</h3>
              <p className="text-primary text-lg font-medium mb-2">{property.price}</p>
              <p className="text-muted-foreground mb-4">{property.location}</p>
              <div className="flex justify-between text-sm text-muted-foreground mb-4">
                <span>{property.bedrooms} Bedrooms</span>
                <span>{property.bathrooms} Bathrooms</span>
                <span>{property.size}</span>
              </div>
              <Link 
                href={`/listings/${property.id}`}
                className="block w-full text-center py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
              >
                View Details
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      <div className="text-center mt-12">
        <Link 
          href="/listings"
          className="inline-flex items-center px-6 py-3 border border-primary text-primary hover:bg-muted rounded-md font-medium transition-colors"
        >
          View All Properties
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>
    </section>
  );
}; 