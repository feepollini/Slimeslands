export interface CollisionResult { x: number; y: number; collided: boolean; }

export class CollisionEngine {
  private objects: any[];

  constructor(objects: any[]) {
    this.objects = objects;
  }

  resolveCollision(player: any, newX: number, newY: number): CollisionResult {
    let finalX = newX;
    let finalY = newY;
    let collided = false;
    const pw = player.w || 50;
    const ph = player.h || 50;

    for (const obj of this.objects) {
      if (obj.id === player.id) continue;
      const isCollisionObj = obj.type === 'collision' || (obj.type === 'vector' && (obj._targetType === 'collision' || obj.collisionMode !== undefined));
      if (!isCollisionObj) continue;
      if (obj.isVisible === false) continue;
      if (obj.isEnabled === false) continue; // Skip disabled collision

      let hit = false;
      let pushX = 0;
      let pushY = 0;

      if (obj.points && obj.points.length > 0) {
        const result = this.resolveVectorCollision(finalX, finalY, pw, ph, obj);
        hit = result.hit;
        pushX = result.pushX;
        pushY = result.pushY;
      } else {
        // Se tem parent morph, usar dimensões do parent
        let parentObj: any = null;
        if (obj.parentId) {
          parentObj = this.objects.find((o: any) => o.id === obj.parentId);
        }
        
        const useW = parentObj ? parentObj.w : obj.w;
        const useH = parentObj ? parentObj.h : obj.h;
        const useX = parentObj ? parentObj.x : obj.x;
        const useY = parentObj ? parentObj.y : obj.y;
        
        const scale = (obj.collisionScale || 100) / 100;
        const ow = useW * scale;
        const oh = useH * scale;
        const ox = useX + (useW - ow) / 2;
        const oy = useY + (useH - oh) / 2;

        if (this.shapeOverlap(finalX, finalY, pw, ph, ox, oy, ow, oh, obj.shape || 'rect')) {
          hit = true;
          const overlapLeft = (finalX + pw) - ox;
          const overlapRight = (ox + ow) - finalX;
          const overlapTop = (finalY + ph) - oy;
          const overlapBottom = (oy + oh) - finalY;
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

          if (minOverlap === overlapLeft) pushX = -overlapLeft;
          else if (minOverlap === overlapRight) pushX = overlapRight;
          else if (minOverlap === overlapTop) pushY = -overlapTop;
          else pushY = overlapBottom;
        }
      }

      if (hit) {
        collided = true;
        if (obj.collisionMode === 'total' || (obj.collisionMode === 'partial' && !(obj.collisionExcluded || []).includes(player.id))) {
          finalX += pushX;
          finalY += pushY;
        }
      }
    }

    return { x: finalX, y: finalY, collided };
  }

  private resolveVectorCollision(px: number, py: number, pw: number, ph: number, obj: any): { hit: boolean; pushX: number; pushY: number } {
    const pts = obj.points;
    if (!pts || pts.length < 2) return { hit: false, pushX: 0, pushY: 0 };

    const pcx = px + pw / 2;
    const pcy = py + ph / 2;
    // Proper radius for rectangle: distance from center to corner
    const playerRadius = Math.sqrt((pw / 2) ** 2 + (ph / 2) ** 2);
    const buffer = 3;

    // Find the nearest edge segment and the closest point on it
    let nearestDist = Infinity;
    let bestNx = 0;
    let bestNy = 0;

    const edgeCount = obj.isClosed ? pts.length : pts.length - 1;
    for (let i = 0; i < edgeCount; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];

      // Project player center onto segment
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      let t = lenSq > 0 ? ((pcx - a.x) * dx + (pcy - a.y) * dy) / lenSq : 0;
      t = Math.max(0, Math.min(1, t));

      const projX = a.x + t * dx;
      const projY = a.y + t * dy;
      const dist = Math.hypot(pcx - projX, pcy - projY);

      if (dist < nearestDist) {
        nearestDist = dist;

        // Normal perpendicular to edge
        let nx = -dy;
        let ny = dx;
        const nLen = Math.hypot(nx, ny);
        if (nLen > 0) { nx /= nLen; ny /= nLen; }

        // Make normal point from edge TOWARD player center
        if (nx * (pcx - projX) + ny * (pcy - projY) < 0) {
          nx = -nx;
          ny = -ny;
        }
        bestNx = nx;
        bestNy = ny;
      }
    }

    const isClosed = obj.isClosed;
    const isInside = isClosed ? this.pointInPolygon(pcx, pcy, pts) : false;

    if (isInside) {
      // Player is INSIDE polygon: push OUT through nearest edge
      // The normal currently points toward player center (inward)
      // We need to push in the OPPOSITE direction (outward)
      return {
        hit: true,
        pushX: -bestNx * (nearestDist + buffer),
        pushY: -bestNy * (nearestDist + buffer),
      };
    }

    // Player is OUTSIDE: check if player circle overlaps the boundary
    const effectiveRadius = playerRadius + buffer;
    if (nearestDist < effectiveRadius) {
      // Normal points from edge toward player center (outward from collision)
      const pushAmount = effectiveRadius - nearestDist;
      return {
        hit: true,
        pushX: bestNx * pushAmount,
        pushY: bestNy * pushAmount,
      };
    }

    return { hit: false, pushX: 0, pushY: 0 };
  }

  private pointInPolygon(px: number, py: number, pts: any[]): boolean {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i].x, yi = pts[i].y;
      const xj = pts[j].x, yj = pts[j].y;
      const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  private pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
  }

  private polygonCenter(pts: any[]): { x: number; y: number } {
    let cx = 0, cy = 0;
    for (const p of pts) { cx += p.x; cy += p.y; }
    return { x: cx / pts.length, y: cy / pts.length };
  }

  private shapeOverlap(px: number, py: number, pw: number, ph: number, ox: number, oy: number, ow: number, oh: number, shape: string): boolean {
    switch (shape) {
      case 'circle': {
        const pcx = px + pw / 2;
        const pcy = py + ph / 2;
        const ocx = ox + ow / 2;
        const ocy = oy + oh / 2;
        const r = Math.min(ow, oh) / 2;
        return Math.hypot(pcx - ocx, pcy - ocy) < r + Math.max(pw, ph) / 2;
      }
      case 'triangle': {
        const tri = [
          { x: ox + ow / 2, y: oy },
          { x: ox + ow, y: oy + oh },
          { x: ox, y: oy + oh },
        ];
        return this.rectIntersectsPolygon(px, py, pw, ph, tri);
      }
      case 'capsule': {
        const r = Math.min(ow, oh) / 2;
        const pcx = px + pw / 2;
        const pcy = py + ph / 2;
        const dist = this.pointToSegmentDist(pcx, pcy, ox + r, oy + oh / 2, ox + ow - r, oy + oh / 2);
        return dist < r + Math.max(pw, ph) / 2;
      }
      case 'shape_l':
      case 'shape_t':
      case 'shape_u':
      case 'cross': {
        const pts = this.getShapePoints(shape, ox, oy, ow, oh);
        return this.rectIntersectsPolygon(px, py, pw, ph, pts);
      }
      default:
        return px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy;
    }
  }

  private rectIntersectsPolygon(rx: number, ry: number, rw: number, rh: number, pts: { x: number; y: number }[]): boolean {
    const rectCorners = [
      { x: rx, y: ry },
      { x: rx + rw, y: ry },
      { x: rx + rw, y: ry + rh },
      { x: rx, y: ry + rh },
    ];

    for (const corner of rectCorners) {
      if (this.pointInPolygon(corner.x, corner.y, pts)) return true;
    }

    const polyCenter = this.polygonCenter(pts);
    if (polyCenter.x >= rx && polyCenter.x <= rx + rw && polyCenter.y >= ry && polyCenter.y <= ry + rh) return true;

    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      for (let j = 0; j < 4; j++) {
        const c = rectCorners[j];
        const d = rectCorners[(j + 1) % 4];
        if (this.segmentsIntersect(a, b, c, d)) return true;
      }
    }

    return false;
  }

  private segmentsIntersect(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }, d: { x: number; y: number }): boolean {
    const cross = (p1: any, p2: any, p3: any) => (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    return Math.sign(cross(a, b, c)) !== Math.sign(cross(a, b, d)) && Math.sign(cross(c, d, a)) !== Math.sign(cross(c, d, b));
  }

  private getShapePoints(shape: string, ox: number, oy: number, ow: number, oh: number): { x: number; y: number }[] {
    switch (shape) {
      case 'shape_l': {
        const t = Math.min(ow, oh) * 0.35;
        return [
          { x: ox, y: oy }, { x: ox + t, y: oy }, { x: ox + t, y: oy + oh - t },
          { x: ox + ow, y: oy + oh - t }, { x: ox + ow, y: oy + oh }, { x: ox, y: oy + oh },
        ];
      }
      case 'shape_t': {
        const t = Math.min(ow, oh) * 0.35;
        return [
          { x: ox, y: oy }, { x: ox + ow, y: oy }, { x: ox + ow, y: oy + t },
          { x: ox + ow / 2 + t / 2, y: oy + t }, { x: ox + ow / 2 + t / 2, y: oy + oh },
          { x: ox + ow / 2 - t / 2, y: oy + oh }, { x: ox + ow / 2 - t / 2, y: oy + t },
          { x: ox, y: oy + t },
        ];
      }
      case 'shape_u': {
        const t = Math.min(ow, oh) * 0.3;
        return [
          { x: ox, y: oy }, { x: ox + t, y: oy }, { x: ox + t, y: oy + oh - t },
          { x: ox + ow - t, y: oy + oh - t }, { x: ox + ow - t, y: oy },
          { x: ox + ow, y: oy }, { x: ox + ow, y: oy + oh }, { x: ox, y: oy + oh },
        ];
      }
      case 'cross': {
        const t = Math.min(ow, oh) * 0.35;
        return [
          { x: ox + ow / 2 - t / 2, y: oy }, { x: ox + ow / 2 + t / 2, y: oy },
          { x: ox + ow / 2 + t / 2, y: oy + oh / 2 - t / 2 }, { x: ox + ow, y: oy + oh / 2 - t / 2 },
          { x: ox + ow, y: oy + oh / 2 + t / 2 }, { x: ox + ow / 2 + t / 2, y: oy + oh / 2 + t / 2 },
          { x: ox + ow / 2 + t / 2, y: oy + oh }, { x: ox + ow / 2 - t / 2, y: oy + oh },
          { x: ox + ow / 2 - t / 2, y: oy + oh / 2 + t / 2 }, { x: ox, y: oy + oh / 2 + t / 2 },
          { x: ox, y: oy + oh / 2 - t / 2 }, { x: ox + ow / 2 - t / 2, y: oy + oh / 2 - t / 2 },
        ];
      }
      default:
        return [{ x: ox, y: oy }, { x: ox + ow, y: oy }, { x: ox + ow, y: oy + oh }, { x: ox, y: oy + oh }];
    }
  }

  checkWalkableZone(px: number, py: number, pw: number, ph: number): { allowed: boolean; zone: any | null } {
    const centerX = px + pw / 2;
    const centerY = py + ph / 2;

    for (const obj of this.objects) {
      const isAreaObj = obj.type === 'area' || obj.type === 'area_sensor' || (obj.type === 'vector' && (obj._targetType === 'area_sensor' || obj.navType !== undefined));
      if (!isAreaObj) continue;
      if (obj.navType !== 'walkable' && obj.navType !== 'route') continue;
      if (obj.isVisible === false) continue;

      if (obj.points && obj.points.length > 0 && obj.isClosed) {
        if (this.pointInPolygon(centerX, centerY, obj.points)) {
          return { allowed: true, zone: obj };
        }
      } else {
        // Se tem parent morph, usar dimensões do parent
        let parentObj: any = null;
        if (obj.parentId) {
          parentObj = this.objects.find((o: any) => o.id === obj.parentId);
        }
        
        const useX = parentObj ? parentObj.x : obj.x;
        const useY = parentObj ? parentObj.y : obj.y;
        const useW = parentObj ? parentObj.w : obj.w;
        const useH = parentObj ? parentObj.h : obj.h;
        
        if (centerX >= useX && centerX <= useX + useW && centerY >= useY && centerY <= useY + useH) {
          return { allowed: true, zone: obj };
        }
      }
    }

    return { allowed: false, zone: null };
  }
}
