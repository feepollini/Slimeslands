export type TerrainPenMode = 'grass' | 'water' | 'flowers' | 'noise' | 'eraser';

export type GrassBladePreset = 'cluster' | 'fine' | 'clover' | 'bamboo' | 'autumn';
export type WaterPreset = 'turquoise' | 'deep' | 'emerald' | 'sacred';
export type FlowerPreset = 'daisy' | 'poppy' | 'sunflower' | 'sakura';
export type NoisePreset = 'moss' | 'forest' | 'emerald' | 'earth' | 'sand';

export interface TerrainAssetEntry {
  id: string;
  name: string;
  dataUrl: string;
  scale: number;
  scaleX?: number;
  scaleY?: number;
  weight: number; // Porcentagem de chance de sorteio (ex: 80%)
  enabled: boolean;
}

export interface TerrainPenConfig {
  mode: TerrainPenMode;
  targetLayerId?: string;

  // --- MODO GRAMA ---
  brushRadius: number; // Raio de dispersão em px (ex: 40px)
  spacing: number; // Distância entre carimbos da passada (ex: 35px)
  relativeDensity: number; // Densidade relativa por tufo (ex: 100%)
  verticalHeightScale: number; // Escala no eixo Y (0.2x a 3.0x independente)
  horizontalWidthScale: number; // Escala no eixo X (0.2x a 3.0x independente)
  bladeBaseScale: number; // Escala base da lâmina (ex: 0.85)
  bladeTilt: number; // Inclinação da lâmina em graus (-60° a +60°)
  randomScaleMin: number; // Variação aleatória mínima (ex: 0.8)
  randomScaleMax: number; // Variação aleatória máxima (ex: 1.3)
  randomRotation: boolean; // Rotação aleatória ativada
  randomRotationMax: number; // Faixa de graus de rotação (ex: 25°)
  randomMirrorH: boolean; // Espelho horizontal aleatório
  randomMirrorV: boolean; // Espelho vertical aleatório
  baseColor: string; // Cor da raiz (#1e3a10)
  tipColor: string; // Cor da ponta (#86efac)
  effect: 'wind' | 'jelly' | 'water' | 'none'; // Física orgânica nativa
  effectSpeed: number; // Velocidade do balanço (0.2x a 3.0x)
  effectIntensity: number; // Intensidade do balanço (0.2x a 3.0x)
  activePreset: GrassBladePreset; // Preset ativo
  assets: TerrainAssetEntry[]; // Acervo de tufos com pesos

  // --- MODO ÁGUA ---
  waterColor?: string; // Cor base da água (ex: #0284c7)
  waterTexturePng?: string; // Textura PNG importada para repetição dentro da água (máscara)
  waterTextureScale?: number; // Escala do padrão PNG (0.1x a 4.0x, padrão 1.0)
  waterFlowSpeed?: number; // Velocidade do fluxo contínuo (0.0 a 3.0x, padrão 1.0)
  waterFlowAngle?: number; // Ângulo de fluxo em graus (0° a 360°, padrão 45°)
  waterTextureOpacity?: number; // Opacidade da textura sobre a água (0.1 a 1.0, padrão 0.8)
  waterWaveEcho?: boolean; // Eco de reflexos e marolas brilhantes da textura (efeito de água viva)
  waterWaveDeform?: number; // Ondulação / deformação de micro-malha orgânica da água (0.0 a 1.0, padrão 0.25)
  waterPreset?: WaterPreset;
  waterBrushRadius?: number;
  waterOpacity?: number;
  waterFoamBorder?: number;
  waterCaustics?: boolean;
  waterAssets?: TerrainAssetEntry[];

  // --- MODO FLORES (JELLY PETALS) ---
  flowerPreset?: FlowerPreset;
  flowerPetals?: number;
  flowerJellySquash?: number;
  flowerAssets?: TerrainAssetEntry[];

  // --- MODO TEXTURA DE TERRENO / CHÃO (DO APP DE REFERÊNCIA) ---
  groundPaintColor?: string; // Cor da tinta de chão (#16a34a, etc)
  groundPaintOpacity?: number; // Opacidade do traço (0.1 a 1.0, default 0.85)
  groundNoiseIntensity?: number; // Intensidade do ruído FBM (0.0 a 0.6, default 0.28)
  groundNoiseScale?: number; // Escala e frequência do grão (0.01 a 0.12, default 0.045)
  groundNoiseSeed?: number; // Semente aleatória de ruído
  noiseTone?: NoisePreset;
  noiseAssets?: TerrainAssetEntry[];
}

export const createDefaultGrassAssets = (initialSpriteUrl: string): TerrainAssetEntry[] => [
  {
    id: 'grass_cluster',
    name: 'Tufo Denso Padrão',
    dataUrl: initialSpriteUrl,
    scale: 1.0,
    weight: 100,
    enabled: true,
  },
];

export const DEFAULT_TERRAIN_PEN_CONFIG: TerrainPenConfig = {
  mode: 'grass',
  brushRadius: 48,
  spacing: 20,
  relativeDensity: 130,
  verticalHeightScale: 1.0,
  horizontalWidthScale: 1.0,
  bladeBaseScale: 0.85,
  bladeTilt: -15,
  randomScaleMin: 0.8,
  randomScaleMax: 1.25,
  randomRotation: true,
  randomRotationMax: 20,
  randomMirrorH: true,
  randomMirrorV: false,
  baseColor: '#1e3a10',
  tipColor: '#86efac',
  effect: 'wind',
  effectSpeed: 1.0,
  effectIntensity: 1.0,
  activePreset: 'cluster',
  assets: [],
  waterWaveEcho: true,
  waterWaveDeform: 0.25,
};
