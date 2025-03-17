import '@testing-library/jest-dom';

// Polyfill for TextEncoder and TextDecoder that JSDOM needs
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock the translate module to avoid ESM import issues
jest.mock('translate', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation((text) => Promise.resolve(text)),
  };
});

// Mock other ESM-only dependencies if needed 