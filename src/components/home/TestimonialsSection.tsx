import Image from 'next/image';

const testimonials = [
  {
    id: '1',
    quote: "Happy Home Japan made purchasing our vacation home in Hokkaido effortless. Their knowledge of the local market and support throughout the process was invaluable.",
    name: "Sarah Thompson",
    location: "Vancouver, Canada",
    imageUrl: "/images/testimonial-1.jpg"
  },
  {
    id: '2',
    quote: "As someone who doesn't speak Japanese, I was nervous about buying property in rural Japan. The team guided me through every step and found me the perfect traditional home.",
    name: "Michael Chen",
    location: "Singapore",
    imageUrl: "/images/testimonial-2.jpg"
  },
  {
    id: '3',
    quote: "The countryside property they helped me find has transformed my life. Their insights into local communities helped me integrate and truly experience Japanese rural living.",
    name: "Emma Wilson",
    location: "London, UK",
    imageUrl: "/images/testimonial-3.jpg"
  }
];

export const TestimonialsSection = () => {
  return (
    <section className="py-16 bg-muted">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">What Our Clients Say</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hear from international buyers who found their dream Japanese properties through our platform.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-card p-6 rounded-lg shadow-md">
              <div className="flex items-center mb-4">
                <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4">
                  <Image
                    src={testimonial.imageUrl}
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-semibold">{testimonial.name}</h4>
                  <p className="text-muted-foreground text-sm">{testimonial.location}</p>
                </div>
              </div>
              <svg className="h-6 w-6 text-accent-yellow mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
              </svg>
              <p className="text-foreground italic mb-4">{testimonial.quote}</p>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg key={star} className="h-5 w-5 text-accent-yellow" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.799-2.034c-.784-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 