import { useState, useCallback } from 'react';
import type { MapProject, MapMarker, MapRoute, MarkerType, GalleryAsset } from '../types/map';
import { localAssetSyncService } from '../services/localAssetSyncService';
import { cloneMarkerShared, cloneMotionLayersShared } from '../utils/assetRegistry';

interface UseMarkerManagerProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  canvasView: 'vertical' | 'extended';
  activeTab: string;
  setActiveTab: (tab: any) => void;
  setActiveTool: (tool: any) => void;
  setCanvasRightView: (view: any) => void;
  pushHistory: (proj: MapProject) => void;
  showToast: (msg: string) => void;
  motionEffect?: any;
  motionSpeed?: number;
  motionIntensity?: number;
}

export function useMarkerManager({
  project,
  setProject,
  canvasView,
  activeTab,
  setActiveTab,
  setActiveTool,
  setCanvasRightView,
  pushHistory,
  showToast,
  motionEffect = 'none',
  motionSpeed = 1.0,
  motionIntensity = 1.0,
}: UseMarkerManagerProps) {
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [testSpawnTriggerId, setTestSpawnTriggerId] = useState<number | null>(null);
  const [testDialogueMarkerId, setTestDialogueMarkerId] = useState<string | null>(null);

  const handleAddMarkerAt = useCallback((x: number, y: number, biomeId: string) => {
    const layers = project.markerLayers || [
      { id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0, color: '#3b82f6' },
    ];
    const targetLayerId = project.activeMarkerLayerId || layers[0]?.id || 'layer-default';

    const newMarker: MapMarker = {
      id: `marker-${Date.now()}`,
      name: `Marco ${project.markers.length + 1}`,
      description: 'Local descoberto durante a exploração.',
      type: 'camp',
      color: '#eab308',
      status: 'active',
      x,
      y,
      biomeId,
      layerId: targetLayerId,
      size: 150,
    };

    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      markers: [...prev.markers, newMarker],
    }));

    setSelectedMarkerId(newMarker.id);
    if (activeTab === 'editor') setActiveTab('markers');
    setActiveTool('pan');
  }, [project, activeTab, pushHistory, setProject, setActiveTab, setActiveTool]);

  const handleAddSubBiomeMarkerAt = useCallback((subBiomeId: string, localX: number, localY: number) => {
    const layers = project.markerLayers || [
      { id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0, color: '#3b82f6' },
    ];
    const targetLayerId = project.activeMarkerLayerId || layers[0]?.id || 'layer-default';

    const newMarker: MapMarker = {
      id: `marker-${Date.now()}`,
      name: `Marco ${project.markers.length + 1}`,
      description: 'Ponto da fase.',
      type: 'camp',
      color: '#a855f7',
      status: 'active',
      x: Math.round(localX),
      y: Math.round(localY),
      subBiomeId,
      layerId: targetLayerId,
      size: 150,
    };

    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      markers: [...prev.markers, newMarker],
    }));

    setSelectedMarkerId(newMarker.id);
    setActiveTool('pan');
  }, [project, pushHistory, setProject, setActiveTool]);

  const handleDropMarkerAsset = useCallback(async (
    asset: {
      id?: string;
      name: string;
      dataUrl?: string;
      type?: MarkerType;
      size?: number;
      solidCollision?: boolean;
      hasShadow?: boolean;
      npcBounce?: boolean;
      effect?: any;
      category?: string;
      subCategoryPath?: string;
      sourcePath?: string;
      isLocalFolderAsset?: boolean;
      isPersistentPhaseAsset?: boolean;
    },
    coords: { rawX: number; rawY: number }
  ) => {
    let finalDataUrl = asset.dataUrl;

    if (asset.sourcePath) {
      const cached = localAssetSyncService.getCachedBase64(asset.sourcePath);
      if (cached) {
        finalDataUrl = cached;
      }
    }

    if (finalDataUrl && finalDataUrl.startsWith('blob:')) {
      try {
        const res = await fetch(finalDataUrl);
        const blob = await res.blob();
        const reader = new FileReader();
        finalDataUrl = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
      } catch (err) {
        console.warn('Erro ao converter blob para Base64 permanente:', err);
      }
    }

    let newGalleryAssets = project.galleryAssets ? [...project.galleryAssets] : [];
    const existingAsset = newGalleryAssets.find(
      (ga) => ga.dataUrl === finalDataUrl || (asset.sourcePath && ga.sourcePath === asset.sourcePath)
    );

    if (!existingAsset && finalDataUrl) {
      const permanentGalleryAsset: GalleryAsset = {
        id: `asset-phase-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: asset.name || 'Asset da Fase',
        dataUrl: finalDataUrl,
        category: asset.category || 'Geral',
        subCategoryPath: asset.subCategoryPath,
        sourcePath: asset.sourcePath,
        isPersistentPhaseAsset: true,
        createdAt: new Date().toISOString(),
      };
      newGalleryAssets = [permanentGalleryAsset, ...newGalleryAssets];
    }

    const layers = project.markerLayers || [
      { id: 'layer-default', name: 'Camada Padrão', visible: true, locked: false, order: 0, color: '#3b82f6' },
    ];
    const targetLayerId = project.activeMarkerLayerId || layers[0]?.id || 'layer-default';

    let finalX = Math.round(coords.rawX);
    let finalY = Math.round(coords.rawY);
    let subBiomeId: string | undefined = undefined;
    let biomeId: string | undefined = undefined;

    if (canvasView === 'extended') {
      const GAP = 40;
      let cursorX = 0;
      const list = project.subBiomes || [];
      for (const sb of list) {
        const w = sb.tileWidth || 400;
        if (coords.rawX >= cursorX && coords.rawX < cursorX + w) {
          subBiomeId = sb.id;
          finalX = Math.round(coords.rawX - cursorX);
          finalY = Math.round(coords.rawY);
          break;
        }
        cursorX += w + GAP;
      }
      if (!subBiomeId && list.length > 0) {
        subBiomeId = list[0].id;
      }
    } else {
      let curY = 0;
      for (const b of project.biomes) {
        const h = b.tileHeight * (b.repeatCount ?? b.tileRepeatCount ?? 1);
        if (coords.rawY >= curY && coords.rawY < curY + h) {
          biomeId = b.id;
          break;
        }
        curY += h;
      }
      if (!biomeId) biomeId = project.biomes[0]?.id || '';
    }

    const matchedGalleryAsset = newGalleryAssets.find((ga) => ga.dataUrl === finalDataUrl || ga.id === asset.id);
    const rawLayers = (asset as any).motionLayers || matchedGalleryAsset?.motionLayers;
    const motionLayers = rawLayers && rawLayers.length > 0
      ? cloneMotionLayersShared(rawLayers)
      : undefined;

    const targetType: MarkerType = ((asset as any).targetMarkerType || asset.type || 'neutral') as MarkerType;
    const isNpc = targetType === 'npc';
    const isInteractive = targetType === 'interactive_screen';
    const isLight = targetType === 'light';

    const newMarker: MapMarker = {
      id: `marker-${targetType}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: asset.name || (isNpc ? `NPC ${project.markers.length + 1}` : isInteractive ? `Tela ${project.markers.length + 1}` : isLight ? `Ponto de Luz ${project.markers.length + 1}` : `Marcador ${project.markers.length + 1}`),
      description: isNpc ? 'Personagem NPC' : isInteractive ? 'Tela Interativa' : isLight ? 'Ponto de Iluminação' : 'Objeto no mapa',
      type: targetType,
      color: isNpc ? '#10b981' : isLight ? '#eab308' : isInteractive ? '#a855f7' : '#3b82f6',
      status: 'active',
      x: finalX,
      y: finalY,
      subBiomeId,
      biomeId,
      layerId: targetLayerId,
      customIconPng: finalDataUrl,
      size: (() => {
        const rawSize = Number(asset.size || (matchedGalleryAsset as any)?.defaultSize);
        return rawSize && rawSize >= 16 && rawSize <= 3000 ? rawSize : 150;
      })(),
      solidCollision: isLight ? false : (asset.solidCollision ?? true),
      hasShadow: asset.hasShadow ?? true,
      npcBounce: asset.npcBounce ?? isNpc,
      effect: asset.effect || (isNpc ? 'jelly' : 'none'),
      effectSpeed: (asset as any).effectSpeed ?? 1.0,
      effectIntensity: (asset as any).effectIntensity ?? (isNpc ? 0.45 : 1.0),
      jellySpeed: (asset as any).jellySpeed ?? 1.0,
      jellyIntensity: (asset as any).jellyIntensity ?? (isNpc ? 0.45 : 1.0),
      npcPatrol: isNpc ? ((asset as any).npcPatrol || {
        enabled: false,
        preset: 'horizontal',
        walkStyle: 'jelly',
        speed: 2.0,
        distance: 60,
        pauseTime: 1.5,
        loop: true,
      }) : undefined,
      motionLayers,
      motionAsset: Boolean(motionLayers),
      mediaType: (asset as any).mediaType || ((asset as any).videoUrl ? 'video' : (matchedGalleryAsset?.mediaType || (matchedGalleryAsset?.videoUrl ? 'video' : 'image'))),
      videoUrl: (asset as any).videoUrl || matchedGalleryAsset?.videoUrl,
      videoChromaKey: (asset as any).videoChromaKey || matchedGalleryAsset?.videoChromaKey,
      pivotX: (asset as any).pivotX ?? matchedGalleryAsset?.pivotX ?? 0.5,
      pivotY: (asset as any).pivotY ?? matchedGalleryAsset?.pivotY ?? 0.5,
    };

    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      galleryAssets: newGalleryAssets,
      markers: [...prev.markers, newMarker],
    }));

    setSelectedMarkerId(newMarker.id);
    if (activeTab === 'assets') {
      setCanvasRightView('markers');
    } else if (activeTab === 'editor') {
      setActiveTab('markers');
    }
    showToast(`✨ Marcador "${newMarker.name}" posicionado no mapa!`);
  }, [project, canvasView, activeTab, pushHistory, setProject, setActiveTab, setCanvasRightView, showToast]);

  const handleDuplicateMarker = useCallback((markerId: string) => {
    const src = project.markers.find((m) => m.id === markerId);
    if (!src) return;
    const copy: MapMarker = {
      ...cloneMarkerShared(src),
      id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${src.name} (Cópia)`,
      x: src.x + 64,
      y: src.y + 64,
    };
    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      markers: [...prev.markers, copy],
    }));
    setSelectedMarkerId(copy.id);
  }, [project, pushHistory, setProject]);

  const handleReorderMarker = useCallback((markerId: string, direction: 'up' | 'down') => {
    pushHistory(project);
    setProject((prev) => {
      const list = [...prev.markers];
      const curIdx = list.findIndex((m) => m.id === markerId);
      if (curIdx === -1) return prev;
      const curMarker = list[curIdx];

      const rawLayers =
        prev.markerLayers && prev.markerLayers.length > 0
          ? [...prev.markerLayers]
          : [
              {
                id: 'layer-default',
                name: 'Camada Padrão',
                visible: true,
                locked: false,
                order: 0,
                color: '#3b82f6',
              },
            ];

      // Filtra apenas camadas reais (ignora pastas de grupo) ordenadas de baixo (menor order) para cima (maior order)
      const realLayers = rawLayers
        .filter((l) => !l.isGroup)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

      const curLayerId = curMarker.layerId || realLayers[0]?.id || 'layer-default';
      let layerIdx = realLayers.findIndex((l) => l.id === curLayerId);
      if (layerIdx === -1) layerIdx = 0;

      let targetLayerId = curLayerId;
      let targetLayerName = realLayers[layerIdx]?.name || 'Camada';
      let nextLayers = rawLayers;

      if (direction === 'up') {
        if (layerIdx < realLayers.length - 1) {
          targetLayerId = realLayers[layerIdx + 1].id;
          targetLayerName = realLayers[layerIdx + 1].name;
        } else {
          const maxOrder = realLayers.reduce((acc, l) => Math.max(acc, l.order ?? 0), 0);
          const newId = `layer-${Date.now()}`;
          targetLayerName = `Camada Topo ${realLayers.length + 1}`;
          nextLayers = [
            ...rawLayers,
            {
              id: newId,
              name: targetLayerName,
              visible: true,
              locked: false,
              order: maxOrder + 1,
              color: '#10b981',
            },
          ];
          targetLayerId = newId;
        }
        showToast(`⬆️ "${curMarker.name}" trazido para frente (${targetLayerName})`);
      } else {
        if (layerIdx > 0) {
          targetLayerId = realLayers[layerIdx - 1].id;
          targetLayerName = realLayers[layerIdx - 1].name;
        } else {
          const minOrder = realLayers.reduce((acc, l) => Math.min(acc, l.order ?? 0), 0);
          const newId = `layer-${Date.now()}`;
          targetLayerName = `Camada Base`;
          nextLayers = [
            {
              id: newId,
              name: targetLayerName,
              visible: true,
              locked: false,
              order: minOrder - 1,
              color: '#6366f1',
            },
            ...rawLayers,
          ];
          targetLayerId = newId;
        }
        showToast(`⬇️ "${curMarker.name}" enviado para trás (${targetLayerName})`);
      }

      // Normaliza order das camadas reais (0, 1, 2...) preservando a hierarquia
      const sortedReal = nextLayers
        .filter((l) => !l.isGroup)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const orderMap = new Map<string, number>();
      sortedReal.forEach((l, i) => orderMap.set(l.id, i));
      const normalizedLayers = nextLayers.map((l) =>
        orderMap.has(l.id) ? { ...l, order: orderMap.get(l.id)! } : l
      );

      const updatedMarker: MapMarker = { ...curMarker, layerId: targetLayerId };
      const others = list.filter((m) => m.id !== markerId);
      const nextMarkers =
        direction === 'up' ? [...others, updatedMarker] : [updatedMarker, ...others];

      return {
        ...prev,
        markerLayers: normalizedLayers,
        activeMarkerLayerId: targetLayerId,
        markers: nextMarkers,
      };
    });
  }, [project, pushHistory, setProject, showToast]);

  const handleAddMotionMarker = useCallback((info: {
    x: number;
    y: number;
    subBiomeId?: string;
    biomeId?: string;
    dataUrl: string;
    w: number;
    h: number;
  }) => {
    const size = Math.max(16, Math.round(Math.max(info.w, info.h)));
    const newMarker: MapMarker = {
      id: `marker-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Recorte ${project.markers.length + 1}`,
      description: 'Recorte extraído com Motion Pen.',
      type: 'camp',
      color: '#e879f9',
      status: 'active',
      x: Math.round(info.x),
      y: Math.round(info.y),
      biomeId: info.biomeId,
      subBiomeId: info.subBiomeId,
      customIconPng: info.dataUrl,
      size,
      motionAsset: true,
      hasShadow: false,
      effect: motionEffect,
      effectSpeed: motionSpeed,
      effectIntensity: motionIntensity,
      npcBounce: motionEffect === 'jelly',
    };

    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      markers: [...prev.markers, newMarker],
    }));

    setSelectedMarkerId(newMarker.id);
  }, [project, motionEffect, motionSpeed, motionIntensity, pushHistory, setProject]);

  const handleUpdateMarkerPos = useCallback((markerId: string, x: number, y: number) => {
    setProject((prev) => ({
      ...prev,
      markers: prev.markers.map((m) => (m.id === markerId ? { ...m, x, y } : m)),
    }));
  }, [setProject]);

  const handleUpdateMarker = useCallback((id: string, updates: Partial<MapMarker>) => {
    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      markers: prev.markers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  }, [project, pushHistory, setProject]);

  const handleDeleteMarker = useCallback((id: string) => {
    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      markers: prev.markers.filter((m) => m.id !== id),
      routes: prev.routes.map((r) => ({
        ...r,
        markerIds: r.markerIds.filter((mId) => mId !== id),
      })),
    }));
    setSelectedMarkerId((curr) => (curr === id ? null : curr));
  }, [project, pushHistory, setProject]);

  const handleAddRoute = useCallback(() => {
    const newRoute: MapRoute = {
      id: `route-${Date.now()}`,
      name: `Nova Rota ${project.routes.length + 1}`,
      color: '#f59e0b',
      style: 'dashed',
      markerIds: project.markers.slice(0, 3).map((m) => m.id),
      isAnimated: true,
      notes: 'Trilha exploratória.',
    };

    setProject((prev) => ({
      ...prev,
      routes: [...prev.routes, newRoute],
    }));
  }, [project.routes.length, project.markers, setProject]);

  const handleUpdateRoute = useCallback((id: string, updates: Partial<MapRoute>) => {
    setProject((prev) => ({
      ...prev,
      routes: prev.routes.map((r) => (r.id === id ? { ...r, ...updates } : r)),
    }));
  }, [setProject]);

  const handleDeleteRoute = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      routes: prev.routes.filter((r) => r.id !== id),
    }));
  }, [setProject]);

  return {
    selectedMarkerId,
    setSelectedMarkerId,
    testSpawnTriggerId,
    setTestSpawnTriggerId,
    testDialogueMarkerId,
    setTestDialogueMarkerId,
    handleAddMarkerAt,
    handleAddSubBiomeMarkerAt,
    handleDropMarkerAsset,
    handleDuplicateMarker,
    handleReorderMarker,
    handleAddMotionMarker,
    handleUpdateMarkerPos,
    handleUpdateMarker,
    handleDeleteMarker,
    handleAddRoute,
    handleUpdateRoute,
    handleDeleteRoute,
  };
}
