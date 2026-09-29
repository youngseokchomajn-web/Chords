export interface GuitarSample {
  midi: number;
  fileName: string;
  /** Optional physical playing position. Only populate when verified from the source library. */
  stringNumber?: number;
  fret?: number;
  source?: string;
  license?: string;
}

/**
 * Current Martin note bank.
 * The source files do not contain verified string/fret metadata, so those fields
 * intentionally remain undefined. The selector must therefore use MIDI fallback
 * until a position-aware library is introduced.
 */
export const GUITAR_SAMPLES: readonly GuitarSample[] = [
  { midi: 40, fileName: 'MartinGM2_040__E2_1.wav' },
  { midi: 43, fileName: 'MartinGM2_043__G2_1.wav' },
  { midi: 46, fileName: 'MartinGM2_046_Bb2_1.wav' },
  { midi: 49, fileName: 'MartinGM2_049_Db3_1.wav' },
  { midi: 52, fileName: 'MartinGM2_052__E3_1.wav' },
  { midi: 55, fileName: 'MartinGM2_055__G3_1.wav' },
  { midi: 58, fileName: 'MartinGM2_058_Bb3_1.wav' },
  { midi: 61, fileName: 'MartinGM2_061_Db4_1.wav' },
  { midi: 64, fileName: 'MartinGM2_064__E4_1.wav' },
  { midi: 68, fileName: 'MartinGM2_068_Ab4_1.wav' },
] as const;

export const SAMPLES = GUITAR_SAMPLES.map(sample => [sample.midi, sample.fileName] as const);
