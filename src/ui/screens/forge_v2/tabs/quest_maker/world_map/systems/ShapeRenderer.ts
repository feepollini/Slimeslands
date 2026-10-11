export class ShapeRenderer {
  private zoom: number;

  constructor(zoom: number) {
    this.zoom = zoom;
  }

  drawPrimitiveShape(ctx: CanvasRenderingContext2D, o: any, animW: number, animH: number, isSensor: boolean = false, animAlpha: number = 1) {
    const shape = o.shape || 'rect';
    const colMode = o.collisionMode || 'total';
    const fillColor = colMode === 'total' ? 'rgba(255,68,68,0.25)' : 'rgba(255,165,0,0.25)';
    const strokeColor = colMode === 'total' ? '#ff4444' : '#ffa500';
    const sensorColor = 'rgba(68,204,255,0.2)';
    const sensorStroke = '#44ccff';

    const fc = isSensor ? sensorColor : fillColor;
    const sc = isSensor ? sensorStroke : strokeColor;

    ctx.fillStyle = fc;
    ctx.strokeStyle = sc;
    ctx.lineWidth = 2 / this.zoom;
    ctx.setLineDash(colMode === 'partial' ? [6, 4] : []);

    this.drawShapePath(ctx, shape, animW, animH);

    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    if (isSensor) {
      const sensorR = o.sensorRadius || Math.max(animW, animH) * 0.6;
      ctx.strokeStyle = 'rgba(68,204,255,0.35)';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.setLineDash([6, 3]);
      ctx.beginPath();
      ctx.arc(animW / 2, animH / 2, sensorR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(68,204,255,0.06)';
      ctx.fill();
      ctx.fillStyle = '#44ccff';
      ctx.font = `bold ${Math.max(10, 14 / this.zoom)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('📡', animW / 2, animH / 2);
    }
  }

  drawAreaShape(ctx: CanvasRenderingContext2D, o: any, animW: number, animH: number) {
    const shape = o.shape || 'rect';
    const navType = o.navType || 'walkable';
    const navColors: any = { walkable: 'rgba(68,255,68,0.15)', route: 'rgba(68,204,255,0.15)', restricted: 'rgba(255,68,68,0.15)' };
    const navStroke: any = { walkable: '#44ff44', route: '#44ccff', restricted: '#ff4444' };
    const navIcons: any = { walkable: '🚶', route: '🛤️', restricted: '🚫' };

    ctx.fillStyle = navColors[navType] || 'rgba(68,255,68,0.15)';
    ctx.strokeStyle = navStroke[navType] || '#44ff44';
    ctx.lineWidth = 2 / this.zoom;
    ctx.setLineDash([10, 6]);

    this.drawShapePath(ctx, shape, animW, animH);

    ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = navStroke[navType] || '#44ff44';
    ctx.font = `bold ${Math.max(10, 14 / this.zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(navIcons[navType] || '🧭', animW / 2, animH / 2);
  }

  drawVectorShape(ctx: CanvasRenderingContext2D, o: any, animAlpha: number) {
    const pts = o.points;
    if (!pts || pts.length === 0) return;

    const isColVector = o._targetType === 'collision' || o.collisionMode !== undefined;
    const isAreaVector = o._targetType === 'area_sensor' || o.navType !== undefined;

    if (isColVector) {
      ctx.fillStyle = o.collisionMode === 'total' ? 'rgba(255,68,68,0.2)' : 'rgba(255,165,0,0.2)';
      ctx.strokeStyle = '#ff4444';
    } else if (isAreaVector) {
      ctx.fillStyle = 'rgba(68,204,255,0.1)';
      ctx.strokeStyle = '#44ccff';
    } else {
      ctx.fillStyle = o.color;
      ctx.strokeStyle = o.color;
    }

    ctx.lineWidth = 2 / this.zoom;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(pts[0].x - o.x, pts[0].y - o.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x - o.x, pts[i].y - o.y);
    }

    if (o.isClosed) {
      ctx.closePath();
      ctx.globalAlpha = 0.3 * animAlpha;
      ctx.fill();
      ctx.globalAlpha = animAlpha;
    }
    ctx.stroke();

    // Draw nodes
    pts.forEach((p: any, i: number) => {
      const isFirst = i === 0;
      const isClosed = o.isClosed;
      const isLast = i === pts.length - 1 && !isClosed;
      const s = (isFirst ? 10 : (isLast ? 7 : 5)) / this.zoom;

      // Glow for first node (closing indicator)
      if (isFirst && !isClosed && pts.length >= 2) {
          ctx.save();
          ctx.shadowColor = '#4cff88';
          ctx.shadowBlur = 12 / this.zoom;
          ctx.fillStyle = 'rgba(76,255,136,0.4)';
          ctx.beginPath();
          ctx.arc(p.x - o.x, p.y - o.y, s * 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
      }

      ctx.fillStyle = isFirst ? '#4cff88' : (isClosed ? '#51c5ff' : '#fff');
      ctx.fillRect(p.x - o.x - s / 2, p.y - o.y - s / 2, s, s);
      ctx.strokeStyle = isFirst ? '#4cff88' : '#000';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.strokeRect(p.x - o.x - s / 2, p.y - o.y - s / 2, s, s);
    });
  }

  drawBrushShape(ctx: CanvasRenderingContext2D, o: any, animAlpha: number) {
    const pts = o.points;
    if (!pts || pts.length < 2) return;

    const isCol = o._targetType === 'collision' || o.collisionMode !== undefined;
    const strokeColor = isCol ? '#ff4444' : '#44ccff';

    // Draw filled path (brush stroke)
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 8 / this.zoom;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.globalAlpha = animAlpha * 0.6;

    ctx.beginPath();
    ctx.moveTo(pts[0].x - o.x, pts[0].y - o.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x - o.x, pts[i].y - o.y);
    }
    ctx.stroke();

    // Thinner center line
    ctx.lineWidth = 3 / this.zoom;
    ctx.globalAlpha = animAlpha;
    ctx.beginPath();
    ctx.moveTo(pts[0].x - o.x, pts[0].y - o.y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x - o.x, pts[i].y - o.y);
    }
    ctx.stroke();
  }

  private drawShapePath(ctx: CanvasRenderingContext2D, shape: string, w: number, h: number) {
    ctx.beginPath();
    switch (shape) {
      case 'rect':
        ctx.rect(0, 0, w, h);
        break;
      case 'square': {
        const size = Math.min(w, h);
        ctx.rect((w - size) / 2, (h - size) / 2, size, size);
        break;
      }
      case 'circle':
        ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
        break;
      case 'triangle':
        ctx.moveTo(w / 2, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        break;
      case 'capsule': {
        const r = Math.min(w, h) / 2;
        ctx.moveTo(r, 0);
        ctx.lineTo(w - r, 0);
        ctx.arc(w - r, r, r, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(r, h);
        ctx.arc(r, r, r, Math.PI / 2, Math.PI * 1.5);
        ctx.closePath();
        break;
      }
      case 'line':
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        break;
      case 'shape_l': {
        const t = Math.min(w, h) * 0.35;
        ctx.moveTo(0, 0);
        ctx.lineTo(t, 0);
        ctx.lineTo(t, h - t);
        ctx.lineTo(w, h - t);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        break;
      }
      case 'shape_t': {
        const t = Math.min(w, h) * 0.35;
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, t);
        ctx.lineTo(w / 2 + t / 2, t);
        ctx.lineTo(w / 2 + t / 2, h);
        ctx.lineTo(w / 2 - t / 2, h);
        ctx.lineTo(w / 2 - t / 2, t);
        ctx.lineTo(0, t);
        ctx.closePath();
        break;
      }
      case 'shape_u': {
        const t = Math.min(w, h) * 0.3;
        ctx.moveTo(0, 0);
        ctx.lineTo(t, 0);
        ctx.lineTo(t, h - t);
        ctx.lineTo(w - t, h - t);
        ctx.lineTo(w - t, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        break;
      }
      case 'cross': {
        const t = Math.min(w, h) * 0.35;
        ctx.moveTo(w / 2 - t / 2, 0);
        ctx.lineTo(w / 2 + t / 2, 0);
        ctx.lineTo(w / 2 + t / 2, h / 2 - t / 2);
        ctx.lineTo(w, h / 2 - t / 2);
        ctx.lineTo(w, h / 2 + t / 2);
        ctx.lineTo(w / 2 + t / 2, h / 2 + t / 2);
        ctx.lineTo(w / 2 + t / 2, h);
        ctx.lineTo(w / 2 - t / 2, h);
        ctx.lineTo(w / 2 - t / 2, h / 2 + t / 2);
        ctx.lineTo(0, h / 2 + t / 2);
        ctx.lineTo(0, h / 2 - t / 2);
        ctx.lineTo(w / 2 - t / 2, h / 2 - t / 2);
        ctx.closePath();
        break;
      }
      case 'poly':
        ctx.moveTo(0, 0);
        ctx.lineTo(w, 0);
        ctx.lineTo(w, h);
        ctx.lineTo(0, h);
        ctx.closePath();
        break;
      default:
        ctx.rect(0, 0, w, h);
    }
  }
}
