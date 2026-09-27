import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI, midiToFrequency } from '../theory/notes';
import { StrumOptions } from '../types/audio';

// Ensure base URL ends with slash
const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const SAMPLE_PATH = `${BASE}samples/guitar`;

const SAMPLES = [
  [40, 'MartinGM2_040__E2_1.wav'],
  [43, 'MartinGM2_043__G2_1.wav'],
  [46, 'MartinGM2_046_Bb2_1.wav'],
  [49, 'MartinGM2_049_Db3_1.wav'],
  [52, 'MartinGM2_052__E3_1.wav'],
  [55, 'MartinGM2_055__G3_1.wav'],
  [58, 'MartinGM2_058_Bb3_1.wav'],
  [61, 'MartinGM2_061_Db4_1.wav'],
  [64, 'MartinGM2_064__E4_1.wav'],
  [68, 'MartinGM2_068_Ab4_1.wav'],
] as const;

const cache = new Map<number, AudioBuffer>();
const pending = new Map<number, Promise<AudioBuffer>>();

function nearest(midi: number) {
  return SAMPLES.reduce((a, b) =>
    Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a,
  );
}

export async function preloadSamples(): Promise<number> {
  let loadedCount = 0;
  const ctx = audioContextManager.getContext();

  await Promise.allSettled(
    SAMPLES.map(async ([sampleMidi, file]) => {
      if (cache.has(sampleMidi)) {
        loadedCount++;
        return;
      }
      try {
        const url = `${SAMPLE_PATH}/${file}`;
        const response = await fetch(url);
        if (!response.ok) return;
        const arrayBuf = await response.arrayBuffer();
        const audioBuf = await ctx.decodeAudioData(arrayBuf);
        cache.set(sampleMidi, audioBuf);
        loadedCount++;
      } catch (err) {
        console.warn(`Failed to preload sample ${file}:`, err);
      }
    }),
  );

  return loadedCount;
}

// Auto preload in background
if (typeof window !== 'undefined') {
  void preloadSamples().catch(() => undefined);
}

async function sampleFor(midi: number) {
  const [sampleMidi, file] = nearest(midi);
  const cached = cache.get(sampleMidi);
  if (cached) return { buffer: cached, sampleMidi };

  const existing = pending.get(sampleMidi);
  if (existing) return { buffer: await existing, sampleMidi };

  const ctx = audioContextManager.getContext();
  const job = fetch(`${SAMPLE_PATH}/${file}`)
    .then(response => {
      if (!response.ok) throw new Error(`sample missing: ${file}`);
      return response.arrayBuffer();
    })
    .then(data => ctx.decodeAudioData(data))
    .then(buffer => {
      cache.set(sampleMidi, buffer);
      pending.delete(sampleMidi);
      return buffer;
    })
    .catch(error => {
      pending.delete(sampleMidi);
      throw error;
    });

  pending.set(sampleMidi, job);
  return { buffer: await job, sampleMidi };
}

function fallback(
  stringIdx: number,
  fret: number,
  offset: number,
  velocity: number,
) {
  const ctx = audioContextManager.getContext();
  const now = Math.max(ctx.currentTime, ctx.currentTime + offset);
  const freq = midiToFrequency(STANDARD_TUNING_MIDI[stringIdx] + fret);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(velocity * 0.7, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  // Use triangle with a touch of sawtooth for harmonic richness on mobile speakers
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, now);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(freq * 4, now);
  filter.frequency.exponentialRampToValueAtTime(freq * 1.2, now + 0.8);

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.25);
}

function playSample(
  stringIdx: number,
  fret: number,
  offset: number,
  velocity: number,
  buffer: AudioBuffer,
  sampleMidi: number,
) {
  const target = STANDARD_TUNING_MIDI[stringIdx] + fret;
  const ctx = audioContextManager.getContext();
  const now = Math.max(ctx.currentTime, ctx.currentTime + offset);

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.playbackRate.value = Math.pow(2, (target - sampleMidi) / 12);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.linearRampToValueAtTime(velocity * 0.9, now + 0.004);

  const releaseAt = now + Math.min(2.8, Math.max(0.75, buffer.duration));
  gain.gain.exponentialRampToValueAtTime(0.0001, releaseAt);

  source.connect(gain).connect(ctx.destination);
  source.start(now);
  source.stop(Math.min(now + buffer.duration, releaseAt + 0.02));
}

export class GuitarSoundEngine {
  public static get loadedSampleCount(): number {
    return cache.size;
  }

  public static playString(
    stringIdx: number,
    fret: number,
    offset = 0,
    velocity = 0.8,
  ) {
    if (fret < 0) return;

    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    const [sampleMidi] = nearest(midi);
    const cached = cache.get(sampleMidi);

    if (cached) {
      playSample(stringIdx, fret, offset, velocity, cached, sampleMidi);
      return;
    }

    fallback(stringIdx, fret, offset, velocity);
    void sampleFor(midi).catch(() => undefined);
  }

  public static strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {},
  ) {
    const speed = options.speedSec ?? 0.025;
    const direction = options.direction ?? 'down';
    const velocity = options.velocity ?? 0.8;
    const indices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    indices.forEach((idx, position) => {
      const fret = frets[idx];
      if (fret < 0) return;

      const stringIndex = 6 - idx;
      const offset = Math.max(0, position * speed + ((position % 3) - 1) * 0.002);
      this.playString(
        stringIndex,
        fret,
        offset,
        velocity * (0.94 + (position % 2) * 0.03),
      );
    });
  }

  /**
   * Diagnostic test: plays a single open E2 (6th string) or sample test
   */
  public static async playTestNote(): Promise<void> {
    await audioContextManager.unlock();
    const ctx = audioContextManager.getContext();
    if (cache.has(40)) {
      playSample(6, 0, 0, 0.9, cache.get(40)!, 40);
    } else {
      fallback(6, 0, 0, 0.9);
      void sampleFor(40).catch(() => undefined);
    }
    console.log('Test note played, ctx state:', ctx.state);
  }
}
