import { BiomeTileConfig, MapMarker, MapProject, SavedLevel } from '../types/map';

/** Tamanho da célula de colisão do pincel delimitador (px). Traço fino e único. */
export const COLLISION_CELL = 8;

/** Migra células antigas (24px) para a grade atual: cada célula vira 3x3. Idempotente via collisionGrid. */
export function migrateCollisionCells(cells: string[] | undefined, from: number): string[] {
  if (!cells || cells.length === 0 || from === COLLISION_CELL) return cells || [];
  const k = from / COLLISION_CELL;
  const out = new Set<string>();
  for (const key of cells) {
    const [cStr, rStr] = key.split(',');
    const c = Number(cStr);
    const r = Number(rStr);
    if (Number.isNaN(c) || Number.isNaN(r)) continue;
    for (let dc = 0; dc < k; dc++) {
      for (let dr = 0; dr < k; dr++) {
        out.add(`${c * k + dc},${r * k + dr}`);
      }
    }
  }
  return Array.from(out);
}

export interface BiomeSegmentSpan {
  biome: BiomeTileConfig;
  startY: number;
  endY: number;
  height: number;
  index: number;
}

/**
 * Calculates start and end Y coordinates for each biome segment based on its PNG tile height and repeat count.
 */
export function getBiomeSegmentSpans(biomes: BiomeTileConfig[]): BiomeSegmentSpan[] {
  let currentY = 0;
  if (!Array.isArray(biomes)) return [];
  return biomes.map((biome, index) => {
    const tileH = Math.max(8, biome && biome.tileHeight > 0 ? biome.tileHeight : 64);
    const repeat = Math.max(1, biome && biome.tileRepeatCount > 0 ? biome.tileRepeatCount : 1);
    const height = repeat * tileH;
    const startY = currentY;
    const endY = currentY + height;
    currentY = endY;
    return {
      biome,
      startY,
      endY,
      height,
      index,
    };
  });
}

/**
 * Calculates the total vertical height of the map (sum of repeatCount * tileHeight for each biome).
 */
export function getTotalMapHeight(biomes: BiomeTileConfig[]): number {
  if (!Array.isArray(biomes) || biomes.length === 0) return 768;
  const total = biomes.reduce((sum, b) => {
    if (!b) return sum;
    const h = Math.max(8, b.tileHeight > 0 ? b.tileHeight : 64);
    const repeat = Math.max(1, b.tileRepeatCount > 0 ? b.tileRepeatCount : 1);
    return sum + repeat * h;
  }, 0);
  return Math.max(100, total);
}

export function getBiomeAtY(
  y: number,
  spans: BiomeSegmentSpan[]
): BiomeTileConfig | undefined {
  const span = spans.find((s) => y >= s.startY && y < s.endY);
  return span ? span.biome : spans[spans.length - 1]?.biome;
}

/**
 * Calculates total route distance in pixels and realistic kilometers
 */
export function calculateRouteDistance(
  markerIds: string[],
  markers: MapMarker[],
  pixelToKmFactor = 0.5
): { pixelDistance: number; kmDistance: number } {
  if (markerIds.length < 2) return { pixelDistance: 0, kmDistance: 0 };

  const markerMap = new Map(markers.map((m) => [m.id, m]));
  let totalPixels = 0;

  for (let i = 0; i < markerIds.length - 1; i++) {
    const m1 = markerMap.get(markerIds[i]);
    const m2 = markerMap.get(markerIds[i + 1]);
    if (m1 && m2) {
      const dx = m2.x - m1.x;
      const dy = m2.y - m1.y;
      totalPixels += Math.hypot(dx, dy);
    }
  }

  return {
    pixelDistance: Math.round(totalPixels),
    kmDistance: Math.round(totalPixels * pixelToKmFactor),
  };
}

/**
 * Generates smooth SVG path string (Catmull-Rom or cubic Bezier) through markers
 */
export function generateCurvedPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    const p0 = points[0];
    const p1 = points[1];
    const midX = (p0.x + p1.x) / 2 + (p1.y - p0.y) * 0.08;
    const midY = (p0.y + p1.y) / 2;
    return `M ${p0.x} ${p0.y} Q ${midX} ${midY} ${p1.x} ${p1.y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i > 0 ? points[i - 1] : points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i < points.length - 2 ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

const randId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

/**
 * Separa UM projeto misto (biomas + sub-biomas) em dois puros, um por modo.
 * Portais marcador→marcador que cruzavam a divisão viram portal→fase salva (com pouso).
 * Travels para sub-bioma no lado vertical viram travel para a tela extended.
 * Retorna { vertical, extended } — extended null quando já era puro.
 */
export function splitMixedProject(
  pd: MapProject,
  verticalLevelId: string | null,
  makeLevelId: () => string = () => `level-${randId()}`
): { vertical: MapProject; extended: MapProject | null; extendedLevelId: string | null } {
  const hasB = (pd.biomes || []).length > 0;
  const hasS = (pd.subBiomes || []).length > 0;
  if (pd.canvasKind === 'vertical' || pd.canvasKind === 'extended' || !(hasB && hasS)) {
    const kind = pd.canvasKind || (hasS && !hasB ? 'extended' : 'vertical');
    return { vertical: { ...pd, canvasKind: kind }, extended: null, extendedLevelId: null };
  }
  const eLevelId = `level-${randId()}`;
  const subIds = new Set((pd.subBiomes || []).map((sb) => sb.id));

  const toLevelTravel = (m: MapMarker, landingLevelId: string, landingMarkerId?: string): MapMarker => ({
    ...m,
    travelTargetType: 'level',
    targetLevelId: landingLevelId,
    targetLevelMarkerId: landingMarkerId,
    targetTravelMarkerId: undefined,
    targetSubBiomeId: undefined,
  });

  const vMarkers = (pd.markers || [])
    .filter((m) => !m.subBiomeId)
    .map((m) => {
      // destino em outra metade? vira travel p/ tela extended (com pouso)
      if (
        m.type === 'travel' &&
        (m.travelTargetType || 'marker') === 'marker' &&
        m.targetTravelMarkerId &&
        (pd.markers || []).some((t) => t.id === m.targetTravelMarkerId && t.subBiomeId)
      ) {
        return toLevelTravel(m, eLevelId, m.targetTravelMarkerId);
      }
      // destino sub-bioma (foi p/ outra tela)? vira travel p/ tela extended
      if (m.targetSubBiomeId && subIds.has(m.targetSubBiomeId)) {
        return toLevelTravel({ ...m, targetSubBiomeId: undefined }, eLevelId, undefined);
      }
      return m;
    });

  const eMarkers = (pd.markers || [])
    .filter((m) => !!m.subBiomeId)
    .map((m) => {
      // destino no vertical? vira travel p/ tela vertical (com pouso)
      if (
        m.type === 'travel' &&
        (m.travelTargetType || 'marker') === 'marker' &&
        m.targetTravelMarkerId &&
        (pd.markers || []).some((t) => t.id === m.targetTravelMarkerId && !t.subBiomeId) &&
        verticalLevelId
      ) {
        return toLevelTravel(m, verticalLevelId, m.targetTravelMarkerId);
      }
      return m;
    });

  const vertical: MapProject = {
    ...JSON.parse(JSON.stringify(pd)),
    canvasKind: 'vertical',
    subBiomes: [],
    markers: vMarkers,
  };
  const extended: MapProject = {
    ...JSON.parse(JSON.stringify(pd)),
    id: `project-${randId()}`,
    canvasKind: 'extended',
    biomes: [],
    walkableCells: [],
    blockedCells: [],
    markers: eMarkers,
  };
  return { vertical, extended, extendedLevelId: eLevelId };
}

/** Assinatura de sub-biomas p/ deduplicar partes extended vindas de fontes distintas. */
export function subBiomeSig(pd: MapProject): string {
  return (pd.subBiomes || []).map((sb) => sb.id).sort().join('|');
}
