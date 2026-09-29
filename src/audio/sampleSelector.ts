import { STANDARD_TUNING_MIDI, midiToNoteName } from '../theory/notes';
import { GuitarSample, GUITAR_SAMPLES } from './sampleCatalog';

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
  sourceStringNumber?: number;
  sourceFret?: number;
  selectionReason: 'same-string-nearest-fret' | 'metadata-pitch-nearest' | 'midi-nearest';
  selectionScore: number;
}

export interface StringDiagnostic {
  stringNumber: number;
  fret: number;
  targetMidi: number;
  targetNote: string;
  sampleMidi: number;
  sampleFile: string;
  pitchShiftSemitones: number;
  sourceStringNumber?: number;
  sourceFret?: number;
  selectionReason?: SelectedSample['selectionReason'];
  selectionScore?: number;
}

export interface ChordDiagnostic {
  chordName: string;
  strings: StringDiagnostic[];
  maxPitchShift: number;
  averagePitchShift: number;
}

function abs(value: number): number {
  return Math.abs(value);
}

/**
 * Deterministic String/Fret-aware selector.
 *
 * Verified position metadata is preferred over raw MIDI proximity:
 * 1. same string
 * 2. nearby fret on that string
 * 3. small pitch shift
 * 4. MIDI distance
 *
 * The current Martin bank has no verified string/fret metadata, so it safely
 * falls back to the previous MIDI-nearest behavior. No physical position is
 * guessed from the sample filename.
 */
export function selectSample(query: SampleSelectionQuery): SelectedSample | null {
  if (query.fret < 0 || query.targetMidi < 0 || GUITAR_SAMPLES.length === 0) return null;

  const withPosition = GUITAR_SAMPLES.filter(
    sample => sample.stringNumber !== undefined && sample.fret !== undefined,
  );

  if (withPosition.length > 0) {
    const sameString = withPosition.filter(sample => sample.stringNumber === query.stringNumber);

    if (sameString.length > 0) {
      const target = [...sameString].sort((a, b) => {
        const fretDiff = abs((a.fret ?? 0) - query.fret) - abs((b.fret ?? 0) - query.fret);
        if (fretDiff !== 0) return fretDiff;
        const shiftDiff = abs(a.midi - query.targetMidi) - abs(b.midi - query.targetMidi);
        if (shiftDiff !== 0) return shiftDiff;
        return a.midi - b.midi;
      })[0];
      return makeSelection(target, query, 'same-string-nearest-fret',
        abs((target.fret ?? 0) - query.fret) * 100 + abs(target.midi - query.targetMidi));
    }

    const target = [...withPosition].sort((a, b) => {
      const shiftDiff = abs(a.midi - query.targetMidi) - abs(b.midi - query.targetMidi);
      if (shiftDiff !== 0) return shiftDiff;
      return a.midi - b.midi;
    })[0];
    return makeSelection(target, query, 'metadata-pitch-nearest', abs(target.midi - query.targetMidi));
  }

  const target = [...GUITAR_SAMPLES].sort((a, b) => {
    const diff = abs(a.midi - query.targetMidi) - abs(b.midi - query.targetMidi);
    if (diff !== 0) return diff;
    return a.midi - b.midi;
  })[0];

  return makeSelection(target, query, 'midi-nearest', abs(target.midi - query.targetMidi));
}

function makeSelection(
  sample: GuitarSample,
  query: SampleSelectionQuery,
  selectionReason: SelectedSample['selectionReason'],
  selectionScore: number,
): SelectedSample {
  const shift = query.targetMidi - sample.midi;
  return {
    sampleMidi: sample.midi,
    fileName: sample.fileName,
    pitchShiftSemitones: shift,
    playbackRate: Math.pow(2, shift / 12),
    sourceStringNumber: sample.stringNumber,
    sourceFret: sample.fret,
    selectionReason,
    selectionScore,
  };
}

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

    const absShift = abs(selected.pitchShiftSemitones);
    totalShift += absShift;
    maxShift = Math.max(maxShift, absShift);
    soundingCount++;

    return {
      stringNumber,
      fret,
      targetMidi,
      targetNote,
      sampleMidi: selected.sampleMidi,
      sampleFile: selected.fileName,
      pitchShiftSemitones: selected.pitchShiftSemitones,
      sourceStringNumber: selected.sourceStringNumber,
      sourceFret: selected.sourceFret,
      selectionReason: selected.selectionReason,
      selectionScore: selected.selectionScore,
    };
  });

  return {
    chordName,
    strings,
    maxPitchShift: maxShift,
    averagePitchShift: soundingCount > 0 ? Number((totalShift / soundingCount).toFixed(2)) : 0,
  };
}
