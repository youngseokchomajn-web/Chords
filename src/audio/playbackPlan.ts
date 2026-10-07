import { ProgressionItem } from '../types/progression';

export interface ChordTimelineItem {
  index: number;
  startBeat: number;
  endBeat: number;
  durationBeats: number;
  barIndex: number;
  beatOffsetInBar: number;
}

export interface PlaybackStrumEvent {
  beat: number;
  direction: 'down' | 'up';
  velocity: number;
}

export interface ChordPlaybackPlan {
  index: number;
  startBeat: number;
  endBeat: number;
  durationBeats: number;
  strums: PlaybackStrumEvent[];
}

/**
 * The single source of truth for musical time.
 * startBeat/endBeat are absolute song beats in 4/4.
 */
export function buildChordTimeline(
  items: ProgressionItem[],
  chordBeats?: number[],
): ChordTimelineItem[] {
  let absoluteBeat = 0;

  return items.map((_, index) => {
    const durationBeats = Math.max(0.0001, chordBeats?.[index] ?? 4);
    const startBeat = absoluteBeat;
    const endBeat = startBeat + durationBeats;
    const barIndex = Math.floor(startBeat / 4);
    const beatOffsetInBar = startBeat - barIndex * 4;

    absoluteBeat = endBeat;

    return {
      index,
      startBeat,
      endBeat,
      durationBeats,
      barIndex,
      beatOffsetInBar,
    };
  });
}

/**
 * Converts the musical timeline into deterministic playback events.
 * No Web Audio APIs, timers, or UI state belong here.
 */
export function buildPlaybackPlan(
  items: ProgressionItem[],
  rhythm: { pattern: readonly ('down' | 'up' | 'rest')[] },
  chordBeats?: number[],
): ChordPlaybackPlan[] {
  const timeline = buildChordTimeline(items, chordBeats);
  if (rhythm.pattern.length === 0) return [];

  return timeline.map(t => {
    const strums: PlaybackStrumEvent[] = [];
    const firstSlot = 0;
    const slotCount = Math.ceil(t.durationBeats / 0.5);

    for (let slot = firstSlot; slot < slotCount; slot++) {
      const localBeat = slot * 0.5;
      if (localBeat >= t.durationBeats - 0.000001) continue;

      const beat = t.startBeat + localBeat;
      const patternIndex = Math.floor((beat % 4) / 0.5) % rhythm.pattern.length;
      const stroke = rhythm.pattern[patternIndex];

      if (stroke !== 'rest') {
        strums.push({
          beat,
          direction: stroke,
          velocity: stroke === 'up' ? 0.82 : 0.95,
        });
      }
    }

    return {
      index: t.index,
      startBeat: t.startBeat,
      endBeat: t.endBeat,
      durationBeats: t.durationBeats,
      strums,
    };
  });
}
