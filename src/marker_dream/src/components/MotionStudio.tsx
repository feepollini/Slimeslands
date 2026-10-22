import React, { useState } from 'react';
import {
  Brush,
  Check,
  Eraser,
  Sliders,
  Sparkles,
  Waves,
  Flame,
  Wind,
  Lightbulb,
  Zap,
  RotateCw,
  Eye,
  Trash2,
  Navigation,
  Layers,
  WandSparkles,
} from 'lucide-react';
import { EffectType, OFFICIAL_EFFECTS } from '../utils/motionCanvasEngine';
import { MapMarker } from '../types/map';

interface Props {
  motionBrushSize: number;
  onMotionBrushSize: (v: number) => void;
  motionAuto: boolean;
  onMotionAuto: (v: boolean) => void;
  motionEffect: EffectType;
  onMotionEffect: (eff: EffectType) => void;
  motionSpeed: number;
  onMotionSpeed: (v: number) => void;
  motionIntensity: number;
  onMotionIntensity: (v: number) => void;
  onMotionExtract: () => void;
  onMotionClear: () => void;
  selectedMarker?: MapMarker | null;
  onUpdateMarker?: (id: string, updates: Partial<MapMarker>) => void;
  markers?: MapMarker[];
  onSelectMarker?: (id: string) => void;
  onDeleteMarker?: (id: string) => void;
  onFocusMarker?: (marker: MapMarker) => void;
}

export const MotionStudio: React.FC<Props> = ({
  motionBrushSize,
  onMotionBrushSize,
  motionAuto,
  onMotionAuto,
  motionEffect,
  onMotionEffect,
  motionSpeed,
  onMotionSpeed,
  motionIntensity,
  onMotionIntensity,
  onMotionExtract,
  onMotionClear,
  selectedMarker,
  onUpdateMarker,
  markers = [],
  onSelectMarker,
  onDeleteMarker,
  onFocusMarker,
}) => {
  const filteredEffects = OFFICIAL_EFFECTS.filter((e) => e.id !== 'none');
  const currentMeta = OFFICIAL_EFFECTS.find((e) => e.id === motionEffect) || OFFICIAL_EFFECTS[1];
  const motionCutouts = markers.filter((m: MapMarker) => m.motionAsset || (m.effect && m.effect !== 'none'));

  return (
    <div className="space-y-4 animate-fade-in text-slate-200">
      {/* 1. Header do Estúdio */}
      <div className="p-3.5 bg-gradient-to-r from-fuchsia-950/60 via-purple-950/40 to-slate-900 border border-fuchsia-500/40 rounded-2xl shadow-lg space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brush className="w-4 h-4 text-fuchsia-400" />
            <span className="text-xs font-bold text-fuchsia-200 uppercase tracking-wide">
              Motion Pen &amp; Recorte de Malha
            </span>
          </div>
          <span className="text-[10px] font-mono bg-fuchsia-500/20 text-fuchsia-300 px-2 py-0.5 rounded-full border border-fuchsia-500/30">
            60 FPS
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Pinte sobre a área desejada e extraia o recorte com <strong>Gelatina</strong> ou <strong>deformação de malha física</strong>.
        </p>
      </div>

      {/* 2. Grade dos Efeitos de Movimento / Malha */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <WandSparkles className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Modo de Movimento / Malha:</span>
          </span>
          <span className="text-[10px] font-mono text-fuchsia-300 bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/20">
            {currentMeta.icon} {currentMeta.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-1">
          {filteredEffects.map((eff) => {
            const isSelected = motionEffect === eff.id;
            return (
              <button
                key={eff.id}
                type="button"
                onClick={() => onMotionEffect(eff.id)}
                className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all ${
                  isSelected
                    ? 'bg-gradient-to-r from-fuchsia-600/30 to-purple-600/30 border-fuchsia-400 text-white font-bold ring-1 ring-fuchsia-400/50 shadow-xs'
                    : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                }`}
              >
                <span className="text-base leading-none shrink-0">{eff.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-semibold truncate leading-tight">
                    {eff.label}
                  </div>
                  <div className="text-[9px] text-slate-400 line-clamp-1 leading-tight mt-0.5">
                    {eff.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Descrição detalhada do efeito ativo */}
        <div className="p-2.5 bg-slate-950/90 border border-fuchsia-500/30 rounded-xl space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-fuchsia-300 font-bold">
            <span>{currentMeta.icon}</span>
            <span>{currentMeta.label}</span>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            {currentMeta.description}.
          </p>
        </div>
      </div>

      {/* 4. Sliders de Ajuste Físico (Largura, Velocidade, Intensidade) */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3.5">
        <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-slate-200">
          <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
          <span>Parâmetros de Movimento e Traço</span>
        </div>

        {/* Largura do Traço */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Largura do Pincel:</span>
            <span className="font-mono text-fuchsia-300 font-bold bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/20 text-xs">
              {motionBrushSize}px
            </span>
          </div>
          <input
            type="range"
            min={4}
            max={80}
            step={2}
            value={motionBrushSize}
            onChange={(e) => onMotionBrushSize(Number(e.target.value))}
            className="w-full accent-fuchsia-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Velocidade da Animação */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">⚡ Velocidade da Oscilação:</span>
            <span className="font-mono text-sky-300 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20 text-xs">
              {motionSpeed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={3.5}
            step={0.1}
            value={motionSpeed}
            onChange={(e) => onMotionSpeed(parseFloat(e.target.value))}
            className="w-full accent-sky-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>

        {/* Intensidade / Força */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">💥 Força / Amplitude:</span>
            <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
              {motionIntensity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={3.5}
            step={0.1}
            value={motionIntensity}
            onChange={(e) => onMotionIntensity(parseFloat(e.target.value))}
            className="w-full accent-amber-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* 5. Ação Direta no Marcador Selecionado (ex: Marcador Neutro de Cenário) */}
      {selectedMarker && onUpdateMarker && (
        <div className="p-3 bg-slate-900 border-2 border-amber-500/50 rounded-2xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-300 flex items-center gap-1.5">
              <span>🎯</span>
              <span>Marcador Selecionado:</span>
            </span>
            <span className="text-[10px] text-slate-400 truncate max-w-[120px]">
              {selectedMarker.name}
            </span>
          </div>
          <p className="text-[10px] text-slate-300 leading-tight">
            Deseja transferir o efeito <strong>{currentMeta.label}</strong> para este asset?
          </p>
          <button
            type="button"
            onClick={() => {
              onUpdateMarker(selectedMarker.id, {
                effect: motionEffect,
                effectSpeed: motionSpeed,
                effectIntensity: motionIntensity,
                npcBounce: motionEffect === 'jelly',
              });
            }}
            className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>✨</span>
            <span>Aplicar {currentMeta.label} neste Asset</span>
          </button>
        </div>
      )}

      {/* 6. Ações do Traçado no Canvas (Recorte de Malha ou Gelatina Primordial) */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-fuchsia-300">
          <span className="flex items-center gap-1.5">
            <span>✂️</span>
            <span>
              {motionEffect === 'jelly'
                ? 'Recorte Gelatina Primordial (Squash & Stretch)'
                : `Recorte de Malha: ${currentMeta.label} (Sem Gelatina)`}
            </span>
          </span>
        </div>
        <p className="text-[10px] text-slate-300 leading-relaxed bg-slate-950 p-2.5 rounded-xl border border-slate-800">
          {motionEffect === 'jelly'
            ? '🍮 Extrai o recorte do fundo com a animação de squash & stretch primordial do NPC/Herói.'
            : `🌊 Extrai o recorte do fundo aplicando EXCLUSIVAMENTE o efeito ${currentMeta.label} na malha (sem gelatina).`}
        </p>
        <label className="flex items-center justify-between gap-2 cursor-pointer bg-slate-950 px-3 py-2.5 rounded-xl border border-slate-800">
          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-fuchsia-400" />
            <span>Extrair recorte automaticamente ao soltar</span>
          </span>
          <input
            type="checkbox"
            checked={motionAuto}
            onChange={(e) => onMotionAuto(e.target.checked)}
            className="w-4 h-4 accent-fuchsia-400 rounded cursor-pointer shrink-0"
          />
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onMotionExtract}
            className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 hover:from-fuchsia-400 hover:to-purple-500 text-white text-xs font-black transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>✂️</span>
            <span>Extrair Recorte Vivo</span>
          </button>
          <button
            type="button"
            onClick={onMotionClear}
            className="py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-rose-500/20 border border-slate-800 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <Eraser className="w-3.5 h-3.5" />
            <span>Limpar Traço</span>
          </button>
        </div>
      </div>

      {/* 7. Gerenciador de Recortes & Camadas Motion Ativas */}
      {motionCutouts.length > 0 && (
        <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300">
            <span className="flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Assets com Motion Ativo ({motionCutouts.length})</span>
            </span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {motionCutouts.map((m: MapMarker) => {
              const effMeta = OFFICIAL_EFFECTS.find((e) => e.id === (m.effect || 'jelly'));
              return (
                <div
                  key={m.id}
                  onClick={() => onSelectMarker?.(m.id)}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-fuchsia-500/50 cursor-pointer transition-all text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                      {m.customIconPng ? (
                        <img src={m.customIconPng} alt="" className="w-full h-full object-contain" />
                      ) : (
                        <span>{effMeta?.icon || '✨'}</span>
                      )}
                    </span>
                    <div className="min-w-0 truncate">
                      <div className="font-semibold text-slate-200 truncate">{m.name}</div>
                      <div className="text-[10px] text-fuchsia-400 flex items-center gap-1">
                        <span>{effMeta?.icon}</span>
                        <span>{effMeta?.label || 'Gelatina'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {onFocusMarker && !m.subBiomeId && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusMarker(m);
                        }}
                        className="p-1 text-slate-400 hover:text-white"
                        title="Focar câmera"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {onDeleteMarker && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteMarker(m.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
