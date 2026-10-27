/**
 * Model registry for Yako. Every model we use is named here with the exact
 * registry descriptor from @qvac/sdk, never a magic string in pipeline code.
 * Sizes come from each descriptor's expectedSize, confirmed by live probes.
 */
import {
  WHISPER_TINY_Q8_0,
  WHISPER_BASE_Q8_0,
  TRANSLATEPSY_AFRISLM_0_8B_TRANSLATION_Q4_K_M,
  TTS_EN_SUPERTONIC_Q8_0,
  TTS_T3_MULTILINGUAL_CHATTERBOX_Q4_0,
  TTS_S3GEN_MULTILINGUAL_CHATTERBOX_Q4_0,
  VAD_SILERO_5_1_2,
} from '@qvac/sdk';
import type { LanguageCode } from './languages.js';

export type ModelRole = 'transcription' | 'translation' | 'vad';

export interface YakoModel {
  readonly label: string;
  readonly descriptor: unknown;
  readonly engine: string;
  readonly sizeBytes: number;
}

/** Whisper tiny is the default. Base is a config upgrade if accuracy is poor. */
export const TRANSCRIPTION_MODEL: YakoModel = {
  label: 'Whisper tiny (multilingual)',
  descriptor: WHISPER_TINY_Q8_0,
  engine: 'whispercpp-transcription',
  sizeBytes: 43_537_433,
};

export const TRANSCRIPTION_MODEL_UPGRADE: YakoModel = {
  label: 'Whisper base (multilingual)',
  descriptor: WHISPER_BASE_Q8_0,
  engine: 'whispercpp-transcription',
  sizeBytes: 81_768_585,
};

export const TRANSLATION_MODEL: YakoModel = {
  label: 'TranslatePsy AfriSLM 0.8B',
  descriptor: TRANSLATEPSY_AFRISLM_0_8B_TRANSLATION_Q4_K_M,
  engine: 'llamacpp-completion',
  sizeBytes: 672_329_792,
};

export const VAD_MODEL: YakoModel = {
  label: 'Silero VAD 5.1.2',
  descriptor: VAD_SILERO_5_1_2,
  engine: 'whispercpp-transcription',
  sizeBytes: 885_098,
};

/**
 * Text to speech is per language. English uses Supertonic, which is small
 * and fast. Swahili uses Chatterbox multilingual, the only engine in the
 * registry that lists Swahili, confirmed by a live probe in .scratch/probe.
 * Chatterbox needs a companion S3GEN vocoder model passed at load time.
 */
export const TTS_EN_MODEL: YakoModel = {
  label: 'Supertonic English TTS',
  descriptor: TTS_EN_SUPERTONIC_Q8_0,
  engine: 'tts-ggml',
  sizeBytes: 251_818_336,
};

export const TTS_SW_T3_MODEL: YakoModel = {
  label: 'Chatterbox Swahili TTS (T3)',
  descriptor: TTS_T3_MULTILINGUAL_CHATTERBOX_Q4_0,
  engine: 'tts-ggml',
  sizeBytes: 345_031_680,
};

export const TTS_SW_S3GEN_MODEL: YakoModel = {
  label: 'Chatterbox Swahili TTS (S3GEN vocoder)',
  descriptor: TTS_S3GEN_MULTILINGUAL_CHATTERBOX_Q4_0,
  engine: 'tts-ggml',
  sizeBytes: 788_396_032,
};

/** The primary TTS descriptor for a language (Chatterbox T3 for Swahili). */
export function ttsModelFor(language: LanguageCode): YakoModel {
  return language === 'sw' ? TTS_SW_T3_MODEL : TTS_EN_MODEL;
}

/** Every model a first run must download, in fetch order. */
export const REQUIRED_MODELS: readonly YakoModel[] = [
  TRANSLATION_MODEL,
  TRANSCRIPTION_MODEL,
  TTS_EN_MODEL,
  TTS_SW_T3_MODEL,
  TTS_SW_S3GEN_MODEL,
  VAD_MODEL,
];

export const TOTAL_DOWNLOAD_BYTES = REQUIRED_MODELS.reduce(
  (sum, model) => sum + model.sizeBytes,
  0,
);
