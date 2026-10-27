import { describe, expect, it } from 'vitest';
import { Orchestrator } from '../../src/pipeline/orchestrator.js';

describe('swap direction', () => {
  it('swaps English source to Swahili target and back', () => {
    const orchestrator = new Orchestrator();
    const once = orchestrator.swapDirection('en');
    expect(once).toEqual({ source: 'sw', target: 'en' });
    const twice = orchestrator.swapDirection(once.source);
    expect(twice).toEqual({ source: 'en', target: 'sw' });
  });

  it('is an involution for both languages', () => {
    const orchestrator = new Orchestrator();
    for (const code of ['en', 'sw'] as const) {
      const swapped = orchestrator.swapDirection(code);
      expect(orchestrator.swapDirection(swapped.source)).toEqual({
        source: code,
        target: swapped.source,
      });
    }
  });
});
