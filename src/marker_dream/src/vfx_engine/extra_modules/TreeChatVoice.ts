// ============================================================================
// MODULE: extra_modules/TreeChatVoice.ts
// 100% Cute Creature ("Criaturinhas Fofas / Kawaii") Voice Engine (30 Voices)
// - Eliminates all thick/heavy/male bass voices ("vozes grossas").
// - Automatically selects bright Female / Kawaii system TTS voices and locks pitch
//   into the sweet high creature register (1.68x to 2.00x) with lively cadence.
// - Pairs speech with a High-Pass (>480Hz) Kawaii Vocal Sweetener (Slime droplets,
//   Pikmin chirps, Animalese vowel hops, Luma bell chimes, Neko purrs, and Chao coos)
//   using pure Sine/Triangle harmonics and zero low-frequency mud.
// ============================================================================

import { SlimeActor, SlimePersonality } from '../vfx/types';
import { TreeChatEmotionId } from '../vfx/modules/treeChatProceduralStatsModule';
import {
  FishGeneratedAudioItem,
  loadFishAudioGallery,
  stripFishAudioTags,
} from './FishAudioStudio';

export interface NpcGalleryVoiceAssignment {
  npcId: string;
  primaryVoiceId: string;
  primaryVoiceName: string;
  assignedClipIds: string[];
  clipCursor: number;
  lastSpokenAt: number;
}

export type VoiceEffectPresetType =
  | 'FOFA_ANIMALESE'
  | 'FOFA_BOLHA_SLIME'
  | 'FOFA_PIKMIN_PIU'
  | 'FOFA_CHAO_SONIC'
  | 'FOFA_NEKO_MIAU'
  | 'FOFA_LUMA_ESTRELINHA'
  | 'FOFA_PUDIM_BOING'
  | 'FOFA_KOROK_FLORESTA'
  | 'FOFA_GOTA_AGUA'
  | 'FOFA_ABELHINHA';

export interface PersonalityVoiceProfile {
  voiceId: string;
  name: string;
  defaultNpcId?: string;
  register: 'AGUDO'; // 100% Cute high-pitched creature voices (zero thick/grave voices!)
  effectType: VoiceEffectPresetType;
  toneDescription: string;
  graveDescription: string;
  samplePhrase: string;
  ttsPitch: number;        // Locked in cute high range: 1.68 to 2.00
  ttsRate: number;         // Lively cute creature speed: 1.30 to 1.82
  bassFrequency: number;   // Sweet high melodic frequency (560Hz - 1280Hz, zero low bass!)
  bassGainDb: number;      // Brightness / Bell shimmer (+1 to +6 dB)
  roboticModFreq: number;  // Cute vibrato / chirp bounce rate (8Hz - 24Hz)
  distortion: number;      // Kept ultra-clean (0.01 - 0.08) so voices stay soft & cute
}

export interface AcousticRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
  volumeAlpha: number;
}

/**
 * Complete catalog of 30 Cute Creature ("Criaturinhas Fofas") Voices (VOX-00 to VOX-29).
 * Zero thick/bass voices — every single voice is bright, sweet, soft, and adorable!
 */
export const VOICE_CATALOG: PersonalityVoiceProfile[] = [
  {
    voiceId: 'VOX-00-HERO-NOBLE',
    name: 'Slimezinho Herói Fofo',
    defaultNpcId: 'player_slime',
    register: 'AGUDO',
    effectType: 'FOFA_CHAO_SONIC',
    toneDescription: 'Vozinha Doce e Corajosa estilo Chao (Pitch 1.84)',
    graveDescription: 'Zero Grave • Timbre Fofo e Cristalino (720Hz)',
    samplePhrase: 'Lilli prilili! Bloob litli!',
    ttsPitch: 1.84,
    ttsRate: 1.45,
    bassFrequency: 720,
    bassGainDb: 3,
    roboticModFreq: 12,
    distortion: 0.02,
  },
  {
    voiceId: 'VOX-01-IGNIS-TITAN',
    name: 'Foguinho Faísca Fofo',
    defaultNpcId: 'slime_ignis',
    register: 'AGUDO',
    effectType: 'FOFA_PUDIM_BOING',
    toneDescription: 'Chaminha Saltitante e Alegre (Pitch 1.78)',
    graveDescription: 'Zero Grave • Estalinho Doce de Fogueira (680Hz)',
    samplePhrase: 'Kraka bloo! Grani prili!',
    ttsPitch: 1.78,
    ttsRate: 1.48,
    bassFrequency: 680,
    bassGainDb: 3,
    roboticModFreq: 14,
    distortion: 0.03,
  },
  {
    voiceId: 'VOX-02-AERO-CHIRP',
    name: 'Passarinho das Nuvens Piu',
    defaultNpcId: 'slime_aero',
    register: 'AGUDO',
    effectType: 'FOFA_PIKMIN_PIU',
    toneDescription: 'Piu-Piu Melódico das Nuvens (Pitch 1.96)',
    graveDescription: 'Zero Grave • Assobio Fofinho (920Hz)',
    samplePhrase: 'Piu-piu fwoosh! Chiku prilili!',
    ttsPitch: 1.96,
    ttsRate: 1.56,
    bassFrequency: 920,
    bassGainDb: 2,
    roboticModFreq: 16,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-03-TOX-INSECT',
    name: 'Abelhinha de Mel Fofa',
    defaultNpcId: 'slime_tox',
    register: 'AGUDO',
    effectType: 'FOFA_ABELHINHA',
    toneDescription: 'Vozinha Doce de Abelhinha Feliz (Pitch 1.88)',
    graveDescription: 'Zero Grave • Vibrato Fofinho de Asinhas (780Hz)',
    samplePhrase: 'Zizi bloob! Glubba prilili!',
    ttsPitch: 1.88,
    ttsRate: 1.52,
    bassFrequency: 780,
    bassGainDb: 3,
    roboticModFreq: 18,
    distortion: 0.03,
  },
  {
    voiceId: 'VOX-04-ASTRA-VOCODER',
    name: 'Estrelinha Luma Cósmica',
    defaultNpcId: 'slime_astra',
    register: 'AGUDO',
    effectType: 'FOFA_LUMA_ESTRELINHA',
    toneDescription: 'Vozinha de Sininho Estelar (Pitch 1.92)',
    graveDescription: 'Zero Grave • Brilho de Sininho Doce (980Hz)',
    samplePhrase: 'Alakazoo prili! Shulala bloo!',
    ttsPitch: 1.92,
    ttsRate: 1.42,
    bassFrequency: 980,
    bassGainDb: 2,
    roboticModFreq: 11,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-05-MONOLITH-42',
    name: 'Bichinho Chao Bebê',
    register: 'AGUDO',
    effectType: 'FOFA_CHAO_SONIC',
    toneDescription: 'Vozinha de Mascote Bebê (Pitch 1.90)',
    graveDescription: 'Zero Grave • Entonação Meiga (840Hz)',
    samplePhrase: 'Mimi shulala! Chu chulili!',
    ttsPitch: 1.90,
    ttsRate: 1.40,
    bassFrequency: 840,
    bassGainDb: 2,
    roboticModFreq: 10,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-06-CYBERLASER-158',
    name: 'Fadinha de Cristal',
    register: 'AGUDO',
    effectType: 'FOFA_LUMA_ESTRELINHA',
    toneDescription: 'Vozinha Cintilante de Fada (Pitch 1.98)',
    graveDescription: 'Zero Grave • Harmônico de Cristal (1050Hz)',
    samplePhrase: 'Luma prili! Kiki shuu!',
    ttsPitch: 1.98,
    ttsRate: 1.50,
    bassFrequency: 1050,
    bassGainDb: 2,
    roboticModFreq: 14,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-07-CORROSION-56',
    name: 'Gosminha Poring Rosa',
    register: 'AGUDO',
    effectType: 'FOFA_BOLHA_SLIME',
    toneDescription: 'Geléia Rosa Saltitante (Pitch 1.85)',
    graveDescription: 'Zero Grave • Bolhinha Doce (760Hz)',
    samplePhrase: 'Bloob litli! Pipi lulula!',
    ttsPitch: 1.85,
    ttsRate: 1.48,
    bassFrequency: 760,
    bassGainDb: 3,
    roboticModFreq: 13,
    distortion: 0.02,
  },
  {
    voiceId: 'VOX-08-PRISM-122',
    name: 'Gatinho Neko-Slime',
    register: 'AGUDO',
    effectType: 'FOFA_NEKO_MIAU',
    toneDescription: 'Vozinha Meiga de Gatinho (Pitch 1.86)',
    graveDescription: 'Zero Grave • Inflexão Miau Fofinha (820Hz)',
    samplePhrase: 'Nyah prilili! Mimi plip!',
    ttsPitch: 1.86,
    ttsRate: 1.44,
    bassFrequency: 820,
    bassGainDb: 2,
    roboticModFreq: 11,
    distortion: 0.02,
  },
  {
    voiceId: 'VOX-09-VOID-50',
    name: 'Fantasminha Camarada',
    register: 'AGUDO',
    effectType: 'FOFA_CHAO_SONIC',
    toneDescription: 'Fantasminha Fofo e Tímido (Pitch 1.80)',
    graveDescription: 'Zero Grave • Sopro Melódico Suave (700Hz)',
    samplePhrase: 'Oooo prilili! Shuli mimi!',
    ttsPitch: 1.80,
    ttsRate: 1.36,
    bassFrequency: 700,
    bassGainDb: 2,
    roboticModFreq: 9,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-10-GLITCH-184',
    name: 'Robozinho Bebê BMO',
    register: 'AGUDO',
    effectType: 'FOFA_ANIMALESE',
    toneDescription: 'Vozinha de Robozinho Fofo (Pitch 1.94)',
    graveDescription: 'Zero Grave • Bip-Bop Alegre (900Hz)',
    samplePhrase: 'Blibli wahoo! Tiki-taka!',
    ttsPitch: 1.94,
    ttsRate: 1.58,
    bassFrequency: 900,
    bassGainDb: 2,
    roboticModFreq: 15,
    distortion: 0.02,
  },
  {
    voiceId: 'VOX-11-CHIPBASS-90',
    name: 'Tagarela Animalese (Estilo Isabelle)',
    register: 'AGUDO',
    effectType: 'FOFA_ANIMALESE',
    toneDescription: 'Vozinha Fofa Animal Crossing (Pitch 1.92)',
    graveDescription: 'Zero Grave • Sílabas Saltitantes Doces (880Hz)',
    samplePhrase: 'Pipi lulula! Yupi prilili!',
    ttsPitch: 1.92,
    ttsRate: 1.66,
    bassFrequency: 880,
    bassGainDb: 2,
    roboticModFreq: 16,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-12-REACTOR-66',
    name: 'Bolhinha de Sabão (Slime Rancher)',
    register: 'AGUDO',
    effectType: 'FOFA_BOLHA_SLIME',
    toneDescription: 'Slimezinho Fofo de Bolha (Pitch 1.86)',
    graveDescription: 'Zero Grave • Plip-Plop Cristalino (790Hz)',
    samplePhrase: 'Bloob litli! Tiki-bloo!',
    ttsPitch: 1.86,
    ttsRate: 1.50,
    bassFrequency: 790,
    bassGainDb: 2,
    roboticModFreq: 13,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-13-TECTONIC-40',
    name: 'Raposinha Kitsune Fofa',
    register: 'AGUDO',
    effectType: 'FOFA_NEKO_MIAU',
    toneDescription: 'Raposinha Alegre e Saltitante (Pitch 1.82)',
    graveDescription: 'Zero Grave • Timbre Doce e Brilhante (750Hz)',
    samplePhrase: 'Koko mimi! Jollu prili!',
    ttsPitch: 1.82,
    ttsRate: 1.52,
    bassFrequency: 750,
    bassGainDb: 2,
    roboticModFreq: 14,
    distortion: 0.02,
  },
  {
    voiceId: 'VOX-14-VALKYRIE-136',
    name: 'Peludinho Mogwai Doce',
    register: 'AGUDO',
    effectType: 'FOFA_CHAO_SONIC',
    toneDescription: 'Criaturinha Peluda Carinhosa (Pitch 1.88)',
    graveDescription: 'Zero Grave • Vibrato Doce de Carinho (860Hz)',
    samplePhrase: 'Awnn prili! Luvu prilili!',
    ttsPitch: 1.88,
    ttsRate: 1.38,
    bassFrequency: 860,
    bassGainDb: 2,
    roboticModFreq: 10,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-15-MAGMAQUAKE-36',
    name: 'Dragãozinho Bebê Fofinho',
    register: 'AGUDO',
    effectType: 'FOFA_PUDIM_BOING',
    toneDescription: 'Filhotinho de Dragão Alegre (Pitch 1.76)',
    graveDescription: 'Zero Grave • Pulo Melódico Fofo (660Hz)',
    samplePhrase: 'Yupi prilili! Kumpa lili!',
    ttsPitch: 1.76,
    ttsRate: 1.46,
    bassFrequency: 660,
    bassGainDb: 3,
    roboticModFreq: 12,
    distortion: 0.02,
  },
  {
    voiceId: 'VOX-16-SYNTHWAVE-98',
    name: 'Coelhinho da Lua (Pyon-Pyon)',
    register: 'AGUDO',
    effectType: 'FOFA_PUDIM_BOING',
    toneDescription: 'Coelhinho Saltitante Super Fofo (Pitch 1.90)',
    graveDescription: 'Zero Grave • Salto Boing Agudo (830Hz)',
    samplePhrase: 'Wauu shulu! Mimi plip!',
    ttsPitch: 1.90,
    ttsRate: 1.55,
    bassFrequency: 830,
    bassGainDb: 2,
    roboticModFreq: 14,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-17-PIKMIN-SPROUT',
    name: 'Brotinho Folha (Pikmin)',
    register: 'AGUDO',
    effectType: 'FOFA_PIKMIN_PIU',
    toneDescription: 'Plantinha Bebê Cantante (Pitch 1.98)',
    graveDescription: 'Zero Grave • Piu-Piu Agudinho (960Hz)',
    samplePhrase: 'Pika plop! Tiki-bloo!',
    ttsPitch: 1.98,
    ttsRate: 1.64,
    bassFrequency: 960,
    bassGainDb: 2,
    roboticModFreq: 16,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-18-CHUCHU-BOING',
    name: 'Gelatinha de Morango (Puru)',
    register: 'AGUDO',
    effectType: 'FOFA_PUDIM_BOING',
    toneDescription: 'Pudimzinho Fofo e Tremeluzente (Pitch 1.84)',
    graveDescription: 'Zero Grave • Molejo Doce (770Hz)',
    samplePhrase: 'Wubba lili? Pipi lulula!',
    ttsPitch: 1.84,
    ttsRate: 1.46,
    bassFrequency: 770,
    bassGainDb: 2,
    roboticModFreq: 11,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-19-IMP-GREMLIN',
    name: 'Duendezinho Travesso Risonho',
    register: 'AGUDO',
    effectType: 'FOFA_KOROK_FLORESTA',
    toneDescription: 'Risadinha Fofa e Brincalhona (Pitch 1.86)',
    graveDescription: 'Zero Grave • Timbre Saltitante (810Hz)',
    samplePhrase: 'Keke bloob! Zizi plop!',
    ttsPitch: 1.86,
    ttsRate: 1.60,
    bassFrequency: 810,
    bassGainDb: 2,
    roboticModFreq: 15,
    distortion: 0.02,
  },
  {
    voiceId: 'VOX-20-AQUA-BLUBBER',
    name: 'Gotinha d’Água Feliz',
    register: 'AGUDO',
    effectType: 'FOFA_GOTA_AGUA',
    toneDescription: 'Vozinha Cristalina de Gotinha (Pitch 1.92)',
    graveDescription: 'Zero Grave • Plim-Plim de Água Doce (890Hz)',
    samplePhrase: 'Plip lili? Sola bloo!',
    ttsPitch: 1.92,
    ttsRate: 1.50,
    bassFrequency: 890,
    bassGainDb: 2,
    roboticModFreq: 14,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-21-BABY-DRAKE',
    name: 'Pintinho Amarelinho (Piu-Lili)',
    register: 'AGUDO',
    effectType: 'FOFA_PIKMIN_PIU',
    toneDescription: 'Piu-Piu Fofíssimo e Animado (Pitch 1.96)',
    graveDescription: 'Zero Grave • Canto de Passarinho Bebê (940Hz)',
    samplePhrase: 'Chiku wubba! Piuu lili!',
    ttsPitch: 1.96,
    ttsRate: 1.58,
    bassFrequency: 940,
    bassGainDb: 2,
    roboticModFreq: 17,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-22-KOROK-WOOD',
    name: 'Sementinha da Floresta (Korok)',
    register: 'AGUDO',
    effectType: 'FOFA_KOROK_FLORESTA',
    toneDescription: 'Vozinha Encantada da Floresta (Pitch 1.88)',
    graveDescription: 'Zero Grave • Sininho de Madeira Doce (850Hz)',
    samplePhrase: 'Yaaay prilili! Flori bloo!',
    ttsPitch: 1.88,
    ttsRate: 1.54,
    bassFrequency: 850,
    bassGainDb: 2,
    roboticModFreq: 13,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-23-TOAD-MUSHROOM',
    name: 'Cogumelinho Sorridente',
    register: 'AGUDO',
    effectType: 'FOFA_ANIMALESE',
    toneDescription: 'Vozinha Alegre de Cogumelo (Pitch 1.94)',
    graveDescription: 'Zero Grave • Tagarela Agudinho (910Hz)',
    samplePhrase: 'Wahoo blop! Zumba bloob!',
    ttsPitch: 1.94,
    ttsRate: 1.62,
    bassFrequency: 910,
    bassGainDb: 2,
    roboticModFreq: 15,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-24-CHUBBY-TOAD',
    name: 'Sapinho Gota de Chuva',
    register: 'AGUDO',
    effectType: 'FOFA_BOLHA_SLIME',
    toneDescription: 'Sapinho Pequenininho e Fofo (Pitch 1.76)',
    graveDescription: 'Zero Grave • Bolhinha de Chuva (690Hz)',
    samplePhrase: 'Oba luli? Taka wub!',
    ttsPitch: 1.76,
    ttsRate: 1.44,
    bassFrequency: 690,
    bassGainDb: 3,
    roboticModFreq: 12,
    distortion: 0.02,
  },
  {
    voiceId: 'VOX-25-STAR-LMA',
    name: 'Bebê Estrela Cadente',
    register: 'AGUDO',
    effectType: 'FOFA_LUMA_ESTRELINHA',
    toneDescription: 'A Vozinha Mais Fofa e Aguda (Pitch 2.00)',
    graveDescription: 'Zero Grave • Sininho Mágico Puro (1120Hz)',
    samplePhrase: 'Lumi wub! Sola mimi!',
    ttsPitch: 2.00,
    ttsRate: 1.48,
    bassFrequency: 1120,
    bassGainDb: 2,
    roboticModFreq: 12,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-26-MOLE-DIGGER',
    name: 'Hamster Bochechudo Fofo',
    register: 'AGUDO',
    effectType: 'FOFA_ANIMALESE',
    toneDescription: 'Vozinha Rápida de Hamster (Pitch 1.95)',
    graveDescription: 'Zero Grave • Piu Rápido e Fofinho (930Hz)',
    samplePhrase: 'Kiki zola? Pipa-pipa!',
    ttsPitch: 1.95,
    ttsRate: 1.70,
    bassFrequency: 930,
    bassGainDb: 2,
    roboticModFreq: 16,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-27-MOTH-FLUTTER',
    name: 'Borboletinha de Luz',
    register: 'AGUDO',
    effectType: 'FOFA_LUMA_ESTRELINHA',
    toneDescription: 'Vozinha Suave e Cintilante (Pitch 1.89)',
    graveDescription: 'Zero Grave • Harmônico Doce de Fada (870Hz)',
    samplePhrase: 'Fwoosh lili! Shulu bloo!',
    ttsPitch: 1.89,
    ttsRate: 1.46,
    bassFrequency: 870,
    bassGainDb: 2,
    roboticModFreq: 14,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-28-JAWA-SCAVENGER',
    name: 'Esquilinho Dourado',
    register: 'AGUDO',
    effectType: 'FOFA_PIKMIN_PIU',
    toneDescription: 'Esquilinho Saltitante e Curioso (Pitch 1.93)',
    graveDescription: 'Zero Grave • Assobio Alegre (900Hz)',
    samplePhrase: 'Plip-plop? Zuzu prili!',
    ttsPitch: 1.93,
    ttsRate: 1.66,
    bassFrequency: 900,
    bassGainDb: 2,
    roboticModFreq: 17,
    distortion: 0.01,
  },
  {
    voiceId: 'VOX-29-PUDDING-KING',
    name: 'Princesa Geléia Kawaii',
    register: 'AGUDO',
    effectType: 'FOFA_NEKO_MIAU',
    toneDescription: 'Vozinha Doce e Apaixonante (Pitch 1.91)',
    graveDescription: 'Zero Grave • Melodia Kawaii Pura (860Hz)',
    samplePhrase: 'Shulala bloo! Luvu prilili!',
    ttsPitch: 1.91,
    ttsRate: 1.42,
    bassFrequency: 860,
    bassGainDb: 2,
    roboticModFreq: 11,
    distortion: 0.01,
  },
];

export class TreeChatVoiceManager {
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isMuted: boolean = false;
  private activeRipples: AcousticRipple[] = [];
  private ttsVoices: SpeechSynthesisVoice[] = [];
  private cuteTtsVoices: SpeechSynthesisVoice[] = [];
  private lastSpokenPhrase: string = '';
  private lastSpokenTimestamp: number = 0;

  // Voice validation & customization state
  private dislikedVoiceIds: Set<string> = new Set();
  private npcVoiceOverrides: Map<string, string> = new Map();
  private customCatalog: PersonalityVoiceProfile[] = VOICE_CATALOG.map((v) => ({ ...v }));

  // Fish Audio Gallery Generated Audios -> Automatic Random Link per NPC ID
  private npcGalleryAssignments: Map<string, NpcGalleryVoiceAssignment> = new Map();
  private lastSyncedGallerySignature: string = '';
  // Multi-stream map: allows hearing multiple simultaneous NPC conversations within the player's hearing radius!
  private activeSpeakerAudios: Map<string, HTMLAudioElement> = new Map();
  private activeSpeakerSynthEndMs: Map<string, number> = new Map();

  // Spatial hearing radius constants
  public readonly MAX_HEARING_DISTANCE = 1250;
  public readonly FULL_VOLUME_DISTANCE = 300;

  constructor() {
    this.initBrowserVoices();
    if (typeof window !== 'undefined') {
      try {
        const savedDisliked = window.localStorage.getItem('treechat_disliked_voices');
        if (savedDisliked) {
          const parsed = JSON.parse(savedDisliked);
          if (Array.isArray(parsed)) {
            this.dislikedVoiceIds = new Set(parsed);
          }
        }
        const savedOverrides = window.localStorage.getItem('treechat_npc_voice_overrides');
        if (savedOverrides) {
          const parsed = JSON.parse(savedOverrides);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([k, v]) => {
              if (typeof v === 'string') this.npcVoiceOverrides.set(k, v);
            });
          }
        }
        const savedGalleryLinks = window.localStorage.getItem('treechat_npc_fish_gallery_links_v1');
        if (savedGalleryLinks) {
          const parsed = JSON.parse(savedGalleryLinks);
          if (parsed && typeof parsed === 'object') {
            Object.entries(parsed).forEach(([npcId, val]) => {
              if (val && typeof val === 'object') {
                const rec = val as Partial<NpcGalleryVoiceAssignment>;
                if (Array.isArray(rec.assignedClipIds) && rec.assignedClipIds.length > 0) {
                  this.npcGalleryAssignments.set(npcId, {
                    npcId,
                    primaryVoiceId: rec.primaryVoiceId || 'fish-gallery',
                    primaryVoiceName: rec.primaryVoiceName || 'Áudio Galeria',
                    assignedClipIds: rec.assignedClipIds,
                    clipCursor: typeof rec.clipCursor === 'number' ? rec.clipCursor : 0,
                    lastSpokenAt: 0,
                  });
                }
              }
            });
          }
        }
        window.addEventListener('fish-gallery-updated', () => {
          this.lastSyncedGallerySignature = '';
        });
      } catch {}
    }
  }

  /**
   * Loads browser TTS voices and filters out deep/male voices so ONLY bright, high,
   * female/child-friendly voices are used as the base for cute creature speech!
   */
  private initBrowserVoices() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const fetchVoices = () => {
        try {
          const all = window.speechSynthesis.getVoices() || [];
          this.ttsVoices = all;

          const maleKeywords = [
            'daniel',
            'ricardo',
            'felipe',
            'david',
            'mark',
            'george',
            'james',
            'alex',
            'fred',
            'luca',
            'jorge',
            'thomas',
            'diego',
            'carlos',
            'antonio',
            'male',
            'masculino',
            'homme',
            'mann',
          ];

          const preferredKeywords = [
            'luciana',
            'francisca',
            'maria',
            'fernanda',
            'vitória',
            'vitoria',
            'thalita',
            'yara',
            'kyoko',
            'haruka',
            'samantha',
            'victoria',
            'zira',
            'paulina',
            'sabina',
            'helena',
            'laura',
            'monica',
            'google',
            'female',
            'feminino',
          ];

          const nonMale = all.filter((v) => {
            const lower = v.name.toLowerCase();
            return !maleKeywords.some((m) => lower.includes(m));
          });

          const preferred = nonMale.filter((v) => {
            const lower = v.name.toLowerCase();
            return preferredKeywords.some((p) => lower.includes(p));
          });

          this.cuteTtsVoices =
            preferred.length > 0 ? preferred : nonMale.length > 0 ? nonMale : all;
        } catch {
          this.ttsVoices = [];
          this.cuteTtsVoices = [];
        }
      };
      fetchVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = fetchVoices;
      }
    }
  }

  private persistValidationState() {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(
        'treechat_disliked_voices',
        JSON.stringify(Array.from(this.dislikedVoiceIds))
      );
      const overridesObj: Record<string, string> = {};
      this.npcVoiceOverrides.forEach((v, k) => {
        overridesObj[k] = v;
      });
      window.localStorage.setItem('treechat_npc_voice_overrides', JSON.stringify(overridesObj));
    } catch {}
  }

  public getVoiceCatalog(): PersonalityVoiceProfile[] {
    return this.customCatalog;
  }

  /**
   * Keeps all voices strictly in the cute high-pitched creature range (1.65 to 2.00)
   */
  public clampCuteHighPitch(pitch: number): number {
    return Math.max(1.65, Math.min(2.00, pitch));
  }

  public updateVoiceProfileParams(
    voiceId: string,
    updates: Partial<
      Pick<
        PersonalityVoiceProfile,
        'ttsPitch' | 'ttsRate' | 'bassFrequency' | 'bassGainDb' | 'roboticModFreq' | 'distortion'
      >
    >
  ) {
    const target = this.customCatalog.find((v) => v.voiceId === voiceId);
    if (target) {
      Object.assign(target, updates);
      if (updates.ttsPitch !== undefined) {
        target.ttsPitch = this.clampCuteHighPitch(updates.ttsPitch);
      }
    }
  }

  public toggleVoiceDisliked(voiceId: string): boolean {
    if (this.dislikedVoiceIds.has(voiceId)) {
      this.dislikedVoiceIds.delete(voiceId);
    } else {
      this.dislikedVoiceIds.add(voiceId);
    }
    this.persistValidationState();
    return this.dislikedVoiceIds.has(voiceId);
  }

  public isVoiceDisliked(voiceId: string): boolean {
    return this.dislikedVoiceIds.has(voiceId);
  }

  public getDislikedVoiceIds(): string[] {
    return Array.from(this.dislikedVoiceIds);
  }

  public setNpcVoiceOverride(npcId: string, voiceId: string) {
    this.npcVoiceOverrides.set(npcId, voiceId);
    this.persistValidationState();
  }

  public getNpcVoiceOverride(npcId: string): string | undefined {
    return this.npcVoiceOverrides.get(npcId);
  }

  public initAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if ('speechSynthesis' in window) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
      } catch {}
    }

    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.95, this.audioCtx.currentTime);
        this.masterGain.connect(this.audioCtx.destination);
      }
    }

    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }

    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.95, this.audioCtx.currentTime);
    }
    this.activeSpeakerAudios.forEach((audio) => {
      try {
        if (muted) {
          audio.volume = 0;
        }
      } catch {}
    });
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public getActiveRipples(): AcousticRipple[] {
    return this.activeRipples;
  }

  public updateRipples(dt: number) {
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const r = this.activeRipples[i];
      r.life -= dt;
      r.radius += (r.maxRadius - r.radius) * Math.min(1, dt * 4.4);
      if (r.life <= 0) {
        this.activeRipples.splice(i, 1);
      }
    }
  }

  public hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  // ==========================================================================
  // FISH AUDIO GALLERY GENERATED AUDIOS -> AUTOMATIC & RANDOM LINK BY NPC ID
  // Uses 100% of all generated audios in loadFishAudioGallery() across NPCs!
  // ==========================================================================

  private persistGalleryLinks() {
    if (typeof window === 'undefined') return;
    try {
      const obj: Record<string, Omit<NpcGalleryVoiceAssignment, 'lastSpokenAt'>> = {};
      this.npcGalleryAssignments.forEach((val, key) => {
        obj[key] = {
          npcId: val.npcId,
          primaryVoiceId: val.primaryVoiceId,
          primaryVoiceName: val.primaryVoiceName,
          assignedClipIds: val.assignedClipIds,
          clipCursor: val.clipCursor,
        };
      });
      window.localStorage.setItem('treechat_npc_fish_gallery_links_v1', JSON.stringify(obj));
    } catch {}
  }

  private shuffleArray<T>(items: T[]): T[] {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    return arr;
  }

  /**
   * Automatically and randomly links ALL generated audios from the Fish Audio Gallery
   * to the IDs of all NPCs/characters that appear on screen in Skills Mode.
   */
  public syncGalleryVoicesForSlimes(
    slimes: SlimeActor[],
    forceReshuffle: boolean = false
  ): NpcGalleryVoiceAssignment[] {
    const gallery = loadFishAudioGallery();
    if (gallery.length === 0 || slimes.length === 0) {
      return [];
    }

    const galleryIds = gallery.map((g) => g.id);
    const galleryIdSet = new Set(galleryIds);
    const slimeIds = slimes.map((s) => s.id);
    const sig = `${galleryIds.join('|')}::${slimeIds.join(',')}`;

    if (!forceReshuffle && sig === this.lastSyncedGallerySignature) {
      // Just ensure actor labels stay synced
      for (let i = 0; i < slimes.length; i++) {
        const s = slimes[i];
        const assign = this.npcGalleryAssignments.get(s.id);
        if (assign) {
          s.voiceId = assign.primaryVoiceId;
          s.voiceName = assign.primaryVoiceName;
        }
      }
      return slimes
        .map((s) => this.npcGalleryAssignments.get(s.id))
        .filter((a): a is NpcGalleryVoiceAssignment => Boolean(a));
    }

    // Check if we need a full random distribution (forceReshuffle, or unlinked NPCs, or unassigned gallery clips)
    const assignedAnywhere = new Set<string>();
    let anyNpcMissingValidLink = false;

    for (let i = 0; i < slimes.length; i++) {
      const npcId = slimes[i].id;
      const existing = this.npcGalleryAssignments.get(npcId);
      if (!existing) {
        anyNpcMissingValidLink = true;
      } else {
        const validIds = existing.assignedClipIds.filter((id) => galleryIdSet.has(id));
        if (validIds.length === 0) {
          anyNpcMissingValidLink = true;
        } else {
          existing.assignedClipIds = validIds;
          validIds.forEach((id) => assignedAnywhere.add(id));
        }
      }
    }

    const unassignedGalleryClips = gallery.filter((g) => !assignedAnywhere.has(g.id));

    if (forceReshuffle || anyNpcMissingValidLink || unassignedGalleryClips.length > 0) {
      if (forceReshuffle || this.npcGalleryAssignments.size === 0) {
        // Fresh random distribution of ALL generated gallery audios across all active NPC IDs
        const shuffledClips = this.shuffleArray(gallery);
        const shuffledSlimes = this.shuffleArray(slimes);
        const buckets = new Map<string, FishGeneratedAudioItem[]>();
        slimes.forEach((s) => buckets.set(s.id, []));

        // Deal 100% of all generated gallery audios across the NPC IDs so EVERY audio in the gallery is used!
        shuffledClips.forEach((clip, idx) => {
          const targetSlime = shuffledSlimes[idx % shuffledSlimes.length];
          buckets.get(targetSlime.id)!.push(clip);
        });

        // If there are more NPCs than gallery audios, give any remaining NPCs a random shuffled order of the gallery audios
        shuffledSlimes.forEach((s) => {
          const b = buckets.get(s.id)!;
          if (b.length === 0) {
            const randomSubset = this.shuffleArray(gallery);
            b.push(...randomSubset);
          }
        });

        slimes.forEach((s) => {
          const clipsForNpc = buckets.get(s.id) || [gallery[0]];
          const firstClip = clipsForNpc[0];
          const prev = this.npcGalleryAssignments.get(s.id);
          this.npcGalleryAssignments.set(s.id, {
            npcId: s.id,
            primaryVoiceId: firstClip.voiceId || firstClip.id,
            primaryVoiceName: firstClip.voiceName || 'Áudio Galeria',
            assignedClipIds: clipsForNpc.map((c) => c.id),
            clipCursor: 0,
            lastSpokenAt: prev?.lastSpokenAt || 0,
          });
        });
      } else {
        // Incremental: link any newly spawned NPC IDs and distribute any newly generated gallery audios!
        const missingSlimes = slimes.filter((s) => {
          const ex = this.npcGalleryAssignments.get(s.id);
          return !ex || ex.assignedClipIds.length === 0;
        });

        const shuffledNewClips = this.shuffleArray(unassignedGalleryClips);

        if (missingSlimes.length > 0) {
          missingSlimes.forEach((s) => {
            // Give new NPC a random selection from unassigned clips (or shuffled gallery if none unassigned)
            const pool =
              shuffledNewClips.length > 0 ? shuffledNewClips : this.shuffleArray(gallery);
            const count = Math.max(1, Math.ceil(gallery.length / Math.max(1, slimes.length)));
            const picked = this.shuffleArray(pool).slice(0, count);
            const firstClip = picked[0] || gallery[0];
            this.npcGalleryAssignments.set(s.id, {
              npcId: s.id,
              primaryVoiceId: firstClip.voiceId || firstClip.id,
              primaryVoiceName: firstClip.voiceName || 'Áudio Galeria',
              assignedClipIds: picked.map((c) => c.id),
              clipCursor: 0,
              lastSpokenAt: 0,
            });
            picked.forEach((c) => assignedAnywhere.add(c.id));
          });
        }

        // Any newly generated gallery clips get immediately linked at the front of existing NPC IDs so they are used right away!
        const stillUnassigned = gallery.filter((g) => !assignedAnywhere.has(g.id));
        if (stillUnassigned.length > 0) {
          const shuffledTargets = this.shuffleArray(slimes);
          stillUnassigned.forEach((clip, idx) => {
            const target = shuffledTargets[idx % shuffledTargets.length];
            const assign = this.npcGalleryAssignments.get(target.id);
            if (assign && !assign.assignedClipIds.includes(clip.id)) {
              assign.assignedClipIds.unshift(clip.id);
              assign.clipCursor = 0;
              assign.primaryVoiceId = clip.voiceId || clip.id;
              assign.primaryVoiceName = clip.voiceName || 'Áudio Galeria';
            }
          });
        }
      }

      this.persistGalleryLinks();
    }

    this.lastSyncedGallerySignature = sig;

    for (let i = 0; i < slimes.length; i++) {
      const s = slimes[i];
      const assign = this.npcGalleryAssignments.get(s.id);
      if (assign) {
        s.voiceId = assign.primaryVoiceId;
        s.voiceName = assign.primaryVoiceName;
      }
    }

    return slimes
      .map((s) => this.npcGalleryAssignments.get(s.id))
      .filter((a): a is NpcGalleryVoiceAssignment => Boolean(a));
  }

  public getGalleryClipsForNpc(
    npc: SlimeActor,
    allSlimes?: SlimeActor[]
  ): FishGeneratedAudioItem[] {
    const gallery = loadFishAudioGallery();
    if (gallery.length === 0) return [];

    if (!this.npcGalleryAssignments.has(npc.id)) {
      this.syncGalleryVoicesForSlimes(allSlimes && allSlimes.length > 0 ? allSlimes : [npc]);
    }

    const assign = this.npcGalleryAssignments.get(npc.id);
    if (!assign) return [];

    const byId = new Map(gallery.map((g) => [g.id, g]));
    const resolved = assign.assignedClipIds
      .map((id) => byId.get(id))
      .filter((item): item is FishGeneratedAudioItem => Boolean(item));

    if (resolved.length === 0) {
      this.syncGalleryVoicesForSlimes(allSlimes && allSlimes.length > 0 ? allSlimes : [npc], true);
      const retry = this.npcGalleryAssignments.get(npc.id);
      if (!retry) return [];
      return retry.assignedClipIds
        .map((id) => byId.get(id))
        .filter((item): item is FishGeneratedAudioItem => Boolean(item));
    }

    return resolved;
  }

  public getGalleryAssignmentForNpc(npcId: string): NpcGalleryVoiceAssignment | undefined {
    return this.npcGalleryAssignments.get(npcId);
  }

  public pickNextGalleryClipForNpc(
    npc: SlimeActor,
    preferredPhrase?: string,
    allSlimes?: SlimeActor[]
  ): FishGeneratedAudioItem | null {
    const clips = this.getGalleryClipsForNpc(npc, allSlimes);
    if (clips.length === 0) return null;

    const assign = this.npcGalleryAssignments.get(npc.id);
    if (!assign) return clips[0];

    if (preferredPhrase) {
      const cleanPref = stripFishAudioTags(preferredPhrase).toLowerCase().trim();
      const matchedIdx = clips.findIndex(
        (c) => stripFishAudioTags(c.taggedText).toLowerCase().trim() === cleanPref
      );
      if (matchedIdx >= 0) {
        const chosen = clips[matchedIdx];
        assign.clipCursor = (matchedIdx + 1) % clips.length;
        assign.primaryVoiceId = chosen.voiceId || chosen.id;
        assign.primaryVoiceName = chosen.voiceName || 'Áudio Galeria';
        npc.voiceId = assign.primaryVoiceId;
        npc.voiceName = assign.primaryVoiceName;
        return chosen;
      }
    }

    const idx = assign.clipCursor % clips.length;
    const chosen = clips[idx];
    assign.clipCursor = (idx + 1) % clips.length;
    assign.primaryVoiceId = chosen.voiceId || chosen.id;
    assign.primaryVoiceName = chosen.voiceName || 'Áudio Galeria';
    npc.voiceId = assign.primaryVoiceId;
    npc.voiceName = assign.primaryVoiceName;
    this.persistGalleryLinks();
    return chosen;
  }

  public playGalleryAudioClip(
    clip: FishGeneratedAudioItem,
    volume: number = 1.0,
    speakerId: string = 'preview'
  ) {
    if (!clip.audioDataUrl) return;
    try {
      // Only stop previous audio from the SAME speaker so multiple conversations play simultaneously!
      const prevForSpeaker = this.activeSpeakerAudios.get(speakerId);
      if (prevForSpeaker) {
        try {
          prevForSpeaker.pause();
        } catch {}
        this.activeSpeakerAudios.delete(speakerId);
      }

      const audio = new Audio(clip.audioDataUrl);
      audio.volume = this.isMuted ? 0 : Math.max(0, Math.min(1.0, volume));
      this.activeSpeakerAudios.set(speakerId, audio);

      const clearState = () => {
        if (this.activeSpeakerAudios.get(speakerId) === audio) {
          this.activeSpeakerAudios.delete(speakerId);
        }
      };
      audio.addEventListener('ended', clearState);
      audio.addEventListener('error', clearState);
      audio.play().catch(clearState);
    } catch {
      this.activeSpeakerAudios.delete(speakerId);
    }
  }

  /**
   * Dynamically updates spatial volume for all simultaneously playing NPC conversation streams
   * based on each speaker's real-time distance to the player's hearing radius.
   */
  public updateSpatialAudioForActiveSpeakers(player: SlimeActor, slimes: SlimeActor[]) {
    this.activeSpeakerAudios.forEach((audio, speakerId) => {
      if (speakerId === 'preview') {
        audio.volume = this.isMuted ? 0 : 1.0;
        return;
      }
      if (audio.paused || audio.ended) {
        this.activeSpeakerAudios.delete(speakerId);
        return;
      }
      const speaker = slimes.find((s) => s.id === speakerId);
      if (!speaker) {
        try {
          audio.pause();
        } catch {}
        this.activeSpeakerAudios.delete(speakerId);
        return;
      }
      if (this.isMuted) {
        audio.volume = 0;
        return;
      }
      const spatial = this.computeSpatialParameters(speaker.x, speaker.y, player.x, player.y);
      audio.volume = spatial.isAudible ? Math.max(0.04, Math.min(1.0, spatial.volume)) : 0;
    });
  }

  /**
   * Returns true if the specified speaker's TreeChat audio (or any speaker if omitted) is still actively playing
   */
  public isAudioPlaying(speakerId?: string): boolean {
    const now = Date.now();
    if (speakerId) {
      const audio = this.activeSpeakerAudios.get(speakerId);
      if (audio && !audio.paused && !audio.ended) {
        return true;
      }
      const synthEnd = this.activeSpeakerSynthEndMs.get(speakerId) || 0;
      return now < synthEnd;
    }

    for (const audio of this.activeSpeakerAudios.values()) {
      if (!audio.paused && !audio.ended) return true;
    }
    for (const endMs of this.activeSpeakerSynthEndMs.values()) {
      if (now < endMs) return true;
    }
    return false;
  }

  /**
   * Returns the remaining playback time in seconds for the specified speaker's currently playing audio clip
   */
  public getRemainingAudioDurationSec(speakerId?: string): number {
    const now = Date.now();
    if (speakerId) {
      const audio = this.activeSpeakerAudios.get(speakerId);
      if (audio && !audio.paused && !audio.ended) {
        const dur = audio.duration;
        const cur = audio.currentTime || 0;
        if (Number.isFinite(dur) && dur > 0) {
          return Math.max(0, dur - cur);
        }
        return 0.5;
      }
      const synthEnd = this.activeSpeakerSynthEndMs.get(speakerId) || 0;
      if (now < synthEnd) {
        return (synthEnd - now) / 1000;
      }
      return 0;
    }

    let maxRem = 0;
    for (const audio of this.activeSpeakerAudios.values()) {
      if (!audio.paused && !audio.ended) {
        const dur = audio.duration;
        const cur = audio.currentTime || 0;
        const rem = Number.isFinite(dur) && dur > 0 ? Math.max(0, dur - cur) : 0.5;
        if (rem > maxRem) maxRem = rem;
      }
    }
    return maxRem;
  }

  /**
   * Stops audio for a specific speaker ID
   */
  public stopSpeakerAudio(speakerId: string) {
    const audio = this.activeSpeakerAudios.get(speakerId);
    if (audio) {
      try {
        audio.pause();
      } catch {}
      this.activeSpeakerAudios.delete(speakerId);
    }
    this.activeSpeakerSynthEndMs.delete(speakerId);
  }

  /**
   * Stops all active gallery or TTS audios immediately
   */
  public stopActiveAudio() {
    this.activeSpeakerAudios.forEach((audio) => {
      try {
        audio.pause();
      } catch {}
    });
    this.activeSpeakerAudios.clear();
    this.activeSpeakerSynthEndMs.clear();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public getNpcVoiceId(s: SlimeActor): string {
    const galleryAssign = this.npcGalleryAssignments.get(s.id);
    if (galleryAssign && loadFishAudioGallery().length > 0) {
      return galleryAssign.primaryVoiceId;
    }

    const npcKey = s.isPlayer ? 'player_slime' : s.id;
    const override = this.npcVoiceOverrides.get(npcKey);
    if (override && !this.dislikedVoiceIds.has(override)) {
      return override;
    }

    let candidateId = 'VOX-00-HERO-NOBLE';
    if (s.isPlayer || s.id === 'player_slime') {
      candidateId = 'VOX-00-HERO-NOBLE';
    } else if (s.id === 'slime_ignis') {
      candidateId = 'VOX-01-IGNIS-TITAN';
    } else if (s.id === 'slime_aero') {
      candidateId = 'VOX-02-AERO-CHIRP';
    } else if (s.id === 'slime_tox') {
      candidateId = 'VOX-03-TOX-INSECT';
    } else if (s.id === 'slime_astra') {
      candidateId = 'VOX-04-ASTRA-VOCODER';
    } else {
      const hash = this.hashString(s.id || s.name);
      const proceduralPool = this.customCatalog.slice(5);
      candidateId = proceduralPool[hash % proceduralPool.length].voiceId;
    }

    if (this.dislikedVoiceIds.has(candidateId)) {
      const approvedPool = this.customCatalog.filter((v) => !this.dislikedVoiceIds.has(v.voiceId));
      if (approvedPool.length > 0) {
        const hash = this.hashString(s.id || s.name);
        return approvedPool[hash % approvedPool.length].voiceId;
      }
    }

    return candidateId;
  }

  public getVoiceProfileForSlime(
    speaker: SlimeActor,
    emotionId: TreeChatEmotionId = 'divertido'
  ): PersonalityVoiceProfile {
    const galleryAssign = this.npcGalleryAssignments.get(speaker.id);
    const voiceId = this.getNpcVoiceId(speaker);
    const baseProfile =
      this.customCatalog.find((v) => v.voiceId === voiceId) || this.customCatalog[0];

    const profile: PersonalityVoiceProfile = {
      ...baseProfile,
      name: speaker.name || baseProfile.name,
    };

    if (galleryAssign && loadFishAudioGallery().length > 0) {
      speaker.voiceId = galleryAssign.primaryVoiceId;
      speaker.voiceName = galleryAssign.primaryVoiceName;
    } else {
      speaker.voiceId = profile.voiceId;
      speaker.voiceName = profile.toneDescription;
    }

    return this.applyEmotionModulation(profile, emotionId);
  }

  private applyEmotionModulation(
    rawProfile: PersonalityVoiceProfile,
    emotionId: TreeChatEmotionId
  ): PersonalityVoiceProfile {
    const profile = { ...rawProfile };

    switch (emotionId) {
      case 'furioso':
      case 'ultra_furioso':
        // Even when angry, keeps a cute high-pitched tantrum voice (never thick/grossa!)
        profile.ttsPitch = this.clampCuteHighPitch(profile.ttsPitch * 0.96);
        profile.ttsRate = Math.min(1.90, profile.ttsRate * 1.18);
        profile.bassFrequency *= 1.08;
        break;

      case 'divertido':
      case 'exagerado_divertido':
      case 'empolgado':
      case 'travesso':
        profile.ttsPitch = this.clampCuteHighPitch(profile.ttsPitch * 1.06);
        profile.ttsRate = Math.min(1.88, profile.ttsRate * 1.10);
        profile.bassFrequency *= 1.12;
        break;

      case 'triste':
      case 'choroso':
      case 'cansado':
        profile.ttsPitch = this.clampCuteHighPitch(profile.ttsPitch * 0.95);
        profile.ttsRate = Math.max(1.18, profile.ttsRate * 0.88);
        break;

      case 'curioso':
      case 'confuso':
        profile.ttsPitch = this.clampCuteHighPitch(profile.ttsPitch * 1.05);
        break;
    }

    profile.ttsPitch = this.clampCuteHighPitch(profile.ttsPitch);
    return profile;
  }

  public getVoiceProfileForPersonality(
    personality: SlimePersonality | undefined,
    dnaSeed: number = 1337,
    emotionId: TreeChatEmotionId = 'divertido',
    isPlayer: boolean = false
  ): PersonalityVoiceProfile {
    const dummyActor = {
      id: isPlayer ? 'player_slime' : `npc_pers_${personality || 'auto'}`,
      name: isPlayer ? 'Herói (Você)' : 'Slime',
      isPlayer,
      personality,
      proceduralDnaSeed: dnaSeed,
    } as unknown as SlimeActor;
    return this.getVoiceProfileForSlime(dummyActor, emotionId);
  }

  public computeSpatialParameters(
    speakerX: number,
    speakerY: number,
    playerX: number,
    playerY: number
  ): {
    volume: number;
    filterCutoffHz: number;
    pan: number;
    distance: number;
    isAudible: boolean;
  } {
    const dx = speakerX - playerX;
    const dy = speakerY - playerY;
    const distance = Math.hypot(dx, dy);

    if (distance > this.MAX_HEARING_DISTANCE) {
      return { volume: 0, filterCutoffHz: 500, pan: 0, distance, isAudible: false };
    }

    let normalizedDistance = 0;
    if (distance > this.FULL_VOLUME_DISTANCE) {
      normalizedDistance =
        (distance - this.FULL_VOLUME_DISTANCE) /
        (this.MAX_HEARING_DISTANCE - this.FULL_VOLUME_DISTANCE);
    }

    const volume = Math.max(0, Math.pow(1 - normalizedDistance, 1.25));
    const filterCutoffHz = 1200 + volume * 8000;
    const pan = Math.max(-1, Math.min(1, dx / 480));

    return {
      volume,
      filterCutoffHz,
      pan,
      distance,
      isAudible: volume > 0.02,
    };
  }

  /**
   * PREVIEW TRIGGER: Speaks the phrase with cute high-pitched TTS + Kawaii Creature Sweetener
   */
  public previewVoiceById(
    voiceId: string,
    customPhrase?: string,
    emotionId: TreeChatEmotionId = 'divertido'
  ) {
    if (this.isMuted) {
      this.setMuted(false);
    }
    this.initAudioContext();

    const rawProfile =
      this.customCatalog.find((v) => v.voiceId === voiceId) || this.customCatalog[0];
    const profile = this.applyEmotionModulation(rawProfile, emotionId);
    const phrase = customPhrase || rawProfile.samplePhrase || 'Lilli prilili!';

    this.dispatchCuteCreatureVoice(phrase, profile, {
      volume: 1.0,
      filterCutoffHz: 9500,
      pan: 0,
    });
  }

  /**
   * AUTOMATIC TRIGGER: Called ONLY after an NPC or Player selects an emotion/response in TreeChat!
   * Supports multiple simultaneous conversations within the player's hearing radius.
   */
  public speakOnOptionSelected(
    speaker: SlimeActor,
    phrase: string,
    emotionId: TreeChatEmotionId,
    player: SlimeActor,
    allSlimes?: SlimeActor[]
  ): FishGeneratedAudioItem | null {
    this.initAudioContext();

    const spatial = this.computeSpatialParameters(speaker.x, speaker.y, player.x, player.y);

    this.activeRipples.push({
      x: speaker.x,
      y: speaker.y - (speaker.radius || 32) * 0.4,
      radius: 24,
      maxRadius: Math.min(this.MAX_HEARING_DISTANCE, Math.max(220, spatial.distance + 120)),
      life: 1.35,
      maxLife: 1.35,
      color: speaker.color || '#38BDF8',
      volumeAlpha: Math.min(1, spatial.volume + 0.35),
    });

    // 1. Check if Fish Audio Gallery has generated audios -> play the clip linked to speaker.id!
    // We play it on speaker.id's own audio channel so multiple conversations within hearing range are heard together!
    const galleryClip = this.pickNextGalleryClipForNpc(speaker, phrase, allSlimes);
    if (galleryClip) {
      const assign = this.npcGalleryAssignments.get(speaker.id);
      if (assign) {
        assign.lastSpokenAt = Date.now();
      }
      const initialVol = !this.isMuted && spatial.isAudible ? spatial.volume : 0;
      this.playGalleryAudioClip(galleryClip, initialVol, speaker.id);
      return galleryClip;
    }

    if (this.isMuted || !spatial.isAudible) return null;

    this.activeSpeakerSynthEndMs.set(speaker.id, Date.now() + 1400);
    const profile = this.getVoiceProfileForSlime(speaker, emotionId);
    this.dispatchCuteCreatureVoice(phrase, profile, spatial);
    return null;
  }

  /**
   * Combines:
   * 1. High-pitched Female/Kawaii TTS Voice (Pitch 1.70 - 2.00) speaking the cute fictional words
   * 2. High-Pass (>500Hz) Melodic Kawaii Creature Layer (Chao / Pikmin / Slime Bubble / Luma Chime)
   *    that adds adorable high-frequency chirps and bubbles with ZERO low-frequency thickness!
   */
  private dispatchCuteCreatureVoice(
    phrase: string,
    profile: PersonalityVoiceProfile,
    spatial: { volume: number; filterCutoffHz: number; pan: number }
  ) {
    const cutePitch = this.clampCuteHighPitch(profile.ttsPitch);

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (!window.speechSynthesis.speaking) {
          if (this.cuteTtsVoices.length === 0) {
            this.initBrowserVoices();
          }

          const cleanText = phrase.replace(/[!?,.]/g, ' ').replace(/\s+/g, ' ').trim();
          const utterance = new SpeechSynthesisUtterance(cleanText);

          utterance.pitch = cutePitch; // High cute register (1.70 - 2.00)
          utterance.rate = Math.max(1.28, Math.min(1.85, profile.ttsRate));
          utterance.volume = Math.max(0.25, Math.min(1.0, spatial.volume));

          if (this.cuteTtsVoices.length > 0) {
            const hash = this.hashString(profile.voiceId);
            utterance.voice = this.cuteTtsVoices[hash % this.cuteTtsVoices.length];
          }

          window.speechSynthesis.speak(utterance);
        }
      } catch {}
    }

    // 2. High-Pass Kawaii Melodic Chirp & Bubble Layer (Web Audio API mixes multiple voices simultaneously!)
    this.dispatchKawaiiMelodicSweetener(phrase, profile, spatial);
  }

  /**
   * Synthesizes a pure, high-pitched kawaii creature sweetener (620Hz - 1450Hz)
   * with a strict High-Pass Filter at 520Hz so there is ZERO low-frequency mud or thickness!
   */
  private dispatchKawaiiMelodicSweetener(
    phrase: string,
    profile: PersonalityVoiceProfile,
    spatial: { volume: number; filterCutoffHz: number; pan: number }
  ) {
    const ctx = this.initAudioContext();
    if (!ctx || !this.masterGain) return;

    const clean = phrase.toLowerCase().replace(/[^a-záéíóúâêôãõç\s-]/g, ' ').trim();
    const rawSyllables =
      clean.match(/[bcdfghjklmnpqrstvwxyz]*[aeiouáéíóúâêôãõ]+/gi) || ['pi', 'li'];
    const syllables = rawSyllables.slice(0, 6);

    const stepDur = Math.max(0.055, Math.min(0.11, 0.088 / profile.ttsRate));
    const totalDur = syllables.length * stepDur + 0.05;
    const now = ctx.currentTime;

    const layerGain = ctx.createGain();
    const peakGain = Math.min(0.18, 0.14 * spatial.volume);
    layerGain.gain.setValueAtTime(0.0001, now);

    // Pure Sine or Triangle oscillator in the high kawaii register (600Hz - 1350Hz)
    const cuteOsc = ctx.createOscillator();
    cuteOsc.type =
      profile.effectType === 'FOFA_PUDIM_BOING' ||
      profile.effectType === 'FOFA_NEKO_MIAU' ||
      profile.effectType === 'FOFA_ABELHINHA'
        ? 'triangle'
        : 'sine';

    // Sweet Vibrato LFO
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(profile.roboticModFreq, now);
    lfoGain.gain.setValueAtTime(profile.bassFrequency * 0.06, now);
    lfo.connect(lfoGain);
    lfoGain.connect(cuteOsc.frequency);

    // STRICT HIGH-PASS FILTER AT 520Hz: Cuts 100% of low/thick frequencies!
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.setValueAtTime(520, now);

    // Cute Resonant Bandpass / Bell Filter
    const cuteFilter = ctx.createBiquadFilter();
    cuteFilter.type = 'bandpass';
    cuteFilter.Q.setValueAtTime(
      profile.effectType === 'FOFA_BOLHA_SLIME' || profile.effectType === 'FOFA_GOTA_AGUA'
        ? 6.0
        : 2.5,
      now
    );

    const baseHz = Math.max(580, Math.min(1300, profile.bassFrequency));

    syllables.forEach((syl, idx) => {
      const sylStart = now + idx * stepDur;
      const sylMid = sylStart + stepDur * 0.45;
      const sylEnd = sylStart + stepDur * 0.82;
      const sylHash = this.hashString(syl + idx);

      // Cute pentatonic melodic hop per syllable
      const pentatonicRatios = [1.0, 1.125, 1.25, 1.5, 1.667];
      const noteRatio = pentatonicRatios[sylHash % pentatonicRatios.length];
      const fNote = baseHz * noteRatio;

      cuteFilter.frequency.setValueAtTime(fNote * 1.15, sylStart);
      cuteFilter.frequency.exponentialRampToValueAtTime(fNote * 1.45, sylEnd);

      if (
        profile.effectType === 'FOFA_BOLHA_SLIME' ||
        profile.effectType === 'FOFA_GOTA_AGUA' ||
        profile.effectType === 'FOFA_PIKMIN_PIU'
      ) {
        // Adorable upward chirp/bubble on every syllable ("piu!", "bloop!")
        cuteOsc.frequency.setValueAtTime(fNote * 0.85, sylStart);
        cuteOsc.frequency.exponentialRampToValueAtTime(fNote * 1.35, sylEnd);
      } else if (
        profile.effectType === 'FOFA_NEKO_MIAU' ||
        profile.effectType === 'FOFA_CHAO_SONIC'
      ) {
        // Sweet arch coo ("miau / chao" contour)
        cuteOsc.frequency.setValueAtTime(fNote * 0.92, sylStart);
        cuteOsc.frequency.exponentialRampToValueAtTime(fNote * 1.25, sylMid);
        cuteOsc.frequency.exponentialRampToValueAtTime(fNote * 0.98, sylEnd);
      } else {
        // Bouncy Animalese / Luma bell hop
        cuteOsc.frequency.setValueAtTime(fNote, sylStart);
        cuteOsc.frequency.exponentialRampToValueAtTime(fNote * 1.18, sylEnd);
      }

      layerGain.gain.setValueAtTime(0.002, sylStart);
      layerGain.gain.linearRampToValueAtTime(peakGain, sylStart + 0.012);
      layerGain.gain.setValueAtTime(peakGain * 0.75, sylMid);
      layerGain.gain.linearRampToValueAtTime(0.002, sylEnd);
    });

    layerGain.gain.linearRampToValueAtTime(0.0001, now + totalDur);

    cuteOsc.connect(highpass);
    highpass.connect(cuteFilter);
    cuteFilter.connect(layerGain);

    if (ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(spatial.pan, now);
      layerGain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      layerGain.connect(this.masterGain);
    }

    cuteOsc.start(now);
    lfo.start(now);

    cuteOsc.stop(now + totalDur + 0.03);
    lfo.stop(now + totalDur + 0.03);
  }
}

// Global Singleton Instance
export const treeChatVoiceManager = new TreeChatVoiceManager();
