import type { GrassBladePreset, WaterPreset, FlowerPreset } from '../../types/terrainPen';

export const GRASS_PRESETS: { id: GrassBladePreset; label: string; desc: string; icon: string }[] = [
  { id: 'cluster', label: 'Tufo Denso', desc: 'Folhas fartas e volumosas', icon: '🌿' },
  { id: 'fine', label: 'Lâminas Finas', desc: 'Folhas delgadas e pontiagudas', icon: '🌱' },
  { id: 'clover', label: 'Trevo Silvestre', desc: 'Arranjo orgânico em pétalas', icon: '🍀' },
  { id: 'autumn', label: 'Outono Dourado', desc: 'Lâminas ocres e âmbar', icon: '🍂' },
];

export const WATER_PRESETS: { id: WaterPreset; label: string; desc: string; icon: string; color: string }[] = [
  { id: 'turquoise', label: 'Cristalina', desc: 'Água pura e límpida estilo anime', icon: '💧', color: '#0284c7' },
  { id: 'deep', label: 'Oceano Escuro', desc: 'Profundezas azuis oceânicas', icon: '🌊', color: '#0f172a' },
  { id: 'emerald', label: 'Lagoa Menta', desc: 'Tonalidade refrescante de lago', icon: '🌿', color: '#0d9488' },
  { id: 'sacred', label: 'Azul Céu', desc: 'Reflexo cristalino brilhante', icon: '💎', color: '#38bdf8' },
];

export const GROUND_QUICK_TEXTURES = [
  { name: 'Esmeralda', hex: '#16a34a', emoji: '🟩' },
  { name: 'Musgo Escuro', hex: '#15803d', emoji: '🌿' },
  { name: 'Areia Dourada', hex: '#ca8a04', emoji: '🏖️' },
  { name: 'Terra / Lama', hex: '#78350f', emoji: '🪵' },
  { name: 'Lago / Água', hex: '#0284c7', emoji: '🌊' },
  { name: 'Pedra / Asfalto', hex: '#64748b', emoji: '🏙️' },
  { name: 'Neve / Branco', hex: '#f8fafc', emoji: '⚪' },
];

export const FLOWER_PRESETS: { id: FlowerPreset; label: string; desc: string; icon: string; color: string }[] = [
  { id: 'daisy', label: 'Margarida', desc: '8 pétalas brancas com miolo dourado', icon: '🌼', color: '#facc15' },
  { id: 'poppy', label: 'Papoula', desc: 'Pétalas vermelhas com miolo escuro', icon: '🌺', color: '#ef4444' },
  { id: 'sunflower', label: 'Girassol', desc: 'Pétalas solares com miolo castanho', icon: '🌻', color: '#f59e0b' },
  { id: 'sakura', label: 'Sakura', desc: 'Cerejeira japonesa cor-de-rosa', icon: '🌸', color: '#ec4899' },
];
