import React, { useRef, useState } from 'react';
import {
  GroundStamp,
  GroundStampLayer,
  StampBrushConfig,
  StampPreset,
} from '../types/map';
import {
  Upload,
  Layers,
  Shuffle,
  RotateCw,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  X,
  Sparkles,
  Sliders,
  Maximize2,
  Circle,
  Images,
} from 'lucide-react';
import { readUploadedImage } from '../utils/tileGenerator';
import { AssetGalleryModal } from './AssetGalleryModal';
import { GalleryAsset } from '../types/map';

interface Props {
  brushConfig: StampBrushConfig;
  onUpdateBrushConfig: (updates: Partial<StampBrushConfig>) => void;
  layers: GroundStampLayer[];
  onUpdateLayers: (layers: GroundStampLayer[]) => void;
  stamps: GroundStamp[];
  onUpdateStamps: (stamps: GroundStamp[]) => void;
  onClearActiveLayerStamps: () => void;
  onUndoLastStamp: () => void;
  galleryAssets?: GalleryAsset[];
  categories?: string[];
  onUploadNewAsset?: (newAsset: GalleryAsset) => void;
}

export const StampStudio: React.FC<Props> = ({
  brushConfig,
  onUpdateBrushConfig,
  layers,
  onUpdateLayers,
  stamps,
  onUpdateStamps,
  onClearActiveLayerStamps,
  onUndoLastStamp,
  galleryAssets = [],
  categories = [],
  onUploadNewAsset,
}) => {
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadPNG = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await readUploadedImage(file);
      const cleanName = file.name.replace(/\.[^/.]+$/, '').trim() || 'Carimbo';
      const prevPresets = brushConfig.savedPresets || [];
      const existingIdx = prevPresets.findIndex((p) => p.dataUrl === res.dataUrl);

      let nextPresets: StampPreset[];
      if (existingIdx !== -1) {
        nextPresets = prevPresets;
      } else {
        const newPreset: StampPreset = {
          id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          name: cleanName,
          dataUrl: res.dataUrl,
        };
        nextPresets = [newPreset, ...prevPresets];
      }

      onUpdateBrushConfig({
        pngUrl: res.dataUrl,
        savedPresets: nextPresets,
      });
    } catch (err) {
      console.error('Erro ao ler imagem do carimbo:', err);
    }
    e.target.value = '';
  };

  const handleDeletePreset = (presetId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPresets = (brushConfig.savedPresets || []).filter((p) => p.id !== presetId);
    onUpdateBrushConfig({
      savedPresets: nextPresets,
    });
  };

  const handleAddLayer = () => {
    const nextIdx = layers.length + 1;
    const newLayer: GroundStampLayer = {
      id: `stamp-layer-${Date.now()}`,
      name: `Camada Chão ${nextIdx}`,
      visible: true,
      opacity: 1,
    };
    onUpdateLayers([...layers, newLayer]);
    onUpdateBrushConfig({ activeLayerId: newLayer.id });
  };

  const handleToggleLayerVisible = (layerId: string) => {
    onUpdateLayers(
      layers.map((l) => (l.id === layerId ? { ...l, visible: !l.visible } : l))
    );
  };

  const handleDeleteLayer = (layerId: string) => {
    if (layers.length <= 1) return;
    onUpdateLayers(layers.filter((l) => l.id !== layerId));
    onUpdateStamps(stamps.filter((s) => s.layerId !== layerId));
    if (brushConfig.activeLayerId === layerId) {
      const remaining = layers.filter((l) => l.id !== layerId);
      if (remaining.length > 0) {
        onUpdateBrushConfig({ activeLayerId: remaining[0].id });
      }
    }
  };

  const activeLayer = layers.find((l) => l.id === brushConfig.activeLayerId) || layers[0];
  const stampsInActiveLayer = stamps.filter((s) => s.layerId === activeLayer?.id).length;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadPNG}
      />

      {/* BANNER INFORMATIVO */}
      <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/30">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Pincel de Carimbo de Chão</span>
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
            Camada Inferior
          </span>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Pinte e espalhe texturas, folhagens e detalhes ao clicar e arrastar no mapa.
          <strong className="text-amber-200"> Atua estritamente na camada de chão</strong> (todos os marcadores e personagens ficam acima).
        </p>
      </div>

      {/* SEÇÃO 1: IMPORTAÇÃO E PREVIEW DO CARIMBO PNG */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
            <span>Asset do Carimbo (PNG)</span>
          </span>
          {brushConfig.pngUrl && (
            <button
              onClick={() => onUpdateBrushConfig({ pngUrl: null })}
              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5"
            >
              <X className="w-3 h-3" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Preview do carimbo com corte redondo e bordas desfocadas */}
        <div className="flex items-center gap-3">
          <div
            className="w-16 h-16 rounded-full bg-slate-900 border border-amber-500/50 flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner"
            style={{
              boxShadow: `0 0 ${Math.max(4, brushConfig.feather)}px rgba(245, 158, 11, 0.3)`,
            }}
          >
            {brushConfig.pngUrl ? (
              <img
                src={brushConfig.pngUrl}
                alt="Stamp"
                className="w-full h-full object-cover select-none pointer-events-none"
                style={{
                  borderRadius: '50%',
                  WebkitMaskImage: `radial-gradient(circle, black calc(100% - ${brushConfig.feather}px), transparent 100%)`,
                  maskImage: `radial-gradient(circle, black calc(100% - ${brushConfig.feather}px), transparent 100%)`,
                  filter: brushConfig.feather > 0 ? `blur(${Math.min(3, brushConfig.feather * 0.15)}px)` : 'none',
                }}
              />
            ) : (
              <span className="text-xl">🌿</span>
            )}
            {/* Anel indicador de desfoque */}
            <div className="absolute inset-0 rounded-full border border-amber-400/30 pointer-events-none" />
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setIsGalleryOpen(true)}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-purple-600/20 border border-purple-500/40 hover:bg-purple-600/30 text-purple-200 text-xs font-semibold transition-all shadow-xs cursor-pointer"
                title="Escolha da galeria oficial ou da sua pasta local do PC"
              >
                <Images className="w-3.5 h-3.5 text-purple-300" />
                <span>📁 Galeria / PC</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-amber-500/15 border border-amber-500/40 hover:bg-amber-500/25 text-amber-300 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Carregar</span>
              </button>
            </div>
            <p className="text-[9px] text-slate-500">
              Formato redondo com desfoque de borda suave integrado.
            </p>
          </div>
        </div>

        {/* Presets Salvos: Cada PNG importado como pincel é salvo aqui */}
        <div className="space-y-1.5 pt-2 border-t border-slate-900">
          <div className="flex items-center justify-between text-[10px]">
            <span className="font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1">
              <span>🖼️</span>
              <span>Presets Salvos (PNGs):</span>
            </span>
            <span className="text-[9px] font-mono text-slate-500">
              {(brushConfig.savedPresets || []).length} { (brushConfig.savedPresets || []).length === 1 ? 'salvo' : 'salvos' }
            </span>
          </div>

          {(brushConfig.savedPresets || []).length === 0 ? (
            <div className="p-2.5 rounded-lg border border-dashed border-slate-800 bg-slate-900/40 text-center">
              <p className="text-[10px] text-slate-400 font-medium leading-tight">
                Nenhum preset salvo ainda.
              </p>
              <p className="text-[9px] text-slate-500 mt-0.5">
                Importe uma imagem PNG acima e ela será salva automaticamente nesta galeria de presets.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto pr-0.5">
              {(brushConfig.savedPresets || []).map((pr) => {
                const isActive = brushConfig.pngUrl === pr.dataUrl;
                return (
                  <div
                    key={pr.id}
                    onClick={() => onUpdateBrushConfig({ pngUrl: pr.dataUrl })}
                    className={`relative p-1 rounded-lg border cursor-pointer group text-center transition-all ${
                      isActive
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/40 shadow-xs scale-102'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850 hover:border-slate-700'
                    }`}
                    title={`Selecionar carimbo: ${pr.name}`}
                  >
                    <div className="w-8 h-8 mx-auto rounded-full overflow-hidden bg-slate-950 flex items-center justify-center mb-1 border border-slate-800">
                      <img src={pr.dataUrl} alt={pr.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[8px] block truncate font-medium">{pr.name}</span>

                    {/* Botão de Excluir Preset */}
                    <button
                      type="button"
                      onClick={(e) => handleDeletePreset(pr.id, e)}
                      className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      title="Excluir este preset"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* SEÇÃO 2: CONTROLES DO PINCEL (TAMANHO, BORDAS DESFOCADAS, ESPAÇAMENTO, OPACIDADE) */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-amber-400" />
          <span>Propriedades do Pincel</span>
        </span>

        {/* Raio / Tamanho do Carimbo */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
            <span className="flex items-center gap-1">
              <Circle className="w-3 h-3 text-sky-400" />
              <span>Tamanho do Carimbo (Raio):</span>
            </span>
            <span className="font-mono text-amber-300 font-bold">{brushConfig.size}px</span>
          </div>
          <input
            type="range"
            min="16"
            max="300"
            step="2"
            value={brushConfig.size}
            onChange={(e) => onUpdateBrushConfig({ size: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[8px] text-slate-500 mt-0.5 font-mono">
            <span>16px</span>
            <span>120px</span>
            <span>300px</span>
          </div>
        </div>

        {/* Bordas Desfocadas (Feather) */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span>Bordas Desfocadas (Suavização):</span>
            </span>
            <span className="font-mono text-emerald-300 font-bold">{brushConfig.feather}px</span>
          </div>
          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={brushConfig.feather}
            onChange={(e) => onUpdateBrushConfig({ feather: Number(e.target.value) })}
            className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
            <span>0px (Corte Seco)</span>
            <span>15px (Suave)</span>
            <span>40px (Esfumaçado)</span>
          </div>
        </div>

        {/* Controle de Espaçamento ao Arrastar */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
            <span className="flex items-center gap-1">
              <Sliders className="w-3 h-3 text-amber-400" />
              <span>Espaçamento ao Arrastar:</span>
            </span>
            <span className="font-mono text-amber-300 font-bold">{brushConfig.spacing}px</span>
          </div>
          <input
            type="range"
            min="10"
            max="200"
            step="2"
            value={brushConfig.spacing}
            onChange={(e) => onUpdateBrushConfig({ spacing: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[8px] text-slate-500 mt-0.5">
            <span>10px (Muito Denso)</span>
            <span>40px (Equilibrado)</span>
            <span>200px (Espalhado)</span>
          </div>
        </div>

        {/* Opacidade do Carimbo */}
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-300 mb-1">
            <span>Opacidade do Carimbo:</span>
            <span className="font-mono text-amber-300 font-bold">
              {Math.round(brushConfig.opacity * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={brushConfig.opacity}
            onChange={(e) => onUpdateBrushConfig({ opacity: Number(e.target.value) })}
            className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
        </div>
      </div>

      {/* SEÇÃO 3: RANDOM MIRROR & RANDOM ROTAÇÃO */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <Shuffle className="w-3.5 h-3.5 text-amber-400" />
          <span>Variação Aleatória ao Arrastar</span>
        </span>

        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Random Mirror */}
          <button
            type="button"
            onClick={() =>
              onUpdateBrushConfig({ randomMirror: !brushConfig.randomMirror })
            }
            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
              brushConfig.randomMirror
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold shadow-xs'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <Shuffle className="w-3.5 h-3.5" />
              <span>Random Mirror</span>
            </div>
            <span className="text-[9px] text-slate-400">
              {brushConfig.randomMirror ? 'Espelhamento Ativo' : 'Desativado'}
            </span>
          </button>

          {/* Random Rotação */}
          <button
            type="button"
            onClick={() =>
              onUpdateBrushConfig({ randomRotation: !brushConfig.randomRotation })
            }
            className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
              brushConfig.randomRotation
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold shadow-xs'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5" />
              <span>Random Giro</span>
            </div>
            <span className="text-[9px] text-slate-400">
              {brushConfig.randomRotation ? '0° - 360° Aleatório' : 'Ângulo Fixo'}
            </span>
          </button>
        </div>
      </div>

      {/* SEÇÃO 4: CAMADAS DE CHÃO (LAYERS) */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Camadas de Chão</span>
          </span>
          <button
            type="button"
            onClick={handleAddLayer}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 text-[10px] font-semibold transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Nova Camada</span>
          </button>
        </div>

        {/* Lista de Camadas */}
        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
          {layers.map((layer, idx) => {
            const isSelected = layer.id === brushConfig.activeLayerId;
            const count = stamps.filter((s) => s.layerId === layer.id).length;

            return (
              <div
                key={layer.id}
                onClick={() => onUpdateBrushConfig({ activeLayerId: layer.id })}
                className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400/80 text-amber-200 shadow-xs'
                    : 'bg-slate-900 border-slate-800/80 text-slate-400 hover:bg-slate-850 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500">#{idx + 1}</span>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold">{layer.name}</span>
                    <span className="text-[9px] text-slate-500">
                      {count} {count === 1 ? 'carimbo' : 'carimbos'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {/* Visibilidade */}
                  <button
                    type="button"
                    onClick={() => handleToggleLayerVisible(layer.id)}
                    className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title={layer.visible ? 'Ocultar camada' : 'Exibir camada'}
                  >
                    {layer.visible ? (
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </button>

                  {/* Excluir Camada (se houver mais de 1) */}
                  {layers.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLayer(layer.id)}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Excluir camada"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Ações da Camada Ativa */}
        <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px]">
          <span className="text-slate-400">
            Ativa: <strong className="text-amber-300">{activeLayer?.name}</strong> ({stampsInActiveLayer} itens)
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onUndoLastStamp}
              disabled={stamps.length === 0}
              className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-800"
              title="Desfazer último carimbo colocado"
            >
              Desfazer (1x)
            </button>
            <button
              type="button"
              onClick={onClearActiveLayerStamps}
              disabled={stampsInActiveLayer === 0}
              className="px-2 py-0.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 disabled:opacity-40 disabled:cursor-not-allowed border border-rose-500/30"
              title="Limpar todos os carimbos desta camada"
            >
              Limpar Camada
            </button>
          </div>
        </div>
      </div>

      {/* Modal da Galeria Oficial / Pasta do PC */}
      <AssetGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        title="Carimbos do Mapa"
        subtitle="Escolha um PNG da sua pasta do computador ou do acervo da fase para carimbar"
        galleryAssets={galleryAssets}
        categories={categories}
        onUploadNewAsset={onUploadNewAsset}
        onSelectAsset={(dataUrl, assetName) => {
          const cleanName = assetName || 'Carimbo';
          const prevPresets = brushConfig.savedPresets || [];
          const existingIdx = prevPresets.findIndex((p) => p.dataUrl === dataUrl);
          let nextPresets = prevPresets;
          if (existingIdx === -1) {
            nextPresets = [
              {
                id: `preset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                name: cleanName,
                dataUrl,
              },
              ...prevPresets,
            ];
          }
          onUpdateBrushConfig({
            pngUrl: dataUrl,
            savedPresets: nextPresets,
          });
        }}
      />
    </div>
  );
};
