import { handleRequest } from './routes';
import { startWorker } from './worker';
import { getDb } from './db';

const PORT = Number(process.env.JOBS_PORT ?? 4100);

// Initialize DB
getDb();

// Start the worker
startWorker();

// Start HTTP server
const server = Bun.serve({
  port: PORT,
  fetch: handleRequest,
});

console.log(`[jobs] Composition Jobs API listening on http://localhost:${PORT}`);
console.log(`[jobs] Endpoints:`);
console.log(`  POST /compositions/:id/jobs`);
console.log(`  GET  /compositions/:id/jobs`);
console.log(`  GET  /compositions/:id/jobs/:jobId`);
console.log(`  GET  /jobs`);
console.log(`  GET  /jobs/:jobId`);
console.log(`  GET  /health`);
