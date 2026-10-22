import { InteractiveScreenConfig, StationSubAssetSlot } from '../types/map';

// ============================================================================
// SPRITES VETORIAIS DE ESTAÇÃO, CHOCADEIRA, OVOS E CRIATURAS
// ============================================================================

// 1. Chocadeira / Ninho de Incubação Aconchegante
export const DEFAULT_INCUBATOR_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <!-- Brilho acolhedor das brasas -->
    <radialGradient id="heatGlow" cx="50%" cy="55%" r="45%">
      <stop offset="0%" stop-color="#fef08a" stop-opacity="0.9"/>
      <stop offset="40%" stop-color="#f97316" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#b45309" stop-opacity="0"/>
    </radialGradient>
    <!-- Gradiente da madeira nobre e feno -->
    <linearGradient id="nestWood" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#854d0e"/>
      <stop offset="60%" stop-color="#713f12"/>
      <stop offset="100%" stop-color="#451a03"/>
    </linearGradient>
    <linearGradient id="nestHay" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </linearGradient>
  </defs>

  <!-- Sombra no chão -->
  <ellipse cx="50" cy="84" rx="42" ry="12" fill="rgba(15, 23, 42, 0.45)"/>

  <!-- Base de suporte de pedra/madeira -->
  <ellipse cx="50" cy="74" rx="40" ry="16" fill="url(#nestWood)" stroke="#291305" stroke-width="2"/>
  <ellipse cx="50" cy="70" rx="36" ry="13" fill="#542e0c"/>

  <!-- Halo de calor central -->
  <circle cx="50" cy="55" r="32" fill="url(#heatGlow)"/>

  <!-- Palha e feno trançado do ninho -->
  <path d="M 12 60 Q 25 78 50 78 Q 75 78 88 60 Q 82 82 50 82 Q 18 82 12 60 Z" fill="url(#nestHay)"/>
  <path d="M 18 52 C 28 68 72 68 82 52 C 78 72 22 72 18 52 Z" fill="#ca8a04"/>

  <!-- Cama acolhedora onde repousam os ovos -->
  <ellipse cx="50" cy="56" rx="28" ry="12" fill="#78350f" stroke="#a16207" stroke-width="1.5"/>
  <ellipse cx="50" cy="54" rx="24" ry="9" fill="#451a03"/>

  <!-- Gravetos e detalhes dourados nas bordas -->
  <path d="M 16 56 L 24 64 M 84 56 L 76 64 M 30 72 L 40 76 M 60 76 L 70 72" stroke="#fde047" stroke-width="1.8" stroke-linecap="round"/>
  <!-- Cristais rúnicos de aquecimento nas laterais -->
  <polygon points="14,64 18,58 22,64 18,70" fill="#f59e0b" stroke="#78350f" stroke-width="0.8"/>
  <polygon points="86,64 82,58 78,64 82,70" fill="#f59e0b" stroke="#78350f" stroke-width="0.8"/>
</svg>
`)}`;

// 2. Ovos Colecionáveis e Encantados
export const EGG_GOLD_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 64" width="50" height="64">
  <defs>
    <radialGradient id="eggGoldGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="30%" stop-color="#fef08a"/>
      <stop offset="70%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#a16207"/>
    </radialGradient>
  </defs>
  <!-- Formato orgânico de ovo de pássaro mítico -->
  <path d="M 25 4 C 38 4, 46 22, 46 42 C 46 54, 37 60, 25 60 C 13 60, 4 54, 4 42 C 4 22, 12 4, 25 4 Z" 
        fill="url(#eggGoldGrad)" stroke="#78350f" stroke-width="1.6"/>
  <!-- Manchas douradas cintilantes -->
  <ellipse cx="20" cy="24" rx="3.5" ry="5.5" fill="#ffffff" opacity="0.65" transform="rotate(-15 20 24)"/>
  <circle cx="33" cy="38" r="2.8" fill="#ca8a04" opacity="0.8"/>
  <circle cx="16" cy="45" r="2.2" fill="#ca8a04" opacity="0.8"/>
  <circle cx="28" cy="50" r="3.2" fill="#ca8a04" opacity="0.8"/>
</svg>
`)}`;

export const EGG_BLUE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 64" width="50" height="64">
  <defs>
    <radialGradient id="eggBlueGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="35%" stop-color="#67e8f9"/>
      <stop offset="75%" stop-color="#0284c7"/>
      <stop offset="100%" stop-color="#0c4a6e"/>
    </radialGradient>
  </defs>
  <path d="M 25 4 C 38 4, 46 22, 46 42 C 46 54, 37 60, 25 60 C 13 60, 4 54, 4 42 C 4 22, 12 4, 25 4 Z" 
        fill="url(#eggBlueGrad)" stroke="#082f49" stroke-width="1.6"/>
  <!-- Runas cósmicas no ovo azul -->
  <ellipse cx="19" cy="22" rx="3.5" ry="5.5" fill="#ffffff" opacity="0.75" transform="rotate(-15 19 22)"/>
  <path d="M 25 28 Q 32 34 26 42 Q 22 48 30 52" stroke="#bae6fd" stroke-width="1.8" fill="none" stroke-linecap="round"/>
</svg>
`)}`;

export const EGG_RED_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 64" width="50" height="64">
  <defs>
    <radialGradient id="eggRedGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#fed7aa"/>
      <stop offset="35%" stop-color="#f87171"/>
      <stop offset="75%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </radialGradient>
  </defs>
  <path d="M 25 4 C 38 4, 46 22, 46 42 C 46 54, 37 60, 25 60 C 13 60, 4 54, 4 42 C 4 22, 12 4, 25 4 Z" 
        fill="url(#eggRedGrad)" stroke="#450a0a" stroke-width="1.6"/>
  <ellipse cx="19" cy="22" rx="3.5" ry="5.5" fill="#ffffff" opacity="0.65" transform="rotate(-15 19 22)"/>
  <circle cx="34" cy="36" r="3" fill="#fecaca" opacity="0.5"/>
  <circle cx="16" cy="44" r="2.5" fill="#991b1b" opacity="0.9"/>
</svg>
`)}`;

export const EGG_GREEN_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 64" width="50" height="64">
  <defs>
    <radialGradient id="eggGreenGrad" cx="35%" cy="30%" r="65%">
      <stop offset="0%" stop-color="#ecfdf5"/>
      <stop offset="35%" stop-color="#34d399"/>
      <stop offset="75%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#064e3b"/>
    </radialGradient>
  </defs>
  <path d="M 25 4 C 38 4, 46 22, 46 42 C 46 54, 37 60, 25 60 C 13 60, 4 54, 4 42 C 4 22, 12 4, 25 4 Z" 
        fill="url(#eggGreenGrad)" stroke="#022c22" stroke-width="1.6"/>
  <ellipse cx="19" cy="22" rx="3.5" ry="5.5" fill="#ffffff" opacity="0.75" transform="rotate(-15 19 22)"/>
  <circle cx="31" cy="40" r="3.2" fill="#a7f3d0" opacity="0.7"/>
</svg>
`)}`;

// 3. Pintinho / Criatura Mítica Nascida (Resultado da Chocadeira)
export const DEFAULT_HATCHLING_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="80" height="80">
  <defs>
    <radialGradient id="chickBody" cx="40%" cy="35%" r="60%">
      <stop offset="0%" stop-color="#fef9c3"/>
      <stop offset="50%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#ca8a04"/>
    </radialGradient>
  </defs>

  <!-- Casca de ovo quebrada na base -->
  <path d="M 18 52 Q 40 76 62 52 L 56 46 L 50 54 L 42 45 L 34 54 L 26 46 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.8"/>

  <!-- Corpo do pintinho / filhotinho -->
  <circle cx="40" cy="38" r="22" fill="url(#chickBody)" stroke="#a16207" stroke-width="1.5"/>

  <!-- Asinhas fofas -->
  <ellipse cx="20" cy="40" rx="6" ry="10" fill="#eab308" stroke="#a16207" stroke-width="1" transform="rotate(-20 20 40)"/>
  <ellipse cx="60" cy="40" rx="6" ry="10" fill="#eab308" stroke="#a16207" stroke-width="1" transform="rotate(20 60 40)"/>

  <!-- Olhos brilhantes de anime/fofura -->
  <circle cx="32" cy="32" r="4.5" fill="#0f172a"/>
  <circle cx="33.5" cy="30.5" r="1.6" fill="#ffffff"/>
  <circle cx="48" cy="32" r="4.5" fill="#0f172a"/>
  <circle cx="49.5" cy="30.5" r="1.6" fill="#ffffff"/>

  <!-- Biquinho fofo de pato/pássaro -->
  <polygon points="40,36 34,42 46,42" fill="#f97316" stroke="#c2410c" stroke-width="1"/>

  <!-- Bochechinhas rosadas -->
  <circle cx="26" cy="38" r="3.5" fill="#f43f5e" opacity="0.45"/>
  <circle cx="54" cy="38" r="3.5" fill="#f43f5e" opacity="0.45"/>

  <!-- Topetinho fofo -->
  <path d="M 40 16 Q 36 8 32 10 Q 38 12 40 16 Q 44 8 48 10 Q 42 12 40 16" fill="#facc15" stroke="#a16207" stroke-width="1"/>

  <!-- Casca na cabeça estilo Calimero -->
  <path d="M 28 20 Q 40 8 52 20 L 48 24 L 43 18 L 38 24 L 32 18 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4"/>

  <!-- Estrelinhas mágicas ao redor -->
  <polygon points="12,18 14,23 19,25 14,27 12,32 10,27 5,25 10,23" fill="#fde047"/>
  <polygon points="68,16 69.5,20 73.5,21.5 69.5,23 68,27 66.5,23 62.5,21.5 66.5,20" fill="#fde047"/>
</svg>
`)}`;

// 4. Caldeirão de Alquimia
export const DEFAULT_CAULDRON_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <radialGradient id="potionGlow" cx="50%" cy="40%" r="50%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.95"/>
      <stop offset="60%" stop-color="#7e22ce" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#3b0764" stop-opacity="0.95"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="88" rx="36" ry="10" fill="rgba(15,23,42,0.5)"/>
  <!-- Pés do caldeirão -->
  <path d="M 24 70 L 16 86 M 76 70 L 84 86 M 50 78 L 50 90" stroke="#1e293b" stroke-width="5" stroke-linecap="round"/>
  <!-- Corpo de ferro -->
  <circle cx="50" cy="58" r="34" fill="#0f172a" stroke="#334155" stroke-width="3"/>
  <!-- Boca do caldeirão -->
  <ellipse cx="50" cy="38" rx="30" ry="10" fill="#1e293b" stroke="#475569" stroke-width="3"/>
  <!-- Líquido borbulhante -->
  <ellipse cx="50" cy="38" rx="26" ry="8" fill="url(#potionGlow)"/>
  <!-- Bolhas mágicas -->
  <circle cx="42" cy="36" r="3" fill="#d8b4fe"/>
  <circle cx="56" cy="37" r="2.2" fill="#f3e8ff"/>
  <circle cx="48" cy="26" r="3.5" fill="#e9d5ff" opacity="0.8"/>
</svg>
`)}`;

// 5. Fornalha Vulcânica
export const DEFAULT_FURNACE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <radialGradient id="fireGlow" cx="50%" cy="60%" r="50%">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="40%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#dc2626"/>
    </radialGradient>
  </defs>
  <ellipse cx="50" cy="88" rx="38" ry="10" fill="rgba(15,23,42,0.5)"/>
  <!-- Bloco de pedra vulcânica -->
  <rect x="18" y="25" width="64" height="60" rx="8" fill="#1e293b" stroke="#0f172a" stroke-width="3"/>
  <!-- Abertura da fornalha -->
  <path d="M 30 75 L 30 52 Q 50 36 70 52 L 70 75 Z" fill="#0f172a"/>
  <!-- Fogo ardente -->
  <path d="M 32 75 Q 40 45 50 62 Q 58 40 68 75 Z" fill="url(#fireGlow)"/>
</svg>
`)}`;

// ============================================================================
// HELPER PARA CRIAR CONFIGURAÇÃO PADRÃO RÁPIDA POR PRESET
// ============================================================================

export function createDefaultStationConfig(type: 'incubator' | 'furnace' | 'alchemy' | 'display' | 'crafting' | 'custom' = 'incubator'): InteractiveScreenConfig {
  if (type === 'incubator') {
    // 6 slots em arco/grade perfeitamente balanceados sobre a chocadeira
    const slots: StationSubAssetSlot[] = [
      { id: 'slot-1', name: 'Ninho Superior Esquerdo', offsetX: -26, offsetY: -16, scale: 0.52, rotation: -12, currentAssetPng: EGG_GOLD_SVG, currentAssetName: 'Ovo Dourado' },
      { id: 'slot-2', name: 'Ninho Superior Centro',   offsetX: 0,   offsetY: -22, scale: 0.56, rotation: 0,   currentAssetPng: EGG_BLUE_SVG, currentAssetName: 'Ovo Cósmico' },
      { id: 'slot-3', name: 'Ninho Superior Direito',  offsetX: 26,  offsetY: -16, scale: 0.52, rotation: 12,  currentAssetPng: EGG_RED_SVG,  currentAssetName: 'Ovo de Fogo' },
      { id: 'slot-4', name: 'Ninho Inferior Esquerdo', offsetX: -18, offsetY: 4,   scale: 0.48, rotation: -6,  currentAssetPng: EGG_GREEN_SVG, currentAssetName: 'Ovo da Floresta' },
      { id: 'slot-5', name: 'Ninho Inferior Centro',   offsetX: 0,   offsetY: 8,   scale: 0.52, rotation: 0,   currentAssetPng: EGG_GOLD_SVG, currentAssetName: 'Ovo Dourado' },
      { id: 'slot-6', name: 'Ninho Inferior Direito',  offsetX: 18,  offsetY: 4,   scale: 0.48, rotation: 6,   currentAssetPng: EGG_BLUE_SVG, currentAssetName: 'Ovo Cósmico' },
    ];

    return {
      stationTitle: 'Chocadeira Mágica',
      stationSubtitle: 'Insira até 6 ovos no ninho aquecido e aguarde o tempo de incubação!',
      stationType: 'incubator',
      baseAssetPng: DEFAULT_INCUBATOR_SVG,
      slotsCount: 6,
      slots,
      processTimeSeconds: 10,
      processStatus: 'idle',
      resultAssetPng: DEFAULT_HATCHLING_SVG,
      resultAssetName: 'Pintinho Mítico',
      resultMessage: '✨ Crack! O ovo eclodiu com sucesso e um Pintinho Mítico nasceu saudável!',
      showResultOnMap: true,
      availablePaletteAssets: [
        { id: 'item-egg-gold', name: 'Ovo Dourado Solar', pngUrl: EGG_GOLD_SVG, tag: 'egg' },
        { id: 'item-egg-blue', name: 'Ovo Cósmico de Dragão', pngUrl: EGG_BLUE_SVG, tag: 'egg' },
        { id: 'item-egg-red', name: 'Ovo de Rubi Flamejante', pngUrl: EGG_RED_SVG, tag: 'egg' },
        { id: 'item-egg-green', name: 'Ovo Esmeralda Místico', pngUrl: EGG_GREEN_SVG, tag: 'egg' },
      ],
    };
  }

  if (type === 'alchemy') {
    const slots: StationSubAssetSlot[] = [
      { id: 'slot-1', name: 'Reagente 1', offsetX: -22, offsetY: -12, scale: 0.48, rotation: -10 },
      { id: 'slot-2', name: 'Catalisador', offsetX: 0,   offsetY: -18, scale: 0.52, rotation: 0 },
      { id: 'slot-3', name: 'Reagente 2', offsetX: 22,  offsetY: -12, scale: 0.48, rotation: 10 },
    ];

    return {
      stationTitle: 'Caldeirão de Alquimia',
      stationSubtitle: 'Combine ingredientes raros e deixe a infusão ferver para criar poções lendárias.',
      stationType: 'alchemy',
      baseAssetPng: DEFAULT_CAULDRON_SVG,
      slotsCount: 3,
      slots,
      processTimeSeconds: 8,
      processStatus: 'idle',
      resultAssetName: 'Elixir da Vida Eterna',
      resultMessage: '🧪 A infusão alquímica foi destilada com sucesso!',
      showResultOnMap: true,
    };
  }

  // Padrão Custom / Fornalha / Display
  return {
    stationTitle: 'Estação Interativa',
    stationSubtitle: 'Coloque itens nos slots para processar ou exibir no mapa.',
    stationType: type,
    baseAssetPng: type === 'furnace' ? DEFAULT_FURNACE_SVG : DEFAULT_INCUBATOR_SVG,
    slotsCount: 4,
    slots: [
      { id: 'slot-1', name: 'Slot 1', offsetX: -20, offsetY: -10, scale: 0.5 },
      { id: 'slot-2', name: 'Slot 2', offsetX: 20,  offsetY: -10, scale: 0.5 },
      { id: 'slot-3', name: 'Slot 3', offsetX: -20, offsetY: 10,  scale: 0.5 },
      { id: 'slot-4', name: 'Slot 4', offsetX: 20,  offsetY: 10,  scale: 0.5 },
    ],
    processTimeSeconds: 10,
    processStatus: 'idle',
    showResultOnMap: true,
  };
}
