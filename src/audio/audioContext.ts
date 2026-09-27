// 1-sample silent WAV data URI to force iOS WebKit AudioSession category to Playback (bypasses silent switch)
const SILENT_WAV_URI = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w==';

class SoundContextManager {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;
  private silentAudio: HTMLAudioElement | null = null;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  /**
   * Unlocks Web Audio and promotes iOS AudioSession to 'Playback'
   * so sounds are audible even if the physical ringer/mute switch is engaged.
   */
  public async unlock(): Promise<boolean> {
    const ctx = this.getContext();

    // 1. Bypass iOS mute switch via HTML5 Audio
    if (!this.silentAudio) {
      try {
        this.silentAudio = new Audio(SILENT_WAV_URI);
        this.silentAudio.setAttribute('playsinline', '');
        void this.silentAudio.play().catch(() => undefined);
      } catch {
        // Ignore errors
      }
    }

    // 2. Resume AudioContext if suspended or interrupted
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume error:', err);
      }
    }

    // 3. Hardware warmup buffer
    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.02);

      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      source.connect(gain).connect(ctx.destination);
      source.start(now);
      source.stop(now + 0.02);
    } catch {
      // Ignore warmup errors
    }

    this.isUnlocked = ctx.state === 'running';
    return this.isUnlocked;
  }

  /**
   * Diagnostic beep: plays a distinct 523Hz (C5) tone for 0.25s at good volume
   */
  public async playTestBeep(): Promise<void> {
    await this.unlock();
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.26);
  }

  public get isReady(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  public get state(): AudioContextState | 'uninitialized' {
    return this.ctx ? this.ctx.state : 'uninitialized';
  }

  public get unlocked(): boolean {
    return this.isUnlocked;
  }
}

export const audioContextManager = new SoundContextManager();
