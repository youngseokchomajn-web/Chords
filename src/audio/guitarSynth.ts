import { audioContextManager } from './audioContext';
import { STANDARD_TUNING_MIDI, midiToFrequency } from '../theory/notes';
import { StrumOptions } from '../types/audio';

interface ActiveVoice {
  gainNode: GainNode;
  stopAtTime: number;
}

export class GuitarSoundEngine {
  private static activeVoices: ActiveVoice[] = [];

  /**
   * Immediately fade-out and stop all currently ringing guitar strings.
   * Prevents previous chords from muddying and overlapping with new chords.
   */
  public static stopAll(): void {
    const ctx = audioContextManager.getContext();
    const now = ctx.currentTime;
    const fadeTime = 0.04;

    this.activeVoices.forEach(voice => {
      try {
        voice.gainNode.gain.cancelScheduledValues(now);
        voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
        voice.gainNode.gain.exponentialRampToValueAtTime(0.0001, now + fadeTime);
      } catch {
        // Ignore errors
      }
    });

    this.activeVoices = [];
  }

  /**
   * Play an acoustic guitar string using precision Karplus-Strong physical modeling.
   * Guaranteed 0-latency, 0-download, perfectly in-tune chords.
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
    const now = Math.max(ctx.currentTime, ctx.currentTime + offsetSec);

    const midi = STANDARD_TUNING_MIDI[stringIdx] + fret;
    const freq = midiToFrequency(midi);
    const period = 1 / freq;

    // Clean up expired voices
    this.activeVoices = this.activeVoices.filter(v => v.stopAtTime > now);

    try {
      // 1. Pick attack: Shaped noise burst
      const burstDur = Math.max(0.004, Math.min(0.012, period * 2));
      const burstSamples = Math.floor(ctx.sampleRate * burstDur);
      const burstBuf = ctx.createBuffer(1, burstSamples, ctx.sampleRate);
      const data = burstBuf.getChannelData(0);
      for (let i = 0; i < burstSamples; i++) {
        // Exponential decay within pick burst
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (burstSamples * 0.45));
      }

      const burst = ctx.createBufferSource();
      burst.buffer = burstBuf;

      // 2. Feedback delay line (string wavelength)
      const delay = ctx.createDelay(1.0);
      delay.delayTime.setValueAtTime(period, now);

      // 3. String damping filter (high frequencies decay faster on nylon/steel strings)
      const damping = ctx.createBiquadFilter();
      damping.type = 'lowpass';
      damping.frequency.setValueAtTime(Math.min(9000, freq * 7.5), now);

      // 4. Feedback gain (sustain factor)
      // Thicker bass strings sustain longer than high treble strings
      const sustain = 0.984 - (midi - 40) * 0.0011;
      const feedback = ctx.createGain();
      feedback.gain.setValueAtTime(Math.max(0.94, Math.min(0.986, sustain)), now);

      // 5. Acoustic guitar soundboard body resonance
      const bodyResonance = ctx.createBiquadFilter();
      bodyResonance.type = 'peaking';
      bodyResonance.frequency.setValueAtTime(210, now); // Wooden body resonance
      bodyResonance.Q.setValueAtTime(1.8, now);
      bodyResonance.gain.setValueAtTime(3.5, now);

      // 6. Master string envelope
      const stringGain = ctx.createGain();
      // Keep the physical-model voices at a safe level. Multiple strings and the
    // feedback loop otherwise sum to a dangerously loud output on iOS.
    const stringVolume = velocity * (stringIdx >= 5 ? 0.08 : 0.065);
      stringGain.gain.setValueAtTime(0.0001, now);
      stringGain.gain.linearRampToValueAtTime(stringVolume, now + 0.003);

      const decayEnd = now + Math.min(3.0, Math.max(1.2, 3.2 - (midi - 40) * 0.035));
      stringGain.gain.setValueAtTime(stringVolume * 0.9, now + 0.5);
      stringGain.gain.exponentialRampToValueAtTime(0.0001, decayEnd);

      // Connect physical loop:
      // burst -> delay -> damping -> feedback -> delay
      burst.connect(delay);
      delay.connect(damping);
      damping.connect(feedback);
      feedback.connect(delay);

      // Connect output:
      // delay -> bodyResonance -> stringGain -> destination
      delay.connect(bodyResonance);
      bodyResonance.connect(stringGain);
      // Final safety ceiling per voice before reaching the device output.
    const safetyGain = ctx.createGain();
    safetyGain.gain.setValueAtTime(0.7, now);
    stringGain.connect(safetyGain).connect(ctx.destination);

      burst.start(now);
      burst.stop(now + burstDur + 0.002);

      this.activeVoices.push({
        gainNode: stringGain,
        stopAtTime: decayEnd
      });
    } catch {
      // Audio fallback safeguard
    }
  }

  /**
   * Strum a chord with tight, natural acoustic guitar strum timing (~40ms total)
   */
  public static strum(
    frets: [number, number, number, number, number, number],
    options: StrumOptions = {},
  ): void {
    // 8ms to 10ms per string gives a tight, lively acoustic strum (total ~45ms)
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
    this.playString(6, 0, 0, 0.9);
  }
}
