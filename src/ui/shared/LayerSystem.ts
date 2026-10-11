export type InterpolationType = 'linear' | 'hold' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';

export interface BezierHandle {
  x: number;
  y: number;
}

export interface KeyframePoint {
  id: string;
  t: number;
  v: number;
  interp: InterpolationType;
  bezierIn?: BezierHandle;
  bezierOut?: BezierHandle;
  speedIn?: number;
  speedOut?: number;
  continuous?: boolean;
}

export interface PropertyTrack {
  propertyName: string;
  keyframes: KeyframePoint[];
  active: boolean;
  defaultValue: number;
  expression?: string;
}

export interface Layer {
  id: string;
  name: string;
  type: 'image' | 'shape' | 'text' | 'solid' | 'null' | 'camera' | 'audio';
  parentId: string | null;
  childIds: string[];
  artboardId: string;
  
  visible: boolean;
  locked: boolean;
  solo: boolean;
  quality: number;
  
  blendMode: string;
  opacity: number;
  matteMode?: 'add' | 'subtract' | 'intersect' | 'none';
  trackMatteId?: string;
  
  anchorPoint: { x: number; y: number };
  position: { x: number; y: number };
  scale: { x: number; y: number };
  rotation: number;
  skew: number;
  skewAxis: number;
  
  properties: {
    [key: string]: PropertyTrack;
  };
  
  effects: any[];
  masks: any[];
  
  inPoint: number;
  outPoint: number;
  startTime: number;
  duration: number;
  
  assetUrl?: string;
  color?: string;
  source?: any;
}

export interface Composition {
  id: string;
  name: string;
  width: number;
  height: number;
  frameRate: number;
  duration: number;
  resolution: number;
  
  layers: Layer[];
  activeLayerId: string | null;
  
  environment?: any;
  audio?: any;
}

export class LayerSystem {
  private static instance: LayerSystem;
  
  private composition: Composition;
  private selectedLayerIds: Set<string> = new Set();
  private clipboardLayers: Layer[] = [];
  
  private constructor() {
    this.composition = this.createDefaultComposition();
  }
  
  static getInstance(): LayerSystem {
    if (!LayerSystem.instance) {
      LayerSystem.instance = new LayerSystem();
    }
    return LayerSystem.instance;
  }
  
  private createDefaultComposition(): Composition {
    return {
      id: 'comp_' + Date.now(),
      name: 'Composition',
      width: 1920,
      height: 1080,
      frameRate: 30,
      duration: 300,
      resolution: 1,
      layers: [],
      activeLayerId: null
    };
  }
  
  getComposition(): Composition {
    return this.composition;
  }
  
  setComposition(comp: Composition): void {
    this.composition = comp;
  }
  
  createComposition(options: Partial<Composition> = {}): Composition {
    const comp: Composition = {
      id: 'comp_' + Date.now(),
      name: options.name || 'New Composition',
      width: options.width || 1920,
      height: options.height || 1080,
      frameRate: options.frameRate || 30,
      duration: options.duration || 300,
      resolution: options.resolution || 1,
      layers: [],
      activeLayerId: null,
      ...options
    };
    return comp;
  }
  
  addLayer(layer: Partial<Layer>): Layer {
    const newLayer: Layer = {
      id: 'layer_' + Date.now(),
      name: layer.name || 'Layer ' + Date.now().toString().slice(-4),
      type: layer.type || 'image',
      parentId: layer.parentId || null,
      childIds: [],
      artboardId: layer.artboardId || this.composition.id,
      
      visible: layer.visible !== false,
      locked: layer.locked || false,
      solo: layer.solo || false,
      quality: layer.quality || 1,
      
      blendMode: layer.blendMode || 'normal',
      opacity: layer.opacity ?? 1,
      matteMode: layer.matteMode,
      trackMatteId: layer.trackMatteId,
      
      anchorPoint: layer.anchorPoint || { x: 0, y: 0 },
      position: layer.position || { x: 0, y: 0 },
      scale: layer.scale || { x: 100, y: 100 },
      rotation: layer.rotation ?? 0,
      skew: layer.skew ?? 0,
      skewAxis: layer.skewAxis ?? 0,
      
      properties: layer.properties || {},
      effects: layer.effects || [],
      masks: layer.masks || [],
      
      inPoint: layer.inPoint ?? 0,
      outPoint: layer.outPoint ?? this.composition.duration,
      startTime: layer.startTime ?? 0,
      duration: layer.duration ?? this.composition.duration,
      
      assetUrl: layer.assetUrl,
      color: layer.color,
      source: layer.source
    };
    
    if (newLayer.parentId) {
      const parent = this.getLayer(newLayer.parentId);
      if (parent) {
        parent.childIds.push(newLayer.id);
      }
    }
    
    this.composition.layers.push(newLayer);
    return newLayer;
  }
  
  removeLayer(layerId: string): boolean {
    const layer = this.getLayer(layerId);
    if (!layer) return false;
    
    layer.childIds.forEach(childId => {
      const child = this.getLayer(childId);
      if (child) {
        child.parentId = layer.parentId;
        const parent = this.getLayer(layer.parentId!);
        if (parent) {
          parent.childIds.push(childId);
        }
      }
    });
    
    if (layer.parentId) {
      const parent = this.getLayer(layer.parentId);
      if (parent) {
        parent.childIds = parent.childIds.filter(id => id !== layerId);
      }
    }
    
    const idx = this.composition.layers.findIndex(l => l.id === layerId);
    if (idx >= 0) {
      this.composition.layers.splice(idx, 1);
    }
    
    if (this.composition.activeLayerId === layerId) {
      this.composition.activeLayerId = null;
    }
    this.selectedLayerIds.delete(layerId);
    
    return true;
  }
  
  getLayer(layerId: string): Layer | null {
    return this.composition.layers.find(l => l.id === layerId) || null;
  }
  
  getLayers(): Layer[] {
    return this.composition.layers;
  }
  
  getLayersByArtboard(artboardId: string): Layer[] {
    return this.composition.layers.filter(l => l.artboardId === artboardId);
  }
  
  getSelectedLayers(): Layer[] {
    return this.composition.layers.filter(l => this.selectedLayerIds.has(l.id));
  }
  
  selectLayer(layerId: string, addToSelection: boolean = false): void {
    if (!addToSelection) {
      this.selectedLayerIds.clear();
    }
    this.selectedLayerIds.add(layerId);
    this.composition.activeLayerId = layerId;
  }
  
  deselectLayer(layerId: string): void {
    this.selectedLayerIds.delete(layerId);
    if (this.composition.activeLayerId === layerId) {
      this.composition.activeLayerId = this.selectedLayerIds.values().next().value || null;
    }
  }
  
  clearSelection(): void {
    this.selectedLayerIds.clear();
    this.composition.activeLayerId = null;
  }
  
  isLayerSelected(layerId: string): boolean {
    return this.selectedLayerIds.has(layerId);
  }
  
  getSelectedLayerIds(): string[] {
    return Array.from(this.selectedLayerIds);
  }
  
  setLayerParent(childId: string, parentId: string | null): void {
    const child = this.getLayer(childId);
    if (!child) return;
    
    if (child.parentId) {
      const oldParent = this.getLayer(child.parentId);
      if (oldParent) {
        oldParent.childIds = oldParent.childIds.filter(id => id !== childId);
      }
    }
    
    if (parentId) {
      const newParent = this.getLayer(parentId);
      if (newParent && !this.wouldCreateCircularReference(childId, parentId)) {
        child.parentId = parentId;
        newParent.childIds.push(childId);
      }
    } else {
      child.parentId = null;
    }
  }
  
  private wouldCreateCircularReference(childId: string, potentialParentId: string): boolean {
    let current = this.getLayer(potentialParentId);
    while (current) {
      if (current.id === childId) return true;
      current = current.parentId ? this.getLayer(current.parentId) : null;
    }
    return false;
  }
  
  duplicateLayer(layerId: string): Layer | null {
    const original = this.getLayer(layerId);
    if (!original) return null;
    
    const newLayer = this.addLayer({
      ...original,
      name: original.name + ' Copy',
      parentId: original.parentId
    });
    
    newLayer.position = { ...original.position };
    newLayer.scale = { ...original.scale };
    newLayer.properties = JSON.parse(JSON.stringify(original.properties));
    
    return newLayer;
  }
  
  copyLayers(): void {
    this.clipboardLayers = this.getSelectedLayers().map(l => JSON.parse(JSON.stringify(l)));
  }
  
  pasteLayers(): Layer[] {
    const pasted: Layer[] = [];
    const offset = 20;
    
    this.clipboardLayers.forEach((layer, i) => {
      const newLayer = this.addLayer({
        ...layer,
        id: 'layer_' + Date.now() + '_' + i,
        name: layer.name + ' Pasted',
        position: {
          x: layer.position.x + offset,
          y: layer.position.y + offset
        }
      });
      pasted.push(newLayer);
    });
    
    return pasted;
  }
  
  moveLayerUp(layerId: string): void {
    const idx = this.composition.layers.findIndex(l => l.id === layerId);
    if (idx < this.composition.layers.length - 1) {
      const temp = this.composition.layers[idx];
      this.composition.layers[idx] = this.composition.layers[idx + 1];
      this.composition.layers[idx + 1] = temp;
    }
  }
  
  moveLayerDown(layerId: string): void {
    const idx = this.composition.layers.findIndex(l => l.id === layerId);
    if (idx > 0) {
      const temp = this.composition.layers[idx];
      this.composition.layers[idx] = this.composition.layers[idx - 1];
      this.composition.layers[idx - 1] = temp;
    }
  }
  
  moveLayerToTop(layerId: string): void {
    const idx = this.composition.layers.findIndex(l => l.id === layerId);
    if (idx >= 0) {
      const [layer] = this.composition.layers.splice(idx, 1);
      this.composition.layers.push(layer);
    }
  }
  
  moveLayerToBottom(layerId: string): void {
    const idx = this.composition.layers.findIndex(l => l.id === layerId);
    if (idx > 0) {
      const [layer] = this.composition.layers.splice(idx, 1);
      this.composition.layers.unshift(layer);
    }
  }
  
  precomposeLayers(layerIds: string[], newCompName: string): Composition {
    const newComp = this.createComposition({ name: newCompName });
    const selectedLayers = layerIds.map(id => this.getLayer(id)).filter(Boolean) as Layer[];
    
    selectedLayers.forEach(layer => {
      newComp.layers.push({ ...layer, id: 'layer_' + Date.now() + '_' + Math.random() });
    });
    
    return newComp;
  }
  
  getLayerTransformMatrix(layerId: string): DOMMatrix {
    const layer = this.getLayer(layerId);
    if (!layer) return new DOMMatrix();
    
    const matrices: DOMMatrix[] = [];
    let current: Layer | null = layer;
    
    while (current) {
      const m = new DOMMatrix();
      m.translateSelf(current.position.x, current.position.y);
      m.rotateSelf(0, 0, current.rotation);
      m.scaleSelf(current.scale.x / 100, current.scale.y / 100, 1);
      matrices.unshift(m);
      current = current.parentId ? this.getLayer(current.parentId) : null;
    }
    
    let result = new DOMMatrix();
    matrices.forEach(m => result.multiply(m));
    return result;
  }
  
  getLayerWorldPosition(layerId: string): { x: number; y: number } {
    const layer = this.getLayer(layerId);
    if (!layer) return { x: 0, y: 0 };
    
    const matrix = this.getLayerTransformMatrix(layerId);
    const point = matrix.transformPoint(new DOMPoint(0, 0));
    return { x: point.x, y: point.y };
  }
  
  setLayerProperty(layerId: string, propertyName: string, value: any, time?: number): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;
    
    const t = time ?? 0;
    
    if (!layer.properties[propertyName]) {
      layer.properties[propertyName] = {
        propertyName,
        keyframes: [],
        active: false,
        defaultValue: this.getDefaultPropertyValue(propertyName, layer)
      };
    }
    
    const track = layer.properties[propertyName];
    track.active = true;
    
    const existingKf = track.keyframes.find(kf => Math.abs(kf.t - t) < 0.001);
    if (existingKf) {
      existingKf.v = value;
    } else {
      track.keyframes.push({
        id: 'kf_' + Date.now(),
        t,
        v: value,
        interp: 'linear'
      });
      track.keyframes.sort((a, b) => a.t - b.t);
    }
  }
  
  getLayerPropertyValue(layerId: string, propertyName: string, time: number): number {
    const layer = this.getLayer(layerId);
    if (!layer) return 0;
    
    const track = layer.properties[propertyName];
    if (!track || !track.active || track.keyframes.length === 0) {
      return this.getDefaultPropertyValue(propertyName, layer);
    }
    
    const kfs = track.keyframes;
    
    if (time <= kfs[0].t) return kfs[0].v;
    if (time >= kfs[kfs.length - 1].t) return kfs[kfs.length - 1].v;
    
    for (let i = 0; i < kfs.length - 1; i++) {
      const a = kfs[i];
      const b = kfs[i + 1];
      
      if (time >= a.t && time <= b.t) {
        return this.interpolateKeyframes(a, b, time);
      }
    }
    
    return kfs[0].v;
  }
  
  private getDefaultPropertyValue(propertyName: string, layer: Layer): number {
    switch (propertyName) {
      case 'opacity': return layer.opacity * 100;
      case 'rotation': return layer.rotation;
      case 'scaleX': return layer.scale.x;
      case 'scaleY': return layer.scale.y;
      default: return 0;
    }
  }
  
  private interpolateKeyframes(a: KeyframePoint, b: KeyframePoint, time: number): number {
    const duration = b.t - a.t;
    if (duration === 0) return a.v;
    
    const t = (time - a.t) / duration;
    
    switch (a.interp) {
      case 'hold':
        return a.v;
      
      case 'ease-in':
        return a.v + (b.v - a.v) * this.easeIn(t);
      
      case 'ease-out':
        return a.v + (b.v - a.v) * this.easeOut(t);
      
      case 'ease-in-out':
        return a.v + (b.v - a.v) * this.easeInOut(t);
      
      case 'bezier':
        if (a.bezierOut && b.bezierIn) {
          return this.bezierInterpolate(a, b, t);
        }
        return a.v + (b.v - a.v) * t;
      
      default:
        return a.v + (b.v - a.v) * t;
    }
  }
  
  private easeIn(t: number): number {
    return t * t;
  }
  
  private easeOut(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }
  
  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }
  
  private bezierInterpolate(a: KeyframePoint, b: KeyframePoint, t: number): number {
    const cx = 3 * (a.bezierOut?.x || 0);
    const bx = 3 * (b.bezierIn?.x || 0) - cx;
    const ax = 1 - cx - bx;
    
    const cy = 3 * (a.bezierOut?.y || 0);
    const by = (3 * (b.bezierIn?.y || 0)) - cy;
    void 1 - cy - by;
    
    const x = ax * t * t * t + bx * t * t + cx * t;
    return a.v + (b.v - a.v) * x;
  }
  
  addKeyframe(layerId: string, propertyName: string, time: number, value: number, interp: InterpolationType = 'linear'): KeyframePoint | null {
    const layer = this.getLayer(layerId);
    if (!layer) return null;
    
    if (!layer.properties[propertyName]) {
      layer.properties[propertyName] = {
        propertyName,
        keyframes: [],
        active: true,
        defaultValue: value
      };
    }
    
    const track = layer.properties[propertyName];
    track.active = true;
    
    const existingIdx = track.keyframes.findIndex(kf => Math.abs(kf.t - time) < 0.001);
    if (existingIdx >= 0) {
      track.keyframes[existingIdx].v = value;
      track.keyframes[existingIdx].interp = interp;
      return track.keyframes[existingIdx];
    }
    
    const kf: KeyframePoint = {
      id: 'kf_' + Date.now(),
      t: time,
      v: value,
      interp
    };
    
    track.keyframes.push(kf);
    track.keyframes.sort((a, b) => a.t - b.t);
    
    return kf;
  }
  
  removeKeyframe(layerId: string, propertyName: string, keyframeId: string): boolean {
    const layer = this.getLayer(layerId);
    if (!layer || !layer.properties[propertyName]) return false;
    
    const track = layer.properties[propertyName];
    const idx = track.keyframes.findIndex(kf => kf.id === keyframeId);
    if (idx >= 0) {
      track.keyframes.splice(idx, 1);
      return true;
    }
    return false;
  }
  
  setKeyframeInterpolation(layerId: string, propertyName: string, keyframeId: string, interp: InterpolationType): void {
    const layer = this.getLayer(layerId);
    if (!layer || !layer.properties[propertyName]) return;
    
    const track = layer.properties[propertyName];
    const kf = track.keyframes.find(k => k.id === keyframeId);
    if (kf) {
      kf.interp = interp;
      
      if (interp === 'bezier') {
        kf.speedIn = kf.speedIn ?? 0;
        kf.speedOut = kf.speedOut ?? 0;
      }
    }
  }
  
  setKeyframeBezierHandles(layerId: string, propertyName: string, keyframeId: string, inHandle?: BezierHandle, outHandle?: BezierHandle): void {
    const layer = this.getLayer(layerId);
    if (!layer || !layer.properties[propertyName]) return;
    
    const track = layer.properties[propertyName];
    const kf = track.keyframes.find(k => k.id === keyframeId);
    if (kf) {
      if (inHandle !== undefined) kf.bezierIn = inHandle;
      if (outHandle !== undefined) kf.bezierOut = outHandle;
    }
  }
  
  enableProperty(layerId: string, propertyName: string, enable: boolean = true): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;
    
    if (!layer.properties[propertyName]) {
      layer.properties[propertyName] = {
        propertyName,
        keyframes: [],
        active: enable,
        defaultValue: 0
      };
    } else {
      layer.properties[propertyName].active = enable;
    }
  }
  
  disableProperty(layerId: string, propertyName: string): void {
    this.enableProperty(layerId, propertyName, false);
  }
  
  isPropertyEnabled(layerId: string, propertyName: string): boolean {
    const layer = this.getLayer(layerId);
    if (!layer || !layer.properties[propertyName]) return false;
    return layer.properties[propertyName].active;
  }
  
  getPropertyKeyframes(layerId: string, propertyName: string): KeyframePoint[] {
    const layer = this.getLayer(layerId);
    if (!layer || !layer.properties[propertyName]) return [];
    return layer.properties[propertyName].keyframes;
  }
  
  setLayerExpression(layerId: string, propertyName: string, expression: string): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;
    
    if (!layer.properties[propertyName]) {
      layer.properties[propertyName] = {
        propertyName,
        keyframes: [],
        active: false,
        defaultValue: 0
      };
    }
    
    layer.properties[propertyName].expression = expression;
  }
  
  evaluateExpression(layerId: string, propertyName: string, time: number): number {
    const layer = this.getLayer(layerId);
    if (!layer || !layer.properties[propertyName]) return 0;
    
    const track = layer.properties[propertyName];
    if (track.expression) {
      try {
        const exprFunc = new Function('time', 'layer', 'thisComp', `
          const thisLayer = layer;
          return ${track.expression};
        `);
        return exprFunc.call({}, time, layer, this.composition);
      } catch (e) {
        console.warn('Expression error:', e);
      }
    }
    
    return track.keyframes.length > 0 
      ? this.getLayerPropertyValue(layerId, propertyName, time)
      : track.defaultValue;
  }
  
  addEffect(layerId: string, effectType: string, options: any = {}): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;
    
    layer.effects.push({
      id: 'fx_' + Date.now(),
      type: effectType,
      enabled: true,
      properties: options
    });
  }
  
  removeEffect(layerId: string, effectId: string): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;
    
    layer.effects = layer.effects.filter(fx => fx.id !== effectId);
  }
  
  addMask(layerId: string, maskName: string = 'Mask'): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;
    
    layer.masks.push({
      id: 'mask_' + Date.now(),
      name: maskName,
      enabled: true,
      inverted: false,
      maskMode: 'add',
      points: [],
      feather: 0
    });
  }
  
  removeMask(layerId: string, maskId: string): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;
    
    layer.masks = layer.masks.filter(m => m.id !== maskId);
  }
  
  setSolo(layerId: string, solo: boolean): void {
    const layer = this.getLayer(layerId);
    if (!layer) return;
    layer.solo = solo;
  }
  
  isSoloEnabled(): boolean {
    return this.composition.layers.some(l => l.solo);
  }
  
  getSoloLayers(): Layer[] {
    return this.composition.layers.filter(l => l.solo);
  }
}

export const layerSystem = LayerSystem.getInstance();
