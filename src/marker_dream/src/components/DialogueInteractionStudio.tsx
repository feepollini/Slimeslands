import React, { useState, useRef } from 'react';
import { MapMarker, MapProject, SavedDialogue, DialogueStep } from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import {
  MessageSquare,
  Upload,
  Plus,
  Play,
  Swords,
  Sparkles,
  Compass,
  FileText,
  User,
  Trash2,
  Bookmark,
  Check,
  Copy,
  FolderOpen,
  ChevronRight,
  ArrowRight,
  Settings,
  HelpCircle,
  Video,
  CloudRain,
  Moon,
  Sun,
  Flame,
} from 'lucide-react';

interface Props {
  markers: MapMarker[];
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  onTestDialogue: (marker: MapMarker) => void;
  savedDialogues?: SavedDialogue[];
  onUpdateProject?: (updates: Partial<MapProject>) => void;
}

export const DialogueInteractionStudio: React.FC<Props> = ({
  markers,
  selectedMarkerId,
  onSelectMarker,
  onUpdateMarker,
  onTestDialogue,
  savedDialogues = [],
  onUpdateProject,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'editor' | 'library'>('editor');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const characterFileInputRef = useRef<HTMLInputElement>(null);

  const selectedMarker = markers.find((m) => m.id === selectedMarkerId);

  // Garante que o marcador tenha steps inicializados caso esteja com dialogueEnabled
  const markerSteps: DialogueStep[] = selectedMarker?.dialogueSteps && selectedMarker.dialogueSteps.length > 0
    ? selectedMarker.dialogueSteps
    : selectedMarker?.npcPhrases && selectedMarker.npcPhrases.length > 0
    ? selectedMarker.npcPhrases.filter(Boolean).map((p, idx) => ({
        id: `step-${idx + 1}`,
        speaker: selectedMarker.dialogueCharacterName || selectedMarker.name,
        text: p,
        characterPng: selectedMarker.dialogueCharacterPng || selectedMarker.customIconPng,
        playerResponses: undefined,
      }))
    : [
        {
          id: 'step-1',
          speaker: selectedMarker?.dialogueCharacterName || selectedMarker?.name || 'Orador',
          text: selectedMarker?.dialogueText || 'Saudações, nobre viajante! O que o traz a estas terras?',
          characterPng: selectedMarker?.dialogueCharacterPng || selectedMarker?.customIconPng,
          playerResponses: undefined,
        },
      ];

  const handleUploadCharacterPng = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedMarker) return;
    try {
      const res = await readUploadedImage(file);
      const nextSteps = markerSteps.map((s) => ({ ...s, characterPng: res.dataUrl }));
      onUpdateMarker(selectedMarker.id, {
        dialogueCharacterPng: res.dataUrl,
        dialogueSteps: nextSteps,
        dialogueEnabled: true,
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleAddStep = () => {
    if (!selectedMarker || markerSteps.length >= 4) return;
    const nextIdx = markerSteps.length;
    const defaultTexts = [
      'Saudações, nobre viajante! O que o traz a estas terras?',
      'Há lendas sobre uma grande relíquia oculta além das montanhas.',
      'Você parece ter coragem suficiente para encarar o desafio.',
      'Decida agora seu próximo passo antes que o perigo nos alcance!',
    ];
    const newStep = {
      id: `step-${Date.now()}`,
      speaker: selectedMarker.dialogueCharacterName || selectedMarker.name || 'Orador',
      text: defaultTexts[nextIdx] || 'Prepare-se para o que vem a seguir.',
      characterPng: selectedMarker.dialogueCharacterPng || selectedMarker.customIconPng,
    };
    onUpdateMarker(selectedMarker.id, {
      dialogueSteps: [...markerSteps, newStep],
      dialogueEnabled: true,
    });
  };

  const handleUpdateStep = (index: number, updates: Partial<(typeof markerSteps)[number]>) => {
    if (!selectedMarker) return;
    const nextSteps = [...markerSteps];
    nextSteps[index] = { ...nextSteps[index], ...updates };
    onUpdateMarker(selectedMarker.id, {
      dialogueSteps: nextSteps,
      dialogueText: nextSteps[0]?.text,
      dialogueEnabled: true,
    });
  };

  const handleRemoveStep = (index: number) => {
    if (!selectedMarker || markerSteps.length <= 1) return;
    const nextSteps = [...markerSteps];
    nextSteps.splice(index, 1);
    onUpdateMarker(selectedMarker.id, {
      dialogueSteps: nextSteps,
      dialogueText: nextSteps[0]?.text,
    });
  };

  // Configuração dos 3 slots de botões da frase
  const handleUpdateStepResponse = (
    stepIdx: number,
    respSlot: 0 | 1 | 2,
    label: string,
    nextStepIndex?: number
  ) => {
    if (!selectedMarker) return;
    const step = markerSteps[stepIdx];
    const responses = [...(step.playerResponses || [])];
    while (responses.length < 3) {
      responses.push({ id: `resp-${Date.now()}-${responses.length}`, label: '' });
    }
    if (label.trim()) {
      responses[respSlot] = {
        id: responses[respSlot]?.id || `resp-${Date.now()}-${respSlot}`,
        label,
        nextStepIndex,
      };
    } else {
      responses[respSlot] = {
        id: responses[respSlot]?.id || `resp-${Date.now()}-${respSlot}`,
        label: '',
      };
    }
    const filtered = responses.filter((r) => r.label && r.label.trim());
    handleUpdateStep(stepIdx, { playerResponses: filtered });
  };

  // Salvar diálogo atual como Preset na Biblioteca
  const handleSaveToLibrary = () => {
    if (!selectedMarker || !onUpdateProject) return;
    const name = newPresetName.trim() || `Diálogo de ${selectedMarker.name}`;
    const newPreset: SavedDialogue = {
      id: `dialogue-preset-${Date.now()}`,
      name,
      speaker: selectedMarker.dialogueCharacterName || selectedMarker.name,
      characterPng: selectedMarker.dialogueCharacterPng || selectedMarker.customIconPng,
      steps: markerSteps.map((s) => ({
        id: s.id,
        speaker: s.speaker,
        characterPng: s.characterPng,
        text: s.text,
        playerResponses: s.playerResponses,
      })),
      endEvent: selectedMarker.quest
        ? {
            kind: 'quest',
            questKind: selectedMarker.quest.kind,
            questResourceName: selectedMarker.quest.resourceName,
            questAmount: selectedMarker.quest.requiredAmount,
          }
        : selectedMarker.eventKind === 'duel'
        ? { kind: 'duel' }
        : selectedMarker.type === 'travel'
        ? { kind: 'travel', travelTargetMarkerId: selectedMarker.targetTravelMarkerId }
        : { kind: 'none' },
    };

    onUpdateProject({
      savedDialogues: [...savedDialogues, newPreset],
    });
    setSaveModalOpen(false);
    setNewPresetName('');
  };

  // Aplicar diálogo salvo ao marcador atual com 1 clique
  const handleApplySavedDialogue = (preset: SavedDialogue) => {
    if (!selectedMarker) return;
    const updates: Partial<MapMarker> = {
      dialogueId: preset.id,
      dialogueEnabled: true,
      dialogueCharacterName: preset.speaker || selectedMarker.name,
      dialogueCharacterPng: preset.characterPng || selectedMarker.dialogueCharacterPng,
      dialogueSteps: preset.steps.map((s) => ({
        id: `step-${Date.now()}-${Math.random()}`,
        speaker: s.speaker || preset.speaker || selectedMarker.name,
        characterPng: s.characterPng || preset.characterPng,
        text: s.text,
        playerResponses: s.playerResponses ? [...s.playerResponses] : undefined,
      })),
      dialogueText: preset.steps[0]?.text || '',
    };

    if (preset.endEvent) {
      if (preset.endEvent.kind === 'quest') {
        updates.quest = {
          kind: preset.endEvent.questKind || 'collect',
          resourceName: preset.endEvent.questResourceName || 'Madeira',
          requiredAmount: preset.endEvent.questAmount || 5,
        };
      } else if (preset.endEvent.kind === 'duel') {
        updates.eventKind = 'duel';
      }
    }

    onUpdateMarker(selectedMarker.id, updates);
    setActiveSubTab('editor');
  };

  const handleDeleteSavedDialogue = (presetId: string) => {
    if (!onUpdateProject) return;
    onUpdateProject({
      savedDialogues: savedDialogues.filter((d) => d.id !== presetId),
    });
  };

  return (
    <div className="space-y-4">
      <input
        ref={characterFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadCharacterPng}
      />

      {/* Header com Abas Unificadas */}
      <div className="flex items-center justify-between p-1 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          onClick={() => setActiveSubTab('editor')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'editor'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Editor de Diálogo</span>
        </button>
        <button
          onClick={() => setActiveSubTab('library')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-colors ${
            activeSubTab === 'library'
              ? 'bg-amber-400 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Biblioteca de Diálogos ({savedDialogues.length})</span>
        </button>
      </div>

      {/* =========================================================================
          SUB-ABA 1: EDITOR DE DIÁLOGO UNIFICADO
         ========================================================================= */}
      {activeSubTab === 'editor' && (
        <div className="space-y-4 animate-fade-in">
          {/* Seletor do Marcador Ativo */}
          <div className="p-3 bg-slate-900/90 border border-slate-800 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span>NPC / Marcador em Edição</span>
              </label>
              {selectedMarker && (
                <button
                  onClick={() => onTestDialogue(selectedMarker)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] shadow-sm transition-transform active:scale-95"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Testar ao Vivo</span>
                </button>
              )}
            </div>

            <select
              value={selectedMarkerId || ''}
              onChange={(e) => onSelectMarker(e.target.value || null)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-400"
            >
              <option value="">Selecione um marcador do mapa...</option>
              {markers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name || 'Marcador sem nome'} ({m.type.toUpperCase()})
                  {m.dialogueEnabled ? ' 💬' : ''}
                </option>
              ))}
            </select>

            {selectedMarker && !selectedMarker.dialogueEnabled && (
              <button
                onClick={() => onUpdateMarker(selectedMarker.id, { dialogueEnabled: true })}
                className="w-full py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ativar Diálogo para este Marcador</span>
              </button>
            )}
          </div>

          {selectedMarker ? (
            <div className="space-y-4">
              {/* Orador & Imagem do Personagem */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
                    Orador &amp; Arte Central
                  </span>
                  <button
                    onClick={() => setSaveModalOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium text-[10px] border border-amber-500/30"
                  >
                    <Bookmark className="w-3 h-3" />
                    <span>Salvar Modelo</span>
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Avatar / Imagem central */}
                  <div
                    onClick={() => characterFileInputRef.current?.click()}
                    className="w-16 h-16 rounded-2xl border-2 border-dashed border-amber-500/40 bg-slate-950 hover:bg-slate-800 flex items-center justify-center cursor-pointer overflow-hidden shrink-0 group transition-all"
                    title="Clique para trocar PNG do personagem"
                  >
                    {selectedMarker.dialogueCharacterPng || selectedMarker.customIconPng ? (
                      <img
                        src={selectedMarker.dialogueCharacterPng || selectedMarker.customIconPng}
                        alt="Personagem"
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Upload className="w-5 h-5 text-amber-400/60 group-hover:text-amber-300" />
                    )}
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <label className="text-[10px] font-semibold text-slate-400 block">
                      Nome do Orador (Pílula Central)
                    </label>
                    <input
                      type="text"
                      value={selectedMarker.dialogueCharacterName || selectedMarker.name || ''}
                      onChange={(e) =>
                        onUpdateMarker(selectedMarker.id, {
                          dialogueCharacterName: e.target.value,
                        })
                      }
                      placeholder="Ex: Slime Guerreiro, Aldeão..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 font-bold"
                    />
                  </div>
                </div>

                {/* Controles Deslizantes: Escala e Posicionamento do Eixo Vertical */}
                <div className="pt-2.5 border-t border-slate-800/80 grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300 mb-1">
                      <span>Escala da Imagem</span>
                      <span className="text-amber-400 font-mono font-bold">
                        {Math.round((selectedMarker.dialogueCharacterScale ?? 1) * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="170"
                      step="5"
                      value={Math.round((selectedMarker.dialogueCharacterScale ?? 1) * 100)}
                      onChange={(e) =>
                        onUpdateMarker(selectedMarker.id, {
                          dialogueCharacterScale: Number(e.target.value) / 100,
                        })
                      }
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-300 mb-1">
                      <span>Posição Vertical (Y)</span>
                      <span className="text-amber-400 font-mono font-bold">
                        {(selectedMarker.dialogueCharacterOffsetY ?? 0) > 0 ? '+' : ''}
                        {selectedMarker.dialogueCharacterOffsetY ?? 0}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-80"
                      max="80"
                      step="2"
                      value={selectedMarker.dialogueCharacterOffsetY ?? 0}
                      onChange={(e) =>
                        onUpdateMarker(selectedMarker.id, {
                          dialogueCharacterOffsetY: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* SEQUÊNCIA DE FALAS (1 a 4 Frases) com Slots de Botões */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">
                      Falas Sequenciais ({markerSteps.length}/4)
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Animação de digitação com aceleração por toque
                    </p>
                  </div>
                  {markerSteps.length < 4 && (
                    <button
                      onClick={handleAddStep}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Frase</span>
                    </button>
                  )}
                </div>

                {markerSteps.map((step, sIdx) => {
                  const responses = step.playerResponses || [];
                  return (
                    <div
                      key={step.id || sIdx}
                      className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                          Fala #{sIdx + 1}
                        </span>
                        {markerSteps.length > 1 && (
                          <button
                            onClick={() => handleRemoveStep(sIdx)}
                            className="p-1 text-rose-400 hover:text-rose-300 rounded hover:bg-rose-500/10"
                            title="Remover esta frase"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Texto da Fala */}
                      <textarea
                        value={step.text}
                        onChange={(e) => handleUpdateStep(sIdx, { text: e.target.value })}
                        rows={2}
                        placeholder="Texto da fala do orador..."
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-400 resize-none leading-relaxed"
                      />

                      {/* SLOTS DE BOTÕES (Até 3 botões opcionais: Top Left, Top Right, Bottom Center) */}
                      <div className="pt-1 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-300 flex items-center gap-1">
                            <span>🔘 Slots de Botões da Frase</span>
                          </span>
                          <span className="text-[9px] text-slate-500">
                            {responses.length === 0
                              ? 'Usa o botão padrão "Continuar"'
                              : `${responses.length}/3 configurados`}
                          </span>
                        </div>

                        {/* Visual dos 3 slots: 2 em cima, 1 centralizado embaixo */}
                        <div className="p-2.5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            {/* Slot 1: Superior Esquerdo */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-semibold text-slate-400 block truncate">
                                Slot 1 (Superior Esq.)
                              </span>
                              <input
                                type="text"
                                value={responses[0]?.label || ''}
                                onChange={(e) => handleUpdateStepResponse(sIdx, 0, e.target.value)}
                                placeholder="Botão 1 (opcional)..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-amber-100 focus:outline-none focus:border-amber-400"
                              />
                            </div>

                            {/* Slot 2: Superior Direito */}
                            <div className="space-y-1">
                              <span className="text-[9px] font-semibold text-slate-400 block truncate">
                                Slot 2 (Superior Dir.)
                              </span>
                              <input
                                type="text"
                                value={responses[1]?.label || ''}
                                onChange={(e) => handleUpdateStepResponse(sIdx, 1, e.target.value)}
                                placeholder="Botão 2 (opcional)..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-amber-100 focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>

                          {/* Slot 3: Inferior Centralizado */}
                          <div className="max-w-[75%] mx-auto space-y-1 text-center">
                            <span className="text-[9px] font-semibold text-slate-400 block truncate">
                              Slot 3 (Inferior Central)
                            </span>
                            <input
                              type="text"
                              value={responses[2]?.label || ''}
                              onChange={(e) => handleUpdateStepResponse(sIdx, 2, e.target.value)}
                              placeholder="Botão 3 ou 'Continuar'..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-amber-100 focus:outline-none focus:border-amber-400 text-center"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* DESFECHO / EVENTO FINAL APÓS AS FALAS */}
              <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">
                    Desfecho / Evento Conectado
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    O que acontece quando o diálogo termina
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <button
                    onClick={() =>
                      onUpdateMarker(selectedMarker.id, {
                        quest: undefined,
                        eventKind: 'dialogue',
                      })
                    }
                    className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      !selectedMarker.quest && selectedMarker.eventKind !== 'duel'
                        ? 'bg-amber-400/20 border-amber-400 text-amber-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>💬</span>
                    <span>Apenas Conversa</span>
                  </button>

                  <button
                    onClick={() =>
                      onUpdateMarker(selectedMarker.id, {
                        quest: {
                          kind: 'collect',
                          resourceName: 'Madeira',
                          requiredAmount: 5,
                        },
                      })
                    }
                    className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      selectedMarker.quest
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🎯</span>
                    <span>Dar Missão (Quest)</span>
                  </button>

                  <button
                    onClick={() =>
                      onUpdateMarker(selectedMarker.id, {
                        quest: undefined,
                        eventKind: 'duel',
                      })
                    }
                    className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      selectedMarker.eventKind === 'duel'
                        ? 'bg-rose-500/20 border-rose-400 text-rose-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>⚔️</span>
                    <span>Desafio / Duelo</span>
                  </button>

                  <button
                    onClick={() =>
                      onUpdateMarker(selectedMarker.id, {
                        quest: undefined,
                        type: 'travel',
                      })
                    }
                    className={`p-2 rounded-xl border flex items-center gap-1.5 transition-colors ${
                      selectedMarker.type === 'travel'
                        ? 'bg-indigo-500/20 border-indigo-400 text-indigo-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span>🌌</span>
                    <span>Portal / Viagem</span>
                  </button>
                </div>

                {/* Detalhes de Missão */}
                {selectedMarker.quest && (
                  <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/30 space-y-2">
                    <span className="text-[10px] font-bold text-emerald-300 block">
                      Configuração da Missão
                    </span>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { type: 'wood', name: 'Madeira', emoji: '🪵' },
                        { type: 'stone', name: 'Pedra', emoji: '🪨' },
                        { type: 'flower', name: 'Flores', emoji: '🌸' },
                        { type: 'gold', name: 'Ouro', emoji: '💰' },
                        { type: 'slime_water', name: 'Slime', emoji: '🧪' },
                        { type: 'coal', name: 'Carvão', emoji: '🪙' },
                      ].map((res) => (
                        <button
                          key={res.type}
                          onClick={() =>
                            onUpdateMarker(selectedMarker.id, {
                              quest: {
                                kind: 'collect',
                                resourceName: res.name,
                                iconEmoji: res.emoji,
                                requiredAmount: selectedMarker.quest?.requiredAmount || 5,
                              },
                            })
                          }
                          className={`p-1 rounded-lg border text-[10px] flex items-center justify-center gap-1 ${
                            selectedMarker.quest?.resourceName === res.name
                              ? 'bg-emerald-500/30 border-emerald-400 text-emerald-100 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          <span>{res.emoji}</span>
                          <span>{res.name}</span>
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-400">Quantidade necessária:</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={selectedMarker.quest.requiredAmount || 5}
                        onChange={(e) =>
                          onUpdateMarker(selectedMarker.id, {
                            quest: {
                              ...selectedMarker.quest!,
                              requiredAmount: Math.max(1, parseInt(e.target.value) || 1),
                            },
                          })
                        }
                        className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-amber-200 font-mono text-center"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl text-center space-y-2">
              <User className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">
                Selecione um NPC ou marcador na lista acima para começar a configurar suas falas e interações.
              </p>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          SUB-ABA 2: BIBLIOTECA DE DIÁLOGOS SALVOS (PRESETS / MODELOS)
         ========================================================================= */}
      {activeSubTab === 'library' && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200">
              Modelos de Diálogos Prontos
            </span>
            <span className="text-[10px] text-amber-400 font-mono">
              {savedDialogues.length} cadastrados
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Vincule qualquer modelo com 1 clique a qualquer NPC do mapa para aplicar instantaneamente falas, arte e eventos!
          </p>

          <div className="space-y-2.5">
            {savedDialogues.map((preset) => {
              const isLinked = selectedMarker?.dialogueId === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isLinked
                      ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">📜</span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-100">{preset.name}</h4>
                        <span className="text-[10px] text-amber-400 font-semibold">
                          Orador: {preset.speaker || 'Geral'} · {preset.steps?.length || 1} frase(s)
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {selectedMarker && (
                        <button
                          onClick={() => handleApplySavedDialogue(preset)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-transform active:scale-95 ${
                            isLinked
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm'
                          }`}
                          title="Vincular este diálogo ao marcador selecionado"
                        >
                          {isLinked ? <Check className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                          <span>{isLinked ? 'Vinculado' : 'Vincular'}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteSavedDialogue(preset.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                        title="Excluir da biblioteca"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 italic line-clamp-2 bg-slate-950/60 p-2 rounded-xl border border-slate-800/80">
                    "{preset.steps?.[0]?.text || 'Sem texto.'}"
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL PARA SALVAR PRESET */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-amber-500/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              <span>Salvar Modelo na Biblioteca</span>
            </h3>
            <p className="text-xs text-slate-400">
              Digite um nome para este diálogo para poder reutilizá-lo em outros NPCs e fases:
            </p>
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder={`Ex: Diálogo de ${selectedMarker?.name || 'Aventura'}`}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-400"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveToLibrary}
                className="px-4 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs rounded-xl shadow-md"
              >
                Salvar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
