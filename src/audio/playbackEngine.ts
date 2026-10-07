import { GuitarSoundEngine } from './guitarSynth';
import { audioContextManager } from './audioContext';
import { ProgressionItem } from '../types/progression';
import { getChordDefinition } from '../theory/chordBuilder';

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
 * Dedicated Playback and Transport Engine (P1/P2 Engine)
 * Manages timing, rhythmic strumming sequences, generational cancellation, Stop and Loop.
 */
export class PlaybackEngine {
  private static generation = 0;
  private static timerIds: number[] = [];
  private static _isPlaying = false;
  private static _isLooping = false;
  private static _currentIndex = -1;
  private static _paused = false;
  private static _lastPlayback: { items: ProgressionItem[]; rhythm: RhythmPattern; bpm: number; capo: number; chordBeats?: number[]; events: PlaybackEvents } | null = null;

  public static get isPlaying(): boolean {
    return this._isPlaying;
  }

  public static get isLooping(): boolean {
    return this._isLooping;
  }

  public static get currentIndex(): number {
    return this._currentIndex;
  }

  public static setLoop(enabled: boolean): void {
    this._isLooping = enabled;
  }

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

  /**
   * Immediately halts all audio output and cancels all pending playback timers.
   */
  public static stop(): void {
    this.generation++;
    this.clearTimers();
    GuitarSoundEngine.stopAll();
    this._isPlaying = false;
    this._currentIndex = -1;
    this._paused = false;
    this._lastPlayback = null;
  }

  public static pause(): boolean {
    if (!this._isPlaying || !this._lastPlayback) return false;
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
    this._isPlaying = true;
    this._paused = false;
    const currentGen = ++this.generation;
    const startIndex = Math.max(0, Math.min(this._currentIndex, items.length - 1));
    const beatSec = 60 / Math.max(40, Math.min(240, bpm));
    const strokeStepSec = beatSec / 2;
    const startTime = performance.now();

    const scheduleSequence = (fromIndex: number) => {
      if (this.generation !== currentGen || !this._isPlaying) return;
      for (let index = fromIndex; index < items.length; index++) {
        const item = items[index];
        const itemBeats = chordBeats?.[index] ?? 4;
        const nextItem = index < items.length - 1 ? items[index + 1] : this._isLooping ? items[0] : null;
        const elapsedMs = items.slice(fromIndex, index).reduce((sum, _, offset) => sum + (chordBeats?.[fromIndex + offset] ?? 4) * beatSec * 1000, 0);
        this.addTimer(() => {
          if (this.generation !== currentGen || !this._isPlaying) return;
          this._currentIndex = index;
          GuitarSoundEngine.releaseAll(0.045);
          events.onStep?.(index, item.chordName, nextItem ? nextItem.chordName : null);
          const def = getChordDefinition(item.root, item.quality, item.voicingType);
          const frets = this.applyCapo(def.primaryVoicing.frets, capo);
          rhythm.pattern.forEach((stroke, strokeIdx) => {
            const strokeOffsetSec = strokeIdx * strokeStepSec;
            if (strokeOffsetSec >= itemBeats * beatSec) return;
            this.addTimer(() => {
              if (this.generation !== currentGen || !this._isPlaying) return;
              if (strokeIdx % 2 === 0) events.onBeat?.(Math.floor(strokeIdx / 2));
              if (stroke !== 'rest') {
                GuitarSoundEngine.strum(frets, {
                  direction: stroke,
                  speedSec: 0.007,
                  velocity: stroke === 'up' ? 0.82 : 0.95
                });
              }
            }, Math.max(0, elapsedMs + strokeOffsetSec * 1000 - (performance.now() - startTime)));
          });
        }, elapsedMs);
      }
      const remainingMs = items.slice(fromIndex).reduce((sum, _, offset) => sum + (chordBeats?.[fromIndex + offset] ?? 4) * beatSec * 1000, 0);
      this.addTimer(() => {
        if (this.generation !== currentGen || !this._isPlaying) return;
        if (this._isLooping) {
          scheduleSequence(0);
        } else {
          this._isPlaying = false;
          this._currentIndex = -1;
          this._lastPlayback = null;
          events.onFinish?.();
        }
      }, remainingMs);
    };

    audioContextManager.unlockSync();
    scheduleSequence(startIndex);
    return true;
  }

  /**
   * Plays a single chord immediately with user gesture unlock.
   */
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

  /**
   * Starts playing a sequence of progression items with the given rhythm and BPM.
   */
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
    this._lastPlayback = { items, rhythm, bpm, capo, chordBeats, events };
    const currentGen = ++this.generation;

    const ctx = audioContextManager.getContext();
    const beatSec = 60 / Math.max(40, Math.min(240, bpm));
    const strokeStepSec = beatSec / 2;
    const scheduleSequence = () => {
      if (this.generation !== currentGen || !this._isPlaying) return;

      const audioStart = ctx.currentTime + 0.06;
      let elapsedSec = 0;

      items.forEach((item, index) => {
        const nextItem = index < items.length - 1 ? items[index + 1] : loop ? items[0] : null;
        const itemBeats = chordBeats?.[index] ?? 4;
        const chordStart = audioStart + elapsedSec;

        if (index > 0) {
          GuitarSoundEngine.releaseAllAt(chordStart, 0.045);
        }

        const def = getChordDefinition(item.root, item.quality, item.voicingType);
        const frets = this.applyCapo(def.primaryVoicing.frets, capo);

        rhythm.pattern.forEach((stroke, strokeIdx) => {
          const strokeOffsetSec = strokeIdx * strokeStepSec;
          if (strokeOffsetSec >= itemBeats * beatSec || stroke === 'rest') return;
          const when = chordStart + strokeOffsetSec;
          if (strokeIdx % 2 === 0) {
            const beatNumber = Math.floor(strokeIdx / 2);
            const delay = Math.max(0, (when - ctx.currentTime) * 1000);
            this.addTimer(() => {
              if (this.generation === currentGen && this._isPlaying) events.onBeat?.(beatNumber);
            }, delay);
          }
          GuitarSoundEngine.strumAt(frets, when, {
            direction: stroke,
            speedSec: 0.007,
            velocity: stroke === 'up' ? 0.82 : 0.95
          });
        });

        const uiDelay = Math.max(0, (chordStart - ctx.currentTime) * 1000);
        this.addTimer(() => {
          if (this.generation !== currentGen || !this._isPlaying) return;
          this._currentIndex = index;
          events.onStep?.(index, item.chordName, nextItem ? nextItem.chordName : null);
        }, uiDelay);

        elapsedSec += itemBeats * beatSec;
      });

      const totalDurationMs = elapsedSec * 1000;
      this.addTimer(() => {
        if (this.generation !== currentGen || !this._isPlaying) return;

        if (this._isLooping) {
          scheduleSequence();
        } else {
          this._isPlaying = false;
          this._currentIndex = -1;
          this._lastPlayback = null;
          events.onFinish?.();
        }
      }, Math.max(0, totalDurationMs + 60));
    };

    scheduleSequence();
  }

  private static applyCapo(
    frets: [number, number, number, number, number, number],
    capo: number
  ): [number, number, number, number, number, number] {
    if (capo <= 0) return frets;
    return frets.map(f => (f >= 0 ? f + capo : -1)) as [number, number, number, number, number, number];
  }
}
