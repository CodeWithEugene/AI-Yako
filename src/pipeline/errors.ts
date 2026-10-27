/**
 * Typed error taxonomy. Every failure the user can hit is mapped to one of
 * these codes so the UI can show a precise, human message and a recovery
 * action, and tests can assert on the code rather than a message string.
 */

export type YakoErrorCode =
  | 'MODEL_LOAD_FAILED'
  | 'MODEL_DOWNLOAD_FAILED'
  | 'OUT_OF_MEMORY'
  | 'TRANSCRIBE_FAILED'
  | 'TRANSCRIBE_EMPTY'
  | 'TRANSLATE_FAILED'
  | 'TTS_FAILED'
  | 'MIC_UNAVAILABLE'
  | 'MIC_PERMISSION_DENIED'
  | 'PLAYBACK_FAILED'
  | 'NETWORK_REQUIRED'
  | 'CANCELLED'
  | 'INVALID_STATE'
  | 'UNKNOWN';

export class YakoError extends Error {
  constructor(
    readonly code: YakoErrorCode,
    message: string,
    override readonly cause?: unknown,
    readonly recoverable = true,
  ) {
    super(message);
    this.name = 'YakoError';
    // Restore the prototype chain for reliable instanceof checks.
    Object.setPrototypeOf(this, YakoError.prototype);
  }
}

/** Maps an unknown thrown value to a YakoError with a best-guess code. */
export function toYakoError(error: unknown, fallback: YakoErrorCode = 'UNKNOWN'): YakoError {
  if (error instanceof YakoError) {
    return error;
  }
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();
  let code = fallback;
  if (lower.includes('out of memory') || lower.includes('oom') || lower.includes('enomem')) {
    code = 'OUT_OF_MEMORY';
  } else if (
    lower.includes('microphone') ||
    lower.includes('avfoundation') ||
    lower.includes('no audio input')
  ) {
    code = 'MIC_UNAVAILABLE';
  } else if (lower.includes('permission') && lower.includes('mic')) {
    code = 'MIC_PERMISSION_DENIED';
  } else if (
    lower.includes('network') ||
    lower.includes('econn') ||
    lower.includes('enotfound') ||
    lower.includes('offline')
  ) {
    code = 'NETWORK_REQUIRED';
  } else if (lower.includes('cancel')) {
    code = 'CANCELLED';
  }
  return new YakoError(code, message, error);
}

/** A short human message and a recovery hint for each code. */
export function describeError(code: YakoErrorCode): { title: string; hint: string } {
  switch (code) {
    case 'MODEL_LOAD_FAILED':
      return { title: 'Model failed to load', hint: 'Try restarting the app.' };
    case 'MODEL_DOWNLOAD_FAILED':
      return { title: 'Model download failed', hint: 'Check your connection and run setup again.' };
    case 'OUT_OF_MEMORY':
      return { title: 'Not enough memory', hint: 'Close other apps and try again.' };
    case 'TRANSCRIBE_FAILED':
      return {
        title: 'Could not hear that',
        hint: 'Try speaking again, a little closer to the mic.',
      };
    case 'TRANSCRIBE_EMPTY':
      return { title: 'Nothing heard', hint: 'Press and hold the mic button and speak clearly.' };
    case 'TRANSLATE_FAILED':
      return { title: 'Translation failed', hint: 'Please try again.' };
    case 'TTS_FAILED':
      return { title: 'Speech output failed', hint: 'The translation is still shown as text.' };
    case 'MIC_UNAVAILABLE':
      return { title: 'No microphone found', hint: 'Connect a mic and try again.' };
    case 'MIC_PERMISSION_DENIED':
      return {
        title: 'Microphone blocked',
        hint: 'Allow microphone access in your browser settings.',
      };
    case 'PLAYBACK_FAILED':
      return { title: 'Playback failed', hint: 'The translation is still shown as text.' };
    case 'NETWORK_REQUIRED':
      return {
        title: 'Connection needed once',
        hint: 'First setup needs internet to fetch models.',
      };
    case 'CANCELLED':
      return { title: 'Cancelled', hint: 'Ready when you are.' };
    case 'INVALID_STATE':
      return { title: 'Busy', hint: 'Wait for the current step to finish.' };
    case 'UNKNOWN':
    default:
      return { title: 'Something went wrong', hint: 'Please try again.' };
  }
}
