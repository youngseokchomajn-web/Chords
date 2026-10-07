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
  private static _lastPlayback: { items: ProgressionItem[]; rhythm: RhythmPattern; bpm: number; capo: number; events: PlaybackEvents } | null = null;

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
    const { items, rhythm, bpm, capo, events } = this._lastPlayback;
    this._isPlaying = true;
    this._paused = false;
    const currentGen = ++this.generation;
    const startIndex = Math.max(0, Math.min(this._currentIndex, items.length - 1));
    const beatSec = 60 / Math.max(40, Math.min(240, bpm));
    const chordStepMs = beatSec * 4 * 1000;
    const strokeStepSec = beatSec / 2;

    const scheduleSequence = (fromIndex: number) => {
      if (this.generation !== currentGen || !this._isPlaying) return;
      for (let index = fromIndex; index < items.length; index++) {
        const item = items[index];
        const nextItem = index < items.length - 1 ? items[index + 1] : this._isLooping ? items[0] : null;
        this.addTimer(() => {
          if (this.generation !== currentGen || !this._isPlaying) return;
          this._currentIndex = index;
          GuitarSoundEngine.releaseAll(0.11);
          events.onStep?.(index, item.chordName, nextItem ? nextItem.chordName : null);
          const def = getChordDefinition(item.root, item.quality, item.voicingType);
          const frets = this.applyCapo(def.primaryVoicing.frets, capo);
          rhythm.pattern.forEach((stroke, strokeIdx) => {
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
            }, strokeIdx * strokeStepSec * 1000);
          });
        }, (index - fromIndex) * chordStepMs);
      }
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
      }, (items.length - fromIndex) * chordStepMs);
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
    events: PlaybackEvents = {}
  ): void {
    if (!items || items.length === 0) return;

    this.stop();
    audioContextManager.unlockSync();

    this._isPlaying = true;
    this._isLooping = loop;
    this._paused = false;
    this._lastPlayback = { items, rhythm, bpm, capo, events };
    const currentGen = ++this.generation;

    const beatSec = 60 / Math.max(40, Math.min(240, bpm));
    const chordStepMs = beatSec * 4 * 1000;
    const strokeStepSec = beatSec / 2; // 8th note subdivisions

    const scheduleSequence = () => {
      if (this.generation !== currentGen || !this._isPlaying) return;

      items.forEach((item, index) => {
        const nextItem = index < items.length - 1 ? items[index + 1] : loop ? items[0] : null;

        this.addTimer(() => {
          if (this.generation !== currentGen || !this._isPlaying) return;

          this._currentIndex = index;
          // Keep a short natural tail at musical chord boundaries.
          // Explicit Stop still uses stopAll() above.
          GuitarSoundEngine.releaseAll(0.11);

          events.onStep?.(index, item.chordName, nextItem ? nextItem.chordName : null);

          const def = getChordDefinition(item.root, item.quality, item.voicingType);
          const frets = this.applyCapo(def.primaryVoicing.frets, capo);

          rhythm.pattern.forEach((stroke, strokeIdx) => {
            this.addTimer(() => {
              if (this.generation !== currentGen || !this._isPlaying) return;

              // Beat indicator callback (every 2 eighth notes = 1 quarter beat)
              if (strokeIdx % 2 === 0) {
                events.onBeat?.(Math.floor(strokeIdx / 2));
              }

              if (stroke !== 'rest') {
                GuitarSoundEngine.strum(frets, {
                  direction: stroke,
                  speedSec: 0.007,
                  velocity: stroke === 'up' ? 0.82 : 0.95
                });
              }
            }, strokeIdx * strokeStepSec * 1000);
          });
        }, index * chordStepMs);
      });

      // End of progression sequence
      this.addTimer(() => {
        if (this.generation !== currentGen || !this._isPlaying) return;

        if (this._isLooping) {
          // Continuous Loop
          scheduleSequence();
        } else {
          // Finished
          this._isPlaying = false;
          this._currentIndex = -1;
          events.onFinish?.();
        }
      }, items.length * chordStepMs);
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
