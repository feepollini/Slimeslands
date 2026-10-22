import { useRef, useCallback } from 'react';
import type { MapProject, BiomeTileConfig, SubBiomeConfig } from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import { clampMapDimensions } from '../utils/terrainTextures';

interface UseBiomeManagerProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
}

export function useBiomeManager({ project, setProject }: UseBiomeManagerProps) {
  const globalUploadRef = useRef<HTMLInputElement>(null);

  const handleAddBiomeFromPNG = useCallback((
    tilePng: string,
    name: string,
    tileWidth: number,
    tileHeight: number,
    baseColor?: string
  ) => {
    const clamped = clampMapDimensions(tileWidth > 0 ? tileWidth : 64, tileHeight > 0 ? tileHeight : 64, 5000);
    const maxSafeRepeats = Math.max(1, Math.min(8, Math.floor(5000 / Math.max(32, clamped.height))));
    const newBiome: BiomeTileConfig = {
      id: `biome-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name || `Bioma ${project.biomes.length + 1}`,
      tilePng,
      tileWidth: clamped.width,
      tileHeight: clamped.height,
      tileRepeatCount: maxSafeRepeats,
      transitionBlendRows: 1,
      baseColor: baseColor || '#26421a',
    };

    setProject((prev) => ({
      ...prev,
      biomes: [...prev.biomes, newBiome],
    }));
  }, [project.biomes.length, setProject]);

  const handleUpdateBiome = useCallback((id: string, updates: Partial<BiomeTileConfig>) => {
    setProject((prev) => ({
      ...prev,
      biomes: prev.biomes.map((b) => {
        if (b.id !== id) return b;
        const next = { ...b, ...updates };
        const clamped = clampMapDimensions(next.tileWidth || 64, next.tileHeight || 64, 5000);
        next.tileWidth = clamped.width;
        next.tileHeight = clamped.height;
        const maxRepeats = Math.max(1, Math.floor(5000 / Math.max(32, next.tileHeight)));
        if ((next.tileRepeatCount || 1) > maxRepeats) {
          next.tileRepeatCount = maxRepeats;
        }
        return next;
      }),
    }));
  }, [setProject]);

  const handleRemoveBiome = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      biomes: prev.biomes.filter((b) => b.id !== id),
    }));
  }, [setProject]);

  const handleMoveBiome = useCallback((index: number, direction: 'up' | 'down') => {
    const newBiomes = [...project.biomes];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newBiomes.length) return;

    const temp = newBiomes[index];
    newBiomes[index] = newBiomes[targetIdx];
    newBiomes[targetIdx] = temp;

    setProject((prev) => ({ ...prev, biomes: newBiomes }));
  }, [project.biomes, setProject]);

  const handleAddSubBiome = useCallback((dataUrl: string, name: string, width: number, height: number) => {
    const clamped = clampMapDimensions(width > 0 ? width : 256, height > 0 ? height : 256, 5000);
    const newSubBiome: SubBiomeConfig = {
      id: `subbiome-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: name || `Sub-Bioma ${(project.subBiomes?.length || 0) + 1}`,
      tilePng: dataUrl,
      tileWidth: clamped.width,
      tileHeight: clamped.height,
      baseColor: '#3b0764',
    };

    setProject((prev) => ({
      ...prev,
      subBiomes: [...(prev.subBiomes || []), newSubBiome],
    }));
  }, [project.subBiomes?.length, setProject]);

  const handleUpdateSubBiome = useCallback((id: string, updates: Partial<SubBiomeConfig>) => {
    setProject((prev) => ({
      ...prev,
      subBiomes: (prev.subBiomes || []).map((sb) => {
        if (sb.id !== id) return sb;
        const next = { ...sb, ...updates };
        const clamped = clampMapDimensions(next.tileWidth || 400, next.tileHeight || 400, 5000);
        next.tileWidth = clamped.width;
        next.tileHeight = clamped.height;
        return next;
      }),
    }));
  }, [setProject]);

  const handleRemoveSubBiome = useCallback((id: string) => {
    setProject((prev) => ({
      ...prev,
      subBiomes: (prev.subBiomes || []).filter((sb) => sb.id !== id),
    }));
  }, [setProject]);

  const handleGlobalPNGUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const isExt = (project.canvasKind || 'vertical') === 'extended';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const res = await readUploadedImage(file);
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        if (isExt) {
          handleAddSubBiome(res.dataUrl, nameWithoutExt, res.width, res.height);
        } else {
          handleAddBiomeFromPNG(res.dataUrl, nameWithoutExt, res.width, res.height);
        }
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
  }, [project.canvasKind, handleAddSubBiome, handleAddBiomeFromPNG]);

  const handleDropPNG = useCallback((dataUrl: string, fileName: string) => {
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const isExt = (project.canvasKind || 'vertical') === 'extended';
    const img = new Image();
    img.onload = () => {
      if (isExt) {
        handleAddSubBiome(dataUrl, nameWithoutExt, img.naturalWidth || 256, img.naturalHeight || 256);
      } else {
        handleAddBiomeFromPNG(dataUrl, nameWithoutExt, img.naturalWidth || 64, img.naturalHeight || 64);
      }
    };
    img.onerror = () => {
      if (isExt) {
        handleAddSubBiome(dataUrl, nameWithoutExt, 256, 256);
      } else {
        handleAddBiomeFromPNG(dataUrl, nameWithoutExt, 64, 64);
      }
    };
    img.src = dataUrl;
  }, [project.canvasKind, handleAddSubBiome, handleAddBiomeFromPNG]);

  return {
    globalUploadRef,
    handleAddBiomeFromPNG,
    handleUpdateBiome,
    handleRemoveBiome,
    handleMoveBiome,
    handleAddSubBiome,
    handleUpdateSubBiome,
    handleRemoveSubBiome,
    handleGlobalPNGUpload,
    handleDropPNG,
  };
}
