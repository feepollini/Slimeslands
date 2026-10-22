import React, { useRef, useState } from 'react';
import {
  CloudConfig,
  FogConfig,
  LeavesConfig,
  RainConfig,
  WindConfig,
  BugsConfig,
  AntsConfig,
  SnowConfig,
  LightingConfig,
  BiomeTileConfig,
  SubBiomeConfig,
} from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import { CloudStudio } from './CloudStudio';
import { FogStudio } from './FogStudio';
import { SnowStudio } from './atmosphere/SnowModule';
import {
  Cloud,
  CloudFog,
  Moon,
  Sun,
  Leaf,
  CloudRain,
  Wind,
  Sparkles,
  MapPin,
  Bug,
  Upload,
  Trash2,
  Eye,
  EyeOff,
  Flame,
  Snowflake,
} from 'lucide-react';

interface Props {
  cloudConfig: CloudConfig;
  onUpdateCloudConfig: (updates: Partial<CloudConfig>) => void;
  fogConfig?: FogConfig;
  onUpdateFogConfig?: (updates: Partial<FogConfig>) => void;
  leavesConfig?: LeavesConfig;
  onUpdateLeavesConfig?: (updates: Partial<LeavesConfig>) => void;
  rainConfig?: RainConfig;
  onUpdateRainConfig?: (updates: Partial<RainConfig>) => void;
  windConfig?: WindConfig;
  onUpdateWindConfig?: (updates: Partial<WindConfig>) => void;
  bugsConfig?: BugsConfig;
  onUpdateBugsConfig?: (updates: Partial<BugsConfig>) => void;
  antsConfig?: AntsConfig;
  onUpdateAntsConfig?: (updates: Partial<AntsConfig>) => void;
  snowConfig?: SnowConfig;
  onUpdateSnowConfig?: (updates: Partial<SnowConfig>) => void;
  lightingConfig?: LightingConfig;
  onUpdateLightingConfig?: (updates: Partial<LightingConfig>) => void;
  biomes: BiomeTileConfig[];
  subBiomes?: SubBiomeConfig[];
  onUpdateBiome: (id: string, updates: Partial<BiomeTileConfig>) => void;
  onUpdateSubBiome?: (id: string, updates: Partial<SubBiomeConfig>) => void;
  isExtended?: boolean;
}

export const AtmosphereStudio: React.FC<Props> = ({
  cloudConfig,
  onUpdateCloudConfig,
  fogConfig = {},
  onUpdateFogConfig,
  leavesConfig = {},
  onUpdateLeavesConfig,
  rainConfig = {},
  onUpdateRainConfig,
  windConfig = {},
  onUpdateWindConfig,
  bugsConfig = {},
  onUpdateBugsConfig,
  antsConfig = {},
  onUpdateAntsConfig,
  snowConfig = {},
  onUpdateSnowConfig,
  lightingConfig = {},
  onUpdateLightingConfig,
  biomes,
  subBiomes = [],
  onUpdateBiome,
  onUpdateSubBiome,
  isExtended = false,
}) => {
  const [activeSection, setActiveSection] = useState<
    'clouds' | 'fog' | 'night' | 'wind' | 'rain' | 'dawn' | 'leaves' | 'snow' | 'bugs' | 'ants' | 'biomes'
  >('clouds');

  const leafFileInputRef = useRef<HTMLInputElement>(null);
  const bugFileInputRef = useRef<HTMLInputElement>(null);
  const antFileInputRef = useRef<HTMLInputElement>(null);

  // Upload PNG de folhas personalizadas
  const handleUploadLeafPNG = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !onUpdateLeavesConfig) return;
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await readUploadedImage(files[i]);
        newUrls.push(res.dataUrl);
      }
      const existing = leavesConfig.customLeafPngs || [];
      onUpdateLeavesConfig({
        customLeafPngs: [...existing, ...newUrls],
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleRemoveLeafPng = (index: number) => {
    if (!onUpdateLeavesConfig) return;
    const list = [...(leavesConfig.customLeafPngs || [])];
    list.splice(index, 1);
    onUpdateLeavesConfig({
      customLeafPngs: list,
    });
  };

  // Upload PNG de bugs personalizado
  const handleUploadBugPNG = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateBugsConfig) return;
    try {
      const res = await readUploadedImage(file);
      onUpdateBugsConfig({
        customBugPng: res.dataUrl,
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  // Upload PNG de formigas personalizado
  const handleUploadAntPNG = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateAntsConfig) return;
    try {
      const res = await readUploadedImage(file);
      onUpdateAntsConfig({
        customAntPng: res.dataUrl,
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const leafList = leavesConfig.customLeafPngs || [];

  // Helper para alternar eventos múltiplos em um bioma
  const toggleBiomeEvent = (biomeId: string, currentEvents: string[] | undefined, legacyEvent: string | undefined, eventToToggle: string) => {
    const activeList = currentEvents && currentEvents.length > 0
      ? [...currentEvents]
      : (legacyEvent && legacyEvent !== 'none' ? [legacyEvent] : []);

    const idx = activeList.indexOf(eventToToggle);
    let nextList: string[];
    if (idx >= 0) {
      nextList = activeList.filter((e) => e !== eventToToggle);
    } else {
      nextList = [...activeList, eventToToggle];
    }
    onUpdateBiome(biomeId, {
      biomeEvents: nextList as any,
      biomeEvent: (nextList[0] || 'none') as any,
    });
  };

  const toggleSubBiomeEvent = (sbId: string, currentEvents: string[] | undefined, legacyEvent: string | undefined, eventToToggle: string) => {
    if (!onUpdateSubBiome) return;
    const activeList = currentEvents && currentEvents.length > 0
      ? [...currentEvents]
      : (legacyEvent && legacyEvent !== 'none' ? [legacyEvent] : []);

    const idx = activeList.indexOf(eventToToggle);
    let nextList: string[];
    if (idx >= 0) {
      nextList = activeList.filter((e) => e !== eventToToggle);
    } else {
      nextList = [...activeList, eventToToggle];
    }
    onUpdateSubBiome(sbId, {
      biomeEvents: nextList as any,
      biomeEvent: (nextList[0] || 'none') as any,
    });
  };

  const ALL_WEATHER_OPTIONS = [
    { id: 'night', label: 'Noite', icon: Moon, color: 'text-indigo-300 border-indigo-500/40 bg-indigo-500/15' },
    { id: 'rain', label: 'Chuva', icon: CloudRain, color: 'text-cyan-300 border-cyan-500/40 bg-cyan-500/15' },
    { id: 'wind', label: 'Vento', icon: Wind, color: 'text-teal-300 border-teal-500/40 bg-teal-500/15' },
    { id: 'leaves', label: 'Folhas', icon: Leaf, color: 'text-amber-300 border-amber-500/40 bg-amber-500/15' },
    { id: 'dawn', label: 'Alvorada', icon: Sun, color: 'text-orange-300 border-orange-500/40 bg-orange-500/15' },
    { id: 'bugs', label: 'Bugs', icon: Bug, color: 'text-yellow-300 border-yellow-500/40 bg-yellow-500/15' },
    { id: 'ants', label: 'Formigas', icon: Flame, color: 'text-rose-300 border-rose-500/40 bg-rose-500/15' },
  ];

  return (
    <div className="space-y-3.5 p-1 text-xs">
      <input
        ref={leafFileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadLeafPNG}
      />
      <input
        ref={bugFileInputRef}
        type="file"
        accept="image/png, image/webp"
        className="hidden"
        onChange={handleUploadBugPNG}
      />
      <input
        ref={antFileInputRef}
        type="file"
        accept="image/png, image/webp"
        className="hidden"
        onChange={handleUploadAntPNG}
      />

      {/* Header Info */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-1.5 font-bold text-slate-100">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Atmosfera, Climas & Efeitos Vivos</span>
        </div>
      </div>

      {/* Sub-Abas Completas */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveSection('clouds')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'clouds'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Cloud className="w-3.5 h-3.5 mb-0.5" />
          <span>Nuvens ☁️</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('fog')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'fog'
              ? 'bg-teal-500/20 text-teal-300 border border-teal-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <CloudFog className="w-3.5 h-3.5 mb-0.5" />
          <span>Neblina 🌫️</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('night')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'night'
              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Moon className="w-3.5 h-3.5 mb-0.5" />
          <span>Noite 🌙</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('wind')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'wind'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Wind className="w-3.5 h-3.5 mb-0.5" />
          <span>Vento 🍃</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('rain')}
          className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'rain'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <CloudRain className="w-3.5 h-3.5 mb-0.5" />
          <span>Chuva 🌧️</span>
        </button>
      </div>

      <div className="grid grid-cols-6 gap-1 p-1 bg-slate-950/80 border border-slate-800/80 rounded-xl">
        <button
          type="button"
          onClick={() => setActiveSection('leaves')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'leaves'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Leaf className="w-3.5 h-3.5 mb-0.5" />
          <span>Folhas 🍂</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('snow')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'snow'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Snowflake className="w-3.5 h-3.5 mb-0.5" />
          <span>Neve ❄️</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('dawn')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'dawn'
              ? 'bg-orange-500/20 text-orange-300 border border-orange-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Sun className="w-3.5 h-3.5 mb-0.5" />
          <span>Alvorada 🌅</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('bugs')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'bugs'
              ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Bug className="w-3.5 h-3.5 mb-0.5" />
          <span>Bugs 🪰</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('ants')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'ants'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <Flame className="w-3.5 h-3.5 mb-0.5" />
          <span>Formigas 🐜</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('biomes')}
          className={`flex flex-col items-center justify-center py-1.5 px-0.5 rounded-lg text-[10px] font-bold transition-all ${
            activeSection === 'biomes'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
          }`}
        >
          <MapPin className="w-3.5 h-3.5 mb-0.5" />
          <span>Climas 🗺️</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. SEÇÃO NUVENS: RENDERIZA O CloudStudio COMPLETO COM DENSIDADE 1 A 10 */}
      {/* ========================================================================= */}
      {activeSection === 'clouds' && (
        <CloudStudio
          cloudConfig={cloudConfig}
          onUpdateCloudConfig={onUpdateCloudConfig}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. SEÇÃO NEBLINA: RENDERIZA O FogStudio COMPLETO DE CHÃO E SOLO */}
      {/* ========================================================================= */}
      {activeSection === 'fog' && (
        <FogStudio
          fogConfig={fogConfig}
          onUpdateFogConfig={onUpdateFogConfig || (() => {})}
        />
      )}

      {/* ========================================================================= */}
      {/* 2. SEÇÃO MODO NOITE & LANTERNA DO HERÓI */}
      {/* ========================================================================= */}
      {activeSection === 'night' && (
        <div className="space-y-3.5 p-3.5 bg-slate-900/80 border border-indigo-500/30 rounded-xl shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-300">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Modo Noturno & Lanterna Top-Down</span>
            </div>
            {onUpdateLightingConfig && (
              <button
                type="button"
                onClick={() => onUpdateLightingConfig({ nightEnabled: !lightingConfig.nightEnabled })}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                  lightingConfig.nightEnabled
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {lightingConfig.nightEnabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{lightingConfig.nightEnabled ? 'Ativado Geral' : 'Desativado'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            A escuridão noturna envolve o mapa com vinheta cinematográfica suave e uma lanterna circular viva que acompanha perfeitamente o centro do Herói.
          </p>

          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Escuridão da Noite</span>
                <span className="font-mono text-indigo-300">{Math.round((lightingConfig.darknessOpacity ?? 0.65) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="0.95"
                step="0.05"
                value={lightingConfig.darknessOpacity ?? 0.65}
                onChange={(e) => onUpdateLightingConfig?.({ darknessOpacity: parseFloat(e.target.value) })}
                className="w-full accent-indigo-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Raio da Lanterna do Jogador</span>
                <span className="font-mono text-indigo-300">{lightingConfig.flashlightRadius ?? 160}px</span>
              </div>
              <input
                type="range"
                min="80"
                max="400"
                step="10"
                value={lightingConfig.flashlightRadius ?? 160}
                onChange={(e) => onUpdateLightingConfig?.({ flashlightRadius: parseInt(e.target.value) })}
                className="w-full accent-indigo-400 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] text-slate-500 mt-1">
                <button type="button" onClick={() => onUpdateLightingConfig?.({ flashlightRadius: 100 })} className="hover:text-indigo-300 cursor-pointer">Pequena (100px)</button>
                <button type="button" onClick={() => onUpdateLightingConfig?.({ flashlightRadius: 160 })} className="hover:text-indigo-300 cursor-pointer">Padrão (160px)</button>
                <button type="button" onClick={() => onUpdateLightingConfig?.({ flashlightRadius: 260 })} className="hover:text-indigo-300 cursor-pointer">Ampla (260px)</button>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-300">Vinheta Cinemática de Borda:</span>
              <button
                type="button"
                onClick={() => onUpdateLightingConfig?.({ showVignette: !(lightingConfig.showVignette !== false) })}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  lightingConfig.showVignette !== false
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                {lightingConfig.showVignette !== false ? 'Ligada' : 'Desligada'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SEÇÃO VENTO PROCEDURAL (LINHAS CURVAS TRANSPARENTES) */}
      {/* ========================================================================= */}
      {activeSection === 'wind' && (
        <div className="space-y-3.5 p-3.5 bg-slate-900/80 border border-teal-500/30 rounded-xl shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
              <Wind className="w-4 h-4 text-teal-400" />
              <span>Correntes de Vento Curvilíneo</span>
            </div>
            {onUpdateWindConfig && (
              <button
                type="button"
                onClick={() => onUpdateWindConfig({ enabled: !windConfig.enabled })}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                  windConfig.enabled
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {windConfig.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{windConfig.enabled ? 'Ativado Geral' : 'Desativado'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Rajadas aerodinâmicas semitransparentes com curvas suaves que viajam pela tela, conferindo dinamismo e sensação de brisa no mundo.
          </p>

          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Quantidade de Rajadas na Tela</span>
                <span className="font-mono text-teal-300">{windConfig.gustCount ?? 7}</span>
              </div>
              <input
                type="range"
                min="2"
                max="20"
                step="1"
                value={windConfig.gustCount ?? 7}
                onChange={(e) => onUpdateWindConfig?.({ gustCount: parseInt(e.target.value) })}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Curvatura das Ondas</span>
                <span className="font-mono text-teal-300">{windConfig.curvature ?? 32}px</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="2"
                value={windConfig.curvature ?? 32}
                onChange={(e) => onUpdateWindConfig?.({ curvature: parseInt(e.target.value) })}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Velocidade do Vento</span>
                <span className="font-mono text-teal-300">{(windConfig.speed ?? 4.5).toFixed(1)}s</span>
              </div>
              <input
                type="range"
                min="1.5"
                max="8.0"
                step="0.5"
                value={windConfig.speed ?? 4.5}
                onChange={(e) => onUpdateWindConfig?.({ speed: parseFloat(e.target.value) })}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Opacidade das Linhas</span>
                <span className="font-mono text-teal-300">{Math.round((windConfig.opacity ?? 0.38) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={windConfig.opacity ?? 0.38}
                onChange={(e) => onUpdateWindConfig?.({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-teal-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SEÇÃO CHUVA & SOLO */}
      {/* ========================================================================= */}
      {activeSection === 'rain' && (
        <div className="space-y-3.5 p-3.5 bg-slate-900/80 border border-cyan-500/30 rounded-xl shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
              <CloudRain className="w-4 h-4 text-cyan-400" />
              <span>Chuva Contínua & Respingos de Poça</span>
            </div>
            {onUpdateRainConfig && (
              <button
                type="button"
                onClick={() => onUpdateRainConfig({ enabled: !rainConfig.enabled })}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                  rainConfig.enabled
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {rainConfig.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{rainConfig.enabled ? 'Ativado Geral' : 'Desativado'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Gotas diagonais na tela e ondulações circulares procedurais que tocam o solo do mapa.
          </p>

          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Intensidade de Gotas</span>
                <span className="font-mono text-cyan-300">{rainConfig.intensity ?? 42}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="2"
                value={rainConfig.intensity ?? 42}
                onChange={(e) => onUpdateRainConfig?.({ intensity: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Respingos e Ondulações no Solo</span>
                <span className="font-mono text-cyan-300">{rainConfig.splashCount ?? 24}</span>
              </div>
              <input
                type="range"
                min="5"
                max="60"
                step="1"
                value={rainConfig.splashCount ?? 24}
                onChange={(e) => onUpdateRainConfig?.({ splashCount: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Tamanho da Ondulação</span>
                <span className="font-mono text-cyan-300">{rainConfig.splashSize ?? 26}px</span>
              </div>
              <input
                type="range"
                min="14"
                max="60"
                step="2"
                value={rainConfig.splashSize ?? 26}
                onChange={(e) => onUpdateRainConfig?.({ splashSize: parseInt(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            {/* Poças d'água e Respingos de Passos */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-200 block">💧 Poças d'Água no Chão</span>
                  <span className="text-[10px] text-slate-400 block">Espelhos d'água procedurais com reflexo brilhante e ondulações</span>
                </div>
                <input
                  type="checkbox"
                  checked={rainConfig.puddlesEnabled !== false}
                  onChange={(e) => onUpdateRainConfig?.({ puddlesEnabled: e.target.checked })}
                  className="rounded accent-cyan-400 cursor-pointer w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer hover:border-slate-700">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-200 block">🌊 Respingos de Passos na Água</span>
                  <span className="text-[10px] text-slate-400 block">Herói espalha ondas e gotículas quando corre ou caminha na poça</span>
                </div>
                <input
                  type="checkbox"
                  checked={rainConfig.puddleSplashes !== false}
                  onChange={(e) => onUpdateRainConfig?.({ puddleSplashes: e.target.checked })}
                  className="rounded accent-cyan-400 cursor-pointer w-4 h-4"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. SEÇÃO ALVORADA / AMANHECER */}
      {/* ========================================================================= */}
      {activeSection === 'dawn' && (
        <div className="space-y-3.5 p-3.5 bg-slate-900/80 border border-orange-500/30 rounded-xl shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-orange-300">
              <Sun className="w-4 h-4 text-orange-400" />
              <span>Alvorada & Amanhecer Dourado</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Gradiente solar cálido ascendente que banha o cenário e os personagens em tons dourados e alaranjados de nascer do sol.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. SEÇÃO FOLHAS (SOLO + AÉREA) COM PRESETS */}
      {/* ========================================================================= */}
      {activeSection === 'leaves' && (
        <div className="space-y-3.5 p-3.5 bg-slate-900/80 border border-amber-500/30 rounded-xl shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
              <Leaf className="w-4 h-4 text-amber-400" />
              <span>Folhas: Solo & Ar</span>
            </div>
            {onUpdateLeavesConfig && (
              <button
                type="button"
                onClick={() => onUpdateLeavesConfig({ enabled: !leavesConfig.enabled })}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                  leavesConfig.enabled
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {leavesConfig.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{leavesConfig.enabled ? 'Ativado Geral' : 'Desativado'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Camada dupla inteligente: folhas caídas que repousam no <b>solo sob os pés</b> do jogador e folhas voando em 3D <b>alto no ar sobre a cabeça</b>.
          </p>

          {/* Presets de Grupos de Folhas */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Grupos e Estilos de Folhas:</span>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: 'autumn', label: '🍁 Outono (Douradas & Laranja)' },
                { id: 'spring', label: '🌸 Primavera (Pétalas Sakura)' },
                { id: 'dry', label: '🍂 Folhas Secas (Terrosas)' },
                { id: 'jungle', label: '🍃 Verdes (Florestal / Tropical)' },
                { id: 'mystic', label: '💜 Místicas (Violeta & Púrpura)' },
                { id: 'frost', label: '❄️ Gélidas (Azul Cristal)' },
                { id: 'neon', label: '🌌 Neon (Ciano & Rosa)' },
              ].map((group) => {
                const isSelected = (leavesConfig.preset || 'autumn') === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    onClick={() => onUpdateLeavesConfig?.({ preset: group.id as any })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all text-left flex items-center justify-between ${
                      isSelected
                        ? 'bg-amber-500/25 border-amber-400 text-amber-100 shadow-sm ring-1 ring-amber-400/40'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="truncate">{group.label}</span>
                    {isSelected && <span className="text-amber-400 text-xs ml-1 shrink-0">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tingimento e Matiz de Cor Personalizada para Folhas */}
          <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-slate-300 font-bold flex items-center gap-1.5">
                <span>🎨 Tingir Cor do Grupo:</span>
                {leavesConfig.customTint && (
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm inline-block"
                    style={{ backgroundColor: leavesConfig.customTint }}
                  />
                )}
              </span>
              <div className="flex items-center gap-2">
                {leavesConfig.customTint && (
                  <button
                    type="button"
                    onClick={() => onUpdateLeavesConfig?.({ customTint: undefined })}
                    className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                  >
                    Restaurar Original
                  </button>
                )}
                <input
                  type="color"
                  value={leavesConfig.customTint || '#ffffff'}
                  onChange={(e) => onUpdateLeavesConfig?.({ customTint: e.target.value })}
                  className="w-6 h-6 rounded cursor-pointer border border-slate-700 bg-transparent"
                  title="Escolha uma cor para tingir as folhas"
                />
              </div>
            </div>

            {/* Amostras Rápidas de Cores */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: '🌸 Rosa Sakura', color: '#fb7185' },
                { label: '💜 Violeta', color: '#a855f7' },
                { label: '❄️ Ciano Gelo', color: '#38bdf8' },
                { label: '🍃 Esmeralda', color: '#10b981' },
                { label: '🍁 Ouro Rubi', color: '#f59e0b' },
                { label: '🔥 Laranja Fogo', color: '#f97316' },
                { label: '🩸 Carmesim', color: '#e11d48' },
                { label: '🤍 Alvo Puro', color: '#f8fafc' },
              ].map((swatch) => (
                <button
                  key={swatch.color}
                  type="button"
                  onClick={() => onUpdateLeavesConfig?.({ customTint: swatch.color })}
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 transition-all ${
                    leavesConfig.customTint === swatch.color
                      ? 'border-amber-400 bg-amber-400/20 text-white shadow-sm ring-1 ring-amber-400/40'
                      : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: swatch.color }} />
                  <span>{swatch.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            {/* Upload PNG Folhas */}
            <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-slate-300 font-medium">Texturas PNG de Folhas</span>
                <span className="text-amber-400 font-mono text-[10px]">{leafList.length} PNG(s)</span>
              </div>
              {leafList.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {leafList.map((url, idx) => (
                    <div key={idx} className="relative group bg-slate-900 border border-slate-800 rounded p-1 flex items-center justify-center">
                      <img src={url} alt={`Leaf ${idx}`} className="w-8 h-8 object-contain" />
                      <button
                        type="button"
                        onClick={() => handleRemoveLeafPng(idx)}
                        className="absolute -top-1 -right-1 bg-rose-600 text-white rounded-full p-0.5"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <button
                type="button"
                onClick={() => leafFileInputRef.current?.click()}
                className="w-full py-1.5 border border-dashed border-amber-500/40 hover:border-amber-400 text-amber-300 rounded text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                <span>Upload PNGs de Folhas</span>
              </button>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Quantidade de Folhas</span>
                <span className="font-mono text-amber-300">{leavesConfig.leafCount ?? 24}</span>
              </div>
              <input
                type="range"
                min="6"
                max="60"
                step="2"
                value={leavesConfig.leafCount ?? 24}
                onChange={(e) => onUpdateLeavesConfig?.({ leafCount: parseInt(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Tamanho Base</span>
                <span className="font-mono text-amber-300">{leavesConfig.baseSize ?? 36}px</span>
              </div>
              <input
                type="range"
                min="16"
                max="80"
                step="2"
                value={leavesConfig.baseSize ?? 36}
                onChange={(e) => onUpdateLeavesConfig?.({ baseSize: parseInt(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SEÇÃO NEVE & NEVASCA PROCEDURAL COM BRILHO CROMÁTICO E ACÚMULO */}
      {/* ========================================================================= */}
      {activeSection === 'snow' && (
        <SnowStudio
          snowConfig={snowConfig}
          onUpdateSnowConfig={onUpdateSnowConfig || (() => {})}
        />
      )}

      {/* ========================================================================= */}
      {/* 7. SEÇÃO BUGS & INSETOS VOADORES COM DOBRA DE ASA */}
      {/* ========================================================================= */}
      {activeSection === 'bugs' && (
        <div className="space-y-3.5 p-3.5 bg-slate-900/80 border border-yellow-500/30 rounded-xl shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-yellow-300">
              <Bug className="w-4 h-4 text-yellow-400" />
              <span>Insetos Voadores (Com Dobra de Asa Rápida)</span>
            </div>
            {onUpdateBugsConfig && (
              <button
                type="button"
                onClick={() => onUpdateBugsConfig({ enabled: !bugsConfig.enabled })}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                  bugsConfig.enabled
                    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {bugsConfig.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{bugsConfig.enabled ? 'Ativado Geral' : 'Desativado'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Insetos voam com física top-down natural e batem as asas dobrando o PNG rapidamente ao meio. Podem pousar suavemente no jogador!
          </p>

          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            {/* Presets e Seleção Múltipla de Insetos */}
            <div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                <span>Espécies de Insetos:</span>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateBugsConfig?.({
                      preset: 'all',
                      activeSpecies: ['fireflies', 'butterflies', 'flies', ...(bugsConfig.customBugPng ? ['custom' as const] : [])],
                    });
                  }}
                  className="text-[10px] text-amber-300 hover:text-amber-200 font-bold underline cursor-pointer"
                >
                  ⚡ Ativar Todos de Uma Vez
                </button>
              </div>

              {/* Botão Destaque: TODOS JUNTOS */}
              <button
                type="button"
                onClick={() => {
                  onUpdateBugsConfig?.({
                    preset: 'all',
                    activeSpecies: ['fireflies', 'butterflies', 'flies', ...(bugsConfig.customBugPng ? ['custom' as const] : [])],
                  });
                }}
                className={`w-full py-2 px-2 mb-2 rounded-lg border text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-sm ${
                  bugsConfig.preset === 'all' || (!bugsConfig.preset && (!bugsConfig.activeSpecies || bugsConfig.activeSpecies.length >= 3))
                    ? 'bg-gradient-to-r from-amber-500/30 via-yellow-500/30 to-sky-500/30 border-amber-400 text-amber-200 ring-1 ring-amber-400/40'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <span>🌟</span>
                <span>TODOS JUNTOS (Enxame Misto Completo)</span>
              </button>

              {/* Seletores Individuais / Múltiplos */}
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'fireflies', label: '✨ Vagalumes (Glow)' },
                  { id: 'butterflies', label: '🦋 Borboletas (Asas)' },
                  { id: 'flies', label: '🪰 Moscas Rápidas' },
                  { id: 'custom', label: '🖼️ Custom PNG' },
                ].map((p) => {
                  const currentSpecies = bugsConfig.activeSpecies || (bugsConfig.preset === 'all' ? ['fireflies', 'butterflies', 'flies'] : [bugsConfig.preset || 'fireflies']);
                  const isSelected = currentSpecies.includes(p.id as any);

                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        let nextSpecies: Array<'fireflies' | 'flies' | 'butterflies' | 'custom'>;
                        if (isSelected) {
                          nextSpecies = currentSpecies.filter((s) => s !== p.id) as any;
                          if (nextSpecies.length === 0) nextSpecies = [p.id as any];
                        } else {
                          nextSpecies = [...currentSpecies, p.id as any];
                        }
                        onUpdateBugsConfig?.({
                          activeSpecies: nextSpecies,
                          preset: nextSpecies.length >= 3 ? 'all' : (nextSpecies[0] as any),
                        });
                      }}
                      className={`py-1.5 px-2 rounded border text-[11px] font-semibold text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? 'bg-yellow-500/20 border-yellow-400/60 text-yellow-200 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className={`w-3.5 h-3.5 rounded flex items-center justify-center text-[9px] font-bold ${
                        isSelected ? 'bg-yellow-400 text-slate-950' : 'border border-slate-700 text-transparent'
                      }`}>
                        ✓
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Upload PNG Customizado se selecionado */}
            {((bugsConfig.activeSpecies?.includes('custom')) || bugsConfig.preset === 'custom') && (
              <button
                type="button"
                onClick={() => bugFileInputRef.current?.click()}
                className="w-full py-1.5 border border-dashed border-yellow-500/40 hover:border-yellow-400 text-yellow-300 rounded text-center transition-colors flex items-center justify-center gap-1.5"
              >
                <Upload className="w-3 h-3" />
                <span>Upload PNG de Inseto Customizado</span>
              </button>
            )}

            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>Quantidade Total no Enxame</span>
                <span className="font-mono text-yellow-300">{bugsConfig.bugCount ?? 22}</span>
              </div>
              <input
                type="range"
                min="4"
                max="60"
                step="2"
                value={bugsConfig.bugCount ?? 22}
                onChange={(e) => onUpdateBugsConfig?.({ bugCount: parseInt(e.target.value) })}
                className="w-full accent-yellow-400 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-300">Pousam no Herói:</span>
              <button
                type="button"
                onClick={() => onUpdateBugsConfig?.({ landOnPlayer: !(bugsConfig.landOnPlayer !== false) })}
                className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
                  bugsConfig.landOnPlayer !== false
                    ? 'bg-yellow-500/20 border-yellow-500/50 text-yellow-200'
                    : 'bg-slate-950 border-slate-800 text-slate-500'
                }`}
              >
                {bugsConfig.landOnPlayer !== false ? 'Sim (Pousam no Ombro)' : 'Não'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. SEÇÃO FORMIGAS TERRESTRES PROCEDURAIS */}
      {/* ========================================================================= */}
      {activeSection === 'ants' && (
        <div className="space-y-3.5 p-3.5 bg-slate-900/80 border border-rose-500/30 rounded-xl shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
              <Flame className="w-4 h-4 text-rose-400" />
              <span>Colônia de Formigas & Chão Denso</span>
            </div>
            {onUpdateAntsConfig && (
              <button
                type="button"
                onClick={() => onUpdateAntsConfig({ enabled: !antsConfig.enabled })}
                className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
                  antsConfig.enabled
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {antsConfig.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>{antsConfig.enabled ? 'Ativado Geral' : 'Desativado'}</span>
              </button>
            )}
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Rede densa com múltiplos caminhos em laço, curvas fechadas, formigas solitárias exploradoras e folhas verdes bem grandes carregadas no lombo!
          </p>

          <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
            {/* Folhas Grandes */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>🍃 Tamanho das Folhas Carregadas</span>
                <span className="font-mono text-emerald-400 font-bold">{(antsConfig.leafScale ?? 1.7).toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="3.0"
                step="0.1"
                value={antsConfig.leafScale ?? 1.7}
                onChange={(e) => onUpdateAntsConfig?.({ leafScale: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Frequência de Folhas */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>🌿 Quantidade de Formigas com Folha</span>
                <span className="font-mono text-emerald-400 font-bold">{Math.round((antsConfig.leafChance ?? 0.60) * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={antsConfig.leafChance ?? 0.60}
                onChange={(e) => onUpdateAntsConfig?.({ leafChance: parseFloat(e.target.value) })}
                className="w-full accent-emerald-400 cursor-pointer"
              />
            </div>

            {/* Formigas Solitárias */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>🚶 Formigas Solitárias (Exploradoras Livres)</span>
                <span className="font-mono text-amber-300 font-bold">{antsConfig.soloCount ?? 14}</span>
              </div>
              <input
                type="range"
                min="0"
                max="35"
                step="1"
                value={antsConfig.soloCount ?? 14}
                onChange={(e) => onUpdateAntsConfig?.({ soloCount: parseInt(e.target.value) })}
                className="w-full accent-amber-400 cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Vagueiam sozinhas farejando o solo e fogem se o herói chegar perto.</span>
            </div>

            {/* Quantidade na Rede de Trilhas */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>🐜 Formigas nas Trilhas (Laços & Curvas)</span>
                <span className="font-mono text-rose-300 font-bold">{antsConfig.antCount ?? 42}</span>
              </div>
              <input
                type="range"
                min="10"
                max="100"
                step="2"
                value={antsConfig.antCount ?? 42}
                onChange={(e) => onUpdateAntsConfig?.({ antCount: parseInt(e.target.value) })}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>

            {/* Raio de Fuga ao se Aproximar do Herói */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                <span>⚡ Raio de Fuga e Dispersão</span>
                <span className="font-mono text-rose-300">{antsConfig.scatterRadius ?? 65}px</span>
              </div>
              <input
                type="range"
                min="30"
                max="140"
                step="5"
                value={antsConfig.scatterRadius ?? 65}
                onChange={(e) => onUpdateAntsConfig?.({ scatterRadius: parseInt(e.target.value) })}
                className="w-full accent-rose-400 cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. SEÇÃO CLIMAS POR BIOMA COM SELETOR MÚLTIPLO */}
      {/* ========================================================================= */}
      {activeSection === 'biomes' && (
        <div className="space-y-3.5 p-3.5 bg-slate-900/80 border border-emerald-500/30 rounded-xl shadow-md">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Seletor Múltiplo de Climas por Bioma</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-300 leading-relaxed">
            Clique nos botões de cada bioma para <b>combinar múltiplos efeitos simultâneos</b> (ex: Chuva + Vento + Folhas + Noite)!
          </p>

          <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
            {(!isExtended || subBiomes.length === 0)
              ? biomes.map((biome, idx) => {
                  const activeList = biome.biomeEvents && biome.biomeEvents.length > 0
                    ? biome.biomeEvents
                    : (biome.biomeEvent && biome.biomeEvent !== 'none' ? [biome.biomeEvent] : []);

                  return (
                    <div
                      key={biome.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-bold text-xs truncate max-w-[160px]">
                          {idx + 1}. {biome.name || `Bioma ${idx + 1}`}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {activeList.length === 0 ? 'Nenhum' : `${activeList.length} ativo(s)`}
                        </span>
                      </div>

                      {/* Seletor Múltiplo de Climas */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {ALL_WEATHER_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = activeList.includes(opt.id as any);

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleBiomeEvent(biome.id, biome.biomeEvents, biome.biomeEvent, opt.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? `${opt.color} shadow-sm ring-1 ring-white/20`
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              : subBiomes.map((sb, idx) => {
                  const activeList = sb.biomeEvents && sb.biomeEvents.length > 0
                    ? sb.biomeEvents
                    : (sb.biomeEvent && sb.biomeEvent !== 'none' ? [sb.biomeEvent] : []);

                  return (
                    <div
                      key={sb.id}
                      className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-slate-200 font-bold text-xs truncate max-w-[160px]">
                          {idx + 1}. {sb.name || `Sub-Bioma ${idx + 1}`}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-mono">
                          {activeList.length === 0 ? 'Nenhum' : `${activeList.length} ativo(s)`}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1 pt-1">
                        {ALL_WEATHER_OPTIONS.map((opt) => {
                          const Icon = opt.icon;
                          const isSelected = activeList.includes(opt.id as any);

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => toggleSubBiomeEvent(sb.id, sb.biomeEvents, sb.biomeEvent, opt.id)}
                              className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer ${
                                isSelected
                                  ? `${opt.color} shadow-sm ring-1 ring-white/20`
                                  : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              <span>{opt.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}
    </div>
  );
};
