import React, { useRef, useState } from 'react';
import {
  Rocket,
  MapPin,
  Upload,
  Play,
  RotateCcw,
  Sparkles,
  Camera,
  CheckCircle2,
  X,
  Compass,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  Eye,
  Sliders,
  ChevronRight,
  User,
  Video,
  Film,
  Gauge,
  Palette,
  Trash2,
  Music,
  Volume2,
  Pause,
} from 'lucide-react';
import {
  MapMarker,
  PlayerConfig,
  GalleryAsset,
  SpawnConfig,
  SpawnEntryDirection,
  SpawnEffectType,
} from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import { AssetGalleryModal } from './AssetGalleryModal';
import {
  BUILT_IN_SPAWN_VEHICLES,
  DEFAULT_SPAWN_VEHICLE_PNG,
} from '../data/defaultSpawnVehicles';

interface Props {
  spawnConfig?: SpawnConfig;
  onUpdateSpawnConfig: (config: SpawnConfig) => void;
  markers: MapMarker[];
  player?: PlayerConfig;
  galleryAssets?: GalleryAsset[];
  galleryCategories?: string[];
  onTestSpawnAnimation?: () => void;
  onClose?: () => void;
  onFocusCoordinates?: (x: number, y: number) => void;
}

const SPAWN_PRESETS = [
  {
    name: '🦅 Águia Dourada dos Céus',
    direction: 'top' as SpawnEntryDirection,
    effect: 'jelly' as SpawnEffectType,
    speed: 1.5,
    landingPause: 0.85,
    effectIntensity: 0.7,
    description: 'Desce planando do céu majestosamente, entrega o herói no solo com elasticidade e decola de volta.',
    pngUrl: BUILT_IN_SPAWN_VEHICLES[0].pngUrl,
  },
  {
    name: '🛸 Nave / Cápsula Espacial',
    direction: 'top' as SpawnEntryDirection,
    effect: 'squash' as SpawnEffectType,
    speed: 1.2,
    landingPause: 0.7,
    effectIntensity: 0.85,
    description: 'Queda supersônica com impacto potente, luzes neon e ascensão vertical imediata aos céus.',
    pngUrl: BUILT_IN_SPAWN_VEHICLES[1].pngUrl,
  },
  {
    name: '⛵ Barco / Navio Explorador',
    direction: 'left' as SpawnEntryDirection,
    effect: 'float' as SpawnEffectType,
    speed: 2.0,
    landingPause: 0.9,
    effectIntensity: 0.5,
    description: 'Navega suavemente pela margem esquerda, atraca na posição e segue viagem velejando para a direita.',
    pngUrl: BUILT_IN_SPAWN_VEHICLES[2].pngUrl,
  },
  {
    name: '🎈 Balão Aerostático',
    direction: 'bottom' as SpawnEntryDirection,
    effect: 'float' as SpawnEffectType,
    speed: 2.2,
    landingPause: 1.0,
    effectIntensity: 0.4,
    description: 'Emerge do horizonte inferior flutuando delicadamente, toca o solo e retorna aos ares.',
    pngUrl: BUILT_IN_SPAWN_VEHICLES[3].pngUrl,
  },
  {
    name: '🐉 Dragão Celestial Esmeralda',
    direction: 'top' as SpawnEntryDirection,
    effect: 'jelly' as SpawnEffectType,
    speed: 1.6,
    landingPause: 0.85,
    effectIntensity: 0.75,
    description: 'Montaria mitológica alada que mergulha das alturas, pousa com estilo e ruge decolando.',
    pngUrl: BUILT_IN_SPAWN_VEHICLES[4].pngUrl,
  },
];

export const SpawnStudio: React.FC<Props> = ({
  spawnConfig,
  onUpdateSpawnConfig,
  markers,
  player,
  galleryAssets = [],
  galleryCategories = [],
  onTestSpawnAnimation,
  onClose,
  onFocusCoordinates,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [previewTesting, setPreviewTesting] = useState(false);
  const [isPlayingAudioPreview, setIsPlayingAudioPreview] = useState(false);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);

  const toggleAudioPreview = (url?: string) => {
    if (!url) return;
    if (isPlayingAudioPreview) {
      if (audioPreviewRef.current) {
        audioPreviewRef.current.pause();
        audioPreviewRef.current = null;
      }
      setIsPlayingAudioPreview(false);
    } else {
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingAudioPreview(false);
      audio.play().then(() => {
        audioPreviewRef.current = audio;
        setIsPlayingAudioPreview(true);
      }).catch(() => setIsPlayingAudioPreview(false));
    }
  };

  // Configuração ativa com fallbacks seguros
  const config: SpawnConfig = spawnConfig || {
    enabled: true,
    targetX: player?.x || 384,
    targetY: player?.y || 100,
    transportPng: DEFAULT_SPAWN_VEHICLE_PNG,
    transportName: 'Águia Dourada dos Céus',
    transportScale: 1.15,
    entryDirection: 'top',
    speed: 1.5,
    landingPause: 0.85,
    effect: 'jelly',
    effectIntensity: 0.25,
    effectSpeed: 1.2,
    cameraFraming: 'lower_half',
    hidePlayerDuringTransit: true,
    anchorMode: 'bottom',
    offsetY: 0,
    introVideoSpeed: 1.0,
    fadeColor: '#000000',
  };

  const update = (patch: Partial<SpawnConfig>) => {
    onUpdateSpawnConfig({ ...config, ...patch });
  };

  // Upload de PNG personalizado para o veículo de spawn
  const handleUploadPng = async (file: File) => {
    try {
      const res = await readUploadedImage(file);
      update({
        transportPng: res.dataUrl,
        transportName: file.name.replace(/\.[^/.]+$/, ''),
        enabled: true,
      });
    } catch (err) {
      console.error('Erro ao carregar PNG do transporte:', err);
    }
  };

  // Trajetória de saída calculada conforme a direção de entrada solicitada
  const getExitDescription = (dir: SpawnEntryDirection) => {
    switch (dir) {
      case 'top':
        return { label: 'Volta para cima ⬆️', desc: 'Decola de volta na mesma rota do céu' };
      case 'bottom':
        return { label: 'Volta para baixo ⬇️', desc: 'Retorna para o abismo/ponto inferior' };
      case 'left':
        return { label: 'Sai pela direita ➡️', desc: 'Atravessa a tela seguindo viagem' };
      case 'right':
        return { label: 'Sai pela esquerda ⬅️', desc: 'Atravessa a tela saindo pela esquerda' };
    }
  };

  const exitInfo = getExitDescription(config.entryDirection);

  const handleTriggerTest = () => {
    setPreviewTesting(true);
    if (onTestSpawnAnimation) {
      onTestSpawnAnimation();
    }
    setTimeout(() => {
      setPreviewTesting(false);
    }, (config.speed * 2 + config.landingPause + 1) * 1000);
  };

  return (
    <div className="w-[380px] 2xl:w-[440px] h-full bg-slate-950 border-r border-slate-800 flex flex-col select-none text-slate-200">
      {/* Header do Estúdio de Spawn */}
      <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-md">
            <Rocket className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5 uppercase tracking-wide">
              <span>Spawn Studio</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Cinemático
              </span>
            </h3>
            <p className="text-[10px] text-slate-400">
              Chegada por veículo, criatura ou transporte com pouso físico
            </p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Conteúdo rolável com scroll suave */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Card Master: Ativar/Desativar Sistema de Spawn */}
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>🛸</span>
                <span>Ativar Animação de Spawn na Fase</span>
              </span>
              <span className="text-[10px] text-slate-400">
                {config.enabled
                  ? 'Ativo: a fase inicia com a cena do transporte entregando o herói'
                  : 'Desativado: o herói surge estático na posição inicial'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => update({ enabled: !config.enabled })}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                config.enabled
                  ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 ring-1 ring-amber-400'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {config.enabled ? '🟢 Ativado' : '⚪ Desativado'}
            </button>
          </div>
        </div>

        {/* 1. SELEÇÃO DO ALVO (Ponto de Pouso) */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span>1. Alvo do Spawn (Ponto de Pouso)</span>
            </span>
            {onFocusCoordinates && (
              <button
                type="button"
                onClick={() => onFocusCoordinates(config.targetX || 384, config.targetY || 100)}
                className="text-[9px] text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>Ver no Mapa</span>
              </button>
            )}
          </div>

          {/* Escolha entre Marcador existente ou Coordenadas */}
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 block">
              Vincular a um Marcador existente (Opcional):
            </label>
            <select
              value={config.targetMarkerId || ''}
              onChange={(e) => {
                const markerId = e.target.value || undefined;
                if (markerId) {
                  const targetM = markers.find((m) => m.id === markerId);
                  if (targetM) {
                    update({
                      targetMarkerId: markerId,
                      targetX: Math.round(targetM.x),
                      targetY: Math.round(targetM.y),
                    });
                    return;
                  }
                }
                update({ targetMarkerId: undefined });
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-semibold"
            >
              <option value="">(Usar coordenadas manuais X/Y)</option>
              {markers.map((m) => (
                <option key={m.id} value={m.id}>
                  📍 {m.name} ({Math.round(m.x)}, {Math.round(m.y)})
                </option>
              ))}
            </select>
          </div>

          {/* Coordenadas X e Y */}
          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span>Alvo X:</span>
                <span className="font-mono text-amber-300 font-bold">{Math.round(config.targetX || 384)}px</span>
              </div>
              <input
                type="number"
                value={Math.round(config.targetX || 384)}
                onChange={(e) => update({ targetX: Number(e.target.value), targetMarkerId: undefined })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center font-mono"
              />
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span>Alvo Y:</span>
                <span className="font-mono text-amber-300 font-bold">{Math.round(config.targetY || 100)}px</span>
              </div>
              <input
                type="number"
                value={Math.round(config.targetY || 100)}
                onChange={(e) => update({ targetY: Number(e.target.value), targetMarkerId: undefined })}
                className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-xs text-white text-center font-mono"
              />
            </div>
          </div>

          {/* Botão de atalho: Posição do Herói */}
          {player && (
            <button
              type="button"
              onClick={() => {
                update({
                  targetX: Math.round(player.x),
                  targetY: Math.round(player.y),
                  targetMarkerId: undefined,
                });
              }}
              className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-[10px] font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <User className="w-3 h-3 text-blue-400" />
              <span>Usar Posição Inicial do Herói ({Math.round(player.x)}, {Math.round(player.y)})</span>
            </button>
          )}
        </div>

        {/* 2. ASSET PNG DE TRANSPORTE (Veículo / Criatura) */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <span>🦅</span>
              <span>2. PNG de Transporte (Veículo / Montaria)</span>
            </span>
            {config.transportPng && (
              <button
                type="button"
                onClick={() => update({ transportPng: undefined, transportName: undefined })}
                className="text-[9px] text-red-400 hover:text-red-300 hover:underline cursor-pointer"
              >
                Remover
              </button>
            )}
          </div>

          {/* Preview do PNG ou Dropzone */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="w-16 h-16 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative group">
              {config.transportPng ? (
                <img
                  src={config.transportPng}
                  alt={config.transportName || 'Transporte'}
                  className="w-full h-full object-contain filter drop-shadow-md transition-transform group-hover:scale-110"
                />
              ) : (
                <span className="text-2xl text-slate-600">🛸</span>
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <span className="text-xs font-bold text-slate-200 block truncate">
                {config.transportName || 'Nenhum PNG selecionado'}
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadPng(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-amber-400" />
                  <span>Upload PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsGalleryOpen(true)}
                  className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <span>🖼️ Galeria</span>
                </button>
              </div>
            </div>
          </div>

          {/* Seletor Rápido de Veículos Embutidos Ilustrados */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-slate-400 font-bold block">
              Modelos Prontos de Transporte (Clique para Escolher):
            </span>
            <div className="grid grid-cols-5 gap-1.5">
              {BUILT_IN_SPAWN_VEHICLES.map((v) => {
                const isSelected = config.transportPng === v.pngUrl;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      update({
                        transportPng: v.pngUrl,
                        transportName: v.name,
                        entryDirection: v.defaultDirection,
                        effect: v.defaultEffect,
                        speed: v.defaultSpeed,
                        landingPause: v.defaultPause,
                        enabled: true,
                      });
                    }}
                    className={`flex flex-col items-center p-1.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-amber-400 bg-amber-500/20 shadow-md ring-1 ring-amber-400/50 scale-105'
                        : 'border-slate-800 bg-slate-950 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                    title={`${v.name}: ${v.description}`}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                      <img src={v.pngUrl} alt={v.name} className="w-full h-full object-contain filter drop-shadow" />
                    </div>
                    <span className="text-[8px] text-slate-300 font-bold truncate max-w-full mt-1">
                      {v.name.split(' ')[1] || v.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Escala do Transporte com Slider Expandido até 600% + Input Direto + Atalhos */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span className="font-bold flex items-center gap-1 text-slate-200">
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>Tamanho do Transporte (PNG):</span>
              </span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={20}
                  max={800}
                  step={10}
                  value={Math.round((config.transportScale || 1.35) * 100)}
                  onChange={(e) => {
                    const val = Math.max(20, Math.min(800, Number(e.target.value) || 100));
                    update({ transportScale: parseFloat((val / 100).toFixed(2)) });
                  }}
                  className="w-16 bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-amber-300 font-mono font-bold text-center"
                />
                <span className="text-[10px] font-mono text-slate-400">%</span>
              </div>
            </div>

            <input
              type="range"
              min={0.4}
              max={6.0}
              step={0.1}
              value={config.transportScale || 1.35}
              onChange={(e) => update({ transportScale: parseFloat(e.target.value) })}
              className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-800 rounded-lg"
            />

            {/* Presets de tamanho com 1 clique */}
            <div className="grid grid-cols-5 gap-1 pt-0.5">
              {[
                { label: '80%', scale: 0.8, name: 'Pequeno' },
                { label: '140%', scale: 1.4, name: 'Normal' },
                { label: '250%', scale: 2.5, name: 'Grande' },
                { label: '400%', scale: 4.0, name: 'Gigante' },
                { label: '600%', scale: 6.0, name: 'Titânico' },
              ].map((p) => {
                const isCur = Math.abs((config.transportScale || 1.35) - p.scale) < 0.15;
                return (
                  <button
                    key={p.scale}
                    type="button"
                    onClick={() => update({ transportScale: p.scale })}
                    className={`py-1 rounded text-[9px] font-bold transition-all cursor-pointer border ${
                      isCur
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-sm'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>

            {/* Espelhamento Horizontal (Inverter Direção do Veículo) */}
            <div className="flex items-center justify-between pt-1.5">
              <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                <span>↔️</span>
                <span>Espelhar PNG (Inverter Direção):</span>
              </span>
              <button
                type="button"
                onClick={() => update({ flipHorizontal: !config.flipHorizontal })}
                className={`px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  config.flipHorizontal
                    ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                <span>{config.flipHorizontal ? 'Invertido (scaleX -1)' : 'Direção Padrão'}</span>
              </button>
            </div>
          </div>

          {/* Ancoragem e Ajuste da Base do PNG (Apoio no Solo vs Centro vs Flutuando) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] text-slate-300">
              <span className="font-bold flex items-center gap-1 text-slate-200">
                <span>⚓</span>
                <span>Ponto de Apoio / Base do PNG:</span>
              </span>
              <span className="font-mono text-amber-300 font-bold text-[10px]">
                {config.anchorMode === 'center'
                  ? 'Centro'
                  : config.anchorMode === 'hover'
                  ? 'Pairando'
                  : 'Base no Solo (Padrão)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'bottom' as const, label: '🦶 Base no Solo', desc: 'A parte inferior do PNG encosta no chão' },
                { id: 'hover' as const, label: '🛸 Pairar Acima', desc: 'Flutua logo acima da cabeça do herói' },
                { id: 'center' as const, label: '🎯 Centro', desc: 'Centralizado no ponto alvo' },
              ].map((anc) => (
                <button
                  key={anc.id}
                  type="button"
                  onClick={() => update({ anchorMode: anc.id })}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    (config.anchorMode || 'bottom') === anc.id
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                  title={anc.desc}
                >
                  <div className="text-[10px] font-bold">{anc.label}</div>
                </button>
              ))}
            </div>

            {/* Ajuste fino vertical de altura (Offset Y) */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span>Ajuste Fino de Altura (Offset Y):</span>
                <div className="flex items-center gap-1.5 font-mono text-amber-300 font-bold">
                  <span>{(config.offsetY || 0) > 0 ? `+${config.offsetY || 0}` : `${config.offsetY || 0}`}px</span>
                  {(config.offsetY || 0) !== 0 && (
                    <button
                      type="button"
                      onClick={() => update({ offsetY: 0 })}
                      className="text-[9px] text-slate-400 hover:text-white underline cursor-pointer"
                    >
                      (Zerar)
                    </button>
                  )}
                </div>
              </div>
              <input
                type="range"
                min={-100}
                max={100}
                step={2}
                value={config.offsetY || 0}
                onChange={(e) => update({ offsetY: parseInt(e.target.value, 10) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[8px] text-slate-500">
                <span>-100px (Mais Alto)</span>
                <span>0px (Alinhado)</span>
                <span>+100px (Mais Baixo)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. DIREÇÃO DE ENTRADA & SAÍDA INTELIGENTE */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>3. Direção de Entrada & Saída</span>
          </span>

          {/* 4 botões de direção */}
          <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
            {[
              { id: 'top' as SpawnEntryDirection, label: 'De Cima', icon: <ArrowDown className="w-4 h-4 text-sky-400" /> },
              { id: 'bottom' as SpawnEntryDirection, label: 'De Baixo', icon: <ArrowUp className="w-4 h-4 text-emerald-400" /> },
              { id: 'left' as SpawnEntryDirection, label: 'Da Esquerda', icon: <ArrowRight className="w-4 h-4 text-amber-400" /> },
              { id: 'right' as SpawnEntryDirection, label: 'Da Direita', icon: <ArrowLeft className="w-4 h-4 text-purple-400" /> },
            ].map((dir) => {
              const active = config.entryDirection === dir.id;
              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => update({ entryDirection: dir.id })}
                  className={`p-2 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                    active
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-black shadow-sm ring-1 ring-amber-400/40'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  {dir.icon}
                  <span className="text-[10px]">{dir.label}</span>
                </button>
              );
            })}
          </div>

          {/* Diagrama da Trajetória de Saída Automática */}
          <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[10px] space-y-1">
            <div className="flex items-center justify-between text-slate-300 font-bold">
              <span>Trajetória da Saída:</span>
              <span className="text-amber-300 font-mono">{exitInfo.label}</span>
            </div>
            <p className="text-slate-400 text-[9px] leading-relaxed">
              {exitInfo.desc}
            </p>
          </div>

          {/* Destaque para Modos Laterais (Deslizamento sem diminuição de tamanho) */}
          {(config.entryDirection === 'left' || config.entryDirection === 'right') && (
            <div className="p-2.5 bg-gradient-to-r from-amber-500/15 to-transparent border border-amber-500/30 rounded-xl text-[10px] text-amber-200 flex items-start gap-2">
              <span className="text-base shrink-0 mt-0.5">🚀</span>
              <div className="space-y-0.5">
                <span className="font-extrabold text-amber-300 block">
                  Modo de Spawn Lateral (Deslizante Ativo):
                </span>
                <p className="text-slate-300 text-[9px] leading-relaxed">
                  O veículo chega <strong>deslizando suavemente</strong> pela lateral da tela e sai pelo lado oposto, com a <strong>escala e tamanho 100% preservados</strong> (sem diminuição de tamanho ou squash).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 4. EFEITOS E ANIMAÇÕES (Gelatina, Pouso, Físicas) */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>4. Efeitos e Animações no Pouso</span>
          </span>

          {/* Seletor de Efeito */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 block font-bold">
              Efeito Aplicado ao Veículo / Pouso:
            </label>
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              {[
                { id: 'jelly' as SpawnEffectType, label: '🍮 Gelatina', desc: 'Passo elástico orgânico' },
                { id: 'squash' as SpawnEffectType, label: '💥 Squash', desc: 'Impacto forte no chão' },
                { id: 'float' as SpawnEffectType, label: '🕊️ Flutuar', desc: 'Desaceleração suave' },
                { id: 'shake' as SpawnEffectType, label: '⚡ Tremor', desc: 'Vibração de pouso' },
                { id: 'glow' as SpawnEffectType, label: '✨ Brilho', desc: 'Pulso de luz mágica' },
                { id: 'none' as SpawnEffectType, label: '⚪ Nenhum', desc: 'Movimento linear clássico' },
              ].map((ef) => (
                <button
                  key={ef.id}
                  type="button"
                  onClick={() => update({ effect: ef.id })}
                  className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                    config.effect === ef.id
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-sm'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="font-bold">{ef.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Sliders: Velocidade do Voo, Tempo de Pouso e Intensidade */}
          <div className="space-y-2 pt-1 border-t border-slate-800/80">
            {/* Velocidade de Voo */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span>Duração do Voo até o Alvo:</span>
                <span className="font-mono text-amber-300 font-bold">{config.speed.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0.5}
                max={4.0}
                step={0.1}
                value={config.speed}
                onChange={(e) => update({ speed: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
              <div className="flex justify-between text-[8px] text-slate-500">
                <span>0.5s (Rápido)</span>
                <span>1.5s (Padrão)</span>
                <span>4.0s (Cinemático Lento)</span>
              </div>
            </div>

            {/* Tempo de Pouso / Pausa para o herói desembarcar */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-300">
                <span>Tempo de Pouso (Desembarque):</span>
                <span className="font-mono text-amber-300 font-bold">{config.landingPause.toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min={0.2}
                max={3.0}
                step={0.1}
                value={config.landingPause}
                onChange={(e) => update({ landingPause: parseFloat(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* Intensidade do Efeito de Pouso Suave */}
            {config.effect !== 'none' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>Amortecimento / Elasticidade (Sutil):</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {Math.round(config.effectIntensity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.8}
                  step={0.05}
                  value={config.effectIntensity}
                  onChange={(e) => update({ effectIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="grid grid-cols-3 gap-1 pt-0.5">
                  {[
                    { label: 'Suave (15%)', val: 0.15 },
                    { label: 'Natural (25%)', val: 0.25 },
                    { label: 'Médio (45%)', val: 0.45 },
                  ].map((it) => (
                    <button
                      key={it.val}
                      type="button"
                      onClick={() => update({ effectIntensity: it.val })}
                      className={`py-1 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                        Math.abs(config.effectIntensity - it.val) < 0.06
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/60'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {it.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. ENQUADRAMENTO DA CÂMERA */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2">
          <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-amber-400" />
            <span>5. Enquadramento da Câmera</span>
          </span>

          <label className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer text-xs">
            <div>
              <span className="font-bold text-slate-200 block">Alvo na metade inferior da tela</span>
              <span className="text-[10px] text-slate-400">
                Posiciona o spawn abaixo para revelar o cenário à frente
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.cameraFraming === 'lower_half'}
              onChange={(e) => update({ cameraFraming: e.target.checked ? 'lower_half' : 'center' })}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer text-xs">
            <div>
              <span className="font-bold text-slate-200 block">Ocultar herói durante o trânsito</span>
              <span className="text-[10px] text-slate-400">
                O herói surge na tela somente após o pouso do veículo
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.hidePlayerDuringTransit !== false}
              onChange={(e) => update({ hidePlayerDuringTransit: e.target.checked })}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between gap-2 p-2 bg-slate-950 rounded-lg border border-slate-800 cursor-pointer text-xs">
            <div>
              <span className="font-bold text-slate-200 block">🎬 Transição Cinematográfica com Desvanecer</span>
              <span className="text-[10px] text-slate-400">
                Executa a abertura cinematográfica suave antes da entrada do transporte
              </span>
            </div>
            <input
              type="checkbox"
              checked={config.fadeTransition !== false}
              onChange={(e) => update({ fadeTransition: e.target.checked })}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
            />
          </label>
        </div>

        {/* 5. VÍDEO DE INTRODUÇÃO & TRANSIÇÃO DE ABERTURA */}
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
              <Film className="w-3.5 h-3.5 text-amber-400" />
              <span>5. Vídeo de Abertura & Desvanecer</span>
            </span>
            {config.introVideoUrl && (
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                Vídeo Configurado
              </span>
            )}
          </div>

          {/* Upload de Mídia Local (Vídeo) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                <Video className="w-3 h-3 text-sky-400" />
                <span>Vídeo Local de Introdução (Cutscene):</span>
              </label>
              {config.introVideoUrl && (
                <button
                  type="button"
                  onClick={() => update({ introVideoUrl: undefined })}
                  className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-0.5 cursor-pointer font-bold"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>Remover Vídeo</span>
                </button>
              )}
            </div>

            {config.introVideoUrl ? (
              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 space-y-2">
                <div className="relative rounded overflow-hidden aspect-video bg-black flex items-center justify-center border border-slate-800/80 max-h-36">
                  <video
                    src={config.introVideoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-slate-400">Trocar arquivo local:</span>
                  <button
                    type="button"
                    onClick={() => videoInputRef.current?.click()}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded text-[10px] text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Upload className="w-3 h-3" />
                    <span>Substituir Vídeo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => videoInputRef.current?.click()}
                className="p-3 bg-slate-950/80 border border-dashed border-slate-700 hover:border-amber-400/60 rounded-xl text-center cursor-pointer transition-all group"
              >
                <Video className="w-6 h-6 text-slate-500 group-hover:text-amber-400 mx-auto mb-1 transition-colors" />
                <span className="text-xs font-bold text-slate-300 group-hover:text-amber-200 block">
                  Escolher Vídeo Local (.mp4, .webm)
                </span>
                <span className="text-[9px] text-slate-500">
                  Reproduz em tela cheia na abertura da fase antes do spawn
                </span>
              </div>
            )}

            <input
              ref={videoInputRef}
              type="file"
              accept="video/mp4,video/webm,video/ogg,video/quicktime"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size <= 15 * 1024 * 1024) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    update({ introVideoUrl: reader.result as string });
                  };
                  reader.readAsDataURL(file);
                } else {
                  const url = URL.createObjectURL(file);
                  update({ introVideoUrl: url });
                }
              }}
            />
          </div>

          {/* Controle de Velocidade do Vídeo (Acelerar ou Diminuir) */}
          {config.introVideoUrl && (
            <div className="space-y-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-300 font-bold flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-amber-400" />
                  <span>Velocidade de Reprodução do Vídeo:</span>
                </span>
                <span className="font-mono text-amber-300 font-bold">
                  {(config.introVideoSpeed || 1.0).toFixed(2)}x
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[0.5, 0.75, 1.0, 1.25, 1.5, 2.0].map((spd) => {
                  const active = Math.abs((config.introVideoSpeed || 1.0) - spd) < 0.01;
                  return (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => update({ introVideoSpeed: spd })}
                      className={`py-1 px-1 rounded text-[10px] font-bold border transition-colors cursor-pointer text-center ${
                        active
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-sm'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {spd}x
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Seletor de Áudio MP3 Opcional */}
          <div className="space-y-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
                <Music className="w-3 h-3 text-pink-400" />
                <span>Áudio MP3 Opcional (Trilha / Efeito):</span>
              </span>
              {config.introAudioUrl && (
                <button
                  type="button"
                  onClick={() => {
                    if (audioPreviewRef.current) {
                      audioPreviewRef.current.pause();
                      audioPreviewRef.current = null;
                    }
                    setIsPlayingAudioPreview(false);
                    update({ introAudioUrl: undefined, introAudioName: undefined });
                  }}
                  className="text-[9px] text-red-400 hover:text-red-300 flex items-center gap-0.5 cursor-pointer font-bold"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                  <span>Remover Áudio</span>
                </button>
              )}
            </div>

            {config.introAudioUrl ? (
              <div className="flex items-center justify-between gap-2 p-1.5 bg-slate-900 rounded border border-slate-800">
                <div className="flex items-center gap-1.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => toggleAudioPreview(config.introAudioUrl)}
                    className="p-1 rounded bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 border border-pink-500/40 cursor-pointer"
                    title={isPlayingAudioPreview ? 'Pausar Áudio' : 'Ouvir Prévia'}
                  >
                    {isPlayingAudioPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  </button>
                  <span className="text-[10px] text-slate-200 truncate font-mono">
                    {config.introAudioName || 'Áudio Customizado.mp3'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  className="px-2 py-0.5 bg-slate-800 hover:bg-slate-750 text-slate-300 text-[9px] rounded border border-slate-700 font-bold cursor-pointer shrink-0"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <div
                onClick={() => audioInputRef.current?.click()}
                className="p-2 bg-slate-900/60 border border-dashed border-slate-700 hover:border-pink-400/60 rounded-lg text-center cursor-pointer transition-colors group"
              >
                <div className="flex items-center justify-center gap-1.5 text-slate-400 group-hover:text-pink-300">
                  <Music className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Escolher Áudio MP3 / WAV</span>
                </div>
                <span className="text-[8px] text-slate-500 block">
                  O vídeo toca sem som; o áudio toca em sincronia durante a cutscene
                </span>
              </div>
            )}

            <input
              ref={audioInputRef}
              type="file"
              accept="audio/mp3,audio/mpeg,audio/wav,audio/ogg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const name = file.name;
                if (file.size <= 12 * 1024 * 1024) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    update({ introAudioUrl: reader.result as string, introAudioName: name });
                  };
                  reader.readAsDataURL(file);
                } else {
                  const url = URL.createObjectURL(file);
                  update({ introAudioUrl: url, introAudioName: name });
                }
              }}
            />
          </div>

          {/* Parâmetro de Cor do Desvanecer (Fade Color) */}
          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-slate-300 font-bold flex items-center gap-1">
                <Palette className="w-3 h-3 text-purple-400" />
                <span>Cor do Desvanecer:</span>
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-3.5 h-3.5 rounded-full border border-slate-600 shadow-inner"
                  style={{ backgroundColor: config.fadeColor || '#000000' }}
                />
                <span className="font-mono text-slate-300 font-bold text-[10px]">
                  {config.fadeColor || '#000000'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.fadeColor || '#000000'}
                onChange={(e) => update({ fadeColor: e.target.value })}
                className="w-9 h-8 bg-transparent border-0 cursor-pointer rounded overflow-hidden"
              />
              <div className="flex-1 grid grid-cols-3 gap-1">
                {[
                  { label: 'Preto', color: '#000000' },
                  { label: 'Branco Suave', color: '#f1f5f9' },
                  { label: 'Branco Puro', color: '#ffffff' },
                  { label: 'Cósmico', color: '#0f172a' },
                  { label: 'Ouro', color: '#451a03' },
                  { label: 'Floresta', color: '#064e3b' },
                ].map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => update({ fadeColor: c.color })}
                    className={`py-1 rounded text-[9px] font-bold border truncate cursor-pointer transition-colors ${
                      (config.fadeColor || '#000000') === c.color
                        ? 'border-amber-400 bg-amber-500/20 text-amber-200'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <p className="text-[9px] text-slate-400 leading-relaxed bg-slate-950/60 p-2 rounded-lg border border-slate-800/60">
              💡 <strong>Transição Cinematográfica:</strong> O desvanecer sobrepõe o <strong>último 1 segundo do vídeo</strong> com curva suave e sem flash agressivo, mantém a tela preenchida por <strong>1,5 segundo</strong> e então dissolve suavemente revelando o mapa.
            </p>
          </div>
        </div>

        {/* PRESETS RÁPIDOS PRÉ-CONFIGURADOS */}
        <div className="p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl space-y-2">
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide block">
            Modelos Prontos de Spawn:
          </span>
          <div className="grid grid-cols-2 gap-1.5">
            {SPAWN_PRESETS.map((pr, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  update({
                    entryDirection: pr.direction,
                    effect: pr.effect,
                    speed: pr.speed,
                    landingPause: pr.landingPause,
                    effectIntensity: pr.effectIntensity,
                    transportPng: pr.pngUrl,
                    transportName: pr.name,
                    enabled: true,
                  });
                }}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-400/50 text-left transition-colors cursor-pointer group"
              >
                <div className="text-[11px] font-bold text-slate-200 group-hover:text-amber-300">
                  {pr.name}
                </div>
                <div className="text-[9px] text-slate-500 line-clamp-1 mt-0.5">
                  {pr.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer com Botão de Testar Spawn em Tempo Real */}
      <div className="p-3 border-t border-slate-800 bg-slate-950 shrink-0">
        <button
          type="button"
          onClick={handleTriggerTest}
          disabled={previewTesting}
          className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
            previewTesting
              ? 'bg-amber-500/50 text-slate-950 cursor-wait'
              : 'bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shadow-md active:scale-98'
          }`}
        >
          <Play className="w-4 h-4 fill-current" />
          <span>{previewTesting ? 'Executando Animação...' : '▶️ Testar Animação de Spawn'}</span>
        </button>
      </div>

      {/* Modal da Galeria de Assets */}
      <AssetGalleryModal
        isOpen={isGalleryOpen}
        onClose={() => setIsGalleryOpen(false)}
        galleryAssets={galleryAssets}
        categories={galleryCategories}
        onSelectAsset={(dataUrl, assetName) => {
          if (dataUrl) {
            update({
              transportPng: dataUrl,
              transportName: assetName || 'Asset da Galeria',
              enabled: true,
            });
          }
          setIsGalleryOpen(false);
        }}
        title="Escolher PNG do Transporte de Spawn"
      />
    </div>
  );
};
