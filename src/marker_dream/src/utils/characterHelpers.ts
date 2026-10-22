import { PlayerConfig, MapProject, PlayerInventoryConfig } from '../types/map';

export const CHARACTERS_STORAGE_KEY = 'marker_dream_characters_roster_v2';

export const DEFAULT_CHARACTERS: PlayerConfig[] = [
  {
    id: 'char_hero_legendary',
    characterId: 'char_hero_legendary',
    name: 'Herói Lendário',
    description: 'Aventureiro versátil e equilibrado, pronto para explorar qualquer bioma e masmorra.',
    role: 'Aventureiro',
    color: '#3b82f6',
    speed: 4,
    scale: 1.0,
    autoBounce: true,
    jellyStyle: 'spring',
    jellyIntensity: 1.0,
    jellyIdleIntensity: 0.35,
    jellySpeed: 1.0,
    x: 384,
    y: 100,
    defaultInventorySlots: 30,
    defaultCurrencies: { gold: 200, gems: 15 },
    stats: {
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      attack: 15,
      defense: 10,
    },
    startingItemIds: [
      { itemId: 'item-potion-hp-small', quantity: 3 },
      { itemId: 'item-herb-healing', quantity: 5 },
    ],
  },
  {
    id: 'char_mage_astral',
    characterId: 'char_mage_astral',
    name: 'Maga Astral',
    description: 'Especialista em magia arcana, pergaminhos e leitura de tomos ancestrais.',
    role: 'Mago',
    color: '#8b5cf6',
    speed: 3.8,
    scale: 1.0,
    autoBounce: true,
    jellyStyle: 'pulse_beat',
    jellyIntensity: 1.2,
    jellyIdleIntensity: 0.45,
    jellySpeed: 0.9,
    x: 384,
    y: 100,
    defaultInventorySlots: 24,
    defaultCurrencies: { gold: 350, gems: 40 },
    stats: {
      hp: 70,
      maxHp: 70,
      mp: 140,
      maxMp: 140,
      attack: 25,
      defense: 6,
    },
    startingItemIds: [
      { itemId: 'item-elixir-mana', quantity: 4 },
      { itemId: 'item-scroll-teleport', quantity: 2 },
    ],
  },
  {
    id: 'char_warrior_iron',
    characterId: 'char_warrior_iron',
    name: 'Guerreiro de Ferro',
    description: 'Combatente robusto de alta resistência com mochila de grande capacidade.',
    role: 'Tanque',
    color: '#ef4444',
    speed: 3.4,
    scale: 1.15,
    autoBounce: true,
    jellyStyle: 'squash_intense',
    jellyIntensity: 0.8,
    jellyIdleIntensity: 0.25,
    jellySpeed: 1.1,
    x: 384,
    y: 100,
    defaultInventorySlots: 40,
    defaultCurrencies: { gold: 120, gems: 5 },
    stats: {
      hp: 160,
      maxHp: 160,
      mp: 25,
      maxMp: 25,
      attack: 22,
      defense: 20,
    },
    startingItemIds: [
      { itemId: 'item-meat-roasted', quantity: 5 },
      { itemId: 'item-potion-iron-skin', quantity: 2 },
    ],
  },
  {
    id: 'char_rogue_shadow',
    characterId: 'char_rogue_shadow',
    name: 'Ladina das Sombras',
    description: 'Extremamente ágil e silenciosa, especializada em coleta rápida e exploração furtiva.',
    role: 'Ladina',
    color: '#10b981',
    speed: 5.2,
    scale: 0.95,
    autoBounce: true,
    jellyStyle: 'step_walk',
    jellyIntensity: 1.3,
    jellyIdleIntensity: 0.3,
    jellySpeed: 1.4,
    x: 384,
    y: 100,
    defaultInventorySlots: 20,
    defaultCurrencies: { gold: 500, gems: 25 },
    stats: {
      hp: 85,
      maxHp: 85,
      mp: 60,
      maxMp: 60,
      attack: 20,
      defense: 8,
    },
    startingItemIds: [
      { itemId: 'item-lockpick', quantity: 5 },
      { itemId: 'item-smoke-bomb', quantity: 3 },
    ],
  },
];

/**
 * Carrega a lista de personagens salvos, mesclando com o projeto ou localStorage.
 */
export function loadCharactersRoster(project?: MapProject): PlayerConfig[] {
  // 1. Prioriza os personagens salvos dentro do próprio projeto se existirem
  if (project?.savedCharacters && project.savedCharacters.length > 0) {
    return project.savedCharacters;
  }

  // 2. Tenta carregar do localStorage persistente
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = localStorage.getItem(CHARACTERS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar roster de personagens do localStorage:', e);
    }
  }

  // 3. Fallback: Se o projeto já tem um player configurado, inclui ele + defaults
  if (project?.player) {
    const existingPlayer = {
      ...project.player,
      characterId: project.player.id || 'char_active_phase',
      description: project.player.description || 'Personagem atual da fase',
      defaultInventorySlots: project.player.defaultInventorySlots || project.playerInventory?.maxSlots || 30,
    };
    return [existingPlayer, ...DEFAULT_CHARACTERS.filter((c) => c.name !== existingPlayer.name)];
  }

  return DEFAULT_CHARACTERS;
}

/**
 * Salva a lista de personagens no localStorage global da engine
 */
export function saveCharactersRosterToStorage(characters: PlayerConfig[]): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      localStorage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(characters));
    } catch (e) {
      console.warn('Erro ao salvar roster de personagens no localStorage:', e);
    }
  }
}

/**
 * Aplica um personagem da biblioteca à fase atual, pré-preenchendo:
 * - Sprites, física, escalas e velocidade
 * - Limite de capacidade da mochila (slots)
 * - Moedas e atributos
 * - Preserva a posição X/Y da fase se já definida, ou usa a do personagem
 */
export function applyCharacterToPhase(
  character: PlayerConfig,
  currentProject: MapProject,
  preservePhaseSpawn: boolean = true
): MapProject {
  const currentSpawnX = preservePhaseSpawn && currentProject.player ? currentProject.player.x : (character.x ?? 384);
  const currentSpawnY = preservePhaseSpawn && currentProject.player ? currentProject.player.y : (character.y ?? 100);

  const updatedPlayer: PlayerConfig = {
    ...character,
    id: character.id,
    characterId: character.id,
    name: character.name,
    x: currentSpawnX,
    y: currentSpawnY,
    avatarPng: character.avatarPng,
    avatarUpPng: character.avatarUpPng,
    avatarDownPng: character.avatarDownPng,
    avatarLeftPng: character.avatarLeftPng,
    avatarRightPng: character.avatarRightPng,
    scale: character.scale ?? 1.0,
    speed: character.speed ?? 4,
    color: character.color ?? '#3b82f6',
    autoBounce: character.autoBounce ?? true,
    jellyStyle: character.jellyStyle ?? 'spring',
    jellyIntensity: character.jellyIntensity ?? 1.0,
    jellyIdleIntensity: character.jellyIdleIntensity ?? 0.35,
    jellySpeed: character.jellySpeed ?? 1.0,
    showNameTag: character.showNameTag ?? false,
    motionLayers: character.motionLayers ? JSON.parse(JSON.stringify(character.motionLayers)) : undefined,
    defaultInventorySlots: character.defaultInventorySlots ?? 30,
    stats: character.stats ? { ...character.stats } : undefined,
  };

  // Atualiza ou inicializa o inventário da fase com os limites do personagem
  const currentInv: PlayerInventoryConfig = currentProject.playerInventory || {
    enabled: true,
    columns: 5,
    items: [],
    currencies: { gold: 150, gems: 10 },
    maxSlots: 30,
  };

  const updatedInventory: PlayerInventoryConfig = {
    ...currentInv,
    maxSlots: character.defaultInventorySlots || currentInv.maxSlots || 30,
    currencies: {
      gold: character.defaultCurrencies?.gold ?? currentInv.currencies.gold,
      gems: character.defaultCurrencies?.gems ?? currentInv.currencies.gems,
    },
  };

  // Garante que o personagem salvo conste na lista savedCharacters do projeto
  const existingSaved = currentProject.savedCharacters || [];
  const updatedSaved = existingSaved.some((c) => c.id === character.id)
    ? existingSaved.map((c) => (c.id === character.id ? character : c))
    : [...existingSaved, character];

  return {
    ...currentProject,
    player: updatedPlayer,
    playerInventory: updatedInventory,
    activeCharacterId: character.id,
    savedCharacters: updatedSaved,
  };
}
