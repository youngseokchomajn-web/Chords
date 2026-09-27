class SoundContextManager {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

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
   * Instantly unlock Web Audio without blocking or waiting.
   */
  public unlock(): void {
    const ctx = this.getContext();
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      void ctx.resume().catch(() => undefined);
    }
    this.isUnlocked = true;
  }

  /**
   * Diagnostic beep: plays a distinct 523Hz (C5) tone for 0.2s immediately
   */
  public playTestBeep(): void {
    this.unlock();
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.23);
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
