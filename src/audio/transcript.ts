/**
 * Transcript hygiene. Whisper can emit hallucination artifacts on silence or
 * noise, for example bracketed tokens like "[Music]" or a lone punctuation
 * mark. This filter rejects those before they reach the translator, which
 * keeps the pipeline from translating noise into nonsense. Ported from the
 * verified voice-assistant example.
 */

const BRACKET_ARTIFACT = /^\s*[[(][^\])]*[\])]\s*$/;

export function isMeaningfulTranscript(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return false;
  }
  if (BRACKET_ARTIFACT.test(trimmed)) {
    return false;
  }
  const stripped = trimmed.replace(/[\s\p{P}\p{S}]+/gu, '');
  return stripped.length >= 2;
}
