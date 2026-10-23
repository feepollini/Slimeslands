import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { MapProject, SavedLevel, WorldMapConfig } from '../../marker_dream/src/types/map';
import {
  loadProject,
  saveProject,
  loadLevelsGallery,
  loadSingleLevelSlot,
} from '../../marker_dream/src/utils/storage';
import {
  createFaseMestraProject,
  createFaseMestraSavedLevel,
} from '../../marker_dream/src/data/masterTestPhase';
import { getOrCreateWorldMapConfig } from '../../marker_dream/src/components/workspace/WorldMapCanvasEditor';
import { WorldMapEmulatorView } from '../../marker_dream/src/components/workspace/WorldMapEmulatorView';
import { PortraitEmulator } from '../../marker_dream/src/components/PortraitEmulator';
import { getMergedGameTemplates } from './forge_v2/utils/HestridiaMatrixRenderer';
import { CARD_TEMPLATES } from '../../core/constants';
import { Map as MapIcon, ChevronLeft, ChevronRight, Compass, Check } from 'lucide-react';

export const HubWorldMapGameView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: window.innerWidth || 420,
    height: window.innerHeight - 90 || 667,
  });

  // Estado inicial com Fase Mestra, hidratado imediatamente do IndexedDB da Marker Dream
  const [project, setProject] = useState<MapProject>(() => createFaseMestraProject());
  const [savedLevels, setSavedLevels] = useState<SavedLevel[]>(() => [
    createFaseMestraSavedLevel(),
  ]);
  const [selectedMapId, setSelectedMapId] = useState<string>('map-main-default');

  // Hidratação assíncrona real do banco de dados da Engine Marker Dream (IndexedDB + AssetPool)
  useEffect(() => {
    let mounted = true;
    getMergedGameTemplates(CARD_TEMPLATES).catch(() => {});

    (async () => {
      try {
        const [loadedProj, loadedGallery] = await Promise.all([
          loadProject(),
          loadLevelsGallery(),
        ]);

        if (!mounted) return;

        if (loadedGallery && loadedGallery.length > 0) {
          setSavedLevels(loadedGallery);
        }

        if (loadedProj) {
          setProject(loadedProj);
          const activeWm = getOrCreateWorldMapConfig(loadedProj);
          setSelectedMapId(
            loadedProj.activeWorldMapId || activeWm.id || 'map-main-default'
          );
        } else if (loadedGallery && loadedGallery.length > 0 && loadedGallery[0].projectData) {
          const fallbackProj = loadedGallery[0].projectData;
          setProject(fallbackProj);
          const activeWm = getOrCreateWorldMapConfig(fallbackProj);
          setSelectedMapId(
            fallbackProj.activeWorldMapId || activeWm.id || 'map-main-default'
          );
        }
      } catch (err) {
        console.warn('Erro ao hidratar mapas e fases da Marker Dream:', err);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  // Lista unificada de Mapas criados no Editor de Mapas da Marker Dream
  const availableMaps = useMemo<WorldMapConfig[]>(() => {
    const mapById = new Map<string, WorldMapConfig>();
    const activeWorldMap = getOrCreateWorldMapConfig(project);

    if (project.savedWorldMaps && project.savedWorldMaps.length > 0) {
      for (const wm of project.savedWorldMaps) {
        if (wm && wm.id) {
          mapById.set(wm.id, wm);
        }
      }
    }

    if (activeWorldMap && activeWorldMap.id) {
      mapById.set(activeWorldMap.id, activeWorldMap);
    }

    // Também verifica se existem mapas salvos dentro da galeria de fases
    for (const lvl of savedLevels) {
      const lvlProj = lvl.projectData || (lvl as any).project;
      if (lvlProj?.savedWorldMaps) {
        for (const wm of lvlProj.savedWorldMaps) {
          if (wm && wm.id && !mapById.has(wm.id)) {
            mapById.set(wm.id, wm);
          }
        }
      }
      if (lvlProj?.worldMap?.id && !mapById.has(lvlProj.worldMap.id)) {
        mapById.set(lvlProj.worldMap.id, getOrCreateWorldMapConfig(lvlProj));
      }
    }

    return Array.from(mapById.values());
  }, [project, savedLevels]);

  // Estado discreto do seletor lateral de mapas (recolhido por padrão para deixar o mapa 100% limpo)
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);

  // Quando o jogador clica em "VIAJAR AGORA" em um pino do mapa, entra na Fase jogável (Resultado do Emulador)
  const [activePlayingPhase, setActivePlayingPhase] = useState<MapProject | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

  // Mede o container real da tela de Mapa no Hub
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 80 && rect.height > 80) {
          setDimensions({
            width: Math.round(rect.width),
            height: Math.round(rect.height),
          });
        }
      }
    };
    updateSize();
    const ro = new ResizeObserver(updateSize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Sincroniza alterações do projeto na unidade de memória da Engine
  const handleUpdateProject: React.Dispatch<React.SetStateAction<MapProject>> = (updater) => {
    setProject((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveProject(next).catch(() => {});
      return next;
    });
    if (activePlayingPhase) {
      setActivePlayingPhase((prevPhase) => {
        if (!prevPhase) return prevPhase;
        const nextPhase = typeof updater === 'function' ? updater(prevPhase) : updater;
        saveProject(nextPhase).catch(() => {});
        return nextPhase;
      });
    }
  };

  // Troca de mapa no seletor discreto lateral
  const handleSelectWorldMap = (wm: WorldMapConfig) => {
    setSelectedMapId(wm.id);
    setProject((prev) => {
      const next: MapProject = {
        ...prev,
        worldMap: wm,
        activeWorldMapId: wm.id,
      };
      saveProject(next).catch(() => {});
      return next;
    });
    setIsSelectorOpen(false);
  };

  // Hidrata uma fase (inclusive se estiver em Cold Stub) e entra no modo de jogo
  const handleEnterLevel = async (level: SavedLevel) => {
    if (level?.id && level.isColdStub) {
      const fullSlot = await loadSingleLevelSlot(level.id);
      if (fullSlot?.projectData) {
        setActivePlayingPhase(fullSlot.projectData);
        return;
      }
    }
    const targetProj = level?.projectData || (level as any)?.project;
    if (targetProj) {
      setActivePlayingPhase(targetProj);
    } else {
      setActivePlayingPhase(activeMapProject);
    }
  };

  // Projeto com o mapa atualmente selecionado aplicado
  const activeMapProject = useMemo<MapProject>(() => {
    const chosen = availableMaps.find((m) => m.id === selectedMapId) || availableMaps[0];
    if (!chosen) return project;
    return {
      ...project,
      worldMap: chosen,
      activeWorldMapId: chosen.id,
    };
  }, [project, availableMaps, selectedMapId]);

  const currentMapConfig = getOrCreateWorldMapConfig(activeMapProject);

  // Se o jogador viajou para uma Fase a partir de um pino do mapa, renderiza o resultado puro da Fase
  if (activePlayingPhase) {
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full bg-slate-950 overflow-hidden select-none"
      >
        <PortraitEmulator
          project={activePlayingPhase}
          setProject={handleUpdateProject}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={setSelectedMarkerId}
          isPlayMode={true}
          savedLevels={savedLevels}
          onLoadLevel={(lvl) => {
            handleEnterLevel(lvl);
          }}
        />

        {/* Botão Discreto estilo Game para voltar ao Mapa Mundi */}
        <button
          type="button"
          onClick={() => setActivePlayingPhase(null)}
          className="absolute top-3 left-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-amber-400/50 text-amber-200 text-[11px] font-black uppercase tracking-wider shadow-[0_4px_14px_rgba(0,0,0,0.75)] active:scale-95 transition-all cursor-pointer"
          title="Voltar ao Mapa"
        >
          <Compass className="w-3.5 h-3.5 text-amber-400" />
          <span>Mapa</span>
        </button>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none"
    >
      {/* SAÍDA REAL DO MAPA CRIADO NO EDITOR DE MAPAS DA MARKER DREAM */}
      <WorldMapEmulatorView
        project={activeMapProject}
        savedLevels={savedLevels}
        screenWidth={dimensions.width}
        screenHeight={dimensions.height}
        isPlayMode={true}
        onLoadLevel={(level) => {
          handleEnterLevel(level);
        }}
      />

      {/* SELETOR DISCRETO AO ESTILO GAME AO LADO (DIREITA) */}
      <div className="absolute top-14 right-2.5 z-40 flex items-start gap-1.5">
        {/* Aba/Botão Discreto para abrir/fechar o Seletor de Mapas */}
        <button
          type="button"
          onClick={() => setIsSelectorOpen((prev) => !prev)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-black/75 hover:bg-black/90 backdrop-blur-md border border-amber-400/45 text-amber-200 shadow-[0_4px_14px_rgba(0,0,0,0.75)] transition-all cursor-pointer active:scale-95"
          title="Alternar Região / Mapa"
        >
          <MapIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider max-w-[110px] truncate">
            {currentMapConfig.title || 'Mapa'}
          </span>
          {availableMaps.length > 1 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/25 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300">
              {availableMaps.length}
            </span>
          )}
          {isSelectorOpen ? (
            <ChevronRight className="w-3 h-3 text-amber-300/80" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-amber-300/80" />
          )}
        </button>

        {/* Painel Discreto de Seleção dos Mapas Criados no Editor */}
        {isSelectorOpen && (
          <div className="w-56 max-h-[68vh] flex flex-col rounded-2xl bg-slate-950/92 backdrop-blur-xl border border-amber-500/45 shadow-[0_12px_32px_rgba(0,0,0,0.9)] overflow-hidden animate-in fade-in slide-in-from-right-3 duration-150">
            <div className="px-3 py-2 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 to-transparent flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                <Compass className="w-3 h-3 text-amber-400" />
                <span>Regiões do Mundo</span>
              </span>
              <span className="text-[9px] font-mono text-amber-200/70">
                {availableMaps.length} {availableMaps.length === 1 ? 'mapa' : 'mapas'}
              </span>
            </div>

            <div className="p-2 space-y-1.5 overflow-y-auto">
              {availableMaps.map((wm, idx) => {
                const isSelected = wm.id === currentMapConfig.id;
                const poiCount = (wm.pointsOfInterest || []).filter(
                  (p) => !p.isInvisible && p.iconType !== 'invisible_node'
                ).length;

                return (
                  <button
                    key={wm.id || `wm-${idx}`}
                    type="button"
                    onClick={() => handleSelectWorldMap(wm)}
                    className={`w-full p-1.5 rounded-xl border text-left transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500/25 to-emerald-500/15 border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/15 bg-slate-900 shrink-0 relative">
                      {wm.backgroundPng ? (
                        <img
                          src={wm.backgroundPng}
                          alt={wm.title || `Mapa ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-sm">
                          🗺️
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-black text-white truncate">
                        {wm.title || `Mapa ${idx + 1}`}
                      </div>
                      <div className="text-[9px] font-mono text-amber-300/80 flex items-center gap-1.5">
                        <span>📍 {poiCount} locais</span>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
