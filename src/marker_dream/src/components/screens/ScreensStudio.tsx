import React, { useState, useRef, useEffect } from 'react';
import {
  Smartphone,
  Plus,
  Trash2,
  Sparkles,
  Images,
  Save,
  X,
  Play,
  Upload,
  User,
  RotateCcw,
  Sliders,
  Move,
  Eye,
  EyeOff,
  CircleDot,
  Disc,
  Package,
} from 'lucide-react';
import {
  MapProject,
  ProjectScreensConfig,
  GameScreenConfig,
  ScreenCustomButton,
  PlayerHudConfig,
  TopGlassBarIconSlotConfig,
  GalleryAsset,
} from '../../types/map';
import { readUploadedImage, readUploadedHudIcon } from '../../utils/tileGenerator';
import { InventoryManagerStudio } from '../inventory/InventoryManagerStudio';
import {
  PlayerHeaderHudWidget,
  QuestTrackerHudWidget,
  TopGlassAccessBarHudWidget,
  DEFAULT_TOP_GLASS_BAR_SLOTS,
  SlidingLootToastStackHudWidget,
  LootToastBarEntry,
  QuestJourneyPopupModal,
  getOrderedPhaseQuests,
  HudFourPointStarIcon,
  HudLockIcon,
} from './HudStatusAndQuestsWidgets';
import discoPng from '../../assets/disco.png';
import botaoPng from '../../assets/botao.png';
import mochilaPng from '../../assets/mochila.png';

export const UNIVERSAL_SCREENS_STORAGE_KEY = 'marker_dream_universal_screens_config_v2';

let memoryUniversalScreensConfig: ProjectScreensConfig | null = null;

export function loadUniversalScreensConfig(): ProjectScreensConfig | null {
  if (memoryUniversalScreensConfig && Array.isArray(memoryUniversalScreensConfig.screens) && memoryUniversalScreensConfig.screens.length > 0) {
    return memoryUniversalScreensConfig;
  }
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(UNIVERSAL_SCREENS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.screens) && parsed.screens.length > 0) {
      memoryUniversalScreensConfig = parsed as ProjectScreensConfig;
      return memoryUniversalScreensConfig;
    }
  } catch (err) {
    console.warn('Aviso ao ler configuração universal de HUD:', err);
  }
  return null;
}

export function saveUniversalScreensConfig(config: ProjectScreensConfig): void {
  memoryUniversalScreensConfig = config;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(UNIVERSAL_SCREENS_STORAGE_KEY, JSON.stringify(config));
  } catch (err) {
    console.warn('Aviso ao salvar configuração universal de HUD no localStorage (mantido em memória/IndexedDB):', err);
  }
}

interface Props {
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  galleryAssets?: GalleryAsset[];
  onOpenGallery?: () => void;
  onTestDialogue?: (markerId: string) => void;
  onOpenDialogueStudio?: (markerId: string) => void;
  onSaveLevel?: () => void;
  showToast?: (message: string) => void;
}

// Normaliza o ID de botões equivalentes entre Retrato e Paisagem (ex: btn-attack-default e btn-attack-landscape -> btn-attack)
export function getCanonicalHudButtonKey(id: string): string {
  return (id || '').replace(/-(default|landscape)$/, '');
}

// Aplica os assets da UI, ícones, cores e configurações visuais de sourceAssetsHud sobre targetPosHud,
// preservando estritamente o posicionamento independente (x, y, anchor, side, edgeSide, yOffset, scale) de targetPosHud.
export function mergeSharedHudAssetsPreservingPosition(
  sourceAssetsHud: PlayerHudConfig,
  targetPosHud: PlayerHudConfig
): PlayerHudConfig {
  const srcHeader = sourceAssetsHud.playerHeaderHud;
  const tgtHeader = targetPosHud.playerHeaderHud;

  const srcQuest = sourceAssetsHud.questTrackerHud;
  const tgtQuest = targetPosHud.questTrackerHud;

  const srcGlass = sourceAssetsHud.topGlassBarHud;
  const tgtGlass = targetPosHud.topGlassBarHud;

  const srcLoot = sourceAssetsHud.lootToastHud;
  const tgtLoot = targetPosHud.lootToastHud;

  const srcBackpack = sourceAssetsHud.backpackButton;
  const tgtBackpack = targetPosHud.backpackButton;

  const srcJoystick = sourceAssetsHud.joystick;
  const tgtJoystick = targetPosHud.joystick;

  const srcTouch = sourceAssetsHud.touchMoveButton;
  const tgtTouch = targetPosHud.touchMoveButton;

  const srcButtons = sourceAssetsHud.customButtons || [];
  const tgtButtons = targetPosHud.customButtons || [];

  const mergedButtons: ScreenCustomButton[] = srcButtons.map((srcBtn) => {
    const canonKey = getCanonicalHudButtonKey(srcBtn.id);
    const matchingTgt = tgtButtons.find((tb) => getCanonicalHudButtonKey(tb.id) === canonKey);
    if (matchingTgt) {
      return {
        ...srcBtn,
        // Preserva ID e posicionamento exclusivos desta orientação:
        id: matchingTgt.id,
        x: matchingTgt.x,
        y: matchingTgt.y,
        anchor: matchingTgt.anchor,
        scale: matchingTgt.scale,
      };
    }
    return { ...srcBtn };
  });

  const resolvedSlots = (
    srcGlass?.slots && srcGlass.slots.length > 0
      ? srcGlass.slots
      : tgtGlass?.slots && tgtGlass.slots.length > 0
      ? tgtGlass.slots
      : DEFAULT_TOP_GLASS_BAR_SLOTS
  ).map((slot) => ({ ...slot }));

  return {
    ...targetPosHud,
    playerHeaderHud: {
      ...(tgtHeader || {}),
      ...(srcHeader || {}),
      visible: srcHeader?.visible ?? tgtHeader?.visible ?? true,
      x: tgtHeader?.x ?? 0,
      y: tgtHeader?.y ?? 0,
      scale: tgtHeader?.scale ?? 0.9,
    },
    questTrackerHud: {
      ...(tgtQuest || {}),
      ...(srcQuest || {}),
      visible: srcQuest?.visible ?? tgtQuest?.visible ?? true,
      x: tgtQuest?.x ?? 0,
      y: tgtQuest?.y ?? 0,
      scale: tgtQuest?.scale ?? 0.9,
    },
    topGlassBarHud: {
      ...(tgtGlass || {}),
      ...(srcGlass || {}),
      visible: srcGlass?.visible ?? tgtGlass?.visible ?? true,
      slots: resolvedSlots,
      x: tgtGlass?.x ?? 0,
      y: tgtGlass?.y ?? 0,
      scale: tgtGlass?.scale ?? 0.9,
      layout: tgtGlass?.layout ?? srcGlass?.layout ?? 'row',
    },
    lootToastHud: {
      ...(tgtLoot || {}),
      ...(srcLoot || {}),
      visible: srcLoot?.visible ?? tgtLoot?.visible ?? true,
      x: tgtLoot?.x ?? 0,
      y: tgtLoot?.y ?? 0,
      yOffset: tgtLoot?.yOffset ?? tgtLoot?.y ?? 0,
      side: tgtLoot?.side ?? tgtLoot?.edgeSide ?? 'right',
      edgeSide: tgtLoot?.edgeSide ?? tgtLoot?.side ?? 'right',
      scale: tgtLoot?.scale ?? 1.0,
    },
    backpackButton: {
      ...(tgtBackpack || {}),
      ...(srcBackpack || {}),
      visible: srcBackpack?.visible ?? tgtBackpack?.visible ?? true,
      x: tgtBackpack?.x ?? 0,
      y: tgtBackpack?.y ?? 0,
      scale: tgtBackpack?.scale ?? 1.0,
    },
    joystick: {
      ...(tgtJoystick || {}),
      ...(srcJoystick || {}),
      visible: srcJoystick?.visible ?? tgtJoystick?.visible ?? true,
      x: tgtJoystick?.x ?? 0,
      y: tgtJoystick?.y ?? 0,
      scale: tgtJoystick?.scale ?? 1.0,
    },
    touchMoveButton: {
      ...(tgtTouch || {}),
      ...(srcTouch || {}),
      visible: srcTouch?.visible ?? tgtTouch?.visible ?? true,
      x: tgtTouch?.x ?? 0,
      y: tgtTouch?.y ?? 0,
      scale: tgtTouch?.scale ?? 1.0,
    },
    customButtons: mergedButtons,
  };
}

// Combina assets salvos entre a orientação primária e secundária para garantir que nenhum PNG importado antes seja perdido
function coalesceSharedHudAssets(primary: PlayerHudConfig, secondary: PlayerHudConfig): PlayerHudConfig {
  const priSlots = primary.topGlassBarHud?.slots || [];
  const secSlots = secondary.topGlassBarHud?.slots || [];
  const mergedSlots: TopGlassBarIconSlotConfig[] = [];
  for (let i = 0; i < 6; i++) {
    const pSlot = priSlots[i] || DEFAULT_TOP_GLASS_BAR_SLOTS[i];
    const sSlot = secSlots[i] || DEFAULT_TOP_GLASS_BAR_SLOTS[i];
    mergedSlots.push({
      ...sSlot,
      ...pSlot,
      customIconUrl: pSlot?.customIconUrl || sSlot?.customIconUrl,
    });
  }

  const priBtns = primary.customButtons || [];
  const secBtns = secondary.customButtons || [];
  const mergedBtns: ScreenCustomButton[] = priBtns.map((pBtn) => {
    const canonKey = getCanonicalHudButtonKey(pBtn.id);
    const sBtn = secBtns.find((sb) => getCanonicalHudButtonKey(sb.id) === canonKey);
    return {
      ...(sBtn || {}),
      ...pBtn,
      assetUrl: pBtn.assetUrl || sBtn?.assetUrl,
    };
  });

  return {
    ...secondary,
    ...primary,
    playerHeaderHud: {
      ...(secondary.playerHeaderHud || {}),
      ...(primary.playerHeaderHud || {}),
      visible: primary.playerHeaderHud?.visible ?? secondary.playerHeaderHud?.visible ?? true,
      customIconUrl: primary.playerHeaderHud?.customIconUrl || secondary.playerHeaderHud?.customIconUrl,
    },
    questTrackerHud: {
      ...(secondary.questTrackerHud || {}),
      ...(primary.questTrackerHud || {}),
      visible: primary.questTrackerHud?.visible ?? secondary.questTrackerHud?.visible ?? true,
    },
    topGlassBarHud: {
      ...(secondary.topGlassBarHud || {}),
      ...(primary.topGlassBarHud || {}),
      visible: primary.topGlassBarHud?.visible ?? secondary.topGlassBarHud?.visible ?? true,
      slots: mergedSlots,
    },
    lootToastHud: {
      ...(secondary.lootToastHud || {}),
      ...(primary.lootToastHud || {}),
      visible: primary.lootToastHud?.visible ?? secondary.lootToastHud?.visible ?? true,
    },
    backpackButton: {
      ...(secondary.backpackButton || {}),
      ...(primary.backpackButton || {}),
      visible: primary.backpackButton?.visible ?? secondary.backpackButton?.visible ?? true,
      customAssetUrl: primary.backpackButton?.customAssetUrl || secondary.backpackButton?.customAssetUrl,
    },
    joystick: {
      ...(secondary.joystick || {}),
      ...(primary.joystick || {}),
      visible: primary.joystick?.visible ?? secondary.joystick?.visible ?? true,
      customDiscoUrl: primary.joystick?.customDiscoUrl || secondary.joystick?.customDiscoUrl,
      customKnobUrl: primary.joystick?.customKnobUrl || secondary.joystick?.customKnobUrl,
    },
    touchMoveButton: {
      ...(secondary.touchMoveButton || {}),
      ...(primary.touchMoveButton || {}),
      visible: primary.touchMoveButton?.visible ?? secondary.touchMoveButton?.visible ?? true,
      customAssetUrl: primary.touchMoveButton?.customAssetUrl || secondary.touchMoveButton?.customAssetUrl,
    },
    customButtons: mergedBtns,
  };
}

// Configuração padrão de telas caso ainda não exista no projeto
export function getOrCreateScreensConfig(project: MapProject): ProjectScreensConfig {
  const defaultHudConfig: PlayerHudConfig = {
    playerHeaderHud: {
      visible: true,
      x: 0,
      y: 0,
      scale: 0.92,
      opacity: 1.0,
      showPlayerAvatar: true,
      ringColor: '#5c2604',
      circleBgColor: '#ffffff',
      hpBarColor: '#ff1a0a',
      expBarColor: '#ffcc00',
      numberFormat: 'padded_7',
    },
      questTrackerHud: {
      visible: true,
      x: 0,
      y: 0,
      scale: 0.95,
      opacity: 1.0,
      defaultTab: 'jornada',
      mainTabLabel: 'Jornada',
      sideTabLabel: 'Tarefas.',
      moreButtonLabel: 'Ver mais...',
      maxVisibleQuests: 2,
      showBackdrop: false,
      collapsible: true,
      defaultCollapsed: false,
    },
    topGlassBarHud: {
      visible: true,
      x: 0,
      y: 0,
      scale: 0.94,
      opacity: 1.0,
      glassTint: 'rgba(15, 23, 42, 0.44)',
      borderColor: '#fbbf24',
      collapsible: true,
      layout: 'row',
      slots: DEFAULT_TOP_GLASS_BAR_SLOTS,
    },
    lootToastHud: {
      visible: true,
      side: 'right',
      edgeSide: 'right',
      y: 0,
      yOffset: 0,
      scale: 1.0,
      opacity: 1.0,
      barColor: '#f59e0b',
      barFillColor: '#f59e0b',
      lipColor: '#14532d',
      bottomLipColor: '#14532d',
      textColor: '#1c1917',
      maxStack: 4,
      durationMs: 3200,
    },
    backpackButton: { visible: true, x: 0, y: 0, scale: 1.0, opacity: 1.0 },
    joystick: {
      visible: true,
      x: 0,
      y: 0,
      scale: 1.0,
      opacity: 1.0,
      discoScale: 1.0,
      discoOpacity: 1.0,
      maxRadius: 38,
      knobScale: 1.0,
      knobOpacity: 1.0,
    },
    touchMoveButton: { visible: true, x: 0, y: 0, scale: 1.0, opacity: 1.0 },
    customButtons: [
      {
        id: 'btn-attack-default',
        name: 'Ataque / Espada',
        iconName: 'Swords',
        anchor: 'bottom_right',
        x: -24,
        y: 68,
        scale: 1.0,
        size: 58,
        opacity: 1.0,
        visible: true,
        shape: 'circle',
        backgroundColor: '#e11d48',
        borderColor: '#ffffff',
        action: { type: 'player_action', action: 'attack' },
        shortcutKey: 'J',
      },
      {
        id: 'btn-jump-default',
        name: 'Dash Rápido',
        iconName: 'Zap',
        anchor: 'bottom_right',
        x: -94,
        y: 48,
        scale: 0.9,
        size: 50,
        opacity: 0.95,
        visible: true,
        shape: 'circle',
        backgroundColor: '#0284c7',
        borderColor: '#ffffff',
        action: { type: 'player_action', action: 'dash' },
        shortcutKey: 'Space',
      },
    ],
  };

  const defaultLandscapeHudConfig: PlayerHudConfig = {
    playerHeaderHud: {
      visible: true,
      x: 0,
      y: 0,
      scale: 0.85,
      opacity: 1.0,
      showPlayerAvatar: true,
      ringColor: '#5c2604',
      circleBgColor: '#ffffff',
      hpBarColor: '#ff1a0a',
      expBarColor: '#ffcc00',
      numberFormat: 'padded_7',
    },
    questTrackerHud: {
      visible: true,
      x: 0,
      y: 0,
      scale: 0.88,
      opacity: 1.0,
      defaultTab: 'jornada',
      mainTabLabel: 'Jornada',
      sideTabLabel: 'Tarefas.',
      moreButtonLabel: 'Ver mais...',
      maxVisibleQuests: 2,
      showBackdrop: false,
      collapsible: true,
      defaultCollapsed: false,
    },
    topGlassBarHud: {
      visible: true,
      x: 0,
      y: 0,
      scale: 0.9,
      opacity: 1.0,
      glassTint: 'rgba(15, 23, 42, 0.44)',
      borderColor: '#fbbf24',
      collapsible: true,
      layout: 'row',
      slots: DEFAULT_TOP_GLASS_BAR_SLOTS,
    },
    lootToastHud: {
      visible: true,
      side: 'right',
      edgeSide: 'right',
      y: 0,
      yOffset: 0,
      scale: 0.95,
      opacity: 1.0,
      barColor: '#f59e0b',
      barFillColor: '#f59e0b',
      lipColor: '#14532d',
      bottomLipColor: '#14532d',
      textColor: '#1c1917',
      maxStack: 4,
      durationMs: 3200,
    },
    backpackButton: { visible: true, x: 130, y: -12, scale: 0.92, opacity: 1.0, shortcutKey: 'I' },
    joystick: {
      visible: true,
      x: -245,
      y: -8,
      scale: 0.95,
      opacity: 1.0,
      discoScale: 1.0,
      discoOpacity: 1.0,
      maxRadius: 38,
      knobScale: 1.0,
      knobOpacity: 1.0,
    },
    touchMoveButton: { visible: true, x: -75, y: -12, scale: 0.92, opacity: 1.0, shortcutKey: 'M' },
    webConfig: {
      enabled: true,
      hideJoystickInWeb: true,
      upKey: 'W',
      downKey: 'S',
      leftKey: 'A',
      rightKey: 'D',
      allowArrowKeys: true,
      showKeyBadges: true,
    },
    customButtons: [
      {
        id: 'btn-attack-landscape',
        name: 'Ataque / Espada',
        iconName: 'Swords',
        anchor: 'bottom_right',
        x: -28,
        y: 42,
        scale: 1.0,
        size: 58,
        opacity: 1.0,
        visible: true,
        shape: 'circle',
        backgroundColor: '#e11d48',
        borderColor: '#ffffff',
        action: { type: 'player_action', action: 'attack' },
        shortcutKey: 'J',
      },
      {
        id: 'btn-jump-landscape',
        name: 'Dash Rápido',
        iconName: 'Zap',
        anchor: 'bottom_right',
        x: -98,
        y: 28,
        scale: 0.9,
        size: 50,
        opacity: 0.95,
        visible: true,
        shape: 'circle',
        backgroundColor: '#0284c7',
        borderColor: '#ffffff',
        action: { type: 'player_action', action: 'dash' },
        shortcutKey: 'Space',
      },
    ],
  };

  const landscapeScreenDefault: GameScreenConfig = {
    id: 'screen_player_hud_landscape',
    name: 'Player Paisagem (HUD Horizontal)',
    type: 'player_hud',
    description: 'Interface de controles horizontal (Modo Paisagem) com posicionamento independente e Modo Web (WASD)',
    hudConfig: defaultLandscapeHudConfig,
  };

  const inventoryScreenDefault: GameScreenConfig = {
    id: 'screen_inventory',
    name: 'Inventário Geral do Jogador',
    type: 'inventory',
    description: 'Interface global de inventário do jogador: grade de itens, equipamentos, drops e moedas persistentes entre todas as fases e mapa mundi',
  };

  if (project.screensConfig && project.screensConfig.screens.length > 0) {
    let realScreens = project.screensConfig.screens.filter(
      (s) => s.type === 'player_hud' || s.type === 'dialogue' || s.type === 'inventory'
    );
    if (realScreens.length > 0) {
      if (!realScreens.some((s) => s.id === 'screen_player_hud_landscape')) {
        const portraitIdx = realScreens.findIndex((s) => s.id === 'screen_player_hud');
        if (portraitIdx >= 0) {
          realScreens = [
            ...realScreens.slice(0, portraitIdx + 1),
            landscapeScreenDefault,
            ...realScreens.slice(portraitIdx + 1),
          ];
        } else {
          realScreens = [...realScreens, landscapeScreenDefault];
        }
      } else {
        realScreens = realScreens.map((s) => {
          if (s.id !== 'screen_player_hud_landscape') return s;
          const hc = s.hudConfig || defaultLandscapeHudConfig;
          return {
            ...s,
            hudConfig: {
              ...hc,
              backpackButton: {
                visible: true,
                ...(hc.backpackButton || {}),
                shortcutKey: hc.backpackButton?.shortcutKey ?? 'I',
              },
              touchMoveButton: {
                visible: true,
                ...(hc.touchMoveButton || {}),
                shortcutKey: hc.touchMoveButton?.shortcutKey ?? 'M',
              },
              webConfig: {
                enabled: true,
                hideJoystickInWeb: true,
                upKey: 'W',
                downKey: 'S',
                leftKey: 'A',
                rightKey: 'D',
                allowArrowKeys: true,
                showKeyBadges: true,
                ...(hc.webConfig || {}),
              },
            },
          };
        });
      }

      // Garante que playerHeaderHud, questTrackerHud, topGlassBarHud e lootToastHud existam em ambos os HUDs (Retrato e Paisagem)
      const universalSaved = loadUniversalScreensConfig();
      realScreens = realScreens.map((s) => {
        if (s.type !== 'player_hud') return s;
        const isLand = s.id === 'screen_player_hud_landscape';
        const baseDef = isLand ? defaultLandscapeHudConfig : defaultHudConfig;
        const univScreen = universalSaved?.screens.find((us) => us.id === s.id);
        const univHc = univScreen?.hudConfig;
        const projHc = s.hudConfig;
        // Prioriza a configuração viva do projeto (projHc) sobre o cache (univHc), preservando edições de PNG
        const hc: PlayerHudConfig = {
          ...baseDef,
          ...(univHc || {}),
          ...(projHc || {}),
        };
        const mergedTopGlass: PlayerHudConfig['topGlassBarHud'] = {
          ...baseDef.topGlassBarHud!,
          ...(univHc?.topGlassBarHud || {}),
          ...(projHc?.topGlassBarHud || {}),
        };
        const resolvedSlots =
          projHc?.topGlassBarHud?.slots && projHc.topGlassBarHud.slots.length > 0
            ? projHc.topGlassBarHud.slots
            : univHc?.topGlassBarHud?.slots && univHc.topGlassBarHud.slots.length > 0
            ? univHc.topGlassBarHud.slots
            : baseDef.topGlassBarHud!.slots;

        const rawCustomBtns =
          projHc?.customButtons && projHc.customButtons.length > 0
            ? projHc.customButtons
            : univHc?.customButtons && univHc.customButtons.length > 0
            ? univHc.customButtons
            : baseDef.customButtons || [];

        const migratedCustomBtns = rawCustomBtns.map((btn) => {
          if (
            btn.id === 'btn-jump-default' ||
            btn.id === 'btn-jump-landscape' ||
            (btn.action?.type === 'player_action' && btn.action.action === 'jump')
          ) {
            return {
              ...btn,
              name: btn.name === 'Pulo / Salto' ? 'Dash Rápido' : btn.name,
              action: { type: 'player_action' as const, action: 'dash' as const },
            };
          }
          return btn;
        });

        return {
          ...s,
          hudConfig: {
            ...baseDef,
            ...hc,
            customButtons: migratedCustomBtns,
            playerHeaderHud: {
              ...baseDef.playerHeaderHud!,
              ...(univHc?.playerHeaderHud || {}),
              ...(projHc?.playerHeaderHud || {}),
            },
            questTrackerHud: {
              ...baseDef.questTrackerHud!,
              ...(univHc?.questTrackerHud || {}),
              ...(projHc?.questTrackerHud || {}),
            },
            topGlassBarHud: {
              ...mergedTopGlass,
              borderColor:
                !mergedTopGlass?.borderColor ||
                mergedTopGlass.borderColor.includes('255, 255, 255')
                  ? '#fbbf24'
                  : mergedTopGlass.borderColor,
              glassTint:
                !mergedTopGlass?.glassTint ||
                mergedTopGlass.glassTint.includes('255, 255, 255')
                  ? 'rgba(15, 23, 42, 0.44)'
                  : mergedTopGlass.glassTint,
              slots: resolvedSlots,
            },
            lootToastHud: {
              ...baseDef.lootToastHud!,
              ...(univHc?.lootToastHud || {}),
              ...(projHc?.lootToastHud || {}),
              side:
                projHc?.lootToastHud?.edgeSide ||
                projHc?.lootToastHud?.side ||
                univHc?.lootToastHud?.edgeSide ||
                univHc?.lootToastHud?.side ||
                'right',
              edgeSide:
                projHc?.lootToastHud?.edgeSide ||
                projHc?.lootToastHud?.side ||
                univHc?.lootToastHud?.edgeSide ||
                univHc?.lootToastHud?.side ||
                'right',
            },
          },
        };
      });

      // Unifica os assets visuais da UI entre Retrato e Paisagem preservando o posicionamento independente de cada orientação
      const portraitSc = realScreens.find((s) => s.id === 'screen_player_hud');
      const landscapeSc = realScreens.find((s) => s.id === 'screen_player_hud_landscape');
      if (portraitSc?.hudConfig && landscapeSc?.hudConfig) {
        const isLandscapeActive = project.screensConfig?.activeScreenId === 'screen_player_hud_landscape';
        const primaryHc = isLandscapeActive ? landscapeSc.hudConfig : portraitSc.hudConfig;
        const secondaryHc = isLandscapeActive ? portraitSc.hudConfig : landscapeSc.hudConfig;
        const unifiedAssetsHc = coalesceSharedHudAssets(primaryHc, secondaryHc);
        realScreens = realScreens.map((s) => {
          if (s.id === 'screen_player_hud') {
            return {
              ...s,
              hudConfig: mergeSharedHudAssetsPreservingPosition(unifiedAssetsHc, portraitSc.hudConfig!),
            };
          }
          if (s.id === 'screen_player_hud_landscape') {
            return {
              ...s,
              hudConfig: mergeSharedHudAssetsPreservingPosition(unifiedAssetsHc, landscapeSc.hudConfig!),
            };
          }
          return s;
        });
      }

      // Garante que a tela de Inventário Geral esteja presente
      if (!realScreens.some((s) => s.id === 'screen_inventory' || s.type === 'inventory')) {
        realScreens.push(inventoryScreenDefault);
      }

      return {
        ...project.screensConfig,
        screens: realScreens,
        activeScreenId: realScreens.some((s) => s.id === project.screensConfig?.activeScreenId)
          ? project.screensConfig.activeScreenId
          : 'screen_player_hud',
      };
    }
  }

  const universalFallback = loadUniversalScreensConfig();
  if (universalFallback && universalFallback.screens.length > 0) {
    return universalFallback;
  }

  const defaultScreens: GameScreenConfig[] = [
    {
      id: 'screen_player_hud',
      name: 'Player Retrato (HUD)',
      type: 'player_hud',
      description: 'Interface de controles vertical (Modo Retrato) na fase ativa do emulador',
      hudConfig: defaultHudConfig,
    },
    landscapeScreenDefault,
    {
      id: 'screen_dialogue',
      name: 'Tela Oficial de Diálogos',
      type: 'dialogue',
      description: 'Tela de diálogo cinematográfica com o personagem, balão oficial e escolhas',
    },
    inventoryScreenDefault,
  ];

  return {
    activeScreenId: 'screen_player_hud',
    screens: defaultScreens,
  };
}

export const ScreensStudio: React.FC<Props> = ({
  project,
  onUpdateProject,
  galleryAssets = [],
  onTestDialogue,
  onOpenDialogueStudio,
  onSaveLevel,
  showToast,
}) => {
  const screensConfig = getOrCreateScreensConfig(project);
  const activeScreen =
    screensConfig.screens.find((s) => s.id === screensConfig.activeScreenId) ||
    screensConfig.screens[0];

  const hudConfig: PlayerHudConfig = activeScreen.hudConfig || {
    backpackButton: { visible: true, x: 0, y: 0, scale: 1.0, opacity: 1.0 },
    joystick: {
      visible: true,
      x: 0,
      y: 0,
      scale: 1.0,
      opacity: 1.0,
      discoScale: 1.0,
      discoOpacity: 1.0,
      maxRadius: 38,
      knobScale: 1.0,
      knobOpacity: 1.0,
    },
    touchMoveButton: { visible: true, x: 0, y: 0, scale: 1.0, opacity: 1.0 },
    customButtons: [],
  };

  const [selectedButtonId, setSelectedButtonId] = useState<string | null>('btn-player-header');
  const [elementCategory, setElementCategory] = useState<'all' | 'status' | 'controls' | 'actions' | 'quests'>('all');
  const [isWebKeyboardExpanded, setIsWebKeyboardExpanded] = useState<boolean>(false);
  const [assetPickerOpen, setAssetPickerOpen] = useState<boolean>(false);
  const [targetAssetButtonId, setTargetAssetButtonId] = useState<string | null>(null);
  const [targetUploadButtonId, setTargetUploadButtonId] = useState<string | null>(null);
  const [capturingKeyFor, setCapturingKeyFor] = useState<string | null>(null);
  const [previewQuestTab, setPreviewQuestTab] = useState<'jornada' | 'tarefas'>('jornada');
  const [questPopupModalState, setQuestPopupModalState] = useState<{
    open: boolean;
    initialTab: 'jornada' | 'tarefas';
    questId?: string;
  }>({ open: false, initialTab: 'jornada' });
  const [previewLootStack, setPreviewLootStack] = useState<LootToastBarEntry[]>([
    { id: 'demo-1', text: 'Cristal de Mercador', iconEmoji: '💎', amount: 1, createdAt: 1 },
    { id: 'demo-2', text: 'Minério Booblerock', iconEmoji: '🪨', amount: 2, createdAt: 2 },
    { id: 'demo-3', text: 'Moedas de Ouro', iconEmoji: '🪙', amount: 120, createdAt: 3 },
  ]);

  const handlePushPreviewLootToast = () => {
    const samples = [
      { text: 'Cristal de Mercador', iconEmoji: '💎', amount: 1 },
      { text: 'Minério Booblerock', iconEmoji: '🪨', amount: 1 },
      { text: 'Recompensa de Quest', iconEmoji: '🏆', amount: 200 },
      { text: 'Poção de Vida', iconEmoji: '🧪', amount: 2 },
      { text: 'Ouro da Caravana', iconEmoji: '🪙', amount: 150 },
    ];
    const pick = samples[Math.floor(Math.random() * samples.length)];
    const id = `demo-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setPreviewLootStack((prev) => [
      ...prev.slice(-5),
      { id, text: pick.text, iconEmoji: pick.iconEmoji, amount: pick.amount, createdAt: Date.now() },
    ]);
  };

  // Estado interativo para teste de arrasto do analógico no painel
  const [previewKnobPos, setPreviewKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isPreviewDragging, setIsPreviewDragging] = useState<boolean>(false);
  const previewCenterRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Captura interativa de tecla para o Modo WEB na Tela Paisagem
  useEffect(() => {
    if (!capturingKeyFor) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        setCapturingKeyFor(null);
        return;
      }
      const keyLabel =
        e.code === 'Space' || e.key === ' '
          ? 'Space'
          : e.key.length === 1
          ? e.key.toUpperCase()
          : e.key;

      const curWeb = hudConfig.webConfig || {
        enabled: true,
        hideJoystickInWeb: true,
        upKey: 'W',
        downKey: 'S',
        leftKey: 'A',
        rightKey: 'D',
        allowArrowKeys: true,
        showKeyBadges: true,
      };

      if (capturingKeyFor === 'web-up') {
        updateHudConfig({ webConfig: { ...curWeb, upKey: keyLabel } });
      } else if (capturingKeyFor === 'web-down') {
        updateHudConfig({ webConfig: { ...curWeb, downKey: keyLabel } });
      } else if (capturingKeyFor === 'web-left') {
        updateHudConfig({ webConfig: { ...curWeb, leftKey: keyLabel } });
      } else if (capturingKeyFor === 'web-right') {
        updateHudConfig({ webConfig: { ...curWeb, rightKey: keyLabel } });
      } else if (capturingKeyFor === 'btn-backpack') {
        updateHudConfig({
          backpackButton: {
            visible: true,
            ...(hudConfig.backpackButton || {}),
            shortcutKey: keyLabel,
          },
        });
      } else if (capturingKeyFor === 'btn-touchmove') {
        updateHudConfig({
          touchMoveButton: {
            visible: true,
            ...(hudConfig.touchMoveButton || {}),
            shortcutKey: keyLabel,
          },
        });
      } else {
        const updatedBtns = hudConfig.customButtons.map((b) =>
          b.id === capturingKeyFor ? { ...b, shortcutKey: keyLabel } : b
        );
        updateHudConfig({ customButtons: updatedBtns });
      }
      showToast?.(`⌨️ Tecla [${keyLabel}] vinculada com sucesso!`);
      setCapturingKeyFor(null);
    };
    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true });
  });

  const effectiveGalleryAssets =
    galleryAssets && galleryAssets.length > 0 ? galleryAssets : project.galleryAssets || [];

  const updateScreensConfig = (newConfig: ProjectScreensConfig) => {
    saveUniversalScreensConfig(newConfig);
    onUpdateProject({ screensConfig: newConfig });
  };

  const updateActiveScreen = (updates: Partial<GameScreenConfig>) => {
    const updatedScreens = screensConfig.screens.map((s) =>
      s.id === activeScreen.id ? { ...s, ...updates } : s
    );
    updateScreensConfig({
      ...screensConfig,
      screens: updatedScreens,
    });
  };

  const updateHudConfig = (updates: Partial<PlayerHudConfig>) => {
    const nextActiveHud: PlayerHudConfig = {
      ...hudConfig,
      ...updates,
    };
    const updatedScreens = screensConfig.screens.map((s) => {
      if (s.id === activeScreen.id) {
        return { ...s, hudConfig: nextActiveHud };
      }
      if (s.type === 'player_hud') {
        const siblingHud = s.hudConfig || hudConfig;
        return {
          ...s,
          hudConfig: mergeSharedHudAssetsPreservingPosition(nextActiveHud, siblingHud),
        };
      }
      return s;
    });
    updateScreensConfig({
      ...screensConfig,
      screens: updatedScreens,
    });
  };

  // Sincroniza os 6 slots da Cápsula de Vidro simultaneamente no HUD Retrato e Paisagem
  const updateGlassBarSlotsBothScreens = (nextSlots: TopGlassBarIconSlotConfig[]) => {
    const updatedScreens = screensConfig.screens.map((s) => {
      if (s.type !== 'player_hud') return s;
      const curHc = s.hudConfig || hudConfig;
      const curGlass = curHc.topGlassBarHud || {
        visible: true,
        x: 0,
        y: 0,
        scale: 0.94,
        opacity: 1.0,
        glassTint: 'rgba(15, 23, 42, 0.44)',
        borderColor: '#fbbf24',
        collapsible: true,
        layout: 'row' as const,
      };
      return {
        ...s,
        hudConfig: {
          ...curHc,
          topGlassBarHud: {
            ...curGlass,
            visible: curGlass.visible !== false,
            slots: nextSlots.map((slot) => ({ ...slot })),
          },
        },
      };
    });
    updateScreensConfig({
      ...screensConfig,
      screens: updatedScreens,
    });
  };

  // Upload direto de imagem do computador para qualquer botão ou parte do joystick
  const handleUploadButtonAsset = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    const uploadTargetId = targetUploadButtonId;
    inputEl.value = '';
    if (!file || !uploadTargetId) return;
    try {
      const res = await readUploadedHudIcon(file, 256);

      if (uploadTargetId === 'btn-player-header') {
        updateHudConfig({
          playerHeaderHud: {
            visible: true,
            ...(hudConfig.playerHeaderHud || {}),
            customIconUrl: res.dataUrl,
          },
        });
        showToast?.('🛡️ Ícone circular do Player aplicado no Header HUD!');
      } else if (uploadTargetId === 'btn-backpack') {
        updateHudConfig({
          backpackButton: {
            ...hudConfig.backpackButton,
            visible: true,
            customAssetUrl: res.dataUrl,
          },
        });
        showToast?.('🎒 Imagem personalizada da Mochila aplicada!');
      } else if (uploadTargetId === 'btn-joystick-disco') {
        updateHudConfig({
          joystick: {
            ...hudConfig.joystick,
            visible: true,
            customDiscoUrl: res.dataUrl,
          },
        });
        showToast?.('💿 Base / Disco do Joystick atualizada com sucesso!');
      } else if (uploadTargetId === 'btn-joystick-knob') {
        updateHudConfig({
          joystick: {
            ...hudConfig.joystick,
            visible: true,
            customKnobUrl: res.dataUrl,
          },
        });
        showToast?.('🔘 Botão Analógico do Joystick atualizado com sucesso!');
      } else if (uploadTargetId === 'btn-touchmove') {
        updateHudConfig({
          touchMoveButton: {
            ...hudConfig.touchMoveButton,
            visible: true,
            customAssetUrl: res.dataUrl,
          },
        });
        showToast?.('👆 Imagem personalizada do Botão de Toque aplicada!');
      } else if (uploadTargetId.startsWith('btn-glass-slot-')) {
        const slotIdx = parseInt(uploadTargetId.replace('btn-glass-slot-', ''), 10);
        const raw =
          hudConfig.topGlassBarHud?.slots && hudConfig.topGlassBarHud.slots.length > 0
            ? hudConfig.topGlassBarHud.slots
            : DEFAULT_TOP_GLASS_BAR_SLOTS;
        const curSlots: TopGlassBarIconSlotConfig[] = [];
        for (let i = 0; i < 6; i++) {
          curSlots.push({ ...(raw[i] || DEFAULT_TOP_GLASS_BAR_SLOTS[i]) });
        }
        if (slotIdx >= 0 && slotIdx < 6) {
          curSlots[slotIdx] = {
            ...curSlots[slotIdx],
            customIconUrl: res.dataUrl,
          };
        }
        updateGlassBarSlotsBothScreens(curSlots);
        showToast?.(`🖼️ PNG importado com sucesso para o Ícone Circular #${slotIdx + 1}!`);
      } else {
        const updated = hudConfig.customButtons.map((b) =>
          b.id === uploadTargetId ? { ...b, assetUrl: res.dataUrl } : b
        );
        updateHudConfig({ customButtons: updated });
        showToast?.('✨ Imagem personalizada do botão de ação aplicada!');
      }
    } catch (err) {
      console.error(err);
      showToast?.('❌ Erro ao ler arquivo de imagem.');
    }
  };

  const triggerUploadFor = (buttonId: string) => {
    setTargetUploadButtonId(buttonId);
    fileInputRef.current?.click();
  };

  const handleSelectAssetFromGallery = (assetUrl: string) => {
    if (!targetAssetButtonId) return;

    if (targetAssetButtonId === 'btn-player-header') {
      updateHudConfig({
        playerHeaderHud: {
          visible: true,
          ...(hudConfig.playerHeaderHud || {}),
          customIconUrl: assetUrl,
        },
      });
      showToast?.('🛡️ Ícone circular do Header atualizado pela galeria!');
    } else if (targetAssetButtonId === 'btn-backpack') {
      updateHudConfig({
        backpackButton: {
          ...hudConfig.backpackButton,
          visible: true,
          customAssetUrl: assetUrl,
        },
      });
      showToast?.('🎒 Asset da Mochila atualizado pela galeria!');
    } else if (targetAssetButtonId === 'btn-joystick-disco') {
      updateHudConfig({
        joystick: {
          ...hudConfig.joystick,
          visible: true,
          customDiscoUrl: assetUrl,
        },
      });
      showToast?.('💿 Base do Joystick atualizada pela galeria!');
    } else if (targetAssetButtonId === 'btn-joystick-knob') {
      updateHudConfig({
        joystick: {
          ...hudConfig.joystick,
          visible: true,
          customKnobUrl: assetUrl,
        },
      });
      showToast?.('🔘 Analógico do Joystick atualizado pela galeria!');
    } else if (targetAssetButtonId === 'btn-touchmove') {
      updateHudConfig({
        touchMoveButton: {
          ...hudConfig.touchMoveButton,
          visible: true,
          customAssetUrl: assetUrl,
        },
      });
      showToast?.('👆 Botão de Toque atualizado pela galeria!');
    } else if (targetAssetButtonId.startsWith('btn-glass-slot-')) {
      const slotIdx = parseInt(targetAssetButtonId.replace('btn-glass-slot-', ''), 10);
      const raw =
        hudConfig.topGlassBarHud?.slots && hudConfig.topGlassBarHud.slots.length > 0
          ? hudConfig.topGlassBarHud.slots
          : DEFAULT_TOP_GLASS_BAR_SLOTS;
      const curSlots: TopGlassBarIconSlotConfig[] = [];
      for (let i = 0; i < 6; i++) {
        curSlots.push({ ...(raw[i] || DEFAULT_TOP_GLASS_BAR_SLOTS[i]) });
      }
      if (slotIdx >= 0 && slotIdx < 6) {
        curSlots[slotIdx] = {
          ...curSlots[slotIdx],
          customIconUrl: assetUrl,
        };
      }
      updateGlassBarSlotsBothScreens(curSlots);
      showToast?.(`🖼️ Ícone Circular #${slotIdx + 1} atualizado pela galeria!`);
    } else {
      const updated = hudConfig.customButtons.map((b) =>
        b.id === targetAssetButtonId ? { ...b, assetUrl } : b
      );
      updateHudConfig({ customButtons: updated });
      showToast?.('✨ Asset do botão atualizado pela galeria!');
    }

    setAssetPickerOpen(false);
    setTargetAssetButtonId(null);
  };

  const handleAddNewButton = () => {
    const newBtn: ScreenCustomButton = {
      id: `btn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Botão de Ação ${hudConfig.customButtons.length + 1}`,
      iconName: 'Sparkles',
      anchor: 'bottom_right',
      x: -30 - hudConfig.customButtons.length * 20,
      y: 130 + (hudConfig.customButtons.length % 2) * 20,
      scale: 1.0,
      size: 54,
      opacity: 1.0,
      visible: true,
      shape: 'circle',
      backgroundColor: '#f59e0b',
      borderColor: '#ffffff',
      action: { type: 'player_action', action: 'jump' },
      shortcutKey: 'K',
    };

    updateHudConfig({
      customButtons: [...hudConfig.customButtons, newBtn],
    });
    setSelectedButtonId(newBtn.id);
    showToast?.(`✨ Novo botão "${newBtn.name}" criado!`);
  };

  const handleDeleteButton = (btnId: string) => {
    const updated = hudConfig.customButtons.filter((b) => b.id !== btnId);
    updateHudConfig({ customButtons: updated });
    if (selectedButtonId === btnId) {
      setSelectedButtonId('btn-joystick');
    }
    showToast?.('🗑️ Botão removido do HUD.');
  };

  const updateCustomButton = (btnId: string, updates: Partial<ScreenCustomButton>) => {
    const updated = hudConfig.customButtons.map((b) =>
      b.id === btnId ? { ...b, ...updates } : b
    );
    updateHudConfig({ customButtons: updated });
  };

  const selectedCustomButton = hudConfig.customButtons.find((b) => b.id === selectedButtonId);

  // Diálogos reais do mapa
  const dialogueMarkers = project.markers.filter(
    (m) =>
      m.type === 'npc' ||
      m.dialogueEnabled === true ||
      Boolean(m.dialogueText) ||
      (m.dialogueSteps && m.dialogueSteps.length > 0) ||
      (m.npcPhrases && m.npcPhrases.length > 0) ||
      Boolean(m.quest) ||
      m.eventKind === 'duel'
  );

  const nonDialogueMarkers = project.markers.filter(
    (m) => !dialogueMarkers.some((dm) => dm.id === m.id)
  );

  // Parâmetros do Joystick com fallbacks seguros
  const jCfg = hudConfig.joystick || { visible: true };
  const jScale = jCfg.scale ?? 1.0;
  const jOpacity = jCfg.opacity ?? 1.0;
  const jX = jCfg.x ?? 0;
  const jY = jCfg.y ?? 0;
  const jDiscoScale = jCfg.discoScale ?? 1.0;
  const jDiscoOpacity = jCfg.discoOpacity ?? 1.0;
  const jMaxRadius = jCfg.maxRadius ?? 38;
  const jKnobScale = jCfg.knobScale ?? 1.0;
  const jKnobOpacity = jCfg.knobOpacity ?? 1.0;

  // Lógica de arrasto interativo do preview do joystick
  const handlePreviewMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsPreviewDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    previewCenterRef.current = { x: cx, y: cy };

    const updateKnob = (clientX: number, clientY: number) => {
      const dx = clientX - cx;
      const dy = clientY - cy;
      const dist = Math.hypot(dx, dy);
      const limit = jMaxRadius;
      if (dist <= limit) {
        setPreviewKnobPos({ x: dx, y: dy });
      } else {
        const ratio = limit / dist;
        setPreviewKnobPos({ x: dx * ratio, y: dy * ratio });
      }
    };

    updateKnob(e.clientX, e.clientY);

    const onMove = (ev: MouseEvent) => {
      updateKnob(ev.clientX, ev.clientY);
    };

    const onUp = () => {
      setIsPreviewDragging(false);
      setPreviewKnobPos({ x: 0, y: 0 });
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 text-slate-100 select-none overflow-hidden">
      {/* Input de arquivo invisível para upload de imagem de qualquer botão */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/svg+xml"
        className="hidden"
        onChange={handleUploadButtonAsset}
      />

      {/* Barra de Seleção de Tela Limpa & Unificada */}
      <div className="px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => {
              if (selectedButtonId) {
                const portraitSc = screensConfig.screens.find((s) => s.id === 'screen_player_hud');
                const matchBtn = portraitSc?.hudConfig?.customButtons?.find(
                  (b) => getCanonicalHudButtonKey(b.id) === getCanonicalHudButtonKey(selectedButtonId)
                );
                if (matchBtn) setSelectedButtonId(matchBtn.id);
              }
              updateScreensConfig({
                ...screensConfig,
                activeScreenId: 'screen_player_hud',
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeScreen.id === 'screen_player_hud'
                ? 'bg-indigo-600 text-white shadow-sm font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>📱 Retrato (9:16)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedButtonId) {
                const landSc = screensConfig.screens.find((s) => s.id === 'screen_player_hud_landscape');
                const matchBtn = landSc?.hudConfig?.customButtons?.find(
                  (b) => getCanonicalHudButtonKey(b.id) === getCanonicalHudButtonKey(selectedButtonId)
                );
                if (matchBtn) setSelectedButtonId(matchBtn.id);
              }
              updateScreensConfig({
                ...screensConfig,
                activeScreenId: 'screen_player_hud_landscape',
              });
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeScreen.id === 'screen_player_hud_landscape'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🖥️ Paisagem (16:9)</span>
          </button>
          <button
            type="button"
            onClick={() =>
              updateScreensConfig({
                ...screensConfig,
                activeScreenId: 'screen_dialogue',
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeScreen.type === 'dialogue'
                ? 'bg-emerald-600 text-white shadow-sm font-black'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>💬 Diálogos ({dialogueMarkers.length})</span>
          </button>
          <button
            type="button"
            onClick={() =>
              updateScreensConfig({
                ...screensConfig,
                activeScreenId: 'screen_inventory',
              })
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeScreen.type === 'inventory'
                ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <span>🎒 Inventário ({project.playerInventory?.items?.length || 5})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              setQuestPopupModalState({
                open: true,
                initialTab: 'jornada',
              })
            }
            className="px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 shadow-sm cursor-pointer transition-all"
            title="Abrir Pop-up de Jornada (Quest Principal) e Tarefas (Side Quests)"
          >
            <Sparkles className="w-3.5 h-3.5 text-slate-950" />
            <span>Pop-up Quests</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onSaveLevel) {
                onSaveLevel();
              } else {
                showToast?.('💾 Telas salvas com sucesso no projeto!');
              }
            }}
            className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            title="Salvar alterações nas telas"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Salvar</span>
          </button>
        </div>
      </div>

      {/* 3. Conteúdo da Tela Ativa */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* =========================================================================
            TELA 1: PLAYER FASE (HUD DE GAMEPLAY)
           ========================================================================= */}
        {activeScreen.type === 'player_hud' && (
          <div className="space-y-4">
            {/* =========================================================================
                CONFIGURAÇÃO EXCLUSIVA DO BOTÃO WEB (COLAPSÁVEL & ENXUTA NO MODO PAISAGEM)
               ========================================================================= */}
            {activeScreen.id === 'screen_player_hud_landscape' &&
              (elementCategory === 'all' || elementCategory === 'controls') && (() => {
              const webCfg = hudConfig.webConfig || {
                enabled: true,
                hideJoystickInWeb: true,
                upKey: 'W',
                downKey: 'S',
                leftKey: 'A',
                rightKey: 'D',
                allowArrowKeys: true,
                showKeyBadges: true,
              };

              return (
                <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 overflow-hidden shadow-lg transition-all">
                  <div
                    onClick={() => setIsWebKeyboardExpanded((prev) => !prev)}
                    className="p-3.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-slate-850/80 transition-colors flex-wrap"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-xs">
                        ⌨️
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-black text-white">
                            Teclado &amp; Movimentação WASD (Modo Paisagem)
                          </h4>
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold ${
                            webCfg.enabled !== false
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {webCfg.enabled !== false ? 'Ativo' : 'Desativado'}
                          </span>
                        </div>
                        <p className="text-[10.5px] text-slate-400">
                          WASD: [{webCfg.upKey || 'W'}] [{webCfg.leftKey || 'A'}] [{webCfg.downKey || 'S'}] [{webCfg.rightKey || 'D'}] • Joystick Oculto na Web: {webCfg.hideJoystickInWeb !== false ? 'SIM' : 'NÃO'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          updateHudConfig({
                            webConfig: {
                              ...webCfg,
                              enabled: webCfg.enabled === false ? true : false,
                            },
                          });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold cursor-pointer transition-all ${
                          webCfg.enabled !== false
                            ? 'bg-cyan-500 text-slate-950 font-black'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {webCfg.enabled !== false ? 'Ligado' : 'Desligado'}
                      </button>
                      <span className="text-xs text-cyan-400 font-bold px-2 py-1 rounded-lg bg-slate-800 flex items-center gap-1">
                        {isWebKeyboardExpanded ? '▲ Recolher' : '▼ Configurar Teclas'}
                      </span>
                    </div>
                  </div>

                  {isWebKeyboardExpanded && (
                    <div className="p-4 pt-0 space-y-3.5 border-t border-slate-800 mt-1">
                      {/* Opções de Comportamento do Joystick e Etiquetas no Modo WEB */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
                        <button
                          type="button"
                          onClick={() =>
                            updateHudConfig({
                              webConfig: {
                                ...webCfg,
                                hideJoystickInWeb: webCfg.hideJoystickInWeb === false ? true : false,
                              },
                            })
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            webCfg.hideJoystickInWeb !== false
                              ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200'
                              : 'bg-slate-900/80 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>
                            <span className="text-[11px] font-bold block text-white">
                              Ocultar Joystick na Web
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Some o analógico se estiver no teclado
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            webCfg.hideJoystickInWeb !== false ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {webCfg.hideJoystickInWeb !== false ? 'SIM' : 'NÃO'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateHudConfig({
                              webConfig: {
                                ...webCfg,
                                allowArrowKeys: webCfg.allowArrowKeys === false ? true : false,
                              },
                            })
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            webCfg.allowArrowKeys !== false
                              ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200'
                              : 'bg-slate-900/80 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>
                            <span className="text-[11px] font-bold block text-white">
                              Permitir Setas do Teclado
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Mover com ↑ ↓ ← → além de WASD
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            webCfg.allowArrowKeys !== false ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {webCfg.allowArrowKeys !== false ? 'SIM' : 'NÃO'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            updateHudConfig({
                              webConfig: {
                                ...webCfg,
                                showKeyBadges: webCfg.showKeyBadges === false ? true : false,
                              },
                            })
                          }
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                            webCfg.showKeyBadges !== false
                              ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200'
                              : 'bg-slate-900/80 border-slate-800 text-slate-400'
                          }`}
                        >
                          <div>
                            <span className="text-[11px] font-bold block text-white">
                              Exibir Teclas nos Botões
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Mostra [Tecla] sobre cada botão do HUD
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            webCfg.showKeyBadges !== false ? 'bg-cyan-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {webCfg.showKeyBadges !== false ? 'SIM' : 'NÃO'}
                          </span>
                        </button>
                      </div>

                      {/* Mapeamento de Movimentação Direcional (Padrão WASD) */}
                      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                            <span>🕹️ Movimentação no Teclado (Padrão WASD)</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateHudConfig({
                                webConfig: {
                                  ...webCfg,
                                  upKey: 'W',
                                  leftKey: 'A',
                                  downKey: 'S',
                                  rightKey: 'D',
                                },
                              });
                              showToast?.('⌨️ Movimentação restaurada para o padrão WASD!');
                            }}
                            className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold cursor-pointer"
                          >
                            Restaurar WASD
                          </button>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                          {[
                            { id: 'web-up', label: 'Cima (↑)', val: webCfg.upKey || 'W' },
                            { id: 'web-left', label: 'Esquerda (←)', val: webCfg.leftKey || 'A' },
                            { id: 'web-down', label: 'Baixo (↓)', val: webCfg.downKey || 'S' },
                            { id: 'web-right', label: 'Direita (→)', val: webCfg.rightKey || 'D' },
                          ].map((dir) => {
                            const isCap = capturingKeyFor === dir.id;
                            return (
                              <button
                                key={dir.id}
                                type="button"
                                onClick={() => setCapturingKeyFor(isCap ? null : dir.id)}
                                className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                  isCap
                                    ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 animate-pulse'
                                    : 'bg-slate-900 border-slate-700 hover:border-cyan-400'
                                }`}
                                title="Clique e pressione qualquer tecla do teclado"
                              >
                                <span className="text-[9px] text-slate-400 block">{dir.label}</span>
                                <span className="text-xs font-mono font-black text-cyan-300 block mt-0.5">
                                  {isCap ? 'Pressione...' : `[${dir.val}]`}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Mapeamento Rápido de Teclas para Todos os Botões do HUD Paisagem */}
                      <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-300">
                            ⌨️ Teclas de Atalho dos Botões na Tela Paisagem
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Clique no botão para gravar uma tecla
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {/* Mochila */}
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-[11px] font-semibold text-slate-200 truncate">
                              🎒 Mochila (Inventário)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCapturingKeyFor(capturingKeyFor === 'btn-backpack' ? null : 'btn-backpack')
                              }
                              className={`px-2.5 py-1 rounded text-[10px] font-mono font-black cursor-pointer transition-all ${
                                capturingKeyFor === 'btn-backpack'
                                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                                  : 'bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700'
                              }`}
                            >
                              {capturingKeyFor === 'btn-backpack'
                                ? 'Pressione...'
                                : `[${hudConfig.backpackButton?.shortcutKey || 'I'}]`}
                            </button>
                          </div>

                          {/* Modo Toque */}
                          <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
                            <span className="text-[11px] font-semibold text-slate-200 truncate">
                              👆 Modo Toque (Dedinho)
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setCapturingKeyFor(capturingKeyFor === 'btn-touchmove' ? null : 'btn-touchmove')
                              }
                              className={`px-2.5 py-1 rounded text-[10px] font-mono font-black cursor-pointer transition-all ${
                                capturingKeyFor === 'btn-touchmove'
                                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                                  : 'bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-slate-700'
                              }`}
                            >
                              {capturingKeyFor === 'btn-touchmove'
                                ? 'Pressione...'
                                : `[${hudConfig.touchMoveButton?.shortcutKey || 'M'}]`}
                            </button>
                          </div>

                          {/* Botões de Ação Customizados */}
                          {hudConfig.customButtons.map((btn) => {
                            const isCap = capturingKeyFor === btn.id;
                            return (
                              <div
                                key={btn.id}
                                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800"
                              >
                                <span className="text-[11px] font-semibold text-slate-200 truncate pr-2">
                                  ⚡ {btn.name}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setCapturingKeyFor(isCap ? null : btn.id)}
                                  className={`px-2.5 py-1 rounded text-[10px] font-mono font-black cursor-pointer transition-all shrink-0 ${
                                    isCap
                                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                                      : 'bg-slate-800 hover:bg-amber-500/20 text-amber-300 border border-slate-700'
                                  }`}
                                >
                                  {isCap ? 'Pressione...' : `[${btn.shortcutKey || 'Definir'}]`}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Cards dos Elementos e Botões do HUD */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <label className="text-xs font-black text-white flex items-center gap-2">
                    <span>Elementos do HUD</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                      {7 + hudConfig.customButtons.length} Componentes
                    </span>
                  </label>
                  <p className="text-[10.5px] text-slate-400">
                    Selecione um elemento para editar cores, mídias e posições (Sincronizado Universalmente)
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddNewButton}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Novo Botão de Ação</span>
                </button>
              </div>

              {/* Filtro de Categorias em Pills Modernas */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setElementCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    elementCategory === 'all'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>⭐ Todos ({7 + hudConfig.customButtons.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setElementCategory('status')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    elementCategory === 'status'
                      ? 'bg-rose-500 text-white shadow-sm font-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>📊 Vida &amp; Status (3)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setElementCategory('controls')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    elementCategory === 'controls'
                      ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>🕹️ Controles &amp; WASD (3)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setElementCategory('actions')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    elementCategory === 'actions'
                      ? 'bg-purple-600 text-white shadow-sm font-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>⚔️ Ações ({hudConfig.customButtons.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setElementCategory('quests')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    elementCategory === 'quests'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm font-black'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                  }`}
                >
                  <span>📜 Missões (1)</span>
                </button>
              </div>

              {/* Grid dos 7 Cards Principais do HUD (filtrado por categoria) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-2.5">
                {/* 1. CARD HEADER PLAYER (ÍCONE CIRCULAR + BARRAS PV & EXP) */}
                {(elementCategory === 'all' || elementCategory === 'status') && (
                  <button
                    type="button"
                    onClick={() => setSelectedButtonId(selectedButtonId === 'btn-player-header' ? null : 'btn-player-header')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedButtonId === 'btn-player-header'
                        ? 'bg-gradient-to-br from-rose-950/50 via-amber-950/30 to-slate-900 border-amber-400 ring-2 ring-amber-500/50 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <div className="w-7 h-7 rounded-full bg-white border-[3px] border-[#5c2604] z-10 overflow-hidden flex items-center justify-center">
                          {(hudConfig.playerHeaderHud?.customIconUrl || project.player?.avatarPng) && (
                            <img
                              src={hudConfig.playerHeaderHud?.customIconUrl || project.player?.avatarPng}
                              alt="Avatar"
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                        <div className="-ml-1.5 space-y-0.5">
                          <div className="w-9 h-2 rounded-r-full bg-[#ff1a0a]" />
                          <div className="w-7 h-1.5 rounded-r-full bg-[#ffcc00]" />
                        </div>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          hudConfig.playerHeaderHud?.visible !== false
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {hudConfig.playerHeaderHud?.visible !== false ? 'Ativo' : 'Oculto'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block truncate">
                        Header PV & EXP
                      </span>
                      <span className="text-[10px] text-amber-300 block truncate">
                        Ícone Circular + Barras
                      </span>
                    </div>
                  </button>
                )}

                {/* 2. CARD BARRA DE ACESSO VIDRO (CÁPSULA COM CONTORNO DOURADO + 6 ÍCONES SEM BORDA) */}
                {(elementCategory === 'all' || elementCategory === 'status') && (
                  <button
                    type="button"
                    onClick={() => setSelectedButtonId(selectedButtonId === 'btn-top-glass-bar' ? null : 'btn-top-glass-bar')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedButtonId === 'btn-top-glass-bar'
                        ? 'bg-gradient-to-br from-amber-950/60 via-cyan-950/40 to-slate-900 border-amber-400 ring-2 ring-amber-500/50 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="px-2 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border-2 border-[#fbbf24] shadow-[0_2px_0_#78350f] flex items-center gap-1">
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px]">🎒</span>
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px]">📜</span>
                        <span className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px]">🗺️</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          hudConfig.topGlassBarHud?.visible !== false
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {hudConfig.topGlassBarHud?.visible !== false ? '6 Ícones' : 'Oculto'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-200 block truncate">
                        Cápsula Vidro Dourada
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        6 Ícones (Borda na Cápsula)
                      </span>
                    </div>
                  </button>
                )}

                {/* 3. CARD INFO DE QUEST (JORNADA | TAREFAS. + SETINHA RETRÁTIL) */}
                {(elementCategory === 'all' || elementCategory === 'quests') && (
                  <button
                    type="button"
                    onClick={() => setSelectedButtonId(selectedButtonId === 'btn-quest-tracker' ? null : 'btn-quest-tracker')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedButtonId === 'btn-quest-tracker'
                        ? 'bg-gradient-to-br from-amber-950/50 via-emerald-950/30 to-slate-900 border-amber-400 ring-2 ring-amber-500/50 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="px-2 py-1 rounded-lg bg-[#3b5739] border border-[#5c2604] flex items-center gap-1">
                        <HudFourPointStarIcon className="w-3.5 h-3.5" />
                        <span className="text-[9px] font-black text-yellow-200">◀</span>
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          hudConfig.questTrackerHud?.visible !== false
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {hudConfig.questTrackerHud?.visible !== false ? 'Retrátil' : 'Oculto'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-[#e5a913] underline block truncate">
                        Jornada | Tarefas. ◀
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Retrai pro Canto + Pop-up
                      </span>
                    </div>
                  </button>
                )}

                {/* 4. CARD BARRA DESLIZANTE DE COLETAS EMPILHADAS (CANTO DIREITO) */}
                {(elementCategory === 'all' || elementCategory === 'status') && (
                  <button
                    type="button"
                    onClick={() => setSelectedButtonId(selectedButtonId === 'btn-loot-toast' ? null : 'btn-loot-toast')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedButtonId === 'btn-loot-toast'
                        ? 'bg-gradient-to-br from-amber-950/60 via-green-950/40 to-slate-900 border-amber-400 ring-2 ring-amber-500/50 shadow-lg'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="space-y-1 flex flex-col items-end">
                        <div className="w-12 h-3 rounded-l-full bg-[#f59e0b] border-b-[3px] border-[#14532d]" />
                        <div className="w-10 h-3 rounded-l-full bg-[#f59e0b] border-b-[3px] border-[#14532d]" />
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                          hudConfig.lootToastHud?.visible !== false
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}
                      >
                        {hudConfig.lootToastHud?.visible !== false ? 'Empilhável' : 'Oculto'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-amber-300 block truncate">
                        Barras de Coleta
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Desliza & Empilha (Dir.)
                      </span>
                    </div>
                  </button>
                )}

                {/* 5. CARD DA MOCHILA */}
                {(elementCategory === 'all' || elementCategory === 'controls') && (
                  <button
                    onClick={() => setSelectedButtonId(selectedButtonId === 'btn-backpack' ? null : 'btn-backpack')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedButtonId === 'btn-backpack'
                        ? 'bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/50'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center overflow-hidden p-1">
                        <img
                          src={hudConfig.backpackButton?.customAssetUrl || mochilaPng}
                          alt="Mochila"
                          className="w-full h-full object-contain drop-shadow"
                        />
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          hudConfig.backpackButton?.customAssetUrl
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {hudConfig.backpackButton?.customAssetUrl ? 'Personalizado' : 'Padrão'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Mochila</span>
                      <span className="text-[10px] text-slate-400 block">Inventário</span>
                    </div>
                  </button>
                )}

                {/* 6. CARD DO JOYSTICK (COM MINIATURA REAL DAS 2 PARTES) */}
                {(elementCategory === 'all' || elementCategory === 'controls') && (
                  <button
                    onClick={() => setSelectedButtonId(selectedButtonId === 'btn-joystick' ? null : 'btn-joystick')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedButtonId === 'btn-joystick'
                        ? 'bg-gradient-to-br from-amber-950/40 via-purple-950/30 to-slate-900 border-amber-400 ring-2 ring-amber-500/50 shadow-lg shadow-amber-950/50'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      {/* Miniatura sobreposta de Base + Knob */}
                      <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-800 relative flex items-center justify-center overflow-hidden p-1">
                        <img
                          src={hudConfig.joystick?.customDiscoUrl || discoPng}
                          alt="Disco"
                          className="absolute inset-1 w-8 h-8 object-contain"
                        />
                        <img
                          src={hudConfig.joystick?.customKnobUrl || botaoPng}
                          alt="Knob"
                          className="relative w-4 h-4 object-contain drop-shadow"
                        />
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          hudConfig.joystick?.customDiscoUrl || hudConfig.joystick?.customKnobUrl
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {hudConfig.joystick?.customDiscoUrl || hudConfig.joystick?.customKnobUrl
                          ? '2 Mídias • Custom'
                          : '2 Mídias • Padrão'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>Joystick</span>
                        <span className="text-[9px] px-1 rounded bg-amber-500/20 text-amber-300">2 Partes</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        Base (Disco) + Analógico
                      </span>
                    </div>
                  </button>
                )}

                {/* 7. CARD DO MODO TOQUE */}
                {(elementCategory === 'all' || elementCategory === 'controls') && (
                  <button
                    onClick={() => setSelectedButtonId(selectedButtonId === 'btn-touchmove' ? null : 'btn-touchmove')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                      selectedButtonId === 'btn-touchmove'
                        ? 'bg-indigo-950/40 border-indigo-400 ring-2 ring-indigo-500/50 shadow-lg shadow-indigo-950/50'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-center overflow-hidden p-1">
                        {hudConfig.touchMoveButton?.customAssetUrl ? (
                          <img
                            src={hudConfig.touchMoveButton.customAssetUrl}
                            alt="Toque"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xl">👆</span>
                        )}
                      </div>
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          hudConfig.touchMoveButton?.customAssetUrl
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {hudConfig.touchMoveButton?.customAssetUrl ? 'Personalizado' : 'Padrão'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Modo Toque</span>
                      <span className="text-[10px] text-slate-400 block">Dedinho</span>
                    </div>
                  </button>
                )}
              </div>

              {/* Botões customizados se houver (Filtrados para 'all' ou 'actions') */}
              {hudConfig.customButtons.length > 0 && (elementCategory === 'all' || elementCategory === 'actions') && (
                <div className="pt-2">
                  <label className="text-[10px] text-slate-400 font-bold block mb-1.5 uppercase tracking-wider">
                    Botões de Ação Criados ({hudConfig.customButtons.length})
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {hudConfig.customButtons.map((btn) => {
                      const isSelected = selectedButtonId === btn.id;
                      return (
                        <button
                          key={btn.id}
                          onClick={() => setSelectedButtonId(isSelected ? null : btn.id)}
                          className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                            isSelected
                              ? 'bg-amber-950/30 border-amber-400 ring-2 ring-amber-500/40 shadow-sm'
                              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="w-6 h-6 flex items-center justify-center overflow-hidden">
                              {btn.assetUrl ? (
                                <img src={btn.assetUrl} alt={btn.name} className="w-full h-full object-contain" />
                              ) : (
                                <span className="text-[10px] font-bold text-amber-300">
                                  {btn.shortcutKey || '★'}
                                </span>
                              )}
                            </div>
                            <span className="text-[8px] font-mono font-bold px-1 rounded bg-slate-800 text-amber-300">
                              {btn.shortcutKey ? `[${btn.shortcutKey}]` : 'Ação'}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-white block truncate">
                            {btn.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Banner de Feedback do Elemento em Edição Ativa */}
            {selectedButtonId && (
              <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-cyan-500/40 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    Editando:{' '}
                    <span className="text-cyan-300 font-black">
                      {selectedButtonId === 'btn-player-header'
                        ? 'Header PV & EXP (Vida e Nível)'
                        : selectedButtonId === 'btn-top-glass-bar'
                        ? 'Cápsula Vidro Dourada (6 Ícones)'
                        : selectedButtonId === 'btn-quest-tracker'
                        ? 'Jornada & Tarefas (◀ Tracker Retrátil)'
                        : selectedButtonId === 'btn-loot-toast'
                        ? 'Barras Deslizantes de Coleta'
                        : selectedButtonId === 'btn-backpack'
                        ? 'Botão Mochila / Inventário'
                        : selectedButtonId === 'btn-joystick'
                        ? 'Joystick (Disco + Analógico 2 Partes)'
                        : selectedButtonId === 'btn-touchmove'
                        ? 'Modo Toque (Dedinho)'
                        : hudConfig.customButtons.find((b) => b.id === selectedButtonId)?.name || 'Botão de Ação'}
                    </span>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedButtonId(null)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-bold cursor-pointer transition-colors"
                >
                  ✕ Fechar Inspetor
                </button>
              </div>
            )}

            {/* =========================================================================
                PAINEL ULTRA ROBUSTO DE EDIÇÃO DO JOYSTICK (DUAS MÍDIAS E PARÂMETROS)
               ========================================================================= */}
            {selectedButtonId === 'btn-joystick' && (
              <div className="p-4 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-2xl space-y-5">
                {/* Cabeçalho do Joystick */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                      <Disc className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                        <span>Joystick Direcional (2 Partes Independentes)</span>
                      </h3>
                      <span className="text-[11px] text-slate-400 block">
                        Altere as mídias, escalas, opacidades e o raio de curso de cada parte
                      </span>
                    </div>
                  </div>

                  {/* Toggle Visibilidade */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        updateHudConfig({
                          joystick: {
                            ...jCfg,
                            visible: !jCfg.visible,
                          },
                        })
                      }
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        jCfg.visible !== false
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {jCfg.visible !== false ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visível no Jogo</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Oculto</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* PRÉVIA INTERATIVA AO VIVO DO JOYSTICK (COM TOQUE E TESTE DE CURSO) */}
                <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 border border-amber-500/20 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] font-mono text-amber-400/90 font-bold">
                    <CircleDot className="w-3 h-3 animate-pulse" />
                    <span>Prévia Interativa • Arraste para testar o raio de {jMaxRadius}px</span>
                  </div>

                  {/* Palco do Joystick Interativo */}
                  <div
                    onMouseDown={handlePreviewMouseDown}
                    className="w-36 h-36 relative flex items-center justify-center select-none cursor-grab active:cursor-grabbing touch-none my-2"
                    style={{
                      opacity: jOpacity,
                      transform: `scale(${jScale})`,
                      transformOrigin: 'center center',
                    }}
                  >
                    {/* Círculo guia do maxRadius */}
                    <div
                      className="absolute rounded-full border border-dashed border-amber-400/30 pointer-events-none"
                      style={{
                        width: `${jMaxRadius * 2}px`,
                        height: `${jMaxRadius * 2}px`,
                      }}
                    />

                    {/* Mídia 1: Base / Disco Direcional */}
                    <img
                      src={jCfg.customDiscoUrl || discoPng}
                      alt="Base Direcional"
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-[0_8px_20px_rgba(0,0,0,0.8)] transition-transform duration-75"
                      style={{
                        transform: `scale(${jDiscoScale})`,
                        opacity: jDiscoOpacity,
                      }}
                    />

                    {/* Mídia 2: Botão Analógico Central (Knob) */}
                    <div
                      className="w-16 h-16 relative flex items-center justify-center pointer-events-none transition-transform duration-75"
                      style={{
                        transform: `translate(${previewKnobPos.x}px, ${previewKnobPos.y}px) scale(${jKnobScale})`,
                        opacity: jKnobOpacity,
                      }}
                    >
                      <img
                        src={jCfg.customKnobUrl || botaoPng}
                        alt="Botão Analógico"
                        className="w-full h-full object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]"
                      />
                    </div>
                  </div>

                  <span className="text-[10px] text-slate-400 text-center">
                    {isPreviewDragging
                      ? `Deslocamento: X=${previewKnobPos.x.toFixed(0)}px, Y=${previewKnobPos.y.toFixed(0)}px`
                      : 'Clique e arraste o analógico acima para sentir a sensibilidade em tempo real'}
                  </span>
                </div>

                {/* GRID DAS 2 PARTES LADO A LADO COM CONTROLES COMPLETOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* =========================================================================
                      PARTE 1: BASE / DISCO DIRECIONAL (MÍDIA 1)
                     ========================================================================= */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-indigo-500/30 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-black text-indigo-300 flex items-center gap-1.5">
                        <Disc className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Parte 1: Base / Disco (Fundo)</span>
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        Mídia 1
                      </span>
                    </div>

                    {/* Mídia da Base */}
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-900 border border-indigo-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        <img
                          src={jCfg.customDiscoUrl || discoPng}
                          alt="Base"
                          className="w-full h-full object-contain p-1"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => triggerUploadFor('btn-joystick-disco')}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload PNG</span>
                          </button>
                          <button
                            onClick={() => {
                              setTargetAssetButtonId('btn-joystick-disco');
                              setAssetPickerOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1"
                          >
                            <Images className="w-3 h-3 text-amber-400" />
                            <span>Galeria</span>
                          </button>
                        </div>
                        {jCfg.customDiscoUrl && (
                          <button
                            onClick={() => {
                              updateHudConfig({
                                joystick: {
                                  ...jCfg,
                                  customDiscoUrl: undefined,
                                },
                              });
                              showToast?.('Base restaurada para o disco dourado padrão.');
                            }}
                            className="text-[10px] text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Restaurar Disco Dourado</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sliders da Base */}
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-bold">Escala da Base</span>
                          <span className="text-indigo-300 font-mono font-bold">
                            {(jDiscoScale * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={jDiscoScale}
                          onChange={(e) =>
                            updateHudConfig({
                              joystick: {
                                ...jCfg,
                                discoScale: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-bold">Opacidade da Base</span>
                          <span className="text-indigo-300 font-mono font-bold">
                            {(jDiscoOpacity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={jDiscoOpacity}
                          onChange={(e) =>
                            updateHudConfig({
                              joystick: {
                                ...jCfg,
                                discoOpacity: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-bold">Raio Máximo de Curso</span>
                          <span className="text-amber-300 font-mono font-bold">{jMaxRadius}px</span>
                        </div>
                        <input
                          type="range"
                          min="20"
                          max="65"
                          step="1"
                          value={jMaxRadius}
                          onChange={(e) =>
                            updateHudConfig({
                              joystick: {
                                ...jCfg,
                                maxRadius: parseInt(e.target.value, 10),
                              },
                            })
                          }
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                        <span className="text-[9px] text-slate-500 block mt-0.5">
                          Limite até onde o botão analógico pode deslizar antes de travar.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* =========================================================================
                      PARTE 2: BOTÃO ANALÓGICO / KNOB CENTRAL (MÍDIA 2)
                     ========================================================================= */}
                  <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <span className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                        <CircleDot className="w-3.5 h-3.5 text-amber-400" />
                        <span>Parte 2: Botão Analógico (Móvel)</span>
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                        Mídia 2
                      </span>
                    </div>

                    {/* Mídia do Analógico */}
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl bg-slate-900 border border-amber-500/30 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                        <img
                          src={jCfg.customKnobUrl || botaoPng}
                          alt="Knob"
                          className="w-full h-full object-contain p-2"
                        />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => triggerUploadFor('btn-joystick-knob')}
                            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-[11px] flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Upload PNG</span>
                          </button>
                          <button
                            onClick={() => {
                              setTargetAssetButtonId('btn-joystick-knob');
                              setAssetPickerOpen(true);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1"
                          >
                            <Images className="w-3 h-3 text-amber-400" />
                            <span>Galeria</span>
                          </button>
                        </div>
                        {jCfg.customKnobUrl && (
                          <button
                            onClick={() => {
                              updateHudConfig({
                                joystick: {
                                  ...jCfg,
                                  customKnobUrl: undefined,
                                },
                              });
                              showToast?.('Botão analógico restaurado ao dourado padrão.');
                            }}
                            className="text-[10px] text-rose-300 hover:text-rose-200 flex items-center gap-1 cursor-pointer"
                          >
                            <RotateCcw className="w-2.5 h-2.5" />
                            <span>Restaurar Botão Dourado</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Sliders do Analógico */}
                    <div className="space-y-2.5 pt-1">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-bold">Escala do Analógico</span>
                          <span className="text-amber-300 font-mono font-bold">
                            {(jKnobScale * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={jKnobScale}
                          onChange={(e) =>
                            updateHudConfig({
                              joystick: {
                                ...jCfg,
                                knobScale: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400 font-bold">Opacidade do Analógico</span>
                          <span className="text-amber-300 font-mono font-bold">
                            {(jKnobOpacity * 100).toFixed(0)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.1"
                          max="1.0"
                          step="0.05"
                          value={jKnobOpacity}
                          onChange={(e) =>
                            updateHudConfig({
                              joystick: {
                                ...jCfg,
                                knobOpacity: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full accent-amber-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* =========================================================================
                    PARÂMETROS GERAIS DO JOYSTICK (POSIÇÃO NA TELA E ESCALA GERAL)
                   ========================================================================= */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <span className="text-xs font-bold text-slate-300 block">
                    📐 Posição na Tela & Escala Geral do Joystick
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Posição Horizontal X</span>
                        <span className="font-mono text-white">{jX}px</span>
                      </div>
                      <input
                        type="range"
                        min="-420"
                        max="420"
                        value={jX}
                        onChange={(e) =>
                          updateHudConfig({
                            joystick: {
                              ...jCfg,
                              x: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Posição Vertical Y</span>
                        <span className="font-mono text-white">{jY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="320"
                        value={jY}
                        onChange={(e) =>
                          updateHudConfig({
                            joystick: {
                              ...jCfg,
                              y: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Escala Geral do Conjunto</span>
                        <span className="font-mono text-white">{(jScale * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.05"
                        value={jScale}
                        onChange={(e) =>
                          updateHudConfig({
                            joystick: {
                              ...jCfg,
                              scale: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Opacidade Geral</span>
                        <span className="font-mono text-white">{(jOpacity * 100).toFixed(0)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.1"
                        max="1.0"
                        step="0.05"
                        value={jOpacity}
                        onChange={(e) =>
                          updateHudConfig({
                            joystick: {
                              ...jCfg,
                              opacity: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Botões de Reset Rápido */}
                  <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                    <button
                      onClick={() =>
                        updateHudConfig({
                          joystick: {
                            ...jCfg,
                            x: 0,
                            y: 0,
                          },
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                    >
                      Centralizar Posição
                    </button>
                    <button
                      onClick={() =>
                        updateHudConfig({
                          joystick: {
                            ...jCfg,
                            scale: 1.0,
                            discoScale: 1.0,
                            knobScale: 1.0,
                            maxRadius: 38,
                          },
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold cursor-pointer"
                    >
                      Resetar Escalas (100%)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                PAINEL DE EDIÇÃO DA MOCHILA
               ========================================================================= */}
            {selectedButtonId === 'btn-backpack' && (
              <div className="p-4 rounded-3xl bg-slate-900/90 border-2 border-indigo-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-indigo-300 flex items-center gap-2">
                    <span>🎒 Botão da Mochila (Inventário)</span>
                  </h3>
                  <button
                    onClick={() =>
                      updateHudConfig({
                        backpackButton: {
                          ...hudConfig.backpackButton,
                          visible: !hudConfig.backpackButton?.visible,
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      hudConfig.backpackButton?.visible !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {hudConfig.backpackButton?.visible !== false ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visível</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Oculto</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Asset da Mochila */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Mídia Visual da Mochila (PNG)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      <img
                        src={hudConfig.backpackButton?.customAssetUrl || mochilaPng}
                        alt="Mochila"
                        className="w-full h-full object-contain p-1"
                      />
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      <button
                        onClick={() => triggerUploadFor('btn-backpack')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload PNG do PC</span>
                      </button>
                      <button
                        onClick={() => {
                          setTargetAssetButtonId('btn-backpack');
                          setAssetPickerOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Images className="w-3.5 h-3.5 text-amber-400" />
                        <span>Galeria</span>
                      </button>
                      {hudConfig.backpackButton?.customAssetUrl && (
                        <button
                          onClick={() => {
                            updateHudConfig({
                              backpackButton: {
                                ...hudConfig.backpackButton,
                                visible: true,
                                customAssetUrl: undefined,
                              },
                            });
                            showToast?.('Mochila restaurada ao asset padrão.');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 text-rose-300 text-[11px] font-bold border border-rose-800/50 cursor-pointer"
                        >
                          ✕ Restaurar Padrão
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Posição e Escala da Mochila */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Deslocamento X</span>
                      <span className="font-mono text-white">{hudConfig.backpackButton?.x || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-420"
                      max="420"
                      value={hudConfig.backpackButton?.x || 0}
                      onChange={(e) =>
                        updateHudConfig({
                          backpackButton: {
                            ...hudConfig.backpackButton,
                            visible: true,
                            x: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Deslocamento Y</span>
                      <span className="font-mono text-white">{hudConfig.backpackButton?.y || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="320"
                      value={hudConfig.backpackButton?.y || 0}
                      onChange={(e) =>
                        updateHudConfig({
                          backpackButton: {
                            ...hudConfig.backpackButton,
                            visible: true,
                            y: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Escala Visual</span>
                      <span className="font-mono text-white">
                        {((hudConfig.backpackButton?.scale || 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={hudConfig.backpackButton?.scale || 1.0}
                      onChange={(e) =>
                        updateHudConfig({
                          backpackButton: {
                            ...hudConfig.backpackButton,
                            visible: true,
                            scale: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Opacidade</span>
                      <span className="font-mono text-white">
                        {((hudConfig.backpackButton?.opacity || 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={hudConfig.backpackButton?.opacity || 1.0}
                      onChange={(e) =>
                        updateHudConfig({
                          backpackButton: {
                            ...hudConfig.backpackButton,
                            visible: true,
                            opacity: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                PAINEL DE EDIÇÃO DO MODO TOQUE
               ========================================================================= */}
            {selectedButtonId === 'btn-touchmove' && (
              <div className="p-4 rounded-3xl bg-slate-900/90 border-2 border-indigo-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="text-sm font-black text-indigo-300 flex items-center gap-2">
                    <span>👆 Botão Modo Toque (Dedinho)</span>
                  </h3>
                  <button
                    onClick={() =>
                      updateHudConfig({
                        touchMoveButton: {
                          ...hudConfig.touchMoveButton,
                          visible: !hudConfig.touchMoveButton?.visible,
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      hudConfig.touchMoveButton?.visible !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {hudConfig.touchMoveButton?.visible !== false ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visível</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Oculto</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Asset do Modo Toque */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Mídia Visual do Botão (PNG)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                      {hudConfig.touchMoveButton?.customAssetUrl ? (
                        <img
                          src={hudConfig.touchMoveButton.customAssetUrl}
                          alt="Toque"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-2xl">👆</span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      <button
                        onClick={() => triggerUploadFor('btn-touchmove')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload PNG do PC</span>
                      </button>
                      <button
                        onClick={() => {
                          setTargetAssetButtonId('btn-touchmove');
                          setAssetPickerOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Images className="w-3.5 h-3.5 text-amber-400" />
                        <span>Galeria</span>
                      </button>
                      {hudConfig.touchMoveButton?.customAssetUrl && (
                        <button
                          onClick={() => {
                            updateHudConfig({
                              touchMoveButton: {
                                ...hudConfig.touchMoveButton,
                                visible: true,
                                customAssetUrl: undefined,
                              },
                            });
                            showToast?.('Botão de toque restaurado ao ícone padrão.');
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 text-rose-300 text-[11px] font-bold border border-rose-800/50 cursor-pointer"
                        >
                          ✕ Restaurar Padrão
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Posição e Escala do Modo Toque */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Deslocamento X</span>
                      <span className="font-mono text-white">{hudConfig.touchMoveButton?.x || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-420"
                      max="420"
                      value={hudConfig.touchMoveButton?.x || 0}
                      onChange={(e) =>
                        updateHudConfig({
                          touchMoveButton: {
                            ...hudConfig.touchMoveButton,
                            visible: true,
                            x: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Deslocamento Y</span>
                      <span className="font-mono text-white">{hudConfig.touchMoveButton?.y || 0}px</span>
                    </div>
                    <input
                      type="range"
                      min="-60"
                      max="320"
                      value={hudConfig.touchMoveButton?.y || 0}
                      onChange={(e) =>
                        updateHudConfig({
                          touchMoveButton: {
                            ...hudConfig.touchMoveButton,
                            visible: true,
                            y: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Escala Visual</span>
                      <span className="font-mono text-white">
                        {((hudConfig.touchMoveButton?.scale || 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.05"
                      value={hudConfig.touchMoveButton?.scale || 1.0}
                      onChange={(e) =>
                        updateHudConfig({
                          touchMoveButton: {
                            ...hudConfig.touchMoveButton,
                            visible: true,
                            scale: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Opacidade</span>
                      <span className="font-mono text-white">
                        {((hudConfig.touchMoveButton?.opacity || 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.05"
                      value={hudConfig.touchMoveButton?.opacity || 1.0}
                      onChange={(e) =>
                        updateHudConfig({
                          touchMoveButton: {
                            ...hudConfig.touchMoveButton,
                            visible: true,
                            opacity: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                PAINEL DE EDIÇÃO: HEADER CIRCULAR DO PLAYER (PV & EXP)
               ========================================================================= */}
            {selectedButtonId === 'btn-player-header' && (
              <div className="p-4 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                      <span>🛡️ Header do Player: Ícone Circular + Barras de PV e EXP</span>
                    </h3>
                    <span className="text-[11px] text-slate-400 block">
                      Configure o ícone circular, cores do aro, barras de PV/EXP, formato numérico e posição no emulador
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateHudConfig({
                        playerHeaderHud: {
                          ...(hudConfig.playerHeaderHud || { visible: true }),
                          visible: hudConfig.playerHeaderHud?.visible === false ? true : false,
                        },
                      })
                    }
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      hudConfig.playerHeaderHud?.visible !== false
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {hudConfig.playerHeaderHud?.visible !== false ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visível</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Oculto</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Mídia do Ícone Circular */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-300">
                      Ícone Circular do Player (PNG ou Círculo Branco Limpo)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            showPlayerAvatar:
                              hudConfig.playerHeaderHud?.showPlayerAvatar === false ? true : false,
                          },
                        })
                      }
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer border ${
                        hudConfig.playerHeaderHud?.showPlayerAvatar !== false
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-200'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {hudConfig.playerHeaderHud?.showPlayerAvatar !== false
                        ? '✓ Exibindo Avatar do Player'
                        : '○ Círculo Branco Puro (Sem Avatar)'}
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className="w-14 h-14 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-md"
                      style={{
                        backgroundColor: hudConfig.playerHeaderHud?.circleBgColor || '#ffffff',
                        border: `5px solid ${hudConfig.playerHeaderHud?.ringColor || '#5c2604'}`,
                      }}
                    >
                      {(hudConfig.playerHeaderHud?.customIconUrl ||
                        (hudConfig.playerHeaderHud?.showPlayerAvatar !== false &&
                          project.player?.avatarPng)) && (
                        <img
                          src={
                            hudConfig.playerHeaderHud?.customIconUrl || project.player?.avatarPng
                          }
                          alt="Player"
                          className="w-4/5 h-4/5 object-contain"
                        />
                      )}
                    </div>

                    <div className="flex-1 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => triggerUploadFor('btn-player-header')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload PNG Circular</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setTargetAssetButtonId('btn-player-header');
                          setAssetPickerOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Images className="w-3.5 h-3.5 text-amber-400" />
                        <span>Galeria</span>
                      </button>
                      {hudConfig.playerHeaderHud?.customIconUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            updateHudConfig({
                              playerHeaderHud: {
                                visible: true,
                                ...(hudConfig.playerHeaderHud || {}),
                                customIconUrl: undefined,
                              },
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-rose-950/40 text-rose-300 text-[11px] font-bold border border-rose-800/50 cursor-pointer"
                        >
                          ✕ Usar Avatar do Herói
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Formato Numérico e Cores */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Formato PV / EXP
                    </label>
                    <select
                      value={hudConfig.playerHeaderHud?.numberFormat || 'padded_7'}
                      onChange={(e) =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            numberFormat: e.target.value as any,
                          },
                        })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-bold"
                    >
                      <option value="padded_7">0000180 PV (7 dígitos)</option>
                      <option value="current_max">180/180 PV (Atual/Máx)</option>
                      <option value="simple">180 PV (Simples)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Cor Aro Circular
                    </label>
                    <input
                      type="color"
                      value={hudConfig.playerHeaderHud?.ringColor || '#5c2604'}
                      onChange={(e) =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            ringColor: e.target.value,
                          },
                        })
                      }
                      className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Cor Barra PV
                    </label>
                    <input
                      type="color"
                      value={hudConfig.playerHeaderHud?.hpBarColor || '#ff1a0a'}
                      onChange={(e) =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            hpBarColor: e.target.value,
                          },
                        })
                      }
                      className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">
                      Cor Barra EXP
                    </label>
                    <input
                      type="color"
                      value={hudConfig.playerHeaderHud?.expBarColor || '#ffcc00'}
                      onChange={(e) =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            expBarColor: e.target.value,
                          },
                        })
                      }
                      className="w-full h-8 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Posição X/Y, Escala e Opacidade */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Deslocamento X</span>
                      <span className="font-mono text-white">
                        {hudConfig.playerHeaderHud?.x || 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-120"
                      max="360"
                      value={hudConfig.playerHeaderHud?.x || 0}
                      onChange={(e) =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            x: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Deslocamento Y</span>
                      <span className="font-mono text-white">
                        {hudConfig.playerHeaderHud?.y || 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-40"
                      max="360"
                      value={hudConfig.playerHeaderHud?.y || 0}
                      onChange={(e) =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            y: parseInt(e.target.value, 10),
                          },
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Escala Visual</span>
                      <span className="font-mono text-white">
                        {((hudConfig.playerHeaderHud?.scale || 0.92) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.6"
                      step="0.05"
                      value={hudConfig.playerHeaderHud?.scale || 0.92}
                      onChange={(e) =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            scale: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Opacidade</span>
                      <span className="font-mono text-white">
                        {((hudConfig.playerHeaderHud?.opacity || 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="1.0"
                      step="0.05"
                      value={hudConfig.playerHeaderHud?.opacity || 1.0}
                      onChange={(e) =>
                        updateHudConfig({
                          playerHeaderHud: {
                            visible: true,
                            ...(hudConfig.playerHeaderHud || {}),
                            opacity: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                PAINEL DE EDIÇÃO: INFO DE QUEST (JORNADA | TAREFAS. + POP-UP)
               ========================================================================= */}
            {selectedButtonId === 'btn-quest-tracker' && (() => {
              const { jornada, tarefas } = getOrderedPhaseQuests(project, true);
              return (
                <div className="p-4 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-sm font-black text-amber-300 flex items-center gap-2">
                        <span>✦ Info de Quest: Jornada (Principais) | Tarefas (Side Quests)</span>
                      </h3>
                      <span className="text-[11px] text-slate-400 block">
                        Título grifado em dourado com Quests Principais em ordem, sub-aba Tarefas e Pop-up completo
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        updateHudConfig({
                          questTrackerHud: {
                            ...(hudConfig.questTrackerHud || { visible: true }),
                            visible: hudConfig.questTrackerHud?.visible === false ? true : false,
                          },
                        })
                      }
                      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                        hudConfig.questTrackerHud?.visible !== false
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      }`}
                    >
                      {hudConfig.questTrackerHud?.visible !== false ? (
                        <>
                          <Eye className="w-3.5 h-3.5" />
                          <span>Visível</span>
                        </>
                      ) : (
                        <>
                          <EyeOff className="w-3.5 h-3.5" />
                          <span>Oculto</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Textos e Quantidade Visível */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Título Quests Principais
                      </label>
                      <input
                        type="text"
                        value={hudConfig.questTrackerHud?.mainTabLabel ?? 'Jornada'}
                        onChange={(e) =>
                          updateHudConfig({
                            questTrackerHud: {
                              visible: true,
                              ...(hudConfig.questTrackerHud || {}),
                              mainTabLabel: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Sub-aba Side Quests
                      </label>
                      <input
                        type="text"
                        value={hudConfig.questTrackerHud?.sideTabLabel ?? 'Tarefas.'}
                        onChange={(e) =>
                          updateHudConfig({
                            questTrackerHud: {
                              visible: true,
                              ...(hudConfig.questTrackerHud || {}),
                              sideTabLabel: e.target.value,
                            },
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-yellow-200 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Quests Visíveis no HUD ({hudConfig.questTrackerHud?.maxVisibleQuests ?? 2})
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={hudConfig.questTrackerHud?.maxVisibleQuests ?? 2}
                        onChange={(e) =>
                          updateHudConfig({
                            questTrackerHud: {
                              visible: true,
                              ...(hudConfig.questTrackerHud || {}),
                              maxVisibleQuests: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer mt-2"
                      />
                    </div>
                  </div>

                  {/* Resumo das Quests em Ordem da Fase */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-2xl bg-slate-950/90 border border-amber-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#e5a913] underline">
                          ✦ {hudConfig.questTrackerHud?.mainTabLabel || 'Jornada'} ({jornada.length})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuestPopupModalState({ open: true, initialTab: 'jornada' })
                          }
                          className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 cursor-pointer font-bold"
                        >
                          Ver Pop-up
                        </button>
                      </div>
                      {jornada.map((q) => (
                        <div key={q.id} className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500 font-mono">#{q.orderIndex}</span>
                          {q.isLocked ? (
                            <HudLockIcon className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <HudFourPointStarIcon className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              q.isLocked ? 'text-slate-400' : 'text-[#e5a913] font-semibold'
                            }`}
                          >
                            {q.title}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-950/90 border border-yellow-400/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#fef08a] underline">
                          📋 {hudConfig.questTrackerHud?.sideTabLabel || 'Tarefas.'} ({tarefas.length})
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setQuestPopupModalState({ open: true, initialTab: 'tarefas' })
                          }
                          className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-200 hover:bg-yellow-500/30 cursor-pointer font-bold"
                        >
                          Ver Pop-up
                        </button>
                      </div>
                      {tarefas.map((q) => (
                        <div key={q.id} className="flex items-center gap-1.5 text-[11px]">
                          <span className="text-slate-500 font-mono">#{q.orderIndex}</span>
                          {q.isLocked ? (
                            <HudLockIcon className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <HudFourPointStarIcon className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span
                            className={`truncate ${
                              q.isLocked ? 'text-slate-400' : 'text-[#fef08a] font-semibold'
                            }`}
                          >
                            {q.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Posição X/Y, Escala e Opacidade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Deslocamento X</span>
                        <span className="font-mono text-white">
                          {hudConfig.questTrackerHud?.x || 0}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-100"
                        max="360"
                        value={hudConfig.questTrackerHud?.x || 0}
                        onChange={(e) =>
                          updateHudConfig({
                            questTrackerHud: {
                              visible: true,
                              ...(hudConfig.questTrackerHud || {}),
                              x: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Deslocamento Y</span>
                        <span className="font-mono text-white">
                          {hudConfig.questTrackerHud?.y || 0}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min="-80"
                        max="380"
                        value={hudConfig.questTrackerHud?.y || 0}
                        onChange={(e) =>
                          updateHudConfig({
                            questTrackerHud: {
                              visible: true,
                              ...(hudConfig.questTrackerHud || {}),
                              y: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Escala Visual</span>
                        <span className="font-mono text-white">
                          {((hudConfig.questTrackerHud?.scale || 0.95) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="1.6"
                        step="0.05"
                        value={hudConfig.questTrackerHud?.scale || 0.95}
                        onChange={(e) =>
                          updateHudConfig({
                            questTrackerHud: {
                              visible: true,
                              ...(hudConfig.questTrackerHud || {}),
                              scale: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Opacidade</span>
                        <span className="font-mono text-white">
                          {((hudConfig.questTrackerHud?.opacity || 1.0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1.0"
                        step="0.05"
                        value={hudConfig.questTrackerHud?.opacity || 1.0}
                        onChange={(e) =>
                          updateHudConfig({
                            questTrackerHud: {
                              visible: true,
                              ...(hudConfig.questTrackerHud || {}),
                              opacity: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Opções da Setinha Retrátil à Frente de Tarefas. */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        updateHudConfig({
                          questTrackerHud: {
                            visible: true,
                            ...(hudConfig.questTrackerHud || {}),
                            collapsible:
                              hudConfig.questTrackerHud?.collapsible === false ? true : false,
                          },
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        hudConfig.questTrackerHud?.collapsible !== false
                          ? 'bg-amber-500/15 border-amber-400/60 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="text-[11px] font-bold block text-white">
                          Setinha Retrátil à Frente de Tarefas. (◀)
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Ao clicar retrai toda a lista de Quests pro canto esquerdo
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          hudConfig.questTrackerHud?.collapsible !== false
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {hudConfig.questTrackerHud?.collapsible !== false ? 'ATIVA' : 'OFF'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        updateHudConfig({
                          questTrackerHud: {
                            visible: true,
                            ...(hudConfig.questTrackerHud || {}),
                            defaultCollapsed: !hudConfig.questTrackerHud?.defaultCollapsed,
                          },
                        })
                      }
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                        hudConfig.questTrackerHud?.defaultCollapsed
                          ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <div>
                        <span className="text-[11px] font-bold block text-white">
                          Iniciar Fase Já Retraído no Canto
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Começa compacto na lateral até o jogador clicar em ▶
                        </span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                          hudConfig.questTrackerHud?.defaultCollapsed
                            ? 'bg-emerald-400 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {hudConfig.questTrackerHud?.defaultCollapsed ? 'SIM' : 'NÃO'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* =========================================================================
                PAINEL DE EDIÇÃO: BARRA DE ACESSO ESTILO VIDRO (6 ÍCONES CIRCULARES - CANTO SUPERIOR OPOSTO)
               ========================================================================= */}
            {selectedButtonId === 'btn-top-glass-bar' && (() => {
              const glassCfg = hudConfig.topGlassBarHud || {
                visible: true,
                x: 0,
                y: 0,
                scale: 1.0,
                opacity: 1.0,
                glassTint: 'rgba(15, 23, 42, 0.44)',
                borderColor: '#fbbf24',
                iconBgColor: 'transparent',
                collapsible: true,
                slots: DEFAULT_TOP_GLASS_BAR_SLOTS,
              };
              const currentSlots: TopGlassBarIconSlotConfig[] = Array.from({ length: 6 }).map(
                (_, i) => ({
                  ...(DEFAULT_TOP_GLASS_BAR_SLOTS[i] || DEFAULT_TOP_GLASS_BAR_SLOTS[0]),
                  ...(glassCfg.slots?.[i] || {}),
                })
              );

              const updateGlassSlot = (
                index: number,
                patch: Partial<TopGlassBarIconSlotConfig>
              ) => {
                const nextSlots = currentSlots.map((s, idx) =>
                  idx === index ? { ...s, ...patch } : { ...s }
                );
                updateGlassBarSlotsBothScreens(nextSlots);
              };

              return (
                <div className="p-4 rounded-3xl bg-slate-900/90 border-2 border-cyan-500/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                        HUD Superior Direito • Estilo Vidro (Glassmorphism)
                      </span>
                      <h3 className="text-sm font-black text-white mt-1">
                        Barra de Acesso Estilo Vidro com 6 Ícones Circulares
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Posicionado no canto superior oposto ao Header de Player (PV/EXP). Personalize cada um dos 6 ícones circulares, ações e estilo translúcido.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateHudConfig({
                            topGlassBarHud: {
                              ...glassCfg,
                              visible: glassCfg.visible === false ? true : false,
                            },
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                          glassCfg.visible !== false
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {glassCfg.visible !== false ? '👁️ Visível no HUD' : '🚫 Oculto'}
                      </button>
                    </div>
                  </div>

                  {/* Edição individual dos 6 Ícones Circulares */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-bold text-cyan-300 uppercase tracking-wider">
                        6 Ícones Circulares da Barra de Vidro
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          updateGlassBarSlotsBothScreens(
                            DEFAULT_TOP_GLASS_BAR_SLOTS.map((s) => ({ ...s }))
                          );
                          showToast?.('🔄 6 ícones padrão da Cápsula de Vidro restaurados!');
                        }}
                        className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer font-bold"
                      >
                        Restaurar 6 Ícones Padrão
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {currentSlots.map((slot, idx) => (
                        <div
                          key={slot.id || idx}
                          className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/40 transition-all space-y-2.5 shadow-sm"
                        >
                          {/* Cabeçalho do Card: Título do Ícone e Prévia Circular */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] font-mono font-black text-cyan-400">
                                Ícone Circular #{idx + 1}
                              </span>
                              {slot.customIconUrl ? (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                                  PNG Ativo
                                </span>
                              ) : (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 font-mono">
                                  Padrão
                                </span>
                              )}
                            </div>

                            {/* Círculo do Ícone: Clicável para Upload Direto */}
                            <button
                              type="button"
                              onClick={() => triggerUploadFor(`btn-glass-slot-${idx}`)}
                              title="Clique para importar ou trocar a imagem PNG deste ícone circular"
                              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 border-2 border-amber-400/80 hover:border-amber-300 flex items-center justify-center text-sm transition-all overflow-hidden cursor-pointer shadow-md relative group shrink-0"
                            >
                              {slot.customIconUrl ? (
                                <img
                                  src={slot.customIconUrl}
                                  alt={slot.label}
                                  className="w-full h-full object-contain p-0.5"
                                />
                              ) : (
                                <span className="text-base leading-none">{slot.iconEmoji || '✨'}</span>
                              )}
                              <span className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[8px] text-cyan-200 font-black transition-opacity">
                                PNG
                              </span>
                            </button>
                          </div>

                          {/* Seção Principal: Importar PNG ao invés de Emote */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[9.5px] font-bold text-cyan-300 flex items-center gap-1">
                                <Upload className="w-3 h-3 text-cyan-400" />
                                <span>Ícone em PNG</span>
                              </label>
                              {slot.customIconUrl && (
                                <button
                                  type="button"
                                  onClick={() => updateGlassSlot(idx, { customIconUrl: undefined })}
                                  className="text-[9px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 font-bold cursor-pointer transition-colors"
                                  title="Remover imagem PNG e voltar ao ícone/emoji padrão"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                  <span>Remover PNG</span>
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => triggerUploadFor(`btn-glass-slot-${idx}`)}
                                className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-all border ${
                                  slot.customIconUrl
                                    ? 'bg-slate-800 hover:bg-slate-700 text-cyan-200 border-cyan-500/40'
                                    : 'bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 hover:from-cyan-500 hover:to-indigo-500 text-white border-cyan-400/50 shadow-cyan-600/20'
                                }`}
                              >
                                <Upload className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                  {slot.customIconUrl ? 'Substituir PNG' : 'Importar PNG'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setTargetAssetButtonId(`btn-glass-slot-${idx}`);
                                  setAssetPickerOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0"
                                title="Escolher asset PNG da Galeria"
                              >
                                <Images className="w-3.5 h-3.5 text-amber-400" />
                                <span>Galeria</span>
                              </button>
                            </div>
                          </div>

                          {/* Rótulo / Tooltip & Emoji Fallback */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="text-[9px] text-slate-400 block mb-0.5">
                                Rótulo / Tooltip
                              </label>
                              <input
                                type="text"
                                value={slot.label}
                                onChange={(e) =>
                                  updateGlassSlot(idx, { label: e.target.value })
                                }
                                className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-semibold"
                                placeholder="Nome do botão"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-0.5" title="Emoji fallback usado caso o PNG não exista">
                                Emoji (Alt)
                              </label>
                              <input
                                type="text"
                                value={slot.iconEmoji}
                                onChange={(e) =>
                                  updateGlassSlot(idx, { iconEmoji: e.target.value })
                                }
                                className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-center text-white"
                                placeholder="✨"
                              />
                            </div>
                          </div>

                          {/* Ação ao Clicar & Badge */}
                          <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                              <label className="text-[9px] text-slate-400 block mb-0.5">
                                Ação ao Clicar
                              </label>
                              <select
                                value={slot.actionType}
                                onChange={(e) =>
                                  updateGlassSlot(idx, {
                                    actionType: e.target.value as TopGlassBarIconSlotConfig['actionType'],
                                  })
                                }
                                className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] text-cyan-200 font-semibold"
                              >
                                <option value="open_inventory">🎒 Abrir Mochila / Inventário</option>
                                <option value="open_quests">📜 Abrir Pop-up de Quests</option>
                                <option value="toggle_map">🗺️ Abrir / Alternar Mapa</option>
                                <option value="open_dialogue">💬 Interagir / Diálogo</option>
                                <option value="toggle_audio">🎵 Alternar Som / BGM</option>
                                <option value="quick_status">⚡ Ver Status do Herói</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-400 block mb-0.5">
                                Badge
                              </label>
                              <input
                                type="text"
                                placeholder="Ex: 3"
                                value={slot.badgeText || ''}
                                onChange={(e) =>
                                  updateGlassSlot(idx, { badgeText: e.target.value })
                                }
                                className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-amber-300 font-bold text-center"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Posição X/Y, Escala e Opacidade */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Deslocamento X</span>
                        <span className="font-mono text-white">{glassCfg.x || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="-220"
                        max="120"
                        value={glassCfg.x || 0}
                        onChange={(e) =>
                          updateHudConfig({
                            topGlassBarHud: {
                              ...glassCfg,
                              visible: true,
                              x: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Deslocamento Y</span>
                        <span className="font-mono text-white">{glassCfg.y || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="-40"
                        max="220"
                        value={glassCfg.y || 0}
                        onChange={(e) =>
                          updateHudConfig({
                            topGlassBarHud: {
                              ...glassCfg,
                              visible: true,
                              y: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Escala Visual</span>
                        <span className="font-mono text-white">
                          {((glassCfg.scale || 1.0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.6"
                        max="1.5"
                        step="0.05"
                        value={glassCfg.scale || 1.0}
                        onChange={(e) =>
                          updateHudConfig({
                            topGlassBarHud: {
                              ...glassCfg,
                              visible: true,
                              scale: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Opacidade</span>
                        <span className="font-mono text-white">
                          {((glassCfg.opacity || 1.0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.25"
                        max="1.0"
                        step="0.05"
                        value={glassCfg.opacity || 1.0}
                        onChange={(e) =>
                          updateHudConfig({
                            topGlassBarHud: {
                              ...glassCfg,
                              visible: true,
                              opacity: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* =========================================================================
                PAINEL DE EDIÇÃO: BARRAS DESLIZANTES EMPILHADAS DE COLETA (CANTO DIREITO)
               ========================================================================= */}
            {selectedButtonId === 'btn-loot-toast' && (() => {
              const lootCfg = hudConfig.lootToastHud || {
                visible: true,
                x: 0,
                y: 0,
                scale: 1.0,
                opacity: 1.0,
                barFillColor: '#f59e0b',
                bottomLipColor: '#14532d',
                textColor: '#ffffff',
                maxStack: 4,
                durationMs: 3600,
                side: 'right' as const,
                edgeSide: 'right' as const,
              };

              return (
                <div className="p-4 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-xl space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Notificações Empilhadas • Fiel à Imagem de Referência
                      </span>
                      <h3 className="text-sm font-black text-white mt-1">
                        Barras Deslizantes de Itens Coletados & Consequências (Canto Direito)
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Quando o jogador coleta itens no mapa, baús ou avança quests, barras horizontais deslizam da borda direita dentro do emulador e se empilham automaticamente.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePushPreviewLootToast}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
                      >
                        + Testar Empilhamento
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateHudConfig({
                            lootToastHud: {
                              ...lootCfg,
                              visible: lootCfg.visible === false ? true : false,
                            },
                          })
                        }
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer ${
                          lootCfg.visible !== false
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        }`}
                      >
                        {lootCfg.visible !== false ? '👁️ Visível no HUD' : '🚫 Oculto'}
                      </button>
                    </div>
                  </div>

                  {/* Cores e Estilo 3D da Barra Deslizante */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Cor Principal da Barra
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={lootCfg.barFillColor || lootCfg.barColor || '#f59e0b'}
                          onChange={(e) =>
                            updateHudConfig({
                              lootToastHud: {
                                ...lootCfg,
                                visible: true,
                                barFillColor: e.target.value,
                                barColor: e.target.value,
                              },
                            })
                          }
                          className="w-8 h-7 rounded cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono text-amber-300">
                          {lootCfg.barFillColor || lootCfg.barColor || '#f59e0b'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Sombra 3D Inferior (Verde)
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={lootCfg.bottomLipColor || lootCfg.lipColor || '#14532d'}
                          onChange={(e) =>
                            updateHudConfig({
                              lootToastHud: {
                                ...lootCfg,
                                visible: true,
                                bottomLipColor: e.target.value,
                                lipColor: e.target.value,
                              },
                            })
                          }
                          className="w-8 h-7 rounded cursor-pointer bg-transparent"
                        />
                        <span className="text-xs font-mono text-emerald-300">
                          {lootCfg.bottomLipColor || lootCfg.lipColor || '#14532d'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Máx. Barras Empilhadas ({lootCfg.maxStack ?? 4})
                      </label>
                      <input
                        type="range"
                        min="2"
                        max="7"
                        value={lootCfg.maxStack ?? 4}
                        onChange={(e) =>
                          updateHudConfig({
                            lootToastHud: {
                              ...lootCfg,
                              visible: true,
                              maxStack: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer mt-1.5"
                      />
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <label className="text-[10px] text-slate-400 block mb-1">
                        Lado da Borda
                      </label>
                      <select
                        value={lootCfg.edgeSide || lootCfg.side || 'right'}
                        onChange={(e) => {
                          const nextSide = e.target.value as 'left' | 'right';
                          updateHudConfig({
                            lootToastHud: {
                              ...lootCfg,
                              visible: true,
                              side: nextSide,
                              edgeSide: nextSide,
                            },
                          });
                        }}
                        className="w-full px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                      >
                        <option value="right">➡️ Canto Direito (Padrão)</option>
                        <option value="left">⬅️ Canto Esquerdo</option>
                      </select>
                    </div>
                  </div>

                  {/* Posição Vertical, Escala e Tempo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Altura / Offset Vertical (Y)</span>
                        <span className="font-mono text-white">{lootCfg.y || 0}px</span>
                      </div>
                      <input
                        type="range"
                        min="-160"
                        max="240"
                        value={lootCfg.y || 0}
                        onChange={(e) =>
                          updateHudConfig({
                            lootToastHud: {
                              ...lootCfg,
                              visible: true,
                              y: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Escala Visual</span>
                        <span className="font-mono text-white">
                          {((lootCfg.scale || 1.0) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.65"
                        max="1.45"
                        step="0.05"
                        value={lootCfg.scale || 1.0}
                        onChange={(e) =>
                          updateHudConfig({
                            lootToastHud: {
                              ...lootCfg,
                              visible: true,
                              scale: parseFloat(e.target.value),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                        <span>Duração na Tela</span>
                        <span className="font-mono text-white">
                          {((lootCfg.durationMs || 3600) / 1000).toFixed(1)}s
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1500"
                        max="8000"
                        step="500"
                        value={lootCfg.durationMs || 3600}
                        onChange={(e) =>
                          updateHudConfig({
                            lootToastHud: {
                              ...lootCfg,
                              visible: true,
                              durationMs: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* =========================================================================
                PAINEL DE EDIÇÃO DOS BOTÕES CUSTOMIZADOS
               ========================================================================= */}
            {selectedCustomButton && (
              <div className="p-4 rounded-3xl bg-slate-900/90 border-2 border-amber-500/40 shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 flex items-center justify-center overflow-hidden">
                      {selectedCustomButton.assetUrl ? (
                        <img
                          src={selectedCustomButton.assetUrl}
                          alt="Asset"
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-xs font-bold text-amber-300">
                          {selectedCustomButton.shortcutKey || '★'}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-amber-300">
                        {selectedCustomButton.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ID: {selectedCustomButton.id}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteButton(selectedCustomButton.id)}
                    className="p-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white transition-colors cursor-pointer"
                    title="Excluir este botão"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Nome do Botão</label>
                    <input
                      type="text"
                      value={selectedCustomButton.name}
                      onChange={(e) =>
                        updateCustomButton(selectedCustomButton.id, { name: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-1">Atalho de Teclado</label>
                    <input
                      type="text"
                      value={selectedCustomButton.shortcutKey || ''}
                      onChange={(e) =>
                        updateCustomButton(selectedCustomButton.id, { shortcutKey: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-amber-300 font-mono"
                      placeholder="ex: Space, J, K"
                    />
                  </div>
                </div>

                {/* Asset do Botão */}
                <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Asset Visual do Botão (PNG)
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-700/60 bg-slate-950/70 overflow-hidden shrink-0 shadow-inner">
                      {selectedCustomButton.assetUrl ? (
                        <img
                          src={selectedCustomButton.assetUrl}
                          alt="Botão"
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <span className="text-xl text-slate-500">★</span>
                      )}
                    </div>
                    <div className="flex-1 flex flex-wrap gap-2">
                      <button
                        onClick={() => triggerUploadFor(selectedCustomButton.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload PNG</span>
                      </button>
                      <button
                        onClick={() => {
                          setTargetAssetButtonId(selectedCustomButton.id);
                          setAssetPickerOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer flex items-center gap-1.5"
                      >
                        <Images className="w-3.5 h-3.5 text-amber-400" />
                        <span>Galeria</span>
                      </button>
                      {selectedCustomButton.assetUrl && (
                        <button
                          onClick={() => {
                            updateCustomButton(selectedCustomButton.id, { assetUrl: undefined });
                            showToast?.('Asset removido do botão.');
                          }}
                          className="px-2 py-1.5 rounded-lg bg-rose-950/40 text-rose-300 text-[11px] font-bold border border-rose-800/50 cursor-pointer"
                        >
                          ✕ Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Posição X</span>
                      <span className="font-mono text-white">{selectedCustomButton.x}px</span>
                    </div>
                    <input
                      type="range"
                      min="-200"
                      max="200"
                      value={selectedCustomButton.x}
                      onChange={(e) =>
                        updateCustomButton(selectedCustomButton.id, {
                          x: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Posição Y</span>
                      <span className="font-mono text-white">{selectedCustomButton.y}px</span>
                    </div>
                    <input
                      type="range"
                      min="-50"
                      max="350"
                      value={selectedCustomButton.y}
                      onChange={(e) =>
                        updateCustomButton(selectedCustomButton.id, {
                          y: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Escala</span>
                      <span className="font-mono text-white">
                        {((selectedCustomButton.scale || 1.0) * 100).toFixed(0)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.5"
                      step="0.05"
                      value={selectedCustomButton.scale || 1.0}
                      onChange={(e) =>
                        updateCustomButton(selectedCustomButton.id, {
                          scale: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-[10px] mb-1 text-slate-400">
                      <span>Tamanho Base</span>
                      <span className="font-mono text-white">{selectedCustomButton.size || 54}px</span>
                    </div>
                    <input
                      type="range"
                      min="36"
                      max="90"
                      value={selectedCustomButton.size || 54}
                      onChange={(e) =>
                        updateCustomButton(selectedCustomButton.id, {
                          size: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>


                {/* Conexão de Ação */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-amber-500/40 space-y-2.5">
                  <label className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Conexão de Ação</span>
                  </label>
                  <select
                    value={selectedCustomButton.action.type}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'player_action') {
                        updateCustomButton(selectedCustomButton.id, {
                          action: { type: 'player_action', action: 'attack' },
                        });
                      } else if (val === 'open_dialogue') {
                        updateCustomButton(selectedCustomButton.id, {
                          action: { type: 'open_dialogue' },
                        });
                      } else if (val === 'open_inventory') {
                        updateCustomButton(selectedCustomButton.id, {
                          action: { type: 'open_inventory' },
                        });
                      } else if (val === 'open_quest_popup') {
                        updateCustomButton(selectedCustomButton.id, {
                          action: { type: 'open_quest_popup', initialTab: 'jornada' },
                        });
                      } else if (val === 'pause_game') {
                        updateCustomButton(selectedCustomButton.id, {
                          action: { type: 'pause_game' },
                        });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white font-bold"
                  >
                    <option value="player_action">⚔️ Ação do Jogador (Ataque, Pulo, etc.)</option>
                    <option value="open_quest_popup">✦ Abrir Pop-up de Jornada & Tarefas</option>
                    <option value="open_dialogue">💬 Abrir Tela de Diálogo com NPC</option>
                    <option value="open_inventory">🎒 Abrir Mochila / Inventário</option>
                    <option value="pause_game">⏸️ Pausar Jogo</option>
                  </select>

                  {selectedCustomButton.action.type === 'player_action' && (
                    <div className="grid grid-cols-2 gap-1.5 pt-1">
                      {[
                        { id: 'attack', label: '⚔️ Ataque / Golpe' },
                        { id: 'jump', label: '🦘 Pulo / Salto' },
                        { id: 'dash', label: '💨 Dash Rápido' },
                        { id: 'interact', label: '🖐️ Interagir' },
                      ].map((act) => (
                        <button
                          key={act.id}
                          onClick={() =>
                            updateCustomButton(selectedCustomButton.id, {
                              action: { type: 'player_action', action: act.id as any },
                            })
                          }
                          className={`py-1 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            (selectedCustomButton.action as any).action === act.id
                              ? 'bg-amber-500 text-slate-950 shadow-sm'
                              : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TELA 2: TELA OFICIAL DE DIÁLOGOS (Visual Novel Real do Jogo)
           ========================================================================= */}
        {activeScreen.type === 'dialogue' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-emerald-300 block">
                  💬 Tela Oficial de Diálogos (RPG / Visual Novel)
                </span>
                <span className="text-[11px] text-slate-400">
                  Exibição cinematográfica com o personagem em corpo inteiro, textos e escolhas.
                </span>
              </div>
            </div>

            {/* Lista dos NPCs e Marcadores com Diálogo na Fase */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-emerald-400" />
                  <span>NPCs com Diálogo Ativo na Fase ({dialogueMarkers.length})</span>
                </label>
              </div>

              {dialogueMarkers.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                  <span className="text-2xl block">💬</span>
                  <span className="text-xs font-bold text-slate-300 block">
                    Nenhum marcador com diálogo ativo nesta fase ainda.
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Escolha um marcador do mapa abaixo para habilitar o diálogo oficial!
                  </span>
                </div>
              ) : (
                <div className="space-y-2">
                  {dialogueMarkers.map((marker) => {
                    const isMotionAsset = marker.motionLayers && marker.motionLayers.length > 0;
                    const speakerName = marker.dialogueCharacterName || marker.name;
                    const phrasesCount =
                      marker.dialogueSteps?.length || marker.npcPhrases?.length || 1;

                    return (
                      <div
                        key={marker.id}
                        className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-emerald-500/50 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-11 h-11 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
                              {marker.dialogueCharacterPng || marker.customIconPng ? (
                                <img
                                  src={marker.dialogueCharacterPng || marker.customIconPng}
                                  alt={speakerName}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <span className="text-xl">👑</span>
                              )}
                            </div>

                            <div className="min-w-0">
                              <span className="text-xs font-bold text-white block truncate">
                                {speakerName}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                {isMotionAsset && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                                    <Sparkles className="w-2.5 h-2.5" />
                                    <span>Motion Asset ({marker.motionLayers!.length} camadas)</span>
                                  </span>
                                )}
                                {marker.quest && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    🎯 Missão
                                  </span>
                                )}
                                {marker.eventKind === 'duel' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                    ⚔️ Duelo
                                  </span>
                                )}
                                <span className="text-[9px] text-slate-400 font-mono">
                                  {phrasesCount} {phrasesCount === 1 ? 'fala' : 'falas'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação do Diálogo */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                          <button
                            onClick={() => {
                              onTestDialogue?.(marker.id);
                              showToast?.(`▶️ Testando Diálogo Oficial de "${speakerName}" no Emulador!`);
                            }}
                            className="h-8 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/30 transition-transform active:scale-95 cursor-pointer"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Testar no Emulador</span>
                          </button>

                          <button
                            onClick={() => {
                              onOpenDialogueStudio?.(marker.id);
                            }}
                            className="h-8 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] flex items-center justify-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
                          >
                            <span>✏️ Editar Diálogo</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Habilitar diálogo em marcadores que ainda não têm */}
              {nonDialogueMarkers.length > 0 && (
                <div className="pt-3 border-t border-slate-800 space-y-2">
                  <label className="text-[11px] font-bold text-slate-400 block">
                    ➕ Habilitar Diálogo em Outro Marcador do Mapa
                  </label>
                  <div className="flex items-center gap-2">
                    <select
                      id="select-enable-dialogue"
                      className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
                      defaultValue=""
                    >
                      <option value="" disabled>
                        Selecione um marcador do mapa...
                      </option>
                      {nonDialogueMarkers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.type || 'marcador'})
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const sel = document.getElementById(
                          'select-enable-dialogue'
                        ) as HTMLSelectElement;
                        const mId = sel?.value;
                        if (!mId) return;
                        const m = project.markers.find((mk) => mk.id === mId);
                        if (!m) return;

                        const updatedMarkers = project.markers.map((mk) =>
                          mk.id === mId
                            ? {
                                ...mk,
                                dialogueEnabled: true,
                                dialogueCharacterName: mk.name,
                                dialogueText: 'Olá viajante! O que o traz até aqui?',
                              }
                            : mk
                        );
                        onUpdateProject({ markers: updatedMarkers });
                        showToast?.(`💬 Diálogo habilitado para "${m.name}"!`);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 cursor-pointer"
                    >
                      Habilitar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TELA 3: INVENTÁRIO GERAL DO JOGADOR
           ========================================================================= */}
        {activeScreen.type === 'inventory' && (
          <div className="space-y-4">
            <InventoryManagerStudio
              project={project}
              onUpdateProject={onUpdateProject}
              galleryAssets={galleryAssets}
              showToast={showToast}
            />
          </div>
        )}
      </div>

      {/* Modal de Escolha de Asset da Galeria */}
      {assetPickerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl max-h-[80vh] bg-slate-900 border-2 border-indigo-500/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 gap-2">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Images className="w-4 h-4 text-amber-400" />
                <span>Escolher Asset da Galeria ({effectiveGalleryAssets.length})</span>
              </h3>
              <div className="flex items-center gap-2">
                {targetAssetButtonId && (
                  <button
                    type="button"
                    onClick={() => {
                      const btnId = targetAssetButtonId;
                      setAssetPickerOpen(false);
                      triggerUploadFor(btnId);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Importar PNG do PC</span>
                  </button>
                )}
                <button
                  onClick={() => setAssetPickerOpen(false)}
                  className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {effectiveGalleryAssets.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-3">
                  <Images className="w-12 h-12 mx-auto opacity-30" />
                  <p className="text-xs">Nenhum asset na galeria ainda.</p>
                  <p className="text-[11px] text-slate-400">
                    Você pode importar um PNG diretamente do seu computador:
                  </p>
                  {targetAssetButtonId && (
                    <button
                      type="button"
                      onClick={() => {
                        const btnId = targetAssetButtonId;
                        setAssetPickerOpen(false);
                        triggerUploadFor(btnId);
                      }}
                      className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-black inline-flex items-center gap-1.5 cursor-pointer shadow-md"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Escolher PNG no Computador</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {effectiveGalleryAssets.map((asset) => {
                    const assetSrc = asset.dataUrl || (asset as any).url;
                    return (
                      <button
                        key={asset.id}
                        onClick={() => handleSelectAssetFromGallery(assetSrc)}
                        className="group p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-amber-400 hover:bg-slate-800/80 flex flex-col items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <div className="w-14 h-14 rounded-lg bg-slate-900 flex items-center justify-center overflow-hidden">
                          <img
                            src={assetSrc}
                            alt={asset.name}
                            className="w-full h-full object-contain group-hover:scale-110 transition-transform"
                          />
                        </div>
                        <span className="text-[10px] text-slate-300 truncate w-full text-center">
                          {asset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pop-up de Jornada (Quest Principal) & Tarefas (Side Quests) dentro de Telas */}
      {questPopupModalState.open && (
        <QuestJourneyPopupModal
          project={project}
          initialTab={questPopupModalState.initialTab}
          initialSelectedQuestId={questPopupModalState.questId}
          onClose={() => setQuestPopupModalState((prev) => ({ ...prev, open: false }))}
          onUpdateProject={onUpdateProject}
          isInsideEmulator={false}
          isLandscape={activeScreen.id === 'screen_player_hud_landscape'}
        />
      )}
    </div>
  );
};
