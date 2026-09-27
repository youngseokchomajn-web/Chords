class SoundContextManager {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

  /**
   * iOS Safari/WebKit can keep Web Audio in an ambient audio session,
   * which may produce silence even though AudioContext reports "running".
   * Use the newer AudioSession API when available.
   */
  private configureAudioSession(): void {
    const audioSession = (
      navigator as Navigator & {
        audioSession?: { type: string };
      }
    ).audioSession;

    if (audioSession) {
      try {
        audioSession.type = 'playback';
      } catch {
        // Older browsers or unsupported WebKit versions.
      }
    }
  }

  public getContext(): AudioContext {
    if (!this.ctx) {
      this.configureAudioSession();

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  /**
   * Unlock Web Audio from the current user gesture.
   */
  public unlock(): void {
    this.configureAudioSession();

    const ctx = this.getContext();
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      void ctx.resume().catch(() => undefined);
    }
    this.isUnlocked = true;
  }

  /**
   * Diagnostic beep: plays a quiet 523Hz (C5) tone for 0.2s.
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
    gain.gain.linearRampToValueAtTime(0.12, now + 0.015);
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
