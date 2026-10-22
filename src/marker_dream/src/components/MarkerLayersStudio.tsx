import React, { useState, useEffect } from 'react';
import { MapProject, MarkerLayer, MapMarker, GalleryAsset } from '../types/map';
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  ArrowUp,
  ArrowDown,
  Check,
  Edit2,
  MapPin,
  Sparkles,
  FolderPlus,
  Folder,
  FolderOpen,
  Combine,
  ChevronRight,
  ChevronDown,
  CornerDownRight,
  CheckSquare,
  Square,
  Eraser,
  AlertTriangle,
  ArrowRightLeft,
} from 'lucide-react';
const NATURE_LAYER_ID = 'layer-nature-terrain';

interface MarkerLayersStudioProps {
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  selectedMarkerId: string | null;
  onSelectMarker: (id: string | null) => void;
  showToast?: (msg: string) => void;
  onOpenMarkerPen?: () => void;
}

const LAYER_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#06b6d4', // Cyan
  '#f43f5e', // Rose
  '#84cc16', // Lime
];

/**
 * Normaliza os valores de `order` da lista de camadas de modo que:
 * - O primeiro item da lista visual (índice 0, Topo) tenha o MAIOR `order` (frente no mapa).
 * - O último item da lista visual (Base) tenha o MENOR `order` (fundo no mapa).
 */
export function normalizeLayersOrderFromVisualList(visualList: MarkerLayer[]): MarkerLayer[] {
  const total = visualList.length;
  return visualList.map((layer, index) => ({
    ...layer,
    order: (total - 1 - index) * 10,
  }));
}

export const MarkerLayersStudio: React.FC<MarkerLayersStudioProps> = ({
  project,
  onUpdateProject,
  selectedMarkerId,
  onSelectMarker,
  showToast,
}) => {
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [expandedLayerIds, setExpandedLayerIds] = useState<Record<string, boolean>>({});
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [pendingDeleteLayerId, setPendingDeleteLayerId] = useState<string | null>(null);
  const [pendingBatchDelete, setPendingBatchDelete] = useState(false);
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null);
  const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);

  // Garante que sempre exista ao menos uma camada padrão materializada
  const rawLayers: MarkerLayer[] =
    project.markerLayers && project.markerLayers.length > 0
      ? project.markerLayers
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

  // Lista visual ordenada: maior `order` no topo (Frente), menor `order` embaixo (Fundo)
  const layers: MarkerLayer[] = [...rawLayers].sort((a, b) => (b.order ?? 0) - (a.order ?? 0));

  const firstSelectableLayer = layers.find((l) => !l.isGroup) || layers[0];
  const activeLayerId =
    project.activeMarkerLayerId && layers.some((l) => l.id === project.activeMarkerLayerId)
      ? project.activeMarkerLayerId
      : firstSelectableLayer?.id || 'layer-default';

  const galleryLookup = new Map<string, GalleryAsset>(
    (project.galleryAssets || []).map((a) => [a.id, a])
  );

  // Marcadores que pertencem a uma camada específica
  const defaultFallbackLayerId =
    layers.find((l) => l.id === 'layer-default')?.id ||
    layers.find((l) => !l.isGroup)?.id ||
    layers[0]?.id;

  const getLayerMarkers = (layerId: string): MapMarker[] => {
    return project.markers.filter((m) => {
      if (m.layerId) return m.layerId === layerId;
      return layerId === defaultFallbackLayerId;
    });
  };

  // Marcador selecionado atualmente no canvas e sua camada correspondente
  const selectedMarker = selectedMarkerId
    ? project.markers.find((m) => m.id === selectedMarkerId) || null
    : null;
  const selectedMarkerLayerId = selectedMarker
    ? selectedMarker.layerId || defaultFallbackLayerId
    : null;

  // Quando seleciona um marcador no canvas, garante que o grupo pai esteja expandido
  useEffect(() => {
    if (!selectedMarkerLayerId) return;
    const targetLayer = rawLayers.find((l) => l.id === selectedMarkerLayerId);
    if (targetLayer?.groupId) {
      const parentGroup = rawLayers.find((g) => g.id === targetLayer.groupId);
      if (parentGroup && parentGroup.expanded === false) {
        onUpdateProject({
          markerLayers: rawLayers.map((l) =>
            l.id === parentGroup.id ? { ...l, expanded: true } : l
          ),
        });
      }
    }
  }, [selectedMarkerId]);

  const setActiveLayer = (id: string) => {
    onUpdateProject({
      markerLayers: rawLayers,
      activeMarkerLayerId: id,
    });
  };

  const toggleSelectLayer = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedLayerIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllLayers = () => {
    const allSelectableIds = layers.filter((l) => !l.isGroup).map((l) => l.id);
    if (selectedLayerIds.length === allSelectableIds.length && allSelectableIds.length > 0) {
      setSelectedLayerIds([]);
    } else {
      setSelectedLayerIds(allSelectableIds);
    }
  };

  const addLayer = (parentGroupId?: string) => {
    const nonGroupCount = layers.filter((l) => !l.isGroup).length;
    const maxOrder = layers.reduce((max, l) => Math.max(max, l.order ?? 0), 0);
    const newLayer: MarkerLayer = {
      id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Camada ${nonGroupCount + 1}`,
      visible: true,
      locked: false,
      order: maxOrder + 10,
      color: LAYER_COLORS[nonGroupCount % LAYER_COLORS.length],
      groupId: parentGroupId,
    };
    const nextVisual = [newLayer, ...layers];
    const normalized = normalizeLayersOrderFromVisualList(nextVisual);
    onUpdateProject({
      markerLayers: normalized,
      activeMarkerLayerId: newLayer.id,
    });
    showToast?.(`✨ "${newLayer.name}" criada no topo!`);
  };

  const addGroup = () => {
    const groupCount = layers.filter((l) => l.isGroup).length;
    const maxOrder = layers.reduce((max, l) => Math.max(max, l.order ?? 0), 0);
    const newGroup: MarkerLayer = {
      id: `group-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: `Grupo ${groupCount + 1}`,
      visible: true,
      locked: false,
      order: maxOrder + 10,
      color: LAYER_COLORS[(groupCount + 3) % LAYER_COLORS.length],
      isGroup: true,
      expanded: true,
    };

    let updatedVisual = [newGroup, ...layers];
    if (selectedLayerIds.length > 0) {
      updatedVisual = updatedVisual.map((l) =>
        selectedLayerIds.includes(l.id) && !l.isGroup ? { ...l, groupId: newGroup.id } : l
      );
      setSelectedLayerIds([]);
      showToast?.(`📁 Grupo "${newGroup.name}" criado com ${selectedLayerIds.length} camada(s)!`);
    } else {
      showToast?.(`📁 Grupo "${newGroup.name}" criado!`);
    }

    onUpdateProject({
      markerLayers: normalizeLayersOrderFromVisualList(updatedVisual),
    });
  };

  const mergeSelectedLayers = () => {
    const validIds = selectedLayerIds.filter((id) => {
      const l = layers.find((item) => item.id === id);
      return l && !l.isGroup;
    });
    if (validIds.length < 2) {
      showToast?.('Selecione pelo menos 2 camadas (não grupos) para mesclar.');
      return;
    }

    // Mantém a camada mais ao topo (primeira na ordem visual) como destino
    const sortedSelected = layers.filter((l) => validIds.includes(l.id));
    const targetLayer = sortedSelected[0];
    const sourceIds = sortedSelected.slice(1).map((l) => l.id);

    const updatedMarkers = project.markers.map((m) => {
      const effectiveMId = m.layerId || defaultFallbackLayerId;
      if (effectiveMId && sourceIds.includes(effectiveMId)) {
        return { ...m, layerId: targetLayer.id };
      }
      return m;
    });

    const remainingVisual = layers.filter((l) => !sourceIds.includes(l.id));
    onUpdateProject({
      markerLayers: normalizeLayersOrderFromVisualList(remainingVisual),
      markers: updatedMarkers,
      activeMarkerLayerId: targetLayer.id,
    });
    setSelectedLayerIds([]);
    showToast?.(`🔗 ${validIds.length} camadas mescladas em "${targetLayer.name}"!`);
  };

  const clearLayerMarkers = (layerId: string) => {
    const targetLayer = layers.find((l) => l.id === layerId);
    if (!targetLayer) return;

    let layerIdsToClear = [layerId];
    if (targetLayer.isGroup) {
      const childIds = layers.filter((l) => l.groupId === layerId).map((l) => l.id);
      layerIdsToClear = [layerId, ...childIds];
    }

    const updatedMarkers = project.markers.filter((m) => {
      const mLayerId = m.layerId || defaultFallbackLayerId;
      return !layerIdsToClear.includes(mLayerId);
    });

    const removedCount = project.markers.length - updatedMarkers.length;
    if (selectedMarkerId && !updatedMarkers.some((m) => m.id === selectedMarkerId)) {
      onSelectMarker(null);
    }

    onUpdateProject({
      markerLayers: rawLayers,
      markers: updatedMarkers,
    });
    showToast?.(`🧹 ${removedCount} marcador(es) removido(s) de "${targetLayer.name}".`);
  };

  const executeDeleteLayer = (id: string, mode: 'delete_markers' | 'transfer_markers') => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;

    if (target.isGroup) {
      const childLayers = layers.filter((l) => l.groupId === id);
      const childIds = childLayers.map((l) => l.id);
      if (mode === 'delete_markers') {
        const remainingVisual = layers.filter((l) => l.id !== id && !childIds.includes(l.id));
        const finalLayers =
          remainingVisual.filter((l) => !l.isGroup).length > 0
            ? normalizeLayersOrderFromVisualList(remainingVisual)
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
        const nextMarkers = project.markers.filter((m) => {
          const mLayer = m.layerId || defaultFallbackLayerId;
          return mLayer !== id && !childIds.includes(mLayer);
        });
        if (selectedMarkerId && !nextMarkers.some((m) => m.id === selectedMarkerId)) {
          onSelectMarker(null);
        }
        const nextActive =
          finalLayers.find((l) => !l.isGroup)?.id || finalLayers[0].id;
        onUpdateProject({
          markerLayers: finalLayers,
          markers: nextMarkers,
          activeMarkerLayerId:
            activeLayerId === id || childIds.includes(activeLayerId) ? nextActive : activeLayerId,
        });
        showToast?.(`🗑️ Grupo "${target.name}" e seus marcadores foram excluídos.`);
      } else {
        // Desagrupa as camadas filhas e remove apenas a pasta
        const updatedVisual = layers
          .filter((l) => l.id !== id)
          .map((l) => (l.groupId === id ? { ...l, groupId: undefined } : l));
        onUpdateProject({
          markerLayers: normalizeLayersOrderFromVisualList(updatedVisual),
        });
        showToast?.(`📁 Grupo "${target.name}" removido (camadas internas mantidas).`);
      }
      setPendingDeleteLayerId(null);
      setSelectedLayerIds((prev) => prev.filter((item) => item !== id));
      return;
    }

    const remainingVisual = layers.filter((l) => l.id !== id);
    const hasRemainingNonGroup = remainingVisual.some((l) => !l.isGroup);
    const finalLayers: MarkerLayer[] = hasRemainingNonGroup
      ? normalizeLayersOrderFromVisualList(remainingVisual)
      : [
          ...normalizeLayersOrderFromVisualList(remainingVisual),
          {
            id: 'layer-default',
            name: 'Camada Padrão',
            visible: true,
            locked: false,
            order: 0,
            color: '#3b82f6',
          },
        ];

    const fallbackActive =
      finalLayers.find((l) => !l.isGroup)?.id || finalLayers[0].id;

    let updatedMarkers: MapMarker[];
    if (mode === 'delete_markers') {
      updatedMarkers = project.markers.filter((m) => {
        const mLayerId = m.layerId || defaultFallbackLayerId;
        return mLayerId !== id;
      });
      if (selectedMarkerId && !updatedMarkers.some((m) => m.id === selectedMarkerId)) {
        onSelectMarker(null);
      }
    } else {
      updatedMarkers = project.markers.map((m) => {
        const mLayerId = m.layerId || defaultFallbackLayerId;
        return mLayerId === id ? { ...m, layerId: fallbackActive } : m;
      });
    }

    onUpdateProject({
      markerLayers: finalLayers,
      markers: updatedMarkers,
      activeMarkerLayerId: activeLayerId === id ? fallbackActive : activeLayerId,
    });
    setPendingDeleteLayerId(null);
    setSelectedLayerIds((prev) => prev.filter((item) => item !== id));
    showToast?.(
      mode === 'delete_markers'
        ? `🗑️ Camada "${target.name}" e seus marcadores foram excluídos.`
        : `↪️ Camada "${target.name}" excluída (marcadores movidos).`
    );
  };

  const handleRequestDeleteLayer = (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;

    if (target.isGroup) {
      const childLayers = layers.filter((l) => l.groupId === id);
      const totalGroupMarkers = childLayers.reduce(
        (acc, c) => acc + getLayerMarkers(c.id).length,
        0
      );
      if (totalGroupMarkers > 0) {
        setPendingDeleteLayerId(id);
        return;
      }
      executeDeleteLayer(id, 'transfer_markers');
      return;
    }

    const mCount = getLayerMarkers(id).length;
    if (mCount > 0) {
      setPendingDeleteLayerId(id);
      return;
    }
    executeDeleteLayer(id, 'delete_markers');
  };

  const executeBatchDeleteSelected = (mode: 'delete_markers' | 'transfer_markers') => {
    if (selectedLayerIds.length === 0) return;
    const toDeleteSet = new Set(selectedLayerIds);

    const remainingVisual = layers.filter((l) => !toDeleteSet.has(l.id));
    const hasRemainingNonGroup = remainingVisual.some((l) => !l.isGroup);
    const finalLayers: MarkerLayer[] = hasRemainingNonGroup
      ? normalizeLayersOrderFromVisualList(remainingVisual)
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

    const fallbackActive =
      finalLayers.find((l) => !l.isGroup)?.id || finalLayers[0].id;

    let updatedMarkers: MapMarker[];
    if (mode === 'delete_markers') {
      updatedMarkers = project.markers.filter((m) => {
        const mLayerId = m.layerId || defaultFallbackLayerId;
        return !toDeleteSet.has(mLayerId);
      });
      if (selectedMarkerId && !updatedMarkers.some((m) => m.id === selectedMarkerId)) {
        onSelectMarker(null);
      }
    } else {
      updatedMarkers = project.markers.map((m) => {
        const mLayerId = m.layerId || defaultFallbackLayerId;
        return toDeleteSet.has(mLayerId) ? { ...m, layerId: fallbackActive } : m;
      });
    }

    onUpdateProject({
      markerLayers: finalLayers,
      markers: updatedMarkers,
      activeMarkerLayerId: toDeleteSet.has(activeLayerId) ? fallbackActive : activeLayerId,
    });
    const count = selectedLayerIds.length;
    setSelectedLayerIds([]);
    setPendingBatchDelete(false);
    showToast?.(
      mode === 'delete_markers'
        ? `🗑️ ${count} camada(s) e seus marcadores foram excluídos.`
        : `↪️ ${count} camada(s) excluída(s) (marcadores preservados).`
    );
  };

  const toggleVisibility = (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    const nextVis = !target.visible;

    const updated = layers.map((l) => {
      if (l.id === id) return { ...l, visible: nextVis };
      if (target.isGroup && l.groupId === id) return { ...l, visible: nextVis };
      return l;
    });
    onUpdateProject({ markerLayers: updated });
  };

  const toggleLock = (id: string) => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;
    const nextLock = !target.locked;

    const updated = layers.map((l) => {
      if (l.id === id) return { ...l, locked: nextLock };
      if (target.isGroup && l.groupId === id) return { ...l, locked: nextLock };
      return l;
    });
    onUpdateProject({ markerLayers: updated });
  };

  const toggleGroupExpand = (groupId: string) => {
    const updated = layers.map((l) =>
      l.id === groupId ? { ...l, expanded: l.expanded === false ? true : false } : l
    );
    onUpdateProject({ markerLayers: updated });
  };

  const assignLayerToGroup = (layerId: string, groupId: string | undefined) => {
    const updated = layers.map((l) => (l.id === layerId ? { ...l, groupId } : l));
    onUpdateProject({ markerLayers: normalizeLayersOrderFromVisualList(updated) });
  };

  /**
   * Move uma camada ou grupo para cima ('up' = mais à frente no mapa)
   * ou para baixo ('down' = mais ao fundo no mapa) dentro do mesmo nível (raiz ou mesmo grupo).
   */
  const moveItemOrder = (id: string, dir: 'up' | 'down') => {
    const target = layers.find((l) => l.id === id);
    if (!target) return;

    // Irmãos do mesmo contexto (raiz ou dentro do mesmo grupo)
    const siblings = layers.filter((l) => (l.groupId || undefined) === (target.groupId || undefined));
    const siblingIdx = siblings.findIndex((s) => s.id === id);
    if (siblingIdx < 0) return;

    const swapSiblingIdx = dir === 'up' ? siblingIdx - 1 : siblingIdx + 1;
    if (swapSiblingIdx < 0 || swapSiblingIdx >= siblings.length) return;

    const siblingToSwap = siblings[swapSiblingIdx];
    const visualList = [...layers];
    const idxA = visualList.findIndex((l) => l.id === target.id);
    const idxB = visualList.findIndex((l) => l.id === siblingToSwap.id);
    if (idxA < 0 || idxB < 0) return;

    const temp = visualList[idxA];
    visualList[idxA] = visualList[idxB];
    visualList[idxB] = temp;

    const normalized = normalizeLayersOrderFromVisualList(visualList);
    onUpdateProject({ markerLayers: normalized });
  };

  const handleDropLayerOnTarget = (sourceId: string, targetId: string) => {
    if (!sourceId || sourceId === targetId) return;
    const sourceLayer = layers.find((l) => l.id === sourceId);
    const targetLayer = layers.find((l) => l.id === targetId);
    if (!sourceLayer || !targetLayer) return;

    const visualList = layers.filter((l) => l.id !== sourceId);
    const targetIdx = visualList.findIndex((l) => l.id === targetId);
    if (targetIdx < 0) return;

    const updatedSource: MarkerLayer = {
      ...sourceLayer,
      groupId: sourceLayer.isGroup ? undefined : targetLayer.isGroup ? targetLayer.expanded !== false ? targetLayer.groupId : undefined : targetLayer.groupId,
    };

    visualList.splice(targetIdx, 0, updatedSource);
    const normalized = normalizeLayersOrderFromVisualList(visualList);
    onUpdateProject({ markerLayers: normalized });
  };

  const startRename = (layer: MarkerLayer) => {
    setEditingLayerId(layer.id);
    setEditingName(layer.name);
  };

  const saveRename = (id: string) => {
    if (editingName.trim()) {
      const updated = layers.map((l) =>
        l.id === id ? { ...l, name: editingName.trim() } : l
      );
      onUpdateProject({ markerLayers: updated });
    }
    setEditingLayerId(null);
  };

  const moveMarkerToLayer = (markerId: string, targetLayerId: string) => {
    const updatedMarkers = project.markers.map((m) =>
      m.id === markerId ? { ...m, layerId: targetLayerId } : m
    );
    onUpdateProject({
      markerLayers: rawLayers,
      markers: updatedMarkers,
      activeMarkerLayerId: targetLayerId,
    });
  };

  const deleteSingleMarker = (markerId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedMarkers = project.markers.filter((m) => m.id !== markerId);
    if (selectedMarkerId === markerId) {
      onSelectMarker(null);
    }
    onUpdateProject({
      markerLayers: rawLayers,
      markers: updatedMarkers,
    });
    showToast?.('🗑️ Marcador removido da camada.');
  };

  const toggleExpandMarkersList = (id: string) => {
    setExpandedLayerIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const groups = layers.filter((l) => l.isGroup);
  const rootItems = layers.filter((l) => !l.groupId);
  const selectableNonGroupCount = layers.filter((l) => !l.isGroup).length;

  const renderLayerItem = (layer: MarkerLayer, isChild = false) => {
    const isActive = layer.id === activeLayerId;
    const isChecked = selectedLayerIds.includes(layer.id);
    const layerMarkers = getLayerMarkers(layer.id);
    const hasSelectedCanvasMarker =
      Boolean(selectedMarkerId) && selectedMarkerLayerId === layer.id;
    const isExpanded = expandedLayerIds[layer.id] ?? hasSelectedCanvasMarker;
    const isNatureLayer = layer.id === NATURE_LAYER_ID;
    const isPendingDelete = pendingDeleteLayerId === layer.id;

    const siblings = layers.filter(
      (l) => (l.groupId || undefined) === (layer.groupId || undefined)
    );
    const siblingIdx = siblings.findIndex((s) => s.id === layer.id);
    const isFirstSibling = siblingIdx <= 0;
    const isLastSibling = siblingIdx >= siblings.length - 1;

    return (
      <div
        key={layer.id}
        draggable={editingLayerId !== layer.id}
        onDragStart={(e) => {
          setDraggedLayerId(layer.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (draggedLayerId && draggedLayerId !== layer.id) {
            setDragOverLayerId(layer.id);
          }
        }}
        onDragLeave={() => {
          if (dragOverLayerId === layer.id) setDragOverLayerId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (draggedLayerId && draggedLayerId !== layer.id) {
            handleDropLayerOnTarget(draggedLayerId, layer.id);
          }
          setDraggedLayerId(null);
          setDragOverLayerId(null);
        }}
        onDragEnd={() => {
          setDraggedLayerId(null);
          setDragOverLayerId(null);
        }}
        className={`rounded-xl border transition-all overflow-hidden ${
          isChild ? 'ml-4 border-l-2' : ''
        } ${
          dragOverLayerId === layer.id
            ? 'border-amber-400 ring-2 ring-amber-400/40 bg-amber-950/20'
            : isActive
            ? 'bg-sky-950/35 border-sky-500/60 shadow-md shadow-sky-950/30'
            : hasSelectedCanvasMarker
            ? 'bg-indigo-950/30 border-indigo-400/60'
            : isNatureLayer
            ? 'bg-emerald-950/20 border-emerald-500/40'
            : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700'
        }`}
        style={isChild ? { borderLeftColor: layer.color || '#3b82f6' } : undefined}
      >
        {/* Row Principal da Camada */}
        <div
          onClick={() => setActiveLayer(layer.id)}
          className="p-2 flex items-center gap-1.5 cursor-pointer select-none"
        >
          {/* Checkbox para Mesclar / Agrupar / Excluir em lote */}
          <button
            type="button"
            onClick={(e) => toggleSelectLayer(layer.id, e)}
            className={`p-0.5 rounded transition-colors cursor-pointer ${
              isChecked ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'
            }`}
            title="Selecionar camada para ação em lote (Agrupar, Mesclar ou Excluir)"
          >
            {isChecked ? (
              <CheckSquare className="w-3.5 h-3.5" />
            ) : (
              <Square className="w-3.5 h-3.5" />
            )}
          </button>

          {isChild && <CornerDownRight className="w-3 h-3 text-slate-500 shrink-0" />}

          {/* Indicador de Camada Ativa */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveLayer(layer.id);
            }}
            className={`w-4 h-4 rounded-full flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
              isActive
                ? 'bg-sky-500 border-white text-slate-950 shadow-sm shadow-sky-400/50'
                : 'border-slate-600 bg-slate-900 hover:border-slate-400'
            }`}
            title={isActive ? 'Camada Ativa para novos marcadores' : 'Definir como Camada Ativa'}
          >
            {isActive && <Check className="w-2.5 h-2.5 stroke-[3]" />}
          </button>

          {/* Cor da Camada */}
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: layer.color || '#3b82f6' }}
          />

          {/* Nome da Camada */}
          <div className="flex-1 min-w-0">
            {editingLayerId === layer.id ? (
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => saveRename(layer.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveRename(layer.id);
                  if (e.key === 'Escape') setEditingLayerId(null);
                }}
                onClick={(e) => e.stopPropagation()}
                autoFocus
                className="w-full px-1.5 py-0.5 text-xs bg-slate-900 border border-sky-500 rounded text-white focus:outline-none"
              />
            ) : (
              <div className="flex items-center gap-1.5">
                <span
                  className={`text-xs font-semibold truncate ${
                    !layer.visible
                      ? 'text-slate-500 line-through'
                      : isActive
                      ? 'text-sky-300'
                      : 'text-slate-200'
                  }`}
                >
                  {layer.name}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    layerMarkers.length > 0
                      ? 'bg-slate-800 text-sky-300 border border-slate-700'
                      : 'bg-slate-900 text-slate-500'
                  }`}
                >
                  {layerMarkers.length}
                </span>
                {isActive && (
                  <span className="text-[8px] px-1 py-0.2 rounded bg-sky-500/20 text-sky-300 border border-sky-500/40 font-bold uppercase shrink-0">
                    Ativa
                  </span>
                )}
                {hasSelectedCanvasMarker && !isActive && (
                  <span className="text-[8px] px-1 py-0.2 rounded bg-indigo-500/25 text-indigo-300 border border-indigo-400/40 font-bold uppercase shrink-0">
                    Sel
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Controles Rápidos da Camada */}
          <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
            {/* Seletor rápido de Grupo */}
            {groups.length > 0 && (
              <select
                value={layer.groupId || ''}
                onChange={(e) => assignLayerToGroup(layer.id, e.target.value || undefined)}
                className="bg-slate-900 border border-slate-800 rounded text-[9px] text-slate-400 px-1 py-0.5 max-w-[62px] truncate cursor-pointer"
                title="Mover camada para um Grupo"
              >
                <option value="">Sem grupo</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    📁 {g.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => toggleVisibility(layer.id)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                layer.visible
                  ? 'text-slate-300 hover:text-white hover:bg-slate-800'
                  : 'text-rose-400 bg-rose-950/30 hover:bg-rose-950/50'
              }`}
              title={layer.visible ? 'Ocultar camada no mapa' : 'Mostrar camada no mapa'}
            >
              {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => toggleLock(layer.id)}
              className={`p-1 rounded transition-colors cursor-pointer ${
                layer.locked
                  ? 'text-amber-400 bg-amber-950/30 hover:bg-amber-950/50'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={layer.locked ? 'Desbloquear camada' : 'Bloquear camada contra edições'}
            >
              {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => startRename(layer)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Renomear camada"
            >
              <Edit2 className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => moveItemOrder(layer.id, 'up')}
              disabled={isFirstSibling}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer"
              title="Subir camada (Trazer para frente no mapa)"
            >
              <ArrowUp className="w-3 h-3" />
            </button>

            <button
              type="button"
              onClick={() => moveItemOrder(layer.id, 'down')}
              disabled={isLastSibling}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-25 transition-colors cursor-pointer"
              title="Descer camada (Enviar para trás no mapa)"
            >
              <ArrowDown className="w-3 h-3" />
            </button>

            {layerMarkers.length > 0 && (
              <button
                type="button"
                onClick={() => clearLayerMarkers(layer.id)}
                className="p-1 rounded text-slate-400 hover:text-amber-300 hover:bg-amber-950/40 transition-colors cursor-pointer"
                title={`Esvaziar / limpar os ${layerMarkers.length} marcador(es) desta camada`}
              >
                <Eraser className="w-3 h-3" />
              </button>
            )}

            <button
              type="button"
              onClick={() => handleRequestDeleteLayer(layer.id)}
              className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors cursor-pointer"
              title="Excluir camada"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Barra de Confirmação Inline para Exclusão de Camada com Marcadores */}
        {isPendingDelete && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-2 bg-rose-950/60 border-t border-rose-500/40 flex flex-col gap-1.5"
          >
            <div className="flex items-center gap-1.5 text-[10px] text-rose-200 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>
                Esta camada possui {layerMarkers.length} marcador(es). Como deseja excluir?
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => executeDeleteLayer(layer.id, 'delete_markers')}
                className="flex-1 py-1 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer shadow-sm"
              >
                <Trash2 className="w-3 h-3" />
                <span>Excluir Tudo ({layerMarkers.length})</span>
              </button>
              {selectableNonGroupCount > 1 && (
                <button
                  type="button"
                  onClick={() => executeDeleteLayer(layer.id, 'transfer_markers')}
                  className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                >
                  <ArrowRightLeft className="w-3 h-3" />
                  <span>Mover p/ Outra</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setPendingDeleteLayerId(null)}
                className="py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[10px] font-semibold cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Expansor de Marcadores da Camada */}
        {layerMarkers.length > 0 && (
          <div className="border-t border-slate-800/60 bg-slate-900/40 px-2 py-1">
            <button
              type="button"
              onClick={() => toggleExpandMarkersList(layer.id)}
              className="w-full flex items-center justify-between text-[10px] text-slate-400 hover:text-slate-200 py-0.5 cursor-pointer"
            >
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                {isExpanded ? 'Ocultar marcadores' : `Ver ${layerMarkers.length} marcador(es)`}
              </span>
              <span>{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
              <div className="mt-1.5 space-y-1 max-h-44 overflow-y-auto pr-1 pb-1">
                {layerMarkers.map((m) => {
                  const isMarkerSelected = m.id === selectedMarkerId;
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        onSelectMarker(m.id);
                        setActiveLayer(layer.id);
                      }}
                      className={`p-1.5 rounded-lg border flex items-center justify-between gap-1.5 text-[11px] cursor-pointer transition-all ${
                        isMarkerSelected
                          ? 'bg-sky-500/20 border-sky-400 text-white font-semibold'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-300 hover:bg-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        {m.customIconPng ? (
                          <img
                            src={m.customIconPng}
                            alt={m.name}
                            className="w-4 h-4 object-contain shrink-0"
                          />
                        ) : (
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: m.color || '#f59e0b' }}
                          />
                        )}
                        <span className="truncate">{m.name}</span>
                      </div>

                      <div
                        className="flex items-center gap-1 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Trocar marcador de camada */}
                        <select
                          value={layer.id}
                          onChange={(e) => moveMarkerToLayer(m.id, e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded text-[9px] text-slate-300 px-1 py-0.5 cursor-pointer"
                          title="Mover marcador para outra camada"
                        >
                          {layers
                            .filter((l) => !l.isGroup)
                            .map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          onClick={(e) => deleteSingleMarker(m.id, e)}
                          className="p-0.5 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 cursor-pointer"
                          title="Excluir este marcador"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3 text-xs">
      {/* Header: Camadas & Grupos */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white leading-tight">Camadas & Grupos</h3>
              <p className="text-[10px] text-slate-400">
                Topo da lista = Frente no mapa • Base = Fundo
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSelectAllLayers}
              className="px-2 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[10px] flex items-center gap-1 transition-all border border-slate-700 cursor-pointer"
              title="Selecionar ou desmarcar todas as camadas"
            >
              <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>
                {selectedLayerIds.length > 0 &&
                selectedLayerIds.length === selectableNonGroupCount
                  ? 'Desmarcar'
                  : 'Todas'}
              </span>
            </button>
            <button
              type="button"
              onClick={addGroup}
              className="px-2.5 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white font-bold text-[11px] flex items-center gap-1 shadow-md transition-all cursor-pointer"
              title="Criar novo Grupo / Pasta de Camadas"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>Grupo</span>
            </button>
            <button
              type="button"
              onClick={() => addLayer()}
              className="px-2.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 shadow-md transition-all cursor-pointer"
              title="Criar nova Camada no topo"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Camada</span>
            </button>
          </div>
        </div>

        {/* Barra de Ação para Camadas Selecionadas (Mesclar / Agrupar / Excluir) */}
        {selectedLayerIds.length > 0 && (
          <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-2 animate-fade-in">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[11px] text-amber-200 font-semibold">
                {selectedLayerIds.length} selecionada(s)
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {selectedLayerIds.length >= 2 && (
                  <button
                    type="button"
                    onClick={mergeSelectedLayers}
                    className="px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                    title="Unir todas as camadas selecionadas em uma única camada"
                  >
                    <Combine className="w-3 h-3" />
                    <span>Mesclar ({selectedLayerIds.length})</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={addGroup}
                  className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                  title="Mover selecionadas para um novo grupo"
                >
                  <FolderPlus className="w-3 h-3" />
                  <span>Agrupar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPendingBatchDelete(true)}
                  className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
                  title="Excluir camadas selecionadas"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Excluir ({selectedLayerIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLayerIds([]);
                    setPendingBatchDelete(false);
                  }}
                  className="px-1.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {pendingBatchDelete && (
              <div className="pt-1.5 border-t border-amber-500/30 flex items-center justify-between gap-1.5 flex-wrap">
                <span className="text-[10px] text-rose-200 font-bold">
                  O que fazer com os marcadores das {selectedLayerIds.length} camadas?
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => executeBatchDeleteSelected('delete_markers')}
                    className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer"
                  >
                    🗑️ Excluir Marcadores Junto
                  </button>
                  <button
                    type="button"
                    onClick={() => executeBatchDeleteSelected('transfer_markers')}
                    className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-bold text-[10px] cursor-pointer"
                  >
                    ↪️ Preservar Marcadores
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista Hierárquica de Grupos e Camadas */}
        <div className="space-y-1.5 pt-1">
          {rootItems.map((item) => {
            if (item.isGroup) {
              const childLayers = layers.filter((l) => l.groupId === item.id);
              const isGroupExpanded = item.expanded !== false;
              const totalGroupMarkers = childLayers.reduce(
                (acc, c) => acc + getLayerMarkers(c.id).length,
                0
              );
              const isPendingGroupDelete = pendingDeleteLayerId === item.id;
              const rootSiblings = layers.filter((l) => !l.groupId);
              const rootIdx = rootSiblings.findIndex((s) => s.id === item.id);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-indigo-500/40 bg-indigo-950/15 overflow-hidden space-y-1 p-1.5"
                >
                  {/* Cabeçalho do Grupo */}
                  <div className="flex items-center gap-1.5 px-1 py-1 select-none">
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(item.id)}
                      className="p-0.5 rounded text-indigo-300 hover:text-white cursor-pointer"
                    >
                      {isGroupExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(item.id)}
                      className="flex items-center gap-1.5 flex-1 min-w-0 text-left cursor-pointer"
                    >
                      {isGroupExpanded ? (
                        <FolderOpen
                          className="w-4 h-4 shrink-0"
                          style={{ color: item.color || '#818cf8' }}
                        />
                      ) : (
                        <Folder
                          className="w-4 h-4 shrink-0"
                          style={{ color: item.color || '#818cf8' }}
                        />
                      )}

                      {editingLayerId === item.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => saveRename(item.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') saveRename(item.id);
                            if (e.key === 'Escape') setEditingLayerId(null);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          autoFocus
                          className="w-full px-1.5 py-0.5 text-xs bg-slate-900 border border-indigo-500 rounded text-white focus:outline-none"
                        />
                      ) : (
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-xs font-bold text-indigo-200 truncate">
                            {item.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-900/60 text-indigo-300 font-mono">
                            {childLayers.length} cam • {totalGroupMarkers} obj
                          </span>
                        </div>
                      )}
                    </button>

                    {/* Ações do Grupo */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => addLayer(item.id)}
                        className="p-1 rounded text-indigo-300 hover:text-white hover:bg-indigo-900/50 cursor-pointer"
                        title="Nova camada dentro deste grupo"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleVisibility(item.id)}
                        className={`p-1 rounded cursor-pointer ${
                          item.visible ? 'text-slate-300 hover:text-white' : 'text-rose-400'
                        }`}
                        title="Alternar visibilidade de todo o grupo"
                      >
                        {item.visible ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleLock(item.id)}
                        className={`p-1 rounded cursor-pointer ${
                          item.locked ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                        }`}
                        title="Bloquear/Desbloquear todo o grupo"
                      >
                        {item.locked ? (
                          <Lock className="w-3.5 h-3.5" />
                        ) : (
                          <Unlock className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => startRename(item)}
                        className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                        title="Renomear grupo"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItemOrder(item.id, 'up')}
                        disabled={rootIdx <= 0}
                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-25 cursor-pointer"
                        title="Subir grupo"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItemOrder(item.id, 'down')}
                        disabled={rootIdx >= rootSiblings.length - 1}
                        className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-25 cursor-pointer"
                        title="Descer grupo"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRequestDeleteLayer(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Excluir grupo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Confirmação de exclusão do Grupo */}
                  {isPendingGroupDelete && (
                    <div className="px-2.5 py-2 bg-rose-950/60 border border-rose-500/40 rounded-lg flex flex-col gap-1.5">
                      <span className="text-[10px] text-rose-200 font-bold">
                        Este grupo contém {childLayers.length} camada(s) e {totalGroupMarkers} marcador(es):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => executeDeleteLayer(item.id, 'delete_markers')}
                          className="flex-1 py-1 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] cursor-pointer"
                        >
                          🗑️ Excluir Grupo + Camadas ({totalGroupMarkers})
                        </button>
                        <button
                          type="button"
                          onClick={() => executeDeleteLayer(item.id, 'transfer_markers')}
                          className="flex-1 py-1 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-500/30 font-bold text-[10px] cursor-pointer"
                        >
                          📁 Apenas Desagrupar
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingDeleteLayerId(null)}
                          className="py-1 px-2 rounded-lg bg-slate-900 text-slate-300 text-[10px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Camadas Filhas do Grupo */}
                  {isGroupExpanded && (
                    <div className="space-y-1 pt-0.5">
                      {childLayers.length === 0 ? (
                        <p className="text-[10px] text-slate-500 italic pl-6 py-1">
                          Grupo vazio. Use o seletor 📁 nas camadas ou clique em + acima.
                        </p>
                      ) : (
                        childLayers.map((child) => renderLayerItem(child, true))
                      )}
                    </div>
                  )}
                </div>
              );
            }

            return renderLayerItem(item, false);
          })}
        </div>
      </div>

      {/* Seção de Sobreposições de Efeito (Motion/Effect Overlays) */}
      {(project.motionOverlays || []).length > 0 && (
        <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/40 flex items-center justify-center text-fuchsia-400">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Sobreposições de Efeito</h4>
                <p className="text-[10px] text-slate-400">
                  Traçados contínuos de água, brilho, fumaça e vagalumes
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                onUpdateProject({ motionOverlays: [] });
                showToast?.('🧹 Todas as sobreposições de efeito foram removidas.');
              }}
              className="text-[10px] text-rose-400 hover:text-rose-300 px-2 py-1 rounded bg-rose-950/30 border border-rose-800/40 cursor-pointer"
            >
              Limpar Tudo
            </button>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {(project.motionOverlays || []).map((ov, idx) => {
              const isVisible = ov.visible !== false;
              const currentScale = ov.scale ?? 1.0;

              return (
                <div
                  key={ov.id}
                  className="p-2 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-fuchsia-300 truncate">
                      #{idx + 1} • {ov.name || `Efeito ${ov.effect}`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (project.motionOverlays || []).map((item) =>
                            item.id === ov.id ? { ...item, visible: !isVisible } : item
                          );
                          onUpdateProject({ motionOverlays: updated });
                        }}
                        className={`p-1 rounded cursor-pointer ${
                          isVisible ? 'text-slate-300 hover:text-white' : 'text-rose-400'
                        }`}
                        title={isVisible ? 'Ocultar efeito' : 'Mostrar efeito'}
                      >
                        {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = (project.motionOverlays || []).filter(
                            (item) => item.id !== ov.id
                          );
                          onUpdateProject({ motionOverlays: updated });
                        }}
                        className="p-1 rounded text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Excluir sobreposição"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Controle Proporcional de Escala da Sobreposição */}
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] text-slate-400 w-14 shrink-0">
                      Escala: {Math.round(currentScale * 100)}%
                    </span>
                    <input
                      type="range"
                      min={0.2}
                      max={3.0}
                      step={0.05}
                      value={currentScale}
                      onChange={(e) => {
                        const newScale = parseFloat(e.target.value);
                        const updated = (project.motionOverlays || []).map((item) =>
                          item.id === ov.id ? { ...item, scale: newScale } : item
                        );
                        onUpdateProject({ motionOverlays: updated });
                      }}
                      className="flex-1 accent-fuchsia-500 h-1 bg-slate-800 rounded-lg cursor-pointer"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
