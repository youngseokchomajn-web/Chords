import { ChordDefinition, ChordQuality, NoteName, GuitarVoicing } from '../types/music';
import { CHROMATIC_NOTES, normalizeNoteName } from './notes';

// Common Open & Handcrafted Voicings: [6th, 5th, 4th, 3rd, 2nd, 1st]
export const CHORD_LIBRARY: Record<string, GuitarVoicing> = {
  // C
  'C_major': { baseFret: 1, frets: [-1, 3, 2, 0, 1, 0], fingers: [0, 3, 2, 0, 1, 0] },
  'C_minor': { baseFret: 3, frets: [-1, 3, 5, 5, 4, 3], barres: [{ fret: 3, fromString: 5, toString: 1 }] },
  'C_7':     { baseFret: 1, frets: [-1, 3, 2, 3, 1, 0], fingers: [0, 3, 2, 4, 1, 0] },
  'C_sus4':  { baseFret: 1, frets: [-1, 3, 3, 0, 1, 1], fingers: [0, 3, 4, 0, 1, 1] },

  // D
  'D_major': { baseFret: 1, frets: [-1, -1, 0, 2, 3, 2], fingers: [0, 0, 0, 1, 3, 2] },
  'D_minor': { baseFret: 1, frets: [-1, -1, 0, 2, 3, 1], fingers: [0, 0, 0, 2, 3, 1] },
  'D_7':     { baseFret: 1, frets: [-1, -1, 0, 2, 1, 2], fingers: [0, 0, 0, 2, 1, 3] },
  'D_sus4':  { baseFret: 1, frets: [-1, -1, 0, 2, 3, 3], fingers: [0, 0, 0, 1, 3, 4] },

  // E
  'E_major': { baseFret: 1, frets: [0, 2, 2, 1, 0, 0], fingers: [0, 2, 3, 1, 0, 0] },
  'E_minor': { baseFret: 1, frets: [0, 2, 2, 0, 0, 0], fingers: [0, 2, 3, 0, 0, 0] },
  'E_7':     { baseFret: 1, frets: [0, 2, 0, 1, 0, 0], fingers: [0, 2, 0, 1, 0, 0] },
  'E_sus4':  { baseFret: 1, frets: [0, 2, 2, 2, 0, 0], fingers: [0, 2, 3, 4, 0, 0] },

  // F
  'F_major': { baseFret: 1, frets: [1, 3, 3, 2, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },
  'F_minor': { baseFret: 1, frets: [1, 3, 3, 1, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },
  'F_7':     { baseFret: 1, frets: [1, 3, 1, 2, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },
  'F_sus4':  { baseFret: 1, frets: [1, 3, 3, 3, 1, 1], barres: [{ fret: 1, fromString: 6, toString: 1 }] },

  // G
  'G_major': { baseFret: 1, frets: [3, 2, 0, 0, 0, 3], fingers: [2, 1, 0, 0, 0, 3] },
  'G_minor': { baseFret: 3, frets: [3, 5, 5, 3, 3, 3], barres: [{ fret: 3, fromString: 6, toString: 1 }] },
  'G_7':     { baseFret: 1, frets: [3, 2, 0, 0, 0, 1], fingers: [3, 2, 0, 0, 0, 1] },
  'G_sus4':  { baseFret: 1, frets: [3, 2, 0, 0, 1, 3], fingers: [3, 2, 0, 0, 1, 4] },

  // A
  'A_major': { baseFret: 1, frets: [-1, 0, 2, 2, 2, 0], fingers: [0, 0, 1, 2, 3, 0] },
  'A_minor': { baseFret: 1, frets: [-1, 0, 2, 2, 1, 0], fingers: [0, 0, 2, 3, 1, 0] },
  'A_7':     { baseFret: 1, frets: [-1, 0, 2, 0, 2, 0], fingers: [0, 0, 2, 0, 3, 0] },
  'A_sus4':  { baseFret: 1, frets: [-1, 0, 2, 2, 3, 0], fingers: [0, 0, 1, 2, 3, 0] },

  // B
  'B_major': { baseFret: 2, frets: [-1, 2, 4, 4, 4, 2], barres: [{ fret: 2, fromString: 5, toString: 1 }] },
  'B_dim':   { baseFret: 1, frets: [-1, 2, 0, 4, 3, 1] },
  'B_minor': { baseFret: 2, frets: [-1, 2, 4, 4, 3, 2], barres: [{ fret: 2, fromString: 5, toString: 1 }] },
  'B_7':     { baseFret: 1, frets: [-1, 2, 1, 2, 0, 2], fingers: [0, 2, 1, 3, 0, 4] },
  'B_sus4':  { baseFret: 2, frets: [-1, 2, 4, 4, 5, 2], barres: [{ fret: 2, fromString: 5, toString: 1 }] }
};

/**
 * CAGED Movable Barre Chord Generator
 * Automatically creates Barre voicings (E-shape on 6th string or A-shape on 5th string)
 */
function generateBarreVoicing(root: NoteName, quality: ChordQuality): GuitarVoicing {
  const normRoot = normalizeNoteName(root);
  const rootIndex = CHROMATIC_NOTES.indexOf(normRoot);

  // E is chromatic index 4 (E, F, F#, G, G#, A, A#, B, C, C#, D, D#)
  const eRootFret = (rootIndex - 4 + 12) % 12;
  // A is chromatic index 9
  const aRootFret = (rootIndex - 9 + 12) % 12;

  // Diminished triads use a dedicated movable A-shape.
  // Shape: x-f-f+1-f+2-f+1-x = 1-b3-b5 on strings 5-2.
  // This must be handled before the generic CAGED switch so it never
  // falls through to the D-major fallback.
  if (quality === 'dim') {
    const f = aRootFret === 0 ? 12 : aRootFret;
    return {
      baseFret: f,
      frets: [-1, f, f + 1, f + 2, f + 1, -1],
    };
  }

  // Prefer the shape that sits lower on the fretboard (between fret 1 and 7)
  const useAshape = (aRootFret > 0 && aRootFret <= 6) || eRootFret > 7;

  if (useAshape) {
    const f = aRootFret;
    switch (quality) {
      case 'major':
        return { baseFret: f, frets: [-1, f, f + 2, f + 2, f + 2, f] };
      case 'minor':
        return { baseFret: f, frets: [-1, f, f + 2, f + 2, f + 1, f] };
      case '7':
        return { baseFret: f, frets: [-1, f, f + 2, f, f + 2, f] };
      case 'sus4':
        return { baseFret: f, frets: [-1, f, f + 2, f + 2, f + 3, f] };
    }
  } else {
    const f = eRootFret;
    switch (quality) {
      case 'major':
        return { baseFret: f, frets: [f, f + 2, f + 2, f + 1, f, f] };
      case 'minor':
        return { baseFret: f, frets: [f, f + 2, f + 2, f, f, f] };
      case '7':
        return { baseFret: f, frets: [f, f + 2, f, f + 1, f, f] };
      case 'sus4':
        return { baseFret: f, frets: [f, f + 2, f + 2, f + 2, f, f] };
    }
  }

  return { baseFret: 1, frets: [-1, -1, 0, 2, 3, 2] };
}

export function getChordDefinition(root: NoteName, quality: ChordQuality): ChordDefinition {
  const normRoot = normalizeNoteName(root);
  const key = `${normRoot}_${quality}`;
  const voicing = CHORD_LIBRARY[key] || generateBarreVoicing(normRoot, quality);

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
    primaryVoicing: voicing
  };
}
