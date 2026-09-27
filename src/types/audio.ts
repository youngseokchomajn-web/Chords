export interface StrumOptions {
  speedSec?: number;      // Delay between strings in seconds (default: 0.035s)
  direction?: 'down' | 'up';
  velocity?: number;      // 0.0 ~ 1.0
}

export interface AudioEngineStatus {
  isUnlocked: boolean;
  contextState: AudioContextState;
}
