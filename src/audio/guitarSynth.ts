import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI, midiToFrequency } from '../theory/notes';
import { StrumOptions } from '../types/audio';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const SAMPLE_PATH = `${BASE}samples/guitar`;

export const SAMPLES = [
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

// 3 Core anchor octaves (E2, E3, E4) that immediately cover the full guitar range
const PRIORITY_MIDIS = [40, 52, 64];

const sampleCache = new Map<number, AudioBuffer>();
const pendingLoads = new Map<number, Promise<AudioBuffer | null>>();

type ProgressCallback = (loaded: number, total: number) => void;
const progressListeners = new Set<ProgressCallback>();

export function subscribeLoadingProgress(callback: ProgressCallback): () => void {
  progressListeners.add(callback);
  callback(sampleCache.size, SAMPLES.length);
  return () => progressListeners.delete(callback);
}

function notifyProgress(): void {
  progressListeners.forEach(cb => cb(sampleCache.size, SAMPLES.length));
}

/**
 * 0ms Synchronous WAV PCM16 parser.
 * Reads raw 16-bit 44.1kHz mono PCM data directly into a Web Audio AudioBuffer.
 * Completely circumvents WebKit's notorious AudioContext.decodeAudioData suspended hangs.
 */
function parseWavToBuffer(ctx: AudioContext, arrayBuffer: ArrayBuffer): AudioBuffer {
  const view = new DataView(arrayBuffer);
  let offset = 12; // Skip 'RIFF' + length + 'WAVE'
  const len = view.byteLength;

  while (offset < len - 8) {
    const chunkId = String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );
    const chunkSize = view.getUint32(offset + 4, true);

    if (chunkId === 'data') {
      const sampleCount = chunkSize / 2;
      const audioBuffer = ctx.createBuffer(1, sampleCount, 44100);
      const channelData = audioBuffer.getChannelData(0);
      const dataStart = offset + 8;

      for (let i = 0; i < sampleCount; i++) {
        channelData[i] = view.getInt16(dataStart + i * 2, true) / 32768;
      }
      return audioBuffer;
    }
    offset += 8 + chunkSize;
  }
  throw new Error('WAV data chunk not found');
}

/**
 * Loads a single acoustic guitar sample file and parses it into AudioBuffer.
 */
async function loadSample(sampleMidi: number, file: string): Promise<AudioBuffer | null> {
  const cached = sampleCache.get(sampleMidi);
  if (cached) return cached;

  const inFlight = pendingLoads.get(sampleMidi);
  if (inFlight) return inFlight;

  const job = (async () => {
    try {
      const res = await fetch(`${SAMPLE_PATH}/${file}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${file}`);
      const arrayBuf = await res.arrayBuffer();
      const ctx = audioContextManager.getContext();
      const audioBuf = parseWavToBuffer(ctx, arrayBuf);
      sampleCache.set(sampleMidi, audioBuf);
      notifyProgress();
      return audioBuf;
    } catch (err) {
      console.warn(`Failed to load guitar sample ${file}:`, err);
      return null;
    } finally {
      pendingLoads.delete(sampleMidi);
    }
  })();

  pendingLoads.set(sampleMidi, job);
  return job;
}

/**
 * Rapid 2-Stage Preloader:
 * Stage 1: Load 3 anchor notes (E2, E3, E4) in parallel (~890KB total, <150ms).
 * Stage 2: Background-load the remaining 7 samples to eliminate pitch-shift artifacts.
 */
export async function preloadSamples(): Promise<void> {
  const anchors = SAMPLES.filter(([m]) => PRIORITY_MIDIS.includes(m));
  await Promise.allSettled(anchors.map(([m, f]) => loadSample(m, f)));

  const remaining = SAMPLES.filter(([m]) => !PRIORITY_MIDIS.includes(m));
  for (const [m, f] of remaining) {
    if (!sampleCache.has(m)) {
      await loadSample(m, f);
    }
  }
}

// Auto-trigger sample loading in background on page load
if (typeof window !== 'undefined') {
  void preloadSamples().catch(() => undefined);
}

function findBestSample(midi: number): { sampleMidi: number; buffer: AudioBuffer } | null {
  if (sampleCache.size === 0) return null;

  let bestMidi = -1;
  let bestDiff = 999;
  for (const [sMidi] of sampleCache.entries()) {
    const diff = Math.abs(sMidi - midi);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMidi = sMidi;
    }
  }

  const buffer = sampleCache.get(bestMidi);
  return buffer ? { sampleMidi: bestMidi, buffer } : null;
}

interface ActiveVoice {
  gainNode: GainNode;
  sourceNode?: AudioBufferSourceNode;
  stopAtTime: number;
}

export class GuitarSoundEngine {
  private static activeVoices: ActiveVoice[] = [];
  private static masterLimiter: DynamicsCompressorNode | null = null;
  private static masterGain: GainNode | null = null;

  public static get loadedSampleCount(): number {
    return sampleCache.size;
  }

  /**
   * High-output master audio chain with brickwall limiter.
   * Guarantees loud, punchy mobile phone speaker sound without distortion.
   */
  private static getMasterInput(): DynamicsCompressorNode {
    const ctx = audioContextManager.getContext();
    if (!this.masterLimiter || !this.masterGain) {
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-4, ctx.currentTime);
      limiter.knee.setValueAtTime(8, ctx.currentTime);
      limiter.ratio.setValueAtTime(12, ctx.currentTime);
      limiter.attack.setValueAtTime(0.003, ctx.currentTime);
      limiter.release.setValueAtTime(0.08, ctx.currentTime);

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.95, ctx.currentTime);

      limiter.connect(master);
      master.connect(ctx.destination);
      this.masterLimiter = limiter;
      this.masterGain = master;
    }
    return this.masterLimiter;
  }

  /**
   * Immediately fade-out and stop all currently ringing guitar strings.
   * Prevents previous chords from muddying and overlapping with new chords.
   */
  public static stopAll(): void {
    const ctx = audioContextManager.getContext();
    const now = ctx.currentTime;
    const fadeTime = 0.025;

    this.activeVoices.forEach(voice => {
      try {
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
        voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
        if (voice.sourceNode) {
          voice.sourceNode.stop(now + fadeTime + 0.005);
        }
      } catch {
        // Voice already stopped
      }
    });

    this.activeVoices = [];
  }

  /**
   * Play an acoustic guitar string using genuine Martin HD-28 recorded samples.
   */
  public static playString(
    stringIdx: number,
    fret: number,
    offsetSec = 0,
    velocity = 0.9,
  ): void {
    if (fret < 0) return;

    const ctx = audioContextManager.getContext();
    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    const requestedStart = ctx.currentTime + Math.max(0, offsetSec);

    void (async () => {
      const best = findBestSample(midi);
      if (!best) {
        const target = SAMPLES.reduce((a, b) =>
          Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a
        );
        const buffer = await loadSample(target[0], target[1]);
        if (!buffer) return;
        return { sampleMidi: target[0], buffer };
      }
      return best;
    })().then(best => {
      if (!best) return;
      const start = Math.max(requestedStart, ctx.currentTime + 0.002);

      try {
        const source = ctx.createBufferSource();
        source.buffer = best.buffer;
        source.playbackRate.setValueAtTime(2 ** ((midi - best.sampleMidi) / 12), start);

        const gain = ctx.createGain();
        const stringWeight = stringIdx >= 5 ? 0.27 : stringIdx >= 3 ? 0.23 : 0.20;
        const peak = Math.min(0.30, velocity * stringWeight);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.003);

        const stopAt = start + best.buffer.duration;

        source.connect(gain);
        gain.connect(this.getMasterInput());
        source.start(start);
        source.stop(stopAt + 0.02);

        this.activeVoices.push({ gainNode: gain, sourceNode: source, stopAtTime: stopAt });
      } catch (err) {
        console.warn('Guitar sample playback failed:', err);
      }
    }).catch(() => undefined);
  }

  public static strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {},
  ): void {
    // 7ms between consecutive sounding strings gives a tight, lively acoustic strum
    const speed = options.speedSec ?? 0.012;
    const direction = options.direction ?? 'down';
    const velocity = options.velocity ?? 0.9;

    const indices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    let soundingIndex = 0;
    for (const idx of indices) {
      const fret = frets[idx];
      if (fret < 0) continue; // Skip muted strings immediately

      const stringIndex = 6 - idx;
      const offsetSec = soundingIndex * speed;
      this.playString(
        stringIndex,
        fret,
        offsetSec,
        velocity * (0.96 + (soundingIndex % 2) * 0.04),
      );
      soundingIndex++;
    }
  }

  public static async warmup(): Promise<void> {
    await preloadSamples();
  }

  public static playTestNote(): void {
    this.stopAll();
    this.playString(5, 3, 0, 0.95);
  }
}
