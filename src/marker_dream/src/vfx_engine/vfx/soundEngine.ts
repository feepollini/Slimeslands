class CombatSoundEngine {
  private ctx: AudioContext | null = null;
  private sharedNoiseBuffer: AudioBuffer | null = null;
  private enabled = true;

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.sharedNoiseBuffer) {
      const len = Math.floor(ctx.sampleRate * 0.8);
      this.sharedNoiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.sharedNoiseBuffer.getChannelData(0);
      for (let i = 0; i < len; i++) {
        data[i] = Math.random() * 2 - 1;
      }
    }
    return this.sharedNoiseBuffer;
  }

  public playCrystalFreeze(enabled = this.enabled) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const freqs = [1480, 2217, 2960, 3720];
    for (let i = 0; i < freqs.length; i++) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[i], now + i * 0.018);
      osc.frequency.exponentialRampToValueAtTime(freqs[i] * 1.06, now + 0.25);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.08, now + i * 0.018);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28 + i * 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.018);
      osc.stop(now + 0.32 + i * 0.03);
    }
  }

  public playCrystalShatter(enabled = this.enabled) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.8, now);
    filter.frequency.setValueAtTime(3400, now);
    filter.frequency.exponentialRampToValueAtTime(1100, now + 0.22);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.25);
  }

  public playSkillshotLaunch(pitch = 1.0, enabled = this.enabled) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880 * pitch, now);
    osc.frequency.exponentialRampToValueAtTime(210 * pitch, now + 0.13);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.14);
  }

  public playSlash(pitch = 1.0, enabled = this.enabled) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.setValueAtTime(3.2, now);
    filter.frequency.setValueAtTime(480 * pitch, now);
    filter.frequency.exponentialRampToValueAtTime(2400 * pitch, now + 0.06);
    filter.frequency.exponentialRampToValueAtTime(380, now + 0.2);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.22);
  }

  public playArcaneImpact(scale = 1.0, enabled = this.enabled) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = Math.min(0.42, 0.26 * scale);

    const sub = ctx.createOscillator();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(160, now);
    sub.frequency.exponentialRampToValueAtTime(36, now + dur);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(Math.min(0.3, 0.22 * scale), now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + dur);

    sub.connect(subGain);
    subGain.connect(ctx.destination);
    sub.start(now);
    sub.stop(now + dur);
  }

  public playBeamChannel(enabled = this.enabled) {
    if (!enabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.linearRampToValueAtTime(420, now + 0.12);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.45);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1600, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.47);
  }
}

export const soundEngine = new CombatSoundEngine();
