import type { TerrainPenConfig } from './terrainPen';
import type { CharacterGrowthConfig, ProjectQuestsConfig } from './questSystem';
export interface BiomeTileConfig {
  id: string;
  name: string;
  tilePng: string; // Data URL da imagem PNG
  tileWidth: number; // Largura exata da PNG (ex: 64, 128, 256...)
  tileHeight: number; // Altura exata da PNG (ex: 64, 128, 256...)
  tileRepeatCount: number; // Quantidade de repetição vertical de linhas desse tile
  repeatCount?: number; // Alias para compatibilidade
  transitionBlendRows: number; // Linhas de transição suave com o próximo bioma
  baseColor: string; // Cor de identificação / tema do bioma
  biomeEvent?: 'none' | 'night' | 'rain' | 'dawn' | 'leaves' | 'wind' | 'bugs' | 'ants'; // Evento dinâmico do bioma (legado)
  biomeEvents?: ('night' | 'rain' | 'dawn' | 'leaves' | 'wind' | 'bugs' | 'ants')[]; // Múltiplos eventos climáticos simultâneos
  walkSpeed?: number; // Multiplicador de velocidade de caminhada do personagem neste bioma (ex: 0.5 a 2.0)
  playerScale?: number; // Multiplicador da escala do PNG do jogador neste bioma (ex: 0.5 longe, 1.5 perto)
  cameraZoom?: number; // Zoom da câmera do celular neste bioma (1.0 = normal, >1 aproxima, com transição suave)
  bgmAudioUrl?: string; // Trilha sonora ou som ambiente do bioma (URL ou Base64)
  bgmVolume?: number; // Volume do áudio (0.0 a 1.0, padrão 0.7)
}

export interface SubBiomeConfig {
  id: string;
  name: string; // Ex: Caverna Subterrânea, Interior do Castelo, Masmorra Antiga...
  description?: string;
  tilePng: string; // PNG do cenário/piso do sub-bioma
  tileWidth?: number;
  tileHeight?: number;
  baseColor?: string;
  parentBiomeId?: string; // Vinculado a qual bioma principal (opcional)
  biomeEvent?: 'none' | 'night' | 'rain' | 'dawn' | 'leaves' | 'wind' | 'bugs' | 'ants'; // Evento dinâmico do sub-bioma (legado)
  biomeEvents?: ('night' | 'rain' | 'dawn' | 'leaves' | 'wind' | 'bugs' | 'ants')[]; // Múltiplos eventos climáticos simultâneos
  walkSpeed?: number; // Multiplicador de velocidade de caminhada no sub-bioma
  playerScale?: number; // Multiplicador da escala do PNG do jogador neste sub-bioma
  cameraZoom?: number; // Zoom da câmera do celular nesta fase (1.0 = normal, com transição suave)
  bgmAudioUrl?: string; // Trilha sonora ou som ambiente da fase Extended (URL ou Base64)
  bgmVolume?: number; // Volume do áudio (0.0 a 1.0, padrão 0.7)
  walkableCells?: string[]; // Células de colisão pintadas NESTE sub-bioma ("col,row" locais)
  blockedCells?: string[]; // Células de colisão sólida / paredes / obstáculos ("col,row" locais)
  restrictPlayerToPaintedAreas?: boolean; // Se true, restringe o player às áreas pintadas deste sub-bioma
}

export type LimitsBrushMode = 'paint' | 'block' | 'erase';

export type MarkerType =
  | 'neutral'
  | 'light'
  | 'camp'
  | 'castle'
  | 'boss'
  | 'treasure'
  | 'town'
  | 'shrine'
  | 'portal'
  | 'oasis'
  | 'cave'
  | 'tower'
  | 'ruins'
  | 'port'
  | 'collectible'
  | 'deliverable'
  | 'event'
  | 'npc'
  | 'travel'
  | 'area'
  | 'interactive_screen';

export type MarkerStatus = 'discovered' | 'active' | 'completed' | 'locked';

export interface NpcPatrolConfig {
  enabled: boolean;
  preset: 'horizontal' | 'vertical' | 'custom' | 'procedural';
  walkStyle: 'jelly' | 'slime_hop'; // Gelatina comum ou micro pulinho de slime
  speed: number; // Velocidade de caminhada (1 a 8, padrão 2.5)
  distance: number; // Distância do trajeto em px (para horizontal e vertical)
  pauseTime: number; // Segundos parado nas extremidades/paradas
  loop: boolean; // Repetição contínua (vai e volta)
  customMode?: 'points' | 'draw'; // Clicando/conectando pontos ou traçando livremente
  waypoints?: { x: number; y: number }[]; // Coordenadas locais do trajeto
}

// --- SISTEMA PROCEDURAL DE ACTION NPC & EMOÇÕES COMPARTILHADAS ---

export type ActionNpcAttackType = 'jump' | 'dash' | 'hack_slash' | 'ranged' | 'standard';

export interface VideoChromaKeyConfig {
  enabled: boolean;
  color: string; // Cor a remover (hex ex: #00ff00)
  tolerance: number; // 0 a 100 (padrão 35)
  smoothness: number; // 0 a 50 (padrão 12)
  cropSquare?: boolean; // Se true, enquadra em quadrado 1:1 para paisagens
  cropOffsetX?: number; // 0 a 100% de deslocamento horizontal do quadrado
  cropOffsetY?: number; // 0 a 100% de deslocamento vertical do quadrado
  videoSpeed?: number; // Velocidade de reprodução (0.25x a 3.0x, padrão 1.0)
  scale?: number; // Escala / zoom do asset (0.25x a 3.0x, padrão 1.0)
  flipH?: boolean; // Espelhar horizontalmente
}

export interface AttackAssetConfig {
  type: 'none' | 'png' | 'motion' | 'video';
  url?: string;
  name?: string;
  motionLayers?: MarkerMotionLayer[];
  videoChromaKey?: VideoChromaKeyConfig;
  size?: number; // Tamanho visual da projeção (px)
  scale?: number;
  durationSec?: number; // Duração customizada do golpe em segundos (ex: 0.8s)
}

export interface ActionNpcAttackJumpConfig {
  enabled: boolean;
  damage: number;
  cooldown: number; // segundos (ex: 3.0s)
  jumpHeight?: number; // px de altura do salto (ex: 75px)
  impactRadius?: number; // raio de colisão do impacto no pouso (ex: 50px)
  durationSec?: number; // Duração do pulo em segundos (ex: 0.85s)
  attackAsset?: AttackAssetConfig; // Asset customizado do impacto / pulo
}

export interface ActionNpcAttackDashConfig {
  enabled: boolean;
  damage: number;
  cooldown: number; // segundos (ex: 2.5s)
  dashSpeed?: number; // multiplicador de impulso
  dashDistance?: number; // distância do rasante em px (ex: 120px)
  durationSec?: number; // Duração do rasante em segundos (ex: 0.65s)
  attackAsset?: AttackAssetConfig; // Asset customizado do rasante / rastro
}

export interface ActionNpcAttackHackSlashConfig {
  enabled: boolean;
  damage: number;
  cooldown: number; // segundos (ex: 1.5s)
  range?: number; // alcance do corte corporal em px (ex: 55px)
  slashArc?: 'normal' | 'wide' | 'thrust';
  durationSec?: number; // Duração do golpe em segundos (ex: 0.75s)
  attackAsset?: AttackAssetConfig; // Asset customizado da lâmina / corte / efeito
}

export type ActionNpcProjectileType =
  | 'magic_orb'
  | 'fireball'
  | 'arrow'
  | 'rock'
  | 'knife'
  | 'energy_beam'
  | 'custom';

export interface ActionNpcAttackRangedConfig {
  enabled: boolean;
  damage: number;
  cooldown: number; // segundos (ex: 3.5s)
  range?: number; // alcance máximo do tiro em px (ex: 240px)
  projectileType?: ActionNpcProjectileType;
  projectileCustomUrl?: string; // PNG personalizado do projétil
  projectileSpeed?: number; // pixels por segundo (ex: 250px/s)
  projectileSize?: number; // tamanho em pixels do projétil (ex: 24px)
  durationSec?: number; // Duração do disparo em segundos (ex: 0.60s)
  attackAsset?: AttackAssetConfig; // Asset customizado do projétil (PNG, Motion ou Vídeo)
}

export interface ActionNpcAttackStandardConfig {
  enabled: boolean;
  damage: number;
  cooldown: number; // segundos (ex: 1.8s)
  range?: number; // alcance do golpe em px (ex: 65px)
  durationSec?: number; // Duração visual do golpe em segundos (ex: 0.80s)
  attackAsset?: AttackAssetConfig; // Asset customizado (Vídeo, Motion ou PNG) sem deformação corporal
}

export interface ActionNpcAttacks {
  jump?: ActionNpcAttackJumpConfig;
  dash?: ActionNpcAttackDashConfig;
  hackSlash?: ActionNpcAttackHackSlashConfig;
  ranged?: ActionNpcAttackRangedConfig;
  standard?: ActionNpcAttackStandardConfig;
}

export interface ActionNpcDropItemConfig {
  id: string;
  name: string;
  icon?: string; // emoji, ex: 💰, 🧪, 💎, 🔑, ⭐, 🍞
  iconUrl?: string; // imagem PNG customizada do item
  chancePercent: number; // 0 a 100%
  amount?: number; // quantidade, padrão 1
  type?: 'gold' | 'potion' | 'key' | 'gem' | 'custom';
}

export interface ActionNpcDropConfig {
  enabled: boolean;
  intervalSec: number; // intervalo de tempo entre drops ao caminhar/patrulhar (ex: 12s)
  dropOnlyWhileMoving?: boolean; // só solta se estiver se movimentando pelo mapa (padrão true)
  maxItemsOnMap?: number; // limite máximo de itens no chão por este NPC (padrão 5)
  items: ActionNpcDropItemConfig[]; // até 3 itens variados
}

export type ActionNpcRole = 'hostile' | 'guardian' | 'peaceful' | 'curious' | 'coward' | 'custom';

export type NpcEmotionType = 'neutral' | 'curious' | 'happy' | 'angry' | 'fear' | 'confused' | 'alert';

export interface NpcEmotionState {
  type: NpcEmotionType;
  intensity: number; // 0.0 a 1.0
  expiresAt: number; // timestamp ms quando expira
  reason?: 'witnessed_fight' | 'attacked' | 'player_approached' | 'fear_propagated' | 'curious_wander' | string;
  sourcePosition?: { x: number; y: number };
  sourceMarkerId?: string;
}

export interface ActionNpcConfig {
  enabled: boolean;
  role: ActionNpcRole;
  detectionRadius: number; // Raio interno para iniciar ataques (ex: 100px)
  sensoryRadius: number; // Área sensorial maior para observar mundo, confrontos e perigos (ex: 260px)
  spawnOrigin?: { x: number; y: number }; // Ponto natal de spawn
  leashDistance?: number; // Distância máxima do spawn antes de retornar (ex: 350px)
  moveSpeed?: number; // Velocidade de caminhada e perseguição em combate (ex: 85 px/s)
  locomotionStyle?: 'auto' | 'biped' | 'slime_hop'; // Estilo de locomoção e movimentação corporal ('slime_hop' para pulos de slime)
  attacks: ActionNpcAttacks;
  speechPhrases?: [string?, string?, string?]; // Até 3 frases personalizáveis em balão
  retaliateOnHit?: boolean; // Se for atacado, muda para o comportamento hostil (padrão true)
  fleeOnWitnessCombat?: boolean; // Se pacífico e presenciar luta, ativa medo e foge (padrão true)
  propagateFear?: boolean; // Medo influencia NPCs próximos via sistema de emoções compartilhadas (padrão true)
  showAnimeEmotes?: boolean; // Camada visual de anime (💢, 💧, ❗, ❓, ✨💖) (padrão true)
  spontaneousPlayerApproach?: boolean; // Aproxima-se espontaneamente do jogador quando em estado pacífico/curioso (padrão true)
  noBodyDeformation?: boolean; // Desativa deformação corporal (squash/stretch/tilt) em ataques - perfeito para assets de vídeo
  dropConfig?: ActionNpcDropConfig; // Sistema de drop de itens no chão ao passar
  targetAffiliation?: 'all' | 'player_only' | 'other_npcs_only'; // Quem ataca
  health?: number;
  maxHealth?: number;
  maxHp?: number;
  attackDamage?: number;
  combatStyle?: string;
  respawnMode?: 'timed' | 'never'; // Regra de respawn ao morrer ou ser escaneado (padrão 'timed')
  respawnTimeSeconds?: number; // Tempo em segundos para reaparecer no ponto de origem (padrão 25s)
  // Vínculo com a Matriz de Cartas (Forge V2) e Modos de Batalha (Boss Battle vs Duelo de Cartas)
  matrixCardId?: string; // ID ou Nome da Carta Matriz representante deste NPC Action
  battleMode?: 'boss' | 'duel'; // 'boss' = Boss Battle (asset do NPC no tabuleiro) | 'duel' = Duelo de Cartas (NPC joga com seu deck)
  deckCardIds?: string[]; // Cartas do Deck do NPC quando battleMode === 'duel'
  rarityDropRule?: 'auto' | 'common' | 'rare' | 'epic' | 'legendary'; // Regra de raridade p/ drop de variação da Carta Matriz
  scanDialogueText?: string; // Fala exibida ao entrar na Fase de Escaneamento / Desafio Boss Battle
  linkedMobbyId?: string; // Vínculo opcional com Mobby do MobbyManager
  passiveAbilityId?: string; // Habilidade Passiva da Forja V2 vinculada ao NPC / Carta
  activeArtifactId?: string; // Artefato / Habilidade Ativa da Forja V2 usada pelo NPC e dropável na vitória
  battleScenarioKey?: string; // Cenário da Forja V2 para o fundo da batalha contra este NPC
  battleBgmUrl?: string; // Trilha sonora da Central de Sons da Forja V2 para a batalha
  // Sprites Direcionais Opcionais (4 Direções - Igual ao Player)
  avatarUpPng?: string; // Cima / Costas (Up)
  avatarDownPng?: string; // Baixo / Frente (Down)
  avatarLeftPng?: string; // Esquerda (Left)
  avatarRightPng?: string; // Direita (Right)
  facingDirection?: 'up' | 'down' | 'left' | 'right'; // Direção inicial / padrão
}

export interface QuestResource {
  id: string;
  name: string;
  iconEmoji?: string;
  iconPng?: string;
}

export interface DialogueStep {
  id: string;
  speaker?: string;
  characterPng?: string;
  text: string;
  playerResponses?: { id: string; label: string; nextStepIndex?: number }[];
}

export interface MarkerMotionLayer {
  id: string;
  name: string;
  visible?: boolean;
  effect: string; // 'water' | 'vortex' | 'rotation' | 'wind' | 'fire' | 'pendulum' | 'pulse' | 'jelly'
  speed?: number;
  intensity?: number;
  brushSize?: number;
  strokes: { id: string; points: { x: number; y: number }[]; brushSize: number }[];
  // Novas propriedades de Transformação & Física das Peças
  isBaseAsset?: boolean; // Marca que esta camada representa o Asset/Corpo Base original do marcador
  pngUrl?: string; // Imagem PNG própria desta camada/peça (importada ou extraída)
  x?: number; // Deslocamento horizontal X
  y?: number; // Deslocamento vertical Y
  scale?: number; // Escala uniforme (0.2 a 3.0, padrão 1.0)
  scaleX?: number; // Deforme / Compressão / Expansão Horizontal (0.1 a 4.0, padrão 1.0)
  scaleY?: number; // Deforme / Compressão / Expansão Vertical (0.1 a 4.0, padrão 1.0)
  rotation?: number; // Rotação em graus (-180° a 180°, padrão 0)
  flipX?: boolean; // Espelhamento horizontal (Mirror H)
  flipY?: boolean; // Espelhamento vertical (Mirror V)
  pivotX?: number; // Ponto pivô do eixo X (0 = esquerda, 0.5 = centro, 1 = direita, padrão 0.5)
  pivotY?: number; // Ponto pivô do eixo Y (0 = topo, 0.5 = centro, 1 = base, padrão 0.5)
  physicsMode?:
    | 'none'
    | 'hang'
    | 'follow_parent'
    | 'spring'
    | 'float'
    | 'close_up'
    | 'cloth'
    | 'flag'
    | 'breathe'
    | 'blink'
    | 'wing_flap'
    | 'tail_wag'
    | 'buzz'
    | 'spin'
    | 'orbit'; // Modo de física pendurada / inércia em relação ao pai
  foldAxis?: 'horizontal' | 'vertical'; // Eixo da dobra para o modo close_up / blink (horizontal = livro/asa, vertical = pálpebra/concha)
  clothMeshDensity?: number; // Densidade da malha de tecido (ex: 8, 12, 16, 20)
  clothSag?: number; // Peso e caimento gravitacional do tecido (0.2 a 2.5, padrão 1.0)
  flagWindAngle?: number; // Ângulo da direção do vento (-180 a 180°, padrão 0 = horizontal)
  flagRippleFreq?: number; // Frequência de ondulação e rajadas do vento (0.5 a 3.0, padrão 1.0)
  wingPhaseOffset?: number; // Defasagem de fase para sincronia ou alternância de asas (ex: 0 = em fase, 180 = alternado)
  spinDirection?: 'cw' | 'ccw'; // Sentido do giro contínuo ('cw' = horário, 'ccw' = anti-horário)
  orbitRadius?: number; // Raio da órbita elíptica em pixels (ex: 10 a 120px)
  pins?: { x: number; y: number; label?: string }[]; // Pinos rígidos de fixação cravando a peça na malha pai
  linkedLayerId?: string; // ID da camada vinculada/sincronizada (ex: Asa Esquerda <-> Asa Direita)
  syncWingMirror?: boolean; // Se true, espelha o ângulo de rotação para simetria perfeita em asas opostas
  // Sistema de Motion Items (Camadas Agrupáveis por Tag de Item de Inventário — Roupas, Skins, Cintos, Armas, Asas)
  inventoryItemTag?: string; // Tag de agrupamento vinculada ao Inventário (ex: 'skin_armadura_solar', 'cinto_real')
  linkedItemId?: string; // ID opcional do InventoryItemDefinition vinculado
  equipSlot?: 'skin' | 'head' | 'armor' | 'belt' | 'boots' | 'weapon' | 'cape' | 'wings' | 'accessory';
  gameVisibilityRule?: 'always' | 'when_acquired' | 'when_equipped'; // Em jogo: sempre visível, ao adquirir ou ao equipar
}

export interface StationSubAssetSlot {
  id: string;
  name: string; // Nome do slot (ex: "Slot Ovo 1", "Slot Caldeirão 2")
  offsetX: number; // Offset horizontal em pixels relativo ao centro do asset base (-80 a 80)
  offsetY: number; // Offset vertical em pixels relativo ao centro do asset base (-80 a 80)
  scale?: number; // Escala do sub-asset (0.2 a 2.0, padrão 0.55)
  rotation?: number; // Rotação em graus (-180 a 180, padrão 0)
  motionEffect?: string; // Efeito de animação física do Motion Canvas ('none', 'jelly', 'breathe', 'float', etc.)
  motionSpeed?: number;
  motionIntensity?: number;
  allowedAssetTags?: string[]; // Tags aceitas (ex: 'egg', 'potion', 'crystal')
  allowedAssetPngs?: string[]; // URLs/DataURLs específicas de assets aceitos
  currentAssetPng?: string; // PNG do asset atualmente colocado no slot
  currentAssetName?: string; // Nome do asset colocado
  resultAssetPng?: string; // PNG específico da criatura gerada por este ovo (6 ovos -> 6 saídas)
  resultAssetName?: string; // Nome específico da criatura deste ovo
  spawnNpcLinkMarkerId?: string; // Marcador NPC existente vinculado a este ovo específico
  spawnNpcHasDialogue?: boolean; // Se false (padrão), o NPC deste ovo só caminha sem diálogo
  spawnNpcDialogue?: string; // Fala/diálogo opcional caso spawnNpcHasDialogue seja true
}

export type StationActivationTrigger = 'proximity' | 'click' | 'both';

export type StationUnlockType = 'always' | 'level' | 'purchased' | 'event' | 'quest';

export interface StationUnlockCondition {
  type: StationUnlockType;
  minLevel?: number; // Nível mínimo do herói requerido
  costResourceName?: string; // Recurso requerido para liberar/comprar (ex: 'Ouro', 'Gema', 'Madeira')
  costAmount?: number; // Quantidade necessária do recurso
  requiredEventId?: string; // ID do evento que deve ter sido disparado
  requiredQuestId?: string; // ID da quest/missão que deve estar concluída
  lockedMessage?: string; // Mensagem explicativa caso o jogador tente interagir estando bloqueado
  isUnlocked?: boolean; // Flag se já foi desbloqueado/comprado em tempo de execução
}

export interface InteractiveScreenConfig {
  stationTitle?: string; // Título exibido na tela (ex: "Chocadeira Mágica")
  stationSubtitle?: string; // Instrução para o jogador (ex: "Insira até 6 ovos e aguarde a incubação")
  stationType?: 'incubator' | 'furnace' | 'alchemy' | 'display' | 'crafting' | 'custom';
  bannerImagePng?: string; // Banner temático da estação
  baseAssetPng?: string; // Imagem base da estação (chocadeira, forja, etc.)
  baseAssetScale?: number; // Multiplicador de escala da base PNG (0.4 a 2.5, padrão 1.0)
  baseMotionEffect?: 'none' | 'jelly' | 'water' | 'fire' | 'glow' | 'breathe' | 'float' | string;
  baseMotionSpeed?: number;
  baseMotionIntensity?: number;
  slotsCount: number; // Quantidade de slots extras (1 a 8, padrão 6)
  slots: StationSubAssetSlot[]; // Lista de slots com coordenadas e assets colocados
  // Gatilho de Ativação (Aproximando, Clicando, ou Ambos)
  activationTrigger?: StationActivationTrigger; // Padrão 'both'
  triggerRadius?: number; // Raio em pixels para ativação por proximidade (padrão 80)
  // Condição de Disponibilidade & Desbloqueio
  unlockCondition?: StationUnlockCondition;
  // Temporizador & Processamento
  processTimeSeconds?: number; // Duração do processo em segundos (ex: 10s)
  processStatus?: 'idle' | 'running' | 'completed'; // Estado da máquina
  processStartedAt?: number; // Timestamp do início
  resultAssetPng?: string; // O que surge após o tempo acabar (ex: Pintinho, Espada, Poção)
  resultAssetName?: string; // Nome do item produzido
  resultMotionEffect?: string; // Efeito de animação do resultado
  resultMessage?: string; // Mensagem de sucesso (ex: "Crack! Um novo ser nasceu!")
  showResultOnMap?: boolean; // Se o resultado substitui/surge sobre a estação no mapa
  availablePaletteAssets?: { id: string; name: string; pngUrl: string; tag?: string }[]; // Itens que o jogador pode escolher
  // Configuração do NPC Gerado Automaticamente ao Eclodir
  spawnNpcOnHatch?: boolean; // Se gera um NPC no mapa ao eclodir (padrão true para chocadeira)
  spawnNpcMovementType?: 'wander' | 'idle' | 'patrol' | 'bounce'; // Modo de caminhada automática do NPC gerado
  spawnNpcPatrolRadius?: number; // Raio de caminhada ao redor da chocadeira
  spawnNpcHasDialogue?: boolean; // Se false (padrão), o NPC nascido apenas caminha sem diálogos obrigatórios
  spawnNpcDialogue?: string; // Fala/diálogo opcional caso spawnNpcHasDialogue seja true
  spawnNpcLinkMarkerId?: string; // Se vinculado a um marcador NPC existente
  // Customizações de Layout & Posicionamento dos Blocos na Tela Interativa
  titleOffsetY?: number; // Posição vertical da cápsula do título no topo (px)
  screenAssetOffsetY?: number; // Deslocamento vertical da chocadeira no centro (px)
  screenAssetSize?: number; // Tamanho do asset da chocadeira na tela (px)
  bottomControlsOffsetY?: number; // Posição vertical das partes inferiores (px de subida da base)
}

export interface MapMarker {
  id: string;
  name: string;
  description: string;
  type: MarkerType;
  color: string;
  status: MarkerStatus;
  x: number;
  y: number;
  biomeId?: string;
  // Fase dona do marcador. Quando definido, x/y são LOCAIS dentro desse sub-bioma
  // (origem no canto superior esquerdo dele) e o marcador só existe nessa fase.
  // Sem subBiomeId, o marcador pertence ao mapa vertical.
  subBiomeId?: string;
  layerId?: string; // ID da camada a qual este marcador pertence (ex: 'layer-ground-1', 'layer-props-2', etc.)
  customIconPng?: string; // Imagem PNG personalizada para o marcador
  size?: number; // Tamanho em pixels (ex: 28px a 1200px, padrão 150px)
  rotation?: number; // Rotação em graus (0° a 360°)
  flipX?: boolean; // Espelhamento horizontal
  flipY?: boolean; // Espelhamento vertical
  scaleX?: number; // Multiplicador de escala no eixo X (largura)
  scaleY?: number; // Multiplicador de escala no eixo Y (altura)
  hasShadow?: boolean; // Sombra projetada no chão
  bannerImagePng?: string; // Banner ilustrado da cápsula
  rewardSlots?: (string | null)[]; // 6 slots circulares opcionais de recompensas
  // Missões & Quest Items (Coletável / Entregável)
  questResourceType?: 'wood' | 'stone' | 'coal' | 'flower' | 'slime_water' | 'gold' | 'custom';
  questResource?: QuestResource;
  questRequiredAmount?: number; // Ex: Precisa de 5 madeiras
  targetDeliverableMarkerId?: string; // Link ao marcador entregável (onde entregar)
  // Viagem & Teleporte (Marcador Tipo Travel)
  travelTargetType?: 'marker' | 'level' | 'sub_biome'; // Se o destino é outro marcador travel, uma fase da galeria ou sub-bioma
  targetTravelMarkerId?: string; // ID do marcador travel de destino
  travelAuto?: boolean; // Teleporte automático ao encostar/tocar, com fade preta (padrão true; false = exige botão no pop-up)
  // Eventos Múltiplos e Modulares (Simultâneos ou Sequenciais)
  events?: MarkerEventItem[];
  // Eventos (marcador tipo 'event' ou disparados): UM evento por marcador, disparado ao chegar/tocar ou gatilho
  eventKind?: 'weather' | 'zoom' | 'dialogue' | 'popup' | 'video' | 'duel' | 'cutscene' | 'vfx' | 'teleport' | 'sound' | 'cinematic' | 'sound_area' | 'quest' | 'intercept';
  interceptConfig?: InterceptEventConfig; // Configuração completa do evento de Interceptação & Escolta Guiada
  eventWeather?: 'none' | 'night' | 'rain' | 'dawn' | 'leaves'; // clima vigente enquanto o herói está no raio
  eventZoom?: number; // zoom da câmera durante o evento
  eventDuration?: number; // segundos de duração (0 = manual: até fechar / fim do vídeo)
  eventFreeze?: boolean; // estátua: herói parado até o evento acabar
  eventVideoUrl?: string; // URL ou dataURL do vídeo da cena
  eventTrigger?: 'proximity' | 'interact' | 'on_enter_map' | 'timer' | 'quest_complete' | 'sub_event' | 'area_trigger'; // Quando acontece (gatilho)
  eventTriggerRadius?: number; // Raio em pixels para ativação por proximidade (ex: 48, 96, 160)
  eventTriggerDelay?: number; // Delay em segundos antes de disparar
  eventTitle?: string; // Título customizado do evento
  eventSubtitle?: string; // Descrição rápida do evento
  eventRepeat?: 'once' | 'always'; // Se roda 1 vez ou sempre que ativar
  // Sub-Eventos Encadeados & Gatilhos de Área
  parentEventId?: string; // ID do evento pai (este sub-evento roda após o pai)
  delayAfterParent?: number; // Segundos de espera após o término do evento pai para disparar
  triggerAreaMarkerId?: string; // ID do marcador tipo 'area' que dispara este evento
  // Configurações do Evento: Som por Área
  audioUrl?: string; // URL ou Base64 do áudio espacial da área
  audioVolume?: number; // Volume máximo no centro (0.0 a 1.0, padrão 0.8)
  audioShape?: 'circle' | 'rect'; // Formato da área acústica
  audioRadius?: number; // Raio em pixels para área circular (padrão 120px)
  audioWidth?: number; // Largura em pixels para área retangular
  audioHeight?: number; // Altura em pixels para área retangular
  audioBlendMode?: 'mix' | 'solo' | 'blend_bgm' | 'loop' | 'one_shot'; // 'mix' = toca junto com BGM do bioma; 'solo' = silencia/atenua BGM do bioma; 'blend_bgm' = atenua música de fundo suavemente
  audioPlaybackMode?: 'restart' | 'continuous'; // 'restart' = toca do zero a cada encontro; 'continuous' = som contínuo durante a fase
  // Configurações do Evento: Cinemática de Câmera
  cinematicTargetType?: 'marker' | 'coordinate' | 'player'; // Focar em um marcador, numa coordenada (X,Y) ou no player
  cinematicTargetMarkerId?: string; // ID do marcador alvo (ex: boss, torre, baú)
  cinematicTargetX?: number; // Coordenada X manual do alvo
  cinematicTargetY?: number; // Coordenada Y manual do alvo
  cinematicZoom?: number; // Zoom da câmera durante o foco cinemático (ex: 1.5x)
  cinematicPanInDuration?: number; // Duração em segundos da transição suave até o alvo (padrão 1.2s)
  cinematicHoldDuration?: number; // Segundos que a câmera fica parada no alvo mostrando a cena (padrão 3.0s)
  cinematicPanOutDuration?: number; // Duração em segundos do retorno suave para o player (padrão 1.0s)
  cinematicFreezePlayer?: boolean; // Se congela o jogador durante a cinemática (padrão true)
  // Configurações visuais do Marcador tipo 'area'
  areaShape?: 'circle' | 'rect'; // Formato da zona de gatilho
  areaWidth?: number; // Largura do retângulo da zona (padrão 160px)
  areaHeight?: number; // Altura do retângulo da zona (padrão 120px)
  areaRadius?: number; // Raio da zona circular (padrão 80px)
  areaColor?: string; // Cor do contorno/preenchimento da zona (ex: '#3b82f6')
  // NPC (marcador tipo 'npc'): PNG com efeito gelatina + diálogos + dá quests + auto-caminhe
  npcBounce?: boolean; // efeito gelatina igual ao herói (padrão true)
  jellyStyle?: 'classic' | 'spring' | 'step_walk' | 'squash_intense' | 'organic_jitter' | 'pulse_beat'; // Estilo de física do tremor
  jellyIntensity?: number; // Multiplicador de intensidade/amplitude ao caminhar (0.0 a 3.0, padrão 1.0)
  jellyIdleIntensity?: number; // Multiplicador de intensidade/amplitude quando parado no Idle (0.0 a 2.0, padrão 0.35)
  jellySpeed?: number; // Multiplicador de velocidade (0.2 a 3.0, padrão 1.0)
  effect?: 'none' | 'jelly' | string; // Efeito visual do marcador ('none', 'jelly', 'water', 'fire', 'glow', etc.)
  effectSpeed?: number; // Multiplicador de velocidade da animação/distorção (0.2 a 3.5, padrão 1.0)
  effectIntensity?: number; // Multiplicador de amplitude/intensidade da distorção (0.2 a 3.5, padrão 1.0)
  effectStrokes?: { id: string; points: { x: number; y: number }[]; brushSize: number }[]; // Traços desenhados sobre o asset
  motionLayers?: MarkerMotionLayer[]; // Camadas de animação física do Motion Canvas
  npcPhrases?: string[]; // até 3 falas exibidas com digitação na cápsula
  npcPatrol?: NpcPatrolConfig; // Auto-caminhe / patrulha com presets e caminhos personalizados
  actionNpc?: ActionNpcConfig; // Modalidade Action NPC com combate, raio sensorial e inteligência autônoma
  emotionState?: NpcEmotionState; // Estado procedural atual de emoção (ira, medo, curiosidade, etc.)
  // Sprites Direcionais Opcionais para NPC e Action NPC (4 Direções - Igual ao Player)
  avatarUpPng?: string; // Cima / Costas (Up)
  avatarDownPng?: string; // Baixo / Frente (Down)
  avatarLeftPng?: string; // Esquerda (Left)
  avatarRightPng?: string; // Direita (Right)
  facingDirection?: 'up' | 'down' | 'left' | 'right'; // Direção inicial / padrão no mapa
  npcBattleMode?: 'boss' | 'duel';
  // Quest dada pelo NPC (UMA por NPC, simples): coletar / falar / descobrir / duelar
  quest?: {
    kind: 'collect' | 'deliver' | 'reach' | 'interact' | 'talk' | 'discover' | 'duel';
    title?: string; // Título da Missão (ex: "Resgate das Relíquias")
    instructions?: string; // Instruções / Texto do que fazer
    successMessage?: string; // Mensagem ao concluir
    resourceType?: string;
    resourceName?: string; // Com o que / Item necessário
    iconEmoji?: string; // Ícone do item ou objetivo (📦, 🪵, 💎, 📜, 🗝️)
    requiredAmount?: number; // Quantidade necessária
    currentAmount?: number; // Progresso atual
    targetMarkerIds?: string[]; // Onde / Quem (IDs dos marcadores alvos)
    targetMarkerName?: string; // Nome do alvo / NPC / Local
    targetBiomeId?: string; // Bioma ou sub-bioma alvo
    requiredCount?: number;
    completed?: boolean;
    rewardCardId?: string; // Carta Matriz entregue como recompensa desta Quest
    rewardRarityRule?: 'auto' | 'common' | 'rare' | 'epic' | 'legendary'; // Raridade da variação da carta da Quest
    rewardCoins?: number; // Recompensa em Ouro sincronizada com ProgressionManager
    rewardGems?: number; // Recompensa em Diamantes/Gemas
  };
  // Atalhos diretos de Vínculo de Carta Matriz e Batalha para qualquer NPC/Evento
  matrixCardId?: string;
  battleMode?: 'boss' | 'duel';
  deckCardIds?: string[];
  rarityDropRule?: 'auto' | 'common' | 'rare' | 'epic' | 'legendary';
  eventFadeColor?: string; // Cor do desvanecer da cena (hex, ex: #000000 preto, #ffffff branco)
  // Motion pen: recorte extraído do mapa (asset overlay com gelatina, pivô central)
  motionAsset?: boolean;
  motionActive?: boolean; // recorte ATIVADO como interagível (toque do player ativa; dormente = sem pop-up/clique)
  solidCollision?: boolean; // Colisão física sólida com o herói (o herói não atravessa o asset)
  // Luz e Iluminação Dinâmica (marcador tipo 'light')
  lightConfig?: {
    preset?: 'torch' | 'lamp' | 'crystal' | 'campfire' | 'arcane' | 'custom';
    radius?: number; // Raio de iluminação em pixels (40 a 500)
    color?: string; // Cor hex da luz (ex: #f59e0b)
    intensity?: number; // Intensidade / opacidade (0.2 a 1.0)
    flicker?: boolean; // Efeito de tremeluzir estilo chama/fogo
  };
  // Ajuste de Posicionamento Fino e Realismo da Sombra Projetada no Chão
  shadowOffsetX?: number; // Deslocamento horizontal (-60px a +60px)
  shadowOffsetY?: number; // Deslocamento vertical (-60px a +60px)
  shadowBlur?: number; // Desfoque / blur realista da sombra em pixels (0 a 30, padrão 3)
  shadowOpacity?: number; // Opacidade da sombra (0.1 a 1.0, padrão 0.45)
  shadowShape?: 'silhouette' | 'ellipse'; // 'silhouette' = sombra recortada no formato exato da PNG; 'ellipse' = elipse de chão
  // Marcador OFF (Modo Chão / Piso Puro): desativa colisão e sobreposição, herói e NPCs passam por cima
  markerOff?: boolean;
  // Ajuste fino de colisão dos pés/base
  collisionRadiusScale?: number; // Escala do raio de colisão (0.1 a 0.5, padrão ~0.22 da base)
  collisionBaseOffsetY?: number; // Deslocamento vertical da colisão (em pixels)
  targetLevelId?: string; // ID da Fase Salva de destino
  targetLevelMarkerId?: string; // Marcador (travel) de pouso dentro da Fase Salva
  targetSubBiomeId?: string; // ID do Sub-Bioma de destino
  // Diálogo / Modo Interação (Visual Novel / Jogo RPG)
  dialogueEnabled?: boolean;
  dialogueId?: string; // ID do diálogo salvo vinculado da biblioteca
  dialogueCharacterPng?: string; // PNG centralizado do personagem/criatura
  dialogueCharacterName?: string; // Nome do personagem
  dialogueCharacterScale?: number; // Escala/Zoom da PNG no diálogo (ex: 0.5 a 1.8, padrão 1.0)
  dialogueCharacterOffsetX?: number;
  dialogueCharacterOffsetY?: number; // Deslocamento vertical no diálogo em pixels (ex: -100 a +100)
  dialogueText?: string; // Texto/Falas do diálogo (fala inicial ou compatibilidade)
  dialogueSteps?: {
    id: string;
    speaker?: string; // Nome do orador (opcional, padrão: nome do personagem)
    characterPng?: string; // PNG / Expressão específica desta frase (troca de pose/personagem por frase)
    text: string; // Conteúdo da fala (1 a 4 frases)
    playerResponses?: { id: string; label: string; nextStepIndex?: number }[]; // Botões de respostas simples do jogador antes da próxima frase/final
  }[]; // Sequência de 1 a 4 frases antes dos botões de interações finais
  dialogueOptions?: { id: string; label: string; nextAction?: 'open_popup' | 'close' | 'custom'; customResponse?: string }[];
  // Botões de Interação no rodapé da tela (Único ou Múltipla Escolha: Batalhar, Interagir, etc.)
  interactionButtons?: { id: string; label: string; actionType: 'battle' | 'interact' | 'dialogue' | 'explore' | 'popup' | 'collect' | 'deliver' | 'custom'; icon?: string }[];
  clickBehavior?: 'popup_first' | 'dialogue_first' | 'dialogue_only' | 'popup_only'; // Ordem ao clicar no marcador
  popupStyle?: 'compact' | 'full'; // Estilo do pop-up: 'compact' (card rápido de coleta/ação) ou 'full' (cápsula com descrição e slots)
  // Configurações do Marcador Interativo com Tela & Aparato (Chocadeira, Forja, Caldeirão, etc.)
  stationConfig?: InteractiveScreenConfig;
  // Suporte a Marcador de Vídeo com Chroma Key e Enquadramento Square
  mediaType?: 'image' | 'video';
  videoUrl?: string; // URL ou dataURL do vídeo
  videoChromaKey?: VideoChromaKeyConfig;
  pivotX?: number; // Ponto de ancoragem horizontal (0.0 a 1.0, padrão 0.5)
  pivotY?: number; // Ponto de ancoragem vertical (0.0 a 1.0, padrão 0.5)
  // Vínculos com o Motor de Quests & Comércio (Worlds of Slimelands V2)
  linkedQuestId?: string;
  linkedObjectiveId?: string;
  shopId?: string;
  shopName?: string;
  mobSpecies?: string;
  passiveAbilityId?: string;
  activeArtifactId?: string;
  battleScenarioKey?: string;
  battleBgmUrl?: string;
}

export type InterceptSpawnOrigin =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top_left'
  | 'top_right'
  | 'bottom_left'
  | 'bottom_right'
  | 'marker_pos';

export type InterceptActorSource =
  | 'custom_inline' // NPC criado na hora com nome, PNG e 4 direções
  | 'existing_npc'  // Usa um marcador NPC já presente no mapa
  | 'character_roster'; // Usa um personagem salvo do Editor de Personagens

export type InterceptPostBehavior =
  | 'stay_at_destination' // Permanece no destino como NPC interagível
  | 'return_and_vanish'   // Caminha para fora da tela e some
  | 'follow_player';      // Continua acompanhando o jogador como aliado

export interface InterceptEventConfig {
  // 1. Quem Intercepta (Ator)
  actorSource: InterceptActorSource;
  existingNpcMarkerId?: string; // Se actorSource === 'existing_npc'
  characterRosterId?: string;   // Se actorSource === 'character_roster'
  inlineNpcName?: string;       // Nome do NPC feito na hora (ex: "Capitã Lyra")
  inlineNpcColor?: string;
  inlineNpcSize?: number;       // Tamanho em px (padrão 64)
  inlineNpcPng?: string;        // Sprite base / Frente
  inlineAvatarUpPng?: string;
  inlineAvatarDownPng?: string;
  inlineAvatarLeftPng?: string;
  inlineAvatarRightPng?: string;

  // 2. De Onde Surge e Como se Aproxima
  spawnOrigin: InterceptSpawnOrigin; // Canto da tela de onde surge
  approachSpeed?: number;            // Velocidade ao correr até o player (padrão 3.8)
  stopDistanceFromPlayer?: number;   // Distância que para na frente do player (padrão 52px)
  showExclamationEmote?: boolean;    // Exibe balão '❗' ao surgir e correr até o player
  cameraFocusOnInterceptor?: boolean;// Foca/dá zoom suave na abordagem
  interceptCameraZoom?: number;      // Zoom durante a abordagem (ex: 1.25)

  // 3. Fala Inicial ao Abordar o Jogador
  greetingDialogues: string[];       // Frases ditas assim que chega até o player

  // 4. Escolta / Guiar Locomoção do Jogador ("Levar a algum lugar")
  escortEnabled: boolean;            // Se após falar, leva o player até um destino controlando a locomoção dele
  destinationType?: 'marker' | 'coordinates';
  destinationMarkerId?: string;      // Marcador de destino para onde o NPC leva o player
  destinationX?: number;             // Coordenada X caso destinationType === 'coordinates'
  destinationY?: number;             // Coordenada Y caso destinationType === 'coordinates'
  escortSpeed?: number;              // Velocidade da caminhada guiada (padrão 3.0)
  playerFollowOffset?: number;       // Distância que o player caminha atrás/ao lado do guia (padrão 44px)
  escortBannerText?: string;         // Frase exibida no topo/balão durante o trajeto (ex: "Seguindo Capitã Lyra...")

  // 5. Chegada no Destino (Mais Diálogos, Quests ou Outros Eventos)
  arrivalDialogues?: string[];       // Frases ditas ao chegar no local de destino
  onArrivalEventMarkerId?: string;   // Dispara outro marcador de evento ao chegar no destino
  onArrivalQuestId?: string;         // Inicia ou avança uma Quest ao chegar
  onArrivalRewardCoins?: number;     // Ouro concedido ao concluir a escolta
  actorPostBehavior?: InterceptPostBehavior;
}

export const DEFAULT_INTERCEPT_CONFIG: InterceptEventConfig = {
  actorSource: 'custom_inline',
  inlineNpcName: 'Capitã Lyra (Guia Real)',
  inlineNpcColor: '#f59e0b',
  inlineNpcSize: 64,
  spawnOrigin: 'top_right',
  approachSpeed: 3.8,
  stopDistanceFromPlayer: 52,
  showExclamationEmote: true,
  cameraFocusOnInterceptor: true,
  interceptCameraZoom: 1.25,
  greetingDialogues: [
    'Alto lá, viajante! Esta área está repleta de perigos à frente.',
    'Venha comigo! Vou guiar você em segurança até o nosso ponto de encontro.',
  ],
  escortEnabled: true,
  destinationType: 'marker',
  escortSpeed: 3.1,
  playerFollowOffset: 44,
  escortBannerText: 'Seguindo até o destino...',
  arrivalDialogues: [
    'Chegamos em segurança! Aqui você encontrará abrigo e suprimentos.',
    'Boa sorte na sua jornada, herói!',
  ],
  onArrivalRewardCoins: 100,
  actorPostBehavior: 'stay_at_destination',
};

export type MarkerEventActionType =
  | 'quest'
  | 'dialogue'
  | 'teleport'
  | 'sound_area'
  | 'cinematic'
  | 'weather'
  | 'reward'
  | 'intercept';

export interface MarkerEventItem {
  id: string;
  type: MarkerEventActionType;
  title?: string;
  timing: 'simultaneous' | 'sequential'; // 'simultaneous' = ao mesmo tempo; 'sequential' = em sequência
  delay?: number; // Delay em segundos antes de disparar (padrão 0)
  delaySeconds?: number; // Compatibilidade com delay em segundos
  waitPrevious?: boolean; // Se aguarda o evento anterior terminar antes de iniciar
  trigger?: 'contact' | 'interact' | 'auto_start' | 'sub_event'; // Gatilho de ativação

  // 1. Config de Quest / Missão
  quest?: {
    kind: 'collect' | 'talk' | 'discover' | 'duel';
    title?: string;
    instructions?: string;
    resourceType?: string;
    resourceName?: string;
    iconEmoji?: string;
    requiredAmount?: number;
    targetMarkerIds?: string[];
  };

  // 2. Config de Diálogo
  dialogueId?: string;
  dialogueText?: string;
  dialogueSpeaker?: string;

  // 3. Config de Teleporte / Portal
  teleportTargetMarkerId?: string;
  teleportTargetType?: 'marker' | 'level' | 'sub_biome';
  teleportAuto?: boolean;

  // 4. Config de Som por Área
  audioUrl?: string;
  audioShape?: 'circle' | 'rect';
  audioRadius?: number;
  audioWidth?: number;
  audioHeight?: number;
  audioVolume?: number;
  audioBlendMode?: 'mix' | 'solo' | 'blend_bgm' | 'loop' | 'one_shot';
  audioPlaybackMode?: 'restart' | 'continuous'; // 'restart' = do zero a cada encontro; 'continuous' = som contínuo na fase

  // 5. Config de Cinemática de Câmera
  cinematicTargetType?: 'marker' | 'coordinate' | 'player';
  cinematicTargetMarkerId?: string;
  cinematicTargetX?: number;
  cinematicTargetY?: number;
  cinematicZoom?: number;
  cinematicPanInDuration?: number;
  cinematicHoldDuration?: number;
  cinematicPanOutDuration?: number;
  cinematicFreezePlayer?: boolean;

  // 6. Config de Clima & Atmosfera
  weatherType?: 'none' | 'night' | 'rain' | 'dawn' | 'leaves';
  weatherDuration?: number;

  // 7. Config de Recompensas
  rewardSlots?: (string | null)[];

  // 8. Config de Interceptação & Escolta Guiada ("Intercept")
  interceptConfig?: InterceptEventConfig;
}

export type RouteStyle = 'dashed' | 'solid' | 'dotted' | 'footprints' | 'glowing';

export interface MapRoute {
  id: string;
  name: string;
  color: string;
  style: RouteStyle;
  markerIds: string[];
  isAnimated: boolean;
  notes: string;
}

export interface PlayerConfig {
  id: string;
  name: string;
  x: number; // Posição X no mapa em pixels
  y: number; // Posição Y no mapa em pixels
  avatarPng?: string; // PNG do personagem do jogador (Padrão/Idle)
  avatarUpPng?: string; // PNG para cima (Cima no Joystick)
  avatarDownPng?: string; // PNG para baixo (Baixo no Joystick)
  avatarLeftPng?: string; // PNG para esquerda (Esquerda no Joystick)
  avatarRightPng?: string; // PNG para direita (Direita no Joystick)
  scale?: number; // Multiplicador de escala da imagem PNG (ex: 0.5 a 3.0, padrão 1.0)
  autoBounce?: boolean; // Animação sutil de respiração/bounce de malha no mapa (padrão true)
  jellyStyle?: 'classic' | 'spring' | 'step_walk' | 'squash_intense' | 'organic_jitter' | 'pulse_beat'; // Estilo de física do tremor
  jellyIntensity?: number; // Multiplicador de intensidade/amplitude ao caminhar (0.0 a 3.0, padrão 1.0)
  jellyIdleIntensity?: number; // Multiplicador de intensidade/amplitude quando parado no Idle (0.0 a 2.0, padrão 0.35)
  jellySpeed?: number; // Multiplicador de velocidade (0.2 a 3.0, padrão 1.0)
  showNameTag?: boolean; // Exibir ou ocultar tag de nome sobre o personagem (padrão false quando tem PNG)
  color?: string; // Cor do marcador do jogador
  speed?: number; // Velocidade de movimento
  motionLayers?: MarkerMotionLayer[]; // Composição de peças e física do Motion Canvas herdada
  equippedMotionTags?: string[]; // Tags de Motion Items (roupas/skins/cintos/armas) atualmente equipadas no personagem
  unlockedMotionTags?: string[]; // Tags de Motion Items já adquiridas/desbloqueadas pelo jogador
  inventory?: PlayerInventoryConfig; // Inventário global do jogador vinculado
  // Propriedades do Editor de Personagens (Multi-personagens, classes, inventário pré-definido)
  characterId?: string; // ID único do personagem na biblioteca
  description?: string; // Descrição ou biografia/classe (ex: "Guerreiro experiente", "Maga Elemental")
  role?: string; // Classe / Papel do personagem
  defaultInventorySlots?: number; // Limite padrão de slots da mochila (ex: 24, 30, 36, 48)
  defaultCurrencies?: { gold: number; gems: number }; // Moedas padrão iniciais
  startingItemIds?: { itemId: string; quantity: number }[]; // Itens iniciais da mochila
  startingEquipment?: { weaponId?: string; armorId?: string; accessoryId?: string }; // Equipamentos iniciais
  stats?: {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    speed?: number;
    magic?: number;
  }; // Atributos e estatísticas de combate/jogo
  // Sistema de Crescimento, Curva de XP e Níveis (Seção 18)
  growthConfig?: CharacterGrowthConfig;
  currentLevel?: number;
  currentXp?: number; // XP incremental dentro do nível atual
  totalCumulativeXp?: number; // XP acumulado desde o nível 1
  // Sistema de Pet Companheiro & Dash do Jogador
  petConfig?: PlayerPetConfig;
  dashConfig?: PlayerDashConfig;
  // Configuração padrão para uso como NPC Action / Patrulha Procedural no Editor de Fases e Eventos
  npcPresetMode?: 'passive_action_procedural' | 'curious_action_procedural' | 'hostile_action' | 'patrol_procedural';
  defaultActionNpc?: Partial<ActionNpcConfig>;
  defaultNpcPatrol?: MapMarker['npcPatrol'];
  sourceSubfolder?: string;
}

export type PetAttackStyle =
  | 'walker_dash'
  | 'flying_ranged'
  | 'flying_dive'
  | 'walker_ranged'
  | 'berserker_spin';

export type PetLocomotionType = 'walker' | 'flying';

export type PetAiAggroMode = 'command_auto' | 'defensive_guard' | 'full_autonomous';

export interface PlayerPetCatalogItem {
  id: string;
  name: string;
  iconEmoji: string;
  avatarPng?: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  roleLabel?: string;
  shortDescription: string;
  detailedLore?: string;
  hp?: number;
  maxHp?: number;
  defense?: number;
  level?: number;
  xp?: number;
  maxXp?: number;
  growthPerLevel?: number; // % de crescimento visual por nível (ex: 0.05 = +5% de escala por nível)
  locomotionType?: PetLocomotionType;
  attackStyle?: PetAttackStyle;
  aiAggroMode?: PetAiAggroMode;
  projectileEmoji?: string;
  attackDamage: number;
  attackRange: number;
  scale: number;
  followLagSteps?: number;
  curiousRadius?: number;
  curiousSpeed?: number;
  color?: string;
  scannedFromMarkerId?: string;
  motionLayers?: MarkerMotionLayer[]; // Camadas e Rigging 2D do Pet no Motion Canvas
}

export interface PlayerPetConfig {
  enabled?: boolean; // Se o pet está ativo acompanhando o herói (padrão true)
  activePetId?: string | null; // ID do pet atualmente invocado no mapa
  activePetSlotIndex?: number; // Índice ativo entre os 3 slots (0, 1 ou 2)
  equippedPetIds?: (string | null)[]; // 3 slots de Pets/Cartas equipadas na Mochila, Deck e Cápsula Vertical da UI
  name?: string;
  iconEmoji?: string;
  avatarPng?: string;
  hp?: number;
  maxHp?: number;
  defense?: number;
  level?: number;
  xp?: number;
  maxXp?: number;
  growthPerLevel?: number;
  locomotionType?: PetLocomotionType;
  attackStyle?: PetAttackStyle;
  aiAggroMode?: PetAiAggroMode;
  projectileEmoji?: string;
  scale?: number;
  followLagSteps?: number; // Quantos passos de trilha atrás do herói o pet refaz (padrão 12)
  curiousRadius?: number; // Raio em px em que o pet anda curioso em volta ao parar (padrão 46)
  curiousSpeed?: number; // Velocidade do passeio curioso (padrão 1.0)
  attackDamage?: number; // Dano causado pelo pet aos Action NPCs inimigos (padrão 35)
  attackRange?: number; // Alcance em px para o pet atacar inimigos (padrão 200)
  color?: string;
  petGallery?: PlayerPetCatalogItem[];
  motionLayers?: MarkerMotionLayer[];
}

export interface PlayerDashConfig {
  distance?: number; // Distância do dash em px (padrão 115)
  durationMs?: number; // Duração do dash em ms (padrão 180)
  cooldownMs?: number; // Cooldown entre dashes em ms (padrão 420)
}

export const DEFAULT_PET_GALLERY: PlayerPetCatalogItem[] = [
  {
    id: 'pet-drake-solar',
    name: 'Draco Solar (Ignis)',
    iconEmoji: '🐉',
    rarity: 'legendary',
    roleLabel: 'Voador • Mergulho & Rajada',
    shortDescription: 'Dragãozinho voador que cresce a cada nível e dispara chamas solares contra mobs.',
    detailedLore:
      'Nascido nas forjas solares da Cidadela. Segue fielmente o rastro do herói, flutua curioso quando o grupo descansa e ataca até atordoar o inimigo em 50% PV.',
    hp: 160,
    maxHp: 160,
    defense: 22,
    level: 1,
    xp: 0,
    maxXp: 100,
    growthPerLevel: 0.06,
    locomotionType: 'flying',
    attackStyle: 'flying_ranged',
    aiAggroMode: 'command_auto',
    projectileEmoji: '🔥',
    attackDamage: 35,
    attackRange: 220,
    scale: 0.85,
    followLagSteps: 12,
    curiousRadius: 48,
    curiousSpeed: 1.0,
    color: '#f59e0b',
  },
  {
    id: 'pet-fox-aurora',
    name: 'Raposa Astral (Kitsune)',
    iconEmoji: '🦊',
    rarity: 'epic',
    roleLabel: 'Caminhante • Disparo Astral',
    shortDescription: 'Raposa mística super curiosa com disparo espiritual e bote ágil contra mobs.',
    detailedLore:
      'Espírito das florestas de cristal. Quando o herói para, ela circula curiosa farejando segredos e dispara orbes astrais que atordoam o inimigo em 50% PV.',
    hp: 130,
    maxHp: 130,
    defense: 16,
    level: 1,
    xp: 0,
    maxXp: 100,
    growthPerLevel: 0.05,
    locomotionType: 'walker',
    attackStyle: 'walker_ranged',
    aiAggroMode: 'command_auto',
    projectileEmoji: '✨',
    attackDamage: 28,
    attackRange: 210,
    scale: 0.78,
    followLagSteps: 10,
    curiousRadius: 54,
    curiousSpeed: 1.25,
    color: '#ec4899',
  },
  {
    id: 'pet-wolf-frost',
    name: 'Lobo da Geada (Fenrir)',
    iconEmoji: '🐺',
    rarity: 'rare',
    roleLabel: 'Caminhante • Ataque com Dash',
    shortDescription: 'Filhote de lobo ártico que avança com Dash veloz até deixar o mob tonto.',
    detailedLore:
      'Criado nas montanhas do norte. Nunca abandona a trilha do seu mestre e executa investidas com Dash congelante.',
    hp: 150,
    maxHp: 150,
    defense: 20,
    level: 1,
    xp: 0,
    maxXp: 100,
    growthPerLevel: 0.055,
    locomotionType: 'walker',
    attackStyle: 'walker_dash',
    aiAggroMode: 'command_auto',
    projectileEmoji: '❄️',
    attackDamage: 32,
    attackRange: 190,
    scale: 0.82,
    followLagSteps: 11,
    curiousRadius: 44,
    curiousSpeed: 1.1,
    color: '#38bdf8',
  },
  {
    id: 'pet-fairy-lumina',
    name: 'Fada Lumina (Sylph)',
    iconEmoji: '🧚',
    rarity: 'epic',
    roleLabel: 'Voador • Ataque à Distância',
    shortDescription: 'Fada voadora de longo alcance que dispara rajadas estelares nos inimigos.',
    detailedLore:
      'Uma guardiã etérea dos bosques antigos. Voa em círculos curiosos quando você para e ataca monstros a grande distância.',
    hp: 115,
    maxHp: 115,
    defense: 14,
    level: 1,
    xp: 0,
    maxXp: 100,
    growthPerLevel: 0.045,
    locomotionType: 'flying',
    attackStyle: 'flying_ranged',
    aiAggroMode: 'command_auto',
    projectileEmoji: '🌟',
    attackDamage: 26,
    attackRange: 250,
    scale: 0.74,
    followLagSteps: 9,
    curiousRadius: 52,
    curiousSpeed: 1.3,
    color: '#a855f7',
  },
  {
    id: 'pet-tiger-thunder',
    name: 'Tigre Relâmpago (Raiko)',
    iconEmoji: '🐯',
    rarity: 'legendary',
    roleLabel: 'Caminhante • Giro Furioso',
    shortDescription: 'Tigre elétrico de assalto que desfere combos giratórios de alto impacto.',
    detailedLore:
      'Descendente das feras trovão. Acompanha cada passo do herói e destrói defesas inimigas com investidas elétricas contínuas.',
    hp: 180,
    maxHp: 180,
    defense: 25,
    level: 1,
    xp: 0,
    maxXp: 100,
    growthPerLevel: 0.06,
    locomotionType: 'walker',
    attackStyle: 'berserker_spin',
    aiAggroMode: 'command_auto',
    projectileEmoji: '⚡',
    attackDamage: 42,
    attackRange: 195,
    scale: 0.88,
    followLagSteps: 13,
    curiousRadius: 46,
    curiousSpeed: 1.15,
    color: '#eab308',
  },
  {
    id: 'pet-slime-royal',
    name: 'Slime Real (Pingo)',
    iconEmoji: '👑',
    rarity: 'rare',
    roleLabel: 'Caminhante • Salto Dash',
    shortDescription: 'Slime coroado saltitante que cresce muito com alimentos e dá botes elásticos.',
    detailedLore:
      'Um slime nobre e extremamente curioso de Slimelands. Adora comer itens pet, crescer de tamanho e atordoar slimes rebeldes.',
    hp: 145,
    maxHp: 145,
    defense: 18,
    level: 1,
    xp: 0,
    maxXp: 100,
    growthPerLevel: 0.07,
    locomotionType: 'walker',
    attackStyle: 'walker_dash',
    aiAggroMode: 'command_auto',
    projectileEmoji: '💧',
    attackDamage: 24,
    attackRange: 180,
    scale: 0.75,
    followLagSteps: 12,
    curiousRadius: 42,
    curiousSpeed: 1.0,
    color: '#10b981',
  },
];

export function getResolvedPlayerPetConfig(player?: PlayerConfig): {
  enabled: boolean;
  activePetId: string | null;
  activePetSlotIndex: number;
  equippedPetIds: (string | null)[];
  equippedPets: (PlayerPetCatalogItem | null)[];
  activePet: PlayerPetCatalogItem | null;
  petGallery: PlayerPetCatalogItem[];
  hp: number;
  maxHp: number;
  defense: number;
  level: number;
  xp: number;
  maxXp: number;
  growthPerLevel: number;
  locomotionType: PetLocomotionType;
  attackStyle: PetAttackStyle;
  aiAggroMode: PetAiAggroMode;
  projectileEmoji: string;
  followLagSteps: number;
  curiousRadius: number;
  curiousSpeed: number;
  attackDamage: number;
  attackRange: number;
  baseScale: number;
  scale: number; // Escala efetiva já somando o crescimento por Nível!
} {
  const cfg = player?.petConfig;
  const gallery =
    cfg?.petGallery && cfg.petGallery.length > 0 ? cfg.petGallery : DEFAULT_PET_GALLERY;
  const enabled = cfg?.enabled !== false;

  // Garante sempre 3 slots de Pets/Cartas equipadas (para Mochila, Deck e Cápsula Vertical da UI)
  const rawEquipped = cfg?.equippedPetIds;
  const equippedPetIds: (string | null)[] = [
    rawEquipped && rawEquipped.length > 0 ? rawEquipped[0] : (gallery[0]?.id ?? null),
    rawEquipped && rawEquipped.length > 1 ? rawEquipped[1] : (gallery[1]?.id ?? null),
    rawEquipped && rawEquipped.length > 2 ? rawEquipped[2] : (gallery[5]?.id ?? gallery[2]?.id ?? null),
  ];

  const equippedPets: (PlayerPetCatalogItem | null)[] = equippedPetIds.map((pid) =>
    pid ? gallery.find((g) => g.id === pid) || null : null
  );

  let activePetSlotIndex =
    typeof cfg?.activePetSlotIndex === 'number' && cfg.activePetSlotIndex >= 0 && cfg.activePetSlotIndex < 3
      ? cfg.activePetSlotIndex
      : 0;

  let activePetId =
    cfg?.activePetId !== undefined
      ? cfg.activePetId
      : (equippedPetIds[activePetSlotIndex] ?? equippedPetIds.find(Boolean) ?? gallery[0]?.id ?? 'pet-drake-solar');

  if (activePetId) {
    const slotMatch = equippedPetIds.findIndex((id) => id === activePetId);
    if (slotMatch >= 0) activePetSlotIndex = slotMatch;
  }

  const foundPet = activePetId ? gallery.find((p) => p.id === activePetId) || gallery[0] || null : null;

  const level = Math.max(1, foundPet?.level ?? cfg?.level ?? 1);
  const growthPerLevel = foundPet?.growthPerLevel ?? cfg?.growthPerLevel ?? 0.055;
  const baseScale = foundPet?.scale ?? cfg?.scale ?? 0.8;
  // O pet cresce de tamanho conforme sobe de nível!
  const effectiveScale = Math.min(2.6, baseScale * (1 + (level - 1) * growthPerLevel));
  // O PV máximo e o Dano também escalam com o nível caso não tenham sido sobrescritos manualmente
  const maxHp = foundPet?.maxHp ?? cfg?.maxHp ?? 140 + (level - 1) * 18;
  const hp = Math.min(maxHp, Math.max(1, foundPet?.hp ?? cfg?.hp ?? maxHp));
  const defense = foundPet?.defense ?? cfg?.defense ?? 15 + (level - 1) * 3;
  const xp = foundPet?.xp ?? cfg?.xp ?? 0;
  const maxXp = foundPet?.maxXp ?? cfg?.maxXp ?? level * 100;
  const locomotionType: PetLocomotionType =
    foundPet?.locomotionType ||
    cfg?.locomotionType ||
    (foundPet?.attackStyle?.startsWith('flying') ? 'flying' : 'walker');
  const attackStyle: PetAttackStyle =
    foundPet?.attackStyle || cfg?.attackStyle || (locomotionType === 'flying' ? 'flying_ranged' : 'walker_dash');
  const aiAggroMode: PetAiAggroMode =
    foundPet?.aiAggroMode || cfg?.aiAggroMode || 'command_auto';
  const projectileEmoji = foundPet?.projectileEmoji || cfg?.projectileEmoji || '🔥';
  const attackDamage = foundPet?.attackDamage ?? cfg?.attackDamage ?? 32;
  const attackRange = foundPet?.attackRange ?? cfg?.attackRange ?? 200;

  const activePet: PlayerPetCatalogItem | null =
    enabled && foundPet
      ? {
          ...foundPet,
          name: foundPet.name || cfg?.name || 'Pet Companheiro',
          iconEmoji: foundPet.iconEmoji || cfg?.iconEmoji || '🐾',
          avatarPng: foundPet.avatarPng !== undefined ? foundPet.avatarPng : cfg?.avatarPng,
          hp,
          maxHp,
          defense,
          level,
          xp,
          maxXp,
          growthPerLevel,
          locomotionType,
          attackStyle,
          aiAggroMode,
          projectileEmoji,
          scale: baseScale,
          followLagSteps: foundPet.followLagSteps ?? cfg?.followLagSteps ?? 12,
          curiousRadius: foundPet.curiousRadius ?? cfg?.curiousRadius ?? 48,
          curiousSpeed: foundPet.curiousSpeed ?? cfg?.curiousSpeed ?? 1.0,
          attackDamage,
          attackRange,
          color: foundPet.color || cfg?.color || '#f59e0b',
          motionLayers: foundPet.motionLayers || cfg?.motionLayers,
        }
      : null;

  return {
    enabled: enabled && !!activePet,
    activePetId: activePet ? activePet.id : null,
    activePetSlotIndex,
    equippedPetIds,
    equippedPets,
    activePet,
    petGallery: gallery,
    hp,
    maxHp,
    defense,
    level,
    xp,
    maxXp,
    growthPerLevel,
    locomotionType,
    attackStyle,
    aiAggroMode,
    projectileEmoji,
    followLagSteps: activePet?.followLagSteps ?? cfg?.followLagSteps ?? 12,
    curiousRadius: activePet?.curiousRadius ?? cfg?.curiousRadius ?? 48,
    curiousSpeed: activePet?.curiousSpeed ?? cfg?.curiousSpeed ?? 1.0,
    attackDamage,
    attackRange,
    baseScale,
    scale: effectiveScale,
  };
}

export type InventoryItemType = 'weapon' | 'armor' | 'potion' | 'key' | 'collectible' | 'currency' | 'drop' | 'custom';

export type InventoryItemCategory =
  | 'weapon'
  | 'armor'
  | 'accessory'
  | 'potion'
  | 'key'
  | 'material'
  | 'currency'
  | 'drop'
  | 'consumable'
  | 'collectible'
  | 'quest'
  | 'readable'
  | 'equipment'
  | 'item_pet'
  | 'special';

export type InventoryItemAction =
  | 'use'
  | 'read'
  | 'equip'
  | 'deliver'
  | 'inspect'
  | 'drop'
  | 'split';

export type InventoryItemRarity =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'epic'
  | 'legendary';

export type ItemStateTag =
  | 'collectible' // Coletável no chão do mapa
  | 'storable' // Armazenável na mochila / baú
  | 'deliverable' // Entregável em quests / NPCs
  | 'equipable' // Equipável no corpo do herói
  | 'consumable' // Consumível (poção, comida, elixir)
  | 'tradable' // Vendável / Trocável com mercadores
  | 'buyable' // Comprável em lojas / NPCs
  | 'natural_biome_spawn' // Spawn Natural por Bioma
  | 'motion_item'; // Camada / Roupa / Equipamento animado do Motion Canvas

export type ItemCurrencyType =
  | 'gold' // Moedas de Ouro (🪙)
  | 'gems' // Gemas / Diamantes (💎)
  | 'crystals' // Cristais Arcanos (🔮)
  | 'tokens' // Fichas de Guilda / Honra (🎟️)
  | 'souls' // Essência / Almas (🔥)
  | 'barter'; // Escambo / Troca por outro Item (🤝)

export interface ItemNaturalBiomeSpawnConfig {
  enabled: boolean;
  biomeIds: string[]; // IDs ou tipos dos biomas onde o item nasce naturalmente
  spawnDensityPerBiome?: number; // Quantidade média por faixa/região do bioma (1 a 15)
  spawnChancePercent?: number; // Chance de spawn (1% a 100%)
  avoidPaths?: boolean; // Evitar gerar em cima da estrada principal
  minDistanceBetweenSpawns?: number; // Distância mínima em px
}

export interface ItemReadablePage {
  pageNumber: number;
  title?: string;
  text: string;
  illustrationPng?: string;
}

export interface ItemReadableContent {
  type: 'book' | 'letter' | 'scroll' | 'artifact';
  author?: string;
  recipient?: string;
  title?: string;
  date?: string;
  pages: ItemReadablePage[];
  onReadEventId?: string;
  onReadQuestId?: string;
  onReadVariable?: { key: string; value: any };
}

export interface InventoryItemDefinition {
  id: string; // ID único universal (referenciado por marcadores, quests, diálogos)
  name: string;
  iconPng?: string;
  iconEmoji?: string;
  shortDescription: string;
  detailedDescription?: string;
  category: InventoryItemCategory;
  subCategory?: string; // ex: 'potion', 'herb', 'key', 'book', 'letter', 'scroll', 'weapon', 'armor', 'relic'
  rarity: InventoryItemRarity;
  stackable: boolean;
  maxStack: number; // Padrão 99 para consumíveis/materiais, 1 para equipamentos/itens únicos
  isUnique?: boolean; // Não permite múltiplas instâncias se true
  isQuestProtected?: boolean; // Não pode ser vendido ou descartado
  buyPrice?: number; // Preço de compra
  sellPrice?: number; // Preço de venda
  currencyType?: ItemCurrencyType; // Tipo de moeda (ouro, gemas, cristais, fichas, escambo)
  barterRequirementText?: string; // Ex: "3x Tronco de Carvalho" quando currencyType === 'barter'
  stateTags?: ItemStateTag[]; // Tags de estado: coletável, armazenável, entregável, equipável, consumível, vendável/trocável, comprável, spawn natural por bioma
  naturalBiomeSpawn?: ItemNaturalBiomeSpawnConfig; // Configuração de Spawn Natural por Bioma + Seletor de Biomas
  usableActions: InventoryItemAction[];
  
  // Efeitos de Consumíveis
  consumableEffect?: {
    hpRestore?: number;
    manaRestore?: number;
    speedBoost?: number;
    durationSec?: number;
    soundEffectUrl?: string;
    customMessage?: string;
  };

  // Atributos de Equipamento
  equipmentStats?: {
    slot: 'weapon' | 'armor' | 'accessory' | 'helmet' | 'boots' | 'belt' | 'skin' | 'cape' | 'wings';
    attack?: number;
    defense?: number;
    speed?: number;
  };

  // Vínculo com Camadas do Motion Canvas (Paper-Doll / Roupas / Skins / Cinto / Arma com Física)
  motionLayerTag?: string; // Tag que revela/equipa todas as camadas com este inventoryItemTag no personagem
  motionEquipSlot?: 'skin' | 'head' | 'armor' | 'belt' | 'boots' | 'weapon' | 'cape' | 'wings' | 'accessory';

  // Conteúdo de Leitura (Livros, Cartas, Pergaminhos)
  readableContent?: ItemReadableContent;

  // Integração com Motor de Eventos & Quests
  linkedQuestId?: string;
  linkedEventId?: string;
  linkedDialogueId?: string;
  variableToSetOnAcquire?: { key: string; value: any };
  variableToSetOnUse?: { key: string; value: any };
}

export interface PlayerInventoryItem {
  id: string; // ID da instância no inventário
  definitionId?: string; // Referência à biblioteca central de itens
  name: string;
  description?: string;
  detailedDescription?: string;
  iconEmoji?: string;
  iconPng?: string;
  quantity: number;
  maxStack?: number;
  type: InventoryItemCategory | string;
  category?: InventoryItemCategory;
  subCategory?: string;
  rarity?: InventoryItemRarity;
  equipped?: boolean;
  slotIndex?: number;
  isQuestProtected?: boolean;
  isUnique?: boolean;
  buyPrice?: number;
  sellPrice?: number;
  currencyType?: ItemCurrencyType;
  barterRequirementText?: string;
  stateTags?: ItemStateTag[];
  naturalBiomeSpawn?: ItemNaturalBiomeSpawnConfig;
  usableActions?: InventoryItemAction[];
  readableContent?: ItemReadableContent;
  consumableEffect?: {
    hpRestore?: number;
    manaRestore?: number;
    speedBoost?: number;
    durationSec?: number;
    soundEffectUrl?: string;
    customMessage?: string;
  };
  stats?: {
    attack?: number;
    defense?: number;
    speed?: number;
    healthRestore?: number;
  };
  sourceLevelId?: string; // Fase ou local de onde veio o item
  motionLayerTag?: string; // Tag vinculada às camadas do Motion Canvas do personagem
  motionEquipSlot?: 'skin' | 'head' | 'armor' | 'belt' | 'boots' | 'weapon' | 'cape' | 'wings' | 'accessory';
}

export interface PlayerInventoryConfig {
  enabled: boolean;
  maxSlots: number; // ex: 35 slots padrão (editável: 10 a 60)
  columns: number; // ex: 5 colunas
  currencies: {
    gold: number;
    gems: number;
  };
  items: PlayerInventoryItem[];
  equippedWeaponId?: string | null;
  equippedArmorId?: string | null;
  equippedAccessoryId?: string | null;
}

export interface CloudConfig {
  enabled?: boolean;
  customCloudPng?: string;
  customCloudPngs?: string[];
  cloudCount?: number;
  edgeOpacity?: number;
  centerTransparency?: number;
  speed?: number; // em segundos
  showTopClouds?: boolean; // Nuvens no céu acima do player com desvanecer central
  showGroundFog?: boolean; // Neblina rasteira no chão abaixo do player
  fogIntensity?: number; // Intensidade da neblina rasteira (0 a 1)
  randomScalePercent?: number; // Variação aleatória de escala das nuvens em % (0 a 200%, padrão 60%)
  baseCloudScale?: number; // Escala base das nuvens em % (50 a 300%, padrão 100%)
}

export interface FogConfig {
  enabled?: boolean; // Se a neblina rasteira / névoa de solo está ativa
  fogCount?: number; // Densidade de bancos de névoa no solo (1 a 10, padrão 5)
  opacity?: number; // Opacidade da névoa (0.05 a 0.8, padrão 0.22)
  speed?: number; // Velocidade de deslizamento e deriva em segundos (10s a 60s, padrão 32s)
  tintColor?: string; // Cor / tonalidade da névoa ('#ffffff', '#60a5fa', '#34d399', '#94a3b8')
  groundLevelPercent?: number; // Altura de cobertura no solo em % (10% a 100%, padrão 60%)
  customFogPngs?: string[]; // Texturas PNG personalizadas de névoa
  customFogPng?: string;
}

export interface LeavesConfig {
  enabled?: boolean; // Se o modo de folhas está ativo (forçado ou preview)
  preset?: 'autumn' | 'spring' | 'dry' | 'jungle' | 'mystic' | 'frost' | 'neon' | 'custom'; // Presets de grupos de folhas: 'autumn' (Outono), 'spring' (Primavera), 'dry' (Secas), 'jungle' (Selva), 'mystic' (Místicas Roxas), 'frost' (Gélidas), 'neon' (Ciano/Neon)
  customTint?: string; // Matiz / Cor personalizada para tingir qualquer grupo de folhas ('#e11d48', '#8b5cf6', etc.)
  customColors?: string[]; // Paleta de cores hex personalizadas do grupo
  leafCount?: number; // Densidade de folhas voando no mapa (4 a 60, padrão 24)
  baseSize?: number; // Tamanho base em pixels (16px a 84px, padrão 36px)
  randomScalePercent?: number; // Variação randômica de escala em % (0 a 150%, padrão 60%)
  speed?: number; // Duração do voo em segundos (1.5s ventania a 8s brisa suave, padrão 4.2s)
  opacity?: number; // Opacidade máxima das folhas (0.3 a 1.0, padrão 0.95)
  customLeafPngs?: string[]; // Sprites PNG de folhas personalizadas enviadas pelo usuário
}

export interface RainConfig {
  enabled?: boolean; // Se o modo de chuva está ativo
  intensity?: number; // Quantidade de gotas no ar (15 a 70, padrão 42)
  splashCount?: number; // Densidade de poças/ondulações no solo (10 a 50, padrão 24)
  splashSize?: number; // Diâmetro das ondulações no solo em px (14px a 48px, padrão 26px)
  speed?: number; // Velocidade das gotas em segundos (0.3s a 1.0s, padrão 0.5s)
  puddlesEnabled?: boolean; // Poças d'água procedurais com reflexo brilhante e ondulações no chão
  puddleSplashes?: boolean; // Respingos d'água e ondas quando o herói pisa nas poças
}

export interface WindConfig {
  enabled?: boolean; // Se o modo de correntes de vento está ativo
  gustCount?: number; // Quantidade de rajadas e correntes de vento (3 a 18, padrão 7)
  speed?: number; // Velocidade em segundos (2s a 10s, padrão 4.5s)
  curvature?: number; // Intensidade da curva/ondulação das linhas (10 a 60, padrão 32)
  opacity?: number; // Opacidade das linhas de vento (0.15 a 0.8, padrão 0.38)
  color?: string; // Cor das linhas de vento (ex: '#ffffff', '#e0f2fe', '#fef08a')
}

export interface BugsConfig {
  enabled?: boolean; // Se o modo de insetos com asas está ativo
  preset?: 'all' | 'fireflies' | 'flies' | 'butterflies' | 'custom'; // Preset visual ('all' = todos juntos de uma vez!)
  activeSpecies?: Array<'fireflies' | 'flies' | 'butterflies' | 'custom'>; // Múltiplas espécies ativas simultaneamente
  bugCount?: number; // Quantidade de insetos (4 a 60, padrão 18)
  size?: number; // Tamanho em pixels (8px a 40px, padrão 15px)
  speed?: number; // Velocidade do voo errático (1.5s a 7s, padrão 3.2s)
  customBugPng?: string; // Sprite PNG de inseto personalizado
  customBugPngs?: string[]; // Múltiplos sprites PNG
  landOnPlayer?: boolean; // Pousam na cabeça/ombro do herói e em marcadores do mapa
  wingFlapSpeed?: number; // Velocidade do efeito de dobra de asas no meio (padrão 0.08s)
}

export interface AntsConfig {
  enabled?: boolean; // Se a marcha de formigas terrestres está ativa
  antCount?: number; // Quantidade de formigas nas trilhas (8 a 120, padrão 40)
  soloCount?: number; // Formigas solitárias exploradoras fora das trilhas (0 a 40, padrão 12)
  leafScale?: number; // Escala das folhinhas carregadas (0.8x a 3.0x, padrão 1.6x)
  leafChance?: number; // Probabilidade das formigas carregarem folhas grandes (0.0 a 1.0, padrão 0.5)
  trailNetwork?: 'dense' | 'loops' | 'single'; // Estilo da rede (denso com laços, circuitos fechados ou simples)
  size?: number; // Tamanho em pixels (6px a 24px, padrão 11px)
  speed?: number; // Velocidade de marcha (0.5 a 3.0, padrão 1.2)
  scatterRadius?: number; // Raio em pixels de susto quando o player se aproxima (30px a 140px, padrão 65px)
  trailPattern?: 'diagonal' | 'horizontal' | 'wavy' | 'vertical' | 'loops'; // Formato da trilha
  customAntPng?: string; // Sprite PNG da formiga
}

export interface SnowConfig {
  enabled?: boolean; // Se o modo de nevasca/neve está ativo
  density?: number; // Densidade de flocos caindo (1 a 10, padrão 6)
  speed?: number; // Velocidade de queda (1.0s a 6.0s, padrão 3.2s)
  windDrift?: number; // Inclinação do vento (-50 a 50, padrão 15)
  accumulateOnPlayer?: boolean; // Neve acumulando no topo da cabeça/ombros do PNG do herói de forma dinâmica
  accumulateOnAssets?: boolean; // Neve acumulando no topo dos assets/marcadores do mundo
  accumulateOnGround?: boolean; // Camada procedural de neve no solo
  footstepTracks?: boolean; // Neve marcando rastro / pegadas do herói no chão que se preenchem com neve fresca
  chromaticSparkle?: boolean; // Micro brilho cromático cintilante ocasional nos flocos
  customSnowPngs?: string[]; // Sprites PNG de flocos
}

export interface LightingConfig {
  enabled?: boolean; // Se a iluminação dinâmica / penumbra está ativa
  nightEnabled?: boolean; // Alias legado para controle rápido de noite/penumbra
  darknessOpacity?: number; // Opacidade da penumbra
  flashlightRadius?: number; // Raio do cone/lanterna
  showVignette?: boolean; // Efeito de vinheta de borda
  ambientDarkness?: number; // Intensidade da penumbra ambiente (0 a 1, padrão 0.82)
  ambientColor?: string; // Cor da escuridão (ex: '#020617' noite, '#0f172a' azul, '#1c1917' dungeon, '#2e1065' magia)
  heroTorchEnabled?: boolean; // Lanterna / halo de luz acoplado ao herói
  heroTorchRadius?: number; // Raio em pixels do halo do herói (padrão 180, editável 60 a 500)
  heroTorchColor?: string; // Cor da luz do herói (padrão '#fde047' âmbar)
  heroTorchIntensity?: number; // Intensidade da luz do herói (0.2 a 1.0)
  flickerStyle?: 'flame' | 'pulse' | 'steady' | 'none'; // Estilo de oscilação das tochas
  threeLayerRender?: boolean; // Render cinematográfico de 3 camadas com núcleo incandescente
  lightBloom?: number; // Realce de brilho/bloom das tochas (0 a 1)
  globalWeather?: 'none' | 'night' | 'rain' | 'dawn' | 'leaves' | 'wind' | 'bugs' | 'ants'; // Forçar clima global da fase (legado)
  globalWeathers?: ('night' | 'rain' | 'dawn' | 'leaves' | 'wind' | 'bugs' | 'ants')[]; // Múltiplos climas simultâneos
}

export interface MarkerLayer {
  id: string;
  name: string;
  visible: boolean;
  locked?: boolean;
  order: number;
  color?: string;
  isGroup?: boolean; // Se true, funciona como um Grupo/Pasta de camadas
  groupId?: string; // ID do grupo pai ao qual esta camada pertence
  expanded?: boolean; // Para grupos: se está aberto ou recolhido
}

export interface MapProject {
  id: string;
  title: string;
  description: string;
  // Cada tela é UM modo: vertical (biomas) OU extended (fases). Sem misturar.
  canvasKind?: 'vertical' | 'extended';
  mapWidth: number; // Largura padrão da área do mapa em pixels (ex: 800)
  gridType: 'squares' | 'hex' | 'none';
  biomes: BiomeTileConfig[];
  subBiomes?: SubBiomeConfig[]; // Sub-Biomas e cenários internos/instanciados
  markers: MapMarker[];
  routes: MapRoute[];
  player?: PlayerConfig;
  clouds?: CloudConfig;
  fogConfig?: FogConfig; // Neblina de solo e névoa rasteira independente de nuvens
  leavesConfig?: LeavesConfig; // Configuração física e visual das folhas de outono top-down
  rainConfig?: RainConfig; // Configuração física da chuva e ondulações no solo
  windConfig?: WindConfig; // Correntes e linhas de vento curvas procedurais
  bugsConfig?: BugsConfig; // Insetos voadores (vagalumes, moscas, asas dobráveis, pouso no player)
  antsConfig?: AntsConfig; // Insetos terrestres (formigas procedurais que reagem ao player e voltam à rota)
  snowConfig?: SnowConfig; // Neve volumétrica, acúmulo no herói/solo e brilho cromático
  lighting?: LightingConfig; // Iluminação avançada, penumbra ambiente e lanterna do herói
  walkableCells?: string[]; // Células de grade pintadas como caminháveis ("col,row")
  blockedCells?: string[]; // Células de grade pintadas como paredes/colisão sólida ("col,row")
  collisionMode?: 'walkable' | 'blockers' | 'hybrid'; // Modo de colisão preferencial
  restrictPlayerToPaintedAreas?: boolean; // Se true, o player só pode andar nas áreas pintadas
  collisionGrid?: number; // Versão da grade de colisão (atual: 8px por célula)
  groundStamps?: GroundStamp[]; // Carimbos do chão posicionados
  stampLayers?: GroundStampLayer[]; // Camadas de carimbo do chão
  stampBrushConfig?: StampBrushConfig; // Configuração atual do pincel de carimbo
  galleryAssets?: GalleryAsset[]; // Acervo da Galeria de Assets
  galleryCategories?: string[]; // Categorias de assets (ex: "Geral", "Natureza", "Construções")
  localAssetFolderConfig?: {
    connected: boolean;
    folderName: string;
    lastSyncedAt?: string;
    totalAssets?: number;
  };
  markerPenConfig?: MarkerPenConfig; // Configuração do Marker Pen (pincel de marcadores neutros)
  terrainPenConfig?: TerrainPenConfig; // Configuração do Pen Terrain (pincel multimodo de terreno vivo)
  markerLayers?: MarkerLayer[]; // Camadas de organização dos marcadores
  activeMarkerLayerId?: string; // Camada ativa no momento
  savedDialogues?: SavedDialogue[]; // Biblioteca de diálogos salvos unificados
  motionOverlays?: MotionOverlayStroke[]; // Traçados de sobreposição contínuos sem corte
  spawnConfig?: SpawnConfig; // Sistema de Spawn cinemático por alvo e transporte
  screensConfig?: ProjectScreensConfig; // Sistema de Gestão de Telas, HUD e Conexão de Botões
  worldMap?: WorldMapConfig; // Configuração do Mapa Panorâmico Interativo Atual
  savedWorldMaps?: WorldMapConfig[]; // Biblioteca de Múltiplos Mapas Globais Salvos no Projeto
  activeWorldMapId?: string; // ID do Mapa Global ativo no momento
  planetGlobe?: PlanetGlobeConfig; // Configuração do Globo Planetário Interativo (Camada Primordial antes dos Mapas de Regiões)
  playerInventory?: PlayerInventoryConfig; // Sistema de Inventário Geral do Jogador (persistente em todas as fases)
  itemCatalog?: InventoryItemDefinition[]; // Biblioteca Central / Base de Dados de Itens da Engine (Reutilizável em todas as fases, quests e eventos)
  savedCharacters?: PlayerConfig[]; // Biblioteca Central de Múltiplos Personagens Salvos no Projeto
  activeCharacterId?: string; // ID do personagem atualmente selecionado/vinculado à fase
  savedInventoryProjects?: InventoryProject[]; // Biblioteca de Projetos de Inventário (cada projeto com seu próprio inventário de itens interativos)
  activeInventoryProjectId?: string; // ID do Projeto de Inventário ativo no momento
  questsConfig?: ProjectQuestsConfig; // Motor Central de Quests, Eventos, Regras Globais e Progressão
}

export interface InventoryProject {
  id: string;
  name: string;
  description?: string;
  themeColor?: string;
  createdAt: string;
  updatedAt: string;
  /** Catálogo de Itens Interativos exclusivos deste Projeto de Inventário */
  itemCatalog: InventoryItemDefinition[];
  /** Assets PNG/Sprites de itens interativos importados neste Projeto de Inventário */
  interactiveAssets: GalleryAsset[];
  /** Configuração e Itens da Mochila deste Projeto de Inventário */
  playerInventory: PlayerInventoryConfig;
}

export type SpawnEntryDirection = 'top' | 'bottom' | 'left' | 'right';
export type SpawnEffectType = 'none' | 'jelly' | 'squash' | 'float' | 'shake' | 'glow';

export interface SpawnConfig {
  enabled: boolean;
  targetX?: number;
  targetY?: number;
  targetMarkerId?: string; // Marcador ou zona de pouso
  transportPng?: string; // PNG do transporte (veículo, pássaro, montaria, etc.)
  transportName?: string;
  transportScale?: number; // Escala (0.4 a 3.0, padrão 1.0)
  entryDirection: SpawnEntryDirection; // 'top' | 'bottom' | 'left' | 'right'
  speed: number; // Duração do voo até o alvo em segundos (0.5 a 4.0, padrão 1.5)
  landingPause: number; // Tempo de pausa no pouso para soltar o herói (0.2 a 3.0, padrão 0.8)
  effect: SpawnEffectType; // Efeito no pouso (jelly, squash, float, shake, glow)
  effectIntensity: number; // Intensidade (0.1 a 1.0, padrão 0.6)
  effectSpeed: number; // Velocidade do efeito (0.5 a 2.5, padrão 1.2)
  cameraFraming: 'lower_half' | 'center'; // Alvo centralizado na metade inferior da tela
  hidePlayerDuringTransit?: boolean; // Herói só surge ao pousar
  anchorMode?: 'bottom' | 'center' | 'hover'; // Base no solo ('bottom', padrão), centro ('center') ou flutuando ('hover')
  offsetY?: number; // Ajuste fino vertical em pixels (ex: -30 para pairar no ar, 0 no solo)
  flipHorizontal?: boolean; // Espelhar horizontalmente o PNG (inverter direção)
  fadeTransition?: boolean; // Desvanecer de tela inicial antes do transporte entrar (cinemática de fase)
  introVideoUrl?: string; // Vídeo de introdução / cutscene antes do spawn
  introVideoSpeed?: number; // Velocidade de reprodução do vídeo (0.5 a 2.0, padrão 1.0)
  introAudioUrl?: string; // Áudio MP3 opcional personalizado para tocar junto da introdução
  introAudioName?: string; // Nome do arquivo MP3
  fadeColor?: string; // Cor do desvanecer (padrão '#000000', customizável)
}

export interface MotionOverlayStroke {
  id: string;
  name?: string;
  effect: string; // 'glow' | 'glitter' | 'smoke' | 'fireflies' | 'sparks' | 'water' | 'fire' | 'wind' | etc.
  brushSize: number;
  scale?: number; // Fator de escala proporcional (0.1 a 5.0, padrão 1.0)
  speed: number;
  intensity: number;
  points: { x: number; y: number }[];
  visible?: boolean;
  color?: string; // Cor personalizada (ex: água #0284c7 ou terra #16a34a)
  waterTexturePng?: string; // Textura PNG contínua importada para repetição dentro da água
  textureScale?: number; // Escala do padrão PNG (ex: 1.0)
  flowSpeed?: number; // Velocidade do fluxo
  flowAngle?: number; // Ângulo de fluxo em graus (0° a 360°)
  textureOpacity?: number; // Opacidade da textura sobre a cor de água
  waterWaveEcho?: boolean; // Eco de reflexos e marolas claras das ondas (água viva)
  waterWaveDeform?: number; // Ondulação / deformação de micro-malha orgânica da água (0.0 a 1.0)
  subBiomeId?: string;
  createdAt?: number;
}

export interface SavedDialogue {
  id: string;
  name: string;
  speaker?: string;
  characterPng?: string;
  steps: {
    id: string;
    speaker?: string;
    characterPng?: string;
    text: string;
    playerResponses?: { id: string; label: string; nextStepIndex?: number }[];
  }[];
  endEvent?: {
    kind: 'none' | 'quest' | 'duel' | 'travel' | 'weather' | 'video';
    questKind?: 'collect' | 'deliver' | 'reach' | 'interact' | 'talk' | 'discover' | 'duel';
    questTargetId?: string;
    questResourceName?: string;
    questAmount?: number;
    travelTargetMarkerId?: string;
    weatherKind?: 'night' | 'rain' | 'dawn' | 'leaves';
    videoUrl?: string;
  };
}

export interface MarkerPenConfig {
  selectedAssetIds: string[]; // IDs dos assets da galeria escolhidos para randomizar (sem limite)
  selectedTemplateMarkerIds?: string[]; // IDs de marcadores da cena usados como molde completo (com lógica, IA, vídeo, motion)
  size: number; // Tamanho base em px (24 a 200)
  spacing: number; // Espaçamento entre marcadores ao arrastar em px (30 a 300)
  randomMirrorH: boolean; // Espelho horizontal aleatório
  randomMirrorV: boolean; // Espelho vertical aleatório
  randomScale: boolean; // Variação de escala aleatória (±25%)
  randomRotation: boolean; // Rotação aleatória (0°-360°)
  targetLayerId?: string; // Camada alvo para pintar os marcadores
  markerType?: MarkerType; // Tipo do marcador gerado (padrão 'neutral')
  neutralEffect?: 'none' | 'jelly' | string; // Efeito aplicado a marcadores ('none' | 'jelly' | 'water' | etc.)
  effectSpeed?: number; // Velocidade padrão do efeito
  effectIntensity?: number; // Intensidade padrão do efeito
  npcAutoMove?: boolean; // Se ativado, novos NPCs recebem movimento automático
  npcMoveMode?: 'horizontal' | 'vertical' | 'random' | 'procedural'; // Direção ou procedural
  npcMoveDistance?: number; // Raio/distância de deslocamento (px)
  npcMoveSpeed?: number; // Velocidade de deslocamento (1 a 8)
}

export interface GalleryAsset {
  id: string;
  name: string;
  dataUrl: string;
  width?: number;
  height?: number;
  createdAt?: string;
  mirrored?: boolean;
  category?: string; // Categoria do asset (ex: "Geral", "Árvores", "Pedras", nome de pasta importada)
  subCategoryPath?: string; // Caminho completo da hierarquia ex: "Personagens/Slimes"
  tags?: string[]; // Tags para categorização rápida
  motionLayers?: MarkerMotionLayer[]; // Composição completa de camadas e animações físicas do Motion Canvas
  sourcePath?: string; // Caminho relativo do arquivo original na pasta local sincronizada
  isPersistentPhaseAsset?: boolean; // Se true, o asset foi copiado e fixado permanentemente na fase
  mediaType?: 'image' | 'video'; // Tipo de mídia do asset
  videoUrl?: string; // URL do vídeo caso seja asset em vídeo
  videoChromaKey?: VideoChromaKeyConfig; // Configurações de Chroma Key e recorte
  pivotX?: number; // Ponto de ancoragem X (0 a 1)
  pivotY?: number; // Ponto de ancoragem Y (0 a 1)
}

export interface LocalFolderAsset {
  id: string;
  name: string;
  filename: string;
  relativePath: string; // Ex: "Personagens/Slimes/slime_verde.png"
  directory: string; // Ex: "Personagens/Slimes" ou "Raiz"
  categories: string[]; // Ex: ["Personagens", "Slimes"]
  extension: string;
  size: number;
  lastModified: number;
  type: 'image' | 'video' | 'audio' | 'other';
  previewUrl: string; // Object URL ou Data URL
  dataUrl?: string; // Base64 dataUrl permanente
  fileHandle?: any; // FileSystemFileHandle
  file?: File;
  videoChromaKey?: VideoChromaKeyConfig;
}

export interface FolderTreeNode {
  name: string;
  path: string; // Ex: "Personagens/Slimes"
  fullPath: string;
  level: number;
  subfolders: FolderTreeNode[];
  fileCount: number;
  directFileCount: number;
}

export interface GroundStamp {
  id: string;
  x: number;
  y: number;
  pngUrl: string;
  size: number;
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  feather: number; // bordas desfocadas (px blur / feather)
  opacity: number;
  layerId: string;
}

export interface GroundStampLayer {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
}

export interface StampPreset {
  id: string;
  name: string;
  dataUrl: string;
}

export interface StampBrushConfig {
  pngUrl: string | null;
  size: number; // tamanho do carimbo (16px a 400px)
  feather: number; // desfoque de borda (0 a 40px)
  spacing: number; // espaçamento ao arrastar em px (10px a 200px)
  randomRotation: boolean; // rotação aleatória
  randomMirror: boolean; // espelho X/Y aleatório
  opacity: number; // opacidade do carimbo (0.1 a 1.0)
  activeLayerId: string;
  savedPresets?: StampPreset[]; // Presets salvos a partir de PNGs importados
}

export type ActiveTool = 'pan' | 'add_marker' | 'motion_pen' | 'effect_pen' | 'stamp_brush' | 'marker_pen' | 'terrain_pen';

export interface SavedLevelStats {
  biomesCount: number;
  subBiomesCount: number;
  markersCount: number;
  npcsCount: number;
  collisionCellsCount: number;
  screensCount: number;
  mapW: number;
  mapH: number;
  canvasKind: 'vertical' | 'extended';
}

export interface SavedLevel {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  projectData: MapProject;
  thumbnailPng?: string;
  stats?: SavedLevelStats;
  closedInTabs?: boolean;
  isColdStub?: boolean;
}

// --- SISTEMA DE GESTÃO DE TELAS, HUD & BOTÕES INTERATIVOS (Telas Studio) ---

export type ScreenButtonAction =
  | { type: 'navigate_screen'; targetScreenId: string }
  | { type: 'player_action'; action: 'jump' | 'attack' | 'dash' | 'interact' | 'pet_item' }
  | { type: 'open_inventory' }
  | { type: 'open_quest_popup'; initialTab?: 'jornada' | 'tarefas' }
  | { type: 'toggle_locomotion' }
  | { type: 'open_dialogue'; dialogueId?: string; markerId?: string }
  | { type: 'trigger_event'; eventName: string }
  | { type: 'pause_game' };

export interface ScreenCustomButton {
  id: string;
  name: string;
  assetUrl?: string; // PNG do botão vindo da galeria ou asset local
  iconName?: string; // Nome de ícone (ex: 'Swords', 'Zap', 'Shield', 'Sparkles', 'Heart', 'MessageSquare')
  x: number; // Posição horizontal (em px de offset a partir do ponto de âncora)
  y: number; // Posição vertical (em px a partir da base/topo)
  anchor: 'bottom_right' | 'bottom_left' | 'top_right' | 'top_left' | 'bottom_center' | 'top_center';
  scale: number; // Escala do botão (0.4 a 3.0, padrão 1.0)
  size: number; // Tamanho base em px (padrão 56)
  opacity: number; // 0.1 a 1.0 (padrão 1.0)
  visible: boolean;
  shape: 'circle' | 'square' | 'rounded';
  backgroundColor?: string;
  borderColor?: string;
  action: ScreenButtonAction;
  shortcutKey?: string; // Tecla de atalho de teclado (ex: 'Space', 'J', 'K', 'E', 'F')
}

export interface WebHudConfig {
  enabled?: boolean; // Habilita o botão/modo WEB na tela Paisagem (padrão true)
  hideJoystickInWeb?: boolean; // Oculta o joystick virtual quando o modo WEB está ativo (padrão true)
  upKey?: string; // Tecla para cima (padrão 'W')
  downKey?: string; // Tecla para baixo (padrão 'S')
  leftKey?: string; // Tecla para esquerda (padrão 'A')
  rightKey?: string; // Tecla para direita (padrão 'D')
  allowArrowKeys?: boolean; // Permite também as setas direcionais (padrão true)
  showKeyBadges?: boolean; // Exibe etiquetas das teclas nos botões quando em Modo WEB (padrão true)
}

export interface PlayerHeaderHudElementConfig {
  visible: boolean;
  x?: number; // offset X a partir do canto superior esquerdo (padrão 0)
  y?: number; // offset Y a partir do canto superior esquerdo (padrão 0)
  scale?: number; // escala visual (0.5 a 2.0, padrão 1.0)
  opacity?: number; // opacidade (0.1 a 1.0, padrão 1.0)
  customIconUrl?: string; // PNG personalizado para o círculo do player
  showPlayerAvatar?: boolean; // Se true, exibe o sprite do player no círculo branco; se false, exibe círculo branco limpo
  ringColor?: string; // Cor do aro circular (padrão '#5c2604')
  circleBgColor?: string; // Cor interna do círculo (padrão '#ffffff')
  hpBarColor?: string; // Cor da barra de PV (padrão '#ff1a0a')
  expBarColor?: string; // Cor da barra de EXP (padrão '#ffcc00')
  numberFormat?: 'padded_7' | 'current_max' | 'simple'; // Padrão 'padded_7' -> '0000180 PV'
}

export interface QuestTrackerHudElementConfig {
  visible: boolean;
  x?: number; // offset X a partir da esquerda (padrão 0)
  y?: number; // offset Y a partir do topo (padrão 0)
  scale?: number; // escala visual (0.5 a 2.0, padrão 1.0)
  opacity?: number; // opacidade (0.1 a 1.0, padrão 1.0)
  defaultTab?: 'jornada' | 'tarefas'; // Aba inicial ('jornada' = Quests Principais, 'tarefas' = Side Quests)
  mainTabLabel?: string; // Padrão 'Jornada'
  sideTabLabel?: string; // Padrão 'Tarefas.'
  moreButtonLabel?: string; // Padrão 'Ver mais...'
  maxVisibleQuests?: number; // Quantidade de quests visíveis na lista compacta (padrão 2)
  showBackdrop?: boolean; // Exibir fundo escuro sutil opcional
  collapsible?: boolean; // Exibir setinha à frente de Tarefas para retrair pro canto (padrão true)
  defaultCollapsed?: boolean; // Iniciar retraído no canto (padrão false)
}

export interface TopGlassBarIconSlotConfig {
  id: string;
  label: string;
  iconEmoji: string;
  customIconUrl?: string;
  badgeText?: string;
  actionType:
    | 'open_inventory'
    | 'open_quests'
    | 'toggle_map'
    | 'open_dialogue'
    | 'toggle_bgm'
    | 'toggle_audio'
    | 'trigger_toast'
    | 'quick_status';
  visible?: boolean;
}

export interface TopGlassBarHudElementConfig {
  visible: boolean;
  x?: number; // offset X a partir do canto superior direito (padrão 0)
  y?: number; // offset Y a partir do canto superior direito (padrão 0)
  scale?: number; // escala visual (0.5 a 2.0, padrão 1.0)
  opacity?: number; // opacidade (0.1 a 1.0, padrão 1.0)
  glassTint?: string; // Cor/tinta translúcida do vidro (padrão 'rgba(15, 23, 42, 0.38)')
  borderColor?: string; // Cor do contorno dourado da cápsula (padrão '#fbbf24')
  iconBgColor?: string;
  collapsible?: boolean; // Permite retrair a barra de vidro (padrão true)
  layout?: 'row' | 'grid_3x2'; // Layout dos 6 ícones (padrão 'row')
  slots?: TopGlassBarIconSlotConfig[]; // Os 6 ícones da barra de acesso
}

export interface LootToastBarHudElementConfig {
  visible: boolean;
  side?: 'left' | 'right'; // Canto onde surgem as barras deslizantes empilhadas (padrão 'right')
  edgeSide?: 'left' | 'right'; // Alias para side (padrão 'right')
  x?: number;
  y?: number;
  yOffset?: number; // Offset vertical em px (padrão 0)
  scale?: number; // Escala visual (0.5 a 2.0, padrão 1.0)
  opacity?: number; // Opacidade (0.1 a 1.0, padrão 1.0)
  barColor?: string; // Cor da barra deslizante (padrão '#f59e0b' laranja/ouro da referência)
  barFillColor?: string; // Alias para barColor
  lipColor?: string; // Cor da borda inferior 3D (padrão '#14532d' verde escuro da referência)
  bottomLipColor?: string; // Alias para lipColor
  textColor?: string; // Cor do texto (padrão '#1e293b')
  maxStack?: number; // Máximo de barras empilhadas simultaneamente (padrão 4)
  durationMs?: number; // Duração em ms de cada barra antes de recolher (padrão 3200)
}

export interface PlayerHudConfig {
  playerHeaderHud?: PlayerHeaderHudElementConfig;
  questTrackerHud?: QuestTrackerHudElementConfig;
  topGlassBarHud?: TopGlassBarHudElementConfig;
  lootToastHud?: LootToastBarHudElementConfig;
  backpackButton?: {
    visible: boolean;
    x?: number; // offset X a partir do ponto padrão (left: calc(50% - 150px))
    y?: number; // offset Y a partir da base (bottom: 68px)
    scale?: number; // escala (padrão 1.0)
    opacity?: number; // opacidade visual (0.1 a 1.0)
    customAssetUrl?: string;
    shortcutKey?: string; // Tecla de atalho no teclado (ex: 'I', 'B', 'E')
  };
  joystick?: {
    visible: boolean;
    x?: number; // offset X
    y?: number; // offset Y (bottom: 56px)
    scale?: number; // escala geral (padrão 1.0)
    opacity?: number; // opacidade geral (0.1 a 1.0)
    // Parte 1: Base / Disco Direcional
    customDiscoUrl?: string;
    discoScale?: number; // escala da base (0.5 a 2.0, padrão 1.0)
    discoOpacity?: number; // opacidade da base (0.1 a 1.0, padrão 1.0)
    maxRadius?: number; // raio máximo de curso do analógico em px (padrão 38px, de 20 a 70px)
    // Parte 2: Botão Central / Analógico (Knob)
    customKnobUrl?: string;
    knobScale?: number; // escala do knob (0.5 a 2.0, padrão 1.0)
    knobOpacity?: number; // opacidade do knob (0.1 a 1.0, padrão 1.0)
  };
  touchMoveButton?: {
    visible: boolean;
    x?: number; // offset X
    y?: number; // offset Y
    scale?: number; // escala
    opacity?: number; // opacidade
    customAssetUrl?: string;
    shortcutKey?: string; // Tecla de atalho no teclado (ex: 'M')
  };
  webConfig?: WebHudConfig; // Configuração do Modo WEB exclusiva da tela Paisagem (WASD + teclas dos botões)
  customButtons: ScreenCustomButton[];
}

export type GameScreenType = 'player_hud' | 'dialogue' | 'inventory' | 'pause_menu' | 'victory' | 'game_over' | 'custom';

export interface GameScreenConfig {
  id: string;
  name: string;
  type: GameScreenType;
  description?: string;
  hudConfig?: PlayerHudConfig;
  dialoguePreviewMarkerId?: string;
  backgroundColor?: string;
  backgroundImageUrl?: string;
  customButtons?: ScreenCustomButton[];
}

export interface ProjectScreensConfig {
  activeScreenId: string; // Qual tela está sendo editada/focada
  screens: GameScreenConfig[];
  isInlineEditing?: boolean; // Modo de edição inline no emulador (posicionar botões e HUD direto no emulador)
  selectedInlineElementId?: string; // ID do elemento selecionado/focado para edição inline
}

export interface WorldMapRewardSlotConfig {
  slotIndex: number; // 0 a 9
  imageUrl?: string; // PNG do item/recompensa
  isRevealed?: boolean; // Se false (padrão ao inserir PNG), exibe como silhueta até o evento de encontro ser acionado
  encounterEventLink?: string; // Link/URL ou ID do futuro evento de encontro que libera a visão do PNG
  title?: string;
}

export interface WorldMapPOI {
  id: string;
  name: string;
  description?: string;
  x: number; // Coordenada X no mapa panorâmico
  y: number; // Coordenada Y no mapa panorâmico
  iconPng?: string; // Imagem PNG personalizada do ponto de interesse
  iconEmoji?: string; // Emoji de fallback caso não tenha PNG
  iconType?: string; // Identificador de tipo pré-definido (castle, town, boss, etc.)
  targetLevelId?: string; // ID da fase salva vinculada
  targetLevelName?: string; // Nome da fase para exibição rápida
  status?: 'unlocked' | 'locked' | 'completed'; // Estado de desbloqueio
  badgeText?: string; // Tag/Etiqueta (ex: "Fase 1", "Chefe", "Bônus")
  scale?: number; // Multiplicador de escala do ícone/grupo geral (0.3 a 6.0, padrão 1.0)
  pngScale?: number; // Escala exclusiva do asset PNG (0.2 a 4.0, padrão 1.0)
  pngOffsetX?: number; // Deslocamento horizontal X do PNG em pixels
  pngOffsetY?: number; // Deslocamento vertical Y do PNG em pixels
  parentId?: string; // ID do POI pai do qual este ponto se ramifica
  connectedPoiIds?: string[]; // IDs de POIs diretamente conectados (ramificações ativas)
  bannerPng?: string; // Imagem de banner ilustrada do topo da janela de viagem
  rewardSlots?: (string | null)[]; // Slots circulares de slimes/monstros desta área (presets 5, 10, 15 ou personalizado)
  rewardSlotCount?: number; // Quantidade de slots configurada (padrão 10, presets 5, 10, 15 ou custom)
  rewardSlotConfigs?: WorldMapRewardSlotConfig[]; // Configurações avançadas dos slots (silhuetas de monstros, escaneamento e links de evento)
  recommendedLevel?: number; // Nível recomendado para a fase (ex: Nv. 3)
  travelButtonText?: string; // Texto customizado do botão de viagem (padrão "VIAJAR AGORA")
  isInvisible?: boolean; // Ponto invisível usado apenas como guia para curvar/ajustar a rota
  starsCount?: number; // 0 a 3 estrelas de progresso da fase (estilo Clash of Clans)
}

export interface WorldMapRouteConnection {
  id: string;
  fromId: string;
  toId: string;
  color?: string;
  style?: 'dashed' | 'solid' | 'glowing' | 'dotted';
}

export interface WorldMapLayer {
  id: 'background' | 'routes' | 'pois' | 'decorations' | 'atmosphere' | 'grid';
  name: string;
  visible: boolean;
  opacity: number;
}

export interface WorldMapAtmosphereConfig {
  weather?: 'clear' | 'clouds' | 'fog' | 'rain' | 'snow' | 'night' | 'dawn';
  cloudsEnabled?: boolean;
  cloudsSpeed?: number;
  cloudsOpacity?: number;
  fogEnabled?: boolean;
  fogOpacity?: number;
  lightingTint?: string;
  lightingOpacity?: number;
}

export interface WorldMapConfig {
  id?: string;
  enabled?: boolean;
  title?: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  backgroundPng?: string; // Imagem de fundo que preenche a tela na vertical e permite rolagem horizontal
  mapWidth?: number; // Largura panorâmica em pixels (ex: 1600px, 2400px)
  mapHeight?: number; // Altura de referência (ex: 667px vertical / 440px horizontal)
  initialScrollX?: number;
  pointsOfInterest: WorldMapPOI[];
  routeConnections?: WorldMapRouteConnection[]; // Conexões de rotas e ramificações explícitas
  layers?: WorldMapLayer[];
  atmosphere?: WorldMapAtmosphereConfig;
  customLockIconPng?: string; // PNG do ícone geral de cadeado para locais bloqueados
  lockIconEmoji?: string; // Emoji de cadeado de fallback (ex: '🔒')
}

export interface PlanetGlobeMarker {
  id: string;
  name: string;
  description?: string;
  /** Coordenada X normalizada (-1.0 a 1.0) relativa ao centro do planeta quando rotação = 0° */
  nx: number;
  /** Coordenada Y normalizada (-1.0 a 1.0) relativa ao centro do planeta quando rotação = 0° */
  ny: number;
  iconPng?: string; // PNG ilustrado exibido quando o marcador está em foco
  iconEmoji?: string; // Emoji de fallback
  targetWorldMapId?: string; // ID do Mapa Regional (WorldMapConfig) que abre ao aproximar a câmera
  targetLevelId?: string; // ID de fase salva opcional
  status?: 'unlocked' | 'locked' | 'completed';
  badgeText?: string;
  scale?: number; // Escala geral do pino/marcador
  pngScale?: number; // Escala exclusiva do asset PNG do continente/região (0.2 a 4.0, padrão 1.0)
  pngOffsetX?: number; // Deslocamento horizontal X do PNG em pixels
  pngOffsetY?: number; // Deslocamento vertical Y do PNG em pixels
}

export interface PlanetMoonBody {
  id: string;
  name: string;
  description?: string;
  /** Estilo visual / preset caso não use PNG próprio */
  presetStyle?: 'silver_moon' | 'blood_moon' | 'crystal_moon' | 'ringed_gas' | 'golden_sanctuary';
  /** PNG próprio da Lua / Corpo Celeste (com fundo transparente) */
  moonImagePng?: string;
  /** Cor do halo atmosférico ao redor da lua */
  glowColor?: string;
  /** Se exibe anéis astrais inclinados ao redor deste corpo celeste */
  hasRings?: boolean;
  /** Tamanho em pixels quando vista orbitando no céu acima do planeta (padrão 84) */
  skySizePx?: number;
  /** Altura / Distância da órbita no céu (0.18 a 0.65, padrão 0.34) */
  orbitHeightRatio?: number;
  /** Velocidade orbital no céu em graus por segundo (padrão 3.8) */
  orbitSpeed?: number;
  /** Ângulo orbital inicial em graus (-75 a 75 para arco visível, ou 0 a 360) */
  initialAngleDeg?: number;
  /** Velocidade de giro da própria Lua quando visitada (padrão 1.8) */
  autoRotateSpeed?: number;
  /** ID de Mapa Regional direto (caso o usuário queira abrir um mapa direto ou usar os marcadores da lua) */
  targetWorldMapId?: string;
  /** Marcadores / Estrelas na superfície desta Lua quando o jogador viaja até ela */
  markers: PlanetGlobeMarker[];
}

export interface PlanetUvTextureItem {
  id: string;
  name: string;
  url: string;
  accentColor?: string;
  createdAt?: string;
}

export interface SolarSystemMoon {
  id: string;
  name: string;
  imagePng?: string; // PNG da própria Lua (usa o planeta padrão se não definido)
  uvTexturePng?: string; // Textura Equiretangular UV 2:1 para a esfera 3D no Sistema Planetário
  markerIconPng?: string; // PNG exibido acima da cápsula do marcador quando a lua está em foco
  markerIconEmoji?: string;
  sizePx?: number; // Diâmetro da lua em px (padrão 26)
  orbitRadiusPx?: number; // Raio da órbita ao redor do planeta pai (padrão 54)
  orbitSpeed?: number; // Velocidade orbital em graus/s ao redor do planeta (padrão 16)
  initialAngleDeg?: number;
  targetWorldMapId?: string; // Mapa Regional que abre ao clicar e dar zoom nesta Lua
  status?: 'unlocked' | 'locked' | 'completed';
  markers?: PlanetGlobeMarker[]; // Marcadores no globo desta Lua (Camada 2)
}

export interface SolarSystemPlanet {
  id: string;
  name: string;
  description?: string;
  planetImagePng?: string; // PNG Ilustrado do Planeta para o Mergulho / Close-up (Camada 3)
  uvTexturePng?: string; // Textura Retangular UV 2:1 para a Esfera 3D no Sistema Planetário (Camada 2)
  markerIconPng?: string; // PNG exibido acima da cápsula do marcador quando o planeta está em foco
  markerIconEmoji?: string;
  glowColor?: string;
  hasRings?: boolean;
  sizePx?: number; // Diâmetro do planeta no sistema solar (ex: 36 a 54px)
  orbitRadiusRatio?: number; // Distância orbital a partir do centro (0.16 a 0.85)
  orbitSpeed?: number; // Velocidade de translação na órbita em graus/s
  selfRotateSpeed?: number; // Velocidade de rotação do planeta no próprio eixo
  initialAngleDeg?: number; // Ângulo inicial na órbita (0 a 360)
  targetWorldMapId?: string; // Mapa Regional padrão deste Planeta
  status?: 'unlocked' | 'locked' | 'completed';
  scale?: number; // Escala do marcador oficial
  moons?: SolarSystemMoon[]; // Luas que orbitam ao redor deste planeta
  markers?: PlanetGlobeMarker[]; // Marcadores na superfície do globo deste Planeta (Camada 2)
}

export type AstralStarKind =
  | 'single'
  | 'binary'
  | 'trinary'
  | 'supergiant'
  | 'pulsar'
  | 'nebula_star';

export interface ConstellationStarPoint {
  dx: number; // Deslocamento X relativo à estrela principal (-0.18 a 0.18 da dimensão útil)
  dy: number; // Deslocamento Y relativo à estrela principal (-0.18 a 0.18 da dimensão útil)
  size?: number; // Tamanho da estrela em px (padrão 5.5)
  color?: string; // Cor própria desta estrela (ex: '#38bdf8', '#f43f5e', '#fde047', '#a855f7', '#34d399')
  secondaryColor?: string; // Cor da estrela companheira quando for estrela dupla/tripla
  starType?: AstralStarKind; // Tipo morfológico da estrela (simples, dupla/binária, tripla, supergigante, pulsar)
  connectFromIndex?: number; // Índice de qual estrela do padrão esta estrela se conecta (permite ramificações reais de constelação)
  label?: string; // Nome opcional da estrela (ex: 'Alpha', 'Beta Binária', etc.)
}

export interface ConstellationSystemNode {
  id: string;
  name: string;
  subtitle?: string;
  description?: string;
  xRatio: number; // Posição X normalizada no firmamento (0.14 a 0.86)
  yRatio: number; // Posição Y normalizada no firmamento (0.16 a 0.84)
  glowColor?: string;
  secondaryColor?: string; // Segunda cor para estrelas principais binárias/duplas ou triplas
  starType?: AstralStarKind; // Tipo da estrela matriz da constelação ('binary', 'supergiant', 'pulsar', 'trinary', etc.)
  markerIconPng?: string;
  markerIconEmoji?: string;
  sunName?: string;
  sunImagePng?: string;
  status?: 'unlocked' | 'locked' | 'completed';
  scale?: number;
  /** Estrelas que formam o desenho geométrico desta constelação (com cores variadas, estrelas duplas, gigantes, etc.) */
  patternStars?: ConstellationStarPoint[];
  /** Planetas específicos do Sistema Solar desta Constelação (opcional; usa os planetas padrão se omitido) */
  planets?: SolarSystemPlanet[];
}

export interface PlanetGlobeConfig {
  enabled?: boolean; // Se true (padrão), exibe as camadas astrais (Constelação -> Sistema Solar -> Planeta -> Região)
  enableConstellationLayer?: boolean; // Se true (padrão), inicia na camada de Constelação antes do Sistema Solar
  title?: string;
  systemName?: string; // Nome do Sistema Solar / Planetário
  planetImagePng?: string; // PNG padrão/central
  uvTexturePng?: string; // Textura UV 2:1 padrão opcional
  sunName?: string; // Nome do Astro Central / Sol
  sunImagePng?: string; // PNG opcional do Sol / Astro Central
  sunSizePx?: number; // Tamanho do Astro Central (padrão 52)
  showCentralSun?: boolean; // Se true (padrão), exibe o Astro Central / Sol no centro das órbitas
  orbitTiltRatio?: number; // Perspectiva elíptica das órbitas (0.55 a 1.0, padrão 0.66)
  glowColor?: string;
  autoRotateSpeed?: number; // Multiplicador global de velocidade orbital (padrão 1.0)
  planetScale?: number; // Zoom / Escala geral do Sistema Solar (padrão 1.0)
  verticalOffsetPct?: number;
  showMoonsInSky?: boolean;
  markers: PlanetGlobeMarker[];
  moons?: PlanetMoonBody[];
  /** Biblioteca de Texturas Retangulares UV 2:1 para as Esferas 3D do Sistema Planetário */
  uvTextureLibrary?: PlanetUvTextureItem[];
  /** Lista de Planetas (com suas respectivas Luas) que compõem o Sistema Solar */
  planets?: SolarSystemPlanet[];
  /** Lista de Constelações da Camada 1 (antes do Sistema Planetário) */
  constellations?: ConstellationSystemNode[];
}



export type TabId =
  | 'editor'
  | 'map'
  | 'terreno'
  | 'levels'
  | 'biomes'
  | 'extended'
  | 'clouds'
  | 'markers'
  | 'limits'
  | 'dialogue'
  | 'player'
  | 'spawn'
  | 'motion'
  | 'effect'
  | 'stamp'
  | 'assets'
  | 'marker_pen'
  | 'layers'
  | 'motion_canvas'
  | 'events'
  | 'screens'
  | 'terrain_pen'
  | 'quests'
  | 'pets';

/**
 * Resolve de forma inteligente o PNG direcional ativo de um Marcador (NPC / Action NPC),
 * com fallback para o asset base (`customIconPng`) e espelhamento automático caso apenas
 * um dos lados (Esquerda ou Direita) tenha sido preenchido.
 */
export function pickMarkerDirectionalPng(
  marker: MapMarker,
  dir?: string
): { png: string | undefined; hasDedicatedDirectional: boolean; autoMirrorX: boolean } {
  const effectiveDir = dir || marker.facingDirection || marker.actionNpc?.facingDirection || 'down';
  const up = marker.avatarUpPng || marker.actionNpc?.avatarUpPng;
  const down = marker.avatarDownPng || marker.actionNpc?.avatarDownPng;
  const left = marker.avatarLeftPng || marker.actionNpc?.avatarLeftPng;
  const right = marker.avatarRightPng || marker.actionNpc?.avatarRightPng;
  const base = marker.customIconPng || down || up || right || left;

  if (effectiveDir === 'up' && up) {
    return { png: up, hasDedicatedDirectional: true, autoMirrorX: false };
  }
  if (effectiveDir === 'down' && down) {
    return { png: down, hasDedicatedDirectional: true, autoMirrorX: false };
  }
  if (effectiveDir === 'left') {
    if (left) {
      return { png: left, hasDedicatedDirectional: true, autoMirrorX: false };
    }
    if (right) {
      // Se só preencheu Direita, espelha automaticamente para a Esquerda!
      return { png: right, hasDedicatedDirectional: true, autoMirrorX: true };
    }
    return { png: base, hasDedicatedDirectional: false, autoMirrorX: true };
  }
  if (effectiveDir === 'right') {
    if (right) {
      return { png: right, hasDedicatedDirectional: true, autoMirrorX: false };
    }
    if (left) {
      // Se só preencheu Esquerda, espelha automaticamente para a Direita!
      return { png: left, hasDedicatedDirectional: true, autoMirrorX: true };
    }
    return { png: base, hasDedicatedDirectional: false, autoMirrorX: false };
  }

  return { png: base, hasDedicatedDirectional: false, autoMirrorX: false };
}

