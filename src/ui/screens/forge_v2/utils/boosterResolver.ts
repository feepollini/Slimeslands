import { loadGameMatrixSnapshot, saveGameMatrixSnapshot } from '../../../../card_studio/src/utils/matrixPersistence';
import {
  generateBoosterPack,
  generateProceduralCard,
  DEFAULT_BOOSTER_MODELS,
  DEFAULT_CLASS_BALANCE_TABLES,
  INITIAL_BASE_CHARACTERS,
} from '../../../../card_studio/src/utils/proceduralEngine';
import { createPremiumCardTexture, PackCardData } from '../../../components/booster/pokemonTextures';
import { toMatrixCardData, createMatrixCardTexture, ensureDataUrl } from './HestridiaMatrixRenderer';
import { CARD_TEMPLATES } from '../../../../core/constants';
import { CardData } from '../../../../card_studio/src/types/card';
import { BaseCharacter } from '../../../../card_studio/src/types/slimelands';

/**
 * Converte qualquer carta do jogo ou blueprint procedural em PackCardData 3D.
 */
export function formatPackCardData(raw: any, index: number = 0): PackCardData {
  const tpl = raw.tpl || raw.cardData || raw;
  const name = String(raw.name || raw.title || tpl.name || tpl.title || `Carta ${index + 1}`).trim();
  
  const rawRarity = String(
    raw.rarity || raw.preferredRarity || raw.cardRank || tpl.preferredRarity || tpl.rarity || 'common'
  ).toLowerCase();

  let rarity: 'common' | 'uncommon' | 'rare' | 'legendary' = 'common';
  let rarityLabel = 'COMUM';

  if (rawRarity === 's' || rawRarity.includes('mítica') || rawRarity.includes('legendary') || rawRarity.includes('lendária')) {
    rarity = 'legendary';
    rarityLabel = 'LENDÁRIA';
  } else if (rawRarity === 'a' || rawRarity.includes('épica') || rawRarity.includes('epic')) {
    rarity = 'rare';
    rarityLabel = 'ÉPICA';
  } else if (rawRarity === 'b' || rawRarity.includes('rara') || rawRarity.includes('rare')) {
    rarity = 'rare';
    rarityLabel = 'RARA';
  } else if (rawRarity === 'c' || rawRarity.includes('incomum') || rawRarity.includes('uncommon')) {
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
  providedTemplates: any[] = []
): Promise<PackCardData[]> {
  const targetCount = Number(pack.cardsCount) || 9;
  const fixedCardNames: string[] = Array.isArray(pack.fixedCards) ? [...pack.fixedCards] : [];
  
  let snapshot: any = null;
  try {
    snapshot = await loadGameMatrixSnapshot();
  } catch (err) {
    console.warn('Não foi possível ler snapshot da Matriz:', err);
  }

  const isCleared =
    Boolean(snapshot?.isLibraryCleared) ||
    ((!snapshot?.cards || snapshot.cards.length === 0) &&
      (!snapshot?.baseCharacters || snapshot.baseCharacters.length === 0) &&
      (!providedTemplates || providedTemplates.length === 0));

  const resolvedCards: PackCardData[] = [];

  // Se a biblioteca da Matriz estiver limpa, não ressuscita cartas antigas nem resíduos
  if (isCleared) {
    for (let i = 0; i < targetCount; i++) {
      resolvedCards.push(
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
    return resolvedCards;
  }

  // Apenas cartas e blueprints reais da Matriz
  const allTemplates = [
    ...(providedTemplates || []),
    ...(snapshot?.cards || []),
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
      : [];

  baseCharacters.forEach((bc) => {
    if (bc?.name) templateMap.set(bc.name.toLowerCase().trim(), bc);
    if (bc?.id) templateMap.set(String(bc.id).toLowerCase().trim(), bc);
  });

  // 1. Processa cartas fixas selecionadas no editor de boosters
  for (const name of fixedCardNames) {
    if (resolvedCards.length >= targetCount) break;
    const cleanKey = name.toLowerCase().trim();
    const match = templateMap.get(cleanKey);

    if (match) {
      if ((match as any).family || (match as any).baseArchetype) {
        // É um blueprint procedural: gera a instância com rolagem de stats e raridade da matriz
        const balanceTables = snapshot?.balanceTables || DEFAULT_CLASS_BALANCE_TABLES;
        const generated = generateProceduralCard(
          match as BaseCharacter,
          balanceTables,
          (match as any).rarity !== 'Não classificada' ? (match as any).rarity : 'Comum',
          'deck-inventory'
        );
        resolvedCards.push(formatPackCardData(generated, resolvedCards.length));
      } else {
        // Carta existente do catálogo/matriz
        resolvedCards.push(formatPackCardData(match, resolvedCards.length));
      }
    } else {
      // Cria card básico com o nome configurado se não achou objeto completo
      resolvedCards.push(
        formatPackCardData(
          {
            name,
            rarity: 'rare',
            pv: 350,
            atk: 180,
          },
          resolvedCards.length
        )
      );
    }
  }

  // 2. Processa grupos configurados (cardGroups) se existirem
  if (resolvedCards.length < targetCount && pack.cardGroups) {
    const groupPool: string[] = [
      ...(pack.cardGroups.legendary || []),
      ...(pack.cardGroups.rare || []),
      ...(pack.cardGroups.common || []),
    ];
    for (const name of groupPool) {
      if (resolvedCards.length >= targetCount) break;
      const cleanKey = name.toLowerCase().trim();
      const match = templateMap.get(cleanKey);
      if (match) {
        resolvedCards.push(formatPackCardData(match, resolvedCards.length));
      }
    }
  }

  // 3. Preenche as vagas restantes usando o motor procedural da Matriz
  const remaining = targetCount - resolvedCards.length;
  if (remaining > 0) {
    const boosterModels =
      snapshot?.boosterModels && snapshot.boosterModels.length > 0
        ? snapshot.boosterModels
        : DEFAULT_BOOSTER_MODELS;

    const matchingBooster =
      boosterModels.find((b: any) => b.id === pack.id || b.name.toLowerCase() === pack.name?.toLowerCase()) ||
      boosterModels[0];

    const balanceTables = snapshot?.balanceTables || DEFAULT_CLASS_BALANCE_TABLES;
    const classifiedPool = baseCharacters.filter(
      (c) => c.rarity !== 'Não classificada' && c.isClassified !== false
    );
    const pool = classifiedPool.length > 0 ? classifiedPool : baseCharacters;

    const generated = generateBoosterPack(matchingBooster, pool, balanceTables, 'deck-inventory');
    for (let i = 0; i < remaining && i < generated.length; i++) {
      resolvedCards.push(formatPackCardData(generated[i], resolvedCards.length));
    }
  }

  // Se mesmo assim faltar alguma carta, completa com fallback
  while (resolvedCards.length < targetCount) {
    resolvedCards.push(
      formatPackCardData(
        {
          name: `Guardião Mistico #${resolvedCards.length + 1}`,
          rarity: 'common',
          pv: 300,
          atk: 150,
        },
        resolvedCards.length
      )
    );
  }

  // 3.5. Garante que todas as imagens sejam convertidas em Data URLs base64 autossuficientes
  // para que o CardFrameSVG oficial renderize de forma instantânea e sem restrições na textura 3D
  for (const rc of resolvedCards) {
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

  // 4. Salva as novas cartas na Matriz / inventário do jogo apenas se não for biblioteca limpa
  if (snapshot && !isCleared && resolvedCards.length > 0) {
    try {
      const cardsToPersist: CardData[] = resolvedCards.map((rc) => toMatrixCardData(rc));
      const existing = snapshot.cards || [];
      const updated = [...cardsToPersist, ...existing];
      await saveGameMatrixSnapshot({
        ...snapshot,
        updatedAt: new Date().toISOString(),
        cards: updated,
        isLibraryCleared: false,
      });
    } catch (saveErr) {
      console.warn('Erro ao salvar cartas abertas na matriz:', saveErr);
    }
  }

  return resolvedCards;
}
