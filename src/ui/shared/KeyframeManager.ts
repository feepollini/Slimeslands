/**
 * Professional Keyframe Manager
 * Inspired by After Effects / Premiere Pro workflow
 *
 * Concepts:
 * - Property activation (stopwatch): activate → any value change creates keyframe
 * - Auto-key: once property has keyframes, value change at any time creates new keyframe
 * - Interpolation types: Linear, Hold (step), Ease In/Out
 * - No manual keyframe creation — value changes drive keyframe creation
 */

export type InterpolationType = 'linear' | 'hold' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface KeyframePoint {
  t: number;
  v: number;
  interp?: InterpolationType;
  easeIn?: number;
  easeOut?: number;
}

export interface PropertyTrack {
  keyframes: KeyframePoint[];
  active: boolean;
  defaultValue: number;
}

export interface KeyframeData {
  [property: string]: PropertyTrack;
}

export class KeyframeManager {
  /** Robustly determine the current timeline time from various possible sources on the object or a provided time. */
  private static getCurrentTimeFromContext(obj: any, time?: number): number {
    if (typeof time === 'number') return time;
    if (obj?.__state?.currentTime != null) return obj.__state.currentTime;
    if (obj?._state?.currentTime != null) return obj._state.currentTime;
    if (typeof obj?.currentTime === 'number') return obj.currentTime;
    if (typeof obj?._currentTime === 'number') return obj._currentTime;
    return 0;
  }
  /**
   * Normalize a property track to the new format if it's in the old format (array)
   */
  private static normalizeTrack(raw: any): PropertyTrack {
    if (!raw) return { keyframes: [], active: false, defaultValue: 0 };
    if (Array.isArray(raw)) {
      // Old format: raw array of {t, v}
      return { keyframes: raw, active: raw.length > 0, defaultValue: raw[0]?.v ?? 0 };
    }
    if (raw.keyframes) return raw as PropertyTrack;
    return { keyframes: [], active: false, defaultValue: 0 };
  }

  /**
   * Initialize keyframe data on an object if not present
   */
  static init(obj: any): void {
    if (!obj.keyframes) obj.keyframes = {};
    // Migrate old format to new format
    for (const prop of Object.keys(obj.keyframes)) {
      const raw = obj.keyframes[prop];
      if (Array.isArray(raw)) {
        obj.keyframes[prop] = { keyframes: raw, active: raw.length > 0, defaultValue: raw[0]?.v ?? 0 };
      }
    }
  }

  /**
   * Activate or deactivate a property animation (stopwatch toggle).
   * - If no keyframes exist yet, creates a track and ensures a first keyframe is created
   *   at the provided time (or current timeline time) with the current value.
   * - If keyframes exist and the track is active, deactivates (preserves keyframes for later).
   * - If keyframes exist and the track is inactive, re-activates and creates a first keyframe if needed.
   */
  static toggleProperty(obj: any, prop: string, currentValue: number, time?: number): boolean {
    this.init(obj);
    const raw = obj.keyframes[prop];
    // No existing track yet: create one and seed with a first keyframe at current time
    if (!raw || (!raw.keyframes && !Array.isArray(raw))) {
      obj.keyframes[prop] = {
        keyframes: [],
        active: true,
        defaultValue: currentValue
      } as any;
      const t = this.getCurrentTimeFromContext(obj, time);
      this.ensureKeyframeAtTime(obj, prop, t, currentValue, 'linear');
      return true;
    }

    // If old-format (array), migrate to new track format so subsequent edits persist
    if (Array.isArray(raw)) {
      obj.keyframes[prop] = { keyframes: raw, active: raw.length > 0, defaultValue: raw[0]?.v ?? 0 };
      // refresh raw/track references
      const updated = obj.keyframes[prop];
      // Proceed with the updated track
      const track = this.normalizeTrack(updated);
      // Use the rest of the logic with the updated track below
      if (track.active) {
        track.active = false;
        return false;
      } else {
        track.active = true;
        if (!track.keyframes || track.keyframes.length === 0) {
          const t = this.getCurrentTimeFromContext(obj, time);
          track.keyframes.push({ t, v: currentValue, interp: 'linear' });
        }
        return true;
      }
    }

    // Normalize track to inspect/modify activation state
    const track = this.normalizeTrack(raw);
    if (track.active) {
      // Deactivate: preserve keyframes but mark as inactive
      track.active = false;
      return false;
    } else {
      // Activate: ensure we have at least one keyframe if needed
      track.active = true;
      if (!track.keyframes || track.keyframes.length === 0) {
        const t = this.getCurrentTimeFromContext(obj, time);
        track.keyframes.push({ t, v: currentValue, interp: 'linear' });
      }
      return true;
    }
  }

  /**
   * Check if a property is active (has keyframes or is enabled)
   */
  static isPropertyActive(obj: any, prop: string): boolean {
    if (!obj.keyframes?.[prop]) return false;
    const track = this.normalizeTrack(obj.keyframes[prop]);
    return track.active;
  }

  /**
   * Auto-key: set value at current time
   * If property is active, creates/updates keyframe automatically
   * If property is not active, just sets the value (no keyframe)
   */
  static setValue(obj: any, prop: string, value: number, time: number): void {
    this.init(obj);

    const raw = obj.keyframes[prop];
    const track = this.normalizeTrack(raw);

    if (!track.active) {
      // Property not active — just set value, no keyframe
      obj[prop] = value;
      return;
    }

    // Ensure we're using the new format
    if (Array.isArray(raw)) {
      obj.keyframes[prop] = { keyframes: raw, active: true, defaultValue: raw[0]?.v ?? 0 };
    }

    const currentTrack = obj.keyframes[prop];
    obj[prop] = value;

    // Resolve current time robustly
    const t = this.getCurrentTimeFromContext(obj, time);

    // Find if there's a keyframe at this time
    const idx = currentTrack.keyframes.findIndex((kf: KeyframePoint) => Math.abs(kf.t - t) < 0.05);

    if (idx !== -1) {
      // Update existing keyframe
      currentTrack.keyframes[idx].v = value;
    } else {
      // Create new keyframe
      currentTrack.keyframes.push({ t, v: value, interp: currentTrack.keyframes[0]?.interp || 'linear' });
      currentTrack.keyframes.sort((a: KeyframePoint, b: KeyframePoint) => a.t - b.t);
    }
  }

  /**
   * Get interpolated value at a given time
   */
  static getValueAtTime(obj: any, prop: string, time: number): number | null {
    if (!obj.keyframes?.[prop]) return null;
    const track = this.normalizeTrack(obj.keyframes[prop]);
    if (!track.active) return null;

    const kfs = track.keyframes;
    if (!kfs || kfs.length === 0) return track.defaultValue ?? null;

    // Before first keyframe
    if (time <= kfs[0].t) return kfs[0].v;
    // After last keyframe
    if (time >= kfs[kfs.length - 1].t) return kfs[kfs.length - 1].v;

    // Find surrounding keyframes
    let prev = kfs[0];
    let next = kfs[kfs.length - 1];
    for (let i = 0; i < kfs.length - 1; i++) {
      if (kfs[i].t <= time && kfs[i + 1].t >= time) {
        prev = kfs[i];
        next = kfs[i + 1];
        break;
      }
    }

    // Hold interpolation — snap to previous value
    if (prev.interp === 'hold') return prev.v;

    // Linear interpolation
    const duration = next.t - prev.t;
    if (duration === 0) return prev.v;
    const tt = time - prev.t;
    const t = duration > 0 ? tt / duration : 0;

    // Ease in-out
    if (prev.interp === 'ease-in-out' || next.interp === 'ease-in-out') {
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      return prev.v + (next.v - prev.v) * eased;
    }

    // Ease in
    if (prev.interp === 'ease-in') {
      const eased = t * t;
      return prev.v + (next.v - prev.v) * eased;
    }

    // Ease out
    if (next.interp === 'ease-out') {
      const eased = 1 - Math.pow(1 - t, 2);
      return prev.v + (next.v - prev.v) * eased;
    }

    // Default: linear
    return prev.v + (next.v - prev.v) * t;
  }

  /**
   * Check if there's a keyframe at a specific time
   */
  static hasKeyframeAtTime(obj: any, prop: string, time: number): boolean {
    if (!obj.keyframes?.[prop]) return false;
    const track = this.normalizeTrack(obj.keyframes[prop]);
    return track.keyframes.some((kf: KeyframePoint) => Math.abs(kf.t - time) < 0.05);
  }

  /**
   * Check if property has any keyframes
   */
  static hasKeyframes(obj: any, prop: string): boolean {
    if (!obj.keyframes?.[prop]) return false;
    const track = this.normalizeTrack(obj.keyframes[prop]);
    return track.keyframes.length > 0;
  }

  /**
   * Get the nearest keyframe time to a given time
   */
  static getNearestKeyframeTime(obj: any, prop: string, time: number): number | null {
    if (!obj.keyframes?.[prop]) return null;
    const track = this.normalizeTrack(obj.keyframes[prop]);
    const kfs = track.keyframes;
    if (kfs.length === 0) return null;

    let nearest = kfs[0];
    let minDist = Math.abs(kfs[0].t - time);
    for (const kf of kfs) {
      const dist = Math.abs(kf.t - time);
      if (dist < minDist) {
        minDist = dist;
        nearest = kf;
      }
    }
    return nearest.t;
  }

  /**
   * Delete keyframe at a specific time
   */
  static deleteKeyframeAtTime(obj: any, prop: string, time: number): boolean {
    if (!obj.keyframes?.[prop]) return false;
    const track = this.normalizeTrack(obj.keyframes[prop]);
    const idx = track.keyframes.findIndex((kf: KeyframePoint) => Math.abs(kf.t - time) < 0.05);
    if (idx === -1) return false;

    track.keyframes.splice(idx, 1);
    if (track.keyframes.length === 0) {
      track.active = false;
      delete obj.keyframes[prop];
    }
    return true;
  }

  /**
   * Set interpolation type for a keyframe
   */
  static setInterpolation(obj: any, prop: string, time: number, interp: InterpolationType): void {
    if (!obj.keyframes?.[prop]) return;
    const track = this.normalizeTrack(obj.keyframes[prop]);
    const kf = track.keyframes.find((k: KeyframePoint) => Math.abs(k.t - time) < 0.05);
    if (kf) kf.interp = interp;
  }

  /** Ensure a keyframe exists at a given time for a property, with a given value. */
  static ensureKeyframeAtTime(obj: any, prop: string, time: number, value: number, interp: InterpolationType = 'linear'): void {
    this.init(obj);
    if (!obj.keyframes[prop]) {
      obj.keyframes[prop] = { keyframes: [], active: true, defaultValue: value } as any;
    }
    const raw = obj.keyframes[prop];
    const track = this.normalizeTrack(raw);
    if (!track.keyframes) track.keyframes = [];
    const idx = track.keyframes.findIndex((kf: KeyframePoint) => Math.abs(kf.t - time) < 0.01);
    if (idx >= 0) {
      track.keyframes[idx].v = value;
      track.keyframes[idx].interp = interp;
    } else {
      track.keyframes.push({ t: time, v: value, interp });
      track.keyframes.sort((a: KeyframePoint, b: KeyframePoint) => a.t - b.t);
    }
  }

  /**
   * Copy keyframes from one object/property to another
   */
  static copyKeyframes(source: any, sourceProp: string, target: any, targetProp: string, timeOffset: number = 0): void {
    if (!source.keyframes?.[sourceProp]) return;
    this.init(target);
    const sourceTrack = this.normalizeTrack(source.keyframes[sourceProp]);
    target.keyframes[targetProp] = {
      keyframes: sourceTrack.keyframes.map((kf: KeyframePoint) => ({ ...kf, t: kf.t + timeOffset })),
      active: true,
      defaultValue: sourceTrack.defaultValue
    };
  }

  /**
   * Get all keyframe times for a property
   */
  static getKeyframeTimes(obj: any, prop: string): number[] {
    if (!obj.keyframes?.[prop]) return [];
    const track = this.normalizeTrack(obj.keyframes[prop]);
    return track.keyframes.map((kf: KeyframePoint) => kf.t);
  }

  /**
   * Get all active properties on an object
   */
  static getActiveProperties(obj: any): string[] {
    if (!obj.keyframes) return [];
    return Object.keys(obj.keyframes).filter(prop => {
      const track = this.normalizeTrack(obj.keyframes[prop]);
      return track.active;
    });
  }
}
