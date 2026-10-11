export interface LightObject {
  id: string;
  type: 'light';
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  color1: string;
  color2: string;
  intensity: number;
  blendMode: 'lighter' | 'multiply' | 'overlay' | 'screen' | 'darken';
  animationType: 'none' | 'flicker' | 'breath' | 'shake' | 'color_cycle';
  animationSpeed: number;
  animationRange: number;
  opacity: number;
  isVisible: boolean;
  isPersistent: boolean;
  artboardId: string;
  points?: { x: number; y: number }[]; // For vector lights
  isClosed?: boolean;
}

export class LightSystem {
  private objects: any[];
  private _startedAt: number = Date.now();

  constructor(objects: any[]) {
    this.objects = objects;
  }

  public tick() {
    const now = Date.now();
    const elapsed = (now - this._startedAt) / 1000;

    this.objects.forEach(o => {
      if (o.type !== 'light') return;
      const lo = o as LightObject;
      if (lo.animationType === 'none') return;

      this.applyAnimation(lo, elapsed);
    });
  }

  private applyAnimation(lo: LightObject, elapsed: number) {
    const speed = lo.animationSpeed || 1;
    const range = lo.animationRange || 1;

    switch (lo.animationType) {
      case 'flicker':
        // Random flicker
        if (Math.random() > 0.8) {
           // We don't mutate the base intensity, but we could have a runtimeIntensity
           (lo as any)._runtimeIntensity = (lo.intensity || 1) * (1 - Math.random() * 0.3 * range);
        }
        break;
      case 'breath':
        // Smooth pulse
        const pulse = 1 + Math.sin(elapsed * Math.PI * speed) * 0.2 * range;
        (lo as any)._runtimeIntensity = (lo.intensity || 1) * pulse;
        break;
      case 'shake':
        // Position shake
        (lo as any)._offsetX = Math.sin(elapsed * 10 * speed) * 5 * range;
        (lo as any)._offsetY = Math.cos(elapsed * 12 * speed) * 5 * range;
        break;
      case 'color_cycle':
        // Rotate hue (complex with hex, maybe just cycle intensity for now or handle in renderer)
        break;
    }
  }

  public createLight(x: number, y: number): LightObject {
    return {
      id: 'light_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      type: 'light',
      label: 'Luz ' + (this.objects.filter(o => o.type === 'light').length + 1),
      x: x,
      y: y,
      w: 100,
      h: 100,
      radius: 150,
      color1: '#ffffff',
      color2: '#00000000',
      intensity: 1,
      blendMode: 'lighter',
      animationType: 'none',
      animationSpeed: 1,
      animationRange: 1,
      opacity: 1,
      isVisible: true,
      isPersistent: true,
      artboardId: 'default'
    };
  }
}
