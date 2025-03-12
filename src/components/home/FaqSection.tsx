"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';

// FAQ data
const faqs = [
  {
    id: 'ownership',
    question: 'Can foreigners own property in Japan?',
    answer: 'Yes, Japan has no legal restrictions on foreign ownership of real estate. Foreigners have the same property rights as Japanese citizens and can own both land and buildings outright.'
  },
  {
    id: 'language',
    question: 'Do I need to speak Japanese to buy property?',
    answer: 'No, you don\'t need to speak Japanese. As your representative, I handle all communications, translations, and negotiations on your behalf, making the process smooth and accessible.'
  },
  {
    id: 'costs',
    question: 'What are the typical purchase costs?',
    answer: 'Beyond the property price, budget approximately 5-7% of the purchase price for taxes and fees, including registration tax, stamp duty, agent fees, and legal costs. I provide detailed cost breakdowns before any commitment.'
  },
  {
    id: 'financing',
    question: 'Can I get financing as a foreigner?',
    answer: 'Yes, though options may be limited. Some Japanese banks offer mortgages to foreign residents with proper visa status. For non-residents, international banks with Japanese branches sometimes offer financing solutions. I can help connect you with appropriate lenders.'
  },
  {
    id: 'management',
    question: 'What about property management if I\'m not in Japan?',
    answer: 'I offer comprehensive property management services for absent owners, including tenant finding, rent collection, maintenance coordination, and regular property inspections to ensure your investment remains in excellent condition.'
  },
  {
    id: 'timing',
    question: 'How long does the purchase process take?',
    answer: 'From property selection to closing, the process typically takes 1-3 months, depending on property type and financing arrangements. The actual closing process is efficient by international standards, often completed within 2-4 weeks.'
  }
];

export const FaqSection = () => {
  // State to track which FAQ items are expanded
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // Toggle expanded state for an item
  const toggleItem = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <section className="py-16 px-4 max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Get answers to common questions about purchasing and owning property in Japan.
        </p>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-12 items-start">
        {/* FAQ Illustration - Replace with your Undraw SVG */}
        <div className="w-full lg:w-2/5 lg:sticky lg:top-24">
          <div className="bg-muted/30 rounded-lg p-6 relative h-64 md:h-72">
            <Image 
              src="/images/faqs.svg" 
              alt="Frequently Asked Questions" 
              fill 
              className="object-contain p-4"
            />
          </div>
          
          <div className="bg-card shadow-sm rounded-lg p-4 mt-4">
            <h3 className="text-lg font-medium mb-2">Have a specific question?</h3>
            <p className="text-sm text-muted-foreground mb-3">
              If you don't see your question answered here, feel free to reach out directly.
            </p>
            <Link 
              href="/contact"
              className="text-primary text-sm font-medium hover:underline inline-flex items-center"
            >
              Contact me
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
        
        {/* FAQ Accordion */}
        <div className="w-full lg:w-3/5 space-y-4">
          {faqs.map((faq) => (
            <div 
              key={faq.id} 
              className="bg-card rounded-lg shadow-sm overflow-hidden"
            >
              <button
                onClick={() => toggleItem(faq.id)}
                className="w-full text-left p-6 flex justify-between items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-expanded={expandedItems[faq.id]}
                aria-controls={`faq-answer-${faq.id}`}
              >
                <h3 className="text-lg font-semibold pr-8">{faq.question}</h3>
                <span className="text-primary flex-shrink-0">
                  {expandedItems[faq.id] ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </span>
              </button>
              
              <div 
                id={`faq-answer-${faq.id}`}
                className={`px-6 overflow-hidden transition-all duration-300 ease-in-out ${
                  expandedItems[faq.id] 
                    ? 'max-h-96 pb-6 opacity-100' 
                    : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-muted-foreground">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}; 