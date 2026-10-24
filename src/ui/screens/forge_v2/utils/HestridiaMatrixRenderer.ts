import * as THREE from 'three';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { CardData, BottomStatPill } from '../../../../card_studio/src/types/card';
import { CardFrameSVG } from '../../../../card_studio/src/components/CardFrameSVG';
import { CardBackSVG } from '../../../../card_studio/src/components/CardBackSVG';
import { INITIAL_CARDS } from '../../../../card_studio/src/utils/defaultCards';
import {
  loadGameMatrixSnapshot,
  saveGameMatrixSnapshot,
  SlimelandsGameMatrixSnapshot,
} from '../../../../card_studio/src/utils/matrixPersistence';
import { ENCHANTMENT_REGISTRY } from '../../../../core/enchantments';
import { getDefaultVfxForSlot } from '../../../../card_studio/src/utils/forgeAbilitiesCatalog';

const SNAPSHOT_STORAGE_KEY = 'slimelands_active_matrix_v1';

let cachedMatrixSnapshot: SlimelandsGameMatrixSnapshot | null = null;

function readSnapshotFromLocalStorage(): SlimelandsGameMatrixSnapshot | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SlimelandsGameMatrixSnapshot;
  } catch {}
  return null;
}

if (typeof window !== 'undefined') {
  cachedMatrixSnapshot = readSnapshotFromLocalStorage();
  loadGameMatrixSnapshot()
    .then((snap) => {
      if (snap) {
        cachedMatrixSnapshot = snap;
        try {
          window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snap));
        } catch {}
      }
    })
    .catch(() => {});

  window.addEventListener('hestridia:matrix-updated', ((ev: CustomEvent) => {
    if (ev?.detail) {
      cachedMatrixSnapshot = ev.detail as SlimelandsGameMatrixSnapshot;
    } else {
      cachedMatrixSnapshot = readSnapshotFromLocalStorage();
    }
  }) as EventListener);

  window.addEventListener('storage', (ev) => {
    if (ev.key === SNAPSHOT_STORAGE_KEY && ev.newValue) {
      try {
        cachedMatrixSnapshot = JSON.parse(ev.newValue);
      } catch {}
    }
  });
}

function resolveValidCardImageUrl(cardOrRaw: any): string {
  const candidate =
    cardOrRaw?.imageUrl ||
    cardOrRaw?.image ||
    cardOrRaw?.cardData?.imageUrl ||
    cardOrRaw?.matrixCard?.imageUrl ||
    '';
  if (
    typeof candidate === 'string' &&
    candidate.trim().length > 0 &&
    !candidate.includes('Slime_no_Jardim_de_Outono.png')
  ) {
    return candidate;
  }
  const idAndName = `${cardOrRaw?.id || ''} ${cardOrRaw?.baseCharacterId || ''} ${cardOrRaw?.title || ''} ${cardOrRaw?.name || ''} ${cardOrRaw?.elementText || ''} ${cardOrRaw?.element || ''}`.toUpperCase();
  if (idAndName.includes('LUMYS') || idAndName.includes('ARCANO')) {
    return '/cards/Slime_lavanda_tocando_instrumento_m_gico-17.png';
  }
  if (idAndName.includes('KAELEN') || idAndName.includes('AGUA') || idAndName.includes('ABISS')) {
    return '/cards/Slime_oce_nico_surfando_na_concha-7.png';
  }
  if (idAndName.includes('IGNIS') || idAndName.includes('FOGO') || idAndName.includes('MAGMA') || idAndName.includes('VULC')) {
    return '/cards/Slime_de_Fogo_em_Investida_Explosiva.png';
  }
  if (idAndName.includes('VENENO') || idAndName.includes('TOXIC')) {
    return '/cards/Slime_violeta_lan_a_espiral_venenosa-3.png';
  }
  if (idAndName.includes('ESCUDO') || idAndName.includes('VISCOSIDADE')) {
    return '/cards/Cavaleiro_slime_prateado_bloqueia_o_golpe-16.png';
  }
  if (idAndName.includes('CONVERG') || idAndName.includes('ESTELAR') || idAndName.includes('MAGIA')) {
    return '/cards/Slime_astronauta_no_campo_de_asteroides-14.png';
  }
  return '/cards/Slime_Zen_no_Santu_rio_Florestal.png';
}

export function convertMatrixCardToGameTemplate(cd: CardData): any {
  const isMagicCard = cd.entityType === 'Magia';
  const basePv = cd.pvNumber || parseInt((cd.pvText || '').replace(/\D/g, ''), 10) || 400;
  const resolvedImage = resolveValidCardImageUrl(cd);
  const hydratedCd: CardData = {
    ...cd,
    pvText: isMagicCard
      ? (cd.pvText || `DF${basePv}`).replace(/^PV/i, 'DF').replace(/^P\s*V/i, 'DF')
      : cd.pvText,
    imageUrl: resolvedImage,
    backgroundFill: cd.backgroundFill === 'transparent' ? 'dark' : (cd.backgroundFill || 'dark'),
  };

  const clsLower = (cd.cardClass || '').toLowerCase();
  const rankUpper = (cd.cardRank || cd.rankBadgeText || '').toUpperCase();
  let preferredRarity: 'common' | 'rare' | 'epic' | 'legendary' = 'common';
  if (
    rankUpper === 'S' ||
    clsLower.includes('mítica') ||
    clsLower.includes('mitica') ||
    clsLower.includes('lendária') ||
    clsLower.includes('lendaria')
  ) {
    preferredRarity = 'legendary';
  } else if (
    rankUpper === 'A' ||
    clsLower.includes('épica') ||
    clsLower.includes('epica') ||
    clsLower.includes('limitada')
  ) {
    preferredRarity = 'epic';
  } else if (
    rankUpper === 'B' ||
    clsLower.includes('rara') ||
    clsLower.includes('incomum')
  ) {
    preferredRarity = 'rare';
  }

  const genAbilities = cd.generatedAbilities || [];
  const pillCount = isMagicCard
    ? 0
    : Math.max(1, Math.min(4, cd.pillCount || genAbilities.length || 4));

  const realAttacks: any[] = [];
  for (let idx = 0; idx < pillCount; idx++) {
    const pill = cd.pills?.[idx];
    const genAb = genAbilities[idx];
    const isChromatic = Boolean(
      pill?.isChromaticSpecial || pill?.badgeValue === '∞' || genAb?.isFree
    );
    const encId = pill?.enchantmentId || genAb?.enchantmentId;
    const encDef = encId ? ENCHANTMENT_REGISTRY.find((e) => e.id === encId) : undefined;
    const attackType: 'damage' | 'enchantment' =
      pill?.attackType || genAb?.attackType || 'damage';

    const rawDmg = parseInt((pill?.mainText || '').replace(/\D/g, ''), 10);
    const damage =
      attackType === 'enchantment'
        ? encDef?.defaultValue || 0
        : !isNaN(rawDmg) && rawDmg > 0
        ? rawDmg
        : genAb?.damage || (idx + 1) * 200;

    const rawCost = parseInt((pill?.badgeValue || '').replace(/\D/g, ''), 10);
    const cost = isChromatic
      ? 0
      : !isNaN(rawCost)
      ? rawCost
      : genAb?.manaCost ?? idx + 1;

    const costType: 'stamina' | 'mana' =
      pill?.costResource || genAb?.costResource || (idx >= 2 ? 'mana' : 'stamina');

    const vfxId =
      pill?.vfxId ||
      genAb?.vfxId ||
      getDefaultVfxForSlot(idx, attackType === 'enchantment' || Boolean(encDef));

    const defaultAttackTitle =
      idx === 0
        ? 'GOLPE BÁSICO'
        : idx === 1
        ? 'INVESTIDA ELEMENTAL'
        : idx === 2
        ? 'EXPLOSÃO DE NÚCLEO'
        : 'SUPREMACIA ANCESTRAL';

    const name =
      pill?.attackName ||
      genAb?.name ||
      (attackType === 'enchantment' && encDef ? encDef.name : defaultAttackTitle);

    realAttacks.push({
      type: attackType,
      name,
      damage,
      cost,
      costType,
      isFreeChromatic: isChromatic,
      vfxId,
      description: genAb?.description || encDef?.description || '',
      ...(encDef
        ? {
            enchantment: {
              id: encDef.id,
              value:
                pill?.enchantmentValue ??
                genAb?.enchantmentValue ??
                encDef.defaultValue,
              turns:
                pill?.enchantmentTurns ??
                genAb?.enchantmentTurns ??
                encDef.defaultTurns,
            },
          }
        : {}),
    });
  }

  // Summon Cost from 5th slot (Stamina for Creatures, Mana for Magic Cards)
  const rawSummonBadge = parseInt(
    (cd.summonCostPill?.badgeValue || '').replace(/\D/g, ''),
    10
  );
  const summonCostVal = isMagicCard
    ? cd.magicManaCost ?? (!isNaN(rawSummonBadge) ? rawSummonBadge : 3)
    : cd.summonStaminaCost ?? (!isNaN(rawSummonBadge) ? rawSummonBadge : 2);

  const atk1 = realAttacks[0]?.damage || 200;
  const fourthAttack = realAttacks.length >= 4 ? realAttacks[3] : null;

  return {
    id: cd.id,
    name: cd.title,
    image: resolvedImage,
    imageUrl: resolvedImage,
    animationUrl: cd.videoUrl || undefined,
    cardBack: cd.backImageUrl || undefined,
    baseAtk: atk1,
    atk: atk1,
    basePv: basePv,
    pv: basePv,
    maxPv: basePv,
    df: isMagicCard ? basePv : 0,
    playerDefenseBonus: isMagicCard ? basePv : 0,
    manaCost: summonCostVal,
    staminaCost: summonCostVal,
    summonCostResource: isMagicCard ? 'mana' : 'stamina',
    entityType: cd.entityType || 'Criatura',
    preferredRarity,
    rarity: preferredRarity,
    classId: (cd.elementText || 'FERRO').toLowerCase(),
    abilityId: cd.linkedPassiveId || 'none',
    linkedActiveSkillId: cd.linkedActiveSkillId,
    flavorText: cd.loreBody,
    deckId: cd.deckId,
    family: cd.family,
    biome: cd.biome,
    collections: cd.collections,
    pillCount,
    attacks: realAttacks,
    specialAttack: fourthAttack
      ? {
          name: fourthAttack.name,
          damage: fourthAttack.damage,
          cost: fourthAttack.cost,
          costType: fourthAttack.costType,
          vfxId: fourthAttack.vfxId,
          videoUrl: cd.videoUrl || undefined,
          description: cd.magicDescription || fourthAttack.description || '',
          isFreeChromatic: fourthAttack.isFreeChromatic,
          enchantment: fourthAttack.enchantment,
          type: fourthAttack.type,
        }
      : undefined,
    cardData: hydratedCd,
    matrixCard: hydratedCd,
  };
}

function extractUniqueMatrixCards(snapshot: SlimelandsGameMatrixSnapshot | null): CardData[] {
  if (snapshot?.isLibraryCleared) {
    return [];
  }
  const combined: CardData[] = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();

  const addCard = (c: CardData | undefined | null) => {
    if (!c || typeof c !== 'object') return;
    const id = String(c.id || '');
    const titleKey = String(c.title || '').trim().toLowerCase();
    if ((id && seenIds.has(id)) || (titleKey && seenTitles.has(titleKey))) return;
    if (id) seenIds.add(id);
    if (titleKey) seenTitles.add(titleKey);
    combined.push(c);
  };

  if (snapshot) {
    if (Array.isArray(snapshot.cards)) {
      snapshot.cards.forEach(addCard);
    }
    if (Array.isArray(snapshot.playerInventory)) {
      snapshot.playerInventory.forEach(addCard);
    }
  }
  if (combined.length === 0) {
    INITIAL_CARDS.forEach(addCard);
  }
  return combined;
}

function mergeWithBaseTemplates(
  matrixCards: CardData[],
  baseTemplates: any[] = [],
  isLibraryCleared: boolean = false
): any[] {
  if (isLibraryCleared) return [];
  const matrixConverted = matrixCards.map(convertMatrixCardToGameTemplate);
  if (matrixConverted.length > 0) {
    return matrixConverted;
  }
  return baseTemplates;
}

export interface CustomDeckData {
  id: string;
  name: string;
  archetype: string;
  accentColor: string;
  cards: string[]; // IDs ou nomes de cartas da matriz
  artifacts: string[]; // 3 IDs de artefatos
  board: string;
  isActive?: boolean;
  isAvailable?: boolean; // ON / OFF: Disponível nos menus do jogo (Mobby Duelos, Boosters, Loja, etc.)
  createdAt?: string;
  updatedAt?: string;
}

const CUSTOM_DECKS_STORAGE_KEY = 'slimelands_custom_decks_v1';

export function getCustomDecks(): CustomDeckData[] {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_DECKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  const defaultDeck: CustomDeckData = {
    id: 'deck_main_1',
    name: 'Deck 1 (Principal)',
    archetype: 'Guerreiro',
    accentColor: '#10B981',
    cards: [],
    artifacts: ['art_escudo', 'art_golpe', 'art_queimadura'],
    board: 'floresta',
    isActive: true,
    isAvailable: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  saveCustomDecks([defaultDeck]);
  return [defaultDeck];
}

export function saveCustomDecks(decks: CustomDeckData[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(CUSTOM_DECKS_STORAGE_KEY, JSON.stringify(decks));
    window.dispatchEvent(new CustomEvent('slimelands:decks-updated', { detail: decks }));
  } catch {}
}

export function getAvailableCustomDecks(): CustomDeckData[] {
  return getCustomDecks().filter((d) => d.isAvailable !== false);
}

export function toggleDeckAvailability(deckId: string): boolean {
  const decks = getCustomDecks();
  let nextState = true;
  const updated = decks.map((d) => {
    if (d.id === deckId) {
      const current = d.isAvailable !== false;
      nextState = !current;
      return { ...d, isAvailable: nextState, updatedAt: new Date().toISOString() };
    }
    return d;
  });
  saveCustomDecks(updated);
  return nextState;
}

export function getActiveCustomDeck(): CustomDeckData | null {
  const decks = getCustomDecks();
  const available = decks.filter((d) => d.isAvailable !== false);
  const active = available.find((d) => d.isActive);
  return active || available[0] || decks[0] || null;
}

export function setActiveCustomDeck(deckId: string): void {
  const decks = getCustomDecks();
  let selectedDeck: CustomDeckData | null = null;
  const updated = decks.map((d) => {
    const isActive = d.id === deckId;
    if (isActive) selectedDeck = d;
    return { ...d, isActive };
  });
  saveCustomDecks(updated);
  if (selectedDeck) {
    syncActiveDeckWithArsenal(selectedDeck);
  }
}

export function syncActiveDeckWithArsenal(deck: CustomDeckData): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const data = {
      cards: deck.cards,
      artifacts: deck.artifacts,
      board: deck.board
    };
    window.localStorage.setItem('arsenal_predeck', JSON.stringify(data));
    window.localStorage.setItem('arsenal_predeck_s1', JSON.stringify(data));
    window.localStorage.setItem('forge_active_deck_id', deck.id);
  } catch {}
}

export function getMergedGameTemplatesSync(baseTemplates: any[] = []): any[] {
  const snapshot = cachedMatrixSnapshot || readSnapshotFromLocalStorage();
  if (snapshot) {
    cachedMatrixSnapshot = snapshot;
  }
  const matrixCards = extractUniqueMatrixCards(snapshot);
  return mergeWithBaseTemplates(
    matrixCards,
    baseTemplates,
    Boolean(snapshot?.isLibraryCleared)
  );
}

export function resolveMatrixOrGameCard(
  nameOrId: string,
  baseTemplates: any[] = []
): any | null {
  if (!nameOrId) return null;
  const clean = String(nameOrId).trim().toLowerCase();
  const pool = getMergedGameTemplatesSync(baseTemplates);
  return (
    pool.find(
      (c) =>
        c &&
        (c.name === nameOrId ||
          c.id === nameOrId ||
          String(c.name || '').trim().toLowerCase() === clean ||
          String(c.id || '').trim().toLowerCase() === clean ||
          String(c.cardData?.id || '').trim().toLowerCase() === clean ||
          String(c.cardData?.title || '').trim().toLowerCase() === clean)
    ) || null
  );
}

export async function getMergedGameTemplates(baseTemplates: any[] = []): Promise<any[]> {
  try {
    const snapshot = await loadGameMatrixSnapshot();
    if (snapshot) {
      cachedMatrixSnapshot = snapshot;
    }
    const activeSnap = snapshot || cachedMatrixSnapshot || readSnapshotFromLocalStorage();
    const matrixCards = extractUniqueMatrixCards(activeSnap);
    return mergeWithBaseTemplates(
      matrixCards,
      baseTemplates,
      Boolean(activeSnap?.isLibraryCleared)
    );
  } catch (err) {
    console.warn('Falha ao sincronizar cartas da matriz:', err);
  }
  return getMergedGameTemplatesSync(baseTemplates);
}

export async function upsertCardsIntoMatrixSnapshot(newCards: CardData[]): Promise<void> {
  if (!Array.isArray(newCards) || newCards.length === 0) return;
  try {
    const snap =
      (await loadGameMatrixSnapshot()) ||
      cachedMatrixSnapshot ||
      readSnapshotFromLocalStorage();
    const existingCards = snap?.cards || [...INITIAL_CARDS];
    const existingIds = new Set(existingCards.map((c) => c.id));
    const existingTitles = new Set(
      existingCards.map((c) => String(c.title || '').trim().toLowerCase())
    );

    const toAdd = newCards.filter(
      (c) =>
        c &&
        !existingIds.has(c.id) &&
        !existingTitles.has(String(c.title || '').trim().toLowerCase())
    );
    if (toAdd.length === 0) return;

    const nextSnap: SlimelandsGameMatrixSnapshot = {
      version: 1,
      updatedAt: new Date().toISOString(),
      cards: [...toAdd, ...existingCards],
      decks: snap?.decks || [],
      baseCharacters: snap?.baseCharacters || [],
      balanceTables: (snap?.balanceTables || {}) as any,
      boosterModels: snap?.boosterModels || [],
      subgroupCatalog: snap?.subgroupCatalog,
      playerInventory: [...toAdd, ...(snap?.playerInventory || [])],
      playerCoins: snap?.playerCoins ?? 1000,
      boosterStock: snap?.boosterStock,
      boosterHistory: snap?.boosterHistory,
      globalBackImageUrl: snap?.globalBackImageUrl ?? null,
      activeCardId: snap?.activeCardId || toAdd[0].id,
      stageDraftCard: snap?.stageDraftCard,
      isLibraryCleared: false,
    };
    cachedMatrixSnapshot = nextSnap;
    await saveGameMatrixSnapshot(nextSnap);
  } catch {}
}

export interface MatrixRenderOptions {
  mode?: 'full' | 'field' | 'hand' | 'thumb';
  isEnemy?: boolean;
  animateChroma?: boolean;
  idScope?: string;
  showLoreBox?: boolean;
  pureSvgText?: boolean;
  width?: string | number;
  height?: string | number;
}

let scopeCounter = 0;

/**
 * Converte qualquer carta do sistema para o padrão CardData da Matriz.
 */
export function toMatrixCardData(raw: any): CardData {
  if (!raw) raw = {};

  const checkIsHighRarity = (obj: any): boolean => {
    if (!obj) return false;
    if (typeof obj.rarityWeight === 'number' && obj.rarityWeight >= 4) return true;
    const cls = String(obj.cardClass || obj.matrixRarity || '').toLowerCase();
    const rar = String(obj.rarity || obj.preferredRarity || '').toLowerCase();
    const rnk = String(obj.cardRank || obj.rankBadgeText || '').toLowerCase();
    return (
      cls.includes('mítica') ||
      cls.includes('mitica') ||
      cls.includes('lendária') ||
      cls.includes('lendaria') ||
      cls.includes('limitada') ||
      rar.includes('legendary') ||
      rar.includes('mítica') ||
      rar.includes('mitica') ||
      rar.includes('lendária') ||
      rar.includes('lendaria') ||
      rnk === 's'
    );
  };

  if (raw.pills && raw.frameTopColor && raw.dockAutoFit !== undefined) {
    const isHigh = checkIsHighRarity(raw);
    return (isHigh
      ? {
          ...raw,
          isPremium: true,
          isRankChromatic: true,
          isPvChromatic: true,
          invertElementCapsule: true,
          strokeGlow: 100,
          prismaticIntensity: 100,
          microGlitterIntensity: 100,
          contourLightSpeed: 1.8,
        }
      : raw) as CardData;
  }

  const embedded = raw.cardData || raw.matrixCard;
  if (embedded && embedded.pills) {
    const livePv = raw.pv ?? raw.pvNumber ?? embedded.pvNumber;
    const isHigh = checkIsHighRarity(raw) || checkIsHighRarity(embedded);
    return {
      ...embedded,
      title: raw.name || embedded.title,
      pvText: livePv !== undefined ? `PV${livePv}` : embedded.pvText,
      pvNumber: livePv !== undefined ? Number(livePv) : embedded.pvNumber,
      imageUrl: raw.image || raw.imageUrl || embedded.imageUrl,
      backImageUrl: raw.cardBack || raw.backImageUrl || embedded.backImageUrl || null,
      ...(isHigh
        ? {
            isPremium: true,
            isRankChromatic: true,
            isPvChromatic: true,
            invertElementCapsule: true,
            strokeGlow: 100,
            prismaticIntensity: 100,
            microGlitterIntensity: 100,
            contourLightSpeed: 1.8,
          }
        : {}),
    } as CardData;
  }

  const name = raw.title || raw.name || 'Guerreiro do Inverno';
  const pvNum = raw.pvNumber ?? raw.pv ?? raw.basePv ?? raw.maxPv ?? 400;
  const atkNum = raw.atk ?? raw.baseAtk ?? 250;
  const manaCost = raw.summonStaminaCost ?? raw.manaCost ?? raw.mana ?? 2;
  const staminaCost = raw.staminaCost ?? raw.stamina ?? 2;
  const rarity = (raw.cardRank || raw.preferredRarity || raw.rarity || 'common').toLowerCase();

  let frameTopColor = '#1C1F26';
  let frameMidColor = '#101217';
  let frameBottomColor = '#030405';
  let strokeColor = '#94A3B8';
  let elementTextColor = '#38BDF8';
  let rankCircleColor = '#64748B';
  let rankBadgeText = 'C';

  if (rarity === 'legendary' || rarity === 's' || rarity === 'mítica') {
    frameTopColor = '#3B1E08';
    frameMidColor = '#1E0D03';
    frameBottomColor = '#030405';
    strokeColor = '#FFB703';
    elementTextColor = '#F59E0B';
    rankCircleColor = '#D97706';
    rankBadgeText = 'S';
  } else if (rarity === 'epic' || rarity === 'a' || rarity === 'lendária') {
    frameTopColor = '#2A0944';
    frameMidColor = '#140324';
    frameBottomColor = '#020005';
    strokeColor = '#A855F7';
    elementTextColor = '#C084FC';
    rankCircleColor = '#9333EA';
    rankBadgeText = 'A';
  } else if (rarity === 'rare' || rarity === 'b' || rarity === 'rara') {
    frameTopColor = '#092338';
    frameMidColor = '#04101A';
    frameBottomColor = '#020406';
    strokeColor = '#38BDF8';
    elementTextColor = '#38BDF8';
    rankCircleColor = '#0284C7';
    rankBadgeText = 'B';
  }

  if (raw.frameTopColor) frameTopColor = raw.frameTopColor;
  if (raw.frameMidColor) frameMidColor = raw.frameMidColor;
  if (raw.frameBottomColor) frameBottomColor = raw.frameBottomColor;
  if (raw.strokeColor) strokeColor = raw.strokeColor;
  if (raw.elementTextColor) elementTextColor = raw.elementTextColor;
  if (raw.rankCircleColor) rankCircleColor = raw.rankCircleColor;

  const rawAttacks = raw.attacks || [];
  const pills: [BottomStatPill, BottomStatPill, BottomStatPill, BottomStatPill] = [
    {
      id: 'p1',
      mode: 'stat',
      badgeValue: String(rawAttacks[0]?.cost ?? staminaCost),
      badgeColor: '#0084FF',
      mainText: String(rawAttacks[0]?.damage ?? atkNum)
    },
    {
      id: 'p2',
      mode: 'stat',
      badgeValue: String(rawAttacks[1]?.cost ?? (staminaCost + 1)),
      badgeColor: '#10B981',
      mainText: String(rawAttacks[1]?.damage ?? Math.round(atkNum * 1.35))
    },
    {
      id: 'p3',
      mode: 'stat',
      badgeValue: String(rawAttacks[2]?.cost ?? (manaCost)),
      badgeColor: '#9333EA',
      mainText: String(rawAttacks[2]?.damage ?? Math.round(atkNum * 1.7))
    },
    {
      id: 'p4',
      mode: 'stat',
      badgeValue: '∞',
      badgeColor: '#DF9A1E',
      mainText: String(raw.specialAttack?.damage ?? Math.round(atkNum * 2.2)),
      isChromaticSpecial: true
    }
  ];

  const isMagicCard = raw.entityType === 'Magia';
  const isItemCard = raw.entityType === 'Item';
  const summonCostPill: BottomStatPill =
    raw.summonCostPill ||
    (isMagicCard
      ? {
          id: 'pill-summon-cost',
          mode: 'stat',
          badgeValue: String(raw.magicManaCost ?? manaCost),
          badgeColor: '#0084FF',
          mainText: 'MANA',
          isSummonCost: true,
          costResource: 'mana',
        }
      : {
          id: 'pill-summon-cost',
          mode: 'stat',
          badgeValue: String(raw.summonStaminaCost ?? staminaCost),
          badgeColor: '#F59E0B',
          mainText: 'INVOC.',
          isSummonCost: true,
          costResource: 'stamina',
        });

  return {
    id: String(raw.id || `card-${Date.now()}`),
    title: name,
    pvText: isItemCard ? 'ITEM' : `PV${pvNum}`,
    elementText: (raw.classId || raw.element || 'FERRO').toUpperCase().slice(0, 8),
    rankBadgeText,
    loreHeader: raw.loreHeader || name,
    loreBody: raw.loreBody || raw.flavorText || 'Forjada nas névoas eternas de Hestridia.',
    magicPrefix: raw.magicPrefix || (raw.abilityId ? `✨ Habilidade: ${raw.abilityId}` : '⚔️ Golpe Especial'),
    magicDescription: raw.magicDescription || (raw.specialAttack?.description || 'Libera a fúria ancestral do inverno.'),
    magicAbilityKind: raw.magicAbilityKind || (isMagicCard ? 'passive' : undefined),
    linkedPassiveId: raw.linkedPassiveId || raw.abilityId,
    linkedActiveSkillId: raw.linkedActiveSkillId || raw.skillId,
    showLoreBox: raw.showLoreBox ?? true,
    loreBoxOpacity: raw.loreBoxOpacity ?? 88,
    loreBoxY: raw.loreBoxY ?? 724,
    pillCount: (isMagicCard ? 1 : (raw.pillCount || 4)) as 1 | 2 | 3 | 4,
    dockAutoFit: raw.dockAutoFit ?? true,
    showSummonCostPill: raw.showSummonCostPill ?? !isItemCard,
    summonCostPill,
    pills,
    imageUrl: raw.imageUrl || raw.image || null,
    videoUrl: raw.videoUrl || null,
    mediaType: raw.mediaType || 'image',
    imageScale: raw.imageScale ?? 1,
    imageOffsetX: raw.imageOffsetX ?? 0,
    imageOffsetY: raw.imageOffsetY ?? 0,
    backgroundFill: raw.backgroundFill || 'dark',
    autoAdaptColors: raw.autoAdaptColors ?? true,
    frameTopColor,
    frameMidColor,
    frameBottomColor,
    strokeColor,
    strokeWidth: raw.strokeWidth ?? 2,
    strokeGlow: raw.strokeGlow ?? 90,
    elementTextColor,
    rankCircleColor,
    extractedSwatches: raw.extractedSwatches || [],
    isPremium: raw.isPremium ?? true,
    prismaticIntensity: raw.prismaticIntensity ?? 90,
    microGlitterIntensity: raw.microGlitterIntensity ?? 80,
    contourLightSpeed: raw.contourLightSpeed ?? 1.8,
    parallaxDepth: raw.parallaxDepth ?? 65,
    autoShowcaseEnabled: false,
    showcaseDurationSec: 5,
    isRankChromatic: raw.isRankChromatic ?? (rankBadgeText === 'S'),
    isPvChromatic: raw.isPvChromatic ?? false,
    invertElementCapsule: raw.invertElementCapsule ?? true,
    showcaseVfx: raw.showcaseVfx || 'none',
    showcaseVfxIntensity: raw.showcaseVfxIntensity ?? 80,
    backImageUrl: raw.backImageUrl || raw.cardBack || null,
    entityType: isMagicCard ? 'Magia' : isItemCard ? 'Item' : 'Criatura',
    pvNumber: pvNum,
    summonStaminaCost: isMagicCard ? undefined : (raw.summonStaminaCost ?? staminaCost),
    magicManaCost: isMagicCard ? (raw.magicManaCost ?? manaCost) : undefined,
  };
}

/**
 * Renderiza a carta usando DIRETAMENTE o CardFrameSVG oficial da Matriz (sem recriar ou alterar nada).
 */
export function renderMatrixCardSVG(cardInput: any, opts: MatrixRenderOptions = {}): string {
  const card = toMatrixCardData(cardInput);
  scopeCounter++;
  const scope = opts.idScope || `mat-${card.id}-${scopeCounter}`;
  const animateChroma = opts.animateChroma ?? (opts.mode !== 'thumb');
  const pureSvgText = Boolean(opts.pureSvgText);

  try {
    return renderToStaticMarkup(
      React.createElement(CardFrameSVG, {
        card,
        animateChroma,
        idScope: scope,
        pureSvgText,
      })
    );
  } catch (err) {
    console.error('Erro ao renderizar CardFrameSVG oficial:', err);
    return `<div class="matrix-card-error" style="color:red; padding:10px;">Erro CardFrameSVG</div>`;
  }
}

/**
 * Renderiza o verso fiel da carta usando DIRETAMENTE o CardBackSVG oficial da Matriz.
 */
export function renderMatrixCardBackSVG(cardInput?: any): string {
  const card = toMatrixCardData(cardInput || {});
  scopeCounter++;
  const uniqueScope = `back-${card.id}-${scopeCounter}`;
  try {
    return renderToStaticMarkup(
      React.createElement(CardBackSVG, {
        card,
        idScope: uniqueScope,
      })
    );
  } catch (err) {
    console.error('Erro ao renderizar CardBackSVG oficial:', err);
    return `<div class="matrix-card-error" style="color:red; padding:10px;">Erro CardBackSVG</div>`;
  }
}

const dataUrlCache = new Map<string, string>();

/**
 * Converte qualquer imagem local/remota em Data URL base64 autossuficiente
 * para que o CardFrameSVG oficial renderize 100% no Three.js sem bloqueio de cross-origin ou caminho relativo.
 */
export async function ensureDataUrl(url?: string | null): Promise<string | null> {
  if (!url) return null;
  if (url.startsWith('data:')) return url;
  if (dataUrlCache.has(url)) return dataUrlCache.get(url)!;

  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(url);
        reader.readAsDataURL(blob);
      });
      if (base64 && base64.startsWith('data:')) {
        dataUrlCache.set(url, base64);
        return base64;
      }
    }
  } catch (_) {}

  // Fallback via Image element drawing to canvas
  try {
    const base64 = await new Promise<string>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const cvs = document.createElement('canvas');
          cvs.width = img.naturalWidth || img.width || 400;
          cvs.height = img.naturalHeight || img.height || 400;
          const c = cvs.getContext('2d');
          if (c) {
            c.drawImage(img, 0, 0);
            const data = cvs.toDataURL('image/png');
            resolve(data);
            return;
          }
        } catch (_) {}
        resolve(url);
      };
      img.onerror = () => resolve(url);
      img.src = url;
    });
    if (base64 && base64.startsWith('data:')) {
      dataUrlCache.set(url, base64);
      return base64;
    }
  } catch (_) {}

  return url;
}

/**
 * Cria uma CanvasTexture do Three.js renderizando 100% FIEL e EXCLUSIVAMENTE o CardFrameSVG oficial da Matriz.
 * Não recria nenhum design: o SVG gerado pelo CardFrameSVG é decodificado diretamente no CanvasTexture.
 */
export function createMatrixCardTexture(cardInput: any): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 990;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const card = toMatrixCardData(cardInput);

  const renderOfficialSvgToCanvas = (targetCard: CardData) => {
    try {
      const svgString = renderMatrixCardSVG(targetCard, {
        pureSvgText: true,
        animateChroma: false,
        idScope: `tex-${targetCard.id}-${Math.floor(Math.random() * 999999)}`,
      });

      let sizedSvg = svgString;
      if (!sizedSvg.includes('xmlns=')) {
        sizedSvg = sizedSvg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!/width=/.test(sizedSvg)) {
        sizedSvg = sizedSvg.replace('<svg', '<svg width="680" height="990"');
      }

      const img = new Image();
      const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sizedSvg);
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        texture.needsUpdate = true;
      };
      img.onerror = (e) => {
        console.warn('Erro ao decodificar CardFrameSVG oficial para textura 3D:', e);
      };
      img.src = svgUri;
    } catch (err) {
      console.warn('Falha ao renderizar CardFrameSVG oficial para textura:', err);
    }
  };

  // Renderiza imediatamente o CardFrameSVG oficial
  renderOfficialSvgToCanvas(card);

  // Se a imagem precisa ser convertida para Data URL base64 autossuficiente para o SVG:
  if (card.imageUrl && !card.imageUrl.startsWith('data:')) {
    ensureDataUrl(card.imageUrl).then((dataUrl) => {
      if (dataUrl && dataUrl.startsWith('data:')) {
        renderOfficialSvgToCanvas({ ...card, imageUrl: dataUrl });
      }
    });
  }

  return texture;
}

/**
 * Cria uma CanvasTexture do Three.js renderizando 100% FIEL o CardBackSVG oficial da Matriz.
 */
export function createMatrixCardBackTexture(cardInput?: any): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 680;
  canvas.height = 990;
  const ctx = canvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;

  const card = toMatrixCardData(cardInput || {});

  const renderOfficialBackToCanvas = (targetCard: CardData) => {
    try {
      let svgString = renderMatrixCardBackSVG(targetCard);
      if (!svgString.includes('xmlns=')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }
      if (!/width=/.test(svgString)) {
        svgString = svgString.replace('<svg', '<svg width="680" height="990"');
      }

      const img = new Image();
      const svgUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        texture.needsUpdate = true;
      };
      img.src = svgUri;
    } catch (err) {
      console.warn('Falha ao renderizar CardBackSVG oficial para textura:', err);
    }
  };

  renderOfficialBackToCanvas(card);

  if (card.backImageUrl && !card.backImageUrl.startsWith('data:')) {
    ensureDataUrl(card.backImageUrl).then((dataUrl) => {
      if (dataUrl && dataUrl.startsWith('data:')) {
        renderOfficialBackToCanvas({ ...card, backImageUrl: dataUrl });
      }
    });
  }

  return texture;
}
