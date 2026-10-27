/**
 * Local audio playback. Streams a WAV buffer to ffplay over stdin so we never
 * write temp files and stay cross-platform. Used by the CLI demo path. The
 * web UI plays audio in the browser instead.
 */
import { spawn } from 'node:child_process';
import { YakoError } from '../pipeline/errors.js';

/**
 * Plays a complete WAV buffer and resolves when playback finishes. Rejects
 * with PLAYBACK_FAILED if ffplay is missing or exits non-zero.
 */
export function playWav(wavBuffer: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const player = spawn(
      'ffplay',
      ['-hide_banner', '-loglevel', 'error', '-autoexit', '-nodisp', '-i', 'pipe:0'],
      { stdio: ['pipe', 'ignore', 'ignore'] },
    );
    player.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'ENOENT') {
        reject(
          new YakoError(
            'PLAYBACK_FAILED',
            'ffplay not found on PATH. Install ffmpeg to hear audio playback.',
            error,
          ),
        );
        return;
      }
      reject(new YakoError('PLAYBACK_FAILED', error.message, error));
    });
    player.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new YakoError('PLAYBACK_FAILED', `ffplay exited with code ${code}`));
      }
    });
    player.stdin.on('error', () => {
      // Player closed early, the close handler settles the promise.
    });
    player.stdin.write(wavBuffer);
    player.stdin.end();
  });
}
