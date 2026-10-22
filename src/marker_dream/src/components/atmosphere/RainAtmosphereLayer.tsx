import React, { useMemo, useRef, useEffect } from 'react';
import { RainConfig } from '../../types/map';

interface RainAtmosphereProps {
  rainConfig: RainConfig | undefined;
  isRainActive: boolean;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
  playerRef?: React.MutableRefObject<{ x: number; y: number } | null> | React.RefObject<any>;
  isMoving?: boolean;
}

// ============================================================================
// 1. RESPINGOS E ONDULAÇÕES TOP-DOWN NO SOLO (ESTILO ORIGINAL RESTAURADO)
// ============================================================================
export const RainGroundSplashesLayer: React.FC<RainAtmosphereProps> = ({
  rainConfig,
  isRainActive,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const proceduralRainSplashes = useMemo(() => {
    if (!isRainActive) return [];
    const userSplashCount = rainConfig?.splashCount;
    const splashCount = userSplashCount ?? Math.max(18, Math.min(36, Math.round((totalMapWidth * totalMapHeight) / 90000)));
    const baseRippleSize = rainConfig?.splashSize ?? 26;
    const rainSpeed = rainConfig?.speed ?? 0.55;

    return Array.from({ length: splashCount }).map((_, i) => {
      const posX = ((i * 197 + 59) % Math.max(60, totalMapWidth - 40)) * scale;
      const posY = ((i * 311 + 83) % Math.max(60, totalMapHeight - 40)) * scale;
      const duration = rainSpeed + ((i * 7) % 5) * 0.08;
      const delay = -1 * (((i * 13) % 10) * 0.08);
      const rippleSize = Math.round(baseRippleSize + ((i * 5) % 3) * 6 - 3);
      return {
        id: `rain-splash-${i}`,
        posX,
        posY,
        duration,
        delay,
        rippleSize: Math.max(12, rippleSize),
      };
    });
  }, [
    isRainActive,
    rainConfig?.splashCount,
    rainConfig?.splashSize,
    rainConfig?.speed,
    totalMapWidth,
    totalMapHeight,
    scale,
  ]);

  if (!isRainActive || proceduralRainSplashes.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-[7] overflow-hidden">
      {proceduralRainSplashes.map((splash) => (
        <div
          key={splash.id}
          className="absolute pointer-events-none select-none"
          style={{
            left: `${splash.posX}px`,
            top: `${splash.posY}px`,
            width: `${splash.rippleSize}px`,
            height: `${splash.rippleSize * 0.46}px`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            className="w-full h-full rounded-full border border-cyan-300/80 bg-cyan-400/15 animate-rain-ripple"
            style={{
              animationDuration: `${splash.duration}s`,
              animationDelay: `${splash.delay}s`,
            }}
          />
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cyan-100 shadow-[0_0_5px_rgba(34,211,238,0.9)] animate-rain-droplet"
            style={{
              animationDuration: `${splash.duration * 0.65}s`,
              animationDelay: `${splash.delay}s`,
            }}
          />
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// 2. POÇAS PROCEDURAIS COM CICLO DE VIDA ORGÂNICO (NÃO SURGEM TODAS DE UMA VEZ)
// ============================================================================
interface OrganicPuddle {
  id: number;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  currentScale: number; // 0.0 -> 1.0 (crescimento orgânico)
  maxScale: number;
  state: 'dormant' | 'growing' | 'alive' | 'drying';
  delay: number; // Staggered spawn delay em segundos
  life: number;
  maxLife: number;
  ripplePhase: number;
}

interface FootSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

export const OrganicRainPuddlesLayer: React.FC<RainAtmosphereProps> = ({
  rainConfig,
  isRainActive,
  scale,
  totalMapWidth,
  totalMapHeight,
  playerRef,
  isMoving = false,
}) => {
  if (!isRainActive || !rainConfig?.enabled) return null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const puddlesRef = useRef<OrganicPuddle[]>([]);
  const splashesRef = useRef<FootSplash[]>([]);

  // Inicializa poças com posições e atrasos de surgimento orgânico
  useEffect(() => {
    const w = totalMapWidth * scale;
    const h = totalMapHeight * scale;
    const count = 9;
    const list: OrganicPuddle[] = [];

    for (let i = 0; i < count; i++) {
      list.push({
        id: i,
        x: ((i * 283 + 70) % Math.max(100, w - 100 * scale)) + 50 * scale,
        y: ((i * 397 + 95) % Math.max(100, h - 120 * scale)) + 60 * scale,
        rx: (26 + ((i * 17) % 24)) * scale,
        ry: (14 + ((i * 11) % 15)) * scale,
        rot: ((i * 37) % 360) * (Math.PI / 180),
        currentScale: 0.0,
        maxScale: 0.85 + ((i % 4) * 0.1),
        state: 'dormant',
        delay: 0.5 + i * 2.2, // Surgimento escalonado no tempo!
        life: 0,
        maxLife: 16 + (i % 5) * 4,
        ripplePhase: (i * 1.5) % (Math.PI * 2),
      });
    }
    puddlesRef.current = list;
  }, [totalMapWidth, totalMapHeight, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime) / 1000; // segundos
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pCur = playerRef?.current;
      const puddles = puddlesRef.current;

      for (let i = 0; i < puddles.length; i++) {
        const p = puddles[i];
        p.ripplePhase += dt * 2.5;

        if (isRainActive) {
          if (p.state === 'dormant') {
            p.delay -= dt;
            if (p.delay <= 0) {
              p.state = 'growing';
            }
          } else if (p.state === 'growing') {
            // Cresce suavemente
            p.currentScale = Math.min(p.maxScale, p.currentScale + dt * 0.28);
            if (p.currentScale >= p.maxScale) {
              p.state = 'alive';
              p.life = 0;
            }
          } else if (p.state === 'alive') {
            p.life += dt;
            if (p.life >= p.maxLife) {
              p.state = 'drying';
            }
          } else if (p.state === 'drying') {
            // Seca e evapora gradualmente
            p.currentScale = Math.max(0, p.currentScale - dt * 0.18);
            if (p.currentScale <= 0) {
              // Ressurge em outro local procedural
              const w = totalMapWidth * scale;
              const h = totalMapHeight * scale;
              const seed = (p.id * 137 + Math.round(now)) % 9999;
              p.x = ((seed * 191) % Math.max(100, w - 100 * scale)) + 50 * scale;
              p.y = ((seed * 277) % Math.max(100, h - 120 * scale)) + 60 * scale;
              p.currentScale = 0;
              p.state = 'dormant';
              p.delay = 2.0 + Math.random() * 4.0;
            }
          }
        } else {
          // Chuva desativada: todas as poças secam gradualmente
          if (p.currentScale > 0) {
            p.state = 'drying';
            p.currentScale = Math.max(0, p.currentScale - dt * 0.35);
          }
        }

        // Renderiza poça se visível
        if (p.currentScale > 0.02) {
          const s = p.currentScale;
          const rx = p.rx * s;
          const ry = p.ry * s;

          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);

          // Contorno de umidade no chão em volta
          ctx.beginPath();
          ctx.ellipse(0, 0, rx * 1.15, ry * 1.15, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(15, 23, 42, ${0.25 * s})`;
          ctx.fill();

          // Espelho d'água da poça
          const waterGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, rx);
          waterGrad.addColorStop(0, `rgba(30, 58, 138, ${0.45 * s})`);
          waterGrad.addColorStop(0.7, `rgba(14, 116, 144, ${0.35 * s})`);
          waterGrad.addColorStop(1, `rgba(6, 182, 212, ${0.12 * s})`);

          ctx.beginPath();
          ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = waterGrad;
          ctx.fill();

          // Brilho especular sutil na borda
          ctx.beginPath();
          ctx.ellipse(-rx * 0.2, -ry * 0.25, rx * 0.5, ry * 0.35, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${0.28 * s})`;
          ctx.fill();

          // Micro ondulação na superfície
          const ripR = (Math.sin(p.ripplePhase) * 0.5 + 0.5) * rx * 0.7;
          ctx.beginPath();
          ctx.ellipse(0, 0, ripR, ripR * (ry / rx), 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(165, 243, 252, ${0.2 * s})`;
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.restore();

          // Interação do jogador pisando na poça
          if (pCur && isMoving) {
            const px = pCur.x * scale;
            const py = pCur.y * scale;
            const dist = Math.hypot(px - p.x, py - p.y);
            if (dist < rx + 8 * scale && Math.random() < 0.35) {
              splashesRef.current.push({
                x: px + (Math.random() - 0.5) * 6 * scale,
                y: py + (Math.random() - 0.5) * 4 * scale,
                radius: 2 * scale,
                maxRadius: (8 + Math.random() * 8) * scale,
                opacity: 0.9,
              });
            }
          }
        }
      }

      // Renderiza respingos de passos na água
      if (splashesRef.current.length > 0) {
        for (const splash of splashesRef.current) {
          splash.radius += dt * 30 * scale;
          splash.opacity -= dt * 2.2;

          ctx.beginPath();
          ctx.ellipse(splash.x, splash.y, splash.radius, splash.radius * 0.5, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(103, 232, 249, ${Math.max(0, splash.opacity)})`;
          ctx.lineWidth = 1.4 * scale;
          ctx.stroke();
        }
        splashesRef.current = splashesRef.current.filter((s) => s.opacity > 0.05);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRainActive, scale, totalMapWidth, totalMapHeight, isMoving, playerRef]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 pointer-events-none z-[6]"
    />
  );
};
