import { NoteName } from '../types/music';

export const CHROMATIC_NOTES: NoteName[] = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'
];

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
