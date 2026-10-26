const fs = require('fs');
const path = require('path');

const srcCreatures = 'C:\\Users\\FELIP\\OneDrive\\Imagens\\cartas\\cartas';
const srcMagics = 'C:\\Users\\FELIP\\OneDrive\\Imagens\\cartas\\Cartas_de_Magia_Slime';
const publicCardsDir = path.resolve('public/cards');

// Garante que o diretório public/cards existe
if (!fs.existsSync(publicCardsDir)) {
  fs.mkdirSync(publicCardsDir, { recursive: true });
}

// Paletas harmoniosas por elemento
const ELEMENT_PALETTES = {
  DIVINO: {
    frameTopColor: '#4A3B00', frameMidColor: '#241D00', frameBottomColor: '#050400',
    strokeColor: '#FFD700', elementTextColor: '#EAB308', rankCircleColor: '#F59E0B'
  },
  COSMICO: {
    frameTopColor: '#1E0B36', frameMidColor: '#100520', frameBottomColor: '#030008',
    strokeColor: '#C084FC', elementTextColor: '#A855F7', rankCircleColor: '#E879F9'
  },
  LUZ: {
    frameTopColor: '#423800', frameMidColor: '#241F00', frameBottomColor: '#050400',
    strokeColor: '#FDE047', elementTextColor: '#EAB308', rankCircleColor: '#FBBF24'
  },
  FOGO: {
    frameTopColor: '#4A0D00', frameMidColor: '#260600', frameBottomColor: '#080100',
    strokeColor: '#FF4500', elementTextColor: '#EF4444', rankCircleColor: '#F97316'
  },
  AGUA: {
    frameTopColor: '#002B47', frameMidColor: '#001424', frameBottomColor: '#000408',
    strokeColor: '#00BFFF', elementTextColor: '#0284C7', rankCircleColor: '#38BDF8'
  },
  TERRA: {
    frameTopColor: '#0B3818', frameMidColor: '#041C0C', frameBottomColor: '#000502',
    strokeColor: '#22C55E', elementTextColor: '#16A34A', rankCircleColor: '#10B981'
  },
  VENTO: {
    frameTopColor: '#003B32', frameMidColor: '#001F1A', frameBottomColor: '#000806',
    strokeColor: '#14B8A6', elementTextColor: '#0D9488', rankCircleColor: '#2DD4BF'
  },
  TROVAO: {
    frameTopColor: '#423B00', frameMidColor: '#241F00', frameBottomColor: '#050400',
    strokeColor: '#FACC15', elementTextColor: '#CA8A04', rankCircleColor: '#F59E0B'
  },
  GELO: {
    frameTopColor: '#003347', frameMidColor: '#001A24', frameBottomColor: '#000508',
    strokeColor: '#38BDF8', elementTextColor: '#0284C7', rankCircleColor: '#7DD3FC'
  },
  TREVAS: {
    frameTopColor: '#2B0A3D', frameMidColor: '#14031F', frameBottomColor: '#05000A',
    strokeColor: '#A855F7', elementTextColor: '#7E22CE', rankCircleColor: '#9333EA'
  },
  ARCANO: {
    frameTopColor: '#240B47', frameMidColor: '#110424', frameBottomColor: '#03000A',
    strokeColor: '#818CF8', elementTextColor: '#6366F1', rankCircleColor: '#A78BFA'
  },
  METAL: {
    frameTopColor: '#33333D', frameMidColor: '#1B1B21', frameBottomColor: '#08080A',
    strokeColor: '#CBD5E1', elementTextColor: '#94A3B8', rankCircleColor: '#E2E8F0'
  },
  GOURMET: {
    frameTopColor: '#4A002E', frameMidColor: '#260017', frameBottomColor: '#080005',
    strokeColor: '#F43F5E', elementTextColor: '#E11D48', rankCircleColor: '#FB7185'
  }
};

const THEMATIC_DECKS = [
  {
    id: 'deck-divinos',
    name: 'Panteão Divino & Celestiais',
    description: 'Deuses ancestrais, constelações do zodíaco, regentes celestiais e titãs cósmicos.',
    accentColor: '#EAB308',
  },
  {
    id: 'deck-elementais',
    name: 'Guardiões Elementais & Natureza',
    description: 'Titãs de fogo, magma, oceano, rocha, raízes, tempestades e montanhas.',
    accentColor: '#06B6D4',
  },
  {
    id: 'deck-sombras',
    name: 'Cripta das Sombras & Necromancia',
    description: 'Necromantes, ceifadores, vampiros, múmias e horrores das profundezas.',
    accentColor: '#9333EA',
  },
  {
    id: 'deck-guerreiros',
    name: 'Clã dos Ronins & Guerreiros',
    description: 'Samurais honrados, shoguns, ninjas furtivos, vikings nórdicos e mestres marciais.',
    accentColor: '#EF4444',
  },
  {
    id: 'deck-gourmet',
    name: 'Reino Gourmet & Travessos',
    description: 'Pudins lendários, panquecas de mel, doces encantados e pequeninos ajudantes.',
    accentColor: '#EC4899',
  },
  {
    id: 'deck-grimorio',
    name: 'Grimório Arcano & Relíquias',
    description: 'Poções mágicas, elixires lunares, ampulhetas do tempo, armas e feitiços.',
    accentColor: '#6366F1',
  },
  {
    id: 'deck-main',
    name: 'Matriz Geral',
    description: 'Acervo completo de cartas ativas.',
    accentColor: '#10B981',
  }
];

function determineCreatureProfile(filename) {
  const fLower = filename.toLowerCase();

  // 1. DEUSES E DIVINDADES (Panteão Divino)
  if (
    /^(01|02|03|04|05|06|07|08|09|10)_/.test(filename) ||
    fLower.includes('divino') ||
    fLower.includes('regente') ||
    fLower.includes('oráculo') || fLower.includes('oraculo') ||
    fLower.includes('cósmic') || fLower.includes('cosmic') ||
    fLower.includes('estelar') ||
    fLower.includes('pavão') || fLower.includes('pavao') ||
    fLower.includes('zodíaco') || fLower.includes('zodiaco') ||
    fLower.includes('áries') || fLower.includes('aries') ||
    fLower.includes('virgem') ||
    fLower.includes('gêmeas') || fLower.includes('gemeas') ||
    fLower.includes('câncer') || fLower.includes('cancer') ||
    fLower.includes('leão') || fLower.includes('leao') ||
    fLower.includes('touro') ||
    fLower.includes('vazio') ||
    fLower.includes('eclipse')
  ) {
    let elem = 'DIVINO';
    if (fLower.includes('trovão') || fLower.includes('trovao')) elem = 'TROVAO';
    else if (fLower.includes('fogo') || fLower.includes('ember') || fLower.includes('áries') || fLower.includes('aries')) elem = 'FOGO';
    else if (fLower.includes('maré') || fLower.includes('mare') || fLower.includes('onda') || fLower.includes('câncer')) elem = 'AGUA';
    else if (fLower.includes('raiz') || fLower.includes('árvore') || fLower.includes('arvore') || fLower.includes('touro')) elem = 'TERRA';
    else if (fLower.includes('gelo') || fLower.includes('gélida') || fLower.includes('gelida')) elem = 'GELO';
    else if (fLower.includes('nuvem') || fLower.includes('vento')) elem = 'VENTO';
    else if (fLower.includes('vazio') || fLower.includes('eclipse')) elem = 'COSMICO';

    return {
      deckId: 'deck-divinos',
      family: 'Panteão Celestial',
      biome: 'Monte das Constelações',
      collection: 'Divindades de Slimelands',
      element: elem,
      cardClass: fLower.includes('01') || fLower.includes('02') || fLower.includes('divino') || fLower.includes('vazio') ? 'Mítica' : 'Lendária',
      cardRank: 'S',
      basePv: 1100 + Math.floor(Math.random() * 300),
      stamCost: 7 + Math.floor(Math.random() * 2),
      isPremium: true
    };
  }

  // 2. SOMBRAS, NECROMANCIA & TERROR
  if (
    fLower.includes('necromante') ||
    fLower.includes('ceifador') ||
    fLower.includes('vampiro') ||
    fLower.includes('morcego') ||
    fLower.includes('múmia') || fLower.includes('mumia') ||
    fLower.includes('bruxo') ||
    fLower.includes('fantasma') ||
    fLower.includes('esqueleto') || fLower.includes('ósseo') || fLower.includes('osseo') ||
    fLower.includes('cripta') ||
    fLower.includes('venen') ||
    fLower.includes('tóxic') || fLower.includes('toxic') ||
    fLower.includes('ácid') || fLower.includes('acid') ||
    fLower.includes('parasita') ||
    fLower.includes('mímico') || fLower.includes('mimico') ||
    fLower.includes('devorador') ||
    fLower.includes('halloween') ||
    fLower.includes('abóbora') || fLower.includes('abobora') ||
    fLower.includes('lixo') ||
    fLower.includes('esgoto')
  ) {
    const isBoss = fLower.includes('rei') || fLower.includes('rainha') || fLower.includes('necromante') || fLower.includes('ceifador');
    return {
      deckId: 'deck-sombras',
      family: 'Cripta & Pragas',
      biome: 'Pântano Maldito',
      collection: 'Legião das Sombras',
      element: 'TREVAS',
      cardClass: isBoss ? 'Lendária' : (Math.random() > 0.4 ? 'Épica' : 'Rara'),
      cardRank: isBoss ? 'A' : (Math.random() > 0.5 ? 'B' : 'C'),
      basePv: 750 + Math.floor(Math.random() * 300),
      stamCost: 4 + Math.floor(Math.random() * 3),
      isPremium: isBoss
    };
  }

  // 3. GUERREIROS, SAMURAIS, SHINOBIS & VIKINGS
  if (
    fLower.includes('shogun') ||
    fLower.includes('ronin') ||
    fLower.includes('samurai') ||
    fLower.includes('shinobi') ||
    fLower.includes('ninja') ||
    fLower.includes('assassino') ||
    fLower.includes('viking') ||
    fLower.includes('jarl') ||
    fLower.includes('berserker') ||
    fLower.includes('cavaleiro') ||
    fLower.includes('guerreiro') ||
    fLower.includes('arqueiro') ||
    fLower.includes('pirata') ||
    fLower.includes('carrasco') ||
    fLower.includes('espada') ||
    fLower.includes('martelo') ||
    fLower.includes('kabuki') ||
    fLower.includes('onmyoji') ||
    fLower.includes('raposa') || fLower.includes('kitsune')
  ) {
    const isLord = fLower.includes('shogun') || fLower.includes('jarl') || fLower.includes('nove caudas') || fLower.includes('excalibur') || fLower.includes('mjolnir');
    let elem = 'METAL';
    if (fLower.includes('carmesim') || fLower.includes('fogo')) elem = 'FOGO';
    else if (fLower.includes('neve') || fLower.includes('gelo')) elem = 'GELO';
    else if (fLower.includes('lunar') || fLower.includes('onmyoji')) elem = 'ARCANO';
    else if (fLower.includes('trovão') || fLower.includes('trovao')) elem = 'TROVAO';
    else if (fLower.includes('pirata') || fLower.includes('mar')) elem = 'AGUA';

    return {
      deckId: 'deck-guerreiros',
      family: 'Clã das Lâminas',
      biome: 'Fortaleza Sengoku & Fiordes',
      collection: 'Honra e Sangue',
      element: elem,
      cardClass: isLord ? 'Lendária' : (Math.random() > 0.4 ? 'Épica' : 'Rara'),
      cardRank: isLord ? 'A' : (Math.random() > 0.5 ? 'B' : 'A'),
      basePv: 850 + Math.floor(Math.random() * 350),
      stamCost: 5 + Math.floor(Math.random() * 3),
      isPremium: isLord
    };
  }

  // 4. GOURMET & TRAVESSOS
  if (
    fLower.includes('pudim') ||
    fLower.includes('panqueca') ||
    fLower.includes('nigiri') ||
    fLower.includes('cupcake') ||
    fLower.includes('morango') ||
    fLower.includes('chocolate') ||
    fLower.includes('pão') || fLower.includes('pao') ||
    fLower.includes('chiclete') ||
    fLower.includes('saborosas') ||
    fLower.includes('coelhinho') ||
    fLower.includes('caracol') ||
    fLower.includes('passarinho') ||
    fLower.includes('elefante') ||
    fLower.includes('fada') ||
    fLower.includes('lavanda') ||
    fLower.includes('bardo') ||
    fLower.includes('sineiro') ||
    fLower.includes('vaga-lume') || fLower.includes('vagalume') ||
    fLower.includes('arco-íris') || fLower.includes('arco-iris')
  ) {
    return {
      deckId: 'deck-gourmet',
      family: 'Reino Gourmet & Travessos',
      biome: 'Vale dos Doces & Bosque Feliz',
      collection: 'Delícias de Slimelands',
      element: 'GOURMET',
      cardClass: fLower.includes('pudim') || fLower.includes('ouro') ? 'Épica' : (Math.random() > 0.5 ? 'Rara' : 'Comum'),
      cardRank: Math.random() > 0.6 ? 'B' : 'C',
      basePv: 600 + Math.floor(Math.random() * 250),
      stamCost: 3 + Math.floor(Math.random() * 2),
      isPremium: fLower.includes('ouro') || fLower.includes('escudo dourado')
    };
  }

  // 5. ELEMENTAIS & NATUREZA (Padrão)
  let elem = 'TERRA';
  if (fLower.includes('fogo') || fLower.includes('lava') || fLower.includes('vulc') || fLower.includes('cinzas') || fLower.includes('chama') || fLower.includes('basalto')) elem = 'FOGO';
  else if (fLower.includes('oceân') || fLower.includes('ocean') || fLower.includes('água') || fLower.includes('agua') || fLower.includes('mar') || fLower.includes('coral') || fLower.includes('concha') || fLower.includes('abissal') || fLower.includes('koi')) elem = 'AGUA';
  else if (fLower.includes('gelo') || fLower.includes('polar') || fLower.includes('neve') || fLower.includes('glacial')) elem = 'GELO';
  else if (fLower.includes('vento') || fLower.includes('brisa') || fLower.includes('folha')) elem = 'VENTO';
  else if (fLower.includes('relâmpago') || fLower.includes('relampago') || fLower.includes('raio') || fLower.includes('trovão') || fLower.includes('trovao')) elem = 'TROVAO';
  else if (fLower.includes('cristal') || fLower.includes('quartzo') || fLower.includes('ametista') || fLower.includes('pedra') || fLower.includes('rocha') || fLower.includes('granit')) elem = 'TERRA';
  else if (fLower.includes('cogumelo') || fLower.includes('fungo') || fLower.includes('musgo') || fLower.includes('raiz') || fLower.includes('raízes')) elem = 'TERRA';

  const isTitan = fLower.includes('colosso') || fLower.includes('dragão') || fLower.includes('dragao') || fLower.includes('gigante') || fLower.includes('ancestral');

  return {
    deckId: 'deck-elementais',
    family: `Guardiões do ${elem.charAt(0) + elem.slice(1).toLowerCase()}`,
    biome: elem === 'FOGO' ? 'Pico do Vulcão' : elem === 'AGUA' ? 'Recife Abissal' : elem === 'GELO' ? 'Geleira Ancestral' : 'Santuário Florestal',
    collection: 'Forças da Natureza',
    element: elem,
    cardClass: isTitan ? 'Lendária' : (Math.random() > 0.4 ? 'Épica' : 'Rara'),
    cardRank: isTitan ? 'A' : (Math.random() > 0.4 ? 'B' : 'C'),
    basePv: 800 + Math.floor(Math.random() * 300),
    stamCost: 4 + Math.floor(Math.random() * 3),
    isPremium: isTitan
  };
}

function cleanTitle(rawName) {
  let title = rawName
    .replace(/\.[^/.]+$/, '')
    .replace(/^[0-9]+[_\s.-]*/, '')
    .replace(/\([0-9]+\)$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove sufixos numéricos feios como "-3", "-14" no final
  title = title.replace(/\s*-\s*\d+$/, '').trim();

  // Capitalização suave
  if (title.length > 26) {
    // Tenta encurtar de forma expressiva
    const parts = title.split(' ');
    if (parts.length > 3) {
      title = parts.slice(0, 3).join(' ');
    }
  }

  // Títulos elegantes e limpos
  title = title.charAt(0).toUpperCase() + title.slice(1);
  return title || 'Slime Guerreiro';
}

function buildCreatureCard(filename, index) {
  const title = cleanTitle(filename);
  const profile = determineCreatureProfile(filename);
  const pal = ELEMENT_PALETTES[profile.element] || ELEMENT_PALETTES.TERRA;
  const cardId = `slime-mtx-${String(index + 1).padStart(3, '0')}`;

  const atk1 = Math.round(profile.basePv * 0.35);
  const atk2 = Math.round(profile.basePv * 0.55);
  const atk3 = Math.round(profile.basePv * 0.85);
  const atkUlt = Math.round(profile.basePv * 1.35);

  const pills = [
    {
      id: `${cardId}-p1`,
      mode: 'stat',
      badgeValue: '2',
      badgeColor: '#0084FF',
      mainText: String(atk1),
      attackName: 'Impacto Básico',
      attackType: 'damage',
      costResource: 'stamina'
    },
    {
      id: `${cardId}-p2`,
      mode: 'stat',
      badgeValue: '4',
      badgeColor: '#10B981',
      mainText: String(atk2),
      attackName: 'Técnica Elemental',
      attackType: 'damage',
      costResource: 'stamina'
    },
    {
      id: `${cardId}-p3`,
      mode: 'stat',
      badgeValue: '6',
      badgeColor: '#9333EA',
      mainText: String(atk3),
      attackName: 'Golpe de Poder',
      attackType: 'damage',
      costResource: 'stamina'
    },
    {
      id: `${cardId}-p4`,
      mode: 'stat',
      badgeValue: '∞',
      badgeColor: '#DF9A1E',
      mainText: String(atkUlt),
      isChromaticSpecial: true,
      attackName: 'Suprema Colossal',
      attackType: 'damage',
      isSpecialUltimate: true,
      costResource: 'stamina'
    }
  ];

  return {
    id: cardId,
    title,
    pvText: `PV${profile.basePv}`,
    pvNumber: profile.basePv,
    elementText: profile.element,
    rankBadgeText: profile.cardRank,
    cardRank: profile.cardRank,
    cardClass: profile.cardClass,
    entityType: 'Criatura',
    imageUrl: `/cards/${filename}`,
    videoUrl: null,
    mediaType: 'image',
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    backgroundFill: 'dark',
    autoAdaptColors: false,
    frameTopColor: pal.frameTopColor,
    frameMidColor: pal.frameMidColor,
    frameBottomColor: pal.frameBottomColor,
    strokeColor: pal.strokeColor,
    strokeWidth: 2,
    strokeGlow: 100,
    elementTextColor: pal.elementTextColor,
    rankCircleColor: pal.rankCircleColor,
    extractedSwatches: [],
    isPremium: profile.isPremium,
    prismaticIntensity: profile.isPremium ? 100 : 0,
    microGlitterIntensity: profile.isPremium ? 90 : 0,
    contourLightSpeed: 1.8,
    parallaxDepth: 100,
    autoShowcaseEnabled: false,
    showcaseDurationSec: 5,
    isRankChromatic: profile.cardRank === 'S',
    isPvChromatic: false,
    invertElementCapsule: true,
    showcaseVfx: profile.element === 'FOGO' ? 'hellfire' : profile.element === 'GELO' ? 'frost' : profile.element === 'TREVAS' ? 'venom' : 'arcane-storm',
    showcaseVfxIntensity: 85,
    vfxPlayOnNormalView: false,
    loreHeader: `${title} · ${profile.family}`,
    loreBody: `Habitante ancestral do ${profile.biome}. Canaliza as emanações místicas de ${profile.element.toLowerCase()} para proteger seu território com ferocidade.`,
    magicPrefix: `⚔️ Habilidade de ${profile.element.charAt(0) + profile.element.slice(1).toLowerCase()}`,
    magicDescription: `Desencadeia uma investida de puro elemento ${profile.element.toLowerCase()}, causando ${atkUlt} de dano colossal.`,
    showLoreBox: true,
    loreBoxOpacity: 88,
    loreBoxY: 724,
    pillCount: 4,
    dockAutoFit: true,
    pills,
    showSummonCostPill: true,
    summonCostPill: {
      id: `${cardId}-cost`,
      mode: 'stat',
      badgeValue: String(profile.stamCost),
      badgeColor: '#F59E0B',
      mainText: 'INVOC.',
      isSummonCost: true,
      costResource: 'stamina'
    },
    summonStaminaCost: profile.stamCost,
    deckId: profile.deckId,
    family: profile.family,
    biome: profile.biome,
    collections: [profile.collection, 'Matriz Completa'],
    recordKind: 'matrix',
    classificationState: 'Classificada',
    editState: 'Pronta para Packs',
    createdAt: new Date().toISOString()
  };
}

function buildMagicCard(filename, index) {
  const title = cleanTitle(filename);
  const cardId = `spell-mtx-${String(index + 1).padStart(3, '0')}`;
  const fLower = filename.toLowerCase();

  let manaCost = 3;
  let rClass = 'Rara';
  let rRank = 'B';
  let elem = 'ARCANO';
  let effectKind = 'heal';

  if (fLower.includes('solar') || fLower.includes('alvorada') || fLower.includes('aurora') || fLower.includes('brasa')) {
    elem = 'LUZ';
  } else if (fLower.includes('lunar') || fLower.includes('sombra') || fLower.includes('amaldiçoada') || fLower.includes('sombria')) {
    elem = 'TREVAS';
  } else if (fLower.includes('geada') || fLower.includes('gelo')) {
    elem = 'GELO';
  } else if (fLower.includes('tempestade') || fLower.includes('trovejante') || fLower.includes('vento')) {
    elem = 'TROVAO';
  } else if (fLower.includes('espinheiro') || fLower.includes('raiz') || fLower.includes('ervas') || fLower.includes('cogumelo')) {
    elem = 'TERRA';
  }

  if (fLower.includes('fênix') || fLower.includes('fenix') || fLower.includes('estrelas') || fLower.includes('reversão') || fLower.includes('reversao')) {
    rClass = 'Mítica';
    rRank = 'S';
    manaCost = 5;
  } else if (fLower.includes('solar') || fLower.includes('lunar') || fLower.includes('arcano') || fLower.includes('coroa')) {
    rClass = 'Lendária';
    rRank = 'A';
    manaCost = 4;
  } else if (fLower.includes('tônico') || fLower.includes('tonico') || fLower.includes('bálsamo') || fLower.includes('balsamo') || fLower.includes('elixir')) {
    rClass = 'Épica';
    rRank = 'B';
    manaCost = 3;
  }

  const pal = ELEMENT_PALETTES[elem] || ELEMENT_PALETTES.ARCANO;

  return {
    id: cardId,
    title,
    pvText: `MANA${manaCost}`,
    pvNumber: undefined,
    elementText: elem,
    rankBadgeText: rRank,
    cardRank: rRank,
    cardClass: rClass,
    entityType: 'Magia',
    imageUrl: `/cards/${filename}`,
    videoUrl: null,
    mediaType: 'image',
    imageScale: 1,
    imageOffsetX: 0,
    imageOffsetY: 0,
    backgroundFill: 'dark',
    autoAdaptColors: false,
    frameTopColor: pal.frameTopColor,
    frameMidColor: pal.frameMidColor,
    frameBottomColor: pal.frameBottomColor,
    strokeColor: pal.strokeColor,
    strokeWidth: 2,
    strokeGlow: 100,
    elementTextColor: pal.elementTextColor,
    rankCircleColor: pal.rankCircleColor,
    extractedSwatches: [],
    isPremium: rRank === 'S' || rRank === 'A',
    prismaticIntensity: rRank === 'S' ? 100 : 60,
    microGlitterIntensity: 80,
    contourLightSpeed: 1.8,
    parallaxDepth: 100,
    autoShowcaseEnabled: false,
    showcaseDurationSec: 5,
    isRankChromatic: rRank === 'S',
    isPvChromatic: false,
    invertElementCapsule: true,
    showcaseVfx: 'arcane-storm',
    showcaseVfxIntensity: 85,
    vfxPlayOnNormalView: false,
    loreHeader: `${title} · Relíquia Arcana`,
    loreBody: `Artefato canalizador consagrado no Grimório Ancestral. Concede domínio imediato sobre energias de ${elem.toLowerCase()} no campo de batalha.`,
    magicPrefix: `🔮 Feitiço de ${elem.charAt(0) + elem.slice(1).toLowerCase()} (Custo ${manaCost} Mana)`,
    magicDescription: `Ativa um efeito de suporte arcano superior, alterando o fluxo do duelo a favor do conjurador.`,
    showLoreBox: true,
    loreBoxOpacity: 88,
    loreBoxY: 724,
    pillCount: 1,
    dockAutoFit: true,
    pills: [
      {
        id: `${cardId}-eff`,
        mode: 'text',
        badgeValue: String(manaCost),
        badgeColor: '#0084FF',
        mainText: 'MANA',
        attackName: title,
        attackType: 'enchantment',
        costResource: 'mana'
      },
      { id: `${cardId}-p2`, mode: 'stat', badgeValue: '0', badgeColor: '#555', mainText: '0' },
      { id: `${cardId}-p3`, mode: 'stat', badgeValue: '0', badgeColor: '#555', mainText: '0' },
      { id: `${cardId}-p4`, mode: 'stat', badgeValue: '0', badgeColor: '#555', mainText: '0' }
    ],
    showSummonCostPill: true,
    summonCostPill: {
      id: `${cardId}-cost`,
      mode: 'stat',
      badgeValue: String(manaCost),
      badgeColor: '#0084FF',
      mainText: 'MANA',
      isSummonCost: true,
      costResource: 'mana'
    },
    magicManaCost: manaCost,
    deckId: 'deck-grimorio',
    family: 'Relíquias & Grimórios',
    biome: 'Câmara Arcana',
    collections: ['Grimório de Slimelands', 'Matriz Completa'],
    recordKind: 'matrix',
    classificationState: 'Classificada',
    editState: 'Pronta para Packs',
    createdAt: new Date().toISOString()
  };
}

// 1. Processar todas as criaturas
const creatureFiles = fs.readdirSync(srcCreatures).filter(f => /\.(png|jpe?g|webp)$/i.test(f));
const magicFiles = fs.readdirSync(srcMagics).filter(f => /\.(png|jpe?g|webp)$/i.test(f));

console.log(`Lendo ${creatureFiles.length} cartas de criaturas e ${magicFiles.length} cartas de magias/itens...`);

const allCards = [];

creatureFiles.forEach((f, idx) => {
  allCards.push(buildCreatureCard(f, idx));
});

magicFiles.forEach((f, idx) => {
  allCards.push(buildMagicCard(f, idx));
});

console.log(`Total de cartas montadas na Matriz: ${allCards.length}`);

// 2. Montar snapshot completo
const matrixSnapshot = {
  version: 2,
  updatedAt: new Date().toISOString(),
  cards: allCards,
  decks: THEMATIC_DECKS,
  baseCharacters: allCards.map(c => ({
    id: `char-${c.id}`,
    name: c.title,
    description: c.loreBody,
    imageUrl: c.imageUrl,
    entityType: c.entityType,
    element: c.elementText,
    matrixRarity: c.cardClass,
    classificationState: 'Classificada',
    editState: 'Pronta para Packs',
    family: c.family,
    biome: c.biome,
    collections: c.collections,
    abilities: [],
    allowedClasses: [c.cardClass],
    availableForDrops: true,
    availableForScan: true,
    availableForBoosters: true,
    active: true
  })),
  subgroupCatalog: {
    families: [
      'Panteão Celestial',
      'Guardiões do Fogo',
      'Guardiões do Água',
      'Guardiões do Gelo',
      'Guardiões do Vento',
      'Guardiões do Trovão',
      'Guardiões do Terra',
      'Cripta & Pragas',
      'Clã das Lâminas',
      'Reino Gourmet & Travessos',
      'Relíquias & Grimórios'
    ],
    biomes: [
      'Monte das Constelações',
      'Pico do Vulcão',
      'Recife Abissal',
      'Geleira Ancestral',
      'Santuário Florestal',
      'Pântano Maldito',
      'Fortaleza Sengoku & Fiordes',
      'Vale dos Doces & Bosque Feliz',
      'Câmara Arcana'
    ],
    collections: [
      'Divindades de Slimelands',
      'Forças da Natureza',
      'Legião das Sombras',
      'Honra e Sangue',
      'Delícias de Slimelands',
      'Grimório de Slimelands',
      'Matriz Completa'
    ]
  },
  globalBackImageUrl: '/backcard.jpg',
  activeCardId: allCards[0]?.id || 'slime-mtx-001'
};

// 3. Salvar o snapshot em src/core/cards.json (formato engine)
fs.writeFileSync(path.resolve('src/core/cards.json'), JSON.stringify(allCards.map(c => ({
  id: c.id,
  name: c.title,
  image: c.imageUrl,
  baseAtk: c.pills[2]?.mainText ? parseInt(c.pills[2].mainText, 10) : 600,
  basePv: c.pvNumber || 500,
  manaCost: c.magicManaCost || 4,
  staminaCost: c.summonStaminaCost || 4,
  preferredRarity: c.cardClass === 'Lendária' || c.cardClass === 'Mítica' ? 'legendary' : c.cardClass === 'Épica' ? 'epic' : 'rare',
  classId: c.entityType === 'Magia' ? 'mago' : 'criatura',
  deckId: c.deckId,
  attacks: c.pills.slice(0, 3).map(p => ({
    type: 'damage',
    name: p.attackName || 'Golpe',
    damage: parseInt(p.mainText, 10) || 300,
    cost: parseInt(p.badgeValue, 10) || 2,
    costType: p.costResource || 'stamina'
  })),
  specialAttack: {
    name: c.pills[3]?.attackName || 'Suprema Colossal',
    damage: parseInt(c.pills[3]?.mainText, 10) || 900,
    costType: 'stamina',
    cost: 0,
    description: c.magicDescription
  },
  parry: 1
})), null, 2), 'utf8');

// 4. Salvar o snapshot da Matriz completo em src/core/matrix_snapshot.json
fs.writeFileSync(path.resolve('src/core/matrix_snapshot.json'), JSON.stringify(matrixSnapshot, null, 2), 'utf8');

// 5. Atualizar defaultCards.ts exportando INITIAL_CARDS completo
const defaultCardsTsPath = path.resolve('src/card_studio/src/utils/defaultCards.ts');
let defaultCardsTsContent = fs.readFileSync(defaultCardsTsPath, 'utf8');

const updatedDefaultCardsTs = `import { CardData } from '../types/card';
import { DEFAULT_PRESET_PALETTES } from './colorExtractor';
import matrixData from '../../../core/matrix_snapshot.json';

export const SAMPLE_ARTWORKS = {
  hestridiaForest: '/cards/Slime_Zen_no_Santu_rio_Florestal.png',
  abyssalLeviathan: '/cards/Slime_oce_nico_surfando_na_concha-7.png',
  solarArchangel: '/cards/Slime_de_Fogo_em_Investida_Explosiva.png',
};

export const BLANK_TEMPLATE_CARD: CardData = (matrixData.cards && matrixData.cards[0]) ? (matrixData.cards[0] as CardData) : {
  id: 'slimelands-base-template',
  title: 'Regente da Alvorada',
  pvText: 'PV1250',
  elementText: 'DIVINO',
  rankBadgeText: 'S',
  loreHeader: 'Regente da Alvorada · Panteão Celestial',
  loreBody: 'Entidade primordial da aurora de Slimelands que comanda as constelações sagradas.',
  magicPrefix: '⚔️ Luz Divina (Custo 0 · ∞)',
  magicDescription: 'Desencadeia o despertar da aurora sagrada em todo o campo.',
  showLoreBox: true,
  loreBoxOpacity: 88,
  loreBoxY: 724,
  pillCount: 4,
  dockAutoFit: true,
  pills: [
    { id: 'p1', mode: 'stat', badgeValue: '2', badgeColor: '#0084FF', mainText: '450' },
    { id: 'p2', mode: 'stat', badgeValue: '4', badgeColor: '#10B981', mainText: '720' },
    { id: 'p3', mode: 'stat', badgeValue: '6', badgeColor: '#9333EA', mainText: '1100' },
    { id: 'p4', mode: 'stat', badgeValue: '∞', badgeColor: '#DF9A1E', mainText: '1750', isChromaticSpecial: true }
  ],
  imageUrl: '/cards/01_Regente_da_Alvorada.png',
  videoUrl: null,
  mediaType: 'image',
  imageScale: 1,
  imageOffsetX: 0,
  imageOffsetY: 0,
  backgroundFill: 'dark',
  autoAdaptColors: false,
  frameTopColor: '#4A3B00',
  frameMidColor: '#241D00',
  frameBottomColor: '#050400',
  strokeColor: '#FFD700',
  strokeWidth: 2,
  strokeGlow: 100,
  elementTextColor: '#EAB308',
  rankCircleColor: '#F59E0B',
  extractedSwatches: DEFAULT_PRESET_PALETTES,
  isPremium: true,
  prismaticIntensity: 100,
  microGlitterIntensity: 90,
  contourLightSpeed: 1.8,
  parallaxDepth: 100,
  autoShowcaseEnabled: false,
  showcaseDurationSec: 5,
  isRankChromatic: true,
  isPvChromatic: false,
  invertElementCapsule: true,
  showcaseVfx: 'arcane-storm',
  showcaseVfxIntensity: 85,
  vfxPlayOnNormalView: false,
  backImageUrl: '/backcard.jpg',
  baseCharacterId: 'char-regente',
  cardClass: 'Mítica',
  cardRank: 'S',
  entityType: 'Criatura',
  pvNumber: 1250,
  maxDamage: 1750,
  summonStaminaCost: 8,
  deckId: 'deck-divinos',
  createdAt: new Date().toISOString()
};

// INITIAL_CARDS alimentado com todas as 289 cartas dos Decks Temáticos
export const INITIAL_CARDS: CardData[] = (matrixData.cards || []) as CardData[];

export function createInitialPlayerInventory(): CardData[] {
  return INITIAL_CARDS.slice(0, 15);
}
`;

fs.writeFileSync(defaultCardsTsPath, updatedDefaultCardsTs, 'utf8');

// 6. Atualizar DEFAULT_DECK_CATEGORIES em proceduralEngine.ts para conter os 6 Decks Temáticos
const proceduralEnginePath = path.resolve('src/card_studio/src/utils/proceduralEngine.ts');
let peContent = fs.readFileSync(proceduralEnginePath, 'utf8');
const deckRegex = /export const DEFAULT_DECK_CATEGORIES: DeckCategory\[\] = \[[\s\S]*?\];/;
const newDeckCode = `export const DEFAULT_DECK_CATEGORIES: DeckCategory[] = ${JSON.stringify(THEMATIC_DECKS, null, 2)};`;
peContent = peContent.replace(deckRegex, newDeckCode);
fs.writeFileSync(proceduralEnginePath, peContent, 'utf8');

console.log('✅ Catalogo da Matriz e Decks Temáticos gerados com sucesso!');
