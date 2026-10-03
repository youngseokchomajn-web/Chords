import { ChordDefinition, ChordQuality, NoteName, GuitarVoicing } from '../types/music';
import { VoicingType } from '../types/progression';
import { CHROMATIC_NOTES, normalizeNoteName } from './notes';

// Handcrafted Open / Common Voicings: [6th, 5th, 4th, 3rd, 2nd, 1st]
export const CHORD_LIBRARY: Record<string, GuitarVoicing> = {
  // C
  'C_major': { baseFret: 1, frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'C_minor': { baseFret: 3, frets: [-1, 3, 5, 5, 4, 3], barres: [{ fret: 3, fromString: 5, toString: 1 }] },
  'C_7':     { baseFret: 1, frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  'C_maj7':  { baseFret: 1, frets: [-1, 3, 2, 0, 0, 0], fingers: [0, 3, 2, 0, 0, 0] },
  'C_m7':    { baseFret: 3, frets: [-1, 3, 5, 3, 4, 3], barres: [{ fret: 3, fromString: 5, toString: 1 }] },
  'C_sus2':  { baseFret: 1, frets: [-1, 3, 0, 0, 1, 0], fingers: [0, 3, 0, 0, 1, 0] },
  'C_sus4':  { baseFret: 1, frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },
  'C_add9':  { baseFret: 1, frets: [-1, 3, 2, 0, 3, 0], fingers: [0, 2, 1, 0, 4, 0] },
  'C_dim':   { baseFret: 1, frets: [-1, 3, 4, 2, 4, -1] },
  'C_aug':   { baseFret: 1, frets: [-1, 3, 2, 1, 1, 0] },

  // D
  'D_major': { baseFret: 1, frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  'D_minor': { baseFret: 1, frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  'D_7':     { baseFret: 1, frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  'D_maj7':  { baseFret: 1, frets: [-1, -1, 0, 2, 2, 2], fingers: [0, 0, 0, 1, 2, 3] },
  'D_m7':    { baseFret: 1, frets: [-1, -1, 0, 2, 1, 1], fingers: [0, 0, 0, 2, 1, 1] },
  'D_sus2':  { baseFret: 1, frets: [-1, -1, 0, 2, 3, 0], fingers: [0, 0, 0, 1, 2, 0] },
  'D_sus4':  { baseFret: 1, frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },
  'D_add9':  { baseFret: 1, frets: [-1, -1, 0, 2, 3, 0] },
  'D_dim':   { baseFret: 1, frets: [-1, -1, 0, 1, 3, 1] },
  'D_aug':   { baseFret: 1, frets: [-1, -1, 0, 3, 3, 2] },

  // E
  'E_major': { baseFret: 1, frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  'E_minor': { baseFret: 1, frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  'E_7':     { baseFret: 1, frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  'E_maj7':  { baseFret: 1, frets: [0, 2, 1, 1, 0, 0] },
  'E_m7':    { baseFret: 1, frets: [0, 2, 2, 0, 3, 0] },
  'E_sus2':  { baseFret: 1, frets: [0, 2, 4, 4, 0, 0] },
  'E_sus4':  { baseFret: 1, frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0] },
  'E_add9':  { baseFret: 1, frets: [0, 2, 2, 1, 0, 2] },
  'E_dim':   { baseFret: 1, frets: [-1, -1, 2, 3, 2, 3] },
  'E_aug':   { baseFret: 1, frets: [0, 3, 2, 1, 1, 0] },

  // F
  'F_major': { baseFret: 1, frets: [1, 3, 3, 2, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },
  'F_minor': { baseFret: 1, frets: [1, 3, 3, 1, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },
  'F_7':     { baseFret: 1, frets: [1, 3, 1, 2, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },
  'F_maj7':  { baseFret: 1, frets: [-1, -1, 3, 2, 1, 0], fingers: [0, 0, 3, 2, 1, 0] },
  'F_m7':    { baseFret: 1, frets: [1, 3, 1, 1, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },
  'F_sus2':  { baseFret: 1, frets: [-1, -1, 3, 0, 1, 1] },
  'F_sus4':  { baseFret: 1, frets: [1, 3, 3, 3, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },

  // G
  'G_major': { baseFret: 1, frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  'G_minor': { baseFret: 3, frets: [3, 5, 5, 3, 3, 3], barres: [{ fret: 3, fromString: 6, toString: 1 }] },
  'G_7':     { baseFret: 1, frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  'G_maj7':  { baseFret: 1, frets: [3, 2, 0, 0, 0, 2] },
  'G_m7':    { baseFret: 3, frets: [3, 5, 3, 3, 3, 3], barres: [{ fret: 3, fromString: 6, toString: 1 }] },
  'G_sus2':  { baseFret: 1, frets: [3, 0, 0, 0, 3, 3] },
  'G_sus4':  { baseFret: 1, frets: [3, 2, 0, 0, 1, 3], fingers: [3, 2, 0, 0, 1, 4] },
  'G_add9':  { baseFret: 1, frets: [3, 2, 0, 2, 0, 3] },

  // A
  'A_major': { baseFret: 1, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'A_minor': { baseFret: 1, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  'A_7':     { baseFret: 1, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  'A_maj7':  { baseFret: 1, frets: [-1, 0, 2, 1, 2, 0], fingers: [0, 0, 2, 1, 3, 0] },
  'A_m7':    { baseFret: 1, frets: [-1, 0, 2, 0, 1, 0], fingers: [0, 0, 2, 0, 1, 0] },
  'A_sus2':  { baseFret: 1, frets: [-1, 0, 2, 2, 0, 0], fingers: [0, 0, 1, 2, 0, 0] },
  'A_sus4':  { baseFret: 1, frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'A_add9':  { baseFret: 1, frets: [-1, 0, 2, 4, 2, 0] },

  // B
  'B_major': { baseFret: 2, frets: [-1, 2, 4, 4, 4, 2], barres: [{ fret: 2, fromString: 5, toString: 1 }] },
  'B_minor': { baseFret: 2, frets: [-1, 2, 4, 4, 3, 2], barres: [{ fret: 2, fromString: 5, toString: 1 }] },
  'B_7':     { baseFret: 1, frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  'B_maj7':  { baseFret: 2, frets: [-1, 2, 4, 3, 4, 2], barres: [{ fret: 2, fromString: 5, toString: 1 }] },
  'B_m7':    { baseFret: 2, frets: [-1, 2, 4, 2, 3, 2], barres: [{ fret: 2, fromString: 5, toString: 1 }] },
  'B_sus4':  { baseFret: 2, frets: [-1, 2, 4, 4, 5, 2], barres: [{ fret: 2, fromString: 5, toString: 1 }] }
};

/**
 * Movable Barre Chord Generator (E-shape on 6th string or A-shape on 5th string)
 */
export function generateBarreVoicing(root: NoteName, quality: ChordQuality, shape: 'E' | 'A' = 'E'): GuitarVoicing {
  const normRoot = normalizeNoteName(root);
  const rootIndex = CHROMATIC_NOTES.indexOf(normRoot);

  const eRootFret = (rootIndex - 4 + 12) % 12; // E is index 4
  const aRootFret = (rootIndex - 9 + 12) % 12; // A is index 9

  if (quality === 'dim') {
    if (normRoot === 'E') {
      const f = aRootFret === 0 ? 12 : aRootFret;
      return { baseFret: f, frets: [-1, f, f + 1, f + 2, f + 1, -1] };
    }
    const f = eRootFret === 0 ? 12 : eRootFret;
    return { baseFret: f, frets: [f, f + 1, f + 2, f, -1, f] };
  }

  if (shape === 'A') {
    const f = aRootFret === 0 ? 12 : aRootFret;
    switch (quality) {
      case 'major': return { baseFret: f, frets: [-1, f, f + 2, f + 2, f + 2, f] };
      case 'minor': return { baseFret: f, frets: [-1, f, f + 2, f + 2, f + 1, f] };
      case '7':     return { baseFret: f, frets: [-1, f, f + 2, f, f + 2, f] };
      case 'maj7':  return { baseFret: f, frets: [-1, f, f + 2, f + 1, f + 2, f] };
      case 'm7':    return { baseFret: f, frets: [-1, f, f + 2, f, f + 1, f] };
      case 'sus2':  return { baseFret: f, frets: [-1, f, f + 2, f + 2, f, f] };
      case 'sus4':  return { baseFret: f, frets: [-1, f, f + 2, f + 2, f + 3, f] };
      default:      return { baseFret: f, frets: [-1, f, f + 2, f + 2, f + 2, f] };
    }
  } else {
    const f = eRootFret === 0 ? 12 : eRootFret;
    switch (quality) {
      case 'major': return { baseFret: f, frets: [f, f + 2, f + 2, f + 1, f, f] };
      case 'minor': return { baseFret: f, frets: [f, f + 2, f + 2, f, f, f] };
      case '7':     return { baseFret: f, frets: [f, f + 2, f, f + 1, f, f] };
      case 'maj7':  return { baseFret: f, frets: [f, f + 2, f + 1, f + 1, f, f] };
      case 'm7':    return { baseFret: f, frets: [f, f + 2, f, f, f, f] };
      case 'sus2':  return { baseFret: f, frets: [f, f + 2, f + 2, f, f + 2, f] };
      case 'sus4':  return { baseFret: f, frets: [f, f + 2, f + 2, f + 2, f, f] };
      default:      return { baseFret: f, frets: [f, f + 2, f + 2, f + 1, f, f] };
    }
  }
}

export interface AvailableVoicingOption {
  type: VoicingType;
  label: string;
  voicing: GuitarVoicing;
}

export function getAvailableVoicings(root: NoteName, quality: ChordQuality): AvailableVoicingOption[] {
  const normRoot = normalizeNoteName(root);
  const openKey = `${normRoot}_${quality}`;
  const openVoicing = CHORD_LIBRARY[openKey];

  const results: AvailableVoicingOption[] = [];

  if (openVoicing) {
    results.push({ type: 'open', label: 'Open', voicing: openVoicing });
  }

  // Barre Voicings (E-Shape and A-Shape)
  const eBarre = generateBarreVoicing(normRoot, quality, 'E');
  const aBarre = generateBarreVoicing(normRoot, quality, 'A');

  if (results.length === 0) {
    // If no open voicing, first barre is primary
    const primaryBarre = (aBarre.baseFret > 0 && aBarre.baseFret <= 7) ? aBarre : eBarre;
    const secondaryBarre = primaryBarre === aBarre ? eBarre : aBarre;
    results.push({ type: 'barre', label: `${primaryBarre.baseFret}fr Barre`, voicing: primaryBarre });
    results.push({ type: 'alternative', label: `${secondaryBarre.baseFret}fr Alt`, voicing: secondaryBarre });
  } else {
    results.push({ type: 'barre', label: `${eBarre.baseFret}fr E-Shape`, voicing: eBarre });
    results.push({ type: 'alternative', label: `${aBarre.baseFret}fr A-Shape`, voicing: aBarre });
  }

  return results;
}

export function getChordDefinition(
  root: NoteName,
  quality: ChordQuality,
  requestedVoicingType?: VoicingType
): ChordDefinition {
  const normRoot = normalizeNoteName(root);
  const options = getAvailableVoicings(normRoot, quality);
  const match = requestedVoicingType
    ? options.find(o => o.type === requestedVoicingType) || options[0]
    : options[0];

  const qualityNameMap: Record<ChordQuality, string> = {
    major: '',
    minor: 'm',
    '7': '7',
    sus4: 'sus4',
    maj7: 'maj7',
    m7: 'm7',
    sus2: 'sus2',
    dim: 'dim',
    aug: 'aug',
    add9: 'add9',
    m7b5: 'm7b5'
  };

  const displayName = `${root}${qualityNameMap[quality] ?? quality}`;

  const intervalMap: Record<ChordQuality, number[]> = {
    major: [0, 4, 7],
    minor: [0, 3, 7],
    '7': [0, 4, 7, 10],
    sus4: [0, 5, 7],
    maj7: [0, 4, 7, 11],
    m7: [0, 3, 7, 10],
    sus2: [0, 2, 7],
    dim: [0, 3, 6],
    aug: [0, 4, 8],
    add9: [0, 4, 7, 14],
    m7b5: [0, 3, 6, 10]
  };

  return {
    root,
    quality,
    displayName,
    intervals: intervalMap[quality] || [0, 4, 7],
    notes: [root],
    primaryVoicing: match.voicing,
    alternativeVoicings: options.map(o => o.voicing)
  };
}
