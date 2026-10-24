import fs from 'node:fs';
import path from 'node:path';

// Paletas harmoniosas e oficiais por elemento
export const ELEMENT_PALETTES: Record<string, {
  frameTopColor: string;
  frameMidColor: string;
  frameBottomColor: string;
  strokeColor: string;
  elementTextColor: string;
  rankCircleColor: string;
}> = {
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

export const THEMATIC_DECKS = [
  {
    id: 'deck-divinos',
    name: 'Panteão Divino & Celestiais',
    archetype: 'Divino / Celestial',
    description: 'Deuses primordiais, constelações do zodíaco e titãs celestiais.',
    accentColor: '#EAB308',
    board: 'celestial'
  },
  {
    id: 'deck-elementais',
    name: 'Guardiões Elementais & Natureza',
    archetype: 'Elementar',
    description: 'Guardiões de fogo, magma, oceano, rocha, raízes e tempestades.',
    accentColor: '#06B6D4',
    board: 'vulcão'
  },
  {
    id: 'deck-sombras',
    name: 'Cripta das Sombras & Necromancia',
    archetype: 'Trevas / Necromante',
    description: 'Necromantes, ceifadores, vampiros, bruxos de Halloween e múmias.',
    accentColor: '#9333EA',
    board: 'cripta'
  },
  {
    id: 'deck-guerreiros',
    name: 'Clã dos Ronins & Guerreiros',
    archetype: 'Guerreiro',
    description: 'Samurais honrados, shoguns, vikings montadores de carneiro e carrascos.',
    accentColor: '#EF4444',
    board: 'dojo'
  },
  {
    id: 'deck-gourmet',
    name: 'Reino Gourmet & Travessos',
    archetype: 'Gourmet',
    description: 'Porquinhos jardineiros, pudins de caramelo, panquecas de mel e doces.',
    accentColor: '#EC4899',
    board: 'doce'
  },
  {
    id: 'deck-grimorio',
    name: 'Grimório Arcano & Relíquias',
    archetype: 'Mago / Arcano',
    description: 'Elixires sagrados, ampulhetas temporais, feitiços e relíquias de tabuleiro.',
    accentColor: '#6366F1',
    board: 'arcano'
  }
];

// Tabelas de Balanceamento Oficiais da Matriz
const BALANCE = {
  Mítica: {
    pvMin: 1800, pvMax: 2400,
    dmgMin: 1500, dmgMax: 2200,
    stamCost: 8,
    ranks: ['S'] as const
  },
  Lendária: {
    pvMin: 1200, pvMax: 1650,
    dmgMin: 1000, dmgMax: 1600,
    stamCost: 7,
    ranks: ['S', 'A'] as const
  },
  Épica: {
    pvMin: 850, pvMax: 1150,
    dmgMin: 700, dmgMax: 1100,
    stamCost: 5,
    ranks: ['A', 'B'] as const
  },
  Rara: {
    pvMin: 550, pvMax: 800,
    dmgMin: 450, dmgMax: 750,
    stamCost: 3,
    ranks: ['B', 'C'] as const
  },
  Comum: {
    pvMin: 300, pvMax: 500,
    dmgMin: 200, dmgMax: 450,
    stamCost: 2,
    ranks: ['C', 'D'] as const
  }
};

const PASSIVE_POOL = [
  { id: 'reflect', name: 'Sangue por Sangue', triggerText: '🔁 REFLEXO!', desc: 'Reflete 50% do dano recebido de volta ao atacante.' },
  { id: 'phantom', name: 'Sombra Espectral', triggerText: '👻 SOMBRA', desc: 'Vira de costas no início do próximo turno aliado, esquivando-se.' },
  { id: 'rivalry', name: 'Rivalidade Ancestral', triggerText: '⚔️ RIVALIDADE!', desc: 'Causa +40% de dano adicional ao combater cartas de mesmo arquétipo.' },
  { id: 'resilience', name: 'Último Fôlego', triggerText: '💪 SOBREVIVEU!', desc: 'Sobrevive ao primeiro golpe mortal com 1 PV restante.' },
  { id: 'vampire', name: 'Drenagem Sombria', triggerText: '🩸 DRENOU!', desc: 'Cura o aliado em 25% do dano causado a cada ataque efetuado.' },
  { id: 'deathblow', name: 'Ira Final', triggerText: '💣 IRA FINAL!', desc: 'Ao morrer, explode causando dano colossal a todo o tabuleiro inimigo.' },
  { id: 'absorb_50', name: 'Sanguessuga Crítica', triggerText: '🦇 DRENOU 50%!', desc: 'Converte 50% de todo dano desferido em pontos de vida vitais.' }
];

const ACTIVE_SKILL_POOL = [
  { id: 'ocultacao', name: 'Ocultação das Sombras', desc: 'Vira uma carta inimiga para baixo, anulando sua guarda até ser atacada.', mana: 4 },
  { id: 'paralisia', name: 'Trovão Paralisante', desc: 'Paralisa a carta alvo por 1 turno completo. Impede qualquer ataque.', mana: 4 },
  { id: 'escudo', name: 'Barreira de Cristal', desc: 'Concede escudo protetor imune ao próximo ataque direto.', mana: 3 },
  { id: 'sabedoria', name: 'Sabedoria Ancestral', desc: 'Permite comprar 2 cartas extras imediatamente.', mana: 3 }
];

export function normalizeCreatureTitle(raw: string): string {
  let title = raw.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/[-_]/g, ' ').replace(/\s*\d+$/, '').trim();

  // Tratamento de prefixos de golpes para torná-los nomes de Criaturas RPG imersivas
  const renames: [RegExp, string][] = [
    [/^Esquiva sombria do vampiro slime/i, 'Vampiro Slime Sombrio'],
    [/^Contra[\s-]ataque da Rainha\s*Ácida/i, 'Rainha Ácida dos Slimes'],
    [/^Golpe do escorpião de pedra/i, 'Escorpião de Pedra Ancestral'],
    [/^Salto do slime musgo no riacho/i, 'Slime do Musgo Aquático'],
    [/^Salto do slime shinobi ao luar/i, 'Slime Shinobi Noturno'],
    [/^Salto heroico do slime esmeralda/i, 'Slime Herói Esmeralda'],
    [/^Salto lunar do bobo de porcelana/i, 'Bobo de Porcelana Lunar'],
    [/^Salto surpresa do slime cocô/i, 'Slime de Argila Rústica'],
    [/^Salto devorador sobre a vala/i, 'Devorador de Lodo Voraz'],
    [/^Salto Voraz do Mímico Esmeralda/i, 'Mímico Esmeralda Voraz'],
    [/^Fúria do slime de basalto/i, 'Colosso de Basalto Ígneo'],
    [/^A trilha secreta do slime viking/i, 'Guerreiro Viking das Neves'],
    [/^Pacto da Aurora[\s_]+slime viking e corvo/i, 'Viking da Aurora & Corvo'],
    [/^Arqueiro slime mira a lanterna/i, 'Arqueiro Slime da Vigia'],
    [/^Bardo slime da aurora/i, 'Bardo Slime Melódico'],
    [/^ceifador de lodo sob a lua cheia/i, 'Ceifador de Lodo Lunar'],
    [/^morcego slime vampiro sobre a cidade gótica/i, 'Vampiro Alado de Gotham'],
    [/^halloween original 1 mumia/i, 'Múmia Ancestral de Gosma'],
    [/^halloween original 2 morcego/i, 'Morcego Espectral da Noite'],
    [/^halloween original 3 bruxo/i, 'Bruxo Alquimista Macabro'],
    [/^halloween original 4 ceifador/i, 'Ceifador Sombrio da Meia-Noite'],
    [/^Lança de sal no horizonte rosado/i, 'Guardião da Lança de Sal'],
    [/^Limo de Gelo Ergue a Muralha/i, 'Guardião da Muralha de Gelo'],
    [/^Limo descobre uma porta luminosa/i, 'Explorador da Porta Arcana'],
    [/^Limo rosa protege o jardim de rosas/i, 'Guardião das Rosas Silvestres'],
    [/^Slime de raízes arrasta uma semente gigante/i, 'Colosso das Raízes Vivas'],
    [/^Slime alado captura cristal estelar/i, 'Slime Alado Caçador Estelar'],
    [/^Slime ajuda caracol na ponte/i, 'Slime Protetor do Bosque'],
    [/^Slime azul guia a concha ao filhote/i, 'Slime Guardião das Conchas'],
    [/^Slime azul devolve pérola ao filhote/i, 'Slime Protetor dos Recifes'],
    [/^Slime azul resgata estrela[\s-]do[\s-]mar/i, 'Slime Protetor das Marés'],
    [/^Slime e passarinho descobrem bagas brilhantes/i, 'Slime Jardineiro da Alvorada'],
    [/^Slime e vaga[\s-]lume guiam espíritos/i, 'Slime Guia dos Espíritos'],
    [/^Slime elefante rega a flor encantada/i, 'Slime Paquiderme Encantado'],
    [/^Slime entrega flor ao pássaro nevoento/i, 'Slime Mensageiro das Flores'],
    [/^Slime espelhado puxa espada do solo/i, 'Cavaleiro do Espelho Dourado'],
    [/^Slime fada desperta a flor lunar/i, 'Slime Fada da Lua Cheia'],
    [/^Slime guia passarinho ao ninho/i, 'Slime Protetor dos Ninhos'],
    [/^Slime lavanda protege broto sob a neve/i, 'Slime da Neve & Lavanda'],
    [/^Slime leva flor ao arco[\s-]íris/i, 'Slime Celeste do Arco-Íris'],
    [/^Slime semeia esperança ao amanhecer/i, 'Slime da Alvorada Radiante'],
    [/^Slime sineiro desperta a aldeia/i, 'Slime Sineiro da Alvorada'],
    [/^Slime venenoso colhe veneno floral/i, 'Slime Botânico Venenoso'],
    [/^Slime viking forja o martelo lendário/i, 'Ferreiro Viking de Valhalla'],
    [/^Slime de chiclete lança bolha adesiva/i, 'Slime Chicleteiro Pegajoso'],
    [/^Slime de pão mofado lança esporo/i, 'Slime Fúngico Esporífero'],
    [/^Slime de quartzo rosa em equilíbrio/i, 'Slime de Quartzo Gracioso'],
    [/^Slime do vento desviando da folha/i, 'Slime Veloz do Vento'],
    [/^Slime corajoso protege um vaga[\s-]lume/i, 'Slime Sentinela Noturno'],
    [/^Slime coral compartilha um fruto estrelado/i, 'Slime Coralino Pacífico'],
    [/^Slimes de Abóbora sob a Lua Cheia/i, 'Abóboras Gêmeas da Colheita'],
    [/^Seis slimes saborosas em movimento/i, 'Comitiva dos Slimes Doces'],
    [/^Desfile de seis slimes deliciosos/i, 'Banquete dos Pequenos Slimes'],
    [/^Pãozinho de vapor sonolento/i, 'Pãozinho Slime Sonolento'],
    [/^Ricochete do slime saco de lixo/i, 'Slime Sucateiro Rejeitado'],
    [/^Morango de chocolate em giro tímido/i, 'Slime Morango Achocolatado'],
    [/^Panqueca de mel com olhar maroto/i, 'Slime Panqueca Melada'],
    [/^Pudim de caramelo em pulinho travesso/i, 'Pudim de Caramelo Saltitante'],
    [/^Cupcake slime de framboesa travesso/i, 'Cupcake Slime de Framboesa'],
    [/^Nigiri slime atrevido rumo à câmera/i, 'Nigiri Slime Atrevido'],
    [/^Slime nigiri em deslize ninja/i, 'Nigiri Slime Shinobi'],
    [/^Carrasco de Ferro[\s_]+investida sob o portão/i, 'Carrasco de Ferro Ancestral'],
    [/^Cavaleiro slime prateado bloqueia o golpe/i, 'Cavaleiro Slime Prateado'],
    [/^Múmia de gosma chicoteia bandagens encantadas/i, 'Múmia de Gosma Encantada'],
    [/^Necromante de lodo invoca magia espectral/i, 'Necromante Espectral de Lodo'],
    [/^Slime ciclope com escudo âmbar/i, 'Slime Ciclope Guardião'],
    [/^Slime coelhinho leva ovo brilhante ao ninho/i, 'Slime Lebre dos Ovos Dourados'],
    [/^Slime colosso arranca coluna ancestral/i, 'Slime Colosso Ancestral'],
    [/^Slime coral invoca dragão de pétalas/i, 'Slime Coral Invocador'],
    [/^Slime de lava rompendo a cripta/i, 'Slime de Lava Devastador'],
    [/^Slime de pedra ergue rochas gigantes/i, 'Slime Titã das Rochas'],
    [/^Slime de três olhos abre portal lunar/i, 'Slime Místico dos Três Olhos'],
    [/^Slime dourado ajuda o passarinho/i, 'Slime Dourado Protetor'],
    [/^Slime dourado semeia um caminho estelar/i, 'Slime Semeador Estelar'],
    [/^Slime guerreiro rompe portal de pedra/i, 'Slime Guerreiro do Portal'],
    [/^Slime kabuki sob lanternas/i, 'Slime Ator Kabuki'],
    [/^Slime lavanda guia mariposa à flor lunar/i, 'Slime Guia de Mariposas'],
    [/^Slime lavanda tocando instrumento mágico/i, 'Slime Músico de Lavanda'],
    [/^Slime leão cromado em salto ascendente/i, 'Slime Leão Cromado'],
    [/^Slime necromante invoca serpente espectral/i, 'Slime Necromante da Serpente'],
    [/^Slime ninja roxo desliza sob o portão/i, 'Slime Ninja das Sombras'],
    [/^Slime obsidiana escala torre ao luar/i, 'Slime Obsidiano das Torres'],
    [/^Slime onmyoji invoca raposa lunar/i, 'Slime Onmyoji da Raposa'],
    [/^Slime perolado invoca uma onda sagrada/i, 'Slime Perolado Sagrado'],
    [/^Slime pirata índigo sob a tempestade/i, 'Capitão Slime Pirata Índigo'],
    [/^Slime raposa caçando um vagalume/i, 'Slime Raposa Noturna'],
    [/^Slime raposa girando com nove caudas/i, 'Slime Raposa das Nove Caudas'],
    [/^Slime relâmpago carregando disco metálico/i, 'Slime Tempestuoso Elétrico'],
    [/^Slime touro cromada em perfil/i, 'Slime Touro Cromado'],
    [/^Slime violeta lança espiral venenosa/i, 'Slime Violeta Espiral'],
    [/^Slime vulcânico martela a bigorna/i, 'Slime Forjador Vulcânico'],
    [/^Slime ácido saltando no esgoto/i, 'Slime Ácido dos Esgotos'],
    [/^Slimes gêmeas em espiral cromada/i, 'Slimes Gêmeas Cromadas'],
    [/^Sopro de fogo do slime dragão/i, 'Lorde Dracoslime de Fogo'],
    [/^Vampiro slime com asas de morcego/i, 'Vampiro Slime Alado']
  ];

  for (const [pattern, repl] of renames) {
    if (pattern.test(title)) {
      return repl;
    }
  }

  return title.replace(/^\d+[\s_]+/, '').replace(/_Panteão.*/i, '').trim();
}

export function runFullCatalogGeneration(workspaceRoot: string) {
  const creaturesDir = 'C:\\Users\\FELIP\\OneDrive\\Imagens\\cartas\\cartas';
  const magicsDir = 'C:\\Users\\FELIP\\OneDrive\\Imagens\\cartas\\Cartas_de_Magia_Slime';
  const publicCardsDir = path.resolve(workspaceRoot, 'public/cards');

  if (!fs.existsSync(publicCardsDir)) {
    fs.mkdirSync(publicCardsDir, { recursive: true });
  }

  // Copia segura de imagens se não existirem no public/cards
  const copyIfMissing = (src: string, targetName: string) => {
    const dest = path.join(publicCardsDir, targetName);
    if (!fs.existsSync(dest) && fs.existsSync(src)) {
      try { fs.copyFileSync(src, dest); } catch {}
    }
  };

  const creatureFiles = fs.existsSync(creaturesDir)
    ? fs.readdirSync(creaturesDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    : (fs.existsSync(publicCardsDir) ? fs.readdirSync(publicCardsDir).filter(f => !f.toLowerCase().startsWith('item_') && !/^\d+\s/.test(f) && /\.(png|jpg|jpeg|webp)$/i.test(f)) : []);

  const magicFiles = fs.existsSync(magicsDir)
    ? fs.readdirSync(magicsDir).filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    : (fs.existsSync(publicCardsDir) ? fs.readdirSync(publicCardsDir).filter(f => (f.toLowerCase().startsWith('item_') || /^\d+\s/.test(f)) && /\.(png|jpg|jpeg|webp)$/i.test(f)) : []);

  const allCards: any[] = [];
  let cardIdx = 1;

  // ---------------------------------------------------------------------------
  // PROCESSAMENTO DAS 198 CRIATURAS
  // ---------------------------------------------------------------------------
  // Particionamento Exato Conforme Balanceamento Oficial:
  // - 60% Cartas Comuns
  // - 20% Cartas Raras
  // - 10% Cartas Épicas
  // - 5% Cartas Lendárias (Rank A)
  // - 2% Cartas Lendárias Especiais (Rank S)
  // - 3% Cartas Míticas (Rank S, Custo Infinito Livre)
  // ---------------------------------------------------------------------------
  const isVikingMythic = (f: string, fLower: string) => (
    f.includes('5241c360-0176-4455') || // Cavaleiro do Carneiro Glacial
    fLower.includes('jarl slime, machado do trovão') || // Jarl Nórdico
    fLower.includes('berserker de lodo rompe o gelo')   // Berserker Valhalla
  );

  const isDivineMythic = (f: string, fLower: string) => (
    /^(01|02|03)_/.test(f) ||
    fLower.includes('rei do vazio') ||
    fLower.includes('slime divino e pavão')
  );

  const mythicSet = new Set<string>();
  const specialLegendarySet = new Set<string>();
  const nonMythicFiles: string[] = [];

  for (const f of creatureFiles) {
    const fl = f.toLowerCase();
    // 3% Míticas (as 6 entidades supremas do panteão e nórdicos)
    if (mythicSet.size < 6 && (isVikingMythic(f, fl) || isDivineMythic(f, fl))) {
      mythicSet.add(f);
    } else {
      nonMythicFiles.push(f);
    }
  }

  function getRarityPriority(f: string): number {
    const fl = f.toLowerCase();
    // Prioridade 0: Lendárias
    if (
      /^(04|05|06|07|08|09|10)_/.test(f) ||
      fl.includes('shogun') || fl.includes('dragão koi') || fl.includes('colosso') ||
      fl.includes('granítico') || fl.includes('carrasco') || fl.includes('ceifador') ||
      fl.includes('vórtice estelar') || fl.includes('três olhos') || fl.includes('espiral cromada') ||
      fl.includes('virgem') || fl.includes('touro') || fl.includes('pirata índigo') ||
      fl.includes('perolado') || fl.includes('basalto') || fl.includes('leão cromado') ||
      fl.includes('titã') || fl.includes('dragão') || fl.includes('onmyoji') ||
      fl.includes('místico') || fl.includes('primordial') || fl.includes('vampiro alado') ||
      fl.includes('cavaleiro slime prateado') || fl.includes('rainha ácida') ||
      fl.includes('ferreiro viking') || fl.includes('cavaleiro do espelho') ||
      fl.includes('lorde dracoslime') || fl.includes('fênix')
    ) return 0;

    // Prioridade 1: Épicas
    if (
      fl.includes('samurai') || fl.includes('shinobi') || fl.includes('ninja') ||
      fl.includes('kabuki') || fl.includes('arqueiro') || fl.includes('múmia') ||
      fl.includes('vampiro') || fl.includes('lava') || fl.includes('vulcânico') ||
      fl.includes('pudim') || fl.includes('panqueca') || fl.includes('ciclope') ||
      fl.includes('coral invoca') || fl.includes('alado caçador') || fl.includes('morcego') ||
      fl.includes('bruxo') || fl.includes('abóbora') || fl.includes('tempestuoso') ||
      fl.includes('raposa') || fl.includes('escorpião') || fl.includes('necromante') ||
      fl.includes('guerreiro') || fl.includes('obsidiana') || fl.includes('relâmpago') ||
      fl.includes('forjador') || fl.includes('venenoso colhe') || fl.includes('mariposa')
    ) return 1;

    // Prioridade 2: Raras
    if (
      fl.includes('guardião') || fl.includes('alquimista') || fl.includes('bardo') ||
      fl.includes('astronauta') || fl.includes('morango') || fl.includes('nigiri') ||
      fl.includes('âmbar') || fl.includes('quartzo') || fl.includes('esmeralda') ||
      fl.includes('fada') || fl.includes('espelho') || fl.includes('cristal') ||
      fl.includes('espectro') || fl.includes('jardineiro') || fl.includes('cupcake') ||
      fl.includes('chiclete') || fl.includes('fúngico') || fl.includes('botânico') ||
      fl.includes('sineiro') || fl.includes('elefante') || fl.includes('marés') ||
      fl.includes('recifes') || fl.includes('conchas') || fl.includes('ouro') ||
      fl.includes('coelhinho') || fl.includes('lavanda')
    ) return 2;

    return 3;
  }

  nonMythicFiles.sort((a, b) => {
    const diff = getRarityPriority(a) - getRarityPriority(b);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });

  // Distribuição Exata nas Criaturas (Total 198: 6 Míticas (3%), 4 Lendárias Especiais (2%), 10 Lendárias (5%), 20 Épicas (10%), 40 Raras (20%), 118 Comuns (60%))
  const creatureRarityMap = new Map<string, 'Lendária' | 'Épica' | 'Rara' | 'Comum'>();
  const totalCreatures = creatureFiles.length; // 198
  const countSpecialLendaria = Math.round(totalCreatures * 0.02); // 4
  const countRegularLendaria = Math.round(totalCreatures * 0.05); // 10
  const countLendariaTotal = countSpecialLendaria + countRegularLendaria; // 14
  const countEpica = Math.round(totalCreatures * 0.10); // 20
  const countRara = Math.round(totalCreatures * 0.20); // 40

  nonMythicFiles.forEach((file, idx) => {
    if (idx < countSpecialLendaria) {
      specialLegendarySet.add(file);
      creatureRarityMap.set(file, 'Lendária');
    } else if (idx < countLendariaTotal) {
      creatureRarityMap.set(file, 'Lendária');
    } else if (idx < countLendariaTotal + countEpica) {
      creatureRarityMap.set(file, 'Épica');
    } else if (idx < countLendariaTotal + countEpica + countRara) {
      creatureRarityMap.set(file, 'Rara');
    } else {
      creatureRarityMap.set(file, 'Comum');
    }
  });

  for (const f of creatureFiles) {
    const srcPath = path.join(creaturesDir, f);
    copyIfMissing(srcPath, f);

    const fLower = f.toLowerCase();
    let title = normalizeCreatureTitle(f);
    let deckId = 'deck-elementais';
    let element = 'TERRA';
    let family = 'Guardiões da Natureza';
    let biome = 'Santuário Florestal';
    let lore = 'Criatura elemental que guarda as terras vivas de Slimelands.';
    let moves = [
      { name: 'Impacto Viscoso', enc: null, vfx: 'vfx_claw_slash' },
      { name: 'Esfera Elemental', enc: 'veneno', vfx: 'vfx_siphon_cast' },
      { name: 'Ruptura Sísmica', enc: 'atordoamento', vfx: 'vfx_flame_burst' },
      { name: 'Despertar Ancestral', enc: null, vfx: 'arcane-storm' }
    ];

    let isMythic = mythicSet.has(f);
    let cardClass: keyof typeof BALANCE = isMythic ? 'Mítica' : (creatureRarityMap.get(f) || 'Comum');

    if (f.includes('5241c360-0176-4455')) {
      title = 'Cavaleiro do Carneiro Glacial';
      deckId = 'deck-guerreiros';
      element = 'GELO';
      family = 'Clã dos Ronins & Guerreiros';
      biome = 'Fiordes Nórdicos';
      lore = 'Guerreiro nórdico que cavalga um carneiro ancestral pelas fendas glaciais, rompendo muralhas inimigas com chifres de gelo cristalino.';
      moves = [
        { name: 'Investida Chifruda', enc: null, vfx: 'vfx_claw_slash' },
        { name: 'Galope da Nevasca', enc: 'congelamento', vfx: 'vfx_ice_shard' },
        { name: 'Lança de Geada', enc: null, vfx: 'vfx_ice_blast' },
        { name: 'Fúria do Fjord Ártico', enc: 'congelamento', vfx: 'arcane-storm' }
      ];
    } else if (fLower.includes('jarl slime, machado do trovão')) {
      title = 'Jarl Slime do Trovão';
      deckId = 'deck-guerreiros';
      element = 'TROVAO';
      family = 'Clã dos Ronins & Guerreiros';
      biome = 'Fiordes Nórdicos';
      lore = 'Líder supremo dos clãs vikings dos mares nórdicos. Empunha o machado primordial imbuído de raios colossais.';
      moves = [
        { name: 'Golpe de Machado', enc: null, vfx: 'vfx_heavy_slash' },
        { name: 'Fúria de Thor', enc: 'atordoamento', vfx: 'vfx_lightning' },
        { name: 'Chamado da Valquíria', enc: 'cura', vfx: 'vfx_holy_strike' },
        { name: 'Trovão Ancestral de Valhalla', enc: null, vfx: 'arcane-storm' }
      ];
    } else if (fLower.includes('berserker de lodo rompe o gelo')) {
      title = 'Berserker Glacial de Lodo';
      deckId = 'deck-guerreiros';
      element = 'GELO';
      family = 'Clã dos Ronins & Guerreiros';
      biome = 'Fiordes Nórdicos';
      lore = 'Furioso guerreiro nórdico em transe de batalha. Rompe geleiras continentais com a pura força bruta de seus punhos de gelo.';
      moves = [
        { name: 'Fúria Glacial', enc: null, vfx: 'vfx_claw_slash' },
        { name: 'Ruptura da Banquisa', enc: 'congelamento', vfx: 'vfx_ice_blast' },
        { name: 'Grito de Guerra Nórdico', enc: 'atordoamento', vfx: 'vfx_war_cry' },
        { name: 'Impacto do Ragnarök', enc: null, vfx: 'arcane-storm' }
      ];
    } else if (isMythic && isDivineMythic(f, fLower)) {
      deckId = 'deck-divinos';
      family = 'Panteão Celestial';
      biome = 'Monte das Constelações';
      element = fLower.includes('trovao') || fLower.includes('trovão') ? 'TROVAO' :
                fLower.includes('fogo') || fLower.includes('ember') ? 'FOGO' :
                fLower.includes('mare') || fLower.includes('maré') ? 'AGUA' :
                fLower.includes('gelida') || fLower.includes('gélida') ? 'GELO' :
                fLower.includes('nuvens') ? 'VENTO' :
                fLower.includes('raiz') ? 'TERRA' :
                fLower.includes('vazio') ? 'COSMICO' : 'DIVINO';
      lore = `Entidade celestial primordial guardiã do elemento ${element}. Comanda os astros sagrados que moldam o destino de Slimelands.`;
      moves = [
        { name: 'Lampejo Divino', enc: null, vfx: 'vfx_holy_strike' },
        { name: 'Bênção Cósmica', enc: 'cura', vfx: 'vfx_light_burst' },
        { name: 'Cometa Celestial', enc: 'atordoamento', vfx: 'vfx_starfall' },
        { name: 'Vontade Suprema dos Deuses', enc: null, vfx: 'arcane-storm' }
      ];
    } else if (fLower.startsWith('image-gen')) {
      deckId = 'deck-sombras';
      element = 'TREVAS';
      family = 'Cripta das Sombras & Necromancia';
      biome = 'Cemitério Noturno';
      if (fLower.includes('gen-1')) {
        title = 'Bruxo de Ectoplasma';
        lore = 'Bruxo espectral que conjura círculos de fogo verde sob a lua cheia para despertar espíritos da cripta.';
        moves = [
          { name: 'Chama Ectoplásmica', enc: 'queimadura', vfx: 'vfx_purple_fire' },
          { name: 'Gargalhada Macabra', enc: 'atordoamento', vfx: 'vfx_curse_wave' },
          { name: 'Caldeirão Maldito', enc: 'veneno', vfx: 'vfx_toxic_burst' },
          { name: 'Pesadelo da Meia-Noite', enc: null, vfx: 'arcane-storm' }
        ];
      } else if (fLower.includes('gen-2')) {
        title = 'Abóbora Macabra';
        lore = 'Espírito vegetal possuído que cospe labaredas alaranjadas contra qualquer um que invada o cemitério.';
        moves = [
          { name: 'Mordida Espinhosa', enc: null, vfx: 'vfx_claw_slash' },
          { name: 'Chamas da Lanterninha', enc: 'queimadura', vfx: 'vfx_flame_burst' },
          { name: 'Espantalho da Cripta', enc: 'atordoamento', vfx: 'vfx_shadow_grasp' },
          { name: 'Devastação Outonal', enc: null, vfx: 'arcane-storm' }
        ];
      } else if (fLower.includes('gen-3')) {
        title = 'Espectro do Mausoléu';
        lore = 'Alma penada de lodo translúcido que atravessa sepulturas e drena a força vital dos oponentes.';
        moves = [
          { name: 'Toque Cadavérico', enc: 'sangramento', vfx: 'vfx_ghost_strike' },
          { name: 'Voo Assombrado', enc: null, vfx: 'vfx_shadow_dash' },
          { name: 'Lamento dos Mortos', enc: 'atordoamento', vfx: 'vfx_banshee_cry' },
          { name: 'Condenação Eterna', enc: null, vfx: 'arcane-storm' }
        ];
      } else {
        title = 'Ceifador da Meia-Noite';
        lore = 'Entidade máxima da colheita sombria que ceifa as energias residuais de batalha com sua lâmina espectral.';
        moves = [
          { name: 'Corte da Foice Negra', enc: 'sangramento', vfx: 'vfx_scythe_slash' },
          { name: 'Névoa do Purgatório', enc: 'veneno', vfx: 'vfx_miasma' },
          { name: 'Manto do Vazio', enc: null, vfx: 'vfx_dark_barrier' },
          { name: 'Julgamento das Almas', enc: null, vfx: 'arcane-storm' }
        ];
      }
    } else {
      // Elementos e Arquétipos dinâmicos para todas as outras criaturas
      if (fLower.includes('fogo') || fLower.includes('lava') || fLower.includes('vulc') || fLower.includes('carmesim')) {
        element = 'FOGO';
      } else if (fLower.includes('água') || fLower.includes('mar') || fLower.includes('oceano') || fLower.includes('recife') || fLower.includes('concha') || fLower.includes('pérola') || fLower.includes('índigo') || fLower.includes('riacho')) {
        element = 'AGUA';
      } else if (fLower.includes('gelo') || fLower.includes('glacial') || fLower.includes('neve') || fLower.includes('geada')) {
        element = 'GELO';
      } else if (fLower.includes('trovão') || fLower.includes('trovao') || fLower.includes('relâmpago') || fLower.includes('elétrico')) {
        element = 'TROVAO';
      } else if (fLower.includes('vento') || fLower.includes('ar') || fLower.includes('brisa') || fLower.includes('nuvem')) {
        element = 'VENTO';
      } else if (fLower.includes('trevas') || fLower.includes('sombra') || fLower.includes('vampiro') || fLower.includes('múmia') || fLower.includes('ceifador') || fLower.includes('necromante') || fLower.includes('espectro') || fLower.includes('cripta')) {
        element = 'TREVAS';
      } else if (fLower.includes('aurora') || fLower.includes('alvorada') || fLower.includes('luz') || fLower.includes('sol') || fLower.includes('sagrado')) {
        element = 'LUZ';
      } else if (fLower.includes('cósmico') || fLower.includes('cosmico') || fLower.includes('estelar') || fLower.includes('vórtice') || fLower.includes('astros')) {
        element = 'COSMICO';
      } else if (fLower.includes('pudim') || fLower.includes('panqueca') || fLower.includes('morango') || fLower.includes('nigiri') || fLower.includes('doce') || fLower.includes('cupcake') || fLower.includes('pão') || fLower.includes('chocolate')) {
        element = 'GOURMET';
      } else if (fLower.includes('metal') || fLower.includes('ferro') || fLower.includes('cobre') || fLower.includes('basalto') || fLower.includes('granítico') || fLower.includes('prateado')) {
        element = 'METAL';
      } else if (fLower.includes('arcano') || fLower.includes('místico') || fLower.includes('cristal') || fLower.includes('obsidiana') || fLower.includes('quartzo') || fLower.includes('esmeralda') || fLower.includes('âmbar')) {
        element = 'ARCANO';
      } else {
        element = 'TERRA';
      }

      if (fLower.includes('samurai') || fLower.includes('ninja') || fLower.includes('shinobi') || fLower.includes('kabuki') || fLower.includes('arqueiro') || fLower.includes('guerreiro') || fLower.includes('shogun') || fLower.includes('carrasco') || fLower.includes('bardo') || fLower.includes('viking')) {
        deckId = 'deck-guerreiros';
        family = 'Clã dos Ronins & Guerreiros';
        biome = 'Campos de Batalha';
      } else if (fLower.includes('vampiro') || fLower.includes('múmia') || fLower.includes('ceifador') || fLower.includes('sombra') || fLower.includes('necromante') || fLower.includes('espectro') || fLower.includes('bruxo') || fLower.includes('abóbora') || fLower.includes('morcego')) {
        deckId = 'deck-sombras';
        family = 'Cripta das Sombras & Necromancia';
        biome = 'Cripta das Almas';
      } else if (fLower.includes('morango') || fLower.includes('pudim') || fLower.includes('panqueca') || fLower.includes('nigiri') || fLower.includes('doce') || fLower.includes('pão') || fLower.includes('cupcake') || fLower.includes('chiclete') || fLower.includes('jardineiro')) {
        deckId = 'deck-gourmet';
        family = 'Reino Gourmet & Travessos';
        biome = 'Pomar dos Doces';
      } else {
        deckId = 'deck-elementais';
        family = 'Guardiões Elementais & Natureza';
        biome = 'Santuário da Natureza';
      }

      lore = `${cardClass} de ${element}. Reverenciado em Slimelands por suas habilidades elementais de combate.`;
      moves = [
        { name: `Golpe de ${element}`, enc: null, vfx: 'vfx_claw_slash' },
        { name: `Rajada de ${element}`, enc: element === 'FOGO' ? 'queimadura' : element === 'GELO' ? 'congelamento' : element === 'TREVAS' ? 'sangramento' : 'veneno', vfx: 'vfx_flame_burst' },
        { name: `Barreira de ${element}`, enc: 'atordoamento', vfx: 'vfx_shield_bash' },
        { name: `Impacto Máximo de ${element}`, enc: null, vfx: 'arcane-storm' }
      ];
    }

    // Aplicação das Tabelas Oficiais de Balanceamento
    const bal = BALANCE[cardClass] || BALANCE.Comum;
    const pv = bal.pvMin + Math.floor(Math.random() * (bal.pvMax - bal.pvMin));
    const pal = ELEMENT_PALETTES[element] || ELEMENT_PALETTES.TERRA;
    isMythic = isMythic || cardClass === 'Mítica';
    const isSpecialLegendary = specialLegendarySet.has(f);
    const rank = isMythic || isSpecialLegendary ? 'S' : (cardClass === 'Lendária' ? 'A' : bal.ranks[Math.floor(Math.random() * bal.ranks.length)]);
    const id = `slime-mtx-${String(cardIdx).padStart(3, '0')}`;
    cardIdx++;

    const isLegendary = cardClass === 'Lendária';
    const isPremium = isMythic || isLegendary;

    const pills = moves.map((m, mIdx) => {
      const isUlt = mIdx === 3;
      const isFree = isMythic && isUlt;
      const dmgFactor = [0.35, 0.55, 0.80, 1.0][mIdx];
      const dmg = Math.round(bal.dmgMin * dmgFactor + Math.random() * ((bal.dmgMax - bal.dmgMin) * dmgFactor));
      const cost = isFree ? '∞' : String([2, 4, 6, 8][mIdx]);
      const badgeColors = ['#0084FF', '#10B981', '#9333EA', '#DF9A1E'];

      return {
        id: `${id}-p${mIdx + 1}`,
        mode: 'stat',
        badgeValue: cost,
        badgeColor: badgeColors[mIdx],
        mainText: String(dmg),
        attackName: m.name,
        attackType: m.enc ? 'enchantment' : 'damage',
        enchantmentId: m.enc || undefined,
        costResource: 'stamina',
        isChromaticSpecial: isFree,
        isSpecialUltimate: isUlt
      };
    });

    const cardRecord = {
      id,
      title,
      pvText: `PV${pv}`,
      pvNumber: pv,
      elementText: element,
      rankBadgeText: rank,
      cardRank: rank,
      cardClass,
      entityType: 'Criatura',
      imageUrl: `/cards/${f}`,
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
      isPremium,
      prismaticIntensity: isMythic ? 100 : isLegendary ? 75 : 0,
      microGlitterIntensity: isMythic ? 85 : isLegendary ? 70 : 0,
      contourLightSpeed: isMythic ? 1.8 : 1.4,
      parallaxDepth: 100,
      autoShowcaseEnabled: false,
      showcaseDurationSec: 5,
      isRankChromatic: false,
      isPvChromatic: isMythic,
      invertElementCapsule: true,
      showcaseVfx: isMythic ? 'arcane-storm' : 'dimensional-slash',
      showcaseVfxIntensity: 85,
      vfxPlayOnNormalView: false,
      loreHeader: `${title} · ${family}`,
      loreBody: lore,
      magicPrefix: `⚔️ Habilidade de ${element}`,
      magicDescription: `Desencadeia ataques elementais devastadores de ${element} com ${moves[3].name}.`,
      showLoreBox: true,
      loreBoxOpacity: 88,
      loreBoxY: 724,
      pillCount: 4,
      dockAutoFit: true,
      pills,
      showSummonCostPill: true,
      summonCostPill: {
        id: `${id}-cost`,
        mode: 'stat',
        badgeValue: String(bal.stamCost),
        badgeColor: '#DF9A1E',
        mainText: 'STAM',
        isSummonCost: true,
        costResource: 'stamina'
      },
      summonStaminaCost: bal.stamCost,
      deckId,
      family,
      biome,
      collections: ['Matriz de Slimelands', 'Coleção Oficial'],
      recordKind: 'matrix',
      classificationState: 'Classificada',
      editState: 'Pronta para Packs',
      createdAt: new Date().toISOString()
    };

    allCards.push(cardRecord);
  }

  // ---------------------------------------------------------------------------
  // PROCESSAMENTO DAS 91 MAGIAS / ITENS (GRIMÓRIO ARCANO)
  // Distribuição equilibrada: 14 Lendárias, 18 Épicas, 24 Raras, 35 Comuns
  // ---------------------------------------------------------------------------
  let spellIdx = 1;
  for (const f of magicFiles) {
    const srcPath = path.join(magicsDir, f);
    copyIfMissing(srcPath, f);

    let title = f.replace(/\.(png|jpg|jpeg|webp)$/i, '').replace(/[-_]/g, ' ').replace(/\(1\)/g, '').trim();
    title = title.replace(/^\d+[\s_]+/, '').trim();

    if (title.toLowerCase().startsWith('item ')) {
      const num = title.replace(/[^0-9]/g, '');
      const itemNames = [
        'Ampulheta de Areia Solar', 'Frasco de Veneno Real', 'Cálice de Luz Celestial', 'Moeda da Fortuna Esmeralda',
        'Elixir de Seiva Sagrada', 'Anel de Fogo Ígneo', 'Cristal de Gelo Eterno', 'Manto da Noite Silenciosa',
        'Tomo dos Feitiços Antigos', 'Bússola de Vento Celeste', 'Pena de Corvo Mágico', 'Pedra de Sangue Primordial',
        'Talismã de Jade Dracônico', 'Sino das Almas Livres', 'Bolsa de Poeira Estelar', 'Chave das Dimensões',
        'Espelho do Reflexo Místico', 'Escudo do Guardião da Floresta', 'Frasco de Éter Puro', 'Orbe do Trovão Dourado',
        'Tiara de Pétalas Místicas', 'Lente da Visão Profética', 'Insígnia dos Reis Slimes', 'Lágrima da Lua Prateada',
        'Coração de Magma Fervente', 'Pergaminho da Chama Eterna', 'Bracelete da Agilidade Suave', 'Semente do Renascimento',
        'Relíquia do Vazio Noturno', 'Coroa das Estrelas Cadentes'
      ];
      title = itemNames[parseInt(num, 10) - 1] || `Relíquia Arcana ${num}`;
    }

    // Distribuição de raridade para Magias do Grimório (91 total: 3 Míticas (3%), 2 Lendárias Especiais (2%), 5 Lendárias (5%), 9 Épicas (10%), 18 Raras (20%), 54 Comuns (60%))
    let cardClass: keyof typeof BALANCE = 'Comum';
    let cardRank: 'S' | 'A' | 'B' | 'C' | 'D' = 'C';

    if (spellIdx <= 3) {
      cardClass = 'Mítica';
      cardRank = 'S';
    } else if (spellIdx <= 5) {
      cardClass = 'Lendária';
      cardRank = 'S';
    } else if (spellIdx <= 10) {
      cardClass = 'Lendária';
      cardRank = 'A';
    } else if (spellIdx <= 19) {
      cardClass = 'Épica';
      cardRank = 'A';
    } else if (spellIdx <= 37) {
      cardClass = 'Rara';
      cardRank = 'B';
    } else {
      cardClass = 'Comum';
      cardRank = 'C';
    }

    const assignedPassive = PASSIVE_POOL[(spellIdx - 1) % PASSIVE_POOL.length];
    const assignedSkill = ACTIVE_SKILL_POOL[(spellIdx - 1) % ACTIVE_SKILL_POOL.length];
    const isPassive = spellIdx % 2 !== 0;

    const manaCost = Math.max(2, Math.min(6, (spellIdx % 5) + 2));
    const pal = ELEMENT_PALETTES.ARCANO;
    const id = `spell-mtx-${String(spellIdx).padStart(3, '0')}`;
    spellIdx++;

    const isLegendary = cardClass === 'Lendária';

    const cardRecord = {
      id,
      title,
      pvText: `MANA${manaCost}`,
      pvNumber: 0,
      elementText: 'ARCANO',
      rankBadgeText: cardRank,
      cardRank,
      cardClass,
      entityType: 'Magia',
      imageUrl: `/cards/${f}`,
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
      isPremium: isLegendary,
      prismaticIntensity: isLegendary ? 75 : 0,
      microGlitterIntensity: isLegendary ? 70 : 0,
      contourLightSpeed: 1.4,
      parallaxDepth: 100,
      autoShowcaseEnabled: false,
      showcaseDurationSec: 5,
      isRankChromatic: false,
      isPvChromatic: false,
      invertElementCapsule: true,
      showcaseVfx: 'arcane-storm',
      showcaseVfxIntensity: 85,
      vfxPlayOnNormalView: false,
      loreHeader: `${title} · Grimório Arcano`,
      loreBody: isPassive
        ? `Feitiço consagrado na Forja. Concede a passiva de tabuleiro: ${assignedPassive.name}.`
        : `Artefato canalizador ativo. Ativa a habilidade: ${assignedSkill.name}.`,
      magicPrefix: isPassive
        ? `${assignedPassive.triggerText} ${assignedPassive.name}`
        : `⚡ Ativa: ${assignedSkill.name}`,
      magicDescription: isPassive ? assignedPassive.desc : assignedSkill.desc,
      linkedPassiveId: isPassive ? assignedPassive.id : undefined,
      linkedActiveSkillId: !isPassive ? assignedSkill.id : undefined,
      showLoreBox: true,
      loreBoxOpacity: 88,
      loreBoxY: 724,
      pillCount: 1,
      dockAutoFit: true,
      pills: [
        {
          id: `${id}-eff`,
          mode: 'text',
          badgeValue: String(manaCost),
          badgeColor: '#0084FF',
          mainText: 'MANA',
          attackName: title,
          attackType: 'enchantment',
          costResource: 'mana'
        },
        { id: `${id}-p2`, mode: 'stat', badgeValue: '0', badgeColor: '#555', mainText: '0' },
        { id: `${id}-p3`, mode: 'stat', badgeValue: '0', badgeColor: '#555', mainText: '0' },
        { id: `${id}-p4`, mode: 'stat', badgeValue: '0', badgeColor: '#555', mainText: '0' }
      ],
      showSummonCostPill: true,
      summonCostPill: {
        id: `${id}-cost`,
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
      collections: ['Grimório de Slimelands', 'Matriz Oficial'],
      recordKind: 'matrix',
      classificationState: 'Classificada',
      editState: 'Pronta para Packs',
      createdAt: new Date().toISOString()
    };

    allCards.push(cardRecord);
  }

  // Preservação de dados adicionais do snapshot pré-existente
  let existingSnapshot: any = {};
  const snapshotPath = path.resolve(workspaceRoot, 'src/core/matrix_snapshot.json');
  if (fs.existsSync(snapshotPath)) {
    try {
      existingSnapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    } catch {}
  }

  // Construção analítica dos 6 Decks Temáticos com proporção exata:
  // 5% Mítica (1 carta - Deus ou Viking)
  // 15% Lendária (3 cartas)
  // 20% Épica (4 cartas)
  // 25% Rara (5 cartas)
  // 35% Comum (7 cartas)
  // Total = 20 cartas (60% Comum + Rara)
  const constructedThematicDecks = THEMATIC_DECKS.map((def) => {
    let pool = allCards.filter(c => c.deckId === def.id);
    if (pool.length < 20) {
      pool = [...pool, ...allCards.filter(c => c.deckId !== def.id)];
    }

    const m = pool.filter(c => c.cardClass === 'Mítica');
    const l = pool.filter(c => c.cardClass === 'Lendária');
    const e = pool.filter(c => c.cardClass === 'Épica');
    const r = pool.filter(c => c.cardClass === 'Rara');
    const c = pool.filter(c => c.cardClass === 'Comum');

    const fbM = allCards.filter(card => card.cardClass === 'Mítica');
    const fbL = allCards.filter(card => card.cardClass === 'Lendária');
    const fbE = allCards.filter(card => card.cardClass === 'Épica');
    const fbR = allCards.filter(card => card.cardClass === 'Rara');
    const fbC = allCards.filter(card => card.cardClass === 'Comum');

    const selected = [
      ...(m.length >= 1 ? m.slice(0, 1) : fbM.slice(0, 1)),
      ...(l.length >= 3 ? l.slice(0, 3) : [...l, ...fbL].slice(0, 3)),
      ...(e.length >= 4 ? e.slice(0, 4) : [...e, ...fbE].slice(0, 4)),
      ...(r.length >= 5 ? r.slice(0, 5) : [...r, ...fbR].slice(0, 5)),
      ...(c.length >= 7 ? c.slice(0, 7) : [...c, ...fbC].slice(0, 7))
    ];

    return {
      ...def,
      cards: selected.map(card => card.id),
      cardNames: selected.map(card => card.title),
      totalCards: selected.length,
      isActive: def.id === 'deck-divinos',
      isAvailable: true,
      proportions: {
        mythic: '5% (1 carta - Deuses/Vikings)',
        legendary: '15% (3 cartas)',
        epic: '20% (4 cartas)',
        rare: '25% (5 cartas)',
        common: '35% (7 cartas)',
        commonPlusRare: '60% (12 cartas)'
      }
    };
  });

  // 1. Salvar snapshot da Matriz completo
  const snapshot = {
    ...existingSnapshot,
    version: 3,
    updatedAt: new Date().toISOString(),
    cards: allCards,
    decks: constructedThematicDecks,
    activeCardId: allCards[0]?.id || 'slime-mtx-001'
  };

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');

  // Sincronizar decks da loja em store.json
  const storePath = path.resolve(workspaceRoot, 'src/core/store.json');
  if (fs.existsSync(storePath)) {
    try {
      const storeData = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      storeData.decks = constructedThematicDecks.slice(0, 3).map((cd, idx) => ({
        id: cd.id,
        name: cd.name,
        price: 800 + idx * 400,
        currency: 'gold',
        cards: cd.cardNames,
        theme: cd.archetype || 'custom',
        desc: `Deck equilibrado com 20 cartas: 60% Comuns e Raras, 20% Épicas, 15% Lendárias e 5% Míticas (${cd.name.includes('Divino') ? 'Deus Celestial' : 'Viking Ancestral'}).`
      }));
      fs.writeFileSync(storePath, JSON.stringify(storeData, null, 2), 'utf8');
    } catch {}
  }

  // 2. Salvar cards.json no formato da engine de duelos
  const cardsDpsPath = path.resolve(workspaceRoot, 'src/core/cards.json');
  fs.writeFileSync(cardsDpsPath, JSON.stringify(allCards.map(c => ({
    id: c.id,
    name: c.title,
    image: c.imageUrl,
    baseAtk: parseInt(c.pills[2]?.mainText || '500', 10),
    basePv: c.pvNumber || 500,
    manaCost: c.magicManaCost || 4,
    staminaCost: c.summonStaminaCost || 4,
    preferredRarity: c.cardClass === 'Mítica' ? 'mythic' : c.cardClass === 'Lendária' ? 'legendary' : c.cardClass === 'Épica' ? 'epic' : c.cardClass === 'Rara' ? 'rare' : 'common',
    cardRank: c.cardRank,
    classId: c.entityType === 'Magia' ? 'mago' : 'criatura',
    deckId: c.deckId,
    abilityId: c.linkedPassiveId || 'none',
    linkedActiveSkillId: c.linkedActiveSkillId,
    attacks: c.pills.slice(0, 3).map((p: any) => ({
      type: p.attackType || 'damage',
      name: p.attackName || 'Golpe',
      damage: parseInt(p.mainText, 10) || 300,
      cost: parseInt(p.badgeValue, 10) || 2,
      costType: p.costResource || 'stamina',
      enchantment: p.enchantmentId
    })),
    specialAttack: c.pills[3] ? {
      name: c.pills[3].attackName || 'Suprema Colossal',
      damage: parseInt(c.pills[3].mainText, 10) || 1200,
      costType: 'stamina',
      cost: c.pills[3].isChromaticSpecial ? 0 : parseInt(c.pills[3].badgeValue, 10) || 7,
      description: c.magicDescription,
      isFreeChromatic: c.pills[3].isChromaticSpecial
    } : undefined
  })), null, 2), 'utf8');

  // Contagem analítica da distribuição gerada
  const countM = allCards.filter(c => c.cardClass === 'Mítica').length;
  const countL = allCards.filter(c => c.cardClass === 'Lendária').length;
  const countE = allCards.filter(c => c.cardClass === 'Épica').length;
  const countR = allCards.filter(c => c.cardClass === 'Rara').length;
  const countC = allCards.filter(c => c.cardClass === 'Comum').length;
  const total = allCards.length;

  console.log(`[MatrixEngine] Gerado com sucesso: ${total} cartas balanceadas!`);
  console.log(`[MatrixEngine] Distribuição: Míticas: ${countM} (${((countM/total)*100).toFixed(1)}%), Lendárias: ${countL} (${((countL/total)*100).toFixed(1)}%), Épicas: ${countE} (${((countE/total)*100).toFixed(1)}%), Raras: ${countR} (${((countR/total)*100).toFixed(1)}%), Comuns: ${countC} (${((countC/total)*100).toFixed(1)}%)`);
  console.log(`[MatrixEngine] Comuns + Raras = ${countC + countR} (${(((countC + countR)/total)*100).toFixed(1)}%)`);

  return {
    total,
    countM,
    countL,
    countE,
    countR,
    countC,
    pctM: ((countM / total) * 100).toFixed(1) + '%',
    pctL: ((countL / total) * 100).toFixed(1) + '%',
    pctE: ((countE / total) * 100).toFixed(1) + '%',
    pctR: ((countR / total) * 100).toFixed(1) + '%',
    pctC: ((countC / total) * 100).toFixed(1) + '%',
    pctComumRara: (((countC + countR) / total) * 100).toFixed(1) + '%'
  };
}
