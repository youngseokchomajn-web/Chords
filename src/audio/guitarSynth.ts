import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI, midiToFrequency } from '../theory/notes';
import { StrumOptions } from '../types/audio';

interface ActiveVoice {
  gainNode: GainNode;
  stopAtTime: number;
}

export class GuitarSoundEngine {
  private static activeVoices: ActiveVoice[] = [];
  private static masterLimiter: DynamicsCompressorNode | null = null;
  private static masterGain: GainNode | null = null;

  /**
   * High-output master audio chain with brickwall limiter.
   * Guarantees loud, punchy mobile phone speaker sound without distortion.
   */
  private static getMasterOutput(): GainNode {
    const ctx = audioContextManager.getContext();
    if (!this.masterLimiter || !this.masterGain) {
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-2, ctx.currentTime);
      limiter.knee.setValueAtTime(6, ctx.currentTime);
      limiter.ratio.setValueAtTime(16, ctx.currentTime);
      limiter.attack.setValueAtTime(0.002, ctx.currentTime);
      limiter.release.setValueAtTime(0.05, ctx.currentTime);

      const master = ctx.createGain();
      // Generous, clear volume for phone speakers
      master.gain.setValueAtTime(1.35, ctx.currentTime);

      limiter.connect(master);
      master.connect(ctx.destination);

      this.masterLimiter = limiter;
      this.masterGain = master;
    }
    return this.masterGain;
  }

  /**
   * Immediately fade-out and stop all currently ringing guitar strings.
   */
  public static stopAll(): void {
    const ctx = audioContextManager.getContext();
    const now = ctx.currentTime;
    const fadeTime = 0.025;

    this.activeVoices.forEach(voice => {
      try {
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
        voice.gainNode.gain.linearRampToValueAtTime(0.0001, now + fadeTime);
      } catch {
        // Voice already stopped
      }
    });

    this.activeVoices = [];
  }

  /**
   * Play an acoustic guitar string with rich tone and loud, clear volume.
   */
  public static playString(
    stringIdx: number,
    fret: number,
    offsetSec = 0,
    velocity = 0.9,
  ): void {
    if (fret < 0) return;

    const ctx = audioContextManager.getContext();
    this.getMasterOutput();

    const now = Math.max(ctx.currentTime, ctx.currentTime + offsetSec);
    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    const freq = midiToFrequency(midi);

    this.activeVoices = this.activeVoices.filter(v => v.stopAtTime > now);

    try {
      // 1. Warm wooden body oscillator (triangle)
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      // 2. Steel string brightness harmonic oscillator (sawtooth, 22% mix)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq, now);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.22, now);
      osc2.connect(osc2Gain);

      // 3. Acoustic guitar lowpass filter (bright pluck attack that decays smoothly)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const openCutoff = Math.min(8500, freq * 6.5);
      const warmCutoff = Math.min(1600, freq * 1.9);
      filter.frequency.setValueAtTime(openCutoff, now);
      filter.frequency.exponentialRampToValueAtTime(warmCutoff, now + 0.28);

      // 4. Loud, punchy string envelope
      const stringGain = ctx.createGain();
      // Bass strings (6, 5, 4) get extra power for acoustic body thump
      const stringVol = velocity * (stringIdx >= 4 ? 0.62 : 0.52);
      stringGain.gain.setValueAtTime(0.0001, now);
      stringGain.gain.linearRampToValueAtTime(stringVol, now + 0.003);

      const decayDuration = Math.min(2.4, Math.max(0.9, 2.5 - (midi - 40) * 0.03));
      const stopAtTime = now + decayDuration;
      stringGain.gain.exponentialRampToValueAtTime(0.0001, stopAtTime);

      // Routing:
      osc1.connect(filter);
      osc2Gain.connect(filter);
      filter.connect(stringGain);
      stringGain.connect(this.masterLimiter!);

      osc1.start(now);
      osc1.stop(stopAtTime + 0.02);
      osc2.start(now);
      osc2.stop(stopAtTime + 0.02);

      this.activeVoices.push({
        gainNode: stringGain,
        stopAtTime
      });
    } catch {
      // Safeguard
    }
  }

  /**
   * Tight, rhythmic acoustic strum (~35ms) with precise per-played-string spacing.
   * Never wastes time on muted strings.
   */
  public static strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {},
  ): void {
    // 7ms between consecutive sounding strings gives a tight, lively acoustic strum
    const speed = options.speedSec ?? 0.007;
    const direction = options.direction ?? 'down';
    const velocity = options.velocity ?? 0.9;

    const indices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    let soundingIndex = 0;
    for (const idx of indices) {
      const fret = frets[idx];
      if (fret < 0) continue; // Skip muted strings immediately

      const stringIndex = 6 - idx;
      const offsetSec = soundingIndex * speed;
      this.playString(
        stringIndex,
        fret,
        offsetSec,
        velocity * (0.96 + (soundingIndex % 2) * 0.04),
      );
      soundingIndex++;
    }
  }

  public static playTestNote(): void {
    this.stopAll();
    this.playString(5, 3, 0, 0.95);
  }
}
