import React from 'react';
import type { MapProject } from '../../types/map';
import type {
  TerrainPenConfig,
  TerrainPenMode,
  GrassBladePreset,
  FlowerPreset,
} from '../../types/terrainPen';
import {
  DEFAULT_TERRAIN_PEN_CONFIG,
  createDefaultGrassAssets,
} from '../../types/terrainPen';
import {
  generateGrassSpritePNG,
  generateFlowerSpritePNG,
  generateWaterPatchPNG,
  generateTerrainNoisePNG,
  FlowerStyle,
} from '../../utils/terrainTextures';
import {
  PenTool,
  Layers,
  Sparkles,
  Eraser,
} from 'lucide-react';
import { GRASS_PRESETS, FLOWER_PRESETS } from './constants';
import { GrassModePanel } from './GrassModePanel';
import { WaterModePanel } from './WaterModePanel';
import { FlowersModePanel } from './FlowersModePanel';
import { NoiseGroundModePanel } from './NoiseGroundModePanel';
import { EraserModePanel } from './EraserModePanel';

interface Props {
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  activeTool?: string;
  setActiveTool?: (tool: any) => void;
  onOpenLayers?: () => void;
}

export const TerrainPenStudio: React.FC<Props> = ({
  project,
  onUpdateProject,
  activeTool,
  setActiveTool,
  onOpenLayers,
}) => {
  const rawLayers =
    project.markerLayers && project.markerLayers.length > 0
      ? project.markerLayers
      : [
          { id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0, color: '#3b82f6' },
        ];
  const layers = [...rawLayers]
    .filter((l) => !l.isGroup)
    .sort((a, b) => (b.order ?? 0) - (a.order ?? 0));
  const activeLayerId =
    project.activeMarkerLayerId && layers.some((l) => l.id === project.activeMarkerLayerId)
      ? project.activeMarkerLayerId
      : layers[0]?.id || 'layer-default';

  // Configuração atual ou inicial padrão
  const config: TerrainPenConfig = project.terrainPenConfig || {
    ...DEFAULT_TERRAIN_PEN_CONFIG,
    targetLayerId: activeLayerId,
    assets: createDefaultGrassAssets(generateGrassSpritePNG('cluster')),
  };

  const isPenActive = activeTool === 'terrain_pen';

  const updateConfig = (updates: Partial<TerrainPenConfig>) => {
    onUpdateProject({
      terrainPenConfig: {
        ...config,
        ...updates,
      },
    });
  };

  // Alternância inteligente de modo com inicialização automática dos assets
  const switchMode = (newMode: TerrainPenMode) => {
    if (newMode === 'eraser') {
      updateConfig({ mode: 'eraser' });
      return;
    }
    let assets = config.assets || [];
    if (newMode === 'water') {
      const hasWater = assets.some((a) => a.id.startsWith('water_'));
      if (!hasWater) {
        assets = [
          {
            id: 'water_cristalina',
            name: 'Água Cristalina Padrão',
            dataUrl: generateWaterPatchPNG(64, '#0284c7', 1.5, 0.92),
            scale: 1.0,
            weight: 100,
            enabled: true,
          },
        ];
      }
    } else if (newMode === 'flowers') {
      const hasFlowers = assets.some((a) => a.id.startsWith('flower_'));
      if (!hasFlowers) {
        assets = [
          {
            id: 'flower_daisy',
            name: 'Margarida Padrão',
            dataUrl: generateFlowerSpritePNG('daisy'),
            scale: 1.0,
            weight: 100,
            enabled: true,
          },
        ];
      }
    } else if (newMode === 'noise') {
      const hasNoise = assets.some((a) => a.id.startsWith('noise_'));
      if (!hasNoise) {
        assets = [
          {
            id: 'noise_esmeralda',
            name: 'Chão Esmeralda Padrão',
            dataUrl: generateTerrainNoisePNG('#16a34a', 128, 0.28, 0.045, 42),
            scale: 1.0,
            weight: 100,
            enabled: true,
          },
        ];
      }
    } else if (newMode === 'grass') {
      const hasGrass = assets.some((a) => a.id.startsWith('grass_'));
      if (!hasGrass) {
        assets = [
          {
            id: 'grass_cluster',
            name: 'Tufo Denso Padrão',
            dataUrl: generateGrassSpritePNG('cluster'),
            scale: 1.0,
            weight: 100,
            enabled: true,
          },
        ];
      }
    }

    updateConfig({ mode: newMode, assets });
  };

  // Upload de PNG customizado
  const handleUploadCustomSprite = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newAsset = {
          id: `custom_${config.mode}_${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl,
          scale: 1.0,
          weight: 70,
          enabled: true,
        };
        updateConfig({
          assets: [...(config.assets || []), newAsset],
        });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectGrassPreset = (preset: GrassBladePreset) => {
    const pngUrl = generateGrassSpritePNG(preset);
    const existing = config.assets || [];
    const hasPreset = existing.some((a) => a.id === `grass_${preset}`);
    let updatedAssets = existing;
    if (!hasPreset) {
      updatedAssets = [
        ...existing,
        {
          id: `grass_${preset}`,
          name: GRASS_PRESETS.find((p) => p.id === preset)?.label || preset,
          dataUrl: pngUrl,
          scale: 1.0,
          weight: 70,
          enabled: true,
        },
      ];
    }
    updateConfig({
      activePreset: preset,
      assets: updatedAssets,
    });
  };

  const handleUploadWaterTexture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateConfig({
          waterTexturePng: dataUrl,
          waterTextureScale: config.waterTextureScale ?? 1.0,
          waterFlowSpeed: config.waterFlowSpeed ?? 1.0,
          waterFlowAngle: config.waterFlowAngle ?? 45,
          waterTextureOpacity: config.waterTextureOpacity ?? 0.85,
        });

        if (project.motionOverlays && project.motionOverlays.length > 0) {
          const updatedOverlays = project.motionOverlays.map((ov) => {
            if (ov.effect === 'water') {
              return {
                ...ov,
                waterTexturePng: dataUrl,
                textureScale: config.waterTextureScale ?? 1.0,
                flowSpeed: config.waterFlowSpeed ?? 1.0,
                flowAngle: config.waterFlowAngle ?? 45,
                textureOpacity: config.waterTextureOpacity ?? 0.85,
                waterWaveEcho: config.waterWaveEcho ?? true,
                waterWaveDeform: config.waterWaveDeform ?? 0.25,
              };
            }
            return ov;
          });
          onUpdateProject?.({ motionOverlays: updatedOverlays });
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSelectFlowerPreset = (preset: FlowerPreset) => {
    const pngUrl = generateFlowerSpritePNG(preset as FlowerStyle);
    const existing = config.assets || [];
    const hasPreset = existing.some((a) => a.id === `flower_${preset}`);
    let updatedAssets = existing;
    if (!hasPreset) {
      updatedAssets = [
        ...existing,
        {
          id: `flower_${preset}`,
          name: FLOWER_PRESETS.find((p) => p.id === preset)?.label || preset,
          dataUrl: pngUrl,
          scale: 1.0,
          weight: 70,
          enabled: true,
        },
      ];
    }
    updateConfig({
      flowerPreset: preset,
      assets: updatedAssets,
    });
  };

  return (
    <div className="space-y-4 animate-fade-in text-slate-100">
      {/* 1. SELETOR DE MODOS DE TERRENO (TOPO) */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs pb-1">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Modo do Pincel de Terreno:</span>
          </span>
          <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            {config.mode === 'grass' && '🌱 Grama Viva'}
            {config.mode === 'water' && '🌊 Água Reativa'}
            {config.mode === 'flowers' && '🌸 Flores'}
            {config.mode === 'noise' && '🎨 Textura Solo'}
            {config.mode === 'eraser' && '🧹 Borracha'}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {/* MODO GRAMA */}
          <button
            type="button"
            onClick={() => switchMode('grass')}
            className={`p-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              config.mode === 'grass'
                ? 'bg-gradient-to-b from-emerald-500/30 to-emerald-600/40 border-emerald-400 text-emerald-200 shadow-md ring-1 ring-emerald-400/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="text-base">🌱</span>
            <span className="text-[9px] leading-tight">Grama</span>
          </button>

          {/* MODO ÁGUA */}
          <button
            type="button"
            onClick={() => switchMode('water')}
            className={`p-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              config.mode === 'water'
                ? 'bg-gradient-to-b from-cyan-500/30 to-cyan-600/40 border-cyan-400 text-cyan-200 shadow-md ring-1 ring-cyan-400/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="text-base">🌊</span>
            <span className="text-[9px] leading-tight">Água</span>
          </button>

          {/* MODO FLORES */}
          <button
            type="button"
            onClick={() => switchMode('flowers')}
            className={`p-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              config.mode === 'flowers'
                ? 'bg-gradient-to-b from-pink-500/30 to-pink-600/40 border-pink-400 text-pink-200 shadow-md ring-1 ring-pink-400/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="text-base">🌸</span>
            <span className="text-[9px] leading-tight">Flores</span>
          </button>

          {/* MODO TEXTURA DE SOLO */}
          <button
            type="button"
            onClick={() => switchMode('noise')}
            className={`p-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              config.mode === 'noise'
                ? 'bg-gradient-to-b from-amber-500/30 to-amber-600/40 border-amber-400 text-amber-200 shadow-md ring-1 ring-amber-400/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="text-base">🎨</span>
            <span className="text-[9px] leading-tight">Solo</span>
          </button>

          {/* MODO BORRACHA */}
          <button
            type="button"
            onClick={() => switchMode('eraser')}
            className={`p-1.5 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
              config.mode === 'eraser'
                ? 'bg-gradient-to-b from-rose-500/30 to-rose-600/40 border-rose-400 text-rose-200 shadow-md ring-1 ring-rose-400/50'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <span className="text-base">🧹</span>
            <span className="text-[9px] leading-tight">Borracha</span>
          </button>
        </div>
      </div>

      {/* 2. BOTÃO DE ATIVAÇÃO DO PINCEL PEN TERRAIN */}
      <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-2">
        <button
          type="button"
          onClick={() => {
            if (setActiveTool) {
              setActiveTool(isPenActive ? 'pan' : 'terrain_pen');
            }
          }}
          className={`w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 font-bold text-xs transition-all shadow-md active:scale-98 cursor-pointer ${
            isPenActive
              ? config.mode === 'eraser'
                ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white ring-2 ring-rose-300 shadow-rose-500/30'
                : 'bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-emerald-500/30'
              : config.mode === 'eraser'
              ? 'bg-slate-950 hover:bg-slate-800 text-rose-400 border border-rose-500/40'
              : 'bg-slate-950 hover:bg-slate-800 text-emerald-400 border border-emerald-500/40'
          }`}
        >
          {config.mode === 'eraser' ? <Eraser className="w-4 h-4" /> : <PenTool className="w-4 h-4" />}
          <span>
            {isPenActive
              ? config.mode === 'eraser'
                ? '🧹 Borracha Pen Terrain ATIVA (Arraste no mapa)'
                : '🌱 Pincel Pen Terrain ATIVO (Arraste no mapa)'
              : config.mode === 'eraser'
              ? 'Ativar Borracha Pen Terrain'
              : 'Ativar Pincel Pen Terrain'}
          </span>
        </button>

        <p className="text-[11px] text-slate-400 leading-relaxed text-center">
          {config.mode === 'eraser'
            ? 'Arraste pelo mapa para apagar tufos de grama viva, flores, águas e solos sem esforço!'
            : config.mode === 'water' || config.mode === 'noise' || config.mode === 'grass'
            ? 'Pinte áreas contínuas e fluidas de terreno e grama livremente onde o pincel for passado (área contínua sem marcadores de carimbo)!'
            : 'Pinte flores instanciadas diretamente na fase com escalas e inclinações!'}
        </p>
      </div>

      {/* 3. CAMADA ALVO */}
      <div className="p-3 bg-slate-900 border border-purple-500/30 rounded-2xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-purple-300 font-bold flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5" />
            <span>Camada Alvo da Pintura:</span>
          </span>
          {onOpenLayers && (
            <button
              onClick={onOpenLayers}
              className="text-[10px] text-purple-300 hover:text-white font-medium underline cursor-pointer"
            >
              Gerenciar Camadas ↗
            </button>
          )}
        </div>

        <select
          value={config.targetLayerId || activeLayerId}
          onChange={(e) => {
            const target = e.target.value;
            onUpdateProject({ activeMarkerLayerId: target });
            updateConfig({ targetLayerId: target });
          }}
          className="w-full bg-slate-950 border border-purple-500/40 rounded-xl px-3 py-2 text-xs text-purple-200 font-semibold focus:outline-none focus:border-purple-400 cursor-pointer"
        >
          {layers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} {l.locked ? '🔒' : ''} {!l.visible ? '👁️(oculta)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* 4. PAINEIS MODULARES DE CADA MODO */}
      {config.mode === 'grass' && (
        <GrassModePanel
          config={config}
          updateConfig={updateConfig}
          onSelectGrassPreset={handleSelectGrassPreset}
          onUploadCustomSprite={handleUploadCustomSprite}
        />
      )}

      {config.mode === 'water' && (
        <WaterModePanel
          config={config}
          updateConfig={updateConfig}
          project={project}
          onUpdateProject={onUpdateProject}
          onUploadWaterTexture={handleUploadWaterTexture}
        />
      )}

      {config.mode === 'flowers' && (
        <FlowersModePanel
          config={config}
          updateConfig={updateConfig}
          onSelectFlowerPreset={handleSelectFlowerPreset}
        />
      )}

      {config.mode === 'noise' && (
        <NoiseGroundModePanel
          config={config}
          updateConfig={updateConfig}
        />
      )}

      {config.mode === 'eraser' && (
        <EraserModePanel
          config={config}
          updateConfig={updateConfig}
          project={project}
          onUpdateProject={onUpdateProject}
          activeLayerId={activeLayerId}
        />
      )}
    </div>
  );
};
