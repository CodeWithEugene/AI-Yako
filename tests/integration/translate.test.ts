import { describe, expect, it } from 'vitest';
import { Orchestrator } from '../../src/pipeline/orchestrator.js';

/**
 * Live integration test against the real AfriSLM translation model, fully
 * offline. Shares one orchestrator so the model loads once for the file.
 */
const orchestrator = new Orchestrator();

describe('translation pipeline (live model, offline)', () => {
  it('translates English to Swahili', async () => {
    const result = await orchestrator.translateText({
      source: 'en',
      target: 'sw',
      text: 'Good morning, how are you?',
    });
    expect(result.target).toBe('sw');
    expect(result.translatedText.length).toBeGreaterThan(0);
    expect(result.translatedText.toLowerCase()).toContain('habari');
    expect(result.translateMs).toBeGreaterThan(0);
  }, 60000);

  it('translates Swahili to English', async () => {
    const result = await orchestrator.translateText({
      source: 'sw',
      target: 'en',
      text: 'Asante sana kwa msaada wako.',
    });
    expect(result.target).toBe('en');
    expect(result.translatedText.length).toBeGreaterThan(0);
    expect(result.translatedText.toLowerCase()).toContain('thank');
  }, 60000);

  it('does not echo the prompt back', async () => {
    const result = await orchestrator.translateText({
      source: 'sw',
      target: 'en',
      text: 'Ninataka kwenda sokoni kesho asubuhi.',
    });
    expect(result.translatedText.toLowerCase()).not.toContain('professional');
    expect(result.translatedText.toLowerCase()).not.toContain('translator');
    expect(result.translatedText.toLowerCase()).not.toContain('translation:');
  }, 60000);

  it('returns to idle after a successful turn', async () => {
    expect(orchestrator.pipelineState).toBe('idle');
  });
});
