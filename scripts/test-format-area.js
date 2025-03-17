// Using require instead of import for simplicity
const { formatArea } = require('../src/lib/listing-utils');

// Test the formatArea function with various inputs
console.log('Testing formatArea function:');
console.log('-----------------------------');
console.log(''); // Add empty line for spacing
console.log(''); // Add another empty line for more spacing

// Test with m² symbol
console.log('Input: "127.42㎡", USD =>', formatArea('127.42㎡', 'USD'));
console.log('Input: "127.42㎡", JPY =>', formatArea('127.42㎡', 'JPY'));

// Test with plain number
console.log('Input: "127.42", USD =>', formatArea('127.42', 'USD'));
console.log('Input: "127.42", JPY =>', formatArea('127.42', 'JPY'));

// Test with numeric value
console.log('Input: 127.42, USD =>', formatArea(127.42, 'USD'));
console.log('Input: 127.42, JPY =>', formatArea(127.42, 'JPY'));

// Test with commas
console.log('Input: "1,127.42㎡", USD =>', formatArea('1,127.42㎡', 'USD'));

// Test with "sq ft" already
console.log('Input: "1,200 sq ft", USD =>', formatArea('1,200 sq ft', 'USD')); 