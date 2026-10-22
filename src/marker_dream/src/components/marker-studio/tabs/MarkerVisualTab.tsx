import React from 'react';
import { MapMarker, MarkerLayer } from '../../../types/map';
import { Layers, Maximize2, RotateCw, Navigation } from 'lucide-react';

const MARKER_ICONS: { type: MapMarker['type']; label: string }[] = [
  { type: 'travel', label: '🌌 Portal Travel (Teleporte / Fase / Sub-Bioma)' },
  { type: 'collectible', label: '📦 Coletável (Quest Item)' },
  { type: 'deliverable', label: '🚩 Entregável (Destino Quest)' },
  { type: 'camp', label: 'Acampamento' },
  { type: 'town', label: 'Vila' },
  { type: 'castle', label: 'Castelo' },
  { type: 'boss', label: 'Chefe' },
  { type: 'treasure', label: 'Tesouro' },
  { type: 'shrine', label: 'Santuário' },
  { type: 'port', label: 'Porto' },
  { type: 'cave', label: 'Caverna' },
  { type: 'tower', label: 'Torre' },
];

const MARKER_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Amber
  '#22c55e', // Emerald
  '#0284c7', // Sky Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
];

interface MarkerVisualTabProps {
  selectedMarker: MapMarker;
  availableLayers: MarkerLayer[];
  effectiveDefaultLayerId: string;
  markerMode: string;
  onOpenLayersTab?: () => void;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  onFocusMarker: (marker: MapMarker) => void;
  renderIcon: (marker: MapMarker) => React.ReactNode;
}

export const MarkerVisualTab: React.FC<MarkerVisualTabProps> = ({
  selectedMarker,
  availableLayers,
  effectiveDefaultLayerId,
  markerMode,
  onOpenLayersTab,
  onUpdateMarker,
  onFocusMarker,
  renderIcon,
}) => {
  return (
    <div className="space-y-3">
      {/* Camada do Marcador */}
      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-blue-400" />
            <span>Camada do Marcador</span>
          </span>
          {onOpenLayersTab && (
            <button
              type="button"
              onClick={onOpenLayersTab}
              className="text-[10px] text-blue-400 hover:text-blue-300 hover:underline font-bold cursor-pointer"
            >
              Gerenciar Camadas
            </button>
          )}
        </div>
        <select
          value={selectedMarker.layerId || effectiveDefaultLayerId}
          onChange={(e) => onUpdateMarker(selectedMarker.id, { layerId: e.target.value })}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-amber-400"
        >
          {[...availableLayers]
            .filter((l) => !l.isGroup)
            .sort((a, b) => (b.order ?? 0) - (a.order ?? 0))
            .map((l) => (
              <option key={l.id} value={l.id}>
                {l.locked ? '🔒 ' : ''}{!l.visible ? '🚫 ' : ''}{l.name}
              </option>
            ))}
        </select>
      </div>

      {/* Tamanho da Imagem / Escala */}
      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="flex items-center gap-1 font-semibold">
            <Maximize2 className="w-3 h-3 text-sky-400" />
            <span>{markerMode === 'travel' ? 'Tamanho do portal (raio):' : 'Tamanho do Marcador:'}</span>
          </span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min="16"
              max="3000"
              value={selectedMarker.size || 150}
              onChange={(e) => {
                const val = Math.max(16, Number(e.target.value) || 16);
                onUpdateMarker(selectedMarker.id, { size: val });
              }}
              className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono text-xs text-amber-400 font-bold focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-400">px</span>
          </div>
        </div>
        <input
          type="range"
          min="16"
          max="1200"
          step="2"
          value={selectedMarker.size || 150}
          onChange={(e) => onUpdateMarker(selectedMarker.id, { size: Number(e.target.value) })}
          className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
        {/* Atalhos Rápidos Unificados */}
        <div className="flex items-center gap-1">
          {[64, 100, 150, 256, 400, 600, 800, 1200].map((sz) => (
            <button
              key={sz}
              type="button"
              onClick={() => onUpdateMarker(selectedMarker.id, { size: sz })}
              className={`flex-1 py-0.5 text-[9px] font-mono rounded border transition-colors cursor-pointer ${
                (selectedMarker.size || 150) === sz
                  ? 'bg-amber-500/25 border-amber-400 text-amber-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sz}
            </button>
          ))}
        </div>
      </div>

      {/* Rotação / Giro */}
      <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span className="flex items-center gap-1 font-semibold">
            <RotateCw className="w-3 h-3 text-emerald-400" />
            <span>Girar Marcador:</span>
          </span>
          <span className="font-mono text-amber-400 font-bold">
            {selectedMarker.rotation || 0}°
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="360"
          step="5"
          value={selectedMarker.rotation || 0}
          onChange={(e) => onUpdateMarker(selectedMarker.id, { rotation: Number(e.target.value) })}
          className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
        <div className="flex items-center gap-1">
          {[0, 45, 90, 180, 270].map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => onUpdateMarker(selectedMarker.id, { rotation: deg })}
              className={`flex-1 py-0.5 text-[10px] rounded border transition-colors cursor-pointer ${
                (selectedMarker.rotation || 0) === deg
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* Sombra Projetada no Chão (Realista com Blur e Silhueta) */}
      <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[11px] text-slate-200 font-semibold flex items-center gap-1.5">
              <span>🌑</span>
              <span>Sombra Projetada no Chão</span>
            </span>
            <span className="text-[9px] text-slate-400">
              {selectedMarker.shadowShape === 'silhouette' ? 'Silhueta recortada fiel da PNG' : 'Projeção elíptica suave'}
            </span>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateMarker(selectedMarker.id, {
                hasShadow: selectedMarker.hasShadow === false ? true : false,
              })
            }
            className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
              selectedMarker.hasShadow !== false
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {selectedMarker.hasShadow !== false ? 'Ativada' : 'Desativada'}
          </button>
        </div>

        {selectedMarker.hasShadow !== false && (
          <div className="space-y-2.5 pt-2 border-t border-slate-900">
            {/* Formato: Silhueta Real da PNG vs Elipse */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-300 font-semibold block">Formato da Sombra:</label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => onUpdateMarker(selectedMarker.id, { shadowShape: 'silhouette' })}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    selectedMarker.shadowShape === 'silhouette'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  🎭 Silhueta da PNG
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateMarker(selectedMarker.id, { shadowShape: 'ellipse' })}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    (selectedMarker.shadowShape || 'ellipse') === 'ellipse'
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-sm'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  ⭕ Elipse Suave
                </button>
              </div>
            </div>

            {/* Desfoque / Blur da Sombra */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <span>🌫️</span>
                  <span>Desfoque da Sombra (Blur):</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {selectedMarker.shadowBlur ?? 3}px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={selectedMarker.shadowBlur ?? 3}
                onChange={(e) =>
                  onUpdateMarker(selectedMarker.id, { shadowBlur: Number(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Opacidade da Sombra */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                <span className="flex items-center gap-1">
                  <span>🔆</span>
                  <span>Intensidade / Opacidade:</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {Math.round((selectedMarker.shadowOpacity ?? 0.45) * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={selectedMarker.shadowOpacity ?? 0.45}
                onChange={(e) =>
                  onUpdateMarker(selectedMarker.id, { shadowOpacity: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Deslocamento X e Y */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                  <span>↔️ Posição X:</span>
                  <span className="font-mono text-amber-300 font-bold">{selectedMarker.shadowOffsetX || 0}px</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={selectedMarker.shadowOffsetX || 0}
                  onChange={(e) =>
                    onUpdateMarker(selectedMarker.id, { shadowOffsetX: Number(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
                  <span>↕️ Posição Y:</span>
                  <span className="font-mono text-amber-300 font-bold">{selectedMarker.shadowOffsetY || 0}px</span>
                </div>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  step="1"
                  value={selectedMarker.shadowOffsetY || 0}
                  onChange={(e) =>
                    onUpdateMarker(selectedMarker.id, { shadowOffsetY: Number(e.target.value) })
                  }
                  className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
              </div>
            </div>

            {/* Resetar alinhamento se for diferente de 0,0 */}
            {((selectedMarker.shadowOffsetX || 0) !== 0 || (selectedMarker.shadowOffsetY || 0) !== 0) && (
              <button
                type="button"
                onClick={() =>
                  onUpdateMarker(selectedMarker.id, {
                    shadowOffsetX: 0,
                    shadowOffsetY: 0,
                  })
                }
                className="w-full py-1 text-[10px] text-slate-400 hover:text-amber-300 bg-slate-900 hover:bg-slate-850 rounded border border-slate-800 transition-colors cursor-pointer"
              >
                Resetar Sombra para o Centro (0, 0)
              </button>
            )}
          </div>
        )}
      </div>

      {/* Ícone Padrão e Cor do Ponto (se não tiver PNG) */}
      {!selectedMarker.customIconPng && (
        <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
          <span className="text-[11px] text-slate-300 font-semibold block">Ícone Padrão:</span>
          <div className="grid grid-cols-6 gap-1">
            {MARKER_ICONS.filter(
              (ic) =>
                ic.type !== 'travel' &&
                ic.type !== 'collectible' &&
                ic.type !== 'deliverable' &&
                ic.type !== 'event' &&
                ic.type !== 'npc'
            ).map((ic) => (
              <button
                key={ic.type}
                type="button"
                onClick={() => onUpdateMarker(selectedMarker.id, { type: ic.type })}
                className={`flex items-center justify-center p-1.5 rounded-lg border text-xs transition-colors cursor-pointer ${
                  selectedMarker.type === ic.type
                    ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
                title={ic.label}
              >
                {renderIcon({ ...selectedMarker, type: ic.type, customIconPng: undefined })}
              </button>
            ))}
          </div>

          <span className="text-[11px] text-slate-300 font-semibold block pt-1">Cor do Ponto:</span>
          <div className="flex items-center gap-1.5">
            {MARKER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onUpdateMarker(selectedMarker.id, { color: c })}
                className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                  selectedMarker.color === c ? 'border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Descrição / Anotação da Cápsula */}
      <div className="space-y-1">
        <label className="text-[10px] font-semibold text-slate-400 block">Descrição ou Anotação:</label>
        <textarea
          rows={2}
          value={selectedMarker.description || ''}
          onChange={(e) => onUpdateMarker(selectedMarker.id, { description: e.target.value })}
          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400 resize-none"
          placeholder="Descrição para a cápsula ou pop-up..."
        />
      </div>

      {/* Focar Câmera */}
      {!selectedMarker.subBiomeId && (
        <button
          type="button"
          onClick={() => onFocusMarker(selectedMarker)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Focar Câmera no Mapa</span>
        </button>
      )}
    </div>
  );
};
