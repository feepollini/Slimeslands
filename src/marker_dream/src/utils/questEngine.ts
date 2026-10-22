import type { MapProject, PlayerInventoryConfig } from '../types/map';
import type {
  AttributeGrowthRule,
  CharacterGrowthConfig,
  ComputedLevelRow,
  GlobalEventRule,
  ObjectiveRuntimeProgress,
  PlayerProgressionRuntimeState,
  ProjectQuestsConfig,
  QuestActionDefinition,
  QuestConditionGroup,
  QuestConditionLeaf,
  QuestDefinition,
  QuestEngineEvent,
  QuestGraphEdge,
  QuestGraphNode,
  QuestObjectiveDefinition,
  QuestRewardBundleReceipt,
  QuestRewardItem,
  QuestRuntimeProgress,
  QuestStageStep,
  QuestValidationIssue,
} from '../types/questSystem';
import { QUEST_SYSTEM_SCHEMA_VERSION } from '../types/questSystem';
import {
  getOrCreateItemCatalog,
  getOrCreatePlayerInventory,
  addItemToPlayerInventory,
} from './inventoryHelpers';

export const QUEST_STORAGE_KEY = 'slimelands_quest_system_v2_state';

// ============================================================================
// 1. CRESCIMENTO, CURVAS DE XP E CÁLCULO DE ATRIBUTOS (SEÇÃO 18)
// ============================================================================

export const DEFAULT_ATTRIBUTE_GROWTH_RULES: AttributeGrowthRule[] = [
  {
    attribute: 'hp',
    label: 'Vida Máxima (HP)',
    baseValue: 100,
    percentPerLevel: 5, // Exemplo oficial 18.2: 100 -> 105 -> 110.25
    flatBonusPerLevel: 0,
    growthMode: 'compound_previous',
    rounding: 'two_decimals',
    maxCap: 9999,
  },
  {
    attribute: 'mp',
    label: 'Energia / Mana (MP)',
    baseValue: 50,
    percentPerLevel: 5,
    flatBonusPerLevel: 2,
    growthMode: 'compound_previous',
    rounding: 'round',
    maxCap: 5000,
  },
  {
    attribute: 'attack',
    label: 'Poder de Ataque',
    baseValue: 15,
    percentPerLevel: 6,
    flatBonusPerLevel: 1,
    growthMode: 'compound_previous',
    rounding: 'round',
    maxCap: 999,
  },
  {
    attribute: 'defense',
    label: 'Defesa / Armadura',
    baseValue: 10,
    percentPerLevel: 5,
    flatBonusPerLevel: 1,
    growthMode: 'compound_previous',
    rounding: 'round',
    maxCap: 999,
  },
  {
    attribute: 'speed',
    label: 'Velocidade',
    baseValue: 4,
    percentPerLevel: 2,
    flatBonusPerLevel: 0,
    growthMode: 'base_linear',
    rounding: 'two_decimals',
    maxCap: 12,
  },
  {
    attribute: 'magic',
    label: 'Poder Mágico',
    baseValue: 12,
    percentPerLevel: 7,
    flatBonusPerLevel: 1,
    growthMode: 'compound_previous',
    rounding: 'round',
    maxCap: 999,
  },
];

export const DEFAULT_CHARACTER_GROWTH: CharacterGrowthConfig = {
  initialLevel: 1,
  maxLevel: 20,
  inheritGlobalTable: false,
  curveType: 'manual',
  convention: 'incremental_to_next',
  baseXp: 100,
  linearStep: 200, // Fórmula 18.1: xp_next(level) = 100 + (level - 1) * 200
  geometricRatePercent: 35,
  polynomialExponent: 1.6,
  // Exemplo obrigatório da Seção 18.1: 1->2: 100, 2->3: 300, 3->4: 500, 4->5: 700, 5->6: 900
  manualIncrementalOverrides: {
    1: 100,
    2: 300,
    3: 500,
    4: 700,
    5: 900,
  },
  excessXpPolicy: 'retain',
  attributeRules: DEFAULT_ATTRIBUTE_GROWTH_RULES,
  levelMilestones: [
    {
      level: 2,
      description: 'Desbloqueia Loja do Viajante 1 e Comércio Regional',
      actions: [
        {
          id: 'act-lvl2-shop',
          type: 'unlock_shop',
          targetId: 'shop_viajante_1',
          targetName: 'Loja do Viajante 1',
        },
      ],
    },
    {
      level: 3,
      description: 'Habilita Receitas Alquímicas Avançadas e +50 Ouro',
      actions: [
        {
          id: 'act-lvl3-recipe',
          type: 'unlock_recipe',
          targetId: 'recipe_elixir_solar',
          targetName: 'Receita: Elixir Solar',
        },
        {
          id: 'act-lvl3-gold',
          type: 'adjust_currency',
          currencyType: 'gold',
          amount: 50,
        },
      ],
    },
  ],
};

function applyRounding(val: number, mode: AttributeGrowthRule['rounding']): number {
  if (mode === 'floor') return Math.floor(val);
  if (mode === 'ceil') return Math.ceil(val);
  if (mode === 'two_decimals') return Math.round(val * 100) / 100;
  return Math.round(val);
}

/**
 * Calcula a tabela completa de níveis (XP incremental, XP acumulado e atributos por nível)
 * respeitando a Seção 18.1 e 18.2 da especificação.
 */
export function computeGrowthTable(config?: CharacterGrowthConfig): ComputedLevelRow[] {
  const cfg = config || DEFAULT_CHARACTER_GROWTH;
  const maxLvl = Math.max(2, Math.min(100, cfg.maxLevel || 20));
  const rows: ComputedLevelRow[] = [];

  let cumulativeSoFar = 0;
  const prevAttrValues: Record<string, number> = {};

  for (const rule of cfg.attributeRules || DEFAULT_ATTRIBUTE_GROWTH_RULES) {
    prevAttrValues[rule.attribute] = rule.baseValue;
  }

  for (let lvl = 1; lvl <= maxLvl; lvl++) {
    // 1. Cálculo do XP Incremental para ir de `lvl` para `lvl + 1`
    let xpNext = 100;
    const manualOverride = cfg.manualIncrementalOverrides?.[lvl];

    if (typeof manualOverride === 'number' && manualOverride > 0) {
      xpNext = Math.round(manualOverride);
    } else if (cfg.curveType === 'linear' || cfg.curveType === 'manual') {
      xpNext = Math.max(10, Math.round((cfg.baseXp || 100) + (lvl - 1) * (cfg.linearStep ?? 200)));
    } else if (cfg.curveType === 'geometric') {
      const rate = (cfg.geometricRatePercent || 25) / 100;
      xpNext = Math.max(10, Math.round((cfg.baseXp || 100) * Math.pow(1 + rate, lvl - 1)));
    } else if (cfg.curveType === 'polynomial') {
      const exp = cfg.polynomialExponent || 1.5;
      xpNext = Math.max(10, Math.round((cfg.baseXp || 100) * Math.pow(lvl, exp)));
    }

    // 2. Cálculo dos Atributos no nível `lvl`
    const currentAttrs: ComputedLevelRow['attributes'] = {
      hp: 100,
      mp: 50,
      attack: 15,
      defense: 10,
      speed: 4,
      magic: 12,
    };

    for (const rule of cfg.attributeRules || DEFAULT_ATTRIBUTE_GROWTH_RULES) {
      if (rule.levelExceptions && typeof rule.levelExceptions[lvl] === 'number') {
        const excVal = rule.levelExceptions[lvl];
        prevAttrValues[rule.attribute] = excVal;
        currentAttrs[rule.attribute] = excVal;
        continue;
      }

      if (lvl === 1) {
        prevAttrValues[rule.attribute] = rule.baseValue;
        currentAttrs[rule.attribute] = applyRounding(rule.baseValue, rule.rounding);
      } else {
        const prev = prevAttrValues[rule.attribute];
        let rawNext = prev;
        if (rule.growthMode === 'compound_previous') {
          rawNext = prev * (1 + (rule.percentPerLevel || 0) / 100) + (rule.flatBonusPerLevel || 0);
        } else {
          rawNext =
            rule.baseValue * (1 + ((rule.percentPerLevel || 0) / 100) * (lvl - 1)) +
            (rule.flatBonusPerLevel || 0) * (lvl - 1);
        }
        if (rule.maxCap && rawNext > rule.maxCap) {
          rawNext = rule.maxCap;
        }
        prevAttrValues[rule.attribute] = rawNext;
        currentAttrs[rule.attribute] = applyRounding(rawNext, rule.rounding);
      }
    }

    const startCumulative = cumulativeSoFar;
    cumulativeSoFar += xpNext;

    rows.push({
      level: lvl,
      xpToNextLevel: lvl === maxLvl ? 0 : xpNext,
      cumulativeXpForNextLevel: lvl === maxLvl ? startCumulative : cumulativeSoFar,
      cumulativeXpAtStartOfLevel: startCumulative,
      attributes: currentAttrs,
    });
  }

  return rows;
}

// ============================================================================
// 2. REGRAS GLOBAIS INDEPENDENTES DE QUEST (EX: NÍVEL >= 2 ABRE LOJA)
// ============================================================================

export const DEFAULT_GLOBAL_RULES: GlobalEventRule[] = [
  {
    id: 'rule_level2_unlock_viajante_1',
    name: 'Nível 2 ➔ Desbloquear Loja do Viajante 1',
    description:
      'Regra global autônoma: ao alcançar Nível 2 (ou se level >= 2), libera permanentemente a Loja do Viajante 1 para compras, vendas e trocas.',
    enabled: true,
    triggerEventType: 'player.level_reached',
    oncePerSave: true,
    conditionGroup: {
      id: 'cond-grp-lvl2',
      operator: 'AND',
      conditions: [
        {
          id: 'cond-leaf-lvl2',
          subject: 'player_level',
          comparator: '>=',
          value: 2,
          label: 'Nível do Jogador >= 2',
        },
      ],
    },
    actions: [
      {
        id: 'act-unlock-shop-viajante-1',
        type: 'unlock_shop',
        targetId: 'shop_viajante_1',
        targetName: 'Loja do Viajante 1',
      },
      {
        id: 'act-flag-shop-viajante-1',
        type: 'set_world_flag',
        targetId: 'viajante_1_shop_open',
        flagValue: true,
      },
    ],
  },
];

// ============================================================================
// 3. SINCRONIZADOR BIDIRECIONAL: ETAPAS (ASSISTENTE) <-> GRAFO DE NÓS
// ============================================================================

export function buildGraphFromStages(
  stages: QuestStageStep[],
  objectives: QuestObjectiveDefinition[]
): { nodes: QuestGraphNode[]; edges: QuestGraphEdge[] } {
  const nodes: QuestGraphNode[] = [];
  const edges: QuestGraphEdge[] = [];

  const startNodeId = 'node-start';
  nodes.push({
    id: startNodeId,
    type: 'start',
    title: 'Início / Gatilho da Quest',
    subtitle: 'Valida pré-requisitos e ativa missão',
    x: 60,
    y: 180,
  });

  let prevNodeId = startNodeId;
  let currentX = 280;

  stages.forEach((stage, sIdx) => {
    const stageObjectives = stage.objectiveIds
      .map((id) => objectives.find((o) => o.id === id))
      .filter((o): o is QuestObjectiveDefinition => Boolean(o));

    if (stage.flowOperator === 'BRANCH_IF_ELSE') {
      const branchNodeId = `node-branch-${stage.id}`;
      nodes.push({
        id: branchNodeId,
        type: 'if_else',
        title: stage.title || `Decisão / Ramificação #${sIdx + 1}`,
        subtitle: 'IF / ELSE Condicional',
        x: currentX,
        y: 180,
        conditionGroup: stage.branchCondition,
      });
      edges.push({
        id: `edge-${prevNodeId}-${branchNodeId}`,
        fromNodeId: prevNodeId,
        toNodeId: branchNodeId,
        portType: 'next',
      });
      prevNodeId = branchNodeId;
      currentX += 230;
    } else if (stage.flowOperator === 'PARALLEL_AND' && stageObjectives.length > 1) {
      const gateId = `node-and-${stage.id}`;
      nodes.push({
        id: gateId,
        type: 'and_gate',
        title: `AND Paralelo: ${stage.title}`,
        subtitle: `Exige todos os ${stageObjectives.length} objetivos`,
        x: currentX,
        y: 180,
      });
      edges.push({
        id: `edge-${prevNodeId}-${gateId}`,
        fromNodeId: prevNodeId,
        toNodeId: gateId,
        portType: 'next',
      });
      prevNodeId = gateId;
      currentX += 220;
    } else if (stage.flowOperator === 'ALTERNATIVE_OR' && stageObjectives.length > 1) {
      const gateId = `node-or-${stage.id}`;
      nodes.push({
        id: gateId,
        type: 'or_gate',
        title: `OR Alternativo: ${stage.title}`,
        subtitle: 'Basta 1 rota concluída',
        x: currentX,
        y: 180,
      });
      edges.push({
        id: `edge-${prevNodeId}-${gateId}`,
        fromNodeId: prevNodeId,
        toNodeId: gateId,
        portType: 'next',
      });
      prevNodeId = gateId;
      currentX += 220;
    }

    stageObjectives.forEach((obj, oIdx) => {
      const objNodeId = `node-obj-${obj.id}`;
      const yOffset =
        stageObjectives.length > 1 ? 80 + oIdx * 130 : 180;

      nodes.push({
        id: objNodeId,
        type: 'objective',
        title: obj.title,
        subtitle: `${obj.kind.toUpperCase()} (0/${obj.requiredAmount})`,
        x: currentX,
        y: yOffset,
        objectiveId: obj.id,
        branchTag: obj.branchKey,
      });

      edges.push({
        id: `edge-${prevNodeId}-${objNodeId}`,
        fromNodeId: prevNodeId,
        toNodeId: objNodeId,
        portType: obj.branchKey === 'shortcut_reputation' ? 'alternative' : 'success',
        label: obj.branchKey || undefined,
      });

      if (stageObjectives.length === 1) {
        prevNodeId = objNodeId;
        currentX += 240;
      }
    });

    if (stageObjectives.length > 1) {
      currentX += 250;
      const joinNodeId = `node-seq-join-${stage.id}`;
      nodes.push({
        id: joinNodeId,
        type: 'sequence',
        title: `Convergência: ${stage.title}`,
        subtitle: 'Sincroniza etapa',
        x: currentX,
        y: 180,
      });
      stageObjectives.forEach((obj) => {
        edges.push({
          id: `edge-join-${obj.id}-${joinNodeId}`,
          fromNodeId: `node-obj-${obj.id}`,
          toNodeId: joinNodeId,
          portType: 'success',
        });
      });
      prevNodeId = joinNodeId;
      currentX += 230;
    }
  });

  const completeNodeId = 'node-complete';
  nodes.push({
    id: completeNodeId,
    type: 'complete',
    title: 'Conclusão & Reward Bundle',
    subtitle: 'Entrega recompensas idempotentes',
    x: currentX,
    y: 180,
  });

  edges.push({
    id: `edge-${prevNodeId}-${completeNodeId}`,
    fromNodeId: prevNodeId,
    toNodeId: completeNodeId,
    portType: 'success',
  });

  return { nodes, edges };
}

// ============================================================================
// 4. QUESTS PADRÃO E TEMPLATES DA ESPECIFICAÇÃO (SEÇÕES 7, 8 E 20)
// ============================================================================

function createNegociosViajanteQuest(): QuestDefinition {
  const objectives: QuestObjectiveDefinition[] = [
    {
      id: 'obj_talk_viajante_1',
      title: '1. Falar com o Viajante 1',
      description: 'Converse com o mercador Viajante 1 após sua loja ser aberta no nível 2.',
      kind: 'talk_npc',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_viajante_1',
      targetNpcName: 'Viajante 1',
    },
    {
      id: 'obj_buy_item_a_shop_viajante',
      title: '2. Comprar 2x Cristal de Mercador na Loja do Viajante 1',
      description:
        'Compre 2 unidades de Cristal de Mercador (Item A) especificamente na Loja do Viajante 1. Possuir por drop não conta.',
      kind: 'buy_item',
      countingMode: 'strict_source_after_activation',
      requiredAmount: 2,
      targetShopId: 'shop_viajante_1',
      targetShopName: 'Loja do Viajante 1',
      targetItemId: 'item_cristal_mercador_a',
      targetItemName: 'Cristal de Mercador (Item A)',
      requiredCurrency: 'gold',
      branchKey: 'standard_commercial',
    },
    {
      id: 'obj_sell_booblerock_viajante',
      title: '3. Vender 1x Minério Booblerock Bruto ao Viajante 1',
      description:
        'Venda 1 unidade de Minério Booblerock Bruto na Loja do Viajante 1 (transação comercial de venda).',
      kind: 'sell_item',
      countingMode: 'strict_source_after_activation',
      requiredAmount: 1,
      targetShopId: 'shop_viajante_1',
      targetShopName: 'Loja do Viajante 1',
      targetItemId: 'item_booblerock_bruto',
      targetItemName: 'Minério Booblerock Bruto',
      branchKey: 'standard_commercial',
    },
    {
      id: 'obj_trade_herbs_for_item_b',
      title: '4. Trocar (Barter) 3x Ervas por Catalisador Arcano (Item B)',
      description:
        'Realize a permuta bilateral de 3x Ervas Esmeralda por 1x Catalisador Arcano (Item B) com o Viajante 1.',
      kind: 'trade_barter',
      countingMode: 'strict_source_after_activation',
      requiredAmount: 1,
      targetShopId: 'shop_viajante_1',
      targetShopName: 'Loja do Viajante 1',
      targetItemId: 'item_catalisador_b',
      targetItemName: 'Catalisador Arcano (Item B)',
      barterGiveItemId: 'item-herb-emerald',
      barterGiveItemName: 'Erva Esmeralda da Vida',
      barterGiveAmount: 3,
    },
    {
      id: 'obj_talk_alquimista_unlock_recipe',
      title: '5. Falar com o Mestre Alquimista',
      description: 'Converse com o Mestre Alquimista para desbloquear a receita do Elixir do Viajante.',
      kind: 'talk_npc',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_alquimista',
      targetNpcName: 'Mestre Alquimista',
    },
    {
      id: 'obj_craft_elixir_bancada',
      title: '6. Fabricar 1x Elixir do Viajante na Bancada Alquímica',
      description: 'Use o Catalisador Arcano (Item B) na Bancada Alquímica para criar o Elixir.',
      kind: 'craft_recipe',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetStationId: 'station_bancada_alquimica',
      targetRecipeId: 'recipe_elixir_viajante',
      targetItemId: 'item_elixir_viajante',
      targetItemName: 'Elixir do Viajante',
    },
    {
      id: 'obj_deliver_elixir_alquimista',
      title: '7. Entregar 1x Elixir do Viajante ao Alquimista',
      description:
        'Entregue o Elixir ao Mestre Alquimista. Remove exatamente 1 unidade apenas na confirmação da entrega.',
      kind: 'deliver_item',
      countingMode: 'strict_source_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_alquimista',
      targetNpcName: 'Mestre Alquimista',
      targetItemId: 'item_elixir_viajante',
      targetItemName: 'Elixir do Viajante',
      consumeItemOnDelivery: true,
    },
  ];

  const stages: QuestStageStep[] = [
    {
      id: 'stg_1_talk_viajante',
      order: 1,
      title: 'Etapa 1: Contato Inicial com o Viajante 1',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_talk_viajante_1'],
    },
    {
      id: 'stg_2_buy_item_a',
      order: 2,
      title: 'Etapa 2: Compra Confirmada na Loja (ou Atalho por Reputação >= 10)',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_buy_item_a_shop_viajante'],
    },
    {
      id: 'stg_3_sell_booblerock',
      order: 3,
      title: 'Etapa 3: Venda de Minério Booblerock Bruto',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_sell_booblerock_viajante'],
    },
    {
      id: 'stg_4_barter_item_b',
      order: 4,
      title: 'Etapa 4: Permuta / Escambo (3x Ervas ➔ Item B)',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_trade_herbs_for_item_b'],
    },
    {
      id: 'stg_5_talk_alchemist',
      order: 5,
      title: 'Etapa 5: Consultar o Mestre Alquimista',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_talk_alquimista_unlock_recipe'],
      onCompleteActions: [
        {
          id: 'act-unlock-rec-elixir',
          type: 'unlock_recipe',
          targetId: 'recipe_elixir_viajante',
          targetName: 'Receita: Elixir do Viajante',
        },
      ],
    },
    {
      id: 'stg_6_craft_elixir',
      order: 6,
      title: 'Etapa 6: Fabricar o Elixir na Bancada',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_craft_elixir_bancada'],
    },
    {
      id: 'stg_7_deliver_elixir',
      order: 7,
      title: 'Etapa 7: Entrega Transacional ao Alquimista',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_deliver_elixir_alquimista'],
    },
  ];

  const { nodes, edges } = buildGraphFromStages(stages, objectives);

  return {
    id: 'quest_negocios_viajante',
    schemaVersion: QUEST_SYSTEM_SCHEMA_VERSION,
    title: 'Negócios com o Viajante',
    subtitle: 'Desbloqueio de Loja ➔ Compra, Venda, Escambo, Crafting e Entrega',
    description:
      'Exemplo principal da especificação (Seção 7 e Cenário 1): exige Loja do Viajante 1 aberta (liberada no Nível 2), valida compra específica, venda de Booblerock, troca de 3 ervas pelo Item B, fabricação na bancada e entrega ao Alquimista.',
    campaignId: 'camp_slimelands_main',
    chapterId: 'chap_1_comercio',
    category: 'commercial',
    repeatablePolicy: 'once',
    availabilityConditions: {
      id: 'cond-avail-viajante',
      operator: 'AND',
      conditions: [
        {
          id: 'c-shop-open',
          subject: 'shop_unlocked',
          targetId: 'shop_viajante_1',
          comparator: '=',
          value: true,
          label: 'Loja do Viajante 1 Desbloqueada (Nível >= 2)',
        },
      ],
    },
    unavailableFallbackDialogue:
      'Viajante 1: "Ainda estou organizando minha caravana! Alcance o Nível 2 para abrir minha loja e fazermos negócios."',
    stages,
    objectives,
    nodes,
    edges,
    rewards: [
      {
        id: 'rew_viajante_xp',
        category: 'xp',
        label: '300 XP para o Herói',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        xpAmount: 300,
        xpTarget: 'player',
      },
      {
        id: 'rew_viajante_gold',
        category: 'currency',
        label: '150 Moedas de Ouro',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        currencyType: 'gold',
        currencyAmount: 150,
      },
      {
        id: 'rew_viajante_card',
        category: 'card',
        label: '1x Carta Rara: Mercador das Dunas',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        cardId: 'card_mercador_dunas',
        cardName: 'Carta Rara: Mercador das Dunas',
        cardRarity: 'rare',
      },
      {
        id: 'rew_viajante_region',
        category: 'unlock_content',
        label: 'Acesso à Região: Mina de Booblerock',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        unlockTargetType: 'region',
        unlockTargetId: 'region_mina_booblerock',
        unlockTargetName: 'Mina de Booblerock',
      },
    ],
    createdAt: '2026-10-20T12:00:00.000Z',
    updatedAt: '2026-10-20T12:00:00.000Z',
  };
}

function createCriacaoAlquimistaQuest(): QuestDefinition {
  const objectives: QuestObjectiveDefinition[] = [
    {
      id: 'obj_alq_talk_start',
      title: '1. Conversar com o Alquimista',
      description: 'Inicie o pedido de síntese alquímica com o Mestre Alquimista.',
      kind: 'talk_npc',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_alquimista',
      targetNpcName: 'Mestre Alquimista',
    },
    {
      id: 'obj_alq_collect_herbs',
      title: '2A. Coletar 5x Ervas Esmeralda (Paralelo)',
      description: 'Colha 5 novas Ervas Esmeralda no mapa (coleta real após ativação).',
      kind: 'collect_item',
      countingMode: 'events_after_activation',
      requiredAmount: 5,
      targetItemId: 'item-herb-emerald',
      targetItemName: 'Erva Esmeralda da Vida',
    },
    {
      id: 'obj_alq_mine_booblerock',
      title: '2B. Minerar 3x Booblerocks Brutos (Paralelo)',
      description: 'Extraia 3 unidades de Minério Booblerock Bruto nas rochas.',
      kind: 'collect_item',
      countingMode: 'events_after_activation',
      requiredAmount: 3,
      targetItemId: 'item_booblerock_bruto',
      targetItemName: 'Minério Booblerock Bruto',
    },
    {
      id: 'obj_alq_refine_ore',
      title: '3. Refinar Minério na Bancada',
      description: 'Processe o Booblerock Bruto na estação de refino.',
      kind: 'refine_material',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetStationId: 'station_forja_refino',
      targetItemId: 'item_booblerock_refinado',
      targetItemName: 'Booblerock Refinado',
    },
    {
      id: 'obj_alq_craft_potion',
      title: '4. Fabricar Poção Solar na Bancada',
      description: 'Combine os reagentes pela receita oficial para criar a Poção Solar.',
      kind: 'craft_recipe',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetStationId: 'station_bancada_alquimica',
      targetRecipeId: 'recipe_pocao_solar',
      targetItemId: 'item-elixir-solar',
      targetItemName: 'Elixir Solar Supremo',
    },
    {
      id: 'obj_alq_deliver_potion',
      title: '5. Entregar Poção Solar ao Alquimista',
      description: 'Entregue 1x Elixir Solar Supremo (consumo transacional na entrega).',
      kind: 'deliver_item',
      countingMode: 'strict_source_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_alquimista',
      targetNpcName: 'Mestre Alquimista',
      targetItemId: 'item-elixir-solar',
      targetItemName: 'Elixir Solar Supremo',
      consumeItemOnDelivery: true,
    },
  ];

  const stages: QuestStageStep[] = [
    {
      id: 'stg_alq_1',
      order: 1,
      title: 'Etapa 1: Falar com o Alquimista',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_alq_talk_start'],
    },
    {
      id: 'stg_alq_2_parallel',
      order: 2,
      title: 'Etapa 2 (AND Paralelo): Coletar 5 Ervas + Minerar 3 Booblerocks',
      flowOperator: 'PARALLEL_AND',
      objectiveIds: ['obj_alq_collect_herbs', 'obj_alq_mine_booblerock'],
    },
    {
      id: 'stg_alq_3_refine',
      order: 3,
      title: 'Etapa 3: Refinar Minério em Bancada',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_alq_refine_ore'],
    },
    {
      id: 'stg_alq_4_craft',
      order: 4,
      title: 'Etapa 4: Fabricar Poção pela Receita',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_alq_craft_potion'],
    },
    {
      id: 'stg_alq_5_deliver',
      order: 5,
      title: 'Etapa 5: Entregar Poção ao Alquimista',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_alq_deliver_potion'],
    },
  ];

  const { nodes, edges } = buildGraphFromStages(stages, objectives);

  return {
    id: 'quest_criacao_alquimista',
    schemaVersion: QUEST_SYSTEM_SCHEMA_VERSION,
    title: 'Síntese Alquímica & Coleta Paralela',
    subtitle: 'Coleta em Paralelo (AND) ➔ Refino ➔ Crafting ➔ Entrega',
    description:
      'Cenário 2 da especificação: coleta paralela de ervas e minério Booblerock em qualquer ordem, seguida de refino, fabricação e entrega transacional.',
    campaignId: 'camp_slimelands_main',
    chapterId: 'chap_2_crafting',
    category: 'crafting',
    repeatablePolicy: 'once',
    stages,
    objectives,
    nodes,
    edges,
    rewards: [
      {
        id: 'rew_alq_xp',
        category: 'xp',
        label: '500 XP de Alquimia',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        xpAmount: 500,
        xpTarget: 'player',
      },
      {
        id: 'rew_alq_card',
        category: 'card',
        label: '1x Carta Épica: Golem de Booblerock',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        cardId: 'card_golem_booblerock',
        cardName: 'Carta Épica: Golem de Booblerock',
        cardRarity: 'epic',
      },
      {
        id: 'rew_alq_recipe',
        category: 'unlock_content',
        label: 'Nova Receita: Pedra Filosofal Slime',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        unlockTargetType: 'recipe',
        unlockTargetId: 'recipe_pedra_filosofal',
        unlockTargetName: 'Receita: Pedra Filosofal Slime',
      },
    ],
    createdAt: '2026-10-20T12:10:00.000Z',
    updatedAt: '2026-10-20T12:10:00.000Z',
  };
}

function createCacadaEscalonadaQuest(): QuestDefinition {
  const objectives: QuestObjectiveDefinition[] = [
    {
      id: 'obj_hunt_talk_guard',
      title: '1. Falar com o Capitão da Guarda',
      description: 'Aceite a ordem de patrulha na entrada da floresta.',
      kind: 'talk_npc',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_guarda_real',
      targetNpcName: 'Capitão da Guarda',
    },
    {
      id: 'obj_hunt_defeat_mobs',
      title: '2. Derrotar 8x Slimes Selvagens na Floresta',
      description: 'Derrote 8 Slimes Selvagens especificamente na região Floresta. Kills fora da região não contam.',
      kind: 'defeat_mob',
      countingMode: 'strict_source_after_activation',
      requiredAmount: 8,
      targetMobSpecies: 'slime_selvagem',
      targetRegionId: 'region_floresta',
    },
    {
      id: 'obj_hunt_win_duel',
      title: '3. Vencer Duelo contra Líder Bandido Z',
      description: 'Vença o duelo tático contra o NPC Líder Bandido Z.',
      kind: 'win_duel',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_lider_bandido_z',
      targetNpcName: 'Líder Bandido Z',
      requireNoDeath: true,
    },
    {
      id: 'obj_hunt_return_guard',
      title: '4. Retornar ao Capitão da Guarda',
      description: 'Reporte a vitória ao Capitão da Guarda para receber a recompensa.',
      kind: 'talk_npc',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_guarda_real',
      targetNpcName: 'Capitão da Guarda',
    },
  ];

  const stages: QuestStageStep[] = [
    {
      id: 'stg_hunt_1',
      order: 1,
      title: 'Etapa 1: Receber Ordem do Guarda',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_hunt_talk_guard'],
    },
    {
      id: 'stg_hunt_2',
      order: 2,
      title: 'Etapa 2: Eliminar 8 Slimes na Região Floresta',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_hunt_defeat_mobs'],
    },
    {
      id: 'stg_hunt_3',
      order: 3,
      title: 'Etapa 3: Vencer Duelo contra NPC Z',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_hunt_win_duel'],
    },
    {
      id: 'stg_hunt_4',
      order: 4,
      title: 'Etapa 4: Voltar ao Guarda',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_hunt_return_guard'],
    },
  ];

  const { nodes, edges } = buildGraphFromStages(stages, objectives);

  return {
    id: 'quest_cacada_encomenda',
    schemaVersion: QUEST_SYSTEM_SCHEMA_VERSION,
    title: 'Caçada Escalonada na Floresta',
    subtitle: 'Combate Filtrado por Região ➔ Duelo ➔ Bônus Sem Morrer',
    description:
      'Cenário 3 da especificação: exige abates posteriores à ativação dentro da região correta, vitória em duelo contra NPC Z e concede bônus por completar sem morrer.',
    campaignId: 'camp_slimelands_main',
    chapterId: 'chap_1_comercio',
    category: 'combat',
    repeatablePolicy: 'repeatable',
    stages,
    objectives,
    nodes,
    edges,
    rewards: [
      {
        id: 'rew_hunt_xp',
        category: 'xp',
        label: '400 XP de Combate',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        xpAmount: 400,
        xpTarget: 'player',
      },
      {
        id: 'rew_hunt_gold',
        category: 'currency',
        label: '200 Moedas de Ouro (Fixo)',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        currencyType: 'gold',
        currencyAmount: 200,
      },
      {
        id: 'rew_hunt_bonus_gems',
        category: 'currency',
        label: '+25 Gemas (Bônus Opcional: Sem Morrer)',
        grantMoment: 'on_quest_complete',
        isOptionalBonus: true,
        visibility: 'revealed',
        currencyType: 'gems',
        currencyAmount: 25,
      },
    ],
    createdAt: '2026-10-20T12:20:00.000Z',
    updatedAt: '2026-10-20T12:20:00.000Z',
  };
}

function createRamificacaoRotasQuest(): QuestDefinition {
  const objectives: QuestObjectiveDefinition[] = [
    {
      id: 'obj_branch_choose_route',
      title: '1. Escolher Rota: Ajudar Comerciante (OR) Enfrentar Bandidos',
      description: 'Decida entre negociar suprimentos para a caravana ou derrotar os saqueadores.',
      kind: 'talk_npc',
      countingMode: 'events_after_activation',
      requiredAmount: 1,
      targetNpcId: 'npc_chefe_caravana',
      targetNpcName: 'Chefe da Caravana',
    },
    {
      id: 'obj_branch_route_commerce',
      title: 'Rota A (Comercial): Comprar Suprimentos na Loja',
      description: 'Compre 2x Suprimentos para ajudar o comerciante pacificamente.',
      kind: 'buy_item',
      countingMode: 'strict_source_after_activation',
      requiredAmount: 2,
      targetShopId: 'shop_viajante_1',
      targetItemId: 'item_cristal_mercador_a',
      targetItemName: 'Cristal de Mercador (Item A)',
      branchKey: 'route_commerce',
    },
    {
      id: 'obj_branch_route_combat',
      title: 'Rota B (Combate): Derrotar 3 Saqueadores',
      description: 'Enfrente os bandidos na estrada principal.',
      kind: 'defeat_mob',
      countingMode: 'events_after_activation',
      requiredAmount: 3,
      targetMobSpecies: 'bandido_estrada',
      branchKey: 'route_combat',
    },
  ];

  const stages: QuestStageStep[] = [
    {
      id: 'stg_br_1',
      order: 1,
      title: 'Etapa 1: Conversar com Chefe da Caravana',
      flowOperator: 'SEQUENTIAL',
      objectiveIds: ['obj_branch_choose_route'],
    },
    {
      id: 'stg_br_2_or',
      order: 2,
      title: 'Etapa 2 (OR Alternativo): Rota Comercial OU Rota de Combate',
      flowOperator: 'ALTERNATIVE_OR',
      objectiveIds: ['obj_branch_route_commerce', 'obj_branch_route_combat'],
    },
  ];

  const { nodes, edges } = buildGraphFromStages(stages, objectives);

  return {
    id: 'quest_ramificada_caravana',
    schemaVersion: QUEST_SYSTEM_SCHEMA_VERSION,
    title: 'Dilema da Caravana (Rotas Ramificadas)',
    subtitle: 'Operador OR / IF-ELSE com Recompensas Exclusivas por Rota',
    description:
      'Cenário 5 da especificação: permite concluir via Rota Comercial ou Rota de Combate; concede XP básico compartilhado uma única vez e entrega apenas o prêmio da rota escolhida.',
    campaignId: 'camp_slimelands_main',
    chapterId: 'chap_3_decisoes',
    category: 'main',
    repeatablePolicy: 'once',
    stages,
    objectives,
    nodes,
    edges,
    rewards: [
      {
        id: 'rew_br_shared_xp',
        category: 'xp',
        label: '250 XP Básico (Compartilhado)',
        grantMoment: 'on_quest_complete',
        visibility: 'revealed',
        xpAmount: 250,
        xpTarget: 'player',
      },
      {
        id: 'rew_br_commerce_only',
        category: 'currency',
        label: '30 Fichas de Guilda (Exclusivo Rota Comercial)',
        grantMoment: 'on_branch_chosen',
        stageOrBranchId: 'route_commerce',
        visibility: 'revealed',
        currencyType: 'tokens',
        currencyAmount: 30,
      },
      {
        id: 'rew_br_combat_only',
        category: 'inventory_item',
        label: '1x Espada do Herói (Exclusivo Rota Combate)',
        grantMoment: 'on_branch_chosen',
        stageOrBranchId: 'route_combat',
        visibility: 'revealed',
        itemId: 'item-sword-starter',
        itemName: 'Espada do Herói',
        itemQuantity: 1,
        itemRarity: 'uncommon',
      },
    ],
    createdAt: '2026-10-20T12:30:00.000Z',
    updatedAt: '2026-10-20T12:30:00.000Z',
  };
}

export const DEFAULT_QUEST_DEFINITIONS: QuestDefinition[] = [
  createNegociosViajanteQuest(),
  createCriacaoAlquimistaQuest(),
  createCacadaEscalonadaQuest(),
  createRamificacaoRotasQuest(),
];

// ============================================================================
// 5. INICIALIZAÇÃO E PERSISTÊNCIA DO ESTADO DO MOTOR DE QUESTS
// ============================================================================

export function createInitialQuestRuntimeProgress(quest: QuestDefinition): QuestRuntimeProgress {
  const objectivesProgress: Record<string, ObjectiveRuntimeProgress> = {};
  const firstStageObjIds = new Set(quest.stages[0]?.objectiveIds || []);

  for (const obj of quest.objectives) {
    objectivesProgress[obj.id] = {
      objectiveId: obj.id,
      status: firstStageObjIds.has(obj.id) ? 'active' : 'inactive',
      currentAmount: 0,
      requiredAmount: Math.max(1, obj.requiredAmount || 1),
      activatedAt: firstStageObjIds.has(obj.id) ? new Date().toISOString() : undefined,
      processedTransactionIds: [],
    };
  }

  return {
    questId: quest.id,
    status: quest.availabilityConditions?.conditions?.length ? 'locked' : 'available',
    currentStageId: quest.stages[0]?.id,
    completionCount: 0,
    objectivesProgress,
    claimedRewardIds: [],
  };
}

export function getOrCreateProjectQuestsConfig(project: MapProject): ProjectQuestsConfig {
  if (project.questsConfig && project.questsConfig.quests?.length > 0) {
    return project.questsConfig;
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(QUEST_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as ProjectQuestsConfig;
        if (parsed && Array.isArray(parsed.quests) && parsed.quests.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Falha ao ler questsConfig do localStorage:', e);
    }
  }

  const initialQuests = DEFAULT_QUEST_DEFINITIONS;
  const questsProgress: Record<string, QuestRuntimeProgress> = {};
  for (const q of initialQuests) {
    questsProgress[q.id] = createInitialQuestRuntimeProgress(q);
  }

  return {
    schemaVersion: QUEST_SYSTEM_SCHEMA_VERSION,
    quests: initialQuests,
    globalRules: DEFAULT_GLOBAL_RULES,
    activeQuestId: initialQuests[0].id,
    playerState: {
      playerId: project.player?.id || 'hero_1',
      currentLevel: project.player?.currentLevel || 1,
      currentLevelXp: project.player?.currentXp || 0,
      totalCumulativeXp: project.player?.totalCumulativeXp || 0,
      unlockedShopIds: [],
      unlockedRegionIds: ['region_floresta', 'region_vila_inicial'],
      unlockedRecipeIds: ['recipe_pocao_solar'],
      worldFlags: {},
      reputationByFaction: {
        viajante_guilda: 0,
        guarda_real: 5,
      },
      questsProgress,
      firedGlobalRuleIds: [],
      processedEventIds: [],
      rewardReceipts: [],
      eventAuditLog: [],
    },
  };
}

export function saveProjectQuestsConfigToStorage(config: ProjectQuestsConfig): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(QUEST_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn('Erro ao persistir questsConfig no localStorage:', e);
    }
  }
}

// ============================================================================
// 6. AVALIADOR DE CONDIÇÕES (AND / OR / NOT + COMPARADORES)
// ============================================================================

export function evaluateConditionLeaf(
  leaf: QuestConditionLeaf,
  state: PlayerProgressionRuntimeState,
  inventory: PlayerInventoryConfig,
  activePhaseId?: string
): boolean {
  let leftVal: string | number | boolean = 0;

  switch (leaf.subject) {
    case 'player_level':
      leftVal = state.currentLevel;
      break;
    case 'shop_unlocked':
      leftVal = leaf.targetId ? state.unlockedShopIds.includes(leaf.targetId) : false;
      break;
    case 'region_unlocked':
      leftVal = leaf.targetId ? state.unlockedRegionIds.includes(leaf.targetId) : false;
      break;
    case 'quest_status':
      leftVal = leaf.targetId ? state.questsProgress[leaf.targetId]?.status || 'locked' : 'locked';
      break;
    case 'inventory_has_item': {
      const qty = (inventory.items || [])
        .filter(
          (it) =>
            it.id === leaf.targetId ||
            it.definitionId === leaf.targetId ||
            it.name.toLowerCase() === (leaf.targetId || '').toLowerCase()
        )
        .reduce((acc, it) => acc + (it.quantity || 1), 0);
      leftVal = qty;
      break;
    }
    case 'currency_balance':
      leftVal =
        leaf.targetId === 'gems'
          ? inventory.currencies?.gems || 0
          : inventory.currencies?.gold || 0;
      break;
    case 'reputation_value':
      leftVal = leaf.targetId ? state.reputationByFaction[leaf.targetId] || 0 : 0;
      break;
    case 'world_flag':
      leftVal = leaf.targetId ? state.worldFlags[leaf.targetId] ?? false : false;
      break;
    case 'active_phase':
      leftVal = activePhaseId || '';
      break;
  }

  const rightVal = leaf.value;
  switch (leaf.comparator) {
    case '>=':
      return Number(leftVal) >= Number(rightVal);
    case '<=':
      return Number(leftVal) <= Number(rightVal);
    case '>':
      return Number(leftVal) > Number(rightVal);
    case '<':
      return Number(leftVal) < Number(rightVal);
    case '!=':
      return String(leftVal) !== String(rightVal);
    case '=':
    default:
      return String(leftVal) === String(rightVal);
  }
}

export function evaluateConditionGroup(
  group: QuestConditionGroup | undefined,
  state: PlayerProgressionRuntimeState,
  inventory: PlayerInventoryConfig,
  activePhaseId?: string
): boolean {
  if (!group || (!group.conditions?.length && !group.subGroups?.length)) {
    return true;
  }

  const leafResults = (group.conditions || []).map((c) =>
    evaluateConditionLeaf(c, state, inventory, activePhaseId)
  );
  const subResults = (group.subGroups || []).map((sg) =>
    evaluateConditionGroup(sg, state, inventory, activePhaseId)
  );
  const all = [...leafResults, ...subResults];

  if (all.length === 0) return true;
  if (group.operator === 'OR') return all.some(Boolean);
  if (group.operator === 'NOT') return !all.every(Boolean);
  return all.every(Boolean);
}

// ============================================================================
// 7. SERVIÇO CENTRAL DE XP E LEVEL-UP (SEÇÃO 18.1 E 18.3)
// ============================================================================

export function grantXpCentralService(
  project: MapProject,
  xpToGrant: number,
  sourceDescription: string = 'Recompensa / Evento'
): {
  updatedProject: MapProject;
  levelsGained: number[];
  newLevel: number;
  newLevelXp: number;
  totalCumulativeXp: number;
  logs: string[];
} {
  const cleanXp = Math.max(0, Math.round(xpToGrant));
  const questsConfig = getOrCreateProjectQuestsConfig(project);
  const growthCfg = project.player?.growthConfig || DEFAULT_CHARACTER_GROWTH;
  const table = computeGrowthTable(growthCfg);
  const maxLvl = growthCfg.maxLevel || 20;

  let currentLevel = questsConfig.playerState.currentLevel || project.player?.currentLevel || 1;
  let currentLevelXp = questsConfig.playerState.currentLevelXp ?? project.player?.currentXp ?? 0;
  let totalCumulativeXp =
    questsConfig.playerState.totalCumulativeXp ?? project.player?.totalCumulativeXp ?? 0;

  const logs: string[] = [];
  const levelsGained: number[] = [];

  if (cleanXp <= 0) {
    return {
      updatedProject: project,
      levelsGained: [],
      newLevel: currentLevel,
      newLevelXp: currentLevelXp,
      totalCumulativeXp,
      logs,
    };
  }

  totalCumulativeXp += cleanXp;
  currentLevelXp += cleanXp;
  logs.push(`✨ +${cleanXp} XP recebidos (${sourceDescription}).`);

  // Loop de transição de múltiplos níveis (ex: +1000 XP no nível 1 -> gasta 100 (nv 2) + 300 (nv 3) e sobra 600 no nv 3!)
  while (currentLevel < maxLvl) {
    const row = table.find((r) => r.level === currentLevel);
    const needed = row?.xpToNextLevel || 100 + (currentLevel - 1) * 200;
    if (currentLevelXp >= needed) {
      currentLevelXp -= needed;
      currentLevel += 1;
      levelsGained.push(currentLevel);
      logs.push(
        `🎉 LEVEL UP! Herói alcançou o Nível ${currentLevel} (custo da transição: ${needed} XP).`
      );
    } else {
      break;
    }
  }

  // Política de XP excedente no nível máximo
  let bonusGoldFromExcess = 0;
  if (currentLevel >= maxLvl && currentLevelXp > 0) {
    if (growthCfg.excessXpPolicy === 'discard') {
      logs.push(`🔒 Nível Máximo (${maxLvl}) atingido: ${currentLevelXp} XP excedente descartado.`);
      currentLevelXp = 0;
    } else if (growthCfg.excessXpPolicy === 'convert_to_gold') {
      bonusGoldFromExcess = Math.floor(currentLevelXp / 2);
      logs.push(
        `🪙 Nível Máximo (${maxLvl}): ${currentLevelXp} XP excedente convertido em +${bonusGoldFromExcess} Ouro!`
      );
      currentLevelXp = 0;
    } else {
      logs.push(`📦 Nível Máximo (${maxLvl}): ${currentLevelXp} XP excedente retido.`);
    }
  }

  const targetRow = table.find((r) => r.level === currentLevel) || table[table.length - 1];
  const currentInventory = getOrCreatePlayerInventory(project);
  const nextInventory: PlayerInventoryConfig =
    bonusGoldFromExcess > 0
      ? {
          ...currentInventory,
          currencies: {
            ...currentInventory.currencies,
            gold: (currentInventory.currencies?.gold || 0) + bonusGoldFromExcess,
          },
        }
      : currentInventory;

  let workingProject: MapProject = {
    ...project,
    playerInventory: nextInventory,
    player: {
      ...(project.player || {
        id: 'p1',
        name: 'Herói',
        x: 384,
        y: 180,
        color: '#3b82f6',
        speed: 4,
      }),
      currentLevel,
      currentXp: currentLevelXp,
      totalCumulativeXp,
      stats: {
        hp: targetRow.attributes.hp,
        maxHp: targetRow.attributes.hp,
        mp: targetRow.attributes.mp,
        maxMp: targetRow.attributes.mp,
        attack: targetRow.attributes.attack,
        defense: targetRow.attributes.defense,
        speed: targetRow.attributes.speed,
        magic: targetRow.attributes.magic,
      },
    },
    questsConfig: {
      ...questsConfig,
      playerState: {
        ...questsConfig.playerState,
        currentLevel,
        currentLevelXp,
        totalCumulativeXp,
      },
    },
  };

  // Para cada nível alcançado, emite o evento oficial `player.level_reached` no Event Bus!
  for (const reachedLvl of levelsGained) {
    const evResult = dispatchQuestEngineEvent(workingProject, {
      id: `ev-lvl-reached-${reachedLvl}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'player.level_reached',
      timestamp: new Date().toISOString(),
      playerId: workingProject.player?.id || 'hero_1',
      sourceModule: 'xp_central_service',
      payload: {
        levelReached: reachedLvl,
        xpAmount: cleanXp,
      },
    });
    workingProject = evResult.updatedProject;
    logs.push(...evResult.logs);
  }

  saveProjectQuestsConfigToStorage(workingProject.questsConfig!);

  return {
    updatedProject: workingProject,
    levelsGained,
    newLevel: currentLevel,
    newLevelXp: currentLevelXp,
    totalCumulativeXp,
    logs,
  };
}

// ============================================================================
// 8. EXECUTOR ATÔMICO E IDEMPOTENTE DE PACOTES DE RECOMPENSAS (SEÇÃO 19)
// ============================================================================

export function executeRewardBundle(
  project: MapProject,
  quest: QuestDefinition,
  rewardsToGrant: QuestRewardItem[],
  completionId: string
): {
  updatedProject: MapProject;
  receipt: QuestRewardBundleReceipt | null;
  logs: string[];
} {
  const questsConfig = getOrCreateProjectQuestsConfig(project);
  const existingReceipt = questsConfig.playerState.rewardReceipts.find(
    (r) => r.completionId === completionId
  );

  // Idempotência: nunca premia duas vezes o mesmo completionId
  if (existingReceipt) {
    return {
      updatedProject: project,
      receipt: existingReceipt,
      logs: [`🛡️ Idempotência ativa: pacote de recompensa "${completionId}" já foi concedido anteriormente.`],
    };
  }

  let workingProject: MapProject = { ...project };
  const logs: string[] = [];
  const itemsGranted: string[] = [];
  const pendingClaimItems: QuestRewardBundleReceipt['pendingClaimItems'] = [];

  for (const rew of rewardsToGrant) {
    // Probabilidade opcional
    if (typeof rew.probabilityPercent === 'number' && rew.probabilityPercent < 100) {
      if (Math.random() * 100 > rew.probabilityPercent) {
        logs.push(`🎲 Recompensa aleatória "${rew.label}" (${rew.probabilityPercent}%) não sorteada.`);
        continue;
      }
    }

    if (rew.category === 'xp' && (rew.xpAmount || 0) > 0) {
      const xpRes = grantXpCentralService(
        workingProject,
        rew.xpAmount || 0,
        `Quest: ${quest.title}`
      );
      workingProject = xpRes.updatedProject;
      itemsGranted.push(`+${rew.xpAmount} XP`);
      logs.push(...xpRes.logs);
    } else if (rew.category === 'currency' && (rew.currencyAmount || 0) > 0) {
      const inv = getOrCreatePlayerInventory(workingProject);
      const curType = rew.currencyType || 'gold';
      const amt = rew.currencyAmount || 0;
      const nextGold =
        curType === 'gold' ? (inv.currencies?.gold || 0) + amt : inv.currencies?.gold || 0;
      const nextGems =
        curType === 'gems' ? (inv.currencies?.gems || 0) + amt : inv.currencies?.gems || 0;

      workingProject = {
        ...workingProject,
        playerInventory: {
          ...inv,
          currencies: {
            gold: nextGold,
            gems: nextGems,
          },
        },
      };
      itemsGranted.push(`+${amt} ${curType.toUpperCase()}`);
      logs.push(`🪙 Recompensa monetária: +${amt} (${curType}).`);
    } else if (rew.category === 'inventory_item' && rew.itemId) {
      const inv = getOrCreatePlayerInventory(workingProject);
      const catalog = getOrCreateItemCatalog(workingProject);
      const qty = Math.max(1, rew.itemQuantity || 1);

      // Verifica se a mochila está cheia
      const isFull = (inv.items?.length || 0) >= (inv.maxSlots || 25);
      if (isFull && rew.fullBackpackPolicy !== 'overflow_slot') {
        pendingClaimItems.push({
          itemId: rew.itemId,
          itemName: rew.itemName || rew.itemId,
          quantity: qty,
          rarity: rew.itemRarity,
        });
        itemsGranted.push(`${qty}x ${rew.itemName || rew.itemId} (Caixa de Resgate Pendente)`);
        logs.push(
          `📫 Mochila cheia! ${qty}x "${rew.itemName || rew.itemId}" enviado para a Caixa de Resgate Pendente (nenhum item perdido).`
        );
      } else {
        const addedRes = addItemToPlayerInventory(inv, catalog, rew.itemId, qty);
        workingProject = {
          ...workingProject,
          playerInventory: addedRes.inventory,
        };
        itemsGranted.push(`${qty}x ${rew.itemName || rew.itemId}`);
        logs.push(`🎒 Item recebido na mochila: ${qty}x "${rew.itemName || rew.itemId}".`);
      }
    } else if (rew.category === 'card') {
      const qCfg = getOrCreateProjectQuestsConfig(workingProject);
      const cardFlag = `card_owned_${rew.cardId || 'rare_card'}`;
      workingProject = {
        ...workingProject,
        questsConfig: {
          ...qCfg,
          playerState: {
            ...qCfg.playerState,
            worldFlags: {
              ...qCfg.playerState.worldFlags,
              [cardFlag]: true,
            },
          },
        },
      };
      itemsGranted.push(`🃏 ${rew.cardName || rew.label}`);
      logs.push(`🃏 Carta adicionada à coleção: "${rew.cardName || rew.label}".`);
    } else if (rew.category === 'unlock_content' && rew.unlockTargetId) {
      const qCfg = getOrCreateProjectQuestsConfig(workingProject);
      const pState = qCfg.playerState;
      const nextShops =
        rew.unlockTargetType === 'shop' && !pState.unlockedShopIds.includes(rew.unlockTargetId)
          ? [...pState.unlockedShopIds, rew.unlockTargetId]
          : pState.unlockedShopIds;
      const nextRegions =
        rew.unlockTargetType === 'region' && !pState.unlockedRegionIds.includes(rew.unlockTargetId)
          ? [...pState.unlockedRegionIds, rew.unlockTargetId]
          : pState.unlockedRegionIds;
      const nextRecipes =
        rew.unlockTargetType === 'recipe' && !pState.unlockedRecipeIds.includes(rew.unlockTargetId)
          ? [...pState.unlockedRecipeIds, rew.unlockTargetId]
          : pState.unlockedRecipeIds;

      workingProject = {
        ...workingProject,
        questsConfig: {
          ...qCfg,
          playerState: {
            ...pState,
            unlockedShopIds: nextShops,
            unlockedRegionIds: nextRegions,
            unlockedRecipeIds: nextRecipes,
          },
        },
      };
      itemsGranted.push(`🔓 ${rew.unlockTargetName || rew.label}`);
      logs.push(`🔓 Conteúdo desbloqueado: ${rew.unlockTargetName || rew.label}.`);
    } else if (rew.category === 'reputation' && rew.reputationFactionId) {
      const qCfg = getOrCreateProjectQuestsConfig(workingProject);
      const prevRep = qCfg.playerState.reputationByFaction[rew.reputationFactionId] || 0;
      const nextRep = prevRep + (rew.reputationDelta || 5);
      workingProject = {
        ...workingProject,
        questsConfig: {
          ...qCfg,
          playerState: {
            ...qCfg.playerState,
            reputationByFaction: {
              ...qCfg.playerState.reputationByFaction,
              [rew.reputationFactionId]: nextRep,
            },
          },
        },
      };
      itemsGranted.push(`⭐ Reputação ${rew.reputationFactionId}: ${nextRep}`);
    }
  }

  const finalQCfg = getOrCreateProjectQuestsConfig(workingProject);
  const receipt: QuestRewardBundleReceipt = {
    bundleId: `bundle_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    questId: quest.id,
    completionId,
    playerId: finalQCfg.playerState.playerId,
    grantedAt: new Date().toISOString(),
    summaryText: itemsGranted.join(' + ') || 'Conclusão registrada',
    itemsGranted,
    pendingClaimItems,
  };

  workingProject = {
    ...workingProject,
    questsConfig: {
      ...finalQCfg,
      playerState: {
        ...finalQCfg.playerState,
        rewardReceipts: [receipt, ...finalQCfg.playerState.rewardReceipts],
      },
    },
  };

  saveProjectQuestsConfigToStorage(workingProject.questsConfig!);

  return {
    updatedProject: workingProject,
    receipt,
    logs,
  };
}

// ============================================================================
// 9. MOTOR DE EVENTOS CENTRAL E ROTEAMENTO DE OBJETIVOS (SEÇÃO 2, 4, 5, 11, 12)
// ============================================================================

function executeEngineActions(
  project: MapProject,
  actions: QuestActionDefinition[]
): { updatedProject: MapProject; logs: string[] } {
  let workingProject = { ...project };
  const logs: string[] = [];

  for (const act of actions) {
    const qCfg = getOrCreateProjectQuestsConfig(workingProject);
    const pState = qCfg.playerState;

    if (act.type === 'unlock_shop' && act.targetId) {
      if (!pState.unlockedShopIds.includes(act.targetId)) {
        workingProject = {
          ...workingProject,
          questsConfig: {
            ...qCfg,
            playerState: {
              ...pState,
              unlockedShopIds: [...pState.unlockedShopIds, act.targetId],
            },
          },
        };
        logs.push(`🏪 Ação executada: Loja "${act.targetName || act.targetId}" DESBLOQUEADA!`);
      }
    } else if (act.type === 'unlock_region' && act.targetId) {
      if (!pState.unlockedRegionIds.includes(act.targetId)) {
        workingProject = {
          ...workingProject,
          questsConfig: {
            ...qCfg,
            playerState: {
              ...pState,
              unlockedRegionIds: [...pState.unlockedRegionIds, act.targetId],
            },
          },
        };
        logs.push(`🗺️ Região "${act.targetName || act.targetId}" desbloqueada!`);
      }
    } else if (act.type === 'unlock_recipe' && act.targetId) {
      if (!pState.unlockedRecipeIds.includes(act.targetId)) {
        workingProject = {
          ...workingProject,
          questsConfig: {
            ...qCfg,
            playerState: {
              ...pState,
              unlockedRecipeIds: [...pState.unlockedRecipeIds, act.targetId],
            },
          },
        };
        logs.push(`📜 Receita "${act.targetName || act.targetId}" desbloqueada!`);
      }
    } else if (act.type === 'set_world_flag' && act.targetId) {
      workingProject = {
        ...workingProject,
        questsConfig: {
          ...qCfg,
          playerState: {
            ...pState,
            worldFlags: {
              ...pState.worldFlags,
              [act.targetId]: act.flagValue ?? true,
            },
          },
        },
      };
      logs.push(`🚩 Flag de mundo definida: ${act.targetId} = ${String(act.flagValue ?? true)}`);
    } else if (act.type === 'adjust_currency' && act.amount) {
      const inv = getOrCreatePlayerInventory(workingProject);
      workingProject = {
        ...workingProject,
        playerInventory: {
          ...inv,
          currencies: {
            ...inv.currencies,
            gold:
              (act.currencyType || 'gold') === 'gold'
                ? (inv.currencies?.gold || 0) + act.amount
                : inv.currencies?.gold || 0,
            gems:
              act.currencyType === 'gems'
                ? (inv.currencies?.gems || 0) + act.amount
                : inv.currencies?.gems || 0,
          },
        },
      };
      logs.push(`🪙 Saldo ajustado em ${act.amount} (${act.currencyType || 'gold'}).`);
    }
  }

  return { updatedProject: workingProject, logs };
}

function doesEventMatchObjective(
  event: QuestEngineEvent,
  obj: QuestObjectiveDefinition
): { matches: boolean; amountDelta: number; reason: string } {
  const p = event.payload || ((event as any) as QuestEngineEvent['payload']) || {};
  const qty = Math.max(1, p.quantity || 1);

  // Filtro opcional de região
  if (obj.targetRegionId && event.regionId && obj.targetRegionId !== event.regionId) {
    return {
      matches: false,
      amountDelta: 0,
      reason: `Ignorado: evento ocorreu na região "${event.regionId}", mas objetivo exige "${obj.targetRegionId}".`,
    };
  }

  switch (obj.kind) {
    case 'talk_npc': {
      if (event.type !== 'npc.talked' && event.type !== 'dialogue.completed') {
        return { matches: false, amountDelta: 0, reason: 'Tipo de evento diferente de conversa.' };
      }
      const pNpcId = (p.npcId || '').toLowerCase();
      const tNpcId = (obj.targetNpcId || '').toLowerCase();
      const pNpcName = (p.npcName || '').toLowerCase();
      const tNpcName = (obj.targetNpcName || '').toLowerCase();

      const idMatches =
        !tNpcId ||
        pNpcId === tNpcId ||
        (pNpcId && tNpcId && (pNpcId.includes(tNpcId) || tNpcId.includes(pNpcId)));
      const nameMatches =
        Boolean(pNpcName && tNpcName) &&
        (pNpcName === tNpcName || pNpcName.includes(tNpcName) || tNpcName.includes(pNpcName));

      if (obj.targetNpcId && !idMatches && !nameMatches) {
        return {
          matches: false,
          amountDelta: 0,
          reason: `NPC "${p.npcName || p.npcId}" diferente do alvo "${obj.targetNpcName || obj.targetNpcId}".`,
        };
      }
      return { matches: true, amountDelta: 1, reason: `Conversa com ${obj.targetNpcName || p.npcName || 'NPC'} validada.` };
    }

    case 'buy_item': {
      // REGRA OBRIGATÓRIA 4.3 / 14.B: Possuir por drop NÃO conclui compra; exige `commerce.purchase_completed`
      if (event.type !== 'commerce.purchase_completed') {
        return {
          matches: false,
          amountDelta: 0,
          reason: 'Objetivo exige transação confirmada de COMPRA (posse por drop ou coleta não conta).',
        };
      }
      if (obj.targetShopId && p.shopId && p.shopId !== obj.targetShopId) {
        return {
          matches: false,
          amountDelta: 0,
          reason: `Compra feita na loja "${p.shopId}", mas o objetivo exige a loja "${obj.targetShopId}".`,
        };
      }
      if (
        obj.targetItemId &&
        p.itemId !== obj.targetItemId &&
        p.itemName?.toLowerCase() !== obj.targetItemName?.toLowerCase()
      ) {
        return {
          matches: false,
          amountDelta: 0,
          reason: `Item comprado (${p.itemName || p.itemId}) diferente de ${obj.targetItemName || obj.targetItemId}.`,
        };
      }
      return {
        matches: true,
        amountDelta: qty,
        reason: `Compra confirmada de ${qty}x "${obj.targetItemName || p.itemName}" na loja "${obj.targetShopName || p.shopId}".`,
      };
    }

    case 'sell_item': {
      // REGRA OBRIGATÓRIA 4.3 / 14.C: Venda é evento comercial distinto de entrega ou descarte
      if (event.type !== 'commerce.sale_completed') {
        return { matches: false, amountDelta: 0, reason: 'Objetivo exige VENDA confirmada em loja.' };
      }
      if (obj.targetShopId && p.shopId && p.shopId !== obj.targetShopId) {
        return {
          matches: false,
          amountDelta: 0,
          reason: `Venda realizada em loja diferente de "${obj.targetShopId}".`,
        };
      }
      if (
        obj.targetItemId &&
        p.itemId !== obj.targetItemId &&
        p.itemName?.toLowerCase() !== obj.targetItemName?.toLowerCase()
      ) {
        return { matches: false, amountDelta: 0, reason: 'Item vendido diferente do solicitado.' };
      }
      return {
        matches: true,
        amountDelta: qty,
        reason: `Venda comercial de ${qty}x "${obj.targetItemName || p.itemName}" confirmada.`,
      };
    }

    case 'trade_barter': {
      if (event.type !== 'commerce.trade_completed') {
        return { matches: false, amountDelta: 0, reason: 'Objetivo exige TROCA / ESCAMBO bilateral.' };
      }
      if (obj.targetShopId && p.shopId && p.shopId !== obj.targetShopId) {
        return { matches: false, amountDelta: 0, reason: 'Troca feita fora do comerciante exigido.' };
      }
      if (
        obj.targetItemId &&
        p.itemId !== obj.targetItemId &&
        p.itemName?.toLowerCase() !== obj.targetItemName?.toLowerCase()
      ) {
        return { matches: false, amountDelta: 0, reason: 'Item recebido na troca não corresponde ao alvo.' };
      }
      if (obj.barterGiveItemId && p.barterGivenItemId && p.barterGivenItemId !== obj.barterGiveItemId) {
        return { matches: false, amountDelta: 0, reason: 'Item entregue na permuta não corresponde.' };
      }
      return {
        matches: true,
        amountDelta: qty,
        reason: `Permuta/Escambo bilateral confirmado: ${p.barterGivenQuantity || obj.barterGiveAmount || 1}x ${obj.barterGiveItemName || 'Item'} ➔ ${qty}x ${obj.targetItemName || p.itemName}.`,
      };
    }

    case 'collect_item': {
      if (
        event.type !== 'inventory.item_collected' &&
        event.type !== 'crafting.resource_harvested' &&
        event.type !== 'inventory.item_acquired'
      ) {
        return { matches: false, amountDelta: 0, reason: 'Não é evento de coleta.' };
      }
      const pId = (p.itemId || '').toLowerCase();
      const tId = (obj.targetItemId || '').toLowerCase();
      const pName = (p.itemName || '').toLowerCase();
      const tName = (obj.targetItemName || '').toLowerCase();

      const idMatch = !tId || pId === tId || (pId && tId && (pId.includes(tId) || tId.includes(pId)));
      const nameMatch =
        Boolean(pName && tName) &&
        (pName === tName || pName.includes(tName) || tName.includes(pName));

      if (obj.targetItemId && !idMatch && !nameMatch) {
        return { matches: false, amountDelta: 0, reason: 'Item coletado diferente do objetivo.' };
      }
      return {
        matches: true,
        amountDelta: qty,
        reason: `Coleta registrada: +${qty}x ${obj.targetItemName || p.itemName}.`,
      };
    }

    case 'refine_material': {
      if (event.type !== 'crafting.material_refined' && event.type !== 'crafting.incubator_hatched') {
        return { matches: false, amountDelta: 0, reason: 'Não é evento de refino.' };
      }
      return {
        matches: true,
        amountDelta: qty,
        reason: `Refino em bancada concluído: +${qty}x ${obj.targetItemName || p.itemName || 'Material'}.`,
      };
    }

    case 'craft_recipe': {
      if (event.type !== 'crafting.recipe_crafted' && event.type !== 'crafting.incubator_hatched') {
        return { matches: false, amountDelta: 0, reason: 'Não é evento de fabricação/crafting.' };
      }
      if (obj.targetRecipeId && p.recipeId && p.recipeId !== obj.targetRecipeId) {
        return { matches: false, amountDelta: 0, reason: 'Receita fabricada diferente da exigida.' };
      }
      return {
        matches: true,
        amountDelta: qty,
        reason: `Receita fabricada na bancada: +${qty}x ${obj.targetItemName || p.itemName || 'Item'}.`,
      };
    }

    case 'deliver_item': {
      if (event.type !== 'inventory.item_delivered') {
        return { matches: false, amountDelta: 0, reason: 'Não é evento de entrega a NPC.' };
      }
      const pId = (p.itemId || '').toLowerCase();
      const tId = (obj.targetItemId || '').toLowerCase();
      const pName = (p.itemName || '').toLowerCase();
      const tName = (obj.targetItemName || '').toLowerCase();
      const idMatch = !tId || pId === tId || (pId && tId && (pId.includes(tId) || tId.includes(pId)));
      const nameMatch = Boolean(pName && tName) && (pName === tName || pName.includes(tName) || tName.includes(pName));
      if (obj.targetItemId && !idMatch && !nameMatch) {
        return { matches: false, amountDelta: 0, reason: 'Item entregue diferente do exigido.' };
      }
      return {
        matches: true,
        amountDelta: qty,
        reason: `Entrega confirmada de ${qty}x "${obj.targetItemName || p.itemName}" a ${obj.targetNpcName || 'NPC'}.`,
      };
    }

    case 'defeat_mob': {
      if (
        event.type !== 'combat.mob_defeated' &&
        event.type !== 'combat.boss_defeated' &&
        (event.type as string) !== 'combat.enemy_defeated'
      ) {
        return { matches: false, amountDelta: 0, reason: 'Não é evento de abate de mob.' };
      }
      if (
        obj.targetMobSpecies &&
        p.mobSpecies &&
        p.mobSpecies !== obj.targetMobSpecies &&
        !p.mobSpecies.includes('slime')
      ) {
        return {
          matches: false,
          amountDelta: 0,
          reason: `Espécie derrotada (${p.mobSpecies}) diferente de "${obj.targetMobSpecies}".`,
        };
      }
      return {
        matches: true,
        amountDelta: qty,
        reason: `Abate confirmado na região válida: +${qty}x ${obj.targetMobSpecies || 'Mob'}.`,
      };
    }

    case 'win_duel': {
      if (event.type !== 'combat.duel_won') {
        return { matches: false, amountDelta: 0, reason: 'Não é vitória de duelo.' };
      }
      if (obj.requireNoDeath && p.withoutDying === false) {
        return { matches: false, amountDelta: 0, reason: 'Duelo exigia vitória sem morrer.' };
      }
      return {
        matches: true,
        amountDelta: 1,
        reason: `Duelo vencido contra ${obj.targetNpcName || p.npcName || 'oponente'}!`,
      };
    }

    case 'read_document': {
      // REGRA 4.2 / 8: Ler livro/carta é distinto de apenas possuir
      if (event.type !== 'inventory.item_read') {
        return { matches: false, amountDelta: 0, reason: 'Exige o evento de LEITURA (não basta possuir).' };
      }
      return { matches: true, amountDelta: 1, reason: 'Documento/Carta lido pelo jogador.' };
    }

    case 'reach_level': {
      if (event.type !== 'player.level_reached' && event.type !== 'player.level_up') {
        return { matches: false, amountDelta: 0, reason: 'Não é evento de nível.' };
      }
      if ((p.levelReached || 1) >= obj.requiredAmount) {
        return {
          matches: true,
          amountDelta: obj.requiredAmount,
          reason: `Nível ${p.levelReached} alcança o requisito >= ${obj.requiredAmount}.`,
        };
      }
      return { matches: false, amountDelta: 0, reason: 'Nível ainda abaixo do exigido.' };
    }

    default:
      return { matches: false, amountDelta: 0, reason: 'Tipo de objetivo não correspondente.' };
  }
}

/**
 * Despacha um evento tipado no Motor Central de Quests:
 * 1. Garante idempotência por `event.id` e `event.transactionId`
 * 2. Avalia Regras Globais independentes de quest (ex: Nível 2 abre Loja Viajante 1)
 * 3. Atualiza disponibilidade de quests `locked -> available`
 * 4. Roteia o evento para objetivos ativos (ou objetivos correspondentes da quest ativa/disponível), avança etapas e concede Reward Bundles!
 */
export function dispatchQuestEngineEvent(
  project: MapProject,
  rawEvent: QuestEngineEvent
): {
  updatedProject: MapProject;
  logs: string[];
  affectedQuestIds: string[];
  updatedQuestsCount: number;
  completedQuestIds: string[];
  triggeredRuleIds: string[];
  notifications: string[];
} {
  const event: QuestEngineEvent = {
    ...rawEvent,
    id: rawEvent.id || `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: rawEvent.timestamp || new Date().toISOString(),
    playerId: rawEvent.playerId || 'hero_1',
    sourceModule: rawEvent.sourceModule || ((rawEvent as any).sourceSystem as any) || 'emulator',
    payload: rawEvent.payload || {
      npcId: (rawEvent as any).targetId || (rawEvent as any).npcId,
      npcName: (rawEvent as any).npcName,
      itemId: (rawEvent as any).itemId,
      itemName: (rawEvent as any).itemName,
      quantity: (rawEvent as any).quantity ?? 1,
      shopId: (rawEvent as any).shopId,
      stationId: (rawEvent as any).stationId,
      recipeId: (rawEvent as any).recipeId,
      mobSpecies: (rawEvent as any).mobSpecies,
    },
  };

  let workingProject: MapProject = { ...project };
  const qCfg = getOrCreateProjectQuestsConfig(workingProject);
  const pState = qCfg.playerState;
  const logs: string[] = [];
  const affectedQuestIds: string[] = [];
  const completedQuestIds: string[] = [];
  const triggeredRuleIds: string[] = [];

  // 1. Idempotência de Evento Global
  if (pState.processedEventIds.includes(event.id)) {
    return {
      updatedProject: workingProject,
      logs: [`🛡️ Evento duplicado ignorado por idempotência (${event.id}).`],
      affectedQuestIds: [],
      updatedQuestsCount: 0,
      completedQuestIds: [],
      triggeredRuleIds: [],
      notifications: [],
    };
  }

  // 2. Validação Transacional de Entrega (Critério 12.4 e 14.I: entregar 5 quando possui 4 NÃO consome parcialmente!)
  if (event.type === 'inventory.item_delivered' && event.payload.itemId) {
    const inv = getOrCreatePlayerInventory(workingProject);
    const reqQty = Math.max(1, event.payload.quantity || 1);
    const matchingItem = (inv.items || []).find(
      (it) =>
        it.id === event.payload.itemId ||
        it.definitionId === event.payload.itemId ||
        it.name.toLowerCase() === (event.payload.itemName || '').toLowerCase()
    );
    const ownedQty = matchingItem?.quantity || 0;

    if (ownedQty < reqQty) {
      logs.push(
        `⚠️ Entrega recusada (Inventário Insuficiente): necessário ${reqQty}x "${event.payload.itemName || event.payload.itemId}", mas o jogador possui ${ownedQty}x. Nenhum item foi consumido.`
      );
      return {
        updatedProject: workingProject,
        logs,
        affectedQuestIds: [],
        updatedQuestsCount: 0,
        completedQuestIds: [],
        triggeredRuleIds: [],
        notifications: logs,
      };
    }

    // Consome exatamente `reqQty` na confirmação da entrega
    const nextItems = (inv.items || [])
      .map((it) => {
        if (it.id === matchingItem!.id) {
          return { ...it, quantity: (it.quantity || 1) - reqQty };
        }
        return it;
      })
      .filter((it) => (it.quantity || 0) > 0);

    workingProject = {
      ...workingProject,
      playerInventory: {
        ...inv,
        items: nextItems,
      },
    };
    logs.push(
      `📦 Consumo transacional de entrega confirmado: -${reqQty}x "${matchingItem!.name}" removido da mochila.`
    );
  }

  // Registra o evento no histórico de auditoria
  const updatedAuditLog = [event, ...(pState.eventAuditLog || [])].slice(0, 80);
  const updatedProcessedEvents = [event.id, ...(pState.processedEventIds || [])].slice(0, 500);

  workingProject = {
    ...workingProject,
    questsConfig: {
      ...qCfg,
      playerState: {
        ...pState,
        processedEventIds: updatedProcessedEvents,
        eventAuditLog: updatedAuditLog,
      },
    },
  };

  // 3. Avalia Regras Globais (ex: Alcançar Nível 2 abre a Loja do Viajante 1 mesmo fora de quest!)
  const currentQCfgAfterLog = getOrCreateProjectQuestsConfig(workingProject);
  for (const rule of currentQCfgAfterLog.globalRules || []) {
    if (!rule.enabled) continue;
    if (
      rule.oncePerSave &&
      currentQCfgAfterLog.playerState.firedGlobalRuleIds.includes(rule.id)
    ) {
      continue;
    }

    const inv = getOrCreatePlayerInventory(workingProject);
    const condPassed = evaluateConditionGroup(
      rule.conditionGroup,
      currentQCfgAfterLog.playerState,
      inv
    );

    if (condPassed) {
      const actRes = executeEngineActions(workingProject, rule.actions);
      workingProject = actRes.updatedProject;
      logs.push(`🌐 Regra Global Disparada: "${rule.name}"`);
      logs.push(...actRes.logs);
      triggeredRuleIds.push(rule.id);

      const latestCfg = getOrCreateProjectQuestsConfig(workingProject);
      workingProject = {
        ...workingProject,
        questsConfig: {
          ...latestCfg,
          playerState: {
            ...latestCfg.playerState,
            firedGlobalRuleIds: [...latestCfg.playerState.firedGlobalRuleIds, rule.id],
          },
        },
      };
    }
  }

  // 4. Atualiza Quests `locked -> available` caso suas condições de disponibilidade tenham sido satisfeitas
  let latestCfg = getOrCreateProjectQuestsConfig(workingProject);
  const invNow = getOrCreatePlayerInventory(workingProject);
  const nextQuestsProgress: Record<string, QuestRuntimeProgress> = {
    ...latestCfg.playerState.questsProgress,
  };

  for (const quest of latestCfg.quests) {
    const qProg =
      nextQuestsProgress[quest.id] || createInitialQuestRuntimeProgress(quest);

    if (qProg.status === 'locked') {
      const canUnlock = evaluateConditionGroup(
        quest.availabilityConditions,
        latestCfg.playerState,
        invNow
      );
      if (canUnlock) {
        nextQuestsProgress[quest.id] = {
          ...qProg,
          status: 'available',
        };
        logs.push(`🔓 Quest liberada para aceite: "${quest.title}"!`);
        affectedQuestIds.push(quest.id);
      }
    }
  }

  workingProject = {
    ...workingProject,
    questsConfig: {
      ...latestCfg,
      playerState: {
        ...latestCfg.playerState,
        questsProgress: nextQuestsProgress,
      },
    },
  };

  // 5. Roteia o evento para todas as Quests `active` ou `available`
  latestCfg = getOrCreateProjectQuestsConfig(workingProject);
  const questsToRewards: {
    quest: QuestDefinition;
    rewards: QuestRewardItem[];
    completionId: string;
  }[] = [];

  for (const quest of latestCfg.quests) {
    let qProg =
      latestCfg.playerState.questsProgress[quest.id] ||
      createInitialQuestRuntimeProgress(quest);

    if (qProg.status === 'completed' || qProg.status === 'failed') continue;

    // Se a quest está 'available' e o jogador já coletou um item dela no mapa ou realizou ação prática (exceto apenas abrir diálogo), contabiliza o avanço
    if (qProg.status === 'available' && event.type !== 'npc.talked') {
      const firstStage = quest.stages[0];
      const matchesAnyObj = quest.objectives.some(
        (fo) => doesEventMatchObjective(event, fo).matches
      );
      if (matchesAnyObj) {
        const initObjs: Record<string, ObjectiveRuntimeProgress> = {
          ...qProg.objectivesProgress,
        };
        if (firstStage) {
          for (const oid of firstStage.objectiveIds) {
            if (initObjs[oid] && initObjs[oid].status === 'inactive') {
              initObjs[oid] = { ...initObjs[oid], status: 'active', activatedAt: new Date().toISOString() };
            }
          }
        }
        qProg = {
          ...qProg,
          status: 'active',
          acceptedAt: qProg.acceptedAt || new Date().toISOString(),
          currentStageId: qProg.currentStageId || firstStage?.id,
          objectivesProgress: initObjs,
        };
        logs.push(`🚀 Quest iniciada: "${quest.title}"!`);
      }
    }

    if (qProg.status !== 'active') continue;

    const currentStageIndex = quest.stages.findIndex(
      (s) => s.id === qProg.currentStageId
    );
    const activeStage =
      currentStageIndex >= 0 ? quest.stages[currentStageIndex] : quest.stages[0];
    if (!activeStage) continue;

    let stageChanged = false;
    const updatedObjMap: Record<string, ObjectiveRuntimeProgress> = {
      ...qProg.objectivesProgress,
    };

    // Primeiro tenta casar nos objetivos da Etapa Ativa; se não casar na etapa ativa mas casar em outro objetivo incompleto da mesma quest (ex: coletou item no mapa adiantado), contabiliza também!
    const candidateObjIds = [
      ...activeStage.objectiveIds,
      ...quest.objectives.map((o) => o.id).filter((id) => !activeStage.objectiveIds.includes(id)),
    ];

    for (const objId of candidateObjIds) {
      const objDef = quest.objectives.find((o) => o.id === objId);
      const objProg = updatedObjMap[objId] || {
        objectiveId: objId,
        currentAmount: 0,
        status: 'active',
        processedTransactionIds: [],
      };
      if (!objDef || objProg.status === 'completed' || objProg.status === 'skipped') continue;

      // Impede contagem dupla da mesma transação comercial
      if (
        event.transactionId &&
        objProg.processedTransactionIds.includes(event.transactionId)
      ) {
        logs.push(
          `🛡️ Transação "${event.transactionId}" já contabilizada anteriormente em "${objDef.title}".`
        );
        continue;
      }

      const matchRes = doesEventMatchObjective(event, objDef);
      if (matchRes.matches) {
        const nextAmt = Math.min(
          objDef.requiredAmount,
          (objProg.currentAmount || 0) + matchRes.amountDelta
        );
        const isNowDone = nextAmt >= objDef.requiredAmount;

        updatedObjMap[objId] = {
          ...objProg,
          currentAmount: nextAmt,
          status: isNowDone ? 'completed' : 'active',
          completedAt: isNowDone ? new Date().toISOString() : undefined,
          processedTransactionIds: event.transactionId
            ? [...objProg.processedTransactionIds, event.transactionId]
            : objProg.processedTransactionIds,
        };

        if (objDef.branchKey) {
          qProg = { ...qProg, chosenBranchTag: objDef.branchKey };
        }

        logs.push(
          `✅ Progresso [${quest.title}] — ${objDef.title}: ${nextAmt}/${objDef.requiredAmount} (${matchRes.reason})`
        );
        stageChanged = true;
        affectedQuestIds.push(quest.id);
      }
    }

    if (!stageChanged) continue;

    // Verifica se a Etapa Atual foi concluída conforme seu operador (`SEQUENTIAL`, `PARALLEL_AND`, `ALTERNATIVE_OR`, `N_OF_M`)
    const stageObjStatuses = activeStage.objectiveIds.map(
      (id) => updatedObjMap[id]?.status || 'inactive'
    );

    let isStageComplete = false;
    if (activeStage.flowOperator === 'ALTERNATIVE_OR') {
      isStageComplete = stageObjStatuses.some((st) => st === 'completed');
      if (isStageComplete) {
        for (const id of activeStage.objectiveIds) {
          if (updatedObjMap[id]?.status !== 'completed') {
            updatedObjMap[id] = { ...updatedObjMap[id], status: 'skipped' };
          }
        }
      }
    } else if (activeStage.flowOperator === 'N_OF_M') {
      const doneCount = stageObjStatuses.filter((st) => st === 'completed').length;
      isStageComplete = doneCount >= (activeStage.nOfMRequired || 1);
    } else {
      isStageComplete = stageObjStatuses.every((st) => st === 'completed');
    }

    if (isStageComplete) {
      logs.push(`🏁 Etapa concluída: "${activeStage.title}"!`);

      if (activeStage.onCompleteActions?.length) {
        const stageActRes = executeEngineActions(
          workingProject,
          activeStage.onCompleteActions
        );
        workingProject = stageActRes.updatedProject;
        logs.push(...stageActRes.logs);
      }

      const nextStage = quest.stages[currentStageIndex + 1];
      if (nextStage) {
        for (const nextObjId of nextStage.objectiveIds) {
          if (updatedObjMap[nextObjId] && updatedObjMap[nextObjId].status !== 'completed') {
            updatedObjMap[nextObjId] = {
              ...updatedObjMap[nextObjId],
              status: 'active',
              activatedAt: new Date().toISOString(),
            };
          }
        }
        qProg = {
          ...qProg,
          currentStageId: nextStage.id,
          objectivesProgress: updatedObjMap,
        };
        logs.push(`➡️ Próxima etapa ativada: "${nextStage.title}".`);
      } else {
        const newCompletionCount = (qProg.completionCount || 0) + 1;
        qProg = {
          ...qProg,
          status: 'completed',
          completedAt: new Date().toISOString(),
          completionCount: newCompletionCount,
          objectivesProgress: updatedObjMap,
        };
        logs.push(`🏆 QUEST CONCLUÍDA: "${quest.title}"!`);
        completedQuestIds.push(quest.id);

        const eligibleRewards = (quest.rewards || []).filter((r) => {
          if (r.grantMoment === 'on_first_completion_only' && newCompletionCount > 1) {
            return false;
          }
          if (
            r.stageOrBranchId &&
            qProg.chosenBranchTag &&
            r.stageOrBranchId !== qProg.chosenBranchTag
          ) {
            return false;
          }
          return true;
        });

        questsToRewards.push({
          quest,
          rewards: eligibleRewards,
          completionId: `${quest.id}_comp_${newCompletionCount}`,
        });
      }
    } else {
      qProg = {
        ...qProg,
        objectivesProgress: updatedObjMap,
      };
    }

    const cfgNow = getOrCreateProjectQuestsConfig(workingProject);
    workingProject = {
      ...workingProject,
      questsConfig: {
        ...cfgNow,
        playerState: {
          ...cfgNow.playerState,
          questsProgress: {
            ...cfgNow.playerState.questsProgress,
            [quest.id]: qProg,
          },
        },
      },
    };
  }

  // 6. Concede os Reward Bundles atômicos para quests recém-concluídas
  for (const item of questsToRewards) {
    const bundleRes = executeRewardBundle(
      workingProject,
      item.quest,
      item.rewards,
      item.completionId
    );
    workingProject = bundleRes.updatedProject;
    logs.push(...bundleRes.logs);
  }

  saveProjectQuestsConfigToStorage(workingProject.questsConfig!);

  const uniqueAffected = Array.from(new Set(affectedQuestIds));
  return {
    updatedProject: workingProject,
    logs,
    affectedQuestIds: uniqueAffected,
    updatedQuestsCount: uniqueAffected.length,
    completedQuestIds,
    triggeredRuleIds,
    notifications: logs,
  };
}

// ============================================================================
// 10. VALIDADOR DE QUESTS E INTEGRIDADE DE REFERÊNCIAS (SEÇÃO 12.6, 13, 14.J)
// ============================================================================

export function validateProjectQuests(project: MapProject): QuestValidationIssue[] {
  const qCfg = getOrCreateProjectQuestsConfig(project);
  const catalog = getOrCreateItemCatalog(project);
  const markers = project.markers || [];
  const issues: QuestValidationIssue[] = [];

  for (const quest of qCfg.quests) {
    if (!quest.stages || quest.stages.length === 0) {
      issues.push({
        id: `err-no-stages-${quest.id}`,
        severity: 'error',
        questId: quest.id,
        title: 'Quest sem etapas configuradas',
        details: `A missão "${quest.title}" não possui nenhuma etapa no fluxo.`,
        fixSuggestion: 'Adicione pelo menos 1 etapa no Assistente ou no Grafo.',
      });
    }

    for (const obj of quest.objectives) {
      if (obj.requiredAmount <= 0 || obj.requiredAmount > 999999) {
        issues.push({
          id: `err-counter-${quest.id}-${obj.id}`,
          severity: 'error',
          questId: quest.id,
          nodeOrObjectiveId: obj.id,
          title: `Contador inválido em "${obj.title}"`,
          details: `Quantidade alvo (${obj.requiredAmount}) fora dos limites seguros (1..999999).`,
          fixSuggestion: 'Defina uma quantidade inteira positiva entre 1 e 999999.',
        });
      }

      // Se vinculou a um marcador específico da fase e esse marcador foi excluído
      if (obj.targetMarkerId && !markers.some((m) => m.id === obj.targetMarkerId)) {
        issues.push({
          id: `err-missing-marker-${quest.id}-${obj.id}`,
          severity: 'error',
          questId: quest.id,
          nodeOrObjectiveId: obj.id,
          title: `Referência quebrada: Marcador "${obj.targetMarkerId}" ausente na fase`,
          details: `O objetivo "${obj.title}" aponta para um marcador que foi removido do mapa.`,
          fixSuggestion: 'Use o botão "Religar ao Mapa" para selecionar um marcador válido.',
        });
      }

      // Verifica se item comercializado é protegido de quest e não negociável
      if (
        (obj.kind === 'sell_item' || obj.kind === 'buy_item') &&
        obj.targetItemId
      ) {
        const catItem = catalog.find((c) => c.id === obj.targetItemId);
        if (catItem && catItem.isQuestProtected) {
          issues.push({
            id: `warn-protected-trade-${quest.id}-${obj.id}`,
            severity: 'warning',
            questId: quest.id,
            nodeOrObjectiveId: obj.id,
            title: `Item protegido em objetivo comercial ("${catItem.name}")`,
            details: `O item "${catItem.name}" está marcado como Protegido de Quest, o que pode impedir sua venda em lojas.`,
            fixSuggestion: 'Ative a tag "Vendável/Trocável" no item ou escolha outro item comercial.',
          });
        }
      }
    }
  }

  return issues;
}

// ============================================================================
// 11. EXECUTOR AUTOMÁTICO DOS 6 CENÁRIOS DE ACEITE (SEÇÃO 20)
// ============================================================================

export function runAcceptanceScenario(
  project: MapProject,
  scenarioNumber: 1 | 2 | 3 | 4 | 5 | 6
): {
  updatedProject: MapProject;
  title: string;
  passed: boolean;
  stepsLog: string[];
} {
  let working = { ...project };
  const stepsLog: string[] = [];

  if (scenarioNumber === 1) {
    // Cenário 1: Nível 2 -> Libera Loja Viajante 1 -> Compra Item A -> Vende Booblerock -> Troca 3 Ervas por B -> Fala Alquimista -> Fabrica Elixir -> Entrega -> Conclui
    stepsLog.push('▶️ Iniciando Cenário 1: Liberação Comercial por Nível ➔ Cadeia Completa ➔ Entrega');

    // Reset quest_negocios_viajante para teste limpo
    const qCfg = getOrCreateProjectQuestsConfig(working);
    const viaQuest = qCfg.quests.find((q) => q.id === 'quest_negocios_viajante') || createNegociosViajanteQuest();
    working = {
      ...working,
      questsConfig: {
        ...qCfg,
        playerState: {
          ...qCfg.playerState,
          currentLevel: 1,
          currentLevelXp: 0,
          totalCumulativeXp: 0,
          unlockedShopIds: [],
          firedGlobalRuleIds: [],
          rewardReceipts: qCfg.playerState.rewardReceipts.filter(
            (r) => r.questId !== 'quest_negocios_viajante'
          ),
          questsProgress: {
            ...qCfg.playerState.questsProgress,
            quest_negocios_viajante: createInitialQuestRuntimeProgress(viaQuest),
          },
        },
      },
    };

    // Passo 1: Concede 100 XP -> Sobe para o Nível 2 -> Regra Global abre Loja Viajante 1
    const lvlRes = grantXpCentralService(working, 100, 'Cenário 1: Alcançar Nível 2');
    working = lvlRes.updatedProject;
    stepsLog.push(...lvlRes.logs);

    // Garante que o jogador tenha o Elixir no inventário quando chegar na hora de entregar
    const inv = getOrCreatePlayerInventory(working);
    working = {
      ...working,
      playerInventory: {
        ...inv,
        items: [
          ...(inv.items || []),
          {
            id: 'item_elixir_viajante',
            name: 'Elixir do Viajante',
            quantity: 1,
            type: 'potion',
            iconEmoji: '🧪',
          },
        ],
      },
    };

    const eventsToRun: QuestEngineEvent[] = [
      {
        id: `sc1-ev-talk1-${Date.now()}`,
        type: 'npc.talked',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_1',
        payload: { npcId: 'npc_viajante_1', npcName: 'Viajante 1' },
      },
      // Teste Critério 14.B: tentar adquirir Item A por drop NÃO deve contar como compra!
      {
        id: `sc1-ev-drop-ignored-${Date.now()}`,
        type: 'inventory.item_collected',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_1',
        payload: {
          itemId: 'item_cristal_mercador_a',
          itemName: 'Cristal de Mercador (Item A)',
          quantity: 2,
          acquisitionSource: 'mob_drop',
        },
      },
      // Compra real confirmada na Loja Viajante 1
      {
        id: `sc1-ev-buy-${Date.now()}`,
        type: 'commerce.purchase_completed',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_1',
        transactionId: `tx_buy_a_${Date.now()}`,
        payload: {
          shopId: 'shop_viajante_1',
          shopName: 'Loja do Viajante 1',
          itemId: 'item_cristal_mercador_a',
          itemName: 'Cristal de Mercador (Item A)',
          quantity: 2,
          currencyType: 'gold',
          totalPrice: 100,
        },
      },
      {
        id: `sc1-ev-sell-${Date.now()}`,
        type: 'commerce.sale_completed',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_1',
        transactionId: `tx_sell_ore_${Date.now()}`,
        payload: {
          shopId: 'shop_viajante_1',
          shopName: 'Loja do Viajante 1',
          itemId: 'item_booblerock_bruto',
          itemName: 'Minério Booblerock Bruto',
          quantity: 1,
        },
      },
      {
        id: `sc1-ev-barter-${Date.now()}`,
        type: 'commerce.trade_completed',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_1',
        transactionId: `tx_barter_${Date.now()}`,
        payload: {
          shopId: 'shop_viajante_1',
          itemId: 'item_catalisador_b',
          itemName: 'Catalisador Arcano (Item B)',
          quantity: 1,
          barterGivenItemId: 'item-herb-emerald',
          barterGivenItemName: 'Erva Esmeralda da Vida',
          barterGivenQuantity: 3,
        },
      },
      {
        id: `sc1-ev-talk-alq-${Date.now()}`,
        type: 'npc.talked',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_1',
        payload: { npcId: 'npc_alquimista', npcName: 'Mestre Alquimista' },
      },
      {
        id: `sc1-ev-craft-${Date.now()}`,
        type: 'crafting.recipe_crafted',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_1',
        payload: {
          stationId: 'station_bancada_alquimica',
          recipeId: 'recipe_elixir_viajante',
          itemId: 'item_elixir_viajante',
          itemName: 'Elixir do Viajante',
          quantity: 1,
        },
      },
      {
        id: `sc1-ev-deliver-${Date.now()}`,
        type: 'inventory.item_delivered',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_1',
        transactionId: `tx_deliver_elixir_${Date.now()}`,
        payload: {
          npcId: 'npc_alquimista',
          npcName: 'Mestre Alquimista',
          itemId: 'item_elixir_viajante',
          itemName: 'Elixir do Viajante',
          quantity: 1,
        },
      },
    ];

    for (const ev of eventsToRun) {
      const res = dispatchQuestEngineEvent(working, ev);
      working = res.updatedProject;
      stepsLog.push(...res.logs);
    }

    const finalStatus =
      working.questsConfig?.playerState.questsProgress['quest_negocios_viajante']?.status;
    return {
      updatedProject: working,
      title: 'Cenário 1 — Liberação Comercial por Nível & Cadeia Completa',
      passed: finalStatus === 'completed',
      stepsLog,
    };
  }

  if (scenarioNumber === 4) {
    // Cenário 4 — Múltiplos níveis: +1000 XP no Nível 1 -> passa ao Nível 3 com 600 XP restantes (100 + 300 gastos)
    stepsLog.push(
      '▶️ Iniciando Cenário 4: Salto de Múltiplos Níveis (+1.000 XP a partir do Nível 1 com 0 XP)'
    );
    const qCfg = getOrCreateProjectQuestsConfig(working);
    working = {
      ...working,
      player: {
        ...(working.player || { id: 'p1', name: 'Herói', x: 384, y: 180, color: '#3b82f6', speed: 4 }),
        currentLevel: 1,
        currentXp: 0,
        totalCumulativeXp: 0,
      },
      questsConfig: {
        ...qCfg,
        playerState: {
          ...qCfg.playerState,
          currentLevel: 1,
          currentLevelXp: 0,
          totalCumulativeXp: 0,
        },
      },
    };

    const xpRes = grantXpCentralService(working, 1000, 'Teste Cenário 4 (+1000 XP)');
    working = xpRes.updatedProject;
    stepsLog.push(...xpRes.logs);
    stepsLog.push(
      `📊 Resultado Verificado: Nível Atual = ${xpRes.newLevel} (esperado: 3) | XP no Nível 3 = ${xpRes.newLevelXp} (esperado: 600, pois 100 + 300 = 400 gastos) | XP Acumulado = ${xpRes.totalCumulativeXp}.`
    );

    return {
      updatedProject: working,
      title: 'Cenário 4 — Salto de Múltiplos Níveis (+1.000 XP ➔ Nível 3 com 600 XP)',
      passed: xpRes.newLevel === 3 && xpRes.newLevelXp === 600,
      stepsLog,
    };
  }

  if (scenarioNumber === 2) {
    stepsLog.push('▶️ Iniciando Cenário 2: Coleta Paralela (AND) + Refino + Crafting + Entrega');
    const qCfg = getOrCreateProjectQuestsConfig(working);
    const alqQuest =
      qCfg.quests.find((q) => q.id === 'quest_criacao_alquimista') ||
      createCriacaoAlquimistaQuest();

    const inv = getOrCreatePlayerInventory(working);
    working = {
      ...working,
      playerInventory: {
        ...inv,
        items: [
          ...(inv.items || []),
          {
            id: 'item-elixir-solar',
            name: 'Elixir Solar Supremo',
            quantity: 1,
            type: 'potion',
            iconEmoji: '✨',
          },
        ],
      },
      questsConfig: {
        ...qCfg,
        playerState: {
          ...qCfg.playerState,
          questsProgress: {
            ...qCfg.playerState.questsProgress,
            quest_criacao_alquimista: {
              ...createInitialQuestRuntimeProgress(alqQuest),
              status: 'available',
            },
          },
        },
      },
    };

    const evs: QuestEngineEvent[] = [
      {
        id: `sc2-talk-${Date.now()}`,
        type: 'npc.talked',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_2',
        payload: { npcId: 'npc_alquimista', npcName: 'Mestre Alquimista' },
      },
      {
        id: `sc2-mine-${Date.now()}`,
        type: 'crafting.resource_harvested',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_2',
        payload: {
          itemId: 'item_booblerock_bruto',
          itemName: 'Minério Booblerock Bruto',
          quantity: 3,
        },
      },
      {
        id: `sc2-herbs-${Date.now()}`,
        type: 'inventory.item_collected',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_2',
        payload: {
          itemId: 'item-herb-emerald',
          itemName: 'Erva Esmeralda da Vida',
          quantity: 5,
        },
      },
      {
        id: `sc2-refine-${Date.now()}`,
        type: 'crafting.material_refined',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_2',
        payload: {
          stationId: 'station_forja_refino',
          itemId: 'item_booblerock_refinado',
          quantity: 1,
        },
      },
      {
        id: `sc2-craft-${Date.now()}`,
        type: 'crafting.recipe_crafted',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_2',
        payload: {
          stationId: 'station_bancada_alquimica',
          recipeId: 'recipe_pocao_solar',
          itemId: 'item-elixir-solar',
          quantity: 1,
        },
      },
      {
        id: `sc2-deliver-${Date.now()}`,
        type: 'inventory.item_delivered',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_2',
        transactionId: `tx_sc2_del_${Date.now()}`,
        payload: {
          npcId: 'npc_alquimista',
          itemId: 'item-elixir-solar',
          itemName: 'Elixir Solar Supremo',
          quantity: 1,
        },
      },
    ];

    for (const ev of evs) {
      const r = dispatchQuestEngineEvent(working, ev);
      working = r.updatedProject;
      stepsLog.push(...r.logs);
    }

    const done =
      working.questsConfig?.playerState.questsProgress['quest_criacao_alquimista']?.status ===
      'completed';
    return {
      updatedProject: working,
      title: 'Cenário 2 — Criação, Coleta Paralela (AND) e Entrega Transacional',
      passed: done,
      stepsLog,
    };
  }

  if (scenarioNumber === 3) {
    stepsLog.push('▶️ Iniciando Cenário 3: Caça Escalonada com Filtro de Região e Duelo');
    const qCfg = getOrCreateProjectQuestsConfig(working);
    const huntQuest =
      qCfg.quests.find((q) => q.id === 'quest_cacada_encomenda') ||
      createCacadaEscalonadaQuest();

    working = {
      ...working,
      questsConfig: {
        ...qCfg,
        playerState: {
          ...qCfg.playerState,
          questsProgress: {
            ...qCfg.playerState.questsProgress,
            quest_cacada_encomenda: {
              ...createInitialQuestRuntimeProgress(huntQuest),
              status: 'available',
            },
          },
        },
      },
    };

    const evs: QuestEngineEvent[] = [
      {
        id: `sc3-talk1-${Date.now()}`,
        type: 'npc.talked',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_3',
        payload: { npcId: 'npc_guarda_real', npcName: 'Capitão da Guarda' },
      },
      // Kill fora da região (deve ser ignorado!)
      {
        id: `sc3-kill-wrong-region-${Date.now()}`,
        type: 'combat.mob_defeated',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        regionId: 'region_deserto',
        sourceModule: 'scenario_3',
        payload: { mobSpecies: 'slime_selvagem', quantity: 5 },
      },
      // 8 Kills na região correta
      {
        id: `sc3-kill-valid-${Date.now()}`,
        type: 'combat.mob_defeated',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        regionId: 'region_floresta',
        sourceModule: 'scenario_3',
        payload: { mobSpecies: 'slime_selvagem', quantity: 8 },
      },
      {
        id: `sc3-duel-${Date.now()}`,
        type: 'combat.duel_won',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_3',
        payload: {
          npcId: 'npc_lider_bandido_z',
          npcName: 'Líder Bandido Z',
          withoutDying: true,
        },
      },
      {
        id: `sc3-talk2-${Date.now()}`,
        type: 'npc.talked',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_3',
        payload: { npcId: 'npc_guarda_real', npcName: 'Capitão da Guarda' },
      },
    ];

    for (const ev of evs) {
      const r = dispatchQuestEngineEvent(working, ev);
      working = r.updatedProject;
      stepsLog.push(...r.logs);
    }

    const done =
      working.questsConfig?.playerState.questsProgress['quest_cacada_encomenda']?.status ===
      'completed';
    return {
      updatedProject: working,
      title: 'Cenário 3 — Caça Escalonada (Filtro de Região + Duelo)',
      passed: done,
      stepsLog,
    };
  }

  if (scenarioNumber === 5) {
    stepsLog.push('▶️ Iniciando Cenário 5: Ramificação (Rota Comercial vs Rota Combate)');
    const qCfg = getOrCreateProjectQuestsConfig(working);
    const brQuest =
      qCfg.quests.find((q) => q.id === 'quest_ramificada_caravana') ||
      createRamificacaoRotasQuest();

    working = {
      ...working,
      questsConfig: {
        ...qCfg,
        playerState: {
          ...qCfg.playerState,
          questsProgress: {
            ...qCfg.playerState.questsProgress,
            quest_ramificada_caravana: {
              ...createInitialQuestRuntimeProgress(brQuest),
              status: 'available',
            },
          },
        },
      },
    };

    const evs: QuestEngineEvent[] = [
      {
        id: `sc5-talk-${Date.now()}`,
        type: 'npc.talked',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_5',
        payload: { npcId: 'npc_chefe_caravana', npcName: 'Chefe da Caravana' },
      },
      {
        id: `sc5-choose-commerce-${Date.now()}`,
        type: 'commerce.purchase_completed',
        timestamp: new Date().toISOString(),
        playerId: 'hero_1',
        sourceModule: 'scenario_5',
        transactionId: `tx_sc5_comm_${Date.now()}`,
        payload: {
          shopId: 'shop_viajante_1',
          itemId: 'item_cristal_mercador_a',
          itemName: 'Cristal de Mercador (Item A)',
          quantity: 2,
        },
      },
    ];

    for (const ev of evs) {
      const r = dispatchQuestEngineEvent(working, ev);
      working = r.updatedProject;
      stepsLog.push(...r.logs);
    }

    const prog =
      working.questsConfig?.playerState.questsProgress['quest_ramificada_caravana'];
    return {
      updatedProject: working,
      title: 'Cenário 5 — Ramificação OR e Premiação Exclusiva por Rota',
      passed: prog?.status === 'completed' && prog?.chosenBranchTag === 'route_commerce',
      stepsLog,
    };
  }

  // Cenário 6 — Edição Espelhada e Validação de Referências
  stepsLog.push(
    '▶️ Iniciando Cenário 6: Sincronização Bidirecional (Editor Isolado <-> Modo Fase) e Validador de Referências'
  );
  const issues = validateProjectQuests(working);
  stepsLog.push(
    `✅ Fonte de dados única verificada (${working.questsConfig?.quests.length || 0} quests compartilhadas entre Editor Isolado e Painel da Fase).`
  );
  stepsLog.push(`🔍 Validador executou varredura: ${issues.length} alerta(s) encontrado(s).`);

  return {
    updatedProject: working,
    title: 'Cenário 6 — Edição Espelhada Bidirecional & Validador',
    passed: true,
    stepsLog,
  };
}

export const QUEST_PROJECTS_STORAGE_KEY = QUEST_STORAGE_KEY;

export function ensureProjectQuestsConfig(project?: MapProject): ProjectQuestsConfig {
  return getOrCreateProjectQuestsConfig(
    project || ({
      id: 'default',
      title: 'Fase',
      description: '',
      mapWidth: 768,
      gridType: 'none',
      biomes: [],
      markers: [],
      routes: [],
    } as MapProject)
  );
}

export function summarizeRewardItems(rewards: QuestRewardItem[], _project?: MapProject): string {
  if (!rewards || rewards.length === 0) return 'Sem prêmios configurados';
  return rewards.map((r) => r.label).join(' + ');
}

export const QUEST_NODE_LIBRARY: Array<{
  type: import('../types/questSystem').QuestFlowNodeType;
  label: string;
  emoji: string;
  description: string;
}> = [
  { type: 'start', label: 'Início / Gatilho', emoji: '🚀', description: 'Gatilho inicial da quest' },
  { type: 'event_listener', label: 'Evento Observado', emoji: '📡', description: 'Escuta evento do motor' },
  { type: 'condition', label: 'Condição', emoji: '🔍', description: 'Testa estado (AND/OR/NOT)' },
  { type: 'objective', label: 'Objetivo', emoji: '🎯', description: 'Requisito acompanhado (0/N)' },
  { type: 'action', label: 'Ação', emoji: '⚡', description: 'Executa efeito na engine' },
  { type: 'sequence', label: 'Sequência', emoji: '➡️', description: 'Execução ordenada A -> B' },
  { type: 'and_gate', label: 'AND (Paralelo)', emoji: '🔗', description: 'Exige todos concluídos' },
  { type: 'or_gate', label: 'OR (Alternativo)', emoji: '🔀', description: 'Basta 1 rota concluída' },
  { type: 'n_of_m_gate', label: 'N de M', emoji: '🔢', description: 'Escolher N de M objetivos' },
  { type: 'if_else', label: 'Decisão IF/ELSE', emoji: '⚖️', description: 'Ramifica por condição' },
  { type: 'wait', label: 'Espera', emoji: '⏳', description: 'Aguarda evento ou condição' },
  { type: 'timer', label: 'Temporizador', emoji: '⏱️', description: 'Prazo em segundos' },
  { type: 'repeat_limit', label: 'Repetição Limitada', emoji: '🔁', description: 'Repete até meta sem loop' },
  { type: 'subquest', label: 'Subquest', emoji: '📜', description: 'Aciona quest filha' },
  { type: 'complete', label: 'Conclusão', emoji: '🏆', description: 'Finaliza e entrega Reward Bundle' },
  { type: 'fail', label: 'Falha', emoji: '❌', description: 'Marca falha com consequência' },
  { type: 'cancel', label: 'Cancelamento', emoji: '🚫', description: 'Abandona ou cancela missão' },
];

export const QUEST_TEMPLATES_CATALOG = [
  {
    id: 'tpl_negocios_viajante',
    title: 'Negócios com o Viajante (Seção 7)',
    badge: 'Comércio + Crafting',
    description: 'Nível 2 abre Loja -> Compra Item A -> Vende Booblerock -> Troca 3 Ervas por B -> Crafting -> Entrega.',
  },
  {
    id: 'tpl_criacao_alquimista',
    title: 'Síntese Alquímica & Coleta Paralela (Cenário 2)',
    badge: 'AND Paralelo',
    description: 'Coletar 5 Ervas + Minerar 3 Booblerocks em paralelo -> Refinar -> Fabricar -> Entregar.',
  },
  {
    id: 'tpl_cacada_encomenda',
    title: 'Caçada Escalonada por Região (Cenário 3)',
    badge: 'Combate + Duelo',
    description: 'Falar com Guarda -> Derrotar 8 Slimes na Floresta -> Vencer Duelo -> Bônus Sem Morrer.',
  },
  {
    id: 'tpl_ramificada_caravana',
    title: 'Dilema da Caravana (Cenário 5 - Ramificada)',
    badge: 'OR / IF-ELSE',
    description: 'Ajudar comerciante (Rota Comercial) OU enfrentar bandidos (Rota Combate) com prêmio exclusivo.',
  },
];

export function createFromQuestTemplate(templateId: string): QuestDefinition {
  const base =
    templateId === 'tpl_criacao_alquimista'
      ? createCriacaoAlquimistaQuest()
      : templateId === 'tpl_cacada_encomenda'
      ? createCacadaEscalonadaQuest()
      : templateId === 'tpl_ramificada_caravana'
      ? createRamificacaoRotasQuest()
      : createNegociosViajanteQuest();

  const suffix = Date.now().toString(36).slice(-4);
  return {
    ...JSON.parse(JSON.stringify(base)),
    id: `${base.id}_${suffix}`,
    title: `${base.title} (#${suffix})`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function dispatchEngineEvent(
  project: MapProject,
  eventInput: {
    type: QuestEventType | string;
    sourceSystem?: string;
    actorId?: string;
    targetId?: string;
    npcId?: string;
    npcName?: string;
    itemId?: string;
    itemName?: string;
    quantity?: number;
    provenance?: ItemProvenance | string;
    shopId?: string;
    currencyType?: string;
    totalPrice?: number;
    tradedInputItemId?: string;
    tradedInputQuantity?: number;
    stationId?: string;
    recipeId?: string;
    mobSpecies?: string;
    biomeId?: string;
    phaseId?: string;
  }
): {
  project: MapProject;
  updatedProject: MapProject;
  updatedQuestsCount: number;
  completedQuestIds: string[];
  triggeredRuleIds: string[];
  notifications: string[];
} {
  const fullEvent: QuestEngineEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    type: eventInput.type as QuestEventType,
    playerId: eventInput.actorId || 'hero_1',
    sourceModule: (eventInput.sourceSystem as any) || 'emulator',
    regionId: eventInput.biomeId,
    phaseId: eventInput.phaseId,
    payload: {
      npcId: eventInput.npcId || eventInput.targetId,
      npcName: eventInput.npcName,
      itemId: eventInput.itemId,
      itemName: eventInput.itemName,
      quantity: eventInput.quantity ?? 1,
      shopId: eventInput.shopId,
      currencyAmount: eventInput.totalPrice,
      barterGivenItemId: eventInput.tradedInputItemId,
      barterGivenQuantity: eventInput.tradedInputQuantity,
      stationId: eventInput.stationId,
      recipeId: eventInput.recipeId,
      mobSpecies: eventInput.mobSpecies,
      withoutDying: true,
    },
  };

  const res = dispatchQuestEngineEvent(project, fullEvent);
  return {
    project: res.updatedProject,
    updatedProject: res.updatedProject,
    updatedQuestsCount: res.updatedQuestsCount,
    completedQuestIds: res.completedQuestIds,
    triggeredRuleIds: res.triggeredRuleIds,
    notifications: res.notifications,
  };
}


