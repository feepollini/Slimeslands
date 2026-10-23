import React, { useState } from 'react';
import {
  MapMarker,
  MapProject,
  BiomeTileConfig,
  SubBiomeConfig,
  DEFAULT_INTERCEPT_CONFIG,
  InterceptSpawnOrigin,
} from '../types/map';
import {
  injectInterceptTestScenarioIntoProject,
  getCapitaLyraDirectionalSprites,
} from '../utils/interceptTestPhaseGenerator';
import {
  Calendar,
  Zap,
  MapPin,
  Clock,
  Compass,
  Plus,
  Trash2,
  Eye,
  Crosshair,
  Sparkles,
  CloudRain,
  Moon,
  Sun,
  Swords,
  Video,
  MessageSquare,
  ZoomIn,
  Repeat,
  Radio,
  Navigation,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  Leaf,
} from 'lucide-react';

interface Props {
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  onFocusMarker: (m: MapMarker) => void;
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
}

export const EventGalleryStudio: React.FC<Props> = ({
  project,
  onUpdateProject,
  onFocusMarker,
  selectedMarkerId,
  onSelectMarker,
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  // Biomas e sub-biomas para consulta de nomes
  const biomeMap = new Map<string, string>(project.biomes.map((b) => [b.id, b.name]));
  const subBiomeMap = new Map<string, string>((project.subBiomes || []).map((sb) => [sb.id, sb.name]));

  // Unifica todos os eventos:
  // 1. Marcadores do tipo 'event'
  // 2. Marcadores que possuem configurações de evento (eventKind, eventWeather, eventZoom, eventDuration, etc.)
  // 3. Marcadores de teleporte / travel
  // 4. Marcadores com diálogos / quests / interceptConfig
  const allEvents = (project.markers || []).filter((m) => {
    return (
      m.type === 'event' ||
      Boolean(m.eventKind) ||
      Boolean(m.interceptConfig) ||
      Boolean(m.events && m.events.some((e) => e.type === 'intercept')) ||
      Boolean(m.eventWeather && m.eventWeather !== 'none') ||
      Boolean(m.eventZoom) ||
      m.type === 'travel' ||
      Boolean(m.quest) ||
      Boolean(m.dialogueSteps && m.dialogueSteps.length > 0)
    );
  });

  // Filtro por categoria
  const filteredEvents = allEvents.filter((evt) => {
    // Busca por texto
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (evt.name || '').toLowerCase().includes(q);
      const matchTitle = (evt.eventTitle || '').toLowerCase().includes(q);
      const matchDesc = (evt.description || '').toLowerCase().includes(q);
      if (!matchName && !matchTitle && !matchDesc) return false;
    }

    if (filterType === 'all') return true;
    if (filterType === 'intercept')
      return (
        evt.eventKind === 'intercept' ||
        Boolean(evt.interceptConfig) ||
        Boolean(evt.events?.some((e) => e.type === 'intercept'))
      );
    if (filterType === 'weather') return evt.eventKind === 'weather' || Boolean(evt.eventWeather && evt.eventWeather !== 'none');
    if (filterType === 'dialogue') return evt.eventKind === 'dialogue' || evt.eventKind === 'popup' || Boolean(evt.dialogueSteps?.length);
    if (filterType === 'duel') return evt.eventKind === 'duel' || evt.type === 'boss';
    if (filterType === 'teleport') return evt.eventKind === 'teleport' || evt.type === 'travel';
    if (filterType === 'video') return evt.eventKind === 'video' || evt.eventKind === 'cutscene';
    if (filterType === 'timer') return evt.eventTrigger === 'timer' || evt.eventTrigger === 'on_enter_map';
    return true;
  });

  // Atualiza um marcador de evento
  const updateEventMarker = (id: string, updates: Partial<MapMarker>) => {
    onUpdateProject({
      markers: (project.markers || []).map((m) => (m.id === id ? { ...m, ...updates } : m)),
    });
  };

  // Remove um evento
  const removeEventMarker = (id: string) => {
    onUpdateProject({
      markers: (project.markers || []).filter((m) => m.id !== id),
    });
    if (selectedMarkerId === id) onSelectMarker(null);
  };

  // Cria um novo evento instantâneo
  const handleCreateNewEvent = () => {
    const isExtended = (project.subBiomes || []).length > 0;
    const defaultSubBiome = isExtended ? project.subBiomes?.[0]?.id : undefined;
    const defaultBiome = !isExtended ? project.biomes?.[0]?.id : undefined;

    const newEvent: MapMarker = {
      id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Evento #${allEvents.length + 1}`,
      description: 'Evento interativo de fase',
      type: 'event',
      color: '#f97316',
      status: 'discovered',
      x: 384,
      y: 200,
      biomeId: defaultBiome,
      subBiomeId: defaultSubBiome,
      eventKind: 'dialogue',
      eventTrigger: 'proximity',
      eventTriggerRadius: 64,
      eventTriggerDelay: 0,
      eventDuration: 0,
      eventFreeze: false,
      eventRepeat: 'once',
      eventTitle: 'Novo Evento',
      size: 48,
    };

    onUpdateProject({
      markers: [...(project.markers || []), newEvent],
    });
    onSelectMarker(newEvent.id);
    setExpandedEventId(newEvent.id);
    onFocusMarker(newEvent);
  };

  // Cria e posiciona o Cenário Completo de Teste de Interceptação & Escolta na fase atual
  const handleCreateInterceptTestScenario = () => {
    const { updatedProject, triggerMarkerId } = injectInterceptTestScenarioIntoProject(project);
    onUpdateProject({ markers: updatedProject.markers });
    onSelectMarker(triggerMarkerId);
    setExpandedEventId(triggerMarkerId);
    const createdTrigger = updatedProject.markers.find((m) => m.id === triggerMarkerId);
    if (createdTrigger) {
      onFocusMarker(createdTrigger);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4 text-slate-200">
      {/* Header com Estatísticas e Botão de Novo Evento */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 shadow-sm">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Galeria de Eventos
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                {allEvents.length} cadastrados
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Onde, quando, gatilhos, duração e tipo de cada cena e acontecimento
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateNewEvent}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs shadow-md shadow-orange-500/20 transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Novo Evento</span>
        </button>
      </div>

      {/* Card de 1 Clique: Gerar Cenário Teste de Interceptação & Escolta */}
      <div className="p-2.5 rounded-xl bg-gradient-to-r from-orange-950/50 via-amber-950/35 to-cyan-950/40 border border-orange-500/40 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-black text-orange-200 flex items-center gap-1.5">
            <span>🚨</span>
            <span>Interceptação & Escolta Guiada</span>
          </div>
          <p className="text-[10px] text-slate-300 leading-tight mt-0.5">
            Cria o gatilho de área + Capitã Lyra (4 direções) surgindo do canto da tela e guiando o herói até o Santuário!
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateInterceptTestScenario}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-[11px] shadow-md cursor-pointer transition-all active:scale-95"
        >
          🎬 Gerar Teste Agora
        </button>
      </div>

      {/* Barra de Busca e Filtros Rápidos por Tipo */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar evento por nome ou descrição..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-orange-500/60"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tags de Filtro */}
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {[
            { id: 'all', label: 'Todos', icon: Sparkles },
            { id: 'intercept', label: '🚨 Interceptação & Escolta', icon: Navigation },
            { id: 'dialogue', label: 'Diálogo/Cena', icon: MessageSquare },
            { id: 'weather', label: 'Clima', icon: CloudRain },
            { id: 'duel', label: 'Batalha', icon: Swords },
            { id: 'teleport', label: 'Teleporte', icon: Navigation },
            { id: 'video', label: 'Vídeo/Cutscene', icon: Video },
            { id: 'timer', label: 'Timers/Gatilhos', icon: Clock },
          ].map((tag) => {
            const Icon = tag.icon;
            const isActive = filterType === tag.id;
            return (
              <button
                key={tag.id}
                onClick={() => setFilterType(tag.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-orange-500/25 text-orange-300 border border-orange-500/50 shadow-xs'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                <Icon className="w-3 h-3" />
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Eventos Unificados */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 bg-slate-900/60 border border-slate-800/80 rounded-2xl text-center space-y-3">
            <Radio className="w-10 h-10 text-slate-600 animate-pulse" />
            <div>
              <p className="text-sm font-bold text-slate-300">Nenhum evento encontrado</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {searchQuery || filterType !== 'all'
                  ? 'Ajuste seus filtros ou termos de busca.'
                  : 'Crie seu primeiro evento para acionar diálogos, clima, cutscenes e duelos no mapa!'}
              </p>
            </div>
            <button
              onClick={handleCreateNewEvent}
              className="px-3 py-1.5 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/40 text-xs font-bold hover:bg-orange-500/30 transition-colors"
            >
              + Criar Primeiro Evento
            </button>
          </div>
        ) : (
          filteredEvents.map((evt) => {
            const isExpanded = expandedEventId === evt.id;
            const isSelected = selectedMarkerId === evt.id;

            // Determina onde acontece
            const locationName = evt.subBiomeId
              ? (subBiomeMap.get(evt.subBiomeId) || 'Fase Sub-Bioma')
              : evt.biomeId
              ? (biomeMap.get(evt.biomeId) || 'Bioma Principal')
              : 'Mapa Geral';

            // Determina tipo e ícone
            const kind = evt.eventKind || (evt.type === 'travel' ? 'teleport' : 'dialogue');

            // Determina gatilho
            const trigger = evt.eventTrigger || 'proximity';

            return (
              <div
                key={evt.id}
                className={`rounded-2xl border transition-all ${
                  isSelected
                    ? 'bg-slate-900 border-orange-500/60 shadow-lg shadow-orange-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Linha Principal do Evento (Card Resumido) */}
                <div
                  className="p-3 flex items-center justify-between gap-2 cursor-pointer"
                  onClick={() => {
                    onSelectMarker(evt.id);
                    setExpandedEventId(isExpanded ? null : evt.id);
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border shadow-xs ${
                        kind === 'weather'
                          ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                          : kind === 'duel'
                          ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                          : kind === 'video' || kind === 'cutscene'
                          ? 'bg-purple-500/20 border-purple-500/40 text-purple-300'
                          : kind === 'teleport'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                          : 'bg-orange-500/20 border-orange-500/40 text-orange-300'
                      }`}
                    >
                      {kind === 'weather' ? (
                        <CloudRain className="w-4 h-4" />
                      ) : kind === 'duel' ? (
                        <Swords className="w-4 h-4" />
                      ) : kind === 'video' || kind === 'cutscene' ? (
                        <Video className="w-4 h-4" />
                      ) : kind === 'teleport' ? (
                        <Navigation className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-100 truncate">
                          {evt.name || evt.eventTitle || 'Evento Sem Nome'}
                        </span>
                        {/* Selo do Tipo */}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700/60">
                          {kind}
                        </span>
                      </div>

                      {/* Info de Onde e Duração */}
                      <div className="flex items-center gap-2.5 text-[10px] text-slate-400 mt-0.5">
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3 h-3 text-orange-400" />
                          <span className="truncate max-w-[120px]">{locationName}</span>
                          <span className="font-mono text-slate-500">
                            ({Math.round(evt.x)}, {Math.round(evt.y)})
                          </span>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-400" />
                          <span>
                            {evt.eventDuration && evt.eventDuration > 0
                              ? `${evt.eventDuration}s`
                              : 'Até fechar'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Botão Focar no Canvas */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMarker(evt.id);
                        onFocusMarker(evt);
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-500/20 text-slate-400 hover:text-orange-300 border border-slate-700/80 transition-colors"
                      title="Focar câmera no mapa exatamente sobre este evento"
                    >
                      <Crosshair className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Detalhes Expansíveis de Onde, Quando, Tipo e Duração */}
                {isExpanded && (
                  <div className="p-3 pt-1 border-t border-slate-800/80 space-y-3 bg-slate-950/60 rounded-b-2xl">
                    {/* 1. ONDE ACONTECE */}
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-orange-400 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Onde Acontece</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          X: {Math.round(evt.x)}px | Y: {Math.round(evt.y)}px
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Nome do Evento</label>
                          <input
                            type="text"
                            value={evt.name || ''}
                            onChange={(e) => updateEventMarker(evt.id, { name: e.target.value })}
                            className="w-full px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Cenário / Fase</label>
                          <div className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 truncate">
                            {locationName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 2. QUANDO ACONTECE (GATILHO / TRIGGER) */}
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          <span>Quando Acontece (Gatilho)</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {trigger === 'proximity' && `Raio: ${evt.eventTriggerRadius || 64}px`}
                          {trigger === 'interact' && 'Ao Clicar/Tocar'}
                          {trigger === 'on_enter_map' && 'Ao Entrar na Fase'}
                          {trigger === 'timer' && `Após ${evt.eventTriggerDelay || 3}s`}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Tipo de Gatilho</label>
                          <select
                            value={trigger}
                            onChange={(e) => updateEventMarker(evt.id, { eventTrigger: e.target.value as any })}
                            className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                          >
                            <option value="proximity">Ao Aproximar (Raio)</option>
                            <option value="interact">Ao Interagir (Clique)</option>
                            <option value="on_enter_map">Entrada na Fase</option>
                            <option value="timer">Temporizador (Timer)</option>
                            <option value="quest_complete">Após Missão</option>
                          </select>
                        </div>

                        {trigger === 'proximity' ? (
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span>Raio de Ativação</span>
                              <span className="font-mono text-amber-300 font-bold">{evt.eventTriggerRadius || 64}px</span>
                            </div>
                            <input
                              type="range"
                              min={32}
                              max={240}
                              step={8}
                              value={evt.eventTriggerRadius || 64}
                              onChange={(e) => updateEventMarker(evt.id, { eventTriggerRadius: Number(e.target.value) })}
                              className="w-full accent-amber-400 cursor-pointer h-1"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                              <span>Delay para Iniciar</span>
                              <span className="font-mono text-amber-300 font-bold">{evt.eventTriggerDelay || 0}s</span>
                            </div>
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={evt.eventTriggerDelay || 0}
                              onChange={(e) => updateEventMarker(evt.id, { eventTriggerDelay: Number(e.target.value) })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 3. TIPO DE EVENTO & DURAÇÃO */}
                    <div className="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Tipo & Duração do Evento</span>
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {evt.eventDuration && evt.eventDuration > 0 ? `${evt.eventDuration} segundos` : 'Sem limite (Manual)'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Tipo de Ação</label>
                          <select
                            value={evt.eventKind || 'dialogue'}
                            onChange={(e) => {
                              const nextKind = e.target.value as any;
                              if (nextKind === 'intercept' && !evt.interceptConfig) {
                                const lyra = getCapitaLyraDirectionalSprites();
                                const otherM = (project.markers || []).find((m) => m.id !== evt.id);
                                updateEventMarker(evt.id, {
                                  eventKind: 'intercept',
                                  interceptConfig: {
                                    ...DEFAULT_INTERCEPT_CONFIG,
                                    inlineNpcPng: lyra.down,
                                    inlineAvatarDownPng: lyra.down,
                                    inlineAvatarUpPng: lyra.up,
                                    inlineAvatarLeftPng: lyra.left,
                                    inlineAvatarRightPng: lyra.right,
                                    destinationType: otherM ? 'marker' : 'coordinates',
                                    destinationMarkerId: otherM?.id,
                                    destinationX: otherM ? otherM.x : evt.x + 120,
                                    destinationY: otherM ? otherM.y : evt.y + 260,
                                  },
                                });
                              } else {
                                updateEventMarker(evt.id, { eventKind: nextKind });
                              }
                            }}
                            className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                          >
                            <option value="intercept">🚨 Interceptação & Escolta Guiada</option>
                            <option value="dialogue">💬 Cena de Diálogo / Fala</option>
                            <option value="weather">🌧️ Clima / Atmosfera</option>
                            <option value="duel">⚔️ Batalha / Duelo</option>
                            <option value="video">🎬 Vídeo / Cutscene</option>
                            <option value="teleport">🌀 Teleporte / Portal</option>
                            <option value="zoom">🔍 Zoom de Câmera</option>
                            <option value="popup">📜 Pop-up Informativo</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Duração (segundos)</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              max={300}
                              value={evt.eventDuration || 0}
                              onChange={(e) => updateEventMarker(evt.id, { eventDuration: Number(e.target.value) })}
                              className="w-full px-2 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 font-mono"
                            />
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">(0 = até fechar)</span>
                          </div>
                        </div>
                      </div>

                      {/* Se for Interceptação & Escolta */}
                      {evt.eventKind === 'intercept' && (() => {
                        const cfg = evt.interceptConfig || DEFAULT_INTERCEPT_CONFIG;
                        const patchIntercept = (patch: Partial<typeof cfg>) => {
                          const nextCfg = { ...cfg, ...patch };
                          updateEventMarker(evt.id, {
                            interceptConfig: nextCfg,
                            events: (evt.events || []).some((e) => e.type === 'intercept')
                              ? (evt.events || []).map((e) =>
                                  e.type === 'intercept' ? { ...e, interceptConfig: nextCfg } : e
                                )
                              : evt.events,
                          });
                        };
                        return (
                          <div className="pt-2 border-t border-slate-800 space-y-2 text-[11px]">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-orange-300 block mb-0.5">Nome do Guia / NPC:</label>
                                <input
                                  type="text"
                                  value={cfg.inlineNpcName || ''}
                                  onChange={(e) => patchIntercept({ inlineNpcName: e.target.value })}
                                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-100"
                                />
                              </div>
                              <div>
                                <label className="text-[10px] text-orange-300 block mb-0.5">Canto de onde surge:</label>
                                <select
                                  value={cfg.spawnOrigin || 'top_right'}
                                  onChange={(e) => patchIntercept({ spawnOrigin: e.target.value as InterceptSpawnOrigin })}
                                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-100"
                                >
                                  <option value="top_right">↗️ Canto Superior Direito</option>
                                  <option value="top_left">↖️ Canto Superior Esquerdo</option>
                                  <option value="top">⬆️ Borda Superior (Topo)</option>
                                  <option value="left">⬅️ Borda Esquerda</option>
                                  <option value="right">➡️ Borda Direita</option>
                                  <option value="bottom_left">↙️ Canto Inferior Esquerdo</option>
                                  <option value="bottom_right">↘️ Canto Inferior Direito</option>
                                  <option value="bottom">⬇️ Borda Inferior (Base)</option>
                                  <option value="marker_pos">📍 Da Posição no Mapa</option>
                                </select>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[10px] text-cyan-300 block mb-0.5">Destino da Escolta:</label>
                                <select
                                  value={cfg.destinationMarkerId || ''}
                                  onChange={(e) => {
                                    const mId = e.target.value;
                                    const destM = (project.markers || []).find((m) => m.id === mId);
                                    patchIntercept({
                                      escortEnabled: true,
                                      destinationType: 'marker',
                                      destinationMarkerId: mId,
                                      ...(destM ? { destinationX: destM.x, destinationY: destM.y } : {}),
                                    });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-100"
                                >
                                  <option value="">-- Selecione o Destino --</option>
                                  {(project.markers || [])
                                    .filter((m) => m.id !== evt.id)
                                    .map((m) => (
                                      <option key={m.id} value={m.id}>
                                        📍 {m.name} ({Math.round(m.x)}, {Math.round(m.y)})
                                      </option>
                                    ))}
                                </select>
                              </div>
                              <div>
                                <label className="text-[10px] text-amber-300 block mb-0.5">1ª Fala ao Abordar:</label>
                                <input
                                  type="text"
                                  value={cfg.greetingDialogues?.[0] || ''}
                                  onChange={(e) => {
                                    const nextG = [...(cfg.greetingDialogues || [''])];
                                    nextG[0] = e.target.value;
                                    patchIntercept({ greetingDialogues: nextG });
                                  }}
                                  className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-800 text-slate-100"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Se for clima */}
                      {evt.eventKind === 'weather' && (
                        <div className="pt-1">
                          <label className="text-[10px] text-slate-400 block mb-1">Atmosfera / Clima Aplicado</label>
                          <div className="grid grid-cols-5 gap-1 text-xs">
                            {[
                              { id: 'rain', label: 'Chuva', icon: CloudRain },
                              { id: 'leaves', label: 'Folhas', icon: Leaf },
                              { id: 'night', label: 'Noite', icon: Moon },
                              { id: 'dawn', label: 'Alvorada', icon: Sun },
                              { id: 'none', label: 'Normal', icon: Sparkles },
                            ].map((w) => {
                              const isCur = evt.eventWeather === w.id || (!evt.eventWeather && w.id === 'rain');
                              return (
                                <button
                                  key={w.id}
                                  type="button"
                                  onClick={() => updateEventMarker(evt.id, { eventWeather: w.id as any })}
                                  className={`flex items-center justify-center gap-1 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                                    isCur
                                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/50'
                                      : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                                  }`}
                                >
                                  <span>{w.label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. OPÇÕES EXTRAS E AÇÕES */}
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-3">
                        {/* Congelar jogador */}
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={evt.eventFreeze || false}
                            onChange={(e) => updateEventMarker(evt.id, { eventFreeze: e.target.checked })}
                            className="rounded border-slate-700 text-orange-500 focus:ring-0"
                          />
                          <span>Congelar Jogador</span>
                        </label>

                        {/* Repetição */}
                        <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={evt.eventRepeat === 'always'}
                            onChange={(e) => updateEventMarker(evt.id, { eventRepeat: e.target.checked ? 'always' : 'once' })}
                            className="rounded border-slate-700 text-orange-500 focus:ring-0"
                          />
                          <span>Repetir Sempre</span>
                        </label>
                      </div>

                      {/* Botão Excluir Evento */}
                      <button
                        type="button"
                        onClick={() => removeEventMarker(evt.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/20 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remover</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
