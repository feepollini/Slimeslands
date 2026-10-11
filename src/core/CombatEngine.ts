/**
 * CombatEngine.ts — Pure combat functions. Zero side effects.
 * All ability logic is computed here and returned as data.
 * GameEngine applies results to board/hp state.
 */

import type { Card, AttackResult, Skill, AbilityTriggered, AttackDef } from './types';
import { CARD_ABILITIES } from './constants';
import { ENCHANTMENT_REGISTRY } from './enchantments';

// ─── ABILITY HELPERS ─────────────────────────────────────────────────────────

export function getAbilityDef(id: string) {
    return CARD_ABILITIES.find(a => a.id === id);
}

// ─── CORE ATTACK COMPUTATION ─────────────────────────────────────────────────

/**
 * Full attack result, pure. No mutations.
 */
export function computeAttack(
    atk: Card,
    def: Card | null,
    defIdx: number,
    _hp: { p: number; e: number },
    atkDef?: AttackDef
): AttackResult {
    const isDamage = !atkDef || atkDef.type === 'damage';
    const baseAtk = isDamage ? (atkDef?.damage || atk.atk) : 0;
    const triggers: AbilityTriggered[] = [];
    const atkIdx = -1; // placeholder — GameEngine knows the real idx

    // ── Enchantment Specific Logic ───────────────────────────────────────────
    if (atkDef && atkDef.type === 'enchantment' && atkDef.enchantment) {
        const encId = atkDef.enchantment.id;
        const val = atkDef.enchantment.value;
        const turns = atkDef.enchantment.turns;

        const encDef = ENCHANTMENT_REGISTRY.find(e => e.id === encId);
        let abilityId: import('./types').CardAbilityId = encId as any;
        let targetIdx = defIdx;

        if (encDef) {
            if (encDef.targetType === 'self') targetIdx = -2; // Special marker for attacker
            if (encDef.targetType === 'user' || encDef.targetType === 'opponent' || encDef.targetType === 'enemy_player') targetIdx = -1; 
        }

        triggers.push({
            abilityId,
            cardIdx: targetIdx,
            value: val,
            turns: turns
        });
    }

    const zero: AttackResult = {
        damage: 0, defPvAfter: def?.pv ?? 0, atkPvAfter: atk.pv,
        defDied: false, atkDied: false, reflected: false, reflectDamage: 0,
        hpDmgE: 0, hpDmgP: 0, revealed: false, typeBonus: false,
        abilityTriggers: [],
    };

    // ── Guard: stunned or flipped attacker can't act ─────────────────────────
    if (atk.isStunned || atk.isFlipped) return zero;

    // ── Empty slot direct attack ──────────────────────────────────────────────
    if (!def) {
        if (defIdx < 3) { // Targeting Enemy Slots
            return { ...zero, damage: baseAtk, hpDmgE: baseAtk };
        } else { // Targeting Player Slots
            return { ...zero, damage: baseAtk, hpDmgP: baseAtk };
        }
    }

    // ── Reveal if flipped ─────────────────────────────────────────────────────
    const revealed = !!def.isFlipped;

    // ── Shield absorb (face-up only) ──────────────────────────────────────────
    const isHitKill = atk.abilityId === 'hit_kill';
    if (def.shieldActive && !def.isFlipped && !isHitKill) {
        return { ...zero, defPvAfter: def.pv, atkPvAfter: atk.pv };
    }

    // ── Rivalry ability ───────────────────────────────────────────────────────
    const hasRivalry = atk.abilityId === 'rivalry' && atk.name === def.name;
    const rivalryMult = hasRivalry ? 1.4 : 1.0;

    // ── Calculate raw damage ─────────────────────────────────────────────────
    let damage = Math.floor(baseAtk * rivalryMult);

    if (def.isExposed) {
        damage = Math.floor(damage * (1 + (def.exposeValue || 40) / 100));
    }

    if (isHitKill) {
        damage = def.pv; // Forces fatal blow
        triggers.push({ abilityId: 'hit_kill', cardIdx: atkIdx });
    } else if (atk.abilityId === 'absorb_50') {
        const drain = Math.floor(def.pv * 0.5);
        damage += drain; // Attack deals +50% of target's current HP
        triggers.push({ abilityId: 'absorb_50', cardIdx: atkIdx, value: drain });
    }

    let defPvAfter = def.pv - damage;
    let atkPvAfter = atk.pv;
    let reflected = false;
    let reflectDamage = 0;
    let hpDmgE = 0;
    let hpDmgP = 0;
    let defDied = false;
    let atkDied = false;

    if (hasRivalry) {
        triggers.push({ abilityId: 'rivalry', cardIdx: atkIdx, value: damage });
    }

    // Heals from Absorb_50
    if (atk.abilityId === 'absorb_50') {
        const drain = Math.floor(def.pv * 0.5);
        atkPvAfter = Math.min(atk.maxPv, atkPvAfter + drain);
    }

    // ── Resilience: survive killing blow (1 PV, 1× per battle) ──────────────
    if (defPvAfter <= 0 && def.abilityId === 'resilience' && !def.usedResilience) {
        defPvAfter = 1;
        triggers.push({ abilityId: 'resilience', cardIdx: defIdx });
        // defDied remains false — GameEngine marks usedResilience = true
    }

    // ── Reflect ability (50%, even on death) ─────────────────────────────────
    if (def.abilityId === 'reflect') {
        reflected = true;
        reflectDamage = Math.floor(damage * 0.5);
        atkPvAfter -= reflectDamage;
        triggers.push({ abilityId: 'reflect', cardIdx: defIdx, value: reflectDamage });
    } else if (defPvAfter > 0 && atk.pv >= def.pv) {
        // Standard counter: 40% of def.atk, only when defender survives and attacker PV >= def PV
        reflected = true;
        reflectDamage = Math.floor(def.atk * 0.4);
        atkPvAfter -= reflectDamage;
    }

    // ── Defender death resolution ─────────────────────────────────────────────
    if (defPvAfter <= 0) {
        const overflow = Math.abs(defPvAfter);
        const overflowDmg = Math.min(Math.floor(overflow * 0.3), Math.floor(def.maxPv * 0.15));
        hpDmgE = Math.floor(def.maxPv * 0.25) + overflowDmg;
        defDied = true;

        // Deathblow ability: queued for GameEngine to apply to adjacent slot
        if (def.abilityId === 'deathblow') {
            triggers.push({ abilityId: 'deathblow', cardIdx: defIdx, value: Math.floor(def.maxPv * 0.5) });
        }
    }

    // ── Attacker death from reflect ───────────────────────────────────────────
    if (atkPvAfter <= 0) {
        hpDmgP = Math.floor(atk.maxPv * 0.2);
        atkDied = true;
    }

    // ── Vampire ability: heal owner on damage dealt ───────────────────────────
    if (atk.abilityId === 'vampire' && damage > 0) {
        const heal = Math.floor(damage * 0.2);
        triggers.push({ abilityId: 'vampire', cardIdx: atkIdx, value: heal });
    }

    return {
        damage, defPvAfter, atkPvAfter, defDied, atkDied,
        reflected, reflectDamage, hpDmgE, hpDmgP, revealed,
        typeBonus: hasRivalry, // reuse typeBonus slot for rivalry banner
        abilityTriggers: triggers,
    };
}

// ─── SKILL COMPUTATION ────────────────────────────────────────────────────────

export interface SkillComputeParams {
    skill: Skill;
    target?: Card | null;
    ownHp: number;
    maxHp?: number;
    /** How many offensive skills used this turn (for combo tracking) */
    offensiveUsed?: number;
}

export interface SkillComputeResult {
    success: boolean;
    message: string;
    comboBonus?: number;      // multiplier applied to next attack (e.g. 1.20)
    comboMessage?: string;    // banner text for combo
    targetPvDelta: number;
    casterHpDelta: number;
    targetDies: boolean;
    flipTarget: boolean;
    stunTarget: boolean;
    shieldTarget: boolean;
    poisonTarget: boolean;
    drawCount: number;
    divineAction: boolean;
}

export function computeSkill(params: SkillComputeParams): SkillComputeResult {
    const { skill, target, ownHp, maxHp = 1500, offensiveUsed = 0 } = params;
    const base: SkillComputeResult = {
        success: false, message: '',
        targetPvDelta: 0, casterHpDelta: 0,
        targetDies: false, flipTarget: false, stunTarget: false,
        shieldTarget: false, poisonTarget: false, drawCount: 0, divineAction: false,
    };

    // Combo: 2nd offensive skill in same turn (Poder Divino) → next attack +20%
    let comboBonus: number | undefined;
    let comboMessage: string | undefined;
    if (skill.group === 'offensive' && offensiveUsed >= 1) {
        comboBonus = 1.20;
        comboMessage = '🔴 COMBO OFENSIVO! +20% no próximo ataque!';
    }

    switch (skill.effect) {
        case 'flip':
            if (target) return { ...base, success: true, message: `${target.name} foi ocultada!`, flipTarget: true };
            break;
        case 'stun':
            if (target) {
                // Resilience blocks debuff
                if (target.abilityId === 'resilience' && !target.usedResilience)
                    return { ...base, success: false, message: '💪 Resistência bloqueou o debuff!' };
                return { ...base, success: true, message: `${target.name} está paralisada!`, stunTarget: true };
            }
            break;
        case 'shield':
            if (target) return { ...base, success: true, message: `${target.name} protegida!`, shieldTarget: true };
            break;
        case 'draw':
            return { ...base, success: true, message: 'Comprou 2 cartas!', drawCount: 2 };
        case 'poison':
            if (target) {
                if (target.abilityId === 'resilience' && !target.usedResilience)
                    return { ...base, success: false, message: '💪 Resistência bloqueou o veneno!' };
                return { ...base, success: true, message: `${target.name} envenenada!`, poisonTarget: true };
            }
            break;
        case 'burn': {
            if (target) {
                const dmg = skill.power ?? 200;
                // Reflect blocks burn if target has reflect ability
                const blocked = target.abilityId === 'reflect';
                if (blocked) return { ...base, success: false, message: '🔁 Reflexo negou a chama!' };
                return {
                    ...base, success: true,
                    message: `${skill.name}: ${dmg} dano!`,
                    targetPvDelta: -dmg, targetDies: (target.pv - dmg) <= 0,
                    comboBonus, comboMessage,
                };
            }
            break;
        }
        case 'drain': {
            if (target) {
                const dmg = Math.min(skill.power ?? 150, target.pv);
                const heal = Math.min(dmg, maxHp - ownHp);
                return {
                    ...base, success: true,
                    message: `${dmg} PV roubados!`,
                    targetPvDelta: -dmg, casterHpDelta: heal,
                    targetDies: (target.pv - dmg) <= 0,
                };
            }
            break;
        }
        case 'nuke':
            if (target) {
                const blocked = target.abilityId === 'reflect';
                if (blocked) return { ...base, success: false, message: '🔁 Reflexo negou o Julgamento!' };
                return {
                    ...base, success: true,
                    message: `${target.name} foi aniquilada!`,
                    targetDies: true, comboBonus, comboMessage,
                };
            }
            break;
        case 'divine':
            return { ...base, success: true, message: '✨ Poder Divino! 2 ações!', divineAction: true };
    }

    return { ...base, success: false, message: 'Alvo inválido.' };
}

// ─── HEAL TICK (Sacerdotisa-type cards) ──────────────────────────────────────

/** Healing-type cards recover +30 PV at end of their turn (capped at maxPv). */
export function healingCardTick(card: Card): number {
    // Sacerdotisa has no abilityId, but we check by name or a future tag
    // For now: any card named 'Sacerdotisa' heals.
    if (card.name === 'Sacerdotisa' && card.pv < card.maxPv) {
        return Math.min(30, card.maxPv - card.pv);
    }
    return 0;
}
