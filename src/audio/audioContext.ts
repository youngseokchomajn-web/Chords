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
   * Direct HTMLAudioElement diagnostic. This intentionally bypasses Web Audio
   * so iOS Safari can be tested with the native media playback path.
   */
  public async playHtmlAudioTest(): Promise<'played' | 'failed'> {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.volume = 0.25;

    // Tiny self-contained 440Hz WAV generated as PCM16 mono.
    const sampleRate = 8000;
    const duration = 0.35;
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
      view.setInt16(44 + i * 2, Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.25 * envelope * 32767, true);
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
