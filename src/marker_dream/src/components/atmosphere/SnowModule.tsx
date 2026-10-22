import React, { useRef, useEffect, useState, useMemo } from 'react';
import { SnowConfig, RainConfig, LeavesConfig } from '../../types/map';
import { Snowflake, Sparkles, Eye, EyeOff, Wind, Shield } from 'lucide-react';

// ============================================================================
// 1. STUDIO / UI CONTROLS DO MÓDULO DE NEVE
// ============================================================================
interface StudioProps {
  snowConfig: SnowConfig;
  onUpdateSnowConfig: (updates: Partial<SnowConfig>) => void;
}

export const SnowStudio: React.FC<StudioProps> = ({
  snowConfig,
  onUpdateSnowConfig,
}) => {
  return (
    <div className="space-y-4">
      {/* Header Info */}
      <div className="p-3 bg-gradient-to-r from-blue-950/80 via-slate-900 to-slate-900 border border-blue-400/40 rounded-xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-blue-300">
          <Snowflake className="w-4 h-4 text-blue-400" />
          <span>Módulo de Neve & Nevasca Procedural</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Nevasca volumétrica com física de queda, deriva de vento, <b>micro-brilho cromático</b> nos flocos e acúmulo no solo e sobre o Herói.
        </p>
      </div>

      {/* Controles Principais */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gerenciador de Neve</span>
          </span>
          <button
            type="button"
            onClick={() => onUpdateSnowConfig({ enabled: !(snowConfig.enabled === true) })}
            className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
              snowConfig.enabled === true
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {snowConfig.enabled === true ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{snowConfig.enabled === true ? 'Ativado' : 'Desativado'}</span>
          </button>
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
          {/* Densidade de Flocos (1 a 10) */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Densidade da Nevasca (1 a 10)</span>
              <span className="font-mono text-blue-300">{Math.max(1, Math.min(10, snowConfig.density ?? 6))}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={Math.max(1, Math.min(10, snowConfig.density ?? 6))}
              onChange={(e) => onUpdateSnowConfig({ density: parseInt(e.target.value) || 1 })}
              className="w-full accent-blue-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <button type="button" onClick={() => onUpdateSnowConfig({ density: 2 })} className="hover:text-blue-300 cursor-pointer">2 (Suave)</button>
              <button type="button" onClick={() => onUpdateSnowConfig({ density: 5 })} className="hover:text-blue-300 cursor-pointer">5 (Média)</button>
              <button type="button" onClick={() => onUpdateSnowConfig({ density: 8 })} className="hover:text-blue-300 cursor-pointer">8 (Nevasca)</button>
              <button type="button" onClick={() => onUpdateSnowConfig({ density: 10 })} className="hover:text-blue-300 cursor-pointer">10 (Extrema)</button>
            </div>
          </div>

          {/* Velocidade de Queda */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Velocidade de Queda dos Flocos</span>
              <span className="font-mono text-blue-300">{(snowConfig.speed ?? 3.2).toFixed(1)}s</span>
            </div>
            <input
              type="range"
              min="1.0"
              max="6.0"
              step="0.2"
              value={snowConfig.speed ?? 3.2}
              onChange={(e) => onUpdateSnowConfig({ speed: parseFloat(e.target.value) })}
              className="w-full accent-blue-400 cursor-pointer"
            />
          </div>

          {/* Deriva de Vento Lateral */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Inclinação do Vento Lateral</span>
              <span className="font-mono text-blue-300">{snowConfig.windDrift ?? 15}°</span>
            </div>
            <input
              type="range"
              min="-45"
              max="45"
              step="5"
              value={snowConfig.windDrift ?? 15}
              onChange={(e) => onUpdateSnowConfig({ windDrift: parseInt(e.target.value) })}
              className="w-full accent-blue-400 cursor-pointer"
            />
          </div>

          {/* Efeitos Especiais de Física e Shimmer */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {/* Brilho Cromático */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">✨ Micro-Brilho Cromático</span>
                <span className="text-[10px] text-slate-400 block">Cintilação prismática suave nos flocos de vez em quando</span>
              </div>
              <input
                type="checkbox"
                checked={snowConfig.chromaticSparkle !== false}
                onChange={(e) => onUpdateSnowConfig({ chromaticSparkle: e.target.checked })}
                className="rounded accent-blue-400 cursor-pointer w-4 h-4"
              />
            </label>

            {/* Acúmulo no Herói */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">❄️ Neve Acumulando no Herói</span>
                <span className="text-[10px] text-slate-400 block">Forma manto branco de neve na cabeça e ombros do PNG do personagem</span>
              </div>
              <input
                type="checkbox"
                checked={snowConfig.accumulateOnPlayer !== false}
                onChange={(e) => onUpdateSnowConfig({ accumulateOnPlayer: e.target.checked })}
                className="rounded accent-blue-400 cursor-pointer w-4 h-4"
              />
            </label>

            {/* Acúmulo no Solo */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">🏔️ Acúmulo de Neve no Solo</span>
                <span className="text-[10px] text-slate-400 block">Manto branco procedural no chão com deriva e relevo</span>
              </div>
              <input
                type="checkbox"
                checked={snowConfig.accumulateOnGround !== false}
                onChange={(e) => onUpdateSnowConfig({ accumulateOnGround: e.target.checked })}
                className="rounded accent-blue-400 cursor-pointer w-4 h-4"
              />
            </label>

            {/* Rastros e Pegadas na Neve */}
            <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
              <div className="space-y-0.5">
                <span className="text-xs font-semibold text-slate-200 block">👣 Rastros & Pegadas na Neve</span>
                <span className="text-[10px] text-slate-400 block">Herói marca pegadas no solo que são preenchidas por neve fresca</span>
              </div>
              <input
                type="checkbox"
                checked={snowConfig.footstepTracks !== false}
                onChange={(e) => onUpdateSnowConfig({ footstepTracks: e.target.checked })}
                className="rounded accent-blue-400 cursor-pointer w-4 h-4"
              />
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. WORLD / VISUAL LAYER DO MÓDULO DE NEVE (60 FPS CANVAS + BRILHO CROMÁTICO)
// ============================================================================
interface WorldLayerProps {
  snowConfig: SnowConfig | undefined;
  playerRef: React.MutableRefObject<{ x: number; y: number } | null> | React.RefObject<any>;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

interface Flake {
  x: number;
  y: number;
  radius: number;
  speed: number;
  wind: number;
  chromaPhase: number;
  hasChroma: boolean;
  opacity: number;
}

export const SnowWorldLayer: React.FC<WorldLayerProps> = ({
  snowConfig,
  playerRef,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const density = Math.max(1, Math.min(10, snowConfig?.density ?? 6));
    const flakeCount = Math.round(density * 18 * scale);
    const fallSpeedBase = (snowConfig?.speed ?? 3.2);
    const windDrift = (snowConfig?.windDrift ?? 15) * 0.05 * scale;
    const hasChromatic = snowConfig?.chromaticSparkle !== false;

    const flakes: Flake[] = Array.from({ length: flakeCount }).map((_, i) => ({
      x: Math.random() * totalMapWidth * scale,
      y: Math.random() * totalMapHeight * scale,
      radius: (1.2 + Math.random() * 2.8) * scale,
      speed: (1.2 + Math.random() * 2.2) * (4.0 / fallSpeedBase) * scale,
      wind: windDrift + (Math.random() - 0.5) * 0.4 * scale,
      chromaPhase: Math.random() * Math.PI * 2,
      hasChroma: hasChromatic && i % 5 === 0,
      opacity: 0.5 + Math.random() * 0.5,
    }));

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;

      for (const flake of flakes) {
        flake.y += flake.speed * (dt / 16);
        flake.x += (flake.wind + Math.sin(now * 0.002 + flake.chromaPhase) * 0.5 * scale) * (dt / 16);

        if (flake.y > height) {
          flake.y = -10;
          flake.x = Math.random() * width;
        }
        if (flake.x > width) flake.x = 0;
        if (flake.x < 0) flake.x = width;

        ctx.save();
        ctx.beginPath();
        ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);

        // Se tiver micro-brilho cromático de vez em quando:
        if (flake.hasChroma) {
          const shimmer = Math.sin(now * 0.004 + flake.chromaPhase);
          if (shimmer > 0.6) {
            // Brilho cromático cintilante
            const hue = (now * 0.2 + flake.chromaPhase * 60) % 360;
            ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${flake.opacity})`;
            ctx.shadowColor = `hsla(${hue}, 100%, 75%, 0.8)`;
            ctx.shadowBlur = 6 * scale;
          } else {
            ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
          }
        } else {
          ctx.fillStyle = `rgba(240, 248, 255, ${flake.opacity})`;
        }

        ctx.fill();
        ctx.restore();
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    snowConfig?.density,
    snowConfig?.speed,
    snowConfig?.windDrift,
    snowConfig?.chromaticSparkle,
    scale,
    totalMapWidth,
    totalMapHeight,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 w-full h-full pointer-events-none z-[9935]"
    />
  );
};

// ============================================================================
// ============================================================================
// 3. CAMADA DE SOLO PROCEDURAL: POÇAS/BANCOS DE NEVE + PEGADAS + POZINHO DE NEVE
// ============================================================================
interface GroundSnowProps {
  snowConfig: SnowConfig | undefined;
  isSnowActive: boolean;
  playerRef: React.MutableRefObject<{ x: number; y: number } | null>;
  isMoving: boolean;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

interface SnowPatch {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
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

export const ProceduralSnowGroundLayer: React.FC<GroundSnowProps> = ({
  snowConfig,
  isSnowActive,
  playerRef,
  isMoving,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const footprintsRef = useRef<SnowFootprint[]>([]);
  const snowPuffsRef = useRef<SnowPuff[]>([]);
  const prevPlayerPos = useRef<{ x: number; y: number } | null>(null);
  const stepSideRef = useRef<boolean>(false);
  const snowDepthRef = useRef<number>(isSnowActive ? 0.65 : 0.0);

  // Gera bancos e poças de neve fofa orgânicos espalhados pelo mapa
  const snowPatchesRef = useRef<SnowPatch[]>([]);
  useEffect(() => {
    const w = totalMapWidth * scale;
    const h = totalMapHeight * scale;
    const count = 14;
    const list: SnowPatch[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: ((i * 311 + 90) % (w - 120 * scale)) + 60 * scale,
        y: ((i * 439 + 75) % (h - 150 * scale)) + 75 * scale,
        rx: (35 + ((i * 19) % 32)) * scale,
        ry: (22 + ((i * 13) % 20)) * scale,
        rot: ((i * 29) % 360) * (Math.PI / 180),
      });
    }
    snowPatchesRef.current = list;
  }, [totalMapWidth, totalMapHeight, scale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      // 1. Acúmulo de Neve no Solo com o tempo
      if (isSnowActive && snowConfig?.accumulateOnGround !== false) {
        snowDepthRef.current = Math.min(0.85, snowDepthRef.current + (dt * 0.0003));
      } else {
        snowDepthRef.current = Math.max(0, snowDepthRef.current - (dt * 0.0004));
      }

      const sDepth = snowDepthRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (sDepth > 0.02) {
        ctx.save();
        const cur = playerRef.current;

        // 2. Desenha os Bancos e Poças de Neve no Chão
        for (const patch of snowPatchesRef.current) {
          ctx.save();
          ctx.translate(patch.x, patch.y);
          ctx.rotate(patch.rot);

          // Sombra suave de profundidade da neve fofa
          ctx.beginPath();
          ctx.ellipse(0, 2 * scale, patch.rx * 1.05, patch.ry * 1.05, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(148, 163, 184, ${sDepth * 0.35})`;
          ctx.fill();

          // Corpo da poça de neve: gradiente branco fofo com azul polar
          const grad = ctx.createRadialGradient(0, 0, patch.rx * 0.15, 0, 0, patch.rx);
          grad.addColorStop(0, `rgba(255, 255, 255, ${sDepth * 0.95})`);
          grad.addColorStop(0.55, `rgba(240, 249, 255, ${sDepth * 0.88})`);
          grad.addColorStop(0.88, `rgba(219, 234, 254, ${sDepth * 0.65})`);
          grad.addColorStop(1, `rgba(191, 219, 254, 0)`);

          ctx.beginPath();
          ctx.ellipse(0, 0, patch.rx, patch.ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Micro relevo de neve com ondulação suave
          ctx.beginPath();
          ctx.ellipse(-patch.rx * 0.2, -patch.ry * 0.2, patch.rx * 0.45, patch.ry * 0.45, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${sDepth * 0.5})`;
          ctx.fill();

          ctx.restore();

          // Detecção de passos do herói no banco de neve -> Levanta pozinho de neve!
          if (cur && isMoving && snowConfig?.footstepTracks !== false) {
            const px = cur.x * scale;
            const py = cur.y * scale;
            const dist = Math.hypot(px - patch.x, py - patch.y);
            if (dist < patch.rx + 6 * scale && Math.random() < 0.25) {
              snowPuffsRef.current.push({
                x: px + (Math.random() - 0.5) * 8 * scale,
                y: py + (Math.random() - 0.5) * 4 * scale,
                vx: (Math.random() - 0.5) * 1.2 * scale,
                vy: -(1.2 + Math.random() * 1.6) * scale,
                radius: (2 + Math.random() * 3) * scale,
                opacity: 0.9,
              });
            }
          }
        }

        // 3. Registro de Pegadas quando o Herói Caminha
        if (cur && isMoving && snowConfig?.footstepTracks !== false) {
          if (!prevPlayerPos.current) {
            prevPlayerPos.current = { x: cur.x, y: cur.y };
          } else {
            const dx = cur.x - prevPlayerPos.current.x;
            const dy = cur.y - prevPlayerPos.current.y;
            const dist = Math.hypot(dx, dy);

            // A cada ~13px de caminhada, carimba uma pegada
            if (dist > 13) {
              const angle = Math.atan2(dy, dx);
              stepSideRef.current = !stepSideRef.current;
              const perpAngle = angle + (stepSideRef.current ? Math.PI / 2 : -Math.PI / 2);
              const footX = (cur.x * scale) + Math.cos(perpAngle) * (4.5 * scale);
              const footY = (cur.y * scale) + Math.sin(perpAngle) * (4.5 * scale);

              footprintsRef.current.push({
                x: footX,
                y: footY,
                angle,
                isLeft: stepSideRef.current,
                opacity: 0.95,
              });

              if (footprintsRef.current.length > 80) {
                footprintsRef.current.shift();
              }

              prevPlayerPos.current = { x: cur.x, y: cur.y };
            }
          }
        } else if (!isMoving) {
          prevPlayerPos.current = null;
        }

        // 4. Desenha as Pegadas Afundadas na Neve
        if (footprintsRef.current.length > 0) {
          for (const fp of footprintsRef.current) {
            ctx.save();
            ctx.translate(fp.x, fp.y);
            ctx.rotate(fp.angle);

            const fWidth = 7 * scale;
            const fLength = 12 * scale;

            // Sombra interna da sola da bota
            ctx.beginPath();
            ctx.ellipse(0, 0, fWidth * 0.48, fLength * 0.48, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(30, 41, 59, ${fp.opacity * sDepth * 0.7})`;
            ctx.fill();

            // Salto traseiro afundado
            ctx.beginPath();
            ctx.ellipse(0, fLength * 0.35, fWidth * 0.38, fLength * 0.22, 0, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(15, 23, 42, ${fp.opacity * sDepth * 0.85})`;
            ctx.fill();

            // Bordo de neve comprimida branca brilhante
            ctx.beginPath();
            ctx.ellipse(0, 0, fWidth * 0.6, fLength * 0.6, 0, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(255, 255, 255, ${fp.opacity * sDepth * 0.8})`;
            ctx.lineWidth = 1.3 * scale;
            ctx.stroke();

            ctx.restore();
          }
        }

        // 5. Partículas de Pozinho de Neve Levantadas pelos Pés
        if (snowPuffsRef.current.length > 0) {
          for (const puff of snowPuffsRef.current) {
            puff.x += puff.vx * (dt / 16);
            puff.y += puff.vy * (dt / 16);
            puff.vy += 0.05 * (dt / 16); // gravidade
            puff.opacity -= 0.02 * (dt / 16);

            ctx.beginPath();
            ctx.arc(puff.x, puff.y, puff.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, puff.opacity * sDepth)})`;
            ctx.fill();
          }
          snowPuffsRef.current = snowPuffsRef.current.filter((p) => p.opacity > 0.02);
        }

        ctx.restore();
      }

      // Neve fresca caindo apaga pegadas lentamente
      const fillRate = (isSnowActive ? 0.00006 : 0.00004) * dt;
      footprintsRef.current.forEach((fp) => {
        fp.opacity = Math.max(0, fp.opacity - fillRate);
      });
      footprintsRef.current = footprintsRef.current.filter((fp) => fp.opacity > 0.02);

      if (!isSnowActive && sDepth <= 0.005 && footprintsRef.current.length === 0 && snowPuffsRef.current.length === 0) {
        return;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    isSnowActive,
    snowConfig?.accumulateOnGround,
    snowConfig?.footstepTracks,
    scale,
    isMoving,
  ]);

  if (!isSnowActive && snowDepthRef.current <= 0.005 && footprintsRef.current.length === 0) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 w-full h-full pointer-events-none z-[5]"
    />
  );
};

// ============================================================================
// 4. CAMADA DE POÇAS D'ÁGUA PROCEDURAIS COM ONDULAÇÕES & RESPINGOS DE PASSOS
// ============================================================================
interface RainPuddlesProps {
  rainConfig: RainConfig | undefined;
  isRainActive: boolean;
  playerRef: React.MutableRefObject<{ x: number; y: number } | null> | React.RefObject<any>;
  isMoving: boolean;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

interface WaterPuddle {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rot: number;
  ripplePhase: number;
}

interface FootSplash {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
}

export const ProceduralRainPuddlesLayer: React.FC<RainPuddlesProps> = ({
  rainConfig,
  isRainActive,
  playerRef,
  isMoving,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const splashesRef = useRef<FootSplash[]>([]);
  const lastSplashTimeRef = useRef<number>(0);
  const puddleAlphaRef = useRef<number>(isRainActive ? 0.95 : 0.0);

  // Gera poças d'água orgânicas espalhadas pelo bioma
  const puddlesRef = useRef<WaterPuddle[]>([]);
  useEffect(() => {
    const w = totalMapWidth * scale;
    const h = totalMapHeight * scale;
    const count = 12;
    const list: WaterPuddle[] = [];
    for (let i = 0; i < count; i++) {
      list.push({
        x: ((i * 373 + 110) % (w - 140 * scale)) + 70 * scale,
        y: ((i * 491 + 80) % (h - 160 * scale)) + 80 * scale,
        rx: (36 + ((i * 19) % 30)) * scale,
        ry: (20 + ((i * 11) % 18)) * scale,
        rot: ((i * 33) % 360) * (Math.PI / 180),
        ripplePhase: (i * 0.17) % 1,
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
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      // 1. Transição rápida de formação da água
      if (isRainActive && rainConfig?.puddlesEnabled !== false) {
        puddleAlphaRef.current = Math.min(1.0, puddleAlphaRef.current + (dt * 0.0006));
      } else {
        puddleAlphaRef.current = Math.max(0, puddleAlphaRef.current - (dt * 0.0008));
      }

      const pAlpha = puddleAlphaRef.current;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (pAlpha > 0.02) {
        ctx.save();
        const curPlayer = playerRef.current;

        // 2. Desenho das Poças d'Água com reflexo vítreo e bordas úmidas
        for (const puddle of puddlesRef.current) {
          ctx.save();
          ctx.translate(puddle.x, puddle.y);
          ctx.rotate(puddle.rot);

          // Borda de terra úmida escura em volta da poça
          ctx.beginPath();
          ctx.ellipse(0, 0, puddle.rx * 1.14, puddle.ry * 1.14, 0, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(15, 23, 42, ${pAlpha * 0.42})`;
          ctx.fill();

          // Espelho d'água com reflexo azul celeste vítreo e brilho especular
          const grad = ctx.createRadialGradient(-puddle.rx * 0.25, -puddle.ry * 0.25, puddle.rx * 0.05, 0, 0, puddle.rx);
          grad.addColorStop(0, `rgba(224, 242, 254, ${pAlpha * 0.85})`);
          grad.addColorStop(0.35, `rgba(56, 189, 248, ${pAlpha * 0.6})`);
          grad.addColorStop(0.75, `rgba(2, 132, 199, ${pAlpha * 0.45})`);
          grad.addColorStop(1, `rgba(14, 116, 144, 0)`);

          ctx.beginPath();
          ctx.ellipse(0, 0, puddle.rx, puddle.ry, 0, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();

          // Ondulações de pingos de chuva caindo na poça
          const rTime = ((now * 0.0018 + puddle.ripplePhase * 10) % 1);
          const rRadius = rTime * puddle.rx * 0.85;
          ctx.beginPath();
          ctx.ellipse(0, 0, rRadius, rRadius * (puddle.ry / puddle.rx), 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(224, 242, 254, ${(1 - rTime) * pAlpha * 0.75})`;
          ctx.lineWidth = 1.4 * scale;
          ctx.stroke();

          ctx.restore();

          // 3. Detecção de passos do herói na poça d'água -> Respingos (Splash)!
          if (curPlayer && isMoving && rainConfig?.puddleSplashes !== false) {
            const px = curPlayer.x * scale;
            const py = curPlayer.y * scale;
            const dx = px - puddle.x;
            const dy = py - puddle.y;
            const dist = Math.hypot(dx, dy);

            if (dist < puddle.rx + 10 * scale && now - lastSplashTimeRef.current > 150) {
              lastSplashTimeRef.current = now;
              splashesRef.current.push({
                x: px,
                y: py,
                radius: 4 * scale,
                maxRadius: (24 + Math.random() * 12) * scale,
                opacity: 0.95,
              });
            }
          }
        }
        ctx.restore();
      }

      // 4. Renderiza e anima os respingos de passos na água
      if (splashesRef.current.length > 0) {
        ctx.save();
        for (const splash of splashesRef.current) {
          splash.radius += dt * 0.085 * scale;
          splash.opacity = Math.max(0, 1 - (splash.radius / splash.maxRadius));

          ctx.beginPath();
          ctx.ellipse(splash.x, splash.y, splash.radius, splash.radius * 0.45, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(224, 242, 254, ${splash.opacity * 0.95})`;
          ctx.lineWidth = 2 * scale;
          ctx.stroke();

          // Gotículas saltando
          const dropDist = splash.radius * 0.9;
          ctx.fillStyle = `rgba(240, 249, 255, ${splash.opacity * 0.9})`;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
            ctx.beginPath();
            ctx.arc(splash.x + Math.cos(a) * dropDist, splash.y + Math.sin(a) * dropDist * 0.45, 1.6 * scale, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        splashesRef.current = splashesRef.current.filter((s) => s.opacity > 0.05);
        ctx.restore();
      }

      if (!isRainActive && pAlpha <= 0.005 && splashesRef.current.length === 0) {
        return;
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    isRainActive,
    rainConfig?.puddlesEnabled,
    rainConfig?.puddleSplashes,
    scale,
    isMoving,
  ]);

  if (!isRainActive && puddleAlphaRef.current <= 0.005 && splashesRef.current.length === 0) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 w-full h-full pointer-events-none z-[4]"
    />
  );
};

// ============================================================================
// 5. CHUVA VOLUMÉTRICA REAL NO AR (RISCOS CINEMÁTICOS DE GOTAS EM ALTA VELOCIDADE)
// ============================================================================
interface VolumetricRainProps {
  rainConfig: RainConfig | undefined;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

interface RainDropStreak {
  x: number;
  y: number;
  length: number;
  speed: number;
  thickness: number;
  opacity: number;
}

export const VolumetricRainWorldLayer: React.FC<VolumetricRainProps> = ({
  rainConfig,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const density = Math.max(2, Math.min(10, rainConfig?.intensity ?? 6));
    const streakCount = Math.round(density * 22 * scale);
    const slantX = -4 * scale; // Ângulo de queda com vento

    const streaks: RainDropStreak[] = Array.from({ length: streakCount }).map(() => ({
      x: Math.random() * (canvas.width + 100),
      y: Math.random() * canvas.height,
      length: (20 + Math.random() * 26) * scale,
      speed: (14 + Math.random() * 12) * scale,
      thickness: (1.0 + Math.random() * 1.2) * scale,
      opacity: 0.35 + Math.random() * 0.45,
    }));

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      for (const s of streaks) {
        s.y += s.speed * (dt / 16);
        s.x += slantX * (dt / 16);

        if (s.y > canvas.height) {
          s.y = -s.length;
          s.x = Math.random() * (canvas.width + 100);
        }
        if (s.x < 0) s.x = canvas.width;

        const grad = ctx.createLinearGradient(s.x, s.y, s.x + slantX * 0.6, s.y + s.length);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.6, `rgba(186, 230, 253, ${s.opacity})`);
        grad.addColorStop(1, `rgba(224, 242, 254, ${s.opacity * 1.2})`);

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + slantX * 0.6, s.y + s.length);
        ctx.strokeStyle = grad;
        ctx.lineWidth = s.thickness;
        ctx.stroke();
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [rainConfig?.intensity, scale, totalMapWidth, totalMapHeight]);

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 w-full h-full pointer-events-none z-[9936]"
    />
  );
};

// ============================================================================
// 6. TUFOS DE FOLHAS NO SOLO QUE SE ESPALHAM EM 3D AO PASSAR (INTERACTIVE LEAF PILES)
// ============================================================================
interface LeafPilesProps {
  leavesConfig: LeavesConfig | undefined;
  isLeavesActive: boolean;
  playerRef: React.MutableRefObject<{ x: number; y: number } | null> | React.RefObject<any>;
  isMoving: boolean;
  scale: number;
  totalMapWidth: number;
  totalMapHeight: number;
}

interface GroundPileLeaf {
  id: number;
  baseX: number;
  baseY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  rotSpeed: number;
  size: number;
  color: string;
  scattered: boolean;
  opacity: number;
  scatterTime: number;
}

export const InteractiveLeafPilesLayer: React.FC<LeafPilesProps> = ({
  leavesConfig,
  isLeavesActive,
  playerRef,
  isMoving,
  scale,
  totalMapWidth,
  totalMapHeight,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const leavesRef = useRef<GroundPileLeaf[]>([]);

  // Cores de folhas por preset ou matiz personalizada do usuário
  const preset = leavesConfig?.preset || 'autumn';
  const customTint = leavesConfig?.customTint;
  const leafColors = useMemo(() => {
    if (customTint) {
      return [customTint, customTint, customTint];
    }
    switch (preset) {
      case 'spring':
        return ['#f472b6', '#fb7185', '#fda4af', '#86efac'];
      case 'dry':
        return ['#78350f', '#92400e', '#b45309', '#d97706'];
      case 'jungle':
        return ['#10b981', '#059669', '#84cc16', '#22c55e'];
      case 'mystic':
        return ['#a855f7', '#c084fc', '#7e22ce', '#e879f9'];
      case 'frost':
        return ['#38bdf8', '#7dd3fc', '#bae6fd', '#e0f2fe'];
      case 'neon':
        return ['#06b6d4', '#f43f5e', '#a855f7', '#22c55e'];
      case 'autumn':
      default:
        return ['#f59e0b', '#d97706', '#ea580c', '#dc2626', '#b45309'];
    }
  }, [preset, customTint]);

  // Cria tufos e montes de folhas no chão
  useEffect(() => {
    const w = totalMapWidth * scale;
    const h = totalMapHeight * scale;
    const pileCount = 14;
    const list: GroundPileLeaf[] = [];
    let idCounter = 0;

    for (let p = 0; p < pileCount; p++) {
      const px = ((p * 347 + 85) % (w - 140 * scale)) + 70 * scale;
      const py = ((p * 463 + 95) % (h - 150 * scale)) + 75 * scale;
      const leavesInPile = 5 + (p % 4);

      for (let l = 0; l < leavesInPile; l++) {
        const angle = Math.random() * Math.PI * 2;
        const rad = Math.random() * 16 * scale;
        const lx = px + Math.cos(angle) * rad;
        const ly = py + Math.sin(angle) * rad;
        list.push({
          id: idCounter++,
          baseX: lx,
          baseY: ly,
          x: lx,
          y: ly,
          vx: 0,
          vy: 0,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: 0,
          size: (10 + Math.random() * 6) * scale,
          color: leafColors[idCounter % leafColors.length],
          scattered: false,
          opacity: 0.95,
          scatterTime: 0,
        });
      }
    }
    leavesRef.current = list;
  }, [totalMapWidth, totalMapHeight, scale, leafColors]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!isLeavesActive) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const curPlayer = playerRef.current;
      const px = curPlayer ? curPlayer.x * scale : -9999;
      const py = curPlayer ? curPlayer.y * scale : -9999;
      const triggerRadius = 36 * scale;

      ctx.save();
      for (const leaf of leavesRef.current) {
        // 1. Detecção de colisão do herói pisando / passando nas folhas -> ESPALHA EM 3D!
        if (!leaf.scattered && curPlayer) {
          const dx = leaf.x - px;
          const dy = leaf.y - py;
          const dist = Math.hypot(dx, dy);

          if (dist < triggerRadius) {
            leaf.scattered = true;
            leaf.scatterTime = now;
            const angle = Math.atan2(dy, dx);
            const speed = (isMoving ? 4.5 : 2.5) + Math.random() * 3.5;
            leaf.vx = Math.cos(angle) * speed * scale;
            leaf.vy = Math.sin(angle) * speed * scale - (2.5 + Math.random() * 2.5) * scale; // Salta no ar!
            leaf.rotSpeed = (Math.random() - 0.5) * 0.45;
          }
        }

        // 2. Física de vôo e dispersão
        if (leaf.scattered) {
          leaf.x += leaf.vx * (dt / 16);
          leaf.y += leaf.vy * (dt / 16);
          leaf.vx *= 0.92; // atrito do ar
          leaf.vy += 0.12 * scale * (dt / 16); // gravidade
          leaf.rot += leaf.rotSpeed * (dt / 16);

          // Desvanecimento suave conforme espalha
          const timeSinceScatter = now - leaf.scatterTime;
          if (timeSinceScatter > 600) {
            leaf.opacity = Math.max(0, 1 - (timeSinceScatter - 600) / 800);
          }

          // Após ~6 segundos, a folha cai suavemente de volta no monte original
          if (timeSinceScatter > 6000) {
            leaf.scattered = false;
            leaf.x = leaf.baseX;
            leaf.y = leaf.baseY;
            leaf.vx = 0;
            leaf.vy = 0;
            leaf.opacity = 0.95;
            leaf.rot = Math.random() * Math.PI * 2;
          }
        }

        // 3. Renderiza a Folha Orgânica com Veio Central
        if (leaf.opacity > 0.02) {
          ctx.save();
          ctx.translate(leaf.x, leaf.y);
          ctx.rotate(leaf.rot);

          // Folha em formato elíptico pontudo
          ctx.beginPath();
          ctx.ellipse(0, 0, leaf.size * 0.6, leaf.size * 0.3, 0, 0, Math.PI * 2);
          ctx.fillStyle = leaf.color;
          ctx.globalAlpha = leaf.opacity;
          ctx.fill();

          // Veio central da folha
          ctx.beginPath();
          ctx.moveTo(-leaf.size * 0.5, 0);
          ctx.lineTo(leaf.size * 0.5, 0);
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.lineWidth = 1 * scale;
          ctx.stroke();

          ctx.restore();
        }
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    if (isLeavesActive) {
      animId = requestAnimationFrame(loop);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    return () => cancelAnimationFrame(animId);
  }, [isLeavesActive, scale, isMoving]);

  if (!isLeavesActive) return null;

  return (
    <canvas
      ref={canvasRef}
      width={Math.min(3840, Math.round(totalMapWidth * scale))}
      height={Math.min(3840, Math.round(totalMapHeight * scale))}
      className="absolute inset-0 w-full h-full pointer-events-none z-[6]"
    />
  );
};

// ============================================================================
// 7. SISTEMA VIVO DE NEVE NO CORPO DO HERÓI (DYNAMIC PLAYER SNOW)
// ============================================================================
interface DynamicPlayerSnowProps {
  isSnowActive: boolean;
  isMoving: boolean;
  baseSize: number;
  accumulateOnPlayer?: boolean;
}

interface FallingSnowParticle {
  id: number;
  x: number;
  y: number;
  vy: number;
  vx: number;
  size: number;
  opacity: number;
}

export const DynamicPlayerSnow: React.FC<DynamicPlayerSnowProps> = ({
  isSnowActive,
  isMoving,
  baseSize,
  accumulateOnPlayer,
}) => {
  const [accumulation, setAccumulation] = useState<number>(isSnowActive ? 0.4 : 0);
  const [particles, setParticles] = useState<FallingSnowParticle[]>([]);
  const idRef = useRef<number>(0);

  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(32, now - lastTime);
      lastTime = now;

      setAccumulation((prev: number) => {
        if (isSnowActive && accumulateOnPlayer !== false) {
          if (isMoving) {
            // Em movimento: a neve acumulada sacode e cai aos poucos
            const next = Math.max(0, prev - (0.015 * (dt / 16)));
            // Se houver neve acumulada, gera partículas caindo do corpo
            if (prev > 0.05 && Math.random() < 0.35) {
              setParticles((p: FallingSnowParticle[]) => [
                ...p.slice(-15),
                {
                  id: idRef.current++,
                  x: (Math.random() - 0.5) * baseSize * 0.65,
                  y: -baseSize * 0.85 + Math.random() * (baseSize * 0.25),
                  vx: (Math.random() - 0.5) * 1.2,
                  vy: 1.5 + Math.random() * 1.8,
                  size: 2.2 + Math.random() * 2.8,
                  opacity: 0.95,
                },
              ]);
            }
            return next;
          } else {
            // Parado: acumula suavemente até 1.0 (flocos pousando na cabeça)
            return Math.min(1.0, prev + (0.007 * (dt / 16)));
          }
        } else {
          // Desativado: derrete gradualmente
          return Math.max(0, prev - (0.02 * (dt / 16)));
        }
      });

      // Atualiza partículas caindo
      setParticles((prevList: FallingSnowParticle[]) =>
        prevList
          .map((p: FallingSnowParticle) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.1, // gravidade
            opacity: p.opacity - 0.025,
          }))
          .filter((p: FallingSnowParticle) => p.opacity > 0.05 && p.y < 10)
      );

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isSnowActive, isMoving, accumulateOnPlayer, baseSize]);

  if (accumulation <= 0.02 && particles.length === 0) return null;

  const capWidth = Math.round(baseSize * (0.65 + accumulation * 0.2));
  const capHeight = Math.round(baseSize * (0.16 + accumulation * 0.14));

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-30">
      {/* 1. Manto e Tufos de Neve Acumulada no Topo da Cabeça e Ombros */}
      {accumulation > 0.02 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-all duration-300"
          style={{
            top: `${Math.round(-capHeight * 0.45)}px`,
            width: `${capWidth}px`,
            height: `${capHeight}px`,
            opacity: Math.min(1, accumulation * 1.2),
          }}
        >
          {/* Tufo Central Fofo */}
          <div
            className="w-full h-full rounded-full"
            style={{
              background: 'radial-gradient(ellipse at 50% 100%, #ffffff 0%, #f0f9ff 65%, rgba(219, 234, 254, 0.8) 100%)',
              boxShadow: '0 2px 5px rgba(186, 230, 253, 0.9), inset 0 1px 2px #ffffff',
              filter: 'drop-shadow(0 1px 2px rgba(15, 23, 42, 0.35))',
            }}
          />

          {/* Micro Tufo Ombro Esquerdo */}
          <div
            className="absolute -left-1.5 bottom-0 rounded-full"
            style={{
              width: `${Math.round(capWidth * 0.35)}px`,
              height: `${Math.round(capHeight * 0.65)}px`,
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(186, 230, 253, 0.7)',
            }}
          />

          {/* Micro Tufo Ombro Direito */}
          <div
            className="absolute -right-1.5 bottom-0 rounded-full"
            style={{
              width: `${Math.round(capWidth * 0.35)}px`,
              height: `${Math.round(capHeight * 0.65)}px`,
              background: '#ffffff',
              boxShadow: '0 1px 3px rgba(186, 230, 253, 0.7)',
            }}
          />

          {/* Cintilação de Micro-Cristal */}
          {accumulation > 0.4 && (
            <div
              className="absolute top-0.5 right-2 w-1.5 h-1.5 rounded-full bg-white animate-ping opacity-75"
              style={{ animationDuration: '2.5s' }}
            />
          )}
        </div>
      )}

      {/* 2. Partículas e Flocos Caindo do Corpo ao Andar */}
      {particles.map((p: FallingSnowParticle) => (
        <div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `calc(50% + ${p.x}px)`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: '#ffffff',
            opacity: p.opacity,
            boxShadow: '0 0 3px rgba(224, 242, 254, 0.9)',
          }}
        />
      ))}
    </div>
  );
};


