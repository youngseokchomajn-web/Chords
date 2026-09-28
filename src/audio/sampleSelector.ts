import { STANDARD_TUNING_MIDI, midiToNoteName } from '../theory/notes';
import { SAMPLES } from './guitarSynth';

export interface SampleSelectionQuery {
  stringNumber: number; // 6 (low E) to 1 (high E)
  fret: number;         // 0 ~ 24, or -1 for muted
  targetMidi: number;
}

export interface SelectedSample {
  sampleMidi: number;
  fileName: string;
  pitchShiftSemitones: number;
  playbackRate: number;
}

export interface StringDiagnostic {
  stringNumber: number;
  fret: number;
  targetMidi: number;
  targetNote: string;
  sampleMidi: number;
  sampleFile: string;
  pitchShiftSemitones: number;
}

export interface ChordDiagnostic {
  chordName: string;
  strings: StringDiagnostic[];
  maxPitchShift: number;
  averagePitchShift: number;
}

/**
 * Phase 2 String/Fret-aware Sample Selector Interface.
 * Currently maps to the nearest available recorded sample in the active library,
 * while preserving stringNumber and fret for future string-specific sound banks (Phase 3).
 */
export function selectSample(query: SampleSelectionQuery): SelectedSample | null {
  if (query.fret < 0 || query.targetMidi < 0) return null;

  // In Phase 2: find closest MIDI in current bank.
  // In Phase 3: string-specific lookup will take precedence.
  const target = SAMPLES.reduce((best, curr) =>
    Math.abs(curr[0] - query.targetMidi) < Math.abs(best[0] - query.targetMidi) ? curr : best
  );

  const shift = query.targetMidi - target[0];
  const playbackRate = Math.pow(2, shift / 12);

  return {
    sampleMidi: target[0],
    fileName: target[1],
    pitchShiftSemitones: shift,
    playbackRate,
  };
}

/**
 * Phase 1 Mapping Diagnostic.
 * Computes exact per-string MIDI, sample choice, and pitch shift for any given chord voicing.
 */
export function getChordDiagnostic(
  chordName: string,
  frets: [number, number, number, number, number, number]
): ChordDiagnostic {
  let totalShift = 0;
  let maxShift = 0;
  let soundingCount = 0;

  const strings: StringDiagnostic[] = frets.map((fret, idx) => {
    const stringNumber = 6 - idx;
    if (fret < 0) {
      return {
        stringNumber,
        fret: -1,
        targetMidi: -1,
        targetNote: 'X (Mute)',
        sampleMidi: -1,
        sampleFile: '-',
        pitchShiftSemitones: 0,
      };
    }

    const targetMidi = STANDARD_TUNING_MIDI[stringNumber] + fret;
    const targetNote = midiToNoteName(targetMidi);
    const selected = selectSample({ stringNumber, fret, targetMidi });

    if (!selected) {
      return {
        stringNumber,
        fret,
        targetMidi,
        targetNote,
        sampleMidi: -1,
        sampleFile: '-',
        pitchShiftSemitones: 0,
      };
    }

    const absShift = Math.abs(selected.pitchShiftSemitones);
    totalShift += absShift;
    if (absShift > maxShift) maxShift = absShift;
    soundingCount++;

    return {
      stringNumber,
      fret,
      targetMidi,
      targetNote,
      sampleMidi: selected.sampleMidi,
      sampleFile: selected.fileName,
      pitchShiftSemitones: selected.pitchShiftSemitones,
    };
  });

  return {
    chordName,
    strings,
    maxPitchShift: maxShift,
    averagePitchShift: soundingCount > 0 ? Number((totalShift / soundingCount).toFixed(2)) : 0,
  };
}
