import './worker';
import { debugFailedJobsFile } from './failed-jobs-manager';

// Run the debug function to ensure the failed jobs file exists and is accessible
debugFailedJobsFile()
  .then(() => console.log('Failed jobs file check completed'))
  .catch(err => console.error('Error checking failed jobs file:', err));

console.log('Worker script loaded. Waiting for jobs...');
console.log('Press Ctrl+C to stop the worker');

// Keep the process running
process.stdin.resume();

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down worker...');
  process.exit(0);
}); 