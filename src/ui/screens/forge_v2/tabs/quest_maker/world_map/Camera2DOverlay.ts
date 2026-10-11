export class Camera2DOverlay {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  
  private frameWidth = 360;
  private frameHeight = 720;
  private frameColor = 'rgba(255,215,0,0.5)';
  private fillColor = 'rgba(255,215,0,0.03)';
  private cameraZoom = 2.5;
  
  setContext(ctx: CanvasRenderingContext2D | null) { this.ctx = ctx; }
  setCanvas(canvas: HTMLCanvasElement | null) { this.canvas = canvas; }
  
  setFrameSize(w: number, h: number) {
    this.frameWidth = w;
    this.frameHeight = h;
  }
  
  setCameraZoom(zoom: number) {
    this.cameraZoom = zoom || 2.5;
  }
  
  getCameraZoom(): number {
    return this.cameraZoom;
  }
  
  render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const canvas = this.canvas;
    
    const cw = canvas.width;
    const ch = canvas.height;
    const frameW = this.frameWidth * this.cameraZoom;
    const frameH = this.frameHeight * this.cameraZoom;
    
    const frameX = (cw - frameW) / 2;
    const frameY = (ch - frameH) / 2;
    
    ctx.save();
    
    ctx.strokeStyle = this.frameColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 5]);
    ctx.strokeRect(frameX, frameY, frameW, frameH);
    ctx.setLineDash([]);
    
    ctx.fillStyle = this.fillColor;
    ctx.fillRect(frameX, frameY, frameW, frameH);
    
    ctx.fillStyle = this.frameColor;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`📹 Camera ${this.cameraZoom.toFixed(1)}x`, frameX + 4, frameY + 4);
    
    ctx.restore();
  }
}
