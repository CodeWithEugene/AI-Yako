/**
 * Language registry. Yako v1 is a focused two-language pair, but the swap
 * control and prompt template are driven by these records so direction is
 * data-driven and testable, never hardcoded in two places.
 */

export type LanguageCode = 'en' | 'sw';

export interface YakoLanguage {
  readonly code: LanguageCode;
  /** Display name shown in the UI. */
  readonly label: string;
  /** Full word used inside the AfriSLM prompt template. */
  readonly promptName: string;
  /** Whether we can synthesize speech for this language in v1. */
  readonly speakable: boolean;
  /** Whisper language hint for transcription. */
  readonly whisperCode: string;
}

export const LANGUAGES: Readonly<Record<LanguageCode, YakoLanguage>> = {
  en: {
    code: 'en',
    label: 'English',
    promptName: 'English',
    speakable: true,
    whisperCode: 'en',
  },
  sw: {
    code: 'sw',
    label: 'Swahili',
    promptName: 'Swahili',
    // Swahili voice is confirmed via the Chatterbox multilingual engine,
    // verified by a live probe. See config/models.ts.
    speakable: true,
    whisperCode: 'sw',
  },
};

export const DEFAULT_SOURCE: LanguageCode = 'en';
export const DEFAULT_TARGET: LanguageCode = 'sw';

export function otherLanguage(code: LanguageCode): LanguageCode {
  return code === 'en' ? 'sw' : 'en';
}
