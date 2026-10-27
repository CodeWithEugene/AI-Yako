/**
 * The AfriSLM translation prompt, reproduced exactly from the model card at
 * https://huggingface.co/qvac/TranslatePsy-AfriSLM-0.8B and the EMNLP 2026
 * paper (arXiv:2608.18655). The language names are written out in words and
 * decoding is greedy. This template is versioned here as a single constant so
 * the swap control only ever changes the two language slots.
 */
import type { LanguageCode } from './languages.js';
import { LANGUAGES } from './languages.js';

export interface ChatMessage {
  readonly role: 'system' | 'user';
  readonly content: string;
}

export function buildTranslationMessages(
  source: LanguageCode,
  target: LanguageCode,
  text: string,
): readonly ChatMessage[] {
  const src = LANGUAGES[source].promptName;
  const tgt = LANGUAGES[target].promptName;
  return [
    {
      role: 'system',
      content:
        `You are a professional ${src} to ${tgt} translator. ` +
        `Your goal is to accurately convey the meaning and nuances of the ` +
        `original ${src} text while adhering to ${tgt} grammar, ` +
        `vocabulary, and cultural sensitivities. Produce only the ` +
        `${tgt} translation, without any additional explanations ` +
        `or commentary. `,
    },
    {
      role: 'user',
      content:
        `Please translate the following ${src} text into ` + `${tgt}: ${text}.\n\nTranslation:`,
    },
  ];
}

/**
 * The single-prompt string form used by the QVAC completion-style
 * translation call. AfriSLM is a chat model, and the QVAC translation op
 * applies the chat template, so we pass the rendered system and user text.
 */
export function buildTranslationPrompt(
  source: LanguageCode,
  target: LanguageCode,
  text: string,
): string {
  const [system, user] = buildTranslationMessages(source, target, text);
  return `${system!.content}\n\n${user!.content}`;
}

/** Decoding parameters for faithful short translation (greedy, per model card). */
export const TRANSLATION_DECODING = {
  temperature: 0,
  maxTokens: 256,
  contextSize: 2048,
} as const;
