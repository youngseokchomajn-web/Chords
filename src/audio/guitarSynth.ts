import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI, midiToFrequency } from '../theory/notes';
import { StrumOptions } from '../types/audio';

function createNoiseBuffer(ctx: AudioContext, duration = 0.08) {
  const buffer = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * duration)), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export class GuitarSoundEngine {
  public static playString(stringIdx: number, fret: number, startTimeOffset = 0, velocity = 0.8) {
    if (fret < 0) return;

    const ctx = audioContextManager.getContext();
    const now = ctx.currentTime + startTimeOffset;
    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    const freq = midiToFrequency(midi);

    const master = ctx.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.linearRampToValueAtTime(velocity * 0.72, now + 0.008);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 1.65);

    const body = ctx.createBiquadFilter();
    body.type = 'lowpass';
    body.frequency.setValueAtTime(Math.min(5200, freq * 8), now);
    body.Q.setValueAtTime(0.55, now);

    const fundamental = ctx.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.setValueAtTime(freq, now);

    const harmonic = ctx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(freq * 2, now);
    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.16, now);

    const pluck = ctx.createOscillator();
    pluck.type = 'sine';
    pluck.frequency.setValueAtTime(freq * 3, now);
    const pluckGain = ctx.createGain();
    pluckGain.gain.setValueAtTime(0.06, now);
    pluckGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'bandpass';
    noiseFilter.frequency.setValueAtTime(Math.min(4500, Math.max(1200, freq * 5)), now);
    noiseFilter.Q.setValueAtTime(0.7, now);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(velocity * 0.055, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    fundamental.connect(body);
    harmonic.connect(harmonicGain).connect(body);
    pluck.connect(pluckGain).connect(body);
    body.connect(master);
    noise.connect(noiseFilter).connect(noiseGain).connect(master);
    master.connect(ctx.destination);

    fundamental.start(now);
    harmonic.start(now);
    pluck.start(now);
    noise.start(now);

    fundamental.stop(now + 1.7);
    harmonic.stop(now + 1.7);
    pluck.stop(now + 0.14);
    noise.stop(now + 0.09);
  }

  public static strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {}
  ) {
    const speed = options.speedSec ?? 0.025;
    const dir = options.direction ?? 'down';
    const vel = options.velocity ?? 0.8;
    const indices = dir === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    indices.forEach((idx, position) => {
      const stringNum = 6 - idx;
      const fret = frets[idx];
      if (fret >= 0) {
        const microVariation = ((position % 3) - 1) * 0.002;
        this.playString(stringNum, fret, Math.max(0, position * speed + microVariation), vel * (0.94 + (position % 2) * 0.03));
      }
    });
  }

  public static strumPattern(
    frets: [number, number, number, number, number, number],
    pattern: Array<'down' | 'up' | 'rest'>,
    stepSec: number,
    velocity = 0.75
  ) {
    pattern.forEach((stroke, index) => {
      if (stroke === 'rest') return;
      this.strum(frets, {
        direction: stroke,
        speedSec: 0.018,
        velocity: velocity * (stroke === 'up' ? 0.88 : 1)
      });
    });
    void stepSec;
  }
}

// sample engine migration pending
