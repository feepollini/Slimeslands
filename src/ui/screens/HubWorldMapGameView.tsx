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
import { OrnateWindow } from '../nova_ui_v1.2/src/components/OrnateWindowFrame';

export const HubWorldMapGameView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: window.innerWidth || 420,
    height: window.innerHeight - 90 || 667,
  });

  const [project, setProject] = useState<MapProject>(() => createFaseMestraProject());
  const [savedLevels, setSavedLevels] = useState<SavedLevel[]>(() => [
    createFaseMestraSavedLevel(),
  ]);
  const [selectedMapId, setSelectedMapId] = useState<string>('map-main-default');

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

  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [activePlayingPhase, setActivePlayingPhase] = useState<MapProject | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);

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

  useEffect(() => {
    if (activePlayingPhase) {
      document.body.classList.add('hub-in-active-phase');
    } else {
      document.body.classList.remove('hub-in-active-phase');
    }
    return () => {
      document.body.classList.remove('hub-in-active-phase');
    };
  }, [activePlayingPhase]);

  if (activePlayingPhase) {
    return (
      <div
        ref={containerRef}
        className="relative w-full h-full bg-[#060b19] overflow-hidden select-none"
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
          onExitToWorldMap={() => setActivePlayingPhase(null)}
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-[#060b19] overflow-hidden select-none"
    >
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

      {/* Seletor de Regiões do Mapa com estética Nova UI v1.2 Pearl & Gold */}
      <div className="absolute top-14 right-3 z-40 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => setIsSelectorOpen((prev) => !prev)}
          className="pearl-pill px-3 py-1.5 flex items-center gap-1.5 shadow-lg cursor-pointer active:scale-95 transition-all"
          title="Alternar Região / Mapa"
        >
          <MapIcon className="w-3.5 h-3.5 text-[#8c6518] shrink-0" />
          <span className="font-cinzel font-bold text-[10px] text-[#2b1f14] uppercase tracking-wider max-w-[120px] truncate">
            {currentMapConfig.title || 'Mapa Imperial'}
          </span>
          {availableMaps.length > 1 && (
            <span className="px-1.5 py-0.2 rounded-full bg-[#062356] border border-[#d4a84b] font-cinzel font-bold text-[8px] text-[#f5d98b]">
              {availableMaps.length}
            </span>
          )}
          {isSelectorOpen ? (
            <ChevronRight className="w-3 h-3 text-[#8c6518]" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-[#8c6518]" />
          )}
        </button>

        {isSelectorOpen && (
          <div className="w-64">
            <OrnateWindow
              title="REGIÕES"
              compactHeader
              showClose
              onClose={() => setIsSelectorOpen(false)}
              bodyClass="px-3 pt-7 pb-4 space-y-1.5 max-h-[60vh] overflow-y-auto custom-scrollbar"
            >
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
                    className={`w-full p-2 text-left transition-all flex items-center gap-2 cursor-pointer ${
                      isSelected
                        ? 'pearl-subcard border-[#b88928] ring-2 ring-[#d4a84b]'
                        : 'pearl-subcard hover:brightness-95'
                    }`}
                  >
                    <div className="wire-slot w-10 h-10 rounded-lg overflow-hidden shrink-0">
                      {wm.backgroundPng ? (
                        <img
                          src={wm.backgroundPng}
                          alt={wm.title || `Mapa ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>🗺️</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-cinzel font-bold text-[10px] text-[#2b1f14] truncate uppercase">
                        {wm.title || `Mapa ${idx + 1}`}
                      </div>
                      <div className="font-cinzel text-[8px] text-[#8c6518]">
                        📍 {poiCount} locais
                      </div>
                    </div>

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-[#062356] border border-[#d4a84b] text-[#f5d98b] flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </OrnateWindow>
          </div>
        )}
      </div>
    </div>
  );
};
