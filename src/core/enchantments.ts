/**
 * enchantments.ts — Modular registry for card enchantments.
 * Balanced using the Rule of Three: 1 Cost Point ≈ 200 Value Points.
 */

export interface EnchantmentRegistryEntry {
    id: string;
    name: string;
    icon: string;
    category: 'offensive' | 'heal' | 'support' | 'utility';
    description: string;
    defaultCost: number;
    defaultResource: 'mana' | 'stamina';
    defaultValue?: number;
    defaultTurns?: number;
    targetType: 'enemy' | 'ally' | 'self' | 'user' | 'opponent' | 'enemy_player';
}

export const ENCHANTMENT_REGISTRY: EnchantmentRegistryEntry[] = [
    {
        id: 'bind',
        name: 'Amarração (Bind)',
        icon: '🔗',
        category: 'offensive',
        description: 'Imobiliza o alvo por 2 turnos.',
        defaultCost: 8,
        defaultResource: 'stamina',
        defaultTurns: 2,
        targetType: 'enemy'
    },
    {
        id: 'freeze',
        name: 'Congelar (Freeze)',
        icon: '❄️',
        category: 'offensive',
        description: 'Atordoa por 1 turno + 200 de dano.',
        defaultCost: 6,
        defaultResource: 'mana',
        defaultValue: 200,
        defaultTurns: 1,
        targetType: 'enemy'
    },
    {
        id: 'burn',
        name: 'Queimadura (Burn)',
        icon: '🔥',
        category: 'offensive',
        description: 'Causa 10% do PV Max por turno (3 turnos).',
        defaultCost: 4,
        defaultResource: 'mana',
        defaultValue: 10,
        defaultTurns: 3,
        targetType: 'enemy'
    },
    {
        id: 'exposure',
        name: 'Exposição',
        icon: '🎯',
        category: 'offensive',
        description: 'O alvo recebe +40% de dano por 2 turnos.',
        defaultCost: 5,
        defaultResource: 'mana',
        defaultValue: 40,
        defaultTurns: 2,
        targetType: 'enemy'
    },
    {
        id: 'disarm',
        name: 'Desarmar',
        icon: '⚔️',
        category: 'offensive',
        description: 'Reduz o ATK do alvo em 50% por 2 turnos.',
        defaultCost: 6,
        defaultResource: 'stamina',
        defaultValue: 50,
        defaultTurns: 2,
        targetType: 'enemy'
    },
    {
        id: 'crush',
        name: 'Esmagar',
        icon: '🔨',
        category: 'offensive',
        description: 'Destrói o escudo ativo e causa 200 de dano.',
        defaultCost: 4,
        defaultResource: 'stamina',
        defaultValue: 200,
        targetType: 'enemy'
    },

    // 💖 CURA
    {
        id: 'heal_ally',
        name: 'Cura Vital',
        icon: '💚',
        category: 'heal',
        description: 'Restaura 500 PV de uma carta aliada.',
        defaultCost: 3,
        defaultResource: 'mana',
        defaultValue: 500,
        targetType: 'ally'
    },
    {
        id: 'elixir',
        name: 'Elixir',
        icon: '🧪',
        category: 'heal',
        description: 'Restaura 200 HP do Jogador.',
        defaultCost: 6,
        defaultResource: 'mana',
        defaultValue: 200,
        targetType: 'user'
    },
    {
        id: 'drain',
        name: 'Drenagem',
        icon: '💜',
        category: 'heal',
        description: 'Rouba 300 PV do defensor para o atacante.',
        defaultCost: 5,
        defaultResource: 'mana',
        defaultValue: 300,
        targetType: 'enemy'
    },
    {
        id: 'regen',
        name: 'Regeneração',
        icon: '🌿',
        category: 'heal',
        description: 'Cura 150 PV por turno (3 turnos).',
        defaultCost: 4,
        defaultResource: 'mana',
        defaultValue: 150,
        defaultTurns: 3,
        targetType: 'ally'
    },
    {
        id: 'revive',
        name: 'Reanimação',
        icon: '✨',
        category: 'heal',
        description: 'Se morrer neste turno, renasce com 20% PV.',
        defaultCost: 7,
        defaultResource: 'mana',
        defaultValue: 20,
        targetType: 'self'
    },

    // 🛡️ SUPORTE
    {
        id: 'shield',
        name: 'Escudo de Fé',
        icon: '🛡️',
        category: 'support',
        description: 'Bloqueia completamente o próximo ataque.',
        defaultCost: 4,
        defaultResource: 'stamina',
        targetType: 'self'
    },
    {
        id: 'vampirism',
        name: 'Vampirismo',
        icon: '🧛',
        category: 'support',
        description: 'O próximo ataque restaura 100% do dano em PV.',
        defaultCost: 4,
        defaultResource: 'mana',
        targetType: 'self'
    },
    {
        id: 'berserk',
        name: 'Fúria (Berserk)',
        icon: '💢',
        category: 'support',
        description: 'Permite que a carta ataque 2 vezes neste turno.',
        defaultCost: 7,
        defaultResource: 'stamina',
        targetType: 'self'
    },
    {
        id: 'blessing',
        name: 'Benção de Ferro',
        icon: '⚒️',
        category: 'support',
        description: 'Concede +200 ATK permanente à carta aliada.',
        defaultCost: 6,
        defaultResource: 'mana',
        defaultValue: 200,
        targetType: 'ally'
    },
    {
        id: 'camo',
        name: 'Camuflagem',
        icon: '👤',
        category: 'support',
        description: 'A carta não pode ser alvo de ataques (1 turno).',
        defaultCost: 5,
        defaultResource: 'stamina',
        defaultTurns: 1,
        targetType: 'self'
    },

    // 🌀 UTILIDADE / RECURSOS
    {
        id: 'siphon',
        name: 'Sifão de Mana',
        icon: '💎',
        category: 'utility',
        description: 'Rouba 2 de Mana do oponente.',
        defaultCost: 7,
        defaultResource: 'mana',
        defaultValue: 2,
        targetType: 'enemy_player'
    },
    {
        id: 'mind_blast',
        name: 'Explosão Mental',
        icon: '💥',
        category: 'utility',
        description: 'Causa dano igual a 50% da Mana do alvo x 100.',
        defaultCost: 6,
        defaultResource: 'mana',
        targetType: 'enemy'
    },
    {
        id: 'meditate',
        name: 'Meditação',
        icon: '🧘',
        category: 'utility',
        description: 'Abandona o ataque para restaurar 4 de Mana.',
        defaultCost: 0,
        defaultResource: 'mana',
        defaultValue: 4,
        targetType: 'self'
    },
    {
        id: 'sacrifice',
        name: 'Sacrifício',
        icon: '🔪',
        category: 'utility',
        description: 'Causa 200 de dano a si mesma para ganhar 5 Estamina.',
        defaultCost: 0,
        defaultResource: 'stamina',
        defaultValue: 5,
        targetType: 'self'
    },
    {
        id: 'reveal',
        name: 'Visão (Reveal)',
        icon: '👁️',
        category: 'utility',
        description: 'Revela uma carta inimiga oculta.',
        defaultCost: 2,
        defaultResource: 'mana',
        targetType: 'enemy'
    },
    {
        id: 'recycle',
        name: 'Reciclar',
        icon: '♻️',
        category: 'utility',
        description: 'Descarta 1 carta aleatória e compra 2.',
        defaultCost: 3,
        defaultResource: 'mana',
        targetType: 'user'
    },
    {
        id: 'echo',
        name: 'Eco',
        icon: '📣',
        category: 'utility',
        description: 'O próximo encantamento aliado custará 0.',
        defaultCost: 9,
        defaultResource: 'mana',
        targetType: 'self'
    }
];

export function getEnchantment(id: string) {
    return ENCHANTMENT_REGISTRY.find(e => e.id === id);
}
