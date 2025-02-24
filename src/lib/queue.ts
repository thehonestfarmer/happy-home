import Queue from 'bull';
import IORedis from 'ioredis';

// Only create the queue on the server side
const createQueue = () => {
  if (typeof window === 'undefined') {
    console.log("Creating queue...");
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Use local Redis in development
    if (isDevelopment) {
      console.log("Using local Redis for development");
      const queue = new Queue('listing-scraping', {
        redis: {
          port: 6379,
          host: 'localhost',
        }
      });

      queue.on('error', (error) => {
        console.error('Queue error:', error);
      });

      return queue;
    }

    // Production Upstash configuration
    const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
    const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!redisUrl || !redisToken) {
      console.error('Missing Upstash configuration');
      return null;
    }

    // Clean the URL by removing https:// if present
    const cleanUrl = redisUrl.replace(/^https?:\/\//, '');
    console.log("Using Redis host:", cleanUrl);

    try {
      // Configure Redis options according to Bull requirements
      const redisOptions = {
        port: 6379,
        host: cleanUrl,
        password: redisToken,
        tls: {
          rejectUnauthorized: false
        },
        maxRetriesPerRequest: null,
        enableReadyCheck: false
      };

      // Create Bull queue with direct Redis options
      const queue = new Queue('listing-scraping', {
        redis: redisOptions
      });

      // Add event listeners for connection status
      queue.on('error', (error) => {
        console.error('Queue error:', error);
      });

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