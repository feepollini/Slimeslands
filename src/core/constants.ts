/**
 * constants.ts — Static game data. No state.
 */

import type { Skill, Rarity, RarityDef, CardAbility, CardAbilityId, SkillGroup } from './types';

// ─── RARITIES ─────────────────────────────────────────────────────────────────

import raritiesData from './rarities.json';
export const RARITIES: Record<Rarity, RarityDef> = raritiesData as Record<Rarity, RarityDef>;

/** Weighted rarity pool — 50% common, 30% rare, 15% epic, 5% legendary */
export const RARITY_POOL: Rarity[] = [
    ...Array(50).fill('common'),
    ...Array(30).fill('rare'),
    ...Array(15).fill('epic'),
    ...Array(5).fill('legendary'),
] as Rarity[];

// ─── CARD ABILITIES ───────────────────────────────────────────────────────────

import abilitiesData from './abilities.json';

function loadInitialAbilities(): CardAbility[] {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = window.localStorage.getItem('forge_abilities');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed as CardAbility[];
            }
        }
    } catch (_) {}
    return abilitiesData as CardAbility[];
}

export const CARD_ABILITIES: CardAbility[] = loadInitialAbilities();

/** Ability pool for deck generation. None appears 2× for higher common chance. */
export const ABILITY_POOL: CardAbilityId[] = [
    'none', 'none',
    ...(CARD_ABILITIES.map(a => a.id) as CardAbilityId[])
];

// ─── CARD TEMPLATES ───────────────────────────────────────────────────────────

import cardTemplatesData from './cards.json';

export interface CardTemplate {
    name: string;
    baseAtk: number;
    basePv: number;
    image: string;
    animationUrl?: string; // Optional embedded video format
    cardBack?: string; // Optional per-card back (flipped)
    videoStart?: number;
    videoEnd?: number;
    /** Optional explicit ability, else randomly assigned if rare+ */
    abilityId?: CardAbilityId;
    classId?: string;
    manaCost?: number;
    staminaCost?: number;
    /** Flavor text or lore describing the card */
    flavorText?: string;
    immersiveMode?: boolean;
    // ── Availability & Shop ────────────────────────────────
    availability?: import('./types').AvailabilityType | 'deck' | 'only-in' | 'off'; // Legacy + New
    shopAvailability?: import('./types').AvailabilityDef;
    unlockAction?: string;
    // Dynamic Styles
    containerColor?: string;
    containerOpacity?: number;
    containerText?: string;
    fontSizeBase?: number;
    useGradient?: boolean;
    /** Preferred rarity pool override — if null, uses RARITY_POOL */
    preferredRarity?: Rarity;
    // ── Per-zone styles ──────────────────────────────────────
    nameStyle?: import('./types').CardZoneStyle;
    descStyle?: import('./types').CardZoneStyle;
    abilityStyle?: import('./types').CardZoneStyle;
    statsStyle?: import('./types').CardZoneStyle;
    // ── Border / Glow ───────────────────────────────────────
    borderColor?: string;
    borderWidth?: number;
    glowColor?: string;
    glowIntensity?: number;
    glowAnimated?: boolean;
    borderRadius?: number;
    // ── Font ────────────────────────────────────────────────
    fontFamily?: string;
    fontColor?: string;
    hasVideoAttack?: boolean;
}

export const CARD_TEMPLATES: CardTemplate[] = cardTemplatesData as CardTemplate[];


// ─── SKILL GROUPS ─────────────────────────────────────────────────────────────

export const SKILL_GROUP_META: Record<SkillGroup, { label: string; color: string; icon: string }> = {
    offensive: { label: 'Ofensivo', color: '#ff4444', icon: '🔴' },
    defensive: { label: 'Defensivo', color: '#4da6ff', icon: '🔵' },
    debuff: { label: 'Debuff', color: '#888888', icon: '⚫' },
    support: { label: 'Suporte', color: '#ffd700', icon: '🟡' },
};

// ─── SKILL POOL ───────────────────────────────────────────────────────────────

import skillsData from './skills.json';

function loadInitialSkills(): Skill[] {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const raw = window.localStorage.getItem('forge_skills');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed as Skill[];
            }
        }
    } catch (_) {}
    return skillsData as Skill[];
}

export const SKILL_POOL: Skill[] = loadInitialSkills();

// ─── CARD BACK GLOBAL CONFIG ──────────────────────────────────────────────────

export const DEFAULT_CARD_BACK = '/cards/fundo_de_carta.png';

export function getGlobalCardBack(): string {
    try {
        if (typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem('global_card_back');
            if (saved && saved.trim()) return saved.trim();
        }
    } catch (_) {}
    return DEFAULT_CARD_BACK;
}

export function setGlobalCardBack(url: string): void {
    const finalUrl = (url && url.trim()) ? url.trim() : DEFAULT_CARD_BACK;
    try {
        if (typeof window !== 'undefined') {
            if (window.localStorage) {
                window.localStorage.setItem('global_card_back', finalUrl);
            }
            if (document.documentElement) {
                document.documentElement.style.setProperty('--global-card-back', `url('${finalUrl}')`);
            }
        }
    } catch (_) {}
}

// Auto-inicializa a variável CSS no boot
if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.style.setProperty('--global-card-back', `url('${getGlobalCardBack()}')`);
}

