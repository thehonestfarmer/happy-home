import Queue from 'bull';

// Only create the queue on the server side
const createQueue = () => {
  if (typeof window === 'undefined') {
    console.log("Creating queue...");
    
    try {
      // Always use local Redis configuration
      const queue = new Queue('listing-scraping', {
        redis: {
          port: 6379,
          host: 'localhost',
        }
      });

      queue.on('error', (error) => {
        console.error('Queue error:', error);
      });

      console.log("Queue initialized with local Redis");
      return queue;
    } catch (error) {
      console.error('Failed to create queue:', error);
      return null;
    }
  }
  console.log("Not creating queue - running in browser");
  return null;
};

export const scrapingQueue = createQueue(); 