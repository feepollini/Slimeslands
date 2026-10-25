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
    }
    return () => {
      document.body.classList.remove('hub-in-active-phase');
    };
  }, [activePlayingPhase]);

  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 420,
    height: typeof window !== 'undefined' ? window.innerHeight : 780,
  }));

  useEffect(() => {
    const onViewportResize = () => {
      setViewportSize({
        width: window.innerWidth || 420,
        height: window.innerHeight || 780,
      });
    };
    window.addEventListener('resize', onViewportResize);
    window.addEventListener('orientationchange', onViewportResize);
    return () => {
      window.removeEventListener('resize', onViewportResize);
      window.removeEventListener('orientationchange', onViewportResize);
    };
  }, []);

  const fullW = viewportSize.width || dimensions.width;
  const fullH = viewportSize.height || dimensions.height;

  if (activePlayingPhase) {
    const isLandscapeView = fullW > fullH;
    return (
      <div
        key="hub-active-phase-container"
        ref={containerRef}
        className="fixed inset-0 z-[5000] w-screen h-dvh bg-black overflow-hidden select-none m-0 p-0 rounded-none"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          width: '100vw',
          height: '100dvh',
          margin: 0,
          padding: 0,
        }}
      >
        <PortraitEmulator
          project={activePlayingPhase}
          setProject={handleUpdateProject}
          onUpdateProject={(updates) => {
            handleUpdateProject((prev) => ({ ...prev, ...updates }));
          }}
          activeMarkerId={selectedMarkerId}
          selectedMarkerId={selectedMarkerId}
          onSelectMarker={setSelectedMarkerId}
          isPlayMode={true}
          playWidth={fullW}
          playHeight={fullH}
          orientation={isLandscapeView ? 'landscape' : 'portrait'}
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
      key="hub-world-map-container"
      ref={containerRef}
      className="fixed inset-0 w-screen h-dvh bg-black overflow-hidden select-none m-0 p-0 rounded-none"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        margin: 0,
        padding: 0,
      }}
    >
      <WorldMapEmulatorView
        project={activeMapProject}
        savedLevels={savedLevels}
        screenWidth={fullW}
        screenHeight={fullH}
        isPlayMode={true}
        availableMaps={availableMaps}
        currentMapId={currentMapConfig.id}
        onSelectWorldMap={handleSelectWorldMap}
        onLoadLevel={(level) => {
          handleEnterLevel(level);
        }}
      />
    </div>
  );
};

