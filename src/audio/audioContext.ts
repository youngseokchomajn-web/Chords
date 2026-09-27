class SoundContextManager {
  private ctx: AudioContext | null = null;
  private isUnlocked = false;

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
   * Guaranteed unlock: awaits ctx.resume() inside the user gesture.
   */
  public async unlock(): Promise<boolean> {
    return this.ensureRunning();
  }

  /**
   * iOS Safari can suspend/interupt Web Audio after the page loses focus.
   * Always verify the context is running immediately before scheduling audio.
   */
  public async ensureRunning(): Promise<boolean> {
    const ctx = this.getContext();

    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume failed:', err);
      }
    }

    this.isUnlocked = ctx.state === 'running';
    return this.isUnlocked;
  }

  /**
   * Use iOS's transient audio-session mode when the browser exposes it.
   * This is intentionally feature-detected because the API is not in all browsers.
   */
  private configureAudioSession(): void {
    const audioSession = (navigator as Navigator & {
      audioSession?: { type?: string };
    }).audioSession;

    if (audioSession && audioSession.type !== 'transient') {
      try {
        audioSession.type = 'transient';
      } catch {
        // Browser does not allow changing the audio session type.
      }
    }
  }

  /**
   * Direct HTMLAudioElement test for iOS Safari isolation.
   */
  public async playHtmlAudioTest(): Promise<'played' | 'failed'> {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.5;

    // Self-contained 440Hz WAV PCM16 mono.
    const sampleRate = 8000;
    const duration = 0.3;
    const samples = Math.floor(sampleRate * duration);
    const buffer = new ArrayBuffer(44 + samples * 2);
    const view = new DataView(buffer);
    const writeString = (offset: number, value: string) => {
      for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples * 2, true);
    for (let i = 0; i < samples; i++) {
      const envelope = Math.min(1, i / 80) * Math.max(0, 1 - i / samples);
      view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.4 * envelope * 32767, true);
    }

    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    audio.src = `data:audio/wav;base64,${btoa(binary)}`;

    try {
      await audio.play();
      return 'played';
    } catch {
      return 'failed';
    }
  }

  /**
   * Diagnostic beep: plays a clear 523Hz (C5) tone
   */
  public async playTestBeep(): Promise<void> {
    await this.unlock();
    const ctx = this.getContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.015);
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

if (typeof window !== 'undefined') {
  const recoverAudio = () => {
    void audioContextManager.ensureRunning();
  };
  document.addEventListener('visibilitychange', recoverAudio);
  window.addEventListener('pageshow', recoverAudio);
}
