export interface JoystickInput {
  x: number;
  y: number;
  active: boolean;
}

export class VirtualJoystick {
  private container: HTMLElement | null = null;
  private knob: HTMLElement | null = null;
  private base: HTMLElement | null = null;
  private centerBtn: HTMLElement | null = null;
  private callback: (input: JoystickInput) => void = () => {};
  private interactCallback: () => void = () => {};

  private radius = 40;
  private active = false;
  private startX = 0;
  private startY = 0;
  private mouseActive = false;
  private wasDragging = false;
  private dragThreshold = 6;

  constructor() {}

  public setCallback(cb: (input: JoystickInput) => void) {
    this.callback = cb;
  }

  public setInteractCallback(cb: () => void) {
    this.interactCallback = cb;
  }

  public render(): string {
    return `
      <style>
        @keyframes wave1 {
          0% { transform: translate(-10%, -50%); }
          50% { transform: translate(-18%, -50%); }
          100% { transform: translate(-10%, -50%); }
        }
        @keyframes wave2 {
          0% { transform: translate(-5%, -50%); }
          50% { transform: translate(-12%, -50%); }
          100% { transform: translate(-5%, -50%); }
        }
        @keyframes waveH1 {
          0% { transform: translateX(-5%); }
          50% { transform: translateX(5%); }
          100% { transform: translateX(-5%); }
        }
        @keyframes waveH2 {
          0% { transform: translateX(3%); }
          50% { transform: translateX(-3%); }
          100% { transform: translateX(3%); }
        }
        @keyframes sparkle1 {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes sparkle2 {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 0.8; transform: scale(0.8); }
        }
        @keyframes sparkle3 {
          0%, 100% { opacity: 0; transform: scale(0); }
          50% { opacity: 0.6; transform: scale(0.6); }
        }
        @keyframes goldPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }
        @keyframes inkGlow {
          0%, 100% { filter: drop-shadow(0 0 3px rgba(100,60,200,0.5)); }
          50% { filter: drop-shadow(0 0 8px rgba(100,60,200,0.8)); }
        }
        .ds-btn:active {
          transform: scale(0.94) !important;
          filter: brightness(0.75);
        }
        .interact-btn:active {
          transform: translate(-50%, -50%) scale(0.88) !important;
        }
      </style>

      <div id="joystick-wrapper" style="
        display: flex; align-items: center; justify-content: center;
        gap: 16px; padding: 10px;
        margin: 0 auto;
      ">
        <!-- Botão Inventário (Glass Gold - RPG Icon) -->
        <div id="joystick-backpack" class="ds-btn" style="
          width: 56px; height: 56px;
          background: rgba(255,215,0,0.04);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,215,0,0.5);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 0 10px rgba(255,215,0,0.1),
            inset 0 1px 0 rgba(255,215,0,0.15),
            inset 0 -1px 0 rgba(255,215,0,0.05);
          transition: all 0.25s ease;
          flex-shrink: 0;
        ">
          <div style="position:absolute;inset:2px;border:1px solid rgba(255,215,0,0.15);border-radius:8px;pointer-events:none;"></div>
          <div style="position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.7),transparent);pointer-events:none;"></div>
          <div style="position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(180deg,rgba(255,255,255,0.08),transparent);pointer-events:none;border-radius:10px 10px 0 0;"></div>
          <div style="position:absolute;inset:-1px;background:radial-gradient(ellipse at center,rgba(255,215,0,0.06) 0%,transparent 70%);pointer-events:none;animation:goldPulse 3s ease-in-out infinite;"></div>
          <!-- Brilho preto difuso nas bordas -->
          <div style="position:absolute;inset:0;border-radius:10px;box-shadow:inset 0 0 10px rgba(0,0,0,0.8);pointer-events:none;"></div>
          <!-- Escudo RPG -->
          <svg width="24" height="28" viewBox="0 0 24 28" style="position:relative;z-index:2;filter:drop-shadow(0 0 4px rgba(255,215,0,0.5));">
            <path d="M12 1 L22 6 L22 14 Q22 22 12 27 Q2 22 2 14 L2 6 Z" fill="none" stroke="rgba(255,215,0,0.7)" stroke-width="1.5"/>
            <path d="M12 5 L18 8 L18 13 Q18 19 12 23 Q6 19 6 13 L6 8 Z" fill="rgba(255,215,0,0.1)" stroke="rgba(255,215,0,0.3)" stroke-width="0.5"/>
          </svg>
        </div>

        <!-- Joystick (Premium Glass Gold) -->
        <div id="joystick-container" style="
          width: 110px; height: 110px;
          position: relative;
          touch-action: none;
          user-select: none;
          flex-shrink: 0;
        ">
          <div id="joystick-base" style="
            width: 110px; height: 110px;
            border-radius: 50%;
            background: rgba(255,215,0,0.03);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            border: 2px solid rgba(255,215,0,0.4);
            position: absolute;
            box-shadow: 
              0 0 12px rgba(255,215,0,0.08),
              inset 0 1px 0 rgba(255,215,0,0.12),
              inset 0 -1px 0 rgba(255,215,0,0.04);
            overflow: hidden;
          ">
            <div style="position:absolute;inset:4px;border-radius:50%;border:1px solid rgba(255,215,0,0.12);pointer-events:none;"></div>
            <div style="position:absolute;top:1px;left:15%;right:15%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.6),transparent);pointer-events:none;"></div>
            <div style="position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(180deg,rgba(255,255,255,0.06),transparent);pointer-events:none;border-radius:50% 50% 0 0;"></div>
            <!-- Brilho preto difuso nas bordas douradas -->
            <div style="position:absolute;inset:0;border-radius:50%;box-shadow:inset 0 0 12px rgba(0,0,0,0.9), inset 0 0 4px rgba(0,0,0,1);pointer-events:none;"></div>
            <!-- Direções cardinais -->
            <div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);font-size:8px;color:rgba(255,215,0,0.5);font-weight:bold;pointer-events:none;font-family:sans-serif;">N</div>
            <div style="position:absolute;bottom:6px;left:50%;transform:translateX(-50%);font-size:8px;color:rgba(255,215,0,0.5);font-weight:bold;pointer-events:none;font-family:sans-serif;">S</div>
            <div style="position:absolute;left:7px;top:50%;transform:translateY(-50%);font-size:8px;color:rgba(255,215,0,0.5);font-weight:bold;pointer-events:none;font-family:sans-serif;">O</div>
            <div style="position:absolute;right:7px;top:50%;transform:translateY(-50%);font-size:8px;color:rgba(255,215,0,0.5);font-weight:bold;pointer-events:none;font-family:sans-serif;">L</div>

            <!-- Botão Interact -->
            <div id="joystick-center-btn" class="interact-btn" style="
              width: 36px; height: 36px;
              border-radius: 50%;
              background: linear-gradient(160deg, rgba(255,215,0,0.1), rgba(10,8,3,0.95));
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              border: 1px solid rgba(255,215,0,0.5);
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              cursor: pointer;
              display: flex; align-items: center; justify-content: center;
              box-shadow: 
                0 0 6px rgba(255,215,0,0.1),
                0 2px 8px rgba(0,0,0,0.6),
                inset 0 1px 0 rgba(255,215,0,0.15),
                inset 0 -1px 1px rgba(0,0,0,0.8);
              transition: all 0.1s;
              overflow: hidden;
            ">
              <div style="position:absolute;inset:2px;border-radius:50%;border:1px solid rgba(0,0,0,0.6);pointer-events:none;"></div>
              <span style="font-size:14px;position:relative;z-index:1;filter:drop-shadow(0 0 2px rgba(255,215,0,0.3));">🤚</span>
            </div>
            
            <!-- Knob -->
            <div id="joystick-knob" style="
              width: 42px; height: 42px;
              border-radius: 50%;
              background: linear-gradient(160deg, rgba(255,215,0,0.08), rgba(8,6,2,0.95));
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
              border: 1px solid rgba(255,215,0,0.4);
              position: absolute;
              top: 50%; left: 50%;
              transform: translate(-50%, -50%);
              box-shadow: 
                0 0 6px rgba(255,215,0,0.08),
                0 3px 10px rgba(0,0,0,0.7),
                inset 0 1px 0 rgba(255,215,0,0.12),
                inset 0 -1px 1px rgba(0,0,0,0.8);
              pointer-events: none;
              overflow: hidden;
            ">
              <div style="position:absolute;inset:2px;border-radius:50%;border:1px solid rgba(0,0,0,0.6);pointer-events:none;"></div>
              <div style="position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(180deg,rgba(255,255,255,0.04),transparent);pointer-events:none;border-radius:50% 50% 0 0;"></div>
            </div>
          </div>
        </div>

        <!-- Botão Ink (Premium Glass Gold + Liquid) -->
        <div id="joystick-magic-orb" class="ds-btn" style="
          width: 56px; height: 56px;
          background: rgba(255,215,0,0.04);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(255,215,0,0.5);
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          position: relative;
          overflow: hidden;
          box-shadow: 
            0 0 10px rgba(255,215,0,0.1),
            inset 0 1px 0 rgba(255,215,0,0.15),
            inset 0 -1px 0 rgba(255,215,0,0.05);
          transition: all 0.25s ease;
          flex-shrink: 0;
        ">
          <!-- Micro contorno interno -->
          <div style="position:absolute;inset:2px;border:1px solid rgba(255,215,0,0.15);border-radius:8px;pointer-events:none;"></div>
          <!-- Brilho dourado superior -->
          <div style="position:absolute;top:0;left:10%;right:10%;height:1px;background:linear-gradient(90deg,transparent,rgba(255,215,0,0.7),transparent);pointer-events:none;"></div>
          <!-- Reflexo de vidro -->
          <div style="position:absolute;top:0;left:0;right:0;height:50%;background:linear-gradient(180deg,rgba(255,255,255,0.06),transparent);pointer-events:none;border-radius:10px 10px 0 0;"></div>
          <!-- Glow dourado pulsante -->
          <div style="position:absolute;inset:-1px;background:radial-gradient(ellipse at center,rgba(255,215,0,0.04) 0%,transparent 70%);pointer-events:none;animation:goldPulse 3s ease-in-out infinite;"></div>
          <!-- Brilho preto difuso nas bordas -->
          <div style="position:absolute;inset:0;border-radius:10px;box-shadow:inset 0 0 10px rgba(0,0,0,0.8);pointer-events:none;"></div>
          <!-- Líquido animado (tinta preta enchendo de baixo pra cima) -->
          <div style="position:absolute;inset:3px;overflow:hidden;border-radius:7px;">
            <!-- Marcadores de 9 níveis (1/9 cada = 1 minuto) -->
            <div style="position:absolute;bottom:11.1%;left:15%;right:15%;height:1px;background:rgba(255,215,0,0.15);pointer-events:none;"></div>
            <div style="position:absolute;bottom:22.2%;left:15%;right:15%;height:1px;background:rgba(255,215,0,0.15);pointer-events:none;"></div>
            <div style="position:absolute;bottom:33.3%;left:15%;right:15%;height:1px;background:rgba(255,215,0,0.15);pointer-events:none;"></div>
            <div style="position:absolute;bottom:44.4%;left:15%;right:15%;height:1px;background:rgba(255,215,0,0.15);pointer-events:none;"></div>
            <div style="position:absolute;bottom:55.5%;left:15%;right:15%;height:1px;background:rgba(255,215,0,0.15);pointer-events:none;"></div>
            <div style="position:absolute;bottom:66.6%;left:15%;right:15%;height:1px;background:rgba(255,215,0,0.15);pointer-events:none;"></div>
            <div style="position:absolute;bottom:77.7%;left:15%;right:15%;height:1px;background:rgba(255,215,0,0.15);pointer-events:none;"></div>
            <div style="position:absolute;bottom:88.8%;left:15%;right:15%;height:1px;background:rgba(255,215,0,0.15);pointer-events:none;"></div>
            <!-- Tinta preta enchendo (nível atual: 1/9) -->
            <div id="ink-fill" style="
              position:absolute;bottom:0;left:0;right:0;
              height:11.1%;
              background:linear-gradient(180deg, rgba(15,15,20,0.95), rgba(5,5,8,1));
              transition:height 1s ease;
            ">
              <!-- Onda horizontal na superfície da tinta -->
              <div style="
                position:absolute;top:-3px;left:-10%;width:120%;height:8px;
                background:rgba(15,15,20,0.8);border-radius:50%;
                animation:waveH1 3s ease-in-out infinite;
              "></div>
              <div style="
                position:absolute;top:-2px;left:-5%;width:110%;height:6px;
                background:rgba(25,25,35,0.6);border-radius:50%;
                animation:waveH2 4s ease-in-out infinite;
              "></div>
            </div>
            <!-- Micro brilhos na tinta -->
            <div style="position:absolute;bottom:5%;left:30%;width:2px;height:2px;background:rgba(180,160,220,0.5);border-radius:50%;animation:sparkle1 2.5s ease-in-out infinite;pointer-events:none;"></div>
            <div style="position:absolute;bottom:8%;right:25%;width:2px;height:2px;background:rgba(180,160,220,0.4);border-radius:50%;animation:sparkle2 3s ease-in-out 1s infinite;pointer-events:none;"></div>
          </div>
          <!-- Reflexo de vidro sobre o líquido -->
          <div style="position:absolute;top:0;left:0;right:0;height:45%;background:linear-gradient(180deg,rgba(255,255,255,0.08),transparent);pointer-events:none;z-index:2;border-radius:10px 10px 0 0;"></div>
          <!-- Ícone -->
          <span style="font-size:18px;position:relative;z-index:3;filter:drop-shadow(0 0 6px rgba(100,60,200,0.8));animation:inkGlow 2.5s ease-in-out infinite;">🪶</span>
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    this.container = container.querySelector('#joystick-container');
    this.base = container.querySelector('#joystick-base');
    this.knob = container.querySelector('#joystick-knob');
    this.centerBtn = container.querySelector('#joystick-center-btn');
    
    if (!this.container || !this.base || !this.knob || !this.centerBtn) return;

    this.centerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!this.wasDragging) {
        this.interactCallback();
      }
      this.wasDragging = false;
    });

    this.centerBtn.addEventListener('pointerdown', (e) => e.stopPropagation());

    const backpackBtn = container.querySelector('#joystick-backpack');
    backpackBtn?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('joystick-backpack-click'));
    });

    const magicOrb = container.querySelector('#joystick-magic-orb');
    magicOrb?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('joystick-magic-orb-click'));
    });

    this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.container.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.container.addEventListener('pointerup', () => this.onPointerUp());
    this.container.addEventListener('pointercancel', () => this.onPointerUp());
    this.container.addEventListener('pointerleave', () => this.onPointerUp());
    
    this.container.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mouseup', () => this.onMouseUp());
  }

  private onMouseDown(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('#joystick-center-btn') ||
        (e.target as HTMLElement).closest('#joystick-backpack') ||
        (e.target as HTMLElement).closest('#joystick-magic-orb')) {
      return;
    }
    e.preventDefault();
    this.mouseActive = true;
    this.wasDragging = false;
    const rect = this.base!.getBoundingClientRect();
    this.startX = rect.left + rect.width / 2;
    this.startY = rect.top + rect.height / 2;
    this.updateKnob(e.clientX, e.clientY);
  }
  
  private onMouseMove(e: MouseEvent) {
    if (!this.mouseActive) return;
    e.preventDefault();
    this.updateKnob(e.clientX, e.clientY);
    if (!this.wasDragging) {
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (Math.sqrt(dx*dx + dy*dy) > this.dragThreshold) {
        this.wasDragging = true;
      }
    }
  }
  
  private onMouseUp() {
    if (!this.mouseActive) return;
    this.mouseActive = false;
    this.onPointerUp();
  }

  private onPointerDown(e: PointerEvent) {
    if ((e.target as HTMLElement).closest('#joystick-center-btn') ||
        (e.target as HTMLElement).closest('#joystick-backpack') ||
        (e.target as HTMLElement).closest('#joystick-magic-orb')) {
      return;
    }
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    this.active = true;
    this.wasDragging = false;
    const rect = this.base!.getBoundingClientRect();
    this.startX = rect.left + rect.width / 2;
    this.startY = rect.top + rect.height / 2;
    this.updateKnob(e.clientX, e.clientY);
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.active) return;
    e.preventDefault();
    if (!this.wasDragging) {
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;
      if (Math.sqrt(dx*dx + dy*dy) > this.dragThreshold) {
        this.wasDragging = true;
      }
    }
    this.updateKnob(e.clientX, e.clientY);
  }

  private onPointerUp() {
    this.active = false;
    this.mouseActive = false;
    if (this.knob) {
      this.knob.style.transform = 'translate(-50%, -50%)';
      this.knob.style.boxShadow = `
        0 0 6px rgba(255,215,0,0.08),
        0 3px 10px rgba(0,0,0,0.7),
        inset 0 1px 0 rgba(255,215,0,0.12),
        inset 0 -1px 1px rgba(0,0,0,0.8)
      `;
    }
    this.callback({ x: 0, y: 0, active: false });
  }

  private updateKnob(clientX: number, clientY: number) {
    let dx = clientX - this.startX;
    let dy = clientY - this.startY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = this.radius;

    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    if (this.knob) {
      this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
      const intensity = dist / maxDist;
      this.knob.style.boxShadow = `
        0 0 ${6 + intensity * 8}px rgba(255,215,0,${0.08 + intensity * 0.15}),
        0 ${3 + intensity * 4}px ${8 + intensity * 4}px rgba(0,0,0,0.8),
        inset 0 1px 0 rgba(255,215,0,${0.12 + intensity * 0.1}),
        inset 0 -1px 1px rgba(0,0,0,0.8)
      `;
    }

    this.callback({ x: dx / maxDist, y: dy / maxDist, active: true });
  }
}
