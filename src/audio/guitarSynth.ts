import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI, midiToFrequency } from '../theory/notes';
import { StrumOptions } from '../types/audio';

export class GuitarSoundEngine {
  public static playString(stringIdx: number, fret: number, startTimeOffset: number = 0, velocity: number = 0.8) {
    if (fret < 0) return;

    const ctx = audioContextManager.getContext();
    const now = ctx.currentTime + startTimeOffset;
    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    const freq = midiToFrequency(midi);

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(freq * 5, now);
    filter.frequency.exponentialRampToValueAtTime(freq * 0.9, now + 1.5);

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.linearRampToValueAtTime(velocity, now + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);

    osc.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 2.05);
  }

  public static strum(frets: [number, number, number, number, number, number], options: StrumOptions = {}) {
    const speed = options.speedSec ?? 0.035;
    const dir = options.direction ?? 'down';
    const vel = options.velocity ?? 0.8;

    const indices = dir === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];
    let offset = 0;

    for (const idx of indices) {
      const stringNum = 6 - idx;
      const fret = frets[idx];
      if (fret >= 0) {
        this.playString(stringNum, fret, offset, vel);
        offset += speed;
      }
    }
  }
}
