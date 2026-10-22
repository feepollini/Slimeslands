import { useState, useCallback } from 'react';
import type { MapProject, MotionOverlayStroke } from '../types/map';

interface UseVfxOverlayManagerProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  pushHistory: (proj: MapProject) => void;
  showToast: (msg: string) => void;
}

export function useVfxOverlayManager({
  project,
  setProject,
  pushHistory,
  showToast,
}: UseVfxOverlayManagerProps) {
  const [effectBrushSize, setEffectBrushSize] = useState<number>(12);
  const [effectType, setEffectType] = useState<string>('smoke');
  const [effectSpeed, setEffectSpeed] = useState<number>(1.0);
  const [effectIntensity, setEffectIntensity] = useState<number>(1.0);
  const [effectScale, setEffectScale] = useState<number>(1.0);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  const handleUpdateOverlay = useCallback((id: string, updates: Partial<MotionOverlayStroke>) => {
    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      motionOverlays: (prev.motionOverlays || []).map((ov) =>
        ov.id === id ? { ...ov, ...updates } : ov
      ),
    }));
  }, [project, pushHistory, setProject]);

  const handleDeleteOverlay = useCallback((id: string) => {
    pushHistory(project);
    setProject((prev) => ({
      ...prev,
      motionOverlays: (prev.motionOverlays || []).filter((ov) => ov.id !== id),
    }));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
    showToast('Efeito excluído');
  }, [project, pushHistory, setProject, selectedOverlayId, showToast]);

  const handleDuplicateOverlay = useCallback((id: string) => {
    const src = (project.motionOverlays || []).find((ov) => ov.id === id);
    if (!src) return;
    pushHistory(project);
    const newId = `overlay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const copy: MotionOverlayStroke = {
      ...JSON.parse(JSON.stringify(src)),
      id: newId,
      name: `${src.name || src.effect} (Cópia)`,
      points: src.points.map((p) => ({ x: p.x + 24, y: p.y + 24 })),
      createdAt: Date.now(),
    };
    setProject((prev) => ({
      ...prev,
      motionOverlays: [...(prev.motionOverlays || []), copy],
    }));
    setSelectedOverlayId(newId);
    showToast('Efeito duplicado!');
  }, [project, pushHistory, setProject, showToast]);

  const handleMoveOverlayOrder = useCallback((id: string, direction: 'up' | 'down') => {
    const list = [...(project.motionOverlays || [])];
    const idx = list.findIndex((ov) => ov.id === id);
    if (idx === -1) return;
    if (direction === 'up' && idx < list.length - 1) {
      const temp = list[idx];
      list[idx] = list[idx + 1];
      list[idx + 1] = temp;
      pushHistory(project);
      setProject((prev) => ({ ...prev, motionOverlays: list }));
    } else if (direction === 'down' && idx > 0) {
      const temp = list[idx];
      list[idx] = list[idx - 1];
      list[idx - 1] = temp;
      pushHistory(project);
      setProject((prev) => ({ ...prev, motionOverlays: list }));
    }
  }, [project, pushHistory, setProject]);

  const handleClearAllOverlays = useCallback(() => {
    pushHistory(project);
    setProject((prev) => ({ ...prev, motionOverlays: [] }));
    setSelectedOverlayId(null);
    showToast('Todas as sobreposições de efeitos foram removidas');
  }, [pushHistory, setProject, showToast]);

  return {
    effectBrushSize,
    setEffectBrushSize,
    effectType,
    setEffectType,
    effectSpeed,
    setEffectSpeed,
    effectIntensity,
    setEffectIntensity,
    effectScale,
    setEffectScale,
    selectedOverlayId,
    setSelectedOverlayId,
    handleUpdateOverlay,
    handleDeleteOverlay,
    handleDuplicateOverlay,
    handleMoveOverlayOrder,
    handleClearAllOverlays,
    onUpdateOverlay: handleUpdateOverlay,
    onDeleteOverlay: handleDeleteOverlay,
    onDuplicateOverlay: handleDuplicateOverlay,
    onMoveOverlayOrder: handleMoveOverlayOrder,
    onClearAllOverlays: handleClearAllOverlays,
  };
}
