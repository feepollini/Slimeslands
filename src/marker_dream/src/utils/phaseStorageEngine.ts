import { MapProject, MapMarker, MarkerMotionLayer, GalleryAsset } from '../types/map';
import { composeMotionAssetSnapshot } from './motionCanvasEngine';
import { cloneProjectLightweight, internProjectAssets } from './assetRegistry';
import {
  dehydrateObjectAssetsToDisk,
  EngineAssetCategory,
  isBase64DataUrl,
  isVolatileBlobUrl,
  uploadDataUrlToDisk,
} from '../../../core/DiskAssetEngine';

/**
 * Converte qualquer URL do tipo `blob:` ou `data:...;base64` em um arquivo físico
 * gravado diretamente na unidade de memória local do projeto (`/public/assets/engine/<category>/`).
 * Se já for um caminho estático (`/assets/...` ou `/cards/...`), retorna imediatamente sem custo de I/O.
 */
export async function convertBlobUrlToBase64(
  url: string | undefined,
  category: EngineAssetCategory = 'phases',
  hintName: string = 'phase_asset'
): Promise<string | undefined> {
  if (!url || typeof url !== 'string') {
    return url;
  }
  if (!isVolatileBlobUrl(url) && !isBase64DataUrl(url)) {
    return url;
  }
  try {
    return await uploadDataUrlToDisk(url, hintName, category);
  } catch (err) {
    console.warn('Falha ao persistir asset na unidade local:', err);
    return url;
  }
}

/**
 * Higieniza recursivamente todos os assets da matriz do MapProject,
 * desidratando qualquer `blob:` volátil ou `data:...;base64` pesado da RAM
 * para arquivos reais na unidade física do projeto (`/public/assets/engine/...`).
 */
export async function sanitizeProjectAssets(project: MapProject): Promise<MapProject> {
  const clone: MapProject = cloneProjectLightweight(project);

  // 1. Biomas Principais
  if (clone.biomes && clone.biomes.length > 0) {
    for (const b of clone.biomes) {
      if (b.tilePng) b.tilePng = (await convertBlobUrlToBase64(b.tilePng, 'biomes', b.name || b.id)) || b.tilePng;
      if (b.bgmAudioUrl) b.bgmAudioUrl = (await convertBlobUrlToBase64(b.bgmAudioUrl, 'audio', `bgm_${b.name || b.id}`)) || b.bgmAudioUrl;
    }
  }

  // 2. Sub-Biomas (Extended Biomes)
  if (clone.subBiomes && clone.subBiomes.length > 0) {
    for (const sb of clone.subBiomes) {
      if (sb.tilePng) sb.tilePng = (await convertBlobUrlToBase64(sb.tilePng, 'biomes', sb.name || sb.id)) || sb.tilePng;
      if (sb.bgmAudioUrl) sb.bgmAudioUrl = (await convertBlobUrlToBase64(sb.bgmAudioUrl, 'audio', `bgm_${sb.name || sb.id}`)) || sb.bgmAudioUrl;
    }
  }

  // 3. Marcadores e Entidades (Todos os Módulos)
  if (clone.markers && clone.markers.length > 0) {
    for (const m of clone.markers) {
      if (m.customIconPng) m.customIconPng = (await convertBlobUrlToBase64(m.customIconPng, 'characters', m.name || m.id)) || m.customIconPng;
      if (m.bannerImagePng) m.bannerImagePng = (await convertBlobUrlToBase64(m.bannerImagePng, 'characters', `banner_${m.name || m.id}`)) || m.bannerImagePng;
      if (m.videoUrl) m.videoUrl = (await convertBlobUrlToBase64(m.videoUrl, 'video', `vid_${m.name || m.id}`)) || m.videoUrl;
      if (m.audioUrl) m.audioUrl = (await convertBlobUrlToBase64(m.audioUrl, 'audio', `sfx_${m.name || m.id}`)) || m.audioUrl;
      if (m.eventVideoUrl) m.eventVideoUrl = (await convertBlobUrlToBase64(m.eventVideoUrl, 'video', `evtvid_${m.name || m.id}`)) || m.eventVideoUrl;
      if (m.dialogueCharacterPng) m.dialogueCharacterPng = (await convertBlobUrlToBase64(m.dialogueCharacterPng, 'characters', `dlg_${m.name || m.id}`)) || m.dialogueCharacterPng;

      // Diálogo por passos
      if (m.dialogueSteps && m.dialogueSteps.length > 0) {
        for (const s of m.dialogueSteps) {
          if (s.characterPng) s.characterPng = (await convertBlobUrlToBase64(s.characterPng, 'characters', `dlg_step_${s.id}`)) || s.characterPng;
        }
      }

      // Peças de Motion Canvas
      if (m.motionLayers && m.motionLayers.length > 0) {
        for (const ml of m.motionLayers) {
          if (ml.pngUrl) ml.pngUrl = (await convertBlobUrlToBase64(ml.pngUrl, 'characters', ml.name || ml.id)) || ml.pngUrl;
        }
      }

      // Estação Interativa & Chocadeira
      if (m.stationConfig) {
        const sc = m.stationConfig;
        if (sc.baseAssetPng) sc.baseAssetPng = (await convertBlobUrlToBase64(sc.baseAssetPng, 'phases', 'station_base')) || sc.baseAssetPng;
        if (sc.bannerImagePng) sc.bannerImagePng = (await convertBlobUrlToBase64(sc.bannerImagePng, 'phases', 'station_banner')) || sc.bannerImagePng;
        if (sc.resultAssetPng) sc.resultAssetPng = (await convertBlobUrlToBase64(sc.resultAssetPng, 'phases', 'station_result')) || sc.resultAssetPng;
        if (sc.slots && sc.slots.length > 0) {
          for (const slot of sc.slots) {
            if (slot.currentAssetPng) slot.currentAssetPng = (await convertBlobUrlToBase64(slot.currentAssetPng, 'phases', `slot_${slot.id}`)) || slot.currentAssetPng;
            if (slot.resultAssetPng) slot.resultAssetPng = (await convertBlobUrlToBase64(slot.resultAssetPng, 'phases', `slot_res_${slot.id}`)) || slot.resultAssetPng;
          }
        }
        if (sc.availablePaletteAssets && sc.availablePaletteAssets.length > 0) {
          for (const it of sc.availablePaletteAssets) {
            if (it.pngUrl) it.pngUrl = (await convertBlobUrlToBase64(it.pngUrl, 'phases', it.name || it.id)) || it.pngUrl;
          }
        }
      }

      // Action NPC (Projéteis e Ataques)
      if (m.actionNpc) {
        const an = m.actionNpc;
        if (an.attacks) {
          for (const atkKey of Object.keys(an.attacks) as (keyof typeof an.attacks)[]) {
            const atk = an.attacks[atkKey];
            if (atk && (atk as any).assetUrl) {
              (atk as any).assetUrl =
                (await convertBlobUrlToBase64((atk as any).assetUrl, 'characters', `atk_${atkKey}`)) ||
                (atk as any).assetUrl;
            }
          }
        }
      }
    }
  }

  // 4. Jogador
  if (clone.player) {
    if (clone.player.avatarPng) clone.player.avatarPng = (await convertBlobUrlToBase64(clone.player.avatarPng, 'characters', 'player_avatar')) || clone.player.avatarPng;
    if (clone.player.avatarUpPng) clone.player.avatarUpPng = (await convertBlobUrlToBase64(clone.player.avatarUpPng, 'characters', 'player_up')) || clone.player.avatarUpPng;
    if (clone.player.avatarDownPng) clone.player.avatarDownPng = (await convertBlobUrlToBase64(clone.player.avatarDownPng, 'characters', 'player_down')) || clone.player.avatarDownPng;
    if (clone.player.avatarLeftPng) clone.player.avatarLeftPng = (await convertBlobUrlToBase64(clone.player.avatarLeftPng, 'characters', 'player_left')) || clone.player.avatarLeftPng;
    if (clone.player.avatarRightPng) clone.player.avatarRightPng = (await convertBlobUrlToBase64(clone.player.avatarRightPng, 'characters', 'player_right')) || clone.player.avatarRightPng;
  }

  // 5. Spawn Cinemático
  if (clone.spawnConfig) {
    const sc = clone.spawnConfig;
    if (sc.transportPng) sc.transportPng = (await convertBlobUrlToBase64(sc.transportPng, 'phases', 'spawn_transport')) || sc.transportPng;
    if (sc.introVideoUrl) sc.introVideoUrl = (await convertBlobUrlToBase64(sc.introVideoUrl, 'video', 'spawn_intro_video')) || sc.introVideoUrl;
    if (sc.introAudioUrl) sc.introAudioUrl = (await convertBlobUrlToBase64(sc.introAudioUrl, 'audio', 'spawn_intro_audio')) || sc.introAudioUrl;
  }

  // 6. Telas, HUD e Botões
  if (clone.screensConfig && clone.screensConfig.screens && clone.screensConfig.screens.length > 0) {
    for (const scr of clone.screensConfig.screens) {
      if (scr.backgroundImageUrl) scr.backgroundImageUrl = (await convertBlobUrlToBase64(scr.backgroundImageUrl, 'ui', `screen_bg_${scr.id}`)) || scr.backgroundImageUrl;
      if (scr.customButtons && scr.customButtons.length > 0) {
        for (const btn of scr.customButtons) {
          if (btn.assetUrl) btn.assetUrl = (await convertBlobUrlToBase64(btn.assetUrl, 'ui', `btn_${btn.id}`)) || btn.assetUrl;
        }
      }
      const hud = scr.hudConfig;
      if (hud) {
        if (hud.backpackButton?.customAssetUrl) {
          hud.backpackButton.customAssetUrl = (await convertBlobUrlToBase64(hud.backpackButton.customAssetUrl, 'ui', 'hud_backpack')) || hud.backpackButton.customAssetUrl;
        }
        if (hud.joystick?.customDiscoUrl) {
          hud.joystick.customDiscoUrl = (await convertBlobUrlToBase64(hud.joystick.customDiscoUrl, 'ui', 'hud_joy_disco')) || hud.joystick.customDiscoUrl;
        }
        if (hud.joystick?.customKnobUrl) {
          hud.joystick.customKnobUrl = (await convertBlobUrlToBase64(hud.joystick.customKnobUrl, 'ui', 'hud_joy_knob')) || hud.joystick.customKnobUrl;
        }
        if (hud.touchMoveButton?.customAssetUrl) {
          hud.touchMoveButton.customAssetUrl = (await convertBlobUrlToBase64(hud.touchMoveButton.customAssetUrl, 'ui', 'hud_touch_move')) || hud.touchMoveButton.customAssetUrl;
        }
      }
    }
  }

  // 7. Carimbos de Chão
  if (clone.groundStamps && clone.groundStamps.length > 0) {
    for (const st of clone.groundStamps) {
      if (st.pngUrl) st.pngUrl = (await convertBlobUrlToBase64(st.pngUrl, 'biomes', `stamp_${st.id}`)) || st.pngUrl;
    }
  }

  // 8. Pincel de Carimbo
  if (clone.stampBrushConfig && clone.stampBrushConfig.pngUrl) {
    clone.stampBrushConfig.pngUrl = (await convertBlobUrlToBase64(clone.stampBrushConfig.pngUrl, 'biomes', 'stamp_brush')) || clone.stampBrushConfig.pngUrl;
  }

  // 9. Galeria de Assets da Fase
  if (clone.galleryAssets && clone.galleryAssets.length > 0) {
    for (const ga of clone.galleryAssets) {
      if (ga.dataUrl) ga.dataUrl = (await convertBlobUrlToBase64(ga.dataUrl, 'engine', ga.name || ga.id)) || ga.dataUrl;
      if (ga.videoUrl) ga.videoUrl = (await convertBlobUrlToBase64(ga.videoUrl, 'video', ga.name || ga.id)) || ga.videoUrl;
    }
  }

  // 10. Qualquer campo restante (como worldMap, sprites direcionais, etc.)
  const fullyDehydrated = await dehydrateObjectAssetsToDisk(clone, 'phases');

  return internProjectAssets(fullyDehydrated);
}

/**
 * Consolida as peças do Motion Canvas se o usuário estava editando camadas ativamente.
 * Cria o snapshot composto em disco para o marcador e registra o asset na galeria da fase.
 */
export async function consolidateMotionCanvasInProject(
  project: MapProject,
  motionCanvasLayers: MarkerMotionLayer[],
  targetMarkerId: string | null,
  isPrimordialJelly: boolean
): Promise<{ updatedProject: MapProject; compositePng?: string }> {
  if (!targetMarkerId || !motionCanvasLayers || motionCanvasLayers.length === 0) {
    return { updatedProject: project };
  }

  const markerIdx = (project.markers || []).findIndex((m) => m.id === targetMarkerId);
  if (markerIdx < 0) {
    return { updatedProject: project };
  }

  const target = project.markers[markerIdx];
  const baseLayer = motionCanvasLayers.find((l) => l.isBaseAsset) || motionCanvasLayers[0];
  const effectMode =
    baseLayer?.effect && baseLayer.effect !== 'none' && baseLayer.effect !== 'jelly'
      ? baseLayer.effect
      : 'none';
  const finalEffect = isPrimordialJelly ? (effectMode !== 'none' ? effectMode : 'jelly') : effectMode;

  const basePng = baseLayer?.pngUrl || target.customIconPng || target.bannerImagePng || '';

  let compositePng = basePng;
  try {
    if (basePng && motionCanvasLayers.length > 1) {
      const rawComposite = await composeMotionAssetSnapshot(basePng, motionCanvasLayers);
      compositePng =
        (await convertBlobUrlToBase64(
          rawComposite,
          'characters',
          `motion_${target.name || targetMarkerId}`
        )) || rawComposite;
    }
  } catch (err) {
    console.warn('Erro ao gerar snapshot composto do Motion Canvas:', err);
  }

  const baseLayerObj = motionCanvasLayers.find((l) => l.isBaseAsset) || motionCanvasLayers[0];
  const baseId = baseLayerObj?.id;

  const finalizedLayers: MarkerMotionLayer[] = [];
  for (const l of motionCanvasLayers) {
    const isBase = l.id === baseId;
    const rawLayerUrl = isBase ? l.pngUrl || basePng : l.pngUrl;
    const diskLayerUrl =
      (await convertBlobUrlToBase64(rawLayerUrl, 'characters', l.name || l.id)) || rawLayerUrl;
    finalizedLayers.push({
      ...l,
      isBaseAsset: isBase,
      pngUrl: diskLayerUrl,
    });
  }

  const updatedMarker: MapMarker = {
    ...target,
    motionLayers: JSON.parse(JSON.stringify(finalizedLayers)),
    motionAsset: true,
    effect: finalEffect,
    effectSpeed: baseLayer?.speed ?? 1.0,
    effectIntensity: baseLayer?.intensity ?? 1.0,
    effectStrokes: finalizedLayers.flatMap((l) => l.strokes || []),
    npcBounce: isPrimordialJelly,
    customIconPng: compositePng || target.customIconPng,
    bannerImagePng: compositePng || target.bannerImagePng,
  };

  const nextMarkers = [...project.markers];
  nextMarkers[markerIdx] = updatedMarker;

  let nextAssets = project.galleryAssets ? [...project.galleryAssets] : [];
  let nextCategories = project.galleryCategories ? [...project.galleryCategories] : ['Geral'];

  if (compositePng) {
    const stableMotionAssetId = `motion-asset-marker-${targetMarkerId}`;
    const compositionAsset: GalleryAsset = {
      id: stableMotionAssetId,
      name: `${target.name || 'Composição'} (Motion Canvas)`,
      dataUrl: compositePng,
      category: 'Motion Canvas',
      motionLayers: JSON.parse(JSON.stringify(finalizedLayers)),
      isPersistentPhaseAsset: true,
      createdAt: new Date().toISOString(),
    };
    if (!nextCategories.includes('Motion Canvas')) {
      nextCategories = [...nextCategories, 'Motion Canvas'];
    }
    const existIdx = nextAssets.findIndex((a) => a.id === stableMotionAssetId);
    if (existIdx >= 0) {
      nextAssets[existIdx] = compositionAsset;
    } else {
      nextAssets = [compositionAsset, ...nextAssets];
    }
  }

  return {
    updatedProject: {
      ...project,
      markers: nextMarkers,
      galleryAssets: nextAssets,
      galleryCategories: nextCategories,
    },
    compositePng,
  };
}

/**
 * Gera um resumo visual / contadores rápidos da matriz da fase para feedback de precisão.
 */
export function getPhaseMatrixSummary(project: MapProject): {
  biomesCount: number;
  subBiomesCount: number;
  markersCount: number;
  actionNpcsCount: number;
  interactiveScreensCount: number;
  walkableCellsCount: number;
  blockedCellsCount: number;
  stampsCount: number;
  assetsCount: number;
} {
  return {
    biomesCount: (project.biomes || []).length,
    subBiomesCount: (project.subBiomes || []).length,
    markersCount: (project.markers || []).length,
    actionNpcsCount: (project.markers || []).filter((m) => m.actionNpc?.enabled).length,
    interactiveScreensCount: (project.screensConfig?.screens || []).length,
    walkableCellsCount: (project.walkableCells || []).length,
    blockedCellsCount: (project.blockedCells || []).length,
    stampsCount: (project.groundStamps || []).length,
    assetsCount: (project.galleryAssets || []).length,
  };
}
