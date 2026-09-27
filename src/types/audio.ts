export interface StrumOptions {
  speedSec?: number;
  direction?: 'down' | 'up';
  velocity?: number;
}

export interface AudioEngineStatus {
  isUnlocked: boolean;
  contextState: AudioContextState;
}
