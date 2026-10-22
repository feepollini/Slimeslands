import React, { useState, useRef } from 'react';
import { AttackAssetConfig, GalleryAsset, VideoChromaKeyConfig } from '../../../types/map';
import { VideoChromaKeyModal } from '../../video/VideoChromaKeyModal';
import { VideoAssetCanvas } from '../../video/VideoAssetCanvas';
import { MotionAssetCanvas } from '../../MotionAssetCanvas';
import { isVideoFile, readUploadedVideo, getVideoDuration } from '../../../utils/videoUtils';
import { readUploadedImage } from '../../../utils/tileGenerator';
import { Sparkles, Upload, Trash2, Sliders, Film, Image as ImageIcon, Check, Zap } from 'lucide-react';

interface AttackAssetSelectorProps {
  label: string;
  attackType?: 'jump' | 'dash' | 'hackSlash' | 'ranged';
  attackDurationSec?: number;
  attackAsset?: AttackAssetConfig;
  onChange: (asset: AttackAssetConfig | undefined) => void;
  availableAssets?: GalleryAsset[];
}

export const AttackAssetSelector: React.FC<AttackAssetSelectorProps> = ({
  label,
  attackType,
  attackDurationSec = 0.4,
  attackAsset,
  onChange,
  availableAssets = [],
}) => {
  const [isChromaModalOpen, setIsChromaModalOpen] = useState(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (isVideoFile(file)) {
        const vid = await readUploadedVideo(file);
        const targetSec = attackDurationSec || 0.4;
        const rawSpeed = vid.duration > 0 ? vid.duration / targetSec : 1.0;
        const autoSpeed = Math.max(0.25, Math.min(10.0, Math.round(rawSpeed * 10) / 10));

        onChange({
          type: 'video',
          url: vid.videoUrl,
          name: file.name.replace(/\.[^/.]+$/, ''),
          size: Math.max(32, Math.min(180, vid.width)),
          scale: 1.0,
          videoChromaKey: {
            enabled: true,
            color: '#00ff00',
            tolerance: 35,
            smoothness: 12,
            cropSquare: false, // Por padrão, mantém o vídeo completo
            cropOffsetX: 0.5,
            cropOffsetY: 0.5,
            videoSpeed: autoSpeed,
          },
        });
      } else {
        const img = await readUploadedImage(file);
        onChange({
          type: 'png',
          url: img.dataUrl,
          name: file.name.replace(/\.[^/.]+$/, ''),
          size: Math.max(24, Math.min(180, Math.max(img.width, img.height))),
          scale: 1.0,
        });
      }
    } catch (err) {
      console.error('Erro ao carregar asset do ataque:', err);
    }
    e.target.value = '';
  };

  const handleSelectFromGallery = async (ga: GalleryAsset) => {
    const isVideo = ga.mediaType === 'video' || !!ga.videoUrl;
    const isMotion = !!(ga.motionLayers && ga.motionLayers.length > 0);

    let autoSpeed = ga.videoChromaKey?.videoSpeed || 1.0;
    if (isVideo) {
      const url = ga.videoUrl || ga.dataUrl;
      const vidDur = await getVideoDuration(url);
      const targetSec = attackDurationSec || 0.4;
      if (vidDur > 0) {
        autoSpeed = Math.max(0.25, Math.min(10.0, Math.round((vidDur / targetSec) * 10) / 10));
      }
    }

    onChange({
      type: isVideo ? 'video' : isMotion ? 'motion' : 'png',
      url: isVideo ? (ga.videoUrl || ga.dataUrl) : ga.dataUrl,
      name: ga.name,
      motionLayers: ga.motionLayers,
      videoChromaKey: {
        ...(ga.videoChromaKey || {
          enabled: true,
          color: '#00ff00',
          tolerance: 35,
          smoothness: 12,
          cropSquare: false,
          cropOffsetX: 0.5,
          cropOffsetY: 0.5,
        }),
        videoSpeed: autoSpeed,
      },
      size: (ga.width && ga.height) ? Math.max(ga.width, ga.height) : 64,
      scale: 1.0,
    });
    setIsGalleryPickerOpen(false);
  };

  const hasAsset = attackAsset && attackAsset.type !== 'none' && (attackAsset.url || (attackAsset.motionLayers && attackAsset.motionLayers.length > 0));

  return (
    <div className="pt-2 border-t border-slate-800/80 space-y-2">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,video/mp4,video/webm,video/ogg,video/quicktime,video/*"
        className="hidden"
        onChange={handleFileUpload}
      />

      <div className="flex items-center justify-between text-[11px]">
        <span className="font-semibold text-slate-300 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          {label}
        </span>
        {hasAsset && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-1 transition"
            title="Remover asset do ataque e esvaziar slot"
          >
            <Trash2 className="w-3 h-3" />
            Remover
          </button>
        )}
      </div>

      {!hasAsset ? (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGalleryPickerOpen(!isGalleryPickerOpen)}
            className="flex-1 py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-700/80 hover:border-amber-400 text-slate-300 text-[10px] font-semibold flex items-center justify-center gap-1.5 transition"
          >
            <ImageIcon className="w-3 h-3 text-amber-400" />
            <span>Escolher da Galeria</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-semibold flex items-center gap-1 transition"
            title="Importar PNG, Vídeo ou GIF local"
          >
            <Upload className="w-3 h-3 text-cyan-400" />
            <span>Importar</span>
          </button>
        </div>
      ) : (
        <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            {/* Preview do Asset */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0 relative">
                {attackAsset.type === 'video' && attackAsset.url ? (
                  <VideoAssetCanvas
                    key={attackAsset.url}
                    videoUrl={attackAsset.url}
                    chromaKey={attackAsset.videoChromaKey}
                    className="w-full h-full object-contain"
                  />
                ) : attackAsset.type === 'motion' && (attackAsset.url || attackAsset.motionLayers) ? (
                  <MotionAssetCanvas
                    src={attackAsset.url || ''}
                    motionLayers={attackAsset.motionLayers}
                    isNpcBounce={false}
                    width={40}
                    height={40}
                    className="w-full h-full object-contain"
                  />
                ) : attackAsset.url ? (
                  <img
                    src={attackAsset.url}
                    alt={attackAsset.name || 'asset'}
                    className="w-full h-full object-contain"
                  />
                ) : null}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-200 truncate">
                    {attackAsset.name || 'Asset Personalizado'}
                  </span>
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.2 rounded uppercase ${
                      attackAsset.type === 'video'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : attackAsset.type === 'motion'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}
                  >
                    {attackAsset.type}
                  </span>
                </div>
                <span className="text-[9px] text-slate-500 block truncate">
                  Tamanho: {attackAsset.size || 48}px • Escala: {(attackAsset.scale || 1.0).toFixed(1)}x
                </span>
              </div>
            </div>

            {/* Ações do Asset */}
            <div className="flex items-center gap-1">
              {attackAsset.type === 'video' && (
                <button
                  type="button"
                  onClick={() => setIsChromaModalOpen(true)}
                  className="px-2 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 transition"
                  title="Ajustar Chroma Key, enquadramento e velocidade do vídeo"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Chroma</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsGalleryPickerOpen(!isGalleryPickerOpen)}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition"
                title="Trocar por outro asset da galeria"
              >
                <ImageIcon className="w-3 h-3 text-amber-400" />
                <span>Galeria</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-semibold flex items-center gap-1 transition"
                title="Substituir por outro arquivo local (Vídeo ou PNG)"
              >
                <Upload className="w-3 h-3 text-cyan-400" />
                <span>Local</span>
              </button>
            </div>
          </div>

          {/* Sincronização Automática de Velocidade do Vídeo com a Duração do Ataque */}
          {attackAsset.type === 'video' && (
            <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900/90 border border-slate-800 text-[10px]">
              <div className="flex items-center gap-1.5 text-cyan-300 font-mono">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span>Ataque: <strong>{attackDurationSec}s</strong></span>
                <span>•</span>
                <span>Velocidade: <strong>{attackAsset.videoChromaKey?.videoSpeed || 1.0}x</strong></span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (attackAsset.url) {
                    const vidDur = await getVideoDuration(attackAsset.url);
                    const targetSec = attackDurationSec || 0.4;
                    const autoSpeed = Math.max(0.25, Math.min(10.0, Math.round((vidDur / targetSec) * 10) / 10));
                    onChange({
                      ...attackAsset,
                      videoChromaKey: {
                        ...(attackAsset.videoChromaKey || {
                          enabled: true,
                          color: '#00ff00',
                          tolerance: 35,
                          smoothness: 12,
                          cropSquare: false,
                          cropOffsetX: 0.5,
                          cropOffsetY: 0.5,
                        }),
                        videoSpeed: autoSpeed,
                      },
                    });
                  }
                }}
                className="text-[9px] text-amber-400 hover:text-amber-300 font-bold underline"
                title="Recalcular velocidade proporcional para tocar o vídeo completo dentro do tempo deste ataque"
              >
                Sincronizar
              </button>
            </div>
          )}

          {/* Ajuste de Escala & Tamanho do Efeito */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900 text-[10px]">
            <div>
              <div className="flex justify-between text-slate-400 mb-0.5">
                <span>Tamanho Base:</span>
                <span className="font-mono text-amber-300">{attackAsset.size || 48}px</span>
              </div>
              <input
                type="range"
                min="20"
                max="200"
                value={attackAsset.size || 48}
                onChange={(e) =>
                  onChange({ ...attackAsset, size: parseInt(e.target.value, 10) })
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-0.5">
                <span>Escala Visual:</span>
                <span className="font-mono text-cyan-300">{(attackAsset.scale || 1.0).toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={attackAsset.scale || 1.0}
                onChange={(e) =>
                  onChange({ ...attackAsset, scale: parseFloat(e.target.value) })
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Popover / Seletor de Assets da Galeria */}
      {isGalleryPickerOpen && (
        <div className="p-2 rounded-xl bg-slate-900 border border-slate-700 shadow-xl space-y-2 max-h-48 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800">
            <span>Selecione um asset do projeto:</span>
            <button
              type="button"
              onClick={() => setIsGalleryPickerOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          {availableAssets.length === 0 ? (
            <div className="text-center py-3 text-[10px] text-slate-500">
              Nenhum asset cadastrado na galeria ainda.
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {availableAssets.map((ga) => (
                <button
                  key={ga.id}
                  type="button"
                  onClick={() => handleSelectFromGallery(ga)}
                  className="p-1 rounded-lg border border-slate-800 hover:border-amber-400 bg-slate-950 flex flex-col items-center gap-1 transition group"
                  title={ga.name}
                >
                  <div className="w-10 h-10 rounded bg-slate-900 flex items-center justify-center overflow-hidden">
                    {ga.mediaType === 'video' || ga.videoUrl ? (
                      <VideoAssetCanvas
                        key={ga.videoUrl || ga.dataUrl}
                        videoUrl={ga.videoUrl || ga.dataUrl}
                        chromaKey={ga.videoChromaKey}
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <img
                        src={ga.dataUrl}
                        alt={ga.name}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <span className="text-[8px] text-slate-300 truncate w-full text-center group-hover:text-amber-300">
                    {ga.name}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de Chroma Key dedicado ao asset de vídeo do ataque */}
      {isChromaModalOpen && attackAsset?.type === 'video' && attackAsset.url && (
        <VideoChromaKeyModal
          isOpen={isChromaModalOpen}
          onClose={() => setIsChromaModalOpen(false)}
          videoUrl={attackAsset.url}
          targetDurationSec={attackDurationSec}
          initialChromaKey={attackAsset.videoChromaKey}
          onSave={({ chromaKey }) => {
            onChange({
              ...attackAsset,
              videoChromaKey: chromaKey,
            });
          }}
        />
      )}
    </div>
  );
};
