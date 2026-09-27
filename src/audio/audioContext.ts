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
   * Must be called directly from the user's pointer/touch event.
   * Do not wait for an async operation before starting the first sound.
   */
  public unlock(): boolean {
    const ctx = this.getContext();

    // resume() is intentionally kicked off immediately inside the user gesture.
    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => undefined);
    }

    // Tiny audible-path warmup. The gain is effectively silent, but it
    // initializes the Web Audio output path on iOS/Safari.
    try {
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.00001, now);
      gain.gain.exponentialRampToValueAtTime(0.00001, now + 0.02);

      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
      source.connect(gain).connect(ctx.destination);
      source.start(now);
      source.stop(now + 0.02);
    } catch {
      // The actual guitar path will report/fallback independently.
    }

    this.isUnlocked = true;
    return true;
  }

  public get isReady(): boolean {
    return this.isUnlocked && this.ctx !== null && this.ctx.state === 'running';
  }

  public get unlocked(): boolean {
    return this.isUnlocked;
  }
}

export const audioContextManager = new SoundContextManager();
