import type { ReactNode } from 'react';

/**
 * As 5 Variantes Visuais dos Botões (variant)
 */
export type DialogueButtonVariant =
  | 'primary_sapphire' // Gradiente Azul Safira (#022b68) | Texto branco, estrela ouro | Ação principal / Confirmar / Continuar
  | 'secondary_pearl'  // Gradiente Marfim Pérola (#fffdf8) | Texto azul safira, estrela ouro | Ação secundária / Recusar / Voltar
  | 'emerald_quest'    // Gradiente Verde Esmeralda (#059669) | Texto branco, estrela menta | Entregar Quest / Recompensa
  | 'crimson_duel'     // Gradiente Vermelho Carmesim (#e11d48) | Texto branco, estrela rosa | Batalha / Duelo
  | 'amethyst_travel'; // Gradiente Roxo Ametista (#8b5cf6) | Texto branco, estrela lilás | Fast Travel / Teleporte

/**
 * Os 4 Modos de Tela solicitados:
 * - mobile_portrait: TELA DE CELULAR NA VERTICAL
 * - mobile_landscape: TELA DE CELULAR EM PAISAGEM
 * - tablet_portrait: TELA TABLET VERTICAL
 * - desktop_landscape: TELA DE TABLET/PC MONITOR PAISAGEM
 */
export type DialogueViewportMode =
  | 'mobile_portrait'   // Tela de Celular na Vertical (ex: 390x844)
  | 'mobile_landscape'  // Tela de Celular em Paisagem (ex: 844x390)
  | 'tablet_portrait'   // Tela Tablet Vertical (ex: 768x1024)
  | 'desktop_landscape'; // Tela de Tablet/PC Monitor Paisagem (ex: 1280x720 / 1440x900)

/**
 * Variáveis de Dimensionamento e Layout para cada Tipo de Tela
 */
export interface ViewportScreenVariables {
  /** Nome legível do perfil de tela */
  label: string;
  /** Largura simulada do dispositivo no preview (px) */
  deviceWidth: number;
  /** Altura simulada do dispositivo no preview (px) */
  deviceHeight: number;
  /** Largura da cápsula de diálogo (px) */
  bubbleMaxWidth: number;
  /** Altura mínima do corpo da cápsula (px) */
  bubbleMinHeight: number;
  /** Escala global do componente (multiplicador, ex: 1.0) */
  uiScale: number;
  /** Largura do container do personagem à esquerda (px) */
  avatarSize: number;
  /** Offset X do personagem na ponta esquerda da cápsula (px) */
  avatarScreenOffsetX: number;
  /** Offset Y do personagem em relação ao centro vertical da cápsula (px) */
  avatarScreenOffsetY: number;
  /** Padding esquerdo do conteúdo para dar espaço exato ao personagem (px) */
  contentPaddingLeft: number;
  /** Padding direito do conteúdo (px) */
  contentPaddingRight: number;
  /** Largura da pílula de nome superior (px) */
  speakerPillWidth: number;
  /** Altura da pílula de nome superior (px) */
  speakerPillHeight: number;
  /** Tamanho da fonte do texto do diálogo (px) */
  dialogueFontSize: number;
  /** Largura mínima dos botões de opção na borda inferior (px) */
  buttonMinWidth: number;
  /** Altura dos botões de opção na borda inferior (px) */
  buttonHeight: number;
  /** Tamanho da fonte dos botões de opção (px) */
  buttonFontSize: number;
  /** Distância do rodapé da tela do jogo (px) */
  bottomMargin: number;
}

/**
 * Mapa completo com as variáveis das 4 telas:
 * - mobile_portrait (Celular Vertical)
 * - mobile_landscape (Celular Paisagem)
 * - tablet_portrait (Tablet Vertical)
 * - desktop_landscape (Tablet/PC Monitor Paisagem)
 */
export type DialogueViewportConfigMap = Record<DialogueViewportMode, ViewportScreenVariables>;

/**
 * Presets calibrados para cada uma das 4 telas:
 * - O personagem já fica posicionado na ponta esquerda da cápsula por padrão (characterOffsetX = 0)
 * - Suporta 1, 2 ou 3 botões simultâneos contidos 100% dentro da borda inferior da cápsula sem transbordar
 */
export const DEFAULT_VIEWPORT_VARIABLES: DialogueViewportConfigMap = {
  mobile_portrait: {
    label: 'Celular Vertical (Retrato)',
    deviceWidth: 390,
    deviceHeight: 740,
    bubbleMaxWidth: 330,
    bubbleMinHeight: 80,
    uiScale: 1.0,
    avatarSize: 118,
    avatarScreenOffsetX: -44,
    avatarScreenOffsetY: -4,
    contentPaddingLeft: 92,
    contentPaddingRight: 18,
    speakerPillWidth: 138,
    speakerPillHeight: 15,
    dialogueFontSize: 11,
    buttonMinWidth: 90,
    buttonHeight: 26,
    buttonFontSize: 10,
    bottomMargin: 28,
  },
  mobile_landscape: {
    label: 'Celular Paisagem (Horizontal)',
    deviceWidth: 844,
    deviceHeight: 390,
    bubbleMaxWidth: 488,
    bubbleMinHeight: 98,
    uiScale: 0.96,
    avatarSize: 164,
    avatarScreenOffsetX: -56,
    avatarScreenOffsetY: -6,
    contentPaddingLeft: 128,
    contentPaddingRight: 26,
    speakerPillWidth: 190,
    speakerPillHeight: 20,
    dialogueFontSize: 13,
    buttonMinWidth: 128,
    buttonHeight: 32,
    buttonFontSize: 13,
    bottomMargin: 16,
  },
  tablet_portrait: {
    label: 'Tablet Vertical (Retrato)',
    deviceWidth: 768,
    deviceHeight: 920,
    bubbleMaxWidth: 518,
    bubbleMinHeight: 106,
    uiScale: 1.0,
    avatarSize: 180,
    avatarScreenOffsetX: -60,
    avatarScreenOffsetY: -6,
    contentPaddingLeft: 140,
    contentPaddingRight: 28,
    speakerPillWidth: 206,
    speakerPillHeight: 21,
    dialogueFontSize: 14,
    buttonMinWidth: 138,
    buttonHeight: 34,
    buttonFontSize: 14,
    bottomMargin: 36,
  },
  desktop_landscape: {
    label: 'Tablet / PC Monitor Paisagem',
    deviceWidth: 1120,
    deviceHeight: 620,
    bubbleMaxWidth: 546,
    bubbleMinHeight: 110,
    uiScale: 1.05,
    avatarSize: 188,
    avatarScreenOffsetX: -64,
    avatarScreenOffsetY: -6,
    contentPaddingLeft: 148,
    contentPaddingRight: 30,
    speakerPillWidth: 214,
    speakerPillHeight: 22,
    dialogueFontSize: 14.5,
    buttonMinWidth: 144,
    buttonHeight: 36,
    buttonFontSize: 14.5,
    bottomMargin: 32,
  },
};

/**
 * Detecta automaticamente qual das 4 telas está ativa pelas dimensões (width x height)
 */
export function detectDialogueViewportMode(width: number, height: number): DialogueViewportMode {
  const isPortrait = height > width;
  if (isPortrait) {
    return width < 600 ? 'mobile_portrait' : 'tablet_portrait';
  } else {
    return height < 500 && width < 960 ? 'mobile_landscape' : 'desktop_landscape';
  }
}

/**
 * Item de botão renderizado na borda inferior do balão
 */
export interface DialogueOptionItem {
  id?: string;
  label: string;
  variant: DialogueButtonVariant;
  onClick: () => void;
  nextStepIndex?: number;
  disabled?: boolean;
}

/**
 * Status da Quest vinculada ao marcador (prog e questReady() do marcador)
 */
export type QuestStatusState =
  | 'INITIAL_OFFER' // Oferta Inicial de Missão
  | 'IN_PROGRESS'   // Missão em Andamento (itens pendentes)
  | 'READY'         // Missão Pronta para Entregar (itens coletados)
  | 'COMPLETED';    // Missão já Concluída

export interface QuestBadgeInfo {
  status: QuestStatusState;
  label: string; // Ex: "EM ANDAMENTO", "PRONTO", "NOVA MISSÃO", "CONCLUÍDA"
  progressText?: string; // Ex: "2/3 Liras Douradas"
  questTitle?: string;
}

/**
 * Resposta customizada configurada no Studio (suporta de 1 a 3 botões e ramificação via nextStepIndex)
 */
export interface StudioPlayerResponse {
  id?: string;
  label: string;
  nextStepIndex?: number;
  actionType?: 'continue' | 'close' | 'accept_quest' | 'complete_quest' | 'duel' | 'travel';
}

/**
 * Passo individual do diálogo
 */
export interface DialogueStep {
  id?: string;
  speaker?: string;
  text: string;
  characterPng?: string;
  playerResponses?: StudioPlayerResponse[];
}

/**
 * Estrutura do Marcador (NPC / Ponto de Interesse no Jogo)
 */
export interface GameMarkerData {
  id: string;
  name: string;
  dialogueCharacterName?: string;
  dialogueCharacterPng?: string;
  customIconPng?: string;
  dialogueCharacterScale?: number;   // padrão 1.0
  dialogueCharacterOffsetX?: number; // padrão 0
  dialogueCharacterOffsetY?: number; // padrão 0
  color?: string;                    // fallbackColor

  // Origens dos Passos (dialogueSteps)
  dialogueId?: string;
  dialogueSteps?: DialogueStep[];
  npcPhrases?: string[];
  dialogueText?: string;

  // Contexto de Ação Final
  type?: 'npc' | 'travel' | 'quest_giver' | 'boss';
  eventKind?: 'none' | 'quest' | 'duel';
  questState?: QuestStatusState;
  questProgressText?: string;
  questTitle?: string;
}

/**
 * 1. Variáveis Diretas do Pop-up (OrnateDialogueBubbleProps)
 */
export interface OrnateDialogueBubbleProps {
  /** Nome exibido na pílula central superior (marker.dialogueCharacterName || marker.name || step.speaker) */
  speakerName: string;
  /** Asset PNG do personagem que transborda à esquerda (marker.dialogueCharacterPng || step.characterPng || marker.customIconPng) */
  characterPng?: string;
  /** Multiplicador de tamanho do avatar (marker.dialogueCharacterScale, padrão 1.0) */
  characterScale?: number;
  /** Deslocamento horizontal do avatar em px (marker.dialogueCharacterOffsetX, padrão 0) */
  characterOffsetX?: number;
  /** Deslocamento vertical do avatar em px (marker.dialogueCharacterOffsetY, padrão 0) */
  characterOffsetY?: number;
  /** Cor de fundo caso o NPC não tenha PNG (marker.color) */
  fallbackColor?: string;
  /** Texto animado caractere por caractere (Estado interno do typewriter) */
  displayedText: string;
  /** Texto completo do passo atual (Calculado via currentStep.text ou lógica de Quest) */
  fullText: string;
  /** true quando a digitação termina (Estado interno do timer) */
  isTypingComplete: boolean;
  /** Lista de botões de ação na borda inferior (Gerado dinamicamente pelo contexto) */
  options: DialogueOptionItem[];
  /** Badge de status de missão: EM ANDAMENTO, PRONTO, etc. (prog e questReady() do marcador) */
  questInfo?: QuestBadgeInfo | null;
  /** Asset com animação de gelatina / motion layers se ativo (MotionAssetCanvas) */
  customMotionAsset?: ReactNode;

  // Variáveis de Responsividade para as 4 Telas:
  // 'mobile_portrait' | 'mobile_landscape' | 'tablet_portrait' | 'desktop_landscape' | 'auto'
  viewportMode?: DialogueViewportMode | 'auto';
  /** Sobrescrita opcional das variáveis da tela ativa */
  viewportVariables?: Partial<ViewportScreenVariables>;
  /** Mapa completo customizável das 4 telas */
  viewportConfigMap?: DialogueViewportConfigMap;

  // Props auxiliares opcionais de interação e fidelidade visual
  /** Índice do passo atual (0-indexed) */
  currentStepIndex?: number;
  /** Total de passos do diálogo */
  totalSteps?: number;
  /** Callback ao clicar no corpo do balão para completar o typewriter instantaneamente */
  onSkipTyping?: () => void;
  /** Modo Fiel à Referência (exibe as barras de placeholder originais da imagem quando true) */
  referencePlaceholderMode?: boolean;
}
