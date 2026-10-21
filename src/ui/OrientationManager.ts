/**
 * OrientationManager — Detecta automaticamente o dispositivo (Mobile, Tablet, Desktop)
 * e a orientação da tela (Retrato vs Paisagem) em tempo real, aplicando classes
 * adaptativas para garantir proporção ideal em qualquer resolução.
 */

export type OrientationMode = 'portrait' | 'landscape';
export type OrientationOverride = 'auto' | 'portrait' | 'landscape';
export type DeviceTier = 'mobile' | 'tablet' | 'desktop';

type OrientationListener = (mode: OrientationMode, device: DeviceTier) => void;

const STORAGE_KEY = 'lendas_orientation_override';

class OrientationManagerService {
  private listeners: Set<OrientationListener> = new Set();
  private currentMode: OrientationMode = 'portrait';
  private currentDevice: DeviceTier = 'mobile';
  private overrideMode: OrientationOverride = 'auto';
  private initialized = false;
  private resizeTimer: number | null = null;

  constructor() {
    this.init();
  }

  public init(): void {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    // Garante detecção 100% automática removendo travas manuais antigas
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    this.overrideMode = 'auto';

    this.currentMode = this.computeMode();
    this.currentDevice = this.computeDeviceTier();
    this.applyBodyAttributes();

    const handleCheck = () => {
      if (this.resizeTimer !== null) {
        window.clearTimeout(this.resizeTimer);
      }
      this.resizeTimer = window.setTimeout(() => {
        this.evaluateAndNotify();
      }, 50);
    };

    window.addEventListener('resize', handleCheck, { passive: true });
    window.addEventListener('orientationchange', handleCheck, { passive: true });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleCheck, { passive: true });
    }

    if (window.matchMedia) {
      try {
        const mq = window.matchMedia('(orientation: landscape)');
        if (mq.addEventListener) {
          mq.addEventListener('change', handleCheck);
        } else if ((mq as any).addListener) {
          (mq as any).addListener(handleCheck);
        }
      } catch {}
    }
  }

  private computeMode(): OrientationMode {
    if (this.overrideMode === 'landscape') return 'landscape';
    if (this.overrideMode === 'portrait') return 'portrait';

    if (typeof window === 'undefined') return 'portrait';

    const w = window.innerWidth;
    const h = window.innerHeight;

    // Qualquer tela horizontal (celular virado, tablet em paisagem ou desktop) entra em landscape
    if (w > h && w >= 480) {
      return 'landscape';
    }

    return 'portrait';
  }

  private computeDeviceTier(): DeviceTier {
    if (typeof window === 'undefined') return 'mobile';
    const w = window.innerWidth;
    const h = window.innerHeight;
    const shortSide = Math.min(w, h);
    const longSide = Math.max(w, h);

    // Smartphones (ex: 360x740, 375x667, 390x844, 412x915, 430x932)
    if (shortSide <= 540 || longSide <= 960) {
      return 'mobile';
    }

    // Tablets (ex: 768x1024, 820x1180, 800x1280, 1024x1366)
    if (shortSide <= 960 && longSide <= 1400) {
      return 'tablet';
    }

    return 'desktop';
  }

  private applyBodyAttributes(): void {
    if (typeof document === 'undefined' || !document.body) return;
    const isLandscape = this.currentMode === 'landscape';
    const dev = this.currentDevice;

    const targets = [document.body, document.documentElement];
    targets.forEach((el) => {
      if (!el) return;
      el.classList.toggle('is-landscape-mode', isLandscape);
      el.classList.toggle('is-portrait-mode', !isLandscape);

      el.classList.toggle('is-mobile-device', dev === 'mobile');
      el.classList.toggle('is-tablet-device', dev === 'tablet');
      el.classList.toggle('is-desktop-device', dev === 'desktop');

      el.classList.toggle('is-mobile-landscape', isLandscape && dev === 'mobile');
      el.classList.toggle('is-tablet-landscape', isLandscape && dev === 'tablet');
      el.classList.toggle('is-desktop-landscape', isLandscape && dev === 'desktop');

      el.classList.toggle('is-mobile-portrait', !isLandscape && dev === 'mobile');
      el.classList.toggle('is-tablet-portrait', !isLandscape && dev !== 'mobile');

      el.setAttribute('data-orientation', this.currentMode);
      el.setAttribute('data-device', dev);
    });
  }

  private evaluateAndNotify(): void {
    const nextMode = this.computeMode();
    const nextDevice = this.computeDeviceTier();
    const changed = nextMode !== this.currentMode || nextDevice !== this.currentDevice;
    this.currentMode = nextMode;
    this.currentDevice = nextDevice;
    this.applyBodyAttributes();
    if (changed) {
      this.listeners.forEach((cb) => {
        try {
          cb(this.currentMode, this.currentDevice);
        } catch (err) {
          console.error('[OrientationManager] Listener error:', err);
        }
      });
    }
  }

  public getMode(): OrientationMode {
    this.currentMode = this.computeMode();
    this.currentDevice = this.computeDeviceTier();
    this.applyBodyAttributes();
    return this.currentMode;
  }

  public getDeviceTier(): DeviceTier {
    this.currentDevice = this.computeDeviceTier();
    this.applyBodyAttributes();
    return this.currentDevice;
  }

  public isLandscape(): boolean {
    return this.getMode() === 'landscape';
  }

  public isMobileLandscape(): boolean {
    return this.isLandscape() && this.getDeviceTier() === 'mobile';
  }

  public isTabletLandscape(): boolean {
    return this.isLandscape() && this.getDeviceTier() === 'tablet';
  }

  public getOverride(): OrientationOverride {
    return this.overrideMode;
  }

  public setOverride(override: OrientationOverride): void {
    this.overrideMode = override;
    this.evaluateAndNotify();
  }

  public toggleManualMode(): OrientationMode {
    this.setOverride('auto');
    return this.currentMode;
  }

  public subscribe(listener: OrientationListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const OrientationManager = new OrientationManagerService();
