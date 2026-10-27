import { describe, expect, it } from 'vitest';
import { isMeaningfulTranscript } from '../../src/audio/transcript.js';

describe('isMeaningfulTranscript', () => {
  it('rejects empty and whitespace-only text', () => {
    expect(isMeaningfulTranscript('')).toBe(false);
    expect(isMeaningfulTranscript('   ')).toBe(false);
    expect(isMeaningfulTranscript('\n\t ')).toBe(false);
  });

  it('rejects bracketed hallucination artifacts', () => {
    expect(isMeaningfulTranscript('[Music]')).toBe(false);
    expect(isMeaningfulTranscript('(silence)')).toBe(false);
    expect(isMeaningfulTranscript(' [noise] ')).toBe(false);
  });

  it('rejects lone punctuation and symbols', () => {
    expect(isMeaningfulTranscript('.')).toBe(false);
    expect(isMeaningfulTranscript('!')).toBe(false);
    expect(isMeaningfulTranscript('...')).toBe(false);
  });

  it('rejects a single stripped character', () => {
    expect(isMeaningfulTranscript('a')).toBe(false);
  });

  it('accepts real words and phrases', () => {
    expect(isMeaningfulTranscript('Hello')).toBe(true);
    expect(isMeaningfulTranscript('Habari yako')).toBe(true);
    expect(isMeaningfulTranscript('Good morning, how are you?')).toBe(true);
  });

  it('accepts two or more letters even with surrounding punctuation', () => {
    expect(isMeaningfulTranscript('hi.')).toBe(true);
    expect(isMeaningfulTranscript('ok!')).toBe(true);
  });
});
