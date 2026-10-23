import React, { useState, useRef, useEffect } from 'react';
import type { MapProject, SavedLevel, WorldMapPOI, WorldMapConfig } from '../../types/map';
import { getOrCreateWorldMapConfig, DEFAULT_WORLD_MAP_BACKGROUNDS, POI_ICONS_PRESETS } from './WorldMapCanvasEditor';
import {
  Compass,
  Lock,
  CheckCircle2,
  Play,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  MoveHorizontal,
  MapPin,
  ExternalLink,
  Cloud,
  Swords,
  Star,
  Zap,
  Gift,
  ShieldAlert,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { DEFAULT_CLOUD_SVG, DEFAULT_FOG_SVG } from '../../data/defaultAtmosphereAssets';

interface WorldMapEmulatorViewProps {
  project: MapProject;
  savedLevels?: SavedLevel[];
  onLoadLevel?: (level: SavedLevel) => void;
  screenWidth: number;
  screenHeight: number;
  isPlayMode?: boolean;
  onOpenEditorTab?: () => void;
}

export const WorldMapEmulatorView: React.FC<WorldMapEmulatorViewProps> = ({
  project,
  savedLevels = [],
  onLoadLevel,
  screenWidth,
  screenHeight,
  isPlayMode = false,
  onOpenEditorTab,
}) => {
  const worldMap = getOrCreateWorldMapConfig(project);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPoi, setSelectedPoi] = useState<WorldMapPOI | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Mergulho de Câmera (Camera Dive Focus Effect)
  const [focusedPoiId, setFocusedPoiId] = useState<string | null>(null);
  const [isCameraZoomed, setIsCameraZoomed] = useState<boolean>(false);

  // Zoom Interativo do Usuário no Emulador (Roda do Mouse Scroll & Pinça Touch)
  const [userZoom, setUserZoom] = useState<number>(1.0);
  const touchDistRef = useRef<number | null>(null);

  // Estados de Panning em Y para quando o zoom estiver ativado
  const [startY, setStartY] = useState(0);
  const [scrollTopState, setScrollTopState] = useState(0);

  // Estado para Modal do Evento de Encontro vinculado ao Slot
  const [activeEncounterSlot, setActiveEncounterSlot] = useState<{
    idx: number;
    val: string;
    link: string;
    isRevealed: boolean;
  } | null>(null);

  // Event Listener para a Roda do Mouse (Wheel) Simular Zoom de Pinça no Emulador (Mínimo 1.0x = 100% da Altura Vertical)
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.08 : -0.08;
      setUserZoom((prev) => Math.min(2.5, Math.max(1.0, parseFloat((prev + delta).toFixed(2)))));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Handlers para Gesto de Pinça em Telas Sensíveis ao Toque (Multi-touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - touchDistRef.current) * 0.006;
      touchDistRef.current = dist;
      setUserZoom((prev) => Math.min(2.5, Math.max(1.0, parseFloat((prev + delta).toFixed(2)))));
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
  };

  // Dimensões do Mapa Panorâmico & Escala Dinâmica com Zoom
  const baseMapHeight = worldMap.mapHeight || 667;
  const baseMapWidth = worldMap.mapWidth || 1600;

  // Fator de escala vertical para preencher a altura da tela do emulador
  const verticalScale = screenHeight / baseMapHeight;
  const renderedMapWidth = Math.max(screenWidth, Math.round(baseMapWidth * verticalScale));
  const renderedMapHeight = screenHeight;

  // Dimensões dinâmicas do plano com zoom aplicado (Permite Scroll em X e Y quando Zoom > 1.0)
  const effectiveZoom = userZoom * (isCameraZoomed ? 1.25 : 1.0);
  const planeWidth = Math.round(renderedMapWidth * effectiveZoom);
  const planeHeight = Math.round(renderedMapHeight * effectiveZoom);

  // Camadas e Atmosfera
  const layers = worldMap.layers || [];
  const atmosphere = worldMap.atmosphere || {};

  const isBgVisible = layers.find((l) => l.id === 'background')?.visible !== false;
  const bgOpacity = layers.find((l) => l.id === 'background')?.opacity ?? 1.0;
  const isRoutesVisible = layers.find((l) => l.id === 'routes')?.visible !== false;
  const routesOpacity = layers.find((l) => l.id === 'routes')?.opacity ?? 1.0;
  const isPoisVisible = layers.find((l) => l.id === 'pois')?.visible !== false;
  const poisOpacity = layers.find((l) => l.id === 'pois')?.opacity ?? 1.0;
  const isAtmoVisible = layers.find((l) => l.id === 'atmosphere')?.visible !== false;
  const atmoOpacity = layers.find((l) => l.id === 'atmosphere')?.opacity ?? 0.85;

  // Monitora a rolagem do mapa
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
    const maxScroll = Math.max(1, scrollWidth - clientWidth);
    setScrollProgress(Math.min(1, Math.max(0, scrollLeft / maxScroll)));
    setCanScrollLeft(scrollLeft > 10);
    setCanScrollRight(scrollLeft < maxScroll - 10);
  };

  useEffect(() => {
    handleScroll();
  }, [renderedMapWidth, screenWidth]);

  // Navegação suave com setas
  const handleScrollStep = (dir: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const step = screenWidth * 0.7;
    scrollContainerRef.current.scrollBy({
      left: dir === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  // Drag horizontal e vertical (Pan em 2D quando houver Zoom)
  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-poi-interactive]')) return;
    setIsDragging(true);
    setStartX(e.pageX - (scrollContainerRef.current?.offsetLeft || 0));
    setStartY(e.pageY - (scrollContainerRef.current?.offsetTop || 0));
    setScrollLeftState(scrollContainerRef.current?.scrollLeft || 0);
    setScrollTopState(scrollContainerRef.current?.scrollTop || 0);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - (scrollContainerRef.current.offsetLeft || 0);
    const y = e.pageY - (scrollContainerRef.current.offsetTop || 0);
    const walkX = (x - startX) * 1.3;
    const walkY = (y - startY) * 1.3;
    scrollContainerRef.current.scrollLeft = scrollLeftState - walkX;
    scrollContainerRef.current.scrollTop = scrollTopState - walkY;
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  // Clique no Marcador do Mapa: Mergulho de Câmera sem outros marcadores + Pop-up Clash Style
  const handlePoiClick = (poi: WorldMapPOI, e: React.MouseEvent) => {
    e.stopPropagation();
    if (poi.isInvisible || poi.iconType === 'invisible_node') return;

    // 1. Ativa o foco do marcador e mergulho de câmera
    setFocusedPoiId(poi.id);
    setIsCameraZoomed(true);

    // 2. Centraliza a câmera no marcador clicado
    if (scrollContainerRef.current) {
      const poiCanvasX = (poi.x / baseMapWidth) * renderedMapWidth;
      const targetScrollLeft = poiCanvasX - screenWidth / 2;
      scrollContainerRef.current.scrollTo({
        left: Math.max(0, targetScrollLeft),
        behavior: 'smooth',
      });
    }

    // 3. Exibe a janela Pop-up Estilo Clash of Clans/Clash Royale após breve animação de aproximação
    setTimeout(() => {
      setSelectedPoi(poi);
    }, 280);
  };

  // Fechar Modal do POI e restaurar visualização padrão da câmera
  const handleCloseModal = () => {
    setSelectedPoi(null);
    setFocusedPoiId(null);
    setIsCameraZoomed(false);
  };

  const bgImage = worldMap.backgroundPng || DEFAULT_WORLD_MAP_BACKGROUNDS[0].url;
  const unlockedCount = worldMap.pointsOfInterest.filter(
    (p) => p.status !== 'locked' && !p.isInvisible && p.iconType !== 'invisible_node'
  ).length;
  const totalCount = worldMap.pointsOfInterest.filter(
    (p) => !p.isInvisible && p.iconType !== 'invisible_node'
  ).length;

  return (
    <div
      className="relative w-full h-full bg-slate-950 select-none overflow-hidden flex flex-col"
      style={{ width: screenWidth, height: screenHeight }}
    >
      {/* Barra de Título Superior do Mapa no Emulador */}
      <div className="absolute top-0 left-0 right-0 z-30 px-3.5 py-2.5 bg-gradient-to-b from-black/90 via-black/60 to-transparent flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-sm">
            <Compass className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight drop-shadow-md">
              {worldMap.title || 'Mapa Interativo do Reino'}
            </h3>
            <span className="text-[9px] font-mono text-amber-300/80 block leading-tight">
              {unlockedCount}/{totalCount} Locais Abertos
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Controles de Zoom Flutuantes (Pinça / Mouse Scroll Wheel) */}
          <div className="flex items-center gap-1 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded-full border border-amber-500/40 text-[9px] font-mono text-amber-300 shadow-md">
            <button
              type="button"
              onClick={() => setUserZoom((z) => Math.max(0.8, parseFloat((z - 0.15).toFixed(2))))}
              className="px-1 hover:text-white transition-colors cursor-pointer font-extrabold text-xs"
              title="Diminuir Zoom (-)"
            >
              -
            </button>
            <span className="font-extrabold px-0.5">{Math.round(userZoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setUserZoom((z) => Math.min(2.5, parseFloat((z + 0.15).toFixed(2))))}
              className="px-1 hover:text-white transition-colors cursor-pointer font-extrabold text-xs"
              title="Aumentar Zoom (+)"
            >
              +
            </button>
            {userZoom !== 1.0 && (
              <button
                type="button"
                onClick={() => setUserZoom(1.0)}
                className="text-[8px] font-sans underline text-amber-400 hover:text-white ml-0.5 cursor-pointer"
                title="Resetar Zoom para 100%"
              >
                Reset
              </button>
            )}
          </div>

          <span className="text-[9px] font-medium text-white/70 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/10 flex items-center gap-1">
            <MoveHorizontal className="w-2.5 h-2.5 text-amber-400" />
            <span>Rolagem & Pinça</span>
          </span>
        </div>
      </div>

      {/* Contêiner de Rolagem Horizontal e Zoom por Wheel / Pinça */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className={`w-full h-full overflow-x-auto overflow-y-hidden scrollbar-none overscroll-none relative ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div
          className="relative h-full overflow-hidden transition-transform duration-200 ease-out origin-center"
          style={{
            width: renderedMapWidth,
            height: renderedMapHeight,
            transform: `scale(${userZoom * (isCameraZoomed ? 1.2 : 1.0)})`,
            transformOrigin: '50% 50%',
          }}
        >
          {/* Camada 1: Imagem de Fundo Panorâmica */}
          {isBgVisible && (
            <img
              src={bgImage}
              alt="Fundo do Mapa"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter contrast-[1.03] brightness-[0.97]"
              style={{ opacity: bgOpacity }}
              draggable={false}
            />
          )}

          {/* Camada 2: Conexões de Rotas (Desenha linhas unindo pontos, incluindo pontos invisíveis) */}
          {isRoutesVisible && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              style={{ width: renderedMapWidth, height: renderedMapHeight, opacity: routesOpacity }}
            >
              <defs>
                <linearGradient id="routeGradGame" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#fbbf24" stopOpacity="1" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.9" />
                </linearGradient>
              </defs>
              {/* Conexões Explícitas e Encadeadas em Estilo Trilha de Aventura RPG */}
              {(() => {
                const pairs: Array<{ from: WorldMapPOI; to: WorldMapPOI; id: string }> = [];

                if (worldMap.routeConnections && worldMap.routeConnections.length > 0) {
                  worldMap.routeConnections.forEach((rc) => {
                    const f = worldMap.pointsOfInterest.find((p) => p.id === rc.fromId);
                    const t = worldMap.pointsOfInterest.find((p) => p.id === rc.toId);
                    if (f && t) pairs.push({ from: f, to: t, id: rc.id });
                  });
                }

                worldMap.pointsOfInterest.forEach((poi) => {
                  if (poi.parentId) {
                    const parent = worldMap.pointsOfInterest.find((p) => p.id === poi.parentId);
                    if (parent && !pairs.some((p) => p.from.id === parent.id && p.to.id === poi.id)) {
                      pairs.push({ from: parent, to: poi, id: `parent-${parent.id}-${poi.id}` });
                    }
                  }
                });

                if (pairs.length === 0) {
                  worldMap.pointsOfInterest.forEach((poi, idx) => {
                    const nextPoi = worldMap.pointsOfInterest[idx + 1];
                    if (nextPoi) pairs.push({ from: poi, to: nextPoi, id: `seq-${poi.id}-${nextPoi.id}` });
                  });
                }

                return pairs.map((pair) => {
                  const x1 = (pair.from.x / baseMapWidth) * renderedMapWidth;
                  const y1 = (pair.from.y / baseMapHeight) * renderedMapHeight;
                  const x2 = (pair.to.x / baseMapWidth) * renderedMapWidth;
                  const y2 = (pair.to.y / baseMapHeight) * renderedMapHeight;
                  const mx = (x1 + x2) / 2;
                  const my = (y1 + y2) / 2 - 20;

                  return (
                    <g key={`game-route-path-${pair.id}`}>
                      {/* Valeta / Sombra profunda de caminho RPG */}
                      <path
                        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                        fill="none"
                        stroke="#180e06"
                        strokeWidth={8}
                        strokeLinecap="round"
                        opacity={0.8}
                      />
                      {/* Borda de pedra / estrada dourada */}
                      <path
                        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                        fill="none"
                        stroke="#b45309"
                        strokeWidth={5}
                        strokeLinecap="round"
                        opacity={0.9}
                      />
                      {/* Trilha pontilhada luminosa com cara de jogo */}
                      <path
                        d={`M ${x1} ${y1} Q ${mx} ${my} ${x2} ${y2}`}
                        fill="none"
                        stroke="url(#routeGradGame)"
                        strokeWidth={2.8}
                        strokeDasharray="8,6"
                        strokeLinecap="round"
                        className="animate-pulse"
                      />
                      {/* Marcador de Waypoint no meio da curva */}
                      <circle
                        cx={mx}
                        cy={my}
                        r={4}
                        fill="#f59e0b"
                        stroke="#78350f"
                        strokeWidth={1.5}
                      />
                      <circle cx={mx} cy={my} r={1.8} fill="#fef08a" />
                    </g>
                  );
                });
              })()}
            </svg>
          )}

          {/* Camada 3: Pontos de Interesse (POIs no Mapa) */}
          {isPoisVisible && (
            <div
              className="absolute inset-0 pointer-events-auto z-20 transition-opacity duration-300"
              style={{ opacity: poisOpacity }}
            >
              {worldMap.pointsOfInterest.map((poi) => {
                // POIs invisíveis usados como ponto de curva/traçado NÃO aparecem no jogo!
                if (poi.isInvisible || poi.iconType === 'invisible_node') return null;

                const poiCanvasX = (poi.x / baseMapWidth) * renderedMapWidth;
                const poiCanvasY = (poi.y / baseMapHeight) * renderedMapHeight;
                const scale = poi.scale || 1.0;
                const isFocused = focusedPoiId === poi.id;
                const isHiddenByFocus = focusedPoiId !== null && !isFocused;

                const effectiveMapZoom = Math.max(0.1, userZoom * (isCameraZoomed ? 1.2 : 1.0));

                return (
                  <div
                    key={poi.id}
                    data-poi-interactive="true"
                    onClick={(e) => handlePoiClick(poi, e)}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 group ${
                      isHiddenByFocus ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
                    }`}
                    style={{
                      left: poiCanvasX,
                      top: poiCanvasY,
                      transform: 'translate(-50%, -50%)',
                    }}
                  >
                    {/* Anel Pulsante de Destaque no Hover */}
                    <div className="absolute -inset-3 rounded-full bg-amber-400/20 blur-md group-hover:bg-amber-400/40 animate-pulse transition-all pointer-events-none" />

                    {/* Ícone PNG Puro do Marcador (Sem Container Box) */}
                    <div className="relative z-10 flex flex-col items-center">
                      <div
                        style={{
                          transform: `scale(${scale * (isFocused ? 1.25 : 1.0)})`,
                          transformOrigin: 'bottom center',
                        }}
                        className="relative group-hover:brightness-110 transition-transform"
                      >
                        {poi.iconPng ? (
                          <img
                            src={poi.iconPng}
                            alt={poi.name}
                            className={`w-14 h-14 object-contain select-none pointer-events-none transition-all ${
                              poi.status === 'locked'
                                ? 'filter grayscale(100%) contrast(110%) brightness(80%) drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]'
                                : 'filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]'
                            }`}
                          />
                        ) : (
                          <div
                            className={`text-4xl select-none transition-all ${
                              poi.status === 'locked'
                                ? 'filter grayscale(100%) brightness(80%) drop-shadow-[0_6px_12px_rgba(0,0,0,0.9)]'
                                : 'filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]'
                            }`}
                          >
                            {poi.iconEmoji || '🏰'}
                          </div>
                        )}

                        {/* Sobreposição do Ícone Geral de Cadeado se Bloqueado */}
                        {poi.status === 'locked' && (
                          <div className="absolute inset-0 flex items-center justify-center z-20">
                            {worldMap.customLockIconPng ? (
                              <img
                                src={worldMap.customLockIconPng}
                                alt="Bloqueado"
                                className="w-8 h-8 object-contain filter drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] animate-pulse"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-black/90 border border-rose-500/80 text-rose-400 flex items-center justify-center shadow-xl">
                                <Lock className="w-4 h-4 stroke-[2.5]" />
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Cápsula com Apenas o Nome na Parte Inferior (Tamanho fixo no zoom) */}
                      <div
                        style={{
                          transform: `scale(${1 / effectiveMapZoom})`,
                          transformOrigin: 'top center',
                        }}
                        className="mt-1 px-3 py-0.5 rounded-full bg-black/90 backdrop-blur-md border border-amber-400/60 text-[10px] font-black text-amber-300 shadow-[0_4px_10px_rgba(0,0,0,0.8)] whitespace-nowrap group-hover:bg-amber-500 group-hover:text-black transition-colors"
                      >
                        {poi.name}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Camada 4: Atmosfera & Efeitos Vivos (Nuvens em Parallax) */}
          {isAtmoVisible && (
            <div
              className="absolute inset-0 pointer-events-none z-25 overflow-hidden"
              style={{ opacity: atmoOpacity }}
            >
              {atmosphere.cloudsEnabled !== false && atmosphere.weather !== 'clear' && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div
                    className="absolute inset-0 flex"
                    style={{
                      animation: `worldMapCloudsDrift ${atmosphere.cloudsSpeed || 30}s linear infinite`,
                      width: '200%',
                    }}
                  >
                    <div className="w-1/2 h-full relative" style={{ opacity: atmosphere.cloudsOpacity ?? 0.7 }}>
                      <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute top-6 left-[10%] w-[380px] object-contain filter drop-shadow opacity-80" />
                      <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute top-36 left-[50%] w-[420px] object-contain filter drop-shadow opacity-80" />
                      <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute bottom-8 left-[20%] w-[340px] object-contain filter drop-shadow opacity-80" />
                    </div>
                    <div className="w-1/2 h-full relative" style={{ opacity: atmosphere.cloudsOpacity ?? 0.7 }}>
                      <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute top-6 left-[10%] w-[380px] object-contain filter drop-shadow opacity-80" />
                      <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute top-36 left-[50%] w-[420px] object-contain filter drop-shadow opacity-80" />
                      <img src={DEFAULT_CLOUD_SVG} alt="" className="absolute bottom-8 left-[20%] w-[340px] object-contain filter drop-shadow opacity-80" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Setas Flutuantes de Navegação Lateral */}
      {canScrollLeft && !selectedPoi && (
        <button
          type="button"
          onClick={() => handleScrollStep('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer transition-transform hover:scale-110 active:scale-95"
          title="Rolar Mapa para Esquerda"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {canScrollRight && !selectedPoi && (
        <button
          type="button"
          onClick={() => handleScrollStep('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-black/75 hover:bg-black border border-white/20 text-white flex items-center justify-center shadow-lg backdrop-blur-md cursor-pointer transition-transform hover:scale-110 active:scale-95"
          title="Rolar Mapa para Direita"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Mini Barra Inferior de Progresso da Rolagem */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 w-32 h-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-75"
          style={{ width: `${Math.max(10, scrollProgress * 100)}%` }}
        />
      </div>

      {/* MODAL / POP-UP AUTÊNTICO COM CORES VIVAS (VERDE, MARROM, AMARELO E AZUL) */}
      {selectedPoi && (
        <div
          data-poi-interactive="true"
          className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto select-none overflow-y-auto"
          onClick={handleCloseModal}
        >
          {/* Contêiner Geral que Agrupa o Elemento Externo Superior e o Pop-up Card */}
          <div
            className="w-full max-w-[430px] sm:max-w-[450px] flex flex-col items-center relative my-auto px-2"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ELEMENTO EXTERNO ACIMA DO POP-UP: PNG Muito Maior do Marcador (+40% maior) + Cápsula de Nome */}
            <div className="relative -mb-6 z-20 flex flex-col items-center">
              <div className="relative group flex flex-col items-center">
                {/* Glow de Destaque Traseiro Ampliado */}
                <div className="absolute inset-0 rounded-full bg-amber-400/40 blur-3xl animate-pulse scale-125" />

                {/* PNG Grande do Marcador / Local Externo (+40% de Aumento) */}
                {selectedPoi.iconPng ? (
                  <img
                    src={selectedPoi.iconPng}
                    alt={selectedPoi.name}
                    className="w-64 h-64 sm:w-72 sm:h-72 object-contain filter drop-shadow-[0_20px_45px_rgba(0,0,0,0.98)] relative z-10 select-none pointer-events-none transform group-hover:scale-105 transition-all duration-300"
                  />
                ) : (
                  <div className="text-9xl sm:text-[140px] filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.95)] relative z-10 select-none my-2">
                    {selectedPoi.iconEmoji || '🏰'}
                  </div>
                )}

                {/* CÁPSULA COM O NOME DO LOCAL (Na Base Inferior do PNG Externo) */}
                <div className="px-7 py-2 rounded-full bg-black/95 backdrop-blur-md border-2 border-amber-400 text-sm sm:text-base font-black text-amber-300 shadow-[0_8px_24px_rgba(0,0,0,0.95)] uppercase tracking-wider whitespace-nowrap z-20 -mt-7">
                  {selectedPoi.name}
                </div>
              </div>
            </div>

            {/* Card Principal do Pop-up (Moldura Marrom Madeira/Verde Folha com Bordas Douradas) */}
            <div className="w-full bg-gradient-to-b from-amber-950 via-stone-900 to-emerald-950 border-[3.5px] border-amber-400 rounded-3xl overflow-visible shadow-[0_0_50px_rgba(34,197,94,0.4)] flex flex-col relative text-white pt-9 pb-4 px-4 sm:px-5">
              {/* Botão Fechar em Forma de X Vermelho Dourado */}
              <button
                type="button"
                onClick={handleCloseModal}
                className="absolute -top-3 -right-3 z-40 w-9 h-9 rounded-full bg-gradient-to-b from-rose-600 to-rose-800 border-2 border-amber-300 text-amber-200 flex items-center justify-center transition-transform hover:scale-110 active:scale-95 cursor-pointer shadow-[0_4px_10px_rgba(0,0,0,0.8)]"
                title="Fechar Janela"
              >
                <X className="w-5 h-5 stroke-[3]" />
              </button>

              {/* Badges de Nível Recomendado e Estado em Azul e Dourado */}
              <div className="flex items-center justify-center gap-2 text-[11px] font-extrabold mb-2.5 z-10">
                <span className="px-3 py-1 rounded-full bg-sky-950/90 border border-sky-400/60 text-sky-200 shadow-md flex items-center gap-1">
                  ⭐ Nv. Recomendado: {selectedPoi.recommendedLevel || 1}
                </span>

                {selectedPoi.badgeText && (
                  <span className="px-3 py-1 rounded-full bg-amber-400 text-amber-950 font-black uppercase tracking-wider shadow-md">
                    {selectedPoi.badgeText}
                  </span>
                )}
              </div>

              {/* PAINEL INTERNO: Descrição, Slimes dessa Área e Botão */}
              <div className="space-y-3 z-10">
                {/* Painel de Descrição do Local em Tom de Madeira/Pergaminho Marrom */}
                <div className="p-3 bg-amber-950/80 border border-amber-800/80 text-xs font-medium text-amber-100 leading-relaxed text-center rounded-2xl shadow-inner">
                  {selectedPoi.description ||
                    'Região mágica e perigosa repleta de segredos, tesouros e combates intensos do reino.'}
                </div>

                {/* SLIMES DESSA ÁREA (Modo Silhueta até Escanear o Monstro) */}
                {(() => {
                  const effectiveCount = selectedPoi.rewardSlotCount || selectedPoi.rewardSlots?.length || 10;
                  const slots = Array.from({ length: effectiveCount }).map((_, idx) => {
                    const slotValue = selectedPoi.rewardSlots?.[idx] ?? '';
                    const slotConfig = selectedPoi.rewardSlotConfigs?.find((s) => s.slotIndex === idx);
                    const isRevealed = slotConfig?.isRevealed ?? false;
                    return { idx, slotValue, slotConfig, isRevealed };
                  });
                  const revealedCount = slots.filter((s) => s.slotValue && s.isRevealed).length;
                  const filledCount = slots.filter((s) => !!s.slotValue).length;

                  return (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-black text-amber-300 uppercase tracking-wider px-1">
                        <span className="flex items-center gap-1.5">
                          <span>👾 Slimes dessa Área</span>
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/40">
                            {revealedCount}/{filledCount || effectiveCount} Descobertos
                          </span>
                        </span>
                        <span className="text-[10px] text-amber-400 font-mono font-bold">
                          {effectiveCount} Slots
                        </span>
                      </div>

                      {/* Grade de Slots de Slimes */}
                      <div className="grid grid-cols-5 gap-2 p-2.5 rounded-2xl bg-amber-950/90 border-2 border-amber-500/50 shadow-inner max-h-[190px] overflow-y-auto">
                        {slots.map(({ idx, slotValue, slotConfig, isRevealed }) => {
                          const eventLink =
                            slotConfig?.encounterEventLink ||
                            `https://meujogo.com/evento-encontro-local-${selectedPoi.id}-slot-${idx + 1}`;
                          const isImage = slotValue.startsWith('data:image') || slotValue.startsWith('http');

                          return (
                            <div
                              key={`clash-slot-${idx}`}
                              onClick={() => {
                                setActiveEncounterSlot({
                                  idx,
                                  val: slotValue || '👾',
                                  link: eventLink,
                                  isRevealed,
                                });
                              }}
                              className={`w-11 h-11 mx-auto rounded-full bg-gradient-to-b from-amber-900 via-stone-900 to-emerald-950 border-2 shadow-[0_3px_8px_rgba(0,0,0,0.8)] flex items-center justify-center text-[10px] font-black font-mono transition-all cursor-pointer relative group overflow-hidden ${
                                slotValue
                                  ? isRevealed
                                    ? 'border-emerald-400 bg-emerald-950/80 shadow-[0_0_12px_rgba(16,185,129,0.5)] hover:scale-110'
                                    : 'border-amber-400/80 bg-black/90 hover:border-amber-300 hover:scale-110 ring-1 ring-amber-400/30'
                                  : 'border-dashed border-amber-400/40 bg-black/40 hover:border-amber-300 hover:scale-105 opacity-60'
                              }`}
                              title={
                                slotValue
                                  ? isRevealed
                                    ? `Slot #${idx + 1}: Slime Revelado!`
                                    : `Slot #${idx + 1}: Silhueta de Slime Oculto (Clique para Escanear)`
                                  : `Slot #${idx + 1}: Vazio (Clique para Escanear Área)`
                              }
                            >
                              {slotValue ? (
                                isImage ? (
                                  <div className="relative w-full h-full flex items-center justify-center">
                                    <img
                                      src={slotValue}
                                      alt={`Slot ${idx + 1}`}
                                      className={`w-full h-full object-contain p-1 transition-all ${
                                        !isRevealed
                                          ? 'filter brightness-0 contrast-200 opacity-85'
                                          : 'filter drop-shadow-[0_2px_8px_rgba(255,255,255,0.4)]'
                                      }`}
                                    />
                                    {!isRevealed && (
                                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                        <Lock className="w-3.5 h-3.5 text-amber-300 drop-shadow-md" />
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span className="truncate max-w-[34px] text-center text-amber-200">{slotValue}</span>
                                )
                              ) : (
                                <span className="text-[11px] opacity-40 font-mono">👾</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* BOTÃO VIAJAR / BATALHAR (3D Verde/Dourado) */}
                <button
                  type="button"
                  onClick={() => {
                    const targetLevel =
                      savedLevels.find((l) => l.id === selectedPoi.targetLevelId) ||
                      savedLevels.find(
                        (l) =>
                          l.name &&
                          selectedPoi.name &&
                          l.name.toLowerCase().trim() === selectedPoi.name.toLowerCase().trim()
                      ) ||
                      savedLevels[0] ||
                      (onLoadLevel
                        ? ({
                            id: selectedPoi.targetLevelId || selectedPoi.id || 'level-active',
                            name: selectedPoi.name || project.title || 'Fase Explorável',
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            projectData: {
                              ...project,
                              title: selectedPoi.name || project.title || 'Fase Explorável',
                            },
                          } as SavedLevel)
                        : undefined);
                    if (targetLevel && onLoadLevel) {
                      onLoadLevel(targetLevel);
                      handleCloseModal();
                    } else if (onOpenEditorTab) {
                      onOpenEditorTab();
                      handleCloseModal();
                    }
                  }}
                  className="w-full py-3 px-4 rounded-2xl bg-gradient-to-b from-emerald-400 via-emerald-600 to-emerald-800 border-2 border-emerald-300 font-black text-white text-base tracking-wider shadow-[0_6px_0_#065f46] hover:brightness-110 active:translate-y-1 active:shadow-none transition-all cursor-pointer flex items-center justify-center gap-2 uppercase"
                >
                  <Zap className="w-5 h-5 text-amber-300 fill-amber-300 animate-pulse" />
                  <span>{selectedPoi.travelButtonText || 'VIAJAR AGORA'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EVENTO DE ENCONTRO / SCANNER DE SLIMES E MONSTROS */}
      {activeEncounterSlot && selectedPoi && (
        <div
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveEncounterSlot(null)}
        >
          <div
            className="w-full max-w-[340px] bg-gradient-to-b from-stone-900 via-amber-950 to-stone-950 border-2 border-amber-400 rounded-3xl p-5 text-white shadow-[0_0_40px_rgba(245,158,11,0.4)] relative flex flex-col items-center text-center space-y-4 select-none"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveEncounterSlot(null)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-rose-600 border border-rose-400 text-white flex items-center justify-center text-xs font-bold transition-transform hover:scale-110 cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>

            {/* Ícone ou Silhueta do Slime/Monstro */}
            <div className="w-24 h-24 rounded-3xl bg-amber-950/90 border-2 border-amber-400 flex items-center justify-center p-2.5 relative shadow-[0_6px_16px_rgba(0,0,0,0.8)] overflow-hidden">
              {activeEncounterSlot.val.startsWith('data:image') || activeEncounterSlot.val.startsWith('http') ? (
                <img
                  src={activeEncounterSlot.val}
                  alt=""
                  className={`w-full h-full object-contain ${
                    !activeEncounterSlot.isRevealed ? 'filter brightness-0 contrast-200 opacity-85' : 'filter drop-shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                  }`}
                />
              ) : (
                <span className="text-4xl">{activeEncounterSlot.val}</span>
              )}
              {!activeEncounterSlot.isRevealed && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
                  <Lock className="w-6 h-6 text-amber-400 drop-shadow-md animate-pulse" />
                  <span className="text-[9px] font-black text-amber-300 uppercase tracking-widest">Silhueta</span>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-sm font-black text-amber-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <span>👾</span>
                <span>
                  {activeEncounterSlot.isRevealed
                    ? 'Slime Descoberto & Revelado!'
                    : `Monstro Oculto (Slot #${activeEncounterSlot.idx + 1})`}
                </span>
              </h4>
              <p className="text-xs text-amber-100/80 mt-1 leading-snug">
                {activeEncounterSlot.isRevealed
                  ? 'Este monstro foi escaneado e catalogado com sucesso nesta área do mapa!'
                  : 'Criatura misteriosa detectada nesta coordenada. Escaneie para decifrar a silhueta e revelar o monstro!'}
              </p>
            </div>

            {/* Ações do Evento de Encontro / Scanner */}
            <div className="w-full space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const currentConfigs = [...(selectedPoi.rewardSlotConfigs || [])];
                  const existingIdx = currentConfigs.findIndex((s) => s.slotIndex === activeEncounterSlot.idx);
                  const nextState = !activeEncounterSlot.isRevealed;

                  const newConfig = {
                    slotIndex: activeEncounterSlot.idx,
                    imageUrl: activeEncounterSlot.val,
                    isRevealed: nextState,
                    encounterEventLink: activeEncounterSlot.link,
                  };

                  if (existingIdx >= 0) {
                    currentConfigs[existingIdx] = newConfig;
                  } else {
                    currentConfigs.push(newConfig);
                  }

                  // Atualiza o estado local do POI selecionado
                  setSelectedPoi({ ...selectedPoi, rewardSlotConfigs: currentConfigs });
                  setActiveEncounterSlot({ ...activeEncounterSlot, isRevealed: nextState });
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 hover:brightness-110 border-2 border-amber-300 font-black text-xs text-white shadow-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200 animate-spin" />
                <span>
                  {activeEncounterSlot.isRevealed ? 'Ocultar como Silhueta' : '🔍 Escanear Monstro (Revelar)'}
                </span>
              </button>

              {activeEncounterSlot.link && (
                <a
                  href={activeEncounterSlot.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 rounded-xl bg-sky-950/80 hover:bg-sky-900/90 border border-sky-400/60 font-bold text-[11px] text-sky-200 flex items-center justify-center gap-1.5 transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Acessar Evento de Encontro 🚀</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Estilos de Animação de Nuvens em Parallax */}
      <style>{`
        @keyframes worldMapCloudsDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
};
