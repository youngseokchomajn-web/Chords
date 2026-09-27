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
   * Safe master audio bus with brickwall limiter to guarantee zero harsh clipping or runaway noise.
   */
  private static getMasterOutput(): GainNode {
    const ctx = audioContextManager.getContext();
    if (!this.masterLimiter || !this.masterGain) {
      // 1. Limiter: protects ears and speakers from any loud transients or overlap
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.setValueAtTime(-14, ctx.currentTime);
      limiter.knee.setValueAtTime(10, ctx.currentTime);
      limiter.ratio.setValueAtTime(16, ctx.currentTime);
      limiter.attack.setValueAtTime(0.002, ctx.currentTime);
      limiter.release.setValueAtTime(0.08, ctx.currentTime);

      // 2. Master Gain: comfortable acoustic listening volume
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.55, ctx.currentTime);

      limiter.connect(master);
      master.connect(ctx.destination);

      this.masterLimiter = limiter;
      this.masterGain = master;
    }
    return this.masterGain;
  }

  /**
   * Immediately fade-out and stop all currently ringing guitar strings.
   * Prevents previous chords from muddying and overlapping with new chords.
   */
  public static stopAll(): void {
    const ctx = audioContextManager.getContext();
    const now = ctx.currentTime;
    const fadeTime = 0.03;

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
   * Play an acoustic guitar string using a safe, warm subtractive synthesis engine.
   * 100% feed-forward (NO dangerous feedback loops, NO screeching or runaway howling).
   */
  public static playString(
    stringIdx: number,
    fret: number,
    offsetSec = 0,
    velocity = 0.85,
  ): void {
    if (fret < 0) return;

    audioContextManager.unlock();
    const ctx = audioContextManager.getContext();
    this.getMasterOutput(); // Ensure master chain is ready

    const now = Math.max(ctx.currentTime, ctx.currentTime + offsetSec);
    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    const freq = midiToFrequency(midi);

    // Clean up expired voices
    this.activeVoices = this.activeVoices.filter(v => v.stopAtTime > now);

    try {
      // 1. Primary string body oscillator (warm wooden triangle)
      const osc1 = ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      // 2. Steel string brightness harmonic oscillator (gentle sawtooth, 15% mix)
      const osc2 = ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(freq, now);

      const osc2Gain = ctx.createGain();
      osc2Gain.gain.setValueAtTime(0.15, now);
      osc2.connect(osc2Gain);

      // 3. Acoustic guitar lowpass filter (bright pluck attack that decays quickly)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      const openCutoff = Math.min(6500, freq * 5.5);
      const warmCutoff = Math.min(1100, freq * 1.6);
      filter.frequency.setValueAtTime(openCutoff, now);
      filter.frequency.exponentialRampToValueAtTime(warmCutoff, now + 0.35);

      // 4. String envelope (fast attack, natural exponential decay)
      const stringGain = ctx.createGain();
      // Controlled safe string volume to avoid summing distortion
      const stringVol = velocity * (stringIdx >= 5 ? 0.16 : 0.12);
      stringGain.gain.setValueAtTime(0.0001, now);
      stringGain.gain.linearRampToValueAtTime(stringVol, now + 0.004);

      const decayDuration = Math.min(2.5, Math.max(1.0, 2.6 - (midi - 40) * 0.03));
      const stopAtTime = now + decayDuration;
      stringGain.gain.exponentialRampToValueAtTime(0.0001, stopAtTime);

      // Safe feed-forward audio routing:
      // osc1 -> filter
      // osc2 -> osc2Gain -> filter
      // filter -> stringGain -> masterLimiter
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
      // Ignore audio scheduling errors
    }
  }

  /**
   * Strum a chord with tight, natural acoustic guitar strum timing (~45ms total).
   */
  public static strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {},
  ): void {
    // 9ms between strings gives a natural, tight "촤르륵" acoustic guitar strum
    const speed = options.speedSec ?? 0.009;
    const direction = options.direction ?? 'down';
    const velocity = options.velocity ?? 0.85;

    const indices = direction === 'down' ? [0, 1, 2, 3, 4, 5] : [5, 4, 3, 2, 1, 0];

    indices.forEach((idx, position) => {
      const fret = frets[idx];
      if (fret < 0) return;

      const stringIndex = 6 - idx;
      const offsetSec = position * speed;
      this.playString(
        stringIndex,
        fret,
        offsetSec,
        velocity * (0.95 + (position % 2) * 0.04),
      );
    });
  }

  public static playTestNote(): void {
    this.stopAll();
    this.playString(6, 0, 0, 0.85);
  }
}
