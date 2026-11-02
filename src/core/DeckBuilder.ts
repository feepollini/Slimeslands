/**
 * DeckBuilder.ts — Strategic Deck Auto-Fill & Balancing Engine for Slimelands.
 * 
 * Crafts balanced decks combining Creatures (Slimes) and Magic Cards (Spells)
 * with a healthy mana/stamina cost curve, rarity/rank distribution, and uniqueness rules.
 */

export function isMagicCard(card: any): boolean {
  if (!card) return false;
  if (card.entityType === 'Magia' || card.type === 'Magia' || card.isSpell === true) return true;
  if (card.cardData && (card.cardData.entityType === 'Magia' || card.cardData.type === 'Magia' || card.cardData.isSpell)) return true;
  if (card.matrixCard && (card.matrixCard.entityType === 'Magia' || card.matrixCard.type === 'Magia' || card.matrixCard.isSpell)) return true;
  if (typeof card.magicManaCost === 'number' && card.magicManaCost > 0) return true;
  if (typeof card.cardData?.magicManaCost === 'number' && card.cardData.magicManaCost > 0) return true;
  if (typeof card.matrixCard?.magicManaCost === 'number' && card.matrixCard.magicManaCost > 0) return true;
  if (typeof card.pvText === 'string' && /MANA/i.test(card.pvText)) return true;
  return false;
}

export function getCardCost(card: any): number {
  if (!card) return 2;
  const isMagic = isMagicCard(card);
  if (isMagic) {
    if (typeof card.magicManaCost === 'number' && card.magicManaCost > 0) return card.magicManaCost;
    if (typeof card.manaCost === 'number' && card.manaCost > 0) return card.manaCost;
    if (typeof card.cardData?.magicManaCost === 'number' && card.cardData.magicManaCost > 0) return card.cardData.magicManaCost;
    if (typeof card.matrixCard?.magicManaCost === 'number' && card.matrixCard.magicManaCost > 0) return card.matrixCard.magicManaCost;
  } else {
    if (typeof card.summonStaminaCost === 'number' && card.summonStaminaCost > 0) return card.summonStaminaCost;
    if (typeof card.staminaCost === 'number' && card.staminaCost > 0) return card.staminaCost;
    if (typeof card.cardData?.summonStaminaCost === 'number' && card.cardData.summonStaminaCost > 0) return card.cardData.summonStaminaCost;
    if (typeof card.matrixCard?.summonStaminaCost === 'number' && card.matrixCard.summonStaminaCost > 0) return card.matrixCard.summonStaminaCost;
  }
  const rawCost = card.summonCostPill?.badgeValue || card.cost;
  if (rawCost) {
    const parsed = parseInt(String(rawCost).replace(/\D/g, ''), 10);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  return isMagic ? 3 : 2;
}

export function getCardRank(card: any): string {
  if (!card) return 'C';
  const raw =
    card.cardRank ||
    card.rank ||
    card.cardData?.cardRank ||
    card.matrixCard?.cardRank ||
    card.meta?.rank ||
    card.rankBadgeText;
  if (raw && typeof raw === 'string') {
    const u = raw.toUpperCase().trim();
    if (['S', 'A', 'B', 'C', 'D'].includes(u)) return u;
  }
  const rarity = (card.preferredRarity || card.rarity || '').toLowerCase();
  if (rarity.includes('legendary') || rarity.includes('mitica') || rarity.includes('mítica')) return 'S';
  if (rarity.includes('epic') || rarity.includes('épica') || rarity.includes('epica') || rarity.includes('limitada')) return 'A';
  if (rarity.includes('rare') || rarity.includes('rara') || rarity.includes('incomum')) return 'B';
  return 'C';
}

export function getCardRankWeight(card: any): number {
  const rank = getCardRank(card);
  const weights: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
  return weights[rank] || 1;
}

export function getDeckCompositionStats(cards: (any | null)[]): {
  total: number;
  creatures: number;
  spells: number;
  rankCounts: Record<string, number>;
  avgCost: number;
} {
  const valid = cards.filter(Boolean);
  let creatures = 0;
  let spells = 0;
  let totalCost = 0;
  const rankCounts: Record<string, number> = { S: 0, A: 0, B: 0, C: 0, D: 0 };

  for (const c of valid) {
    if (isMagicCard(c)) {
      spells++;
    } else {
      creatures++;
    }
    const r = getCardRank(c);
    rankCounts[r] = (rankCounts[r] || 0) + 1;
    totalCost += getCardCost(c);
  }

  return {
    total: valid.length,
    creatures,
    spells,
    rankCounts,
    avgCost: valid.length > 0 ? Number((totalCost / valid.length).toFixed(1)) : 0,
  };
}

/**
 * Builds a balanced, strategic deck combining creatures and magic cards.
 * 
 * Default 12-card deck distribution:
 * - 8 Criaturas (~67%)
 *   - ~4 low-cost (<=2 stamina) - immediate board presence & fast summon
 *   - ~2-3 mid-cost (3-4 stamina) - solid combat core
 *   - ~1-2 high-cost (>=5 stamina) - late-game boss / finishers
 * - 4 Magias (~33%)
 *   - ~2 low-cost (<=3 mana) - reactive defense, buffs, healing
 *   - ~2 mid/high-cost (>=4 mana) - game-changing celestial / elemental spells
 * 
 * Enforces rarity caps:
 * - Max 1 copy per Rank S card
 * - Max 2 Rank S cards total in deck
 * - Max 2 copies of any other card
 */
export function buildBalancedPlayerDeck(availablePool: any[], deckSize = 12): any[] {
  if (!availablePool || availablePool.length === 0) return [];

  // Filter into creatures and spells
  const creatures = availablePool.filter((c) => !isMagicCard(c));
  const spells = availablePool.filter((c) => isMagicCard(c));

  // Determine balanced targets (default ~67% creatures, ~33% spells)
  let targetSpells = Math.min(spells.length, Math.max(1, Math.round(deckSize * 0.33)));
  let targetCreatures = Math.min(creatures.length, deckSize - targetSpells);

  // If one pool lacks sufficient cards, backfill with the other
  if (targetCreatures + targetSpells < deckSize) {
    if (creatures.length >= deckSize - targetSpells) {
      targetCreatures = deckSize - targetSpells;
    } else if (spells.length >= deckSize - targetCreatures) {
      targetSpells = deckSize - targetCreatures;
    }
  }

  // Cost buckets
  function bucketize(pool: any[]) {
    return {
      low: pool.filter((c) => getCardCost(c) <= 2),
      mid: pool.filter((c) => getCardCost(c) >= 3 && getCardCost(c) <= 4),
      high: pool.filter((c) => getCardCost(c) >= 5),
    };
  }

  const cBuckets = bucketize(creatures);
  const sBuckets = bucketize(spells);

  // Score candidate card considering combat stats or spell value, rank, and controlled jitter
  function scoreCandidate(c: any): number {
    const rankWeight = getCardRankWeight(c);
    const pv = Number(c.pv || c.basePv || c.pvNumber || c.df || c.playerDefenseBonus || 0);
    const atk = Number(c.atk || c.baseAtk || c.maxDamage || c.specialAttack?.damage || 0);
    const attacksCount = Array.isArray(c.attacks) ? c.attacks.length : 1;
    const statsValue = pv * 0.08 + atk * 0.6 + attacksCount * 5;
    const jitter = Math.random() * 2.5;
    return rankWeight * 3.5 + (statsValue > 0 ? Math.log10(statsValue + 1) * 2 : 0) + jitter;
  }

  const selected: any[] = [];
  const cardUsage = new Map<string, number>();

  function canAdd(card: any): boolean {
    const id = String(card.id || card.title || card.name);
    const count = cardUsage.get(id) || 0;
    const rank = getCardRank(card);

    // Limit Rank S: max 1 copy per distinct card and max 2 total Rank S in deck
    if (rank === 'S' && count >= 1) return false;
    if (count >= 2) return false;
    if (rank === 'S') {
      const sCount = selected.filter((c) => getCardRank(c) === 'S').length;
      if (sCount >= 2) return false;
    }
    return true;
  }

  function pickFromBucket(bucket: any[], count: number) {
    if (count <= 0 || !bucket || bucket.length === 0) return;
    const sorted = [...bucket].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
    let picked = 0;
    for (const card of sorted) {
      if (picked >= count) break;
      if (canAdd(card)) {
        selected.push(card);
        const id = String(card.id || card.title || card.name);
        cardUsage.set(id, (cardUsage.get(id) || 0) + 1);
        picked++;
      }
    }
    // Fallback if strict limits prevented picking full quota
    if (picked < count) {
      for (const card of sorted) {
        if (picked >= count) break;
        const id = String(card.id || card.title || card.name);
        const cur = cardUsage.get(id) || 0;
        if (cur < 2 && getCardRank(card) !== 'S') {
          selected.push(card);
          cardUsage.set(id, cur + 1);
          picked++;
        }
      }
    }
  }

  // 1. Pick Creatures curve: ~45% low (<=2), ~35% mid (3-4), ~20% high (>=5)
  const cLowTarget = Math.max(1, Math.round(targetCreatures * 0.45));
  const cHighTarget = Math.max(1, Math.round(targetCreatures * 0.20));
  const cMidTarget = Math.max(1, targetCreatures - cLowTarget - cHighTarget);

  pickFromBucket(cBuckets.low, cLowTarget);
  pickFromBucket(cBuckets.mid, cMidTarget);
  pickFromBucket(cBuckets.high, cHighTarget);

  // Fill remaining creature quota if any bucket was exhausted
  if (selected.filter((c) => !isMagicCard(c)).length < targetCreatures) {
    const allC = [...creatures].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
    for (const card of allC) {
      if (selected.filter((c) => !isMagicCard(c)).length >= targetCreatures) break;
      if (canAdd(card)) {
        selected.push(card);
        const id = String(card.id || card.title || card.name);
        cardUsage.set(id, (cardUsage.get(id) || 0) + 1);
      }
    }
  }

  // 2. Pick Spells curve: ~50% low utility (<=3 mana), ~50% high impact (>=4 mana)
  const sLowTarget = Math.max(1, Math.round(targetSpells * 0.50));
  const sHighTarget = Math.max(1, targetSpells - sLowTarget);

  pickFromBucket(sBuckets.low, sLowTarget);
  pickFromBucket([...sBuckets.mid, ...sBuckets.high], sHighTarget);

  // Fill remaining spells quota if any bucket was exhausted
  if (selected.filter((c) => isMagicCard(c)).length < targetSpells) {
    const allS = [...spells].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
    for (const card of allS) {
      if (selected.filter((c) => isMagicCard(c)).length >= targetSpells) break;
      if (canAdd(card)) {
        selected.push(card);
        const id = String(card.id || card.title || card.name);
        cardUsage.set(id, (cardUsage.get(id) || 0) + 1);
      }
    }
  }

  // Final fill if deck is still under deckSize
  if (selected.length < deckSize) {
    const remainingPool = [...availablePool].sort((a, b) => scoreCandidate(b) - scoreCandidate(a));
    for (const card of remainingPool) {
      if (selected.length >= deckSize) break;
      if (canAdd(card)) {
        selected.push(card);
        const id = String(card.id || card.title || card.name);
        cardUsage.set(id, (cardUsage.get(id) || 0) + 1);
      }
    }
  }

  // Absolute fallback to fill any slots if pool was smaller than deckSize
  while (selected.length < deckSize && availablePool.length > 0) {
    selected.push(availablePool[selected.length % availablePool.length]);
  }

  // Sort deck: creatures first by cost (low to high), then spells by cost (low to high)
  return selected.slice(0, deckSize).sort((a, b) => {
    const isMagA = isMagicCard(a);
    const isMagB = isMagicCard(b);
    if (isMagA !== isMagB) return isMagA ? 1 : -1;
    const costA = getCardCost(a);
    const costB = getCardCost(b);
    if (costA !== costB) return costA - costB;
    return getCardRankWeight(b) - getCardRankWeight(a);
  });
}
