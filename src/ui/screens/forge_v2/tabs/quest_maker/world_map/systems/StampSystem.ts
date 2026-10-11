import { StampBrushState } from './StampBrushState';

export class StampSystem {
  private state: StampBrushState;
  private objects: any[];

  constructor(state: StampBrushState, objects: any[]) {
    this.state = state;
    this.objects = objects;
  }

  stampAt(wx: number, wy: number) {
    const sb = this.state;
    if (!sb.stampUrl) return;
    const sizeVariation = sb.randomSize > 0 ? (Math.random() - 0.5) * 2 * (sb.randomSize / 100) * sb.size : 0;
    const size = sb.size + sizeVariation;
    const rotation = sb.randomRotation > 0 ? (Math.random() - 0.5) * 2 * sb.randomRotation : 0;
    const scaleX = sb.randomMirrorX && Math.random() > 0.5 ? -1 : 1;
    const scaleY = sb.randomMirrorY && Math.random() > 0.5 ? -1 : 1;

    let stampLayer = this.objects.find((o: any) => o.type === 'stamp_layer');
    if (!stampLayer) {
      stampLayer = {
        id: 'stamp_layer_' + Date.now(),
        type: 'stamp_layer',
        label: 'Camada de Carimbos',
        x: 0, y: 0, w: 1, h: 1,
        isVisible: true, opacity: 1,
        artboardId: 'default', isPersistent: true,
        _stamps: []
      };
      const playerIdx = this.objects.findIndex((o: any) => o.type === 'player');
      if (playerIdx >= 0) {
        this.objects.splice(playerIdx, 0, stampLayer);
      } else {
        this.objects.push(stampLayer);
      }
    }
    if (!stampLayer._stamps) stampLayer._stamps = [];
    stampLayer._stamps.push({ x: wx, y: wy, size, rotation, scaleX, scaleY, url: sb.stampUrl });
  }

  eraseNear(wx: number, wy: number, threshold: number) {
    const stampLayer = this.objects.find((o: any) => o.type === 'stamp_layer');
    if (stampLayer && stampLayer._stamps) {
      stampLayer._stamps = stampLayer._stamps.filter((s: any) => {
        return Math.hypot(s.x - wx, s.y - wy) > threshold;
      });
    }
  }

  placeScene(wx: number, wy: number, sceneIdx: number, savedScenes: any[]) {
    const scene = savedScenes[sceneIdx];
    if (!scene) return;
    const groupId = 'stamp_scene_' + Date.now();
    const offsetX = wx - (scene.objects.reduce((s: number, o: any) => s + (o.x || 0), 0) / (scene.objects.length || 1));
    const offsetY = wy - (scene.objects.reduce((s: number, o: any) => s + (o.y || 0), 0) / (scene.objects.length || 1));

    this.objects.push({
      id: groupId, type: 'group', label: 'Cena: ' + (scene.name || 'Carimbo'),
      _isGroup: true, x: wx, y: wy, w: 1, h: 1,
      isVisible: true, opacity: 1, artboardId: 'default', isPersistent: true,
    });

    scene.objects.forEach((o: any) => {
      const clone = {
        ...JSON.parse(JSON.stringify(o)),
        id: o.id + '_stamp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        x: (o.x || 0) + offsetX,
        y: (o.y || 0) + offsetY,
        groupId: groupId,
        isPersistent: true,
      };
      this.objects.push(clone);
    });
  }
}
