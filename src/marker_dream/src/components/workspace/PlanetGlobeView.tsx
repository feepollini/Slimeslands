import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type {
  MapProject,
  PlanetGlobeConfig,
  PlanetGlobeMarker,
  SolarSystemPlanet,
  SolarSystemMoon,
  ConstellationSystemNode,
  AstralStarKind,
  WorldMapConfig,
} from '../../types/map';
import {
  OrnateMapMarkerPin,
  playConstellationStarNote,
  playMarkersUnfurlChime,
} from './OrnateMapMarkerPin';
import {
  Plus,
  Trash2,
  Upload,
  Compass,
  Play,
  Pause,
  ExternalLink,
  Sun,
  Globe,
  Orbit,
} from 'lucide-react';
import { readUploadedImage } from '../../utils/tileGenerator';
import { uploadFileToDisk } from '../../../../core/DiskAssetEngine';

export const DEFAULT_PLANET_IMAGE_URL =
  '/assets/aistudio/Planeta_ilustrado_com_fundo_transparente_d21f7d80.png';

export function buildDefaultMarkersForPlanet(
  planetId: string,
  planetName: string,
  project: MapProject
): PlanetGlobeMarker[] {
  const savedMaps = project.savedWorldMaps || (project.worldMap ? [project.worldMap] : []);
  const primaryMapId = project.worldMap?.id || savedMaps[0]?.id || 'map-main-default';
  const primaryPoiPng =
    project.worldMap?.pointsOfInterest?.find((p) => p.iconPng && !p.isInvisible)?.iconPng ||
    undefined;

  return [
    {
      id: `${planetId}-reg-1`,
      name: project.worldMap?.title || `Capital de ${planetName}`,
      nx: 0.0,
      ny: -0.34,
      iconPng: primaryPoiPng,
      iconEmoji: '🏰',
      targetWorldMapId: primaryMapId,
      status: 'unlocked',
      scale: 1.0,
    },
    {
      id: `${planetId}-reg-2`,
      name: savedMaps[1]?.title || 'Cordilheira de Cristal',
      nx: -0.44,
      ny: -0.22,
      iconPng: savedMaps[1]?.pointsOfInterest?.find((p) => p.iconPng)?.iconPng,
      iconEmoji: '⛰️',
      targetWorldMapId: savedMaps[1]?.id || primaryMapId,
      status: 'unlocked',
      scale: 1.0,
    },
    {
      id: `${planetId}-reg-3`,
      name: savedMaps[2]?.title || 'Santuário das Águas',
      nx: 0.44,
      ny: -0.24,
      iconPng: savedMaps[2]?.pointsOfInterest?.find((p) => p.iconPng)?.iconPng,
      iconEmoji: '🏛️',
      targetWorldMapId: savedMaps[2]?.id || primaryMapId,
      status: 'unlocked',
      scale: 1.0,
    },
    {
      id: `${planetId}-reg-4`,
      name: 'Observatório Astral',
      nx: 0.16,
      ny: -0.58,
      iconEmoji: '🔮',
      targetWorldMapId: primaryMapId,
      status: 'unlocked',
      scale: 1.0,
    },
  ];
}

export function getOrCreatePlanetGlobeConfig(project: MapProject): PlanetGlobeConfig {
  const existing = project.planetGlobe;
  const savedMaps = project.savedWorldMaps || (project.worldMap ? [project.worldMap] : []);
  const primaryMapId = project.worldMap?.id || savedMaps[0]?.id || 'map-main-default';
  const primaryPoiPng =
    project.worldMap?.pointsOfInterest?.find((p) => p.iconPng && !p.isInvisible)?.iconPng ||
    undefined;

  const basePlanetPng = existing?.planetImagePng || DEFAULT_PLANET_IMAGE_URL;
  const fallbackGlobeMarkers =
    existing?.markers && existing.markers.length > 0
      ? existing.markers
      : buildDefaultMarkersForPlanet('solar-planet-1', 'Planeta Gaia', project);

  const defaultPlanets: SolarSystemPlanet[] = [
    {
      id: 'solar-planet-1',
      name: project.worldMap?.title || 'Planeta Gaia',
      description: 'Mundo primordial de florestas e cidadelas reais.',
      planetImagePng: basePlanetPng,
      markerIconPng: primaryPoiPng,
      markerIconEmoji: '🏰',
      glowColor: '#38bdf8',
      hasRings: false,
      sizePx: 44,
      orbitRadiusRatio: 0.28,
      orbitSpeed: 4.6,
      selfRotateSpeed: 8,
      initialAngleDeg: 78,
      targetWorldMapId: primaryMapId,
      status: 'unlocked',
      scale: 1.0,
      markers: fallbackGlobeMarkers,
      moons: [
        {
          id: 'moon-gaia-1',
          name: 'Lua de Prata',
          imagePng: basePlanetPng,
          markerIconEmoji: '🌙',
          sizePx: 16,
          orbitRadiusPx: 56,
          orbitSpeed: 20,
          initialAngleDeg: 35,
          targetWorldMapId: savedMaps[1]?.id || primaryMapId,
          status: 'unlocked',
        },
      ],
    },
    {
      id: 'solar-planet-2',
      name: savedMaps[1]?.title || 'Planeta Cristália',
      description: 'Mundo gelado cercado por luas gêmeas.',
      planetImagePng: basePlanetPng,
      markerIconPng: savedMaps[1]?.pointsOfInterest?.find((p) => p.iconPng)?.iconPng,
      markerIconEmoji: '⛰️',
      glowColor: '#a855f7',
      hasRings: false,
      sizePx: 38,
      orbitRadiusRatio: 0.47,
      orbitSpeed: 3.1,
      selfRotateSpeed: 6,
      initialAngleDeg: 215,
      targetWorldMapId: savedMaps[1]?.id || primaryMapId,
      status: 'unlocked',
      scale: 1.0,
      markers: buildDefaultMarkersForPlanet('solar-planet-2', 'Planeta Cristália', project),
      moons: [
        {
          id: 'moon-cristalia-1',
          name: 'Lua Boreal',
          imagePng: basePlanetPng,
          markerIconEmoji: '❄️',
          sizePx: 15,
          orbitRadiusPx: 54,
          orbitSpeed: 22,
          initialAngleDeg: 0,
          targetWorldMapId: savedMaps[1]?.id || primaryMapId,
          status: 'unlocked',
        },
      ],
    },
    {
      id: 'solar-planet-3',
      name: savedMaps[2]?.title || 'Planeta Aurélia',
      description: 'Gigante dourado cercado por anéis astrais.',
      planetImagePng: basePlanetPng,
      markerIconPng: savedMaps[2]?.pointsOfInterest?.find((p) => p.iconPng)?.iconPng,
      markerIconEmoji: '🪐',
      glowColor: '#f59e0b',
      hasRings: true,
      sizePx: 48,
      orbitRadiusRatio: 0.66,
      orbitSpeed: 2.1,
      selfRotateSpeed: 5,
      initialAngleDeg: 325,
      targetWorldMapId: savedMaps[2]?.id || primaryMapId,
      status: 'unlocked',
      scale: 1.0,
      markers: buildDefaultMarkersForPlanet('solar-planet-3', 'Planeta Aurélia', project),
      moons: [
        {
          id: 'moon-aurelia-1',
          name: 'Satélite Dourado',
          imagePng: basePlanetPng,
          markerIconEmoji: '✨',
          sizePx: 16,
          orbitRadiusPx: 62,
          orbitSpeed: 17,
          initialAngleDeg: 110,
          targetWorldMapId: savedMaps[2]?.id || primaryMapId,
          status: 'unlocked',
        },
      ],
    },
    {
      id: 'solar-planet-4',
      name: 'Planeta Ignis',
      description: 'Órbita externa de vulcões e fortalezas ancestrais.',
      planetImagePng: basePlanetPng,
      markerIconEmoji: '🌋',
      glowColor: '#f43f5e',
      hasRings: false,
      sizePx: 36,
      orbitRadiusRatio: 0.84,
      orbitSpeed: 1.4,
      selfRotateSpeed: 4,
      initialAngleDeg: 145,
      targetWorldMapId: primaryMapId,
      status: 'unlocked',
      scale: 1.0,
      markers: buildDefaultMarkersForPlanet('solar-planet-4', 'Planeta Ignis', project),
      moons: [],
    },
  ];

  const resolvedPlanets =
    existing && Array.isArray(existing.planets) && existing.planets.length > 0
      ? existing.planets.map((p, idx) => ({
          ...p,
          // Garante planetas mais compactos e arcos maiores mesmo em projetos antigos
          sizePx: p.sizePx && p.sizePx > 58 ? Math.round(p.sizePx * 0.56) : p.sizePx || 42,
          orbitRadiusRatio:
            p.orbitRadiusRatio ?? Math.min(0.86, 0.28 + idx * 0.19),
          moons: (p.moons || []).map((m) => ({
            ...m,
            // Garante luas um pouco mais afastadas do planeta para facilitar visualização e clique
            orbitRadiusPx: m.orbitRadiusPx && m.orbitRadiusPx < 48 ? 54 : m.orbitRadiusPx || 56,
          })),
          markers:
            p.markers && p.markers.length > 0
              ? p.markers
              : idx === 0
              ? fallbackGlobeMarkers
              : buildDefaultMarkersForPlanet(p.id, p.name, project),
        }))
      : defaultPlanets;

  const defaultConstellations: ConstellationSystemNode[] = [
    {
      id: 'constellation-1',
      name: existing?.systemName || 'Constelação da Coroa Astral',
      subtitle: 'Sistema Binário Safira & Ouro',
      description: 'Berço estelar de Gaia, Cristália e Aurélia governado por uma estrela dupla.',
      xRatio: 0.28,
      yRatio: 0.34,
      glowColor: '#38bdf8',
      secondaryColor: '#fde047',
      starType: 'binary',
      markerIconPng: primaryPoiPng,
      markerIconEmoji: '👑',
      sunName: existing?.sunName || 'Sol Binário Astral',
      status: 'unlocked',
      scale: 1.0,
      patternStars: [
        { dx: -0.105, dy: -0.048, size: 6.0, color: '#60a5fa', starType: 'single', connectFromIndex: 1 },
        { dx: -0.058, dy: -0.095, size: 7.5, color: '#38bdf8', secondaryColor: '#f472b6', starType: 'binary', connectFromIndex: 2 },
        { dx: 0.0, dy: 0.0, size: 11.0, color: '#38bdf8', secondaryColor: '#fde047', starType: 'binary' },
        { dx: 0.055, dy: -0.088, size: 7.0, color: '#fde047', starType: 'supergiant', connectFromIndex: 2 },
        { dx: 0.108, dy: -0.028, size: 6.2, color: '#a78bfa', starType: 'single', connectFromIndex: 3 },
        { dx: 0.072, dy: 0.058, size: 6.8, color: '#34d399', secondaryColor: '#ffffff', starType: 'binary', connectFromIndex: 4 },
        { dx: -0.012, dy: 0.078, size: 5.8, color: '#fb923c', starType: 'single', connectFromIndex: 2 },
        { dx: -0.078, dy: 0.042, size: 6.4, color: '#22d3ee', starType: 'pulsar', connectFromIndex: 6 },
        { dx: -0.025, dy: -0.138, size: 5.2, color: '#fef08a', starType: 'single', connectFromIndex: 1 },
      ],
      planets: resolvedPlanets,
    },
    {
      id: 'constellation-2',
      name: 'Constelação do Dragão Boreal',
      subtitle: 'Sistema Supergigante Violeta',
      description: 'Antiga constelação guardiã das estrelas de cristal e pulsares boreais.',
      xRatio: 0.71,
      yRatio: 0.27,
      glowColor: '#a855f7',
      secondaryColor: '#22d3ee',
      starType: 'supergiant',
      markerIconPng: savedMaps[1]?.pointsOfInterest?.find((p) => p.iconPng)?.iconPng,
      markerIconEmoji: '🐉',
      sunName: 'Supergigante Sirius Violeta',
      status: 'unlocked',
      scale: 1.0,
      patternStars: [
        { dx: -0.115, dy: 0.065, size: 5.8, color: '#f472b6', starType: 'single', connectFromIndex: 1 },
        { dx: -0.065, dy: 0.028, size: 7.2, color: '#c084fc', secondaryColor: '#38bdf8', starType: 'binary', connectFromIndex: 2 },
        { dx: 0.0, dy: 0.0, size: 11.5, color: '#a855f7', secondaryColor: '#22d3ee', starType: 'supergiant' },
        { dx: 0.048, dy: -0.068, size: 6.8, color: '#22d3ee', starType: 'pulsar', connectFromIndex: 2 },
        { dx: 0.102, dy: -0.088, size: 7.5, color: '#f43f5e', secondaryColor: '#fde047', starType: 'binary', connectFromIndex: 3 },
        { dx: 0.135, dy: -0.025, size: 5.6, color: '#fef08a', starType: 'single', connectFromIndex: 4 },
        { dx: 0.062, dy: 0.055, size: 6.5, color: '#38bdf8', starType: 'nebula_star', connectFromIndex: 2 },
        { dx: -0.042, dy: -0.078, size: 6.0, color: '#34d399', starType: 'single', connectFromIndex: 2 },
        { dx: 0.015, dy: 0.095, size: 5.5, color: '#e879f9', starType: 'single', connectFromIndex: 6 },
      ],
      planets: resolvedPlanets,
    },
    {
      id: 'constellation-3',
      name: 'Constelação da Fênix Solar',
      subtitle: 'Sistema Triplo de Áurea',
      description: 'Aglomerado ardente onde três sóis dançam entre gigantes rubras e douradas.',
      xRatio: 0.68,
      yRatio: 0.71,
      glowColor: '#f59e0b',
      secondaryColor: '#f43f5e',
      starType: 'trinary',
      markerIconPng: savedMaps[2]?.pointsOfInterest?.find((p) => p.iconPng)?.iconPng,
      markerIconEmoji: '🦅',
      sunName: 'Tríade Hélio Dourado',
      status: 'unlocked',
      scale: 1.0,
      patternStars: [
        { dx: -0.118, dy: -0.062, size: 6.8, color: '#fb923c', starType: 'supergiant', connectFromIndex: 1 },
        { dx: -0.058, dy: -0.018, size: 7.0, color: '#fde047', secondaryColor: '#f43f5e', starType: 'binary', connectFromIndex: 2 },
        { dx: 0.0, dy: 0.0, size: 11.5, color: '#f59e0b', secondaryColor: '#f43f5e', starType: 'trinary' },
        { dx: 0.058, dy: -0.022, size: 7.0, color: '#f43f5e', secondaryColor: '#38bdf8', starType: 'binary', connectFromIndex: 2 },
        { dx: 0.118, dy: -0.068, size: 6.8, color: '#fde047', starType: 'supergiant', connectFromIndex: 3 },
        { dx: 0.0, dy: -0.085, size: 6.5, color: '#ffffff', starType: 'pulsar', connectFromIndex: 2 },
        { dx: -0.038, dy: 0.075, size: 5.8, color: '#f43f5e', starType: 'single', connectFromIndex: 2 },
        { dx: 0.038, dy: 0.075, size: 5.8, color: '#fbbf24', starType: 'single', connectFromIndex: 2 },
        { dx: 0.0, dy: 0.118, size: 6.4, color: '#38bdf8', secondaryColor: '#fde047', starType: 'binary', connectFromIndex: 6 },
      ],
      planets: resolvedPlanets,
    },
    {
      id: 'constellation-4',
      name: 'Constelação do Leviatã Celeste',
      subtitle: 'Sistema Pulsar Esmeralda',
      description: 'Fronteira profunda das águas cósmicas iluminada por estrelas binárias verdes e azuis.',
      xRatio: 0.27,
      yRatio: 0.73,
      glowColor: '#10b981',
      secondaryColor: '#38bdf8',
      starType: 'pulsar',
      markerIconEmoji: '🔱',
      sunName: 'Pulsar de Esmeralda',
      status: 'unlocked',
      scale: 1.0,
      patternStars: [
        { dx: -0.102, dy: 0.068, size: 6.2, color: '#34d399', starType: 'single', connectFromIndex: 1 },
        { dx: -0.048, dy: 0.025, size: 7.2, color: '#10b981', secondaryColor: '#fde047', starType: 'binary', connectFromIndex: 2 },
        { dx: 0.0, dy: 0.0, size: 11.0, color: '#10b981', secondaryColor: '#38bdf8', starType: 'pulsar' },
        { dx: 0.052, dy: -0.052, size: 6.8, color: '#22d3ee', starType: 'nebula_star', connectFromIndex: 2 },
        { dx: 0.105, dy: -0.018, size: 7.4, color: '#38bdf8', secondaryColor: '#a855f7', starType: 'binary', connectFromIndex: 3 },
        { dx: 0.082, dy: 0.058, size: 5.6, color: '#fde047', starType: 'single', connectFromIndex: 4 },
        { dx: -0.035, dy: -0.072, size: 6.2, color: '#f472b6', starType: 'single', connectFromIndex: 2 },
        { dx: 0.022, dy: 0.078, size: 6.0, color: '#6ee7b7', starType: 'single', connectFromIndex: 2 },
      ],
      planets: resolvedPlanets,
    },
    {
      id: 'constellation-5',
      name: 'Constelação de Gêmeos Rubros',
      subtitle: 'Sistema Binário Carmezim',
      description: 'Par de estrelas gigantes rubras e azuis entrelaçadas no centro do firmamento.',
      xRatio: 0.50,
      yRatio: 0.48,
      glowColor: '#f43f5e',
      secondaryColor: '#38bdf8',
      starType: 'binary',
      markerIconEmoji: '♊',
      sunName: 'Sóis Gêmeos Rubro-Safira',
      status: 'unlocked',
      scale: 1.0,
      patternStars: [
        { dx: -0.078, dy: -0.055, size: 7.0, color: '#f43f5e', secondaryColor: '#ffffff', starType: 'binary', connectFromIndex: 2 },
        { dx: -0.045, dy: 0.052, size: 6.2, color: '#fb7185', starType: 'single', connectFromIndex: 0 },
        { dx: 0.0, dy: 0.0, size: 11.5, color: '#f43f5e', secondaryColor: '#38bdf8', starType: 'binary' },
        { dx: 0.078, dy: -0.055, size: 7.0, color: '#38bdf8', secondaryColor: '#fde047', starType: 'binary', connectFromIndex: 2 },
        { dx: 0.045, dy: 0.052, size: 6.2, color: '#60a5fa', starType: 'single', connectFromIndex: 3 },
        { dx: 0.0, dy: -0.092, size: 6.6, color: '#fde047', starType: 'supergiant', connectFromIndex: 2 },
        { dx: 0.0, dy: 0.088, size: 6.0, color: '#c084fc', starType: 'pulsar', connectFromIndex: 2 },
      ],
      planets: resolvedPlanets,
    },
    {
      id: 'constellation-6',
      name: 'Constelação da Lira Nebular',
      subtitle: 'Berçário Estelar Furta-Cor',
      description: 'Harpa celeste formada por estrelas jovens multicoloridas.',
      xRatio: 0.49,
      yRatio: 0.20,
      glowColor: '#ec4899',
      secondaryColor: '#fde047',
      starType: 'nebula_star',
      markerIconEmoji: '🎵',
      sunName: 'Estrela Vega Rosada',
      status: 'unlocked',
      scale: 1.0,
      patternStars: [
        { dx: -0.068, dy: -0.032, size: 6.0, color: '#f472b6', starType: 'single', connectFromIndex: 2 },
        { dx: -0.035, dy: 0.048, size: 6.5, color: '#38bdf8', secondaryColor: '#f472b6', starType: 'binary', connectFromIndex: 0 },
        { dx: 0.0, dy: 0.0, size: 10.8, color: '#ec4899', secondaryColor: '#fde047', starType: 'nebula_star' },
        { dx: 0.035, dy: 0.048, size: 6.5, color: '#fde047', starType: 'single', connectFromIndex: 2 },
        { dx: 0.068, dy: -0.032, size: 6.2, color: '#34d399', secondaryColor: '#ffffff', starType: 'binary', connectFromIndex: 3 },
        { dx: 0.0, dy: 0.078, size: 5.8, color: '#a855f7', starType: 'pulsar', connectFromIndex: 1 },
      ],
      planets: resolvedPlanets,
    },
  ];

  const paletteFallback = [
    '#38bdf8',
    '#fde047',
    '#f43f5e',
    '#a855f7',
    '#34d399',
    '#fb923c',
    '#f472b6',
    '#22d3ee',
  ];
  const kindFallback: AstralStarKind[] = [
    'single',
    'binary',
    'supergiant',
    'single',
    'pulsar',
    'binary',
    'nebula_star',
    'trinary',
  ];

  const resolvedConstellations =
    existing && Array.isArray(existing.constellations) && existing.constellations.length > 0
      ? existing.constellations.map((c, cIdx) => ({
          ...c,
          starType: c.starType || kindFallback[(cIdx + 1) % kindFallback.length],
          secondaryColor:
            c.secondaryColor || paletteFallback[(cIdx + 2) % paletteFallback.length],
          patternStars: (c.patternStars || []).map((pt, pIdx) => ({
            ...pt,
            color: pt.color || paletteFallback[(cIdx + pIdx) % paletteFallback.length],
            secondaryColor:
              pt.secondaryColor ||
              paletteFallback[(cIdx + pIdx + 3) % paletteFallback.length],
            starType:
              pt.starType || kindFallback[(cIdx * 3 + pIdx) % kindFallback.length],
          })),
        }))
      : defaultConstellations;

  return {
    enabled: existing?.enabled !== false,
    enableConstellationLayer: existing?.enableConstellationLayer !== false,
    title: existing?.title || 'Sistema Planetário',
    systemName: existing?.systemName || 'Sistema Solar de Slimelands',
    planetImagePng: basePlanetPng,
    sunName: existing?.sunName || 'Sol Astral',
    sunImagePng: existing?.sunImagePng,
    sunSizePx:
      existing?.sunSizePx && existing.sunSizePx > 64 ? 54 : existing?.sunSizePx ?? 52,
    showCentralSun: existing?.showCentralSun !== false,
    orbitTiltRatio: existing?.orbitTiltRatio ?? 0.66,
    glowColor: existing?.glowColor || '#38bdf8',
    autoRotateSpeed: existing?.autoRotateSpeed ?? 1.0,
    planetScale: existing?.planetScale ?? 1.0,
    verticalOffsetPct: existing?.verticalOffsetPct ?? 50,
    showMoonsInSky: existing?.showMoonsInSky !== false,
    markers: fallbackGlobeMarkers,
    planets: resolvedPlanets,
    constellations: resolvedConstellations,
  };
}

// ============================================================================
// FUNDO DE ESPAÇO PROFUNDO REALISTA (VIA LÁCTEA, NEBULOSAS VOLUMÉTRICAS,
// POEIRA CÓSMICA, GALÁXIA DISTANTE E CAMPO ESTELAR MULTIESPECTRAL)
// ============================================================================
export const RealisticDeepSpaceBackdrop: React.FC<{
  accentGlowColor?: string;
}> = React.memo(({ accentGlowColor = '#38bdf8' }) => {
  const starField = useMemo(() => {
    const spectralPalette = [
      { color: '#ffffff', glow: 'rgba(255, 255, 255, 0.85)' }, // Classe A/F Branca pura
      { color: '#dbeafe', glow: 'rgba(147, 197, 253, 0.9)' },  // Classe O/B Azul-branca quente
      { color: '#fef3c7', glow: 'rgba(252, 211, 77, 0.85)' },  // Classe G/K Dourada solar
      { color: '#fed7aa', glow: 'rgba(251, 146, 60, 0.85)' },  // Classe M Gigante alaranjada
      { color: '#e0e7ff', glow: 'rgba(165, 180, 252, 0.85)' }, // Anã branca azulada
    ];

    return Array.from({ length: 105 }).map((_, i) => {
      // Distribuição pseudo-aleatória determinística com maior concentração próxima à faixa da Via Láctea
      const rawX = ((i * 73 + 19) % 98) + 1;
      const rawY = ((i * 41 + 11) % 96) + 2;
      const spec = spectralPalette[i % spectralPalette.length];
      const isBrightBeacon = i % 13 === 0;
      const isMediumStar = i % 4 === 0;
      const sizePx = isBrightBeacon
        ? 2.8 + (i % 3) * 0.45
        : isMediumStar
        ? 1.7 + (i % 2) * 0.4
        : 0.9 + (i % 3) * 0.25;
      const baseOpacity = isBrightBeacon
        ? 0.88
        : isMediumStar
        ? 0.52 + (i % 4) * 0.1
        : 0.22 + (i % 5) * 0.08;

      return {
        id: `real-star-${i}`,
        leftPct: rawX,
        topPct: rawY,
        sizePx,
        baseOpacity,
        color: spec.color,
        glow: spec.glow,
        isBrightBeacon,
        twinkleDuration: `${3.2 + (i % 6) * 0.85}s`,
        twinkleDelay: `${(i % 9) * 0.45}s`,
      };
    });
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#010206]">
      {/* 1. Abismo Cósmico Base com vinheta profunda */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 115% 95% at 50% 48%, #060b19 0%, #030611 45%, #010206 80%, #000000 100%)',
        }}
      />

      {/* 2. Faixa Diagonal da Via Láctea (Milky Way Band) + Nuvens de Gás Ionizado */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '170%',
          height: '62%',
          left: '-35%',
          top: '18%',
          transform: 'rotate(-24deg)',
          background:
            'radial-gradient(ellipse 55% 42% at 50% 50%, rgba(56, 189, 248, 0.13) 0%, rgba(99, 102, 241, 0.09) 38%, rgba(168, 85, 247, 0.05) 62%, rgba(0, 0, 0, 0) 85%)',
          filter: 'blur(26px)',
        }}
      />

      {/* 3. Nebulosa de Emissão Carmezim/Magenta & Poeira Dourada */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '95%',
          height: '58%',
          left: '12%',
          top: '8%',
          transform: 'rotate(-18deg)',
          background: `radial-gradient(ellipse 48% 44% at 38% 45%, ${accentGlowColor}1f 0%, rgba(190, 24, 93, 0.11) 45%, rgba(217, 119, 6, 0.06) 70%, rgba(0,0,0,0) 90%)`,
          filter: 'blur(34px)',
        }}
      />
      <div
        className="absolute pointer-events-none"
        style={{
          width: '85%',
          height: '55%',
          right: '-8%',
          bottom: '4%',
          transform: 'rotate(14deg)',
          background:
            'radial-gradient(ellipse 50% 45% at 55% 55%, rgba(14, 165, 233, 0.12) 0%, rgba(139, 92, 246, 0.10) 46%, rgba(245, 158, 11, 0.05) 74%, rgba(0,0,0,0) 92%)',
          filter: 'blur(32px)',
        }}
      />

      {/* 4. Fendas de Poeira Escura da Via Láctea (Dark Dust Lanes p/ profundidade realista) */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: '140%',
          height: '22%',
          left: '-20%',
          top: '39%',
          transform: 'rotate(-23deg)',
          background:
            'radial-gradient(ellipse 45% 38% at 48% 50%, rgba(1, 2, 6, 0.72) 0%, rgba(1, 2, 6, 0.35) 55%, rgba(0, 0, 0, 0) 85%)',
          filter: 'blur(18px)',
        }}
      />

      {/* 5. Galáxia Espiral Distante (Andrômeda / Micro-Núcleo Galáctico) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '18%',
          top: '22%',
          width: '84px',
          height: '28px',
          transform: 'rotate(-32deg)',
          background:
            'radial-gradient(ellipse at 50% 50%, rgba(255, 251, 235, 0.55) 0%, rgba(199, 210, 254, 0.24) 32%, rgba(56, 189, 248, 0.08) 64%, rgba(0,0,0,0) 100%)',
          filter: 'blur(2.5px)',
        }}
      />

      {/* 6. Campo Estelar Multiespectral de 3 Camadas com Espigões de Difração nas Estrelas Principais */}
      {starField.map((st) => (
        <div
          key={st.id}
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${st.leftPct}%`,
            top: `${st.topPct}%`,
            width: `${st.sizePx}px`,
            height: `${st.sizePx}px`,
            backgroundColor: st.color,
            opacity: st.baseOpacity,
            boxShadow: st.isBrightBeacon
              ? `0 0 8px ${st.glow}, 0 0 16px ${st.glow}`
              : `0 0 4px ${st.glow}`,
            animationDuration: st.twinkleDuration,
            animationDelay: st.twinkleDelay,
          }}
        >
          {st.isBrightBeacon && (
            <>
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  width: `${st.sizePx * 4.5}px`,
                  height: '1px',
                  background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${st.color} 50%, rgba(255,255,255,0) 100%)`,
                  opacity: 0.75,
                }}
              />
              <span
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{
                  width: '1px',
                  height: `${st.sizePx * 4.5}px`,
                  background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, ${st.color} 50%, rgba(255,255,255,0) 100%)`,
                  opacity: 0.75,
                }}
              />
            </>
          )}
        </div>
      ))}
    </div>
  );
});

// ============================================================================
// RENDERIZADOR DE ESTRELAS VARIADAS (SIMPLES COLORIDAS, ESTRELAS DUPLAS/BINÁRIAS,
// TRIPLAS, SUPERGIGANTES, PULSARES E BERÇÁRIOS NEBULARES)
// ============================================================================
export const AstralStarVisual: React.FC<{
  size: number;
  color?: string;
  secondaryColor?: string;
  starType?: AstralStarKind;
  isSelected?: boolean;
  isMain?: boolean;
  animSeed?: number;
}> = React.memo(
  ({
    size,
    color = '#fde047',
    secondaryColor = '#38bdf8',
    starType = 'single',
    isSelected = false,
    isMain = false,
    animSeed = 0,
  }) => {
    const effectiveSize = isSelected ? size * 1.32 : size;
    const spinDuration = `${6 + (animSeed % 5) * 1.8}s`;

    if (starType === 'binary') {
      // ESTRELA DUPLA / BINÁRIA: Duas estrelas de cores distintas orbitando o baricentro comum com ponte de plasma
      const primaryR = effectiveSize * 0.92;
      const companionR = effectiveSize * 0.68;
      const sep = Math.max(9, effectiveSize * 1.15);
      return (
        <div
          className="relative flex items-center justify-center pointer-events-none"
          style={{ width: `${sep * 2.4}px`, height: `${sep * 2.4}px` }}
        >
          {/* Halo Binário Compartilhado */}
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${sep * 2.2}px`,
              height: `${sep * 2.2}px`,
              background: `radial-gradient(circle, ${color}44 0%, ${secondaryColor}33 52%, rgba(0,0,0,0) 76%)`,
              filter: 'blur(4px)',
            }}
          />
          {/* Par em rotação orbital */}
          <div
            className="relative w-full h-full flex items-center justify-center"
            style={{
              animation: `astralBinarySpin ${spinDuration} linear infinite`,
            }}
          >
            {/* Ponte de Plasma entre as duas estrelas */}
            <div
              style={{
                width: `${sep}px`,
                height: '2px',
                background: `linear-gradient(90deg, ${color}, #ffffff, ${secondaryColor})`,
                boxShadow: `0 0 8px ${color}`,
                opacity: 0.85,
              }}
              className="rounded-full"
            />
            {/* Estrela A (Principal) */}
            <div
              style={{
                width: `${primaryR}px`,
                height: `${primaryR}px`,
                left: `calc(50% - ${sep * 0.55}px)`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#ffffff',
                boxShadow: `0 0 6px #ffffff, 0 0 14px ${color}, 0 0 24px ${color}`,
                border: `1.5px solid ${color}`,
              }}
              className="absolute rounded-full"
            />
            {/* Estrela B (Companheira) */}
            <div
              style={{
                width: `${companionR}px`,
                height: `${companionR}px`,
                left: `calc(50% + ${sep * 0.55}px)`,
                top: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#ffffff',
                boxShadow: `0 0 5px #ffffff, 0 0 12px ${secondaryColor}, 0 0 20px ${secondaryColor}`,
                border: `1.5px solid ${secondaryColor}`,
              }}
              className="absolute rounded-full"
            />
          </div>
        </div>
      );
    }

    if (starType === 'trinary') {
      // ESTRELA TRIPLA: Três sóis coloridos em formação triangular orbital
      const r1 = effectiveSize * 0.95;
      const r2 = effectiveSize * 0.65;
      const r3 = effectiveSize * 0.55;
      const rad = Math.max(9, effectiveSize * 0.95);
      return (
        <div
          className="relative flex items-center justify-center pointer-events-none"
          style={{ width: `${rad * 2.8}px`, height: `${rad * 2.8}px` }}
        >
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${rad * 2.6}px`,
              height: `${rad * 2.6}px`,
              background: `radial-gradient(circle, ${color}48 0%, ${secondaryColor}35 52%, rgba(0,0,0,0) 78%)`,
              filter: 'blur(5px)',
            }}
          />
          <div
            className="relative w-full h-full"
            style={{
              animation: `astralBinarySpin ${spinDuration} linear infinite`,
            }}
          >
            <div
              style={{
                width: `${r1}px`,
                height: `${r1}px`,
                left: '50%',
                top: `calc(50% - ${rad * 0.65}px)`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#ffffff',
                boxShadow: `0 0 8px #ffffff, 0 0 16px ${color}`,
                border: `1.5px solid ${color}`,
              }}
              className="absolute rounded-full"
            />
            <div
              style={{
                width: `${r2}px`,
                height: `${r2}px`,
                left: `calc(50% - ${rad * 0.65}px)`,
                top: `calc(50% + ${rad * 0.45}px)`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#ffffff',
                boxShadow: `0 0 6px #ffffff, 0 0 14px ${secondaryColor}`,
                border: `1.5px solid ${secondaryColor}`,
              }}
              className="absolute rounded-full"
            />
            <div
              style={{
                width: `${r3}px`,
                height: `${r3}px`,
                left: `calc(50% + ${rad * 0.65}px)`,
                top: `calc(50% + ${rad * 0.45}px)`,
                transform: 'translate(-50%, -50%)',
                backgroundColor: '#ffffff',
                boxShadow: `0 0 6px #ffffff, 0 0 14px #38bdf8`,
                border: `1.5px solid #38bdf8`,
              }}
              className="absolute rounded-full"
            />
          </div>
        </div>
      );
    }

    if (starType === 'pulsar') {
      // PULSAR / ESTRELA DE NÊUTRONS: Feixes relativísticos duplos + anel de choque
      const jetLen = Math.max(26, effectiveSize * 4.2);
      return (
        <div
          className="relative flex items-center justify-center pointer-events-none"
          style={{ width: `${jetLen}px`, height: `${jetLen}px` }}
        >
          {/* Feixe Relativístico Diagonal */}
          <div
            style={{
              width: `${jetLen}px`,
              height: '2.2px',
              transform: 'rotate(-36deg)',
              background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${secondaryColor} 25%, #ffffff 50%, ${color} 75%, rgba(255,255,255,0) 100%)`,
              boxShadow: `0 0 10px ${color}`,
            }}
            className="absolute animate-pulse"
          />
          {/* Anel Equatorial do Pulsar */}
          <div
            style={{
              width: `${effectiveSize * 2.3}px`,
              height: `${effectiveSize * 0.9}px`,
              transform: 'rotate(54deg)',
              border: `1.2px solid ${color}`,
              boxShadow: `0 0 8px ${color}`,
            }}
            className="absolute rounded-full opacity-80"
          />
          {/* Núcleo Hiper-Brilhante */}
          <div
            style={{
              width: `${effectiveSize * 0.95}px`,
              height: `${effectiveSize * 0.95}px`,
              backgroundColor: '#ffffff',
              boxShadow: `0 0 8px #ffffff, 0 0 16px ${color}, 0 0 28px ${secondaryColor}`,
            }}
            className="relative rounded-full"
          />
        </div>
      );
    }

    if (starType === 'supergiant' || starType === 'nebula_star') {
      // SUPERGIGANTE / BERÇÁRIO NEBULAR: Corona solar intensa + 8 pontas de difração
      const spikeLen = Math.max(24, effectiveSize * (isMain ? 4.4 : 3.4));
      return (
        <div
          className="relative flex items-center justify-center pointer-events-none"
          style={{ width: `${spikeLen}px`, height: `${spikeLen}px` }}
        >
          <div
            className="absolute rounded-full animate-pulse"
            style={{
              width: `${effectiveSize * 3.1}px`,
              height: `${effectiveSize * 3.1}px`,
              background: `radial-gradient(circle, ${color}66 0%, ${secondaryColor}33 48%, rgba(0,0,0,0) 76%)`,
              filter: starType === 'nebula_star' ? 'blur(5px)' : 'blur(3px)',
            }}
          />
          {/* Espigões de Difração 8 Pontas (+ e x) */}
          <span
            className="absolute"
            style={{
              width: `${spikeLen}px`,
              height: '1.6px',
              background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${color} 50%, rgba(255,255,255,0) 100%)`,
            }}
          />
          <span
            className="absolute"
            style={{
              width: '1.6px',
              height: `${spikeLen}px`,
              background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, ${color} 50%, rgba(255,255,255,0) 100%)`,
            }}
          />
          <span
            className="absolute"
            style={{
              width: `${spikeLen * 0.68}px`,
              height: '1.2px',
              transform: 'rotate(45deg)',
              background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${secondaryColor} 50%, rgba(255,255,255,0) 100%)`,
            }}
          />
          <span
            className="absolute"
            style={{
              width: `${spikeLen * 0.68}px`,
              height: '1.2px',
              transform: 'rotate(-45deg)',
              background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${secondaryColor} 50%, rgba(255,255,255,0) 100%)`,
            }}
          />
          <div
            style={{
              width: `${effectiveSize * 1.15}px`,
              height: `${effectiveSize * 1.15}px`,
              background: `radial-gradient(circle at 38% 38%, #ffffff 0%, ${color} 68%, ${secondaryColor} 100%)`,
              boxShadow: `0 0 8px #ffffff, 0 0 18px ${color}, 0 0 32px ${color}`,
            }}
            className="relative rounded-full"
          />
        </div>
      );
    }

    // ESTRELA COLORIDA CLÁSSICA COM 4 ESPIGÕES DE DIFRAÇÃO
    const spikeLen = Math.max(16, effectiveSize * 2.8);
    return (
      <div
        className="relative flex items-center justify-center pointer-events-none"
        style={{ width: `${spikeLen}px`, height: `${spikeLen}px` }}
      >
        <span
          className="absolute"
          style={{
            width: `${spikeLen}px`,
            height: '1.2px',
            background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${color} 50%, rgba(255,255,255,0) 100%)`,
            opacity: 0.85,
          }}
        />
        <span
          className="absolute"
          style={{
            width: '1.2px',
            height: `${spikeLen}px`,
            background: `linear-gradient(180deg, rgba(255,255,255,0) 0%, ${color} 50%, rgba(255,255,255,0) 100%)`,
            opacity: 0.85,
          }}
        />
        <div
          style={{
            width: `${effectiveSize}px`,
            height: `${effectiveSize}px`,
            backgroundColor: '#ffffff',
            border: `1.2px solid ${color}`,
            boxShadow: `0 0 6px #ffffff, 0 0 14px ${color}, 0 0 22px ${color}`,
          }}
          className="relative rounded-full animate-pulse"
        />
      </div>
    );
  }
);

// ============================================================================
// OVERLAY DE HYPER-SALTO (HYPERSPACE WARP JUMP) ENTRE CONSTELAÇÃO E SISTEMA SOLAR
// ============================================================================
export const HyperspaceWarpTunnelOverlay: React.FC<{
  active: boolean;
  originX: number;
  originY: number;
  accentColor?: string;
  secondaryColor?: string;
  direction?: 'jump_in' | 'arrival';
}> = React.memo(
  ({
    active,
    originX,
    originY,
    accentColor = '#38bdf8',
    secondaryColor = '#fde047',
    direction = 'jump_in',
  }) => {
    const streaks = useMemo(() => {
      const colors = ['#ffffff', accentColor, secondaryColor, '#a855f7', '#38bdf8', '#fde047'];
      return Array.from({ length: 76 }).map((_, i) => {
        const angleDeg = (i * 360) / 76 + (i % 3) * 1.7;
        const distStart = 12 + (i % 7) * 18;
        const lengthPx = 140 + (i % 5) * 95;
        const thickness = i % 6 === 0 ? 2.8 : i % 2 === 0 ? 1.8 : 1.1;
        const color = colors[i % colors.length];
        const delayMs = (i % 6) * 28;
        return { id: i, angleDeg, distStart, lengthPx, thickness, color, delayMs };
      });
    }, [accentColor, secondaryColor]);

    if (!active) return null;

    return (
      <div
        className="absolute inset-0 pointer-events-none z-[2200] overflow-hidden"
        style={{
          animation:
            direction === 'jump_in'
              ? 'hyperspaceFlashEnvelope 1.05s cubic-bezier(0.16, 1, 0.3, 1) forwards'
              : 'hyperspaceArrivalFadeOut 0.85s ease-out forwards',
        }}
      >
        {/* Clarão Doppler de Dobra Espacial no Ponto Alvo */}
        <div
          style={{
            left: `${originX}px`,
            top: `${originY}px`,
            width: '420px',
            height: '420px',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, #ffffff 0%, ${accentColor}cc 28%, ${secondaryColor}55 54%, rgba(0,0,0,0) 76%)`,
            animation:
              direction === 'jump_in'
                ? 'hyperspaceCoreBurst 1.05s cubic-bezier(0.22, 1, 0.36, 1) forwards'
                : 'hyperspaceCoreArrival 0.85s ease-out forwards',
          }}
          className="absolute rounded-full"
        />

        {/* 76 Feixes Relativísticos de Estrelas Esticadas no Hyper-Salto */}
        {streaks.map((st) => (
          <div
            key={st.id}
            style={{
              left: `${originX}px`,
              top: `${originY}px`,
              width: '0px',
              height: '0px',
              transform: `rotate(${st.angleDeg}deg)`,
            }}
            className="absolute"
          >
            <div
              style={{
                width: `${st.lengthPx}px`,
                height: `${st.thickness}px`,
                marginLeft: `${st.distStart}px`,
                marginTop: `${-st.thickness * 0.5}px`,
                background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, ${st.color} 35%, #ffffff 92%, rgba(255,255,255,0) 100%)`,
                boxShadow: `0 0 12px ${st.color}`,
                animation:
                  direction === 'jump_in'
                    ? `hyperspaceStreakShoot 0.92s cubic-bezier(0.16, 1, 0.3, 1) ${st.delayMs}ms forwards`
                    : `hyperspaceStreakArrive 0.72s cubic-bezier(0.22, 1, 0.36, 1) ${st.delayMs * 0.5}ms forwards`,
              }}
              className="rounded-full"
            />
          </div>
        ))}
      </div>
    );
  }
);

// ============================================================================
// CAMADA 1: CONSTELAÇÕES (COM MUITAS ESTRELAS COLORIDAS, ESTRELAS DUPLAS/BINÁRIAS,
// SUPERGIGANTES, PULSARES E HYPER-SALTO ANIMADO PARA O SISTEMA PLANETÁRIO)
// ============================================================================
interface ConstellationLayerViewProps {
  project: MapProject;
  screenWidth: number;
  screenHeight: number;
  userZoom?: number;
  pausedConstellationId: string | null;
  onSelectPausedConstellation: (constellationId: string | null) => void;
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
  const planetConfig = useMemo(() => getOrCreatePlanetGlobeConfig(project), [project]);
  const constellations = useMemo(
    () => planetConfig.constellations || [],
    [planetConfig.constellations]
  );

  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startX: number;
    startY: number;
    movedDistance: number;
  } | null>(null);

  const [zoomingIntoConstellation, setZoomingIntoConstellation] = useState<{
    constellation: ConstellationSystemNode;
    screenX: number;
    screenY: number;
  } | null>(null);

  const isLandscape = screenWidth > screenHeight * 1.12;
  const safePadX = isLandscape ? Math.min(165, screenWidth * 0.16) : screenWidth * 0.08;
  const safePadY = isLandscape ? screenHeight * 0.14 : screenHeight * 0.12;
  const usableW = Math.max(200, screenWidth - safePadX * 2);
  const usableH = Math.max(200, screenHeight - safePadY * 2);

  // Estrelas avulsas ricas pelo firmamento (incluindo estrelas duplas, gigantes vermelhas, azuis, verdes, douradas e pulsares)
  const ambientVariedStars = useMemo(() => {
    const colors = [
      '#38bdf8',
      '#fde047',
      '#f43f5e',
      '#a855f7',
      '#34d399',
      '#fb923c',
      '#f472b6',
      '#22d3ee',
      '#ffffff',
    ];
    const kinds: AstralStarKind[] = [
      'single',
      'binary',
      'single',
      'supergiant',
      'single',
      'binary',
      'pulsar',
      'single',
      'nebula_star',
    ];
    return Array.from({ length: 54 }).map((_, i) => {
      const rx = ((i * 61 + 17) % 92) + 4;
      const ry = ((i * 47 + 13) % 88) + 6;
      const kind = kinds[i % kinds.length];
      const color = colors[i % colors.length];
      const secondaryColor = colors[(i + 3) % colors.length];
      const size =
        kind === 'supergiant'
          ? 6.2
          : kind === 'binary'
          ? 5.4
          : kind === 'pulsar'
          ? 5.0
          : 3.4 + (i % 3) * 1.1;
      return {
        id: `ambient-varied-star-${i}`,
        rx,
        ry,
        kind,
        color,
        secondaryColor,
        size,
        seed: i,
      };
    });
  }, []);

  const computedConstellations = useMemo(() => {
    const fallbackColors = ['#38bdf8', '#fde047', '#f43f5e', '#a855f7', '#34d399', '#fb923c'];
    const fallbackKinds: AstralStarKind[] = ['single', 'binary', 'supergiant', 'pulsar', 'nebula_star'];

    return constellations.map((c, cIdx) => {
      const cx = safePadX + (c.xRatio - 0.15) * (usableW / 0.7) + panOffset.x;
      const cy = safePadY + (c.yRatio - 0.18) * (usableH / 0.64) + panOffset.y;

      const patternPts = (
        c.patternStars && c.patternStars.length > 0
          ? c.patternStars
          : [
              { dx: -0.07, dy: -0.05, size: 6, color: '#38bdf8', starType: 'binary' as AstralStarKind },
              { dx: 0, dy: 0, size: 10, color: '#fde047', starType: 'supergiant' as AstralStarKind },
              { dx: 0.07, dy: -0.04, size: 6, color: '#f43f5e', starType: 'single' as AstralStarKind },
              { dx: 0.03, dy: 0.06, size: 5.5, color: '#34d399', starType: 'pulsar' as AstralStarKind },
            ]
      ).map((pt, pIdx) => ({
        x: cx + pt.dx * Math.min(screenWidth, screenHeight) * 1.05,
        y: cy + pt.dy * Math.min(screenWidth, screenHeight) * 1.05,
        size: pt.size || 6.0,
        color: pt.color || fallbackColors[(cIdx + pIdx) % fallbackColors.length],
        secondaryColor:
          pt.secondaryColor || fallbackColors[(cIdx + pIdx + 2) % fallbackColors.length],
        starType:
          pt.starType || fallbackKinds[(cIdx * 2 + pIdx) % fallbackKinds.length],
        connectFromIndex: pt.connectFromIndex,
        isMain: Math.abs(pt.dx) < 0.002 && Math.abs(pt.dy) < 0.002,
      }));

      return {
        constellation: c,
        cx,
        cy,
        patternPts,
      };
    });
  }, [constellations, safePadX, safePadY, usableW, usableH, panOffset, screenWidth, screenHeight]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomingIntoConstellation) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startX: panOffset.x,
      startY: panOffset.y,
      movedDistance: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || zoomingIntoConstellation) return;
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    dragStartRef.current.movedDistance = Math.max(
      dragStartRef.current.movedDistance,
      Math.hypot(dx, dy)
    );
    const maxPanX = screenWidth * 0.25;
    const maxPanY = screenHeight * 0.25;
    setPanOffset({
      x: Math.max(-maxPanX, Math.min(maxPanX, dragStartRef.current.startX + dx)),
      y: Math.max(-maxPanY, Math.min(maxPanY, dragStartRef.current.startY + dy)),
    });
  };

  const handlePointerUpOrCancel = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragStartRef.current && dragStartRef.current.movedDistance < 8 && pausedConstellationId) {
      onSelectPausedConstellation(null);
    }
  };

  // Dispara o HYPER-SALTO SIMULADO (Warp Jump) da Constelação para o Sistema Planetário!
  const triggerEnterSolarLayer = useCallback(
    (constellation: ConstellationSystemNode, screenX: number, screenY: number) => {
      if (zoomingIntoConstellation) return;
      playMarkersUnfurlChime();
      setZoomingIntoConstellation({ constellation, screenX, screenY });
      window.setTimeout(() => {
        onEnterSolarSystem(constellation);
      }, 1020);
    },
    [zoomingIntoConstellation, onEnterSolarSystem]
  );

  const handleConstellationClick = (
    e: React.MouseEvent,
    cc: (typeof computedConstellations)[number],
    idx: number
  ) => {
    e.stopPropagation();
    if (zoomingIntoConstellation) return;
    if (dragStartRef.current && dragStartRef.current.movedDistance > 16) return;

    if (pausedConstellationId === cc.constellation.id) {
      triggerEnterSolarLayer(cc.constellation, cc.cx, cc.cy);
    } else {
      playConstellationStarNote(idx, false);
      onSelectPausedConstellation(cc.constellation.id);
    }
  };

  const cameraZoomScale = zoomingIntoConstellation ? 7.4 : userZoom;
  const cameraTx = zoomingIntoConstellation
    ? screenWidth * 0.5 - zoomingIntoConstellation.screenX * cameraZoomScale
    : screenWidth * 0.5 * (1 - userZoom);
  const cameraTy = zoomingIntoConstellation
    ? screenHeight * 0.5 - zoomingIntoConstellation.screenY * cameraZoomScale
    : screenHeight * 0.5 * (1 - userZoom);

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onPointerLeave={handlePointerUpOrCancel}
      className="relative w-full h-full overflow-hidden select-none bg-[#010206] cursor-grab active:cursor-grabbing touch-none"
      style={{
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
      }}
    >
      {/* OVERLAY DE HYPER-SALTO (WARP TUNNEL) AO VIAJAR DA CONSTELAÇÃO PARA O SISTEMA SOLAR */}
      <HyperspaceWarpTunnelOverlay
        active={Boolean(zoomingIntoConstellation)}
        originX={zoomingIntoConstellation?.screenX ?? screenWidth * 0.5}
        originY={zoomingIntoConstellation?.screenY ?? screenHeight * 0.5}
        accentColor={zoomingIntoConstellation?.constellation.glowColor || '#38bdf8'}
        secondaryColor={zoomingIntoConstellation?.constellation.secondaryColor || '#fde047'}
        direction="jump_in"
      />

      <div
        className="relative w-full h-full pointer-events-none"
        style={{
          transformOrigin: '0 0',
          transform: `translate3d(${cameraTx}px, ${cameraTy}px, 0) scale(${cameraZoomScale})`,
          transition: zoomingIntoConstellation
            ? 'transform 1.02s cubic-bezier(0.5, 0, 0.15, 1), filter 0.95s ease-in, opacity 0.98s ease-in'
            : isDragging
            ? 'none'
            : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
          opacity: zoomingIntoConstellation ? 0.05 : 1,
        }}
      >
        {/* 1. Espaço Profundo Realista */}
        <RealisticDeepSpaceBackdrop accentGlowColor={planetConfig.glowColor} />

        {/* 1B. Centenas de Estrelas Variadas de Campo (Binárias/Duplas, Gigantes Vermelhas/Azuis, Pulsares) */}
        <div className="absolute inset-0 pointer-events-none z-[11]">
          {ambientVariedStars.map((st) => (
            <div
              key={st.id}
              style={{
                left: `calc(${st.rx}% + ${panOffset.x * 0.45}px)`,
                top: `calc(${st.ry}% + ${panOffset.y * 0.45}px)`,
                transform: 'translate(-50%, -50%)',
                opacity: 0.72,
              }}
              className="absolute"
            >
              <AstralStarVisual
                size={st.size}
                color={st.color}
                secondaryColor={st.secondaryColor}
                starType={st.kind}
                animSeed={st.seed}
              />
            </div>
          ))}
        </div>

        {/* 2. Linhas Astrais e Desenho Geométrico de Cada Constelação */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-15"
          viewBox={`0 0 ${screenWidth} ${screenHeight}`}
        >
          {/* Círculos de Carta Celeste / Astrolábio no fundo */}
          <circle
            cx={screenWidth * 0.5 + panOffset.x * 0.4}
            cy={screenHeight * 0.5 + panOffset.y * 0.4}
            r={Math.min(screenWidth, screenHeight) * 0.43}
            fill="none"
            stroke="rgba(245, 198, 75, 0.11)"
            strokeWidth="1"
            strokeDasharray="4 10"
          />
          <circle
            cx={screenWidth * 0.5 + panOffset.x * 0.4}
            cy={screenHeight * 0.5 + panOffset.y * 0.4}
            r={Math.min(screenWidth, screenHeight) * 0.26}
            fill="none"
            stroke="rgba(56, 189, 248, 0.09)"
            strokeWidth="1"
            strokeDasharray="2 8"
          />

          {/* Pontes Astrais conectando as Constelações */}
          {computedConstellations.map((cc, idx) => {
            const next = computedConstellations[(idx + 1) % computedConstellations.length];
            if (!next) return null;
            return (
              <line
                key={`astral-bridge-${cc.constellation.id}`}
                x1={cc.cx}
                y1={cc.cy}
                x2={next.cx}
                y2={next.cy}
                stroke="rgba(245, 198, 75, 0.15)"
                strokeWidth="1"
                strokeDasharray="5 9"
              />
            );
          })}

          {/* Linhas internas que desenham a figura ramificada de cada Constelação */}
          {computedConstellations.map((cc) => {
            const isSelected = pausedConstellationId === cc.constellation.id;
            const pts = cc.patternPts;
            const mainColor = cc.constellation.glowColor || '#fde047';
            return (
              <g key={`constellation-lines-${cc.constellation.id}`}>
                {pts.map((pt, i) => {
                  if (i === 0 && pt.connectFromIndex === undefined) return null;
                  const targetIdx =
                    pt.connectFromIndex !== undefined && pts[pt.connectFromIndex]
                      ? pt.connectFromIndex
                      : Math.max(0, i - 1);
                  const prev = pts[targetIdx];
                  if (!prev || prev === pt) return null;
                  return (
                    <line
                      key={`seg-${i}`}
                      x1={prev.x}
                      y1={prev.y}
                      x2={pt.x}
                      y2={pt.y}
                      stroke={
                        isSelected
                          ? '#fef08a'
                          : `${mainColor}88`
                      }
                      strokeWidth={isSelected ? '2.3' : '1.35'}
                      strokeDasharray={isSelected ? 'none' : '4 4'}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* 3. Estrelas Secundárias (Coloridas, Binárias, Pulsares, Gigantes) e Estrela Matriz de Cada Constelação */}
        {computedConstellations.map((cc, idx) => {
          const isSelected = pausedConstellationId === cc.constellation.id;
          const glowCol = cc.constellation.glowColor || '#38bdf8';
          const secCol = cc.constellation.secondaryColor || '#fde047';

          return (
            <React.Fragment key={cc.constellation.id}>
              {/* Nebulosa local da Constelação */}
              <div
                style={{
                  left: `${cc.cx}px`,
                  top: `${cc.cy}px`,
                  width: `${isSelected ? 240 : 175}px`,
                  height: `${isSelected ? 240 : 175}px`,
                  transform: 'translate(-50%, -50%)',
                  background: `radial-gradient(circle, ${glowCol}${
                    isSelected ? '52' : '28'
                  } 0%, ${secCol}18 48%, rgba(0,0,0,0) 76%)`,
                  filter: 'blur(16px)',
                  zIndex: 14,
                }}
                className="absolute rounded-full pointer-events-none transition-all duration-500"
              />

              {/* Estrelas Secundárias que formam o desenho da Constelação (cada uma com sua cor e tipo: dupla, pulsar, supergigante, etc.) */}
              {cc.patternPts.map((pt, ptIdx) => {
                if (pt.isMain) return null;
                return (
                  <div
                    key={`substar-${cc.constellation.id}-${ptIdx}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => handleConstellationClick(e, cc, idx)}
                    style={{
                      left: `${pt.x}px`,
                      top: `${pt.y}px`,
                      width: '38px',
                      height: '38px',
                      transform: 'translate(-50%, -50%)',
                      zIndex: 35,
                    }}
                    className="absolute pointer-events-auto cursor-pointer flex items-center justify-center group"
                  >
                    <div className="transition-transform duration-300 group-hover:scale-135">
                      <AstralStarVisual
                        size={pt.size}
                        color={pt.color}
                        secondaryColor={pt.secondaryColor}
                        starType={pt.starType}
                        isSelected={isSelected}
                        animSeed={idx * 11 + ptIdx}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Estrela Principal da Constelação + Pop-up/Marcador que surge de trás */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => handleConstellationClick(e, cc, idx)}
                style={{
                  left: `${cc.cx}px`,
                  top: `${cc.cy}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isSelected ? 950 : 70 + idx,
                }}
                className="absolute pointer-events-auto cursor-pointer group select-none"
                title={
                  isSelected
                    ? `Toque novamente para fazer o Hyper-Salto para "${cc.constellation.name}"`
                    : `${cc.constellation.name} (Toque para iluminar a constelação)`
                }
              >
                {isSelected && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerEnterSolarLayer(cc.constellation, cc.cx, cc.cy);
                    }}
                    style={{
                      left: '26px',
                      top: '6px',
                      zIndex: -1,
                      animation:
                        'emergeFromBehindPlanet 0.44s cubic-bezier(0.18, 1.25, 0.36, 1) forwards',
                    }}
                    className="absolute pointer-events-auto cursor-pointer"
                  >
                    <OrnateMapMarkerPin
                      name={cc.constellation.name}
                      iconPng={cc.constellation.markerIconPng}
                      iconEmoji={cc.constellation.markerIconEmoji || '✨'}
                      status={cc.constellation.status || 'unlocked'}
                      isSelected={true}
                      isFocused={true}
                      scale={(cc.constellation.scale || 1.0) * 0.96}
                      sizeVariant="md"
                      revealStage="full"
                      hideTopAsset={true}
                    />
                  </div>
                )}

                {/* Estrela Matriz da Constelação (Binária, Tripla, Supergigante ou Pulsar!) */}
                <div className="relative z-10 flex items-center justify-center w-14 h-14 transition-transform duration-300 group-hover:scale-125">
                  <AstralStarVisual
                    size={11.5}
                    color={glowCol}
                    secondaryColor={secCol}
                    starType={cc.constellation.starType || 'binary'}
                    isSelected={isSelected}
                    isMain={true}
                    animSeed={idx * 17}
                  />
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      <style>{`
        @keyframes astralBinarySpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes hyperspaceFlashEnvelope {
          0% { opacity: 0; background: rgba(2, 6, 23, 0); }
          45% { opacity: 1; background: rgba(6, 18, 48, 0.38); }
          82% { opacity: 1; background: rgba(224, 242, 254, 0.78); }
          100% { opacity: 1; background: #ffffff; }
        }
        @keyframes hyperspaceArrivalFadeOut {
          0% { opacity: 1; background: rgba(224, 242, 254, 0.85); }
          40% { opacity: 0.75; background: rgba(6, 18, 48, 0.25); }
          100% { opacity: 0; background: rgba(0, 0, 0, 0); }
        }
        @keyframes hyperspaceCoreBurst {
          0% { transform: translate(-50%, -50%) scale(0.08); opacity: 0.4; }
          60% { transform: translate(-50%, -50%) scale(1.6); opacity: 1; }
          100% { transform: translate(-50%, -50%) scale(5.8); opacity: 1; }
        }
        @keyframes hyperspaceCoreArrival {
          0% { transform: translate(-50%, -50%) scale(3.5); opacity: 0.95; }
          100% { transform: translate(-50%, -50%) scale(0.15); opacity: 0; }
        }
        @keyframes hyperspaceStreakShoot {
          0% {
            transform: translateX(0px) scaleX(0.08);
            opacity: 0;
          }
          25% {
            opacity: 1;
          }
          100% {
            transform: translateX(620px) scaleX(3.8);
            opacity: 0.95;
          }
        }
        @keyframes hyperspaceStreakArrive {
          0% {
            transform: translateX(480px) scaleX(3.2);
            opacity: 0.95;
          }
          100% {
            transform: translateX(0px) scaleX(0.05);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// CAMADA 2: SISTEMA SOLAR (PLANETAS MENORES SEM ESTRELAS, ARCOS MAIORES,
// LUAS MAIS AFASTADAS E SENSÍVEIS AO CLIQUE, E POP-UP SURGINDO DE TRÁS)
// ============================================================================
interface SolarSystemLayerViewProps {
  project: MapProject;
  activeConstellation?: ConstellationSystemNode | null;
  screenWidth: number;
  screenHeight: number;
  userZoom?: number;
  pausedPlanetId: string | null;
  onSelectPausedPlanet: (planetId: string | null) => void;
  onEnterPlanetGlobe: (planet: SolarSystemPlanet) => void;
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
}) => {
  const planetConfig = useMemo(() => getOrCreatePlanetGlobeConfig(project), [project]);
  const planets = useMemo(
    () =>
      activeConstellation?.planets && activeConstellation.planets.length > 0
        ? activeConstellation.planets
        : planetConfig.planets || [],
    [activeConstellation, planetConfig.planets]
  );

  const [orbitTimeSec, setOrbitTimeSec] = useState<number>(0);
  const orbitTimeRef = useRef<number>(0);

  const [userRotationOffsetDeg, setUserRotationOffsetDeg] = useState<number>(0);
  const userRotationRef = useRef<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    startOffset: number;
    lastClientX: number;
    lastTime: number;
    velocityDegPerMs: number;
    movedDistance: number;
  } | null>(null);
  const inertiaVelocityRef = useRef<number>(0);

  // Estado de Hyper-Zoom de Aproximação quando o jogador confirma entrada no Planeta/Lua (2º clique)
  const [zoomingIntoPlanet, setZoomingIntoPlanet] = useState<{
    planet: SolarSystemPlanet;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Efeito de chegada do Hyper-Salto (quando acaba de sair da camada de Constelação)
  const [isArrivingFromHyperspace, setIsArrivingFromHyperspace] = useState<boolean>(true);
  useEffect(() => {
    setIsArrivingFromHyperspace(true);
    const t = window.setTimeout(() => setIsArrivingFromHyperspace(false), 820);
    return () => window.clearTimeout(t);
  }, [activeConstellation?.id]);

  const isLandscape = screenWidth > screenHeight * 1.12;
  const systemScale = (planetConfig.planetScale ?? 1.0) * userZoom;
  const orbitTilt = planetConfig.orbitTiltRatio ?? 0.66;

  // Centro e raio máximo dos arcos de órbita refinados para Retrato e Paisagem (Web e Mobile)
  const centerX = screenWidth * 0.5;
  const centerY = isLandscape ? screenHeight * 0.52 : screenHeight * 0.53;

  // Arcos maiores e bem distribuídos, respeitando as margens da tela em retrato e paisagem
  const maxRxAvailable = isLandscape
    ? Math.max(150, (screenWidth - 220) * 0.46)
    : screenWidth * 0.45;
  const maxRyAvailable = isLandscape
    ? screenHeight * 0.42
    : screenHeight * 0.38;

  const maxSystemRadius =
    Math.min(maxRxAvailable, maxRyAvailable / Math.max(0.45, orbitTilt)) * systemScale;

  // Escala responsiva para que planetas e sol fiquem elegantes tanto no celular quanto na web paisagem
  const responsiveUnit = Math.max(
    0.68,
    Math.min(1.12, Math.min(screenWidth, screenHeight) / 520)
  );

  // Pausa na órbita sempre que um planeta estiver clicado/selecionado (`pausedPlanetId !== null`)
  const isOrbitPaused = Boolean(pausedPlanetId) || Boolean(zoomingIntoPlanet);

  useEffect(() => {
    let rafId: number;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dtMs = Math.min(64, Math.max(1, now - lastTs));
      lastTs = now;

      if (!zoomingIntoPlanet) {
        const speedMult = planetConfig.autoRotateSpeed ?? 1.0;
        if (!isDragging && !isOrbitPaused) {
          orbitTimeRef.current += (dtMs / 1000) * speedMult;
          setOrbitTimeSec(orbitTimeRef.current);
        }

        if (!isDragging && Math.abs(inertiaVelocityRef.current) > 0.002) {
          userRotationRef.current += inertiaVelocityRef.current * dtMs;
          inertiaVelocityRef.current *= Math.pow(0.94, dtMs / 16);
          setUserRotationOffsetDeg(userRotationRef.current);
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isDragging, isOrbitPaused, zoomingIntoPlanet, planetConfig.autoRotateSpeed]);

  // Calcula posições de cada Planeta e Lua nos arcos elípticos maiores
  const computedSolarSystem = useMemo(() => {
    return planets.map((planet, pIdx) => {
      const ratio =
        planet.orbitRadiusRatio ??
        Math.min(0.88, 0.28 + pIdx * (0.58 / Math.max(1, planets.length - 1)));
      const orbitRx = maxSystemRadius * ratio;
      const orbitRy = orbitRx * orbitTilt;

      const currentAngleDeg =
        (planet.initialAngleDeg ?? pIdx * 90) +
        orbitTimeSec * (planet.orbitSpeed ?? 3.0) +
        userRotationOffsetDeg;
      const angleRad = (currentAngleDeg * Math.PI) / 180;

      const px = centerX + Math.cos(angleRad) * orbitRx;
      const py = centerY + Math.sin(angleRad) * orbitRy;

      const depthFactor = Math.sin(angleRad); // -1 (atrás) a +1 (frente)
      const perspectiveScale = 0.86 + (depthFactor + 1) * 0.12;
      const baseSize = Math.min(54, Math.max(26, planet.sizePx || 42));
      const renderedSizePx = baseSize * perspectiveScale * responsiveUnit * systemScale;
      const selfRotationDeg =
        (orbitTimeSec * (planet.selfRotateSpeed ?? 6) * 2.5) % 360;

      const computedMoons = (planet.moons || []).map((moon, mIdx) => {
        // Órbita circular perfeita (rx === ry === mOrbitR) e mais afastada do planeta
        const mOrbitR = Math.max(
          renderedSizePx * 1.18 + 18,
          (moon.orbitRadiusPx || 56) * responsiveUnit * systemScale
        );
        const mAngleDeg =
          (moon.initialAngleDeg ?? mIdx * 140) +
          orbitTimeSec * (moon.orbitSpeed ?? 20) +
          userRotationOffsetDeg * 1.4;
        const mAngleRad = (mAngleDeg * Math.PI) / 180;

        // Círculo perfeito ao redor do planeta (sem achatar em cápsula!)
        const mx = px + Math.cos(mAngleRad) * mOrbitR;
        const my = py + Math.sin(mAngleRad) * mOrbitR;
        const mSizePx =
          Math.min(22, Math.max(12, moon.sizePx || 15)) *
          perspectiveScale *
          responsiveUnit *
          systemScale;

        return {
          moon,
          mx,
          my,
          mOrbitR,
          mOrbitRy: mOrbitR,
          mSizePx,
          mDepth: Math.sin(mAngleRad),
        };
      });

      return {
        planet,
        orbitRx,
        orbitRy,
        currentAngleDeg,
        px,
        py,
        depthFactor,
        perspectiveScale,
        renderedSizePx,
        selfRotationDeg,
        computedMoons,
      };
    });
  }, [
    planets,
    maxSystemRadius,
    orbitTilt,
    orbitTimeSec,
    userRotationOffsetDeg,
    centerX,
    centerY,
    responsiveUnit,
    systemScale,
  ]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomingIntoPlanet) return;
    setIsDragging(true);
    inertiaVelocityRef.current = 0;

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      startOffset: userRotationRef.current,
      lastClientX: e.clientX,
      lastTime: performance.now(),
      velocityDegPerMs: 0,
      movedDistance: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || zoomingIntoPlanet) return;

    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    const totalMoved = Math.hypot(dx, dy);
    dragStartRef.current.movedDistance = Math.max(
      dragStartRef.current.movedDistance,
      totalMoved
    );

    const degPerPixel = 150 / Math.max(320, screenWidth);
    const nextOffset = dragStartRef.current.startOffset + dx * degPerPixel;

    const now = performance.now();
    const dt = Math.max(1, now - dragStartRef.current.lastTime);
    const stepDx = e.clientX - dragStartRef.current.lastClientX;
    dragStartRef.current.velocityDegPerMs = (stepDx * degPerPixel) / dt;
    dragStartRef.current.lastClientX = e.clientX;
    dragStartRef.current.lastTime = now;

    userRotationRef.current = nextOffset;
    setUserRotationOffsetDeg(nextOffset);
  };

  const handlePointerUpOrCancel = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragStartRef.current) {
      // Se foi apenas um clique no fundo do espaço (sem arrastar), despausa a órbita e recolhe o pop-up
      if (dragStartRef.current.movedDistance < 6 && pausedPlanetId) {
        onSelectPausedPlanet(null);
      } else {
        inertiaVelocityRef.current = Math.max(
          -0.16,
          Math.min(0.16, dragStartRef.current.velocityDegPerMs * 0.82)
        );
      }
    }
  };

  // Dispara o mergulho de câmera (Zoom-In) no Planeta para abrir a CAMADA 2 (Globo do Planeta Girando)
  const triggerEnterPlanetLayer2 = useCallback(
    (planet: SolarSystemPlanet, screenX: number, screenY: number) => {
      if (zoomingIntoPlanet) return;
      playMarkersUnfurlChime();
      setZoomingIntoPlanet({ planet, screenX, screenY });

      window.setTimeout(() => {
        onEnterPlanetGlobe(planet);
      }, 920);
    },
    [zoomingIntoPlanet, onEnterPlanetGlobe]
  );

  const convertMoonToPlanetGlobe = useCallback(
    (moon: SolarSystemMoon, parentPlanet: SolarSystemPlanet): SolarSystemPlanet => {
      const moonMarkers =
        moon.markers && moon.markers.length > 0
          ? moon.markers
          : buildDefaultMarkersForPlanet(moon.id, moon.name, project);
      return {
        id: moon.id,
        name: moon.name,
        description: `Satélite natural em órbita de ${parentPlanet.name}`,
        planetImagePng:
          moon.imagePng ||
          parentPlanet.planetImagePng ||
          planetConfig.planetImagePng ||
          DEFAULT_PLANET_IMAGE_URL,
        markerIconPng: moon.markerIconPng || parentPlanet.markerIconPng,
        markerIconEmoji: moon.markerIconEmoji || '🌙',
        glowColor: '#94a3b8',
        hasRings: false,
        sizePx: 40,
        orbitRadiusRatio: parentPlanet.orbitRadiusRatio,
        orbitSpeed: parentPlanet.orbitSpeed,
        selfRotateSpeed: 6,
        targetWorldMapId: moon.targetWorldMapId || parentPlanet.targetWorldMapId,
        status: moon.status || 'unlocked',
        scale: 1.0,
        markers: moonMarkers,
        moons: [
          {
            id: `sky-parent-${parentPlanet.id}`,
            name: parentPlanet.name,
            imagePng:
              parentPlanet.planetImagePng ||
              planetConfig.planetImagePng ||
              DEFAULT_PLANET_IMAGE_URL,
            markerIconEmoji: parentPlanet.markerIconEmoji || '🪐',
            sizePx: 22,
            orbitRadiusPx: 48,
            orbitSpeed: 8,
            status: 'unlocked',
          },
        ],
      };
    },
    [project, planetConfig.planetImagePng]
  );

  const handlePlanetClick = (
    e: React.MouseEvent,
    cp: (typeof computedSolarSystem)[number]
  ) => {
    e.stopPropagation();
    if (zoomingIntoPlanet) return;
    if (dragStartRef.current && dragStartRef.current.movedDistance > 16) return;

    if (pausedPlanetId === cp.planet.id) {
      // Segundo clique no planeta (ou clique no pop-up que surgiu de trás dele) -> Entra na Camada do Globo do Planeta!
      triggerEnterPlanetLayer2(cp.planet, cp.px, cp.py);
    } else {
      // Primeiro clique no planeta -> Pausa a órbita e faz o pop-up/marcador surgir de trás dele!
      const idx = planets.findIndex((p) => p.id === cp.planet.id);
      playConstellationStarNote(Math.max(0, idx), false);
      onSelectPausedPlanet(cp.planet.id);
    }
  };

  const handleMoonClick = (
    e: React.MouseEvent | React.PointerEvent,
    cp: (typeof computedSolarSystem)[number],
    cm: (typeof computedSolarSystem)[number]['computedMoons'][number]
  ) => {
    e.stopPropagation();
    if (zoomingIntoPlanet) return;
    if (dragStartRef.current && dragStartRef.current.movedDistance > 18) return;

    const moonAsGlobe = convertMoonToPlanetGlobe(cm.moon, cp.planet);
    if (pausedPlanetId === cm.moon.id) {
      // Segundo clique na lua (ou clique no pop-up que surgiu de trás dela) -> Entra na Camada do Globo da Lua!
      triggerEnterPlanetLayer2(moonAsGlobe, cm.mx, cm.my);
    } else {
      // Primeiro clique na lua -> Pausa a órbita e faz o pop-up/marcador surgir de trás dela!
      playConstellationStarNote(2, false);
      onSelectPausedPlanet(cm.moon.id);
    }
  };

  const cameraZoomScale = zoomingIntoPlanet ? 8.2 : 1.0;
  const cameraTx = zoomingIntoPlanet
    ? screenWidth * 0.5 - zoomingIntoPlanet.screenX * cameraZoomScale
    : 0;
  const cameraTy = zoomingIntoPlanet
    ? screenHeight * 0.5 - zoomingIntoPlanet.screenY * cameraZoomScale
    : 0;

  const sunSize =
    Math.min(64, Math.max(32, planetConfig.sunSizePx ?? 50)) *
    responsiveUnit *
    systemScale;

  const depthSortedPlanets = useMemo(
    () => [...computedSolarSystem].sort((a, b) => a.py - b.py),
    [computedSolarSystem]
  );

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onPointerLeave={handlePointerUpOrCancel}
      className="relative w-full h-full overflow-hidden select-none bg-[#010206] cursor-grab active:cursor-grabbing touch-none"
      style={{
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
      }}
    >
      {/* 0A. EFEITO DE CHEGADA DO HYPER-SALTO (DESACELERAÇÃO DO WARP NO SISTEMA SOLAR) */}
      <HyperspaceWarpTunnelOverlay
        active={isArrivingFromHyperspace}
        originX={centerX}
        originY={centerY}
        accentColor={activeConstellation?.glowColor || planetConfig.glowColor || '#38bdf8'}
        secondaryColor={activeConstellation?.secondaryColor || '#fde047'}
        direction="arrival"
      />

      {/* 0B. OVERLAY DE HYPER-ZOOM DE APROXIMAÇÃO ORBITAL AO ENTRAR NO PLANETA OU LUA */}
      {zoomingIntoPlanet && (
        <div className="absolute inset-0 pointer-events-none z-[2100] overflow-hidden">
          <HyperspaceWarpTunnelOverlay
            active={true}
            originX={zoomingIntoPlanet.screenX}
            originY={zoomingIntoPlanet.screenY}
            accentColor={zoomingIntoPlanet.planet.glowColor || '#38bdf8'}
            secondaryColor="#fde047"
            direction="jump_in"
          />
          {/* Anéis de Telemetria de Aproximação Planetária + Esfera do Planeta Crescendo em Hyper-Zoom */}
          <div
            style={{
              left: `${zoomingIntoPlanet.screenX}px`,
              top: `${zoomingIntoPlanet.screenY}px`,
              transform: 'translate(-50%, -50%)',
              animation: 'hyperZoomPlanetSphereRush 0.94s cubic-bezier(0.22, 1, 0.36, 1) forwards',
            }}
            className="absolute flex items-center justify-center"
          >
            <div
              style={{
                width: '180px',
                height: '180px',
                border: `2px dashed ${zoomingIntoPlanet.planet.glowColor || '#38bdf8'}`,
                boxShadow: `0 0 35px ${zoomingIntoPlanet.planet.glowColor || '#38bdf8'}`,
              }}
              className="absolute rounded-full opacity-75"
            />
            <img
              src={
                zoomingIntoPlanet.planet.planetImagePng ||
                planetConfig.planetImagePng ||
                DEFAULT_PLANET_IMAGE_URL
              }
              alt={zoomingIntoPlanet.planet.name}
              className="w-28 h-28 object-contain rounded-full drop-shadow-[0_0_40px_rgba(56,189,248,0.9)]"
            />
          </div>
        </div>
      )}

      <div
        className="relative w-full h-full pointer-events-none"
        style={{
          transformOrigin: '0 0',
          transform: `translate3d(${cameraTx}px, ${cameraTy}px, 0) scale(${cameraZoomScale})`,
          transition: zoomingIntoPlanet
            ? 'transform 0.95s cubic-bezier(0.45, 0, 0.15, 1), opacity 0.9s ease-in'
            : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
          opacity: zoomingIntoPlanet ? 0.06 : 1,
          animation: isArrivingFromHyperspace
            ? 'solarSystemArriveScaleIn 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : 'none',
        }}
      >
        {/* 1. Espaço Profundo Realista (Via Láctea, Nebulosas Volumétricas e Campo Estelar Multiespectral) */}
        <RealisticDeepSpaceBackdrop
          accentGlowColor={activeConstellation?.glowColor || planetConfig.glowColor}
        />

        {/* 2. Arcos de Órbita Maiores dos Planetas + Órbitas Circulares Perfeitas das Luas */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 ${screenWidth} ${screenHeight}`}
        >
          {computedSolarSystem.map((cp) => {
            const isPausedTarget =
              cp.planet.id === pausedPlanetId ||
              cp.computedMoons.some((m) => m.moon.id === pausedPlanetId);
            return (
              <g key={`orbit-group-${cp.planet.id}`}>
                <ellipse
                  cx={centerX}
                  cy={centerY}
                  rx={cp.orbitRx}
                  ry={cp.orbitRy}
                  fill="none"
                  stroke={
                    isPausedTarget
                      ? 'rgba(252, 211, 77, 0.62)'
                      : 'rgba(245, 198, 75, 0.22)'
                  }
                  strokeWidth={isPausedTarget ? '1.8' : '1.15'}
                  strokeDasharray={isPausedTarget ? 'none' : '6 8'}
                />
                {/* Órbita da Lua como CÍRCULO GEOMÉTRICO PERFEITO (nunca cápsula!) */}
                {cp.computedMoons.map((cm) => {
                  const isMoonSelected = cm.moon.id === pausedPlanetId;
                  return (
                    <circle
                      key={`moon-circle-orbit-${cm.moon.id}`}
                      cx={cp.px}
                      cy={cp.py}
                      r={cm.mOrbitR}
                      fill="none"
                      stroke={
                        isMoonSelected
                          ? 'rgba(252, 211, 77, 0.75)'
                          : 'rgba(125, 211, 252, 0.28)'
                      }
                      strokeWidth={isMoonSelected ? '1.5' : '1.05'}
                      strokeDasharray={isMoonSelected ? 'none' : '4 5'}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>

        {/* 3. Sol / Astro Central */}
        {planetConfig.showCentralSun !== false && (
          <div
            style={{
              left: `${centerX}px`,
              top: `${centerY}px`,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.round(centerY),
            }}
            className="absolute pointer-events-none flex items-center justify-center"
          >
            <div
              className="absolute rounded-full animate-pulse"
              style={{
                width: `${sunSize * 2.4}px`,
                height: `${sunSize * 2.4}px`,
                background:
                  'radial-gradient(circle, rgba(251, 191, 36, 0.42) 0%, rgba(245, 158, 11, 0.15) 46%, rgba(0, 0, 0, 0) 72%)',
                filter: 'blur(10px)',
              }}
            />

            {planetConfig.sunImagePng ? (
              <img
                src={planetConfig.sunImagePng}
                alt={planetConfig.sunName || 'Sol Central'}
                style={{
                  width: `${sunSize}px`,
                  height: `${sunSize}px`,
                  transform: `rotate(${(orbitTimeSec * 4) % 360}deg)`,
                }}
                className="object-contain drop-shadow-[0_0_24px_rgba(251,191,36,0.85)]"
              />
            ) : (
              <div
                style={{
                  width: `${sunSize}px`,
                  height: `${sunSize}px`,
                  background:
                    'radial-gradient(circle at 38% 35%, #fffef0 0%, #fde047 32%, #f59e0b 68%, #b45309 100%)',
                  boxShadow:
                    '0 0 28px rgba(251, 191, 36, 0.85), 0 0 54px rgba(245, 158, 11, 0.45), inset 0 0 14px rgba(255, 255, 255, 0.8)',
                }}
                className="rounded-full border border-amber-200/80"
              />
            )}
          </div>
        )}

        {/* 4. Planetas e Luas Limpos (SEM estrelas de marcadores na órbita) + Pop-up/Marcador que surge de trás ao clicar */}
        {depthSortedPlanets.map((cp) => {
          const isPausedSelected = cp.planet.id === pausedPlanetId;
          const planetImg =
            cp.planet.planetImagePng ||
            planetConfig.planetImagePng ||
            DEFAULT_PLANET_IMAGE_URL;

          return (
            <React.Fragment key={cp.planet.id}>
              {/* Container do Planeta */}
              <div
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => handlePlanetClick(e, cp)}
                style={{
                  left: `${cp.px}px`,
                  top: `${cp.py}px`,
                  transform: 'translate(-50%, -50%)',
                  zIndex: isPausedSelected ? 950 : Math.round(cp.py),
                }}
                className="absolute pointer-events-auto cursor-pointer group select-none"
                title={
                  isPausedSelected
                    ? `2º Clique: Hyper-Zoom de aproximação em "${cp.planet.name}"`
                    : `1º Clique: Pausar órbita e exibir estrela + cápsula de "${cp.planet.name}"`
                }
              >
                {/* 1º CLIQUE NO PLANETA: EXIBE APENAS ESTRELA + CÁPSULA SEM ASSET NO TOPO (hideTopAsset={true}) */}
                {isPausedSelected && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerEnterPlanetLayer2(cp.planet, cp.px, cp.py);
                    }}
                    style={{
                      left: `${cp.renderedSizePx * 0.5}px`,
                      top: `${cp.renderedSizePx * 0.12}px`,
                      zIndex: -1,
                      animation:
                        'emergeFromBehindPlanet 0.44s cubic-bezier(0.18, 1.25, 0.36, 1) forwards',
                    }}
                    className="absolute pointer-events-auto cursor-pointer"
                  >
                    <OrnateMapMarkerPin
                      name={cp.planet.name}
                      iconPng={cp.planet.markerIconPng}
                      iconEmoji={cp.planet.markerIconEmoji || '🪐'}
                      status={cp.planet.status || 'unlocked'}
                      isSelected={true}
                      isFocused={true}
                      scale={(cp.planet.scale || 1.0) * 0.96}
                      sizeVariant="md"
                      revealStage="full"
                      hideTopAsset={true}
                    />
                  </div>
                )}

                {/* Halo Atmosférico do Planeta */}
                <div
                  className="absolute rounded-full pointer-events-none transition-transform duration-300 group-hover:scale-125"
                  style={{
                    width: `${cp.renderedSizePx * 1.55}px`,
                    height: `${cp.renderedSizePx * 1.55}px`,
                    left: `${-cp.renderedSizePx * 0.275}px`,
                    top: `${-cp.renderedSizePx * 0.275}px`,
                    background: `radial-gradient(circle, ${
                      cp.planet.glowColor || '#38bdf8'
                    }${isPausedSelected ? '75' : '42'} 0%, rgba(251,191,36,0.12) 55%, rgba(0,0,0,0) 75%)`,
                    filter: 'blur(6px)',
                  }}
                />

                {/* Anéis Planetários (se ativado) */}
                {cp.planet.hasRings && (
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      width: `${cp.renderedSizePx * 1.9}px`,
                      height: `${cp.renderedSizePx * 0.52}px`,
                      left: `${-cp.renderedSizePx * 0.45}px`,
                      top: `${cp.renderedSizePx * 0.24}px`,
                      borderRadius: '999px',
                      border: '2px solid rgba(252, 211, 77, 0.65)',
                      boxShadow:
                        '0 0 10px rgba(245, 158, 11, 0.45), inset 0 0 6px rgba(251, 191, 36, 0.35)',
                      transform: 'rotate(-16deg)',
                    }}
                  />
                )}

                {/* Esfera PNG do Planeta (na frente do ponto de origem do pop-up para que ele surja de trás dele!) */}
                <div
                  style={{
                    width: `${cp.renderedSizePx}px`,
                    height: `${cp.renderedSizePx}px`,
                  }}
                  className={`relative z-10 rounded-full transition-transform duration-300 ${
                    isPausedSelected
                      ? 'scale-115 ring-2 ring-amber-300/80 shadow-[0_0_24px_rgba(251,191,36,0.75)]'
                      : 'group-hover:scale-110'
                  }`}
                >
                  <img
                    src={planetImg}
                    alt={cp.planet.name}
                    draggable={false}
                    style={{
                      transform: `rotate(${cp.selfRotationDeg}deg)`,
                    }}
                    className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_6px_18px_rgba(0,0,0,0.95)]"
                  />
                </div>
              </div>

              {/* Luas Limpas Orbitando mais afastadas do Planeta e com Área de Toque/Clique Ampliada (46x46px) */}
              {cp.computedMoons.map((cm) => {
                const isMoonPausedSelected = cm.moon.id === pausedPlanetId;
                const moonImg =
                  cm.moon.imagePng ||
                  cp.planet.planetImagePng ||
                  planetConfig.planetImagePng ||
                  DEFAULT_PLANET_IMAGE_URL;
                const hitBoxSize = Math.max(46, cm.mSizePx + 28);

                return (
                  <div
                    key={cm.moon.id}
                    onPointerDown={(e) => {
                      // Evita que o clique na lua inicie arraste acidental do fundo
                      e.stopPropagation();
                    }}
                    onClick={(e) => handleMoonClick(e, cp, cm)}
                    style={{
                      left: `${cm.mx}px`,
                      top: `${cm.my}px`,
                      width: `${hitBoxSize}px`,
                      height: `${hitBoxSize}px`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: isMoonPausedSelected
                        ? 970
                        : Math.round(cp.py) + 40,
                    }}
                    className="absolute pointer-events-auto cursor-pointer group select-none flex items-center justify-center rounded-full"
                    title={
                      isMoonPausedSelected
                        ? `Toque novamente para entrar no globo de "${cm.moon.name}"`
                        : `${cm.moon.name} (Toque para pausar a órbita e revelar a lua)`
                    }
                  >
                    {isMoonPausedSelected && (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerEnterPlanetLayer2(
                            convertMoonToPlanetGlobe(cm.moon, cp.planet),
                            cm.mx,
                            cm.my
                          );
                        }}
                        style={{
                          left: `${hitBoxSize * 0.5}px`,
                          top: `${hitBoxSize * 0.25}px`,
                          zIndex: -1,
                          animation:
                            'emergeFromBehindPlanet 0.44s cubic-bezier(0.18, 1.25, 0.36, 1) forwards',
                        }}
                        className="absolute pointer-events-auto cursor-pointer"
                      >
                        <OrnateMapMarkerPin
                          name={cm.moon.name}
                          iconPng={cm.moon.markerIconPng}
                          iconEmoji={cm.moon.markerIconEmoji || '🌙'}
                          status={cm.moon.status || 'unlocked'}
                          isSelected={true}
                          isFocused={true}
                          scale={0.92}
                          sizeVariant="md"
                          revealStage="full"
                          hideTopAsset={true}
                        />
                      </div>
                    )}

                    {/* Halo sutil de seleção/hover da Lua */}
                    <div
                      style={{
                        width: `${cm.mSizePx * 1.9}px`,
                        height: `${cm.mSizePx * 1.9}px`,
                      }}
                      className={`absolute rounded-full pointer-events-none transition-all duration-300 ${
                        isMoonPausedSelected
                          ? 'bg-amber-300/35 blur-[4px] scale-125'
                          : 'bg-sky-300/10 group-hover:bg-amber-200/30 blur-[3px] group-hover:scale-125'
                      }`}
                    />

                    <div
                      style={{
                        width: `${cm.mSizePx}px`,
                        height: `${cm.mSizePx}px`,
                      }}
                      className={`relative z-10 rounded-full transition-transform duration-300 ${
                        isMoonPausedSelected
                          ? 'scale-130 ring-2 ring-amber-300/90 shadow-[0_0_18px_rgba(251,191,36,0.85)]'
                          : 'group-hover:scale-125'
                      }`}
                    >
                      <img
                        src={moonImg}
                        alt={cm.moon.name}
                        draggable={false}
                        style={{
                          transform: `rotate(${(orbitTimeSec * 14) % 360}deg)`,
                        }}
                        className="w-full h-full object-contain select-none pointer-events-none drop-shadow-[0_3px_8px_rgba(0,0,0,0.95)]"
                      />
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          );
        })}
      </div>

      {/* Keyframes para o pop-up/marcador surgir de trás do planeta clicado + Hyper-Zoom */}
      <style>{`
        @keyframes emergeFromBehindPlanet {
          0% {
            opacity: 0;
            transform: translate(-20%, -10%) scale(0.28);
          }
          65% {
            opacity: 1;
            transform: translate(-20%, -115%) scale(1.04);
          }
          100% {
            opacity: 1;
            transform: translate(-20%, -108%) scale(1);
          }
        }
        @keyframes solarSystemArriveScaleIn {
          0% {
            transform: scale(0.28);
            opacity: 0.15;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        @keyframes hyperZoomPlanetSphereRush {
          0% {
            transform: translate(-50%, -50%) scale(0.35);
            opacity: 0.4;
          }
          65% {
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(6.5);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

// ============================================================================
// CAMADA 2: GLOBO DO PLANETA GIRANDO DEVAGAR (MOSTRANDO METADE DELE) COM
// ESTRELAS PULSANTES E MARCADOR EM FOCO (CLIQUE DÁ ZOOM P/ CAMADA 3 REGIONAL)
// ============================================================================
interface PlanetGlobeEmulatorViewProps {
  project: MapProject;
  activePlanet?: SolarSystemPlanet | null;
  screenWidth: number;
  screenHeight: number;
  userZoom?: number;
  externalFocusedMarkerId?: string | null;
  availableMaps?: WorldMapConfig[];
  onSelectRegionMarker: (marker: PlanetGlobeMarker, targetMap?: WorldMapConfig) => void;
  onOpenEditorTab?: () => void;
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
}) => {
  const planetConfig = useMemo(() => getOrCreatePlanetGlobeConfig(project), [project]);
  const targetPlanet = activePlanet || planetConfig.planets?.[0] || null;

  const markers = useMemo(() => {
    if (targetPlanet?.markers && targetPlanet.markers.length > 0) {
      return targetPlanet.markers;
    }
    if (planetConfig.markers && planetConfig.markers.length > 0) {
      return planetConfig.markers;
    }
    return buildDefaultMarkersForPlanet(
      targetPlanet?.id || 'solar-planet-1',
      targetPlanet?.name || 'Planeta Gaia',
      project
    );
  }, [targetPlanet, planetConfig.markers, project]);

  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const rotationRef = useRef<number>(0);
  const targetRotationRef = useRef<number | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isActivelySpinning, setIsActivelySpinning] = useState<boolean>(false);
  const spinTimeoutRef = useRef<number | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    startRotation: number;
    lastClientX: number;
    lastTime: number;
    velocityDegPerMs: number;
    movedDistance: number;
  } | null>(null);
  const inertiaVelocityRef = useRef<number>(0);

  const [zoomingIntoMarker, setZoomingIntoMarker] = useState<{
    marker: PlanetGlobeMarker;
    screenX: number;
    screenY: number;
  } | null>(null);

  const prevFocusedIdRef = useRef<string | null>(null);

  // Refinamento Responsivo do Globo (Retrato vs Paisagem Web/Celular):
  // Nunca preenche a tela inteira em modo paisagem e deixa espaço livre para a UI de sobreposição!
  const isLandscape = screenWidth > screenHeight * 1.12;
  const globeDiameter = useMemo(() => {
    const scale = (planetConfig.planetScale ?? 1.0) * userZoom;
    if (isLandscape) {
      // Em Paisagem (Web e Mobile): limita pela altura da tela e pela largura central livre entre LUGARES e REGIÕES
      const safeCenterWidth = Math.max(240, screenWidth - 380);
      return Math.min(screenHeight * 0.86, safeCenterWidth * 0.85) * scale;
    }
    // Em Retrato: metade superior do globo na base da tela
    return Math.min(screenWidth * 1.08, screenHeight * 0.72) * scale;
  }, [screenWidth, screenHeight, isLandscape, planetConfig.planetScale, userZoom]);

  const globeRadius = globeDiameter / 2;
  const globeCenterX = screenWidth * 0.5;
  const globeCenterY = isLandscape
    ? screenHeight * 0.96
    : screenHeight * 0.92;

  // Se o jogador clicou num lugar na lista esquerda `LUGARES`, gira o globo até aquele marcador
  useEffect(() => {
    if (!externalFocusedMarkerId) return;
    const m = markers.find((item) => item.id === externalFocusedMarkerId);
    if (!m) return;
    const baseLonDeg = m.nx * 78;
    const currentMod = ((rotationRef.current % 360) + 360) % 360;
    const desiredMod = ((-baseLonDeg % 360) + 360) % 360;
    let delta = desiredMod - currentMod;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    targetRotationRef.current = rotationRef.current + delta;
  }, [externalFocusedMarkerId, markers]);

  // Loop de rotação suave do Planeta
  useEffect(() => {
    let rafId: number;
    let lastTs = performance.now();

    const tick = (now: number) => {
      const dtMs = Math.min(64, Math.max(1, now - lastTs));
      lastTs = now;

      if (!isDragging && !zoomingIntoMarker) {
        if (targetRotationRef.current !== null) {
          const diff = targetRotationRef.current - rotationRef.current;
          if (Math.abs(diff) < 0.25) {
            rotationRef.current = targetRotationRef.current;
            targetRotationRef.current = null;
            setIsActivelySpinning(false);
          } else {
            rotationRef.current += diff * Math.min(1, dtMs * 0.0085);
          }
          setRotationDeg(rotationRef.current);
        } else if (Math.abs(inertiaVelocityRef.current) > 0.002) {
          rotationRef.current += inertiaVelocityRef.current * dtMs;
          inertiaVelocityRef.current *= Math.pow(0.94, dtMs / 16);
          if (Math.abs(inertiaVelocityRef.current) <= 0.008) {
            setIsActivelySpinning(false);
          }
          setRotationDeg(rotationRef.current);
        } else {
          const autoSpeed = planetConfig.autoRotateSpeed ?? 1.0;
          if (autoSpeed > 0) {
            rotationRef.current = (rotationRef.current + autoSpeed * 1.8 * (dtMs / 1000)) % 360;
            setRotationDeg(rotationRef.current);
          }
        }
      }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [isDragging, zoomingIntoMarker, planetConfig.autoRotateSpeed]);

  // Projeção Esférica 3D dos Marcadores na Superfície do Planeta
  const projectedMarkers = useMemo(() => {
    return markers.map((m) => {
      const baseLonDeg = m.nx * 78;
      const latRad = Math.max(-1.25, Math.min(0.35, m.ny * 1.15));

      let effectiveLonDeg = (baseLonDeg + rotationDeg) % 360;
      if (effectiveLonDeg > 180) effectiveLonDeg -= 360;
      if (effectiveLonDeg < -180) effectiveLonDeg += 360;

      const lonRad = (effectiveLonDeg * Math.PI) / 180;
      const cosLat = Math.cos(latRad);
      const sinLat = Math.sin(latRad);
      const sinLon = Math.sin(lonRad);
      const cosLon = Math.cos(lonRad);

      const screenX = globeCenterX + globeRadius * 0.82 * cosLat * sinLon;
      const screenY =
        globeCenterY +
        globeRadius * 0.82 * (sinLat * 0.88 - (1 - cosLon) * 0.14);

      const depthZ = cosLat * cosLon;
      const isVisibleOnFrontHemisphere = cosLon > -0.15;
      const distFromFocusCenter = Math.hypot(effectiveLonDeg, (m.ny + 0.34) * 38);

      return {
        marker: m,
        screenX,
        screenY,
        depthZ,
        effectiveLonDeg,
        isVisibleOnFrontHemisphere,
        distFromFocusCenter,
      };
    });
  }, [markers, rotationDeg, globeCenterX, globeCenterY, globeRadius]);

  // Marcador em foco na frente do Globo
  const focusedMarkerId = useMemo(() => {
    const visible = projectedMarkers.filter(
      (pm) => pm.isVisibleOnFrontHemisphere && Math.abs(pm.effectiveLonDeg) < 62
    );
    if (visible.length === 0) return null;
    visible.sort((a, b) => a.distFromFocusCenter - b.distFromFocusCenter);
    return visible[0].marker.id;
  }, [projectedMarkers]);

  useEffect(() => {
    if (
      focusedMarkerId &&
      focusedMarkerId !== prevFocusedIdRef.current &&
      !isActivelySpinning
    ) {
      const idx = markers.findIndex((m) => m.id === focusedMarkerId);
      playConstellationStarNote(Math.max(0, idx), false);
      prevFocusedIdRef.current = focusedMarkerId;
    }
  }, [focusedMarkerId, isActivelySpinning, markers]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoomingIntoMarker) return;
    setIsDragging(true);
    targetRotationRef.current = null;
    inertiaVelocityRef.current = 0;

    dragStartRef.current = {
      clientX: e.clientX,
      startRotation: rotationRef.current,
      lastClientX: e.clientX,
      lastTime: performance.now(),
      velocityDegPerMs: 0,
      movedDistance: 0,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || zoomingIntoMarker) return;

    const dx = e.clientX - dragStartRef.current.clientX;
    dragStartRef.current.movedDistance = Math.max(
      dragStartRef.current.movedDistance,
      Math.abs(dx)
    );

    if (Math.abs(dx) > 6 && !isActivelySpinning) {
      setIsActivelySpinning(true);
    }

    const degPerPixel = 135 / Math.max(280, screenWidth);
    const nextRot = dragStartRef.current.startRotation + dx * degPerPixel;

    const now = performance.now();
    const dt = Math.max(1, now - dragStartRef.current.lastTime);
    const stepDx = e.clientX - dragStartRef.current.lastClientX;
    dragStartRef.current.velocityDegPerMs = (stepDx * degPerPixel) / dt;
    dragStartRef.current.lastClientX = e.clientX;
    dragStartRef.current.lastTime = now;

    rotationRef.current = nextRot;
    setRotationDeg(nextRot);
  };

  const handlePointerUpOrCancel = () => {
    if (!isDragging) return;
    setIsDragging(false);

    if (dragStartRef.current) {
      inertiaVelocityRef.current = Math.max(
        -0.18,
        Math.min(0.18, dragStartRef.current.velocityDegPerMs * 0.85)
      );
    }

    if (spinTimeoutRef.current) window.clearTimeout(spinTimeoutRef.current);
    spinTimeoutRef.current = window.setTimeout(() => {
      setIsActivelySpinning(false);
    }, 280);
  };

  const triggerZoomIntoRegion = useCallback(
    (pm: (typeof projectedMarkers)[number]) => {
      if (zoomingIntoMarker) return;
      playMarkersUnfurlChime();
      setZoomingIntoMarker({
        marker: pm.marker,
        screenX: pm.screenX,
        screenY: pm.screenY,
      });

      const matchedMap =
        availableMaps.find((m) => m.id === pm.marker.targetWorldMapId) ||
        (project.worldMap?.id === pm.marker.targetWorldMapId ? project.worldMap : undefined) ||
        availableMaps[0] ||
        project.worldMap;

      window.setTimeout(() => {
        onSelectRegionMarker(pm.marker, matchedMap);
      }, 980);
    },
    [zoomingIntoMarker, availableMaps, project.worldMap, onSelectRegionMarker]
  );

  const handleMarkerClick = (
    e: React.MouseEvent,
    pm: (typeof projectedMarkers)[number]
  ) => {
    e.stopPropagation();
    if (zoomingIntoMarker) return;
    if (dragStartRef.current && dragStartRef.current.movedDistance > 10) return;

    const isFocused = pm.marker.id === focusedMarkerId && !isActivelySpinning;

    if (isFocused) {
      triggerZoomIntoRegion(pm);
    } else {
      const baseLonDeg = pm.marker.nx * 78;
      const currentMod = ((rotationRef.current % 360) + 360) % 360;
      const desiredMod = ((-baseLonDeg % 360) + 360) % 360;
      let delta = desiredMod - currentMod;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      targetRotationRef.current = rotationRef.current + delta;
      playConstellationStarNote(0, false);
    }
  };

  const [isArrivingToOrbit, setIsArrivingToOrbit] = useState<boolean>(true);
  useEffect(() => {
    setIsArrivingToOrbit(true);
    const t = window.setTimeout(() => setIsArrivingToOrbit(false), 820);
    return () => window.clearTimeout(t);
  }, [targetPlanet?.id]);

  const cameraZoomScale = zoomingIntoMarker ? 3.5 : 1.0;
  const cameraTx = zoomingIntoMarker
    ? screenWidth * 0.5 - zoomingIntoMarker.screenX * cameraZoomScale
    : 0;
  const cameraTy = zoomingIntoMarker
    ? screenHeight * 0.5 - zoomingIntoMarker.screenY * cameraZoomScale
    : 0;

  const activePlanetImage =
    targetPlanet?.planetImagePng ||
    planetConfig.planetImagePng ||
    DEFAULT_PLANET_IMAGE_URL;
  const activeGlowColor =
    targetPlanet?.glowColor || planetConfig.glowColor || '#38bdf8';

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUpOrCancel}
      onPointerCancel={handlePointerUpOrCancel}
      onPointerLeave={handlePointerUpOrCancel}
      className="relative w-full h-full overflow-hidden select-none bg-[#03050a] cursor-grab active:cursor-grabbing touch-none"
      style={{
        width: `${screenWidth}px`,
        height: `${screenHeight}px`,
      }}
    >
      {/* EFEITO DE DESACELERAÇÃO DO HYPER-ZOOM AO CHEGAR NA ÓRBITA DO PLANETA/LUA */}
      <HyperspaceWarpTunnelOverlay
        active={isArrivingToOrbit}
        originX={screenWidth * 0.5}
        originY={screenHeight * 0.65}
        accentColor={activeGlowColor}
        secondaryColor="#fde047"
        direction="arrival"
      />

      <div
        className="relative w-full h-full pointer-events-none"
        style={{
          transformOrigin: '0 0',
          transform: `translate3d(${cameraTx}px, ${cameraTy}px, 0) scale(${cameraZoomScale})`,
          transition: zoomingIntoMarker
            ? 'transform 0.98s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.9s ease-in'
            : 'transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)',
          opacity: zoomingIntoMarker ? 0.12 : 1,
          animation: isArrivingToOrbit
            ? 'planetGlobeHyperApproachArrive 0.78s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            : 'none',
        }}
      >
        <style>{`
          @keyframes planetGlobeHyperApproachArrive {
            0% {
              transform: translateY(160px) scale(0.45);
              opacity: 0.2;
            }
            100% {
              transform: translateY(0px) scale(1);
              opacity: 1;
            }
          }
        `}</style>
        {/* 1. Espaço Profundo Realista no Fundo do Planeta */}
        <RealisticDeepSpaceBackdrop accentGlowColor={activeGlowColor} />

        {/* 2. Brilho Atmosférico ao Redor da Curvatura do Planeta */}
        <div
          style={{
            left: `${globeCenterX - globeRadius * 1.12}px`,
            top: `${globeCenterY - globeRadius * 1.12}px`,
            width: `${globeDiameter * 1.12}px`,
            height: `${globeDiameter * 1.12}px`,
            background: `radial-gradient(circle at 50% 50%, ${activeGlowColor}33 0%, rgba(245, 192, 68, 0.16) 46%, rgba(0, 0, 0, 0) 72%)`,
            filter: 'blur(20px)',
          }}
          className="absolute rounded-full pointer-events-none"
        />

        {/* 3. O Globo do Planeta Mostrando Metade Dele e Rodando Devagar */}
        <div
          style={{
            left: `${globeCenterX - globeRadius}px`,
            top: `${globeCenterY - globeRadius}px`,
            width: `${globeDiameter}px`,
            height: `${globeDiameter}px`,
          }}
          className="absolute rounded-full pointer-events-none flex items-center justify-center"
        >
          <img
            src={activePlanetImage}
            alt={targetPlanet?.name || planetConfig.title || 'Planeta'}
            draggable={false}
            style={{
              transform: `rotate(${rotationDeg * 0.65}deg)`,
              transition: isDragging ? 'none' : 'transform 0.08s linear',
            }}
            className="w-full h-full object-contain select-none pointer-events-none filter drop-shadow-[0_-14px_42px_rgba(0,0,0,0.95)]"
          />

          <div
            className="absolute inset-0 rounded-full pointer-events-none"
            style={{
              background:
                'radial-gradient(circle at 50% 35%, rgba(0,0,0,0) 52%, rgba(2,6,18,0.62) 86%, rgba(0,0,0,0.92) 100%)',
            }}
          />
        </div>

        {/* 4. Marcadores no Globo do Planeta (Estrelas Pulsantes fora de foco + PNG e Nome em foco) */}
        <div className="absolute inset-0 pointer-events-none z-30">
          {projectedMarkers.map((pm) => {
            if (!pm.isVisibleOnFrontHemisphere) return null;

            const isFocused =
              pm.marker.id === focusedMarkerId &&
              !isActivelySpinning &&
              !zoomingIntoMarker;

            const revealStage = isFocused ? 'full' : 'star_only';
            const edgeFade = Math.max(
              0.25,
              Math.min(1, (Math.cos((pm.effectiveLonDeg * Math.PI) / 180) + 0.1) * 1.15)
            );
            const depthScale =
              (0.78 + Math.max(0, pm.depthZ) * 0.28) * (pm.marker.scale || 1.0);

            return (
              <div
                key={pm.marker.id}
                onClick={(e) => handleMarkerClick(e, pm)}
                style={{
                  left: `${pm.screenX}px`,
                  top: `${pm.screenY}px`,
                  transform: 'translate(-20%, -84%)',
                  opacity: edgeFade,
                  zIndex: isFocused ? 100 : Math.round(50 + pm.depthZ * 40),
                }}
                className="absolute pointer-events-auto cursor-pointer transition-opacity duration-300"
                title={
                  isFocused
                    ? `Toque para aproximar a câmera e abrir a região "${pm.marker.name}"`
                    : `${pm.marker.name} (Toque para girar o planeta até aqui)`
                }
              >
                <OrnateMapMarkerPin
                  name={pm.marker.name}
                  iconPng={pm.marker.iconPng}
                  iconEmoji={pm.marker.iconEmoji || '🏰'}
                  status={pm.marker.status || 'unlocked'}
                  isSelected={isFocused}
                  isFocused={isFocused}
                  scale={depthScale}
                  sizeVariant="md"
                  revealStage={revealStage}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EDITOR UNIFICADO DAS CAMADAS 1 (SISTEMA SOLAR) E 2 (GLOBO DO PLANETA)
// ============================================================================
interface PlanetGlobeEditorSectionProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedWorldMaps: WorldMapConfig[];
  onSwitchToRegionalMapEditor: (targetMapId: string) => void;
  onCreateNewRegionalMapForMarker: (markerId: string, markerName: string) => void;
  showToast: (msg: string) => void;
}

export const PlanetGlobeEditorSection: React.FC<PlanetGlobeEditorSectionProps> = ({
  project,
  setProject,
  savedWorldMaps,
  onSwitchToRegionalMapEditor,
  showToast,
}) => {
  const planetConfig = getOrCreatePlanetGlobeConfig(project);
  const planets = planetConfig.planets || [];

  // Alterna entre editar a Camada 1 (Sistema Solar) ou a Camada 2 (Globo do Planeta selecionado e seus marcadores)
  const [editorLayerSubTab, setEditorLayerSubTab] = useState<'solar_layer1' | 'globe_layer2'>(
    'solar_layer1'
  );

  const [selectedPlanetId, setSelectedPlanetId] = useState<string>(
    planets[0]?.id || ''
  );
  const [selectedMoonId, setSelectedMoonId] = useState<string | null>(null);
  const [selectedGlobeMarkerId, setSelectedGlobeMarkerId] = useState<string | null>(null);

  const [editorOrbitTimeSec, setEditorOrbitTimeSec] = useState<number>(0);
  const [editorGlobeRotationDeg, setEditorGlobeRotationDeg] = useState<number>(0);
  const [autoPlayPreview, setAutoPlayPreview] = useState<boolean>(true);
  const [draggingPlanetId, setDraggingPlanetId] = useState<string | null>(null);
  const [draggingGlobeMarkerId, setDraggingGlobeMarkerId] = useState<string | null>(null);

  const bodyImageInputRef = useRef<HTMLInputElement>(null);
  const markerIconInputRef = useRef<HTMLInputElement>(null);
  const globeMarkerIconInputRef = useRef<HTMLInputElement>(null);
  const sunImageInputRef = useRef<HTMLInputElement>(null);
  const solarCanvasRef = useRef<HTMLDivElement>(null);
  const globeCanvasRef = useRef<HTMLDivElement>(null);

  const selectedPlanet =
    planets.find((p) => p.id === selectedPlanetId) || planets[0] || null;
  const selectedMoon =
    selectedPlanet && selectedMoonId
      ? (selectedPlanet.moons || []).find((m) => m.id === selectedMoonId) || null
      : null;

  const currentPlanetGlobeMarkers = useMemo(() => {
    if (!selectedPlanet) return [];
    if (selectedPlanet.markers && selectedPlanet.markers.length > 0) {
      return selectedPlanet.markers;
    }
    return buildDefaultMarkersForPlanet(selectedPlanet.id, selectedPlanet.name, project);
  }, [selectedPlanet, project]);

  const selectedGlobeMarker =
    currentPlanetGlobeMarkers.find((m) => m.id === selectedGlobeMarkerId) ||
    currentPlanetGlobeMarkers[0] ||
    null;

  const updatePlanetConfig = useCallback(
    (patch: Partial<PlanetGlobeConfig>) => {
      setProject((prev) => {
        const current = getOrCreatePlanetGlobeConfig(prev);
        return {
          ...prev,
          planetGlobe: {
            ...current,
            ...patch,
          },
        };
      });
    },
    [setProject]
  );

  const updateSolarPlanet = useCallback(
    (planetId: string, patch: Partial<SolarSystemPlanet>) => {
      setProject((prev) => {
        const current = getOrCreatePlanetGlobeConfig(prev);
        const nextPlanets = (current.planets || []).map((p) =>
          p.id === planetId ? { ...p, ...patch } : p
        );
        return {
          ...prev,
          planetGlobe: {
            ...current,
            planets: nextPlanets,
          },
        };
      });
    },
    [setProject]
  );

  const updateSolarMoon = useCallback(
    (planetId: string, moonId: string, patch: Partial<SolarSystemMoon>) => {
      setProject((prev) => {
        const current = getOrCreatePlanetGlobeConfig(prev);
        const nextPlanets = (current.planets || []).map((p) =>
          p.id === planetId
            ? {
                ...p,
                moons: (p.moons || []).map((m) =>
                  m.id === moonId ? { ...m, ...patch } : m
                ),
              }
            : p
        );
        return {
          ...prev,
          planetGlobe: {
            ...current,
            planets: nextPlanets,
          },
        };
      });
    },
    [setProject]
  );

  const updatePlanetGlobeMarker = useCallback(
    (planetId: string, markerId: string, patch: Partial<PlanetGlobeMarker>) => {
      if (!selectedPlanet) return;
      const nextMarkers = currentPlanetGlobeMarkers.map((m) =>
        m.id === markerId ? { ...m, ...patch } : m
      );
      updateSolarPlanet(planetId, { markers: nextMarkers });
    },
    [selectedPlanet, currentPlanetGlobeMarkers, updateSolarPlanet]
  );

  useEffect(() => {
    if (!autoPlayPreview || draggingPlanetId || draggingGlobeMarkerId) return;
    let rafId: number;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(64, now - lastTs);
      lastTs = now;
      const mult = planetConfig.autoRotateSpeed ?? 1.0;
      setEditorOrbitTimeSec((prev) => prev + (dt / 1000) * mult);
      setEditorGlobeRotationDeg((prev) => (prev + mult * 1.6 * (dt / 1000)) % 360);
      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
  }, [autoPlayPreview, draggingPlanetId, draggingGlobeMarkerId, planetConfig.autoRotateSpeed]);

  const handleAddPlanet = () => {
    const idx = planets.length + 1;
    const defaultMapId =
      savedWorldMaps[0]?.id || project.worldMap?.id || 'map-main-default';
    const newId = `solar-planet-${Date.now()}`;
    const newPlanet: SolarSystemPlanet = {
      id: newId,
      name: `Planeta ${idx}`,
      description: 'Novo planeta explorável no sistema solar.',
      planetImagePng: planetConfig.planetImagePng || DEFAULT_PLANET_IMAGE_URL,
      markerIconEmoji: '🪐',
      glowColor: idx % 2 === 0 ? '#a855f7' : '#38bdf8',
      hasRings: idx % 2 === 0,
      sizePx: 42,
      orbitRadiusRatio: Math.min(0.88, 0.26 + idx * 0.14),
      orbitSpeed: Math.max(1.2, 5.0 - idx * 0.7),
      selfRotateSpeed: 6,
      initialAngleDeg: (idx * 75) % 360,
      targetWorldMapId: defaultMapId,
      status: 'unlocked',
      scale: 1.0,
      markers: buildDefaultMarkersForPlanet(newId, `Planeta ${idx}`, project),
      moons: [],
    };

    updatePlanetConfig({
      planets: [...planets, newPlanet],
    });
    setSelectedPlanetId(newPlanet.id);
    setSelectedMoonId(null);
    showToast(`🪐 "${newPlanet.name}" adicionado à Camada 1 (Sistema Solar)!`);
  };

  const handleDeletePlanet = (planetId: string) => {
    if (planets.length <= 1) {
      showToast('O Sistema Solar precisa ter pelo menos 1 planeta.');
      return;
    }
    const next = planets.filter((p) => p.id !== planetId);
    updatePlanetConfig({ planets: next });
    if (selectedPlanetId === planetId) {
      setSelectedPlanetId(next[0]?.id || '');
      setSelectedMoonId(null);
    }
    showToast('🗑️ Planeta removido do Sistema Solar.');
  };

  const handleAddMoonToPlanet = (planet: SolarSystemPlanet) => {
    const currentMoons = planet.moons || [];
    const mIdx = currentMoons.length + 1;
    const defaultMapId =
      planet.targetWorldMapId ||
      savedWorldMaps[0]?.id ||
      project.worldMap?.id ||
      'map-main-default';

    const newMoon: SolarSystemMoon = {
      id: `moon-${Date.now()}`,
      name: `Lua ${mIdx} de ${planet.name}`,
      imagePng: planet.planetImagePng || DEFAULT_PLANET_IMAGE_URL,
      markerIconEmoji: '🌙',
      sizePx: 14,
      orbitRadiusPx: 36 + currentMoons.length * 14,
      orbitSpeed: mIdx % 2 === 0 ? -22 : 24,
      initialAngleDeg: (mIdx * 110) % 360,
      targetWorldMapId: defaultMapId,
      status: 'unlocked',
    };

    updateSolarPlanet(planet.id, {
      moons: [...currentMoons, newMoon],
    });
    setSelectedMoonId(newMoon.id);
    showToast(`🌙 "${newMoon.name}" adicionada à órbita de ${planet.name}!`);
  };

  const handleDeleteMoon = (planet: SolarSystemPlanet, moonId: string) => {
    const nextMoons = (planet.moons || []).filter((m) => m.id !== moonId);
    updateSolarPlanet(planet.id, { moons: nextMoons });
    if (selectedMoonId === moonId) {
      setSelectedMoonId(null);
    }
    showToast('🗑️ Lua removida.');
  };

  const handleAddGlobeMarker = () => {
    if (!selectedPlanet) return;
    const idx = currentPlanetGlobeMarkers.length + 1;
    const defaultMapId =
      selectedPlanet.targetWorldMapId ||
      savedWorldMaps[0]?.id ||
      project.worldMap?.id ||
      'map-main-default';
    const newMarker: PlanetGlobeMarker = {
      id: `${selectedPlanet.id}-reg-${Date.now()}`,
      name: `Região ${idx} de ${selectedPlanet.name}`,
      nx: 0,
      ny: -0.35,
      iconEmoji: '🏰',
      targetWorldMapId: defaultMapId,
      status: 'unlocked',
      scale: 1.0,
    };
    const next = [...currentPlanetGlobeMarkers, newMarker];
    updateSolarPlanet(selectedPlanet.id, { markers: next });
    setSelectedGlobeMarkerId(newMarker.id);
    showToast(`📍 "${newMarker.name}" adicionado ao globo de ${selectedPlanet.name}!`);
  };

  const handleDeleteGlobeMarker = (markerId: string) => {
    if (!selectedPlanet) return;
    if (currentPlanetGlobeMarkers.length <= 1) {
      showToast('O planeta precisa ter pelo menos 1 marcador de região.');
      return;
    }
    const next = currentPlanetGlobeMarkers.filter((m) => m.id !== markerId);
    updateSolarPlanet(selectedPlanet.id, { markers: next });
    if (selectedGlobeMarkerId === markerId) {
      setSelectedGlobeMarkerId(next[0]?.id || null);
    }
    showToast('🗑️ Marcador removido do globo.');
  };

  const applyBodyImageFile = async (file: File) => {
    try {
      const localRes = await readUploadedImage(file);
      const diskUrl = await uploadFileToDisk(file, 'maps');
      const finalUrl = diskUrl || localRes.dataUrl;

      if (selectedPlanet && selectedMoon) {
        updateSolarMoon(selectedPlanet.id, selectedMoon.id, {
          imagePng: finalUrl,
        });
        showToast(`🌙 PNG da Lua "${selectedMoon.name}" atualizada!`);
      } else if (selectedPlanet) {
        updateSolarPlanet(selectedPlanet.id, { planetImagePng: finalUrl });
        showToast(`🌍 PNG do Planeta "${selectedPlanet.name}" atualizada!`);
      }
    } catch {
      showToast('Erro ao carregar PNG do astro.');
    }
  };

  const handleBodyImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await applyBodyImageFile(file);
  };

  const handleMarkerIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPlanet) return;
    e.target.value = '';
    try {
      const localRes = await readUploadedImage(file);
      const diskUrl = await uploadFileToDisk(file, 'maps');
      const finalUrl = diskUrl || localRes.dataUrl;

      if (selectedMoon) {
        updateSolarMoon(selectedPlanet.id, selectedMoon.id, {
          markerIconPng: finalUrl,
        });
      } else {
        updateSolarPlanet(selectedPlanet.id, { markerIconPng: finalUrl });
      }
      showToast('✨ PNG do pop-up do planeta atualizada!');
    } catch {
      showToast('Erro ao carregar PNG do marcador.');
    }
  };

  const handleGlobeMarkerIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPlanet || !selectedGlobeMarker) return;
    e.target.value = '';
    try {
      const localRes = await readUploadedImage(file);
      const diskUrl = await uploadFileToDisk(file, 'maps');
      const finalUrl = diskUrl || localRes.dataUrl;
      updatePlanetGlobeMarker(selectedPlanet.id, selectedGlobeMarker.id, {
        iconPng: finalUrl,
      });
      showToast(`✨ PNG do marcador "${selectedGlobeMarker.name}" atualizada!`);
    } catch {
      showToast('Erro ao carregar PNG do marcador.');
    }
  };

  const handleSunImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const localRes = await readUploadedImage(file);
      const diskUrl = await uploadFileToDisk(file, 'maps');
      updatePlanetConfig({ sunImagePng: diskUrl || localRes.dataUrl });
      showToast('☀️ PNG do Sol Central atualizada!');
    } catch {
      showToast('Erro ao carregar PNG do Sol.');
    }
  };

  // Geometria do Canvas de Preview no Editor
  const canvasWidth = 860;
  const canvasHeight = 620;
  const centerX = canvasWidth * 0.5;
  const centerY = canvasHeight * 0.52;
  const systemScale = planetConfig.planetScale ?? 1.0;
  const orbitTilt = planetConfig.orbitTiltRatio ?? 0.66;
  const maxRadius = Math.min(canvasWidth * 0.45, canvasHeight * 0.44) * systemScale;

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingPlanetId || !solarCanvasRef.current) return;
    const rect = solarCanvasRef.current.getBoundingClientRect();
    const dx = e.clientX - rect.left - centerX;
    const dy = (e.clientY - rect.top - centerY) / Math.max(0.25, orbitTilt);

    const rawDist = Math.hypot(dx, dy);
    const newRatio = Math.max(0.16, Math.min(0.88, Number((rawDist / maxRadius).toFixed(3))));
    const angleDeg = Math.round(((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360);

    const draggedPlanet = planets.find((p) => p.id === draggingPlanetId);
    const compensatedAngle =
      (angleDeg - editorOrbitTimeSec * (draggedPlanet?.orbitSpeed ?? 3.0) + 3600) % 360;

    updateSolarPlanet(draggingPlanetId, {
      orbitRadiusRatio: newRatio,
      initialAngleDeg: Math.round(compensatedAngle),
    });
  };

  const handleGlobeMarkerPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingGlobeMarkerId || !globeCanvasRef.current || !selectedPlanet) return;
    const rect = globeCanvasRef.current.getBoundingClientRect();
    const globeR = 260;
    const gCx = canvasWidth * 0.5;
    const gCy = canvasHeight * 0.92;
    const dx = e.clientX - rect.left - gCx;
    const dy = e.clientY - rect.top - gCy;

    const nx = Math.max(-0.85, Math.min(0.85, Number((dx / (globeR * 0.82)).toFixed(3))));
    const ny = Math.max(-0.85, Math.min(-0.08, Number((dy / (globeR * 0.82)).toFixed(3))));
    updatePlanetGlobeMarker(selectedPlanet.id, draggingGlobeMarkerId, { nx, ny });
  };

  const activeEditingImage = selectedMoon
    ? selectedMoon.imagePng ||
      selectedPlanet?.planetImagePng ||
      planetConfig.planetImagePng ||
      DEFAULT_PLANET_IMAGE_URL
    : selectedPlanet?.planetImagePng ||
      planetConfig.planetImagePng ||
      DEFAULT_PLANET_IMAGE_URL;

  const activeEditingMarkerPng = selectedMoon
    ? selectedMoon.markerIconPng
    : selectedPlanet?.markerIconPng;

  const activeEditingMarkerEmoji = selectedMoon
    ? selectedMoon.markerIconEmoji || '🌙'
    : selectedPlanet?.markerIconEmoji || '🪐';

  return (
    <div className="flex-1 flex overflow-hidden relative bg-zinc-950">
      <input
        ref={bodyImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleBodyImageUpload}
        className="hidden"
      />
      <input
        ref={markerIconInputRef}
        type="file"
        accept="image/*"
        onChange={handleMarkerIconUpload}
        className="hidden"
      />
      <input
        ref={globeMarkerIconInputRef}
        type="file"
        accept="image/*"
        onChange={handleGlobeMarkerIconUpload}
        className="hidden"
      />
      <input
        ref={sunImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleSunImageUpload}
        className="hidden"
      />

      {/* PAINEL LATERAL DO EDITOR DAS 3 CAMADAS */}
      <div className="w-[450px] xl:w-[490px] bg-zinc-900 border-r border-zinc-800 flex flex-col shrink-0 z-20 shadow-xl overflow-y-auto">
        {/* Seletor das Camadas do Mapa no Editor */}
        <div className="p-3 bg-zinc-950 border-b border-zinc-800 space-y-2">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">
            Arquitetura de 3 Camadas do Mapa
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => setEditorLayerSubTab('solar_layer1')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                editorLayerSubTab === 'solar_layer1'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>1. Sistema Solar</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorLayerSubTab('globe_layer2')}
              className={`px-3 py-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                editorLayerSubTab === 'globe_layer2'
                  ? 'bg-amber-500 text-slate-950 shadow'
                  : 'bg-zinc-900 text-zinc-300 border border-zinc-800 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>2. Globo do Planeta</span>
            </button>
          </div>
        </div>

        {editorLayerSubTab === 'solar_layer1' ? (
          <>
            {/* SUB-ABA CAMADA 1: SISTEMA SOLAR */}
            <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                    Camada 1: Sistema Solar & Órbitas
                  </h3>
                  <p className="text-[10px] text-zinc-400">
                    Planetas sem estrelas em órbita. Clicar pausa a órbita e revela o pop-up de trás do planeta.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddPlanet}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Planeta</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-[9.5px]">
                    <span className="text-zinc-400">Vel. Órbitas:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {(planetConfig.autoRotateSpeed ?? 1.0).toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={4}
                    step={0.2}
                    value={planetConfig.autoRotateSpeed ?? 1.0}
                    onChange={(e) =>
                      updatePlanetConfig({ autoRotateSpeed: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[9.5px]">
                    <span className="text-zinc-400">Escala Geral:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {Math.round((planetConfig.planetScale ?? 1.0) * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.7}
                    max={1.35}
                    step={0.05}
                    value={planetConfig.planetScale ?? 1.0}
                    onChange={(e) =>
                      updatePlanetConfig({ planetScale: parseFloat(e.target.value) })
                    }
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Lista de Planetas do Sistema Solar */}
            <div className="p-2.5 space-y-2 max-h-[210px] overflow-y-auto border-b border-zinc-800 bg-zinc-950/30">
              {planets.map((p) => {
                const isPlanSel = p.id === selectedPlanet?.id && !selectedMoonId;
                return (
                  <div
                    key={p.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/70 overflow-hidden"
                  >
                    <div
                      onClick={() => {
                        setSelectedPlanetId(p.id);
                        setSelectedMoonId(null);
                      }}
                      className={`flex items-center justify-between p-2 text-xs cursor-pointer transition-all ${
                        isPlanSel
                          ? 'bg-amber-500/20 text-white'
                          : 'text-zinc-200 hover:bg-zinc-800/80'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <img
                          src={
                            p.planetImagePng ||
                            planetConfig.planetImagePng ||
                            DEFAULT_PLANET_IMAGE_URL
                          }
                          alt={p.name}
                          className="w-8 h-8 rounded-full object-contain bg-black/60 p-0.5 border border-amber-500/40 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-extrabold truncate text-xs">
                            {p.name}
                          </div>
                          <div className="text-[9.5px] text-amber-300/80 truncate">
                            📍 {(p.markers || []).length} regiões no globo • {(p.moons || []).length} lua(s)
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanetId(p.id);
                            setEditorLayerSubTab('globe_layer2');
                          }}
                          className="px-2 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[9.5px] font-bold cursor-pointer"
                          title="Editar os marcadores e o globo giratório deste Planeta (Camada 2)"
                        >
                          🌍 Globo (Camada 2)
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPlanetId(p.id);
                            handleAddMoonToPlanet(p);
                          }}
                          className="px-2 py-1 rounded-md bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-[9.5px] font-bold cursor-pointer"
                        >
                          + Lua
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePlanet(p.id);
                          }}
                          className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Propriedades do Planeta selecionado na Camada 1 */}
            {selectedPlanet && (
              <div className="p-3.5 space-y-3 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                    Nome do Planeta
                  </label>
                  <input
                    type="text"
                    value={selectedPlanet.name}
                    onChange={(e) =>
                      updateSolarPlanet(selectedPlanet.id, { name: e.target.value })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-amber-500/35 space-y-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={activeEditingImage}
                        alt=""
                        className="w-10 h-10 object-contain rounded-lg bg-black p-1 border border-amber-500/40"
                      />
                      <span className="text-[10px] font-extrabold text-white">
                        PNG do Planeta
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => bodyImageInputRef.current?.click()}
                      className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Trocar PNG</span>
                    </button>
                  </div>

                  <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                        {activeEditingMarkerPng ? (
                          <img
                            src={activeEditingMarkerPng}
                            alt=""
                            className="w-8 h-8 object-contain"
                          />
                        ) : (
                          <span className="text-lg">{activeEditingMarkerEmoji}</span>
                        )}
                      </div>
                      <span className="text-[10px] font-extrabold text-white">
                        PNG do Pop-up
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => markerIconInputRef.current?.click()}
                      className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-amber-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Trocar Ícone</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800">
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-400">Tamanho Planeta:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {selectedPlanet.sizePx || 42}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={24}
                      max={64}
                      step={2}
                      value={selectedPlanet.sizePx || 42}
                      onChange={(e) =>
                        updateSolarPlanet(selectedPlanet.id, {
                          sizePx: parseInt(e.target.value, 10),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-400">Raio do Arco:</span>
                      <span className="font-mono font-bold text-amber-300">
                        {Math.round((selectedPlanet.orbitRadiusRatio ?? 0.35) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={0.88}
                      step={0.02}
                      value={selectedPlanet.orbitRadiusRatio ?? 0.35}
                      onChange={(e) =>
                        updateSolarPlanet(selectedPlanet.id, {
                          orbitRadiusRatio: parseFloat(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setEditorLayerSubTab('globe_layer2')}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Globe className="w-4 h-4" />
                  <span>Editar Camada 2: Marcadores no Globo de "{selectedPlanet.name}" ➔</span>
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* SUB-ABA CAMADA 2: GLOBO DO PLANETA & SEUS MARCADORES DE REGIÃO */}
            <div className="p-3.5 bg-zinc-950/60 border-b border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Planeta Selecionado:
                </label>
                <select
                  value={selectedPlanet?.id || ''}
                  onChange={(e) => {
                    setSelectedPlanetId(e.target.value);
                    setSelectedGlobeMarkerId(null);
                  }}
                  className="bg-zinc-800 border border-amber-500/50 rounded-lg px-2.5 py-1 text-xs font-extrabold text-amber-300"
                >
                  {planets.map((p) => (
                    <option key={p.id} value={p.id}>
                      🪐 {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Marcadores no Globo ({currentPlanetGlobeMarkers.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddGlobeMarker}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  <span>+ Região no Globo</span>
                </button>
              </div>
            </div>

            <div className="p-2.5 space-y-1.5 max-h-[200px] overflow-y-auto border-b border-zinc-800">
              {currentPlanetGlobeMarkers.map((m) => {
                const isSel = m.id === selectedGlobeMarker?.id;
                const linkedMap = savedWorldMaps.find(
                  (wm) => wm.id === m.targetWorldMapId
                );
                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedGlobeMarkerId(m.id)}
                    className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-all ${
                      isSel
                        ? 'bg-amber-500/20 border border-amber-500/50 text-white'
                        : 'bg-zinc-900/70 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span>{m.iconEmoji || '🏰'}</span>
                      <div className="min-w-0">
                        <div className="font-extrabold truncate">{m.name}</div>
                        <div className="text-[9.5px] text-amber-300/80 truncate">
                          Abre Camada 3: {linkedMap?.title || 'Mapa Regional Principal'}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGlobeMarker(m.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-rose-400 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {selectedPlanet && selectedGlobeMarker && (
              <div className="p-3.5 space-y-3 flex-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                    Nome da Região no Globo
                  </label>
                  <input
                    type="text"
                    value={selectedGlobeMarker.name}
                    onChange={(e) =>
                      updatePlanetGlobeMarker(selectedPlanet.id, selectedGlobeMarker.id, {
                        name: e.target.value,
                      })
                    }
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                  />
                </div>

                <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center">
                      {selectedGlobeMarker.iconPng ? (
                        <img
                          src={selectedGlobeMarker.iconPng}
                          alt=""
                          className="w-8 h-8 object-contain"
                        />
                      ) : (
                        <span className="text-lg">
                          {selectedGlobeMarker.iconEmoji || '🏰'}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Ícone PNG em Foco
                      </span>
                      <span className="text-[9.5px] text-zinc-400">
                        Exibido quando o marcador entra em foco no globo
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => globeMarkerIconInputRef.current?.click()}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-[10px] font-extrabold cursor-pointer"
                  >
                    Upload PNG
                  </button>
                </div>

                <div className="p-3 rounded-xl bg-indigo-950/35 border border-indigo-500/40 space-y-2">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Qual Mapa Regional (Camada 3) abre ao clicar?</span>
                  </label>
                  <select
                    value={
                      selectedGlobeMarker.targetWorldMapId ||
                      savedWorldMaps[0]?.id ||
                      ''
                    }
                    onChange={(e) =>
                      updatePlanetGlobeMarker(selectedPlanet.id, selectedGlobeMarker.id, {
                        targetWorldMapId: e.target.value,
                      })
                    }
                    className="w-full bg-zinc-900 border border-indigo-500/40 rounded-lg px-2.5 py-2 text-xs font-bold text-white"
                  >
                    {savedWorldMaps.map((wm, idx) => (
                      <option key={wm.id || idx} value={wm.id}>
                        🗺️ {wm.title || `Mapa Regional ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const targetId =
                        selectedGlobeMarker.targetWorldMapId ||
                        savedWorldMaps[0]?.id ||
                        'map-main-default';
                      onSwitchToRegionalMapEditor(targetId);
                    }}
                    className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Editar Camada 3 (Mapa Regional)</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* CANVAS INTERATIVO DO EDITOR (EXIBE CAMADA 1 OU CAMADA 2) */}
      <div className="flex-1 overflow-auto flex flex-col items-center justify-center p-6 bg-zinc-950 relative select-none">
        <div className="mb-3 flex items-center justify-between w-full max-w-[860px] px-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800">
          <span className="text-xs font-bold text-zinc-200">
            {editorLayerSubTab === 'solar_layer1'
              ? '🪐 Preview Camada 1: Arraste os planetas nas órbitas'
              : `🌍 Preview Camada 2: Arraste os marcadores sobre o globo de "${selectedPlanet?.name}"`}
          </span>
          <button
            type="button"
            onClick={() => setAutoPlayPreview((p) => !p)}
            className={`px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer border ${
              autoPlayPreview
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-300'
            }`}
          >
            {autoPlayPreview ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>{autoPlayPreview ? 'Pausar Giro' : 'Girar'}</span>
          </button>
        </div>

        {editorLayerSubTab === 'solar_layer1' ? (
          <div
            ref={solarCanvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerUp={() => setDraggingPlanetId(null)}
            onPointerLeave={() => setDraggingPlanetId(null)}
            style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
            className="relative rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] bg-[#020308] shrink-0"
          >
            <SolarSystemLayerView
              project={project}
              screenWidth={canvasWidth}
              screenHeight={canvasHeight}
              pausedPlanetId={selectedPlanet?.id || null}
              onSelectPausedPlanet={(id) => {
                if (id) setSelectedPlanetId(id);
              }}
              onEnterPlanetGlobe={(planet) => {
                setSelectedPlanetId(planet.id);
                setEditorLayerSubTab('globe_layer2');
              }}
            />
          </div>
        ) : (
          <div
            ref={globeCanvasRef}
            onPointerMove={handleGlobeMarkerPointerMove}
            onPointerUp={() => setDraggingGlobeMarkerId(null)}
            onPointerLeave={() => setDraggingGlobeMarkerId(null)}
            style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
            className="relative rounded-2xl overflow-hidden border-2 border-zinc-800 shadow-[0_0_50px_rgba(0,0,0,0.85)] bg-[#03050a] shrink-0"
          >
            <PlanetGlobeEmulatorView
              project={project}
              activePlanet={selectedPlanet}
              screenWidth={canvasWidth}
              screenHeight={canvasHeight}
              availableMaps={savedWorldMaps}
              onSelectRegionMarker={(marker) => {
                setSelectedGlobeMarkerId(marker.id);
                if (marker.targetWorldMapId) {
                  onSwitchToRegionalMapEditor(marker.targetWorldMapId);
                }
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};
