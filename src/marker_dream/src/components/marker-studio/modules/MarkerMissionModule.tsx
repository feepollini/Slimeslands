import React, { useState, useEffect } from 'react';
import { MapMarker, MissionStep } from '../../../types/map';
import { Plus, Trash2, GitBranch, Store, Sparkles, CheckCircle2 } from 'lucide-react';
import { QUEST_PROJECTS_STORAGE_KEY } from '../../../utils/questEngine';
import type { ProjectQuestsConfig, QuestDefinition } from '../../../types/questSystem';

interface MarkerMissionModuleProps {
  selectedMarker: MapMarker;
  markers: MapMarker[];
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
}

export const MarkerMissionModule: React.FC<MarkerMissionModuleProps> = ({
  selectedMarker,
  markers,
  onUpdateMarker,
}) => {
  const steps: MissionStep[] = selectedMarker.missionSteps || [];
  const [questsList, setQuestsList] = useState<QuestDefinition[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(QUEST_PROJECTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as ProjectQuestsConfig;
        if (Array.isArray(parsed.quests)) {
          setQuestsList(parsed.quests);
        }
      }
    } catch {
      // ignore
    }
  }, [selectedMarker.id, selectedMarker.linkedQuestId]);

  const addStep = () => {
    const newStep: MissionStep = {
      id: `step-${Date.now()}`,
      title: `Etapa ${steps.length + 1}`,
      type: 'talk',
      description: 'Descreva o que o jogador deve fazer',
    };
    onUpdateMarker(selectedMarker.id, {
      missionSteps: [...steps, newStep],
    });
  };

  const updateStep = (stepId: string, updates: Partial<MissionStep>) => {
    onUpdateMarker(selectedMarker.id, {
      missionSteps: steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s)),
    });
  };

  const removeStep = (stepId: string) => {
    onUpdateMarker(selectedMarker.id, {
      missionSteps: steps.filter((s) => s.id !== stepId),
    });
  };

  const linkedQuest = questsList.find((q) => q.id === selectedMarker.linkedQuestId);

  return (
    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-3">
      {/* INTEGRAÇÃO COM O QUEST ENGINE CENTRAL V2 (SEÇÃO 1, 2 e 17) */}
      <div className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/40 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold text-amber-300 flex items-center gap-1.5">
            <GitBranch className="w-3.5 h-3.5 text-amber-400" />
            <span>Vínculo com Quest Engine V2 (Espelhado)</span>
          </span>
          {linkedQuest && (
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Vinculado
            </span>
          )}
        </div>

        <p className="text-[10px] text-slate-400">
          O Quest Marker funciona como gatilho/referência espacial opcional para uma Quest do Motor Central ou Loja Comercial:
        </p>

        <div className="space-y-1.5">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">
              Quest Vinculada (ID Estável):
            </label>
            <select
              value={selectedMarker.linkedQuestId || ''}
              onChange={(e) =>
                onUpdateMarker(selectedMarker.id, {
                  linkedQuestId: e.target.value || undefined,
                  linkedObjectiveId: undefined,
                })
              }
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
            >
              <option value="">-- Nenhuma Quest V2 vinculada --</option>
              {questsList.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.title} ({q.id})
                </option>
              ))}
            </select>
          </div>

          {linkedQuest && (
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">
                Etapa / Objetivo Específico neste Marcador:
              </label>
              <select
                value={selectedMarker.linkedObjectiveId || ''}
                onChange={(e) =>
                  onUpdateMarker(selectedMarker.id, {
                    linkedObjectiveId: e.target.value || undefined,
                  })
                }
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-amber-300"
              >
                <option value="">-- Início / Gatilho Geral da Quest --</option>
                {linkedQuest.objectives.map((o, i) => (
                  <option key={o.id} value={o.id}>
                    Etapa {i + 1}: {o.description} ({o.eventType})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
              <Store className="w-3 h-3 text-emerald-400" />
              <span>ID de Loja Comercial neste Marcador (ex: Viajante_1):</span>
            </label>
            <input
              type="text"
              value={selectedMarker.shopId || ''}
              onChange={(e) =>
                onUpdateMarker(selectedMarker.id, {
                  shopId: e.target.value || undefined,
                })
              }
              placeholder="Ex: Viajante_1"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono text-emerald-300"
            />
          </div>
        </div>
      </div>

      {/* ETAPAS LOCAIS DO MARCADOR (PRESERVADO PARA COMPATIBILIDADE COM SAVES EXISTENTES) */}
      <div className="flex items-center justify-between pt-1">
        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
          <span>📜</span>
          <span>Roteiro Local de Etapas ({steps.length})</span>
        </div>
        <button
          type="button"
          onClick={addStep}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Nova Etapa
        </button>
      </div>

      {steps.length === 0 ? (
        <p className="text-[11px] text-slate-400 text-center py-3 bg-slate-950/50 rounded-lg border border-slate-800/80">
          Nenhuma etapa local criada. Use o vínculo Quest Engine V2 acima ou adicione etapas locais.
        </p>
      ) : (
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className="p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/20 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Passo #{index + 1}
                </span>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => updateStep(step.id, { title: e.target.value })}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white font-semibold"
                  placeholder="Título da Etapa"
                />
                <button
                  type="button"
                  onClick={() => removeStep(step.id)}
                  className="p-1 text-red-400 hover:text-red-300 hover:bg-red-950/50 rounded cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-0.5">Tipo de Objetivo</label>
                  <select
                    value={step.type}
                    onChange={(e) => updateStep(step.id, { type: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value="talk">💬 Conversar com NPC</option>
                    <option value="collect">🎒 Coletar / Comprar Item</option>
                    <option value="defeat">⚔️ Derrotar Inimigo</option>
                    <option value="reach">📍 Chegar ao Local</option>
                  </select>
                </div>

                {(step.type === 'talk' || step.type === 'defeat' || step.type === 'reach') && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Marcador Alvo</label>
                    <select
                      value={step.targetMarkerId || ''}
                      onChange={(e) => updateStep(step.id, { targetMarkerId: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    >
                      <option value="">-- Selecionar no Mapa --</option>
                      {markers
                        .filter((m) => m.id !== selectedMarker.id)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.behavior || m.type})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {step.type === 'collect' && (
                  <div>
                    <label className="text-[10px] text-slate-400 block mb-0.5">Qtd Necessária</label>
                    <input
                      type="number"
                      min={1}
                      value={step.requiredAmount || 1}
                      onChange={(e) =>
                        updateStep(step.id, { requiredAmount: Number(e.target.value) })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                    />
                  </div>
                )}
              </div>

              <div>
                <input
                  type="text"
                  value={step.description || ''}
                  onChange={(e) => updateStep(step.id, { description: e.target.value })}
                  placeholder="Instrução exibida ao jogador..."
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
