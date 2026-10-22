import React, { useRef, useEffect } from 'react';
import { SnowConfig } from '../../types/map';

interface SnowDriftsProps {
  snowConfig: SnowConfig | undefined;
  isSnowActive: boolean;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
  playerRef?: React.MutableRefObject<{ x: number; y: number } | null> | React.RefObject<any>;
  isMoving?: boolean;
}

interface ContourPoint {
  x: number;
  y: number;
  cp1x: number;
  cp1y: number;
  cp2x: number;
  cp2y: number;
}

interface OrganicMontante {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  rot: number;
  points: ContourPoint[];
  currentScale: number; // 0.0 -> 1.0
  maxScale: number;
  state: 'dormant' | 'accumulating' | 'mature' | 'settling';
  delay: number;
  life: number;
  maxLife: number;
}

interface SnowFootprint {
  x: number;
  y: number;
  angle: number;
  isLeft: boolean;
  opacity: number;
}

interface SnowPuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
}

// Gera o contorno orgânico de um banco de neve (curvas Bézier onduladas)
function generateDriftContour(width: number, height: number, seed: number): ContourPoint[] {
  const points: ContourPoint[] = [];
  const segments = 6;
  const step = (width * 2) / segments;

  for (let i = 0; i <= segments; i++) {
    const px = -width + i * step;
    // Elevação suave do montante no centro
    const arch = Math.sin((i / segments) * Math.PI);
    const noise = (Math.sin(i * 1.7 + seed) * 0.25 + 0.75);
    const py = -height * arch * noise;

    const cp1x = px - step * 0.5;
    const cp1y = py + (Math.cos(i * 2.1 + seed) * 4);
    const cp2x = px - step * 0.2;
    const cp2y = py;

    points.push({ x: px, y: py, cp1x, cp1y, cp2x, cp2y });
  }

  return points;
}

export const OrganicSnowDriftsLayer: React.FC<SnowDriftsProps> = ({
  snowConfig,
  isSnowActive,
  scale,
  totalMapWidth,
  totalMapHeight,
  playerRef,
  isMoving = false,
}) => {
  if (!isSnowActive || !snowConfig?.enabled) return null;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const montantesRef = useRef<OrganicMontante[]>([]);
  const footprintsRef = useRef<SnowFootprint[]>([]);
  const snowPuffsRef = useRef<SnowPuff[]>([]);
  const prevPlayerPos = useRef<{ x: number; y: number } | null>(null);
  const stepSideRef = useRef<boolean>(false);

  // Inicializa montantes de neve orgânicos
  useEffect(() => {
    const w = totalMapWidth * scale;
    const h = totalMapHeight * scale;
    const count = 7;
    const list: OrganicMontante[] = [];

    for (let i = 0; i < count; i++) {
      const dw = (45 + ((i * 23) % 40)) * scale;
      const dh = (22 + ((i * 17) % 22)) * scale;
      const rot = ((i * 47) % 360) * (Math.PI / 180);

      list.push({
        id: i,
        x: ((i * 317 + 85) % Math.max(120, w - 120 * scale)) + 60 * scale,
        y: ((i * 443 + 110) % Math.max(120, h - 140 * scale)) + 70 * scale,
        width: dw,
        height: dh,
        rot,
        points: generateDriftContour(dw, dh, i * 13),
        currentScale: 0.0,
        maxScale: 0.85 + ((i % 3) * 0.12),
        state: 'dormant',
        delay: 0.8 + i * 2.8, // Surgimento escalonado não-instantâneo
        life: 0,
        maxLife: 22 + (i % 4) * 6,
      });
    }
    montantesRef.current = list;
  }, [totalMapWidth, totalMapHeight, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime) / 1000;
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const pCur = playerRef?.current;
      const montantes = montantesRef.current;

      for (let i = 0; i < montantes.length; i++) {
        const m = montantes[i];

        if (isSnowActive && snowConfig?.accumulateOnGround !== false) {
          if (m.state === 'dormant') {
            m.delay -= dt;
            if (m.delay <= 0) {
              m.state = 'accumulating';
            }
          } else if (m.state === 'accumulating') {
            // Crescimento procedural gradual da duna de neve
            m.currentScale = Math.min(m.maxScale, m.currentScale + dt * 0.18);
            if (m.currentScale >= m.maxScale) {
              m.state = 'mature';
              m.life = 0;
            }
          } else if (m.state === 'mature') {
            m.life += dt;
            if (m.life >= m.maxLife) {
              m.state = 'settling';
            }
          } else if (m.state === 'settling') {
            // Assenta e derrete gradualmente
            m.currentScale = Math.max(0, m.currentScale - dt * 0.14);
            if (m.currentScale <= 0) {
              // Realoca para novo ponto no mapa
              const w = totalMapWidth * scale;
              const h = totalMapHeight * scale;
              const seed = (m.id * 179 + Math.round(now)) % 9999;
              m.x = ((seed * 223) % Math.max(120, w - 120 * scale)) + 60 * scale;
              m.y = ((seed * 347) % Math.max(120, h - 140 * scale)) + 70 * scale;
              m.points = generateDriftContour(m.width, m.height, seed);
              m.currentScale = 0;
              m.state = 'dormant';
              m.delay = 2.5 + Math.random() * 5.0;
            }
          }
        } else {
          // Sem neve ativa: derrete suavemente
          if (m.currentScale > 0) {
            m.state = 'settling';
            m.currentScale = Math.max(0, m.currentScale - dt * 0.25);
          }
        }

        // Renderização Orgânica da Duna / Montante de Neve
        if (m.currentScale > 0.02) {
          const s = m.currentScale;
          ctx.save();
          ctx.translate(m.x, m.y);
          ctx.rotate(m.rot);
          ctx.scale(s, s);

          // 1. Sombra de Contato no Solo (azul-ardósia suave)
          ctx.beginPath();
          ctx.ellipse(0, 3 * scale, m.width * 1.05, m.height * 0.45, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(100, 116, 139, 0.22)';
          ctx.fill();

          // 2. Base e Flanco do Montante com Curvas Bézier
          ctx.beginPath();
          ctx.moveTo(-m.width, 0);

          for (let pIdx = 1; pIdx < m.points.length; pIdx++) {
            const pt = m.points[pIdx];
            const prevPt = m.points[pIdx - 1];
            ctx.quadraticCurveTo(prevPt.x + (pt.x - prevPt.x) * 0.5, pt.y, pt.x, pt.y);
          }

          // Fecha contorno pela base suavemente
          ctx.bezierCurveTo(m.width * 0.8, m.height * 0.35, -m.width * 0.8, m.height * 0.35, -m.width, 0);
          ctx.closePath();

          // Gradiente fofo: base com tom azul-ártico suave, topo com branco puro
          const snowGrad = ctx.createLinearGradient(0, -m.height, 0, m.height * 0.3);
          snowGrad.addColorStop(0, '#ffffff');
          snowGrad.addColorStop(0.65, '#f0f9ff');
          snowGrad.addColorStop(1, 'rgba(219, 234, 254, 0.6)');
          ctx.fillStyle = snowGrad;
          ctx.fill();

          // 3. Crista de Vento Iluminada (Wind Crest Ridge)
          ctx.beginPath();
          ctx.moveTo(-m.width * 0.85, -m.height * 0.15);
          for (let pIdx = 1; pIdx < m.points.length - 1; pIdx++) {
            const pt = m.points[pIdx];
            ctx.lineTo(pt.x * 0.85, pt.y * 0.95);
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 1.6 * scale;
          ctx.stroke();

          ctx.restore();

          // Interação: passos sobre o montante levantam pozinho de neve
          if (pCur && isMoving && snowConfig?.footstepTracks !== false) {
            const px = pCur.x * scale;
            const py = pCur.y * scale;
            const dist = Math.hypot(px - m.x, py - m.y);
            if (dist < m.width + 6 * scale && Math.random() < 0.28) {
              snowPuffsRef.current.push({
                x: px + (Math.random() - 0.5) * 8 * scale,
                y: py + (Math.random() - 0.5) * 4 * scale,
                vx: (Math.random() - 0.5) * 1.4 * scale,
                vy: -(1.4 + Math.random() * 1.8) * scale,
                radius: (2 + Math.random() * 2.5) * scale,
                opacity: 0.95,
              });
            }
          }
        }
      }

      // Registro de Pegadas Afundadas na Neve
      if (pCur && isMoving && snowConfig?.footstepTracks !== false) {
        if (!prevPlayerPos.current) {
          prevPlayerPos.current = { x: pCur.x, y: pCur.y };
        } else {
          const dx = pCur.x - prevPlayerPos.current.x;
          const dy = pCur.y - prevPlayerPos.current.y;
          const dist = Math.hypot(dx, dy);

          if (dist > 14) {
            const angle = Math.atan2(dy, dx);
            stepSideRef.current = !stepSideRef.current;
            const perpAngle = angle + (stepSideRef.current ? Math.PI / 2 : -Math.PI / 2);
            const footX = (pCur.x * scale) + Math.cos(perpAngle) * (4.5 * scale);
            const footY = (pCur.y * scale) + Math.sin(perpAngle) * (4.5 * scale);

            footprintsRef.current.push({
              x: footX,
              y: footY,
              angle,
              isLeft: stepSideRef.current,
              opacity: 0.95,
            });

            if (footprintsRef.current.length > 70) {
              footprintsRef.current.shift();
            }

            prevPlayerPos.current = { x: pCur.x, y: pCur.y };
          }
        }
      } else if (!isMoving) {
        prevPlayerPos.current = null;
      }

      // Desenha pegadas afundadas
      if (footprintsRef.current.length > 0) {
        for (const fp of footprintsRef.current) {
          ctx.save();
          ctx.translate(fp.x, fp.y);
          ctx.rotate(fp.angle);

          const fWidth = 6.5 * scale;
          const fLength = 11.5 * scale;

          // Núcleo afundado comprimido
          ctx.beginPath();
          ctx.ellipse(0, 0, fWidth * 0.45, fLength * 0.45, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(30, 41, 59, ${fp.opacity * 0.65})`;
          ctx.fill();

          // Borda de neve branca comprimida
          ctx.beginPath();
          ctx.ellipse(0, 0, fWidth * 0.58, fLength * 0.58, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${fp.opacity * 0.75})`;
          ctx.lineWidth = 1.2 * scale;
          ctx.stroke();

          ctx.restore();
        }
      }

      // Pozinho de neve no ar
      if (snowPuffsRef.current.length > 0) {
        for (const puff of snowPuffsRef.current) {
          puff.x += puff.vx * dt * 60;
          puff.y += puff.vy * dt * 60;
          puff.vy += 0.08 * dt * 60; // gravidade
          puff.opacity -= 0.035 * dt * 60;

          ctx.beginPath();
          ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, puff.opacity)})`;
          ctx.fill();
        }
        snowPuffsRef.current = snowPuffsRef.current.filter((p) => p.opacity > 0.02);
      }

      // Pegadas desvanecem lentamente
      const fadeRate = (isSnowActive ? 0.04 : 0.02) * dt;
      footprintsRef.current.forEach((fp) => {
        fp.opacity = Math.max(0, fp.opacity - fadeRate);
      });
      footprintsRef.current = footprintsRef.current.filter((fp) => fp.opacity > 0.02);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSnowActive, snowConfig?.accumulateOnGround, snowConfig?.footstepTracks, scale, totalMapWidth, totalMapHeight, isMoving, playerRef]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 pointer-events-none z-[5]"
    />
  );
};
