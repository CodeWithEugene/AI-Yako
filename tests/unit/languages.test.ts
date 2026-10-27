import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SOURCE,
  DEFAULT_TARGET,
  LANGUAGES,
  otherLanguage,
} from '../../src/config/languages.js';

describe('language registry', () => {
  it('supports exactly English and Swahili in v1', () => {
    expect(Object.keys(LANGUAGES).sort()).toEqual(['en', 'sw']);
  });

  it('marks both languages as speakable and whisper-capable', () => {
    for (const language of Object.values(LANGUAGES)) {
      expect(language.speakable).toBe(true);
      expect(language.whisperCode.length).toBeGreaterThan(0);
      expect(language.promptName.length).toBeGreaterThan(0);
    }
  });

  it('otherLanguage swaps the pair both ways', () => {
    expect(otherLanguage('en')).toBe('sw');
    expect(otherLanguage('sw')).toBe('en');
  });

  it('otherLanguage is its own inverse', () => {
    expect(otherLanguage(otherLanguage('en'))).toBe('en');
    expect(otherLanguage(otherLanguage('sw'))).toBe('sw');
  });

  it('has sane defaults that differ', () => {
    expect(DEFAULT_SOURCE).not.toBe(DEFAULT_TARGET);
    expect(LANGUAGES[DEFAULT_SOURCE]).toBeDefined();
    expect(LANGUAGES[DEFAULT_TARGET]).toBeDefined();
  });
});
