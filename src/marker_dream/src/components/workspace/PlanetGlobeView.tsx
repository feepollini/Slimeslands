import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import type {
  MapProject,
  PlanetGlobeConfig,
  PlanetGlobeMarker,
  PlanetUvTextureItem,
  ConstellationSystemNode,
  SolarSystemPlanet,
  SolarSystemMoon,
  WorldMapConfig,
} from '../../types/map';
import {
  Globe,
  Sparkles,
  Plus,
  Trash2,
  MapPin,
  Upload,
  ChevronRight,
  Navigation,
  ExternalLink,
  Layers,
  Image as ImageIcon,
  Check,
  Wand2,
} from 'lucide-react';
import { OrnateMapMarkerPin } from './OrnateMapMarkerPin';

export const DEFAULT_PLANET_IMAGE_URL =
  '/assets/aistudio/Planeta_ilustrado_com_fundo_transparente_d21f7d80.png';

/**
 * Generates seamless 2:1 Equirectangular UV planet textures in memory (512x256)
 * so all 40 planets/moons across the 6 Solar Systems spin in 360° 3D right out of the box,
 * and can be customized with the user's uploaded 2:1 rectangular UV textures!
 */
const generatedUvDataUrlCache = new Map<string, string>();

export function getBuiltInUv2to1DataUrl(
  presetKey: string,
  primaryHex: string,
  secondaryHex: string,
  bandHex: string
): string {
  const cacheKey = `${presetKey}-${primaryHex}-${secondaryHex}-${bandHex}`;
  const existing = generatedUvDataUrlCache.get(cacheKey);
  if (existing) return existing;
  if (typeof document === 'undefined') return '';

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const baseGrad = ctx.createLinearGradient(0, 0, 0, 256);
  baseGrad.addColorStop(0, secondaryHex);
  baseGrad.addColorStop(0.22, primaryHex);
  baseGrad.addColorStop(0.5, bandHex);
  baseGrad.addColorStop(0.78, primaryHex);
  baseGrad.addColorStop(1, secondaryHex);
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, 512, 256);

  let seed = 1337;
  for (let i = 0; i < cacheKey.length; i++) {
    seed = (seed * 33 + cacheKey.charCodeAt(i)) % 999983;
  }
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let b = 0; b < 14; b++) {
    const yCenter = 20 + rand() * 216;
    const bandH = 6 + rand() * 22;
    const amp = 4 + rand() * 14;
    const freq = 1 + Math.floor(rand() * 4);
    const phase = rand() * Math.PI * 2;

    ctx.save();
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 8) {
      const theta = (x / 512) * Math.PI * 2 * freq + phase;
      const y = yCenter + Math.sin(theta) * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = 512; x >= 0; x -= 8) {
      const theta = (x / 512) * Math.PI * 2 * freq + phase;
      const y = yCenter + Math.sin(theta) * amp + bandH;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = b % 2 === 0 ? secondaryHex : bandHex;
    ctx.globalAlpha = 0.24 + rand() * 0.25;
    ctx.fill();
    ctx.restore();
  }

  for (let c = 0; c < 22; c++) {
    const cx = rand() * 512;
    const cy = 36 + rand() * 184;
    const rx = 18 + rand() * 48;
    const ry = 10 + rand() * 28;
    const color = c % 3 === 0 ? bandHex : c % 3 === 1 ? secondaryHex : '#fffbeb';
    const alpha = 0.22 + rand() * 0.32;

    [-512, 0, 512].forEach((offsetX) => {
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(cx + offsetX, cy, rx, ry, (rand() - 0.5) * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.restore();
    });
  }

  const northCap = ctx.createLinearGradient(0, 0, 0, 28);
  northCap.addColorStop(0, 'rgba(255,255,255,0.65)');
  northCap.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = northCap;
  ctx.fillRect(0, 0, 512, 28);

  const southCap = ctx.createLinearGradient(0, 228, 0, 256);
  southCap.addColorStop(0, 'rgba(255,255,255,0)');
  southCap.addColorStop(1, 'rgba(255,255,255,0.65)');
  ctx.fillStyle = southCap;
  ctx.fillRect(0, 228, 512, 28);

  const url = canvas.toDataURL('image/png');
  generatedUvDataUrlCache.set(cacheKey, url);
  return url;
}

export const OFFICIAL_40_UV_TEXTURES: PlanetUvTextureItem[] = Array.from({ length: 40 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return {
    id: `uv-planet-${num}`,
    name: `Textura UV ${num}`,
    url: `/assets/planets/uv/UV_${num}.png`,
    accentColor: '#38bdf8',
  };
});

export function getDefaultUvTextureLibrary(): PlanetUvTextureItem[] {
  return OFFICIAL_40_UV_TEXTURES;
}

export function buildDefaultMarkersForPlanet(
  planetId: string,
  planetName: string,
  project: MapProject
): PlanetGlobeMarker[] {
  const savedMaps = project.savedWorldMaps || [];
  const mainMapId =
    project.worldMap?.id || savedMaps[0]?.id || 'world-map-main';
  const secondMapId = savedMaps[1]?.id || mainMapId;
  const thirdMapId = savedMaps[2]?.id || mainMapId;

  if (planetId === 'planet-slimelands' || planetId === 'solar-planet-1') {
    return [
      {
        id: 'p-marker-archipelago',
        name: 'Arquipélago Esmeralda',
        description:
          'As ilhas centrais banhadas por correntes de mana cristalina, lar das vilas costeiras e santuários ancestrais.',
        nx: -0.12,
        ny: -0.14,
        iconEmoji: '🏝️',
        targetWorldMapId: mainMapId,
        status: 'unlocked',
        badgeText: 'REGIÃO NATAL',
        scale: 1.0,
      },
      {
        id: 'p-marker-aurora',
        name: 'Platô da Aurora Boreal',
        description:
          'Cordilheiras flutuantes onde os ventos astrais condensam fragmentos de estrelas em torres de quartzo azul.',
        nx: 0.22,
        ny: -0.38,
        iconEmoji: '❄️',
        targetWorldMapId: secondMapId,
        status: 'unlocked',
        badgeText: 'SANTUÁRIO',
        scale: 1.0,
      },
      {
        id: 'p-marker-solaris',
        name: 'Baía Dourada de Solaris',
        description:
          'O grande estuário comercial de águas mornas onde caravelas astrais ancoram sob faróis de ouro.',
        nx: -0.32,
        ny: 0.24,
        iconEmoji: '⚓',
        targetWorldMapId: thirdMapId,
        status: 'unlocked',
        badgeText: 'PORTO REAL',
        scale: 1.0,
      },
      {
        id: 'p-marker-veil',
        name: 'Cratera do Véu Celeste',
        description:
          'Uma caldeira circular cercada por anéis de pedra rúnica que refletem diretamente a Constelação Real.',
        nx: 0.34,
        ny: 0.16,
        iconEmoji: '🔮',
        targetWorldMapId: mainMapId,
        status: 'unlocked',
        badgeText: 'ARCANA',
        scale: 1.0,
      },
    ];
  }

  let hash = 0;
  for (let i = 0; i < planetId.length; i++) {
    hash = (hash * 31 + planetId.charCodeAt(i)) % 1000;
  }
  const offset = ((hash % 10) - 5) * 0.025;

  return [
    {
      id: `${planetId}-m1`,
      name: `Cidadela de ${planetName}`,
      description: `Assentamento principal erguido sobre as formações primordiais de ${planetName}.`,
      nx: Math.max(-0.55, Math.min(0.55, -0.1 + offset)),
      ny: Math.max(-0.55, Math.min(0.55, -0.18 - offset)),
      iconEmoji: '🏰',
      targetWorldMapId: mainMapId,
      status: 'unlocked',
      badgeText: 'CAPITAL',
      scale: 1.0,
    },
    {
      id: `${planetId}-m2`,
      name: `Vale Astral de ${planetName}`,
      description: `Região inexplorada de alta ressonância elemental na superfície de ${planetName}.`,
      nx: Math.max(-0.55, Math.min(0.55, 0.26 - offset)),
      ny: Math.max(-0.55, Math.min(0.55, 0.2 + offset)),
      iconEmoji: '✨',
      targetWorldMapId: secondMapId,
      status: 'unlocked',
      badgeText: 'EXPEDIÇÃO',
      scale: 1.0,
    },
    {
      id: `${planetId}-m3`,
      name: `Santuário Norte de ${planetName}`,
      description: `Monólitos silenciosos alinhados com as seis estrelas da Constelação de Slimelands.`,
      nx: Math.max(-0.55, Math.min(0.55, -0.28 + offset)),
      ny: Math.max(-0.55, Math.min(0.55, 0.24 + offset)),
      iconEmoji: '🏛️',
      targetWorldMapId: thirdMapId,
      status: 'unlocked',
      badgeText: 'RELÍQUIA',
      scale: 1.0,
    },
  ];
}

function normalizeMarkerCoord(val: number): number {
  if (!Number.isFinite(val)) return 0;
  return Math.max(-0.85, Math.min(0.85, val));
}

/**
 * Exact 6-Star Constellation Connectivity matching the user's Ursa Major reference photo:
 * Handle (Star 1 -> Star 2 -> Star 3) connected to the quadrilateral bowl (Star 3 -> Star 6 -> Star 5 -> Star 4 -> Star 3).
 */
export const CONSTELLATION_6_CONNECTIONS: Array<[string, string]> = [
  ['sys-solaris-prime', 'sys-velaris-boreal'],
  ['sys-velaris-boreal', 'sys-ignis-draconis'],
  ['sys-ignis-draconis', 'sys-sylvan-aether'],
  ['sys-sylvan-aether', 'sys-chronos-alba'],
  ['sys-chronos-alba', 'sys-zenith-coroa'],
  ['sys-zenith-coroa', 'sys-ignis-draconis'],
];

/**
 * Builds the 6-Star Constellation where 40 Planets & Moons are divided across
 * the 6 Star Systems (6 to 7 celestial bodies per system = 40 total!).
 */
function buildSixStarConstellationSystems(
  project: MapProject,
  defaultPlanetImageUrl: string,
  slimelandsMarkers: PlanetGlobeMarker[],
  uvLibrary: PlanetUvTextureItem[]
): ConstellationSystemNode[] {
  const pickUv = (idx: number) =>
    uvLibrary[idx % Math.max(1, uvLibrary.length)]?.url || '';

  const starDefinitions: Array<{
    id: string;
    name: string;
    subtitle: string;
    description: string;
    xRatio: number;
    yRatio: number;
    glowColor: string;
    secondaryColor: string;
    markerIconEmoji: string;
    sunName: string;
    planets: Array<{
      id: string;
      name: string;
      description: string;
      orbitRadiusRatio: number;
      orbitSpeed: number;
      initialAngleDeg: number;
      sizePx: number;
      glowColor: string;
      hasRings?: boolean;
      markerIconEmoji: string;
      uvIdx: number;
      moons?: SolarSystemMoon[];
    }>;
  }> = [
    // ESTRELA 1: 5 Planetas + 2 Luas = 7 Corpos Celestes
    {
      id: 'sys-solaris-prime',
      name: 'Alkaid • Solaris Prime',
      subtitle: '1ª Estrela da Constelação • 5 Planetas & 2 Luas',
      description:
        'A estrela da ponta oeste da Constelação Real, lar do Mundo de Slimelands e quatro mundos irmãos.',
      xRatio: 0.13,
      yRatio: 0.69,
      glowColor: '#93c5fd',
      secondaryColor: '#ffffff',
      markerIconEmoji: '✦',
      sunName: 'Alkaid Solaris',
      planets: [
        {
          id: 'planet-pyros-forge',
          name: 'Pyros Vulk',
          description: 'Mundo vulcânico na órbita interna mais próxima do brilho estelar.',
          orbitRadiusRatio: 0.16,
          orbitSpeed: 18,
          initialAngleDeg: 25,
          sizePx: 46,
          glowColor: '#f97316',
          markerIconEmoji: '🔥',
          uvIdx: 1,
        },
        {
          id: 'planet-slimelands',
          name: 'Mundo de Slimelands',
          description:
            'Nosso mundo vivo de arquipélagos flutuantes, florestas de mana e santuários ancestrais.',
          orbitRadiusRatio: 0.30,
          orbitSpeed: 12,
          initialAngleDeg: 115,
          sizePx: 68,
          glowColor: '#38bdf8',
          hasRings: false,
          markerIconEmoji: '🌍',
          uvIdx: 0,
          moons: [
            {
              id: 'moon-lunaria',
              name: 'Lunária',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(5),
              markerIconEmoji: '🌙',
              orbitRadiusPx: 54,
              orbitSpeed: 24,
              initialAngleDeg: 45,
              sizePx: 20,
              status: 'unlocked',
            },
            {
              id: 'moon-vesper',
              name: 'Vésper Dourada',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(2),
              markerIconEmoji: '✨',
              orbitRadiusPx: 76,
              orbitSpeed: 16,
              initialAngleDeg: 215,
              sizePx: 16,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-aethel-rings',
          name: 'Aethel-Kronos',
          description: 'Gigante gasoso dourado cercado por anéis de gelo estelar.',
          orbitRadiusRatio: 0.46,
          orbitSpeed: 8.5,
          initialAngleDeg: 220,
          sizePx: 74,
          glowColor: '#fbbf24',
          hasRings: true,
          markerIconEmoji: '🪐',
          uvIdx: 2,
        },
        {
          id: 'planet-cryo-nyx',
          name: 'Glacies Azur',
          description: 'Mundo de safira glacial com auroras perpétuas.',
          orbitRadiusRatio: 0.62,
          orbitSpeed: 6,
          initialAngleDeg: 310,
          sizePx: 56,
          glowColor: '#60a5fa',
          hasRings: true,
          markerIconEmoji: '❄️',
          uvIdx: 3,
        },
        {
          id: 'planet-umbra-outer',
          name: 'Véspera Violeta',
          description: 'Planeta misterioso na fronteira externa de Solaris Prime.',
          orbitRadiusRatio: 0.78,
          orbitSpeed: 4.2,
          initialAngleDeg: 75,
          sizePx: 50,
          glowColor: '#a855f7',
          markerIconEmoji: '🔮',
          uvIdx: 4,
        },
      ],
    },

    // ESTRELA 2: 5 Planetas + 2 Luas = 7 Corpos Celestes (Total acumulado: 14)
    {
      id: 'sys-velaris-boreal',
      name: 'Mizar • Velaris Boreal',
      subtitle: '2ª Estrela da Constelação • 5 Planetas & 2 Luas',
      description:
        'Estrela azul-branca radiante no arco da cauda, cercada por mundos oceânicos e gigantes de cristal.',
      xRatio: 0.28,
      yRatio: 0.50,
      glowColor: '#bae6fd',
      secondaryColor: '#ffffff',
      markerIconEmoji: '✦',
      sunName: 'Mizar Boreal',
      planets: [
        {
          id: 'planet-coral-inner',
          name: ' ignis-Coral',
          description: 'Planeta quente de mares de quartzo líquido.',
          orbitRadiusRatio: 0.17,
          orbitSpeed: 17,
          initialAngleDeg: 60,
          sizePx: 46,
          glowColor: '#fb7185',
          markerIconEmoji: '🌸',
          uvIdx: 6,
        },
        {
          id: 'planet-thalassa',
          name: 'Thalassa Prime',
          description: 'Planeta coberto por águas luminescentes e recifes flutuantes.',
          orbitRadiusRatio: 0.31,
          orbitSpeed: 12.5,
          initialAngleDeg: 150,
          sizePx: 64,
          glowColor: '#0ea5e9',
          markerIconEmoji: '🌊',
          uvIdx: 0,
          moons: [
            {
              id: 'moon-nereid',
              name: 'Nereida',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(3),
              markerIconEmoji: '🌙',
              orbitRadiusPx: 54,
              orbitSpeed: 22,
              initialAngleDeg: 90,
              sizePx: 19,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-boreas',
          name: 'Bóreas Vetro',
          description: 'Colosso azulado com anéis duplos de diamantes congelados.',
          orbitRadiusRatio: 0.47,
          orbitSpeed: 8.2,
          initialAngleDeg: 255,
          sizePx: 72,
          glowColor: '#38bdf8',
          hasRings: true,
          markerIconEmoji: '🪐',
          uvIdx: 3,
          moons: [
            {
              id: 'moon-galatea',
              name: 'Galateia de Gelo',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(5),
              markerIconEmoji: '❄️',
              orbitRadiusPx: 64,
              orbitSpeed: 19,
              initialAngleDeg: 180,
              sizePx: 18,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-cygnus-minor',
          name: 'Cygnus Mir',
          description: 'Sua superfície espelhada reflete toda a Constelação.',
          orbitRadiusRatio: 0.63,
          orbitSpeed: 5.8,
          initialAngleDeg: 15,
          sizePx: 54,
          glowColor: '#818cf8',
          markerIconEmoji: '💎',
          uvIdx: 4,
        },
        {
          id: 'planet-neptune-deep',
          name: 'Abismo Safira',
          description: 'Gigante de ventos supersônicos azuis na borda do sistema.',
          orbitRadiusRatio: 0.79,
          orbitSpeed: 4.0,
          initialAngleDeg: 195,
          sizePx: 58,
          glowColor: '#22d3ee',
          hasRings: true,
          markerIconEmoji: '🌀',
          uvIdx: 3,
        },
      ],
    },

    // ESTRELA 3: 5 Planetas + 2 Luas = 7 Corpos Celestes (Total acumulado: 21)
    {
      id: 'sys-ignis-draconis',
      name: 'Alioth • Ignis Draconis',
      subtitle: '3ª Estrela da Constelação • 5 Planetas & 2 Luas',
      description:
        'A estrela central de ligação da Constelação, governando cinco mundos de forjas astrais e anéis dourados.',
      xRatio: 0.42,
      yRatio: 0.50,
      glowColor: '#e0f2fe',
      secondaryColor: '#ffffff',
      markerIconEmoji: '✦',
      sunName: 'Alioth Draconis',
      planets: [
        {
          id: 'planet-draco-cind',
          name: 'Draco Cinza-Ouro',
          description: 'Continentes de basalto negro cortados por veios de ouro líquido.',
          orbitRadiusRatio: 0.16,
          orbitSpeed: 17.5,
          initialAngleDeg: 85,
          sizePx: 52,
          glowColor: '#fb7185',
          markerIconEmoji: '🌋',
          uvIdx: 1,
        },
        {
          id: 'planet-forja-rubra',
          name: 'Forja Rubra',
          description: 'Planeta metalúrgico onde antigas cidadelas orbitam rios de lava.',
          orbitRadiusRatio: 0.30,
          orbitSpeed: 12,
          initialAngleDeg: 190,
          sizePx: 60,
          glowColor: '#f97316',
          markerIconEmoji: '⚒️',
          uvIdx: 7,
          moons: [
            {
              id: 'moon-ember',
              name: 'Brasa Astral',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(1),
              markerIconEmoji: '🔥',
              orbitRadiusPx: 54,
              orbitSpeed: 23,
              initialAngleDeg: 110,
              sizePx: 18,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-salamandra',
          name: 'Sol-Salamandra',
          description: 'Gigante cercado por anéis incandescentes de silicatos e rubis.',
          orbitRadiusRatio: 0.46,
          orbitSpeed: 8.5,
          initialAngleDeg: 295,
          sizePx: 74,
          glowColor: '#f43f5e',
          hasRings: true,
          markerIconEmoji: '🪐',
          uvIdx: 6,
          moons: [
            {
              id: 'moon-ash-1',
              name: 'Fênix Menor',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(2),
              markerIconEmoji: '☄️',
              orbitRadiusPx: 64,
              orbitSpeed: 20,
              initialAngleDeg: 30,
              sizePx: 19,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-obsidian-reach',
          name: 'Bastião de Obsidiana',
          description: 'Fortaleza planetária guardiã do centro da constelação.',
          orbitRadiusRatio: 0.63,
          orbitSpeed: 5.5,
          initialAngleDeg: 40,
          sizePx: 56,
          glowColor: '#f59e0b',
          markerIconEmoji: '🛡️',
          uvIdx: 5,
        },
        {
          id: 'planet-kaelis-outer',
          name: 'Kaelis de Âmbar',
          description: 'Planeta desértico de tempestades douradas na órbita externa.',
          orbitRadiusRatio: 0.78,
          orbitSpeed: 4.1,
          initialAngleDeg: 150,
          sizePx: 52,
          glowColor: '#fbbf24',
          hasRings: true,
          markerIconEmoji: '🏜️',
          uvIdx: 7,
        },
      ],
    },

    // ESTRELA 4: 5 Planetas + 2 Luas = 7 Corpos Celestes (Total acumulado: 28)
    {
      id: 'sys-sylvan-aether',
      name: 'Megrez • Sylvan Aether',
      subtitle: '4ª Estrela da Constelação • 5 Planetas & 2 Luas',
      description:
        'A estrela de junção do quadrilátero celeste, abrigando cinco mundos-floresta e jardins eternos.',
      xRatio: 0.58,
      yRatio: 0.47,
      glowColor: '#bae6fd',
      secondaryColor: '#ffffff',
      markerIconEmoji: '✦',
      sunName: 'Megrez Sylvan',
      planets: [
        {
          id: 'planet-sylphide',
          name: 'Sylphide Brisa',
          description: 'Mundo interno de nuvens esmeraldas e gêiseres termais.',
          orbitRadiusRatio: 0.16,
          orbitSpeed: 16.5,
          initialAngleDeg: 45,
          sizePx: 48,
          glowColor: '#2dd4bf',
          markerIconEmoji: '🍃',
          uvIdx: 0,
        },
        {
          id: 'planet-yggdrasil-orb',
          name: 'Arboria Prime',
          description: 'Coberto por copas gigantescas que chegam até a estratosfera.',
          orbitRadiusRatio: 0.31,
          orbitSpeed: 11.5,
          initialAngleDeg: 135,
          sizePx: 66,
          glowColor: '#34d399',
          markerIconEmoji: '🌳',
          uvIdx: 0,
          moons: [
            {
              id: 'moon-spore',
              name: 'Semente Astral',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(0),
              markerIconEmoji: '🌱',
              orbitRadiusPx: 56,
              orbitSpeed: 21,
              initialAngleDeg: 180,
              sizePx: 18,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-jade-halo',
          name: 'Halo de Jade',
          description: 'Seus anéis contêm cristais verdes e pólen luminescente.',
          orbitRadiusRatio: 0.47,
          orbitSpeed: 8.0,
          initialAngleDeg: 260,
          sizePx: 72,
          glowColor: '#10b981',
          hasRings: true,
          markerIconEmoji: '🪐',
          uvIdx: 3,
          moons: [
            {
              id: 'moon-lotus',
              name: 'Lótus Orbital',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(4),
              markerIconEmoji: '🪷',
              orbitRadiusPx: 62,
              orbitSpeed: 18,
              initialAngleDeg: 60,
              sizePx: 18,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-moss-haven',
          name: 'Veridiana',
          description: 'Lagos serenos e cavernas bioluminescentes.',
          orbitRadiusRatio: 0.63,
          orbitSpeed: 5.6,
          initialAngleDeg: 10,
          sizePx: 54,
          glowColor: '#22d3ee',
          markerIconEmoji: '🌺',
          uvIdx: 3,
        },
        {
          id: 'planet-mana-root',
          name: 'Raiz de Éter',
          description: 'Fronteira externa onde raízes cristalizadas flutuam no espaço.',
          orbitRadiusRatio: 0.78,
          orbitSpeed: 4.0,
          initialAngleDeg: 205,
          sizePx: 50,
          glowColor: '#a855f7',
          markerIconEmoji: '✨',
          uvIdx: 4,
        },
      ],
    },

    // ESTRELA 5: 4 Planetas + 2 Luas = 6 Corpos Celestes (Total acumulado: 34)
    {
      id: 'sys-chronos-alba',
      name: 'Phecda • Chronos Alba',
      subtitle: '5ª Estrela da Constelação • 4 Planetas & 2 Luas',
      description:
        'Estrela austral do cálice da Constelação, onde quatro planetas e duas luas giram em sincronia temporal.',
      xRatio: 0.68,
      yRatio: 0.64,
      glowColor: '#93c5fd',
      secondaryColor: '#ffffff',
      markerIconEmoji: '✦',
      sunName: 'Phecda Chronos',
      planets: [
        {
          id: 'planet-meridian',
          name: 'Meridiano Solar',
          description: 'Planeta metálico polido que marca as horas cósmicas.',
          orbitRadiusRatio: 0.19,
          orbitSpeed: 15.5,
          initialAngleDeg: 30,
          sizePx: 50,
          glowColor: '#fde047',
          markerIconEmoji: '🧭',
          uvIdx: 2,
        },
        {
          id: 'planet-horologium',
          name: 'Horologium',
          description: 'Planeta atravessado por anéis dourados de precisão ancestral.',
          orbitRadiusRatio: 0.36,
          orbitSpeed: 11,
          initialAngleDeg: 140,
          sizePx: 66,
          glowColor: '#f8fafc',
          hasRings: true,
          markerIconEmoji: '⌚',
          uvIdx: 5,
          moons: [
            {
              id: 'moon-pendulum',
              name: 'Pêndulo de Prata',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(5),
              markerIconEmoji: '🌕',
              orbitRadiusPx: 58,
              orbitSpeed: 22,
              initialAngleDeg: 95,
              sizePx: 19,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-alba-prime',
          name: 'Alba Eterna',
          description: 'Banhado por uma aurora perpétua de tons pérola e safira.',
          orbitRadiusRatio: 0.55,
          orbitSpeed: 7.4,
          initialAngleDeg: 245,
          sizePx: 64,
          glowColor: '#cbd5e1',
          markerIconEmoji: '🏳️',
          uvIdx: 3,
          moons: [
            {
              id: 'moon-dawn',
              name: 'Lua da Alvorada',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(6),
              markerIconEmoji: '🌙',
              orbitRadiusPx: 56,
              orbitSpeed: 19,
              initialAngleDeg: 270,
              sizePx: 17,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-time-crystal',
          name: 'Cristal do Tempo',
          description: 'Esfera facetada de quartzo azul na órbita mais distante.',
          orbitRadiusRatio: 0.74,
          orbitSpeed: 4.6,
          initialAngleDeg: 335,
          sizePx: 54,
          glowColor: '#38bdf8',
          hasRings: true,
          markerIconEmoji: '💎',
          uvIdx: 4,
        },
      ],
    },

    // ESTRELA 6: 4 Planetas + 2 Luas = 6 Corpos Celestes (Total acumulado: 40!)
    {
      id: 'sys-zenith-coroa',
      name: 'Dubhe • Zênite da Coroa',
      subtitle: '6ª Estrela da Constelação • 4 Planetas & 2 Luas',
      description:
        'A estrela alfa no topo direito da Constelação, coroando o firmamento com mundos imperiais.',
      xRatio: 0.86,
      yRatio: 0.25,
      glowColor: '#e0f2fe',
      secondaryColor: '#ffffff',
      markerIconEmoji: '✦',
      sunName: 'Dubhe Zênite',
      planets: [
        {
          id: 'planet-empirion',
          name: 'Empíreo Dourado',
          description: 'O planeta mais próximo do Zênite, banhado em luz dourada eterna.',
          orbitRadiusRatio: 0.20,
          orbitSpeed: 15,
          initialAngleDeg: 35,
          sizePx: 64,
          glowColor: '#fde047',
          hasRings: true,
          markerIconEmoji: '👑',
          uvIdx: 2,
          moons: [
            {
              id: 'moon-crown-jewel',
              name: 'Joia da Coroa',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(5),
              markerIconEmoji: '💎',
              orbitRadiusPx: 58,
              orbitSpeed: 22,
              initialAngleDeg: 110,
              sizePx: 19,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-solstice-prime',
          name: 'Solstício Imperial',
          description: 'Grande mundo cerimonial onde convergem os portais das 6 estrelas.',
          orbitRadiusRatio: 0.38,
          orbitSpeed: 10.5,
          initialAngleDeg: 165,
          sizePx: 72,
          glowColor: '#fbbf24',
          markerIconEmoji: '🌟',
          uvIdx: 0,
          moons: [
            {
              id: 'moon-royal-sentinel',
              name: 'Sentinela Real',
              imagePng: defaultPlanetImageUrl,
              uvTexturePng: pickUv(2),
              markerIconEmoji: '🛡️',
              orbitRadiusPx: 62,
              orbitSpeed: 18,
              initialAngleDeg: 230,
              sizePx: 18,
              status: 'unlocked',
            },
          ],
        },
        {
          id: 'planet-astral-sanctum',
          name: 'Santuário do Zênite',
          description: 'Gigante azul-safira cercado por anéis de luz estelar.',
          orbitRadiusRatio: 0.57,
          orbitSpeed: 7.0,
          initialAngleDeg: 280,
          sizePx: 60,
          glowColor: '#38bdf8',
          hasRings: true,
          markerIconEmoji: '🪐',
          uvIdx: 3,
        },
        {
          id: 'planet-apex-orb',
          name: 'Ápice Astral',
          description: 'O quadragésimo corpo celeste da Constelação, guardião do horizonte.',
          orbitRadiusRatio: 0.75,
          orbitSpeed: 4.5,
          initialAngleDeg: 95,
          sizePx: 52,
          glowColor: '#a855f7',
          markerIconEmoji: '🔮',
          uvIdx: 4,
        },
      ],
    },
  ];

  let celestialBodyCounter = 0;
  return starDefinitions.map((star) => ({
    id: star.id,
    name: star.name,
    subtitle: star.subtitle,
    description: star.description,
    xRatio: star.xRatio,
    yRatio: star.yRatio,
    glowColor: star.glowColor,
    secondaryColor: star.secondaryColor,
    markerIconEmoji: star.markerIconEmoji,
    sunName: star.sunName,
    status: 'unlocked',
    planets: star.planets.map((p) => {
      const isSlimelands = p.id === 'planet-slimelands' || p.id === 'solar-planet-1';
      const pIdx = celestialBodyCounter++;
      const planetUvUrl = OFFICIAL_40_UV_TEXTURES[pIdx % 40]?.url || `/assets/planets/uv/UV_${String((pIdx % 40) + 1).padStart(2, '0')}.png`;

      const mappedMoons = (p.moons || []).map((m) => {
        const mIdx = celestialBodyCounter++;
        const moonUvUrl = OFFICIAL_40_UV_TEXTURES[mIdx % 40]?.url || `/assets/planets/uv/UV_${String((mIdx % 40) + 1).padStart(2, '0')}.png`;
        return {
          ...m,
          imagePng: m.imagePng || defaultPlanetImageUrl,
          uvTexturePng: moonUvUrl,
          markers:
            m.markers && m.markers.length > 0
              ? m.markers
              : buildDefaultMarkersForPlanet(m.id, m.name, project),
        };
      });

      return {
        id: p.id,
        name: p.name,
        description: p.description,
        planetImagePng: defaultPlanetImageUrl,
        uvTexturePng: planetUvUrl,
        markerIconEmoji: p.markerIconEmoji,
        glowColor: p.glowColor,
        hasRings: p.hasRings,
        sizePx: p.sizePx,
        orbitRadiusRatio: p.orbitRadiusRatio,
        orbitSpeed: p.orbitSpeed,
        selfRotateSpeed: 0.65,
        initialAngleDeg: p.initialAngleDeg,
        status: 'unlocked',
        moons: mappedMoons,
        markers: isSlimelands
          ? slimelandsMarkers
          : buildDefaultMarkersForPlanet(p.id, p.name, project),
      };
    }),
  }));
}

export function getOrCreatePlanetGlobeConfig(project: MapProject): PlanetGlobeConfig {
  const existing = project.planetGlobe;
  const baseImagePng = existing?.planetImagePng || DEFAULT_PLANET_IMAGE_URL;

  const isLegacyProcedural = (url?: string) =>
    !url || url.startsWith('data:image/') || url.includes('uv-preset');

  const defaultUvLib = getDefaultUvTextureLibrary();
  const uvTextureLibrary: PlanetUvTextureItem[] =
    existing?.uvTextureLibrary &&
    existing.uvTextureLibrary.length >= 40 &&
    !existing.uvTextureLibrary.some((item) => isLegacyProcedural(item.url))
      ? existing.uvTextureLibrary
      : defaultUvLib;

  const rawMarkers =
    existing?.markers && existing.markers.length > 0
      ? existing.markers
      : buildDefaultMarkersForPlanet('planet-slimelands', 'Mundo de Slimelands', project);

  const slimelandsMarkers: PlanetGlobeMarker[] = rawMarkers.map((m) => ({
    ...m,
    nx: normalizeMarkerCoord(m.nx),
    ny: normalizeMarkerCoord(m.ny),
  }));

  const canonicalSix = buildSixStarConstellationSystems(
    project,
    baseImagePng,
    slimelandsMarkers,
    uvTextureLibrary
  );

  // Merge user custom planet textures/markers onto the 6 canonical stars (with 40 planets/moons total)
  let mergedConstellations: ConstellationSystemNode[] = canonicalSix;
  if (existing?.constellations && existing.constellations.length > 0) {
    const existingById = new Map<string, ConstellationSystemNode>();
    existing.constellations.forEach((c) => existingById.set(c.id, c));

    mergedConstellations = canonicalSix.map((canonStar, index) => {
      const match = existingById.get(canonStar.id);
      if (!match) return canonStar;

      const existingPlanetsById = new Map<string, SolarSystemPlanet>();
      (match.planets || []).forEach((ep) => existingPlanetsById.set(ep.id, ep));

      const mergedPlanets: SolarSystemPlanet[] = (canonStar.planets || []).map(
        (canonP, pIdx) => {
          const ep = existingPlanetsById.get(canonP.id);
          if (!ep) return canonP;
          return {
            ...canonP,
            planetImagePng: ep.planetImagePng || canonP.planetImagePng || baseImagePng,
            uvTexturePng:
              !isLegacyProcedural(ep.uvTexturePng)
                ? ep.uvTexturePng
                : canonP.uvTexturePng,
            moons: (canonP.moons || []).map((canonM) => {
              const em = (ep.moons || []).find((m) => m.id === canonM.id);
              return {
                ...canonM,
                uvTexturePng: em && !isLegacyProcedural(em.uvTexturePng) ? em.uvTexturePng : canonM.uvTexturePng,
              };
            }),
            markers:
              canonP.id === 'planet-slimelands' || canonP.id === 'solar-planet-1'
                ? slimelandsMarkers
                : ep.markers && ep.markers.length > 0
                ? ep.markers.map((m) => ({
                    ...m,
                    nx: normalizeMarkerCoord(m.nx),
                    ny: normalizeMarkerCoord(m.ny),
                  }))
                : canonP.markers,
          };
        }
      );

      return {
        ...canonStar,
        planets: mergedPlanets,
      };
    });
  }

  return {
    enabled: existing?.enabled ?? true,
    enableConstellationLayer: existing?.enableConstellationLayer ?? true,
    title: existing?.title || 'Mundo de Slimelands',
    systemName: existing?.systemName || 'Constelação Real',
    planetImagePng: baseImagePng,
    uvTexturePng: !isLegacyProcedural(existing?.uvTexturePng) ? existing!.uvTexturePng : (canonicalSix[0]?.planets?.[1]?.uvTexturePng || '/assets/planets/uv/UV_02.png'),
    sunName: existing?.sunName || 'Solaris Prime',
    sunSizePx: existing?.sunSizePx ?? 56,
    showCentralSun: existing?.showCentralSun ?? true,
    orbitTiltRatio: existing?.orbitTiltRatio ?? 0.66,
    glowColor: existing?.glowColor || '#38bdf8',
    autoRotateSpeed: existing?.autoRotateSpeed ?? 1.0,
    planetScale: existing?.planetScale ?? 1.0,
    verticalOffsetPct: existing?.verticalOffsetPct ?? 0,
    showMoonsInSky: existing?.showMoonsInSky ?? true,
    markers: slimelandsMarkers,
    uvTextureLibrary,
    planets: mergedConstellations[0]?.planets || [],
    constellations: mergedConstellations,
  };
}

const textureCache = new Map<string, THREE.Texture>();

function getOrLoadPlanetTexture(url: string, wrapEquirect = false): THREE.Texture {
  const safeUrl = url || DEFAULT_PLANET_IMAGE_URL;
  const cacheKey = `${wrapEquirect ? 'uv21:' : 'png:'}${safeUrl}`;
  const cached = textureCache.get(cacheKey);
  if (cached) return cached;

  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const tex = loader.load(safeUrl, (loaded) => {
    loaded.colorSpace = THREE.SRGBColorSpace;
    if (wrapEquirect) {
      loaded.wrapS = THREE.RepeatWrapping;
      loaded.wrapT = THREE.ClampToEdgeWrapping;
    }
    loaded.needsUpdate = true;
  });
  tex.colorSpace = THREE.SRGBColorSpace;
  if (wrapEquirect) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
  }
  textureCache.set(cacheKey, tex);
  return tex;
}

/**
 * REALISTIC OPTICAL STARBURST TEXTURE (Matches the user's Ursa Major reference photo!)
 * Creates a 512x512 high-dynamic-range optical star flare with:
 * - Soft blue-indigo outer atmospheric bloom
 * - 64 fine, needle-sharp radial diffraction rays radiating from the center
 * - 8 primary long optical flare spikes
 * - Blinding pure white-hot pinpoint center (`#ffffff`)
 * Zero solid spheres — pure realistic starlight flare!
 */
let cachedRealisticStarburstTex: THREE.CanvasTexture | null = null;
function getRealisticStarburstTexture(): THREE.CanvasTexture {
  if (cachedRealisticStarburstTex) return cachedRealisticStarburstTex;
  const size = 512;
  const half = size / 2;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, size, size);

  // 1. Deep outer blue-violet optical halo
  const outerHalo = ctx.createRadialGradient(half, half, 1, half, half, half);
  outerHalo.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  outerHalo.addColorStop(0.06, 'rgba(225, 240, 255, 0.92)');
  outerHalo.addColorStop(0.16, 'rgba(135, 180, 255, 0.52)');
  outerHalo.addColorStop(0.35, 'rgba(85, 130, 245, 0.18)');
  outerHalo.addColorStop(0.65, 'rgba(55, 90, 210, 0.04)');
  outerHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = outerHalo;
  ctx.fillRect(0, 0, size, size);

  // 2. 72 Fine Radial Light Rays (like camera lens starburst in the reference photo)
  ctx.save();
  ctx.translate(half, half);
  const numFineRays = 72;
  for (let i = 0; i < numFineRays; i++) {
    const angle = (i / numFineRays) * Math.PI * 2 + (i % 3) * 0.008;
    const isPrimary = i % 9 === 0;
    const isSecondary = i % 3 === 0;
    const rayLen = isPrimary
      ? half * 0.96
      : isSecondary
      ? half * 0.72
      : half * (0.38 + ((i * 17) % 10) * 0.025);
    const rayWidth = isPrimary ? 2.4 : isSecondary ? 1.4 : 0.85;

    ctx.save();
    ctx.rotate(angle);
    const rayGrad = ctx.createLinearGradient(0, 0, rayLen, 0);
    rayGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    rayGrad.addColorStop(0.15, 'rgba(210, 232, 255, 0.65)');
    rayGrad.addColorStop(0.45, 'rgba(130, 175, 255, 0.22)');
    rayGrad.addColorStop(1, 'rgba(90, 140, 255, 0)');

    ctx.fillStyle = rayGrad;
    ctx.beginPath();
    ctx.moveTo(0, -rayWidth);
    ctx.lineTo(rayLen, 0);
    ctx.lineTo(0, rayWidth);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();

  // 3. Intense white-hot pinpoint core
  const coreGlow = ctx.createRadialGradient(half, half, 0, half, half, half * 0.18);
  coreGlow.addColorStop(0, 'rgba(255, 255, 255, 1)');
  coreGlow.addColorStop(0.35, 'rgba(255, 255, 255, 0.95)');
  coreGlow.addColorStop(0.7, 'rgba(200, 228, 255, 0.45)');
  coreGlow.addColorStop(1, 'rgba(150, 195, 255, 0)');
  ctx.fillStyle = coreGlow;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedRealisticStarburstTex = tex;
  return tex;
}

let cachedSoftHaloTex: THREE.CanvasTexture | null = null;
function getSoftHaloTexture(): THREE.CanvasTexture {
  if (cachedSoftHaloTex) return cachedSoftHaloTex;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(128, 128, 2, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
  grad.addColorStop(0.2, 'rgba(220, 238, 255, 0.75)');
  grad.addColorStop(0.5, 'rgba(120, 175, 255, 0.22)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  cachedSoftHaloTex = tex;
  return tex;
}

/**
 * 1) EQUIRECTANGULAR 2:1 UV 3D SPHERE MATERIAL (Used in 3D Solar System Layer)
 */
function create3DEquirectangularUvMaterial(options: {
  texture: THREE.Texture;
  atmosphereColor: string;
}): THREE.ShaderMaterial {
  const atmo = new THREE.Color(options.atmosphereColor || '#38bdf8');
  return new THREE.ShaderMaterial({
    transparent: false,
    depthWrite: true,
    uniforms: {
      uTexture: { value: options.texture },
      uAtmosphereColor: { value: atmo },
      uSunWorldPos: { value: new THREE.Vector3(0, 0, 0) },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      void main() {
        vUv = uv;
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPos = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        vec4 mvPosition = viewMatrix * worldPosition;
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform vec3 uAtmosphereColor;
      uniform vec3 uSunWorldPos;

      varying vec2 vUv;
      varying vec3 vWorldNormal;
      varying vec3 vWorldPos;
      varying vec3 vViewDir;

      void main() {
        vec4 texColor = texture2D(uTexture, vUv);

        vec3 toSun = normalize(uSunWorldPos - vWorldPos);
        float ndotl = dot(normalize(vWorldNormal), toSun);
        float dayNight = smoothstep(-0.45, 0.65, ndotl);
        float lighting = mix(0.28, 1.18, dayNight);

        vec3 viewNormal = normalize(vec3(viewMatrix * vec4(vWorldNormal, 0.0)));
        float fresnel = pow(1.0 - max(0.0, dot(viewNormal, normalize(vViewDir))), 2.5);

        vec3 finalRgb = texColor.rgb * lighting + uAtmosphereColor * fresnel * (0.35 + 0.35 * dayNight);
        gl_FragColor = vec4(finalRgb, 1.0);
      }
    `,
  });
}

/**
 * 2) ILLUSTRATED PLANET PNG 3D RELIEF MATERIAL (Used in Planet Close-Up Dive Layer)
 */
function create3DPlanetPngDiveMaterial(options: {
  texture: THREE.Texture;
  atmosphereColor: string;
  tintColor?: string;
  tintStrength?: number;
  lightDirection?: THREE.Vector3;
}): THREE.ShaderMaterial {
  const atmo = new THREE.Color(options.atmosphereColor || '#38bdf8');
  const tint = new THREE.Color(
    options.tintColor || options.atmosphereColor || '#ffffff'
  );
  const lightDir = (
    options.lightDirection || new THREE.Vector3(-0.38, 0.42, 0.88)
  ).normalize();

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: true,
    uniforms: {
      uTexture: { value: options.texture },
      uAtmosphereColor: { value: atmo },
      uTintColor: { value: tint },
      uTintStrength: { value: options.tintStrength ?? 0.0 },
      uLightDir: { value: lightDir },
      uOpacity: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vDiskUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;

      void main() {
        vDiskUv = vec2(position.x * 0.5 + 0.5, position.y * 0.5 + 0.5);
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vNormalView = normalize(normalMatrix * normal);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D uTexture;
      uniform vec3 uAtmosphereColor;
      uniform vec3 uTintColor;
      uniform float uTintStrength;
      uniform vec3 uLightDir;
      uniform float uOpacity;

      varying vec2 vDiskUv;
      varying vec3 vNormalView;
      varying vec3 vViewDir;

      void main() {
        vec2 uv = clamp(vDiskUv, 0.002, 0.998);
        vec4 texColor = texture2D(uTexture, uv);

        if (texColor.a < 0.03) {
          discard;
        }

        vec3 baseRgb = mix(texColor.rgb, texColor.rgb * (0.65 + 0.55 * uTintColor), uTintStrength);

        float ndotl = dot(normalize(vNormalView), normalize(uLightDir));
        float diffuse = smoothstep(-0.65, 0.85, ndotl);
        float lighting = mix(0.68, 1.10, diffuse);

        float fresnel = pow(1.0 - max(0.0, dot(normalize(vNormalView), normalize(vViewDir))), 2.6);
        vec3 finalRgb = baseRgb * lighting + uAtmosphereColor * fresnel * 0.45;

        vec3 halfVec = normalize(normalize(uLightDir) + normalize(vViewDir));
        float spec = pow(max(0.0, dot(normalize(vNormalView), halfVec)), 28.0);
        finalRgb += uAtmosphereColor * spec * 0.14;

        gl_FragColor = vec4(finalRgb, texColor.a * uOpacity);
      }
    `,
  });
}

export function markerNormalizedToSphereLocal3D(
  nx: number,
  ny: number,
  radius: number
): THREE.Vector3 {
  const dx = normalizeMarkerCoord(nx);
  const dy = -normalizeMarkerCoord(ny);
  const r2 = Math.min(0.95, dx * dx + dy * dy);
  const dz = Math.sqrt(Math.max(0.05, 1.0 - r2));
  return new THREE.Vector3(dx * radius, dy * radius, dz * radius * 1.02);
}

export const DEEP_SPACE_GALACTIC_BG_URL =
  '/assets/aistudio/Faixa_gal_ctica_sutil_no_espa_o_profundo_455f18e5.png';

export type MapDeviceProfile =
  | 'mobile-portrait'
  | 'mobile-landscape'
  | 'tablet-portrait'
  | 'tablet-landscape'
  | 'web-desktop';

export function detectMapViewportProfile(
  screenWidth: number,
  screenHeight: number
): {
  profile: MapDeviceProfile;
  isMobilePortrait: boolean;
  isMobileLandscape: boolean;
  isTabletPortrait: boolean;
  isTabletLandscape: boolean;
  isWebDesktop: boolean;
  isCompactHeight: boolean;
  isNarrowWidth: boolean;
  aspect: number;
} {
  const w = Math.max(280, screenWidth || 1024);
  const h = Math.max(240, screenHeight || 768);
  const aspect = w / h;

  let profile: MapDeviceProfile = 'web-desktop';
  if (w < 600 && h >= w) {
    profile = 'mobile-portrait';
  } else if (h < 540 && w > h) {
    profile = 'mobile-landscape';
  } else if (w >= 600 && w < 1024 && h >= w) {
    profile = 'tablet-portrait';
  } else if (w >= 600 && w <= 1180 && h >= 540 && w > h) {
    profile = 'tablet-landscape';
  } else {
    profile = 'web-desktop';
  }

  return {
    profile,
    isMobilePortrait: profile === 'mobile-portrait',
    isMobileLandscape: profile === 'mobile-landscape',
    isTabletPortrait: profile === 'tablet-portrait',
    isTabletLandscape: profile === 'tablet-landscape',
    isWebDesktop: profile === 'web-desktop',
    isCompactHeight: h < 560,
    isNarrowWidth: w < 520,
    aspect,
  };
}

/**
 * Clean, Minimal, Adaptive Bottom Destination Capsule ("Ir até [Destino]")
 * Uses `absolute` inside the simulated/real viewport and displays the full destination name
 * without "..." truncation across Mobile Portrait, Mobile Landscape, Tablet, and Web.
 */
export const AstralDestinationCapsule: React.FC<{
  visible: boolean;
  categoryLabel?: string;
  destinationName: string;
  subtitle?: string;
  accentColor?: string;
  actionLabel?: string;
  screenWidth?: number;
  screenHeight?: number;
  onConfirm: () => void;
}> = ({
  visible,
  destinationName,
  accentColor = '#fbbf24',
  screenWidth = 1024,
  screenHeight = 768,
  onConfirm,
}) => {
  if (!visible) return null;

  const cleanName = destinationName.includes('•')
    ? destinationName.split('•').pop()?.trim() || destinationName
    : destinationName;

  const vp = detectMapViewportProfile(screenWidth, screenHeight);

  return (
    <div
      className="absolute left-1/2 -translate-x-1/2 z-[140] pointer-events-auto transition-all duration-200"
      style={{
        bottom: vp.isMobileLandscape ? '10px' : vp.isMobilePortrait ? '12px' : '16px',
        maxWidth: `${Math.max(240, screenWidth - 20)}px`,
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onConfirm}
        className="group flex items-center gap-2 rounded-full bg-[#070b18]/92 hover:bg-[#0c1328]/98 backdrop-blur-md border border-[#d4af37]/65 hover:border-[#fde047] shadow-[0_8px_28px_rgba(0,0,0,0.82),0_0_16px_rgba(56,189,248,0.16)] transition-all duration-200 hover:scale-[1.02] active:scale-95 cursor-pointer"
        style={{
          padding: vp.isMobilePortrait
            ? '5px 8px 5px 10px'
            : vp.isMobileLandscape
            ? '5px 9px 5px 11px'
            : '7px 10px 7px 14px',
        }}
      >
        <span
          className="rounded-full flex items-center justify-center shrink-0 border border-white/20"
          style={{
            width: vp.isMobilePortrait || vp.isMobileLandscape ? '19px' : '22px',
            height: vp.isMobilePortrait || vp.isMobileLandscape ? '19px' : '22px',
            background:
              'radial-gradient(circle at 35% 35%, rgba(59,130,246,0.45), rgba(15,23,42,0.92))',
          }}
        >
          <Sparkles
            style={{
              width: vp.isMobilePortrait || vp.isMobileLandscape ? '10px' : '12px',
              height: vp.isMobilePortrait || vp.isMobileLandscape ? '10px' : '12px',
              color: accentColor,
            }}
          />
        </span>

        <div className="flex items-baseline gap-1.5 whitespace-nowrap">
          <span
            className="font-bold uppercase tracking-[0.12em] text-[#93c5fd] shrink-0"
            style={{
              fontSize: vp.isMobilePortrait ? '8.5px' : vp.isMobileLandscape ? '9px' : '10px',
            }}
          >
            Ir até
          </span>
          <span
            className="font-extrabold uppercase tracking-[0.06em] text-[#f8fafc] whitespace-nowrap"
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: vp.isMobilePortrait
                ? cleanName.length > 18
                  ? '9.5px'
                  : '10.5px'
                : vp.isMobileLandscape
                ? '10.5px'
                : '12px',
            }}
          >
            {cleanName}
          </span>
        </div>

        <span
          className="rounded-full bg-[#2563eb]/90 group-hover:bg-[#3b82f6] border border-[#93c5fd]/55 flex items-center justify-center shrink-0 transition-transform group-hover:translate-x-0.5"
          style={{
            width: vp.isMobilePortrait || vp.isMobileLandscape ? '19px' : '22px',
            height: vp.isMobilePortrait || vp.isMobileLandscape ? '19px' : '22px',
          }}
        >
          <ChevronRight className="w-3 h-3 text-white" />
        </span>
      </button>
    </div>
  );
};

/**
 * Deep Space Galactic Backdrop with Twinkling Micro-Points Overlay & Parallax Support
 */
export const RealisticDeepSpaceBackdrop: React.FC<{
  atmosphereColor?: string;
  intensity?: number;
  parallaxX?: number;
  parallaxY?: number;
}> = ({ intensity = 0.98, parallaxX = 0, parallaxY = 0 }) => {
  const twinkleCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = twinkleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const w = canvas.parentElement?.clientWidth || window.innerWidth || 1024;
      const h = canvas.parentElement?.clientHeight || window.innerHeight || 768;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();

    const count = 165;
    const stars = Array.from({ length: count }, (_, i) => {
      const seed = (i + 1) * 9301 + 49297;
      const rx = ((seed * 233) % 1000) / 1000;
      const ry = ((seed * 617) % 1000) / 1000;
      const depth = i % 3 === 0 ? 1.0 : i % 2 === 0 ? 0.6 : 0.32;
      const radius =
        i % 14 === 0 ? 1.35 : i % 5 === 0 ? 0.95 : 0.55 + (i % 3) * 0.15;
      const speed = 1.1 + ((i * 37) % 28) * 0.12;
      const phase = ((i * 73) % 100) * 0.0628;
      const tint =
        i % 6 === 0
          ? '215, 235, 255'
          : i % 9 === 0
          ? '255, 242, 214'
          : '255, 255, 255';
      return { rx, ry, depth, radius, speed, phase, tint };
    });

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      const t = now * 0.001;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const wave = 0.5 + 0.5 * Math.sin(t * s.speed + s.phase);
        const twinkle = Math.pow(wave, 1.8);
        const alpha = 0.12 + twinkle * 0.85;

        const x = s.rx * w;
        const y = s.ry * h;

        ctx.fillStyle = `rgba(${s.tint}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, s.radius, 0, Math.PI * 2);
        ctx.fill();

        if (s.radius > 1.1 && twinkle > 0.78) {
          const glintLen = s.radius * (2.6 + twinkle * 1.8);
          ctx.strokeStyle = `rgba(${s.tint}, ${((twinkle - 0.7) * 1.4).toFixed(3)})`;
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(x - glintLen, y);
          ctx.lineTo(x + glintLen, y);
          ctx.moveTo(x, y - glintLen);
          ctx.lineTo(x, y + glintLen);
          ctx.stroke();
        }
      }
    };

    rafId = requestAnimationFrame(render);
    window.addEventListener('resize', resize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0 bg-[#020308]">
      <div
        className="absolute inset-0 bg-center bg-cover bg-no-repeat will-change-transform"
        style={{
          backgroundImage: `url('${DEEP_SPACE_GALACTIC_BG_URL}')`,
          opacity: Math.max(0.65, Math.min(1, intensity)),
          transform: `translate3d(${(parallaxX * -24).toFixed(2)}px, ${(
            parallaxY * -18
          ).toFixed(2)}px, 0) scale(1.12)`,
        }}
      />

      <div
        className="absolute inset-0 will-change-transform"
        style={{
          transform: `translate3d(${(parallaxX * -42).toFixed(2)}px, ${(
            parallaxY * -30
          ).toFixed(2)}px, 0) scale(1.08)`,
        }}
      >
        <canvas
          ref={twinkleCanvasRef}
          className="w-full h-full block opacity-95"
        />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(2, 4, 12, 0.55) 100%)',
        }}
      />
    </div>
  );
};

/**
 * ============================================================================
 * 1. REALISTIC 6-STAR 3D CONSTELLATION VIEW
 * ============================================================================
 */
export interface ConstellationLayerViewProps {
  project: MapProject;
  screenWidth: number;
  screenHeight: number;
  userZoom?: number;
  pausedConstellationId?: string | null;
  onSelectPausedConstellation?: (id: string | null) => void;
  onEnterSolarSystem: (constellation: ConstellationSystemNode) => void;
}

export const ConstellationLayerView: React.FC<ConstellationLayerViewProps> = ({
  project,
  screenWidth,
  screenHeight,
  userZoom = 1.0,
  pausedConstellationId,
  onSelectPausedConstellation,
  onEnterSolarSystem,
}) => {
  const canvasHolderRef = useRef<HTMLDivElement>(null);
  const bgParallaxLayerRef = useRef<HTMLDivElement>(null);
  const twinkleParallaxLayerRef = useRef<HTMLDivElement>(null);
  const twinkleCanvasRef = useRef<HTMLCanvasElement>(null);

  const vp = useMemo(
    () => detectMapViewportProfile(screenWidth, screenHeight),
    [screenWidth, screenHeight]
  );

  // Automatic camera Z distance calibrated per device profile so all 6 stars fit 100% inside the screen
  const idealBaseCamZ = useMemo(() => {
    if (vp.isMobilePortrait) {
      return Math.max(25.5, 15.2 / Math.max(0.45, vp.aspect));
    }
    if (vp.isTabletPortrait) {
      return Math.max(21.5, 15.8 / Math.max(0.6, vp.aspect));
    }
    if (vp.isMobileLandscape) {
      return 16.0;
    }
    return 17.0;
  }, [vp]);

  const config = useMemo(() => getOrCreatePlanetGlobeConfig(project), [project]);
  const constellations = useMemo(
    () => config.constellations || [],
    [config.constellations]
  );

  const [focusedSystemId, setFocusedSystemId] = useState<string | null>(
    pausedConstellationId || null
  );
  const [hoveredSystemId, setHoveredSystemId] = useState<string | null>(null);
  const [divingSystemId, setDivingSystemId] = useState<string | null>(null);
  const [projectedStars, setProjectedStars] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      scale: number;
      visible: boolean;
      zDepth: number;
    }>
  >([]);

  useEffect(() => {
    setFocusedSystemId(pausedConstellationId || null);
  }, [pausedConstellationId]);

  const orbitRef = useRef({
    rotY: 0,
    rotX: 0,
    targetRotY: 0,
    targetRotX: 0,
    autoRotPhase: 0,
    pointerParallaxX: 0,
    pointerParallaxY: 0,
    targetPointerParallaxX: 0,
    targetPointerParallaxY: 0,
    camZ: idealBaseCamZ,
    targetCamZ: idealBaseCamZ,
    panX: 0,
    panY: 0,
    targetPanX: 0,
    targetPanY: 0,
    isDragging: false,
    dragMoved: false,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (!divingSystemId) {
      orbitRef.current.targetCamZ = Math.max(
        9.5,
        Math.min(34, idealBaseCamZ / Math.max(0.7, userZoom))
      );
    }
  }, [userZoom, divingSystemId, idealBaseCamZ]);

  const star3DPositions = useMemo(() => {
    const map = new Map<string, THREE.Vector3>();
    // In portrait viewports, slightly compress horizontal spread so stars never touch screen edges
    const spreadX = vp.isMobilePortrait ? 15.2 : vp.isTabletPortrait ? 16.8 : 18.5;
    const spreadY = vp.isMobileLandscape ? 9.6 : 11.2;
    constellations.forEach((sys, idx) => {
      const x = ((sys.xRatio ?? 0.5) - 0.5) * spreadX;
      const y = (0.5 - (sys.yRatio ?? 0.5)) * spreadY;
      const z = Math.sin(idx * 1.1) * 1.65;
      map.set(sys.id, new THREE.Vector3(x, y, z));
    });
    return map;
  }, [constellations, vp.isMobilePortrait, vp.isTabletPortrait, vp.isMobileLandscape]);

  useEffect(() => {
    if (!focusedSystemId || divingSystemId) return;
    const pos = star3DPositions.get(focusedSystemId);
    if (pos) {
      orbitRef.current.targetPanX = pos.x * 0.25;
      orbitRef.current.targetPanY = pos.y * 0.25;
    }
  }, [focusedSystemId, star3DPositions, divingSystemId]);

  const triggerZoomIntoSolarSystem = useCallback(
    (sys: ConstellationSystemNode) => {
      if (divingSystemId) return;
      setDivingSystemId(sys.id);
      const pos = star3DPositions.get(sys.id);
      if (pos) {
        orbitRef.current.targetRotY = 0;
        orbitRef.current.targetRotX = 0;
        orbitRef.current.targetPanX = pos.x * 0.92;
        orbitRef.current.targetPanY = pos.y * 0.92;
        orbitRef.current.targetCamZ = Math.max(2.2, pos.z + 2.6);
      }
      window.setTimeout(() => {
        onEnterSolarSystem(sys);
      }, 380);
    },
    [divingSystemId, onEnterSolarSystem, star3DPositions]
  );

  const handleStarClick = useCallback(
    (sys: ConstellationSystemNode) => {
      if (focusedSystemId === sys.id) {
        triggerZoomIntoSolarSystem(sys);
        return;
      }
      setFocusedSystemId(sys.id);
      onSelectPausedConstellation?.(sys.id);
      const pos = star3DPositions.get(sys.id);
      if (pos) {
        orbitRef.current.targetPanX = pos.x * 0.25;
        orbitRef.current.targetPanY = pos.y * 0.25;
        orbitRef.current.targetCamZ = 15.2;
      }
    },
    [
      focusedSystemId,
      onSelectPausedConstellation,
      star3DPositions,
      triggerZoomIntoSolarSystem,
    ]
  );

  // Twinkling micro-points overlay canvas for the Constellation layer
  useEffect(() => {
    const canvas = twinkleCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = screenWidth || canvas.parentElement?.clientWidth || 1024;
    const h = screenHeight || canvas.parentElement?.clientHeight || 768;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const microCount = 210;
    const microStars = Array.from({ length: microCount }, (_, i) => {
      const s1 = (i + 1) * 7919;
      const rx = ((s1 * 293) % 10000) / 10000;
      const ry = ((s1 * 643) % 10000) / 10000;
      const radius =
        i % 16 === 0 ? 1.4 : i % 6 === 0 ? 0.95 : 0.5 + (i % 3) * 0.16;
      const speed = 1.2 + ((i * 41) % 30) * 0.14;
      const phase = ((i * 59) % 100) * 0.0628;
      const color =
        i % 5 === 0
          ? '195, 225, 255'
          : i % 8 === 0
          ? '255, 238, 205'
          : '255, 255, 255';
      return { rx, ry, radius, speed, phase, color };
    });

    const renderTwinkle = (now: number) => {
      rafId = requestAnimationFrame(renderTwinkle);
      const t = now * 0.001;
      ctx.clearRect(0, 0, w, h);

      for (let i = 0; i < microStars.length; i++) {
        const ms = microStars[i];
        const wave = 0.5 + 0.5 * Math.sin(t * ms.speed + ms.phase);
        const twinkle = Math.pow(wave, 2.0);
        const alpha = 0.08 + twinkle * 0.88;
        const x = ms.rx * w;
        const y = ms.ry * h;

        ctx.fillStyle = `rgba(${ms.color}, ${alpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(x, y, ms.radius, 0, Math.PI * 2);
        ctx.fill();

        if (ms.radius >= 1.2 && twinkle > 0.76) {
          const arm = ms.radius * (2.5 + twinkle * 2.0);
          ctx.strokeStyle = `rgba(${ms.color}, ${((twinkle - 0.72) * 1.4).toFixed(3)})`;
          ctx.lineWidth = 0.55;
          ctx.beginPath();
          ctx.moveTo(x - arm, y);
          ctx.lineTo(x + arm, y);
          ctx.moveTo(x, y - arm);
          ctx.lineTo(x, y + arm);
          ctx.stroke();
        }
      }
    };

    rafId = requestAnimationFrame(renderTwinkle);
    return () => cancelAnimationFrame(rafId);
  }, [screenWidth, screenHeight]);

  // Build Realistic 3D Constellation Scene (Pure Optical Starburst Flares + Twinkling 3D Micro-Stars + Parallax + Auto-Rotation)
  useEffect(() => {
    const holder = canvasHolderRef.current;
    if (!holder) return;

    const width = screenWidth || holder.clientWidth || 800;
    const height = screenHeight || holder.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 200);
    camera.position.set(0, 0, orbitRef.current.camZ);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    holder.innerHTML = '';
    holder.appendChild(renderer.domElement);

    // 1. 3D Twinkling Micro-Starfield Group (moves in intermediate parallax depth)
    const starfieldParallaxGroup = new THREE.Group();
    scene.add(starfieldParallaxGroup);

    const bgCount = 360;
    const bgPos = new Float32Array(bgCount * 3);
    const bgCol = new Float32Array(bgCount * 3);
    const bgPhase = new Float32Array(bgCount);
    for (let i = 0; i < bgCount; i++) {
      bgPos[i * 3] = (Math.random() - 0.5) * 62;
      bgPos[i * 3 + 1] = (Math.random() - 0.5) * 40;
      bgPos[i * 3 + 2] = -4 - Math.random() * 28;
      const b = 0.65 + Math.random() * 0.35;
      bgCol[i * 3] = b * 0.88;
      bgCol[i * 3 + 1] = b * 0.94;
      bgCol[i * 3 + 2] = b;
      bgPhase[i] = Math.random() * Math.PI * 2;
    }
    const bgGeo = new THREE.BufferGeometry();
    bgGeo.setAttribute('position', new THREE.BufferAttribute(bgPos, 3));
    bgGeo.setAttribute('color', new THREE.BufferAttribute(bgCol, 3));
    bgGeo.setAttribute('aPhase', new THREE.BufferAttribute(bgPhase, 1));

    const bgTwinkleMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
      },
      vertexShader: `
        attribute float aPhase;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uTime;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          float tw = 0.5 + 0.5 * sin(uTime * 2.4 + aPhase * 3.0);
          vAlpha = 0.15 + pow(tw, 2.2) * 0.85;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = (2.2 + tw * 2.1) * uPixelRatio * (14.0 / max(6.0, -mvPosition.z));
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float core = smoothstep(0.5, 0.05, dist);
          gl_FragColor = vec4(vColor, core * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    starfieldParallaxGroup.add(new THREE.Points(bgGeo, bgTwinkleMat));

    // 2. Rotatable 3D Constellation Glow Group (Foreground Parallax + Gentle Auto-Rotation)
    const constellationGroup = new THREE.Group();
    scene.add(constellationGroup);

    // 3. Crisp Luminous White-Blue Constellation Lines (matching reference photo)
    const lineVertices: number[] = [];
    CONSTELLATION_6_CONNECTIONS.forEach(([fromId, toId]) => {
      const fromPos = star3DPositions.get(fromId);
      const toPos = star3DPositions.get(toId);
      if (fromPos && toPos) {
        lineVertices.push(fromPos.x, fromPos.y, fromPos.z);
        lineVertices.push(toPos.x, toPos.y, toPos.z);
      }
    });

    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(lineVertices, 3)
    );
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.92,
    });
    constellationGroup.add(new THREE.LineSegments(lineGeo, lineMat));

    // Soft blue aura line behind the crisp white line
    const auraLineMat = new THREE.LineBasicMaterial({
      color: 0x60a5fa,
      transparent: true,
      opacity: 0.45,
    });
    const auraLines = new THREE.LineSegments(lineGeo, auraLineMat);
    auraLines.position.z = -0.02;
    constellationGroup.add(auraLines);

    // 4. Create the 6 Realistic Optical Starburst Flares (80% smaller as requested)
    const starburstTex = getRealisticStarburstTexture();
    const softHaloTex = getSoftHaloTexture();

    const starFlareNodes = new Map<
      string,
      {
        group: THREE.Group;
        primaryFlare: THREE.Sprite;
        secondaryFlare: THREE.Sprite;
        ambientBloom: THREE.Sprite;
      }
    >();

    constellations.forEach((sys) => {
      const pos = star3DPositions.get(sys.id) || new THREE.Vector3();
      const sGroup = new THREE.Group();
      sGroup.position.copy(pos);

      const bloomMat = new THREE.SpriteMaterial({
        map: softHaloTex,
        color: new THREE.Color('#60a5fa'),
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const ambientBloom = new THREE.Sprite(bloomMat);
      ambientBloom.scale.setScalar(1.04);
      sGroup.add(ambientBloom);

      const primaryMat = new THREE.SpriteMaterial({
        map: starburstTex,
        color: new THREE.Color('#ffffff'),
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const primaryFlare = new THREE.Sprite(primaryMat);
      primaryFlare.scale.setScalar(0.88);
      sGroup.add(primaryFlare);

      const secondaryMat = new THREE.SpriteMaterial({
        map: starburstTex,
        color: new THREE.Color('#bfdbfe'),
        transparent: true,
        opacity: 0.78,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const secondaryFlare = new THREE.Sprite(secondaryMat);
      secondaryFlare.scale.setScalar(0.68);
      sGroup.add(secondaryFlare);

      constellationGroup.add(sGroup);
      starFlareNodes.set(sys.id, {
        group: sGroup,
        primaryFlare,
        secondaryFlare,
        ambientBloom,
      });
    });

    let rafId = 0;
    let lastTime = performance.now();
    const tempVec = new THREE.Vector3();
    let frameCounter = 0;

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;
      const t = now * 0.001;
      const st = orbitRef.current;

      bgTwinkleMat.uniforms.uTime.value = t;

      // Rotação sutil e suave na constelação
      if (!st.isDragging) {
        st.autoRotPhase += dt * 0.02;
      }
      const autoYaw = Math.sin(st.autoRotPhase) * 0.015;
      const autoPitch = 0;
      const autoRoll = 0;

      st.rotY += (st.targetRotY - st.rotY) * 0.08;
      st.rotX += (st.targetRotX - st.rotX) * 0.08;
      st.pointerParallaxX += (st.targetPointerParallaxX - st.pointerParallaxX) * 0.07;
      st.pointerParallaxY += (st.targetPointerParallaxY - st.pointerParallaxY) * 0.07;
      st.camZ += (st.targetCamZ - st.camZ) * 0.09;
      st.panX += (st.targetPanX - st.panX) * 0.09;
      st.panY += (st.targetPanY - st.panY) * 0.09;

      // Apply 3D rotation + pointer parallax to the Constellation Glow Group
      const totalRotY = st.rotY + autoYaw + st.pointerParallaxX * 0.03;
      const totalRotX = st.rotX + autoPitch + st.pointerParallaxY * 0.02;
      constellationGroup.rotation.y = totalRotY;
      constellationGroup.rotation.x = totalRotX;
      constellationGroup.rotation.z = autoRoll;

      // Apply counter/intermediate parallax to the 3D twinkling starfield layer
      starfieldParallaxGroup.rotation.y = totalRotY * 0.42;
      starfieldParallaxGroup.rotation.x = totalRotX * 0.42;
      starfieldParallaxGroup.position.x = -st.panX * 0.35 - st.pointerParallaxX * 0.65;
      starfieldParallaxGroup.position.y = -st.panY * 0.35 + st.pointerParallaxY * 0.45;

      // Apply multi-depth CSS parallax to the Galactic Background & Micro-Twinkle Canvas
      const px = totalRotY * 34 + st.panX * 4.5 + st.pointerParallaxX * 18;
      const py = totalRotX * 28 - st.panY * 4.5 + st.pointerParallaxY * 14;
      if (bgParallaxLayerRef.current) {
        bgParallaxLayerRef.current.style.transform = `translate3d(${(-px * 0.65).toFixed(
          2
        )}px, ${(-py * 0.65).toFixed(2)}px, 0) scale(1.12)`;
      }
      if (twinkleParallaxLayerRef.current) {
        twinkleParallaxLayerRef.current.style.transform = `translate3d(${(-px * 1.15).toFixed(
          2
        )}px, ${(-py * 1.15).toFixed(2)}px, 0) scale(1.08)`;
      }

      camera.position.set(st.panX, st.panY, st.camZ);
      camera.lookAt(st.panX * 0.85, st.panY * 0.85, 0);

      let idx = 0;
      starFlareNodes.forEach((item) => {
        const shimmer = 1 + Math.sin(t * 2.2 + idx * 1.3) * 0.07;
        item.primaryFlare.scale.setScalar(0.87 * shimmer);
        item.secondaryFlare.scale.setScalar(0.67 / shimmer);
        item.secondaryFlare.material.rotation = 0.35 + Math.sin(t * 0.4 + idx) * 0.06;
        idx++;
      });

      renderer.render(scene, camera);

      frameCounter++;
      if (frameCounter % 2 === 0) {
        const nextProj: typeof projectedStars = [];
        starFlareNodes.forEach((item, id) => {
          item.group.getWorldPosition(tempVec);
          const dist = camera.position.distanceTo(tempVec);
          tempVec.project(camera);
          const sx = (tempVec.x * 0.5 + 0.5) * width;
          const sy = (-tempVec.y * 0.5 + 0.5) * height;
          const visible =
            tempVec.z < 1.0 &&
            sx >= -60 &&
            sx <= width + 60 &&
            sy >= -60 &&
            sy <= height + 60;
          const scale = Math.max(0.7, Math.min(1.45, 16.0 / Math.max(4, dist)));
          nextProj.push({
            id,
            x: sx,
            y: sy,
            scale,
            visible,
            zDepth: tempVec.z,
          });
        });
        setProjectedStars(nextProj);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      bgGeo.dispose();
      bgTwinkleMat.dispose();
      lineGeo.dispose();
      lineMat.dispose();
      auraLineMat.dispose();
    };
  }, [constellations, star3DPositions, screenWidth, screenHeight]);

  const handlePointerDown = (e: React.PointerEvent) => {
    orbitRef.current.isDragging = true;
    orbitRef.current.dragMoved = false;
    orbitRef.current.startX = e.clientX;
    orbitRef.current.startY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
      orbitRef.current.targetPointerParallaxX = nx;
      orbitRef.current.targetPointerParallaxY = ny;
    }

    if (!orbitRef.current.isDragging) return;
    const dx = e.clientX - orbitRef.current.startX;
    const dy = e.clientY - orbitRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      orbitRef.current.dragMoved = true;
    }
    orbitRef.current.startX = e.clientX;
    orbitRef.current.startY = e.clientY;

    orbitRef.current.targetRotY = Math.max(
      -0.85,
      Math.min(0.85, orbitRef.current.targetRotY + dx * 0.0045)
    );
    orbitRef.current.targetRotX = Math.max(
      -0.55,
      Math.min(0.55, orbitRef.current.targetRotX + dy * 0.004)
    );
  };

  const handlePointerUp = () => {
    orbitRef.current.isDragging = false;
  };

  const activeStar = useMemo(
    () => constellations.find((c) => c.id === focusedSystemId) || null,
    [constellations, focusedSystemId]
  );

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const nextZ = orbitRef.current.targetCamZ + e.deltaY * 0.011;
    if (nextZ < 8.8 && (activeStar || constellations[0]) && e.deltaY < 0) {
      triggerZoomIntoSolarSystem(activeStar || constellations[0]);
      return;
    }
    orbitRef.current.targetCamZ = Math.max(9.5, Math.min(24, nextZ));
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none bg-[#020308] cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        handlePointerUp();
        orbitRef.current.targetPointerParallaxX = 0;
        orbitRef.current.targetPointerParallaxY = 0;
      }}
      onClick={() => {
        if (!orbitRef.current.dragMoved) {
          setFocusedSystemId(null);
          onSelectPausedConstellation?.(null);
        }
      }}
      onWheel={handleWheel}
    >
      {/* Layer 0: Deep Space Galactic Band Image with Parallax */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div
          ref={bgParallaxLayerRef}
          className="absolute inset-0 bg-center bg-cover bg-no-repeat will-change-transform"
          style={{
            backgroundImage: `url('${DEEP_SPACE_GALACTIC_BG_URL}')`,
            transform: 'translate3d(0px, 0px, 0) scale(1.12)',
          }}
        />
        {/* Layer 0.5: Twinkling Micro-Points of Light Overlay with Parallax */}
        <div
          ref={twinkleParallaxLayerRef}
          className="absolute inset-0 will-change-transform"
          style={{
            transform: 'translate3d(0px, 0px, 0) scale(1.08)',
          }}
        >
          <canvas
            ref={twinkleCanvasRef}
            className="w-full h-full block opacity-95"
          />
        </div>
      </div>

      {/* Layer 1: Three.js 3D Constellation Glow Group + 3D Twinkling Depth Stars */}
      <div
        ref={canvasHolderRef}
        className="absolute inset-0 z-10 pointer-events-none"
      />

      {/* Invisible Hit Targets over the 6 Realistic Star Flares + Popup ONLY when clicked/hovered */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {projectedStars.map((proj) => {
          if (!proj.visible) return null;
          const sys = constellations.find((s) => s.id === proj.id);
          if (!sys) return null;
          const isFocused = focusedSystemId === sys.id;
          const isHovered = hoveredSystemId === sys.id;
          const isExpanded = isFocused || isHovered;
          const totalBodies =
            (sys.planets?.length || 0) +
            (sys.planets || []).reduce((acc, p) => acc + (p.moons?.length || 0), 0);

          return (
            <div
              key={sys.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${proj.x}px`,
                top: `${proj.y}px`,
                transform: `translate(-50%, -50%) scale(${
                  isFocused ? Math.max(1.05, proj.scale) : proj.scale
                })`,
                zIndex: isFocused
                  ? 90
                  : isHovered
                  ? 80
                  : Math.round((1 - proj.zDepth) * 50),
              }}
              onMouseEnter={() => setHoveredSystemId(sys.id)}
              onMouseLeave={() =>
                setHoveredSystemId((prev) => (prev === sys.id ? null : prev))
              }
            >
              {/* Pure transparent hit area over the realistic star flare */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (orbitRef.current.dragMoved) return;
                  handleStarClick(sys);
                }}
                className="relative w-14 h-14 -m-7 rounded-full flex items-center justify-center cursor-pointer focus:outline-none"
                title={sys.name}
              />

              {/* Popup appears ONLY when clicked or hovered, clamped so it never clips off-screen */}
              {isExpanded && (
                <div
                  className="relative -top-6 cursor-pointer"
                  style={{
                    transform:
                      proj.x > screenWidth * 0.72
                        ? 'translateX(-38%)'
                        : proj.x < screenWidth * 0.22
                        ? 'translateX(22%)'
                        : undefined,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFocused) {
                      triggerZoomIntoSolarSystem(sys);
                    } else {
                      handleStarClick(sys);
                    }
                  }}
                >
                  <OrnateMapMarkerPin
                    name={sys.name}
                    iconEmoji="✦"
                    badgeText={
                      isFocused
                        ? `${totalBodies} MUNDOS • CLIQUE P/ ENTRAR`
                        : `${totalBodies} PLANETAS/LUAS`
                    }
                    isSelected={isFocused}
                    isFocused={isFocused}
                    sizeVariant="sm"
                    hideTopAsset={true}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Destination Capsule ("Ir até [Sistema Estelar]") */}
      {activeStar && (
        <AstralDestinationCapsule
          visible={Boolean(activeStar)}
          categoryLabel="ESTRELA SELECIONADA"
          destinationName={activeStar.name}
          subtitle={activeStar.subtitle}
          accentColor="#93c5fd"
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          actionLabel={`IR ATÉ ${activeStar.name.split('•').pop()?.trim() || activeStar.name}`}
          onConfirm={() => triggerZoomIntoSolarSystem(activeStar)}
        />
      )}
    </div>
  );
};

/**
 * ============================================================================
 * 2. 3D SOLAR SYSTEM LAYER VIEW
 * ============================================================================
 * - Central Sun is a pure realistic optical starburst flare (matching the reference photo,
 *   zero opaque ball!).
 * - Populated with 6–7 celestial bodies per star (40 planets & moons across the 6 stars),
 *   each spinning 360° with its 2:1 Equirectangular UV texture.
 */
export interface SolarSystemLayerViewProps {
  project: MapProject;
  activeConstellation?: ConstellationSystemNode | null;
  screenWidth: number;
  screenHeight: number;
  userZoom?: number;
  pausedPlanetId?: string | null;
  onSelectPausedPlanet?: (id: string | null) => void;
  onEnterPlanetGlobe: (planet: SolarSystemPlanet) => void;
  onBackToConstellation?: () => void;
}

export const SolarSystemLayerView: React.FC<SolarSystemLayerViewProps> = ({
  project,
  activeConstellation,
  screenWidth,
  screenHeight,
  userZoom = 1.0,
  pausedPlanetId,
  onSelectPausedPlanet,
  onEnterPlanetGlobe,
  onBackToConstellation,
}) => {
  const canvasHolderRef = useRef<HTMLDivElement>(null);
  const vp = useMemo(
    () => detectMapViewportProfile(screenWidth, screenHeight),
    [screenWidth, screenHeight]
  );
  const idealSolarDist = useMemo(() => {
    if (vp.isMobilePortrait) return 31;
    if (vp.isTabletPortrait) return 26.5;
    if (vp.isMobileLandscape) return 21.5;
    return 23;
  }, [vp]);

  const config = useMemo(() => getOrCreatePlanetGlobeConfig(project), [project]);
  const system = activeConstellation || config.constellations?.[0] || null;
  const planets = useMemo(
    () => system?.planets || config.planets || [],
    [system, config.planets]
  );

  const [focusedBodyId, setFocusedBodyId] = useState<string | null>(
    pausedPlanetId || planets[0]?.id || null
  );
  const [hoveredBodyId, setHoveredBodyId] = useState<string | null>(null);
  const [approachingBodyId, setApproachingBodyId] = useState<string | null>(null);

  const [projectedBodies, setProjectedBodies] = useState<
    Array<{
      id: string;
      name: string;
      isMoon: boolean;
      accentColor: string;
      markerCount: number;
      x: number;
      y: number;
      visible: boolean;
      zDepth: number;
      planetObj: SolarSystemPlanet;
    }>
  >([]);

  useEffect(() => {
    if (pausedPlanetId) {
      setFocusedBodyId(pausedPlanetId);
    } else if (planets[0]) {
      setFocusedBodyId(planets[0].id);
    }
  }, [pausedPlanetId, planets, system?.id]);

  const camStateRef = useRef({
    azimuth: 0.25,
    elevation: 0.56,
    targetAzimuth: 0.25,
    targetElevation: 0.56,
    distance: idealSolarDist,
    targetDistance: idealSolarDist,
    lookAt: new THREE.Vector3(0, 0, 0),
    targetLookAt: new THREE.Vector3(0, 0, 0),
    isDragging: false,
    dragMoved: false,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (!approachingBodyId) {
      camStateRef.current.targetDistance = Math.max(
        8.5,
        Math.min(42, idealSolarDist / Math.max(0.7, userZoom))
      );
    }
  }, [userZoom, approachingBodyId, idealSolarDist]);

  const triggerApproachPlanet = useCallback(
    (planetObj: SolarSystemPlanet) => {
      if (approachingBodyId) return;
      setApproachingBodyId(planetObj.id);
      camStateRef.current.targetDistance = 4.0;
      camStateRef.current.targetElevation = 0.16;
      window.setTimeout(() => {
        onEnterPlanetGlobe(planetObj);
      }, 380);
    },
    [approachingBodyId, onEnterPlanetGlobe]
  );

  const handleBodyClick = useCallback(
    (bodyId: string, planetObj: SolarSystemPlanet) => {
      if (focusedBodyId === bodyId) {
        triggerApproachPlanet(planetObj);
        return;
      }
      setFocusedBodyId(bodyId);
      onSelectPausedPlanet?.(bodyId);
      // Aproxima a câmera do planeta para inspeção e rotação em 360 graus
      camStateRef.current.targetDistance = 6.2;
    },
    [focusedBodyId, onSelectPausedPlanet, triggerApproachPlanet]
  );

  // Build Three.js 3D Solar System Scene with Realistic Starburst Sun + 40 Populated UV 2:1 Worlds
  useEffect(() => {
    const holder = canvasHolderRef.current;
    if (!holder) return;

    const width = screenWidth || holder.clientWidth || 800;
    const height = screenHeight || holder.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 300);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    holder.innerHTML = '';
    holder.appendChild(renderer.domElement);

    const starCount = 500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 120;
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.14,
      transparent: true,
      opacity: 0.5,
    });
    scene.add(new THREE.Points(starGeo, starMat));

    // Central Sun as a Pure Realistic Optical Starburst Flare (NO solid ball!)
    const starburstTex = getRealisticStarburstTexture();
    const softHaloTex = getSoftHaloTexture();

    const sunBloomMat = new THREE.SpriteMaterial({
      map: softHaloTex,
      color: new THREE.Color('#60a5fa'),
      transparent: true,
      opacity: 0.72,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunBloom = new THREE.Sprite(sunBloomMat);
    sunBloom.scale.setScalar(14.5);
    scene.add(sunBloom);

    const sunPrimaryFlareMat = new THREE.SpriteMaterial({
      map: starburstTex,
      color: new THREE.Color('#ffffff'),
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunPrimaryFlare = new THREE.Sprite(sunPrimaryFlareMat);
    sunPrimaryFlare.scale.setScalar(11.5);
    scene.add(sunPrimaryFlare);

    const sunSecondaryFlareMat = new THREE.SpriteMaterial({
      map: starburstTex,
      color: new THREE.Color('#bfdbfe'),
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const sunSecondaryFlare = new THREE.Sprite(sunSecondaryFlareMat);
    sunSecondaryFlare.scale.setScalar(8.8);
    scene.add(sunSecondaryFlare);

    const uvLib = config.uvTextureLibrary || getDefaultUvTextureLibrary();

    const bodyRegistry = new Map<
      string,
      {
        id: string;
        name: string;
        isMoon: boolean;
        accentColor: string;
        markerCount: number;
        mesh: THREE.Object3D;
        sphereMesh: THREE.Mesh;
        orbitRadius: number;
        orbitSpeed: number;
        selfRotateSpeed: number;
        baseAngle: number;
        parentId?: string;
        planetObj: SolarSystemPlanet;
      }
    >();

    const sphereGeo = new THREE.SphereGeometry(1, 64, 32);
    const disposables: Array<{ dispose: () => void }> = [
      starGeo,
      starMat,
      sunBloomMat,
      sunPrimaryFlareMat,
      sunSecondaryFlareMat,
      sphereGeo,
    ];

    planets.forEach((planet, pIdx) => {
      const orbitRadius =
        4.2 + (planet.orbitRadiusRatio || 0.16 + pIdx * 0.15) * 23.5;

      const orbitPoints: THREE.Vector3[] = [];
      const segments = 128;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        orbitPoints.push(
          new THREE.Vector3(
            Math.cos(theta) * orbitRadius,
            0,
            Math.sin(theta) * orbitRadius * 0.88
          )
        );
      }
      const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
      const orbitMat = new THREE.LineBasicMaterial({
        color: new THREE.Color('#93c5fd'),
        transparent: true,
        opacity: 0.28,
      });
      scene.add(new THREE.Line(orbitGeo, orbitMat));
      disposables.push(orbitGeo, orbitMat);

      const planetGroup = new THREE.Group();
      const planetRadius = Math.max(
        0.68,
        Math.min(1.42, (planet.sizePx || 60) / 54)
      );

      const uvUrl =
        planet.uvTexturePng ||
        config.uvTexturePng ||
        uvLib[pIdx % Math.max(1, uvLib.length)]?.url ||
        DEFAULT_PLANET_IMAGE_URL;
      const uvTex = getOrLoadPlanetTexture(uvUrl, true);
      const mat = create3DEquirectangularUvMaterial({
        texture: uvTex,
        atmosphereColor: planet.glowColor || '#38bdf8',
      });
      disposables.push(mat);

      const planetMesh = new THREE.Mesh(sphereGeo, mat);
      planetMesh.scale.setScalar(planetRadius);
      planetMesh.rotation.z = 0.18;
      planetGroup.add(planetMesh);

      const pHaloMat = new THREE.SpriteMaterial({
        map: softHaloTex,
        color: new THREE.Color(planet.glowColor || '#38bdf8'),
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const pHalo = new THREE.Sprite(pHaloMat);
      pHalo.scale.setScalar(planetRadius * 2.9);
      planetGroup.add(pHalo);
      disposables.push(pHaloMat);

      if (planet.hasRings) {
        const ringGeo = new THREE.RingGeometry(
          planetRadius * 1.38,
          planetRadius * 2.15,
          64
        );
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(planet.glowColor || '#fde68a'),
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI * 0.42;
        ringMesh.rotation.y = 0.22;
        planetGroup.add(ringMesh);
        disposables.push(ringGeo, ringMat);
      }

      scene.add(planetGroup);

      bodyRegistry.set(planet.id, {
        id: planet.id,
        name: planet.name,
        isMoon: false,
        accentColor: planet.glowColor || '#38bdf8',
        markerCount: planet.markers?.length || 4,
        mesh: planetGroup,
        sphereMesh: planetMesh,
        orbitRadius,
        orbitSpeed: ((planet.orbitSpeed || 10) * Math.PI) / 180 * 0.04,
        selfRotateSpeed: 0.02,
        baseAngle: ((planet.initialAngleDeg || pIdx * 72) * Math.PI) / 180,
        planetObj: planet,
      });

      // Orbiting 3D Moons
      (planet.moons || []).forEach((moon, mIdx) => {
        const moonOrbitR = planetRadius * 1.75 + mIdx * 0.62;
        const moonRadius = Math.max(
          0.24,
          Math.min(0.42, (moon.sizePx || 18) / 54)
        );

        const moonGroup = new THREE.Group();
        const moonUvUrl =
          moon.uvTexturePng ||
          uvLib[(pIdx + mIdx + 5) % Math.max(1, uvLib.length)]?.url ||
          uvUrl;
        const moonTex = getOrLoadPlanetTexture(moonUvUrl, true);
        const moonMat = create3DEquirectangularUvMaterial({
          texture: moonTex,
          atmosphereColor: '#e2e8f0',
        });
        disposables.push(moonMat);

        const moonMesh = new THREE.Mesh(sphereGeo, moonMat);
        moonMesh.scale.setScalar(moonRadius);
        moonGroup.add(moonMesh);
        scene.add(moonGroup);

        const moonAsPlanet: SolarSystemPlanet = {
          id: moon.id,
          name: moon.name,
          description: `Lua orbital de ${planet.name}`,
          planetImagePng:
            moon.imagePng ||
            planet.planetImagePng ||
            config.planetImagePng ||
            DEFAULT_PLANET_IMAGE_URL,
          uvTexturePng: moonUvUrl,
          markerIconEmoji: moon.markerIconEmoji || '🌙',
          glowColor: '#94a3b8',
          hasRings: false,
          sizePx: 48,
          targetWorldMapId: moon.targetWorldMapId || planet.targetWorldMapId,
          status: moon.status || 'unlocked',
          markers:
            moon.markers && moon.markers.length > 0
              ? moon.markers
              : buildDefaultMarkersForPlanet(moon.id, moon.name, project),
          moons: [],
        };

        bodyRegistry.set(moon.id, {
          id: moon.id,
          name: moon.name,
          isMoon: true,
          accentColor: '#cbd5e1',
          markerCount: moonAsPlanet.markers?.length || 3,
          mesh: moonGroup,
          sphereMesh: moonMesh,
          orbitRadius: moonOrbitR,
          orbitSpeed: ((moon.orbitSpeed || 20) * Math.PI) / 180 * 0.05,
          selfRotateSpeed: 0.02,
          baseAngle: ((moon.initialAngleDeg || mIdx * 140) * Math.PI) / 180,
          parentId: planet.id,
          planetObj: moonAsPlanet,
        });
      });
    });

    let rafId = 0;
    let simTime = 0;
    let lastTime = performance.now();
    let frameCounter = 0;
    const tempVec = new THREE.Vector3();

    const animate = (now: number) => {
      rafId = requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) * 0.001);
      lastTime = now;

      // Pausa a translação quando o usuário estiver inspecionando ou aproximando de um planeta focado
      if (!approachingBodyId && !focusedBodyId) {
        simTime += dt;
      }

      bodyRegistry.forEach((body) => {
        if (!body.isMoon) {
          const angle = body.baseAngle + simTime * body.orbitSpeed;
          const x = Math.cos(angle) * body.orbitRadius;
          const z = Math.sin(angle) * body.orbitRadius * 0.88;
          body.mesh.position.set(x, 0, z);
          body.sphereMesh.rotation.y += dt * (body.selfRotateSpeed || 0.02);
        }
      });

      bodyRegistry.forEach((body) => {
        if (body.isMoon && body.parentId) {
          const parent = bodyRegistry.get(body.parentId);
          if (parent) {
            const angle = body.baseAngle + simTime * body.orbitSpeed;
            const mx =
              parent.mesh.position.x + Math.cos(angle) * body.orbitRadius;
            const my = Math.sin(angle * 1.3) * (body.orbitRadius * 0.22);
            const mz =
              parent.mesh.position.z + Math.sin(angle) * body.orbitRadius;
            body.mesh.position.set(mx, my, mz);
            body.sphereMesh.rotation.y += dt * (body.selfRotateSpeed || 0.02);
          }
        }
      });

      const cs = camStateRef.current;
      if (focusedBodyId && bodyRegistry.has(focusedBodyId)) {
        const targetBody = bodyRegistry.get(focusedBodyId)!;
        cs.targetLookAt.copy(targetBody.mesh.position);
      } else {
        cs.targetLookAt.set(0, 0, 0);
      }

      cs.azimuth += (cs.targetAzimuth - cs.azimuth) * 0.09;
      cs.elevation += (cs.targetElevation - cs.elevation) * 0.09;
      cs.distance += (cs.targetDistance - cs.distance) * 0.09;
      cs.lookAt.lerp(cs.targetLookAt, 0.1);

      const camX =
        cs.lookAt.x +
        cs.distance * Math.cos(cs.elevation) * Math.sin(cs.azimuth);
      const camY = cs.lookAt.y + cs.distance * Math.sin(cs.elevation);
      const camZ =
        cs.lookAt.z +
        cs.distance * Math.cos(cs.elevation) * Math.cos(cs.azimuth);

      camera.position.set(camX, camY, camZ);
      camera.lookAt(cs.lookAt);

      // Shimmer the realistic central Sun starburst flare
      const sunPulse = 1 + Math.sin(now * 0.0022) * 0.06;
      sunPrimaryFlare.scale.setScalar(11.5 * sunPulse);
      sunSecondaryFlare.scale.setScalar(8.8 / sunPulse);
      sunSecondaryFlare.material.rotation = now * 0.00015;

      renderer.render(scene, camera);

      frameCounter++;
      if (frameCounter % 2 === 0) {
        const list: typeof projectedBodies = [];
        bodyRegistry.forEach((body) => {
          tempVec.copy(body.mesh.position);
          tempVec.project(camera);
          const sx = (tempVec.x * 0.5 + 0.5) * width;
          const sy = (-tempVec.y * 0.5 + 0.5) * height;
          const visible =
            tempVec.z < 1.0 &&
            sx >= -60 &&
            sx <= width + 60 &&
            sy >= -60 &&
            sy <= height + 60;
          list.push({
            id: body.id,
            name: body.name,
            isMoon: body.isMoon,
            accentColor: body.accentColor,
            markerCount: body.markerCount,
            x: sx,
            y: sy,
            visible,
            zDepth: tempVec.z,
            planetObj: body.planetObj,
          });
        });
        setProjectedBodies(list);
      }
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      disposables.forEach((d) => d.dispose());
    };
  }, [
    system,
    planets,
    focusedBodyId,
    approachingBodyId,
    config.planetImagePng,
    config.uvTexturePng,
    config.uvTextureLibrary,
    project,
    screenWidth,
    screenHeight,
  ]);

  const handlePointerDown = (e: React.PointerEvent) => {
    camStateRef.current.isDragging = true;
    camStateRef.current.dragMoved = false;
    camStateRef.current.startX = e.clientX;
    camStateRef.current.startY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!camStateRef.current.isDragging) return;
    const dx = e.clientX - camStateRef.current.startX;
    const dy = e.clientY - camStateRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      camStateRef.current.dragMoved = true;
    }
    camStateRef.current.startX = e.clientX;
    camStateRef.current.startY = e.clientY;

    camStateRef.current.targetAzimuth -= dx * 0.0055;
    camStateRef.current.targetElevation = Math.max(
      0.12,
      Math.min(1.35, camStateRef.current.targetElevation + dy * 0.0045)
    );
  };

  const handlePointerUp = () => {
    camStateRef.current.isDragging = false;
  };

  const activeBody = useMemo(
    () =>
      projectedBodies.find((b) => b.id === focusedBodyId) ||
      projectedBodies[0] ||
      null,
    [projectedBodies, focusedBodyId]
  );

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const nextDist = camStateRef.current.targetDistance + e.deltaY * 0.016;
    if (nextDist < 7.5 && activeBody && e.deltaY < 0) {
      triggerApproachPlanet(activeBody.planetObj);
      return;
    }
    if (nextDist > 35 && e.deltaY > 0 && onBackToConstellation) {
      onBackToConstellation();
      return;
    }
    camStateRef.current.targetDistance = Math.max(8.5, Math.min(35, nextDist));
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none bg-[#050814] cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <RealisticDeepSpaceBackdrop intensity={0.95} />

      <div
        ref={canvasHolderRef}
        className="absolute inset-0 z-10 pointer-events-none"
      />

      <div className="absolute inset-0 z-20 pointer-events-none">
        {projectedBodies.map((body) => {
          if (!body.visible) return null;
          const isFocused = focusedBodyId === body.id;
          const isHovered = hoveredBodyId === body.id;
          const isExpanded = isFocused || isHovered;

          return (
            <div
              key={body.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${body.x}px`,
                top: `${body.y}px`,
                transform: 'translate(-50%, -50%)',
                zIndex: isFocused
                  ? 95
                  : isHovered
                  ? 85
                  : Math.round((1 - body.zDepth) * 50),
              }}
              onMouseEnter={() => setHoveredBodyId(body.id)}
              onMouseLeave={() =>
                setHoveredBodyId((prev) => (prev === body.id ? null : prev))
              }
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (camStateRef.current.dragMoved) return;
                  handleBodyClick(body.id, body.planetObj);
                }}
                className={`rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center ${
                  body.isMoon ? 'w-9 h-9 -m-4.5' : 'w-14 h-14 -m-7'
                }`}
                title={body.name}
              >
                {isFocused && (
                  <span
                    className="w-full h-full rounded-full border-2 border-[#fde047] shadow-[0_0_20px_rgba(253,224,71,0.65)] animate-pulse"
                    style={{ borderColor: body.accentColor }}
                  />
                )}
              </button>

              {isExpanded && (
                <div
                  className="relative -top-6 cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isFocused) {
                      triggerApproachPlanet(body.planetObj);
                    } else {
                      handleBodyClick(body.id, body.planetObj);
                    }
                  }}
                >
                  <OrnateMapMarkerPin
                    name={body.name}
                    iconEmoji={body.planetObj.markerIconEmoji || '🪐'}
                    badgeText={
                      isFocused
                        ? `${body.markerCount} REGIÕES • CLIQUE P/ MERGULHAR`
                        : body.isMoon
                        ? 'LUA 3D'
                        : 'PLANETA 3D'
                    }
                    isSelected={isFocused}
                    isFocused={isFocused}
                    sizeVariant="sm"
                    hideTopAsset={true}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {activeBody && (
        <AstralDestinationCapsule
          visible={Boolean(activeBody)}
          categoryLabel={
            activeBody.isMoon ? 'LUA 3D SELECIONADA' : 'PLANETA 3D SELECIONADO'
          }
          destinationName={activeBody.name}
          subtitle={`${activeBody.markerCount} continentes no mergulho PNG`}
          accentColor={activeBody.accentColor}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          actionLabel={`IR ATÉ ${activeBody.name}`}
          onConfirm={() => triggerApproachPlanet(activeBody.planetObj)}
        />
      )}
    </div>
  );
};

/**
 * ============================================================================
 * 3. PLANET DIVE CLOSE-UP VIEW (`PlanetGlobeEmulatorView`)
 * ============================================================================
 */
export interface PlanetGlobeEmulatorViewProps {
  project: MapProject;
  activePlanet?: SolarSystemPlanet | null;
  screenWidth: number;
  screenHeight: number;
  userZoom?: number;
  externalFocusedMarkerId?: string | null;
  availableMaps?: WorldMapConfig[];
  onOpenEditorTab?: () => void;
  onSelectRegionMarker: (
    marker: PlanetGlobeMarker,
    targetMap?: WorldMapConfig
  ) => void;
  onBackToSolarSystem?: () => void;
}

export const PlanetGlobeEmulatorView: React.FC<PlanetGlobeEmulatorViewProps> = ({
  project,
  activePlanet,
  screenWidth,
  screenHeight,
  userZoom = 1.0,
  externalFocusedMarkerId,
  availableMaps = [],
  onSelectRegionMarker,
  onBackToSolarSystem,
}) => {
  const canvasHolderRef = useRef<HTMLDivElement>(null);
  const config = useMemo(() => getOrCreatePlanetGlobeConfig(project), [project]);

  const planetId = activePlanet?.id || 'planet-slimelands';
  const planetName = activePlanet?.name || config.title || 'Mundo de Slimelands';
  const uvTextureUrl =
    activePlanet?.uvTexturePng ||
    config.uvTexturePng ||
    OFFICIAL_40_UV_TEXTURES[0]?.url ||
    DEFAULT_PLANET_IMAGE_URL;
  const planetImageUrl =
    activePlanet?.planetImagePng ||
    config.planetImagePng ||
    DEFAULT_PLANET_IMAGE_URL;
  const atmosphereColor =
    activePlanet?.glowColor || config.glowColor || '#38bdf8';
  const hasRings = Boolean(activePlanet?.hasRings);

  const markers = useMemo(() => {
    const raw =
      activePlanet?.markers && activePlanet.markers.length > 0
        ? activePlanet.markers
        : config.markers && config.markers.length > 0
        ? config.markers
        : buildDefaultMarkersForPlanet(planetId, planetName, project);
    return raw.map((m) => ({
      ...m,
      nx: normalizeMarkerCoord(m.nx),
      ny: normalizeMarkerCoord(m.ny),
    }));
  }, [activePlanet, config.markers, planetId, planetName, project]);

  const [selectedMarker, setSelectedMarker] =
    useState<PlanetGlobeMarker | null>(() => markers[0] || null);
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);
  const [divingMarkerId, setDivingMarkerId] = useState<string | null>(null);

  const [projectedMarkers, setProjectedMarkers] = useState<
    Array<{
      id: string;
      x: number;
      y: number;
      visible: boolean;
    }>
  >([]);

  const globeViewRef = useRef({
    tiltX: 0,
    tiltY: 0,
    targetTiltX: 0,
    targetTiltY: 0,
    camZ: 2.32,
    targetCamZ: 2.32,
    camPanX: 0,
    camPanY: 0,
    targetCamPanX: 0,
    targetCamPanY: 0,
    isDragging: false,
    dragMoved: false,
    startX: 0,
    startY: 0,
  });

  useEffect(() => {
    if (!divingMarkerId) {
      globeViewRef.current.targetCamZ = Math.max(
        1.65,
        Math.min(3.35, 2.32 / Math.max(0.75, userZoom))
      );
    }
  }, [userZoom, divingMarkerId]);

  useEffect(() => {
    if (externalFocusedMarkerId) {
      const found = markers.find((m) => m.id === externalFocusedMarkerId);
      if (found) {
        setSelectedMarker(found);
        globeViewRef.current.targetTiltY = -found.nx * 0.28;
        globeViewRef.current.targetTiltX = found.ny * 0.28;
        return;
      }
    }
    setSelectedMarker(markers[0] || null);
  }, [externalFocusedMarkerId, markers, planetId]);

  const triggerEnterRegion = useCallback(
    (marker: PlanetGlobeMarker) => {
      if (divingMarkerId) return;
      setDivingMarkerId(marker.id);

      const local3D = markerNormalizedToSphereLocal3D(marker.nx, marker.ny, 1.0);
      globeViewRef.current.targetTiltX = 0;
      globeViewRef.current.targetTiltY = 0;
      globeViewRef.current.targetCamPanX = local3D.x * 0.82;
      globeViewRef.current.targetCamPanY = local3D.y * 0.82;
      globeViewRef.current.targetCamZ = 1.15;

      const matchedMap =
        availableMaps.find((m) => m.id === marker.targetWorldMapId) ||
        availableMaps[0];

      window.setTimeout(() => {
        onSelectRegionMarker(marker, matchedMap);
      }, 340);
    },
    [availableMaps, divingMarkerId, onSelectRegionMarker]
  );

  const handleMarkerClick = useCallback(
    (marker: PlanetGlobeMarker) => {
      if (selectedMarker?.id === marker.id) {
        triggerEnterRegion(marker);
        return;
      }
      setSelectedMarker(marker);
      globeViewRef.current.targetTiltY = -marker.nx * 0.28;
      globeViewRef.current.targetTiltX = marker.ny * 0.28;
    },
    [selectedMarker, triggerEnterRegion]
  );

  useEffect(() => {
    const holder = canvasHolderRef.current;
    if (!holder) return;

    const width = screenWidth || holder.clientWidth || 800;
    const height = screenHeight || holder.clientHeight || 600;

    const scene = new THREE.Scene();
    const minDimRatio = width < height ? height / Math.max(1, width) : 1.0;
    const fov = Math.min(62, Math.max(38, 40 * Math.pow(minDimRatio, 0.48)));
    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.05, 100);
    camera.position.set(0, 0, globeViewRef.current.camZ);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      return;
    }

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    holder.innerHTML = '';
    holder.appendChild(renderer.domElement);

    const planetRoot = new THREE.Group();
    scene.add(planetRoot);

    const sphereGeo = new THREE.SphereGeometry(1.0, 64, 64);
    // Usa a mesma textura equirretangular 2:1 da visualização planetária
    const tex = getOrLoadPlanetTexture(uvTextureUrl, true);
    const planetMat = create3DEquirectangularUvMaterial({
      texture: tex,
      atmosphereColor,
    });
    const planetMesh = new THREE.Mesh(sphereGeo, planetMat);
    planetRoot.add(planetMesh);

    const softHaloTex = getSoftHaloTexture();
    const haloMat = new THREE.SpriteMaterial({
      map: softHaloTex,
      color: new THREE.Color(atmosphereColor),
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const haloSprite = new THREE.Sprite(haloMat);
    haloSprite.scale.setScalar(2.75);
    planetRoot.add(haloSprite);

    let ringGeo: THREE.RingGeometry | null = null;
    let ringMat: THREE.MeshBasicMaterial | null = null;
    if (hasRings) {
      ringGeo = new THREE.RingGeometry(1.32, 1.98, 96);
      ringMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(atmosphereColor),
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.rotation.x = Math.PI * 0.41;
      ringMesh.rotation.y = 0.18;
      planetRoot.add(ringMesh);
    }

    const markerAnchors = new Map<string, THREE.Object3D>();
    markers.forEach((m) => {
      const anchor = new THREE.Object3D();
      anchor.position.copy(markerNormalizedToSphereLocal3D(m.nx, m.ny, 1.0));
      planetRoot.add(anchor);
      markerAnchors.set(m.id, anchor);
    });

    let rafId = 0;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const gv = globeViewRef.current;

      gv.tiltX += (gv.targetTiltX - gv.tiltX) * 0.12;
      gv.tiltY += (gv.targetTiltY - gv.tiltY) * 0.12;
      gv.camZ += (gv.targetCamZ - gv.camZ) * 0.11;
      gv.camPanX += (gv.targetCamPanX - gv.camPanX) * 0.12;
      gv.camPanY += (gv.targetCamPanY - gv.camPanY) * 0.12;

      planetRoot.rotation.x = gv.tiltX;
      planetRoot.rotation.y = gv.tiltY;

      camera.position.set(gv.camPanX, gv.camPanY, gv.camZ);
      camera.lookAt(gv.camPanX * 0.9, gv.camPanY * 0.9, 0);

      renderer.render(scene, camera);

      const next: Array<{ id: string; x: number; y: number; visible: boolean }> =
        [];
      const camPos = camera.position;
      const planetCenter = planetRoot.position;
      markerAnchors.forEach((anchor, id) => {
        anchor.getWorldPosition(tempVec);
        // Marcador só é visível se a normal da face estiver apontando em direção à câmera
        const toCamX = camPos.x - tempVec.x;
        const toCamY = camPos.y - tempVec.y;
        const toCamZ = camPos.z - tempVec.z;
        const normX = tempVec.x - planetCenter.x;
        const normY = tempVec.y - planetCenter.y;
        const normZ = tempVec.z - planetCenter.z;
        const dot = normX * toCamX + normY * toCamY + normZ * toCamZ;
        const isFacingCamera = dot > 0.05;

        tempVec.project(camera);
        const sx = (tempVec.x * 0.5 + 0.5) * width;
        const sy = (-tempVec.y * 0.5 + 0.5) * height;
        next.push({
          id,
          x: sx,
          y: sy,
          visible: isFacingCamera && tempVec.z < 1.0,
        });
      });
      setProjectedMarkers(next);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      renderer.dispose();
      sphereGeo.dispose();
      planetMat.dispose();
      haloMat.dispose();
      if (ringGeo) ringGeo.dispose();
      if (ringMat) ringMat.dispose();
    };
  }, [
    planetId,
    planetImageUrl,
    atmosphereColor,
    hasRings,
    markers,
    screenWidth,
    screenHeight,
  ]);

  const handlePointerDown = (e: React.PointerEvent) => {
    globeViewRef.current.isDragging = true;
    globeViewRef.current.dragMoved = false;
    globeViewRef.current.startX = e.clientX;
    globeViewRef.current.startY = e.clientY;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!globeViewRef.current.isDragging) return;
    const dx = e.clientX - globeViewRef.current.startX;
    const dy = e.clientY - globeViewRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      globeViewRef.current.dragMoved = true;
    }
    globeViewRef.current.startX = e.clientX;
    globeViewRef.current.startY = e.clientY;

    // Rotação livre e contínua 360 graus na horizontal (Y) e ampla na vertical (X)
    globeViewRef.current.targetTiltY += dx * 0.0075;
    globeViewRef.current.targetTiltX = Math.max(
      -1.35,
      Math.min(1.35, globeViewRef.current.targetTiltX + dy * 0.0065)
    );
  };

  const handlePointerUp = () => {
    globeViewRef.current.isDragging = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.stopPropagation();
    const nextZ = globeViewRef.current.targetCamZ + e.deltaY * 0.0022;
    if (nextZ < 1.55 && selectedMarker && e.deltaY < 0) {
      triggerEnterRegion(selectedMarker);
      return;
    }
    if (nextZ > 3.45 && e.deltaY > 0 && onBackToSolarSystem) {
      onBackToSolarSystem();
      return;
    }
    globeViewRef.current.targetCamZ = Math.max(1.65, Math.min(3.4, nextZ));
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none bg-[#050814] cursor-grab active:cursor-grabbing"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
    >
      <RealisticDeepSpaceBackdrop intensity={0.95} />

      <div
        ref={canvasHolderRef}
        className="absolute inset-0 z-10 pointer-events-none"
      />

      <div className="absolute inset-0 z-20 pointer-events-none">
        {markers.map((marker) => {
          const proj = projectedMarkers.find((p) => p.id === marker.id);
          if (!proj || !proj.visible) return null;

          const isSelected = selectedMarker?.id === marker.id;
          const isHovered = hoveredMarkerId === marker.id;

          return (
            <div
              key={marker.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${proj.x}px`,
                top: `${proj.y}px`,
                transform: 'translate(-50%, -100%)',
                zIndex: isSelected ? 95 : isHovered ? 85 : 50,
              }}
              onMouseEnter={() => setHoveredMarkerId(marker.id)}
              onMouseLeave={() =>
                setHoveredMarkerId((prev) => (prev === marker.id ? null : prev))
              }
            >
              <div
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (globeViewRef.current.dragMoved) return;
                  handleMarkerClick(marker);
                }}
              >
                <OrnateMapMarkerPin
                  name={marker.name}
                  iconPng={marker.iconPng}
                  iconEmoji={marker.iconEmoji || '🏰'}
                  status={marker.status || 'unlocked'}
                  badgeText={
                    isSelected
                      ? 'CLIQUE P/ EXPLORAR'
                      : marker.badgeText || 'REGIÃO'
                  }
                  isSelected={isSelected}
                  isFocused={isSelected || isHovered}
                  scale={marker.scale || 1.0}
                  sizeVariant="md"
                  revealStage={isSelected || isHovered ? 'full' : 'star_only'}
                />
              </div>
            </div>
          );
        })}
      </div>

      {selectedMarker && (
        <AstralDestinationCapsule
          visible={Boolean(selectedMarker)}
          categoryLabel={`REGIÃO DE ${planetName.toUpperCase()}`}
          destinationName={selectedMarker.name}
          subtitle={selectedMarker.badgeText || 'Mapa Regional'}
          accentColor={atmosphereColor}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          actionLabel={`IR ATÉ ${selectedMarker.name}`}
          onConfirm={() => triggerEnterRegion(selectedMarker)}
        />
      )}
    </div>
  );
};

/**
 * ============================================================================
 * 4. PLANET GLOBE & UV 2:1 TEXTURE GALLERY EDITOR SECTION
 * ============================================================================
 */
export interface PlanetGlobeEditorSectionProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedWorldMaps: WorldMapConfig[];
  onSwitchToRegionalMapEditor: (targetMapId: string) => void;
  onCreateNewRegionalMapForMarker: (
    markerId: string,
    markerName: string
  ) => void;
  showToast?: (msg: string) => void;
}

export const PlanetGlobeEditorSection: React.FC<PlanetGlobeEditorSectionProps> = ({
  project,
  setProject,
  savedWorldMaps,
  onSwitchToRegionalMapEditor,
  onCreateNewRegionalMapForMarker,
  showToast,
}) => {
  const config = useMemo(() => getOrCreatePlanetGlobeConfig(project), [project]);
  const constellations = config.constellations || [];
  const uvLibrary = config.uvTextureLibrary || getDefaultUvTextureLibrary();

  const [selectedSysId, setSelectedSysId] = useState<string>(
    constellations[0]?.id || 'sys-solaris-prime'
  );
  const activeSystem =
    constellations.find((c) => c.id === selectedSysId) || constellations[0];

  const [selectedPlanetId, setSelectedPlanetId] = useState<string>(
    activeSystem?.planets?.[0]?.id || 'planet-slimelands'
  );

  useEffect(() => {
    if (
      activeSystem?.planets &&
      !activeSystem.planets.some((p) => p.id === selectedPlanetId)
    ) {
      setSelectedPlanetId(activeSystem.planets[0]?.id || '');
    }
  }, [activeSystem, selectedPlanetId]);

  const activePlanet =
    activeSystem?.planets?.find((p) => p.id === selectedPlanetId) ||
    activeSystem?.planets?.[0];

  const activeMarkers = useMemo(() => {
    if (!activePlanet) return config.markers;
    if (
      activePlanet.id === 'planet-slimelands' ||
      activePlanet.id === 'solar-planet-1'
    ) {
      return config.markers;
    }
    return activePlanet.markers && activePlanet.markers.length > 0
      ? activePlanet.markers
      : buildDefaultMarkersForPlanet(activePlanet.id, activePlanet.name, project);
  }, [activePlanet, config.markers, project]);

  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(
    activeMarkers[0]?.id || null
  );
  const [draggingMarkerId, setDraggingMarkerId] = useState<string | null>(null);
  const discRef = useRef<HTMLDivElement>(null);
  const pngFileInputRef = useRef<HTMLInputElement>(null);
  const uvFileInputRef = useRef<HTMLInputElement>(null);
  const uvLibraryMultiInputRef = useRef<HTMLInputElement>(null);

  const updatePlanetMarkers = (nextMarkers: PlanetGlobeMarker[]) => {
    setProject((prev) => {
      const curr = getOrCreatePlanetGlobeConfig(prev);
      const isMainSlimelands =
        !activePlanet ||
        activePlanet.id === 'planet-slimelands' ||
        activePlanet.id === 'solar-planet-1';

      const nextConstellations = (curr.constellations || []).map((sys) => {
        if (sys.id !== activeSystem?.id) return sys;
        return {
          ...sys,
          planets: (sys.planets || []).map((p) =>
            p.id === activePlanet?.id ? { ...p, markers: nextMarkers } : p
          ),
        };
      });

      return {
        ...prev,
        planetGlobe: {
          ...curr,
          markers: isMainSlimelands ? nextMarkers : curr.markers,
          constellations: nextConstellations,
        },
      };
    });
  };

  const assignUvTextureToActivePlanet = (uvDataUrl: string, label?: string) => {
    if (!activePlanet || !activeSystem) return;
    setProject((prev) => {
      const curr = getOrCreatePlanetGlobeConfig(prev);
      const isMain =
        activePlanet.id === 'planet-slimelands' ||
        activePlanet.id === 'solar-planet-1';
      const nextConstellations = (curr.constellations || []).map((sys) => {
        if (sys.id !== activeSystem.id) return sys;
        return {
          ...sys,
          planets: (sys.planets || []).map((p) =>
            p.id === activePlanet.id ? { ...p, uvTexturePng: uvDataUrl } : p
          ),
        };
      });
      return {
        ...prev,
        planetGlobe: {
          ...curr,
          uvTexturePng: isMain ? uvDataUrl : curr.uvTexturePng,
          constellations: nextConstellations,
        },
      };
    });
    showToast?.(
      `🪐 Textura UV 2:1 ${label ? `"${label}" ` : ''}aplicada à esfera 3D de ${activePlanet.name}!`
    );
  };

  const handleUploadDirectPlanetUv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePlanet || !activeSystem) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      const newItem: PlanetUvTextureItem = {
        id: `uv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name.replace(/\.[^.]+$/, ''),
        url: dataUrl,
        accentColor: activePlanet.glowColor || '#38bdf8',
        createdAt: new Date().toISOString(),
      };
      setProject((prev) => {
        const curr = getOrCreatePlanetGlobeConfig(prev);
        const isMain =
          activePlanet.id === 'planet-slimelands' ||
          activePlanet.id === 'solar-planet-1';
        const nextLib = [newItem, ...(curr.uvTextureLibrary || [])];
        const nextConstellations = (curr.constellations || []).map((sys) => {
          if (sys.id !== activeSystem.id) return sys;
          return {
            ...sys,
            planets: (sys.planets || []).map((p) =>
              p.id === activePlanet.id ? { ...p, uvTexturePng: dataUrl } : p
            ),
          };
        });
        return {
          ...prev,
          planetGlobe: {
            ...curr,
            uvTexturePng: isMain ? dataUrl : curr.uvTexturePng,
            uvTextureLibrary: nextLib,
            constellations: nextConstellations,
          },
        };
      });
      showToast?.(
        `✨ Textura UV 2:1 "${newItem.name}" adicionada à galeria e aplicada em ${activePlanet.name}!`
      );
    };
    reader.readAsDataURL(file);
  };

  const handleBatchUploadUvLibrary = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise<PlanetUvTextureItem | null>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = String(reader.result || '');
              if (!dataUrl) {
                resolve(null);
                return;
              }
              resolve({
                id: `uv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                name: file.name.replace(/\.[^.]+$/, ''),
                url: dataUrl,
                accentColor: '#38bdf8',
                createdAt: new Date().toISOString(),
              });
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(file);
          })
      )
    ).then((items) => {
      const valid = items.filter((x): x is PlanetUvTextureItem => Boolean(x));
      if (valid.length === 0) return;
      setProject((prev) => {
        const curr = getOrCreatePlanetGlobeConfig(prev);
        return {
          ...prev,
          planetGlobe: {
            ...curr,
            uvTextureLibrary: [...valid, ...(curr.uvTextureLibrary || [])],
          },
        };
      });
      showToast?.(
        `🪐 ${valid.length} textura(s) UV 2:1 importada(s) para a Galeria Planetária!`
      );
    });
  };

  const handleDistributeUvAcrossSystem = () => {
    if (!activeSystem || uvLibrary.length === 0) return;
    setProject((prev) => {
      const curr = getOrCreatePlanetGlobeConfig(prev);
      const nextConstellations = (curr.constellations || []).map((sys) => {
        if (sys.id !== activeSystem.id) return sys;
        return {
          ...sys,
          planets: (sys.planets || []).map((p, idx) => ({
            ...p,
            uvTexturePng: uvLibrary[idx % uvLibrary.length].url,
            moons: (p.moons || []).map((m, mIdx) => ({
              ...m,
              uvTexturePng:
                uvLibrary[(idx + mIdx + 1) % uvLibrary.length].url,
            })),
          })),
        };
      });
      return {
        ...prev,
        planetGlobe: {
          ...curr,
          constellations: nextConstellations,
        },
      };
    });
    showToast?.(
      `✨ Texturas UV 2:1 distribuídas pelos planetas e luas de ${activeSystem.name}!`
    );
  };

  const handleDeleteUvFromLibrary = (uvId: string) => {
    setProject((prev) => {
      const curr = getOrCreatePlanetGlobeConfig(prev);
      return {
        ...prev,
        planetGlobe: {
          ...curr,
          uvTextureLibrary: (curr.uvTextureLibrary || []).filter(
            (item) => item.id !== uvId
          ),
        },
      };
    });
  };

  const handleUploadPlanetPng = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePlanet || !activeSystem) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      if (!dataUrl) return;
      setProject((prev) => {
        const curr = getOrCreatePlanetGlobeConfig(prev);
        const isMain =
          activePlanet.id === 'planet-slimelands' ||
          activePlanet.id === 'solar-planet-1';
        const nextConstellations = (curr.constellations || []).map((sys) => {
          if (sys.id !== activeSystem.id) return sys;
          return {
            ...sys,
            planets: (sys.planets || []).map((p) =>
              p.id === activePlanet.id ? { ...p, planetImagePng: dataUrl } : p
            ),
          };
        });
        return {
          ...prev,
          planetGlobe: {
            ...curr,
            planetImagePng: isMain ? dataUrl : curr.planetImagePng,
            constellations: nextConstellations,
          },
        };
      });
      showToast?.('✨ PNG de Mergulho do Planeta atualizado!');
    };
    reader.readAsDataURL(file);
  };

  const handlePointerMoveDisc = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingMarkerId || !discRef.current) return;
    const rect = discRef.current.getBoundingClientRect();
    const ratioX = (e.clientX - rect.left) / rect.width;
    const ratioY = (e.clientY - rect.top) / rect.height;
    const nx = normalizeMarkerCoord((ratioX - 0.5) * 2);
    const ny = normalizeMarkerCoord((ratioY - 0.5) * 2);
    const updated = activeMarkers.map((m) =>
      m.id === draggingMarkerId
        ? { ...m, nx: Number(nx.toFixed(3)), ny: Number(ny.toFixed(3)) }
        : m
    );
    updatePlanetMarkers(updated);
  };

  const handleAddMarker = () => {
    const firstMapId =
      project.worldMap?.id || savedWorldMaps[0]?.id || 'world-map-main';
    const newMarker: PlanetGlobeMarker = {
      id: `p-marker-${Date.now().toString(36)}`,
      name: `Nova Região ${activeMarkers.length + 1}`,
      description: 'Clique para viajar diretamente para o mapa regional.',
      nx: 0,
      ny: 0,
      iconEmoji: '🏰',
      targetWorldMapId: firstMapId,
      status: 'unlocked',
      badgeText: 'REGIÃO',
      scale: 1.0,
    };
    const next = [...activeMarkers, newMarker];
    updatePlanetMarkers(next);
    setSelectedMarkerId(newMarker.id);
    showToast?.('✨ Novo marcador adicionado à superfície do planeta!');
  };

  const selectedMarker =
    activeMarkers.find((m) => m.id === selectedMarkerId) ||
    activeMarkers[0] ||
    null;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="rounded-2xl border border-amber-500/30 bg-slate-950/90 p-5 space-y-4 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Globe className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">
                  Atlas Astral 3D • 6 Estrelas Realistas & 40 Planetas/Luas (UV 2:1 + PNG)
                </h3>
                <p className="text-xs text-slate-400">
                  Use suas texturas retangulares UV 2:1 para girar em 360° no Sistema Solar 3D, e os PNGs ilustrados para o mergulho close-up com marcadores fixos!
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                1. Estrela da Constelação (6 Sistemas Populados • 40 Mundos)
              </label>
              <select
                value={selectedSysId}
                onChange={(e) => setSelectedSysId(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-semibold"
              >
                {constellations.map((sys) => {
                  const moonCount = (sys.planets || []).reduce(
                    (acc, p) => acc + (p.moons?.length || 0),
                    0
                  );
                  return (
                    <option key={sys.id} value={sys.id}>
                      {sys.name} ({sys.planets?.length || 0} planetas + {moonCount} luas)
                    </option>
                  );
                })}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                2. Planeta Selecionado neste Sistema Solar
              </label>
              <select
                value={activePlanet?.id || ''}
                onChange={(e) => setSelectedPlanetId(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-xs text-white font-semibold"
              >
                {(activeSystem?.planets || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* SECTION A: GALERIA DE TEXTURAS RETANGULARES UV 2:1 (SISTEMA PLANETÁRIO 3D) */}
        <div className="rounded-2xl border border-cyan-500/35 bg-slate-950/90 p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <Layers className="w-5 h-5 text-cyan-400" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-300">
                  Galeria de Texturas Retangulares UV 2:1 (Visão Sistema Planetário 3D)
                </h4>
                <p className="text-[11px] text-slate-400">
                  Importe suas texturas retangulares equiretangulares (2:1) e clique em qualquer textura abaixo para aplicá-la à esfera 3D de{' '}
                  <strong className="text-white">{activePlanet?.name}</strong>.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={uvLibraryMultiInputRef}
                type="file"
                multiple
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={handleBatchUploadUvLibrary}
              />
              <button
                type="button"
                onClick={() => uvLibraryMultiInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 text-xs font-bold flex items-center gap-1.5 hover:bg-cyan-500/30 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                + Importar Texturas UV 2:1 (Lote)
              </button>

              <button
                type="button"
                onClick={handleDistributeUvAcrossSystem}
                className="px-3 py-2 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-200 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-500/30 cursor-pointer"
                title="Distribuir automaticamente as texturas da galeria pelos planetas deste sistema solar"
              >
                <Wand2 className="w-3.5 h-3.5" />
                Distribuir no Sistema Atual
              </button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="relative w-44 aspect-[2/1] rounded-lg overflow-hidden border-2 border-cyan-400/60 bg-black shrink-0 shadow-md">
              <img
                src={activePlanet?.uvTexturePng || uvLibrary[0]?.url}
                alt="UV 2:1 Ativa"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[9px] font-bold text-cyan-300 border border-cyan-400/40">
                UV 2:1 ATIVA
              </span>
            </div>

            <div className="flex-1 min-w-0 space-y-1 text-center sm:text-left">
              <div className="text-xs font-bold text-white">
                Textura Esférica 3D Atual de <span className="text-cyan-300">{activePlanet?.name}</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Esta textura retangular 2:1 é mapeada em 360° ao redor da esfera 3D do planeta enquanto ele gira e orbita o sol na camada do Sistema Planetário.
              </p>
            </div>

            <div>
              <input
                ref={uvFileInputRef}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={handleUploadDirectPlanetUv}
              />
              <button
                type="button"
                onClick={() => uvFileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shrink-0 shadow"
              >
                <Upload className="w-3.5 h-3.5" />
                Enviar UV 2:1 p/ {activePlanet?.name}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {uvLibrary.map((uvItem) => {
              const isAssigned = activePlanet?.uvTexturePng === uvItem.url;
              return (
                <div
                  key={uvItem.id}
                  onClick={() =>
                    assignUvTextureToActivePlanet(uvItem.url, uvItem.name)
                  }
                  className={`group relative rounded-xl overflow-hidden border transition-all cursor-pointer flex flex-col bg-slate-900 ${
                    isAssigned
                      ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg'
                      : 'border-slate-800 hover:border-cyan-400/60'
                  }`}
                >
                  <div className="relative w-full aspect-[2/1] bg-black overflow-hidden">
                    <img
                      src={uvItem.url}
                      alt={uvItem.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                    {isAssigned && (
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md bg-cyan-500 text-slate-950 text-[9px] font-black uppercase flex items-center gap-1 shadow">
                        <Check className="w-3 h-3 stroke-[3]" />
                        Em Uso
                      </div>
                    )}
                    {!uvItem.id.startsWith('uv-preset-') && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteUvFromLibrary(uvItem.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-rose-950/85 text-rose-300 hover:bg-rose-600 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remover da galeria"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="px-2.5 py-1.5 flex items-center justify-between gap-1">
                    <span className="text-[10px] font-bold text-slate-200 truncate">
                      {uvItem.name}
                    </span>
                    <span className="text-[9px] font-bold text-cyan-400 shrink-0">
                      Aplicar
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* SECTION B: PNG DO MERGULHO PLANETÁRIO + EDITOR DE MARCADORES FIXOS 1:1 */}
        <div className="rounded-2xl border border-amber-500/35 bg-slate-950/90 p-5 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <ImageIcon className="w-5 h-5 text-amber-400" />
              <div>
                <h4 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-amber-300">
                  PNG Ilustrado do Mergulho Close-up & Marcadores Fixos ({activePlanet?.name})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Quando o jogador dá o mergulho no planeta, este PNG ilustrado é exibido em 3D com os marcadores de continentes 100% cravados nas coordenadas abaixo.
                </p>
              </div>
            </div>

            <div>
              <input
                ref={pngFileInputRef}
                type="file"
                accept="image/png,image/webp,image/jpeg"
                className="hidden"
                onChange={handleUploadPlanetPng}
              />
              <button
                type="button"
                onClick={() => pngFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow"
              >
                <Upload className="w-3.5 h-3.5" />
                Trocar PNG de Mergulho ({activePlanet?.name})
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            <div
              ref={discRef}
              onPointerMove={handlePointerMoveDisc}
              onPointerUp={() => setDraggingMarkerId(null)}
              onPointerLeave={() => setDraggingMarkerId(null)}
              className="relative aspect-square w-full max-w-[380px] mx-auto rounded-2xl border border-slate-800 bg-[#030712] overflow-hidden select-none shadow-inner"
            >
              <img
                src={
                  activePlanet?.planetImagePng ||
                  config.planetImagePng ||
                  DEFAULT_PLANET_IMAGE_URL
                }
                alt={activePlanet?.name || 'Planeta'}
                className="w-full h-full object-contain pointer-events-none select-none"
                draggable={false}
              />
              {activeMarkers.map((m) => {
                const isSel = selectedMarker?.id === m.id;
                const leftPct = (m.nx * 0.5 + 0.5) * 100;
                const topPct = (m.ny * 0.5 + 0.5) * 100;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      setSelectedMarkerId(m.id);
                      setDraggingMarkerId(m.id);
                    }}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      transform: 'translate(-50%, -50%)',
                    }}
                    className={`absolute px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-transform cursor-move ${
                      isSel
                        ? 'bg-amber-400 text-slate-950 border-white scale-110 z-20 shadow-lg'
                        : 'bg-slate-900/90 text-amber-200 border-amber-400/50 hover:scale-105 z-10'
                    }`}
                  >
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <MapPin className="w-3 h-3" />
                      {m.name}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300">
                  Continentes / Regiões Fixas no PNG ({activeMarkers.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddMarker}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold hover:bg-emerald-500/30 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Nova Região
                </button>
              </div>

              {selectedMarker && (
                <div className="space-y-3 rounded-xl bg-slate-900/90 border border-slate-800 p-4">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Nome do Continente / Região
                    </label>
                    <input
                      type="text"
                      value={selectedMarker.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        updatePlanetMarkers(
                          activeMarkers.map((m) =>
                            m.id === selectedMarker.id ? { ...m, name: val } : m
                          )
                        );
                      }}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Selo / Subtítulo
                    </label>
                    <input
                      type="text"
                      value={selectedMarker.badgeText || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        updatePlanetMarkers(
                          activeMarkers.map((m) =>
                            m.id === selectedMarker.id
                              ? { ...m, badgeText: val }
                              : m
                          )
                        );
                      }}
                      className="w-full rounded-lg bg-slate-950 border border-slate-700 px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">
                      Mapa Regional Vinculado
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={selectedMarker.targetWorldMapId || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          updatePlanetMarkers(
                            activeMarkers.map((m) =>
                              m.id === selectedMarker.id
                                ? { ...m, targetWorldMapId: val }
                                : m
                            )
                          );
                        }}
                        className="flex-1 rounded-lg bg-slate-950 border border-slate-700 px-2.5 py-1.5 text-xs text-white"
                      >
                        {savedWorldMaps.map((wm) => (
                          <option key={wm.id} value={wm.id}>
                            {wm.title || wm.id}
                          </option>
                        ))}
                      </select>
                      {selectedMarker.targetWorldMapId && (
                        <button
                          type="button"
                          onClick={() =>
                            onSwitchToRegionalMapEditor(
                              selectedMarker.targetWorldMapId!
                            )
                          }
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-400/40 text-indigo-200 text-xs font-bold flex items-center gap-1 hover:bg-indigo-600/50 cursor-pointer"
                          title="Abrir Editor deste Mapa Regional"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Editar
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() =>
                        onCreateNewRegionalMapForMarker(
                          selectedMarker.id,
                          selectedMarker.name
                        )
                      }
                      className="text-[11px] font-bold text-amber-300 hover:text-amber-200 cursor-pointer"
                    >
                      + Criar Novo Mapa Regional Exclusivo
                    </button>

                    {activeMarkers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const filtered = activeMarkers.filter(
                            (m) => m.id !== selectedMarker.id
                          );
                          updatePlanetMarkers(filtered);
                          setSelectedMarkerId(filtered[0]?.id || null);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-rose-500/20 text-rose-300 text-[11px] font-bold hover:bg-rose-500/30 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
