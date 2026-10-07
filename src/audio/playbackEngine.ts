import { GuitarSoundEngine } from './guitarSynth';
import { audioContextManager } from './audioContext';
import { ProgressionItem } from '../types/progression';
import { getChordDefinition } from '../theory/chordBuilder';
import { buildPlaybackPlan } from './playbackPlan';

export { buildChordTimeline } from './playbackPlan';
export type { ChordTimelineItem } from './playbackPlan';

export interface RhythmPattern {
  label: string;
  pattern: readonly ('down' | 'up' | 'rest')[];
}

export interface PlaybackEvents {
  onStep?: (index: number, currentChord: string, nextChord: string | null) => void;
  onBeat?: (beatNumber: number) => void;
  onFinish?: () => void;
  onStop?: () => void;
}

/**
 * Dedicated transport engine.
 *
 * Musical time is produced once by playbackPlan.ts. This class only converts
 * that deterministic plan into Web Audio clock times and UI callbacks.
 */
export class PlaybackEngine {
  private static generation = 0;
  private static timerIds: number[] = [];
  private static _isPlaying = false;
  private static _isLooping = false;
  private static _currentIndex = -1;
  private static _paused = false;
  private static _pauseBeat = 0;
  private static _playbackStartedAt = 0;
  private static _lastPlayback: {
    items: ProgressionItem[];
    rhythm: RhythmPattern;
    bpm: number;
    capo: number;
    chordBeats?: number[];
    events: PlaybackEvents;
  } | null = null;

  public static get isPlaying(): boolean { return this._isPlaying; }
  public static get isLooping(): boolean { return this._isLooping; }
  public static get currentIndex(): number { return this._currentIndex; }

  public static setLoop(enabled: boolean): void { this._isLooping = enabled; }

  public static toggleLoop(): boolean {
    this._isLooping = !this._isLooping;
    return this._isLooping;
  }

  private static clearTimers(): void {
    this.timerIds.forEach(id => window.clearTimeout(id));
    this.timerIds = [];
  }

  private static addTimer(cb: () => void, delayMs: number): void {
    const id = window.setTimeout(() => {
      this.timerIds = this.timerIds.filter(t => t !== id);
      cb();
    }, delayMs);
    this.timerIds.push(id);
  }

  public static stop(): void {
    this.generation++;
    this.clearTimers();
    GuitarSoundEngine.stopAll();
    this._isPlaying = false;
    this._currentIndex = -1;
    this._paused = false;
    this._pauseBeat = 0;
    this._playbackStartedAt = 0;
    this._lastPlayback = null;
  }

  public static pause(): boolean {
    if (!this._isPlaying || !this._lastPlayback) return false;

    const { bpm } = this._lastPlayback;
    const beatSec = 60 / Math.max(40, Math.min(240, bpm));
    const elapsedBeats = (performance.now() - this._playbackStartedAt) / 1000 / beatSec;

    this._pauseBeat = Math.max(0, elapsedBeats);
    this.generation++;
    this.clearTimers();
    GuitarSoundEngine.releaseAll(0.08);
    this._isPlaying = false;
    this._paused = true;
    return true;
  }

  public static resume(): boolean {
    if (!this._paused || !this._lastPlayback) return false;

    const { items, rhythm, bpm, capo, chordBeats, events } = this._lastPlayback;
    const startBeat = this._pauseBeat;

    this._isPlaying = true;
    this._paused = false;
    this._playbackStartedAt =
      performance.now() - startBeat * (60 / Math.max(40, Math.min(240, bpm))) * 1000;

    const currentGen = ++this.generation;
    audioContextManager.unlockSync();
    this.scheduleFromBeat(items, rhythm, bpm, capo, chordBeats, events, startBeat, currentGen);
    return true;
  }

  public static playSingleChord(
    item: ProgressionItem,
    capo: number = 0,
    direction: 'down' | 'up' = 'down'
  ): void {
    this.stop();
    audioContextManager.unlockSync();

    const def = getChordDefinition(item.root, item.quality, item.voicingType);
    const frets = this.applyCapo(item.playbackVoicing?.frets ?? def.primaryVoicing.frets, capo);
    GuitarSoundEngine.strum(frets, { speedSec: 0.007, direction });
  }

  public static playProgression(
    items: ProgressionItem[],
    rhythm: RhythmPattern,
    bpm: number,
    capo: number = 0,
    loop: boolean = this._isLooping,
    chordBeats?: number[],
    events: PlaybackEvents = {}
  ): void {
    if (!items || items.length === 0) return;

    this.stop();
    audioContextManager.unlockSync();

    this._isPlaying = true;
    this._isLooping = loop;
    this._paused = false;
    this._pauseBeat = 0;
    this._lastPlayback = { items, rhythm, bpm, capo, chordBeats, events };
    this._playbackStartedAt = performance.now();

    const currentGen = ++this.generation;
    this.scheduleFromBeat(items, rhythm, bpm, capo, chordBeats, events, 0, currentGen);
  }

  private static scheduleFromBeat(
    items: ProgressionItem[],
    rhythm: RhythmPattern,
    bpm: number,
    capo: number,
    chordBeats: number[] | undefined,
    events: PlaybackEvents,
    startBeat: number,
    currentGen: number
  ): void {
    if (this.generation !== currentGen || !this._isPlaying) return;

    const ctx = audioContextManager.getContext();
    const beatSec = 60 / Math.max(40, Math.min(240, bpm));
    const plan = buildPlaybackPlan(items, rhythm, chordBeats);
    const totalBeats = plan.length > 0 ? plan[plan.length - 1].endBeat : 0;

    if (totalBeats <= startBeat + 0.0001) {
      if (this._isLooping) {
        this._playbackStartedAt = performance.now();
        this.scheduleFromBeat(items, rhythm, bpm, capo, chordBeats, events, 0, currentGen);
      } else {
        this._isPlaying = false;
        this._currentIndex = -1;
        this._lastPlayback = null;
        events.onFinish?.();
      }
      return;
    }

    const audioStart = ctx.currentTime + 0.06;

    const currentPlan = plan.find(
      chord => chord.startBeat <= startBeat + 0.000001 && startBeat < chord.endBeat - 0.000001
    );

    if (currentPlan) {
      const item = items[currentPlan.index];
      const nextItem = currentPlan.index < items.length - 1
        ? items[currentPlan.index + 1]
        : this._isLooping ? items[0] : null;
      this._currentIndex = currentPlan.index;
      events.onStep?.(currentPlan.index, item.chordName, nextItem ? nextItem.chordName : null);
    }

    for (const chord of plan) {
      if (chord.endBeat <= startBeat || chord.startBeat >= totalBeats) continue;

      const item = items[chord.index];
      const nextItem = chord.index < items.length - 1
        ? items[chord.index + 1]
        : this._isLooping ? items[0] : null;
      const def = getChordDefinition(item.root, item.quality, item.voicingType);
      const frets = this.applyCapo(def.primaryVoicing.frets, capo);
      const groupId = `${currentGen}:chord:${chord.index}`;

      if (chord.startBeat >= startBeat) {
        const when = audioStart + (chord.startBeat - startBeat) * beatSec;
        this.addTimer(() => {
          if (this.generation !== currentGen || !this._isPlaying) return;
          this._currentIndex = chord.index;
          events.onStep?.(chord.index, item.chordName, nextItem ? nextItem.chordName : null);
        }, Math.max(0, (when - ctx.currentTime) * 1000));
      }

      for (const strum of chord.strums) {
        if (strum.beat < startBeat - 0.000001) continue;

        const when = audioStart + (strum.beat - startBeat) * beatSec;
        GuitarSoundEngine.strumAt(frets, when, {
          direction: strum.direction,
          speedSec: 0.007,
          velocity: strum.velocity,
        }, groupId);

        if (Math.abs(strum.beat - Math.round(strum.beat)) < 0.000001) {
          const beatNumber = Math.floor(strum.beat % 4);
          this.addTimer(() => {
            if (this.generation === currentGen && this._isPlaying) {
              events.onBeat?.(beatNumber);
            }
          }, Math.max(0, (when - ctx.currentTime) * 1000));
        }
      }

      // Every voice scheduled for this chord belongs to this group. Its gain
      // reaches silence exactly at the chord boundary before the next chord.
      const endWhen = audioStart + (chord.endBeat - startBeat) * beatSec;
      GuitarSoundEngine.releaseGroupAt(groupId, endWhen);
    }

    const remainingBeats = totalBeats - startBeat;
    this.addTimer(() => {
      if (this.generation !== currentGen || !this._isPlaying) return;

      if (this._isLooping) {
        this._playbackStartedAt = performance.now();
        this.scheduleFromBeat(items, rhythm, bpm, capo, chordBeats, events, 0, currentGen);
      } else {
        this._isPlaying = false;
        this._currentIndex = -1;
        this._lastPlayback = null;
        events.onFinish?.();
      }
    }, Math.max(0, remainingBeats * beatSec * 1000 + 60));
  }

  private static applyCapo(
    frets: [number, number, number, number, number, number],
    capo: number
  ): [number, number, number, number, number, number] {
    if (capo <= 0) return frets;
    return frets.map(f => (f >= 0 ? f + capo : -1)) as [number, number, number, number, number, number];
  }
}
