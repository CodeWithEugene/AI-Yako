import { describe, expect, it, beforeEach } from 'vitest';
import { Metrics } from '../../src/observability/metrics.js';

describe('Metrics', () => {
  beforeEach(() => {
    Metrics.reset();
  });

  it('records span count, min, max, and totals', () => {
    Metrics.recordSpan('a', 10);
    Metrics.recordSpan('a', 30);
    Metrics.recordSpan('a', 20);
    const summary = Metrics.summaries().find((s) => s.name === 'a');
    expect(summary).toBeDefined();
    expect(summary!.count).toBe(3);
    expect(summary!.totalMs).toBe(60);
    expect(summary!.minMs).toBe(10);
    expect(summary!.maxMs).toBe(30);
    expect(summary!.lastMs).toBe(20);
  });

  it('startSpan times a block and records it', () => {
    const stop = Metrics.startSpan('timed');
    const elapsed = stop();
    expect(elapsed).toBeGreaterThanOrEqual(0);
    expect(Metrics.summaries().some((s) => s.name === 'timed')).toBe(true);
  });

  it('increments counters', () => {
    Metrics.increment('hits');
    Metrics.increment('hits', 4);
    expect(Metrics.counter('hits')).toBe(5);
    expect(Metrics.counter('missing')).toBe(0);
  });

  it('tracks peak memory as a high water mark', () => {
    const peak = Metrics.peakMemoryBytes();
    expect(peak).toBeGreaterThan(0);
    expect(Metrics.peakMemoryBytes()).toBeGreaterThanOrEqual(peak);
  });
});
