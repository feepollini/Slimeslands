import type { ItemCurrencyType, InventoryItemRarity } from './map';

export const QUEST_SYSTEM_SCHEMA_VERSION = 2;

// ============================================================================
// 1. CATÁLOGO DE EVENTOS TIPADOS (EVENT BUS CENTRAL)
// ============================================================================

export type QuestEventType =
  // 4.1 NPCs e Diálogo
  | 'npc.talked'
  | 'dialogue.started'
  | 'dialogue.option_selected'
  | 'dialogue.completed'
  // 4.2 Inventário, Entrega e Utilização
  | 'inventory.item_acquired'
  | 'inventory.item_collected'
  | 'inventory.item_equipped'
  | 'inventory.item_unequipped'
  | 'inventory.item_consumed'
  | 'inventory.item_read'
  | 'inventory.item_delivered'
  // 4.3 Comércio e Economia (Obrigatório)
  | 'shop.unlocked'
  | 'shop.opened'
  | 'commerce.purchase_completed'
  | 'commerce.sale_completed'
  | 'commerce.trade_completed'
  | 'commerce.currency_changed'
  // 4.4 Progressão e Desbloqueios
  | 'player.xp_gained'
  | 'player.level_up'
  | 'player.level_reached'
  | 'progression.region_unlocked'
  | 'progression.recipe_unlocked'
  | 'progression.flag_changed'
  | 'progression.reputation_changed'
  // 4.5 Combate, Duelo, Captura e Slimes
  | 'combat.mob_defeated'
  | 'combat.boss_defeated'
  | 'combat.duel_won'
  | 'combat.duel_lost'
  | 'combat.slime_captured'
  | 'combat.card_obtained'
  // 4.6 Coleta, Extração e Crafting
  | 'crafting.resource_harvested'
  | 'crafting.material_refined'
  | 'crafting.recipe_crafted'
  // 4.7 Exploração, Interação e Mundo
  | 'world.region_entered'
  | 'world.marker_approached'
  | 'world.chest_opened'
  | 'world.portal_activated'
  | 'world.defense_completed'
  | 'world.npc_died'
  // 4.8 Tempo e Especiais
  | 'timer.expired'
  | 'quest.started'
  | 'quest.completed'
  | 'quest.failed'
  | 'custom.event_triggered';

export type AcquisitionSourceType =
  | 'any'
  | 'shop_purchase'
  | 'npc_trade'
  | 'map_harvest'
  | 'mob_drop'
  | 'crafting_station'
  | 'quest_reward';

export interface QuestEngineEvent {
  id: string; // ID único para idempotência
  type: QuestEventType;
  timestamp: string;
  playerId: string;
  phaseId?: string;
  regionId?: string;
  sourceModule: string;
  transactionId?: string; // Obrigatório em compras, vendas, trocas e entregas para impedir contagem dupla
  payload: {
    npcId?: string;
    npcName?: string;
    dialogueOptionId?: string;
    shopId?: string;
    shopName?: string;
    itemId?: string;
    itemName?: string;
    itemCategory?: string;
    itemRarity?: InventoryItemRarity;
    quantity?: number;
    currencyType?: ItemCurrencyType;
    unitPrice?: number;
    totalPrice?: number;
    barterGivenItemId?: string;
    barterGivenItemName?: string;
    barterGivenQuantity?: number;
    acquisitionSource?: AcquisitionSourceType;
    mobId?: string;
    mobSpecies?: string;
    isBoss?: boolean;
    withoutDying?: boolean;
    stationId?: string;
    recipeId?: string;
    markerId?: string;
    levelReached?: number;
    previousLevel?: number;
    xpAmount?: number;
    reputationFactionId?: string;
    reputationValue?: number;
    flagKey?: string;
    flagValue?: string | number | boolean;
    cardId?: string;
    cardRarity?: InventoryItemRarity;
  };
}

// ============================================================================
// 2. CONDIÇÕES, OPERADORES LÓGICOS & REGRAS GLOBAIS
// ============================================================================

export type ConditionComparator = '>=' | '<=' | '=' | '!=' | '>' | '<';

export type ConditionSubjectType =
  | 'player_level'
  | 'quest_status'
  | 'shop_unlocked'
  | 'region_unlocked'
  | 'inventory_has_item'
  | 'currency_balance'
  | 'reputation_value'
  | 'world_flag'
  | 'active_phase';

export interface QuestConditionLeaf {
  id: string;
  subject: ConditionSubjectType;
  targetId?: string; // ex: shopId, questId, itemId, flagKey, factionId
  comparator: ConditionComparator;
  value: string | number | boolean;
  label?: string;
}

export interface QuestConditionGroup {
  id: string;
  operator: 'AND' | 'OR' | 'NOT';
  conditions: QuestConditionLeaf[];
  subGroups?: QuestConditionGroup[];
}

export interface GlobalEventRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  triggerEventType: QuestEventType;
  conditionGroup: QuestConditionGroup;
  actions: QuestActionDefinition[];
  oncePerSave: boolean; // Garante idempotência (ex: atingir nível 2 abre loja uma única vez)
}

// ============================================================================
// 3. OBJETIVOS, AÇÕES E PACOTES DE RECOMPENSAS (REWARD BUNDLES)
// ============================================================================

export type ObjectiveCountingMode =
  | 'events_after_activation' // Padrão seguro: só conta eventos ocorridos após o objetivo ficar ativo
  | 'retroactive_state' // Conta posse/estado prévio já existente no save
  | 'strict_source_after_activation'; // Exige origem comprovada (ex: comprado especificamente na loja Y após ativação)

export type ObjectiveKind =
  | 'talk_npc'
  | 'buy_item'
  | 'sell_item'
  | 'trade_barter'
  | 'open_shop'
  | 'collect_item'
  | 'possess_item'
  | 'deliver_item'
  | 'craft_recipe'
  | 'refine_material'
  | 'read_document'
  | 'equip_item'
  | 'defeat_mob'
  | 'win_duel'
  | 'reach_level'
  | 'enter_region'
  | 'defend_npc_timer'
  | 'custom_event';

export interface QuestObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  editorInstruction?: string;
  kind: ObjectiveKind;
  countingMode: ObjectiveCountingMode;
  requiredAmount: number;
  isOptional?: boolean;
  isHiddenUntilActive?: boolean;

  // Filtros e Referências Estáveis
  targetPhaseId?: string; // Vazio = qualquer fase (suporta quests entre fases)
  targetRegionId?: string;
  targetMarkerId?: string;
  targetNpcId?: string;
  targetNpcName?: string;
  targetShopId?: string;
  targetShopName?: string;
  targetItemId?: string;
  targetItemName?: string;
  targetItemTag?: string;
  targetItemRarity?: InventoryItemRarity;
  requiredCurrency?: ItemCurrencyType;
  barterGiveItemId?: string;
  barterGiveItemName?: string;
  barterGiveAmount?: number;
  targetStationId?: string;
  targetRecipeId?: string;
  targetMobSpecies?: string;
  requireNoDeath?: boolean;
  consumeItemOnDelivery?: boolean; // Na entrega, remove exatamente requiredAmount na confirmação
  branchKey?: string; // Se pertencer a uma rota condicional (ex: 'route_commercial' vs 'route_combat')
}

export type QuestActionType =
  | 'unlock_shop'
  | 'lock_shop'
  | 'grant_xp'
  | 'adjust_currency'
  | 'give_item'
  | 'remove_item'
  | 'unlock_region'
  | 'unlock_recipe'
  | 'unlock_quest'
  | 'set_world_flag'
  | 'adjust_reputation'
  | 'spawn_marker'
  | 'despawn_marker'
  | 'show_toast_message';

export interface QuestActionDefinition {
  id: string;
  type: QuestActionType;
  targetId?: string;
  targetName?: string;
  amount?: number;
  currencyType?: ItemCurrencyType;
  flagValue?: string | number | boolean;
  message?: string;
}

export type QuestRewardCategory =
  | 'xp'
  | 'currency'
  | 'inventory_item'
  | 'card'
  | 'unlock_content'
  | 'world_change'
  | 'reputation';

export type RewardGrantMoment =
  | 'on_quest_complete'
  | 'on_stage_complete'
  | 'on_branch_chosen'
  | 'on_first_completion_only';

export type FullBackpackPolicy = 'pending_claim_outbox' | 'overflow_slot';

export interface QuestRewardItem {
  id: string;
  category: QuestRewardCategory;
  label: string;
  grantMoment: RewardGrantMoment;
  stageOrBranchId?: string; // Vincula a uma etapa ou rota específica (ex: rota comercial vs combate)
  isOptionalBonus?: boolean;
  visibility: 'revealed' | 'preview' | 'hidden';
  probabilityPercent?: number; // 100 para fixo, <100 para sorteio

  // Parâmetros específicos por tipo
  xpAmount?: number;
  xpTarget?: 'player' | 'active_character' | 'all_party';
  currencyType?: ItemCurrencyType;
  currencyAmount?: number;
  itemId?: string;
  itemName?: string;
  itemQuantity?: number;
  itemRarity?: InventoryItemRarity;
  fullBackpackPolicy?: FullBackpackPolicy;
  cardId?: string;
  cardName?: string;
  cardRarity?: InventoryItemRarity;
  unlockTargetType?: 'shop' | 'region' | 'phase' | 'portal' | 'recipe' | 'npc' | 'quest' | 'chapter';
  unlockTargetId?: string;
  unlockTargetName?: string;
  worldFlagKey?: string;
  worldFlagValue?: string | number | boolean;
  reputationFactionId?: string;
  reputationDelta?: number;
}

// ============================================================================
// 4. GRAFO VISUAL DE NÓS E DEFINIÇÃO DE QUEST
// ============================================================================

export type QuestFlowNodeType =
  | 'start'
  | 'event_listener'
  | 'condition'
  | 'objective'
  | 'action'
  | 'sequence'
  | 'and_gate'
  | 'or_gate'
  | 'n_of_m_gate'
  | 'if_else'
  | 'wait'
  | 'timer'
  | 'repeat_limit'
  | 'subquest'
  | 'complete'
  | 'fail'
  | 'cancel';

export interface QuestGraphNode {
  id: string;
  type: QuestFlowNodeType;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
  groupId?: string;
  comment?: string;

  // Vínculo com etapa/objetivo/condição/ação
  objectiveId?: string;
  conditionGroup?: QuestConditionGroup;
  actions?: QuestActionDefinition[];
  nOfMRequired?: number;
  timerSeconds?: number;
  repeatMaxCount?: number;
  subQuestId?: string;
  branchTag?: string;
}

export interface QuestGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  portType: 'success' | 'failure' | 'alternative' | 'next';
  label?: string;
}

export type QuestStageFlowOperator =
  | 'SEQUENTIAL' // Etapa B só ativa após esta
  | 'PARALLEL_AND' // Executa em paralelo com outras etapas do mesmo bloco AND
  | 'ALTERNATIVE_OR' // Basta concluir uma das alternativas OR
  | 'N_OF_M' // Concluir N objetivos do grupo
  | 'BRANCH_IF_ELSE'; // Ramifica conforme condição

export interface QuestStageStep {
  id: string;
  order: number;
  title: string;
  flowOperator: QuestStageFlowOperator;
  nOfMRequired?: number;
  branchCondition?: QuestConditionGroup;
  branchTrueStageId?: string;
  branchFalseStageId?: string;
  objectiveIds: string[];
  onStartActions?: QuestActionDefinition[];
  onCompleteActions?: QuestActionDefinition[];
}

export interface QuestDefinition {
  id: string;
  schemaVersion: number;
  title: string;
  subtitle?: string;
  description: string;
  campaignId: string;
  chapterId: string;
  primaryPhaseId?: string; // Fase onde começa (pode continuar em outras)
  involvedPhaseIds?: string[]; // Fases envolvidas em quests multi-fases
  category: 'main' | 'side' | 'commercial' | 'combat' | 'crafting' | 'exploration' | 'defense';
  repeatablePolicy: 'once' | 'repeatable' | 'daily';

  // Condições para a quest ficar disponível (ex: Loja Viajante 1 desbloqueada, Nível >= 2)
  availabilityConditions?: QuestConditionGroup;
  unavailableFallbackDialogue?: string;

  // Etapas (Modo Assistente) e Objetivos
  stages: QuestStageStep[];
  objectives: QuestObjectiveDefinition[];

  // Grafo de Nós (Modo Avançado — sincronizado com o mesmo modelo)
  nodes: QuestGraphNode[];
  edges: QuestGraphEdge[];

  // Aba Recompensas / Ganhos
  rewards: QuestRewardItem[];

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// 5. ESTADO PERSISTENTE DO JOGADOR (SEPARADO DA DEFINIÇÃO DA QUEST)
// ============================================================================

export type QuestRuntimeStatus =
  | 'locked'
  | 'available'
  | 'active'
  | 'completed'
  | 'failed'
  | 'abandoned';

export type ObjectiveRuntimeStatus =
  | 'inactive'
  | 'active'
  | 'completed'
  | 'failed'
  | 'skipped';

export interface ObjectiveRuntimeProgress {
  objectiveId: string;
  status: ObjectiveRuntimeStatus;
  currentAmount: number;
  requiredAmount: number;
  activatedAt?: string;
  completedAt?: string;
  processedTransactionIds: string[]; // Impede contagem dupla da mesma compra/venda/troca/entrega
}

export interface QuestRuntimeProgress {
  questId: string;
  status: QuestRuntimeStatus;
  currentStageId?: string;
  chosenBranchTag?: string;
  acceptedAt?: string;
  completedAt?: string;
  completionCount: number;
  objectivesProgress: Record<string, ObjectiveRuntimeProgress>;
  claimedRewardIds: string[]; // Impede concessão duplicada de recompensas
}

export interface QuestRewardBundleReceipt {
  bundleId: string;
  questId: string;
  completionId: string;
  playerId: string;
  grantedAt: string;
  summaryText: string;
  itemsGranted: string[];
  pendingClaimItems: {
    itemId: string;
    itemName: string;
    quantity: number;
    rarity?: InventoryItemRarity;
  }[];
}

// ============================================================================
// 6. SISTEMA DE CRESCIMENTO, CURVAS DE XP E NÍVEIS (SEÇÃO 18)
// ============================================================================

export type LevelCurveType =
  | 'manual' // Valores explícitos por nível (ex: 1->2 = 100, 2->3 = 300, 3->4 = 500)
  | 'linear' // xp_next(lvl) = baseXp + (lvl - 1) * linearStep
  | 'geometric' // xp_next(lvl) = baseXp * (1 + rate)^(lvl - 1)
  | 'polynomial'; // xp_next(lvl) = baseXp * (lvl ^ exponent)

export type ExcessXpPolicy = 'retain' | 'discard' | 'convert_to_gold';

export type AttributeGrowthMode =
  | 'compound_previous' // Composição sobre o nível anterior (ex: 100 -> 105 -> 110.25)
  | 'base_linear'; // Percentual sempre sobre o valor base do nível 1

export type AttributeRoundingMode = 'round' | 'floor' | 'ceil' | 'two_decimals';

export interface AttributeGrowthRule {
  attribute: 'hp' | 'mp' | 'attack' | 'defense' | 'speed' | 'magic';
  label: string;
  baseValue: number;
  percentPerLevel: number; // ex: +5% por nível
  flatBonusPerLevel: number; // ex: +0 ou +2 fixo por nível
  growthMode: AttributeGrowthMode;
  rounding: AttributeRoundingMode;
  maxCap?: number;
  levelExceptions?: Record<number, number>; // Sobrescrita opcional em nível específico
}

export interface LevelMilestoneReward {
  level: number;
  description: string;
  actions: QuestActionDefinition[];
}

export interface CharacterGrowthConfig {
  initialLevel: number;
  maxLevel: number;
  inheritGlobalTable?: boolean;
  curveType: LevelCurveType;
  convention: 'incremental_to_next' | 'cumulative_total';
  baseXp: number; // Padrão 100
  linearStep: number; // Padrão 200 -> gera 100, 300, 500, 700, 900!
  geometricRatePercent: number; // ex: 25%
  polynomialExponent: number; // ex: 1.5
  manualIncrementalOverrides: Record<number, number>; // Nível -> XP para passar ao seguinte
  excessXpPolicy: ExcessXpPolicy;
  attributeRules: AttributeGrowthRule[];
  levelMilestones: LevelMilestoneReward[];
}

export interface ComputedLevelRow {
  level: number;
  xpToNextLevel: number; // Incremental (ex: 100, 300, 500, 700, 900)
  cumulativeXpForNextLevel: number; // Acumulado (ex: 100, 400, 900, 1600, 2500)
  cumulativeXpAtStartOfLevel: number; // Quanto XP total o jogador já acumulou ao entrar neste nível (0, 100, 400, 900, 1600)
  attributes: {
    hp: number;
    mp: number;
    attack: number;
    defense: number;
    speed: number;
    magic: number;
  };
}

export interface PlayerProgressionRuntimeState {
  playerId: string;
  currentLevel: number;
  currentLevelXp: number; // XP dentro do nível atual (ex: 600 após ganhar 1000 XP no nível 1!)
  totalCumulativeXp: number; // XP total acumulado desde o início
  unlockedShopIds: string[];
  unlockedRegionIds: string[];
  unlockedRecipeIds: string[];
  worldFlags: Record<string, string | number | boolean>;
  reputationByFaction: Record<string, number>;
  questsProgress: Record<string, QuestRuntimeProgress>;
  firedGlobalRuleIds: string[];
  processedEventIds: string[];
  rewardReceipts: QuestRewardBundleReceipt[];
  eventAuditLog: QuestEngineEvent[];
}

export interface ProjectQuestsConfig {
  schemaVersion: number;
  quests: QuestDefinition[];
  globalRules: GlobalEventRule[];
  activeQuestId?: string;
  trackedQuestIds?: string[];
  playerState: PlayerProgressionRuntimeState;
}

export interface QuestValidationIssue {
  id: string;
  severity: 'error' | 'warning';
  questId: string;
  nodeOrObjectiveId?: string;
  title: string;
  details: string;
  fixSuggestion: string;
}
