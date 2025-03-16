/**
 * Custom logger for the scraper with different log levels
 */

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARNING = 2,
  ERROR = 3,
  SUCCESS = 4,
}

/**
 * Get color code for console output based on log level
 */
const getColorCode = (level: LogLevel): string => {
  switch (level) {
    case LogLevel.DEBUG:
      return '\x1b[36m'; // Cyan
    case LogLevel.INFO:
      return '\x1b[37m'; // White
    case LogLevel.WARNING:
      return '\x1b[33m'; // Yellow
    case LogLevel.ERROR:
      return '\x1b[31m'; // Red
    case LogLevel.SUCCESS:
      return '\x1b[32m'; // Green
    default:
      return '\x1b[37m'; // White
  }
};

/**
 * Get log level prefix for messages
 */
const getLevelPrefix = (level: LogLevel): string => {
  switch (level) {
    case LogLevel.DEBUG:
      return 'DEBUG';
    case LogLevel.INFO:
      return 'INFO';
    case LogLevel.WARNING:
      return 'WARN';
    case LogLevel.ERROR:
      return 'ERROR';
    case LogLevel.SUCCESS:
      return 'SUCCESS';
    default:
      return 'INFO';
  }
};

/**
 * Log a message with the given level
 */
const log = (level: LogLevel, message: string, data?: any): void => {
  const timestamp = new Date().toISOString();
  const colorCode = getColorCode(level);
  const resetCode = '\x1b[0m';
  const prefix = getLevelPrefix(level);
  
  // Format the message
  const formattedMessage = `${colorCode}[${timestamp}] [${prefix}] ${message}${resetCode}`;
  
  // Log to console
  if (level === LogLevel.ERROR) {
    console.error(formattedMessage);
    if (data) {
      console.error(data);
    }
  } else {
    console.log(formattedMessage);
    if (data) {
      console.log(data);
    }
  }
  
  // TODO: Add additional logging to external services if needed
};

/**
 * Logger object with methods for each log level
 */
export const logger = {
  debug: (message: string, data?: any) => log(LogLevel.DEBUG, message, data),
  info: (message: string, data?: any) => log(LogLevel.INFO, message, data),
  warn: (message: string, data?: any) => log(LogLevel.WARNING, message, data),
  warning: (message: string, data?: any) => log(LogLevel.WARNING, message, data),
  error: (message: string, error?: any) => log(LogLevel.ERROR, message, error),
  success: (message: string, data?: any) => log(LogLevel.SUCCESS, message, data),
};

/**
 * Create a context-aware logger for a specific component
 * 
 * @param context - The context name (e.g., 'Worker', 'Extractor')
 */
export const createContextLogger = (context: string) => ({
  debug: (message: string, data?: any) => logger.debug(`[${context}] ${message}`, data),
  info: (message: string, data?: any) => logger.info(`[${context}] ${message}`, data),
  warning: (message: string, data?: any) => logger.warning(`[${context}] ${message}`, data),
  error: (message: string, error?: any) => logger.error(`[${context}] ${message}`, error),
  success: (message: string, data?: any) => logger.success(`[${context}] ${message}`, data)
}); 