/**
 * Error Handling Utilities
 * 
 * Specialized error handling for different types of errors in the scraper system.
 */

import { logger } from './logger';

/**
 * Different types of errors that can occur during scraping
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  PARSER = 'PARSER',
  DATABASE = 'DATABASE',
  VALIDATION = 'VALIDATION',
  LISTING_REMOVED = 'LISTING_REMOVED',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Structured error class for scraper errors
 */
export class ScraperError extends Error {
  type: ErrorType;
  retriable: boolean;
  context: Record<string, any>;

  constructor(
    message: string, 
    type: ErrorType = ErrorType.UNKNOWN,
    retriable: boolean = false,
    context: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'ScraperError';
    this.type = type;
    this.retriable = retriable;
    this.context = context;
  }
}

/**
 * Create a network error (typically retriable)
 */
export const createNetworkError = (message: string, context: Record<string, any> = {}): ScraperError => {
  return new ScraperError(
    message,
    ErrorType.NETWORK,
    true, // Network errors are typically retriable
    context
  );
};

/**
 * Create a parser error (typically not retriable)
 */
export const createParserError = (message: string, context: Record<string, any> = {}): ScraperError => {
  return new ScraperError(
    message,
    ErrorType.PARSER,
    false, // Parser errors are typically not retriable
    context
  );
};

/**
 * Create a database error
 */
export const createDatabaseError = (message: string, context: Record<string, any> = {}): ScraperError => {
  return new ScraperError(
    message,
    ErrorType.DATABASE,
    true, // Database errors might be retriable
    context
  );
};

/**
 * Create a validation error
 */
export const createValidationError = (message: string, context: Record<string, any> = {}): ScraperError => {
  return new ScraperError(
    message,
    ErrorType.VALIDATION,
    false, // Validation errors are typically not retriable
    context
  );
};

/**
 * Create a listing removed error
 */
export const createListingRemovedError = (message: string, context: Record<string, any> = {}): ScraperError => {
  return new ScraperError(
    message,
    ErrorType.LISTING_REMOVED,
    false, // Listing removed is not an error but a state
    context
  );
};

/**
 * Detect if a listing has been removed based on content
 */
export const isListingRemoved = (html: string, statusCode: number): boolean => {
  if (statusCode === 404) return true;
  
  // Check for specific text patterns indicating removal
  if (html.includes('listing is no longer available') || 
      html.includes('物件は売却済みです') ||
      html.match(/property (has been|was) (sold|removed)/i)) {
    return true;
  }
  
  // Check for absence of critical elements that should be on all valid listings
  // This is a basic check - in a real implementation, we would use cheerio to check DOM elements
  if (!html.includes('detail_price') && !html.includes('property-details')) {
    return true;
  }
  
  return false;
};

/**
 * Generic error handler with logging
 */
export const handleError = (error: unknown, context: string): ScraperError => {
  if (error instanceof ScraperError) {
    logger.error(`${context}: ${error.message}`, { type: error.type, context: error.context });
    return error;
  } else if (error instanceof Error) {
    // Attempt to determine error type
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('network') || 
        errorMessage.includes('connection')) {
      const scraperError = createNetworkError(error.message);
      logger.error(`${context} (Network): ${error.message}`, error);
      return scraperError;
    } else {
      const scraperError = new ScraperError(error.message);
      logger.error(`${context} (Unknown): ${error.message}`, error);
      return scraperError;
    }
  } else {
    const errorMessage = `${context}: Unknown error occurred`;
    logger.error(errorMessage, error);
    return new ScraperError(errorMessage);
  }
}; 