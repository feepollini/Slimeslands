import React, { useRef, useState, useEffect } from 'react';
import { MapMarker, MarkerEventItem } from '../../../types/map';
import { readUploadedImage } from '../../../utils/tileGenerator';
import {
  Sparkles,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Upload,
  Play,
  Square,
  Gift,
  X,
} from 'lucide-react';

interface MarkerEventsTabProps {
  selectedMarker: MapMarker;
  markers: MapMarker[];
  savedLevels?: import('../../../types/map').SavedLevel[];
  savedDialogues?: import('../../../types/map').SavedDialogue[];
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  onOpenDialogueTab?: () => void;
}

export const MarkerEventsTab: React.FC<MarkerEventsTabProps> = ({
  selectedMarker,
  markers,
  savedDialogues,
  onUpdateMarker,
  onOpenDialogueTab,
}) => {
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const activeAudioEventIdRef = useRef<string | null>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const rewardSlotFileInputRef = useRef<HTMLInputElement>(null);
  const activeRewardSlotIdxRef = useRef<number | null>(null);

  // Limpa áudio ao desmontar
  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current = null;
      }
    };
  }, []);

  // Helper para obter todos os eventos do marcador (com compatibilidade com dados legados)
  const getMarkerEvents = (marker?: MapMarker | null): MarkerEventItem[] => {
    if (!marker) return [];
    if (marker.events && marker.events.length > 0) {
      return marker.events;
    }
    const legacy: MarkerEventItem[] = [];
    if (marker.quest && marker.quest.kind) {
      legacy.push({
        id: `legacy-quest-${marker.id}`,
        type: 'quest',
        title: marker.quest.title || 'Missão do Marcador',
        timing: 'simultaneous',
        trigger: 'interact',
        quest: {
          kind: marker.quest.kind as any,
          title: marker.quest.title,
          instructions: marker.quest.instructions,
          resourceType: marker.quest.resourceType || marker.questResourceType,
          resourceName: marker.quest.resourceName || marker.questResource?.name,
          iconEmoji: marker.quest.iconEmoji || marker.questResource?.iconEmoji,
          requiredAmount: marker.quest.requiredAmount || marker.questRequiredAmount,
        },
      });
    }
    if (marker.dialogueEnabled || marker.dialogueId || marker.dialogueText) {
      legacy.push({
        id: `legacy-dialogue-${marker.id}`,
        type: 'dialogue',
        title: 'Falas & Diálogo',
        timing: 'simultaneous',
        trigger: 'interact',
        dialogueId: marker.dialogueId,
        dialogueText: marker.dialogueText,
        dialogueSpeaker: marker.dialogueCharacterName || marker.name,
      });
    }
    if (marker.type === 'travel' || marker.targetTravelMarkerId) {
      legacy.push({
        id: `legacy-travel-${marker.id}`,
        type: 'teleport',
        title: 'Portal de Teleporte',
        timing: 'simultaneous',
        trigger: 'contact',
        teleportTargetMarkerId: marker.targetTravelMarkerId,
        teleportAuto: marker.travelAuto !== false,
      });
    }
    if (marker.audioUrl) {
      legacy.push({
        id: `legacy-audio-${marker.id}`,
        type: 'sound_area',
        title: 'Som Espacial',
        timing: 'simultaneous',
        trigger: 'contact',
        audioUrl: marker.audioUrl,
        audioVolume: marker.audioVolume ?? 0.8,
        audioRadius: marker.audioRadius ?? 120,
        audioShape: marker.audioShape || 'circle',
        audioBlendMode: marker.audioBlendMode || 'mix',
        audioPlaybackMode: marker.audioPlaybackMode || 'restart',
      });
    }
    if (marker.cinematicTargetMarkerId || marker.cinematicZoom) {
      legacy.push({
        id: `legacy-cinematic-${marker.id}`,
        type: 'cinematic',
        title: 'Cinemática de Câmera',
        timing: 'sequential',
        trigger: 'contact',
        cinematicTargetType: marker.cinematicTargetType || 'marker',
        cinematicTargetMarkerId: marker.cinematicTargetMarkerId,
        cinematicZoom: marker.cinematicZoom || 1.5,
        cinematicHoldDuration: marker.cinematicHoldDuration || 3.0,
        cinematicPanInDuration: marker.cinematicPanInDuration || 1.2,
        cinematicPanOutDuration: marker.cinematicPanOutDuration || 1.0,
        cinematicFreezePlayer: marker.cinematicFreezePlayer !== false,
      });
    }
    return legacy;
  };

  const updateMarkerEvents = (newEvents: MarkerEventItem[]) => {
    if (!selectedMarker) return;
    const firstQuest = newEvents.find((e) => e.type === 'quest')?.quest;
    const firstDialogue = newEvents.find((e) => e.type === 'dialogue');
    const firstTeleport = newEvents.find((e) => e.type === 'teleport');
    const firstAudio = newEvents.find((e) => e.type === 'sound_area');
    const firstCinematic = newEvents.find((e) => e.type === 'cinematic');
    const firstWeather = newEvents.find((e) => e.type === 'weather');
    const firstReward = newEvents.find((e) => e.type === 'reward');

    onUpdateMarker(selectedMarker.id, {
      events: newEvents,
      quest: firstQuest ? {
        kind: firstQuest.kind || 'collect',
        title: firstQuest.title,
        instructions: firstQuest.instructions,
        resourceType: firstQuest.resourceType,
        resourceName: firstQuest.resourceName,
        iconEmoji: firstQuest.iconEmoji,
        requiredAmount: firstQuest.requiredAmount,
      } : (newEvents.some(e => e.type === 'quest') ? selectedMarker.quest : undefined),
      dialogueEnabled: !!firstDialogue,
      dialogueId: firstDialogue?.dialogueId,
      dialogueText: firstDialogue?.dialogueText,
      targetTravelMarkerId: firstTeleport?.teleportTargetMarkerId,
      travelAuto: firstTeleport?.teleportAuto,
      audioUrl: firstAudio?.audioUrl,
      audioVolume: firstAudio?.audioVolume,
      audioRadius: firstAudio?.audioRadius,
      audioShape: firstAudio?.audioShape,
      audioBlendMode: firstAudio?.audioBlendMode,
      audioPlaybackMode: firstAudio?.audioPlaybackMode,
      cinematicTargetType: firstCinematic?.cinematicTargetType,
      cinematicTargetMarkerId: firstCinematic?.cinematicTargetMarkerId,
      cinematicZoom: firstCinematic?.cinematicZoom,
      cinematicHoldDuration: firstCinematic?.cinematicHoldDuration,
      cinematicPanInDuration: firstCinematic?.cinematicPanInDuration,
      cinematicPanOutDuration: firstCinematic?.cinematicPanOutDuration,
      cinematicFreezePlayer: firstCinematic?.cinematicFreezePlayer,
      eventWeather: firstWeather?.weatherType,
      rewardSlots: firstReward?.rewardSlots || selectedMarker.rewardSlots,
    });
  };

  const togglePlayAudio = (url: string) => {
    if (playingAudioUrl === url) {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      }
      setPlayingAudioUrl(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      const audio = new Audio(url);
      audioPlayerRef.current = audio;
      audio.onended = () => setPlayingAudioUrl(null);
      audio.play().catch(() => {});
      setPlayingAudioUrl(url);
    }
  };

  const handleUploadAudioEvent = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const eventId = activeAudioEventIdRef.current;
    if (!file || !selectedMarker) return;
    try {
      const reader = new FileReader();
      reader.onload = (uploadEv) => {
        const dataUrl = uploadEv.target?.result as string;
        if (!dataUrl) return;
        const currentEvents = getMarkerEvents(selectedMarker);
        const updated = currentEvents.map((evt) =>
          evt.id === eventId ? { ...evt, audioUrl: dataUrl } : evt
        );
        updateMarkerEvents(updated);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Erro ao ler áudio:', err);
    }
    e.target.value = '';
  };

  const handleUploadRewardSlot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const slotIdx = activeRewardSlotIdxRef.current;
    if (!file || !selectedMarker || slotIdx === null) return;
    try {
      const res = await readUploadedImage(file);
      const currentSlots = [...(selectedMarker.rewardSlots || [null, null, null, null, null, null])];
      while (currentSlots.length < 6) currentSlots.push(null);
      currentSlots[slotIdx] = res.dataUrl;

      const currentEvents = getMarkerEvents(selectedMarker);
      const updated = currentEvents.map((ev) =>
        ev.type === 'reward' ? { ...ev, rewardSlots: currentSlots } : ev
      );
      updateMarkerEvents(updated);
      onUpdateMarker(selectedMarker.id, { rewardSlots: currentSlots });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const currentEvents = getMarkerEvents(selectedMarker);

  return (
    <div className="space-y-3">
      {/* Hidden inputs para áudio e itens */}
      <input
        type="file"
        ref={audioFileInputRef}
        onChange={handleUploadAudioEvent}
        accept="audio/*,.mp3,.wav,.ogg"
        className="hidden"
      />
      <input
        type="file"
        ref={rewardSlotFileInputRef}
        onChange={handleUploadRewardSlot}
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
      />

      {/* Cabeçalho do Estúdio de Eventos */}
      <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-amber-500/30 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-sm border border-amber-500/40">⚡</span>
            <div>
              <h4 className="text-xs font-black text-amber-200 tracking-wide uppercase">
                Eventos do Marcador
              </h4>
              <p className="text-[10px] text-slate-400 leading-tight">
                Execute ações simultâneas ou em sequência neste marcador
              </p>
            </div>
          </div>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
            currentEvents.length > 0
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}>
            {currentEvents.length > 0 ? `${currentEvents.length} Ativo(s)` : 'Sem Eventos'}
          </span>
        </div>

        {/* Botões Rápidos de Adicionar Evento */}
        <div className="pt-2 border-t border-slate-800/80">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
            + Adicionar Evento ao Marcador:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { type: 'quest' as const, label: 'Quest / Missão', icon: '🎯', desc: 'Objetivo de jogo', color: 'border-teal-500/40 hover:bg-teal-500/20 text-teal-300' },
              { type: 'dialogue' as const, label: 'Diálogo', icon: '💬', desc: 'Falas de NPC', color: 'border-amber-500/40 hover:bg-amber-500/20 text-amber-300' },
              { type: 'sound_area' as const, label: 'Som por Área', icon: '🔊', desc: 'Áudio espacial', color: 'border-emerald-500/40 hover:bg-emerald-500/20 text-emerald-300' },
              { type: 'cinematic' as const, label: 'Cinemática', icon: '🎬', desc: 'Câmera & Zoom', color: 'border-fuchsia-500/40 hover:bg-fuchsia-500/20 text-fuchsia-300' },
              { type: 'teleport' as const, label: 'Teleporte', icon: '🌌', desc: 'Portal de fase', color: 'border-purple-500/40 hover:bg-purple-500/20 text-purple-300' },
              { type: 'weather' as const, label: 'Clima', icon: '🌧️', desc: 'Chuva, noite, névoa', color: 'border-sky-500/40 hover:bg-sky-500/20 text-sky-300' },
              { type: 'reward' as const, label: 'Recompensas', icon: '🎁', desc: 'Baú ou drops', color: 'border-yellow-500/40 hover:bg-yellow-500/20 text-yellow-300' },
            ].map((btn) => (
              <button
                key={btn.type}
                type="button"
                onClick={() => {
                  const newId = `evt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
                  const newEvent: MarkerEventItem = {
                    id: newId,
                    type: btn.type,
                    title: btn.label,
                    timing: 'simultaneous',
                    trigger: 'contact',
                    delay: 0,
                    ...(btn.type === 'quest' ? {
                      quest: {
                        kind: 'collect',
                        title: 'Nova Missão',
                        resourceType: 'wood',
                        resourceName: 'Madeira',
                        iconEmoji: '🪵',
                        requiredAmount: 5,
                      },
                    } : {}),
                    ...(btn.type === 'dialogue' ? {
                      dialogueText: 'Olá! Como posso ajudar em sua jornada?',
                    } : {}),
                    ...(btn.type === 'sound_area' ? {
                      audioVolume: 0.8,
                      audioRadius: 140,
                      audioShape: 'circle',
                      audioBlendMode: 'mix',
                    } : {}),
                    ...(btn.type === 'cinematic' ? {
                      cinematicTargetType: 'player',
                      cinematicZoom: 1.5,
                      cinematicHoldDuration: 3.0,
                      cinematicPanInDuration: 1.2,
                      cinematicPanOutDuration: 1.0,
                      cinematicFreezePlayer: true,
                    } : {}),
                    ...(btn.type === 'teleport' ? {
                      teleportAuto: true,
                    } : {}),
                    ...(btn.type === 'weather' ? {
                      weatherType: 'rain',
                      weatherDuration: 0,
                    } : {}),
                    ...(btn.type === 'reward' ? {
                      rewardSlots: [null, null, null, null, null, null],
                    } : {}),
                  };
                  updateMarkerEvents([...currentEvents, newEvent]);
                  setExpandedEventId(newId);
                }}
                className={`p-2 rounded-xl border bg-slate-900/90 text-left transition-all flex flex-col gap-0.5 cursor-pointer hover:scale-[1.02] shadow-sm ${btn.color}`}
              >
                <span className="text-sm select-none">{btn.icon}</span>
                <span className="text-[11px] font-bold leading-tight truncate">{btn.label}</span>
                <span className="text-[9px] text-slate-400 font-normal leading-tight truncate">{btn.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Estado Vazio: Nenhum Evento */}
      {currentEvents.length === 0 && (
        <div className="p-6 bg-slate-950/60 border border-dashed border-slate-800 rounded-xl text-center space-y-2">
          <div className="w-10 h-10 mx-auto rounded-full bg-slate-900 flex items-center justify-center text-lg text-slate-500">
            ⚡
          </div>
          <h5 className="text-xs font-bold text-slate-300">Nenhum evento configurado</h5>
          <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
            Este marcador funciona apenas como elemento do mapa. Clique em um dos botões acima (Quest, Diálogo, Som, Cinemática...) para adicionar ações e comportamento a ele!
          </p>
        </div>
      )}

      {/* Lista de Eventos Configurados */}
      {currentEvents.length > 0 && (
        <div className="space-y-3">
          {currentEvents.map((event, index) => {
            const isExpanded = expandedEventId === event.id || expandedEventId === null;
            return (
              <div
                key={event.id}
                className={`p-3 bg-slate-950 rounded-xl border transition-all ${
                  event.type === 'quest' ? 'border-teal-500/40 shadow-[0_0_12px_rgba(20,184,166,0.15)]' :
                  event.type === 'dialogue' ? 'border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.15)]' :
                  event.type === 'sound_area' ? 'border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.15)]' :
                  event.type === 'cinematic' ? 'border-fuchsia-500/40 shadow-[0_0_12px_rgba(217,70,239,0.15)]' :
                  event.type === 'teleport' ? 'border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]' :
                  event.type === 'weather' ? 'border-sky-500/40 shadow-[0_0_12px_rgba(14,165,233,0.15)]' :
                  'border-yellow-500/40 shadow-[0_0_12px_rgba(234,179,8,0.15)]'
                }`}
              >
                {/* Barra Superior do Card do Evento */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base select-none">
                      {event.type === 'quest' && '🎯'}
                      {event.type === 'dialogue' && '💬'}
                      {event.type === 'sound_area' && '🔊'}
                      {event.type === 'cinematic' && '🎬'}
                      {event.type === 'teleport' && '🌌'}
                      {event.type === 'weather' && '🌧️'}
                      {event.type === 'reward' && '🎁'}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-200 truncate">
                          {event.type === 'quest' && 'Quest (Missão)'}
                          {event.type === 'dialogue' && 'Diálogo & Falas'}
                          {event.type === 'sound_area' && 'Som por Área'}
                          {event.type === 'cinematic' && 'Cinemática de Câmera'}
                          {event.type === 'teleport' && 'Portal / Teleporte'}
                          {event.type === 'weather' && 'Clima & Atmosfera'}
                          {event.type === 'reward' && 'Recompensas / Drops'}
                        </span>
                        <span className="px-1.5 py-0.2 rounded bg-slate-850 text-slate-400 font-mono text-[9px]">
                          #{index + 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {/* Botões Reordenar */}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const reordered = [...currentEvents];
                          const temp = reordered[index - 1];
                          reordered[index - 1] = reordered[index];
                          reordered[index] = temp;
                          updateMarkerEvents(reordered);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Mover para cima"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                    )}
                    {index < currentEvents.length - 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const reordered = [...currentEvents];
                          const temp = reordered[index + 1];
                          reordered[index + 1] = reordered[index];
                          reordered[index] = temp;
                          updateMarkerEvents(reordered);
                        }}
                        className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-900 transition-colors cursor-pointer"
                        title="Mover para baixo"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    )}

                    {/* Alternar Expandir/Recolher */}
                    <button
                      type="button"
                      onClick={() => setExpandedEventId(isExpanded ? '__none__' : event.id)}
                      className="p-1 text-slate-400 hover:text-amber-300 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                      title={isExpanded ? 'Recolher' : 'Expandir'}
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Remover Evento */}
                    <button
                      type="button"
                      onClick={() => {
                        const filtered = currentEvents.filter((_, i) => i !== index);
                        updateMarkerEvents(filtered);
                      }}
                      className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded transition-colors cursor-pointer ml-1"
                      title="Remover este evento"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Configuração de Execução: Simultâneo vs Sequencial + Gatilho */}
                <div className="grid grid-cols-2 gap-1.5 mb-2.5 p-1.5 bg-slate-900/80 rounded-lg border border-slate-800 text-[10px]">
                  {/* Modo de Execução */}
                  <div>
                    <label className="text-slate-400 block font-semibold mb-1">Execução:</label>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentEvents.map((ev, i) =>
                            i === index ? { ...ev, timing: 'simultaneous' as const } : ev
                          );
                          updateMarkerEvents(updated);
                        }}
                        className={`py-1 px-1.5 rounded text-center font-bold cursor-pointer transition-colors ${
                          (event.timing || 'simultaneous') === 'simultaneous'
                            ? 'bg-amber-500/30 text-amber-200 border border-amber-400'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                        title="Dispara ao mesmo tempo com outros eventos deste marcador"
                      >
                        ⚡ Ao mesmo tempo
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = currentEvents.map((ev, i) =>
                            i === index ? { ...ev, timing: 'sequential' as const } : ev
                          );
                          updateMarkerEvents(updated);
                        }}
                        className={`py-1 px-1.5 rounded text-center font-bold cursor-pointer transition-colors ${
                          event.timing === 'sequential'
                            ? 'bg-blue-500/30 text-blue-200 border border-blue-400'
                            : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
                        }`}
                        title="Dispara em sequência após o término do evento anterior"
                      >
                        ➡️ Sequencial
                      </button>
                    </div>
                  </div>

                  {/* Gatilho (Trigger) */}
                  <div>
                    <label className="text-slate-400 block font-semibold mb-1">Gatilho de Disparo:</label>
                    <select
                      value={event.trigger || 'contact'}
                      onChange={(e) => {
                        const updated = currentEvents.map((ev, i) =>
                          i === index ? { ...ev, trigger: e.target.value as any } : ev
                        );
                        updateMarkerEvents(updated);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-[10px] text-slate-200 font-medium focus:outline-none focus:border-amber-400"
                    >
                      <option value="contact">🚶 Ao Encostar / Raio de Contato</option>
                      <option value="interact">💬 Ao Interagir / Botão / Falar</option>
                      <option value="auto_start">⏳ Início da Fase (Automático)</option>
                      <option value="sub_event">🔗 Sub-Evento (Disparado por outro)</option>
                    </select>
                  </div>
                </div>

                {/* Corpo de Configurações Específicas do Evento (se expandido) */}
                {isExpanded && (
                  <div className="space-y-2.5 pt-1">
                    {/* ==================== 1. QUEST / MISSÃO ==================== */}
                    {event.type === 'quest' && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="text-[10px] font-bold text-teal-300 block mb-1">
                              Tipo de Missão:
                            </label>
                            <select
                              value={event.quest?.kind || 'collect'}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index
                                    ? {
                                        ...ev,
                                        quest: {
                                          ...(ev.quest || {}),
                                          kind: e.target.value as any,
                                        },
                                      }
                                    : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="w-full bg-slate-900 border border-teal-500/40 rounded px-2 py-1 text-xs text-teal-200 font-bold focus:outline-none focus:border-teal-400"
                            >
                              <option value="collect">📦 Coletar Itens</option>
                              <option value="talk">💬 Falar com NPCs</option>
                              <option value="discover">🧭 Descobrir Região</option>
                              <option value="duel">⚔️ Duelo com Duelistas</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-teal-300 block mb-1">
                              Título da Missão:
                            </label>
                            <input
                              type="text"
                              placeholder="Ex: Recursos da Aldeia"
                              value={event.quest?.title || ''}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index
                                    ? {
                                        ...ev,
                                        quest: { ...(ev.quest || { kind: 'collect' }), title: e.target.value },
                                      }
                                    : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-100 font-semibold focus:outline-none focus:border-teal-400"
                            />
                          </div>
                        </div>

                        {/* Opções de Coleta de Recursos */}
                        {(event.quest?.kind === 'collect' || !event.quest?.kind) && (
                          <div className="p-2 bg-slate-900/60 rounded-lg border border-teal-500/20 space-y-2">
                            <label className="text-[10px] font-semibold text-slate-400 block">
                              Item / Recurso a Coletar:
                            </label>
                            <div className="grid grid-cols-3 gap-1">
                              {[
                                { type: 'wood', name: 'Madeira', emoji: '🪵' },
                                { type: 'stone', name: 'Pedra', emoji: '🪨' },
                                { type: 'coal', name: 'Carvão', emoji: '🪙' },
                                { type: 'flower', name: 'Flores', emoji: '🌸' },
                                { type: 'slime_water', name: 'Água Slime', emoji: '🧪' },
                                { type: 'gold', name: 'Ouro', emoji: '💰' },
                              ].map((res) => (
                                <button
                                  key={res.type}
                                  type="button"
                                  onClick={() => {
                                    const updated = currentEvents.map((ev, i) =>
                                      i === index
                                        ? {
                                            ...ev,
                                            quest: {
                                              ...(ev.quest || { kind: 'collect' }),
                                              resourceType: res.type,
                                              resourceName: res.name,
                                              iconEmoji: res.emoji,
                                            },
                                          }
                                        : ev
                                    );
                                    updateMarkerEvents(updated);
                                  }}
                                  className={`p-1.5 rounded-lg border flex items-center justify-center gap-1 transition-colors cursor-pointer ${
                                    (event.quest?.resourceType || 'wood') === res.type
                                      ? 'bg-teal-500/25 border-teal-400 text-teal-200 font-bold'
                                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  <span className="text-sm select-none">{res.emoji}</span>
                                  <span className="text-[10px] truncate">{res.name}</span>
                                </button>
                              ))}
                            </div>

                            <div className="flex items-center gap-2 pt-1">
                              <label className="text-[10px] text-slate-400">Quantidade requerida:</label>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={event.quest?.requiredAmount || 5}
                                onChange={(e) => {
                                  const updated = currentEvents.map((ev, i) =>
                                    i === index
                                      ? {
                                          ...ev,
                                          quest: {
                                          ...(ev.quest || { kind: 'collect' }),
                                          requiredAmount: Math.max(1, Number(e.target.value) || 1),
                                        },
                                      }
                                    : ev
                                  );
                                  updateMarkerEvents(updated);
                                }}
                                className="w-16 px-1.5 py-0.5 bg-slate-950 border border-slate-700 rounded text-center font-mono text-teal-300 font-bold focus:outline-none focus:border-teal-400 text-xs"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ==================== 2. DIÁLOGO ==================== */}
                    {event.type === 'dialogue' && (
                      <div className="space-y-2">
                        {savedDialogues && savedDialogues.length > 0 && (
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Diálogo da Biblioteca:
                            </label>
                            <select
                              value={event.dialogueId || ''}
                              onChange={(e) => {
                                const dId = e.target.value;
                                const dObj = savedDialogues?.find((d) => d.id === dId);
                                const updated = currentEvents.map((ev, i) =>
                                  i === index
                                    ? {
                                        ...ev,
                                        dialogueId: dId || undefined,
                                        dialogueText: dObj ? (dObj.steps?.[0]?.text || '') : ev.dialogueText,
                                      }
                                    : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-200 font-semibold focus:outline-none focus:border-amber-400"
                            >
                              <option value="">(Diálogo personalizado rápido)</option>
                              {savedDialogues.map((d) => (
                                <option key={d.id} value={d.id}>
                                  📜 {d.name} ({d.steps?.length || 1} frases)
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        {!event.dialogueId && (
                          <div>
                            <label className="text-[10px] font-semibold text-slate-400 block mb-1">
                              Fala Rápida do Personagem:
                            </label>
                            <textarea
                              rows={2}
                              value={event.dialogueText || ''}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, dialogueText: e.target.value } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              placeholder="Digite a mensagem de diálogo do NPC..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        )}

                        {onOpenDialogueTab && (
                          <button
                            type="button"
                            onClick={onOpenDialogueTab}
                            className="w-full py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs rounded-lg shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Abrir Estúdio Completo de Diálogos</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* ==================== 3. SOM POR ÁREA ==================== */}
                    {event.type === 'sound_area' && (
                      <div className="space-y-2.5">
                        {/* Upload / URL de Áudio */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[10px]">
                            <label className="font-bold text-emerald-300">Áudio Espacial:</label>
                            {event.audioUrl && (
                              <button
                                type="button"
                                onClick={() => togglePlayAudio(event.audioUrl!)}
                                className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1 cursor-pointer hover:bg-emerald-500/30"
                              >
                                {playingAudioUrl === event.audioUrl ? (
                                  <>
                                    <Square className="w-2.5 h-2.5 fill-current" />
                                    <span>Parar</span>
                                  </>
                                ) : (
                                  <>
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Ouvir</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              placeholder="URL do arquivo de áudio (ou carregue abaixo)..."
                              value={event.audioUrl || ''}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, audioUrl: e.target.value } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-400 font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                activeAudioEventIdRef.current = event.id;
                                audioFileInputRef.current?.click();
                              }}
                              className="px-2.5 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/50 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                              title="Carregar arquivo MP3, WAV ou OGG do seu computador"
                            >
                              <Upload className="w-3 h-3" />
                              <span>Local</span>
                            </button>
                          </div>
                        </div>

                        {/* Controles de Volume e Raio */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-850">
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Volume Máximo:</span>
                              <span className="font-mono text-emerald-300 font-bold">
                                {Math.round((event.audioVolume ?? 0.8) * 100)}%
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={event.audioVolume ?? 0.8}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, audioVolume: Number(e.target.value) } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="w-full accent-emerald-400 cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Raio Acústico:</span>
                              <span className="font-mono text-emerald-300 font-bold">
                                {event.audioRadius ?? 140}px
                              </span>
                            </div>
                            <input
                              type="range"
                              min="40"
                              max="600"
                              step="10"
                              value={event.audioRadius ?? 140}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, audioRadius: Number(e.target.value) } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="w-full accent-emerald-400 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Modo de Blend (Mix vs Solo) */}
                        <div className="flex items-center justify-between text-[10px] bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800">
                          <span className="text-slate-300 font-medium">Modo de Áudio de Fundo:</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, audioBlendMode: 'mix' as const } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                                (event.audioBlendMode || 'mix') === 'mix'
                                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400'
                                  : 'bg-slate-950 text-slate-400'
                              }`}
                              title="Toca suavemente junto com a música de fundo do bioma"
                            >
                              🎶 Mixar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, audioBlendMode: 'solo' as const } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                                event.audioBlendMode === 'solo'
                                  ? 'bg-emerald-500/30 text-emerald-200 border border-emerald-400'
                                  : 'bg-slate-950 text-slate-400'
                              }`}
                              title="Silencia ou atenua o som de fundo para destacar esta área"
                            >
                              🔇 Solo
                            </button>
                          </div>
                        </div>

                        {/* Comportamento de Execução: Reiniciar do Zero vs Contínuo */}
                        <div className="flex items-center justify-between text-[10px] bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-800">
                          <div>
                            <span className="text-slate-200 font-bold block">Ao Entrar na Área:</span>
                            <span className="text-[9px] text-slate-400">
                              {(event.audioPlaybackMode || 'restart') === 'restart'
                                ? 'Recomeça do zero a cada encontro'
                                : 'Som contínuo durante a fase'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, audioPlaybackMode: 'restart' as const } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                (event.audioPlaybackMode || 'restart') === 'restart'
                                  ? 'bg-amber-500/25 text-amber-200 border border-amber-400 shadow-sm'
                                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                              title="Cada vez que o jogador entra na área, o áudio toca sempre do início (0:00)"
                            >
                              <span>🔄</span>
                              <span>Do Zero</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, audioPlaybackMode: 'continuous' as const } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className={`px-2 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 ${
                                event.audioPlaybackMode === 'continuous'
                                  ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400 shadow-sm'
                                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                              title="O áudio segue contínuo durante a estadia na fase, atenuando e aumentando o volume suavemente"
                            >
                              <span>📻</span>
                              <span>Contínuo</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ==================== 4. CINEMÁTICA DE CÂMERA ==================== */}
                    {event.type === 'cinematic' && (
                      <div className="space-y-2.5">
                        {/* Tipo de Alvo */}
                        <div>
                          <label className="text-[10px] font-bold text-fuchsia-300 block mb-1">
                            Alvo do Foco da Câmera:
                          </label>
                          <div className="grid grid-cols-3 gap-1 mb-1.5">
                            {[
                              { id: 'player' as const, label: 'Hero / Player', icon: '🏃' },
                              { id: 'marker' as const, label: 'Marcador Alvo', icon: '📍' },
                              { id: 'coordinate' as const, label: 'Coordenadas', icon: '🎯' },
                            ].map((tgt) => (
                              <button
                                key={tgt.id}
                                type="button"
                                onClick={() => {
                                  const updated = currentEvents.map((ev, i) =>
                                    i === index
                                      ? {
                                          ...ev,
                                          cinematicTargetType: tgt.id,
                                        }
                                      : ev
                                  );
                                  updateMarkerEvents(updated);
                                }}
                                className={`p-1.5 rounded-lg border text-center transition-colors cursor-pointer ${
                                  (event.cinematicTargetType || 'player') === tgt.id
                                    ? 'bg-fuchsia-500/30 border-fuchsia-400 text-fuchsia-200 font-bold'
                                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                                }`}
                              >
                                <span className="text-xs block">{tgt.icon}</span>
                                <span className="text-[10px] leading-tight block">{tgt.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Seletor de Marcador Alvo */}
                          {event.cinematicTargetType === 'marker' && (
                            <select
                              value={event.cinematicTargetMarkerId || ''}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, cinematicTargetMarkerId: e.target.value || undefined } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-fuchsia-400"
                            >
                              <option value="">(Selecione o marcador para onde a câmera viaja)</option>
                              {markers
                                .filter((m) => m.id !== selectedMarker.id)
                                .map((m) => (
                                  <option key={m.id} value={m.id}>
                                    📍 {m.name} ({Math.round(m.x)}, {Math.round(m.y)})
                                  </option>
                                ))}
                            </select>
                          )}
                        </div>

                        {/* Sliders de Zoom e Duração */}
                        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-855">
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Zoom da Câmera:</span>
                              <span className="font-mono text-fuchsia-300 font-bold">
                                {(event.cinematicZoom ?? 1.5).toFixed(1)}x
                              </span>
                            </div>
                            <input
                              type="range"
                              min="1.0"
                              max="2.8"
                              step="0.1"
                              value={event.cinematicZoom ?? 1.5}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, cinematicZoom: Number(e.target.value) } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="w-full accent-fuchsia-400 cursor-pointer"
                            />
                          </div>

                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                              <span>Exibição no Alvo:</span>
                              <span className="font-mono text-fuchsia-300 font-bold">
                                {(event.cinematicHoldDuration ?? 3.0).toFixed(1)}s
                              </span>
                            </div>
                            <input
                              type="range"
                              min="0.5"
                              max="10.0"
                              step="0.5"
                              value={event.cinematicHoldDuration ?? 3.0}
                              onChange={(e) => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, cinematicHoldDuration: Number(e.target.value) } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className="w-full accent-fuchsia-400 cursor-pointer"
                            />
                          </div>
                        </div>

                        {/* Checkbox Congelar Herói */}
                        <label className="flex items-center justify-between gap-2 cursor-pointer bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px]">
                          <span className="text-slate-300">Congelar movimento do herói durante a cena</span>
                          <input
                            type="checkbox"
                            checked={event.cinematicFreezePlayer !== false}
                            onChange={(e) => {
                              const updated = currentEvents.map((ev, i) =>
                                i === index ? { ...ev, cinematicFreezePlayer: e.target.checked } : ev
                              );
                              updateMarkerEvents(updated);
                            }}
                            className="w-3.5 h-3.5 accent-fuchsia-400 rounded cursor-pointer"
                          />
                        </label>
                      </div>
                    )}

                    {/* ==================== 5. TELEPORTE ==================== */}
                    {event.type === 'teleport' && (
                      <div className="space-y-2">
                        <div>
                          <label className="text-[10px] font-bold text-purple-300 block mb-1">
                            Marcador de Destino:
                          </label>
                          <select
                            value={event.teleportTargetMarkerId || ''}
                            onChange={(e) => {
                              const updated = currentEvents.map((ev, i) =>
                                i === index ? { ...ev, teleportTargetMarkerId: e.target.value || undefined } : ev
                              );
                              updateMarkerEvents(updated);
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-purple-200 focus:outline-none focus:border-purple-400 font-semibold"
                          >
                            <option value="">(Selecione o destino do portal)</option>
                            {markers
                              .filter((m) => m.id !== selectedMarker.id)
                              .map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.subBiomeId ? '💜' : '🗺️'} {m.name} ({Math.round(m.x)}, {Math.round(m.y)})
                                </option>
                              ))}
                          </select>
                        </div>

                        <label className="flex items-center justify-between gap-2 cursor-pointer bg-slate-900 px-2.5 py-1.5 rounded-lg border border-purple-500/30 text-[10px]">
                          <span className="text-purple-200">Teleporte automático com fade ao encostar</span>
                          <input
                            type="checkbox"
                            checked={event.teleportAuto !== false}
                            onChange={(e) => {
                              const updated = currentEvents.map((ev, i) =>
                                i === index ? { ...ev, teleportAuto: e.target.checked } : ev
                              );
                              updateMarkerEvents(updated);
                            }}
                            className="w-3.5 h-3.5 accent-purple-400 rounded cursor-pointer"
                          />
                        </label>
                      </div>
                    )}

                    {/* ==================== 6. CLIMA & ATMOSFERA ==================== */}
                    {event.type === 'weather' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-sky-300 block">
                          Efeito Climático Ativado:
                        </label>
                        <div className="grid grid-cols-4 gap-1">
                          {[
                            { type: 'rain' as const, label: 'Chuva', emoji: '🌧️' },
                            { type: 'night' as const, label: 'Noite', emoji: '🌙' },
                            { type: 'dawn' as const, label: 'Alvorecer', emoji: '🌅' },
                            { type: 'none' as const, label: 'Limpo', emoji: '☀️' },
                          ].map((w) => (
                            <button
                              key={w.type}
                              type="button"
                              onClick={() => {
                                const updated = currentEvents.map((ev, i) =>
                                  i === index ? { ...ev, weatherType: w.type } : ev
                                );
                                updateMarkerEvents(updated);
                              }}
                              className={`p-2 rounded-lg border text-center transition-colors cursor-pointer ${
                                (event.weatherType || 'rain') === w.type
                                  ? 'bg-sky-500/30 border-sky-400 text-sky-200 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              <span className="text-sm block">{w.emoji}</span>
                              <span className="text-[10px] block leading-tight">{w.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ==================== 7. RECOMPENSAS / DROPS ==================== */}
                    {event.type === 'reward' && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-slate-300">
                          <span className="font-semibold text-amber-300 flex items-center gap-1">
                            <Gift className="w-3.5 h-3.5 text-amber-400" />
                            <span>Slots de Recompensas (6 Slots):</span>
                          </span>
                          <span className="font-mono text-slate-400 text-[10px]">
                            {(event.rewardSlots || selectedMarker.rewardSlots || []).filter(Boolean).length}/6
                          </span>
                        </div>

                        <div className="grid grid-cols-6 gap-1.5">
                          {Array.from({ length: 6 }).map((_, slotIdx) => {
                            const currentSlots = event.rewardSlots || selectedMarker.rewardSlots || [];
                            const item = currentSlots[slotIdx];
                            return (
                              <div
                                key={slotIdx}
                                onClick={() => {
                                  activeRewardSlotIdxRef.current = slotIdx;
                                  rewardSlotFileInputRef.current?.click();
                                }}
                                className={`aspect-square rounded-full flex items-center justify-center border cursor-pointer relative group transition-all ${
                                  item
                                    ? 'border-amber-400/80 bg-amber-500/20 shadow-[0_0_8px_rgba(245,158,11,0.3)] ring-1 ring-amber-400/50 hover:scale-105'
                                    : 'border-slate-800 border-dashed bg-slate-900 hover:border-amber-400/60'
                                }`}
                                title="Clique para carregar PNG do item"
                              >
                                {item ? (
                                  item.startsWith('data:') || item.startsWith('http') ? (
                                    <img src={item} alt="" className="w-5 h-5 object-contain rounded-full" />
                                  ) : (
                                    <span className="text-sm select-none">{item}</span>
                                  )
                                ) : (
                                  <span className="text-[10px] text-slate-500 group-hover:text-amber-400 font-bold">+</span>
                                )}

                                {item && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const nextSlots = [...currentSlots];
                                      while (nextSlots.length < 6) nextSlots.push(null);
                                      nextSlots[slotIdx] = null;
                                      const updated = currentEvents.map((ev, i) =>
                                        i === index ? { ...ev, rewardSlots: nextSlots } : ev
                                      );
                                      updateMarkerEvents(updated);
                                      onUpdateMarker(selectedMarker.id, { rewardSlots: nextSlots });
                                    }}
                                    className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20 cursor-pointer"
                                    title="Limpar slot"
                                  >
                                    <X className="w-2 h-2" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Atalhos Rápidos com Emojis */}
                        <div className="flex items-center gap-1 justify-between pt-1">
                          <span className="text-[10px] text-slate-400">Atalhos:</span>
                          <div className="flex items-center gap-1">
                            {['🪙', '💎', '🗡️', '🧪', '📜', '🗝️'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  const currentSlots = [...(event.rewardSlots || selectedMarker.rewardSlots || [])];
                                  while (currentSlots.length < 6) currentSlots.push(null);
                                  const emptyIdx = currentSlots.findIndex((s) => !s);
                                  if (emptyIdx !== -1) {
                                    currentSlots[emptyIdx] = emoji;
                                  } else {
                                    currentSlots[0] = emoji;
                                  }
                                  const updated = currentEvents.map((ev, i) =>
                                    i === index ? { ...ev, rewardSlots: currentSlots } : ev
                                  );
                                  updateMarkerEvents(updated);
                                  onUpdateMarker(selectedMarker.id, { rewardSlots: currentSlots });
                                }}
                                className="w-6 h-6 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs flex items-center justify-center transition-transform hover:scale-110 cursor-pointer"
                                title={`Adicionar ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
