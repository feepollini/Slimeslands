import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import {
  OrnateMapMarkerPin,
  playConstellationStarNote,
  playMarkersUnfurlChime,
  type MarkerRevealStage,
} from './OrnateMapMarkerPin';
import {
  ConstellationLayerView,
  SolarSystemLayerView,
  PlanetGlobeEmulatorView,
  AstralDestinationCapsule,
  getOrCreatePlanetGlobeConfig,
  buildDefaultMarkersForPlanet,
  detectMapViewportProfile,
} from './PlanetGlobeView';
import type { SolarSystemPlanet, ConstellationSystemNode } from '../../types/map';

interface WorldMapEmulatorViewProps {
  project: MapProject;
  savedLevels?: SavedLevel[];
  onLoadLevel?: (level: SavedLevel) => void;
  screenWidth: number;
  screenHeight: number;
  isPlayMode?: boolean;
  onOpenEditorTab?: () => void;
  availableMaps?: WorldMapConfig[];
  currentMapId?: string;
  onSelectWorldMap?: (wm: WorldMapConfig) => void;
}

export const WorldMapEmulatorView: React.FC<WorldMapEmulatorViewProps> = ({
  project,
  savedLevels = [],
  onLoadLevel,
  screenWidth,
  screenHeight,
  isPlayMode = false,
  onOpenEditorTab,
  availableMaps = [],
  currentMapId,
  onSelectWorldMap,
}) => {
  const planetGlobe = getOrCreatePlanetGlobeConfig(project);
  const isPlanetEnabled = planetGlobe.enabled !== false;
  const constellations = planetGlobe.constellations || [];
  const [activeConstellation, setActiveConstellation] = useState<ConstellationSystemNode | null>(
    () => constellations[0] || null
  );
  const [pausedConstellationId, setPausedConstellationId] = useState<string | null>(null);

  const solarPlanets =
    activeConstellation?.planets && activeConstellation.planets.length > 0
      ? activeConstellation.planets
      : planetGlobe.planets || [];

  // =========================================================================
  // 4 CAMADAS DO MESMO MAPA:
  // 1. 'constellation' -> Camada 1: Constelações (estrelas coloridas, estrelas duplas, gigantes, pulsares e Hyper-Salto p/ Sistema Solar)
  // 2. 'solar'         -> Camada 2: Sistema Planetário (planetas e luas em órbitas circulares, 1º clique exibe estrela+cápsula sem asset, 2º clique faz Hyper-Zoom)
  // 3. 'planet'        -> Camada 3: Close no Planeta/Lua Girando (metade do globo girando com estrelas pulsantes e continente em foco)
  // 4. 'region'        -> Camada 4: Mapa Regional Final (locais da região e viagem para a fase)
  // =========================================================================
  const [mapLayerMode, setMapLayerMode] = useState<
    'constellation' | 'solar' | 'planet' | 'region'
  >(() =>
    !isPlanetEnabled
      ? 'region'
      : planetGlobe.enableConstellationLayer !== false
      ? 'constellation'
      : 'solar'
  );
  const [pausedSolarPlanetId, setPausedSolarPlanetId] = useState<string | null>(null);
  const [activeSolarPlanet, setActiveSolarPlanet] = useState<SolarSystemPlanet | null>(
    () => solarPlanets[0] || null
  );
  const [externalGlobeMarkerId, setExternalGlobeMarkerId] = useState<string | null>(null);
  const [regionalMapOverride, setRegionalMapOverride] = useState<WorldMapConfig | null>(null);

  const baseWorldMap = getOrCreateWorldMapConfig(project);
  const worldMap = regionalMapOverride || baseWorldMap;
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

  // Estados da UI Sobreposta ao Mapa (Lugares, Sublugares, Regiões, Legenda)
  const visiblePois = React.useMemo(
    () =>
      (worldMap.pointsOfInterest || []).filter(
        (p) => !p.isInvisible && p.iconType !== 'invisible_node'
      ),
    [worldMap.pointsOfInterest]
  );
  const vp = useMemo(
    () => detectMapViewportProfile(screenWidth, screenHeight),
    [screenWidth, screenHeight]
  );

  // Em Mobile (Retrato ou Paisagem), inicia a gaveta LUGARES recolhida para deixar o céu/planeta 100% limpo
  const [isLugaresExpanded, setIsLugaresExpanded] = useState<boolean>(
    () => !(screenWidth < 600 || screenHeight < 540)
  );
  useEffect(() => {
    if (vp.isMobilePortrait || vp.isMobileLandscape) {
      setIsLugaresExpanded(false);
    }
  }, [vp.profile, vp.isMobilePortrait, vp.isMobileLandscape]);

  const [expandedPlaceId, setExpandedPlaceId] = useState<string | null>(
    () => visiblePois[0]?.id || null
  );
  const [isRegionsOpen, setIsRegionsOpen] = useState<boolean>(false);
  const [isLegendOpen, setIsLegendOpen] = useState<boolean>(false);

  // =========================================================================
  // EXPERIÊNCIA CINEMATOGRÁFICA DE ABERTURA DA CAMADA 3 (MAPA REGIONAL)
  // =========================================================================
  const [introPhase, setIntroPhase] = useState<
    'stars_igniting' | 'dissolving_darkness' | 'markers_unfurling' | 'zooming_to_first' | 'complete'
  >('complete');
  const [litStarCount, setLitStarCount] = useState<number>(0);
  const [flaringStarIdx, setFlaringStarIdx] = useState<number | null>(null);
  const [introRunKey, setIntroRunKey] = useState<number>(0);

  const [cameraTargetPoi, setCameraTargetPoi] = useState<WorldMapPOI | null>(null);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const orderedIntroPois = React.useMemo(() => {
    return [...visiblePois].sort((a, b) => a.x - b.x || a.y - b.y);
  }, [visiblePois]);

  useEffect(() => {
    setIntroPhase('complete');
    setLitStarCount(orderedIntroPois.length);
    setFlaringStarIdx(null);
    setIsCameraZoomed(false);
    setPanOffset({ x: 0, y: 0 });
    if (mapLayerMode === 'region') {
      const firstLocation = visiblePois[0] || orderedIntroPois[0] || null;
      if (firstLocation) {
        setCameraTargetPoi(firstLocation);
        setFocusedPoiId(firstLocation.id);
        setExpandedPlaceId(firstLocation.id);
      }
      setUserZoom(1.18);
    }
  }, [worldMap.id, introRunKey, orderedIntroPois.length, mapLayerMode, visiblePois]);

  // Oculta SEMPRE o Header e a Barra de Navegação Inferior do Hub enquanto o Mapa estiver aberto!
  // O Mapa utiliza exclusivamente a sua própria UI de Sobreposição nas 3 camadas.
  useEffect(() => {
    if (!isPlayMode) return;
    const topHeader = document.getElementById('top-header-component');
    document.body.classList.add('hub-in-active-phase');
    document.body.classList.add('hub-scroll-hide-bars');
    if (topHeader) topHeader.style.display = 'none';

    return () => {
      document.body.classList.remove('hub-in-active-phase');
      document.body.classList.remove('hub-scroll-hide-bars');
      if (topHeader) topHeader.style.display = 'flex';
    };
  }, [isPlayMode]);

  // Event Listener para a Roda do Mouse (Wheel) Simular Zoom Real Contínuo nas 4 Camadas
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (mapLayerMode === 'region' && introPhase !== 'complete') return;
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.1 : -0.1;
      setUserZoom((prev) => {
        if (mapLayerMode === 'region' && e.deltaY > 0 && prev <= 0.82 && isPlanetEnabled) {
          setSelectedPoi(null);
          setMapLayerMode('planet');
          return 1.0;
        }
        const next = Math.min(2.4, Math.max(0.78, parseFloat((prev + delta).toFixed(2))));
        if (next <= 1.02) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [introPhase, mapLayerMode, isPlanetEnabled]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (mapLayerMode === 'region' && introPhase !== 'complete') return;
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (mapLayerMode === 'region' && introPhase !== 'complete') return;
    if (e.touches.length === 2 && touchDistRef.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = (dist - touchDistRef.current) * 0.006;
      touchDistRef.current = dist;
      setUserZoom((prev) => {
        const next = Math.min(2.4, Math.max(0.78, parseFloat((prev + delta).toFixed(2))));
        if (next <= 1.02) setPanOffset({ x: 0, y: 0 });
        return next;
      });
    }
  };

  const handleTouchEnd = () => {
    touchDistRef.current = null;
  };

  const baseMapHeight = worldMap.mapHeight || 667;
  const baseMapWidth = worldMap.mapWidth || 1600;

  const renderedMapWidth = screenWidth;
  const renderedMapHeight = screenHeight;

  const activeCameraZoom =
    introPhase === 'stars_igniting' ||
    introPhase === 'dissolving_darkness' ||
    introPhase === 'markers_unfurling'
      ? 1.0
      : userZoom * (isCameraZoomed ? 1.18 : 1.0);

  const targetPoiForCamera =
    (focusedPoiId ? visiblePois.find((p) => p.id === focusedPoiId) : null) ||
    cameraTargetPoi ||
    visiblePois[0] ||
    null;

  const targetCanvasX = targetPoiForCamera
    ? (targetPoiForCamera.x / baseMapWidth) * renderedMapWidth
    : renderedMapWidth * 0.5;
  const targetCanvasY = targetPoiForCamera
    ? (targetPoiForCamera.y / baseMapHeight) * renderedMapHeight
    : renderedMapHeight * 0.5;

  const minTx = renderedMapWidth * (1 - activeCameraZoom);
  const minTy = renderedMapHeight * (1 - activeCameraZoom);
  const idealTx = renderedMapWidth * 0.5 - targetCanvasX * activeCameraZoom + panOffset.x;
  const idealTy = renderedMapHeight * 0.5 - targetCanvasY * activeCameraZoom + panOffset.y;
  const clampedCameraTx =
    activeCameraZoom <= 1.001 ? 0 : Math.min(0, Math.max(minTx, idealTx));
  const clampedCameraTy =
    activeCameraZoom <= 1.001 ? 0 : Math.min(0, Math.max(minTy, idealTy));

  const layers = worldMap.layers || [];
  const atmosphere = worldMap.atmosphere || {};

  const isBgVisible = layers.find((l) => l.id === 'background')?.visible !== false;
  const bgOpacity = layers.find((l) => l.id === 'background')?.opacity ?? 1.0;
  const isPoisVisible = layers.find((l) => l.id === 'pois')?.visible !== false;
  const poisOpacity = layers.find((l) => l.id === 'pois')?.opacity ?? 1.0;
  const isAtmoVisible = layers.find((l) => l.id === 'atmosphere')?.visible !== false;
  const atmoOpacity = layers.find((l) => l.id === 'atmosphere')?.opacity ?? 0.85;

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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (mapLayerMode !== 'region' || introPhase !== 'complete') return;
    if ((e.target as HTMLElement).closest('[data-poi-interactive]')) return;
    setIsDragging(true);
    setStartX(e.clientX);
    setStartY(e.clientY);
    setScrollLeftState(panOffset.x);
    setScrollTopState(panOffset.y);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || mapLayerMode !== 'region' || introPhase !== 'complete') return;
    e.preventDefault();
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    setPanOffset({
      x: scrollLeftState + dx,
      y: scrollTopState + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const handlePoiClick = (poi: WorldMapPOI, e: React.MouseEvent) => {
    e.stopPropagation();
    if (introPhase !== 'complete') return;
    if (poi.isInvisible || poi.iconType === 'invisible_node') return;

    setFocusedPoiId(poi.id);
    setCameraTargetPoi(poi);
    setPanOffset({ x: 0, y: 0 });
    setIsCameraZoomed(true);

    setTimeout(() => {
      setSelectedPoi(poi);
    }, 340);
  };

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

  const focusPoiOnMap = (poi: WorldMapPOI, openPopup = false) => {
    setFocusedPoiId(poi.id);
    setCameraTargetPoi(poi);
    setPanOffset({ x: 0, y: 0 });
    if (userZoom < 1.25) {
      setUserZoom(1.32);
    }
    if (openPopup) {
      setIsCameraZoomed(true);
      setTimeout(() => {
        setSelectedPoi(poi);
      }, 280);
    }
  };

  const handleRecenterMap = () => {
    const firstPoi = visiblePois[0] || null;
    setIsCameraZoomed(false);
    setFocusedPoiId(null);
    setPausedConstellationId(null);
    setPausedSolarPlanetId(null);
    setExternalGlobeMarkerId(null);
    setCameraTargetPoi(firstPoi);
    setPanOffset({ x: 0, y: 0 });
    setUserZoom(1.0);
  };

  const isLandscapeLayout = screenWidth > screenHeight * 1.15;
  const topOverlayOffset = vp.isMobileLandscape ? 8 : vp.isMobilePortrait ? 10 : 12;
  const bottomOverlayOffset = vp.isMobileLandscape ? 10 : vp.isMobilePortrait ? 12 : 14;

  // Detecta se a cápsula inferior de destino está ativa para evitar qualquer colisão com o botão LEGENDA
  const hasActiveBottomCapsule =
    mapLayerMode === 'constellation'
      ? Boolean(pausedConstellationId)
      : mapLayerMode === 'solar' || mapLayerMode === 'planet'
      ? true
      : Boolean(targetPoiForCamera && !selectedPoi);

  const legendBottomPx =
    hasActiveBottomCapsule && (vp.isMobilePortrait || screenWidth < 680)
      ? bottomOverlayOffset + 42
      : bottomOverlayOffset;

  const allMaps =
    availableMaps.length > 0
      ? availableMaps
      : project.savedWorldMaps && project.savedWorldMaps.length > 0
      ? project.savedWorldMaps
      : [baseWorldMap];

  const currentPlanetForLayer2 = activeSolarPlanet || solarPlanets[0] || null;
  const currentGlobeMarkers = useMemo(() => {
    if (currentPlanetForLayer2?.markers && currentPlanetForLayer2.markers.length > 0) {
      return currentPlanetForLayer2.markers;
    }
    if (planetGlobe.markers && planetGlobe.markers.length > 0) {
      return planetGlobe.markers;
    }
    return buildDefaultMarkersForPlanet(
      currentPlanetForLayer2?.id || 'solar-planet-1',
      currentPlanetForLayer2?.name || 'Planeta Gaia',
      project
    );
  }, [currentPlanetForLayer2, planetGlobe.markers, project]);

  const showMapOverlayUi =
    !selectedPoi && (mapLayerMode !== 'region' || introPhase === 'complete');

  return (
    <div
      className={`relative w-full h-full bg-black select-none overflow-hidden flex flex-col ${
        mapLayerMode === 'region' && introPhase !== 'complete' ? 'z-[5000]' : ''
      }`}
      style={{ width: screenWidth, height: screenHeight }}
    >
      {/* =========================================================================
          RENDERIZAÇÃO DAS 4 CAMADAS DO MESMO MAPA:
          1. 'constellation' -> Camada 1: Constelações
          2. 'solar'         -> Camada 2: Sistema Planetário
          3. 'planet'        -> Camada 3: Close no Planeta/Lua Girando (Continentes)
          4. 'region'        -> Camada 4: Mapa Regional Final
         ========================================================================= */}
      {mapLayerMode === 'constellation' ? (
        <ConstellationLayerView
          project={project}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          userZoom={userZoom}
          pausedConstellationId={pausedConstellationId}
          onSelectPausedConstellation={(cid) => {
            setPausedConstellationId(cid);
            if (cid) setExpandedPlaceId(cid);
          }}
          onEnterSolarSystem={(constellation) => {
            setActiveConstellation(constellation);
            if (constellation.planets && constellation.planets.length > 0) {
              setActiveSolarPlanet(constellation.planets[0]);
            }
            setPausedConstellationId(null);
            setPausedSolarPlanetId(null);
            setUserZoom(1.0);
            setMapLayerMode('solar');
          }}
        />
      ) : mapLayerMode === 'solar' ? (
        <SolarSystemLayerView
          project={project}
          activeConstellation={activeConstellation}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          userZoom={userZoom}
          pausedPlanetId={pausedSolarPlanetId}
          onSelectPausedPlanet={(pid) => {
            setPausedSolarPlanetId(pid);
            if (pid) setExpandedPlaceId(pid);
          }}
          onEnterPlanetGlobe={(planet) => {
            setActiveSolarPlanet(planet);
            setPausedSolarPlanetId(null);
            setUserZoom(1.0);
            setMapLayerMode('planet');
          }}
          onBackToConstellation={() => {
            setPausedSolarPlanetId(null);
            setUserZoom(1.0);
            setMapLayerMode('constellation');
          }}
        />
      ) : mapLayerMode === 'planet' ? (
        <PlanetGlobeEmulatorView
          project={project}
          activePlanet={currentPlanetForLayer2}
          screenWidth={screenWidth}
          screenHeight={screenHeight}
          userZoom={userZoom}
          externalFocusedMarkerId={externalGlobeMarkerId}
          availableMaps={allMaps}
          onOpenEditorTab={onOpenEditorTab}
          onSelectRegionMarker={(_marker, targetMap) => {
            if (targetMap) {
              setRegionalMapOverride(targetMap);
              onSelectWorldMap?.(targetMap);
            }
            setUserZoom(1.15);
            setIntroRunKey((k) => k + 1);
            setMapLayerMode('region');
          }}
          onBackToSolarSystem={() => {
            setUserZoom(1.0);
            setMapLayerMode('solar');
          }}
        />
      ) : (
        /* CAMADA 3: MAPA REGIONAL FINAL */
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
          className={`w-full h-full overflow-hidden overscroll-none relative bg-black ${
            introPhase !== 'complete'
              ? 'cursor-default'
              : isDragging
              ? 'cursor-grabbing'
              : 'cursor-grab'
          }`}
        >
          <div
            className="relative overflow-hidden"
            style={{
              width: renderedMapWidth,
              height: renderedMapHeight,
              transformOrigin: '0 0',
              transform: `translate3d(${clampedCameraTx}px, ${clampedCameraTy}px, 0) scale(${activeCameraZoom})`,
              transition: isDragging
                ? 'none'
                : introPhase === 'zooming_to_first'
                ? 'transform 1.5s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'transform 0.55s cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {/* Camada 1: Imagem de Fundo Panorâmica em Full Screen */}
            {isBgVisible && (
              <img
                src={bgImage}
                alt="Fundo do Mapa"
                className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none filter contrast-[1.03] brightness-[0.97]"
                style={{ opacity: bgOpacity }}
                draggable={false}
              />
            )}

            {/* Cortina de Escuridão da Abertura */}
            {introPhase !== 'complete' && (
              <svg
                className="absolute inset-0 pointer-events-none z-20"
                style={{
                  width: renderedMapWidth,
                  height: renderedMapHeight,
                  opacity:
                    introPhase === 'markers_unfurling' || introPhase === 'zooming_to_first' ? 0 : 1,
                  transition: 'opacity 1.2s ease-out',
                }}
              >
                <defs>
                  <radialGradient id="starPortalFeather">
                    <stop offset="0%" stopColor="black" />
                    <stop offset="55%" stopColor="black" />
                    <stop offset="100%" stopColor="white" />
                  </radialGradient>
                  <radialGradient id="starGoldenAura">
                    <stop offset="0%" stopColor="rgba(255, 245, 200, 0.26)" />
                    <stop offset="48%" stopColor="rgba(245, 192, 52, 0.09)" />
                    <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                  </radialGradient>
                  <mask id="constellationDarknessMask">
                    <rect x="0" y="0" width={renderedMapWidth} height={renderedMapHeight} fill="white" />
                    {orderedIntroPois.map((poi) => {
                      const sx = (poi.x / baseMapWidth) * renderedMapWidth;
                      const sy = (poi.y / baseMapHeight) * renderedMapHeight;
                      const isDissolving =
                        introPhase === 'dissolving_darkness' ||
                        introPhase === 'markers_unfurling' ||
                        introPhase === 'zooming_to_first';
                      const holeRadius = isDissolving
                        ? Math.hypot(renderedMapWidth, renderedMapHeight) * 1.05
                        : 0;
                      return (
                        <circle
                          key={`mask-hole-${poi.id}`}
                          cx={sx}
                          cy={sy}
                          r={holeRadius}
                          fill="url(#starPortalFeather)"
                          style={{
                            transition: isDissolving
                              ? 'r 2.35s cubic-bezier(0.22, 1, 0.36, 1)'
                              : 'none',
                          }}
                        />
                      );
                    })}
                  </mask>
                </defs>

                <rect
                  x="0"
                  y="0"
                  width={renderedMapWidth}
                  height={renderedMapHeight}
                  fill="#000000"
                  mask="url(#constellationDarknessMask)"
                />

                {orderedIntroPois.slice(0, litStarCount).map((poi) => {
                  const sx = (poi.x / baseMapWidth) * renderedMapWidth;
                  const sy = (poi.y / baseMapHeight) * renderedMapHeight;
                  const isDissolving =
                    introPhase === 'dissolving_darkness' ||
                    introPhase === 'markers_unfurling' ||
                    introPhase === 'zooming_to_first';
                  return (
                    <g key={`star-aura-ring-${poi.id}`}>
                      <circle
                        cx={sx}
                        cy={sy}
                        r={isDissolving ? 260 : 44}
                        fill="url(#starGoldenAura)"
                        style={{
                          opacity: isDissolving ? 0 : 0.75,
                          transition: 'r 2.1s ease-out, opacity 1.8s ease-out',
                        }}
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Pontos de Interesse (POIs no Mapa Regional) */}
            {isPoisVisible && (
              <div
                className="absolute inset-0 pointer-events-auto z-30 transition-opacity duration-500"
                style={{ opacity: poisOpacity }}
              >
                {worldMap.pointsOfInterest.map((poi) => {
                  if (poi.isInvisible || poi.iconType === 'invisible_node') return null;

                  const poiCanvasX = (poi.x / baseMapWidth) * renderedMapWidth;
                  const poiCanvasY = (poi.y / baseMapHeight) * renderedMapHeight;
                  const scale = poi.scale || 1.0;
                  const isFocused = focusedPoiId === poi.id;
                  const isHiddenByFocus = focusedPoiId !== null && !isFocused;

                  const orderIdx = orderedIntroPois.findIndex((p) => p.id === poi.id);
                  let markerRevealStage: MarkerRevealStage = 'full';
                  if (introPhase === 'stars_igniting') {
                    if (orderIdx === -1 || orderIdx >= litStarCount) {
                      markerRevealStage = 'hidden';
                    } else if (orderIdx === flaringStarIdx) {
                      markerRevealStage = 'star_flare';
                    } else {
                      markerRevealStage = 'star_only';
                    }
                  } else if (introPhase === 'dissolving_darkness') {
                    markerRevealStage = 'star_only';
                  } else {
                    markerRevealStage = 'full';
                  }

                  return (
                    <div
                      key={poi.id}
                      data-poi-interactive="true"
                      onClick={(e) => {
                        if (introPhase !== 'complete') return;
                        handlePoiClick(poi, e);
                      }}
                      className={`absolute transition-all duration-500 group ${
                        introPhase !== 'complete' ? 'pointer-events-none' : 'cursor-pointer'
                      } ${
                        isHiddenByFocus ? 'opacity-0 pointer-events-none scale-75' : 'opacity-100 scale-100'
                      }`}
                      style={{
                        left: poiCanvasX,
                        top: poiCanvasY,
                        transform: 'translate(-20%, -84%)',
                      }}
                    >
                      <OrnateMapMarkerPin
                        name={poi.name}
                        iconPng={poi.iconPng}
                        iconEmoji={poi.iconEmoji || '🏰'}
                        status={poi.status}
                        customLockIconPng={worldMap.customLockIconPng}
                        isFocused={isFocused}
                        scale={scale}
                        sizeVariant="md"
                        revealStage={markerRevealStage}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Atmosfera & Nuvens em Parallax */}
            {isAtmoVisible && (
              <div
                className="absolute inset-0 pointer-events-none z-15 overflow-hidden"
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

          {/* Bottom Destination Capsule on Regional Map when a Location is Focused */}
          {targetPoiForCamera && !selectedPoi && (
            <AstralDestinationCapsule
              visible={Boolean(targetPoiForCamera)}
              categoryLabel={worldMap.title || 'REGIÃO EXPLORADA'}
              destinationName={targetPoiForCamera.name || 'Local Selecionado'}
              subtitle={
                targetPoiForCamera.badgeText ||
                `Nível Recomendado ${targetPoiForCamera.recommendedLevel || 1}`
              }
              accentColor="#fbbf24"
              screenWidth={screenWidth}
              screenHeight={screenHeight}
              actionLabel={`IR ATÉ ${targetPoiForCamera.name || 'LOCAL'}`}
              onConfirm={() => {
                setSelectedPoi(targetPoiForCamera);
              }}
            />
          )}
        </div>
      )}

      {/* =========================================================================
          UI DE SOBREPOSIÇÃO DO MAPA (COMPARTILHADA PELAS 3 CAMADAS DO MESMO MAPA:
          CAMADA 1: SISTEMA SOLAR • CAMADA 2: GLOBO DO PLANETA • CAMADA 3: REGIONAL)
         ========================================================================= */}
      {showMapOverlayUi && (
        <>
          {/* 1. PAINEL ESQUERDO EXPANSÍVEL: ✦ LUGARES ✦ COM ÁRVORE DOURADA */}
          <div
            className="absolute left-2.5 z-35 pointer-events-auto select-none flex flex-col transition-all duration-300 animate-in fade-in"
            style={{
              top: `${topOverlayOffset}px`,
              width: vp.isMobilePortrait
                ? isLugaresExpanded
                  ? '158px'
                  : '124px'
                : vp.isMobileLandscape
                ? isLugaresExpanded
                  ? '172px'
                  : '132px'
                : isLandscapeLayout
                ? '196px'
                : '172px',
              maxHeight: `${Math.max(160, screenHeight - topOverlayOffset - bottomOverlayOffset - 56)}px`,
            }}
          >
            <div
              className="pearl-surface flex flex-col overflow-hidden"
              style={{
                borderRadius: '18px',
                border: '2px solid #c59638',
                outline: '1.5px solid #4a3006',
                boxShadow:
                  '0 10px 26px rgba(0, 8, 22, 0.72), inset 0 1px 0 rgba(255, 255, 255, 0.92)',
              }}
            >
              {/* Cabeçalho Ornamental: ✦ LUGARES ✦ */}
              <button
                type="button"
                onClick={() => setIsLugaresExpanded((prev) => !prev)}
                className="w-full px-2.5 py-2 flex items-center justify-center gap-1.5 border-b border-[#c59638]/70 bg-gradient-to-b from-[#faf6ed] via-[#efe5d2] to-[#dfd0b5] cursor-pointer active:scale-[0.99] transition-all"
                title={isLugaresExpanded ? 'Recolher lista de Lugares' : 'Expandir lista de Lugares'}
              >
                <span className="text-[#9b6c15] text-[10px]">✦</span>
                <span className="font-cinzel font-black text-[11px] sm:text-xs text-[#2b1f14] tracking-[0.14em] uppercase">
                  LUGARES
                </span>
                <span className="text-[#9b6c15] text-[10px]">✦</span>
              </button>

              {isLugaresExpanded && (
                <div className="px-2 py-2 space-y-2 overflow-y-auto nova-scroll max-h-[250px] sm:max-h-[300px]">
                  {mapLayerMode === 'constellation' ? (
                    /* CAMADA 1: Lista as Constelações do Firmamento */
                    constellations.map((c, idx) => {
                      const isExpanded =
                        expandedPlaceId === c.id || pausedConstellationId === c.id;
                      const cPlanets = c.planets || solarPlanets;
                      return (
                        <div key={c.id} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedPlaceId((prev) => (prev === c.id ? null : c.id));
                              setPausedConstellationId(c.id);
                            }}
                            onDoubleClick={() => {
                              setActiveConstellation(c);
                              setPausedConstellationId(null);
                              setUserZoom(1.0);
                              setMapLayerMode('solar');
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-full flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-gradient-to-b from-[#0b3778] via-[#062356] to-[#04183b] border-[1.5px] border-[#e5c168] text-[#fff3c2] shadow-[0_3px_8px_rgba(0,8,22,0.55)]'
                                : 'pearl-pill hover:brightness-95 text-[#2b1f14]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs leading-none shrink-0">
                                {c.markerIconEmoji || `0${idx + 1}`}
                              </span>
                              <span
                                className={`font-cinzel font-black text-[9.5px] uppercase tracking-wider truncate ${
                                  isExpanded ? 'text-[#fff3c2]' : 'text-[#2b1f14]'
                                }`}
                              >
                                {c.name}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold shrink-0 transition-transform ${
                                isExpanded ? 'rotate-90 text-[#e5c168]' : 'text-[#8c6518]'
                              }`}
                            >
                              ▸
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="relative pl-4 pr-0.5 pt-2 pb-1 space-y-1.5">
                              <div
                                className="absolute left-2.5 top-0 bottom-3 w-[1.5px]"
                                style={{
                                  background:
                                    'linear-gradient(180deg, #c59638 0%, #e5c168 65%, #9b6c15 100%)',
                                }}
                              />
                              <div className="relative flex items-center">
                                <span
                                  className="absolute -left-[9.5px] w-2 h-2 rounded-full"
                                  style={{
                                    background:
                                      'radial-gradient(circle, #fff3c2 0%, #d4a84b 70%, #7d5610 100%)',
                                    border: '1px solid #4a3006',
                                  }}
                                />
                                <span
                                  className="w-2 h-[1.5px] mr-1 shrink-0"
                                  style={{ background: '#c59638' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveConstellation(c);
                                    setPausedConstellationId(null);
                                    setUserZoom(1.0);
                                    setMapLayerMode('solar');
                                  }}
                                  className="flex-1 px-2.5 py-1 rounded-full pearl-subcard hover:brightness-95 active:scale-95 transition-all flex items-center justify-between gap-1 cursor-pointer"
                                  style={{
                                    borderRadius: '999px',
                                    border: '1.5px solid #c59638',
                                  }}
                                >
                                  <span className="font-cinzel font-bold text-[8.5px] text-[#3a2b1c] uppercase tracking-wider truncate">
                                    ☀️ VER SISTEMA ({cPlanets.length} PLANETAS)
                                  </span>
                                  <span className="text-[8px] text-[#8c6518] shrink-0">✦</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : mapLayerMode === 'solar' ? (
                    /* CAMADA 2: Lista os Planetas do Sistema Solar e suas Regiões/Luas na árvore */
                    solarPlanets.map((pl, idx) => {
                      const isExpanded = expandedPlaceId === pl.id || pausedSolarPlanetId === pl.id;
                      const planetRegs = pl.markers || [];
                      return (
                        <div key={pl.id} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedPlaceId((prev) => (prev === pl.id ? null : pl.id));
                              setPausedSolarPlanetId(pl.id);
                            }}
                            onDoubleClick={() => {
                              setActiveSolarPlanet(pl);
                              setPausedSolarPlanetId(null);
                              setUserZoom(1.0);
                              setMapLayerMode('planet');
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-full flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-gradient-to-b from-[#0b3778] via-[#062356] to-[#04183b] border-[1.5px] border-[#e5c168] text-[#fff3c2] shadow-[0_3px_8px_rgba(0,8,22,0.55)]'
                                : 'pearl-pill hover:brightness-95 text-[#2b1f14]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs leading-none shrink-0">
                                {pl.markerIconEmoji || `0${idx + 1}`}
                              </span>
                              <span
                                className={`font-cinzel font-black text-[9.5px] uppercase tracking-wider truncate ${
                                  isExpanded ? 'text-[#fff3c2]' : 'text-[#2b1f14]'
                                }`}
                              >
                                {pl.name}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold shrink-0 transition-transform ${
                                isExpanded ? 'rotate-90 text-[#e5c168]' : 'text-[#8c6518]'
                              }`}
                            >
                              ▸
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="relative pl-4 pr-0.5 pt-2 pb-1 space-y-1.5">
                              <div
                                className="absolute left-2.5 top-0 bottom-3 w-[1.5px]"
                                style={{
                                  background:
                                    'linear-gradient(180deg, #c59638 0%, #e5c168 65%, #9b6c15 100%)',
                                }}
                              />
                              <div className="relative flex items-center">
                                <span
                                  className="absolute -left-[9.5px] w-2 h-2 rounded-full"
                                  style={{
                                    background:
                                      'radial-gradient(circle, #fff3c2 0%, #d4a84b 70%, #7d5610 100%)',
                                    border: '1px solid #4a3006',
                                  }}
                                />
                                <span
                                  className="w-2 h-[1.5px] mr-1 shrink-0"
                                  style={{ background: '#c59638' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveSolarPlanet(pl);
                                    setPausedSolarPlanetId(null);
                                    setUserZoom(1.0);
                                    setMapLayerMode('planet');
                                  }}
                                  className="flex-1 px-2.5 py-1 rounded-full pearl-subcard hover:brightness-95 active:scale-95 transition-all flex items-center justify-between gap-1 cursor-pointer"
                                  style={{
                                    borderRadius: '999px',
                                    border: '1.5px solid #c59638',
                                  }}
                                >
                                  <span className="font-cinzel font-bold text-[8.5px] text-[#3a2b1c] uppercase tracking-wider truncate">
                                    🌍 VER GLOBO ({planetRegs.length || 4} CONTINENTES)
                                  </span>
                                  <span className="text-[8px] text-[#8c6518] shrink-0">✦</span>
                                </button>
                              </div>

                              {(pl.moons || []).map((moon) => (
                                <div key={moon.id} className="relative flex items-center">
                                  <span
                                    className="absolute -left-[9.5px] w-2 h-2 rounded-full"
                                    style={{
                                      background:
                                        'radial-gradient(circle, #fff3c2 0%, #d4a84b 70%, #7d5610 100%)',
                                      border: '1px solid #4a3006',
                                    }}
                                  />
                                  <span
                                    className="w-2 h-[1.5px] mr-1 shrink-0"
                                    style={{ background: '#c59638' }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (pausedSolarPlanetId === moon.id) {
                                        const moonGlobe: SolarSystemPlanet = {
                                          id: moon.id,
                                          name: moon.name,
                                          description: `Satélite natural de ${pl.name}`,
                                          planetImagePng:
                                            moon.imagePng || pl.planetImagePng,
                                          markerIconPng:
                                            moon.markerIconPng || pl.markerIconPng,
                                          markerIconEmoji: moon.markerIconEmoji || '🌙',
                                          glowColor: '#94a3b8',
                                          hasRings: false,
                                          sizePx: 40,
                                          targetWorldMapId:
                                            moon.targetWorldMapId || pl.targetWorldMapId,
                                          status: moon.status || 'unlocked',
                                          markers:
                                            moon.markers && moon.markers.length > 0
                                              ? moon.markers
                                              : buildDefaultMarkersForPlanet(
                                                  moon.id,
                                                  moon.name,
                                                  project
                                                ),
                                          moons: [],
                                        };
                                        setActiveSolarPlanet(moonGlobe);
                                        setPausedSolarPlanetId(null);
                                        setUserZoom(1.0);
                                        setMapLayerMode('planet');
                                      } else {
                                        setPausedSolarPlanetId(moon.id);
                                      }
                                    }}
                                    className="flex-1 px-2.5 py-1 rounded-full pearl-subcard hover:brightness-95 active:scale-95 transition-all flex items-center justify-between gap-1 cursor-pointer"
                                    style={{
                                      borderRadius: '999px',
                                      border: '1.5px solid #c59638',
                                    }}
                                  >
                                    <span className="font-cinzel font-bold text-[8.5px] text-[#3a2b1c] uppercase tracking-wider truncate">
                                      {moon.markerIconEmoji || '🌙'} {moon.name}
                                    </span>
                                    <span className="text-[8px] text-[#8c6518] shrink-0">✦</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : mapLayerMode === 'planet' ? (
                    /* CAMADA 2: Lista os Continentes / Marcadores no Globo do Planeta atual */
                    currentGlobeMarkers.map((gm, idx) => {
                      const isExpanded =
                        expandedPlaceId === gm.id || externalGlobeMarkerId === gm.id;
                      return (
                        <div key={gm.id} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedPlaceId((prev) => (prev === gm.id ? null : gm.id));
                              setExternalGlobeMarkerId(gm.id);
                            }}
                            onDoubleClick={() => {
                              const matchedMap =
                                allMaps.find((m) => m.id === gm.targetWorldMapId) ||
                                allMaps[0] ||
                                baseWorldMap;
                              setRegionalMapOverride(matchedMap);
                              onSelectWorldMap?.(matchedMap);
                              setUserZoom(1.0);
                              setIntroRunKey((k) => k + 1);
                              setMapLayerMode('region');
                            }}
                            className={`w-full px-2.5 py-1.5 rounded-full flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                              isExpanded
                                ? 'bg-gradient-to-b from-[#0b3778] via-[#062356] to-[#04183b] border-[1.5px] border-[#e5c168] text-[#fff3c2] shadow-[0_3px_8px_rgba(0,8,22,0.55)]'
                                : 'pearl-pill hover:brightness-95 text-[#2b1f14]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs leading-none shrink-0">
                                {gm.iconEmoji || `0${idx + 1}`}
                              </span>
                              <span
                                className={`font-cinzel font-black text-[9.5px] uppercase tracking-wider truncate ${
                                  isExpanded ? 'text-[#fff3c2]' : 'text-[#2b1f14]'
                                }`}
                              >
                                {gm.name}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold shrink-0 transition-transform ${
                                isExpanded ? 'rotate-90 text-[#e5c168]' : 'text-[#8c6518]'
                              }`}
                            >
                              ▸
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="relative pl-4 pr-0.5 pt-2 pb-1 space-y-1.5">
                              <div
                                className="absolute left-2.5 top-0 bottom-3 w-[1.5px]"
                                style={{
                                  background:
                                    'linear-gradient(180deg, #c59638 0%, #e5c168 65%, #9b6c15 100%)',
                                }}
                              />
                              <div className="relative flex items-center">
                                <span
                                  className="absolute -left-[9.5px] w-2 h-2 rounded-full"
                                  style={{
                                    background:
                                      'radial-gradient(circle, #fff3c2 0%, #d4a84b 70%, #7d5610 100%)',
                                    border: '1px solid #4a3006',
                                  }}
                                />
                                <span
                                  className="w-2 h-[1.5px] mr-1 shrink-0"
                                  style={{ background: '#c59638' }}
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchedMap =
                                      allMaps.find((m) => m.id === gm.targetWorldMapId) ||
                                      allMaps[0] ||
                                      baseWorldMap;
                                    setRegionalMapOverride(matchedMap);
                                    onSelectWorldMap?.(matchedMap);
                                    setUserZoom(1.0);
                                    setIntroRunKey((k) => k + 1);
                                    setMapLayerMode('region');
                                  }}
                                  className="flex-1 px-2.5 py-1 rounded-full pearl-subcard hover:brightness-95 active:scale-95 transition-all flex items-center justify-between gap-1 cursor-pointer"
                                  style={{
                                    borderRadius: '999px',
                                    border: '1.5px solid #c59638',
                                  }}
                                >
                                  <span className="font-cinzel font-bold text-[8.5px] text-[#3a2b1c] uppercase tracking-wider truncate">
                                    🗺️ ABRIR MAPA REGIONAL
                                  </span>
                                  <span className="text-[8px] text-[#8c6518] shrink-0">✦</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    /* CAMADA 3: Lista os Lugares (POIs) da Região e seus Sublugares */
                    visiblePois.map((poi, idx) => {
                      const isExpanded = expandedPlaceId === poi.id;
                      const isFocused = focusedPoiId === poi.id;
                      const connectedPois = (poi.connectedToIds || [])
                        .map((cid) => visiblePois.find((p) => p.id === cid))
                        .filter((p): p is WorldMapPOI => Boolean(p));

                      const subPlaces: {
                        id: string;
                        label: string;
                        targetPoi: WorldMapPOI;
                        action: 'focus' | 'open';
                      }[] =
                        connectedPois.length > 0
                          ? connectedPois.map((cp, sIdx) => ({
                              id: `${poi.id}-sub-${cp.id}`,
                              label: cp.name || `SUBLUGAR 0${sIdx + 1}`,
                              targetPoi: cp,
                              action: 'open',
                            }))
                          : [
                              {
                                id: `${poi.id}-sub-1`,
                                label: poi.badgeText || `ENTRADA • NV.${poi.recommendedLevel || 1}`,
                                targetPoi: poi,
                                action: 'focus',
                              },
                              {
                                id: `${poi.id}-sub-2`,
                                label: `EXPLORAR LOCAL`,
                                targetPoi: poi,
                                action: 'open',
                              },
                            ];

                      return (
                        <div key={poi.id} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedPlaceId((prev) => (prev === poi.id ? null : poi.id));
                              focusPoiOnMap(poi, false);
                            }}
                            onDoubleClick={() => focusPoiOnMap(poi, true)}
                            className={`w-full px-2.5 py-1.5 rounded-full flex items-center justify-between gap-1.5 transition-all cursor-pointer ${
                              isExpanded || isFocused
                                ? 'bg-gradient-to-b from-[#0b3778] via-[#062356] to-[#04183b] border-[1.5px] border-[#e5c168] text-[#fff3c2] shadow-[0_3px_8px_rgba(0,8,22,0.55)]'
                                : 'pearl-pill hover:brightness-95 text-[#2b1f14]'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              {poi.iconPng ? (
                                <img
                                  src={poi.iconPng}
                                  alt={poi.name}
                                  className="w-4 h-4 object-contain shrink-0 drop-shadow"
                                />
                              ) : (
                                <span className="text-xs leading-none shrink-0">
                                  {poi.iconEmoji || `0${idx + 1}`}
                                </span>
                              )}
                              <span
                                className={`font-cinzel font-black text-[9.5px] uppercase tracking-wider truncate ${
                                  isExpanded || isFocused ? 'text-[#fff3c2]' : 'text-[#2b1f14]'
                                }`}
                              >
                                {poi.name || `LUGAR 0${idx + 1}`}
                              </span>
                            </div>
                            <span
                              className={`text-[9px] font-bold shrink-0 transition-transform ${
                                isExpanded ? 'rotate-90 text-[#e5c168]' : 'text-[#8c6518]'
                              }`}
                            >
                              ▸
                            </span>
                          </button>

                          {isExpanded && (
                            <div className="relative pl-4 pr-0.5 pt-2 pb-1 space-y-2">
                              <div
                                className="absolute left-2.5 top-0 bottom-3 w-[1.5px]"
                                style={{
                                  background:
                                    'linear-gradient(180deg, #c59638 0%, #e5c168 65%, #9b6c15 100%)',
                                }}
                              />

                              {subPlaces.map((sub) => (
                                <div key={sub.id} className="relative flex items-center">
                                  <span
                                    className="absolute -left-[9.5px] w-2 h-2 rounded-full"
                                    style={{
                                      background:
                                        'radial-gradient(circle, #fff3c2 0%, #d4a84b 70%, #7d5610 100%)',
                                      border: '1px solid #4a3006',
                                    }}
                                  />
                                  <span
                                    className="w-2 h-[1.5px] mr-1 shrink-0"
                                    style={{ background: '#c59638' }}
                                  />

                                  <button
                                    type="button"
                                    onClick={() => {
                                      focusPoiOnMap(sub.targetPoi, true);
                                    }}
                                    className="flex-1 px-2.5 py-1 rounded-full pearl-subcard hover:brightness-95 active:scale-95 transition-all flex items-center justify-between gap-1 cursor-pointer"
                                    style={{
                                      borderRadius: '999px',
                                      border: '1.5px solid #c59638',
                                    }}
                                  >
                                    <span className="font-cinzel font-bold text-[8.5px] text-[#3a2b1c] uppercase tracking-wider truncate">
                                      {sub.label}
                                    </span>
                                    <span className="text-[8px] text-[#8c6518] shrink-0">✦</span>
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Rodapé com Duplo Chevron Dourado (︾) */}
              <button
                type="button"
                onClick={() => setIsLugaresExpanded((prev) => !prev)}
                className="w-full py-1 bg-gradient-to-b from-[#ebe0cc] to-[#dac9ae] border-t border-[#c59638]/60 flex items-center justify-center text-[#8c6518] hover:text-[#2b1f14] cursor-pointer transition-colors"
                title={isLugaresExpanded ? 'Recolher Lugares' : 'Expandir Lugares'}
              >
                <span
                  className={`font-cinzel font-black text-[11px] leading-none transition-transform duration-200 ${
                    isLugaresExpanded ? 'rotate-180' : ''
                  }`}
                >
                  ︾
                </span>
              </button>
            </div>
          </div>

          {/* 2. COLUNA DIREITA FLUTUANTE: NAVEGAÇÃO ENTRE AS 3 CAMADAS + REGIÕES ⌄ + HASTE COM +, − E RECENTRALIZAR */}
          <div
            className="absolute right-2.5 z-35 pointer-events-auto select-none flex flex-col items-end"
            style={{ top: `${topOverlayOffset}px` }}
          >
            <div className="flex items-center gap-1.5">
              {/* Botão de Retorno de Camada (Região -> Planeta -> Sistema Solar -> Constelação) */}
              {isPlanetEnabled && mapLayerMode === 'region' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPoi(null);
                    setIsRegionsOpen(false);
                    setUserZoom(1.0);
                    setMapLayerMode('planet');
                  }}
                  className="btn-royal-gold cursor-pointer active:scale-95 transition-transform shadow-md"
                  title="Voltar para a Camada 3 (Close no Planeta Girando)"
                >
                  <div className="btn-royal-inner px-3 py-1.5 flex items-center gap-1.5 font-cinzel font-black text-[10px] sm:text-[11px] text-[#fff3c2] uppercase tracking-wider">
                    <span>🌍</span>
                    <span>PLANETA</span>
                  </div>
                </button>
              )}

              {isPlanetEnabled && mapLayerMode === 'planet' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPoi(null);
                    setIsRegionsOpen(false);
                    setUserZoom(1.0);
                    setMapLayerMode('solar');
                  }}
                  className="btn-royal-gold cursor-pointer active:scale-95 transition-transform shadow-md"
                  title="Voltar para a Camada 2 (Sistema Planetário)"
                >
                  <div className="btn-royal-inner px-3 py-1.5 flex items-center gap-1.5 font-cinzel font-black text-[10px] sm:text-[11px] text-[#fff3c2] uppercase tracking-wider">
                    <span>🪐</span>
                    <span>SISTEMA</span>
                  </div>
                </button>
              )}

              {isPlanetEnabled && mapLayerMode === 'solar' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPoi(null);
                    setPausedSolarPlanetId(null);
                    setIsRegionsOpen(false);
                    setUserZoom(1.0);
                    setMapLayerMode('constellation');
                  }}
                  className="btn-royal-gold cursor-pointer active:scale-95 transition-transform shadow-md"
                  title="Voltar para a Camada 1 (Constelações)"
                >
                  <div className="btn-royal-inner px-3 py-1.5 flex items-center gap-1.5 font-cinzel font-black text-[10px] sm:text-[11px] text-[#fff3c2] uppercase tracking-wider">
                    <span>✨</span>
                    <span>CONSTELAÇÃO</span>
                  </div>
                </button>
              )}

              {/* Cápsula Pearl & Gold: REGIÕES ⌄ */}
              <button
                type="button"
                onClick={() => setIsRegionsOpen((prev) => !prev)}
                className="btn-pearl-gold cursor-pointer active:scale-95 transition-transform"
                title="Alternar Camada ou Região do Mapa"
              >
                <div className="btn-pearl-inner px-3.5 py-1.5 flex items-center gap-1.5 font-cinzel font-black text-[10px] sm:text-[11px] text-[#2b1f14] uppercase tracking-wider">
                  <span>REGIÕES</span>
                  <span
                    className={`text-[#8c6518] text-[10px] transition-transform ${
                      isRegionsOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ⌄
                  </span>
                </div>
              </button>

              {/* Botão Discreto Fechar Mapa para voltar ao Lobby quando o Header/Nav do Hub estão ocultos */}
              {isPlayMode && (
                <button
                  type="button"
                  onClick={() => {
                    const battleBtn = document.querySelector<HTMLElement>('[data-tab="battle"]');
                    if (battleBtn) battleBtn.click();
                  }}
                  className="close-btn-outer cursor-pointer"
                  title="Sair do Mapa e voltar ao Hub"
                >
                  <div className="close-btn-inner w-7 h-7 flex items-center justify-center text-xs font-black text-[#2b1f14]">
                    ✕
                  </div>
                </button>
              )}
            </div>

            {/* Popover de Camadas & Regiões quando aberto */}
            {isRegionsOpen && (
              <div
                className="mt-2 w-64 pearl-surface p-2.5 space-y-1.5 z-45"
                style={{
                  borderRadius: '18px',
                  border: '2px solid #c59638',
                  outline: '1.5px solid #4a3006',
                }}
              >
                <div className="flex items-center justify-between border-b border-[#c59638]/50 pb-1 px-1">
                  <span className="font-cinzel font-black text-[10px] text-[#2b1f14] uppercase tracking-wider">
                    ✦ 4 Camadas do Mapa
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsRegionsOpen(false)}
                    className="text-[#8c6518] hover:text-[#2b1f14] font-bold text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Atalhos das Camadas Astrais */}
                {isPlanetEnabled && (
                  <div className="grid grid-cols-3 gap-1 pb-1 border-b border-[#c59638]/40">
                    <button
                      type="button"
                      onClick={() => {
                        setMapLayerMode('constellation');
                        setUserZoom(1.0);
                        setIsRegionsOpen(false);
                      }}
                      className={`px-1.5 py-1 rounded-lg font-cinzel font-black text-[8px] uppercase cursor-pointer ${
                        mapLayerMode === 'constellation'
                          ? 'bg-[#0b3778] text-[#fff3c2] border border-[#e5c168]'
                          : 'pearl-subcard text-[#2b1f14]'
                      }`}
                    >
                      ✨ 1. Constel.
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapLayerMode('solar');
                        setUserZoom(1.0);
                        setIsRegionsOpen(false);
                      }}
                      className={`px-1.5 py-1 rounded-lg font-cinzel font-black text-[8px] uppercase cursor-pointer ${
                        mapLayerMode === 'solar'
                          ? 'bg-[#0b3778] text-[#fff3c2] border border-[#e5c168]'
                          : 'pearl-subcard text-[#2b1f14]'
                      }`}
                    >
                      🪐 2. Sistema
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMapLayerMode('planet');
                        setUserZoom(1.0);
                        setIsRegionsOpen(false);
                      }}
                      className={`px-1.5 py-1 rounded-lg font-cinzel font-black text-[8px] uppercase cursor-pointer ${
                        mapLayerMode === 'planet'
                          ? 'bg-[#0b3778] text-[#fff3c2] border border-[#e5c168]'
                          : 'pearl-subcard text-[#2b1f14]'
                      }`}
                    >
                      🌍 3. Planeta
                    </button>
                  </div>
                )}

                {allMaps.map((wm, idx) => {
                  const isSelected =
                    mapLayerMode === 'region' && (currentMapId || worldMap.id) === wm.id;
                  const poiCount = (wm.pointsOfInterest || []).filter(
                    (p) => !p.isInvisible && p.iconType !== 'invisible_node'
                  ).length;
                  return (
                    <button
                      key={wm.id || `wm-reg-${idx}`}
                      type="button"
                      onClick={() => {
                        setRegionalMapOverride(wm);
                        onSelectWorldMap?.(wm);
                        setMapLayerMode('region');
                        setIsRegionsOpen(false);
                      }}
                      className={`w-full p-1.5 text-left transition-all flex items-center gap-2 cursor-pointer ${
                        isSelected
                          ? 'pearl-subcard border-[#b88928] ring-2 ring-[#d4a84b]'
                          : 'pearl-subcard hover:brightness-95'
                      }`}
                    >
                      <div className="wire-slot w-8 h-8 rounded-lg overflow-hidden shrink-0">
                        {wm.backgroundPng ? (
                          <img
                            src={wm.backgroundPng}
                            alt={wm.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-xs">🗺️</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-cinzel font-black text-[9.5px] text-[#2b1f14] truncate uppercase">
                          {wm.title || `Região ${idx + 1}`}
                        </div>
                        <div className="font-cinzel text-[8px] text-[#8c6518]">
                          📍 {poiCount} locais (Camada 3)
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Haste Vertical Dourada Ornamental com Estrelas ✦ + Botões +, − e RECENTRALIZAR */}
            <div className="relative flex flex-col items-center mr-2 mt-1">
              {/* Linha Vertical Dourada */}
              <div
                className="w-[2px]"
                style={{
                  height: vp.isMobileLandscape ? '8px' : '14px',
                  background: 'linear-gradient(180deg, #fff3c2 0%, #c59638 100%)',
                  boxShadow: '0 0 6px rgba(229, 193, 104, 0.7)',
                }}
              />
              <span className="text-[#fff3c2] text-[9px] leading-none -my-1 drop-shadow-[0_0_6px_rgba(229,193,104,0.95)]">
                ✦
              </span>
              <div
                className="w-[2px]"
                style={{
                  height: vp.isMobileLandscape ? '6px' : '10px',
                  background: 'linear-gradient(180deg, #c59638 0%, #fff3c2 100%)',
                }}
              />

              {/* Botão Circular + (Aumentar Zoom) */}
              <button
                type="button"
                onClick={() =>
                  setUserZoom((z) => Math.min(2.5, parseFloat((z + 0.18).toFixed(2))))
                }
                className="rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform hover:scale-105"
                style={{
                  width: vp.isMobilePortrait || vp.isMobileLandscape ? '34px' : '40px',
                  height: vp.isMobilePortrait || vp.isMobileLandscape ? '34px' : '40px',
                  background:
                    'radial-gradient(circle at 50% 25%, #fcfaf5 0%, #ebe1ce 68%, #d4c09e 100%)',
                  border: '2px solid #c59638',
                  outline: '1.5px solid #4a3006',
                  boxShadow:
                    '0 6px 14px rgba(0, 8, 22, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                }}
                title="Aumentar Zoom (+)"
              >
                <span className="font-cinzel font-black text-base text-[#3a2b1c] leading-none">
                  +
                </span>
              </button>

              {/* Conector Dourado entre + e − */}
              <div
                className="w-[2px]"
                style={{
                  height: vp.isMobileLandscape ? '6px' : '10px',
                  background: '#c59638',
                }}
              />

              {/* Botão Circular − (Diminuir Zoom ou Subir Camada: Região -> Planeta -> Sistema Solar -> Constelação) */}
              <button
                type="button"
                onClick={() => {
                  if (userZoom > 1.05) {
                    setUserZoom((z) => Math.max(1.0, parseFloat((z - 0.18).toFixed(2))));
                  } else if (isPlanetEnabled && mapLayerMode === 'region') {
                    setSelectedPoi(null);
                    setUserZoom(1.0);
                    setMapLayerMode('planet');
                  } else if (isPlanetEnabled && mapLayerMode === 'planet') {
                    setUserZoom(1.0);
                    setMapLayerMode('solar');
                  } else if (isPlanetEnabled && mapLayerMode === 'solar') {
                    setPausedSolarPlanetId(null);
                    setUserZoom(1.0);
                    setMapLayerMode('constellation');
                  } else {
                    setUserZoom((z) => Math.max(0.85, parseFloat((z - 0.18).toFixed(2))));
                  }
                }}
                className="rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform hover:scale-105"
                style={{
                  width: vp.isMobilePortrait || vp.isMobileLandscape ? '34px' : '40px',
                  height: vp.isMobilePortrait || vp.isMobileLandscape ? '34px' : '40px',
                  background:
                    'radial-gradient(circle at 50% 25%, #fcfaf5 0%, #ebe1ce 68%, #d4c09e 100%)',
                  border: '2px solid #c59638',
                  outline: '1.5px solid #4a3006',
                  boxShadow:
                    '0 6px 14px rgba(0, 8, 22, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                }}
                title="Diminuir Zoom / Voltar Camada Anterior (−)"
              >
                <span className="font-cinzel font-black text-base text-[#3a2b1c] leading-none">
                  −
                </span>
              </button>

              {/* Conector Dourado com Estrela ✦ para RECENTRALIZAR */}
              <div
                className="w-[2px]"
                style={{
                  height: vp.isMobileLandscape ? '6px' : '10px',
                  background: '#c59638',
                }}
              />
              <span className="text-[#fff3c2] text-[8px] leading-none -my-1 drop-shadow-[0_0_6px_rgba(229,193,104,0.95)]">
                ✦
              </span>
              <div
                className="w-[2px]"
                style={{
                  height: vp.isMobileLandscape ? '6px' : '10px',
                  background: '#c59638',
                }}
              />

              {/* Botão Circular 🎯 RECENTRALIZAR */}
              <button
                type="button"
                onClick={handleRecenterMap}
                className="rounded-full flex items-center justify-center cursor-pointer active:scale-90 transition-transform hover:scale-105"
                style={{
                  width: vp.isMobilePortrait || vp.isMobileLandscape ? '34px' : '40px',
                  height: vp.isMobilePortrait || vp.isMobileLandscape ? '34px' : '40px',
                  background:
                    'radial-gradient(circle at 50% 25%, #fcfaf5 0%, #ebe1ce 68%, #d4c09e 100%)',
                  border: '2px solid #c59638',
                  outline: '1.5px solid #4a3006',
                  boxShadow:
                    '0 6px 14px rgba(0, 8, 22, 0.7), inset 0 1px 2px rgba(255, 255, 255, 0.95)',
                }}
                title="Recentralizar Câmera e Resetar Zoom (100%)"
              >
                <span className="text-xs leading-none text-[#5c3d08] font-black">🎯</span>
              </button>
              {!vp.isMobileLandscape && (
                <span className="mt-1 px-1.5 py-0.5 rounded bg-black/65 border border-[#c59638]/50 font-cinzel font-black text-[6.5px] text-[#fff3c2] tracking-wider uppercase shadow">
                  RECENTRALIZAR
                </span>
              )}
            </div>
          </div>

          {/* 3. BARRA INFERIOR DO MAPA: LEGENDA ^ (Posicionada sem colisão com a cápsula de destino!) */}
          <div
            className="absolute left-2.5 z-35 pointer-events-auto select-none flex flex-col items-start transition-all duration-200"
            style={{ bottom: `${legendBottomPx}px` }}
          >
            {isLegendOpen && (
              <div
                className="mb-2 w-52 pearl-surface p-2.5 space-y-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150"
                style={{
                  borderRadius: '16px',
                  border: '2px solid #c59638',
                  outline: '1.5px solid #4a3006',
                }}
              >
                <div className="flex items-center justify-between border-b border-[#c59638]/50 pb-1">
                  <span className="font-cinzel font-black text-[9.5px] text-[#2b1f14] uppercase tracking-wider">
                    🗺️ Legenda do Mapa
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsLegendOpen(false)}
                    className="text-[#8c6518] hover:text-[#2b1f14] text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <div className="space-y-1 text-[9px] font-cinzel font-bold text-[#3a2b1c]">
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#0b3778] border border-[#e5c168] text-[#fff3c2] flex items-center justify-center text-[7px]">
                      ✦
                    </span>
                    <span>Local Desbloqueado ({unlockedCount})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-700 border border-emerald-300 text-white flex items-center justify-center text-[7px]">
                      ✓
                    </span>
                    <span>Fase Concluída</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-rose-900 border border-rose-400 text-rose-200 flex items-center justify-center text-[7px]">
                      🔒
                    </span>
                    <span>Região Bloqueada</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3.5 h-1 rounded-full bg-[#e5c168] border border-[#523707]" />
                    <span>Trilha / Rota Imperial</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsLegendOpen((prev) => !prev)}
              className="btn-pearl-gold cursor-pointer active:scale-95 transition-transform"
              title="Mostrar / Ocultar Legenda do Mapa"
            >
              <div
                className="btn-pearl-inner flex items-center gap-1 font-cinzel font-black text-[#2b1f14] uppercase tracking-wider"
                style={{
                  padding: vp.isMobilePortrait ? '4px 9px' : '5px 12px',
                  fontSize: vp.isMobilePortrait ? '8.5px' : '10px',
                }}
              >
                <span>🗺️ LEGENDA</span>
                <span
                  className={`text-[#8c6518] text-[9px] transition-transform ${
                    isLegendOpen ? 'rotate-180' : ''
                  }`}
                >
                  ^
                </span>
              </div>
            </button>
          </div>
        </>
      )}

      {/* =========================================================================
          POP-UP DE MARCADOR DO MAPA / LOCAL — COM LAYOUT DEDICADO POR DISPOSITIVO:
          - Mobile Landscape / Compact Height: Card Horizontal em 2 Colunas (Zero corte vertical!)
          - Mobile Portrait: Card Vertical Compacto que cabe 100% na tela vertical
          - Tablet & Web Desktop: Card Real Equilibrado sem colisão no botão ✕
         ========================================================================= */}
      {selectedPoi &&
        (() => {
          const effectiveCount =
            selectedPoi.rewardSlotCount || selectedPoi.rewardSlots?.length || 10;
          const slots = Array.from({ length: effectiveCount }).map((_, idx) => {
            const slotValue = selectedPoi.rewardSlots?.[idx] ?? '';
            const slotConfig = selectedPoi.rewardSlotConfigs?.find(
              (s) => s.slotIndex === idx
            );
            const isRevealed = slotConfig?.isRevealed ?? false;
            return { idx, slotValue, slotConfig, isRevealed };
          });
          const revealedCount = slots.filter((s) => s.slotValue && s.isRevealed).length;
          const filledCount = slots.filter((s) => !!s.slotValue).length;

          const handleTravelNow = () => {
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
          };

          const useHorizontalSplitLayout =
            vp.isMobileLandscape || (screenHeight < 580 && screenWidth >= 520);

          return (
            <div
              data-poi-interactive="true"
              className="absolute inset-0 z-50 bg-[#020816]/84 backdrop-blur-md flex items-center justify-center p-2.5 animate-in fade-in zoom-in-95 duration-200 pointer-events-auto select-none overflow-y-auto"
              onClick={handleCloseModal}
            >
              {useHorizontalSplitLayout ? (
                /* ===============================================================
                   MODO PAISAGEM / COMPACTO: LAYOUT HORIZONTAL DEDICADO EM 2 COLUNAS
                   =============================================================== */
                <div
                  className="w-full pearl-surface relative p-3.5 flex items-stretch gap-3.5 my-auto"
                  style={{
                    maxWidth: `${Math.min(640, screenWidth - 20)}px`,
                    borderRadius: '22px',
                    border: '2.5px solid #c59638',
                    outline: '1.5px solid #4a3006',
                    boxShadow:
                      '0 20px 48px rgba(0, 8, 22, 0.92), 0 0 28px rgba(212, 175, 83, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="close-btn-outer absolute -top-2.5 -right-2.5 z-40 cursor-pointer"
                    title="Fechar Local"
                  >
                    <div className="close-btn-inner">✕</div>
                  </button>

                  {/* Coluna Esquerda: Ícone do Local + Nome + Nível + Botão Viajar */}
                  <div className="w-[42%] flex flex-col items-center justify-between text-center pr-2 border-r border-[#c59638]/45">
                    <div className="flex flex-col items-center w-full">
                      {selectedPoi.iconPng ? (
                        <img
                          src={selectedPoi.iconPng}
                          alt={selectedPoi.name}
                          className="w-16 h-16 object-contain filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)]"
                        />
                      ) : (
                        <div className="text-5xl leading-none filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.85)] my-1">
                          {selectedPoi.iconEmoji || '🏰'}
                        </div>
                      )}

                      <div
                        className="mt-1.5 px-3 py-1 rounded-full font-cinzel font-black text-[10px] text-[#fff3c2] uppercase tracking-wider text-center leading-tight w-full"
                        style={{
                          background:
                            'linear-gradient(180deg, #0b3778 0%, #062356 58%, #031536 100%)',
                          border: '1.5px solid #e5c168',
                        }}
                      >
                        ✦ {selectedPoi.name} ✦
                      </div>

                      <div className="flex flex-wrap items-center justify-center gap-1 mt-1.5 text-[8.5px] font-cinzel font-black">
                        <span
                          className="px-2 py-0.5 rounded-full text-[#fff3c2]"
                          style={{
                            background: 'linear-gradient(180deg, #0b3778 0%, #041f4a 100%)',
                            border: '1px solid #d4a84b',
                          }}
                        >
                          ⭐ NV. {selectedPoi.recommendedLevel || 1}
                        </span>
                        {selectedPoi.badgeText && (
                          <span className="pearl-pill px-2 py-0.5 text-[#5c3d08] uppercase">
                            {selectedPoi.badgeText}
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-[9.5px] font-semibold text-[#3a2b1c] line-clamp-2 leading-tight">
                        {selectedPoi.description || 'Ponto de partida dos aventureiros.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleTravelNow}
                      className="w-full mt-2 btn-royal-gold cursor-pointer active:scale-98 transition-transform"
                    >
                      <div className="btn-royal-inner py-2 px-3 flex items-center justify-center gap-1.5 font-cinzel font-black text-[11px] text-[#fff3c2] uppercase tracking-wider">
                        <Zap className="w-3.5 h-3.5 text-[#f5d98b] fill-[#f5d98b]" />
                        <span>{selectedPoi.travelButtonText || 'VIAJAR AGORA'}</span>
                      </div>
                    </button>
                  </div>

                  {/* Coluna Direita: Grade de Criaturas & Drops */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div className="flex items-center justify-between text-[9px] font-cinzel font-black text-[#2b1f14] uppercase tracking-wider px-0.5 mb-1">
                      <span className="flex items-center gap-1">
                        <span>👾 Criaturas &amp; Drops</span>
                        <span className="text-[8px] px-1.5 py-0.2 rounded-full bg-[#062356] text-[#f5d98b] border border-[#d4a84b]">
                          {revealedCount}/{filledCount || effectiveCount}
                        </span>
                      </span>
                      <span className="text-[8px] text-[#8c6518] font-bold">
                        {effectiveCount} Slots
                      </span>
                    </div>

                    <div className="grid grid-cols-5 gap-1.5 p-2 pearl-subcard max-h-[165px] overflow-y-auto nova-scroll">
                      {slots.map(({ idx, slotValue, slotConfig, isRevealed }) => {
                        const eventLink =
                          slotConfig?.encounterEventLink ||
                          `https://meujogo.com/evento-encontro-local-${selectedPoi.id}-slot-${idx + 1}`;
                        const isImage =
                          slotValue.startsWith('data:image') || slotValue.startsWith('http');
                        return (
                          <div
                            key={`clash-slot-land-${idx}`}
                            onClick={() => {
                              setActiveEncounterSlot({
                                idx,
                                val: slotValue || '👾',
                                link: eventLink,
                                isRevealed,
                              });
                            }}
                            className={`w-9 h-9 mx-auto rounded-full border-2 flex items-center justify-center text-[9px] font-black transition-all cursor-pointer relative overflow-hidden ${
                              slotValue
                                ? isRevealed
                                  ? 'bg-gradient-to-b from-[#0b3778] to-[#041f4a] border-[#e5c168]'
                                  : 'bg-[#1a1410] border-[#c59638]'
                                : 'bg-[#e6dac6]/80 border-dashed border-[#b88928]/70'
                            }`}
                          >
                            {slotValue ? (
                              isImage ? (
                                <img
                                  src={slotValue}
                                  alt={`Slot ${idx + 1}`}
                                  className={`w-full h-full object-contain p-1 ${
                                    !isRevealed ? 'filter brightness-0 contrast-200 opacity-85' : ''
                                  }`}
                                />
                              ) : (
                                <span className="text-[#fff3c2] text-xs">{slotValue}</span>
                              )
                            ) : (
                              <span className="text-[10px] text-[#8c6518]/65">👾</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* ===============================================================
                   MODO RETRATO (MOBILE / TABLET) & WEB DESKTOP: CARD VERTICAL PROPORCIONAL
                   =============================================================== */
                <div
                  className="w-full flex flex-col items-center relative my-auto px-1.5 py-2"
                  style={{
                    maxWidth: vp.isMobilePortrait
                      ? `${Math.min(350, screenWidth - 16)}px`
                      : '435px',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Topo com Ícone proporcional à altura da tela */}
                  <div className="relative -mb-4 z-20 flex flex-col items-center w-full">
                    <div className="relative flex flex-col items-center max-w-[88%]">
                      <div className="absolute inset-0 rounded-full bg-[#e5c168]/30 blur-2xl pointer-events-none" />

                      {selectedPoi.iconPng ? (
                        <img
                          src={selectedPoi.iconPng}
                          alt={selectedPoi.name}
                          className={`object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] relative z-10 select-none pointer-events-none ${
                            vp.isMobilePortrait ? 'w-20 h-20' : 'w-28 h-28'
                          }`}
                        />
                      ) : (
                        <div
                          className={`filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.9)] relative z-10 select-none leading-none my-1 ${
                            vp.isMobilePortrait ? 'text-5xl' : 'text-6xl'
                          }`}
                        >
                          {selectedPoi.iconEmoji || '🏰'}
                        </div>
                      )}

                      {/* Faixa Royal Sapphire & Gold com largura segura (nunca colide com o botão ✕) */}
                      <div
                        className="px-4 py-1.5 rounded-full font-cinzel font-black text-[#fff3c2] uppercase tracking-[0.1em] text-center leading-tight z-20 -mt-2"
                        style={{
                          fontSize: vp.isMobilePortrait ? '10px' : '12px',
                          background:
                            'linear-gradient(180deg, #0b3778 0%, #062356 58%, #031536 100%)',
                          border: '2px solid #e5c168',
                          outline: '1.5px solid #4a3006',
                          boxShadow:
                            '0 8px 22px rgba(0, 8, 22, 0.9), inset 0 1px 1px rgba(255, 243, 194, 0.5)',
                        }}
                      >
                        ✦ {selectedPoi.name} ✦
                      </div>
                    </div>
                  </div>

                  {/* Moldura Pearl & Gold */}
                  <div
                    className="w-full pearl-surface flex flex-col relative pt-6 pb-3.5 px-3.5 sm:px-4"
                    style={{
                      borderRadius: '24px',
                      border: '2.5px solid #c59638',
                      outline: '1.5px solid #4a3006',
                      boxShadow:
                        '0 24px 60px rgba(0, 8, 22, 0.92), 0 0 32px rgba(212, 175, 83, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.95)',
                    }}
                  >
                    {/* Botão Fechar posicionado no canto superior direito da moldura, longe da faixa de título */}
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="close-btn-outer absolute -top-3 right-1.5 z-40 cursor-pointer"
                      title="Fechar Local"
                    >
                      <div className="close-btn-inner">✕</div>
                    </button>

                    {/* Badges de Nível Recomendado e Estado */}
                    <div className="flex flex-wrap items-center justify-center gap-1.5 text-[9.5px] font-cinzel font-black mb-2 z-10">
                      <span
                        className="px-2.5 py-0.5 rounded-full text-[#fff3c2] shadow-sm flex items-center gap-1"
                        style={{
                          background: 'linear-gradient(180deg, #0b3778 0%, #041f4a 100%)',
                          border: '1.5px solid #d4a84b',
                        }}
                      >
                        ⭐ NV. RECOMENDADO: {selectedPoi.recommendedLevel || 1}
                      </span>

                      {selectedPoi.badgeText && (
                        <span className="pearl-pill px-2.5 py-0.5 text-[#5c3d08] font-cinzel font-black uppercase tracking-wider">
                          {selectedPoi.badgeText}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5 z-10">
                      <div className="p-2 pearl-subcard text-[10.5px] font-semibold text-[#3a2b1c] leading-snug text-center">
                        {selectedPoi.description ||
                          'Território místico repleto de relíquias ancestrais, criaturas elementais e desafios do reino.'}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[9.5px] font-cinzel font-black text-[#2b1f14] uppercase tracking-wider px-1">
                          <span className="flex items-center gap-1.5">
                            <span>👾 Criaturas &amp; Drops da Região</span>
                            <span className="text-[8.5px] px-1.5 py-0.5 rounded-full bg-[#062356] text-[#f5d98b] border border-[#d4a84b]">
                              {revealedCount}/{filledCount || effectiveCount}
                            </span>
                          </span>
                          <span className="text-[8.5px] text-[#8c6518] font-bold">
                            {effectiveCount} Slots
                          </span>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5 p-2 pearl-subcard max-h-[128px] overflow-y-auto nova-scroll">
                          {slots.map(({ idx, slotValue, slotConfig, isRevealed }) => {
                            const eventLink =
                              slotConfig?.encounterEventLink ||
                              `https://meujogo.com/evento-encontro-local-${selectedPoi.id}-slot-${idx + 1}`;
                            const isImage =
                              slotValue.startsWith('data:image') || slotValue.startsWith('http');

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
                                className={`${
                                  vp.isMobilePortrait ? 'w-9 h-9' : 'w-10 h-10'
                                } mx-auto rounded-full border-2 flex items-center justify-center text-[10px] font-black transition-all cursor-pointer relative group overflow-hidden ${
                                  slotValue
                                    ? isRevealed
                                      ? 'bg-gradient-to-b from-[#0b3778] to-[#041f4a] border-[#e5c168] shadow-[0_3px_8px_rgba(0,8,22,0.5)] hover:scale-108'
                                      : 'bg-[#1a1410] border-[#c59638] hover:scale-108'
                                    : 'bg-[#e6dac6]/80 border-dashed border-[#b88928]/70 hover:border-[#8c6518] hover:scale-105'
                                }`}
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
                                            : 'filter drop-shadow-[0_2px_6px_rgba(255,243,194,0.45)]'
                                        }`}
                                      />
                                      {!isRevealed && (
                                        <div className="absolute inset-0 bg-black/35 flex items-center justify-center">
                                          <Lock className="w-3 h-3 text-[#f5d98b] drop-shadow" />
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="truncate max-w-[32px] text-center text-[#fff3c2] text-xs">
                                      {slotValue}
                                    </span>
                                  )
                                ) : (
                                  <span className="text-xs text-[#8c6518]/65">👾</span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleTravelNow}
                        className="w-full btn-royal-gold cursor-pointer active:scale-98 transition-transform"
                      >
                        <div className="btn-royal-inner py-2.5 px-4 flex items-center justify-center gap-2 font-cinzel font-black text-xs sm:text-sm text-[#fff3c2] uppercase tracking-[0.14em]">
                          <Zap className="w-4 h-4 text-[#f5d98b] fill-[#f5d98b]" />
                          <span>{selectedPoi.travelButtonText || 'VIAJAR AGORA'}</span>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

      {/* MODAL DE EVENTO DE ENCONTRO / SCANNER DE SLIMES (NOVA UI v1.2) */}
      {activeEncounterSlot && selectedPoi && (
        <div
          className="fixed inset-0 z-60 bg-[#020816]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveEncounterSlot(null)}
        >
          <div
            className="w-full max-w-[340px] pearl-surface p-5 relative flex flex-col items-center text-center space-y-4 select-none"
            style={{
              borderRadius: '24px',
              border: '3px solid #c59638',
              outline: '2px solid #4a3006',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveEncounterSlot(null)}
              className="close-btn-outer absolute -top-2.5 -right-2.5 cursor-pointer"
            >
              <div className="close-btn-inner">✕</div>
            </button>

            <div className="w-24 h-24 rounded-3xl bg-[#062356] border-2 border-[#e5c168] flex items-center justify-center p-2.5 relative shadow-lg overflow-hidden">
              {activeEncounterSlot.val.startsWith('data:image') ||
              activeEncounterSlot.val.startsWith('http') ? (
                <img
                  src={activeEncounterSlot.val}
                  alt=""
                  className={`w-full h-full object-contain ${
                    !activeEncounterSlot.isRevealed
                      ? 'filter brightness-0 contrast-200 opacity-85'
                      : 'filter drop-shadow-[0_0_12px_rgba(229,193,104,0.8)]'
                  }`}
                />
              ) : (
                <span className="text-4xl">{activeEncounterSlot.val}</span>
              )}
              {!activeEncounterSlot.isRevealed && (
                <div className="absolute inset-0 bg-black/45 flex flex-col items-center justify-center gap-1">
                  <Lock className="w-6 h-6 text-[#f5d98b] drop-shadow-md animate-pulse" />
                  <span className="text-[9px] font-cinzel font-black text-[#fff3c2] uppercase tracking-widest">
                    Silhueta
                  </span>
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-cinzel font-black text-[#2b1f14] uppercase tracking-wider flex items-center justify-center gap-1.5">
                <span>👾</span>
                <span>
                  {activeEncounterSlot.isRevealed
                    ? 'Criatura Descoberta!'
                    : `Criatura Oculta (Slot #${activeEncounterSlot.idx + 1})`}
                </span>
              </h4>
              <p className="text-[11px] font-semibold text-[#5c4b3b] mt-1 leading-snug">
                {activeEncounterSlot.isRevealed
                  ? 'Registrada no seu bestiário desta região.'
                  : 'Escaneie para decifrar a silhueta e revelar o asset da criatura!'}
              </p>
            </div>

            <div className="w-full space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const currentConfigs = [...(selectedPoi.rewardSlotConfigs || [])];
                  const existingIdx = currentConfigs.findIndex(
                    (s) => s.slotIndex === activeEncounterSlot.idx
                  );
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

                  setSelectedPoi({ ...selectedPoi, rewardSlotConfigs: currentConfigs });
                  setActiveEncounterSlot({ ...activeEncounterSlot, isRevealed: nextState });
                }}
                className="w-full btn-royal-gold cursor-pointer"
              >
                <div className="btn-royal-inner py-2.5 px-3 font-cinzel font-black text-[11px] text-[#fff3c2] uppercase flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#f5d98b]" />
                  <span>
                    {activeEncounterSlot.isRevealed
                      ? 'Ocultar Silhueta'
                      : '🔍 Escanear & Revelar'}
                  </span>
                </div>
              </button>
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
