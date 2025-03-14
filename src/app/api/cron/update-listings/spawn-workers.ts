import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { promises as fsPromises } from 'fs';
import { fileURLToPath } from 'url';

// Get the directory name using ES modules approach
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const DEFAULT_WORKER_COUNT = 3;
const MAX_WORKER_COUNT = 10;
const WORKER_SCRIPT = path.join(__dirname, 'start-worker.ts');

// Parse command line arguments
const workerCount = (() => {
  const countArg = process.argv.find(arg => arg.startsWith('--workers='));
  if (countArg) {
    const count = parseInt(countArg.split('=')[1], 10);
    if (!isNaN(count) && count > 0) {
      return Math.min(count, MAX_WORKER_COUNT); // Limit to MAX_WORKER_COUNT
    }
  }
  return DEFAULT_WORKER_COUNT;
})();

// Map to store worker processes
const workers: Map<number, ChildProcess> = new Map();

// Function to spawn a worker process
function spawnWorker(id: number): ChildProcess {
  console.log(`[Supervisor] Starting worker #${id}...`);
  
  // Use tsx to run TypeScript files directly
  const worker = spawn('npx', ['tsx', WORKER_SCRIPT], {
    stdio: 'pipe',
    env: { 
      ...process.env,
      WORKER_ID: id.toString() 
    }
  });
  
  // Handle worker output
  worker.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line: string) => console.log(`[Worker #${id}] ${line}`));
  });
  
  worker.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach((line: string) => console.error(`[Worker #${id} ERROR] ${line}`));
  });
  
  // Handle worker exit
  worker.on('exit', (code, signal) => {
    console.log(`[Supervisor] Worker #${id} exited with code ${code} and signal ${signal}`);
    workers.delete(id);
    
    // Respawn worker after a short delay if exit was unexpected
    if (code !== 0 && !shuttingDown) {
      console.log(`[Supervisor] Worker #${id} exited unexpectedly, restarting in 5 seconds...`);
      setTimeout(() => {
        const newWorker = spawnWorker(id);
        workers.set(id, newWorker);
      }, 5000);
    }
  });
  
  return worker;
}

// Flag to indicate if we're shutting down
let shuttingDown = false;

// Function to gracefully shut down all workers
async function shutdownWorkers() {
  if (shuttingDown) return;
  shuttingDown = true;
  
  console.log('[Supervisor] Shutting down all workers...');
  
  // Send SIGTERM to each worker and wait for them to exit
  const workerShutdowns = Array.from(workers.entries()).map(([id, worker]) => {
    return new Promise<void>((resolve) => {
      // Set a timeout to force kill if worker doesn't exit gracefully
      const forceKillTimeout = setTimeout(() => {
        console.log(`[Supervisor] Worker #${id} did not exit gracefully, force killing...`);
        if (!worker.killed) {
          worker.kill('SIGKILL');
        }
        resolve();
      }, 5000);
      
      // Listen for exit event
      worker.on('exit', () => {
        clearTimeout(forceKillTimeout);
        resolve();
      });
      
      // Send SIGTERM signal
      worker.kill('SIGTERM');
    });
  });
  
  // Wait for all workers to shut down
  await Promise.all(workerShutdowns);
  console.log('[Supervisor] All workers have been shut down.');
  process.exit(0);
}

// Set up process signal handlers for graceful shutdown
process.on('SIGINT', shutdownWorkers);
process.on('SIGTERM', shutdownWorkers);
process.on('unhandledRejection', (reason, promise) => {
  console.error('[Supervisor] Unhandled Promise Rejection:', reason);
});

// Start the workers
async function startWorkers() {
  console.log(`[Supervisor] Starting ${workerCount} worker${workerCount !== 1 ? 's' : ''}...`);
  
  try {
    // Ensure necessary directories exist
    const dataDir = path.join(process.cwd(), '.data');
    await fsPromises.mkdir(dataDir, { recursive: true }).catch(() => {});
    
    // Spawn the requested number of workers
    for (let i = 1; i <= workerCount; i++) {
      const worker = spawnWorker(i);
      workers.set(i, worker);
    }
    
    console.log(`[Supervisor] All ${workerCount} worker${workerCount !== 1 ? 's' : ''} started successfully.`);
    console.log('[Supervisor] Press Ctrl+C to stop all workers and exit.');
  } catch (error) {
    console.error('[Supervisor] Error starting workers:', error);
    shutdownWorkers();
  }
}

// Main execution
startWorkers(); 