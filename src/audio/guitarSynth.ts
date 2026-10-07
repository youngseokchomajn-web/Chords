import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI } from '../theory/notes';
import { StrumOptions } from '../types/audio';
import { selectSample } from './sampleSelector';
import { SAMPLES } from './sampleCatalog';

export { SAMPLES } from './sampleCatalog';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const SAMPLE_PATH = `${BASE}samples/guitar`;

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
  // Fetch/decode all small mono guitar samples concurrently.
  // The previous implementation loaded 3 anchors first and then decoded the
  // remaining 7 sequentially, which made the "ready 5/10" phase unnecessarily long.
  await Promise.allSettled(
    SAMPLES.map(([m, f]) => loadSample(m, f)),
  );
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

export function findBestSampleForString(
  stringIdx: number,
  fret: number,
  midi: number
): { sampleMidi: number; buffer: AudioBuffer } | null {
  if (sampleCache.size === 0) return null;

  const selected = selectSample({ stringNumber: stringIdx, fret, targetMidi: midi });
  if (selected && sampleCache.has(selected.sampleMidi)) {
    return {
      sampleMidi: selected.sampleMidi,
      buffer: sampleCache.get(selected.sampleMidi)!
    };
  }

  return findBestSample(midi);
}

interface ActiveVoice {
  gainNode: GainNode;
  sourceNode?: AudioBufferSourceNode;
  startTime: number;
  groupId?: string;
}

export class GuitarSoundEngine {
  private static activeVoices: ActiveVoice[] = [];
  private static masterGain: GainNode | null = null;

  public static get loadedSampleCount(): number {
    return sampleCache.size;
  }

  /**
   * Keep chord playback as close as possible to the original recorded sample.
   * No compressor/limiter is used here: the RAW SAMPLE path is the reference tone.
   */
  private static getMasterInput(): GainNode {
    const ctx = audioContextManager.getContext();
    if (!this.masterGain) {
      const master = ctx.createGain();
      master.gain.setValueAtTime(1.0, ctx.currentTime);
      master.connect(ctx.destination);
      this.masterGain = master;
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
        if (voice.sourceNode) {
          voice.sourceNode.stop(now + fadeTime + 0.005);
        }
      } catch {
        // Voice already stopped.
      }
    });

    this.activeVoices = [];
  }

  /**
   * Musical chord change: let the previous strum decay briefly instead of
   * hard-cutting it. This is intentionally separate from stopAll(), which is
   * still used for an explicit Stop / restart.
   */
  public static releaseAll(fadeTime = 0.11): void {
    const ctx = audioContextManager.getContext();
    const now = ctx.currentTime;
    const safeFade = Math.max(0.04, Math.min(0.25, fadeTime));

    this.activeVoices.forEach(voice => {
      try {
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(Math.max(0.0001, voice.gainNode.gain.value), now);
        voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + safeFade);
        if (voice.sourceNode) {
          voice.sourceNode.stop(now + safeFade + 0.005);
        }
      } catch {
        // Voice already stopped.
      }
    });
  }

  private static triggerVoice(
    buffer: AudioBuffer,
    sampleMidi: number,
    targetMidi: number,
    stringIdx: number,
    start: number,
    velocity: number,
    groupId?: string,
  ): void {
    const ctx = audioContextManager.getContext();
    try {
      const source = ctx.createBufferSource();
      source.buffer = buffer;

      const playbackRate = 2 ** ((targetMidi - sampleMidi) / 12);
      source.playbackRate.setValueAtTime(playbackRate, start);

      const gain = ctx.createGain();
      // Keep the recorded attack intact. Only use a tiny fade-in to avoid a click.
      const stringWeight = stringIdx >= 4 ? 0.65 : 0.55;
      const peak = velocity * stringWeight;

      gain.gain.setValueAtTime(peak, start);

      source.connect(gain);
      gain.connect(this.getMasterInput());

      source.onended = () => {
        this.activeVoices = this.activeVoices.filter(voice => voice.sourceNode !== source);
      };

      source.start(start);
      this.activeVoices.push({ gainNode: gain, sourceNode: source, startTime: start, groupId });
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
    const best = findBestSampleForString(stringIdx, fret, midi);
    if (best) {
      this.triggerVoice(best.buffer, best.sampleMidi, midi, stringIdx, start, velocity);
      return;
    }

    // Chord playback must use recorded guitar samples only.
    // If preload is incomplete, the caller should wait rather than synthesize a fake guitar tone.
    const target = SAMPLES.reduce((a, b) =>
      Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a,
    );
    void loadSample(target[0], target[1]);
  }

  private static strumAtInternal(
    frets: [number, number, number, number, number, number],
    when: number,
    options: StrumOptions = {},
    groupId?: string,
  ): void {
    const speed = options.speedSec ?? 0.007;
    const direction = options.direction ?? 'down';
    const velocity = options.velocity ?? 0.9;
    const indices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    let soundingIndex = 0;
    for (const idx of indices) {
      const fret = frets[idx];
      if (fret < 0) continue;
      const stringIndex = 6 - idx;
      const midi = STANDARD_TUNING_MIDI[stringIndex] + fret;
      const best = findBestSampleForString(stringIndex, fret, midi);
      if (!best) continue;
      const start = when + soundingIndex * speed;
      this.triggerVoice(best.buffer, best.sampleMidi, midi, stringIndex, start, velocity * (0.96 + (soundingIndex % 2) * 0.04), groupId);
      soundingIndex++;
    }
  }

  /** Schedule a strum on the Web Audio clock, avoiding setTimeout jitter. */
  public static strumAt(
    frets: [number, number, number, number, number, number],
    when: number,
    options: StrumOptions = {},
    groupId?: string,
  ): void {
    audioContextManager.unlockSync();
    this.strumAtInternal(frets, when, options, groupId);
  }

  /**
   * End one chord's voice group at an exact musical boundary.
   * Gain reaches silence at the boundary, so the next chord cannot inherit
   * an audible tail from this group.
   */
  public static releaseGroupAt(groupId: string, when: number, fadeTime = 0.008): void {
    const safeFade = Math.max(0.002, Math.min(0.05, fadeTime));
    const fadeStart = Math.max(0, when - safeFade);

    this.activeVoices.forEach(voice => {
      if (voice.groupId !== groupId) return;
      try {
        voice.gainNode.gain.cancelScheduledValues(fadeStart);
        voice.gainNode.gain.setValueAtTime(Math.max(0.0001, voice.gainNode.gain.value), fadeStart);
        voice.gainNode.gain.linearRampToValueAtTime(0.0001, when);
        if (voice.sourceNode) voice.sourceNode.stop(when + 0.002);
      } catch {
        // Voice already stopped.
      }
    });
  }

  /**
   * Synchronous strum - schedules voices immediately within user gesture.
   */
  public static strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {},
  ): void {
    audioContextManager.unlockSync();

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
    // Chord/raw playback should never start a network/decode wait on click.
    // Always wait for the full recorded-sample set to be ready.
    await preloadSamples();
  }

  public static playRawSample(sampleMidi: number): boolean {
    const buffer = sampleCache.get(sampleMidi);
    if (!buffer) return false;

    const ctx = audioContextManager.getContext();
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(0.75, ctx.currentTime);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(ctx.currentTime);
    return true;
  }

  public static playTestNote(): void {
    this.stopAll();
    this.playString(5, 3, 0, 0.95);
  }
}
