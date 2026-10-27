/**
 * Yako entry point. Boots the local server and prints the URL to open. The
 * web UI runs in the browser, captures the microphone with getUserMedia, and
 * calls the local API. Everything runs on device. The only network access is
 * the one-time model download during setup.
 *
 * Usage
 *   npm run setup    download the models once (online)
 *   npm start        start the app (fully offline after setup)
 */
import { join } from 'node:path';
import { Orchestrator } from './pipeline/orchestrator.js';
import { startServer } from './server/server.js';
import { Logger } from './observability/logger.js';

const log = Logger.forContext('main');

const publicDir = join(__dirname, '..', 'public');

async function run(): Promise<void> {
  const port = Number(process.env['PORT'] ?? 4173);
  const started = Date.now();
  const orchestrator = new Orchestrator((progress) => {
    // First-run model load streams progress to the console.
    const pct = progress.percentage.toFixed(0);
    process.stderr.write(`\rLoading ${progress.label} ${pct}%   `);
    if (progress.percentage >= 100) {
      process.stderr.write('\n');
    }
  });
  const server = await startServer(orchestrator, publicDir, port);
  const bootMs = Date.now() - started;
  const url = `http://localhost:${server.port}`;
  process.stdout.write(`\nYako is ready.\n`);
  process.stdout.write(`Open ${url} in your browser.\n`);
  process.stdout.write(`Cold start ${bootMs} ms. Fully offline after setup.\n\n`);

  const shutdown = async (): Promise<void> => {
    log.info('shutting down');
    await server.close();
    await orchestrator.shutdown();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());
}

run().catch((error) => {
  log.error('fatal', { error: String(error) });
  process.stderr.write(`\nYako failed to start: ${String(error)}\n`);
  process.exit(1);
});
