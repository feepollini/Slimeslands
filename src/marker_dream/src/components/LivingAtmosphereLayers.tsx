import React, { useEffect, useRef } from 'react';
import { AntsConfig, BugsConfig, WindConfig } from '../types/map';
import { FIREFLY_SVG, FLY_SVG, BUTTERFLY_SVG, ANT_SVG, WIND_GUST_SVG } from '../data/defaultAtmosphereAssets';

// ============================================================================
// 1. COLÔNIA DE FORMIGAS PROCEDURAIS VIVAS (MÚLTIPLOS LAÇOS, CURVAS, SOLITÁRIAS E FOLHAS GRANDES)
// ============================================================================
interface AntColonyProps {
  antsConfig: AntsConfig | undefined;
  playerRef: React.MutableRefObject<{ x: number; y: number } | null> | React.RefObject<any>;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

interface AntTrailUnit {
  id: number;
  trailIndex: number;
  t: number; // 0.0 a 1.0
  direction: 1 | -1; // 1 = indo, -1 = voltando com folhas
  speed: number;
  trailOffset: number;
  hasLeaf: boolean;
  leafType: number; // 0: folha larga, 1: folha alongada, 2: trevo
  leafScaleFactor: number;
  x: number;
  y: number;
  angle: number;
  panic: number;
  panicVx: number;
  panicVy: number;
}

interface SoloAntUnit {
  id: number;
  x: number;
  y: number;
  angle: number;
  wanderAngle: number;
  speed: number;
  hasLeaf: boolean;
  leafType: number;
  leafScaleFactor: number;
  pauseTimer: number; // Tempo parada farejando o chão
  isPaused: boolean;
  panic: number;
  panicVx: number;
  panicVy: number;
}

export const LivingAntColony: React.FC<AntColonyProps> = ({
  antsConfig,
  playerRef,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const antImgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.src = antsConfig?.customAntPng || ANT_SVG;
    img.onload = () => {
      antImgRef.current = img;
    };
  }, [antsConfig?.customAntPng]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const count = antsConfig?.antCount ?? 42;
    const soloCount = antsConfig?.soloCount ?? 14;
    const antSize = (antsConfig?.size ?? 11) * scale;
    const baseSpeed = (antsConfig?.speed ?? 1.2) * 0.00065;
    const scatterRadius = (antsConfig?.scatterRadius ?? 65) * scale;
    const globalLeafScale = antsConfig?.leafScale ?? 1.7;
    const leafProbability = antsConfig?.leafChance ?? 0.60;

    const w = totalMapWidth * scale;
    const h = totalMapHeight * scale;

    // ========================================================================
    // REDE DE CAMINHOS: LAÇOS, CURVAS, CIRCUITOS FECHADOS E ARCOS
    // ========================================================================
    // Trilha 0: Grande Rota Sinuosa Principal (Atravessa o bioma)
    const t0_p0 = { x: 40 * scale, y: h * 0.52 };
    const t0_p1 = { x: w * 0.32, y: h * 0.28 };
    const t0_p2 = { x: w * 0.68, y: h * 0.76 };
    const t0_p3 = { x: w - 40 * scale, y: h * 0.44 };

    // Trilha 1: Circuito Fechado em Laço Oval (Formigueiro / Forrageamento em loop)
    const loopCenter = { x: w * 0.46, y: h * 0.58 };
    const loopRadiusX = Math.min(180 * scale, w * 0.22);
    const loopRadiusY = Math.min(120 * scale, h * 0.18);

    // Trilha 2: Arco Curvo Superior (Desce em curva ampla e cruza o mapa)
    const t2_p0 = { x: w * 0.18, y: 35 * scale };
    const t2_p1 = { x: w * 0.42, y: h * 0.48 };
    const t2_p2 = { x: w * 0.55, y: h * 0.32 };
    const t2_p3 = { x: w * 0.88, y: h * 0.72 };

    // Trilha 3: Laço Curvo em Ferradura Inferior
    const t3_p0 = { x: w * 0.15, y: h * 0.82 };
    const t3_p1 = { x: w * 0.38, y: h * 0.62 };
    const t3_p2 = { x: w * 0.65, y: h * 0.88 };
    const t3_p3 = { x: w * 0.82, y: h * 0.54 };

    const getBezierPoint = (p0: any, p1: any, p2: any, p3: any, t: number) => {
      const mt = 1 - t;
      const x = mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x;
      const y = mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y;
      const dx = 3 * mt * mt * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
      const dy = 3 * mt * mt * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
      return { x, y, angle: Math.atan2(dy, dx) };
    };

    const getTrailPoint = (trailIdx: number, t: number, dir: 1 | -1) => {
      const effectiveT = dir === 1 ? t : 1 - t;

      if (trailIdx === 1) {
        // Laço em Loop Oval
        const angle = effectiveT * Math.PI * 2;
        const x = loopCenter.x + Math.cos(angle) * loopRadiusX + Math.sin(angle * 2) * (18 * scale);
        const y = loopCenter.y + Math.sin(angle) * loopRadiusY;
        const dx = -Math.sin(angle) * loopRadiusX + Math.cos(angle * 2) * 2 * (18 * scale);
        const dy = Math.cos(angle) * loopRadiusY;
        const tangent = Math.atan2(dy, dx);
        return { x, y, angle: dir === 1 ? tangent : tangent + Math.PI };
      } else if (trailIdx === 2) {
        const pt = getBezierPoint(t2_p0, t2_p1, t2_p2, t2_p3, effectiveT);
        return { ...pt, angle: dir === 1 ? pt.angle : pt.angle + Math.PI };
      } else if (trailIdx === 3) {
        const pt = getBezierPoint(t3_p0, t3_p1, t3_p2, t3_p3, effectiveT);
        return { ...pt, angle: dir === 1 ? pt.angle : pt.angle + Math.PI };
      } else {
        const pt = getBezierPoint(t0_p0, t0_p1, t0_p2, t0_p3, effectiveT);
        return { ...pt, angle: dir === 1 ? pt.angle : pt.angle + Math.PI };
      }
    };

    // ========================================================================
    // CRIAÇÃO DAS FORMIGAS DA REDE DE TRILHAS (EXATAMENTE 60% CARREGANDO FOLHAS)
    // ========================================================================
    const trailAnts: AntTrailUnit[] = Array.from({ length: count }).map((_, i) => {
      const trailIndex = i % 4; // Distribui pelas 4 trilhas com laços e curvas
      const dir: 1 | -1 = i % 2 === 0 ? 1 : -1;
      const hasLeaf = (i % 10) < Math.round(leafProbability * 10);

      return {
        id: i,
        trailIndex,
        t: (i / count + (Math.sin(i * 2.3) * 0.08)) % 1,
        direction: dir,
        speed: baseSpeed * (0.8 + (i % 5) * 0.12),
        trailOffset: ((i % 5) - 2) * (3.5 * scale),
        hasLeaf,
        leafType: i % 3,
        leafScaleFactor: 1.1 + ((i % 4) * 0.28),
        x: 0,
        y: 0,
        angle: 0,
        panic: 0,
        panicVx: 0,
        panicVy: 0,
      };
    });

    // ========================================================================
    // FORMIGAS SOLITÁRIAS (EXPLORADORAS LIVRES QUE VAGUEIAM PELO CHÃO - 60% COM FOLHAS)
    // ========================================================================
    const soloAnts: SoloAntUnit[] = Array.from({ length: soloCount }).map((_, i) => ({
      id: 1000 + i,
      x: ((i * 223 + 47) % Math.max(80, totalMapWidth - 80)) * scale,
      y: ((i * 317 + 83) % Math.max(80, totalMapHeight - 80)) * scale,
      angle: Math.random() * Math.PI * 2,
      wanderAngle: Math.random() * Math.PI * 2,
      speed: (antsConfig?.speed ?? 1.2) * (0.45 + (i % 4) * 0.2) * scale,
      hasLeaf: (i % 5) < Math.round(leafProbability * 5),
      leafType: (i + 1) % 3,
      leafScaleFactor: 1.2 + ((i % 3) * 0.3),
      pauseTimer: Math.random() * 2000,
      isPaused: false,
      panic: 0,
      panicVx: 0,
      panicVy: 0,
    }));

    // ========================================================================
    // DESENHO DAS FOLHAS GRANDES, NÍTIDAS E VIBRANTES CARREGADAS NAS MANDÍBULAS
    // ========================================================================
    const drawBigLeaf = (
      context: CanvasRenderingContext2D,
      leafScale: number,
      leafType: number,
      stepWobble: number
    ) => {
      context.save();
      context.translate(0, -antSize * 0.55);
      context.rotate(stepWobble * 0.15 + (leafType === 1 ? -0.12 : 0.08));

      const lw = antSize * 0.95 * leafScale * globalLeafScale;
      const lh = antSize * 1.55 * leafScale * globalLeafScale;

      if (leafType === 0) {
        // Folha Tropical Larga e Frondosa (Verde Esmeralda Vibrante com Nervura Central)
        const grad = context.createLinearGradient(-lw * 0.5, 0, lw * 0.5, -lh);
        grad.addColorStop(0, '#15803d');
        grad.addColorStop(0.35, '#22c55e');
        grad.addColorStop(0.8, '#4ade80');
        grad.addColorStop(1, '#86efac');

        context.fillStyle = grad;
        context.shadowColor = 'rgba(0, 0, 0, 0.45)';
        context.shadowBlur = 4 * scale;
        context.shadowOffsetY = 2 * scale;

        context.beginPath();
        context.moveTo(0, 0); // Ponto de agarre na mandíbula
        context.bezierCurveTo(-lw * 0.75, -lh * 0.35, -lw * 0.85, -lh * 0.75, 0, -lh); // Ponta da folha
        context.bezierCurveTo(lw * 0.85, -lh * 0.75, lw * 0.75, -lh * 0.35, 0, 0);
        context.closePath();
        context.fill();

        // Nervura Central Escura
        context.shadowColor = 'transparent';
        context.strokeStyle = '#14532d';
        context.lineWidth = 1.2 * scale;
        context.beginPath();
        context.moveTo(0, 0);
        context.quadraticCurveTo(lw * 0.05, -lh * 0.5, 0, -lh * 0.92);
        context.stroke();

        // Nervuras Laterais Finas
        context.strokeStyle = '#166534';
        context.lineWidth = 0.8 * scale;
        context.beginPath();
        context.moveTo(-lw * 0.35, -lh * 0.45);
        context.lineTo(0, -lh * 0.38);
        context.lineTo(lw * 0.35, -lh * 0.45);
        context.moveTo(-lw * 0.28, -lh * 0.68);
        context.lineTo(0, -lh * 0.62);
        context.lineTo(lw * 0.28, -lh * 0.68);
        context.stroke();
      } else if (leafType === 1) {
        // Folha Recortada / Serrada estilo Primavera (Tom Verde Limão Vivo)
        const grad = context.createLinearGradient(-lw * 0.4, 0, lw * 0.4, -lh);
        grad.addColorStop(0, '#16a34a');
        grad.addColorStop(0.5, '#65a30d');
        grad.addColorStop(1, '#a3e635');

        context.fillStyle = grad;
        context.shadowColor = 'rgba(0, 0, 0, 0.4)';
        context.shadowBlur = 3 * scale;
        context.shadowOffsetY = 2 * scale;

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(-lw * 0.45, -lh * 0.25);
        context.lineTo(-lw * 0.3, -lh * 0.35);
        context.lineTo(-lw * 0.55, -lh * 0.58);
        context.lineTo(-lw * 0.32, -lh * 0.68);
        context.lineTo(0, -lh * 1.05); // Ponta afiada
        context.lineTo(lw * 0.32, -lh * 0.68);
        context.lineTo(lw * 0.55, -lh * 0.58);
        context.lineTo(lw * 0.3, -lh * 0.35);
        context.lineTo(lw * 0.45, -lh * 0.25);
        context.closePath();
        context.fill();

        // Haste Central
        context.shadowColor = 'transparent';
        context.strokeStyle = '#365314';
        context.lineWidth = 1 * scale;
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -lh * 0.95);
        context.stroke();
      } else {
        // Folha em Formato de Trevo / Petála Arredondada Dupla
        context.fillStyle = '#10b981';
        context.shadowColor = 'rgba(0, 0, 0, 0.4)';
        context.shadowBlur = 3 * scale;
        context.shadowOffsetY = 2 * scale;

        context.beginPath();
        context.ellipse(-lw * 0.32, -lh * 0.52, lw * 0.42, lh * 0.48, -0.3, 0, Math.PI * 2);
        context.ellipse(lw * 0.32, -lh * 0.52, lw * 0.42, lh * 0.48, 0.3, 0, Math.PI * 2);
        context.fill();

        context.shadowColor = 'transparent';
        context.strokeStyle = '#065f46';
        context.lineWidth = 1.2 * scale;
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, -lh * 0.7);
        context.stroke();
      }

      context.restore();
    };

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const player = playerRef.current;
      const px = (player?.x ?? 384) * scale;
      const py = (player?.y ?? 100) * scale;

      // ======================================================================
      // 1. DESENHO DAS TRILHAS DE FEROMÔNIO NO CHÃO (TEXTURA ORGÂNICA PISADA)
      // ======================================================================
      ctx.save();
      ctx.strokeStyle = 'rgba(68, 48, 32, 0.14)';
      ctx.lineWidth = 3.5 * scale;
      ctx.lineCap = 'round';
      ctx.setLineDash([5 * scale, 7 * scale]);

      // Trilha 0 (S Principal)
      ctx.beginPath();
      ctx.moveTo(t0_p0.x, t0_p0.y);
      ctx.bezierCurveTo(t0_p1.x, t0_p1.y, t0_p2.x, t0_p2.y, t0_p3.x, t0_p3.y);
      ctx.stroke();

      // Trilha 1 (Laço Fechado Oval)
      ctx.beginPath();
      ctx.ellipse(loopCenter.x, loopCenter.y, loopRadiusX, loopRadiusY, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Trilha 2 (Arco Superior Curvo)
      ctx.beginPath();
      ctx.moveTo(t2_p0.x, t2_p0.y);
      ctx.bezierCurveTo(t2_p1.x, t2_p1.y, t2_p2.x, t2_p2.y, t2_p3.x, t2_p3.y);
      ctx.stroke();

      // Trilha 3 (Ferradura Inferior)
      ctx.beginPath();
      ctx.moveTo(t3_p0.x, t3_p0.y);
      ctx.bezierCurveTo(t3_p1.x, t3_p1.y, t3_p2.x, t3_p2.y, t3_p3.x, t3_p3.y);
      ctx.stroke();
      ctx.restore();

      // ======================================================================
      // 2. ATUALIZAÇÃO E RENDERIZAÇÃO DAS FORMIGAS DA REDE DE TRILHAS
      // ======================================================================
      for (const ant of trailAnts) {
        const trailPt = getTrailPoint(ant.trailIndex, ant.t, ant.direction);
        const normAngle = trailPt.angle + Math.PI / 2;
        const targetX = trailPt.x + Math.cos(normAngle) * ant.trailOffset;
        const targetY = trailPt.y + Math.sin(normAngle) * ant.trailOffset;

        const dx = targetX - px;
        const dy = targetY - py;
        const distToPlayer = Math.hypot(dx, dy);

        // Fuga e Pânico se o jogador estiver pisando perto
        if (distToPlayer < scatterRadius) {
          ant.panic = Math.min(1.0, ant.panic + 0.22);
          const fleeAngle = Math.atan2(dy, dx);
          const pushForce = ((scatterRadius - distToPlayer) / scatterRadius) * (6.5 * scale);
          ant.panicVx += Math.cos(fleeAngle) * pushForce;
          ant.panicVy += Math.sin(fleeAngle) * pushForce;
        } else {
          ant.panic *= 0.92;
          ant.panicVx *= 0.86;
          ant.panicVy *= 0.86;
        }

        const speedMultiplier = 1.0 + ant.panic * 2.3;
        ant.t = (ant.t + ant.speed * speedMultiplier * (dt / 16)) % 1.0;

        const curX = targetX + ant.panicVx;
        const curY = targetY + ant.panicVy;

        let renderAngle = trailPt.angle;
        if (ant.panic > 0.15) {
          renderAngle = Math.atan2(ant.panicVy, ant.panicVx);
        }

        const stepCycle = Math.sin(now * 0.024 * (ant.panic > 0.1 ? 3 : 1) + ant.id);
        const legWobble = stepCycle * 0.14;

        ctx.save();
        ctx.translate(curX, curY);
        ctx.rotate(renderAngle + Math.PI / 2 + legWobble);

        if (antImgRef.current && antImgRef.current.complete) {
          ctx.drawImage(
            antImgRef.current,
            -antSize / 2,
            -antSize / 2,
            antSize,
            antSize
          );
        } else {
          // Fallback procedural de alta resolução
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.ellipse(0, antSize * 0.28, antSize * 0.22, antSize * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#292524';
          ctx.beginPath();
          ctx.ellipse(0, 0, antSize * 0.15, antSize * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.arc(0, -antSize * 0.28, antSize * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }

        // DESENHO DA FOLHA GRANDE E VISÍVEL
        if (ant.hasLeaf) {
          drawBigLeaf(ctx, ant.leafScaleFactor, ant.leafType, stepCycle);
        }

        ctx.restore();
      }

      // ======================================================================
      // 3. ATUALIZAÇÃO E RENDERIZAÇÃO DAS FORMIGAS SOLITÁRIAS (SCOUTS LIVRES)
      // ======================================================================
      for (const solo of soloAnts) {
        const dx = solo.x - px;
        const dy = solo.y - py;
        const distToPlayer = Math.hypot(dx, dy);

        if (distToPlayer < scatterRadius * 1.15) {
          // Pânico instantâneo de formiga solitária: corre desesperada na direção contrária
          solo.panic = Math.min(1.0, solo.panic + 0.25);
          const fleeAngle = Math.atan2(dy, dx);
          const pushForce = ((scatterRadius * 1.15 - distToPlayer) / (scatterRadius * 1.15)) * (7 * scale);
          solo.panicVx += Math.cos(fleeAngle) * pushForce;
          solo.panicVy += Math.sin(fleeAngle) * pushForce;
          solo.angle = fleeAngle;
          solo.isPaused = false;
        } else {
          solo.panic *= 0.92;
          solo.panicVx *= 0.86;
          solo.panicVy *= 0.86;

          // Ciclo de pausa para cheirar o chão com as antenas
          solo.pauseTimer -= dt;
          if (solo.pauseTimer <= 0) {
            solo.isPaused = !solo.isPaused;
            solo.pauseTimer = solo.isPaused ? 400 + Math.random() * 900 : 1800 + Math.random() * 3500;
            if (!solo.isPaused) {
              // Muda de direção ao retomar a caminhada
              solo.wanderAngle += (Math.random() - 0.5) * 1.8;
            }
          }

          if (!solo.isPaused) {
            // Movimento suave de exploração (Brownian / Perlin wander)
            solo.wanderAngle += (Math.random() - 0.5) * 0.22;
            solo.angle += (solo.wanderAngle - solo.angle) * 0.1;

            const moveStep = solo.speed * (dt / 16);
            solo.x += Math.cos(solo.angle) * moveStep;
            solo.y += Math.sin(solo.angle) * moveStep;
          }
        }

        // Aplica o pânico
        solo.x += solo.panicVx;
        solo.y += solo.panicVy;

        // Mantém dentro dos limites do mapa com rebatimento
        if (solo.x < 25 * scale) { solo.x = 25 * scale; solo.angle = 0; solo.wanderAngle = 0; }
        if (solo.x > w - 25 * scale) { solo.x = w - 25 * scale; solo.angle = Math.PI; solo.wanderAngle = Math.PI; }
        if (solo.y < 25 * scale) { solo.y = 25 * scale; solo.angle = Math.PI / 2; solo.wanderAngle = Math.PI / 2; }
        if (solo.y > h - 25 * scale) { solo.y = h - 25 * scale; solo.angle = -Math.PI / 2; solo.wanderAngle = -Math.PI / 2; }

        const stepCycle = solo.isPaused ? 0 : Math.sin(now * 0.028 + solo.id);
        const legWobble = stepCycle * 0.15;

        ctx.save();
        ctx.translate(solo.x, solo.y);
        ctx.rotate(solo.angle + Math.PI / 2 + legWobble);

        if (antImgRef.current && antImgRef.current.complete) {
          ctx.drawImage(
            antImgRef.current,
            -antSize / 2,
            -antSize / 2,
            antSize,
            antSize
          );
        } else {
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.ellipse(0, antSize * 0.28, antSize * 0.22, antSize * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#292524';
          ctx.beginPath();
          ctx.ellipse(0, 0, antSize * 0.15, antSize * 0.2, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1c1917';
          ctx.beginPath();
          ctx.arc(0, -antSize * 0.28, antSize * 0.16, 0, Math.PI * 2);
          ctx.fill();
        }

        // Desenha folha grande na solitária se ela estiver forrageando
        if (solo.hasLeaf) {
          drawBigLeaf(ctx, solo.leafScaleFactor, solo.leafType, stepCycle);
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    antsConfig?.antCount,
    antsConfig?.soloCount,
    antsConfig?.leafScale,
    antsConfig?.leafChance,
    antsConfig?.size,
    antsConfig?.speed,
    antsConfig?.scatterRadius,
    scale,
    totalMapWidth,
    totalMapHeight,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 w-full h-full pointer-events-none z-[7]"
    />
  );
};

// ============================================================================
// 2. INSETOS VIVOS & VAGALUMES (TODOS JUNTOS OU SELEÇÃO MÚLTIPLA + POUSO NO HERÓI)
// ============================================================================
interface BugsProps {
  bugsConfig: BugsConfig | undefined;
  playerRef: React.MutableRefObject<{ x: number; y: number } | null> | React.RefObject<any>;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

type BugSpecies = 'fireflies' | 'butterflies' | 'flies' | 'custom';

export const LivingBugsLayer: React.FC<BugsProps> = ({
  bugsConfig,
  playerRef,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Imagens cacheadas para todas as espécies
  const fireflyImgRef = useRef<HTMLImageElement | null>(null);
  const flyImgRef = useRef<HTMLImageElement | null>(null);
  const butterflyImgRef = useRef<HTMLImageElement | null>(null);
  const customImgRef = useRef<HTMLImageElement | null>(null);

  const preset = bugsConfig?.preset || 'all';
  const customPng = bugsConfig?.customBugPng;

  // Pré-carrega todos os sprites para suportar "Todos Juntos" instantaneamente
  useEffect(() => {
    const fImg = new Image();
    fImg.src = FIREFLY_SVG;
    fImg.onload = () => { fireflyImgRef.current = fImg; };

    const bImg = new Image();
    bImg.src = BUTTERFLY_SVG;
    bImg.onload = () => { butterflyImgRef.current = bImg; };

    const mImg = new Image();
    mImg.src = FLY_SVG;
    mImg.onload = () => { flyImgRef.current = mImg; };

    if (customPng) {
      const cImg = new Image();
      cImg.src = customPng;
      cImg.onload = () => { customImgRef.current = cImg; };
    }
  }, [customPng]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Determina quais espécies estão ativas
    let activeSpeciesList: BugSpecies[] = [];
    if (bugsConfig?.activeSpecies && bugsConfig.activeSpecies.length > 0) {
      activeSpeciesList = bugsConfig.activeSpecies;
    } else if (preset === 'all' || !preset) {
      // TODOS JUNTOS DE UMA VEZ!
      activeSpeciesList = customPng
        ? ['fireflies', 'butterflies', 'flies', 'custom']
        : ['fireflies', 'butterflies', 'flies'];
    } else {
      activeSpeciesList = [preset as BugSpecies];
    }

    const count = bugsConfig?.bugCount ?? 22;
    const userBaseSize = bugsConfig?.size ?? 16;
    const flightSpeed = bugsConfig?.speed ?? 3.2;
    const canLand = bugsConfig?.landOnPlayer !== false;

    // Cria o enxame mesclando todas as espécies selecionadas
    const bugs = Array.from({ length: count }).map((_, i) => {
      const species = activeSpeciesList[i % activeSpeciesList.length];
      const speciesScale = species === 'butterflies' ? 1.45 : species === 'fireflies' ? 1.05 : 0.85;
      const bugSize = userBaseSize * speciesScale * scale;

      return {
        id: i,
        species,
        size: bugSize,
        x: ((i * 197 + 53) % Math.max(60, totalMapWidth - 60)) * scale,
        y: ((i * 281 + 97) % Math.max(60, totalMapHeight - 60)) * scale,
        vx: (Math.random() - 0.5) * 1.3 * scale,
        vy: (Math.random() - 0.5) * 1.3 * scale,
        wanderAngle: Math.random() * Math.PI * 2,
        pulseFreq: 0.0016 + (i % 7) * 0.0006,
        phaseOffset: (i * 2.399) + Math.random(),
        // Pouso no herói permitido para insetos variados
        isLander: canLand && (i % 5 === 0),
        state: 'flying' as 'flying' | 'approach' | 'landed' | 'takeoff',
        landTimer: 0,
        wingFold: 1.0,
      };
    });

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const player = playerRef.current;
      const px = (player?.x ?? 384) * scale;
      const py = (player?.y ?? 100) * scale;

      for (const bug of bugs) {
        // Pouso Orgânico no Herói
        if (bug.isLander) {
          bug.landTimer += dt;

          if (bug.state === 'flying' && bug.landTimer > 6000 + (bug.id % 4) * 1000) {
            bug.state = 'approach';
            bug.landTimer = 0;
          } else if (bug.state === 'approach') {
            const offsetX = (bug.id % 2 === 0 ? 14 : -14) * scale;
            const targetX = px + offsetX;
            const targetY = py - (16 * scale);
            const dx = targetX - bug.x;
            const dy = targetY - bug.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 9 * scale || bug.landTimer > 4000) {
              bug.state = 'landed';
              bug.landTimer = 0;
            } else {
              bug.x += (dx * 0.045) * (dt / 16);
              bug.y += (dy * 0.045) * (dt / 16);
            }
          } else if (bug.state === 'landed') {
            const offsetX = (bug.id % 2 === 0 ? 14 : -14) * scale;
            bug.x = px + offsetX;
            bug.y = py - (16 * scale);
            bug.wingFold = Math.max(0.3, bug.wingFold - 0.06);

            if (bug.landTimer > 4000) {
              bug.state = 'takeoff';
              bug.landTimer = 0;
            }
          } else if (bug.state === 'takeoff') {
            bug.wingFold = Math.min(1.0, bug.wingFold + 0.08);
            bug.vy -= 0.7 * scale;
            bug.vx += (Math.random() - 0.5) * 1.5 * scale;
            bug.x += bug.vx * (dt / 16);
            bug.y += bug.vy * (dt / 16);

            if (bug.landTimer > 1800) {
              bug.state = 'flying';
              bug.landTimer = 0;
            }
          }
        }

        // Voo Livre com física de espécie
        if (bug.state === 'flying') {
          const wanderSpeed = bug.species === 'butterflies' ? 0.18 : bug.species === 'flies' ? 0.45 : 0.25;
          bug.wanderAngle += (Math.random() - 0.5) * wanderSpeed;
          
          const maxSpd = bug.species === 'butterflies' ? 0.9 : bug.species === 'flies' ? 1.4 : 1.1;
          const targetVx = Math.cos(bug.wanderAngle) * (maxSpd * scale);
          const targetVy = Math.sin(bug.wanderAngle) * (maxSpd * 0.85 * scale);
          
          bug.vx += (targetVx - bug.vx) * 0.06;
          bug.vy += (targetVy - bug.vy) * 0.06;

          bug.x += bug.vx * (dt / 16) * (flightSpeed / 3.0);
          bug.y += bug.vy * (dt / 16) * (flightSpeed / 3.0);

          if (bug.x < 20 * scale) { bug.x = 20 * scale; bug.vx *= -1; }
          if (bug.x > (totalMapWidth - 20) * scale) { bug.x = (totalMapWidth - 20) * scale; bug.vx *= -1; }
          if (bug.y < 20 * scale) { bug.y = 20 * scale; bug.vy *= -1; }
          if (bug.y > (totalMapHeight - 20) * scale) { bug.y = (totalMapHeight - 20) * scale; bug.vy *= -1; }

          const flapCycle = bug.species === 'butterflies' ? 0.03 : bug.species === 'flies' ? 0.08 : 0.05;
          const flap = Math.sin(now * flapCycle + bug.id);
          bug.wingFold = 0.4 + Math.abs(flap) * 0.6;
        }

        // ====================================================================
        // RENDERIZAÇÃO
        // ====================================================================
        ctx.save();
        ctx.translate(bug.x, bug.y);

        // Se for vagalume: brilho bioluminescente assíncrono individual
        if (bug.species === 'fireflies') {
          const pulse = Math.pow(Math.max(0, Math.sin(now * bug.pulseFreq + bug.phaseOffset)), 3);
          const glowAlpha = 0.15 + pulse * 0.85;
          const glowRadius = (4 * scale) + pulse * (18 * scale);

          const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, glowRadius);
          grad.addColorStop(0, `rgba(254, 240, 138, ${glowAlpha})`);
          grad.addColorStop(0.4, `rgba(234, 179, 8, ${glowAlpha * 0.6})`);
          grad.addColorStop(1, 'rgba(202, 138, 4, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dobra das asas no eixo X
        ctx.scale(bug.wingFold, 1.0);

        // Escolhe o sprite correto para a espécie
        let activeImg: HTMLImageElement | null = null;
        if (bug.species === 'butterflies') activeImg = butterflyImgRef.current;
        else if (bug.species === 'flies') activeImg = flyImgRef.current;
        else if (bug.species === 'custom') activeImg = customImgRef.current || butterflyImgRef.current;
        else activeImg = fireflyImgRef.current;

        if (activeImg && activeImg.complete) {
          ctx.drawImage(
            activeImg,
            -bug.size / 2,
            -bug.size / 2,
            bug.size,
            bug.size
          );
        } else {
          ctx.fillStyle = bug.species === 'fireflies' ? '#fde047' : bug.species === 'butterflies' ? '#38bdf8' : '#334155';
          ctx.beginPath();
          ctx.arc(0, 0, bug.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    bugsConfig?.bugCount,
    bugsConfig?.size,
    bugsConfig?.speed,
    bugsConfig?.landOnPlayer,
    bugsConfig?.activeSpecies,
    preset,
    customPng,
    scale,
    totalMapWidth,
    totalMapHeight,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 w-full h-full pointer-events-none z-[9945]"
    />
  );
};

// ============================================================================
// 3. CORRENTES DE VENTO VOLUMÉTRICAS PROCEDURAIS (PARALLAX NO MAPA)
// ============================================================================
interface WorldWindProps {
  windConfig: WindConfig | undefined;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

export const VolumetricWorldWind: React.FC<WorldWindProps> = ({
  windConfig,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const gustCount = windConfig?.gustCount ?? 8;
  const speed = windConfig?.speed ?? 4.5;
  const opacity = windConfig?.opacity ?? 0.42;

  const gusts = React.useMemo(() => {
    return Array.from({ length: gustCount }).map((_, i) => {
      const top = ((i * 180 + 40) % Math.max(120, totalMapHeight - 100)) * scale;
      const left = ((i * 240 + 20) % Math.max(160, totalMapWidth - 220)) * scale;
      const duration = speed + ((i * 7) % 5) * 0.4;
      const delay = -1 * ((i * 11) % 8) * 0.6;
      const sizeMultiplier = 0.8 + ((i % 3) * 0.25);

      return {
        id: `wind-${i}`,
        top,
        left,
        duration,
        delay,
        width: 380 * scale * sizeMultiplier,
        height: 90 * scale * sizeMultiplier,
      };
    });
  }, [gustCount, speed, scale, totalMapWidth, totalMapHeight]);

  return (
    <div className="absolute inset-0 pointer-events-none z-[9930] overflow-hidden">
      {gusts.map((g) => (
        <div
          key={g.id}
          className="absolute pointer-events-none animate-wind-gust"
          style={{
            top: `${g.top}px`,
            left: `${g.left}px`,
            width: `${g.width}px`,
            height: `${g.height}px`,
            animationDuration: `${g.duration}s`,
            animationDelay: `${g.delay}s`,
            opacity,
            mixBlendMode: 'screen',
          }}
        >
          <img
            src={WIND_GUST_SVG}
            alt="Wind Gust"
            className="w-full h-full object-contain pointer-events-none select-none filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.2)]"
          />
        </div>
      ))}
    </div>
  );
};
