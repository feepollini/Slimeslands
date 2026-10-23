import type { MapProject, SavedLevel, MarkerType } from '../../types/map';
import { MobbyManager, MobbyDialogue } from '../../../../core/MobbyManager';
import defaultStoreJson from '../../../../core/store.json';
import defaultScenariosJson from '../../../../core/scenarios.json';
import defaultSoundsJson from '../../../../core/sounds.json';

export interface EditorCatalogItem {
  id: string;
  label: string;
  badge: string;
  description: string;
  icon: string;
  type?: string;
  realEntityId?: string;
  initialQuickConfig?: NodeQuickConfig;
}

export interface EditorSubCategory {
  id: string;
  name: string;
  icon: string;
  items: EditorCatalogItem[];
}

export interface EditorCategoryDef {
  id: string;
  name: string;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  description: string;
  subCategories: EditorSubCategory[];
}

export interface NodeQuickConfig {
  // Status & Balanceamento
  hp?: number;
  maxHp?: number;
  atk?: number;
  defense?: number;
  speed?: number;
  manaCost?: number;
  scale?: number;
  price?: number;
  currency?: 'gold' | 'gems';
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  // Mobby 3x1
  mobbyId?: string;
  rewardCardId?: string;
  artifacts?: string[];
  mobbyDialogues?: MobbyDialogue[];
  // Booster / Pack
  packId?: string;
  cardsCount?: number;
  packMode?: 'special' | 'random';
  dropRates?: { common: number; rare: number; legendary: number };
  published?: boolean;
  // Marker / Mundo / Física
  markerId?: string;
  markerType?: MarkerType;
  solidCollision?: boolean;
  hasLight?: boolean;
  lightRadius?: number;
  lightColor?: string;
  lightFlicker?: boolean;
  isPortal?: boolean;
  travelTargetType?: 'marker' | 'level' | 'sub_biome';
  travelTargetId?: string;
  travelAuto?: boolean;
  npcBounce?: boolean;
  jellyEffect?: 'none' | 'jelly' | 'water' | 'fire' | 'glow';
  actionNpcEnabled?: boolean;
  actionNpcRole?: 'hostile' | 'guardian' | 'peaceful' | 'curious' | 'coward';
  detectionRadius?: number;
  // Narrativa & Diálogos
  speakerName?: string;
  dialogueText?: string;
  npcPhrases?: string[];
  hintText?: string;
  // Cenário, Clima & Áudio
  scenarioScreenId?: string;
  backgroundUrl?: string;
  bgmUrl?: string;
  sfxUrl?: string;
  audioVolume?: number;
  weatherType?: 'none' | 'rain' | 'fog' | 'leaves' | 'night' | 'snow' | 'dawn';
  particleType?: 'none' | 'sparks' | 'snow' | 'embers';
  // Vídeo Chroma Key
  chromaKeyEnabled?: boolean;
  chromaKeyColor?: string;
  chromaKeyTolerance?: number;
  // Quest & Gatilhos
  triggerCondition?: 'proximity' | 'interact' | 'on_enter_map' | 'hp_below' | 'quest_complete';
  questKind?: 'collect' | 'deliver' | 'reach' | 'interact' | 'talk' | 'discover' | 'duel';
  questRequiredAmount?: number;
  questResourceName?: string;
  rewardGold?: number;
  rewardXp?: number;
}

export interface NodeEditorLink {
  editorId: string;
  subCategory: string;
  itemId: string;
  itemLabel: string;
  actionTrigger?: string;
  realEntityId?: string;
  quickConfig?: NodeQuickConfig;
}

export const EDITOR_CONTENT_CATALOG: EditorCategoryDef[] = [
  // ==========================================
  // ECOSSISTEMA FORGE V2 (SLIMESLANDS ENGINE)
  // ==========================================

  // 1. CARD ENGINE & MATRIZ (Forge V2)
  {
    id: 'card_engine',
    name: 'Card Engine & Matriz',
    icon: '🃏',
    color: '#8b5cf6',
    borderColor: 'border-violet-500',
    bgColor: 'bg-violet-950/60',
    textColor: 'text-violet-300',
    description: 'Motor de geração procedimental de cartas, matriz Hestridia, estilos e holografia',
    subCategories: [
      {
        id: 'matrix_templates',
        name: 'Matriz Hestridia & Templates',
        icon: '🎴',
        items: [
          { id: 'mat-char-knight', label: 'Template Carta: Cavaleiro Gelatinoso (Hero)', badge: 'Herói', icon: '🛡️', description: 'Template de carta de personagem com atributos de Ataque, Vida e Defesa.' },
          { id: 'mat-spell-acid', label: 'Template Carta: Magia de Gel Ácido', badge: 'Magia', icon: '🧪', description: 'Carta de feitiço com custo de mana e dano elemental contínuo.' },
          { id: 'mat-relic-shield', label: 'Template Carta: Escudo de Quartzo Puro', badge: 'Defesa', icon: '💎', description: 'Carta de barreira física com durabilidade e contra-golpe.' },
          { id: 'mat-back-custom', label: 'Verso de Carta: Dragão de Gosma Dourado', badge: 'Verso', icon: '✨', description: 'Verso estilizado com relevo e brasão da Forja Matriz.' },
        ],
      },
      {
        id: 'engine_decks',
        name: 'Baralhos do Card Engine',
        icon: '📦',
        items: [
          { id: 'eng-deck-slime', label: 'Deck Base: Exército dos Slimes Verdes', badge: 'Deck Inicial', icon: '🟢', description: 'Deck balanceado para iniciantes com foco em enxame e absorção.' },
          { id: 'eng-deck-poison', label: 'Deck Tático: Peste Negra Corrosiva', badge: 'Veneno', icon: '☠️', description: 'Estratégia de dano por turno com acúmulo de esporos venenosos.' },
          { id: 'eng-deck-tank', label: 'Deck Titânico: Muralha de Rocha & Gel', badge: 'Defensivo', icon: '🏰', description: 'Focado em sobrevida, espinhos refletivos e vida extra.' },
        ],
      },
      {
        id: 'foil_effects',
        name: 'Efeitos Visuais & Holografia',
        icon: '✨',
        items: [
          { id: 'foil-gold-holo', label: 'Efeito: Foil Holográfico Arco-íris', badge: 'Holo', icon: '🌈', description: 'Refração de luz 3D que muda de cor conforme a inclinação.' },
          { id: 'foil-border-neon', label: 'Efeito: Borda Energética Neon Pulsante', badge: 'Neon', icon: '⚡', description: 'Contorno luminoso animado para cartas de raridade lendária.' },
        ],
      },
    ],
  },

  // 2. ARSENAL & HABILIDADES (Forge V2)
  {
    id: 'arsenal',
    name: 'Arsenal & Habilidades',
    icon: '⚔️',
    color: '#f43f5e',
    borderColor: 'border-rose-500',
    bgColor: 'bg-rose-950/60',
    textColor: 'text-rose-300',
    description: 'Habilidades ativas, passivas de combate, equipamentos e artefatos de poder',
    subCategories: [
      {
        id: 'active_skills',
        name: 'Habilidades Ativas',
        icon: '🔥',
        items: [
          { id: 'sk-act-slam', label: 'Ativa: Impacto Sísmico de Gosma', badge: 'Dano em Área', icon: '💥', description: 'Salta e atinge o chão causando onda de choque atordoante.' },
          { id: 'sk-act-burst', label: 'Ativa: Rajada de Esporos Venenosos', badge: 'Projétil', icon: '💨', description: 'Dispara 5 dardos teleguiados de gel que aplicam corrosão.' },
          { id: 'sk-act-teleport', label: 'Ativa: Deslocamento Elástico Instantâneo', badge: 'Mobilidade', icon: '🌀', description: 'Teleporta até 8 metros deixando uma poça desaceleradora.' },
        ],
      },
      {
        id: 'passive_skills',
        name: 'Habilidades Passivas',
        icon: '🛡️',
        items: [
          { id: 'sk-pas-regen', label: 'Passiva: Regeneração Celular Viscosa', badge: 'Cura', icon: '💖', description: 'Recupera 3% do HP máximo por segundo fora de combate.' },
          { id: 'sk-pas-split', label: 'Passiva: Divisão Celular de Emergência', badge: 'Sobrevivência', icon: '🧬', description: 'Ao sofrer dano letal, divide-se em 2 clones menores.' },
          { id: 'sk-pas-thorns', label: 'Passiva: Espinhos de Quartzo Refletivos', badge: 'Contra-ataque', icon: '🦔', description: 'Reflete 25% de todo o dano físico sofrido de volta ao agressor.' },
        ],
      },
      {
        id: 'artifacts',
        name: 'Artefatos de Poder (TabArtefatos)',
        icon: '💍',
        items: [
          { id: 'art-heart-titan', label: 'Artefato: Coração do Titã Antigo', badge: 'Lendário', icon: '❤️', description: 'Aumenta permanentemente a vida máxima em +35%.' },
          { id: 'art-ring-mana', label: 'Artefato: Anel de Fluxo de Mana', badge: 'Raro', icon: '💍', description: 'Reduz o custo de mana de todas as magias em 1 ponto.' },
          { id: 'art-boots-speed', label: 'Artefato: Botas de Salto Quântico', badge: 'Épico', icon: '👢', description: 'Permite salto duplo elástico e +20% de velocidade de corrida.' },
        ],
      },
    ],
  },

  // 3. COMERCIAL, LOJA & ECONOMIA (Forge V2)
  {
    id: 'store',
    name: 'Comercial, Loja & Economia',
    icon: '🛒',
    color: '#eab308',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-950/60',
    textColor: 'text-yellow-300',
    description: 'Ofertas diárias, pacotes de moedas, gemas, banners promocionais e loja',
    subCategories: [
      {
        id: 'daily_offers',
        name: 'Piscinas Diárias & Destaques',
        icon: '⭐',
        items: [
          { id: 'str-daily-rare', label: 'Oferta: Carta Rara do Dia com Desconto', badge: 'Promoção', icon: '🏷️', description: 'Carta rotativa vendida por metade do preço em ouro.' },
          { id: 'str-daily-bundle', label: 'Oferta: Pacote Iniciante com Moedas e Gema', badge: 'Bundle', icon: '🎁', description: 'Combo contendo 500 moedas, 50 gemas e 1 booster 3D.' },
        ],
      },
      {
        id: 'currencies',
        name: 'Moedas, Gemas & Recursos',
        icon: '💰',
        items: [
          { id: 'cur-gold-100', label: 'Recurso: Bolsa de 100 Moedas de Ouro', badge: 'Ouro', icon: '🪙', description: 'Moeda básica para compra de cartas comuns e melhorias simples.' },
          { id: 'cur-gems-50', label: 'Recurso: Frasco de 50 Gemas Azuis', badge: 'Gemas', icon: '💎', description: 'Moeda nobre para adquirir boosters lendários e skins exclusivas.' },
          { id: 'cur-tickets', label: 'Recurso: Bilhete de Entrada no Duelo Mobby', badge: 'Passe', icon: '🎟️', description: 'Permite desafiar os chefes 3x1 na arena de recompensas.' },
        ],
      },
      {
        id: 'store_decks',
        name: 'Decks Comerciais Prontos',
        icon: '🎴',
        items: [
          { id: 'str-deck-warrior', label: 'Deck Loja: Campeão da Forja (Pronto para Jogar)', badge: 'Deck Loja', icon: '🛡️', description: 'Conjunto completo de 20 cartas testadas e balanceadas.' },
        ],
      },
    ],
  },

  // 4. BOOSTERS & PACOTES 3D (TabPacks)
  {
    id: 'boosters',
    name: 'Boosters & Pacotes 3D',
    icon: '📦',
    color: '#f97316',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-950/60',
    textColor: 'text-orange-300',
    description: 'Pacotes colecionáveis em 3D foil, taxas de raridade e simulador de abertura',
    subCategories: [
      {
        id: 'booster_types',
        name: 'Pacotes Colecionáveis (TabPacks)',
        icon: '🎁',
        items: [
          { id: 'bst-classic', label: 'Booster: Edição Clássica de Slimeslands', badge: 'Clássico', icon: '📦', description: 'Contém 5 cartas com garantia de pelo menos 1 carta rara.' },
          { id: 'bst-elemental', label: 'Booster: Fúria Elemental do Fogo & Veneno', badge: 'Elemental', icon: '🔥', description: 'Maior probabilidade de cartas de dano mágico e feitiços.' },
          { id: 'bst-diamond', label: 'Booster: Diamante Lendário do Rei Slime', badge: 'Lendário', icon: '💎', description: 'Chance triplicada de cartas foil brilhantes e artefatos únicos.' },
        ],
      },
      {
        id: 'rates_mechanics',
        name: 'Mecânicas de Abertura & Taxas',
        icon: '🎲',
        items: [
          { id: 'bst-rate-std', label: 'Taxas Padrão: 70% Comum / 25% Rara / 5% Lendária', badge: 'Drop Rates', icon: '📊', description: 'Distribuição matemática oficial dos sorteios de cartas.' },
          { id: 'bst-anim-tear', label: 'Animação 3D: Rasgar Pacote com Física Foil', badge: 'Three.js', icon: '✂️', description: 'Emulador interativo onde o jogador arrasta para abrir o pacote.' },
        ],
      },
    ],
  },

  // 5. CENÁRIOS & TELAS DE FUNDO (TabScenarios)
  {
    id: 'scenarios',
    name: 'Cenários & Telas de Fundo',
    icon: '🌄',
    color: '#10b981',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-950/60',
    textColor: 'text-emerald-300',
    description: 'Campos de batalha, lobby, arena 3x1, academia e cenários de fundo dinâmicos',
    subCategories: [
      {
        id: 'game_screens',
        name: 'Telas Principais do Jogo (SCENARIO_SCREENS)',
        icon: '🖥️',
        items: [
          { id: 'scn-lobby', label: 'Cenário: Tela Inicial / Lobby Principal', badge: 'Lobby', icon: '🏰', description: 'Fundo do castelo com nuvens lentas e iluminação de boas-vindas.' },
          { id: 'scn-battle', label: 'Cenário: Campo de Batalha (Mesa do Duelo)', badge: 'Batalha', icon: '⚔️', description: 'Tabulheiro táctil onde as cartas duelam com efeitos de impacto.' },
          { id: 'scn-boss-3x1', label: 'Cenário: Duelo de Chefe Mobby (Arena 3x1)', badge: 'Boss 3x1', icon: '👹', description: 'Arena dramática com o chefe gigante posicionado ao fundo.' },
          { id: 'scn-academy', label: 'Cenário: Academia de Treino & Tutoriais', badge: 'Treino', icon: '🏫', description: 'Ambiente calmo para testar combinações e ler regras.' },
          { id: 'scn-store', label: 'Cenário: Interior da Loja de Itens', badge: 'Loja', icon: '🏪', description: 'Bancadas de madeira, vitrines com poções e balcão do lojista.' },
          { id: 'scn-booster', label: 'Cenário: Mesa de Abertura de Boosters', badge: 'Abertura', icon: '✨', description: 'Iluminação focada para destacar a abertura dos pacotes em 3D.' },
          { id: 'scn-coinflip', label: 'Cenário: Cara ou Coroa / Sorteio Inicial', badge: 'Sorteio', icon: '🪙', description: 'Animação da moeda dourada para decidir quem joga primeiro.' },
        ],
      },
    ],
  },

  // 6. SOM, ÁUDIO & BGM (SoundCentralScreen)
  {
    id: 'sound',
    name: 'Som, Áudio & BGM',
    icon: '🔊',
    color: '#ec4899',
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-950/60',
    textColor: 'text-pink-300',
    description: 'Trilhas sonoras BGM, efeitos sonoros SFX de cartas, golpes e ambientes',
    subCategories: [
      {
        id: 'bgm_tracks',
        name: 'Trilhas Sonoras (BGM)',
        icon: '🎵',
        items: [
          { id: 'snd-bgm-lobby', label: 'BGM: Tema do Lobby de Slimeslands', badge: 'Lobby BGM', icon: '🎶', description: 'Música orquestrada acolhedora com flautas e sintetizadores.' },
          { id: 'snd-bgm-battle', label: 'BGM: Batalha de Cartas Dinâmica', badge: 'Combate BGM', icon: '🥁', description: 'Percussão enérgica e ritmo acelerado que se adapta ao turno.' },
          { id: 'snd-bgm-boss', label: 'BGM: Duelo do Titã Supremo (Boss Fight)', badge: 'Chefe BGM', icon: '🎸', description: 'Guitarras pesadas, coro operístico e tensão máxima.' },
          { id: 'snd-bgm-cave', label: 'BGM: Cavernas Subterrâneas e Eco', badge: 'Ambiente', icon: '💧', description: 'Gotas de água pingando, eco distante e acordes misteriosos.' },
        ],
      },
      {
        id: 'sfx_effects',
        name: 'Efeitos Sonoros (SFX)',
        icon: '🔉',
        items: [
          { id: 'snd-sfx-card-play', label: 'SFX: Lançar Carta na Mesa (Whoosh)', badge: 'Carta', icon: '🎴', description: 'Som suave de vento e atrito com a superfície de jogo.' },
          { id: 'snd-sfx-slime-hit', label: 'SFX: Impacto Gelatinoso / Splash', badge: 'Golpe', icon: '💦', description: 'Som característico de bater em uma criatura de slime.' },
          { id: 'snd-sfx-victory', label: 'SFX: Fanfarra Triunfal de Vitória', badge: 'Vitória', icon: '🎺', description: 'Acordes de trompete com aplausos e explosão de confetes.' },
          { id: 'snd-sfx-defeat', label: 'SFX: Som de Derrota e Desintegração', badge: 'Derrota', icon: '💀', description: 'Som sombrio com sino grave indicando fim de jogo.' },
        ],
      },
    ],
  },

  // 7. MOBBYS & DUELOS DE CHEFES (TabMobbys)
  {
    id: 'mobbys',
    name: 'Mobbys & Duelos 3x1',
    icon: '👹',
    color: '#ef4444',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-950/60',
    textColor: 'text-red-300',
    description: 'Chefes com IA autônoma, diálogos por HP/Turno, recompensas e cartas vinculadas',
    subCategories: [
      {
        id: 'mobby_bosses',
        name: 'Chefes Mobbys Principais',
        icon: '👾',
        items: [
          { id: 'mob-titan', label: 'Mobby: Titã de Gosma (HP: 200 / ATK: 35)', badge: 'Colossal', icon: '👹', description: 'Chefe brutal com 200 de HP que causa terremotos e dano em área.' },
          { id: 'mob-queen', label: 'Mobby: Rainha Slime Tóxica (HP: 160 / ATK: 28)', badge: 'Veneno', icon: '👑', description: 'Cospe poças de ácido no tabuleiro e invoca pequenos ajudantes.' },
          { id: 'mob-golden', label: 'Mobby: Rei Slime Dourado (HP: 300 / ATK: 45)', badge: 'Supremo', icon: '🏆', description: 'O monarca supremo que cura a si mesmo e repele magias.' },
        ],
      },
      {
        id: 'mobby_dialogues',
        name: 'Gatilhos de Diálogo no Duelo',
        icon: '💬',
        items: [
          { id: 'mob-dlg-hp50', label: 'Gatilho: Diálogo ao Chegar a 50% de HP', badge: 'Fase 2', icon: '⚠️', description: 'O Mobby entra em modo fúria e grita ameaçando o jogador.' },
          { id: 'mob-dlg-turn3', label: 'Gatilho: Diálogo no Turno 3 de Batalha', badge: 'Turno', icon: '⏳', description: 'O Mobby canaliza seu ataque supremo e avisa para se preparar.' },
          { id: 'mob-dlg-defeat', label: 'Gatilho: Fala de Derrota do Chefe', badge: 'Fim', icon: '💀', description: 'Reconhece o poder do herói e entrega a carta de recompensa.' },
        ],
      },
    ],
  },

  // ==========================================
  // ECOSSISTEMA MARKER DREAM (WORLD ENGINE)
  // ==========================================

  // 8. MARCADORES DO MAPA (Marker Studio)
  {
    id: 'markers',
    name: 'Marcadores do Mapa',
    icon: '📍',
    color: '#ef4444',
    borderColor: 'border-rose-500',
    bgColor: 'bg-rose-950/60',
    textColor: 'text-rose-300',
    description: 'Pontos interativos, portais de viagem, coletáveis, chefes e acampamentos',
    subCategories: [
      {
        id: 'marker_functional',
        name: 'Marcadores Funcionais & Mecânicas',
        icon: '⚙️',
        items: [
          { id: 'mrk-travel', label: 'Portal Travel (Teleporte / Fase / Sub-Bioma)', badge: 'Viagem', icon: '🌌', description: 'Permite transição instantânea de fase, mapa ou sub-bioma interior.', type: 'travel' },
          { id: 'mrk-collectible', label: 'Item Interativo Coletável (Bolsa / Inventário)', badge: 'Coletável', icon: '📦', description: 'Item no chão que o herói pode recolher para a mochila.', type: 'collectible' },
          { id: 'mrk-deliverable', label: 'Ponto Entregável (Destino de Quest)', badge: 'Entrega', icon: '🚩', description: 'Local onde se entrega itens para concluir missões ativas.', type: 'deliverable' },
          { id: 'mrk-event', label: 'Gatilho de Evento de Área', badge: 'Evento', icon: '⚡', description: 'Dispara eventos cinematográficos, sons ou emboscadas ao se aproximar.', type: 'event' },
          { id: 'mrk-area', label: 'Zona de Efeito (Área de Aplicação)', badge: 'Área', icon: '⭕', description: 'Aplica cura, lentidão, veneno ou dano contínuo enquanto estiver dentro.', type: 'area' },
          { id: 'mrk-screen', label: 'Tela Interativa / Minigame Popover', badge: 'Tela', icon: '📱', description: 'Abre modal customizado de minigame, diálogo ou roleta ao interagir.', type: 'interactive_screen' },
          { id: 'mrk-light', label: 'Ponto de Luz & Iluminação Dinâmica', badge: 'Luz', icon: '💡', description: 'Tocha ou cristal que dissipa a névoa e projeta sombras no terreno.', type: 'light' },
          { id: 'mrk-neutral', label: 'Objeto Cenográfico Neutro', badge: 'Cenário', icon: '🪨', description: 'Decoração estática ou física interativa sem lógica pesada.', type: 'neutral' },
        ],
      },
      {
        id: 'marker_pois',
        name: 'Pontos de Interesse (POIs no Mapa)',
        icon: '🏰',
        items: [
          { id: 'mrk-camp', label: 'Acampamento de Descanso & Checkpoint', badge: 'Acampamento', icon: '⛺', description: 'Ponto seguro onde o herói recupera vida e salva o progresso.', type: 'camp' },
          { id: 'mrk-town', label: 'Vila / Povoado dos Slimes', badge: 'Vila', icon: '🏘️', description: 'Centro comercial com mercadores, curandeiros e NPCs.', type: 'town' },
          { id: 'mrk-castle', label: 'Castelo Real & Fortaleza', badge: 'Castelo', icon: '🏰', description: 'Sede da guarda real ou palácio dos nobres de gel.', type: 'castle' },
          { id: 'mrk-boss', label: 'Arena de Chefe (Boss Lair)', badge: 'Chefe', icon: '💀', description: 'Entrada para arena fechada onde o chefe aguarda.', type: 'boss' },
          { id: 'mrk-treasure', label: 'Baú de Tesouro / Relíquia Mística', badge: 'Tesouro', icon: '💎', description: 'Contém ouro, gemas raras, boosters de cartas e artefatos.', type: 'treasure' },
          { id: 'mrk-shrine', label: 'Santuário de Benção Elemental', badge: 'Santuário', icon: '⛩️', description: 'Concede bônus permanente de atributos ou restaura mana.', type: 'shrine' },
          { id: 'mrk-portal', label: 'Portal Dimensional de Fenda', badge: 'Portal', icon: '🌀', description: 'Conexão para outras dimensões e mundos secretos.', type: 'portal' },
          { id: 'mrk-oasis', label: 'Oásis Restaurador de Slime', badge: 'Oásis', icon: '🌴', description: 'Piscina de gel puro que limpa maldições e venenos.', type: 'oasis' },
          { id: 'mrk-cave', label: 'Entrada de Caverna Subterrânea', badge: 'Caverna', icon: '🕳️', description: 'Desce para minas escuras e salões de cristal.', type: 'cave' },
          { id: 'mrk-tower', label: 'Torre de Vigia & Mirante', badge: 'Torre', icon: '🗼', description: 'Revela toda a névoa de guerra ao redor quando ativada.', type: 'tower' },
          { id: 'mrk-ruins', label: 'Ruínas Antigas Esquecidas', badge: 'Ruínas', icon: '🏛️', description: 'Paredes em escombros com inscrições históricas.', type: 'ruins' },
          { id: 'mrk-port', label: 'Porto & Doca do Mar de Geleia', badge: 'Porto', icon: '⚓', description: 'Embarque para travessia marítima viscosa.', type: 'port' },
        ],
      },
      {
        id: 'marker_modules',
        name: 'Módulos Avançados de Marcador',
        icon: '🧰',
        items: [
          { id: 'mrk-mod-station', label: 'Estação de Crafting / Forja Anexada', badge: 'Forja', icon: '🔨', description: 'Permite criar itens, fundir cartas e melhorar equipamentos.' },
          { id: 'mrk-mod-npc', label: 'Comportamento NPC & Falas no Marcador', badge: 'NPC', icon: '🗣️', description: 'Ativa diálogos por proximidade e balões de conversa.' },
          { id: 'mrk-mod-patrol', label: 'Trajeto de Patrulha / Slime Hop', badge: 'Patrulha', icon: '🦘', description: 'Define waypoints e pulinhos animados no mapa.' },
          { id: 'mrk-mod-solid', label: 'Colisão Sólida & Barreira Física', badge: 'Física', icon: '🧱', description: 'Impede o jogador e inimigos de atravessar o marcador.' },
        ],
      },
    ],
  },

  // 9. GALERIA DE ASSETS & RECURSOS (Asset Gallery Studio)
  {
    id: 'assets',
    name: 'Galeria de Assets & Recursos',
    icon: '🖼️',
    color: '#06b6d4',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-950/60',
    textColor: 'text-cyan-300',
    description: 'Sprites, vídeos transparentes Chroma Key, carimbos e telas',
    subCategories: [
      {
        id: 'asset_motion',
        name: 'Motion Canvas Sprites',
        icon: '🎬',
        items: [
          { id: 'ast-mot-slime', label: 'Sprite Animado: Slime Jelly Hop', badge: 'Motion', icon: '🟢', description: 'Animação fluida de pulo e aterrissagem gelatinosa.' },
          { id: 'ast-mot-boss', label: 'Sprite Animado: Titã com Fúria', badge: 'Boss Motion', icon: '👹', description: 'Ciclo de ataque, socos sismológicos e rugido.' },
          { id: 'ast-mot-chest', label: 'Sprite Animado: Baú Dourado Abrindo', badge: 'Interativo', icon: '📦', description: 'Tampa elástica que se abre com explosão de luz.' },
        ],
      },
      {
        id: 'asset_screens',
        name: 'Telas Interativas & Emuladores',
        icon: '📱',
        items: [
          { id: 'ast-scr-dialogue', label: 'Tela: Diálogo Visual Portrait', badge: 'Retrato', icon: '🎭', description: 'Emulador com expressões do NPC, áudio e escolhas.' },
          { id: 'ast-scr-booster', label: 'Tela: Abertura de Boosters 3D', badge: 'Cartas', icon: '🎴', description: 'Simulador tátil de rasgar pacotes colecionáveis.' },
          { id: 'ast-scr-inventory', label: 'Tela: Bolsa & Inventário de Fases', badge: 'Bolsa', icon: '🎒', description: 'Grade de slots com estatísticas e organização rápida.' },
        ],
      },
      {
        id: 'asset_inventory',
        name: 'Itens de Inventário & Exploração',
        icon: '🎒',
        items: [
          { id: 'ast-itm-potion-hp', label: 'Poção: Elixir de Vida Gelatinoso', badge: 'Cura', icon: '🧪', description: 'Restaura 50 pontos de vida instantaneamente.' },
          { id: 'ast-itm-key-gold', label: 'Chave: Chave Dourada da Fortaleza', badge: 'Chave', icon: '🗝️', description: 'Abre os portões principais do castelo do Rei Slime.' },
          { id: 'ast-itm-gem-pure', label: 'Minério: Gema de Quartzo Puro', badge: 'Material', icon: '💎', description: 'Material nobre para forjar equipamentos lendários.' },
        ],
      },
      {
        id: 'asset_stamps',
        name: 'Carimbos de Terreno (Stamps)',
        icon: '🏷️',
        items: [
          { id: 'ast-stmp-trees', label: 'Carimbo: Bosque de Pinheiros & Flores', badge: 'Vegetação', icon: '🌲', description: 'Pinta grupos de árvores com sombreamento suave.' },
          { id: 'ast-stmp-rocks', label: 'Carimbo: Formações Rochosas de Mina', badge: 'Pedras', icon: '🪨', description: 'Pedras musgosas com cristais cravados.' },
          { id: 'ast-stmp-crystals', label: 'Carimbo: Cristais Luminescentes Azuis', badge: 'Brilho', icon: '✨', description: 'Cristais que emitem luz pulsante no escuro.' },
        ],
      },
      {
        id: 'asset_video',
        name: 'Vídeos Chroma Key Transparentes',
        icon: '🎥',
        items: [
          { id: 'ast-vid-portal', label: 'Vídeo: Vórtice Dimensional Chroma Key', badge: 'MP4 Verde', icon: '🌀', description: 'Animação de vórtice rodando com fundo removido via software.' },
          { id: 'ast-vid-fire', label: 'Vídeo: Fogueira Crepitante de Gel', badge: 'Fogo', icon: '🔥', description: 'Fogo borbulhante realista com faíscas dinâmicas.' },
        ],
      },
    ],
  },

  // 10. FASES, NÍVEIS & LIMITES (Level & Biome Studio)
  {
    id: 'levels',
    name: 'Fases, Níveis & Limites',
    icon: '🏰',
    color: '#3b82f6',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-950/60',
    textColor: 'text-blue-300',
    description: 'Fases da campanha, sub-biomas, grades de colisão e limites de câmera',
    subCategories: [
      {
        id: 'campaign',
        name: 'Fases da Campanha Principal',
        icon: '🗺️',
        items: [
          { id: 'lvl-01', label: 'Fase 01 - Floresta de Gosma', badge: 'Prólogo', icon: '🌲', description: 'Tutorial, planícies abertas e introdução às mecânicas de salto.' },
          { id: 'lvl-02', label: 'Fase 02 - Caverna de Cristal', badge: 'Caverna', icon: '💎', description: 'Cenário subterrâneo com plataformas de espinhos luminescentes.' },
          { id: 'lvl-03', label: 'Fase 03 - Ruínas de Éter', badge: 'Ruínas', icon: '🏛️', description: 'Templos esquecidos com portas de quebra-cabeça e portais.' },
          { id: 'lvl-04', label: 'Fase 04 - Vulcão Borbulhante', badge: 'Lava', icon: '🌋', description: 'Magma gelatinoso, altas temperaturas e plataformas cadentes.' },
          { id: 'lvl-05', label: 'Fase 05 - Fortaleza do Rei Slime', badge: 'Castelo', icon: '👑', description: 'Cidadela fortificada com armadilhas e confronto final.' },
        ],
      },
      {
        id: 'sub_biomes',
        name: 'Sub-Biomas Interiores & Salas',
        icon: '🚪',
        items: [
          { id: 'sub-cave', label: 'Sub-Bioma: Caverna Subterrânea Oculta', badge: 'Interior', icon: '🕳️', description: 'Câmara secreta com lago de gel restaurador.' },
          { id: 'sub-dungeon', label: 'Sub-Bioma: Masmorra dos Mobbys', badge: 'Masmorra', icon: '⛓️', description: 'Prisão escura com celas e chaves penduradas.' },
          { id: 'sub-throne', label: 'Sub-Bioma: Salão do Trono Real', badge: 'Trono', icon: '🪑', description: 'Tapete vermelho viscoso e colunas de ouro.' },
        ],
      },
      {
        id: 'limits_collision',
        name: 'Limites, Colisão & Pincel de Parede',
        icon: '🧱',
        items: [
          { id: 'lim-walkable', label: 'Pincel: Grade Caminhável (Walkable)', badge: 'Piso', icon: '🟩', description: 'Área permitida onde o personagem pode andar livremente.' },
          { id: 'lim-blocked', label: 'Pincel: Paredes Sólidas (Blocked Walls)', badge: 'Bloqueio', icon: '🟥', description: 'Impede passagem física e colisão de projéteis.' },
          { id: 'lim-cage', label: 'Limites de Câmera da Fase (Boundary Box)', badge: 'Câmera', icon: '📐', description: 'Trava a câmera do jogo para não sair das bordas do cenário.' },
        ],
      },
      {
        id: 'challenges',
        name: 'Modos de Desafio',
        icon: '⚔️',
        items: [
          { id: 'lvl-rush', label: 'Desafio: Boss Rush Supremo', badge: 'Boss Rush', icon: '💀', description: 'Batalha consecutiva contra todos os chefes com 1 vida.' },
          { id: 'lvl-surv', label: 'Desafio: Sobrevivência de Hordas', badge: 'Horda', icon: '🛡️', description: 'Resista a ondas intermináveis de inimigos em fúria.' },
          { id: 'lvl-time', label: 'Desafio: Parkour Contra o Relógio', badge: 'Time Attack', icon: '⏱️', description: 'Chegue ao fim antes que a lava de gosma alcance você.' },
        ],
      },
    ],
  },

  // 11. EVENTOS MUNDIAIS & GERAIS (Event Gallery Studio)
  {
    id: 'events',
    name: 'Eventos Mundiais & Gerais',
    icon: '⚡',
    color: '#eab308',
    borderColor: 'border-yellow-500',
    bgColor: 'bg-yellow-950/60',
    textColor: 'text-yellow-300',
    description: 'Cataclismos globais, gatilhos de fase, alertas e aparições',
    subCategories: [
      {
        id: 'world_events',
        name: 'Eventos Mundiais Globais',
        icon: '🌍',
        items: [
          { id: 'evt-blood', label: 'Evento: Lua de Sangue', badge: 'Fúria', icon: '🌕', description: 'Slimes ficam enfurecidos, recebendo +50% de velocidade e dano.' },
          { id: 'evt-gold-rain', label: 'Evento: Chuva de Gosma Dourada', badge: 'Bônus', icon: '💰', description: 'Chuva contínua de moedas e boosters raros por 2 minutos.' },
          { id: 'evt-eclipse', label: 'Evento: Eclipse Elemental', badge: 'Magia', icon: '🌑', description: 'Inversão das fraquezas e poderes elementais no mundo todo.' },
          { id: 'evt-invasion', label: 'Evento: Grande Invasão Mobby', badge: 'Invasão', icon: '🚨', description: 'Hordas de monstros marcham atacando as vilas dos NPCs.' },
        ],
      },
      {
        id: 'phase_triggers',
        name: 'Gatilhos de Fase & Efeitos',
        icon: '💥',
        items: [
          { id: 'evt-meteor', label: 'Gatilho: Queda de Meteorito de Gel', badge: 'Terreno', icon: '☄️', description: 'Cria uma cratera no chão repleta de minério espacial.' },
          { id: 'evt-collapse', label: 'Gatilho: Desmoronamento de Túnel', badge: 'Dinamite', icon: '🪨', description: 'Bloqueia o caminho principal e abre uma rota secreta.' },
          { id: 'evt-totem', label: 'Gatilho: Despertar do Totem Ancestral', badge: 'Proteção', icon: '🗿', description: 'Projeta um campo de força que repele monstros da área.' },
          { id: 'evt-ambush', label: 'Gatilho: Emboscada Surpresa', badge: 'Alerta', icon: '⚠️', description: 'Monstros caem do teto ao pisar em uma armadilha.' },
        ],
      },
      {
        id: 'random_events',
        name: 'Eventos Gerais & Aleatórios',
        icon: '🎲',
        items: [
          { id: 'evt-merchant', label: 'Evento: Mercador Ambulante Secreto', badge: 'NPC', icon: '🧳', description: 'Aparece aleatoriamente vendendo artefatos místicos por 3 min.' },
          { id: 'evt-mimic', label: 'Evento: Baú Mímico Traiçoeiro', badge: 'Mímico', icon: '📦', description: 'Parece um baú dourado mas ataca com presas afiadas.' },
          { id: 'evt-rift', label: 'Evento: Fenda Dimensional Instável', badge: 'Fenda', icon: '🌀', description: 'Abre um portal temporário para o mundo reverso de slime.' },
        ],
      },
    ],
  },

  // 12. NPCS, DIÁLOGOS & MOBBYS (NPC & Dialogue Studio)
  {
    id: 'npcs',
    name: 'NPCs, Diálogos & Mobbys',
    icon: '🧙‍♂️',
    color: '#10b981',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-950/60',
    textColor: 'text-emerald-300',
    description: 'Habitantes amigáveis, monstros comuns, chefes titânicos e diálogos',
    subCategories: [
      {
        id: 'allies',
        name: 'NPCs Aliados & Mestres',
        icon: '🤝',
        items: [
          { id: 'npc-glub', label: 'Mestre Glub (Mentor Slime)', badge: 'Mentor', icon: '🧙‍♂️', description: 'Guia sábio que ensina fundamentos de combate e forja.' },
          { id: 'npc-borbulha', label: 'Ferreiro Borbulha', badge: 'Forja', icon: '🔨', description: 'Combina fragmentos de cartas e aprimora armaduras.' },
          { id: 'npc-lily', label: 'Alquimista Lily', badge: 'Poções', icon: '🧪', description: 'Prepara elixires de cura e resistência ácida.' },
          { id: 'npc-zephyr', label: 'Cartógrafo Zephyr', badge: 'Mapas', icon: '🧭', description: 'Vende mapas de tesouros e marca caminhos secretos.' },
        ],
      },
      {
        id: 'mobbys',
        name: 'Mobbys & Inimigos Comuns',
        icon: '👾',
        items: [
          { id: 'npc-warrior', label: 'Slime Guerreiro Mobby', badge: 'Soldado', icon: '🗡️', description: 'Usa espada de obsidiana e capacete de pedra resistente.' },
          { id: 'npc-jumper', label: 'Gosminha Saltitante', badge: 'Rápido', icon: '🟢', description: 'Inimigo ágil que ataca pulando em bandos coordenados.' },
          { id: 'npc-spiky', label: 'Slime Espinhoso', badge: 'Tanque', icon: '🦔', description: 'Reflete 30% do dano físico recebido com espinhos.' },
          { id: 'npc-bat', label: 'Morcego de Geléia Alado', badge: 'Voador', icon: '🦇', description: 'Ataca rasante e atordoa o herói com sons agudos.' },
        ],
      },
      {
        id: 'bosses',
        name: 'Chefes & Mini-Bosses',
        icon: '👹',
        items: [
          { id: 'npc-titan', label: 'Titã de Gosma (Chefe)', badge: 'Chefe', icon: '👹', description: 'Gigante colossal que causa terremotos no campo de batalha.' },
          { id: 'npc-queen', label: 'Rainha Slime Tóxica', badge: 'Chefe', icon: '👑', description: 'Cospe ácido corrosivo e invoca pequenos ajudantes.' },
          { id: 'npc-king', label: 'Rei Slime Dourado Supremo', badge: 'Chefe Final', icon: '🏆', description: 'Monarca supremo imune a efeitos elementais comuns.' },
        ],
      },
      {
        id: 'dialogues',
        name: 'Árvores de Diálogo & Decisões',
        icon: '💬',
        items: [
          { id: 'dlg-accept', label: 'Diálogo: Juramento da Forja', badge: 'Missão', icon: '📜', description: 'NPC entrega a primeira chave e abençoa o jogador.' },
          { id: 'dlg-secret', label: 'Diálogo: A Lenda do Slime Dourado', badge: 'Lore', icon: '✨', description: 'Dica sobre a passagem secreta na cachoeira da Fase 02.' },
          { id: 'dlg-warning', label: 'Diálogo: Alerta do Cataclismo', badge: 'Perigo', icon: '🔔', description: 'Avisa o herói sobre a ira iminente do Rei Slime.' },
        ],
      },
    ],
  },

  // 13. PERSONAGENS, CLASSES & SPAWN (Player & Spawn Studio)
  {
    id: 'characters',
    name: 'Personagens, Classes & Spawns',
    icon: '🗡️',
    color: '#a855f7',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-950/60',
    textColor: 'text-purple-300',
    description: 'Classes jogáveis, builds, habilidades e geradores de spawn',
    subCategories: [
      {
        id: 'classes',
        name: 'Classes do Jogador',
        icon: '🛡️',
        items: [
          { id: 'hero-knight', label: 'Cavaleiro Gelatinoso', badge: 'Tanque', icon: '🛡️', description: 'Defesa blindada, absorção de impacto e escudo pesado.' },
          { id: 'hero-mage', label: 'Feiticeiro de Éter', badge: 'Mago', icon: '🔮', description: 'Projéteis mágicos teleguiados e teleporte de curto alcance.' },
          { id: 'hero-archer', label: 'Arqueiro Viscoso', badge: 'Dano', icon: '🏹', description: 'Flechas perfurantes com veneno de longo alcance.' },
          { id: 'hero-bard', label: 'Bardo Borbulhante', badge: 'Suporte', icon: '🪕', description: 'Buffs de velocidade, cura melódica e atordoamento em área.' },
        ],
      },
      {
        id: 'spawns',
        name: 'Spawns & Pontos de Início (Spawn Studio)',
        icon: '🎯',
        items: [
          { id: 'spw-player-init', label: 'Spawn: Ponto Inicial do Jogador', badge: 'Ponto 0', icon: '🚩', description: 'Coordenadas exatas onde o herói nasce ao iniciar a fase.' },
          { id: 'spw-checkpoint', label: 'Spawn: Checkpoint de Renascimento', badge: 'Checkpoint', icon: '💾', description: 'Ponto seguro onde o herói renasce ao sofrer derrota.' },
          { id: 'spw-mob-generator', label: 'Spawn: Gerador Contínuo de Monstros', badge: 'Gerador', icon: '⚙️', description: 'Invoca ondas periódicas de slimes até ser destruído.' },
        ],
      },
      {
        id: 'skills',
        name: 'Habilidades & Talentos Ativos',
        icon: '✨',
        items: [
          { id: 'skl-slam', label: 'Habilidade: Impacto Sísmico de Gosma', badge: 'Ativa', icon: '💥', description: 'Salto esmagador que quebra escudos e atordoa oponentes.' },
          { id: 'skl-split', label: 'Habilidade: Divisão Celular de Emergência', badge: 'Passiva', icon: '🧬', description: 'Divide o slime em dois clones menores ao sofrer dano fatal.' },
          { id: 'skl-absorb', label: 'Habilidade: Escudo de Absorção Elemental', badge: 'Defesa', icon: '🧲', description: 'Converte 50% dos tiros inimigos em escudo protetor.' },
        ],
      },
    ],
  },

  // 14. PETS & COMPANHEIROS (Pet Studio)
  {
    id: 'pets',
    name: 'Pets & Companheiros',
    icon: '🐾',
    color: '#ec4899',
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-950/60',
    textColor: 'text-pink-300',
    description: 'Bichinhos de estimação, suportes táticos e auras de lealdade',
    subCategories: [
      {
        id: 'companions',
        name: 'Companheiros de Batalha',
        icon: '🐶',
        items: [
          { id: 'pet-mini', label: 'Pet: Mini-Slime Saltador', badge: 'Companheiro', icon: '🟢', description: 'Fiel mascote que ataca os calcanhares dos oponentes.' },
          { id: 'pet-healer', label: 'Pet: Gosminha Curandeira', badge: 'Cura', icon: '💖', description: 'Solta bolhas periódicas que recuperam 20% do HP do herói.' },
          { id: 'pet-bat', label: 'Pet: Morcego Viscoso Alado', badge: 'Voador', icon: '🦇', description: 'Voa ao redor caçando inimigos aéreos e iluminando salas.' },
          { id: 'pet-dragon', label: 'Pet: Dragãozinho de Gel', badge: 'Dragão', icon: '🐉', description: 'Cospe chamas coloridas que reduzem a defesa inimiga.' },
        ],
      },
      {
        id: 'roles',
        name: 'Funções Táticas do Pet',
        icon: '🎯',
        items: [
          { id: 'pet-role-gold', label: 'Função: Coletor de Ouro & Itens', badge: 'Utilidade', icon: '🪙', description: 'Recolhe moedas caídas automaticamente num raio de 10m.' },
          { id: 'pet-role-radar', label: 'Função: Radar de Baús & Passagens', badge: 'Sensor', icon: '📡', description: 'Vibra quando há baús ou paredes falsas próximas.' },
          { id: 'pet-role-crit', label: 'Função: Aura de Dano Crítico', badge: 'Aura', icon: '🔥', description: 'Concede +15% de chance de golpe crítico ao herói.' },
        ],
      },
      {
        id: 'bonds',
        name: 'Níveis de Vínculo & Lealdade',
        icon: '⭐',
        items: [
          { id: 'bnd-1', label: 'Vínculo Nv.1: Amizade Inicial', badge: 'Nv 1', icon: '🥉', description: '+10% na velocidade do pet ao seguir o jogador.' },
          { id: 'bnd-2', label: 'Vínculo Nv.2: Companheiro Fiel', badge: 'Nv 2', icon: '🥈', description: 'O pet revive o jogador 1x por tentativa.' },
          { id: 'bnd-3', label: 'Vínculo Nv.3: Parceria Lendária', badge: 'Nv 3', icon: '🥇', description: 'Desbloqueia o ataque Supremo Combinado Herói + Pet.' },
        ],
      },
    ],
  },

  // 15. ATMOSFERA, CLIMA & ILUMINAÇÃO (Atmosphere Studio)
  {
    id: 'atmosphere',
    name: 'Atmosfera, Clima & Luz',
    icon: '☁️',
    color: '#38bdf8',
    borderColor: 'border-sky-500',
    bgColor: 'bg-sky-950/60',
    textColor: 'text-sky-300',
    description: 'Névoa dinâmica, nuvens volumétricas, chuva ácida e tochas',
    subCategories: [
      {
        id: 'weather',
        name: 'Clima & Efeitos Dinâmicos',
        icon: '🌧️',
        items: [
          { id: 'wth-rain', label: 'Clima: Chuva Ácida Viscosa', badge: 'Chuva', icon: '🌧️', description: 'Gotas de gel que pingam causando lentidão em áreas abertas.' },
          { id: 'wth-fog', label: 'Clima: Névoa Espectral Rasteira', badge: 'Névoa', icon: '🌫️', description: 'Camada densa de fumaça que reduz o campo de visão.' },
          { id: 'wth-leaves', label: 'Clima: Vento com Esporos & Folhas', badge: 'Partículas', icon: '🍃', description: 'Folhas e poeira fosforescente voando com a direção do vento.' },
        ],
      },
      {
        id: 'clouds',
        name: 'Nuvens & Camadas de Céu (Cloud Studio)',
        icon: '⛅',
        items: [
          { id: 'cld-dense', label: 'Nuvens: Camada Volumétrica Superior', badge: 'Céu', icon: '☁️', description: 'Nuvens fofas em paralaxe que cobrem o topo da fase.' },
          { id: 'cld-storm', label: 'Nuvens: Trovoada Roxa Elétrica', badge: 'Tempestade', icon: '⚡', description: 'Nuvens escuras com relâmpagos violeta ocasionais.' },
          { id: 'cld-aurora', label: 'Nuvens: Aurora Boreal Cósmica', badge: 'Aurora', icon: '🌌', description: 'Ondulações coloridas brilhando suavemente no céu.' },
        ],
      },
      {
        id: 'lighting',
        name: 'Iluminação & Sombras (Fog Studio)',
        icon: '💡',
        items: [
          { id: 'lit-torch', label: 'Luz: Tocha de Chamas de Gel (Ponto)', badge: 'Tocha', icon: '🔥', description: 'Iluminação amarela acolhedora com sombras projetadas.' },
          { id: 'lit-crystal', label: 'Luz: Cristal Luminescente Neon (Radial)', badge: 'Cristal', icon: '💎', description: 'Brilho ciano suave com raio de alcance ajustável.' },
        ],
      },
    ],
  },

  // 16. QUESTS, MISSÕES & OBJETIVOS (Quest Maker)
  {
    id: 'quests',
    name: 'Quests, Missões & Objetivos',
    icon: '🎒',
    color: '#f97316',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-950/60',
    textColor: 'text-orange-300',
    description: 'Campanha principal, missões de personagens e caçadas diárias',
    subCategories: [
      {
        id: 'main_quests',
        name: 'História Principal (Arco do Rei Slime)',
        icon: '📖',
        items: [
          { id: 'qst-01', label: 'Capítulo 1: O Despertar da Matriz', badge: 'Principal', icon: '⭐', description: 'Desvende o segredo da forja abandonada de gosma.' },
          { id: 'qst-02', label: 'Capítulo 2: Em Busca das 4 Essências', badge: 'Principal', icon: '💠', description: 'Derrote os guardiões dos biomas e una os cristais.' },
          { id: 'qst-03', label: 'Capítulo 3: O Cerco ao Castelo Real', badge: 'Clímax', icon: '🏰', description: 'Confronte o Rei Slime e restaure a paz em Slimeslands.' },
        ],
      },
      {
        id: 'side_quests',
        name: 'Missões Secundárias & Encomendas',
        icon: '📜',
        items: [
          { id: 'qst-herbs', label: 'Missão: Ervas Luminescentes da Lily', badge: 'Coleta', icon: '🌿', description: 'Colete 10 folhas fosforescentes no pântano à noite.' },
          { id: 'qst-smith', label: 'Missão: A Marreta Perdida do Ferreiro', badge: 'Resgate', icon: '🔨', description: 'Recupere a marreta roubada por ladrões de pedra.' },
        ],
      },
      {
        id: 'bounties',
        name: 'Caçadas & Contratos de Monstros',
        icon: '🎯',
        items: [
          { id: 'bty-fire', label: 'Caçada: Eliminar 12 Slimes Ígneos', badge: 'Alvo', icon: '🔥', description: 'Recompensa: 250 moedas de ouro e 1 booster raro.' },
          { id: 'bty-titan', label: 'Contrato de Elite: Derrubar o Titã', badge: 'Elite', icon: '🏆', description: 'Recompensa: Artefato lendário "Núcleo de Gel Puro".' },
        ],
      },
    ],
  },

  // 17. MOTION CANVAS & PINCÉIS (Motion Canvas Studio)
  {
    id: 'motion',
    name: 'Motion Canvas & Pincéis',
    icon: '🎨',
    color: '#14b8a6',
    borderColor: 'border-teal-500',
    bgColor: 'bg-teal-950/60',
    textColor: 'text-teal-300',
    description: 'Física de jelly, pincéis cinéticos de sprites e deformações',
    subCategories: [
      {
        id: 'jelly_physics',
        name: 'Física de Jelly & Deformação',
        icon: '🍮',
        items: [
          { id: 'mot-squash', label: 'Motion: Squash & Stretch no Salto', badge: 'Física', icon: '↔️', description: 'Amassa e estica o slime suavemente conforme a velocidade de salto.' },
          { id: 'mot-wobble', label: 'Motion: Oscilação Jelly Harmônica', badge: 'Fluido', icon: '〰️', description: 'Ondulação gelatinosa pós-impacto com atenuação realista.' },
        ],
      },
      {
        id: 'kinetic_brush',
        name: 'Pincéis Cinéticos (Motion Brush)',
        icon: '🖌️',
        items: [
          { id: 'brsh-trail', label: 'Pincel: Trilha de Gosma Fluida Contínua', badge: 'Pincel', icon: '🎨', description: 'Deixa rastro viscoso colorido conforme o cursor se move.' },
          { id: 'brsh-stars', label: 'Pincel: Rastro de Poeira Estelar', badge: 'Luz', icon: '✨', description: 'Partículas brilhantes que flutuam e desaparecem.' },
        ],
      },
    ],
  },
];

export const getEditorMeta = (editorId?: string) => {
  const aliasMap: Record<string, string> = {
    maps: 'levels',
    cards: 'card_engine',
  };
  const resolvedId = (editorId && aliasMap[editorId]) || editorId;
  const found = EDITOR_CONTENT_CATALOG.find((cat) => cat.id === resolvedId);
  if (found) return found;
  return {
    id: 'generic',
    name: 'Módulo de Jogo',
    icon: '🔗',
    color: '#a855f7',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-950/60',
    textColor: 'text-purple-300',
    description: 'Conteúdo genérico ou integrado do ecossistema',
    subCategories: [],
  };
};

/**
 * Lê em tempo real os dados vivos da Engine (MobbyManager, Fases Salvas, Marcadores da Fase,
 * Boosters da Loja, Cenários, Áudios e Quests) e mescla com o catálogo base de 17 categorias.
 */
export function getDynamicEditorCatalog(
  project?: MapProject,
  savedLevels?: SavedLevel[]
): EditorCategoryDef[] {
  const catalog: EditorCategoryDef[] = JSON.parse(JSON.stringify(EDITOR_CONTENT_CATALOG));

  const findCat = (id: string) => catalog.find((c) => c.id === id);

  // 1. Mobbys reais do MobbyManager
  try {
    const mobbys = MobbyManager.getMobbys();
    const mobbyCat = findCat('mobbys');
    if (mobbyCat && mobbys.length > 0) {
      mobbyCat.subCategories.unshift({
        id: 'live_mobbys',
        name: 'Chefes Mobbys Ativos (Tempo Real)',
        icon: '🔥',
        items: mobbys.map((m) => ({
          id: `live-mobby-${m.id}`,
          realEntityId: m.id,
          label: `Mobby: ${m.name} (HP: ${m.hp} / ATK: ${m.atk})`,
          badge: `HP ${m.hp}`,
          icon: '👹',
          description: m.description || 'Chefe Mobby 3x1 sincronizado com o banco de dados.',
          initialQuickConfig: {
            mobbyId: m.id,
            hp: m.hp,
            maxHp: m.maxHp || m.hp,
            atk: m.atk,
            scale: m.scale ?? 100,
            rewardCardId: m.rewardCardId,
            artifacts: m.artifacts || [],
            mobbyDialogues: m.dialogues || [],
            backgroundUrl: m.backgroundUrl,
            bgmUrl: m.bgmUrl,
            sfxUrl: m.attackSfxUrl,
          },
        })),
      });
    }
  } catch {}

  // 2. Fases Salvas e Biomas reais do Marker Dream
  try {
    const levelsCat = findCat('levels');
    if (levelsCat) {
      if (savedLevels && savedLevels.length > 0) {
        levelsCat.subCategories.unshift({
          id: 'live_saved_levels',
          name: 'Fases Salvas no Marker Dream (Tempo Real)',
          icon: '💾',
          items: savedLevels.map((lvl) => ({
            id: `live-lvl-${lvl.id}`,
            realEntityId: lvl.id,
            label: `Fase: ${lvl.name}`,
            badge: lvl.stats?.canvasKind === 'extended' ? 'Extended' : 'Vertical',
            icon: '🗺️',
            description:
              lvl.description ||
              `${lvl.stats?.markersCount ?? (lvl.projectData?.markers?.length || 0)} marcadores • ${
                lvl.stats?.biomesCount ?? (lvl.projectData?.biomes?.length || 0)
              } biomas`,
          })),
        });
      }
      if (project && (project.biomes?.length > 0 || (project.subBiomes && project.subBiomes.length > 0))) {
        const biomeItems: EditorCatalogItem[] = [
          ...(project.biomes || []).map((b) => ({
            id: `live-biome-${b.id}`,
            realEntityId: b.id,
            label: `Bioma: ${b.name}`,
            badge: 'Bioma Ativo',
            icon: '🌲',
            description: `Velocidade: ${b.walkSpeed ?? 1}x • Zoom: ${b.cameraZoom ?? 1}x`,
            initialQuickConfig: {
              bgmUrl: b.bgmAudioUrl,
              audioVolume: b.bgmVolume ?? 0.7,
              weatherType: (b.biomeEvent as any) || 'none',
            },
          })),
          ...(project.subBiomes || []).map((sb) => ({
            id: `live-subbiome-${sb.id}`,
            realEntityId: sb.id,
            label: `Sub-Bioma: ${sb.name}`,
            badge: 'Sub-Bioma',
            icon: '🚪',
            description: sb.description || 'Ambiente interior ou arena instanciada.',
            initialQuickConfig: {
              bgmUrl: sb.bgmAudioUrl,
              audioVolume: sb.bgmVolume ?? 0.7,
              weatherType: (sb.biomeEvent as any) || 'none',
            },
          })),
        ];
        if (biomeItems.length > 0) {
          levelsCat.subCategories.push({
            id: 'live_project_biomes',
            name: 'Biomas & Sub-Biomas da Fase Atual',
            icon: '🌿',
            items: biomeItems,
          });
        }
      }
    }
  } catch {}

  // 3. Marcadores e NPCs reais da Fase Ativa
  try {
    if (project && Array.isArray(project.markers) && project.markers.length > 0) {
      const markersCat = findCat('markers');
      const npcsCat = findCat('npcs');
      const nonGrassMarkers = project.markers.filter(
        (m) => !m.id.startsWith('terrain-grass-') && !m.id.startsWith('terrain-flower-')
      );

      if (markersCat && nonGrassMarkers.length > 0) {
        markersCat.subCategories.unshift({
          id: 'live_phase_markers',
          name: 'Marcadores na Fase Atual (Tempo Real)',
          icon: '📍',
          items: nonGrassMarkers.slice(0, 40).map((m) => ({
            id: `live-mrk-${m.id}`,
            realEntityId: m.id,
            label: `${m.name} (${m.type})`,
            badge: m.type.toUpperCase(),
            icon: m.type === 'boss' ? '💀' : m.type === 'travel' || m.type === 'portal' ? '🌀' : m.type === 'light' ? '💡' : '📍',
            description: m.description || `Posição (${Math.round(m.x)}, ${Math.round(m.y)}) na fase atual.`,
            type: m.type,
            initialQuickConfig: {
              markerId: m.id,
              markerType: m.type,
              solidCollision: !!m.solidCollision,
              hasLight: m.type === 'light' || !!m.lightConfig,
              lightRadius: m.lightConfig?.radius ?? 160,
              lightColor: m.lightConfig?.color ?? '#f59e0b',
              lightFlicker: m.lightConfig?.flicker ?? true,
              isPortal: m.type === 'travel' || m.type === 'portal',
              travelTargetType: m.travelTargetType || 'level',
              travelTargetId: m.targetLevelId || m.targetTravelMarkerId || m.targetSubBiomeId,
              travelAuto: m.travelAuto ?? true,
              npcBounce: m.npcBounce ?? true,
              jellyEffect: (m.effect as any) || 'jelly',
              actionNpcEnabled: !!m.actionNpc?.enabled,
              actionNpcRole: (m.actionNpc?.role as any) || 'hostile',
              hp: m.actionNpc?.health ?? m.actionNpc?.maxHp ?? 100,
              maxHp: m.actionNpc?.maxHp ?? 100,
              atk: m.actionNpc?.attackDamage ?? 15,
              speakerName: m.dialogueCharacterName || m.name,
              dialogueText: m.dialogueText || m.dialogueSteps?.[0]?.text || m.npcPhrases?.[0] || '',
              npcPhrases: m.npcPhrases || [],
            },
          })),
        });
      }

      const npcMarkers = nonGrassMarkers.filter(
        (m) => m.type === 'npc' || m.type === 'boss' || m.dialogueEnabled || m.actionNpc?.enabled
      );
      if (npcsCat && npcMarkers.length > 0) {
        npcsCat.subCategories.unshift({
          id: 'live_phase_npcs',
          name: 'NPCs & Chefes na Fase Atual (Tempo Real)',
          icon: '🗣️',
          items: npcMarkers.map((m) => ({
            id: `live-npc-${m.id}`,
            realEntityId: m.id,
            label: `${m.name}`,
            badge: m.actionNpc?.enabled ? `HP ${m.actionNpc.maxHp || 100}` : 'NPC',
            icon: m.type === 'boss' ? '👹' : '🧙‍♂️',
            description: m.dialogueText || m.npcPhrases?.[0] || m.description || 'NPC interativo na fase.',
            initialQuickConfig: {
              markerId: m.id,
              markerType: m.type,
              hp: m.actionNpc?.health ?? m.actionNpc?.maxHp ?? 100,
              maxHp: m.actionNpc?.maxHp ?? 100,
              atk: m.actionNpc?.attackDamage ?? 15,
              actionNpcEnabled: !!m.actionNpc?.enabled,
              actionNpcRole: (m.actionNpc?.role as any) || 'peaceful',
              speakerName: m.dialogueCharacterName || m.name,
              dialogueText: m.dialogueText || m.dialogueSteps?.[0]?.text || m.npcPhrases?.[0] || '',
              npcPhrases: m.npcPhrases || [],
            },
          })),
        });
      }
    }
  } catch {}

  // 4. Boosters e Loja reais (store.json / localStorage)
  try {
    let storeData: any = defaultStoreJson;
    if (typeof window !== 'undefined') {
      const rawStore = localStorage.getItem('forge_store');
      if (rawStore) {
        storeData = JSON.parse(rawStore);
      }
    }
    const boostersCat = findCat('boosters');
    if (boostersCat && Array.isArray(storeData?.packs) && storeData.packs.length > 0) {
      boostersCat.subCategories.unshift({
        id: 'live_store_packs',
        name: 'Boosters Reais da Loja (TabPacks)',
        icon: '📦',
        items: storeData.packs.map((p: any) => ({
          id: `live-pack-${p.id}`,
          realEntityId: p.id,
          label: `Booster: ${p.name} (${p.cardsCount || 5} cartas)`,
          badge: `${p.price || 0} ${p.currency || 'gold'}`,
          icon: '🎁',
          description: p.desc || 'Pacote 3D configurado no TabPacks.',
          initialQuickConfig: {
            packId: p.id,
            price: p.price ?? 0,
            currency: p.currency === 'gems' ? 'gems' : 'gold',
            cardsCount: p.cardsCount ?? 9,
            packMode: p.mode || 'special',
            dropRates: p.rates || { common: 75, rare: 20, legendary: 5 },
            published: p.published ?? true,
          },
        })),
      });
    }
  } catch {}

  // 5. Cenários reais (TabScenarios / scenarios.json)
  try {
    let scenariosData: any = defaultScenariosJson;
    if (typeof window !== 'undefined') {
      const rawScn = localStorage.getItem('forge_scenarios');
      if (rawScn) {
        scenariosData = { ...scenariosData, ...JSON.parse(rawScn) };
      }
    }
    const scnCat = findCat('scenarios');
    if (scnCat && scenariosData) {
      const meta = scenariosData.__meta || {};
      scnCat.subCategories[0].items = scnCat.subCategories[0].items.map((item) => {
        const keyMap: Record<string, string> = {
          'scn-lobby': 'lobby',
          'scn-battle': 'battle',
          'scn-boss-3x1': 'boss_battle',
          'scn-academy': 'academy',
          'scn-store': 'store',
          'scn-booster': 'booster',
          'scn-coinflip': 'coin_flip',
        };
        const scnKey = keyMap[item.id] || item.id.replace('scn-', '');
        const m = meta[scnKey] || {};
        return {
          ...item,
          realEntityId: scnKey,
          initialQuickConfig: {
            scenarioScreenId: scnKey,
            backgroundUrl: m.url || '/cards/Obscure_summoning_dnd_battle_map.jpg',
            particleType: m.particles?.type || 'none',
          },
        };
      });
    }
  } catch {}

  // 6. Sons reais (sounds.json)
  try {
    const soundCat = findCat('sound');
    if (soundCat && Array.isArray((defaultSoundsJson as any)?.library)) {
      soundCat.subCategories.push({
        id: 'live_sound_library',
        name: 'Biblioteca de Áudio do Disco (/sounds)',
        icon: '🎧',
        items: (defaultSoundsJson as any).library.map((s: any, idx: number) => ({
          id: `live-snd-${idx}`,
          realEntityId: s.url,
          label: `Áudio: ${s.name}`,
          badge: s.url.endsWith('.mp3') ? 'BGM/MP3' : 'SFX/WAV',
          icon: s.url.endsWith('.mp3') ? '🎵' : '🔊',
          description: `Arquivo: ${s.url}`,
          initialQuickConfig: {
            bgmUrl: s.url.endsWith('.mp3') ? s.url : undefined,
            sfxUrl: !s.url.endsWith('.mp3') ? s.url : undefined,
            audioVolume: 0.8,
          },
        })),
      });
    }
  } catch {}

  // 7. Quests reais do Projeto (Quest System V2)
  try {
    const questsCat = findCat('quests');
    const projectQuests = project?.questsConfig?.quests || [];
    if (questsCat && projectQuests.length > 0) {
      questsCat.subCategories.unshift({
        id: 'live_project_quests',
        name: 'Quests Ativas do Projeto (V2)',
        icon: '⚡',
        items: projectQuests.map((q) => ({
          id: `live-qst-${q.id}`,
          realEntityId: q.id,
          label: `Quest: ${q.title}`,
          badge: q.category === 'main' ? 'Jornada' : 'Tarefa',
          icon: '📜',
          description: q.shortDescription || q.narrativeText || 'Missão configurada no Quest System V2.',
          initialQuickConfig: {
            questKind: 'collect',
            questRequiredAmount: q.objectives?.[0]?.targetCount || 1,
            rewardGold: q.rewards?.gold || 100,
            rewardXp: q.rewards?.xp || 50,
          },
        })),
      });
    }
  } catch {}

  return catalog;
}

