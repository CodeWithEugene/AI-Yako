/**
 * Request handlers for the local API. Pure async functions over the
 * orchestrator so the HTTP layer stays a thin adapter. Each handler returns
 * a plain object that the router serializes to JSON, or throws a YakoError
 * that the router maps onto a typed error response.
 */
import type { Orchestrator, TranslateTextResult } from '../pipeline/orchestrator.js';
import { YakoError } from '../pipeline/errors.js';
import { Metrics } from '../observability/metrics.js';
import { LANGUAGES, otherLanguage, type LanguageCode } from '../config/languages.js';
import { REQUIRED_MODELS, TOTAL_DOWNLOAD_BYTES } from '../config/models.js';

export interface ApiErrorBody {
  readonly ok: false;
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly title: string;
    readonly hint: string;
  };
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return value === 'en' || value === 'sw';
}

function parseTranslateBody(body: unknown): {
  source: LanguageCode;
  target: LanguageCode;
  text: string;
  speak: boolean;
} {
  if (typeof body !== 'object' || body === null) {
    throw new YakoError('INVALID_STATE', 'Request body must be an object.', undefined, false);
  }
  const record = body as Record<string, unknown>;
  const source = record['source'];
  const target = record['target'];
  const text = record['text'];
  const speak = record['speak'] === true;
  if (!isLanguageCode(source) || !isLanguageCode(target)) {
    throw new YakoError('INVALID_STATE', 'source and target must be en or sw.', undefined, false);
  }
  if (source === target) {
    throw new YakoError('INVALID_STATE', 'source and target must differ.', undefined, false);
  }
  if (typeof text !== 'string' || text.trim().length === 0) {
    throw new YakoError('TRANSCRIBE_EMPTY', 'text must be a non-empty string.');
  }
  if (text.length > 2000) {
    throw new YakoError(
      'INVALID_STATE',
      'text is too long. Keep it under 2000 characters.',
      undefined,
      false,
    );
  }
  return { source, target, text, speak };
}

export async function handleTranslate(
  orchestrator: Orchestrator,
  body: unknown,
): Promise<{ ok: true; result: TranslateTextResult }> {
  const input = parseTranslateBody(body);
  const result = await orchestrator.translateText(input);
  return { ok: true, result };
}

function parseVoiceBody(body: unknown): { source: LanguageCode; audio: Buffer } {
  if (typeof body !== 'object' || body === null) {
    throw new YakoError('INVALID_STATE', 'Request body must be an object.', undefined, false);
  }
  const record = body as Record<string, unknown>;
  const source = record['source'];
  const audioBase64 = record['audioBase64'];
  if (!isLanguageCode(source)) {
    throw new YakoError('INVALID_STATE', 'source must be en or sw.', undefined, false);
  }
  if (typeof audioBase64 !== 'string' || audioBase64.length === 0) {
    throw new YakoError('TRANSCRIBE_EMPTY', 'audioBase64 must be a non-empty base64 string.');
  }
  if (audioBase64.length > 24_000_000) {
    throw new YakoError(
      'INVALID_STATE',
      'Audio is too long. Keep a turn under about a minute.',
      undefined,
      false,
    );
  }
  const audio = Buffer.from(audioBase64, 'base64');
  if (audio.length === 0) {
    throw new YakoError('TRANSCRIBE_EMPTY', 'The recorded audio could not be decoded.');
  }
  return { source, audio };
}

export async function handleVoice(
  orchestrator: Orchestrator,
  body: unknown,
): Promise<{ ok: true; result: TranslateTextResult }> {
  const { source, audio } = parseVoiceBody(body);
  const result = await orchestrator.voiceTranslate(source, audio);
  return { ok: true, result };
}

export function handleSwap(body: unknown): {
  ok: true;
  source: LanguageCode;
  target: LanguageCode;
} {
  const record = (body ?? {}) as Record<string, unknown>;
  const source = record['source'];
  if (!isLanguageCode(source)) {
    throw new YakoError('INVALID_STATE', 'source must be en or sw.', undefined, false);
  }
  return { ok: true, source: otherLanguage(source), target: source };
}

export function handleHealth(orchestrator: Orchestrator): {
  ok: true;
  state: string;
  loadedSlots: string[];
} {
  const loadedSlots: string[] = [];
  for (const slot of ['transcription', 'translation', 'vad', 'tts:en', 'tts:sw'] as const) {
    if (orchestrator.models.isLoaded(slot)) {
      loadedSlots.push(slot);
    }
  }
  return { ok: true, state: orchestrator.pipelineState, loadedSlots };
}

export function handleMetrics(): {
  ok: true;
  spans: readonly unknown[];
  counters: Record<string, number>;
  peakMemoryBytes: number;
  memoryRssBytes: number;
} {
  const counters: Record<string, number> = {};
  return {
    ok: true,
    spans: Metrics.summaries(),
    counters,
    peakMemoryBytes: Metrics.peakMemoryBytes(),
    memoryRssBytes: process.memoryUsage().rss,
  };
}

export function handleMeta(): {
  ok: true;
  app: string;
  languages: unknown;
  models: readonly unknown[];
  totalDownloadBytes: number;
} {
  return {
    ok: true,
    app: 'Yako',
    languages: LANGUAGES,
    models: REQUIRED_MODELS,
    totalDownloadBytes: TOTAL_DOWNLOAD_BYTES,
  };
}
