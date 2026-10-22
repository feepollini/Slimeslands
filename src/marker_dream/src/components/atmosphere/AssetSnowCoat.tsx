import React, { useRef, useState, useEffect } from 'react';

interface AssetSnowCoatProps {
  isSnowActive: boolean;
  isMoving: boolean;
  boxWidth: number;
  boxHeight: number;
  aspectRatio?: number; // naturalWidth / naturalHeight se conhecido
  accumulateEnabled?: boolean;
}

interface SnowShard {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vrot: number;
  size: number;
  opacity: number;
  polygon: string; // CSS clip-path polygon
}

export const AssetSnowCoat: React.FC<AssetSnowCoatProps> = ({
  isSnowActive,
  isMoving,
  boxWidth,
  boxHeight,
  aspectRatio = 1,
  accumulateEnabled = true,
}) => {
  const [accumulation, setAccumulation] = useState<number>(isSnowActive && accumulateEnabled ? 0.75 : 0.0);
  const [shards, setShards] = useState<SnowShard[]>([]);
  const prevMovingRef = useRef<boolean>(isMoving);
  const idRef = useRef<number>(0);

  // Calcula a caixa de renderização real compensando o letterbox do 'object-contain'
  const aspect = aspectRatio > 0 ? aspectRatio : 1;
  let renderWidth = boxWidth;
  let renderHeight = boxHeight;
  let offsetX = 0;
  let offsetY = 0;

  if (aspect > 1) {
    // Sprite mais largo que alto -> letterboxed verticalmente
    renderHeight = boxWidth / aspect;
    offsetY = (boxHeight - renderHeight) / 2;
  } else if (aspect < 1) {
    // Sprite mais alto que largo -> letterboxed horizontalmente
    renderWidth = boxHeight * aspect;
    offsetX = (boxWidth - renderWidth) / 2;
  }

  const snowTopY = offsetY - 3;
  const snowWidth = Math.round(renderWidth * 0.76);
  const snowHeight = Math.max(4, Math.round(renderHeight * 0.2 * Math.min(1, accumulation + 0.1)));

  // Quebra física em cacos quando começa a se mover ou sacode
  useEffect(() => {
    const wasIdle = !prevMovingRef.current;
    prevMovingRef.current = isMoving;

    if (wasIdle && isMoving && accumulation > 0.08) {
      // Dispara o shatter físico!
      const shardCount = Math.min(12, Math.max(6, Math.round(accumulation * 12)));
      const newShards: SnowShard[] = [];

      for (let i = 0; i < shardCount; i++) {
        const normX = (i / shardCount) - 0.5; // -0.5 a 0.5
        const px = (boxWidth / 2) + normX * snowWidth;
        const py = snowTopY + (Math.random() * snowHeight);

        // Polígono irregular de caco de gelo/neve
        const p1 = `${Math.round(20 + Math.random() * 20)}% 0%`;
        const p2 = `100% ${Math.round(20 + Math.random() * 40)}%`;
        const p3 = `${Math.round(60 + Math.random() * 40)}% 100%`;
        const p4 = `0% ${Math.round(40 + Math.random() * 50)}%`;

        newShards.push({
          id: idRef.current++,
          x: px,
          y: py,
          vx: normX * (3.5 + Math.random() * 2.5) + (Math.random() - 0.5) * 1.5,
          vy: -(1.5 + Math.random() * 2.5), // Salto inicial para cima
          rot: Math.random() * 360,
          vrot: (Math.random() - 0.5) * 22,
          size: Math.round(4 + Math.random() * 6),
          opacity: 1.0,
          polygon: `polygon(${p1}, ${p2}, ${p3}, ${p4})`,
        });
      }

      setShards((prev) => [...prev.slice(-16), ...newShards]);
      setAccumulation(0.0);
    }
  }, [isMoving, accumulation, boxWidth, snowTopY, snowWidth, snowHeight]);

  // Loop inteligente: roda a 60 FPS APENAS quando há cacos voando (shards.length > 0),
  // e usa passos suaves de 120ms durante o acúmulo/degelo, parando 100% quando estabilizado!
  const hasShards = shards.length > 0;
  const needsAccumulationChange =
    isSnowActive && accumulateEnabled && !isMoving
      ? accumulation < 0.99
      : !isSnowActive
      ? accumulation > 0.01
      : false;

  useEffect(() => {
    if (!hasShards && !needsAccumulationChange) return;

    let animId: number;
    let timerId: ReturnType<typeof setTimeout> | null = null;
    let lastTime = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.15, (now - lastTime) / 1000);
      lastTime = now;

      // 1. Acúmulo ou degelo suave em Idle
      if (isSnowActive && accumulateEnabled && !isMoving) {
        setAccumulation((prev) => {
          const next = Math.min(1.0, prev + dt * 0.08);
          return Math.abs(next - prev) < 0.005 ? prev : next;
        });
      } else if (!isSnowActive) {
        setAccumulation((prev) => {
          const next = Math.max(0.0, prev - dt * 0.15);
          return Math.abs(next - prev) < 0.005 ? prev : next;
        });
      }

      // 2. Física dos Cacos Quebrados (60 FPS apenas enquanto há cacos no ar)
      if (hasShards) {
        setShards((prevList) => {
          if (prevList.length === 0) return prevList;
          return prevList
            .map((s) => ({
              ...s,
              x: s.x + s.vx * dt * 60,
              y: s.y + s.vy * dt * 60,
              vy: s.vy + 0.28 * dt * 60,
              rot: s.rot + s.vrot * dt * 60,
              opacity: s.opacity - 0.04 * dt * 60,
            }))
            .filter((s) => s.opacity > 0.05 && s.y < boxHeight + 40);
        });
        animId = requestAnimationFrame(step);
      } else {
        timerId = setTimeout(() => step(performance.now()), 120);
      }
    };

    if (hasShards) {
      animId = requestAnimationFrame(step);
    } else {
      timerId = setTimeout(() => step(performance.now()), 120);
    }

    return () => {
      cancelAnimationFrame(animId);
      if (timerId) clearTimeout(timerId);
    };
  }, [hasShards, needsAccumulationChange, isSnowActive, accumulateEnabled, isMoving, boxHeight]);

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-20 overflow-visible">
      {/* 1. Manta de Neve Acumulada no Topo Exato do Sprite */}
      {accumulation > 0.03 && (
        <div
          className="absolute left-1/2 -translate-x-1/2 pointer-events-none transition-transform duration-300"
          style={{
            top: `${snowTopY}px`,
            width: `${snowWidth}px`,
            height: `${snowHeight}px`,
            background: 'radial-gradient(ellipse at 50% 100%, #ffffff 0%, #f0f9ff 65%, rgba(224, 242, 254, 0.5) 100%)',
            borderRadius: '50% 50% 35% 35% / 80% 80% 20% 20%',
            boxShadow: '0 1px 3px rgba(186, 230, 253, 0.8), inset 0 1px 2px #ffffff',
            filter: 'drop-shadow(0 1px 2px rgba(15, 23, 42, 0.25))',
            opacity: Math.min(1, accumulation * 1.2),
          }}
        >
          {/* Cornijas que pendem nas laterais quando maduro */}
          {accumulation > 0.5 && (
            <>
              <div 
                className="absolute left-0 bottom-[-2px] w-1.5 h-2 rounded-full bg-white shadow-sm"
                style={{ opacity: accumulation }}
              />
              <div 
                className="absolute right-0 bottom-[-2px] w-1.5 h-2 rounded-full bg-white shadow-sm"
                style={{ opacity: accumulation }}
              />
            </>
          )}
        </div>
      )}

      {/* 2. Cacos Físicos Poligonais Voando e Caindo com Gravidade */}
      {shards.map((s) => (
        <div
          key={s.id}
          className="absolute bg-white border border-sky-100 shadow-[0_1px_3px_rgba(186,230,253,0.9)]"
          style={{
            left: `${s.x}px`,
            top: `${s.y}px`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            transform: `translate(-50%, -50%) rotate(${s.rot}deg)`,
            clipPath: s.polygon,
            opacity: s.opacity,
          }}
        />
      ))}
    </div>
  );
};
