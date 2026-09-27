class SoundContextManager {
  private ctx: AudioContext | null = null;
  private isUnlocked: boolean = false;

  public getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    return this.ctx;
  }

  public async unlock(): Promise<boolean> {
    const ctx = this.getContext();
    if (this.isUnlocked && ctx.state === 'running') {
      return true;
    }

    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // iOS/WebKit hardware warmup
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);

    if (ctx.state === 'running') {
      this.isUnlocked = true;
    }
    return this.isUnlocked;
  }

  public get isReady(): boolean {
    return this.ctx !== null && this.ctx.state === 'running';
  }
}

export const audioContextManager = new SoundContextManager();
