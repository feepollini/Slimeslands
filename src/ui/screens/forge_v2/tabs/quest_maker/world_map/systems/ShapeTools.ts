export interface ShapeTools {
  syncVectorBounds(o: any): void;
  resizeObject(obj: any, wx: number, wy: number, handle: string): void;
  getHandleAt(wx: number, wy: number, o: any): string | null;
  toWorldX(sx: number, panX: number, zoom: number): number;
  toWorldY(sy: number, panY: number, zoom: number): number;
  objectAt(wx: number, wy: number, objects: any[]): any | null;
  pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number;
}

export class ShapeToolsImpl implements ShapeTools {
  private handleSize: number;

  constructor(handleSize: number = 8) {
    this.handleSize = handleSize;
  }

  syncVectorBounds(o: any) {
    const pts = o.points;
    if (!pts || pts.length === 0) return;
    const minX = Math.min(...pts.map((p: any) => p.x));
    const minY = Math.min(...pts.map((p: any) => p.y));
    const maxX = Math.max(...pts.map((p: any) => p.x));
    const maxY = Math.max(...pts.map((p: any) => p.y));
    o.x = minX; o.y = minY;
    o.w = Math.max(2, maxX - minX); o.h = Math.max(2, maxY - minY);
  }

  resizeObject(obj: any, wx: number, wy: number, handle: string) {
    if (handle.includes('e')) obj.w = wx - obj.x; if (handle.includes('s')) obj.h = wy - obj.y;
    if (handle.includes('w')) { const d = wx - obj.x; obj.x = wx; obj.w -= d; }
    if (handle.includes('n')) { const d = wy - obj.y; obj.y = wy; obj.h -= d; }
  }

  getHandleAt(wx: number, wy: number, o: any): string | null {
    const hs = (this.handleSize + 4);
    // Note: zoom is applied by caller
    if (Math.abs(wx - o.x) < hs && Math.abs(wy - o.y) < hs) return 'nw';
    if (Math.abs(wx - (o.x + o.w)) < hs && Math.abs(wy - o.y) < hs) return 'ne';
    if (Math.abs(wx - o.x) < hs && Math.abs(wy - (o.y + o.h)) < hs) return 'sw';
    if (Math.abs(wx - (o.x + o.w)) < hs && Math.abs(wy - (o.y + o.h)) < hs) return 'se';
    return null;
  }

  toWorldX(sx: number, panX: number, zoom: number): number { return (sx - panX) / zoom; }
  toWorldY(sy: number, panY: number, zoom: number): number { return (sy - panY) / zoom; }

  objectAt(wx: number, wy: number, objects: any[]): any | null {
    return objects
      .filter((o: any) => o.isVisible !== false)
      .slice()
      .reverse()
      .find((o: any) => {
        const left = Math.min(o.x, o.x + o.w);
        const right = Math.max(o.x, o.x + o.w);
        const top = Math.min(o.y, o.y + o.h);
        const bottom = Math.max(o.y, o.y + o.h);
        return wx >= left && wx <= right && wy >= top && wy <= bottom;
      }) || null;
  }

  pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }
}
