/**
 * ============================================================================
 * EXTRA MODULE: FISH AUDIO STUDIO (V1 / S1 / S2.1-PRO-FREE)
 * Central de Criação de Vozes em Português, Auto-Insert de Expressões e Galeria
 * ============================================================================
 */

export type FishAudioModelId = 's1' | 's2.1-pro-free' | 'speech-1.6' | 'speech-1.5';

export interface FishAudioModelMeta {
  id: FishAudioModelId;
  name: string;
  badge: string;
  tagSyntax: 'parens' | 'brackets';
  description: string;
}

export const FISH_AUDIO_MODELS: FishAudioModelMeta[] = [
  {
    id: 's2.1-pro-free',
    name: 'Fish Audio S2.1 Pro Free (Padrão API)',
    badge: 'S2.1-PRO-FREE • [tags]',
    tagSyntax: 'brackets',
    description: 'Modelo gratuito oficial (model: s2.1-pro-free) com suporte a tags de entonação, emoção e efeitos entre colchetes [tag].',
  },
  {
    id: 's1',
    name: 'Fish Audio v1 (OpenAudio S1 Free)',
    badge: 'V1 FREE • (tags)',
    tagSyntax: 'parens',
    description: 'Modelo v1/S1 com suporte nativo às tags de entonação, emoção e efeitos entre parênteses (tag).',
  },
  {
    id: 'speech-1.6',
    name: 'Fish Speech v1.6 Turbo (PT-BR)',
    badge: 'V1.6 • RÁPIDO',
    tagSyntax: 'parens',
    description: 'Versão v1.6 otimizada para baixa latência e fluidez em Português Brasileiro.',
  },
  {
    id: 'speech-1.5',
    name: 'Fish Speech v1.5 Classic',
    badge: 'V1.5 • CLÁSSICO',
    tagSyntax: 'parens',
    description: 'Motor v1.5 clássico estável para narrações e vozes expressivas.',
  },
];

export interface FishPortugueseVoice {
  id: string;
  referenceId: string;
  name: string;
  authorName?: string;
  coverImage?: string;
  sampleAudioUrl?: string;
  taskCount?: number;
  likeCount?: number;
  liked?: boolean;
  isSelf?: boolean;
  isMarked?: boolean;
  isDefaultVoice?: boolean;
  genderLabel?: string;
  ageLabel?: string;
  languageCode?: string;
  customCollection?: string;
  accent: 'pt-BR' | 'pt-PT';
  gender: 'F' | 'M' | 'Criatura';
  category: string;
  isFavorite?: boolean;
  tags?: string[];
  description: string;
  // Acoustic profile for expressive preview & offline v1 synthesizer
  baseHz: number;
  formantShift: number;
  breathiness: number;
  vibratoDepth: number;
  defaultSpeed: number;
}

export function formatFishCountK(n?: number): string {
  const val = Number(n || 0);
  if (val < 1000) return String(val);
  const k = val / 1000;
  const formatted = k.toFixed(1);
  return `${formatted.endsWith('.0') ? formatted.slice(0, -2) : formatted} K`;
}

export const PORTUGUESE_FISH_VOICES: FishPortugueseVoice[] = [
  {
    id: 'pt-br-clara',
    referenceId: '7f92f8afb8ec43bf81429cc1c9199cb1',
    name: 'Clara — Jovem Expressiva',
    authorName: 'Fish Audio Padrão',
    isDefaultVoice: true,
    genderLabel: 'Feminino',
    ageLabel: 'Jovem',
    languageCode: 'PT',
    taskCount: 142300,
    likeCount: 940,
    accent: 'pt-BR',
    gender: 'F',
    category: 'Vozes Padrão',
    tags: ['Feminino', 'Jovem', 'Diálogo', 'Expressiva'],
    description: 'Voz feminina brasileira clara, ótima para risadas, suspiros e diálogos naturais.',
    baseHz: 235,
    formantShift: 1.12,
    breathiness: 0.14,
    vibratoDepth: 0.03,
    defaultSpeed: 1.0,
  },
  {
    id: 'pt-br-lucas',
    referenceId: '934562139e564511a79d51672b6c03e9',
    name: 'Lucas — Narrador Estúdio',
    authorName: 'Fish Audio Padrão',
    isDefaultVoice: true,
    genderLabel: 'Masculino',
    ageLabel: 'Meia Idade',
    languageCode: 'PT',
    taskCount: 198400,
    likeCount: 1250,
    accent: 'pt-BR',
    gender: 'M',
    category: 'Vozes Padrão',
    tags: ['Masculino', 'Meia Idade', 'Narrador', 'Grave'],
    description: 'Voz masculina brasileira encorpada com excelente variação dramática.',
    baseHz: 132,
    formantShift: 0.94,
    breathiness: 0.08,
    vibratoDepth: 0.025,
    defaultSpeed: 1.0,
  },
  {
    id: 'pt-br-bia-anime',
    referenceId: '54e3a85ac9594ffa83264b8a494b901b',
    name: 'Bia — Anime & Criaturinha Fofa',
    authorName: 'Fish Audio Padrão',
    isDefaultVoice: true,
    genderLabel: 'Feminino',
    ageLabel: 'Jovem',
    languageCode: 'PT',
    taskCount: 89200,
    likeCount: 720,
    accent: 'pt-BR',
    gender: 'Criatura',
    category: 'Vozes Padrão',
    tags: ['Feminino', 'Jovem', 'Personagem', 'Anime'],
    description: 'Timbre agudo, fofo e super expressivo para mascotes, slimes e personagens.',
    baseHz: 345,
    formantShift: 1.38,
    breathiness: 0.18,
    vibratoDepth: 0.045,
    defaultSpeed: 1.08,
  },
  {
    id: 'pt-br-mateus',
    referenceId: 'e58b0d7efca34eb38d5c4985e378abcb',
    name: 'Mateus — Dinâmico / Criador',
    authorName: 'Fish Audio Padrão',
    isDefaultVoice: true,
    genderLabel: 'Masculino',
    ageLabel: 'Jovem',
    languageCode: 'PT',
    taskCount: 112600,
    likeCount: 615,
    accent: 'pt-BR',
    gender: 'M',
    category: 'Vozes Padrão',
    tags: ['Masculino', 'Jovem', 'Animada'],
    description: 'Entonação energética ideal para frases empolgadas e humor.',
    baseHz: 155,
    formantShift: 1.0,
    breathiness: 0.1,
    vibratoDepth: 0.03,
    defaultSpeed: 1.06,
  },
  {
    id: 'pt-br-sofia-asmr',
    referenceId: 'a29c19c871e4441cb50d99220e02667a',
    name: 'Sofia — Sussurro & Suave',
    authorName: 'Fish Audio Padrão',
    isDefaultVoice: true,
    genderLabel: 'Feminino',
    ageLabel: 'Jovem',
    languageCode: 'PT',
    taskCount: 74100,
    likeCount: 530,
    accent: 'pt-BR',
    gender: 'F',
    category: 'Vozes Padrão',
    tags: ['Feminino', 'Jovem', 'Calma'],
    description: 'Perfeita para tags [whispering], [soft tone] e falas misteriosas ou calmas.',
    baseHz: 250,
    formantShift: 1.18,
    breathiness: 0.36,
    vibratoDepth: 0.02,
    defaultSpeed: 0.92,
  },
  {
    id: 'pt-br-rafael-drama',
    referenceId: 'd92e5f3f0c2b5d7f9a0b1c2d3e4f5a6b',
    name: 'Rafael — Dramático & Intenso',
    authorName: 'Fish Audio Padrão',
    isDefaultVoice: true,
    genderLabel: 'Masculino',
    ageLabel: 'Idoso',
    languageCode: 'PT',
    taskCount: 95400,
    likeCount: 810,
    accent: 'pt-BR',
    gender: 'M',
    category: 'Vozes Padrão',
    tags: ['Masculino', 'Idoso', 'Grave'],
    description: 'Forte presença em tags [angry], [sad], [shouting] e cenas intensas.',
    baseHz: 118,
    formantShift: 0.88,
    breathiness: 0.12,
    vibratoDepth: 0.035,
    defaultSpeed: 0.96,
  },
];

export interface FishExpressionTag {
  id: string;
  tag: string; // e.g. "(in a hurry tone)"
  rawKey: string; // e.g. "in a hurry tone"
  labelPt: string;
  emoji: string;
  category: 'tone' | 'pause' | 'emotion' | 'vocal';
  description: string;
}

export const FISH_AUDIO_EXPRESSION_TAGS: FishExpressionTag[] = [
  // ==========================================================================
  // 1. TAGS DE ENTONAÇÃO & TOM DE VOZ (TONE MARKERS OFICIAIS FISH AUDIO)
  // ==========================================================================
  {
    id: 'in_a_hurry_tone',
    tag: '(in a hurry tone)',
    rawKey: 'in a hurry tone',
    labelPt: 'Tom Apressado / Urgente',
    emoji: '⏩',
    category: 'tone',
    description: 'Entonação acelerada, urgente e sem tempo a perder',
  },
  {
    id: 'soft_tone',
    tag: '(soft tone)',
    rawKey: 'soft tone',
    labelPt: 'Tom Suave / Meigo',
    emoji: '🪶',
    category: 'tone',
    description: 'Entonação delicada, baixa e acolhedora',
  },
  {
    id: 'whispering',
    tag: '(whispering)',
    rawKey: 'whispering',
    labelPt: 'Sussurrando',
    emoji: '🤫',
    category: 'tone',
    description: 'Entonação sussurrada próxima ao ouvido',
  },
  {
    id: 'shouting',
    tag: '(shouting)',
    rawKey: 'shouting',
    labelPt: 'Gritando / Voz Projetada',
    emoji: '📢',
    category: 'tone',
    description: 'Entonação em volume alto chamando atenção',
  },
  {
    id: 'screaming',
    tag: '(screaming)',
    rawKey: 'screaming',
    labelPt: 'Grito Agudo / Exaltado',
    emoji: '⚡',
    category: 'tone',
    description: 'Entonação de grito intenso ou desespero',
  },
  {
    id: 'gentle_tone',
    tag: '(gentle tone)',
    rawKey: 'gentle tone',
    labelPt: 'Tom Gentil / Doce',
    emoji: '🌸',
    category: 'tone',
    description: 'Entonação carinhosa e amável',
  },
  {
    id: 'calm_tone',
    tag: '(calm)',
    rawKey: 'calm',
    labelPt: 'Tom Calmo / Sereno',
    emoji: '🧘',
    category: 'tone',
    description: 'Entonação tranquila, pausada e controlada',
  },
  {
    id: 'serious_tone',
    tag: '(serious)',
    rawKey: 'serious',
    labelPt: 'Tom Sério / Firme',
    emoji: '🎯',
    category: 'tone',
    description: 'Entonação grave, direta e sem brincadeira',
  },
  {
    id: 'sarcastic_tone',
    tag: '(sarcastic)',
    rawKey: 'sarcastic',
    labelPt: 'Tom Sarcástico / Irônico',
    emoji: '😏',
    category: 'tone',
    description: 'Entonação de deboche ou ironia fina',
  },
  {
    id: 'hesitant_tone',
    tag: '(hesitant)',
    rawKey: 'hesitant',
    labelPt: 'Tom Hesitante / Inseguro',
    emoji: '🫤',
    category: 'tone',
    description: 'Entonação falhada, indecisa e com receio',
  },
  {
    id: 'dramatic_tone',
    tag: '(dramatic)',
    rawKey: 'dramatic',
    labelPt: 'Tom Dramático / Teatral',
    emoji: '🎭',
    category: 'tone',
    description: 'Entonação intensa de cinema ou trailer',
  },
  {
    id: 'authoritative_tone',
    tag: '(authoritative)',
    rawKey: 'authoritative',
    labelPt: 'Tom Autoritário / Líder',
    emoji: '👑',
    category: 'tone',
    description: 'Entonação de comando, firmeza e liderança',
  },
  {
    id: 'mysterious_tone',
    tag: '(mysterious)',
    rawKey: 'mysterious',
    labelPt: 'Tom Misterioso / Sombrio',
    emoji: '🌑',
    category: 'tone',
    description: 'Entonação enigmática e baixa',
  },
  {
    id: 'playful_tone',
    tag: '(playful)',
    rawKey: 'playful',
    labelPt: 'Tom Brincalhão / Provocante',
    emoji: '😜',
    category: 'tone',
    description: 'Entonação leve, divertida e descontraída',
  },

  // ==========================================================================
  // 2. TAGS DE PAUSA, RESPIRAÇÃO & CADÊNCIA (PROSODY & PAUSE MARKERS)
  // ==========================================================================
  {
    id: 'break',
    tag: '(break)',
    rawKey: 'break',
    labelPt: 'Pausa Curta',
    emoji: '⏸️',
    category: 'pause',
    description: 'Insere uma pausa breve na cadência da frase',
  },
  {
    id: 'long_break',
    tag: '(long-break)',
    rawKey: 'long-break',
    labelPt: 'Pausa Longa Dramática',
    emoji: '⏹️',
    category: 'pause',
    description: 'Insere um silêncio maior antes de continuar a fala',
  },
  {
    id: 'breath',
    tag: '(breath)',
    rawKey: 'breath',
    labelPt: 'Respiração / Tomada de Ar',
    emoji: '🌬️',
    category: 'pause',
    description: 'Insere som natural de puxar o fôlego entre frases',
  },

  // ==========================================================================
  // 3. TAGS DE EMOÇÕES (24 EMOTION MARKERS OFICIAIS FISH AUDIO)
  // ==========================================================================
  {
    id: 'excited',
    tag: '(excited)',
    rawKey: 'excited',
    labelPt: 'Empolgado',
    emoji: '🤩',
    category: 'emotion',
    description: 'Energia alta e ritmo vibrante',
  },
  {
    id: 'joyful',
    tag: '(joyful)',
    rawKey: 'joyful',
    labelPt: 'Alegre',
    emoji: '😄',
    category: 'emotion',
    description: 'Sorriso na voz e felicidade contagiante',
  },
  {
    id: 'delighted',
    tag: '(delighted)',
    rawKey: 'delighted',
    labelPt: 'Encantado / Maravilhado',
    emoji: '✨',
    category: 'emotion',
    description: 'Deslumbramento e prazer genuíno',
  },
  {
    id: 'satisfied',
    tag: '(satisfied)',
    rawKey: 'satisfied',
    labelPt: 'Satisfeito / Realizado',
    emoji: '😌',
    category: 'emotion',
    description: 'Sensação de dever cumprido e aprovação',
  },
  {
    id: 'sad',
    tag: '(sad)',
    rawKey: 'sad',
    labelPt: 'Triste',
    emoji: '😔',
    category: 'emotion',
    description: 'Tom melancólico, lento e cabisbaixo',
  },
  {
    id: 'depressed',
    tag: '(depressed)',
    rawKey: 'depressed',
    labelPt: 'Deprimido / Desanimado',
    emoji: '😞',
    category: 'emotion',
    description: 'Voz baixa, sem energia e profundamente abatida',
  },
  {
    id: 'upset',
    tag: '(upset)',
    rawKey: 'upset',
    labelPt: 'Chateado / Magoado',
    emoji: '😕',
    category: 'emotion',
    description: 'Ressentimento ou decepção na fala',
  },
  {
    id: 'angry',
    tag: '(angry)',
    rawKey: 'angry',
    labelPt: 'Bravo / Irritado',
    emoji: '😠',
    category: 'emotion',
    description: 'Tom firme, irritado e agressivo',
  },
  {
    id: 'frustrated',
    tag: '(frustrated)',
    rawKey: 'frustrated',
    labelPt: 'Frustrado / Impaciente',
    emoji: '😤',
    category: 'emotion',
    description: 'Esgotamento e irritação com algo que deu errado',
  },
  {
    id: 'surprised',
    tag: '(surprised)',
    rawKey: 'surprised',
    labelPt: 'Surpreso / Chocado',
    emoji: '😲',
    category: 'emotion',
    description: 'Choque ou espanto repentino',
  },
  {
    id: 'scared',
    tag: '(scared)',
    rawKey: 'scared',
    labelPt: 'Assustado / Com Medo',
    emoji: '😨',
    category: 'emotion',
    description: 'Tremor na voz por medo ou perigo',
  },
  {
    id: 'worried',
    tag: '(worried)',
    rawKey: 'worried',
    labelPt: 'Preocupado / Aflito',
    emoji: '😟',
    category: 'emotion',
    description: 'Inquietação e apreensão na voz',
  },
  {
    id: 'nervous',
    tag: '(nervous)',
    rawKey: 'nervous',
    labelPt: 'Nervoso / Ansioso',
    emoji: '😰',
    category: 'emotion',
    description: 'Tensão e nervosismo na fala',
  },
  {
    id: 'curious',
    tag: '(curious)',
    rawKey: 'curious',
    labelPt: 'Curioso',
    emoji: '🧐',
    category: 'emotion',
    description: 'Inflexão investigativa para perguntas',
  },
  {
    id: 'interested',
    tag: '(interested)',
    rawKey: 'interested',
    labelPt: 'Interessado / Atento',
    emoji: '👀',
    category: 'emotion',
    description: 'Engajamento e atenção genuína',
  },
  {
    id: 'confused',
    tag: '(confused)',
    rawKey: 'confused',
    labelPt: 'Confuso / Em Dúvida',
    emoji: '🤔',
    category: 'emotion',
    description: 'Tom de estranhamento ou dúvida',
  },
  {
    id: 'confident',
    tag: '(confident)',
    rawKey: 'confident',
    labelPt: 'Confiante / Seguro',
    emoji: '😎',
    category: 'emotion',
    description: 'Convicção e segurança total',
  },
  {
    id: 'proud',
    tag: '(proud)',
    rawKey: 'proud',
    labelPt: 'Orgulhoso',
    emoji: '🦁',
    category: 'emotion',
    description: 'Peito cheio e orgulho da conquista',
  },
  {
    id: 'relaxed',
    tag: '(relaxed)',
    rawKey: 'relaxed',
    labelPt: 'Relaxado / Descontraído',
    emoji: '🌴',
    category: 'emotion',
    description: 'Paz e leveza na fala',
  },
  {
    id: 'empathetic',
    tag: '(empathetic)',
    rawKey: 'empathetic',
    labelPt: 'Empático / Compreensivo',
    emoji: '🤝',
    category: 'emotion',
    description: 'Acolhimento e compaixão pelo ouvinte',
  },
  {
    id: 'moved',
    tag: '(moved)',
    rawKey: 'moved',
    labelPt: 'Comovido / Emocionado',
    emoji: '🥹',
    category: 'emotion',
    description: 'Voz tocada de emoção e ternura',
  },
  {
    id: 'grateful',
    tag: '(grateful)',
    rawKey: 'grateful',
    labelPt: 'Grato / Agradecido',
    emoji: '🙏',
    category: 'emotion',
    description: 'Gratidão sincera na entonação',
  },
  {
    id: 'embarrassed',
    tag: '(embarrassed)',
    rawKey: 'embarrassed',
    labelPt: 'Encabulado / Tímido',
    emoji: '😳',
    category: 'emotion',
    description: 'Vergonha e timidez ao falar',
  },
  {
    id: 'disgusted',
    tag: '(disgusted)',
    rawKey: 'disgusted',
    labelPt: 'Enojado / Repulsa',
    emoji: '🤢',
    category: 'emotion',
    description: 'Aversão ou nojo explícito na voz',
  },

  // ==========================================================================
  // 4. TAGS DE EFEITOS VOCAIS / SONS PARALINGUÍSTICOS (AUDIO EFFECTS)
  // ==========================================================================
  {
    id: 'laughing',
    tag: '(laughing)',
    rawKey: 'laughing',
    labelPt: 'Rindo',
    emoji: '😂',
    category: 'vocal',
    description: 'Adiciona risada aberta na fala',
  },
  {
    id: 'chuckling',
    tag: '(chuckling)',
    rawKey: 'chuckling',
    labelPt: 'Risadinha',
    emoji: '🤭',
    category: 'vocal',
    description: 'Risada curta e baixa',
  },
  {
    id: 'sighing',
    tag: '(sighing)',
    rawKey: 'sighing',
    labelPt: 'Suspiro',
    emoji: '😮‍💨',
    category: 'vocal',
    description: 'Suspiro audível de alívio ou cansaço',
  },
  {
    id: 'sobbing',
    tag: '(sobbing)',
    rawKey: 'sobbing',
    labelPt: 'Soluçando de Choro',
    emoji: '😢',
    category: 'vocal',
    description: 'Voz embargada com soluços',
  },
  {
    id: 'crying_loudly',
    tag: '(crying loudly)',
    rawKey: 'crying loudly',
    labelPt: 'Chorando Alto',
    emoji: '😭',
    category: 'vocal',
    description: 'Choro intenso e dramático',
  },
  {
    id: 'panting',
    tag: '(panting)',
    rawKey: 'panting',
    labelPt: 'Ofegante',
    emoji: '🥵',
    category: 'vocal',
    description: 'Respiração rápida de cansaço',
  },
  {
    id: 'groaning',
    tag: '(groaning)',
    rawKey: 'groaning',
    labelPt: 'Grunhindo / Resmungando',
    emoji: '😩',
    category: 'vocal',
    description: 'Grunhido de esforço ou dor',
  },
  {
    id: 'yawning',
    tag: '(yawning)',
    rawKey: 'yawning',
    labelPt: 'Bocejando',
    emoji: '🥱',
    category: 'vocal',
    description: 'Fala acompanhada de bocejo',
  },
  {
    id: 'gasping',
    tag: '(gasping)',
    rawKey: 'gasping',
    labelPt: 'Arfando de Susto',
    emoji: '😱',
    category: 'vocal',
    description: 'Puxada brusca de ar por choque',
  },
  {
    id: 'clearing_throat',
    tag: '(clearing throat)',
    rawKey: 'clearing throat',
    labelPt: 'Pigarreando (Ahem)',
    emoji: '🗣️',
    category: 'vocal',
    description: 'Limpa a garganta antes de falar',
  },
  {
    id: 'snorting',
    tag: '(snorting)',
    rawKey: 'snorting',
    labelPt: 'Bufando / Riso Nasal',
    emoji: '😤',
    category: 'vocal',
    description: 'Som nasal de deboche ou impaciência',
  },
];

export const SAMPLE_PORTUGUESE_PROMPTS: Array<{ label: string; text: string }> = [];

/**
 * Formats a raw tag key according to the model syntax: `(in a hurry tone)` vs `[in a hurry tone]`
 */
export function formatFishTag(rawKey: string, syntax: 'parens' | 'brackets' = 'brackets'): string {
  return syntax === 'brackets' ? `[${rawKey}]` : `(${rawKey})`;
}

/**
 * Converts existing tags in text when the user switches between a `[tag]` model (S2.1) and a `(tag)` model (S1)
 */
export function convertTextTagsSyntax(text: string, syntax: 'parens' | 'brackets'): string {
  if (!text) return '';
  const knownKeys = FISH_AUDIO_EXPRESSION_TAGS.map((t) =>
    t.rawKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');
  const regex = new RegExp(`(?:\\((${knownKeys})\\)|\\[(${knownKeys})\\])`, 'gi');
  return text.replace(regex, (_match, g1, g2) => {
    const key = (g1 || g2 || '').toLowerCase();
    return formatFishTag(key, syntax);
  });
}

/**
 * Removes all Fish Audio expression tags from a string
 */
export function stripFishAudioTags(text: string): string {
  const knownKeys = FISH_AUDIO_EXPRESSION_TAGS.map((t) =>
    t.rawKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|');
  const regex = new RegExp(`(\\((?:${knownKeys})\\)|\\[(?:${knownKeys})\\])\\s*`, 'gi');
  return text.replace(regex, '').replace(/\s{2,}/g, ' ').trim();
}

/**
 * Extracts all expression tags currently present in the text
 */
export function extractTagsFromText(text: string): string[] {
  const found: string[] = [];
  const knownKeys = FISH_AUDIO_EXPRESSION_TAGS.map((t) => t.rawKey);
  const regex = /(?:\(([^)]+)\)|\[([^\]]+)\])/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const raw = (match[1] || match[2] || '').trim().toLowerCase();
    if (knownKeys.includes(raw) && !found.includes(`[${raw}]`)) {
      found.push(`[${raw}]`);
    }
  }
  return found;
}

/**
 * ============================================================================
 * SISTEMA DE AUTO-INSERT DE TAGS AO QUE FOI DIGITADO
 * Analisa entonação, pontuação, ritmo e emoção de cada oração digitada
 * e insere tags de Entonação, Pausa, Emoção e Efeitos do Fish Audio.
 * ============================================================================
 */
export function autoInsertFishAudioTags(
  inputText: string,
  syntax: 'parens' | 'brackets' = 'brackets'
): string {
  const cleanText = stripFishAudioTags(inputText);
  if (!cleanText) return '';

  const clauses = cleanText
    .split(/(?<=[.!?…]+|\.\.\.)\s+/)
    .map((c) => c.trim())
    .filter(Boolean);

  const taggedClauses = clauses.map((clause, idx) => {
    const lower = clause.toLowerCase();
    const chosenTags: string[] = [];

    // 1. Detect Intonation / Tone Markers first!
    if (/\b(rápido|depressa|corre|urgente|atrasad\w*|sem tempo|agora mesmo|já!)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('in a hurry tone', syntax));
    } else if (/\b(psiu|shh+|silêncio|segredo|baixinho|sussurr\w*|ninguém ouvir)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('whispering', syntax));
    } else if (/\b(suave|calma|devagar|meig\w*|tranquil\w*|dorme|paz)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('soft tone', syntax));
    } else if (/\b(socorro!|aaaaa\w*|ai meu deus!)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('screaming', syntax));
    } else if (clause === clause.toUpperCase() && clause.length > 5 && /[A-ZÀ-Ú]/.test(clause)) {
      chosenTags.push(formatFishTag('shouting', syntax));
    } else if (/\b(aham|sei\.\.\.|claro que sim|conta outra|até parece)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('sarcastic', syntax));
    } else if (/\b(não sei se|talvez\.\.\.|é que\.\.\.|hmm)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('hesitant', syntax));
    } else if (/\b(atenção|escutem|ordem|proibido|jamais)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('authoritative', syntax));
    } else if (/\b(mistério|sombra\w*|ocult\w*|diz a lenda)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('mysterious', syntax));
    }

    // 2. Detect Vocal Effects (Laughs / Sighs / Crying)
    if (/\b(haha\w*|hehe\w*|hihi\w*|kkk\w*|rsrs\w*|risos|engraçad\w*)\b/i.test(lower)) {
      if (/\b(hehe\w*|hihi\w*|rs\b|rsrs)\b/i.test(lower)) {
        chosenTags.push(formatFishTag('chuckling', syntax));
      } else {
        chosenTags.push(formatFishTag('laughing', syntax));
      }
    } else if (/\b(ufa|ai ai|aff+|uff+|suspir\w*|cansad\w*|exausto)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('sighing', syntax));
    } else if (/\b(buá\w*|sniff|chorand\w*|chorar|lágrima\w*|soluç\w*)\b/i.test(lower)) {
      chosenTags.push(formatFishTag('sobbing', syntax));
    }

    // 3. Detect Emotions
    if (chosenTags.length === 0) {
      if (/\b(triste\w*|infelizmente|pena|saudade\w*|sozinh\w*|desculp\w*)\b/i.test(lower)) {
        chosenTags.push(formatFishTag('sad', syntax));
      } else if (/\b(droga|raiva|ódio|maldit\w*|irritad\w*|chega!|pare!|absurdo)\b/i.test(lower)) {
        chosenTags.push(formatFishTag('angry', syntax));
      } else if (/\b(medo|assustad\w*|perigo|cuidado|monstro)\b/i.test(lower)) {
        chosenTags.push(formatFishTag('scared', syntax));
      } else if (
        /\?!|!\?/.test(clause) ||
        /\b(o quê|não acredito|sério\?|mentira!|uau|nossa|impossível)\b/i.test(lower)
      ) {
        chosenTags.push(formatFishTag('surprised', syntax));
      } else if (
        /\b(eba|oba|uhul|incrível|maravilhos\w*|demais|perfeito|vitória|feliz)\b/i.test(lower) ||
        (clause.endsWith('!') && clause.length > 6)
      ) {
        chosenTags.push(formatFishTag('excited', syntax));
      } else if (clause.endsWith('?')) {
        chosenTags.push(formatFishTag('curious', syntax));
      } else if (/(\.\.\.|…)$/.test(clause)) {
        chosenTags.push(formatFishTag('soft tone', syntax));
      } else {
        const cycle: string[] = ['calm', 'confident', 'gentle tone', 'interested'];
        chosenTags.push(formatFishTag(cycle[idx % cycle.length], syntax));
      }
    }

    return `${chosenTags.slice(0, 2).join(' ')} ${clause}`;
  });

  return taggedClauses.join(' ');
}

/**
 * ============================================================================
 * SINTETIZADOR EXPRESSIVO LOCAL (FALLBACK WAV 44.1kHz PARA V1 EXPRESSION TAGS)
 * Gera um arquivo .WAV real, reproduzível e baixável na galeria, interpretando
 * acústica de cada tag do Fish Audio: (laughing), (sighing), (whispering), etc.
 * ============================================================================
 */
interface ParsedSegment {
  tags: string[];
  text: string;
}

function parseTaggedSegments(taggedText: string): ParsedSegment[] {
  const tokens = taggedText.split(/(\([^)]+\)|\[[^\]]+\])/g).filter(Boolean);
  const segments: ParsedSegment[] = [];
  let currentTags: string[] = [];

  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed) continue;
    if ((trimmed.startsWith('(') && trimmed.endsWith(')')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const raw = trimmed.slice(1, -1).trim().toLowerCase();
      currentTags.push(raw);
    } else {
      segments.push({
        tags: currentTags.length > 0 ? [...currentTags] : ['relaxed'],
        text: trimmed,
      });
      currentTags = [];
    }
  }

  if (segments.length === 0 && taggedText.trim()) {
    segments.push({ tags: ['relaxed'], text: taggedText.trim() });
  }
  return segments;
}

function encodeMonoWavToDataUrl(samples: Float32Array, sampleRate: number): string {
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

export function synthesizeExpressiveFishWav(
  taggedText: string,
  voice: FishPortugueseVoice,
  speed: number = 1.0
): { audioDataUrl: string; durationSec: number } {
  const sampleRate = 24000;
  const segments = parseTaggedSegments(taggedText);
  const chunks: Float32Array[] = [];
  const effectiveSpeed = Math.max(0.65, Math.min(1.5, speed * voice.defaultSpeed));

  for (const seg of segments) {
    const primaryTag = seg.tags[0] || 'relaxed';

    // 1. Render Acoustic Vocal Paralinguistic Prefix for vocal tags!
    if (primaryTag === 'laughing' || primaryTag === 'chuckling') {
      const pulses = primaryTag === 'laughing' ? 4 : 3;
      const pulseDur = primaryTag === 'laughing' ? 0.11 : 0.085;
      const laughLen = Math.floor(sampleRate * (pulses * pulseDur + 0.08));
      const buf = new Float32Array(laughLen);
      let phase = 0;
      for (let i = 0; i < laughLen; i++) {
        const t = i / sampleRate;
        const pulseIdx = Math.floor(t / pulseDur);
        const pulseLocal = (t % pulseDur) / pulseDur;
        if (pulseIdx < pulses && pulseLocal < 0.72) {
          const env = Math.sin((pulseLocal / 0.72) * Math.PI);
          const f0 = voice.baseHz * (primaryTag === 'laughing' ? 1.45 : 1.32) * (1 - pulseIdx * 0.05) * (1 + 0.18 * pulseLocal);
          phase += (2 * Math.PI * f0) / sampleRate;
          const harm =
            Math.sin(phase) * 0.55 +
            Math.sin(phase * 2) * 0.28 +
            Math.sin(phase * 3) * 0.14 +
            (Math.random() * 2 - 1) * 0.12;
          buf[i] = harm * env * 0.65;
        }
      }
      chunks.push(buf);
    } else if (primaryTag === 'sighing' || primaryTag === 'yawning' || primaryTag === 'panting') {
      const dur = primaryTag === 'panting' ? 0.28 : 0.42;
      const sighLen = Math.floor(sampleRate * dur);
      const buf = new Float32Array(sighLen);
      let phase = 0;
      let lp = 0;
      for (let i = 0; i < sighLen; i++) {
        const t = i / sighLen;
        const env = Math.sin(t * Math.PI) * (1 - 0.35 * t);
        const f0 = voice.baseHz * (1.12 - 0.28 * t);
        phase += (2 * Math.PI * f0) / sampleRate;
        const noise = Math.random() * 2 - 1;
        lp = lp * 0.86 + noise * 0.14;
        buf[i] = (Math.sin(phase) * 0.28 + lp * 0.72) * env * 0.55;
      }
      chunks.push(buf);
    } else if (primaryTag === 'sobbing' || primaryTag === 'crying loudly') {
      const sobLen = Math.floor(sampleRate * 0.34);
      const buf = new Float32Array(sobLen);
      let phase = 0;
      for (let i = 0; i < sobLen; i++) {
        const t = i / sampleRate;
        const norm = i / sobLen;
        const env = Math.sin(norm * Math.PI) * (0.65 + 0.35 * Math.sin(2 * Math.PI * 14 * t));
        const f0 = voice.baseHz * 1.25 * (1 - 0.22 * norm + 0.04 * Math.sin(2 * Math.PI * 9 * t));
        phase += (2 * Math.PI * f0) / sampleRate;
        buf[i] = (Math.sin(phase) * 0.6 + Math.sin(phase * 2) * 0.25) * env * 0.55;
      }
      chunks.push(buf);
    }

    // 2. Render Syllabic Portuguese Prosody for the segment words
    const cleanWords = seg.text
      .replace(/[^\p{L}\p{N}\s!?.,]/gu, '')
      .split(/\s+/)
      .filter(Boolean);

    // Emotion prosody modifiers
    let pitchMult = 1.0;
    let whisperMix = voice.breathiness;
    let vibratoHz = 5.5;
    let vibratoAmt = voice.vibratoDepth;
    let tempoMult = effectiveSpeed;

    switch (primaryTag) {
      case 'excited':
      case 'joyful':
        pitchMult = 1.22;
        tempoMult *= 1.15;
        vibratoAmt *= 1.3;
        break;
      case 'surprised':
        pitchMult = 1.32;
        tempoMult *= 1.18;
        break;
      case 'sad':
      case 'sobbing':
      case 'crying loudly':
        pitchMult = 0.86;
        tempoMult *= 0.82;
        vibratoHz = 7.5;
        vibratoAmt = 0.055;
        break;
      case 'angry':
      case 'shouting':
      case 'groaning':
        pitchMult = primaryTag === 'shouting' ? 1.28 : 0.92;
        tempoMult *= 1.08;
        break;
      case 'whispering':
        whisperMix = 0.78;
        pitchMult = 1.04;
        tempoMult *= 0.9;
        break;
      case 'curious':
      case 'confused':
        pitchMult = 1.12;
        break;
      case 'scared':
      case 'nervous':
        pitchMult = 1.18;
        vibratoHz = 9.0;
        vibratoAmt = 0.06;
        break;
    }

    const isQuestion = seg.text.trim().endsWith('?');
    const isExclam = seg.text.trim().endsWith('!');

    for (let wIdx = 0; wIdx < cleanWords.length; wIdx++) {
      const word = cleanWords[wIdx];
      // Split word into approximate Portuguese syllables
      const syllables = word.match(/[bcdfghjklmnpqrstvwxyzç]*[aeiouáéíóúâêôãõü]+(?:[nsrml])?/gi) || [word];
      const wordProgress = wIdx / Math.max(1, cleanWords.length - 1);

      for (let sIdx = 0; sIdx < syllables.length; sIdx++) {
        const syl = syllables[sIdx].toLowerCase();
        const isStressed = sIdx === Math.max(0, syllables.length - 2) || /[áéíóúâêôãõ]/.test(syl);
        const sylDur = ((isStressed ? 0.13 : 0.095) / tempoMult) * (0.92 + Math.random() * 0.15);
        const sylSamples = Math.floor(sampleRate * sylDur);
        const buf = new Float32Array(sylSamples);

        // Determine Portuguese vowel formants (F1, F2)
        let f1 = 520;
        let f2 = 1500;
        if (/[ií]/.test(syl)) {
          f1 = 300;
          f2 = 2250;
        } else if (/[eéê]/.test(syl)) {
          f1 = 460;
          f2 = 1920;
        } else if (/[uú]/.test(syl)) {
          f1 = 330;
          f2 = 880;
        } else if (/[oóôõ]/.test(syl)) {
          f1 = 480;
          f2 = 1020;
        } else if (/[ã]/.test(syl)) {
          f1 = 620;
          f2 = 1380;
        } else {
          // 'a'
          f1 = 720;
          f2 = 1320;
        }

        f1 *= voice.formantShift;
        f2 *= voice.formantShift;

        // Sentence intonation contour
        let contour = 1.0 - 0.12 * wordProgress;
        if (isQuestion && wIdx === cleanWords.length - 1) {
          contour = 1.0 + 0.28 * ((sIdx + 1) / syllables.length);
        } else if (isExclam) {
          contour = 1.12 - 0.08 * wordProgress;
        }
        if (isStressed) contour *= 1.07;

        let p0 = 0;
        let p1 = 0;
        let p2 = 0;
        let noiseLp = 0;

        for (let i = 0; i < sylSamples; i++) {
          const t = i / sampleRate;
          const norm = i / sylSamples;
          const env =
            norm < 0.15
              ? norm / 0.15
              : norm > 0.78
              ? (1 - norm) / 0.22
              : 1.0;

          const vib = 1 + vibratoAmt * Math.sin(2 * Math.PI * vibratoHz * t);
          const f0 = voice.baseHz * pitchMult * contour * vib;

          p0 += (2 * Math.PI * f0) / sampleRate;
          p1 += (2 * Math.PI * f1) / sampleRate;
          p2 += (2 * Math.PI * f2) / sampleRate;

          // Glottal source + formant resonance
          const glottal =
            Math.sin(p0) * 0.52 +
            Math.sin(p0 * 2) * 0.26 +
            Math.sin(p0 * 3) * 0.12 +
            Math.sin(p1) * 0.22 +
            Math.sin(p2) * 0.11;

          const white = Math.random() * 2 - 1;
          noiseLp = noiseLp * 0.78 + white * 0.22;

          let sample = glottal * (1 - whisperMix * 0.75) + noiseLp * whisperMix * 0.85;
          if (primaryTag === 'angry' || primaryTag === 'shouting') {
            sample = Math.tanh(sample * 1.9) * 0.8;
          }

          buf[i] = sample * env * 0.62;
        }
        chunks.push(buf);
      }

      // Micro-pause between words
      chunks.push(new Float32Array(Math.floor(sampleRate * (0.025 / tempoMult))));
    }

    // Pause between clauses
    chunks.push(new Float32Array(Math.floor(sampleRate * 0.14)));
  }

  const totalLen = chunks.reduce((acc, c) => acc + c.length, 0) || Math.floor(sampleRate * 0.5);
  const merged = new Float32Array(totalLen);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.length;
  }

  const durationSec = Number((totalLen / sampleRate).toFixed(2));
  const audioDataUrl = encodeMonoWavToDataUrl(merged, sampleRate);
  return { audioDataUrl, durationSec };
}

/**
 * Triggers optional browser Portuguese TTS preview synchronized with the expression tags
 */
export function speakPortugueseWithExpressionsPreview(
  taggedText: string,
  voice: FishPortugueseVoice,
  speed: number = 1.0
): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const cleanText = stripFishAudioTags(taggedText);
    if (!cleanText) return;

    const tags = extractTagsFromText(taggedText);
    const utter = new SpeechSynthesisUtterance(cleanText);
    utter.lang = voice.accent;

    const voices = window.speechSynthesis.getVoices();
    const ptVoices = voices.filter((v) => v.lang.toLowerCase().startsWith('pt'));
    if (ptVoices.length > 0) {
      const wantFemale = voice.gender === 'F' || voice.gender === 'Criatura';
      const matched =
        ptVoices.find((v) =>
          wantFemale
            ? /maria|francisca|luciana|fernanda|heloisa|thalita|vitória|ines|female/i.test(v.name)
            : /daniel|antonio|ricardo|felipe|tiago|male/i.test(v.name)
        ) || ptVoices[0];
      utter.voice = matched;
    }

    let pitch = voice.gender === 'Criatura' ? 1.65 : voice.gender === 'F' ? 1.18 : 0.92;
    let rate = speed * voice.defaultSpeed;

    if (tags.includes('(excited)') || tags.includes('(joyful)') || tags.includes('(laughing)')) {
      pitch *= 1.15;
      rate *= 1.1;
    } else if (tags.includes('(sad)') || tags.includes('(sobbing)')) {
      pitch *= 0.85;
      rate *= 0.85;
    } else if (tags.includes('(whispering)')) {
      utter.volume = 0.55;
      rate *= 0.9;
    }

    utter.pitch = Math.max(0.5, Math.min(2.0, pitch));
    utter.rate = Math.max(0.6, Math.min(1.6, rate));
    window.speechSynthesis.speak(utter);
  } catch {
    // Ignore speechSynthesis errors
  }
}

export interface FishGeneratedAudioItem {
  id: string;
  batchLabel?: string;
  category?: string;
  customTags?: string[];
  createdAt: number;
  taggedText: string;
  voiceId: string;
  voiceName: string;
  voiceAccent: 'pt-BR' | 'pt-PT';
  modelId: FishAudioModelId;
  speed: number;
  tagsUsed: string[];
  audioDataUrl: string;
  durationSec: number;
  source: 'fish-api' | 'fish-v1-synth';
}

export interface FishCsvBatchRow {
  rowNumber: number;
  label: string;
  rawText: string;
  taggedText: string;
  speed?: number;
}

/**
 * Ready-to-copy prompt and CSV specification for the user's external AI Agent
 * so it can generate massive voice scripts with Fish Audio v1 expression tags.
 */
export const AGENT_CSV_AND_TAGS_SPECIFICATION = `=== INSTRUÇÕES PARA O AGENTE GERADOR DE FALAS (FISH AUDIO S2.1 / V1 CSV) ===

Você deve gerar uma planilha em formato CSV (separado por ponto-e-vírgula ";") para importação em massa no Fish Audio Studio.

1. ESTRUTURA DAS COLUNAS DO CSV:
id;texto_com_tags;velocidade
- "id": Nome curto ou código do arquivo de áudio (ex: fala_01, npc_alerta_02)
- "texto_com_tags": A frase em Português já contendo as tags de entonação, pausa, emoção e efeitos do Fish Audio antes de cada oração.
- "velocidade" (opcional): Número entre 0.8 e 1.3 (padrão 1.0).

2. DICIONÁRIO COMPLETO DE TAGS DO FISH AUDIO (USE ENTRE COLCHETES [tag] PARA S2.1-PRO-FREE OU PARÊNTESES (tag) PARA S1):

A) TAGS DE ENTONAÇÃO & TOM DE VOZ (TONE MARKERS):
  [in a hurry tone] -> Tom apressado, urgente e falando rápido
  [soft tone]       -> Tom suave, meigo e delicado
  [whispering]      -> Sussurrando baixinho / segredo ao pé do ouvido
  [shouting]        -> Gritando / voz projetada em volume alto
  [screaming]       -> Grito agudo / exaltado ou desesperado
  [gentle tone]     -> Tom gentil, doce e acolhedor
  [calm]            -> Tom calmo, sereno e controlado
  [serious]         -> Tom sério, grave e direto
  [sarcastic]       -> Tom sarcástico, irônico ou debochado
  [hesitant]        -> Tom hesitante, inseguro e pausado
  [dramatic]        -> Tom dramático e teatral
  [authoritative]   -> Tom autoritário, firme e de comando
  [mysterious]      -> Tom misterioso e enigmático
  [playful]         -> Tom brincalhão e divertido

B) TAGS DE PAUSA, RITMO & RESPIRAÇÃO (PAUSE MARKERS):
  [break]           -> Pausa curta na cadência da frase
  [long-break]      -> Pausa longa dramática antes de continuar
  [breath]          -> Puxada de ar / respiração audível

C) TAGS DE EMOÇÕES (24 EMOTION MARKERS):
  [excited]         -> Empolgado e vibrante
  [joyful]          -> Alegre, sorrindo na voz
  [delighted]       -> Encantado / maravilhado
  [satisfied]       -> Satisfeito / realizado
  [sad]             -> Triste e melancólico
  [depressed]       -> Deprimido / abatido
  [upset]           -> Chateado / magoado
  [angry]           -> Bravo e irritado
  [frustrated]      -> Frustrado e impaciente
  [surprised]       -> Surpreso / chocado
  [scared]          -> Assustado / com medo
  [worried]         -> Preocupado / aflito
  [nervous]         -> Nervoso / ansioso
  [curious]         -> Curioso / investigativo (ótimo para perguntas)
  [interested]      -> Interessado / atento
  [confused]        -> Confuso / em dúvida
  [confident]       -> Confiante e seguro
  [proud]           -> Orgulhoso
  [relaxed]         -> Relaxado e tranquilo
  [empathetic]      -> Empático e compreensivo
  [moved]           -> Comovido / emocionado
  [grateful]        -> Grato / agradecido
  [embarrassed]     -> Encabulado / tímido
  [disgusted]       -> Enojado / com repulsa

D) TAGS DE EFEITOS VOCAIS / SONS (AUDIO EFFECTS):
  [laughing]        -> Rindo durante a fala
  [chuckling]       -> Risadinha curta / contida
  [sighing]         -> Suspiro audível de alívio ou cansaço
  [sobbing]         -> Soluçando de choro / voz embargada
  [crying loudly]   -> Chorando alto dramaticamente
  [panting]         -> Ofegante / sem fôlego
  [groaning]        -> Grunhido de esforço ou frustração
  [yawning]         -> Bocejando de sono
  [gasping]         -> Arfando de susto
  [clearing throat] -> Pigarreando antes de falar
  [snorting]        -> Bufando / riso nasal

3. REGRAS DE OURO PARA O AGENTE:
- Coloque a tag sempre ANTES da frase ou oração que deve receber aquela entonação ou efeito.
- Você pode combinar uma tag de Entonação + uma tag de Emoção/Efeito ou mudar a entonação no meio da linha!
- Mantenha as tags em inglês (ex: [in a hurry tone], [soft tone], [laughing]), mas o texto falado em Português.

4. EXEMPLO DE SAÍDA CSV PRONTA PARA IMPORTAR:
id;texto_com_tags;velocidade
fala_01;[in a hurry tone] Rápido, precisamos sair daqui agora mesmo! [whispering] Psiu, abaixa a cabeça que os guardas estão passando...;1.05
fala_02;[sighing] [soft tone] Ufa, finalmente estamos seguros aqui dentro... [laughing] Haha, você viu o susto que eles levaram?;1.0
fala_03;[serious] Escute com muita atenção o que eu vou dizer. [long-break] [dramatic] O cristal nunca esteve na torre!;1.0
fala_04;[sarcastic] Ah, claro, como se fosse super fácil derrotar um dragão sozinho! [chuckling] Hehe, cada ideia que você tem.;1.0
fala_05;[hesitant] Eu... não tenho certeza se devemos abrir essa porta... [gasping] [scared] Ai meu Deus, ela abriu sozinha!;1.0`;

export const SAMPLE_CSV_TEMPLATE_CONTENT = `id;texto_com_tags;velocidade
fala_01;[in a hurry tone] Rápido, precisamos sair daqui agora mesmo! [whispering] Psiu, abaixa a cabeça que os guardas estão passando...;1.05
fala_02;[sighing] [soft tone] Ufa, finalmente estamos seguros aqui dentro... [laughing] Haha, você viu o susto que eles levaram?;1.0
fala_03;[serious] Escute com muita atenção o que eu vou dizer. [long-break] [dramatic] O cristal nunca esteve na torre!;1.0
fala_04;[sarcastic] Ah, claro, como se fosse super fácil derrotar um dragão sozinho! [chuckling] Hehe, cada ideia que você tem.;1.0
fala_05;[hesitant] Eu... não tenho certeza se devemos abrir essa porta... [gasping] [scared] Ai meu Deus, ela abriu sozinha!;1.0
`;

/**
 * Splits a single CSV line respecting double quotes
 */
function splitCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parses a CSV / TSV spreadsheet into batch rows ready for bulk voice generation.
 * Supports `;`, `,`, or `\t` delimiters, optional headers, optional explicit tags column,
 * and optional auto-tagging if rows don't have tags yet.
 */
export function parseFishBatchCsv(
  csvText: string,
  autoTagIfMissing: boolean = true,
  syntax: 'parens' | 'brackets' = 'parens'
): FishCsvBatchRow[] {
  const lines = csvText
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length === 0) return [];

  // Detect delimiter (; or \t or ,)
  const firstLine = lines[0];
  let delimiter = ';';
  if (firstLine.includes('\t')) {
    delimiter = '\t';
  } else if (firstLine.split(';').length < 2 && firstLine.includes(',')) {
    delimiter = ',';
  }

  const firstCols = splitCsvLine(firstLine, delimiter).map((c) => c.toLowerCase());
  const hasHeader =
    firstCols.some((c) =>
      /^(id|nome|arquivo|label|texto|fala|script|texto_com_tags|frase|tags|emoção|emocao|velocidade|speed)$/i.test(
        c
      )
    ) ||
    (lines.length > 1 && /^id\b/i.test(firstCols[0]));

  let idColIdx = 0;
  let textColIdx = 1;
  let tagsColIdx = -1;
  let speedColIdx = -1;

  if (hasHeader) {
    firstCols.forEach((col, idx) => {
      if (/^(id|nome|arquivo|label|codigo|código)$/i.test(col)) idColIdx = idx;
      else if (/^(texto|fala|script|texto_com_tags|frase|dialogo|diálogo|text)$/i.test(col))
        textColIdx = idx;
      else if (/^(tag|tags|expressao|expressão|emocao|emoção)$/i.test(col)) tagsColIdx = idx;
      else if (/^(velocidade|speed|rate)$/i.test(col)) speedColIdx = idx;
    });
    if (firstCols.length === 1) {
      idColIdx = -1;
      textColIdx = 0;
    }
  } else if (firstCols.length === 1) {
    idColIdx = -1;
    textColIdx = 0;
  }

  const startIdx = hasHeader ? 1 : 0;
  const rows: FishCsvBatchRow[] = [];

  for (let i = startIdx; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);
    if (cols.length === 0) continue;

    const rawLabel =
      idColIdx >= 0 && cols[idColIdx]
        ? cols[idColIdx].replace(/^["']|["']$/g, '').trim()
        : `fala_${String(rows.length + 1).padStart(2, '0')}`;

    const rawTextCol =
      cols.length === 1
        ? cols[0]
        : cols[textColIdx] !== undefined
        ? cols[textColIdx]
        : cols.slice(1).join(' ');

    let textClean = (rawTextCol || '').replace(/^["']|["']$/g, '').trim();
    if (!textClean) continue;

    // If there's a dedicated tags column, prepend it if not already present
    if (tagsColIdx >= 0 && cols[tagsColIdx]) {
      const extraTagRaw = cols[tagsColIdx].replace(/^["'([\]]+|["')[\]]+$/g, '').trim();
      if (extraTagRaw && !textClean.toLowerCase().includes(`(${extraTagRaw.toLowerCase()})`)) {
        textClean = `${formatFishTag(extraTagRaw.toLowerCase(), syntax)} ${textClean}`;
      }
    }

    const existingTags = extractTagsFromText(textClean);
    const finalTaggedText =
      existingTags.length > 0
        ? textClean
        : autoTagIfMissing
        ? autoInsertFishAudioTags(textClean, syntax)
        : textClean;

    let parsedSpeed: number | undefined;
    if (speedColIdx >= 0 && cols[speedColIdx]) {
      const num = parseFloat(cols[speedColIdx].replace(',', '.'));
      if (Number.isFinite(num) && num >= 0.5 && num <= 2.0) {
        parsedSpeed = num;
      }
    } else if (cols.length >= 3 && speedColIdx === -1 && tagsColIdx === -1) {
      const maybeSpeed = parseFloat(cols[cols.length - 1].replace(',', '.'));
      if (Number.isFinite(maybeSpeed) && maybeSpeed >= 0.5 && maybeSpeed <= 2.0) {
        parsedSpeed = maybeSpeed;
      }
    }

    rows.push({
      rowNumber: rows.length + 1,
      label: rawLabel || `fala_${String(rows.length + 1).padStart(2, '0')}`,
      rawText: stripFishAudioTags(finalTaggedText),
      taggedText: finalTaggedText,
      speed: parsedSpeed,
    });
  }

  return rows;
}

/**
 * Unifies multiple parsed CSV spreadsheet rows into a single continuous tagged script
 * so all phrases are generated into 1 single continuous audio file instead of separate files.
 */
export function buildContinuousTaggedScriptFromCsvRows(
  rows: FishCsvBatchRow[],
  syntax: 'parens' | 'brackets' = 'brackets',
  insertPauseBetweenRows: boolean = true
): string {
  if (!rows || rows.length === 0) return '';
  const pauseTag = insertPauseBetweenRows ? ` ${formatFishTag('break', syntax)} ` : ' ';
  return rows
    .map((r) => r.taggedText.trim())
    .filter(Boolean)
    .join(pauseTag)
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Unifies multi-line or multi-sentence text from the Studio editor (even if pasted with line breaks or CSV columns)
 * into a single continuous tagged script for 1-file continuous audio generation.
 */
export function buildContinuousTaggedScriptFromText(
  rawText: string,
  autoTagIfMissing: boolean = false,
  syntax: 'parens' | 'brackets' = 'brackets',
  insertPauseBetweenLines: boolean = true
): string {
  const trimmed = rawText.trim();
  if (!trimmed) return '';

  const lines = trimmed
    .split(/\r?\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  // If the text looks like multi-column CSV rows (e.g. fala_01;Texto;1.0), parse via CSV parser first
  if (lines.some((l) => /^[\w-]+\s*;\s*.+/.test(l))) {
    const csvRows = parseFishBatchCsv(trimmed, autoTagIfMissing, syntax);
    if (csvRows.length > 0) {
      return buildContinuousTaggedScriptFromCsvRows(csvRows, syntax, insertPauseBetweenLines);
    }
  }

  const pauseTag = insertPauseBetweenLines && lines.length > 1 ? ` ${formatFishTag('break', syntax)} ` : ' ';
  const processedLines = lines.map((line) => {
    const cleanLine = line.replace(/^fala_\d+\s*[:;-]\s*/i, '').trim();
    if (!cleanLine) return '';
    const hasTags = extractTagsFromText(cleanLine).length > 0;
    return !hasTags && autoTagIfMissing
      ? autoInsertFishAudioTags(cleanLine, syntax)
      : convertTextTagsSyntax(cleanLine, syntax);
  });

  return processedLines
    .filter(Boolean)
    .join(pauseTag)
    .replace(/\s{2,}/g, ' ')
    .trim();
}



const GALLERY_STORAGE_KEY = 'fish_audio_studio_gallery_v1';
const API_CONFIG_STORAGE_KEY = 'fish_audio_studio_api_config_v1';
const FAVORITE_VOICES_STORAGE_KEY = 'fish_audio_studio_fav_voices_v1';
const RECENT_VOICES_STORAGE_KEY = 'fish_audio_studio_recent_voices_v1';
const VOICE_COLLECTIONS_STORAGE_KEY = 'fish_audio_studio_collections_v1';
const VOICE_COLLECTION_MAP_STORAGE_KEY = 'fish_audio_studio_collection_map_v1';

export const DEFAULT_EMBEDDED_FISH_API_KEY =
  'sk-fish-KgdPfgQPGOoZwtPxsRTsW3nweBGZBJKpEUp23ffHrss';

export function loadSavedFishApiKey(): string {
  if (typeof window === 'undefined') return DEFAULT_EMBEDDED_FISH_API_KEY;
  try {
    const stored = window.localStorage.getItem(API_CONFIG_STORAGE_KEY);
    return stored && stored.trim().length >= 8 ? stored.trim() : DEFAULT_EMBEDDED_FISH_API_KEY;
  } catch {
    return DEFAULT_EMBEDDED_FISH_API_KEY;
  }
}

export function loadLocalFavoriteVoiceIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FAVORITE_VOICES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalFavoriteVoiceIds(ids: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FAVORITE_VOICES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Ignore storage error
  }
}

export function loadRecentVoiceIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_VOICES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function pushRecentVoiceId(voiceRefOrId: string): string[] {
  if (typeof window === 'undefined' || !voiceRefOrId) return [];
  const current = loadRecentVoiceIds().filter((id) => id !== voiceRefOrId);
  const next = [voiceRefOrId, ...current].slice(0, 24);
  try {
    window.localStorage.setItem(RECENT_VOICES_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore
  }
  return next;
}

export function loadVoiceCollections(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(VOICE_COLLECTIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveVoiceCollections(collections: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_COLLECTIONS_STORAGE_KEY, JSON.stringify(collections));
  } catch {
    // Ignore
  }
}

export function loadVoiceCollectionAssignments(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(VOICE_COLLECTION_MAP_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveVoiceCollectionAssignments(map: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOICE_COLLECTION_MAP_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore
  }
}

export async function saveFishApiKeyConfig(apiKey: string): Promise<boolean> {
  const clean = apiKey.trim() || DEFAULT_EMBEDDED_FISH_API_KEY;
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(API_CONFIG_STORAGE_KEY, clean);
    } catch {
      // Ignore storage error
    }
  }

  try {
    await fetch('/api/fish-audio/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: clean }),
    });
    return true;
  } catch {
    return Boolean(clean);
  }
}

/**
 * Parses an imported file (.env, .json, or .txt) to extract the Fish Audio API key
 */
export function parseImportedFishConfigFile(rawContent: string): string {
  const trimmed = rawContent.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('{')) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const candidate =
        obj.FISH_AUDIO_API_KEY ||
        obj.fish_audio_api_key ||
        obj.apiKey ||
        obj.api_key ||
        obj.token ||
        obj.key;
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    } catch {
      // Proceed to regex parsing
    }
  }

  const envMatch =
    trimmed.match(/FISH_AUDIO_API_KEY\s*=\s*["']?([^\s"'\r\n]+)["']?/i) ||
    trimmed.match(/API_KEY\s*=\s*["']?([^\s"'\r\n]+)["']?/i) ||
    trimmed.match(/(sk-fish-[A-Za-z0-9_-]+)/);
  if (envMatch && envMatch[1]) {
    return envMatch[1].trim();
  }

  const firstLine = trimmed.split(/\r?\n/)[0].trim();
  return firstLine.replace(/^["']|["']$/g, '');
}

/**
 * Applies "Favoritas" category to any voice that came from Fish Audio favorites or was starred locally
 */
export function applyFavoriteCategoryToVoices(
  list: FishPortugueseVoice[],
  favIds: string[]
): FishPortugueseVoice[] {
  return list.map((v) => {
    const isFav = Boolean(
      v.isFavorite ||
        v.liked ||
        v.isMarked ||
        v.category === 'Favoritas' ||
        v.category === '⭐ Favoritas' ||
        favIds.includes(v.id) ||
        favIds.includes(v.referenceId)
    );
    if (!isFav) return v;
    const baseTags = v.tags || [];
    const nextTags = baseTags.includes('Favorita') ? baseTags : ['Favorita', ...baseTags];
    return {
      ...v,
      isFavorite: true,
      liked: true,
      category: v.customCollection || 'Favoritas',
      name: v.name.replace(/^⭐\s*/, ''),
      tags: nextTags,
    };
  });
}

/**
 * Fetches user's Favorited/Self models AND Portuguese community voices from Fish Audio API (/api/fish-audio/models)
 */
export async function fetchFishAudioPortugueseVoices(
  apiKey?: string,
  searchQuery: string = '',
  language: string = 'pt',
  sortBy: string = 'task_count'
): Promise<{
  voices: FishPortugueseVoice[];
  liveLoadedCount: number;
  favoritesCount: number;
  liveApiAvailable: boolean;
  errorMsg?: string;
}> {
  const activeKey = (apiKey ?? loadSavedFishApiKey()).trim();
  const localFavIds = loadLocalFavoriteVoiceIds();

  try {
    const url = new URL('/api/fish-audio/models', window.location.origin);
    if (searchQuery.trim()) {
      url.searchParams.set('search', searchQuery.trim());
    }
    if (language) {
      url.searchParams.set('language', language);
    }
    if (sortBy) {
      url.searchParams.set('sort_by', sortBy);
    }

    const headers: Record<string, string> = {};
    if (activeKey) {
      headers['x-fish-api-key'] = activeKey;
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers,
    });

    if (response.ok) {
      const data = (await response.json()) as {
        liveApiAvailable?: boolean;
        favoritesCount?: number;
        items?: FishPortugueseVoice[];
        error?: string;
        status?: number;
      };

      if (data.liveApiAvailable && Array.isArray(data.items)) {
        const seenRefs = new Set<string>();
        const combined: FishPortugueseVoice[] = [];

        for (const item of [...data.items, ...PORTUGUESE_FISH_VOICES]) {
          if (seenRefs.has(item.referenceId)) continue;
          seenRefs.add(item.referenceId);
          combined.push(item);
        }

        const withFavs = applyFavoriteCategoryToVoices(combined, localFavIds);
        const totalFavs = withFavs.filter((v) => v.isFavorite || v.category === 'Favoritas').length;

        return {
          voices: withFavs,
          liveLoadedCount: data.items.length,
          favoritesCount: totalFavs,
          liveApiAvailable: true,
        };
      }

      if (data.status === 401 || data.status === 403) {
        const withFavs = applyFavoriteCategoryToVoices(PORTUGUESE_FISH_VOICES, localFavIds);
        return {
          voices: withFavs,
          liveLoadedCount: 0,
          favoritesCount: withFavs.filter((v) => v.isFavorite || v.category === 'Favoritas').length,
          liveApiAvailable: false,
          errorMsg: `Chave recusada pela Fish Audio (HTTP ${data.status}). Exibindo vozes locais e favoritas salvas.`,
        };
      }
    }
  } catch {
    // Fallback to curated voices
  }

  const withFavs = applyFavoriteCategoryToVoices(PORTUGUESE_FISH_VOICES, localFavIds);
  return {
    voices: withFavs,
    liveLoadedCount: PORTUGUESE_FISH_VOICES.length,
    favoritesCount: withFavs.filter((v) => v.isFavorite || v.category === 'Favoritas').length,
    liveApiAvailable: false,
  };
}

/**
 * Fetches a single voice by Fish Audio ID or URL (e.g. https://fish.audio/m/7f92f8...) and adds it to Favoritas
 */
export async function fetchFishVoiceByIdToFavorites(
  idOrUrl: string,
  apiKey?: string
): Promise<FishPortugueseVoice | null> {
  const trimmed = idOrUrl.trim();
  if (!trimmed) return null;
  const matchUrl = trimmed.match(/\/m\/([a-f0-9]{16,64})/i) || trimmed.match(/([a-f0-9]{24,64})/i);
  const cleanId = matchUrl ? matchUrl[1] : trimmed;
  const activeKey = (apiKey ?? loadSavedFishApiKey()).trim();

  try {
    const res = await fetch(`/api/fish-audio/model/${encodeURIComponent(cleanId)}`, {
      headers: activeKey ? { 'x-fish-api-key': activeKey } : {},
    });
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; voice?: FishPortugueseVoice };
      if (data.ok && data.voice) {
        return {
          ...data.voice,
          category: 'Favoritas',
          isFavorite: true,
          name: data.voice.name.replace(/^⭐\s*/, ''),
        };
      }
    }
  } catch {
    // Fallback to creating a custom favorite entry for this reference_id
  }

  return {
    id: `fish-fav-${cleanId}`,
    referenceId: cleanId,
    name: `Favorita Fish (${cleanId.slice(0, 8)})`,
    accent: 'pt-BR',
    gender: 'F',
    category: 'Favoritas',
    isFavorite: true,
    tags: ['Favorita', 'Português'],
    description: `Voz Favorita Fish Audio (ID: ${cleanId})`,
    baseHz: 215,
    formantShift: 1.06,
    breathiness: 0.12,
    vibratoDepth: 0.03,
    defaultSpeed: 1.0,
  };
}

let inMemoryGalleryCache: FishGeneratedAudioItem[] | null = null;

export function loadFishAudioGallery(): FishGeneratedAudioItem[] {
  if (inMemoryGalleryCache !== null) {
    return inMemoryGalleryCache;
  }
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(GALLERY_STORAGE_KEY);
    if (!raw) {
      inMemoryGalleryCache = [];
      return [];
    }
    const parsed = JSON.parse(raw);
    inMemoryGalleryCache = Array.isArray(parsed) ? parsed : [];
    return inMemoryGalleryCache;
  } catch {
    return inMemoryGalleryCache ?? [];
  }
}

export function saveFishAudioGallery(items: FishGeneratedAudioItem[]): void {
  inMemoryGalleryCache = [...items];
  if (typeof window === 'undefined') return;
  const limits = [80, 45, 25, 12];
  for (const limit of limits) {
    try {
      window.localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(items.slice(0, limit)));
      break;
    } catch {
      // Try next smaller slice if localStorage quota is exceeded
    }
  }
  try {
    window.dispatchEvent(new CustomEvent('fish-gallery-updated'));
  } catch {
    // Ignore event error
  }
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function getAudioDurationFromDataUrl(dataUrl: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(dataUrl);
    audio.addEventListener('loadedmetadata', () => {
      resolve(Number.isFinite(audio.duration) ? Number(audio.duration.toFixed(2)) : 2.4);
    });
    audio.addEventListener('error', () => resolve(2.4));
  });
}

export interface FishGenerationProgressInfo {
  phase: 'connecting' | 'synthesizing' | 'streaming' | 'decoding' | 'completed';
  phaseLabel: string;
  percent: number; // 0 to 100 for this clip
  receivedBytes: number;
  elapsedMs: number;
}

/**
 * Generates an expressive audio clip via Fish Audio API (https://api.fish.audio/v1/tts with model: s2.1-pro-free)
 * or falls back seamlessly to the local Fish v1 Expressive WAV Engine.
 * Supports real-time progress reporting via onProgress callback.
 */
export async function generateFishAudioClip(params: {
  taggedText: string;
  voice: FishPortugueseVoice;
  customReferenceId?: string;
  modelId: FishAudioModelId;
  speed: number;
  apiKey?: string;
  batchLabel?: string;
  category?: string;
  customTags?: string[];
  onProgress?: (info: FishGenerationProgressInfo) => void;
}): Promise<FishGeneratedAudioItem> {
  const {
    taggedText,
    voice,
    customReferenceId,
    modelId,
    speed,
    apiKey,
    batchLabel,
    category,
    customTags,
    onProgress,
  } = params;
  const tagsUsed = extractTagsFromText(taggedText);
  const refId = customReferenceId?.trim() || voice.referenceId;
  const activeKey = (apiKey ?? loadSavedFishApiKey()).trim();
  const resolvedCategory = category?.trim() || voice.category || 'Geral';
  const resolvedCustomTags = customTags && customTags.length > 0 ? customTags : voice.tags || [];

  const startedAt = Date.now();
  const charCount = Math.max(20, taggedText.length);
  // Estimate synthesis time based on text length (longer continuous scripts take proportionally longer)
  const estimatedSynthMs = Math.min(25000, Math.max(1800, charCount * 32));
  let currentPercent = 4;
  let receivedBytes = 0;
  let isStreamingNow = false;

  const emitProgress = (
    phase: FishGenerationProgressInfo['phase'],
    phaseLabel: string,
    pct: number,
    bytes = receivedBytes
  ) => {
    currentPercent = Math.max(currentPercent, Math.min(100, Math.round(pct)));
    if (onProgress) {
      onProgress({
        phase,
        phaseLabel,
        percent: currentPercent,
        receivedBytes: bytes,
        elapsedMs: Date.now() - startedAt,
      });
    }
  };

  emitProgress('connecting', 'Conectando ao motor neural Fish Audio...', 6, 0);

  // Real-time ticker while waiting for TTS neural synthesis response headers
  const synthTimer = setInterval(() => {
    if (isStreamingNow) return;
    const elapsed = Date.now() - startedAt;
    const ratio = Math.min(0.95, elapsed / estimatedSynthMs);
    // Asymptotic curve from 8% up to 68% while server synthesizes audio
    const nextPct = 8 + Math.round(60 * (1 - Math.exp(-2.4 * ratio)));
    const label =
      nextPct < 24
        ? 'Processando tags de expressão e fonemas...'
        : nextPct < 48
        ? `Sintetizando voz neural (${voice.name})...`
        : 'Renderizando harmônicos e prosódia do áudio...';
    emitProgress('synthesizing', label, nextPct, receivedBytes);
  }, 90);

  // 1. Try Server-Side Proxy (/api/fish-audio/tts -> https://api.fish.audio/v1/tts)
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (activeKey) {
      headers['x-fish-api-key'] = activeKey;
    }

    const response = await fetch('/api/fish-audio/tts', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        text: taggedText,
        reference_id: refId,
        model: modelId || 's2.1-pro-free',
        speed,
        format: 'mp3',
      }),
    });

    const contentType = response.headers.get('Content-Type') || '';
    if (response.ok && (contentType.includes('audio/') || contentType.includes('octet-stream'))) {
      isStreamingNow = true;
      clearInterval(synthTimer);

      const contentLengthHeader = response.headers.get('Content-Length');
      const totalExpectedBytes = contentLengthHeader
        ? parseInt(contentLengthHeader, 10)
        : Math.max(24000, charCount * 380);

      let blob: Blob;
      if (response.body && typeof response.body.getReader === 'function') {
        const reader = response.body.getReader();
        const chunks: BlobPart[] = [];
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value as unknown as BlobPart);
            receivedBytes += value.byteLength;
            const streamRatio = Math.min(1, receivedBytes / Math.max(1, totalExpectedBytes));
            const streamPct = 70 + Math.round(streamRatio * 22);
            const kb = (receivedBytes / 1024).toFixed(1);
            emitProgress(
              'streaming',
              `Recebendo stream de áudio (${kb} KB)...`,
              streamPct,
              receivedBytes
            );
          }
        }
        blob = new Blob(chunks, { type: contentType || 'audio/mpeg' });
      } else {
        blob = await response.blob();
        receivedBytes = blob.size;
        emitProgress(
          'streaming',
          `Stream recebido (${(receivedBytes / 1024).toFixed(1)} KB)...`,
          92,
          receivedBytes
        );
      }

      emitProgress('decoding', 'Decodificando e calculando duração do áudio...', 96, receivedBytes);
      const audioDataUrl = await blobToDataUrl(blob);
      const durationSec = await getAudioDurationFromDataUrl(audioDataUrl);
      emitProgress('completed', 'Áudio finalizado com sucesso!', 100, receivedBytes);

      return {
        id: `fish-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        batchLabel,
        category: resolvedCategory,
        customTags: resolvedCustomTags,
        createdAt: Date.now(),
        taggedText,
        voiceId: voice.id,
        voiceName: voice.name,
        voiceAccent: voice.accent,
        modelId,
        speed,
        tagsUsed,
        audioDataUrl,
        durationSec,
        source: 'fish-api',
      };
    }
  } catch {
    // Proceed to direct or local fallback
  } finally {
    clearInterval(synthTimer);
  }

  // Fallback: Synthesize real downloadable WAV with vocal expressions + speak PT preview
  emitProgress('synthesizing', 'Sintetizando motor expressivo local WAV...', 78, 0);
  await new Promise((r) => setTimeout(r, 80));
  const { audioDataUrl, durationSec } = synthesizeExpressiveFishWav(taggedText, voice, speed);
  receivedBytes = Math.round(audioDataUrl.length * 0.75);
  emitProgress('decoding', 'Finalizando onda sonora WAV...', 95, receivedBytes);
  speakPortugueseWithExpressionsPreview(taggedText, voice, speed);
  emitProgress('completed', 'Áudio finalizado com sucesso!', 100, receivedBytes);

  return {
    id: `fish-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    batchLabel,
    category: resolvedCategory,
    customTags: resolvedCustomTags,
    createdAt: Date.now(),
    taggedText,
    voiceId: voice.id,
    voiceName: voice.name,
    voiceAccent: voice.accent,
    modelId,
    speed,
    tagsUsed,
    audioDataUrl,
    durationSec,
    source: 'fish-v1-synth',
  };
}


