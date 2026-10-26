import type {
  DialogueOptionItem,
  DialogueStep,
  GameMarkerData,
  QuestBadgeInfo,
} from '../types/dialogue';

export interface DialogueEngineCallbacks {
  onNextStep: (targetStepIndex?: number) => void;
  onCloseDialogue: (actionLabel: string) => void;
  onAcceptQuest: () => void;
  onCompleteQuest: () => void;
  onOpenQuestLog: () => void;
  onStartDuel: () => void;
  onFastTravel: () => void;
}

/**
 * 2. Origens dos Passos (dialogueSteps):
 * - Diálogo salvo vinculado: marker.dialogueId
 * - Passos locais do marcador: marker.dialogueSteps
 * - Frases aleatórias/sequenciais: marker.npcPhrases
 * - Diálogo simples único: marker.dialogueText
 */
export function resolveDialogueSteps(
  marker: GameMarkerData,
  savedDialoguesRecord: Record<string, DialogueStep[]> = {}
): DialogueStep[] {
  // 1. Diálogo salvo vinculado (marker.dialogueId)
  if (marker.dialogueId && savedDialoguesRecord[marker.dialogueId]?.length) {
    return savedDialoguesRecord[marker.dialogueId];
  }

  // 2. Passos locais do marcador (marker.dialogueSteps)
  if (marker.dialogueSteps && marker.dialogueSteps.length > 0) {
    return marker.dialogueSteps;
  }

  // 3. Frases aleatórias/sequenciais (marker.npcPhrases)
  if (marker.npcPhrases && marker.npcPhrases.length > 0) {
    return marker.npcPhrases.map((phrase, idx) => ({
      id: `phrase-${idx}`,
      speaker: marker.dialogueCharacterName || marker.name,
      text: phrase,
    }));
  }

  // 4. Diálogo simples único (marker.dialogueText)
  if (marker.dialogueText && marker.dialogueText.trim().length > 0) {
    return [
      {
        id: 'single-step',
        speaker: marker.dialogueCharacterName || marker.name,
        text: marker.dialogueText,
      },
    ];
  }

  // Fallback seguro
  return [
    {
      id: 'default-step',
      speaker: marker.dialogueCharacterName || marker.name,
      text: 'Saudações, viajante! Que os ventos dourados guiem sua jornada.',
    },
  ];
}

/**
 * Calcula o QuestBadgeInfo a partir do estado de missão (prog e questReady() do marcador)
 */
export function resolveQuestBadgeInfo(marker: GameMarkerData): QuestBadgeInfo | null {
  if (marker.eventKind !== 'quest' && marker.type !== 'quest_giver' && !marker.questState) {
    return null;
  }

  const state = marker.questState || 'INITIAL_OFFER';
  switch (state) {
    case 'INITIAL_OFFER':
      return {
        status: 'INITIAL_OFFER',
        label: 'NOVA MISSÃO',
        progressText: marker.questProgressText,
        questTitle: marker.questTitle,
      };
    case 'IN_PROGRESS':
      return {
        status: 'IN_PROGRESS',
        label: 'EM ANDAMENTO',
        progressText: marker.questProgressText || 'Itens pendentes',
        questTitle: marker.questTitle,
      };
    case 'READY':
      return {
        status: 'READY',
        label: 'PRONTO',
        progressText: marker.questProgressText || 'Itens coletados!',
        questTitle: marker.questTitle,
      };
    case 'COMPLETED':
      return {
        status: 'COMPLETED',
        label: 'CONCLUÍDA',
        progressText: marker.questProgressText,
        questTitle: marker.questTitle,
      };
    default:
      return null;
  }
}

/**
 * 2 & 3. Constrói dinamicamente a lista de botões (options: DialogueOptionItem[])
 * seguindo todas as regras de Passo Intermediário (!isFinalStep) e Passo Final (isFinalStep).
 */
export function buildDialogueOptions(params: {
  marker: GameMarkerData;
  currentStep: DialogueStep;
  currentStepIndex: number;
  totalSteps: number;
  callbacks: DialogueEngineCallbacks;
}): DialogueOptionItem[] {
  const { marker, currentStep, currentStepIndex, totalSteps, callbacks } = params;
  const isFinalStep = currentStepIndex >= totalSteps - 1;

  // B. Respostas Customizadas do Studio (playerResponses) — 1 a 3 Botões
  // Se o passo atual tiver playerResponses configuradas no Studio:
  // - Suporta até 3 botões simultâneos
  // - Botão 1: Safira (primary_sapphire)
  // - Botões 2 e 3: Marfim (secondary_pearl)
  // - Cada botão pode ter ramificação própria via nextStepIndex
  if (currentStep.playerResponses && currentStep.playerResponses.length > 0) {
    return currentStep.playerResponses.slice(0, 3).map((resp, idx) => ({
      id: resp.id || `studio-resp-${idx}`,
      label: resp.label,
      variant: idx === 0 ? 'primary_sapphire' : 'secondary_pearl',
      nextStepIndex: resp.nextStepIndex,
      onClick: () => {
        if (typeof resp.nextStepIndex === 'number' && resp.nextStepIndex >= 0 && resp.nextStepIndex < totalSteps) {
          callbacks.onNextStep(resp.nextStepIndex);
        } else if (!isFinalStep && resp.actionType !== 'close') {
          callbacks.onNextStep(currentStepIndex + 1);
        } else {
          callbacks.onCloseDialogue(resp.label);
        }
      },
    }));
  }

  // Passo Intermediário (!isFinalStep):
  // Exibe 1 botão: [ ✦ CONTINUAR ] (Safira azul), avançando para o próximo passo (currentStepIndex + 1)
  if (!isFinalStep) {
    return [
      {
        id: 'step-continue',
        label: 'CONTINUAR',
        variant: 'primary_sapphire',
        nextStepIndex: currentStepIndex + 1,
        onClick: () => callbacks.onNextStep(currentStepIndex + 1),
      },
    ];
  }

  // Passo Final (isFinalStep):
  // O sistema passa a decidir as opções finais de ação (Quest, Duelo, Viagem ou Conclusão).

  // A. Estado de Quests (Missões)
  if (marker.eventKind === 'quest' || marker.type === 'quest_giver' || marker.questState) {
    const questState = marker.questState || 'INITIAL_OFFER';

    // 1. Missão em Andamento (itens pendentes)
    if (questState === 'IN_PROGRESS') {
      return [
        {
          id: 'quest-in-progress-seek',
          label: 'VOU BUSCAR!',
          variant: 'primary_sapphire',
          onClick: () => callbacks.onCloseDialogue('VOU BUSCAR!'),
        },
        {
          id: 'quest-in-progress-view',
          label: 'VER QUESTS',
          variant: 'secondary_pearl',
          onClick: () => callbacks.onOpenQuestLog(),
        },
      ];
    }

    // 2. Missão Pronta para Entregar (itens coletados)
    if (questState === 'READY') {
      return [
        {
          id: 'quest-ready-deliver',
          label: 'ENTREGAR & FINALIZAR!',
          variant: 'emerald_quest',
          onClick: () => callbacks.onCompleteQuest(),
        },
        {
          id: 'quest-ready-later',
          label: 'ENTREGAR DEPOIS',
          variant: 'secondary_pearl',
          onClick: () => callbacks.onCloseDialogue('ENTREGAR DEPOIS'),
        },
      ];
    }

    // 3. Oferta Inicial de Missão
    if (questState === 'INITIAL_OFFER') {
      return [
        {
          id: 'quest-offer-accept',
          label: 'ACEITAR MISSÃO',
          variant: 'primary_sapphire',
          onClick: () => callbacks.onAcceptQuest(),
        },
        {
          id: 'quest-offer-decline',
          label: 'AGORA NÃO',
          variant: 'secondary_pearl',
          onClick: () => callbacks.onCloseDialogue('AGORA NÃO'),
        },
      ];
    }

    // 4. Missão já Concluída (1 botão único)
    if (questState === 'COMPLETED') {
      return [
        {
          id: 'quest-completed-bye',
          label: 'DISPONHA! ATÉ LOGO',
          variant: 'primary_sapphire',
          onClick: () => callbacks.onCloseDialogue('DISPONHA! ATÉ LOGO'),
        },
      ];
    }
  }

  // C. Duelo ou Batalha (eventKind === 'duel') — 2 Botões
  if (marker.eventKind === 'duel' || marker.type === 'boss') {
    return [
      {
        id: 'duel-fight',
        label: 'LUTAR / DUELO',
        variant: 'crimson_duel',
        onClick: () => callbacks.onStartDuel(),
      },
      {
        id: 'duel-retreat',
        label: 'RECUAR',
        variant: 'secondary_pearl',
        onClick: () => callbacks.onCloseDialogue('RECUAR'),
      },
    ];
  }

  // D. Teleporte / Viagem Rápida (type === 'travel') — 2 Botões
  if (marker.type === 'travel') {
    return [
      {
        id: 'travel-now',
        label: 'VIAJAR AGORA',
        variant: 'amethyst_travel',
        onClick: () => callbacks.onFastTravel(),
      },
      {
        id: 'travel-stay',
        label: 'FICAR AQUI',
        variant: 'secondary_pearl',
        onClick: () => callbacks.onCloseDialogue('FICAR AQUI'),
      },
    ];
  }

  // E. Encerramento Padrão — 1 Botão
  return [
    {
      id: 'default-bye',
      label: 'ATÉ LOGO',
      variant: 'primary_sapphire',
      onClick: () => callbacks.onCloseDialogue('ATÉ LOGO'),
    },
  ];
}
