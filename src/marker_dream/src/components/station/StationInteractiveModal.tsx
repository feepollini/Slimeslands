import React, { useState, useEffect } from 'react';
import { MapMarker, InteractiveScreenConfig } from '../../types/map';
import { X, Plus, RotateCcw, Sparkles, Clock } from 'lucide-react';
import { 
  DEFAULT_INCUBATOR_SVG, 
  EGG_GOLD_SVG, 
  EGG_BLUE_SVG, 
  EGG_RED_SVG, 
  EGG_GREEN_SVG, 
  DEFAULT_HATCHLING_SVG 
} from '../../data/defaultStationAssets';

interface StationInteractiveModalProps {
  marker: MapMarker;
  onClose: () => void;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  onSpawnNpcMarker?: (npcMarker: MapMarker | MapMarker[]) => void;
  allProjectMarkers?: MapMarker[];
}

export const StationInteractiveModal: React.FC<StationInteractiveModalProps> = ({
  marker,
  onClose,
  onUpdateMarker,
  onSpawnNpcMarker,
  allProjectMarkers = [],
}) => {
  const station: InteractiveScreenConfig = marker.stationConfig || {
    stationTitle: 'Chocadeira Mágica',
    stationSubtitle: 'Insira os ovos mágicos no ninho aquecido e inicie a choca para que as criaturas nasçam no mapa!',
    stationType: 'incubator',
    baseAssetPng: DEFAULT_INCUBATOR_SVG,
    slotsCount: 6,
    slots: [],
    processTimeSeconds: 10,
    processStatus: 'idle',
    spawnNpcOnHatch: true,
    spawnNpcMovementType: 'wander',
    spawnNpcPatrolRadius: 100,
    spawnNpcHasDialogue: false, // Padrão: sem diálogos obrigatórios (só caminha)
    spawnNpcDialogue: '',
  };

  const [slots, setSlots] = useState(station.slots || []);
  const [status, setStatus] = useState<'idle' | 'running' | 'completed'>(station.processStatus || 'idle');
  const [timeLeft, setTimeLeft] = useState<number>(station.processTimeSeconds || 10);
  const totalTime = station.processTimeSeconds || 10;
  const [isEggDrawerOpen, setIsEggDrawerOpen] = useState<boolean>(false);

  const defaultPalette = station.availablePaletteAssets || [
    { id: 'egg-gold', name: 'Ovo Dourado Solar', pngUrl: EGG_GOLD_SVG },
    { id: 'egg-blue', name: 'Ovo Cósmico de Dragão', pngUrl: EGG_BLUE_SVG },
    { id: 'egg-red', name: 'Ovo de Rubi Flamejante', pngUrl: EGG_RED_SVG },
    { id: 'egg-green', name: 'Ovo Esmeralda Místico', pngUrl: EGG_GREEN_SVG },
  ];

  // Temporizador de Choca Contínua Real-Time
  useEffect(() => {
    let timerId: NodeJS.Timeout;

    if (status === 'running') {
      timerId = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerId);
            handleHatchProcessComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(timerId);
  }, [status, slots, marker.id, station]);

  // Eclosão concluída: gera as criaturas no mapa (se 6 ovos, 6 saídas com seus PNGs)
  const handleHatchProcessComplete = () => {
    setStatus('completed');

    if (station.spawnNpcOnHatch !== false && onSpawnNpcMarker) {
      const activeEggSlots = slots.filter((s) => s.currentAssetPng);
      // Se houver ovos ativos, eclode cada um; se nenhum tiver sido colocado manualmente mas os slots existirem, eclode todos
      const slotsToHatch = activeEggSlots.length > 0 ? activeEggSlots : (slots.length > 0 ? slots : [null]);
      const totalCount = slotsToHatch.length;
      const spawnedNpcs: MapMarker[] = [];

      slotsToHatch.forEach((slot, idx) => {
        const linkedMarkerId = slot?.spawnNpcLinkMarkerId || station.spawnNpcLinkMarkerId;
        const linkedMarker = linkedMarkerId ? allProjectMarkers.find((m) => m.id === linkedMarkerId) : undefined;

        const creatureName =
          slot?.resultAssetName ||
          linkedMarker?.name ||
          (station.resultAssetName
            ? (totalCount > 1 ? `${station.resultAssetName} #${idx + 1}` : station.resultAssetName)
            : (totalCount > 1 ? `Pintinho #${idx + 1}` : 'Pintinho Mágico'));

        const creaturePng =
          slot?.resultAssetPng ||
          linkedMarker?.customIconPng ||
          station.resultAssetPng ||
          DEFAULT_HATCHLING_SVG;

        const walkMode = station.spawnNpcMovementType || 'wander';

        // Diálogo do NPC nascido: por padrão FALSO / opcional (só caminha livremente)
        const hasDialogue = slot?.spawnNpcHasDialogue ?? station.spawnNpcHasDialogue ?? false;
        const dialoguePhrase =
          slot?.spawnNpcDialogue ||
          linkedMarker?.npcPhrases?.[0] ||
          station.spawnNpcDialogue ||
          '';

        // Posição: dispersa os NPCs suavemente em círculo ao redor da chocadeira
        const angle = totalCount > 1 ? (idx / totalCount) * Math.PI * 2 : Math.PI / 4;
        const radiusDist = 44 + (idx % 2) * 14;
        const spawnX = Math.round(marker.x + Math.cos(angle) * radiusDist);
        const spawnY = Math.round(marker.y + Math.sin(angle) * radiusDist);

        const spawnedNpc: MapMarker = {
          id: `npc-hatch-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          name: creatureName,
          description: station.resultMessage || `Criatura nascida na ${station.stationTitle || 'Chocadeira'}.`,
          type: 'npc',
          color: linkedMarker?.color || '#f59e0b',
          status: 'active',
          x: spawnX,
          y: spawnY,
          subBiomeId: marker.subBiomeId,
          customIconPng: creaturePng,
          size: Math.round((marker.size || 56) * 0.85),
          npcBounce: true,
          dialogueEnabled: hasDialogue,
          npcPhrases: hasDialogue && dialoguePhrase.trim() ? [dialoguePhrase] : [],
          npcPatrol: {
            enabled: walkMode !== 'idle',
            preset: walkMode === 'idle' ? 'horizontal' : (walkMode === 'patrol' ? 'horizontal' : 'procedural'),
            walkStyle: walkMode === 'bounce' ? 'slime_hop' : 'jelly',
            speed: 2.2,
            distance: station.spawnNpcPatrolRadius || 100,
            pauseTime: 1.5,
            loop: true,
            customMode: 'points',
            waypoints: [],
          },
        };

        spawnedNpcs.push(spawnedNpc);
      });

      if (spawnedNpcs.length === 1) {
        onSpawnNpcMarker(spawnedNpcs[0]);
      } else if (spawnedNpcs.length > 1) {
        onSpawnNpcMarker(spawnedNpcs);
      }
    }

    onUpdateMarker(marker.id, {
      stationConfig: {
        ...station,
        slots,
        processStatus: 'completed',
      },
    });
  };

  const updateAndSaveSlots = (newSlots: typeof slots) => {
    setSlots(newSlots);
    onUpdateMarker(marker.id, {
      stationConfig: {
        ...station,
        slots: newSlots,
        processStatus: status,
      },
    });
  };

  // Inserir ovo no próximo slot vazio (permitido mesmo durante a choca se houver espaço vazio)
  const handleAddEggToNextEmptySlot = (eggUrl: string, eggName: string) => {
    const nextEmptyIndex = slots.findIndex((s) => !s.currentAssetPng);
    if (nextEmptyIndex !== -1) {
      const updated = [...slots];
      updated[nextEmptyIndex] = {
        ...updated[nextEmptyIndex],
        currentAssetPng: eggUrl,
        currentAssetName: eggName,
      };
      updateAndSaveSlots(updated);
    }
  };

  const handleRemoveEggFromSlot = (slotId: string) => {
    if (status === 'running') return;
    const updated = slots.map((s) =>
      s.id === slotId ? { ...s, currentAssetPng: undefined, currentAssetName: undefined } : s
    );
    updateAndSaveSlots(updated);
  };

  const handleFillAllSlots = () => {
    const eggPool = [EGG_GOLD_SVG, EGG_BLUE_SVG, EGG_RED_SVG, EGG_GREEN_SVG];
    const namePool = ['Ovo Dourado Solar', 'Ovo Cósmico de Dragão', 'Ovo de Rubi Flamejante', 'Ovo Esmeralda Místico'];

    const updated = slots.map((s, idx) => ({
      ...s,
      currentAssetPng: s.currentAssetPng || eggPool[idx % eggPool.length],
      currentAssetName: s.currentAssetName || namePool[idx % namePool.length],
    }));
    updateAndSaveSlots(updated);
  };

  const handleClearAllSlots = () => {
    if (status === 'running') return;
    const updated = slots.map((s) => ({
      ...s,
      currentAssetPng: undefined,
      currentAssetName: undefined,
    }));
    setStatus('idle');
    setTimeLeft(totalTime);
    updateAndSaveSlots(updated);
  };

  const handleStartProcess = () => {
    const occupied = slots.filter((s) => !!s.currentAssetPng).length;
    if (occupied === 0) return;
    setTimeLeft(totalTime);
    setStatus('running');
    onUpdateMarker(marker.id, {
      stationConfig: {
        ...station,
        slots,
        processStatus: 'running',
        processTimeSeconds: totalTime,
      },
    });
  };

  const handleResetProcess = () => {
    setStatus('idle');
    setTimeLeft(totalTime);
    onUpdateMarker(marker.id, {
      stationConfig: {
        ...station,
        processStatus: 'idle',
      },
    });
  };

  const occupiedCount = slots.filter((s) => !!s.currentAssetPng).length;
  const emptySlotsCount = slots.length - occupiedCount;

  return (
    /* CONTAINER ESTRITAMENTE ESCOFADO AO EMULADOR PREVIEW (IGUAL AO activeDialogueMarker) */
    <div className="absolute inset-3 rounded-[34px] z-50 overflow-hidden bg-slate-950/75 backdrop-blur-xs flex flex-col justify-end select-none pointer-events-auto">
      
      {/* Keyframe para animação de trepidação orgânica meio jelly (apenas 1 ou 2 ovos por vez) */}
      <style>{`
        @keyframes eggOrganicJellyEmulator {
          0%, 62%, 100% {
            transform: translate(-50%, -50%) rotate(var(--egg-rot, 0deg)) scale(1, 1);
          }
          67% {
            transform: translate(-50%, -50%) rotate(calc(var(--egg-rot, 0deg) - 4deg)) scale(1.15, 0.88);
          }
          72% {
            transform: translate(-50%, -50%) rotate(calc(var(--egg-rot, 0deg) + 6deg)) scale(0.88, 1.15);
          }
          77% {
            transform: translate(-50%, -50%) rotate(calc(var(--egg-rot, 0deg) - 3deg)) scale(1.08, 0.94);
          }
          83% {
            transform: translate(-50%, -50%) rotate(calc(var(--egg-rot, 0deg) + 2deg)) scale(0.96, 1.04);
          }
          89% {
            transform: translate(-50%, -50%) rotate(var(--egg-rot, 0deg)) scale(1, 1);
          }
        }
      `}</style>

      {/* 1. DEGRADÊ TEMÁTICO DINÂMICO NO FUNDO ATRÁS DA PNG (PADRÃO TELA DE QUEST) */}
      <div
        className="absolute left-0 right-0 bottom-0 h-[65%] pointer-events-none z-0 transition-all duration-500"
        style={{
          background: 'linear-gradient(to bottom, transparent 0%, #1e1302 26%, #0d0801 60%, #000 100%)',
        }}
      />

      {/* 2. AURA DE BRILHO RADIANTE ATRÁS DA PNG */}
      <div className="absolute inset-x-0 top-14 bottom-30 flex items-center justify-center pointer-events-none z-5">
        <div
          className="w-72 h-72 rounded-full blur-3xl opacity-60 transition-all duration-700 animate-pulse pointer-events-none"
          style={{
            background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)',
          }}
        />
      </div>

      {/* 3. BOTÃO DE FECHAR NO CANTO SUPERIOR DIREITO (PADRÃO TELA DE QUEST) */}
      <div className="absolute top-4 right-4 z-40">
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-white/40 text-white flex items-center justify-center shadow-lg transition-transform active:scale-90 cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* 4. TÍTULO NA CÁPSULA COM DESIGN GAMER (POSIÇÃO CONFIGURÁVEL) */}
      <div 
        className="absolute inset-x-0 z-30 flex justify-center pointer-events-none px-4 transition-all"
        style={{ top: `${station.titleOffsetY ?? 80}px` }}
      >
        <div
          className="px-8 py-2.5 rounded-full border-[3px] border-amber-300 shadow-[0_6px_16px_rgba(0,0,0,0.7),0_0_22px_rgba(245,158,11,0.4)] flex items-center justify-center min-w-[240px] pointer-events-auto"
          style={{
            background: 'linear-gradient(180deg, #78350f 0%, #291102 50%, #150800 100%)',
          }}
        >
          <span
            className="text-base sm:text-lg font-black tracking-wider text-amber-200 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] select-none"
            style={{
              WebkitTextStroke: '0.5px #78350f',
            }}
          >
            {station.stationTitle || 'CHOCADEIRA MÁGICA'}
          </span>
        </div>
      </div>

      {/* 5. PNG CENTRALIZADO DA CHOCADEIRA COM ASSETS AUMENTADOS & POSIÇÃO/TAMANHO CONFIGURÁVEIS (z-10) */}
      <div 
        className="absolute inset-x-0 top-26 bottom-60 flex items-center justify-center overflow-hidden z-10 pointer-events-none transition-transform"
        style={{ transform: `translateY(${station.screenAssetOffsetY ?? 0}px)` }}
      >
        {(() => {
          const baseScale = station.baseAssetScale || 1.0;
          const currentSize = station.screenAssetSize ?? 440;
          const basePx = Math.round(currentSize * baseScale);

          return (
            <div
              className="relative flex items-center justify-center shrink-0 pointer-events-auto"
              style={{ width: `${basePx}px`, height: `${basePx}px` }}
            >
              {/* Base Chocadeira / Ninho Grandiosa - Z-Index 10 */}
              <img
                src={station.baseAssetPng || DEFAULT_INCUBATOR_SVG}
                alt="Chocadeira"
                className="relative z-10 w-full h-full object-contain filter drop-shadow-[0_20px_35px_rgba(0,0,0,0.9)] pointer-events-none"
              />

              {/* Slots de Ovos Sobrepostos no Ninho - Z-Index >= 35 (Sempre à Frente da Base) */}
              {status !== 'completed' &&
                slots.map((slot, idx) => {
                  const offX = (slot.offsetX / 100) * basePx;
                  const offY = (slot.offsetY / 100) * basePx;
                  const slotScale = slot.scale || 0.52;
                  const sizePx = Math.round(basePx * slotScale);
                  const hasEgg = !!slot.currentAssetPng;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        if (hasEgg) {
                          handleRemoveEggFromSlot(slot.id);
                        } else {
                          setIsEggDrawerOpen(true);
                        }
                      }}
                      title={
                        hasEgg
                          ? `Clique para remover ${slot.currentAssetName}`
                          : 'Slot vazio: clique para escolher ovo'
                      }
                      className={`absolute flex items-center justify-center rounded-full transition-all cursor-pointer ${
                        hasEgg
                          ? 'hover:scale-115 active:scale-95 filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.75)]'
                          : 'border-2 border-dashed border-amber-400/60 bg-amber-500/15 hover:bg-amber-500/30 shadow-inner'
                      }`}
                      style={{
                        left: `calc(50% + ${offX}px)`,
                        top: `calc(50% + ${offY}px)`,
                        width: `${sizePx}px`,
                        height: `${sizePx}px`,
                        transform: `translate(-50%, -50%) rotate(${slot.rotation || 0}deg)`,
                        zIndex: 35 + idx + Math.max(0, Math.round(offY + 50)),
                        animation:
                          status === 'running' && hasEgg
                            ? 'eggOrganicJellyEmulator 4.5s cubic-bezier(0.34, 1.56, 0.64, 1) infinite'
                            : undefined,
                        animationDelay:
                          status === 'running' && hasEgg ? `${(idx * 1.5) % 4.5}s` : undefined,
                        ['--egg-rot' as any]: `${slot.rotation || 0}deg`,
                      }}
                    >
                      {hasEgg ? (
                        <img
                          src={slot.currentAssetPng}
                          alt={slot.currentAssetName || 'Ovo'}
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-amber-300 font-black">
                          <span className="text-base leading-none">+</span>
                          <span className="text-[10px] leading-none opacity-80">{idx + 1}</span>
                        </div>
                      )}
                    </button>
                  );
                })}

              {/* Criatura Eclodida no Ninho se Concluído */}
              {status === 'completed' && (
                <div className="absolute inset-0 flex items-center justify-center z-40 animate-fade-in pointer-events-none">
                  <div className="w-40 h-40 relative flex items-center justify-center animate-bounce">
                    <div className="absolute inset-[-15%] bg-radial from-amber-400/70 to-transparent rounded-full filter blur-md animate-pulse" />
                    <img
                      src={station.resultAssetPng || DEFAULT_HATCHLING_SVG}
                      alt={station.resultAssetName || 'Pintinho'}
                      className="w-full h-full object-contain filter drop-shadow-[0_16px_30px_rgba(245,158,11,0.95)]"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* 6. CONTEÚDO DO DIÁLOGO / ESTAÇÃO NA PARTE INFERIOR (Subida Configurável) */}
      <div 
        className="relative z-20 space-y-3 pt-1 transition-all"
        style={{ paddingBottom: `${station.bottomControlsOffsetY ?? 104}px` }}
      >
        
        {/* BOTÃO COM ÍCONE DE + AO ESTILO GAMER ACIMA DA DESCRIÇÃO */}
        {status !== 'completed' && (
          <div className="flex justify-center -mb-3.5 relative z-30">
            <button
              type="button"
              onClick={() => setIsEggDrawerOpen(true)}
              disabled={emptySlotsCount === 0}
              className="h-10 px-5 rounded-full border-[2.5px] border-white font-extrabold text-xs shadow-[0_4px_0_rgba(180,83,9,1),0_8px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(180,83,9,1)] hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                backgroundColor: emptySlotsCount > 0 ? '#f59e0b' : '#475569',
                color: emptySlotsCount > 0 ? '#020617' : '#e2e8f0',
              }}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>
                {emptySlotsCount > 0
                  ? `INSERIR OVOS (${occupiedCount}/${slots.length})`
                  : `NINHO CHEIO (${occupiedCount}/${slots.length})`}
              </span>
            </button>
          </div>
        )}

        {/* CAIXA DE TEXTO DA DESCRIÇÃO (ESTILO DIÁLOGO / QUEST) */}
        <div className="px-4 py-1">
          <div
            className="w-full p-4 px-5 rounded-[32px] border-2 shadow-lg select-none text-center"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.92)',
              borderColor: '#f59e0b',
              color: '#fef3c7',
            }}
          >
            <p className="text-xs sm:text-sm font-semibold leading-relaxed min-h-[3.2rem] flex items-center justify-center">
              {station.stationSubtitle ||
                'Insira os ovos no ninho aquecido e inicie a choca para ver as criaturas nascerem no mapa!'}
            </p>
          </div>
        </div>

        {/* ABAIXO DA DESCRIÇÃO: O BOTÃO CHOCAR */}
        <div className="px-4 space-y-2 pt-1">
          {status === 'running' ? (
            /* SE ATIVADO / CLICADO: EXIBE O TEMPO */
            <div
              className="w-full h-11 px-6 rounded-full border-[3px] border-amber-300 text-amber-200 font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] flex items-center justify-between drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]"
              style={{ backgroundColor: '#9a3412' }}
            >
              <span className="flex items-center gap-1.5 animate-pulse">
                <Clock className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
                <span>CHOCANDO...</span>
              </span>
              <span className="font-mono text-sm font-black text-amber-100 bg-black/40 px-2.5 py-0.5 rounded">
                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
                {String(timeLeft % 60).padStart(2, '0')}
              </span>
            </div>
          ) : status === 'completed' ? (
            /* SE CONCLUÍDO: BOTÕES DE CONCLUSÃO */
            <div className="grid grid-cols-2 gap-3.5 max-w-[85%] mx-auto">
              <button
                type="button"
                onClick={handleResetProcess}
                className="h-11 px-3 rounded-full border-[3px] border-white text-white font-extrabold text-xs shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: '#334155' }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Nova Choca</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="h-11 px-3 rounded-full border-[3px] border-white text-slate-950 font-extrabold text-xs shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 hover:brightness-110 flex items-center justify-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: '#10b981' }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Ver no Mapa</span>
              </button>
            </div>
          ) : (
            /* BOTÃO CHOCAR GAMER PADRÃO */
            <div className="max-w-[75%] mx-auto">
              <button
                type="button"
                onClick={handleStartProcess}
                disabled={occupiedCount === 0}
                className="w-full h-11 px-4 rounded-full border-[3px] border-white text-white font-extrabold text-xs sm:text-sm shadow-[0_5px_0_rgba(0,0,0,0.38),0_9px_16px_rgba(0,0,0,0.45)] transition-all active:translate-y-1 active:shadow-[0_1px_0_rgba(0,0,0,0.38),0_4px_8px_rgba(0,0,0,0.4)] hover:brightness-110 flex items-center justify-center gap-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: occupiedCount > 0 ? '#ea580c' : '#334155' }}
              >
                <span>🔥 CHOCAR ({totalTime}s)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 7. GAVETA POPUP INTERNA AO EMULADOR: CARTELA DE OVOS DISPONÍVEIS */}
      {isEggDrawerOpen && (
        <div
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-xs flex flex-col justify-end p-3 animate-fade-in"
          onClick={() => setIsEggDrawerOpen(false)}
        >
          <div
            className="bg-slate-950 border-2 border-amber-400 rounded-[28px] p-4 space-y-3 shadow-2xl max-h-[60%] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header da Cartela */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="text-xs font-black text-amber-300 uppercase tracking-wide">
                🎒 Cartela de Ovos ({occupiedCount}/{slots.length})
              </div>
              <button
                type="button"
                onClick={() => setIsEggDrawerOpen(false)}
                className="w-6 h-6 rounded-full bg-slate-900 border border-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Grid de Ovos */}
            <div className="grid grid-cols-2 gap-2">
              {defaultPalette.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    handleAddEggToNextEmptySlot(item.pngUrl, item.name);
                    if (emptySlotsCount <= 1) {
                      setIsEggDrawerOpen(false);
                    }
                  }}
                  disabled={emptySlotsCount === 0}
                  className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-400 active:scale-95 transition-all flex items-center gap-2 text-left cursor-pointer disabled:opacity-40"
                >
                  <img src={item.pngUrl} alt={item.name} className="w-8 h-8 object-contain shrink-0" />
                  <div className="overflow-hidden">
                    <div className="text-[11px] font-bold text-amber-100 truncate">{item.name}</div>
                    <div className="text-[9px] text-amber-400/80">Inserir</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Ações da Cartela */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-850">
              <button
                type="button"
                onClick={() => {
                  handleFillAllSlots();
                  setIsEggDrawerOpen(false);
                }}
                disabled={emptySlotsCount === 0}
                className="flex-1 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-[11px] disabled:opacity-40 cursor-pointer"
              >
                Preencher Vazios
              </button>
              {occupiedCount > 0 && status !== 'running' && (
                <button
                  type="button"
                  onClick={handleClearAllSlots}
                  className="py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-[11px] cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
