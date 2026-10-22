import { loadGameMatrixSnapshot } from '../../../../card_studio/src/utils/matrixPersistence';
import {
  generateBoosterPack,
  generateProceduralCard,
  DEFAULT_BOOSTER_MODELS,
  DEFAULT_CLASS_BALANCE_TABLES,
  INITIAL_BASE_CHARACTERS,
} from '../../../../card_studio/src/utils/proceduralEngine';
import { INITIAL_CARDS } from '../../../../card_studio/src/utils/defaultCards';
import { PackCardData } from '../../../components/booster/pokemonTextures';
import {
  toMatrixCardData,
  createMatrixCardTexture,
  ensureDataUrl,
  upsertCardsIntoMatrixSnapshot,
} from './HestridiaMatrixRenderer';
import { CARD_TEMPLATES } from '../../../../core/constants';
import { CardData } from '../../../../card_studio/src/types/card';
import { BaseCharacter } from '../../../../card_studio/src/types/slimelands';

/**
 * Converte qualquer carta do jogo ou blueprint procedural em PackCardData 3D.
 */
export function getCardRarityWeight(card: any): number {
  if (!card) return 0;
  const tpl = card.tpl || card.cardData || card;
  const cls = String(
    card.cardClass || card.matrixRarity || tpl.cardClass || tpl.matrixRarity || ''
  ).toLowerCase();
  const rawRarity = String(
    card.rarity || card.preferredRarity || tpl.preferredRarity || tpl.rarity || ''
  ).toLowerCase();
  const rank = String(card.cardRank || tpl.cardRank || '').toLowerCase();
  const label = String(card.rarityLabel || '').toLowerCase();

  if (
    cls.includes('mítica') ||
    cls.includes('mitica') ||
    cls.includes('limitada') ||
    rawRarity.includes('mítica') ||
    rawRarity.includes('mitica') ||
    rawRarity.includes('mythic') ||
    label.includes('mítica') ||
    label.includes('mitica')
  ) {
    return 5;
  }
  if (
    cls.includes('lendária') ||
    cls.includes('lendaria') ||
    rawRarity.includes('lendária') ||
    rawRarity.includes('lendaria') ||
    rawRarity.includes('legendary') ||
    label.includes('lendária') ||
    label.includes('lendaria') ||
    rank === 's'
  ) {
    return 4;
  }
  if (
    cls.includes('épica') ||
    cls.includes('epica') ||
    rawRarity.includes('épica') ||
    rawRarity.includes('epica') ||
    rawRarity.includes('epic') ||
    label.includes('épica') ||
    rank === 'a'
  ) {
    return 3;
  }
  if (
    cls.includes('rara') ||
    rawRarity.includes('rara') ||
    rawRarity.includes('rare') ||
    label.includes('rara') ||
    rank === 'b'
  ) {
    return 2;
  }
  if (
    cls.includes('incomum') ||
    rawRarity.includes('incomum') ||
    rawRarity.includes('uncommon') ||
    label.includes('incomum') ||
    rank === 'c'
  ) {
    return 1;
  }
  return 0;
}

export function formatPackCardData(raw: any, index: number = 0): PackCardData {
  const tpl = raw.tpl || raw.cardData || raw;
  const name = String(raw.name || raw.title || tpl.name || tpl.title || `Carta ${index + 1}`).trim();

  const weight = getCardRarityWeight(raw);

  let rarity: 'common' | 'uncommon' | 'rare' | 'legendary' = 'common';
  let rarityLabel = 'COMUM';

  if (weight >= 5) {
    rarity = 'legendary';
    rarityLabel = 'MÍTICA ★★★';
  } else if (weight === 4) {
    rarity = 'legendary';
    rarityLabel = 'LENDÁRIA ★★★';
  } else if (weight === 3) {
    rarity = 'rare';
    rarityLabel = 'ÉPICA ★★';
  } else if (weight === 2) {
    rarity = 'rare';
    rarityLabel = 'RARA ★';
  } else if (weight === 1) {
    rarity = 'uncommon';
    rarityLabel = 'INCOMUM';
  }

  const pv = Number(raw.pv ?? raw.hp ?? raw.basePv ?? raw.maxPv ?? tpl.basePv ?? 120);
  const atk = Number(raw.atk ?? raw.baseAtk ?? tpl.baseAtk ?? 100);
  const mana = Number(raw.mana ?? raw.manaCost ?? tpl.manaCost ?? 2);
  const stamina = Number(raw.stamina ?? raw.staminaCost ?? tpl.staminaCost ?? 1);
  const type = String(raw.type || raw.classId || raw.elementText || tpl.classId || 'FERRO').toUpperCase();
  const imageUrl = String(raw.imageUrl || raw.image || tpl.imageUrl || tpl.image || '').trim();

  const cardPayload: any = {
    ...tpl,
    ...raw,
    id: String(raw.id || tpl.id || `card-${Date.now()}-${index}`),
    name,
    rarity,
    rarityLabel,
    rarityWeight: weight,
    hp: pv,
    pv,
    atk,
    mana,
    stamina,
    type,
    image: imageUrl,
    imageUrl,
    tpl,
  };

  const texture = createMatrixCardTexture(cardPayload);

  return {
    id: cardPayload.id,
    name,
    rarity,
    rarityLabel,
    hp: pv,
    type,
    texture,
    ...cardPayload,
  };
}

/**
 * Resolve as cartas que devem vir no Booster 3D:
 * 1. Prioriza cartas selecionadas na Forja (pack.fixedCards / pack.cardGroups).
 * 2. Preenche vagas restantes via Matriz Procedural Oficial (blueprints classificados).
 * 3. Persiste as cartas geradas/reveladas no snapshot do jogador.
 */
export async function resolveBoosterCards(
  pack: any,
  providedTemplates: any[] = [],
  carouselSlotCount: number = 12
): Promise<PackCardData[]> {
  const targetCount = Number(pack.cardsCount) || 9;
  const fixedCardNames: string[] = Array.isArray(pack.fixedCards) ? [...pack.fixedCards] : [];

  let snapshot: any = null;
  try {
    snapshot = await loadGameMatrixSnapshot();
  } catch (err) {
    console.warn('Não foi possível ler snapshot da Matriz:', err);
  }

  const isCleared = Boolean(snapshot?.isLibraryCleared);

  // Se a biblioteca da Matriz estiver explicitamente limpa, não ressuscita cartas antigas
  if (isCleared) {
    const emptyCards: PackCardData[] = [];
    for (let i = 0; i < targetCount; i++) {
      emptyCards.push(
        formatPackCardData(
          {
            name: `Slot Matriz #${i + 1} (Vazio)`,
            rarity: 'common',
            pv: 100,
            atk: 50,
          },
          i
        )
      );
    }
    return emptyCards;
  }

  // Cartas e blueprints reais da Matriz + catálogo do jogo
  const activeMatrixCards =
    snapshot?.cards && snapshot.cards.length > 0 ? snapshot.cards : INITIAL_CARDS;
  const allTemplates = [
    ...(providedTemplates || []),
    ...activeMatrixCards,
    ...(snapshot?.playerInventory || []),
    ...(CARD_TEMPLATES as any[]),
  ];

  const templateMap = new Map<string, any>();
  allTemplates.forEach((t) => {
    if (t?.name) templateMap.set(t.name.toLowerCase().trim(), t);
    if (t?.title) templateMap.set(t.title.toLowerCase().trim(), t);
    if (t?.id) templateMap.set(String(t.id).toLowerCase().trim(), t);
  });

  const baseCharacters: BaseCharacter[] =
    snapshot?.baseCharacters && snapshot.baseCharacters.length > 0
      ? snapshot.baseCharacters
      : INITIAL_BASE_CHARACTERS;

  baseCharacters.forEach((bc) => {
    if (bc?.name) templateMap.set(bc.name.toLowerCase().trim(), bc);
    if (bc?.id) templateMap.set(String(bc.id).toLowerCase().trim(), bc);
  });

  const boosterModels =
    snapshot?.boosterModels && snapshot.boosterModels.length > 0
      ? snapshot.boosterModels
      : DEFAULT_BOOSTER_MODELS;

  const matchingBooster =
    boosterModels.find(
      (b: any) => b.id === pack.id || b.name?.toLowerCase() === pack.name?.toLowerCase()
    ) || boosterModels[0];

  const balanceTables = snapshot?.balanceTables || DEFAULT_CLASS_BALANCE_TABLES;
  const activePool = baseCharacters.filter((c) => c.active !== false);
  const charsPool = activePool.length > 0 ? activePool : baseCharacters;

  /**
   * Rola de verdade um pacote individual para um dos 12 envelopes da ciranda.
   * Cada envelope tem sua própria rolagem procedural real de cartas, atributos, ranks e raridades.
   */
  const rollRawCardsForEnvelope = (slotIdx: number): any[] => {
    const rawList: any[] = [];

    // 1. Processa cartas fixas selecionadas no editor de boosters (com rolagem procedural individual por envelope)
    for (const name of fixedCardNames) {
      if (rawList.length >= targetCount) break;
      const cleanKey = name.toLowerCase().trim();
      const match = templateMap.get(cleanKey);

      if (match) {
        if ((match as any).family || (match as any).baseArchetype) {
          const generated = generateProceduralCard({
            character: match as BaseCharacter,
            charactersPool: baseCharacters,
            balanceTables,
            origin: 'Booster',
            deckId: 'deck-inventory',
          });
          rawList.push(generated);
        } else {
          rawList.push({
            ...match,
            id: `${match.id || 'card'}-env${slotIdx}-${rawList.length}-${Math.random().toString(36).slice(2, 6)}`,
          });
        }
      } else {
        rawList.push({
          name,
          rarity: 'rare',
          pv: 350,
          atk: 180,
        });
      }
    }

    // 2. Processa grupos configurados (cardGroups) se existirem
    if (rawList.length < targetCount && pack.cardGroups) {
      const groupPool: string[] = [
        ...(pack.cardGroups.legendary || []),
        ...(pack.cardGroups.rare || []),
        ...(pack.cardGroups.common || []),
      ];
      // Embaralha o pool para que cada envelope da roda tenha sorteio próprio
      const shuffledGroup = [...groupPool].sort(() => Math.random() - 0.5);
      for (const name of shuffledGroup) {
        if (rawList.length >= targetCount) break;
        const cleanKey = name.toLowerCase().trim();
        const match = templateMap.get(cleanKey);
        if (match) {
          rawList.push({
            ...match,
            id: `${match.id || 'grp'}-env${slotIdx}-${rawList.length}-${Math.random().toString(36).slice(2, 6)}`,
          });
        }
      }
    }

    // 3. Preenche as vagas restantes usando o motor procedural oficial da Matriz
    const remaining = targetCount - rawList.length;
    if (remaining > 0) {
      const generated = generateBoosterPack(
        matchingBooster,
        charsPool,
        balanceTables,
        'deck-inventory',
        activeMatrixCards
      );
      for (let i = 0; i < remaining && i < generated.length; i++) {
        rawList.push(generated[i]);
      }
    }

    // Fallback caso ainda falte alguma carta
    while (rawList.length < targetCount) {
      rawList.push({
        name: `Guardião Místico #${rawList.length + 1}`,
        rarity: 'common',
        pv: 300,
        atk: 150,
      });
    }

    // Ordena para que a carta Mítica ou Lendária SEMPRE seja a última carta do envelope
    rawList.sort((a, b) => getCardRarityWeight(a) - getCardRarityWeight(b));
    return rawList;
  };

  // Gera os 12 pacotes reais (um para cada um dos 12 envelopes da ciranda)
  const totalSlots = Math.max(1, carouselSlotCount);
  const slotRawPacks: any[][] = [];
  for (let s = 0; s < totalSlots; s++) {
    slotRawPacks.push(rollRawCardsForEnvelope(s));
  }

  const materializedCache = new Map<number, PackCardData[]>();

  const materializeCarouselSlot = async (
    slotIdx: number,
    persistToMatrix: boolean = true
  ): Promise<PackCardData[]> => {
    const normalizedIdx = ((slotIdx % totalSlots) + totalSlots) % totalSlots;
    let packCards = materializedCache.get(normalizedIdx);

    if (!packCards) {
      const rawItems = slotRawPacks[normalizedIdx] || rollRawCardsForEnvelope(normalizedIdx);
      packCards = rawItems.map((item, idx) => formatPackCardData(item, idx));

      // Ordena garantindo que Mítica / Lendária fique sempre na última posição
      packCards.sort((a: any, b: any) => {
        const wa = typeof a.rarityWeight === 'number' ? a.rarityWeight : getCardRarityWeight(a);
        const wb = typeof b.rarityWeight === 'number' ? b.rarityWeight : getCardRarityWeight(b);
        return wa - wb;
      });

      // Converte imagens para Data URLs base64 para renderização instantânea no Three.js e SVG
      for (const rc of packCards) {
        const rawImg = (rc as any).image || (rc as any).imageUrl;
        if (rawImg && !rawImg.startsWith('data:')) {
          const dataUrl = await ensureDataUrl(rawImg);
          if (dataUrl && dataUrl.startsWith('data:')) {
            (rc as any).image = dataUrl;
            (rc as any).imageUrl = dataUrl;
            rc.texture = createMatrixCardTexture(rc);
          }
        }
      }

      materializedCache.set(normalizedIdx, packCards);
    }

    if (persistToMatrix && !isCleared && packCards.length > 0) {
      try {
        const cardsToPersist: CardData[] = packCards.map((rc) => toMatrixCardData(rc));
        await upsertCardsIntoMatrixSnapshot(cardsToPersist);
      } catch (saveErr) {
        console.warn('Erro ao salvar cartas do booster escolhido na matriz:', saveErr);
      }
    }

    return packCards;
  };

  // Pré-materializa o slot 0 (sem persistir ainda se o usuário for escolher na roda, ou persiste ao abrir)
  const initialResolved = await materializeCarouselSlot(0, false);

  // Anexa os 12 pacotes reais e o materializador por slot para o BoosterPackViewer usar ao escolher qualquer envelope
  (initialResolved as any).carouselSlotRawPacks = slotRawPacks;
  (initialResolved as any).materializeCarouselSlot = materializeCarouselSlot;
  (initialResolved as any).rerollCarouselSlot = async (slotIdx: number) => {
    const normalizedIdx = ((slotIdx % totalSlots) + totalSlots) % totalSlots;
    slotRawPacks[normalizedIdx] = rollRawCardsForEnvelope(normalizedIdx);
    materializedCache.delete(normalizedIdx);
    return materializeCarouselSlot(normalizedIdx, true);
  };

  return initialResolved;
}
