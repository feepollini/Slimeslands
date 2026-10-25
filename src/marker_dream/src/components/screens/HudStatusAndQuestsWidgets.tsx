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
  onSwitchToBackpack?: (folderTab?: 'equipamento' | 'inventario_geral' | 'deck') => void;
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

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

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

  // Extrai slots visuais de recompensas (Assets / Moedas / EXP / Baús) para exibir como ícones de jogo sem poluição textual
  const getVisualRewardSlots = (q: UnifiedHudQuestEntry) => {
    const slots: { icon: string; badge: string; rarityBg: string; label: string }[] = [];
    const rawRewards = q.rawQuest?.rewards || [];

    for (const r of rawRewards) {
      if (r.category === 'xp' && r.xpAmount) {
        slots.push({
          icon: '⭐',
          badge: `+${r.xpAmount}`,
          rarityBg: 'linear-gradient(180deg, #0b3778 0%, #041f4a 100%)',
          label: 'EXP',
        });
      } else if (r.category === 'currency') {
        const amt = (r as any).amount || (r as any).currencyAmount || 100;
        slots.push({
          icon: '🪙',
          badge: `+${amt}`,
          rarityBg: 'linear-gradient(180deg, #9b6c15 0%, #523707 100%)',
          label: 'Ouro',
        });
      } else if (r.category === 'item') {
        slots.push({
          icon: (r as any).iconEmoji || '🎁',
          badge: `x${(r as any).quantity || 1}`,
          rarityBg: 'linear-gradient(180deg, #4c1d95 0%, #2e1065 100%)',
          label: (r as any).itemName || 'Item',
        });
      }
    }

    if (slots.length === 0) {
      slots.push(
        {
          icon: '⭐',
          badge: '+200',
          rarityBg: 'linear-gradient(180deg, #0b3778 0%, #041f4a 100%)',
          label: 'EXP',
        },
        {
          icon: '🪙',
          badge: '+150',
          rarityBg: 'linear-gradient(180deg, #9b6c15 0%, #523707 100%)',
          label: 'Ouro',
        },
        {
          icon: q.category === 'jornada' ? '🏆' : '🎁',
          badge: 'x1',
          rarityBg: 'linear-gradient(180deg, #064e3b 0%, #022c22 100%)',
          label: 'Baú',
        }
      );
    }

    return slots.slice(0, 4);
  };

  // Barra de Abas Unificada no Topo (EQUIPAR | ITENS | PETS | JORNADA | TAREFAS)
  const renderUnifiedTopSubTabs = () => (
    <div
      className="w-full p-1.5 rounded-2xl flex items-center justify-between gap-1.5 shrink-0"
      style={{
        background: 'linear-gradient(180deg, rgba(11, 47, 98, 0.86) 0%, rgba(4, 18, 42, 0.94) 100%)',
        border: '2px solid #c59638',
        outline: '1.5px solid #4a3006',
        boxShadow: '0 8px 22px rgba(0, 8, 22, 0.65), inset 0 1px 1px rgba(255, 243, 194, 0.35)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <div
        className={`grid ${
          onSwitchToBackpack ? 'grid-cols-5' : 'grid-cols-2'
        } gap-1 sm:gap-1.5 flex-1 min-w-0`}
      >
        {onSwitchToBackpack && (
          <>
            <button
              type="button"
              onClick={() => onSwitchToBackpack('equipamento')}
              className="btn-pearl-gold cursor-pointer w-full"
              title="Equipamento & Herói"
            >
              <div className="btn-pearl-inner py-1.5 px-1.5 font-cinzel font-black text-[8.5px] sm:text-[10px] uppercase flex items-center justify-center gap-1 truncate">
                <span>🛡️</span>
                <span className="truncate">EQUIPAR</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSwitchToBackpack('inventario_geral')}
              className="btn-pearl-gold cursor-pointer w-full"
              title="Mochila de Itens"
            >
              <div className="btn-pearl-inner py-1.5 px-1.5 font-cinzel font-black text-[8.5px] sm:text-[10px] uppercase flex items-center justify-center gap-1 truncate">
                <span>🎒</span>
                <span className="truncate">ITENS</span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSwitchToBackpack('deck')}
              className="btn-pearl-gold cursor-pointer w-full"
              title="Deck de Pets & Criaturas"
            >
              <div className="btn-pearl-inner py-1.5 px-1.5 font-cinzel font-black text-[8.5px] sm:text-[10px] uppercase flex items-center justify-center gap-1 truncate">
                <span>🃏</span>
                <span className="truncate">PETS</span>
              </div>
            </button>
          </>
        )}

        <button
          type="button"
          onClick={() => {
            setActiveTab('jornada');
            setSelectedQuestId(null);
          }}
          className={
            activeTab === 'jornada'
              ? 'btn-royal-gold cursor-pointer w-full'
              : 'btn-pearl-gold cursor-pointer w-full'
          }
          title="Jornada Principal"
        >
          <div
            className={
              activeTab === 'jornada'
                ? 'btn-royal-inner py-1.5 px-1.5 flex items-center justify-center gap-1 font-cinzel font-black text-[8.5px] sm:text-[10px] uppercase truncate'
                : 'btn-pearl-inner py-1.5 px-1.5 flex items-center justify-center gap-1 font-cinzel font-black text-[8.5px] sm:text-[10px] uppercase truncate'
            }
          >
            <HudFourPointStarIcon className="w-3 h-3 shrink-0" />
            <span className="truncate">JORNADA</span>
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
              : 'btn-pearl-gold cursor-pointer w-full'
          }
          title="Tarefas & Recompensas Rápidas"
        >
          <div
            className={
              activeTab === 'tarefas'
                ? 'btn-royal-inner py-1.5 px-1.5 flex items-center justify-center gap-1 font-cinzel font-black text-[8.5px] sm:text-[10px] uppercase truncate'
                : 'btn-pearl-inner py-1.5 px-1.5 flex items-center justify-center gap-1 font-cinzel font-black text-[8.5px] sm:text-[10px] uppercase truncate'
            }
          >
            <span>📋</span>
            <span className="truncate">TAREFAS</span>
          </div>
        </button>
      </div>

      {!isHubFullScreen && (
        <button
          type="button"
          onClick={onClose}
          className="close-btn-outer cursor-pointer shrink-0 ml-1"
          title="Fechar"
        >
          <div className="close-btn-inner">✕</div>
        </button>
      )}
    </div>
  );

  // Card Gamificado Visual de cada Missão / Tarefa (Foco em Assets, Slots de Loot e Barra Visual)
  const renderGamifiedQuestCard = (q: UnifiedHudQuestEntry) => {
    const isSelected = selectedQuest?.id === q.id;
    const doneCount = q.objectives.filter((o) => o.completed).length;
    const totalCount = Math.max(1, q.objectives.length);
    const pct = Math.round((doneCount / totalCount) * 100);
    const rewardSlots = getVisualRewardSlots(q);

    return (
      <div
        key={q.id}
        onClick={() => setSelectedQuestId(isSelected ? null : q.id)}
        className={`pearl-surface p-3 transition-all cursor-pointer relative overflow-hidden ${
          isSelected
            ? 'ring-2 ring-[#e5c168]'
            : q.isLocked
            ? 'opacity-80 hover:opacity-100'
            : 'hover:brightness-[1.02]'
        }`}
        style={{
          borderRadius: '20px',
          border: q.isCompleted
            ? '2.5px solid #16a34a'
            : isSelected
            ? '2.5px solid #c59638'
            : '2px solid #c59638',
          outline: '1.5px solid #4a3006',
        }}
      >
        {/* Linha Principal do Card: Medalhão de Asset + Título/Barra Visual + Slots Visuais de Recompensa + Botão de Ação */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* 1. Medalhão Visual do Asset da Missão */}
          <div
            className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl flex flex-col items-center justify-center shrink-0 relative"
            style={{
              background: q.isCompleted
                ? 'linear-gradient(180deg, #065f46 0%, #022c22 100%)'
                : q.isLocked
                ? 'linear-gradient(180deg, #334155 0%, #0f172a 100%)'
                : 'linear-gradient(180deg, #0b3778 0%, #041f4a 100%)',
              border: '2px solid #e5c168',
              boxShadow: '0 4px 10px rgba(0,8,22,0.5), inset 0 1px 2px rgba(255,243,194,0.45)',
            }}
          >
            <span className="text-2xl sm:text-3xl leading-none drop-shadow-[0_3px_4px_rgba(0,0,0,0.65)]">
              {q.isLocked ? '🔒' : q.iconEmoji || '⚔️'}
            </span>
            <span className="absolute -top-1.5 -left-1.5 px-1.5 py-0.2 rounded-full bg-[#2b1f14] border border-[#e5c168] font-cinzel font-black text-[8px] text-[#fff3c2]">
              #{q.orderIndex}
            </span>
            {q.isCompleted && (
              <span className="absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full bg-emerald-500 border border-white text-white text-[9px] font-black flex items-center justify-center shadow">
                ✓
              </span>
            )}
          </div>

          {/* 2. Bloco Central: Título + Barra de Progresso Gamificada */}
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <h4 className="font-cinzel font-black text-xs sm:text-sm text-[#2b1f14] truncate uppercase tracking-wide">
                {q.title}
              </h4>
            </div>

            {/* Barra de Progresso Estilo RPG com Contador Integrado */}
            <div className="relative h-4 w-full rounded-full bg-[#1e140c] border border-[#8c6518] p-0.5 overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${Math.max(q.isCompleted ? 100 : 10, pct)}%`,
                  background: q.isCompleted
                    ? 'linear-gradient(90deg, #16a34a 0%, #4ade80 100%)'
                    : 'linear-gradient(90deg, #0b3778 0%, #2563eb 50%, #e5c168 100%)',
                }}
              />
              <span className="absolute inset-0 flex items-center justify-center font-cinzel font-black text-[8.5px] text-[#fff3c2] drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                {doneCount} / {totalCount} ETAPAS
              </span>
            </div>
          </div>

          {/* 3. Slots Visuais de Recompensas (Loot Frames) */}
          <div className="hidden xs:flex items-center gap-1.5 shrink-0">
            {rewardSlots.map((slot, sIdx) => (
              <div
                key={`${q.id}-rew-${sIdx}`}
                className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex flex-col items-center justify-center relative shrink-0"
                style={{
                  background: slot.rarityBg,
                  border: '1.5px solid #e5c168',
                  boxShadow: '0 3px 8px rgba(0,8,22,0.45), inset 0 1px 1px rgba(255,243,194,0.35)',
                }}
                title={`${slot.label}: ${slot.badge}`}
              >
                <span className="text-base sm:text-lg leading-none drop-shadow">{slot.icon}</span>
                <span className="font-cinzel font-black text-[7.5px] text-[#fff3c2] leading-none mt-0.5">
                  {slot.badge}
                </span>
              </div>
            ))}
          </div>

          {/* 4. Botões Gamificados Rápidos: Pin de Mapa (📍) + Ação Direta */}
          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={(e) => handleToggleSelectQuestForMap(q, e)}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-transform active:scale-90 cursor-pointer ${
                q.isSelectedForMap ? 'scale-105' : 'opacity-85 hover:opacity-100'
              }`}
              style={{
                background: q.isSelectedForMap
                  ? 'linear-gradient(180deg, #16a34a 0%, #14532d 100%)'
                  : 'radial-gradient(circle at 50% 25%, #fcfaf5 0%, #e5dac5 100%)',
                border: '2px solid #c59638',
                boxShadow: '0 3px 8px rgba(0,8,22,0.45)',
              }}
              title={q.isSelectedForMap ? 'Rastreando no Mapa ✓' : 'Fixar no Mapa 📍'}
            >
              <span className="text-sm sm:text-base leading-none">
                {q.isSelectedForMap ? '🎯' : '📍'}
              </span>
            </button>

            {onUpdateProject && (
              <>
                {(q.isLocked || q.status === 'available') && (
                  <button
                    type="button"
                    onClick={() => handleChangeQuestStatus(q, 'active')}
                    className="btn-pearl-gold cursor-pointer active:scale-95"
                    title="Iniciar Missão"
                  >
                    <div className="btn-pearl-inner px-2.5 py-2 font-cinzel font-black text-[9px] text-[#2b1f14] uppercase">
                      INICIAR
                    </div>
                  </button>
                )}

                {!q.isLocked && !q.isCompleted && q.status === 'active' && (
                  <button
                    type="button"
                    onClick={() => handleChangeQuestStatus(q, 'completed')}
                    className="btn-royal-gold cursor-pointer active:scale-95"
                    title="Concluir e Resgatar Recompensas"
                  >
                    <div className="btn-royal-inner px-2.5 py-2 font-cinzel font-black text-[9px] text-[#fff3c2] uppercase flex items-center gap-1">
                      <span>🎁</span>
                      <span>RESGATAR</span>
                    </div>
                  </button>
                )}

                {q.isCompleted && (
                  <button
                    type="button"
                    onClick={() => handleChangeQuestStatus(q, 'active')}
                    className="w-9 h-9 rounded-xl pearl-pill flex items-center justify-center text-[#5c3d08] font-black text-xs cursor-pointer active:scale-90"
                    title="Repetir Missão"
                  >
                    ↺
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Expansão Visual Compacta dos Objetivos e Slots de Recompensa ao clicar */}
        {isSelected && (
          <div className="mt-3 pt-2.5 border-t border-[#c59638]/50 flex flex-col gap-2">
            {/* Slots de Recompensa Visíveis em Telas Pequenas + Chips de Objetivos */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {q.objectives.map((obj, oIdx) => (
                  <div
                    key={obj.id}
                    className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 text-[10px] font-bold ${
                      obj.completed
                        ? 'bg-emerald-950/15 border-emerald-600/60 text-emerald-900'
                        : 'pearl-subcard text-[#2b1f14]'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black ${
                        obj.completed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#0b3778] text-[#fff3c2] border border-[#e5c168]'
                      }`}
                    >
                      {obj.completed ? '✓' : oIdx + 1}
                    </span>
                    <span className="truncate max-w-[180px] sm:max-w-[260px]">{obj.title}</span>
                    <span className="px-1.5 py-0.2 rounded-full bg-[#2b1f14] text-[#fff3c2] font-cinzel font-black text-[8px]">
                      {obj.current}/{obj.required}
                    </span>
                  </div>
                ))}
              </div>

              {/* Slots de Loot sempre visíveis na expansão */}
              <div className="flex xs:hidden items-center gap-1.5">
                {rewardSlots.map((slot, sIdx) => (
                  <div
                    key={`${q.id}-mrew-${sIdx}`}
                    className="w-9 h-9 rounded-xl flex flex-col items-center justify-center"
                    style={{
                      background: slot.rarityBg,
                      border: '1.5px solid #e5c168',
                    }}
                  >
                    <span className="text-sm leading-none">{slot.icon}</span>
                    <span className="font-cinzel font-black text-[7px] text-[#fff3c2]">
                      {slot.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
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
          style={{ maxWidth: isLandscape ? '960px' : '480px' }}
        >
          {renderUnifiedTopSubTabs()}

          {/* Grade Visual de Cards Gamificados (2 colunas em Paisagem, 1 coluna em Retrato) */}
          <div className={isLandscape ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2.5'}>
            {currentList.map((q) => renderGamifiedQuestCard(q))}
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
          ? 'absolute inset-0 z-80 p-2.5 flex items-center justify-center bg-black/60 backdrop-blur-xs'
          : 'fixed inset-0 z-90 p-4 flex items-center justify-center bg-black/70 backdrop-blur-sm'
      } select-none`}
    >
      <div
        className={`w-full ${
          isInsideEmulator
            ? isLandscape
              ? 'max-w-[760px] h-[90%] max-h-[410px]'
              : 'max-w-[445px] h-[85%] max-h-[620px]'
            : isLandscape
            ? 'max-w-4xl h-[82vh] max-h-[540px]'
            : 'max-w-xl h-[85vh] max-h-[680px]'
        } pearl-surface flex flex-col overflow-hidden p-2.5 gap-2.5`}
        style={{
          borderRadius: '24px',
          border: '3px solid #c59638',
          outline: '2px solid #4a3006',
        }}
      >
        {renderUnifiedTopSubTabs()}

        <div className="flex-1 overflow-y-auto nova-scroll pr-0.5 space-y-2.5">
          {currentList.map((q) => renderGamifiedQuestCard(q))}
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
 * Silhueta prateada/cinza suave do Slime Herói fiel aos 4 concepts oficiais Pearl & Gold
 */
const HeroFrontSilhouetteSvg: React.FC<{ className?: string }> = ({ className = 'w-32 h-32' }) => (
  <svg viewBox="0 0 220 190" className={className}>
    <defs>
      <linearGradient id="slimeSilGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c5cad3" />
        <stop offset="65%" stopColor="#b4bac5" />
        <stop offset="100%" stopColor="#a3aab7" />
      </linearGradient>
    </defs>
    {/* Sombra suave na base */}
    <ellipse cx="110" cy="166" rx="82" ry="12" fill="rgba(160, 145, 120, 0.22)" />
    {/* Corpo orgânico de Slime dos concepts */}
    <path
      d="M110 32 C68 32, 46 62, 38 102 C33 125, 22 136, 24 149 C26 161, 48 164, 68 162 C86 160, 96 166, 110 166 C124 166, 134 160, 152 162 C172 164, 194 161, 196 149 C198 136, 187 125, 182 102 C174 62, 152 32, 110 32 Z"
      fill="url(#slimeSilGrad)"
      stroke="#d8dce3"
      strokeWidth="2"
    />
  </svg>
);

const DEMO_SEED_ITEM_IDS = new Set([
  'inv_item_1',
  'inv_item_2',
  'inv_item_3',
  'inv_item_4',
  'inv_item_5',
  'def_sword_starter',
  'def_shield_oak',
  'def_potion_hp',
  'def_key_gold',
  'def_apple_fresh',
  'item-sword-starter',
  'item-shield-starter',
  'item-potion-health',
  'item-key-bronze',
  'item-apple-mystic',
  'item-wood-oak',
  'item-herb-emerald',
  'item-crystal-mana',
]);

const DEMO_SEED_PET_IDS = new Set([
  'pet-drake-solar',
  'pet-fox-mystic',
  'pet-wolf-frost',
  'pet-pixie-light',
  'pet-tiger-thunder',
  'pet-slime-royal',
]);

import { useBackpackScreenState } from '../../../../ui/screens/backpack_shared/useBackpackScreenState';
import { MobileBackpackTopBar } from '../../../../ui/screens/backpack_mobile/MobileBackpackTopBar';
import { MobileMochilaScreen } from '../../../../ui/screens/backpack_mobile/MobileMochilaScreen';
import { MobileDeckScreen } from '../../../../ui/screens/backpack_mobile/MobileDeckScreen';
import { MobileJornadaTarefasScreen } from '../../../../ui/screens/backpack_mobile/MobileJornadaTarefasScreen';
import { LandscapeBackpackTopBar } from '../../../../ui/screens_landscape/backpack_landscape/LandscapeBackpackTopBar';
import { LandscapeMochilaScreen } from '../../../../ui/screens_landscape/backpack_landscape/LandscapeMochilaScreen';
import { LandscapeDeckScreen } from '../../../../ui/screens_landscape/backpack_landscape/LandscapeDeckScreen';
import { LandscapeJornadaTarefasScreen } from '../../../../ui/screens_landscape/backpack_landscape/LandscapeJornadaTarefasScreen';

export const GameBackpackPopupModal: React.FC<{
  project: MapProject;
  initialFolderTab?: 'equipamento' | 'inventario_geral' | 'deck' | 'jornada' | 'tarefas';
  mapCollectedInventory?: Record<string, number>;
  onClose: () => void;
  onSwitchToQuests?: (tab?: 'jornada' | 'tarefas') => void;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
  onDropItemToMap?: (item: UnifiedBackpackSlotItem) => void;
  isInsideEmulator?: boolean;
  isLandscape?: boolean;
  isHubFullScreen?: boolean;
}> = ({
  project,
  initialFolderTab = 'equipamento',
  mapCollectedInventory = {},
  onClose,
  onUpdateProject,
  onDropItemToMap,
  isInsideEmulator = true,
  isLandscape = false,
  isHubFullScreen = false,
}) => {
  const state = useBackpackScreenState({
    project,
    initialFolderTab,
    mapCollectedInventory,
    onUpdateProject,
    onDropItemToMap,
    onClose,
  });

  if (isLandscape) {
    return (
      <div
        className={`${
          isHubFullScreen
            ? 'relative w-full h-full flex flex-col overflow-y-auto overflow-x-hidden select-none'
            : isInsideEmulator
              ? 'absolute inset-0 z-[80]'
              : 'fixed inset-0 z-[260]'
        } flex flex-col select-none animate-fade-in`}
        style={{
          background: isHubFullScreen
            ? 'radial-gradient(ellipse at top, #0a2558 0%, #04122c 65%, #020a1a 100%)'
            : 'rgba(4, 14, 34, 0.85)',
          backdropFilter: isHubFullScreen ? 'none' : 'blur(6px)',
          padding: isHubFullScreen ? '12px 18px' : '10px',
          fontFamily: "'Fredoka', 'Nunito', sans-serif",
          gap: '8px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            borderRadius: '24px',
            padding: '8px',
            background: 'linear-gradient(180deg, #fffdf9 0%, #f5ebd6 100%)',
            border: '3px solid #d4af37',
            outline: '1.5px solid #784808',
            boxShadow:
              '0 0 24px rgba(212, 175, 55, 0.25), 0 12px 30px rgba(0, 6, 18, 0.65), inset 0 1px 0 #ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            minHeight: 0,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <LandscapeBackpackTopBar state={state} isHubFullScreen={isHubFullScreen} />
          {state.topFolderTab === 'deck' ? (
            <LandscapeDeckScreen state={state} />
          ) : state.topFolderTab === 'jornada' || state.topFolderTab === 'tarefas' ? (
            <LandscapeJornadaTarefasScreen state={state} questTab={state.topFolderTab} />
          ) : (
            <LandscapeMochilaScreen state={state} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`${
        isHubFullScreen
          ? 'relative w-full h-full flex flex-col overflow-y-auto overflow-x-hidden select-none'
          : isInsideEmulator
            ? 'absolute inset-0 z-[80]'
            : 'fixed inset-0 z-[260]'
      } flex flex-col select-none animate-fade-in`}
      style={{
        background: isHubFullScreen
          ? 'radial-gradient(ellipse at top, #0a2558 0%, #04122c 65%, #020a1a 100%)'
          : 'rgba(4, 14, 34, 0.85)',
        backdropFilter: isHubFullScreen ? 'none' : 'blur(6px)',
        padding: '8px 8px 20px 8px',
        fontFamily: "'Fredoka', 'Nunito', sans-serif",
        gap: '6px',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <MobileBackpackTopBar state={state} isHubFullScreen={isHubFullScreen} />
      {state.topFolderTab === 'deck' ? (
        <MobileDeckScreen state={state} />
      ) : state.topFolderTab === 'jornada' || state.topFolderTab === 'tarefas' ? (
        <MobileJornadaTarefasScreen state={state} questTab={state.topFolderTab} />
      ) : (
        <MobileMochilaScreen state={state} />
      )}
    </div>
  );
};

const _LegacyUnusedBackpackModal: React.FC<{
  project: MapProject;
  initialFolderTab?: 'equipamento' | 'inventario_geral' | 'deck' | 'jornada' | 'tarefas';
  mapCollectedInventory?: Record<string, number>;
  onClose: () => void;
  onSwitchToQuests?: (tab?: 'jornada' | 'tarefas') => void;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
  onDropItemToMap?: (item: UnifiedBackpackSlotItem) => void;
  isInsideEmulator?: boolean;
  isLandscape?: boolean;
  isHubFullScreen?: boolean;
}> = ({
  project,
  initialFolderTab = 'equipamento',
  mapCollectedInventory = {},
  onClose,
  onUpdateProject,
  onDropItemToMap,
  isInsideEmulator = true,
  isLandscape = false,
  isHubFullScreen = false,
}) => {
  // Abas Superiores Unificadas dentro da mesma moldura (nunca muda a barra do topo!)
  const [topFolderTab, setTopFolderTab] = useState<'equipamento' | 'deck' | 'jornada' | 'tarefas'>(
    initialFolderTab === 'inventario_geral' ? 'equipamento' : initialFolderTab
  );

  useEffect(() => {
    if (initialFolderTab) {
      setTopFolderTab(initialFolderTab === 'inventario_geral' ? 'equipamento' : initialFolderTab);
    }
  }, [initialFolderTab]);

  const [activeCategory, setActiveCategory] = useState<
    'todos' | 'pets' | 'item_pet' | 'equipaveis' | 'artefatos' | 'consumiveis' | 'livros' | 'outros'
  >('todos');

  const [selectDropMode, setSelectDropMode] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [cardRarityFilter, setCardRarityFilter] = useState<string>('all');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  const resolvedPetConfig = useMemo(
    () => getResolvedPlayerPetConfig(project.player),
    [project.player]
  );

  // Filtra apenas Pets reais criados/capturados pelo usuário (zero pets fakes simulados)
  const realPetGallery = useMemo(() => {
    const rawGallery = project.player?.petConfig?.petGallery || [];
    return rawGallery.filter((p) => !DEMO_SEED_PET_IDS.has(p.id));
  }, [project.player?.petConfig?.petGallery]);

  const realEquippedPets = useMemo(() => {
    const rawEq = project.player?.petConfig?.equippedPetIds || [null, null, null];
    return [0, 1, 2].map((idx) => {
      const pid = rawEq[idx];
      if (!pid || DEMO_SEED_PET_IDS.has(pid)) return null;
      return realPetGallery.find((p) => p.id === pid) || null;
    });
  }, [project.player?.petConfig?.equippedPetIds, realPetGallery]);

  const [targetPetSlotIdx, setTargetPetSlotIdx] = useState<number>(0);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  // Slots de equipamento começam limpos: CABEÇA ('head'), TRAJE ('armor'), ARTEFATOS ('accessory' / 'boots')
  const [equippedBySlot, setEquippedBySlot] = useState<Record<EquipmentSlotKey, string | null>>({
    head: null,
    armor: null,
    boots: null,
    pet1: null,
    pet2: null,
    pet3: null,
    accessory: null,
    pet: null,
    weapon: null,
  });

  const equipPetInSlot = (petId: string | null, slotIdx: number, summonImmediately = true) => {
    const clampedIdx = Math.max(0, Math.min(2, slotIdx));
    const currentRaw = project.player?.petConfig?.equippedPetIds || [null, null, null];
    const nextEquippedIds: (string | null)[] = [
      currentRaw[0] && !DEMO_SEED_PET_IDS.has(currentRaw[0]) ? currentRaw[0] : null,
      currentRaw[1] && !DEMO_SEED_PET_IDS.has(currentRaw[1]) ? currentRaw[1] : null,
      currentRaw[2] && !DEMO_SEED_PET_IDS.has(currentRaw[2]) ? currentRaw[2] : null,
    ];
    if (petId) {
      const existingIdx = nextEquippedIds.findIndex((id, i) => id === petId && i !== clampedIdx);
      if (existingIdx >= 0) {
        nextEquippedIds[existingIdx] = nextEquippedIds[clampedIdx];
      }
    }
    nextEquippedIds[clampedIdx] = petId;

    const nextActiveSlot = summonImmediately ? clampedIdx : targetPetSlotIdx;
    const nextActivePetId = nextEquippedIds[nextActiveSlot] || nextEquippedIds.find(Boolean) || null;
    const catalogPet = nextActivePetId
      ? realPetGallery.find((p) => p.id === nextActivePetId)
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
                }
              : {}),
            petGallery: realPetGallery,
          },
        },
      });
    }
  };

  const [removedIds, setRemovedIds] = useState<Record<string, number>>({});
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [balloonExpandedLore, setBalloonExpandedLore] = useState<boolean>(false);
  const [activeEquipSlotFilter, setActiveEquipSlotFilter] = useState<EquipmentSlotKey | null>(null);
  const [bookPageIndex, setBookPageIndex] = useState(0);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const itemsScrollRef = React.useRef<HTMLDivElement | null>(null);
  const cardsScrollRef = React.useRef<HTMLDivElement | null>(null);
  const catScrollRef = React.useRef<HTMLDivElement | null>(null);

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Somente exibe sprite customizado se não for o SVG procedural fake do Aurelius
  const customHeroSpritePng = useMemo(() => {
    const raw = project.player?.avatarDownPng || project.player?.avatarPng || '';
    if (!raw || raw.startsWith('data:image/svg+xml')) return '';
    return raw;
  }, [project.player?.avatarDownPng, project.player?.avatarPng]);

  const heroDisplayName = useMemo(() => {
    const rawName = project.player?.name?.trim() || '';
    if (!rawName || rawName.toLowerCase().includes('aurelius')) {
      return 'NOME DO HERÓI';
    }
    return rawName.toUpperCase();
  }, [project.player?.name]);

  // Apenas itens reais criados pelo usuário ou coletados em jogo (sem itens fakes/simulados)
  const allUnifiedItems = useMemo<UnifiedBackpackSlotItem[]>(() => {
    const list: UnifiedBackpackSlotItem[] = [];

    for (const pItem of project.playerInventory?.items || []) {
      if (
        DEMO_SEED_ITEM_IDS.has(pItem.id) ||
        (pItem.definitionId && DEMO_SEED_ITEM_IDS.has(pItem.definitionId))
      ) {
        continue;
      }

      const catRaw = (pItem.category || pItem.type || '').toLowerCase();
      let category: UnifiedBackpackSlotItem['category'] = 'outros';
      let equipSlot: EquipmentSlotKey | undefined = undefined;

      const catalogDef = (project.itemCatalog || []).find(
        (c) =>
          c.id === pItem.definitionId ||
          c.id === pItem.id ||
          c.name.toLowerCase() === pItem.name.toLowerCase()
      );
      const motionTag = pItem.motionLayerTag || catalogDef?.motionLayerTag || '';
      const allTags = [
        ...(pItem.stateTags || []),
        ...(catalogDef?.stateTags || []),
        motionTag,
        catRaw,
      ]
        .join(' ')
        .toLowerCase();

      const isMotionItem =
        Boolean(motionTag) ||
        (pItem.stateTags || []).includes('motion_item') ||
        (catalogDef?.stateTags || []).includes('motion_item');

      const isArtifactItem =
        allTags.includes('artefato') ||
        allTags.includes('artifact') ||
        allTags.includes('relic') ||
        allTags.includes('reliquia') ||
        allTags.includes('accessory') ||
        allTags.includes('amulet') ||
        allTags.includes('ring') ||
        pItem.motionEquipSlot === 'accessory' ||
        pItem.motionEquipSlot === 'boots' ||
        catalogDef?.motionEquipSlot === 'accessory' ||
        catalogDef?.motionEquipSlot === 'boots';

      if (catRaw.includes('item_pet') || catRaw.includes('pet')) {
        category = 'item_pet';
      } else if (isArtifactItem) {
        category = 'equipaveis';
        equipSlot = 'accessory';
      } else if (
        isMotionItem ||
        catRaw.includes('equip') ||
        catRaw.includes('weapon') ||
        catRaw.includes('armor')
      ) {
        category = 'equipaveis';
        const mSlot = pItem.motionEquipSlot || catalogDef?.motionEquipSlot;
        if (mSlot === 'head' || catRaw.includes('helm') || catRaw.includes('head')) {
          equipSlot = 'head';
        } else if (mSlot === 'skin' || mSlot === 'armor' || catRaw.includes('armor')) {
          equipSlot = 'armor';
        } else {
          equipSlot = 'accessory';
        }
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
        iconEmoji: pItem.iconEmoji || '📦',
        iconPng: pItem.iconPng || catalogDef?.iconPng,
        quantity: finalQty,
        category,
        equipSlot,
        rarity: pItem.rarity || catalogDef?.rarity || 'common',
        shortDescription:
          pItem.description || catalogDef?.shortDescription || 'Item do inventário.',
        detailedLore:
          pItem.detailedDescription ||
          catalogDef?.detailedDescription ||
          pItem.description ||
          'Artefato catalogado na mochila.',
        statsText:
          [
            motionTag ? `🎬 #${motionTag}` : '',
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
        motionLayerTag: motionTag || undefined,
      });
    }

    for (const [resName, qty] of Object.entries(mapCollectedInventory)) {
      const rem = removedIds[`map-${resName}`] || 0;
      const finalQty = Math.max(0, qty - rem);
      if (finalQty <= 0) continue;
      list.push({
        id: `map-${resName}`,
        name: resName,
        iconEmoji: '💎',
        quantity: finalQty,
        category: 'outros',
        equipSlot: 'accessory',
        rarity: 'uncommon',
        shortDescription: `Coletado na fase (×${finalQty}).`,
        detailedLore: `Recurso autêntico recolhido durante a exploração.`,
        statsText: `Quantidade: ×${finalQty}`,
        sourceKind: 'map_resource',
      });
    }

    for (const pet of realPetGallery) {
      const slotItemId = `bp-pet-${pet.id}`;
      const rem = removedIds[slotItemId] || 0;
      if (rem >= 1) continue;
      const petLv = pet.level ?? 1;
      const petHp = pet.hp ?? pet.maxHp ?? 140;
      const petMaxHp = pet.maxHp ?? 140;
      list.push({
        id: slotItemId,
        petId: pet.id,
        name: `${pet.name}`,
        iconEmoji: pet.iconEmoji || '🐾',
        iconPng: pet.avatarPng,
        quantity: 1,
        category: 'pets',
        equipSlot: 'pet',
        rarity: pet.rarity || 'epic',
        shortDescription: pet.shortDescription || 'Pet Companheiro.',
        detailedLore: pet.detailedLore || 'Companheiro da galeria de pets.',
        statsText: `Nv.${petLv} • PV ${petHp}/${petMaxHp} • ATQ ${pet.attackDamage}`,
        sourceKind: 'pet_gallery',
      });
    }

    return list;
  }, [project.playerInventory?.items, project.itemCatalog, mapCollectedInventory, removedIds, realPetGallery]);

  const filteredItems = useMemo(() => {
    return allUnifiedItems.filter((item) => {
      if (activeEquipSlotFilter && item.equipSlot !== activeEquipSlotFilter) {
        return false;
      }
      if (activeCategory === 'todos') return true;
      if (activeCategory === 'artefatos') {
        return item.equipSlot === 'accessory' || item.equipSlot === 'boots' || item.category === 'outros';
      }
      if (activeCategory === 'equipaveis') {
        return item.category === 'equipaveis' || item.category === 'pets';
      }
      return item.category === activeCategory;
    });
  }, [allUnifiedItems, activeCategory, activeEquipSlotFilter]);

  // GRADE DE 5 ITENS POR LINHA NA MOCHILA (5 colunas exatas!)
  const GRID_COLS = 5;
  const totalSlotsCount = 25;

  const selectedItem: UnifiedBackpackSlotItem | null =
    selectedSlotIndex !== null ? filteredItems[selectedSlotIndex] || null : null;

  const isSelectedItemEquipped = useMemo(() => {
    if (!selectedItem) return false;
    if (selectedItem.motionLayerTag) {
      const eqTags = (project.player?.equippedMotionTags || []).map((t) => t.toLowerCase());
      if (eqTags.includes(selectedItem.motionLayerTag.toLowerCase())) return true;
    }
    return Object.values(equippedBySlot).includes(selectedItem.id);
  }, [selectedItem, equippedBySlot, project.player?.equippedMotionTags]);

  const handlePrimaryEquipOrUse = (targetOverride?: UnifiedBackpackSlotItem | null) => {
    const item = targetOverride ?? selectedItem;
    if (!item) {
      triggerToast('Selecione um slot com item primeiro!');
      return;
    }

    if (item.category === 'pets' || item.equipSlot === 'pet') {
      const targetPetId = item.petId || item.id.replace(/^bp-pet-/, '');
      const existingSlotIdx = realEquippedPets.findIndex((p) => p?.id === targetPetId);
      if (existingSlotIdx === targetPetSlotIdx) {
        equipPetInSlot(null, targetPetSlotIdx, false);
        triggerToast(`Removido do Slot P${targetPetSlotIdx + 1}: ${item.name}`);
      } else {
        equipPetInSlot(targetPetId, targetPetSlotIdx, true);
        triggerToast(`Equipado em P${targetPetSlotIdx + 1}: ${item.name}`);
      }
      return;
    }

    if (item.category === 'equipaveis' || item.equipSlot) {
      const targetSlot: EquipmentSlotKey = item.equipSlot || 'accessory';
      const currentlyEquippedId = equippedBySlot[targetSlot];
      const shouldUnequip = currentlyEquippedId === item.id;
      setEquippedBySlot((prev) => ({
        ...prev,
        [targetSlot]: shouldUnequip ? null : item.id,
      }));
      triggerToast(shouldUnequip ? `Desequipado: ${item.name}` : `Equipado: ${item.name}`);
      return;
    }

    if (item.category === 'item_pet' || item.category === 'consumiveis') {
      setRemovedIds((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] || 0) + 1,
      }));
      triggerToast(`Usou ${item.name}!`);
      return;
    }

    setBalloonExpandedLore((v) => !v);
  };

  const handleDropSelectedItem = (itemToDrop?: UnifiedBackpackSlotItem | null) => {
    const target = itemToDrop ?? selectedItem;
    if (!target) {
      triggerToast('Selecione um item para soltar!');
      return;
    }
    setRemovedIds((prev) => ({
      ...prev,
      [target.id]: (prev[target.id] || 0) + 1,
    }));
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
    triggerToast(`Soltou 1x ${target.name}`);
  };

  // Cartas filtradas na aba DECK
  const filteredDeckCards = useMemo(() => {
    return realPetGallery.filter((c) => {
      if (cardRarityFilter !== 'all' && (c.rarity || 'common') !== cardRarityFilter) {
        return false;
      }
      if (
        cardSearchQuery.trim() &&
        !c.name.toLowerCase().includes(cardSearchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [realPetGallery, cardRarityFilter, cardSearchQuery]);

  const selectedDeckCard =
    selectedCardIdx !== null ? filteredDeckCards[selectedCardIdx] || null : null;

  // Quests para quando o usuário clicar em JORNADA ou TAREFAS (sem trocar de tela/header!)
  const { jornada: jornadaQuests, tarefas: tarefasQuests } = useMemo(
    () => getOrderedPhaseQuests(project, true),
    [project]
  );

  // Ícones SVG fiéis aos 4 Concepts
  const ConceptStar = ({ size = 12 }: { size?: number }) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ flexShrink: 0, display: 'inline-block', filter: 'drop-shadow(0 1px 1px rgba(120,70,10,0.3))' }}
    >
      <path
        d="M12 1 L14.8 9.2 L23 12 L14.8 14.8 L12 23 L9.2 14.8 L1 12 L9.2 9.2 Z"
        fill="#f59e0b"
        stroke="#92400e"
        strokeWidth="1.5"
      />
    </svg>
  );

  const ConceptGoldCoinSvg = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id="cGold" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>
      </defs>
      <circle cx="16" cy="16" r="14" fill="url(#cGold)" stroke="#78350f" strokeWidth="2" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="#fde68a" strokeWidth="1.2" />
      <path d="M16 9 L16 23 M13 12 L19 12 M13 20 L19 20" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  const ConceptBlueGemSvg = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
      <defs>
        <linearGradient id="cGem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="50%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
      </defs>
      <polygon
        points="16,2 27,9 27,23 16,30 5,23 5,9"
        fill="url(#cGem)"
        stroke="#172554"
        strokeWidth="1.8"
      />
      <polygon points="16,6 23,11 23,21 16,26 9,21 9,11" fill="#93c5fd" fillOpacity="0.35" />
    </svg>
  );

  const ConceptLeatherBagSvg = ({ size = 20 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
      <defs>
        <radialGradient id="cBag" cx="40%" cy="35%" r="70%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="65%" stopColor="#78350f" />
          <stop offset="100%" stopColor="#451a03" />
        </radialGradient>
      </defs>
      <path
        d="M11 8 C11 5, 21 5, 21 8 L25 14 C27 19, 26 27, 20 28 L12 28 C6 27, 5 19, 7 14 Z"
        fill="url(#cBag)"
        stroke="#271202"
        strokeWidth="1.8"
      />
      <path d="M10 11 L22 11" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
      <rect x="14" y="15" width="4" height="5" rx="1" fill="#f59e0b" />
    </svg>
  );

  // Cabeçalho de Seção com linhas douradas e estrelas (ex: ─── ✦ EQUIPAMENTO ✦ ───)
  const renderSectionTitle = (title: string, compact = false) => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: compact ? '5px' : '8px',
        width: '100%',
        marginBottom: compact ? '4px' : '6px',
        minWidth: 0,
      }}
    >
      <div
        style={{
          flex: 1,
          height: '1.5px',
          maxWidth: compact ? '40px' : '95px',
          background: 'linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(212,175,55,0.85) 100%)',
        }}
      />
      <ConceptStar size={compact ? 10 : 12} />
      <span
        style={{
          fontFamily: "'Cinzel', serif",
          fontWeight: 900,
          fontSize: compact ? '10.5px' : isLandscape ? '13px' : '12.5px',
          letterSpacing: compact ? '0.05em' : '0.1em',
          color: '#0f172a',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {title}
      </span>
      <ConceptStar size={compact ? 10 : 12} />
      <div
        style={{
          flex: 1,
          height: '1.5px',
          maxWidth: compact ? '40px' : '95px',
          background: 'linear-gradient(90deg, rgba(212,175,55,0.85) 0%, rgba(212,175,55,0) 100%)',
        }}
      />
    </div>
  );

  // ============================================================================
  // BALÃO ADAPTATIVO ACIMA OU ABAIXO DO ITEM EM DESTAQUE NA GRADE DE 5 COLUNAS
  // ============================================================================
  const renderAdaptiveItemBalloon = (slotIndex: number) => {
    const row = Math.floor(slotIndex / GRID_COLS);
    const col = slotIndex % GRID_COLS;
    const placeBelow = row < 2; // Linhas 0 e 1 abrem ABAIXO; linhas 2+ abrem ACIMA
    const arrowLeftPercent = col * 20 + 10; // Centro da coluna (10%, 30%, 50%, 70%, 90%)
    const item = filteredItems[slotIndex] || null;

    return (
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          gridColumn: '1 / -1',
          position: 'relative',
          zIndex: 35,
          margin: '4px 0',
          width: '100%',
          minWidth: 0,
        }}
      >
        {placeBelow && (
          <div
            style={{
              width: '14px',
              height: '14px',
              transform: 'rotate(45deg)',
              marginBottom: '-8px',
              marginLeft: `calc(${arrowLeftPercent}% - 7px)`,
              background: '#fdfaf3',
              borderLeft: '2px solid #d4af37',
              borderTop: '2px solid #d4af37',
              position: 'relative',
              zIndex: 10,
            }}
          />
        )}

        <div
          style={{
            borderRadius: '16px',
            padding: '10px 12px',
            background: 'linear-gradient(180deg, #fdfbf7 0%, #f3ead8 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #785212',
            boxShadow: '0 10px 24px rgba(15, 23, 42, 0.25), inset 0 1px 0 #ffffff',
            position: 'relative',
            zIndex: 20,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '9999px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                  border: '2px solid #d4af37',
                }}
              >
                {item ? (
                  item.iconPng ? (
                    <img src={item.iconPng} alt={item.name} style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
                  ) : (
                    <span style={{ fontSize: '18px' }}>{item.iconEmoji}</span>
                  )
                ) : (
                  <span style={{ color: '#64748b', fontSize: '20px', fontWeight: 300 }}>+</span>
                )}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 900,
                    fontSize: '11px',
                    color: '#0f172a',
                    textTransform: 'uppercase',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item ? item.name : `SLOT #${slotIndex + 1} VAZIO`}
                </div>
                <div
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 700,
                    fontSize: '9px',
                    color: '#475569',
                    textTransform: 'uppercase',
                  }}
                >
                  {item
                    ? `${item.equipSlot === 'accessory' ? 'ARTEFATO' : item.category.toUpperCase()} • QTD: ×${item.quantity}`
                    : 'CATEGORIA: LIVRE • QTD: 0'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedSlotIndex(null);
                setBalloonExpandedLore(false);
              }}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '9999px',
                border: '1px solid #d4af37',
                background: '#ffffff',
                color: '#0f172a',
                fontSize: '11px',
                fontWeight: 900,
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              marginTop: '6px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(212,175,55,0.4)',
              fontSize: '10px',
              color: '#334155',
              lineHeight: 1.35,
            }}
          >
            {item ? (
              <>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>
                  {item.statsText || item.shortDescription}
                </div>
                {balloonExpandedLore && (
                  <div style={{ marginTop: '4px', color: '#475569' }}>{item.detailedLore}</div>
                )}
              </>
            ) : (
              <span style={{ color: '#64748b' }}>
                Slot disponível. Itens coletados em fases ou criados no Editor de Inventário / Motion Canvas aparecem aqui.
              </span>
            )}
          </div>

          <div
            style={{
              marginTop: '8px',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
              gap: '6px',
            }}
          >
            <button
              type="button"
              onClick={() => handlePrimaryEquipOrUse(item)}
              style={{
                padding: '6px 4px',
                borderRadius: '10px',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '8.5px',
                textTransform: 'uppercase',
                color: '#ffffff',
                background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                border: '1.5px solid #d4af37',
                cursor: 'pointer',
              }}
            >
              {isSelectedItemEquipped ? 'DESEQUIPAR' : 'EQUIPAR / USAR'}
            </button>
            <button
              type="button"
              onClick={() => {
                setBookPageIndex(0);
                setBalloonExpandedLore((v) => !v);
              }}
              style={{
                padding: '6px 4px',
                borderRadius: '10px',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '8.5px',
                textTransform: 'uppercase',
                color: '#0f172a',
                background: 'linear-gradient(180deg, #fdfbf7 0%, #e9dec8 100%)',
                border: '1.5px solid #c59638',
                cursor: 'pointer',
              }}
            >
              {balloonExpandedLore ? 'OCULTAR' : 'SABER MAIS'}
            </button>
            <button
              type="button"
              onClick={() => handleDropSelectedItem(item)}
              style={{
                padding: '6px 4px',
                borderRadius: '10px',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '8.5px',
                textTransform: 'uppercase',
                color: '#0f172a',
                background: 'linear-gradient(180deg, #fdfbf7 0%, #e9dec8 100%)',
                border: '1.5px solid #c59638',
                cursor: 'pointer',
              }}
            >
              SOLTAR 1x
            </button>
          </div>
        </div>

        {!placeBelow && (
          <div
            style={{
              width: '14px',
              height: '14px',
              transform: 'rotate(45deg)',
              marginTop: '-8px',
              marginLeft: `calc(${arrowLeftPercent}% - 7px)`,
              background: '#f3ead8',
              borderRight: '2px solid #d4af37',
              borderBottom: '2px solid #d4af37',
              position: 'relative',
              zIndex: 30,
            }}
          />
        )}
      </div>
    );
  };

  // ============================================================================
  // SUB-COMPONENTE COMPARTILHADO: SEÇÃO EQUIPAMENTO (CABEÇA, TRAJE, ARTEFATOS + SLIME + P1/P2/P3)
  // ============================================================================
  const renderEquipmentCard = (compactMobile: boolean) => {
    const leftSlots: { key: EquipmentSlotKey; label: string }[] = [
      { key: 'head', label: 'CABEÇA' },
      { key: 'armor', label: 'TRAJE' },
      { key: 'accessory', label: 'ARTEFATOS' },
    ];

    return (
      <div
        style={{
          borderRadius: '18px',
          padding: compactMobile ? '6px 8px 8px' : '10px 14px 12px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          flexShrink: 0,
          height: compactMobile ? 'auto' : '100%',
        }}
      >
        {renderSectionTitle('EQUIPAMENTO', compactMobile)}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: compactMobile ? '23% 41% 36%' : '24% 41% 35%',
            alignItems: 'center',
            gap: compactMobile ? '4px' : '8px',
            width: '100%',
            minWidth: 0,
            flex: 1,
          }}
        >
          {/* ESQUERDA: CABEÇA, TRAJE, ARTEFATOS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: compactMobile ? '4px' : '7px', minWidth: 0 }}>
            {leftSlots.map((s) => {
              const eqId = equippedBySlot[s.key];
              const eqItem = allUnifiedItems.find((i) => i.id === eqId) || null;
              const isFiltered = activeEquipSlotFilter === s.key;
              return (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setActiveEquipSlotFilter((prev) => (prev === s.key ? null : s.key));
                    setActiveCategory(s.key === 'accessory' ? 'artefatos' : 'equipaveis');
                  }}
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    padding: compactMobile ? '3px 2px' : '7px 4px',
                    background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                    border: isFiltered ? '2px solid #d4af37' : '1.5px solid #e2d3b8',
                    boxShadow: 'inset 0 1px 0 #ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: compactMobile ? '32px' : '46px',
                      height: compactMobile ? '32px' : '46px',
                      borderRadius: '9999px',
                      background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                      border: eqItem ? '2px solid #f59e0b' : '1.5px solid #d5d9e0',
                      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {eqItem ? (
                      eqItem.iconPng ? (
                        <img
                          src={eqItem.iconPng}
                          alt={eqItem.name}
                          style={{ width: compactMobile ? '20px' : '26px', height: compactMobile ? '20px' : '26px', objectFit: 'contain' }}
                        />
                      ) : (
                        <span style={{ fontSize: compactMobile ? '14px' : '17px' }}>{eqItem.iconEmoji}</span>
                      )
                    ) : (
                      <span style={{ color: '#7c8390', fontSize: compactMobile ? '17px' : '22px', fontWeight: 300, lineHeight: 1 }}>+</span>
                    )}
                  </div>
                  <span
                    style={{
                      marginTop: '2px',
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 900,
                      fontSize: compactMobile ? '7px' : '8.5px',
                      color: '#0f172a',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      maxWidth: '100%',
                    }}
                  >
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* CENTRO: ALTAR EM ARCO COM SLIME + PLACA NOME DO HERÓI / NÍVEL */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-end',
              minWidth: 0,
              padding: '0 2px',
            }}
          >
            <div
              style={{
                width: '100%',
                height: compactMobile ? '118px' : '185px',
                borderRadius: '999px 999px 18px 18px',
                background: 'radial-gradient(circle at 50% 42%, #fdfbf7 0%, #f4ead7 72%, #eadbc0 100%)',
                border: '2px solid #dfbe78',
                boxShadow: 'inset 0 4px 14px rgba(180,140,60,0.16), 0 4px 10px rgba(120,85,25,0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: compactMobile ? '6px 4px 14px' : '10px 6px 20px',
              }}
            >
              {customHeroSpritePng ? (
                <img
                  src={customHeroSpritePng}
                  alt={heroDisplayName}
                  style={{ width: compactMobile ? '74px' : '112px', height: compactMobile ? '74px' : '112px', objectFit: 'contain' }}
                />
              ) : (
                <HeroFrontSilhouetteSvg className={compactMobile ? 'w-18 h-16' : 'w-28 h-26'} />
              )}
            </div>

            <div
              style={{
                marginTop: compactMobile ? '-14px' : '-18px',
                zIndex: 10,
                width: '94%',
                padding: compactMobile ? '3px 5px' : '5px 10px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #fdfbf7 0%, #f4ead6 100%)',
                border: '1.5px solid #d4af37',
                boxShadow: '0 3px 8px rgba(120,85,25,0.14), inset 0 1px 0 #ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: compactMobile ? '8px' : '10px',
                  color: '#0f172a',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  maxWidth: '100%',
                }}
              >
                {heroDisplayName}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                <span style={{ width: '10px', height: '1px', background: '#d4af37' }} />
                <ConceptStar size={6} />
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 800,
                    fontSize: compactMobile ? '6.5px' : '8px',
                    color: '#334155',
                    textTransform: 'uppercase',
                  }}
                >
                  NÍVEL
                </span>
                <ConceptStar size={6} />
                <span style={{ width: '10px', height: '1px', background: '#d4af37' }} />
              </div>
            </div>
          </div>

          {/* DIREITA: P1 ATIVO, P2, P3 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: compactMobile ? '2px' : '4px', minWidth: 0, paddingRight: '2px' }}>
            {([0, 1, 2] as const).map((slotIdx) => {
              const pet = realEquippedPets[slotIdx];
              const isTarget = targetPetSlotIdx === slotIdx;
              const isActiveBadge = slotIdx === 0 || (pet && resolvedPetConfig.activePetId === pet.id);
              return (
                <React.Fragment key={`eq-pet-${slotIdx}`}>
                  {slotIdx > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', margin: '-3px 0', zIndex: 5 }}>
                      <ConceptStar size={8} />
                    </div>
                  )}
                  <div
                    onClick={() => {
                      setTargetPetSlotIdx(slotIdx);
                      if (pet) equipPetInSlot(pet.id, slotIdx, true);
                    }}
                    style={{
                      width: '100%',
                      borderRadius: '12px',
                      padding: compactMobile ? '3px 5px' : '6px 8px',
                      background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                      border: isTarget ? '2px solid #d4af37' : '1.5px solid #e2d3b8',
                      boxShadow: 'inset 0 1px 0 #ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: compactMobile ? '4px' : '7px',
                      cursor: 'pointer',
                      minWidth: 0,
                    }}
                  >
                    <div
                      style={{
                        width: compactMobile ? '26px' : '38px',
                        height: compactMobile ? '32px' : '46px',
                        borderRadius: '8px',
                        background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                        border: '1.5px solid #d5d9e0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {pet ? (
                        <span style={{ fontSize: compactMobile ? '13px' : '15px' }}>{pet.iconEmoji || '🐾'}</span>
                      ) : (
                        <span style={{ color: '#7c8390', fontSize: compactMobile ? '15px' : '18px', fontWeight: 300 }}>+</span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2px' }}>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: compactMobile ? '8.5px' : '10.5px',
                            color: '#0f172a',
                          }}
                        >
                          P{slotIdx + 1}
                        </span>
                        {isActiveBadge && (
                          <span
                            style={{
                              padding: '1px 4px',
                              borderRadius: '9999px',
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 900,
                              fontSize: compactMobile ? '6px' : '7px',
                              color: '#ffffff',
                              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                              border: '1px solid #d4af37',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ATIVO
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 800,
                            fontSize: compactMobile ? '6px' : '7.5px',
                            color: '#1e293b',
                            width: compactMobile ? '22px' : '28px',
                            flexShrink: 0,
                          }}
                        >
                          NÍVEL
                        </span>
                        <div
                          style={{
                            flex: 1,
                            minWidth: '16px',
                            height: compactMobile ? '5px' : '6px',
                            borderRadius: '9999px',
                            background: '#c6cbd4',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px', minWidth: 0 }}>
                        <span
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 800,
                            fontSize: compactMobile ? '6px' : '7.5px',
                            color: '#1e293b',
                            width: compactMobile ? '22px' : '28px',
                            flexShrink: 0,
                          }}
                        >
                          PV
                        </span>
                        <div
                          style={{
                            flex: 1,
                            minWidth: '16px',
                            height: compactMobile ? '5px' : '6px',
                            borderRadius: '9999px',
                            background: '#c6cbd4',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // SUB-COMPONENTE COMPARTILHADO: SEÇÃO ITENS (5 COLUNAS + MODO SOLTAR + BALÃO ADAPTATIVO)
  // Em Mobile: Sem caixa de rolagem interna minúscula — exibe todos os slots amplos na tela!
  // ============================================================================
  const renderItemsCard = (compactMobile: boolean) => {
    const rowsCount = Math.ceil(totalSlotsCount / GRID_COLS);
    const selectedRow =
      selectedSlotIndex !== null ? Math.floor(selectedSlotIndex / GRID_COLS) : null;
    const placeBalloonBelow = selectedRow !== null ? selectedRow < 2 : true;

    const categories = [
      { id: 'todos', label: 'Todos' },
      { id: 'pets', label: 'Pets' },
      { id: 'item_pet', label: 'Item Pet' },
      { id: 'equipaveis', label: 'Equipáveis' },
      { id: 'artefatos', label: 'Artefatos' },
      { id: 'consumiveis', label: 'Consumíveis' },
      { id: 'livros', label: 'Livros' },
    ];

    return (
      <div
        style={{
          borderRadius: '18px',
          padding: compactMobile ? '8px 8px 10px' : '10px 14px 12px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden',
          flexShrink: 0,
          height: compactMobile ? 'auto' : '100%',
        }}
      >
        {/* TOPO ITENS: Título + Carrossel de Categorias + Setinha '>' + Botão Circular MODO SOLTAR */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            marginBottom: '6px',
            minWidth: 0,
            width: '100%',
          }}
        >
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {renderSectionTitle('ITENS', compactMobile)}

            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', minWidth: 0, width: '100%' }}>
              <div
                ref={catScrollRef}
                className="no-scrollbar"
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  overflowX: 'auto',
                  paddingBottom: '2px',
                }}
              >
                {categories.map((cat) => {
                  const isActive = activeCategory === cat.id && !activeEquipSlotFilter;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setActiveEquipSlotFilter(null);
                        setActiveCategory(cat.id as any);
                        setSelectedSlotIndex(null);
                      }}
                      style={{
                        padding: compactMobile ? '4px 9px' : '5px 11px',
                        borderRadius: '9px',
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 800,
                        fontSize: compactMobile ? '8.5px' : '9.5px',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                        cursor: 'pointer',
                        ...(isActive
                          ? {
                              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                              border: '1.5px solid #d4af37',
                              color: '#ffffff',
                              boxShadow: '0 2px 5px rgba(4, 27, 66, 0.35)',
                            }
                          : {
                              background: 'linear-gradient(180deg, #fbf7ef 0%, #efe4ce 100%)',
                              border: '1px solid #d8c39e',
                              color: '#0f172a',
                            }),
                      }}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Setinha '>' para rolar categorias sem transbordar */}
              <button
                type="button"
                onClick={() => catScrollRef.current?.scrollBy({ left: 110, behavior: 'smooth' })}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(180deg, #fbf7ef 0%, #efe4ce 100%)',
                  border: '1.5px solid #d4af37',
                  color: '#0f172a',
                  fontWeight: 900,
                  fontSize: '11px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  cursor: 'pointer',
                }}
                title="Mais categorias"
              >
                ❯
              </button>
            </div>
          </div>

          {/* Botão Circular Azul Royal & Ouro MODO SOLTAR (fiel aos Concepts 2 e 4) */}
          <button
            type="button"
            onClick={() => {
              const next = !selectDropMode;
              setSelectDropMode(next);
              triggerToast(next ? 'Modo Soltar Ativo' : 'Modo Soltar Desativado');
            }}
            style={{
              width: compactMobile ? '48px' : '56px',
              height: compactMobile ? '48px' : '56px',
              minWidth: compactMobile ? '48px' : '56px',
              borderRadius: '9999px',
              background: selectDropMode
                ? 'linear-gradient(180deg, #1d4ed8 0%, #0b3778 100%)'
                : 'linear-gradient(180deg, #0b3778 0%, #031536 100%)',
              border: '2px solid #d4af37',
              outline: '1.5px solid #785212',
              boxShadow: '0 4px 10px rgba(0,8,22,0.4), inset 0 1px 2px rgba(255,255,255,0.35)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: 'pointer',
              padding: '2px',
            }}
            title="Alternar Modo Soltar"
          >
            <span style={{ color: '#fff3c2', fontSize: '9px', lineHeight: 1, marginBottom: '1px' }}>❂</span>
            <span
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: compactMobile ? '6.5px' : '7px',
                lineHeight: 1.1,
                color: '#ffffff',
                textAlign: 'center',
                textTransform: 'uppercase',
              }}
            >
              MODO
              <br />
              SOLTAR
            </span>
          </button>
        </div>

        {/* GRADE DE 5 COLUNAS — Em Mobile abre ampla sem ficar espremida; em Paisagem tem scroll lateralizado */}
        <div
          style={{
            borderRadius: '14px',
            padding: compactMobile ? '10px 6px' : '10px 10px',
            background: 'linear-gradient(180deg, #f8f2e4 0%, #f2e8d5 100%)',
            border: '1.5px solid #e4d3b5',
            display: 'flex',
            alignItems: 'stretch',
            gap: '6px',
            flex: compactMobile ? 'none' : 1,
            minHeight: 0,
            minWidth: 0,
          }}
        >
          <div
            ref={itemsScrollRef}
            className="no-scrollbar"
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: compactMobile ? 'visible' : 'auto',
              maxHeight: compactMobile ? 'none' : '270px',
              paddingRight: '2px',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                columnGap: compactMobile ? '6px' : '10px',
                rowGap: compactMobile ? '10px' : '10px',
                padding: '2px 0',
              }}
            >
              {Array.from({ length: rowsCount }).map((_, rowIndex) => {
                const startIdx = rowIndex * GRID_COLS;
                const isBalloonInThisRow = selectedRow === rowIndex && selectedSlotIndex !== null;

                return (
                  <React.Fragment key={`item-row-${rowIndex}`}>
                    {isBalloonInThisRow && !placeBalloonBelow && renderAdaptiveItemBalloon(selectedSlotIndex!)}

                    {Array.from({ length: GRID_COLS }).map((__, colOffset) => {
                      const idx = startIdx + colOffset;
                      if (idx >= totalSlotsCount) return null;
                      const slotItem = filteredItems[idx] || null;
                      const isSelected = selectedSlotIndex === idx;
                      const isEquipped =
                        slotItem ? Object.values(equippedBySlot).includes(slotItem.id) : false;

                      return (
                        <div
                          key={`slot-${idx}`}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                            minWidth: 0,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              if (slotItem && selectDropMode) {
                                handleDropSelectedItem(slotItem);
                                return;
                              }
                              setBalloonExpandedLore(false);
                              setSelectedSlotIndex((prev) => (prev === idx ? null : idx));
                            }}
                            style={{
                              width: compactMobile ? '48px' : '52px',
                              height: compactMobile ? '48px' : '52px',
                              borderRadius: '9999px',
                              background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                              border: isSelected ? '2.5px solid #f59e0b' : '1.5px solid #d5d9e0',
                              boxShadow: isSelected
                                ? '0 0 12px rgba(245, 158, 11, 0.75), inset 0 2px 4px rgba(0,0,0,0.12)'
                                : 'inset 0 2px 4px rgba(0,0,0,0.12)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              cursor: 'pointer',
                            }}
                          >
                            {slotItem ? (
                              slotItem.iconPng ? (
                                <img
                                  src={slotItem.iconPng}
                                  alt={slotItem.name}
                                  style={{ width: '26px', height: '26px', objectFit: 'contain' }}
                                />
                              ) : (
                                <span style={{ fontSize: '18px' }}>{slotItem.iconEmoji}</span>
                              )
                            ) : (
                              <span style={{ color: '#7c8390', fontSize: '22px', fontWeight: 300, lineHeight: 1 }}>
                                +
                              </span>
                            )}

                            {(isEquipped || isSelected) && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '-3px',
                                  right: '-3px',
                                  width: '18px',
                                  height: '18px',
                                  borderRadius: '9999px',
                                  background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                                  border: '1.5px solid #d4af37',
                                  color: '#ffffff',
                                  fontFamily: "'Cinzel', serif",
                                  fontWeight: 900,
                                  fontSize: '8.5px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                E
                              </span>
                            )}
                          </button>

                          <span
                            style={{
                              marginTop: '-7px',
                              zIndex: 5,
                              padding: '1px 8px',
                              borderRadius: '9999px',
                              background: 'linear-gradient(180deg, #fdfbf7 0%, #efe4ce 100%)',
                              border: '1px solid #d8c39e',
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 900,
                              fontSize: '7.5px',
                              color: '#0f172a',
                              textTransform: 'uppercase',
                            }}
                          >
                            {slotItem ? `×${slotItem.quantity}` : 'QTD'}
                          </span>
                        </div>
                      );
                    })}

                    {isBalloonInThisRow && placeBalloonBelow && renderAdaptiveItemBalloon(selectedSlotIndex!)}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Scrollbar Vertical Dourada (apenas no modo Paisagem onde há scroll interno) */}
          {!compactMobile && (
            <div
              style={{
                width: '12px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={() => itemsScrollRef.current?.scrollBy({ top: -90, behavior: 'smooth' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#b45309',
                  fontSize: '9px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ▲
              </button>
              <div
                style={{
                  width: '6px',
                  flex: 1,
                  margin: '3px 0',
                  borderRadius: '9999px',
                  background: '#e5dccb',
                  border: '1px solid #d6c5a7',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: '38%',
                    borderRadius: '9999px',
                    background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => itemsScrollRef.current?.scrollBy({ top: 90, behavior: 'smooth' })}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#b45309',
                  fontSize: '9px',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ▼
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // TELA DEDICADA 1: MOBILE VERTICAL — ABA DECK (100% FIEL A 'Mochila com cartas e pets.png')
  // ============================================================================
  const renderDedicatedMobileDeckScreen = () => {
    const mobileSlots = 9;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', minWidth: 0, flexShrink: 0 }}>
        {/* CORPO 2 COLUNAS: PETS EQUIPADOS (28%) + MINHAS CARTAS (72%) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '28% 1fr',
            gap: '6px',
            width: '100%',
            minWidth: 0,
            alignItems: 'stretch',
          }}
        >
          {/* ESQUERDA: PETS EQUIPADOS */}
          <div
            style={{
              borderRadius: '18px',
              padding: '8px 5px',
              background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
              border: '2px solid #d4af37',
              outline: '1px solid #784808',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {/* Título em 2 linhas com estrelas nas laterais para caber 100% sem cortar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                marginBottom: '6px',
                width: '100%',
              }}
            >
              <ConceptStar size={9} />
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: '8.5px',
                  lineHeight: 1.15,
                  color: '#0f172a',
                  textAlign: 'center',
                  textTransform: 'uppercase',
                }}
              >
                PETS
                <br />
                EQUIPADOS
              </div>
              <ConceptStar size={9} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, justifyContent: 'space-around' }}>
              {[0, 1, 2].map((slotIdx) => {
                const eqPet = realEquippedPets[slotIdx];
                const isSelectedSlot = targetPetSlotIdx === slotIdx;
                return (
                  <React.Fragment key={`mob-deck-pet-${slotIdx}`}>
                    {slotIdx > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '-2px 0' }}>
                        <ConceptStar size={9} />
                      </div>
                    )}
                    <div
                      onClick={() => setTargetPetSlotIdx(slotIdx)}
                      style={{
                        borderRadius: '14px',
                        padding: '6px 4px',
                        background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                        border: isSelectedSlot ? '2px solid #f59e0b' : '1.5px solid #e2d3b8',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '3px',
                        cursor: 'pointer',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '9999px',
                          background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                          border: isSelectedSlot ? '2px solid #f59e0b' : '1.5px solid #d5d9e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {eqPet ? (
                          <span style={{ fontSize: '18px' }}>{eqPet.iconEmoji || '🐾'}</span>
                        ) : (
                          <span style={{ color: '#7c8390', fontSize: '20px', fontWeight: 300 }}>+</span>
                        )}
                      </div>
                      <span
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontWeight: 900,
                          fontSize: '8.5px',
                          color: '#0f172a',
                          textTransform: 'uppercase',
                        }}
                      >
                        PET {slotIdx + 1}
                      </span>

                      <div
                        style={{
                          width: '30px',
                          height: '30px',
                          borderRadius: '7px',
                          background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                          border: '1.5px solid #d5d9e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <span style={{ color: '#7c8390', fontSize: '16px', fontWeight: 300 }}>+</span>
                      </div>
                      <span
                        style={{
                          fontFamily: "'Cinzel', serif",
                          fontWeight: 900,
                          fontSize: '6.5px',
                          lineHeight: 1.1,
                          color: '#0f172a',
                          textAlign: 'center',
                          textTransform: 'uppercase',
                        }}
                      >
                        CARTA
                        <br />
                        EQUIPADA
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* DIREITA: MINHAS CARTAS */}
          <div
            style={{
              borderRadius: '18px',
              padding: '8px 7px',
              background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
              border: '2px solid #d4af37',
              outline: '1px solid #784808',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0,
              overflow: 'hidden',
            }}
          >
            {renderSectionTitle('MINHAS CARTAS', true)}

            {/* Busca + Raridade na mesma linha sem estourar */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: '5px',
                marginBottom: '6px',
                width: '100%',
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 8px',
                  borderRadius: '9999px',
                  background: '#fbf7ef',
                  border: '1px solid #d8c39e',
                  minWidth: 0,
                }}
              >
                <span style={{ fontSize: '10px', color: '#475569' }}>🔍</span>
                <input
                  type="text"
                  value={cardSearchQuery}
                  onChange={(e) => setCardSearchQuery(e.target.value)}
                  placeholder="Buscar carta..."
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontSize: '9px',
                    color: '#0f172a',
                    width: '100%',
                    minWidth: 0,
                  }}
                />
              </div>

              <select
                value={cardRarityFilter}
                onChange={(e) => setCardRarityFilter(e.target.value)}
                style={{
                  padding: '4px 6px',
                  borderRadius: '9999px',
                  background: '#fbf7ef',
                  border: '1px solid #d8c39e',
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800,
                  fontSize: '8px',
                  color: '#0f172a',
                  outline: 'none',
                }}
              >
                <option value="all">Todas as raridades</option>
                <option value="common">Comum</option>
                <option value="rare">Rara</option>
                <option value="epic">Épica</option>
                <option value="legendary">Lendária</option>
              </select>
            </div>

            {/* Grade 3x3 de Cartas Verticais */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                gap: '5px',
                width: '100%',
                minWidth: 0,
              }}
            >
              {Array.from({ length: mobileSlots }).map((_, idx) => {
                const card = filteredDeckCards[idx] || null;
                const isCardSelected = selectedCardIdx === idx;
                return (
                  <div
                    key={`mob-card-${idx}`}
                    onClick={() => setSelectedCardIdx(idx)}
                    style={{
                      borderRadius: '11px',
                      padding: '5px 4px',
                      background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                      border: isCardSelected ? '2px solid #d4af37' : '1.5px solid #e2d3b8',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '3px',
                      cursor: 'pointer',
                      minWidth: 0,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: '100%',
                        height: '62px',
                        borderRadius: '8px',
                        background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                        border: '1.5px solid #d5d9e0',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {card ? (
                        <span style={{ fontSize: '20px' }}>{card.iconEmoji || '🐾'}</span>
                      ) : (
                        <>
                          <span style={{ color: '#7c8390', fontSize: '20px', fontWeight: 300, lineHeight: 1 }}>+</span>
                          <span
                            style={{
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 800,
                              fontSize: '7px',
                              color: '#475569',
                              marginTop: '2px',
                            }}
                          >
                            CARTA
                          </span>
                        </>
                      )}
                    </div>

                    <span
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 900,
                        fontSize: '6.5px',
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}
                    >
                      {card ? card.name : 'NOME DA CARTA'}
                    </span>

                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '2px',
                        width: '100%',
                        fontSize: '5.5px',
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 800,
                        color: '#334155',
                      }}
                    >
                      <span>NV</span>
                      <span style={{ width: '8px', height: '3px', borderRadius: '99px', background: '#c6cbd4' }} />
                      <span>PV</span>
                      <span style={{ width: '8px', height: '3px', borderRadius: '99px', background: '#c6cbd4' }} />
                      <span>ATK</span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (card) {
                          equipPetInSlot(card.id, targetPetSlotIdx, true);
                          triggerToast(`Equipado em PET ${targetPetSlotIdx + 1}: ${card.name}`);
                        } else {
                          triggerToast('Slot de carta vazio');
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '3.5px 2px',
                        borderRadius: '9999px',
                        background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                        border: '1.5px solid #d4af37',
                        color: '#ffffff',
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 900,
                        fontSize: '7px',
                        textTransform: 'uppercase',
                        cursor: 'pointer',
                      }}
                    >
                      EQUIPAR
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RODAPÉ MOBILE DECK (Fiel a 'Mochila com cartas e pets.png') */}
        <div
          style={{
            borderRadius: '16px',
            padding: '7px 8px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f3e8d3 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) auto auto',
            alignItems: 'center',
            gap: '6px',
            width: '100%',
            minWidth: 0,
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                border: '1.5px solid #d5d9e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {selectedDeckCard ? (
                <span style={{ fontSize: '16px' }}>{selectedDeckCard.iconEmoji}</span>
              ) : (
                <span style={{ color: '#7c8390', fontSize: '18px', fontWeight: 300 }}>+</span>
              )}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 900,
                  fontSize: '8px',
                  color: '#0f172a',
                  borderBottom: '1px solid #d8c39e',
                  paddingBottom: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedDeckCard ? selectedDeckCard.name : 'NOME DA CARTA'}
              </div>
              <div
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontWeight: 800,
                  fontSize: '7px',
                  color: '#334155',
                  paddingTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {selectedDeckCard ? selectedDeckCard.roleLabel || 'ATAQUE' : 'ESTILO DE ATAQUE'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (selectedDeckCard) {
                equipPetInSlot(selectedDeckCard.id, targetPetSlotIdx, true);
                triggerToast(`Equipado em PET ${targetPetSlotIdx + 1}`);
              } else {
                triggerToast('Selecione uma carta primeiro');
              }
            }}
            style={{
              padding: '8px 10px',
              borderRadius: '10px',
              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
              border: '1.5px solid #d4af37',
              color: '#ffffff',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: '8px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            EQUIPAR NO SLOT
          </button>

          <button
            type="button"
            onClick={() => triggerToast(selectedDeckCard?.shortDescription || 'Selecione uma carta')}
            style={{
              padding: '8px 10px',
              borderRadius: '10px',
              background: 'linear-gradient(180deg, #fdfbf7 0%, #efe3cc 100%)',
              border: '1.5px solid #d4af37',
              color: '#0f172a',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: '8px',
              textTransform: 'uppercase',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            SABER MAIS
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // TELA DEDICADA 2: WEB / PAISAGEM — ABA DECK (100% FIEL A 'Painel de deck com pets e cartas-2.png')
  // ============================================================================
  const renderDedicatedLandscapeDeckScreen = () => {
    const landscapeSlots = 6;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1, minHeight: 0, width: '100%', flexShrink: 0 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '30% 1fr',
            gap: '10px',
            flex: 1,
            minHeight: 0,
            width: '100%',
          }}
        >
          {/* ESQUERDA: PETS EQUIPADOS */}
          <div
            style={{
              borderRadius: '20px',
              padding: '10px 12px',
              background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
              border: '2px solid #d4af37',
              outline: '1px solid #784808',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0,
            }}
          >
            {renderSectionTitle('PETS EQUIPADOS')}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, justifyContent: 'space-around' }}>
              {[0, 1, 2].map((slotIdx) => {
                const eqPet = realEquippedPets[slotIdx];
                const isSelectedSlot = targetPetSlotIdx === slotIdx;
                return (
                  <React.Fragment key={`ls-deck-pet-${slotIdx}`}>
                    {slotIdx > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0', zIndex: 5 }}>
                        <ConceptStar size={10} />
                      </div>
                    )}
                    <div
                      onClick={() => setTargetPetSlotIdx(slotIdx)}
                      style={{
                        borderRadius: '16px',
                        padding: '8px 12px',
                        background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                        border: isSelectedSlot ? '2px solid #f59e0b' : '1.5px solid #e2d3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
                        {slotIdx === 0 && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '-4px',
                              right: '-10px',
                              zIndex: 10,
                              padding: '1px 6px',
                              borderRadius: '9999px',
                              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                              border: '1px solid #d4af37',
                              color: '#ffffff',
                              fontFamily: "'Cinzel', serif",
                              fontWeight: 900,
                              fontSize: '7px',
                            }}
                          >
                            ATIVO
                          </span>
                        )}
                        <div
                          style={{
                            width: '54px',
                            height: '54px',
                            borderRadius: '9999px',
                            background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                            border: isSelectedSlot ? '2.5px solid #f59e0b' : '1.5px solid #d5d9e0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {eqPet ? (
                            <span style={{ fontSize: '20px' }}>{eqPet.iconEmoji || '🐾'}</span>
                          ) : (
                            <span style={{ color: '#7c8390', fontSize: '24px', fontWeight: 300 }}>+</span>
                          )}
                        </div>
                        <span
                          style={{
                            marginTop: '3px',
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: '9px',
                            color: '#0f172a',
                          }}
                        >
                          PET {slotIdx + 1}
                        </span>
                      </div>

                      {/* Conector —✦— */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <span style={{ width: '12px', height: '1.5px', background: '#d4af37' }} />
                        <ConceptStar size={9} />
                        <span style={{ width: '12px', height: '1.5px', background: '#d4af37' }} />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '54px',
                            borderRadius: '9px',
                            background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                            border: '1.5px solid #d5d9e0',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <span style={{ color: '#7c8390', fontSize: '20px', fontWeight: 300 }}>+</span>
                        </div>
                        <span
                          style={{
                            marginTop: '2px',
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: '7px',
                            lineHeight: 1.1,
                            color: '#0f172a',
                            textAlign: 'center',
                          }}
                        >
                          CARTA
                          <br />
                          EQUIPADA
                        </span>
                      </div>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* DIREITA: MINHAS CARTAS (PAISAGEM) */}
          <div
            style={{
              borderRadius: '20px',
              padding: '10px 14px',
              background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
              border: '2px solid #d4af37',
              outline: '1px solid #784808',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minWidth: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '8px' }}>
              <div style={{ flex: 1 }}>{renderSectionTitle('MINHAS CARTAS')}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: '#fbf7ef',
                    border: '1px solid #d8c39e',
                    width: '170px',
                  }}
                >
                  <span style={{ fontSize: '11px', color: '#475569' }}>🔍</span>
                  <input
                    type="text"
                    value={cardSearchQuery}
                    onChange={(e) => setCardSearchQuery(e.target.value)}
                    placeholder="Buscar carta..."
                    style={{
                      background: 'transparent',
                      border: 'none',
                      outline: 'none',
                      fontSize: '10px',
                      color: '#0f172a',
                      width: '100%',
                    }}
                  />
                </div>
                <select
                  value={cardRarityFilter}
                  onChange={(e) => setCardRarityFilter(e.target.value)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '9999px',
                    background: '#fbf7ef',
                    border: '1px solid #d8c39e',
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 800,
                    fontSize: '9.5px',
                    color: '#0f172a',
                    outline: 'none',
                  }}
                >
                  <option value="all">Todas as raridades</option>
                  <option value="common">Comum</option>
                  <option value="rare">Rara</option>
                  <option value="epic">Épica</option>
                  <option value="legendary">Lendária</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'stretch', gap: '8px', flex: 1, minHeight: 0 }}>
              <div
                ref={cardsScrollRef}
                className="no-scrollbar"
                style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: '10px',
                  alignContent: 'center',
                }}
              >
                {Array.from({ length: landscapeSlots }).map((_, idx) => {
                  const card = filteredDeckCards[idx] || null;
                  const isCardSelected = selectedCardIdx === idx;
                  return (
                    <div
                      key={`ls-card-${idx}`}
                      onClick={() => setSelectedCardIdx(idx)}
                      style={{
                        borderRadius: '14px',
                        padding: '8px',
                        background: 'linear-gradient(180deg, #fbf7ef 0%, #f3ead8 100%)',
                        border: isCardSelected ? '2px solid #d4af37' : '1.5px solid #e2d3b8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        cursor: 'pointer',
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          width: '62px',
                          height: '92px',
                          borderRadius: '10px',
                          background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                          border: '1.5px solid #d5d9e0',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        {card ? (
                          <span style={{ fontSize: '22px' }}>{card.iconEmoji || '🐾'}</span>
                        ) : (
                          <>
                            <span style={{ color: '#7c8390', fontSize: '22px', fontWeight: 300, lineHeight: 1 }}>+</span>
                            <span
                              style={{
                                fontFamily: "'Cinzel', serif",
                                fontWeight: 800,
                                fontSize: '7.5px',
                                color: '#475569',
                                marginTop: '3px',
                              }}
                            >
                              CARTA
                            </span>
                          </>
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '92px' }}>
                        <div
                          style={{
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: '8.5px',
                            color: '#0f172a',
                            borderBottom: '1px solid #d8c39e',
                            paddingBottom: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {card ? card.name : 'NOME DA CARTA'}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {['NÍVEL', 'PV', 'ATK'].map((st) => (
                            <div key={st} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                              <span style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: '7px', color: '#1e293b' }}>
                                {st}
                              </span>
                              <div style={{ flex: 1, maxWidth: '48px', height: '6px', borderRadius: '9999px', background: '#c6cbd4' }} />
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (card) {
                              equipPetInSlot(card.id, targetPetSlotIdx, true);
                              triggerToast(`Equipado em PET ${targetPetSlotIdx + 1}: ${card.name}`);
                            } else {
                              triggerToast('Slot de carta vazio');
                            }
                          }}
                          style={{
                            width: '100%',
                            padding: '4px 0',
                            borderRadius: '9999px',
                            background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                            border: '1.5px solid #d4af37',
                            color: '#ffffff',
                            fontFamily: "'Cinzel', serif",
                            fontWeight: 900,
                            fontSize: '8px',
                            textTransform: 'uppercase',
                            cursor: 'pointer',
                          }}
                        >
                          EQUIPAR
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Scrollbar Vertical Dourada */}
              <div style={{ width: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ color: '#b45309', fontSize: '9px' }}>▲</span>
                <div style={{ width: '6px', flex: 1, margin: '3px 0', borderRadius: '9999px', background: '#e5dccb', border: '1px solid #d6c5a7' }}>
                  <div style={{ width: '100%', height: '40%', borderRadius: '9999px', background: 'linear-gradient(180deg, #f59e0b 0%, #b45309 100%)' }} />
                </div>
                <span style={{ color: '#b45309', fontSize: '9px' }}>▼</span>
              </div>
            </div>
          </div>
        </div>

        {/* RODAPÉ PAISAGEM DECK */}
        <div
          style={{
            borderRadius: '18px',
            padding: '8px 14px',
            background: 'linear-gradient(180deg, #fcf9f2 0%, #f3e8d3 100%)',
            border: '2px solid #d4af37',
            outline: '1px solid #784808',
            boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '10px',
                background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
                border: '1.5px solid #d5d9e0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span style={{ color: '#7c8390', fontSize: '22px', fontWeight: 300 }}>+</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '16px', flex: 1, minWidth: 0 }}>
              <div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: '10px', color: '#0f172a', borderBottom: '1px solid #d8c39e', paddingBottom: '2px' }}>
                  {selectedDeckCard ? selectedDeckCard.name : 'NOME DA CARTA'}
                </div>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: '9px', color: '#334155', paddingTop: '2px' }}>
                  {selectedDeckCard ? selectedDeckCard.roleLabel || 'ATAQUE' : 'ESTILO DE ATAQUE'}
                </div>
              </div>
              <div style={{ borderLeft: '1.5px solid #d4af37', paddingLeft: '12px' }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: '9.5px', color: '#0f172a' }}>ATRIBUTOS</div>
                <div style={{ height: '1px', background: '#d8c39e', marginTop: '8px' }} />
                <div style={{ height: '1px', background: '#d8c39e', marginTop: '6px' }} />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => triggerToast('Selecione uma carta para equipar')}
              style={{
                padding: '9px 22px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                border: '2px solid #d4af37',
                color: '#ffffff',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '10.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              EQUIPAR NO SLOT
            </button>
            <button
              type="button"
              onClick={() => triggerToast('Selecione uma carta para ver detalhes')}
              style={{
                padding: '9px 22px',
                borderRadius: '12px',
                background: 'linear-gradient(180deg, #fdfbf7 0%, #efe3cc 100%)',
                border: '2px solid #d4af37',
                color: '#0f172a',
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: '10.5px',
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              SABER MAIS
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================================================
  // RODAPÉ DA MOCHILA (MOBILE VERTICAL E WEB PAISAGEM)
  // ============================================================================
  const renderMochilaFooter = (compactMobile: boolean) => (
    <div
      style={{
        borderRadius: '18px',
        padding: compactMobile ? '8px 10px' : '8px 14px',
        background: 'linear-gradient(180deg, #fcf9f2 0%, #f3e8d3 100%)',
        border: '2px solid #d4af37',
        outline: '1px solid #784808',
        boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
        display: 'flex',
        flexDirection: compactMobile ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: compactMobile ? '8px' : '14px',
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', flex: 1, minWidth: 0 }}>
        <div
          style={{
            width: compactMobile ? '40px' : '46px',
            height: compactMobile ? '40px' : '46px',
            borderRadius: '9999px',
            background: 'linear-gradient(180deg, #c6cbd4 0%, #b5bbc6 100%)',
            border: '1.5px solid #d5d9e0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {selectedItem ? (
            <span style={{ fontSize: '18px' }}>{selectedItem.iconEmoji}</span>
          ) : (
            <span style={{ color: '#7c8390', fontSize: '22px', fontWeight: 300 }}>+</span>
          )}
        </div>

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'grid',
            gridTemplateColumns: compactMobile ? 'minmax(0, 1fr) minmax(0, 1fr)' : '1.1fr 0.7fr 1.2fr',
            gap: '10px',
            alignItems: 'center',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 900,
                fontSize: compactMobile ? '9px' : '10px',
                color: '#0f172a',
                borderBottom: '1px solid #d8c39e',
                paddingBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedItem ? selectedItem.name : 'NOME DO ITEM'}
            </div>
            <div
              style={{
                fontFamily: "'Cinzel', serif",
                fontWeight: 800,
                fontSize: compactMobile ? '8px' : '9px',
                color: '#334155',
                paddingTop: '2px',
              }}
            >
              {selectedItem
                ? selectedItem.equipSlot === 'accessory'
                  ? 'ARTEFATOS'
                  : selectedItem.category.toUpperCase()
                : 'CATEGORIA'}
            </div>
          </div>

          {!compactMobile && (
            <div style={{ borderLeft: '1.5px solid #d4af37', paddingLeft: '10px' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: '9px', color: '#0f172a' }}>
                QUANTIDADE
              </div>
              <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 800, fontSize: '9px', color: '#475569', borderBottom: '1px solid #d8c39e', marginTop: '3px' }}>
                {selectedItem ? `×${selectedItem.quantity}` : '—'}
              </div>
            </div>
          )}

          <div style={{ borderLeft: '1.5px solid #d4af37', paddingLeft: '10px', minWidth: 0 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontWeight: 900, fontSize: compactMobile ? '8.5px' : '9px', color: '#0f172a' }}>
              ATRIBUTOS
            </div>
            <div
              style={{
                fontSize: '8.5px',
                color: '#475569',
                borderBottom: '1px solid #d8c39e',
                paddingBottom: '2px',
                marginTop: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {selectedItem?.statsText || selectedItem?.shortDescription || '—'}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: '8px',
          width: compactMobile ? '100%' : 'auto',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => handlePrimaryEquipOrUse()}
          style={{
            padding: compactMobile ? '8px 6px' : '8px 16px',
            borderRadius: '11px',
            background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
            border: '2px solid #d4af37',
            color: '#ffffff',
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: compactMobile ? '9.5px' : '10px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          {compactMobile ? 'USAR' : 'EQUIPAR / USAR'}
        </button>

        <button
          type="button"
          onClick={() => {
            if (selectedSlotIndex === null) setSelectedSlotIndex(0);
            setBalloonExpandedLore((v) => !v);
          }}
          style={{
            padding: compactMobile ? '8px 6px' : '8px 16px',
            borderRadius: '11px',
            background: 'linear-gradient(180deg, #fdfbf7 0%, #efe3cc 100%)',
            border: '2px solid #d4af37',
            color: '#0f172a',
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: compactMobile ? '9.5px' : '10px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          SABER MAIS
        </button>

        <button
          type="button"
          onClick={() => handleDropSelectedItem()}
          style={{
            padding: compactMobile ? '8px 6px' : '8px 16px',
            borderRadius: '11px',
            background: 'linear-gradient(180deg, #fdfbf7 0%, #efe3cc 100%)',
            border: '2px solid #d4af37',
            color: '#0f172a',
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: compactMobile ? '9.5px' : '10px',
            textTransform: 'uppercase',
            cursor: 'pointer',
          }}
        >
          SOLTAR 1x
        </button>
      </div>
    </div>
  );

  // ============================================================================
  // VISÃO INTERNA DE JORNADA & TAREFAS (100% ENCAIXADA NA TELA DO CELULAR SEM TRANSBORDAR!)
  // ============================================================================
  const renderQuestsInsideConceptFrame = (questTab: 'jornada' | 'tarefas') => {
    const list = questTab === 'jornada' ? jornadaQuests : tarefasQuests;
    return (
      <div
        style={{
          borderRadius: '18px',
          padding: isLandscape ? '12px 14px' : '10px 8px',
          background: 'linear-gradient(180deg, #fcf9f2 0%, #f5ecdc 100%)',
          border: '2px solid #d4af37',
          outline: '1px solid #784808',
          boxShadow: 'inset 0 1px 0 #ffffff, 0 6px 16px rgba(0, 8, 24, 0.35)',
          width: '100%',
          minWidth: 0,
          boxSizing: 'border-box',
          overflow: 'hidden',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        {renderSectionTitle(questTab === 'jornada' ? 'JORNADA PRINCIPAL' : 'TAREFAS & RECOMPENSAS', !isLandscape)}

        <div
          style={{
            display: isLandscape ? 'grid' : 'flex',
            flexDirection: 'column',
            gridTemplateColumns: isLandscape ? 'repeat(2, minmax(0, 1fr))' : undefined,
            gap: '8px',
            width: '100%',
            minWidth: 0,
          }}
        >
          {list.map((q) => {
            const doneCount = q.objectives.filter((o) => o.completed).length;
            const totalCount = Math.max(1, q.objectives.length);
            const pct = Math.round((doneCount / totalCount) * 100);
            const isSelected = selectedQuestId === q.id;
            return (
              <div
                key={q.id}
                onClick={() => setSelectedQuestId(isSelected ? null : q.id)}
                style={{
                  borderRadius: '14px',
                  padding: isLandscape ? '10px 12px' : '8px 9px',
                  background: 'linear-gradient(180deg, #fbf7ef 0%, #f1e6d2 100%)',
                  border: q.isCompleted ? '2px solid #16a34a' : isSelected ? '2px solid #b45309' : '1.5px solid #d4af37',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  width: '100%',
                  minWidth: 0,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%', minWidth: 0 }}>
                  <div
                    style={{
                      width: isLandscape ? '42px' : '38px',
                      height: isLandscape ? '42px' : '38px',
                      borderRadius: '11px',
                      background: q.isCompleted
                        ? 'linear-gradient(180deg, #065f46 0%, #022c22 100%)'
                        : 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                      border: '1.5px solid #d4af37',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: isLandscape ? '19px' : '17px',
                      flexShrink: 0,
                      position: 'relative',
                    }}
                  >
                    {q.isLocked ? '🔒' : q.iconEmoji || '📜'}
                  </div>

                  <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                    <div
                      style={{
                        fontFamily: "'Cinzel', serif",
                        fontWeight: 900,
                        fontSize: isLandscape ? '10.5px' : '9.5px',
                        lineHeight: 1.2,
                        color: '#0f172a',
                        textTransform: 'uppercase',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                      }}
                    >
                      {q.title}
                    </div>
                    <div
                      style={{
                        marginTop: '4px',
                        height: '13px',
                        width: '100%',
                        borderRadius: '9999px',
                        background: '#1e293b',
                        border: '1px solid #d4af37',
                        position: 'relative',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          width: `${Math.max(12, pct)}%`,
                          height: '100%',
                          background: q.isCompleted
                            ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                            : 'linear-gradient(90deg, #0b3778, #d4af37)',
                        }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          bottom: 0,
                          left: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: "'Cinzel', serif",
                          fontWeight: 900,
                          fontSize: '7.5px',
                          color: '#ffffff',
                        }}
                      >
                        {doneCount} / {totalCount} ETAPAS
                      </span>
                    </div>
                  </div>

                  {/* Indicador compacto de expandir/status à direita */}
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '8px',
                      background: q.isCompleted
                        ? 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)'
                        : 'linear-gradient(180deg, #fbf7ef 0%, #e7d8bc 100%)',
                      border: '1px solid #d4af37',
                      color: q.isCompleted ? '#ffffff' : '#0f172a',
                      fontSize: '10px',
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {q.isCompleted ? '✓' : isSelected ? '▲' : '▼'}
                  </div>
                </div>

                {isSelected && (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      paddingTop: '6px',
                      borderTop: '1px solid #d8c39e',
                      width: '100%',
                      minWidth: 0,
                    }}
                  >
                    {q.objectives.map((obj, idx) => (
                      <div
                        key={obj.id}
                        style={{
                          padding: '5px 8px',
                          borderRadius: '8px',
                          background: '#fcf9f2',
                          border: '1px solid #d8c39e',
                          fontSize: '9px',
                          color: '#0f172a',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                          minWidth: 0,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {idx + 1}. {obj.title}
                        </span>
                        <span style={{ fontWeight: 900, flexShrink: 0 }}>
                          {obj.current}/{obj.required}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onScroll={(e) => {
        if (!isHubFullScreen) return;
        const el = e.currentTarget;
        const curY = el.scrollTop;
        const prevY = Number(el.dataset.lastScrollY || '0');
        const dy = curY - prevY;
        el.dataset.lastScrollY = String(curY);
        if (curY > 14 && dy > 2) {
          document.body.classList.add('hub-scroll-hide-bars');
        } else if (dy < -3 || curY <= 10) {
          document.body.classList.remove('hub-scroll-hide-bars');
        }
      }}
      className="no-scrollbar select-none"
      style={
        isHubFullScreen
          ? {
              width: '100%',
              height: '100%',
              overflowY: 'auto',
              overflowX: 'hidden',
              /* Tela 100% liberada sem container de fundo prendendo: rola livremente e oculta a barra de navegação */
              padding: isLandscape ? '58px 16px 84px 16px' : '54px 8px 96px 8px',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              background:
                'radial-gradient(ellipse at top, #0a2558 0%, #04122c 65%, #020a1a 100%)',
            }
          : {
              position: isInsideEmulator ? 'absolute' : 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              zIndex: 90,
              padding: '8px',
              overflowY: 'auto',
              overflowX: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              background: 'rgba(2, 10, 26, 0.72)',
              backdropFilter: 'blur(4px)',
            }
      }
    >
      {statusToast && (
        <div
          style={{
            position: 'fixed',
            top: '68px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 3000,
            padding: '6px 16px',
            borderRadius: '9999px',
            background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
            border: '2px solid #d4af37',
            color: '#fff3c2',
            fontFamily: "'Cinzel', serif",
            fontWeight: 900,
            fontSize: '10px',
            pointerEvents: 'none',
          }}
        >
          {statusToast}
        </div>
      )}

      {/* TELA LIBERADA (SEM CONTAINER DE FUNDO CORTANDO): CADA SEÇÃO FLUI DIRETO NA TELA */}
      <div
        style={{
          width: '100%',
          maxWidth: isLandscape ? '1120px' : '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: isLandscape ? '8px' : '6px',
          boxSizing: 'border-box',
          flexShrink: 0,
        }}
      >
        {/* TOPO: ABAS FIXAS (MOCHILA | DECK | ✦ JORNADA | TAREFAS) + SALDOS (OURO · SALDO | GEMAS · SALDO | CAPACIDADE) */}
        <div
          style={{
            display: 'flex',
            flexDirection: isLandscape ? 'row' : 'column',
            alignItems: isLandscape ? 'center' : 'stretch',
            justifyContent: 'space-between',
            gap: '6px',
            width: '100%',
            minWidth: 0,
            flexShrink: 0,
          }}
        >
          {/* Cápsula de Abas Superiores (4 colunas exatas em Mobile para NUNCA transbordar) */}
          <div
            style={{
              borderRadius: '16px',
              padding: '4px',
              background: 'linear-gradient(180deg, #fcf9f2 0%, #f1e6d0 100%)',
              border: '2px solid #d4af37',
              outline: '1px solid #784808',
              boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px rgba(0, 8, 24, 0.35)',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '4px',
              width: isLandscape ? 'auto' : '100%',
              minWidth: isLandscape ? '420px' : 0,
              boxSizing: 'border-box',
            }}
          >
            {(
              [
                { id: 'equipamento', label: 'MOCHILA', star: false },
                { id: 'deck', label: 'DECK', star: false },
                { id: 'jornada', label: 'JORNADA', star: true },
                { id: 'tarefas', label: 'TAREFAS', star: false },
              ] as const
            ).map((tab) => {
              const isActive = topFolderTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTopFolderTab(tab.id)}
                  style={{
                    padding: isLandscape ? '6px 12px' : '6px 4px',
                    borderRadius: '11px',
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 900,
                    fontSize: isLandscape ? '10.5px' : '9px',
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    minWidth: 0,
                    whiteSpace: 'nowrap',
                    ...(isActive
                      ? {
                          background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
                          border: '1.5px solid #d4af37',
                          color: '#ffffff',
                          boxShadow: '0 2px 6px rgba(4, 27, 66, 0.35)',
                        }
                      : {
                          background: 'linear-gradient(180deg, #fbf7ef 0%, #ebe0c9 100%)',
                          border: '1px solid #d5be90',
                          color: '#0f172a',
                        }),
                  }}
                >
                  {tab.star && <ConceptStar size={isLandscape ? 11 : 9} />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Cápsula de Saldos e Capacidade (OURO · SALDO | GEMAS · SALDO | CAPACIDADE OCUPADOS / TOTAL) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, width: isLandscape ? 'auto' : '100%' }}>
            <div
              style={{
                flex: 1,
                borderRadius: '16px',
                padding: isLandscape ? '5px 14px' : '4px 8px',
                background: 'linear-gradient(180deg, #fcf9f2 0%, #f1e6d0 100%)',
                border: '2px solid #d4af37',
                outline: '1px solid #784808',
                boxShadow: 'inset 0 1px 0 #ffffff, 0 4px 12px rgba(0, 8, 24, 0.35)',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1.25fr',
                alignItems: 'center',
                gap: '6px',
                minWidth: 0,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minWidth: 0 }}>
                <ConceptGoldCoinSvg size={isLandscape ? 20 : 16} />
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 900,
                    fontSize: isLandscape ? '9.5px' : '7.5px',
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  OURO · SALDO
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  borderLeft: '1px solid rgba(212,175,55,0.55)',
                  borderRight: '1px solid rgba(212,175,55,0.55)',
                  padding: '0 4px',
                  minWidth: 0,
                }}
              >
                <ConceptBlueGemSvg size={isLandscape ? 19 : 15} />
                <span
                  style={{
                    fontFamily: "'Cinzel', serif",
                    fontWeight: 900,
                    fontSize: isLandscape ? '9.5px' : '7.5px',
                    color: '#0f172a',
                    whiteSpace: 'nowrap',
                  }}
                >
                  GEMAS · SALDO
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', minWidth: 0 }}>
                <ConceptLeatherBagSvg size={isLandscape ? 20 : 16} />
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1, minWidth: 0 }}>
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 900,
                      fontSize: isLandscape ? '8px' : '6.5px',
                      color: '#0f172a',
                    }}
                  >
                    CAPACIDADE
                  </span>
                  <span
                    style={{
                      fontFamily: "'Cinzel', serif",
                      fontWeight: 800,
                      fontSize: isLandscape ? '7.5px' : '6px',
                      color: '#334155',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {allUnifiedItems.length > 0
                      ? `${allUnifiedItems.length} / ${totalSlotsCount}`
                      : 'OCUPADOS / TOTAL'}
                  </span>
                </div>
              </div>
            </div>

            {!isHubFullScreen && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9999px',
                  background: 'linear-gradient(180deg, #fdfbf7 0%, #e7d8bc 100%)',
                  border: '2px solid #d4af37',
                  color: '#0f172a',
                  fontWeight: 900,
                  fontSize: '14px',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* CORPO PRINCIPAL SEPARADO POR DISPOSITIVO (MOBILE VERTICAL vs WEB PAISAGEM) E ABA */}
        {topFolderTab === 'jornada' || topFolderTab === 'tarefas' ? (
          renderQuestsInsideConceptFrame(topFolderTab)
        ) : topFolderTab === 'deck' ? (
          isLandscape ? (
            renderDedicatedLandscapeDeckScreen()
          ) : (
            renderDedicatedMobileDeckScreen()
          )
        ) : isLandscape ? (
          /* TELA DEDICADA WEB / PAISAGEM — MOCHILA */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, minHeight: 0, flexShrink: 0 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '46% 1fr',
                gap: '10px',
                alignItems: 'stretch',
                flex: 1,
                minHeight: 0,
              }}
            >
              {renderEquipmentCard(false)}
              {renderItemsCard(false)}
            </div>
            {renderMochilaFooter(false)}
          </div>
        ) : (
          /* TELA DEDICADA MOBILE VERTICAL — MOCHILA */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%', flexShrink: 0 }}>
            {renderEquipmentCard(true)}
            {renderItemsCard(true)}
            {renderMochilaFooter(true)}
          </div>
        )}
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


