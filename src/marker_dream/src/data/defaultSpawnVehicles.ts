// Built-in illustrated transport assets for the Spawn Studio system.
// Each vehicle is provided as a transparent, high-resolution vector SVG Data-URI
// guaranteeing instant rendering, zero lag, zero missing files, and crisp visuals at any zoom.

export interface BuiltInSpawnVehicle {
  id: string;
  name: string;
  category: 'fantasy' | 'scifi' | 'medieval' | 'steampunk';
  defaultDirection: 'top' | 'bottom' | 'left' | 'right';
  defaultEffect: 'jelly' | 'squash' | 'float' | 'shake';
  defaultSpeed: number;
  defaultPause: number;
  description: string;
  pngUrl: string;
}

const toDataUri = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;

// 1. ÁGUIA DOURADA LENDÁRIA (Golden Eagle / Celestial Gryphon)
export const EAGLE_SPAWN_SVG = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fef08a" />
      <stop offset="50%" stop-color="#eab308" />
      <stop offset="100%" stop-color="#ca8a04" />
    </linearGradient>
    <linearGradient id="wingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#fde047" />
      <stop offset="60%" stop-color="#d97706" />
      <stop offset="100%" stop-color="#92400e" />
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#67e8f9" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <g filter="url(#shadow)">
    <!-- Aura de Voo Mágica -->
    <ellipse cx="80" cy="80" rx="72" ry="50" fill="#fef08a" opacity="0.18" />
    
    <!-- Asa Esquerda Estendida -->
    <path d="M75,70 C50,45 20,40 6,56 C14,75 35,88 65,82 C55,92 42,98 28,96 C40,105 60,102 74,90 Z" fill="url(#wingGrad)" stroke="#78350f" stroke-width="2.5" stroke-linejoin="round" />
    <!-- Penas secundárias asa esquerda -->
    <path d="M12,62 C22,78 40,84 62,79 M24,80 C36,92 50,94 68,87" fill="none" stroke="#fef08a" stroke-width="2" stroke-linecap="round" />

    <!-- Asa Direita Estendida -->
    <path d="M85,70 C110,45 140,40 154,56 C146,75 125,88 95,82 C105,92 118,98 132,96 C120,105 100,102 86,90 Z" fill="url(#wingGrad)" stroke="#78350f" stroke-width="2.5" stroke-linejoin="round" />
    <!-- Penas secundárias asa direita -->
    <path d="M148,62 C138,78 120,84 98,79 M136,80 C124,92 110,94 92,87" fill="none" stroke="#fef08a" stroke-width="2" stroke-linecap="round" />

    <!-- Cauda -->
    <path d="M72,95 L65,128 L80,136 L95,128 L88,95 Z" fill="url(#wingGrad)" stroke="#78350f" stroke-width="2" />
    <path d="M72,118 L80,126 L88,118" fill="none" stroke="#fef08a" stroke-width="2" />

    <!-- Corpo Robusto e Peitoral -->
    <ellipse cx="80" cy="80" rx="20" ry="26" fill="url(#goldGrad)" stroke="#78350f" stroke-width="2.5" />
    <!-- Detalhes de Penas do Peitoral -->
    <path d="M72,74 Q80,82 88,74 M70,84 Q80,92 90,84 M74,94 Q80,100 86,94" fill="none" stroke="#b45309" stroke-width="2" stroke-linecap="round" />

    <!-- Garras Douradas de Pouso -->
    <path d="M68,102 L62,112 M72,104 L72,114 M76,102 L80,112" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />
    <path d="M84,102 L80,112 M88,104 L88,114 M92,102 L98,112" stroke="#f59e0b" stroke-width="3" stroke-linecap="round" />

    <!-- Cabeça Imperial Branca e Dourada -->
    <path d="M70,62 C70,44 90,44 90,62 C90,68 70,68 70,62 Z" fill="#ffffff" stroke="#78350f" stroke-width="2" />
    <circle cx="75" cy="54" r="3" fill="#1e293b" />
    <circle cx="74" cy="53" r="1" fill="#ffffff" />
    <circle cx="85" cy="54" r="3" fill="#1e293b" />
    <circle cx="84" cy="53" r="1" fill="#ffffff" />

    <!-- Bico Dourado Curvado -->
    <path d="M76,58 L80,68 L84,58 Z" fill="#ea580c" stroke="#78350f" stroke-width="1.5" />
    <!-- Coroa / Penacho da Cabeça -->
    <path d="M78,42 L80,34 L82,42 M74,44 L72,36 L76,43 M86,44 L88,36 L84,43" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" />
  </g>
</svg>`);

// 2. NAVE / CÁPSULA ESPACIAL CYBERPUNK (Sci-Fi Drop Pod)
export const SPACESHIP_SPAWN_SVG = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="hullGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="60%" stop-color="#94a3b8" />
      <stop offset="100%" stop-color="#334155" />
    </linearGradient>
    <linearGradient id="neonCyan" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="100%" stop-color="#0284c7" />
    </linearGradient>
    <linearGradient id="thrusterFire" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" />
      <stop offset="40%" stop-color="#06b6d4" />
      <stop offset="100%" stop-color="#0284c7" stop-opacity="0" />
    </linearGradient>
    <filter id="shipShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="6" flood-color="#000" flood-opacity="0.65"/>
    </filter>
  </defs>
  <g filter="url(#shipShadow)">
    <!-- Fogo do Propulsor Inferior -->
    <polygon points="68,118 80,154 92,118" fill="url(#thrusterFire)" />
    <polygon points="72,118 80,142 88,118" fill="#ffffff" />

    <!-- Asas Estabilizadoras Laterais -->
    <path d="M50,92 L20,110 L44,116 L54,106 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
    <circle cx="24" cy="111" r="3" fill="#22d3ee" />
    <path d="M110,92 L140,110 L116,116 L106,106 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="2" />
    <circle cx="136" cy="111" r="3" fill="#22d3ee" />

    <!-- Casco Principal da Cápsula -->
    <path d="M80,22 C58,22 46,55 48,96 L58,118 L102,118 L112,96 C114,55 102,22 80,22 Z" fill="url(#hullGrad)" stroke="#0f172a" stroke-width="3" stroke-linejoin="round" />

    <!-- Cúpula de Vidro Neon do Cockpit -->
    <path d="M80,38 C68,38 62,54 62,72 C62,80 68,84 80,84 C92,84 98,80 98,72 C98,54 92,38 80,38 Z" fill="url(#neonCyan)" stroke="#0891b2" stroke-width="2" />
    <!-- Brilho no Vidro -->
    <path d="M72,46 Q80,44 86,50" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" />

    <!-- Faixas Neon e Detalhes de Blindagem -->
    <rect x="66" y="94" width="28" height="4" rx="2" fill="#22d3ee" />
    <circle cx="80" cy="108" r="4" fill="#ef4444" stroke="#991b1b" stroke-width="1.5" />
    <!-- Bocais de Turbina -->
    <rect x="64" y="116" width="32" height="6" rx="2" fill="#1e293b" stroke="#64748b" stroke-width="1.5" />
  </g>
</svg>`);

// 3. BARCO EXPLORADOR / GALEÃO VOADOR (Flying Galleon / Airship)
export const SHIP_SPAWN_SVG = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="hullWood" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#b45309" />
      <stop offset="50%" stop-color="#78350f" />
      <stop offset="100%" stop-color="#451a03" />
    </linearGradient>
    <linearGradient id="sailWhite" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f8fafc" />
      <stop offset="100%" stop-color="#cbd5e1" />
    </linearGradient>
    <filter id="boatShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <g filter="url(#boatShadow)">
    <!-- Ondas mágicas de ar na base -->
    <ellipse cx="80" cy="126" rx="60" ry="12" fill="#38bdf8" opacity="0.3" />

    <!-- Casco do Barco em Madeira -->
    <path d="M22,96 C30,126 128,126 138,96 L144,92 C146,88 140,86 134,88 L26,88 C20,86 16,90 22,96 Z" fill="url(#hullWood)" stroke="#451a03" stroke-width="2.5" />
    <!-- Friso dourado do casco -->
    <path d="M26,94 Q80,108 134,94" fill="none" stroke="#facc15" stroke-width="2.5" stroke-linecap="round" />
    <!-- Janelas circulares de cabine -->
    <circle cx="56" cy="106" r="4" fill="#facc15" stroke="#451a03" stroke-width="1.5" />
    <circle cx="80" cy="108" r="4" fill="#facc15" stroke="#451a03" stroke-width="1.5" />
    <circle cx="104" cy="106" r="4" fill="#facc15" stroke="#451a03" stroke-width="1.5" />

    <!-- Mastro Central -->
    <rect x="77" y="24" width="6" height="66" fill="#78350f" stroke="#451a03" stroke-width="1.5" />

    <!-- Vela Principal Inflada -->
    <path d="M83,30 C120,38 120,68 83,74 L83,30 Z" fill="url(#sailWhite)" stroke="#64748b" stroke-width="2" />
    <!-- Brasão na Vela -->
    <polygon points="100,46 106,56 94,56" fill="#ef4444" />
    <polygon points="100,62 106,52 94,52" fill="#ef4444" />

    <!-- Bandeira no topo do mastro -->
    <polygon points="83,24 104,30 83,36" fill="#e11d48" />
  </g>
</svg>`);

// 4. BALÃO MÁGICO AEROSTÁTICO (Fantasy Hot Air Balloon)
export const BALLOON_SPAWN_SVG = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="stripesRed" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ef4444" />
      <stop offset="50%" stop-color="#f87171" />
      <stop offset="100%" stop-color="#dc2626" />
    </linearGradient>
    <linearGradient id="stripesGold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#facc15" />
      <stop offset="50%" stop-color="#fef08a" />
      <stop offset="100%" stop-color="#eab308" />
    </linearGradient>
    <filter id="balloonShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="6" flood-color="#000" flood-opacity="0.55"/>
    </filter>
  </defs>
  <g filter="url(#balloonShadow)">
    <!-- Balão Inflado Principal -->
    <path d="M80,18 C46,18 30,46 36,78 C40,98 64,114 74,120 L86,120 C96,114 120,98 124,78 C130,46 114,18 80,18 Z" fill="url(#stripesRed)" stroke="#991b1b" stroke-width="3" />

    <!-- Listras Douradas Verticais do Balão -->
    <path d="M80,18 C64,18 56,48 62,82 C66,102 76,118 76,120 L84,120 C84,118 94,102 98,82 C104,48 96,18 80,18 Z" fill="url(#stripesGold)" stroke="#ca8a04" stroke-width="2" />
    <path d="M80,18 L80,120" stroke="#991b1b" stroke-width="2" />

    <!-- Cordas de Sustentação -->
    <line x1="68" y1="120" x2="66" y2="134" stroke="#78350f" stroke-width="2" />
    <line x1="74" y1="120" x2="72" y2="134" stroke="#78350f" stroke-width="2" />
    <line x1="86" y1="120" x2="88" y2="134" stroke="#78350f" stroke-width="2" />
    <line x1="92" y1="120" x2="94" y2="134" stroke="#78350f" stroke-width="2" />

    <!-- Chama do Queimador -->
    <polygon points="76,122 80,114 84,122" fill="#f97316" />
    <polygon points="78,122 80,117 82,122" fill="#fef08a" />

    <!-- Cesto de Vime Trançado -->
    <rect x="64" y="134" width="32" height="18" rx="4" fill="#b45309" stroke="#451a03" stroke-width="2" />
    <!-- Trama do Cesto -->
    <line x1="64" y1="140" x2="96" y2="140" stroke="#f59e0b" stroke-width="1.5" />
    <line x1="64" y1="146" x2="96" y2="146" stroke="#f59e0b" stroke-width="1.5" />
    <line x1="72" y1="134" x2="72" y2="152" stroke="#78350f" stroke-width="1.5" />
    <line x1="80" y1="134" x2="80" y2="152" stroke="#78350f" stroke-width="1.5" />
    <line x1="88" y1="134" x2="88" y2="152" stroke="#78350f" stroke-width="1.5" />
  </g>
</svg>`);

// 5. DRAGÃO CELESTE / MONTARIA ALADA (Emerald Celestial Dragon)
export const DRAGON_SPAWN_SVG = toDataUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">
  <defs>
    <linearGradient id="dragonGreen" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34d399" />
      <stop offset="60%" stop-color="#059669" />
      <stop offset="100%" stop-color="#064e3b" />
    </linearGradient>
    <linearGradient id="dragonWing" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#6ee7b7" />
      <stop offset="100%" stop-color="#047857" />
    </linearGradient>
    <filter id="dragonShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="10" stdDeviation="6" flood-color="#000" flood-opacity="0.6"/>
    </filter>
  </defs>
  <g filter="url(#dragonShadow)">
    <!-- Asa Esquerda do Dragão -->
    <path d="M72,70 C40,42 16,46 6,66 C24,84 46,86 70,82 C54,96 42,98 28,106 C50,112 68,98 76,86 Z" fill="url(#dragonWing)" stroke="#064e3b" stroke-width="2.5" />

    <!-- Asa Direita do Dragão -->
    <path d="M88,70 C120,42 144,46 154,66 C136,84 114,86 90,82 C106,96 118,98 132,106 C110,112 92,98 84,86 Z" fill="url(#dragonWing)" stroke="#064e3b" stroke-width="2.5" />

    <!-- Cauda Ondulada com Espinhos -->
    <path d="M80,95 Q70,120 86,134 Q92,142 84,152" fill="none" stroke="#059669" stroke-width="7" stroke-linecap="round" />
    <polygon points="84,146 92,152 82,156" fill="#facc15" />

    <!-- Corpo do Dragão -->
    <ellipse cx="80" cy="78" rx="18" ry="24" fill="url(#dragonGreen)" stroke="#064e3b" stroke-width="2.5" />
    <!-- Escamas no Peito -->
    <path d="M74,72 Q80,78 86,72 M72,80 Q80,86 88,80 M74,88 Q80,94 86,88" fill="none" stroke="#fef08a" stroke-width="2" stroke-linecap="round" />

    <!-- Cabeça Draconiana com Chifres Dourados -->
    <path d="M72,60 C70,42 90,42 88,60 L80,68 Z" fill="#10b981" stroke="#064e3b" stroke-width="2" />
    <!-- Chifres -->
    <path d="M72,46 Q64,32 58,34 Q66,42 72,48" fill="#facc15" stroke="#854d0e" stroke-width="1.5" />
    <path d="M88,46 Q96,32 102,34 Q94,42 88,48" fill="#facc15" stroke="#854d0e" stroke-width="1.5" />
    <!-- Olhos de Fogo -->
    <circle cx="75" cy="52" r="2.5" fill="#facc15" />
    <circle cx="85" cy="52" r="2.5" fill="#facc15" />
  </g>
</svg>`);

// Veículo padrão pronto se o usuário não escolheu nenhum ainda
export const DEFAULT_SPAWN_VEHICLE_PNG = EAGLE_SPAWN_SVG;

export const BUILT_IN_SPAWN_VEHICLES: BuiltInSpawnVehicle[] = [
  {
    id: 'eagle',
    name: '🦅 Águia Dourada dos Céus',
    category: 'fantasy',
    defaultDirection: 'top',
    defaultEffect: 'jelly',
    defaultSpeed: 1.5,
    defaultPause: 0.85,
    description: 'Desce planando do céu majestosamente, entrega o herói no solo com elasticidade e decola de volta.',
    pngUrl: EAGLE_SPAWN_SVG,
  },
  {
    id: 'spaceship',
    name: '🛸 Nave / Cápsula Espacial',
    category: 'scifi',
    defaultDirection: 'top',
    defaultEffect: 'squash',
    defaultSpeed: 1.2,
    defaultPause: 0.7,
    description: 'Queda supersônica com impacto potente, luzes neon e ascensão vertical imediata aos céus.',
    pngUrl: SPACESHIP_SPAWN_SVG,
  },
  {
    id: 'ship',
    name: '⛵ Caravela / Barco Explorador',
    category: 'medieval',
    defaultDirection: 'left',
    defaultEffect: 'float',
    defaultSpeed: 2.0,
    defaultPause: 0.9,
    description: 'Navega suavemente pela margem esquerda, atraca na posição e segue viagem velejando para a direita.',
    pngUrl: SHIP_SPAWN_SVG,
  },
  {
    id: 'balloon',
    name: '🎈 Balão Mágico Aerostático',
    category: 'steampunk',
    defaultDirection: 'bottom',
    defaultEffect: 'float',
    defaultSpeed: 2.2,
    defaultPause: 1.0,
    description: 'Emerge do horizonte inferior flutuando delicadamente, toca o solo e retorna aos ares.',
    pngUrl: BALLOON_SPAWN_SVG,
  },
  {
    id: 'dragon',
    name: '🐉 Dragão Celestial Esmeralda',
    category: 'fantasy',
    defaultDirection: 'top',
    defaultEffect: 'jelly',
    defaultSpeed: 1.6,
    defaultPause: 0.85,
    description: 'Montaria mitológica alada que mergulha das alturas, pousa com estilo e ruge decolando.',
    pngUrl: DRAGON_SPAWN_SVG,
  },
];
