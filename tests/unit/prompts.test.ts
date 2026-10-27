import { describe, expect, it } from 'vitest';
import {
  buildTranslationMessages,
  buildTranslationPrompt,
  TRANSLATION_DECODING,
} from '../../src/config/prompts.js';

describe('translation prompt template', () => {
  it('produces a system and a user message', () => {
    const messages = buildTranslationMessages('en', 'sw', 'Hello');
    expect(messages).toHaveLength(2);
    expect(messages[0]!.role).toBe('system');
    expect(messages[1]!.role).toBe('user');
  });

  it('writes language names out in words, not codes', () => {
    const messages = buildTranslationMessages('en', 'sw', 'Hello');
    expect(messages[0]!.content).toContain('English');
    expect(messages[0]!.content).toContain('Swahili');
    expect(messages[1]!.content).toContain('English');
    expect(messages[1]!.content).toContain('Swahili');
  });

  it('embeds the source text in the user turn', () => {
    const messages = buildTranslationMessages('sw', 'en', 'Habari yako');
    expect(messages[1]!.content).toContain('Habari yako');
  });

  it('instructs the model to produce only the translation', () => {
    const messages = buildTranslationMessages('en', 'sw', 'Hello');
    expect(messages[0]!.content).toContain('without any additional explanations');
  });

  it('ends the user turn with the Translation cue', () => {
    const messages = buildTranslationMessages('en', 'sw', 'Hello');
    expect(messages[1]!.content.trimEnd().endsWith('Translation:')).toBe(true);
  });

  it('flat prompt joins system and user text', () => {
    const prompt = buildTranslationPrompt('en', 'sw', 'Hello');
    const messages = buildTranslationMessages('en', 'sw', 'Hello');
    expect(prompt).toBe(`${messages[0]!.content}\n\n${messages[1]!.content}`);
  });

  it('uses greedy decoding per the model card', () => {
    expect(TRANSLATION_DECODING.temperature).toBe(0);
    expect(TRANSLATION_DECODING.maxTokens).toBeGreaterThan(0);
  });
});
