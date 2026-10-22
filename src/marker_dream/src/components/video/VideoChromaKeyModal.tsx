import React, { useState, useEffect } from 'react';
import { VideoChromaKeyConfig } from '../../types/map';
import { VideoAssetCanvas } from './VideoAssetCanvas';
import {
  X,
  Pipette,
  Scissors,
  Crosshair,
  Sliders,
  Check,
  RotateCcw,
  Sparkles,
  Play,
  Pause,
  Gauge,
  ZoomIn,
  FlipHorizontal,
  Square,
  Maximize2,
} from 'lucide-react';

interface VideoChromaKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  initialChromaKey?: VideoChromaKeyConfig;
  initialConfig?: VideoChromaKeyConfig;
  initialPivotX?: number;
  initialPivotY?: number;
  targetDurationSec?: number;
  onSave?: (config: {
    chromaKey: VideoChromaKeyConfig;
    pivotX: number;
    pivotY: number;
  }) => void;
  onApply?: (config: VideoChromaKeyConfig) => void;
}

const DEFAULT_CHROMA_KEY: VideoChromaKeyConfig = {
  enabled: true,
  color: '#00ff00',
  tolerance: 35,
  smoothness: 12,
  cropSquare: true,
  cropOffsetX: 0.5,
  cropOffsetY: 0.5,
  videoSpeed: 1.0,
  scale: 1.0,
  flipH: false,
};

const COLOR_PRESETS = [
  { name: 'Verde Croma', hex: '#00ff00' },
  { name: 'Azul Croma', hex: '#0000ff' },
  { name: 'Magenta', hex: '#ff00ff' },
  { name: 'Preto', hex: '#000000' },
  { name: 'Branco', hex: '#ffffff' },
];

export const VideoChromaKeyModal: React.FC<VideoChromaKeyModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  initialChromaKey,
  initialConfig,
  initialPivotX = 0.5,
  initialPivotY = 0.5,
  targetDurationSec,
  onSave,
  onApply,
}) => {
  const effectiveInitial = initialChromaKey || initialConfig;
  const [config, setConfig] = useState<VideoChromaKeyConfig>(() => ({
    ...DEFAULT_CHROMA_KEY,
    ...(effectiveInitial || {}),
  }));

  const [videoSpeed, setVideoSpeed] = useState<number>(() => effectiveInitial?.videoSpeed ?? 1.0);
  const [scale, setScale] = useState<number>(() => effectiveInitial?.scale ?? 1.0);
  const [flipH, setFlipH] = useState<boolean>(() => effectiveInitial?.flipH ?? false);

  const [pivotX, setPivotX] = useState<number>(initialPivotX);
  const [pivotY, setPivotY] = useState<number>(initialPivotY);
  const [isPipetteActive, setIsPipetteActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number; duration?: number }>({
    width: 0,
    height: 0,
    duration: 0,
  });

  // Sempre sincroniza com as propriedades iniciais recebidas ao abrir
  useEffect(() => {
    if (isOpen) {
      const init = initialChromaKey || initialConfig;
      setConfig({
        ...DEFAULT_CHROMA_KEY,
        ...(init || {}),
      });
      setVideoSpeed(init?.videoSpeed ?? 1.0);
      setScale(init?.scale ?? 1.0);
      setFlipH(init?.flipH ?? false);
      setPivotX(initialPivotX ?? 0.5);
      setPivotY(initialPivotY ?? 0.5);
      setIsPipetteActive(false);
      setIsPaused(false);
    }
  }, [isOpen, initialChromaKey, initialConfig, initialPivotX, initialPivotY]);

  if (!isOpen) return null;

  const handleSampleColor = (hex: string) => {
    setConfig(prev => ({
      ...prev,
      color: hex,
      enabled: true,
    }));
    setIsPipetteActive(false);
  };

  const handleSave = () => {
    const finalChromaKey: VideoChromaKeyConfig = {
      ...config,
      videoSpeed,
      scale,
      flipH,
    };

    if (onSave) {
      onSave({
        chromaKey: finalChromaKey,
        pivotX,
        pivotY,
      });
    }

    if (onApply) {
      onApply(finalChromaKey);
    }

    onClose();
  };

  const handleReset = () => {
    setConfig(DEFAULT_CHROMA_KEY);
    setVideoSpeed(1.0);
    setScale(1.0);
    setFlipH(false);
    setPivotX(0.5);
    setPivotY(0.5);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[92vh] overflow-hidden text-slate-100 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">
                Configurar Vídeo, Chroma Key & Pivô
              </h2>
              <p className="text-xs text-slate-400">
                Remova o fundo verde/azul, enquadre em 1:1 e calibre o pivô do marcador
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
          {/* Coluna 1: Preview do Vídeo com Checkerboard e Pivô (7 colunas) */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                Preview em Tempo Real
                {videoDimensions.width > 0 && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {videoDimensions.width}x{videoDimensions.height}
                  </span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPaused(!isPaused)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  {isPaused ? 'Reproduzir' : 'Pausar'}
                </button>
              </div>
            </div>

            {/* Palco centralizado do Canvas com fundo xadrez para visualizar transparência */}
            <div className="w-full h-[380px] rounded-xl border border-slate-700/80 bg-slate-950/80 flex items-center justify-center p-2 relative select-none overflow-hidden">
              <div
                className={`relative rounded-lg border border-slate-700 overflow-hidden flex items-center justify-center shadow-2xl transition-all ${
                  isPipetteActive ? 'ring-2 ring-emerald-400 cursor-crosshair' : ''
                }`}
                style={{
                  aspectRatio: (config.cropSquare ?? true)
                    ? '1 / 1'
                    : videoDimensions.width > 0 && videoDimensions.height > 0
                    ? `${videoDimensions.width} / ${videoDimensions.height}`
                    : '16 / 9',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: (config.cropSquare ?? true)
                    ? '350px'
                    : videoDimensions.width > 0 && videoDimensions.height > 0
                    ? videoDimensions.width >= videoDimensions.height
                      ? '100%'
                      : `${Math.round((videoDimensions.width / videoDimensions.height) * 360)}px`
                    : '100%',
                  height: (config.cropSquare ?? true)
                    ? '350px'
                    : videoDimensions.width > 0 && videoDimensions.height > 0
                    ? videoDimensions.height >= videoDimensions.width
                      ? '100%'
                      : 'auto'
                    : 'auto',
                  backgroundImage: `
                    linear-gradient(45deg, #1e293b 25%, transparent 25%),
                    linear-gradient(-45deg, #1e293b 25%, transparent 25%),
                    linear-gradient(45deg, transparent 75%, #1e293b 75%),
                    linear-gradient(-45deg, transparent 75%, #1e293b 75%)
                  `,
                  backgroundSize: '16px 16px',
                  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
                  backgroundColor: '#0f172a',
                }}
              >
                <VideoAssetCanvas
                  key={videoUrl}
                  videoUrl={videoUrl}
                  chromaKey={{
                    ...config,
                    videoSpeed,
                    scale,
                    flipH,
                  }}
                  paused={isPaused}
                  pipetteActive={isPipetteActive}
                  onSampleColor={handleSampleColor}
                  onLoadedMetadata={({ width, height, duration }) => setVideoDimensions({ width, height, duration })}
                  className="w-full h-full object-contain"
                />

                {/* Marcador visual do Pivô */}
                <div
                  className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
                  style={{
                    left: `${pivotX * 100}%`,
                    top: `${pivotY * 100}%`,
                  }}
                >
                  <div className="w-5 h-5 rounded-full border-2 border-amber-400 bg-amber-500/30 flex items-center justify-center shadow-lg animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-300" />
                  </div>
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] text-amber-300 font-mono whitespace-nowrap">
                    Pivô ({Math.round(pivotX * 100)}%, {Math.round(pivotY * 100)}%)
                  </div>
                </div>

                {/* Banner se o conta-gotas estiver ativo */}
                {isPipetteActive && (
                  <div className="absolute top-3 left-3 right-3 px-3 py-1.5 rounded-lg bg-emerald-500/90 text-slate-950 font-bold text-xs flex items-center justify-between shadow-lg pointer-events-none animate-bounce">
                    <span className="flex items-center gap-1.5">
                      <Pipette className="w-4 h-4" />
                      Clique em qualquer ponto do vídeo para capturar a cor!
                    </span>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-950/20">
                      Ativo
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Dica */}
            <div className="text-[11px] text-slate-400 flex items-center justify-between">
              <span>
                💡 Dica: Ative a <b>Pipeta</b> e clique na tela verde para seleção automática de cor.
              </span>
              <button
                type="button"
                onClick={handleReset}
                className="text-slate-500 hover:text-slate-300 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Restaurar Padrões
              </button>
            </div>
          </div>

          {/* Coluna 2: Controles e Parâmetros (5 colunas) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Bloco 1: Chroma Key */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Chroma Key (Remover Fundo)
                </label>
                <input
                  type="checkbox"
                  checked={config.enabled}
                  onChange={e => setConfig({ ...config, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 bg-slate-900 border-slate-700 cursor-pointer"
                />
              </div>

              {config.enabled && (
                <div className="flex flex-col gap-3 pt-2 border-t border-slate-700/40">
                  {/* Seletor de Cor & Pipeta */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-slate-400 font-medium">Cor de Fundo:</span>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-700 flex-1">
                        <input
                          type="color"
                          value={config.color}
                          onChange={e => setConfig({ ...config, color: e.target.value })}
                          className="w-6 h-6 rounded border-0 cursor-pointer bg-transparent"
                        />
                        <span className="font-mono text-xs uppercase text-slate-300">
                          {config.color}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsPipetteActive(!isPipetteActive)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                          isPipetteActive
                            ? 'bg-emerald-500 text-slate-950 shadow-md ring-2 ring-emerald-300'
                            : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                        }`}
                        title="Ativar conta-gotas para clicar no vídeo"
                      >
                        <Pipette className="w-3.5 h-3.5" />
                        Pipeta
                      </button>
                    </div>

                    {/* Presets Rápidos */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {COLOR_PRESETS.map(preset => (
                        <button
                          key={preset.hex}
                          type="button"
                          onClick={() => setConfig({ ...config, color: preset.hex })}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center text-[10px] transition ${
                            config.color.toLowerCase() === preset.hex.toLowerCase()
                              ? 'border-white ring-2 ring-emerald-400 scale-110'
                              : 'border-slate-700 opacity-80 hover:opacity-100'
                          }`}
                          style={{ backgroundColor: preset.hex }}
                          title={preset.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Tolerância */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Tolerância:</span>
                      <span className="font-mono text-emerald-400 font-bold">{config.tolerance}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="100"
                      value={config.tolerance}
                      onChange={e =>
                        setConfig({ ...config, tolerance: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>

                  {/* Suavidade (Feather) */}
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Suavidade da Borda:</span>
                      <span className="font-mono text-emerald-400 font-bold">{config.smoothness}%</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={config.smoothness}
                      onChange={e =>
                        setConfig({ ...config, smoothness: parseInt(e.target.value, 10) })
                      }
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Bloco 2: Enquadramento & Proporção (Square 1:1 vs Original) */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-cyan-400" />
                  Modo de Enquadramento
                </label>
              </div>

              {/* Botões Segmentados de Modo: Square 1:1 vs Proporção Original */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-900 border border-slate-700/60 rounded-lg">
                <button
                  type="button"
                  onClick={() => setConfig({ ...config, cropSquare: true })}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    config.cropSquare ?? true
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  Quadrado (Square 1:1)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setConfig({ ...config, cropSquare: false, cropOffsetX: 0.5, cropOffsetY: 0.5 });
                    setScale(1.0);
                  }}
                  className={`py-1.5 px-2 rounded-md text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    !(config.cropSquare ?? true)
                      ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  Vídeo Completo (Original)
                </button>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-slate-700/40">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-slate-400">
                    {config.cropSquare ?? true
                      ? 'Enquadra em 1:1 para combate e marcadores. Use o Pan para posicionar a ação.'
                      : `Proporção nativa mantida (${videoDimensions.width > 0 ? `${videoDimensions.width}x${videoDimensions.height}` : 'Widescreen'}). Nenhuma lateral cortada.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, cropOffsetX: 0.5, cropOffsetY: 0.5 })}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 font-semibold underline shrink-0"
                  >
                    Centralizar (50%)
                  </button>
                </div>

                {/* Deslocamento Horizontal */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Posição Horizontal (Pan X):</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round((config.cropOffsetX ?? 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={config.cropOffsetX ?? 0.5}
                    onChange={e =>
                      setConfig({ ...config, cropOffsetX: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Deslocamento Vertical */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Posição Vertical (Pan Y - Ajustar Cabeça/Pés):</span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round((config.cropOffsetY ?? 0.5) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={config.cropOffsetY ?? 0.5}
                    onChange={e =>
                      setConfig({ ...config, cropOffsetY: parseFloat(e.target.value) })
                    }
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 3: Zoom da Ação no Vídeo, Velocidade & Espelhamento */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <ZoomIn className="w-4 h-4 text-purple-400" />
                  Zoom da Ação & Velocidade
                </label>
                <button
                  type="button"
                  onClick={() => setFlipH(!flipH)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition ${
                    flipH
                      ? 'bg-purple-500/20 border-purple-400 text-purple-300 ring-1 ring-purple-400'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                  title="Inverter horizontalmente (espelhar)"
                >
                  <FlipHorizontal className="w-3.5 h-3.5" />
                  Espelhar
                </button>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-slate-700/40">
                {/* Zoom / Escala do Vídeo */}
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <ZoomIn className="w-3 h-3 text-cyan-400" /> Zoom do Vídeo na Janela:
                    </span>
                    <span className="font-mono text-cyan-400 font-bold">
                      {Math.round(scale * 100)}% {scale === 1.0 ? '(Normal 1x)' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="3.0"
                    step="0.05"
                    value={scale}
                    onChange={(e) => setScale(parseFloat(e.target.value))}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  {/* Presets de Escala */}
                  <div className="flex items-center gap-1 pt-0.5">
                    {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((sc) => (
                      <button
                        key={sc}
                        type="button"
                        onClick={() => setScale(sc)}
                        className={`flex-1 py-0.5 rounded text-[10px] font-mono border transition ${
                          Math.abs(scale - sc) < 0.01
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {Math.round(sc * 100)}%
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 pt-1">
                    💡 Dica: Se a cabeça ou os pés estiverem cortando, diminua o zoom (ex: 75% ou 50%) e regule a Posição Vertical.
                  </p>
                </div>

                {/* Velocidade de Reprodução */}
                <div className="flex flex-col gap-2 pt-2 border-t border-slate-700/30">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Gauge className="w-3 h-3 text-purple-400" /> Velocidade de Reprodução:
                    </span>
                    <span className="font-mono text-purple-400 font-bold">
                      {videoSpeed.toFixed(2)}x {videoSpeed === 1.0 ? '(Normal)' : ''}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.25"
                    max="8.0"
                    step="0.05"
                    value={videoSpeed}
                    onChange={(e) => setVideoSpeed(parseFloat(e.target.value))}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  {/* Presets de Velocidade */}
                  <div className="flex items-center gap-1 pt-0.5">
                    {[0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 4.0].map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => setVideoSpeed(spd)}
                        className={`flex-1 py-0.5 rounded text-[10px] font-mono border transition ${
                          Math.abs(videoSpeed - spd) < 0.01
                            ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* Sincronização inteligente com a duração do ataque */}
                  {targetDurationSec && targetDurationSec > 0 && (
                    <div className="flex items-center justify-between p-2 rounded-lg bg-purple-950/40 border border-purple-500/30 text-xs mt-1">
                      <div className="flex flex-col">
                        <span className="text-purple-300 font-semibold flex items-center gap-1 text-[11px]">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Sincronizar com Tempo do Ataque
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Ataque: <strong>{targetDurationSec}s</strong> {videoDimensions.duration ? `• Vídeo: ${videoDimensions.duration.toFixed(1)}s` : ''}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const vidDur = videoDimensions.duration || 1.0;
                          const autoSpeed = Math.max(0.25, Math.min(10.0, Math.round((vidDur / targetDurationSec) * 10) / 10));
                          setVideoSpeed(autoSpeed);
                        }}
                        className="px-2.5 py-1 rounded bg-purple-500 hover:bg-purple-400 text-slate-950 text-[11px] font-bold shadow transition"
                      >
                        Ajustar ({videoDimensions.duration ? `${Math.round(((videoDimensions.duration || 1) / targetDurationSec) * 10) / 10}x` : 'Calcular'})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Bloco 4: Pivô do Marcador */}
            <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-amber-400" />
                  Pivô do Marcador (Ponto de Apoio)
                </label>
              </div>

              <div className="flex flex-col gap-3 pt-2 border-t border-slate-700/40">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Pivô X (Horizontal):</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round(pivotX * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={pivotX}
                    onChange={e => setPivotX(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-slate-400">Pivô Y (Vertical):</span>
                    <span className="font-mono text-amber-400 font-bold">
                      {Math.round(pivotY * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={pivotY}
                    onChange={e => setPivotY(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                {/* Presets Rápidos de Pivô */}
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPivotX(0.5);
                      setPivotY(0.5);
                    }}
                    className={`flex-1 py-1 px-2 rounded text-[11px] border transition ${
                      pivotX === 0.5 && pivotY === 0.5
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Centro (50%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPivotX(0.5);
                      setPivotY(1.0);
                    }}
                    className={`flex-1 py-1 px-2 rounded text-[11px] border transition ${
                      pivotX === 0.5 && pivotY === 1.0
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Pés/Base (100%)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPivotX(0.5);
                      setPivotY(0.0);
                    }}
                    className={`flex-1 py-1 px-2 rounded text-[11px] border transition ${
                      pivotX === 0.5 && pivotY === 0.0
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                        : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Topo (0%)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/80">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
