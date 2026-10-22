import React, { useState, useMemo, useCallback } from 'react';
import type { MapProject, MapMarker } from '../../types/map';
import type {
  GlobalEventRule,
  ObjectiveKind,
  ObjectiveCountingMode,
  ProjectQuestsConfig,
  QuestConditionGroup,
  QuestConditionLeaf,
  QuestDefinition,
  QuestEngineEvent,
  QuestFlowNodeType,
  QuestGraphEdge,
  QuestGraphNode,
  QuestObjectiveDefinition,
  QuestRewardCategory,
  QuestRewardItem,
  QuestStageFlowOperator,
  QuestStageStep,
  QuestValidationIssue,
  RewardGrantMoment,
} from '../../types/questSystem';
import {
  QUEST_NODE_LIBRARY,
  QUEST_TEMPLATES_CATALOG,
  buildGraphFromStages,
  createFromQuestTemplate,
  createInitialQuestRuntimeProgress,
  dispatchQuestEngineEvent,
  getOrCreateProjectQuestsConfig,
  grantXpCentralService,
  runAcceptanceScenario,
  saveProjectQuestsConfigToStorage,
  summarizeRewardItems,
  validateProjectQuests,
} from '../../utils/questEngine';
import { getOrCreateItemCatalog, ITEM_CURRENCIES_METADATA } from '../../utils/inventoryHelpers';
import {
  Plus,
  Trash2,
  Play,
  CheckCircle2,
  GitBranch,
  ListOrdered,
  Award,
  Globe,
  Search,
  Undo2,
  Redo2,
  Copy,
  Link2,
  RefreshCw,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';

interface QuestEditorStudioProps {
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  mode: 'standalone' | 'phase_mirror';
  selectedPhaseMarker?: MapMarker | null;
  onSelectPhaseMarker?: (markerId: string) => void;
  showToast: (msg: string) => void;
}

type EditorSubView =
  | 'assistant'
  | 'graph'
  | 'rewards'
  | 'global_rules'
  | 'simulator'
  | 'validator';

const OBJECTIVE_KIND_OPTIONS: Array<{
  value: ObjectiveKind;
  label: string;
  emoji: string;
}> = [
  { value: 'talk_npc', label: 'Conversar com NPC específico', emoji: '💬' },
  { value: 'buy_item', label: 'Comprar item na loja (confirmado)', emoji: '🛒' },
  { value: 'sell_item', label: 'Vender item à loja (distinto de entrega)', emoji: '💰' },
  { value: 'trade_barter', label: 'Trocar / Barter item A por B (bilateral)', emoji: '🔄' },
  { value: 'open_shop', label: 'Visitar / Abrir loja específica', emoji: '🏪' },
  { value: 'collect_item', label: 'Coletar / Extrair item (ervas, Booblerock)', emoji: '⛏️' },
  { value: 'possess_item', label: 'Possuir X unidades no inventário', emoji: '🎒' },
  { value: 'deliver_item', label: 'Entregar item ao NPC (consumo transacional)', emoji: '🎁' },
  { value: 'refine_material', label: 'Refinar matéria-prima em bancada', emoji: '🔥' },
  { value: 'craft_recipe', label: 'Fabricar receita na estação correta', emoji: '⚗️' },
  { value: 'read_document', label: 'Ler livro, carta ou pergaminho (distinto de posse)', emoji: '📖' },
  { value: 'equip_item', label: 'Equipar item', emoji: '🛡️' },
  { value: 'defeat_mob', label: 'Derrotar N mobs (com filtro de espécie/região)', emoji: '⚔️' },
  { value: 'win_duel', label: 'Vencer Duelo / Batalha de Cartas', emoji: '🃏' },
  { value: 'reach_level', label: 'Alcançar Nível (level >= N)', emoji: '⭐' },
  { value: 'enter_region', label: 'Descobrir / Entrar em Região', emoji: '🧭' },
  { value: 'defend_npc_timer', label: 'Proteger NPC / Sobreviver por tempo', emoji: '⏱️' },
];

export const QuestEditorStudio: React.FC<QuestEditorStudioProps> = ({
  project,
  onUpdateProject,
  mode,
  selectedPhaseMarker,
  onSelectPhaseMarker,
  showToast,
}) => {
  const questsConfig = useMemo(() => getOrCreateProjectQuestsConfig(project), [project]);
  const itemCatalog = useMemo(() => getOrCreateItemCatalog(project), [project]);

  const [selectedQuestId, setSelectedQuestId] = useState<string>(
    () => questsConfig.activeQuestId || questsConfig.quests[0]?.id || ''
  );
  const [subView, setSubView] = useState<EditorSubView>('assistant');
  const [searchQuery, setSearchQuery] = useState('');
  const [phaseFilterOnly, setPhaseFilterOnly] = useState<boolean>(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedObjectiveId, setSelectedObjectiveId] = useState<string | null>(null);
  const [graphZoom, setGraphZoom] = useState<number>(1);
  const [connectingFromNodeId, setConnectingFromNodeId] = useState<string | null>(null);
  const [connectingPort, setConnectingPort] = useState<'success' | 'failure' | 'alternative'>('success');

  // Undo / Redo history stack
  const [undoStack, setUndoStack] = useState<ProjectQuestsConfig[]>([]);
  const [redoStack, setRedoStack] = useState<ProjectQuestsConfig[]>([]);

  // Automated test suite results
  const [scenarioResults, setScenarioResults] = useState<
    Array<{
      scenarioNumber: number;
      title: string;
      passed: boolean;
      stepsLog: string[];
    }> | null
  >(null);

  // Simulator inputs
  const [simXpAmount, setSimXpAmount] = useState<number>(100);
  const [simNpcId, setSimNpcId] = useState<string>('npc_viajante_1');
  const [simShopId, setSimShopId] = useState<string>('shop_viajante_1');
  const [simItemId, setSimItemId] = useState<string>('item_cristal_mercador_a');
  const [simQty, setSimQty] = useState<number>(2);
  const [simLogs, setSimLogs] = useState<string[]>([]);

  const commitQuestsConfig = useCallback(
    (nextConfig: ProjectQuestsConfig, recordHistory = true) => {
      if (recordHistory) {
        setUndoStack((prev) => [...prev.slice(-19), questsConfig]);
        setRedoStack([]);
      }
      saveProjectQuestsConfigToStorage(nextConfig);
      onUpdateProject({
        questsConfig: nextConfig,
      });
    },
    [questsConfig, onUpdateProject]
  );

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevConfig = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, questsConfig]);
    setUndoStack((u) => u.slice(0, -1));
    commitQuestsConfig(prevConfig, false);
    showToast('↩️ Desfeito no Editor de Quests.');
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const nextConfig = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, questsConfig]);
    setRedoStack((r) => r.slice(0, -1));
    commitQuestsConfig(nextConfig, false);
    showToast('↪️ Refeito no Editor de Quests.');
  };

  const filteredQuests = useMemo(() => {
    return questsConfig.quests.filter((q) => {
      if (phaseFilterOnly && mode === 'phase_mirror') {
        const matchesPhase =
          !q.involvedPhaseIds ||
          q.involvedPhaseIds.length === 0 ||
          q.involvedPhaseIds.includes(project.id) ||
          q.primaryPhaseId === project.id;
        if (!matchesPhase) return false;
      }
      if (!searchQuery.trim()) return true;
      const s = searchQuery.toLowerCase();
      return (
        q.title.toLowerCase().includes(s) ||
        q.id.toLowerCase().includes(s) ||
        (q.chapterId || '').toLowerCase().includes(s) ||
        q.description.toLowerCase().includes(s)
      );
    });
  }, [questsConfig.quests, phaseFilterOnly, mode, project.id, searchQuery]);

  const activeQuest: QuestDefinition | null = useMemo(() => {
    return (
      questsConfig.quests.find((q) => q.id === selectedQuestId) ||
      filteredQuests[0] ||
      questsConfig.quests[0] ||
      null
    );
  }, [questsConfig.quests, selectedQuestId, filteredQuests]);

  const allValidationIssues: QuestValidationIssue[] = useMemo(() => {
    return validateProjectQuests({ ...project, questsConfig });
  }, [project, questsConfig]);

  const validationIssues = useMemo(() => {
    if (!activeQuest) return allValidationIssues;
    return allValidationIssues.filter((i) => i.questId === activeQuest.id);
  }, [allValidationIssues, activeQuest]);

  const updateActiveQuest = (updater: (q: QuestDefinition) => QuestDefinition) => {
    if (!activeQuest) return;
    const updatedQuest = updater(activeQuest);
    const nextQuests = questsConfig.quests.map((q) =>
      q.id === activeQuest.id ? { ...updatedQuest, updatedAt: new Date().toISOString() } : q
    );
    commitQuestsConfig({
      ...questsConfig,
      quests: nextQuests,
    });
  };

  // Create quest from template
  const handleCreateQuestFromTemplate = (templateId: string) => {
    const newQuest = createFromQuestTemplate(templateId);
    const nextConfig: ProjectQuestsConfig = {
      ...questsConfig,
      quests: [newQuest, ...questsConfig.quests],
      activeQuestId: newQuest.id,
      playerState: {
        ...questsConfig.playerState,
        questsProgress: {
          ...questsConfig.playerState.questsProgress,
          [newQuest.id]: createInitialQuestRuntimeProgress(newQuest),
        },
      },
    };
    commitQuestsConfig(nextConfig);
    setSelectedQuestId(newQuest.id);
    showToast(`✨ Quest criada a partir do modelo "${newQuest.title}"!`);
  };

  // Duplicate active quest
  const handleDuplicateQuest = () => {
    if (!activeQuest) return;
    const copyId = `${activeQuest.id}_copy_${Date.now().toString(36).slice(-4)}`;
    const copy: QuestDefinition = {
      ...JSON.parse(JSON.stringify(activeQuest)),
      id: copyId,
      title: `${activeQuest.title} (Cópia)`,
      updatedAt: new Date().toISOString(),
    };
    commitQuestsConfig({
      ...questsConfig,
      quests: [copy, ...questsConfig.quests],
      playerState: {
        ...questsConfig.playerState,
        questsProgress: {
          ...questsConfig.playerState.questsProgress,
          [copyId]: createInitialQuestRuntimeProgress(copy),
        },
      },
    });
    setSelectedQuestId(copyId);
    showToast(`📋 Quest duplicada como "${copy.title}"`);
  };

  // Delete quest
  const handleDeleteQuest = (questId: string) => {
    if (questsConfig.quests.length <= 1) {
      showToast('⚠️ Mantenha ao menos uma quest na biblioteca.');
      return;
    }
    const nextQuests = questsConfig.quests.filter((q) => q.id !== questId);
    commitQuestsConfig({
      ...questsConfig,
      quests: nextQuests,
    });
    setSelectedQuestId(nextQuests[0]?.id || '');
    showToast('🗑️ Quest removida.');
  };

  // Add new step/objective in Assistant mode and auto-sync Graph
  const handleAddObjectiveStep = (prefillMarker?: MapMarker | null) => {
    if (!activeQuest) return;
    const newObjId = `obj_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const isStation = prefillMarker?.behavior === 'station';
    const newObj: QuestObjectiveDefinition = {
      id: newObjId,
      title: prefillMarker
        ? `${activeQuest.objectives.length + 1}. Interagir com ${prefillMarker.name}`
        : `${activeQuest.objectives.length + 1}. Nova Etapa de Missão`,
      description: prefillMarker
        ? `Interaja com ${prefillMarker.name} no mapa.`
        : 'Configure os requisitos desta etapa no inspetor lateral.',
      kind: isStation ? 'craft_recipe' : 'talk_npc',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetMarkerId: prefillMarker?.id,
      targetNpcId: prefillMarker ? prefillMarker.id : 'npc_viajante_1',
      targetNpcName: prefillMarker ? prefillMarker.name : 'Viajante 1',
      targetShopId: prefillMarker?.shopId,
    };

    const newStage: QuestStageStep = {
      id: `stg_${Date.now().toString(36)}`,
      order: activeQuest.stages.length + 1,
      title: `Etapa ${activeQuest.stages.length + 1}: ${newObj.title}`,
      flowOperator: 'SEQUENTIAL',
      objectiveIds: [newObjId],
    };

    updateActiveQuest((q) => {
      const nextObjectives = [...q.objectives, newObj];
      const nextStages = [...q.stages, newStage];
      const { nodes, edges } = buildGraphFromStages(nextStages, nextObjectives);
      return {
        ...q,
        objectives: nextObjectives,
        stages: nextStages,
        nodes,
        edges,
      };
    });
    setSelectedObjectiveId(newObjId);
    showToast(
      prefillMarker
        ? `🎯 Objetivo criado e vinculado a "${prefillMarker.name}"!`
        : '➕ Nova etapa adicionada à quest (Grafo sincronizado).'
    );
  };

  const handleUpdateObjective = (
    objId: string,
    updates: Partial<QuestObjectiveDefinition>
  ) => {
    updateActiveQuest((q) => {
      const nextObjectives = q.objectives.map((o) =>
        o.id === objId ? { ...o, ...updates } : o
      );
      const { nodes, edges } = buildGraphFromStages(q.stages, nextObjectives);
      return {
        ...q,
        objectives: nextObjectives,
        nodes,
        edges,
      };
    });
  };

  const handleDeleteObjective = (objId: string) => {
    updateActiveQuest((q) => {
      const nextObjectives = q.objectives.filter((o) => o.id !== objId);
      const nextStages = q.stages
        .map((st) => ({
          ...st,
          objectiveIds: st.objectiveIds.filter((id) => id !== objId),
        }))
        .filter((st) => st.objectiveIds.length > 0);
      const { nodes, edges } = buildGraphFromStages(nextStages, nextObjectives);
      return {
        ...q,
        objectives: nextObjectives,
        stages: nextStages,
        nodes,
        edges,
      };
    });
    if (selectedObjectiveId === objId) setSelectedObjectiveId(null);
  };

  // Add node in Graph Mode
  const handleAddGraphNode = (nodeType: QuestFlowNodeType) => {
    if (!activeQuest) return;
    const meta = QUEST_NODE_LIBRARY.find((n) => n.type === nodeType);
    const newNodeId = `node_${nodeType}_${Date.now().toString(36)}`;
    const count = activeQuest.nodes.length;

    let linkedObjId: string | undefined;
    let extraObjectives = activeQuest.objectives;
    let extraStages = activeQuest.stages;

    if (nodeType === 'objective') {
      const newObjId = `obj_${Date.now().toString(36)}`;
      linkedObjId = newObjId;
      const newObj: QuestObjectiveDefinition = {
        id: newObjId,
        title: `Objetivo #${extraObjectives.length + 1}`,
        description: 'Requisito acompanhado pelo motor',
        kind: 'talk_npc',
        countingMode: 'events_after_activation',
        requiredAmount: 1,
        targetNpcId: 'npc_viajante_1',
        targetNpcName: 'Viajante 1',
      };
      extraObjectives = [...extraObjectives, newObj];
      extraStages = [
        ...extraStages,
        {
          id: `stg_${Date.now().toString(36)}`,
          order: extraStages.length + 1,
          title: newObj.title,
          flowOperator: 'SEQUENTIAL',
          objectiveIds: [newObjId],
        },
      ];
    }

    const newNode: QuestGraphNode = {
      id: newNodeId,
      type: nodeType,
      title: meta ? meta.label : nodeType,
      subtitle: meta ? meta.description : '',
      x: 120 + (count % 4) * 250,
      y: 120 + Math.floor(count / 4) * 140,
      objectiveId: linkedObjId,
      nOfMRequired: nodeType === 'n_of_m_gate' ? 2 : undefined,
      repeatMaxCount: nodeType === 'repeat_limit' ? 3 : undefined,
      timerSeconds: nodeType === 'timer' || nodeType === 'wait' ? 60 : undefined,
    };

    updateActiveQuest((q) => ({
      ...q,
      objectives: extraObjectives,
      stages: extraStages,
      nodes: [...q.nodes, newNode],
    }));
    setSelectedNodeId(newNodeId);
    showToast(`🧩 Nó "${newNode.title}" adicionado ao grafo.`);
  };

  const handleConnectNodes = (targetNodeId: string) => {
    if (!activeQuest || !connectingFromNodeId || connectingFromNodeId === targetNodeId) {
      setConnectingFromNodeId(null);
      return;
    }
    const edgeExists = activeQuest.edges.some(
      (e) =>
        e.fromNodeId === connectingFromNodeId &&
        e.toNodeId === targetNodeId &&
        e.portType === connectingPort
    );
    if (!edgeExists) {
      const newEdge: QuestGraphEdge = {
        id: `edge_${Date.now().toString(36)}`,
        fromNodeId: connectingFromNodeId,
        toNodeId: targetNodeId,
        portType: connectingPort,
        label:
          connectingPort === 'success'
            ? 'Sucesso'
            : connectingPort === 'failure'
            ? 'Falha'
            : 'Alternativa',
      };
      updateActiveQuest((q) => ({
        ...q,
        edges: [...q.edges, newEdge],
      }));
      showToast('🔗 Conexão criada no grafo!');
    }
    setConnectingFromNodeId(null);
  };

  const handleAutoAlignGraph = () => {
    if (!activeQuest) return;
    updateActiveQuest((q) => ({
      ...q,
      nodes: q.nodes.map((n, idx) => ({
        ...n,
        x: 80 + (idx % 4) * 260,
        y: 100 + Math.floor(idx / 4) * 145,
      })),
    }));
    showToast('📐 Nós alinhados automaticamente.');
  };

  // Add Reward Item (Section 19)
  const handleAddRewardItem = (category: QuestRewardCategory) => {
    if (!activeQuest) return;
    const newReward: QuestRewardItem = {
      id: `rew_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
      category,
      label:
        category === 'xp'
          ? '250 XP para o Herói'
          : category === 'currency'
          ? '100 Moedas de Ouro'
          : category === 'inventory_item'
          ? '1x Item de Recompensa'
          : category === 'card'
          ? '1x Carta Rara'
          : category === 'unlock_content'
          ? 'Acesso à Nova Região'
          : category === 'world_change'
          ? 'Flag de Mundo Ativada'
          : '+10 Reputação',
      grantMoment: 'on_quest_complete',
      visibility: 'revealed',
      xpAmount: category === 'xp' ? 250 : undefined,
      xpTarget: category === 'xp' ? 'player' : undefined,
      currencyType: category === 'currency' ? 'gold' : undefined,
      currencyAmount: category === 'currency' ? 100 : undefined,
      itemId: category === 'inventory_item' ? itemCatalog[0]?.id || 'item-herb-emerald' : undefined,
      itemName: category === 'inventory_item' ? itemCatalog[0]?.name || 'Erva Esmeralda' : undefined,
      itemQuantity: category === 'inventory_item' ? 1 : undefined,
      fullBackpackPolicy: category === 'inventory_item' ? 'pending_claim_outbox' : undefined,
      cardId: category === 'card' ? 'card_slime_real' : undefined,
      cardName: category === 'card' ? 'Carta Rara: Slime Real' : undefined,
      cardRarity: category === 'card' ? 'rare' : undefined,
      unlockTargetType: category === 'unlock_content' ? 'region' : undefined,
      unlockTargetId: category === 'unlock_content' ? 'region_mina_cristal' : undefined,
      unlockTargetName: category === 'unlock_content' ? 'Mina de Cristal' : undefined,
      worldFlagKey: category === 'world_change' ? 'ponte_reparada' : undefined,
      worldFlagValue: category === 'world_change' ? true : undefined,
      reputationFactionId: category === 'reputation' ? 'viajante_guilda' : undefined,
      reputationDelta: category === 'reputation' ? 10 : undefined,
    };

    updateActiveQuest((q) => ({
      ...q,
      rewards: [...q.rewards, newReward],
    }));
    showToast('🎁 Prêmio adicionado à aba Recompensas / Ganhos.');
  };

  // Phase map entities for visual linking (Section 17)
  const phaseEntities = useMemo(() => {
    const markers = project.markers || [];
    return {
      allMarkers: markers,
      biomes: project.biomes || [],
    };
  }, [project.markers, project.biomes]);

  const activeRuntimeQuest = activeQuest
    ? questsConfig.playerState.questsProgress[activeQuest.id]
    : undefined;

  const selectedNode = activeQuest?.nodes.find((n) => n.id === selectedNodeId) || null;
  const selectedObjective =
    activeQuest?.objectives.find(
      (o) => o.id === (selectedObjectiveId || selectedNode?.objectiveId)
    ) ||
    activeQuest?.objectives[0] ||
    null;

  return (
    <div className="flex flex-col h-full w-full bg-zinc-950 text-white select-none overflow-hidden">
      {/* BARRA SUPERIOR DO QUEST EDITOR */}
      <div className="px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-white">
                {mode === 'standalone'
                  ? 'Editor de Quests & Progressão Global (V2)'
                  : 'Painel Espelhado de Quests na Fase'}
              </h2>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Sincronizado Bidirecional
              </span>
            </div>
            <p className="text-[10px] text-zinc-400">
              Motor único de eventos tipados, comércio (compra/venda/barter), grafo ramificado e pacotes atômicos de recompensa
            </p>
          </div>
        </div>

        {/* Sub-Abas de Modo do Editor */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 overflow-x-auto">
          <button
            type="button"
            onClick={() => setSubView('assistant')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'assistant'
                ? 'bg-amber-500 text-black shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span>Assistente (Etapas)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('graph')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'graph'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Modo Avançado (Grafo)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('rewards')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'rewards'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Recompensas / Ganhos ({activeQuest?.rewards.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('global_rules')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'global_rules'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Progressão Global ({questsConfig.globalRules.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('simulator')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'simulator'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>Simulador & Cenários E2E</span>
          </button>

          <button
            type="button"
            onClick={() => setSubView('validator')}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'validator'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Validador ({validationIssues.length})</span>
          </button>
        </div>

        {/* Ações Rápidas (Desfazer, Refazer, Duplicar) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-750 text-zinc-300 cursor-pointer"
            title="Desfazer (Undo)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="p-1.5 rounded-lg bg-zinc-850 hover:bg-zinc-800 disabled:opacity-40 border border-zinc-750 text-zinc-300 cursor-pointer"
            title="Refazer (Redo)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleDuplicateQuest}
            className="px-2.5 py-1 rounded-lg bg-zinc-850 hover:bg-zinc-800 border border-zinc-750 text-[11px] font-semibold text-zinc-200 flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>Duplicar</span>
          </button>
        </div>
      </div>

      {/* BANNER CONTEXTUAL QUANDO UM MARCADOR DA FASE ESTÁ SELECIONADO (SEÇÃO 3 & 17) */}
      {selectedPhaseMarker && (
        <div className="px-4 py-2 bg-amber-500/15 border-b border-amber-500/30 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <Link2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="text-amber-200">
              Elemento selecionado na fase:{' '}
              <strong className="text-white">{selectedPhaseMarker.name}</strong> (
              <code className="text-[10px] text-amber-300">{selectedPhaseMarker.behavior}</code>)
            </span>
          </div>
          <button
            type="button"
            onClick={() => handleAddObjectiveStep(selectedPhaseMarker)}
            className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Criar objetivo com este elemento</span>
          </button>
        </div>
      )}

      {/* CORPO PRINCIPAL: 3 COLUNAS */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUNA ESQUERDA: LISTA DE QUESTS + MODELOS PRONTOS + BIBLIOTECA DE NÓS */}
        <aside className="w-72 border-r border-zinc-850 bg-zinc-950/90 flex flex-col overflow-hidden shrink-0">
          <div className="p-3 border-b border-zinc-850 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar quest por nome, ID ou capítulo..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {mode === 'phase_mirror' && (
              <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={phaseFilterOnly}
                  onChange={(e) => setPhaseFilterOnly(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Apenas quests aplicáveis a esta fase</span>
              </label>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Biblioteca de Quests ({filteredQuests.length})
              </span>
              <button
                type="button"
                onClick={() => handleCreateQuestFromTemplate('tpl_negocios_viajante')}
                className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Nova</span>
              </button>
            </div>

            {filteredQuests.map((q) => {
              const isSelected = activeQuest?.id === q.id;
              const runtimeStatus =
                questsConfig.playerState.questsProgress[q.id]?.status || 'available';
              const issuesCount = allValidationIssues.filter(
                (i) => i.questId === q.id && i.severity === 'error'
              ).length;

              return (
                <div
                  key={q.id}
                  onClick={() => setSelectedQuestId(q.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 border-amber-500 shadow-sm'
                      : 'bg-zinc-900/40 hover:bg-zinc-900/80 border-zinc-850'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <span className="text-xs font-bold text-white leading-snug">
                      {q.title}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteQuest(q.id);
                      }}
                      className="text-zinc-500 hover:text-red-400 p-0.5 cursor-pointer"
                      title="Excluir quest"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                      {q.objectives.length} objetivos
                    </span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold uppercase ${
                        runtimeStatus === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : runtimeStatus === 'active'
                          ? 'bg-blue-500/20 text-blue-300'
                          : runtimeStatus === 'available'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {runtimeStatus}
                    </span>
                    {issuesCount > 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40">
                        ⚠️ {issuesCount} erro(s)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Modelos Prontos Essenciais (Seção 7 & 8) */}
            <div className="pt-3 mt-3 border-t border-zinc-850 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block px-1">
                Modelos Prontos (Seções 7, 8 e 20)
              </span>
              {QUEST_TEMPLATES_CATALOG.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleCreateQuestFromTemplate(tpl.id)}
                  className="w-full text-left p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-850 hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-zinc-200">{tpl.title}</span>
                    <span className="text-[9px] font-mono text-amber-400">{tpl.badge}</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 line-clamp-2 mt-0.5">
                    {tpl.description}
                  </p>
                </button>
              ))}
            </div>

            {/* Biblioteca de 16 Nós quando no Modo Grafo (Seção 3) */}
            {subView === 'graph' && (
              <div className="pt-3 mt-3 border-t border-zinc-850 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 block px-1">
                  Biblioteca de Nós (16 Tipos)
                </span>
                <div className="grid grid-cols-2 gap-1">
                  {QUEST_NODE_LIBRARY.map((n) => (
                    <button
                      key={n.type}
                      type="button"
                      onClick={() => handleAddGraphNode(n.type)}
                      className="p-1.5 rounded-lg bg-zinc-900 hover:bg-indigo-950/50 border border-zinc-800 hover:border-indigo-500/40 text-left transition-all cursor-pointer"
                      title={n.description}
                    >
                      <div className="text-[10px] font-bold text-white truncate">
                        {n.emoji} {n.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* COLUNA CENTRAL: CONTEÚDO PRINCIPAL DO MODO ATIVO */}
        <main className="flex-1 overflow-y-auto p-4 bg-zinc-950 space-y-4">
          {activeQuest ? (
            <>
              {/* CABEÇALHO DA QUEST SELECIONADA */}
              <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                      Título da Quest (ID Estável: <code className="text-amber-400">{activeQuest.id}</code>)
                    </label>
                    <input
                      type="text"
                      value={activeQuest.title}
                      onChange={(e) =>
                        updateActiveQuest((q) => ({ ...q, title: e.target.value }))
                      }
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-sm font-bold text-white"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase text-zinc-400 block mb-1">
                      Política de Repetição & Modo
                    </label>
                    <div className="flex gap-1.5">
                      <select
                        value={activeQuest.repeatablePolicy}
                        onChange={(e) =>
                          updateActiveQuest((q) => ({
                            ...q,
                            repeatablePolicy: e.target.value as QuestDefinition['repeatablePolicy'],
                          }))
                        }
                        className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="once">Única (1x por Save)</option>
                        <option value="repeatable">Repetível</option>
                        <option value="daily">Diária</option>
                      </select>

                      <button
                        type="button"
                        onClick={() =>
                          setSubView(subView === 'assistant' ? 'graph' : 'assistant')
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 text-[11px] font-bold cursor-pointer shrink-0"
                      >
                        {subView === 'assistant' ? '⚡ Ver Grafo' : '📋 Ver Lista'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Linha-Resumo de Recompensas (Seção 19) */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-emerald-400">
                      🎁 Resumo de Ganhos:
                    </span>
                    <span className="font-mono font-semibold text-zinc-200 bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
                      {summarizeRewardItems(activeQuest.rewards, project)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ==================================================================== */}
              {/* MODO 1: ASSISTENTE DE QUEST (LISTA ORDENADA DE ETAPAS) - SEÇÃO 3 */}
              {/* ==================================================================== */}
              {subView === 'assistant' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                        Etapas e Objetivos da Missão ({activeQuest.objectives.length})
                      </h3>
                      <p className="text-[11px] text-zinc-400">
                        Adicione etapas em lista simples ou converta para o Modo Avançado — Grafo a qualquer momento (mesmo modelo de dados).
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddObjectiveStep(null)}
                        className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Adicionar Etapa</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSubView('graph')}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>Modo Avançado — Grafo</span>
                      </button>
                    </div>
                  </div>

                  {/* Lista de Objetivos */}
                  <div className="space-y-2.5">
                    {activeQuest.objectives.map((obj, index) => {
                      const isObjSelected = selectedObjective?.id === obj.id;
                      const prog = activeRuntimeQuest?.objectivesProgress[obj.id];
                      const kindMeta = OBJECTIVE_KIND_OPTIONS.find((k) => k.value === obj.kind);

                      return (
                        <div
                          key={obj.id}
                          onClick={() => setSelectedObjectiveId(obj.id)}
                          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isObjSelected
                              ? 'bg-zinc-900 border-amber-500 shadow-md'
                              : 'bg-zinc-900/50 hover:bg-zinc-900 border-zinc-850'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5">
                              <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono text-xs font-bold flex items-center justify-center shrink-0">
                                {index + 1}
                              </span>
                              <div>
                                <div className="flex items-center flex-wrap gap-1.5">
                                  <span className="text-xs font-bold text-white">
                                    {obj.title}
                                  </span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-950 text-amber-300 border border-zinc-800">
                                    {kindMeta?.emoji || '🎯'} {obj.kind}
                                  </span>
                                  {obj.isOptional && (
                                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                      Opcional / Bônus
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                  {obj.description}
                                </p>

                                <div className="flex flex-wrap items-center gap-3 mt-1.5 text-[11px] text-zinc-400 font-mono">
                                  {obj.targetNpcName && (
                                    <span>
                                      NPC: <strong className="text-zinc-200">{obj.targetNpcName}</strong>
                                    </span>
                                  )}
                                  {obj.targetShopId && (
                                    <span>
                                      Loja: <strong className="text-amber-300">{obj.targetShopId}</strong>
                                    </span>
                                  )}
                                  {obj.targetItemName && (
                                    <span>
                                      Item: <strong className="text-emerald-300">{obj.targetItemName}</strong>
                                    </span>
                                  )}
                                  {obj.targetRegionId && (
                                    <span>
                                      Região: <strong className="text-blue-300">{obj.targetRegionId}</strong>
                                    </span>
                                  )}
                                  <span>
                                    Meta:{' '}
                                    <strong className="text-white">
                                      {prog ? `${prog.currentAmount}/${obj.requiredAmount}` : `0/${obj.requiredAmount}`}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {prog && (
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                                    prog.status === 'completed'
                                      ? 'bg-emerald-500/20 text-emerald-300'
                                      : prog.status === 'active'
                                      ? 'bg-blue-500/20 text-blue-300'
                                      : 'bg-zinc-800 text-zinc-400'
                                  }`}
                                >
                                  {prog.status}
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteObjective(obj.id);
                                }}
                                className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==================================================================== */}
              {/* MODO 2: MODO AVANÇADO — GRAFO DE NÓS RAMIFICADOS (SEÇÃO 3 & 6) */}
              {/* ==================================================================== */}
              {subView === 'graph' && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900 p-2.5 rounded-xl border border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-indigo-300">
                        Canvas do Grafo ({activeQuest.nodes.length} nós, {activeQuest.edges.length} conexões)
                      </span>
                      {connectingFromNodeId && (
                        <span className="px-2 py-0.5 rounded bg-amber-500 text-black text-[10px] font-extrabold animate-pulse">
                          Clique no nó de destino para conectar ({connectingPort})...
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <select
                        value={connectingPort}
                        onChange={(e) =>
                          setConnectingPort(e.target.value as 'success' | 'failure' | 'alternative')
                        }
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-2 py-1 text-[11px] text-white"
                      >
                        <option value="success">Porta: Sucesso (Verde)</option>
                        <option value="failure">Porta: Falha (Vermelho)</option>
                        <option value="alternative">Porta: Alternativa / Else (Âmbar)</option>
                      </select>

                      <button
                        type="button"
                        onClick={handleAutoAlignGraph}
                        className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-[11px] font-semibold text-zinc-200 cursor-pointer"
                      >
                        📐 Alinhar Nós
                      </button>

                      <button
                        type="button"
                        onClick={() => setGraphZoom((z) => Math.max(0.6, +(z - 0.15).toFixed(2)))}
                        className="px-2 py-1 rounded bg-zinc-800 text-xs font-mono"
                      >
                        -
                      </button>
                      <span className="text-[11px] font-mono text-zinc-400">
                        {Math.round(graphZoom * 100)}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setGraphZoom((z) => Math.min(1.4, +(z + 0.15).toFixed(2)))}
                        className="px-2 py-1 rounded bg-zinc-800 text-xs font-mono"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Canvas Visual com Conexões SVG e Nós */}
                  <div className="relative w-full h-[500px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-auto">
                    <div
                      className="relative min-w-[1400px] min-h-[750px]"
                      style={{
                        transform: `scale(${graphZoom})`,
                        transformOrigin: 'top left',
                        backgroundImage:
                          'radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)',
                        backgroundSize: '24px 24px',
                      }}
                    >
                      <svg className="absolute inset-0 w-full h-full pointer-events-none">
                        {activeQuest.edges.map((edge) => {
                          const fromNode = activeQuest.nodes.find((n) => n.id === edge.fromNodeId);
                          const toNode = activeQuest.nodes.find((n) => n.id === edge.toNodeId);
                          if (!fromNode || !toNode) return null;
                          const x1 = fromNode.x + 190;
                          const y1 = fromNode.y + 42;
                          const x2 = toNode.x;
                          const y2 = toNode.y + 42;
                          const stroke =
                            edge.portType === 'failure'
                              ? '#ef4444'
                              : edge.portType === 'alternative'
                              ? '#f59e0b'
                              : '#10b981';

                          return (
                            <g key={edge.id}>
                              <path
                                d={`M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}`}
                                fill="none"
                                stroke={stroke}
                                strokeWidth={2.5}
                              />
                              <circle cx={x2} cy={y2} r={4} fill={stroke} />
                              {edge.label && (
                                <text
                                  x={(x1 + x2) / 2}
                                  y={(y1 + y2) / 2 - 6}
                                  fill={stroke}
                                  fontSize="10"
                                  textAnchor="middle"
                                  className="font-mono font-bold"
                                >
                                  {edge.label}
                                </text>
                              )}
                            </g>
                          );
                        })}
                      </svg>

                      {activeQuest.nodes.map((node) => {
                        const isSelected = selectedNodeId === node.id;
                        const meta = QUEST_NODE_LIBRARY.find((m) => m.type === node.type);
                        const linkedObj = node.objectiveId
                          ? activeQuest.objectives.find((o) => o.id === node.objectiveId)
                          : undefined;
                        const prog = linkedObj
                          ? activeRuntimeQuest?.objectivesProgress[linkedObj.id]
                          : undefined;

                        return (
                          <div
                            key={node.id}
                            onClick={() => {
                              if (connectingFromNodeId) {
                                handleConnectNodes(node.id);
                              } else {
                                setSelectedNodeId(node.id);
                                if (node.objectiveId) setSelectedObjectiveId(node.objectiveId);
                              }
                            }}
                            style={{ left: node.x, top: node.y }}
                            className={`absolute w-48 p-2.5 rounded-xl border shadow-lg transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-zinc-900 border-amber-400 ring-2 ring-amber-400/30'
                                : prog?.status === 'completed'
                                ? 'bg-emerald-950/60 border-emerald-500/60'
                                : 'bg-zinc-900/95 border-zinc-750 hover:border-zinc-600'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="text-[10px] font-mono font-bold uppercase text-amber-400 truncate">
                                {meta?.emoji || '🔹'} {node.type}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConnectingFromNodeId(node.id);
                                }}
                                className="px-1.5 py-0.5 rounded bg-indigo-600/30 hover:bg-indigo-600 text-[9px] text-indigo-200 font-bold cursor-pointer"
                              >
                                Conectar →
                              </button>
                            </div>

                            <div className="text-xs font-bold text-white leading-snug line-clamp-2">
                              {linkedObj ? linkedObj.title : node.title}
                            </div>

                            {linkedObj && (
                              <div className="mt-1.5 pt-1.5 border-t border-zinc-800 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                                <span className="truncate">
                                  {linkedObj.targetShopId || linkedObj.targetNpcName || linkedObj.kind}
                                </span>
                                <span className="text-emerald-300 font-bold">
                                  {prog
                                    ? `${prog.currentAmount}/${linkedObj.requiredAmount}`
                                    : `0/${linkedObj.requiredAmount}`}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Linha do Tempo dos Passos Concluídos (Seção 3) */}
                  <div className="p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-2">
                      ⏱️ Linha do Tempo dos Passos Concluídos (Runtime)
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto pb-1">
                      {activeQuest.objectives.map((obj, i) => {
                        const prog = activeRuntimeQuest?.objectivesProgress[obj.id];
                        const done = prog?.status === 'completed';
                        return (
                          <React.Fragment key={obj.id}>
                            <div
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono shrink-0 ${
                                done
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold'
                                  : prog?.status === 'active'
                                  ? 'bg-blue-500/20 border-blue-500/40 text-blue-300'
                                  : 'bg-zinc-950 border-zinc-800 text-zinc-500'
                              }`}
                            >
                              {obj.title} ({prog?.currentAmount || 0}/{obj.requiredAmount})
                            </div>
                            {i < activeQuest.objectives.length - 1 && (
                              <ArrowRight className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================================== */}
              {/* MODO 3: ABA RECOMPENSAS / GANHOS (SEÇÃO 19) */}
              {/* ==================================================================== */}
              {subView === 'rewards' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                        Pacote de Recompensas / Ganhos (Reward Bundle Atômico)
                      </h3>
                      <p className="text-[11px] text-zinc-300 mt-0.5">
                        Linha-Resumo: <strong>{summarizeRewardItems(activeQuest.rewards, project)}</strong>
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { category: 'xp', label: '+ XP' },
                          { category: 'currency', label: '+ Moeda' },
                          { category: 'inventory_item', label: '+ Item' },
                          { category: 'card', label: '+ Carta' },
                          { category: 'unlock_content', label: '+ Desbloqueio' },
                          { category: 'world_change', label: '+ Mundo/Flag' },
                          { category: 'reputation', label: '+ Reputação' },
                        ] as Array<{ category: QuestRewardCategory; label: string }>
                      ).map((btn) => (
                        <button
                          key={btn.category}
                          type="button"
                          onClick={() => handleAddRewardItem(btn.category)}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-[11px] font-extrabold cursor-pointer"
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Lista Configurável de Prêmios */}
                  <div className="space-y-2.5">
                    {activeQuest.rewards.map((rew) => (
                      <div
                        key={rew.id}
                        className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <input
                            type="text"
                            value={rew.label}
                            onChange={(e) =>
                              updateActiveQuest((q) => ({
                                ...q,
                                rewards: q.rewards.map((r) =>
                                  r.id === rew.id ? { ...r, label: e.target.value } : r
                                ),
                              }))
                            }
                            className="bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-xs font-bold text-amber-300 flex-1"
                          />
                          <div className="flex items-center gap-2">
                            <select
                              value={rew.grantMoment}
                              onChange={(e) =>
                                updateActiveQuest((q) => ({
                                  ...q,
                                  rewards: q.rewards.map((r) =>
                                    r.id === rew.id
                                      ? { ...r, grantMoment: e.target.value as RewardGrantMoment }
                                      : r
                                  ),
                                }))
                              }
                              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white"
                            >
                              <option value="on_quest_complete">Momento: Fim da Quest</option>
                              <option value="on_stage_complete">Momento: Fim de Etapa</option>
                              <option value="on_branch_chosen">Momento: Escolha de Rota</option>
                              <option value="on_first_completion_only">Apenas 1ª Conclusão</option>
                            </select>

                            <select
                              value={rew.visibility}
                              onChange={(e) =>
                                updateActiveQuest((q) => ({
                                  ...q,
                                  rewards: q.rewards.map((r) =>
                                    r.id === rew.id
                                      ? {
                                          ...r,
                                          visibility: e.target.value as QuestRewardItem['visibility'],
                                        }
                                      : r
                                  ),
                                }))
                              }
                              className="bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white"
                            >
                              <option value="revealed">Visível ao Jogador</option>
                              <option value="preview">Antecipada</option>
                              <option value="hidden">Oculta / Secreta</option>
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                updateActiveQuest((q) => ({
                                  ...q,
                                  rewards: q.rewards.filter((r) => r.id !== rew.id),
                                }))
                              }
                              className="p-1 text-zinc-400 hover:text-red-400 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {rew.category === 'xp' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <label className="text-[10px] text-zinc-400 block">Quantidade de XP</label>
                              <input
                                type="number"
                                value={rew.xpAmount ?? 250}
                                onChange={(e) =>
                                  updateActiveQuest((q) => ({
                                    ...q,
                                    rewards: q.rewards.map((r) =>
                                      r.id === rew.id
                                        ? {
                                            ...r,
                                            xpAmount: parseInt(e.target.value) || 0,
                                            label: `${parseInt(e.target.value) || 0} XP`,
                                          }
                                        : r
                                    ),
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 font-mono text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block">Alvo do XP</label>
                              <select
                                value={rew.xpTarget || 'player'}
                                onChange={(e) =>
                                  updateActiveQuest((q) => ({
                                    ...q,
                                    rewards: q.rewards.map((r) =>
                                      r.id === rew.id
                                        ? { ...r, xpTarget: e.target.value as any }
                                        : r
                                    ),
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-white"
                              >
                                <option value="player">Jogador Principal</option>
                                <option value="active_character">Personagem Ativo</option>
                                <option value="all_party">Todo o Grupo / Slimes</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block">Rota Exclusiva (Opcional)</label>
                              <input
                                type="text"
                                value={rew.stageOrBranchId || ''}
                                onChange={(e) =>
                                  updateActiveQuest((q) => ({
                                    ...q,
                                    rewards: q.rewards.map((r) =>
                                      r.id === rew.id
                                        ? { ...r, stageOrBranchId: e.target.value || undefined }
                                        : r
                                    ),
                                  }))
                                }
                                placeholder="Ex: route_commerce"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 font-mono text-white"
                              />
                            </div>
                          </div>
                        )}

                        {rew.category === 'currency' && (
                          <div className="grid grid-cols-2 gap-2.5 text-xs">
                            <div>
                              <label className="text-[10px] text-zinc-400 block">Moeda</label>
                              <select
                                value={rew.currencyType || 'gold'}
                                onChange={(e) =>
                                  updateActiveQuest((q) => ({
                                    ...q,
                                    rewards: q.rewards.map((r) =>
                                      r.id === rew.id
                                        ? { ...r, currencyType: e.target.value as any }
                                        : r
                                    ),
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 text-white"
                              >
                                {ITEM_CURRENCIES_METADATA.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.emoji} {c.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block">Valor</label>
                              <input
                                type="number"
                                value={rew.currencyAmount ?? 100}
                                onChange={(e) =>
                                  updateActiveQuest((q) => ({
                                    ...q,
                                    rewards: q.rewards.map((r) =>
                                      r.id === rew.id
                                        ? { ...r, currencyAmount: parseInt(e.target.value) || 0 }
                                        : r
                                    ),
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 font-mono text-white"
                              />
                            </div>
                          </div>
                        )}

                        {rew.category === 'inventory_item' && (
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                            <div>
                              <label className="text-[10px] text-zinc-400 block">Item do Catálogo</label>
                              <select
                                value={rew.itemId || ''}
                                onChange={(e) => {
                                  const found = itemCatalog.find((i) => i.id === e.target.value);
                                  updateActiveQuest((q) => ({
                                    ...q,
                                    rewards: q.rewards.map((r) =>
                                      r.id === rew.id
                                        ? {
                                            ...r,
                                            itemId: e.target.value,
                                            itemName: found?.name || e.target.value,
                                          }
                                        : r
                                    ),
                                  }));
                                }}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white"
                              >
                                {itemCatalog.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.name} ({item.id})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block">Quantidade</label>
                              <input
                                type="number"
                                min={1}
                                value={rew.itemQuantity ?? 1}
                                onChange={(e) =>
                                  updateActiveQuest((q) => ({
                                    ...q,
                                    rewards: q.rewards.map((r) =>
                                      r.id === rew.id
                                        ? { ...r, itemQuantity: Math.max(1, parseInt(e.target.value) || 1) }
                                        : r
                                    ),
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 font-mono text-white"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-zinc-400 block">Política Mochila Cheia</label>
                              <select
                                value={rew.fullBackpackPolicy || 'pending_claim_outbox'}
                                onChange={(e) =>
                                  updateActiveQuest((q) => ({
                                    ...q,
                                    rewards: q.rewards.map((r) =>
                                      r.id === rew.id
                                        ? { ...r, fullBackpackPolicy: e.target.value as any }
                                        : r
                                    ),
                                  }))
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white"
                              >
                                <option value="pending_claim_outbox">Guardar na Caixa de Resgate Pendente</option>
                                <option value="overflow_slot">Permitir Slot Extra Temporário</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ==================================================================== */}
              {/* MODO 4: EDITOR DE PROGRESSÃO GLOBAL & REGRAS FORA DE QUEST (SEÇÃO 2.3 & 7) */}
              {/* ==================================================================== */}
              {subView === 'global_rules' && (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-300">
                        Regras Globais de Eventos (Independentes de Quest)
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Exemplo da Seção 7: Alcançar Nível 2 dispara <code>unlock_shop(shop_viajante_1)</code> e persiste entre fases mesmo fora de qualquer quest.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newRule: GlobalEventRule = {
                          id: `grule_${Date.now().toString(36)}`,
                          name: 'Nova Regra Global de Desbloqueio',
                          description: 'Dispara ação persistente ao satisfazer condição global',
                          enabled: true,
                          oncePerSave: true,
                          triggerEventType: 'player.level_reached',
                          conditionGroup: {
                            id: `cg_${Date.now()}`,
                            operator: 'AND',
                            conditions: [
                              {
                                id: `c_${Date.now()}`,
                                subject: 'player_level',
                                comparator: '>=',
                                value: 2,
                              },
                            ],
                          },
                          actions: [
                            {
                              id: `act_${Date.now()}`,
                              type: 'unlock_shop',
                              targetId: 'shop_viajante_1',
                              targetName: 'Loja do Viajante 1',
                            },
                          ],
                        };
                        commitQuestsConfig({
                          ...questsConfig,
                          globalRules: [...questsConfig.globalRules, newRule],
                        });
                        showToast('🌐 Regra Global adicionada!');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                    >
                      + Nova Regra Global
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {questsConfig.globalRules.map((rule) => {
                      const alreadyExecuted =
                        questsConfig.playerState.firedGlobalRuleIds.includes(rule.id);
                      return (
                        <div
                          key={rule.id}
                          className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{rule.name}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300">
                                Gatilho: {rule.triggerEventType}
                              </span>
                              {alreadyExecuted && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                                  ✓ Disparada e Persistida
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-zinc-400 mt-1 font-mono">
                              Ações: {rule.actions.map((a) => `${a.type}(${a.targetId})`).join(', ')}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              commitQuestsConfig({
                                ...questsConfig,
                                globalRules: questsConfig.globalRules.filter(
                                  (r) => r.id !== rule.id
                                ),
                              })
                            }
                            className="p-1.5 text-zinc-400 hover:text-red-400 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ==================================================================== */}
              {/* MODO 5: SIMULADOR, DEBUGGER E SUÍTE DE CENÁRIOS E2E (SEÇÕES 13, 14, 20) */}
              {/* ==================================================================== */}
              {subView === 'simulator' && (
                <div className="space-y-4">
                  {/* Painel de Estado do Jogador no Runtime */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                      <span className="text-[10px] text-zinc-400 block">Nível / XP do Herói</span>
                      <span className="text-sm font-extrabold font-mono text-emerald-400">
                        Nv. {questsConfig.playerState.currentLevel} ({questsConfig.playerState.currentLevelXp} XP)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                      <span className="text-[10px] text-zinc-400 block">Lojas Desbloqueadas</span>
                      <span className="text-xs font-bold font-mono text-amber-300">
                        {questsConfig.playerState.unlockedShopIds.join(', ') || 'Nenhuma'}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                      <span className="text-[10px] text-zinc-400 block">Receitas Liberadas</span>
                      <span className="text-xs font-bold font-mono text-indigo-300">
                        {questsConfig.playerState.unlockedRecipeIds.length} receita(s)
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850">
                      <span className="text-[10px] text-zinc-400 block">Regiões Liberadas</span>
                      <span className="text-xs font-bold font-mono text-blue-300">
                        {questsConfig.playerState.unlockedRegionIds.length} região(ões)
                      </span>
                    </div>
                    <div className="flex items-center justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          const freshQuestsProgress: Record<string, any> = {};
                          for (const q of questsConfig.quests) {
                            freshQuestsProgress[q.id] = createInitialQuestRuntimeProgress(q);
                          }
                          commitQuestsConfig({
                            ...questsConfig,
                            playerState: {
                              ...questsConfig.playerState,
                              currentLevel: 1,
                              currentLevelXp: 0,
                              totalCumulativeXp: 0,
                              unlockedShopIds: [],
                              firedGlobalRuleIds: [],
                              processedEventIds: [],
                              rewardReceipts: [],
                              questsProgress: freshQuestsProgress,
                            },
                          });
                          setSimLogs(['🔄 Simulador resetado para o Nível 1 (0 XP).']);
                          showToast('🔄 Estado do Simulador resetado!');
                        }}
                        className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-200 flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Resetar Simulador</span>
                      </button>
                    </div>
                  </div>

                  {/* Disparador de Eventos Reais no Motor */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-blue-400">
                      ⚡ Simular Eventos Reais no Event Bus Central
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                      <div>
                        <label className="text-[10px] text-zinc-400 block">NPC Alvo</label>
                        <input
                          type="text"
                          value={simNpcId}
                          onChange={(e) => setSimNpcId(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block">Loja (shopId)</label>
                        <input
                          type="text"
                          value={simShopId}
                          onChange={(e) => setSimShopId(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-zinc-400 block">Item (SKU / ID)</label>
                        <input
                          type="text"
                          value={simItemId}
                          onChange={(e) => setSimItemId(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1 font-mono text-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const res = grantXpCentralService(project, simXpAmount, 'Simulador XP');
                          onUpdateProject({
                            questsConfig: res.updatedProject.questsConfig,
                            player: res.updatedProject.player,
                          });
                          setSimLogs((prev) => [...res.logs, ...prev]);
                          showToast(`✨ +${simXpAmount} XP concedido! Nível atual: ${res.newLevel}`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                      >
                        ⭐ Conceder +{simXpAmount} XP (Subir Nível)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const ev: QuestEngineEvent = {
                            id: `sim_talk_${Date.now()}`,
                            type: 'npc.talked',
                            timestamp: new Date().toISOString(),
                            playerId: 'hero_1',
                            sourceModule: 'simulator',
                            payload: { npcId: simNpcId, npcName: simNpcId },
                          };
                          const res = dispatchQuestEngineEvent(project, ev);
                          onUpdateProject({ questsConfig: res.updatedProject.questsConfig });
                          setSimLogs((prev) => [...res.logs, ...prev]);
                          showToast(`💬 Evento npc.talked(${simNpcId}) enviado!`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                      >
                        💬 Conversar com {simNpcId}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const ev: QuestEngineEvent = {
                            id: `sim_buy_${Date.now()}`,
                            type: 'commerce.purchase_completed',
                            timestamp: new Date().toISOString(),
                            playerId: 'hero_1',
                            sourceModule: 'simulator',
                            transactionId: `tx_buy_${Date.now()}`,
                            payload: {
                              shopId: simShopId,
                              itemId: simItemId,
                              quantity: simQty,
                              currencyType: 'gold',
                            },
                          };
                          const res = dispatchQuestEngineEvent(project, ev);
                          onUpdateProject({ questsConfig: res.updatedProject.questsConfig });
                          setSimLogs((prev) => [...res.logs, ...prev]);
                          showToast(`🛒 Compra confirmada na loja ${simShopId}!`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold cursor-pointer"
                      >
                        🛒 Comprar {simQty}x {simItemId} em {simShopId}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const ev: QuestEngineEvent = {
                            id: `sim_sell_${Date.now()}`,
                            type: 'commerce.sale_completed',
                            timestamp: new Date().toISOString(),
                            playerId: 'hero_1',
                            sourceModule: 'simulator',
                            transactionId: `tx_sell_${Date.now()}`,
                            payload: {
                              shopId: simShopId,
                              itemId: 'item_booblerock_bruto',
                              itemName: 'Minério Booblerock Bruto',
                              quantity: 1,
                            },
                          };
                          const res = dispatchQuestEngineEvent(project, ev);
                          onUpdateProject({ questsConfig: res.updatedProject.questsConfig });
                          setSimLogs((prev) => [...res.logs, ...prev]);
                          showToast(`💰 Venda de Booblerock registrada em ${simShopId}!`);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-black text-xs font-extrabold cursor-pointer"
                      >
                        💰 Vender 1x Booblerock em {simShopId}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const ev: QuestEngineEvent = {
                            id: `sim_barter_${Date.now()}`,
                            type: 'commerce.trade_completed',
                            timestamp: new Date().toISOString(),
                            playerId: 'hero_1',
                            sourceModule: 'simulator',
                            transactionId: `tx_barter_${Date.now()}`,
                            payload: {
                              shopId: simShopId,
                              itemId: 'item_catalisador_b',
                              itemName: 'Catalisador Arcano (Item B)',
                              quantity: 1,
                              barterGivenItemId: 'item-herb-emerald',
                              barterGivenQuantity: 3,
                            },
                          };
                          const res = dispatchQuestEngineEvent(project, ev);
                          onUpdateProject({ questsConfig: res.updatedProject.questsConfig });
                          setSimLogs((prev) => [...res.logs, ...prev]);
                          showToast('🔄 Troca (Barter) 3x Ervas ➔ 1x Item B concluída!');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold cursor-pointer"
                      >
                        🔄 Trocar (Barter) 3x Ervas → Item B
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const ev: QuestEngineEvent = {
                            id: `sim_craft_${Date.now()}`,
                            type: 'crafting.recipe_crafted',
                            timestamp: new Date().toISOString(),
                            playerId: 'hero_1',
                            sourceModule: 'simulator',
                            payload: {
                              stationId: 'station_bancada_alquimica',
                              recipeId: 'recipe_elixir_viajante',
                              itemId: 'item_elixir_viajante',
                              itemName: 'Elixir do Viajante',
                              quantity: 1,
                            },
                          };
                          const res = dispatchQuestEngineEvent(project, ev);
                          onUpdateProject({ questsConfig: res.updatedProject.questsConfig });
                          setSimLogs((prev) => [...res.logs, ...prev]);
                          showToast('⚗️ Receita fabricada na bancada!');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                      >
                        ⚗️ Fabricar Elixir na Bancada
                      </button>
                    </div>
                  </div>

                  {/* SUÍTE AUTOMÁTICA DE CENÁRIOS DE ACEITAÇÃO PONTA A PONTA (SEÇÕES 14 e 20) */}
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                          🧪 Bateria Automática Ponta a Ponta (Cenários 1 a 6 + Critérios A a J)
                        </h4>
                        <p className="text-[11px] text-zinc-400">
                          Executa todos os 6 fluxos combinados do documento e valida idempotência, comércio, múltiplos níveis e recompensas.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          let workingProj = { ...project };
                          const list: Array<{
                            scenarioNumber: number;
                            title: string;
                            passed: boolean;
                            stepsLog: string[];
                          }> = [];
                          for (const num of [1, 2, 3, 4, 5, 6] as const) {
                            const r = runAcceptanceScenario(workingProj, num);
                            workingProj = r.updatedProject;
                            list.push({
                              scenarioNumber: num,
                              title: r.title,
                              passed: r.passed,
                              stepsLog: r.stepsLog,
                            });
                          }
                          setScenarioResults(list);
                          onUpdateProject({
                            questsConfig: workingProj.questsConfig,
                            player: workingProj.player,
                            playerInventory: workingProj.playerInventory,
                          });
                          showToast('✅ Todos os 6 Cenários Combinados executados e verificados!');
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-md"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Executar Todos os 6 Cenários do Documento</span>
                      </button>
                    </div>

                    {scenarioResults && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                        {scenarioResults.map((sc) => (
                          <div
                            key={sc.scenarioNumber}
                            className={`p-3 rounded-xl border ${
                              sc.passed
                                ? 'bg-emerald-950/20 border-emerald-500/40'
                                : 'bg-red-950/20 border-red-500/40'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-white">
                                {sc.title}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                                  sc.passed
                                    ? 'bg-emerald-500/20 text-emerald-300'
                                    : 'bg-red-500/20 text-red-300'
                                }`}
                              >
                                {sc.passed ? 'PASSOU 100%' : 'FALHOU'}
                              </span>
                            </div>
                            <ul className="mt-2 space-y-1 text-[11px] text-zinc-300 font-mono max-h-40 overflow-y-auto">
                              {sc.stepsLog.map((line, i) => (
                                <li key={i}>{line}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Log de Auditoria do Simulador */}
                  {simLogs.length > 0 && (
                    <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        📜 Log do Motor de Eventos (Debug em Tempo Real)
                      </span>
                      <div className="max-h-48 overflow-y-auto space-y-1 font-mono text-[11px] text-zinc-300">
                        {simLogs.map((l, idx) => (
                          <div key={idx} className="p-1.5 rounded bg-zinc-950 border border-zinc-850">
                            {l}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ==================================================================== */}
              {/* MODO 6: VALIDADOR DE INTEGRIDADE E REFERÊNCIAS (SEÇÃO 12.6 e 13) */}
              {/* ==================================================================== */}
              {subView === 'validator' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-white">
                      Relatório do Validador Estático e Referencial
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Verifica ciclos sem saída, nós órfãos, itens inexistentes ou protegidos, entregas sem obtenção e vínculos de fase.
                    </p>
                  </div>

                  {validationIssues.length === 0 ? (
                    <div className="p-6 rounded-xl bg-emerald-950/20 border border-emerald-500/40 text-center space-y-1">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                      <div className="text-sm font-bold text-emerald-300">
                        Nenhum erro encontrado! Grafo e referências 100% íntegros.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {validationIssues.map((issue) => (
                        <div
                          key={issue.id}
                          className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 ${
                            issue.severity === 'error'
                              ? 'bg-red-950/25 border-red-500/50 text-red-200'
                              : 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                          }`}
                        >
                          <div className="space-y-1 text-xs">
                            <div className="font-bold">
                              {issue.severity === 'error' ? '❌ ERRO: ' : '⚠️ AVISO: '}
                              {issue.title}
                            </div>
                            <p>{issue.details}</p>
                            <p className="text-[11px] opacity-80">
                              💡 Sugestão: {issue.fixSuggestion}
                            </p>
                          </div>
                          {issue.nodeOrObjectiveId && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedObjectiveId(issue.nodeOrObjectiveId!);
                                setSubView('assistant');
                              }}
                              className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 text-[11px] font-bold text-white shrink-0 cursor-pointer"
                            >
                              Religar Referência →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="p-8 text-center text-zinc-500">
              Selecione ou crie uma quest na coluna esquerda.
            </div>
          )}
        </main>

        {/* COLUNA DIREITA: INSPETOR CONTEXTUAL DO OBJETIVO / NÓ + VÍNCULOS REAIS DA FASE */}
        <aside className="w-80 border-l border-zinc-850 bg-zinc-950/95 overflow-y-auto p-3.5 space-y-4 shrink-0">
          {selectedObjective && activeQuest ? (
            <>
              <div className="border-b border-zinc-850 pb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block">
                  Inspetor Contextual da Etapa / Nó
                </span>
                <h3 className="text-xs font-extrabold text-white mt-0.5">
                  {selectedObjective.title}
                </h3>
                <code className="text-[10px] text-zinc-500">{selectedObjective.id}</code>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
                    Tipo de Evento / Objetivo (Seção 4)
                  </label>
                  <select
                    value={selectedObjective.kind}
                    onChange={(e) =>
                      handleUpdateObjective(selectedObjective.id, {
                        kind: e.target.value as ObjectiveKind,
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono"
                  >
                    {OBJECTIVE_KIND_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.emoji} {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
                    Título da Etapa
                  </label>
                  <input
                    type="text"
                    value={selectedObjective.title}
                    onChange={(e) =>
                      handleUpdateObjective(selectedObjective.id, {
                        title: e.target.value,
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-semibold text-zinc-400 uppercase block mb-1">
                    Descrição ao Jogador (HUD / Journal)
                  </label>
                  <input
                    type="text"
                    value={selectedObjective.description}
                    onChange={(e) =>
                      handleUpdateObjective(selectedObjective.id, {
                        description: e.target.value,
                      })
                    }
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>

                {/* Seletor Visual de Vínculo com Elementos da Fase (Seção 17) */}
                <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-amber-400 block">
                    📍 Vínculo com NPC / Elemento do Mapa
                  </span>
                  <input
                    type="text"
                    value={selectedObjective.targetNpcId || ''}
                    onChange={(e) =>
                      handleUpdateObjective(selectedObjective.id, {
                        targetNpcId: e.target.value,
                        targetNpcName: e.target.value,
                      })
                    }
                    placeholder="ID do NPC, Estação, Objeto..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-xs font-mono text-white"
                  />

                  {phaseEntities.allMarkers.length > 0 && (
                    <div>
                      <label className="text-[10px] text-zinc-400 block mb-1">
                        Ou escolha um marcador real da fase atual:
                      </label>
                      <select
                        value={selectedObjective.targetMarkerId || ''}
                        onChange={(e) => {
                          const marker = phaseEntities.allMarkers.find(
                            (m) => m.id === e.target.value
                          );
                          if (marker) {
                            handleUpdateObjective(selectedObjective.id, {
                              targetMarkerId: marker.id,
                              targetNpcId: marker.id,
                              targetNpcName: marker.name,
                              targetShopId: marker.shopId || selectedObjective.targetShopId,
                            });
                            if (onSelectPhaseMarker) onSelectPhaseMarker(marker.id);
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-zinc-300"
                      >
                        <option value="">-- Vincular Marcador da Fase ({phaseEntities.allMarkers.length}) --</option>
                        {phaseEntities.allMarkers.map((m) => (
                          <option key={m.id} value={m.id}>
                            [{m.behavior}] {m.name} ({m.id})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Filtros Comerciais e de Inventário (Seção 4.2 e 4.3) */}
                <div className="p-2.5 rounded-xl bg-zinc-900/90 border border-zinc-800 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-emerald-400 block">
                    🏪 Filtros de Item, Loja, Troca (Barter) & Região
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block">Loja (targetShopId)</label>
                      <input
                        type="text"
                        value={selectedObjective.targetShopId || ''}
                        onChange={(e) =>
                          handleUpdateObjective(selectedObjective.id, {
                            targetShopId: e.target.value || undefined,
                          })
                        }
                        placeholder="Ex: shop_viajante_1"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block">Quantidade Alvo</label>
                      <input
                        type="number"
                        min={1}
                        value={selectedObjective.requiredAmount}
                        onChange={(e) =>
                          handleUpdateObjective(selectedObjective.id, {
                            requiredAmount: Math.max(1, parseInt(e.target.value) || 1),
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-zinc-400 block">Item Alvo (SKU / Catálogo)</label>
                    <select
                      value={selectedObjective.targetItemId || ''}
                      onChange={(e) => {
                        const it = itemCatalog.find((x) => x.id === e.target.value);
                        handleUpdateObjective(selectedObjective.id, {
                          targetItemId: e.target.value || undefined,
                          targetItemName: it?.name || e.target.value || undefined,
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white"
                    >
                      <option value="">-- Nenhum / Qualquer Item --</option>
                      {itemCatalog.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.name} ({it.id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedObjective.kind === 'trade_barter' && (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-zinc-800">
                      <div>
                        <label className="text-[10px] text-purple-300 block">Dar Item (Barter)</label>
                        <input
                          type="text"
                          value={selectedObjective.barterGiveItemId || ''}
                          onChange={(e) =>
                            handleUpdateObjective(selectedObjective.id, {
                              barterGiveItemId: e.target.value || undefined,
                            })
                          }
                          placeholder="item-herb-emerald"
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-purple-300 block">Qtd Entregue</label>
                        <input
                          type="number"
                          min={1}
                          value={selectedObjective.barterGiveAmount ?? 3}
                          onChange={(e) =>
                            handleUpdateObjective(selectedObjective.id, {
                              barterGiveAmount: Math.max(1, parseInt(e.target.value) || 1),
                            })
                          }
                          className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-zinc-400 block">Região / Bioma</label>
                      <input
                        type="text"
                        value={selectedObjective.targetRegionId || ''}
                        onChange={(e) =>
                          handleUpdateObjective(selectedObjective.id, {
                            targetRegionId: e.target.value || undefined,
                          })
                        }
                        placeholder="Ex: region_floresta"
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] font-mono text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 block">Modo de Contagem</label>
                      <select
                        value={selectedObjective.countingMode}
                        onChange={(e) =>
                          handleUpdateObjective(selectedObjective.id, {
                            countingMode: e.target.value as ObjectiveCountingMode,
                          })
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-[11px] text-white"
                      >
                        <option value="events_after_activation">Eventos Após Ativar</option>
                        <option value="strict_source_after_activation">Origem Comprovada Após Ativar</option>
                        <option value="retroactive_state">Contar Posse Prévia</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-500">
              Selecione uma etapa ou nó para editar suas propriedades.
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};
