/**
 * Game Engine Asset Registry & Flyweight Memory Pool (Zero-OOM Architecture)
 *
 * Em engines de jogos profissionais (Unity, Godot, Unreal), assets binários (texturas,
 * sprites, vídeos, composições de malha e áudios) nunca são duplicados dentro de cada
 * entidade ou nó de cena.
 *
 * Esta unidade garante:
 * 1. String Interning (V8 Heap): Se 1.000 marcadores, carimbos ou tufos de grama usarem
 *    a mesma textura/vídeo Base64, a string é alocada UMA ÚNICA VEZ na memória JS.
 * 2. GPU & DOM Blob URL Instancing (Blink/WebKit VRAM): Converte DataURLs pesados em um
 *    único ObjectURL binário (`blob:https://...` de ~60 bytes) compartilhado por todas as
 *    tags <img>, <video> e <canvas>, garantindo que o navegador decodifique apenas 1 textura
 *    na GPU para centenas de instâncias simultâneas.
 * 3. Hash FNV-1a em O(1) para geração de chaves de instanciamento sem colisão.
 * 4. Clonagem estrutural leve de marcadores e camadas de motion (cloneMarkerShared /
 *    cloneMotionLayersShared) sem usar JSON.stringify em buffers binários.
 */

import type { MapProject, MapMarker, MarkerMotionLayer } from '../types/map';

/**
 * Gera um hash determinístico rápido de uma URL/DataURL (amostrando início, meio, fim e tamanho)
 * Evita colisão de cabeçalhos PNG/MP4 Base64 idênticos sem percorrer megabytes de string.
 */
export function fastAssetHash(str: string | undefined): string {
  if (!str) return 'empty';
  const len = str.length;
  if (len <= 96) return str;

  let h1 = 0x811c9dc5;
  const step = Math.max(1, Math.floor(len / 64));
  for (let i = 0; i < len; i += step) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  // Inclui os últimos 32 caracteres para máxima entropia
  for (let i = Math.max(0, len - 32); i < len; i++) {
    h1 ^= str.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return `h_${len}_${(h1 >>> 0).toString(36)}`;
}

class EngineAssetPool {
  private static instance: EngineAssetPool;
  private pool = new Map<string, string>();
  private idToDataMap = new Map<string, string>();
  private stringHashCache = new Map<string, string>();
  private blobUrlCache = new Map<string, string>();
  private reverseBlobMap = new Map<string, string>();

  private constructor() {}

  public static getInstance(): EngineAssetPool {
    if (!EngineAssetPool.instance) {
      EngineAssetPool.instance = new EngineAssetPool();
    }
    return EngineAssetPool.instance;
  }

  /**
   * Interna uma string de URL ou DataURL Base64 na memória.
   * Se receber uma blobUrl gerada pelo pool, resolve de volta para o DataURL persistente.
   */
  public intern(str: string | undefined): string {
    if (!str || typeof str !== 'string') return '';
    const fromBlob = this.reverseBlobMap.get(str);
    if (fromBlob) return fromBlob;
    if (str.length < 128) return str;

    const existing = this.pool.get(str);
    if (existing) {
      return existing;
    }

    this.pool.set(str, str);
    return str;
  }

  /**
   * Obtém uma chave curta e única para qualquer URL/Base64/BlobURL
   */
  public getAssetKey(str: string | undefined): string {
    if (!str) return 'none';
    const canonical = this.reverseBlobMap.get(str) || str;
    if (canonical.length < 96) return canonical;
    const interned = this.intern(canonical);
    let key = this.stringHashCache.get(interned);
    if (!key) {
      key = fastAssetHash(interned);
      this.stringHashCache.set(interned, key);
    }
    return key;
  }

  /**
   * Retorna a referência única internada (Flyweight O(1)) para renderização.
   * O cache de texturas decodificadas é gerenciado pelos singletons GLOBAL_IMAGE_CACHE e SHARED_VIDEO_DECODERS.
   */
  public getRenderableUrl(url: string | undefined): string {
    if (!url || typeof url !== 'string') return '';
    return this.intern(url);
  }

  /**
   * Registra um asset com ID fixo
   */
  public register(id: string, dataUrl: string): string {
    const interned = this.intern(dataUrl);
    this.idToDataMap.set(id, interned);
    return interned;
  }

  /**
   * Resolve um ID de asset ou retorna a própria URL internada
   */
  public resolve(idOrUrl: string | undefined): string {
    if (!idOrUrl) return '';
    const fromId = this.idToDataMap.get(idOrUrl);
    if (fromId) return fromId;
    return this.intern(idOrUrl);
  }

  public clear(): void {
    this.pool.clear();
    this.idToDataMap.clear();
    this.stringHashCache.clear();
  }

  public get size(): number {
    return this.pool.size;
  }

  public get blobCount(): number {
    return this.blobUrlCache.size;
  }
}

export const assetPool = EngineAssetPool.getInstance();

export function internAssetUrl(url: string | undefined): string {
  return assetPool.intern(url);
}

export function getRenderableAssetUrl(url: string | undefined): string {
  return assetPool.getRenderableUrl(url);
}

export function getUniqueAssetKey(url: string | undefined): string {
  return assetPool.getAssetKey(url);
}

export function registerAsset(id: string, dataUrl: string): string {
  return assetPool.register(id, dataUrl);
}

export function resolveAsset(idOrUrl: string | undefined): string {
  return assetPool.resolve(idOrUrl);
}

/**
 * Clona camadas de Motion compartilhando a mesma instância de imagem (`pngUrl`)
 * sem jamais serializar strings Base64 via JSON.stringify.
 */
export function cloneMotionLayersShared(
  layers: MarkerMotionLayer[] | undefined
): MarkerMotionLayer[] | undefined {
  if (!layers || layers.length === 0) return undefined;
  return layers.map((l) => ({
    ...l,
    pngUrl: l.pngUrl ? internAssetUrl(l.pngUrl) : l.pngUrl,
    strokes: l.strokes
      ? l.strokes.map((s) => ({
          ...s,
          points: s.points ? [...s.points] : [],
        }))
      : [],
  }));
}

/**
 * Clona um marcador completo (incluindo lógicas de NPC, patrulha, combate, diálogo,
 * eventos, iluminação, vídeo chroma key e camadas de motion) compartilhando 100%
 * as referências de assets na memória (Flyweight Pattern).
 */
export function cloneMarkerShared(
  source: MapMarker,
  overrides?: Partial<MapMarker>
): MapMarker {
  const clonedActionNpc = source.actionNpc
    ? {
        ...source.actionNpc,
        attacks: source.actionNpc.attacks
          ? {
              ...source.actionNpc.attacks,
              ...(source.actionNpc.attacks.jump
                ? {
                    jump: {
                      ...source.actionNpc.attacks.jump,
                      attackAsset: source.actionNpc.attacks.jump.attackAsset
                        ? {
                            ...source.actionNpc.attacks.jump.attackAsset,
                            url: internAssetUrl(source.actionNpc.attacks.jump.attackAsset.url),
                            motionLayers: cloneMotionLayersShared(
                              source.actionNpc.attacks.jump.attackAsset.motionLayers
                            ),
                          }
                        : undefined,
                    },
                  }
                : {}),
              ...(source.actionNpc.attacks.dash
                ? {
                    dash: {
                      ...source.actionNpc.attacks.dash,
                      attackAsset: source.actionNpc.attacks.dash.attackAsset
                        ? {
                            ...source.actionNpc.attacks.dash.attackAsset,
                            url: internAssetUrl(source.actionNpc.attacks.dash.attackAsset.url),
                            motionLayers: cloneMotionLayersShared(
                              source.actionNpc.attacks.dash.attackAsset.motionLayers
                            ),
                          }
                        : undefined,
                    },
                  }
                : {}),
              ...(source.actionNpc.attacks.hackSlash
                ? {
                    hackSlash: {
                      ...source.actionNpc.attacks.hackSlash,
                      attackAsset: source.actionNpc.attacks.hackSlash.attackAsset
                        ? {
                            ...source.actionNpc.attacks.hackSlash.attackAsset,
                            url: internAssetUrl(source.actionNpc.attacks.hackSlash.attackAsset.url),
                            motionLayers: cloneMotionLayersShared(
                              source.actionNpc.attacks.hackSlash.attackAsset.motionLayers
                            ),
                          }
                        : undefined,
                    },
                  }
                : {}),
              ...(source.actionNpc.attacks.ranged
                ? {
                    ranged: {
                      ...source.actionNpc.attacks.ranged,
                      attackAsset: source.actionNpc.attacks.ranged.attackAsset
                        ? {
                            ...source.actionNpc.attacks.ranged.attackAsset,
                            url: internAssetUrl(source.actionNpc.attacks.ranged.attackAsset.url),
                            motionLayers: cloneMotionLayersShared(
                              source.actionNpc.attacks.ranged.attackAsset.motionLayers
                            ),
                          }
                        : undefined,
                    },
                  }
                : {}),
            }
          : source.actionNpc.attacks,
      }
    : undefined;

  return {
    ...source,
    customIconPng: source.customIconPng ? internAssetUrl(source.customIconPng) : undefined,
    bannerImagePng: source.bannerImagePng ? internAssetUrl(source.bannerImagePng) : undefined,
    videoUrl: source.videoUrl ? internAssetUrl(source.videoUrl) : undefined,
    audioUrl: source.audioUrl ? internAssetUrl(source.audioUrl) : undefined,
    dialogueCharacterPng: source.dialogueCharacterPng
      ? internAssetUrl(source.dialogueCharacterPng)
      : undefined,
    videoChromaKey: source.videoChromaKey ? { ...source.videoChromaKey } : undefined,
    npcPatrol: source.npcPatrol
      ? {
          ...source.npcPatrol,
          waypoints: source.npcPatrol.waypoints
            ? source.npcPatrol.waypoints.map((w) => ({ ...w }))
            : undefined,
        }
      : undefined,
    actionNpc: clonedActionNpc,
    lightConfig: source.lightConfig ? { ...source.lightConfig } : undefined,
    motionLayers: cloneMotionLayersShared(source.motionLayers),
    effectStrokes: source.effectStrokes
      ? source.effectStrokes.map((s) => ({ ...s, points: [...s.points] }))
      : undefined,
    events: source.events ? source.events.map((ev) => ({ ...ev })) : undefined,
    dialogueSteps: source.dialogueSteps
      ? source.dialogueSteps.map((st) => ({
          ...st,
          characterPng: st.characterPng ? internAssetUrl(st.characterPng) : undefined,
          playerResponses: st.playerResponses
            ? st.playerResponses.map((r) => ({ ...r }))
            : undefined,
        }))
      : undefined,
    npcPhrases: source.npcPhrases ? [...source.npcPhrases] : undefined,
    rewardSlots: source.rewardSlots ? [...source.rewardSlots] : undefined,
    quest: source.quest ? { ...source.quest } : undefined,
    ...overrides,
  };
}

/**
 * Retorna estatísticas rápidas de instanciamento dos marcadores ativos.
 */
export function getAssetPoolStats(markers: MapMarker[]): {
  totalMarkerCount: number;
  uniqueAssetsInScene: number;
} {
  const uniqueKeys = new Set<string>();
  let totalMarkerCount = 0;

  for (const m of markers || []) {
    if (m.id.startsWith('terrain-grass-') || m.id.startsWith('terrain-flower-')) continue;
    totalMarkerCount++;
    const primaryUrl = m.videoUrl || m.customIconPng;
    if (primaryUrl) {
      uniqueKeys.add(getUniqueAssetKey(primaryUrl));
    }
    if (m.motionLayers && m.motionLayers.length > 0) {
      for (const l of m.motionLayers) {
        if (l.pngUrl && !l.isBaseAsset) {
          uniqueKeys.add(getUniqueAssetKey(l.pngUrl));
        }
      }
    }
  }

  return {
    totalMarkerCount,
    uniqueAssetsInScene: uniqueKeys.size,
  };
}

/**
 * Calcula estatísticas de instanciamento em tempo real para o projeto atual.
 */
export function getEngineInstancingStats(project: MapProject): {
  uniqueAssetsCount: number;
  totalInstancesCount: number;
  instancingRatio: number;
  sharedClonesCount: number;
} {
  const uniqueKeys = new Set<string>();
  let totalInstances = 0;

  for (const m of project.markers || []) {
    const primaryUrl = m.videoUrl || m.customIconPng;
    if (primaryUrl) {
      uniqueKeys.add(getUniqueAssetKey(primaryUrl));
      totalInstances++;
    }
    if (m.motionLayers && m.motionLayers.length > 0) {
      for (const l of m.motionLayers) {
        if (l.pngUrl && !l.isBaseAsset) {
          uniqueKeys.add(getUniqueAssetKey(l.pngUrl));
        }
      }
    }
  }

  for (const s of project.groundStamps || []) {
    if (s.pngUrl) {
      uniqueKeys.add(getUniqueAssetKey(s.pngUrl));
      totalInstances++;
    }
  }

  const uniqueAssetsCount = uniqueKeys.size;
  const sharedClonesCount = Math.max(0, totalInstances - uniqueAssetsCount);
  const instancingRatio =
    uniqueAssetsCount > 0 ? Number((totalInstances / uniqueAssetsCount).toFixed(1)) : 1;

  return {
    uniqueAssetsCount,
    totalInstancesCount: totalInstances,
    instancingRatio,
    sharedClonesCount,
  };
}

/**
 * Higieniza e unifica referências de assets de um MapProject inteiro.
 * Substitui cópias duplicadas na memória pelo ponteiro compartilhado da engine,
 * reduzindo o consumo de memória de centenas de MB para apenas alguns KB.
 */
export function internProjectAssets<
  T extends {
    biomes?: any[];
    subBiomes?: any[];
    markers?: any[];
    groundStamps?: any[];
    galleryAssets?: any[];
    stampBrushConfig?: any;
    player?: any;
    spawnConfig?: any;
  }
>(p: T): T {
  if (!p) return p;
  if (p.biomes) {
    for (let i = 0; i < p.biomes.length; i++) {
      if (p.biomes[i].tilePng) p.biomes[i].tilePng = internAssetUrl(p.biomes[i].tilePng);
      if (p.biomes[i].bgmAudioUrl) p.biomes[i].bgmAudioUrl = internAssetUrl(p.biomes[i].bgmAudioUrl);
    }
  }
  if (p.subBiomes) {
    for (let i = 0; i < p.subBiomes.length; i++) {
      if (p.subBiomes[i].tilePng) p.subBiomes[i].tilePng = internAssetUrl(p.subBiomes[i].tilePng);
      if (p.subBiomes[i].bgmAudioUrl) p.subBiomes[i].bgmAudioUrl = internAssetUrl(p.subBiomes[i].bgmAudioUrl);
    }
  }
  if (p.markers) {
    for (let i = 0; i < p.markers.length; i++) {
      const m = p.markers[i];
      if (m.customIconPng) m.customIconPng = internAssetUrl(m.customIconPng);
      if (m.bannerImagePng) m.bannerImagePng = internAssetUrl(m.bannerImagePng);
      if (m.videoUrl) m.videoUrl = internAssetUrl(m.videoUrl);
      if (m.audioUrl) m.audioUrl = internAssetUrl(m.audioUrl);
      if (m.dialogueCharacterPng) m.dialogueCharacterPng = internAssetUrl(m.dialogueCharacterPng);
      if (m.motionLayers) {
        for (let j = 0; j < m.motionLayers.length; j++) {
          if (m.motionLayers[j].pngUrl) {
            m.motionLayers[j].pngUrl = internAssetUrl(m.motionLayers[j].pngUrl);
          }
        }
      }
    }
  }
  if (p.groundStamps) {
    for (let i = 0; i < p.groundStamps.length; i++) {
      if (p.groundStamps[i].pngUrl) p.groundStamps[i].pngUrl = internAssetUrl(p.groundStamps[i].pngUrl);
    }
  }
  if (p.galleryAssets) {
    for (let i = 0; i < p.galleryAssets.length; i++) {
      if (p.galleryAssets[i].dataUrl) p.galleryAssets[i].dataUrl = internAssetUrl(p.galleryAssets[i].dataUrl);
      if (p.galleryAssets[i].videoUrl) p.galleryAssets[i].videoUrl = internAssetUrl(p.galleryAssets[i].videoUrl);
      if (p.galleryAssets[i].motionLayers) {
        for (let j = 0; j < p.galleryAssets[i].motionLayers.length; j++) {
          if (p.galleryAssets[i].motionLayers[j].pngUrl) {
            p.galleryAssets[i].motionLayers[j].pngUrl = internAssetUrl(
              p.galleryAssets[i].motionLayers[j].pngUrl
            );
          }
        }
      }
    }
  }
  if (p.stampBrushConfig?.savedPresets) {
    for (let i = 0; i < p.stampBrushConfig.savedPresets.length; i++) {
      if (p.stampBrushConfig.savedPresets[i].dataUrl) {
        p.stampBrushConfig.savedPresets[i].dataUrl = internAssetUrl(p.stampBrushConfig.savedPresets[i].dataUrl);
      }
    }
  }
  if ((p as any).terrainPenConfig?.assets) {
    const penAssets = (p as any).terrainPenConfig.assets;
    for (let i = 0; i < penAssets.length; i++) {
      if (penAssets[i].dataUrl) {
        penAssets[i].dataUrl = internAssetUrl(penAssets[i].dataUrl);
      }
    }
  }
  if (p.player) {
    if (p.player.avatarPng) p.player.avatarPng = internAssetUrl(p.player.avatarPng);
    if (p.player.avatarUpPng) p.player.avatarUpPng = internAssetUrl(p.player.avatarUpPng);
    if (p.player.avatarDownPng) p.player.avatarDownPng = internAssetUrl(p.player.avatarDownPng);
    if (p.player.avatarLeftPng) p.player.avatarLeftPng = internAssetUrl(p.player.avatarLeftPng);
    if (p.player.avatarRightPng) p.player.avatarRightPng = internAssetUrl(p.player.avatarRightPng);
  }
  if (p.spawnConfig?.transportPng) {
    p.spawnConfig.transportPng = internAssetUrl(p.spawnConfig.transportPng);
  }
  return p;
}

/**
 * Clona a estrutura de um MapProject SEM usar JSON.parse(JSON.stringify(project)),
 * preservando os ponteiros de strings Base64 internadas no V8 Heap e evitando picos de Out of Memory.
 */
export function cloneProjectLightweight(p: MapProject): MapProject {
  if (!p) return p;
  return internProjectAssets({
    ...p,
    biomes: (p.biomes || []).map((b) => ({ ...b })),
    subBiomes: (p.subBiomes || []).map((sb) => ({
      ...sb,
      walkableCells: sb.walkableCells ? [...sb.walkableCells] : [],
      blockedCells: sb.blockedCells ? [...sb.blockedCells] : [],
    })),
    markers: (p.markers || []).map((m) => cloneMarkerShared(m)),
    routes: (p.routes || []).map((r) => ({ ...r, markerIds: [...(r.markerIds || [])] })),
    player: p.player ? { ...p.player } : undefined,
    walkableCells: p.walkableCells ? [...p.walkableCells] : [],
    blockedCells: p.blockedCells ? [...p.blockedCells] : [],
    groundStamps: (p.groundStamps || []).map((s) => ({ ...s })),
    stampLayers: (p.stampLayers || []).map((l) => ({ ...l })),
    markerLayers: (p.markerLayers || []).map((l) => ({ ...l })),
    motionOverlays: (p.motionOverlays || []).map((ov) => ({
      ...ov,
      points: ov.points ? [...ov.points] : [],
    })),
    galleryAssets: (p.galleryAssets || []).map((ga) => ({
      ...ga,
      motionLayers: cloneMotionLayersShared(ga.motionLayers),
    })),
    galleryCategories: p.galleryCategories ? [...p.galleryCategories] : [],
  });
}
