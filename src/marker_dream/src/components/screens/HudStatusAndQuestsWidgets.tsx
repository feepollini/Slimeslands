import React, { useState, useMemo, useEffect } from 'react';
import { X, Check, Lock, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getResolvedPlayerPetConfig,
  type MapProject,
  type PlayerHeaderHudElementConfig,
  type QuestTrackerHudElementConfig,
  type TopGlassBarHudElementConfig,
  type TopGlassBarIconSlotConfig,
  type LootToastBarHudElementConfig,
} from '../../types/map';
import type { QuestDefinition, QuestRuntimeStatus } from '../../types/questSystem';
import {
  ensureProjectQuestsConfig,
  summarizeRewardItems,
  saveProjectQuestsConfigToStorage,
} from '../../utils/questEngine';
import { resolveVisibleMotionLayersForPlayer } from '../../utils/inventoryHelpers';
import { MotionAssetCanvas } from '../MotionAssetCanvas';

export interface UnifiedHudQuestEntry {
  id: string;
  orderIndex: number;
  title: string;
  subtitle?: string;
  description: string;
  tabCategory: 'jornada' | 'tarefas';
  status: QuestRuntimeStatus;
  isLocked: boolean;
  isCompleted: boolean;
  isSelectedForMap: boolean;
  iconEmoji: string;
  targetMarkerIds: string[];
  phaseId?: string;
  objectives: {
    id: string;
    title: string;
    current: number;
    required: number;
    completed: boolean;
  }[];
  rewardsSummary: string;
  rawQuest?: QuestDefinition;
  isLocalMarkerQuest?: boolean;
  markerId?: string;
}

/**
 * Extrai e ordena as Quests Principais (Jornada) e Side Quests (Tarefas) da fase atual.
 */
export function getOrderedPhaseQuests(
  project: MapProject,
  filterCurrentPhaseOnly: boolean = true
): {
  jornada: UnifiedHudQuestEntry[];
  tarefas: UnifiedHudQuestEntry[];
} {
  const qCfg = ensureProjectQuestsConfig(project);
  const progressMap =
    qCfg.playerState?.questsProgress ||
    (qCfg as any).runtimeState?.questStates ||
    {};

  const trackedIdsList: string[] = Array.isArray(qCfg.trackedQuestIds)
    ? qCfg.trackedQuestIds
    : qCfg.activeQuestId
    ? [qCfg.activeQuestId]
    : [];
  const trackedSet = new Set<string>(trackedIdsList);

  const currentPhaseId = project.id;

  const matchesPhase = (q: QuestDefinition) => {
    if (!filterCurrentPhaseOnly) return true;
    if (!q.primaryPhaseId && (!q.involvedPhaseIds || q.involvedPhaseIds.length === 0)) {
      return true;
    }
    if (q.primaryPhaseId === currentPhaseId) return true;
    if (q.involvedPhaseIds?.includes(currentPhaseId)) return true;
    return true;
  };

  const allEngineQuests = (qCfg.quests || []).filter(matchesPhase);

  const mainQuestsRaw: QuestDefinition[] = [];
  const sideQuestsRaw: QuestDefinition[] = [];

  allEngineQuests.forEach((q) => {
    if (
      q.category === 'main' ||
      q.id === 'quest_negocios_viajante' ||
      q.id === 'quest_ramificada_caravana'
    ) {
      mainQuestsRaw.push(q);
    } else {
      sideQuestsRaw.push(q);
    }
  });

  const invItems = project.playerInventory?.items || [];
  const allMarkers = project.markers || [];

  const mapQuestToUnified = (
    q: QuestDefinition,
    idx: number,
    tabCategory: 'jornada' | 'tarefas',
    _prevCompleted: boolean
  ): UnifiedHudQuestEntry => {
    const rt = progressMap[q.id];
    let status: QuestRuntimeStatus = rt?.status || ((q as any).status as QuestRuntimeStatus) || 'available';

    if (idx === 0 && status === 'locked' && !rt?.acceptedAt) {
      status = 'active';
    }

    const isCompleted = status === 'completed';
    const isLocked = status === 'locked';

    const targetMarkerIds = new Set<string>();
    allMarkers.forEach((m) => {
      if (m.linkedQuestId === q.id) targetMarkerIds.add(m.id);
    });

    const objectives = (q.objectives || []).map((obj) => {
      if (obj.targetNpcId) targetMarkerIds.add(obj.targetNpcId);
      if (obj.targetItemId || obj.targetItemName) {
        allMarkers.forEach((m) => {
          if (m.type === 'collectible' && m.questResource) {
            if (
              (obj.targetItemId && m.questResource.id === obj.targetItemId) ||
              (obj.targetItemName &&
                m.questResource.name.toLowerCase().includes(obj.targetItemName.toLowerCase()))
            ) {
              targetMarkerIds.add(m.id);
            }
          }
        });
      }

      const objProg = rt?.objectivesProgress?.[obj.id];
      let current = objProg?.currentAmount ?? (objProg as any)?.currentCount ?? 0;
      const required = Math.max(1, obj.requiredAmount || (obj as any).targetCount || 1);

      // Se for objetivo de coleta/entrega e o jogador já coletou o item na mochila, reflete a contagem ao vivo
      if ((obj.kind === 'collect_item' || obj.kind === 'deliver_item') && current < required && !isCompleted) {
        const matchedInv = invItems.find(
          (it) =>
            (obj.targetItemId && (it.id === obj.targetItemId || it.definitionId === obj.targetItemId)) ||
            (obj.targetItemName && it.name.toLowerCase().includes(obj.targetItemName.toLowerCase()))
        );
        if (matchedInv && (matchedInv.quantity || 0) > current) {
          current = Math.min(required, matchedInv.quantity || 0);
        }
      }

      const completed = objProg?.status === 'completed' || isCompleted || current >= required;
      return {
        id: obj.id,
        title: obj.title || obj.description,
        current: completed ? required : current,
        required,
        completed,
      };
    });

    return {
      id: q.id,
      orderIndex: idx + 1,
      title: q.title,
      subtitle: q.subtitle,
      description: q.description,
      tabCategory,
      status,
      isLocked,
      isCompleted,
      isSelectedForMap: trackedSet.has(q.id),
      iconEmoji: (q as any).iconEmoji || (q as any).icon || '📜',
      targetMarkerIds: Array.from(targetMarkerIds),
      phaseId: q.primaryPhaseId || currentPhaseId,
      objectives,
      rewardsSummary: summarizeRewardItems(q.rewards, project),
      rawQuest: q,
    };
  };

  const jornada: UnifiedHudQuestEntry[] = [];
  mainQuestsRaw.forEach((q, idx) => {
    const prevDone = idx === 0 ? true : jornada[idx - 1]?.isCompleted;
    jornada.push(mapQuestToUnified(q, idx, 'jornada', prevDone));
  });

  const tarefas: UnifiedHudQuestEntry[] = [];
  sideQuestsRaw.forEach((q, idx) => {
    const prevDone = idx === 0 ? true : tarefas[idx - 1]?.isCompleted;
    tarefas.push(mapQuestToUnified(q, idx, 'tarefas', prevDone));
  });

  const npcQuestMarkers = allMarkers.filter(
    (m) => (m.type === 'npc' || m.type === 'boss') && m.quest
  );
  npcQuestMarkers.forEach((m) => {
    const localQuestId = `npc-quest-${m.id}`;
    const alreadyInEngine = tarefas.some((t) => t.id === localQuestId);
    if (alreadyInEngine) return;
    const orderIdx = tarefas.length + 1;
    const resName = m.quest?.resourceName || 'Objetivo';
    const reqAmt = Math.max(1, m.quest?.requiredAmount || (m.quest as any)?.amount || m.quest?.requiredCount || 1);

    const localRt = progressMap[localQuestId];
    let curAmt = m.quest?.currentAmount ?? localRt?.objectivesProgress?.[`obj-npc-${m.id}`]?.currentAmount ?? 0;

    if (m.quest?.kind === 'collect' && curAmt < reqAmt) {
      const matchedInv = invItems.find(
        (it) => it.name.toLowerCase().includes(resName.toLowerCase()) || resName.toLowerCase().includes(it.name.toLowerCase())
      );
      if (matchedInv && (matchedInv.quantity || 0) > curAmt) {
        curAmt = Math.min(reqAmt, matchedInv.quantity || 0);
      }
    }

    const rawStatus: QuestRuntimeStatus =
      localRt?.status ||
      ((m.quest as any)?.status as QuestRuntimeStatus) ||
      (curAmt > 0 ? 'active' : 'available');
    const isCompleted = rawStatus === 'completed';
    const isLocked = rawStatus === 'locked';
    const effectiveCur = isCompleted ? reqAmt : Math.min(reqAmt, curAmt);

    const targetIds = new Set<string>([m.id, ...(m.quest?.targetMarkerIds || [])]);
    if (m.quest?.kind === 'collect' && m.quest?.resourceName) {
      allMarkers.forEach((mk) => {
        if (
          mk.type === 'collectible' &&
          mk.questResource?.name &&
          mk.questResource.name.toLowerCase().includes(resName.toLowerCase())
        ) {
          targetIds.add(mk.id);
        }
      });
    }

    const objLabel =
      m.quest?.kind === 'talk'
        ? `Conversar com ${m.name}`
        : m.quest?.kind === 'duel'
        ? `Vencer Duelo contra ${m.name}`
        : m.quest?.kind === 'discover'
        ? m.quest?.instructions || `Ativar Evento de ${m.name}`
        : `Coletar ${reqAmt}x ${m.quest?.iconEmoji || '📦'} ${resName}`;

    tarefas.push({
      id: localQuestId,
      orderIndex: orderIdx,
      title: m.quest?.title || `Missão de ${m.name}`,
      subtitle: `NPC: ${m.name}`,
      description:
        m.quest?.instructions ||
        (m.quest as any)?.description ||
        `Ajude ${m.name} concluindo: ${objLabel}.`,
      tabCategory: 'tarefas',
      status: rawStatus,
      isLocked,
      isCompleted,
      isSelectedForMap: trackedSet.has(localQuestId) || Boolean(m.linkedQuestId && trackedSet.has(m.linkedQuestId)),
      iconEmoji: m.quest?.iconEmoji || '🎯',
      targetMarkerIds: Array.from(targetIds),
      phaseId: currentPhaseId,
      objectives: [
        {
          id: `obj-npc-${m.id}`,
          title: objLabel,
          current: effectiveCur,
          required: reqAmt,
          completed: isCompleted || effectiveCur >= reqAmt,
        },
      ],
      rewardsSummary: (m.quest as any)?.rewardItem
        ? `${(m.quest as any).rewardAmount || 1}x ${(m.quest as any).rewardItem}`
        : '200 XP + 120 Moedas de Ouro',
      isLocalMarkerQuest: true,
      markerId: m.id,
    });
  });

  return { jornada, tarefas };
}

/**
 * Ícone SVG de cadeado arredondado cinza fiel à imagem de referência
 */
export const HudLockIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M7 10V7C7 4.23858 9.23858 2 12 2C14.7614 2 17 4.23858 17 7V10"
      stroke="#d1d5db"
      strokeWidth="2.8"
      strokeLinecap="round"
    />
    <rect x="4" y="10" width="16" height="12" rx="4" fill="#d1d5db" />
  </svg>
);

/**
 * Ícone SVG de estrela de 4 pontas dourada fiel à imagem de referência (✦)
 */
export const HudFourPointStarIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <path
      d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2L12 1Z"
      fill="#fbbf24"
      stroke="#78350f"
      strokeWidth="1.2"
    />
  </svg>
);

/**
 * Formata o valor de PV ou EXP conforme o estilo escolhido (Padrão: 7 dígitos com zeros à esquerda, ex: 0000000 PV)
 */
export function formatHudStatNumber(
  current: number,
  max: number,
  unit: 'PV' | 'EXP',
  format: PlayerHeaderHudElementConfig['numberFormat'] = 'padded_7'
): string {
  const safeCur = Math.max(0, Math.round(current || 0));
  const safeMax = Math.max(1, Math.round(max || 100));
  if (format === 'current_max') {
    return `${safeCur}/${safeMax} ${unit}`;
  }
  if (format === 'simple') {
    return `${safeCur} ${unit}`;
  }
  return `${String(safeCur).padStart(7, '0')} ${unit}`;
}

// ============================================================================
// 1. COMPONENTE VISUAL: HEADER COM ÍCONE CIRCULAR + BARRA DE PV E EXP
//    Adaptado tanto para Retrato quanto para Paisagem com estética Game 3D
// ============================================================================

export const PlayerHeaderHudWidget: React.FC<{
  project: MapProject;
  config?: PlayerHeaderHudElementConfig;
  isLandscape?: boolean;
  onClickHeader?: () => void;
}> = ({ project, config, isLandscape = false, onClickHeader }) => {
  const qCfg = ensureProjectQuestsConfig(project);
  const currentHp = project.player?.stats?.hp ?? project.player?.Stats_Base?.HP_Max ?? 180;
  const maxHp = Math.max(1, project.player?.stats?.maxHp ?? project.player?.Stats_Base?.HP_Max ?? 180);

  const currentExp =
    qCfg.playerState?.totalCumulativeXp ??
    qCfg.playerState?.currentLevelXp ??
    project.player?.totalCumulativeXp ??
    project.player?.currentXp ??
    0;
  const maxExp = 1000;
  const playerLevel =
    qCfg.playerState?.level ??
    project.player?.Progression_Global?.Level ??
    project.player?.level ??
    Math.max(1, Math.floor(currentExp / 1000) + 1);

  const hpBarColor = config?.hpBarColor || '#ef4444';
  const expBarColor = config?.expBarColor || '#e5c168';
  const numberFormat = config?.numberFormat || 'current_max';

  const avatarSrc =
    config?.customIconUrl ||
    (config?.showPlayerAvatar !== false
      ? project.player?.avatarPng || project.player?.avatarDownPng || '/cards/1.jpg'
      : '/cards/1.jpg');

  const hpPercent = Math.max(12, Math.min(100, (currentHp / maxHp) * 100));
  const expPercent = currentExp > 0 ? Math.max(12, Math.min(100, ((currentExp % maxExp) / maxExp) * 100)) : 14;

  const pvText =
    numberFormat === 'padded_7' && config?.numberFormat === 'padded_7'
      ? `${currentHp}/${maxHp} PV`
      : formatHudStatNumber(currentHp, maxHp, 'PV', numberFormat);
  const expText =
    numberFormat === 'padded_7' && config?.numberFormat === 'padded_7'
      ? `${currentExp}/${maxExp} EXP`
      : formatHudStatNumber(currentExp, maxExp, 'EXP', numberFormat);

  const circleSize = isLandscape ? 42 : 44;
  const barWidth = isLandscape ? 148 : 138;

  return (
    <div
      onClick={onClickHeader}
      className="inline-flex items-center select-none cursor-pointer group transition-transform hover:-translate-y-0.5"
    >
      {/* Medalhão Circular Pearl & Gold idêntico ao Header do Hub */}
      <div
        className="relative z-10 rounded-full flex items-center justify-center shrink-0 transition-transform group-hover:scale-[1.03]"
        style={{
          width: `${circleSize}px`,
          height: `${circleSize}px`,
          border: '2.5px solid #fff3c2',
          outline: '2px solid #9b701e',
          background: 'radial-gradient(circle at 35% 30%, #fcfaf5, #d8c8ab)',
          boxShadow: '0 4px 10px rgba(0, 0, 0, 0.78), 0 0 12px rgba(229, 193, 104, 0.45)',
        }}
      >
        <div
          className="rounded-full overflow-hidden flex items-center justify-center"
          style={{
            width: `${circleSize - 7}px`,
            height: `${circleSize - 7}px`,
            border: '1px solid #8a6214',
            background: 'radial-gradient(circle at 50% 35%, #1e293b, #090d16)',
          }}
        >
          {avatarSrc ? (
            <img
              src={avatarSrc}
              alt={project.player?.name || 'Player'}
              className="w-full h-full object-cover select-none pointer-events-none"
            />
          ) : null}
        </div>
        <span
          style={{
            position: 'absolute',
            bottom: '-3px',
            right: '-3px',
            fontFamily: "'Cinzel', serif",
            fontSize: '0.5rem',
            color: '#122030',
            fontWeight: 900,
            background: 'linear-gradient(180deg, #fff3c2 0%, #e5c168 55%, #b58932 100%)',
            border: '1.5px solid #523707',
            borderRadius: '999px',
            padding: '0 4.5px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.8)',
            lineHeight: 1.25,
          }}
        >
          {playerLevel}
        </span>
      </div>

      {/* Cápsula Royal Sapphire & Gold com Barra de PV (Vermelha) e Barra de EXP (Dourada) */}
      <div
        className="flex flex-col justify-center z-0"
        style={{
          marginLeft: '-12px',
          padding: '5px 11px 6px 18px',
          borderRadius: '0 999px 999px 0',
          background: 'linear-gradient(180deg, rgba(11,47,98,0.95) 0%, rgba(4,20,46,0.98) 100%)',
          border: '2px solid #d4af53',
          borderLeft: 'none',
          boxShadow:
            '0 6px 16px rgba(0,8,22,0.82), 0 0 0 1px #523707, inset 0 1px 2px rgba(255,243,194,0.4)',
          gap: '3.5px',
          minWidth: `${barWidth}px`,
        }}
      >
        {/* Barra Superior: PV (Rubi Carmesim & Ouro) */}
        <div
          className="relative rounded-full flex items-center justify-center overflow-hidden"
          style={{
            height: '13.5px',
            width: '100%',
            background: 'linear-gradient(180deg, #1f0404 0%, #3b0808 100%)',
            border: '1.5px solid #c59638',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)',
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{
              width: `${hpPercent}%`,
              background: `linear-gradient(90deg, #991b1b 0%, ${hpBarColor} 58%, #fca5a5 100%)`,
              boxShadow: '0 0 8px rgba(239,68,68,0.65)',
            }}
          />
          <div
            className="absolute top-[1px] left-1 right-1 h-[38%] rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))',
            }}
          />
          <span
            style={{
              position: 'relative',
              zIndex: 2,
              fontFamily: "'EB Garamond', 'Cinzel', serif",
              fontSize: '0.56rem',
              color: '#fff',
              fontWeight: 800,
              letterSpacing: '0.3px',
              textShadow: '0 1px 2px #000, 0 0 4px #000',
              whiteSpace: 'nowrap',
            }}
          >
            ❤️ {pvText}
          </span>
        </div>

        {/* Barra Inferior: EXP (Ouro Imperial & Safira) */}
        <div
          className="relative rounded-full flex items-center justify-center overflow-hidden"
          style={{
            height: '12.5px',
            width: '100%',
            background: 'linear-gradient(180deg, #020917 0%, #061836 100%)',
            border: '1.5px solid #c59638',
            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)',
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
            style={{
              width: `${expPercent}%`,
              background: `linear-gradient(90deg, #9b701e 0%, ${expBarColor} 55%, #fff3c2 100%)`,
              boxShadow: '0 0 8px rgba(229,193,104,0.65)',
            }}
          />
          <div
            className="absolute top-[1px] left-1 right-1 h-[38%] rounded-full pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, rgba(255,255,255,0.55), rgba(255,255,255,0))',
            }}
          />
          <span
            style={{
              position: 'relative',
              zIndex: 2,
              fontFamily: "'EB Garamond', 'Cinzel', serif",
              fontSize: '0.54rem',
              color: '#fff',
              fontWeight: 800,
              letterSpacing: '0.3px',
              textShadow: '0 1px 2px #000, 0 0 4px #000',
              whiteSpace: 'nowrap',
            }}
          >
            ✦ {expText}
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 2. COMPONENTE VISUAL: INFO DE QUEST (JORNADA | TAREFAS.) NO HUD
//    Proporções dedicadas para Retrato vs Paisagem
// ============================================================================

export const QuestTrackerHudWidget: React.FC<{
  project: MapProject;
  config?: QuestTrackerHudElementConfig;
  isLandscape?: boolean;
  activeSubTab?: 'jornada' | 'tarefas';
  onChangeSubTab?: (tab: 'jornada' | 'tarefas') => void;
  onOpenPopup: (initialTab: 'jornada' | 'tarefas', questId?: string) => void;
}> = ({ project, config, isLandscape = false, activeSubTab, onChangeSubTab, onOpenPopup }) => {
  const [internalTab, setInternalTab] = useState<'jornada' | 'tarefas'>(
    config?.defaultTab || 'jornada'
  );
  const [isRetracted, setIsRetracted] = useState<boolean>(
    Boolean(config?.defaultCollapsed)
  );

  useEffect(() => {
    if (config?.defaultCollapsed !== undefined) {
      setIsRetracted(Boolean(config.defaultCollapsed));
    }
  }, [config?.defaultCollapsed]);

  const currentTab = activeSubTab ?? internalTab;

  const handleSelectTab = (tab: 'jornada' | 'tarefas', e: React.MouseEvent) => {
    e.stopPropagation();
    setInternalTab(tab);
    onChangeSubTab?.(tab);
    if (isRetracted) {
      setIsRetracted(false);
    }
  };

  const { jornada, tarefas } = useMemo(
    () => getOrderedPhaseQuests(project, true),
    [project]
  );

  const activeList = currentTab === 'jornada' ? jornada : tarefas;
  const sortedActiveList = useMemo(() => {
    return [...activeList].sort((a, b) => {
      if (a.isSelectedForMap && !b.isSelectedForMap) return -1;
      if (!a.isSelectedForMap && b.isSelectedForMap) return 1;
      return a.orderIndex - b.orderIndex;
    });
  }, [activeList]);
  const maxVisible = Math.max(1, Math.min(6, config?.maxVisibleQuests ?? 2));
  const visibleQuests = sortedActiveList.slice(0, maxVisible);

  const mainLabel = config?.mainTabLabel || 'Jornada';
  const sideLabel = config?.sideTabLabel || 'Tarefas.';
  const moreLabel = config?.moreButtonLabel || 'Ver mais...';
  const isCollapsible = config?.collapsible !== false;

  // Quando retraído pro canto esquerdo: mostra uma aba compacta colada no canto com setinha para expandir
  if (isRetracted) {
    return (
      <div
        className="select-none transition-all duration-300 -ml-3 inline-flex items-center gap-1.5 pl-3 pr-2.5 py-1.5 rounded-r-full bg-[#365c19]/92 backdrop-blur-md border-y-2 border-r-2 border-[#5c2604] shadow-[0_3px_0_rgba(0,0,0,0.5),0_6px_14px_rgba(0,0,0,0.4)]"
        style={{
          fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
          textShadow: '0 1.5px 0 rgba(0, 0, 0, 0.85)',
        }}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsRetracted(false);
          }}
          className="flex items-center gap-1.5 text-[#fbbf24] hover:text-[#fef08a] font-bold text-[14px] cursor-pointer"
          title="Expandir informações de Jornada / Tarefas"
        >
          <HudFourPointStarIcon className="w-3.5 h-3.5 shrink-0" />
          <span>{currentTab === 'jornada' ? mainLabel : sideLabel}</span>
          <span className="ml-0.5 w-5 h-5 rounded-full bg-[#fbbf24] text-[#451a03] border border-[#5c2604] flex items-center justify-center shadow-xs hover:scale-105 transition-transform">
            <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`select-none transition-all duration-300 ${
        config?.showBackdrop
          ? 'px-4 py-3 rounded-2xl bg-[#365c19]/80 backdrop-blur-xs border-2 border-[#5c2604] shadow-[0_4px_0_rgba(0,0,0,0.45)]'
          : 'px-1.5 py-1'
      }`}
      style={{
        fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif',
        textShadow: '0 2px 0 rgba(0, 0, 0, 0.85), 0 3px 6px rgba(0, 0, 0, 0.7)',
      }}
    >
      {/* Cabeçalho Grifado em Dourado: Jornada | Tarefas. + Setinha à frente para retrair pro canto */}
      <div className={`flex items-center gap-2 ${isLandscape ? 'text-[17px] mb-2' : 'text-[20px] mb-2.5'} leading-tight`}>
        <button
          type="button"
          onClick={(e) => handleSelectTab('jornada', e)}
          className={`underline decoration-[2px] underline-offset-[5px] transition-all cursor-pointer ${
            currentTab === 'jornada'
              ? 'text-[#fbbf24] font-bold scale-[1.03]'
              : 'text-[#fbbf24]/75 hover:text-[#fbbf24]'
          }`}
        >
          {mainLabel}
        </button>

        <span className="text-[#fbbf24] font-light select-none px-0.5">|</span>

        <button
          type="button"
          onClick={(e) => handleSelectTab('tarefas', e)}
          className={`underline decoration-[2px] underline-offset-[5px] transition-all cursor-pointer ${
            currentTab === 'tarefas'
              ? 'text-[#fef08a] font-bold scale-[1.03]'
              : 'text-[#fef08a]/80 hover:text-[#fef08a]'
          }`}
        >
          {sideLabel}
        </button>

        {/* Setinha à frente de Tarefas que ao clicar retrai pro canto essa info */}
        {isCollapsible && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsRetracted(true);
            }}
            className="ml-1 w-5 h-5 rounded-full bg-[#fbbf24]/95 hover:bg-[#fef08a] text-[#451a03] border-[1.5px] border-[#5c2604] shadow-[0_2px_0_#451a03] flex items-center justify-center transition-transform active:translate-y-0.5 hover:scale-105 cursor-pointer shrink-0"
            title="Retrair Jornada / Tarefas para o canto esquerdo"
          >
            <ChevronLeft className="w-3.5 h-3.5 stroke-[3]" />
          </button>
        )}
      </div>

      {/* Lista Ordenada de Quests da Fase (✦ Dourado para Ativas/Disponíveis | 🔒 Cinza para Bloqueadas) */}
      <div className={`${isLandscape ? 'space-y-1.5' : 'space-y-2'} pl-1.5`}>
        {visibleQuests.length === 0 ? (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onOpenPopup(currentTab);
            }}
            className={`flex items-center gap-2.5 ${isLandscape ? 'text-[14px]' : 'text-[16px]'} text-[#fbbf24] cursor-pointer hover:brightness-110`}
          >
            <HudFourPointStarIcon className="w-4 h-4 shrink-0" />
            <span>{currentTab === 'jornada' ? 'Jornada.' : 'Tarefas.'}</span>
          </div>
        ) : (
          visibleQuests.map((q) => {
            const isLocked = q.isLocked;
            return (
              <div
                key={q.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPopup(currentTab, q.id);
                }}
                className="flex items-center gap-2.5 py-0.5 cursor-pointer group transition-transform hover:translate-x-0.5"
                title={`Clique para abrir detalhes de "${q.title}"`}
              >
                {isLocked ? (
                  <HudLockIcon className={`${isLandscape ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
                ) : (
                  <HudFourPointStarIcon className={`${isLandscape ? 'w-3.5 h-3.5' : 'w-4 h-4'} shrink-0`} />
                )}

                {q.isSelectedForMap && (
                  <span className="text-[12px] shrink-0" title="Quest selecionada para exibir no mapa">
                    📍
                  </span>
                )}

                <span
                  className={`${isLandscape ? 'text-[14.5px] max-w-[205px]' : 'text-[17px] max-w-[245px]'} leading-snug truncate ${
                    isLocked
                      ? 'text-[#e2e8f0]'
                      : q.isCompleted
                      ? 'text-[#86efac] line-through'
                      : 'text-[#fbbf24] font-semibold'
                  }`}
                >
                  {q.title}
                </span>

                {q.isCompleted && (
                  <span className="text-[11px] text-[#4ade80] font-sans font-black ml-0.5">✓</span>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Botão "Ver mais..." que abre o Pop-up de Jornada & Tarefas */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenPopup(currentTab);
        }}
        className={`mt-2.5 pl-1.5 ${isLandscape ? 'text-[12px]' : 'text-[13px]'} font-bold text-[#fef08a] hover:text-white underline decoration-[#fbbf24] underline-offset-4 transition-colors cursor-pointer block`}
      >
        {moreLabel}
      </button>
    </div>
  );
};

// ============================================================================
// 2.5 BARRA DE ACESSO ESTILO VIDRO COM 6 ÍCONES CIRCULARES (CANTO SUPERIOR OPOSTO AO HEADER)
// ============================================================================

export const DEFAULT_TOP_GLASS_BAR_SLOTS: TopGlassBarIconSlotConfig[] = [
  { id: 'glass-slot-1', label: 'Mochila', iconEmoji: '🎒', actionType: 'open_inventory', visible: true },
  { id: 'glass-slot-2', label: 'Quests', iconEmoji: '📜', actionType: 'open_quests', visible: true },
  { id: 'glass-slot-3', label: 'Mapa', iconEmoji: '🗺️', actionType: 'toggle_map', visible: true },
  { id: 'glass-slot-4', label: 'Diálogo', iconEmoji: '💬', actionType: 'open_dialogue', visible: true },
  { id: 'glass-slot-5', label: 'Som BGM', iconEmoji: '🎵', actionType: 'toggle_audio', visible: true },
  { id: 'glass-slot-6', label: 'Status', iconEmoji: '⚡', actionType: 'quick_status', visible: true },
];

export const TopGlassAccessBarHudWidget: React.FC<{
  config?: TopGlassBarHudElementConfig;
  isLandscape?: boolean;
  isAudioMuted?: boolean;
  onExitToWorldMap?: () => void;
  onTriggerAction?: (action: TopGlassBarIconSlotConfig['actionType']) => void;
  onTriggerSlotAction?: (slot: TopGlassBarIconSlotConfig) => void;
}> = ({
  config,
  isLandscape = false,
  isAudioMuted = false,
  onExitToWorldMap,
  onTriggerAction,
  onTriggerSlotAction,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const slots = useMemo(() => {
    const raw = config?.slots && config.slots.length > 0 ? config.slots : DEFAULT_TOP_GLASS_BAR_SLOTS;
    const merged: TopGlassBarIconSlotConfig[] = [];
    for (let i = 0; i < 6; i++) {
      merged.push(raw[i] || DEFAULT_TOP_GLASS_BAR_SLOTS[i]);
    }
    return merged.filter((s) => s.visible !== false);
  }, [config?.slots]);

  const isGrid = config?.layout === 'grid_3x2';
  const btnSize = isLandscape ? 'w-7 h-7 text-[13px]' : 'w-6.5 h-6.5 text-[12.5px]';

  if (isCollapsed && config?.collapsible !== false) {
    return (
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(false);
          }}
          className="px-2.5 h-[36px] rounded-full flex items-center gap-1 cursor-pointer transition-transform active:scale-95"
          style={{
            background: 'linear-gradient(180deg, #fcfaf5 0%, #efe6d4 58%, #e2d4ba 100%)',
            border: '2px solid #c59638',
            outline: '1px solid #523707',
            boxShadow: '0 6px 16px rgba(0,8,22,0.75), inset 0 1px 2px rgba(255,255,255,0.95)',
          }}
          title="Expandir barra de fase"
        >
          <ChevronLeft className="w-3.5 h-3.5 text-[#0b3778] stroke-[3]" />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: '0.62rem', fontWeight: 900, color: '#122030' }}>
            MENU
          </span>
        </button>
        {onExitToWorldMap && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExitToWorldMap();
            }}
            title="Sair da Fase / Voltar ao Mapa Mundi"
            className="w-[34px] h-[34px] rounded-full flex items-center justify-center cursor-pointer transition-transform active:scale-90"
            style={{
              background: 'linear-gradient(180deg, #0b3778 0%, #041f4a 100%)',
              border: '2px solid #d4af53',
              outline: '1px solid #523707',
              color: '#fff3c2',
              fontSize: '0.78rem',
              fontWeight: 900,
              boxShadow: '0 4px 12px rgba(0,8,22,0.75)',
            }}
          >
            ✕
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`select-none relative overflow-hidden ${
        isGrid
          ? 'rounded-2xl p-1.5 grid grid-cols-3 gap-1.5'
          : 'rounded-full px-1.5 h-[38px] flex items-center gap-1'
      } transition-all duration-300`}
      style={{
        background: 'linear-gradient(180deg, #fcfaf5 0%, #efe6d4 58%, #e2d4ba 100%)',
        border: '2px solid #c59638',
        outline: '1px solid #523707',
        boxShadow: '0 6px 16px rgba(0,8,22,0.75), inset 0 1px 2px rgba(255,255,255,0.95)',
      }}
    >
      {slots.map((slot) => {
        const isAudio = slot.actionType === 'toggle_audio' || slot.actionType === 'toggle_bgm';
        const displayEmoji = isAudio && isAudioMuted ? '🔇' : slot.iconEmoji;
        return (
          <button
            key={slot.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const normalizedAction =
                slot.actionType === 'toggle_bgm'
                  ? 'toggle_audio'
                  : slot.actionType === 'trigger_toast'
                  ? 'quick_status'
                  : slot.actionType;
              onTriggerAction?.(normalizedAction);
              onTriggerSlotAction?.(slot);
            }}
            className={`${btnSize} rounded-full flex items-center justify-center relative transition-all duration-150 hover:scale-108 active:scale-90 cursor-pointer shrink-0`}
            style={{
              background: 'linear-gradient(180deg, #0b3778 0%, #041f4a 100%)',
              border: '1.5px solid #d4af53',
              color: '#fff3c2',
              boxShadow: '0 2px 5px rgba(0,8,22,0.45)',
            }}
            title={
              slot.actionType === 'toggle_map' && onExitToWorldMap
                ? 'Voltar ao Mapa Mundi'
                : slot.label
            }
          >
            {slot.customIconUrl ? (
              <div className="w-full h-full flex items-center justify-center relative">
                <img
                  src={slot.customIconUrl}
                  alt={slot.label}
                  className={`w-4/5 h-4/5 object-contain relative z-10 pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.65)] ${
                    isAudio && isAudioMuted ? 'opacity-40 grayscale' : ''
                  }`}
                />
                {isAudio && isAudioMuted && (
                  <span className="absolute text-[10px] leading-none z-20 drop-shadow">🔇</span>
                )}
              </div>
            ) : (
              <span className="relative z-10 leading-none drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">
                {displayEmoji}
              </span>
            )}
            {slot.badgeText && (
              <span className="absolute -top-0.5 -right-0.5 px-1 min-w-[14px] h-[14px] rounded-full bg-[#f59e0b] border border-[#451a03] text-[8.5px] font-black text-[#451a03] flex items-center justify-center leading-none z-20">
                {slot.badgeText}
              </span>
            )}
          </button>
        );
      })}

      {onExitToWorldMap && (
        <>
          <div style={{ width: '1px', height: '16px', background: 'rgba(181,137,50,0.45)' }} />
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onExitToWorldMap();
            }}
            title="Sair da Fase / Voltar ao Mapa Mundi"
            className={`${btnSize} rounded-full flex items-center justify-center relative transition-all duration-150 hover:scale-108 active:scale-90 cursor-pointer shrink-0`}
            style={{
              background: 'linear-gradient(180deg, #991b1b 0%, #450a0a 100%)',
              border: '1.5px solid #e5c168',
              color: '#fff3c2',
              fontSize: '0.68rem',
              fontWeight: 900,
              boxShadow: '0 2px 5px rgba(0,8,22,0.55)',
            }}
          >
            ✕
          </button>
        </>
      )}

      {config?.collapsible !== false && !isGrid && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCollapsed(true);
          }}
          className="w-5 h-5 rounded-full bg-[#e5c168] hover:bg-[#fff3c2] border-[1.5px] border-[#523707] flex items-center justify-center text-[#122030] cursor-pointer transition-transform active:scale-90 ml-0.5 shrink-0 relative z-10"
          title="Recolher barra de fase"
        >
          <ChevronRight className="w-3 h-3 stroke-[3]" />
        </button>
      )}
    </div>
  );
};

// ============================================================================
// 2.8 BARRAS DESLIZANTES EMPILHADAS DE ITENS COLETADOS / CONQUISTAS (ESTILO IMAGEM DE REFERÊNCIA)
// ============================================================================

export interface LootToastBarEntry {
  id: string;
  text: string;
  iconEmoji?: string;
  iconPng?: string;
  iconUrl?: string;
  amount?: number;
  createdAt: number;
}

export const SlidingLootToastStackHudWidget: React.FC<{
  entries: LootToastBarEntry[];
  config?: LootToastBarHudElementConfig;
  isLandscape?: boolean;
  onDismiss?: (id: string) => void;
}> = ({ entries, config, isLandscape = false, onDismiss }) => {
  if (config?.visible === false || entries.length === 0) return null;

  // Padrão fiel à imagem de referência: canto DIREITO (colado na borda direita interna da tela)
  const rawSide = config?.edgeSide || config?.side || 'right';
  const side: 'left' | 'right' = rawSide === 'left' ? 'left' : 'right';
  const maxStack = Math.max(1, Math.min(8, config?.maxStack ?? 4));
  const visibleEntries = entries.slice(-maxStack);
  const barColor = config?.barFillColor || config?.barColor || '#f59e0b';
  const lipColor = config?.bottomLipColor || config?.lipColor || '#14532d';
  const textColor = config?.textColor || '#1c1917';
  const scale = config?.scale ?? 1.0;
  const opacity = config?.opacity ?? 1.0;

  return (
    <div
      className={`flex flex-col gap-2 pointer-events-none select-none ${
        side === 'right' ? 'items-end' : 'items-start'
      }`}
      style={{
        transform: `scale(${scale})`,
        transformOrigin: side === 'right' ? 'center right' : 'center left',
        opacity,
      }}
    >
      {visibleEntries.map((entry, idx) => {
        const isLeft = side === 'left';
        const iconSrc = entry.iconUrl || entry.iconPng;
        return (
          <div
            key={entry.id}
            onClick={() => onDismiss?.(entry.id)}
            className={`pointer-events-auto cursor-pointer relative flex items-center gap-2 ${
              isLeft
                ? 'rounded-r-full rounded-l-none pl-3 pr-4 border-r-[2.5px] border-l-0 animate-capsule-right'
                : 'rounded-l-full rounded-r-none pl-4 pr-3 border-l-[2.5px] border-r-0 animate-capsule-left'
            } border-t-[2px] border-b-[3.5px] py-1.5 min-w-[145px] max-w-[245px] transition-all duration-300`}
            style={{
              backgroundColor: barColor,
              borderColor: lipColor,
              color: textColor,
              boxShadow: `0 4px 0 ${lipColor}, 0 6px 14px rgba(0, 0, 0, 0.35)`,
              animationDelay: `${idx * 35}ms`,
            }}
            title="Clique para dispensar"
          >
            {/* Brilho glossy superior estilo barra de jogo */}
            <div
              className={`absolute top-0.5 ${
                isLeft ? 'left-0 right-3 rounded-r-full' : 'left-3 right-0 rounded-l-full'
              } h-[34%] pointer-events-none`}
              style={{
                background: 'linear-gradient(to bottom, rgba(255,255,255,0.55), rgba(255,255,255,0.05))',
              }}
            />

            {iconSrc ? (
              <img
                src={iconSrc}
                alt=""
                className="w-5 h-5 object-contain shrink-0 relative z-10 drop-shadow-[0_1.5px_1px_rgba(0,0,0,0.4)]"
              />
            ) : entry.iconEmoji ? (
              <span className="text-sm leading-none shrink-0 relative z-10 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                {entry.iconEmoji}
              </span>
            ) : null}

            <span
              className={`relative z-10 ${
                isLandscape ? 'text-[11px]' : 'text-[11.5px]'
              } font-black leading-tight truncate tracking-tight`}
              style={{
                textShadow: '0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              {entry.text}
            </span>

            {entry.amount !== undefined && entry.amount > 0 && (
              <span
                className="relative z-10 ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-black text-white shrink-0"
                style={{
                  backgroundColor: lipColor,
                }}
              >
                +{entry.amount}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// 3. POP-UP DE JORNADA (QUEST PRINCIPAL) & TAREFAS (SIDE QUESTS)
//    ESTÉTICA CLASH ROYALE / BRAWL STARS (VIBRANTE, TÁTIL, 3D, CLARA E VIVA)
//    COM LAYOUT DEDICADO PARA VERTICAL (RETRATO) E HORIZONTAL (PAISAGEM)
// ============================================================================

export const QuestJourneyPopupModal: React.FC<{
  project: MapProject;
  initialTab?: 'jornada' | 'tarefas';
  initialSelectedQuestId?: string;
  onClose: () => void;
  onSwitchToBackpack?: () => void;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
  isInsideEmulator?: boolean;
  isHubFullScreen?: boolean;
  isLandscape?: boolean;
}> = ({
  project,
  initialTab = 'jornada',
  initialSelectedQuestId,
  onClose,
  onSwitchToBackpack,
  onUpdateProject,
  isInsideEmulator = true,
  isHubFullScreen = false,
  isLandscape = false,
}) => {
  const [activeTab, setActiveTab] = useState<'jornada' | 'tarefas'>(initialTab);
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(
    initialSelectedQuestId || null
  );

  const { jornada, tarefas } = useMemo(
    () => getOrderedPhaseQuests(project, true),
    [project]
  );

  const qCfg = ensureProjectQuestsConfig(project);
  const playerLevel = qCfg.playerState?.currentLevel ?? 1;
  const playerXp = qCfg.playerState?.totalCumulativeXp ?? project.player?.totalCumulativeXp ?? 0;

  const currentList = activeTab === 'jornada' ? jornada : tarefas;
  const selectedQuest =
    currentList.find((q) => q.id === selectedQuestId) || currentList[0] || null;

  // Alterna a seleção da Quest para exibir seu ícone no Mapa
  const handleToggleSelectQuestForMap = (
    questEntry: UnifiedHudQuestEntry,
    e?: React.MouseEvent
  ) => {
    if (e) e.stopPropagation();
    if (!onUpdateProject) return;
    const curQCfg = ensureProjectQuestsConfig(project);
    const currentTracked: string[] = Array.isArray(curQCfg.trackedQuestIds)
      ? [...curQCfg.trackedQuestIds]
      : curQCfg.activeQuestId
      ? [curQCfg.activeQuestId]
      : [];

    const alreadyTracked = currentTracked.includes(questEntry.id);
    const nextTracked = alreadyTracked
      ? currentTracked.filter((id) => id !== questEntry.id)
      : [...currentTracked, questEntry.id];

    const nextActiveId = !alreadyTracked
      ? questEntry.id
      : nextTracked[0] || undefined;

    const nextQuestsConfig = {
      ...curQCfg,
      activeQuestId: nextActiveId,
      trackedQuestIds: nextTracked,
    };

    saveProjectQuestsConfigToStorage(nextQuestsConfig);
    onUpdateProject({
      questsConfig: nextQuestsConfig,
    });
  };

  const handleChangeQuestStatus = (
    questEntry: UnifiedHudQuestEntry,
    nextStatus: QuestRuntimeStatus
  ) => {
    if (!onUpdateProject) return;
    const curQCfg = ensureProjectQuestsConfig(project);
    const curProg = curQCfg.playerState.questsProgress[questEntry.id] || {
      questId: questEntry.id,
      status: nextStatus,
      completionCount: 0,
      objectivesProgress: {},
      claimedRewardIds: [],
    };

    const updatedObjProg = { ...curProg.objectivesProgress };
    if (questEntry.rawQuest) {
      if (nextStatus === 'completed') {
        for (const obj of questEntry.rawQuest.objectives) {
          updatedObjProg[obj.id] = {
            objectiveId: obj.id,
            status: 'completed',
            currentAmount: obj.requiredAmount || 1,
            requiredAmount: obj.requiredAmount || 1,
            processedTransactionIds: [],
          };
        }
      } else if (nextStatus === 'active' || nextStatus === 'available') {
        for (const obj of questEntry.rawQuest.objectives) {
          const existing = updatedObjProg[obj.id];
          updatedObjProg[obj.id] = {
            objectiveId: obj.id,
            status: 'active',
            currentAmount: nextStatus === 'available' ? 0 : existing?.currentAmount || 0,
            requiredAmount: obj.requiredAmount || 1,
            processedTransactionIds: existing?.processedTransactionIds || [],
          };
        }
      }
    } else if (questEntry.isLocalMarkerQuest && questEntry.markerId) {
      const objId = `obj-npc-${questEntry.markerId}`;
      const req = questEntry.objectives[0]?.required || 1;
      updatedObjProg[objId] = {
        objectiveId: objId,
        status: nextStatus === 'completed' ? 'completed' : 'active',
        currentAmount: nextStatus === 'completed' ? req : nextStatus === 'available' ? 0 : questEntry.objectives[0]?.current || 0,
        requiredAmount: req,
        processedTransactionIds: [],
      };
    }

    let extraXp = 0;
    if (nextStatus === 'completed' && curProg.status !== 'completed') {
      if (questEntry.rawQuest) {
        for (const r of questEntry.rawQuest.rewards || []) {
          if (r.category === 'xp' && r.xpAmount) {
            extraXp += r.xpAmount;
          }
        }
      } else {
        extraXp = 200;
      }
    }

    const currentTracked: string[] = Array.isArray(curQCfg.trackedQuestIds)
      ? [...curQCfg.trackedQuestIds]
      : curQCfg.activeQuestId
      ? [curQCfg.activeQuestId]
      : [];
    const nextTracked =
      nextStatus === 'active' && !currentTracked.includes(questEntry.id)
        ? [...currentTracked, questEntry.id]
        : currentTracked;

    const nextQuestsConfig = {
      ...curQCfg,
      activeQuestId: questEntry.id,
      trackedQuestIds: nextTracked,
      playerState: {
        ...curQCfg.playerState,
        currentLevelXp: (curQCfg.playerState.currentLevelXp || 0) + extraXp,
        totalCumulativeXp: (curQCfg.playerState.totalCumulativeXp || 0) + extraXp,
        questsProgress: {
          ...curQCfg.playerState.questsProgress,
          [questEntry.id]: {
            ...curProg,
            status: nextStatus,
            acceptedAt:
              nextStatus === 'active'
                ? curProg.acceptedAt || new Date().toISOString()
                : curProg.acceptedAt,
            objectivesProgress: updatedObjProg,
            completedAt:
              nextStatus === 'completed' ? new Date().toISOString() : curProg.completedAt,
          },
        },
      },
    };

    const updatedMarkers =
      questEntry.isLocalMarkerQuest && questEntry.markerId
        ? (project.markers || []).map((m) =>
            m.id === questEntry.markerId && m.quest
              ? {
                  ...m,
                  quest: {
                    ...m.quest,
                    status: nextStatus,
                    currentAmount:
                      nextStatus === 'completed'
                        ? questEntry.objectives[0]?.required || 1
                        : m.quest.currentAmount,
                  } as any,
                }
              : m
          )
        : project.markers;

    saveProjectQuestsConfigToStorage(nextQuestsConfig);
    onUpdateProject({
      markers: updatedMarkers,
      questsConfig: nextQuestsConfig,
      player: project.player
        ? {
            ...project.player,
            currentXp: (project.player.currentXp || 0) + extraXp,
            totalCumulativeXp: (project.player.totalCumulativeXp || 0) + extraXp,
          }
        : project.player,
    });
  };

  // Renderizador do Painel de Detalhes da Quest Selecionada
  const renderQuestDetailsBoard = (q: UnifiedHudQuestEntry) => {
    const doneCount = q.objectives.filter((o) => o.completed).length;
    const totalCount = Math.max(1, q.objectives.length);
    const pct = Math.round((doneCount / totalCount) * 100);

    return (
      <div className="rounded-2xl bg-[#fffdf7] border-[3px] border-[#d97706] shadow-[0_4px_0_#b45309] p-3 space-y-2.5 text-[#451a03]">
        {/* Cabeçalho interno do card de detalhes + Botão de Selecionar Quest no Mapa */}
        <div className="flex items-start justify-between gap-2 border-b-2 border-[#fde68a] pb-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2 py-0.5 rounded-full bg-[#fbbf24] border-2 border-[#78350f] text-[#451a03] font-black text-[10px] shadow-[0_2px_0_#78350f]">
                {q.iconEmoji} MISSÃO #{q.orderIndex}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full font-black text-[10px] border-2 ${
                  q.isCompleted
                    ? 'bg-[#4ade80] border-[#14532d] text-[#052e16]'
                    : q.isLocked
                    ? 'bg-[#cbd5e1] border-[#475569] text-[#1e293b]'
                    : q.status === 'active'
                    ? 'bg-[#fef08a] border-[#92400e] text-[#78350f]'
                    : 'bg-[#e0f2fe] border-[#0369a1] text-[#0c4a6e]'
                }`}
              >
                {q.isCompleted
                  ? '✔️ CONCLUÍDA'
                  : q.isLocked
                  ? '🔒 BLOQUEADA'
                  : q.status === 'active'
                  ? '✦ EM ANDAMENTO'
                  : '❗ DISPONÍVEL'}
              </span>
            </div>
            <h4 className="text-sm sm:text-base font-black text-[#451a03] mt-1 leading-tight">
              {q.title}
            </h4>
          </div>

          {/* Botão Tátil 3D de Selecionar Quest para o Mapa */}
          <button
            type="button"
            onClick={(e) => handleToggleSelectQuestForMap(q, e)}
            className={`shrink-0 px-3 py-1.5 rounded-full border-[2.5px] font-black text-[11px] flex items-center gap-1.5 transition-all active:translate-y-0.5 cursor-pointer ${
              q.isSelectedForMap
                ? 'bg-gradient-to-b from-[#22c55e] to-[#15803d] border-white text-white shadow-[0_3px_0_#14532d,0_4px_10px_rgba(0,0,0,0.3)]'
                : 'bg-gradient-to-b from-[#38bdf8] to-[#0284c7] border-white text-white shadow-[0_3px_0_#075985,0_4px_10px_rgba(0,0,0,0.25)] hover:brightness-110'
            }`}
            title="Selecionar esta quest para que o ícone dela apareça destacado no Mapa"
          >
            <span>{q.isSelectedForMap ? '🎯' : '📍'}</span>
            <span>{q.isSelectedForMap ? 'NO MAPA ✓' : 'SELECIONAR P/ MAPA'}</span>
          </button>
        </div>

        {/* Descrição */}
        <p className="text-xs font-semibold text-[#78350f] bg-[#fef3c7]/80 p-2.5 rounded-xl border-2 border-[#fde68a] leading-relaxed">
          {q.description}
        </p>

        {/* Barra de Progresso Geral Estilo Clash Royale */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-black text-[#78350f]">
            <span>PROGRESSO DAS ETAPAS</span>
            <span>
              {doneCount}/{q.objectives.length} ({pct}%)
            </span>
          </div>
          <div className="h-4 w-full rounded-full bg-[#451a03] p-0.5 border-2 border-[#78350f] shadow-inner overflow-hidden relative">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#22c55e] via-[#4ade80] to-[#16a34a] transition-all duration-300"
              style={{ width: `${Math.max(8, pct)}%` }}
            />
            <div className="absolute top-0.5 left-2 right-2 h-1 rounded-full bg-white/40 pointer-events-none" />
          </div>
        </div>

        {/* Lista de Objetivos / Etapas */}
        <div className="space-y-1.5">
          {q.objectives.map((obj, oIdx) => (
            <div
              key={obj.id}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border-2 font-bold text-xs ${
                obj.completed
                  ? 'bg-[#dcfce7] border-[#22c55e] text-[#14532d]'
                  : 'bg-white border-[#e2e8f0] text-[#334155]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black border-2 shrink-0 ${
                    obj.completed
                      ? 'bg-[#22c55e] border-[#14532d] text-white'
                      : 'bg-[#fef08a] border-[#92400e] text-[#78350f]'
                  }`}
                >
                  {obj.completed ? '✓' : oIdx + 1}
                </span>
                <span className={`truncate ${obj.completed ? 'line-through opacity-80' : ''}`}>
                  {obj.title}
                </span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${
                  obj.completed
                    ? 'bg-[#bbf7d0] border-[#16a34a] text-[#14532d]'
                    : 'bg-[#fef3c7] border-[#d97706] text-[#92400e]'
                }`}
              >
                {obj.current}/{obj.required}
              </span>
            </div>
          ))}
        </div>

        {/* Baú de Recompensas + Indicador de Ícone no Mapa */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-gradient-to-r from-[#fef3c7] via-[#fde68a] to-[#fef3c7] border-[2.5px] border-[#d97706] shadow-[0_3px_0_#b45309]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg shrink-0">🎁</span>
            <div className="min-w-0">
              <span className="text-[9px] font-black uppercase tracking-wider text-[#92400e] block">
                RECOMPENSA DA MISSÃO
              </span>
              <span className="text-xs font-black text-[#451a03] truncate block">
                {q.rewardsSummary}
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/90 border-2 border-[#d97706] text-[10px] font-black text-[#78350f]">
            <span>{q.iconEmoji}</span>
            <span>{q.isSelectedForMap ? 'Ícone Ativo no Mapa' : 'Ícone do Mapa'}</span>
          </div>
        </div>

        {/* Botões Táteis 3D Estilo Brawl Stars / Clash Royale */}
        {onUpdateProject && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {(q.isLocked || q.status === 'available') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChangeQuestStatus(q, 'active');
                }}
                className="flex-1 min-w-[140px] py-2 px-3 rounded-full bg-gradient-to-b from-[#fbbf24] to-[#d97706] border-[2.5px] border-white text-white font-black text-xs shadow-[0_4px_0_#78350f,0_6px_12px_rgba(0,0,0,0.35)] active:translate-y-1 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ textShadow: '0 1.5px 0 #78350f' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{q.isLocked ? 'DESBLOQUEAR & ACEITAR' : '🎯 ACEITAR MISSÃO'}</span>
              </button>
            )}

            {!q.isLocked && !q.isCompleted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChangeQuestStatus(q, 'completed');
                }}
                className="flex-1 min-w-[140px] py-2 px-3 rounded-full bg-gradient-to-b from-[#4ade80] to-[#16a34a] border-[2.5px] border-white text-white font-black text-xs shadow-[0_4px_0_#14532d,0_6px_12px_rgba(0,0,0,0.35)] active:translate-y-1 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ textShadow: '0 1.5px 0 #14532d' }}
              >
                <Check className="w-3.5 h-3.5" />
                <span>ENTREGAR & CONCLUIR (+XP)</span>
              </button>
            )}

            {q.isCompleted && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleChangeQuestStatus(q, 'active');
                }}
                className="py-2 px-3 rounded-full bg-gradient-to-b from-[#38bdf8] to-[#0284c7] border-[2.5px] border-white text-white font-black text-xs shadow-[0_4px_0_#075985] active:translate-y-1 transition-all flex items-center justify-center gap-1 cursor-pointer"
                style={{ textShadow: '0 1.5px 0 #075985' }}
              >
                <span>↺ REINICIAR</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  if (isHubFullScreen) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        onScroll={(e) => {
          const el = e.currentTarget;
          const curY = el.scrollTop;
          const prevY = Number(el.dataset.prevScroll || 0);
          const dy = curY - prevY;
          el.dataset.prevScroll = String(curY);
          if (curY > 30 && dy > 3) {
            document.body.classList.add('hub-scroll-hide-bars');
          } else if (dy < -3 || curY <= 20) {
            document.body.classList.remove('hub-scroll-hide-bars');
          }
        }}
        className="w-full h-full overflow-y-auto overflow-x-hidden nova-scroll select-none"
        style={{
          padding: isLandscape ? '56px 16px 110px 16px' : '64px 10px 116px 10px',
          boxSizing: 'border-box',
          background: 'transparent',
        }}
      >
        <div
          className="w-full mx-auto flex flex-col gap-3"
          style={{ maxWidth: isLandscape ? '920px' : '460px' }}
        >
          {/* Barra Superior Limpa sem Container Branco Externo */}
          <div
            style={{
              padding: '5px',
              borderRadius: '9999px',
              background: 'rgba(7, 18, 38, 0.65)',
              border: '1.5px solid rgba(212, 168, 75, 0.5)',
              backdropFilter: 'blur(6px)',
              display: 'grid',
              gridTemplateColumns: onSwitchToBackpack ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))',
              gap: '5px',
              alignItems: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setActiveTab('jornada');
                setSelectedQuestId(null);
              }}
              className={
                activeTab === 'jornada'
                  ? 'btn-royal-gold cursor-pointer w-full'
                  : 'pearl-pill cursor-pointer w-full py-1.5 font-cinzel font-bold text-[10px] text-[#5c4b3b] uppercase text-center'
              }
            >
              <div
                className={
                  activeTab === 'jornada'
                    ? 'btn-royal-inner py-1.5 px-2 flex items-center justify-center gap-1 font-cinzel font-bold text-[10px] uppercase'
                    : 'flex items-center justify-center gap-1'
                }
              >
                <HudFourPointStarIcon className="w-3 h-3 shrink-0" />
                <span>JORNADA ({jornada.length})</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('tarefas');
                setSelectedQuestId(null);
              }}
              className={
                activeTab === 'tarefas'
                  ? 'btn-royal-gold cursor-pointer w-full'
                  : 'pearl-pill cursor-pointer w-full py-1.5 font-cinzel font-bold text-[10px] text-[#5c4b3b] uppercase text-center'
              }
            >
              <div
                className={
                  activeTab === 'tarefas'
                    ? 'btn-royal-inner py-1.5 px-2 flex items-center justify-center gap-1 font-cinzel font-bold text-[10px] uppercase'
                    : 'flex items-center justify-center gap-1'
                }
              >
                <span>📋 SECUNDÁRIAS ({tarefas.length})</span>
              </div>
            </button>

            {onSwitchToBackpack && (
              <button
                type="button"
                onClick={onSwitchToBackpack}
                className="btn-pearl-gold cursor-pointer w-full"
              >
                <div className="btn-pearl-inner py-1.5 px-2 font-cinzel font-bold text-[10px] uppercase flex items-center justify-center gap-1">
                  <span>🎒 MOCHILA</span>
                </div>
              </button>
            )}
          </div>

          {/* Lista Unificada de Missões */}
          <div className="flex flex-col gap-3">
            {currentList.map((q) => {
              const isSelected = selectedQuest?.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestId(q.id)}
                  className={`p-3 rounded-2xl border-[2.5px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#fffbeb] border-[#d97706] shadow-[0_6px_18px_rgba(0,0,0,0.45)]'
                      : q.isLocked
                      ? 'bg-[#e2e8f0]/95 border-[#94a3b8]'
                      : q.isCompleted
                      ? 'bg-[#dcfce7]/95 border-[#22c55e]'
                      : 'bg-[#fff8e7]/95 border-[#f59e0b]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-lg bg-[#5c2604] text-[#fef08a] font-black text-[10px] shrink-0">
                        {q.iconEmoji} #{q.orderIndex}
                      </span>
                      <span
                        className={`text-sm font-black truncate ${
                          q.isLocked
                            ? 'text-[#475569]'
                            : q.isCompleted
                            ? 'text-[#14532d] line-through'
                            : 'text-[#451a03]'
                        }`}
                      >
                        {q.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectQuestForMap(q, e)}
                        className={`px-2.5 py-0.5 rounded-full border-2 font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
                          q.isSelectedForMap
                            ? 'bg-[#22c55e] border-[#14532d] text-white'
                            : 'bg-[#e0f2fe] border-[#0284c7] text-[#075985]'
                        }`}
                      >
                        <span>{q.isSelectedForMap ? '🎯 No Mapa ✓' : '📍 Mapa'}</span>
                      </button>
                    </div>
                  </div>

                  {isSelected && <div className="mt-3">{renderQuestDetailsBoard(q)}</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`${
        isInsideEmulator
          ? 'absolute inset-0 z-80 p-2.5 flex items-center justify-center bg-black/50 backdrop-blur-[2px]'
          : 'fixed inset-0 z-90 p-4 flex items-center justify-center bg-black/65 backdrop-blur-sm'
      } select-none`}
    >
      {/* MOLDURA 3D ESTILO CLASH ROYALE / BRAWL STARS (ADAPTADA PARA RETRATO OU PAISAGEM) */}
      <div
        className={`w-full ${
          isInsideEmulator
            ? isLandscape
              ? 'max-w-[760px] h-[90%] max-h-[410px]'
              : 'max-w-[445px] h-[85%] max-h-[620px]'
            : isLandscape
            ? 'max-w-4xl h-[82vh] max-h-[540px]'
            : 'max-w-xl h-[85vh] max-h-[680px]'
        } pearl-surface flex flex-col overflow-hidden`}
      >
        {/* TOPO NOVA UI V1.2 PEARL & ROYAL SAPPHIRE COM ABAS E ACESSO À MOCHILA */}
        <div className="px-3.5 py-2.5 bg-gradient-to-b from-[#f5efe2] to-[#e3d7c3] border-b-[2px] border-[#b88928] relative flex items-center justify-between gap-2 shrink-0">
          <div className="pearl-pill p-0.5 flex items-center gap-1 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActiveTab('jornada');
                setSelectedQuestId(null);
              }}
              className={
                activeTab === 'jornada'
                  ? 'btn-royal-gold cursor-pointer'
                  : 'px-3 py-1 font-cinzel font-bold text-[10px] text-[#5c4b3b] uppercase cursor-pointer'
              }
            >
              <div className={activeTab === 'jornada' ? 'btn-royal-inner px-3 py-1 flex items-center gap-1 font-cinzel font-bold text-[10px] uppercase' : 'flex items-center gap-1'}>
                <HudFourPointStarIcon className="w-3 h-3 shrink-0" />
                <span>JORNADA ({jornada.length})</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('tarefas');
                setSelectedQuestId(null);
              }}
              className={
                activeTab === 'tarefas'
                  ? 'btn-royal-gold cursor-pointer'
                  : 'px-3 py-1 font-cinzel font-bold text-[10px] text-[#5c4b3b] uppercase cursor-pointer'
              }
            >
              <div className={activeTab === 'tarefas' ? 'btn-royal-inner px-3 py-1 flex items-center gap-1 font-cinzel font-bold text-[10px] uppercase' : 'flex items-center gap-1'}>
                <span>📋 SECUNDÁRIAS ({tarefas.length})</span>
              </div>
            </button>

            {onSwitchToBackpack && (
              <button
                type="button"
                onClick={onSwitchToBackpack}
                className="btn-pearl-gold cursor-pointer"
                title="Ir direto para o Pop-up de Mochila (Equipamento & Inventário)"
              >
                <div className="btn-pearl-inner px-3 py-1 font-cinzel font-bold text-[10px] uppercase flex items-center gap-1">
                  <span>🎒 MOCHILA</span>
                </div>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 pearl-pill px-2.5 py-1 font-cinzel font-bold text-[10px] text-[#3a2b1c]">
              <span>⭐ NV {playerLevel}</span>
              <span>•</span>
              <span>{playerXp} EXP</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="close-btn-outer cursor-pointer shrink-0"
              title="Fechar Pop-up"
            >
              <div className="close-btn-inner">✕</div>
            </button>
          </div>
        </div>

        {/* SUB-BARRA INFORMATIVA PEARL */}
        <div className="px-4 py-1.5 bg-[#e6dac6] border-b border-[#c9b493] flex items-center justify-between text-[10px] font-cinzel font-bold text-[#3a2b1c] shrink-0">
          <span>
            {activeTab === 'jornada'
              ? `🏆 JORNADA PRINCIPAL • Selecione uma missão (📍) para rastrear no Mapa`
              : `⚡ SECUNDÁRIAS • Selecione uma missão (📍) para rastrear no Mapa`}
          </span>
          <span className="text-[9px] pearl-pill px-2 py-0.5 text-[#8c6518]">
            { [...jornada, ...tarefas].filter((q) => q.isSelectedForMap).length } no Mapa 📍
          </span>
        </div>

        {/* CORPO DO POP-UP:
            - MODO PAISAGEM (isLandscape): Split-View 2 Colunas (Lista à esquerda + Quadro Detalhado à direita)
            - MODO RETRATO (!isLandscape): Lista Vertical com Expansão Tátil 3D */}
        {isLandscape ? (
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-3 p-3 overflow-hidden bg-[#fff8e7]">
            {/* Coluna Esquerda (5 cols): Lista de Quests em Ordem */}
            <div className="col-span-5 overflow-y-auto pr-1 space-y-2">
              {currentList.map((q) => {
                const isSelected = selectedQuest?.id === q.id;
                const doneCount = q.objectives.filter((o) => o.completed).length;
                const totalCount = Math.max(1, q.objectives.length);
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuestId(q.id)}
                    className={`p-2.5 rounded-2xl border-[3px] transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#fef08a] to-[#fde68a] border-[#d97706] shadow-[0_4px_0_#b45309] -translate-y-0.5'
                        : q.isLocked
                        ? 'bg-[#e2e8f0] border-[#94a3b8] shadow-[0_3px_0_#64748b] opacity-90 hover:opacity-100'
                        : q.isCompleted
                        ? 'bg-[#dcfce7] border-[#22c55e] shadow-[0_3px_0_#15803d]'
                        : 'bg-white border-[#f59e0b] shadow-[0_3px_0_#d97706] hover:bg-[#fffbeb]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="px-1.5 py-0.5 rounded-lg bg-[#5c2604] text-[#fef08a] font-black text-[10px] shrink-0">
                          {q.iconEmoji} #{q.orderIndex}
                        </span>
                        <span
                          className={`text-xs font-black truncate ${
                            q.isLocked
                              ? 'text-[#475569]'
                              : q.isCompleted
                              ? 'text-[#14532d] line-through'
                              : 'text-[#451a03]'
                          }`}
                        >
                          {q.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelectQuestForMap(q, e)}
                          className={`px-2 py-0.5 rounded-full border-2 font-black text-[9px] flex items-center gap-0.5 transition-all cursor-pointer ${
                            q.isSelectedForMap
                              ? 'bg-[#22c55e] border-[#14532d] text-white shadow-[0_2px_0_#14532d]'
                              : 'bg-white border-[#d97706] text-[#78350f] hover:bg-[#fef3c7]'
                          }`}
                          title="Selecionar para exibir ícone no Mapa"
                        >
                          <span>{q.isSelectedForMap ? '🎯 Mapa ✓' : '📍 Mapa'}</span>
                        </button>
                        <span className="text-[10px] font-black text-[#78350f] shrink-0">
                          {doneCount}/{totalCount}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Coluna Direita (7 cols): Quadro Detalhado da Quest Selecionada */}
            <div className="col-span-7 overflow-y-auto pr-1">
              {selectedQuest ? (
                renderQuestDetailsBoard(selectedQuest)
              ) : (
                <div className="h-full flex items-center justify-center text-sm font-black text-[#92400e]">
                  Selecione uma missão ao lado
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MODO RETRATO (VERTICAL): Cards Táteis 3D Empilhados */
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#fff8e7]">
            {currentList.map((q) => {
              const isSelected = selectedQuest?.id === q.id;
              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestId(q.id)}
                  className={`p-3 rounded-2xl border-[3px] transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#fffbeb] border-[#d97706] shadow-[0_5px_0_#b45309]'
                      : q.isLocked
                      ? 'bg-[#e2e8f0] border-[#94a3b8] shadow-[0_4px_0_#64748b]'
                      : q.isCompleted
                      ? 'bg-[#dcfce7] border-[#22c55e] shadow-[0_4px_0_#15803d]'
                      : 'bg-white border-[#f59e0b] shadow-[0_4px_0_#d97706]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-lg bg-[#5c2604] text-[#fef08a] font-black text-[10px] shrink-0">
                        {q.iconEmoji} #{q.orderIndex}
                      </span>
                      <span
                        className={`text-sm font-black truncate ${
                          q.isLocked
                            ? 'text-[#475569]'
                            : q.isCompleted
                            ? 'text-[#14532d] line-through'
                            : 'text-[#451a03]'
                        }`}
                      >
                        {q.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleToggleSelectQuestForMap(q, e)}
                        className={`px-2.5 py-0.5 rounded-full border-2 font-black text-[10px] flex items-center gap-1 transition-all cursor-pointer ${
                          q.isSelectedForMap
                            ? 'bg-[#22c55e] border-[#14532d] text-white shadow-[0_2px_0_#14532d]'
                            : 'bg-[#e0f2fe] border-[#0284c7] text-[#075985] hover:brightness-95'
                        }`}
                        title="Selecionar para exibir ícone no Mapa"
                      >
                        <span>{q.isSelectedForMap ? '🎯 No Mapa ✓' : '📍 Mapa'}</span>
                      </button>

                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border-2 shrink-0 ${
                          q.isCompleted
                            ? 'bg-[#4ade80] border-[#15803d] text-[#052e16]'
                            : q.isLocked
                            ? 'bg-[#cbd5e1] border-[#64748b] text-[#1e293b]'
                            : q.status === 'active'
                            ? 'bg-[#fef08a] border-[#d97706] text-[#78350f]'
                            : 'bg-white border-[#d97706] text-[#78350f]'
                        }`}
                      >
                        {q.isCompleted ? '✔️' : q.isLocked ? '🔒' : '✦'}
                      </span>
                    </div>
                  </div>

                  {isSelected && <div className="mt-3">{renderQuestDetailsBoard(q)}</div>}
                </div>
              );
            })}
          </div>
        )}

        {/* RODAPÉ TÁTIL 3D */}
        <div className="px-4 py-2 bg-[#fde68a] border-t-[3px] border-[#d97706] flex items-center justify-between shrink-0">
          <span className="text-[11px] font-black text-[#78350f]">
            📍 Selecione uma quest para destacar seu ícone no Mapa!
          </span>
          <div className="flex items-center gap-2">
            {onSwitchToBackpack && (
              <button
                type="button"
                onClick={onSwitchToBackpack}
                className="px-3.5 py-1.5 rounded-full bg-gradient-to-b from-[#c084fc] to-[#7e22ce] hover:brightness-110 border-[2.5px] border-white text-white font-black text-xs shadow-[0_3px_0_#4c1d95] active:translate-y-0.5 cursor-pointer"
              >
                🎒 Abrir Mochila
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-1.5 rounded-full bg-gradient-to-b from-[#5da02c] to-[#3f7418] hover:brightness-110 border-[2.5px] border-white text-white font-black text-xs shadow-[0_3px_0_#1e3b14] active:translate-y-0.5 cursor-pointer"
              style={{ textShadow: '0 1px 0 #1e3b14' }}
            >
              CONTINUAR JOGO
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. POP-UP DE MOCHILA FIEL À REFERÊNCIA DO USUÁRIO (RETRATO & PAISAGEM)
//    - Abas Superiores em Pasta: Equipamento | Inventário Geral | 📜 Quests
//    - Palco com Borda Tracejada Branca, Silhueta com Aura Branca (ou Asset Frente)
//      e 5 Slots Roxos de Equipamento (3 à esquerda + 2 à direita, sendo o inferior alto)
//    - Carrossel Horizontal Deslizante de Categorias (Equipáveis, Consumíveis,
//      Livros e Grimórios, etc.) + Botão Circular Verde Selecionar/Soltar
//    - Grade de Slots Circulares 3D Verde-Menta com Seleção Roxa + Scrollbar Laranja
//    - Barra Inferior com 3 Botões 3D:
//        1. Azul Ciano (Equipar / Desequipar / Usar)
//        2. Rosa (Saber Mais -> Abre Tela de Inspeção com Desfoque de Lente)
//        3. Círculo Vermelho (Fechar / Soltar)
// ============================================================================

export type EquipmentSlotKey =
  | 'head'
  | 'armor'
  | 'boots'
  | 'pet1'
  | 'pet2'
  | 'pet3'
  | 'accessory'
  | 'pet'
  | 'weapon';

export interface UnifiedBackpackSlotItem {
  id: string;
  name: string;
  iconEmoji: string;
  iconPng?: string;
  quantity: number;
  category: 'pets' | 'item_pet' | 'equipaveis' | 'consumiveis' | 'livros' | 'outros';
  equipSlot?: EquipmentSlotKey;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  shortDescription: string;
  detailedLore: string;
  statsText?: string;
  pages?: { title?: string; text: string }[];
  sourceKind: 'pet_gallery' | 'project_item' | 'map_resource' | 'demo_catalog';
  petId?: string;
  petHealAmount?: number;
  petXpAmount?: number;
  petAttackBonus?: number;
  motionLayerTag?: string;
}

export const DEFAULT_PET_CARE_ITEMS: UnifiedBackpackSlotItem[] = [
  {
    id: 'bp-petfood-meat',
    name: 'Ração Solar Dourada',
    iconEmoji: '🍖',
    quantity: 6,
    category: 'item_pet',
    rarity: 'rare',
    shortDescription: 'Alimento nutritivo que cura +55 PV do Pet e concede +45 EXP de crescimento.',
    detailedLore:
      'Assada com ervas solares da Cidadela. Recupera rapidamente o vigor do seu Pet Companheiro e estimula seu crescimento físico.',
    statsText: '🍖 ITEM PET • +55 PV Pet • +45 EXP',
    sourceKind: 'demo_catalog',
    petHealAmount: 55,
    petXpAmount: 45,
  },
  {
    id: 'bp-petfood-cookie',
    name: 'Biscoito Estelar de Nível',
    iconEmoji: '🍪',
    quantity: 5,
    category: 'item_pet',
    rarity: 'epic',
    shortDescription: 'Iguaria mágica que concede +100 EXP ao Pet (faz subir de Nível e crescer!).',
    detailedLore:
      'Forjado com pó de estrela cristalizado. Ao comer este biscoito, o Pet absorve energia astral imediata, subindo de nível e crescendo de tamanho no mapa!',
    statsText: '🍖 ITEM PET • +35 PV • +100 EXP (Level Up!)',
    sourceKind: 'demo_catalog',
    petHealAmount: 35,
    petXpAmount: 100,
  },
  {
    id: 'bp-petfood-elixir',
    name: 'Néctar de Cura do Pet',
    iconEmoji: '🍼',
    quantity: 4,
    category: 'item_pet',
    rarity: 'legendary',
    shortDescription: 'Restaura +150 PV do Pet Companheiro e concede +60 EXP.',
    detailedLore:
      'Elixir vital preparado especialmente para criaturas guardiãs. Cura ferimentos graves do Pet durante batalhas contra mobs.',
    statsText: '🍖 ITEM PET • +150 PV Pet • +60 EXP',
    sourceKind: 'demo_catalog',
    petHealAmount: 150,
    petXpAmount: 60,
  },
  {
    id: 'bp-petfood-berry',
    name: 'Fruta Rubi da Fúria Pet',
    iconEmoji: '🍓',
    quantity: 5,
    category: 'item_pet',
    rarity: 'epic',
    shortDescription: 'Fruta elemental que cura +40 PV, dá +70 EXP e aumenta permanentemente +3 Dano do Pet.',
    detailedLore:
      'Colhida nos bosques místicos de Slimelands. Fortalece as presas e poderes elementais do seu Pet Companheiro.',
    statsText: '🍖 ITEM PET • +40 PV • +70 EXP • +3 ATQ Pet',
    sourceKind: 'demo_catalog',
    petHealAmount: 40,
    petXpAmount: 70,
    petAttackBonus: 3,
  },
];

export function applyPetCareItemToPlayer(
  player: import('../../types/map').PlayerConfig,
  item: { name: string; petHealAmount?: number; petXpAmount?: number; petAttackBonus?: number }
): {
  updatedPlayer: import('../../types/map').PlayerConfig;
  leveledUp: boolean;
  newLevel: number;
  healedHp: number;
  gainedXp: number;
  petName: string;
} {
  const resolved = getResolvedPlayerPetConfig(player);
  const activePetId = resolved.activePetId || resolved.petGallery[0]?.id || 'pet-drake-solar';
  const heal = item.petHealAmount ?? 50;
  const xpGain = item.petXpAmount ?? 45;
  const atkBonus = item.petAttackBonus ?? 0;

  let leveledUp = false;
  let finalLevel = resolved.level;
  let finalHp = resolved.hp;
  let finalMaxHp = resolved.maxHp;
  let finalAtk = resolved.attackDamage + atkBonus;
  let finalDef = resolved.defense;
  let finalXp = resolved.xp + xpGain;
  let finalMaxXp = resolved.maxXp;

  while (finalXp >= finalMaxXp && finalLevel < 50) {
    finalXp -= finalMaxXp;
    finalLevel += 1;
    leveledUp = true;
    finalMaxHp += 22;
    finalAtk += 5;
    finalDef += 3;
    finalMaxXp = finalLevel * 100;
  }

  finalHp = Math.min(finalMaxHp, finalHp + heal + (leveledUp ? 35 : 0));

  const nextGallery = resolved.petGallery.map((p) =>
    p.id === activePetId
      ? {
          ...p,
          level: finalLevel,
          xp: finalXp,
          maxXp: finalMaxXp,
          hp: finalHp,
          maxHp: finalMaxHp,
          attackDamage: finalAtk,
          defense: finalDef,
        }
      : p
  );

  const updatedPlayer: import('../../types/map').PlayerConfig = {
    ...player,
    petConfig: {
      ...(player.petConfig || {}),
      enabled: true,
      activePetId,
      level: finalLevel,
      xp: finalXp,
      maxXp: finalMaxXp,
      hp: finalHp,
      maxHp: finalMaxHp,
      attackDamage: finalAtk,
      defense: finalDef,
      petGallery: nextGallery,
    },
  };

  return {
    updatedPlayer,
    leveledUp,
    newLevel: finalLevel,
    healedHp: heal,
    gainedXp: xpGain,
    petName: resolved.activePet?.name || 'Pet',
  };
}

const DEFAULT_SHOWCASE_ITEMS: UnifiedBackpackSlotItem[] = [
  ...DEFAULT_PET_CARE_ITEMS,
  {
    id: 'bp-eq-boina',
    name: 'Boina do Explorador Real',
    iconEmoji: '🧢',
    quantity: 1,
    category: 'equipaveis',
    equipSlot: 'head',
    rarity: 'rare',
    shortDescription: 'Boina encantada que amplia a percepção de trilhas secretas.',
    detailedLore:
      'Tecida com fios de seda de casulo dourado das Colinas de Slimelands. Concede visão aguçada contra emboscadas e +8 de Defesa Mágica.',
    statsText: '+8 DEF • +5% Velocidade em Trilhas',
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-eq-tunic',
    name: 'Manto Guardião de Esmeralda',
    iconEmoji: '🥋',
    quantity: 1,
    category: 'equipaveis',
    equipSlot: 'armor',
    rarity: 'epic',
    shortDescription: 'Armadura leve bordada com runas protetoras da floresta.',
    detailedLore:
      'Forjada pelos antigos artesãos do Vale Cristalino. Absorve impactos físicos e regenera lentamente o vigor do portador durante longas jornadas.',
    statsText: '+22 DEF • +35 PV Máximo',
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-eq-boots',
    name: 'Botas Passo-de-Vento',
    iconEmoji: '🥾',
    quantity: 1,
    category: 'equipaveis',
    equipSlot: 'boots',
    rarity: 'uncommon',
    shortDescription: 'Botas leves que permitem caminhar sem afundar na neve ou lama.',
    detailedLore:
      'Solado reforçado com couro dracônico flexível e plumas encantadas de falcão-real. Reduz o cansaço e aumenta a agilidade de esquiva.',
    statsText: '+6 DEF • +15% Velocidade de Movimento',
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-eq-amulet',
    name: 'Amuleto Estrela Dourada',
    iconEmoji: '📿',
    quantity: 1,
    category: 'equipaveis',
    equipSlot: 'accessory',
    rarity: 'legendary',
    shortDescription: 'Relíquia ancestral que pulsa em sintonia com cristais do mapa.',
    detailedLore:
      'Um fragmento cristalizado da primeira estrela caída sobre a Fase Mestra. Ilumina sutilmente cavernas escuras e amplia o ganho de EXP.',
    statsText: '+12 ATQ/DEF • +10% Bônus de EXP',
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-eq-blade',
    name: 'Lâmina Solar de Alvorada',
    iconEmoji: '⚔️',
    quantity: 1,
    category: 'equipaveis',
    equipSlot: 'weapon',
    rarity: 'legendary',
    shortDescription: 'Espada longa imbuída com o fogo dourado do solstício.',
    detailedLore:
      'Empunhada pelos campeões da Cidadela. Seu gume reluzente canaliza feixes solares capazes de romper escudos sombrios com um único golpe.',
    statsText: '+35 ATQ • Alcance Longo • Dano Solar',
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-con-elixir',
    name: 'Elixir Rubi de Vitalidade',
    iconEmoji: '🧪',
    quantity: 4,
    category: 'consumiveis',
    rarity: 'rare',
    shortDescription: 'Restaura imediatamente +60 PV e remove fadiga.',
    detailedLore:
      'Destilado alquímico preparado com frutas luminosas e orvalho da manhã. Seu sabor doce revigora instantaneamente o aventureiro em combate.',
    statsText: 'Consumível • Restaura +60 PV',
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-con-nectar',
    name: 'Pão Élfico de Mel Dourado',
    iconEmoji: '🥐',
    quantity: 6,
    category: 'consumiveis',
    rarity: 'common',
    shortDescription: 'Alimento de viagem que recupera +25 PV e energia.',
    detailedLore:
      'Assado em fornos de barro com mel silvestre de abelhas reais. Uma única mordida sustenta um viajante por um dia inteiro de marcha.',
    statsText: 'Consumível • Restaura +25 PV',
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-book-grimoire',
    name: 'Grimório das Estrelas Antigas',
    iconEmoji: '📕',
    quantity: 1,
    category: 'livros',
    rarity: 'legendary',
    shortDescription: 'Tomo arcano contendo os segredos dos biomas e portais.',
    detailedLore:
      'Escrito pelo Arquimago Orion. Suas páginas de pergaminho estelar revelam como ativar os altares rúnicos e domar criaturas elementais.',
    statsText: 'Livro & Grimório • 3 Páginas de Sabedoria',
    pages: [
      {
        title: 'Capítulo I — A Origem dos Biomas',
        text: 'Quando o Prisma Primordial se dividiu, cada feixe de luz tingiu uma região: as matas esmeraldas ao sul, as neves eternas ao norte e as cavernas de cristal nas profundezas.',
      },
      {
        title: 'Capítulo II — Sinais da Jornada',
        text: 'As missões marcadas com a Estrela de Quatro Pontas Dourada (✦) guiam o destino principal do herói. Cumpra-as em ordem para destravar os cadeados ancestrais.',
      },
      {
        title: 'Capítulo III — Alquimia & Relíquias',
        text: 'Combine ervas luminosas com cristais puros nas estações alquímicas do mapa para criar elixires raros e chocar ovos de criaturas guardiãs.',
      },
    ],
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-book-bestiary',
    name: 'Códice dos Slimes & Guardiões',
    iconEmoji: '📘',
    quantity: 1,
    category: 'livros',
    rarity: 'rare',
    shortDescription: 'Manual ilustrado sobre o comportamento emocional dos NPCs.',
    detailedLore:
      'Um guia de campo essencial que documenta como criaturas pacíficas fogem ao testemunhar combates e como guardiões protegem seus territórios.',
    statsText: 'Livro & Grimório • Guia de Criaturas',
    pages: [
      {
        title: 'Slimes & Locomoção Gelatina',
        text: 'Os Slimes de Slimelands movem-se em pequenos saltos elásticos. Alguns deixam cair moedas e gemas pelo caminho enquanto patrulham.',
      },
      {
        title: 'Emoções Compartilhadas',
        text: 'Observe os sinais acima dos NPCs: ❗ indica alerta, 💢 indica fúria de combate e 💧 indica medo contagiante.',
      },
    ],
    sourceKind: 'demo_catalog',
  },
  {
    id: 'bp-misc-key',
    name: 'Chave Mestra do Santuário',
    iconEmoji: '🗝️',
    quantity: 1,
    category: 'outros',
    rarity: 'epic',
    shortDescription: 'Abre portões trancados e baús reais da Fase Mestra.',
    detailedLore:
      'Entalhada em bronze celestial com dentes em formato de constelação. Indispensável para acessar a câmara secreta do chefe.',
    statsText: 'Item Chave de Missão',
    sourceKind: 'demo_catalog',
  },
];

/**
 * Silhueta negra com aura branca fiel à imagem enviada pelo usuário,
 * exibida automaticamente quando o jogador ainda não definiu um PNG frontal do herói
 * (ou quando o usuário alterna para visualizar a silhueta).
 */
const HeroFrontSilhouetteSvg: React.FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg
    viewBox="0 0 200 200"
    className={className}
    style={{
      filter:
        'drop-shadow(0 0 8px rgba(255,255,255,1)) drop-shadow(0 0 16px rgba(255,255,255,0.95))',
    }}
  >
    <path
      d="M72 34 C98 20, 145 22, 148 44 C150 56, 136 62, 132 65 C148 80, 156 102, 158 118 C164 122, 164 132, 159 138 C165 148, 167 160, 158 172 C142 184, 58 184, 42 172 C33 160, 35 148, 41 138 C36 132, 36 122, 42 118 C44 102, 50 86, 56 76 C42 74, 34 64, 42 52 C50 40, 60 38, 72 34 Z"
      fill="#050505"
    />
  </svg>
);

export const GameBackpackPopupModal: React.FC<{
  project: MapProject;
  mapCollectedInventory?: Record<string, number>;
  onClose: () => void;
  onSwitchToQuests?: () => void;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
  onDropItemToMap?: (item: UnifiedBackpackSlotItem) => void;
  isInsideEmulator?: boolean;
  isLandscape?: boolean;
  isHubFullScreen?: boolean;
}> = ({
  project,
  mapCollectedInventory = {},
  onClose,
  onSwitchToQuests,
  onUpdateProject,
  onDropItemToMap,
  isInsideEmulator = true,
  isLandscape = false,
  isHubFullScreen = false,
}) => {
  // Abas Superiores em Pasta: 'equipamento' | 'inventario_geral' | 'deck'
  const [topFolderTab, setTopFolderTab] = useState<'equipamento' | 'inventario_geral' | 'deck'>('equipamento');

  // Sub-aba do carrossel horizontal deslizante
  const [activeCategory, setActiveCategory] = useState<
    'todos' | 'pets' | 'item_pet' | 'equipaveis' | 'consumiveis' | 'livros' | 'outros'
  >('todos');

  // Modo Selecionar / Soltar (botão circular verde à direita do carrossel)
  const [selectDropMode, setSelectDropMode] = useState(false);

  // Forçar visualização da silhueta mesmo se houver PNG (para teste rápido)
  const [forceSilhouette, setForceSilhouette] = useState(false);

  const resolvedPetConfig = useMemo(
    () => getResolvedPlayerPetConfig(project.player),
    [project.player]
  );

  // Qual dos 3 slots de Pet/Carta (0, 1 ou 2) está selecionado para equipar/trocar
  const [targetPetSlotIdx, setTargetPetSlotIdx] = useState<number>(
    () => resolvedPetConfig.activePetSlotIndex ?? 0
  );

  // Estado dos slots de equipamento ao redor do personagem (3 à esquerda + 3 Slots de Pets/Slimes à direita!)
  const [equippedBySlot, setEquippedBySlot] = useState<Record<EquipmentSlotKey, string | null>>(() => ({
    head: 'bp-eq-boina',
    armor: 'bp-eq-tunic',
    boots: 'bp-eq-boots',
    pet1: resolvedPetConfig.equippedPetIds[0] ? `bp-pet-${resolvedPetConfig.equippedPetIds[0]}` : null,
    pet2: resolvedPetConfig.equippedPetIds[1] ? `bp-pet-${resolvedPetConfig.equippedPetIds[1]}` : null,
    pet3: resolvedPetConfig.equippedPetIds[2] ? `bp-pet-${resolvedPetConfig.equippedPetIds[2]}` : null,
    accessory: 'bp-eq-amulet',
    pet: resolvedPetConfig.enabled && resolvedPetConfig.activePetId ? `bp-pet-${resolvedPetConfig.activePetId}` : null,
    weapon: 'bp-eq-blade',
  }));

  useEffect(() => {
    const p1 = resolvedPetConfig.equippedPetIds[0] ? `bp-pet-${resolvedPetConfig.equippedPetIds[0]}` : null;
    const p2 = resolvedPetConfig.equippedPetIds[1] ? `bp-pet-${resolvedPetConfig.equippedPetIds[1]}` : null;
    const p3 = resolvedPetConfig.equippedPetIds[2] ? `bp-pet-${resolvedPetConfig.equippedPetIds[2]}` : null;
    const activeP =
      resolvedPetConfig.enabled && resolvedPetConfig.activePetId
        ? `bp-pet-${resolvedPetConfig.activePetId}`
        : null;
    setEquippedBySlot((prev) => ({
      ...prev,
      pet1: p1,
      pet2: p2,
      pet3: p3,
      pet: activeP,
    }));
  }, [resolvedPetConfig.enabled, resolvedPetConfig.activePetId, resolvedPetConfig.equippedPetIds]);

  // Helper para equipar uma Carta/Pet em um dos 3 slots (0, 1 ou 2) e sincronizar com o projeto
  const equipPetInSlot = (petId: string | null, slotIdx: number, summonImmediately = true) => {
    const clampedIdx = Math.max(0, Math.min(2, slotIdx));
    const nextEquippedIds = [...resolvedPetConfig.equippedPetIds];
    // Se esse pet já estava em outro slot e estamos equipando, troca de lugar para não duplicar
    if (petId) {
      const existingIdx = nextEquippedIds.findIndex((id, i) => id === petId && i !== clampedIdx);
      if (existingIdx >= 0) {
        nextEquippedIds[existingIdx] = nextEquippedIds[clampedIdx];
      }
    }
    nextEquippedIds[clampedIdx] = petId;

    const nextActiveSlot = summonImmediately ? clampedIdx : resolvedPetConfig.activePetSlotIndex;
    const nextActivePetId = nextEquippedIds[nextActiveSlot] || nextEquippedIds.find(Boolean) || null;
    const catalogPet = nextActivePetId
      ? resolvedPetConfig.petGallery.find((p) => p.id === nextActivePetId)
      : null;

    if (onUpdateProject && project.player) {
      onUpdateProject({
        player: {
          ...project.player,
          petConfig: {
            ...(project.player.petConfig || {}),
            enabled: !!nextActivePetId,
            equippedPetIds: nextEquippedIds,
            activePetSlotIndex: nextActiveSlot,
            activePetId: nextActivePetId,
            ...(catalogPet
              ? {
                  name: catalogPet.name,
                  iconEmoji: catalogPet.iconEmoji,
                  avatarPng: catalogPet.avatarPng,
                  hp: catalogPet.hp ?? catalogPet.maxHp ?? 140,
                  maxHp: catalogPet.maxHp ?? 140,
                  defense: catalogPet.defense ?? 16,
                  level: catalogPet.level ?? 1,
                  xp: catalogPet.xp ?? 0,
                  maxXp: catalogPet.maxXp ?? 100,
                  growthPerLevel: catalogPet.growthPerLevel ?? 0.055,
                  locomotionType: catalogPet.locomotionType ?? 'walker',
                  attackStyle: catalogPet.attackStyle ?? 'walker_dash',
                  aiAggroMode: catalogPet.aiAggroMode ?? 'command_auto',
                  projectileEmoji: catalogPet.projectileEmoji ?? '🔥',
                  attackDamage: catalogPet.attackDamage ?? 35,
                  attackRange: catalogPet.attackRange ?? 200,
                  scale: catalogPet.scale ?? 0.82,
                  followLagSteps: catalogPet.followLagSteps ?? 12,
                  curiousRadius: catalogPet.curiousRadius ?? 48,
                  curiousSpeed: catalogPet.curiousSpeed ?? 1.0,
                  color: catalogPet.color || '#f59e0b',
                }
              : {}),
            petGallery: resolvedPetConfig.petGallery,
          },
        },
      });
    }
  };

  // Itens descartados/consumidos durante a sessão
  const [removedIds, setRemovedIds] = useState<Record<string, number>>({});

  // Slot circular selecionado e Slot de equipamento selecionado
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number>(0);
  const [activeEquipSlotFilter, setActiveEquipSlotFilter] = useState<EquipmentSlotKey | null>(null);

  // Tela de Inspeção "Saber Mais" com Desfoque de Lente (Lens Blur)
  const [lensInspectItem, setLensInspectItem] = useState<UnifiedBackpackSlotItem | null>(null);
  const [bookPageIndex, setBookPageIndex] = useState(0);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Detecta se existe um asset frontal do jogador configurado
  const activeSavedChar = useMemo(() => {
    if (project.activeCharacterId && project.savedCharacters?.length) {
      return project.savedCharacters.find((c) => c.id === project.activeCharacterId) || null;
    }
    return null;
  }, [project.activeCharacterId, project.savedCharacters]);

  const frontPlayerAssetPng =
    activeSavedChar?.avatarDownPng ||
    activeSavedChar?.avatarPng ||
    project.player?.avatarDownPng ||
    project.player?.avatarPng ||
    '';

  // Unifica itens do projeto + itens coletados no mapa + itens de demonstração
  const allUnifiedItems = useMemo<UnifiedBackpackSlotItem[]>(() => {
    const list: UnifiedBackpackSlotItem[] = [];

    // 1. Itens estruturados do project.playerInventory
    for (const pItem of project.playerInventory?.items || []) {
      const catRaw = (pItem.category || pItem.type || '').toLowerCase();
      let category: UnifiedBackpackSlotItem['category'] = 'outros';
      let equipSlot: EquipmentSlotKey | undefined = undefined;

      const catalogDef = (project.itemCatalog || []).find(
        (c) => c.id === pItem.definitionId || c.id === pItem.id || c.name.toLowerCase() === pItem.name.toLowerCase()
      );
      const motionTag = pItem.motionLayerTag || catalogDef?.motionLayerTag;
      const isMotionItem =
        Boolean(motionTag) ||
        (pItem.stateTags || []).includes('motion_item') ||
        (catalogDef?.stateTags || []).includes('motion_item');

      if (catRaw.includes('item_pet') || catRaw.includes('pet')) {
        category = 'item_pet';
      } else if (
        isMotionItem ||
        catRaw.includes('equip') ||
        catRaw.includes('weapon') ||
        catRaw.includes('armor') ||
        catRaw.includes('accessory')
      ) {
        category = 'equipaveis';
        const mSlot = pItem.motionEquipSlot || catalogDef?.motionEquipSlot;
        if (mSlot === 'head') equipSlot = 'head';
        else if (mSlot === 'boots') equipSlot = 'boots';
        else if (mSlot === 'weapon') equipSlot = 'weapon';
        else if (mSlot === 'belt' || mSlot === 'accessory' || mSlot === 'cape' || mSlot === 'wings')
          equipSlot = 'accessory';
        else if (mSlot === 'skin' || mSlot === 'armor') equipSlot = 'armor';
        else if (catRaw.includes('armor')) equipSlot = 'armor';
        else if (catRaw.includes('helm') || catRaw.includes('head')) equipSlot = 'head';
        else if (catRaw.includes('boot')) equipSlot = 'boots';
        else if (catRaw.includes('access') || catRaw.includes('ring')) equipSlot = 'accessory';
        else equipSlot = 'weapon';
      } else if (catRaw.includes('consum') || catRaw.includes('potion') || catRaw.includes('food')) {
        category = 'consumiveis';
      } else if (catRaw.includes('read') || catRaw.includes('book') || catRaw.includes('scroll')) {
        category = 'livros';
      }

      const rem = removedIds[pItem.id] || 0;
      const finalQty = Math.max(0, (pItem.quantity || 1) - rem);
      if (finalQty <= 0) continue;

      list.push({
        id: pItem.id,
        name: pItem.name,
        iconEmoji:
          pItem.iconEmoji ||
          (isMotionItem ? '🎬' : category === 'equipaveis' ? '⚔️' : category === 'livros' ? '📕' : '🧪'),
        iconPng: pItem.iconPng || catalogDef?.iconPng,
        quantity: finalQty,
        category,
        equipSlot,
        rarity: pItem.rarity || catalogDef?.rarity || 'rare',
        shortDescription:
          pItem.description ||
          catalogDef?.shortDescription ||
          (motionTag
            ? `Motion Item Equipável (#${motionTag}). Revela camadas animadas no herói.`
            : 'Item do inventário do aventureiro.'),
        detailedLore:
          pItem.detailedDescription ||
          catalogDef?.detailedDescription ||
          pItem.description ||
          'Artefato catalogado na mochila do jogador durante a jornada.',
        statsText: [
          motionTag ? `🎬 MOTION #${motionTag}` : '',
          pItem.stats?.attack ? `+${pItem.stats.attack} ATQ` : '',
          pItem.stats?.defense ? `+${pItem.stats.defense} DEF` : '',
          pItem.stats?.healthRestore ? `+${pItem.stats.healthRestore} PV` : '',
        ]
          .filter(Boolean)
          .join(' • ') || undefined,
        pages: pItem.readableContent?.pages?.map((pg) => ({
          title: pg.title,
          text: pg.text,
        })),
        sourceKind: 'project_item',
        motionLayerTag: motionTag,
      });
    }

    // 2. Recursos coletados em marcadores do mapa
    for (const [resName, qty] of Object.entries(mapCollectedInventory)) {
      const rem = removedIds[`map-${resName}`] || 0;
      const finalQty = Math.max(0, qty - rem);
      if (finalQty <= 0) continue;
      const lower = resName.toLowerCase();
      const isBook = lower.includes('livro') || lower.includes('grimório') || lower.includes('pergaminho');
      const isPotion = lower.includes('poção') || lower.includes('elixir') || lower.includes('fruta');
      const isEquip = lower.includes('espada') || lower.includes('escudo') || lower.includes('armadura') || lower.includes('arco');

      list.push({
        id: `map-${resName}`,
        name: resName,
        iconEmoji: isBook ? '📜' : isPotion ? '🧪' : isEquip ? '🗡️' : '💎',
        quantity: finalQty,
        category: isEquip ? 'equipaveis' : isPotion ? 'consumiveis' : isBook ? 'livros' : 'outros',
        equipSlot: isEquip ? 'weapon' : undefined,
        rarity: 'uncommon',
        shortDescription: `Coletado diretamente nos marcadores da fase (${finalQty}x).`,
        detailedLore: `Recurso autêntico recolhido pelo jogador ao explorar "${project.title || 'a fase'}". Pode ser utilizado em missões, trocas com NPCs ou estações interativas.`,
        statsText: `Quantidade na Mochila: ×${finalQty}`,
        sourceKind: 'map_resource',
      });
    }

    // 0. Galeria de Pets Companheiros do Jogador (para equipar e trocar no slot de Pet da mochila!)
    for (const pet of resolvedPetConfig.petGallery) {
      const slotItemId = `bp-pet-${pet.id}`;
      const rem = removedIds[slotItemId] || 0;
      if (rem >= 1) continue;
      const petLv = pet.level ?? 1;
      const petHp = pet.hp ?? pet.maxHp ?? 140;
      const petMaxHp = pet.maxHp ?? 140;
      list.push({
        id: slotItemId,
        petId: pet.id,
        name: `${pet.name} (Nv.${petLv})`,
        iconEmoji: pet.iconEmoji || '🐾',
        iconPng: pet.avatarPng,
        quantity: 1,
        category: 'pets',
        equipSlot: 'pet',
        rarity: pet.rarity || 'epic',
        shortDescription: pet.shortDescription || 'Pet Companheiro que refaz seu trajeto e ataca inimigos.',
        detailedLore:
          pet.detailedLore ||
          'Companheiro fiel da Galeria de Pets do Jogador. Segue exatamente seus passos ao caminhar, explora curioso em volta quando você para e ataca os NPCs inimigos até atordoá-los em 50% PV.',
        statsText: `Nv.${petLv} • ❤️ ${petHp}/${petMaxHp} PV • ⚔️ ${pet.attackDamage} ATQ`,
        sourceKind: 'pet_gallery',
      });
    }

    // 3. Adiciona o acervo completo de demonstração para garantir que todas as categorias (Equipáveis, Consumíveis, Livros e Grimórios) tenham itens ricos para teste
    for (const demo of DEFAULT_SHOWCASE_ITEMS) {
      if (!list.some((i) => i.id === demo.id)) {
        const rem = removedIds[demo.id] || 0;
        const finalQty = Math.max(0, demo.quantity - rem);
        if (finalQty > 0) {
          list.push({ ...demo, quantity: finalQty });
        }
      }
    }

    return list;
  }, [project.playerInventory?.items, mapCollectedInventory, removedIds, project.title, resolvedPetConfig.petGallery]);

  // Filtra itens de acordo com o carrossel horizontal e eventual filtro de slot
  const filteredItems = useMemo(() => {
    return allUnifiedItems.filter((item) => {
      if (activeEquipSlotFilter && item.equipSlot !== activeEquipSlotFilter) {
        return false;
      }
      if (activeCategory === 'todos') return true;
      if (activeCategory === 'equipaveis') {
        return item.category === 'equipaveis' || item.category === 'pets';
      }
      return item.category === activeCategory;
    });
  }, [allUnifiedItems, activeCategory, activeEquipSlotFilter]);

  // Total de slots circulares (ex: 28 no modo Equipamento, 42 no modo Inventário Geral)
  const totalSlotsCount = topFolderTab === 'inventario_geral' ? 42 : 28;
  const colsClass = isLandscape
    ? topFolderTab === 'inventario_geral'
      ? 'grid-cols-8'
      : 'grid-cols-6'
    : 'grid-cols-7';

  const selectedItem: UnifiedBackpackSlotItem | null =
    filteredItems[selectedSlotIndex] || null;

  const isSelectedItemEquipped = useMemo(() => {
    if (!selectedItem) return false;
    if (selectedItem.motionLayerTag) {
      const eqTags = (project.player?.equippedMotionTags || []).map((t) => t.toLowerCase());
      if (eqTags.includes(selectedItem.motionLayerTag.toLowerCase())) return true;
    }
    return Object.values(equippedBySlot).includes(selectedItem.id);
  }, [selectedItem, equippedBySlot, project.player?.equippedMotionTags]);

  // Equipar / Desequipar / Usar item selecionado (Botão Ciano Esquerdo)
  const handlePrimaryEquipOrUse = () => {
    if (!selectedItem) {
      triggerToast('Selecione um slot com item primeiro!');
      return;
    }

    if (selectedItem.category === 'pets' || selectedItem.equipSlot === 'pet') {
      const targetPetId = selectedItem.petId || selectedItem.id.replace(/^bp-pet-/, '');
      const existingSlotIdx = resolvedPetConfig.equippedPetIds.findIndex((id) => id === targetPetId);

      if (existingSlotIdx === targetPetSlotIdx) {
        equipPetInSlot(null, targetPetSlotIdx, false);
        triggerToast(`🐾 Removido do Slot ${targetPetSlotIdx + 1}: ${selectedItem.name}`);
      } else {
        equipPetInSlot(targetPetId, targetPetSlotIdx, true);
        triggerToast(`🐾 Equipado no Slot ${targetPetSlotIdx + 1} e Invocado: ${selectedItem.name}!`);
      }
      return;
    }

    if (selectedItem.category === 'equipaveis') {
      const targetSlot: EquipmentSlotKey = selectedItem.equipSlot || 'weapon';
      const currentlyEquippedId = equippedBySlot[targetSlot];
      const mTag = selectedItem.motionLayerTag?.trim();
      const currentEqTags = project.player?.equippedMotionTags || [];
      const isTagEquipped = mTag
        ? currentEqTags.some((t) => t.toLowerCase() === mTag.toLowerCase())
        : false;
      const shouldUnequip = currentlyEquippedId === selectedItem.id || isTagEquipped;

      if (shouldUnequip) {
        setEquippedBySlot((prev) => ({ ...prev, [targetSlot]: null }));
        if (onUpdateProject && project.player) {
          const nextTags = mTag
            ? currentEqTags.filter((t) => t.toLowerCase() !== mTag.toLowerCase())
            : currentEqTags;
          const nextInvItems = (project.playerInventory?.items || []).map((it) =>
            it.id === selectedItem.id ? { ...it, equipped: false } : it
          );
          onUpdateProject({
            player: { ...project.player, equippedMotionTags: nextTags },
            playerInventory: project.playerInventory
              ? { ...project.playerInventory, items: nextInvItems }
              : project.playerInventory,
          });
        }
        triggerToast(
          mTag
            ? `🙈 Roupa/Peça Motion desfeita (#${mTag}): ${selectedItem.name}`
            : `Desequipado: ${selectedItem.name}`
        );
      } else {
        setEquippedBySlot((prev) => ({ ...prev, [targetSlot]: selectedItem.id }));
        if (onUpdateProject && project.player) {
          const nextTags = mTag
            ? Array.from(new Set([...currentEqTags, mTag]))
            : currentEqTags;
          const nextInvItems = (project.playerInventory?.items || []).map((it) =>
            it.id === selectedItem.id ? { ...it, equipped: true } : it
          );
          onUpdateProject({
            player: { ...project.player, equippedMotionTags: nextTags },
            playerInventory: project.playerInventory
              ? { ...project.playerInventory, items: nextInvItems }
              : project.playerInventory,
          });
        }
        triggerToast(
          mTag
            ? `👕 Vestido no Herói (#${mTag}): ${selectedItem.name}!`
            : `⚔️ Equipado no slot: ${selectedItem.name}!`
        );
      }
      return;
    }

    if (selectedItem.category === 'item_pet') {
      setRemovedIds((prev) => ({
        ...prev,
        [selectedItem.id]: (prev[selectedItem.id] || 0) + 1,
      }));
      if (onUpdateProject && project.player) {
        const res = applyPetCareItemToPlayer(project.player, selectedItem);
        onUpdateProject({ player: res.updatedPlayer });
        triggerToast(
          res.leveledUp
            ? `⬆️ LEVEL UP! ${res.petName} subiu para Nv.${res.newLevel} e CRESCEU! (+${res.healedHp} PV)`
            : `🍖 ${res.petName} recebeu ${selectedItem.name}! (+${res.healedHp} PV • +${res.gainedXp} EXP)`
        );
      } else {
        triggerToast(`🍖 Deu ${selectedItem.name} ao Pet! (${selectedItem.statsText || 'Cura & EXP'})`);
      }
      return;
    }

    if (selectedItem.category === 'consumiveis') {
      setRemovedIds((prev) => ({
        ...prev,
        [selectedItem.id]: (prev[selectedItem.id] || 0) + 1,
      }));
      triggerToast(`✨ Consumiu ${selectedItem.name}! (${selectedItem.statsText || 'Efeito aplicado'})`);
      return;
    }

    if (selectedItem.category === 'livros') {
      setBookPageIndex(0);
      setLensInspectItem(selectedItem);
      return;
    }

    setBookPageIndex(0);
    setLensInspectItem(selectedItem);
  };

  // Soltar / Descartar 1x do item selecionado quando o modo Selecionar/Soltar está ativo
  const handleDropSelectedItem = (itemToDrop?: UnifiedBackpackSlotItem) => {
    const target = itemToDrop || selectedItem;
    if (!target) {
      triggerToast('Selecione um item para soltar!');
      return;
    }
    setRemovedIds((prev) => ({
      ...prev,
      [target.id]: (prev[target.id] || 0) + 1,
    }));
    // Se estava equipado e acabou, desequipa
    if (target.quantity <= 1) {
      setEquippedBySlot((prev) => {
        const next = { ...prev };
        (Object.keys(next) as EquipmentSlotKey[]).forEach((k) => {
          if (next[k] === target.id) next[k] = null;
        });
        return next;
      });
    }
    onDropItemToMap?.(target);
    triggerToast(`📤 Soltou 1x ${target.name} no mapa!`);
  };

  // Renderizador de cada Slot de Equipamento ao lado do Personagem (Tema Dourado/Âmbar Real alinhado ao Quest Menu)
  const renderPurpleEquipmentSlot = (
    slotKey: EquipmentSlotKey,
    label: string,
    isTallWeaponSlot = false
  ) => {
    const equippedId = equippedBySlot[slotKey];
    const eqItem = allUnifiedItems.find((i) => i.id === equippedId) || null;
    const isSlotFiltered = activeEquipSlotFilter === slotKey;

    return (
      <button
        type="button"
        onClick={() => {
          if (slotKey === 'pet') {
            setActiveCategory('pets');
            setActiveEquipSlotFilter('pet');
            const idx = eqItem
              ? Math.max(
                  0,
                  allUnifiedItems
                    .filter((i) => i.equipSlot === 'pet')
                    .findIndex((i) => i.id === eqItem.id)
                )
              : 0;
            setSelectedSlotIndex(idx);
            triggerToast(
              eqItem
                ? `🐾 Pet Ativo: ${eqItem.name} • Escolha outro Pet ao lado para trocar!`
                : '🐾 Escolha um Pet Companheiro na Galeria ao lado para equipar!'
            );
            return;
          }
          if (eqItem) {
            const idx = filteredItems.findIndex((i) => i.id === eqItem.id);
            if (idx >= 0) setSelectedSlotIndex(idx);
            else {
              setActiveCategory('todos');
              setActiveEquipSlotFilter(null);
              const allIdx = allUnifiedItems.findIndex((i) => i.id === eqItem.id);
              if (allIdx >= 0) setSelectedSlotIndex(allIdx);
            }
            triggerToast(`${label}: ${eqItem.name}`);
          } else {
            setActiveEquipSlotFilter((prev) => (prev === slotKey ? null : slotKey));
            setActiveCategory('equipaveis');
            setSelectedSlotIndex(0);
            triggerToast(`Filtrando equipamentos para: ${label}`);
          }
        }}
        title={
          slotKey === 'pet'
            ? eqItem
              ? `🐾 Slot de Pet: ${eqItem.name} (Clique para trocar de Pet)`
              : '🐾 Slot de Pet Companheiro vazio (Clique para escolher um Pet)'
            : eqItem
            ? `${label}: ${eqItem.name} (Clique para selecionar)`
            : `${label} vazio (Clique para filtrar)`
        }
        className={`relative w-full ${
          isTallWeaponSlot
            ? isLandscape
              ? 'h-22 rounded-[20px]'
              : 'h-20 rounded-[20px]'
            : isLandscape
            ? 'h-9.5 rounded-full'
            : 'h-9 rounded-full'
        } bg-gradient-to-b from-[#92400e] via-[#78350f] to-[#5c2604] border-[2.5px] ${
          isSlotFiltered
            ? 'border-white ring-3 ring-[#fbbf24] scale-[1.04]'
            : eqItem
            ? 'border-[#fbbf24] hover:border-white'
            : 'border-[#d97706] hover:border-[#fef08a]'
        } shadow-[0_3.5px_0_#3b1702,inset_0_2px_4px_rgba(255,255,255,0.28)] flex flex-col items-center justify-center transition-all active:translate-y-0.5 cursor-pointer group`}
      >
        {slotKey === 'pet' && (
          <span className="absolute -top-2 px-1.5 py-0.2 rounded-full bg-[#fbbf24] border border-[#5c2604] text-[#451a03] text-[7px] font-black uppercase tracking-wider shadow-xs">
            🐾 Pet
          </span>
        )}
        {eqItem ? (
          <div className="flex flex-col items-center justify-center leading-none">
            {eqItem.iconPng ? (
              <img
                src={eqItem.iconPng}
                alt={eqItem.name}
                className={`${isTallWeaponSlot ? 'w-10 h-10' : 'w-5 h-5'} object-contain drop-shadow`}
              />
            ) : (
              <span className={`${isTallWeaponSlot ? 'text-2xl' : 'text-base'} drop-shadow`}>
                {eqItem.iconEmoji}
              </span>
            )}
            <span className="text-[8px] font-black text-[#fef08a] truncate max-w-[64px] mt-0.5 drop-shadow">
              {eqItem.name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-[#fde68a] font-black text-xl leading-none select-none group-hover:scale-110 transition-transform">
              {slotKey === 'pet' ? '🐾' : '+'}
            </span>
            {slotKey === 'pet' && (
              <span className="text-[7px] font-black text-[#fde68a]/80 mt-0.5">Equipar Pet</span>
            )}
          </div>
        )}
      </button>
    );
  };

  // Renderizador de cada um dos 3 Slots de Pets/Slimes à Direita do Personagem
  const renderPetEquipmentSlot = (petSlotNumber: 0 | 1 | 2) => {
    const slotKey: EquipmentSlotKey =
      petSlotNumber === 0 ? 'pet1' : petSlotNumber === 1 ? 'pet2' : 'pet3';
    const equippedPetId = resolvedPetConfig.equippedPetIds[petSlotNumber];
    const eqItem = equippedPetId
      ? allUnifiedItems.find((i) => i.id === `bp-pet-${equippedPetId}`) || null
      : null;
    const isTargetSlot = targetPetSlotIdx === petSlotNumber;
    const isSummonedActive =
      resolvedPetConfig.enabled &&
      resolvedPetConfig.activePetId &&
      resolvedPetConfig.activePetId === equippedPetId;

    return (
      <button
        type="button"
        onClick={() => {
          setTargetPetSlotIdx(petSlotNumber);
          setActiveCategory('pets');
          setActiveEquipSlotFilter('pet');
          if (equippedPetId) {
            equipPetInSlot(equippedPetId, petSlotNumber, true);
            const idx = Math.max(
              0,
              allUnifiedItems
                .filter((i) => i.equipSlot === 'pet')
                .findIndex((i) => i.id === `bp-pet-${equippedPetId}`)
            );
            setSelectedSlotIndex(idx);
            triggerToast(
              `🐾 Slot Pet ${petSlotNumber + 1} Ativo no Mapa: ${eqItem?.name || 'Pet'}!`
            );
          } else {
            setSelectedSlotIndex(0);
            triggerToast(
              `🐾 Slot Pet ${petSlotNumber + 1} selecionado • Escolha um Pet/Slime ao lado para equipar!`
            );
          }
        }}
        title={
          eqItem
            ? `🐾 Slot Pet ${petSlotNumber + 1}: ${eqItem.name} (Clique para invocar ou trocar)`
            : `🐾 Slot Pet ${petSlotNumber + 1} vazio (Clique para equipar um Pet/Slime)`
        }
        className={`relative w-full ${
          isLandscape ? 'h-9.5 rounded-full' : 'h-9 rounded-full'
        } bg-gradient-to-b from-[#92400e] via-[#78350f] to-[#5c2604] border-[2.5px] ${
          isSummonedActive
            ? 'border-[#4ade80] ring-2 ring-[#4ade80]/80 scale-[1.03]'
            : isTargetSlot
            ? 'border-white ring-2 ring-[#fbbf24]'
            : eqItem
            ? 'border-[#fbbf24] hover:border-white'
            : 'border-[#d97706] hover:border-[#fef08a]'
        } shadow-[0_3.5px_0_#3b1702,inset_0_2px_4px_rgba(255,255,255,0.28)] flex flex-col items-center justify-center transition-all active:translate-y-0.5 cursor-pointer group`}
      >
        <span
          className={`absolute -top-1.5 -right-1 px-1 rounded-full border text-[6.5px] font-black uppercase leading-tight shadow-xs ${
            isSummonedActive
              ? 'bg-[#22c55e] border-white text-white'
              : 'bg-[#fbbf24] border-[#5c2604] text-[#451a03]'
          }`}
        >
          {isSummonedActive ? `⚡P${petSlotNumber + 1}` : `P${petSlotNumber + 1}`}
        </span>
        {eqItem ? (
          <div className="flex items-center justify-center gap-1 leading-none px-1">
            {eqItem.iconPng ? (
              <img
                src={eqItem.iconPng}
                alt={eqItem.name}
                className="w-4.5 h-4.5 object-contain drop-shadow shrink-0"
              />
            ) : (
              <span className="text-sm drop-shadow shrink-0">{eqItem.iconEmoji}</span>
            )}
            <span className="text-[7.5px] font-black text-[#fef08a] truncate max-w-[44px] drop-shadow">
              {eqItem.name.split(' ')[0]}
            </span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-1 leading-none">
            <span className="text-[#fde68a] font-black text-xs leading-none select-none">🐾</span>
            <span className="text-[7.5px] font-black text-[#fde68a]/85">Pet {petSlotNumber + 1}</span>
          </div>
        )}
      </button>
    );
  };

  // Sub-bloco: Palco do Personagem (Silhueta com aura branca ou Sprite Frente + 3 Slots Esq + 3 Slots de Pets Dir)
  const renderEquipmentHeroStage = () => (
    <div
      className={`relative rounded-[24px] p-2 bg-gradient-to-b from-[#fef3c7] via-[#fde68a] to-[#f59e0b] border-[3px] border-[#d97706] shadow-[0_4px_0_#92400e] shrink-0 ${
        isLandscape && !isHubFullScreen ? 'w-[45%] h-full flex flex-col' : 'w-full'
      }`}
    >
      {/* Borda interna tracejada fiel ao design do usuário com paleta dourada/creme */}
      <div className="w-full h-full rounded-[18px] border-[2.5px] border-dashed border-[#78350f]/55 bg-[#fffbeb]/45 px-2.5 py-2 flex flex-col justify-between relative">
        {/* Topo sutil dentro do palco: Nome do Herói + Alternador Silhueta/Sprite */}
        <div className="flex items-center justify-between gap-1 z-10 mb-0.5">
          <span className="px-2.5 py-0.5 rounded-full bg-[#5c2604] border border-[#fef08a] text-[#fef08a] text-[9px] font-black tracking-wide shadow-xs">
            ⚔️ {project.player?.name || activeSavedChar?.name || 'Herói (Posição Frente)'}
          </span>
          <button
            type="button"
            onClick={() => setForceSilhouette((v) => !v)}
            className="px-2 py-0.5 rounded-full bg-[#fff8e7] hover:bg-white border border-[#b45309] text-[#5c2604] text-[9px] font-black shadow-xs cursor-pointer transition-all"
            title="Alternar entre Silhueta com Aura Branca e Asset Frontal do Jogador"
          >
            {frontPlayerAssetPng && !forceSilhouette ? '👤 Ver Silhueta' : '🎨 Asset Frente'}
          </button>
        </div>

        {/* Grid Central: 3 Slots à Esquerda | Silhueta/Personagem ao Centro | 3 Slots de Pets/Slimes à Direita! */}
        <div className="grid grid-cols-12 items-center gap-2 my-auto py-0.5">
          {/* 3 Slots de Equipamento à Esquerda */}
          <div className="col-span-3 flex flex-col gap-2 justify-center">
            {renderPurpleEquipmentSlot('head', 'Cabeça / Elmo')}
            {renderPurpleEquipmentSlot('armor', 'Armadura / Traje')}
            {renderPurpleEquipmentSlot('boots', 'Botas / Calçado')}
          </div>

          {/* Personagem ao Centro: Silhueta Preta com Brilho Branco OU Asset Frontal / Motion Canvas Paper-Doll */}
          <div className="col-span-6 flex flex-col items-center justify-center relative min-h-[118px]">
            {frontPlayerAssetPng && !forceSilhouette ? (
              (project.player?.motionLayers && project.player.motionLayers.length > 0) ||
              (activeSavedChar?.motionLayers && activeSavedChar.motionLayers.length > 0) ? (
                <MotionAssetCanvas
                  src={frontPlayerAssetPng}
                  alt="Personagem Frente"
                  motionLayers={resolveVisibleMotionLayersForPlayer(
                    project.player?.motionLayers || activeSavedChar?.motionLayers,
                    project.player || activeSavedChar || undefined,
                    project.playerInventory,
                    undefined,
                    project.itemCatalog
                  )}
                  isNpcBounce={false}
                  width={isLandscape ? 120 : 100}
                  height={isLandscape ? 120 : 100}
                  className={`${
                    isLandscape ? 'w-30 h-30' : 'w-25 h-25'
                  } object-contain select-none transition-transform duration-300 hover:scale-105`}
                  style={{
                    filter:
                      'drop-shadow(0 0 8px rgba(255,255,255,1)) drop-shadow(0 0 16px rgba(255,255,255,0.9))',
                  }}
                />
              ) : (
                <img
                  src={frontPlayerAssetPng}
                  alt="Personagem Frente"
                  className={`${
                    isLandscape ? 'w-30 h-30' : 'w-25 h-25'
                  } object-contain select-none transition-transform duration-300 hover:scale-105`}
                  style={{
                    filter:
                      'drop-shadow(0 0 8px rgba(255,255,255,1)) drop-shadow(0 0 16px rgba(255,255,255,0.9))',
                  }}
                />
              )
            ) : (
              <HeroFrontSilhouetteSvg className={isLandscape ? 'w-30 h-30' : 'w-25 h-25'} />
            )}
          </div>

          {/* 3 Slots de Pets / Mobbys / Slimes à Direita! */}
          <div className="col-span-3 flex flex-col gap-2 justify-center">
            {renderPetEquipmentSlot(0)}
            {renderPetEquipmentSlot(1)}
            {renderPetEquipmentSlot(2)}
          </div>
        </div>
      </div>
    </div>
  );

  // Sub-bloco: Carrossel Horizontal de Categorias + Grade de Slots Circulares + Barra de Ações Inferior
  const renderSlotsAndActionsSection = () => (
    <div
      className={`flex flex-col ${
        isHubFullScreen
          ? 'w-full gap-2.5 mt-2.5'
          : `flex-1 min-h-0 min-w-0 justify-between ${isLandscape ? 'h-full pl-1' : 'mt-2'}`
      }`}
    >
      {/* CARROSSEL HORIZONTAL DESLIZANTE DE CATEGORIAS + BOTÃO SELECIONAR/SOLTAR */}
      <div className="flex items-center gap-2 shrink-0 mb-1.5">
        <div className="flex-1 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 pr-1">
          {[
            { id: 'pets', label: '🐾 Pets' },
            { id: 'item_pet', label: '🍖 Item Pet' },
            { id: 'equipaveis', label: '⚔️ Equipáveis' },
            { id: 'consumiveis', label: '🧪 Consumíveis' },
            { id: 'livros', label: '📕 Livros & Grimórios' },
            { id: 'todos', label: '🎒 Todos' },
            { id: 'outros', label: '🗝️ Relíquias' },
          ].map((cat) => {
            const isActive = activeCategory === cat.id && !activeEquipSlotFilter;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveEquipSlotFilter(null);
                  setActiveCategory(cat.id as any);
                  setSelectedSlotIndex(0);
                }}
                className={`px-3 py-1 rounded-full border-[2.5px] text-[10px] font-black whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] border-[#5c2604] text-[#451a03] shadow-[0_3px_0_#5c2604] -translate-y-0.5'
                    : 'bg-[#fef3c7] border-[#d97706] text-[#78350f] shadow-[0_2px_0_#b45309] hover:bg-[#fde68a]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Botão Circular Verde Selecionar / Soltar */}
        <button
          type="button"
          onClick={() => {
            const next = !selectDropMode;
            setSelectDropMode(next);
            triggerToast(
              next
                ? '🟢 Modo SOLTAR ativo: toque num slot ou no botão vermelho para soltar'
                : 'Modo Seleção normal ativo'
            );
          }}
          title={
            selectDropMode
              ? 'Modo Selecionar/Soltar ATIVO (Clique para desativar)'
              : 'Ativar modo Selecionar / Soltar item'
          }
          className={`w-7 h-7 rounded-full border-[3px] border-[#365314] flex items-center justify-center shadow-[0_3px_0_#1a2e05] transition-all cursor-pointer shrink-0 ${
            selectDropMode
              ? 'bg-[#84cc16] ring-3 ring-[#fbbf24] scale-110'
              : 'bg-gradient-to-b from-[#4ade80] to-[#16a34a] hover:brightness-110'
          }`}
        >
          <span className="w-2.5 h-2.5 rounded-full bg-white/80 pointer-events-none" />
        </button>
      </div>

      {/* GRADE DE SLOTS CIRCULARES NO TEMA DO QUEST MENU */}
      <div
        className={`relative ${
          isHubFullScreen ? 'w-full' : 'flex-1 min-h-0 flex items-stretch gap-2 overflow-hidden'
        }`}
      >
        <div
          className={
            isHubFullScreen ? 'w-full pb-1' : 'flex-1 overflow-y-auto pr-1 pb-2.5 scrollbar-none'
          }
        >
          <div className={`grid ${colsClass} gap-2.5`}>
            {Array.from({ length: totalSlotsCount }).map((_, idx) => {
              const slotItem = filteredItems[idx] || null;
              const isSelected = selectedSlotIndex === idx;
              const isEquipped =
                slotItem && Object.values(equippedBySlot).includes(slotItem.id);

              return (
                <button
                  key={`slot-${idx}`}
                  type="button"
                  onClick={() => {
                    setSelectedSlotIndex(idx);
                    if (slotItem && selectDropMode) {
                      handleDropSelectedItem(slotItem);
                    }
                  }}
                  onDoubleClick={() => {
                    if (slotItem) {
                      setSelectedSlotIndex(idx);
                      setBookPageIndex(0);
                      setLensInspectItem(slotItem);
                    }
                  }}
                  title={
                    slotItem
                      ? `${slotItem.name} (×${slotItem.quantity}) — Duplo clique para Saber Mais`
                      : `Slot vazio #${idx + 1}`
                  }
                  className={`relative aspect-square rounded-full flex items-center justify-center transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-gradient-to-b from-[#fef08a] to-[#fbbf24] border-[3px] border-[#5c2604] shadow-[0_4px_0_#5c2604] -translate-y-0.5 scale-[1.05] z-10'
                      : slotItem
                      ? 'bg-gradient-to-b from-[#fffbeb] to-[#fde68a] border-[2.5px] border-[#d97706] shadow-[0_3px_0_#92400e] hover:brightness-105'
                      : 'bg-gradient-to-b from-[#fef3c7]/90 to-[#fde68a]/75 border-[2px] border-[#e5a913] shadow-[0_3px_0_#b45309]/70 hover:brightness-105'
                  }`}
                >
                  {slotItem ? (
                    <>
                      {slotItem.iconPng ? (
                        <img
                          src={slotItem.iconPng}
                          alt={slotItem.name}
                          className="w-3/5 h-3/5 object-contain drop-shadow-xs"
                        />
                      ) : (
                        <span className="text-base sm:text-lg leading-none drop-shadow-xs">
                          {slotItem.iconEmoji}
                        </span>
                      )}

                      {/* Quantidade */}
                      {slotItem.quantity > 1 && (
                        <span className="absolute -bottom-0.5 -right-0.5 px-1 rounded-full bg-[#5c2604] text-[#fef08a] border border-white text-[8px] font-black leading-tight">
                          {slotItem.quantity}
                        </span>
                      )}

                      {/* Indicador de Equipado */}
                      {isEquipped && (
                        <span className="absolute -top-0.5 -left-0.5 w-3.5 h-3.5 rounded-full bg-[#16a34a] border border-white text-white text-[8px] font-black flex items-center justify-center shadow">
                          E
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[#b45309]/65 font-black text-base leading-none">+</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!isHubFullScreen && (
          <>
            {/* Scrollbar Vertical Dourada 3D à direita */}
            <div className="w-3.5 rounded-full bg-[#fde68a] border-2 border-[#78350f] shadow-inner p-0.5 flex flex-col items-center shrink-0 my-0.5">
              <div className="w-full h-9 rounded-full bg-gradient-to-b from-[#f59e0b] to-[#b45309] border border-[#fef08a] shadow-xs" />
            </div>

            {/* Fade suave na base dos slots */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-5 h-4 bg-gradient-to-t from-[#fff8e7] to-transparent" />
          </>
        )}
      </div>

      {/* FAIXA RÁPIDA DO ITEM SELECIONADO */}
      <div className="px-2.5 py-1 my-1 rounded-full bg-[#fef3c7] border-2 border-[#d97706] flex items-center justify-between gap-2 text-[10px] font-black text-[#5c2604] shrink-0">
        {selectedItem ? (
          <>
            <span className="truncate">
              {selectedItem.iconEmoji} {selectedItem.name}{' '}
              <span className="text-[#b45309]">
                {isSelectedItemEquipped ? '(EQUIPADO)' : `×${selectedItem.quantity}`}
              </span>
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-[#5c2604] text-[#fef08a] shrink-0">
              {selectedItem.statsText || selectedItem.category.toUpperCase()}
            </span>
          </>
        ) : (
          <span className="text-[#92400e]/85">
            Slot vazio selecionado • Toque em um item para equipar ou inspecionar
          </span>
        )}
      </div>

      {/* BARRA INFERIOR COM OS 3 BOTÕES NOVA UI V1.2 (BTN-ROYAL-GOLD & BTN-PEARL-GOLD) */}
      <div className="flex items-center gap-2 pt-0.5 shrink-0">
        {/* 1. Botão Royal Sapphire & Gold: Equipar / Desequipar / Usar */}
        <button
          type="button"
          onClick={handlePrimaryEquipOrUse}
          className="flex-1 btn-royal-gold cursor-pointer truncate"
        >
          <div className="btn-royal-inner py-1.5 px-3 font-cinzel font-bold text-[10px] uppercase flex items-center justify-center gap-1.5 truncate">
            <span>
              {!selectedItem
                ? '🐾 EQUIPAR / USAR'
                : selectedItem.category === 'pets' || selectedItem.equipSlot === 'pet'
                ? `🐾 EQUIPAR SLOT ${targetPetSlotIdx + 1}`
                : selectedItem.category === 'item_pet'
                ? '🍖 DAR AO PET'
                : selectedItem.category === 'equipaveis'
                ? isSelectedItemEquipped
                  ? '🛡️ DESEQUIPAR'
                  : '⚔️ EQUIPAR'
                : selectedItem.category === 'consumiveis'
                ? '🧪 CONSUMIR'
                : '📖 ABRIR'}
            </span>
          </div>
        </button>

        {/* 2. Botão Pearl & Gold Central: Saber Mais (Abre tela com Desfoque de Lente) */}
        <button
          type="button"
          onClick={() => {
            if (!selectedItem) {
              triggerToast('Selecione um slot com item para ver os detalhes!');
              return;
            }
            setBookPageIndex(0);
            setLensInspectItem(selectedItem);
          }}
          className="flex-[1.15] btn-pearl-gold cursor-pointer truncate"
        >
          <div className="btn-pearl-inner py-1.5 px-3 font-cinzel font-bold text-[10px] uppercase flex items-center justify-center gap-1 truncate">
            <span>🔍 SABER MAIS</span>
          </div>
        </button>

        {/* 3. Botão Circular Fechar / Soltar (no Hub Fullscreen só exibe quando selectDropMode está ativo) */}
        {(!isHubFullScreen || (selectDropMode && selectedItem)) && (
          <button
            type="button"
            onClick={() => {
              if (selectDropMode && selectedItem) {
                handleDropSelectedItem(selectedItem);
              } else {
                onClose();
              }
            }}
            title={
              selectDropMode && selectedItem
                ? `Soltar 1x ${selectedItem.name}`
                : 'Fechar Pop-up de Mochila'
            }
            className="close-btn-outer cursor-pointer shrink-0"
          >
            <div className="close-btn-inner">
              {selectDropMode && selectedItem ? '📤' : '✕'}
            </div>
          </button>
        )}
      </div>
    </div>
  );

  const goldCount =
    project.player?.defaultCurrencies?.gold ?? project.playerInventory?.currencies.gold ?? 150;
  const gemsCount =
    project.player?.defaultCurrencies?.gems ?? project.playerInventory?.currencies.gems ?? 10;

  const lastScrollYRef = React.useRef(0);
  const handleHubScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!isHubFullScreen) return;
    const curY = e.currentTarget.scrollTop;
    const dy = curY - lastScrollYRef.current;
    lastScrollYRef.current = curY;
    if (curY > 28 && dy > 3) {
      document.body.classList.add('hub-scroll-hide-bars');
    } else if (dy < -3 || curY <= 20) {
      document.body.classList.remove('hub-scroll-hide-bars');
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onScroll={handleHubScroll}
      className={
        isHubFullScreen
          ? 'w-full h-full overflow-y-auto overflow-x-hidden nova-scroll select-none'
          : `${
              isInsideEmulator
                ? 'absolute inset-0 z-80 p-2.5 flex items-center justify-center bg-black/50 backdrop-blur-[2px]'
                : 'fixed inset-0 z-90 p-4 flex items-center justify-center bg-black/65 backdrop-blur-sm'
            } select-none`
      }
      style={
        isHubFullScreen
          ? {
              padding: isLandscape ? '56px 16px 112px 16px' : '64px 10px 118px 10px',
              boxSizing: 'border-box',
              background: 'transparent',
            }
          : undefined
      }
    >
      {/* MOLDURA 3D OU CONTAINER LIVRE TRANSPARENTE NO HUB */}
      <div
        className={`relative w-full ${
          isHubFullScreen
            ? 'max-w-[960px] mx-auto flex flex-col gap-3'
            : `${
                isInsideEmulator
                  ? isLandscape
                    ? 'max-w-[760px] h-[90%] max-h-[410px]'
                    : 'max-w-[445px] h-[85%] max-h-[620px]'
                  : isLandscape
                  ? 'max-w-4xl h-[82vh] max-h-[540px]'
                  : 'max-w-xl h-[85vh] max-h-[680px]'
              } pearl-surface flex flex-col overflow-hidden`
        }`}
      >
        {/* TOPO COM ABAS DA MOCHILA DE FASE */}
        <div
          className={
            isHubFullScreen
              ? 'p-1.5 rounded-2xl flex items-center justify-between gap-1.5 shrink-0'
              : 'px-3.5 py-2.5 bg-gradient-to-b from-[#f5efe2] to-[#e3d7c3] border-b-[2px] border-[#b88928] relative flex items-center justify-between gap-2 shrink-0'
          }
          style={
            isHubFullScreen
              ? {
                  background: 'rgba(7, 18, 38, 0.68)',
                  border: '1.5px solid rgba(212, 175, 83, 0.45)',
                  backdropFilter: 'blur(8px)',
                }
              : undefined
          }
        >
          <div
            className={
              isHubFullScreen
                ? 'grid grid-cols-4 gap-1.5 w-full'
                : 'pearl-pill p-0.5 flex items-center gap-1 flex-wrap'
            }
          >
            {/* Aba 1: Equipamento */}
            <button
              type="button"
              onClick={() => setTopFolderTab('equipamento')}
              className={
                topFolderTab === 'equipamento'
                  ? 'btn-royal-gold cursor-pointer w-full'
                  : isHubFullScreen
                  ? 'btn-pearl-gold cursor-pointer w-full'
                  : 'px-3 py-1 font-cinzel font-bold text-[10px] text-[#5c4b3b] uppercase cursor-pointer'
              }
            >
              <div
                className={
                  topFolderTab === 'equipamento'
                    ? 'btn-royal-inner px-2 py-1.5 font-cinzel font-bold text-[9.5px] uppercase truncate'
                    : isHubFullScreen
                    ? 'btn-pearl-inner px-2 py-1.5 font-cinzel font-bold text-[9.5px] uppercase truncate'
                    : ''
                }
              >
                🛡️ EQUIPAR
              </div>
            </button>

            {/* Aba 2: Inventário Geral */}
            <button
              type="button"
              onClick={() => setTopFolderTab('inventario_geral')}
              className={
                topFolderTab === 'inventario_geral'
                  ? 'btn-royal-gold cursor-pointer w-full'
                  : isHubFullScreen
                  ? 'btn-pearl-gold cursor-pointer w-full'
                  : 'px-3 py-1 font-cinzel font-bold text-[10px] text-[#5c4b3b] uppercase cursor-pointer'
              }
            >
              <div
                className={
                  topFolderTab === 'inventario_geral'
                    ? 'btn-royal-inner px-2 py-1.5 font-cinzel font-bold text-[9.5px] uppercase truncate'
                    : isHubFullScreen
                    ? 'btn-pearl-inner px-2 py-1.5 font-cinzel font-bold text-[9.5px] uppercase truncate'
                    : ''
                }
              >
                🎒 ITENS ({allUnifiedItems.length})
              </div>
            </button>

            {/* Aba 3: Gerenciador de Deck (3 Slots de Pets) */}
            <button
              type="button"
              onClick={() => setTopFolderTab('deck')}
              className={
                topFolderTab === 'deck'
                  ? 'btn-royal-gold cursor-pointer w-full'
                  : isHubFullScreen
                  ? 'btn-pearl-gold cursor-pointer w-full'
                  : 'px-3 py-1 font-cinzel font-bold text-[10px] text-[#5c4b3b] uppercase cursor-pointer'
              }
              title="Gerenciador de Deck de Cartas de Monstros Escaneados (3 Slots de Pets)"
            >
              <div
                className={
                  topFolderTab === 'deck'
                    ? 'btn-royal-inner px-2 py-1.5 font-cinzel font-bold text-[9.5px] uppercase truncate'
                    : isHubFullScreen
                    ? 'btn-pearl-inner px-2 py-1.5 font-cinzel font-bold text-[9.5px] uppercase truncate'
                    : ''
                }
              >
                🃏 PETS ({resolvedPetConfig.petGallery.length})
              </div>
            </button>

            {/* Aba 4: Acesso Direto ao Pop-up de Quests (Jornada / Tarefas) */}
            {onSwitchToQuests && (
              <button
                type="button"
                onClick={onSwitchToQuests}
                className="btn-pearl-gold cursor-pointer w-full"
                title="Alternar para Quests (Jornada & Tarefas)"
              >
                <div className="btn-pearl-inner px-2 py-1.5 font-cinzel font-bold text-[9.5px] uppercase flex items-center justify-center gap-1 truncate">
                  <HudFourPointStarIcon className="w-3 h-3 shrink-0" />
                  <span>JORNADA</span>
                </div>
              </button>
            )}
          </div>

          {!isHubFullScreen && (
            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:flex items-center gap-1.5 pearl-pill px-2.5 py-1 font-cinzel font-bold text-[10px] text-[#3a2b1c]">
                <span>🪙 {goldCount}</span>
                <span>•</span>
                <span>💎 {gemsCount}</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="close-btn-outer cursor-pointer shrink-0"
                title="Fechar Pop-up de Mochila"
              >
                <div className="close-btn-inner">✕</div>
              </button>
            </div>
          )}
        </div>

        {/* SUB-BARRA INFORMATIVA PEARL (Oculta no modo Hub Fullscreen para evitar sobreposição) */}
        {!isHubFullScreen && (
          <div className="px-4 py-1 bg-[#e6dac6] border-b border-[#c9b493] flex items-center justify-between text-[9px] font-cinzel font-bold text-[#3a2b1c] shrink-0">
            <span>
              {topFolderTab === 'equipamento'
                ? `🛡️ EQUIPAMENTO & 3 SLOTS DE PETS • ${project.title || 'FASE ATIVA'}`
                : topFolderTab === 'deck'
                ? `🃏 GERENCIADOR DE DECK • EQUIPE ATÉ 3 CARTAS PARA INVOCAR COMO PETS`
                : `🎒 MOCHILA DE FASE COMPLETA • ${allUnifiedItems.length}/${totalSlotsCount} SLOTS`}
            </span>
            <span className="pearl-pill px-2 py-0.5 text-[#8c6518]">
              🪙 {goldCount} • 💎 {gemsCount}
            </span>
          </div>
        )}

        {/* =====================================================================
            CORPO PRINCIPAL DA MOCHILA (SEM FUNDO BRANCO NO MODO HUB FULLSCREEN)
           ===================================================================== */}
        <div
          className={
            isHubFullScreen
              ? 'flex flex-col gap-3 relative'
              : 'flex-1 min-h-0 bg-[#fff8e7] p-3 flex flex-col overflow-hidden relative'
          }
        >
          {/* Toast rápido de feedback */}
          {statusToast && (
            <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[1500] px-3.5 py-1 rounded-full bg-[#451a03] border-2 border-[#fef08a] text-[#fef08a] font-black text-[10px] shadow-lg whitespace-nowrap pointer-events-none">
              {statusToast}
            </div>
          )}

          {topFolderTab === 'equipamento' ? (
            /* ABA 1: EQUIPAMENTO (Fluxo vertical unificado no Hub para rolar toda a tela de cima a baixo) */
            isLandscape && !isHubFullScreen ? (
              <div className="flex-1 min-h-0 flex flex-row gap-3 items-stretch">
                {renderEquipmentHeroStage()}
                {renderSlotsAndActionsSection()}
              </div>
            ) : (
              <div className={isHubFullScreen ? 'flex flex-col gap-2.5' : 'flex-1 min-h-0 flex flex-col'}>
                {renderEquipmentHeroStage()}
                {renderSlotsAndActionsSection()}
              </div>
            )
          ) : topFolderTab === 'deck' ? (
            /* ABA 3: GERENCIADOR DE DECK DE CARTAS ESCANEADAS (3 SLOTS DE INVOCAÇÃO + COLEÇÃO DE CARTAS) */
            <div className={isHubFullScreen ? 'flex flex-col gap-3' : 'flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden'}>
              {/* Seletor Superior com os 3 Slots de Cartas Equipadas para Invocação */}
              <div className="p-2.5 rounded-2xl bg-gradient-to-b from-[#fef3c7] via-[#fde68a] to-[#f59e0b] border-[3px] border-[#b45309] shadow-[0_4px_0_#78350f] shrink-0">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-[10px] font-black text-[#451a03] uppercase tracking-wider flex items-center gap-1">
                    <span>🃏 Deck Ativo de Invocação (3 Slots na Cápsula da UI)</span>
                  </span>
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-[#5c2604] text-[#fef08a]">
                    Slot Selecionado p/ Equipar: #{targetPetSlotIdx + 1}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((slotIdx) => {
                    const equippedPet = resolvedPetConfig.equippedPets[slotIdx];
                    const isTarget = targetPetSlotIdx === slotIdx;
                    const isSummoned =
                      resolvedPetConfig.enabled &&
                      resolvedPetConfig.activePetId &&
                      equippedPet?.id === resolvedPetConfig.activePetId;

                    return (
                      <div
                        key={`deck-slot-${slotIdx}`}
                        onClick={() => {
                          setTargetPetSlotIdx(slotIdx);
                          if (equippedPet) {
                            equipPetInSlot(equippedPet.id, slotIdx, true);
                            triggerToast(`⚡ ${equippedPet.name} invocado no mapa (Slot ${slotIdx + 1})!`);
                          } else {
                            triggerToast(`🃏 Slot ${slotIdx + 1} selecionado! Toque numa Carta abaixo para equipar.`);
                          }
                        }}
                        className={`relative p-2 rounded-2xl border-[2.5px] transition-all cursor-pointer flex flex-col items-center justify-between text-center ${
                          isSummoned
                            ? 'bg-gradient-to-b from-[#fffbeb] via-[#fef08a] to-[#f59e0b] border-[#16a34a] ring-3 ring-[#4ade80] shadow-[0_4px_0_#14532d]'
                            : isTarget
                            ? 'bg-gradient-to-b from-[#fffbeb] to-[#fde68a] border-[#5c2604] ring-2 ring-white shadow-[0_3px_0_#5c2604]'
                            : 'bg-[#78350f]/85 border-[#d97706] text-[#fef3c7] hover:brightness-105'
                        }`}
                      >
                        <div className="w-full flex items-center justify-between text-[8px] font-black mb-1">
                          <span
                            className={`px-1.5 py-0.2 rounded-full ${
                              isSummoned
                                ? 'bg-[#16a34a] text-white'
                                : isTarget
                                ? 'bg-[#5c2604] text-[#fef08a]'
                                : 'bg-black/35 text-[#fde68a]'
                            }`}
                          >
                            {isSummoned ? `⚡ ATIVO #${slotIdx + 1}` : `SLOT #${slotIdx + 1}`}
                          </span>
                          {equippedPet && (
                            <span
                              className={
                                isSummoned || isTarget ? 'text-[#78350f]' : 'text-[#fef08a]'
                              }
                            >
                              Nv.{equippedPet.level ?? 1}
                            </span>
                          )}
                        </div>

                        {equippedPet ? (
                          <>
                            <div className="w-11 h-11 rounded-xl bg-[#451a03]/15 border border-[#b45309]/40 flex items-center justify-center overflow-hidden my-0.5">
                              {equippedPet.avatarPng ? (
                                <img
                                  src={equippedPet.avatarPng}
                                  alt={equippedPet.name}
                                  className="w-full h-full object-contain drop-shadow"
                                />
                              ) : (
                                <span className="text-2xl drop-shadow">{equippedPet.iconEmoji}</span>
                              )}
                            </div>
                            <span
                              className={`text-[9.5px] font-black truncate w-full ${
                                isSummoned || isTarget ? 'text-[#451a03]' : 'text-[#fef08a]'
                              }`}
                            >
                              {equippedPet.name}
                            </span>
                            <span
                              className={`text-[8px] font-bold ${
                                isSummoned || isTarget ? 'text-[#78350f]' : 'text-[#fde68a]/90'
                              }`}
                            >
                              ❤️{equippedPet.hp ?? equippedPet.maxHp ?? 140} • ⚔️{equippedPet.attackDamage}
                            </span>
                          </>
                        ) : (
                          <div className="py-3 flex flex-col items-center justify-center opacity-80">
                            <span className="text-xl">🃏</span>
                            <span className="text-[8.5px] font-black mt-0.5">Slot Vazio</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Coleção de Cartas Escaneadas & Galeria de Pets */}
              <div className={isHubFullScreen ? 'w-full' : 'flex-1 min-h-0 overflow-y-auto pr-1'}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pb-2">
                  {resolvedPetConfig.petGallery.map((card) => {
                    const equippedSlotIndex = resolvedPetConfig.equippedPetIds.findIndex(
                      (id) => id === card.id
                    );
                    const isCardEquipped = equippedSlotIndex >= 0;
                    const isCardSummoned =
                      resolvedPetConfig.enabled && resolvedPetConfig.activePetId === card.id;
                    const lv = card.level ?? 1;
                    const hp = card.hp ?? card.maxHp ?? 140;
                    const maxHp = card.maxHp ?? 140;
                    const styleLabel =
                      card.attackStyle === 'flying_ranged'
                        ? '🦅 Voador • Distância'
                        : card.attackStyle === 'flying_dive'
                        ? '🐉 Voador • Rasante'
                        : card.attackStyle === 'walker_ranged'
                        ? '🦊 Caminhante • Orbe'
                        : card.attackStyle === 'berserker_spin'
                        ? '🐯 Giro Furioso'
                        : '🐾 Caminhante • Dash';

                    return (
                      <div
                        key={`deck-card-${card.id}`}
                        className={`relative rounded-2xl p-2.5 border-[3px] flex flex-col justify-between transition-all ${
                          isCardSummoned
                            ? 'bg-gradient-to-b from-[#fef08a] via-[#fde68a] to-[#f59e0b] border-[#16a34a] shadow-[0_4px_0_#14532d]'
                            : isCardEquipped
                            ? 'bg-gradient-to-b from-[#fffbeb] via-[#fef3c7] to-[#fde68a] border-[#d97706] shadow-[0_4px_0_#92400e]'
                            : 'bg-gradient-to-b from-[#fffbeb] to-[#fef3c7] border-[#b45309]/70 shadow-[0_3px_0_#78350f]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="px-1.5 py-0.2 rounded-full bg-[#5c2604] text-[#fef08a] text-[8px] font-black">
                              🃏 Nv.{lv}
                            </span>
                            {isCardEquipped && (
                              <span className="px-1.5 py-0.2 rounded-full bg-[#16a34a] text-white text-[8px] font-black">
                                Slot #{equippedSlotIndex + 1}
                              </span>
                            )}
                          </div>

                          <div className="w-full h-14 rounded-xl bg-gradient-to-b from-[#451a03]/15 to-[#451a03]/25 border border-[#b45309]/40 flex items-center justify-center overflow-hidden my-1">
                            {card.avatarPng ? (
                              <img
                                src={card.avatarPng}
                                alt={card.name}
                                className="w-12 h-12 object-contain drop-shadow"
                              />
                            ) : (
                              <span className="text-3xl drop-shadow">{card.iconEmoji}</span>
                            )}
                          </div>

                          <div className="text-center">
                            <div className="text-[10.5px] font-black text-[#451a03] truncate">
                              {card.name}
                            </div>
                            <div className="text-[8px] font-bold text-[#92400e] truncate">
                              {styleLabel}
                            </div>
                            <div className="mt-1 flex items-center justify-center gap-1.5 text-[8.5px] font-black text-[#5c2604] bg-white/70 rounded-full py-0.5 px-2 border border-[#d97706]/50">
                              <span>❤️ {hp}/{maxHp}</span>
                              <span>•</span>
                              <span>⚔️ {card.attackDamage}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 grid grid-cols-3 gap-1">
                          {[0, 1, 2].map((sIdx) => {
                            const isInThisSlot = equippedSlotIndex === sIdx;
                            return (
                              <button
                                key={`eq-btn-${card.id}-${sIdx}`}
                                type="button"
                                onClick={() => {
                                  setTargetPetSlotIdx(sIdx);
                                  equipPetInSlot(card.id, sIdx, true);
                                  triggerToast(
                                    `🃏 Carta "${card.name}" equipada no Slot ${sIdx + 1} e invocada!`
                                  );
                                }}
                                className={`py-1 rounded-lg border text-[8px] font-black cursor-pointer transition-all ${
                                  isInThisSlot
                                    ? 'bg-[#16a34a] border-[#14532d] text-white shadow-xs'
                                    : 'bg-[#5c2604] hover:bg-[#78350f] border-[#451a03] text-[#fef08a]'
                                }`}
                                title={`Equipar esta carta no Slot ${sIdx + 1} do Deck`}
                              >
                                {isInThisSlot ? `✓ S${sIdx + 1}` : `Slot ${sIdx + 1}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* ABA 2: INVENTÁRIO GERAL (Resumo de Moedas, Capacidade Expandida e Todos os Slots) */
            <div className={isHubFullScreen ? 'flex flex-col gap-2.5' : 'flex-1 min-h-0 flex flex-col'}>
              <div className="mb-2 p-2.5 rounded-2xl bg-gradient-to-r from-[#fef3c7] via-[#fde68a] to-[#fef3c7] border-[2.5px] border-[#d97706] flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-[#d97706] text-white font-black text-[10px] border border-white shadow-xs">
                    🪙 {goldCount} Ouro
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#16a34a] text-white font-black text-[10px] border border-white shadow-xs">
                    💎 {gemsCount} Gemas
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#5c2604] text-[#fef08a] font-black text-[10px] border border-[#fef08a] shadow-xs">
                    📦 {allUnifiedItems.length} / {totalSlotsCount} Slots
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setTopFolderTab('equipamento')}
                  className="px-2.5 py-0.5 rounded-full bg-[#fff8e7] text-[#5c2604] border border-[#b45309] font-black text-[10px] cursor-pointer hover:bg-white"
                >
                  🛡️ Ver Personagem
                </button>
              </div>

              {renderSlotsAndActionsSection()}
            </div>
          )}

          {/* =====================================================================
              TELA DE INSPEÇÃO "SABER MAIS" COM DESFOQUE DE LENTE (LENS BLUR OVERLAY)
              Exibe o item em destaque com aura e o texto detalhado/lore abaixo
             ===================================================================== */}
          {lensInspectItem && (
            <div
              onClick={() => setLensInspectItem(null)}
              className={`${
                isHubFullScreen ? 'fixed inset-0 z-[2000]' : 'absolute inset-0 z-50'
              } bg-slate-950/75 backdrop-blur-xl p-4 flex flex-col items-center justify-center text-center animate-fadeIn`}
            >
              {/* Efeito de Lente / Bokeh luminoso */}
              <div className="w-56 h-56 rounded-full bg-gradient-to-tr from-[#fbbf24]/35 via-[#f59e0b]/25 to-[#fef08a]/35 blur-2xl absolute pointer-events-none" />

              <div
                onClick={(e) => e.stopPropagation()}
                className="relative z-10 w-full max-w-[380px] flex flex-col items-center space-y-3"
              >
                {/* Moldura Circular Flutuante do Item em Lente */}
                <div className="w-24 h-24 rounded-full bg-gradient-to-b from-[#fef3c7]/40 to-[#f59e0b]/20 border-[3px] border-[#fef08a] shadow-[0_0_35px_rgba(251,191,36,0.65)] flex items-center justify-center relative">
                  {lensInspectItem.iconPng ? (
                    <img
                      src={lensInspectItem.iconPng}
                      alt={lensInspectItem.name}
                      className="w-16 h-16 object-contain drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
                    />
                  ) : (
                    <span className="text-5xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                      {lensInspectItem.iconEmoji}
                    </span>
                  )}
                  <span className="absolute -bottom-2 px-2.5 py-0.5 rounded-full bg-[#fbbf24] border-2 border-[#5c2604] text-[#451a03] font-black text-[10px] uppercase shadow">
                    {lensInspectItem.rarity}
                  </span>
                </div>

                {/* Título e Subtítulo do Item */}
                <div className="space-y-1 pt-1">
                  <h3
                    className="text-base sm:text-lg font-black text-[#fef08a] tracking-wide"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.85)' }}
                  >
                    {lensInspectItem.name}
                  </h3>
                  {lensInspectItem.statsText && (
                    <span className="inline-block px-3 py-0.5 rounded-full bg-[#22c55e] border border-white text-white font-black text-[11px] shadow">
                      {lensInspectItem.statsText}
                    </span>
                  )}
                </div>

                {/* Caixa de Texto / Lore (ou Leitor de Páginas se for Livro/Grimório) */}
                <div className="w-full rounded-2xl bg-[#3b1702]/80 border-2 border-[#fbbf24]/60 p-3.5 text-left space-y-2 backdrop-blur-md shadow-xl">
                  {lensInspectItem.pages && lensInspectItem.pages.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between border-b border-[#fbbf24]/30 pb-1.5">
                        <span className="text-[11px] font-black text-[#fef08a]">
                          {lensInspectItem.pages[bookPageIndex]?.title ||
                            `Página ${bookPageIndex + 1}`}
                        </span>
                        <span className="text-[10px] font-bold text-[#fde68a]">
                          Pág. {bookPageIndex + 1}/{lensInspectItem.pages.length}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white/95 leading-relaxed">
                        {lensInspectItem.pages[bookPageIndex]?.text}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          disabled={bookPageIndex === 0}
                          onClick={() => setBookPageIndex((p) => Math.max(0, p - 1))}
                          className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white text-[10px] font-black cursor-pointer"
                        >
                          ◀ Anterior
                        </button>
                        <button
                          type="button"
                          disabled={bookPageIndex >= lensInspectItem.pages.length - 1}
                          onClick={() =>
                            setBookPageIndex((p) =>
                              Math.min((lensInspectItem.pages?.length || 1) - 1, p + 1)
                            )
                          }
                          className="px-2.5 py-1 rounded-full bg-white/20 hover:bg-white/30 disabled:opacity-40 text-white text-[10px] font-black cursor-pointer"
                        >
                          Próxima ▶
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-bold text-[#fef08a]">
                        {lensInspectItem.shortDescription}
                      </p>
                      <p className="text-xs font-medium text-white/90 leading-relaxed">
                        {lensInspectItem.detailedLore}
                      </p>
                    </>
                  )}
                </div>

                {/* Botões de Ação dentro da Lente */}
                <div className="flex items-center gap-2.5 pt-1">
                  {(lensInspectItem.category === 'equipaveis' ||
                    lensInspectItem.category === 'pets' ||
                    lensInspectItem.equipSlot === 'pet') && (
                    <button
                      type="button"
                      onClick={() => {
                        handlePrimaryEquipOrUse();
                        setLensInspectItem(null);
                      }}
                      className="px-4 py-2 rounded-full bg-gradient-to-b from-[#4ade80] to-[#16a34a] border-2 border-white text-white font-black text-xs shadow-lg cursor-pointer"
                    >
                      {lensInspectItem.category === 'pets' || lensInspectItem.equipSlot === 'pet'
                        ? isSelectedItemEquipped
                          ? '🐾 Recolher Pet'
                          : '🐾 Equipar Pet Agora'
                        : isSelectedItemEquipped
                        ? '🛡️ Desequipar'
                        : '⚔️ Equipar Agora'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setLensInspectItem(null)}
                    className="px-5 py-2 rounded-full bg-gradient-to-b from-[#fbbf24] to-[#d97706] border-2 border-[#5c2604] text-[#451a03] font-black text-xs shadow-lg cursor-pointer"
                  >
                    ✕ Fechar Inspeção
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 5. CÁPSULA VERTICAL DE VIDRO COM BORDAS DOURADAS (3 SLOTS DE PETS + BOTÃO ITEM PET)
//    Posicionado no canto direito da UI para trocar de Pet no mapa em tempo real!
// ============================================================================
export const VerticalGlassPetSwitcherCapsuleWidget: React.FC<{
  player?: import('../../types/map').PlayerConfig;
  isLandscape?: boolean;
  onSelectPetSlot: (slotIndex: number, pet: import('../../types/map').PlayerPetCatalogItem | null) => void;
  onOpenPetItemMenu: () => void;
  onOpenDeckModal?: () => void;
}> = ({ player, isLandscape = false, onSelectPetSlot, onOpenPetItemMenu, onOpenDeckModal }) => {
  const resolved = useMemo(() => getResolvedPlayerPetConfig(player), [player]);
  const slotSize = isLandscape ? 'w-9 h-9' : 'w-10 h-10';

  return (
    <div
      className="select-none backdrop-blur-md rounded-full py-2 px-1.5 flex flex-col items-center gap-2 relative overflow-hidden transition-all duration-300"
      style={{
        backgroundColor: 'rgba(15, 23, 42, 0.48)',
        border: '2.5px solid #fbbf24',
        boxShadow:
          '0 3px 0 #78350f, 0 8px 20px rgba(0,0,0,0.45), inset 0 1.5px 2px rgba(255,255,255,0.45)',
      }}
    >
      {/* Brilho glossy lateral da cápsula de vidro vertical com contorno dourado */}
      <span
        className="absolute inset-y-3 left-0.5 w-[28%] rounded-full pointer-events-none"
        style={{
          background:
            'linear-gradient(to right, rgba(255,255,255,0.34), rgba(255,255,255,0.02))',
        }}
      />

      {/* 3 Slots de Pets / Cartas Equipadas */}
      {[0, 1, 2].map((slotIdx) => {
        const pet = resolved.equippedPets[slotIdx];
        const isActive =
          resolved.enabled &&
          resolved.activePetId &&
          pet &&
          pet.id === resolved.activePetId;
        const hp = pet?.hp ?? pet?.maxHp ?? 140;
        const maxHp = Math.max(1, pet?.maxHp ?? 140);
        const hpPct = Math.max(8, Math.min(100, Math.round((hp / maxHp) * 100)));

        return (
          <button
            key={`vglass-pet-slot-${slotIdx}`}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (pet) {
                onSelectPetSlot(slotIdx, pet);
              } else {
                onOpenDeckModal?.();
              }
            }}
            title={
              pet
                ? `🐾 Slot ${slotIdx + 1}: ${pet.name} (Nv.${pet.level ?? 1} • ❤️ ${hp}/${maxHp}) — Toque para invocar no mapa!`
                : `Slot de Pet ${slotIdx + 1} vazio — Toque para abrir o Deck`
            }
            className={`${slotSize} rounded-full flex items-center justify-center relative transition-all duration-150 cursor-pointer shrink-0 ${
              isActive
                ? 'bg-gradient-to-b from-[#fef08a]/90 to-[#f59e0b]/90 border-[2.5px] border-[#4ade80] ring-2 ring-[#fbbf24] scale-110 shadow-[0_0_12px_rgba(74,222,128,0.75)]'
                : pet
                ? 'bg-slate-900/75 hover:bg-slate-800/90 border-[2px] border-[#fbbf24]/85 hover:scale-105'
                : 'bg-slate-950/55 hover:bg-slate-900/70 border-[1.5px] border-dashed border-[#fbbf24]/50'
            }`}
          >
            {pet ? (
              <>
                {pet.avatarPng ? (
                  <img
                    src={pet.avatarPng}
                    alt={pet.name}
                    className="w-4/5 h-4/5 object-contain pointer-events-none drop-shadow-[0_2px_3px_rgba(0,0,0,0.75)]"
                  />
                ) : (
                  <span className="text-base leading-none drop-shadow-[0_2px_2px_rgba(0,0,0,0.75)]">
                    {pet.iconEmoji || '🐾'}
                  </span>
                )}
                {/* Badge Nível */}
                <span className="absolute -top-1 -right-1 px-1 min-w-[14px] h-[13px] rounded-full bg-[#451a03] border border-[#fbbf24] text-[7.5px] font-black text-[#fef08a] flex items-center justify-center leading-none z-20">
                  {pet.level ?? 1}
                </span>
                {/* Mini barra de PV do Pet */}
                <div className="absolute -bottom-1 inset-x-1 h-1.5 rounded-full bg-slate-950 border border-[#451a03] overflow-hidden z-20">
                  <div
                    className="h-full bg-gradient-to-r from-[#22c55e] to-[#4ade80]"
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
              </>
            ) : (
              <span className="text-[11px] font-black text-[#fbbf24]/70">+{slotIdx + 1}</span>
            )}
          </button>
        );
      })}

      {/* Divisor dourado sutil */}
      <div className="w-5 h-[1.5px] rounded-full bg-[#fbbf24]/50 my-0.5" />

      {/* Botão Item Pet (Cura e Alimentos para o Pet Ativo) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onOpenPetItemMenu();
        }}
        title="🍖 Item Pet: Dar Cura e Alimentos ao Pet Ativo (Sobe Nível e Cresce!)"
        className={`${slotSize} rounded-full bg-gradient-to-b from-[#fbbf24] via-[#f59e0b] to-[#d97706] hover:brightness-110 border-2 border-[#fffbeb] shadow-[0_2px_0_#78350f] flex flex-col items-center justify-center relative transition-transform active:scale-90 cursor-pointer shrink-0`}
      >
        <span className="text-sm leading-none drop-shadow">🍖</span>
        <span className="text-[6.5px] font-black text-[#451a03] uppercase leading-none mt-0.5">
          Pet
        </span>
      </button>
    </div>
  );
};


