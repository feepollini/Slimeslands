/**
 * vfxRegistry.ts — Modular registry for visual effects (VFX).
 * These IDs are assigned to attacks and abilities in the Forge V2 editor.
 */

export interface VFXRegistryEntry {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    /**
     * Contextual Category:
     * - impact: 3 Scaling Damage Attacks (Slots 0,1,2).
     * - elemental / status: Enchantment slots.
     * - ultimate: Special Attacks.
     * - aura / cast: Passive Abilities.
     */
    category: 'impact' | 'elemental' | 'status' | 'ultimate' | 'aura' | 'cast';
}

export const VFX_REGISTRY: VFXRegistryEntry[] = [
    // Impacts - Physical/Melee
    { id: 'vfx_slash_basic', name: 'CORTE METÁLICO', icon: '⚔️', color: '#ffffff', category: 'impact', description: 'Corte rápido cinético. Aumenta em tamanho, rastro, e shake de tela nos slots 2 e 3.' },
    { id: 'vfx_heavy_blunt', name: 'IMPACTO ESMAGADOR', icon: '🔨', color: '#ffaa00', category: 'impact', description: 'Pancada seca com poeira. No slot 3 (Golpe Supremo), causa cratera no chão do tabuleiro.' },
    { id: 'vfx_dimensional_slash', name: 'CORTE DIMENSIONAL', icon: '🌌', color: '#a335ee', category: 'impact', description: 'Fissura na realidade rasgando a carta alvo. Slot 3 rasga o tabuleiro inteiro com filtros SVG.' },
    { id: 'vfx_claw_flurry', name: 'FÚRIA SELVAGEM', icon: '🐾', color: '#ff3333', category: 'impact', description: 'Três cortes sequenciais rápidos marcando as garras na tela.' },
    { id: 'vfx_pierce_light', name: 'ESTOCADA DE LUZ', icon: '✨', color: '#ffffaa', category: 'impact', description: 'Impacto perfurante concentrado que cruza o alvo e explode em partículas divinas.' },
    { id: 'vfx_seismic_slam', name: 'GOLPE SÍSMICO', icon: '🪨', color: '#cc8855', category: 'impact', description: 'Pancada descendente que quebra o chão em ondas, balançando as cartas ao redor.' },
    
    // Elemental & Status (For Enchantments)
    { id: 'vfx_fire_persistent', name: 'BRASAS ABRASADORAS', icon: '🔥', color: '#ff4400', category: 'elemental', description: 'Impacto térmico inicial, deixando partículas de cinzas voando pela duração do status.' },
    { id: 'vfx_ice_prison', name: 'PRISÃO GLACIAL', icon: '❄️', color: '#51c5ff', category: 'elemental', description: 'Congela a carta, adicionando um overlay de de gelo (Glitch/Aberração Cromática).' },
    { id: 'vfx_toxic_miasma', name: 'MIASMA TÓXICO', icon: '☣️', color: '#4cff88', category: 'status', description: 'Onda venenosa lenta (SVG turbulence) que pulsa e distorce as texturas.' },
    { id: 'vfx_blood_drain', name: 'DRENO DE SANGUE', icon: '🩸', color: '#ff0000', category: 'status', description: 'Partículas fluem da vítima para o atacante, invertendo cores no tick do dano.' },
    { id: 'vfx_acid_rain', name: 'CHUVA ÁCIDA', icon: '🌧️', color: '#55ff22', category: 'elemental', description: 'Gotas cáusticas caem sobre o tabuleiro derretendo bordas.' },
    { id: 'vfx_electro_shock', name: 'CHOQUE VOLTAICO', icon: '⚡', color: '#ffe500', category: 'elemental', description: 'Corrente estática inconstante que arca de uma carta para a outra piscando a tela.' },

    // Auras & Casts (For Passives)
    { id: 'vfx_holy_aegis', name: 'ÉGIDE DIVINA', icon: '🛡️', color: '#ffffaa', category: 'aura', description: 'Domo geométrico permanente em volta da carta protegida.' },
    { id: 'vfx_phantom_step', name: 'PASSO FANTASMA', icon: '👻', color: '#aaaaff', category: 'aura', description: 'Deixa rastros translúcidos quando entra no jogo. Modifica a opacidade base.' },
    { id: 'vfx_siphon_cast', name: 'CONJURAÇÃO SOMBRIA', icon: '🌑', color: '#220044', category: 'cast', description: 'Suga luz ambiente quando uma passiva de roubo ativa.' },
    { id: 'vfx_nature_blessing', name: 'BÊNÇÃO DA FLORESTA', icon: '🍃', color: '#2ecc71', category: 'aura', description: 'Pétalas e folhas contornando a borda da carta com um suave brilho verde.' },
    { id: 'vfx_rage_aura', name: 'AURA DE FÚRIA', icon: '💢', color: '#ff2222', category: 'aura', description: 'Ondulação térmica fervente que emana do personagem.' },
    { id: 'vfx_crystal_barrier', name: 'BARREIRA DE CRISTAL', icon: '💎', color: '#aaffff', category: 'aura', description: 'Escudo facetado refletivo. Quebra em milhares de estilhaços ao absorver dano.' },

    // Ultimates (For Special Attacks)
    { id: 'vfx_celestial_judgment', name: 'JULGAMENTO CELESTIAL', icon: '☄️', color: '#ffffff', category: 'ultimate', description: 'Raio orbital cataclísmico. Treme-tela nível 10 com superexposição temporária.' },
    { id: 'vfx_fire_cataclysm', name: 'CATACLISMO DE FOGO', icon: '🌋', color: '#ff4400', category: 'ultimate', description: 'Tela inteira escurece, seguida de uma erupção apocalíptica com brasa persistente global.' },
    { id: 'vfx_void_implosion', name: 'IMPLOSÃO DO VAZIO', icon: '🌌', color: '#000000', category: 'ultimate', description: 'Colapso espacial que suga toda a luz do tabuleiro para o alvo antes de detonar em cores invertidas.' },
    { id: 'vfx_tsunami_crush', name: 'TSUNAMI MACIÇO', icon: '🌊', color: '#0055ff', category: 'ultimate', description: 'Onda gigante varre a tela lavando o alvo, seguido de um empurrão visual para fora da board.' },
    { id: 'vfx_time_fracture', name: 'FRATURA TEMPORAL', icon: '⏳', color: '#ffffff', category: 'ultimate', description: 'A tela congela, o alvo é cortado dezenas de vezes antes da linha temporal colapsar de uma só vez.' },
    { id: 'vfx_meteor_strike', name: 'CHUVA DE METEOROS', icon: '☄️', color: '#ff5500', category: 'ultimate', description: 'Múltiplos pedregulhos incandescentes colidem sequencialmente reduzindo o tabuleiro a pó.' }
];
