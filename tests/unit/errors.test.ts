import { describe, expect, it } from 'vitest';
import { YakoError, describeError, toYakoError } from '../../src/pipeline/errors.js';

describe('YakoError', () => {
  it('carries code, message, and recoverable flag', () => {
    const error = new YakoError('TRANSLATE_FAILED', 'boom', undefined, false);
    expect(error.code).toBe('TRANSLATE_FAILED');
    expect(error.message).toBe('boom');
    expect(error.recoverable).toBe(false);
    expect(error).toBeInstanceOf(YakoError);
    expect(error).toBeInstanceOf(Error);
  });

  it('defaults recoverable to true', () => {
    expect(new YakoError('UNKNOWN', 'x').recoverable).toBe(true);
  });
});

describe('toYakoError', () => {
  it('passes through an existing YakoError unchanged', () => {
    const original = new YakoError('TTS_FAILED', 'keep me');
    expect(toYakoError(original)).toBe(original);
  });

  it('maps out-of-memory messages to OUT_OF_MEMORY', () => {
    expect(toYakoError(new Error('out of memory')).code).toBe('OUT_OF_MEMORY');
    expect(toYakoError(new Error('ENOMEM: allocation failed')).code).toBe('OUT_OF_MEMORY');
  });

  it('maps microphone messages to MIC_UNAVAILABLE', () => {
    expect(toYakoError(new Error('no audio input device')).code).toBe('MIC_UNAVAILABLE');
    expect(toYakoError(new Error('AVFoundation error')).code).toBe('MIC_UNAVAILABLE');
  });

  it('maps network messages to NETWORK_REQUIRED', () => {
    expect(toYakoError(new Error('network unreachable')).code).toBe('NETWORK_REQUIRED');
    expect(toYakoError(new Error('ENOTFOUND host')).code).toBe('NETWORK_REQUIRED');
  });

  it('maps cancellation to CANCELLED', () => {
    expect(toYakoError(new Error('the operation was cancelled')).code).toBe('CANCELLED');
  });

  it('falls back to the provided code for unknown errors', () => {
    expect(toYakoError(new Error('weird'), 'TRANSLATE_FAILED').code).toBe('TRANSLATE_FAILED');
    expect(toYakoError('a string', 'TRANSCRIBE_FAILED').code).toBe('TRANSCRIBE_FAILED');
  });

  it('wraps non-Error values into a message', () => {
    const error = toYakoError(42);
    expect(error).toBeInstanceOf(YakoError);
    expect(error.message).toBe('42');
  });
});

describe('describeError', () => {
  it('returns a title and hint for every code', () => {
    const codes = [
      'MODEL_LOAD_FAILED',
      'MODEL_DOWNLOAD_FAILED',
      'OUT_OF_MEMORY',
      'TRANSCRIBE_FAILED',
      'TRANSCRIBE_EMPTY',
      'TRANSLATE_FAILED',
      'TTS_FAILED',
      'MIC_UNAVAILABLE',
      'MIC_PERMISSION_DENIED',
      'PLAYBACK_FAILED',
      'NETWORK_REQUIRED',
      'CANCELLED',
      'INVALID_STATE',
      'UNKNOWN',
    ] as const;
    for (const code of codes) {
      const { title, hint } = describeError(code);
      expect(title.length).toBeGreaterThan(0);
      expect(hint.length).toBeGreaterThan(0);
    }
  });
});
