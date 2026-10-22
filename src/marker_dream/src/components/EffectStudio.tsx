import React from 'react';
import {
  Sparkles,
  Sliders,
  Trash2,
  Copy,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Flame,
  Zap,
  Wind,
  Layers,
  WandSparkles,
  Move,
  Maximize2,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { MotionOverlayStroke } from '../types/map';

export interface EffectMeta {
  id: string;
  label: string;
  icon: string;
  description: string;
}

export const EFFECT_PEN_PRESETS: EffectMeta[] = [
  {
    id: 'smoke',
    label: 'Fumaça / Névoa Suave',
    icon: '💨',
    description: 'Plumas volumétricas curl-noise sutis e ultrafinas',
  },
  {
    id: 'fireflies',
    label: 'Vagalumes Cintilantes',
    icon: '✨',
    description: 'Partículas bioluminescentes com deriva orgânica Lissajous',
  },
  {
    id: 'glow',
    label: 'Make This Bright (Glow)',
    icon: '🌟',
    description: 'Iluminação difusa suave de neon e realce atmosférico',
  },
  {
    id: 'glitter',
    label: 'Mini-Glitter Diamante',
    icon: '💎',
    description: 'Micro-brilhos especulares cintilantes a 60 FPS',
  },
  {
    id: 'sparks',
    label: 'Arco Elétrico / Plasma',
    icon: '⚡',
    description: 'Descargas de plasma e raios de Lichtenberg contínuos',
  },
  {
    id: 'fire',
    label: 'Chamas Vivas',
    icon: '🔥',
    description: 'Labaredas térmicas ascendentes sem recorte',
  },
  {
    id: 'water',
    label: 'Correnteza Líquida',
    icon: '🌊',
    description: 'Fluxo ondulante translúcido a 60 FPS',
  },
  {
    id: 'wind',
    label: 'Brisa e Vento',
    icon: '🍃',
    description: 'Rajadas suaves de vento ao longo do traçado',
  },
];

interface Props {
  effectBrushSize: number;
  onEffectBrushSize: (v: number) => void;
  effectType: string;
  onEffectType: (eff: string) => void;
  effectSpeed: number;
  onEffectSpeed: (v: number) => void;
  effectIntensity: number;
  onEffectIntensity: (v: number) => void;
  effectScale: number;
  onEffectScale: (v: number) => void;
  overlays: MotionOverlayStroke[];
  selectedOverlayId: string | null;
  onSelectOverlay: (id: string | null) => void;
  onUpdateOverlay: (id: string, updates: Partial<MotionOverlayStroke>) => void;
  onDeleteOverlay: (id: string) => void;
  onDuplicateOverlay: (id: string) => void;
  onMoveOverlayOrder: (id: string, direction: 'up' | 'down') => void;
  onClearAllOverlays: () => void;
}

export const EffectStudio: React.FC<Props> = ({
  effectBrushSize,
  onEffectBrushSize,
  effectType,
  onEffectType,
  effectSpeed,
  onEffectSpeed,
  effectIntensity,
  onEffectIntensity,
  effectScale,
  onEffectScale,
  overlays,
  selectedOverlayId,
  onSelectOverlay,
  onUpdateOverlay,
  onDeleteOverlay,
  onDuplicateOverlay,
  onMoveOverlayOrder,
  onClearAllOverlays,
}) => {
  const selectedOverlay = overlays.find((ov) => ov.id === selectedOverlayId) || null;
  const currentPreset =
    EFFECT_PEN_PRESETS.find((p) => p.id === (selectedOverlay ? selectedOverlay.effect : effectType)) ||
    EFFECT_PEN_PRESETS[0];

  return (
    <div className="space-y-4 animate-fade-in text-slate-200">
      {/* 1. Header do Estúdio Effect Pen */}
      <div className="p-3.5 bg-gradient-to-r from-amber-950/60 via-orange-950/40 to-slate-900 border border-amber-500/40 rounded-2xl shadow-lg space-y-1.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <WandSparkles className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-200 uppercase tracking-wide">
              Effect Pen (Luz &amp; VFX)
            </span>
          </div>
          <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
            {overlays.length} {overlays.length === 1 ? 'Efeito' : 'Efeitos'}
          </span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Pinte sobreposições de <strong>luz, fumaça e partículas vivas</strong> sem recortar o fundo.
          Clique em qualquer efeito no mapa para <strong>arrastar, duplicar, redimensionar</strong> ou trocar de tipo!
        </p>
      </div>

      {/* 2. Seleção de Tipo de Efeito VFX */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Tipo de Efeito Visual:</span>
          </span>
          <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {currentPreset.icon} {currentPreset.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
          {EFFECT_PEN_PRESETS.map((eff) => {
            const isSelected = selectedOverlay
              ? selectedOverlay.effect === eff.id
              : effectType === eff.id;
            return (
              <button
                key={eff.id}
                type="button"
                onClick={() => {
                  if (selectedOverlay) {
                    onUpdateOverlay(selectedOverlay.id, { effect: eff.id });
                  } else {
                    onEffectType(eff.id);
                  }
                }}
                className={`p-2 rounded-xl border text-left flex items-start gap-2 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-600/30 to-orange-600/30 border-amber-400 text-white font-bold ring-1 ring-amber-400/50 shadow-xs'
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

        {/* Descrição do efeito selecionado */}
        <div className="p-2.5 bg-slate-950/90 border border-amber-500/30 rounded-xl space-y-1 text-[11px]">
          <div className="flex items-center gap-1.5 text-amber-300 font-bold">
            <span>{currentPreset.icon}</span>
            <span>{currentPreset.label}</span>
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            {currentPreset.description}
          </p>
        </div>
      </div>

      {/* 3. Painel de Controle: Efeito Selecionado no Mapa */}
      {selectedOverlay ? (
        <div className="p-3.5 bg-gradient-to-b from-amber-950/30 to-slate-900 border-2 border-amber-500/60 rounded-2xl space-y-3 shadow-md animate-fade-in">
          <div className="flex items-center justify-between pb-1.5 border-b border-amber-500/30">
            <div className="flex items-center gap-2">
              <Move className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-200">
                Efeito Selecionado no Mapa
              </span>
            </div>
            <button
              type="button"
              onClick={() => onSelectOverlay(null)}
              className="text-[10px] text-slate-400 hover:text-white underline cursor-pointer"
            >
              Desmarcar
            </button>
          </div>

          <div className="text-[11px] text-slate-300 flex items-center justify-between">
            <span className="text-slate-400 font-medium">Nome / Identificador:</span>
            <input
              type="text"
              value={selectedOverlay.name || `Efeito ${selectedOverlay.effect}`}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, { name: e.target.value })
              }
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-0.5 text-xs text-amber-200 font-bold focus:outline-none focus:border-amber-400 text-right w-36"
            />
          </div>

          {/* Micro-Ajuste de Escala Proporcional (Permite diminuir drasticamente) */}
          <div className="space-y-1 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Maximize2 className="w-3 h-3 text-amber-400" />
                <span>Escala Proporcional (Micro/Macro):</span>
              </span>
              <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
                {(selectedOverlay.scale || 1.0).toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={3.0}
              step={0.05}
              value={selectedOverlay.scale || 1.0}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, {
                  scale: parseFloat(e.target.value),
                })
              }
              className="w-full accent-amber-400 h-2 bg-slate-900 rounded-lg cursor-pointer"
            />
            {/* Presets de Escala Rápida */}
            <div className="flex items-center gap-1 pt-1 justify-between">
              {[
                { label: 'Micro (0.2x)', val: 0.2 },
                { label: 'Fino (0.5x)', val: 0.5 },
                { label: '1x', val: 1.0 },
                { label: '1.5x', val: 1.5 },
                { label: 'Grande (2x)', val: 2.0 },
              ].map((sc) => (
                <button
                  key={sc.label}
                  type="button"
                  onClick={() =>
                    onUpdateOverlay(selectedOverlay.id, { scale: sc.val })
                  }
                  className="px-1.5 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-[9px] text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                >
                  {sc.label}
                </button>
              ))}
            </div>
          </div>

          {/* Espessura / Brush Size */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Tamanho Base:</span>
              <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
                {selectedOverlay.brushSize}px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={80}
              step={1}
              value={selectedOverlay.brushSize}
              onChange={(e) =>
                onUpdateOverlay(selectedOverlay.id, {
                  brushSize: parseInt(e.target.value) || 1,
                })
              }
              className="w-full accent-amber-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Velocidade e Intensidade */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Velocidade:</span>
                <span className="font-mono text-sky-300 font-bold text-[10px]">
                  {selectedOverlay.speed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.5}
                step={0.1}
                value={selectedOverlay.speed}
                onChange={(e) =>
                  onUpdateOverlay(selectedOverlay.id, {
                    speed: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-sky-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300">Intensidade:</span>
                <span className="font-mono text-amber-300 font-bold text-[10px]">
                  {selectedOverlay.intensity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.5}
                step={0.1}
                value={selectedOverlay.intensity}
                onChange={(e) =>
                  onUpdateOverlay(selectedOverlay.id, {
                    intensity: parseFloat(e.target.value),
                  })
                }
                className="w-full accent-amber-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Botões de Ação do Efeito Selecionado (Duplicar, Reordenar, Excluir) */}
          <div className="pt-2 border-t border-slate-800 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onDuplicateOverlay(selectedOverlay.id)}
              className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer shadow-xs"
              title="Duplica o efeito selecionado com um pequeno deslocamento"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicar</span>
            </button>

            <button
              type="button"
              onClick={() => onMoveOverlayOrder(selectedOverlay.id, 'up')}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Trazer para frente (Subir na camada)"
            >
              <ArrowUp className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onMoveOverlayOrder(selectedOverlay.id, 'down')}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Enviar para trás (Descer na camada)"
            >
              <ArrowDown className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => onDeleteOverlay(selectedOverlay.id)}
              className="p-1.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 transition-all cursor-pointer"
              title="Excluir este efeito"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        /* 4. Sliders Padrão para Novos Traçados */
        <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3.5">
          <div className="flex items-center gap-1.5 pb-1 border-b border-slate-800 text-xs font-bold text-slate-200">
            <Sliders className="w-3.5 h-3.5 text-amber-400" />
            <span>Configurações do Próximo Traço</span>
          </div>

          {/* Tamanho do Pincel (A partir de 1px!) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Largura do Pincel:</span>
              <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
                {effectBrushSize}px
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={80}
              step={1}
              value={effectBrushSize}
              onChange={(e) => onEffectBrushSize(parseInt(e.target.value) || 1)}
              className="w-full accent-amber-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
            <div className="flex items-center gap-1 pt-0.5 justify-between">
              {[
                { label: 'Micro (2px)', val: 2 },
                { label: 'Fino (6px)', val: 6 },
                { label: 'Médio (16px)', val: 16 },
                { label: 'Grosso (36px)', val: 36 },
              ].map((ps) => (
                <button
                  key={ps.label}
                  type="button"
                  onClick={() => onEffectBrushSize(ps.val)}
                  className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-[9px] text-slate-400 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                >
                  {ps.label}
                </button>
              ))}
            </div>
          </div>

          {/* Escala Geral */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Escala Proporcional:</span>
              <span className="font-mono text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 text-xs">
                {effectScale.toFixed(2)}x
              </span>
            </div>
            <input
              type="range"
              min={0.1}
              max={3.0}
              step={0.05}
              value={effectScale}
              onChange={(e) => onEffectScale(parseFloat(e.target.value))}
              className="w-full accent-amber-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
            />
          </div>

          {/* Velocidade e Intensidade */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">⚡ Velocidade:</span>
                <span className="font-mono text-sky-300 font-bold text-xs">
                  {effectSpeed.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.5}
                step={0.1}
                value={effectSpeed}
                onChange={(e) => onEffectSpeed(parseFloat(e.target.value))}
                className="w-full accent-sky-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-medium">💥 Intensidade:</span>
                <span className="font-mono text-amber-300 font-bold text-xs">
                  {effectIntensity.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.5}
                step={0.1}
                value={effectIntensity}
                onChange={(e) => onEffectIntensity(parseFloat(e.target.value))}
                className="w-full accent-amber-400 h-2 bg-slate-950 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. Lista de Camadas / Efeitos Posicionados no Mapa */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5">
        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
          <span className="flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Camadas de Efeitos ({overlays.length})</span>
          </span>
          {overlays.length > 0 && (
            <button
              type="button"
              onClick={onClearAllOverlays}
              className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
            >
              Limpar Todos
            </button>
          )}
        </div>

        {overlays.length === 0 ? (
          <div className="p-4 bg-slate-950 rounded-xl border border-dashed border-slate-800 text-center space-y-1">
            <Sparkles className="w-5 h-5 text-slate-600 mx-auto" />
            <p className="text-[11px] text-slate-400 font-medium">
              Nenhum efeito desenhado ainda.
            </p>
            <p className="text-[10px] text-slate-500">
              Pinte livremente no mapa para adicionar fumaça, luz ou glitter vivo!
            </p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {overlays.map((ov, index) => {
              const meta =
                EFFECT_PEN_PRESETS.find((p) => p.id === ov.effect) ||
                EFFECT_PEN_PRESETS[0];
              const isSelected = ov.id === selectedOverlayId;
              const isVisible = ov.visible !== false;

              return (
                <div
                  key={ov.id}
                  onClick={() => onSelectOverlay(ov.id)}
                  className={`flex items-center justify-between p-2 rounded-xl border cursor-pointer transition-all text-xs ${
                    isSelected
                      ? 'bg-amber-950/40 border-amber-500 ring-1 ring-amber-500/40 text-white font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base shrink-0 leading-none">
                      {meta.icon}
                    </span>
                    <div className="min-w-0 truncate">
                      <div className="font-semibold truncate">
                        {ov.name || `${meta.label} #${index + 1}`}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span>{ov.brushSize}px</span>
                        <span>•</span>
                        <span>{(ov.scale || 1.0).toFixed(1)}x</span>
                        <span>•</span>
                        <span>{ov.points.length} pts</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Toggle Visibilidade */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onUpdateOverlay(ov.id, { visible: !isVisible });
                      }}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                      title={isVisible ? 'Ocultar efeito' : 'Mostrar efeito'}
                    >
                      {isVisible ? (
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-slate-600" />
                      )}
                    </button>

                    {/* Duplicar */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateOverlay(ov.id);
                      }}
                      className="p-1 text-slate-400 hover:text-amber-300 transition-colors"
                      title="Duplicar efeito"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Excluir */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteOverlay(ov.id);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Excluir efeito"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
