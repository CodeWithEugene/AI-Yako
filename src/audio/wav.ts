/**
 * WAV encoding helpers for 16-bit mono PCM. Mirrors the verified reference
 * implementation in the QVAC TTS examples so the bytes we hand to players and
 * to the browser are known-good.
 */

export function createWavHeader(dataLength: number, sampleRate: number): Buffer {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataLength, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataLength, 40);
  return header;
}

export function int16ArrayToBuffer(samples: ArrayLike<number>): Buffer {
  const buffer = Buffer.alloc(samples.length * 2);
  for (let index = 0; index < samples.length; index += 1) {
    const value = Math.max(-32768, Math.min(32767, Math.round(samples[index] ?? 0)));
    buffer.writeInt16LE(value, index * 2);
  }
  return buffer;
}

/** Wraps raw int16 PCM samples in a complete WAV file buffer. */
export function encodeWav(samples: ArrayLike<number>, sampleRate: number): Buffer {
  const audioData = int16ArrayToBuffer(samples);
  return Buffer.concat([createWavHeader(audioData.length, sampleRate), audioData]);
}
