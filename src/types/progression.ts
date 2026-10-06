import { NoteName, ChordQuality, GuitarVoicing } from './music';

export type VoicingType = 'open' | 'barre' | 'alternative';

export interface ProgressionItem {
  id: string;
  chordName: string;
  root: NoteName;
  quality: ChordQuality;
  degree?: number;
  voicingType?: VoicingType;
  /** Optional playback-only voicing. Studio/storage paths can omit it. */
  playbackVoicing?: GuitarVoicing;
}

export type PlaybackState = 'stopped' | 'playing';

export interface PlaybackStatus {
  state: PlaybackState;
  currentIndex: number;
  currentChord: string | null;
  nextChord: string | null;
  currentBeat: number; // 0..3 (beat in 4/4)
  isLooping: boolean;
}

export interface StoredProgression {
  id: string;
  name: string;
  updatedAt: number;
  key: NoteName;
  isMinorKey?: boolean;
  items: Array<{
    chordName: string;
    root: NoteName;
    quality: ChordQuality;
    voicingType?: VoicingType;
  }>;
  bpm: number;
  rhythmIndex: number;
  capo: number;
}
