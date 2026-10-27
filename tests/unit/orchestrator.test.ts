import { describe, expect, it } from 'vitest';
import {
  Orchestrator,
  cleanTranslation,
  isYakoErrorCode,
} from '../../src/pipeline/orchestrator.js';
import { YakoError } from '../../src/pipeline/errors.js';

describe('cleanTranslation', () => {
  it('trims surrounding whitespace', () => {
    expect(cleanTranslation('  Habari  ')).toBe('Habari');
  });

  it('strips a leading Translation echo', () => {
    expect(cleanTranslation('Translation: Habari')).toBe('Habari');
    expect(cleanTranslation('translation:Habari')).toBe('Habari');
  });

  it('strips surrounding quotes', () => {
    expect(cleanTranslation('"Habari"')).toBe('Habari');
    expect(cleanTranslation("'Habari'")).toBe('Habari');
  });

  it('handles a clean string unchanged', () => {
    expect(cleanTranslation('Habari za asubuhi')).toBe('Habari za asubuhi');
  });
});

describe('isYakoErrorCode', () => {
  it('matches a YakoError by code', () => {
    const error = new YakoError('TRANSLATE_FAILED', 'x');
    expect(isYakoErrorCode(error, 'TRANSLATE_FAILED')).toBe(true);
    expect(isYakoErrorCode(error, 'TTS_FAILED')).toBe(false);
  });

  it('returns false for plain errors and other values', () => {
    expect(isYakoErrorCode(new Error('x'), 'UNKNOWN')).toBe(false);
    expect(isYakoErrorCode('x', 'UNKNOWN')).toBe(false);
  });
});

describe('Orchestrator state driving', () => {
  it('exposes idle state initially', () => {
    const orchestrator = new Orchestrator();
    expect(orchestrator.pipelineState).toBe('idle');
  });

  it('fire drives the state machine and rejects illegal events', () => {
    const orchestrator = new Orchestrator();
    orchestrator.fire('audio_ready');
    expect(orchestrator.pipelineState).toBe('transcribing');
    expect(() => orchestrator.fire('translated')).toThrowError(YakoError);
  });

  it('fire throws INVALID_STATE on an illegal transition', () => {
    const orchestrator = new Orchestrator();
    try {
      orchestrator.fire('rendered');
      expect.unreachable();
    } catch (error) {
      expect(isYakoErrorCode(error, 'INVALID_STATE')).toBe(true);
    }
  });
});
