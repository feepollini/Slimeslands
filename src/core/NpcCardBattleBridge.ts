import { CARD_TEMPLATES, CARD_ABILITIES, SKILL_POOL } from './constants';
import { ProgressionManager } from './ProgressionManager';
import { MobbyManager, Mobby } from './MobbyManager';
import raritiesDefault from './rarities.json';
import scenariosDefault from './scenarios.json';
import soundsDefault from './sounds.json';
import {
  getMergedGameTemplatesSync,
  resolveMatrixOrGameCard,
} from '../ui/screens/forge_v2/utils/HestridiaMatrixRenderer';
import type { MapMarker, MapProject } from '../marker_dream/src/types/map';
import { isSlimeMarker } from '../marker_dream/src/utils/npcActionEngine';

export type RarityKey = 'common' | 'rare' | 'epic' | 'legendary';

export interface RarityRuleDefinition {
  key: RarityKey;
  label: string;
  icon: string;
  color: string;
  atkBonus: number;
  pvBonus: number;
  dropWeight: number;
}

export interface RolledCardVariation {
  variationId: string;
  baseCardId: string;
  baseCardName: string;
  variationName: string;
  variantTrait: string;
  variantLabel: string;
  serialNumber: string;
  rarity: RarityKey;
  rarityLabel: string;
  rarityIcon: string;
  rarityColor: string;
  basePv: number;
  baseAtk: number;
  rolledPv: number;
  rolledAtk: number;
  finalHp: number;
  finalAtk: number;
  atkMultiplier: number;
  pvMultiplier: number;
  category: string;
  image: string;
  artUrl: string;
  loreText: string;
  passiveAbilityId?: string;
  passiveAbilityName?: string;
  passiveAbilityIcon?: string;
  sourceNpcId?: string;
  sourceNpcName?: string;
  obtainedVia: 'boss_battle' | 'card_duel' | 'scan' | 'quest' | 'booster';
  obtainedAt: number;
  rawMatrixCard?: any;
}

export interface ActiveNpcBattleContext {
  battleSessionId: string;
  markerId: string;
  npcId: string;
  npcName: string;
  npcAvatarUrl: string;
  npcImage: string;
  npcVideoUrl?: string;
  npcColor: string;
  battleMode: 'boss' | 'duel';
  isSlimeOrMobby: boolean;
  matrixCardId: string;
  matrixCardName: string;
  deckCardIds: string[];
  rarityDropRule: 'auto' | 'default' | RarityKey;
  npcHp: number;
  npcMaxHp: number;
  npcAtk: number;
  speechPhrases: string[];
  scanDialogueText?: string;
  linkedMobbyId?: string;
  passiveAbilityId?: string;
  activeArtifactId?: string;
  battleScenarioKey?: string;
  battleBgmUrl?: string;
  phaseId?: string;
  phaseName?: string;
  startedAt: number;
}

export interface UnlockedArtifactDrop {
  id: string;
  name: string;
  icon: string;
  description: string;
  image?: string;
  group?: string;
}

export interface NpcBattleOutcome {
  battleSessionId: string;
  markerId: string;
  npcName: string;
  battleMode: 'boss' | 'duel';
  victory: boolean;
  droppedVariation?: RolledCardVariation;
  rolledVariation?: RolledCardVariation;
  unlockedArtifact?: UnlockedArtifactDrop;
  goldEarned: number;
  gemsEarned: number;
  xpEarned: number;
  coinsAwarded: number;
  gemsAwarded: number;
  xpAwarded: number;
  completedAt: number;
}

const ACTIVE_BATTLE_CONTEXT_KEY = 'slimelands_active_npc_battle_context_v1';
const LAST_BATTLE_OUTCOME_KEY = 'slimelands_last_npc_battle_outcome_v1';
const PLAYER_VARIATIONS_KEY = 'player_card_variations';

export const RARITY_META: Record<
  RarityKey,
  { label: string; color: string; glow: string }
> = {
  common: {
    label: 'Comum',
    color: '#94a3b8',
    glow: 'rgba(148, 163, 184, 0.45)',
  },
  rare: {
    label: 'Rara',
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.55)',
  },
  epic: {
    label: 'Épica',
    color: '#c084fc',
    glow: 'rgba(192, 132, 252, 0.65)',
  },
  legendary: {
    label: 'Lendária',
    color: '#fbbf24',
    glow: 'rgba(251, 191, 36, 0.75)',
  },
};

const VARIATION_TRAITS: {
  name: string;
  pvJitter: [number, number];
  atkJitter: [number, number];
}[] = [
  { name: 'Pura da Matriz', pvJitter: [1.0, 1.04], atkJitter: [1.0, 1.04] },
  { name: 'Fúria Rubra', pvJitter: [0.96, 1.02], atkJitter: [1.06, 1.15] },
  { name: 'Égide Cristalina', pvJitter: [1.08, 1.18], atkJitter: [0.97, 1.03] },
  { name: 'Pulso Astral', pvJitter: [1.03, 1.10], atkJitter: [1.03, 1.10] },
  { name: 'Essência Selvagem', pvJitter: [1.01, 1.12], atkJitter: [1.02, 1.12] },
  { name: 'Eco Dimensional', pvJitter: [1.05, 1.14], atkJitter: [1.04, 1.13] },
  { name: 'Chama Ancestral', pvJitter: [1.0, 1.08], atkJitter: [1.08, 1.18] },
  { name: 'Prisma Real', pvJitter: [1.07, 1.16], atkJitter: [1.07, 1.16] },
];

/**
 * Lê as regras de raridade ativas na Forja V2 (localStorage 'forge_rarities') ou fallback 'rarities.json'
 */
export function getRarityRules(): Record<RarityKey, RarityRuleDefinition> {
  let raw: any = raritiesDefault;
  try {
    const saved = localStorage.getItem('forge_rarities');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed === 'object') {
        raw = { ...raritiesDefault, ...parsed };
      }
    }
  } catch {}

  const weights: Record<RarityKey, number> = {
    common: 52,
    rare: 30,
    epic: 13,
    legendary: 5,
  };

  const result: Record<RarityKey, RarityRuleDefinition> = {
    common: {
      key: 'common',
      label: raw.common?.label || 'Comum',
      icon: raw.common?.icon || '⬜',
      color: raw.common?.color || '#aaaaaa',
      atkBonus: Number(raw.common?.atkBonus ?? 1.0),
      pvBonus: Number(raw.common?.pvBonus ?? 1.0),
      dropWeight: weights.common,
    },
    rare: {
      key: 'rare',
      label: raw.rare?.label || 'Raro',
      icon: raw.rare?.icon || '🔷',
      color: raw.rare?.color || '#4da6ff',
      atkBonus: Number(raw.rare?.atkBonus ?? 1.05),
      pvBonus: Number(raw.rare?.pvBonus ?? 1.05),
      dropWeight: weights.rare,
    },
    epic: {
      key: 'epic',
      label: raw.epic?.label || 'Épico',
      icon: raw.epic?.icon || '🔮',
      color: raw.epic?.color || '#b44eff',
      atkBonus: Number(raw.epic?.atkBonus ?? 1.12),
      pvBonus: Number(raw.epic?.pvBonus ?? 1.12),
      dropWeight: weights.epic,
    },
    legendary: {
      key: 'legendary',
      label: raw.legendary?.label || 'Lendário',
      icon: raw.legendary?.icon || '⭐',
      color: raw.legendary?.color || '#ffd700',
      atkBonus: Number(raw.legendary?.atkBonus ?? 1.2),
      pvBonus: Number(raw.legendary?.pvBonus ?? 1.2),
      dropWeight: weights.legendary,
    },
  };

  return result;
}

/**
 * Retorna todas as Cartas da Matriz (Forja V2 + Templates Base) disponíveis para vincular a NPCs, Eventos e Quests
 */
export function getAvailableMatrixCards(): any[] {
  try {
    const merged = getMergedGameTemplatesSync(CARD_TEMPLATES as any[]);
    if (Array.isArray(merged) && merged.length > 0) {
      return merged;
    }
  } catch (e) {
    console.warn('Erro ao ler matriz de cartas:', e);
  }
  return CARD_TEMPLATES as any[];
}

/**
 * Retorna todas as Habilidades Passivas da Forja V2 (TabAbilities / abilities.json)
 */
export function getAvailablePassiveAbilities(): {
  id: string;
  name: string;
  icon: string;
  description: string;
  triggerText?: string;
  color?: string;
}[] {
  try {
    const saved = localStorage.getItem('forge_abilities');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return CARD_ABILITIES as any[];
}

/**
 * Retorna todos os Artefatos / Habilidades Ativas da Forja V2 (TabArtefatos / skills.json)
 */
export function getAvailableActiveArtifacts(): {
  id: string;
  name: string;
  icon: string;
  image?: string;
  effect: string;
  category: string;
  group: string;
  description: string;
  flavorText?: string;
  power?: number;
}[] {
  try {
    const saved = localStorage.getItem('forge_skills');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return SKILL_POOL as any[];
}

/**
 * Retorna os Cenários configurados na Forja V2 (TabScenarios / scenarios.json)
 */
export function getAvailableBattleScenarios(): {
  key: string;
  label: string;
  previewUrl?: string;
}[] {
  const labels: Record<string, string> = {
    battle: '⚔️ Arena de Duelo Padrão (Forja V2)',
    boss_battle: '👹 Arena de Boss Battle (Forja V2)',
    lobby: '🏠 Cenário do Hub / Lobby',
    map: '🗺️ Cenário do Mapa Mundi',
    arsenal: '🛡️ Cenário do Arsenal',
    store: '🛒 Cenário da Loja',
    preparation: '🎴 Sala de Preparação',
    difficulty: '🔥 Tela de Desafio',
    coin_flip: '🪙 Arena do Destino (Moeda)',
  };

  let merged: Record<string, any> = { ...(scenariosDefault as any) };
  try {
    const raw = localStorage.getItem('forge_scenarios');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        merged = { ...merged, ...parsed };
      }
    }
  } catch {}

  const list: { key: string; label: string; previewUrl?: string }[] = [];
  for (const key of Object.keys(merged)) {
    if (key === '__meta') continue;
    let previewUrl = '';
    const val = merged[key];
    if (typeof val === 'string' && val.startsWith('{')) {
      try {
        const obj = JSON.parse(val);
        previewUrl = obj.url || '';
      } catch {}
    } else if (typeof val === 'string') {
      previewUrl = val;
    }
    list.push({
      key,
      label: labels[key] || `🌌 Cenário Custom: ${key}`,
      previewUrl,
    });
  }
  return list;
}

/**
 * Retorna as Trilhas e Efeitos Sonoros da Central de Sons da Forja V2 (SoundCentralScreen / sounds.json)
 */
export function getAvailableForgeSounds(): { url: string; name: string }[] {
  try {
    const lib = (soundsDefault as any)?.library;
    if (Array.isArray(lib) && lib.length > 0) return lib;
  } catch {}
  return [
    { url: '/sounds/battle_2.mp3', name: 'battle_2.mp3' },
    { url: '/sounds/Cozy_RPG_Ambience__1_.mp3', name: 'Cozy RPG Ambience (1)' },
  ];
}

/**
 * Desbloqueia um Artefato / Habilidade Ativa da Forja V2 para o jogador (Arsenal, Loja e Battle Prep)
 */
export function unlockActiveArtifactForPlayer(
  artifactIdOrName?: string
): UnlockedArtifactDrop | undefined {
  if (!artifactIdOrName || artifactIdOrName === 'none') return undefined;
  const allArtifacts = getAvailableActiveArtifacts();
  const found = allArtifacts.find(
    (a) =>
      a.id.toLowerCase() === artifactIdOrName.toLowerCase() ||
      a.name.toLowerCase() === artifactIdOrName.toLowerCase()
  );
  if (!found) return undefined;

  // 1. Salva em 'store_owned.artifacts'
  try {
    const rawOwned = localStorage.getItem('store_owned');
    const owned = rawOwned
      ? JSON.parse(rawOwned)
      : { cards: [], decks: [], artifacts: [] };
    owned.artifacts = Array.isArray(owned.artifacts) ? owned.artifacts : [];
    if (!owned.artifacts.includes(found.id)) {
      owned.artifacts.push(found.id);
    }
    if (!owned.artifacts.includes(found.name)) {
      owned.artifacts.push(found.name);
    }
    localStorage.setItem('store_owned', JSON.stringify(owned));
  } catch {}

  // 2. Se o jogador tiver menos de 3 skills equipadas no 'battle_prep', já equipa automaticamente!
  try {
    const rawPrep = localStorage.getItem('battle_prep');
    const prep = rawPrep ? JSON.parse(rawPrep) : { cards: [], skills: [] };
    prep.skills = Array.isArray(prep.skills) ? prep.skills : [];
    if (
      prep.skills.length < 3 &&
      !prep.skills.some((s: any) => s && (s.id === found.id || s.name === found.name))
    ) {
      prep.skills.push(found);
      localStorage.setItem('battle_prep', JSON.stringify(prep));
    }
  } catch {}

  return {
    id: found.id,
    name: found.name,
    icon: found.icon || '💎',
    description: found.description || '',
    image: found.image,
    group: found.group,
  };
}

/**
 * Resolve a Carta Matriz representante de um NPC Action ou Marcador.
 * Se o NPC não tiver um matrixCardId explícito, vincula deterministicamente uma carta da Matriz.
 */
export function resolveNpcMatrixCard(marker?: Partial<MapMarker> | null): any {
  const allCards = getAvailableMatrixCards();
  if (allCards.length === 0) return null;

  const explicitId =
    marker?.actionNpc?.matrixCardId ||
    marker?.matrixCardId ||
    marker?.quest?.rewardCardId;

  if (explicitId) {
    const found = resolveMatrixOrGameCard(explicitId, allCards);
    if (found) return found;
  }

  // Tenta casar pelo nome do NPC
  const npcName = (marker?.name || '').trim().toLowerCase();
  if (npcName) {
    const byName = allCards.find(
      (c) =>
        (c.name || '').toLowerCase() === npcName ||
        npcName.includes((c.name || '').toLowerCase()) ||
        (c.name || '').toLowerCase().includes(npcName)
    );
    if (byName) return byName;
  }

  // Fallback determinístico pelo ID/nome do marcador para que todo NPC Action tenha sempre uma Carta Matriz representante
  const seedStr = marker?.id || marker?.name || 'default';
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash * 31 + seedStr.charCodeAt(i)) >>> 0;
  }
  return allCards[hash % allCards.length];
}

/**
 * Determina o Modo de Batalha efetivo de um NPC ('boss' vs 'duel'):
 * - 'boss': Luta contra a criatura/NPC vendo o asset dele no topo do tabuleiro (boss_battle.html)
 * - 'duel': Luta contra o NPC vendo as cartas do deck dele nos 3 slots do oponente (battle.html)
 */
export function resolveNpcBattleMode(marker?: Partial<MapMarker> | null): 'boss' | 'duel' {
  const explicitMode = marker?.actionNpc?.battleMode || marker?.battleMode;
  if (explicitMode === 'boss' || explicitMode === 'duel') {
    return explicitMode;
  }
  if (marker?.type === 'boss') return 'boss';
  if (marker && isSlimeMarker(marker as any)) return 'boss';
  // Se tiver deck configurado ou for duelo de evento, usa 'duel'; se for Action NPC hostil sem deck, usa 'boss'
  if (
    (marker?.actionNpc?.deckCardIds && marker.actionNpc.deckCardIds.length > 0) ||
    (marker?.deckCardIds && marker.deckCardIds.length > 0) ||
    marker?.eventKind === 'duel' ||
    marker?.quest?.kind === 'duel'
  ) {
    return 'duel';
  }
  return 'boss';
}

/**
 * Constrói o Deck de Cartas de um NPC para o modo 'duel' (garantindo que sua Carta Matriz lidere o deck)
 */
export function resolveNpcDeckCards(marker?: Partial<MapMarker> | null): any[] {
  const allCards = getAvailableMatrixCards();
  const repCard = resolveNpcMatrixCard(marker);
  const configuredIds =
    marker?.actionNpc?.deckCardIds ||
    marker?.deckCardIds ||
    (marker as any)?.npcDeckCardIds ||
    [];

  const resolvedDeck: any[] = [];
  if (repCard) {
    resolvedDeck.push(repCard);
  }

  for (const idOrName of configuredIds) {
    const c = resolveMatrixOrGameCard(idOrName, allCards);
    if (c && !resolvedDeck.some((existing) => existing.name === c.name)) {
      resolvedDeck.push(c);
    }
  }

  // Preenche até 5 cartas se necessário usando cartas da Matriz
  let seed = (marker?.id || 'npc').length;
  for (let i = 0; i < allCards.length && resolvedDeck.length < 5; i++) {
    const candidate = allCards[(i + seed) % allCards.length];
    if (candidate && !resolvedDeck.some((existing) => existing.name === candidate.name)) {
      resolvedDeck.push(candidate);
    }
  }

  return resolvedDeck;
}

/**
 * Sorteia uma Raridade respeitando a regra configurada no NPC ou Quest
 */
export function pickRarityByRule(rule: 'auto' | 'default' | RarityKey = 'auto'): RarityRuleDefinition {
  const rules = getRarityRules();
  const order: RarityKey[] = ['common', 'rare', 'epic', 'legendary'];

  if (rule !== 'auto' && rule !== 'default' && rules[rule]) {
    // Permite que a regra funcione como raridade mínima garantida com chance de subir!
    const minIdx = order.indexOf(rule);
    const eligible = order.slice(Math.max(0, minIdx)).map((k) => rules[k]);
    const totalWeight = eligible.reduce((acc, r) => acc + r.dropWeight, 0);
    let roll = Math.random() * totalWeight;
    for (const r of eligible) {
      if (roll < r.dropWeight) return r;
      roll -= r.dropWeight;
    }
    return rules[rule];
  }

  const all = order.map((k) => rules[k]);
  const totalWeight = all.reduce((acc, r) => acc + r.dropWeight, 0);
  let roll = Math.random() * totalWeight;
  for (const r of all) {
    if (roll < r.dropWeight) return r;
    roll -= r.dropWeight;
  }
  return rules.common;
}

/**
 * Gera uma Variação Procedural da Carta Matriz dentro de sua Regra de Raridade
 * e já desbloqueia/salva na coleção do jogador para uso imediato no Arsenal e Batalhas!
 */
export function rollMatrixCardVariation(options: {
  cardIdOrName?: string;
  marker?: Partial<MapMarker> | null;
  rarityRule?: 'auto' | 'default' | RarityKey;
  obtainedVia?: RolledCardVariation['obtainedVia'];
}): RolledCardVariation {
  const baseCard = options.cardIdOrName
    ? resolveMatrixOrGameCard(options.cardIdOrName, getAvailableMatrixCards()) ||
      resolveNpcMatrixCard(options.marker)
    : resolveNpcMatrixCard(options.marker);

  const effectiveRule =
    options.rarityRule ||
    options.marker?.actionNpc?.rarityDropRule ||
    options.marker?.rarityDropRule ||
    'auto';

  const rarityDef = pickRarityByRule(effectiveRule);
  const trait = VARIATION_TRAITS[Math.floor(Math.random() * VARIATION_TRAITS.length)];

  const pvJitter =
    trait.pvJitter[0] + Math.random() * (trait.pvJitter[1] - trait.pvJitter[0]);
  const atkJitter =
    trait.atkJitter[0] + Math.random() * (trait.atkJitter[1] - trait.atkJitter[0]);

  const basePv = Math.max(10, Number(baseCard?.pv || baseCard?.maxPv || 50));
  const baseAtk = Math.max(5, Number(baseCard?.atk || 15));

  const pvMult = rarityDef.pvBonus * pvJitter;
  const atkMult = rarityDef.atkBonus * atkJitter;

  const rolledPv = Math.max(10, Math.round(basePv * pvMult));
  const rolledAtk = Math.max(5, Math.round(baseAtk * atkMult));

  // Resolve Habilidade Passiva (da configuração do NPC, da carta base ou sorteada para Rara+)
  const allPassives = getAvailablePassiveAbilities();
  const explicitPassiveId =
    options.marker?.actionNpc?.passiveAbilityId ||
    options.marker?.passiveAbilityId ||
    baseCard?.abilityId;
  let chosenPassive = allPassives.find((p) => p.id === explicitPassiveId);
  if (!chosenPassive && rarityDef.key !== 'common' && allPassives.length > 0) {
    chosenPassive = allPassives[Math.floor(Math.random() * allPassives.length)];
  }

  const existingVariations = getPlayerCardVariations();
  const sameCardCount = existingVariations.filter(
    (v) => v.baseCardName === (baseCard?.name || 'Carta')
  ).length;
  const serialNumber = `#${String(sameCardCount + 1).padStart(3, '0')}`;

  const baseName = baseCard?.name || options.marker?.name || 'Guardião Slime';
  const resolvedImage =
    baseCard?.image ||
    options.marker?.customIconPng ||
    '/_galeria_backup/01.jpg';
  const resolvedLore =
    baseCard?.desc ||
    baseCard?._rawMatrixCard?.lore ||
    `Variação ${rarityDef.label} (${trait.name}) obtida de ${options.marker?.name || baseName}.`;

  const variation: RolledCardVariation = {
    variationId: `var-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    baseCardId: String(baseCard?.id || baseName),
    baseCardName: baseName,
    variationName: `${baseName} • ${trait.name}`,
    variantTrait: trait.name,
    variantLabel: trait.name,
    serialNumber,
    rarity: rarityDef.key,
    rarityLabel: rarityDef.label,
    rarityIcon: rarityDef.icon,
    rarityColor: rarityDef.color,
    basePv,
    baseAtk,
    rolledPv,
    rolledAtk,
    finalHp: rolledPv,
    finalAtk: rolledAtk,
    atkMultiplier: Math.round(atkMult * 100) / 100,
    pvMultiplier: Math.round(pvMult * 100) / 100,
    category: baseCard?.category || ' GUARDIÃO',
    image: resolvedImage,
    artUrl: resolvedImage,
    loreText: resolvedLore,
    passiveAbilityId: chosenPassive?.id,
    passiveAbilityName: chosenPassive?.name,
    passiveAbilityIcon: chosenPassive?.icon,
    sourceNpcId: options.marker?.id,
    sourceNpcName: options.marker?.name,
    obtainedVia: options.obtainedVia || 'scan',
    obtainedAt: Date.now(),
    rawMatrixCard: baseCard?._rawMatrixCard
      ? {
          ...baseCard._rawMatrixCard,
          rarity: rarityDef.key,
          stats: {
            ...(baseCard._rawMatrixCard.stats || {}),
            hp: String(rolledPv),
            atk: String(rolledAtk),
          },
        }
      : undefined,
  };

  saveRolledVariationToCollection(variation);
  return variation;
}

/**
 * Salva a variação sorteada no histórico do jogador e garante desbloqueio no Arsenal/Loja/Deck
 */
export function saveRolledVariationToCollection(variation: RolledCardVariation): void {
  try {
    const list = getPlayerCardVariations();
    if (!list.some((item) => item.variationId === variation.variationId)) {
      list.unshift(variation);
      localStorage.setItem(PLAYER_VARIATIONS_KEY, JSON.stringify(list.slice(0, 200)));
    }
  } catch {}

  // 1. Desbloqueia em 'unlocked_cards'
  try {
    const rawUnlocked = localStorage.getItem('unlocked_cards');
    const unlocked: string[] = rawUnlocked ? JSON.parse(rawUnlocked) : [];
    if (!unlocked.includes(variation.baseCardName)) {
      unlocked.push(variation.baseCardName);
    }
    if (variation.baseCardId && !unlocked.includes(variation.baseCardId)) {
      unlocked.push(variation.baseCardId);
    }
    localStorage.setItem('unlocked_cards', JSON.stringify(unlocked));
  } catch {}

  // 2. Desbloqueia também em 'store_owned' para aparecer como obtida na Loja
  try {
    const rawOwned = localStorage.getItem('store_owned');
    const owned = rawOwned ? JSON.parse(rawOwned) : { cards: [], decks: [], artifacts: [] };
    owned.cards = Array.isArray(owned.cards) ? owned.cards : [];
    if (!owned.cards.includes(variation.baseCardName)) {
      owned.cards.push(variation.baseCardName);
    }
    localStorage.setItem('store_owned', JSON.stringify(owned));
  } catch {}

  // 3. Se o jogador tiver menos de 5 cartas no deck de batalha ('battle_prep'), já equipa!
  try {
    const rawPrep = localStorage.getItem('battle_prep');
    if (rawPrep) {
      const prep = JSON.parse(rawPrep);
      if (Array.isArray(prep.deck) && prep.deck.length < 5 && !prep.deck.includes(variation.baseCardName)) {
        prep.deck.push(variation.baseCardName);
        localStorage.setItem('battle_prep', JSON.stringify(prep));
      }
    }
  } catch {}
}

export function getPlayerCardVariations(): RolledCardVariation[] {
  try {
    const raw = localStorage.getItem(PLAYER_VARIATIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

/**
 * Retorna a melhor variação obtida pelo jogador para uma determinada carta (para aplicar os bônus de raridade em batalha!)
 */
export function getBestVariationForCard(cardNameOrId: string): RolledCardVariation | null {
  if (!cardNameOrId) return null;
  const list = getPlayerCardVariations();
  const matches = list.filter(
    (v) =>
      v.baseCardName.toLowerCase() === cardNameOrId.toLowerCase() ||
      v.baseCardId.toLowerCase() === cardNameOrId.toLowerCase()
  );
  if (matches.length === 0) return null;
  return matches.reduce((best, cur) =>
    cur.rolledPv + cur.rolledAtk * 2 > best.rolledPv + best.rolledAtk * 2 ? cur : best
  );
}

/**
 * Prepara o contexto de Batalha (Boss Battle ou Duelo de Cartas) contra um NPC do Marker Dream
 */
export function prepareNpcBattleContext(
  marker: MapMarker,
  modeOverride?: 'boss' | 'duel',
  phaseInfo?: { id?: string; name?: string }
): ActiveNpcBattleContext {
  const repCard = resolveNpcMatrixCard(marker);
  const mode = modeOverride || resolveNpcBattleMode(marker);
  const deckCards = resolveNpcDeckCards(marker);

  const npcHp = Math.max(
    80,
    Number(marker.actionNpc?.maxHealth || marker.actionNpc?.health || repCard?.pv || 120)
  );
  const npcAtk = Math.max(
    12,
    Number(
      marker.actionNpc?.attackDamage ||
        marker.actionNpc?.attacks?.standard?.damage ||
        marker.actionNpc?.attacks?.hackSlash?.damage ||
        repCard?.atk ||
        18
    )
  );

  const phrases = (
    marker.actionNpc?.speechPhrases?.filter(Boolean) ||
    marker.npcPhrases?.filter(Boolean) || [
      `Você nunca conseguirá escanear minha matriz!`,
      `Sinta o poder de ${marker.name}!`,
      `Impossível... minha essência está virando carta!`,
    ]
  ) as string[];

  const passiveAbilityId =
    marker.actionNpc?.passiveAbilityId ||
    marker.passiveAbilityId ||
    repCard?.abilityId ||
    undefined;
  const activeArtifactId =
    marker.actionNpc?.activeArtifactId || marker.activeArtifactId || undefined;
  const battleScenarioKey =
    marker.actionNpc?.battleScenarioKey || marker.battleScenarioKey || undefined;
  const battleBgmUrl =
    marker.actionNpc?.battleBgmUrl || marker.battleBgmUrl || undefined;

  const avatarUrl =
    marker.customIconPng || repCard?.image || '/_galeria_backup/01.jpg';

  // Se for Boss Battle, também garante que exista um Mobby temporário/vinculado no MobbyManager
  let linkedMobbyId = marker.actionNpc?.linkedMobbyId;
  if (mode === 'boss') {
    const mobbyId = linkedMobbyId || `npc_boss_${marker.id}`;
    const mobbyHp = Math.max(300, npcHp);
    const mobbyObj: Mobby = {
      id: mobbyId,
      name: marker.name || 'Boss Desconhecido',
      description:
        marker.description ||
        repCard?.desc ||
        `Guardião da Matriz (${repCard?.name || marker.name})`,
      image: avatarUrl,
      hp: mobbyHp,
      maxHp: mobbyHp,
      atk: npcAtk,
      rewardCardId: String(repCard?.name || repCard?.id || '1'),
      linkedCardId: String(repCard?.id || repCard?.name || '1'),
      artifacts: activeArtifactId ? [activeArtifactId] : [],
      backgroundUrl: battleScenarioKey,
      bgmUrl: battleBgmUrl,
      dialogues: [
        {
          triggerType: 'turn_reached',
          triggerValue: 1,
          speaker: 'mobby',
          text: phrases[0] || `${marker.name} desafia você!`,
        },
        {
          triggerType: 'hp_below',
          triggerValue: 50,
          speaker: 'mobby',
          text: phrases[1] || `Argh! Minha matriz está instável!`,
        },
      ],
    };
    const allMobbys = MobbyManager.getMobbys();
    const existingIdx = allMobbys.findIndex((m) => m.id === mobbyId);
    if (existingIdx >= 0) {
      allMobbys[existingIdx] = mobbyObj;
    } else {
      allMobbys.push(mobbyObj);
    }
    MobbyManager.saveMobbys(allMobbys);
    linkedMobbyId = mobbyId;
  }

  const ctx: ActiveNpcBattleContext = {
    battleSessionId: `bs-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    markerId: marker.id,
    npcId: marker.id,
    npcName: marker.name || 'NPC Desafiante',
    npcAvatarUrl: avatarUrl,
    npcImage: avatarUrl,
    npcVideoUrl: marker.videoUrl,
    npcColor: marker.color || '#f59e0b',
    battleMode: mode,
    isSlimeOrMobby: isSlimeMarker(marker),
    matrixCardId: String(repCard?.id || repCard?.name || '1'),
    matrixCardName: String(repCard?.name || marker.name || 'Carta Matriz'),
    deckCardIds: deckCards.map((c) => String(c.name || c.id)),
    rarityDropRule:
      marker.actionNpc?.rarityDropRule || marker.rarityDropRule || 'auto',
    npcHp,
    npcMaxHp: npcHp,
    npcAtk,
    speechPhrases: phrases,
    scanDialogueText: marker.actionNpc?.scanDialogueText,
    linkedMobbyId,
    passiveAbilityId,
    activeArtifactId,
    battleScenarioKey,
    battleBgmUrl,
    phaseId: phaseInfo?.id,
    phaseName: phaseInfo?.name,
    startedAt: Date.now(),
  };

  try {
    localStorage.setItem(ACTIVE_BATTLE_CONTEXT_KEY, JSON.stringify(ctx));
  } catch {}

  return ctx;
}

export function getActiveNpcBattleContext(): ActiveNpcBattleContext | null {
  try {
    const raw = localStorage.getItem(ACTIVE_BATTLE_CONTEXT_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ActiveNpcBattleContext;
  } catch {
    return null;
  }
}

export function clearActiveNpcBattleContext(): void {
  try {
    localStorage.removeItem(ACTIVE_BATTLE_CONTEXT_KEY);
  } catch {}
}

/**
 * Registra o resultado da Batalha (Boss ou Duelo de Cartas), sorteia a variação da Carta Matriz se venceu,
 * desbloqueia o Artefato Ativo vinculado (se houver), entrega Ouro/XP no ProgressionManager e notifica o emulador!
 */
export function recordNpcBattleOutcome(
  victory: boolean,
  preRolledVariation?: RolledCardVariation
): NpcBattleOutcome | null {
  const ctx = getActiveNpcBattleContext();
  if (!ctx) return null;

  let droppedVariation = preRolledVariation;
  if (victory && !droppedVariation) {
    droppedVariation = rollMatrixCardVariation({
      cardIdOrName: ctx.matrixCardName || ctx.matrixCardId,
      rarityRule: ctx.rarityDropRule,
      obtainedVia: ctx.battleMode === 'boss' ? 'boss_battle' : 'card_duel',
      marker: {
        id: ctx.markerId,
        name: ctx.npcName,
        customIconPng: ctx.npcAvatarUrl,
        passiveAbilityId: ctx.passiveAbilityId,
      },
    });
  }

  let unlockedArtifact: UnlockedArtifactDrop | undefined;
  if (victory && ctx.activeArtifactId) {
    unlockedArtifact = unlockActiveArtifactForPlayer(ctx.activeArtifactId);
  }

  const goldEarned = victory ? (ctx.battleMode === 'boss' ? 180 : 140) : 25;
  const gemsEarned = victory ? (ctx.battleMode === 'boss' ? 5 : 3) : 0;
  const xpEarned = victory ? (ctx.battleMode === 'boss' ? 220 : 160) : 40;

  rewardPlayerCoinsAndGems(goldEarned, gemsEarned, xpEarned);

  const outcome: NpcBattleOutcome = {
    battleSessionId: ctx.battleSessionId,
    markerId: ctx.markerId,
    npcName: ctx.npcName,
    battleMode: ctx.battleMode,
    victory,
    droppedVariation,
    rolledVariation: droppedVariation,
    unlockedArtifact,
    goldEarned,
    gemsEarned,
    xpEarned,
    coinsAwarded: goldEarned,
    gemsAwarded: gemsEarned,
    xpAwarded: xpEarned,
    completedAt: Date.now(),
  };

  try {
    localStorage.setItem(LAST_BATTLE_OUTCOME_KEY, JSON.stringify(outcome));
  } catch {}

  clearActiveNpcBattleContext();

  // Se estiver rodando dentro do Modal de Batalha do Marker Dream / Hub, avisa a janela pai imediatamente!
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage(
        {
          type: 'SLIMELANDS_NPC_BATTLE_COMPLETED',
          outcome,
        },
        '*'
      );
    }
  } catch {}

  return outcome;
}

export function consumeLastNpcBattleOutcome(): NpcBattleOutcome | null {
  try {
    const raw = localStorage.getItem(LAST_BATTLE_OUTCOME_KEY);
    if (!raw) return null;
    localStorage.removeItem(LAST_BATTLE_OUTCOME_KEY);
    return JSON.parse(raw) as NpcBattleOutcome;
  } catch {
    return null;
  }
}

/**
 * Concede Ouro, Diamantes/Gemas e XP diretamente no ProgressionManager global (sincronizando Loja, Hub e Fases)
 */
export function rewardPlayerCoinsAndGems(
  goldDelta: number,
  gemsDelta: number = 0,
  xpDelta: number = 0
): { gold: number; diamonds: number; level: number; xp: number } {
  try {
    const state = ProgressionManager.getState();
    state.gold = Math.max(0, (state.gold || 0) + goldDelta);
    state.diamonds = Math.max(0, (state.diamonds || 0) + gemsDelta);
    ProgressionManager.savePlayerData(state);
    if (xpDelta > 0) {
      ProgressionManager.addXpAndCheckLevelUp(xpDelta);
    }
    const updated = ProgressionManager.getState();
    return {
      gold: updated.gold,
      diamonds: updated.diamonds,
      level: updated.level,
      xp: updated.xp,
    };
  } catch (err) {
    console.error('Failed to reward player progression:', err);
    return { gold: 0, diamonds: 0, level: 1, xp: 0 };
  }
}

/**
 * Sincroniza bidirecionalmente as moedas e nível entre um MapProject do Marker Dream e o ProgressionManager do Hub/Loja
 */
export function syncProjectEconomyWithProgression(project: MapProject): {
  gold: number;
  gems: number;
  level: number;
  xp: number;
} {
  const prog = ProgressionManager.getState();
  const invGold = project.playerInventory?.currencies?.gold ?? 0;
  const invGems = project.playerInventory?.currencies?.gems ?? 0;

  const mergedGold = Math.max(prog.gold || 0, invGold);
  const mergedGems = Math.max(prog.diamonds || 0, invGems);

  if (mergedGold !== prog.gold || mergedGems !== prog.diamonds) {
    prog.gold = mergedGold;
    prog.diamonds = mergedGems;
    ProgressionManager.saveState(prog);
  }

  return {
    gold: mergedGold,
    gems: mergedGems,
    level: prog.level || 1,
    xp: prog.xp || 0,
  };
}

