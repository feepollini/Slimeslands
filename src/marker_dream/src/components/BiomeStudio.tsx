import React, { useRef, useState } from 'react';
import { BiomeTileConfig } from '../types/map';
import { readUploadedImage, trimImageBorder } from '../utils/tileGenerator';
import {
  Upload,
  Trash2,
  ChevronUp,
  ChevronDown,
  Image as ImageIcon,
  Scissors,
  Maximize2,
  Paintbrush,
  Music,
  Volume2,
  Play,
  Square,
  X,
} from 'lucide-react';

interface Props {
  biomes: BiomeTileConfig[];
  onUpdateBiome: (id: string, updates: Partial<BiomeTileConfig>) => void;
  onAddBiomeFromPNG: (dataUrl: string, name: string, width: number, height: number) => void;
  onRemoveBiome: (id: string) => void;
  onMoveBiome: (index: number, direction: 'up' | 'down') => void;
  onOpenLimitsTab?: () => void;
}

export const BiomeStudio: React.FC<Props> = ({
  biomes,
  onUpdateBiome,
  onAddBiomeFromPNG,
  onRemoveBiome,
  onMoveBiome,
  onOpenLimitsTab,
}) => {
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const newBiomeFileInputRef = useRef<HTMLInputElement>(null);
  const activeReplaceBiomeIdRef = useRef<string | null>(null);
  const [isDraggingNew, setIsDraggingNew] = useState(false);
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

  const handleUploadAudio = (biomeId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onUpdateBiome(biomeId, { bgmAudioUrl: reader.result, bgmVolume: 0.7 });
      }
    };
    reader.readAsDataURL(file);
  };

  // Replace existing biome tile PNG
  const handleReplaceTileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const biomeId = activeReplaceBiomeIdRef.current;
    if (!file || !biomeId) return;

    try {
      const res = await readUploadedImage(file);
      onUpdateBiome(biomeId, {
        tilePng: res.dataUrl,
        tileWidth: res.width,
        tileHeight: res.height,
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  // Add new biome from uploaded PNG
  const handleNewBiomeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const res = await readUploadedImage(file);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        onAddBiomeFromPNG(res.dataUrl, nameWithoutExt, res.width, res.height);
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
  };

  const triggerReplace = (biomeId: string) => {
    activeReplaceBiomeIdRef.current = biomeId;
    replaceFileInputRef.current?.click();
  };

  const handleTrimBiome = async (biome: BiomeTileConfig) => {
    try {
      const res = await trimImageBorder(biome.tilePng, 1);
      onUpdateBiome(biome.id, {
        tilePng: res.dataUrl,
        tileWidth: res.width,
        tileHeight: res.height,
        baseColor: res.dominantColor || biome.baseColor,
      });
    } catch (err) {
      console.error('Falha ao aparar borda:', err);
    }
  };

  const handleDropNew = async (e: React.DragEvent<HTMLDivElement>) => {
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
          onAddBiomeFromPNG(res.dataUrl, nameWithoutExt, res.width, res.height);
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
        ref={replaceFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleReplaceTileUpload}
      />
      <input
        ref={newBiomeFileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleNewBiomeUpload}
      />

      {/* Atalho para o pincel (que mora SÓ em Definir Limites) */}
      <button
        onClick={() => onOpenLimitsTab?.()}
        className="w-full p-3 bg-gradient-to-r from-emerald-950/60 to-slate-900 border border-emerald-500/30 hover:border-emerald-400 rounded-xl flex items-center gap-3 text-left transition-colors"
        title="Ir para Definir Limites & Colisão"
      >
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <Paintbrush className="w-4 h-4" />
        </div>
        <div className="min-w-0">
          <span className="text-xs font-bold text-emerald-300 block">
            Pintar área caminhável 🖌️
          </span>
          <span className="text-[10px] text-slate-400 block">
            O pincel fica na aba Definir Limites — clique para ir até lá
          </span>
        </div>
      </button>

      {/* Primary PNG Import Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingNew(true);
        }}
        onDragLeave={() => setIsDraggingNew(false)}
        onDrop={handleDropNew}
        onClick={() => newBiomeFileInputRef.current?.click()}
        className={`p-4 border-2 border-dashed rounded-xl cursor-pointer text-center transition-all ${
          isDraggingNew
            ? 'border-amber-400 bg-amber-500/20 text-amber-200 scale-[1.02]'
            : 'border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/15 hover:border-amber-400 text-slate-200'
        }`}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 shadow-sm">
            <Upload className="w-5 h-5" />
          </div>
          <span className="text-xs font-bold text-amber-300">
            Carregar PNG do Bioma
          </span>
          <span className="text-[11px] text-slate-400">
            Clique ou arraste seu arquivo PNG aqui para adicionar
          </span>
        </div>
      </div>

      {/* Biomes List */}
      <div className="space-y-3">
        {biomes.map((biome, idx) => (
          <div
            key={biome.id}
            className="p-3 bg-slate-900 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="relative shrink-0">
                <img
                  src={biome.tilePng}
                  alt={biome.name}
                  className="w-12 h-12 rounded-lg border border-slate-700 object-cover shadow-sm bg-slate-950"
                />
              </div>

              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={biome.name}
                  onChange={(e) => onUpdateBiome(biome.id, { name: e.target.value })}
                  className="w-full bg-transparent text-sm font-semibold text-slate-100 focus:outline-none focus:border-b border-amber-500 truncate"
                  placeholder="Nome do bioma"
                />
                <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                  <span className="font-mono-data text-amber-400">
                    {biome.tileRepeatCount}x repetições
                  </span>
                  <span>·</span>
                  <span className="font-mono-data text-sky-400 font-medium">
                    {biome.tileWidth}×{biome.tileHeight}px
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  disabled={idx === 0}
                  onClick={() => onMoveBiome(idx, 'up')}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                  title="Mover para cima"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  disabled={idx === biomes.length - 1}
                  onClick={() => onMoveBiome(idx, 'down')}
                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
                  title="Mover para baixo"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  disabled={biomes.length <= 1}
                  onClick={() => onRemoveBiome(biome.id)}
                  className="p-1 rounded text-slate-500 hover:text-rose-400 disabled:opacity-30"
                  title="Excluir bioma"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => triggerReplace(biome.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trocar PNG</span>
                </button>

                <button
                  onClick={() => handleTrimBiome(biome)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors text-[11px]"
                  title="Apara 1 pixel de cada borda para eliminar qualquer costura ou linha preta externa"
                >
                  <Scissors className="w-3 h-3" />
                  <span>Aparar 1px da Borda</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                Tamanho: <b className="text-slate-200 font-mono-data">{biome.tileWidth}×{biome.tileHeight}px</b>
              </span>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 flex items-center gap-1 shrink-0">
                <Maximize2 className="w-3 h-3 text-sky-400" />
                <span>Escala do Tile:</span>
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                {[
                  { label: '0.5x', factor: 0.5 },
                  { label: '1x', factor: 1 },
                  { label: '1.5x', factor: 1.5 },
                  { label: '2x', factor: 2 },
                  { label: '3x', factor: 3 },
                  { label: '4x', factor: 4 },
                  { label: '6x', factor: 6 },
                  { label: '8x', factor: 8 },
                  { label: '12x', factor: 12 },
                  { label: '16x', factor: 16 },
                ].map(({ label, factor }) => {
                  return (
                    <button
                      key={label}
                      onClick={() => {
                        const img = new Image();
                        img.onload = () => {
                          const baseW = img.naturalWidth || 64;
                          const baseH = img.naturalHeight || 64;
                          let newW = Math.round(baseW * factor);
                          let newH = Math.round(baseH * factor);
                          if (newW > 5000 || newH > 5000) {
                            const ratio = Math.min(5000 / newW, 5000 / newH);
                            newW = Math.max(32, Math.round(newW * ratio));
                            newH = Math.max(32, Math.round(newH * ratio));
                          }
                          const maxRepeats = Math.max(1, Math.floor(5000 / Math.max(32, newH)));
                          onUpdateBiome(biome.id, {
                            tileWidth: newW,
                            tileHeight: newH,
                            tileRepeatCount: Math.min(biome.tileRepeatCount || 1, maxRepeats),
                          });
                        };
                        img.src = biome.tilePng;
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-950 hover:bg-slate-800 text-[10px] text-slate-300 hover:text-white border border-slate-800 transition-colors"
                      title={`Redimensionar para ${label} (máx 5000px)`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center gap-3">
              <span className="text-xs text-slate-400 shrink-0">Repetições:</span>
              {(() => {
                const maxSafeRepeats = Math.max(1, Math.min(100, Math.floor(5000 / Math.max(32, biome.tileHeight || 64))));
                return (
                  <>
                    <input
                      type="range"
                      min="1"
                      max={maxSafeRepeats}
                      value={Math.min(biome.tileRepeatCount, maxSafeRepeats)}
                      onChange={(e) =>
                        onUpdateBiome(biome.id, {
                          tileRepeatCount: Math.max(1, Math.min(maxSafeRepeats, Number(e.target.value) || 1)),
                        })
                      }
                      className="flex-1 accent-amber-500 cursor-pointer"
                    />
                    <span className="font-mono-data text-xs text-slate-200 w-8 text-right">
                      <input
                        type="number"
                        min="1"
                        max={maxSafeRepeats}
                        value={Math.min(biome.tileRepeatCount, maxSafeRepeats)}
                        onChange={(e) =>
                          onUpdateBiome(biome.id, {
                            tileRepeatCount: Math.max(1, Math.min(maxSafeRepeats, Number(e.target.value) || 1)),
                          })
                        }
                        className="w-12 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-xs text-amber-300 font-mono-data font-bold text-center focus:outline-none focus:border-amber-400"
                      />
                      <span className="text-xs text-slate-400 font-mono">x</span>
                    </span>
                  </>
                );
              })()}
            </div>

            {/* Climas & Eventos do Bioma (Múltiplos Simultâneos) */}
            <div className="mt-2.5 pt-2 border-t border-slate-800/50 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">⚡ Climas do Bioma (Múltiplos):</span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {(() => {
                    const active = biome.biomeEvents && biome.biomeEvents.length > 0
                      ? biome.biomeEvents
                      : (biome.biomeEvent && biome.biomeEvent !== 'none' ? [biome.biomeEvent] : []);
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
                  const currentList = biome.biomeEvents && biome.biomeEvents.length > 0
                    ? biome.biomeEvents
                    : (biome.biomeEvent && biome.biomeEvent !== 'none' ? [biome.biomeEvent] : []);
                  const isSel = currentList.includes(ev.id as any);

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => {
                        const next = isSel
                          ? currentList.filter((x) => x !== ev.id)
                          : [...currentList, ev.id];
                        onUpdateBiome(biome.id, {
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

            <div className="mt-2.5 pt-2 border-t border-slate-800/50 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 shrink-0">⚡ Vel. Caminhada:</span>
              <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={biome.walkSpeed ?? 1.0}
                  onChange={(e) => onUpdateBiome(biome.id, { walkSpeed: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-amber-300 w-10 text-right">
                  {(biome.walkSpeed ?? 1.0).toFixed(1)}x
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 shrink-0">🦸 Escala do Herói:</span>
              <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
                <input
                  type="range"
                  min="0.1"
                  max="10.0"
                  step="0.05"
                  value={biome.playerScale ?? 1.0}
                  onChange={(e) => onUpdateBiome(biome.id, { playerScale: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-sky-300 w-12 text-right">
                  {(biome.playerScale ?? 1.0).toFixed(2)}x
                </span>
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/50 flex items-center justify-between gap-2">
              <span className="text-xs text-slate-400 shrink-0">🎥 Zoom Câmera:</span>
              <div className="flex items-center gap-1.5 flex-1 max-w-[180px]">
                <input
                  type="range"
                  min="0.6"
                  max="2.2"
                  step="0.05"
                  value={biome.cameraZoom ?? 1.0}
                  onChange={(e) => onUpdateBiome(biome.id, { cameraZoom: parseFloat(e.target.value) })}
                  className="w-full accent-violet-400 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-violet-300 w-10 text-right">
                  {(biome.cameraZoom ?? 1.0).toFixed(2)}x
                </span>
              </div>
            </div>

            {/* Trilha Sonora / BGM Contínua do Bioma */}
            <div className="mt-2 pt-2 border-t border-slate-800/50 space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5 text-amber-400" />
                  <span>Trilha / BGM:</span>
                </span>
                {biome.bgmAudioUrl ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => togglePreviewAudio(biome.id, biome.bgmAudioUrl)}
                      className={`p-1 rounded text-[10px] transition-colors flex items-center gap-1 px-1.5 font-bold ${
                        playingAudioId === biome.id
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-slate-800 hover:bg-slate-700 text-amber-300'
                      }`}
                      title={playingAudioId === biome.id ? 'Parar áudio' : 'Ouvir áudio'}
                    >
                      {playingAudioId === biome.id ? (
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
                        if (playingAudioId === biome.id && audioPreviewRef.current) {
                          audioPreviewRef.current.pause();
                          setPlayingAudioId(null);
                        }
                        onUpdateBiome(biome.id, { bgmAudioUrl: undefined });
                      }}
                      className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors"
                      title="Remover áudio deste bioma"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer px-2 py-0.5 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>Upload Áudio</span>
                    <input
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadAudio(biome.id, f);
                      }}
                    />
                  </label>
                )}
              </div>

              {biome.bgmAudioUrl && (
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
                      value={biome.bgmVolume ?? 0.7}
                      onChange={(e) => onUpdateBiome(biome.id, { bgmVolume: parseFloat(e.target.value) })}
                      className="w-full accent-amber-400 cursor-pointer h-1"
                    />
                    <span className="font-mono text-[10px] font-bold text-amber-300 w-8 text-right">
                      {Math.round((biome.bgmVolume ?? 0.7) * 100)}%
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
