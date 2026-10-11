type Interpolation = 'linear'|'hold'|'ease-in'|'ease-out'|'ease-in-out'
type Keyframe = { t: number; v: number; interp?: Interpolation }
type Track = { prop: string; keyframes: Keyframe[] }
type Layer = { id: string; name: string; tracks: Track[] }
type TimelineState = { layers: Layer[]; currentTime: number; zoom: number }

export class TimelineScene {
  state: TimelineState
  container: HTMLElement | null = null
  currentTime: number
  zoom: number
  clipboard: { layerId: string; prop: string; t: number; v: number; interp?: Interpolation } | null = null
  constructor(state: any) {
    this.state = {
      layers: state?.layers ?? [],
      currentTime: state?.currentTime ?? 0,
      zoom: state?.zoom ?? 40
    }
    this.currentTime = this.state.currentTime
    this.zoom = this.state.zoom
  }

  private toast(_msg: string): void {
    console.log('[TimelineScene]', _msg);
  }

  private _initBridge(): void {
    document.addEventListener('quest_maker:layer_action', (ev: any) => {
      const action = ev?.detail?.action ?? '';
      if (action) this.toast('Layer action: ' + action);
      document.dispatchEvent(new CustomEvent('timeline:refresh'));
    });
  }

  private _initKeyboardShortcuts(): void {
    document.addEventListener('keydown', (ev: KeyboardEvent) => {
      if (ev.key === 'ArrowLeft') {
        this.currentTime = Math.max(0, this.currentTime - 0.25);
        this.state.currentTime = this.currentTime;
        this.render();
        ev.preventDefault();
      } else if (ev.key === 'ArrowRight') {
        this.currentTime += 0.25;
        this.state.currentTime = this.currentTime;
        this.render();
        ev.preventDefault();
      }
    });
  }

  // Expose for future use
  init(): void {
    this._initBridge();
    this._initKeyboardShortcuts();
  }

  // Core API MVP
  addKeyframe(layerId: string, prop: string, t: number, v: number, interp: Interpolation = 'linear') {
    const layer = this.state.layers.find(l => l.id === layerId);
    if (!layer) return;
    let track = layer.tracks.find(tr => tr.prop === prop);
    if (!track) {
      track = { id: 'track_' + Date.now(), prop, keyframes: [] } as Track;
      layer.tracks.push(track);
    }
    const idx = track.keyframes.findIndex(k => Math.abs(k.t - t) < 1e-6);
    if (idx >= 0) track.keyframes[idx] = { t, v, interp };
    else {
      track.keyframes.push({ t, v, interp });
      track.keyframes.sort((a,b)=> a.t - b.t);
    }
    this.toast('Keyframe added');
    this.render();
  }
  setValue(layerId: string, prop: string, value: number, time?: number) {
    this.addKeyframe(layerId, prop, time ?? this.currentTime, value, 'linear');
  }
  getValueAtTime(layerId: string, prop: string, time: number): number | null {
    const layer = this.state.layers.find(l => l.id === layerId); if (!layer) return null;
    const track = layer.tracks.find(t => t.prop === prop); if (!track) return null;
    const kfs = track.keyframes;
    if (!kfs || kfs.length === 0) return null;
    if (time <= kfs[0].t) return kfs[0].v;
    if (time >= kfs[kfs.length-1].t) return kfs[kfs.length-1].v;
    for (let i=0; i<kfs.length-1; i++) {
      const a = kfs[i], b = kfs[i+1];
      if (time >= a.t && time <= b.t) {
        const s = (time - a.t) / (b.t - a.t);
        return a.v + (b.v - a.v) * s;
      }
    }
    return kfs[0].v;
  }
  moveKeyframe(layerId: string, prop: string, idx: number, newTime: number) {
    const layer = this.state.layers.find(l => l.id === layerId); if (!layer) return;
    const track = layer.tracks.find(t => t.prop === prop); if (!track) return;
    if (!track.keyframes[idx]) return;
    track.keyframes[idx].t = newTime;
    track.keyframes.sort((a,b)=> a.t - b.t);
    this.render();
  }
  deleteKeyframe(layerId: string, prop: string, idx: number) {
    const layer = this.state.layers.find(l => l.id === layerId); if (!layer) return;
    const track = layer.tracks.find(t => t.prop === prop); if (!track) return;
    track.keyframes.splice(idx, 1);
    this.render();
  }
  copyKeyframes(layerId: string, prop: string, idx: number) {
    const layer = this.state.layers.find(l => l.id === layerId); if (!layer) return;
    const track = layer.tracks.find(t => t.prop === prop); if (!track) return;
    const kf = track.keyframes[idx]; if (!kf) return;
    this.clipboard = { layerId, prop, t: kf.t, v: kf.v, interp: kf.interp };
    this.toast('Keyframe copied');
  }
  pasteKeyframes(layerId: string, prop: string) {
    if (!this.clipboard) return;
    this.setValue(layerId, prop, this.clipboard.v, this.currentTime);
    this.toast('Keyframe pasted');
  }
  runPatch(): void {}

  render(): string {
    const lines = this.state.layers.map(l => {
      const tracks = l.tracks.map((tr) => {
        const kfs = tr.keyframes ?? [];
        return kfs.map(k => `[${tr.prop}] t=${k.t.toFixed(2)} v=${k.v} ${k.interp ?? ''}`).join(' ')
      }).join(' | ');
      return `Layer ${l.name}: ${tracks}`;
    }).join('\n')
    return `<pre style="font-family: monospace; color:#ddd; background:#111; padding:8px; border-radius:6px;">${lines}\nTime ${this.currentTime.toFixed(2)}s, Zoom ${this.zoom}</pre>`;
  }

  bind(container: HTMLElement) {
    this.container = container;
  }
}
