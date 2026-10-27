/**
 * Microphone capture for the CLI demo path. Wraps ffmpeg for device access
 * so behavior matches the verified QVAC examples. The web UI captures audio
 * in the browser with getUserMedia instead. On macOS the device spec is
 * `<video>:<audio>`, and `:0` selects the default input.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { platform } from 'node:os';
import { YakoError } from '../pipeline/errors.js';

export interface MicOptions {
  readonly sampleRate: number;
  readonly format: 'f32le' | 's16le';
}

function audioInputArgs(): string[] {
  const override = process.env['MIC_DEVICE'];
  switch (platform()) {
    case 'darwin':
      return ['-f', 'avfoundation', '-i', override ?? ':0'];
    case 'linux':
      return ['-f', 'pulse', '-i', override ?? 'default'];
    default:
      throw new YakoError(
        'MIC_UNAVAILABLE',
        `Microphone capture is not set up for platform ${platform()} yet.`,
        undefined,
        false,
      );
  }
}

/**
 * Starts capturing the default microphone as a PCM stream. Returns the ffmpeg
 * child process. Read PCM chunks from `proc.stdout`. Always call `stopMic`
 * to release the device.
 */
export function startMic(options: MicOptions): ChildProcess {
  const formatArgs =
    options.format === 'f32le'
      ? ['-sample_fmt', 'flt', '-f', 'f32le']
      : ['-sample_fmt', 's16', '-f', 's16le'];
  let proc: ChildProcess;
  try {
    proc = spawn(
      'ffmpeg',
      [...audioInputArgs(), '-ar', String(options.sampleRate), '-ac', '1', ...formatArgs, 'pipe:1'],
      { stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch (error) {
    throw new YakoError('MIC_UNAVAILABLE', 'Could not start microphone capture.', error);
  }
  if (!proc.stdout) {
    throw new YakoError('MIC_UNAVAILABLE', 'Microphone stream did not open.');
  }
  return proc;
}

export function stopMic(proc: ChildProcess | null | undefined): void {
  if (proc && !proc.killed) {
    proc.kill('SIGTERM');
  }
}
