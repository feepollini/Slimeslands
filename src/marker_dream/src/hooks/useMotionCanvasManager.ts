import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import type { MapProject, MapMarker, MarkerMotionLayer, GalleryAsset } from '../types/map';
import type { BrushMode, ExtractionAction } from '../components/MotionBrushStudio';
import { composeMotionAssetSnapshot } from '../utils/motionCanvasEngine';
import { readUploadedImage } from '../utils/tileGenerator';

interface UseMotionCanvasManagerProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  selectedMarkerId: string | null;
  setSelectedMarkerId: (id: string | null) => void;
  activeTab: string;
  pushHistory: (proj: MapProject) => void;
  showToast: (msg: string) => void;
  currentScrollY?: number;
}

export function useMotionCanvasManager({
  project,
  setProject,
  selectedMarkerId,
  setSelectedMarkerId,
  activeTab,
  pushHistory,
  showToast,
  currentScrollY = 150,
}: UseMotionCanvasManagerProps) {
  const [motionCanvasMarkerId, setMotionCanvasMarkerId] = useState<string | null>(null);
  const [motionCanvasActiveLayerId, setMotionCanvasActiveLayerId] = useState<string | null>(null);
  const [motionCanvasLayers, setMotionCanvasLayers] = useState<MarkerMotionLayer[]>([]);
  const [motionCanvasBrushSize, setMotionCanvasBrushSize] = useState<number>(24);
  const [motionCanvasBrushMode, setMotionCanvasBrushMode] = useState<BrushMode>('brush');
  const [motionCanvasSmoothLevel, setMotionCanvasSmoothLevel] = useState<number>(2);
  const [motionCanvasActiveTool, setMotionCanvasActiveTool] = useState<'move' | 'brush' | 'pivot' | 'pan'>('brush');
  const [isPrimordialJelly, setIsPrimordialJelly] = useState<boolean>(false);
  const [motionCanvasExtractionAction, setMotionCanvasExtractionAction] = useState<ExtractionAction>('copy');
  const [motionCanvasAutoExtract, setMotionCanvasAutoExtract] = useState<boolean>(true);
  const [motionRightView, setMotionRightView] = useState<'layers' | 'emulator'>('layers');

  // Estados para Hub Guiado de Inicialização e Decisão de Salvamento
  const [isStartupModalOpen, setIsStartupModalOpen] = useState<boolean>(false);
  const [isSaveDecisionModalOpen, setIsSaveDecisionModalOpen] = useState<boolean>(false);
  const [isGalleryPickerOpen, setIsGalleryPickerOpen] = useState<boolean>(false);
  const [isReeditionMode, setIsReeditionMode] = useState<boolean>(false);
  const [motionOriginMarkerId, setMotionOriginMarkerId] = useState<string | null>(null);
  const [motionOriginAssetName, setMotionOriginAssetName] = useState<string | null>(null);
  const [saveSnapshotPreview, setSaveSnapshotPreview] = useState<string | null>(null);

  const motionCanvasLayersRef = useRef<MarkerMotionLayer[]>(motionCanvasLayers);
  motionCanvasLayersRef.current = motionCanvasLayers;
  const motionCanvasMarkerIdRef = useRef<string | null>(motionCanvasMarkerId);
  motionCanvasMarkerIdRef.current = motionCanvasMarkerId;
  const isPrimordialJellyRef = useRef<boolean>(isPrimordialJelly);
  isPrimordialJellyRef.current = isPrimordialJelly;

  const lastLoadedMotionMarkerIdRef = useRef<string | null>(null);
  const prevActiveTabRef = useRef<string>(activeTab);

  // Histórico de Undo/Redo e Clipboard das Camadas do Motion Studio
  const motionLayersHistoryRef = useRef<MarkerMotionLayer[][]>([]);
  const motionLayersRedoRef = useRef<MarkerMotionLayer[][]>([]);
  const motionLayerClipboardRef = useRef<MarkerMotionLayer | null>(null);

  // Monitora a entrada na aba Motion Canvas: abre o Modal de Inicialização em vez de travar/atrelar silenciosamente
  useEffect(() => {
    const enteredMotionTab = activeTab === 'motion_canvas' && prevActiveTabRef.current !== 'motion_canvas';
    prevActiveTabRef.current = activeTab;

    if (enteredMotionTab) {
      setIsStartupModalOpen(true);
    }
  }, [activeTab]);

  // Marcador candidato baseado na seleção do editor
  const candidateMarker = useMemo(() => {
    if (!selectedMarkerId) return null;
    return project.markers.find((m) => m.id === selectedMarkerId) || null;
  }, [selectedMarkerId, project.markers]);

  // Confirmação e carregamento do marcador selecionado
  const handleConfirmSelectedMarker = useCallback(
    (marker: MapMarker) => {
      setMotionCanvasMarkerId(marker.id);
      setSelectedMarkerId(marker.id);
      setMotionOriginMarkerId(marker.id);
      setMotionOriginAssetName(marker.name);
      lastLoadedMotionMarkerIdRef.current = marker.id;

      if (marker.motionLayers && marker.motionLayers.length > 0) {
        const foundBase = marker.motionLayers.find((l) => l.isBaseAsset) || marker.motionLayers[0];
        const layersWithBase = marker.motionLayers.map((l) => ({
          ...l,
          isBaseAsset: l.id === foundBase.id,
        }));
        setMotionCanvasLayers(JSON.parse(JSON.stringify(layersWithBase)));
        setMotionCanvasActiveLayerId(layersWithBase[0].id);
        setIsPrimordialJelly(marker.effect === 'jelly' || marker.npcBounce === true);
        setIsReeditionMode(true);
        showToast(`🎬 Camadas de "${marker.name}" carregadas para reedição!`);
      } else {
        const initialLayer: MarkerMotionLayer = {
          id: `mlayer-base-${marker.id}`,
          name: `Asset Principal (${marker.name || 'Base'})`,
          isBaseAsset: true,
          visible: true,
          pngUrl: marker.customIconPng || marker.bannerImagePng || undefined,
          effect: 'none',
          speed: marker.effectSpeed ?? 1.0,
          intensity: marker.effectIntensity ?? 1.0,
          scale: 1.0,
          rotation: 0,
          flipX: false,
          flipY: false,
          pivotX: 0.5,
          pivotY: 0.5,
          physicsMode: 'none',
          x: 0,
          y: 0,
          brushSize: 24,
          strokes: marker.effectStrokes ? [...marker.effectStrokes] : [],
        };
        setMotionCanvasLayers([initialLayer]);
        setMotionCanvasActiveLayerId(initialLayer.id);
        setIsPrimordialJelly(false);
        setIsReeditionMode(false);
        showToast(`🎨 Objeto "${marker.name}" carregado como asset base!`);
      }
      setIsStartupModalOpen(false);
    },
    [setSelectedMarkerId, showToast]
  );

  // Iniciar criação livre em branco
  const handleStartFromScratch = useCallback(() => {
    const initialLayer: MarkerMotionLayer = {
      id: `mlayer-base-${Date.now()}`,
      name: 'Asset Principal (Livre)',
      isBaseAsset: true,
      visible: true,
      pngUrl: undefined,
      effect: 'none',
      speed: 1.0,
      intensity: 1.0,
      scale: 1.0,
      rotation: 0,
      flipX: false,
      flipY: false,
      pivotX: 0.5,
      pivotY: 0.5,
      physicsMode: 'none',
      x: 0,
      y: 0,
      brushSize: 24,
      strokes: [],
    };
    setMotionCanvasLayers([initialLayer]);
    setMotionCanvasActiveLayerId(initialLayer.id);
    setMotionCanvasMarkerId(null);
    setMotionOriginMarkerId(null);
    setMotionOriginAssetName('Composição Livre');
    setIsReeditionMode(false);
    setIsStartupModalOpen(false);
    showToast('✨ Motion Canvas iniciado em branco! Desenhe ou adicione peças.');
  }, [showToast]);

  // Importar PNG local do computador
  const handleImportLocalPng = useCallback(
    async (file: File) => {
      try {
        const res = await readUploadedImage(file);
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const initialLayer: MarkerMotionLayer = {
          id: `mlayer-base-${Date.now()}`,
          name: cleanName,
          isBaseAsset: true,
          visible: true,
          pngUrl: res.dataUrl,
          effect: 'none',
          speed: 1.0,
          intensity: 1.0,
          scale: 1.0,
          rotation: 0,
          flipX: false,
          flipY: false,
          pivotX: 0.5,
          pivotY: 0.5,
          physicsMode: 'none',
          x: 0,
          y: 0,
          brushSize: 24,
          strokes: [],
        };
        setMotionCanvasLayers([initialLayer]);
        setMotionCanvasActiveLayerId(initialLayer.id);
        setMotionCanvasMarkerId(null);
        setMotionOriginMarkerId(null);
        setMotionOriginAssetName(cleanName);
        setIsReeditionMode(false);
        setIsStartupModalOpen(false);
        showToast(`📥 Imagem "${cleanName}" carregada no Motion Canvas!`);
      } catch (err) {
        console.warn('Erro ao carregar PNG local no Motion Canvas:', err);
        showToast('⚠️ Erro ao ler imagem local.');
      }
    },
    [showToast]
  );

  // Carregar asset da galeria (PNG normal ou Composição Motion existente)
  const handleLoadAssetFromGallery = useCallback(
    (dataUrl: string, assetName?: string, asset?: GalleryAsset) => {
      if (asset?.motionLayers && asset.motionLayers.length > 0) {
        const foundBase = asset.motionLayers.find((l) => l.isBaseAsset) || asset.motionLayers[0];
        const layersWithBase = asset.motionLayers.map((l) => ({
          ...l,
          isBaseAsset: l.id === foundBase.id,
        }));
        setMotionCanvasLayers(JSON.parse(JSON.stringify(layersWithBase)));
        setMotionCanvasActiveLayerId(layersWithBase[0].id);
        setIsReeditionMode(true);
        setMotionOriginAssetName(asset.name);
        const originMarker = project.markers.find(
          (m) => `motion-asset-marker-${m.id}` === asset.id || m.name === asset.name
        );
        setMotionOriginMarkerId(originMarker?.id || null);
        setMotionCanvasMarkerId(originMarker?.id || null);
        showToast(`🎬 Composição Motion "${asset.name}" carregada para reedição!`);
      } else {
        const initialLayer: MarkerMotionLayer = {
          id: `mlayer-base-${Date.now()}`,
          name: assetName || asset?.name || 'Asset da Galeria',
          isBaseAsset: true,
          visible: true,
          pngUrl: dataUrl,
          effect: 'none',
          speed: 1.0,
          intensity: 1.0,
          scale: 1.0,
          rotation: 0,
          flipX: false,
          flipY: false,
          pivotX: 0.5,
          pivotY: 0.5,
          physicsMode: 'none',
          x: 0,
          y: 0,
          brushSize: 24,
          strokes: [],
        };
        setMotionCanvasLayers([initialLayer]);
        setMotionCanvasActiveLayerId(initialLayer.id);
        setIsReeditionMode(false);
        setMotionOriginAssetName(assetName || asset?.name || 'Asset da Galeria');
        setMotionOriginMarkerId(null);
        setMotionCanvasMarkerId(null);
        showToast(`🎨 Asset "${assetName || asset?.name}" definido como base do Motion!`);
      }
      setIsGalleryPickerOpen(false);
      setIsStartupModalOpen(false);
    },
    [project.markers, showToast]
  );

  // Helper que gera a composição final e snapshot
  const prepareFinalizedMotionData = useCallback(async () => {
    const baseLayer = motionCanvasLayers.find((l) => l.isBaseAsset) || motionCanvasLayers[0];
    const effectMode =
      baseLayer?.effect && baseLayer.effect !== 'none' && baseLayer.effect !== 'jelly'
        ? baseLayer.effect
        : 'none';

    const finalEffect = isPrimordialJelly ? (effectMode !== 'none' ? effectMode : 'jelly') : effectMode;
    const basePng = baseLayer?.pngUrl || '';

    let compositePng = basePng;
    try {
      if (basePng && motionCanvasLayers.length > 1) {
        compositePng = await composeMotionAssetSnapshot(basePng, motionCanvasLayers);
      }
    } catch (err) {
      console.warn('Erro ao gerar snapshot composto do Motion Canvas:', err);
    }

    const baseId = baseLayer?.id;
    const finalizedLayers: MarkerMotionLayer[] = motionCanvasLayers.map((l) => {
      const isBase = l.id === baseId;
      return {
        ...l,
        isBaseAsset: isBase,
        pngUrl: isBase ? (l.pngUrl || basePng) : l.pngUrl,
      };
    });

    return { finalizedLayers, compositePng, finalEffect, baseLayer, basePng };
  }, [motionCanvasLayers, isPrimordialJelly]);

  // Intercepta o salvamento: se for reedição ou tiver marcador original, pergunta se quer sobrepor ou salvar como novo!
  const handleSaveMotionCanvas = useCallback(async () => {
    const { compositePng } = await prepareFinalizedMotionData();
    setSaveSnapshotPreview(compositePng);

    const hasOriginalTarget = !!(
      motionOriginMarkerId ||
      motionCanvasMarkerId ||
      (selectedMarkerId && project.markers.some((m) => m.id === selectedMarkerId))
    );

    if (isReeditionMode || hasOriginalTarget) {
      setIsSaveDecisionModalOpen(true);
      return;
    }

    // Se começou livre / sem marcador original, salva direto como novo!
    await handleExecuteSaveAsNew(motionOriginAssetName || 'Composição Motion');
  }, [
    prepareFinalizedMotionData,
    motionOriginMarkerId,
    motionCanvasMarkerId,
    selectedMarkerId,
    project.markers,
    isReeditionMode,
    motionOriginAssetName,
  ]);

  // Opção 1: Sobrepor / Atualizar o Original
  const handleExecuteSaveOverwrite = useCallback(async () => {
    const targetId = motionOriginMarkerId || motionCanvasMarkerId || selectedMarkerId;
    const { finalizedLayers, compositePng, finalEffect, baseLayer, basePng } =
      await prepareFinalizedMotionData();

    setMotionCanvasLayers(finalizedLayers);

    const target = targetId ? project.markers.find((m) => m.id === targetId) : null;
    const targetName = target?.name || motionOriginAssetName || 'Composição';

    const updatedMarkerUpdates: Partial<MapMarker> = {
      motionLayers: JSON.parse(JSON.stringify(finalizedLayers)),
      motionAsset: true,
      effect: finalEffect,
      effectSpeed: baseLayer?.speed ?? 1.0,
      effectIntensity: baseLayer?.intensity ?? 1.0,
      effectStrokes: finalizedLayers.flatMap((l) => l.strokes || []),
      npcBounce: isPrimordialJelly,
    };

    if (basePng && target && basePng !== target.customIconPng) {
      updatedMarkerUpdates.customIconPng = basePng;
      updatedMarkerUpdates.bannerImagePng = basePng;
    }

    pushHistory(project);

    setProject((prev) => {
      const updatedMarkers = targetId
        ? prev.markers.map((m) => (m.id === targetId ? { ...m, ...updatedMarkerUpdates } : m))
        : prev.markers;

      let updatedAssets = prev.galleryAssets || [];
      let updatedCategories = prev.galleryCategories || ['Geral'];

      if (compositePng) {
        const stableMotionAssetId = targetId ? `motion-asset-marker-${targetId}` : `motion-asset-${Date.now()}`;
        const compositionAsset: GalleryAsset = {
          id: stableMotionAssetId,
          name: `${targetName} (Motion Canvas)`,
          dataUrl: compositePng,
          category: 'Motion Canvas',
          motionLayers: JSON.parse(JSON.stringify(finalizedLayers)),
          createdAt: new Date().toISOString(),
        };

        const otherAssets = (prev.galleryAssets || []).filter(
          (a) =>
            a.category !== 'Peças Motion Canvas' &&
            !a.id.startsWith('gallery-piece-') &&
            !a.id.startsWith('asset-piece-') &&
            a.id !== stableMotionAssetId
        );
        updatedAssets = [compositionAsset, ...otherAssets];

        const curCats = new Set((prev.galleryCategories || ['Geral']).filter((c) => c !== 'Peças Motion Canvas'));
        curCats.add('Motion Canvas');
        updatedCategories = Array.from(curCats);
      }

      return {
        ...prev,
        markers: updatedMarkers,
        galleryAssets: updatedAssets,
        galleryCategories: updatedCategories,
      };
    });

    setIsSaveDecisionModalOpen(false);
    showToast(`💾 "${targetName}" e acervo da Galeria sobrepostos com sucesso!`);
  }, [
    motionOriginMarkerId,
    motionCanvasMarkerId,
    selectedMarkerId,
    motionOriginAssetName,
    prepareFinalizedMotionData,
    project,
    isPrimordialJelly,
    pushHistory,
    setProject,
    showToast,
  ]);

  // Opção 2: Salvar como Novo Asset Motion Independente
  const handleExecuteSaveAsNew = useCallback(
    async (customName: string) => {
      const { finalizedLayers, compositePng, finalEffect, baseLayer, basePng } =
        await prepareFinalizedMotionData();

      setMotionCanvasLayers(finalizedLayers);

      const finalName = customName.trim() || 'Nova Composição Motion';
      const newAssetId = `motion-asset-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const newMarkerId = `marker-motion-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

      const targetX = Math.round((project.mapWidth || 768) / 2);
      const targetY = Math.max(80, Math.round(currentScrollY + 120));

      const newMarker: MapMarker = {
        id: newMarkerId,
        name: finalName,
        description: 'Asset animado com Motion Canvas',
        type: 'npc',
        color: '#38bdf8',
        status: 'discovered',
        x: targetX,
        y: targetY,
        layerId: project.markerLayers?.[0]?.id || 'layer-1',
        customIconPng: compositePng || basePng,
        size: 150,
        solidCollision: true,
        hasShadow: true,
        shadowOffsetX: 0,
        shadowOffsetY: 0,
        npcBounce: isPrimordialJelly,
        effect: finalEffect,
        effectSpeed: baseLayer?.speed ?? 1.0,
        effectIntensity: baseLayer?.intensity ?? 1.0,
        effectStrokes: finalizedLayers.flatMap((l) => l.strokes || []),
        motionAsset: true,
        motionLayers: JSON.parse(JSON.stringify(finalizedLayers)),
      };

      const compositionAsset: GalleryAsset = {
        id: newAssetId,
        name: `${finalName} (Motion Canvas)`,
        dataUrl: compositePng || basePng,
        category: 'Motion Canvas',
        motionLayers: JSON.parse(JSON.stringify(finalizedLayers)),
        createdAt: new Date().toISOString(),
      };

      pushHistory(project);

      setProject((prev) => {
        const curCats = new Set((prev.galleryCategories || ['Geral']).filter((c) => c !== 'Peças Motion Canvas'));
        curCats.add('Motion Canvas');

        return {
          ...prev,
          markers: [...prev.markers, newMarker],
          galleryAssets: [compositionAsset, ...(prev.galleryAssets || [])],
          galleryCategories: Array.from(curCats),
        };
      });

      setSelectedMarkerId(newMarker.id);
      setMotionCanvasMarkerId(newMarker.id);
      setMotionOriginMarkerId(newMarker.id);
      setMotionOriginAssetName(finalName);
      setIsReeditionMode(true);
      setIsSaveDecisionModalOpen(false);
      showToast(`✨ Novo Asset Motion "${finalName}" salvo com sucesso no acervo e no mapa!`);
    },
    [
      prepareFinalizedMotionData,
      project,
      currentScrollY,
      isPrimordialJelly,
      pushHistory,
      setProject,
      setSelectedMarkerId,
      showToast,
    ]
  );

  const pushMotionLayersHistory = (currentLayers: MarkerMotionLayer[]) => {
    if (!currentLayers || currentLayers.length === 0) return;
    motionLayersHistoryRef.current.push(JSON.parse(JSON.stringify(currentLayers)));
    if (motionLayersHistoryRef.current.length > 40) {
      motionLayersHistoryRef.current.shift();
    }
    motionLayersRedoRef.current = [];
  };

  const handleMotionUndo = useCallback(() => {
    if (motionLayersHistoryRef.current.length === 0) {
      showToast('Nenhuma ação anterior para desfazer no Motion Studio');
      return;
    }
    const previous = motionLayersHistoryRef.current.pop()!;
    motionLayersRedoRef.current.push(JSON.parse(JSON.stringify(motionCanvasLayersRef.current)));
    setMotionCanvasLayers(previous);
    if (!previous.some((l) => l.id === motionCanvasActiveLayerId)) {
      setMotionCanvasActiveLayerId(previous[0]?.id || null);
    }
    showToast('↩️ Motion Studio: Desfeito! (Ctrl+Z)');
  }, [motionCanvasActiveLayerId, showToast]);

  const handleMotionRedo = useCallback(() => {
    if (motionLayersRedoRef.current.length === 0) {
      showToast('Nenhuma ação para refazer no Motion Studio');
      return;
    }
    const next = motionLayersRedoRef.current.pop()!;
    motionLayersHistoryRef.current.push(JSON.parse(JSON.stringify(motionCanvasLayersRef.current)));
    setMotionCanvasLayers(next);
    if (!next.some((l) => l.id === motionCanvasActiveLayerId)) {
      setMotionCanvasActiveLayerId(next[0]?.id || null);
    }
    showToast('↪️ Motion Studio: Refeito! (Ctrl+Y)');
  }, [motionCanvasActiveLayerId, showToast]);

  const handleMotionCopy = useCallback(() => {
    const active = motionCanvasLayersRef.current.find((l) => l.id === motionCanvasActiveLayerId);
    if (!active) {
      showToast('Selecione uma peça para copiar (Ctrl+C)');
      return;
    }
    motionLayerClipboardRef.current = JSON.parse(JSON.stringify(active));
    showToast(`📋 Peça "${active.name}" copiada! (Ctrl+C)`);
  }, [motionCanvasActiveLayerId, showToast]);

  const handleMotionPaste = useCallback(() => {
    if (!motionLayerClipboardRef.current) {
      showToast('Área de transferência do Motion Studio vazia.');
      return;
    }
    pushMotionLayersHistory(motionCanvasLayersRef.current);
    const src = motionLayerClipboardRef.current;
    const pasted: MarkerMotionLayer = {
      ...JSON.parse(JSON.stringify(src)),
      id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${src.name} (Cópia)`,
      isBaseAsset: false,
      x: (src.x ?? 0) + 15,
      y: (src.y ?? 0) + 15,
    };
    setMotionCanvasLayers((prev) => [...prev, pasted]);
    setMotionCanvasActiveLayerId(pasted.id);
    setMotionCanvasActiveTool('move');
    showToast(`📄 Peça "${pasted.name}" colada! (Ctrl+V)`);
  }, [showToast]);

  const handleMotionDuplicate = useCallback(() => {
    const active = motionCanvasLayersRef.current.find((l) => l.id === motionCanvasActiveLayerId);
    if (!active) return;
    pushMotionLayersHistory(motionCanvasLayersRef.current);
    const duplicated: MarkerMotionLayer = {
      ...JSON.parse(JSON.stringify(active)),
      id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `${active.name} (Duplicada)`,
      isBaseAsset: false,
      x: (active.x ?? 0) + 15,
      y: (active.y ?? 0) + 15,
    };
    setMotionCanvasLayers((prev) => [...prev, duplicated]);
    setMotionCanvasActiveLayerId(duplicated.id);
    showToast(`✨ Peça duplicada! (Ctrl+D)`);
  }, [motionCanvasActiveLayerId, showToast]);

  const handleMotionDelete = useCallback(() => {
    const active = motionCanvasLayersRef.current.find((l) => l.id === motionCanvasActiveLayerId);
    if (!active) return;
    if (active.isBaseAsset) {
      showToast('⚠️ A camada base não pode ser excluída.');
      return;
    }
    pushMotionLayersHistory(motionCanvasLayersRef.current);
    const filtered = motionCanvasLayersRef.current.filter((l) => l.id !== active.id);
    setMotionCanvasLayers(filtered);
    setMotionCanvasActiveLayerId(filtered[0]?.id || null);
    showToast('🗑️ Peça excluída! (Delete)');
  }, [motionCanvasActiveLayerId, showToast]);

  const handleMotionNudge = useCallback((dx: number, dy: number) => {
    const active = motionCanvasLayersRef.current.find((l) => l.id === motionCanvasActiveLayerId);
    if (!active) return;
    setMotionCanvasLayers((prev) =>
      prev.map((l) => (l.id === active.id ? { ...l, x: (l.x ?? 0) + dx, y: (l.y ?? 0) + dy } : l))
    );
  }, [motionCanvasActiveLayerId]);

  const handleLoadMotionComposition = useCallback((asset: GalleryAsset) => {
    const targetId = selectedMarkerId || motionCanvasMarkerId;
    if (asset.motionLayers && asset.motionLayers.length > 0) {
      const cloned = JSON.parse(JSON.stringify(asset.motionLayers));
      setMotionCanvasLayers(cloned);
      setMotionCanvasActiveLayerId(cloned[0].id);
      if (targetId) {
        setProject((prev) => ({
          ...prev,
          markers: prev.markers.map((m) =>
            m.id === targetId ? { ...m, motionLayers: cloned, motionAsset: true } : m
          ),
        }));
      }
      showToast(`🎬 Composição "${asset.name}" carregada no estúdio para reedição!`);
    } else if (asset.dataUrl) {
      const initialLayer: MarkerMotionLayer = {
        id: `mlayer-base-${Date.now()}`,
        name: `Asset (${asset.name})`,
        isBaseAsset: true,
        visible: true,
        pngUrl: asset.dataUrl,
        effect: 'none',
        speed: 1.0,
        intensity: 1.0,
        scale: 1.0,
        rotation: 0,
        flipX: false,
        flipY: false,
        pivotX: 0.5,
        pivotY: 0.5,
        physicsMode: 'none',
        x: 0,
        y: 0,
        brushSize: 24,
        strokes: [],
      };
      setMotionCanvasLayers([initialLayer]);
      setMotionCanvasActiveLayerId(initialLayer.id);
      if (targetId) {
        setProject((prev) => ({
          ...prev,
          markers: prev.markers.map((m) =>
            m.id === targetId ? { ...m, motionLayers: [initialLayer], motionAsset: false } : m
          ),
        }));
      }
      showToast(`🎬 Asset "${asset.name}" carregado no estúdio!`);
    }
  }, [selectedMarkerId, motionCanvasMarkerId, setProject, showToast]);

  const handleReplaceBaseAssetPng = useCallback((newPngUrl: string) => {
    const targetId = selectedMarkerId || motionCanvasMarkerId;
    if (!targetId) return;
    setProject((prev) => ({
      ...prev,
      markers: prev.markers.map((m) =>
        m.id === targetId ? { ...m, customIconPng: newPngUrl, bannerImagePng: newPngUrl } : m
      ),
    }));
    setMotionCanvasLayers((prev) =>
      prev.map((l) => (l.isBaseAsset ? { ...l, pngUrl: newPngUrl } : l))
    );
    showToast('🔄 Imagem PNG do asset base trocada com sucesso!');
  }, [selectedMarkerId, motionCanvasMarkerId, setProject, showToast]);

  return {
    motionCanvasMarkerId,
    setMotionCanvasMarkerId,
    motionCanvasActiveLayerId,
    setMotionCanvasActiveLayerId,
    motionCanvasLayers,
    setMotionCanvasLayers,
    motionCanvasBrushSize,
    setMotionCanvasBrushSize,
    motionCanvasBrushMode,
    setMotionCanvasBrushMode,
    motionCanvasSmoothLevel,
    setMotionCanvasSmoothLevel,
    motionCanvasActiveTool,
    setMotionCanvasActiveTool,
    isPrimordialJelly,
    setIsPrimordialJelly,
    motionCanvasExtractionAction,
    setMotionCanvasExtractionAction,
    motionCanvasAutoExtract,
    setMotionCanvasAutoExtract,
    motionRightView,
    setMotionRightView,
    motionCanvasLayersRef,
    motionCanvasMarkerIdRef,
    isPrimordialJellyRef,
    handleSaveMotionCanvas,
    handleMotionUndo,
    handleMotionRedo,
    handleMotionCopy,
    handleMotionPaste,
    handleMotionDuplicate,
    handleMotionDelete,
    handleMotionNudge,
    handleLoadMotionComposition,
    handleReplaceBaseAssetPng,
    // Hub Guiado de Inicialização & Decisão de Salvamento
    isStartupModalOpen,
    setIsStartupModalOpen,
    isSaveDecisionModalOpen,
    setIsSaveDecisionModalOpen,
    isGalleryPickerOpen,
    setIsGalleryPickerOpen,
    isReeditionMode,
    setIsReeditionMode,
    motionOriginMarkerId,
    setMotionOriginMarkerId,
    motionOriginAssetName,
    setMotionOriginAssetName,
    saveSnapshotPreview,
    candidateMarker,
    handleConfirmSelectedMarker,
    handleStartFromScratch,
    handleImportLocalPng,
    handleLoadAssetFromGallery,
    handleExecuteSaveOverwrite,
    handleExecuteSaveAsNew,
  };
}
