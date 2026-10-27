/**
 * Lightweight in-process metrics. Records named timing spans and a small set
 * of counters and gauges so the About panel can show cold start, speech to
 * text, text to speech, and peak memory without any external service. All
 * state is in memory and local only.
 */

export interface SpanSummary {
  readonly name: string;
  readonly count: number;
  readonly totalMs: number;
  readonly lastMs: number;
  readonly minMs: number;
  readonly maxMs: number;
}

interface SpanAccumulator {
  count: number;
  totalMs: number;
  lastMs: number;
  minMs: number;
  maxMs: number;
}

export class Metrics {
  private static spans = new Map<string, SpanAccumulator>();
  private static counters = new Map<string, number>();
  private static peakRssBytes = 0;

  private constructor() {}

  /** Returns a function that stops the span and records the elapsed time. */
  static startSpan(name: string): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const elapsedMs = Number(process.hrtime.bigint() - start) / 1e6;
      Metrics.recordSpan(name, elapsedMs);
      return elapsedMs;
    };
  }

  static recordSpan(name: string, elapsedMs: number): void {
    const existing = Metrics.spans.get(name);
    if (!existing) {
      Metrics.spans.set(name, {
        count: 1,
        totalMs: elapsedMs,
        lastMs: elapsedMs,
        minMs: elapsedMs,
        maxMs: elapsedMs,
      });
      return;
    }
    existing.count += 1;
    existing.totalMs += elapsedMs;
    existing.lastMs = elapsedMs;
    existing.minMs = Math.min(existing.minMs, elapsedMs);
    existing.maxMs = Math.max(existing.maxMs, elapsedMs);
  }

  /** Times an async operation and records it under the given span name. */
  static async time<T>(name: string, run: () => Promise<T>): Promise<T> {
    const stop = Metrics.startSpan(name);
    try {
      return await run();
    } finally {
      stop();
    }
  }

  static increment(name: string, by = 1): void {
    Metrics.counters.set(name, (Metrics.counters.get(name) ?? 0) + by);
  }

  static counter(name: string): number {
    return Metrics.counters.get(name) ?? 0;
  }

  /** Samples current RSS and keeps the high water mark for the session. */
  static sampleMemory(): number {
    const rss = process.memoryUsage().rss;
    if (rss > Metrics.peakRssBytes) {
      Metrics.peakRssBytes = rss;
    }
    return rss;
  }

  static peakMemoryBytes(): number {
    Metrics.sampleMemory();
    return Metrics.peakRssBytes;
  }

  static summaries(): readonly SpanSummary[] {
    return [...Metrics.spans.entries()].map(([name, acc]) => ({
      name,
      count: acc.count,
      totalMs: acc.totalMs,
      lastMs: acc.lastMs,
      minMs: acc.minMs,
      maxMs: acc.maxMs,
    }));
  }

  static reset(): void {
    Metrics.spans.clear();
    Metrics.counters.clear();
    Metrics.peakRssBytes = 0;
  }
}
