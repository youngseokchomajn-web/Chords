import { STANDARD_TUNING_MIDI } from '../theory/notes';
import { StrumOptions } from '../types/audio';

const BASE = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : `${import.meta.env.BASE_URL}/`;
const SAMPLE_PATH = `${BASE}samples/guitar`;

export const SAMPLES: readonly [number, string][] = [
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
];

function nearest(midi: number): [number, string] {
  return SAMPLES.reduce((a, b) =>
    Math.abs(b[0] - midi) < Math.abs(a[0] - midi) ? b : a,
  );
}

// Pre-create Audio objects for instant browser caching without decodeAudioData hangs
const audioCache = new Map<number, HTMLAudioElement>();

if (typeof window !== 'undefined') {
  SAMPLES.forEach(([midi, file]) => {
    try {
      const el = new Audio(`${SAMPLE_PATH}/${file}`);
      el.preload = 'auto';
      audioCache.set(midi, el);
    } catch {
      // Ignore
    }
  });
}

function playInstantSample(
  midi: number,
  offsetMs: number,
  velocity: number,
) {
  const [sampleMidi, file] = nearest(midi);
  const semitoneDiff = midi - sampleMidi;
  const rate = Math.pow(2, semitoneDiff / 12);

  const trigger = () => {
    try {
      const audio = new Audio(`${SAMPLE_PATH}/${file}`);
      audio.preload = 'auto';
      // Pitch shift via playbackRate
      const clampedRate = Math.max(0.5, Math.min(2.0, rate));
      audio.playbackRate = clampedRate;
      (audio as unknown as { preservesPitch?: boolean }).preservesPitch = false;
      (audio as unknown as { webkitPreservesPitch?: boolean }).webkitPreservesPitch = false;
      (audio as unknown as { mozPreservesPitch?: boolean }).mozPreservesPitch = false;

      audio.volume = Math.max(0.1, Math.min(1.0, velocity));
      const playPromise = audio.play();
      if (playPromise) {
        playPromise.catch(() => undefined);
      }
    } catch {
      // Fallback
    }
  };

  if (offsetMs <= 0) {
    trigger();
  } else {
    window.setTimeout(trigger, offsetMs);
  }
}

export class GuitarSoundEngine {
  public static get loadedSampleCount(): number {
    return SAMPLES.length;
  }

  public static playString(
    stringIdx: number,
    fret: number,
    offsetSec = 0,
    velocity = 0.85,
  ) {
    if (fret < 0) return;
    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    playInstantSample(midi, offsetSec * 1000, velocity);
  }

  public static strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {},
  ) {
    const speed = options.speedSec ?? 0.024;
    const direction = options.direction ?? 'down';
    const velocity = options.velocity ?? 0.85;
    const indices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    indices.forEach((idx, position) => {
      const fret = frets[idx];
      if (fret < 0) return;

      const stringIndex = 6 - idx;
      const offsetSec = position * speed;
      this.playString(
        stringIndex,
        fret,
        offsetSec,
        velocity * (0.95 + (position % 2) * 0.03),
      );
    });
  }

  public static playTestNote(): void {
    playInstantSample(40, 0, 0.95);
  }
}
