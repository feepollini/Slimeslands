import { MapProject } from '../types/map';

export const DEFAULT_PROJECT: MapProject = {
  id: 'project-empty',
  title: 'Meu Mapa de Tiles PNG',
  description: 'Mapa de rolagem vertical gerado a partir das suas imagens PNG.',
  mapWidth: 768,
  gridType: 'none',
  collisionGrid: 8,
  canvasKind: 'vertical',
  biomes: [],
  markers: [],
  routes: [],
  player: {
    id: 'player-main',
    name: 'Herói',
    x: 384,
    y: 100,
    color: '#3b82f6',
    speed: 4,
  },
  groundStamps: [],
  stampLayers: [
    { id: 'layer-ground-1', name: 'Chão Base', visible: true, opacity: 1 },
    { id: 'layer-ground-2', name: 'Sobrechão / Vegetação', visible: true, opacity: 1 },
  ],
  stampBrushConfig: {
    pngUrl: null,
    size: 52,
    feather: 14,
    spacing: 36,
    randomRotation: true,
    randomMirror: true,
    opacity: 0.9,
    activeLayerId: 'layer-ground-1',
    savedPresets: [],
  },
  galleryAssets: [],
  markerPenConfig: {
    selectedAssetIds: [],
    size: 150,
    spacing: 65,
    randomMirrorH: true,
    randomMirrorV: false,
    randomScale: true,
    randomRotation: false,
  },
  savedDialogues: [
    {
      id: 'dialogue-welcome',
      name: 'Boas-vindas do Aldeão',
      speaker: 'Aldeão Ancião',
      steps: [
        {
          id: 'step-1',
          text: 'Saudações, nobre viajante! Que bons ventos o trazem a estas terras antigas?',
          playerResponses: [
            { id: 'r-1', label: 'Estou explorando o mundo' },
            { id: 'r-2', label: 'Procuro por desafios' },
          ],
        },
        {
          id: 'step-2',
          text: 'Cuidado ao se aventurar além dos caminhos seguros. Há perigos e relíquias ocultas!',
        },
      ],
      endEvent: { kind: 'none' },
    },
    {
      id: 'dialogue-warrior',
      name: 'Desafio do Guerreiro Slime',
      speaker: 'Slime Guardião',
      steps: [
        {
          id: 'step-1',
          text: 'Alto lá! Apenas aqueles com verdadeira coragem podem passar por este portal sagrado!',
          playerResponses: [
            { id: 'r-1', label: 'Eu aceito o teste!' },
            { id: 'r-2', label: 'Volto mais tarde...' },
          ],
        },
      ],
      endEvent: { kind: 'duel' },
    },
    {
      id: 'dialogue-quest-wood',
      name: 'Pedido de Ajuda (Coleta)',
      speaker: 'Lenhador Local',
      steps: [
        {
          id: 'step-1',
          text: 'Preciso consertar as pontes da região antes do anoitecer. Você poderia me ajudar coletando madeira?',
        },
      ],
      endEvent: {
        kind: 'quest',
        questKind: 'collect',
        questResourceName: 'Madeira',
        questAmount: 5,
      },
    },
  ],
};
