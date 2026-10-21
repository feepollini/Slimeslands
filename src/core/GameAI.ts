import { GameEngine, Card } from './GameEngine';
import { computeAttack } from './CombatEngine';
import { ENCHANTMENT_REGISTRY } from './enchantments';
import type { AttackDef } from './types';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIMove {
    action: 'attack' | 'play' | 'skill' | 'sacrifice' | 'draw' | 'end';
    atkIdx?: number;
    defIdx?: number;
    cardToPlay?: Card;
    skillIdx?: number;
    attackIdx?: number;
}

interface CandidateMove extends AIMove {
    score: number;
}

export class GameAI {
    public computeMove(engine: GameEngine, difficulty: AIDifficulty): AIMove {
        if (engine.actionsLeft <= 0) {
            return { action: 'end' };
        }

        const eCards = [0, 1, 2]
            .map(i => ({ idx: i, card: engine.board[i] }))
            .filter((x): x is { idx: number; card: Card } => !!x.card && !x.card.isStunned && !x.card.isFlipped);

        const allECards = [0, 1, 2]
            .map(i => ({ idx: i, card: engine.board[i] }))
            .filter((x): x is { idx: number; card: Card } => !!x.card);

        const pCards = [3, 4, 5]
            .map(i => ({ idx: i, card: engine.board[i] }))
            .filter((x): x is { idx: number; card: Card } => !!x.card);

        const emptyESlots = [0, 1, 2].filter(i => !engine.board[i]);

        // ─── EASY DIFFICULTY: Straightforward, forgiving, occasional suboptimal choices ───
        if (difficulty === 'easy') {
            return this.computeEasyMove(engine, eCards, pCards, emptyESlots);
        }

        // ─── MEDIUM & HARD DIFFICULTIES: Tactical Evaluation Engine ────────────────────────
        const candidates: CandidateMove[] = [];

        // 1. Evaluate Artifact / Skill Moves
        const skillMove = this.evaluateSkills(engine, difficulty, eCards, pCards);
        if (skillMove) {
            candidates.push(skillMove);
        }

        // 2. Evaluate Card Summon Moves
        const playMove = this.evaluateCardPlays(engine, difficulty, allECards, pCards, emptyESlots);
        if (playMove) {
            candidates.push(playMove);
        }

        // 3. Evaluate Attack & Enchantment Capsule Moves
        const atkMove = this.evaluateAttacks(engine, difficulty, eCards, allECards, pCards);
        if (atkMove) {
            candidates.push(atkMove);
        }

        // 4. Evaluate Tactical Sacrifice (Hard mode only)
        if (difficulty === 'hard') {
            const sacMove = this.evaluateSacrifice(engine, allECards, pCards, emptyESlots);
            if (sacMove) {
                candidates.push(sacMove);
            }
        }

        // 5. Evaluate Card Draw
        const drawMove = this.evaluateDraw(engine, difficulty, eCards, emptyESlots);
        if (drawMove) {
            candidates.push(drawMove);
        }

        if (candidates.length === 0) {
            return { action: 'end' };
        }

        // Sort by highest tactical score
        candidates.sort((a, b) => b.score - a.score);
        const best = candidates[0];

        if (best.score <= 0) {
            return { action: 'end' };
        }

        return {
            action: best.action,
            atkIdx: best.atkIdx,
            defIdx: best.defIdx,
            cardToPlay: best.cardToPlay,
            skillIdx: best.skillIdx,
            attackIdx: best.attackIdx,
        };
    }

    // ─── EASY MODE ────────────────────────────────────────────────────────────────────────
    private computeEasyMove(
        engine: GameEngine,
        eCards: { idx: number; card: Card }[],
        pCards: { idx: number; card: Card }[],
        emptyESlots: number[]
    ): AIMove {
        // If AI has no cards on board and can play one, summon a random affordable card
        const affordable = engine.aiHand.filter(c => engine.mana.e >= (c.manaCost || 1));
        if (emptyESlots.length > 0 && affordable.length > 0 && (eCards.length === 0 || Math.random() < 0.65)) {
            const pick = affordable[Math.floor(Math.random() * affordable.length)];
            const slot = emptyESlots[0];
            return { action: 'play', defIdx: slot, cardToPlay: pick };
        }

        // Try a basic attack
        if (eCards.length > 0) {
            const atkMove = this.evaluateAttacks(engine, 'easy', eCards, eCards, pCards);
            if (atkMove) return atkMove;
        }

        // Otherwise play a card if possible
        if (emptyESlots.length > 0 && affordable.length > 0) {
            return { action: 'play', defIdx: emptyESlots[0], cardToPlay: affordable[0] };
        }

        // Draw if hand is empty or no playable cards
        if (engine.aiDeck.length > 0 && engine.aiHand.length < 5 && (engine.aiHand.length === 0 || affordable.length === 0)) {
            return { action: 'draw' };
        }

        return { action: 'end' };
    }

    // ─── SKILL / ARTIFACT EVALUATION ──────────────────────────────────────────────────────
    private evaluateSkills(
        engine: GameEngine,
        difficulty: AIDifficulty,
        eCards: { idx: number; card: Card }[],
        pCards: { idx: number; card: Card }[]
    ): CandidateMove | null {
        const skillPool = engine.aiSkills || [];
        let bestSkill: CandidateMove | null = null;

        for (let i = 0; i < skillPool.length; i++) {
            const skill = skillPool[i];
            if (!skill) continue;

            const mCost = skill.manaCost || 0;
            const sCost = skill.staminaCost || 0;
            if (engine.mana.e < mCost || engine.stamina.e < sCost) continue;

            let score = 0;
            let targetIdx: number | undefined = undefined;

            // Divine Action: gives 2 actions! High priority if AI still has resources to follow up
            if (skill.effect === 'divine') {
                const remMana = engine.mana.e - mCost;
                const remStam = engine.stamina.e - sCost;
                if (remMana >= 2 || remStam >= 2) {
                    score = difficulty === 'hard' ? 680 : 420;
                }
            }
            // Support / Healing skills
            else if (skill.group === 'support' || skill.effect === 'heal') {
                const missingHp = 1500 - engine.hp.e;
                if (missingHp >= 300) {
                    score = 260 + missingHp * 0.35;
                    if (engine.hp.e <= 450) score += 350; // Emergency heal
                }
            }
            // Offensive targeted skills
            else if (pCards.length > 0) {
                for (const p of pCards) {
                    let targetScore = 0;
                    const cardThreat = p.card.atk * 1.2 + p.card.pv * 0.3;

                    if (skill.effect === 'flip' && !p.card.isFlipped) {
                        // Flipping a high-PV card makes the next attack an instant kill!
                        targetScore = 240 + p.card.pv * 0.45 + p.card.atk * 0.4;
                        if (difficulty === 'hard' && eCards.length > 0) targetScore += 180;
                    } else if (skill.effect === 'stun' && !p.card.isStunned) {
                        targetScore = 210 + cardThreat * 0.5;
                    } else if (skill.effect === 'nuke' || skill.effect === 'drain') {
                        const dmg = skill.value || skill.power || 250;
                        const kills = p.card.pv <= dmg;
                        targetScore = dmg * 0.8 + (kills ? 320 + p.card.atk * 0.5 : 80);
                        if (kills && Math.floor(p.card.maxPv * 0.25) >= engine.hp.p) {
                            targetScore = 9500; // Match lethal via skill kill!
                        }
                    } else if (skill.effect === 'poison' || skill.effect === 'burn') {
                        if (!p.card.poisonTurns && !p.card.burnTurns) {
                            targetScore = 175 + p.card.pv * 0.25;
                        }
                    } else if (skill.group === 'offensive') {
                        targetScore = 180 + cardThreat * 0.35;
                    }

                    if (targetScore > score) {
                        score = targetScore;
                        targetIdx = p.idx;
                    }
                }
            }

            if (score > 0 && (!bestSkill || score > bestSkill.score)) {
                bestSkill = { action: 'skill', skillIdx: i, defIdx: targetIdx, score };
            }
        }

        return bestSkill;
    }

    // ─── CARD SUMMON EVALUATION ───────────────────────────────────────────────────────────
    private evaluateCardPlays(
        engine: GameEngine,
        difficulty: AIDifficulty,
        allECards: { idx: number; card: Card }[],
        pCards: { idx: number; card: Card }[],
        emptyESlots: number[]
    ): CandidateMove | null {
        if (emptyESlots.length === 0) return null;

        const affordable = engine.aiHand.filter(c => engine.mana.e >= (c.manaCost || 1));
        if (affordable.length === 0) return null;

        let bestPlay: CandidateMove | null = null;

        // Urgent board presence bonus if AI has 0 cards on board
        const boardPresenceUrgency = allECards.length === 0 ? 380 : (allECards.length === 1 ? 190 : 85);

        for (const card of affordable) {
            let cardScore = boardPresenceUrgency;

            // Base stats evaluation
            const maxAtkDmg = this.getCardPeakDamage(card);
            cardScore += maxAtkDmg * 0.55 + card.pv * 0.28;

            // Ability evaluation
            if (card.abilityId === 'mass_flip') {
                const unflippedEnemies = pCards.filter(p => !p.card.isFlipped).length;
                if (unflippedEnemies >= 2) {
                    cardScore += difficulty === 'hard' ? 480 : 280;
                } else if (unflippedEnemies === 1) {
                    cardScore += 180;
                }
            } else if (card.abilityId === 'reflect') {
                const highAtkPlayer = pCards.some(p => p.card.atk >= 300);
                cardScore += highAtkPlayer ? 160 : 75;
            } else if (card.abilityId === 'resilience') {
                cardScore += 120;
            } else if (card.abilityId === 'vampire') {
                cardScore += engine.hp.e < 1000 ? 150 : 70;
            } else if (card.abilityId === 'deathblow') {
                cardScore += pCards.length >= 2 ? 140 : 65;
            } else if (card.abilityId === 'rivalry') {
                const hasRivalTarget = pCards.some(p => p.card.type && card.type && p.card.type !== card.type);
                if (hasRivalTarget) cardScore += 110;
            }

            if (card.specialAttack) {
                cardScore += 80;
            }

            // Choose best slot (on Hard, prefer slot opposite to a weak or unflipped target, or center slot 1)
            let chosenSlot = emptyESlots[0];
            if (difficulty === 'hard' && emptyESlots.length > 1) {
                // Prefer slot opposing a player card to contest the lane
                const contestedSlot = emptyESlots.find(s => !!engine.board[s + 3]);
                if (contestedSlot !== undefined) chosenSlot = contestedSlot;
            }

            if (!bestPlay || cardScore > bestPlay.score) {
                bestPlay = {
                    action: 'play',
                    defIdx: chosenSlot,
                    cardToPlay: card,
                    score: cardScore,
                };
            }
        }

        return bestPlay;
    }

    // ─── ATTACK & CAPSULE EVALUATION ──────────────────────────────────────────────────────
    private evaluateAttacks(
        engine: GameEngine,
        difficulty: AIDifficulty,
        eCards: { idx: number; card: Card }[],
        allECards: { idx: number; card: Card }[],
        pCards: { idx: number; card: Card }[]
    ): CandidateMove | null {
        if (eCards.length === 0) return null;

        let bestAttack: CandidateMove | null = null;

        for (const e of eCards) {
            const rawAttacks = e.card.attacks && e.card.attacks.length > 0
                ? e.card.attacks
                : [{
                    name: 'ATAQUE',
                    type: 'damage' as const,
                    cost: e.card.staminaCost || 1,
                    costType: 'stamina' as const,
                    damage: e.card.atk,
                }];

            const candidateCapsules: { aIdx: number; def: AttackDef }[] = rawAttacks.map((def, idx) => ({
                aIdx: idx,
                def,
            }));

            // Also include specialAttack (index 99) if present
            if (e.card.specialAttack && difficulty !== 'easy') {
                candidateCapsules.push({
                    aIdx: 99,
                    def: {
                        name: e.card.specialAttack.name,
                        type: 'damage',
                        damage: e.card.specialAttack.damage,
                        cost: e.card.specialAttack.cost,
                        costType: e.card.specialAttack.costType,
                        effect: e.card.specialAttack.effect,
                        value: e.card.specialAttack.value,
                    },
                });
            }

            for (const { aIdx, def: atkDef } of candidateCapsules) {
                const cost = atkDef.cost ?? 1;
                const costType = atkDef.costType || 'stamina';
                if (costType === 'mana' && engine.mana.e < cost) continue;
                if (costType === 'stamina' && engine.stamina.e < cost) continue;

                // ── CASE A: ENCHANTMENT CAPSULE ──────────────────────────────────
                if (atkDef.type === 'enchantment' && atkDef.enchantment) {
                    if (difficulty === 'easy') continue; // Easy AI sticks to simple attacks
                    const encMove = this.evaluateEnchantmentCapsule(engine, difficulty, e, aIdx, atkDef, allECards, pCards);
                    if (encMove && (!bestAttack || encMove.score > bestAttack.score)) {
                        bestAttack = encMove;
                    }
                    continue;
                }

                // ── CASE B: DIRECT HIT WHEN PLAYER HAS NO CARDS ON BOARD ─────────
                if (pCards.length === 0) {
                    const emptyPSlot = [3, 4, 5].find(i => !engine.board[i]) ?? 3;
                    const sim = computeAttack(e.card, null, emptyPSlot, engine.hp, atkDef);
                    const directDmg = sim.hpDmgP || sim.damage || atkDef.damage || e.card.atk;
                    const isMatchLethal = directDmg >= engine.hp.p;
                    const score = isMatchLethal
                        ? 10000 + directDmg
                        : 420 + directDmg * 2.2 - cost * 12;

                    if (!bestAttack || score > bestAttack.score) {
                        bestAttack = {
                            action: 'attack',
                            atkIdx: e.idx,
                            defIdx: emptyPSlot,
                            attackIdx: aIdx,
                            score,
                        };
                    }
                    continue;
                }

                // ── CASE C: ATTACKING A PLAYER CARD ON BOARD ─────────────────────
                for (const p of pCards) {
                    // Camouflaged player cards cannot be targeted directly if other targets exist
                    if (p.card.isCamouflaged && pCards.length > 1) continue;

                    const sim = computeAttack(e.card, p.card, p.idx, engine.hp, atkDef);

                    if (difficulty === 'easy') {
                        const easyScore = sim.damage + (Math.random() * 180 - 90);
                        if (!bestAttack || easyScore > bestAttack.score) {
                            bestAttack = {
                                action: 'attack',
                                atkIdx: e.idx,
                                defIdx: p.idx,
                                attackIdx: aIdx,
                                score: Math.max(10, easyScore),
                            };
                        }
                        continue;
                    }

                    let score = sim.damage * 0.85;

                    // 1. Check Match Lethal (killing player card deals 25% of its maxPv to player HP)
                    if (sim.defDied && sim.hpDmgE >= engine.hp.p) {
                        score += 10000;
                    }

                    // 2. Card Kill Bonus
                    if (sim.defDied) {
                        const victimThreat = p.card.atk * 0.9 + p.card.maxPv * 0.25;
                        score += 280 + victimThreat;

                        // Avoid massive overkill waste when a cheaper attack also kills
                        const overkill = Math.max(0, sim.damage - p.card.pv);
                        score -= overkill * 0.15;
                        score -= cost * 18;
                    } else {
                        // Popping a shield or resilience with a cheap attack is smart on Hard
                        if (p.card.shieldActive && cost <= 2) {
                            score += difficulty === 'hard' ? 190 : 90;
                        } else if (p.card.shieldActive && cost >= 4) {
                            // Don't waste a high-cost nuke on an active shield!
                            score -= difficulty === 'hard' ? 350 : 150;
                        }
                        if (p.card.abilityId === 'resilience' && !p.card.usedResilience && sim.defPvAfter === 1) {
                            score += 140 - cost * 20;
                        }
                    }

                    // 3. Deathblow splash evaluation
                    const dbTrigger = sim.abilityTriggers.find(t => t.abilityId === 'deathblow');
                    if (dbTrigger && dbTrigger.value) {
                        const hasAdjacent = [p.idx - 1, p.idx + 1].some(adj => adj >= 3 && adj <= 5 && !!engine.board[adj]);
                        if (hasAdjacent) {
                            score += difficulty === 'hard' ? 220 : 120;
                        }
                    }

                    // 4. Vampire heal bonus when AI is hurt
                    const vampTrigger = sim.abilityTriggers.find(t => t.abilityId === 'vampire');
                    if (vampTrigger?.value && engine.hp.e < 1350) {
                        score += vampTrigger.value * (engine.hp.e < 600 ? 1.5 : 0.7);
                    }

                    // 5. Self-damage / Reflect / Suicide penalty
                    if (sim.reflected && sim.reflectDamage > 0) {
                        const penaltyMult = difficulty === 'hard' ? 1.65 : 1.1;
                        score -= sim.reflectDamage * penaltyMult;
                    }
                    if (sim.atkDied) {
                        // Do not suicide unless it wins the match or trades up for a massive threat
                        if (!(sim.defDied && sim.hpDmgE >= engine.hp.p)) {
                            score -= difficulty === 'hard' ? 520 : 300;
                        }
                    }

                    // 6. Parry risk awareness on Hard difficulty
                    if (difficulty === 'hard' && (p.card.parry ?? 0) > 0 && engine.stamina.p >= cost) {
                        // Player can parry this attack if they succeed QTE; prefer lower-cost pokes or stuns first
                        score -= cost * 22;
                    }

                    // 7. Resource efficiency
                    score -= cost * 10;

                    if (!bestAttack || score > bestAttack.score) {
                        bestAttack = {
                            action: 'attack',
                            atkIdx: e.idx,
                            defIdx: p.idx,
                            attackIdx: aIdx,
                            score,
                        };
                    }
                }
            }
        }

        return bestAttack;
    }

    // ─── ENCHANTMENT CAPSULE EVALUATION ───────────────────────────────────────────────────
    private evaluateEnchantmentCapsule(
        engine: GameEngine,
        difficulty: AIDifficulty,
        attacker: { idx: number; card: Card },
        attackIdx: number,
        atkDef: AttackDef,
        allECards: { idx: number; card: Card }[],
        pCards: { idx: number; card: Card }[]
    ): CandidateMove | null {
        const enc = atkDef.enchantment;
        if (!enc) return null;

        const encDef = ENCHANTMENT_REGISTRY.find(e => e.id === enc.id);
        const targetType = encDef?.targetType || 'enemy';
        const val = enc.value || encDef?.defaultVal || 0;
        const cost = atkDef.cost || 1;

        // 1. Self-targeted enchantments
        if (targetType === 'self') {
            let score = 0;
            if ((enc.id === 'shield' || enc.id === 'shield_up') && !attacker.card.shieldActive) {
                score = 240 + attacker.card.atk * 0.35;
            } else if (enc.id === 'berserk' && !attacker.card.doubleAttack) {
                score = 290 + attacker.card.atk * 0.5;
            } else if (enc.id === 'vampirism' && !attacker.card.vampirismActive && attacker.card.pv < attacker.card.maxPv) {
                score = 210 + (attacker.card.maxPv - attacker.card.pv) * 0.4;
            } else if (enc.id === 'camo' && !attacker.card.isCamouflaged && pCards.length > 0) {
                score = 200 + attacker.card.atk * 0.3;
            } else if (enc.id === 'revive' && !attacker.card.reviveActive) {
                score = 230;
            } else if (enc.id === 'sacrifice' && attacker.card.pv > 350 && engine.stamina.e <= 2) {
                score = 220;
            }
            score -= cost * 12;
            if (score > 80) {
                return { action: 'attack', atkIdx: attacker.idx, defIdx: attacker.idx, attackIdx, score };
            }
            return null;
        }

        // 2. User / Opponent global enchantments (defIdx = -1)
        if (targetType === 'user' || targetType === 'opponent' || targetType === 'enemy_player') {
            let score = 0;
            if (enc.id === 'elixir' && engine.hp.e <= 1250) {
                score = 240 + (1500 - engine.hp.e) * 0.35;
            } else if (enc.id === 'meditate' && engine.mana.e <= 4) {
                score = 250 + (9 - engine.mana.e) * 25;
            } else if (enc.id === 'siphon' && engine.mana.p >= 2 && engine.mana.e <= 7) {
                score = 275;
            } else if (enc.id === 'recycle' && engine.aiHand.length <= 2 && engine.aiDeck.length >= 2) {
                score = 260;
            }
            score -= cost * 12;
            if (score > 80) {
                return { action: 'attack', atkIdx: attacker.idx, defIdx: -1, attackIdx, score };
            }
            return null;
        }

        // 3. Ally-targeted enchantments (heal_ally, restore, regen, blessing)
        if (targetType === 'ally') {
            let bestAlly: { idx: number; score: number } | null = null;
            for (const ally of allECards) {
                let s = 0;
                const missingPv = ally.card.maxPv - ally.card.pv;
                if ((enc.id === 'heal_ally' || enc.id === 'restore') && missingPv >= 150) {
                    s = 210 + Math.min(missingPv, val || 400) * 0.55;
                } else if (enc.id === 'regen' && !ally.card.regenTurns && missingPv >= 100) {
                    s = 195 + missingPv * 0.35;
                } else if (enc.id === 'blessing' && (ally.card.atkBonus || 0) < 400) {
                    s = 235 + ally.card.atk * 0.3;
                }
                s -= cost * 12;
                if (s > 80 && (!bestAlly || s > bestAlly.score)) {
                    bestAlly = { idx: ally.idx, score: s };
                }
            }
            if (bestAlly) {
                return { action: 'attack', atkIdx: attacker.idx, defIdx: bestAlly.idx, attackIdx, score: bestAlly.score };
            }
            return null;
        }

        // 4. Enemy-targeted offensive enchantments (bind, freeze, stun, burn, exposure, disarm, crush, drain)
        if (pCards.length > 0) {
            let bestEnemy: { idx: number; score: number } | null = null;
            for (const p of pCards) {
                if (p.card.isCamouflaged && pCards.length > 1) continue;
                let s = 0;
                const threat = p.card.atk * 0.8 + p.card.pv * 0.25;

                if ((enc.id === 'bind' || enc.id === 'freeze' || enc.id === 'stun') && !p.card.isStunned) {
                    s = 245 + threat * 0.45 + (val || 0) * 0.5;
                } else if (enc.id === 'burn' && !p.card.burnTurns) {
                    s = 205 + p.card.maxPv * 0.3;
                } else if (enc.id === 'exposure' && !p.card.isExposed) {
                    s = (difficulty === 'hard' ? 255 : 185) + p.card.pv * 0.25;
                } else if (enc.id === 'disarm' && p.card.atk >= 200) {
                    s = 230 + p.card.atk * 0.45;
                } else if (enc.id === 'crush') {
                    s = (p.card.shieldActive ? 340 : 175) + (val || 200) * 0.6;
                } else if (enc.id === 'drain') {
                    const drained = Math.min(p.card.pv, val || 300);
                    const selfMissing = attacker.card.maxPv - attacker.card.pv;
                    s = 215 + drained * 0.65 + Math.min(drained, selfMissing) * 0.45;
                }

                s -= cost * 12;
                if (s > 80 && (!bestEnemy || s > bestEnemy.score)) {
                    bestEnemy = { idx: p.idx, score: s };
                }
            }
            if (bestEnemy) {
                return { action: 'attack', atkIdx: attacker.idx, defIdx: bestEnemy.idx, attackIdx, score: bestEnemy.score };
            }
        }

        return null;
    }

    // ─── TACTICAL SACRIFICE EVALUATION (HARD MODE) ────────────────────────────────────────
    private evaluateSacrifice(
        engine: GameEngine,
        allECards: { idx: number; card: Card }[],
        pCards: { idx: number; card: Card }[],
        emptyESlots: number[]
    ): CandidateMove | null {
        if (allECards.length === 0) return null;

        // Find a severely crippled or permanently locked card (< 18% PV or stunned with low PV)
        const crippled = allECards
            .filter(x => x.card.pv <= Math.max(80, x.card.maxPv * 0.18))
            .sort((a, b) => a.card.pv - b.card.pv)[0];

        if (!crippled) return null;

        // Sacrifice is valuable if:
        // 1. All 3 AI slots are full and AI has a strong affordable card in hand, OR
        // 2. AI is out of cards in hand and needs a draw while denying the player an easy kill (which would deal 25% maxPv damage to AI HP!)
        const strongInHand = engine.aiHand.some(c => engine.mana.e >= (c.manaCost || 1) && c.atk > crippled.card.atk * 1.3);
        const playerCanEasilyKill = pCards.some(p => p.card.atk >= crippled.card.pv);

        if ((emptyESlots.length === 0 && strongInHand) || (playerCanEasilyKill && engine.aiDeck.length > 0)) {
            const savedHpDmg = Math.floor(crippled.card.maxPv * 0.25);
            return {
                action: 'sacrifice',
                atkIdx: crippled.idx,
                defIdx: crippled.idx,
                score: 235 + savedHpDmg * 0.6,
            };
        }

        return null;
    }

    // ─── DRAW EVALUATION ──────────────────────────────────────────────────────────────────
    private evaluateDraw(
        engine: GameEngine,
        difficulty: AIDifficulty,
        eCards: { idx: number; card: Card }[],
        emptyESlots: number[]
    ): CandidateMove | null {
        if (engine.aiDeck.length === 0 || engine.aiHand.length >= 6) return null;

        const hasPlayableInHand = engine.aiHand.some(c => engine.mana.e >= (c.manaCost || 1));

        // High priority to draw if hand is empty and AI needs cards
        if (engine.aiHand.length === 0) {
            return {
                action: 'draw',
                score: eCards.length === 0 ? 450 : 165,
            };
        }

        // If AI has open board slots but no affordable card in hand, drawing is a good fallback
        if (!hasPlayableInHand && emptyESlots.length > 0) {
            return {
                action: 'draw',
                score: eCards.length === 0 ? 310 : 120,
            };
        }

        // On Hard/Medium, if AI has no valid attacks or plays, draw to build hand advantage
        if (difficulty !== 'easy' && engine.aiHand.length <= 2) {
            return {
                action: 'draw',
                score: 95,
            };
        }

        return null;
    }

    private getCardPeakDamage(card: Card): number {
        let peak = card.atk || 100;
        if (Array.isArray(card.attacks)) {
            for (const a of card.attacks) {
                if ((a.damage || 0) > peak) peak = a.damage!;
            }
        }
        if (card.specialAttack && (card.specialAttack.damage || 0) > peak) {
            peak = card.specialAttack.damage;
        }
        return peak;
    }
}
