const fs = require('fs');
const path = require('path');

// Path to the file we need to patch
const tablePath = path.join(
  __dirname,
  '../node_modules/react-virtualized/dist/es/Table/Table.js'
);

// Read the file content
let fileContent = fs.readFileSync(tablePath, 'utf8');

// Replace the problematic import
fileContent = fileContent.replace(
  "import { findDOMNode } from 'react-dom';",
  "import * as ReactDOM from 'react-dom'; const { findDOMNode } = ReactDOM;"
);

// Write the file back
fs.writeFileSync(tablePath, fileContent);

console.log('React-virtualized Table.js has been patched successfully.');

// Also patch WindowScroller.js which may have the same issue
const windowScrollerPath = path.join(
  __dirname,
  '../node_modules/react-virtualized/dist/es/WindowScroller/WindowScroller.js'
);

try {
  let windowScrollerContent = fs.readFileSync(windowScrollerPath, 'utf8');
  
  // Replace the problematic import
  windowScrollerContent = windowScrollerContent.replace(
    "import { findDOMNode } from 'react-dom';",
    "import * as ReactDOM from 'react-dom'; const { findDOMNode } = ReactDOM;"
  );
  
  // Write the file back
  fs.writeFileSync(windowScrollerPath, windowScrollerContent);
  console.log('React-virtualized WindowScroller.js has been patched successfully.');
} catch (error) {
  console.log('WindowScroller.js patch was skipped:', error.message);
} 