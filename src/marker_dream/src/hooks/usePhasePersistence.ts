import { useState, useEffect, useRef, useCallback } from 'react';
import type { MapProject, SavedLevel, MarkerMotionLayer } from '../types/map';
import { DEFAULT_PROJECT } from '../data/defaultMap';
import {
  FASE_MESTRA_ID,
  FASE_MESTRA_EXTENDED_ID,
  createFaseMestraProject,
  createFaseMestraSavedLevel,
  createFaseMestraExtendedSavedLevel,
} from '../data/masterTestPhase';
import { createStandaloneInterceptTestLevel } from '../utils/interceptTestPhaseGenerator';
import { COLLISION_CELL, migrateCollisionCells, splitMixedProject } from '../utils/mapMath';
import {
  saveProject,
  loadProject,
  saveLevelsGallery,
  saveSingleLevelSlot,
  deleteSingleLevelSlot,
  computeLevelStats,
  createColdLevelStub,
  loadSingleLevelSlot,
  loadLevelsGallery,
  tryRecoverFromOldLocalStorage,
  saveProjectSafetyBackup,
} from '../utils/storage';
import {
  sanitizeProjectAssets,
  consolidateMotionCanvasInProject,
  getPhaseMatrixSummary,
} from '../utils/phaseStorageEngine';
import { internProjectAssets, cloneProjectLightweight } from '../utils/assetRegistry';

interface UsePhasePersistenceOptions {
  getMotionCanvasLayers?: () => MarkerMotionLayer[];
  getTargetMarkerId?: () => string | null;
  getIsPrimordialJelly?: () => boolean;
  onResetSelection?: () => void;
  onSelectTab?: (tab: any) => void;
}

function dedupeLevelsById(list: SavedLevel[]): SavedLevel[] {
  const seen = new Set<string>();
  const out: SavedLevel[] = [];
  for (const lvl of list) {
    if (!lvl?.id || seen.has(lvl.id)) continue;
    seen.add(lvl.id);
    out.push(lvl);
  }
  return out;
}

export function usePhasePersistence(options: UsePhasePersistenceOptions = {}) {
  const [project, setProject] = useState<MapProject>(() => createFaseMestraProject());
  const [savedLevels, setSavedLevelsRaw] = useState<SavedLevel[]>([]);
  const [activeLevelId, setActiveLevelId] = useState<string | null>(null);
  const [closingLevel, setClosingLevel] = useState<SavedLevel | null>(null);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);
  const [isSavingLevel, setIsSavingLevel] = useState<boolean>(false);
  const [justSaved, setJustSaved] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveAsNewModalOpen, setSaveAsNewModalOpen] = useState<boolean>(false);

  const isSavingLevelRef = useRef<boolean>(false);

  // Refs de espelhamento contínuo para auto-save de 5 minutos e sincronização segura
  const projectRef = useRef<MapProject>(project);
  projectRef.current = project;
  const savedLevelsRef = useRef<SavedLevel[]>(savedLevels);
  savedLevelsRef.current = savedLevels;
  const activeLevelIdRef = useRef<string | null>(activeLevelId);
  activeLevelIdRef.current = activeLevelId;

  const setSavedLevels = useCallback(
    (updater: SavedLevel[] | ((prev: SavedLevel[]) => SavedLevel[])) => {
      setSavedLevelsRaw((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const deduped = dedupeLevelsById(next);
        savedLevelsRef.current = deduped;
        return deduped;
      });
    },
    []
  );

  // Histórico de alterações (Desfazer / Refazer)
  const undoStackRef = useRef<MapProject[]>([]);
  const redoStackRef = useRef<MapProject[]>([]);
  const isHistoryActionRef = useRef<boolean>(false);
  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  // Notificações Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg((curr) => (curr === msg ? null : curr)), 2200);
  }, []);

  const pushHistory = useCallback((projToSave: MapProject) => {
    if (isHistoryActionRef.current) return;
    undoStackRef.current.push(cloneProjectLightweight(projToSave));
    if (undoStackRef.current.length > 20) undoStackRef.current.shift();
    redoStackRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStackRef.current.length === 0) {
      showToast('Nada para desfazer');
      return;
    }
    const prevProj = undoStackRef.current.pop()!;
    redoStackRef.current.push(cloneProjectLightweight(projectRef.current));
    if (redoStackRef.current.length > 20) redoStackRef.current.shift();

    isHistoryActionRef.current = true;
    setProject(prevProj);
    projectRef.current = prevProj;
    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 50);

    setCanUndo(undoStackRef.current.length > 0);
    setCanRedo(true);
    showToast('Desfeito (Ctrl+Z)');
  }, [showToast]);

  const handleRedo = useCallback(() => {
    if (redoStackRef.current.length === 0) {
      showToast('Nada para refazer');
      return;
    }
    const nextProj = redoStackRef.current.pop()!;
    undoStackRef.current.push(cloneProjectLightweight(projectRef.current));
    if (undoStackRef.current.length > 20) undoStackRef.current.shift();

    isHistoryActionRef.current = true;
    setProject(nextProj);
    projectRef.current = nextProj;
    setTimeout(() => {
      isHistoryActionRef.current = false;
    }, 50);

    setCanUndo(true);
    setCanRedo(redoStackRef.current.length > 0);
    showToast('Refeito (Ctrl+Y)');
  }, [showToast]);

  // Migra o formato do grid de colisão
  const migrateProjectGrid = (proj: MapProject): MapProject => {
    const from = proj.collisionGrid ?? 128;
    if (from === COLLISION_CELL) return proj;
    return {
      ...proj,
      collisionGrid: COLLISION_CELL,
      walkableCells: migrateCollisionCells(proj.walkableCells, from),
      blockedCells: migrateCollisionCells(proj.blockedCells, from),
      subBiomes: (proj.subBiomes || []).map((sb) => ({
        ...sb,
        walkableCells: migrateCollisionCells(sb.walkableCells, from),
        blockedCells: migrateCollisionCells(sb.blockedCells, from),
      })),
    };
  };

  const isInitialLoadDoneRef = useRef(false);

  // Carrega com segurança absoluta do IndexedDB e de qualquer backup existente
  useEffect(() => {
    Promise.all([loadLevelsGallery(), loadProject()]).then(([levels, saved]) => {
      const oldLocal = tryRecoverFromOldLocalStorage();
      const projectToUse =
        saved &&
        ((saved.biomes || []).length > 0 ||
          (saved.subBiomes || []).length > 0 ||
          (saved.markers || []).length > 0)
          ? saved
          : oldLocal &&
            ((oldLocal.biomes || []).length > 0 ||
              (oldLocal.subBiomes || []).length > 0 ||
              (oldLocal.markers || []).length > 0)
          ? oldLocal
          : saved;

      const gridMigrated = (levels || []).map((lvl) => {
        const migratedData = internProjectAssets(migrateProjectGrid(lvl.projectData));
        return {
          ...lvl,
          projectData: migratedData,
          stats: lvl.stats || computeLevelStats(migratedData),
        };
      });

      const freshMasterLevel = createFaseMestraSavedLevel();
      const freshExtendedMasterLevel = createFaseMestraExtendedSavedLevel();

      let split: SavedLevel[] = [];
      for (const lvl of gridMigrated) {
        if (lvl.id === FASE_MESTRA_ID) {
          split.push(freshMasterLevel);
          continue;
        }
        if (lvl.id === FASE_MESTRA_EXTENDED_ID) {
          split.push(freshExtendedMasterLevel);
          continue;
        }
        const sp = splitMixedProject(lvl.projectData, lvl.id);
        split.push({
          ...lvl,
          projectData: sp.vertical,
          stats: computeLevelStats(sp.vertical),
        });
        if (sp.extended && sp.extendedLevelId) {
          split.push({
            id: sp.extendedLevelId,
            name: `${lvl.name} 💜`,
            description: 'Tela extended separada',
            createdAt: lvl.createdAt,
            updatedAt: new Date().toISOString(),
            projectData: sp.extended,
            stats: computeLevelStats(sp.extended),
          });
        }
      }

      if (
        projectToUse &&
        projectToUse.id !== FASE_MESTRA_ID &&
        projectToUse.id !== FASE_MESTRA_EXTENDED_ID &&
        ((projectToUse.biomes || []).length > 0 ||
          (projectToUse.subBiomes || []).length > 0 ||
          (projectToUse.markers || []).length > 0)
      ) {
        const pKind =
          projectToUse.canvasKind ||
          ((projectToUse.subBiomes || []).length > 0 ? 'extended' : 'vertical');
        const projTitle =
          projectToUse.title ||
          (pKind === 'extended' ? 'Minha Fase Extended' : 'Minha Fase');
        const alreadyExists = split.some(
          (l) => l.name === projTitle || l.id === projectToUse.id || l.projectData?.id === projectToUse.id
        );
        if (!alreadyExists) {
          const clonedData = cloneProjectLightweight(projectToUse);
          const autoLevel: SavedLevel = {
            id: projectToUse.id || `level-auto-${Date.now()}`,
            name: projTitle,
            description: 'Fase recuperada da sessão ativa',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            projectData: clonedData,
            stats: computeLevelStats(clonedData),
          };
          split = [autoLevel, ...split];
        }
      }

      // Garante que a Fase Mestra Extended (NPCs, Quests & Coleta) sempre exista na Galeria de Telas
      const hasExtendedMaster = split.some((l) => l.id === FASE_MESTRA_EXTENDED_ID);
      if (!hasExtendedMaster) {
        split = [freshExtendedMasterLevel, ...split];
      }
      saveSingleLevelSlot(freshExtendedMasterLevel).catch(() => {});

      // Garante que a Fase Mestra (100% Completa) sempre exista e esteja atualizada na Galeria de Fases para teste
      const hasFaseMestra = split.some((l) => l.id === FASE_MESTRA_ID);
      if (!hasFaseMestra) {
        split = [freshMasterLevel, ...split];
      }
      saveSingleLevelSlot(freshMasterLevel).catch(() => {});

      // Garante que a Fase Teste de Interceptação & Escolta sempre exista na Galeria de Fases
      const freshInterceptTestLevel = createStandaloneInterceptTestLevel();
      const existingInterceptIdx = split.findIndex((l) => l.id === freshInterceptTestLevel.id);
      if (existingInterceptIdx >= 0) {
        split[existingInterceptIdx] = freshInterceptTestLevel;
      } else {
        split = [freshInterceptTestLevel, ...split];
      }
      saveSingleLevelSlot(freshInterceptTestLevel).catch(() => {});

      split = dedupeLevelsById(split);
      setSavedLevels(split);

      const savedActiveId =
        typeof window !== 'undefined'
          ? localStorage.getItem('tilescroll_active_level_id')
          : null;
      let activeFound = savedActiveId
        ? split.find((l) => l.id === savedActiveId)
        : null;
      if (!activeFound && split.length > 0) {
        activeFound =
          split.find((l) => l.id === FASE_MESTRA_ID) ||
          split.find((l) => !l.closedInTabs) ||
          split[0];
      }

      if (activeFound) {
        setActiveLevelId(activeFound.id);
        const data = cloneProjectLightweight(activeFound.projectData);
        if (!data.canvasKind)
          data.canvasKind =
            (data.subBiomes || []).length > 0 && (!data.biomes || data.biomes.length === 0)
              ? 'extended'
              : 'vertical';
        setProject(data);
      } else if (projectToUse) {
        const finalProj = internProjectAssets(migrateProjectGrid(projectToUse));
        if (!finalProj.canvasKind)
          finalProj.canvasKind =
            (finalProj.subBiomes || []).length > 0 && (!finalProj.biomes || finalProj.biomes.length === 0)
              ? 'extended'
              : 'vertical';
        setProject(finalProj);
      } else {
        setProject(createFaseMestraProject());
      }

      setTimeout(() => {
        isInitialLoadDoneRef.current = true;
        setHasUnsavedChanges(false);
      }, 350);
    });
  }, []);

  // Auto-sync contínuo da Fase Ativa com debounce seguro e gravação exclusiva do slot ativo (sem re-serializar todas as fases!)
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;

    setHasUnsavedChanges(true);

    const timer = setTimeout(() => {
      const curProj = internProjectAssets(projectRef.current);
      const curActiveId = activeLevelIdRef.current;

      saveProject(curProj);
      saveProjectSafetyBackup(curProj);

      if (!curActiveId) return;

      setSavedLevels((prevLevels) => {
        const idx = prevLevels.findIndex((l) => l.id === curActiveId);
        if (idx < 0) return prevLevels;
        const current = prevLevels[idx];

        const updated: SavedLevel = {
          ...current,
          name: curProj.title || current.name,
          updatedAt: new Date().toISOString(),
          projectData: curProj,
          stats: computeLevelStats(curProj),
        };

        const copy = [...prevLevels];
        copy[idx] = updated;

        // Salva SOMENTE o slot desta fase + manifesto leve no IndexedDB
        saveSingleLevelSlot(updated, copy);
        return copy;
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [project, activeLevelId]);

  // Função central de salvar fase
  const handleSaveCurrentAsLevel = useCallback(async (
    name?: string,
    description?: string,
    optionsSave?: { asNew?: boolean; isAutoSave?: boolean }
  ) => {
    if (isSavingLevelRef.current) return;
    isSavingLevelRef.current = true;
    setIsSavingLevel(true);

    const cleanName = typeof name === 'string' ? name : undefined;
    const cleanDescription = typeof description === 'string' ? description : undefined;
    const safeOptionsSave =
      optionsSave && typeof optionsSave === 'object' && !(typeof Event !== 'undefined' && optionsSave instanceof Event)
        ? optionsSave
        : undefined;

    const forceAsNew = safeOptionsSave?.asNew ?? false;
    const isAutoSave = safeOptionsSave?.isAutoSave ?? false;

    try {
      let consolidated = cloneProjectLightweight(projectRef.current);

      const currentMotionLayers = options.getMotionCanvasLayers?.();
      const targetMarkerId = options.getTargetMarkerId?.();
      if (currentMotionLayers && currentMotionLayers.length > 0 && targetMarkerId) {
        const res = await consolidateMotionCanvasInProject(
          consolidated,
          currentMotionLayers,
          targetMarkerId,
          !!options.getIsPrimordialJelly?.()
        );
        consolidated = res.updatedProject;
      }

      consolidated = await sanitizeProjectAssets(consolidated);

      const curLevels = savedLevelsRef.current;
      const curActiveId = activeLevelIdRef.current;
      const existingLevel = curLevels.find((l) => l.id === curActiveId);

      const levelName =
        cleanName?.trim() ||
        consolidated.title ||
        existingLevel?.name ||
        `Fase ${curLevels.length + 1}`;

      consolidated.title = levelName;
      const nowIso = new Date().toISOString();

      setProject(consolidated);
      projectRef.current = consolidated;

      let updatedLevels: SavedLevel[] = [];
      let finalActiveId = curActiveId;
      let savedEntry: SavedLevel;

      const existingIndex = curLevels.findIndex((l) => l.id === curActiveId);

      if (!forceAsNew && existingIndex >= 0 && curActiveId) {
        const currentLvl = curLevels[existingIndex];
        savedEntry = {
          ...currentLvl,
          name: cleanName?.trim() || currentLvl.name || levelName,
          description: cleanDescription || currentLvl.description || 'Fase criada no editor',
          updatedAt: nowIso,
          closedInTabs: false,
          projectData: cloneProjectLightweight(consolidated),
          stats: computeLevelStats(consolidated),
        };
        updatedLevels = [...curLevels];
        updatedLevels[existingIndex] = savedEntry;
        finalActiveId = curActiveId;
      } else {
        finalActiveId = `level-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
        consolidated.id = `project-${Date.now()}`;
        savedEntry = {
          id: finalActiveId,
          name: levelName,
          description: cleanDescription || 'Fase criada no editor',
          createdAt: nowIso,
          updatedAt: nowIso,
          closedInTabs: false,
          projectData: cloneProjectLightweight(consolidated),
          stats: computeLevelStats(consolidated),
        };
        updatedLevels = [savedEntry, ...curLevels];
        setActiveLevelId(finalActiveId);
        activeLevelIdRef.current = finalActiveId;
      }

      setSavedLevels(updatedLevels);
      savedLevelsRef.current = updatedLevels;
      if (typeof window !== 'undefined' && finalActiveId) {
        localStorage.setItem('tilescroll_active_level_id', finalActiveId);
      }

      await Promise.all([
        saveProject(consolidated),
        saveProjectSafetyBackup(consolidated),
        saveSingleLevelSlot(savedEntry, updatedLevels),
      ]);

      setHasUnsavedChanges(false);
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 2600);

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSavedTimestamp(timeStr);

      const matrixStats = getPhaseMatrixSummary(consolidated);
      if (isAutoSave) {
        showToast(`⏱️ Auto-save: "${levelName}" sincronizado às ${timeStr}`);
      } else {
        showToast(
          `💾 Matriz da Fase "${levelName}" salva com precisão absoluta! (${matrixStats.markersCount} marcadores, ${matrixStats.biomesCount + matrixStats.subBiomesCount} cenários, ${timeStr})`
        );
      }
    } catch (err) {
      console.error('Erro ao salvar fase:', err);
      showToast('⚠️ Erro ao salvar fase. Tente novamente.');
    } finally {
      setIsSavingLevel(false);
      isSavingLevelRef.current = false;
    }
  }, [options, showToast]);

  // Auto-save a cada 5 minutos
  useEffect(() => {
    if (!isInitialLoadDoneRef.current) return;
    const AUTO_SAVE_INTERVAL_MS = 5 * 60 * 1000;
    const interval = setInterval(() => {
      handleSaveCurrentAsLevel(undefined, undefined, { isAutoSave: true });
    }, AUTO_SAVE_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [handleSaveCurrentAsLevel]);

  const handleUpdateSavedLevel = useCallback((levelId: string, updates: Partial<SavedLevel>) => {
    setSavedLevels((prev) => {
      const next = prev.map((lvl) =>
        lvl.id === levelId ? { ...lvl, ...updates, updatedAt: new Date().toISOString() } : lvl
      );
      const updatedLvl = next.find((l) => l.id === levelId);
      if (updatedLvl) {
        saveSingleLevelSlot(updatedLvl, next);
      }
      return next;
    });
  }, []);

  const handleOverwriteSavedLevel = useCallback((levelId: string) => {
    if (levelId === activeLevelIdRef.current) {
      handleSaveCurrentAsLevel();
    } else {
      const target = savedLevelsRef.current.find((l) => l.id === levelId);
      setActiveLevelId(levelId);
      activeLevelIdRef.current = levelId;
      handleSaveCurrentAsLevel(target?.name);
    }
  }, [handleSaveCurrentAsLevel]);

  const snapshotCurrentToSlot = (
    projectNow: MapProject,
    levelsNow: SavedLevel[]
  ): { levels: SavedLevel[]; activeId: string; savedSlot: SavedLevel } => {
    const curId = activeLevelIdRef.current;
    const slotIdx = levelsNow.findIndex((l) => l.id === curId);
    const clonedProj = cloneProjectLightweight(projectNow);

    if (slotIdx >= 0 && curId) {
      const updatedSlot: SavedLevel = {
        ...levelsNow[slotIdx],
        name: projectNow.title || levelsNow[slotIdx].name,
        projectData: clonedProj,
        stats: computeLevelStats(clonedProj),
        updatedAt: new Date().toISOString(),
      };
      const levels = levelsNow.map((lvl, i) => (i === slotIdx ? updatedSlot : lvl));
      return { levels, activeId: curId, savedSlot: updatedSlot };
    }

    const fresh: SavedLevel = {
      id: `level-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: projectNow.title || `Fase ${levelsNow.length + 1}`,
      description: 'Fase em produção',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      projectData: clonedProj,
      stats: computeLevelStats(clonedProj),
    };
    return { levels: [fresh, ...levelsNow], activeId: fresh.id, savedSlot: fresh };
  };

  const switchCanvasLevel = useCallback(async (level: SavedLevel) => {
    if (level.id === activeLevelIdRef.current && !level.closedInTabs) return;

    const snap = snapshotCurrentToSlot(projectRef.current, savedLevelsRef.current);

    // Se a fase de destino estava em Cold Storage (aba fechada), hidrata o projectData completo do IndexedDB sob demanda
    let hydratedTarget = snap.levels.find((l) => l.id === level.id) || level;
    if (hydratedTarget.isColdStub) {
      const fromDisk = await loadSingleLevelSlot(level.id);
      if (fromDisk && fromDisk.projectData) {
        hydratedTarget = { ...fromDisk, closedInTabs: false, isColdStub: false };
      }
    } else {
      hydratedTarget = { ...hydratedTarget, closedInTabs: false, isColdStub: false };
    }

    const nextLevels = snap.levels.map((l) =>
      l.id === level.id ? hydratedTarget : l
    );
    setSavedLevels(nextLevels);
    savedLevelsRef.current = nextLevels;

    saveSingleLevelSlot(snap.savedSlot, nextLevels);

    if (typeof window !== 'undefined') {
      localStorage.setItem('tilescroll_active_level_id', level.id);
    }
    setActiveLevelId(level.id);
    activeLevelIdRef.current = level.id;

    const data = cloneProjectLightweight(hydratedTarget.projectData);
    if (!data.canvasKind) {
      data.canvasKind = (data.subBiomes || []).length > 0 ? 'extended' : 'vertical';
    }

    if (!data.galleryAssets || data.galleryAssets.length === 0) {
      if (projectRef.current.galleryAssets && projectRef.current.galleryAssets.length > 0) {
        data.galleryAssets = [...projectRef.current.galleryAssets];
      }
    }
    if (!data.galleryCategories || data.galleryCategories.length === 0) {
      if (projectRef.current.galleryCategories && projectRef.current.galleryCategories.length > 0) {
        data.galleryCategories = [...projectRef.current.galleryCategories];
      }
    }

    setProject(data);
    projectRef.current = data;
    saveProject(data);
    options.onResetSelection?.();

    showToast(`🎮 Fase "${level.name}" carregada!`);
  }, [options, showToast]);

  const handleDuplicateLevel = useCallback(async (level: SavedLevel) => {
    let sourceLevel = level;
    if (level.isColdStub) {
      const fromDisk = await loadSingleLevelSlot(level.id);
      if (fromDisk && fromDisk.projectData) {
        sourceLevel = fromDisk;
      }
    }
    const duplicatedProj: MapProject = {
      ...cloneProjectLightweight(sourceLevel.projectData),
      id: `project-${Date.now()}`,
      title: `${sourceLevel.name} (Cópia)`,
    };
    const duplicated: SavedLevel = {
      ...sourceLevel,
      id: `level-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${sourceLevel.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedInTabs: false,
      isColdStub: false,
      projectData: duplicatedProj,
      stats: computeLevelStats(duplicatedProj),
    };
    const nextLevels = [duplicated, ...savedLevelsRef.current];
    setSavedLevels(nextLevels);
    savedLevelsRef.current = nextLevels;
    saveSingleLevelSlot(duplicated, nextLevels);
    showToast(`📋 Cópia criada: "${duplicated.name}"`);
  }, [showToast]);

  const handleCreateNewEmptyLevel = useCallback(() => {
    const snap = snapshotCurrentToSlot(projectRef.current, savedLevelsRef.current);
    const newProj: MapProject = internProjectAssets({
      ...DEFAULT_PROJECT,
      id: `project-${Date.now()}`,
      canvasKind: 'vertical',
      title: `Nova Fase ${snap.levels.length + 1}`,
      markers: [],
      routes: [],
      galleryAssets: projectRef.current.galleryAssets || [],
      galleryCategories: projectRef.current.galleryCategories || [],
    });

    const newLevel: SavedLevel = {
      id: `level-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newProj.title,
      description: 'Fase em branco',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedInTabs: false,
      projectData: cloneProjectLightweight(newProj),
      stats: computeLevelStats(newProj),
    };

    const nextLevels = [newLevel, ...snap.levels];
    setSavedLevels(nextLevels);
    savedLevelsRef.current = nextLevels;
    saveSingleLevelSlot(newLevel, nextLevels);
    setActiveLevelId(newLevel.id);
    activeLevelIdRef.current = newLevel.id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tilescroll_active_level_id', newLevel.id);
    }
    setProject(cloneProjectLightweight(newProj));
    projectRef.current = newProj;
    options.onResetSelection?.();
    options.onSelectTab?.('editor');

    showToast(`✨ Nova Fase "${newProj.title}" criada! Todas as configurações ficarão salvas exclusivamente nela.`);
  }, [options, showToast]);

  const handleCreateCustomLevel = useCallback((params: {
    name: string;
    description?: string;
    canvasKind: 'vertical' | 'extended';
    width: number;
    height: number;
    tilePng: string;
    baseColor?: string;
    repeatCount?: number;
  }) => {
    const snap = snapshotCurrentToSlot(projectRef.current, savedLevelsRef.current);
    const isExt = params.canvasKind === 'extended';
    const w = Math.max(32, Math.round(params.width || (isExt ? 1000 : 768)));
    const h = Math.max(32, Math.round(params.height || (isExt ? 1000 : 1024)));

    const newProj: MapProject = internProjectAssets({
      ...DEFAULT_PROJECT,
      id: `project-${Date.now()}`,
      canvasKind: params.canvasKind,
      title: params.name.trim() || `Nova Fase ${snap.levels.length + 1}`,
      description: params.description?.trim() || (isExt ? 'Fase Fixo Extended Personalizada' : 'Fase Vertical Alongada Personalizada'),
      mapWidth: w,
      biomes: !isExt
        ? [
            {
              id: `biome-base-${Date.now()}`,
              name: 'Piso Base',
              tilePng: params.tilePng,
              tileWidth: w,
              tileHeight: h,
              tileRepeatCount: Math.max(1, params.repeatCount || 1),
              repeatCount: Math.max(1, params.repeatCount || 1),
              transitionBlendRows: 0,
              baseColor: params.baseColor || '#ffffff',
            },
          ]
        : [],
      subBiomes: isExt
        ? [
            {
              id: `subbiome-base-${Date.now()}`,
              name: 'Arena Principal',
              tilePng: params.tilePng,
              tileWidth: w,
              tileHeight: h,
              baseColor: params.baseColor || '#ffffff',
            },
          ]
        : [],
      markers: [],
      routes: [],
      player: {
        id: 'player-main',
        name: 'Herói',
        x: Math.round(w / 2),
        y: isExt ? Math.round(h / 2) : 120,
        color: '#3b82f6',
        speed: 4,
      },
      galleryAssets: projectRef.current.galleryAssets || [],
      galleryCategories: projectRef.current.galleryCategories || [],
    });

    const newLevel: SavedLevel = {
      id: `level-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newProj.title,
      description: newProj.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedInTabs: false,
      projectData: cloneProjectLightweight(newProj),
      stats: computeLevelStats(newProj),
      thumbnailPng: params.tilePng,
    };

    const nextLevels = [newLevel, ...snap.levels];
    setSavedLevels(nextLevels);
    savedLevelsRef.current = nextLevels;
    saveSingleLevelSlot(newLevel, nextLevels);
    setActiveLevelId(newLevel.id);
    activeLevelIdRef.current = newLevel.id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tilescroll_active_level_id', newLevel.id);
    }
    setProject(cloneProjectLightweight(newProj));
    projectRef.current = newProj;
    options.onResetSelection?.();
    options.onSelectTab?.('editor');

    showToast(`✨ Fase "${newProj.title}" criada com canvas personalizado (${w}×${h}px)!`);
    return newLevel;
  }, [options, showToast]);

  const handleDeleteLevel = useCallback((levelId: string) => {
    const nextLevels = savedLevelsRef.current.filter((l) => l.id !== levelId);
    setSavedLevels(nextLevels);
    savedLevelsRef.current = nextLevels;
    deleteSingleLevelSlot(levelId, nextLevels);
    if (activeLevelIdRef.current === levelId) {
      if (nextLevels.length > 0) {
        switchCanvasLevel(nextLevels[0]);
      } else {
        handleCreateNewEmptyLevel();
      }
    }
    showToast('🗑️ Fase removida permanentemente.');
  }, [handleCreateNewEmptyLevel, switchCanvasLevel, showToast]);

  const createNewCanvas = useCallback((kind: 'vertical' | 'extended') => {
    const snap = snapshotCurrentToSlot(projectRef.current, savedLevelsRef.current);
    const newProj: MapProject = internProjectAssets({
      ...DEFAULT_PROJECT,
      id: `project-${Date.now()}`,
      canvasKind: kind,
      title: kind === 'extended' ? `Fase Ext ${snap.levels.length + 1}` : `Fase ${snap.levels.length + 1}`,
      markers: [],
      routes: [],
      galleryAssets: projectRef.current.galleryAssets || [],
      galleryCategories: projectRef.current.galleryCategories || [],
    });
    const entry: SavedLevel = {
      id: `level-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newProj.title,
      description: 'Tela em branco',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      closedInTabs: false,
      projectData: cloneProjectLightweight(newProj),
      stats: computeLevelStats(newProj),
    };
    const nextLevels = [entry, ...snap.levels];
    setSavedLevels(nextLevels);
    savedLevelsRef.current = nextLevels;
    saveSingleLevelSlot(entry, nextLevels);
    setActiveLevelId(entry.id);
    activeLevelIdRef.current = entry.id;
    if (typeof window !== 'undefined') {
      localStorage.setItem('tilescroll_active_level_id', entry.id);
    }
    setProject(cloneProjectLightweight(newProj));
    projectRef.current = newProj;
    options.onResetSelection?.();
    options.onSelectTab?.('editor');

    showToast(`✨ Tela "${newProj.title}" criada!`);
  }, [options, showToast]);

  // Fecha a aba de uma fase no Workspace SEM apagar a fase da Galeria/Dashboard e libera RAM (Cold Storage)!
  const handleConfirmCloseLevel = useCallback((saveBeforeClose: boolean) => {
    if (!closingLevel) return;

    const targetId = closingLevel.id;
    const isClosingActive = targetId === activeLevelIdRef.current;

    let updatedLevels = [...savedLevelsRef.current];
    let fullTargetSlotForDisk: SavedLevel | null = null;

    updatedLevels = updatedLevels.map((l) => {
      if (l.id !== targetId) return l;
      const projToStore =
        saveBeforeClose && isClosingActive
          ? cloneProjectLightweight(projectRef.current)
          : l.projectData;
      const fullUpdated: SavedLevel = {
        ...l,
        closedInTabs: true,
        isColdStub: l.isColdStub,
        projectData: projToStore,
        stats: l.stats && l.isColdStub ? l.stats : computeLevelStats(projToStore),
        updatedAt: saveBeforeClose ? new Date().toISOString() : l.updatedAt,
      };
      fullTargetSlotForDisk = fullUpdated;
      // Converte para Cold Stub na RAM para liberar imediatamente arrays pesados de grama/colisão/stamps
      return createColdLevelStub(fullUpdated);
    });

    const openTabs = updatedLevels.filter((l) => !l.closedInTabs);

    if (isClosingActive) {
      if (openTabs.length > 0) {
        const nextLevel = openTabs[0];
        setActiveLevelId(nextLevel.id);
        activeLevelIdRef.current = nextLevel.id;
        if (typeof window !== 'undefined') {
          localStorage.setItem('tilescroll_active_level_id', nextLevel.id);
        }
        if (nextLevel.isColdStub) {
          loadSingleLevelSlot(nextLevel.id).then((fromDisk) => {
            if (fromDisk && fromDisk.projectData) {
              const data = cloneProjectLightweight(fromDisk.projectData);
              setProject(data);
              projectRef.current = data;
            }
          });
        } else {
          const data = cloneProjectLightweight(nextLevel.projectData);
          if (!data.canvasKind) {
            data.canvasKind = (data.subBiomes || []).length > 0 ? 'extended' : 'vertical';
          }
          setProject(data);
          projectRef.current = data;
        }
      } else if (updatedLevels.length > 0 && fullTargetSlotForDisk) {
        // Se fechou a última aba visível, mantém a primeira fase aberta sem destruir os dados
        const fallback: SavedLevel = { ...(fullTargetSlotForDisk as SavedLevel), closedInTabs: false, isColdStub: false };
        updatedLevels[0] = fallback;
        setActiveLevelId(fallback.id);
        activeLevelIdRef.current = fallback.id;
        const data = cloneProjectLightweight(fallback.projectData);
        setProject(data);
        projectRef.current = data;
      }
      options.onResetSelection?.();
    }

    setSavedLevels(updatedLevels);
    savedLevelsRef.current = updatedLevels;
    if (fullTargetSlotForDisk) {
      saveSingleLevelSlot(fullTargetSlotForDisk, updatedLevels);
    } else {
      saveLevelsGallery(updatedLevels);
    }

    setClosingLevel(null);
    showToast(`📁 Aba "${closingLevel.name}" fechada (mantida em Cold Storage na Galeria).`);
  }, [closingLevel, options, showToast]);

  return {
    project,
    setProject,
    projectRef,
    savedLevels,
    setSavedLevels,
    savedLevelsRef,
    activeLevelId,
    setActiveLevelId,
    activeLevelIdRef,
    closingLevel,
    setClosingLevel,
    lastSavedTimestamp,
    isSavingLevel,
    justSaved,
    hasUnsavedChanges,
    saveAsNewModalOpen,
    setSaveAsNewModalOpen,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    pushHistory,
    toastMsg,
    showToast,
    handleSaveCurrentAsLevel,
    handleUpdateSavedLevel,
    handleOverwriteSavedLevel,
    switchCanvasLevel,
    handleLoadLevel: switchCanvasLevel,
    handleDuplicateLevel,
    handleDeleteLevel,
    handleCreateNewEmptyLevel,
    handleCreateCustomLevel,
    createNewCanvas,
    handleConfirmCloseLevel,
  };
}
