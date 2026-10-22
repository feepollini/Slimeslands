import React from 'react';
import {
  Move,
  MapPin,
  Paintbrush,
  PenTool,
  Layers,
  WandSparkles,
  Sparkles,
  Rocket,
  CircleDot,
} from 'lucide-react';
import type { ActiveTool, TabId } from '../../types/map';

interface FloatingToolsBarProps {
  activeTab: TabId;
  activeTool: ActiveTool;
  setActiveTab: (tab: TabId) => void;
  setActiveTool: (tool: ActiveTool | ((prev: ActiveTool) => ActiveTool)) => void;
  onMotionTool: () => void;
  onEffectTool: () => void;
}

export const FloatingToolsBar: React.FC<FloatingToolsBarProps> = ({
  activeTab,
  activeTool,
  setActiveTab,
  setActiveTool,
  onMotionTool,
  onEffectTool,
}) => {
  if (activeTab === 'motion_canvas' || activeTab === 'map') return null;

  return (
    <div
      className="absolute bottom-4 z-40 flex items-center gap-1 p-1 bg-black/95 backdrop-blur-md rounded-lg border border-zinc-800 shadow-2xl select-none"
      style={{
        left: activeTab !== 'editor' ? 'calc(50% + 192px)' : '50%',
        transform: 'translateX(-50%)',
      }}
    >
      {/* Navegar */}
      <button
        onClick={() => {
          setActiveTool('pan');
          if (activeTab === 'motion' || activeTab === 'effect' || activeTab === 'stamp') setActiveTab('editor');
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTool === 'pan' &&
          activeTab !== 'markers' &&
          activeTab !== 'limits' &&
          activeTab !== 'motion' &&
          activeTab !== 'effect' &&
          activeTab !== 'stamp'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Mover e Navegar (Pan)"
      >
        <Move className="w-3.5 h-3.5 text-zinc-300" />
        <span>Navegar</span>
      </button>

      {/* Marcadores */}
      <button
        onClick={() => {
          if (activeTab !== 'markers') {
            setActiveTab('markers');
            setActiveTool('add_marker');
          } else {
            setActiveTool((prev) => (prev === 'add_marker' ? 'pan' : 'add_marker'));
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTab === 'markers'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Marcadores & Objetos"
      >
        <MapPin className="w-3.5 h-3.5 text-orange-400" />
        <span>Marcadores</span>
        {activeTab === 'markers' && (
          <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-orange-500/20 text-orange-400">
            {activeTool === 'add_marker' ? '+' : 'Sel'}
          </span>
        )}
      </button>

      {/* Pen Colisão (Limites) */}
      <button
        onClick={() => {
          if (activeTool === 'motion_pen' || activeTool === 'effect_pen' || activeTool === 'stamp_brush') setActiveTool('pan');
          setActiveTab(activeTab === 'limits' ? 'editor' : 'limits');
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTab === 'limits'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Pen Colisão: Definir limites sólidos e caminháveis"
      >
        <Paintbrush className="w-3.5 h-3.5 text-emerald-400" />
        <span>Pen Colisão</span>
      </button>

      {/* Pen Motion */}
      <button
        onClick={onMotionTool}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTool === 'motion_pen' || activeTab === 'motion'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Pen Motion: Recorte orgânico e física viva"
      >
        <WandSparkles className="w-3.5 h-3.5 text-orange-400" />
        <span>Pen Motion</span>
      </button>

      {/* Pen Efeitos */}
      <button
        onClick={onEffectTool}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTool === 'effect_pen' || activeTab === 'effect'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Pen Efeitos: Auras, sombras, partículas e VFX"
      >
        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
        <span>Pen Efeitos</span>
      </button>

      {/* Pen Marcador */}
      <button
        onClick={() => {
          if (activeTab === 'marker_pen') {
            setActiveTab('editor');
            setActiveTool('pan');
          } else {
            setActiveTab('marker_pen');
            setActiveTool('marker_pen');
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTab === 'marker_pen' || activeTool === 'marker_pen'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Pen Marcador: Pincelar marcadores da galeria"
      >
        <PenTool className="w-3.5 h-3.5 text-zinc-300" />
        <span>Pen Marcador</span>
      </button>

      {/* Pen Grama */}
      <button
        onClick={() => {
          if (activeTab === 'terrain_pen') {
            setActiveTab('editor');
            setActiveTool('pan');
          } else {
            setActiveTab('terrain_pen');
            setActiveTool('terrain_pen');
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTab === 'terrain_pen' || activeTool === 'terrain_pen'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Pen Grama: Pincele gramas vivas e texturas de solo"
      >
        <Paintbrush className="w-3.5 h-3.5 text-emerald-400" />
        <span>Pen Grama</span>
      </button>

      {/* Pen Stamp (Carimbo de Chão) */}
      <button
        onClick={() => {
          if (activeTab === 'stamp') {
            setActiveTab('editor');
            setActiveTool('pan');
          } else {
            setActiveTab('stamp');
            setActiveTool('stamp_brush');
          }
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTab === 'stamp' || activeTool === 'stamp_brush'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Pen Stamp: Carimbo de texturas e decalques PNG no chão"
      >
        <CircleDot className="w-3.5 h-3.5 text-orange-400" />
        <span>Pen Stamp</span>
      </button>

      {/* Camadas */}
      <button
        onClick={() => {
          setActiveTab(activeTab === 'layers' ? 'editor' : 'layers');
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTab === 'layers'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Camadas de Marcadores"
      >
        <Layers className="w-3.5 h-3.5 text-zinc-400" />
        <span>Camadas</span>
      </button>

      {/* Spawn */}
      <button
        onClick={() => {
          setActiveTab(activeTab === 'spawn' ? 'editor' : 'spawn');
        }}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
          activeTab === 'spawn'
            ? 'bg-zinc-850 text-white border border-zinc-700'
            : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
        }`}
        title="Spawn do Jogador"
      >
        <Rocket className="w-3.5 h-3.5 text-orange-400" />
        <span>Spawn</span>
      </button>
    </div>
  );
};
