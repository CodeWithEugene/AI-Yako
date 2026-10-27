import { describe, expect, it } from 'vitest';
import { createWavHeader, encodeWav, int16ArrayToBuffer } from '../../src/audio/wav.js';

describe('createWavHeader', () => {
  it('emits a 44-byte RIFF/WAVE header', () => {
    const header = createWavHeader(2000, 24000);
    expect(header.length).toBe(44);
    expect(header.toString('ascii', 0, 4)).toBe('RIFF');
    expect(header.toString('ascii', 8, 12)).toBe('WAVE');
    expect(header.toString('ascii', 12, 16)).toBe('fmt ');
    expect(header.toString('ascii', 36, 40)).toBe('data');
  });

  it('records PCM format, mono channel, sample rate, and data length', () => {
    const header = createWavHeader(2000, 24000);
    expect(header.readUInt16LE(20)).toBe(1); // PCM
    expect(header.readUInt16LE(22)).toBe(1); // mono
    expect(header.readUInt32LE(24)).toBe(24000); // sample rate
    expect(header.readUInt32LE(28)).toBe(48000); // byte rate = rate * 2
    expect(header.readUInt16LE(34)).toBe(16); // bits per sample
    expect(header.readUInt32LE(40)).toBe(2000); // data chunk length
    expect(header.readUInt32LE(4)).toBe(36 + 2000); // RIFF size
  });
});

describe('int16ArrayToBuffer', () => {
  it('packs samples little-endian', () => {
    const buffer = int16ArrayToBuffer([1, 256, -1]);
    expect(buffer.length).toBe(6);
    expect(buffer.readInt16LE(0)).toBe(1);
    expect(buffer.readInt16LE(2)).toBe(256);
    expect(buffer.readInt16LE(4)).toBe(-1);
  });

  it('clamps to the int16 range', () => {
    const buffer = int16ArrayToBuffer([40000, -40000]);
    expect(buffer.readInt16LE(0)).toBe(32767);
    expect(buffer.readInt16LE(2)).toBe(-32768);
  });
});

describe('encodeWav', () => {
  it('produces a complete WAV buffer with header plus data', () => {
    const samples = [0, 100, -100, 32767, -32768];
    const wav = encodeWav(samples, 16000);
    expect(wav.length).toBe(44 + samples.length * 2);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.readUInt32LE(40)).toBe(samples.length * 2);
  });

  it('handles empty input', () => {
    const wav = encodeWav([], 16000);
    expect(wav.length).toBe(44);
    expect(wav.readUInt32LE(40)).toBe(0);
  });
});
