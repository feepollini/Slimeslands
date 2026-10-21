import rawPassives from '../../../core/abilities.json';
import rawActives from '../../../core/skills.json';
import { ENCHANTMENT_REGISTRY, EnchantmentRegistryEntry } from '../../../core/enchantments';
import { VFX_REGISTRY, VFXRegistryEntry } from '../../../core/vfxRegistry';

export type { EnchantmentRegistryEntry, VFXRegistryEntry };
export { ENCHANTMENT_REGISTRY, VFX_REGISTRY };

export interface ForgePassiveAbility {
  id: string;
  name: string;
  icon: string;
  image?: string;
  description: string;
  triggerText: string;
  effectText: string;
  color?: string;
  trigger?: string;
  type?: string;
  target?: string;
  stat?: string;
  value?: number;
}

export interface ForgeActiveSkill {
  id: string;
  name: string;
  icon: string;
  image?: string;
  effect: string;
  category: string;
  group: string;
  description: string;
  flavorText?: string;
  power?: number;
  target?: string;
  statType?: string;
  logicType?: string;
  range: number;
  cooldown: number;
}

function normalizePassive(p: any): ForgePassiveAbility {
  return {
    id: String(p.id || 'passive'),
    name: String(p.name || 'Passiva'),
    icon: String(p.icon || '✨'),
    image: p.image,
    description: String(p.description || ''),
    triggerText: String(p.triggerText || p.trigger || 'Ao entrar em campo'),
    effectText: String(
      p.effectText ||
        (p.stat && p.value !== undefined
          ? `${p.stat.toUpperCase()} +${p.value}`
          : p.description || 'Efeito passivo de tabuleiro')
    ),
    color: p.color,
    trigger: p.trigger,
    type: p.type,
    target: p.target,
    stat: p.stat,
    value: p.value,
  };
}

function normalizeActive(a: any): ForgeActiveSkill {
  return {
    id: String(a.id || 'active'),
    name: String(a.name || 'Habilidade Ativa'),
    icon: String(a.icon || '⚡'),
    image: a.image,
    effect: String(a.effect || a.description || ''),
    category: String(a.category || 'Combate'),
    group: String(a.group || 'offensive'),
    description: String(a.description || a.effect || ''),
    flavorText: a.flavorText,
    power: a.power,
    target: a.target,
    statType: a.statType,
    logicType: a.logicType,
    range: Number(a.range ?? 2),
    cooldown: Number(a.cooldown ?? 2),
  };
}

export let FORGE_PASSIVE_ABILITIES: ForgePassiveAbility[] = Array.isArray(rawPassives)
  ? rawPassives.map(normalizePassive)
  : [];

export let FORGE_ACTIVE_SKILLS: ForgeActiveSkill[] = Array.isArray(rawActives)
  ? rawActives.map(normalizeActive)
  : [];

export function getForgePassivesSync(): ForgePassiveAbility[] {
  return FORGE_PASSIVE_ABILITIES;
}

export function getForgeActivesSync(): ForgeActiveSkill[] {
  return FORGE_ACTIVE_SKILLS;
}

export function findForgePassiveById(id?: string): ForgePassiveAbility | undefined {
  if (!id) return undefined;
  return FORGE_PASSIVE_ABILITIES.find((p) => p.id === id);
}

export function findForgeActiveById(id?: string): ForgeActiveSkill | undefined {
  if (!id) return undefined;
  return FORGE_ACTIVE_SKILLS.find((a) => a.id === id);
}

export function findForgeEnchantmentById(id?: string): EnchantmentRegistryEntry | undefined {
  if (!id || id === 'none') return undefined;
  return ENCHANTMENT_REGISTRY.find((e) => e.id === id);
}

export function findForgeVfxById(id?: string): VFXRegistryEntry | undefined {
  if (!id) return undefined;
  return VFX_REGISTRY.find((v) => v.id === id);
}

export function getDefaultVfxForSlot(slotIdx: number, isEnchantment: boolean = false): string {
  if (slotIdx === 3) return 'vfx_celestial_judgment';
  if (isEnchantment) {
    return slotIdx === 0 ? 'vfx_fire_persistent' : slotIdx === 1 ? 'vfx_ice_prison' : 'vfx_electro_shock';
  }
  if (slotIdx === 0) return 'vfx_slash_basic';
  if (slotIdx === 1) return 'vfx_claw_flurry';
  return 'vfx_dimensional_slash';
}

export async function refreshForgeAbilitiesCatalog(): Promise<{
  passives: ForgePassiveAbility[];
  actives: ForgeActiveSkill[];
}> {
  try {
    const [pRes, aRes] = await Promise.all([
      fetch('/src/core/abilities.json', { cache: 'no-store' }),
      fetch('/src/core/skills.json', { cache: 'no-store' }),
    ]);
    if (pRes.ok) {
      const pJson = await pRes.json();
      if (Array.isArray(pJson) && pJson.length > 0) {
        FORGE_PASSIVE_ABILITIES = pJson.map(normalizePassive);
      }
    }
    if (aRes.ok) {
      const aJson = await aRes.json();
      if (Array.isArray(aJson) && aJson.length > 0) {
        FORGE_ACTIVE_SKILLS = aJson.map(normalizeActive);
      }
    }
  } catch {}
  return {
    passives: FORGE_PASSIVE_ABILITIES,
    actives: FORGE_ACTIVE_SKILLS,
  };
}
