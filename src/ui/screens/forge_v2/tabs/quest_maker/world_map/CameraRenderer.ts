/**
 * Renders objects exactly as the main canvas does, but from the camera's viewport perspective.
 */
export class CameraRenderer {
  private gifAnimators: Map<string, any> = new Map();

  render(
    ctx: CanvasRenderingContext2D,
    canvasW: number,
    canvasH: number,
    objects: any[],
    camera: any,
    state: any
  ): void {
    if (!camera) return;

    const camX = camera.x;
    const camY = camera.y;
    const camW = camera.w;
    const camH = camera.h;

    const zoomX = canvasW / camW;
    const zoomY = canvasH / camH;
    const zoom = Math.min(zoomX, zoomY);

    const panX = -camX * zoom;
    const panY = -camY * zoom;

    ctx.fillStyle = '#0a0a0e';
    ctx.fillRect(0, 0, canvasW, canvasH);

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    for (const o of objects) {
      if (o.type === 'camera' || o.type === 'phase' || o.type === 'group' || o._isGroup) continue;
      if (o.isVisible === false) continue;

      const startTime = o.startTime || o.inPoint || 0;
      const duration = o.duration || 5;
      const outPoint = o.outPoint || (startTime + duration);
      const isVisibleByTime = (state.currentTime >= startTime && state.currentTime <= outPoint);
      const isPersistent = o.isPersistent === true;

      if (!isVisibleByTime && !isPersistent) continue;

      const animX = o.x || 0;
      const animY = o.y || 0;
      const animW = o.w || 50;
      const animH = o.h || 50;
      const animRot = o.rotation || 0;
      const scaleX = (o.scaleX || 1);
      const scaleY = (o.scaleY || 1);
      const pivotX = (o.pivotX !== undefined && o.pivotX !== null) ? o.pivotX : 0.5;
      const pivotY = (o.pivotY !== undefined && o.pivotY !== null) ? o.pivotY : 0.5;

      ctx.save();
      ctx.translate(animX + animW * pivotX, animY + animH * pivotY);
      ctx.rotate(animRot * Math.PI / 180);
      ctx.scale(scaleX, scaleY);
      ctx.translate(-animW * pivotX, -animH * pivotY);

      if (o.type === 'player' || o.type === 'morph' || o.type === 'image') {
        this.drawObjectSprite(ctx, o, animW, animH, state);
      } else if (o.type === 'collision') {
        ctx.fillStyle = '#ff444430';
        ctx.strokeStyle = '#ff444480';
        ctx.lineWidth = 1/zoom;
        ctx.fillRect(0, 0, animW, animH);
        ctx.strokeRect(0, 0, animW, animH);
      } else if (o.type === 'area_sensor') {
        ctx.fillStyle = '#44ccff30';
        ctx.strokeStyle = '#44ccff80';
        ctx.lineWidth = 1/zoom;
        ctx.fillRect(0, 0, animW, animH);
        ctx.strokeRect(0, 0, animW, animH);
      } else if (o.type === 'vector' && o.points) {
        ctx.fillStyle = '#ff950030';
        ctx.strokeStyle = '#ff950080';
        ctx.lineWidth = 1/zoom;
        ctx.beginPath();
        ctx.moveTo(o.points[0].x, o.points[0].y);
        for (let i = 1; i < o.points.length; i++) ctx.lineTo(o.points[i].x, o.points[i].y);
        if (o.isClosed) ctx.closePath();
        ctx.fill(); ctx.stroke();
      } else if (o.type === 'stamp_layer' && o._stamps) {
        for (const s of o._stamps) {
          this.drawStaticImage(ctx, s.url, s.x, s.y, s.size || 50, s.size || 50);
        }
      } else {
        ctx.fillStyle = '#55555530';
        ctx.strokeStyle = '#55555580';
        ctx.lineWidth = 1/zoom;
        ctx.fillRect(0, 0, animW, animH);
        ctx.strokeRect(0, 0, animW, animH);
      }

      ctx.restore();
    }

    // Cinematic Fade Overlay
    if (state.isRunningSequence && state.sequenceAlpha > 0) {
      ctx.fillStyle = `rgba(0, 0, 0, ${state.sequenceAlpha})`;
      ctx.fillRect(0, 0, canvasW, canvasH);
    }

    ctx.restore();
  }

  private drawObjectSprite(ctx: CanvasRenderingContext2D, o: any, w: number, h: number, state: any) {
    const charData = o.charData || {};
    const dir = charData._currentDir || 'down';
    const isMoving = charData._isMoving || false;
    const preferredAction = charData._forceAction || (isMoving ? 'move' : 'idle');
    
    let resolved: any = null;
    const allActions = [preferredAction, 'idle', 'move', 'extra1'];
    const allDirs = [dir, 'down', 'right', 'left', 'up'];

    for (const a of allActions) {
      for (const d of allDirs) {
        resolved = charData[a]?.[d];
        if (resolved) break;
      }
      if (resolved) break;
    }

    let url = resolved ? (resolved.gifUrl || resolved.asset || '') : (o.assetUrl || '');
    if (!url && o.type === 'player') {
      // Robust fallback for player: Bright green outer glow circle
      ctx.save();
      ctx.shadowColor = '#4cff88';
      ctx.shadowBlur = 15;
      ctx.fillStyle = '#4cff88';
      ctx.beginPath();
      ctx.arc(w/2, h/2, w/2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (url) {
      if (url.toLowerCase().endsWith('.gif') || (resolved && resolved.animType === 'gif')) {
        this.drawGif(ctx, url, 0, 0, w, h);
      } else if (resolved && resolved.frames && resolved.frames.length > 1) {
        const fIdx = Math.floor(Date.now() / (resolved.frameRate || 100)) % resolved.frames.length;
        this.drawStaticImage(ctx, resolved.frames[fIdx], 0, 0, w, h);
      } else {
        this.drawStaticImage(ctx, url, 0, 0, w, h);
      }
    }
  }

  private drawStaticImage(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, w: number, h: number) {
    const img = this.getImage(url);
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, x, y, w, h);
    } else {
      // Brighter fallback while loading
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.setLineDash([2, 2]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }

  private drawGif(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, w: number, h: number) {
    // In many browser environments, drawImage(gif) works for the current frame.
    // If not, we might need a more complex animator like RenderPipeline has.
    this.drawStaticImage(ctx, url, x, y, w, h);
  }

  private imageCache: Map<string, HTMLImageElement> = new Map();
  private getImage(url: string): HTMLImageElement {
    if (this.imageCache.has(url)) return this.imageCache.get(url)!;
    const img = new Image();
    img.src = url;
    this.imageCache.set(url, img);
    return img;
  }
}
