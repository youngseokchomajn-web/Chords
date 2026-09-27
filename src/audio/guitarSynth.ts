import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI } from '../theory/notes';
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
 * Parse the actual WAV format instead of assuming mono/44.1 kHz.
 * The RAW SAMPLE buttons play the original WAV directly, so chord playback
 * must decode the same PCM frames without changing channel layout or sample rate.
 */
function parseWavToBuffer(ctx: AudioContext, arrayBuffer: ArrayBuffer): AudioBuffer {
  const view = new DataView(arrayBuffer);

  const readFourCC = (offset: number): string =>
    String.fromCharCode(
      view.getUint8(offset),
      view.getUint8(offset + 1),
      view.getUint8(offset + 2),
      view.getUint8(offset + 3),
    );

  if (readFourCC(0) !== 'RIFF' || readFourCC(8) !== 'WAVE') {
    throw new Error('Invalid RIFF/WAVE file');
  }

  let offset = 12;
  let channels = 0;
  let sampleRate = 0;
  let bitsPerSample = 0;
  let audioFormat = 0;
  let dataOffset = -1;
  let dataSize = 0;

  while (offset + 8 <= view.byteLength) {
    const chunkId = readFourCC(offset);
    const chunkSize = view.getUint32(offset + 4, true);
    const chunkData = offset + 8;

    if (chunkId === 'fmt ') {
      if (chunkSize < 16) throw new Error('Invalid WAV fmt chunk');
      audioFormat = view.getUint16(chunkData, true);
      channels = view.getUint16(chunkData + 2, true);
      sampleRate = view.getUint32(chunkData + 4, true);
      bitsPerSample = view.getUint16(chunkData + 14, true);
    } else if (chunkId === 'data') {
      dataOffset = chunkData;
      dataSize = Math.min(chunkSize, view.byteLength - chunkData);
      break;
    }

    // RIFF chunks are word-aligned.
    offset = chunkData + chunkSize + (chunkSize & 1);
  }

  if (audioFormat !== 1 || channels < 1 || !sampleRate || bitsPerSample !== 16) {
    throw new Error(
      `Unsupported WAV format: format=${audioFormat}, channels=${channels}, sampleRate=${sampleRate}, bits=${bitsPerSample}`,
    );
  }
  if (dataOffset < 0) throw new Error('WAV data chunk not found');

  const bytesPerSample = bitsPerSample / 8;
  const frameSize = channels * bytesPerSample;
  const frameCount = Math.floor(dataSize / frameSize);
  const audioBuffer = ctx.createBuffer(channels, frameCount, sampleRate);

  for (let channel = 0; channel < channels; channel++) {
    const channelData = audioBuffer.getChannelData(channel);
    for (let frame = 0; frame < frameCount; frame++) {
      const byteOffset = dataOffset + frame * frameSize + channel * bytesPerSample;
      channelData[frame] = view.getInt16(byteOffset, true) / 32768;
    }
  }

  return audioBuffer;
}

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

export async function preloadSamples(): Promise<void> {
  const anchors = SAMPLES.filter(([m]) => PRIORITY_MIDIS.includes(m));
  await Promise.allSettled(anchors.map(([m, f]) => loadSample(m, f)));

  const remaining = SAMPLES.filter(([m]) => !PRIORITY_MIDIS.includes(m));
  for (const [m, f] of remaining) {
    if (!sampleCache.has(m)) await loadSample(m, f);
  }
}

if (typeof window !== 'undefined') {
  void preloadSamples().catch(() => undefined);
}

function findBestSample(midi: number): { sampleMidi: number; buffer: AudioBuffer } | null {
  if (sampleCache.size === 0) return null;

  let bestMidi = -1;
  let bestDiff = Infinity;
  for (const [sampleMidi] of sampleCache.entries()) {
    const diff = Math.abs(sampleMidi - midi);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMidi = sampleMidi;
    }
  }

  const buffer = sampleCache.get(bestMidi);
  return buffer ? { sampleMidi: bestMidi, buffer } : null;
}

interface ActiveVoice {
  gainNode: GainNode;
  sourceNode: AudioBufferSourceNode;
}

export class GuitarSoundEngine {
  private static activeVoices: ActiveVoice[] = [];
  private static masterGain: GainNode | null = null;
  private static masterLimiter: DynamicsCompressorNode | null = null;

  public static get loadedSampleCount(): number {
    return sampleCache.size;
  }

  /**
   * High-output master audio bus with transparent brickwall limiter.
   * Ensures loud, rich Martin acoustic guitar tone on mobile speakers without distortion.
   */
  private static getMasterInput(): GainNode {
    const ctx = audioContextManager.getContext();
    if (!this.masterGain || !this.masterLimiter) {
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-2, ctx.currentTime);
      limiter.knee.setValueAtTime(6, ctx.currentTime);
      limiter.ratio.setValueAtTime(16, ctx.currentTime);
      limiter.attack.setValueAtTime(0.002, ctx.currentTime);
      limiter.release.setValueAtTime(0.05, ctx.currentTime);

      const master = ctx.createGain();
      master.gain.setValueAtTime(1.15, ctx.currentTime);

      master.connect(limiter);
      limiter.connect(ctx.destination);

      this.masterGain = master;
      this.masterLimiter = limiter;
    }
    return this.masterGain;
  }

  public static stopAll(): void {
    const ctx = audioContextManager.getContext();
    const now = ctx.currentTime;
    const fadeTime = 0.025;

    this.activeVoices.forEach(voice => {
      try {
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(Math.max(0.0001, voice.gainNode.gain.value), now);
        voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
        voice.sourceNode.stop(now + fadeTime + 0.005);
      } catch {
        // Voice already stopped.
      }
    });

    this.activeVoices = [];
  }

  private static triggerVoice(
    buffer: AudioBuffer,
    sampleMidi: number,
    targetMidi: number,
    stringIdx: number,
    start: number,
    velocity: number,
  ): void {
    const ctx = audioContextManager.getContext();
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const playbackRate = 2 ** ((targetMidi - sampleMidi) / 12);
      source.playbackRate.setValueAtTime(playbackRate, start);

      const gain = ctx.createGain();
      // Rich, clearly audible string volume on phone speakers
      const stringWeight = stringIdx >= 4 ? 0.58 : 0.48;
      const peak = velocity * stringWeight;

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.003);

      source.connect(gain);
      gain.connect(this.getMasterInput());

      source.onended = () => {
        this.activeVoices = this.activeVoices.filter(voice => voice.sourceNode !== source);
      };

      source.start(start);
      this.activeVoices.push({ gainNode: gain, sourceNode: source });
    } catch (err) {
      console.warn('Guitar sample playback failed:', err);
    }
  }

  public static playString(
    stringIdx: number,
    fret: number,
    offsetSec = 0,
    velocity = 0.9,
  ): void {
    if (fret < 0) return;

    const ctx = audioContextManager.getContext();
    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    const start = ctx.currentTime + Math.max(0, offsetSec);

    // Fast path: immediate synchronous playback if sample is available
    const best = findBestSample(midi);
    if (best) {
      this.triggerVoice(best.buffer, best.sampleMidi, midi, stringIdx, start, velocity);
      return;
    }

    // Async fallback: load nearest sample on-demand
    const target = SAMPLES.reduce((a, b) =>
      Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a,
    );
    void loadSample(target[0], target[1]).then(buffer => {
      if (buffer) {
        const actualStart = Math.max(start, ctx.currentTime + 0.002);
        this.triggerVoice(buffer, target[0], midi, stringIdx, actualStart, velocity);
      }
    });
  }

  public static async strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {},
  ): Promise<void> {
    await audioContextManager.ensureRunning();

    const speed = options.speedSec ?? 0.007;
    const direction = options.direction ?? 'down';
    const velocity = options.velocity ?? 0.9;
    const indices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    let soundingIndex = 0;
    for (const idx of indices) {
      const fret = frets[idx];
      if (fret < 0) continue;

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
    // Non-blocking rapid anchor preload check
    if (sampleCache.size < 3) {
      await preloadSamples();
    }
  }

  public static playTestNote(): void {
    this.stopAll();
    this.playString(5, 3, 0, 0.95);
  }
}
