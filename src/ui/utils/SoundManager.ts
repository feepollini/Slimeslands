import gsap from 'gsap';
import soundData from '../../core/sounds.json';

export type SoundAsset = { url: string; name: string };

type SoundData = {
  library: SoundAsset[];
  actions: Record<string, string>;
  screens: Record<string, string>;
  screenSettings?: Record<string, { loop: boolean }>;
  transitions?: Record<string, string>;
};

export class SoundManager {
  private static config: SoundData = soundData as unknown as SoundData;

  /** Play a transition sound between screens */
  public static playTransition(from: string, to: string): void {
    if (!this.enabled || !this.config.transitions) return;
    const key = `${from}_to_${to}`;
    if (!this.config.transitions[key]) return;
    const url = this.config.transitions[key];
    if (url) this.play(url, this.sfxVolume);
  }
  private static cache: Map<string, HTMLAudioElement> = new Map();
  private static currentAmbient: HTMLAudioElement | null = null;
  private static _ambientVolume: number = Number(localStorage.getItem('vol_ambient') ?? 0.3);
  private static _sfxVolume: number = Number(localStorage.getItem('vol_sfx') ?? 0.6);
  private static enabled: boolean = true;

  public static get ambientVolume() { return this._ambientVolume; }
  public static get sfxVolume() { return this._sfxVolume; }

  /** Update config at runtime (used by the editor) */
  public static setConfig(cfg: SoundData) {
    this.config = cfg;
  }

  public static getConfig(): SoundData {
    return this.config;
  }

  /** Play a game action sound */
  public static playAction(actionKey: string, vol?: number): void {
    if (!this.enabled) return;
    if (!this.config.actions[actionKey]) return;
    const url = this.config.actions[actionKey];
    if (!url) return;
    this.play(url, vol ?? this._sfxVolume);
  }

  /** Start ambient music for a screen – with smooth crossfade */
  public static playAmbient(screenKey: string): void {
    if (!this.enabled) return;
    const url = this.config.screens[screenKey];
    if (!url) {
      this.stopAmbient();
      return;
    }
    const prevAmbient = this.currentAmbient;
    
    // Check if same URL is already playing to avoid restart
    if (prevAmbient && prevAmbient.src.includes(url)) {
        // Just update volume in case it changed
        gsap.to(prevAmbient, { volume: this._ambientVolume, duration: 0.8 });
        return;
    }

    const newAmbient = new Audio(url);
    const settings = this.config.screenSettings?.[screenKey] || { loop: true };
    newAmbient.loop = settings.loop;
    newAmbient.volume = 0; // Start at zero for fade-in

    // Fade Out Previous
    if (prevAmbient) {
      gsap.to(prevAmbient, {
        volume: 0,
        duration: 1.2,
        onComplete: () => {
          prevAmbient.pause();
          prevAmbient.currentTime = 0;
        }
      });
    }

    // Fade In New
    this.currentAmbient = newAmbient;
    newAmbient.play().catch(() => {});
    gsap.to(newAmbient, {
      volume: this._ambientVolume,
      duration: 1.2
    });
  }

  public static stopAmbient(): void {
    if (this.currentAmbient) {
      const audio = this.currentAmbient;
      gsap.to(audio, {
        volume: 0,
        duration: 0.8,
        onComplete: () => {
          audio.pause();
          audio.currentTime = 0;
        }
      });
      this.currentAmbient = null;
    }
  }

  public static setVolume(sfx: number, ambient: number) {
    this._sfxVolume = sfx;
    this._ambientVolume = ambient;
    localStorage.setItem('vol_sfx', sfx.toString());
    localStorage.setItem('vol_ambient', ambient.toString());
    if (this.currentAmbient) {
        gsap.to(this.currentAmbient, { volume: ambient, duration: 0.3 });
    }
  }

  public static setEnabled(val: boolean) {
    this.enabled = val;
    if (!val) this.stopAmbient();
  }

  public static play(url: string, volume = 0.6): void {
    try {
      let base = this.cache.get(url);
      if (!base) {
        base = new Audio(url);
        base.preload = 'auto';
        this.cache.set(url, base);
      }
      const clone = base.cloneNode() as HTMLAudioElement;
      clone.volume = volume;
      clone.play().catch(err => {
        if (err.name !== 'NotAllowedError') console.warn('[SoundManager]', url, err.message);
      });
    } catch (e) {
      console.error('[SoundManager] play error:', e);
    }
  }

  /** Preview a sound file in the editor */
  public static preview(url: string): void {
    this.play(url, 0.7);
  }
}
