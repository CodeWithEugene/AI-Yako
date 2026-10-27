import { describe, expect, it } from 'vitest';
import { StateMachine } from '../../src/pipeline/state.js';

describe('StateMachine', () => {
  it('starts idle and is not busy', () => {
    const machine = new StateMachine();
    expect(machine.state).toBe('idle');
    expect(machine.isBusy()).toBe(false);
  });

  it('walks the full voice pipeline from idle back to idle', () => {
    const machine = new StateMachine();
    expect(machine.transition('audio_ready')).toBe('transcribing');
    expect(machine.transition('transcribed')).toBe('translating');
    expect(machine.transition('translated')).toBe('rendering');
    expect(machine.transition('rendered')).toBe('speaking');
    expect(machine.transition('speaking_finished')).toBe('idle');
    expect(machine.isBusy()).toBe(false);
  });

  it('walks the listening path into the pipeline', () => {
    const machine = new StateMachine();
    expect(machine.transition('start_listening')).toBe('listening');
    expect(machine.isBusy()).toBe(true);
    expect(machine.transition('audio_ready')).toBe('transcribing');
  });

  it('rejects an illegal transition and returns null', () => {
    const machine = new StateMachine();
    expect(machine.transition('translated')).toBeNull();
    expect(machine.state).toBe('idle');
  });

  it('reset always returns to idle from any state', () => {
    const machine = new StateMachine();
    machine.transition('start_listening');
    machine.transition('audio_ready');
    expect(machine.reset()).toBe('idle');
    expect(machine.state).toBe('idle');
  });

  it('treats error as recoverable via reset and allows a fresh start', () => {
    const machine = new StateMachine();
    machine.transition('fail');
    expect(machine.state).toBe('error');
    expect(machine.isBusy()).toBe(false);
    expect(machine.transition('reset')).toBe('idle');
    expect(machine.transition('start_listening')).toBe('listening');
  });

  it('is not busy while idle or in error', () => {
    const machine = new StateMachine();
    expect(machine.isBusy()).toBe(false);
    machine.transition('fail');
    expect(machine.isBusy()).toBe(false);
  });
});
