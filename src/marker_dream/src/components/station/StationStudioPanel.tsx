import React, { useState } from 'react';
import { MapMarker, MapProject, StationActivationTrigger, StationUnlockType } from '../../types/map';
import { 
  createDefaultStationConfig 
} from '../../data/defaultStationAssets';
import { 
  Sparkles, 
  Layers, 
  Maximize2, 
  Lock, 
  Smartphone, 
  SlidersHorizontal, 
  MoveVertical, 
  RotateCcw 
} from 'lucide-react';
import { StationStudioCanvasModal } from './StationStudioCanvasModal';

interface StationStudioPanelProps {
  marker: MapMarker;
  project?: MapProject;
  galleryAssets?: import('../../types/map').GalleryAsset[];
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
}

export const StationStudioPanel: React.FC<StationStudioPanelProps> = ({
  marker,
  project,
  galleryAssets,
  onUpdateMarker,
}) => {
  const station = marker.stationConfig || createDefaultStationConfig('incubator');
  const [isCanvasModalOpen, setIsCanvasModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'general' | 'layout'>('general');

  const slots = station.slots || [];
  const baseScale = station.baseAssetScale || 1.0;

  // Valores de layout da tela interativa com fallbacks amigáveis
  const screenAssetSize = station.screenAssetSize ?? 440;
  const screenAssetOffsetY = station.screenAssetOffsetY ?? 0;
  const titleOffsetY = station.titleOffsetY ?? 80;
  const bottomControlsOffsetY = station.bottomControlsOffsetY ?? 104;

  const updateStation = (patch: Partial<typeof station>) => {
    onUpdateMarker(marker.id, {
      stationConfig: {
        ...station,
        ...patch,
      },
    });
  };

  const handleResetLayout = () => {
    updateStation({
      titleOffsetY: 80,
      screenAssetSize: 440,
      screenAssetOffsetY: 0,
      bottomControlsOffsetY: 104,
    });
  };

  return (
    <div className="space-y-3 bg-slate-900/95 p-3 rounded-2xl border border-amber-500/25 text-white text-xs">
      {/* 1. Cabeçalho Limpo */}
      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
        <div className="flex items-center gap-1.5 font-black text-amber-300">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Estação Interativa</span>
        </div>
        <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-bold border border-amber-500/30">
          {slots.length} Slots
        </span>
      </div>

      {/* 2. NAVEGAÇÃO DE SUB-ABAS (Geral vs Layout da Tela) */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`py-1.5 px-2 rounded-lg font-black text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'general'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Geral & Base</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('layout')}
          className={`py-1.5 px-2 rounded-lg font-black text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'layout'
              ? 'bg-amber-400 text-slate-950 font-black shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Layout da Tela</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUB-ABA 1: GERAL & BASE                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'general' && (
        <div className="space-y-3 animate-fade-in">
          {/* BOTÃO HERO: ABRIR STUDIO CANVAS COMPLETO */}
          <button
            type="button"
            onClick={() => setIsCanvasModalOpen(true)}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 active:scale-98 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.35)] transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-slate-950 animate-pulse" />
            <span>🎨 Abrir Studio Canvas da Estação</span>
          </button>

          {/* CONTROLE DIRETO DO TAMANHO DA BASE PNG NO MAPA */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Tamanho no Mapa Mundial:</span>
              </span>
              <span className="font-mono font-bold text-amber-300 text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {Math.round(baseScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="220"
              step="5"
              value={Math.round(baseScale * 100)}
              onChange={(e) => updateStation({ baseAssetScale: parseInt(e.target.value) / 100 })}
              className="w-full accent-amber-400 cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>40%</span>
              <span>100% (Padrão)</span>
              <span>220%</span>
            </div>
          </div>

          {/* MODO DE ATIVAÇÃO NO MAPA */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-300 block">Gatilho de Ativação:</label>
            <div className="grid grid-cols-3 gap-1">
              {(['proximity', 'click', 'both'] as StationActivationTrigger[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateStation({ activationTrigger: mode })}
                  className={`py-1 rounded-lg text-center font-bold text-[10px] transition-all cursor-pointer border ${
                    (station.activationTrigger || 'both') === mode
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-black'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {mode === 'proximity' && '🚶 Perto'}
                  {mode === 'click' && '👆 Toque'}
                  {mode === 'both' && '🔀 Ambos'}
                </button>
              ))}
            </div>
          </div>

          {/* CONDIÇÃO DE DESBLOQUEIO */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <label className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>Acesso à Estação:</span>
            </label>
            <select
              value={station.unlockCondition?.type || 'always'}
              onChange={(e) =>
                updateStation({
                  unlockCondition: {
                    ...(station.unlockCondition || { type: 'always' }),
                    type: e.target.value as StationUnlockType,
                  },
                })
              }
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-amber-300 font-bold outline-none"
            >
              <option value="always">🔓 Livre para todos</option>
              <option value="level">🎖️ Requer Nível</option>
              <option value="purchased">💰 Compra / Custo</option>
              <option value="quest">📜 Requer Missão</option>
              <option value="event">⚡ Requer Evento</option>
            </select>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-ABA 2: 📱 LAYOUT DA TELA (POSICIONAMENTO DOS BLOCOS)                   */}
      {/* ========================================================================= */}
      {activeTab === 'layout' && (
        <div className="space-y-2.5 animate-fade-in">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400/30 text-[10px] text-amber-200 leading-snug">
            💡 Ajuste o tamanho e a altura dos blocos da tela interativa com atualização em tempo real no preview:
          </div>

          {/* 1. TAMANHO DA CHOCADEIRA NA TELA */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-amber-300 flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Tamanho da Chocadeira:</span>
              </span>
              <span className="font-mono font-bold text-amber-300 text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {screenAssetSize}px
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="540"
              step="10"
              value={screenAssetSize}
              onChange={(e) => updateStation({ screenAssetSize: parseInt(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>200px (Pequeno)</span>
              <span>440px (Padrão)</span>
              <span>540px (Gigante)</span>
            </div>
          </div>

          {/* 2. POSIÇÃO VERTICAL DA CHOCADEIRA (SUBIR / DESCER) */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <MoveVertical className="w-3.5 h-3.5 text-amber-400" />
                <span>Altura da Chocadeira:</span>
              </span>
              <span className="font-mono font-bold text-amber-300 text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {screenAssetOffsetY > 0 ? `+${screenAssetOffsetY}px` : `${screenAssetOffsetY}px`}
              </span>
            </div>
            <input
              type="range"
              min="-120"
              max="120"
              step="5"
              value={screenAssetOffsetY}
              onChange={(e) => updateStation({ screenAssetOffsetY: parseInt(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>-120px (Mais Alto)</span>
              <span>0 (Centro)</span>
              <span>+120px (Mais Baixo)</span>
            </div>
          </div>

          {/* 3. POSIÇÃO DA CÁPSULA DO NOME NO TOPO */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <span>🏷️</span>
                <span>Posição do Nome no Topo:</span>
              </span>
              <span className="font-mono font-bold text-amber-300 text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {titleOffsetY}px
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="180"
              step="5"
              value={titleOffsetY}
              onChange={(e) => updateStation({ titleOffsetY: parseInt(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>20px (No Topo)</span>
              <span>80px (Médio)</span>
              <span>180px (Baixo)</span>
            </div>
          </div>

          {/* 4. SUBIR / DESCER PARTES INFERIORES (DESCRIÇÃO E BOTÕES) */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-slate-300 flex items-center gap-1">
                <span>⬆️</span>
                <span>Subida das Partes Inferiores:</span>
              </span>
              <span className="font-mono font-bold text-amber-300 text-xs bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                {bottomControlsOffsetY}px
              </span>
            </div>
            <input
              type="range"
              min="30"
              max="220"
              step="5"
              value={bottomControlsOffsetY}
              onChange={(e) => updateStation({ bottomControlsOffsetY: parseInt(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-1.5"
            />
            <div className="flex justify-between text-[9px] text-slate-400 font-mono">
              <span>30px (Mais Baixo)</span>
              <span>104px (Médio)</span>
              <span>220px (Mais Alto)</span>
            </div>
          </div>

          {/* BOTÃO RESTAURAR PADRÃO */}
          <button
            type="button"
            onClick={handleResetLayout}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-amber-400/40 text-slate-300 hover:text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
            <span>Restaurar Layout Padrão Recomendado</span>
          </button>
        </div>
      )}

      {/* MODAL EXPANDIDO DO STUDIO CANVAS */}
      {isCanvasModalOpen && (
        <StationStudioCanvasModal
          marker={marker}
          project={project || ({ markers: [marker] } as any)}
          galleryAssets={galleryAssets}
          isOpen={isCanvasModalOpen}
          onClose={() => setIsCanvasModalOpen(false)}
          onUpdateMarker={onUpdateMarker}
        />
      )}
    </div>
  );
};
