/**
 * First-run setup. Downloads every model Yako needs, one time, while the
 * machine is online. After this completes the app runs fully offline. Shows
 * a determinate progress bar per model and a total at the end, and verifies
 * each model loads before declaring success.
 */
import { Orchestrator } from '../pipeline/orchestrator.js';
import { REQUIRED_MODELS, TOTAL_DOWNLOAD_BYTES } from '../config/models.js';
import type { LoadSlot } from '../models/manager.js';
import { Logger } from '../observability/logger.js';

const log = Logger.forContext('setup');

function formatMb(bytes: number): string {
  return (bytes / 1e6).toFixed(1);
}

async function run(): Promise<void> {
  process.stdout.write('Yako setup. One-time model download.\n');
  process.stdout.write(
    `Total ${formatMb(TOTAL_DOWNLOAD_BYTES)} MB across ${REQUIRED_MODELS.length} models.\n\n`,
  );

  const started = Date.now();
  let lastSlot = '';
  const orchestrator = new Orchestrator((progress) => {
    if (progress.slot !== lastSlot) {
      process.stderr.write('\n');
      lastSlot = progress.slot;
    }
    const pct = Math.min(100, progress.percentage).toFixed(0).padStart(3);
    const mb = `${formatMb(progress.downloadedBytes)}/${formatMb(progress.totalBytes)}`;
    process.stderr.write(`\r[${pct}%] ${progress.label}  ${mb} MB   `);
    if (progress.percentage >= 100) {
      process.stderr.write('\n');
    }
  });

  try {
    // Loading the translation model and transcription model pulls the VAD and
    // TTS companions through their load configs, so we drive by slot.
    const order: LoadSlot[] = ['translation', 'transcription', 'tts:en', 'tts:sw'];
    for (const slot of order) {
      await orchestrator.models.ensureLoaded(slot);
    }
    const secs = ((Date.now() - started) / 1000).toFixed(1);
    process.stdout.write(`\nAll models ready in ${secs} s.\n`);
    process.stdout.write('Yako now runs fully offline. Start it with npm start.\n');
  } catch (error) {
    process.stderr.write(`\nSetup failed: ${String(error)}\n`);
    process.stderr.write('Check your connection and run npm run setup again.\n');
    log.error('setup failed', { error: String(error) });
    await orchestrator.shutdown();
    process.exit(1);
  }
  await orchestrator.shutdown();
}

void run();
