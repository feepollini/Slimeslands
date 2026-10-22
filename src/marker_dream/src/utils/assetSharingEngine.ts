import type { GalleryAsset, MapProject, SavedLevel } from '../types/map';

export interface SharedPhaseAsset extends GalleryAsset {
  sourcePhaseId: string;
  sourcePhaseName: string;
  isCurrentPhase?: boolean;
}

export interface PhaseInfo {
  id: string;
  name: string;
  assetCount: number;
  isCurrent: boolean;
}

/**
 * Extrai e consolida todos os assets de todas as fases disponíveis (fase atual e outras fases salvas).
 * Deduplica assets e associa cada um à sua fase de origem com metadados ricos.
 */
export function extractCrossPhaseAssets(
  savedLevels: SavedLevel[] = [],
  currentProject?: MapProject | null,
  currentLevelId?: string | null
): {
  allSharedAssets: SharedPhaseAsset[];
  phases: PhaseInfo[];
} {
  const allSharedAssets: SharedPhaseAsset[] = [];
  const phasesMap = new Map<string, PhaseInfo>();
  const seenUrlsByPhase = new Map<string, Set<string>>();

  // 1. Processa a Fase Atual (se fornecida e em memória)
  if (currentProject) {
    const currentId = currentLevelId || 'current_project';
    const currentName = currentProject.title || 'Fase Atual';
    const seen = new Set<string>();
    seenUrlsByPhase.set(currentId, seen);

    let count = 0;

    // Assets da galeria da fase atual
    (currentProject.galleryAssets || []).forEach((asset) => {
      if (asset.dataUrl && !seen.has(asset.dataUrl)) {
        seen.add(asset.dataUrl);
        allSharedAssets.push({
          ...asset,
          sourcePhaseId: currentId,
          sourcePhaseName: currentName,
          isCurrentPhase: true,
        });
        count++;
      }
    });

    // Marcadores da fase atual que possuem ícones customizados não registrados na galeria
    (currentProject.markers || []).forEach((m) => {
      if (m.customIconPng && !seen.has(m.customIconPng)) {
        seen.add(m.customIconPng);
        allSharedAssets.push({
          id: `marker-asset-${m.id}`,
          name: m.name || 'Marcador',
          dataUrl: m.customIconPng,
          width: m.size || 64,
          height: m.size || 64,
          category: m.motionLayers && m.motionLayers.length > 0 ? 'Motion Canvas' : 'Marcadores da Fase',
          motionLayers: m.motionLayers ? JSON.parse(JSON.stringify(m.motionLayers)) : undefined,
          mediaType: m.mediaType || (m.videoUrl ? 'video' : 'image'),
          videoUrl: m.videoUrl,
          videoChromaKey: m.videoChromaKey,
          sourcePhaseId: currentId,
          sourcePhaseName: currentName,
          isCurrentPhase: true,
        });
        count++;
      }
    });

    phasesMap.set(currentId, {
      id: currentId,
      name: currentName,
      assetCount: count,
      isCurrent: true,
    });
  }

  // 2. Processa todas as Outras Fases salvas no banco
  savedLevels.forEach((level) => {
    const levelId = level.id;
    const isCurrent = levelId === currentLevelId;

    // Se já foi processada como fase atual acima, pula para não duplicar
    if (isCurrent && currentProject) return;

    const levelName = level.name || 'Fase Salva';
    const proj = level.projectData;
    if (!proj) return;

    const seen = new Set<string>();
    seenUrlsByPhase.set(levelId, seen);
    let count = 0;

    // Assets da galeria da fase
    (proj.galleryAssets || []).forEach((asset) => {
      if (asset.dataUrl && !seen.has(asset.dataUrl)) {
        seen.add(asset.dataUrl);
        allSharedAssets.push({
          ...asset,
          sourcePhaseId: levelId,
          sourcePhaseName: levelName,
          isCurrentPhase: isCurrent,
        });
        count++;
      }
    });

    // Marcadores da fase com PNGs customizados
    (proj.markers || []).forEach((m) => {
      if (m.customIconPng && !seen.has(m.customIconPng)) {
        seen.add(m.customIconPng);
        allSharedAssets.push({
          id: `marker-asset-${levelId}-${m.id}`,
          name: m.name || 'Marcador',
          dataUrl: m.customIconPng,
          width: m.size || 64,
          height: m.size || 64,
          category: m.motionLayers && m.motionLayers.length > 0 ? 'Motion Canvas' : 'Marcadores da Fase',
          motionLayers: m.motionLayers ? JSON.parse(JSON.stringify(m.motionLayers)) : undefined,
          mediaType: m.mediaType || (m.videoUrl ? 'video' : 'image'),
          videoUrl: m.videoUrl,
          videoChromaKey: m.videoChromaKey,
          sourcePhaseId: levelId,
          sourcePhaseName: levelName,
          isCurrentPhase: isCurrent,
        });
        count++;
      }
    });

    phasesMap.set(levelId, {
      id: levelId,
      name: levelName,
      assetCount: count,
      isCurrent,
    });
  });

  return {
    allSharedAssets,
    phases: Array.from(phasesMap.values()),
  };
}

/**
 * Clona com segurança um asset compartilhado para o acervo da fase atual.
 * Evita duplicação caso já exista o mesmo dataUrl.
 */
export function cloneAssetToCurrentProject(
  asset: GalleryAsset | SharedPhaseAsset,
  project: MapProject,
  sourcePhaseName?: string
): {
  updatedProject: MapProject;
  clonedAsset: GalleryAsset;
  isNew: boolean;
} {
  const existingGallery = project.galleryAssets || [];
  const existing = existingGallery.find((a) => a.dataUrl === asset.dataUrl || a.id === asset.id);

  if (existing) {
    return {
      updatedProject: project,
      clonedAsset: existing,
      isNew: false,
    };
  }

  const phaseTag = sourcePhaseName || (asset as SharedPhaseAsset).sourcePhaseName || 'Outra Fase';
  const newAsset: GalleryAsset = {
    ...asset,
    id: `asset-shared-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    tags: Array.from(new Set([...(asset.tags || []), 'compartilhado', phaseTag])),
    isPersistentPhaseAsset: true,
    createdAt: new Date().toISOString(),
  };

  const nextCategories = new Set([
    ...(project.galleryCategories || []),
    newAsset.category || 'Compartilhados',
  ]);

  const updatedProject: MapProject = {
    ...project,
    galleryAssets: [newAsset, ...existingGallery],
    galleryCategories: Array.from(nextCategories),
  };

  return {
    updatedProject,
    clonedAsset: newAsset,
    isNew: true,
  };
}
