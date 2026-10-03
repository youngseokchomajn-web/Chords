import { NoteName, ChordQuality } from '../types/music';

export const CHROMATIC_NOTES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

export const NOTE_TO_INDEX: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11
};

export const MAJOR_SCALE_OFFSETS = [0, 2, 4, 5, 7, 9, 11];
export const MAJOR_QUALITIES: ChordQuality[] = ['major', 'minor', 'minor', 'major', 'major', 'minor', 'dim'];

export const MINOR_SCALE_OFFSETS = [0, 2, 3, 5, 7, 8, 10];
export const MINOR_QUALITIES: ChordQuality[] = ['minor', 'dim', 'major', 'minor', 'minor', 'major', 'major'];

// Standard Guitar Tuning: 6th string E2 (MIDI 40) ~ 1st string E4 (MIDI 64)
export const STANDARD_TUNING_MIDI: Record<number, number> = {
  6: 40, // E2
  5: 45, // A2
  4: 50, // D3
  3: 55, // G3
  2: 59, // B3
  1: 64  // E4
};

export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function normalizeNoteName(note: string): NoteName {
  const map: Record<string, NoteName> = {
    'Db': 'C#',
    'Eb': 'D#',
    'Gb': 'F#',
    'Ab': 'G#',
    'Bb': 'A#'
  };
  return map[note] || (note as NoteName);
}

export function midiToNoteName(midi: number): string {
  if (midi < 0) return 'Mute';
  const note = CHROMATIC_NOTES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

export function transposeNote(note: NoteName, semitones: number): NoteName {
  const idx = NOTE_TO_INDEX[note] ?? 0;
  const newIdx = (idx + semitones % 12 + 12) % 12;
  return CHROMATIC_NOTES[newIdx];
}

export interface DiatonicChordInfo {
  degree: number;
  root: NoteName;
  quality: ChordQuality;
  chordName: string;
}

export function getDiatonicChords(key: NoteName, isMinor: boolean = false): DiatonicChordInfo[] {
  const keyIdx = NOTE_TO_INDEX[key] ?? 0;
  const offsets = isMinor ? MINOR_SCALE_OFFSETS : MAJOR_SCALE_OFFSETS;
  const qualities = isMinor ? MINOR_QUALITIES : MAJOR_QUALITIES;

  return offsets.map((offset, i) => {
    const rootIdx = (keyIdx + offset) % 12;
    const root = CHROMATIC_NOTES[rootIdx];
    const quality = qualities[i];
    const suffix = quality === 'minor' ? 'm' : quality === 'dim' ? 'dim' : '';
    return {
      degree: i + 1,
      root,
      quality,
      chordName: `${root}${suffix}`
    };
  });
}
