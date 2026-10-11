/**
 * types.ts — Shared interfaces. Single source of truth.
 */

// ─── RARITY ───────────────────────────────────────────────────────────────────
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface RarityDef {
    label: string;
    icon: string;
    color: string;
    atkBonus: number; // multiplier, e.g. 1.12
    pvBonus: number;
}

// ─── AVAILABILITY ─────────────────────────────────────────────────────────────
export type AvailabilityType = 'level' | 'stage' | 'store' | 'always' | 'hidden';

export interface AvailabilityDef {
    type: AvailabilityType;
    minLevel?: number;
    stageId?: string;
    price?: number;
    currency?: 'gold' | 'gems' | 'real' | string;
}

// ─── CARD ABILITY ─────────────────────────────────────────────────────────────
    export type CardAbilityId =
    | 'reflect' | 'phantom' | 'rivalry' | 'resilience' | 'vampire' | 'deathblow' 
    | 'hit_kill' | 'mass_flip' | 'absorb_50' | 'stun' | 'poison' | 'burn' 
    | 'shield_up' | 'restore' | 'bind' | 'freeze' | 'exposure' | 'disarm' | 'crush' 
    | 'heal_ally' | 'elixir' | 'drain' | 'regen' | 'revive'
    | 'shield' | 'vampirism' | 'berserk' | 'blessing' | 'camo'
    | 'siphon' | 'mind_blast' | 'meditate' | 'sacrifice' | 'reveal' | 'recycle' | 'echo'
    | 'none';

export type AbilityTrigger = 'on_play' | 'on_attack' | 'on_defend' | 'on_death' | 'on_turn_start' | 'on_turn_end' | 'on_sacrifice';

export interface CardAbility {
    id: CardAbilityId;
    name: string;
    icon: string;
    image?: string;
    description: string;
    triggerText: string; // Short text shown as floating label when triggered
    color: string;       // Hex color for animations/glow
    availability?: AvailabilityDef;
    
    // ── Blueprint Logic ────────────────────────────────────
    trigger?: AbilityTrigger;
    logicType?: 'buff' | 'nerf' | 'special';
    target?: 'self' | 'attacker' | 'defender' | 'opponent_board' | 'own_board' | 'random_enemy' | 'random_ally';
    statType?: 'pv' | 'atk' | 'stun' | 'flip' | 'shield' | 'poison';
    value?: number;      // Value or Percentage (e.g. 0.5 for 50%)
    vfxId?: string;      // Assigned visual effect ID
}

// ─── CARD ZONE STYLE ──────────────────────────────────────────────────────────
export interface CardZoneStyle {
    bg: string;           // Hex color
    bg2?: string;         // Gradient second color (if gradient)
    opacity: number;      // 0–1
    isGradient?: boolean; // Use linear-gradient
    gradientAngle?: number; // Degrees
}

export interface ParallaxLayer {
    id: string;
    url: string;
    z: number;      // 1-5 (depth order)
    speed: number;  // movement multiplier (e.g. 0.5 for background, 2.0 for foreground)
    scale: number;  // base scale
    initialX: number; // offset X
    initialY: number; // offset Y
    opacity: number;
    blendMode: string;
    imageFilter?: string;
    imageFilterIntensity?: number;
    animation?: 'none' | 'sway' | 'zoom' | 'pulse' | 'float' | 'slide';
    animationIntensity?: number; // 0-1 range
}


// ─── ATTACK DEFINITION ────────────────────────────────────────────────────────
// ─── ATTACK DEFINITION ────────────────────────────────────────────────────────
export type AttackType = 'damage' | 'enchantment';

export interface AttackDef {
    type: AttackType;
    name: string;
    cost: number;
    costType: 'mana' | 'stamina';
    damage?: number; // populated if type === 'damage'
    enchantment?: { id: string; value?: number; turns?: number }; // if type === 'enchantment'
    vfxId?: string; // Assigned visual effect ID
}

/** Special Attack: Extra cinematic attack slot for any rarity card */
export interface SpecialAttack extends AttackDef {
    /** If set, plays this video fullscreen before the physical lunge */
    videoUrl?: string;
    /** Description shown in the fullscreen overlay before attack */
    description?: string;
}

// ─── CARD ─────────────────────────────────────────────────────────────────────
export interface Card {
    id: string;
    name: string;
    atk: number;
    pv: number;
    maxPv: number;
    image: string;
    animationUrl?: string; // Video file path
    videoStart?: number;   // Video slice start time (seconds)
    videoEnd?: number;     // Video slice end time (seconds)
    cardBack?: string;     // Image URL for the card back (flipped)
    rarity?: Rarity;
    abilityId?: CardAbilityId;
    classId?: string;
    attacks?: AttackDef[]; // Standard attacks (Rule of Three)
    specialAttack?: import('./types').SpecialAttack; // Extra cinematic attack, any rarity
    manaCost?: number;     // Legacy: total play cost
    staminaCost?: number;
    flavorText?: string;
    immersiveMode?: boolean;
    availability?: 'deck' | 'only-in' | 'off';
    unlockAction?: string;
    // ── Per-zone styles ──────────────────────────────────────
    nameStyle?: CardZoneStyle;
    descStyle?: CardZoneStyle;
    abilityStyle?: CardZoneStyle;
    statsStyle?: CardZoneStyle;
    // ── Border / Glow ───────────────────────────────────────
    borderColor?: string;
    borderWidth?: number;   // px, 0 = none
    glowColor?: string;
    glowIntensity?: number; // 0–30 (px spread)
    glowAnimated?: boolean;
    borderRadius?: number;  // override default 20px
    cardBackground?: string; // Image URL for the card face itself
    // ── Font ────────────────────────────────────────────────
    fontFamily?: string;    // CSS font-family name
    fontColor?: string;     // Hex color
    fontSizeBase?: number;  // 100% base
    // ── Image Tweaks ───────────────────────────────────────
    imageFilter?: string;    // CSS filter (sepia, saturate, hue-rotate, etc or fx-vhs)
    imageFilterIntensity?: number; // 0-200%
    patternOverlay?: string; // SVG data URL string for overlays
    patternType?: string;
    patternColor?: string;
    parallaxLayers?: ParallaxLayer[];
    
    // ── Combat State (Transient) ────────────────────────────
    containerColor?: string;
    containerOpacity?: number;
    containerText?: string;
    useGradient?: boolean;
    owner?: 'p' | 'e';
    /** Face-down: revealed when attacked */
    isFlipped?: boolean;
    /** Cannot attack this turn */
    isStunned?: boolean;
    /** Countdown: decremented at end of owner's turn */
    stunTurns?: number;
    /** Absorbs next incoming attack */
    shieldActive?: boolean;
    /** Remaining poison ticks (−50 PV each) */
    poisonTurns?: number;
    /** Remaining burn ticks (10% maxPV each) */
    burnTurns?: number;
    burnValue?: number;
    /** Remaining regen ticks (+150 PV each) */
    regenTurns?: number;
    regenValue?: number;
    /** Whether card is camouflaged (cannot be targeted) */
    isCamouflaged?: boolean;
    camoTurns?: number;
    /** Whether card can attack twice this turn */
    doubleAttack?: boolean;
    doubleAttackTurns?: number;
    /** Permanent ATK bonus from enchantments */
    atkBonus?: number;
    /** Specific Status Effects */
    isExposed?: boolean;
    exposeTurns?: number;
    exposeValue?: number;
    reviveActive?: boolean;
    vampirismActive?: boolean;
    isRevealed?: boolean;
    /** Resilience already used this battle */
    usedResilience?: boolean;
    /** Phantom: will flip at start of next owner turn */
    pendingPhantom?: boolean;
    /** If legendary + video media: play cinematic 5s fullscreen attack animation */
    hasVideoAttack?: boolean;
    /** Ambient particle effects for the card theater view */
    particles?: {
        type: 'none' | 'sparks' | 'fog' | 'swirl';
        color?: string;
        count?: number;
    };
    /** Parry Chance (0-100). If > 0, enables parry QTE when defending. */
    parry?: number;
    /** Glossy reflective effect layer over the card art */
    reflectiveGlow?: boolean;
}

// ─── SKILL ────────────────────────────────────────────────────────────────────
export type SkillEffect = 'flip' | 'stun' | 'shield' | 'draw' | 'poison' | 'burn' | 'drain' | 'nuke' | 'divine';
export type SkillCategory = 'martial' | 'arcane' | 'dark' | 'tactical';
export type SkillGroup = 'offensive' | 'defensive' | 'debuff' | 'support';

export interface Skill {
    id: string;
    name: string;
    icon: string;
    image?: string;
    effect: SkillEffect;
    category: SkillCategory;
    group: SkillGroup;
    description: string;
    flavorText: string;
    power?: number;
    target?: 'user' | 'opponent';
    statType?: 'pv' | 'atk' | 'turns' | 'hand';
    logicType?: 'buff' | 'nerf';
    manaCost?: number;
    staminaCost?: number;
    availability?: AvailabilityDef;
}

// ─── STORE ────────────────────────────────────────────────────────────────────
export type StoreItemType = 'card' | 'artifact' | 'pack' | 'cosmetic' | 'other';
export type CurrencyType = 'gold' | 'gems' | 'real';
export type AssetCategory = 'card_art' | 'card_bg' | 'artifact' | 'ability' | 'board_bg' | 'svg_pop' | 'avatar_border';

export interface StoreItem {
    id: string;
    name: string;
    description: string;
    price: number;
    currency: CurrencyType;
    icon: string;
    type: StoreItemType;
    itemId: string; // ID of the referenced object
    image?: string; // Special shop image
}

export interface SkillResult {
    success: boolean;
    message: string;
}

// ─── ABILITY TRIGGER ─────────────────────────────────────────────────────────
/** Returned by CombatEngine so main.ts can fire the right animation */
export interface AbilityTriggered {
    abilityId: CardAbilityId;
    cardIdx: number;  // board slot index
    value?: number;   // damage/heal amount for display
    turns?: number;   // duration for debuffs/buffs
}

// ─── ATTACK RESULT ────────────────────────────────────────────────────────────
export interface AttackResult {
    damage: number;
    defPvAfter: number;
    atkPvAfter: number;
    defDied: boolean;
    atkDied: boolean;
    reflected: boolean;
    reflectDamage: number;   // actual damage reflected back
    hpDmgE: number;
    hpDmgP: number;
    revealed: boolean;
    typeBonus: boolean;
    abilityTriggers: AbilityTriggered[];
    /** If deathblow fires, which board idx gets hit and how much */
    deathblowTarget?: { idx: number; dmg: number };
}

export type GameState = 'menu' | 'battle' | 'gameOver';

// ─── RUNTIME ENGINE TYPES ──────────────────────────────────────────────────────

export interface GameObject {
    id: string;
    type: string;
    label?: string;
    x: number;
    y: number;
    w: number;
    h: number;
    color?: string;
    opacity?: number;
    isVisible?: boolean;
    isLocked?: boolean;
    isPersistent?: boolean;
    assetUrl?: string;
    artboardId?: string;
    parentId?: string;
    groupId?: string;
    inPoint?: number;
    outPoint?: number;
    rotation?: number;
    keyframes?: Record<string, any>;
    events?: SensorEvent[];
    [key: string]: any;
}

export interface SensorEvent {
    type: 'none' | 'showDialog' | 'playScene' | 'phaseChange' | 'playAudio' | 'spawnEntity' | 'dealDamage' | 'deliverItem' | 'animatedInteraction' | 'portal' | 'triggerEvent' | 'playSound' | 'battleStart' | 'campaignDialogue' | 'tutorial' | 'loadPhase';
    dialogText?: string;
    sceneId?: string;
    sceneTransition?: string;
    phaseId?: string;
    audio?: string;
    spawnId?: string;
    damage?: number;
    itemId?: string;
    interactionId?: string;
    portalX?: number;
    portalY?: number;
    eventId?: string;
    // Audio falloff properties
    soundUrl?: string;
    minVol?: number;
    maxVol?: number;
    curve?: 'linear' | 'logarithmic' | 'inverse';
    invert?: boolean;
    // Battle properties
    battleType?: 'normal' | 'elite' | 'boss';
    enemies?: string[];
    onWin?: 'continue' | 'loadPhase' | 'showDialog';
    // Campaign dialogue properties
    bg?: string;
    lines?: Array<{turn: number; side: 'player' | 'npc'; text: string}>;
    speed?: number;
    rewards?: string;
    // Tutorial properties
    title?: string;
    text?: string;
    freezePlayer?: boolean;
    highlightUI?: boolean;
    autoDestroy?: boolean;
    // Load phase properties
    playerX?: number;
    playerY?: number;
}

export interface PhaseData {
    id: string;
    name: string;
    spawnFrame: { x: number; y: number; w: number; h: number; mode: string };
    playerPos: { x: number; y: number };
    playerData?: { moveSpeed?: number };
    objects: GameObject[];
    collisions?: GameObject[];
    sensors?: GameObject[];
    scenes?: SceneData[];
    linkedPhases?: PhaseData[];
    createdAt?: number;
    updatedAt?: number;
}

export interface SceneData {
    id: string;
    name?: string;
    saveMode?: 'local' | 'motion';
    actions: SceneAction[];
    transition?: string;
}

export interface SceneAction {
    type: 'wait' | 'dialog' | 'move' | 'camera' | 'playAudio' | 'fade';
    duration?: number;
    speaker?: string;
    text?: string;
    x?: number;
    y?: number;
    target?: string;
    audio?: string;
    color?: string;
}
