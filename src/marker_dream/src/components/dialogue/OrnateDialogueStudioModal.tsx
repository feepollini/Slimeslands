import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Copy,
  Eye,
  Gamepad2,
  Layers,
  Monitor,
  Play,
  RotateCcw,
  Sliders,
  Smartphone,
  Sparkles,
  Swords,
  Tablet,
  Compass,
  ScrollText,
} from 'lucide-react';
import { OrnateDialogueBubble } from './OrnateDialogueBubble';
import { MotionAssetCanvas } from '../MotionAssetCanvas';
import {
  DEFAULT_VIEWPORT_VARIABLES,
  type DialogueOptionItem,
  type DialogueStep,
  type DialogueViewportConfigMap,
  type DialogueViewportMode,
  type GameMarkerData,
  type QuestStatusState,
} from '../../types/dialogue';
import {
  buildDialogueOptions,
  resolveDialogueSteps,
  resolveQuestBadgeInfo,
} from '../../utils/dialogueEngine';

type ScenarioPresetId =
  | 'exact_replica'
  | 'quest_offer'
  | 'quest_in_progress'
  | 'quest_ready'
  | 'quest_completed'
  | 'studio_3_options'
  | 'duel_battle'
  | 'fast_travel'
  | 'default_close';

const SAVED_DIALOGUES_DB: Record<string, DialogueStep[]> = {
  'bard-royal-ballad': [
    {
      id: 'step-1',
      speaker: 'Bardo Real Gelatino',
      text: 'Ouça os acordes da Harpa Ancestral! As cordas douradas ressoam apenas para aqueles que buscam os Cristais da Aurora.',
    },
    {
      id: 'step-2',
      speaker: 'Bardo Real Gelatino',
      text: 'Três fragmentos foram espalhados pelas Ruínas de Safira. Você tem coragem de recuperá-los para a Coroa?',
    },
  ],
};

export function OrnateDialogueStudioModal({ onClose }: { onClose?: () => void }) {
  // Preset de contexto selecionado
  const [activePreset, setActivePreset] = useState<ScenarioPresetId>('exact_replica');

  // Modo de Tela selecionado (As 4 variáveis de tela solicitadas)
  const [viewportMode, setViewportMode] = useState<DialogueViewportMode>('desktop_landscape');
  const [viewportConfigMap, setViewportConfigMap] = useState<DialogueViewportConfigMap>(
    DEFAULT_VIEWPORT_VARIABLES
  );
  const [showDeviceFrame, setShowDeviceFrame] = useState<boolean>(true);
  const [compareOriginalImg, setCompareOriginalImg] = useState<boolean>(false);

  // 1. Variáveis Diretas do Pop-up (OrnateDialogueBubbleProps)
  const [speakerName, setSpeakerName] = useState<string>('Bardo Real Gelatino');
  const [characterPng, setCharacterPng] = useState<string>('/assets/bard_slime.png');
  const [useNoPngFallback, setUseNoPngFallback] = useState<boolean>(false);
  const [characterScale, setCharacterScale] = useState<number>(1.0);
  const [characterOffsetX, setCharacterOffsetX] = useState<number>(0);
  const [characterOffsetY, setCharacterOffsetY] = useState<number>(0);
  const [fallbackColor, setFallbackColor] = useState<string>('#7c3aed');
  const [useMotionJelly, setUseMotionJelly] = useState<boolean>(false);
  const [referencePlaceholderMode, setReferencePlaceholderMode] = useState<boolean>(true);

  // Estado do marcador / contexto de jogo
  const [stepOriginMode, setStepOriginMode] = useState<
    'dialogueSteps' | 'dialogueId' | 'npcPhrases' | 'dialogueText'
  >('dialogueSteps');
  const [questState, setQuestState] = useState<QuestStatusState>('INITIAL_OFFER');
  const [studioOptionCount, setStudioOptionCount] = useState<1 | 2 | 3>(2);

  // Fluxo de Passos (currentStepIndex e totalSteps) + Typewriter
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [displayedText, setDisplayedText] = useState<string>('');
  const [isTypingComplete, setIsTypingComplete] = useState<boolean>(true);
  const [lastActionFeedback, setLastActionFeedback] = useState<string>(
    'Pronto — Clique em qualquer botão do diálogo para testar o fluxo.'
  );
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Constrói o marcador conforme o preset e origem selecionados
  const markerData: GameMarkerData = useMemo(() => {
    const baseMarker: GameMarkerData = {
      id: 'npc-bard-01',
      name: speakerName || 'Bardo Real Gelatino',
      dialogueCharacterName: speakerName,
      dialogueCharacterPng: useNoPngFallback ? undefined : characterPng,
      dialogueCharacterScale: characterScale,
      dialogueCharacterOffsetX: characterOffsetX,
      dialogueCharacterOffsetY: characterOffsetY,
      color: fallbackColor,
      type: 'npc',
      eventKind: 'none',
    };

    // Configura origem dos passos
    if (stepOriginMode === 'dialogueId') {
      baseMarker.dialogueId = 'bard-royal-ballad';
    } else if (stepOriginMode === 'npcPhrases') {
      baseMarker.npcPhrases = [
        'Minha lira dourada nunca desafina diante de um verdadeiro herói!',
        'Dizem que o Rei Slime guarda a melodia perdida nas profundezas do castelo.',
        'Qual será o próximo verso da sua jornada?',
      ];
    } else if (stepOriginMode === 'dialogueText') {
      baseMarker.dialogueText =
        'Saudações, nobre aventureiro! Que a melodia real ilumine seu caminho pelas terras do reino.';
    } else {
      baseMarker.dialogueSteps = [
        {
          id: 'local-1',
          speaker: speakerName,
          text: 'Aproximai-vos, viajante! Há eras entoo os cânticos dourados deste santuário.',
        },
        {
          id: 'local-2',
          speaker: speakerName,
          text:
            activePreset === 'duel_battle'
              ? 'Mostre seu valor em um duelo musical ou recue enquanto ainda há tempo!'
              : activePreset === 'fast_travel'
              ? 'Posso transportar sua caravana instantaneamente pelo Portal de Ametista.'
              : 'Escolha sabiamente seu destino nas opções abaixo.',
          playerResponses:
            activePreset === 'studio_3_options'
              ? [
                  { id: 'r1', label: 'OUVIR BALADA', nextStepIndex: 0 },
                  { id: 'r2', label: 'PEDIR CONSELHO' },
                  { id: 'r3', label: 'PARTIR AGORA', actionType: 'close' },
                ].slice(0, studioOptionCount)
              : undefined,
        },
      ];
    }

    // Configura o contexto final de botões
    if (
      activePreset === 'quest_offer' ||
      activePreset === 'quest_in_progress' ||
      activePreset === 'quest_ready' ||
      activePreset === 'quest_completed'
    ) {
      baseMarker.eventKind = 'quest';
      baseMarker.type = 'quest_giver';
      baseMarker.questState = questState;
      baseMarker.questTitle = 'A Harpa dos Ventos';
      baseMarker.questProgressText =
        questState === 'READY'
          ? '3/3 Cordas Celestiais'
          : questState === 'IN_PROGRESS'
          ? '1/3 Cordas Celestiais'
          : undefined;
    } else if (activePreset === 'duel_battle') {
      baseMarker.eventKind = 'duel';
      baseMarker.type = 'boss';
    } else if (activePreset === 'fast_travel') {
      baseMarker.type = 'travel';
    }

    return baseMarker;
  }, [
    speakerName,
    useNoPngFallback,
    characterPng,
    characterScale,
    characterOffsetX,
    characterOffsetY,
    fallbackColor,
    stepOriginMode,
    activePreset,
    questState,
    studioOptionCount,
  ]);

  const dialogueSteps = useMemo(
    () => resolveDialogueSteps(markerData, SAVED_DIALOGUES_DB),
    [markerData]
  );

  const safeStepIndex = Math.min(currentStepIndex, Math.max(0, dialogueSteps.length - 1));
  const currentStep = dialogueSteps[safeStepIndex];
  const fullText = currentStep?.text || '';

  // Efeito Typewriter para displayedText e isTypingComplete
  useEffect(() => {
    if (referencePlaceholderMode) {
      setDisplayedText(fullText);
      setIsTypingComplete(true);
      return;
    }

    setDisplayedText('');
    setIsTypingComplete(false);
    let idx = 0;

    const timer = window.setInterval(() => {
      idx += 1;
      if (idx >= fullText.length) {
        setDisplayedText(fullText);
        setIsTypingComplete(true);
        window.clearInterval(timer);
      } else {
        setDisplayedText(fullText.slice(0, idx));
      }
    }, 22);

    return () => window.clearInterval(timer);
  }, [fullText, safeStepIndex, referencePlaceholderMode]);

  // Calcula options: DialogueOptionItem[]
  const computedOptions: DialogueOptionItem[] = useMemo(() => {
    // Modo Réplica Exata da Imagem: mostra exatamente [✦ OPÇÃO 1] (Safira) e [✦ OPÇÃO 1] (Marfim)
    if (activePreset === 'exact_replica') {
      return [
        {
          id: 'replica-opt-1',
          label: 'OPÇÃO 1',
          variant: 'primary_sapphire',
          onClick: () =>
            setLastActionFeedback('Clicou em [✦ OPÇÃO 1] (Variante: primary_sapphire)'),
        },
        {
          id: 'replica-opt-2',
          label: 'OPÇÃO 1',
          variant: 'secondary_pearl',
          onClick: () =>
            setLastActionFeedback('Clicou em [✦ OPÇÃO 1] (Variante: secondary_pearl)'),
        },
      ];
    }

    return buildDialogueOptions({
      marker: markerData,
      currentStep,
      currentStepIndex: safeStepIndex,
      totalSteps: dialogueSteps.length,
      callbacks: {
        onNextStep: (targetIdx) => {
          const next = typeof targetIdx === 'number' ? targetIdx : safeStepIndex + 1;
          setCurrentStepIndex(next);
          setLastActionFeedback(`Avançou para o Passo ${next + 1} de ${dialogueSteps.length}`);
        },
        onCloseDialogue: (label) => {
          setLastActionFeedback(`Diálogo encerrado via botão [✦ ${label}]`);
        },
        onAcceptQuest: () => {
          setQuestState('IN_PROGRESS');
          setActivePreset('quest_in_progress');
          setLastActionFeedback('Missão Aceita! Estado alterado para: EM ANDAMENTO');
        },
        onCompleteQuest: () => {
          setQuestState('COMPLETED');
          setActivePreset('quest_completed');
          setLastActionFeedback('Missão Entregue & Finalizada! Recompensa recebida.');
        },
        onOpenQuestLog: () => {
          setLastActionFeedback('Abriu o Painel de Quests (VER QUESTS)');
        },
        onStartDuel: () => {
          setLastActionFeedback('Iniciou Combate / Duelo contra o NPC! (crimson_duel)');
        },
        onFastTravel: () => {
          setLastActionFeedback('Teleporte / Viagem Rápida acionada! (amethyst_travel)');
        },
      },
    });
  }, [activePreset, markerData, currentStep, safeStepIndex, dialogueSteps.length]);

  const questInfo = useMemo(() => resolveQuestBadgeInfo(markerData), [markerData]);

  // Seleção rápida de Presets
  const handleSelectPreset = (preset: ScenarioPresetId) => {
    setActivePreset(preset);
    if (preset === 'exact_replica') {
      setReferencePlaceholderMode(true);
      setCurrentStepIndex(0);
      return;
    }

    setReferencePlaceholderMode(false);
    // Coloca no passo final para demonstrar imediatamente os botões finais daquele contexto
    const targetLastStep = Math.max(0, dialogueSteps.length - 1);
    setCurrentStepIndex(targetLastStep);

    if (preset === 'quest_offer') setQuestState('INITIAL_OFFER');
    if (preset === 'quest_in_progress') setQuestState('IN_PROGRESS');
    if (preset === 'quest_ready') setQuestState('READY');
    if (preset === 'quest_completed') setQuestState('COMPLETED');
  };

  // Atualiza variável específica da tela ativa
  const updateActiveScreenVar = <K extends keyof DialogueViewportConfigMap[DialogueViewportMode]>(
    key: K,
    value: DialogueViewportConfigMap[DialogueViewportMode][K]
  ) => {
    setViewportConfigMap((prev) => ({
      ...prev,
      [viewportMode]: {
        ...prev[viewportMode],
        [key]: value,
      },
    }));
  };

  const activeScreenVars = viewportConfigMap[viewportMode];

  const handleCopyConfig = () => {
    const snippet = `// Variáveis das 4 Telas + Props do OrnateDialogueBubble
export const VIEWPORT_CONFIG = ${JSON.stringify(viewportConfigMap, null, 2)};

<OrnateDialogueBubble
  speakerName="${speakerName}"
  characterPng="${characterPng}"
  characterScale={${characterScale}}
  characterOffsetX={${characterOffsetX}}
  characterOffsetY={${characterOffsetY}}
  fallbackColor="${fallbackColor}"
  displayedText={displayedText}
  fullText={fullText}
  isTypingComplete={isTypingComplete}
  options={options}
  questInfo={questInfo}
  viewportMode="${viewportMode}"
  viewportConfigMap={VIEWPORT_CONFIG}
/>`;
    navigator.clipboard.writeText(snippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col">
      {/* TOP BAR CONTRACT: 3 Zonas Limpas */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-white/10 bg-[#12131a]">
        <div className="flex items-center gap-3 whitespace-nowrap shrink-0">
          <span
            className="text-base font-bold tracking-wider text-amber-300 uppercase"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            OrnateDialogueBubble Studio
          </span>
        </div>

        {/* ZONA 2: Seletor rápido das 4 Telas solicitadas */}
        <nav className="flex items-center gap-1.5 bg-black/40 p-1 rounded-lg border border-white/10 overflow-x-auto">
          {(
            [
              {
                id: 'mobile_portrait',
                label: 'Celular Vertical',
                icon: Smartphone,
              },
              {
                id: 'mobile_landscape',
                label: 'Celular Paisagem',
                icon: Smartphone,
                rotate: true,
              },
              {
                id: 'tablet_portrait',
                label: 'Tablet Vertical',
                icon: Tablet,
              },
              {
                id: 'desktop_landscape',
                label: 'Tablet / PC Paisagem',
                icon: Monitor,
              },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active = viewportMode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setViewportMode(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  active
                    ? 'bg-amber-400 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-300 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    'rotate' in item && item.rotate ? 'rotate-90' : ''
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* ZONA 3: Ação Primária (Copiar Código / Variáveis) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={handleCopyConfig}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCode ? 'Variáveis Copiadas!' : 'Copiar Props & Telas'}</span>
          </button>
        </div>
      </header>

      {/* WORKSPACE PRINCIPAL */}
      <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 p-6 max-w-[1600px] w-full mx-auto">
        {/* COLUNA ESQUERDA: PALCO INTERATIVO DO POP-UP NAS 4 TELAS (7 COLUNAS) */}
        <section className="xl:col-span-7 flex flex-col gap-4">
          {/* Barra de Controles de Visualização */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#151720] border border-white/10 rounded-xl px-4 py-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setReferencePlaceholderMode((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  referencePlaceholderMode
                    ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>
                  {referencePlaceholderMode
                    ? 'Modo Barras da Imagem (Fiel 1:1)'
                    : 'Modo Texto Typewriter Real'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCompareOriginalImg((v) => !v)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  compareOriginalImg
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-400/40'
                    : 'bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Comparar com PNG Original</span>
              </button>
            </div>

            <div className="flex items-center gap-3 text-xs text-slate-400">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showDeviceFrame}
                  onChange={(e) => setShowDeviceFrame(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                <span>Moldura da Tela ({activeScreenVars.deviceWidth}×{activeScreenVars.deviceHeight}px)</span>
              </label>
            </div>
          </div>

          {/* PALCO DO COMPONENTE */}
          <div className="relative flex-1 min-h-[460px] bg-[#131313] border border-white/10 rounded-2xl flex flex-col items-center justify-center p-4 overflow-hidden shadow-2xl">
            {/* Grade sutil de fundo */}
            <div
              className="absolute inset-0 opacity-15 pointer-events-none"
              style={{
                backgroundImage:
                  'radial-gradient(circle at center, rgba(255, 212, 0, 0.14) 0%, transparent 70%)',
              }}
            />

            {/* Simulador das 4 Telas (Celular Vertical, Celular Paisagem, Tablet Vertical, PC/Tablet Paisagem) */}
            <div
              className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
                showDeviceFrame
                  ? 'border-[3px] border-white/15 rounded-[32px] bg-[#131313] shadow-[0_0_50px_rgba(0,0,0,0.85)] overflow-hidden'
                  : ''
              }`}
              style={
                showDeviceFrame
                  ? {
                      width:
                        viewportMode === 'mobile_portrait'
                          ? 390
                          : Math.min(activeScreenVars.deviceWidth, 920),
                      minHeight:
                        viewportMode === 'mobile_landscape'
                          ? 330
                          : viewportMode === 'mobile_portrait'
                          ? 620
                          : 420,
                      maxWidth: '100%',
                    }
                  : { width: '100%', padding: '24px 0' }
              }
            >
              {showDeviceFrame && (
                <>
                  {/* Notch sutil para os modos mobile/tablet */}
                  {viewportMode === 'mobile_portrait' && (
                    <div className="w-28 h-5 bg-black/80 rounded-b-xl border-b border-x border-white/10 mb-2" />
                  )}
                  <div className="absolute top-3 left-4 right-4 flex items-center justify-between text-[11px] font-mono text-slate-400 pointer-events-none">
                    <span>{activeScreenVars.label}</span>
                    <span>
                      {activeScreenVars.deviceWidth}×{activeScreenVars.deviceHeight}
                    </span>
                  </div>
                </>
              )}

              {/* COMPONENTE ORNATE DIALOGUE BUBBLE FIEL */}
              <div
                className={`flex items-center justify-center w-full overflow-visible ${
                  showDeviceFrame && viewportMode === 'mobile_portrait'
                    ? 'mt-auto mb-8'
                    : 'my-auto'
                }`}
              >
                <OrnateDialogueBubble
                  speakerName={speakerName}
                  characterPng={useNoPngFallback ? undefined : characterPng}
                  characterScale={characterScale}
                  characterOffsetX={characterOffsetX}
                  characterOffsetY={characterOffsetY}
                  fallbackColor={fallbackColor}
                  displayedText={displayedText}
                  fullText={fullText}
                  isTypingComplete={isTypingComplete}
                  options={computedOptions}
                  questInfo={questInfo}
                  customMotionAsset={
                    useMotionJelly && !useNoPngFallback ? (
                      <MotionAssetCanvas src={characterPng} alt={speakerName} />
                    ) : undefined
                  }
                  viewportMode={viewportMode}
                  viewportConfigMap={viewportConfigMap}
                  currentStepIndex={safeStepIndex}
                  totalSteps={dialogueSteps.length}
                  referencePlaceholderMode={referencePlaceholderMode}
                  onSkipTyping={() => {
                    setDisplayedText(fullText);
                    setIsTypingComplete(true);
                  }}
                />
              </div>
            </div>

            {/* Comparação com a Imagem Enviada pelo Usuário */}
            {compareOriginalImg && (
              <div className="mt-5 pt-4 border-t border-white/10 flex flex-col items-center gap-2 w-full">
                <span className="text-xs font-mono text-amber-300/90">
                  Imagem de Referência Original Enviada (/assets/aistudio/image_a9d44b38.png):
                </span>
                <img
                  src="/assets/aistudio/image_a9d44b38.png"
                  alt="Referência Original"
                  referrerPolicy="no-referrer"
                  className="max-w-full h-auto rounded-lg border border-white/10"
                />
              </div>
            )}
          </div>

          {/* Barra de Feedback de Eventos e Controle de Passos */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-[#151720] border border-white/10 rounded-xl px-4 py-3 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{lastActionFeedback}</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">
                Passo {safeStepIndex + 1}/{dialogueSteps.length} (
                {safeStepIndex < dialogueSteps.length - 1 ? '!isFinalStep' : 'isFinalStep'})
              </span>
              <button
                type="button"
                onClick={() => setCurrentStepIndex(0)}
                className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer"
              >
                Passo 1
              </button>
              {dialogueSteps.length > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStepIndex(dialogueSteps.length - 1)}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 cursor-pointer"
                >
                  Passo Final
                </button>
              )}
            </div>
          </div>
        </section>

        {/* COLUNA DIREITA: PAINEL DE VARIÁVEIS, PRESETS DE BOTÕES E TELAS (5 COLUNAS) */}
        <aside className="xl:col-span-5 flex flex-col gap-5">
          {/* 1. SELETOR DE CENÁRIOS E AS 5 VARIANTES DE BOTÕES */}
          <div className="bg-[#151720] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-amber-400" />
                <span>3 & 4. Variações de Botões e Contexto do NPC</span>
              </h2>
              <span className="text-xs text-slate-400">5 Variantes Visuais</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset('exact_replica')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'exact_replica'
                    ? 'bg-amber-400/15 border-amber-400 text-amber-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>✦ Réplica 1:1 da Foto</span>
                <span className="text-[10px] font-mono opacity-75">OPÇÃO 1 × 2</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setReferencePlaceholderMode(false);
                  setCurrentStepIndex(0);
                  setActivePreset('quest_offer');
                }}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  !referencePlaceholderMode && safeStepIndex < dialogueSteps.length - 1
                    ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>✦ Passo Intermediário</span>
                <span className="text-[10px] font-mono opacity-75">CONTINUAR</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('quest_offer')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'quest_offer' && safeStepIndex === dialogueSteps.length - 1
                    ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>A1. Oferta de Quest</span>
                <span className="text-[10px] font-mono opacity-75">Safira + Marfim</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('quest_in_progress')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'quest_in_progress'
                    ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>A2. Quest em Andamento</span>
                <span className="text-[10px] font-mono opacity-75">VOU BUSCAR!</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('quest_ready')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'quest_ready'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>A3. Quest Pronta</span>
                <span className="text-[10px] font-mono opacity-75">Esmeralda</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('quest_completed')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'quest_completed'
                    ? 'bg-slate-500/20 border-slate-400 text-slate-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>A4. Quest Concluída</span>
                <span className="text-[10px] font-mono opacity-75">1 Botão Safira</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('duel_battle')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'duel_battle'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Swords className="w-3.5 h-3.5 text-rose-400" />
                  C. Duelo / Batalha
                </span>
                <span className="text-[10px] font-mono opacity-75">Carmesim</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('fast_travel')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'fast_travel'
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-purple-400" />
                  D. Viagem Rápida
                </span>
                <span className="text-[10px] font-mono opacity-75">Ametista</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('studio_3_options')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'studio_3_options'
                    ? 'bg-amber-400/20 border-amber-400 text-amber-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>B. Studio (1 a 3 Botões)</span>
                <span className="text-[10px] font-mono opacity-75">{studioOptionCount} Opções</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset('default_close')}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium border text-left transition-colors cursor-pointer ${
                  activePreset === 'default_close'
                    ? 'bg-blue-500/20 border-blue-400 text-blue-200'
                    : 'bg-black/30 border-white/10 text-slate-300 hover:bg-white/5'
                }`}
              >
                <span>E. Encerramento Padrão</span>
                <span className="text-[10px] font-mono opacity-75">ATÉ LOGO</span>
              </button>
            </div>

            {activePreset === 'studio_3_options' && (
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                <span className="text-slate-300">Quantidade de Botões (playerResponses):</span>
                <div className="flex items-center gap-1.5">
                  {([1, 2, 3] as const).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStudioOptionCount(n)}
                      className={`px-2.5 py-1 rounded font-semibold cursor-pointer ${
                        studioOptionCount === n
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-white/5 text-slate-300'
                      }`}
                    >
                      {n} {n === 1 ? 'Botão' : 'Botões'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 2. VARIÁVEIS DE TELA (4 PERFIS DE TELA) */}
          <div className="bg-[#151720] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-amber-400" />
                <span>Variáveis da Tela Ativa: {activeScreenVars.label}</span>
              </h2>
              <button
                type="button"
                onClick={() => setViewportConfigMap(DEFAULT_VIEWPORT_VARIABLES)}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Resetar</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Escala (uiScale)</span>
                  <span className="font-mono text-amber-300">
                    {activeScreenVars.uiScale.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.65}
                  max={1.35}
                  step={0.02}
                  value={activeScreenVars.uiScale}
                  onChange={(e) => updateActiveScreenVar('uiScale', Number(e.target.value))}
                  className="accent-amber-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Largura (bubbleMaxWidth)</span>
                  <span className="font-mono text-amber-300">
                    {activeScreenVars.bubbleMaxWidth}px
                  </span>
                </div>
                <input
                  type="range"
                  min={320}
                  max={680}
                  step={4}
                  value={activeScreenVars.bubbleMaxWidth}
                  onChange={(e) =>
                    updateActiveScreenVar('bubbleMaxWidth', Number(e.target.value))
                  }
                  className="accent-amber-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Avatar (avatarSize)</span>
                  <span className="font-mono text-amber-300">{activeScreenVars.avatarSize}px</span>
                </div>
                <input
                  type="range"
                  min={110}
                  max={230}
                  step={2}
                  value={activeScreenVars.avatarSize}
                  onChange={(e) => updateActiveScreenVar('avatarSize', Number(e.target.value))}
                  className="accent-amber-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Ponta Esq. (avatarScreenOffsetX)</span>
                  <span className="font-mono text-amber-300">
                    {activeScreenVars.avatarScreenOffsetX}px
                  </span>
                </div>
                <input
                  type="range"
                  min={-90}
                  max={10}
                  step={2}
                  value={activeScreenVars.avatarScreenOffsetX}
                  onChange={(e) =>
                    updateActiveScreenVar('avatarScreenOffsetX', Number(e.target.value))
                  }
                  className="accent-amber-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Recuo Esq. (paddingLeft)</span>
                  <span className="font-mono text-amber-300">
                    {activeScreenVars.contentPaddingLeft}px
                  </span>
                </div>
                <input
                  type="range"
                  min={70}
                  max={190}
                  step={2}
                  value={activeScreenVars.contentPaddingLeft}
                  onChange={(e) =>
                    updateActiveScreenVar('contentPaddingLeft', Number(e.target.value))
                  }
                  className="accent-amber-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Fonte Texto (dialogueFontSize)</span>
                  <span className="font-mono text-amber-300">
                    {activeScreenVars.dialogueFontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={11}
                  max={18}
                  step={0.5}
                  value={activeScreenVars.dialogueFontSize}
                  onChange={(e) =>
                    updateActiveScreenVar('dialogueFontSize', Number(e.target.value))
                  }
                  className="accent-amber-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>Altura Botão (buttonHeight)</span>
                  <span className="font-mono text-amber-300">
                    {activeScreenVars.buttonHeight}px
                  </span>
                </div>
                <input
                  type="range"
                  min={28}
                  max={46}
                  step={1}
                  value={activeScreenVars.buttonHeight}
                  onChange={(e) => updateActiveScreenVar('buttonHeight', Number(e.target.value))}
                  className="accent-amber-400"
                />
              </label>
            </div>
          </div>

          {/* 3. VARIÁVEIS DIRETAS DO POP-UP (OrnateDialogueBubbleProps) */}
          <div className="bg-[#151720] border border-white/10 rounded-2xl p-5 flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>1. Variáveis Diretas (OrnateDialogueBubbleProps)</span>
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCharacterScale(1.0);
                  setCharacterOffsetX(0);
                  setCharacterOffsetY(0);
                }}
                className="text-xs text-slate-400 hover:text-white cursor-pointer"
              >
                Resetar Avatar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex flex-col gap-1">
                <span className="text-slate-400">speakerName</span>
                <input
                  type="text"
                  value={speakerName}
                  onChange={(e) => setSpeakerName(e.target.value)}
                  className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-slate-400">Origem dos Passos (dialogueSteps)</span>
                <select
                  value={stepOriginMode}
                  onChange={(e) => {
                    setStepOriginMode(
                      e.target.value as
                        | 'dialogueSteps'
                        | 'dialogueId'
                        | 'npcPhrases'
                        | 'dialogueText'
                    );
                    setCurrentStepIndex(0);
                    setReferencePlaceholderMode(false);
                  }}
                  className="bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="dialogueSteps">marker.dialogueSteps (2 passos)</option>
                  <option value="dialogueId">marker.dialogueId (Salvo)</option>
                  <option value="npcPhrases">marker.npcPhrases (3 frases)</option>
                  <option value="dialogueText">marker.dialogueText (1 passo)</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>characterScale</span>
                  <span className="font-mono text-amber-300">{characterScale.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.7}
                  max={1.35}
                  step={0.05}
                  value={characterScale}
                  onChange={(e) => setCharacterScale(Number(e.target.value))}
                  className="accent-amber-400"
                />
              </label>

              <label className="flex flex-col gap-1">
                <div className="flex justify-between text-slate-300">
                  <span>characterOffsetX / Y</span>
                  <span className="font-mono text-amber-300">
                    {characterOffsetX}px, {characterOffsetY}px
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={characterOffsetX}
                    onChange={(e) => setCharacterOffsetX(Number(e.target.value))}
                    className="w-1/2 accent-amber-400"
                  />
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={characterOffsetY}
                    onChange={(e) => setCharacterOffsetY(Number(e.target.value))}
                    className="w-1/2 accent-amber-400"
                  />
                </div>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10 text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none text-slate-300">
                <input
                  type="checkbox"
                  checked={useMotionJelly}
                  onChange={(e) => setUseMotionJelly(e.target.checked)}
                  className="rounded accent-amber-400"
                />
                <span>Ativar customMotionAsset (Efeito Gelatina)</span>
              </label>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-300">
                  <input
                    type="checkbox"
                    checked={useNoPngFallback}
                    onChange={(e) => setUseNoPngFallback(e.target.checked)}
                    className="rounded accent-amber-400"
                  />
                  <span>Testar fallbackColor</span>
                </label>
                <input
                  type="color"
                  value={fallbackColor}
                  onChange={(e) => setFallbackColor(e.target.value)}
                  className="w-6 h-6 rounded border border-white/20 bg-transparent cursor-pointer"
                  title="Cor de fallback (marker.color)"
                />
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
