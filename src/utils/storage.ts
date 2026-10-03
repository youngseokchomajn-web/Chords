import { StoredProgression, ProgressionItem, VoicingType } from '../types/progression';
import { NoteName, ChordQuality } from '../types/music';

const STORAGE_KEY = 'chords_v2_saved_progressions';

export function loadSavedProgressions(): StoredProgression[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProgressionToLocal(prog: StoredProgression): void {
  try {
    const list = loadSavedProgressions().filter(p => p.id !== prog.id);
    list.unshift(prog);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 30)));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function deleteSavedProgression(id: string): StoredProgression[] {
  try {
    const list = loadSavedProgressions().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  } catch {
    return [];
  }
}

export function buildShareUrl(params: {
  key: NoteName;
  isMinor: boolean;
  items: ProgressionItem[];
  bpm: number;
  rhythmIndex: number;
  capo: number;
}): string {
  const chordsStr = params.items
    .map(it => `${it.root}:${it.quality}${it.voicingType ? `:${it.voicingType}` : ''}`)
    .join(';');
  const query = new URLSearchParams({
    k: params.key,
    m: params.isMinor ? '1' : '0',
    p: chordsStr,
    bpm: String(params.bpm),
    r: String(params.rhythmIndex),
    c: String(params.capo),
  });
  return `${window.location.origin}${window.location.pathname}?${query.toString()}`;
}

export function parseShareUrl(): {
  key?: NoteName;
  isMinor?: boolean;
  items?: ProgressionItem[];
  bpm?: number;
  rhythmIndex?: number;
  capo?: number;
} | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const k = params.get('k') as NoteName | null;
    if (!k) return null;

    const m = params.get('m') === '1';
    const bpm = Number(params.get('bpm')) || 90;
    const r = Number(params.get('r')) || 1;
    const c = Number(params.get('c')) || 0;
    const p = params.get('p');

    const items: ProgressionItem[] = [];
    if (p) {
      p.split(';').forEach((token, idx) => {
        const [root, quality, voicingType] = token.split(':') as [NoteName, ChordQuality, VoicingType | undefined];
        if (root && quality) {
          items.push({
            id: `share_${Date.now()}_${idx}`,
            chordName: `${root}${quality === 'minor' ? 'm' : quality === 'major' ? '' : quality}`,
            root,
            quality,
            voicingType,
          });
        }
      });
    }

    return { key: k, isMinor: m, items, bpm, rhythmIndex: r, capo: c };
  } catch {
    return null;
  }
}
