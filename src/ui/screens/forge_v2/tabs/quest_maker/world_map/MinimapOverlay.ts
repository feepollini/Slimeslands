/**
 * MinimapOverlay.ts
 * Minimapa da fase com indicadores de posição
 */

export class MinimapOverlay {
  private state: any = null;
  private _container: HTMLElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private isVisible = true;
  private scale = 0.1;
  private mapWidth = 4000;
  private mapHeight = 2250;

  public render(state: any): string {
    this.state = state;

    return `
      <div id="minimap-overlay" style="
        position: absolute;
        bottom: 20px;
        right: 20px;
        width: 200px;
        height: 120px;
        background: rgba(0, 0, 0, 0.85);
        border: 1px solid rgba(81, 197, 255, 0.3);
        border-radius: 8px;
        overflow: hidden;
        z-index: 100;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      ">
        <canvas id="minimap-canvas" style="width:100%; height:100%; display:block;"></canvas>
        
        <!-- MINIMAP CONTROLS -->
        <div style="
          position: absolute;
          top: 4px;
          left: 4px;
          display: flex;
          gap: 2px;
        ">
          <button id="minimap-zoom-in" style="
            width: 20px; height: 20px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 3px; color: #888; font-size: 0.6rem; cursor: pointer;
          ">+</button>
          <button id="minimap-zoom-out" style="
            width: 20px; height: 20px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 3px; color: #888; font-size: 0.6rem; cursor: pointer;
          ">-</button>
          <button id="minimap-toggle" style="
            width: 20px; height: 20px; background: rgba(0,0,0,0.6); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 3px; color: #888; font-size: 0.6rem; cursor: pointer;
          ">✕</button>
        </div>

        <!-- PHASE NAME -->
        <div style="
          position: absolute;
          bottom: 4px;
          left: 6px;
          font-size: 0.45rem;
          color: rgba(81, 197, 255, 0.8);
          font-weight: 900;
          letter-spacing: 1px;
        ">MAP</div>
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any) {
    this._container = container;
    this.state = state;

    const canvas = container.querySelector('#minimap-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    canvas.width = 200;
    canvas.height = 120;

    container.querySelector('#minimap-zoom-in')?.addEventListener('click', () => {
      this.scale = Math.min(0.3, this.scale + 0.05);
      this.draw();
    });

    container.querySelector('#minimap-zoom-out')?.addEventListener('click', () => {
      this.scale = Math.max(0.05, this.scale - 0.05);
      this.draw();
    });

    container.querySelector('#minimap-toggle')?.addEventListener('click', () => {
      this.isVisible = !this.isVisible;
      const overlay = container.querySelector('#minimap-overlay') as HTMLElement;
      if (overlay) {
        overlay.style.display = this.isVisible ? 'block' : 'none';
      }
    });

    canvas.addEventListener('click', (e: any) => {
      const rect = canvas.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const worldX = (clickX / 200) * this.mapWidth / this.scale;
      const worldY = (clickY / 120) * this.mapHeight / this.scale;
      
      document.dispatchEvent(new CustomEvent('scene-pan-to', {
        detail: { x: worldX, y: worldY }
      }));
    });

    this.startUpdateLoop();
  }

  private startUpdateLoop() {
    const update = () => {
      this.draw();
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  private draw() {
    if (!this.ctx || !this.canvas) return;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#08080c';
    ctx.fillRect(0, 0, w, h);

    const objects = this.state?.worldMapObjects || [];
    const scaledW = this.mapWidth * this.scale;
    const scaledH = this.mapHeight * this.scale;
    const offsetX = (w - scaledW) / 2;
    const offsetY = (h - scaledH) / 2;

    for (const obj of objects) {
      if (obj.isVisible === false) continue;
      if (obj.type === 'collision') continue;

      const x = (obj.x || 0) * this.scale + offsetX;
      const y = (obj.y || 0) * this.scale + offsetY;
      const objW = (obj.w || 50) * this.scale;
      const objH = (obj.h || 50) * this.scale;

      if (obj.type === 'area_sensor') {
        ctx.fillStyle = 'rgba(68, 204, 255, 0.3)';
        ctx.fillRect(x, y, objW, objH);
      } else if (obj.type === 'player') {
        ctx.fillStyle = '#4cff88';
        ctx.beginPath();
        ctx.arc(x + objW/2, y + objH/2, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (obj.type === 'camera') {
        ctx.strokeStyle = 'rgba(81, 197, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, objW, objH);
      } else if (obj.assetUrl) {
        ctx.fillStyle = 'rgba(167, 139, 250, 0.5)';
        ctx.fillRect(x, y, objW, objH);
      }
    }

    const player = objects.find((o: any) => o.type === 'player');
    if (player) {
      const px = (player.x || 0) * this.scale + offsetX + (player.w || 50) * this.scale / 2;
      const py = (player.y || 0) * this.scale + offsetY + (player.h || 50) * this.scale / 2;

      ctx.fillStyle = '#4cff88';
      ctx.shadowColor = '#4cff88';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    ctx.strokeStyle = 'rgba(81, 197, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(offsetX, offsetY, scaledW, scaledH);
  }

  public destroy() {
    const overlay = document.getElementById('minimap-overlay');
    if (overlay) overlay.remove();
  }
}
