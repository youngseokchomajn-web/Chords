export type NoteName = 
  | 'C' | 'C#' | 'Db' | 'D' | 'D#' | 'Eb' 
  | 'E' | 'F' | 'F#' | 'Gb' | 'G' | 'G#' | 'Ab' 
  | 'A' | 'A#' | 'Bb' | 'B';

export type ChordQuality = 
  | 'major' | 'minor' | '7' | 'maj7' | 'm7' 
  | 'sus4' | 'sus2' | 'dim' | 'aug' | 'add9' | 'm7b5';

export type GuitarStringIndex = 1 | 2 | 3 | 4 | 5 | 6;

// -1: Mute (X), 0: Open (O), 1~24: Fret number
export type FretNumber = number;

export interface GuitarVoicing {
  baseFret: number;
  frets: [FretNumber, FretNumber, FretNumber, FretNumber, FretNumber, FretNumber]; // [6, 5, 4, 3, 2, 1] strings
  fingers?: [number, number, number, number, number, number]; // 0: None, 1: Index, 2: Middle, 3: Ring, 4: Pinky, 5: Thumb
  barres?: { fret: number; fromString: GuitarStringIndex; toString: GuitarStringIndex }[];
}

export interface ChordDefinition {
  root: NoteName;
  quality: ChordQuality;
  displayName: string;
  intervals: number[];
  notes: NoteName[];
  primaryVoicing: GuitarVoicing;
  alternativeVoicings?: GuitarVoicing[];
}
