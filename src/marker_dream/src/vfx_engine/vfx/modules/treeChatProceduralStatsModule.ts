// ============================================================================
// MODULE: TREECHAT PROCEDURAL STATS & MASSIVE VOCABULARY ENGINE
// Decoupled external module governing:
// 1. Massive 36-Emotion Dictionary with 280+ Fictional Sims-like Expressions
// 2. Multi-dimensional Personality & Exploration Profiling
// 3. Earned Dialogue Initiation Logic (exploration metrics, biome discoveries, tag affinities)
// 4. Procedural Utility-Based Option Selection (ZERO blind random rolls)
// ============================================================================

import { DnaRelationshipBond, RelationshipTierId, SlimeActor } from '../types';

export type TreeChatEmotionId =
  | 'divertido'
  | 'exagerado_divertido'
  | 'desinteressado'
  | 'furioso'
  | 'ultra_furioso'
  | 'amoroso'
  | 'encantado'
  | 'curioso'
  | 'sarcastico'
  | 'calmo'
  | 'triste'
  | 'assustado'
  | 'orgulhoso'
  | 'travesso'
  | 'confuso'
  | 'empolgado'
  | 'amigavel'
  | 'choroso'
  | 'misterioso'
  | 'otimista'
  | 'cansado'
  | 'assombrado'
  | 'esperancoso'
  | 'preocupado'
  | 'decepcionado'
  | 'sereno'
  | 'corajoso'
  | 'ansioso'
  | 'desconfiado'
  | 'saudoso'
  | 'ciumento'
  | 'aliviado'
  | 'nervoso'
  | 'inseguro'
  | 'grato'
  | 'apaixonado';

export type TreeChatIconType =
  | 'laugh'
  | 'star_eyes'
  | 'bored_zzz'
  | 'angry'
  | 'rage'
  | 'heart'
  | 'blush'
  | 'magnifier'
  | 'sunglasses'
  | 'serene'
  | 'cry'
  | 'shock'
  | 'trophy'
  | 'wink'
  | 'question'
  | 'sun'
  | 'muscle'
  | 'ghost'
  | 'broken_heart'
  | 'mask';

export interface EmotionAffinityVector {
  humor: number;       // -1.0 to 1.0 (fun, playfulness)
  hostility: number;   // -1.0 to 1.0 (aggression, anger, irritation)
  warmth: number;      // -1.0 to 1.0 (love, empathy, friendship)
  curiosity: number;   // -1.0 to 1.0 (exploration, questioning)
  bravery: number;     // -1.0 to 1.0 (confidence, courage vs fear/anxiety)
  energy: number;      // -1.0 to 1.0 (hyperactive vs exhausted/bored)
}

export interface TreeChatEmotionDef {
  id: TreeChatEmotionId;
  labelPt: string;
  category: 'positivo' | 'negativo' | 'neutro' | 'intenso';
  phrases: string[];
  colorTop: string;
  colorMid: string;
  colorBottom: string;
  colorDimmed: string;
  icon: TreeChatIconType;
  tensionDelta: number;
  interestDelta: number;
  affinityVector: EmotionAffinityVector;
  reactions: TreeChatEmotionId[];
}

export interface TreeChatPillOption {
  emotionId: TreeChatEmotionId;
  phrase: string;
}

export interface NpcConversationalProfile {
  curiosity: number;      // 0..100: influenced by exploration, magic/ranged tags
  boldness: number;       // 0..100: influenced by HP, shield, berserker personality
  irritability: number;   // 0..100: influenced by recent hits, debuffs, dark/fire tags
  warmth: number;         // 0..100: influenced by light/water/nature tags, regen
  explorationPride: number; // 0..100: influenced by discovered regions mask
  fatigue: number;        // 0..100: low HP, long wander, debuffs
  preferredEmotions: TreeChatEmotionId[];
}

export interface DialogueInitiationEvaluation {
  canInitiate: boolean;
  intent: 'COMPARTILHAR_DESCOBERTA' | 'CONFRONTO_TERRITORIAL' | 'AFINIDADE_ELEMENTAL' | 'PEDIR_SOCORRO' | 'NENHUM';
  matchScore: number;
  reason: string;
}

// ============================================================================
// 1. MASSIVE 36-EMOTION REGISTRY (BASED ON REFERENCE SHEETS + CANONICAL EXPANSION)
// ============================================================================
export const MASSIVE_TREECHAT_EMOTIONS: Record<TreeChatEmotionId, TreeChatEmotionDef> = {
  divertido: {
    id: 'divertido',
    labelPt: 'Divertido',
    category: 'positivo',
    phrases: ['Lilli prilili', 'Bloob litli', 'Pipi lulula', 'Tiki-bloo', 'Zuzu plip', 'Jollu prili', 'Chiku wubba'],
    colorTop: '#FFE94D',
    colorMid: '#FACC15',
    colorBottom: '#CA8A04',
    colorDimmed: '#423306',
    icon: 'laugh',
    tensionDelta: -12,
    interestDelta: 14,
    affinityVector: { humor: 0.9, hostility: -0.7, warmth: 0.5, curiosity: 0.3, bravery: 0.2, energy: 0.6 },
    reactions: ['divertido', 'exagerado_divertido', 'desinteressado', 'empolgado', 'travesso', 'amigavel'],
  },
  exagerado_divertido: {
    id: 'exagerado_divertido',
    labelPt: 'Eufórico / Exagerado',
    category: 'positivo',
    phrases: ['Globeryss', 'Blibli wahoo', 'Zumba laka', 'Krakaboom li', 'Wubba zulu', 'Koko blasto', 'Zorba prilili'],
    colorTop: '#65FF3B',
    colorMid: '#22C55E',
    colorBottom: '#15803D',
    colorDimmed: '#113819',
    icon: 'star_eyes',
    tensionDelta: -8,
    interestDelta: 18,
    affinityVector: { humor: 1.0, hostility: -0.5, warmth: 0.4, curiosity: 0.4, bravery: 0.5, energy: 1.0 },
    reactions: ['divertido', 'empolgado', 'confuso', 'desinteressado', 'sarcastico', 'otimista'],
  },
  desinteressado: {
    id: 'desinteressado',
    labelPt: 'Entediado / Sem Interesse',
    category: 'neutro',
    phrases: ['Fluff fluff', 'Meh bloob', 'Zzz plop', 'Boora buh', 'Nunu lili', 'Blablu plip', 'Pfff blobbo'],
    colorTop: '#7C4DFF',
    colorMid: '#5B21B6',
    colorBottom: '#3B0764',
    colorDimmed: '#1F1038',
    icon: 'bored_zzz',
    tensionDelta: 14,
    interestDelta: -26,
    affinityVector: { humor: -0.4, hostility: 0.1, warmth: -0.6, curiosity: -0.8, bravery: -0.1, energy: -0.9 },
    reactions: ['curioso', 'calmo', 'divertido', 'sarcastico', 'furioso', 'cansado'],
  },
  furioso: {
    id: 'furioso',
    labelPt: 'Furioso / Bravo',
    category: 'negativo',
    phrases: ['Graaaanini', 'Vrrrakash', 'Grubba krak', 'Brrr gash', 'Rrr zorbak', 'Klin garu', 'Zrak bloob'],
    colorTop: '#FF4757',
    colorMid: '#EF4444',
    colorBottom: '#991B1B',
    colorDimmed: '#451212',
    icon: 'angry',
    tensionDelta: 28,
    interestDelta: -8,
    affinityVector: { humor: -0.8, hostility: 0.9, warmth: -0.8, curiosity: -0.3, bravery: 0.6, energy: 0.8 },
    reactions: ['ultra_furioso', 'furioso', 'assustado', 'calmo', 'sarcastico', 'nervoso'],
  },
  ultra_furioso: {
    id: 'ultra_furioso',
    labelPt: 'Fúria Extrema',
    category: 'intenso',
    phrases: ['Ig graniiiiii lilil', 'GRAAAKOOM', 'Urrgh krakash', 'Zorba KLIN', 'KRUSHU MOR', 'ZLORP KRAK', 'RRAAAWK'],
    colorTop: '#FF1F3D',
    colorMid: '#DC2626',
    colorBottom: '#7F1D1D',
    colorDimmed: '#3B0A0A',
    icon: 'rage',
    tensionDelta: 42,
    interestDelta: -15,
    affinityVector: { humor: -1.0, hostility: 1.0, warmth: -1.0, curiosity: -0.5, bravery: 0.8, energy: 1.0 },
    reactions: ['ultra_furioso', 'furioso', 'assustado', 'triste', 'ansioso'],
  },
  amoroso: {
    id: 'amoroso',
    labelPt: 'Amoroso / Carinhoso',
    category: 'positivo',
    phrases: ['Mimi shulala', 'Luvu prilili', 'Chu chulili', 'Awnn prili', 'Koko mimi', 'Shushu bloob', 'Tululu luv'],
    colorTop: '#FF66C4',
    colorMid: '#EC4899',
    colorBottom: '#9D174D',
    colorDimmed: '#471029',
    icon: 'heart',
    tensionDelta: -18,
    interestDelta: 20,
    affinityVector: { humor: 0.4, hostility: -0.9, warmth: 1.0, curiosity: 0.2, bravery: 0.1, energy: 0.3 },
    reactions: ['encantado', 'amoroso', 'divertido', 'confuso', 'desinteressado', 'apaixonado'],
  },
  encantado: {
    id: 'encantado',
    labelPt: 'Encantado / Tímido',
    category: 'positivo',
    phrases: ['Shuli mimi', 'Blibli lili', 'Oooo prilili', 'Kiki shuu', 'Wauu shulu', 'Mimi plip', 'Awaaa blip'],
    colorTop: '#FF85D8',
    colorMid: '#F472B6',
    colorBottom: '#BE185D',
    colorDimmed: '#421228',
    icon: 'blush',
    tensionDelta: -14,
    interestDelta: 16,
    affinityVector: { humor: 0.3, hostility: -0.8, warmth: 0.8, curiosity: 0.5, bravery: -0.3, energy: 0.2 },
    reactions: ['amoroso', 'divertido', 'calmo', 'orgulhoso', 'grato'],
  },
  curioso: {
    id: 'curioso',
    labelPt: 'Curioso / Pensativo',
    category: 'neutro',
    phrases: ['Humm broli?', 'Kiki zola?', 'Plip lili?', 'Oba luli?', 'Zorbi klin?', 'Blorp luka?', 'Kwesti plop?'],
    colorTop: '#38F2FF',
    colorMid: '#06B6D4',
    colorBottom: '#0E7490',
    colorDimmed: '#0B3440',
    icon: 'magnifier',
    tensionDelta: -6,
    interestDelta: 15,
    affinityVector: { humor: 0.2, hostility: -0.4, warmth: 0.3, curiosity: 1.0, bravery: 0.3, energy: 0.5 },
    reactions: ['divertido', 'orgulhoso', 'confuso', 'sarcastico', 'calmo', 'misterioso'],
  },
  sarcastico: {
    id: 'sarcastico',
    labelPt: 'Sarcástico',
    category: 'negativo',
    phrases: ['Heh brrrli', 'Tss globby', 'Znarf lili', 'Yaya plop', 'Pffft bloob', 'Nyah lulu', 'Bleh zorb'],
    colorTop: '#FF9436',
    colorMid: '#F97316',
    colorBottom: '#9A3412',
    colorDimmed: '#421B09',
    icon: 'sunglasses',
    tensionDelta: 19,
    interestDelta: -6,
    affinityVector: { humor: 0.4, hostility: 0.5, warmth: -0.5, curiosity: -0.2, bravery: 0.4, energy: 0.1 },
    reactions: ['furioso', 'sarcastico', 'divertido', 'desinteressado', 'ultra_furioso', 'desconfiado'],
  },
  calmo: {
    id: 'calmo',
    labelPt: 'Calmo / Sereno',
    category: 'positivo',
    phrases: ['Ommm shuli', 'Zeni prilili', 'Ssssh bloo', 'Lulu shuu', 'Shanti mimi', 'Tranki lili', 'Sola bloo'],
    colorTop: '#34F5C5',
    colorMid: '#10B981',
    colorBottom: '#047857',
    colorDimmed: '#083326',
    icon: 'serene',
    tensionDelta: -20,
    interestDelta: 8,
    affinityVector: { humor: 0.1, hostility: -0.8, warmth: 0.6, curiosity: 0.1, bravery: 0.4, energy: -0.4 },
    reactions: ['calmo', 'divertido', 'curioso', 'amoroso', 'desinteressado', 'sereno'],
  },
  triste: {
    id: 'triste',
    labelPt: 'Triste / Choroso',
    category: 'negativo',
    phrases: ['Sniff bloo', 'Plin plin', 'Wobbi luli', 'Oooo mimi', 'Glum plop', 'Uuuu lili', 'Bwaa shuli'],
    colorTop: '#4DA6FF',
    colorMid: '#2563EB',
    colorBottom: '#1E3A8A',
    colorDimmed: '#112047',
    icon: 'cry',
    tensionDelta: 8,
    interestDelta: -10,
    affinityVector: { humor: -0.7, hostility: -0.3, warmth: 0.2, curiosity: -0.3, bravery: -0.6, energy: -0.6 },
    reactions: ['amoroso', 'calmo', 'curioso', 'desinteressado', 'divertido', 'choroso'],
  },
  assustado: {
    id: 'assustado',
    labelPt: 'Assustado / Amedrontado',
    category: 'negativo',
    phrases: ['Eeeek bobo!', 'Uwaaa klin!', 'Gasp plop!', 'Yiki lili!', 'Spuki mor!', 'Zuuu bloo!', 'Wibbi krak!'],
    colorTop: '#FF9E2C',
    colorMid: '#EA580C',
    colorBottom: '#9A3412',
    colorDimmed: '#3D1908',
    icon: 'shock',
    tensionDelta: 16,
    interestDelta: -12,
    affinityVector: { humor: -0.4, hostility: -0.2, warmth: -0.2, curiosity: 0.1, bravery: -0.9, energy: 0.7 },
    reactions: ['calmo', 'divertido', 'furioso', 'confuso', 'assombrado'],
  },
  orgulhoso: {
    id: 'orgulhoso',
    labelPt: 'Orgulhoso / Confiante',
    category: 'positivo',
    phrases: ['Tadaa grani', 'Rexi bloob', 'Bravu mimi', 'Luxi prilili', 'Zorba zulu', 'Kampa klin', 'Maga bloo'],
    colorTop: '#FFE838',
    colorMid: '#EAB308',
    colorBottom: '#A16207',
    colorDimmed: '#3D2906',
    icon: 'trophy',
    tensionDelta: 5,
    interestDelta: 12,
    affinityVector: { humor: 0.3, hostility: 0.2, warmth: 0.1, curiosity: 0.2, bravery: 0.9, energy: 0.5 },
    reactions: ['encantado', 'sarcastico', 'divertido', 'furioso', 'corajoso'],
  },
  travesso: {
    id: 'travesso',
    labelPt: 'Travesso / Brincalhão',
    category: 'positivo',
    phrases: ['Nyah prilili', 'Zizi plop', 'Keke bloob', 'Trixi lili', 'Sniki wub', 'Zuka zulu', 'Gigi plip'],
    colorTop: '#FF38B8',
    colorMid: '#DB2777',
    colorBottom: '#831843',
    colorDimmed: '#3B0B20',
    icon: 'wink',
    tensionDelta: 11,
    interestDelta: 12,
    affinityVector: { humor: 0.8, hostility: 0.2, warmth: 0.2, curiosity: 0.5, bravery: 0.4, energy: 0.7 },
    reactions: ['exagerado_divertido', 'furioso', 'sarcastico', 'divertido', 'empolgado'],
  },
  confuso: {
    id: 'confuso',
    labelPt: 'Confuso / Desnorteado',
    category: 'neutro',
    phrases: ['Blorp huh?', 'Gloop kli?', 'Wubba lili?', 'Zzzip oh?', 'Tiki bloo?', 'Nani plop?', 'Dizi zulu?'],
    colorTop: '#B54CFF',
    colorMid: '#9333EA',
    colorBottom: '#581C87',
    colorDimmed: '#290E40',
    icon: 'question',
    tensionDelta: 6,
    interestDelta: -4,
    affinityVector: { humor: 0.1, hostility: -0.2, warmth: 0.0, curiosity: 0.6, bravery: -0.3, energy: -0.1 },
    reactions: ['curioso', 'divertido', 'sarcastico', 'calmo'],
  },
  empolgado: {
    id: 'empolgado',
    labelPt: 'Empolgado / Vencedor',
    category: 'positivo',
    phrases: ['Yaaay prilili', 'Solla bloo', 'Upa lili', 'Vibi globby', 'Wahoo blop', 'Zumba bloob', 'Powa zulu'],
    colorTop: '#54FF38',
    colorMid: '#16A34A',
    colorBottom: '#14532D',
    colorDimmed: '#0C301B',
    icon: 'sun',
    tensionDelta: -14,
    interestDelta: 18,
    affinityVector: { humor: 0.7, hostility: -0.5, warmth: 0.6, curiosity: 0.6, bravery: 0.7, energy: 0.9 },
    reactions: ['exagerado_divertido', 'divertido', 'amoroso', 'corajoso', 'otimista'],
  },
  amigavel: {
    id: 'amigavel',
    labelPt: 'Amigável / Companheiro',
    category: 'positivo',
    phrases: ['Yupi prilili', 'Broda bloob', 'Kumpa lili', 'Miko shulu', 'Pika plop', 'Taka wub', 'Zuzu bloob'],
    colorTop: '#4DFFA8',
    colorMid: '#10B981',
    colorBottom: '#047857',
    colorDimmed: '#0B3624',
    icon: 'laugh',
    tensionDelta: -16,
    interestDelta: 16,
    affinityVector: { humor: 0.5, hostility: -0.8, warmth: 0.9, curiosity: 0.4, bravery: 0.3, energy: 0.4 },
    reactions: ['divertido', 'amoroso', 'calmo', 'grato', 'esperancoso'],
  },
  choroso: {
    id: 'choroso',
    labelPt: 'Choroso / Queixoso',
    category: 'negativo',
    phrases: ['Bwaaa klin', 'Piuu lili', 'Sniff bloo', 'Wuuu bloob', 'Mimi plin', 'Shuu mimi'],
    colorTop: '#60A5FA',
    colorMid: '#3B82F6',
    colorBottom: '#1D4ED8',
    colorDimmed: '#0F265C',
    icon: 'cry',
    tensionDelta: 6,
    interestDelta: -8,
    affinityVector: { humor: -0.6, hostility: -0.2, warmth: 0.4, curiosity: -0.2, bravery: -0.7, energy: -0.4 },
    reactions: ['amoroso', 'calmo', 'grato', 'ansioso'],
  },
  misterioso: {
    id: 'misterioso',
    labelPt: 'Misterioso / Oculto',
    category: 'neutro',
    phrases: ['Shhh zorbak', 'Kululu lili', 'Zuloo bloo', 'Nigma vrr', 'Vozu shuu', 'Mombra mimi'],
    colorTop: '#C084FC',
    colorMid: '#9333EA',
    colorBottom: '#581C87',
    colorDimmed: '#280D3D',
    icon: 'mask',
    tensionDelta: 4,
    interestDelta: 20,
    affinityVector: { humor: 0.0, hostility: 0.1, warmth: -0.2, curiosity: 0.9, bravery: 0.5, energy: 0.1 },
    reactions: ['curioso', 'desconfiado', 'sarcastico', 'assombrado'],
  },
  otimista: {
    id: 'otimista',
    labelPt: 'Otimista / Radiante',
    category: 'positivo',
    phrases: ['Luma prili', 'Soli wubba', 'Zora bloo', 'Kira lili', 'Pipa shulu', 'Blibli zulu'],
    colorTop: '#FDE047',
    colorMid: '#EAB308',
    colorBottom: '#854D0E',
    colorDimmed: '#3B2406',
    icon: 'sun',
    tensionDelta: -15,
    interestDelta: 16,
    affinityVector: { humor: 0.6, hostility: -0.8, warmth: 0.7, curiosity: 0.5, bravery: 0.6, energy: 0.8 },
    reactions: ['empolgado', 'amigavel', 'corajoso', 'esperancoso'],
  },
  cansado: {
    id: 'cansado',
    labelPt: 'Cansado / Esgotado',
    category: 'negativo',
    phrases: ['Ufff bloob', 'Puffi plop', 'Zzzu lili', 'Mumu bloo', 'Slurpi zzz', 'Boora klin'],
    colorTop: '#818CF8',
    colorMid: '#4F46E5',
    colorBottom: '#312E81',
    colorDimmed: '#171442',
    icon: 'bored_zzz',
    tensionDelta: -4,
    interestDelta: -20,
    affinityVector: { humor: -0.3, hostility: -0.1, warmth: 0.1, curiosity: -0.7, bravery: -0.4, energy: -1.0 },
    reactions: ['calmo', 'desinteressado', 'triste', 'aliviado'],
  },
  assombrado: {
    id: 'assombrado',
    labelPt: 'Assombrado / Aterrorizado',
    category: 'intenso',
    phrases: ['Buuu zorbak!', 'Wooo klin!', 'Ghouli bloo!', 'Zriii lili!', 'Spuki uuu!', 'Krakaa mor!'],
    colorTop: '#FB923C',
    colorMid: '#EA580C',
    colorBottom: '#7C2D12',
    colorDimmed: '#381408',
    icon: 'ghost',
    tensionDelta: 22,
    interestDelta: -10,
    affinityVector: { humor: -0.5, hostility: -0.1, warmth: -0.3, curiosity: 0.2, bravery: -0.9, energy: 0.6 },
    reactions: ['assustado', 'misterioso', 'calmo', 'nervoso'],
  },
  esperancoso: {
    id: 'esperancoso',
    labelPt: 'Esperançoso / Crente',
    category: 'positivo',
    phrases: ['Alu prilili!', 'Flori bloo', 'Sola mimi', 'Lumi wub', 'Zuzu prili', 'Koko shuli'],
    colorTop: '#4ADE80',
    colorMid: '#16A34A',
    colorBottom: '#14532D',
    colorDimmed: '#0A2B17',
    icon: 'sun',
    tensionDelta: -16,
    interestDelta: 14,
    affinityVector: { humor: 0.4, hostility: -0.8, warmth: 0.8, curiosity: 0.6, bravery: 0.5, energy: 0.6 },
    reactions: ['otimista', 'amigavel', 'grato', 'empolgado'],
  },
  preocupado: {
    id: 'preocupado',
    labelPt: 'Preocupado / Cauteloso',
    category: 'negativo',
    phrases: ['Uhuu klin?', 'Wobba bloo', 'Zizi mor?', 'Kiki plop?', 'Oia lili', 'Tutu zorb'],
    colorTop: '#38BDF8',
    colorMid: '#0284C7',
    colorBottom: '#075985',
    colorDimmed: '#052A3D',
    icon: 'shock',
    tensionDelta: 12,
    interestDelta: 5,
    affinityVector: { humor: -0.3, hostility: -0.3, warmth: 0.4, curiosity: 0.4, bravery: -0.5, energy: 0.3 },
    reactions: ['calmo', 'ansioso', 'corajoso', 'desconfiado'],
  },
  decepcionado: {
    id: 'decepcionado',
    labelPt: 'Decepcionado / Desiludido',
    category: 'negativo',
    phrases: ['Plop buh', 'Mumu lili', 'Zorbi plin', 'Bwaa plop', 'Fuuu bloob', 'Glum zulu'],
    colorTop: '#F472B6',
    colorMid: '#DB2777',
    colorBottom: '#831843',
    colorDimmed: '#380B1D',
    icon: 'broken_heart',
    tensionDelta: 10,
    interestDelta: -15,
    affinityVector: { humor: -0.6, hostility: 0.3, warmth: -0.4, curiosity: -0.4, bravery: -0.3, energy: -0.5 },
    reactions: ['triste', 'sarcastico', 'desinteressado', 'ciumento'],
  },
  sereno: {
    id: 'sereno',
    labelPt: 'Sereno / Em Paz',
    category: 'positivo',
    phrases: ['Fwoosh lili', 'Shulu bloo', 'Ommm mimi', 'Lala prili', 'Zeni wub', 'Puru shuli'],
    colorTop: '#A78BFA',
    colorMid: '#7C3AED',
    colorBottom: '#4C1D95',
    colorDimmed: '#230E45',
    icon: 'serene',
    tensionDelta: -22,
    interestDelta: 10,
    affinityVector: { humor: 0.1, hostility: -0.9, warmth: 0.7, curiosity: 0.3, bravery: 0.4, energy: -0.3 },
    reactions: ['calmo', 'grato', 'amigavel', 'aliviado'],
  },
  corajoso: {
    id: 'corajoso',
    labelPt: 'Corajoso / Destemido',
    category: 'positivo',
    phrases: ['Grani rex!', 'Zorba bloo!', 'Krakaa wub!', 'Bravu klin!', 'Tora zulu!', 'Vroom prili!'],
    colorTop: '#FB923C',
    colorMid: '#D97706',
    colorBottom: '#78350F',
    colorDimmed: '#381907',
    icon: 'muscle',
    tensionDelta: 8,
    interestDelta: 16,
    affinityVector: { humor: 0.2, hostility: 0.3, warmth: 0.2, curiosity: 0.4, bravery: 1.0, energy: 0.8 },
    reactions: ['orgulhoso', 'empolgado', 'furioso', 'otimista'],
  },
  ansioso: {
    id: 'ansioso',
    labelPt: 'Ansioso / Inquieto',
    category: 'negativo',
    phrases: ['Tiki-taka!', 'Zizi wub!', 'Blibli klin?', 'Pipa-pipa!', 'Wobbi bloo!', 'Frrr lili!'],
    colorTop: '#F87171',
    colorMid: '#DC2626',
    colorBottom: '#7F1D1D',
    colorDimmed: '#3D0E0E',
    icon: 'shock',
    tensionDelta: 18,
    interestDelta: 2,
    affinityVector: { humor: -0.4, hostility: 0.1, warmth: -0.1, curiosity: 0.3, bravery: -0.8, energy: 0.9 },
    reactions: ['calmo', 'preocupado', 'assustado', 'nervoso'],
  },
  desconfiado: {
    id: 'desconfiado',
    labelPt: 'Desconfiado / Atento',
    category: 'neutro',
    phrases: ['Humm zorb?', 'Nunu klin', 'Zorbi lili?', 'Kuku bloo?', 'Tss plop', 'Vrr shuli?'],
    colorTop: '#84CC16',
    colorMid: '#4D7C0F',
    colorBottom: '#365314',
    colorDimmed: '#172408',
    icon: 'sunglasses',
    tensionDelta: 14,
    interestDelta: 6,
    affinityVector: { humor: -0.2, hostility: 0.4, warmth: -0.5, curiosity: 0.7, bravery: 0.5, energy: 0.3 },
    reactions: ['sarcastico', 'curioso', 'furioso', 'misterioso'],
  },
  saudoso: {
    id: 'saudoso',
    labelPt: 'Saudoso / Nostálgico',
    category: 'neutro',
    phrases: ['Oooo shulala', 'Lulu mimi', 'Zuzu plin', 'Mimi bloo', 'Lili wub', 'Shuli plop'],
    colorTop: '#A855F7',
    colorMid: '#6B21A8',
    colorBottom: '#3B0764',
    colorDimmed: '#1B042E',
    icon: 'broken_heart',
    tensionDelta: -8,
    interestDelta: 8,
    affinityVector: { humor: -0.2, hostility: -0.4, warmth: 0.6, curiosity: 0.4, bravery: -0.2, energy: -0.4 },
    reactions: ['triste', 'amoroso', 'calmo', 'grato'],
  },
  ciumento: {
    id: 'ciumento',
    labelPt: 'Ciumento / Ressentido',
    category: 'negativo',
    phrases: ['Hmph zorb!', 'Grubba lili?', 'Zrak mimi!', 'Brrr plop!', 'Klin shuli!', 'Nyah bloob!'],
    colorTop: '#F43F5E',
    colorMid: '#BE123C',
    colorBottom: '#4C0519',
    colorDimmed: '#26030D',
    icon: 'broken_heart',
    tensionDelta: 24,
    interestDelta: -12,
    affinityVector: { humor: -0.5, hostility: 0.7, warmth: 0.1, curiosity: -0.2, bravery: 0.2, energy: 0.6 },
    reactions: ['furioso', 'decepcionado', 'sarcastico', 'ultra_furioso'],
  },
  aliviado: {
    id: 'aliviado',
    labelPt: 'Aliviado / Recomposto',
    category: 'positivo',
    phrases: ['Fiuu prilili!', 'Aaaa bloob', 'Puffi shuli', 'Lili wahoo', 'Mimi zeni', 'Sola plip'],
    colorTop: '#86EFAC',
    colorMid: '#22C55E',
    colorBottom: '#14532D',
    colorDimmed: '#0A2B17',
    icon: 'serene',
    tensionDelta: -18,
    interestDelta: 12,
    affinityVector: { humor: 0.4, hostility: -0.8, warmth: 0.7, curiosity: 0.2, bravery: 0.4, energy: 0.1 },
    reactions: ['calmo', 'grato', 'amigavel', 'otimista'],
  },
  nervoso: {
    id: 'nervoso',
    labelPt: 'Nervoso / Trêmulo',
    category: 'negativo',
    phrases: ['Bzzzt krak!', 'Grrr zizi!', 'Zrak wub!', 'Klin-klin!', 'Vrrr plop!', 'Urrrgh lili!'],
    colorTop: '#FB923C',
    colorMid: '#C2410C',
    colorBottom: '#7C2D12',
    colorDimmed: '#381408',
    icon: 'shock',
    tensionDelta: 22,
    interestDelta: -8,
    affinityVector: { humor: -0.6, hostility: 0.6, warmth: -0.5, curiosity: -0.2, bravery: -0.2, energy: 0.8 },
    reactions: ['furioso', 'ansioso', 'ultra_furioso', 'assustado'],
  },
  inseguro: {
    id: 'inseguro',
    labelPt: 'Inseguro / Hesitante',
    category: 'negativo',
    phrases: ['Ummm lili?', 'Plip-plop?', 'Mimi klin?', 'Shuu bloo?', 'Wibbi mimi', 'Nunu prili?'],
    colorTop: '#9333EA',
    colorMid: '#6B21A8',
    colorBottom: '#3B0764',
    colorDimmed: '#1B042E',
    icon: 'cry',
    tensionDelta: 6,
    interestDelta: -10,
    affinityVector: { humor: -0.4, hostility: -0.2, warmth: 0.3, curiosity: 0.1, bravery: -0.8, energy: -0.3 },
    reactions: ['amoroso', 'amigavel', 'ansioso', 'calmo'],
  },
  grato: {
    id: 'grato',
    labelPt: 'Grato / Agradecido',
    category: 'positivo',
    phrases: ['Arigato bloo!', 'Mimi prilili!', 'Shuli kumpa!', 'Luvu zulu!', 'Koko prili!', 'Yupi mimi!'],
    colorTop: '#A3E635',
    colorMid: '#65A30D',
    colorBottom: '#365314',
    colorDimmed: '#172408',
    icon: 'sun',
    tensionDelta: -20,
    interestDelta: 18,
    affinityVector: { humor: 0.3, hostility: -0.9, warmth: 0.9, curiosity: 0.3, bravery: 0.4, energy: 0.4 },
    reactions: ['amigavel', 'aliviado', 'sereno', 'otimista'],
  },
  apaixonado: {
    id: 'apaixonado',
    labelPt: 'Apaixonado / Extasiado',
    category: 'intenso',
    phrases: ['Shulala bloo!', 'Mimi-mimi wub!', 'Luvu prilili!', 'Chuu zulu!', 'Awnn globeryss!', 'Kiki shulala!'],
    colorTop: '#FB7185',
    colorMid: '#E11D48',
    colorBottom: '#881337',
    colorDimmed: '#3B0717',
    icon: 'heart',
    tensionDelta: -16,
    interestDelta: 24,
    affinityVector: { humor: 0.5, hostility: -0.9, warmth: 1.0, curiosity: 0.4, bravery: 0.6, energy: 0.8 },
    reactions: ['amoroso', 'encantado', 'ciumento', 'empolgado'],
  },
};

// ============================================================================
// 2. PROCEDURAL CHARACTER PROFILING
// ============================================================================
export function evaluateNpcConversationalProfile(npc: SlimeActor): NpcConversationalProfile {
  const dna = npc.proceduralDnaSeed ?? 1337;
  const tags = npc.allowedTags || [];
  const hpRatio = npc.maxHp > 0 ? npc.hp / npc.maxHp : 1.0;
  const hasShield = npc.shieldHp > 0;
  const exploredCount = npc.regionsExploredSinceLastChat ?? 0;

  // Base traits influenced by Tactical Personality
  let curiosity = 50;
  let boldness = 50;
  let irritability = 35;
  let warmth = 50;

  switch (npc.personality) {
    case 'berserker_frontal':
      boldness += 35;
      irritability += 30;
      warmth -= 25;
      curiosity -= 15;
      break;
    case 'assassino_flanco':
      curiosity += 20;
      irritability += 15;
      warmth -= 20;
      boldness += 10;
      break;
    case 'mago_artilheiro':
      curiosity += 35;
      boldness -= 10;
      warmth += 10;
      break;
    case 'flecheiro_kiter':
      curiosity += 25;
      boldness -= 15;
      warmth += 5;
      break;
    case 'invocador_enxame':
      curiosity += 30;
      warmth += 15;
      irritability += 10;
      break;
    default:
      // Balanced
      break;
  }

  // Elemental Tag Influence
  if (tags.includes('fogo')) { irritability += 20; boldness += 15; }
  if (tags.includes('trevas')) { irritability += 15; warmth -= 20; curiosity += 15; }
  if (tags.includes('agua') || tags.includes('sereno' as any)) { warmth += 25; irritability -= 20; }
  if (tags.includes('planta') || tags.includes('cura')) { warmth += 30; irritability -= 25; }
  if (tags.includes('luz')) { boldness += 20; warmth += 20; irritability -= 15; }
  if (tags.includes('gelo')) { warmth -= 15; boldness += 10; }
  if (tags.includes('toxico')) { irritability += 25; warmth -= 20; }

  // Physical State Modulation
  if (hpRatio < 0.35 || npc.isDesperate) {
    irritability += 25;
    boldness -= 40;
    warmth -= 15;
  } else if (hasShield) {
    boldness += 20;
  }

  if (npc.burnTimer && npc.burnTimer > 0) irritability += 30;
  if (npc.poisonTimer && npc.poisonTimer > 0) irritability += 25;
  if (npc.frozenTimer && npc.frozenTimer > 0) boldness -= 30;

  // Exploration Pride
  const explorationPride = Math.min(100, exploredCount * 28 + ((dna % 15)));
  curiosity = Math.min(100, Math.max(5, curiosity + exploredCount * 8));

  // Fatigue
  const fatigue = Math.min(100, Math.max(0, (1 - hpRatio) * 60 + (exploredCount > 4 ? 30 : 0)));

  // Ranked Preferred Emotions
  const preferred: TreeChatEmotionId[] = [];
  if (irritability > 70) preferred.push('furioso', 'ultra_furioso', 'nervoso');
  if (boldness > 65) preferred.push('corajoso', 'orgulhoso', 'empolgado');
  if (curiosity > 65) preferred.push('curioso', 'misterioso', 'desconfiado');
  if (warmth > 65) preferred.push('amigavel', 'amoroso', 'calmo', 'sereno');
  if (fatigue > 60) preferred.push('cansado', 'desinteressado', 'triste');
  if (preferred.length === 0) preferred.push('divertido', 'amigavel', 'curioso');

  return {
    curiosity: Math.min(100, Math.max(0, curiosity)),
    boldness: Math.min(100, Math.max(0, boldness)),
    irritability: Math.min(100, Math.max(0, irritability)),
    warmth: Math.min(100, Math.max(0, warmth)),
    explorationPride,
    fatigue,
    preferredEmotions: preferred,
  };
}

// ============================================================================
// 3. EARNED DIALOGUE INITIATION EVALUATION (ZERO BLIND RANDOM SELECTION)
// ============================================================================
export function evaluateDialogueInitiationAffinity(
  initiator: SlimeActor,
  target: SlimeActor
): DialogueInitiationEvaluation {
  // Rule: NPCs NEVER autonomously initiate conversations with the player! Only NPC-to-NPC.
  if (initiator.isPlayer || target.isPlayer) {
    return { canInitiate: false, intent: 'NENHUM', matchScore: 0, reason: 'Apenas o jogador inicia conversa com NPCs' };
  }

  // Gate 1: Cooldowns and ongoing sessions
  if (
    initiator.treeChatSessionId ||
    target.treeChatSessionId ||
    (initiator.treeChatBrawlTimer && initiator.treeChatBrawlTimer > 0) ||
    (target.treeChatBrawlTimer && target.treeChatBrawlTimer > 0) ||
    (initiator.socialCooldownTimer && initiator.socialCooldownTimer > 0) ||
    (target.socialCooldownTimer && target.socialCooldownTimer > 0)
  ) {
    return { canInitiate: false, intent: 'NENHUM', matchScore: 0, reason: 'Em cooldown ou ocupado' };
  }

  // Gate 2: Exploration requirement — dialogue must feel EARNED through wandering/discovery
  const initExplored = initiator.regionsExploredSinceLastChat ?? 0;
  const targetExplored = target.regionsExploredSinceLastChat ?? 0;
  const initDesire = initiator.socialDesire ?? 0;
  const targetDesire = target.socialDesire ?? 0;

  // An initiator needs at least 1-2 explored regions OR extreme social desire built up
  if (initExplored < 1 && initDesire < 85) {
    return {
      canInitiate: false,
      intent: 'NENHUM',
      matchScore: 0,
      reason: `Exploração insuficiente (${initExplored} regiões; desejo ${initDesire}/85)`,
    };
  }

  // Gate 3: Affinity, Species Kinship & DNA Bond Formulation
  const initTags = initiator.allowedTags || [];
  const targetTags = target.allowedTags || [];
  const sharedTags = initTags.filter((t) => targetTags.includes(t));
  const initHpRatio = initiator.maxHp > 0 ? initiator.hp / initiator.maxHp : 1.0;
  const sameSpecies = areSameSpecies(initiator, target);
  const bond = getOrCreateDnaBond(initiator, target);

  let intent: DialogueInitiationEvaluation['intent'] = 'COMPARTILHAR_DESCOBERTA';
  let matchScore = 0;

  // Distress: Low HP slime seeks emergency help or relief
  if (initHpRatio < 0.32 || initiator.isDesperate) {
    intent = 'PEDIR_SOCORRO';
    matchScore = 75 + (targetTags.includes('cura') ? 35 : 0);
  }
  // Existing Deep Bond or Same-Species Kinship (Romantic / Friendship / Same Asset Species)
  else if (sameSpecies || bond.affinity >= 20 || bond.romance >= 20) {
    intent = 'AFINIDADE_ELEMENTAL';
    matchScore =
      66 +
      (sameSpecies ? 26 : 0) +
      Math.max(0, bond.affinity * 0.35) +
      bond.romance * 0.4 +
      sharedTags.length * 10;
  }
  // Elemental Rivalry or Sworn Enemies
  else if (
    bond.affinity <= -20 ||
    (initTags.includes('fogo') && targetTags.includes('gelo')) ||
    (initTags.includes('gelo') && targetTags.includes('fogo')) ||
    (initTags.includes('luz') && targetTags.includes('trevas')) ||
    (initTags.includes('trevas') && targetTags.includes('luz'))
  ) {
    intent = 'CONFRONTO_TERRITORIAL';
    matchScore = 65 + (initExplored + targetExplored) * 8 + bond.rivalry * 0.35;
  }
  // Elemental Kinship: Shared tags create deep philosophical resonance
  else if (sharedTags.length > 0) {
    intent = 'AFINIDADE_ELEMENTAL';
    matchScore = 60 + sharedTags.length * 15 + initExplored * 6;
  }
  // General exploration boast: sharing discovered region lore
  else if (initExplored >= 2) {
    intent = 'COMPARTILHAR_DESCOBERTA';
    matchScore = 55 + initExplored * 12 + initDesire * 0.3;
  } else {
    intent = 'COMPARTILHAR_DESCOBERTA';
    matchScore = 40 + initDesire * 0.4;
  }

  // Same-species or bonded partners need slightly less exploration gate to approach each other
  const desireGate = sameSpecies || bond.affinity >= 25 || bond.romance >= 25 ? 52 : 65;
  const canInitiate = matchScore >= 60 && (initDesire >= desireGate || initExplored >= 2);

  return {
    canInitiate,
    intent,
    matchScore,
    reason: `Intenção: ${intent} | Score: ${Math.round(matchScore)} | Regiões: ${initExplored}`,
  };
}

// ============================================================================
// 4. PROCEDURAL OPTION GENERATOR (PULLS DEEP CONTEXT FROM PROFILES & REGIONS)
// ============================================================================
// ============================================================================
// HILARIOUS COMICAL NPC DIALECTS & VOCABULARY ENGINE
// Varied, comical, personality-driven slime & robot languages that sound hilarious
// ============================================================================
export const COMICAL_NPC_DIALECTS: Record<string, Partial<Record<TreeChatEmotionId, string[]>>> = {
  slime_ignis: {
    divertido: ['Kraka bloo!', 'Tchibum zorb!', 'Grani prili!', 'Vroom lili!', 'Blibli krak!'],
    exagerado_divertido: ['KRAKABOOM ZORBA!', 'Globeryss krak!', 'Zumba grani!', 'Wubba vrrrak!', 'BLibLI KRAKA!'],
    furioso: ['GRAAAANINI KRAK!', 'Vrrrakash mor!', 'Grubba zorbak!', 'Rrr klin!', 'ZRAK GRANINI!'],
    ultra_furioso: ['IG GRANIIIIII LILIL!', 'GRAAAKOOM MOR!', 'ZORBA KRAKASH!', 'KRUSHU ZLORP!'],
    desinteressado: ['Fluff krak...', 'Meh grani...', 'Zzz vrrr...', 'Boora blobbo.'],
    curioso: ['Krakablu klin?', 'Vrrr zola?', 'Grani plip?', 'Zorbi luka?'],
    amigavel: ['Broda krak!', 'Grani shulala!', 'Kumpa zorb!', 'Yupi bloob!'],
    sarcastico: ['Pffft kraka...', 'Heh grani...', 'Tss zorbak...', 'Nyah blobbo.'],
    assustado: ['Uwaaa krak!', 'Eeeek grani!', 'Zuuu klin!', 'Wibbi zorb!'],
    orgulhoso: ['Rexi grani!', 'Tadaa krak!', 'Zorba luxi!', 'Kampa bloob!'],
  },
  slime_aero: {
    divertido: ['Piu-piu fwoosh!', 'Chiku prilili!', 'Zuuuum bloo!', 'Pipi wubba!', 'Lilli fwoosh!'],
    exagerado_divertido: ['FWOOSH GLOBERYS!', 'Piu-piu wahoo!', 'Zumba chiku!', 'Blibli zuuum!', 'WUBBA PIU!'],
    furioso: ['PIU GRAAAANINI!', 'Chiku zrak!', 'Fwoosh krakash!', 'Brrr piuuu!'],
    ultra_furioso: ['ZUUUUM GRAAAKOOM!', 'PIU-PIU KRAKASH!', 'CHIKU ZLORP!', 'FWOOSH KLIN!'],
    desinteressado: ['Zzz fwoosh...', 'Fluff chiku...', 'Meh piuuu...', 'Plip buh.'],
    curioso: ['Chiku plip?', 'Piu-piu zola?', 'Fwoosh lili?', 'Kiki blorp?'],
    amigavel: ['Chiku kumpa!', 'Fwoosh shulala!', 'Piu-piu broda!', 'Yupi chiku!'],
    sarcastico: ['Tss chiku...', 'Heh fwoosh...', 'Yaya piuuu...', 'Znarf bloo.'],
    assustado: ['Piuuu uwaaa!', 'Chiku eeeek!', 'Fwoosh klin!', 'Yiki bloo!'],
    orgulhoso: ['Luxi fwoosh!', 'Tadaa chiku!', 'Bravu piuuu!', 'Rexi wub!'],
  },
  slime_tox: {
    divertido: ['Bzzzt zlorp!', 'Glubba prilili!', 'Zizi bloob!', 'Slurpi wub!', 'Keke zlorp!'],
    exagerado_divertido: ['BZZZT GLOBERYS!', 'Zlorp wahoo!', 'Glubba krakaboom!', 'Zumba bzzzt!', 'WUBBA ZLORP!'],
    furioso: ['BZZZT GRAAAANINI!', 'Zlorp vrrrakash!', 'Glubba zrak!', 'Klin bzzzt!', 'Rrr slurpi!'],
    ultra_furioso: ['BZZZT GRAAAKOOM!', 'ZLORP KRUSHU!', 'GLUBBA KRAKASH!', 'IG GRANIIIIII BZZZT!'],
    desinteressado: ['Slurpi fluff...', 'Zzz bzzzt...', 'Meh glubba...', 'Boora zlorp.'],
    curioso: ['Bzzzt plip?', 'Zlorp zola?', 'Glubba broli?', 'Slurpi klin?'],
    amigavel: ['Bzzzt kumpa!', 'Zlorp shulala!', 'Glubba broda!', 'Miko bzzzt!'],
    sarcastico: ['Heh zlorp...', 'Tss bzzzt...', 'Znarf glubba...', 'Pffft slurpi.'],
    assustado: ['Bzzzt uwaaa!', 'Zlorp eeeek!', 'Glubba klin!', 'Spuki bzzzt!'],
    orgulhoso: ['Rexi zlorp!', 'Tadaa bzzzt!', 'Kampa glubba!', 'Luxi slurpi!'],
  },
  slime_astra: {
    divertido: ['Alakazoo prili!', 'Zuloo litli!', 'Shulala bloo!', 'Mima prilili!', 'Koko zuloo!'],
    exagerado_divertido: ['ALAKAZOO GLOBERYS!', 'Zuloo krakaboom!', 'Shulala wahoo!', 'Mima blasto!', 'ZUMBA ZULOO!'],
    furioso: ['ZULOO GRAAAANINI!', 'Alakazoo zrak!', 'Nigma vrrrakash!', 'Klin zuloo!'],
    ultra_furioso: ['ALAKAZOO GRAAAKOOM!', 'ZULOO KRAKASH!', 'NIGMA KRUSHU!', 'IG GRANIIIIII ZULOO!'],
    desinteressado: ['Ommm fluff...', 'Zzz zuloo...', 'Meh alakazoo...', 'Boora shuli.'],
    curioso: ['Alakazoo plip?', 'Zuloo kwesti?', 'Nigma broli?', 'Shuli zola?'],
    amigavel: ['Zuloo shulala!', 'Alakazoo kumpa!', 'Mima broda!', 'Sola prilili!'],
    sarcastico: ['Tss zuloo...', 'Heh alakazoo...', 'Nyah shuli...', 'Pffft nigma.'],
    assustado: ['Zuloo uwaaa!', 'Alakazoo klin!', 'Wooo plop!', 'Eeeek shuli!'],
    orgulhoso: ['Luxi zuloo!', 'Tadaa alakazoo!', 'Maga prilili!', 'Bravu shuli!'],
  },
  player_slime: {
    divertido: ['Lilli prilili!', 'Bloob litli!', 'Tiki-bloo wub!', 'Jollu prilili!', 'Pipi lulula!'],
    exagerado_divertido: ['GLOBERYS WAHOO!', 'Wubba zulu!', 'Krakaboom lili!', 'Blibli blasto!', 'ZUMBA LAKA!'],
    furioso: ['GRAAAANINI BLOOB!', 'Vrrrakash klin!', 'Grubba krak!', 'Zorba rrr!', 'ZRAK LILI!'],
    ultra_furioso: ['IG GRANIIIIII LILIL!', 'GRAAAKOOM ZORBA!', 'KRUSHU MOR!', 'Urrgh KRAKASH!'],
    desinteressado: ['Fluff fluff...', 'Meh bloob...', 'Boora buh...', 'Zzz plop.'],
    curioso: ['Humm broli?', 'Plip lili?', 'Kiki zola?', 'Blorp luka?'],
    amigavel: ['Yupi prilili!', 'Broda bloob!', 'Kumpa shulala!', 'Miko lili!'],
    sarcastico: ['Heh brrrli...', 'Tss globby...', 'Znarf lili...', 'Yaya plop.'],
    assustado: ['Uwaaa klin!', 'Eeeek bobo!', 'Yiki lili!', 'Wibbi bloo!'],
    orgulhoso: ['Tadaa grani!', 'Rexi bloob!', 'Luxi prilili!', 'Kampa zulu!'],
  },
};

export function generateProceduralPillOptions(
  speaker: SlimeActor,
  listener: SlimeActor,
  lastEmotion: TreeChatEmotionId | null,
  tension: number,
  round: number
): [TreeChatPillOption, TreeChatPillOption, TreeChatPillOption] {
  const profile = evaluateNpcConversationalProfile(speaker);
  const targetProfile = evaluateNpcConversationalProfile(listener);
  const regionName = speaker.currentRegionName || 'Arena Central';

  let selectedEmotions: [TreeChatEmotionId, TreeChatEmotionId, TreeChatEmotionId];

  // Canonical Opening Turn (Round 1)
  if (!lastEmotion || round <= 1) {
    // Slot 1: Explorer's Dominant Trait (Curious, Proud, Friendly, Brave)
    let slot1: TreeChatEmotionId = 'divertido';
    if (profile.explorationPride > 60) slot1 = 'orgulhoso';
    else if (profile.curiosity > 60) slot1 = 'curioso';
    else if (profile.warmth > 60) slot1 = 'amigavel';
    else if (profile.boldness > 60) slot1 = 'corajoso';

    // Slot 2: Deep Emotion (Affection, Serenity, Optimism, Wonder)
    let slot2: TreeChatEmotionId = 'amoroso';
    if (profile.warmth > 65) slot2 = 'encantado';
    else if (profile.curiosity > 55) slot2 = 'misterioso';
    else if (profile.boldness > 70) slot2 = 'empolgado';
    else slot2 = 'otimista';

    // Slot 3: Spicy / Antagonistic / Tension Option (Irritated, Sarcastic, Furious, Suspicious)
    let slot3: TreeChatEmotionId = 'furioso';
    if (profile.irritability > 65) slot3 = tension > 50 ? 'ultra_furioso' : 'furioso';
    else if (profile.curiosity > 50) slot3 = 'desconfiado';
    else slot3 = 'sarcastico';

    selectedEmotions = [slot1, slot2, slot3];
  }
  // Canonical Follow-up to "Divertido" (Preserves prompt's exact Sims example)
  else if (lastEmotion === 'divertido') {
    selectedEmotions = ['divertido', 'exagerado_divertido', 'desinteressado'];
  }
  // Canonical Follow-up to "Desinteressado" (Fluff fluff -> show curiosity, stay calm, or get annoyed)
  else if (lastEmotion === 'desinteressado') {
    const slot3 = profile.irritability > 50 ? 'furioso' : 'divertido';
    selectedEmotions = ['curioso', 'calmo', slot3];
  }
  // Canonical Follow-up to "Furioso" (Graaaanini -> escalate to ultra_furioso, sarcastic, or fearful/calm)
  else if (lastEmotion === 'furioso') {
    const slot2 = profile.boldness > 50 ? 'sarcastico' : 'furioso';
    const slot3 = profile.boldness < 40 ? 'assustado' : 'calmo';
    selectedEmotions = ['ultra_furioso', slot2, slot3];
  }
  // Contextual Dynamic Response based on emotional reactions pool
  else {
    const def = MASSIVE_TREECHAT_EMOTIONS[lastEmotion] || MASSIVE_TREECHAT_EMOTIONS['divertido'];
    const candidates = [...def.reactions];

    // High tension bias: add intense emotions if tension is rising
    if (tension >= 65 && !candidates.includes('ultra_furioso')) {
      candidates.push('ultra_furioso', 'furioso');
    }
    // High warmth bias: add soothing emotions
    if (profile.warmth > 65 && !candidates.includes('calmo')) {
      candidates.push('calmo', 'sereno', 'aliviado');
    }

    // DNA Relationship & Same-Species bias: inject romantic, friendly, or rival options!
    const bond = getOrCreateDnaBond(speaker, listener);
    if (bond.sameSpecies || bond.romance >= 18 || bond.affinity >= 22) {
      if (!candidates.includes('amoroso')) candidates.push('amoroso');
      if (!candidates.includes('encantado')) candidates.push('encantado');
      if (bond.romance >= 30 && !candidates.includes('apaixonado')) {
        candidates.push('apaixonado');
      }
      if (!candidates.includes('amigavel')) candidates.push('amigavel');
    }
    if (bond.affinity <= -20 || bond.rivalry >= 30) {
      if (!candidates.includes('furioso')) candidates.push('furioso');
      if (!candidates.includes('desconfiado')) candidates.push('desconfiado');
    }

    // Rank candidates by compatibility with speaker profile & DNA bond
    const scored = candidates.map((emId) => {
      const eDef = MASSIVE_TREECHAT_EMOTIONS[emId];
      let score = 50;
      if (profile.preferredEmotions.includes(emId)) score += 40;
      score += eDef.affinityVector.curiosity * (profile.curiosity - 50);
      score += eDef.affinityVector.hostility * (profile.irritability - 50);
      score += eDef.affinityVector.warmth * (profile.warmth - 50);
      score += eDef.affinityVector.bravery * (profile.boldness - 50);
      return { emId, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const chosen: TreeChatEmotionId[] = [];
    for (const item of scored) {
      if (!chosen.includes(item.emId) && chosen.length < 3) {
        chosen.push(item.emId);
      }
    }
    while (chosen.length < 3) {
      const fallbacks: TreeChatEmotionId[] = ['divertido', 'curioso', 'calmo', 'furioso'];
      for (const fb of fallbacks) {
        if (!chosen.includes(fb) && chosen.length < 3) chosen.push(fb);
      }
    }

    selectedEmotions = [chosen[0], chosen[1], chosen[2]];
  }

  // Phrase selection incorporating comical NPC dialects, regional lore, and hilarious invented gibberish
  const pickPhrase = (emotionId: TreeChatEmotionId, slotIdx: number): string => {
    const speakerKey = speaker.isPlayer ? 'player_slime' : speaker.id;
    const dialect = COMICAL_NPC_DIALECTS[speakerKey];

    const dnaOffset = Math.abs((speaker.proceduralDnaSeed ?? 1337) + round * 5 + slotIdx * 7);

    // 1. Check custom character comical dialect
    if (dialect && dialect[emotionId] && dialect[emotionId]!.length > 0) {
      const list = dialect[emotionId]!;
      return list[dnaOffset % list.length];
    }

    // 2. Biome-specific custom phrases for high exploration pride (100% invented gibberish)
    if (profile.explorationPride > 65 && slotIdx === 0) {
      if (regionName.includes('Obsidiana') || regionName.includes('Magma')) return 'Obsidia krak!';
      if (regionName.includes('Glacial') || regionName.includes('Gelo')) return 'Frelia chiku!';
      if (regionName.includes('Éden') || regionName.includes('Verde')) return 'Edena shululu!';
      if (regionName.includes('Quimtec') || regionName.includes('Veneno')) return 'Zlorpi bzzzt!';
      if (regionName.includes('Vazio')) return 'Abysso vrr!';
    }

    // 3. Default fallback from massive emotions registry (100% short funny non-existent words)
    const def = MASSIVE_TREECHAT_EMOTIONS[emotionId];
    const phraseList = def ? def.phrases : ['Lilli prilili'];
    return phraseList[dnaOffset % phraseList.length];
  };

  return [
    { emotionId: selectedEmotions[0], phrase: pickPhrase(selectedEmotions[0], 0) },
    { emotionId: selectedEmotions[1], phrase: pickPhrase(selectedEmotions[1], 1) },
    { emotionId: selectedEmotions[2], phrase: pickPhrase(selectedEmotions[2], 2) },
  ];
}

// ============================================================================
// 5. PROCEDURAL SELECTION LOGIC (REPLACES Math.random() WITH UTILITY SCORING)
// ============================================================================
export function selectPillOptionByProceduralStats(
  speaker: SlimeActor,
  listener: SlimeActor,
  options: [TreeChatPillOption, TreeChatPillOption, TreeChatPillOption],
  tension: number,
  round: number
): { selectedIndex: number; rationale: string; emotionId: TreeChatEmotionId } {
  const profile = evaluateNpcConversationalProfile(speaker);
  const scores = options.map((opt, idx) => {
    const def = MASSIVE_TREECHAT_EMOTIONS[opt.emotionId];
    if (!def) return { idx, score: 0, rationale: 'Padrão', emotionId: opt.emotionId };

    let score = 50;

    // 1. Alignment with Speaker's Personality Vector
    score += def.affinityVector.hostility * (profile.irritability - 50) * 0.8;
    score += def.affinityVector.bravery * (profile.boldness - 50) * 0.8;
    score += def.affinityVector.warmth * (profile.warmth - 50) * 0.7;
    score += def.affinityVector.curiosity * (profile.curiosity - 50) * 0.7;
    score += def.affinityVector.energy * (50 - profile.fatigue) * 0.5;

    // 2. Preferred Emotion bonus
    if (profile.preferredEmotions.includes(opt.emotionId)) {
      score += 25;
    }

    // 3. Tension Dynamics:
    // If tension is dangerous (>70), aggressive slimes double down; peaceful slimes try to cool down
    if (tension >= 70) {
      if (profile.irritability > 60 && def.affinityVector.hostility > 0.3) {
        score += 35; // Escalation towards brawl
      } else if (profile.warmth > 55 && def.tensionDelta < 0) {
        score += 35; // De-escalation attempt
      }
    }

    // 4. Physical state reactivity: Injured slimes prioritize self-preservation or distress
    const hpRatio = speaker.maxHp > 0 ? speaker.hp / speaker.maxHp : 1.0;
    if (hpRatio < 0.35) {
      if (opt.emotionId === 'ansioso' || opt.emotionId === 'choroso' || opt.emotionId === 'cansado') {
        score += 30;
      }
    }

    // 5. DNA Relationship & Same-Species Chemistry Influence
    const bond = getOrCreateDnaBond(speaker, listener);
    if (bond.sameSpecies || bond.romance >= 20) {
      if (
        opt.emotionId === 'amoroso' ||
        opt.emotionId === 'encantado' ||
        opt.emotionId === 'apaixonado'
      ) {
        score += 34 + bond.romance * 0.45 + (bond.sameSpecies ? 18 : 0);
      }
    }
    if (bond.affinity >= 20 && def.affinityVector.warmth > 0.4) {
      score += 24 + bond.affinity * 0.25;
    }
    if ((bond.affinity <= -20 || bond.rivalry >= 30) && def.affinityVector.hostility > 0.4) {
      score += 26 + bond.rivalry * 0.35;
    }

    // 6. Subtle DNA consistency jitter (deterministic per speaker and round, NOT blind RNG)
    const dnaJitter = ((speaker.proceduralDnaSeed ?? 1337) * 7 + round * 11 + idx * 13) % 15;
    score += dnaJitter;

    let rationale = `Afinidade com perfil (${Math.round(score)} pts)`;
    if (profile.preferredEmotions.includes(opt.emotionId)) rationale = `Personalidade ${speaker.personality || 'NPC'}`;
    if (tension > 70 && def.affinityVector.hostility > 0.5) rationale = 'Reação explosiva à tensão alta';

    return { idx, score, rationale, emotionId: opt.emotionId };
  });

  // Pick the option with the highest calculated utility score
  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  return {
    selectedIndex: best.idx,
    rationale: best.rationale,
    emotionId: best.emotionId,
  };
}

// ============================================================================
// 6. SHORT EMOTION STATE LABELS FOR DIALOGUE PILLS (DISPLAYS STATE INSTEAD OF PHRASE)
// ============================================================================
const SHORT_EMOTION_PILL_LABELS: Record<TreeChatEmotionId, string> = {
  divertido: 'DIVERTIDO',
  exagerado_divertido: 'EUFÓRICO',
  desinteressado: 'ENTEDIADO',
  furioso: 'RAIVA',
  ultra_furioso: 'FÚRIA',
  amoroso: 'AMOROSO',
  encantado: 'ENCANTADO',
  curioso: 'CURIOSO',
  sarcastico: 'SARCÁSTICO',
  calmo: 'CALMO',
  triste: 'TRISTE',
  assustado: 'ASSUSTADO',
  orgulhoso: 'ORGULHOSO',
  travesso: 'TRAVESSO',
  confuso: 'CONFUSO',
  empolgado: 'EMPOLGADO',
  amigavel: 'AMIGÁVEL',
  choroso: 'CHOROSO',
  misterioso: 'MISTERIOSO',
  otimista: 'OTIMISTA',
  cansado: 'CANSADO',
  assombrado: 'ASSOMBRADO',
  esperancoso: 'ESPERANÇOSO',
  preocupado: 'PREOCUPADO',
  decepcionado: 'DECEPCIONADO',
  sereno: 'SERENO',
  corajoso: 'CORAJOSO',
  ansioso: 'ANSIOSO',
  desconfiado: 'DESCONFIADO',
  saudoso: 'SAUDOSO',
  ciumento: 'CIUMENTO',
  aliviado: 'ALIVIADO',
  nervoso: 'NERVOSO',
  inseguro: 'INSEGURO',
  grato: 'GRATO',
  apaixonado: 'APAIXONADO',
};

export function getShortEmotionPillStateLabel(emotionId: TreeChatEmotionId): string {
  return SHORT_EMOTION_PILL_LABELS[emotionId] || 'CURIOSO';
}

// ============================================================================
// 7. DNA RELATIONSHIP TREE & SPECIES KINSHIP ENGINE (PER-ID BONDS & CAPSULES)
// ============================================================================
export const RELATIONSHIP_TIER_META: Record<
  RelationshipTierId,
  { label: string; textColor: string; borderColor: string }
> = {
  inimigo_mortal: {
    label: 'INIMIGO MORTAL',
    textColor: '#FF2A4B',
    borderColor: '#FF2A4B',
  },
  inimigo: {
    label: 'INIMIGO',
    textColor: '#FB7185',
    borderColor: '#F43F5E',
  },
  rival: {
    label: 'RIVAL',
    textColor: '#FDBA74',
    borderColor: '#F97316',
  },
  desconhecido: {
    label: 'DESCONHECIDO',
    textColor: '#94A3B8',
    borderColor: '#475569',
  },
  conhecido: {
    label: 'CONHECIDO',
    textColor: '#38BDF8',
    borderColor: '#0EA5E9',
  },
  amigo: {
    label: 'AMIGO',
    textColor: '#34D399',
    borderColor: '#10B981',
  },
  melhor_amigo: {
    label: 'MELHOR AMIGO',
    textColor: '#2DD4BF',
    borderColor: '#14B8A6',
  },
  paquera: {
    label: 'PAQUERA',
    textColor: '#F9A8D4',
    borderColor: '#F472B6',
  },
  par_romantico: {
    label: 'PAR ROMÂNTICO',
    textColor: '#F472B6',
    borderColor: '#EC4899',
  },
  alma_gemea: {
    label: 'ALMA GÊMEA',
    textColor: '#E879F9',
    borderColor: '#D946EF',
  },
};

/**
 * Detects if two characters share the same species (same custom PNG asset folder/sprites
 * or same procedural elemental species). Same-species characters bond and fall in love faster!
 */
export function areSameSpecies(a: SlimeActor, b: SlimeActor): boolean {
  if (!a || !b || a.id === b.id) return false;

  const spA = a.customSprites;
  const spB = b.customSprites;
  const hasCustomA = Boolean(spA && (spA.down || spA.right || spA.left || spA.up));
  const hasCustomB = Boolean(spB && (spB.down || spB.right || spB.left || spB.up));

  if (hasCustomA && hasCustomB && spA && spB) {
    // 1. Exact sprite URL match
    if (
      (spA.downUrl && spA.downUrl === spB.downUrl) ||
      (spA.rightUrl && spA.rightUrl === spB.rightUrl)
    ) {
      return true;
    }
    // 2. Folder species name match (e.g., "goblin_1" and "goblin_2" -> "goblin")
    if (spA.folderName && spB.folderName) {
      const cleanA = spA.folderName.toLowerCase().replace(/[\s_-]*\d+$/, '').trim();
      const cleanB = spB.folderName.toLowerCase().replace(/[\s_-]*\d+$/, '').trim();
      if (cleanA.length >= 2 && cleanA === cleanB) {
        return true;
      }
    }
    return false;
  }

  // If both use procedural slime bodies, compare elemental palette or >= 2 shared elemental tags
  if (!hasCustomA && !hasCustomB) {
    if (a.defaultPalette === b.defaultPalette || a.color === b.color) {
      return true;
    }
    const tagsA = a.allowedTags || [];
    const tagsB = b.allowedTags || [];
    const shared = tagsA.filter((t) => tagsB.includes(t)).length;
    return shared >= 2;
  }

  return false;
}

export function computeRelationshipTier(
  affinity: number,
  romance: number,
  trust: number,
  rivalry: number
): RelationshipTierId {
  if (affinity <= -65 || rivalry >= 75) return 'inimigo_mortal';
  if (affinity <= -35 || rivalry >= 50) return 'inimigo';
  if (affinity <= -15 || rivalry >= 28) return 'rival';
  if (romance >= 72 && affinity >= 60) return 'alma_gemea';
  if (romance >= 44 && affinity >= 36) return 'par_romantico';
  if (romance >= 24 && affinity >= 18) return 'paquera';
  if (affinity >= 62 && trust >= 35) return 'melhor_amigo';
  if (affinity >= 30) return 'amigo';
  if (affinity >= 12) return 'conhecido';
  return 'desconhecido';
}

export function getOrCreateDnaBond(actorA: SlimeActor, actorB: SlimeActor): DnaRelationshipBond {
  if (!actorA.dnaBonds) actorA.dnaBonds = {};
  if (!actorB.dnaBonds) actorB.dnaBonds = {};

  let bondA = actorA.dnaBonds[actorB.id];
  if (!bondA) {
    const sameSpec = areSameSpecies(actorA, actorB);
    const initAff = sameSpec ? 18 : 0;
    const initRom = sameSpec ? 12 : 0;
    const initTrust = sameSpec ? 14 : 0;
    const initTier = computeRelationshipTier(initAff, initRom, initTrust, 0);

    bondA = {
      targetId: actorB.id,
      affinity: initAff,
      romance: initRom,
      trust: initTrust,
      rivalry: 0,
      interactionsCount: 0,
      sameSpecies: sameSpec,
      tier: initTier,
    };
    actorA.dnaBonds[actorB.id] = bondA;
  } else {
    bondA.sameSpecies = areSameSpecies(actorA, actorB);
  }

  if (!actorB.dnaBonds[actorA.id]) {
    actorB.dnaBonds[actorA.id] = {
      ...bondA,
      targetId: actorA.id,
    };
  }

  return bondA;
}

/**
 * Displays the colored-text-only Relationship Capsule on BOTH characters simultaneously
 * when they reach or advance a state in the Relationship Tree!
 */
export function triggerRelationshipCapsuleOnBoth(
  actorA: SlimeActor,
  actorB: SlimeActor,
  tier: RelationshipTierId,
  duration: number = 4.2
) {
  if (tier === 'desconhecido') return;
  const meta = RELATIONSHIP_TIER_META[tier];
  if (!meta) return;

  actorA.relationshipCapsule = {
    tier,
    label: meta.label,
    textColor: meta.textColor,
    borderColor: meta.borderColor,
    timer: duration,
    maxTimer: duration,
    partnerId: actorB.id,
  };

  actorB.relationshipCapsule = {
    tier,
    label: meta.label,
    textColor: meta.textColor,
    borderColor: meta.borderColor,
    timer: duration,
    maxTimer: duration,
    partnerId: actorA.id,
  };
}

/**
 * Updates the bidirectional DNA Relationship Bond between speaker and listener based on a chosen TreeChat emotion.
 * Automatically triggers the colored-text relationship capsule on both characters when advancing a tier!
 */
export function applyEmotionToDnaBond(
  speaker: SlimeActor,
  listener: SlimeActor,
  emotionId: TreeChatEmotionId
): {
  bond: DnaRelationshipBond;
  tierChanged: boolean;
  newTier: RelationshipTierId;
} {
  const bondA = getOrCreateDnaBond(speaker, listener);
  const bondB = listener.dnaBonds![speaker.id];
  const def = MASSIVE_TREECHAT_EMOTIONS[emotionId];
  const prevTier = bondA.tier;

  const sameSpeciesMul = bondA.sameSpecies ? 1.55 : 1.0;

  let dAffinity = 0;
  let dRomance = 0;
  let dTrust = 0;
  let dRivalry = 0;

  // Romantic / Passionate Emotions
  if (emotionId === 'apaixonado' || emotionId === 'amoroso' || emotionId === 'encantado') {
    dRomance = (emotionId === 'apaixonado' ? 22 : emotionId === 'amoroso' ? 18 : 14) * sameSpeciesMul;
    dAffinity = (emotionId === 'apaixonado' ? 16 : 13) * sameSpeciesMul;
    dTrust = 10 * sameSpeciesMul;
    dRivalry = -12;
  }
  // Friendly / Joyful / Grateful Emotions
  else if (
    emotionId === 'amigavel' ||
    emotionId === 'divertido' ||
    emotionId === 'exagerado_divertido' ||
    emotionId === 'empolgado' ||
    emotionId === 'grato' ||
    emotionId === 'otimista' ||
    emotionId === 'esperancoso'
  ) {
    dAffinity = 14 * sameSpeciesMul;
    dTrust = 12 * sameSpeciesMul;
    dRomance = (bondA.sameSpecies || bondA.romance >= 15 ? 8 : 3) * sameSpeciesMul;
    dRivalry = -10;
  }
  // Calm / Serene / Relieved / Curious Emotions
  else if (
    emotionId === 'calmo' ||
    emotionId === 'sereno' ||
    emotionId === 'aliviado' ||
    emotionId === 'curioso' ||
    emotionId === 'orgulhoso' ||
    emotionId === 'corajoso'
  ) {
    dAffinity = 9 * sameSpeciesMul;
    dTrust = 8 * sameSpeciesMul;
    dRomance = bondA.sameSpecies ? 5 : 1;
    dRivalry = -6;
  }
  // Hostile / Angry / Jealous / Sarcastic Emotions
  else if (
    emotionId === 'ultra_furioso' ||
    emotionId === 'furioso' ||
    emotionId === 'ciumento' ||
    emotionId === 'sarcastico' ||
    emotionId === 'desconfiado' ||
    emotionId === 'nervoso'
  ) {
    const severity = emotionId === 'ultra_furioso' ? 1.5 : emotionId === 'furioso' ? 1.2 : 0.85;
    dAffinity = -16 * severity;
    dTrust = -14 * severity;
    dRivalry = 18 * severity;
    if (emotionId === 'ciumento' && bondA.romance > 15) {
      dRomance = -6;
    } else {
      dRomance = -10 * severity;
    }
  } else {
    // Neutral / Sad / Bored / Confused
    dAffinity = def ? def.affinityVector.warmth * 8 - def.affinityVector.hostility * 8 : 2;
    dTrust = def ? def.affinityVector.warmth * 6 : 1;
  }

  bondA.affinity = Math.max(-100, Math.min(100, bondA.affinity + dAffinity));
  bondA.romance = Math.max(0, Math.min(100, bondA.romance + dRomance));
  bondA.trust = Math.max(-100, Math.min(100, bondA.trust + dTrust));
  bondA.rivalry = Math.max(0, Math.min(100, bondA.rivalry + dRivalry));
  bondA.interactionsCount += 1;

  const newTier = computeRelationshipTier(bondA.affinity, bondA.romance, bondA.trust, bondA.rivalry);
  bondA.tier = newTier;

  // Sync mirror bond on listener
  bondB.affinity = bondA.affinity;
  bondB.romance = bondA.romance;
  bondB.trust = bondA.trust;
  bondB.rivalry = bondA.rivalry;
  bondB.interactionsCount = bondA.interactionsCount;
  bondB.sameSpecies = bondA.sameSpecies;
  bondB.tier = newTier;

  const tierChanged = newTier !== prevTier;
  if (tierChanged && newTier !== 'desconhecido') {
    triggerRelationshipCapsuleOnBoth(speaker, listener, newTier, 4.5);
  }

  // If they just reached or reinforced a Romantic Bond ('par_romantico' or 'alma_gemea'), link them as snuggle partners!
  if (newTier === 'par_romantico' || newTier === 'alma_gemea') {
    speaker.romanticSnugglePartnerId = listener.id;
    listener.romanticSnugglePartnerId = speaker.id;
  } else if (newTier === 'inimigo' || newTier === 'inimigo_mortal') {
    if (speaker.romanticSnugglePartnerId === listener.id) speaker.romanticSnugglePartnerId = null;
    if (listener.romanticSnugglePartnerId === speaker.id) listener.romanticSnugglePartnerId = null;
  }

  return { bond: bondA, tierChanged, newTier };
}

/**
 * Updates DNA Relationship Bond from real arena actions (e.g. attacking or healing an NPC).
 */
export function applyCombatActionToDnaBond(
  actor: SlimeActor,
  target: SlimeActor,
  actionType: 'attack' | 'heal'
) {
  if (!actor || !target || actor.id === target.id) return;
  const bondA = getOrCreateDnaBond(actor, target);
  const bondB = target.dnaBonds![actor.id];
  const prevTier = bondA.tier;

  if (actionType === 'attack') {
    bondA.affinity = Math.max(-100, bondA.affinity - 14);
    bondA.trust = Math.max(-100, bondA.trust - 16);
    bondA.rivalry = Math.min(100, bondA.rivalry + 18);
    bondA.romance = Math.max(0, bondA.romance - 12);
  } else {
    const mul = bondA.sameSpecies ? 1.45 : 1.0;
    bondA.affinity = Math.min(100, bondA.affinity + 16 * mul);
    bondA.trust = Math.min(100, bondA.trust + 18 * mul);
    bondA.rivalry = Math.max(0, bondA.rivalry - 15);
    bondA.romance = Math.min(100, bondA.romance + 8 * mul);
  }

  const newTier = computeRelationshipTier(bondA.affinity, bondA.romance, bondA.trust, bondA.rivalry);
  bondA.tier = newTier;
  bondB.affinity = bondA.affinity;
  bondB.romance = bondA.romance;
  bondB.trust = bondA.trust;
  bondB.rivalry = bondA.rivalry;
  bondB.tier = newTier;

  if (newTier !== prevTier && newTier !== 'desconhecido') {
    triggerRelationshipCapsuleOnBoth(actor, target, newTier, 4.2);
  }
}

