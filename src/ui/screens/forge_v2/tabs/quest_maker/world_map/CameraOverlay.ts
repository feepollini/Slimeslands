export class CameraOverlay {
  private state: any;
  private showMenu = false;
  private cameraId: string | null = null;

  constructor(state: any) {
    this.state = state;
  }

  public setCamera(cameraId: string) {
    this.cameraId = cameraId;
  }

  public toggleMenu() {
    this.showMenu = !this.showMenu;
  }

  public hideMenu() {
    this.showMenu = false;
  }

  public render(ctx: CanvasRenderingContext2D, _canvasWidth: number, _canvasHeight: number, objects: any[], zoom: number, panX: number, panY: number) {
    const camera = objects.find((o: any) => o.type === 'camera' && o.id === this.cameraId);
    if (!camera) return;

    // cameraZoom affects the camera SIZE on the map
    const isPortrait = camera.cameraMode !== 'landscape';
    
    // Render position uses the actual camera object size
    const camScreenX = camera.x * zoom + panX;
    const camScreenY = camera.y * zoom + panY;
    const camScreenW = camera.w * zoom;
    const camScreenH = camera.h * zoom;

    ctx.save();

    // Camera frame border (fixed position on screen)
    ctx.strokeStyle = '#ff3366';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.strokeRect(camScreenX, camScreenY, camScreenW, camScreenH);

    // Camera label
    ctx.fillStyle = '#ff3366';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(camera.label || 'Câmera', camScreenX + 4, camScreenY - 4);

    // Tracking mode indicator
    const trackingMode = camera.trackingMode || 'follow_player';
    const modeLabels: Record<string, string> = {
      'follow_player': '👤 Seguindo',
      'fixed': '🔒 Fixo',
      'free': '✋ Livre'
    };
    ctx.fillStyle = '#888';
    ctx.font = '9px sans-serif';
    ctx.fillText(`${modeLabels[trackingMode] || trackingMode}`, camScreenX + 4, camScreenY + camScreenH + 14);

    // Aspect ratio label
    const aspectLabel = isPortrait ? '9:16 Retrato' : '16:9 Paisagem';
    ctx.fillText(aspectLabel, camScreenX + camScreenW - 80, camScreenY + camScreenH + 14);

    // Center crosshair
    const centerX = camScreenX + camScreenW / 2;
    const centerY = camScreenY + camScreenH / 2;
    ctx.strokeStyle = 'rgba(255,51,102,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - 10, centerY);
    ctx.lineTo(centerX + 10, centerY);
    ctx.moveTo(centerX, centerY - 10);
    ctx.lineTo(centerX, centerY + 10);
    ctx.stroke();

    // Rule of thirds grid
    ctx.strokeStyle = 'rgba(255,51,102,0.2)';
    ctx.setLineDash([4, 4]);
    const thirdW = camScreenW / 3;
    const thirdH = camScreenH / 3;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(camScreenX + thirdW * i, camScreenY);
      ctx.lineTo(camScreenX + thirdW * i, camScreenY + camScreenH);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(camScreenX, camScreenY + thirdH * i);
      ctx.lineTo(camScreenX + camScreenW, camScreenY + thirdH * i);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.restore();

    // Render menu if open
    if (this.showMenu) {
      this.renderMenu(ctx, camScreenX, camScreenY, camScreenW, camScreenH, camera);
    }
  }

  private renderMenu(ctx: CanvasRenderingContext2D, cx: number, cy: number, cw: number, ch: number, camera: any) {
    const menuWidth = 200;
    const menuHeight = 200;
    let menuX = cx + cw + 10;
    let menuY = cy;

    // Keep menu on screen
    if (menuX + menuWidth > ctx.canvas.width) {
      menuX = cx - menuWidth - 10;
    }

    ctx.save();
    ctx.fillStyle = 'rgba(13,13,18,0.95)';
    ctx.strokeStyle = 'rgba(255,51,102,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(menuX, menuY, menuWidth, menuHeight, 8);
    ctx.fill();
    ctx.stroke();

    // Title
    ctx.fillStyle = '#ff3366';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('🔧 CÂMERA', menuX + 10, menuY + 20);

    // Tracking modes
    const modes = [
      { id: 'follow_player', label: '👤 Seguir Player', active: camera.trackingMode === 'follow_player' },
      { id: 'fixed', label: '🔒 Fixo', active: camera.trackingMode === 'fixed' },
      { id: 'free', label: '✋ Livre', active: camera.trackingMode === 'free' }
    ];

    ctx.font = '10px sans-serif';
    let yOffset = 45;
    modes.forEach(mode => {
      ctx.fillStyle = mode.active ? '#4cff88' : '#888';
      ctx.fillText(mode.active ? '●' : '○', menuX + 10, menuY + yOffset);
      ctx.fillText(mode.label, menuX + 25, menuY + yOffset);
      yOffset += 20;
    });

    // Camera Zoom control (supports keyframes)
    ctx.fillStyle = '#666';
    ctx.fillText('ZOOM:', menuX + 10, menuY + yOffset + 5);
    yOffset += 20;
    
    const currentZoom = camera.cameraZoom || 1;
    ctx.fillStyle = '#51c5ff';
    ctx.fillText(`${currentZoom.toFixed(1)}x`, menuX + 10, menuY + yOffset);
    
    // Zoom buttons
    ctx.fillStyle = '#333';
    ctx.fillRect(menuX + 50, menuY + yOffset - 12, 20, 16);
    ctx.fillRect(menuX + 75, menuY + yOffset - 12, 20, 16);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText('-', menuX + 57, menuY + yOffset);
    ctx.fillText('+', menuX + 82, menuY + yOffset);
    yOffset += 25;

    // Aspect ratio options
    ctx.fillStyle = '#666';
    ctx.fillText('ASPECT RATIO:', menuX + 10, menuY + yOffset + 5);
    yOffset += 20;
    
    const aspects = [
      { id: 'portrait', label: '9:16 Retrato', active: camera.cameraMode === 'portrait' },
      { id: 'landscape', label: '16:9 Paisagem', active: camera.cameraMode === 'landscape' }
    ];
    aspects.forEach(aspect => {
      ctx.fillStyle = aspect.active ? '#51c5ff' : '#888';
      ctx.fillText(aspect.active ? '●' : '○', menuX + 10, menuY + yOffset);
      ctx.fillText(aspect.label, menuX + 25, menuY + yOffset);
      yOffset += 18;
    });

    ctx.restore();
  }

  public handleClick(x: number, y: number, camera: any, zoom: number, panX: number, panY: number): string | null {
    if (!camera) return null;

    const camScreenX = camera.x * zoom + panX;
    const camScreenY = camera.y * zoom + panY;
    const camScreenW = camera.w * zoom;
    const camScreenH = camera.h * zoom;

    // Check if clicked on menu area
    if (this.showMenu) {
      const menuWidth = 200;
      const menuHeight = 200;
      let menuX = camScreenX + camScreenW + 10;
      if (menuX + menuWidth > 1920) {
        menuX = camScreenX - menuWidth - 10;
      }

      if (x >= menuX && x <= menuX + menuWidth && y >= camScreenY && y <= camScreenY + menuHeight) {
        const yOffset = y - camScreenY;
        
        // Tracking modes
        if (yOffset >= 45 && yOffset <= 60) return 'trackingMode:follow_player';
        if (yOffset >= 65 && yOffset <= 80) return 'trackingMode:fixed';
        if (yOffset >= 85 && yOffset <= 100) return 'trackingMode:free';
        
        // Zoom buttons (- is at menuX+50, + is at menuX+75)
        if (yOffset >= 125 && yOffset <= 140) {
          if (x >= menuX + 50 && x <= menuX + 70) return 'zoom:decrease';
          if (x >= menuX + 75 && x <= menuX + 95) return 'zoom:increase';
        }
        
        // Aspect ratio
        if (yOffset >= 155 && yOffset <= 170) return 'cameraMode:portrait';
        if (yOffset >= 175 && yOffset <= 190) return 'cameraMode:landscape';
      }
    }

    // Toggle menu on camera click
    if (x >= camScreenX && x <= camScreenX + camScreenW && y >= camScreenY && y <= camScreenY + camScreenH) {
      this.showMenu = !this.showMenu;
      return 'toggle_menu';
    }

    return null;
  }
}
