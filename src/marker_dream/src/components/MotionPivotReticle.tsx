import React from 'react';
import { Crosshair } from 'lucide-react';

interface Props {
  x: number; // Posição X em pixels no canvas renderizado
  y: number; // Posição Y em pixels no canvas renderizado
  zoom: number;
  rotation?: number;
  label?: string;
  isInteractive?: boolean;
  onDragPivot?: (nx: number, ny: number) => void;
}

export const MotionPivotReticle: React.FC<Props> = ({
  x,
  y,
  zoom,
  rotation = 0,
  label = 'Pivô de Animação',
}) => {
  const screenX = x * zoom;
  const screenY = y * zoom;

  return (
    <div
      className="absolute pointer-events-none z-30 transition-transform duration-75 select-none"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        transform: 'translate(-50%, -50%)',
      }}
    >
      {/* Mira de Eixo Central */}
      <div className="relative flex items-center justify-center">
        {/* Anel Externo Giratório */}
        <div
          className="w-10 h-10 rounded-full border border-dashed border-amber-400/70 animate-[spin_10s_linear_infinite]"
          style={{ transform: `rotate(${rotation}deg)` }}
        />

        {/* Eixo Cruzado (Linha X e Linha Y) */}
        <div className="absolute w-12 h-px bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
        <div className="absolute h-12 w-px bg-amber-400/90 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />

        {/* Ponto Central Iluminado */}
        <div className="absolute w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_12px_#fbbf24] border border-white" />

        {/* Tag Flutuante com Coordenadas */}
        <div
          className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/90 border border-amber-500/60 shadow-lg text-[9px] font-mono text-amber-300 flex items-center gap-1"
        >
          <Crosshair className="w-2.5 h-2.5 text-amber-400" />
          <span>{label}</span>
        </div>
      </div>
    </div>
  );
};
