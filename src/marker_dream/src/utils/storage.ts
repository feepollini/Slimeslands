import { MapProject, SavedLevel, SavedLevelStats } from '../types/map';
import { internProjectAssets } from './assetRegistry';

const DB_NAME = 'TileScrollDB';
const STORE_NAME = 'projects';
const DB_VERSION = 2;
const PROJECT_KEY = 'active_project';
const LEVELS_GALLERY_KEY = 'levels_gallery';
const LEVELS_INDEX_KEY = 'levels_manifest_index_v2';
const LEVEL_SLOT_PREFIX = 'phase_slot_v2_';

let cachedDbPromise: Promise<IDBDatabase> | null = null;

function attachDbLifecycle(db: IDBDatabase) {
  db.onclose = () => {
    cachedDbPromise = null;
  };
  db.onversionchange = () => {
    db.close();
    cachedDbPromise = null;
  };
}

/**
 * Abre ou reutiliza a conexão singleton com o IndexedDB nativo do navegador.
 * Auto-repara o banco (upgrade de versão automático) caso a objectStore 'projects' não exista.
 */
function openDB(): Promise<IDBDatabase> {
  if (cachedDbPromise) return cachedDbPromise;

  cachedDbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      cachedDbPromise = null;
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const openWithVersion = (version?: number) => {
      let request: IDBOpenDBRequest;
      try {
        request = version ? window.indexedDB.open(DB_NAME, version) : window.indexedDB.open(DB_NAME);
      } catch (err) {
        cachedDbPromise = null;
        reject(err);
        return;
      }

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => {
        const db = request.result;
        // Se o banco já existia no navegador sem a store 'projects', faz upgrade automático de versão para criá-la
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const nextVersion = Math.max(DB_VERSION, (db.version || 1) + 1);
          db.close();
          openWithVersion(nextVersion);
          return;
        }
        attachDbLifecycle(db);
        resolve(db);
      };

      request.onerror = () => {
        cachedDbPromise = null;
        reject(request.error);
      };

      request.onblocked = () => {
        cachedDbPromise = null;
        reject(new Error('IndexedDB open blocked'));
      };
    };

    openWithVersion();
  });

  return cachedDbPromise;
}

/**
 * Calcula estatísticas rápidas e leves de uma fase para o Manifesto / Cards
 */
export function computeLevelStats(proj: MapProject | undefined): SavedLevelStats {
  if (!proj) {
    return {
      biomesCount: 0,
      subBiomesCount: 0,
      markersCount: 0,
      npcsCount: 0,
      collisionCellsCount: 0,
      screensCount: 1,
      mapW: 768,
      mapH: 1000,
      canvasKind: 'vertical',
    };
  }
  const isExtended =
    proj.canvasKind === 'extended' ||
    ((proj.subBiomes || []).length > 0 && (!proj.biomes || proj.biomes.length === 0));

  const biomesCount = (proj.biomes || []).length;
  const subBiomesCount = (proj.subBiomes || []).length;
  const markersCount = (proj.markers || []).length;
  const npcsCount = (proj.markers || []).filter((m) => m.type === 'npc').length;
  const collisionCellsCount = isExtended
    ? (proj.subBiomes || []).reduce(
        (acc, sb) => acc + (sb.walkableCells?.length || 0) + (sb.blockedCells?.length || 0),
        0
      )
    : (proj.walkableCells?.length || 0) + (proj.blockedCells?.length || 0);

  let mapW = proj.mapWidth || 768;
  let mapH = 0;
  if (isExtended) {
    let maxH = 400;
    let sumW = 0;
    (proj.subBiomes || []).forEach((sb) => {
      sumW += (sb.tileWidth || 400) + 20;
      if ((sb.tileHeight || 400) > maxH) maxH = sb.tileHeight || 400;
    });
    mapW = Math.max(300, sumW);
    mapH = Math.max(300, maxH);
  } else {
    (proj.biomes || []).forEach((b) => {
      mapH += (b.tileHeight || 256) * (b.tileRepeatCount || 1);
    });
    if (mapH === 0) mapH = 1000;
  }

  return {
    biomesCount,
    subBiomesCount,
    markersCount,
    npcsCount,
    collisionCellsCount,
    screensCount: proj.screensConfig?.screens?.length || 1,
    mapW,
    mapH,
    canvasKind: isExtended ? 'extended' : 'vertical',
  };
}

/**
 * Sanitiza recursivamente objetos antes de salvar no IndexedDB,
 * removendo quaisquer instâncias de PointerEvent, Eventos DOM ou referências não clonáveis.
 */
export function sanitizeForIndexedDB<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  try {
    return JSON.parse(
      JSON.stringify(obj, (key, value) => {
        if (value && typeof value === 'object') {
          if (
            (typeof Event !== 'undefined' && value instanceof Event) ||
            value.constructor?.name?.endsWith('Event') ||
            (value as any).pointerId !== undefined ||
            (value as any).nativeEvent !== undefined
          ) {
            return undefined;
          }
        }
        return value;
      })
    );
  } catch (err) {
    return obj;
  }
}

/**
 * Salva os dados da Fase Ativa no IndexedDB (Unidade Local).
 */
export async function saveProject(project: MapProject): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const safeProject = sanitizeForIndexedDB(project);
      const request = store.put(safeProject, PROJECT_KEY);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Could not save to IndexedDB:', err);
  }
}

/**
 * Carrega os dados da Fase Ativa do IndexedDB.
 */
export async function loadProject(): Promise<MapProject | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(PROJECT_KEY);

      request.onsuccess = () => {
        const res = request.result as MapProject | undefined;
        resolve(res ? internProjectAssets(res) : null);
      };
      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (err) {
    console.warn('Could not load from IndexedDB:', err);
    return null;
  }
}

/**
 * Converte uma fase fechada (closedInTabs) em um "Cold Stub" ultraleve na RAM:
 * - Mantém stats pré-computados, metadados e tiles básicos dos biomas (para o card de preview do Hub)
 * - Mantém apenas marcadores não-terreno sem motionLayers (para portais de Travel entre fases)
 * - Descarta da RAM dezenas de milhares de células de colisão, tufos de grama/flores, carimbos e overlays.
 * Os dados completos permanecem 100% intactos no slot dedicado do IndexedDB e são hidratados sob demanda ao abrir a fase.
 */
export function createColdLevelStub(lvl: SavedLevel): SavedLevel {
  if (!lvl || !lvl.projectData) return lvl;
  const fullStats = lvl.stats || computeLevelStats(lvl.projectData);
  const p = lvl.projectData;
  const lightMarkers = (p.markers || [])
    .filter((m) => !m.id.startsWith('terrain-grass-') && !m.id.startsWith('terrain-flower-'))
    .map((m) => {
      if (!m.motionLayers) return m;
      const copy = { ...m };
      delete copy.motionLayers;
      return copy;
    });

  const lightSubBiomes = p.subBiomes
    ? p.subBiomes.map((sb) => ({
        ...sb,
        walkableCells: [],
        blockedCells: [],
      }))
    : undefined;

  return {
    ...lvl,
    stats: fullStats,
    isColdStub: true,
    projectData: {
      ...p,
      markers: lightMarkers,
      subBiomes: lightSubBiomes,
      walkableCells: [],
      blockedCells: [],
      groundStamps: [],
      motionOverlays: [],
      routes: [],
      savedDialogues: [],
    },
  };
}

/**
 * Carrega uma única fase completa diretamente do IndexedDB sob demanda (Lazy Hydration).
 */
export async function loadSingleLevelSlot(levelId: string): Promise<SavedLevel | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(`${LEVEL_SLOT_PREFIX}${levelId}`);
      req.onsuccess = () => {
        const found = req.result as SavedLevel | undefined;
        if (found && found.projectData) {
          found.projectData = internProjectAssets(found.projectData);
          found.stats = found.stats || computeLevelStats(found.projectData);
          resolve({ ...found, isColdStub: false });
          return;
        }
        // Fallback para galeria legada caso o slot individual ainda não exista
        const legacyReq = store.get(LEVELS_GALLERY_KEY);
        legacyReq.onsuccess = () => {
          const legacyList = (legacyReq.result as SavedLevel[]) || [];
          const legacyFound = legacyList.find((l) => l.id === levelId);
          if (legacyFound && legacyFound.projectData) {
            legacyFound.projectData = internProjectAssets(legacyFound.projectData);
            legacyFound.stats = legacyFound.stats || computeLevelStats(legacyFound.projectData);
            resolve({ ...legacyFound, isColdStub: false });
          } else {
            resolve(null);
          }
        };
        legacyReq.onerror = () => resolve(null);
      };
      req.onerror = () => resolve(null);
    });
  } catch (err) {
    console.warn('Could not load single level slot from IndexedDB:', err);
    return null;
  }
}

/**
 * Salva UMA ÚNICA fase em sua própria unidade/slot individual no IndexedDB (`phase_slot_v2_<id>`),
 * evitando re-serializar todas as outras fases e eliminando gargalos de Out of Memory.
 * Protegido contra sobrescrita acidental caso receba um Cold Stub (atualiza apenas metadados).
 */
export async function saveSingleLevelSlot(
  level: SavedLevel,
  allLevelsManifest?: SavedLevel[]
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const slotKey = `${LEVEL_SLOT_PREFIX}${level.id}`;

      const writeManifest = () => {
        if (allLevelsManifest) {
          const seenIds = new Set<string>();
          const uniqueLevels = allLevelsManifest.filter((l) => {
            if (!l?.id || seenIds.has(l.id)) return false;
            seenIds.add(l.id);
            return true;
          });
          const manifestIndex = uniqueLevels.map((l) => ({
            id: l.id,
            name: l.name,
            description: l.description,
            createdAt: l.createdAt,
            updatedAt: l.updatedAt,
            thumbnailPng: l.thumbnailPng,
            closedInTabs: l.closedInTabs,
            stats: l.stats || computeLevelStats(l.projectData),
          }));
          store.put(sanitizeForIndexedDB(manifestIndex), LEVELS_INDEX_KEY);
        }
      };

      if (level.isColdStub) {
        // Preserva o projectData completo existente no disco, atualizando apenas metadados
        const existingReq = store.get(slotKey);
        existingReq.onsuccess = () => {
          const existing = existingReq.result as SavedLevel | undefined;
          if (existing && existing.projectData) {
            store.put(
              sanitizeForIndexedDB({
                ...existing,
                name: level.name,
                description: level.description,
                updatedAt: level.updatedAt,
                thumbnailPng: level.thumbnailPng ?? existing.thumbnailPng,
                closedInTabs: level.closedInTabs,
                isColdStub: false,
              }),
              slotKey
            );
          }
          writeManifest();
        };
      } else {
        const enriched: SavedLevel = {
          ...level,
          isColdStub: false,
          stats: level.stats || computeLevelStats(level.projectData),
        };
        store.put(sanitizeForIndexedDB(enriched), slotKey);
        writeManifest();
      }

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save single level slot to IndexedDB:', err);
  }
}

/**
 * Remove o slot individual de uma fase excluída e atualiza o manifesto.
 */
export async function deleteSingleLevelSlot(
  levelId: string,
  remainingLevels: SavedLevel[]
): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      store.delete(`${LEVEL_SLOT_PREFIX}${levelId}`);

      const seenIds = new Set<string>();
      const uniqueRemaining = remainingLevels.filter((l) => {
        if (!l?.id || seenIds.has(l.id)) return false;
        seenIds.add(l.id);
        return true;
      });
      const manifestIndex = uniqueRemaining.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        thumbnailPng: l.thumbnailPng,
        closedInTabs: l.closedInTabs,
        stats: l.stats || computeLevelStats(l.projectData),
      }));
      store.put(sanitizeForIndexedDB(manifestIndex), LEVELS_INDEX_KEY);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not delete level slot from IndexedDB:', err);
  }
}

/**
 * Salva a galeria de fases particionada em unidades individuais no IndexedDB.
 */
export async function saveLevelsGallery(levels: SavedLevel[]): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);

      const seenIds = new Set<string>();
      const uniqueLevels = levels.filter((l) => {
        if (!l?.id || seenIds.has(l.id)) return false;
        seenIds.add(l.id);
        return true;
      });

      const manifestIndex = uniqueLevels.map((l) => {
        const stats = l.stats || computeLevelStats(l.projectData);
        if (!l.isColdStub) {
          const enriched = { ...l, isColdStub: false, stats };
          store.put(sanitizeForIndexedDB(enriched), `${LEVEL_SLOT_PREFIX}${l.id}`);
        }
        return {
          id: l.id,
          name: l.name,
          description: l.description,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
          thumbnailPng: l.thumbnailPng,
          closedInTabs: l.closedInTabs,
          stats,
        };
      });

      store.put(sanitizeForIndexedDB(manifestIndex), LEVELS_INDEX_KEY);
      store.delete(LEVELS_GALLERY_KEY);

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save levels gallery to IndexedDB:', err);
  }
}

/**
 * Carrega a galeria de fases do IndexedDB, unificando automaticamente slots dedicados V2
 * e fases legadas, aplicando interning de assets e mantendo fases fechadas em Cold Storage (stub leve na RAM).
 */
export async function loadLevelsGallery(): Promise<SavedLevel[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);

        const indexReq = store.get(LEVELS_INDEX_KEY);
        const legacyReq = store.get(LEVELS_GALLERY_KEY);
        const slotRequests: Array<{ meta: { id: string; closedInTabs?: boolean }; idx: number; req: IDBRequest }> = [];

        indexReq.onsuccess = () => {
          const manifestList = indexReq.result as Array<{ id: string; closedInTabs?: boolean }> | undefined;
          if (manifestList && Array.isArray(manifestList) && manifestList.length > 0) {
            const seenManifestIds = new Set<string>();
            manifestList.forEach((meta, idx) => {
              if (!meta?.id || seenManifestIds.has(meta.id)) return;
              seenManifestIds.add(meta.id);
              const req = store.get(`${LEVEL_SLOT_PREFIX}${meta.id}`);
              slotRequests.push({ meta, idx, req });
            });
          }
        };

        tx.oncomplete = () => {
          const legacyLevels = (legacyReq.result as SavedLevel[]) || [];

          if (slotRequests.length > 0) {
            const loadedSlots: SavedLevel[] = [];
            const seenLoadedIds = new Set<string>();
            for (const { meta, idx, req } of slotRequests) {
              if (seenLoadedIds.has(meta.id)) continue;
              const found = req.result as SavedLevel | undefined;
              if (found && found.projectData) {
                seenLoadedIds.add(meta.id);
                found.projectData = internProjectAssets(found.projectData);
                found.stats = found.stats || computeLevelStats(found.projectData);
                const isClosed = meta.closedInTabs ?? found.closedInTabs;
                const fullLevel: SavedLevel = { ...found, id: meta.id, closedInTabs: isClosed, isColdStub: false };
                loadedSlots.push(isClosed && idx > 0 ? createColdLevelStub(fullLevel) : fullLevel);
              } else {
                const fallback = legacyLevels.find((l) => l.id === meta.id);
                if (fallback && fallback.projectData) {
                  seenLoadedIds.add(meta.id);
                  fallback.projectData = internProjectAssets(fallback.projectData);
                  fallback.stats = fallback.stats || computeLevelStats(fallback.projectData);
                  loadedSlots.push(fallback);
                }
              }
            }
            if (loadedSlots.length > 0) {
              resolve(loadedSlots);
              return;
            }
          }

          // Fallback para galeria legada, internando todas as texturas no Pool
          const seenLegacyIds = new Set<string>();
          const internedLegacy = legacyLevels
            .filter((lvl) => {
              if (!lvl?.id || seenLegacyIds.has(lvl.id)) return false;
              seenLegacyIds.add(lvl.id);
              return true;
            })
            .map((lvl, idx) => {
              const full: SavedLevel = {
                ...lvl,
                projectData: internProjectAssets(lvl.projectData),
                stats: lvl.stats || computeLevelStats(lvl.projectData),
                isColdStub: false,
              };
              return full.closedInTabs && idx > 0 ? createColdLevelStub(full) : full;
            });
          resolve(internedLegacy);
        };

        tx.onerror = () => {
          resolve([]);
        };
      } catch (txErr) {
        console.warn('IndexedDB transaction fallback in loadLevelsGallery:', txErr);
        cachedDbPromise = null;
        resolve([]);
      }
    });
  } catch (err) {
    console.warn('Could not load levels gallery from IndexedDB:', err);
    return [];
  }
}

/**
 * Tenta recuperar projeto antigo do localStorage se existir antes de limpar.
 */
export function tryRecoverFromOldLocalStorage(): MapProject | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem('tilescroll_project');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          return internProjectAssets(parsed);
        }
      }
    }
  } catch (err) {
    console.warn('Erro ao tentar recuperar de localStorage antigo:', err);
  }
  return null;
}

/**
 * Salva um backup de segurança automático no IndexedDB
 */
export async function saveProjectSafetyBackup(project: MapProject): Promise<void> {
  if (
    !project ||
    ((project.biomes || []).length === 0 &&
      (project.subBiomes || []).length === 0 &&
      (project.markers || []).length === 0)
  ) {
    return;
  }
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(sanitizeForIndexedDB(project), 'safety_backup_project');
  } catch (err) {
    console.warn('Could not save safety backup:', err);
  }
}

/**
 * Limpa com segurança itens obsoletos, preservando backups
 */
export function cleanupOldLocalStorage() {
  // Mantido seguro sem remover dados válidos prematuramente
}
