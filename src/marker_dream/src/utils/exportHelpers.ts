import { MapProject } from '../types/map';
import { getBiomeSegmentSpans, getTotalMapHeight } from './mapMath';
import { drawBiomeSpansWithFeather } from './canvasSeamBlend';

/**
 * Downloads the current map project configuration as a JSON file
 */
export function exportProjectJSON(project: MapProject) {
  const json = JSON.stringify(project, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_tiles.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Renders the entire vertical tile map to a high-res PNG and triggers download
 */
export async function exportMapToPNG(project: MapProject): Promise<void> {
  const totalWidth = project.mapWidth || 768;
  const totalHeight = getTotalMapHeight(project.biomes);
  const spans = getBiomeSegmentSpans(project.biomes);

  const canvas = document.createElement('canvas');
  canvas.width = totalWidth;
  canvas.height = totalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Pre-load biome and marker custom PNG images
  const loadedImages: { [id: string]: HTMLImageElement } = {};
  await Promise.all([
    ...project.biomes.map((biome) => {
      return new Promise<void>((resolve) => {
        const img = new Image();
        img.src = biome.tilePng;
        img.onload = () => {
          loadedImages[biome.id] = img;
          resolve();
        };
        img.onerror = () => resolve();
      });
    }),
    ...project.markers
      .filter((m) => Boolean(m.customIconPng))
      .map((marker) => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.src = marker.customIconPng!;
          img.onload = () => {
            loadedImages[`marker_${marker.id}`] = img;
            resolve();
          };
          img.onerror = () => resolve();
        });
      }),
  ]);

  // Render tile patterns at exact PNG dimensions with subtle seam feathering
  drawBiomeSpansWithFeather(ctx, spans, loadedImages, totalWidth);

  // Render routes
  const markerLookup = new Map(project.markers.map((m) => [m.id, m]));
  project.routes.forEach((route) => {
    const pts = route.markerIds
      .map((id) => markerLookup.get(id))
      .filter((m) => Boolean(m))
      .map((m) => ({ x: m!.x, y: m!.y }));

    if (pts.length >= 2) {
      ctx.save();
      ctx.strokeStyle = route.color;
      ctx.lineWidth = 4;
      if (route.style === 'dashed') ctx.setLineDash([12, 8]);
      if (route.style === 'dotted') ctx.setLineDash([4, 6]);

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
  });

  // Render markers with custom PNG, size, and rotation
  project.markers.forEach((marker) => {
    ctx.save();
    ctx.translate(marker.x, marker.y);
    if (marker.rotation) {
      ctx.rotate((marker.rotation * Math.PI) / 180);
    }

    const mSize = marker.size || 150;
    const halfSize = mSize / 2;
    const markerImg = loadedImages[`marker_${marker.id}`];

    if (markerImg) {
      ctx.drawImage(markerImg, -halfSize, -halfSize, mSize, mSize);
    } else {
      ctx.fillStyle = marker.color || '#3b82f6';
      ctx.beginPath();
      ctx.arc(0, 0, halfSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    }
    ctx.restore();

    // Text label below marker
    ctx.save();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px sans-serif';
    const textWidth = Math.max(70, marker.name.length * 8);
    ctx.fillRect(marker.x - textWidth / 2, marker.y + (mSize / 2) + 6, textWidth, 20);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(marker.name, marker.x, marker.y + (mSize / 2) + 20);
    ctx.restore();
  });

  // Convert to PNG and download
  const dataUrl = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `${project.title.toLowerCase().replace(/\s+/g, '_')}_mapa.png`;
  a.click();
}
