import React, { useRef, useState } from 'react';
import { SubBiomeConfig, MapMarker } from '../types/map';
import { readUploadedImage, trimImageBorder } from '../utils/tileGenerator';
import {
  Trash2,
  Image as ImageIcon,
  Layers,
  MapPin,
  Plus,
  Paintbrush,
  FolderOpen,
  Upload,
  Music,
  Volume2,
  Play,
  Square,
} from 'lucide-react';
import { AssetGalleryModal } from './AssetGalleryModal';

interface Props {
  subBiomes: SubBiomeConfig[];
  markers: MapMarker[];
  onAddSubBiome: (dataUrl: string, name: string, width: number, height: number) => void;
  onUpdateSubBiome: (id: string, updates: Partial<SubBiomeConfig>) => void;
  onRemoveSubBiome: (id: string) => void;
  onOpenLimitsTab?: () => void;
  galleryAssets?: import('../types/map').GalleryAsset[];
  galleryCategories?: string[];
}

export const SubBiomeStudio: React.FC<Props> = ({
  subBiomes,
  markers,
  onAddSubBiome,
  onUpdateSubBiome,
  onRemoveSubBiome,
  onOpenLimitsTab,
  galleryAssets = [],
  galleryCategories = [],
}) => {
  const newSubBiomeFileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const activeSubBiomeIdRef = useRef<string | null>(null);
  const [isDraggingNew, setIsDraggingNew] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [galleryMode, setGalleryMode] = useState<'new' | 'replace'>('new');
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const togglePreviewAudio = (id: string, url?: string) => {
    if (!url) return;
    if (playingAudioId === id) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      setPlayingAudioId(null);
    } else {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
      }
      const audio = new Audio(url);
      audio.loop = true;
      audio.volume = 0.7;
      audio.play().catch(() => {});
      audioPreviewRef.current = audio;
      setPlayingAudioId(id);
    }
  };

  const handleUploadAudio = (sbId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateSubBiome(sbId, { bgmAudioUrl: reader.result, bgmVolume: 0.7 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Upload new Sub-Biome PNG
  const handleUploadNewSubBiome = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const res = await readUploadedImage(file);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        onAddSubBiome(res.dataUrl, nameWithoutExt, res.width, res.height);
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
  };

  // Replace existing Sub-Biome PNG
  const handleReplaceSubBiomeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const subBiomeId = activeSubBiomeIdRef.current;
    if (!file || !subBiomeId) return;

    try {
      const res = await readUploadedImage(file);
      onUpdateSubBiome(subBiomeId, {
        tilePng: res.dataUrl,
        tileWidth: res.width,
        tileHeight: res.height,
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const triggerReplace = (id: string) => {
    activeSubBiomeIdRef.current = id;
    replaceFileInputRef.current?.click();
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingNew(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        try {
          const res = await readUploadedImage(file);
          const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
          onAddSubBiome(res.dataUrl, nameWithoutExt, res.width, res.height);
        } catch (err) {
          console.error(err);
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file inputs */}
      <input
        ref={newSubBiomeFileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadNewSubBiome}
      />
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleReplaceSubBiomeUpload}
      />

      {/* Header Info */}
      <div className="p-3 bg-gradient-to-r from-purple-950/80 to-slate-900 border border-purple-500/40 rounded-xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
          <Layers className="w-4 h-4 text-purple-400" />
          <span>Extended Biomes (Biomas Estendidos)</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Crie biomas de imagem livre para exploração horizontal ou lateral (de um lado para o outro) ao invés de rolagem vertical padrão. Vincule aos Marcadores <strong className="text-purple-300 font-bold">🌌 Travel</strong>.
        </p>
      </div>

      {/* Atalho para o pincel (que mora SÓ em Definir Limites) */}
      <button
        onClick={() => onOpenLimitsTab?.()}
        className="w-full p-3 bg-slate-900 border border-purple-500/30 hover:border-purple-400 rounded-xl flex items-center gap-3 text-left transition-colors"
        title="Ir para Definir Limites & Colisão para pintar esta fase"
      >
        <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-300 shrink-0">
          <Paintbrush className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-bold text-purple-200 block">
            Pintar área permitida 🖌️
          </span>
          <span className="text-[10px] text-slate-400 block">
            O pincel fica na aba Definir Limites — clique para ir até lá
          </span>
        </div>
      </button>

      {/* Dropzone para Criar Novo Sub-Bioma */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingNew(true);
        }}
        onDragLeave={() => setIsDraggingNew(false)}
        onDrop={handleDrop}
        onClick={() => newSubBiomeFileInputRef.current?.click()}
        className={`p-4 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all ${
          isDraggingNew
            ? 'border-purple-400 bg-purple-500/20 text-purple-200 scale-[1.02]'
            : 'border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/15 hover:border-purple-400 text-slate-200'
        }`}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-sm">
            <Plus className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-purple-300">
            Adicionar PNG do Sub-Bioma
          </span>
          <span className="text-[10px] text-slate-400">
            Arraste ou clique para enviar PNGs de Masmorras / Interiores
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-purple-500/20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setGalleryMode('new');
              setGalleryModalOpen(true);
            }}
            className="py-1.5 px-2.5 rounded-lg bg-gradient-to-r from-purple-500/30 to-fuchsia-500/30 hover:from-purple-500/40 hover:to-fuchsia-500/40 text-purple-200 border border-purple-400/50 text-[11px] font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs transition-colors"
          >
            <FolderOpen className="w-3.5 h-3.5 text-purple-300" />
            <span>Criar da Galeria</span>
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              newSubBiomeFileInputRef.current?.click();
            }}
            className="py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Arquivo Local</span>
          </button>
        </div>
      </div>

      {/* Lista de Sub-Biomas Criados */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-400">
          <span>Sub-Biomas Registrados ({subBiomes.length})</span>
        </div>

        {subBiomes.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-slate-800 text-center text-xs text-slate-500">
            Nenhum Sub-Bioma cadastrado. Importe um PNG acima para começar.
          </div>
        ) : (
          subBiomes.map((sb) => {
            const connectedMarkers = markers.filter(
              (m) => m.type === 'travel' && m.targetSubBiomeId === sb.id
            );

            return (
              <div
                key={sb.id}
                className="p-3 bg-slate-900/90 border border-purple-500/30 rounded-xl space-y-2.5 shadow-md"
              >
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={sb.name}
                    onChange={(e) => onUpdateSubBiome(sb.id, { name: e.target.value })}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-purple-200 font-bold focus:outline-none focus:border-purple-400"
                    placeholder="Nome do Sub-Bioma"
                  />
                  <button
                    onClick={() => onRemoveSubBiome(sb.id)}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                    title="Excluir Sub-Bioma"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-lg border border-purple-500/40 bg-slate-950 p-1 flex items-center justify-center shrink-0 overflow-hidden relative group">
                    <img
                      src={sb.tilePng}
                      alt={sb.name}
                      className="w-full h-full object-cover rounded"
                    />
                  </div>

                  <div className="flex-1 space-y-2 text-xs">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-semibold">Tamanho Proporcional (Máx 5000px):</span>
                        <div className="flex items-center gap-1 font-mono text-[10px]">
                          <input
                            type="number"
                            min="50"
                            max="5000"
                            value={sb.tileWidth || 400}
                            onChange={(e) => {
                              const rawW = Math.max(50, Math.min(5000, parseInt(e.target.value) || 50));
                              const currentW = sb.tileWidth || 400;
                              const currentH = sb.tileHeight || 400;
                              const aspect = currentW > 0 && currentH > 0 ? currentW / currentH : 1;
                              let newW = rawW;
                              let newH = Math.round(newW / aspect);
                              if (newH > 5000) {
                                newH = 5000;
                                newW = Math.max(50, Math.round(newH * aspect));
                              }
                              onUpdateSubBiome(sb.id, { tileWidth: newW, tileHeight: newH });
                            }}
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-1 text-purple-300 font-bold text-center focus:outline-none focus:border-purple-400"
                          />
                          <span className="text-slate-500">×</span>
                          <input
                            type="number"
                            min="50"
                            max="5000"
                            value={sb.tileHeight || 400}
                            onChange={(e) => {
                              const rawH = Math.max(50, Math.min(5000, parseInt(e.target.value) || 50));
                              const currentW = sb.tileWidth || 400;
                              const currentH = sb.tileHeight || 400;
                              const aspect = currentW > 0 && currentH > 0 ? currentW / currentH : 1;
                              let newH = rawH;
                              let newW = Math.round(newH * aspect);
                              if (newW > 5000) {
                                newW = 5000;
                                newH = Math.max(50, Math.round(newW / aspect));
                              }
                              onUpdateSubBiome(sb.id, { tileWidth: newW, tileHeight: newH });
                            }}
                            className="w-16 bg-slate-950 border border-slate-700 rounded px-1 text-purple-300 font-bold text-center focus:outline-none focus:border-purple-400"
                          />
                          <span className="text-slate-400">px</span>
                        </div>
                      </div>

                      {/* Multiplicadores Rápidos da Resolução Nativa (Clampeados proporcionalmente em 5000px) */}
                      <div className="flex items-center gap-1 flex-wrap pt-0.5">
                        {[
                          { label: '0.5x', factor: 0.5 },
                          { label: '1x', factor: 1.0 },
                          { label: '2x', factor: 2.0 },
                          { label: '3x', factor: 3.0 },
                          { label: '5x', factor: 5.0 },
                          { label: '8x', factor: 8.0 },
                          { label: '12x', factor: 12.0 },
                          { label: '16x', factor: 16.0 },
                        ].map(({ label, factor }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => {
                              const img = new Image();
                              img.onload = () => {
                                const baseW = img.naturalWidth || 400;
                                const baseH = img.naturalHeight || 400;
                                let newW = Math.round(baseW * factor);
                                let newH = Math.round(baseH * factor);
                                if (newW > 5000 || newH > 5000) {
                                  const ratio = Math.min(5000 / newW, 5000 / newH);
                                  newW = Math.max(50, Math.round(newW * ratio));
                                  newH = Math.max(50, Math.round(newH * ratio));
                                }
                                onUpdateSubBiome(sb.id, {
                                  tileWidth: newW,
                                  tileHeight: newH,
                                });
                              };
                              img.src = sb.tilePng;
                            }}
                            className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-[9px] text-slate-300 hover:text-white border border-slate-800 transition-colors cursor-pointer"
                            title={`Redimensionar proporcionalmente para ${label} (máx 5000px)`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <input
                        type="range"
                        min="100"
                        max="5000"
                        step="50"
                        value={Math.min(5000, sb.tileWidth || 400)}
                        onChange={(e) => {
                          const rawW = Math.min(5000, parseInt(e.target.value) || 400);
                          const currentW = sb.tileWidth || 400;
                          const currentH = sb.tileHeight || 400;
                          const aspect = currentW > 0 && currentH > 0 ? currentW / currentH : 1;
                          let newW = rawW;
                          let newH = Math.round(newW / aspect);
                          if (newH > 5000) {
                            newH = 5000;
                            newW = Math.max(50, Math.round(newH * aspect));
                          }
                          onUpdateSubBiome(sb.id, {
                            tileWidth: newW,
                            tileHeight: newH,
                          });
                        }}
                        className="w-full accent-purple-400 cursor-pointer h-1.5 bg-slate-950 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setReplaceTargetId(sb.id);
                          setGalleryMode('replace');
                          setGalleryModalOpen(true);
                        }}
                        className="py-1 px-2 rounded-lg bg-gradient-to-r from-purple-500/25 to-fuchsia-500/25 hover:from-purple-500/35 hover:to-fuchsia-500/35 border border-purple-500/40 text-purple-200 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Escolher asset do acervo oficial da Galeria"
                      >
                        <FolderOpen className="w-3 h-3 text-purple-300" />
                        <span>Da Galeria</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => triggerReplace(sb.id)}
                        className="py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                        title="Substituir por arquivo local do seu computador"
                      >
                        <ImageIcon className="w-3 h-3 text-purple-400" />
                        <span>Arquivo Local</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Climas & Eventos do Sub-Bioma (Múltiplos Simultâneos) */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold">⚡ Climas do Sub-Bioma (Múltiplos):</span>
                    <span className="text-[10px] text-purple-400 font-mono">
                      {(() => {
                        const active = sb.biomeEvents && sb.biomeEvents.length > 0
                          ? sb.biomeEvents
                          : (sb.biomeEvent && sb.biomeEvent !== 'none' ? [sb.biomeEvent] : []);
                        return active.length === 0 ? 'Nenhum' : `${active.length} ativo(s)`;
                      })()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { id: 'night', label: 'Noite 🌙', activeCls: 'bg-indigo-500/25 border-indigo-400 text-indigo-200' },
                      { id: 'rain', label: 'Chuva 🌧️', activeCls: 'bg-cyan-500/25 border-cyan-400 text-cyan-200' },
                      { id: 'wind', label: 'Vento 🍃', activeCls: 'bg-teal-500/25 border-teal-400 text-teal-200' },
                      { id: 'leaves', label: 'Folhas 🍂', activeCls: 'bg-amber-500/25 border-amber-400 text-amber-200' },
                      { id: 'dawn', label: 'Alvorada 🌅', activeCls: 'bg-orange-500/25 border-orange-400 text-orange-200' },
                      { id: 'bugs', label: 'Bugs 🪰', activeCls: 'bg-yellow-500/25 border-yellow-400 text-yellow-200' },
                      { id: 'ants', label: 'Formigas 🐜', activeCls: 'bg-rose-500/25 border-rose-400 text-rose-200' },
                    ].map((ev) => {
                      const currentList = sb.biomeEvents && sb.biomeEvents.length > 0
                        ? sb.biomeEvents
                        : (sb.biomeEvent && sb.biomeEvent !== 'none' ? [sb.biomeEvent] : []);
                      const isSel = currentList.includes(ev.id as any);

                      return (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => {
                            const next = isSel
                              ? currentList.filter((x) => x !== ev.id)
                              : [...currentList, ev.id];
                            onUpdateSubBiome(sb.id, {
                              biomeEvents: next as any,
                              biomeEvent: (next[0] || 'none') as any,
                            });
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                            isSel
                              ? `${ev.activeCls} shadow-sm ring-1 ring-white/20`
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {ev.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Velocidade de Caminhada no Sub-Bioma */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <span>⚡ Vel. Caminhada:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
                    <input
                      type="range"
                      min="0.2"
                      max="3.0"
                      step="0.1"
                      value={sb.walkSpeed ?? 1.0}
                      onChange={(e) => onUpdateSubBiome(sb.id, { walkSpeed: parseFloat(e.target.value) })}
                      className="w-full accent-purple-400 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-purple-300 w-10 text-right">
                      {(sb.walkSpeed ?? 1.0).toFixed(1)}x
                    </span>
                  </div>
                </div>

                {/* Escala do Herói nesta fase */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <span>🦸 Escala do Herói:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.05"
                      value={sb.playerScale ?? 1.0}
                      onChange={(e) => onUpdateSubBiome(sb.id, { playerScale: parseFloat(e.target.value) })}
                      className="w-full accent-sky-400 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-sky-300 w-12 text-right">
                      {(sb.playerScale ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                </div>

                {/* Zoom da câmera nesta fase */}
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400 font-semibold flex items-center gap-1">
                    <span>🎥 Zoom Câmera:</span>
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
                    <input
                      type="range"
                      min="0.6"
                      max="2.2"
                      step="0.05"
                      value={sb.cameraZoom ?? 1.0}
                      onChange={(e) => onUpdateSubBiome(sb.id, { cameraZoom: parseFloat(e.target.value) })}
                      className="w-full accent-violet-400 cursor-pointer"
                    />
                    <span className="font-mono font-bold text-violet-300 w-10 text-right">
                      {(sb.cameraZoom ?? 1.0).toFixed(2)}x
                    </span>
                  </div>
                </div>

                {/* Trilha Sonora / BGM da Fase Extended */}
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                      <Music className="w-3.5 h-3.5 text-purple-400" />
                      <span>Trilha / BGM da Fase:</span>
                    </span>
                    {sb.bgmAudioUrl ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => togglePreviewAudio(sb.id, sb.bgmAudioUrl)}
                          className={`p-1 rounded text-[10px] transition-colors flex items-center gap-1 px-1.5 font-bold ${
                            playingAudioId === sb.id
                              ? 'bg-purple-500 text-white shadow-sm'
                              : 'bg-slate-800 hover:bg-slate-700 text-purple-300'
                          }`}
                          title={playingAudioId === sb.id ? 'Parar áudio' : 'Ouvir áudio'}
                        >
                          {playingAudioId === sb.id ? (
                            <>
                              <Square className="w-2.5 h-2.5 fill-current" />
                              <span>Parar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Ouvir</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (playingAudioId === sb.id && audioPreviewRef.current) {
                              audioPreviewRef.current.pause();
                              setPlayingAudioId(null);
                            }
                            onUpdateSubBiome(sb.id, { bgmAudioUrl: undefined });
                          }}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                          title="Remover áudio desta fase"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer px-2 py-0.5 rounded bg-purple-500/15 hover:bg-purple-500/25 border border-purple-500/30 text-purple-300 text-[10px] font-bold flex items-center gap-1 transition-colors">
                        <Upload className="w-3 h-3" />
                        <span>Upload Áudio</span>
                        <input
                          type="file"
                          accept="audio/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadAudio(sb.id, f);
                          }}
                        />
                      </label>
                    )}
                  </div>

                  {sb.bgmAudioUrl && (
                    <div className="flex items-center justify-between gap-2 bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-slate-400" />
                        <span>Volume:</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-1 max-w-[140px]">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.05"
                          value={sb.bgmVolume ?? 0.7}
                          onChange={(e) => onUpdateSubBiome(sb.id, { bgmVolume: parseFloat(e.target.value) })}
                          className="w-full accent-purple-400 cursor-pointer h-1"
                        />
                        <span className="font-mono text-[10px] font-bold text-purple-300 w-8 text-right">
                          {Math.round((sb.bgmVolume ?? 0.7) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Marcadores Travel Conectados */}
                <div className="pt-2 border-t border-slate-800/80 text-[10px]">
                  <div className="flex items-center justify-between text-slate-400 mb-1">
                    <span className="flex items-center gap-1 font-semibold text-purple-300">
                      <MapPin className="w-3 h-3 text-purple-400" />
                      <span>Portais Vinculados:</span>
                    </span>
                    <span className="font-mono font-bold text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded border border-purple-500/30">
                      {connectedMarkers.length} marcadores
                    </span>
                  </div>

                  {connectedMarkers.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {connectedMarkers.map((m) => (
                        <span
                          key={m.id}
                          className="px-2 py-0.5 rounded-full bg-slate-950 border border-purple-500/40 text-purple-200 font-medium truncate max-w-[140px]"
                        >
                          🌌 {m.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-500 italic block">
                      Nenhum marcador Travel vinculado ainda. Selecione este Sub-Bioma nas opções de um marcador Travel.
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Oficial de Seleção da Galeria de Assets para Sub-Biomas */}
      <AssetGalleryModal
        isOpen={galleryModalOpen}
        onClose={() => {
          setGalleryModalOpen(false);
          setReplaceTargetId(null);
        }}
        galleryAssets={galleryAssets}
        categories={galleryCategories}
        title={galleryMode === 'replace' ? 'Trocar Imagem do Sub-Bioma' : 'Criar Novo Sub-Bioma da Galeria'}
        subtitle="Escolha um asset para ser a imagem deste mapa estendido"
        onSelectAsset={(dataUrl, assetName) => {
          if (galleryMode === 'replace' && replaceTargetId) {
            onUpdateSubBiome(replaceTargetId, {
              tilePng: dataUrl,
              ...(assetName ? { name: assetName } : {}),
            });
          } else {
            const img = new Image();
            img.onload = () => {
              onAddSubBiome(
                dataUrl,
                assetName || 'Novo Sub-Bioma',
                img.naturalWidth || 800,
                img.naturalHeight || 800
              );
            };
            img.src = dataUrl;
          }
        }}
      />
    </div>
  );
};
