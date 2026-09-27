// 1-sample silent WAV data URI to force iOS WebKit AudioSession category to Playback (bypasses silent switch)
const SILENT_WAV_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w==';

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
   * Synchronous gesture unlock.
   * Runs 100% synchronously inside the user's click/touch event.
   * 1. Bypasses iOS physical mute/silent switch via HTML5 audio session promotion.
   * 2. Triggers an instantaneous hardware dummy buffer directly connected to destination.
   * 3. Dispatches ctx.resume() without awaiting or forfeiting user activation.
   */
  public unlockSync(): void {
    const ctx = this.getContext();

    // 1. Bypass iOS mute switch
    if (!this.silentAudio) {
      try {
        const audio = new Audio(SILENT_WAV_URI);
        audio.setAttribute('playsinline', '');
        void audio.play().catch(() => undefined);
        this.silentAudio = audio;
      } catch {
        // Safe to ignore
      }
    }

    // 2. Hardware dummy buffer trigger
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch {
      // Safe to ignore
    }

    // 3. Non-blocking resume
    if (ctx.state === 'suspended' || (ctx.state as string) === 'interrupted') {
      void ctx.resume().catch(() => undefined);
    }

    this.isUnlocked = true;
  }

  public async ensureRunning(): Promise<boolean> {
    this.unlockSync();
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

  public async unlock(): Promise<boolean> {
    this.unlockSync();
    return this.ensureRunning();
  }

  public async playHtmlAudioTest(): Promise<'played' | 'failed'> {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.5;

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
      view.setInt16(
        44 + i * 2,
        Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.4 * envelope * 32767,
        true,
      );
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
