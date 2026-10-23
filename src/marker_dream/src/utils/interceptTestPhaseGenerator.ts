import type { MapProject, MapMarker, SavedLevel, InterceptEventConfig } from '../types/map';

const svgToDataUrl = (svg: string): string =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

export const getCapitaLyraDirectionalSprites = () => {
  const down = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
      <defs>
        <radialGradient id="glowDown" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35"/>
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="48" cy="48" r="44" fill="url(#glowDown)"/>
      <!-- Capa Real Azul/Dourada -->
      <path d="M24 44 L72 44 L78 84 L18 84 Z" fill="#1e3a8a" stroke="#f59e0b" stroke-width="2.5"/>
      <!-- Armadura Peitoral -->
      <rect x="30" y="42" width="36" height="30" rx="10" fill="#3b82f6" stroke="#fbbf24" stroke-width="2.5"/>
      <polygon points="48,48 54,58 48,66 42,58" fill="#fbbf24"/>
      <!-- Botas -->
      <rect x="34" y="72" width="10" height="14" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <rect x="52" y="72" width="10" height="14" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <!-- Cabeça / Rosto (Frente) -->
      <circle cx="48" cy="28" r="16" fill="#fde68a" stroke="#b45309" stroke-width="2"/>
      <!-- Olhos Expressivos -->
      <circle cx="42" cy="29" r="2.8" fill="#0f172a"/>
      <circle cx="54" cy="29" r="2.8" fill="#0f172a"/>
      <circle cx="41" cy="28" r="1" fill="#ffffff"/>
      <circle cx="53" cy="28" r="1" fill="#ffffff"/>
      <path d="M44 35 Q48 38 52 35" stroke="#b45309" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- Elmo Alado Dourado -->
      <path d="M30 24 Q48 8 66 24 L62 16 L48 12 L34 16 Z" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.8"/>
      <circle cx="48" cy="17" r="3.5" fill="#ef4444"/>
      <!-- Lança Luminosa na mão direita -->
      <line x1="74" y1="16" x2="74" y2="84" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
      <polygon points="74,6 81,20 74,17 67,20" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.5"/>
    </svg>
  `);

  const up = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
      <circle cx="48" cy="48" r="42" fill="#f59e0b" fill-opacity="0.14"/>
      <!-- Botas -->
      <rect x="34" y="72" width="10" height="14" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <rect x="52" y="72" width="10" height="14" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <!-- Capa Real vista de Costas (Cobrindo o corpo) -->
      <path d="M22 38 L74 38 L80 82 L16 82 Z" fill="#1d4ed8" stroke="#fbbf24" stroke-width="2.5"/>
      <polygon points="48,48 56,62 48,72 40,62" fill="#fbbf24" fill-opacity="0.85"/>
      <!-- Cabeça / Cabelo e Elmo vistos de Costas -->
      <circle cx="48" cy="28" r="16" fill="#d97706" stroke="#78350f" stroke-width="2"/>
      <path d="M30 24 Q48 8 66 24 L64 32 L32 32 Z" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.8"/>
      <!-- Lança Luminosa -->
      <line x1="22" y1="16" x2="22" y2="84" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
      <polygon points="22,6 29,20 22,17 15,20" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.5"/>
    </svg>
  `);

  const left = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
      <circle cx="48" cy="48" r="42" fill="#f59e0b" fill-opacity="0.14"/>
      <!-- Capa esvoaçando para a direita -->
      <path d="M44 40 L76 46 L82 80 L42 78 Z" fill="#1e3a8a" stroke="#f59e0b" stroke-width="2.2"/>
      <!-- Corpo Lateral Esquerdo -->
      <rect x="34" y="42" width="26" height="30" rx="10" fill="#3b82f6" stroke="#fbbf24" stroke-width="2.5"/>
      <!-- Botas em passo -->
      <rect x="32" y="72" width="11" height="14" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <rect x="48" y="70" width="11" height="14" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <!-- Cabeça Perfil Esquerdo -->
      <circle cx="46" cy="28" r="15" fill="#fde68a" stroke="#b45309" stroke-width="2"/>
      <circle cx="37" cy="28" r="2.8" fill="#0f172a"/>
      <circle cx="36" cy="27" r="1" fill="#ffffff"/>
      <!-- Elmo Perfil -->
      <path d="M30 22 Q46 8 64 24 L60 15 L42 12 Z" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.8"/>
      <!-- Lança apontando para frente (esquerda) -->
      <line x1="14" y1="54" x2="78" y2="54" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
      <polygon points="4,54 18,47 15,54 18,61" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.5"/>
    </svg>
  `);

  const right = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
      <circle cx="48" cy="48" r="42" fill="#f59e0b" fill-opacity="0.14"/>
      <!-- Capa esvoaçando para a esquerda -->
      <path d="M52 40 L20 46 L14 80 L54 78 Z" fill="#1e3a8a" stroke="#f59e0b" stroke-width="2.2"/>
      <!-- Corpo Lateral Direito -->
      <rect x="36" y="42" width="26" height="30" rx="10" fill="#3b82f6" stroke="#fbbf24" stroke-width="2.5"/>
      <!-- Botas em passo -->
      <rect x="53" y="72" width="11" height="14" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <rect x="37" y="70" width="11" height="14" rx="4" fill="#78350f" stroke="#f59e0b" stroke-width="1.5"/>
      <!-- Cabeça Perfil Direito -->
      <circle cx="50" cy="28" r="15" fill="#fde68a" stroke="#b45309" stroke-width="2"/>
      <circle cx="59" cy="28" r="2.8" fill="#0f172a"/>
      <circle cx="60" cy="27" r="1" fill="#ffffff"/>
      <!-- Elmo Perfil -->
      <path d="M66 22 Q50 8 32 24 L36 15 L54 12 Z" fill="#f59e0b" stroke="#fef3c7" stroke-width="1.8"/>
      <!-- Lança apontando para frente (direita) -->
      <line x1="82" y1="54" x2="18" y2="54" stroke="#d97706" stroke-width="4" stroke-linecap="round"/>
      <polygon points="92,54 78,47 81,54 78,61" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.5"/>
    </svg>
  `);

  return { up, down, left, right };
};

export const getSanctuaryDestinationSprite = () =>
  svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
      <defs>
        <radialGradient id="sanctGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.55"/>
          <stop offset="70%" stop-color="#f59e0b" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#0f172a" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="64" cy="64" r="60" fill="url(#sanctGlow)"/>
      <!-- Base de Pedra Dourada -->
      <ellipse cx="64" cy="100" rx="46" ry="16" fill="#1e293b" stroke="#fbbf24" stroke-width="3"/>
      <ellipse cx="64" cy="96" rx="36" ry="11" fill="#334155" stroke="#38bdf8" stroke-width="2"/>
      <!-- Colunas -->
      <rect x="34" y="44" width="10" height="52" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
      <rect x="84" y="44" width="10" height="52" rx="3" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/>
      <!-- Arco Superior do Santuário -->
      <path d="M26 46 L64 18 L102 46 Z" fill="#f59e0b" stroke="#fef3c7" stroke-width="3"/>
      <!-- Cristal Arcano Central Flutuante -->
      <polygon points="64,38 78,62 64,86 50,62" fill="#38bdf8" stroke="#e0f2fe" stroke-width="2.5"/>
      <polygon points="64,44 72,62 64,80 56,62" fill="#bae6fd" fill-opacity="0.7"/>
    </svg>
  `);

export const getInterceptBiomeTileDataUrl = () =>
  svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 768 512" width="768" height="512">
      <defs>
        <linearGradient id="grassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#064e3b"/>
          <stop offset="50%" stop-color="#065f46"/>
          <stop offset="100%" stop-color="#047857"/>
        </linearGradient>
        <linearGradient id="roadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#78350f"/>
          <stop offset="15%" stop-color="#92400e"/>
          <stop offset="50%" stop-color="#b45309"/>
          <stop offset="85%" stop-color="#92400e"/>
          <stop offset="100%" stop-color="#78350f"/>
        </linearGradient>
      </defs>
      <rect width="768" height="512" fill="url(#grassGrad)"/>
      <!-- Estrada Real que desce e curva para o Santuário -->
      <path d="M 320 0 L 448 0 L 460 280 L 600 512 L 450 512 L 320 280 Z" fill="url(#roadGrad)" opacity="0.88"/>
      <!-- Pedrinhas e detalhes de grama -->
      <circle cx="140" cy="110" r="18" fill="#047857" opacity="0.6"/>
      <circle cx="640" cy="160" r="24" fill="#047857" opacity="0.6"/>
      <circle cx="210" cy="390" r="22" fill="#047857" opacity="0.6"/>
      <circle cx="384" cy="140" r="6" fill="#fde68a" opacity="0.35"/>
      <circle cx="395" cy="240" r="5" fill="#fde68a" opacity="0.35"/>
      <circle cx="450" cy="360" r="6" fill="#fde68a" opacity="0.35"/>
    </svg>
  `);

/**
 * Injeta um Cenário Completo de Teste de Interceptação + Escolta na fase atual,
 * posicionado logo à frente do jogador para teste imediato.
 */
export function injectInterceptTestScenarioIntoProject(project: MapProject): {
  updatedProject: MapProject;
  triggerMarkerId: string;
  destinationMarkerId: string;
} {
  const playerX = project.player?.x ?? 384;
  const playerY = project.player?.y ?? 140;
  const firstBiomeId = project.biomes[0]?.id || 'biome-1';
  const firstSubBiomeId =
    project.canvasKind === 'extended' ? project.subBiomes?.[0]?.id : undefined;

  const sprites = getCapitaLyraDirectionalSprites();
  const sanctuaryPng = getSanctuaryDestinationSprite();

  const ts = Date.now();
  const destMarkerId = `marker-intercept-dest-${ts}`;
  const triggerMarkerId = `marker-intercept-trigger-${ts}`;

  // Posiciona o gatilho logo abaixo do herói (+145px) e o Santuário mais adiante (+420px)
  const triggerX = Math.max(120, Math.min(640, playerX));
  const triggerY = playerY + 145;
  const destX = Math.max(160, Math.min(620, playerX + 135));
  const destY = playerY + 410;

  const destinationMarker: MapMarker = {
    id: destMarkerId,
    name: '🏛️ Santuário da Aurora (Destino da Escolta)',
    type: 'event',
    x: destX,
    y: destY,
    biomeId: firstBiomeId,
    subBiomeId: firstSubBiomeId,
    size: 135,
    color: '#38bdf8',
    customIconPng: sanctuaryPng,
    solidCollision: false,
    hasShadow: true,
    eventKind: 'quest',
    eventTrigger: 'interact',
    eventRepeat: 'always',
    description:
      'Refúgio sagrado para onde a Capitã Lyra escolta o jogador. Concede recompensas ao chegar!',
    rewardSlots: ['150 Moedas de Ouro', ' Bênção da Aurora', null],
    quest: {
      kind: 'discover',
      title: 'Proteção do Santuário Real',
      instructions: 'Explore o Santuário da Aurora após ser escoltado pela Capitã Lyra.',
      iconEmoji: '🏛️',
      requiredAmount: 1,
      rewardCoins: 150,
    },
    events: [
      {
        id: `evt-sanct-reward-${ts}`,
        type: 'reward',
        title: 'Recompensa de Chegada Segura',
        timing: 'simultaneous',
        trigger: 'contact',
        rewardSlots: ['150 Ouro Real', 'Escudo da Aurora', null],
      },
    ],
  };

  const interceptConfig: InterceptEventConfig = {
    actorSource: 'custom_inline',
    inlineNpcName: 'Capitã Lyra',
    inlineNpcColor: '#f59e0b',
    inlineNpcSize: 72,
    inlineNpcPng: sprites.down,
    inlineAvatarUpPng: sprites.up,
    inlineAvatarDownPng: sprites.down,
    inlineAvatarLeftPng: sprites.left,
    inlineAvatarRightPng: sprites.right,
    spawnOrigin: 'top_right',
    approachSpeed: 4.0,
    stopDistanceFromPlayer: 52,
    showExclamationEmote: true,
    cameraFocusOnInterceptor: true,
    interceptCameraZoom: 1.22,
    greetingDialogues: [
      'Alto lá, viajante! Esta estrada está cercada por batedores sombrios!',
      'Sou a Capitã Lyra da Guarda Real. Não dê mais nenhum passo sozinho!',
      'Venha comigo agora mesmo — vou guiar seus passos em segurança até o Santuário da Aurora!',
    ],
    escortEnabled: true,
    destinationType: 'marker',
    destinationMarkerId: destMarkerId,
    destinationX: destX,
    destinationY: destY,
    escortSpeed: 3.2,
    playerFollowOffset: 46,
    escortBannerText: '🛡️ Escolta Real: Seguindo Capitã Lyra até o Santuário da Aurora...',
    arrivalDialogues: [
      'Ufa! Chegamos sãos e salvos ao Santuário da Aurora!',
      'Aqui as sombras não podem nos alcançar. Receba estas provisões reais pela sua coragem!',
    ],
    onArrivalEventMarkerId: destMarkerId,
    onArrivalRewardCoins: 150,
    actorPostBehavior: 'stay_at_destination',
  };

  const triggerMarker: MapMarker = {
    id: triggerMarkerId,
    name: '🚨 Gatilho de Interceptação (Capitã Lyra)',
    type: 'area',
    areaShape: 'rect',
    areaWidth: 260,
    areaHeight: 110,
    areaColor: '#f59e0b',
    x: triggerX,
    y: triggerY,
    biomeId: firstBiomeId,
    subBiomeId: firstSubBiomeId,
    size: 96,
    color: '#f59e0b',
    solidCollision: false,
    eventKind: 'intercept',
    eventTrigger: 'proximity',
    eventTriggerRadius: 115,
    eventRepeat: 'always',
    eventTitle: 'Interceptação & Escolta da Capitã Lyra',
    eventSubtitle: 'Surge do canto superior direito, aborda o herói e o leva até o Santuário',
    interceptConfig,
    events: [
      {
        id: `evt-intercept-${ts}`,
        type: 'intercept',
        title: 'Interceptação & Escolta: Capitã Lyra',
        timing: 'simultaneous',
        trigger: 'contact',
        interceptConfig,
      },
    ],
  };

  // Remove gatilhos de teste antigos se existirem para não acumular duplicatas
  const cleanedMarkers = (project.markers || []).filter(
    (m) =>
      !m.id.startsWith('marker-intercept-dest-') &&
      !m.id.startsWith('marker-intercept-trigger-')
  );

  const updatedProject: MapProject = {
    ...project,
    markers: [...cleanedMarkers, destinationMarker, triggerMarker],
  };

  return {
    updatedProject,
    triggerMarkerId,
    destinationMarkerId: destMarkerId,
  };
}

/**
 * Cria uma Fase Teste Completa e Independente ("🎬 Fase Teste: Interceptação & Escolta")
 * pronta para jogar no Emulador ou no Modo Play.
 */
export function createStandaloneInterceptTestLevel(): SavedLevel {
  const sprites = getCapitaLyraDirectionalSprites();
  const tilePng = getInterceptBiomeTileDataUrl();

  const baseProject: MapProject = {
    title: '🎬 Fase Teste: Interceptação & Escolta',
    canvasKind: 'vertical',
    gridType: 'none',
    biomes: [
      {
        id: 'biome-intercept-road',
        name: 'Estrada Real da Aurora',
        baseColor: '#064e3b',
        tilePng,
        tileWidth: 768,
        tileHeight: 512,
        tileRepeatCount: 2,
        playerScale: 1.0,
      },
    ],
    subBiomes: [],
    markers: [],
    routes: [],
    player: {
      id: 'hero-intercept-test',
      name: 'Herói Viajante',
      x: 384,
      y: 130,
      color: '#3b82f6',
      speed: 4,
      autoBounce: true,
      avatarDownPng: sprites.down,
      avatarUpPng: sprites.up,
      avatarLeftPng: sprites.left,
      avatarRightPng: sprites.right,
    },
    spawnConfig: {
      enabled: true,
      targetX: 384,
      targetY: 130,
      animationStyle: 'portal',
      duration: 0.9,
      portalColor: '#38bdf8',
      autoCameraCenter: true,
    },
  };

  const { updatedProject } = injectInterceptTestScenarioIntoProject(baseProject);

  const now = new Date().toISOString();
  return {
    id: 'level-test-intercept-escort',
    name: '🎬 Fase Teste: Interceptação & Escolta',
    description:
      'Caminhe para baixo até a faixa dourada: a Capitã Lyra surge do canto da tela, aborda você com diálogo e guia sua locomoção até o Santuário da Aurora!',
    createdAt: now,
    updatedAt: now,
    projectData: updatedProject,
    stats: {
      biomesCount: 1,
      subBiomesCount: 0,
      markersCount: updatedProject.markers.length,
      routesCount: 0,
      canvasKind: 'vertical',
    },
  };
}
