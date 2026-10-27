import { describe, expect, it } from 'vitest';
import { Orchestrator } from '../../src/pipeline/orchestrator.js';

const orchestrator = new Orchestrator();

describe('speech output (live TTS, offline)', () => {
  it('synthesizes Swahili speech for an English to Swahili turn', async () => {
    const result = await orchestrator.translateText({
      source: 'en',
      target: 'sw',
      text: 'Good morning.',
      speak: true,
    });
    expect(result.audioWavBase64).toBeDefined();
    const wav = Buffer.from(result.audioWavBase64!, 'base64');
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(result.audioSampleRate).toBeGreaterThan(0);
    expect(result.ttsMs).toBeGreaterThan(0);
  }, 120000);

  it('synthesizes English speech for a Swahili to English turn', async () => {
    const result = await orchestrator.translateText({
      source: 'sw',
      target: 'en',
      text: 'Habari za asubuhi.',
      speak: true,
    });
    expect(result.audioWavBase64).toBeDefined();
    const wav = Buffer.from(result.audioWavBase64!, 'base64');
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(result.audioSampleRate).toBe(44100);
  }, 120000);

  it('returns to idle after a spoken turn', () => {
    expect(orchestrator.pipelineState).toBe('idle');
  });
});
