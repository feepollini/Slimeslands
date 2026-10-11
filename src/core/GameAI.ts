import { GameEngine, Card } from './GameEngine';
import { computeAttack } from './CombatEngine';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export class GameAI {
    public computeMove(engine: GameEngine, difficulty: AIDifficulty): { action: string; atkIdx?: number; defIdx?: number; cardToPlay?: Card; skillIdx?: number; attackIdx?: number } {
        const eCards = [0, 1, 2].map(i => ({ idx: i, card: engine.board[i] })).filter(x => x.card && !x.card.isStunned && !x.card.isFlipped);
        const pCards = [3, 4, 5].map(i => ({ idx: i, card: engine.board[i] })).filter(x => x.card);

        // 1. ARTIFACT USAGE (Medium/Hard only)
        if (difficulty !== 'easy' && engine.actionsLeft > 0) {
            const artifactMove = this.chooseSkill(engine, difficulty);
            if (artifactMove) return artifactMove;
        }

        // 2. PLAY CARD
        const emptyESlot = [0, 1, 2].find(i => !engine.board[i]);
        if (emptyESlot !== undefined && engine.actionsLeft > 0) {
            const playableFromHand = engine.aiHand.find(c => engine.mana.e >= (c.manaCost || 1));
            if (playableFromHand) {
                return { action: 'play', defIdx: emptyESlot, cardToPlay: playableFromHand };
            }
        }

        // 3. ATTACK
        if (eCards.length > 0 && engine.actionsLeft > 0) {
            const atkMove = this.chooseAttack(engine, difficulty, eCards, pCards);
            if (atkMove) return atkMove;
        }

        // 4. DRAW CARD
        if (engine.actionsLeft > 0 && (engine.aiDeck.length > 0 || engine.aiHand.length > 0)) {
            const hasPlayable = engine.aiHand.some(c => engine.mana.e >= (c.manaCost || 1));
            if (engine.aiHand.length === 0 || !hasPlayable) {
                if (engine.aiDeck.length > 0) return { action: 'draw' };
                // If deck is empty but we have unplayable cards, maybe we eventually end?
            }
        }

        return { action: 'end' };
    }

    private chooseSkill(engine: GameEngine, difficulty: AIDifficulty) {
        for (let i = 0; i < engine.activeSkills.length; i++) {
            const skill = engine.activeSkills[i];
            if (!skill) continue;
            
            if (engine.mana.e < (skill.manaCost || 0) || engine.stamina.e < (skill.staminaCost || 0)) continue;

            const targets = [3, 4, 5].filter(idx => engine.board[idx]);
            
            if (skill.group === 'offensive' && targets.length > 0) {
                let targetIdx = targets[0];
                if (difficulty === 'hard') {
                   targetIdx = targets.reduce((prev, curr) => (engine.board[curr]?.atk || 0) > (engine.board[prev]?.atk || 0) ? curr : prev);
                } else {
                   targetIdx = targets[Math.floor(Math.random() * targets.length)];
                }
                return { action: 'skill', skillIdx: i, defIdx: targetIdx };
            } else if (skill.group === 'support' && engine.hp.e < 1000) {
                return { action: 'skill', skillIdx: i };
            }
        }
        return null;
    }

    private chooseAttack(engine: GameEngine, diff: AIDifficulty, eCards: any[], pCards: any[]) {
        let bestMove: { atkIdx: number; defIdx: number; attackIdx: number; score: number } | null = null;

        for (const e of eCards) {
            const attacks = e.card!.attacks || [];
            
            // Legacy support if card has no explicit attacks array
            const attackPool = attacks.length > 0 ? attacks : [{ name: 'ATK', cost: e.card!.staminaCost || 1, costType: 'stamina' as const, damage: e.card!.atk }];

            for (let aIdx = 0; aIdx < attackPool.length; aIdx++) {
                const atkDef = attackPool[aIdx];

                // Affordability check
                if (atkDef.costType === 'mana' && engine.mana.e < atkDef.cost) continue;
                if (atkDef.costType === 'stamina' && engine.stamina.e < atkDef.cost) continue;

                // Priority: Empty board direct hit
                if (pCards.length === 0) {
                    const emptySlot = [3, 4, 5].find(i => !engine.board[i]) ?? 3;
                    const score = (atkDef.damage || e.card!.atk) * 5; // Value direct damage highly
                    if (!bestMove || score > bestMove.score) {
                        bestMove = { atkIdx: e.idx, defIdx: emptySlot, attackIdx: aIdx, score };
                    }
                    continue;
                }

                for (const p of pCards) {
                    const sim = computeAttack(e.card!, p.card!, p.idx, engine.hp, atkDef);
                    
                    if (diff === 'easy') {
                        if (!bestMove || Math.random() > 0.8) {
                            bestMove = { atkIdx: e.idx, defIdx: p.idx, attackIdx: aIdx, score: 0 };
                        }
                        continue;
                    }

                    const lethalBonus = sim.defDied ? 150 : 0;
                    const damageTaken = sim.reflected ? sim.reflectDamage : 0;
                    
                    let score = (sim.damage + lethalBonus) - (damageTaken * (diff === 'hard' ? 1.5 : 1.0));
                    if (diff === 'hard' && p.card!.atk > 250) score += 50; 

                    if (!bestMove || score > bestMove.score) {
                        bestMove = { atkIdx: e.idx, defIdx: p.idx, attackIdx: aIdx, score };
                    }
                }
            }
        }
        
        if (bestMove) {
            return { action: 'attack', atkIdx: bestMove.atkIdx, defIdx: bestMove.defIdx, attackIdx: bestMove.attackIdx };
        }
        
        return null;
    }
}
