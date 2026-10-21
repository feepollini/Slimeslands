/**
 * GameEngine.ts — State orchestrator.
 * Delegates all combat math to CombatEngine.
 */

import type { Card, Skill, GameState, AttackResult } from './types';
import { SKILL_POOL, CARD_TEMPLATES, RARITY_POOL, ABILITY_POOL } from './constants';
import { computeAttack, computeSkill, healingCardTick } from './CombatEngine';
import { getMergedGameTemplatesSync } from '../ui/screens/forge_v2/utils/HestridiaMatrixRenderer';

export type { Card, Skill, GameState };
export { SKILL_POOL };

export class GameEngine {
    public board: (Card | null)[] = Array(6).fill(null);
    public hand: Card[] = [];
    public aiHand: Card[] = [];
    public deck: Card[] = [];
    public aiDeck: Card[] = [];
    public grave: Card[] = [];
    public activeSkills: (Skill | null)[] = Array(3).fill(null);
    public aiSkills: (Skill | null)[] = Array(3).fill(null);
    public selectedSkills: Skill[] = [];
    public inventory: Skill[] = [];
    public hp = { p: 1500, e: 1500 };
    public mana = { p: 9, e: 9 };
    public maxMana = 9;
    public stamina = { p: 9, e: 9 };
    public maxStamina = 9;
    public turn: 'p' | 'e' = 'p';
    public state: GameState = 'menu';
    public actionsLeft = 1;
    /** Next attack multiplier from combo (resets after one attack) */
    public nextAtkCombo = 1.0;
    /** Offensive skills used this turn (for combo detection) */
    private offensiveUsedThisTurn = 0;
    
    public stats = { turns: 0, cardsPlayed: 0, attacksMade: 0 };

    constructor() { }

    // ─── INIT ────────────────────────────────────────────────────────────────

    public initBattle(pDeck?: Card[]) {
        this.hp = { p: 1500, e: 1500 };
        this.mana = { p: 9, e: 9 };
        this.stamina = { p: 9, e: 9 };
        this.board = Array(6).fill(null);
        this.hand = [];
        this.aiHand = [];
        this.grave = [];
        this.deck = pDeck && pDeck.length > 0 ? pDeck : this.generateDeck('p', 12);
        this.aiDeck = this.generateDeck('e', 12);
        this.inventory = SKILL_POOL.filter(s => !this.selectedSkills.find(ss => ss.id === s.id));
        this.activeSkills = [
            this.selectedSkills[0] ?? null,
            this.selectedSkills[1] ?? null,
            this.selectedSkills[2] ?? null,
        ];
        const shuffledAiSkills = [...SKILL_POOL].sort(() => Math.random() - 0.5);
        this.aiSkills = [
            shuffledAiSkills[0] ? { ...shuffledAiSkills[0] } : null,
            shuffledAiSkills[1] ? { ...shuffledAiSkills[1] } : null,
            shuffledAiSkills[2] ? { ...shuffledAiSkills[2] } : null,
        ];
        this.turn = 'p';
        this.actionsLeft = 1;
        this.nextAtkCombo = 1.0;
        this.offensiveUsedThisTurn = 0;
        this.stats = { turns: 0, cardsPlayed: 0, attacksMade: 0 };
        this.state = 'battle';
        for (let i = 0; i < 3; i++) this.draw();
        for (let i = 0; i < 3; i++) {
            const aiCard = this.drawAI();
            if (aiCard) this.aiHand.push(aiCard);
        }
    }

    public generateDeck(owner: 'p' | 'e' = 'p', count: number = 30): Card[] {
        const pool = getMergedGameTemplatesSync([]);

        let chosenTemplates: any[] = [];
        if (owner === 'p') {
            try {
                const rawPre = typeof localStorage !== 'undefined' ? localStorage.getItem('arsenal_predeck') : null;
                if (rawPre) {
                    const preData = JSON.parse(rawPre);
                    if (Array.isArray(preData?.cards)) {
                        const validNames = preData.cards.filter((n: any) => typeof n === 'string' && n.trim().length > 0);
                        if (validNames.length > 0) {
                            chosenTemplates = validNames
                                .map((name: string) => pool.find((t: any) => t.name === name || t.title === name || t.id === name))
                                .filter(Boolean);
                        }
                    }
                }
                if (chosenTemplates.length === 0 && typeof localStorage !== 'undefined') {
                    for (const slotKey of ['arsenal_slot_0', 'arsenal_slot_1', 'arsenal_slot_2']) {
                        const rawSlot = localStorage.getItem(slotKey);
                        if (!rawSlot) continue;
                        const slotData = JSON.parse(rawSlot);
                        if (Array.isArray(slotData?.cards)) {
                            const validNames = slotData.cards.filter((n: any) => typeof n === 'string' && n.trim().length > 0);
                            if (validNames.length > 0) {
                                chosenTemplates = validNames
                                    .map((name: string) => pool.find((t: any) => t.name === name || t.title === name || t.id === name))
                                    .filter(Boolean);
                                if (chosenTemplates.length > 0) break;
                            }
                        }
                    }
                }
            } catch (_) {}
        }

        if (chosenTemplates.length === 0 && pool.length > 0) {
            chosenTemplates = Array.from({ length: count }, () => pool[Math.floor(Math.random() * pool.length)]);
        }

        return chosenTemplates.filter(Boolean).map((tmpl: any, i: number) => {
            const rarity = tmpl.preferredRarity || tmpl.rarity || RARITY_POOL[Math.floor(Math.random() * RARITY_POOL.length)];
            const abilityPool = rarity === 'common'
                ? ['none']
                : ABILITY_POOL.filter(id => id !== 'none');
            const abilityId = tmpl.abilityId || (abilityPool[Math.floor(Math.random() * abilityPool.length)] as Card['abilityId']);

            let pv = tmpl.basePv || tmpl.pv || 0;
            let atk = tmpl.baseAtk || tmpl.atk || 0;
            let playCost = tmpl.manaCost || tmpl.staminaCost || 0;
            let atkCount = 1;
            let atkCost = tmpl.staminaCost || 1;
            const step = 10;

            if (!pv || !atk) {
                if (rarity === 'common') {
                    pv = pv || (Math.floor(Math.random() * (500 / step)) * step + step);
                    atk = atk || (Math.floor(Math.random() * (500 / step)) * step + step);
                    playCost = playCost || (Math.floor(Math.random() * 3) + 1);
                    atkCount = 1;
                    atkCost = Math.floor(Math.random() * 3) + 1;
                } else if (rarity === 'rare') {
                    pv = pv || (Math.floor(Math.random() * (500 / step)) * step + 510);
                    atk = atk || (Math.floor(Math.random() * (500 / step)) * step + 510);
                    playCost = playCost || (Math.floor(Math.random() * 4) + 3);
                    atkCount = 2;
                    atkCost = Math.floor(Math.random() * 4) + 3;
                } else {
                    pv = pv || (Math.floor(Math.random() * (500 / step)) * step + 1010);
                    atk = atk || (Math.floor(Math.random() * (500 / step)) * step + 1010);
                    playCost = playCost || (Math.floor(Math.random() * 4) + 6);
                    atkCount = 4;
                    atkCost = Math.floor(Math.random() * 4) + 6;
                }
            } else if (!playCost) {
                playCost = rarity === 'legendary' || rarity === 'epic' ? 3 : rarity === 'rare' ? 2 : 1;
            }

            let attacks: import('./types').AttackDef[] = [];
            if (Array.isArray(tmpl.attacks) && tmpl.attacks.length > 0) {
                attacks = JSON.parse(JSON.stringify(tmpl.attacks));
            } else {
                for (let j = 0; j < atkCount; j++) {
                    attacks.push({
                        type: 'damage',
                        name: j === 0 ? 'ATAQUE' : (j === 1 ? 'ESPECIAL' : (j === 2 ? 'SUPREMO' : 'EXECUÇÃO')),
                        damage: Math.floor(atk * (1 + j * 0.2)),
                        cost: atkCost,
                        costType: (j % 2 === 0) ? 'stamina' : 'mana'
                    });
                }
            }

            return {
                ...tmpl,
                id: `card-${owner}-${i}-${Math.random().toString(36).substr(2, 5)}`,
                name: tmpl.name || tmpl.title || `Carta ${i + 1}`,
                atk, pv, maxPv: pv,
                image: tmpl.image || tmpl.imageUrl || '/cards/03_toxico.png',
                animationUrl: tmpl.animationUrl || tmpl.videoUrl,
                cardBack: tmpl.cardBack || tmpl.backImageUrl,
                rarity, abilityId, owner,
                manaCost: tmpl.manaCost ?? playCost,
                staminaCost: tmpl.staminaCost ?? playCost,
                attacks,
                specialAttack: tmpl.specialAttack ? JSON.parse(JSON.stringify(tmpl.specialAttack)) : undefined,
                videoStart: tmpl.videoStart, videoEnd: tmpl.videoEnd,
                flavorText: tmpl.flavorText || tmpl.loreBody, immersiveMode: tmpl.immersiveMode,
                nameStyle: tmpl.nameStyle, descStyle: tmpl.descStyle, 
                abilityStyle: tmpl.abilityStyle, statsStyle: tmpl.statsStyle,
                borderColor: tmpl.borderColor, borderWidth: tmpl.borderWidth,
                glowColor: tmpl.glowColor, glowIntensity: tmpl.glowIntensity,
                glowAnimated: tmpl.glowAnimated, borderRadius: tmpl.borderRadius,
                fontFamily: tmpl.fontFamily, fontColor: tmpl.fontColor,
                fontSizeBase: tmpl.fontSizeBase, hasVideoAttack: tmpl.hasVideoAttack,
                matrixCard: tmpl.matrixCard || tmpl.cardData,
            };
        });
    }

    // ─── DRAW ────────────────────────────────────────────────────────────────
    
    // Legacy generic draw (doesn't consume action)
    public draw(): boolean {
        if (this.hand.length < 7 && this.deck.length > 0) {
            this.hand.push(this.deck.pop()!);
            return true;
        }
        return false;
    }

    // Action-consuming draw for Player
    public drawAndConsumeAction(): boolean {
        if (this.actionsLeft <= 0) return false;
        if (this.hand.length < 7 && this.deck.length > 0) {
            this.hand.push(this.deck.pop()!);
            this.actionsLeft--;
            return true;
        }
        return false;
    }

    // Legacy generic AI draw (used by GameAI to check playability)
    public drawAI(): Card | null {
        return this.aiDeck.length > 0 ? this.aiDeck.pop()! : null;
    }

    // Action-consuming draw for AI (actually draws to hidden aiHand)
    public drawAIAndConsumeAction(): boolean {
        if (this.actionsLeft <= 0) return false;
        if (this.aiDeck.length > 0) {
            this.aiHand.push(this.aiDeck.pop()!);
            this.actionsLeft--;
            return true;
        }
        return false;
    }

    // ─── PLAYER ACTIONS ──────────────────────────────────────────────────────

    /** Play card from hand to board (Player) or directly (AI) */
    public playCard(idx: number, cardId: string, isAI: boolean = false): boolean {
        if (this.actionsLeft <= 0) return false;
        
        const owner = isAI ? 'e' : 'p';
        // Validate slot range
        if (isAI && (idx < 0 || idx > 2)) return false;
        if (!isAI && (idx < 3 || idx > 5)) return false;
        if (this.board[idx]) return false;

        let card: Card | undefined;
        if (isAI) {
            const hIdx = this.aiHand.findIndex(c => c.id === cardId);
            if (hIdx === -1) {
                // Compatibility with legacy logic: if not in hand, try to take top of deck if allowed
                // (Though ideally AI should only play from aiHand now)
                card = this.aiDeck.pop();
            } else {
                card = this.aiHand.splice(hIdx, 1)[0];
            }
        } else {
            const hIdx = this.hand.findIndex(c => c.id === cardId);
            if (hIdx === -1) return false;
            card = this.hand[hIdx];
            this.hand.splice(hIdx, 1);
        }

        if (!card) return false;

        const cost = card.manaCost || 1;
        if (this.mana[owner] < cost) {
            // Revert if failed
            if (!isAI) { this.hand.push(card); }
            else { this.aiDeck.push(card); }
            return false;
        }

        this.mana[owner] -= cost;
        card.owner = owner;
        this.board[idx] = card;
        this.actionsLeft--;
        if (owner === 'p') this.stats.cardsPlayed++;
        this.tryTriggerPlayAbilities(idx);
        return true;
    }

    /** Trigger on-play abilities like mass_flip */
    public tryTriggerPlayAbilities(idx: number): void {
        const card = this.board[idx];
        if (!card) return;

        if (card.abilityId === 'mass_flip') {
            const targets = card.owner === 'p' ? [0, 1, 2] : [3, 4, 5];
            targets.forEach(i => {
                const target = this.board[i];
                if (target) {
                    target.isFlipped = true;
                }
            });
        }
    }

    /** Sacrifice: draw 1 card as strategic resource. Costs 1 action. */
    public sacrifice(idx: number, isAI: boolean = false): boolean {
        const expectedOwner = isAI ? 'e' : 'p';
        if (this.turn !== expectedOwner || this.actionsLeft <= 0) return false;
        const card = this.board[idx];
        if (!card || card.owner !== expectedOwner) return false;
        this.grave.push(card);
        this.board[idx] = null;
        if (isAI) {
            if (this.aiDeck.length > 0 && this.aiHand.length < 7) {
                this.aiHand.push(this.aiDeck.pop()!);
            }
        } else {
            this.draw(); // Resource gain
        }
        this.actionsLeft--;
        return true;
    }

    /** Use skill. Applies result from CombatEngine to state. */
    public useSkill(skillIdx: number, targetIdx?: number, isAI: boolean = false): { success: boolean; message: string; comboMessage?: string } {
        if (this.actionsLeft <= 0) return { success: false, message: '⛔ Sem ações restantes!' };
        const skillSlots = isAI ? this.aiSkills : this.activeSkills;
        const skill = skillSlots[skillIdx];
        if (!skill) return { success: false, message: 'Slot vazio!' };

        const owner = isAI ? 'e' : 'p';
        const mCost = skill.manaCost || 0;
        const sCost = skill.staminaCost || 0;

        if (this.mana[owner] < mCost || this.stamina[owner] < sCost) {
            return { success: false, message: 'Recursos insuficientes!' };
        }

        const target = targetIdx !== undefined ? this.board[targetIdx] : null;
        const result = computeSkill({
            skill, target, ownHp: this.hp[owner], maxHp: 1500,
            offensiveUsed: this.offensiveUsedThisTurn,
        });

        if (!result.success) return { success: false, message: result.message };

        // Deduct resources
        this.mana[owner] -= mCost;
        this.stamina[owner] -= sCost;

        if (result.flipTarget && target) target.isFlipped = true;
        if (result.shieldTarget && target) target.shieldActive = true;
        if (result.poisonTarget && target) target.poisonTurns = 3;
        if (result.stunTarget && target) { target.isStunned = true; target.stunTurns = 1; }

        if (result.targetPvDelta && target) target.pv += result.targetPvDelta;

        if (result.targetDies && target && targetIdx !== undefined) {
            const victimOwner = target.owner;
            if (victimOwner) this.hp[victimOwner] = Math.max(0, this.hp[victimOwner] - Math.floor(target.maxPv * 0.25));
            this.grave.push(target);
            this.board[targetIdx] = null;
        }

        if (result.casterHpDelta) this.hp[owner] = Math.min(1500, Math.max(0, this.hp[owner] + result.casterHpDelta));
        
        // Draw logic for AI vs Player
        for (let i = 0; i < result.drawCount; i++) {
            if (isAI) {
                if (this.aiDeck.length > 0 && this.aiHand.length < 7) {
                    this.aiHand.push(this.aiDeck.pop()!);
                }
            } else {
                this.draw();
            }
        }

        if (result.divineAction) {
            this.actionsLeft = 2; // Extra action
        } else {
            this.actionsLeft--;
            if (skill.group === 'offensive') this.offensiveUsedThisTurn++;
        }

        // Store combo for next attack
        if (result.comboBonus) this.nextAtkCombo = result.comboBonus;

        skillSlots[skillIdx] = null;
        return { success: true, message: result.message, comboMessage: result.comboMessage };
    }

    // ─── COMBAT ──────────────────────────────────────────────────────────────

    /**
     * Resolves attack. Returns AttackResult for animation layer.
     * Applies all deltas to board and hp.
     */
    public resolveAttack(atkIdx: number, defIdx: number, parried: boolean = false, attackIdx: number = 0): AttackResult {
        const atk = this.board[atkIdx];
        const def = this.board[defIdx];
        const owner = atk?.owner;

        if (owner === 'p') this.stats.attacksMade++;

        const noOp: AttackResult = {
            damage: 0, defPvAfter: def?.pv ?? 0, atkPvAfter: atk?.pv ?? 0,
            defDied: false, atkDied: false, reflected: false, reflectDamage: 0,
            hpDmgE: 0, hpDmgP: 0, revealed: false, typeBonus: false,
            abilityTriggers: [],
        };
        if (!atk || !owner) return noOp;

        // Determine attack definition: index 99 = specialAttack, else from attacks array
        const atkDef = attackIdx === 99 && atk.specialAttack
            ? { ...atk.specialAttack } as import('./types').AttackDef
            : (atk.attacks && atk.attacks[attackIdx]) ? atk.attacks[attackIdx] : undefined;
        const cost = atkDef ? atkDef.cost : (atk.staminaCost || 1);
        const costType = atkDef ? atkDef.costType : 'stamina';

        // Resource Check
        if ((this as any)[costType][owner] < cost) return noOp;

        // Stamina penalty for defender (Parry Cost Rule)
        const defSide = (owner === 'p') ? 'e' : 'p';
        if (parried) {
            // "o custo de parry... é igual ao custo que o oponente usou pra atacar em estamina"
            this.stamina[defSide] = Math.max(0, this.stamina[defSide] - cost);
        }

        // Consume
        (this as any)[costType][owner] = Math.max(0, (this as any)[costType][owner] - cost);

        // Combo Logic
        const origAtk = atk.atk;
        if (this.nextAtkCombo > 1.0) {
            atk.atk = Math.round(atk.atk * this.nextAtkCombo);
            this.nextAtkCombo = 1.0;
        }

        const result = computeAttack(atk, def, defIdx, this.hp, atkDef);
        
        // PARRY Logic: Redirect damage to attacker
        if (parried) {
            result.reflected = true;
            result.reflectDamage = result.damage;
            result.damage = 0;
            result.defPvAfter = def?.pv ?? 0;
            result.defDied = false;
            result.hpDmgP = 0; // Cancel player HP penalty from def death

            result.atkPvAfter = Math.max(0, atk.pv - result.reflectDamage);
            if (result.atkPvAfter <= 0) {
                result.atkDied = true;
                // If it was attacking a player slot, the attacker's death damages enemy HP
                result.hpDmgE = Math.floor(atk.maxPv * 0.25); 
            }
        }

        // Restore original ATK (mutated temporarily for combo)
        atk.atk = origAtk;

        // Fill in the real atkIdx for triggers (CombatEngine uses -1 as placeholder)
        result.abilityTriggers = result.abilityTriggers.map(t => ({
            ...t,
            cardIdx: t.cardIdx === -1 ? atkIdx : t.cardIdx,
        }));

        // Apply to defender
        if (def && !result.defDied) {
            def.pv = result.defPvAfter;
            // Mark resilience as used
            if (def.abilityId === 'resilience' && result.defPvAfter === 1) def.usedResilience = true;
        }
        if (def && result.defDied) {
            const victim = def.owner;
            if (victim) this.hp[victim] = Math.max(0, this.hp[victim] - result.hpDmgE);
            this.grave.push(def);
            this.board[defIdx] = null;
        }

        // Deathblow: hit adjacent card and record target for animation
        const dbTrigger = result.abilityTriggers.find(t => t.abilityId === 'deathblow');
        if (dbTrigger && dbTrigger.value !== undefined && !result.deathblowTarget) {
            const adjacent = [defIdx - 1, defIdx + 1].find(i => i >= 0 && i <= 2 && this.board[i]);
            if (adjacent !== undefined && this.board[adjacent]) {
                const adjCard = this.board[adjacent]!;
                adjCard.pv -= dbTrigger.value;
                if (adjCard.pv <= 0) {
                    this.hp.e = Math.max(0, this.hp.e - Math.floor(adjCard.maxPv * 0.25));
                    this.grave.push(adjCard);
                    this.board[adjacent] = null;
                }
                result.deathblowTarget = { idx: adjacent, dmg: dbTrigger.value };
            }
        }

        // Apply to attacker
        if (result.reflected && !result.atkDied) atk.pv = result.atkPvAfter;
        if (result.atkDied) {
            this.hp[owner] = Math.max(0, this.hp[owner] - result.hpDmgP);
            this.grave.push(atk);
            this.board[atkIdx] = null;
        }

        // Vampire heal
        const vampTrigger = result.abilityTriggers.find(t => t.abilityId === 'vampire');
        if (vampTrigger?.value) this.hp[owner] = Math.min(1500, this.hp[owner] + vampTrigger.value);

        // ── Enchantment Effects ──────────────────────────────────────────────
        result.abilityTriggers.forEach(t => {
            this.applyEnchantment(t, owner, atkIdx);
        });

        // Direct HP (empty slot) - Defender is null and index is for opponent
        if (!def) {
            const victim = (owner === 'p') ? 'e' : 'p';
            if (result.hpDmgE > 0 || result.hpDmgP > 0) {
               const dmg = (owner === 'p') ? result.hpDmgE : result.hpDmgP;
               this.hp[victim] = Math.max(0, this.hp[victim] - dmg);
            }
        }

        this.actionsLeft--;
        return result;
    }

    // ─── STATUS TICKS ────────────────────────────────────────────────────────

    private processStatusTicks(owner: 'p' | 'e') {
        this.board.forEach((card, idx) => {
            if (!card || card.owner !== owner) return;
            // Healing
            const heal = healingCardTick(card);
            if (heal > 0) card.pv = Math.min(card.maxPv, card.pv + heal);
            // Phantom: flip face-down if pendingPhantom
            if (card.pendingPhantom) { card.isFlipped = true; card.pendingPhantom = false; }
            // Poison
            if (card.poisonTurns && card.poisonTurns > 0) {
                card.pv -= 50;
                card.poisonTurns--;
                if (card.pv <= 0) {
                    this.hp[owner] = Math.max(0, this.hp[owner] - Math.floor(card.maxPv * 0.15));
                    this.grave.push(card);
                    this.board[idx] = null;
                }
            }
            // Burn (Enchantment)
            if (card.burnTurns && card.burnTurns > 0) {
                const burnDmg = Math.floor(card.maxPv * 0.1); // 10% max PV
                card.pv -= burnDmg;
                card.burnTurns--;
                if (card.pv <= 0) {
                    this.hp[owner] = Math.max(0, this.hp[owner] - Math.floor(card.maxPv * 0.15));
                    this.grave.push(card);
                    this.board[idx] = null;
                }
            }
            // Regen (Enchantment)
            if (card.regenTurns && card.regenTurns > 0) {
                card.pv = Math.min(card.maxPv, card.pv + 150);
                card.regenTurns--;
            }
            // Camouflage expiry
            if (card.isCamouflaged) {
                card.camoTurns = (card.camoTurns || 1) - 1;
                if (card.camoTurns <= 0) {
                    card.isCamouflaged = false;
                    delete card.camoTurns;
                }
            }
            // Exposure expiry
            if (card.isExposed) {
                card.exposeTurns = (card.exposeTurns || 2) - 1;
                if (card.exposeTurns <= 0) {
                    card.isExposed = false;
                    delete card.exposeTurns;
                    delete card.exposeValue;
                }
            }
            // Double Attack expiry
            if (card.doubleAttack) {
                card.doubleAttackTurns = (card.doubleAttackTurns || 1) - 1;
                if (card.doubleAttackTurns <= 0) {
                    card.doubleAttack = false;
                    delete card.doubleAttackTurns;
                }
            }
            // Stun countdown
            if (card.isStunned && card.stunTurns !== undefined) {
                card.stunTurns--;
                if (card.stunTurns <= 0) { card.isStunned = false; delete card.stunTurns; }
            }
            // Phantom: queue flip for next turn
            if (card.abilityId === 'phantom' && !card.isFlipped) {
                card.pendingPhantom = true;
            }
        });
    }

    public endTurn() {
        this.processStatusTicks(this.turn);
        this.turn = this.turn === 'p' ? 'e' : 'p';
        if (this.turn === 'p') this.stats.turns++;
        
        // Replenish 2 mana and 2 stamina per turn
        this.mana[this.turn] = Math.min(this.maxMana, this.mana[this.turn] + 2);
        this.stamina[this.turn] = Math.min(this.maxStamina, this.stamina[this.turn] + 2);
        
        this.actionsLeft = 1;
        this.offensiveUsedThisTurn = 0;
        this.nextAtkCombo = 1.0;
    }

    // ─── AI ──────────────────────────────────────────────────────────────────

    public aiTurn(): { action: string; atkIdx?: number; defIdx?: number; cardToPlay?: Card } {
        const eCards = [0, 1, 2]
            .map(i => ({ idx: i, card: this.board[i] }))
            .filter(x => x.card && !x.card.isStunned && !x.card.isFlipped);
        const pCards = [3, 4, 5]
            .map(i => ({ idx: i, card: this.board[i] }))
            .filter(x => x.card);

        // 1. Lethal
        for (const e of eCards) {
            for (const p of pCards) {
                const sim = computeAttack(e.card!, p.card!, p.idx, this.hp);
                if (sim.defDied) return { action: 'attack', atkIdx: e.idx, defIdx: p.idx };
            }
        }

        // 2. Direct HP
        if (eCards.length > 0 && pCards.length === 0) {
            const emptyPSlot = [3, 4, 5].find(i => !this.board[i]);
            if (emptyPSlot !== undefined) return { action: 'attack', atkIdx: eCards[0].idx, defIdx: emptyPSlot };
        }

        // 3. Best-value attack
        if (eCards.length > 0 && pCards.length > 0) {
            let bestScore = -Infinity;
            let bestAtk = eCards[0].idx, bestDef = pCards[0].idx;
            for (const e of eCards) {
                for (const p of pCards) {
                    const sim = computeAttack(e.card!, p.card!, p.idx, this.hp);
                    const taken = sim.reflected ? (e.card!.pv - sim.atkPvAfter) : 0;
                    const score = sim.damage - taken * 0.5;
                    if (score > bestScore) { bestScore = score; bestAtk = e.idx; bestDef = p.idx; }
                }
            }
            return { action: 'attack', atkIdx: bestAtk, defIdx: bestDef };
        }

        // 4. Place card
        const emptyESlot = [0, 1, 2].find(i => !this.board[i]);
        if (emptyESlot !== undefined) {
            const aiCard = this.drawAI();
            if (aiCard) { aiCard.owner = 'e'; return { action: 'play', defIdx: emptyESlot, cardToPlay: aiCard }; }
        }

        return { action: 'end' };
    }

    // ── Enchantment Helpers ────────────────────────────────────────────────
    private applyEnchantment(trigger: import('./types').AbilityTriggered, owner: 'p' | 'e', atkIdx: number) {
        let targetIdx = trigger.cardIdx;
        if (targetIdx === -2) targetIdx = atkIdx; 
        
        const target = (targetIdx >= 0) ? this.board[targetIdx] : null;
        const attacker = this.board[atkIdx];
        const opponent = owner === 'p' ? 'e' : 'p';

        switch (trigger.abilityId) {
            // OFFENSIVE
            case 'bind': case 'freeze':
                if (target) {
                    target.isStunned = true;
                    target.stunTurns = (target.stunTurns || 0) + (trigger.turns || 1);
                    if (trigger.value) target.pv -= trigger.value; // Freeze damage
                }
                break;
            case 'burn':
                if (target) {
                    target.burnTurns = (target.burnTurns || 0) + (trigger.turns || 3);
                    target.burnValue = trigger.value || 10;
                }
                break;
            case 'exposure':
                if (target) {
                    target.isExposed = true; // Needs to be handled in CombatEngine
                    target.exposeTurns = (target.exposeTurns || 0) + (trigger.turns || 2);
                    target.exposeValue = trigger.value || 40;
                }
                break;
            case 'disarm':
                if (target) {
                    target.atk = Math.max(0, target.atk - (target.atk * (trigger.value || 50) / 100));
                }
                break;
            case 'crush':
                if (target) {
                    target.shieldActive = false;
                    target.pv -= (trigger.value || 200);
                }
                break;

            // HEAL
            case 'heal_ally': case 'restore':
                if (target) target.pv = Math.min(target.maxPv, target.pv + (trigger.value || 500));
                break;
            case 'elixir':
                this.hp[owner] = Math.min(1500, this.hp[owner] + (trigger.value || 200));
                break;
            case 'drain':
                if (target && attacker) {
                    const stol = Math.min(target.pv, trigger.value || 300);
                    target.pv -= stol;
                    attacker.pv = Math.min(attacker.maxPv, attacker.pv + stol);
                }
                break;
            case 'regen':
                if (target) {
                    target.regenTurns = (target.regenTurns || 0) + (trigger.turns || 3);
                    target.regenValue = trigger.value || 150;
                }
                break;
            case 'revive':
                if (attacker) attacker.reviveActive = true; 
                break;

            // SUPPORT
            case 'shield': case 'shield_up':
                if (attacker) attacker.shieldActive = true;
                break;
            case 'vampirism':
                if (attacker) attacker.vampirismActive = true;
                break;
            case 'berserk':
                if (attacker) {
                    attacker.doubleAttack = true;
                    attacker.doubleAttackTurns = (trigger.turns || 1);
                }
                break;
            case 'blessing':
                if (target) {
                    target.atk += (trigger.value || 200);
                    target.atkBonus = (target.atkBonus || 0) + (trigger.value || 200);
                }
                break;
            case 'camo':
                if (attacker) {
                    attacker.isCamouflaged = true;
                    attacker.camoTurns = (trigger.turns || 1);
                }
                break;

            // UTILITY
            case 'siphon':
                const stolM = Math.min(this.mana[opponent], trigger.value || 2);
                this.mana[opponent] -= stolM;
                this.mana[owner] = Math.min(this.maxMana, this.mana[owner] + stolM);
                break;
            case 'meditate':
                this.mana[owner] = Math.min(this.maxMana, this.mana[owner] + (trigger.value || 4));
                break;
            case 'sacrifice':
                if (attacker) {
                    attacker.pv -= 200;
                    this.stamina[owner] = Math.min(this.maxStamina, this.stamina[owner] + 5);
                }
                break;
            case 'reveal':
                if (target) target.isRevealed = true;
                break;
            case 'recycle':
                if (owner === 'p') {
                    this.draw();
                    this.draw();
                } else {
                    this.drawAIAndConsumeAction();
                    this.drawAIAndConsumeAction();
                }
                break;
        }
    }
}
