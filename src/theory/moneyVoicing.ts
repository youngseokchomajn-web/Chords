import { GuitarVoicing, ChordQuality, NoteName } from '../types/music';
import { getAvailableVoicings } from './chordBuilder';
import { CHROMATIC_NOTES, STANDARD_TUNING_MIDI, normalizeNoteName } from './notes';

interface Candidate {
  voicing: GuitarVoicing;
  score: number;
}

const INTERVALS: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  '7': [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  add9: [0, 4, 7, 14],
  m7b5: [0, 3, 6, 10],
};

function soundingMidis(voicing: GuitarVoicing): number[] {
  return voicing.frets
    .map((fret, index) => fret >= 0 ? STANDARD_TUNING_MIDI[index] + fret : -1)
    .filter(midi => midi >= 0);
}

function pitchClasses(voicing: GuitarVoicing): number[] {
  return soundingMidis(voicing).map(midi => midi % 12);
}

function hasRequiredTones(
  voicing: GuitarVoicing,
  root: NoteName,
  quality: ChordQuality,
): boolean {
  const rootPc = CHROMATIC_NOTES.indexOf(normalizeNoteName(root));
  const pcs = new Set(pitchClasses(voicing));
  return (INTERVALS[quality] || [0, 4, 7]).every(interval => pcs.has((rootPc + interval) % 12));
}

function movementCost(previous: GuitarVoicing | undefined, current: GuitarVoicing): number {
  if (!previous) return 0;

  let cost = 0;
  for (let i = 0; i < 6; i++) {
    const a = previous.frets[i];
    const b = current.frets[i];
    if (a < 0 && b < 0) continue;
    if (a < 0 || b < 0) {
      cost += 3;
      continue;
    }
    cost += Math.min(Math.abs(a - b), 7);
  }
  return cost;
}

function voicingQuality(voicing: GuitarVoicing): number {
  const sounding = soundingMidis(voicing);
  if (sounding.length === 0) return 999;

  const fretted = voicing.frets.filter(f => f > 0);
  const minFret = fretted.length ? Math.min(...fretted) : 0;
  const maxFret = fretted.length ? Math.max(...fretted) : 0;
  const span = maxFret - minFret;

  // Prefer comfortable, familiar guitar registers without forcing open chords.
  let score = minFret * 0.7;
  score += Math.max(0, minFret - 7) * 2;
  score += Math.max(0, span - 5) * 1.5;

  // Six-string voicings are useful for the default down/up strum.
  score += Math.max(0, 4 - sounding.length) * 2;

  return score;
}

function candidateScore(
  voicing: GuitarVoicing,
  root: NoteName,
  quality: ChordQuality,
  previous?: GuitarVoicing,
): number {
  if (!hasRequiredTones(voicing, root, quality)) return 1000;

  const midis = soundingMidis(voicing);
  const rootPc = CHROMATIC_NOTES.indexOf(normalizeNoteName(root));
  const bassPc = midis[0] % 12;

  let score = voicingQuality(voicing);
  score += movementCost(previous, voicing) * 2.2;

  // Bass root is strongly preferred for the stable "money chord" sound.
  if (bassPc !== rootPc) score += 4;

  // Keep the overall register reasonably centered.
  const range = Math.max(...midis) - Math.min(...midis);
  score += Math.max(0, range - 24) * 0.35;

  // Reward shared pitch classes between adjacent chords.
  if (previous) {
    const previousPcs = new Set(pitchClasses(previous));
    const currentPcs = new Set(pitchClasses(voicing));
    let shared = 0;
    currentPcs.forEach(pc => { if (previousPcs.has(pc)) shared++; });
    score -= shared * 2.5;
  }

  return score;
}

/**
 * Simple Mode only:
 * choose a guitar voicing that makes common pop progressions sound
 * smoother and more consistent than simply taking the first available shape.
 *
 * Studio Mode continues to use the normal chord-library selection.
 */
export function selectMoneyVoicings(
  items: Array<{ root: NoteName; quality: ChordQuality }>,
): GuitarVoicing[] {
  let previous: GuitarVoicing | undefined;

  return items.map(item => {
    const options = getAvailableVoicings(item.root, item.quality);
    const candidates: Candidate[] = options.map(option => ({
      voicing: option.voicing,
      score: candidateScore(option.voicing, item.root, item.quality, previous),
    }));

    candidates.sort((a, b) => a.score - b.score);
    const selected = candidates[0]?.voicing || options[0]?.voicing;

    if (!selected) {
      throw new Error(`No playable guitar voicing for ${item.root} ${item.quality}`);
    }

    previous = selected;
    return selected;
  });
}
