import Redis from 'ioredis';

let redisConnection: Redis | null = null;

/**
 * Initialize Redis connection for BullMQ
 * This ensures we reuse the same connection across the application
 * 
 * NOTE: Redis functionality is disabled in production
 */
export const initRedisConnection = async (): Promise<any> => {
  // Skip Redis connection in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Redis connection disabled in production');
    return null;
  }

  if (redisConnection) {
    return redisConnection;
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  
  try {
    redisConnection = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: false,
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          // Force reconnect on READONLY error
          return true;
        }
        return false;
      },
    });

    // Set up error handling
    redisConnection.on('error', (err) => {
      console.error('Redis connection error:', err);
    });

    // Set up reconnection event
    redisConnection.on('reconnecting', () => {
      console.log('Redis reconnecting...');
    });

    // Log successful connection
    redisConnection.on('connect', () => {
      console.log('Connected to Redis');
    });

    await redisConnection.ping();
    console.log('Redis connection initialized');
    
    return redisConnection;
  } catch (error) {
    console.error('Failed to connect to Redis:', error);
    throw new Error('Failed to connect to Redis');
  }
};

/**
 * Get the Redis connection instance
 * Initialize a new connection if one doesn't exist
 * 
 * NOTE: Redis functionality is disabled in production
 */
export const getRedisConnection = async (): Promise<any> => {
  // Skip Redis connection in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Redis connection disabled in production');
    return null;
  }

  if (!redisConnection) {
    return initRedisConnection();
  }
  return redisConnection;
};

/**
 * Close the Redis connection
 * Should be called during graceful shutdown
 */
export const closeRedisConnection = async (): Promise<void> => {
  // Skip in production
  if (process.env.NODE_ENV === 'production') {
    console.log('Redis connection close skipped in production');
    return;
  }

  if (redisConnection) {
    await redisConnection.quit();
    redisConnection = null;
    console.log('Redis connection closed');
  }
}; 