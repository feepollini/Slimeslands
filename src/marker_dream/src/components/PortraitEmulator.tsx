import React, { useRef, useEffect, useState, useMemo } from 'react';
import { MapProject, MapMarker, MarkerType } from '../types/map';
import { getBiomeSegmentSpans, getTotalMapHeight, generateCurvedPath, getBiomeAtY, COLLISION_CELL } from '../utils/mapMath';
import {
  Smartphone,
  Compass,
  Anchor,
  Landmark,
  Castle,
  Skull,
  Gem,
  Sparkles,
  Mountain,
  Tent,
  X,
  Upload,
  Image as ImageIcon,
  Wifi,
  Battery,
  Swords,
  MessageSquare,
  ChevronRight,
  Sparkle,
  Zap,
  Backpack,
  User,
  MousePointerClick,
  Volume2,
  VolumeX,
  Move,
  Check,
} from 'lucide-react';

import { drawBiomeSpansWithFeather } from '../utils/canvasSeamBlend';
import { GroundShadow } from '../utils/assetSize';
import { getRenderableAssetUrl } from '../utils/assetRegistry';
import { DialogueTheme, DEFAULT_GREEN_THEME, extractThemeFromImage } from '../utils/dialogueTheme';
import { getOrCreateScreensConfig } from './screens/ScreensStudio';
import {
  PlayerHeaderHudWidget,
  QuestTrackerHudWidget,
  TopGlassAccessBarHudWidget,
  SlidingLootToastStackHudWidget,
  LootToastBarEntry,
  QuestJourneyPopupModal,
  GameBackpackPopupModal,
  VerticalGlassPetSwitcherCapsuleWidget,
  DEFAULT_PET_CARE_ITEMS,
  applyPetCareItemToPlayer,
} from './screens/HudStatusAndQuestsWidgets';
import { PlayerHudConfig, getResolvedPlayerPetConfig, PlayerPetCatalogItem } from '../types/map';
import mochilaPng from '../assets/mochila.png';
import discoPng from '../assets/disco.png';
import botaoPng from '../assets/botao.png';
import { MotionAssetCanvas } from './MotionAssetCanvas';
import { VideoAssetCanvas } from './video/VideoAssetCanvas';
import { renderMotionOverlayStroke, renderUnifiedWaterOverlays, EffectType, isVfxOverlayEffect } from '../utils/motionCanvasEngine';
import {
  renderGroundStampsPixelCanvas,
  renderInstancedVegetationCanvas,
  MAX_MAP_DIMENSION,
} from '../utils/terrainTextures';
import { DEFAULT_SPAWN_VEHICLE_PNG } from '../data/defaultSpawnVehicles';
import { FIREFLY_SVG, FLY_SVG, BUTTERFLY_SVG, ANT_SVG, WIND_GUST_SVG } from '../data/defaultAtmosphereAssets';
import { 
  LivingAntColony, 
  LivingBugsLayer, 
  VolumetricWorldWind, 
  SnowWorldLayer, 
  SkyCloudsLayer,
  GroundFogLayer,
  RainGroundSplashesLayer,
  OrganicRainPuddlesLayer,
  LeavesGroundLayer,
  LeavesAirLayer,
  OrganicSnowDriftsLayer,
  AssetSnowCoat,
} from './atmosphere';
import { StationWorldMarker, StationInteractiveModal } from './station';
import {
  globalNpcActionEngine,
  isSlimeMarker,
  ActiveCombatVfx,
  ActiveProjectile,
  ActiveSpeechBalloon,
} from '../utils/npcActionEngine';
import { AnimeEmotionOverlay } from './npc/AnimeEmotionOverlay';
import { ActionNpcCombatOverlay } from './npc/ActionNpcCombatOverlay';
import { preloadVideoUrl } from '../utils/videoUtils';
import { WorldMapEmulatorView } from './workspace/WorldMapEmulatorView';
import {
  getOrCreateItemCatalog,
  getOrCreatePlayerInventory,
  addItemToPlayerInventory,
} from '../utils/inventoryHelpers';
import {
  dispatchEngineEvent,
  ensureProjectQuestsConfig,
  summarizeRewardItems,
  grantXpCentralService,
  executeRewardBundle,
  createInitialQuestRuntimeProgress,
  saveProjectQuestsConfigToStorage,
} from '../utils/questEngine';

interface Props {
  project: MapProject;
  savedLevels?: import('../types/map').SavedLevel[];
  activeTab?: string;
  canvasView?: 'vertical' | 'extended';
  activeMarkerId: string | null;
  onSelectMarker: (markerId: string | null) => void;
  onTriggerImportPNG?: () => void;
  scrollTargetY?: number | null;
  testDialogueMarkerId?: string | null;
  onCloseDialogue?: () => void;
  onUpdatePlayer?: (updates: Partial<import('../types/map').PlayerConfig>) => void;
  onLoadLevel?: (level: import('../types/map').SavedLevel) => void;
  onUpdateMarker?: (id: string, updates: Partial<MapMarker>) => void;
  activeTool?: import('../types/map').ActiveTool;
  onAddMotionMarkerAt?: (info: {
    x: number;
    y: number;
    subBiomeId?: string;
    biomeId?: string;
    dataUrl: string;
    w: number;
    h: number;
  }) => void;
  motionBrushSize?: number;
  motionAuto?: boolean;
  onUpdateProject?: (updates: Partial<import('../types/map').MapProject>) => void;
  motionEffect?: EffectType;
  motionSpeed?: number;
  motionIntensity?: number;
  testSpawnTriggerId?: number | null;
  orientation?: 'portrait' | 'landscape';
  onToggleOrientation?: (next: 'portrait' | 'landscape') => void;
  isWebMode?: boolean;
  onToggleWebMode?: (web: boolean) => void;
  isPlayMode?: boolean;
  isWorldMapSolo?: boolean;
}

// Tamanho fixo do preview (seletor de presets removido)
const SCREEN_WIDTH = 500;
const SCREEN_HEIGHT = 1080;

// PNG direcional ativo do herói (mesma regra do render)
function pickAvatarPng(
  player: import('../types/map').PlayerConfig,
  dir: string
): string | undefined {
  return (dir === 'up' && player.avatarUpPng)
    ? player.avatarUpPng
    : (dir === 'down' && player.avatarDownPng)
    ? player.avatarDownPng
    : (dir === 'left' && player.avatarLeftPng)
    ? player.avatarLeftPng
    : (dir === 'right' && player.avatarRightPng)
    ? player.avatarRightPng
    : player.avatarPng || player.avatarDownPng || player.avatarUpPng || player.avatarLeftPng || player.avatarRightPng;
}

// Cápsula de fala do NPC: só texto digitado (até 3 falas, toque avança) + ações mínimas
const NpcCapsule: React.FC<{
  marker: MapMarker;
  playerInventory: Record<string, number>;
  getProg: (id: string) => { accepted: boolean; done: boolean; talked: string[]; dueled: string[] };
  questReady: (m: MapMarker, inv: Record<string, number>) => boolean;
  questText: (m: MapMarker, inv: Record<string, number>) => string;
  acceptQuest: (id: string) => void;
  completeQuest: (m: MapMarker) => void;
  onFalar: () => void;
  onTriggerEvent?: () => void;
  onClose: () => void;
}> = ({ marker, playerInventory, getProg, questReady, questText, acceptQuest, completeQuest, onFalar, onTriggerEvent, onClose }) => {
  const phrases = (marker.npcPhrases || []).filter((s) => (s || '').trim() !== '').slice(0, 3);
  const [pi, setPi] = useState(0);
  const [chars, setChars] = useState(0);
  const full = phrases.length > 0 ? phrases[Math.min(pi, phrases.length - 1)] : '';
  useEffect(() => {
    setChars(0);
  }, [pi, marker.id]);
  useEffect(() => {
    if (!full || chars >= full.length) return;
    const t = setTimeout(() => setChars((c) => c + 1), 28);
    return () => clearTimeout(t);
  }, [chars, full]);
  const tapText = () => {
    if (!full) return;
    if (chars < full.length) setChars(full.length);
    else if (pi < phrases.length - 1) setPi(pi + 1);
    else setPi(0);
  };
  const prog = getProg(marker.id);
  const ready = questReady(marker, playerInventory);
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const borderColor = marker.color || '#38bdf8';
  const hasQuest = Boolean(marker.quest || marker.linkedQuestId);
  const hasEvents = Boolean(marker.events && marker.events.length > 0);
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        tapText();
      }}
      className="flex items-center gap-1.5 rounded-2xl bg-white/95 backdrop-blur-xs border-[2.5px] px-2.5 py-1.5 max-w-full cursor-pointer transition-transform active:scale-95"
      style={{
        borderColor,
        boxShadow: `0 3px 0 ${borderColor}66, 0 8px 16px -4px rgba(15, 23, 42, 0.25)`,
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: borderColor }}
          />
          <p className="text-[10px] font-black text-slate-800 truncate leading-tight" title={marker.name}>
            {marker.name}
          </p>
        </div>
        <p
          className="text-[9.5px] font-semibold text-slate-600 leading-snug break-words mt-0.5 line-clamp-2"
          title={full || (marker.quest ? questText(marker, playerInventory) : '')}
        >
          {full ? (
            <>
              {full.slice(0, chars)}
              {chars < full.length && <span className="animate-pulse text-sky-500">▍</span>}
            </>
          ) : marker.quest ? (
            questText(marker, playerInventory)
          ) : (
            marker.description || 'Toque para interagir…'
          )}
        </p>
      </div>
      {hasQuest && !prog.accepted && (
        <button
          onClick={(e) => {
            stop(e);
            acceptQuest(marker.id);
          }}
          className="shrink-0 px-2 py-0.5 rounded-xl text-white text-[9.5px] font-black shadow-[0_2px_0_rgba(0,0,0,0.2)] active:translate-y-0.5"
          style={{ backgroundColor: borderColor }}
        >
          Aceitar
        </button>
      )}
      {marker.quest && prog.accepted && !prog.done && ready && (
        <button
          onClick={(e) => {
            stop(e);
            completeQuest(marker);
          }}
          className="shrink-0 px-2 py-0.5 rounded-xl bg-emerald-500 text-white text-[9.5px] font-black shadow-[0_2px_0_#047857] active:translate-y-0.5"
        >
          Entregar
        </button>
      )}
      {hasQuest && prog.done && <span className="text-[11px] shrink-0 pr-0.5">✔️</span>}
      {hasEvents && onTriggerEvent && (
        <button
          onClick={(e) => {
            stop(e);
            onTriggerEvent();
          }}
          className="shrink-0 px-1.5 py-0.5 rounded-xl bg-purple-500 border border-purple-600 text-white text-[9.5px] font-black shadow-[0_2px_0_#581c87] active:translate-y-0.5"
          title="Ativar Evento do NPC"
        >
          ⚡
        </button>
      )}
      {marker.dialogueEnabled && (
        <button
          onClick={(e) => {
            stop(e);
            onFalar();
          }}
          className="shrink-0 px-1.5 py-0.5 rounded-xl bg-amber-400 border border-amber-500 text-amber-950 text-[10px] font-black shadow-[0_2px_0_#b45309] active:translate-y-0.5"
        >
          💬
        </button>
      )}
      <button
        onClick={(e) => {
          stop(e);
          onClose();
        }}
        className="shrink-0 w-4 h-4 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 flex items-center justify-center transition-colors"
        title="Fechar"
      >
        <X className="w-2.5 h-2.5" />
      </button>
    </div>
  );
};

const DEFAULT_FOG_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 180" width="600" height="180">
  <defs>
    <radialGradient id="f1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="40%" stop-color="#f8fafc" stop-opacity="0.16"/>
      <stop offset="75%" stop-color="#f1f5f9" stop-opacity="0.05"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="f2" cx="35%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="60%" stop-color="#f8fafc" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="f3" cx="65%" cy="50%" r="45%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
      <stop offset="60%" stop-color="#f8fafc" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="300" cy="90" rx="270" ry="60" fill="url(#f1)"/>
  <ellipse cx="190" cy="95" rx="170" ry="45" fill="url(#f2)"/>
  <ellipse cx="410" cy="85" rx="170" ry="45" fill="url(#f3)"/>
</svg>
`.trim())}`;

const DEFAULT_CLOUD_SVG = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 140" width="280" height="140">
  <defs>
    <linearGradient id="cw" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="75%" stop-color="#f8fafc" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#e2e8f0" stop-opacity="0.45"/>
    </linearGradient>
    <filter id="cblur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="4"/>
    </filter>
  </defs>
  <g filter="url(#cblur)">
    <path d="M50,105 Q20,105 20,82 Q20,58 50,56 Q60,28 95,24 Q135,18 155,40 Q175,24 210,30 Q245,36 250,68 Q270,76 265,96 Q260,105 235,105 Z" fill="url(#cw)"/>
  </g>
</svg>
`.trim())}`;

const AUTUMN_LEAF_SVGS = [
  // 1. Folha Âmbar Dourada
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C13 5 17 6 18 9C19 12 17 15 15 17C14 18 13 21 12 22C11 21 10 18 9 17C7 15 5 12 6 9C7 6 11 5 12 2Z" fill="#f59e0b"/><path d="M12 4V20M12 9L15 7M12 13L16 11M12 10L9 8M12 14L8 12" stroke="#78350f" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
  // 2. Folha Laranja / Ferrugem
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 10 18 16C16 20 13 21 12 22C11 21 8 20 6 16C4 10 8 5 12 2Z" fill="#ea580c"/><path d="M12 4V21M12 8L16 6M12 12L17 10M12 9L8 7M12 13L7 11" stroke="#7c2d12" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
  // 3. Folha Vermelha / Carmesim
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 6 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 6 12 2Z" fill="#dc2626"/><path d="M12 3V21M12 7L16 6M12 11L17 10M12 8L8 7M12 12L7 11" stroke="#450a0a" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
];

const SPRING_LEAF_SVGS = [
  // 1. Pétala de Cerejeira / Sakura Rosa
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3C15 5 19 8 18 13C17 17 14 19 12 21C10 19 7 17 6 13C5 8 9 5 12 3Z" fill="#f472b6"/><path d="M12 6V18" stroke="#db2777" stroke-width="0.7" stroke-linecap="round"/><circle cx="12" cy="7" r="1.5" fill="#fdf2f8"/></svg>')}`,
  // 2. Pétala Sakura Magenta Vibrante
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#fb7185"/><path d="M12 5V19M12 9L15 7M12 13L16 11" stroke="#be123c" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
  // 3. Broto Verde Claro / Primavera
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 12C16 17 13 20 12 22C11 20 8 17 7 12C6 7 10 5 12 2Z" fill="#86efac"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#16a34a" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
];

const DRY_LEAF_SVGS = [
  // 1. Folha Seca Marrom Escuro
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 6 18 8 17 14C16 19 13 21 12 22C11 21 8 19 7 14C6 8 10 6 12 2Z" fill="#78350f"/><path d="M12 4V20M12 8L15 6M12 12L16 10M12 9L9 7M12 13L8 11" stroke="#451a03" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  // 2. Folha Quebradiça Ocre / Terra
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 9 18 15C16 20 13 21 12 22C11 21 8 20 6 15C5 9 9 5 12 2Z" fill="#92400e"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#451a03" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  // 3. Folha Seca Bege / Palha
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 17 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C7 7 10 5 12 2Z" fill="#b45309"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#78350f" stroke-width="0.8" stroke-linecap="round"/></svg>')}`,
];

const JUNGLE_LEAF_SVGS = [
  // 1. Folha Verde Esmeralda / Tropical
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 5 12 2Z" fill="#10b981"/><path d="M12 4V20M12 8L16 6M12 12L16 10M12 9L8 7M12 13L8 11" stroke="#064e3b" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  // 2. Folha Verde Limão Vibrante
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#84cc16"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#365314" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  // 3. Folha Floresta Escura
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C6 7 10 5 12 2Z" fill="#059669"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#022c22" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
];

const MYSTIC_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 5 12 2Z" fill="#a855f7"/><path d="M12 4V20M12 8L16 6M12 12L16 10M12 9L8 7M12 13L8 11" stroke="#3b0764" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#c084fc"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#581c87" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C6 7 10 5 12 2Z" fill="#e879f9"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#701a75" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
];

const FROST_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 5 12 2Z" fill="#38bdf8"/><path d="M12 4V20M12 8L16 6M12 12L16 10M12 9L8 7M12 13L8 11" stroke="#082f49" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#7dd3fc"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#0c4a6e" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C6 7 10 5 12 2Z" fill="#bae6fd"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#0369a1" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
];

const NEON_LEAF_SVGS = [
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C15 5 19 8 18 14C17 19 13 21 12 22C11 21 7 19 6 14C5 8 9 5 12 2Z" fill="#06b6d4"/><path d="M12 4V20M12 8L16 6M12 12L16 10M12 9L8 7M12 13L8 11" stroke="#164e63" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C16 5 20 9 18 15C16 19 13 21 12 22C11 21 8 19 6 15C4 9 8 5 12 2Z" fill="#f43f5e"/><path d="M12 4V21M12 8L16 6M12 12L16 10M12 9L8 7" stroke="#881337" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
  `data:image/svg+xml;utf8,${encodeURIComponent('<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C14 5 18 7 17 13C16 18 13 21 12 22C11 21 8 18 7 13C6 7 10 5 12 2Z" fill="#a855f7"/><path d="M12 4V20M12 8L15 6M12 12L15 10" stroke="#3b0764" stroke-width="0.9" stroke-linecap="round"/></svg>')}`,
];

function applyCustomTintToSvg(svgUrl: string, tintHex?: string): string {
  if (!tintHex) return svgUrl;
  try {
    const rawSvg = decodeURIComponent(svgUrl.replace('data:image/svg+xml;utf8,', ''));
    const tintedSvg = rawSvg.replace(/fill="([^"]+)"/g, `fill="${tintHex}"`);
    return `data:image/svg+xml;utf8,${encodeURIComponent(tintedSvg)}`;
  } catch (e) {
    return svgUrl;
  }
}

function getLeafGroupSvgs(preset?: string, customTint?: string) {
  let list = AUTUMN_LEAF_SVGS;
  switch (preset) {
    case 'spring': list = SPRING_LEAF_SVGS; break;
    case 'dry': list = DRY_LEAF_SVGS; break;
    case 'jungle': list = JUNGLE_LEAF_SVGS; break;
    case 'mystic': list = MYSTIC_LEAF_SVGS; break;
    case 'frost': list = FROST_LEAF_SVGS; break;
    case 'neon': list = NEON_LEAF_SVGS; break;
    case 'autumn':
    default:
      list = AUTUMN_LEAF_SVGS; break;
  }
  if (customTint) {
    return list.map((url) => applyCustomTintToSvg(url, customTint));
  }
  return list;
}

export const PortraitEmulator: React.FC<Props> = ({
  project,
  savedLevels = [],
  activeTab,
  canvasView,
  activeMarkerId,
  onSelectMarker,
  onTriggerImportPNG,
  scrollTargetY,
  testDialogueMarkerId,
  onCloseDialogue,
  onUpdatePlayer,
  onLoadLevel,
  onUpdateMarker,
  activeTool,
  onAddMotionMarkerAt,
  motionBrushSize = 12,
  motionAuto = true,
  onUpdateProject,
  motionEffect = 'glitter',
  motionSpeed = 1.0,
  motionIntensity = 1.0,
  testSpawnTriggerId,
  orientation = 'portrait',
  onToggleOrientation,
  isWebMode,
  onToggleWebMode,
  isPlayMode = false,
  isWorldMapSolo = false,
}) => {
  const isLandscape = orientation === 'landscape';
  const [internalWebMode, setInternalWebMode] = useState<boolean>(false);
  const effectiveWebMode = isLandscape && (isWebMode !== undefined ? isWebMode : internalWebMode);
  const handleToggleWebMode = (next: boolean) => {
    setInternalWebMode(next);
    onToggleWebMode?.(next);
  };
  const screenWidth = isLandscape ? 780 : SCREEN_WIDTH;
  const screenHeight = isLandscape ? 440 : SCREEN_HEIGHT;

  const containerRef = useRef<HTMLDivElement>(null);
  const containerSizeRef = useRef<{ w: number; h: number }>({ w: screenWidth, h: screenHeight });
  const lastPlayerZIndexRef = useRef<number>(-1);
  const lastEditorPlayerZRef = useRef<number>(-1);
  const lastEmulatorDrawnBoxRef = useRef<{ minX: number; minY: number; maxX: number; maxY: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const lastZoomKeyRef = useRef<string>('');

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      containerSizeRef.current = {
        w: el.clientWidth || screenWidth,
        h: el.clientHeight || screenHeight,
      };
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLandscape, screenWidth, screenHeight]);

  // Modo de Edição Inline no Emulador (Arrastar controles do HUD)
  const [draggingInlineElement, setDraggingInlineElement] = useState<string | null>(null);

  // ==================== SISTEMA DE SPAWN CINEMÁTICO ====================
  type SpawnPhase = 'idle' | 'fading' | 'approaching' | 'landed' | 'departing';
  const [spawnPhase, setSpawnPhase] = useState<SpawnPhase>('idle');
  const [spawnPos, setSpawnPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  // Controle explícito de visibilidade do herói durante o ciclo cinemático
  const [heroSpawnVisible, setHeroSpawnVisible] = useState<boolean>(true);
  // Intro Cutscene antes do Spawn
  const [introCutscene, setIntroCutscene] = useState<{
    url: string;
    speed: number;
    fadeColor: string;
    audioUrl?: string;
  } | null>(null);
  const introVideoElRef = useRef<HTMLVideoElement>(null);
  const introAudioElRef = useRef<HTMLAudioElement | null>(null);
  const introFadeTriggeredRef = useRef<boolean>(false);
  const spawnTransitParamsRef = useRef<{
    startX: number;
    startY: number;
    screenTargetX: number;
    screenTargetY: number;
    tgtX: number;
    tgtY: number;
    exitX: number;
    exitY: number;
    speed: number;
    pause: number;
  } | null>(null);

  // Helper para detectar se uma cor de desvanecer é de alta luminosidade (evita clarão/flash agressivo aos olhos)
  const isLightFadeColor = (hex?: string) => {
    if (!hex || hex === '#000000') return false;
    const clean = hex.replace('#', '');
    if (clean.length === 6) {
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return (r * 0.299 + g * 0.587 + b * 0.114) > 175;
    }
    return false;
  };

  const isSpawnActive = spawnPhase !== 'idle';
  // O player fica 100% invisível durante todo o ciclo até o pouso real no solo
  const isPlayerHiddenBySpawn =
    (!heroSpawnVisible || spawnPhase === 'fading' || spawnPhase === 'approaching' || Boolean(introCutscene)) &&
    project.spawnConfig?.hidePlayerDuringTransit !== false;
  // A UI de controles (joystick, mochila e dedinho) fica 100% oculta até terminar o desembarque do jogador
  const isControlsHiddenBySpawn =
    (!heroSpawnVisible || spawnPhase === 'fading' || spawnPhase === 'approaching' || spawnPhase === 'landed' || Boolean(introCutscene)) &&
    project.spawnConfig?.hidePlayerDuringTransit !== false;
  const lastSpawnTriggerIdRef = useRef<number | null>(null);

  const executeSpawnTransit = (
    p: {
      startX: number;
      startY: number;
      screenTargetX: number;
      screenTargetY: number;
      tgtX: number;
      tgtY: number;
      exitX: number;
      exitY: number;
      speed: number;
      pause: number;
    },
    activeColor?: string
  ) => {
    // 1. Revela a tela com transição cinematográfica gradual
    const color = activeColor || project.spawnConfig?.fadeColor || '#000000';
    const isLight = isLightFadeColor(color);
    const revealDuration = isLight ? 850 : 600;

    setFadeDurationMs(revealDuration);
    setTeleportFade('in');
    setTimeout(() => {
      setTeleportFade(null);
      setFadeDurationMs(500);
    }, revealDuration);

    // Garante que o herói está 100% invisível durante todo o voo de aproximação
    setHeroSpawnVisible(false);

    // 2. Inicia aproximação visível do transporte a partir de fora da tela
    setSpawnPos({ x: p.startX, y: p.startY });
    setSpawnPhase('approaching');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setSpawnPos({ x: p.screenTargetX, y: p.screenTargetY });
      });
    });

    // 3. Chegada no alvo (Pouso no solo)
    // O herói surge no solo EXATAMENTE no instante do pouso do transporte
    const flightDurationMs = Math.round(p.speed * 1000) + 40;
    setTimeout(() => {
      setSpawnPhase('landed');
      setHeroSpawnVisible(true);

      if (playerRef.current) {
        playerRef.current.x = p.tgtX;
        playerRef.current.y = p.tgtY;
      }
      if (playerDomRef.current) {
        playerDomRef.current.style.transform = `translate3d(${p.tgtX * scale}px, ${p.tgtY * scale}px, 0) translate(-50%, -100%)`;
        const newZ = Math.round(p.tgtY * scale);
        lastPlayerZIndexRef.current = newZ;
        playerDomRef.current.style.zIndex = `${newZ}`;
      }

      // 4. Inicia saída do transporte após a pausa de desembarque
      setTimeout(() => {
        setSpawnPhase('departing');
        setSpawnPos({ x: p.exitX, y: p.exitY });

        // 5. Finaliza quando o transporte sair completamente do frame da tela
        setTimeout(() => {
          setSpawnPhase('idle');
          if (onUpdatePlayerRef.current) {
            onUpdatePlayerRef.current({ x: p.tgtX, y: p.tgtY });
          }
        }, (p.speed * 0.95 + 0.25) * 1000);
      }, p.pause * 1000);
    }, flightDurationMs);
  };

  const finishIntroVideoAndStartSpawn = () => {
    const currentCutscene = introCutscene;
    const color = currentCutscene?.fadeColor || project.spawnConfig?.fadeColor || '#000000';
    setFadeColor(color);

    // Fade out suave do áudio personalizado para evitar corte abrupto
    if (introAudioElRef.current) {
      const audio = introAudioElRef.current;
      let vol = audio.volume;
      const fadeAudioInterval = setInterval(() => {
        vol = Math.max(0, vol - 0.2);
        audio.volume = vol;
        if (vol <= 0.05) {
          clearInterval(fadeAudioInterval);
          audio.pause();
          introAudioElRef.current = null;
        }
      }, 50);
    }

    // Se a sobreposição já iniciou pelo segundo final do vídeo, mantém o preenchimento;
    // Se foi pulado pelo botão, faz fade suave em 700ms (sem cortes secos ou flash de 200ms)
    if (!introFadeTriggeredRef.current) {
      setFadeDurationMs(700);
      setTeleportFade('out');
    }
    setIntroCutscene(null);

    // Dura exatamente 1,5 segundo na cor escolhida até ir para o spawn
    setTimeout(() => {
      const p = spawnTransitParamsRef.current;
      if (p) {
        executeSpawnTransit(p, color);
      }
    }, 1500);
  };

  const runSpawnAnimation = (force: boolean = false) => {
    const rawCfg = project.spawnConfig;
    if (!force && (!rawCfg || !rawCfg.enabled)) return;

    // Configuração com defaults garantidos (evita que o transporte falhe se não configurado)
    const cfg = {
      enabled: true,
      targetX: rawCfg?.targetX ?? project.player?.x ?? 384,
      targetY: rawCfg?.targetY ?? project.player?.y ?? 100,
      transportPng: rawCfg?.transportPng || DEFAULT_SPAWN_VEHICLE_PNG,
      transportName: rawCfg?.transportName || 'Águia Lendária',
      transportScale: rawCfg?.transportScale || 1.15,
      entryDirection: rawCfg?.entryDirection || 'top',
      speed: rawCfg?.speed || 1.5,
      landingPause: rawCfg?.landingPause || 0.85,
      effect: rawCfg?.effect || 'jelly',
      effectIntensity: rawCfg?.effectIntensity || 0.6,
      cameraFraming: rawCfg?.cameraFraming || 'lower_half',
      hidePlayerDuringTransit: rawCfg?.hidePlayerDuringTransit !== false,
    };

    const tgtX = cfg.targetX;
    const tgtY = cfg.targetY;
    const dir = cfg.entryDirection;
    const speed = cfg.speed;
    const pause = cfg.landingPause;

    // Dimensões do FRAME DA TELA DO PREVIEW (celular retrato ou paisagem)
    const clientH = containerRef.current?.clientHeight || screenHeight;
    const clientW = containerRef.current?.clientWidth || screenWidth;
    const maxScrollTop = Math.max(0, scaledMapHeight - clientH);
    const maxScrollLeft = Math.max(0, scaledMapWidth - clientW);

    // Enquadramento de Câmera da Fase (Alvo centralizado na metade inferior adaptado à orientação)
    const targetScrollY = cfg.cameraFraming === 'lower_half'
      ? tgtY * scale - (clientH * (isLandscape ? 0.62 : 0.72))
      : tgtY * scale - (clientH / 2);

    const targetScrollX = tgtX * scale - (clientW / 2);

    const clampedTop = Math.max(0, Math.min(maxScrollTop, targetScrollY));
    const clampedLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollX));

    // A câmera já se posiciona no alvo da fase para receber o transporte
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: clampedTop,
        left: clampedLeft,
        behavior: 'instant' as any,
      });
    }

    // Coordenadas do ALVO na TELA do preview
    const screenTargetX = Math.round(tgtX * scale - clampedLeft);
    const screenTargetY = Math.round(tgtY * scale - clampedTop);

    // 1. Origem SEMPRE DE FORA DO FRAME DA TELA DO PREVIEW (não do canvas)
    const userScale = cfg.transportScale || 1.35;
    // Margem dinâmica de segurança baseada na escala do PNG:
    // Garante que mesmo com escala 600% o veículo comece e termine 100% fora do frame
    const safeMarginX = Math.max(350, Math.round((160 * userScale) / 2 + 150));
    const safeMarginY = Math.max(350, Math.round((160 * userScale) / 2 + 150));

    let startX = screenTargetX;
    let startY = screenTargetY;
    if (dir === 'top') {
      startY = -safeMarginY;
    } else if (dir === 'bottom') {
      startY = clientH + safeMarginY;
    } else if (dir === 'left') {
      startX = -safeMarginX;
    } else if (dir === 'right') {
      startX = clientW + safeMarginX;
    }

    // Ponto de saída conforme regra do usuário:
    // Veio de cima -> Volta para cima (sai pelo topo)
    // Veio de baixo -> Volta para baixo (sai por baixo)
    // Veio da esquerda -> Sai pela direita (atravessa até passar a borda direita)
    // Veio da direita -> Sai pela esquerda (atravessa até passar a borda esquerda)
    let exitX = screenTargetX;
    let exitY = screenTargetY;
    if (dir === 'top') {
      exitY = -safeMarginY;
    } else if (dir === 'bottom') {
      exitY = clientH + safeMarginY;
    } else if (dir === 'left') {
      exitX = clientW + safeMarginX;
    } else if (dir === 'right') {
      exitX = -safeMarginX;
    }

    const chosenFadeColor = rawCfg?.fadeColor || '#000000';
    const introVideoUrl = rawCfg?.introVideoUrl;
    const videoSpeed = rawCfg?.introVideoSpeed || 1.0;
    const shouldFade = rawCfg?.fadeTransition !== false;

    spawnTransitParamsRef.current = {
      startX,
      startY,
      screenTargetX,
      screenTargetY,
      tgtX,
      tgtY,
      exitX,
      exitY,
      speed,
      pause,
    };

    // Oculta imediatamente o herói antes de qualquer fade ou cutscene
    setHeroSpawnVisible(false);

    // Cenário 1: Vídeo de Introdução antes do Spawn
    if (introVideoUrl) {
      setSpawnPos({ x: startX, y: startY });
      setSpawnPhase('fading');
      introFadeTriggeredRef.current = false;
      setIntroCutscene({
        url: introVideoUrl,
        speed: videoSpeed,
        fadeColor: chosenFadeColor,
        audioUrl: rawCfg?.introAudioUrl,
      });

      // Se tiver áudio personalizado configurado, inicia a reprodução do MP3 sincronizada
      if (rawCfg?.introAudioUrl) {
        try {
          if (introAudioElRef.current) {
            introAudioElRef.current.pause();
            introAudioElRef.current = null;
          }
          const audio = new Audio(rawCfg.introAudioUrl);
          audio.volume = 1.0;
          audio.playbackRate = videoSpeed;
          audio.play().catch(() => {});
          introAudioElRef.current = audio;
        } catch (err) {
          console.warn('Erro ao tocar áudio opcional:', err);
        }
      }
      return;
    }

    // Cenário 2: Desvanecer de Tela sem Vídeo (com cor customizada e duração de 1.5s)
    if (shouldFade) {
      setSpawnPos({ x: startX, y: startY });
      setSpawnPhase('fading');
      setFadeColor(chosenFadeColor);
      const isLight = isLightFadeColor(chosenFadeColor);
      setFadeDurationMs(isLight ? 600 : 350);
      setTeleportFade('out');
      // Segura na cor escolhida por exatamente 1.5 segundo (1500ms)
      setTimeout(() => {
        if (spawnTransitParamsRef.current) {
          executeSpawnTransit(spawnTransitParamsRef.current, chosenFadeColor);
        }
      }, 1500);
    } else {
      executeSpawnTransit(spawnTransitParamsRef.current, chosenFadeColor);
    }
  };

  // Monitora trigger manual de teste de spawn
  useEffect(() => {
    if (testSpawnTriggerId && testSpawnTriggerId !== lastSpawnTriggerIdRef.current) {
      lastSpawnTriggerIdRef.current = testSpawnTriggerId;
      runSpawnAnimation(true);
    }
  }, [testSpawnTriggerId]);

  // Executa no carregamento inicial da fase se o spawn estiver ativado
  const hasRunInitialSpawnRef = useRef(false);
  useEffect(() => {
    if (!hasRunInitialSpawnRef.current && project.spawnConfig?.enabled) {
      hasRunInitialSpawnRef.current = true;
      const timer = setTimeout(() => {
        runSpawnAnimation();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [project.spawnConfig?.enabled]);

  // Zoom de câmera do bioma/fase (blending suave via CSS transition, sem custo por frame)
  const applyCameraZoomFor = (x: number, y: number) => {
    let key: string;
    let target: number;
    if (isExtended) {
      const list = project.subBiomes || [];
      let cx = 0;
      let hitId: string | null = null;
      let hitZoom = 1.0;
      for (const sb of list) {
        const w = sb.tileWidth || 400;
        if (x >= cx && x < cx + w) {
          hitId = sb.id;
          hitZoom = sb.cameraZoom ?? 1.0;
          break;
        }
        cx += w + 40;
      }
      key = `s:${hitId ?? 'none'}`;
      target = hitZoom;
    } else {
      const b = getBiomeAtY(y, spans);
      key = `v:${b?.id ?? 'none'}`;
      target = b?.cameraZoom ?? 1.0;
    }
    if (key === lastZoomKeyRef.current) return;
    lastZoomKeyRef.current = key;
    setZoomVisual(target, x * scale, y * scale);
  };

  // Trilha Sonora / BGM do Bioma ou Fase (com proteção contra repetições e cortes + ducking blend_bgm)
  const bgmAudioRef = useRef<HTMLAudioElement | null>(null);
  const currentBgmUrlRef = useRef<string>('');
  const bgmDuckingFactorRef = useRef<number>(1.0);
  const activeCinematicCancelRef = useRef<(() => void) | null>(null);
  const [isBgmMuted, setIsBgmMuted] = useState(false);

  const syncBiomeBgmFor = (x: number, y: number) => {
    let targetUrl: string | undefined;
    let baseVol = 0.7;

    if (isExtended) {
      const list = projectRef.current.subBiomes || [];
      let cx = 0;
      for (const sb of list) {
        const w = sb.tileWidth || 400;
        if (x >= cx && x < cx + w) {
          targetUrl = sb.bgmAudioUrl;
          baseVol = sb.bgmVolume ?? 0.7;
          break;
        }
        cx += w + 40;
      }
    } else {
      const b = getBiomeAtY(y, spans);
      targetUrl = b?.bgmAudioUrl;
      baseVol = b?.bgmVolume ?? 0.7;
    }

    const targetVol = Math.max(0, Math.min(1, baseVol * bgmDuckingFactorRef.current));
    const safeUrl = targetUrl || '';
    // SE O ÁUDIO É O MESMO (OU REPETIÇÃO DO MESMO BIOMA): NÃO REINICIA NEM CORTA!
    if (currentBgmUrlRef.current === safeUrl) {
      if (bgmAudioRef.current && !isBgmMuted) {
        bgmAudioRef.current.volume = targetVol;
      }
      return;
    }

    currentBgmUrlRef.current = safeUrl;

    if (bgmAudioRef.current) {
      const oldAudio = bgmAudioRef.current;
      let fadeOutVol = oldAudio.volume;
      const fadeInterval = setInterval(() => {
        fadeOutVol = Math.max(0, fadeOutVol - 0.1);
        oldAudio.volume = fadeOutVol;
        if (fadeOutVol <= 0) {
          clearInterval(fadeInterval);
          oldAudio.pause();
          oldAudio.src = '';
        }
      }, 50);
      bgmAudioRef.current = null;
    }

    if (safeUrl && !isBgmMuted) {
      const audio = new Audio(safeUrl);
      audio.loop = true;
      audio.volume = 0;
      audio.play().then(() => {
        let fadeInVol = 0;
        const fadeInterval = setInterval(() => {
          fadeInVol = Math.min(targetVol, fadeInVol + 0.1);
          audio.volume = fadeInVol;
          if (fadeInVol >= targetVol) {
            clearInterval(fadeInterval);
          }
        }, 50);
      }).catch((e) => {
        console.warn('Audio play prevented or error:', e);
      });
      bgmAudioRef.current = audio;
    }
  };

  // Áudios Espaciais / Sons por Área ativos (por markerId)
  const spatialAudiosRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const soundOncePlayedMarkerIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      if (bgmAudioRef.current) {
        bgmAudioRef.current.pause();
        bgmAudioRef.current.src = '';
        bgmAudioRef.current = null;
      }
      spatialAudiosRef.current.forEach((audio) => {
        audio.pause();
        audio.src = '';
      });
      spatialAudiosRef.current.clear();
      soundOncePlayedMarkerIdsRef.current.clear();
    };
  }, []);

  useEffect(() => {
    spatialAudiosRef.current.forEach((audio) => {
      audio.muted = isBgmMuted;
    });
  }, [isBgmMuted]);
  // Aplica o zoom no mundo e NEUTRALIZA nuvens/chuva/alvorecer (atmosfera não zooma)
  const setZoomVisual = (z: number, ox: number, oy: number) => {
    camZoomValRef.current = z;
    camOriginRef.current = { x: ox, y: oy };
    const el = contentRef.current;
    if (el) {
      el.style.transformOrigin = `${ox}px ${oy}px`;
      el.style.transform = z !== 1 ? `scale(${z})` : '';
    }
    const inv = z !== 1 ? `scale(${1 / z})` : '';
    for (const layer of [rainLayerRef.current, dawnLayerRef.current, cloudsLayerRef.current, groundFogLayerRef.current]) {
      if (!layer) continue;
      layer.style.transformOrigin = `${ox}px ${oy}px`;
      layer.style.transform = inv;
    }
  };
  // Camadas de atmosfera (neutralizadas no zoom)
  const rainLayerRef = useRef<HTMLDivElement>(null);
  const dawnLayerRef = useRef<HTMLDivElement>(null);
  const cloudsLayerRef = useRef<HTMLDivElement>(null);
  const groundFogLayerRef = useRef<HTMLDivElement>(null);
  const lastCloudMaskRef = useRef<string>('');
  // Mantém nuvens e neblina visíveis por toda a tela de forma rica e imersiva
  const updateCloudMask = () => {
    if (cloudsLayerRef.current && cloudsLayerRef.current.style.maskImage) {
      cloudsLayerRef.current.style.maskImage = '';
      (cloudsLayerRef.current.style as any).webkitMaskImage = '';
    }
    if (groundFogLayerRef.current && groundFogLayerRef.current.style.maskImage) {
      groundFogLayerRef.current.style.maskImage = '';
      (groundFogLayerRef.current.style as any).webkitMaskImage = '';
    }
  };
  useEffect(() => {
    updateCloudMask();
  });
  const camZoomValRef = useRef<number>(1);
  const camOriginRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const playerDomRef = useRef<HTMLDivElement>(null);
  const activeTrampledGrassIdsRef = useRef<Set<string>>(new Set());
  const grassElementsMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const gameplayMarkersRef = useRef<MapMarker[]>([]);
  const grassSpatialBucketsRef = useRef<Map<number, MapMarker[]>>(new Map());
  const [visibleScrollBand, setVisibleScrollBand] = useState<number>(0);
  const lastScrollBandRef = useRef<number>(0);
  const lastParentUpdateRef = useRef<number>(0);
  const [inspectedMarker, setInspectedMarker] = useState<MapMarker | null>(null);

  // Estado do Joystick Digital
  const [isJoystickActive, setIsJoystickActive] = useState(false);
  // Locomoção: joystick analógico ou toque-no-mapa (dedinho). Toque respeita a mesma colisão.
  const [locomotion, setLocomotion] = useState<'joystick' | 'tap'>('joystick');
  const locomotionRef = useRef<'joystick' | 'tap'>('joystick');
  useEffect(() => {
    locomotionRef.current = locomotion;
  }, [locomotion]);
  const tapTargetRef = useRef<{ x: number; y: number } | null>(null);
  const tapDownRef = useRef<{ x: number; y: number } | null>(null);
  // Rota interna por waypoints (marcadores) + linha desenhada + anti-travamento
  const tapWayRef = useRef<{ x: number; y: number }[]>([]);
  const stuckRef = useRef<{ x: number; y: number; t: number } | null>(null);
  // Configurações ativas de Telas e HUD para Joystick, Mochila e Controles
  const screensConfig = getOrCreateScreensConfig(project);
  const activeScreenConfig =
    screensConfig.screens.find((s) => s.id === (isLandscape ? 'screen_player_hud_landscape' : 'screen_player_hud')) ||
    screensConfig.screens.find((s) => s.id === screensConfig.activeScreenId) ||
    screensConfig.screens[0];
  const hudConfig = activeScreenConfig?.hudConfig;
  const joystickConfig = hudConfig?.joystick;
  const backpackConfig = hudConfig?.backpackButton;
  const touchMoveConfig = hudConfig?.touchMoveButton;

  // Vetor em REF (sem re-render por touchmove) + knob via DOM direto: fluidez total
  const joystickVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastMoveDirRef = useRef<{ x: number; y: number }>({ x: 0, y: 1 });
  const knobRef = useRef<HTMLDivElement>(null);
  const lastDirectionRef = useRef<string>('down');

  // Estado e Refs de Dash Rápido do Jogador (substitui o pulo e preserva a última direção quando parado)
  const [isDashActive, setIsDashActive] = useState(false);
  const activeDashRef = useRef<{
    startTime: number;
    endTime: number;
    dirX: number;
    dirY: number;
    speedPxPerSec: number;
  } | null>(null);
  const dashCooldownUntilRef = useRef<number>(0);

  // Estado e Refs do Pet Companheiro (trilha do herói, passeio curioso, estilos de ataque, projéteis e tontura 50% PV)
  const petDomRef = useRef<HTMLDivElement>(null);
  const playerTrailRef = useRef<{ x: number; y: number }[]>([]);
  const petRuntimeRef = useRef<{
    x: number;
    y: number;
    initialized: boolean;
    curiousAngle: number;
    curiousTargetOffset: { x: number; y: number };
    nextCuriousChangeAt: number;
    combatTargetId: string | null;
    lastAttackTime: number;
    attackLungeUntil: number;
    attackLungeTarget: { x: number; y: number } | null;
    spinUntil: number;
    facingLeft: boolean;
    emoteText: string | null;
    emoteUntil: number;
  }>({
    x: 384,
    y: 128,
    initialized: false,
    curiousAngle: 0,
    curiousTargetOffset: { x: -34, y: 24 },
    nextCuriousChangeAt: 0,
    combatTargetId: null,
    lastAttackTime: 0,
    attackLungeUntil: 0,
    attackLungeTarget: null,
    spinUntil: 0,
    facingLeft: false,
    emoteText: null,
    emoteUntil: 0,
  });

  const petProjectilesRef = useRef<
    {
      id: string;
      x: number;
      y: number;
      targetId: string;
      targetX: number;
      targetY: number;
      speed: number;
      damage: number;
      emoji: string;
      color: string;
    }[]
  >([]);
  const [petProjectilesState, setPetProjectilesState] = useState<
    {
      id: string;
      x: number;
      y: number;
      targetId: string;
      targetX: number;
      targetY: number;
      speed: number;
      damage: number;
      emoji: string;
      color: string;
    }[]
  >([]);

  const [stunnedNpcsInfo, setStunnedNpcsInfo] = useState<
    Map<string, { remainingSec: number; currentHp: number; maxHp: number }>
  >(new Map());
  const lastStunSyncRef = useRef<number>(0);
  const [isPetCareOpen, setIsPetCareOpen] = useState(false);

  const setVector = (x: number, y: number) => {
    // Deadzone: ignora tremor perto do centro
    const mag = Math.hypot(x, y);
    if (mag < 0.12) {
      x = 0;
      y = 0;
    } else {
      lastMoveDirRef.current = { x: x / mag, y: y / mag };
    }
    joystickVectorRef.current = { x, y };
    if (knobRef.current) {
      const maxRadius = joystickConfig?.maxRadius ?? 38;
      const maxTravel = maxRadius * 0.72;
      knobRef.current.style.transform = `translate3d(${x * maxTravel}px, ${y * maxTravel}px, 0)`;
    }
    // Direção do sprite só quando MUDA (evita re-render por movimento)
    let dir = lastDirectionRef.current;
    if (x !== 0 || y !== 0) {
      dir = Math.abs(x) > Math.abs(y) ? (x > 0 ? 'right' : 'left') : (y > 0 ? 'down' : 'up');
    }
    if (dir !== lastDirectionRef.current) {
      lastDirectionRef.current = dir;
      setPlayerDirection(dir as 'up' | 'down' | 'left' | 'right');
    }
  };
  const joystickTouchIdRef = useRef<number | null>(null);
  const joystickCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pressedKeysRef = useRef<Set<string>>(new Set());

  // Direção atual do jogador (atualizada em setVector só quando MUDA, sem re-render por movimento)
  const [playerDirection, setPlayerDirection] = useState<'up' | 'down' | 'left' | 'right' | 'idle'>('down');

  // Dispara o Dash Rápido na direção atual do joystick (ou preserva a última direção quando parado)
  const triggerPlayerDash = () => {
    const now = performance.now();
    if (now < dashCooldownUntilRef.current) {
      return;
    }
    const dashCfg = projectRef.current.player?.dashConfig || {
      distance: 115,
      durationMs: 180,
      cooldownMs: 420,
    };
    const distance = Math.max(40, dashCfg.distance ?? 115);
    const durationMs = Math.max(90, dashCfg.durationMs ?? 180);
    const cooldownMs = Math.max(120, dashCfg.cooldownMs ?? 420);

    const jv = joystickVectorRef.current;
    const jMag = Math.hypot(jv.x, jv.y);
    let dirX = 0;
    let dirY = 1;
    if (jMag > 0.1) {
      dirX = jv.x / jMag;
      dirY = jv.y / jMag;
      lastMoveDirRef.current = { x: dirX, y: dirY };
    } else {
      const last = lastMoveDirRef.current;
      const lMag = Math.hypot(last.x, last.y);
      if (lMag > 0.05) {
        dirX = last.x / lMag;
        dirY = last.y / lMag;
      } else {
        const dStr = lastDirectionRef.current;
        if (dStr === 'up') { dirX = 0; dirY = -1; }
        else if (dStr === 'left') { dirX = -1; dirY = 0; }
        else if (dStr === 'right') { dirX = 1; dirY = 0; }
        else { dirX = 0; dirY = 1; }
      }
    }

    activeDashRef.current = {
      startTime: now,
      endTime: now + durationMs,
      dirX,
      dirY,
      speedPxPerSec: (distance / durationMs) * 1000,
    };
    dashCooldownUntilRef.current = now + durationMs + cooldownMs;
    setIsDashActive(true);
    setActionFeedback('💨 Dash Rápido!');
    setTimeout(() => setActionFeedback(null), 1100);
  };

  // Concede EXP ao Pet ativo ao derrotar inimigos (subindo de nível e crescendo de tamanho!)
  const grantPetCombatXp = (xpGain: number) => {
    const curPlayer = projectRef.current.player;
    if (!curPlayer || !onUpdateProject) return;
    const resolved = getResolvedPlayerPetConfig(curPlayer);
    const activePet = resolved.activePet;
    if (!activePet) return;

    let level = activePet.level || 1;
    let maxXp = activePet.maxXp || level * 100;
    let xp = (activePet.xp || 0) + xpGain;
    let maxHp = activePet.maxHp || 120;
    let hp = activePet.hp ?? maxHp;
    let attackDamage = activePet.attackDamage || 25;
    let defense = activePet.defense || 12;
    let leveledUp = false;

    while (xp >= maxXp) {
      xp -= maxXp;
      level += 1;
      maxXp = Math.round(maxXp * 1.25);
      maxHp += 22;
      hp = maxHp;
      attackDamage += 5;
      defense += 3;
      leveledUp = true;
    }

    const updatedPet: PlayerPetCatalogItem = {
      ...activePet,
      level,
      xp,
      maxXp,
      hp,
      maxHp,
      attackDamage,
      defense,
    };

    const nextGallery = resolved.petGallery.map((p) => (p.id === updatedPet.id ? updatedPet : p));
    onUpdateProject({
      player: {
        ...curPlayer,
        petConfig: {
          ...(curPlayer.petConfig || {}),
          enabled: resolved.enabled,
          activePetId: updatedPet.id,
          equippedPetIds: resolved.equippedPetIds,
          activePetSlotIndex: resolved.activePetSlotIndex,
          petGallery: nextGallery,
          attackDamage: updatedPet.attackDamage,
        },
      },
    });

    if (leveledUp) {
      petRuntimeRef.current.emoteText = `⭐ LEVEL UP! Nv.${level} (+Tamanho!)`;
      petRuntimeRef.current.emoteUntil = performance.now() + 2800;
      setActionFeedback(`🐾🎉 ${updatedPet.name} subiu para o Nível ${level} e cresceu!`);
      setTimeout(() => setActionFeedback(null), 3200);
    }
  };

  // Comando de Ataque: o Pet foca no Mobby inimigo e ataca continuamente até 50% PV (15s de Tontura)
  const triggerPlayerOrPetAttack = () => {
    const nowMs = performance.now();
    const curPlayer = projectRef.current.player;
    const resolvedPet = getResolvedPlayerPetConfig(curPlayer);
    const px = playerRef.current?.x ?? curPlayer?.x ?? 384;
    const py = playerRef.current?.y ?? curPlayer?.y ?? 100;

    const subList = projectRef.current.subBiomes || [];
    const getOriginX = (sbId?: string): number => {
      if (!isExtended || !sbId) return 0;
      let cx = 0;
      for (const sb of subList) {
        if (sb.id === sbId) return cx;
        cx += (sb.tileWidth || 400) + 40;
      }
      return 0;
    };

    const searchRange = resolvedPet.enabled ? Math.max(220, resolvedPet.attackRange + 50) : 130;
    let nearestNpc: MapMarker | null = null;
    let nearestDist = Infinity;

    for (const m of gameplayMarkersRef.current || []) {
      if (m.type !== 'npc' || !m.actionNpc?.enabled) continue;
      const rs = globalNpcActionEngine.getRuntimeState(m.id);
      if (rs && rs.currentHp <= 0) continue;
      const live = npcLivePositionsRef.current.get(m.id);
      const mx = getOriginX(m.subBiomeId) + (live ? live.x : m.x);
      const my = live ? live.y : m.y;
      const d = Math.hypot(mx - px, my - py);
      if (d <= searchRange && d < nearestDist) {
        nearestDist = d;
        nearestNpc = m;
      }
    }

    if (resolvedPet.enabled) {
      if (nearestNpc) {
        petRuntimeRef.current.combatTargetId = nearestNpc.id;
        const rs = globalNpcActionEngine.getRuntimeState(nearestNpc.id);
        if (rs?.stunUntil && nowMs < rs.stunUntil) {
          setActionFeedback(`💫 ${nearestNpc.name} está tonto (50% PV)! Escolha Batalhar ou Escanear!`);
          setTimeout(() => setActionFeedback(null), 2400);
        } else {
          petRuntimeRef.current.emoteText = `⚔️ Atacando ${nearestNpc.name}!`;
          petRuntimeRef.current.emoteUntil = nowMs + 1600;
          setActionFeedback(`🐾 ${resolvedPet.name} atacou ${nearestNpc.name}!`);
          setTimeout(() => setActionFeedback(null), 1800);
        }
      } else {
        petRuntimeRef.current.emoteText = '🐾 ? (Sem inimigos perto)';
        petRuntimeRef.current.emoteUntil = nowMs + 1400;
        setActionFeedback(`🐾 ${resolvedPet.name} procurou inimigos por perto...`);
        setTimeout(() => setActionFeedback(null), 1600);
      }
    } else if (nearestNpc) {
      const res = globalNpcActionEngine.applyDamage(
        nearestNpc.id,
        25,
        { x: px, y: py },
        'player',
        nowMs
      );
      if (res.enteredStun) {
        setActionFeedback(`💫 ${nearestNpc.name} atingiu 50% PV e entrou em Tontura por 15s!`);
      } else {
        setActionFeedback(`⚔️ Golpe em ${nearestNpc.name}!`);
      }
      setTimeout(() => setActionFeedback(null), 1800);
    } else {
      setActionFeedback('⚔️ Golpe executado!');
      setTimeout(() => setActionFeedback(null), 1500);
    }
  };

  // Escaneia um Mobby tonto (50% PV): Zoom cinematográfico -> Tela Preta -> Retorno com Mobby sumindo e agendando Respawn!
  const handleScanStunnedMobToDeck = (marker: MapMarker) => {
    const curPlayer = projectRef.current.player;
    if (!curPlayer || !onUpdateProject) return;

    const nowMs = performance.now();
    // 1. Congela brevemente o movimento durante o escaneamento e oculta a cápsula de tontura imediatamente
    eventFreezeUntilRef.current = nowMs + 1150;
    const rs = globalNpcActionEngine.getRuntimeState(marker.id);
    if (rs) {
      rs.stunUntil = 0;
    }
    setStunnedNpcsInfo((prev) => {
      const next = new Map(prev);
      next.delete(marker.id);
      return next;
    });
    if (petRuntimeRef.current.combatTargetId === marker.id) {
      petRuntimeRef.current.combatTargetId = null;
    }

    // Calcula posição visual do Mobby para o Zoom Cinematográfico
    const subList = projectRef.current.subBiomes || [];
    let originX = 0;
    if (isExtended && marker.subBiomeId) {
      for (const sb of subList) {
        if (sb.id === marker.subBiomeId) break;
        originX += (sb.tileWidth || 400) + 40;
      }
    }
    const live = npcLivePositionsRef.current.get(marker.id);
    const mobX = originX + (live ? live.x : marker.x);
    const mobY = live ? live.y : marker.y;

    // 2. Aplica ZOOM suave focado no Mobby sendo escaneado
    const prevZoom = camZoomValRef.current || 1;
    if (contentRef.current) {
      contentRef.current.style.transition = 'transform 340ms cubic-bezier(0.22, 1, 0.36, 1)';
    }
    setZoomVisual(Math.max(1.65, prevZoom * 1.45), mobX * scale, mobY * scale);
    setActionFeedback(`🔍 Escaneando matriz genética de "${marker.name}"...`);

    // 3. Após o Zoom (320ms), entra na TELA PRETA
    setTimeout(() => {
      setFadeColor('#000000');
      setFadeDurationMs(380);
      setTeleportFade('out');
    }, 320);

    // 4. No ápice da Tela Preta (720ms): O Mobby SOME do mapa (agenda respawn conforme regra), salva a Carta no Deck e retorna a câmera!
    setTimeout(() => {
      const latestPlayer = projectRef.current.player || curPlayer;
      const resolved = getResolvedPlayerPetConfig(latestPlayer);
      const scannedCardId = `pet-scanned-${marker.id}`;
      const existingCard = resolved.petGallery.find(
        (p) => p.id === scannedCardId || p.scannedFromMarkerId === marker.id
      );

      const isSlime = isSlimeMarker(marker);
      const mobMaxHp = Math.max(90, (marker.actionNpc?.maxHealth || marker.actionNpc?.maxHp || 100) + 30);
      const mobDmg = Math.max(22, (marker.actionNpc?.attackDamage || 20) + 10);

      const newCard: PlayerPetCatalogItem = existingCard
        ? {
            ...existingCard,
            level: (existingCard.level || 1) + 1,
            maxHp: (existingCard.maxHp || mobMaxHp) + 25,
            hp: (existingCard.maxHp || mobMaxHp) + 25,
            attackDamage: (existingCard.attackDamage || mobDmg) + 6,
          }
        : {
            id: scannedCardId,
            name: `${marker.name}`,
            iconEmoji: isSlime ? '💧' : '👾',
            avatarPng: marker.customIconPng,
            rarity: 'legendary',
            roleLabel: isSlime ? 'Slime Escaneado' : 'Mobby Escaneado',
            shortDescription: `Carta escaneada em combate de ${marker.name} (50% PV Tontura).`,
            detailedLore: `Monstro capturado pelo Scanner durante o estado de Tontura de 15s. Pode ser equipado nos 3 slots do Deck para ser invocado como Pet aliado!`,
            hp: mobMaxHp,
            maxHp: mobMaxHp,
            defense: 18,
            level: 1,
            xp: 0,
            maxXp: 100,
            growthPerLevel: 0.09,
            locomotionType: marker.actionNpc?.combatStyle === 'ranged_kite' ? 'flying' : 'walker',
            attackStyle:
              marker.actionNpc?.combatStyle === 'ranged_kite'
                ? 'flying_ranged'
                : isSlime
                ? 'walker_dash'
                : 'berserker_spin',
            aiAggroMode: 'command_auto',
            projectileEmoji: isSlime ? '💧' : '✨',
            attackDamage: mobDmg,
            attackRange: 210,
            scale: 0.85,
            followLagSteps: 11,
            curiousRadius: 46,
            curiousSpeed: 1.1,
            color: marker.color || '#38bdf8',
            scannedFromMarkerId: marker.id,
          };

      const nextGallery = existingCard
        ? resolved.petGallery.map((p) => (p.id === existingCard.id ? newCard : p))
        : [...resolved.petGallery, newCard];

      const nextSlots: [string | null, string | null, string | null] = [
        resolved.equippedPetIds[0] ?? null,
        resolved.equippedPetIds[1] ?? null,
        resolved.equippedPetIds[2] ?? null,
      ];
      if (!nextSlots.includes(newCard.id)) {
        const emptyIdx = nextSlots.findIndex((id) => !id);
        if (emptyIdx !== -1) {
          nextSlots[emptyIdx] = newCard.id;
        }
      }

      // Faz o Mobby inimigo sumir do mapa e agenda seu Respawn conforme a regra configurada!
      const respawnInfo = globalNpcActionEngine.despawnAndScheduleRespawn(
        marker.id,
        marker,
        performance.now()
      );
      const mobEl = markerElMapRef.current.get(marker.id);
      if (mobEl) {
        mobEl.style.display = 'none';
      }

      onUpdateProject({
        player: {
          ...latestPlayer,
          petConfig: {
            ...(latestPlayer.petConfig || {}),
            enabled: true,
            activePetId: resolved.activePetId || newCard.id,
            equippedPetIds: nextSlots,
            activePetSlotIndex: resolved.activePetSlotIndex,
            petGallery: nextGallery,
          },
        },
      });

      // Restaura o zoom da câmera sobre o jogador e clareia a Tela Preta
      const px = playerRef.current?.x ?? latestPlayer.x ?? 384;
      const py = playerRef.current?.y ?? latestPlayer.y ?? 100;
      setZoomVisual(prevZoom, px * scale, py * scale);
      applyCameraZoomFor(px, py);
      setTeleportFade('in');

      const respawnLabel =
        respawnInfo.respawnMode === 'never'
          ? 'Sem Respawn'
          : `Respawn em ${respawnInfo.respawnTimeSeconds}s`;

      setActionFeedback(
        existingCard
          ? `🔍✨ "${marker.name}" Escaneado! Carta Nv.${newCard.level} no Deck • Mobby sumiu (${respawnLabel})`
          : `🔍🃏 "${marker.name}" Escaneado p/ o Deck! • Mobby sumiu (${respawnLabel})`
      );

      setTimeout(() => {
        setTeleportFade(null);
        if (contentRef.current) {
          contentRef.current.style.transition = '';
        }
      }, 420);

      setTimeout(() => setActionFeedback(null), 4000);
    }, 720);
  };

  // Controle por Teclado (WASD / Setas + Atalhos de Botões do HUD Paisagem / Web)
  useEffect(() => {
    const normalizeKey = (e: KeyboardEvent): string => {
      if (e.code === 'Space' || e.key === ' ') return 'SPACE';
      return e.key.toUpperCase();
    };

    const isTypingInInput = (target: EventTarget | null): boolean => {
      const el = target as HTMLElement | null;
      if (!el) return false;
      const tag = el.tagName;
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
    };

    const webCfg = hudConfig?.webConfig || {
      enabled: true,
      hideJoystickInWeb: true,
      upKey: 'W',
      downKey: 'S',
      leftKey: 'A',
      rightKey: 'D',
      allowArrowKeys: true,
      showKeyBadges: true,
    };

    const upK = (webCfg.upKey || 'W').toUpperCase();
    const downK = (webCfg.downKey || 'S').toUpperCase();
    const leftK = (webCfg.leftKey || 'A').toUpperCase();
    const rightK = (webCfg.rightKey || 'D').toUpperCase();
    const allowArrows = webCfg.allowArrowKeys !== false;

    const isMoveKey = (k: string): 'up' | 'down' | 'left' | 'right' | null => {
      if (k === upK || (allowArrows && k === 'ARROWUP')) return 'up';
      if (k === downK || (allowArrows && k === 'ARROWDOWN')) return 'down';
      if (k === leftK || (allowArrows && k === 'ARROWLEFT')) return 'left';
      if (k === rightK || (allowArrows && k === 'ARROWRIGHT')) return 'right';
      return null;
    };

    const recomputeKeyboardVector = () => {
      const pressed = pressedKeysRef.current;
      let vx = 0;
      let vy = 0;
      if (pressed.has('up')) vy -= 1;
      if (pressed.has('down')) vy += 1;
      if (pressed.has('left')) vx -= 1;
      if (pressed.has('right')) vx += 1;
      if (vx !== 0 && vy !== 0) {
        vx *= Math.SQRT1_2;
        vy *= Math.SQRT1_2;
      }
      if (vx !== 0 || vy !== 0) {
        tapTargetRef.current = null;
        tapWayRef.current = [];
        setIsJoystickActive(true);
        setVector(vx, vy);
      } else {
        setVector(0, 0);
        setIsJoystickActive(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingInInput(e.target)) return;
      if (screensConfig?.isInlineEditing) return;
      // Ignora se Ctrl / Meta / Alt estiverem pressionados (preserva atalhos do editor como Ctrl+S, Ctrl+Z)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Só intercepta WASD e botões quando estiver no Modo WEB, no Modo Play dedicado, ou sem ferramenta de texto
      const shouldHandleGameplayKeys = effectiveWebMode || isPlayMode;
      if (!shouldHandleGameplayKeys) return;

      const k = normalizeKey(e);
      const moveDir = isMoveKey(k);
      if (moveDir) {
        e.preventDefault();
        if (!pressedKeysRef.current.has(moveDir)) {
          pressedKeysRef.current.add(moveDir);
          recomputeKeyboardVector();
        }
        return;
      }

      if (e.repeat) return;

      // Atalho da Mochila
      const bpKey = (backpackConfig?.shortcutKey || 'I').toUpperCase();
      if (backpackConfig?.visible !== false && k === bpKey) {
        e.preventDefault();
        setInventoryOpen((v) => !v);
        return;
      }

      // Atalho do Modo Toque
      const tmKey = (touchMoveConfig?.shortcutKey || 'M').toUpperCase();
      if (touchMoveConfig?.visible !== false && k === tmKey) {
        e.preventDefault();
        setLocomotion((prev) => (prev === 'joystick' ? 'tap' : 'joystick'));
        return;
      }

      // Atalhos dos Botões Customizados (Ataque, Dash, etc.)
      const customBtns = hudConfig?.customButtons || [];
      for (const btn of customBtns) {
        if (btn.visible === false || !btn.shortcutKey) continue;
        const targetK = btn.shortcutKey.trim().toUpperCase();
        if (targetK === k) {
          e.preventDefault();
          if (btn.action.type === 'open_inventory') {
            setInventoryOpen((v) => !v);
          } else if (btn.action.type === 'toggle_locomotion') {
            setLocomotion((prev) => (prev === 'joystick' ? 'tap' : 'joystick'));
          } else if (btn.action.type === 'open_dialogue') {
            const targetMarker = (btn.action as any).markerId
              ? projectRef.current.markers.find((m) => m.id === (btn.action as any).markerId)
              : projectRef.current.markers.find((m) => m.type === 'npc' || !!m.dialogueText);
            if (targetMarker) {
              setActiveDialogueMarker(targetMarker);
              setActionFeedback(`💬 Diálogo com ${targetMarker.name}...`);
              setTimeout(() => setActionFeedback(null), 2500);
            }
          } else if (btn.action.type === 'player_action') {
            const act = btn.action.action;
            if (act === 'attack') {
              triggerPlayerOrPetAttack();
            } else if (act === 'jump' || act === 'dash') {
              triggerPlayerDash();
            } else if (act === 'pet_item') {
              setIsPetCareOpen((v) => !v);
            } else {
              setActionFeedback('🖐️ Interagindo...');
              setTimeout(() => setActionFeedback(null), 1500);
            }
          } else if (btn.action.type === 'pause_game') {
            setActionFeedback('⏸️ Jogo Pausado');
            setTimeout(() => setActionFeedback(null), 2000);
          }
          break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const k = normalizeKey(e);
      const moveDir = isMoveKey(k);
      if (moveDir && pressedKeysRef.current.has(moveDir)) {
        pressedKeysRef.current.delete(moveDir);
        recomputeKeyboardVector();
      }
    };

    const handleBlur = () => {
      if (pressedKeysRef.current.size > 0) {
        pressedKeysRef.current.clear();
        setVector(0, 0);
        setIsJoystickActive(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [effectiveWebMode, isPlayMode, hudConfig, backpackConfig, touchMoveConfig, screensConfig?.isInlineEditing]);

  // Estado do Diálogo / Interação Ativo
  const [activeDialogueMarker, setActiveDialogueMarker] = useState<MapMarker | null>(null);
  const [activeStationMarker, setActiveStationMarker] = useState<MapMarker | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [dialogueCustomFeedback, setDialogueCustomFeedback] = useState<string | null>(null);
  const [lootToastEntries, setLootToastEntries] = useState<LootToastBarEntry[]>([]);
  const pushLootToastEntry = (entry: Omit<LootToastBarEntry, 'id' | 'createdAt'>) => {
    const id = `loot-bar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const durationMs = hudConfig?.lootToastHud?.durationMs ?? 3600;
    const newEntry: LootToastBarEntry = {
      ...entry,
      id,
      createdAt: Date.now(),
    };
    setLootToastEntries((prev) => [...prev.slice(-6), newEntry]);
    setTimeout(() => {
      setLootToastEntries((prev) => prev.filter((item) => item.id !== id));
    }, durationMs);
  };
  const setActionFeedback = (msg: string | null) => {
    if (!msg) return;
    pushLootToastEntry({ text: msg });
  };
  const actionFeedback = lootToastEntries.length > 0 ? lootToastEntries[lootToastEntries.length - 1].text : null;
  const [dialogueTheme, setDialogueTheme] = useState<DialogueTheme>(DEFAULT_GREEN_THEME);

  // Estados do Sistema Procedural de Action NPC, Combate e Emoções de Anime
  const [combatVfx, setCombatVfx] = useState<ActiveCombatVfx[]>([]);
  const [combatProjectiles, setCombatProjectiles] = useState<ActiveProjectile[]>([]);
  const [activeSpeechBalloons, setActiveSpeechBalloons] = useState<Map<string, ActiveSpeechBalloon>>(new Map());
  const [playerIdleEmote, setPlayerIdleEmote] = useState<{ type: 'zzz' | 'sweat' | 'dots' | 'sparkle'; expiresAt: number } | null>(null);
  const playerIdleEmoteRef = useRef<{ type: 'zzz' | 'sweat' | 'dots' | 'sparkle'; expiresAt: number } | null>(null);
  const [npcLiveEmotions, setNpcLiveEmotions] = useState<Map<string, { type: import('../types/map').NpcEmotionType; intensity: number }>>(new Map());
  const [npcActiveAttacks, setNpcActiveAttacks] = useState<Map<string, {
    type: import('../types/map').ActionNpcAttackType;
    startTime: number;
    durationMs: number;
    attackAsset?: import('../types/map').AttackAssetConfig;
  }>>(new Map());
  const npcActiveAttacksRef = useRef<Map<string, {
    type: import('../types/map').ActionNpcAttackType;
    startTime: number;
    durationMs: number;
    attackAsset?: import('../types/map').AttackAssetConfig;
  }>>(new Map());
  const lastCombatOverlaySyncRef = useRef<number>(0);
  const lastNpcLoopTimeRef = useRef<number>(performance.now());
  const hadCombatDataRef = useRef<boolean>(false);
  const lastEmotionsSizeRef = useRef<number>(0);

  // Pré-aquecimento de vídeos de ataque em memória (0ms de latência ao atacar)
  useEffect(() => {
    const mList = project.markers || [];
    for (const m of mList) {
      if (m.type === 'npc' && m.actionNpc?.enabled && m.actionNpc.attacks) {
        const atks = m.actionNpc.attacks;
        for (const atk of [atks.jump, atks.dash, atks.hackSlash, atks.ranged]) {
          if (atk?.attackAsset?.type === 'video' && atk.attackAsset.url) {
            preloadVideoUrl(atk.attackAsset.url);
          }
        }
      }
    }
  }, [project.markers]);

  // Sinais de mangá ao redor do personagem: conjunto random que troca animado a cada fala
  // (estilo da imagem: ? amarelo à direita, !! em rajada à esquerda, linhas de impacto)
  type MangaSign =
    | { kind: 'glyph'; text: string; left?: string; right?: string; top: string; size: string; rotate: string; delay: string }
    | { kind: 'burst'; left?: string; right?: string; top: string; bars: { rotate: string; len: string; offsetY: string }[]; delay: string };
  const MANGA_COMBOS: MangaSign[][] = [
    [
      { kind: 'burst', left: '6%', top: '16%', delay: '0s', bars: [{ rotate: '-32deg', len: '64px', offsetY: '0px' }, { rotate: '-12deg', len: '78px', offsetY: '26px' }, { rotate: '8deg', len: '56px', offsetY: '50px' }] },
      { kind: 'glyph', text: '?', right: '8%', top: '14%', size: '72px', rotate: '8deg', delay: '0.08s' },
    ],
    [
      { kind: 'glyph', text: '!', right: '10%', top: '12%', size: '84px', rotate: '-6deg', delay: '0s' },
      { kind: 'burst', left: '7%', top: '22%', delay: '0.1s', bars: [{ rotate: '-24deg', len: '60px', offsetY: '0px' }, { rotate: '-4deg', len: '72px', offsetY: '24px' }, { rotate: '16deg', len: '52px', offsetY: '46px' }] },
    ],
    [
      { kind: 'glyph', text: '‼', left: '8%', top: '14%', size: '72px', rotate: '-8deg', delay: '0s' },
    ],
    [
      { kind: 'burst', right: '7%', top: '18%', delay: '0s', bars: [{ rotate: '28deg', len: '62px', offsetY: '0px' }, { rotate: '8deg', len: '76px', offsetY: '25px' }, { rotate: '-12deg', len: '54px', offsetY: '48px' }] },
      { kind: 'glyph', text: '?', left: '10%', top: '30%', size: '54px', rotate: '-10deg', delay: '0.1s' },
    ],
    [
      { kind: 'glyph', text: '…', right: '12%', top: '34%', size: '60px', rotate: '0deg', delay: '0s' },
    ],
  ];
  const [dialogueSigns, setDialogueSigns] = useState<MangaSign[]>(MANGA_COMBOS[0]);
  useEffect(() => {
    if (!activeDialogueMarker) return;
    setDialogueSigns((prev) => {
      let next = prev;
      while (MANGA_COMBOS.length > 1 && next === prev) {
        next = MANGA_COMBOS[Math.floor(Math.random() * MANGA_COMBOS.length)];
      }
      return next;
    });
  }, [currentStepIndex, activeDialogueMarker?.id]);

  // Sincroniza abertura e teste de diálogo acionado pelo estúdio de diálogo
  useEffect(() => {
    if (testDialogueMarkerId) {
      const found = project.markers.find((m) => m.id === testDialogueMarkerId);
      if (found) {
        setActiveDialogueMarker(found);
        setCurrentStepIndex(0);
        setDialogueCustomFeedback(null);
      }
    }
  }, [testDialogueMarkerId, project.markers]);

  // Marcador ativo sempre resolvido em tempo real com os dados mais recentes de project.markers
  const liveDialogueMarker = useMemo(() => {
    if (!activeDialogueMarker) return null;
    return project.markers.find((m) => m.id === activeDialogueMarker.id) || activeDialogueMarker;
  }, [activeDialogueMarker, project.markers]);



  // Inventário do Jogador (Item coletado no mapa)
  const [playerInventory, setPlayerInventory] = useState<Record<string, number>>({});
  // Mochila do inventário (recursos coletados no mapa e itens do jogador)
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [bpTab, setBpTab] = useState<'itens' | 'equipamentos' | 'moedas' | 'missoes'>('itens');
  // Estado da sub-aba de Quests no HUD (Jornada vs Tarefas) e do Pop-up de Jornada & Tarefas no Emulador
  const [hudQuestSubTab, setHudQuestSubTab] = useState<'jornada' | 'tarefas'>('jornada');
  const [questPopupState, setQuestPopupState] = useState<{
    open: boolean;
    initialTab: 'jornada' | 'tarefas';
    questId?: string;
  }>({ open: false, initialTab: 'jornada' });
  const totalItems = Object.values(playerInventory).reduce((a, b) => a + (b || 0), 0);
  const resourceEmoji = (name: string) =>
    /madeira/i.test(name) ? '🪵'
    : /pedra/i.test(name) ? '🪨'
    : /carv/i.test(name) ? '🪙'
    : /flor/i.test(name) ? '🌸'
    : /slime/i.test(name) ? '🧪'
    : /ouro|gold|moeda/i.test(name) ? '💰'
    : '📦';

  // Sistema inteligente de múltiplos eventos climáticos simultâneos
  const isWeatherEffectActive = (weather: 'rain' | 'leaves' | 'wind' | 'bugs' | 'ants' | 'night' | 'dawn' | 'snow'): boolean => {
    // 1. Desativação explícita no Studio tem prioridade absoluta (se false, NUNCA executa)
    if (weather === 'leaves' && project.leavesConfig?.enabled === false) return false;
    if (weather === 'rain' && project.rainConfig?.enabled === false) return false;
    if (weather === 'wind' && project.windConfig?.enabled === false) return false;
    if (weather === 'bugs' && project.bugsConfig?.enabled === false) return false;
    if (weather === 'ants' && project.antsConfig?.enabled === false) return false;
    if (weather === 'snow' && project.snowConfig?.enabled === false) return false;

    // 2. Ativação explícita no Studio (se true, ativa imediatamente)
    if (weather === 'night' && project.lighting?.nightEnabled === true) return true;
    if (weather === 'leaves' && project.leavesConfig?.enabled === true) return true;
    if (weather === 'rain' && project.rainConfig?.enabled === true) return true;
    if (weather === 'wind' && project.windConfig?.enabled === true) return true;
    if (weather === 'bugs' && project.bugsConfig?.enabled === true) return true;
    if (weather === 'ants' && project.antsConfig?.enabled === true) return true;
    if (weather === 'snow' && project.snowConfig?.enabled === true) return true;

    // 3. Múltiplos climas globais ou clima único global
    if (project.lighting?.globalWeathers?.includes(weather as any)) return true;
    if (project.lighting?.globalWeather === weather) return true;

    // 4. Clima por bioma (apenas se o efeito não tiver sido explicitamente desativado)
    const player = project.player || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6' };
    if (isExtended) {
      const list = project.subBiomes || [];
      let cx = 0;
      for (const sb of list) {
        const w = sb.tileWidth || 400;
        if (player.x >= cx && player.x < cx + w) {
          if (sb.biomeEvents?.includes(weather as any)) return true;
          if (sb.biomeEvent === weather) return true;
          return false;
        }
        cx += w + 40;
      }
      return false;
    }
    const currentBiome = getBiomeAtY(player.y, spans);
    if (currentBiome) {
      if (currentBiome.biomeEvents?.includes(weather as any)) return true;
      if (currentBiome.biomeEvent === weather) return true;
    }
    return false;
  };

  // Evento atmosférico legado para compatibilidade de temas
  const getActiveBiomeEvent = (): 'none' | 'night' | 'rain' | 'dawn' | 'leaves' => {
    if (isWeatherEffectActive('night')) return 'night';
    if (isWeatherEffectActive('rain')) return 'rain';
    if (isWeatherEffectActive('dawn')) return 'dawn';
    if (isWeatherEffectActive('leaves')) return 'leaves';
    return 'none';
  };

  // Multiplicador de escala do herói NO PONTO (x,y): bioma vertical ou fase Extended.
  // É o ÚNICO controle de escala (o slider do menu Jogador foi removido).
  const biomeScaleAt = (x: number, y: number): number => {
    if (isExtended) {
      const list = project.subBiomes || [];
      let cx = 0;
      for (const sb of list) {
        const w = sb.tileWidth || 400;
        if (x >= cx && x < cx + w) return sb.playerScale ?? 1.0;
        cx += w + 40;
      }
      return 1.0;
    }
    return getBiomeAtY(y, spans)?.playerScale ?? 1.0;
  };
  const lastAvatarSizeRef = useRef<number>(0);

  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  // Controle síncrono e imediato de itens/baús já coletados na sessão para sumirem no exato frame do toque/aproximação
  const [collectedMarkerIds, setCollectedMarkerIds] = useState<Set<string>>(new Set());
  const collectedMarkerIdsRef = useRef<Set<string>>(new Set());
  const lastLoadedProjectIdRef = useRef<string>(project.id);
  useEffect(() => {
    if (project.id !== lastLoadedProjectIdRef.current) {
      lastLoadedProjectIdRef.current = project.id;
      collectedMarkerIdsRef.current = new Set();
      setCollectedMarkerIds(new Set());
    }
  }, [project.id]);

  const handleCollectItem = (marker: MapMarker) => {
    if (collectedMarkerIdsRef.current.has(marker.id)) return;
    collectedMarkerIdsRef.current.add(marker.id);
    setCollectedMarkerIds((prev) => {
      const next = new Set(prev);
      next.add(marker.id);
      return next;
    });

    // Remove imediatamente das refs em tempo real para o item sumir na hora do mapa
    gameplayMarkersRef.current = (gameplayMarkersRef.current || []).filter((m) => m.id !== marker.id);
    markersRef.current = (markersRef.current || []).filter((m) => m.id !== marker.id);

    const resourceName =
      marker.questResource?.name ||
      marker.name?.replace(/^Item:\s*/i, '').replace(/\s*\(.*\)$/, '').trim() ||
      (marker.questResourceType === 'wood'
        ? 'Madeira'
        : marker.questResourceType === 'stone'
        ? 'Pedra'
        : marker.questResourceType === 'coal'
        ? 'Carvão'
        : marker.questResourceType === 'flower'
        ? 'Flores'
        : marker.questResourceType === 'slime_water'
        ? 'Água Slime'
        : marker.questResourceType === 'gold'
        ? 'Ouro'
        : 'Recurso');
    const amount = marker.questRequiredAmount || 1;
    const emoji =
      marker.questResource?.iconEmoji ||
      (marker.questResourceType === 'wood'
        ? '🪵'
        : marker.questResourceType === 'stone'
        ? '🪨'
        : marker.questResourceType === 'coal'
        ? '🪙'
        : marker.questResourceType === 'flower'
        ? '🌸'
        : marker.questResourceType === 'slime_water'
        ? '🧪'
        : marker.questResourceType === 'gold'
        ? '💰'
        : '📦');

    const nextLegacyCount = (playerInventory[resourceName] || 0) + amount;
    setPlayerInventory((prev) => ({
      ...prev,
      [resourceName]: (prev[resourceName] || 0) + amount,
    }));

    let questFeedbackMsg: string | null = null;

    // Sincroniza coleta real com a Mochila do Herói (project.playerInventory), avança Quests e remove o item coletado do chão
    const currentProj = projectRef.current || project;
    const catalog = getOrCreateItemCatalog(currentProj);
    const curInv = getOrCreatePlayerInventory(currentProj);
    const markerIcon = marker.questResource?.iconPng || marker.customIconPng;
    const explicitItemId = marker.questResource?.id;

    let matchedCatalogItem = catalog.find(
      (c) =>
        (explicitItemId && c.id === explicitItemId) ||
        c.name.toLowerCase() === resourceName.toLowerCase() ||
        (markerIcon && c.iconPng === markerIcon)
    );

    let updatedCatalog = catalog;
    if (!matchedCatalogItem) {
      matchedCatalogItem = {
        id: explicitItemId || `item-auto-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: resourceName,
        description: `Item coletado no mapa (${resourceName}).`,
        iconPng: markerIcon,
        iconEmoji: emoji,
        category: 'collectible',
        rarity: 'common',
        stackable: true,
        maxStack: 99,
        usable: false,
        equippable: false,
        droppable: true,
        sellPrice: 10,
        buyPrice: 25,
      };
      updatedCatalog = [...catalog, matchedCatalogItem];
    }

    const res = addItemToPlayerInventory(curInv, updatedCatalog, matchedCatalogItem.id, amount);

    // Atualiza também marcadores de NPC que tenham quest de coleta para este recurso
    const remainingMarkers = (currentProj.markers || [])
      .filter((m) => m.id !== marker.id && !collectedMarkerIdsRef.current.has(m.id))
      .map((m) => {
        if ((m.type === 'npc' || m.type === 'boss') && m.quest && m.quest.kind === 'collect') {
          const qRes = (m.quest.resourceName || '').toLowerCase();
          if (qRes && (qRes.includes(resourceName.toLowerCase()) || resourceName.toLowerCase().includes(qRes))) {
            const req = m.quest.requiredAmount || 2;
            const nextCur = Math.min(req, (m.quest.currentAmount || 0) + amount);
            const prog = getProg(m.id);
            questProgRef.current[m.id] = { ...prog, accepted: true };
            if (nextCur >= req && !prog.done) {
              questFeedbackMsg = `🎯 Objetivo completo (${nextCur}/${req} ${resourceName})! Fale com ${m.name} para receber a recompensa!`;
            } else if (!prog.done) {
              questFeedbackMsg = `📜 Quest "${m.quest.title || m.name}": ${nextCur}/${req} ${emoji} ${resourceName}!`;
            }
            return {
              ...m,
              quest: {
                ...m.quest,
                currentAmount: nextCur,
                status: nextCur >= req ? 'active' : 'active',
              } as any,
            };
          }
        }
        return m;
      });

    let workingProj: MapProject = {
      ...currentProj,
      itemCatalog: updatedCatalog,
      playerInventory: res.inventory,
      markers: remainingMarkers,
    };

    try {
      const evtResult = dispatchEngineEvent(workingProj, {
        type: 'inventory.item_collected',
        sourceSystem: 'inventory',
        targetId: marker.id,
        itemId: explicitItemId || matchedCatalogItem.id,
        itemName: resourceName,
        quantity: amount,
        provenance: 'gather',
      });
      workingProj = {
        ...evtResult.updatedProject,
        itemCatalog: updatedCatalog,
        markers: remainingMarkers,
      };
      if (evtResult.completedQuestIds && evtResult.completedQuestIds.length > 0) {
        questFeedbackMsg = `🏆 QUEST CONCLUÍDA ao coletar ${amount}x ${emoji} ${resourceName}! Recompensa entregue!`;
      } else if (evtResult.updatedQuestsCount > 0 && !questFeedbackMsg) {
        questFeedbackMsg = `📜 Progresso da Quest atualizado: +${amount}x ${emoji} ${resourceName}!`;
      }
    } catch (err) {
      console.warn('Aviso ao processar evento de coleta na engine de quests:', err);
    }

    // Concede +25 XP por coleta no mapa para feedback vivo na barra de EXP
    try {
      const xpRes = grantXpCentralService(workingProj, 25, `Coleta: ${resourceName}`);
      workingProj = { ...xpRes.updatedProject, markers: remainingMarkers };
    } catch (err) {
      console.warn('Aviso ao conceder XP de coleta:', err);
    }

    projectRef.current = workingProj;
    if (onUpdateProject) {
      onUpdateProject({
        itemCatalog: workingProj.itemCatalog,
        playerInventory: workingProj.playerInventory,
        questsConfig: workingProj.questsConfig,
        player: workingProj.player,
        markers: remainingMarkers,
      });
    }

    bumpQuests();
    pushLootToastEntry({
      text: `${resourceName}`,
      iconUrl: markerIcon,
      iconEmoji: emoji,
      amount,
    });
    if (questFeedbackMsg) {
      setTimeout(() => {
        pushLootToastEntry({
          text: questFeedbackMsg!,
          iconEmoji: '📜',
        });
      }, 140);
    }
    setInspectedMarker(null);
    onSelectMarker(null);
  };

  const handleOpenTreasureChest = (marker: MapMarker) => {
    if (collectedMarkerIdsRef.current.has(marker.id)) return;
    collectedMarkerIdsRef.current.add(marker.id);
    setCollectedMarkerIds((prev) => {
      const next = new Set(prev);
      next.add(marker.id);
      return next;
    });

    gameplayMarkersRef.current = (gameplayMarkersRef.current || []).filter((m) => m.id !== marker.id);
    markersRef.current = (markersRef.current || []).filter((m) => m.id !== marker.id);

    const rewards = (marker.rewardSlots || []).filter(Boolean) as string[];
    const summary = rewards.length > 0 ? rewards.join(' ') : '🪙 +150 Ouro • 💎 +5 Gemas • +80 XP';

    const currentProj = projectRef.current || project;
    const catalog = getOrCreateItemCatalog(currentProj);
    let curInv = getOrCreatePlayerInventory(currentProj);
    const prevGold = curInv.currencies?.gold ?? (curInv as any).gold ?? 0;
    const prevGems = curInv.currencies?.gems ?? (curInv as any).gems ?? 0;

    curInv = {
      ...curInv,
      currencies: {
        gold: prevGold + 150,
        gems: prevGems + 5,
      },
    };

    const firstCollectible =
      catalog.find((c) => c.category === 'equipment' || c.category === 'consumable' || c.category === 'collectible') ||
      catalog[0];
    if (firstCollectible) {
      const added = addItemToPlayerInventory(curInv, catalog, firstCollectible.id, 1);
      curInv = added.inventory;
    }

    const remainingMarkers = (currentProj.markers || []).filter(
      (m) => m.id !== marker.id && !collectedMarkerIdsRef.current.has(m.id)
    );

    let workingProj: MapProject = {
      ...currentProj,
      itemCatalog: catalog,
      playerInventory: curInv,
      markers: remainingMarkers,
    };

    try {
      const evtResult = dispatchEngineEvent(workingProj, {
        type: 'inventory.item_collected',
        sourceSystem: 'inventory',
        targetId: marker.id,
        itemId: firstCollectible?.id || 'gold',
        itemName: firstCollectible?.name || 'Tesouro Real',
        quantity: 1,
        provenance: 'gather',
      });
      workingProj = { ...evtResult.updatedProject, markers: remainingMarkers };
    } catch (err) {
      console.warn('Aviso ao despachar evento de baú:', err);
    }

    try {
      const xpRes = grantXpCentralService(workingProj, 80, `Baú: ${marker.name}`);
      workingProj = { ...xpRes.updatedProject, markers: remainingMarkers };
    } catch (err) {
      console.warn('Aviso ao conceder XP de baú:', err);
    }

    projectRef.current = workingProj;
    if (onUpdateProject) {
      onUpdateProject({
        itemCatalog: catalog,
        playerInventory: workingProj.playerInventory,
        questsConfig: workingProj.questsConfig,
        player: workingProj.player,
        markers: remainingMarkers,
      });
    }

    bumpQuests();
    pushLootToastEntry({
      text: firstCollectible?.name || 'Tesouro do Baú',
      iconUrl: firstCollectible?.iconPng || marker.customIconPng,
      iconEmoji: firstCollectible?.iconEmoji || '🎁',
      amount: 1,
    });
    setTimeout(() => {
      pushLootToastEntry({
        text: 'Ouro & Gemas do Baú',
        iconEmoji: '🪙',
        amount: 150,
      });
    }, 150);
    setInspectedMarker(null);
    onSelectMarker(null);
  };

  const handleDeliverItem = (marker: MapMarker) => {
    const invEntries = Object.entries(playerInventory).filter(([_, qty]) => qty > 0);
    if (invEntries.length === 0) {
      setActionFeedback(`⚠️ Nenhum recurso no inventário para entregar! Colete primeiro no mapa.`);
      setTimeout(() => setActionFeedback(null), 3500);
      return;
    }

    const [itemCollected, qty] = invEntries[0];
    setPlayerInventory((prev) => ({
      ...prev,
      [itemCollected]: 0,
    }));

    setActionFeedback(`🎉 ${qty}x ${itemCollected} entregues com sucesso! Missão Concluída! ⭐`);
    setTimeout(() => setActionFeedback(null), 4000);
    setInspectedMarker(null);
    onSelectMarker(null);
  };

  const handleFastTravel = (marker: MapMarker) => {
    const target = project.markers.find((m) => m.id === marker.targetTravelMarkerId);
    if (!target) {
      setActionFeedback(`⚠️ Nenhum marcador Travel de destino configurado!`);
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    if (onUpdatePlayer) {
      onUpdatePlayer({ x: target.x, y: target.y });
    }

    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: target.y * scale - containerRef.current.clientHeight / 2,
        behavior: 'smooth',
      });
    }

    setActionFeedback(`🌌 Teleportado com sucesso para ${target.name}!`);
    setTimeout(() => setActionFeedback(null), 3500);
    setInspectedMarker(null);
    onSelectMarker(null);
  };

  // Sub-Bioma Ativo para Instância Interna
  const [activeSubBiome, setActiveSubBiome] = useState<import('../types/map').SubBiomeConfig | null>(null);

  // Fade preta do teletransporte automático (travel): só o asset aparece, sem pop-up
  const [teleportFade, setTeleportFade] = useState<'out' | 'in' | null>(null);
  // Cor do desvanecer (teleporte = preto; cena de vídeo usa a cor do marcador)
  const [fadeColor, setFadeColor] = useState<string>('#000000');
  const [fadeDurationMs, setFadeDurationMs] = useState<number>(500);
  const teleportingRef = useRef(false);
  const lastTeleportAtRef = useRef(0);
  // Estátua de evento: timestamp até quando o input fica congelado (0 = livre)
  const eventFreezeUntilRef = useRef<number>(0);
  // Clima vigente por evento (marcador tipo event/weather) — vale no raio, sai e volta ao do bioma
  const weatherOverrideRef = useRef<{ markerId: string; weather: 'night' | 'rain' | 'dawn' | 'leaves' } | null>(null);
  const [, setWeatherTick] = useState(0);
  const setWeatherOverride = (v: { markerId: string; weather: 'night' | 'rain' | 'dawn' | 'leaves' } | null) => {
    weatherOverrideRef.current = v;
    setWeatherTick((t) => t + 1);
  };
  // Cena de vídeo do evento (marcador tipo event/video)
  const [eventVideo, setEventVideo] = useState<{ url: string; title: string } | null>(null);
  const eventVideoActiveRef = useRef(false);
  // Fecha a cena com desvanecer: some p/ preto, tira o vídeo, volta clareando
  const closeEventVideo = () => {
    if (!eventVideoActiveRef.current) return;
    eventVideoActiveRef.current = false;
    setTeleportFade('out');
    setTimeout(() => {
      setEventVideo(null);
      eventFreezeUntilRef.current = 0;
      setTeleportFade('in');
      setTimeout(() => {
        setTeleportFade(null);
      }, 400);
    }, 350);
  };

  // ===== Motor de quests dos NPCs + Sincronização Real com QuestsConfig =====
  type QuestProg = { accepted: boolean; done: boolean; talked: string[]; dueled: string[] };
  const questProgRef = useRef<Record<string, QuestProg>>({});
  const [, setQuestTick] = useState(0);
  const bumpQuests = () => setQuestTick((t) => t + 1);
  const getProg = (npcId: string): QuestProg => {
    const local = questProgRef.current[npcId];
    const currentProj = projectRef.current || project;
    const npcMarker = (currentProj.markers || []).find((m) => m.id === npcId);
    const qMap = currentProj.questsConfig?.playerState?.questsProgress || {};
    const linkedRt = npcMarker?.linkedQuestId ? qMap[npcMarker.linkedQuestId] : undefined;
    const localRt = qMap[`npc-quest-${npcId}`];

    const isDone =
      Boolean(local?.done) ||
      linkedRt?.status === 'completed' ||
      localRt?.status === 'completed' ||
      (npcMarker?.quest as any)?.status === 'completed';
    const isAccepted =
      isDone ||
      Boolean(local?.accepted) ||
      linkedRt?.status === 'active' ||
      localRt?.status === 'active' ||
      (npcMarker?.quest as any)?.status === 'active';

    return {
      accepted: isAccepted,
      done: isDone,
      talked: local?.talked || [],
      dueled: local?.dueled || [],
    };
  };
  const questNeed = (m: MapMarker): number => {
    const q = m.quest;
    if (!q) return 1;
    if (q.kind === 'collect') return q.requiredAmount || 2;
    if (q.kind === 'discover') return 1;
    const targets = q.targetMarkerIds || [];
    return q.requiredCount || q.requiredAmount || targets.length || 1;
  };
  const questInventoryHave = (m: MapMarker, inv: Record<string, number>): number => {
    const q = m.quest;
    if (!q || q.kind !== 'collect') return q?.currentAmount || 0;
    const key = q.resourceName || 'Recurso';
    const fromLegacy = inv[key] || 0;
    const fromMarker = q.currentAmount || 0;
    const currentProj = projectRef.current || project;
    const invItems = currentProj.playerInventory?.items || [];
    const matchedBag = invItems.find(
      (it) => it.name.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(it.name.toLowerCase())
    );
    const fromBag = matchedBag?.quantity || 0;
    return Math.max(fromLegacy, fromMarker, fromBag);
  };
  const questReady = (m: MapMarker, inv: Record<string, number>): boolean => {
    const q = m.quest;
    const prog = getProg(m.id);
    if (prog.done) return false;
    if (!q) return prog.accepted;
    if (q.kind === 'collect') return questInventoryHave(m, inv) >= (q.requiredAmount || 2);
    if (q.kind === 'discover') return true;
    if (q.kind === 'talk') {
      const need = q.requiredCount || (q.targetMarkerIds || []).length || 1;
      return Math.max(prog.talked.length, q.currentAmount || 0, 1) >= need;
    }
    const need = q.requiredCount || q.requiredAmount || (q.targetMarkerIds || []).length || 1;
    return Math.max(prog.dueled.length, q.currentAmount || 0) >= need;
  };
  const questText = (m: MapMarker, inv: Record<string, number>): string => {
    const q = m.quest;
    if (!q) return 'Missão disponível para este NPC.';
    const need = questNeed(m);
    if (q.kind === 'collect')
      return `Colete ${need}x ${q.iconEmoji || '📦'} ${q.resourceName || 'recursos'} (${Math.min(need, questInventoryHave(m, inv))}/${need})`;
    if (q.kind === 'talk') return `Fale com ${need} NPC(s) (${Math.min(need, Math.max(getProg(m.id).talked.length, 1))}/${need})`;
    if (q.kind === 'discover') return getProg(m.id).done ? 'Evento concluído! ✔️' : q.instructions || 'Ative o evento especial 🧭';
    return `Vença o duelo (${Math.min(need, getProg(m.id).dueled.length)}/${need})`;
  };

  const acceptQuest = (npcId: string) => {
    const p = getProg(npcId);
    questProgRef.current[npcId] = { ...p, accepted: true };
    const currentProj = projectRef.current || project;
    const npcMarker = (currentProj.markers || []).find((m) => m.id === npcId);

    const qCfg = ensureProjectQuestsConfig(currentProj.questsConfig);
    const nextProgressMap = { ...(qCfg.playerState?.questsProgress || {}) };

    // 1. Ativa a quest vinculada no motor central (se houver linkedQuestId)
    const linkedId = npcMarker?.linkedQuestId;
    if (linkedId) {
      const targetDef = (qCfg.quests || []).find((q) => q.id === linkedId);
      if (targetDef) {
        const existingRt = nextProgressMap[linkedId] || createInitialQuestRuntimeProgress(targetDef);
        const firstStage = targetDef.stages?.[0];
        const nextObjs = { ...(existingRt.objectivesProgress || {}) };
        if (firstStage) {
          for (const oid of firstStage.objectiveIds) {
            if (nextObjs[oid] && nextObjs[oid].status === 'inactive') {
              nextObjs[oid] = { ...nextObjs[oid], status: 'active', activatedAt: new Date().toISOString() };
            }
          }
        }
        nextProgressMap[linkedId] = {
          ...existingRt,
          status: existingRt.status === 'completed' ? 'completed' : 'active',
          acceptedAt: existingRt.acceptedAt || new Date().toISOString(),
          currentStageId: existingRt.currentStageId || firstStage?.id,
          objectivesProgress: nextObjs,
        };
      }
    }

    // 2. Registra também a quest local do NPC em questsProgress para aparecer ativa na aba Tarefas
    const localQuestId = `npc-quest-${npcId}`;
    const existingLocal = nextProgressMap[localQuestId];
    nextProgressMap[localQuestId] = {
      questId: localQuestId,
      status: existingLocal?.status === 'completed' ? 'completed' : 'active',
      acceptedAt: existingLocal?.acceptedAt || new Date().toISOString(),
      completionCount: existingLocal?.completionCount || 0,
      objectivesProgress: existingLocal?.objectivesProgress || {
        [`obj-npc-${npcId}`]: {
          objectiveId: `obj-npc-${npcId}`,
          currentAmount: npcMarker?.quest?.currentAmount || 0,
          status: 'active',
          processedTransactionIds: [],
        },
      },
    };

    const updatedMarkers = (currentProj.markers || []).map((m) => {
      if (m.id === npcId && m.quest) {
        return {
          ...m,
          quest: { ...m.quest, status: 'active' } as any,
        };
      }
      return m;
    });

    let workingProj: MapProject = {
      ...currentProj,
      markers: updatedMarkers,
      questsConfig: {
        ...qCfg,
        playerState: {
          ...qCfg.playerState,
          questsProgress: nextProgressMap,
        },
      },
    };

    // Dispara também o evento de conversa para avançar o passo 1 ("Fale com o NPC") automaticamente
    try {
      const evtRes = dispatchEngineEvent(workingProj, {
        type: 'npc.talked',
        sourceSystem: 'dialogue',
        targetId: npcId,
        npcId,
        npcName: npcMarker?.dialogueCharacterName || npcMarker?.name,
        shopId: npcMarker?.shopId,
      });
      workingProj = { ...evtRes.updatedProject, markers: updatedMarkers };
    } catch (err) {
      console.warn('Aviso ao despachar aceite de quest:', err);
    }

    projectRef.current = workingProj;
    if (onUpdateProject) {
      onUpdateProject({
        markers: workingProj.markers,
        questsConfig: workingProj.questsConfig,
        playerInventory: workingProj.playerInventory,
        player: workingProj.player,
      });
    }

    const qTitle = npcMarker?.quest?.title || npcMarker?.name || 'NPC';
    setActionFeedback(`🎯 Missão "${qTitle}" aceita! Acompanhe no topo em Jornada | Tarefas.`);
    setTimeout(() => setActionFeedback(null), 3500);
    bumpQuests();
  };

  const abandonQuest = (npcId: string) => {
    delete questProgRef.current[npcId];
    bumpQuests();
  };

  const completeQuest = (m: MapMarker) => {
    const q = m.quest;
    if (q?.kind === 'collect') {
      const key = q.resourceName || 'Madeira';
      const need = q.requiredAmount || 2;
      setPlayerInventory((prev) => ({ ...prev, [key]: Math.max(0, (prev[key] || 0) - need) }));
    }
    const p = getProg(m.id);
    questProgRef.current[m.id] = { ...p, accepted: true, done: true };

    const currentProj = projectRef.current || project;
    const qCfg = ensureProjectQuestsConfig(currentProj.questsConfig);
    const nextProgressMap = { ...(qCfg.playerState?.questsProgress || {}) };

    // Marca a quest local do NPC como concluída
    const localQuestId = `npc-quest-${m.id}`;
    const reqAmt = q?.requiredAmount || q?.requiredCount || 1;
    nextProgressMap[localQuestId] = {
      questId: localQuestId,
      status: 'completed',
      acceptedAt: nextProgressMap[localQuestId]?.acceptedAt || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      completionCount: (nextProgressMap[localQuestId]?.completionCount || 0) + 1,
      objectivesProgress: {
        [`obj-npc-${m.id}`]: {
          objectiveId: `obj-npc-${m.id}`,
          currentAmount: reqAmt,
          status: 'completed',
          completedAt: new Date().toISOString(),
          processedTransactionIds: [],
        },
      },
    };

    // Se houver linkedQuestId no motor central, marca todos os objetivos como concluídos e concede o pacote de recompensas!
    let linkedQuestDef: import('../types/quests').QuestDefinition | undefined;
    if (m.linkedQuestId) {
      linkedQuestDef = (qCfg.quests || []).find((qd) => qd.id === m.linkedQuestId);
      if (linkedQuestDef) {
        const completedObjs: Record<string, any> = {};
        for (const obj of linkedQuestDef.objectives || []) {
          completedObjs[obj.id] = {
            objectiveId: obj.id,
            currentAmount: obj.requiredAmount || 1,
            status: 'completed',
            completedAt: new Date().toISOString(),
            processedTransactionIds: [],
          };
        }
        nextProgressMap[linkedQuestDef.id] = {
          questId: linkedQuestDef.id,
          status: 'completed',
          acceptedAt: nextProgressMap[linkedQuestDef.id]?.acceptedAt || new Date().toISOString(),
          completedAt: new Date().toISOString(),
          completionCount: (nextProgressMap[linkedQuestDef.id]?.completionCount || 0) + 1,
          objectivesProgress: completedObjs,
        };
      }
    }

    const updatedMarkers = (currentProj.markers || []).map((mk) => {
      if (mk.id === m.id && mk.quest) {
        return {
          ...mk,
          quest: {
            ...mk.quest,
            currentAmount: reqAmt,
            status: 'completed',
          } as any,
        };
      }
      return mk;
    });

    const curInv = getOrCreatePlayerInventory(currentProj);
    const prevGold = curInv.currencies?.gold ?? (curInv as any).gold ?? 0;

    // Consome os itens entregues da mochila caso seja quest de coleta
    let nextBagItems = [...(curInv.items || [])];
    if (q?.kind === 'collect' && q.resourceName) {
      let remainingToConsume = q.requiredAmount || 2;
      nextBagItems = nextBagItems
        .map((it) => {
          if (
            remainingToConsume > 0 &&
            (it.name.toLowerCase().includes(q.resourceName!.toLowerCase()) ||
              q.resourceName!.toLowerCase().includes(it.name.toLowerCase()))
          ) {
            const take = Math.min(remainingToConsume, it.quantity || 1);
            remainingToConsume -= take;
            return { ...it, quantity: (it.quantity || 1) - take };
          }
          return it;
        })
        .filter((it) => (it.quantity || 0) > 0);
    }

    let workingProj: MapProject = {
      ...currentProj,
      markers: updatedMarkers,
      playerInventory: {
        ...curInv,
        items: nextBagItems,
        currencies: {
          gold: prevGold + 120,
          gems: (curInv.currencies?.gems ?? 0) + 2,
        },
      },
      questsConfig: {
        ...qCfg,
        playerState: {
          ...qCfg.playerState,
          questsProgress: nextProgressMap,
        },
      },
    };

    try {
      if (linkedQuestDef && linkedQuestDef.rewards?.length) {
        const bundleRes = executeRewardBundle(
          workingProj,
          linkedQuestDef,
          linkedQuestDef.rewards,
          `${linkedQuestDef.id}_npc_turnin_${Date.now()}`
        );
        workingProj = { ...bundleRes.updatedProject, markers: updatedMarkers };
      } else {
        const xpRes = grantXpCentralService(workingProj, 200, `Missão Concluída: ${q?.title || m.name}`);
        workingProj = { ...xpRes.updatedProject, markers: updatedMarkers };
      }
    } catch (err) {
      console.warn('Aviso ao conceder recompensas da quest:', err);
    }

    if (workingProj.questsConfig) {
      saveProjectQuestsConfigToStorage(workingProj.questsConfig);
    }

    projectRef.current = workingProj;
    if (onUpdateProject) {
      onUpdateProject({
        markers: workingProj.markers,
        questsConfig: workingProj.questsConfig,
        playerInventory: workingProj.playerInventory,
        player: workingProj.player,
      });
    }

    const rewardMsg = q?.successMessage || `🎉 Missão "${q?.title || m.name}" Finalizada! +200 XP • +120 Ouro! ⭐`;
    setActionFeedback(rewardMsg);
    setTimeout(() => setActionFeedback(null), 4000);
    setInspectedMarker(null);
    bumpQuests();
  };

  const creditTalk = (markerId: string) => {
    let changed = false;
    (markersRef.current || []).forEach((npc) => {
      if (npc.type !== 'npc' || !npc.quest || npc.quest.kind !== 'talk') return;
      const prog = getProg(npc.id);
      // Só credita conversa em uma missão de 'talk' se a missão JÁ tiver sido aceita pelo jogador!
      if (!prog.accepted || prog.done) return;
      const targets = npc.quest.targetMarkerIds || [];
      if (targets.length > 0 && !targets.includes(markerId) && npc.id !== markerId) return;
      if (prog.talked.includes(markerId)) return;
      questProgRef.current[npc.id] = { ...prog, talked: [...prog.talked, markerId] };
      changed = true;
    });

    try {
      const currentProj = projectRef.current || project;
      const targetMarker = (currentProj.markers || []).find((m) => m.id === markerId);
      const evtRes = dispatchEngineEvent(currentProj, {
        type: 'npc.talked',
        sourceSystem: 'dialogue',
        targetId: markerId,
        npcId: markerId,
        npcName: targetMarker?.dialogueCharacterName || targetMarker?.name,
        shopId: targetMarker?.shopId,
      });
      projectRef.current = evtRes.updatedProject;
      if (onUpdateProject) {
        onUpdateProject({
          questsConfig: evtRes.updatedProject.questsConfig,
          playerInventory: evtRes.updatedProject.playerInventory,
          player: evtRes.updatedProject.player,
        });
      }
    } catch (err) {
      console.warn('Aviso ao registrar conversa com NPC na engine de quests:', err);
    }

    if (changed) {
      setActionFeedback(`💬 Conversa registrada nas Missões!`);
      setTimeout(() => setActionFeedback(null), 2500);
      bumpQuests();
    }
  };

  const creditDuel = (markerId: string) => {
    let changed = false;
    (markersRef.current || []).forEach((npc) => {
      if ((npc.type !== 'npc' && npc.type !== 'boss') || !npc.quest || npc.quest.kind !== 'duel') return;
      const prog = getProg(npc.id);
      const targets = npc.quest.targetMarkerIds || [];
      if (targets.length > 0 && !targets.includes(markerId) && npc.id !== markerId) return;
      if (prog.dueled.includes(markerId)) return;
      questProgRef.current[npc.id] = {
        ...prog,
        accepted: true,
        done: true,
        dueled: [...prog.dueled, markerId],
      };
      changed = true;
    });

    try {
      const currentProj = projectRef.current || project;
      const targetMarker = (currentProj.markers || []).find((m) => m.id === markerId);
      const evtRes1 = dispatchEngineEvent(currentProj, {
        type: 'combat.mob_defeated',
        sourceSystem: 'combat',
        targetId: markerId,
        npcId: markerId,
        npcName: targetMarker?.name,
        mobSpecies: targetMarker?.mobSpecies || 'slime_selvagem',
      });
      const evtRes2 = dispatchEngineEvent(evtRes1.updatedProject, {
        type: 'combat.duel_won',
        sourceSystem: 'combat',
        targetId: markerId,
        npcId: markerId,
        npcName: targetMarker?.name,
        mobSpecies: targetMarker?.mobSpecies || 'slime_selvagem',
      });
      const xpRes = grantXpCentralService(evtRes2.updatedProject, 150, `Duelo vencido: ${targetMarker?.name || 'Inimigo'}`);
      projectRef.current = xpRes.updatedProject;
      if (onUpdateProject) {
        onUpdateProject({
          questsConfig: xpRes.updatedProject.questsConfig,
          playerInventory: xpRes.updatedProject.playerInventory,
          player: xpRes.updatedProject.player,
        });
      }
    } catch (err) {
      console.warn('Aviso ao registrar duelo na engine de quests:', err);
    }

    setActionFeedback(`⚔️ Vitória no Duelo! +150 XP & Progresso de Caçada atualizado!`);
    setTimeout(() => setActionFeedback(null), 3200);
    if (changed) {
      bumpQuests();
    }
  };

  // Origem X de um sub-bioma na fileira do Extended (para mapear marcador local -> global)
  const subBiomeOriginXOf = (list: import('../types/map').SubBiomeConfig[], id: string): number | null => {
    let cx = 0;
    for (const sb of list) {
      if (sb.id === id) return cx;
      cx += (sb.tileWidth || 400) + 40;
    }
    return null;
  };

  // Executa o deslocamento do travel (chamado no meio do fade).
  // Retorna ok + a vista da fase de destino (para sincronizar o canvas).
  const performTravelMove = (marker: MapMarker): { ok: boolean; view: 'vertical' | 'extended' | null } => {
    const t = marker.travelTargetType || 'marker';
    if (t === 'sub_biome') {
      const sb = project.subBiomes?.find((s) => s.id === marker.targetSubBiomeId);
      if (!sb) return { ok: false, view: null };
      setActiveSubBiome(sb);
      return { ok: true, view: null };
    }
    if (t === 'level') {
      const lv = savedLevels.find((l) => l.id === marker.targetLevelId);
      if (!lv || !onLoadLevel) return { ok: false, view: null };
      onLoadLevel(lv);
      const lm = marker.targetLevelMarkerId
        ? lv.projectData?.markers?.find((m) => m.id === marker.targetLevelMarkerId)
        : undefined;
      if (lm) {
        let gx = lm.x;
        if (lm.subBiomeId) {
          const ox = subBiomeOriginXOf(lv.projectData?.subBiomes || [], lm.subBiomeId);
          if (ox === null) return { ok: false, view: null };
          gx = ox + lm.x;
        }
      if (onUpdatePlayerRef.current) onUpdatePlayerRef.current({ x: gx, y: lm.y });
      if (playerRef.current) {
        playerRef.current.x = gx;
        playerRef.current.y = lm.y;
      }
        contactedMarkerIdsRef.current.add(lm.id);
        onSelectMarkerRef.current?.(lm.id);
        return { ok: true, view: lm.subBiomeId ? 'extended' : 'vertical' };
      }
      return { ok: true, view: null };
    }
    const target = project.markers.find((m) => m.id === marker.targetTravelMarkerId);
    if (!target) return { ok: false, view: null };
    let gx = target.x;
    const gy = target.y;
    if (target.subBiomeId) {
      const ox = subBiomeOriginXOf(project.subBiomes || [], target.subBiomeId);
      if (ox === null) return { ok: false, view: null };
      gx = ox + target.x;
    }
    if (onUpdatePlayerRef.current) onUpdatePlayerRef.current({ x: gx, y: gy });
    if (playerRef.current) {
      playerRef.current.x = gx;
      playerRef.current.y = gy;
    }
    contactedMarkerIdsRef.current.add(target.id);
    return { ok: true, view: target.subBiomeId ? 'extended' : 'vertical' };
  };

  // Pop-up/dialogo padrão ao contatar marcador (usado no modo manual e como fallback)
  const openMarkerPopup = (marker: MapMarker) => {
    onSelectMarkerRef.current?.(marker.id);
    const behavior = marker.clickBehavior || (marker.dialogueEnabled ? 'dialogue_first' : 'popup_first');
    if (behavior === 'dialogue_first' || behavior === 'dialogue_only') {
      setActiveDialogueMarker(marker);
      setCurrentStepIndex(0);
      setDialogueCustomFeedback(null);
      creditTalk(marker.id);
    } else {
      setInspectedMarker(marker);
    }
  };

  // Pop-up/diálogo do NPC: abre IMEDIATAMENTE o diálogo ou a cápsula de missão ao tocar ou se aproximar!
  const openNpcPopup = (marker: MapMarker) => {
    onSelectMarkerRef.current?.(marker.id);
    const hasDialogueContent =
      marker.dialogueEnabled ||
      Boolean(marker.dialogueSteps && marker.dialogueSteps.length > 0) ||
      Boolean(marker.dialogueText && marker.dialogueText.trim()) ||
      Boolean(marker.dialogueId);

    if (hasDialogueContent) {
      setActiveDialogueMarker(marker);
      setCurrentStepIndex(0);
      setDialogueCustomFeedback(null);
      setInspectedMarker(null);
      creditTalk(marker.id);
    } else {
      setInspectedMarker(marker);
      creditTalk(marker.id);
    }
  };

  // Interação com Estação / Tela Interativa (Chocadeira, etc.) com checagem de desbloqueio
  const handleInteractWithStation = (marker: MapMarker) => {
    const station = marker.stationConfig;
    const cond = station?.unlockCondition;

    if (!cond || cond.type === 'always' || cond.isUnlocked) {
      setActiveStationMarker(marker);
      return;
    }

    if (cond.type === 'level') {
      const heroLevel = (project.player as any)?.level || 1;
      const minLevel = cond.minLevel || 3;
      if (heroLevel < minLevel) {
        setActionFeedback(cond.lockedMessage || `🔒 Bloqueado! Requer Nível ${minLevel} do Herói.`);
        setTimeout(() => setActionFeedback(null), 3000);
        return;
      }
    }

    if (cond.type === 'event' && cond.requiredEventId) {
      if (!contactedMarkerIdsRef.current.has(cond.requiredEventId)) {
        setActionFeedback(cond.lockedMessage || '🔒 Bloqueado! Ative o evento prévio no mapa primeiro.');
        setTimeout(() => setActionFeedback(null), 3000);
        return;
      }
    }

    if (cond.type === 'quest' && cond.requiredQuestId) {
      const prog = getProg(cond.requiredQuestId);
      if (!prog.done) {
        setActionFeedback(cond.lockedMessage || '🔒 Bloqueado! Complete a missão requerida primeiro.');
        setTimeout(() => setActionFeedback(null), 3000);
        return;
      }
    }

    if (cond.type === 'purchased') {
      const resName = cond.costResourceName || 'Ouro';
      const cost = cond.costAmount || 50;
      const currentQty = playerInventory[resName] || 0;

      if (currentQty < cost) {
        setActionFeedback(cond.lockedMessage || `🔒 Requer ${cost} ${resName} para desbloquear. Você possui ${currentQty}.`);
        setTimeout(() => setActionFeedback(null), 3500);
        return;
      }

      setPlayerInventory((prev) => ({
        ...prev,
        [resName]: Math.max(0, (prev[resName] || 0) - cost),
      }));
      onUpdateMarker?.(marker.id, {
        stationConfig: {
          ...station!,
          unlockCondition: {
            ...cond,
            isUnlocked: true,
          },
        },
      });
      setActionFeedback(`✨ Desbloqueado com sucesso por ${cost} ${resName}!`);
      setTimeout(() => setActionFeedback(null), 2500);
    }

    setActiveStationMarker(marker);
  };

  // Teleporte AUTOMÁTICO com desvanecer de tela preta (sem nenhum pop-up na tela).
  // Atravessa fases: vertical <-> Extended (a vista acompanha o destino).
  const autoTravel = (marker: MapMarker) => {
    const now = performance.now();
    // Recuperação: se alguma trava ficou presa há mais de 3s, solta.
    if (teleportingRef.current && now - lastTeleportAtRef.current > 3000) {
      teleportingRef.current = false;
    }
    if (teleportingRef.current || now - lastTeleportAtRef.current < 1500) return;
    const t = marker.travelTargetType || 'marker';
    if (t === 'marker' && !project.markers.find((m) => m.id === marker.targetTravelMarkerId)) {
      setActionFeedback(`⚠️ Nenhum marcador Travel de destino configurado!`);
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }
    teleportingRef.current = true;
    lastTeleportAtRef.current = now;
    contactedMarkerIdsRef.current.add(marker.id);
    setInspectedMarker(null);
    setFadeColor('#000000');
    setTeleportFade('out');
    setTimeout(() => {
      const res = performTravelMove(marker);
      if (!res.ok) {
        setActionFeedback(`⚠️ Destino do teleporte não encontrado!`);
        setTimeout(() => setActionFeedback(null), 3000);
      }
      // A vista acompanha sozinha: o destino está sempre na mesma tela
      // (travessias entre telas usam destino em fase salva, que carrega a tela).
      setTeleportFade('in');
      setTimeout(() => {
        setTeleportFade(null);
        teleportingRef.current = false;
      }, 400);
    }, 350);
  };

  // Executa transição cinemática suave da câmera (Pan-In -> Hold -> Pan-Out) com suporte a marcador alvo, coordenada ou jogador
  const runCinematicCameraEvent = (ev: import('../types/map').MarkerEventItem, sourceMarker: MapMarker): number => {
    if (activeCinematicCancelRef.current) {
      activeCinematicCancelRef.current();
      activeCinematicCancelRef.current = null;
    }

    const p = playerRef.current || { x: 384, y: 100 };
    let targetX = p.x;
    let targetY = p.y;

    const targetType = ev.cinematicTargetType || 'marker';
    if (targetType === 'marker') {
      const targetMarker = ev.cinematicTargetMarkerId
        ? projectRef.current.markers.find((m) => m.id === ev.cinematicTargetMarkerId) || sourceMarker
        : sourceMarker;
      targetX = targetMarker.x;
      targetY = targetMarker.y;
      if (isExtended && targetMarker.subBiomeId) {
        let cx = 0;
        for (const sb of projectRef.current.subBiomes || []) {
          if (sb.id === targetMarker.subBiomeId) {
            targetX = cx + targetMarker.x;
            break;
          }
          cx += (sb.tileWidth || 400) + 40;
        }
      }
    } else if (targetType === 'coordinate') {
      targetX = ev.cinematicTargetX ?? sourceMarker.x;
      targetY = ev.cinematicTargetY ?? sourceMarker.y;
    }

    const panInSec = Math.max(0.1, ev.cinematicPanInDuration ?? 1.2);
    const holdSec = Math.max(0, ev.cinematicHoldDuration ?? 2.0);
    const panOutSec = Math.max(0.1, ev.cinematicPanOutDuration ?? 1.0);
    const totalSec = panInSec + holdSec + panOutSec;
    const targetZoom = ev.cinematicZoom ?? 1.45;
    const startZoom = camZoomValRef.current || 1.0;

    if (ev.cinematicFreezePlayer !== false) {
      eventFreezeUntilRef.current = Math.max(eventFreezeUntilRef.current, performance.now() + totalSec * 1000);
    }

    const startX = p.x;
    const startY = p.y;
    const startTime = performance.now();
    let rafId = 0;
    let cancelled = false;

    const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const stepCinematic = (now: number) => {
      if (cancelled) return;
      const elapsed = (now - startTime) / 1000;
      const curPlayer = playerRef.current || { x: startX, y: startY };

      let focusX = targetX;
      let focusY = targetY;
      let currentZ = targetZoom;

      if (elapsed < panInSec) {
        const k = easeInOutCubic(Math.max(0, Math.min(1, elapsed / panInSec)));
        focusX = startX + (targetX - startX) * k;
        focusY = startY + (targetY - startY) * k;
        currentZ = startZoom + (targetZoom - startZoom) * k;
      } else if (elapsed < panInSec + holdSec) {
        focusX = targetX;
        focusY = targetY;
        currentZ = targetZoom;
      } else if (elapsed < totalSec) {
        const k = easeInOutCubic(Math.max(0, Math.min(1, (elapsed - panInSec - holdSec) / panOutSec)));
        focusX = targetX + (curPlayer.x - targetX) * k;
        focusY = targetY + (curPlayer.y - targetY) * k;
        currentZ = targetZoom + (startZoom - targetZoom) * k;
      } else {
        lastZoomKeyRef.current = '';
        applyCameraZoomFor(curPlayer.x, curPlayer.y);
        if (containerRef.current) {
          const clientW = containerSizeRef.current.w;
          const clientH = containerSizeRef.current.h;
          const maxScrollTop = Math.max(0, scaledMapHeight - clientH);
          const maxScrollLeft = Math.max(0, scaledMapWidth - clientW);
          containerRef.current.scrollTop = Math.max(0, Math.min(maxScrollTop, curPlayer.y * scale - clientH / 2));
          containerRef.current.scrollLeft = Math.max(0, Math.min(maxScrollLeft, curPlayer.x * scale - clientW / 2));
        }
        activeCinematicCancelRef.current = null;
        return;
      }

      setZoomVisual(currentZ, focusX * scale, focusY * scale);
      if (containerRef.current) {
        const clientW = containerSizeRef.current.w;
        const clientH = containerSizeRef.current.h;
        const maxScrollTop = Math.max(0, scaledMapHeight - clientH);
        const maxScrollLeft = Math.max(0, scaledMapWidth - clientW);
        containerRef.current.scrollTop = Math.max(0, Math.min(maxScrollTop, focusY * scale - clientH / 2));
        containerRef.current.scrollLeft = Math.max(0, Math.min(maxScrollLeft, focusX * scale - clientW / 2));
      }

      rafId = requestAnimationFrame(stepCinematic);
    };

    activeCinematicCancelRef.current = () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
    };
    rafId = requestAnimationFrame(stepCinematic);
    return totalSec;
  };

  // Dispara o EVENTO do marcador (tipo event ou área): suporta som, clima, diálogo e fila sequencial modular
  const triggerEvent = (marker: MapMarker) => {
    // 1. Suporte a Eventos Modulares encadeados ou múltiplos (marker.events) com delaySeconds e waitPrevious
    if (marker.events && marker.events.length > 0) {
      let accumulatedDelaySec = 0;

      const executeSingleEventItem = (ev: import('../types/map').MarkerEventItem) => {
        if (ev.type === 'sound_area' && ev.audioUrl) {
          const a = new Audio(ev.audioUrl);
          a.volume = isBgmMuted ? 0 : Math.max(0.05, Math.min(1, ev.audioVolume ?? 0.8));
          if (ev.audioBlendMode === 'blend_bgm') {
            bgmDuckingFactorRef.current = 0.25;
            const p = playerRef.current;
            if (p) syncBiomeBgmFor(p.x, p.y);
            a.addEventListener('ended', () => {
              bgmDuckingFactorRef.current = 1.0;
              const pp = playerRef.current;
              if (pp) syncBiomeBgmFor(pp.x, pp.y);
            });
          }
          a.play().catch((err) => console.warn('Erro ao reproduzir áudio do evento:', err));
        }
        if (ev.type === 'weather' && ev.weatherType && ev.weatherType !== 'none') {
          setWeatherOverride({ markerId: marker.id, weather: ev.weatherType });
        }
        if (ev.type === 'dialogue') {
          creditTalk(marker.id);
          setActiveDialogueMarker(marker);
          setCurrentStepIndex(0);
          setDialogueCustomFeedback(null);
        }
        if (ev.type === 'cinematic') {
          runCinematicCameraEvent(ev, marker);
        }
        if (ev.type === 'reward') {
          onSelectMarkerRef.current?.(marker.id);
          setInspectedMarker(marker);
        }
      };

      marker.events.forEach((ev, idx) => {
        const ownDelay = Math.max(0, ev.delaySeconds ?? 0);
        if (idx === 0) {
          accumulatedDelaySec = ownDelay;
        } else if (ev.waitPrevious) {
          const prevEv = marker.events![idx - 1];
          const prevDuration =
            prevEv.type === 'cinematic'
              ? Math.max(0.1, prevEv.cinematicPanInDuration ?? 1.2) +
                Math.max(0, prevEv.cinematicHoldDuration ?? 2.0) +
                Math.max(0.1, prevEv.cinematicPanOutDuration ?? 1.0)
              : 1.5;
          accumulatedDelaySec += prevDuration + ownDelay;
        } else {
          accumulatedDelaySec = ownDelay;
        }

        if (accumulatedDelaySec <= 0.01) {
          executeSingleEventItem(ev);
        } else {
          const waitMs = Math.round(accumulatedDelaySec * 1000);
          setTimeout(() => {
            executeSingleEventItem(ev);
          }, waitMs);
        }
      });

      return;
    }

    const kind = marker.eventKind || 'popup';
    const dur = Math.max(0, marker.eventDuration ?? (kind === 'zoom' ? 3 : 0));

    // 2. Suporte a Áudio / Som legado ou direto
    if (kind === 'sound' || kind === 'sound_area' || marker.audioUrl) {
      const audioUrl = marker.audioUrl;
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        audio.volume = isBgmMuted ? 0 : Math.max(0.05, Math.min(1, marker.audioVolume ?? 0.8));
        audio.play().catch((err) => console.warn('Erro ao reproduzir áudio:', err));
      }
      return;
    }

    if (kind === 'weather') {
      const w = marker.eventWeather && marker.eventWeather !== 'none' ? marker.eventWeather : null;
      if (!w) return;
      setWeatherOverride({ markerId: marker.id, weather: w });
      return;
    }
    if (marker.eventFreeze && dur > 0) {
      eventFreezeUntilRef.current = performance.now() + dur * 1000;
    }
    if (kind === 'zoom') {
      const z = marker.eventZoom ?? 1.5;
      const p = playerRef.current;
      if (p) setZoomVisual(z, p.x * scale, p.y * scale);
      camZoomValRef.current = z;
      if (p) camOriginRef.current = { x: p.x * scale, y: p.y * scale };
      if (dur > 0) {
        setTimeout(() => {
          lastZoomKeyRef.current = '';
          const pp = playerRef.current;
          if (pp) applyCameraZoomFor(pp.x, pp.y);
        }, dur * 1000);
      }
      return;
    }
    if (kind === 'dialogue') {
      if (marker.eventFreeze && dur <= 0) eventFreezeUntilRef.current = Number.MAX_SAFE_INTEGER;
      onSelectMarkerRef.current?.(marker.id);
      creditTalk(marker.id);
      setActiveDialogueMarker(marker);
      setCurrentStepIndex(0);
      setDialogueCustomFeedback(null);
      return;
    }
    if (kind === 'duel') {
      if (marker.eventFreeze && dur <= 0) eventFreezeUntilRef.current = Number.MAX_SAFE_INTEGER;
      onSelectMarkerRef.current?.(marker.id);
      if (marker.dialogueEnabled) {
        creditTalk(marker.id);
        setActiveDialogueMarker(marker);
        setCurrentStepIndex(0);
        setDialogueCustomFeedback(null);
      } else {
        setInspectedMarker(marker);
      }
      return;
    }
    if (kind === 'video') {
      if (!marker.eventVideoUrl) return;
      if (eventVideoActiveRef.current) return;
      if (marker.eventFreeze) {
        eventFreezeUntilRef.current = dur > 0 ? performance.now() + dur * 1000 : Number.MAX_SAFE_INTEGER;
      }
      // Chegada com desvanecer (mais longo): apaga, abre o vídeo em tela cheia, clareia
      eventVideoActiveRef.current = true;
      setFadeColor(marker.eventFadeColor || '#000000');
      setTeleportFade('out');
      setTimeout(() => {
        if (!eventVideoActiveRef.current) return;
        setEventVideo({ url: marker.eventVideoUrl as string, title: marker.name });
        setTeleportFade('in');
        setTimeout(() => {
          setTeleportFade(null);
        }, 500);
        if (dur > 0) {
          setTimeout(() => closeEventVideo(), dur * 1000);
        }
      }, 600);
      return;
    }
    // popup
    if (marker.eventFreeze && dur <= 0) eventFreezeUntilRef.current = Number.MAX_SAFE_INTEGER;
    onSelectMarkerRef.current?.(marker.id);
    setInspectedMarker(marker);
  };

  const handleTravelToSubBiome = (marker: MapMarker) => {
    const subBiome = project.subBiomes?.find((sb) => sb.id === marker.targetSubBiomeId);
    if (!subBiome) {
      setActionFeedback(`⚠️ Nenhum Sub-Bioma de destino configurado!`);
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    setActiveSubBiome(subBiome);
    setActionFeedback(`🏰 Entrando no Sub-Bioma: ${subBiome.name}...`);
    setTimeout(() => setActionFeedback(null), 3000);
    setInspectedMarker(null);
    onSelectMarker(null);
  };

  const handleTravelToLevel = (marker: MapMarker) => {
    const level = savedLevels.find((l) => l.id === marker.targetLevelId);
    if (!level) {
      setActionFeedback(`⚠️ Nenhuma Fase Salva selecionada na Galeria!`);
      setTimeout(() => setActionFeedback(null), 3000);
      return;
    }

    if (onLoadLevel) {
      onLoadLevel(level);
      setActionFeedback(`🎮 Viajando para a Fase: ${level.name}...`);
      setTimeout(() => setActionFeedback(null), 3500);
    }
    setInspectedMarker(null);
    onSelectMarker(null);
  };

  // Efeito de digitação (typewriter) finalizável no clique
  const [displayedDialogueText, setDisplayedDialogueText] = useState<string>('');
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(true);

  // Lista de falas/interações sequenciais configuradas para o marcador
  const dialogueSteps = (() => {
    if (liveDialogueMarker?.dialogueId && project.savedDialogues) {
      const saved = project.savedDialogues.find((d) => d.id === liveDialogueMarker.dialogueId);
      if (saved && saved.steps && saved.steps.length > 0) {
        return saved.steps;
      }
    }
    if (liveDialogueMarker?.dialogueSteps && liveDialogueMarker.dialogueSteps.length > 0) {
      return liveDialogueMarker.dialogueSteps;
    }
    const npcPhrases = (liveDialogueMarker?.npcPhrases || []).filter((p) => Boolean(p && p.trim()));
    if (npcPhrases.length > 0) {
      return npcPhrases.map((phrase, idx) => ({
        id: `npc-step-${idx}`,
        speaker: liveDialogueMarker?.dialogueCharacterName || liveDialogueMarker?.name,
        text: phrase,
        characterPng: liveDialogueMarker?.dialogueCharacterPng || liveDialogueMarker?.customIconPng,
        playerResponses: undefined,
      }));
    }
    if (liveDialogueMarker?.dialogueText && liveDialogueMarker.dialogueText.trim()) {
      return [
        {
          id: 'step-0',
          speaker: liveDialogueMarker.dialogueCharacterName || liveDialogueMarker.name,
          text: liveDialogueMarker.dialogueText,
          characterPng: liveDialogueMarker.dialogueCharacterPng || liveDialogueMarker.customIconPng,
          playerResponses: undefined,
        },
      ];
    }
    return [
      {
        id: 'step-0',
        speaker: liveDialogueMarker?.dialogueCharacterName || liveDialogueMarker?.name,
        text: 'Saudações, nobre viajante! O que o traz a estas terras?',
        characterPng: liveDialogueMarker?.dialogueCharacterPng || liveDialogueMarker?.customIconPng,
        playerResponses: undefined,
      },
    ];
  })();

  const totalSteps = dialogueSteps.length;
  const currentStep = dialogueSteps[Math.min(currentStepIndex, totalSteps - 1)] || dialogueSteps[0];
  const isFinalStep = currentStepIndex >= totalSteps - 1;

  // Texto completo do diálogo no momento (com adaptação dinâmica ao estado da Quest do NPC)
  const fullDialogueText = (() => {
    if (dialogueCustomFeedback) return dialogueCustomFeedback;
    if (liveDialogueMarker && (liveDialogueMarker.quest || liveDialogueMarker.linkedQuestId)) {
      const q = liveDialogueMarker.quest;
      const prog = getProg(liveDialogueMarker.id);
      const need = questNeed(liveDialogueMarker);
      const have = Math.min(need, questInventoryHave(liveDialogueMarker, playerInventory));
      const ready = questReady(liveDialogueMarker, playerInventory);
      const qTitle = q?.title || 'Missão Principal';
      const resName = q?.resourceName || 'itens';
      const resEmoji = q?.iconEmoji || '📦';

      if (prog.done) {
        return (
          q?.successMessage ||
          `Muito obrigado pela sua ajuda na missão "${qTitle}"! Graças a você, nossa tarefa já foi concluída com sucesso!`
        );
      }
      if (ready && (prog.accepted || q?.kind === 'collect')) {
        if (q?.kind === 'collect') {
          return `Excelente trabalho, aventureiro! Vejo que você já coletou todos os itens da missão "${qTitle}" (${need}/${need} ${resEmoji} ${resName})! Entregue-os agora para finalizar a missão e receber sua recompensa!`;
        }
        return `Excelente! Você cumpriu o objetivo da missão "${qTitle}"! Finalize a missão agora para receber sua recompensa!`;
      }
      if (prog.accepted && !ready) {
        if (q?.kind === 'collect') {
          return `Você já aceitou a missão "${qTitle}" e ela está em andamento! Progresso atual: ${have}/${need} ${resEmoji} ${resName}. Continue procurando pelo mapa e volte aqui quando tiver tudo para me entregar!`;
        }
        return `Você já aceitou a missão "${qTitle}" e ela está em andamento (${questText(liveDialogueMarker, playerInventory)})! Conclua o objetivo e volte a falar comigo!`;
      }
    }
    return currentStep?.text || '';
  })();

  // Orador e PNG atuais (por padrão carrega a PNG e nome do NPC, mas com suporte total a customização)
  const savedDiag = liveDialogueMarker?.dialogueId && project.savedDialogues
    ? project.savedDialogues.find((d) => d.id === liveDialogueMarker.dialogueId)
    : null;
  const currentSpeaker =
    liveDialogueMarker?.dialogueCharacterName?.trim() ||
    liveDialogueMarker?.name ||
    currentStep?.speaker ||
    savedDiag?.speaker ||
    'Nome';
  const currentCharacterPng =
    liveDialogueMarker?.dialogueCharacterPng ||
    currentStep?.characterPng ||
    savedDiag?.characterPng ||
    liveDialogueMarker?.customIconPng;

  // Gerencia o efeito typewriter sempre que o passo ou o texto do diálogo muda
  useEffect(() => {
    if (!liveDialogueMarker) {
      setDisplayedDialogueText('');
      setIsTypingComplete(true);
      return;
    }

    setDisplayedDialogueText('');
    setIsTypingComplete(false);

    let charIndex = 0;
    const targetText = fullDialogueText;
    const typingInterval = setInterval(() => {
      charIndex++;
      if (charIndex <= targetText.length) {
        setDisplayedDialogueText(targetText.slice(0, charIndex));
      } else {
        setIsTypingComplete(true);
        clearInterval(typingInterval);
      }
    }, 22); // digitação rápida e responsiva

    return () => clearInterval(typingInterval);
  }, [liveDialogueMarker?.id, currentStepIndex, dialogueCustomFeedback, fullDialogueText]);

  // Extrai tema de cores dinâmico da PNG do NPC / Asset em cena
  useEffect(() => {
    if (!liveDialogueMarker) {
      setDialogueTheme(DEFAULT_GREEN_THEME);
      return;
    }
    const targetImg = currentCharacterPng || liveDialogueMarker.customIconPng;
    const fallbackColor = liveDialogueMarker.color || '#547f29';
    let isMounted = true;
    extractThemeFromImage(targetImg, fallbackColor).then((extracted) => {
      if (isMounted) {
        setDialogueTheme(extracted);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [
    liveDialogueMarker?.id,
    liveDialogueMarker?.dialogueCharacterPng,
    liveDialogueMarker?.customIconPng,
    currentCharacterPng,
  ]);

  // Função para avançar fala ou finalizar efeito de digitação imediatamente no clique
  const handleDialogueBoxClick = () => {
    if (!isTypingComplete) {
      // Primeiro clique: finaliza a digitação instantaneamente
      setDisplayedDialogueText(fullDialogueText);
      setIsTypingComplete(true);
    } else if (!isFinalStep && !dialogueCustomFeedback) {
      // Segundo clique (quando já terminou de digitar e ainda há falas): avança para o próximo diálogo
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  // Vista do celular segue o canvas central (desacoplada da aba lateral).
  const isExtended =
    canvasView === 'extended' ||
    project.canvasKind === 'extended' ||
    activeTab === 'extended' ||
    ((project.subBiomes || []).length > 0 && project.biomes.length === 0);
  const hasPlayableContent = isExtended
    ? (project.subBiomes || []).length > 0
    : project.biomes.length > 0;
  const subBiomes = project.subBiomes || [];

  let effectiveMapWidth = project.mapWidth || 768;
  let effectiveMapHeight = getTotalMapHeight(project.biomes);

  if (isExtended) {
    if (subBiomes.length === 0) {
      effectiveMapWidth = screenWidth;
      effectiveMapHeight = screenHeight;
    } else {
      let wSum = 0;
      let hMax = 0;
      subBiomes.forEach((sb) => {
        const w = sb.tileWidth || screenWidth;
        const h = sb.tileHeight || screenHeight;
        wSum += w + 40;
        if (h > hMax) hMax = h;
      });
      effectiveMapWidth = Math.max(100, wSum - 40);
      effectiveMapHeight = Math.max(100, hMax);
    }
  }

  const totalMapWidth = Math.max(100, effectiveMapWidth);
  const spans = useMemo(() => getBiomeSegmentSpans(project.biomes), [project.biomes]);
  const totalMapHeight = Math.max(100, effectiveMapHeight);

  // Proporção matemática preservada: no modo Extended o mundo se expande e a câmera navega em 2D;
  // no modo Paisagem garante preenchimento horizontal sem faixas vazias.
  const baseWorldScale = (project.mapWidth && project.mapWidth > 0) ? (screenWidth / project.mapWidth) : (screenWidth / 768);
  const scale = isExtended
    ? (isLandscape
        ? Math.max(baseWorldScale, screenWidth / Math.max(100, totalMapWidth), screenHeight / Math.max(100, totalMapHeight))
        : baseWorldScale)
    : (totalMapWidth > 0 ? screenWidth / totalMapWidth : 1);
  const scaledMapWidth = Math.round(totalMapWidth * scale);
  const scaledMapHeight = Math.round(totalMapHeight * scale);

  // As camadas de atmosfera (SkyCloudsLayer, GroundFogLayer, RainAtmosphereLayer, LeavesAtmosphereLayer,
  // OrganicSnowDriftsLayer, AssetSnowCoat) foram 100% modularizadas e desacopladas no diretório ./atmosphere.


  const tileImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const subBiomeImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  // Refs para loop de animação sem re-instanciação
  const playerRef = useRef(project.player);
  useEffect(() => {
    playerRef.current = project.player;
  }, [project.player]);

  const markersRef = useRef(project.markers);
  useEffect(() => {
    markersRef.current = project.markers;
    const gp: MapMarker[] = [];
    const buckets = new Map<number, MapMarker[]>();

    for (const m of project.markers || []) {
      if (m.id.startsWith('terrain-')) {
        const bucketKey = Math.floor(m.y / 120);
        let list = buckets.get(bucketKey);
        if (!list) {
          list = [];
          buckets.set(bucketKey, list);
        }
        list.push(m);
      } else {
        gp.push(m);
      }
    }
    gameplayMarkersRef.current = gp;
    grassSpatialBucketsRef.current = buckets;
  }, [project.markers]);

  const collisionSetsRef = useRef<{
    walkable: Set<string>;
    blocked: Set<string>;
    subBiomes: Map<string, { walkable: Set<string>; blocked: Set<string> }>;
  }>({
    walkable: new Set(),
    blocked: new Set(),
    subBiomes: new Map(),
  });

  useEffect(() => {
    const sbMap = new Map<string, { walkable: Set<string>; blocked: Set<string> }>();
    for (const sb of project.subBiomes || []) {
      sbMap.set(sb.id, {
        walkable: new Set(sb.walkableCells || []),
        blocked: new Set(sb.blockedCells || []),
      });
    }
    collisionSetsRef.current = {
      walkable: new Set(project.walkableCells || []),
      blocked: new Set(project.blockedCells || []),
      subBiomes: sbMap,
    };
  }, [project.walkableCells, project.blockedCells, project.subBiomes]);

  // Sincroniza o zoom ao pousar (teleporte), ao carregar ou ao EDITAR o zoom do bioma:
  // força reaplicação para refletir o slider na hora, mesmo com o herói parado.
  useEffect(() => {
    lastZoomKeyRef.current = '';
    const p = project.player;
    if (p && !isNaN(p.x) && !isNaN(p.y)) applyCameraZoomFor(p.x, p.y);
  }, [project.player, project.biomes, project.subBiomes]);

  const nightOverlayRef = useRef<HTMLDivElement>(null);
  const nightLightRef = useRef<HTMLDivElement>(null);
  // Luz da lanterna NOS SPRITES: brilho por distância (highlights) + camada acima da vinheta
  const markerElsRef = useRef<HTMLElement[]>([]);
  const markerElMapRef = useRef<Map<string, HTMLElement>>(new Map());
  const lastLightRef = useRef<Map<string, number>>(new Map());
  const nightAppliedRef = useRef(false);
  const nightEventRef = useRef<string>('none');
  useEffect(() => {
    const root = containerRef.current;
    const map = new Map<string, HTMLElement>();
    if (root) {
      root.querySelectorAll<HTMLElement>('[data-mid]').forEach((el) => {
        const id = el.dataset.mid;
        if (id) map.set(id, el);
      });
    }
    markerElMapRef.current = map;
    markerElsRef.current = Array.from(map.values());
  }, [project.markers, isExtended]);

  const onUpdatePlayerRef = useRef(onUpdatePlayer);
  useEffect(() => {
    onUpdatePlayerRef.current = onUpdatePlayer;
  }, [onUpdatePlayer]);

  const onSelectMarkerRef = useRef(onSelectMarker);
  useEffect(() => {
    onSelectMarkerRef.current = onSelectMarker;
  }, [onSelectMarker]);

  // Auto-ajusta e valida a posição do jogador para NUNCA ficar fora dos limites se o mapa encolher
  useEffect(() => {
    if (!project.player) return;
    const curX = isNaN(project.player.x) ? 384 : project.player.x;
    const curY = isNaN(project.player.y) ? 100 : project.player.y;

    const clampedX = Math.max(16, Math.min(totalMapWidth - 16, curX));
    const clampedY = Math.max(16, Math.min(totalMapHeight - 16, curY));

    if (clampedX !== curX || clampedY !== curY) {
      onUpdatePlayerRef.current?.({ x: clampedX, y: clampedY });
    }
  }, [totalMapHeight, totalMapWidth, project.player?.x, project.player?.y]);

  // Ativa teste de diálogo quando disparado pela aba Diálogo
  useEffect(() => {
    if (testDialogueMarkerId) {
      const found = project.markers.find((m) => m.id === testDialogueMarkerId);
      if (found) {
        setActiveDialogueMarker(found);
        setCurrentStepIndex(0);
        setDialogueCustomFeedback(null);
      }
    }
  }, [testDialogueMarkerId, project.markers]);

  // Sincroniza activeDialogueMarker com as edições mais recentes em project.markers
  useEffect(() => {
    if (activeDialogueMarker) {
      const found = project.markers.find((m) => m.id === activeDialogueMarker.id);
      if (found) {
        setActiveDialogueMarker(found);
      }
    }
  }, [project.markers]);

  // Desacoplado: a seleção de marcadores no canvas do editor não afeta o emulador do jogo
  // para evitar que cliques no editor alterem a profundidade ou sobreponham o jogador.

  // Cache images
  useEffect(() => {
    project.biomes.forEach((b) => {
      const src = b.tilePng;
      if (!tileImagesRef.current.has(b.id) || tileImagesRef.current.get(b.id)?.src !== src) {
        const img = new Image();
        img.src = src;
        img.onload = () => drawEmulatorMap();
        tileImagesRef.current.set(b.id, img);
      }
    });
  }, [project.biomes]);

  useEffect(() => {
    (project.subBiomes || []).forEach((sb) => {
      const src = sb.tilePng;
      const existing = subBiomeImagesRef.current.get(sb.id);
      if (!existing || existing.src !== src) {
        const img = new Image();
        img.src = src;
        img.onload = () => drawEmulatorMap();
        subBiomeImagesRef.current.set(sb.id, img);
      }
    });
    drawEmulatorMap();
  }, [project.subBiomes, isExtended, scaledMapWidth, scaledMapHeight]);

  // Redraw canvas with exact PNG tile sizes and seamless pattern blending
  const drawEmulatorMap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isExtended) {
      // No modo extended, a renderização dos sub-biomas é feita via DOM <img> acelerada pela GPU.
      // Mantemos o canvas interno em 1x1 para evitar que o navegador aloque 400MB de VRAM (ex: 10000x10000px).
      if (canvas.width !== 1 || canvas.height !== 1) {
        canvas.width = 1;
        canvas.height = 1;
      }
      return;
    }

    const targetW = scaledMapWidth;
    const targetH = scaledMapHeight;
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(scale, scale);

    if (project.biomes.length > 0) {
      drawBiomeSpansWithFeather(ctx, spans, tileImagesRef.current, totalMapWidth);
    }

    // Sem overlay de pintura no emulador: é ferramenta de autoria (ver no editor).
    // A colisão continua valendo no movimento.

    ctx.restore();
  };

  // ===== Camadas Hardware-Accelerated de Pixel Stamps e Grama Instanciada =====
  const groundStampsCanvasRef = useRef<HTMLCanvasElement>(null);
  const vegetationCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = groundStampsCanvasRef.current;
    if (!canvas) return;
    renderGroundStampsPixelCanvas(
      canvas,
      project.groundStamps || [],
      project.stampLayers || [],
      totalMapWidth,
      totalMapHeight,
      scale,
      () => {
        if (groundStampsCanvasRef.current) {
          renderGroundStampsPixelCanvas(
            groundStampsCanvasRef.current,
            project.groundStamps || [],
            project.stampLayers || [],
            totalMapWidth,
            totalMapHeight,
            scale
          );
        }
      }
    );
  }, [project.groundStamps, project.stampLayers, totalMapWidth, totalMapHeight, scale]);

  useEffect(() => {
    let animId: number;
    let lastFrameTime = 0;

    const sbOriginMap = new Map<string, number>();
    if (isExtended) {
      let cx = 0;
      for (const sb of project.subBiomes || []) {
        sbOriginMap.set(sb.id, cx);
        cx += (sb.tileWidth || 400) + 40;
      }
    }

    const effectiveLayers =
      project.markerLayers && project.markerLayers.length > 0
        ? project.markerLayers
        : [{ id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0 }];
    const layerMap = new Map(effectiveLayers.map((l) => [l.id, l]));

    const getOriginX = (sbId?: string) => (isExtended && sbId ? (sbOriginMap.get(sbId) ?? 0) : 0);
    const isLayerVisible = (lId?: string) => {
      const mLayer = layerMap.get(lId || '') || effectiveLayers[0];
      const pGroup = mLayer?.groupId ? layerMap.get(mLayer.groupId) : null;
      return !mLayer || (mLayer.visible !== false && (!pGroup || pGroup.visible !== false));
    };

    const visibleTerrainMarkers = (project.markers || [])
      .filter((m) => {
        if (!m.id.startsWith('terrain-')) return false;
        if (isExtended ? !m.subBiomeId : Boolean(m.subBiomeId)) return false;
        return isLayerVisible(m.layerId);
      })
      .sort((a, b) => a.y - b.y);

    const renderFrame = (timestamp: number) => {
      const canvas = vegetationCanvasRef.current;
      if (!canvas) return;

      if (visibleTerrainMarkers.length === 0) {
        if (canvas.width !== 1 || canvas.height !== 1) {
          canvas.width = 1;
          canvas.height = 1;
        }
        return;
      }

      if (timestamp - lastFrameTime >= 32) {
        lastFrameTime = timestamp;
        const cont = containerRef.current;
        const scrX = cont ? cont.scrollLeft : 0;
        const scrY = cont ? cont.scrollTop : 0;
        const viewW = cont ? cont.clientWidth : screenWidth;
        const viewH = cont ? cont.clientHeight : screenHeight;
        const margin = 450;

        renderInstancedVegetationCanvas(
          canvas,
          visibleTerrainMarkers,
          totalMapWidth,
          totalMapHeight,
          scale,
          timestamp / 1000,
          {
            minX: Math.max(0, (scrX - margin) / scale),
            maxX: (scrX + viewW + margin) / scale,
            minY: Math.max(0, (scrY - margin) / scale),
            maxY: (scrY + viewH + margin) / scale,
          },
          getOriginX,
          isLayerVisible,
          playerRef.current ? { x: playerRef.current.x, y: playerRef.current.y } : null
        );
      }

      animId = requestAnimationFrame(renderFrame);
    };

    animId = requestAnimationFrame(renderFrame);
    return () => cancelAnimationFrame(animId);
  }, [project.markers, project.markerLayers, project.subBiomes, isExtended, totalMapWidth, totalMapHeight, scale, screenWidth, screenHeight]);

  // ===== Motion Pen no Preview (Extended & Vertical) =====
  const motionOverlayRef = useRef<HTMLCanvasElement>(null);
  const motionStrokesRef = useRef<{ x: number; y: number }[][]>([]);
  const motionCurrentRef = useRef<{ x: number; y: number }[] | null>(null);
  const motionPaintingRef = useRef<boolean>(false);

  const motionPos = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>): { x: number; y: number } | null => {
    const content = contentRef.current;
    if (!content) return null;
    const rect = content.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return null;
    return {
      x: (e.clientX - rect.left) / scale,
      y: (e.clientY - rect.top) / scale,
    };
  };

  // Loop de animação no overlay do emulador (renderiza sobreposições vivas com proporção exata e pausa quando ocioso)
  useEffect(() => {
    let animId: number;
    const loop = (timestamp: number) => {
      const over = motionOverlayRef.current;
      if (over) {
        const overlays = (project.motionOverlays || []).filter((ov) => ov.effect !== 'grass');
        const waterOverlays = overlays.filter(
          (ov) => ov.visible !== false && ov.effect === 'water' && ov.points && ov.points.length > 0
        );
        const nonWaterOverlays = overlays.filter(
          (ov) => ov.visible !== false && ov.effect !== 'water' && ov.points && ov.points.length > 0
        );

        const allStrokes = [...motionStrokesRef.current];
        if (motionCurrentRef.current && motionCurrentRef.current.length > 0) {
          allStrokes.push(motionCurrentRef.current);
        }

        const hasActiveMotion = waterOverlays.length > 0 || nonWaterOverlays.length > 0 || allStrokes.length > 0;
        if (!hasActiveMotion) {
          if (over.width !== 1 || over.height !== 1) {
            over.width = 1;
            over.height = 1;
          }
          return; // Pausa o RAF e libera a VRAM quando não há efeitos vivos
        }

        const targetW = Math.min(scaledMapWidth, 2048);
        const targetH = Math.min(scaledMapHeight, 4096);
        if (over.width !== targetW || over.height !== targetH) {
          over.width = targetW;
          over.height = targetH;
        }

        const ctx = over.getContext('2d');
        if (ctx) {
          const t = timestamp / 1000;
          ctx.clearRect(0, 0, over.width, over.height);

          ctx.save();
          ctx.scale(scale, scale);

          if (waterOverlays.length > 0) {
            renderUnifiedWaterOverlays(ctx, totalMapWidth, totalMapHeight, t, waterOverlays);
          }

          for (const ov of nonWaterOverlays) {
            renderMotionOverlayStroke(ctx, totalMapWidth, totalMapHeight, t, ov);
          }

          for (const path of allStrokes) {
            if (path.length === 0) continue;
            ctx.save();
            ctx.strokeStyle = 'rgba(232, 121, 249, 0.9)';
            ctx.lineWidth = motionBrushSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            path.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
            ctx.stroke();
            ctx.restore();
          }

          ctx.restore();
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [project.motionOverlays, activeTool, motionBrushSize, motionEffect, motionSpeed, motionIntensity, scale, scaledMapWidth, scaledMapHeight, totalMapWidth, totalMapHeight]);

  const redrawMotionPreview = () => {};

  const clearMotion = () => {
    motionStrokesRef.current = [];
    motionCurrentRef.current = null;
    motionPaintingRef.current = false;
    const over = motionOverlayRef.current;
    if (over) {
      const ctx = over.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, over.width, over.height);
    }
  };

  const extractMotion = () => {
    const main = canvasRef.current;
    if (!main || !onAddMotionMarkerAt) return;
    const strokes = motionStrokesRef.current;
    if (strokes.length === 0) return;
    const pad = motionBrushSize;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const path of strokes) {
      for (const p of path) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      }
    }
    const sx = Math.max(0, Math.floor(minX - pad));
    const sy = Math.max(0, Math.floor(minY - pad));
    const sw = Math.min(main.width - sx, Math.ceil(maxX + pad) - sx);
    const sh = Math.min(main.height - sy, Math.ceil(maxY + pad) - sy);
    if (sw < 2 || sh < 2) return;

    const copy = document.createElement('canvas');
    copy.width = sw;
    copy.height = sh;
    const cctx = copy.getContext('2d');
    if (!cctx) return;
    cctx.drawImage(main, sx, sy, sw, sh, 0, 0, sw, sh);

    const mask = document.createElement('canvas');
    mask.width = sw;
    mask.height = sh;
    const mctx = mask.getContext('2d');
    if (!mctx) return;
    mctx.strokeStyle = '#ffffff';
    mctx.lineWidth = motionBrushSize;
    mctx.lineCap = 'round';
    mctx.lineJoin = 'round';
    mctx.fillStyle = '#ffffff';
    for (const path of strokes) {
      if (path.length === 0) continue;
      mctx.beginPath();
      if (path.length === 1) {
        mctx.arc(path[0].x - sx, path[0].y - sy, motionBrushSize / 2, 0, Math.PI * 2);
        mctx.fill();
        continue;
      }
      mctx.moveTo(path[0].x - sx, path[0].y - sy);
      for (let i = 1; i < path.length; i++) mctx.lineTo(path[i].x - sx, path[i].y - sy);
      mctx.stroke();
    }
    cctx.globalCompositeOperation = 'destination-in';
    cctx.drawImage(mask, 0, 0);

    const imgData = cctx.getImageData(0, 0, sw, sh);
    let tx0 = sw;
    let ty0 = sh;
    let tx1 = -1;
    let ty1 = -1;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        if (imgData.data[(y * sw + x) * 4 + 3] > 8) {
          if (x < tx0) tx0 = x;
          if (y < ty0) ty0 = y;
          if (x > tx1) tx1 = x;
          if (y > ty1) ty1 = y;
        }
      }
    }
    if (tx1 < 0) return;
    const tw = tx1 - tx0 + 1;
    const th = ty1 - ty0 + 1;
    const final = document.createElement('canvas');
    final.width = tw;
    final.height = th;
    const fctx = final.getContext('2d');
    if (!fctx) return;
    fctx.drawImage(copy, tx0, ty0, tw, th, 0, 0, tw, th);
    const dataUrl = final.toDataURL('image/png');

    const cx = (sx + tx0 + tw / 2) / scale;
    const cy = (sy + ty0 + th / 2) / scale;

    if (isExtended) {
      const list = project.subBiomes || [];
      let cursorX = 0;
      let hitSb: import('../types/map').SubBiomeConfig | null = null;
      let localX = 0;
      for (const sb of list) {
        const w = sb.tileWidth || 400;
        if (cx >= cursorX && cx < cursorX + w) {
          hitSb = sb;
          localX = cx - cursorX;
          break;
        }
        cursorX += w + 40;
      }
      if (!hitSb) return;
      onAddMotionMarkerAt({
        x: localX,
        y: cy,
        subBiomeId: hitSb.id,
        dataUrl,
        w: tw / scale,
        h: th / scale,
      });
    } else {
      const span = spans.find((s) => cy >= s.startY && cy < s.endY);
      onAddMotionMarkerAt({
        x: cx,
        y: cy,
        biomeId: span ? span.biome.id : project.biomes[0]?.id || '',
      dataUrl,
        w: tw / scale,
        h: th / scale,
      });
    }
    clearMotion();
  };

  useEffect(() => {
    drawEmulatorMap();
  }, [project.biomes, project.subBiomes, isExtended, scale, screenWidth, screenHeight]);

  // Ref para controlar os marcadores já contatados e evitar re-disparos contínuos
  const contactedMarkerIdsRef = useRef<Set<string>>(new Set());
  // Ref do pop-up inspecionado (para fechar ao se afastar, dentro do loop)
  const inspectedMarkerRef = useRef<MapMarker | null>(null);
  useEffect(() => {
    inspectedMarkerRef.current = inspectedMarker;
  }, [inspectedMarker]);

  // Posições ativas ao vivo de NPCs com patrulha automática
  const npcLivePositionsRef = useRef<Map<string, { x: number; y: number; dir: string; isMoving: boolean }>>(new Map());

  // Loop contínuo de movimentação automática de NPCs (Patrulha / Auto-Caminhe)
  useEffect(() => {
    let animId: number;

    const loopPatrol = () => {
      const nowMs = performance.now();
      const mList = gameplayMarkersRef.current || [];

      // Se a fase não possui nenhum NPC com patrulha ou Action NPC ativo, nem Pet ativo, e não há combate em andamento,
      // reduz a verificação para ~6 FPS (a cada 160ms) em vez de gastar CPU/GPU a 60 FPS à toa.
      const hasAnyActiveNpc = mList.some(
        (m) => m.type === 'npc' && (m.actionNpc?.enabled || m.npcPatrol?.enabled)
      );
      const resolvedPetInLoop = getResolvedPlayerPetConfig(projectRef.current.player);
      if (
        !hasAnyActiveNpc &&
        !resolvedPetInLoop.enabled &&
        !hadCombatDataRef.current &&
        nowMs - lastNpcLoopTimeRef.current < 160
      ) {
        animId = requestAnimationFrame(loopPatrol);
        return;
      }

      const dt = Math.min((nowMs - lastNpcLoopTimeRef.current) / 1000, 0.05);
      lastNpcLoopTimeRef.current = nowMs;

      const elMap = markerElMapRef.current;
      const subList = projectRef.current.subBiomes || [];

      // Sincroniza e simula Action NPCs e Sistema Procedural de Emoções Compartilhadas
      globalNpcActionEngine.syncMarkers(mList);
      const playerCurrentPos = {
        x: playerRef.current?.x ?? 384,
        y: playerRef.current?.y ?? 100,
      };
      const simResult = globalNpcActionEngine.update(dt, nowMs, mList, playerCurrentPos);

      // Sincroniza contagem regressiva de 15s dos NPCs em Tontura (50% PV) para exibir a cápsula [Batalhar | Escanear]
      if (nowMs - lastStunSyncRef.current > 180) {
        lastStunSyncRef.current = nowMs;
        const nextStunMap = new Map<string, { remainingSec: number; currentHp: number; maxHp: number }>();
        for (const m of mList) {
          if (m.type === 'npc' && m.actionNpc?.enabled) {
            const rs = globalNpcActionEngine.getRuntimeState(m.id);
            if (rs && rs.stunUntil && nowMs < rs.stunUntil && rs.currentHp > 0) {
              nextStunMap.set(m.id, {
                remainingSec: Math.max(1, Math.ceil((rs.stunUntil - nowMs) / 1000)),
                currentHp: rs.currentHp,
                maxHp: rs.maxHp,
              });
            }
          }
        }
        setStunnedNpcsInfo((prev) => {
          if (prev.size === 0 && nextStunMap.size === 0) return prev;
          return nextStunMap;
        });
      }

      // =======================================================================
      // SIMULAÇÃO 60FPS DO PET COMPANHEIRO (TRILHA, PASSEIO CURIOSO, IA DE COMBATE & PROJÉTEIS)
      // =======================================================================
      if (resolvedPetInLoop.enabled) {
        const pr = petRuntimeRef.current;
        if (!pr.initialized) {
          pr.x = playerCurrentPos.x - 28;
          pr.y = playerCurrentPos.y + 18;
          pr.initialized = true;
        }

        // 1. Grava trilha de passos do jogador quando ele caminha
        const trail = playerTrailRef.current;
        const lastCrumb = trail[trail.length - 1];
        if (!lastCrumb || Math.hypot(playerCurrentPos.x - lastCrumb.x, playerCurrentPos.y - lastCrumb.y) >= 5) {
          trail.push({ x: playerCurrentPos.x, y: playerCurrentPos.y });
          if (trail.length > 80) {
            trail.shift();
          }
        }

        const getMarkerGlobalPos = (m: MapMarker): { x: number; y: number } => {
          let ox = 0;
          if (isExtended && m.subBiomeId) {
            for (const sb of subList) {
              if (sb.id === m.subBiomeId) break;
              ox += (sb.tileWidth || 400) + 40;
            }
          }
          const live = npcLivePositionsRef.current.get(m.id);
          return {
            x: ox + (live ? live.x : m.x),
            y: live ? live.y : m.y,
          };
        };

        // 2. Inteligência de Alvo (Auto-foco em modo Caçador Autônomo ou Guardião Defensivo)
        if (!pr.combatTargetId && resolvedPetInLoop.aiAggroMode !== 'command_auto') {
          for (const m of mList) {
            if (m.type !== 'npc' || !m.actionNpc?.enabled) continue;
            const rs = globalNpcActionEngine.getRuntimeState(m.id);
            if (!rs || rs.currentHp <= 0) continue;
            if (rs.stunUntil && nowMs < rs.stunUntil) continue;
            const mPos = getMarkerGlobalPos(m);
            const distToHero = Math.hypot(mPos.x - playerCurrentPos.x, mPos.y - playerCurrentPos.y);
            if (
              (resolvedPetInLoop.aiAggroMode === 'full_autonomous' && distToHero <= resolvedPetInLoop.attackRange) ||
              (resolvedPetInLoop.aiAggroMode === 'defensive_guard' &&
                rs.aiState === 'attack' &&
                distToHero <= resolvedPetInLoop.attackRange)
            ) {
              pr.combatTargetId = m.id;
              break;
            }
          }
        }

        let targetX = playerCurrentPos.x - 26;
        let targetY = playerCurrentPos.y + 16;
        let moveSpeed = Math.max(135, (projectRef.current.player?.speed || 4) * 95);

        // 3. Se o Pet tem um Mobby inimigo focado para atacar:
        const targetMarker = pr.combatTargetId
          ? mList.find((m) => m.id === pr.combatTargetId && m.type === 'npc' && m.actionNpc?.enabled)
          : null;
        const targetRs = targetMarker ? globalNpcActionEngine.getRuntimeState(targetMarker.id) : undefined;

        if (!targetMarker || !targetRs || targetRs.currentHp <= 0) {
          pr.combatTargetId = null;
        } else {
          const mobPos = getMarkerGlobalPos(targetMarker);
          const distHeroToMob = Math.hypot(mobPos.x - playerCurrentPos.x, mobPos.y - playerCurrentPos.y);

          // Se o herói se afastar muito (> 420px), o Pet volta para o herói
          if (distHeroToMob > 420) {
            pr.combatTargetId = null;
          } else if (targetRs.stunUntil && nowMs < targetRs.stunUntil) {
            // Mobby está em TONTURA de 15s (50% PV)! O Pet PAUSA o ataque e orbita atento esperando os 15s ou decisão do jogador!
            const orbitAngle = nowMs * 0.0028;
            targetX = mobPos.x + Math.cos(orbitAngle) * 52;
            targetY = mobPos.y + Math.sin(orbitAngle) * 36;
          } else {
            // Mobby ativo (ou os 15s de tontura acabaram!): o Pet retoma o ataque automaticamente!
            const atkStyle = resolvedPetInLoop.attackStyle;
            const isRangedStyle = atkStyle === 'flying_ranged' || atkStyle === 'walker_ranged';
            const desiredDist = isRangedStyle ? 105 : 26;
            const dxMob = mobPos.x - pr.x;
            const dyMob = mobPos.y - pr.y;
            const distPetToMob = Math.hypot(dxMob, dyMob);

            if (nowMs < pr.attackLungeUntil && pr.attackLungeTarget) {
              targetX = pr.attackLungeTarget.x;
              targetY = pr.attackLungeTarget.y;
              moveSpeed = 420;
            } else if (distPetToMob > desiredDist + 12) {
              const ang = Math.atan2(dyMob, dxMob);
              targetX = mobPos.x - Math.cos(ang) * desiredDist;
              targetY = mobPos.y - Math.sin(ang) * desiredDist;
              moveSpeed = 240;
            } else {
              const orbitAng = nowMs * 0.003;
              targetX = mobPos.x + Math.cos(orbitAng) * desiredDist;
              targetY = mobPos.y + Math.sin(orbitAng) * (desiredDist * 0.75);
            }

            // Executa o golpe/disparo do Pet no intervalo de cadência (~1.05s)
            const attackCooldownMs = atkStyle === 'berserker_spin' ? 820 : 1050;
            if (nowMs - pr.lastAttackTime >= attackCooldownMs && distPetToMob <= resolvedPetInLoop.attackRange + 40) {
              pr.lastAttackTime = nowMs;
              pr.facingLeft = mobPos.x < pr.x;

              if (isRangedStyle) {
                // Dispara projétil mágico do Pet em direção ao Mobby
                petProjectilesRef.current.push({
                  id: `pet-proj-${nowMs}-${Math.random()}`,
                  x: pr.x,
                  y: pr.y - (resolvedPetInLoop.locomotionType === 'flying' ? 18 : 8),
                  targetId: targetMarker.id,
                  targetX: mobPos.x,
                  targetY: mobPos.y,
                  speed: 340,
                  damage: resolvedPetInLoop.attackDamage,
                  emoji: resolvedPetInLoop.projectileEmoji || '🔥',
                  color: resolvedPetInLoop.color || '#f59e0b',
                });
              } else {
                // Golpe corpo-a-corpo (Dash, Mergulho Rasante ou Giro Furioso)
                pr.attackLungeUntil = nowMs + 230;
                pr.attackLungeTarget = { x: mobPos.x, y: mobPos.y };
                if (atkStyle === 'berserker_spin') {
                  pr.spinUntil = nowMs + 480;
                }
                const dmgRes = globalNpcActionEngine.applyDamage(
                  targetMarker.id,
                  resolvedPetInLoop.attackDamage,
                  { x: pr.x, y: pr.y },
                  'pet',
                  nowMs
                );
                if (dmgRes.enteredStun) {
                  pr.emoteText = '💫 50% PV! Tonto 15s!';
                  pr.emoteUntil = nowMs + 2500;
                  setActionFeedback(
                    `💫 ${targetMarker.name} caiu em Tontura por 15s (50% PV)! Clique em Batalhar ou Escanear!`
                  );
                  setTimeout(() => setActionFeedback(null), 3500);
                } else if (dmgRes.died) {
                  pr.combatTargetId = null;
                  grantPetCombatXp(45);
                }
              }
            }
          }
        }

        // 4. Se não está em combate: Segue a trilha ao andar ou passeia curioso ao redor quando o herói para!
        if (!pr.combatTargetId) {
          const isHeroMoving =
            Math.hypot(joystickVectorRef.current.x, joystickVectorRef.current.y) > 0.1 ||
            !!activeDashRef.current ||
            !!tapTargetRef.current;

          if (isHeroMoving && trail.length > 2) {
            const lagIdx = Math.max(0, trail.length - 1 - (resolvedPetInLoop.followLagSteps || 12));
            const crumb = trail[lagIdx] || trail[0];
            targetX = crumb.x;
            targetY = crumb.y;
            moveSpeed = Math.max(165, (projectRef.current.player?.speed || 4) * 105);
          } else {
            // Herói parado: Pet fica curioso andando/voando em volta!
            const radius = resolvedPetInLoop.curiousRadius || 48;
            if (resolvedPetInLoop.locomotionType === 'flying') {
              pr.curiousAngle += dt * 1.45 * (resolvedPetInLoop.curiousSpeed || 1.0);
              targetX = playerCurrentPos.x + Math.cos(pr.curiousAngle) * radius;
              targetY = playerCurrentPos.y + Math.sin(pr.curiousAngle) * (radius * 0.72);
              moveSpeed = 95 * (resolvedPetInLoop.curiousSpeed || 1.0);
            } else {
              if (nowMs >= pr.nextCuriousChangeAt) {
                const randAng = Math.random() * Math.PI * 2;
                const randR = radius * (0.45 + Math.random() * 0.55);
                pr.curiousTargetOffset = {
                  x: Math.cos(randAng) * randR,
                  y: Math.sin(randAng) * (randR * 0.8),
                };
                pr.nextCuriousChangeAt = nowMs + 1600 + Math.random() * 1400;
                if (Math.random() < 0.35 && nowMs > pr.emoteUntil) {
                  const curiousEmotes = ['🐾', '❓', '✨', '🎵', '👀'];
                  pr.emoteText = curiousEmotes[Math.floor(Math.random() * curiousEmotes.length)];
                  pr.emoteUntil = nowMs + 1100;
                }
              }
              targetX = playerCurrentPos.x + pr.curiousTargetOffset.x;
              targetY = playerCurrentPos.y + pr.curiousTargetOffset.y;
              moveSpeed = 75 * (resolvedPetInLoop.curiousSpeed || 1.0);
            }
          }
        }

        // Integra posição física do Pet
        const dxPet = targetX - pr.x;
        const dyPet = targetY - pr.y;
        const distPet = Math.hypot(dxPet, dyPet);
        if (distPet > 1.5) {
          const step = Math.min(distPet, moveSpeed * dt);
          pr.x += (dxPet / distPet) * step;
          pr.y += (dyPet / distPet) * step;
          if (Math.abs(dxPet) > 0.8 && nowMs >= pr.attackLungeUntil) {
            pr.facingLeft = dxPet < 0;
          }
        }

        // Atualiza projéteis disparados pelo Pet à distância
        if (petProjectilesRef.current.length > 0) {
          const remainingProjs: typeof petProjectilesRef.current = [];
          for (const proj of petProjectilesRef.current) {
            const tMarker = mList.find((m) => m.id === proj.targetId);
            if (tMarker) {
              const livePos = getMarkerGlobalPos(tMarker);
              proj.targetX = livePos.x;
              proj.targetY = livePos.y;
            }
            const pdx = proj.targetX - proj.x;
            const pdy = proj.targetY - proj.y;
            const pdist = Math.hypot(pdx, pdy);
            if (pdist <= 18) {
              const dmgRes = globalNpcActionEngine.applyDamage(
                proj.targetId,
                proj.damage,
                { x: pr.x, y: pr.y },
                'pet',
                nowMs
              );
              if (dmgRes.enteredStun && tMarker) {
                pr.emoteText = '💫 50% PV! Tonto 15s!';
                pr.emoteUntil = nowMs + 2500;
                setActionFeedback(
                  `💫 ${tMarker.name} caiu em Tontura por 15s (50% PV)! Clique em Batalhar ou Escanear!`
                );
                setTimeout(() => setActionFeedback(null), 3500);
              } else if (dmgRes.died) {
                if (pr.combatTargetId === proj.targetId) {
                  pr.combatTargetId = null;
                }
                grantPetCombatXp(45);
              }
            } else {
              const pStep = Math.min(pdist, proj.speed * dt);
              proj.x += (pdx / pdist) * pStep;
              proj.y += (pdy / pdist) * pStep;
              remainingProjs.push(proj);
            }
          }
          petProjectilesRef.current = remainingProjs;
          setPetProjectilesState([...remainingProjs]);
        } else if (petProjectilesState.length > 0) {
          setPetProjectilesState([]);
        }

        // Atualiza DOM do Pet diretamente em 60 FPS
        if (petDomRef.current) {
          const isFlying = resolvedPetInLoop.locomotionType === 'flying';
          const floatOffsetY = isFlying
            ? -14 + Math.sin(nowMs * 0.0065) * 6
            : distPet > 2.5
            ? -Math.abs(Math.sin(nowMs * 0.015)) * 6
            : Math.sin(nowMs * 0.004) * 1.5;

          const petScreenX = pr.x * scale;
          const petScreenY = (pr.y + floatOffsetY) * scale;
          petDomRef.current.style.transform = `translate3d(${petScreenX}px, ${petScreenY}px, 0) translate(-50%, -100%)`;
          petDomRef.current.style.zIndex = `${Math.round(pr.y * scale) + (isFlying ? 15 : 1)}`;

          const innerSprite = petDomRef.current.querySelector('[data-pet-sprite]') as HTMLElement | null;
          if (innerSprite) {
            const isSpinning = nowMs < pr.spinUntil;
            const rotDeg = isSpinning ? ((nowMs * 1.4) % 360) : 0;
            const flipScale = pr.facingLeft ? -1 : 1;
            innerSprite.style.transform = `scaleX(${flipScale}) rotate(${rotDeg}deg)`;
          }

          const emoteEl = petDomRef.current.querySelector('[data-pet-emote]') as HTMLElement | null;
          if (emoteEl) {
            if (pr.emoteText && nowMs < pr.emoteUntil) {
              emoteEl.textContent = pr.emoteText;
              emoteEl.style.opacity = '1';
            } else {
              emoteEl.style.opacity = '0';
            }
          }
        }
      }

      // Sincroniza ataques ativos dos Action NPCs para troca imediata de asset visual corporal no React
      const curAttacks = simResult.activeAttacks;
      const prevAttacks = npcActiveAttacksRef.current;
      let attacksChanged = false;

      if (prevAttacks.size !== curAttacks.size) {
        attacksChanged = true;
      } else {
        for (const [mId, curAtk] of curAttacks.entries()) {
          const prevAtk = prevAttacks.get(mId);
          if (!prevAtk || prevAtk.startTime !== curAtk.startTime || prevAtk.type !== curAtk.type) {
            attacksChanged = true;
            break;
          }
        }
      }

      if (attacksChanged) {
        npcActiveAttacksRef.current = curAttacks;
        setNpcActiveAttacks(new Map(curAttacks));
      }

      // Sincronização inteligente dos overlays: só dispara setState se houver conteúdo ativo de combate que REALMENTE mudou
      const hasCombatData =
        simResult.vfx.length > 0 ||
        simResult.projectiles.length > 0 ||
        simResult.speechBalloons.size > 0;
      const hadCombatData = hadCombatDataRef.current;

      // Sincroniza playerIdleEmote apenas quando o tipo de emote mudar
      if (simResult.playerIdleEmote?.type !== playerIdleEmoteRef.current?.type) {
        playerIdleEmoteRef.current = simResult.playerIdleEmote;
        setPlayerIdleEmote(simResult.playerIdleEmote);
      }

      if (hasCombatData || hadCombatData) {
        if (nowMs - lastCombatOverlaySyncRef.current > 60) {
          lastCombatOverlaySyncRef.current = nowMs;
          hadCombatDataRef.current = hasCombatData;
          setCombatVfx(simResult.vfx);
          setCombatProjectiles(simResult.projectiles);
          setActiveSpeechBalloons(simResult.speechBalloons);

          const nextEmotions = new Map<string, { type: import('../types/map').NpcEmotionType; intensity: number }>();
          for (const m of mList) {
            if (m.type === 'npc') {
              const rs = globalNpcActionEngine.getRuntimeState(m.id);
              if (rs && rs.emotion.type !== 'neutral') {
                nextEmotions.set(m.id, { type: rs.emotion.type, intensity: rs.emotion.intensity });
              }
            }
          }
          if (nextEmotions.size > 0 || lastEmotionsSizeRef.current > 0) {
            lastEmotionsSizeRef.current = nextEmotions.size;
            setNpcLiveEmotions(nextEmotions);
          }
        }
      }

      for (const m of mList) {
        if (m.type !== 'npc') continue;

        const isAction = !!m.actionNpc?.enabled;
        const isPatrol = !!m.npcPatrol?.enabled;

        if (!isAction && !isPatrol) {
          if (npcLivePositionsRef.current.has(m.id)) {
            npcLivePositionsRef.current.delete(m.id);
            const el = elMap.get(m.id);
            if (el) {
              let originX = 0;
              if (isExtended && m.subBiomeId) {
                let cx = 0;
                for (const sb of subList) {
                  if (sb.id === m.subBiomeId) break;
                  cx += (sb.tileWidth || 400) + 40;
                }
                originX = cx;
              }
              const posX = (originX + m.x) * scale;
              const posY = m.y * scale;
              el.style.left = `${posX}px`;
              el.style.top = `${posY}px`;
            }
          }
          continue;
        }

        let liveX = m.x;
        let liveY = m.y;
        let dir = 'down';
        let isMoving = false;
        const rs = globalNpcActionEngine.getRuntimeState(m.id);

        if (isAction && simResult.updatedPositions.has(m.id)) {
          const actPos = simResult.updatedPositions.get(m.id)!;
          liveX = actPos.x;
          liveY = actPos.y;
          dir = actPos.dir;
          isMoving = actPos.isMoving;
        } else if (isPatrol) {
          const patrol = m.npcPatrol!;
          const speedPx = Math.max(10, (patrol.speed || 2.5) * 45);
          const pauseSec = Math.max(0, patrol.pauseTime ?? 1.5);
          const preset = patrol.preset || 'horizontal';

          let dx = 0;
          let dy = 0;

          if (preset === 'horizontal') {
            const dist = Math.max(16, patrol.distance || 160);
            const tWalk = dist / speedPx;
            const tOneWay = tWalk + pauseSec;
            const tCycle = tOneWay * 2;
            const t = (nowMs / 1000) % (tCycle || 1);

            if (t < tWalk) {
              const p = t / tWalk;
              dx = p * dist;
              dir = 'right';
              isMoving = true;
            } else if (t < tOneWay) {
              dx = dist;
              dir = 'right';
              isMoving = false;
            } else if (t < tOneWay + tWalk) {
              const p = (t - tOneWay) / tWalk;
              dx = (1 - p) * dist;
              dir = 'left';
              isMoving = true;
            } else {
              dx = 0;
              dir = 'left';
              isMoving = false;
            }
          } else if (preset === 'vertical') {
            const dist = Math.max(16, patrol.distance || 160);
            const tWalk = dist / speedPx;
            const tOneWay = tWalk + pauseSec;
            const tCycle = tOneWay * 2;
            const t = (nowMs / 1000) % (tCycle || 1);

            if (t < tWalk) {
              const p = t / tWalk;
              dy = p * dist;
              dir = 'down';
              isMoving = true;
            } else if (t < tOneWay) {
              dy = dist;
              dir = 'down';
              isMoving = false;
            } else if (t < tOneWay + tWalk) {
              const p = (t - tOneWay) / tWalk;
              dy = (1 - p) * dist;
              dir = 'up';
              isMoving = true;
            } else {
              dy = 0;
              dir = 'up';
              isMoving = false;
            }
          } else if (preset === 'custom') {
            const wps = [{ x: 0, y: 0 }, ...(patrol.waypoints || [])];
            if (wps.length < 2) {
              dx = 0;
              dy = 0;
              dir = 'down';
              isMoving = false;
            } else {
              const seq: { x: number; y: number }[] = [...wps];
              if (patrol.loop !== false) {
                for (let i = wps.length - 2; i > 0; i--) {
                  seq.push(wps[i]);
                }
              }
              const segs: { from: { x: number; y: number }; to: { x: number; y: number }; len: number; tWalk: number }[] = [];
              let totalCycle = 0;
              for (let i = 0; i < seq.length; i++) {
                const from = seq[i];
                const to = seq[(i + 1) % seq.length];
                const len = Math.hypot(to.x - from.x, to.y - from.y);
                const tWalk = len / speedPx;
                segs.push({ from, to, len, tWalk });
                totalCycle += tWalk + pauseSec;
              }

              if (totalCycle > 0) {
                let t = (nowMs / 1000) % totalCycle;
                for (const seg of segs) {
                  if (t < seg.tWalk) {
                    const p = seg.len > 0 ? t / seg.tWalk : 0;
                    dx = seg.from.x + (seg.to.x - seg.from.x) * p;
                    dy = seg.from.y + (seg.to.y - seg.from.y) * p;
                    const deltaX = seg.to.x - seg.from.x;
                    const deltaY = seg.to.y - seg.from.y;
                    dir = Math.abs(deltaX) > Math.abs(deltaY) ? (deltaX > 0 ? 'right' : 'left') : (deltaY > 0 ? 'down' : 'up');
                    isMoving = true;
                    break;
                  }
                  t -= seg.tWalk;
                  if (t < pauseSec) {
                    dx = seg.to.x;
                    dy = seg.to.y;
                    isMoving = false;
                    break;
                  }
                  t -= pauseSec;
                }
              }
            }
          } else if (preset === 'procedural') {
            const radius = Math.max(20, patrol.distance || 100);
            let seed = 0;
            for (let i = 0; i < m.id.length; i++) {
              seed = (seed * 31 + m.id.charCodeAt(i)) >>> 0;
            }
            const pseudoRand = (idx: number) => {
              const val = Math.sin((seed % 10000) * 12.9898 + idx * 78.233) * 43758.5453;
              return val - Math.floor(val);
            };

            const numWaypoints = 5;
            const procWps: { x: number; y: number }[] = [{ x: 0, y: 0 }];
            for (let i = 1; i < numWaypoints; i++) {
              const ang = (i / numWaypoints) * Math.PI * 2 + (pseudoRand(i * 3) - 0.5) * 0.9;
              const r = radius * (0.4 + pseudoRand(i * 3 + 1) * 0.6);
              procWps.push({
                x: Math.round(Math.cos(ang) * r),
                y: Math.round(Math.sin(ang) * r),
              });
            }

            const segs: { from: { x: number; y: number }; to: { x: number; y: number }; len: number; tWalk: number }[] = [];
            let totalCycle = 0;
            for (let i = 0; i < procWps.length; i++) {
              const from = procWps[i];
              const to = procWps[(i + 1) % procWps.length];
              const len = Math.hypot(to.x - from.x, to.y - from.y);
              const tWalk = len / speedPx;
              segs.push({ from, to, len, tWalk });
              totalCycle += tWalk + pauseSec;
            }

            if (totalCycle > 0) {
              let t = (nowMs / 1000) % totalCycle;
              for (const seg of segs) {
                if (t < seg.tWalk) {
                  const p = seg.len > 0 ? t / seg.tWalk : 0;
                  dx = seg.from.x + (seg.to.x - seg.from.x) * p;
                  dy = seg.from.y + (seg.to.y - seg.from.y) * p;
                  const deltaX = seg.to.x - seg.from.x;
                  const deltaY = seg.to.y - seg.from.y;
                  dir = Math.abs(deltaX) > Math.abs(deltaY) ? (deltaX > 0 ? 'right' : 'left') : (deltaY > 0 ? 'down' : 'up');
                  isMoving = true;
                  break;
                }
                t -= seg.tWalk;
                if (t < pauseSec) {
                  dx = seg.to.x;
                  dy = seg.to.y;
                  isMoving = false;
                  break;
                }
                t -= pauseSec;
              }
            }
          }

          liveX = m.x + dx;
          liveY = m.y + dy;
        }

        npcLivePositionsRef.current.set(m.id, { x: liveX, y: liveY, dir, isMoving });

        // Atualiza elemento DOM diretamente em 60fps sem re-renderizar o React
        const el = elMap.get(m.id);
        if (el) {
          // Se o Mobby foi escaneado ou derrotado, fica oculto até cumprir sua regra de Respawn!
          const isMobDespawned = isAction && globalNpcActionEngine.isDespawned(m.id, nowMs);
          if (isMobDespawned) {
            if (el.style.display !== 'none') {
              el.style.display = 'none';
            }
            continue;
          } else if (el.style.display === 'none') {
            el.style.display = '';
          }

          let originX = 0;
          if (isExtended && m.subBiomeId) {
            let cx = 0;
            for (const sb of subList) {
              if (sb.id === m.subBiomeId) break;
              cx += (sb.tileWidth || 400) + 40;
            }
            originX = cx;
          }
          const posX = (originX + liveX) * scale;
          const posY = liveY * scale;
          const markerSize = Math.max(18, Math.round((m.size || 150) * scale));
          const mLayers = projectRef.current.markerLayers || [];
          const mLayer = mLayers.find((l) => l.id === m.layerId) || mLayers[0];
          const lOrder = mLayer ? (mLayer.order ?? 0) : 0;

          el.style.left = `${posX}px`;
          el.style.top = `${posY}px`;
          const hasOpenBalloon =
            inspectedMarkerRef.current?.id === m.id ||
            simResult.speechBalloons.has(m.id) ||
            Boolean(rs?.stunUntil && nowMs < rs.stunUntil);
          el.style.zIndex = hasOpenBalloon
            ? '998500'
            : `${lOrder * 1000 + Math.round(posY + markerSize * 0.35)}`;

          // Animação corporal elaborada: usa o próprio corpo do NPC respeitando formato e tamanho
          const visualEl = el.querySelector('[data-npc-visual]') as HTMLElement | null;
          const jellyEl = (el.querySelector('[data-jelly-container]') || el) as HTMLElement | null;

          const isJellyEnabled =
            m.effect !== 'none' && (
              m.effect === 'jelly' ||
              (m.type === 'npc' && m.npcBounce !== false && (!m.effect || m.effect === 'jelly'))
            );

          const isSlime = isSlimeMarker(m);

          if (jellyEl) {
            if (isSlime) {
              // SLIME: Remove completamente qualquer animação de passo ou marcha bípede/humanoide
              jellyEl.classList.remove(
                'animate-jelly-step', 'animate-jelly-step-moving',
                'animate-jelly-moving', 'animate-jelly-spring-moving',
                'animate-jelly-squash-moving', 'animate-jelly-organic-moving',
                'animate-jelly-pulse-moving'
              );
            } else if (isJellyEnabled && (!isAction || !rs?.activeAttack)) {
              const jStyle = m.jellyStyle || 'classic';
              const idleCls =
                jStyle === 'spring' ? 'animate-jelly-spring' :
                jStyle === 'step_walk' ? 'animate-jelly-step' :
                jStyle === 'squash_intense' ? 'animate-jelly-squash' :
                jStyle === 'organic_jitter' ? 'animate-jelly-organic' :
                jStyle === 'pulse_beat' ? 'animate-jelly-pulse' : 'animate-jelly';

              const movingCls =
                jStyle === 'spring' ? 'animate-jelly-spring-moving' :
                jStyle === 'step_walk' ? 'animate-jelly-step-moving' :
                jStyle === 'squash_intense' ? 'animate-jelly-squash-moving' :
                jStyle === 'organic_jitter' ? 'animate-jelly-organic-moving' :
                jStyle === 'pulse_beat' ? 'animate-jelly-pulse-moving' : 'animate-jelly-moving';

              if (isMoving && m.npcPatrol?.walkStyle !== 'slime_hop') {
                if (jellyEl.classList.contains(idleCls)) {
                  jellyEl.classList.remove(idleCls);
                }
                if (!jellyEl.classList.contains(movingCls)) {
                  jellyEl.classList.add(movingCls);
                }
              } else {
                if (jellyEl.classList.contains(movingCls)) {
                  jellyEl.classList.remove(movingCls);
                }
                if (!jellyEl.classList.contains(idleCls)) {
                  jellyEl.classList.add(idleCls);
                }
              }
            } else {
              jellyEl.classList.remove(
                'animate-jelly', 'animate-jelly-moving',
                'animate-jelly-spring', 'animate-jelly-spring-moving',
                'animate-jelly-step', 'animate-jelly-step-moving',
                'animate-jelly-squash', 'animate-jelly-squash-moving',
                'animate-jelly-organic', 'animate-jelly-organic-moving',
                'animate-jelly-pulse', 'animate-jelly-pulse-moving'
              );
            }
          }

          if (visualEl) {
            visualEl.style.transformOrigin = '50% 100%';
            const baseFlip = m.flipX ? -1 : 1;
            const flipX = (dir === 'left' ? -1 : 1) * baseFlip;
            const baseRot = m.rotation || 0;
            const sY = m.flipY ? -1 : 1;

            if (isAction && rs) {
              const bt = rs.bodyTransform;
              const sX = flipX * bt.scaleX;
              const actualSY = sY * bt.scaleY;
              const tY = -bt.jumpHeight + bt.offsetY;
              const tX = bt.offsetX;
              const rot = bt.rotationDeg + bt.tiltAngle + baseRot;
              visualEl.style.transform = `translate(${tX}px, ${tY}px) scale(${sX}, ${actualSY}) rotate(${rot}deg)`;
            } else if (isSlime && isMoving) {
              const hop = Math.abs(Math.sin(nowMs * 0.012));
              visualEl.style.transform = `scale(${flipX * (1 - hop * 0.20)}, ${sY * (1 + hop * 0.25)}) translateY(${-hop * 14}px) rotate(${baseRot}deg)`;
            } else {
              visualEl.style.transform = `scale(${flipX}, ${sY}) rotate(${baseRot}deg)`;
            }
          }
        }
      }

      animId = requestAnimationFrame(loopPatrol);
    };

    animId = requestAnimationFrame(loopPatrol);
    return () => cancelAnimationFrame(animId);
  }, [scale, isExtended]);

  // Game loop do Joystick + Dash Rápido (roda enquanto pressionado ou em dash; integração só com vetor — sem re-renders)
  useEffect(() => {
    if (!isJoystickActive && !isDashActive) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      const player = playerRef.current || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6', speed: 4 };
      const currentPX = isNaN(player.x) ? 384 : player.x;
      const currentPY = isNaN(player.y) ? 100 : player.y;
      let biomeSpeedMultiplier = 1.0;
      if (isExtended) {
        const subBiomes = projectRef.current.subBiomes || [];
        if (subBiomes.length > 0) {
          biomeSpeedMultiplier = subBiomes[0].walkSpeed ?? 1.0;
        }
      } else {
        const currentBiome = getBiomeAtY(currentPY, spans);
        if (currentBiome) {
          biomeSpeedMultiplier = currentBiome.walkSpeed ?? 1.0;
        }
      }
      let speed = (player.speed || 4) * biomeSpeedMultiplier * 60 * 1.8; // px/sec

      if (teleportingRef.current && performance.now() - lastTeleportAtRef.current > 3000) {
        teleportingRef.current = false;
      }
      const frozenByTeleport = teleportingRef.current;
      const frozenByEvent = performance.now() < eventFreezeUntilRef.current;
      const frozen = frozenByTeleport || frozenByEvent;
      let jvx = frozen ? 0 : joystickVectorRef.current.x;
      let jvy = frozen ? 0 : joystickVectorRef.current.y;

      // Toque-move (dedinho): segue a rota interna por waypoints; chegou → para.
      const tapT = tapTargetRef.current;
      if (tapT && !frozen) {
        const wayQ = tapWayRef.current;
        const dest = wayQ.length > 0 ? wayQ[0] : tapT;
        const p = playerRef.current;
        const px = p && !isNaN(p.x) ? p.x : 384;
        const py = p && !isNaN(p.y) ? p.y : 100;
        const dx = dest.x - px;
        const dy = dest.y - py;
        const d = Math.hypot(dx, dy);
        const arriveAt = wayQ.length > 0 ? 30 : 8;
        const now = performance.now();
        const stuck = stuckRef.current;
        if (d < arriveAt) {
          if (wayQ.length > 0) {
            wayQ.shift();
          } else {
            tapTargetRef.current = null;
            tapWayRef.current = [];
            stuckRef.current = null;
            setIsJoystickActive(false);
          }
          jvx = 0;
          jvy = 0;
        } else {
          if (!stuck || now - stuck.t > 1200) {
            if (stuck && now - stuck.t > 1200 && Math.hypot(px - stuck.x, py - stuck.y) < 6) {
              tapTargetRef.current = null;
              tapWayRef.current = [];
              stuckRef.current = null;
              setIsJoystickActive(false);
              jvx = 0;
              jvy = 0;
            } else {
              stuckRef.current = { x: px, y: py, t: now };
              jvx = dx / d;
              jvy = dy / d;
            }
          } else {
            jvx = dx / d;
            jvy = dy / d;
          }
          if (jvx !== 0 || jvy !== 0) {
            lastMoveDirRef.current = { x: jvx, y: jvy };
          }
          const dir = Math.abs(jvx) > Math.abs(jvy) ? (jvx > 0 ? 'right' : 'left') : (jvy > 0 ? 'down' : 'up');
          if ((jvx !== 0 || jvy !== 0) && dir !== lastDirectionRef.current) {
            lastDirectionRef.current = dir;
            setPlayerDirection(dir as 'up' | 'down' | 'left' | 'right');
          }
        }
      } else if (locomotionRef.current === 'tap' && !tapT && tapWayRef.current.length === 0 && jvx === 0 && jvy === 0 && !activeDashRef.current) {
        setIsJoystickActive(false);
      }

      // Sobrescreve velocidade e direção quando o Dash Rápido está ativo!
      const activeDash = activeDashRef.current;
      if (activeDash && !frozen) {
        if (time < activeDash.endTime) {
          jvx = activeDash.dirX;
          jvy = activeDash.dirY;
          speed = activeDash.speedPxPerSec;
        } else {
          activeDashRef.current = null;
          setIsDashActive(false);
        }
      }

      // Sem vetor ou com spawn cinemático ativo não há integração
      if (isSpawnActive) {
        animId = requestAnimationFrame(loop);
        return;
      }

      if (jvx !== 0 || jvy !== 0) {

      // Tenta calcular nova posição pretendida
      const clampX = (v: number) => Math.max(16, Math.min(totalMapWidth - 16, v));
      const clampY = (v: number) => Math.max(16, Math.min(totalMapHeight - 16, v));
      let nextX = clampX(currentPX + jvx * speed * dt);
      let nextY = clampY(currentPY + jvy * speed * dt);

      if (isNaN(nextX)) nextX = 384;
      if (isNaN(nextY)) nextY = 100;

      // Bloqueio de colisão numa posição em O(1) via Set (vertical global ou local da fase)
      const CELL_SIZE = COLLISION_CELL;
      const colSets = collisionSetsRef.current;
      const walkableBlockedAt = (x: number, y: number): boolean => {
        if (isExtended) {
          const sbList = projectRef.current.subBiomes || [];
          let sbOriginX = 0;
          for (const sb of sbList) {
            const w = sb.tileWidth || 400;
            if (x >= sbOriginX && x < sbOriginX + w) {
              const key = `${Math.floor((x - sbOriginX) / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
              const sbSet = colSets.subBiomes.get(sb.id);
              if (sbSet?.blocked.has(key)) return true;
              if (!(sb.restrictPlayerToPaintedAreas && sbSet && sbSet.walkable.size > 0)) return false;
              return !sbSet.walkable.has(key);
            }
            sbOriginX += w + 40;
          }
          return false;
        }
        const key = `${Math.floor(x / CELL_SIZE)},${Math.floor(y / CELL_SIZE)}`;
        if (colSets.blocked.has(key)) return true;
        if (!(projectRef.current.restrictPlayerToPaintedAreas && colSets.walkable.size > 0)) return false;
        return !colSets.walkable.has(key);
      };

      // Colisão SÓLIDA com NPCs, recortes Motion Pen e Marcadores trocados por Assets de cenário (coletáveis/eventos/baús NUNCA bloqueiam o passo)
      const obstacleSolids: { x: number; y: number; r: number }[] = [];
      for (const m of gameplayMarkersRef.current) {
        if (m.markerOff) continue; // Marcador OFF: ZERO colisão! Herói e NPCs passam livremente por cima
        if (m.type === 'npc' && m.actionNpc?.enabled && globalNpcActionEngine.isDespawned(m.id, time)) {
          continue; // Mobby escaneado/derrotado aguardando respawn não bloqueia o passo
        }
        const isPassableInteractive =
          m.type === 'collectible' ||
          m.type === 'treasure' ||
          m.type === 'deliverable' ||
          m.type === 'event' ||
          m.type === 'area' ||
          m.type === 'travel' ||
          m.type === 'light' ||
          m.type === 'interactive_screen';
        const isSolid =
          !isPassableInteractive &&
          m.solidCollision !== false &&
          (m.type === 'npc' || m.motionAsset || !!m.customIconPng);
        if (!isSolid) continue;

        // Base dos pés: a colisão fica onde o objeto toca o chão (não no topo aéreo/transparente da PNG)
        const size = m.size || 44;
        const radiusScale = m.collisionRadiusScale ?? (m.type === 'npc' ? 0.16 : 0.24);
        const rad = Math.max(6, size * radiusScale);
        const live = npcLivePositionsRef.current.get(m.id);
        const mx = live ? live.x : m.x;
        // Ponto de contato no chão: ~30% abaixo do centro para encostar nos pés do asset
        const my = (live ? live.y : m.y) + size * 0.30 + (m.collisionBaseOffsetY || 0);

        if (isExtended) {
          if (!m.subBiomeId) continue;
          let cx = 0;
          let found = false;
          for (const sb of projectRef.current.subBiomes || []) {
            if (sb.id === m.subBiomeId) {
              found = true;
              break;
            }
            cx += (sb.tileWidth || 400) + 40;
          }
          if (!found) continue;
          obstacleSolids.push({ x: cx + mx, y: my, r: rad });
        } else {
          if (m.subBiomeId) continue;
          obstacleSolids.push({ x: mx, y: my, r: rad });
        }
      }
      const PLAYER_R = 18;
      const FEET_R = 7; // Raio físico dos pés para contato com a grade e cantos suaves

      const obstacleBlockedAt = (x: number, y: number, r: number = PLAYER_R): boolean =>
        obstacleSolids.some((s) => Math.hypot(x - s.x, y - s.y) < s.r + r);

      const isPointBlocked = (x: number, y: number): boolean =>
        walkableBlockedAt(x, y) || obstacleBlockedAt(x, y, 0);

      // Testa a base circular dos pés do personagem contra as células da grade
      const isBodyBlocked = (cx: number, cy: number, r: number = FEET_R): boolean => {
        if (isPointBlocked(cx, cy)) return true;
        if (obstacleBlockedAt(cx, cy, r)) return true;
        if (r <= 0) return false;
        // 4 pontos cardeais
        if (walkableBlockedAt(cx - r, cy)) return true;
        if (walkableBlockedAt(cx + r, cy)) return true;
        if (walkableBlockedAt(cx, cy - r)) return true;
        if (walkableBlockedAt(cx, cy + r)) return true;
        // 4 pontos diagonais
        const d = r * 0.7071;
        if (walkableBlockedAt(cx - d, cy - d)) return true;
        if (walkableBlockedAt(cx + d, cy - d)) return true;
        if (walkableBlockedAt(cx - d, cy + d)) return true;
        if (walkableBlockedAt(cx + d, cy + d)) return true;
        return false;
      };

      // FÍSICA SUAVE COM CORNER SLIP (ASSISTÊNCIA DE QUINA E DESLIZE CONTÍNUO):
      // Quando o herói bate no degrau de um quadradinho de 8px, ele arredonda e escorrega suavemente
      const rawDist = speed * dt;
      const moveX = jvx * rawDist;
      const moveY = jvy * rawDist;

      // Válvula de escape inteligente: se já estiver preso dentro de uma parede, empurra em direção ao livre
      if (isBodyBlocked(currentPX, currentPY)) {
        let escaped = false;
        for (let d = 2; d <= 16; d += 2) {
          const angles = [0, Math.PI, Math.PI / 2, -Math.PI / 2, Math.PI / 4, -Math.PI / 4, (3 * Math.PI) / 4, -(3 * Math.PI) / 4];
          for (const ang of angles) {
            const ex = clampX(currentPX + Math.cos(ang) * d);
            const ey = clampY(currentPY + Math.sin(ang) * d);
            if (!isBodyBlocked(ex, ey)) {
              nextX = ex;
              nextY = ey;
              escaped = true;
              break;
            }
          }
          if (escaped) break;
        }
        if (!escaped) {
          nextX = currentPX;
          nextY = currentPY;
        }
      } else {
        // 1. Tenta movimento diagonal livre completo
        const tryFullX = clampX(currentPX + moveX);
        const tryFullY = clampY(currentPY + moveY);

        if (!isBodyBlocked(tryFullX, tryFullY)) {
          nextX = tryFullX;
          nextY = tryFullY;
        } else {
          // Bloqueou na diagonal completa: resolve eixo por eixo com Corner Slip
          const MAX_NUDGE = 8; // Alcance do arredondamento (uma célula inteira de 8px)
          let resolvedX = currentPX;
          let resolvedY = currentPY;

          // A. Resolução do Eixo X com deslizamento em Y
          if (moveX !== 0) {
            const tryX = clampX(currentPX + moveX);
            if (!isBodyBlocked(tryX, currentPY)) {
              resolvedX = tryX;
            } else {
              // Bateu num ressalto no eixo X: testa se desviando em Y consegue arredondar a quina
              const prefDirY = moveY !== 0 ? Math.sign(moveY) : 0;
              const testDirsY = prefDirY !== 0 ? [prefDirY, -prefDirY] : [1, -1];
              let slipped = false;
              for (let n = 1; n <= MAX_NUDGE; n++) {
                for (const dy of testDirsY) {
                  const testY = clampY(currentPY + dy * n);
                  if (!isBodyBlocked(tryX, testY) && !isBodyBlocked(currentPX, testY)) {
                    resolvedX = tryX;
                    const nudgeAmount = Math.min(Math.abs(moveX), 2.5) * dy;
                    resolvedY = clampY(currentPY + nudgeAmount);
                    slipped = true;
                    break;
                  }
                }
                if (slipped) break;
              }
              if (!slipped) resolvedX = currentPX;
            }
          }

          // B. Resolução do Eixo Y com deslizamento em X
          if (moveY !== 0) {
            const tryY = clampY(resolvedY + moveY);
            if (!isBodyBlocked(resolvedX, tryY)) {
              resolvedY = tryY;
            } else {
              // Bateu num ressalto no eixo Y: testa se desviando em X consegue arredondar a quina
              const prefDirX = moveX !== 0 ? Math.sign(moveX) : 0;
              const testDirsX = prefDirX !== 0 ? [prefDirX, -prefDirX] : [1, -1];
              let slipped = false;
              for (let n = 1; n <= MAX_NUDGE; n++) {
                for (const dx of testDirsX) {
                  const testX = clampX(resolvedX + dx * n);
                  if (!isBodyBlocked(testX, tryY) && !isBodyBlocked(resolvedX, tryY)) {
                    resolvedY = tryY;
                    const nudgeAmount = Math.min(Math.abs(moveY), 2.5) * dx;
                    resolvedX = clampX(resolvedX + nudgeAmount);
                    slipped = true;
                    break;
                  }
                }
                if (slipped) break;
              }
              if (!slipped) {
                // Mantém resolvedY
              }
            }
          }

          // C. Preservação de Velocidade Tangencial (desliza rápido ao longo de paredes)
          if (resolvedX === currentPX && moveY !== 0 && moveX !== 0) {
            const boostedY = clampY(resolvedY + Math.sign(moveY) * rawDist);
            if (!isBodyBlocked(resolvedX, boostedY)) {
              resolvedY = boostedY;
            }
          } else if (resolvedY === currentPY && moveX !== 0 && moveY !== 0) {
            const boostedX = clampX(resolvedX + Math.sign(moveX) * rawDist);
            if (!isBodyBlocked(boostedX, resolvedY)) {
              resolvedX = boostedX;
            }
          }

          nextX = resolvedX;
          nextY = resolvedY;
        }
      }

      // Zoom de câmera do bioma/fase atual (só atua ao trocar de bioma)
      applyCameraZoomFor(nextX, nextY);
      syncBiomeBgmFor(nextX, nextY);

      // Quests de DESCOBRIR: herói entrou na região alvo? Conclui na hora.
      gameplayMarkersRef.current.forEach((npc) => {
        if (npc.type !== 'npc' || !npc.quest || npc.quest.kind !== 'discover') return;
        const prog = getProg(npc.id);
        if (!prog.accepted || prog.done || !npc.quest.targetBiomeId) return;
        const tid = npc.quest.targetBiomeId;
        let inside = false;
        if (isExtended) {
          const list = projectRef.current.subBiomes || [];
          let cx = 0;
          for (const sb of list) {
            const w = sb.tileWidth || 400;
            if (sb.id === tid && nextX >= cx && nextX < cx + w) {
              inside = true;
              break;
            }
            cx += w + 40;
          }
        } else {
          const sp = getBiomeSegmentSpans(projectRef.current.biomes).find((s) => s.biome.id === tid);
          if (sp && nextY >= sp.startY && nextY < sp.endY) inside = true;
        }
        if (inside) {
          questProgRef.current[npc.id] = { ...prog, done: true };
          setActionFeedback(`🧭 Região descoberta! Missão de ${npc.name} cumprida! ⭐`);
          setTimeout(() => setActionFeedback(null), 3500);
          bumpQuests();
        }
      });

      // Verificação de Proximidade com Marcadores (só os da fase visível)
      // No Extended, x/y do marcador são locais: soma a origem do sub-bioma na fileira.
      const loopSbList = isExtended ? projectRef.current.subBiomes || [] : [];
      const loopOriginX = (id: string): number | null => {
        let cx = 0;
        for (const sb of loopSbList) {
          if (sb.id === id) return cx;
          cx += (sb.tileWidth || 400) + 40;
        }
        return null;
      };
      let isInsideAnyBlendBgmArea = false;

      gameplayMarkersRef.current.forEach((marker) => {
        if (collectedMarkerIdsRef.current.has(marker.id)) return;
        const live = npcLivePositionsRef.current.get(marker.id);
        let mx = live ? live.x : marker.x;
        const my = live ? live.y : marker.y;
        if (isExtended) {
          if (!marker.subBiomeId) return;
          const ox = loopOriginX(marker.subBiomeId);
          if (ox === null) return;
          mx = ox + mx;
        } else if (marker.subBiomeId) {
          return;
        }
        const dx = nextX - mx;
        const dy = nextY - my;
        const distCenter = Math.hypot(dx, dy);
        const feetY = my + (marker.size || 44) * 0.28 + (marker.collisionBaseOffsetY || 0);
        const distFeet = Math.hypot(dx, nextY - feetY);
        const dist = Math.min(distCenter, distFeet);

        if (!isNaN(dist)) {
          // --- 1. PROCESSAMENTO DE ÁUDIO ESPACIAL / SOM POR ÁREA ---
          const audioEvent = marker.events?.find((e) => e.type === 'sound_area');
          const effectiveAudioUrl = marker.audioUrl || audioEvent?.audioUrl;

          if (effectiveAudioUrl) {
            const effectiveAudioRadius = marker.audioRadius || audioEvent?.audioRadius || marker.areaRadius || 180;
            const effectiveAudioVolume = marker.audioVolume ?? audioEvent?.audioVolume ?? 0.8;
            const effectiveBlendMode = marker.audioBlendMode || audioEvent?.audioBlendMode || 'loop';
            const effectivePlaybackMode = marker.audioPlaybackMode || audioEvent?.audioPlaybackMode || 'restart';
            const shape = marker.audioShape || audioEvent?.audioShape || marker.areaShape || 'circle';

            let insideAudioArea = false;
            let distanceRatio = 0;

            if (shape === 'rect') {
              const halfW = (marker.areaWidth || effectiveAudioRadius * 2) / 2;
              const halfH = (marker.areaHeight || effectiveAudioRadius * 1.5) / 2;
              insideAudioArea = Math.abs(dx) <= halfW && Math.abs(dy) <= halfH;
              if (insideAudioArea) {
                distanceRatio = Math.max(Math.abs(dx) / halfW, Math.abs(dy) / halfH);
              }
            } else {
              insideAudioArea = distCenter <= effectiveAudioRadius;
              if (insideAudioArea) {
                distanceRatio = effectiveAudioRadius > 0 ? distCenter / effectiveAudioRadius : 0;
              }
            }

            if (insideAudioArea) {
              if (effectiveBlendMode === 'blend_bgm') {
                isInsideAnyBlendBgmArea = true;
              }
              if ((effectiveBlendMode as any) === 'one_shot') {
                if (!soundOncePlayedMarkerIdsRef.current.has(marker.id)) {
                  soundOncePlayedMarkerIdsRef.current.add(marker.id);
                  const oneShotAudio = new Audio(effectiveAudioUrl);
                  oneShotAudio.volume = isBgmMuted ? 0 : Math.max(0.05, Math.min(1, effectiveAudioVolume));
                  oneShotAudio.play().catch((err) => console.warn('Erro ao reproduzir som one_shot:', err));
                }
              } else {
                // Áudio contínuo em loop com atenuação espacial 3D
                let spatialAudio = spatialAudiosRef.current.get(marker.id);
                if (!spatialAudio) {
                  spatialAudio = new Audio(effectiveAudioUrl);
                  spatialAudio.loop = true;
                  spatialAudiosRef.current.set(marker.id, spatialAudio);
                }
                const factor = Math.max(0.05, 1 - distanceRatio * 0.85);
                const computedVol = isBgmMuted ? 0 : Math.max(0.01, Math.min(1, effectiveAudioVolume * factor));
                spatialAudio.volume = computedVol;
                if (spatialAudio.paused) {
                  spatialAudio.play().catch((err) => console.warn('Erro ao reproduzir áudio espacial:', err));
                }
              }
            } else {
              // Fora da área de som
              const existing = spatialAudiosRef.current.get(marker.id);
              if (existing) {
                if (effectivePlaybackMode === 'continuous') {
                  // MODO CONTÍNUO: mantém a faixa tocando em background da fase com volume zero
                  existing.volume = 0;
                } else {
                  // MODO DO ZERO: pausa e reinicia o tempo para 0:00 a cada reencontro
                  existing.pause();
                  existing.currentTime = 0;
                  spatialAudiosRef.current.delete(marker.id);
                }
              }
              if (distCenter > effectiveAudioRadius + 30) {
                soundOncePlayedMarkerIdsRef.current.delete(marker.id);
              }
            }
          }

          // Se o marcador for puramente uma área de som ou área sem popups/diálogos, não precisa de gatilho de popup
          const isPureSoundArea =
            (marker.type === 'area' || marker.type === 'event') &&
            effectiveAudioUrl &&
            !marker.dialogueEnabled &&
            (!marker.events || !marker.events.some((e) => e.type !== 'sound_area'));

          if (isPureSoundArea) {
            return;
          }

          // --- 2. GATILHOS DE CONTATO / PROXIMIDADE (NPC, Diálogos, Eventos, Viagem, Itens, Baús) ---
          const isStationMarker = marker.type === 'interactive_screen';
          const stationRadius = isStationMarker ? (marker.stationConfig?.triggerRadius ?? Math.max(18, ((marker.size || 150) * (marker.stationConfig?.baseAssetScale || 1.0)) / 2)) : 0;
          const markerRadius = isStationMarker ? stationRadius : Math.max(22, (marker.size || 64) / 2);
          const triggerThreshold =
            marker.type === 'npc' || marker.type === 'boss' || marker.dialogueEnabled
              ? Math.max(58, markerRadius + 30)
              : marker.type === 'collectible' || marker.type === 'treasure'
              ? Math.max(46, markerRadius + 22)
              : markerRadius + 22;

          const isNeutralAsset =
            (marker.type === 'neutral' ||
              marker.type === 'light' ||
              marker.motionAsset ||
              ((marker.customIconPng || marker.type === 'camp') &&
                marker.type !== 'npc' &&
                marker.type !== 'boss' &&
                marker.type !== 'travel' &&
                marker.type !== 'event' &&
                marker.type !== 'area' &&
                marker.type !== 'collectible' &&
                marker.type !== 'treasure' &&
                marker.type !== 'deliverable' &&
                marker.type !== 'interactive_screen' &&
                !marker.dialogueEnabled &&
                !marker.quest &&
                !marker.linkedQuestId)) &&
            (!marker.events || marker.events.length === 0);
          if (isNeutralAsset) return;

          if (dist <= triggerThreshold) {
            if (!contactedMarkerIdsRef.current.has(marker.id)) {
              contactedMarkerIdsRef.current.add(marker.id);
              if (marker.type === 'interactive_screen') {
                const trigger = marker.stationConfig?.activationTrigger || 'both';
                if (trigger === 'proximity' || trigger === 'both') {
                  handleInteractWithStation(marker);
                }
              } else if (marker.type === 'travel' && marker.travelAuto !== false) {
                autoTravel(marker);
              } else if (marker.type === 'event' || marker.type === 'area') {
                triggerEvent(marker);
              } else if (marker.type === 'collectible') {
                // Item Interativo - Coleta automática e instantânea ao se aproximar no mapa!
                handleCollectItem(marker);
              } else if (marker.type === 'treasure') {
                handleOpenTreasureChest(marker);
              } else if (marker.type === 'npc' || marker.type === 'boss') {
                openNpcPopup(marker);
              } else {
                openMarkerPopup(marker);
              }
            }
          } else if (dist > triggerThreshold + 35) {
            // Se o jogador se afastar do marcador, permite re-disparar se voltar no futuro
            contactedMarkerIdsRef.current.delete(marker.id);
            // Saiu do raio do clima: volta ao evento do bioma
            if (weatherOverrideRef.current?.markerId === marker.id) {
              setWeatherOverride(null);
            }
          }
        }
      });

      const targetDuckFactor = isInsideAnyBlendBgmArea ? 0.25 : 1.0;
      if (bgmDuckingFactorRef.current !== targetDuckFactor) {
        bgmDuckingFactorRef.current = targetDuckFactor;
        syncBiomeBgmFor(nextX, nextY);
      }

      // Pop-up aberto? Afastou além da margem → fecha sozinho
      const insp = inspectedMarkerRef.current;
      if (insp) {
        const live = npcLivePositionsRef.current.get(insp.id);
        let ix = live ? live.x : insp.x;
        let iy = live ? live.y : insp.y;
        let visibleHere = true;
        if (isExtended) {
          if (!insp.subBiomeId) {
            visibleHere = false;
          } else {
            const ox = loopOriginX(insp.subBiomeId);
            if (ox === null) visibleHere = false;
            else ix = ox + ix;
          }
        } else if (insp.subBiomeId) {
          visibleHere = false;
        }
        if (!visibleHere) {
          inspectedMarkerRef.current = null;
          setInspectedMarker(null);
          onSelectMarkerRef.current?.(null);
        } else {
          const ith = Math.max(18, (insp.size || 44) / 2) + 16 + 80;
          if (Math.hypot(nextX - ix, nextY - iy) > ith) {
            inspectedMarkerRef.current = null;
            setInspectedMarker(null);
            onSelectMarkerRef.current?.(null);
          }
        }
      }

      nextX = Math.max(16, Math.min(totalMapWidth - 16, nextX));
      nextY = Math.max(16, Math.min(totalMapHeight - 16, nextY));

      // Sincroniza a ref local do jogador a cada frame para acumular movimento 60fps ultra suave sem engasgos
      if (playerRef.current) {
        playerRef.current.x = nextX;
        playerRef.current.y = nextY;
      }

      // Sincronização visual em tempo real no canvas central diretamente via DOM (60 FPS ultra suave, sem travar o React)
      const editorPlayerEl = document.getElementById('editor-player-marker');
      if (editorPlayerEl) {
        const editorZoom = (window as any).__editorCanvasZoom || 1;
        editorPlayerEl.style.transform = `translate3d(${nextX * editorZoom}px, ${nextY * editorZoom}px, 0) translate(-50%, -100%)`;
        const newZ = Math.round(nextY * editorZoom);
        if (newZ !== lastEditorPlayerZRef.current) {
          lastEditorPlayerZRef.current = newZ;
          editorPlayerEl.style.zIndex = `${newZ}`;
        }
      }

      // Atualiza DOM do jogador diretamente via GPU Transform (posição e Y-sorting de profundidade)
      if (playerDomRef.current) {
        playerDomRef.current.style.transform = `translate3d(${nextX * scale}px, ${nextY * scale}px, 0) translate(-50%, -100%)`;
        const newZ = Math.round(nextY * scale);
        if (newZ !== lastPlayerZIndexRef.current) {
          lastPlayerZIndexRef.current = newZ;
          playerDomRef.current.style.zIndex = `${newZ}`;
        }
      }

      // Reação física elástica nos tufos de grama ao cruzar com os pés do herói (parting & trampling)
      // Culling espacial em O(1): consulta apenas os baldes verticais imediatos aos pés do herói (0 checks se distante)
      const grassPushRadius = 54;
      const playerBucket = Math.floor(nextY / 120);
      const buckets = grassSpatialBucketsRef.current;
      const nearbyBuckets = [
        buckets.get(playerBucket - 1),
        buckets.get(playerBucket),
        buckets.get(playerBucket + 1),
      ];

      const trampledSet = activeTrampledGrassIdsRef.current;
      const currentNearbyTrampled = new Set<string>();

      for (let b = 0; b < 3; b++) {
        const bucketList = nearbyBuckets[b];
        if (!bucketList || bucketList.length === 0) continue;

        for (let i = 0; i < bucketList.length; i++) {
          const m = bucketList[i];
          if (!m.id.startsWith('terrain-grass-') && m.effect !== 'wind') continue;
          if (Math.abs(m.y - nextY) > grassPushRadius) continue;

          const gx = isExtended && m.subBiomeId ? (loopOriginX(m.subBiomeId) ?? 0) + m.x : m.x;
          const dx = gx - nextX;
          if (Math.abs(dx) > grassPushRadius) continue;

          const dy = m.y - nextY;
          const dist = Math.hypot(dx, dy);
          if (dist < grassPushRadius) {
            const el = grassElementsMapRef.current.get(m.id);
            if (!el) continue;
            trampledSet.add(m.id);
            currentNearbyTrampled.add(m.id);
            const pushNorm = 1.0 - dist / grassPushRadius;
            const pushAngle = Math.atan2(dy, dx);
            const tiltDeg = (Math.cos(pushAngle) * 36 * pushNorm).toFixed(1);
            const squashY = (1.0 - 0.42 * pushNorm).toFixed(2);
            const squashX = (1.0 + 0.28 * pushNorm).toFixed(2);
            el.style.setProperty('--player-tilt', `${tiltDeg}deg`);
            el.style.setProperty('--player-squash-y', `${squashY}`);
            el.style.setProperty('--player-squash-x', `${squashX}`);
            el.setAttribute('data-trampled', 'true');
          }
        }
      }

      // Limpa os tufos que foram pisados no frame anterior e o herói já se afastou
      if (trampledSet.size > currentNearbyTrampled.size) {
        for (const tid of Array.from(trampledSet)) {
          if (!currentNearbyTrampled.has(tid)) {
            trampledSet.delete(tid);
            const el = grassElementsMapRef.current.get(tid);
            if (el) el.removeAttribute('data-trampled');
          }
        }
      }

      // Escala do herói pelo bioma/fase atual (só toca no DOM se mudou)
      const targetAvatarSize = 48 * scale * biomeScaleAt(nextX, nextY);
      if (Math.abs(targetAvatarSize - lastAvatarSizeRef.current) > 0.5) {
        lastAvatarSizeRef.current = targetAvatarSize;
        const avatarEl = playerDomRef.current?.querySelector('[data-avatar]') as HTMLElement | null;
        if (avatarEl) {
          avatarEl.style.width = `${targetAvatarSize}px`;
          avatarEl.style.height = `${targetAvatarSize}px`;
        }
      }

      // Luz AFETANDO os sprites: brilho por distância da lanterna (+ highlight quente de perto).
      // Dia: limpa os filtros uma única vez.
      if (nightEventRef.current === 'night') {
        nightAppliedRef.current = true;
        const byId = new Map<string, MapMarker>();
        for (const m of markersRef.current || []) {
          if (!m.id.startsWith('terrain-')) byId.set(m.id, m);
        }
        const helperSbList = projectRef.current.subBiomes || [];
        const getHelperOriginX = (id: string): number | null => {
          let cx = 0;
          for (const sb of helperSbList) {
            if (sb.id === id) return cx;
            cx += (sb.tileWidth || 400) + 40;
          }
          return null;
        };
        const R = 300;
        for (const el of markerElsRef.current) {
          const mid = el.dataset.mid;
          if (!mid) continue;
          const m = byId.get(mid);
          if (!m) continue;
          let mx = m.x;
          const my = m.y;
          if (isExtended) {
            if (!m.subBiomeId) continue;
            const ox = getHelperOriginX(m.subBiomeId);
            if (ox === null) continue;
            mx = ox + m.x;
          } else if (m.subBiomeId) {
            continue;
          }
          const d = Math.hypot(nextX - mx, nextY - my);
          const t = Math.max(0, Math.min(1, 1 - d / R));
          const b = 0.3 + 0.7 * t * t;
          const last = lastLightRef.current.get(mid);
          if (last === undefined || Math.abs(last - b) > 0.03) {
            lastLightRef.current.set(mid, b);
            el.style.filter =
              t > 0.75
                ? `brightness(${b.toFixed(2)}) drop-shadow(0 0 8px rgba(253,224,71,0.65))`
                : `brightness(${b.toFixed(2)})`;
          }
        }
      } else if (nightAppliedRef.current) {
        nightAppliedRef.current = false;
        for (const el of markerElsRef.current) {
          el.style.filter = '';
        }
        lastLightRef.current.clear();
      }



      // Mover Câmera / Scroll para acompanhar o jogador (com clamping estrito nas bordas do mapa)
      // O chão para de mover e a câmera para de seguir nas bordas, permitindo que o herói encoste nos cantos sem revelar fundo preto.
      if (containerRef.current) {
        const clientW = containerSizeRef.current.w;
        const clientH = containerSizeRef.current.h;
        const maxScrollTop = Math.max(0, scaledMapHeight - clientH);
        const maxScrollLeft = Math.max(0, scaledMapWidth - clientW);

        const targetScrollTop = nextY * scale - clientH / 2;
        const targetScrollLeft = nextX * scale - clientW / 2;

        const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, targetScrollTop));
        const clampedScrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollLeft));

        if (!isNaN(clampedScrollTop) && isFinite(clampedScrollTop)) {
          containerRef.current.scrollTop = clampedScrollTop;
        }
        if (!isNaN(clampedScrollLeft) && isFinite(clampedScrollLeft)) {
          containerRef.current.scrollLeft = clampedScrollLeft;
        }
        const currentBand =
          Math.floor((isNaN(clampedScrollTop) ? 0 : clampedScrollTop) / 250) * 10000 +
          Math.floor((isNaN(clampedScrollLeft) ? 0 : clampedScrollLeft) / 250);
        if (currentBand !== lastScrollBandRef.current) {
          lastScrollBandRef.current = currentBand;
          setVisibleScrollBand(currentBand);
        }
      }

      // Origem do zoom no herói apenas se zoom ativo (evita invalidar layout da árvore DOM quando zoom === 1)
      if (camZoomValRef.current !== 1) {
        if (contentRef.current) {
          contentRef.current.style.transformOrigin = `${nextX * scale}px ${nextY * scale}px`;
        }
        camOriginRef.current = { x: nextX * scale, y: nextY * scale };
        for (const layer of [rainLayerRef.current, dawnLayerRef.current, cloudsLayerRef.current]) {
          if (layer) layer.style.transformOrigin = `${nextX * scale}px ${nextY * scale}px`;
        }
      }
      } // fim do bloco de integração (vetor zerado = só agenda o próximo frame)

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      if (onUpdatePlayerRef.current && playerRef.current) {
        onUpdatePlayerRef.current({ x: playerRef.current.x, y: playerRef.current.y });
      }
    };
  }, [isJoystickActive, isDashActive, scale, totalMapWidth, totalMapHeight]);

  // Alinha a câmera perfeitamente sobre o Jogador ao carregar o aplicativo, recarregar a página ou trocar de fase
  useEffect(() => {
    const alignCamera = () => {
      if (containerRef.current) {
        const clientW = containerRef.current.clientWidth || screenWidth;
        const clientH = containerRef.current.clientHeight || screenHeight;
        const maxScrollTop = Math.max(0, scaledMapHeight - clientH);
        const maxScrollLeft = Math.max(0, scaledMapWidth - clientW);

        const pY = playerRef.current?.y ?? project.player?.y ?? 100;
        const pX = playerRef.current?.x ?? project.player?.x ?? 384;

        const targetScroll = pY * scale - clientH / 2;
        const clampedScrollTop = Math.max(0, Math.min(maxScrollTop, targetScroll));
        if (!isNaN(clampedScrollTop) && isFinite(clampedScrollTop)) {
          containerRef.current.scrollTop = clampedScrollTop;
        }

        const targetScrollX = pX * scale - clientW / 2;
        const clampedScrollLeft = Math.max(0, Math.min(maxScrollLeft, targetScrollX));
        if (!isNaN(clampedScrollLeft) && isFinite(clampedScrollLeft)) {
          containerRef.current.scrollLeft = clampedScrollLeft;
        }
      }
    };

    alignCamera();
    const rafId = requestAnimationFrame(() => {
      alignCamera();
      setTimeout(alignCamera, 60);
    });

    return () => cancelAnimationFrame(rafId);
  }, [project.id, scale, project.player?.y, project.player?.x, isExtended, isLandscape, screenWidth, screenHeight]);

  // Sincroniza rolagem da tela do celular quando o Radar navega ou scrollTargetY muda
  useEffect(() => {
    if (scrollTargetY !== null && scrollTargetY !== undefined && !isNaN(scrollTargetY) && containerRef.current) {
      containerRef.current.scrollTo({
        top: scrollTargetY * scale - containerRef.current.clientHeight / 2,
        behavior: 'smooth',
      });
    }
  }, [scrollTargetY, scale]);

  const handleScroll = () => {
    if (containerRef.current) {
      const maxScroll = Math.max(0, scaledMapHeight - containerRef.current.clientHeight);
      if (containerRef.current.scrollTop > maxScroll) {
        containerRef.current.scrollTop = maxScroll;
      }
      const currentBand =
        Math.floor(containerRef.current.scrollTop / 250) * 10000 +
        Math.floor(containerRef.current.scrollLeft / 250);
      if (currentBand !== lastScrollBandRef.current) {
        lastScrollBandRef.current = currentBand;
        setVisibleScrollBand(currentBand);
      }
    }
  };

  const renderIcon = (type: MarkerType) => {
    switch (type) {
      case 'port':
        return <Anchor className="w-3.5 h-3.5 text-white" />;
      case 'town':
        return <Landmark className="w-3.5 h-3.5 text-white" />;
      case 'castle':
        return <Castle className="w-3.5 h-3.5 text-white" />;
      case 'boss':
        return <Skull className="w-3.5 h-3.5 text-white" />;
      case 'treasure':
        return <Gem className="w-3.5 h-3.5 text-white" />;
      case 'shrine':
        return <Sparkles className="w-3.5 h-3.5 text-white" />;
      case 'oasis':
        return <Compass className="w-3.5 h-3.5 text-white" />;
      case 'cave':
      case 'tower':
        return <Mountain className="w-3.5 h-3.5 text-white" />;
      case 'event':
        return <Zap className="w-3.5 h-3.5 text-white" />;
      case 'npc':
        return <User className="w-3.5 h-3.5 text-white" />;
      default:
        return <Tent className="w-3.5 h-3.5 text-white" />;
    }
  };

  const markerLookup = new Map<string, MapMarker>(project.markers.map((m) => [m.id, m]));
  nightEventRef.current = getActiveBiomeEvent();

  // Origem X de um sub-bioma na fileira (render scope, p/ roteamento)
  const originXOfList = (list: import('../types/map').SubBiomeConfig[], id: string): number | null => {
    let cx = 0;
    for (const sb of list) {
      if (sb.id === id) return cx;
      cx += (sb.tileWidth || 400) + 40;
    }
    return null;
  };

  // Cache de Sets de colisão para pesquisa O(1) instantânea (evita .includes() linear em grades de mapas de 10000px)
  const collisionSets = useMemo(() => {
    const map = new Map<string, { blocked: Set<string>; walkable: Set<string>; restrict: boolean }>();
    (project.subBiomes || []).forEach((sb) => {
      map.set(sb.id, {
        blocked: new Set(sb.blockedCells || []),
        walkable: new Set(sb.walkableCells || []),
        restrict: Boolean(sb.restrictPlayerToPaintedAreas && (sb.walkableCells || []).length > 0),
      });
    });
    return {
      subBiomes: map,
      globalBlocked: new Set(project.blockedCells || []),
      globalWalkable: new Set(project.walkableCells || []),
      globalRestrict: Boolean(project.restrictPlayerToPaintedAreas && (project.walkableCells || []).length > 0),
    };
  }, [project.subBiomes, project.blockedCells, project.walkableCells, project.restrictPlayerToPaintedAreas]);

  // Célula bloqueada no espaço GLOBAL da vista atual (pincel; NPCs entram no deslize do loop)
  const CELL_R = COLLISION_CELL;
  const routeCellBlocked = (x: number, y: number): boolean => {
    if (isExtended) {
      const list = project.subBiomes || [];
      let cx = 0;
      for (const sb of list) {
        const w = sb.tileWidth || 400;
        if (x >= cx && x < cx + w) {
          const sets = collisionSets.subBiomes.get(sb.id);
          if (!sets) return false;
          const key = `${Math.floor((x - cx) / CELL_R)},${Math.floor(y / CELL_R)}`;
          if (sets.blocked.has(key)) return true;
          if (!sets.restrict) return false;
          return !sets.walkable.has(key);
        }
        cx += w + 40;
      }
      return false;
    }
    const key = `${Math.floor(x / CELL_R)},${Math.floor(y / CELL_R)}`;
    if (collisionSets.globalBlocked.has(key)) return true;
    if (!collisionSets.globalRestrict) return false;
    return !collisionSets.globalWalkable.has(key);
  };

  // Segmento reto livre? Amostra a cada 12px (pontos finais com tolerância p/ marcadores dentro de parede)
  const segmentFree = (x1: number, y1: number, x2: number, y2: number): boolean => {
    const d = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(1, Math.ceil(d / 6));
    for (let i = 1; i < steps; i++) {
      if (routeCellBlocked(x1 + ((x2 - x1) * i) / steps, y1 + ((y2 - y1) * i) / steps)) return false;
    }
    return true;
  };

  // Rota interna: A* sobre a GRADE do pincel (desvia das colisões; invisível).
  // Células caminháveis do pincel; resto é parede (quando há restrição).
  const computeTapRoute = (
    sx: number,
    sy: number,
    gx: number,
    gy: number
  ): { x: number; y: number }[] => {
    const W = totalMapWidth;
    const H = totalMapHeight;
    const CS = COLLISION_CELL;
    const cols = Math.max(1, Math.ceil(W / CS));
    const rows = Math.max(1, Math.ceil(H / CS));
    const blocked = (c: number, r: number): boolean => {
      if (c < 0 || r < 0 || c >= cols || r >= rows) return true;
      return routeCellBlocked((c + 0.5) * CS, (r + 0.5) * CS);
    };
    const sc = Math.max(0, Math.min(cols - 1, Math.floor(sx / CS)));
    const sr = Math.max(0, Math.min(rows - 1, Math.floor(sy / CS)));
    let gc = Math.max(0, Math.min(cols - 1, Math.floor(gx / CS)));
    let gr = Math.max(0, Math.min(rows - 1, Math.floor(gy / CS)));
    const key = (c: number, r: number) => r * cols + c;
    // Destino dentro de parede? Ajusta p/ caminhável mais próxima (raio 12)
    if (blocked(gc, gr)) {
      let found: { c: number; r: number } | null = null;
      for (let rad = 1; rad <= 12 && !found; rad++) {
        for (let dc = -rad; dc <= rad && !found; dc++) {
          for (let dr = -rad; dr <= rad && !found; dr++) {
            if (Math.max(Math.abs(dc), Math.abs(dr)) !== rad) continue;
            const c = gc + dc;
            const r = gr + dr;
            if (c < 0 || r < 0 || c >= cols || r >= rows) continue;
            if (!blocked(c, r)) found = { c, r };
          }
        }
      }
      if (!found) return [{ x: gx, y: gy }];
      gc = found.c;
      gr = found.r;
    }
    if (sc === gc && sr === gr) return [{ x: gx, y: gy }];
    // A* com heap binário (sem cortar quina de parede)
    const gScore = new Map<number, number>();
    const came = new Map<number, number>();
    const closed = new Set<number>();
    const heap: { k: number; f: number }[] = [];
    const push = (k: number, f: number) => {
      heap.push({ k, f });
      let i = heap.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (heap[p].f <= heap[i].f) break;
        const tmp = heap[p];
        heap[p] = heap[i];
        heap[i] = tmp;
        i = p;
      }
    };
    const pop = (): number => {
      const top = heap[0].k;
      const last = heap.pop()!;
      if (heap.length > 0) {
        heap[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1;
          const r = l + 1;
          let m = i;
          if (l < heap.length && heap[l].f < heap[m].f) m = l;
          if (r < heap.length && heap[r].f < heap[m].f) m = r;
          if (m === i) break;
          const tmp = heap[m];
          heap[m] = heap[i];
          heap[i] = tmp;
          i = m;
        }
      }
      return top;
    };
    const oct = (c: number, r: number) => {
      const dx = Math.abs(c - gc);
      const dy = Math.abs(r - gr);
      return Math.max(dx, dy) + 0.4142 * Math.min(dx, dy);
    };
    const startK = key(sc, sr);
    const goalK = key(gc, gr);
    gScore.set(startK, 0);
    push(startK, oct(sc, sr));
    const DIRS = [
      [1, 0, 1],
      [-1, 0, 1],
      [0, 1, 1],
      [0, -1, 1],
      [1, 1, 1.4142],
      [1, -1, 1.4142],
      [-1, 1, 1.4142],
      [-1, -1, 1.4142],
    ];
    let foundGoal = false;
    let guard = 0;
    while (heap.length > 0 && guard++ < 30000) {
      const u = pop();
      if (closed.has(u)) continue;
      closed.add(u);
      if (u === goalK) {
        foundGoal = true;
        break;
      }
      const uc = u % cols;
      const ur = (u - uc) / cols;
      for (const [dc, dr, cost] of DIRS) {
        const nc = uc + dc;
        const nr = ur + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const nk = key(nc, nr);
        if (closed.has(nk)) continue;
        // Não corta quina: diagonal exige os dois lados livres (saída sempre livre)
        const selfStart = uc === sc && ur === sr;
        if (!selfStart && blocked(nc, nr)) continue;
        if (dc !== 0 && dr !== 0 && !selfStart) {
          if (blocked(uc + dc, ur) || blocked(uc, ur + dr)) continue;
        }
        const ng = (gScore.get(u) || 0) + cost;
        if (ng < (gScore.get(nk) ?? Infinity)) {
          gScore.set(nk, ng);
          came.set(nk, u);
          push(nk, ng + oct(nc, nr));
        }
      }
    }
    if (!foundGoal) return [{ x: gx, y: gy }];
    const cells: { c: number; r: number }[] = [];
    let c = goalK;
    while (c !== startK) {
      cells.unshift({ c: c % cols, r: (c - (c % cols)) / cols });
      const p = came.get(c);
      if (p === undefined) break;
      c = p;
    }
    const raw = [
      { x: sx, y: sy },
      ...cells.map((cell) => ({ x: (cell.c + 0.5) * CS, y: (cell.r + 0.5) * CS })),
      { x: gx, y: gy },
    ];
    // Alisa: pula nós com visada livre (string pulling)
    const smooth: { x: number; y: number }[] = [raw[0]];
    let anchor = 0;
    for (let i = 2; i < raw.length; i++) {
      if (!segmentFree(raw[anchor].x, raw[anchor].y, raw[i].x, raw[i].y)) {
        smooth.push(raw[i - 1]);
        anchor = i - 1;
      }
    }
    smooth.push(raw[raw.length - 1]);
    const out = smooth.slice(1);
    return out.length > 0 ? out : [{ x: gx, y: gy }];
  };

  const isWebFrameless = isPlayMode && effectiveWebMode;
  const frameWidth = isWebFrameless ? screenWidth : screenWidth + 24;
  const frameHeight = isWebFrameless ? screenHeight : screenHeight + 36;
  const effectiveEvent = getActiveBiomeEvent();

  const handleSwitchOrientation = (next: 'portrait' | 'landscape') => {
    if (next === 'portrait') {
      handleToggleWebMode(false);
    }
    onToggleOrientation?.(next);
    if (onUpdateProject) {
      const curScreens = getOrCreateScreensConfig(project);
      if (curScreens.activeScreenId !== 'screen_dialogue') {
        onUpdateProject({
          screensConfig: {
            ...curScreens,
            activeScreenId:
              next === 'landscape' ? 'screen_player_hud_landscape' : 'screen_player_hud',
          },
        });
      }
    }
  };

  const webConfigEnabled = hudConfig?.webConfig?.enabled !== false;
  const viewportInsetClass = isWebFrameless ? 'inset-0 rounded-xl' : 'inset-3 rounded-[34px]';

  return (
    <div className="flex flex-col items-center w-full">
      {/* Device Header Bar (título + Seletor Retrato / Paisagem / WEB) — oculto no Modo Play pois já existe na barra superior */}
      {!isPlayMode && (
        <div className="flex items-center justify-between gap-3 w-full max-w-[840px] px-3 py-1 mb-2">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200 text-xs">
            <Smartphone className={`w-4 h-4 text-amber-400 transition-transform ${isLandscape ? '-rotate-90' : ''}`} />
            <span>
              {effectiveWebMode
                ? 'Modo Paisagem • 🌐 WEB (Teclado WASD Ativo)'
                : isLandscape
                ? 'Preview Smartphone • Modo Paisagem (Horizontal)'
                : 'Preview Smartphone • Modo Retrato'}
            </span>
          </div>

          {onToggleOrientation && (
            <div className="flex items-center gap-1 p-0.5 rounded-xl bg-slate-900 border border-slate-700/80 shadow-inner">
              <button
                type="button"
                onClick={() => handleSwitchOrientation('portrait')}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  !isLandscape
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Alternar para Modo Retrato (Vertical)"
              >
                <span>▯ Retrato</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSwitchOrientation('landscape');
                  if (effectiveWebMode) handleToggleWebMode(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isLandscape && !effectiveWebMode
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Alternar para Modo Paisagem (Ocupa largura máxima do Emulador + Camadas)"
              >
                <span>▭ Paisagem</span>
              </button>
              {isLandscape && webConfigEnabled && (
                <button
                  type="button"
                  onClick={() => handleToggleWebMode(!effectiveWebMode)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer ${
                    effectiveWebMode
                      ? 'bg-cyan-400 text-slate-950 shadow-[0_0_12px_rgba(34,211,238,0.5)] ring-1 ring-cyan-200'
                      : 'bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900/70 border border-cyan-500/40'
                  }`}
                  title="Ativar Modo WEB na Paisagem: Oculta o Joystick virtual e ativa WASD + teclas de atalho configuradas no HUD Paisagem"
                >
                  <span>🌐 WEB</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Frame do Dispositivo (Moldura Mobile ou Canvas Web Widescreen Imersivo sem bordas de celular) */}
      <div
        style={{
          width: frameWidth,
          height: frameHeight,
        }}
        className={
          isWebFrameless
            ? 'relative bg-black p-0 rounded-xl shadow-[0_25px_80px_rgba(0,0,0,0.95)] border border-cyan-500/30 ring-1 ring-cyan-400/15 flex flex-col justify-between shrink-0 transition-all duration-200 overflow-hidden'
            : 'relative bg-slate-900 p-3 rounded-[44px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] border-[5px] border-slate-700/90 flex flex-col justify-between ring-1 ring-white/10 shrink-0 transition-all duration-200'
        }
      >
        {/* Botões Laterais Físicos do Smartphone (ocultos no Modo WEB Imersivo) */}
        {!isWebFrameless && (
          !isLandscape ? (
            <>
              <div className="absolute -left-[9px] top-28 w-[4px] h-12 bg-slate-600 rounded-l-md shadow-sm" />
              <div className="absolute -left-[9px] top-44 w-[4px] h-12 bg-slate-600 rounded-l-md shadow-sm" />
              <div className="absolute -right-[9px] top-32 w-[4px] h-16 bg-slate-600 rounded-r-md shadow-sm" />
            </>
          ) : (
            <>
              <div className="absolute -top-[9px] left-28 h-[4px] w-12 bg-slate-600 rounded-t-md shadow-sm" />
              <div className="absolute -top-[9px] left-44 h-[4px] w-12 bg-slate-600 rounded-t-md shadow-sm" />
              <div className="absolute -bottom-[9px] left-36 h-[4px] w-16 bg-slate-600 rounded-b-md shadow-sm" />
            </>
          )
        )}

        {/* Dynamic Island / Notch Moderno (oculto no Modo WEB Imersivo) */}
        {!isWebFrameless && (
          !isLandscape ? (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-28 h-6 bg-slate-950 rounded-full z-50 flex items-center justify-between px-3 border border-slate-800/80 shadow-md">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
              </div>
              <span className="w-8 h-1 bg-slate-800 rounded-full" />
            </div>
          ) : (
            <div className="absolute left-4 top-1/2 -translate-y-1/2 h-24 w-5 bg-slate-950 rounded-full z-50 flex flex-col items-center justify-between py-2.5 border border-slate-800/80 shadow-md pointer-events-none">
              <div className="flex flex-col items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-slate-900 border border-slate-700" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
              </div>
              <span className="h-6 w-1 bg-slate-800 rounded-full" />
            </div>
          )
        )}

        {/* Status Bar Superior Realista (oculta no Modo WEB Imersivo) */}
        {!isWebFrameless && (
          <div className="absolute top-3 left-3 right-3 z-40 pt-1.5 px-6 pb-1 flex items-center justify-between text-[11px] font-semibold text-slate-300 pointer-events-none bg-gradient-to-b from-slate-950/90 via-slate-950/40 to-transparent backdrop-blur-[1px] rounded-t-[34px]">
            <span className="font-mono-data">09:41</span>
            <div className="flex items-center gap-2 text-slate-400">
              <span className="text-[10px] font-mono-data tracking-tighter">5G</span>
              <Wifi className="w-3 h-3 text-slate-300" />
              <div className="flex items-center gap-0.5">
                <Battery className="w-3.5 h-3.5 text-slate-200" />
              </div>
            </div>
          </div>
        )}

        {/* Botão de Som BGM no HUD do Emulador (posicionado fora do Header Superior) */}
        {currentBgmUrlRef.current && (
          <button
            onClick={() => {
              setIsBgmMuted((curr) => {
                const next = !curr;
                if (bgmAudioRef.current) {
                  if (next) {
                    bgmAudioRef.current.pause();
                  } else {
                    bgmAudioRef.current.play().catch(() => {});
                  }
                }
                return next;
              });
            }}
            className={`absolute bottom-28 right-4 z-40 flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-bold transition-all shadow-md ${
              isBgmMuted
                ? 'bg-slate-900/90 border-slate-700 text-slate-400'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            }`}
            title={isBgmMuted ? 'Desmutar trilha sonora' : 'Mutar trilha sonora'}
          >
            {isBgmMuted ? <VolumeX className="w-3.5 h-3.5 text-slate-400" /> : <Volume2 className="w-3.5 h-3.5 text-amber-400 animate-pulse" />}
            <span>{isBgmMuted ? 'Mudo' : 'BGM'}</span>
          </button>
        )}

        {/* Efeitos Atmosféricos na Moldura da Tela do Celular (Viewport Frame com Cobertura Total) */}
        {/* 1. Chuva no Céu: Gotas Diagonais Contínuas na Tela */}
        {isWeatherEffectActive('rain') && (
          <div className={`absolute ${viewportInsetClass} z-[45] pointer-events-none overflow-hidden bg-blue-950/20 backdrop-blur-[0.3px]`}>
            <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 via-transparent to-slate-950/30" />
            {Array.from({ length: project.rainConfig?.intensity ?? 42 }).map((_, rIdx) => {
              const leftPos = (rIdx * 19) % 100;
              const baseDur = project.rainConfig?.speed ?? 0.5;
              const animDur = baseDur + ((rIdx * 7) % 6) * 0.07;
              const animDelay = -1 * ((rIdx * 13) % 9) * 0.09;
              return (
                <div
                  key={`screen-rain-${rIdx}`}
                  className="absolute w-[1.5px] h-10 bg-gradient-to-b from-transparent via-cyan-200 to-cyan-400 animate-rain-fall-topdown shadow-[0_0_3px_rgba(34,211,238,0.7)]"
                  style={{
                    left: `${leftPos}%`,
                    top: '-60px',
                    animationDuration: `${animDur}s`,
                    animationDelay: `${animDelay}s`,
                  }}
                />
              );
            })}
          </div>
        )}


        {/* 3. Vinheta Noturna */}
        {isWeatherEffectActive('night') && (
          <div 
            className={`absolute ${viewportInsetClass} z-[47] pointer-events-none overflow-hidden transition-opacity duration-1000`}
            style={{
              background: 'radial-gradient(circle at center, rgba(15, 23, 42, 0.05) 25%, rgba(15, 23, 42, 0.65) 80%, rgba(2, 6, 23, 0.95) 100%)'
            }}
          />
        )}

        {/* Intro Cutscene antes do Spawn: tela cheia dentro da moldura */}
        {introCutscene && (
          <div className={`absolute ${viewportInsetClass} z-[65] bg-black overflow-hidden flex items-center justify-center pointer-events-auto`}>
            <video
              ref={introVideoElRef}
              src={introCutscene.url}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              onLoadedMetadata={(e) => {
                e.currentTarget.playbackRate = introCutscene.speed;
                e.currentTarget.muted = true;
              }}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (introFadeTriggeredRef.current) return;
                // Quando faltar 1 segundo para acabar o vídeo, inicia a sobreposição do desvanecer
                const remainingWallSec = (v.duration - v.currentTime) / Math.max(0.1, introCutscene.speed);
                if (v.duration > 0 && remainingWallSec <= 1.05) {
                  introFadeTriggeredRef.current = true;
                  const isLight = isLightFadeColor(introCutscene.fadeColor);
                  setFadeColor(introCutscene.fadeColor);
                  setFadeDurationMs(isLight ? 1200 : 1000);
                  setTeleportFade('out');
                }
              }}
              onEnded={() => {
                finishIntroVideoAndStartSpawn();
              }}
            />
            {/* Botão Pular Cutscene */}
            <button
              type="button"
              onClick={() => finishIntroVideoAndStartSpawn()}
              className="absolute top-4 right-4 z-20 px-3 py-1.5 rounded-full bg-slate-900/85 hover:bg-slate-800 text-white text-[10px] font-bold border border-slate-700/80 shadow-2xl cursor-pointer flex items-center gap-1 backdrop-blur-md transition-all active:scale-95"
            >
              <span>Pular</span>
              <span>⏭</span>
            </button>
          </div>
        )}

        {/* Desvanecer de tela (teleporte preto, cena ou transição cinematográfica do spawn) */}
        <div
          className={`absolute ${viewportInsetClass} z-[70] pointer-events-none transition-opacity ${
            teleportFade === 'out' ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            backgroundColor: fadeColor,
            transitionDuration: `${fadeDurationMs}ms`,
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />

        {/* Cena de vídeo do evento */}
        {eventVideo && (
          <div
            className={`absolute ${viewportInsetClass} z-[55] bg-black overflow-hidden`}
            onClick={() => closeEventVideo()}
          >
            <video
              src={eventVideo.url}
              autoPlay
              playsInline
              className="w-full h-full object-cover pointer-events-none"
              onEnded={() => closeEventVideo()}
            />
          </div>
        )}

        {/* CAMADA DE TRANSPORTE DE SPAWN CINEMÁTICO */}
        {isSpawnActive && spawnPhase !== 'fading' && (
          <div className={`absolute ${viewportInsetClass} z-[58] pointer-events-none overflow-hidden`}>
            {(() => {
              const anchor = project.spawnConfig?.anchorMode || 'bottom';
              const offY = project.spawnConfig?.offsetY || 0;
              const translateY = anchor === 'bottom'
                ? `calc(-100% + ${offY}px)`
                : anchor === 'hover'
                ? `calc(-115% + ${offY}px)`
                : `calc(-50% + ${offY}px)`;
              const speed = project.spawnConfig?.speed || 1.5;
              const intensity = project.spawnConfig?.effectIntensity ?? 0.3;
              const dir = project.spawnConfig?.entryDirection || 'top';
              const isLateral = dir === 'left' || dir === 'right';
              const flip = project.spawnConfig?.flipHorizontal;
              const scaleVal = project.spawnConfig?.transportScale || 1.35;

              const easing = isLateral
                ? (spawnPhase === 'approaching'
                    ? 'cubic-bezier(0.16, 1, 0.3, 1)'
                    : 'cubic-bezier(0.38, 0, 0.22, 1)')
                : (spawnPhase === 'approaching'
                    ? 'cubic-bezier(0.22, 1, 0.36, 1)'
                    : 'cubic-bezier(0.4, 0, 0.2, 1)');

              return (
                <div
                  className="absolute top-0 left-0 w-40 h-40 min-w-[160px] min-h-[160px] shrink-0 pointer-events-none"
                  style={{
                    transform: `translate3d(${spawnPos.x}px, ${spawnPos.y}px, 0)`,
                    transitionProperty: 'transform',
                    transitionDuration:
                      spawnPhase === 'approaching'
                        ? `${speed}s`
                        : spawnPhase === 'departing'
                        ? `${speed * 0.95}s`
                        : '0.1s',
                    transitionTimingFunction: easing,
                    willChange: 'transform',
                  }}
                >
                  <div
                    className="w-full h-full shrink-0 flex items-center justify-center"
                    style={{
                      transform: `translate(-50%, ${translateY}) scale(${flip ? -scaleVal : scaleVal}, ${scaleVal})`,
                      transformOrigin: '50% 100%',
                    }}
                  >
                    <div
                      className={`w-full h-full shrink-0 flex items-center justify-center ${
                        spawnPhase === 'landed'
                          ? (isLateral
                            ? (project.spawnConfig?.effect === 'float' ? 'animate-spawn-hover' : '')
                            : (project.spawnConfig?.effect === 'none'
                              ? ''
                              : project.spawnConfig?.effect === 'float'
                              ? 'animate-spawn-hover'
                              : 'animate-spawn-cushion'))
                          : ''
                      }`}
                      style={{
                        transformOrigin: '50% 100%',
                        ['--spawn-intensity' as any]: intensity,
                      }}
                    >
                      <img
                        src={project.spawnConfig?.transportPng || DEFAULT_SPAWN_VEHICLE_PNG}
                        alt={project.spawnConfig?.transportName || 'Transporte de Spawn'}
                        className="w-full h-full max-w-none max-h-none shrink-0 object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.85)] select-none pointer-events-none"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Viewport da Tela do Celular com Stacking Context Isolado */}
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className={`relative z-0 w-full h-full bg-black ${isWebFrameless ? 'rounded-xl' : 'rounded-[34px]'} select-none scrollbar-none overscroll-none ${
            isExtended 
              ? (scaledMapWidth > screenWidth || scaledMapHeight > screenHeight ? 'overflow-auto' : 'overflow-hidden')
              : (scaledMapHeight > screenHeight ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden')
          }`}
          style={{
            scrollbarWidth: 'none',
            overscrollBehavior: 'none',
            isolation: 'isolate',
            contain: 'paint layout',
            willChange: 'scroll-position',
            transform: 'translate3d(0, 0, 0)',
          }}
        >
          {/* Visualização Especial do Mapa Panorâmico Interativo no Emulador (Modo Solo de Mapa) */}
          {isWorldMapSolo ? (
            <WorldMapEmulatorView
              project={project}
              savedLevels={savedLevels}
              onLoadLevel={onLoadLevel}
              screenWidth={screenWidth}
              screenHeight={screenHeight}
              isPlayMode={isPlayMode}
            />
          ) : (isExtended ? (project.subBiomes || []).length === 0 : project.biomes.length === 0) ? (
            <div className="h-full flex flex-col items-center justify-center p-6 text-center">
              <Upload className="w-10 h-10 text-slate-600 mb-3" />
              <p className="text-sm text-slate-300 font-semibold">
                {isExtended ? 'Nenhum Extended Biome carregado' : 'Nenhum bioma carregado'}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {isExtended
                  ? 'Importe uma imagem PNG para visualizar a fase extended ao vivo'
                  : 'Importe uma imagem PNG para visualizar o mapa vertical alongado'}
              </p>
              {onTriggerImportPNG && (
                <button
                  onClick={onTriggerImportPNG}
                  className="mt-4 px-4 py-2 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-medium hover:bg-amber-500/30 transition-colors"
                >
                  Importar PNG
                </button>
              )}
            </div>
          ) : (
            <div
              ref={contentRef}
              className="relative overflow-hidden"
              style={{
                width: scaledMapWidth,
                height: scaledMapHeight,
                cursor: activeTool === 'motion_pen' ? 'crosshair' : 'default',
                transform: 'translate3d(0, 0, 0)',
                willChange: 'transform',
                backfaceVisibility: 'hidden',
              }}
              onPointerDown={(e) => {
                if (activeTool === 'motion_pen' && e.button === 0) {
                  const p = motionPos(e);
                  if (p) {
                    motionCurrentRef.current = [p];
                    motionPaintingRef.current = true;
                    redrawMotionPreview();
                  }
                  return;
                }
                tapDownRef.current = { x: e.clientX, y: e.clientY };
              }}
              onPointerMove={(e) => {
                if (activeTool === 'motion_pen' && motionPaintingRef.current) {
                  const p = motionPos(e);
                  if (p && motionCurrentRef.current) {
                    const cur = motionCurrentRef.current;
                    const last = cur[cur.length - 1];
                    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1.5) {
                      cur.push(p);
                      motionCurrentRef.current = cur;
                    }
                    redrawMotionPreview();
                  }
                }
              }}
              onPointerUp={(e) => {
                if (activeTool === 'motion_pen' && motionPaintingRef.current) {
                  motionPaintingRef.current = false;
                  const cur = motionCurrentRef.current;
                  motionCurrentRef.current = null;

                  if (isVfxOverlayEffect(motionEffect)) {
                    // Efeitos de Luz e VFX (Make This Bright, Mini-Glitter, Fumaça, Vagalumes, Arco Elétrico):
                    // NÃO têm recorte, NÃO têm máscara, NÃO têm gelatina. São sobreposições puras sem corte!
                    if (cur && cur.length > 0) {
                      const unscaled = cur.map((p) => ({
                        x: p.x / scale,
                        y: p.y / scale,
                      }));
                      const newOverlay: import('../types/map').MotionOverlayStroke = {
                        id: `motion-overlay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        effect: motionEffect || 'glitter',
                        brushSize: motionBrushSize,
                        speed: motionSpeed || 1.0,
                        intensity: motionIntensity || 1.0,
                        points: unscaled,
                        visible: true,
                        createdAt: Date.now(),
                      };
                      onUpdateProject?.({
                        motionOverlays: [...(project.motionOverlays || []), newOverlay],
                      });
                    }
                    clearMotion();
                  } else {
                    // Gelatina e Modos de Malha: extrai o recorte!
                    if (cur && cur.length > 0) {
                      motionStrokesRef.current.push(cur);
                    }
                    if (motionAuto) {
                      extractMotion();
                    } else {
                      redrawMotionPreview();
                    }
                  }
                  return;
                }
              }}
              onPointerLeave={() => {
                if (activeTool === 'motion_pen' && motionPaintingRef.current) {
                  motionPaintingRef.current = false;
                  const cur = motionCurrentRef.current;
                  motionCurrentRef.current = null;

                  if (isVfxOverlayEffect(motionEffect)) {
                    if (cur && cur.length > 0) {
                      const unscaled = cur.map((p) => ({
                        x: p.x / scale,
                        y: p.y / scale,
                      }));
                      const newOverlay: import('../types/map').MotionOverlayStroke = {
                        id: `motion-overlay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        effect: motionEffect || 'glitter',
                        brushSize: motionBrushSize,
                        speed: motionSpeed || 1.0,
                        intensity: motionIntensity || 1.0,
                        points: unscaled,
                        visible: true,
                        createdAt: Date.now(),
                      };
                      onUpdateProject?.({
                        motionOverlays: [...(project.motionOverlays || []), newOverlay],
                      });
                    }
                    clearMotion();
                  } else {
                    if (cur && cur.length > 0) {
                      motionStrokesRef.current.push(cur);
                    }
                    if (motionAuto) {
                      extractMotion();
                    } else {
                      redrawMotionPreview();
                    }
                  }
                }
              }}
              onClick={(e) => {
                if (activeTool === 'motion_pen') return;
                // Toque-move: só no modo dedinho, sem arrasto, sem diálogo/vídeo aberto
                if (locomotion !== 'tap') return;
                if (activeDialogueMarker || eventVideo) return;
                const down = tapDownRef.current;
                tapDownRef.current = null;
                if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 12) return;
                const el = contentRef.current;
                if (!el) return;
                const rect = el.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) return;
                const fx = (e.clientX - rect.left) / rect.width;
                const fy = (e.clientY - rect.top) / rect.height;
                if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
                const lx = (fx * scaledMapWidth) / scale;
                const ly = (fy * scaledMapHeight) / scale;
                if (isNaN(lx) || isNaN(ly)) return;
                const gx = Math.max(16, Math.min(totalMapWidth - 16, lx));
                const gy = Math.max(16, Math.min(totalMapHeight - 16, ly));
                const p = playerRef.current;
                const sx = p && !isNaN(p.x) ? p.x : 384;
                const sy = p && !isNaN(p.y) ? p.y : 100;
                // Rota interna pela GRADE do pincel (A* desvia das colisões; invisível)
                const route = computeTapRoute(sx, sy, gx, gy);
                tapWayRef.current = route.slice(0, -1);
                tapTargetRef.current = { x: gx, y: gy };
                stuckRef.current = null;
                setIsJoystickActive(true);
              }}
            >
              {/* Extended Biomes Background Layer — Renderizado via DOM <img> 100% acelerado pela GPU (suporta 10000x10000 no Preview sem alocar 400MB de Canvas) */}
              {isExtended && (
                <div className="absolute inset-0 pointer-events-none select-none">
                  {(() => {
                    const GAP = 40;
                    let cx = 0;
                    return subBiomes.map((sb) => {
                      const xPos = cx;
                      const w = sb.tileWidth || screenWidth;
                      const h = sb.tileHeight || screenHeight;
                      cx += w + GAP;
                      return (
                        <div
                          key={sb.id}
                          className="absolute overflow-hidden"
                          style={{
                            left: Math.round(xPos * scale),
                            top: 0,
                            width: Math.round(w * scale),
                            height: Math.round(h * scale),
                            backgroundColor: sb.baseColor || '#020617',
                          }}
                        >
                          {sb.tilePng && (
                            <img
                              src={sb.tilePng}
                              alt={sb.name}
                              className="w-full h-full object-fill pointer-events-none select-none"
                              loading="lazy"
                            />
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* Tile Canvas Renderizado com proporções 1:1 mantidas e perfeitamente alinhado — Apenas modo Vertical (no Extended fica 1x1 em buffer) */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 block pointer-events-none ${isExtended ? 'opacity-0' : ''}`}
                style={{
                  width: scaledMapWidth,
                  height: scaledMapHeight,
                  transform: 'translate3d(0, 0, 0)',
                  willChange: 'transform',
                  backfaceVisibility: 'hidden',
                }}
              />

              {/* Motion Pen Overlay Canvas (no Preview) */}
              <canvas
                ref={motionOverlayRef}
                className="absolute inset-0 block pointer-events-none z-20"
                style={{
                  width: scaledMapWidth,
                  height: scaledMapHeight,
                }}
              />

              {activeTool === 'motion_pen' && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-3 py-1 bg-fuchsia-950/90 border border-fuchsia-500/50 rounded-full shadow-lg text-[10px] text-fuchsia-200 font-bold pointer-events-none flex items-center gap-1.5 animate-pulse backdrop-blur-md">
                  <span>✨ Pincel Motion Pen Ativo</span>
                </div>
              )}



              {/* Scaled Routes Layer — SÓ no mapa vertical (no Extended é outra fase) */}
              {!isExtended && (
              <svg
                className="absolute inset-0 pointer-events-none z-10"
                style={{
                  width: scaledMapWidth,
                  height: scaledMapHeight,
                }}
                viewBox={`0 0 ${scaledMapWidth} ${scaledMapHeight}`}
              >
                {project.routes.map((route) => {
                  const points = route.markerIds
                    .map((id) => markerLookup.get(id))
                    .filter((m): m is MapMarker => Boolean(m) && !m?.subBiomeId)
                    .map((m) => ({ x: m.x * scale, y: m.y * scale }));

                  if (points.length < 2) return null;
                  const pathD = generateCurvedPath(points);

                  return (
                    <g key={route.id}>
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#000000"
                        strokeWidth={5}
                        strokeOpacity={0.6}
                        strokeLinecap="round"
                      />
                      <path
                        d={pathD}
                        fill="none"
                        stroke={route.color}
                        strokeWidth={2.5}
                        strokeDasharray={route.style === 'solid' ? 'none' : '6 4'}
                        strokeLinecap="round"
                        className={route.isAnimated ? 'animate-pulse' : ''}
                      />
                    </g>
                  );
                })}
              </svg>
              )}

              {/* Scaled Ground Stamps (Carimbos de Chão em Pixel Direto no Canvas — 0 Nós DOM) */}
              <canvas
                ref={groundStampsCanvasRef}
                className="absolute inset-0 block pointer-events-none z-[5]"
                style={{
                  width: Math.min(scaledMapWidth, MAX_MAP_DIMENSION),
                  height: Math.min(scaledMapHeight, MAX_MAP_DIMENSION),
                }}
              />

              {/* Camada de Natureza Instanciada (Clones do Sprite Mestre de Grama e Flores com Vento e Pisoteio do Herói — 0 Nós DOM) */}
              <canvas
                ref={vegetationCanvasRef}
                className="absolute inset-0 block pointer-events-none z-[12]"
                style={{
                  width: Math.min(scaledMapWidth, MAX_MAP_DIMENSION),
                  height: Math.min(scaledMapHeight, MAX_MAP_DIMENSION),
                }}
              />

              {/* Montantes e Dunas Orgânicas de Neve (Curvas Bézier, Ciclo de Vida Procedural & Pegadas) (z-[5]) */}
              <OrganicSnowDriftsLayer
                snowConfig={project.snowConfig}
                isSnowActive={isWeatherEffectActive('snow')}
                scale={scale}
                totalMapWidth={totalMapWidth}
                totalMapHeight={totalMapHeight}
                playerRef={playerRef}
                isMoving={isJoystickActive}
              />

              {/* Poças d'Água Procedurais com Ciclo de Vida Orgânico e Interativo (z-[6]) */}
              <OrganicRainPuddlesLayer
                rainConfig={project.rainConfig}
                isRainActive={isWeatherEffectActive('rain')}
                scale={scale}
                totalMapWidth={totalMapWidth}
                totalMapHeight={totalMapHeight}
                playerRef={playerRef}
                isMoving={isJoystickActive}
              />

              {/* Camada Inteligente de Folhas no Solo: Assentadas no chão SOB OS PÉS DO JOGADOR (z-[6]) */}
              <LeavesGroundLayer
                leavesConfig={project.leavesConfig}
                isLeavesActive={isWeatherEffectActive('leaves')}
                scale={scale}
                totalMapWidth={totalMapWidth}
                totalMapHeight={totalMapHeight}
              />

              {/* Chuva Top-Down: Respingos e Ondulações no Solo (Water Puddle Ripples & Droplets) (z-[7]) */}
              <RainGroundSplashesLayer
                rainConfig={project.rainConfig}
                isRainActive={isWeatherEffectActive('rain')}
                scale={scale}
                totalMapWidth={totalMapWidth}
                totalMapHeight={totalMapHeight}
              />

              {/* Camada Inferior: Neblina Rasteira (Ground Fog) — Abaixo do Player e Marcadores (z-[8]) */}
              <GroundFogLayer
                fogConfig={project.fogConfig}
                cloudsConfig={project.clouds}
                scale={scale}
                totalMapWidth={totalMapWidth}
                totalMapHeight={totalMapHeight}
                groundFogLayerRef={groundFogLayerRef}
              />

              {/* Formigas Vivas: Marcha 60fps na Trilha, Perninhas Articuladas, Folhinhas Verdes & Dispersão Real de Pânico */}
              {isWeatherEffectActive('ants') && (
                <LivingAntColony
                  antsConfig={project.antsConfig}
                  playerRef={playerRef}
                  scale={scale}
                  totalMapWidth={totalMapWidth}
                  totalMapHeight={totalMapHeight}
                />
              )}

              {/* Scaled Markers Interativos — só os da fase visível (Extended: locais + origem) */}
              <div className="absolute inset-0 pointer-events-none">
                {(() => {
                  const effectiveLayers = (project.markerLayers && project.markerLayers.length > 0)
                    ? project.markerLayers
                    : [{ id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0 }];
                  const layerMap = new Map(effectiveLayers.map((l) => [l.id, l]));

                  const sbOriginMap = new Map<string, number>();
                  if (isExtended) {
                    let cx = 0;
                    for (const sb of subBiomes) {
                      sbOriginMap.set(sb.id, cx);
                      cx += (sb.tileWidth || 400) + 40;
                    }
                  }

                  const cont = containerRef.current;
                  const currentScrollX = cont ? cont.scrollLeft : 0;
                  const currentScrollY = cont ? cont.scrollTop : 0;
                  const viewportW = cont ? cont.clientWidth : screenWidth;
                  const viewportH = cont ? cont.clientHeight : screenHeight;
                  const cullMargin = 800;
                  const cullMinX = Math.max(0, (currentScrollX - cullMargin) / scale);
                  const cullMaxX = (currentScrollX + viewportW + cullMargin) / scale;
                  const cullMinY = Math.max(0, (currentScrollY - cullMargin) / scale);
                  const cullMaxY = (currentScrollY + viewportH + cullMargin) / scale;

                  return project.markers
                    .filter(
                      (marker) =>
                        !collectedMarkerIds.has(marker.id) &&
                        !collectedMarkerIdsRef.current.has(marker.id) &&
                        (isExtended ? Boolean(marker.subBiomeId) : !marker.subBiomeId)
                    )
                    .map((marker) => {
                      const markerLayer = layerMap.get(marker.layerId || '') || effectiveLayers[0];
                      const parentGroup = markerLayer?.groupId ? layerMap.get(markerLayer.groupId) : null;
                      if (markerLayer && (!markerLayer.visible || (parentGroup && parentGroup.visible === false))) return null;
                      const layerOrder = markerLayer ? markerLayer.order : 0;

                      let originX = 0;
                      if (isExtended && marker.subBiomeId) {
                        const ox = sbOriginMap.get(marker.subBiomeId);
                        if (ox === undefined) return null;
                        originX = ox;
                      }
                      const live = npcLivePositionsRef.current.get(marker.id);
                      const curMx = live ? live.x : marker.x;
                      const curMy = live ? live.y : marker.y;
                      const globalMx = originX + curMx;
                      const r = marker.size || 150;

                      const isSelected = marker.id === inspectedMarker?.id;

                      // Viewport Culling 2D no emulador: não renderiza nós de marcadores muito distantes da câmera
                      if (
                        !isSelected &&
                        (globalMx + r < cullMinX ||
                          globalMx - r > cullMaxX ||
                          curMy + r < cullMinY ||
                          curMy - r > cullMaxY)
                      ) {
                        return null;
                      }

                      const posX = (originX + curMx) * scale;
                      const posY = curMy * scale;
                      const uiScale = scale;
                      const isStation = marker.type === 'interactive_screen';
                      const stationBaseScale = isStation ? (marker.stationConfig?.baseAssetScale ?? 1.0) : 1.0;
                      const markerSize = Math.max(18, Math.round((marker.size || 150) * uiScale));
                      const effectiveMarkerSize = isStation ? Math.max(18, Math.round(markerSize * stationBaseScale)) : markerSize;

                      // Clones de natureza do Terrain Pen já são renderizados em lote no vegetationCanvasRef (0 nós DOM individuais)
                      if (marker.id.startsWith('terrain-')) {
                        return null;
                      }

                  // Balão à prova de zoom: calcula em pixels DE TELA e converte p/ layout.
                  // Regras: nunca cobre o herói, nunca sai da tela (viewport do celular).
                  const cont = containerRef.current;
                  const scrX = cont ? cont.scrollLeft : 0;
                  const scrY = cont ? cont.scrollTop : 0;
                  const viewW = cont ? cont.clientWidth : screenWidth;
                  const viewH = cont ? cont.clientHeight : screenHeight;
                  const camZ = camZoomValRef.current || 1;
                  const camO = camOriginRef.current;
                  const toScreenX = (lx: number) => camO.x + (lx - camO.x) * camZ - scrX;
                  const toScreenY = (ly: number) => camO.y + (ly - camO.y) * camZ - scrY;
                  const mScrX = toScreenX(posX);
                  const mScrY = toScreenY(posY);
                  const pl = project.player || { x: 384, y: 100 };
                  const pScrY = toScreenY(pl.y * scale);

                  // Largura visual compacta de balão de fala game (164px de tela) → layout divide pelo zoom
                  const BALLOON_WIDTH = Math.min(164, screenWidth - 24);
                  const BALLOON_W_LAYOUT = BALLOON_WIDTH / camZ;
                  const SAFE_PADDING = 10;

                  // Clamp horizontal na TELA e converte a borda p/ layout
                  const clampedLeftScreen = Math.max(
                    SAFE_PADDING,
                    Math.min(mScrX - BALLOON_WIDTH / 2, viewW - BALLOON_WIDTH - SAFE_PADDING)
                  );
                  const clampedLeftLayout = camO.x + (clampedLeftScreen + scrX - camO.x) / camZ;
                  // Compensação exata para o pai que possui -translate-x-1/2 (largura markerSize)
                  const balloonOffsetLeft = clampedLeftLayout - posX + markerSize / 2;

                  // Notch aponta o centro do marcador (em layout)
                  const notchScreen = Math.max(14, Math.min(mScrX - clampedLeftScreen, BALLOON_WIDTH - 14));
                  const notchLeft = notchScreen / camZ;

                  // Direção: nunca cobre o herói (em tela); bordas da tela decidem
                  const isPlayerBelowMarker = pScrY >= mScrY;
                  let isAbove = isPlayerBelowMarker;
                  if (mScrY < 160) isAbove = false;
                  else if (mScrY > viewH - 240) isAbove = true;

                  // Buffer amplo de pré-carregamento (800px): garante que os assets
                  // estejam decodificados na memória de textura da GPU antes de entrar na tela,
                  // eliminando os micro-stutters e travamentos ao caminhar.
                  const PRELOAD_MARGIN = 800;
                  const isInViewport = mScrX >= -PRELOAD_MARGIN && mScrX <= viewW + PRELOAD_MARGIN && mScrY >= -PRELOAD_MARGIN && mScrY <= viewH + PRELOAD_MARGIN;

                  return (
                    <div
                      key={marker.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        // Objetos motion são puramente visuais e físicos: zero interação e zero cliques no emulador
                        if (marker.motionAsset) return;

                        // Estação Interativa com Tela (Chocadeira, Alquimia, etc.)
                        if (marker.type === 'interactive_screen') {
                          const trigger = marker.stationConfig?.activationTrigger || 'both';
                          onSelectMarker(marker.id);
                          if (trigger === 'click' || trigger === 'both') {
                            contactedMarkerIdsRef.current.add(marker.id);
                            handleInteractWithStation(marker);
                          }
                          return;
                        }

                        // Item Coletável: permite coletar com clique/toque direto também
                        if (marker.type === 'collectible') {
                          contactedMarkerIdsRef.current.add(marker.id);
                          handleCollectItem(marker);
                          return;
                        }

                        // Assets PNG e marcadores neutros de cenário: ZERO interação/clique/balão no preview
                        if (
                          (marker.customIconPng || marker.type === 'camp') &&
                          marker.type !== 'npc' &&
                          marker.type !== 'travel' &&
                          marker.type !== 'event' &&
                          !marker.dialogueEnabled
                        ) {
                          return;
                        }

                        // Travel automático: toca e teleporta com fade, sem abrir balão.
                        if (marker.type === 'travel' && marker.travelAuto !== false) {
                          contactedMarkerIdsRef.current.add(marker.id);
                          autoTravel(marker);
                          return;
                        }
                        // Coletável e Baú de Tesouro: toca e coleta diretamente para a Mochila!
                        if (marker.type === 'collectible') {
                          contactedMarkerIdsRef.current.add(marker.id);
                          handleCollectItem(marker);
                          return;
                        }
                        if (marker.type === 'treasure') {
                          contactedMarkerIdsRef.current.add(marker.id);
                          handleOpenTreasureChest(marker);
                          return;
                        }
                        // Evento ou Área com eventos: toca e dispara
                        if (marker.type === 'event' || (marker.type === 'area' && marker.events && marker.events.length > 0)) {
                          contactedMarkerIdsRef.current.add(marker.id);
                          triggerEvent(marker);
                          return;
                        }
                        // NPC ou Boss: se tiver diálogo, quest ou evento configurado, abre o diálogo/cápsula; se for puramente hostil sem diálogo, aplica dano
                        if (marker.type === 'npc' || marker.type === 'boss') {
                          contactedMarkerIdsRef.current.add(marker.id);
                          const hasNarrativeOrQuest =
                            marker.dialogueEnabled ||
                            Boolean(marker.quest) ||
                            Boolean(marker.linkedQuestId) ||
                            Boolean(marker.events && marker.events.length > 0);
                          if (
                            !hasNarrativeOrQuest &&
                            marker.actionNpc?.enabled &&
                            (marker.actionNpc.role === 'hostile' ||
                              marker.actionNpc.attacks?.jump?.enabled ||
                              marker.actionNpc.attacks?.dash?.enabled ||
                              marker.actionNpc.attacks?.hackSlash?.enabled ||
                              marker.actionNpc.attacks?.ranged?.enabled)
                          ) {
                            const pPos = { x: playerRef.current?.x ?? 384, y: playerRef.current?.y ?? 100 };
                            globalNpcActionEngine.applyDamage(marker.id, 15, pPos, 'player');
                            return;
                          }
                          openNpcPopup(marker);
                          return;
                        }
                        const behavior = marker.clickBehavior || (marker.dialogueEnabled ? 'dialogue_first' : 'popup_first');
                        
                        if (behavior === 'dialogue_first' || behavior === 'dialogue_only') {
                          creditTalk(marker.id);
                          setActiveDialogueMarker(marker);
                          setCurrentStepIndex(0);
                          setDialogueCustomFeedback(null);
                        } else {
                          setInspectedMarker(marker);
                        }
                        
                        onSelectMarker(marker.id);
                        if (containerRef.current) {
                          containerRef.current.scrollTo({
                            top: posY - screenHeight / 2,
                            behavior: 'smooth',
                          });
                        }
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 ${
                        marker.motionAsset
                          ? 'pointer-events-none select-none'
                          : 'pointer-events-auto cursor-pointer group transition-transform active:scale-95'
                      }`}
                      data-mid={marker.id}
                      style={{
                        left: posX,
                        top: posY,
                        width: effectiveMarkerSize,
                        height: effectiveMarkerSize,
                        zIndex:
                          isSelected || activeSpeechBalloons.has(marker.id)
                            ? 998500
                            : marker.markerOff
                            ? Math.round(layerOrder * 1000 + 1)
                            : Math.round(layerOrder * 1000 + posY + markerSize * 0.35),
                      }}
                    >
                      {/* Halo de Luz Dinâmica Aprimorado (3 Camadas + Flicker Orgânico) */}
                      {marker.type === 'light' && (() => {
                        const lColor = marker.lightConfig?.color || '#f59e0b';
                        const lRadius = (marker.lightConfig?.radius || 180) * scale;
                        const lIntensity = marker.lightConfig?.intensity ?? 0.85;
                        const useThreeLayer = project.lighting?.threeLayerRender !== false;
                        const flickerMode = project.lighting?.flickerStyle || (marker.lightConfig?.flicker !== false ? 'flame' : 'none');

                        const animClass = flickerMode === 'flame'
                          ? 'animate-flame-flicker'
                          : flickerMode === 'pulse'
                          ? 'animate-pulse'
                          : '';

                        const bloomIntensity = project.lighting?.lightBloom ?? 0.75;

                        return (
                          <div
                            className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none ${animClass}`}
                            style={{
                              width: lRadius * 2,
                              height: lRadius * 2,
                              transformOrigin: '50% 50%',
                              mixBlendMode: 'screen',
                              opacity: lIntensity,
                              background: useThreeLayer
                                ? `radial-gradient(circle at center, #ffffff 0%, #fff7ed 12%, ${lColor} 32%, ${lColor}77 55%, ${lColor}1a 75%, transparent 100%)`
                                : `radial-gradient(circle, ${lColor} 0%, ${lColor}33 45%, transparent 70%)`,
                              filter: `drop-shadow(0 0 ${(16 * bloomIntensity).toFixed(0)}px ${lColor})`,
                            }}
                          />
                        );
                      })()}
                      {/* Sombrinha do asset com ajuste de blur, silhueta realista e offset X e Y */}
                      {(marker.customIconPng || marker.type === 'npc' || marker.type === 'neutral' || marker.type === 'light' || isStation) && (!marker.motionAsset || marker.hasShadow !== false) && (
                        <GroundShadow
                          url={(marker.mediaType === 'video' || marker.videoUrl) ? null : marker.customIconPng}
                          box={effectiveMarkerSize}
                          offsetX={(marker.shadowOffsetX || 0) * scale}
                          offsetY={(marker.shadowOffsetY || 0) * scale}
                          blur={(marker.shadowBlur ?? 3) * scale}
                          opacity={marker.shadowOpacity ?? 0.45}
                          shape={(marker.mediaType === 'video' || marker.videoUrl) ? 'ellipse' : (marker.shadowShape || (marker.motionAsset ? 'silhouette' : 'ellipse'))}
                          rotation={marker.rotation || 0}
                          motionLayers={(marker.mediaType === 'video' || marker.videoUrl) ? undefined : marker.motionLayers}
                          pivotX={marker.pivotX}
                          pivotY={marker.pivotY}
                          isNpcBounce={
                            marker.motionAsset
                              ? marker.npcBounce !== false && (marker.effect === 'jelly' || marker.type === 'npc' || marker.npcBounce === true)
                              : marker.effect !== 'none' && (marker.effect === 'jelly' || (marker.type === 'npc' && marker.npcBounce !== false && (!marker.effect || marker.effect === 'jelly')))
                          }
                        />
                      )}
                      {/* Marcador Pin sem círculo preto em volta (NPC com PNG tem gelatina igual ao herói).
                          Rotação vai no WRAPPER interno para não brigar com a animação gelatina. */}
                      <div
                        data-jelly-container={marker.id}
                        className={`flex items-center justify-center transition-transform ${
                          isSelected && !marker.customIconPng
                            ? 'scale-110 drop-shadow-[0_0_8px_rgba(56,189,248,0.9)]'
                            : 'hover:scale-105'
                        } ${!marker.customIconPng ? 'rounded-full shadow-lg ring-1 ring-white/30' : ''} ${
                          (marker.effect === 'wind' || marker.id.startsWith('terrain-grass-'))
                            ? 'animate-grass-wind'
                            : (!marker.motionAsset && marker.effect !== 'none' && (
                                marker.effect === 'jelly' ||
                                (marker.type === 'npc' && marker.npcBounce !== false && (!marker.effect || marker.effect === 'jelly'))
                              ) && marker.customIconPng)
                                ? (marker.jellyStyle === 'spring' ? 'animate-jelly-spring' :
                                   marker.jellyStyle === 'step_walk' ? 'animate-jelly-step' :
                                   marker.jellyStyle === 'squash_intense' ? 'animate-jelly-squash' :
                                   marker.jellyStyle === 'organic_jitter' ? 'animate-jelly-organic' :
                                   marker.jellyStyle === 'pulse_beat' ? 'animate-jelly-pulse' : 'animate-jelly')
                                : ''
                        }`}
                        style={{
                          transformOrigin: '50% 100%',
                          width: effectiveMarkerSize,
                          height: effectiveMarkerSize,
                          backgroundColor: marker.customIconPng ? 'transparent' : marker.color || '#3b82f6',
                          ['--wind-amp' as any]: marker.effectIntensity ?? 1.0,
                          ['--wind-dur' as any]: `${2.0 / (marker.effectSpeed ?? 1.0)}s`,
                          ['--wind-delay' as any]: `${-Number((((marker.x * 0.018 + marker.y * 0.011) % 3.2)).toFixed(2))}s`,
                          ['--jelly-amp' as any]: marker.effectIntensity ?? marker.jellyIntensity ?? (marker.type === 'npc' ? 0.45 : 0.6),
                          ...((marker.effectSpeed ?? marker.jellySpeed) !== undefined ? { ['--jelly-dur' as any]: `${1.3 / (marker.effectSpeed ?? marker.jellySpeed!)}s` } : {}),
                        }}
                      >
                        <div
                          data-npc-visual={marker.id}
                          style={{
                            width: '100%',
                            height: '100%',
                            transformOrigin: `${(marker.pivotX ?? 0.5) * 100}% ${(marker.pivotY ?? (marker.type === 'npc' ? 1.0 : 0.5)) * 100}%`,
                            transform: `rotate(${marker.rotation || 0}deg) scale(${marker.flipX ? -(marker.scaleX ?? 1) : (marker.scaleX ?? 1)}, ${marker.flipY ? -(marker.scaleY ?? 1) : (marker.scaleY ?? 1)})`,
                          }}
                          className="flex items-center justify-center shrink-0"
                        >
                        {(() => {
                          const activeAtk = npcActiveAttacks.get(marker.id);
                          const atkAsset = activeAtk?.attackAsset;
                          const hasAtkAsset = !!(atkAsset && atkAsset.type !== 'none' && atkAsset.url);
                          const isAttacking = hasAtkAsset && !!activeAtk;

                          // Visual Base do Marcador (Idle / Caminhada)
                          const baseVisualNode = (
                            marker.type === 'interactive_screen' ? (
                              <StationWorldMarker
                                marker={marker}
                                markerSize={effectiveMarkerSize}
                                isSelected={isSelected}
                              />
                            ) : (marker.mediaType === 'video' || marker.videoUrl) ? (
                              <VideoAssetCanvas
                                key={marker.videoUrl || marker.customIconPng || marker.id}
                                videoUrl={marker.videoUrl || marker.customIconPng || ''}
                                chromaKey={marker.videoChromaKey}
                                className="w-full h-full object-contain filter drop-shadow select-none pointer-events-none"
                              />
                            ) : marker.customIconPng ? (
                              <>
                                {(marker.id.startsWith('terrain-grass-') || marker.id.startsWith('terrain-flower-') || (marker.effect === 'wind' && (!marker.motionLayers || marker.motionLayers.length === 0) && (!marker.effectStrokes || marker.effectStrokes.length === 0))) ? (
                                  <img
                                    src={getRenderableAssetUrl(marker.customIconPng)}
                                    alt={marker.name}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain filter drop-shadow-sm select-none pointer-events-none"
                                  />
                                ) : (
                                  <MotionAssetCanvas
                                    src={marker.customIconPng}
                                    alt={marker.name}
                                    effect={marker.effect}
                                    speed={marker.effectSpeed ?? marker.jellySpeed ?? 1.0}
                                    intensity={marker.effectIntensity ?? marker.jellyIntensity ?? 1.0}
                                    strokes={marker.effectStrokes}
                                    motionLayers={marker.motionLayers}
                                    isNpcBounce={
                                      marker.motionAsset
                                        ? marker.npcBounce !== false && (marker.effect === 'jelly' || marker.type === 'npc' || marker.npcBounce === true)
                                        : marker.effect !== 'none' && (marker.effect === 'jelly' || (marker.type === 'npc' && marker.npcBounce !== false && (!marker.effect || marker.effect === 'jelly')))
                                    }
                                    width={Math.round(effectiveMarkerSize)}
                                    height={Math.round(effectiveMarkerSize)}
                                    className="w-full h-full object-contain filter drop-shadow select-none pointer-events-none"
                                  />
                                )}
                                {/* Manta de Neve no Topo do Asset/Prop/NPC com Shatter Físico */}
                                {project.snowConfig?.enabled && project.snowConfig?.accumulateOnAssets !== false && (
                                  <AssetSnowCoat
                                    isSnowActive={isWeatherEffectActive('snow')}
                                    isMoving={false}
                                    boxWidth={markerSize}
                                    boxHeight={markerSize}
                                    aspectRatio={1}
                                    accumulateEnabled={true}
                                  />
                                )}
                              </>
                            ) : (
                              renderIcon(marker.type)
                            )
                          );

                          // Se não houver asset de ataque configurado, renderiza direto o visual base
                          if (!hasAtkAsset || !atkAsset) {
                            return baseVisualNode;
                          }

                          // Visual de Ataque Dedicado com Transição Suave e Zero Latência
                          const atkScale = atkAsset.scale || 1.0;
                          const targetDurationSec = (activeAtk?.durationMs || 750) / 1000;

                          const attackVisualNode = (
                            atkAsset.type === 'video' && atkAsset.url ? (
                              <VideoAssetCanvas
                                key={`atk-vid-${marker.id}-${atkAsset.url}`}
                                videoUrl={atkAsset.url}
                                playTrigger={activeAtk?.startTime}
                                chromaKey={atkAsset.videoChromaKey}
                                targetDurationSec={targetDurationSec}
                                loop={false}
                                paused={!isAttacking}
                                className="w-full h-full object-contain filter drop-shadow select-none pointer-events-none"
                              />
                            ) : atkAsset.type === 'motion' && (atkAsset.url || (atkAsset.motionLayers && atkAsset.motionLayers.length > 0)) ? (
                              <MotionAssetCanvas
                                key={`atk-mot-${marker.id}-${atkAsset.url}`}
                                src={atkAsset.url || ''}
                                motionLayers={atkAsset.motionLayers}
                                isNpcBounce={false}
                                width={Math.round(effectiveMarkerSize * atkScale)}
                                height={Math.round(effectiveMarkerSize * atkScale)}
                                className="w-full h-full object-contain filter drop-shadow select-none pointer-events-none"
                              />
                            ) : atkAsset.url ? (
                              <img
                                key={`atk-img-${marker.id}-${atkAsset.url}`}
                                src={getRenderableAssetUrl(atkAsset.url)}
                                alt={atkAsset.name || 'Ataque'}
                                className="w-full h-full object-contain filter drop-shadow select-none pointer-events-none"
                              />
                            ) : null
                          );

                          return (
                            <div className="relative w-full h-full flex items-center justify-center shrink-0">
                              {/* Camada Base (Idle / Movimento) com Fade Suave */}
                              <div
                                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
                                  isAttacking ? 'opacity-0 pointer-events-none' : 'opacity-100'
                                }`}
                              >
                                {baseVisualNode}
                              </div>

                              {/* Camada de Ataque com Pré-Aquecimento e Fade Suave */}
                              <div
                                className={`absolute inset-0 flex items-center justify-center transition-opacity duration-150 ${
                                  isAttacking ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}
                                style={{ transform: atkScale !== 1.0 ? `scale(${atkScale})` : undefined }}
                              >
                                {attackVisualNode}
                              </div>
                            </div>
                          );
                        })()}
                        </div>

                        {/* Camada Visual de Emoções de Anime do NPC (Ira 💢, Medo 💧, Alerta ❗, Confusão ❓, Alegria ✨💖) */}
                        {marker.type === 'npc' && (marker.actionNpc?.showAnimeEmotes !== false) && (
                          <AnimeEmotionOverlay
                            emotion={npcLiveEmotions.get(marker.id)?.type || marker.emotionState?.type}
                            intensity={npcLiveEmotions.get(marker.id)?.intensity || marker.emotionState?.intensity || 1.0}
                            size={markerSize}
                          />
                        )}

                        {/* Balão de Fala do NPC (até 3 frases personalizáveis) — estilo Game Clean com Bordinha Colorida */}
                        {activeSpeechBalloons.has(marker.id) && (() => {
                          const balloon = activeSpeechBalloons.get(marker.id)!;
                          const bColor =
                            balloon.style === 'panic'
                              ? '#f43f5e'
                              : balloon.style === 'alert'
                              ? '#f59e0b'
                              : marker.color || '#38bdf8';
                          return (
                            <div
                              className="absolute -top-10 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-2xl bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-extrabold pointer-events-none select-none z-[999000] whitespace-nowrap animate-balloon-pop flex items-center gap-1 border-[2.5px]"
                              style={{
                                borderColor: bColor,
                                boxShadow: `0 3px 0 ${bColor}55, 0 6px 12px rgba(15, 23, 42, 0.22)`,
                              }}
                            >
                              {balloon.style === 'panic' && <span>😱</span>}
                              {balloon.style === 'alert' && <span>⚡</span>}
                              <span>{balloon.text}</span>
                              <div
                                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rotate-45 bg-white border-r-[2.5px] border-b-[2.5px]"
                                style={{ borderColor: bColor }}
                              />
                            </div>
                          );
                        })()}

                        {/* Barra de Vida (HP) + Cápsula de Tontura 15s (50% PV) com [⚔️ Batalhar] e [🔍 Escanear] */}
                        {marker.type === 'npc' && marker.actionNpc?.enabled && (() => {
                          const rs = globalNpcActionEngine.getRuntimeState(marker.id);
                          const stunInfo = stunnedNpcsInfo.get(marker.id);
                          const isStunnedNow = Boolean(stunInfo);
                          if (!rs || (!isStunnedNow && (rs.aiState === 'explore' || rs.aiState === 'idle'))) return null;
                          const hpPct = Math.max(0, Math.min(100, (rs.currentHp / rs.maxHp) * 100));
                          return (
                            <>
                              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-1.5 bg-slate-950/90 rounded-full border border-slate-700 overflow-hidden pointer-events-none z-40 shadow-xs">
                                <div
                                  className={`h-full transition-all duration-150 ${
                                    isStunnedNow
                                      ? 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 animate-pulse'
                                      : 'bg-gradient-to-r from-red-600 via-rose-500 to-emerald-400'
                                  }`}
                                  style={{ width: `${hpPct}%` }}
                                />
                              </div>

                              {/* CÁPSULA INTERATIVA DE TONTURA (50% PV por 15 Segundos): [⚔️ Batalhar] e [🔍 Escanear] */}
                              {isStunnedNow && stunInfo && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 z-[999500] pointer-events-auto select-none flex flex-col items-center animate-bounce"
                                  style={{ width: '176px' }}
                                >
                                  <div
                                    className="w-full rounded-2xl p-2 flex flex-col items-center gap-1.5 border-2 shadow-[0_8px_24px_rgba(0,0,0,0.85),0_0_16px_rgba(251,191,36,0.45)] backdrop-blur-md"
                                    style={{
                                      background:
                                        'linear-gradient(180deg, rgba(15, 23, 42, 0.94) 0%, rgba(30, 41, 59, 0.96) 100%)',
                                      borderColor: '#fbbf24',
                                    }}
                                  >
                                    <div className="flex items-center justify-between w-full px-1">
                                      <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                                        <span>💫 TONTURA (50% PV)</span>
                                      </span>
                                      <span className="px-1.5 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/60 text-[8.5px] font-mono font-black text-amber-200">
                                        ⏱️ {stunInfo.remainingSec}s
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-1.5 w-full">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActionFeedback(
                                            `⚔️ Iniciando Batalha contra ${marker.name}! (Pronto p/ conectar à Engine de Batalha)`
                                          );
                                          setTimeout(() => setActionFeedback(null), 3200);
                                        }}
                                        className="py-1.5 px-2 rounded-xl bg-gradient-to-b from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white font-black text-[9.5px] border border-rose-300/70 shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                      >
                                        <span>⚔️</span>
                                        <span>Batalhar</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleScanStunnedMobToDeck(marker);
                                        }}
                                        className="py-1.5 px-2 rounded-xl bg-gradient-to-b from-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-[9.5px] border border-cyan-200 shadow-sm active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                                      >
                                        <span>🔍</span>
                                        <span>Escanear</span>
                                      </button>
                                    </div>
                                  </div>
                                  <div
                                    className="w-2.5 h-2.5 rotate-45 -mt-1.5 border-r-2 border-b-2"
                                    style={{
                                      backgroundColor: '#1e293b',
                                      borderColor: '#fbbf24',
                                    }}
                                  />
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>


                      {/* Balão de Fala / Info Game Clean com Bordinha Colorida — NUNCA para assets PNG de cenário nem recortes Motion Pen.
                          Sempre em camada máxima (z-[999000]) para jamais aparecer atrás de mobs/NPCs. */}
                      {isSelected && !(marker.customIconPng && marker.type !== 'npc' && !marker.dialogueEnabled) && !marker.motionAsset && !activeDialogueMarker && !activeStationMarker && marker.clickBehavior !== 'dialogue_only' && !(marker.type === 'travel' && marker.travelAuto !== false) && !(marker.type === 'event' && (marker.eventKind || 'popup') !== 'popup') && (() => {
                        const balloonBorderColor =
                          marker.color ||
                          (marker.type === 'collectible'
                            ? '#f59e0b'
                            : marker.type === 'deliverable'
                            ? '#10b981'
                            : marker.type === 'travel'
                            ? '#8b5cf6'
                            : marker.type === 'event'
                            ? '#f43f5e'
                            : marker.type === 'npc'
                            ? '#38bdf8'
                            : '#f59e0b');

                        const resourceEmoji =
                          marker.questResource?.iconEmoji ||
                          (marker.questResourceType === 'wood'
                            ? '🪵'
                            : marker.questResourceType === 'stone'
                            ? '🪨'
                            : marker.questResourceType === 'coal'
                            ? '🪙'
                            : marker.questResourceType === 'flower'
                            ? '🌸'
                            : marker.questResourceType === 'slime_water'
                            ? '🧪'
                            : marker.questResourceType === 'gold'
                            ? '💰'
                            : '📦');

                        const filledRewards = (marker.rewardSlots || []).filter(Boolean) as string[];

                        return (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute ${
                              isAbove ? 'bottom-full mb-2 animate-balloon-up' : 'top-full mt-2 animate-balloon-down'
                            } flex flex-col items-center pointer-events-auto z-[999000]`}
                            style={{
                              left: balloonOffsetLeft,
                              width: BALLOON_W_LAYOUT,
                            }}
                          >
                            {/* Pontinha / Rabicho do balão de fala com a mesma bordinha colorida */}
                            {!isAbove ? (
                              <div
                                className="absolute -top-1.5 w-3 h-3 bg-white border-l-[2.5px] border-t-[2.5px] rotate-45 z-20 pointer-events-none rounded-tl-[2px]"
                                style={{
                                  left: notchLeft - 6,
                                  borderColor: balloonBorderColor,
                                }}
                              />
                            ) : (
                              <div
                                className="absolute -bottom-1.5 w-3 h-3 bg-white border-r-[2.5px] border-b-[2.5px] rotate-45 z-20 pointer-events-none rounded-br-[2px]"
                                style={{
                                  left: notchLeft - 6,
                                  borderColor: balloonBorderColor,
                                }}
                              />
                            )}

                            {marker.type === 'npc' && (marker.popupStyle || 'compact') === 'compact' ? (
                              <div className="w-full relative z-10">
                                <NpcCapsule
                                  marker={marker}
                                  playerInventory={playerInventory}
                                  getProg={getProg}
                                  questReady={questReady}
                                  questText={questText}
                                  acceptQuest={acceptQuest}
                                  completeQuest={completeQuest}
                                  onFalar={() => {
                                    setInspectedMarker(null);
                                    creditTalk(marker.id);
                                    setActiveDialogueMarker(marker);
                                    setCurrentStepIndex(0);
                                    setDialogueCustomFeedback(null);
                                  }}
                                  onTriggerEvent={
                                    marker.events && marker.events.length > 0
                                      ? () => {
                                          setInspectedMarker(null);
                                          triggerEvent(marker);
                                        }
                                      : undefined
                                  }
                                  onClose={() => {
                                    setInspectedMarker(null);
                                    onSelectMarker(null);
                                  }}
                                />
                              </div>
                            ) : (
                              <div
                                className="w-full relative z-10 rounded-2xl bg-white/95 backdrop-blur-xs border-[2.5px] px-2.5 py-2 text-left space-y-1.5"
                                style={{
                                  borderColor: balloonBorderColor,
                                  boxShadow: `0 3px 0 ${balloonBorderColor}66, 0 8px 18px -4px rgba(15, 23, 42, 0.28)`,
                                }}
                              >
                                {/* Mini Banner opcional dentro do próprio balão */}
                                {marker.bannerImagePng && (
                                  <div
                                    className="w-full h-16 rounded-xl overflow-hidden border bg-slate-50 mb-1"
                                    style={{ borderColor: `${balloonBorderColor}66` }}
                                  >
                                    <img
                                      src={marker.bannerImagePng}
                                      alt={marker.name}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}

                                {/* Cabeçalho compacto do balão */}
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <span
                                      className="w-4 h-4 rounded-md flex items-center justify-center text-[10px] shrink-0 font-bold"
                                      style={{
                                        backgroundColor: `${balloonBorderColor}22`,
                                        color: balloonBorderColor,
                                      }}
                                    >
                                      {marker.type === 'travel'
                                        ? '🌌'
                                        : marker.type === 'event'
                                        ? '⚡'
                                        : marker.type === 'deliverable'
                                        ? '🚩'
                                        : marker.type === 'collectible'
                                        ? resourceEmoji
                                        : '💬'}
                                    </span>
                                    <h4 className="text-[10.5px] font-black text-slate-800 tracking-tight truncate leading-tight">
                                      {marker.name}
                                    </h4>
                                  </div>

                                  {marker.type === 'collectible' && (
                                    <span
                                      className="text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0"
                                      style={{
                                        backgroundColor: `${balloonBorderColor}22`,
                                        color: balloonBorderColor,
                                      }}
                                    >
                                      +{marker.questRequiredAmount || 5}
                                    </span>
                                  )}

                                  <button
                                    onClick={() => {
                                      setInspectedMarker(null);
                                      eventFreezeUntilRef.current = 0;
                                      onSelectMarker(null);
                                    }}
                                    className="w-4 h-4 rounded-full bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-500 flex items-center justify-center shrink-0 transition-colors"
                                    title="Fechar"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </div>

                                {/* Texto curto e limpo estilo balão de fala */}
                                <p className="text-[9.5px] font-semibold text-slate-600 leading-snug break-words line-clamp-2">
                                  {marker.description && marker.description.trim()
                                    ? marker.description
                                    : marker.type === 'travel'
                                    ? marker.travelTargetType === 'sub_biome'
                                      ? `Sub-Bioma: ${project.subBiomes?.find((s) => s.id === marker.targetSubBiomeId)?.name || 'Instância'}`
                                      : `Teleporte: ${project.markers.find((m) => m.id === marker.targetTravelMarkerId)?.name || 'Portal'}`
                                    : marker.type === 'collectible'
                                    ? marker.questResource?.name || 'Recurso coletável'
                                    : marker.type === 'deliverable'
                                    ? 'Ponto de entrega de missão'
                                    : 'Ponto de interesse na rota.'}
                                </p>

                                {/* Botões de ação compactos com visual Game */}
                                {marker.type === 'event' && marker.eventKind === 'duel' && (
                                  <button
                                    onClick={() => {
                                      creditDuel(marker.id);
                                      setInspectedMarker(null);
                                      onSelectMarker(null);
                                    }}
                                    className="w-full py-1 px-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-500 text-white font-black text-[9.5px] flex items-center justify-center gap-1 shadow-[0_2px_0_#9f1239] active:translate-y-0.5 transition-all"
                                  >
                                    <span>⚔️ Desafiar</span>
                                  </button>
                                )}

                                {marker.type === 'travel' && (
                                  <button
                                    onClick={() =>
                                      marker.travelTargetType === 'sub_biome'
                                        ? handleTravelToSubBiome(marker)
                                        : handleFastTravel(marker)
                                    }
                                    className="w-full py-1 px-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-black text-[9.5px] flex items-center justify-center gap-1 shadow-[0_2px_0_#4338ca] active:translate-y-0.5 transition-all"
                                  >
                                    <span>{marker.travelTargetType === 'sub_biome' ? '🏰 Entrar' : '⚡ Teleportar'}</span>
                                  </button>
                                )}

                                {marker.type === 'collectible' && (
                                  <button
                                    onClick={() => handleCollectItem(marker)}
                                    className="w-full py-1 px-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 text-slate-950 font-black text-[9.5px] flex items-center justify-center gap-1 shadow-[0_2px_0_#b45309] active:translate-y-0.5 transition-all"
                                  >
                                    <span>
                                      {resourceEmoji} Coletar (+{marker.questRequiredAmount || 5})
                                    </span>
                                  </button>
                                )}

                                {marker.type === 'treasure' && (
                                  <button
                                    onClick={() => handleOpenTreasureChest(marker)}
                                    className="w-full py-1 px-2 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 font-black text-[9.5px] flex items-center justify-center gap-1 shadow-[0_2px_0_#b45309] active:translate-y-0.5 transition-all"
                                  >
                                    <span>🎁 Abrir Baú</span>
                                  </button>
                                )}

                                {marker.type === 'deliverable' && (
                                  <button
                                    onClick={() => handleDeliverItem(marker)}
                                    className="w-full py-1 px-2 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-500 text-slate-950 font-black text-[9.5px] flex items-center justify-center gap-1 shadow-[0_2px_0_#047857] active:translate-y-0.5 transition-all"
                                  >
                                    <span>🚩 Entregar</span>
                                  </button>
                                )}

                                {/* Mini linha de recompensas (apenas se houver itens configurados) */}
                                {filledRewards.length > 0 && (
                                  <div className="pt-1 border-t border-slate-100 flex items-center gap-1 flex-wrap">
                                    <span className="text-[8.5px] font-extrabold text-amber-600 uppercase">🎁</span>
                                    {filledRewards.map((rewardItem, slotIdx) => (
                                      <div
                                        key={slotIdx}
                                        className="w-5 h-5 rounded-full flex items-center justify-center border border-amber-400 bg-amber-50 shadow-2xs"
                                      >
                                        {rewardItem.startsWith('data:') || rewardItem.startsWith('http') ? (
                                          <img
                                            src={rewardItem}
                                            alt=""
                                            className="w-3.5 h-3.5 object-contain rounded-full"
                                          />
                                        ) : (
                                          <span className="text-[10px] leading-none select-none">{rewardItem}</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
              );
              });
            })()}

              {/* Camada 2D de Combate do Action NPC: Projéteis em Voo e Efeitos de Impacto */}
              <ActionNpcCombatOverlay
                vfxList={combatVfx}
                projectiles={combatProjectiles}
                speechBalloons={activeSpeechBalloons}
                scale={scale}
                originOffsetX={0}
              />

              {/* Projéteis Mágicos Disparados pelo Pet Companheiro (Voador / Distância) */}
              {petProjectilesState.map((proj) => (
                <div
                  key={proj.id}
                  className="absolute top-0 left-0 pointer-events-none z-[9960] flex items-center justify-center"
                  style={{
                    transform: `translate3d(${proj.x * scale}px, ${proj.y * scale}px, 0) translate(-50%, -50%)`,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-sm animate-pulse"
                    style={{
                      background: `radial-gradient(circle, ${proj.color}99 0%, transparent 70%)`,
                      filter: `drop-shadow(0 0 8px ${proj.color})`,
                    }}
                  >
                    {proj.emoji}
                  </div>
                </div>
              ))}

              {/* Pet Companheiro Fiel do Jogador (Refaz Trajeto, Passeia Curioso, Cresce c/ Nível e Ataca até 50% PV) */}
              {(() => {
                const resolvedPet = getResolvedPlayerPetConfig(project.player);
                if (!resolvedPet.enabled) return null;
                const player = project.player || { id: 'p1', name: 'Herói', x: 384, y: 100 };
                const initX = (petRuntimeRef.current.initialized ? petRuntimeRef.current.x : player.x - 28) * scale;
                const initY = (petRuntimeRef.current.initialized ? petRuntimeRef.current.y : player.y + 18) * scale;
                const petBoxSize = Math.max(
                  20,
                  Math.round(42 * scale * biomeScaleAt(player.x, player.y) * resolvedPet.scale)
                );
                const hpPct = Math.max(0, Math.min(100, (resolvedPet.hp / Math.max(1, resolvedPet.maxHp)) * 100));

                return (
                  <div
                    ref={petDomRef}
                    className="absolute top-0 left-0 pointer-events-none select-none"
                    style={{
                      transform: `translate3d(${initX}px, ${initY}px, 0) translate(-50%, -100%)`,
                      willChange: 'transform',
                      zIndex: Math.round(initY) + 1,
                      transformOrigin: '50% 100%',
                      opacity: isPlayerHiddenBySpawn ? 0 : 1,
                    }}
                  >
                    <GroundShadow url={resolvedPet.avatarPng} box={petBoxSize * 0.85} />
                    <div className="relative flex flex-col items-center">
                      {/* Balãozinho Emote de Curiosidade / Combate / Level Up do Pet */}
                      <div
                        data-pet-emote="1"
                        className="px-1.5 py-0.5 rounded-full bg-slate-950/90 border border-amber-400/80 text-[8.5px] font-black text-amber-200 shadow-md mb-0.5 whitespace-nowrap transition-opacity duration-200"
                        style={{ opacity: 0 }}
                      />

                      {/* Badge Compacta: Nome + Nível + Mini Barra de PV do Pet */}
                      <div className="px-1.5 py-0.5 rounded-md bg-slate-950/85 border border-amber-400/60 flex flex-col items-center gap-0.5 mb-0.5 shadow-sm">
                        <div className="flex items-center gap-1 whitespace-nowrap">
                          <span className="text-[7.5px] font-black text-amber-300">
                            Nv.{resolvedPet.level}
                          </span>
                          <span className="text-[8px] font-bold text-white">
                            {resolvedPet.name}
                          </span>
                        </div>
                        <div className="w-10 h-1 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300"
                            style={{ width: `${hpPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Corpo Visual do Pet (PNG ou Ícone/Slime com animação e crescimento por nível) */}
                      <div
                        data-pet-sprite="1"
                        className="flex items-center justify-center transition-transform duration-75"
                        style={{
                          width: petBoxSize,
                          height: petBoxSize,
                        }}
                      >
                        {resolvedPet.avatarPng ? (
                          <img
                            src={resolvedPet.avatarPng}
                            alt={resolvedPet.name}
                            className="w-full h-full object-contain filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]"
                          />
                        ) : (
                          <div
                            className="w-full h-full rounded-full border-2 flex items-center justify-center shadow-[0_0_12px_rgba(245,158,11,0.6)] bg-slate-900/90"
                            style={{
                              borderColor: resolvedPet.color || '#f59e0b',
                            }}
                          >
                            <span style={{ fontSize: `${Math.max(14, Math.round(petBoxSize * 0.56))}px` }}>
                              {resolvedPet.iconEmoji || '🐾'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Player Character Marker */}
              {(() => {
                const player = project.player || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6' };
                const posX = player.x * scale;
                const posY = player.y * scale;
                const baseSize = 48 * scale * biomeScaleAt(player.x, player.y);
                const isBounce = player.autoBounce !== false;
                const isMoving = isJoystickActive;
                const styleKey = player.jellyStyle || 'classic';
                const speedMult = player.jellySpeed ?? 1.0;
                const intensityMult = isMoving
                  ? (player.jellyIntensity ?? 1.0)
                  : (player.jellyIdleIntensity ?? 0.35);

                const animClass = (() => {
                  if (!isBounce || intensityMult <= 0) return '';
                  switch (styleKey) {
                    case 'spring':
                      return isMoving ? 'animate-jelly-spring-moving' : 'animate-jelly-spring';
                    case 'step_walk':
                      return isMoving ? 'animate-jelly-step-moving' : 'animate-jelly-step';
                    case 'squash_intense':
                      return isMoving ? 'animate-jelly-squash-moving' : 'animate-jelly-squash';
                    case 'organic_jitter':
                      return isMoving ? 'animate-jelly-organic-moving' : 'animate-jelly-organic';
                    case 'pulse_beat':
                      return isMoving ? 'animate-jelly-pulse-moving' : 'animate-jelly-pulse';
                    case 'classic':
                    default:
                      return isMoving ? 'animate-jelly-moving' : 'animate-jelly';
                  }
                })();

                const baseDur = styleKey === 'pulse_beat' ? (isMoving ? 0.42 : 0.75) : (isMoving ? 0.65 : 1.3);
                const effectiveDuration = `${(baseDur / Math.max(0.2, speedMult)).toFixed(2)}s`;

                return (
                  <div
                    ref={playerDomRef}
                    className="absolute top-0 left-0 pointer-events-none"
                    style={{
                      transform: `translate3d(${posX}px, ${posY}px, 0) translate(-50%, -100%)`,
                      willChange: 'transform',
                      zIndex: Math.round(posY),
                      transformOrigin: '50% 100%',
                      opacity: isPlayerHiddenBySpawn ? 0 : 1,
                      visibility: isPlayerHiddenBySpawn ? 'hidden' : 'visible',
                      transition: isPlayerHiddenBySpawn ? 'none' : 'opacity 0.25s ease',
                    }}
                  >
                    {/* Luz da Lanterna no Modo Noite: Centralizada no Volume da Arte do Player */}
                    {getActiveBiomeEvent() === 'night' && (
                      <div 
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none -z-10"
                        style={{
                          background: 'radial-gradient(circle, rgba(254, 240, 138, 0.45) 0%, rgba(251, 191, 36, 0.22) 30%, rgba(245, 158, 11, 0.08) 55%, transparent 75%)',
                          filter: 'blur(12px)',
                        }}
                      />
                    )}
                    <GroundShadow url={pickAvatarPng(player, playerDirection)} box={baseSize} />
                    <div
                      className={`relative flex flex-col items-center ${animClass}`}
                      style={{
                        transformOrigin: '50% 100%',
                        animationDuration: isBounce && intensityMult > 0 ? effectiveDuration : undefined,
                        ['--jelly-dur' as any]: effectiveDuration,
                        ['--jelly-amp' as any]: intensityMult,
                      }}
                    >
                      {/* Sinais Visuais de Anime do Jogador em Idle (💤 sono, 💧 suor, 💬 ..., ✨ brilho) */}
                      <AnimeEmotionOverlay
                        isPlayerIdle={!isJoystickActive}
                        playerIdleType={playerIdleEmote?.type}
                        size={baseSize}
                      />

                      {/* Indicador de Nome: false explícito SEMPRE oculta; undefined mostra só sem PNG (qualquer um vale) */}
                      {(player.showNameTag === true ||
                        (player.showNameTag !== false &&
                          !(
                            player.avatarPng ||
                            player.avatarDownPng ||
                            player.avatarUpPng ||
                            player.avatarLeftPng ||
                            player.avatarRightPng
                          ))) && (
                        <div className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-blue-400 text-[9px] font-bold text-blue-300 shadow-md mb-0.5 whitespace-nowrap">
                          {player.name || 'Herói'}
                        </div>
                      )}

                      {/* Manta de Neve com Shatter Físico em Cacos e Gravidade no Herói */}
                      {project.snowConfig?.enabled && (
                        <AssetSnowCoat
                          isSnowActive={isWeatherEffectActive('snow')}
                          isMoving={isJoystickActive}
                          boxWidth={baseSize}
                          boxHeight={baseSize}
                          aspectRatio={1}
                          accumulateEnabled={project.snowConfig?.accumulateOnPlayer !== false}
                        />
                      )}

                      {/* Renderização Limpa do PNG Direcional ou Padrão */}
                      {(() => {
                        const activePng = pickAvatarPng(player, playerDirection);

                        return activePng ? (
                          <MotionAssetCanvas
                            src={activePng}
                            alt={player.name}
                            motionLayers={player.motionLayers}
                            isNpcBounce={false}
                            width={Math.round(baseSize)}
                            height={Math.round(baseSize)}
                            data-avatar="1"
                            className="object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] select-none"
                            style={{
                              width: baseSize,
                              height: baseSize,
                            }}
                          />
                        ) : (
                          <div
                            data-avatar="1"
                            className="rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_12px_rgba(59,130,246,0.8)] overflow-hidden bg-slate-900"
                            style={{
                              width: baseSize,
                              height: baseSize,
                              backgroundColor: player.color || '#3b82f6',
                            }}
                          >
                            <span className="text-sm">🛡️</span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}

              {/* Camada Aérea Inteligente: Folhas Voando Alto no Céu — ACIMA DO PLAYER (z-[9940]) */}
              <LeavesAirLayer
                leavesConfig={project.leavesConfig}
                isLeavesActive={isWeatherEffectActive('leaves')}
                scale={scale}
                totalMapWidth={totalMapWidth}
                totalMapHeight={totalMapHeight}
              />

              {/* Correntes de Vento Volumétricas no Mapa do Mundo (z-[9930]) */}
              {isWeatherEffectActive('wind') && (
                <VolumetricWorldWind
                  windConfig={project.windConfig}
                  scale={scale}
                  totalMapWidth={totalMapWidth}
                  totalMapHeight={totalMapHeight}
                />
              )}

              {/* Módulo de Neve Volumétrica & Nevasca com Micro-Brilho Cromático (z-[9935]) */}
              {isWeatherEffectActive('snow') && (
                <SnowWorldLayer
                  snowConfig={project.snowConfig}
                  playerRef={playerRef}
                  scale={scale}
                  totalMapWidth={totalMapWidth}
                  totalMapHeight={totalMapHeight}
                />
              )}

              {/* Insetos Voadores Top-Down: Física Orgânica 60fps, Asas Dobráveis e Pouso Real no Herói (z-[9945]) */}
              {isWeatherEffectActive('bugs') && (
                <LivingBugsLayer
                  bugsConfig={project.bugsConfig}
                  playerRef={playerRef}
                  scale={scale}
                  totalMapWidth={totalMapWidth}
                  totalMapHeight={totalMapHeight}
                />
              )}

              {/* Filtros Atmosféricos Combináveis Simultaneamente com Transição Suave */}
              <div className="absolute inset-0 pointer-events-none z-25 transition-all duration-1000 ease-in-out">
                {/* Filtro Noturno Suave */}
                <div 
                  className={`absolute inset-0 bg-slate-950/40 pointer-events-none transition-opacity duration-1000 ${isWeatherEffectActive('night') ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Filtro Alvorecer / Amanhecer Dourado */}
                <div 
                  ref={dawnLayerRef}
                  className={`absolute inset-0 bg-gradient-to-t from-amber-600/20 via-orange-500/15 to-rose-500/10 mix-blend-screen transition-all duration-700 ease-in-out ${isWeatherEffectActive('dawn') ? 'opacity-100' : 'opacity-0'}`}
                />

                {/* Filtro Folhas Temático: Tonalidade Dinâmica por Preset */}
                <div 
                  className={`absolute inset-0 transition-all duration-700 ease-in-out ${isWeatherEffectActive('leaves') ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    background: project.leavesConfig?.preset === 'spring'
                      ? 'linear-gradient(to top, rgba(244, 114, 182, 0.12), rgba(251, 113, 133, 0.08), transparent)'
                      : project.leavesConfig?.preset === 'jungle'
                      ? 'linear-gradient(to top, rgba(16, 185, 129, 0.12), rgba(132, 204, 22, 0.08), transparent)'
                      : project.leavesConfig?.preset === 'dry'
                      ? 'linear-gradient(to top, rgba(120, 53, 15, 0.14), rgba(146, 64, 14, 0.08), transparent)'
                      : 'linear-gradient(to top, rgba(180, 83, 9, 0.15), rgba(234, 88, 12, 0.1), transparent)',
                    mixBlendMode: 'screen',
                  }}
                />
              </div>

              {/* Camada Superior: Nuvens Altas no Céu — ACIMA do Player e com Desvanecer Suave no Centro da Tela */}
              <SkyCloudsLayer
                cloudsConfig={project.clouds}
                scale={scale}
                totalMapWidth={totalMapWidth}
                totalMapHeight={totalMapHeight}
                cloudsLayerRef={cloudsLayerRef}
              />
            </div>
          </div>
        )}


        </div>


        {/* Barras deslizantes empilhadas no canto esquerdo (estilo fiel à imagem de referência) são renderizadas na camada de HUD abaixo */}

        {/* =========================================================================
            MODO SUB-BIOMA / INSTÂNCIA INTERNA (RPG DE EXPLORAÇÃO)
           ========================================================================= */}
        {activeSubBiome && (
          <div className="absolute inset-3 rounded-[34px] z-50 overflow-hidden bg-slate-950 flex flex-col justify-between pointer-events-auto select-none border-2 border-purple-500/80 shadow-2xl">
            {/* Background Image do Sub-Bioma */}
            <div className="absolute inset-0 z-0 opacity-60">
              <img
                src={activeSubBiome.tilePng}
                alt={activeSubBiome.name}
                className="w-full h-full object-cover filter brightness-90"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/80" />
            </div>

            {/* Header com Titulo e Botão de Sair */}
            <div className="relative z-10 p-4 pt-6 flex items-center justify-between">
              <div className="flex items-center gap-2 p-1.5 px-3 rounded-2xl bg-slate-950/80 border border-purple-400/60 backdrop-blur-md">
                <span className="text-base">🏰</span>
                <div>
                  <h3 className="text-xs font-black text-purple-200 tracking-tight">
                    {activeSubBiome.name}
                  </h3>
                  <span className="text-[9px] text-purple-300/80 font-mono block">
                    Sub-Bioma Interno
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveSubBiome(null)}
                className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-900 border border-purple-400/60 text-purple-300 font-bold text-xs flex items-center gap-1 backdrop-blur-md shadow-lg transition-transform active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Voltar ao Mapa</span>
              </button>
            </div>

            {/* Personagem do Jogador no centro com Gelatina */}
            <div className="relative z-10 flex-1 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                {(
                  project.player?.avatarPng ||
                  project.player?.avatarDownPng ||
                  project.player?.avatarUpPng ||
                  project.player?.avatarLeftPng ||
                  project.player?.avatarRightPng
                ) ? (
                  <img
                    src={
                      project.player?.avatarPng ||
                      project.player?.avatarDownPng ||
                      project.player?.avatarUpPng ||
                      project.player?.avatarLeftPng ||
                      project.player?.avatarRightPng
                    }
                    alt={project.player.name || 'Jogador'}
                    className="w-16 h-16 object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.8)] animate-gelatin-move"
                    style={{ transformOrigin: '50% 100%' }}
                  />
                ) : (
                  <div
                    className="w-12 h-12 rounded-full border-2 border-white flex items-center justify-center shadow-xl animate-gelatin-move"
                    style={{ backgroundColor: project.player?.color || '#3b82f6', transformOrigin: '50% 100%' }}
                  >
                    <span className="text-lg">🛡️</span>
                  </div>
                )}
              </div>

              <div className="p-2 px-4 rounded-full bg-purple-950/90 border border-purple-400/50 text-purple-100 font-bold text-xs shadow-xl backdrop-blur-md">
                Explorando {activeSubBiome.name}...
              </div>
            </div>

            {/* Footer de Ações do Sub-Bioma */}
            <div className="relative z-10 p-4 pb-6 flex items-center justify-center gap-2">
              <button
                onClick={() => {
                  setActionFeedback(`✨ Área explorada! Sub-Bioma limpo.`);
                  setTimeout(() => setActionFeedback(null), 3000);
                }}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-black text-xs shadow-lg active:scale-95 transition-all"
              >
                <span>🔍 Explorar Sub-Bioma</span>
              </button>
              <button
                onClick={() => setActiveSubBiome(null)}
                className="py-2 px-4 rounded-xl bg-slate-900/90 border border-slate-700 text-slate-200 font-bold text-xs shadow-lg active:scale-95 transition-all"
              >
                <span>🚪 Sair</span>
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            MODO DIÁLOGO & INTERAÇÃO (RPG / VISUAL NOVEL PADRÃO JOGOS)
            - PNG centralizado preenchendo a tela
            - Degradê suave sobrepondo na parte inferior
            - Caixa de texto rica
            - Opções de múltipla escolha padrão de jogos
           ========================================================================= */}
        {activeDialogueMarker && (
          <div
            className={`absolute inset-3 rounded-[34px] z-50 overflow-hidden bg-slate-950/65 backdrop-blur-xs flex ${
              isLandscape ? 'flex-row items-center justify-end' : 'flex-col justify-end'
            } select-none pointer-events-auto border-[3px] border-[#5c2c16]/80 shadow-2xl`}
          >
            {/* DEGRADÊ TEMÁTICO DINÂMICO (VERTICAL NO RETRATO / LATERAL+PALCO NO PAISAGEM) */}
            <div
              className={`absolute pointer-events-none z-0 transition-all duration-500 ${
                isLandscape ? 'inset-0' : 'left-0 right-0 bottom-0 h-[64%]'
              }`}
              style={{
                background: isLandscape
                  ? `linear-gradient(100deg, rgba(0,0,0,0.25) 0%, ${dialogueTheme.gradientVia} 42%, ${dialogueTheme.gradientTo} 85%, ${dialogueTheme.gradientTo} 100%)`
                  : `linear-gradient(to bottom, transparent 0%, ${dialogueTheme.gradientVia} 26%, ${dialogueTheme.gradientTo} 60%, ${dialogueTheme.gradientTo} 100%)`,
              }}
            />

            {/* AURA DE BRILHO RADIANTE ATRÁS DA PNG */}
            <div
              className={`absolute ${
                isLandscape ? 'left-2 top-4 bottom-4 w-[44%]' : 'inset-x-0 top-14 bottom-30'
              } flex items-center justify-center pointer-events-none z-5`}
            >
              <div
                className={`${
                  isLandscape ? 'w-60 h-60' : 'w-72 h-72'
                } rounded-full blur-3xl opacity-70 transition-all duration-700 animate-pulse pointer-events-none`}
                style={{
                  background: `radial-gradient(circle, ${dialogueTheme.primary} 0%, transparent 70%)`,
                }}
              />
            </div>

            {/* PNG DO PERSONAGEM (NO RETRATO: TOPO/CENTRO | NO PAISAGEM: PALCO DEDICADO À ESQUERDA SEM SOBREPOSIÇÃO) */}
            <div
              className={`absolute ${
                isLandscape ? 'left-1 top-2 bottom-2 w-[45%]' : 'inset-x-0 top-14 bottom-30'
              } flex items-center justify-center pointer-events-none overflow-hidden z-10 animate-dialogue-entrance`}
            >
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-150 origin-bottom"
                style={{
                  transform: `translateY(${(liveDialogueMarker?.dialogueCharacterOffsetY ?? 0) + (isLandscape ? 4 : 12)}px) scale(${liveDialogueMarker?.dialogueCharacterScale ?? 1})`,
                }}
              >
                {/* Se o NPC for um Motion Asset com camadas animadas e não houver um retrato estático diferente */}
                {liveDialogueMarker?.motionLayers &&
                liveDialogueMarker.motionLayers.length > 0 &&
                (!liveDialogueMarker?.dialogueCharacterPng ||
                  liveDialogueMarker.dialogueCharacterPng === liveDialogueMarker.customIconPng) &&
                (!currentStep?.characterPng ||
                  currentStep.characterPng === liveDialogueMarker.customIconPng) ? (
                  <div
                    key={`motion-dialogue-${liveDialogueMarker.id}-${currentStepIndex}`}
                    className={`${
                      isLandscape ? 'w-56 h-56 sm:w-64 sm:h-64' : 'w-72 h-72 sm:w-80 sm:h-80'
                    } flex items-center justify-center filter drop-shadow-[0_18px_35px_rgba(0,0,0,0.7)] select-none origin-bottom ${
                      currentStepIndex > 0 ? 'animate-jelly-reaction' : 'animate-jelly'
                    }`}
                  >
                    <MotionAssetCanvas
                      src={liveDialogueMarker.customIconPng || ''}
                      alt={currentSpeaker}
                      effect={liveDialogueMarker.effect}
                      speed={liveDialogueMarker.effectSpeed ?? liveDialogueMarker.jellySpeed ?? 1.0}
                      intensity={liveDialogueMarker.effectIntensity ?? liveDialogueMarker.jellyIntensity ?? 1.0}
                      strokes={liveDialogueMarker.effectStrokes}
                      motionLayers={liveDialogueMarker.motionLayers}
                      isNpcBounce={true}
                      width={320}
                      height={320}
                      className="w-full h-full object-contain pointer-events-none"
                    />
                  </div>
                ) : currentCharacterPng ? (
                  <img
                    key={`jelly-step-${currentStepIndex}`}
                    src={currentCharacterPng}
                    alt={currentSpeaker}
                    className={`max-h-full ${
                      isLandscape ? 'max-w-[92%]' : 'max-w-[85%]'
                    } object-contain filter drop-shadow-[0_18px_35px_rgba(0,0,0,0.7)] select-none origin-bottom ${
                      currentStepIndex > 0 ? 'animate-jelly-reaction' : 'animate-jelly'
                    }`}
                  />
                ) : liveDialogueMarker?.customIconPng ? (
                  <img
                    key={`jelly-icon-${currentStepIndex}`}
                    src={liveDialogueMarker.customIconPng}
                    alt={liveDialogueMarker.name}
                    className={`max-h-full ${
                      isLandscape ? 'max-w-[90%]' : 'max-w-[80%]'
                    } object-contain filter drop-shadow-[0_18px_35px_rgba(0,0,0,0.7)] select-none origin-bottom ${
                      currentStepIndex > 0 ? 'animate-jelly-reaction' : 'animate-jelly'
                    }`}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center p-6 opacity-85 animate-dialogue-entrance">
                    <div
                      className={`${
                        isLandscape ? 'w-24 h-24 text-4xl' : 'w-28 h-28 text-5xl'
                      } rounded-full flex items-center justify-center shadow-2xl border-4 border-amber-400/80`}
                      style={{ backgroundColor: liveDialogueMarker?.color || '#3b82f6' }}
                    >
                      👑
                    </div>
                    <span className="text-amber-200 text-xs font-black mt-2.5 drop-shadow">
                      {liveDialogueMarker?.name || 'NPC'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Botão 3D de Fechar / Sair no canto superior direito */}
            <div className="absolute top-3.5 right-3.5 z-30">
              <button
                onClick={() => {
                  setActiveDialogueMarker(null);
                  setInspectedMarker(null);
                  eventFreezeUntilRef.current = 0;
                  onCloseDialogue?.();
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-b from-[#ff5252] to-[#dc2626] hover:brightness-110 border-[3px] border-white text-white flex items-center justify-center shadow-[0_4px_0_#991b1b,0_6px_12px_rgba(0,0,0,0.5)] transition-transform active:translate-y-0.5 cursor-pointer"
                title="Fechar diálogo"
              >
                <X className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* CONTEÚDO DO DIÁLOGO:
                - RETRATO (!isLandscape): Na base da tela (pb-26)
                - PAISAGEM (isLandscape): Painel dedicado nos 57% à direita, centralizado verticalmente e sem cobrir o NPC! */}
            <div
              className={`relative z-20 ${
                isLandscape
                  ? 'w-[57%] ml-auto pr-4 pl-1 py-3 flex flex-col justify-center space-y-2.5'
                  : 'w-full space-y-2 pb-26 pt-1'
              }`}
            >
              {/* Pílula do Nome ("Nome") — Centralizada no Retrato / Alinhada à Esquerda com Destaque 3D no Paisagem */}
              <div className={`flex ${isLandscape ? 'justify-start pl-4' : 'justify-center'} -mb-3.5 relative z-30`}>
                <div
                  className="px-7 py-1.5 rounded-full border-[3px] shadow-[0_4px_0_rgba(0,0,0,0.35),0_6px_12px_rgba(0,0,0,0.4)] flex items-center justify-center min-w-[148px] transition-colors duration-500"
                  style={{
                    backgroundColor: dialogueTheme.nameBg,
                    borderColor: '#ffffff',
                  }}
                >
                  <span className="text-[14px] sm:text-[15px] font-black text-white tracking-wide drop-shadow-[0_1.5px_0_rgba(0,0,0,0.7)] select-none">
                    {currentSpeaker}
                  </span>
                </div>
              </div>

              {/* Caixa de Texto do Diálogo 3D Estilo Game (com tag de Quest integrada ao tema) */}
              <div className={isLandscape ? 'px-1 py-1' : 'px-4 py-1'}>
                <div
                  onClick={handleDialogueBoxClick}
                  className={`w-full ${
                    isLandscape ? 'p-4 px-5 rounded-[28px] text-left' : 'p-4 px-5 pt-5 rounded-[32px] text-center'
                  } border-[3px] shadow-[0_6px_0_rgba(0,0,0,0.3),0_12px_24px_rgba(0,0,0,0.45)] cursor-pointer transition-all duration-300 select-none active:scale-[0.99]`}
                  style={{
                    backgroundColor: dialogueTheme.surfaceBg,
                    borderColor: dialogueTheme.surfaceBorder,
                    color: dialogueTheme.surfaceText,
                  }}
                  title={!isTypingComplete ? 'Toque para completar o texto imediatamente' : ''}
                >
                  {/* Tag integrada ao tema do diálogo quando o NPC possui Quest */}
                  {Boolean(activeDialogueMarker.quest || activeDialogueMarker.linkedQuestId) && (() => {
                    const prog = getProg(activeDialogueMarker.id);
                    const ready = questReady(activeDialogueMarker, playerInventory);
                    const statusLabel = prog.done
                      ? '✔️ Missão Concluída'
                      : ready && prog.accepted
                      ? '✨ Itens Prontos p/ Entregar!'
                      : prog.accepted
                      ? `📜 Em Andamento • ${questText(activeDialogueMarker, playerInventory)}`
                      : `❗ Nova Missão • ${activeDialogueMarker.quest?.title || 'Objetivo'}`;
                    return (
                      <div
                        className={`flex flex-wrap items-center ${
                          isLandscape ? 'justify-start' : 'justify-center'
                        } gap-1.5 mb-2`}
                      >
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide text-white border-2 border-white/90 shadow-xs"
                          style={{
                            backgroundColor: prog.done
                              ? '#10b981'
                              : ready && prog.accepted
                              ? '#059669'
                              : dialogueTheme.buttonBg,
                          }}
                        >
                          {statusLabel}
                        </span>
                        {!prog.done && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border"
                            style={{
                              backgroundColor: 'rgba(255,255,255,0.55)',
                              borderColor: dialogueTheme.surfaceBorder,
                              color: dialogueTheme.surfaceText,
                            }}
                          >
                            🎁 +200 XP • +120 Ouro
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  <p
                    className={`text-xs sm:text-sm font-bold leading-relaxed ${
                      isLandscape
                        ? 'min-h-[3.4rem] flex items-center justify-start'
                        : 'min-h-[3.0rem] flex items-center justify-center'
                    }`}
                  >
                    <span>
                      {displayedDialogueText}
                      {!isTypingComplete && (
                        <span
                          className="inline-block w-1.5 h-3.5 ml-1 animate-pulse align-middle"
                          style={{ backgroundColor: dialogueTheme.cursorColor }}
                        />
                      )}
                    </span>
                  </p>
                </div>
              </div>

              {/* SLOTS DE BOTÕES 3D DO DIÁLOGO (CONSCIENTES DO ESTADO DA QUEST) */}
              <div className={`${isLandscape ? 'px-1' : 'px-4'} space-y-2.5 pt-0.5 animate-fade-in`}>
                {(() => {
                  const responses = currentStep?.playerResponses || [];
                  const hasCustomResponses = responses.length > 0;
                  const markerHasQuest = Boolean(activeDialogueMarker.quest || activeDialogueMarker.linkedQuestId);
                  const markerNonDialogueEvents = (activeDialogueMarker.events || []).filter((e) => e.type !== 'dialogue');
                  const prog = getProg(activeDialogueMarker.id);
                  const ready = questReady(activeDialogueMarker, playerInventory);
                  const isDuelQuest = activeDialogueMarker.quest?.kind === 'duel' || activeDialogueMarker.eventKind === 'duel';

                  const handleFinalizeDialogueOption = (isPrimaryOption: boolean) => {
                    const targetMarker = activeDialogueMarker;
                    if (isPrimaryOption) {
                      if (isDuelQuest) {
                        creditDuel(targetMarker.id);
                        if (markerHasQuest) {
                          completeQuest(targetMarker);
                        }
                      } else if (markerHasQuest) {
                        if ((prog.accepted && !prog.done && ready) || (!prog.accepted && ready && targetMarker.quest?.kind !== 'collect')) {
                          completeQuest(targetMarker);
                        } else if (!prog.accepted && !prog.done) {
                          acceptQuest(targetMarker.id);
                        } else if (!prog.done && ready) {
                          completeQuest(targetMarker);
                        }
                      }
                      if (markerNonDialogueEvents.length > 0) {
                        triggerEvent({ ...targetMarker, events: markerNonDialogueEvents });
                      }
                    }
                    setActiveDialogueMarker(null);
                    setInspectedMarker(null);
                    eventFreezeUntilRef.current = 0;
                    onCloseDialogue?.();
                  };

                  // Se o NPC possui uma Quest e já está no passo final (ou quando já aceitou/concluiu a missão),
                  // priorizamos os botões inteligentes de estado da Quest para não oferecer a mesma missão duas vezes!
                  if (markerHasQuest && (isFinalStep || prog.accepted || prog.done)) {
                    // 1. Quest já concluída
                    if (prog.done) {
                      return (
                        <div className="max-w-[72%] mx-auto">
                          <button
                            onClick={() => {
                              if (!isTypingComplete) {
                                setDisplayedDialogueText(fullDialogueText);
                                setIsTypingComplete(true);
                                return;
                              }
                              handleFinalizeDialogueOption(false);
                            }}
                            className="w-full h-11 px-4 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer"
                            style={{ backgroundColor: dialogueTheme.buttonBg }}
                          >
                            <span>🙌 Disponha! Até logo</span>
                          </button>
                        </div>
                      );
                    }

                    // 2. Quest já aceita e PRONTA para entregar itens e finalizar
                    if (prog.accepted && ready) {
                      return (
                        <div className="grid grid-cols-2 gap-3.5 max-w-[90%] mx-auto">
                          <button
                            onClick={() => {
                              if (!isTypingComplete) {
                                setDisplayedDialogueText(fullDialogueText);
                                setIsTypingComplete(true);
                                return;
                              }
                              handleFinalizeDialogueOption(true);
                            }}
                            className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_#065f46,0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer"
                            style={{ backgroundColor: '#10b981' }}
                          >
                            <span>✨ Entregar & Finalizar!</span>
                          </button>
                          <button
                            onClick={() => {
                              if (!isTypingComplete) {
                                setDisplayedDialogueText(fullDialogueText);
                                setIsTypingComplete(true);
                                return;
                              }
                              handleFinalizeDialogueOption(false);
                            }}
                            className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer"
                            style={{ backgroundColor: dialogueTheme.buttonSecondaryBg }}
                          >
                            <span>👋 Entregar depois</span>
                          </button>
                        </div>
                      );
                    }

                    // 3. Quest já aceita mas AINDA EM ANDAMENTO (faltam itens ou objetivos)
                    if (prog.accepted && !ready) {
                      return (
                        <div className="grid grid-cols-2 gap-3.5 max-w-[90%] mx-auto">
                          <button
                            onClick={() => {
                              if (!isTypingComplete) {
                                setDisplayedDialogueText(fullDialogueText);
                                setIsTypingComplete(true);
                                return;
                              }
                              handleFinalizeDialogueOption(false);
                            }}
                            className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer"
                            style={{ backgroundColor: dialogueTheme.buttonBg }}
                          >
                            <span>👍 Vou buscar!</span>
                          </button>
                          <button
                            onClick={() => {
                              if (!isTypingComplete) {
                                setDisplayedDialogueText(fullDialogueText);
                                setIsTypingComplete(true);
                                return;
                              }
                              setActiveDialogueMarker(null);
                              setInspectedMarker(null);
                              eventFreezeUntilRef.current = 0;
                              onCloseDialogue?.();
                              setQuestPopupState({ open: true, initialTab: 'tarefas' });
                            }}
                            className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer"
                            style={{ backgroundColor: dialogueTheme.buttonSecondaryBg }}
                          >
                            <span>📜 Ver Quests</span>
                          </button>
                        </div>
                      );
                    }

                    // 4. Quest ainda NÃO aceita (oferta inicial da missão)
                    const acceptLabel =
                      hasCustomResponses && responses[0]?.label
                        ? responses[0].label
                        : '🎯 Aceitar Missão';
                    const declineLabel =
                      hasCustomResponses && responses[1]?.label
                        ? responses[1].label
                        : '👋 Agora não';

                    return (
                      <div className="grid grid-cols-2 gap-3.5 max-w-[90%] mx-auto">
                        <button
                          onClick={() => {
                            if (!isTypingComplete) {
                              setDisplayedDialogueText(fullDialogueText);
                              setIsTypingComplete(true);
                              return;
                            }
                            handleFinalizeDialogueOption(true);
                          }}
                          className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer"
                          style={{ backgroundColor: dialogueTheme.buttonBg }}
                        >
                          <span>{acceptLabel}</span>
                        </button>
                        <button
                          onClick={() => {
                            if (!isTypingComplete) {
                              setDisplayedDialogueText(fullDialogueText);
                              setIsTypingComplete(true);
                              return;
                            }
                            handleFinalizeDialogueOption(false);
                          }}
                          className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer"
                          style={{ backgroundColor: dialogueTheme.buttonSecondaryBg }}
                        >
                          <span>{declineLabel}</span>
                        </button>
                      </div>
                    );
                  }

                  // Se há respostas customizadas configuradas (para diálogos normais ou passos intermediários)
                  if (hasCustomResponses) {
                    const btn1 = responses[0];
                    const btn2 = responses[1];
                    const btn3 = responses[2];

                    return (
                      <div className="space-y-2">
                        {/* Linha de Cima: Slot 1 e Slot 2 */}
                        {(btn1 || btn2) && (
                          <div className={`grid ${btn1 && btn2 ? 'grid-cols-2' : 'grid-cols-1 max-w-[70%] mx-auto'} gap-3.5`}>
                            {btn1 && (
                              <button
                                onClick={() => {
                                  if (!isTypingComplete) {
                                    setDisplayedDialogueText(fullDialogueText);
                                    setIsTypingComplete(true);
                                    return;
                                  }
                                  if (btn1.nextStepIndex !== undefined && btn1.nextStepIndex < totalSteps) {
                                    setCurrentStepIndex(btn1.nextStepIndex);
                                  } else if (!isFinalStep) {
                                    setCurrentStepIndex((prev) => prev + 1);
                                  } else {
                                    handleFinalizeDialogueOption(true);
                                  }
                                }}
                                className="h-11 px-4 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                                style={{ backgroundColor: dialogueTheme.buttonBg }}
                              >
                                <span>{btn1.label}</span>
                              </button>
                            )}
                            {btn2 && (
                              <button
                                onClick={() => {
                                  if (!isTypingComplete) {
                                    setDisplayedDialogueText(fullDialogueText);
                                    setIsTypingComplete(true);
                                    return;
                                  }
                                  if (btn2.nextStepIndex !== undefined && btn2.nextStepIndex < totalSteps) {
                                    setCurrentStepIndex(btn2.nextStepIndex);
                                  } else if (!isFinalStep) {
                                    setCurrentStepIndex((prev) => prev + 1);
                                  } else {
                                    const lower = (btn2.label || '').toLowerCase();
                                    const isDecline =
                                      lower.includes('depois') ||
                                      lower.includes('recus') ||
                                      lower.includes('sair') ||
                                      lower.includes('não') ||
                                      lower.includes('explorar') ||
                                      lower.includes('antes') ||
                                      lower.includes('paz');
                                    handleFinalizeDialogueOption(!isDecline);
                                  }
                                }}
                                className="h-11 px-4 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                                style={{ backgroundColor: dialogueTheme.buttonBg }}
                              >
                                <span>{btn2.label}</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* Linha de Baixo: Slot 3 Centralizado */}
                        {btn3 && (
                          <div className="max-w-[70%] mx-auto">
                            <button
                              onClick={() => {
                                if (!isTypingComplete) {
                                  setDisplayedDialogueText(fullDialogueText);
                                  setIsTypingComplete(true);
                                  return;
                                }
                                if (btn3.nextStepIndex !== undefined && btn3.nextStepIndex < totalSteps) {
                                  setCurrentStepIndex(btn3.nextStepIndex);
                                } else if (!isFinalStep) {
                                  setCurrentStepIndex((prev) => prev + 1);
                                } else {
                                  const lower = (btn3.label || '').toLowerCase();
                                  const isDecline = lower.includes('depois') || lower.includes('recus') || lower.includes('sair') || lower.includes('não');
                                  handleFinalizeDialogueOption(!isDecline);
                                }
                              }}
                              className="w-full h-11 px-4 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                              style={{ backgroundColor: dialogueTheme.buttonBg }}
                            >
                              <span>{btn3.label}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  }

                  // Fluxo Padrão: Botão "Continuar" para avançar frases
                  if (!isFinalStep) {
                    return (
                      <div className="max-w-[70%] mx-auto">
                        <button
                          onClick={() => {
                            if (!isTypingComplete) {
                              setDisplayedDialogueText(fullDialogueText);
                              setIsTypingComplete(true);
                              return;
                            }
                            setCurrentStepIndex((prev) => prev + 1);
                          }}
                          className={`w-full h-11 px-4 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] ${
                            !isTypingComplete ? 'opacity-65 cursor-pointer' : 'opacity-100'
                          }`}
                          style={{ backgroundColor: dialogueTheme.buttonBg }}
                        >
                          <span>Continuar</span>
                        </button>
                      </div>
                    );
                  }

                  // Passo Final: Duelo / Desafio
                  if (activeDialogueMarker.eventKind === 'duel') {
                    return (
                      <div className="grid grid-cols-2 gap-3.5 max-w-[85%] mx-auto">
                        <button
                          onClick={() => {
                            creditDuel(activeDialogueMarker.id);
                            setActiveDialogueMarker(null);
                            setInspectedMarker(null);
                            eventFreezeUntilRef.current = 0;
                            onCloseDialogue?.();
                          }}
                          className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                          style={{ backgroundColor: '#e11d48' }}
                        >
                          <span>⚔️ Lutar / Duelo</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveDialogueMarker(null);
                            setInspectedMarker(null);
                            eventFreezeUntilRef.current = 0;
                            onCloseDialogue?.();
                          }}
                          className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                          style={{ backgroundColor: dialogueTheme.buttonSecondaryBg }}
                        >
                          <span>👋 Recuar</span>
                        </button>
                      </div>
                    );
                  }

                  // Passo Final: Teleporte / Viagem vinculado ao fim do diálogo
                  if (activeDialogueMarker.type === 'travel') {
                    return (
                      <div className="grid grid-cols-2 gap-3.5 max-w-[85%] mx-auto">
                        <button
                          onClick={() => {
                            const markerToTravel = activeDialogueMarker;
                            setActiveDialogueMarker(null);
                            setInspectedMarker(null);
                            eventFreezeUntilRef.current = 0;
                            onCloseDialogue?.();
                            if (markerToTravel.travelTargetType === 'sub_biome') {
                              handleTravelToSubBiome(markerToTravel);
                            } else {
                              handleFastTravel(markerToTravel);
                            }
                          }}
                          className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                          style={{ backgroundColor: '#8b5cf6' }}
                        >
                          <span>🌌 Viajar Agora</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveDialogueMarker(null);
                            setInspectedMarker(null);
                            eventFreezeUntilRef.current = 0;
                            onCloseDialogue?.();
                          }}
                          className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                          style={{ backgroundColor: dialogueTheme.buttonSecondaryBg }}
                        >
                          <span>👋 Ficar Aqui</span>
                        </button>
                      </div>
                    );
                  }

                  // Apenas Diálogo Concluído
                  return (
                    <div className="max-w-[70%] mx-auto">
                      <button
                        onClick={() => {
                          setActiveDialogueMarker(null);
                          setInspectedMarker(null);
                          eventFreezeUntilRef.current = 0;
                          onCloseDialogue?.();
                        }}
                        className="w-full h-11 px-4 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
                        style={{ backgroundColor: dialogueTheme.buttonBg }}
                      >
                        <span>👋 Até logo (Continuar no mapa)</span>
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Modal de Tela Interativa (Chocadeira, Alquimia, etc.) */}
        {activeStationMarker && (
          <StationInteractiveModal
            marker={project.markers.find((m) => m.id === activeStationMarker.id) || activeStationMarker}
            onClose={() => setActiveStationMarker(null)}
            onUpdateMarker={(id, updates) => {
              onUpdateMarker?.(id, updates);
              if (activeStationMarker.id === id) {
                setActiveStationMarker((prev) => (prev ? { ...prev, ...updates } : null));
              }
            }}
            onSpawnNpcMarker={(newNpcOrList) => {
              const newNpcs = Array.isArray(newNpcOrList) ? newNpcOrList : [newNpcOrList];
              const updatedMarkers = [...project.markers, ...newNpcs];
              onUpdateProject?.({ markers: updatedMarkers });
              if (newNpcs.length === 1) {
                setActionFeedback(`🐣 ${newNpcs[0].name} nasceu no mapa!`);
              } else {
                setActionFeedback(`🐣 ${newNpcs.length} criaturas nasceram no mapa!`);
              }
              setTimeout(() => setActionFeedback(null), 3500);
            }}
            allProjectMarkers={project.markers}
          />
        )}

        {/* =========================================================================
            POP-UP DE MOCHILA FIEL À REFERÊNCIA DO USUÁRIO (RETRATO & PAISAGEM)
            Abas: Equipamento | Inventário Geral | 📜 Quests + Inspeção com Desfoque de Lente
           ========================================================================= */}
        {inventoryOpen && (
          <GameBackpackPopupModal
            project={project}
            mapCollectedInventory={playerInventory}
            onClose={() => setInventoryOpen(false)}
            onSwitchToQuests={() => {
              setInventoryOpen(false);
              setQuestPopupState({ open: true, initialTab: 'jornada' });
            }}
            onUpdateProject={onUpdateProject}
            isInsideEmulator={true}
            isLandscape={isLandscape}
          />
        )}

        {/* CONTROLES: joystick premium + mochila + dedinho + botões customizados do Módulo Telas */}
        {!activeDialogueMarker && !activeStationMarker && !eventVideo && activeTab !== 'map' && hasPlayableContent && (() => {
          const screensConfig = getOrCreateScreensConfig(project);
          const targetHudScreenId = isLandscape ? 'screen_player_hud_landscape' : 'screen_player_hud';
          const activeScreenConfig =
            screensConfig.screens.find((s) => s.id === targetHudScreenId) ||
            screensConfig.screens.find((s) => s.id === screensConfig.activeScreenId && s.type === 'player_hud') ||
            screensConfig.screens[0];
          const hudConfig = activeScreenConfig?.hudConfig;

          const playerHeaderConfig = hudConfig?.playerHeaderHud;
          const questTrackerConfig = hudConfig?.questTrackerHud;
          const topGlassBarConfig = hudConfig?.topGlassBarHud;
          const lootToastConfig = hudConfig?.lootToastHud;
          const backpackConfig = hudConfig?.backpackButton;
          const joystickConfig = hudConfig?.joystick;
          const touchMoveConfig = hudConfig?.touchMoveButton;
          const customHudButtons = hudConfig?.customButtons || [];

          const isInlineEditing = !!screensConfig?.isInlineEditing;
          const selectedInlineId = screensConfig?.selectedInlineElementId;

          const handleUpdateInlineElementPos = (id: string, newX: number, newY: number) => {
            if (!onUpdateProject) return;
            const currentScreensConfig = getOrCreateScreensConfig(project);
            const targetId = isLandscape ? 'screen_player_hud_landscape' : 'screen_player_hud';
            const activeSc =
              currentScreensConfig.screens.find((s) => s.id === targetId) ||
              currentScreensConfig.screens[0];
            const currentHud = activeSc.hudConfig || {
              backpackButton: { visible: true, x: 0, y: 0, scale: 1.0, opacity: 1.0 },
              joystick: { visible: true, x: 0, y: 0, scale: 1.0, opacity: 1.0 },
              touchMoveButton: { visible: true, x: 0, y: 0, scale: 1.0, opacity: 1.0 },
              customButtons: [],
            };

            let updatedHud: PlayerHudConfig = { ...currentHud };

            if (id === 'btn-player-header') {
              updatedHud.playerHeaderHud = {
                ...(currentHud.playerHeaderHud || { visible: true, scale: 0.92, opacity: 1.0 }),
                x: newX,
                y: newY,
              };
            } else if (id === 'btn-quest-tracker') {
              updatedHud.questTrackerHud = {
                ...(currentHud.questTrackerHud || { visible: true, scale: 0.95, opacity: 1.0 }),
                x: newX,
                y: newY,
              };
            } else if (id === 'btn-top-glass-bar') {
              updatedHud.topGlassBarHud = {
                ...(currentHud.topGlassBarHud || { visible: true, scale: 0.95, opacity: 1.0 }),
                x: newX,
                y: newY,
              };
            } else if (id === 'btn-loot-toast') {
              updatedHud.lootToastHud = {
                ...(currentHud.lootToastHud || { visible: true, scale: 1.0, opacity: 1.0 }),
                x: newX,
                y: newY,
              };
            } else if (id === 'btn-backpack') {
              updatedHud.backpackButton = {
                ...(currentHud.backpackButton || { visible: true, scale: 1.0, opacity: 1.0 }),
                x: newX,
                y: newY,
              };
            } else if (id === 'btn-joystick') {
              updatedHud.joystick = {
                ...(currentHud.joystick || { visible: true, scale: 1.0, opacity: 1.0 }),
                x: newX,
                y: newY,
              };
            } else if (id === 'btn-touch') {
              updatedHud.touchMoveButton = {
                ...(currentHud.touchMoveButton || { visible: true, scale: 1.0, opacity: 1.0 }),
                x: newX,
                y: newY,
              };
            } else {
              updatedHud.customButtons = (currentHud.customButtons || []).map((btn) =>
                btn.id === id ? { ...btn, x: newX, y: newY } : btn
              );
            }

            const updatedScreens = currentScreensConfig.screens.map((s) =>
              s.id === activeSc.id ? { ...s, hudConfig: updatedHud } : s
            );

            onUpdateProject({
              screensConfig: {
                ...currentScreensConfig,
                activeScreenId: activeSc.id,
                screens: updatedScreens,
                selectedInlineElementId: id,
              },
            });
          };

          const startInlineDrag = (
            e: React.PointerEvent,
            id: string,
            initialX: number,
            initialY: number,
            anchor?: string
          ) => {
            e.preventDefault();
            e.stopPropagation();

            if (onUpdateProject) {
              const currentScreensConfig = screensConfig || getOrCreateScreensConfig(project);
              onUpdateProject({
                screensConfig: {
                  ...currentScreensConfig,
                  selectedInlineElementId: id,
                },
              });
            }

            setDraggingInlineElement(id);
            const startClientX = e.clientX;
            const startClientY = e.clientY;

            const handlePointerMove = (moveEv: PointerEvent) => {
              moveEv.preventDefault();
              const deltaX = moveEv.clientX - startClientX;
              const deltaY = moveEv.clientY - startClientY;

              // No eixo X: mover para a direita (deltaX > 0) sempre aumenta a posição horizontal (vai para a direita)
              const nextX = Math.round(initialX + deltaX);

              // No eixo Y:
              // Para âncoras de topo (top_left, top_right), mover para baixo (deltaY > 0) aumenta a distância do topo
              // Para âncoras de base (bottom_left, bottom_right, center, mochila, joystick, toque), mover para cima (deltaY < 0) aumenta o bottom (sobe)
              let nextY = initialY;
              if (anchor === 'top_left' || anchor === 'top_right') {
                nextY = Math.round(initialY + deltaY);
              } else {
                nextY = Math.round(initialY - deltaY);
              }

              handleUpdateInlineElementPos(id, nextX, nextY);
            };

            const handlePointerUp = () => {
              setDraggingInlineElement(null);
              window.removeEventListener('pointermove', handlePointerMove);
              window.removeEventListener('pointerup', handlePointerUp);
              window.removeEventListener('pointercancel', handlePointerUp);
            };

            window.addEventListener('pointermove', handlePointerMove);
            window.addEventListener('pointerup', handlePointerUp);
            window.addEventListener('pointercancel', handlePointerUp);
          };

          const handleCustomHudButtonClick = (btn: import('../types/map').ScreenCustomButton) => {
            if (isInlineEditing) return;
            if (!btn || btn.visible === false) return;

            if (btn.action.type === 'open_inventory') {
              setInventoryOpen((v) => !v);
              return;
            }

            if (btn.action.type === 'open_quest_popup') {
              setQuestPopupState({
                open: true,
                initialTab: btn.action.initialTab || hudQuestSubTab,
              });
              return;
            }

            if (btn.action.type === 'toggle_locomotion') {
              setLocomotion((prev) => (prev === 'joystick' ? 'tap' : 'joystick'));
              return;
            }

            if (btn.action.type === 'open_dialogue') {
              const targetMarker = (btn.action as any).markerId
                ? project.markers.find((m) => m.id === (btn.action as any).markerId)
                : project.markers.find((m) => m.type === 'npc' || !!m.dialogueText);
              if (targetMarker) {
                setActiveDialogueMarker(targetMarker);
                setActionFeedback(`💬 Diálogo com ${targetMarker.name}...`);
              } else {
                setActionFeedback('Nenhum NPC próximo.');
              }
              setTimeout(() => setActionFeedback(null), 2500);
              return;
            }

            if (btn.action.type === 'player_action') {
              const act = btn.action.action;
              if (act === 'attack') {
                triggerPlayerOrPetAttack();
              } else if (act === 'jump' || act === 'dash') {
                triggerPlayerDash();
              } else if (act === 'pet_item') {
                setIsPetCareOpen((v) => !v);
              } else {
                setActionFeedback('🖐️ Interagindo...');
                setTimeout(() => setActionFeedback(null), 1500);
              }
              return;
            }

            if (btn.action.type === 'pause_game') {
              setActionFeedback('⏸️ Jogo Pausado');
              setTimeout(() => setActionFeedback(null), 2000);
              return;
            }

            if (btn.action.type === 'trigger_event') {
              setActionFeedback(`⚡ Evento "${btn.action.eventName}" disparado!`);
              setTimeout(() => setActionFeedback(null), 2500);
              return;
            }

            if (btn.action.type === 'navigate_screen') {
              setActionFeedback(`📱 Transição de Tela: ${btn.action.targetScreenId}`);
              setTimeout(() => setActionFeedback(null), 2000);
              return;
            }
          };

          return (
            <div
              className={`transition-opacity duration-500 ${
                isControlsHiddenBySpawn ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}
            >
              {/* CÁPSULA VERTICAL DE VIDRO COM BORDAS DOURADAS (3 SLOTS DE PET EM TEMPO REAL + BOTÃO ITEM PET) NO CANTO DIREITO */}
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 z-60 pointer-events-auto">
                <VerticalGlassPetSwitcherCapsuleWidget
                  project={project}
                  onSelectPetSlot={(slotIdx) => {
                    const curPlayer = project.player;
                    if (!curPlayer || !onUpdateProject) return;
                    const resolved = getResolvedPlayerPetConfig(curPlayer);
                    const targetPet = resolved.equippedPets[slotIdx];
                    if (targetPet) {
                      onUpdateProject({
                        player: {
                          ...curPlayer,
                          petConfig: {
                            ...(curPlayer.petConfig || {}),
                            enabled: true,
                            activePetId: targetPet.id,
                            equippedPetIds: resolved.equippedPetIds,
                            activePetSlotIndex: slotIdx,
                            petGallery: resolved.petGallery,
                            name: targetPet.name,
                            iconEmoji: targetPet.iconEmoji,
                            avatarPng: targetPet.avatarPng,
                            scale: targetPet.scale,
                            attackDamage: targetPet.attackDamage,
                            attackRange: targetPet.attackRange,
                            color: targetPet.color,
                          },
                        },
                      });
                      petRuntimeRef.current.emoteText = `✨ ${targetPet.name}!`;
                      petRuntimeRef.current.emoteUntil = performance.now() + 1800;
                      setActionFeedback(`🐾 Pet trocado em tempo real: ${targetPet.name} (Nv.${targetPet.level || 1})!`);
                      setTimeout(() => setActionFeedback(null), 2200);
                    } else {
                      setInventoryOpen(true);
                    }
                  }}
                  onOpenPetCareModal={() => setIsPetCareOpen((v) => !v)}
                />
              </div>

              {/* POP-UP RÁPIDO DO BOTÃO "🍖 ITEM PET" (DAR CURA E ALIMENTOS AO PET P/ SUBIR NÍVEL E CRESCER) */}
              {isPetCareOpen && (() => {
                const resolvedPet = getResolvedPlayerPetConfig(project.player);
                const activePet = resolvedPet.activePet;
                const hpPct = activePet
                  ? Math.max(0, Math.min(100, ((activePet.hp ?? activePet.maxHp ?? 100) / Math.max(1, activePet.maxHp ?? 100)) * 100))
                  : 100;
                const xpPct = activePet
                  ? Math.max(0, Math.min(100, ((activePet.xp ?? 0) / Math.max(1, activePet.maxXp ?? 100)) * 100))
                  : 0;

                return (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-16 top-1/2 -translate-y-1/2 z-70 w-64 rounded-2xl p-3 border-2 shadow-[0_12px_32px_rgba(0,0,0,0.85)] backdrop-blur-xl pointer-events-auto select-none space-y-2.5"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(15, 23, 42, 0.95) 0%, rgba(23, 37, 84, 0.92) 100%)',
                      borderColor: '#fbbf24',
                    }}
                  >
                    <div className="flex items-center justify-between border-b border-amber-400/30 pb-1.5">
                      <span className="text-[11px] font-black text-amber-300 uppercase tracking-wide flex items-center gap-1">
                        <span>🍖 Item Pet (Cura &amp; Nível)</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsPetCareOpen(false)}
                        className="w-5 h-5 rounded-full bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center text-[10px] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>

                    {activePet && (
                      <div className="p-2 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-lg bg-slate-900 border border-amber-400/50 flex items-center justify-center shrink-0 overflow-hidden">
                            {activePet.avatarPng ? (
                              <img src={activePet.avatarPng} alt={activePet.name} className="w-full h-full object-contain" />
                            ) : (
                              <span className="text-lg">{activePet.iconEmoji || '🐾'}</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black text-white truncate">
                                {activePet.name}
                              </span>
                              <span className="text-[9px] font-black text-amber-300">
                                Nv.{activePet.level || 1}
                              </span>
                            </div>
                            <span className="text-[8.5px] text-slate-400 block">
                              ⚔️ Dano {activePet.attackDamage} • 📐 Escala {resolvedPet.scale.toFixed(2)}x
                            </span>
                          </div>
                        </div>

                        {/* Barra de PV do Pet */}
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[8px] font-bold">
                            <span className="text-emerald-300">❤️ PV do Pet</span>
                            <span className="text-white font-mono">
                              {activePet.hp ?? activePet.maxHp ?? 120}/{activePet.maxHp ?? 120}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all"
                              style={{ width: `${hpPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Barra de EXP / Crescimento do Pet */}
                        <div className="space-y-0.5">
                          <div className="flex justify-between text-[8px] font-bold">
                            <span className="text-amber-300">⭐ EXP (Cresce ao subir Nv!)</span>
                            <span className="text-white font-mono">
                              {activePet.xp ?? 0}/{activePet.maxXp ?? 100}
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-500 to-yellow-300 transition-all"
                              style={{ width: `${xpPct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-1 max-h-44 overflow-y-auto pr-0.5">
                      {DEFAULT_PET_CARE_ITEMS.map((careItem) => (
                        <button
                          key={careItem.id}
                          type="button"
                          onClick={() => {
                            if (!project.player || !onUpdateProject) return;
                            const res = applyPetCareItemToPlayer(project.player, careItem);
                            onUpdateProject({ player: res.updatedPlayer });
                            petRuntimeRef.current.emoteText = res.leveledUp
                              ? `⭐ LEVEL UP! Nv.${res.newLevel}!`
                              : `🍖 +Cura / +EXP!`;
                            petRuntimeRef.current.emoteUntil = performance.now() + 2400;
                            setActionFeedback(res.feedback);
                            setTimeout(() => setActionFeedback(null), 2800);
                          }}
                          className="w-full p-1.5 rounded-xl bg-slate-900/90 hover:bg-amber-500/20 border border-slate-700/80 hover:border-amber-400/60 flex items-center justify-between gap-2 text-left transition-all cursor-pointer"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-slate-950 border border-amber-500/30 flex items-center justify-center text-sm shrink-0">
                              {careItem.iconEmoji}
                            </span>
                            <div className="min-w-0">
                              <span className="text-[9.5px] font-black text-white block truncate">
                                {careItem.name}
                              </span>
                              <span className="text-[8px] text-emerald-300 font-bold block">
                                {careItem.statValue}
                              </span>
                            </div>
                          </div>
                          <span className="px-2 py-1 rounded-lg bg-amber-400 text-slate-950 font-black text-[8.5px] shrink-0">
                            Dar
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })()}
              {/* Banner Superior no Celular em Modo Edição Inline */}
              {isInlineEditing && (
                <div className="absolute top-10 left-1/2 -translate-x-1/2 z-70 flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/95 border border-emerald-500/80 shadow-[0_0_24px_rgba(16,185,129,0.5)] backdrop-blur-md pointer-events-auto select-none">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="text-[11px] font-black text-emerald-300">
                    Edição Inline: Arraste os elementos na tela
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onUpdateProject) {
                        const cur = screensConfig || getOrCreateScreensConfig(project);
                        onUpdateProject({
                          screensConfig: {
                            ...cur,
                            isInlineEditing: false,
                          },
                        });
                      }
                    }}
                    className="ml-1 text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-slate-950 cursor-pointer shadow-sm transition-all"
                  >
                    Concluir
                  </button>
                </div>
              )}

              {/* Botão de Atalho Rápido para Ativar Edição Inline quando estiver na aba de Telas */}
              {activeTab === 'screens' && !isInlineEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateProject) {
                      const cur = screensConfig || getOrCreateScreensConfig(project);
                      onUpdateProject({
                        screensConfig: {
                          ...cur,
                          isInlineEditing: true,
                        },
                      });
                    }
                  }}
                  className="absolute top-10 right-4 z-70 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-950/90 border border-indigo-500/50 text-indigo-200 hover:text-white hover:bg-indigo-900 text-[10px] font-bold shadow-lg backdrop-blur-md cursor-pointer transition-all pointer-events-auto"
                  title="Ativar modo de posicionar e arrastar botões direto no emulador"
                >
                  <Move className="w-3 h-3 text-indigo-400" />
                  <span>Posicionar no Emulador</span>
                </button>
              )}

              {/* =========================================================================
                  SECÇÃO 1 NO EMULADOR: HEADER COM ÍCONE CIRCULAR + BARRA DE PV E EXP
                 ========================================================================= */}
              {playerHeaderConfig?.visible !== false && (
                <div
                  onPointerDown={(e) => {
                    if (isInlineEditing) {
                      startInlineDrag(
                        e,
                        'btn-player-header',
                        playerHeaderConfig?.x || 0,
                        playerHeaderConfig?.y || 0,
                        'top_left'
                      );
                    }
                  }}
                  className={`absolute z-60 select-none pointer-events-auto ${
                    isInlineEditing
                      ? `cursor-grab active:cursor-grabbing rounded-2xl p-1 ring-2 ${
                          selectedInlineId === 'btn-player-header' ||
                          draggingInlineElement === 'btn-player-header'
                            ? 'ring-emerald-400 ring-offset-2 ring-offset-slate-950 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                            : 'ring-emerald-400/70 ring-dashed hover:ring-amber-400 bg-slate-950/20'
                        }`
                      : ''
                  }`}
                  style={{
                    left: `${(isLandscape ? 24 : 22) + (playerHeaderConfig?.x || 0)}px`,
                    top: `${(isLandscape ? 22 : 42) + (playerHeaderConfig?.y || 0)}px`,
                    transform: `scale(${playerHeaderConfig?.scale ?? (isLandscape ? 0.88 : 0.92)})`,
                    transformOrigin: 'top left',
                    opacity: playerHeaderConfig?.opacity ?? 1.0,
                  }}
                  title={
                    isInlineEditing
                      ? 'Arraste para reposicionar o Header de PV & EXP'
                      : 'Clique para abrir Jornada & Tarefas'
                  }
                >
                  {isInlineEditing && (
                    <div className="absolute -top-5 left-0 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 pointer-events-none select-none shadow">
                      🛡️ Header PV/EXP (X:{playerHeaderConfig?.x || 0}, Y:{playerHeaderConfig?.y || 0})
                    </div>
                  )}
                  <PlayerHeaderHudWidget
                    project={project}
                    config={playerHeaderConfig}
                    isLandscape={isLandscape}
                    onClickHeader={() => {
                      if (!isInlineEditing) {
                        setQuestPopupState({
                          open: true,
                          initialTab: hudQuestSubTab,
                        });
                      }
                    }}
                  />
                </div>
              )}

              {/* =========================================================================
                  SECÇÃO 2 NO EMULADOR: INFO DE QUEST (JORNADA | TAREFAS. + VER MAIS...)
                 ========================================================================= */}
              {questTrackerConfig?.visible !== false && (
                <div
                  onPointerDown={(e) => {
                    if (isInlineEditing) {
                      startInlineDrag(
                        e,
                        'btn-quest-tracker',
                        questTrackerConfig?.x || 0,
                        questTrackerConfig?.y || 0,
                        'top_left'
                      );
                    }
                  }}
                  className={`absolute z-60 select-none pointer-events-auto ${
                    isInlineEditing
                      ? `cursor-grab active:cursor-grabbing rounded-2xl p-1.5 ring-2 ${
                          selectedInlineId === 'btn-quest-tracker' ||
                          draggingInlineElement === 'btn-quest-tracker'
                            ? 'ring-emerald-400 ring-offset-2 ring-offset-slate-950 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                            : 'ring-emerald-400/70 ring-dashed hover:ring-amber-400 bg-slate-950/20'
                        }`
                      : ''
                  }`}
                  style={{
                    left: `${(isLandscape ? 28 : 26) + (questTrackerConfig?.x || 0)}px`,
                    top: `${(isLandscape ? 98 : 132) + (questTrackerConfig?.y || 0)}px`,
                    transform: `scale(${questTrackerConfig?.scale ?? (isLandscape ? 0.9 : 0.95)})`,
                    transformOrigin: 'top left',
                    opacity: questTrackerConfig?.opacity ?? 1.0,
                  }}
                >
                  {isInlineEditing && (
                    <div className="absolute -top-5 left-0 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 pointer-events-none select-none shadow">
                      ✦ Jornada | Tarefas (X:{questTrackerConfig?.x || 0}, Y:{questTrackerConfig?.y || 0})
                    </div>
                  )}
                  <QuestTrackerHudWidget
                    project={project}
                    config={questTrackerConfig}
                    isLandscape={isLandscape}
                    activeSubTab={hudQuestSubTab}
                    onChangeSubTab={setHudQuestSubTab}
                    onOpenPopup={(tab, qId) => {
                      if (!isInlineEditing) {
                        setQuestPopupState({
                          open: true,
                          initialTab: tab,
                          questId: qId,
                        });
                      }
                    }}
                  />
                </div>
              )}

              {/* =========================================================================
                  SECÇÃO 3 NO EMULADOR: BARRA DE ACESSO ESTILO VIDRO COM 6 ÍCONES CIRCULARES (CANTO SUPERIOR OPOSTO AO HEADER)
                 ========================================================================= */}
              {topGlassBarConfig?.visible !== false && (
                <div
                  onPointerDown={(e) => {
                    if (isInlineEditing) {
                      startInlineDrag(
                        e,
                        'btn-top-glass-bar',
                        topGlassBarConfig?.x || 0,
                        topGlassBarConfig?.y || 0,
                        'top_right'
                      );
                    }
                  }}
                  className={`absolute z-60 select-none pointer-events-auto ${
                    isInlineEditing
                      ? `cursor-grab active:cursor-grabbing rounded-full p-1 ring-2 ${
                          selectedInlineId === 'btn-top-glass-bar' ||
                          draggingInlineElement === 'btn-top-glass-bar'
                            ? 'ring-emerald-400 ring-offset-2 ring-offset-slate-950 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                            : 'ring-emerald-400/70 ring-dashed hover:ring-amber-400 bg-slate-950/20'
                        }`
                      : ''
                  }`}
                  style={{
                    right: `${(isLandscape ? 22 : 16) - (topGlassBarConfig?.x || 0)}px`,
                    top: `${(isLandscape ? 22 : 44) + (topGlassBarConfig?.y || 0)}px`,
                    transform: `scale(${topGlassBarConfig?.scale ?? (isLandscape ? 0.96 : 0.88)})`,
                    transformOrigin: 'top right',
                    opacity: topGlassBarConfig?.opacity ?? 1.0,
                  }}
                >
                  {isInlineEditing && (
                    <div className="absolute -top-5 right-0 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 pointer-events-none select-none shadow">
                      💎 Barra Vidro 6 Ícones (X:{topGlassBarConfig?.x || 0}, Y:{topGlassBarConfig?.y || 0})
                    </div>
                  )}
                  <TopGlassAccessBarHudWidget
                    config={topGlassBarConfig}
                    isLandscape={isLandscape}
                    isAudioMuted={isBgmMuted}
                    onTriggerAction={(action) => {
                      if (isInlineEditing) return;
                      if (action === 'open_inventory') {
                        setInventoryOpen((v) => !v);
                      } else if (action === 'open_quests') {
                        setQuestPopupState({
                          open: true,
                          initialTab: hudQuestSubTab,
                        });
                      } else if (action === 'toggle_map') {
                        const trackedId = project.questsConfig?.activeTrackedQuestId;
                        const trackedQuest = (project.questsConfig?.quests || []).find(
                          (q) => q.id === trackedId
                        );
                        pushLootToastEntry({
                          text: trackedQuest
                            ? `Mapa: Rastreando "${trackedQuest.title}"`
                            : 'Mapa de Fase & Marcadores Ativos',
                          iconEmoji: '🗺️',
                        });
                        setQuestPopupState({
                          open: true,
                          initialTab: 'jornada',
                          questId: trackedId,
                        });
                      } else if (action === 'open_dialogue') {
                        const nearestNpc = project.markers.find(
                          (m) => m.type === 'npc' || m.dialogueEnabled || Boolean(m.quest)
                        );
                        if (nearestNpc) {
                          setActiveDialogueMarker(nearestNpc);
                        } else {
                          pushLootToastEntry({
                            text: 'Aproxime-se de um NPC no mapa para conversar',
                            iconEmoji: '💬',
                          });
                        }
                      } else if (action === 'toggle_audio') {
                        setIsBgmMuted((m) => {
                          const next = !m;
                          pushLootToastEntry({
                            text: next ? 'Áudio da Fase Silenciado' : 'Áudio da Fase Ativado',
                            iconEmoji: next ? '🔇' : '🎵',
                          });
                          return next;
                        });
                      } else if (action === 'quick_status') {
                        const lvl = project.player?.Progression_Global?.Level ?? project.player?.level ?? 1;
                        const hp = project.player?.Stats_Base?.HP_Max ?? 50;
                        pushLootToastEntry({
                          text: `Herói Nv.${lvl} • PV ${hp}/${hp}`,
                          iconEmoji: '⚡',
                        });
                      }
                    }}
                  />
                </div>
              )}

              {/* =========================================================================
                  SECÇÃO 4 NO EMULADOR: BARRAS DESLIZANTES EMPILHADAS DE COLETA NO CANTO DIREITO INTERNO DA TELA (FIEL À IMAGEM DE REFERÊNCIA)
                 ========================================================================= */}
              {lootToastConfig?.visible !== false && (lootToastEntries.length > 0 || isInlineEditing) && (() => {
                const effectiveSide: 'left' | 'right' =
                  (lootToastConfig?.edgeSide || lootToastConfig?.side || 'right') === 'left'
                    ? 'left'
                    : 'right';
                const innerBezelOffset = isWebFrameless ? 0 : 12;
                const yOffsetVal = lootToastConfig?.y ?? lootToastConfig?.yOffset ?? 0;

                return (
                  <div
                    onPointerDown={(e) => {
                      if (isInlineEditing) {
                        startInlineDrag(
                          e,
                          'btn-loot-toast',
                          lootToastConfig?.x || 0,
                          yOffsetVal,
                          effectiveSide === 'right' ? 'top_right' : 'top_left'
                        );
                      }
                    }}
                    className={`absolute z-60 select-none pointer-events-auto overflow-hidden ${
                      effectiveSide === 'right' ? 'pl-3 py-2' : 'pr-3 py-2'
                    } ${
                      isInlineEditing
                        ? `cursor-grab active:cursor-grabbing rounded-l-2xl ring-2 ${
                            selectedInlineId === 'btn-loot-toast' ||
                            draggingInlineElement === 'btn-loot-toast'
                              ? 'ring-emerald-400 bg-emerald-500/20'
                              : 'ring-emerald-400/70 ring-dashed bg-slate-950/20'
                          }`
                        : ''
                    }`}
                    style={{
                      ...(effectiveSide === 'right'
                        ? { right: `${innerBezelOffset}px` }
                        : { left: `${innerBezelOffset}px` }),
                      top: `${(isLandscape ? 112 : 210) + yOffsetVal}px`,
                    }}
                  >
                    {isInlineEditing && (
                      <div className="mb-1 px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 pointer-events-none select-none shadow">
                        📦 Barras de Coleta ({effectiveSide === 'right' ? 'Direita' : 'Esquerda'} • Y:{yOffsetVal})
                      </div>
                    )}
                    <SlidingLootToastStackHudWidget
                      entries={
                        lootToastEntries.length > 0
                          ? lootToastEntries
                          : [
                              {
                                id: 'inline-preview-1',
                                text: 'Cristal Coletado',
                                iconEmoji: '💎',
                                amount: 1,
                                createdAt: 1,
                              },
                              {
                                id: 'inline-preview-2',
                                text: 'Moedas de Ouro',
                                iconEmoji: '🪙',
                                amount: 120,
                                createdAt: 2,
                              },
                            ]
                      }
                      config={{
                        ...lootToastConfig,
                        side: effectiveSide,
                        edgeSide: effectiveSide,
                        y: 0,
                        yOffset: 0,
                      }}
                      isLandscape={isLandscape}
                      onDismiss={(id) =>
                        setLootToastEntries((prev) => prev.filter((item) => item.id !== id))
                      }
                    />
                  </div>
                );
              })()}

              {/* Botão da mochila com offset e escala dinâmicos */}
              {backpackConfig?.visible !== false && (
                <div
                  onPointerDown={(e) => {
                    if (isInlineEditing) {
                      startInlineDrag(e, 'btn-backpack', backpackConfig?.x || 0, backpackConfig?.y || 0);
                    }
                  }}
                  onClick={() => {
                    if (!isInlineEditing) {
                      setInventoryOpen((v) => !v);
                    }
                  }}
                  className={`absolute z-60 flex items-center justify-center select-none ${
                    isInlineEditing
                      ? `transition-none cursor-grab active:cursor-grabbing rounded-2xl ring-2 ${
                          selectedInlineId === 'btn-backpack' || draggingInlineElement === 'btn-backpack'
                            ? 'ring-emerald-400 ring-offset-2 ring-offset-slate-950 bg-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                            : 'ring-emerald-400/70 ring-dashed hover:ring-amber-400 bg-slate-950/30'
                        }`
                      : 'transition-transform duration-150 active:scale-95 cursor-pointer'
                  }`}
                  style={{
                    left: `calc(50% - 150px + ${backpackConfig?.x || 0}px)`,
                    bottom: `${68 + (backpackConfig?.y || 0)}px`,
                    width: '64px',
                    height: '64px',
                    transform: `scale(${backpackConfig?.scale || 1.0})`,
                    transformOrigin: 'center center',
                    opacity: backpackConfig?.opacity ?? 1.0,
                  }}
                  title={isInlineEditing ? 'Arraste para reposicionar a Mochila' : `Mochila do inventário (${backpackConfig?.shortcutKey || 'I'})`}
                >
                  {isInlineEditing && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 pointer-events-none select-none shadow">
                      🎒 Mochila (X:{backpackConfig?.x || 0}, Y:{backpackConfig?.y || 0})
                    </div>
                  )}
                  {effectiveWebMode && hudConfig?.webConfig?.showKeyBadges !== false && !isInlineEditing && (
                    <span className="absolute -top-1.5 -right-1.5 z-20 px-1.5 py-0.5 rounded-md bg-slate-950/95 border border-cyan-400/80 text-cyan-300 font-mono font-black text-[9px] shadow-md pointer-events-none">
                      {backpackConfig?.shortcutKey || 'I'}
                    </span>
                  )}
                  <img
                    src={backpackConfig?.customAssetUrl || mochilaPng}
                    alt="Mochila"
                    className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_6px_12px_rgba(0,0,0,0.7)]"
                  />
                </div>
              )}

              {/* Indicador WASD discreto quando o Joystick some no Modo WEB */}
              {effectiveWebMode && hudConfig?.webConfig?.hideJoystickInWeb !== false && !isInlineEditing && (
                <div className="absolute left-4 bottom-4 z-60 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-950/85 border border-cyan-500/40 backdrop-blur-md pointer-events-none select-none shadow-lg">
                  <span className="text-[10px] font-mono font-black text-cyan-300">
                    ⌨️ {hudConfig?.webConfig?.upKey || 'W'}
                    {hudConfig?.webConfig?.leftKey || 'A'}
                    {hudConfig?.webConfig?.downKey || 'S'}
                    {hudConfig?.webConfig?.rightKey || 'D'}
                  </span>
                  <span className="text-[9px] text-slate-400 font-semibold">Mover</span>
                </div>
              )}

              {/* Joystick premium com offset e escala dinâmicos (some automaticamente no Modo WEB quando configurado) */}
              {locomotion === 'joystick' &&
                joystickConfig?.visible !== false &&
                (!effectiveWebMode || hudConfig?.webConfig?.hideJoystickInWeb === false || isInlineEditing) && (
                <div
                  className={`absolute z-60 touch-none select-none pointer-events-auto ${
                    isInlineEditing
                      ? `cursor-grab active:cursor-grabbing rounded-full ring-2 ${
                          selectedInlineId === 'btn-joystick' || draggingInlineElement === 'btn-joystick'
                            ? 'ring-emerald-400 ring-offset-2 ring-offset-slate-950 bg-emerald-500/20 shadow-[0_0_25px_rgba(16,185,129,0.6)]'
                            : 'ring-emerald-400/70 ring-dashed hover:ring-amber-400 bg-slate-950/20'
                        }`
                      : 'cursor-pointer'
                  }`}
                  style={{
                    left: `calc(50% + ${joystickConfig?.x || 0}px)`,
                    bottom: `${56 + (joystickConfig?.y || 0)}px`,
                    transform: `translateX(-50%) scale(${joystickConfig?.scale || 1.0})`,
                    transformOrigin: 'center center',
                  }}
                  onPointerDown={(e) => {
                    if (isInlineEditing) {
                      startInlineDrag(e, 'btn-joystick', joystickConfig?.x || 0, joystickConfig?.y || 0);
                    }
                  }}
                  onMouseDown={(e) => {
                    if (isInlineEditing) return;
                    e.preventDefault();
                    setIsJoystickActive(true);
                    const rect = e.currentTarget.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    joystickCenterRef.current = { x: centerX, y: centerY };

                    const handleMouseMove = (moveEv: MouseEvent) => {
                      const visualScale = Math.max(0.2, rect.width / 96);
                      const localDx = (moveEv.clientX - centerX) / visualScale;
                      const localDy = (moveEv.clientY - centerY) / visualScale;
                      const dist = Math.hypot(localDx, localDy);
                      const maxRadius = joystickConfig?.maxRadius ?? 38;
                      const normX = dist > 0 ? (localDx / Math.max(dist, maxRadius)) : 0;
                      const normY = dist > 0 ? (localDy / Math.max(dist, maxRadius)) : 0;
                      setVector(Math.max(-1, Math.min(1, normX)), Math.max(-1, Math.min(1, normY)));
                    };

                    const handleMouseUp = () => {
                      setIsJoystickActive(false);
                      setVector(0, 0);
                      window.removeEventListener('mousemove', handleMouseMove);
                      window.removeEventListener('mouseup', handleMouseUp);
                    };

                    window.addEventListener('mousemove', handleMouseMove);
                    window.addEventListener('mouseup', handleMouseUp);
                  }}
                  onTouchStart={(e) => {
                    if (isInlineEditing) return;
                    setIsJoystickActive(true);
                    const touch = e.touches[0];
                    joystickTouchIdRef.current = touch.identifier;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const centerX = rect.left + rect.width / 2;
                    const centerY = rect.top + rect.height / 2;
                    joystickCenterRef.current = { x: centerX, y: centerY };

                    const handleTouchMove = (touchEv: TouchEvent) => {
                      for (let i = 0; i < touchEv.touches.length; i++) {
                        const t = touchEv.touches[i];
                        if (t.identifier === joystickTouchIdRef.current) {
                          const visualScale = Math.max(0.2, rect.width / 96);
                          const localDx = (t.clientX - centerX) / visualScale;
                          const localDy = (t.clientY - centerY) / visualScale;
                          const dist = Math.hypot(localDx, localDy);
                          const maxRadius = joystickConfig?.maxRadius ?? 38;
                          const normX = dist > 0 ? (localDx / Math.max(dist, maxRadius)) : 0;
                          const normY = dist > 0 ? (localDy / Math.max(dist, maxRadius)) : 0;
                          setVector(Math.max(-1, Math.min(1, normX)), Math.max(-1, Math.min(1, normY)));
                          break;
                        }
                      }
                    };

                    const handleTouchEnd = (endEv: TouchEvent) => {
                      let activeStill = false;
                      for (let i = 0; i < endEv.touches.length; i++) {
                        if (endEv.touches[i].identifier === joystickTouchIdRef.current) {
                          activeStill = true;
                          break;
                        }
                      }
                      if (!activeStill) {
                        setIsJoystickActive(false);
                        setVector(0, 0);
                        window.removeEventListener('touchmove', handleTouchMove);
                        window.removeEventListener('touchend', handleTouchEnd);
                        window.removeEventListener('touchcancel', handleTouchEnd);
                      }
                    };

                    window.addEventListener('touchmove', handleTouchMove);
                    window.addEventListener('touchend', handleTouchEnd);
                    window.addEventListener('touchcancel', handleTouchEnd);
                  }}
                >
                  {isInlineEditing && (
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 pointer-events-none select-none shadow">
                      🕹️ Joystick (X:{joystickConfig?.x || 0}, Y:{joystickConfig?.y || 0})
                    </div>
                  )}

                  {/* Base do Joystick (Disco) e Analógico (Knob) com parâmetros separados e caixas dimensionadas */}
                  <div
                    className="relative flex items-center justify-center select-none"
                    style={{
                      width: '96px',
                      height: '96px',
                      opacity: joystickConfig?.opacity ?? 1.0,
                    }}
                  >
                    {/* Disco Base com escala e opacidade próprias */}
                    <img
                      src={joystickConfig?.customDiscoUrl || discoPng}
                      alt="Direcional"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)]"
                      style={{
                        transform: `scale(${joystickConfig?.discoScale ?? 1.0})`,
                        opacity: joystickConfig?.discoOpacity ?? 1.0,
                      }}
                    />
                    {/* Wrapper de translação do analógico: knobRef cuida APENAS da translação física */}
                    <div
                      ref={knobRef}
                      className="absolute pointer-events-none flex items-center justify-center"
                      style={{
                        width: '48px',
                        height: '48px',
                        left: 'calc(50% - 24px)',
                        top: 'calc(50% - 24px)',
                        willChange: 'transform',
                      }}
                    >
                      {/* Elemento interno onde a escala configurada permanece 100% blindada e intacta */}
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{
                          transform: `scale(${joystickConfig?.knobScale ?? 1.0})`,
                          opacity: joystickConfig?.knobOpacity ?? 1.0,
                        }}
                      >
                        <img
                          src={joystickConfig?.customKnobUrl || botaoPng}
                          alt="Botão"
                          className="w-full h-full object-contain pointer-events-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.6)]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Dedinho: alterna toque-move com offset e escala dinâmicos */}
              {touchMoveConfig?.visible !== false && (() => {
                const hasTouchAsset = !!touchMoveConfig?.customAssetUrl;
                const isSelected = selectedInlineId === 'btn-touch' || draggingInlineElement === 'btn-touch';

                return (
                  <div
                    onPointerDown={(e) => {
                      if (isInlineEditing) {
                        startInlineDrag(e, 'btn-touch', touchMoveConfig?.x || 0, touchMoveConfig?.y || 0);
                      }
                    }}
                    onClick={() => {
                      if (isInlineEditing) return;
                      if (locomotion === 'joystick') {
                        setLocomotion('tap');
                        tapTargetRef.current = null;
                        tapWayRef.current = [];
                        stuckRef.current = null;
                      } else {
                        setLocomotion('joystick');
                        tapTargetRef.current = null;
                        tapWayRef.current = [];
                        stuckRef.current = null;
                        setIsJoystickActive(false);
                        setVector(0, 0);
                      }
                    }}
                    className={`absolute z-60 flex items-center justify-center select-none ${
                      isInlineEditing
                        ? `transition-none cursor-grab active:cursor-grabbing rounded-full ring-2 ${
                            isSelected
                              ? 'ring-emerald-400 ring-offset-2 ring-offset-slate-950 bg-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                              : 'ring-emerald-400/70 ring-dashed hover:ring-amber-400'
                          }`
                        : 'transition-all active:scale-95 cursor-pointer'
                    } ${
                      hasTouchAsset
                        ? 'bg-transparent border-0 shadow-none'
                        : `rounded-full border-2 backdrop-blur-md ${
                            locomotion === 'tap'
                              ? 'bg-amber-500/30 border-amber-300 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.7)]'
                              : 'bg-slate-950/80 border-slate-700 text-slate-300'
                          }`
                    }`}
                    style={{
                      left: `calc(50% + 86px + ${touchMoveConfig?.x || 0}px)`,
                      bottom: `${68 + (touchMoveConfig?.y || 0)}px`,
                      width: '56px',
                      height: '56px',
                      transform: `scale(${touchMoveConfig?.scale || 1.0})`,
                      transformOrigin: 'center center',
                      opacity: touchMoveConfig?.opacity ?? 1.0,
                    }}
                    title={
                      isInlineEditing
                        ? 'Arraste para reposicionar o Dedinho de Toque'
                        : locomotion === 'joystick'
                        ? 'Toque-move (esconde o joystick)'
                        : 'Voltar ao joystick'
                    }
                  >
                    {isInlineEditing && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 pointer-events-none select-none shadow">
                        👆 Toque (X:{touchMoveConfig?.x || 0}, Y:{touchMoveConfig?.y || 0})
                      </div>
                    )}
                    {effectiveWebMode && hudConfig?.webConfig?.showKeyBadges !== false && !isInlineEditing && (
                      <span className="absolute -top-1.5 -right-1.5 z-20 px-1.5 py-0.5 rounded-md bg-slate-950/95 border border-cyan-400/80 text-cyan-300 font-mono font-black text-[9px] shadow-md pointer-events-none">
                        {touchMoveConfig?.shortcutKey || 'M'}
                      </span>
                    )}
                    {hasTouchAsset ? (
                      <img
                        src={touchMoveConfig.customAssetUrl}
                        alt="Toque"
                        className={`w-full h-full object-contain select-none pointer-events-none ${
                          locomotion === 'tap'
                            ? 'drop-shadow-[0_0_12px_rgba(251,191,36,0.95)] scale-105'
                            : 'drop-shadow-[0_4px_10px_rgba(0,0,0,0.7)]'
                        }`}
                      />
                    ) : (
                      <MousePointerClick className="w-6 h-6" />
                    )}
                  </div>
                );
              })()}

              {/* Botões Customizados Criados no Módulo Telas */}
              {customHudButtons
                .filter((btn) => btn.visible !== false)
                .map((btn) => {
                  const hasCustomAsset = !!btn.assetUrl;
                  const isSelected = selectedInlineId === btn.id || draggingInlineElement === btn.id;

                  const baseStyle: React.CSSProperties = {
                    position: 'absolute',
                    zIndex: 60,
                    width: `${btn.size || 56}px`,
                    height: `${btn.size || 56}px`,
                    opacity: btn.opacity ?? 1.0,
                    transform: `scale(${btn.scale || 1.0})`,
                    transformOrigin: 'center center',
                  };

                  if (btn.anchor === 'bottom_right') {
                    baseStyle.right = `${Math.max(12, 16 - btn.x)}px`;
                    baseStyle.bottom = `${btn.y}px`;
                  } else if (btn.anchor === 'bottom_left') {
                    baseStyle.left = `${Math.max(12, 16 + btn.x)}px`;
                    baseStyle.bottom = `${btn.y}px`;
                  } else if (btn.anchor === 'top_right') {
                    baseStyle.right = `${Math.max(12, 16 - btn.x)}px`;
                    baseStyle.top = `${btn.y}px`;
                  } else if (btn.anchor === 'top_left') {
                    baseStyle.left = `${Math.max(12, 16 + btn.x)}px`;
                    baseStyle.top = `${btn.y}px`;
                  } else {
                    baseStyle.left = `calc(50% + ${btn.x}px)`;
                    baseStyle.bottom = `${btn.y}px`;
                    baseStyle.transform = `translateX(-50%) scale(${btn.scale || 1.0})`;
                  }

                  return (
                    <div
                      key={btn.id}
                      onPointerDown={(e) => {
                        if (isInlineEditing) {
                          startInlineDrag(e, btn.id, btn.x, btn.y, btn.anchor);
                        }
                      }}
                      onClick={() => {
                        if (!isInlineEditing) {
                          handleCustomHudButtonClick(btn);
                        }
                      }}
                      className={`flex items-center justify-center select-none ${
                        isInlineEditing
                          ? `transition-none cursor-grab active:cursor-grabbing ring-2 ${
                              isSelected
                                ? 'ring-emerald-400 ring-offset-2 ring-offset-slate-950 bg-emerald-500/25 shadow-[0_0_20px_rgba(16,185,129,0.6)]'
                                : 'ring-emerald-400/70 ring-dashed hover:ring-amber-400 bg-slate-950/20'
                            } ${
                              hasCustomAsset
                                ? 'rounded-2xl'
                                : btn.shape === 'square'
                                ? 'rounded-2xl'
                                : btn.shape === 'rounded'
                                ? 'rounded-3xl'
                                : 'rounded-full'
                            }`
                          : 'transition-all duration-100 active:scale-90 cursor-pointer'
                      } ${
                        hasCustomAsset
                          ? 'bg-transparent border-0 shadow-none'
                          : `${
                              btn.shape === 'square'
                                ? 'rounded-2xl'
                                : btn.shape === 'rounded'
                                ? 'rounded-3xl'
                                : 'rounded-full'
                            } border-[2.5px] drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] shadow-xl`
                      }`}
                      style={{
                        ...baseStyle,
                        backgroundColor: hasCustomAsset ? 'transparent' : (btn.backgroundColor || '#e11d48'),
                        borderColor: hasCustomAsset ? 'transparent' : (btn.borderColor || '#ffffff'),
                      }}
                      title={
                        isInlineEditing
                          ? `Arraste para reposicionar ${btn.name}`
                          : `${btn.name} (${btn.shortcutKey ? `[${btn.shortcutKey}]` : 'Ação'})`
                      }
                    >
                      {isInlineEditing && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap px-1.5 py-0.5 rounded bg-slate-950/95 border border-emerald-400/60 text-[9px] font-mono font-bold text-emerald-300 pointer-events-none select-none shadow">
                          🔘 {btn.name} (X:{btn.x}, Y:{btn.y})
                        </div>
                      )}
                      {effectiveWebMode && hudConfig?.webConfig?.showKeyBadges !== false && !isInlineEditing && btn.shortcutKey && (
                        <span className="absolute -top-1.5 -right-1.5 z-20 px-1.5 py-0.5 rounded-md bg-slate-950/95 border border-cyan-400/80 text-cyan-300 font-mono font-black text-[9px] shadow-md pointer-events-none">
                          {btn.shortcutKey}
                        </span>
                      )}
                      {hasCustomAsset ? (
                        <img
                          src={btn.assetUrl}
                          alt={btn.name}
                          className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]"
                        />
                      ) : (
                        <span className="text-white font-black text-sm select-none">
                          {btn.iconName === 'Swords'
                            ? '⚔️'
                            : btn.iconName === 'Zap'
                            ? '⚡'
                            : btn.iconName === 'Shield'
                            ? '🛡️'
                            : btn.iconName === 'Heart'
                            ? '❤️'
                            : btn.iconName === 'MessageSquare'
                            ? '💬'
                            : btn.shortcutKey || '★'}
                        </span>
                      )}
                    </div>
                  );
                })}
            </div>
          );
        })()}

        {/* Pop-up de Jornada (Quest Principal) & Tarefas (Side Quests) no Emulador */}
        {questPopupState.open && (
          <QuestJourneyPopupModal
            project={project}
            initialTab={questPopupState.initialTab}
            initialSelectedQuestId={questPopupState.questId}
            onClose={() => setQuestPopupState((prev) => ({ ...prev, open: false }))}
            onSwitchToBackpack={() => {
              setQuestPopupState((prev) => ({ ...prev, open: false }));
              setInventoryOpen(true);
            }}
            onUpdateProject={onUpdateProject}
            isInsideEmulator={true}
            isLandscape={isLandscape}
          />
        )}

        {/* Home Indicator Bar do Celular (oculto no Modo WEB Imersivo) */}
        {!isWebFrameless && <div className="w-32 h-1 bg-slate-500/80 rounded-full mx-auto mt-2.5" />}
      </div>
    </div>
  );
};

