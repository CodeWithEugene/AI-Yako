/**
 * Pipeline state machine. Pure and dependency-free so it is fully unit
 * testable. The orchestrator drives it with events and reacts to the state
 * transitions. Illegal transitions are rejected with an INVALID_STATE error
 * so a stuck or double-tapped control can never corrupt the pipeline.
 */

export type PipelineState =
  'idle' | 'listening' | 'transcribing' | 'translating' | 'rendering' | 'speaking' | 'error';

export type PipelineEvent =
  | 'start_listening'
  | 'audio_ready'
  | 'transcribed'
  | 'translated'
  | 'rendered'
  | 'speaking_started'
  | 'speaking_finished'
  | 'fail'
  | 'reset';

/** The legal next states for each current state and event. */
const TRANSITIONS: Readonly<Record<PipelineState, Partial<Record<PipelineEvent, PipelineState>>>> =
  {
    idle: {
      start_listening: 'listening',
      audio_ready: 'transcribing',
      fail: 'error',
    },
    listening: {
      audio_ready: 'transcribing',
      fail: 'error',
      reset: 'idle',
    },
    transcribing: {
      transcribed: 'translating',
      fail: 'error',
      reset: 'idle',
    },
    translating: {
      translated: 'rendering',
      fail: 'error',
      reset: 'idle',
    },
    rendering: {
      rendered: 'speaking',
      speaking_started: 'speaking',
      fail: 'error',
      reset: 'idle',
    },
    speaking: {
      speaking_finished: 'idle',
      fail: 'error',
      reset: 'idle',
    },
    error: {
      reset: 'idle',
      start_listening: 'listening',
      audio_ready: 'transcribing',
    },
  };

export class StateMachine {
  private current: PipelineState = 'idle';

  get state(): PipelineState {
    return this.current;
  }

  isBusy(): boolean {
    return this.current !== 'idle' && this.current !== 'error';
  }

  /**
   * Attempts a transition. Returns the new state on success, or null when the
   * transition is not legal from the current state (callers map that to an
   * INVALID_STATE error without throwing inside the machine).
   */
  transition(event: PipelineEvent): PipelineState | null {
    const next = TRANSITIONS[this.current][event];
    if (!next) {
      return null;
    }
    this.current = next;
    return next;
  }

  /** Forces back to idle. Always legal. */
  reset(): PipelineState {
    this.current = 'idle';
    return this.current;
  }
}
