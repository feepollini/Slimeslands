import {
  MapMarker,
  ActionNpcConfig,
  ActionNpcAttacks,
  ActionNpcAttackType,
  ActionNpcProjectileType,
  NpcEmotionType,
  NpcEmotionState,
  AttackAssetConfig,
  ActionNpcAttackStandardConfig,
  ActionNpcDropConfig,
  ActionNpcDropItemConfig,
} from '../types/map';

// Estruturas de Efeito 2D de Impacto e Projéteis em Voo
export interface ActiveCombatVfx {
  id: string;
  type: 'slash_arc' | 'dash_impact' | 'jump_shockwave' | 'contact_spark' | 'damage_number';
  x: number;
  y: number;
  angle?: number;
  scale?: number;
  progress: number; // 0.0 a 1.0
  durationMs: number;
  createdAt: number;
  color?: string;
  text?: string;
  attackAsset?: AttackAssetConfig;
}

export interface ActiveProjectile {
  id: string;
  sourceMarkerId: string;
  targetMarkerId?: string; // id do alvo ou 'player'
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  angle: number;
  damage: number;
  speed: number;
  range: number;
  distanceTraveled: number;
  projectileType: ActionNpcProjectileType;
  customUrl?: string;
  size: number;
  createdAt: number;
  attackAsset?: AttackAssetConfig;
}

export interface ActiveSpeechBalloon {
  markerId: string;
  text: string;
  phraseIndex: number;
  expiresAt: number;
  style: 'normal' | 'alert' | 'panic';
}

// Item coletável dropado no chão por um Action NPC
export interface ActiveDroppedItem {
  id: string;
  sourceMarkerId: string;
  x: number;
  y: number;
  itemId: string;
  name: string;
  icon?: string;
  iconUrl?: string;
  amount: number;
  type: 'gold' | 'potion' | 'key' | 'gem' | 'custom';
  createdAt: number;
}

// Estado em tempo de execução de um Action NPC
export interface NpcRuntimeState {
  markerId: string;
  currentX: number;
  currentY: number;
  originX: number;
  originY: number;
  currentHp: number;
  maxHp: number;
  emotion: NpcEmotionState;
  aiState: 'idle' | 'explore' | 'approach_player' | 'combat' | 'flee' | 'return_spawn';
  targetType: 'none' | 'player' | 'npc';
  targetMarkerId?: string;
  targetPos?: { x: number; y: number };
  
  // Cooldowns de cada tipo de ataque (timestamp ms quando fica livre)
  cooldowns: {
    jump: number;
    dash: number;
    hackSlash: number;
    ranged: number;
    standard: number;
  };

  // Animação ativa de ataque usando o corpo do NPC
  activeAttack?: {
    type: ActionNpcAttackType;
    startTime: number;
    durationMs: number;
    targetX: number;
    targetY: number;
    startX: number;
    startY: number;
    damage: number;
    hasImpacted: boolean;
    attackAsset?: AttackAssetConfig;
  };

  // Transformação corporal calculada para o frame (squash, stretch, lean, jump height)
  bodyTransform: {
    offsetX: number;
    offsetY: number;
    scaleX: number;
    scaleY: number;
    rotationDeg: number;
    jumpHeight: number;
    tiltAngle: number;
  };

  // Exploração autônoma
  wanderAngle: number;
  wanderTimer: number;
  nextSpeechAllowedAt: number;

  // Tática de combate e circulação
  strafeDir?: number;
  lastTacticsChange?: number;

  // Drop periódico de itens no chão
  lastDropCheckTime?: number;

  // Identificação de Slime
  isSlime?: boolean;

  // Sistema de Tontura aos 50% de PV (15 segundos para Batalhar ou Escanear)
  stunUntil?: number;
  hasTriggeredHalfHpStun?: boolean;

  // Sistema de Despawn & Respawn (ao ser escaneado ou derrotado)
  despawnedUntil?: number;
  permanentlyDespawned?: boolean;
  respawnMode?: 'timed' | 'never';
  respawnTimeSeconds?: number;
  lastFacingDir?: 'up' | 'down' | 'left' | 'right';
}

// Configuração padrão de ataques quando ativados
export const DEFAULT_ATTACK_CONFIGS = {
  jump: {
    enabled: true,
    damage: 18,
    cooldown: 3.5,
    jumpHeight: 70,
    impactRadius: 55,
    durationSec: 0.85,
  },
  dash: {
    enabled: true,
    damage: 15,
    cooldown: 2.5,
    dashSpeed: 2.2,
    dashDistance: 130,
    durationSec: 0.65,
  },
  hackSlash: {
    enabled: true,
    damage: 12,
    cooldown: 1.4,
    range: 60,
    slashArc: 'normal' as const,
    durationSec: 0.75,
  },
  standard: {
    enabled: true,
    damage: 15,
    cooldown: 1.8,
    range: 65,
    durationSec: 0.80,
  },
  ranged: {
    enabled: false,
    damage: 16,
    cooldown: 2.8,
    range: 260,
    projectileType: 'magic_orb' as ActionNpcProjectileType,
    projectileSpeed: 520, // Disparo veloz e dinâmico
    projectileSize: 26,
    durationSec: 0.60,
  },
};

export const DEFAULT_ACTION_NPC_CONFIG: ActionNpcConfig = {
  enabled: true,
  role: 'hostile',
  detectionRadius: 110,
  sensoryRadius: 260,
  leashDistance: 340,
  moveSpeed: 85,
  retaliateOnHit: true,
  fleeOnWitnessCombat: true,
  propagateFear: true,
  showAnimeEmotes: true,
  spontaneousPlayerApproach: true,
  targetAffiliation: 'all',
  noBodyDeformation: false,
  health: 100,
  maxHealth: 100,
  respawnMode: 'timed',
  respawnTimeSeconds: 25,
  attacks: {
    jump: { ...DEFAULT_ATTACK_CONFIGS.jump, enabled: true },
    dash: { ...DEFAULT_ATTACK_CONFIGS.dash, enabled: true },
    hackSlash: { ...DEFAULT_ATTACK_CONFIGS.hackSlash, enabled: true },
    standard: { ...DEFAULT_ATTACK_CONFIGS.standard, enabled: true },
    ranged: { ...DEFAULT_ATTACK_CONFIGS.ranged, enabled: false },
  },
  dropConfig: {
    enabled: false,
    intervalSec: 15,
    dropOnlyWhileMoving: true,
    maxItemsOnMap: 5,
    items: [],
  },
  speechPhrases: ['Quem ousa pisar aqui?!', 'Não dê mais nenhum passo!', 'Vou defender meu território!'],
};

/**
 * Detecta de forma inteligente se o marcador representa um Slime / Gelatina / Mascote Saltitante
 * por configuração explícita, estilo de patrulha/caminhada, nome, imagem PNG, efeito ou categoria
 */
export function isSlimeMarker(marker: {
  name?: string;
  customIconPng?: string;
  subCategoryPath?: string;
  actionNpc?: Partial<ActionNpcConfig>;
  npcPatrol?: { walkStyle?: string };
  effect?: string;
  npcBounce?: boolean;
}): boolean {
  if (marker.actionNpc?.locomotionStyle === 'slime_hop') return true;
  if (marker.actionNpc?.locomotionStyle === 'biped') return false;
  if (marker.npcPatrol?.walkStyle === 'slime_hop') return true;
  if (marker.effect === 'jelly') return true;
  if (marker.npcBounce === true) return true;
  const name = (marker.name || '').toLowerCase();
  if (/(slime|blob|jelly|gelatina|morcego|bat)/i.test(name)) return true;
  const icon = (marker.customIconPng || '').toLowerCase();
  if (/(slime|blob|jelly|gelatina|morcego|bat)/i.test(icon)) return true;
  const sub = (marker.subCategoryPath || '').toLowerCase();
  if (/(slime|blob|jelly|gelatina|morcego|bat)/i.test(sub)) return true;
  return false;
}

// Funções utilitárias de distância e ângulo
export const getDistance = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.hypot(x2 - x1, y2 - y1);
};

export const getAngleRad = (x1: number, y1: number, x2: number, y2: number): number => {
  return Math.atan2(y2 - y1, x2 - x1);
};

export const clamp = (val: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, val));
};

export const resolveFacingDirection4Way = (
  dx: number,
  dy: number,
  fallback: 'up' | 'down' | 'left' | 'right' = 'down'
): 'up' | 'down' | 'left' | 'right' => {
  if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01) return fallback;
  // Usa histerese suave para que movimientos diagonais respeitem o eixo predominante (Cima/Baixo vs Esq/Dir)
  if (Math.abs(dx) >= Math.abs(dy) * 0.92) {
    return dx >= 0 ? 'right' : 'left';
  }
  return dy >= 0 ? 'down' : 'up';
};

// Classe Principal do Motor Procedural de Ações, Emoções e Combate dos NPCs
export class NpcActionEngine {
  private runtimeStates: Map<string, NpcRuntimeState> = new Map();
  private vfxList: ActiveCombatVfx[] = [];
  private projectiles: ActiveProjectile[] = [];
  private speechBalloons: Map<string, ActiveSpeechBalloon> = new Map();
  private droppedItems: ActiveDroppedItem[] = [];
  
  // Rastreamento do jogador para idle e emoções de anime
  private lastPlayerPos: { x: number; y: number } = { x: 0, y: 0 };
  private playerIdleStartTime: number = performance.now();
  private playerIdleEmote: { type: 'zzz' | 'sweat' | 'dots' | 'sparkle'; expiresAt: number } | null = null;

  // Inicializa ou sincroniza marcadores com o estado de tempo de execução
  public syncMarkers(markers: MapMarker[]): void {
    const activeIds = new Set<string>();

    for (const marker of markers) {
      if (marker.type !== 'npc') continue;
      activeIds.add(marker.id);

      const actionCfg = marker.actionNpc;
      const isAction = !!actionCfg?.enabled;

      if (!this.runtimeStates.has(marker.id)) {
        const originX = actionCfg?.spawnOrigin?.x ?? marker.x;
        const originY = actionCfg?.spawnOrigin?.y ?? marker.y;
        const maxHp = actionCfg?.maxHealth || 100;
        const currentHp = actionCfg?.health ?? maxHp;

        this.runtimeStates.set(marker.id, {
          markerId: marker.id,
          isSlime: isSlimeMarker(marker),
          currentX: marker.x,
          currentY: marker.y,
          originX,
          originY,
          currentHp,
          maxHp,
          emotion: marker.emotionState || {
            type: 'neutral',
            intensity: 0,
            expiresAt: 0,
          },
          aiState: isAction ? (actionCfg?.role === 'peaceful' || actionCfg?.role === 'curious' ? 'explore' : 'idle') : 'idle',
          targetType: 'none',
          cooldowns: { jump: 0, dash: 0, hackSlash: 0, ranged: 0, standard: 0 },
          lastDropCheckTime: performance.now(),
          bodyTransform: {
            offsetX: 0,
            offsetY: 0,
            scaleX: 1,
            scaleY: 1,
            rotationDeg: 0,
            jumpHeight: 0,
            tiltAngle: 0,
          },
          wanderAngle: Math.random() * Math.PI * 2,
          wanderTimer: performance.now() + 1000 + Math.random() * 2000,
          nextSpeechAllowedAt: 0,
          respawnMode: actionCfg?.respawnMode || 'timed',
          respawnTimeSeconds: actionCfg?.respawnTimeSeconds ?? 25,
        });
      } else {
        // Atualiza spawn origin caso tenha mudado e revalida status de slime
        const state = this.runtimeStates.get(marker.id)!;
        state.isSlime = isSlimeMarker(marker);
        state.respawnMode = actionCfg?.respawnMode || 'timed';
        state.respawnTimeSeconds = actionCfg?.respawnTimeSeconds ?? 25;

        // Se o marcador foi movido no editor (drag & drop), sincroniza a nova origem e posição imediatamente
        const newOriginX = actionCfg?.spawnOrigin?.x ?? marker.x;
        const newOriginY = actionCfg?.spawnOrigin?.y ?? marker.y;
        const movedInEditor = Math.hypot(newOriginX - state.originX, newOriginY - state.originY) > 5;

        if (movedInEditor) {
          state.originX = newOriginX;
          state.originY = newOriginY;
          if (!state.activeAttack) {
            state.currentX = newOriginX;
            state.currentY = newOriginY;
          }
        }
      }
    }

    // Limpa NPCs removidos
    for (const id of this.runtimeStates.keys()) {
      if (!activeIds.has(id)) {
        this.runtimeStates.delete(id);
        this.speechBalloons.delete(id);
      }
    }
  }

  // Registra dano a um NPC (com gatilho de 15s de Tontura ao atingir 50% de PV!)
  public applyDamage(
    targetMarkerId: string,
    damage: number,
    attackerPos?: { x: number; y: number },
    attackerId?: string,
    now: number = performance.now()
  ): {
    enteredStun: boolean;
    isStunned: boolean;
    died: boolean;
    currentHp: number;
    maxHp: number;
  } {
    const state = this.runtimeStates.get(targetMarkerId);
    if (!state) {
      return { enteredStun: false, isStunned: false, died: false, currentHp: 0, maxHp: 100 };
    }

    // Se já estiver em modo de tontura (15s), aguarda o término dos 15s antes de receber mais dano
    if (state.stunUntil && now < state.stunUntil) {
      return {
        enteredStun: false,
        isStunned: true,
        died: false,
        currentHp: state.currentHp,
        maxHp: state.maxHp,
      };
    }

    const prevHp = state.currentHp;
    const halfHpThreshold = Math.max(1, Math.ceil(state.maxHp * 0.5));
    let enteredStun = false;

    // Quando o mob atinge 50% de PV pela primeira vez, entra por 15 segundos no Sistema de Tontura!
    if (!state.hasTriggeredHalfHpStun && prevHp > halfHpThreshold && prevHp - damage <= halfHpThreshold) {
      state.currentHp = halfHpThreshold;
      state.hasTriggeredHalfHpStun = true;
      state.stunUntil = now + 15000;
      state.activeAttack = undefined;
      enteredStun = true;

      this.spawnVfx({
        type: 'damage_number',
        x: state.currentX,
        y: state.currentY - 42,
        text: `💫 TONTURA 15s! (50% PV)`,
        color: '#fbbf24',
        durationMs: 1400,
        progress: 0,
        createdAt: now,
      });
    } else {
      state.currentHp = Math.max(0, state.currentHp - damage);
    }

    const actualDamageShown = Math.max(1, prevHp - state.currentHp);

    // Efeito numérico e faíscas de contato
    this.spawnVfx({
      type: 'damage_number',
      x: state.currentX + (Math.random() - 0.5) * 20,
      y: state.currentY - 28,
      text: `-${actualDamageShown}`,
      color: enteredStun ? '#f59e0b' : '#ef4444',
      durationMs: 700,
      progress: 0,
      createdAt: now,
    });

    this.spawnVfx({
      type: 'contact_spark',
      x: state.currentX,
      y: state.currentY - 15,
      scale: enteredStun ? 1.6 : 1.2,
      durationMs: 400,
      progress: 0,
      createdAt: now,
    });

    if (enteredStun) {
      this.triggerSpeechBalloon(
        targetMarkerId,
        '💫 Tonto! (Batalhar ou Escanear - 15s)',
        'alert',
        now
      );
      return {
        enteredStun: true,
        isStunned: true,
        died: false,
        currentHp: state.currentHp,
        maxHp: state.maxHp,
      };
    }

    const died = state.currentHp <= 0;
    if (died) {
      state.activeAttack = undefined;
      state.stunUntil = undefined;
      if (state.respawnMode === 'never') {
        state.permanentlyDespawned = true;
        state.despawnedUntil = undefined;
      } else {
        const respawnSec = Math.max(3, state.respawnTimeSeconds ?? 25);
        state.despawnedUntil = now + respawnSec * 1000;
      }
      this.spawnVfx({
        type: 'jump_shockwave',
        x: state.currentX,
        y: state.currentY,
        scale: 1.5,
        durationMs: 550,
        progress: 0,
        createdAt: now,
      });
      return {
        enteredStun: false,
        isStunned: false,
        died: true,
        currentHp: 0,
        maxHp: state.maxHp,
      };
    }

    // Se estiver com pouca vida e for covarde, entra em pânico total
    if (state.currentHp < state.maxHp * 0.3) {
      this.setEmotion(state, 'fear', 1.0, 7000, 'attacked_low_hp', attackerPos, now);
      state.aiState = 'flee';
    } else {
      // Retaliação: muda estado emocional para 'angry' (💢) e vira agressivo
      this.setEmotion(state, 'angry', 1.0, 9000, 'attacked', attackerPos, now);
      state.aiState = 'combat';
      state.targetType = attackerId === 'player' || attackerId === 'pet' ? 'player' : 'npc';
      state.targetMarkerId = attackerId;
      if (attackerPos) {
        state.targetPos = { ...attackerPos };
      }
    }

    // Propaga pânico para outros NPCs que presenciaram
    this.broadcastCombatIncident(state.currentX, state.currentY, targetMarkerId, now);

    return {
      enteredStun: false,
      isStunned: false,
      died: false,
      currentHp: state.currentHp,
      maxHp: state.maxHp,
    };
  }

  // Notifica NPCs no raio sensorial sobre um confronto (Cria pânico coletivo nos pacíficos)
  public broadcastCombatIncident(
    combatX: number,
    combatY: number,
    initiatorMarkerId: string,
    now: number = performance.now()
  ): void {
    for (const [id, state] of this.runtimeStates.entries()) {
      if (id === initiatorMarkerId) continue;

      const dist = getDistance(state.currentX, state.currentY, combatX, combatY);
      // Avalia pelo raio sensorial maior do NPC
      const sensoryRadius = 260; // padrão
      if (dist <= sensoryRadius) {
        // Se NPC está calmo ou pacífico/curioso, presenciar a luta gera medo
        if (state.emotion.type === 'neutral' || state.emotion.type === 'curious' || state.emotion.type === 'happy') {
          this.setEmotion(state, 'fear', 0.9, 6500, 'witnessed_fight', { x: combatX, y: combatY }, now);
          state.aiState = 'flee';

          // Balão de socorro procedural
          this.triggerSpeechBalloon(id, ['Socorro! Uma briga!', 'Perigo! Fugiir!', 'Cuidado com eles!'][Math.floor(Math.random() * 3)], 'panic', now);
        }
      }
    }
  }

  // Define emoção e agenda expiração
  public setEmotion(
    state: NpcRuntimeState,
    type: NpcEmotionType,
    intensity: number,
    durationMs: number,
    reason?: string,
    sourcePos?: { x: number; y: number },
    now: number = performance.now()
  ): void {
    state.emotion = {
      type,
      intensity: clamp(intensity, 0, 1),
      expiresAt: now + durationMs,
      reason,
      sourcePosition: sourcePos,
    };
  }

  // Aciona balão de fala procedural
  public triggerSpeechBalloon(
    markerId: string,
    text: string,
    style: 'normal' | 'alert' | 'panic' = 'normal',
    now: number = performance.now()
  ): void {
    const duration = Math.max(2200, text.length * 75);
    this.speechBalloons.set(markerId, {
      markerId,
      text,
      phraseIndex: 0,
      expiresAt: now + duration,
      style,
    });
  }

  // Adiciona efeito visual à lista
  public spawnVfx(vfx: Omit<ActiveCombatVfx, 'id'>): void {
    this.vfxList.push({
      ...vfx,
      id: `vfx-${Math.random().toString(36).slice(2, 9)}`,
    });
  }

  // Dispara projétil de ataque à distância
  public launchProjectile(
    sourceMarkerId: string,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    rangedConfig: ActionNpcAttacks['ranged'],
    now: number = performance.now()
  ): void {
    if (!rangedConfig) return;

    const angle = getAngleRad(startX, startY, targetX, targetY);
    const speed = rangedConfig.projectileSpeed || 520;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.projectiles.push({
      id: `proj-${Math.random().toString(36).slice(2, 9)}`,
      sourceMarkerId,
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      vx,
      vy,
      angle,
      damage: rangedConfig.damage || 15,
      speed,
      range: rangedConfig.range || 240,
      distanceTraveled: 0,
      projectileType: rangedConfig.projectileType || 'magic_orb',
      customUrl: rangedConfig.projectileCustomUrl,
      size: rangedConfig.projectileSize || 24,
      createdAt: now,
      attackAsset: rangedConfig.attackAsset,
    });
  }

  // Passo principal de simulação por frame (60 FPS)
  public update(
    dt: number,
    now: number,
    markers: MapMarker[],
    playerPos: { x: number; y: number },
    onPlayerHit?: (damage: number) => void,
    onItemCollected?: (item: ActiveDroppedItem) => void
  ): {
    updatedPositions: Map<string, { x: number; y: number; dir: string; isMoving: boolean }>;
    vfx: ActiveCombatVfx[];
    projectiles: ActiveProjectile[];
    speechBalloons: Map<string, ActiveSpeechBalloon>;
    playerIdleEmote: { type: 'zzz' | 'sweat' | 'dots' | 'sparkle'; expiresAt: number } | null;
    activeAttacks: Map<string, {
      type: ActionNpcAttackType;
      startTime: number;
      durationMs: number;
      attackAsset?: AttackAssetConfig;
    }>;
    droppedItems: ActiveDroppedItem[];
  } {
    // 1. Rastreamento do Player Idle para Emoções de Anime
    const playerMoved = getDistance(playerPos.x, playerPos.y, this.lastPlayerPos.x, this.lastPlayerPos.y) > 2;
    if (playerMoved) {
      this.lastPlayerPos = { ...playerPos };
      this.playerIdleStartTime = now;
      this.playerIdleEmote = null;
    } else {
      const idleTime = now - this.playerIdleStartTime;
      if (idleTime > 4500 && (!this.playerIdleEmote || this.playerIdleEmote.expiresAt < now)) {
        // Alterna entre expressões cômicas de anime no idle do herói
        const emotes: ('zzz' | 'sweat' | 'dots' | 'sparkle')[] = ['zzz', 'dots', 'sweat', 'sparkle'];
        const chosen = emotes[Math.floor(Math.random() * emotes.length)];
        this.playerIdleEmote = {
          type: chosen,
          expiresAt: now + 3500,
        };
      }
    }

    const updatedPositions = new Map<string, { x: number; y: number; dir: string; isMoving: boolean }>();
    const activeAttacks = new Map<string, {
      type: ActionNpcAttackType;
      startTime: number;
      durationMs: number;
      attackAsset?: AttackAssetConfig;
    }>();

    // 2. Loop de IA Procedural de cada NPC
    for (const marker of markers) {
      if (marker.type !== 'npc') continue;
      const state = this.runtimeStates.get(marker.id);
      if (!state) continue;

      const actionCfg = marker.actionNpc;
      const isAction = !!actionCfg?.enabled;
      const detectionRadius = actionCfg?.detectionRadius || 110;
      const sensoryRadius = actionCfg?.sensoryRadius || 260;
      const leashDist = actionCfg?.leashDistance || 340;

      // Decaimento do estado emocional temporal
      if (state.emotion.type !== 'neutral' && state.emotion.expiresAt > 0 && now >= state.emotion.expiresAt) {
        state.emotion = { type: 'neutral', intensity: 0, expiresAt: 0 };
        // Se estava fugindo e o medo acabou, volta a explorar calmamente
        if (state.aiState === 'flee') {
          state.aiState = 'explore';
        }
      }

      // Propagação de medo em cadeia para NPCs vizinhos
      if (state.emotion.type === 'fear' && actionCfg?.propagateFear !== false) {
        for (const otherMarker of markers) {
          if (otherMarker.id === marker.id || otherMarker.type !== 'npc') continue;
          const otherState = this.runtimeStates.get(otherMarker.id);
          if (!otherState) continue;

          const distOther = getDistance(state.currentX, state.currentY, otherState.currentX, otherState.currentY);
          if (distOther <= sensoryRadius * 0.75) {
            // Se o vizinho estiver calmo, é influenciado pelo pânico do amigo
            if (otherState.emotion.type === 'neutral' || otherState.emotion.type === 'curious') {
              this.setEmotion(otherState, 'fear', 0.85, 5000, 'fear_propagated', { x: state.currentX, y: state.currentY }, now);
              otherState.aiState = 'flee';
            }
          }
        }
      }

      // Distância do jogador
      const distToPlayer = getDistance(state.currentX, state.currentY, playerPos.x, playerPos.y);

      // Distância da origem natal de spawn
      const distToSpawn = getDistance(state.currentX, state.currentY, state.originX, state.originY);

      let moveVx = 0;
      let moveVy = 0;
      const defaultDir = marker.facingDirection || actionCfg?.facingDirection || 'down';
      let facingDir: 'up' | 'down' | 'left' | 'right' = state.lastFacingDir || defaultDir;
      let isMoving = false;

      // Reset transformação corporal para interpolação suave
      state.bodyTransform.scaleX = 1;
      state.bodyTransform.scaleY = 1;
      state.bodyTransform.offsetX = 0;
      state.bodyTransform.offsetY = 0;
      state.bodyTransform.rotationDeg = 0;
      state.bodyTransform.jumpHeight = 0;
      state.bodyTransform.tiltAngle = 0;

      // Se o mob estiver nos 15 segundos de Tontura (50% PV), ele fica paralisado/tonto no lugar!
      if (state.stunUntil && now < state.stunUntil) {
        state.activeAttack = undefined;
        state.bodyTransform.rotationDeg = Math.sin(now * 0.01) * 8;
        state.bodyTransform.scaleX = 1 + Math.sin(now * 0.008) * 0.05;
        state.bodyTransform.scaleY = 1 - Math.sin(now * 0.008) * 0.05;
        updatedPositions.set(marker.id, {
          x: state.currentX,
          y: state.currentY,
          dir: facingDir,
          isMoving: false,
        });
        continue;
      } else if (state.stunUntil && now >= state.stunUntil) {
        // Os 15 segundos acabaram: sai da tontura!
        state.stunUntil = undefined;
      }

      // Se o mob foi escaneado ou derrotado: verifica se está oculto aguardando respawn ou se já deu o tempo de respawn!
      if (state.permanentlyDespawned) {
        state.activeAttack = undefined;
        updatedPositions.set(marker.id, {
          x: state.currentX,
          y: state.currentY,
          dir: 'down',
          isMoving: false,
        });
        continue;
      }

      if (state.despawnedUntil) {
        if (now < state.despawnedUntil) {
          state.activeAttack = undefined;
          updatedPositions.set(marker.id, {
            x: state.currentX,
            y: state.currentY,
            dir: 'down',
            isMoving: false,
          });
          continue;
        } else {
          // Tempo de Respawn concluído! O Mobby reaparece no ponto de origem com 100% PV!
          state.despawnedUntil = undefined;
          state.currentHp = state.maxHp;
          state.currentX = state.originX;
          state.currentY = state.originY;
          state.hasTriggeredHalfHpStun = false;
          state.stunUntil = undefined;
          state.activeAttack = undefined;
          state.aiState = 'explore';
          this.spawnVfx({
            type: 'jump_shockwave',
            x: state.originX,
            y: state.originY,
            scale: 1.4,
            durationMs: 600,
            progress: 0,
            createdAt: now,
          });
        }
      }

      // Se o mob foi derrotado (0 PV) sem timer configurado, agenda ou mantém inativo
      if (state.currentHp <= 0) {
        state.activeAttack = undefined;
        updatedPositions.set(marker.id, {
          x: state.currentX,
          y: state.currentY,
          dir: 'down',
          isMoving: false,
        });
        continue;
      }

      // ==========================================
      // LÓGICA DE TRANSIÇÃO DE ESTADOS PROCEDURAIS
      // ==========================================
      if (isAction) {
        const role = actionCfg?.role || 'hostile';

        // Reação ao Jogador
        if (state.emotion.type === 'fear') {
          state.aiState = 'flee';
        } else if (distToSpawn > leashDist) {
          state.aiState = 'return_spawn';
        } else if (role === 'hostile' || state.emotion.type === 'angry') {
          if (distToPlayer <= detectionRadius) {
            state.aiState = 'combat';
            state.targetType = 'player';
            state.targetPos = { ...playerPos };
          } else if (distToPlayer <= sensoryRadius) {
            // Em alerta dentro do raio sensorial
            if (state.emotion.type === 'neutral') {
              this.setEmotion(state, 'alert', 0.8, 3000, 'player_sensed', playerPos, now);
            }
            state.aiState = 'combat';
            state.targetType = 'player';
            state.targetPos = { ...playerPos };
          } else {
            state.aiState = 'explore';
          }
        } else if (role === 'curious' || role === 'peaceful') {
          if (distToPlayer <= detectionRadius && actionCfg?.spontaneousPlayerApproach !== false) {
            state.aiState = 'approach_player';
            if (state.emotion.type === 'neutral') {
              this.setEmotion(state, 'curious', 0.8, 4000, 'player_approached', playerPos, now);
            }
          } else {
            state.aiState = 'explore';
          }
        }
      }

      // ==========================================
      // EXECUÇÃO DO ESTADO COMPORTAMENTAL
      // ==========================================
      const baseMoveSpeed = actionCfg?.moveSpeed || 85; // px/s configurável!

      // 1. ESTADO: COMBATE (Ataques corporais com física e projéteis)
      if (state.aiState === 'combat' && state.targetPos) {
        const targetX = state.targetPos.x;
        const targetY = state.targetPos.y;
        const targetDist = getDistance(state.currentX, state.currentY, targetX, targetY);

        // Se já está executando um ataque com o corpo:
        if (state.activeAttack) {
          const atk = state.activeAttack;
          const elapsed = now - atk.startTime;
          const prog = clamp(elapsed / atk.durationMs, 0, 1);
          const isVideoAsset = atk.attackAsset?.type === 'video' || (actionCfg?.noBodyDeformation === true);

          if (atk.type === 'standard') {
            // GOLPE PADRÃO / NEUTRO: 100% sem deformação corporal!
            // Perfeito para assets de vídeo que já possuem sua própria animação interna.
            state.bodyTransform.scaleX = 1.0;
            state.bodyTransform.scaleY = 1.0;
            state.bodyTransform.tiltAngle = 0;
            state.bodyTransform.rotationDeg = 0;
            state.bodyTransform.jumpHeight = 0;

            // Mantém orientação facial 4 direções para o alvo
            facingDir = resolveFacingDirection4Way(atk.targetX - state.currentX, atk.targetY - state.currentY, facingDir);

            if (prog >= 0.45 && !atk.hasImpacted) {
              atk.hasImpacted = true;
              const slashAngle = getAngleRad(state.currentX, state.currentY, atk.targetX, atk.targetY);
              this.spawnVfx({
                type: 'slash_arc',
                x: state.currentX + Math.cos(slashAngle) * 28,
                y: state.currentY + Math.sin(slashAngle) * 28 - 10,
                angle: slashAngle,
                scale: 1.25,
                durationMs: 360,
                progress: 0,
                createdAt: now,
              });

              if (getDistance(state.currentX, state.currentY, playerPos.x, playerPos.y) <= (actionCfg?.attacks?.standard?.range || 65) + 15) {
                onPlayerHit?.(atk.damage);
              }
            }
          } else if (atk.type === 'jump') {
            const isSlime = !!state.isSlime;
            if (isSlime) {
              // PULO DO SLIME: Salto parabólico em cima do alvo
              const jumpDist = getDistance(atk.startX, atk.startY, atk.targetX, atk.targetY);
              const maxH = Math.min(85, Math.max(45, jumpDist * 0.55));

              if (prog < 0.22) {
                // Compressão pré-salto no solo
                const p = prog / 0.22;
                if (!isVideoAsset) {
                  state.bodyTransform.scaleX = 1.0 + 0.48 * p;
                  state.bodyTransform.scaleY = 1.0 - 0.45 * p;
                } else {
                  state.bodyTransform.scaleX = 1.0;
                  state.bodyTransform.scaleY = 1.0;
                }
                state.bodyTransform.jumpHeight = 0;
                state.bodyTransform.offsetX = (Math.random() - 0.5) * 2;
                state.currentX = atk.startX;
                state.currentY = atk.startY;
              } else if (prog < 0.80) {
                // Salto parabólico de alta energia pelo ar!
                const airP = (prog - 0.22) / 0.58;
                state.bodyTransform.jumpHeight = Math.sin(airP * Math.PI) * maxH;
                if (!isVideoAsset) {
                  state.bodyTransform.scaleX = 0.72;
                  state.bodyTransform.scaleY = 1.42;
                } else {
                  state.bodyTransform.scaleX = 1.0;
                  state.bodyTransform.scaleY = 1.0;
                }
                state.currentX = atk.startX + (atk.targetX - atk.startX) * airP;
                state.currentY = atk.startY + (atk.targetY - atk.startY) * airP;
              } else {
                // SPLAT! Pouso no alvo
                const landP = (prog - 0.80) / 0.20;
                state.bodyTransform.jumpHeight = 0;
                if (!isVideoAsset) {
                  state.bodyTransform.scaleX = 1.55 - landP * 0.45;
                  state.bodyTransform.scaleY = 0.45 + landP * 0.45;
                } else {
                  state.bodyTransform.scaleX = 1.0;
                  state.bodyTransform.scaleY = 1.0;
                }
                state.currentX = atk.targetX;
                state.currentY = atk.targetY;

                if (prog >= 0.82 && !atk.hasImpacted) {
                  atk.hasImpacted = true;
                  this.spawnVfx({
                    type: 'jump_shockwave',
                    x: state.currentX,
                    y: state.currentY,
                    durationMs: 500,
                    progress: 0,
                    createdAt: now,
                  });

                  if (getDistance(state.currentX, state.currentY, playerPos.x, playerPos.y) <= 65) {
                    onPlayerHit?.(atk.damage);
                  }
                }
              }
            } else {
              // PULO padrão: Arco parabólico Z
              const jumpHeight = (actionCfg?.attacks.jump?.jumpHeight || 75) * Math.sin(prog * Math.PI);
              state.bodyTransform.jumpHeight = jumpHeight;

              if (!isVideoAsset) {
                if (prog < 0.2) {
                  state.bodyTransform.scaleX = 1.25;
                  state.bodyTransform.scaleY = 0.75;
                } else if (prog < 0.7) {
                  state.bodyTransform.scaleX = 0.85;
                  state.bodyTransform.scaleY = 1.25;
                } else {
                  state.bodyTransform.scaleX = 1.3;
                  state.bodyTransform.scaleY = 0.7;
                }
              } else {
                state.bodyTransform.scaleX = 1.0;
                state.bodyTransform.scaleY = 1.0;
              }

              // Deslocamento para o ponto de queda
              const lerpX = atk.startX + (atk.targetX - atk.startX) * prog;
              const lerpY = atk.startY + (atk.targetY - atk.startY) * prog;
              state.currentX = lerpX;
              state.currentY = lerpY;

              if (prog >= 0.85 && !atk.hasImpacted) {
                atk.hasImpacted = true;
                this.spawnVfx({
                  type: 'jump_shockwave',
                  x: state.currentX,
                  y: state.currentY,
                  durationMs: 500,
                  progress: 0,
                  createdAt: now,
                });

                if (getDistance(state.currentX, state.currentY, playerPos.x, playerPos.y) <= 60) {
                  onPlayerHit?.(atk.damage);
                }
              }
            }
          } else if (atk.type === 'dash') {
            // DASH: Avanço rápido
            const dashAngle = getAngleRad(atk.startX, atk.startY, atk.targetX, atk.targetY);
            if (!isVideoAsset) {
              state.bodyTransform.tiltAngle = Math.sin(dashAngle) * 25;
              state.bodyTransform.scaleX = 1.35;
              state.bodyTransform.scaleY = 0.75;
            } else {
              state.bodyTransform.tiltAngle = 0;
              state.bodyTransform.scaleX = 1.0;
              state.bodyTransform.scaleY = 1.0;
            }

            state.currentX = atk.startX + (atk.targetX - atk.startX) * prog;
            state.currentY = atk.startY + (atk.targetY - atk.startY) * prog;

            if (prog >= 0.5 && !atk.hasImpacted) {
              atk.hasImpacted = true;
              this.spawnVfx({
                type: 'dash_impact',
                x: state.currentX,
                y: state.currentY - 10,
                angle: dashAngle,
                durationMs: 400,
                progress: 0,
                createdAt: now,
              });

              if (getDistance(state.currentX, state.currentY, playerPos.x, playerPos.y) <= 45) {
                onPlayerHit?.(atk.damage);
              }
            }
          } else if (atk.type === 'hack_slash') {
            // HACK AND SLASH: Golpe de lâmina
            const slashAngle = getAngleRad(state.currentX, state.currentY, atk.targetX, atk.targetY);
            if (!isVideoAsset) {
              const swingSwing = Math.sin(prog * Math.PI) * 35;
              state.bodyTransform.rotationDeg = swingSwing * (slashAngle > 0 ? 1 : -1);
              state.bodyTransform.scaleX = 1.15;
            } else {
              state.bodyTransform.rotationDeg = 0;
              state.bodyTransform.scaleX = 1.0;
            }

            if (prog >= 0.4 && !atk.hasImpacted) {
              atk.hasImpacted = true;
              this.spawnVfx({
                type: 'slash_arc',
                x: state.currentX + Math.cos(slashAngle) * 30,
                y: state.currentY + Math.sin(slashAngle) * 30 - 15,
                angle: slashAngle,
                scale: 1.3,
                durationMs: 380,
                progress: 0,
                createdAt: now,
              });

              if (getDistance(state.currentX, state.currentY, playerPos.x, playerPos.y) <= 65) {
                onPlayerHit?.(atk.damage);
              }
            }
          }

          // Fim do ataque ativo
          if (prog >= 1) {
            state.activeAttack = undefined;
          }
        } else {
          // Escolha inteligente e procedural de qual ataque habilitado disparar
          const attacks = {
            jump: { ...DEFAULT_ATTACK_CONFIGS.jump, ...(actionCfg?.attacks?.jump || {}) },
            dash: { ...DEFAULT_ATTACK_CONFIGS.dash, ...(actionCfg?.attacks?.dash || {}) },
            hackSlash: { ...DEFAULT_ATTACK_CONFIGS.hackSlash, ...(actionCfg?.attacks?.hackSlash || {}) },
            standard: { ...DEFAULT_ATTACK_CONFIGS.standard, ...(actionCfg?.attacks?.standard || {}) },
            ranged: { ...DEFAULT_ATTACK_CONFIGS.ranged, ...(actionCfg?.attacks?.ranged || {}) },
          };
          const isSlime = !!state.isSlime;
          const canStandard = (attacks.standard.enabled !== false) && now >= (state.cooldowns.standard || 0);
          const canHack = (attacks.hackSlash.enabled !== false) && now >= state.cooldowns.hackSlash;
          const canDash = (attacks.dash.enabled !== false) && now >= state.cooldowns.dash;
          const canJump = (attacks.jump.enabled !== false) && now >= state.cooldowns.jump;
          const canRanged = (attacks.ranged.enabled === true) && now >= state.cooldowns.ranged;

          // SE FOR SLIME: NUNCA faz hack_slash de humanoide! O ataque corporal do slime é Salto Esmagador em cima do player
          if (isSlime) {
            const canSlimeLeap = (canJump || canHack || canDash || canStandard) && now >= state.cooldowns.jump;
            if (targetDist <= 145 && canSlimeLeap) {
              const jumpDamage = Math.max(attacks.jump?.damage || 18, attacks.hackSlash?.damage || 14, attacks.dash?.damage || 16, attacks.standard?.damage || 15);
              const slimeAsset = attacks.jump?.attackAsset || attacks.standard?.attackAsset || attacks.dash?.attackAsset || attacks.hackSlash?.attackAsset;
              const slimeJumpDur = Math.round(((attacks.jump?.durationSec || slimeAsset?.durationSec || (targetDist <= 65 ? 0.75 : 0.95)) * 1000));
              state.activeAttack = {
                type: 'jump',
                startTime: now,
                durationMs: slimeJumpDur,
                startX: state.currentX,
                startY: state.currentY,
                targetX,
                targetY,
                damage: jumpDamage,
                hasImpacted: false,
                attackAsset: slimeAsset,
              };
              const cd = (attacks.jump?.cooldown || 2.4) * 1000;
              state.cooldowns.jump = now + cd;
              state.cooldowns.hackSlash = now + cd;
              state.cooldowns.dash = now + cd;
              state.cooldowns.standard = now + cd;
            } else if (targetDist >= 70 && targetDist <= (attacks.ranged?.range || 260) && canRanged) {
              state.bodyTransform.scaleX = 1.35;
              state.bodyTransform.scaleY = 0.65;
              this.launchProjectile(state.markerId, state.currentX, state.currentY - 10, targetX, targetY - 10, attacks.ranged, now);
              state.cooldowns.ranged = now + (attacks.ranged?.cooldown || 2.8) * 1000;
            } else {
              // Tática de combate do slime: circula e recua dando pulinhos
              const ang = getAngleRad(state.currentX, state.currentY, targetX, targetY);
              if (targetDist < 48) {
                moveVx = -Math.cos(ang) * (baseMoveSpeed * 1.15);
                moveVy = -Math.sin(ang) * (baseMoveSpeed * 1.15);
              } else if (targetDist <= 110) {
                if (!state.strafeDir || (now - (state.lastTacticsChange || 0) > 2200)) {
                  state.strafeDir = Math.random() > 0.5 ? 1 : -1;
                  state.lastTacticsChange = now;
                }
                const desiredDist = 68;
                const distDiff = targetDist - desiredDist;
                const forwardBias = Math.max(-0.45, Math.min(0.45, distDiff / 32));
                const tangentAngle = ang + (Math.PI / 2) * (state.strafeDir || 1);
                moveVx = (Math.cos(tangentAngle) * 0.95 + Math.cos(ang) * forwardBias) * (baseMoveSpeed * 1.05);
                moveVy = (Math.sin(tangentAngle) * 0.95 + Math.sin(ang) * forwardBias) * (baseMoveSpeed * 1.05);
              } else {
                moveVx = Math.cos(ang) * (baseMoveSpeed * 1.3);
                moveVy = Math.sin(ang) * (baseMoveSpeed * 1.3);
              }
              facingDir = resolveFacingDirection4Way(targetX - state.currentX, targetY - state.currentY, facingDir);
              isMoving = true;
            }
          } else {
            // Curto alcance: Golpe Padrão / Neutro (Animação de Vídeo) ou Hack and Slash
            const maxMeleeRange = Math.max(attacks.standard?.range || 65, attacks.hackSlash?.range || 60);
            if (targetDist <= maxMeleeRange && (canStandard || canHack)) {
              // Prioriza Standard se tiver asset de vídeo ou deformação desativada ou hack em recarga
              const preferStandard = canStandard && (attacks.standard?.attackAsset?.url || actionCfg?.noBodyDeformation || !canHack);
              if (preferStandard) {
                const stdDur = Math.round(((attacks.standard?.durationSec || attacks.standard?.attackAsset?.durationSec || 0.80) * 1000));
                state.activeAttack = {
                  type: 'standard',
                  startTime: now,
                  durationMs: stdDur,
                  startX: state.currentX,
                  startY: state.currentY,
                  targetX,
                  targetY,
                  damage: attacks.standard?.damage || 15,
                  hasImpacted: false,
                  attackAsset: attacks.standard?.attackAsset,
                };
                state.cooldowns.standard = now + (attacks.standard?.cooldown || 1.8) * 1000;
              } else if (canHack) {
                const hackDur = Math.round(((attacks.hackSlash?.durationSec || attacks.hackSlash?.attackAsset?.durationSec || 0.75) * 1000));
                state.activeAttack = {
                  type: 'hack_slash',
                  startTime: now,
                  durationMs: hackDur,
                  startX: state.currentX,
                  startY: state.currentY,
                  targetX,
                  targetY,
                  damage: attacks.hackSlash?.damage || 12,
                  hasImpacted: false,
                  attackAsset: attacks.hackSlash?.attackAsset,
                };
                state.cooldowns.hackSlash = now + (attacks.hackSlash?.cooldown || 1.4) * 1000;
              }
            }
            // Médio alcance (50 - 140px): Dash ou Pulo
            else if (targetDist > 45 && targetDist <= 140 && (canDash || canJump)) {
              if (canDash && (!canJump || Math.random() > 0.4)) {
                const dashDur = Math.round(((attacks.dash?.durationSec || attacks.dash?.attackAsset?.durationSec || 0.65) * 1000));
                state.activeAttack = {
                  type: 'dash',
                  startTime: now,
                  durationMs: dashDur,
                  startX: state.currentX,
                  startY: state.currentY,
                  targetX,
                  targetY,
                  damage: attacks.dash?.damage || 15,
                  hasImpacted: false,
                  attackAsset: attacks.dash?.attackAsset,
                };
                state.cooldowns.dash = now + (attacks.dash?.cooldown || 2.5) * 1000;
              } else if (canJump) {
                const jumpDur = Math.round(((attacks.jump?.durationSec || attacks.jump?.attackAsset?.durationSec || 0.85) * 1000));
                state.activeAttack = {
                  type: 'jump',
                  startTime: now,
                  durationMs: jumpDur,
                  startX: state.currentX,
                  startY: state.currentY,
                  targetX,
                  targetY,
                  damage: attacks.jump?.damage || 18,
                  hasImpacted: false,
                  attackAsset: attacks.jump?.attackAsset,
                };
                state.cooldowns.jump = now + (attacks.jump?.cooldown || 3.5) * 1000;
              }
            }
            // Longo alcance (> 80px): Ataque à Distância com Projétil
            else if (targetDist >= 70 && targetDist <= (attacks.ranged?.range || 260) && canRanged) {
              // Efeito corporal de recuo antes de atirar
              state.bodyTransform.scaleY = 0.85;
              this.launchProjectile(state.markerId, state.currentX, state.currentY - 15, targetX, targetY - 15, attacks.ranged, now);
              state.cooldowns.ranged = now + (attacks.ranged?.cooldown || 2.8) * 1000;
            } else {
              // COMPORTAMENTO TÁTICO DINÂMICO DE COMBATE:
              // Não fica tremendo no player! Bate, recua e circula (strafe / flanqueamento)
              const ang = getAngleRad(state.currentX, state.currentY, targetX, targetY);

              // 1. Recuo tático imediato se muito colado no alvo (< 48px)
              if (targetDist < 48) {
                moveVx = -Math.cos(ang) * (baseMoveSpeed * 1.15);
                moveVy = -Math.sin(ang) * (baseMoveSpeed * 1.15);
              }
              // 2. Flanqueamento orbital em torno do alvo (48px - 110px) enquanto aguarda cooldowns
              else if (targetDist <= 110) {
                if (!state.strafeDir || (now - (state.lastTacticsChange || 0) > 2200)) {
                  state.strafeDir = Math.random() > 0.5 ? 1 : -1;
                  state.lastTacticsChange = now;
                }
                const desiredDist = 68;
                const distDiff = targetDist - desiredDist;
                const forwardBias = Math.max(-0.45, Math.min(0.45, distDiff / 32));
                const tangentAngle = ang + (Math.PI / 2) * (state.strafeDir || 1);

                moveVx = (Math.cos(tangentAngle) * 0.95 + Math.cos(ang) * forwardBias) * (baseMoveSpeed * 1.05);
                moveVy = (Math.sin(tangentAngle) * 0.95 + Math.sin(ang) * forwardBias) * (baseMoveSpeed * 1.05);
              }
              // 3. Perseguição direta veloz quando afastado (> 110px)
              else {
                moveVx = Math.cos(ang) * (baseMoveSpeed * 1.3);
                moveVy = Math.sin(ang) * (baseMoveSpeed * 1.3);
              }

              // Mira 4 direções estável no alvo ou direção de movimento
              facingDir = resolveFacingDirection4Way(targetX - state.currentX, targetY - state.currentY, facingDir);

              isMoving = true;
            }
          }
        }
      }

      // 2. ESTADO: FUGA (Pânico e medo de combates/perigos)
      else if (state.aiState === 'flee') {
        // Corre na direção oposta à fonte do medo ou do player
        const dangerX = state.emotion.sourcePosition?.x ?? playerPos.x;
        const dangerY = state.emotion.sourcePosition?.y ?? playerPos.y;
        const fleeAngle = getAngleRad(dangerX, dangerY, state.currentX, state.currentY);

        moveVx = Math.cos(fleeAngle) * (baseMoveSpeed * 1.6); // Fuga rápida!
        moveVy = Math.sin(fleeAngle) * (baseMoveSpeed * 1.6);
        facingDir = resolveFacingDirection4Way(moveVx, moveVy, facingDir);
        isMoving = true;

        // Tremor cômico de susto no corpo do PNG
        state.bodyTransform.offsetX = (Math.random() - 0.5) * 4;
        state.bodyTransform.scaleX = 0.9 + Math.sin(now * 0.03) * 0.1;
      }

      // 3. ESTADO: APROXIMAÇÃO AMIGÁVEL DO JOGADOR
      else if (state.aiState === 'approach_player') {
        const targetDist = 70; // Para a uma distância respeitosa
        if (distToPlayer > targetDist) {
          const ang = getAngleRad(state.currentX, state.currentY, playerPos.x, playerPos.y);
          moveVx = Math.cos(ang) * (baseMoveSpeed * 0.8);
          moveVy = Math.sin(ang) * (baseMoveSpeed * 0.8);
          facingDir = resolveFacingDirection4Way(moveVx, moveVy, facingDir);
          isMoving = true;
        } else {
          // Chegou perto: olha para o jogador e fala uma frase personalizada dos balões!
          facingDir = resolveFacingDirection4Way(playerPos.x - state.currentX, playerPos.y - state.currentY, facingDir);
          if (now >= state.nextSpeechAllowedAt && actionCfg?.speechPhrases?.length) {
            const phrases = actionCfg.speechPhrases.filter(Boolean) as string[];
            if (phrases.length > 0) {
              const phrase = phrases[Math.floor(Math.random() * phrases.length)];
              this.triggerSpeechBalloon(marker.id, phrase, 'normal', now);
              state.nextSpeechAllowedAt = now + 9000;
            }
          }
        }
      }

      // 4. ESTADO: RETORNO AO PONTO NATAL (Spawn Leash)
      else if (state.aiState === 'return_spawn') {
        const ang = getAngleRad(state.currentX, state.currentY, state.originX, state.originY);
        moveVx = Math.cos(ang) * baseMoveSpeed;
        moveVy = Math.sin(ang) * baseMoveSpeed;
        facingDir = resolveFacingDirection4Way(moveVx, moveVy, facingDir);
        isMoving = true;

        if (distToSpawn <= 30) {
          state.aiState = 'explore';
        }
      }

      // 5. ESTADO: EXPLORAÇÃO AUTÔNOMA DO TERRITÓRIO
      else if (state.aiState === 'explore') {
        if (now >= state.wanderTimer) {
          // Muda de direção proceduralmente em torno da base
          state.wanderAngle = Math.random() * Math.PI * 2;
          state.wanderTimer = now + 2000 + Math.random() * 3000;
        }

        // Se estiver muito longe do centro da base, puxa o ângulo de volta
        if (distToSpawn > 140) {
          state.wanderAngle = getAngleRad(state.currentX, state.currentY, state.originX, state.originY);
        }

        moveVx = Math.cos(state.wanderAngle) * (baseMoveSpeed * 0.45);
        moveVy = Math.sin(state.wanderAngle) * (baseMoveSpeed * 0.45);
        facingDir = resolveFacingDirection4Way(moveVx, moveVy, facingDir);
        isMoving = true;
      }

      // Repulsão e Separação de Enxame entre NPCs (Evita sobreposição/fusão em um só)
      let repulseVx = 0;
      let repulseVy = 0;
      const minNpcDist = 50; // Distância mínima de espaço pessoal entre NPCs
      for (const [otherId, otherState] of this.runtimeStates.entries()) {
        if (otherId === marker.id) continue;
        const dx = state.currentX - otherState.currentX;
        const dy = state.currentY - otherState.currentY;
        const dSq = dx * dx + dy * dy;
        if (dSq > 0 && dSq < minNpcDist * minNpcDist) {
          const d = Math.sqrt(dSq);
          const push = ((minNpcDist - d) / minNpcDist) * 95;
          repulseVx += (dx / d) * push;
          repulseVy += (dy / d) * push;
        }
      }

      // Aplica deslocamento da física + força de separação de bando
      if (!state.activeAttack) {
        if (state.isSlime) {
          const seed = (marker.id.charCodeAt(0) * 137 + marker.id.length * 43) % 1000;
          if (isMoving) {
            const cycleTime = (now + seed) % 520;
            const hopProg = cycleTime / 520; // 0.0 a 1.0
            let hopSpeedMult = 1.0;

            if (hopProg < 0.20) {
              // Squash no chão preparando o impulso
              const p = hopProg / 0.20;
              state.bodyTransform.scaleX = 1.0 + 0.32 * p;
              state.bodyTransform.scaleY = 1.0 - 0.32 * p;
              state.bodyTransform.jumpHeight = 0;
              hopSpeedMult = 0.12;
            } else if (hopProg < 0.72) {
              // Pulo no ar!
              const airProg = (hopProg - 0.20) / 0.52;
              const arc = Math.sin(airProg * Math.PI);
              state.bodyTransform.jumpHeight = arc * 18;
              state.bodyTransform.scaleX = 0.80 + (1 - arc) * 0.15;
              state.bodyTransform.scaleY = 1.25 + arc * 0.15;
              hopSpeedMult = 2.1;
            } else if (hopProg < 0.88) {
              // Aterrissagem SPLAT elástica no solo
              const landProg = (hopProg - 0.72) / 0.16;
              state.bodyTransform.jumpHeight = 0;
              state.bodyTransform.scaleX = 1.34 - landProg * 0.18;
              state.bodyTransform.scaleY = 0.66 + landProg * 0.18;
              hopSpeedMult = 0.15;
            } else {
              // Recuperação suave
              const recProg = (hopProg - 0.88) / 0.12;
              state.bodyTransform.jumpHeight = 0;
              state.bodyTransform.scaleX = 1.16 - recProg * 0.16;
              state.bodyTransform.scaleY = 0.84 + recProg * 0.16;
              hopSpeedMult = 0.6;
            }

            moveVx *= hopSpeedMult;
            moveVy *= hopSpeedMult;
          } else {
            // Idle gelatinoso do Slime (respiração suave)
            const breath = Math.sin(now * 0.004 + seed);
            state.bodyTransform.scaleX = 1.0 + breath * 0.07;
            state.bodyTransform.scaleY = 1.0 - breath * 0.07;
            state.bodyTransform.jumpHeight = 0;
          }
        }

        if (isMoving) {
          state.currentX += (moveVx + repulseVx) * dt;
          state.currentY += (moveVy + repulseVy) * dt;
        } else if (repulseVx !== 0 || repulseVy !== 0) {
          state.currentX += repulseVx * dt;
          state.currentY += repulseVy * dt;
        }
      }

      state.lastFacingDir = facingDir;

      updatedPositions.set(marker.id, {
        x: state.currentX,
        y: state.currentY,
        dir: facingDir,
        isMoving,
      });

      if (state.activeAttack) {
        activeAttacks.set(marker.id, {
          type: state.activeAttack.type,
          startTime: state.activeAttack.startTime,
          durationMs: state.activeAttack.durationMs,
          attackAsset: state.activeAttack.attackAsset,
        });
      }

      // 2.9 Drop Periódico de Itens pelo Caminho ("como se ele passasse e soltasse")
      if (actionCfg?.dropConfig?.enabled && actionCfg.dropConfig.items && actionCfg.dropConfig.items.length > 0) {
        const dropCfg = actionCfg.dropConfig;
        const intervalMs = Math.max(3000, (dropCfg.intervalSec || 15) * 1000);
        const lastCheck = state.lastDropCheckTime || 0;
        if (now - lastCheck >= intervalMs) {
          state.lastDropCheckTime = now;
          const shouldDrop = dropCfg.dropOnlyWhileMoving !== false ? isMoving : true;
          if (shouldDrop) {
            const currentNpcDrops = this.droppedItems.filter((d) => d.sourceMarkerId === marker.id).length;
            const maxDrops = dropCfg.maxItemsOnMap || 5;
            if (currentNpcDrops < maxDrops) {
              for (const it of dropCfg.items) {
                if (it.chancePercent > 0 && Math.random() * 100 <= it.chancePercent) {
                  this.droppedItems.push({
                    id: `drop-${Math.random().toString(36).slice(2, 9)}`,
                    sourceMarkerId: marker.id,
                    x: state.currentX + (Math.random() - 0.5) * 12,
                    y: state.currentY + (Math.random() - 0.5) * 12,
                    itemId: it.id,
                    name: it.name,
                    icon: it.icon || '📦',
                    iconUrl: it.iconUrl,
                    amount: it.amount || 1,
                    type: it.type || 'gold',
                    createdAt: now,
                  });
                  break; // Solta 1 item por ciclo
                }
              }
            }
          }
        }
      }
    }

    // 3. Atualização de Projéteis Ativos
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const stepDist = p.speed * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.distanceTraveled += stepDist;

      // Colisão com o Herói
      const distToPlayer = getDistance(p.x, p.y, playerPos.x, playerPos.y);
      if (distToPlayer <= p.size + 16) {
        onPlayerHit?.(p.damage);
        this.spawnVfx({
          type: 'contact_spark',
          x: p.x,
          y: p.y,
          scale: 1.4,
          durationMs: 400,
          progress: 0,
          createdAt: now,
        });
        this.projectiles.splice(i, 1);
        continue;
      }

      // Alcance máximo esgotado
      if (p.distanceTraveled >= p.range) {
        this.spawnVfx({
          type: 'contact_spark',
          x: p.x,
          y: p.y,
          scale: 0.8,
          durationMs: 300,
          progress: 0,
          createdAt: now,
        });
        this.projectiles.splice(i, 1);
      }
    }

    // 4. Atualização de Efeitos Visuais 2D (VFX)
    for (let i = this.vfxList.length - 1; i >= 0; i--) {
      const vfx = this.vfxList[i];
      const elapsed = now - vfx.createdAt;
      vfx.progress = clamp(elapsed / vfx.durationMs, 0, 1);
      if (vfx.progress >= 1) {
        this.vfxList.splice(i, 1);
      }
    }

    // 5. Expiração de Balões de Fala
    for (const [id, balloon] of this.speechBalloons.entries()) {
      if (now >= balloon.expiresAt) {
        this.speechBalloons.delete(id);
      }
    }

    // 6. Verificação de Coleta de Itens pelo Jogador
    for (let i = this.droppedItems.length - 1; i >= 0; i--) {
      const it = this.droppedItems[i];
      const dist = getDistance(it.x, it.y, playerPos.x, playerPos.y);
      if (dist <= 32) {
        onItemCollected?.(it);
        this.spawnVfx({
          type: 'contact_spark',
          x: it.x,
          y: it.y,
          scale: 1.3,
          durationMs: 350,
          progress: 0,
          createdAt: now,
        });
        this.droppedItems.splice(i, 1);
      }
    }

    return {
      updatedPositions,
      vfx: [...this.vfxList],
      projectiles: [...this.projectiles],
      speechBalloons: new Map(this.speechBalloons),
      playerIdleEmote: this.playerIdleEmote,
      activeAttacks,
      droppedItems: [...this.droppedItems],
    };
  }

  // Obtém todos os itens dropados ativos no chão
  public getDroppedItems(): ActiveDroppedItem[] {
    return this.droppedItems;
  }

  // Coleta manualmente um item dropado
  public collectDroppedItem(itemId: string): ActiveDroppedItem | null {
    const idx = this.droppedItems.findIndex((d) => d.id === itemId);
    if (idx !== -1) {
      const it = this.droppedItems[idx];
      this.droppedItems.splice(idx, 1);
      return it;
    }
    return null;
  }

  // Obtém o estado de tempo de execução de um NPC
  public getRuntimeState(markerId: string): NpcRuntimeState | undefined {
    return this.runtimeStates.get(markerId);
  }

  // Verifica se o Mobby está temporariamente ou permanentemente oculto (após ser escaneado ou derrotado)
  public isDespawned(markerId: string, now: number = performance.now()): boolean {
    const state = this.runtimeStates.get(markerId);
    if (!state) return false;
    if (state.permanentlyDespawned) return true;
    if (state.despawnedUntil && now < state.despawnedUntil) return true;
    return false;
  }

  // Faz o Mobby sumir do mapa (ao ser escaneado ou derrotado) e agenda o respawn conforme sua regra configurada
  public despawnAndScheduleRespawn(
    markerId: string,
    marker?: MapMarker,
    now: number = performance.now()
  ): { respawnMode: 'timed' | 'never'; respawnTimeSeconds: number } {
    const state = this.runtimeStates.get(markerId);
    const mode = marker?.actionNpc?.respawnMode || state?.respawnMode || 'timed';
    const sec = Math.max(3, marker?.actionNpc?.respawnTimeSeconds ?? state?.respawnTimeSeconds ?? 25);

    if (state) {
      state.currentHp = 0;
      state.stunUntil = undefined;
      state.activeAttack = undefined;
      state.respawnMode = mode;
      state.respawnTimeSeconds = sec;
      if (mode === 'never') {
        state.permanentlyDespawned = true;
        state.despawnedUntil = undefined;
      } else {
        state.permanentlyDespawned = false;
        state.despawnedUntil = now + sec * 1000;
      }
      this.speechBalloons.delete(markerId);
    }

    return { respawnMode: mode, respawnTimeSeconds: sec };
  }
}

// Instância singleton do motor
export const globalNpcActionEngine = new NpcActionEngine();
