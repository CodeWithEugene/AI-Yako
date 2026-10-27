/**
 * Pipeline orchestrator. The single place that drives the translation flow
 * end to end. It owns the state machine, the model manager, and the live
 * QVAC calls, and exposes two high level operations.
 *
 * translateText is the text-first path used by typed input and by the web
 * UI. speakAndTranslate is the voice path used by the CLI demo. The web UI
 * drives transcription in the browser and calls translateText, so the server
 * never touches a microphone in production.
 *
 * All QVAC calls are serialized through an internal mutex because the
 * llama.cpp completion backend runs one job at a time. Every public method
 * maps failures onto the typed YakoError taxonomy so the UI can render a
 * precise message and a recovery action.
 */
import { translate, textToSpeech, transcribeStream } from '@qvac/sdk';
import { ModelManager, type LoadSlot, type ProgressFn } from '../models/manager.js';
import { StateMachine, type PipelineState, type PipelineEvent } from './state.js';
import { YakoError, toYakoError, type YakoErrorCode } from './errors.js';
import { ttsModelFor } from '../config/models.js';
import { otherLanguage, type LanguageCode } from '../config/languages.js';
import { isMeaningfulTranscript } from '../audio/transcript.js';
import { encodeWav } from '../audio/wav.js';
import { Logger } from '../observability/logger.js';
import { Metrics } from '../observability/metrics.js';

const log = Logger.forContext('orchestrator');

export interface TranslateTextInput {
  readonly source: LanguageCode;
  readonly target: LanguageCode;
  readonly text: string;
  /** When true, also synthesize speech for the translated text. */
  readonly speak?: boolean;
}

export interface TranslateTextResult {
  readonly source: LanguageCode;
  readonly target: LanguageCode;
  readonly sourceText: string;
  readonly translatedText: string;
  readonly translateMs: number;
  /** Base64 WAV when speak was requested, otherwise undefined. */
  readonly audioWavBase64?: string;
  readonly audioSampleRate?: number;
  readonly ttsMs?: number;
}

export interface SpokenResult {
  readonly source: LanguageCode;
  readonly target: LanguageCode;
  readonly sourceText: string;
  readonly translatedText: string;
  readonly transcribeMs: number;
  readonly translateMs: number;
  readonly audioWav: Buffer;
  readonly audioSampleRate: number;
  readonly ttsMs: number;
}

export interface TranscribeStreamSessionLike {
  write(chunk: Uint8Array): void;
  end(): void;
  destroy(): void;
  [Symbol.asyncIterator](): AsyncIterator<string>;
}

export class Orchestrator {
  readonly state = new StateMachine();
  readonly models: ModelManager;
  /** Serializes the one-job-at-a-time llama.cpp completion backend. */
  private llmQueue: Promise<unknown> = Promise.resolve();

  constructor(onProgress?: ProgressFn) {
    this.models = new ModelManager(onProgress);
  }

  get pipelineState(): PipelineState {
    return this.state.state;
  }

  fire(event: PipelineEvent): void {
    const next = this.state.transition(event);
    if (next === null) {
      throw new YakoError(
        'INVALID_STATE',
        `Event ${event} is not legal from state ${this.state.state}.`,
        undefined,
        false,
      );
    }
  }

  /** Runs a job under the LLM mutex so completion calls never overlap. */
  private withLlmLock<T>(job: () => Promise<T>): Promise<T> {
    const run = this.llmQueue.then(job, job);
    this.llmQueue = run.catch(() => undefined);
    return run;
  }

  /**
   * Core translation. Loads AfriSLM lazily, builds the exact model-card
   * prompt, and returns the target-language text. Serialized on the LLM lock.
   */
  private async runTranslation(
    source: LanguageCode,
    target: LanguageCode,
    text: string,
  ): Promise<{ text: string; ms: number }> {
    return this.withLlmLock(async () => {
      const modelId = await this.models.ensureLoaded('translation');
      const stop = Metrics.startSpan('pipeline.translate');
      try {
        // The QVAC translate op detects the TranslatePsy model and rebuilds
        // the exact model-card chat messages itself, then applies greedy
        // decoding. We pass only the raw source text. Pre-rendering the prompt
        // here would make the model translate our own instructions.
        const result = translate({
          modelId,
          text,
          from: source,
          to: target,
          modelType: 'llamacpp-completion',
          stream: false,
        } as never);
        const raw = await result.text;
        const ms = stop();
        const cleaned = cleanTranslation(raw);
        if (cleaned.length === 0) {
          throw new YakoError('TRANSLATE_FAILED', 'The model returned an empty translation.');
        }
        log.info('translated', {
          source,
          target,
          inLen: text.length,
          outLen: cleaned.length,
          ms: Math.round(ms),
        });
        return { text: cleaned, ms };
      } catch (error) {
        stop();
        throw toYakoError(error, 'TRANSLATE_FAILED');
      }
    });
  }

  /**
   * Synthesizes speech for text in the target language. Returns a complete
   * WAV buffer. Loads the language-specific engine lazily.
   */
  private async runTts(
    target: LanguageCode,
    text: string,
  ): Promise<{ wav: Buffer; sampleRate: number; ms: number }> {
    const slot: LoadSlot = `tts:${target}`;
    const modelId = await this.models.ensureLoaded(slot);
    const stop = Metrics.startSpan('pipeline.tts');
    try {
      const result = textToSpeech({
        modelId,
        text,
        inputType: 'text',
        stream: false,
      } as never);
      const samples = await result.buffer;
      const reportedRate = await result.sampleRate;
      const sampleRate = reportedRate && reportedRate > 0 ? reportedRate : 24000;
      if (!samples || samples.length === 0) {
        throw new YakoError('TTS_FAILED', 'The speech engine returned no audio.');
      }
      const wav = encodeWav(samples, sampleRate);
      const ms = stop();
      log.info('synthesized speech', {
        target,
        model: ttsModelFor(target).label,
        samples: samples.length,
        sampleRate,
        ms: Math.round(ms),
      });
      return { wav, sampleRate, ms };
    } catch (error) {
      stop();
      throw toYakoError(error, 'TTS_FAILED');
    }
  }

  /**
   * The text-first path. Validates input, translates, and optionally speaks.
   * Used by the web UI for typed input and after in-browser transcription.
   */
  async translateText(input: TranslateTextInput): Promise<TranslateTextResult> {
    const text = input.text.trim();
    if (text.length === 0) {
      throw new YakoError('TRANSCRIBE_EMPTY', 'Enter some text first.');
    }
    this.fire('audio_ready');
    this.fire('transcribed');
    try {
      const translated = await this.runTranslation(input.source, input.target, text);
      this.fire('translated');
      let audioWavBase64: string | undefined;
      let audioSampleRate: number | undefined;
      let ttsMs: number | undefined;
      if (input.speak) {
        const spoken = await this.runTts(input.target, translated.text);
        audioWavBase64 = spoken.wav.toString('base64');
        audioSampleRate = spoken.sampleRate;
        ttsMs = spoken.ms;
        this.fire('rendered');
        this.fire('speaking_finished');
      } else {
        this.state.reset();
      }
      Metrics.sampleMemory();
      return {
        source: input.source,
        target: input.target,
        sourceText: text,
        translatedText: translated.text,
        translateMs: translated.ms,
        ...(audioWavBase64 !== undefined ? { audioWavBase64 } : {}),
        ...(audioSampleRate !== undefined ? { audioSampleRate } : {}),
        ...(ttsMs !== undefined ? { ttsMs } : {}),
      };
    } catch (error) {
      this.state.reset();
      throw error;
    }
  }

  /**
   * Swaps the direction by flipping source and target. Pure helper so the UI
   * and tests share one definition.
   */
  swapDirection(source: LanguageCode): { source: LanguageCode; target: LanguageCode } {
    const target = otherLanguage(source);
    return { source: target, target: source };
  }

  /**
   * Streams a full PCM buffer through a fresh transcription session and
   * returns the joined, hallucination-filtered transcript. Used by the CLI
   * voice path after capturing audio.
   */
  async transcribeBuffer(
    source: LanguageCode,
    pcm: Uint8Array,
    openSession: (modelId: string) => Promise<TranscribeStreamSessionLike>,
  ): Promise<{ text: string; ms: number }> {
    const modelId = await this.models.ensureLoaded('transcription');
    const stop = Metrics.startSpan('pipeline.transcribe');
    const session = await openSession(modelId);
    try {
      session.write(pcm);
      session.end();
      const parts: string[] = [];
      for await (const chunk of session) {
        if (typeof chunk === 'string' && chunk.trim().length > 0) {
          parts.push(chunk);
        }
      }
      const joined = parts.join(' ').replace(/\s+/g, ' ').trim();
      const ms = stop();
      if (!isMeaningfulTranscript(joined)) {
        throw new YakoError('TRANSCRIBE_EMPTY', 'Nothing meaningful was heard.');
      }
      log.info('transcribed', { source, len: joined.length, ms: Math.round(ms) });
      return { text: joined, ms };
    } catch (error) {
      stop();
      session.destroy();
      throw toYakoError(error, 'TRANSCRIBE_FAILED');
    }
  }

  /** Full voice turn. Used by the CLI demo path with captured mic audio. */
  async speakAndTranslate(
    source: LanguageCode,
    pcm: Uint8Array,
    openSession: (modelId: string) => Promise<TranscribeStreamSessionLike>,
  ): Promise<SpokenResult> {
    const target = otherLanguage(source);
    this.fire('audio_ready');
    try {
      const heard = await this.transcribeBuffer(source, pcm, openSession);
      this.fire('transcribed');
      const translated = await this.runTranslation(source, target, heard.text);
      this.fire('translated');
      const spoken = await this.runTts(target, translated.text);
      this.fire('rendered');
      this.fire('speaking_finished');
      Metrics.sampleMemory();
      return {
        source,
        target,
        sourceText: heard.text,
        translatedText: translated.text,
        transcribeMs: heard.ms,
        translateMs: translated.ms,
        audioWav: spoken.wav,
        audioSampleRate: spoken.sampleRate,
        ttsMs: spoken.ms,
      };
    } catch (error) {
      this.state.reset();
      throw error;
    }
  }

  /**
   * Opens a real bidirectional transcription session for the loaded Whisper
   * model. Kept as one helper so the voice endpoint and any future caller
   * share the exact verified SDK call shape.
   */
  private openTranscribeSession(modelId: string): Promise<TranscribeStreamSessionLike> {
    return transcribeStream({
      modelId,
    } as never) as unknown as Promise<TranscribeStreamSessionLike>;
  }

  /**
   * The web voice path. The browser records a webm or opus blob and posts it.
   * We decode it to 16 kHz mono PCM with ffmpeg, transcribe with Whisper,
   * translate, and synthesize speech, returning the same shape as
   * translateText so the UI handles both paths identically.
   */
  async voiceTranslate(source: LanguageCode, webm: Buffer): Promise<TranslateTextResult> {
    const target = otherLanguage(source);
    if (webm.length === 0) {
      throw new YakoError(
        'TRANSCRIBE_EMPTY',
        'No audio was recorded. Hold the mic button and speak.',
      );
    }
    this.fire('audio_ready');
    try {
      const pcm = await decodeWebAudio(webm);
      const heard = await this.transcribeBuffer(source, pcm, (modelId) =>
        this.openTranscribeSession(modelId),
      );
      this.fire('transcribed');
      const translated = await this.runTranslation(source, target, heard.text);
      this.fire('translated');
      const spoken = await this.runTts(target, translated.text);
      this.fire('rendered');
      this.fire('speaking_finished');
      Metrics.sampleMemory();
      return {
        source,
        target,
        sourceText: heard.text,
        translatedText: translated.text,
        translateMs: translated.ms,
        audioWavBase64: spoken.wav.toString('base64'),
        audioSampleRate: spoken.sampleRate,
        ttsMs: spoken.ms,
      };
    } catch (error) {
      this.state.reset();
      throw error;
    }
  }

  /** Graceful shutdown. Unloads every model. */
  async shutdown(): Promise<void> {
    await this.models.unloadAll();
  }
}

/** Strips model framing and whitespace from a raw translation completion. */
export function cleanTranslation(raw: string): string {
  let out = raw.trim();
  // Remove a leading "Translation:" echo the model may emit.
  out = out.replace(/^translation\s*:\s*/i, '');
  // Drop surrounding quotes the model sometimes adds.
  out = out.replace(/^["']+|["']+$/g, '');
  return out.trim();
}

export function isYakoErrorCode(error: unknown, code: YakoErrorCode): boolean {
  return error instanceof YakoError && error.code === code;
}

/**
 * Decode an uploaded browser audio blob (webm or opus) into 16 kHz mono f32le
 * PCM for Whisper. Uses ffmpeg over stdin and stdout so no temp files are
 * needed. Defined here so the voice endpoint stays a thin adapter.
 */
export async function decodeWebAudio(webm: Buffer): Promise<Uint8Array> {
  const { spawn } = await import('node:child_process');
  return new Promise((resolve, reject) => {
    const proc = spawn(
      'ffmpeg',
      [
        '-hide_banner',
        '-loglevel',
        'error',
        '-i',
        'pipe:0',
        '-ar',
        '16000',
        '-ac',
        '1',
        '-sample_fmt',
        'flt',
        '-f',
        'f32le',
        'pipe:1',
      ],
      { stdio: ['pipe', 'pipe', 'pipe'] },
    );
    const out: Buffer[] = [];
    const errChunks: Buffer[] = [];
    proc.stdout.on('data', (chunk: Buffer) => out.push(chunk));
    proc.stderr.on('data', (chunk: Buffer) => errChunks.push(chunk));
    proc.on('error', (error) =>
      reject(
        new YakoError('TRANSCRIBE_FAILED', 'ffmpeg is required to decode microphone audio.', error),
      ),
    );
    proc.on('close', (code) => {
      if (code === 0 && out.length > 0) {
        resolve(new Uint8Array(Buffer.concat(out)));
      } else {
        const detail = Buffer.concat(errChunks).toString('utf8').slice(0, 300);
        reject(new YakoError('TRANSCRIBE_FAILED', `Could not decode microphone audio. ${detail}`));
      }
    });
    proc.stdin.on('error', () => undefined);
    proc.stdin.write(webm);
    proc.stdin.end();
  });
}
