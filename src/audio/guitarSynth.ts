import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI, midiToFrequency } from '../theory/notes';
import { StrumOptions } from '../types/audio';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const SAMPLE_PATH = `${BASE}samples/guitar`;

// Optimized lightweight MP3 samples (24KB each, total ~250KB)
export const SAMPLES = [
  [40, 'MartinGM2_040__E2_1.mp3'],
  [43, 'MartinGM2_043__G2_1.mp3'],
  [46, 'MartinGM2_046_Bb2_1.mp3'],
  [49, 'MartinGM2_049_Db3_1.mp3'],
  [52, 'MartinGM2_052__E3_1.mp3'],
  [55, 'MartinGM2_055__G3_1.mp3'],
  [58, 'MartinGM2_058_Bb3_1.mp3'],
  [61, 'MartinGM2_061_Db4_1.mp3'],
  [64, 'MartinGM2_064__E4_1.mp3'],
  [68, 'MartinGM2_068_Ab4_1.mp3'],
] as const;

// 3 core anchor notes (E2, E3, E4) that can cover the full guitar range in <0.1s
const PRIORITY_MIDIS = [40, 52, 64];

const cache = new Map<number, AudioBuffer>();
const pending = new Map<number, Promise<AudioBuffer>>();

type ProgressCallback = (loaded: number, total: number) => void;
const progressListeners = new Set<ProgressCallback>();

export function subscribeLoadingProgress(callback: ProgressCallback) {
  progressListeners.add(callback);
  callback(cache.size, SAMPLES.length);
  return () => progressListeners.delete(callback);
}

function notifyProgress() {
  progressListeners.forEach(cb => cb(cache.size, SAMPLES.length));
}

function nearest(midi: number) {
  // If full cache is not ready, pick closest available in cache first
  const available = SAMPLES.filter(([m]) => cache.has(m));
  const pool = available.length > 0 ? available : SAMPLES;

  return pool.reduce((a, b) =>
    Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a,
  );
}

async function loadSample(sampleMidi: number, file: string): Promise<AudioBuffer> {
  const cached = cache.get(sampleMidi);
  if (cached) return cached;

  const inFlight = pending.get(sampleMidi);
  if (inFlight) return inFlight;

  const ctx = audioContextManager.getContext();
  const job = (async () => {
    try {
      const res = await fetch(`${SAMPLE_PATH}/${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`);
      const arrayBuf = await res.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      cache.set(sampleMidi, audioBuf);
      notifyProgress();
      return audioBuf;
    } finally {
      pending.delete(sampleMidi);
    }
  })();

  pending.set(sampleMidi, job);
  return job;
}

/**
 * 2-Stage Progressive Preload:
 * 1. Rapidly loads 3 anchor octaves (E2, E3, E4 - total ~75KB) in parallel
 * 2. Background-loads the rest to enrich fine acoustic timbre
 */
export async function preloadSamples(): Promise<void> {
  // Step 1: Rapid anchor load (instant zero-latency sound)
  const priorityItems = SAMPLES.filter(([m]) => PRIORITY_MIDIS.includes(m));
  await Promise.allSettled(
    priorityItems.map(([m, f]) => loadSample(m, f).catch(() => undefined))
  );

  // Step 2: Background load remaining samples
  const remaining = SAMPLES.filter(([m]) => !PRIORITY_MIDIS.includes(m));
  for (const [m, f] of remaining) {
    if (!cache.has(m)) {
      await loadSample(m, f).catch(() => undefined);
    }
  }
}

// Auto preload on boot
if (typeof window !== 'undefined') {
  void preloadSamples().catch(() => undefined);
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
  gain.gain.linearRampToValueAtTime(velocity * 0.75, now + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

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
  gain.gain.linearRampToValueAtTime(velocity * 0.95, now + 0.004);

  const releaseAt = now + Math.min(2.5, Math.max(0.7, buffer.duration));
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
    const [sampleMidi, file] = nearest(midi);
    const cached = cache.get(sampleMidi);

    if (cached) {
      playSample(stringIdx, fret, offset, velocity, cached, sampleMidi);
      return;
    }

    // Fallback synth sound immediately with zero delay
    fallback(stringIdx, fret, offset, velocity);
    // Queue sample in background
    void loadSample(sampleMidi, file).catch(() => undefined);
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

  public static async playTestNote(): Promise<void> {
    await audioContextManager.unlock();
    const [sampleMidi, file] = nearest(40);
    const cached = cache.get(sampleMidi);
    if (cached) {
      playSample(6, 0, 0, 0.95, cached, sampleMidi);
    } else {
      fallback(6, 0, 0, 0.95);
      void loadSample(sampleMidi, file).catch(() => undefined);
    }
  }
}
