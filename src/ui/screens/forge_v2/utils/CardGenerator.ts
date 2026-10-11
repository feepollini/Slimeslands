import { ENCHANTMENT_REGISTRY } from '../../../../core/enchantments';

export function randomizeCard(t: any, rarity: string, abilities: any[], classes: any[]) {
    console.log(`[CardGenerator] Randomizing as ${rarity}...`);
    let pv = 0, atk = 0, playCost = 0, atkCount = 1, atkCost = 0;
    const step = 10;
    
    if (rarity === 'common') {
        pv = Math.floor(Math.random() * (500 / step)) * step + step;
        atk = Math.floor(Math.random() * (500 / step)) * step + step;
        playCost = Math.floor(Math.random() * 3) + 1;
        atkCount = 1; atkCost = Math.floor(Math.random() * 3) + 1;
    } else if (rarity === 'rare') {
        pv = Math.floor(Math.random() * (500 / step)) * step + 510;
        atk = Math.floor(Math.random() * (500 / step)) * step + 510;
        playCost = Math.floor(Math.random() * 4) + 3;
        atkCount = 2; atkCost = Math.floor(Math.random() * 4) + 3;
    } else if (rarity === 'epic') {
        pv = Math.floor(Math.random() * (500 / step)) * step + 1010;
        atk = Math.floor(Math.random() * (500 / step)) * step + 1010;
        playCost = Math.floor(Math.random() * 4) + 6;
        atkCount = 3; atkCost = Math.floor(Math.random() * 4) + 6;
    } else {
        // Legendary
        pv = Math.floor(Math.random() * (500 / step)) * step + 1510;
        atk = Math.floor(Math.random() * (500 / step)) * step + 1510;
        playCost = Math.floor(Math.random() * 4) + 7;
        atkCount = 4; atkCost = Math.floor(Math.random() * 4) + 7;
    }

    t.baseAtk = atk;
    t.basePv = pv;
    t.manaCost = playCost;
    t.staminaCost = playCost;
    t.preferredRarity = rarity as any;
    
    // Class Randomization
    if (classes.length > 0) {
      t.classId = classes[Math.floor(Math.random() * classes.length)].id;
    }
    
    // Passive Randomization
    let passiveChance = 0.15; // Common
    if (rarity === 'rare') passiveChance = 0.45;
    if (rarity === 'epic') passiveChance = 0.75;
    if (rarity === 'legendary') passiveChance = 0.95;

    if (Math.random() < passiveChance) {
      const pool = abilities.filter(a => a.id !== 'none');
      if (pool.length > 0) {
        t.abilityId = pool[Math.floor(Math.random() * pool.length)].id;
      }
    } else {
      t.abilityId = 'none';
    }
    
    try {
        // Auto-Gen Attacks based on count
        t.attacks = [];
        
        for (let i = 0; i < atkCount; i++) {
           const isEnchantment = Math.random() < (rarity === 'common' ? 0.1 : (rarity === 'rare' ? 0.25 : 0.4));
           
           if (isEnchantment && ENCHANTMENT_REGISTRY && ENCHANTMENT_REGISTRY.length > 0) {
             const enc = ENCHANTMENT_REGISTRY[Math.floor(Math.random() * ENCHANTMENT_REGISTRY.length)];
             t.attacks.push({
                type: 'enchantment',
                name: enc.name.toUpperCase(),
                enchantment: { id: enc.id, value: enc.defaultValue, turns: enc.defaultTurns },
                cost: enc.defaultCost,
                costType: enc.defaultResource
             });
           } else {
             t.attacks.push({
                type: 'damage',
                name: i === 0 ? 'ATAQUE BÁSICO' : (i === 1 ? 'HABILIDADE ESPECIAL' : (i === 2 ? 'GOLPE SUPREMO' : 'PODER LENDÁRIO')),
                damage: atk + (i * 200),
                cost: atkCost, 
                costType: (i % 2 === 1) ? 'mana' : 'stamina'
             });
           }
        }
        console.log(`[CardGenerator] Randomization complete for ${t.name}`);
    } catch (err) {
        console.error(`[CardGenerator] FAILED Randomizing ${t.name}:`, err);
    }
    // Special Attack for Epics and Legendaries (80% chance)
    if ((rarity === 'epic' || rarity === 'legendary') && Math.random() < 0.8) {
      t.specialAttack = {
        name: 'DESTREZA FINAL',
        damage: atk * 2,
        costType: (Math.random() > 0.5 ? 'mana' : 'stamina'),
        cost: 9,
        description: 'Um golpe devastador que utiliza toda a energia acumulada.'
      };
    } else {
      delete t.specialAttack;
    }
    
    // Parry Randomization (Binary Toggle: 0 or 1)
    t.parry = Math.random() < 0.5 ? 1 : 0;

    return t;
}
