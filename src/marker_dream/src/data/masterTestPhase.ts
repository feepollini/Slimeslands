import type { MapProject, SavedLevel, MapMarker } from '../types/map';
import { ensureProjectQuestsConfig } from '../utils/questEngine';
import { DEFAULT_CHARACTERS } from '../utils/characterHelpers';
import { DEFAULT_ITEM_CATALOG, DEFAULT_INVENTORY_PROJECTS } from '../utils/inventoryHelpers';
import { getOrCreateScreensConfig } from '../components/screens/ScreensStudio';
import { getOrCreateWorldMapConfig } from '../components/workspace/WorldMapCanvasEditor';
import { computeLevelStats } from '../utils/storage';

export const FASE_MESTRA_ID = 'level-fase-mestra-100';
export const FASE_MESTRA_EXTENDED_ID = 'level-fase-mestra-extended-npcs';

// Procedural SVG Data URLs (zero external network dependencies, crisp rendering)
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;
}

export const BIOME_FOREST_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="256" viewBox="0 0 768 256">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0f3d28"/>
      <stop offset="50%" stop-color="#14532d"/>
      <stop offset="100%" stop-color="#166534"/>
    </linearGradient>
    <pattern id="grass" width="64" height="64" patternUnits="userSpaceOnUse">
      <circle cx="16" cy="18" r="2.5" fill="#22c55e" opacity="0.35"/>
      <circle cx="48" cy="42" r="3" fill="#4ade80" opacity="0.3"/>
      <path d="M28 52 Q30 44 33 52" stroke="#86efac" stroke-width="1.5" fill="none" opacity="0.4"/>
    </pattern>
  </defs>
  <rect width="768" height="256" fill="url(#g1)"/>
  <rect width="768" height="256" fill="url(#grass)"/>
  <!-- Estrada central da Floresta -->
  <path d="M 340 0 Q 384 128 348 256 L 424 256 Q 460 128 416 0 Z" fill="#78350f" opacity="0.45"/>
  <path d="M 352 0 Q 384 128 360 256 L 412 256 Q 444 128 404 0 Z" fill="#92400e" opacity="0.45"/>
</svg>
`);

export const BIOME_VILLAGE_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="256" viewBox="0 0 768 256">
  <defs>
    <linearGradient id="v1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#166534"/>
      <stop offset="50%" stop-color="#3f6212"/>
      <stop offset="100%" stop-color="#4d7c0f"/>
    </linearGradient>
    <pattern id="cobble" width="48" height="48" patternUnits="userSpaceOnUse">
      <rect x="4" y="4" width="18" height="12" rx="4" fill="#a8a29e" opacity="0.18"/>
      <rect x="26" y="22" width="18" height="12" rx="4" fill="#d6d3d1" opacity="0.15"/>
    </pattern>
  </defs>
  <rect width="768" height="256" fill="url(#v1)"/>
  <rect width="768" height="256" fill="url(#cobble)"/>
  <!-- Praça Central da Vila Mercante -->
  <ellipse cx="384" cy="128" rx="220" ry="96" fill="#78350f" opacity="0.38"/>
  <ellipse cx="384" cy="128" rx="190" ry="80" fill="#b45309" opacity="0.28"/>
  <rect x="348" y="0" width="72" height="256" fill="#92400e" opacity="0.35"/>
</svg>
`);

export const BIOME_RUINS_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="256" viewBox="0 0 768 256">
  <defs>
    <linearGradient id="r1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#3b0764"/>
      <stop offset="50%" stop-color="#1e1b4b"/>
      <stop offset="100%" stop-color="#0f172a"/>
    </linearGradient>
    <pattern id="runes" width="64" height="64" patternUnits="userSpaceOnUse">
      <circle cx="32" cy="32" r="3" fill="#a855f7" opacity="0.35"/>
      <rect x="12" y="12" width="40" height="40" stroke="#6366f1" stroke-width="0.7" fill="none" opacity="0.2"/>
    </pattern>
  </defs>
  <rect width="768" height="256" fill="url(#r1)"/>
  <rect width="768" height="256" fill="url(#runes)"/>
  <!-- Passarela Arcana -->
  <rect x="336" y="0" width="96" height="256" fill="#4c1d95" opacity="0.4"/>
  <circle cx="384" cy="128" r="88" stroke="#c084fc" stroke-width="2" fill="#581c87" fill-opacity="0.3" opacity="0.6"/>
</svg>
`);

export const SUB_BIOME_ALCHEMIST_LAB_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <rect width="768" height="768" fill="#18181b"/>
  <rect x="36" y="36" width="696" height="696" rx="28" fill="#27272a" stroke="#f59e0b" stroke-width="5"/>
  <path d="M 36 384 L 732 384" stroke="#92400e" stroke-width="48" opacity="0.35"/>
  <path d="M 384 36 L 384 732" stroke="#92400e" stroke-width="48" opacity="0.35"/>
  <circle cx="384" cy="384" r="170" fill="#3f3f46" stroke="#fbbf24" stroke-width="4" stroke-dasharray="12 8"/>
  <circle cx="384" cy="384" r="105" fill="#78350f" opacity="0.45"/>
</svg>
`);

export const EXTENDED_GUILD_PLAZA_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <defs>
    <linearGradient id="eg1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#14532d"/>
      <stop offset="50%" stop-color="#166534"/>
      <stop offset="100%" stop-color="#15803d"/>
    </linearGradient>
    <pattern id="ep1" width="64" height="64" patternUnits="userSpaceOnUse">
      <rect x="6" y="6" width="24" height="16" rx="4" fill="#fef08a" opacity="0.1"/>
      <circle cx="48" cy="48" r="3" fill="#4ade80" opacity="0.35"/>
    </pattern>
  </defs>
  <rect width="768" height="768" fill="url(#eg1)"/>
  <rect width="768" height="768" fill="url(#ep1)"/>
  <!-- Estrada Horizontal e Praça Central -->
  <rect x="0" y="330" width="768" height="108" fill="#92400e" opacity="0.55"/>
  <rect x="330" y="0" width="108" height="768" fill="#92400e" opacity="0.45"/>
  <circle cx="384" cy="384" r="190" fill="#b45309" opacity="0.45" stroke="#fbbf24" stroke-width="4"/>
  <circle cx="384" cy="384" r="135" fill="#d97706" opacity="0.3" stroke="#fef08a" stroke-width="2" stroke-dasharray="10 6"/>
</svg>
`);

export const EXTENDED_RELIC_GROVE_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <defs>
    <linearGradient id="eg2" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#064e3b"/>
      <stop offset="50%" stop-color="#065f46"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
    <pattern id="ep2" width="64" height="64" patternUnits="userSpaceOnUse">
      <circle cx="20" cy="24" r="4" fill="#34d399" opacity="0.28"/>
      <circle cx="52" cy="44" r="3" fill="#a7f3d0" opacity="0.25"/>
    </pattern>
  </defs>
  <rect width="768" height="768" fill="url(#eg2)"/>
  <rect width="768" height="768" fill="url(#ep2)"/>
  <!-- Estrada Horizontal Conectada -->
  <rect x="0" y="330" width="768" height="108" fill="#78350f" opacity="0.55"/>
  <ellipse cx="384" cy="384" rx="220" ry="180" fill="#0d9488" opacity="0.28" stroke="#5eead4" stroke-width="3"/>
</svg>
`);

export const EXTENDED_EVENT_ARENA_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768">
  <defs>
    <linearGradient id="eg3" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#3b0764"/>
      <stop offset="50%" stop-color="#4c1d95"/>
      <stop offset="100%" stop-color="#1e1b4b"/>
    </linearGradient>
  </defs>
  <rect width="768" height="768" fill="url(#eg3)"/>
  <rect x="0" y="330" width="768" height="108" fill="#581c87" opacity="0.65"/>
  <circle cx="384" cy="384" r="210" fill="#6b21a8" opacity="0.35" stroke="#e879f9" stroke-width="5"/>
  <circle cx="384" cy="384" r="140" fill="#4c1d95" opacity="0.45" stroke="#fde047" stroke-width="3" stroke-dasharray="14 8"/>
</svg>
`);

export const HERO_AVATAR_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <ellipse cx="64" cy="108" rx="34" ry="10" fill="#000000" opacity="0.35"/>
  <path d="M26 78 C26 42 42 26 64 26 C86 26 102 42 102 78 C102 98 88 106 64 106 C40 106 26 98 26 78 Z" fill="#38bdf8" stroke="#0284c7" stroke-width="4"/>
  <ellipse cx="52" cy="46" rx="12" ry="7" fill="#bae6fd" opacity="0.65"/>
  <circle cx="48" cy="68" r="6" fill="#0f172a"/>
  <circle cx="80" cy="68" r="6" fill="#0f172a"/>
  <circle cx="46" cy="66" r="2" fill="#ffffff"/>
  <circle cx="78" cy="66" r="2" fill="#ffffff"/>
  <path d="M54 82 Q64 90 74 82" stroke="#0f172a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
  <!-- Coroa de Mestre -->
  <polygon points="44,28 54,12 64,24 74,12 84,28" fill="#fbbf24" stroke="#b45309" stroke-width="2"/>
</svg>
`);

export const NPC_MERCHANT_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <ellipse cx="64" cy="108" rx="34" ry="10" fill="#000000" opacity="0.35"/>
  <path d="M28 80 C28 46 44 30 64 30 C84 30 100 46 100 80 C100 98 86 106 64 106 C42 106 28 98 28 80 Z" fill="#f59e0b" stroke="#b45309" stroke-width="4"/>
  <!-- Chapéu de Mercador -->
  <ellipse cx="64" cy="30" rx="38" ry="10" fill="#78350f"/>
  <path d="M42 30 L52 10 L76 10 L86 30 Z" fill="#92400e"/>
  <circle cx="50" cy="66" r="5.5" fill="#1e293b"/>
  <circle cx="78" cy="66" r="5.5" fill="#1e293b"/>
  <path d="M52 80 Q64 88 76 80" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>
`);

export const NPC_GUARD_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <ellipse cx="64" cy="108" rx="34" ry="10" fill="#000000" opacity="0.35"/>
  <path d="M28 80 C28 46 44 30 64 30 C84 30 100 46 100 80 C100 98 86 106 64 106 C42 106 28 98 28 80 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="4"/>
  <!-- Elmo Real Dourado -->
  <path d="M34 38 Q64 10 94 38 Z" fill="#fbbf24" stroke="#92400e" stroke-width="3"/>
  <rect x="58" y="8" width="12" height="18" rx="4" fill="#ef4444"/>
  <circle cx="50" cy="66" r="5.5" fill="#0f172a"/>
  <circle cx="78" cy="66" r="5.5" fill="#0f172a"/>
  <path d="M52 82 L76 82" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round"/>
</svg>
`);

export const NPC_ALCHEMIST_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <ellipse cx="64" cy="108" rx="34" ry="10" fill="#000000" opacity="0.35"/>
  <path d="M28 80 C28 46 44 30 64 30 C84 30 100 46 100 80 C100 98 86 106 64 106 C42 106 28 98 28 80 Z" fill="#a855f7" stroke="#6b21a8" stroke-width="4"/>
  <polygon points="36,34 64,4 92,34" fill="#4c1d95" stroke="#c084fc" stroke-width="2"/>
  <circle cx="50" cy="66" r="5.5" fill="#fef08a"/>
  <circle cx="78" cy="66" r="5.5" fill="#fef08a"/>
  <path d="M54 82 Q64 78 74 82" stroke="#fef08a" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>
`);

export const NPC_ORACLE_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <ellipse cx="64" cy="108" rx="34" ry="10" fill="#000000" opacity="0.35"/>
  <path d="M28 80 C28 46 44 30 64 30 C84 30 100 46 100 80 C100 98 86 106 64 106 C42 106 28 98 28 80 Z" fill="#ec4899" stroke="#9d174d" stroke-width="4"/>
  <circle cx="64" cy="18" r="10" fill="#fef08a" stroke="#f59e0b" stroke-width="2.5"/>
  <circle cx="50" cy="66" r="5.5" fill="#ffffff"/>
  <circle cx="78" cy="66" r="5.5" fill="#ffffff"/>
  <path d="M52 80 Q64 88 76 80" stroke="#ffffff" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>
`);

export const NPC_HOSTILE_SLIME_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <ellipse cx="64" cy="108" rx="36" ry="10" fill="#000000" opacity="0.4"/>
  <path d="M24 80 C24 44 42 26 64 26 C86 26 104 44 104 80 C104 100 88 106 64 106 C40 106 24 100 24 80 Z" fill="#ef4444" stroke="#991b1b" stroke-width="4"/>
  <path d="M40 54 L56 62" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
  <path d="M88 54 L72 62" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
  <circle cx="48" cy="66" r="6" fill="#fef08a"/>
  <circle cx="80" cy="66" r="6" fill="#fef08a"/>
  <path d="M48 86 Q64 76 80 86" stroke="#111827" stroke-width="4" fill="none" stroke-linecap="round"/>
</svg>
`);

export const STATION_INCUBATOR_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <ellipse cx="80" cy="140" rx="54" ry="14" fill="#000000" opacity="0.45"/>
  <rect x="34" y="88" width="92" height="46" rx="12" fill="#475569" stroke="#94a3b8" stroke-width="4"/>
  <path d="M40 90 C40 34 120 34 120 90 Z" fill="#38bdf8" fill-opacity="0.35" stroke="#7dd3fc" stroke-width="4"/>
  <ellipse cx="80" cy="78" rx="22" ry="28" fill="#fef08a" stroke="#f59e0b" stroke-width="3"/>
  <circle cx="72" cy="68" r="5" fill="#fde047"/>
</svg>
`);

export const TRANSPORT_DRAGON_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160">
  <polygon points="80,20 148,70 118,96 80,76 42,96 12,70" fill="#f59e0b" stroke="#b45309" stroke-width="4"/>
  <circle cx="80" cy="68" r="20" fill="#fbbf24" stroke="#92400e" stroke-width="3"/>
</svg>
`);

// ============================================================================
// SPRITES VISUAIS DE ITENS COLETÁVEIS NO MAPA (ERVAS, CRISTAIS, POÇÕES, BAÚS, GRIMÓRIOS)
// ============================================================================

export const ITEM_HERB_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="36" fill="#10b981" fill-opacity="0.25" stroke="#34d399" stroke-width="3"/>
  <path d="M48 76 L48 28" stroke="#065f46" stroke-width="5" stroke-linecap="round"/>
  <path d="M48 56 C24 52 22 30 44 34 C46 42 48 50 48 56 Z" fill="#22c55e" stroke="#ecfdf5" stroke-width="2.5"/>
  <path d="M48 48 C72 44 74 22 52 26 C50 34 48 42 48 48 Z" fill="#4ade80" stroke="#ecfdf5" stroke-width="2.5"/>
  <circle cx="48" cy="22" r="7" fill="#fef08a" stroke="#f59e0b" stroke-width="2"/>
</svg>
`);

export const ITEM_CRYSTAL_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="36" fill="#38bdf8" fill-opacity="0.25" stroke="#7dd3fc" stroke-width="3"/>
  <polygon points="48,14 70,42 58,78 38,78 26,42" fill="#06b6d4" stroke="#cffafe" stroke-width="3"/>
  <polygon points="48,14 58,78 38,78" fill="#67e8f9" opacity="0.55"/>
</svg>
`);

export const ITEM_BOOBLEROCK_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="36" fill="#a855f7" fill-opacity="0.25" stroke="#d8b4fe" stroke-width="3"/>
  <polygon points="24,68 32,28 56,22 74,44 68,72" fill="#7e22ce" stroke="#f3e8ff" stroke-width="3"/>
  <circle cx="44" cy="44" r="7" fill="#f472b6"/>
  <circle cx="58" cy="54" r="5" fill="#38bdf8"/>
</svg>
`);

export const ITEM_POTION_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="36" fill="#f59e0b" fill-opacity="0.25" stroke="#fde047" stroke-width="3"/>
  <rect x="40" y="16" width="16" height="12" rx="3" fill="#b45309" stroke="#fef3c7" stroke-width="2"/>
  <path d="M38 28 L58 28 L68 52 C70 66 60 78 48 78 C36 78 26 66 28 52 Z" fill="#fbbf24" stroke="#ffffff" stroke-width="3"/>
  <ellipse cx="44" cy="54" rx="7" ry="10" fill="#fef08a" opacity="0.7"/>
</svg>
`);

export const ITEM_GRIMOIRE_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <circle cx="48" cy="48" r="36" fill="#ec4899" fill-opacity="0.25" stroke="#f9a8d4" stroke-width="3"/>
  <rect x="26" y="20" width="44" height="56" rx="6" fill="#9d174d" stroke="#fbcfe8" stroke-width="3"/>
  <polygon points="48,32 53,43 65,44 56,52 58,64 48,57 38,64 40,52 31,44 43,43" fill="#fde047"/>
</svg>
`);

export const ITEM_CHEST_PNG = svgToDataUrl(`
<svg xmlns="http://www.w3.org/2000/svg" width="110" height="110" viewBox="0 0 110 110">
  <ellipse cx="55" cy="90" rx="38" ry="10" fill="#000000" opacity="0.4"/>
  <rect x="20" y="44" width="70" height="42" rx="8" fill="#b45309" stroke="#fef08a" stroke-width="4"/>
  <path d="M20 48 C20 26 90 26 90 48 Z" fill="#d97706" stroke="#fef08a" stroke-width="4"/>
  <rect x="47" y="42" width="16" height="20" rx="4" fill="#fbbf24" stroke="#5c2604" stroke-width="3"/>
</svg>
`);

/**
 * Marcadores dedicados para os 3 Sub-Biomas Extended (NPCs com Quests, Eventos, Lojas e Itens para Pegar no Chão)
 */
export function createExtendedNpcsAndQuestsMarkers(): MapMarker[] {
  return [
    // =========================================================================
    // SETOR EXTENDED 1: PRAÇA DAS GUILDAS & MERCADORES (sub_ext_praca_guildas)
    // =========================================================================
    {
      id: 'ext_npc_capitao_guarda',
      name: 'Capitão da Guarda Vael (Quest Caçada & Ordem Real)',
      description: 'Comandante da Guarda Real. Entrega a missão de Caçada Escalonada e ativa a bênção de defesa.',
      type: 'npc',
      color: '#3b82f6',
      status: 'active',
      x: 210,
      y: 260,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-npcs',
      customIconPng: NPC_GUARD_PNG,
      size: 118,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'spring',
      linkedQuestId: 'quest_cacada_encomenda',
      linkedObjectiveId: 'obj_hunt_talk_guard',
      npcPhrases: [
        'Soldado! Os Slimes invadiram o Bosque Alquímico!',
        'Toque em Aceitar para iniciar a Caçada Escalonada!',
        'Colete as relíquias pelo caminho e receba 400 XP + 200 Ouro!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Capitão da Guarda Vael',
      dialogueCharacterPng: NPC_GUARD_PNG,
      dialogueSteps: [
        {
          id: 'ext-vael-1',
          speaker: 'Capitão da Guarda Vael',
          text: 'Atenção, Herói! Precisamos proteger as rotas da Praça das Guildas. Aceite a missão "Caçada Escalonada" para liberar recompensas reais e derrotar os Slimes no setor ao lado!',
          playerResponses: [
            { id: 'r-accept', label: '🎯 Aceitar Missão & Evento!' },
            { id: 'r-later', label: 'Ver mochila antes' },
          ],
        },
      ],
      quest: {
        kind: 'collect',
        title: 'Suprimentos da Guarda Real',
        instructions: 'Colete 2x Erva Lunar no chão do mapa e traga ao Capitão Vael.',
        successMessage: 'Ordem cumprida com honra! Receba sua condecoração!',
        resourceName: 'Erva Lunar',
        iconEmoji: '🌿',
        requiredAmount: 2,
        currentAmount: 0,
      },
      events: [
        {
          id: 'evt-vael-reward',
          type: 'reward',
          title: 'Suprimento Inicial da Guarda',
          timing: 'simultaneous',
          trigger: 'contact',
          rewardSlots: ['🛡️', '🪙', '⚡', null, null, null],
        },
      ],
    },

    {
      id: 'ext_npc_viajante_orion',
      name: 'Mercador Viajante Orion (Quest Comércio & Escambo)',
      description: 'Mercador oficial de "Negócios com o Viajante". Permite aceitar quest comercial, negociar e coletar cristais.',
      type: 'npc',
      color: '#f59e0b',
      status: 'active',
      x: 540,
      y: 260,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-npcs',
      customIconPng: NPC_MERCHANT_PNG,
      size: 122,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'spring',
      shopId: 'shop_viajante_1',
      shopName: 'Empório do Viajante Orion',
      linkedQuestId: 'quest_negocios_viajante',
      npcPhrases: [
        'Negócios com o Viajante! Aceite minha Quest Principal!',
        'Pegue os Cristais e Minérios Booblerock espalhados no mapa!',
        'Tenho Elixires Solares e Relíquias para a sua jornada!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Mercador Viajante Orion',
      dialogueCharacterPng: NPC_MERCHANT_PNG,
      dialogueSteps: [
        {
          id: 'ext-orion-1',
          speaker: 'Mercador Viajante Orion',
          text: 'Bem-vindo ao Empório da Praça Extended! Ao aceitar minha missão "Negócios com o Viajante", você pode coletar Cristais e Booblerock aqui mesmo no chão do mapa para concluir seus objetivos!',
          playerResponses: [
            { id: 'r-accept-orion', label: '🎯 Aceitar Quest do Viajante!' },
            { id: 'r-shop-orion', label: '🛒 Negociar Suprimentos' },
          ],
        },
      ],
      quest: {
        kind: 'collect',
        title: 'Negócios com o Viajante (Cristais)',
        instructions: 'Colete 2x Cristal de Mercador espalhados pelo chão da fase.',
        successMessage: 'Excelente negócio! Aqui estão suas moedas e XP!',
        resourceName: 'Cristal de Mercador',
        iconEmoji: '💎',
        requiredAmount: 2,
        currentAmount: 0,
      },
    },

    {
      id: 'ext_npc_caravana_lyra',
      name: 'Chefe da Caravana Lyra (Quest Ramificada OR & Evento)',
      description: 'Líder da Caravana Comercial: oferece a missão com escolha de rota (Comércio OU Combate).',
      type: 'npc',
      color: '#10b981',
      status: 'active',
      x: 384,
      y: 540,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-npcs',
      customIconPng: NPC_ORACLE_PNG,
      size: 118,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'pulse_beat',
      linkedQuestId: 'quest_ramificada_caravana',
      linkedObjectiveId: 'obj_branch_choose_route',
      npcPhrases: [
        'Nossa caravana precisa escolher uma rota!',
        'Você prefere a Rota Comercial ou a Rota de Combate?',
        'Fale comigo para aceitar o Dilema da Caravana!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Chefe da Caravana Lyra',
      dialogueCharacterPng: NPC_ORACLE_PNG,
      dialogueSteps: [
        {
          id: 'ext-lyra-1',
          speaker: 'Chefe da Caravana Lyra',
          text: 'A estrada à frente divide-se em duas! Aceite a missão "Dilema da Caravana" e escolha entre reunir suprimentos comerciais ou derrotar os Slimes saqueadores!',
          playerResponses: [
            { id: 'r-lyra-accept', label: '🎯 Aceitar Dilema da Caravana!' },
            { id: 'r-lyra-event', label: '⚡ Ativar Bênção da Caravana' },
          ],
        },
      ],
      quest: {
        kind: 'talk',
        title: 'Aliança das Guildas',
        instructions: 'Converse com os mestres da Praça para firmar a aliança.',
        successMessage: 'A caravana está pronta para partir!',
        requiredCount: 1,
        currentAmount: 0,
      },
    },

    // Itens no chão no Setor 1 (Praça das Guildas) — Cada item some ao pegar e avança a Quest (1/2 -> 2/2)!
    {
      id: 'ext_item_cristal_1',
      name: 'Cristal de Mercador #1 (Pegar no Mapa)',
      description: 'Cristal reluzente usado na missão Negócios com o Viajante (1/2).',
      type: 'collectible',
      color: '#06b6d4',
      status: 'active',
      x: 384,
      y: 220,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-items',
      customIconPng: ITEM_CRYSTAL_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'gold',
      questResource: {
        id: 'item_cristal_mercador_a',
        name: 'Cristal de Mercador',
        iconEmoji: '💎',
        iconPng: ITEM_CRYSTAL_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'ext_item_cristal_2',
      name: 'Cristal de Mercador #2 (Pegar no Mapa)',
      description: 'Segundo Cristal de Mercador na Praça das Guildas (2/2).',
      type: 'collectible',
      color: '#06b6d4',
      status: 'active',
      x: 560,
      y: 390,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-items',
      customIconPng: ITEM_CRYSTAL_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'gold',
      questResource: {
        id: 'item_cristal_mercador_a',
        name: 'Cristal de Mercador',
        iconEmoji: '💎',
        iconPng: ITEM_CRYSTAL_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'ext_item_erva_1',
      name: 'Erva Lunar Fresca #1 (Pegar no Mapa)',
      description: 'Planta alquímica luminosa para a missão do Capitão Vael (1/2).',
      type: 'collectible',
      color: '#10b981',
      status: 'active',
      x: 160,
      y: 410,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-items',
      customIconPng: ITEM_HERB_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'flower',
      questResource: {
        id: 'item_erva_cura',
        name: 'Erva Lunar',
        iconEmoji: '🌿',
        iconPng: ITEM_HERB_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'ext_item_erva_2',
      name: 'Erva Lunar Fresca #2 (Pegar no Mapa)',
      description: 'Segunda planta de Erva Lunar na Praça das Guildas (2/2).',
      type: 'collectible',
      color: '#10b981',
      status: 'active',
      x: 230,
      y: 590,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-items',
      customIconPng: ITEM_HERB_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'flower',
      questResource: {
        id: 'item_erva_cura',
        name: 'Erva Lunar',
        iconEmoji: '🌿',
        iconPng: ITEM_HERB_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'ext_item_pocao_1',
      name: 'Elixir Solar Dourado (Pegar no Mapa)',
      description: 'Poção alquímica deixada na praça. Toque ou aproxime-se para guardar na Mochila!',
      type: 'collectible',
      color: '#f59e0b',
      status: 'active',
      x: 610,
      y: 540,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-items',
      customIconPng: ITEM_POTION_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'slime_water',
      questResource: {
        id: 'item_elixir_solar',
        name: 'Elixir Solar',
        iconEmoji: '🧪',
        iconPng: ITEM_POTION_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'ext_bau_praca_1',
      name: 'Baú Real da Guilda (Abrir Tesouro)',
      description: 'Baú recheado de moedas de ouro, gemas e equipamentos para o herói.',
      type: 'treasure',
      color: '#eab308',
      status: 'active',
      x: 384,
      y: 660,
      subBiomeId: 'sub_ext_praca_guildas',
      layerId: 'layer-items',
      customIconPng: ITEM_CHEST_PNG,
      size: 92,
      hasShadow: true,
      rewardSlots: ['🪙', '💎', '⚔️', '🧪', '📜', '👑'],
    },

    // =========================================================================
    // SETOR EXTENDED 2: BOSQUE ALQUÍMICO & COLETA (sub_ext_bosque_reliquias)
    // =========================================================================
    {
      id: 'ext_npc_alquimista_zephyr',
      name: 'Arquimago Alquimista Zephyr (Quest Alquimia & Chocadeira)',
      description: 'Mestre da Síntese Alquímica. Entrega a missão de Coleta Paralela e libera a Chocadeira.',
      type: 'npc',
      color: '#a855f7',
      status: 'active',
      x: 220,
      y: 250,
      subBiomeId: 'sub_ext_bosque_reliquias',
      layerId: 'layer-npcs',
      customIconPng: NPC_ALCHEMIST_PNG,
      size: 122,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'pulse_beat',
      linkedQuestId: 'quest_criacao_alquimista',
      npcPhrases: [
        'Colete Ervas Lunares e Minério Booblerock aqui no Bosque!',
        'Use a Chocadeira Mágica ao centro para criar um Slime Dourado!',
        'Aceite a Quest "Síntese Alquímica" falando comigo!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Arquimago Alquimista Zephyr',
      dialogueCharacterPng: NPC_ALCHEMIST_PNG,
      dialogueSteps: [
        {
          id: 'ext-zeph-1',
          speaker: 'Arquimago Alquimista Zephyr',
          text: 'Bem-vindo ao Bosque Alquímico! Ao redor de você há Ervas, Booblerocks e um Grimório Antigo no chão. Pegue-os e ative a Chocadeira Mágica para completar minha missão!',
          playerResponses: [
            { id: 'r-zeph-accept', label: '🎯 Aceitar Missão de Alquimia!' },
            { id: 'r-zeph-hatch', label: '🥚 Usar Chocadeira Mágica' },
          ],
        },
      ],
      quest: {
        kind: 'collect',
        title: 'Reagentes do Alquimista',
        instructions: 'Colete 2x Minério Booblerock espalhados no bosque.',
        successMessage: 'Maravilha! A transmutação alquímica foi um sucesso!',
        resourceName: 'Minério Booblerock',
        iconEmoji: '🔮',
        requiredAmount: 2,
        currentAmount: 0,
      },
    },

    {
      id: 'ext_station_chocadeira',
      name: 'Chocadeira & Forja Alquímica (6 Slots Interativos)',
      description: 'Toque ou aproxime-se para abrir a tela de síntese e chocar novos NPCs vivos no mapa!',
      type: 'interactive_screen',
      color: '#38bdf8',
      status: 'active',
      x: 384,
      y: 384,
      subBiomeId: 'sub_ext_bosque_reliquias',
      layerId: 'layer-stations',
      customIconPng: STATION_INCUBATOR_PNG,
      size: 138,
      hasShadow: true,
      linkedQuestId: 'quest_criacao_alquimista',
      stationConfig: {
        stationTitle: 'Chocadeira Alquímica do Bosque',
        stationSubtitle: 'Choque criaturas e conclua objetivos de criação em tempo real',
        stationType: 'incubator',
        baseAssetPng: STATION_INCUBATOR_PNG,
        baseAssetScale: 1.1,
        baseMotionEffect: 'jelly',
        baseMotionSpeed: 1.0,
        baseMotionIntensity: 0.8,
        slotsCount: 6,
        activationTrigger: 'both',
        triggerRadius: 95,
        processTimeSeconds: 4,
        processStatus: 'idle',
        resultAssetPng: HERO_AVATAR_PNG,
        resultAssetName: 'Slime Dourado Alquímico',
        resultMotionEffect: 'jelly',
        resultMessage: '✨ O Slime Dourado nasceu e atualizou sua Quest!',
        showResultOnMap: true,
        spawnNpcOnHatch: true,
        spawnNpcMovementType: 'wander',
        spawnNpcPatrolRadius: 120,
        spawnNpcHasDialogue: true,
        spawnNpcDialogue: 'Piu-Blub! Nasci no Bosque Extended!',
        slots: [
          { id: 's1', name: 'Slot Norte', offsetX: 0, offsetY: -50, scale: 0.55, currentAssetPng: HERO_AVATAR_PNG, currentAssetName: 'Ovo Celeste', resultAssetPng: HERO_AVATAR_PNG, resultAssetName: 'Slime Celeste' },
          { id: 's2', name: 'Slot Nordeste', offsetX: 44, offsetY: -24, scale: 0.55, currentAssetPng: NPC_HOSTILE_SLIME_PNG, currentAssetName: 'Ovo Rubro', resultAssetPng: NPC_HOSTILE_SLIME_PNG, resultAssetName: 'Slime Rubro' },
          { id: 's3', name: 'Slot Sudeste', offsetX: 44, offsetY: 24, scale: 0.55 },
          { id: 's4', name: 'Slot Sul', offsetX: 0, offsetY: 50, scale: 0.55 },
          { id: 's5', name: 'Slot Sudoeste', offsetX: -44, offsetY: 24, scale: 0.55 },
          { id: 's6', name: 'Slot Noroeste', offsetX: -44, offsetY: -24, scale: 0.55 },
        ],
      },
    },

    {
      id: 'ext_mob_slime_bosque',
      name: 'Slime Selvagem do Bosque (Action NPC & Quest)',
      description: 'Inimigo patrulheiro com diálogo de duelo e drop de Geleia Real.',
      type: 'npc',
      color: '#ef4444',
      status: 'active',
      x: 590,
      y: 260,
      subBiomeId: 'sub_ext_bosque_reliquias',
      layerId: 'layer-combat',
      customIconPng: NPC_HOSTILE_SLIME_PNG,
      size: 105,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'squash_intense',
      mobSpecies: 'slime_selvagem',
      npcPhrases: [
        'Blub! Quer duelar pelas relíquias do bosque?',
        'Se me vencer, sua Quest de Caçada avança!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Slime Selvagem do Bosque',
      dialogueCharacterPng: NPC_HOSTILE_SLIME_PNG,
      dialogueSteps: [
        {
          id: 'ext-slime-1',
          speaker: 'Slime Selvagem do Bosque',
          text: 'Blub-blub! Eu guardo os Minérios Booblerock deste bosque! Desafie-me para um duelo rápido para avançar sua Caçada Escalonada!',
          playerResponses: [
            { id: 'r-duel-slime', label: '⚔️ Vencer Duelo Agora!' },
            { id: 'r-spare-slime', label: 'Recuar em paz' },
          ],
        },
      ],
      quest: {
        kind: 'duel',
        title: 'Duelo no Bosque Alquímico',
        instructions: 'Vença o Slime Selvagem do Bosque.',
        successMessage: 'Slime derrotado! +Geleia Real adquirida!',
        requiredAmount: 1,
        currentAmount: 0,
      },
    },

    // Itens coletáveis espalhados pelo Setor 2 (Bosque)
    {
      id: 'ext_item_booblerock_1',
      name: 'Minério Booblerock Raro #1 (Pegar no Mapa)',
      description: 'Minério cristalino exigido pelo Alquimista Zephyr (1/2).',
      type: 'collectible',
      color: '#a855f7',
      status: 'active',
      x: 180,
      y: 520,
      subBiomeId: 'sub_ext_bosque_reliquias',
      layerId: 'layer-items',
      customIconPng: ITEM_BOOBLEROCK_PNG,
      size: 78,
      hasShadow: true,
      questResourceType: 'stone',
      questResource: {
        id: 'item_minerio_booblerock',
        name: 'Minério Booblerock',
        iconEmoji: '🔮',
        iconPng: ITEM_BOOBLEROCK_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'ext_item_booblerock_2',
      name: 'Minério Booblerock Raro #2 (Pegar no Mapa)',
      description: 'Segundo Minério Booblerock próximo à Chocadeira (2/2).',
      type: 'collectible',
      color: '#a855f7',
      status: 'active',
      x: 384,
      y: 590,
      subBiomeId: 'sub_ext_bosque_reliquias',
      layerId: 'layer-items',
      customIconPng: ITEM_BOOBLEROCK_PNG,
      size: 78,
      hasShadow: true,
      questResourceType: 'stone',
      questResource: {
        id: 'item_minerio_booblerock',
        name: 'Minério Booblerock',
        iconEmoji: '🔮',
        iconPng: ITEM_BOOBLEROCK_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'ext_item_grimorio_1',
      name: 'Grimório das Estrelas (Pegar Livro no Mapa)',
      description: 'Tomo arcano com páginas legíveis na tela de Desfoque de Lente da Mochila!',
      type: 'collectible',
      color: '#ec4899',
      status: 'active',
      x: 580,
      y: 540,
      subBiomeId: 'sub_ext_bosque_reliquias',
      layerId: 'layer-items',
      customIconPng: ITEM_GRIMOIRE_PNG,
      size: 80,
      hasShadow: true,
      questResourceType: 'flower',
      questResource: {
        id: 'item-grimoire-stars',
        name: 'Grimório das Estrelas',
        iconEmoji: '📕',
        iconPng: ITEM_GRIMOIRE_PNG,
      },
      questRequiredAmount: 1,
    },

    // =========================================================================
    // SETOR EXTENDED 3: ARENA DE EVENTOS & CHEFE (sub_ext_arena_eventos)
    // =========================================================================
    {
      id: 'ext_npc_oraculo_eventos',
      name: 'Oráculo Lumina (NPC de Eventos Cinemáticos & Clima)',
      description: 'Sacerdotisa dos Eventos: dispara foco cinemático no Chefe, mudança climática e bênção de diamantes.',
      type: 'npc',
      color: '#ec4899',
      status: 'active',
      x: 210,
      y: 384,
      subBiomeId: 'sub_ext_arena_eventos',
      layerId: 'layer-npcs',
      customIconPng: NPC_ORACLE_PNG,
      size: 120,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'spring',
      npcPhrases: [
        'Aproxime-se ou toque em mim para despertar os Eventos do Santuário!',
        'Posso invocar Câmera Cinemática, Clima Místico e Recompensas!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Oráculo dos Eventos Lumina',
      dialogueCharacterPng: NPC_ORACLE_PNG,
      dialogueSteps: [
        {
          id: 'ext-lumina-1',
          speaker: 'Oráculo dos Eventos Lumina',
          text: 'Viajante! Eu controlo os Eventos Dinâmicos desta Arena Extended. Aceite minha invocação para disparar a Câmera Cinemática rumo ao Rei Oberon e receber a Bênção Estelar!',
          playerResponses: [
            { id: 'r-lumina-evt', label: '⚡ Aceitar & Disparar Eventos!' },
            { id: 'r-lumina-close', label: 'Apenas explorar a arena' },
          ],
        },
      ],
      quest: {
        kind: 'discover',
        title: 'Despertar do Santuário Arcano',
        instructions: 'Ative o evento cinemático da Oráculo Lumina na Arena.',
        successMessage: 'Os astros abençoaram sua jornada!',
        requiredAmount: 1,
        currentAmount: 0,
      },
      events: [
        {
          id: 'ext-evt-cin',
          type: 'cinematic',
          title: 'Visão do Trono de Oberon',
          timing: 'sequential',
          trigger: 'contact',
          cinematicTargetType: 'marker',
          cinematicTargetMarkerId: 'ext_boss_oberon',
          cinematicZoom: 1.35,
          cinematicPanInDuration: 0.9,
          cinematicHoldDuration: 1.8,
          cinematicPanOutDuration: 0.9,
        },
        {
          id: 'ext-evt-rew',
          type: 'reward',
          title: 'Bênção do Oráculo',
          timing: 'simultaneous',
          trigger: 'contact',
          rewardSlots: ['💎', '⚡', '👑', null, null, null],
        },
      ],
    },

    {
      id: 'ext_boss_oberon',
      name: 'Rei Slime Ancestral Oberon (Boss & Quest Final)',
      description: 'Soberano da Arena Extended. Permite diálogo épico, aceite de desafio e duelo com recompensa.',
      type: 'boss',
      color: '#f43f5e',
      status: 'active',
      x: 540,
      y: 384,
      subBiomeId: 'sub_ext_arena_eventos',
      layerId: 'layer-combat',
      customIconPng: NPC_HOSTILE_SLIME_PNG,
      size: 148,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'pulse_beat',
      jellyIntensity: 1.35,
      mobSpecies: 'rei_slime_ancestral',
      linkedQuestId: 'quest_cacada_encomenda',
      linkedObjectiveId: 'obj_hunt_win_duel',
      npcPhrases: [
        'CONTEMPLEM O REI SLIME ANCESTRAL!',
        'Toque em mim ou aproxime-se para o Duelo Real!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Rei Slime Ancestral Oberon',
      dialogueCharacterPng: NPC_HOSTILE_SLIME_PNG,
      dialogueSteps: [
        {
          id: 'ext-boss-1',
          speaker: 'Rei Slime Ancestral Oberon',
          text: 'Você ousou entrar na Arena Extended do Santuário! Aceite o Duelo Supremo agora para provar sua força e conquistar o Baú Imperial!',
          playerResponses: [
            { id: 'r-boss-duel', label: '⚔️ Aceitar Duelo Supremo!' },
            { id: 'r-boss-wait', label: 'Preparar equipamento antes' },
          ],
        },
      ],
      quest: {
        kind: 'duel',
        title: 'Duelo contra o Rei Oberon',
        instructions: 'Vença o Rei Slime Ancestral Oberon na Arena Extended.',
        successMessage: 'Vitória Suprema! A Coroa Gelatinosa é sua!',
        requiredAmount: 1,
        currentAmount: 0,
      },
    },

    {
      id: 'ext_bau_supremo',
      name: 'Baú Imperial do Santuário (Tesouro Lendário)',
      description: 'Recompensa máxima da Arena Extended.',
      type: 'treasure',
      color: '#fbbf24',
      status: 'active',
      x: 540,
      y: 580,
      subBiomeId: 'sub_ext_arena_eventos',
      layerId: 'layer-items',
      customIconPng: ITEM_CHEST_PNG,
      size: 98,
      hasShadow: true,
      rewardSlots: ['👑', '💎', '⚔️', '🪙', '📕', '🧪'],
    },
  ];
}

export function createFaseMestraProject(): MapProject {
  const baseQuestsConfig = ensureProjectQuestsConfig(undefined);
  const defaultInvProj = DEFAULT_INVENTORY_PROJECTS[0];

  const verticalMarkers: MapMarker[] = [
    // --- BIOMA 1: FLORESTA ESMERALDA (Y: 0 a 768) ---
    {
      id: 'npc_cacador_floresta',
      name: 'Mestre Caçador Kael (Quest Caçada & Evento)',
      description: 'Guardião da Floresta que entrega a missão de Caçada Escalonada e concede suprimentos de exploração.',
      type: 'npc',
      color: '#22c55e',
      status: 'active',
      x: 240,
      y: 200,
      biomeId: 'bioma_floresta_esmeralda',
      layerId: 'layer-npcs',
      customIconPng: NPC_GUARD_PNG,
      size: 118,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'spring',
      jellyIntensity: 1.1,
      npcPhrases: [
        'Os Slimes Rubros estão agitados na floresta!',
        'Aproxime-se ou toque em mim para aceitar a Caçada!',
        'Pegue as Ervas Lunares e Cristais espalhados no chão!',
      ],
      linkedQuestId: 'quest_cacada_encomenda',
      linkedObjectiveId: 'obj_hunt_talk_guard',
      dialogueEnabled: true,
      dialogueCharacterName: 'Mestre Caçador Kael',
      dialogueCharacterPng: NPC_GUARD_PNG,
      dialogueSteps: [
        {
          id: 'kael-s1',
          speaker: 'Mestre Caçador Kael',
          text: 'Bem-vindo à Fase Mestra! Aqui na Floresta Esmeralda você pode aceitar missões, ativar eventos de recompensa e coletar Ervas Lunares, Poções e Cristais diretamente no mapa!',
          playerResponses: [
            { id: 'r1', label: '🎯 Aceitar Caçada & Evento!' },
            { id: 'r2', label: 'Explorar o mapa primeiro' },
          ],
        },
      ],
      quest: {
        kind: 'collect',
        title: 'Caçada & Coleta na Floresta',
        instructions: 'Colete 2x Erva Lunar no chão da Floresta Esmeralda ou derrote os Slimes.',
        successMessage: 'Excelente trabalho! Você dominou a Floresta Esmeralda!',
        resourceName: 'Erva Lunar',
        iconEmoji: '🌿',
        requiredAmount: 2,
        currentAmount: 0,
      },
      events: [
        {
          id: 'evt-kael-blessing',
          type: 'reward',
          title: 'Kit do Caçador Real',
          timing: 'simultaneous',
          trigger: 'contact',
          rewardSlots: ['🏹', '🧪', '🪙', null, null, null],
        },
      ],
    },

    // Inimigo Action NPC 1 (Com Diálogo de Duelo + Combate + Drop)
    {
      id: 'mob_slime_rubro_1',
      name: 'Slime Rubro Selvagem #1 (Action NPC)',
      description: 'Criatura hostil com IA sensorial, ataque salto/investida e drop automático de itens.',
      type: 'npc',
      color: '#ef4444',
      status: 'active',
      x: 520,
      y: 260,
      biomeId: 'bioma_floresta_esmeralda',
      layerId: 'layer-combat',
      customIconPng: NPC_HOSTILE_SLIME_PNG,
      size: 105,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'squash_intense',
      mobSpecies: 'slime_selvagem',
      npcPatrol: {
        enabled: true,
        preset: 'horizontal',
        walkStyle: 'slime_hop',
        speed: 2.5,
        distance: 110,
        pauseTime: 1.2,
        loop: true,
      },
      actionNpc: {
        enabled: true,
        role: 'hostile',
        detectionRadius: 130,
        sensoryRadius: 260,
        leashDistance: 320,
        moveSpeed: 80,
        locomotionStyle: 'slime_hop',
        health: 100,
        maxHealth: 100,
        retaliateOnHit: true,
        showAnimeEmotes: true,
        speechPhrases: ['Blub! Intruso na floresta!', 'Sinta o salto gelatinoso!', 'Grrr-slime!'],
        attacks: {
          jump: {
            enabled: true,
            damage: 12,
            cooldown: 3.0,
            jumpHeight: 65,
            impactRadius: 50,
          },
          dash: {
            enabled: true,
            damage: 15,
            cooldown: 4.0,
            dashDistance: 100,
          },
        },
        dropConfig: {
          enabled: true,
          intervalSec: 14,
          dropOnlyWhileMoving: true,
          maxItemsOnMap: 4,
          items: [
            { id: 'drop-gold', name: 'Moeda de Ouro', icon: '🪙', chancePercent: 60, amount: 5, type: 'gold' },
            { id: 'drop-gel', name: 'Geleia Real de Slime', icon: '🟢', chancePercent: 40, amount: 1, type: 'custom' },
          ],
        },
      },
    },

    // Inimigo Action NPC 2
    {
      id: 'mob_slime_rubro_2',
      name: 'Slime Guardião da Clareira #2 (Action NPC)',
      description: 'Guardião com disparo mágico à distância e patrulha.',
      type: 'npc',
      color: '#f97316',
      status: 'active',
      x: 230,
      y: 470,
      biomeId: 'bioma_floresta_esmeralda',
      layerId: 'layer-combat',
      customIconPng: NPC_HOSTILE_SLIME_PNG,
      size: 110,
      hasShadow: true,
      npcBounce: true,
      mobSpecies: 'slime_selvagem',
      actionNpc: {
        enabled: true,
        role: 'guardian',
        detectionRadius: 140,
        sensoryRadius: 280,
        leashDistance: 300,
        moveSpeed: 75,
        locomotionStyle: 'slime_hop',
        health: 120,
        maxHealth: 120,
        showAnimeEmotes: true,
        attacks: {
          ranged: {
            enabled: true,
            damage: 14,
            cooldown: 3.2,
            range: 220,
            projectileType: 'magic_orb',
            projectileSpeed: 220,
            projectileSize: 22,
          },
        },
      },
    },

    // Itens Coletáveis Visíveis no Bioma 1 (Com Sprites SVG nítidos para pegar no chão!)
    {
      id: 'marker_collect_herb_1',
      name: 'Erva Lunar Brilhante #1 (Pegar no Mapa)',
      description: 'Ingrediente alquímico coletável e armazenável para receitas e missões.',
      type: 'collectible',
      color: '#10b981',
      status: 'active',
      x: 384,
      y: 290,
      biomeId: 'bioma_floresta_esmeralda',
      layerId: 'layer-items',
      customIconPng: ITEM_HERB_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'flower',
      questResource: {
        id: 'item_erva_cura',
        name: 'Erva Lunar',
        iconEmoji: '🌿',
        iconPng: ITEM_HERB_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'marker_collect_herb_2',
      name: 'Erva Lunar Brilhante #2 (Pegar no Mapa)',
      description: 'Broto luminoso de Erva Lunar próximo à trilha da floresta.',
      type: 'collectible',
      color: '#10b981',
      status: 'active',
      x: 560,
      y: 490,
      biomeId: 'bioma_floresta_esmeralda',
      layerId: 'layer-items',
      customIconPng: ITEM_HERB_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'flower',
      questResource: {
        id: 'item_erva_cura',
        name: 'Erva Lunar',
        iconEmoji: '🌿',
        iconPng: ITEM_HERB_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'marker_collect_potion_1',
      name: 'Poção Solar da Clareira (Pegar no Mapa)',
      description: 'Elixir revigorante deixado por viajantes. Toque ou passe por cima para coletar!',
      type: 'collectible',
      color: '#f59e0b',
      status: 'active',
      x: 384,
      y: 560,
      biomeId: 'bioma_floresta_esmeralda',
      layerId: 'layer-items',
      customIconPng: ITEM_POTION_PNG,
      size: 74,
      hasShadow: true,
      questResourceType: 'slime_water',
      questResource: {
        id: 'item_elixir_solar',
        name: 'Elixir Solar',
        iconEmoji: '🧪',
        iconPng: ITEM_POTION_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'marker_treasure_chest_1',
      name: 'Baú Real da Floresta (Tesouro)',
      description: 'Contém Ouro, Gemas e a Espada Solar.',
      type: 'treasure',
      color: '#eab308',
      status: 'active',
      x: 150,
      y: 620,
      biomeId: 'bioma_floresta_esmeralda',
      layerId: 'layer-items',
      customIconPng: ITEM_CHEST_PNG,
      size: 92,
      hasShadow: true,
      rewardSlots: ['🪙', '💎', '⚔️', '🧪', '📜', '🗝️'],
    },

    // --- BIOMA 2: VILA MERCANTE & PRAÇA CENTRAL (Y: 768 a 1536) ---
    {
      id: 'npc_viajante_1',
      name: 'Viajante Mercador Orion (Loja & Quest V2)',
      description: 'Mercador oficial do Cenário 6 ("Negócios com o Viajante"): Compra, Venda e Escambo integrados ao motor de quests.',
      type: 'npc',
      color: '#f59e0b',
      status: 'active',
      x: 240,
      y: 960,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-npcs',
      customIconPng: NPC_MERCHANT_PNG,
      size: 124,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'spring',
      shopId: 'shop_viajante_1',
      shopName: 'Empório do Viajante Orion',
      linkedQuestId: 'quest_negocios_viajante',
      npcPhrases: [
        'Negócios com o Viajante! Compre, venda ou faça escambo!',
        'Pegue os Cristais de Mercador na praça para sua missão!',
        'Traga-me 1 Erva Lunar ou Cristais para recompensas épicas!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Viajante Mercador Orion',
      dialogueCharacterPng: NPC_MERCHANT_PNG,
      dialogueSteps: [
        {
          id: 'orion-1',
          speaker: 'Viajante Mercador Orion',
          text: 'Olá, aventureiro! Aceite minha missão "Negócios com o Viajante" para testar compra, venda, escambo e coleta de Cristais de Mercador aqui na Praça Central!',
          playerResponses: [
            { id: 'resp-quest', label: '🎯 Aceitar Quest do Viajante!' },
            { id: 'resp-shop', label: '🛒 Negociar no Empório' },
          ],
        },
      ],
      quest: {
        kind: 'collect',
        title: 'Encomenda do Viajante Orion',
        instructions: 'Colete 2x Cristal de Mercador na Vila Mercante.',
        successMessage: 'Trato fechado! Suas moedas de ouro e XP foram entregues!',
        resourceName: 'Cristal de Mercador',
        iconEmoji: '💎',
        requiredAmount: 2,
        currentAmount: 0,
      },
    },

    {
      id: 'npc_alquimista_zephyr',
      name: 'Arquimago Alquimista Zephyr (Quest Criação & Eventos)',
      description: 'Mestre da Criação para o Alquimista: guia o jogador no uso da Chocadeira e na coleta de Booblerock.',
      type: 'npc',
      color: '#a855f7',
      status: 'active',
      x: 540,
      y: 960,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-npcs',
      customIconPng: NPC_ALCHEMIST_PNG,
      size: 124,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'pulse_beat',
      linkedQuestId: 'quest_criacao_alquimista',
      npcPhrases: [
        'Use a Chocadeira Mágica ao centro da praça!',
        'Colete o Minério Booblerock e o Grimório das Estrelas!',
        'Toda criação dispara eventos em tempo real na sua Quest!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Alquimista Zephyr',
      dialogueCharacterPng: NPC_ALCHEMIST_PNG,
      dialogueSteps: [
        {
          id: 'zeph-1',
          speaker: 'Alquimista Zephyr',
          text: 'Saudações! Aceite a missão "Síntese Alquímica", colete os Minérios Booblerock na praça e use a Chocadeira Mágica logo abaixo para chocar criaturas vivas no mapa!',
          playerResponses: [
            { id: 'zeph-accept', label: '🎯 Aceitar Síntese Alquímica!' },
            { id: 'zeph-event', label: '⚡ Receber Catalisador Arcano' },
          ],
        },
      ],
      quest: {
        kind: 'collect',
        title: 'Síntese de Booblerock',
        instructions: 'Colete 2x Minério Booblerock para o Alquimista Zephyr.',
        successMessage: 'A Pedra Filosofal Slime brilha intensamente! Quest concluída!',
        resourceName: 'Minério Booblerock',
        iconEmoji: '🔮',
        requiredAmount: 2,
        currentAmount: 0,
      },
    },

    // Itens Coletáveis na Vila Mercante (Cristais, Booblerock e Grimório)
    {
      id: 'marker_collect_crystal_1',
      name: 'Cristal de Mercador #1 (Pegar no Mapa)',
      description: 'Gema comercial brilhante para a missão do Viajante Orion (1/2).',
      type: 'collectible',
      color: '#06b6d4',
      status: 'active',
      x: 180,
      y: 1130,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-items',
      customIconPng: ITEM_CRYSTAL_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'gold',
      questResource: {
        id: 'item_cristal_mercador_a',
        name: 'Cristal de Mercador',
        iconEmoji: '💎',
        iconPng: ITEM_CRYSTAL_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'marker_collect_crystal_2',
      name: 'Cristal de Mercador #2 (Pegar no Mapa)',
      description: 'Segunda gema comercial para a missão do Viajante Orion (2/2).',
      type: 'collectible',
      color: '#06b6d4',
      status: 'active',
      x: 310,
      y: 1210,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-items',
      customIconPng: ITEM_CRYSTAL_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'gold',
      questResource: {
        id: 'item_cristal_mercador_a',
        name: 'Cristal de Mercador',
        iconEmoji: '💎',
        iconPng: ITEM_CRYSTAL_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'marker_collect_booblerock_1',
      name: 'Minério Booblerock #1 (Pegar no Mapa)',
      description: 'Minério raro para a síntese do Alquimista Zephyr (1/2).',
      type: 'collectible',
      color: '#a855f7',
      status: 'active',
      x: 560,
      y: 1130,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-items',
      customIconPng: ITEM_BOOBLEROCK_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'stone',
      questResource: {
        id: 'item_minerio_booblerock',
        name: 'Minério Booblerock',
        iconEmoji: '🔮',
        iconPng: ITEM_BOOBLEROCK_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'marker_collect_booblerock_2',
      name: 'Minério Booblerock #2 (Pegar no Mapa)',
      description: 'Segundo fragmento de Booblerock para o Alquimista Zephyr (2/2).',
      type: 'collectible',
      color: '#a855f7',
      status: 'active',
      x: 640,
      y: 1240,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-items',
      customIconPng: ITEM_BOOBLEROCK_PNG,
      size: 76,
      hasShadow: true,
      questResourceType: 'stone',
      questResource: {
        id: 'item_minerio_booblerock',
        name: 'Minério Booblerock',
        iconEmoji: '🔮',
        iconPng: ITEM_BOOBLEROCK_PNG,
      },
      questRequiredAmount: 1,
    },
    {
      id: 'marker_collect_grimoire_1',
      name: 'Grimório das Estrelas (Pegar Livro no Mapa)',
      description: 'Livro mágico antigo. Colete-o e clique em "Saber mais" na Mochila para ler suas páginas!',
      type: 'collectible',
      color: '#ec4899',
      status: 'active',
      x: 220,
      y: 1350,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-items',
      customIconPng: ITEM_GRIMOIRE_PNG,
      size: 78,
      hasShadow: true,
      questResourceType: 'flower',
      questResource: {
        id: 'item-grimoire-stars',
        name: 'Grimório das Estrelas',
        iconEmoji: '📕',
        iconPng: ITEM_GRIMOIRE_PNG,
      },
      questRequiredAmount: 1,
    },

    // Estação Interativa Completa (Chocadeira / Incubadora Mágica com 6 Slots)
    {
      id: 'station_incubadora_central',
      name: 'Chocadeira & Forja Alquímica (Tela Interativa 6 Slots)',
      description: 'Estação interativa completa com 6 slots de ovos/ingredientes, temporizador e nascimento de NPC no mapa.',
      type: 'interactive_screen',
      color: '#38bdf8',
      status: 'active',
      x: 384,
      y: 1180,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-stations',
      customIconPng: STATION_INCUBATOR_PNG,
      size: 145,
      hasShadow: true,
      linkedQuestId: 'quest_criacao_alquimista',
      stationConfig: {
        stationTitle: 'Chocadeira & Síntese Alquímica Real',
        stationSubtitle: 'Coloque ovos ou reagentes nos slots para chocar criaturas vivas na Fase Mestra',
        stationType: 'incubator',
        baseAssetPng: STATION_INCUBATOR_PNG,
        baseAssetScale: 1.15,
        baseMotionEffect: 'jelly',
        baseMotionSpeed: 1.0,
        baseMotionIntensity: 0.8,
        slotsCount: 6,
        activationTrigger: 'both',
        triggerRadius: 95,
        processTimeSeconds: 5,
        processStatus: 'idle',
        resultAssetPng: HERO_AVATAR_PNG,
        resultAssetName: 'Slime Dourado Alquímico',
        resultMotionEffect: 'jelly',
        resultMessage: '✨ Crack! O Slime Dourado Alquímico nasceu e avançou sua Quest!',
        showResultOnMap: true,
        spawnNpcOnHatch: true,
        spawnNpcMovementType: 'wander',
        spawnNpcPatrolRadius: 140,
        spawnNpcHasDialogue: true,
        spawnNpcDialogue: 'Piu-Blub! Eu nasci na Chocadeira da Fase Mestra!',
        slots: [
          { id: 'slot-1', name: 'Slot Cristal Norte', offsetX: 0, offsetY: -52, scale: 0.55, currentAssetPng: HERO_AVATAR_PNG, currentAssetName: 'Ovo de Slime Celeste', resultAssetPng: HERO_AVATAR_PNG, resultAssetName: 'Slime Celeste' },
          { id: 'slot-2', name: 'Slot Chama Nordeste', offsetX: 46, offsetY: -26, scale: 0.55, currentAssetPng: NPC_HOSTILE_SLIME_PNG, currentAssetName: 'Ovo Rubro', resultAssetPng: NPC_HOSTILE_SLIME_PNG, resultAssetName: 'Slime Rubro Jr.' },
          { id: 'slot-3', name: 'Slot Ouro Sudeste', offsetX: 46, offsetY: 26, scale: 0.55 },
          { id: 'slot-4', name: 'Slot Éter Sul', offsetX: 0, offsetY: 52, scale: 0.55 },
          { id: 'slot-5', name: 'Slot Sombra Sudoeste', offsetX: -46, offsetY: 26, scale: 0.55 },
          { id: 'slot-6', name: 'Slot Brisa Noroeste', offsetX: -46, offsetY: -26, scale: 0.55 },
        ],
      },
    },

    // Portal de Viagem para o Sub-Bioma (Laboratório Secreto / Ruínas)
    {
      id: 'portal_lab_secreto',
      name: 'Portal para as Ruínas Arcanas',
      description: 'Teleporta o herói diretamente para o Santuário das Ruínas Arcanas.',
      type: 'travel',
      color: '#c084fc',
      status: 'active',
      x: 620,
      y: 1360,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-events',
      size: 105,
      hasShadow: true,
      travelTargetType: 'marker',
      targetTravelMarkerId: 'portal_ruinas_chegada',
      travelAuto: false,
    },

    // Luz Dinâmica na Praça da Vila
    {
      id: 'light_lanterna_praca',
      name: 'Farol Solar da Praça (Luz Dinâmica)',
      description: 'Emissor de iluminação volumétrica com efeito flicker de chama viva.',
      type: 'light',
      color: '#fbbf24',
      status: 'active',
      x: 384,
      y: 940,
      biomeId: 'bioma_vila_mercante',
      layerId: 'layer-events',
      size: 70,
      lightConfig: {
        preset: 'campfire',
        radius: 260,
        color: '#fbbf24',
        intensity: 0.85,
        flicker: true,
      },
    },

    // --- BIOMA 3: RUÍNAS ARCANAS & FORJA ETÉREA (Y: 1536 a 2304) ---
    {
      id: 'portal_ruinas_chegada',
      name: 'Altar de Chegada das Ruínas (Portal Retorno)',
      description: 'Ponto de conexão rápida de volta à Vila Mercante.',
      type: 'travel',
      color: '#818cf8',
      status: 'active',
      x: 620,
      y: 1660,
      biomeId: 'bioma_ruinas_arcanas',
      layerId: 'layer-events',
      size: 100,
      travelTargetType: 'marker',
      targetTravelMarkerId: 'portal_lab_secreto',
      travelAuto: false,
    },

    // NPC de Evento Cinemático & Missão no Santuário
    {
      id: 'event_zona_santuario_arcano',
      name: 'Oráculo Lumina do Santuário (NPC com Multi-Eventos)',
      description: 'Dispara câmera cinemática focando o Rei Oberon, bênção de diamantes e missão do santuário ao se aproximar ou tocar.',
      type: 'npc',
      color: '#a855f7',
      status: 'active',
      x: 384,
      y: 1770,
      biomeId: 'bioma_ruinas_arcanas',
      layerId: 'layer-events',
      customIconPng: NPC_ORACLE_PNG,
      size: 116,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'spring',
      npcPhrases: [
        'O Santuário Arcano desperta diante de você!',
        'Toque para aceitar o Evento Cinemático e a Bênção Real!',
      ],
      dialogueEnabled: true,
      dialogueCharacterName: 'Oráculo Lumina',
      dialogueCharacterPng: NPC_ORACLE_PNG,
      dialogueSteps: [
        {
          id: 'lumina-s1',
          speaker: 'Oráculo Lumina',
          text: 'Você alcançou as Ruínas Arcanas! Aceite o Evento do Santuário para revelar o Trono do Rei Oberon com câmera cinemática e receber Gemas Astrais!',
          playerResponses: [
            { id: 'lum-accept', label: '⚡ Aceitar Evento & Missão!' },
            { id: 'lum-skip', label: 'Seguir direto para o Trono' },
          ],
        },
      ],
      quest: {
        kind: 'discover',
        title: 'Despertar das Ruínas Arcanas',
        instructions: 'Receba a bênção da Oráculo Lumina no Santuário Arcano.',
        successMessage: 'Santuário desperto! As chamas violetas iluminam seu caminho!',
        requiredAmount: 1,
        currentAmount: 0,
      },
      events: [
        {
          id: 'evt-seq-1',
          type: 'cinematic',
          title: 'Foco Cinemático no Guardião Ancestral',
          timing: 'sequential',
          trigger: 'contact',
          cinematicTargetType: 'marker',
          cinematicTargetMarkerId: 'boss_oberon_ruinas',
          cinematicZoom: 1.35,
          cinematicPanInDuration: 1.0,
          cinematicHoldDuration: 2.0,
          cinematicPanOutDuration: 0.9,
        },
        {
          id: 'evt-seq-2',
          type: 'reward',
          title: 'Bênção do Santuário',
          timing: 'simultaneous',
          trigger: 'contact',
          rewardSlots: ['💎', '⚡', '👑', null, null, null],
        },
      ],
    },

    // Chefe Final / Boss com Duelo, Action NPC e Alta Recompensa
    {
      id: 'boss_oberon_ruinas',
      name: 'Rei Slime Ancestral Oberon (Boss Completo)',
      description: 'Chefe supremo da Fase Mestra com ataques combinados, emoções e diálogo épico.',
      type: 'boss',
      color: '#ec4899',
      status: 'active',
      x: 384,
      y: 2040,
      biomeId: 'bioma_ruinas_arcanas',
      layerId: 'layer-combat',
      customIconPng: NPC_HOSTILE_SLIME_PNG,
      size: 155,
      hasShadow: true,
      npcBounce: true,
      jellyStyle: 'pulse_beat',
      jellyIntensity: 1.4,
      mobSpecies: 'rei_slime_ancestral',
      linkedQuestId: 'quest_cacada_encomenda',
      linkedObjectiveId: 'obj_hunt_win_duel',
      dialogueEnabled: true,
      dialogueCharacterName: 'Rei Slime Ancestral Oberon',
      dialogueCharacterPng: NPC_HOSTILE_SLIME_PNG,
      dialogueSteps: [
        {
          id: 'boss-1',
          speaker: 'Rei Slime Ancestral Oberon',
          text: 'Você atravessou a Floresta Esmeralda, negociou na Vila Mercante e ativou a Chocadeira Mágica... Agora prove seu valor contra o soberano das Ruínas Arcanas!',
          playerResponses: [
            { id: 'b-fight', label: '⚔️ Iniciar Duelo Supremo!' },
            { id: 'b-wait', label: 'Preparar poções antes' },
          ],
        },
      ],
      actionNpc: {
        enabled: true,
        role: 'hostile',
        detectionRadius: 165,
        sensoryRadius: 320,
        leashDistance: 360,
        moveSpeed: 90,
        locomotionStyle: 'slime_hop',
        health: 250,
        maxHealth: 250,
        retaliateOnHit: true,
        showAnimeEmotes: true,
        speechPhrases: [
          'CONTEMPLEM A COROA GELATINOSA!',
          'O Santuário Arcano jamais cairá!',
          'Salto Meteoro Real!',
        ],
        attacks: {
          jump: {
            enabled: true,
            damage: 22,
            cooldown: 3.2,
            jumpHeight: 90,
            impactRadius: 75,
          },
          ranged: {
            enabled: true,
            damage: 18,
            cooldown: 2.8,
            range: 260,
            projectileType: 'energy_beam',
            projectileSpeed: 260,
            projectileSize: 28,
          },
          hackSlash: {
            enabled: true,
            damage: 20,
            cooldown: 2.0,
            range: 70,
            slashArc: 'wide',
          },
        },
      },
      quest: {
        kind: 'duel',
        title: 'Derrotar o Rei Slime Ancestral Oberon',
        instructions: 'Vença o duelo contra Oberon no coração das Ruínas Arcanas.',
        successMessage: 'Vitória Lendária! Você concluiu o desafio máximo da Fase Mestra!',
        requiredAmount: 1,
        currentAmount: 0,
      },
    },

    // Luz Arcana do Chefe
    {
      id: 'light_altar_oberon',
      name: 'Chama Violeta do Trono (Luz Arcana)',
      description: 'Iluminação mística pulsante sobre o trono das Ruínas.',
      type: 'light',
      color: '#c084fc',
      status: 'active',
      x: 384,
      y: 2040,
      biomeId: 'bioma_ruinas_arcanas',
      layerId: 'layer-events',
      size: 90,
      lightConfig: {
        preset: 'arcane',
        radius: 320,
        color: '#c084fc',
        intensity: 0.9,
        flicker: true,
      },
    },
  ];

  // Inclui também os marcadores Extended para que alternar para a aba Extended dentro da própria Fase Mestra tenha 100% dos NPCs e Quests
  const extendedMarkers = createExtendedNpcsAndQuestsMarkers();

  const project: MapProject = {
    id: FASE_MESTRA_ID,
    title: '👑 Fase Mestra (100% Completa - Todos os Sistemas)',
    description:
      'Fase Mestra de homologação contendo 100% das variáveis, biomas, sub-biomas Extended, NPCs com eventos/diálogos/quests, mercadores, chocadeira, itens coletáveis visíveis no mapa e quests V2.',
    canvasKind: 'vertical',
    mapWidth: 768,
    gridType: 'none',
    collisionGrid: 8,
    collisionMode: 'blockers',
    restrictPlayerToPaintedAreas: false,

    // 1. TRÊS BIOMAS COMPLETOS COM CLIMA, VELOCIDADE E ZOOM PRÓPRIOS
    biomes: [
      {
        id: 'bioma_floresta_esmeralda',
        name: '1. Floresta Esmeralda (Coleta, Spawn Natural & Caçada)',
        tilePng: BIOME_FOREST_PNG,
        tileWidth: 768,
        tileHeight: 256,
        tileRepeatCount: 3,
        transitionBlendRows: 2,
        baseColor: '#15803d',
        biomeEvent: 'leaves',
        biomeEvents: ['leaves', 'bugs', 'ants'],
        walkSpeed: 1.0,
        playerScale: 1.0,
        cameraZoom: 1.0,
      },
      {
        id: 'bioma_vila_mercante',
        name: '2. Vila Mercante & Praça Central (Comércio, Viajantes & Chocadeira)',
        tilePng: BIOME_VILLAGE_PNG,
        tileWidth: 768,
        tileHeight: 256,
        tileRepeatCount: 3,
        transitionBlendRows: 2,
        baseColor: '#b45309',
        biomeEvent: 'dawn',
        biomeEvents: ['dawn', 'wind'],
        walkSpeed: 1.1,
        playerScale: 1.05,
        cameraZoom: 1.05,
      },
      {
        id: 'bioma_ruinas_arcanas',
        name: '3. Ruínas Arcanas & Forja Etérea (Chefes, Portais & Eventos)',
        tilePng: BIOME_RUINS_PNG,
        tileWidth: 768,
        tileHeight: 256,
        tileRepeatCount: 3,
        transitionBlendRows: 2,
        baseColor: '#6b21a8',
        biomeEvent: 'night',
        biomeEvents: ['night', 'rain'],
        walkSpeed: 0.95,
        playerScale: 1.0,
        cameraZoom: 1.12,
      },
    ],

    // 2. TRÊS SUB-BIOMAS EXTENDED COMPLETOS FOCADOS EM NPCS, QUESTS, EVENTOS E ITENS NO MAPA
    subBiomes: [
      {
        id: 'sub_ext_praca_guildas',
        name: '1. Praça das Guildas & Mercadores (NPCs, Quests & Comércio)',
        description: 'Setor Extended focado em NPCs com Quests Principais, Tarefas, Diálogos, Eventos e Itens para pegar no chão.',
        tilePng: EXTENDED_GUILD_PLAZA_PNG,
        tileWidth: 768,
        tileHeight: 768,
        baseColor: '#15803d',
        parentBiomeId: 'bioma_vila_mercante',
        biomeEvent: 'dawn',
        biomeEvents: ['dawn', 'leaves'],
        walkSpeed: 1.05,
        playerScale: 1.05,
        cameraZoom: 1.0,
        walkableCells: [],
        blockedCells: [],
      },
      {
        id: 'sub_ext_bosque_reliquias',
        name: '2. Bosque Alquímico & Coleta de Relíquias (Chocadeira & Coletáveis)',
        description: 'Setor Extended com Alquimista Zephyr, Chocadeira de 6 Slots, Slime de Duelo e múltiplos recursos no chão.',
        tilePng: EXTENDED_RELIC_GROVE_PNG,
        tileWidth: 768,
        tileHeight: 768,
        baseColor: '#065f46',
        parentBiomeId: 'bioma_floresta_esmeralda',
        biomeEvent: 'leaves',
        biomeEvents: ['leaves', 'bugs'],
        walkSpeed: 1.05,
        playerScale: 1.05,
        cameraZoom: 1.0,
        walkableCells: [],
        blockedCells: [],
      },
      {
        id: 'sub_ext_arena_eventos',
        name: '3. Santuário de Eventos & Arena de Oberon (Cinemática & Boss)',
        description: 'Setor Extended focado em Eventos Cinemáticos, Bênçãos e o Duelo Supremo contra o Rei Slime Oberon.',
        tilePng: EXTENDED_EVENT_ARENA_PNG,
        tileWidth: 768,
        tileHeight: 768,
        baseColor: '#4c1d95',
        parentBiomeId: 'bioma_ruinas_arcanas',
        biomeEvent: 'night',
        biomeEvents: ['night', 'wind'],
        walkSpeed: 1.0,
        playerScale: 1.05,
        cameraZoom: 1.05,
        walkableCells: [],
        blockedCells: [],
      },
    ],

    // 3. CAMADAS DE MARCADORES ORGANIZADAS
    markerLayers: [
      { id: 'layer-npcs', name: 'NPCs, Mercadores & Quests', visible: true, order: 1, color: '#f59e0b' },
      { id: 'layer-combat', name: 'Inimigos & Action NPCs', visible: true, order: 2, color: '#ef4444' },
      { id: 'layer-stations', name: 'Estações Interativas (Chocadeira & Forja)', visible: true, order: 3, color: '#38bdf8' },
      { id: 'layer-items', name: 'Itens Coletáveis & Baús', visible: true, order: 4, color: '#10b981' },
      { id: 'layer-events', name: 'Eventos, Luzes, Portais & Zonas', visible: true, order: 5, color: '#a855f7' },
    ],
    activeMarkerLayerId: 'layer-npcs',

    // 4. TODOS OS MARCADORES (VERTICAIS + EXTENDED)
    markers: [...verticalMarkers, ...extendedMarkers],

    // 5. ROTAS CONECTADAS ENTRE OS MARCADORES DA FASE
    routes: [
      {
        id: 'route-jornada-mestra',
        name: 'Trilha Real da Fase Mestra',
        color: '#fbbf24',
        style: 'glowing',
        markerIds: [
          'npc_cacador_floresta',
          'npc_viajante_1',
          'station_incubadora_central',
          'event_zona_santuario_arcano',
          'boss_oberon_ruinas',
        ],
        isAnimated: true,
        notes: 'Rota principal conectando todos os setores de teste da Fase Mestra.',
      },
    ],

    // 6. JOGADOR PRINCIPAL COM TODOS OS ATRIBUTOS, CRESCIMENTO DE XP E MOCHILA
    player: {
      ...(DEFAULT_CHARACTERS[0] || {}),
      id: 'char_hero_legendary',
      characterId: 'char_hero_legendary',
      name: 'Aurelius (Herói Mestre)',
      description: 'Herói completo com curva de crescimento XP, atributos escaláveis, 35 slots de mochila e física Spring Jelly.',
      role: 'Paladino Alquímico',
      x: 384,
      y: 120,
      avatarPng: HERO_AVATAR_PNG,
      scale: 1.15,
      autoBounce: true,
      jellyStyle: 'spring',
      jellyIntensity: 1.1,
      jellyIdleIntensity: 0.4,
      jellySpeed: 1.1,
      showNameTag: true,
      color: '#38bdf8',
      speed: 4.5,
      defaultInventorySlots: 35,
      defaultCurrencies: { gold: 500, gems: 45 },
      currentLevel: 1,
      currentXp: 0,
      totalCumulativeXp: 0,
      stats: {
        hp: 150,
        maxHp: 150,
        mp: 80,
        maxMp: 80,
        attack: 24,
        defense: 14,
        speed: 5,
        magic: 20,
      },
    },

    // 7. SISTEMA DE SPAWN CINEMÁTICO COMPLETO
    spawnConfig: {
      enabled: true,
      targetX: 384,
      targetY: 140,
      targetMarkerId: 'npc_cacador_floresta',
      transportPng: TRANSPORT_DRAGON_PNG,
      transportName: 'Fênix Dourada Imperial',
      transportScale: 1.25,
      entryDirection: 'top',
      speed: 1.3,
      landingPause: 0.6,
      effect: 'jelly',
      effectIntensity: 0.7,
      effectSpeed: 1.2,
      cameraFraming: 'center',
      hidePlayerDuringTransit: true,
      anchorMode: 'hover',
      offsetY: -20,
      fadeTransition: true,
      fadeColor: '#000000',
    },

    // 8. ATMOSFERA & CLIMA COMPLETOS
    clouds: {
      enabled: true,
      cloudCount: 8,
      edgeOpacity: 0.45,
      centerTransparency: 0.85,
      speed: 28,
      showTopClouds: true,
      showGroundFog: true,
      fogIntensity: 0.2,
      baseCloudScale: 110,
      randomScalePercent: 50,
    },
    fogConfig: {
      enabled: true,
      fogCount: 5,
      opacity: 0.18,
      speed: 32,
      tintColor: '#a7f3d0',
      groundLevelPercent: 55,
    },
    leavesConfig: {
      enabled: true,
      preset: 'autumn',
      leafCount: 22,
      baseSize: 32,
      randomScalePercent: 55,
      speed: 4.2,
      opacity: 0.9,
    },
    rainConfig: {
      enabled: false,
      intensity: 38,
      splashCount: 20,
      splashSize: 24,
      speed: 0.5,
      puddlesEnabled: true,
      puddleSplashes: true,
    },
    windConfig: {
      enabled: true,
      gustCount: 6,
      speed: 4.5,
      curvature: 30,
      opacity: 0.32,
      color: '#e0f2fe',
    },
    bugsConfig: {
      enabled: true,
      preset: 'all',
      activeSpecies: ['fireflies', 'butterflies'],
      bugCount: 16,
      size: 15,
      speed: 3.2,
      landOnPlayer: true,
      wingFlapSpeed: 0.08,
    },
    antsConfig: {
      enabled: true,
      antCount: 28,
      soloCount: 8,
      leafScale: 1.5,
      leafChance: 0.55,
      trailNetwork: 'loops',
      size: 10,
      speed: 1.2,
      scatterRadius: 65,
      trailPattern: 'wavy',
    },
    snowConfig: {
      enabled: false,
      density: 5,
      speed: 3.0,
      windDrift: 12,
      accumulateOnPlayer: true,
      accumulateOnAssets: true,
      accumulateOnGround: false,
      footstepTracks: true,
      chromaticSparkle: true,
    },
    lighting: {
      enabled: true,
      nightEnabled: false,
      darknessOpacity: 0.35,
      ambientDarkness: 0.35,
      ambientColor: '#090d16',
      showVignette: true,
      heroTorchEnabled: true,
      heroTorchRadius: 210,
      heroTorchColor: '#fde047',
      heroTorchIntensity: 0.85,
      flickerStyle: 'flame',
      threeLayerRender: true,
      lightBloom: 0.7,
    },

    // 9. TRAÇOS DE EFEITO VISUAL
    motionOverlays: [
      {
        id: 'vfx-fireflies-forest',
        name: 'Brilho de Vagalumes na Clareira',
        effect: 'fireflies',
        brushSize: 42,
        scale: 1.1,
        speed: 1.2,
        intensity: 1.1,
        visible: true,
        points: [
          { x: 220, y: 220 },
          { x: 300, y: 240 },
          { x: 380, y: 220 },
          { x: 460, y: 250 },
        ],
      },
      {
        id: 'vfx-glow-incubator',
        name: 'Aura Dourada da Chocadeira',
        effect: 'glitter',
        brushSize: 54,
        scale: 1.2,
        speed: 1.0,
        intensity: 1.3,
        visible: true,
        points: [
          { x: 340, y: 1180 },
          { x: 384, y: 1160 },
          { x: 428, y: 1180 },
        ],
      },
      {
        id: 'vfx-sparks-ruins',
        name: 'Centelhas Arcanas do Santuário',
        effect: 'sparks',
        brushSize: 48,
        scale: 1.2,
        speed: 1.4,
        intensity: 1.4,
        visible: true,
        points: [
          { x: 320, y: 2020 },
          { x: 384, y: 2040 },
          { x: 448, y: 2020 },
        ],
      },
    ],

    // 10. BIBLIOTECA DE ASSETS
    galleryAssets: [
      {
        id: 'asset-mestre-heroi',
        name: 'Slime Paladino Real',
        dataUrl: HERO_AVATAR_PNG,
        width: 128,
        height: 128,
        category: 'Personagens',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-mestre-mercador',
        name: 'Mercador Viajante Orion',
        dataUrl: NPC_MERCHANT_PNG,
        width: 128,
        height: 128,
        category: 'NPCs & Lojas',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-mestre-guarda',
        name: 'Capitão da Guarda Vael',
        dataUrl: NPC_GUARD_PNG,
        width: 128,
        height: 128,
        category: 'NPCs & Lojas',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-mestre-alquimista',
        name: 'Arquimago Alquimista Zephyr',
        dataUrl: NPC_ALCHEMIST_PNG,
        width: 128,
        height: 128,
        category: 'NPCs & Lojas',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-mestre-oraculo',
        name: 'Oráculo dos Eventos Lumina',
        dataUrl: NPC_ORACLE_PNG,
        width: 128,
        height: 128,
        category: 'NPCs & Lojas',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-mestre-slime-hostil',
        name: 'Slime Rubro de Combate',
        dataUrl: NPC_HOSTILE_SLIME_PNG,
        width: 128,
        height: 128,
        category: 'Inimigos',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-mestre-chocadeira',
        name: 'Chocadeira Alquímica 6 Slots',
        dataUrl: STATION_INCUBATOR_PNG,
        width: 160,
        height: 160,
        category: 'Estações Interativas',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-item-erva',
        name: 'Erva Lunar Brilhante',
        dataUrl: ITEM_HERB_PNG,
        width: 96,
        height: 96,
        category: 'Itens & Relíquias',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-item-cristal',
        name: 'Cristal de Mercador',
        dataUrl: ITEM_CRYSTAL_PNG,
        width: 96,
        height: 96,
        category: 'Itens & Relíquias',
        isPersistentPhaseAsset: true,
      },
      {
        id: 'asset-item-booblerock',
        name: 'Minério Booblerock',
        dataUrl: ITEM_BOOBLEROCK_PNG,
        width: 96,
        height: 96,
        category: 'Itens & Relíquias',
        isPersistentPhaseAsset: true,
      },
    ],
    galleryCategories: ['Geral', 'Personagens', 'NPCs & Lojas', 'Inimigos', 'Estações Interativas', 'Itens & Relíquias'],

    // 11. INVENTÁRIO COMPLETO, CATÁLOGO DE ITENS E PROJETOS DE INVENTÁRIO
    itemCatalog: DEFAULT_ITEM_CATALOG.map((it, idx) => ({
      ...it,
      naturalBiomeSpawn: {
        enabled: idx < 3,
        biomeIds: ['bioma_floresta_esmeralda', 'bioma_vila_mercante'],
        spawnDensityPerBiome: 4,
        spawnChancePercent: 85,
        avoidPaths: false,
        minDistanceBetweenSpawns: 48,
      },
    })),
    playerInventory: {
      enabled: true,
      maxSlots: 35,
      columns: 5,
      currencies: {
        gold: 500,
        gems: 45,
      },
      items: defaultInvProj.playerInventory.items,
    },
    savedInventoryProjects: [
      {
        ...defaultInvProj,
        name: 'Inventário Mestre (Completo)',
        description: 'Projeto de inventário vinculado à Fase Mestra com todas as tags de estado, moedas e spawn natural.',
      },
    ],
    activeInventoryProjectId: defaultInvProj.id,

    // 12. ROSTER DE PERSONAGENS VINCULADO
    savedCharacters: DEFAULT_CHARACTERS,
    activeCharacterId: DEFAULT_CHARACTERS[0]?.id || 'char_hero_legendary',

    // 13. MOTOR CENTRAL DE QUESTS V2, LOJAS E PROGRESSÃO GLOBAL
    questsConfig: baseQuestsConfig,

    // 14. DIÁLOGOS SALVOS COMPLETOS
    savedDialogues: [
      {
        id: 'dialogue-mestre-boas-vindas',
        name: 'Guia da Fase Mestra (100% Completa)',
        speaker: 'Mestre Caçador Kael',
        characterPng: NPC_GUARD_PNG,
        steps: [
          {
            id: 'dm-1',
            speaker: 'Mestre Caçador Kael',
            text: 'Bem-vindo à Fase Mestra! Aqui estão reunidas 100% das ferramentas e variáveis da engine em um único mapa.',
            playerResponses: [
              { id: 'r1', label: '🎯 Aceitar Missão & Explorar' },
              { id: 'r2', label: 'Abrir Mochila e Missões' },
            ],
          },
        ],
        endEvent: { kind: 'none' },
      },
    ],
  };

  project.screensConfig = getOrCreateScreensConfig(project);
  const worldMap = getOrCreateWorldMapConfig(project);
  worldMap.title = 'Mapa Global de Slimelands (Conectado à Fase Mestra)';
  worldMap.pointsOfInterest = worldMap.pointsOfInterest.map((poi, idx) =>
    idx === 0
      ? {
          ...poi,
          name: '👑 Fase Mestra (Capital Real)',
          targetLevelId: FASE_MESTRA_ID,
          targetLevelName: project.title,
          status: 'unlocked',
          badgeText: '100% Completa',
          recommendedLevel: 1,
          starsCount: 3,
        }
      : idx === 1
      ? {
          ...poi,
          name: '💜 Vila Extended (NPCs & Quests)',
          targetLevelId: FASE_MESTRA_EXTENDED_ID,
          targetLevelName: '💜 Fase Extended: NPCs, Quests & Coleta',
          status: 'unlocked',
          badgeText: 'Extended Quests',
          recommendedLevel: 1,
          starsCount: 3,
        }
      : poi
  );
  project.worldMap = worldMap;
  project.savedWorldMaps = [worldMap];
  project.activeWorldMapId = worldMap.id || 'map-main-default';

  return project;
}

/**
 * Cria a Fase Extended dedicada focada em NPCs com Quests, Diálogos, Eventos e Itens Coletáveis no Mapa
 */
export function createFaseMestraExtendedProject(): MapProject {
  const base = createFaseMestraProject();
  const extendedMarkers = createExtendedNpcsAndQuestsMarkers();

  const extProject: MapProject = {
    ...base,
    id: FASE_MESTRA_EXTENDED_ID,
    title: '💜 Fase Extended: NPCs, Quests, Eventos & Coleta',
    description:
      'Tela Extended horizontal completa focada em NPCs interativos com Diálogos, Aceitação de Quests (Jornada e Tarefas), Eventos Cinemáticos/Recompensas, Chocadeira e Itens espalhados pelo mapa para pegar.',
    canvasKind: 'extended',
    biomes: [],
    markers: extendedMarkers,
    player: {
      ...base.player!,
      x: 384,
      y: 384,
    },
    spawnConfig: {
      ...base.spawnConfig!,
      enabled: false,
      targetX: 384,
      targetY: 384,
      targetMarkerId: 'ext_npc_capitao_guarda',
    },
  };

  extProject.screensConfig = getOrCreateScreensConfig(extProject);
  return extProject;
}

export function createFaseMestraSavedLevel(): SavedLevel {
  const projectData = createFaseMestraProject();
  const nowIso = new Date().toISOString();
  return {
    id: FASE_MESTRA_ID,
    name: '👑 Fase Mestra (100% Completa)',
    description:
      'Fase completa de teste com 100% das variáveis: 3 Biomas, Sub-Biomas, Action NPCs, Loja/Escambo do Viajante, Chocadeira 6 Slots, Eventos Cinemáticos, Itens no Mapa e Quests V2.',
    createdAt: nowIso,
    updatedAt: nowIso,
    projectData,
    thumbnailPng: BIOME_VILLAGE_PNG,
    stats: computeLevelStats(projectData),
  };
}

export function createFaseMestraExtendedSavedLevel(): SavedLevel {
  const projectData = createFaseMestraExtendedProject();
  const nowIso = new Date().toISOString();
  return {
    id: FASE_MESTRA_EXTENDED_ID,
    name: '💜 Extended: NPCs, Quests & Coleta',
    description:
      'Tela Extended focada em NPCs com Diálogos, Aceitação de Quests e Eventos, Comércio, Chocadeira e Itens no Mapa para pegar.',
    createdAt: nowIso,
    updatedAt: nowIso,
    projectData,
    thumbnailPng: EXTENDED_GUILD_PLAZA_PNG,
    stats: computeLevelStats(projectData),
  };
}
