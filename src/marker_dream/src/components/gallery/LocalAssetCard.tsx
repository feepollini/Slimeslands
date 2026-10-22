import React, { useState, useRef } from 'react';
import {
  Plus,
  Play,
  Square,
  FileAudio,
  Image as ImageIcon,
  Stamp,
} from 'lucide-react';
import { LocalFolderAsset, GalleryAsset, MarkerType } from '../../types/map';
import { localAssetSyncService } from '../../services/localAssetSyncService';

interface Props {
  asset: LocalFolderAsset;
  dropMarkerType?: MarkerType;
  onSelectForMarker?: (asset: LocalFolderAsset, permanentAsset: GalleryAsset, targetType?: MarkerType) => void;
  onSetAsStamp?: (permanentDataUrl: string, assetName: string) => void;
}

export const LocalAssetCard: React.FC<Props> = ({
  asset,
  dropMarkerType = 'npc',
  onSelectForMarker,
  onSetAsStamp,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlayingAudio) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setIsPlayingAudio(false);
    } else {
      if (!audioRef.current) {
        audioRef.current = new Audio(asset.previewUrl);
        audioRef.current.onended = () => setIsPlayingAudio(false);
      }
      audioRef.current.play().catch(() => {});
      setIsPlayingAudio(true);
    }
  };

  const handleMouseEnter = () => {
    // Pré-carrega Base64 em segundo plano para drag-and-drop instantâneo
    if ((asset.type === 'image' || asset.type === 'video') && !localAssetSyncService.getCachedBase64(asset.relativePath)) {
      localAssetSyncService.makeAssetPersistent(asset).catch(() => {});
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    try {
      const cachedDataUrl = localAssetSyncService.getCachedBase64(asset.relativePath) || asset.previewUrl;
      const categoryName = asset.categories[asset.categories.length - 1] || asset.directory || 'Geral';
      const targetType = dropMarkerType || 'npc';
      const isNpc = targetType === 'npc';
      const isVideo = asset.type === 'video';

      e.dataTransfer.setData(
        'application/json',
        JSON.stringify({
          type: 'marker_asset',
          asset: {
            id: asset.id,
            name: asset.name,
            dataUrl: cachedDataUrl,
            mediaType: isVideo ? 'video' : undefined,
            videoUrl: isVideo ? cachedDataUrl : undefined,
            videoChromaKey: isVideo
              ? (asset.videoChromaKey || {
                  enabled: true,
                  keyColor: '#00ff00',
                  tolerance: 0.35,
                  smoothness: 0.1,
                  squareCrop: true,
                  pivotX: 0.5,
                  pivotY: 0.5,
                })
              : undefined,
            pivotX: 0.5,
            pivotY: 0.5,
            width: 150,
            height: 150,
            size: 150,
            category: categoryName,
            subCategoryPath: asset.directory !== 'Raiz' ? asset.directory : undefined,
            sourcePath: asset.relativePath,
            isLocalFolderAsset: true,
            isPersistentPhaseAsset: true,
            targetMarkerType: targetType,
            type: targetType,
            npcBounce: isNpc,
            effect: isNpc ? 'jelly' : 'none',
          },
        })
      );
      e.dataTransfer.effectAllowed = 'copy';
    } catch (err) {
      console.error('Erro ao preparar drag do asset local:', err);
    }
  };

  const handleInsertMarker = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const permanent = await localAssetSyncService.makeAssetPersistent(asset);
    onSelectForMarker?.(asset, permanent, dropMarkerType);
  };

  const handleSetStamp = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const permanent = await localAssetSyncService.makeAssetPersistent(asset);
    onSetAsStamp?.(permanent.dataUrl, permanent.name);
  };

  const formattedSize =
    asset.size > 1024 * 1024
      ? `${(asset.size / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.round(asset.size / 1024)} KB`;

  return (
    <div
      draggable={asset.type === 'image' || asset.type === 'video'}
      onDragStart={handleDragStart}
      onMouseEnter={handleMouseEnter}
      className="group relative p-2 bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-amber-400/70 rounded-2xl flex flex-col justify-between gap-1.5 transition-all hover:shadow-lg cursor-grab active:cursor-grabbing select-none"
    >
      {/* Thumbnail / Preview com foco total no asset sem badges cobrindo */}
      <div
        className="relative aspect-square w-full rounded-xl border border-slate-800/80 p-1.5 flex items-center justify-center overflow-hidden transition-colors group-hover:border-amber-400/40"
        style={{
          backgroundImage:
            'linear-gradient(45deg, #1e293b 25%, transparent 25%), linear-gradient(-45deg, #1e293b 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #1e293b 75%), linear-gradient(-45deg, transparent 75%, #1e293b 75%)',
          backgroundSize: '12px 12px',
          backgroundColor: '#0f172a',
        }}
      >
        {asset.type === 'image' ? (
          <img
            src={asset.previewUrl}
            alt={asset.name}
            className="max-w-full max-h-full object-contain filter drop-shadow transition-transform duration-200 group-hover:scale-110 pointer-events-none"
            loading="lazy"
          />
        ) : asset.type === 'video' ? (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-lg">
            <video
              src={asset.previewUrl}
              muted
              loop
              autoPlay
              playsInline
              className="max-w-full max-h-full object-contain filter drop-shadow group-hover:scale-105 transition-transform duration-200 pointer-events-none"
            />
            <span className="absolute top-1 left-1 text-[8px] bg-rose-600 text-white font-black px-1 py-0.5 rounded shadow">
              VÍDEO
            </span>
          </div>
        ) : asset.type === 'audio' ? (
          <div className="flex flex-col items-center justify-center gap-1.5 text-slate-300">
            <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileAudio className="w-5 h-5" />
            </div>
            <button
              type="button"
              onClick={toggleAudio}
              className={`px-2 py-0.5 rounded-full text-[9px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isPlayingAudio
                  ? 'bg-emerald-500 text-slate-950 font-black'
                  : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
              }`}
            >
              {isPlayingAudio ? (
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
          </div>
        ) : (
          <div className="text-slate-500 flex flex-col items-center gap-1">
            <ImageIcon className="w-6 h-6" />
          </div>
        )}
      </div>

      {/* Label básico e limpo */}
      <div className="w-full text-center px-0.5">
        <h5
          className="text-[11px] font-bold text-slate-200 truncate group-hover:text-amber-300 transition-colors"
          title={`${asset.name} (${formattedSize})`}
        >
          {asset.name}
        </h5>
        <div className="text-[9px] text-slate-500 font-mono truncate">
          {formattedSize}
        </div>
      </div>

      {/* Ações Rápidas Limpas */}
      <div className="flex items-center gap-1 w-full">
        <button
          type="button"
          onClick={handleInsertMarker}
          className="flex-1 py-1 rounded-lg bg-slate-800 hover:bg-amber-400 hover:text-slate-950 text-slate-300 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-700/80 hover:border-amber-400"
          title={`Inserir no mapa como marcador ${dropMarkerType || 'npc'}`}
        >
          <Plus className="w-3 h-3" />
          <span>+ Mapa</span>
        </button>

        {asset.type === 'image' && onSetAsStamp && (
          <button
            type="button"
            onClick={handleSetStamp}
            className="p-1 px-1.5 rounded-lg bg-slate-800 hover:bg-sky-500 hover:text-slate-950 text-slate-400 hover:text-white border border-slate-700 text-[10px] font-bold transition-all cursor-pointer"
            title="Usar como Pincel de Carimbo"
          >
            <Stamp className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
