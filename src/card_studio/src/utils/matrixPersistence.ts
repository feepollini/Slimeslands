import { CardData } from '../types/card';
import {
  BaseCharacter,
  BoosterModel,
  BoosterOpenHistoryEntry,
  CardClass,
  ClassBalanceTable,
  DeckCategory,
  SubgroupCatalog,
} from '../types/slimelands';
import {
  dehydrateObjectAssetsToDisk,
  isBase64DataUrl,
  isVolatileBlobUrl,
  uploadDataUrlToDisk,
} from '../../../core/DiskAssetEngine';

export interface SlimelandsGameMatrixSnapshot {
  version: number;
  updatedAt: string;
  cards: CardData[];
  decks: DeckCategory[];
  baseCharacters: BaseCharacter[];
  balanceTables: Record<CardClass, ClassBalanceTable>;
  boosterModels: BoosterModel[];
  subgroupCatalog?: SubgroupCatalog;
  playerInventory?: CardData[];
  playerCoins?: number;
  boosterStock?: Record<string, number>;
  boosterHistory?: BoosterOpenHistoryEntry[];
  globalBackImageUrl: string | null;
  activeCardId: string;
  stageDraftCard?: CardData;
  isLibraryCleared?: boolean;
}

const DB_NAME = 'SlimelandsGameMatrixDB';
const DB_VERSION = 1;
const STORE_NAME = 'matrix_state';
const SNAPSHOT_KEY = 'slimelands_active_matrix_v1';

let backendSaveDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function openMatrixDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dehydrateCardListAssets(cards: CardData[] | undefined): Promise<CardData[] | undefined> {
  if (!Array.isArray(cards) || cards.length === 0) return cards;
  let mutated = false;
  const nextCards: CardData[] = [];
  for (const c of cards) {
    let nextCard = c;
    if (c.imageUrl && (isBase64DataUrl(c.imageUrl) || isVolatileBlobUrl(c.imageUrl))) {
      const diskUrl = await uploadDataUrlToDisk(c.imageUrl, c.title || c.id || 'card', 'cards');
      if (diskUrl !== c.imageUrl) {
        nextCard = { ...nextCard, imageUrl: diskUrl };
        mutated = true;
      }
    }
    if (c.backImageUrl && (isBase64DataUrl(c.backImageUrl) || isVolatileBlobUrl(c.backImageUrl))) {
      const diskBackUrl = await uploadDataUrlToDisk(c.backImageUrl, `${c.title || c.id}_back`, 'cards');
      if (diskBackUrl !== c.backImageUrl) {
        nextCard = { ...nextCard, backImageUrl: diskBackUrl };
        mutated = true;
      }
    }
    if (c.videoUrl && (isBase64DataUrl(c.videoUrl) || isVolatileBlobUrl(c.videoUrl))) {
      const diskVideoUrl = await uploadDataUrlToDisk(c.videoUrl, `${c.title || c.id}_video`, 'cards');
      if (diskVideoUrl !== c.videoUrl) {
        nextCard = { ...nextCard, videoUrl: diskVideoUrl };
        mutated = true;
      }
    }
    nextCards.push(nextCard);
  }
  return mutated ? nextCards : cards;
}

export async function dehydrateMatrixSnapshotAssets(
  snapshot: SlimelandsGameMatrixSnapshot
): Promise<SlimelandsGameMatrixSnapshot> {
  try {
    let globalBack = snapshot.globalBackImageUrl;
    if (globalBack && (isBase64DataUrl(globalBack) || isVolatileBlobUrl(globalBack))) {
      globalBack = await uploadDataUrlToDisk(globalBack, 'global_card_back', 'cards');
    }

    const cards = (await dehydrateCardListAssets(snapshot.cards)) || snapshot.cards;
    const playerInventory = await dehydrateCardListAssets(snapshot.playerInventory);

    let stageDraftCard = snapshot.stageDraftCard;
    if (stageDraftCard) {
      const drafted = await dehydrateCardListAssets([stageDraftCard]);
      if (drafted && drafted[0]) stageDraftCard = drafted[0];
    }

    return {
      ...snapshot,
      globalBackImageUrl: globalBack,
      cards,
      playerInventory,
      stageDraftCard,
    };
  } catch {
    return snapshot;
  }
}

export async function loadGameMatrixSnapshot(): Promise<SlimelandsGameMatrixSnapshot | null> {
  // 1. Prioritize local disk storage unit (/api/matrix-state -> src/core/matrix_state.json)
  let diskSnap: SlimelandsGameMatrixSnapshot | null = null;
  try {
    const res = await fetch('/api/matrix-state');
    if (res.ok) {
      const parsed = await res.json();
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.cards)) {
        diskSnap = parsed as SlimelandsGameMatrixSnapshot;
      }
    }
  } catch {
    // Ignore if backend route is unavailable
  }

  // 2. Check IndexedDB / localStorage for any newer local snapshot
  let localSnap: SlimelandsGameMatrixSnapshot | null = null;
  try {
    const db = await openMatrixDB();
    localSnap = await new Promise<SlimelandsGameMatrixSnapshot | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SNAPSHOT_KEY);
      req.onsuccess = () => {
        const result = req.result as SlimelandsGameMatrixSnapshot | undefined;
        resolve(result || null);
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    // Fallback to localStorage below
  }

  if (!localSnap) {
    try {
      const raw = window.localStorage.getItem(SNAPSHOT_KEY);
      if (raw) localSnap = JSON.parse(raw) as SlimelandsGameMatrixSnapshot;
    } catch {
      // Ignore parse errors
    }
  }

  let chosen: SlimelandsGameMatrixSnapshot | null = diskSnap || localSnap;
  if (diskSnap && localSnap) {
    const diskTime = Date.parse(diskSnap.updatedAt || '') || 0;
    const localTime = Date.parse(localSnap.updatedAt || '') || 0;
    chosen = localTime > diskTime ? localSnap : diskSnap;
  }

  if (!chosen) return null;

  // Ensure any legacy Base64 strings inside the snapshot are flushed to physical disk files
  const hasBase64 =
    isBase64DataUrl(chosen.globalBackImageUrl) ||
    chosen.cards?.some((c) => isBase64DataUrl(c.imageUrl) || isBase64DataUrl(c.backImageUrl)) ||
    chosen.playerInventory?.some((c) => isBase64DataUrl(c.imageUrl));

  if (hasBase64) {
    const cleanSnap = await dehydrateMatrixSnapshotAssets(chosen);
    saveGameMatrixSnapshot(cleanSnap).catch(() => {});
    return cleanSnap;
  }

  // If local was newer than disk, sync it to disk in the background
  if (chosen === localSnap && !diskSnap) {
    fetch('/api/matrix-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chosen),
    }).catch(() => {});
  }

  return chosen;
}

export async function saveGameMatrixSnapshot(
  snapshot: SlimelandsGameMatrixSnapshot
): Promise<void> {
  // Dehydrate any volatile blob: or heavy Base64 data: URLs to physical disk files (/cards/...)
  const cleanSnapshot = await dehydrateMatrixSnapshotAssets(snapshot);

  try {
    const db = await openMatrixDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(cleanSnapshot, SNAPSHOT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback handled below
  }

  try {
    // Because all images are now lightweight /cards/... paths, localStorage never overflows!
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(cleanSnapshot));
  } catch {
    // Ignore quota errors if localStorage is full from unrelated keys
  }

  // Persist to project disk unit (src/core/matrix_state.json) with debounce
  if (backendSaveDebounceTimer) {
    clearTimeout(backendSaveDebounceTimer);
  }
  backendSaveDebounceTimer = setTimeout(() => {
    dehydrateObjectAssetsToDisk(cleanSnapshot, 'cards')
      .then((diskReady) =>
        fetch('/api/matrix-state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(diskReady),
        })
      )
      .catch(() => {});
  }, 350);

  try {
    window.dispatchEvent(new CustomEvent('hestridia:matrix-updated', { detail: cleanSnapshot }));
    if (window.parent && window.parent !== window) {
      window.parent.dispatchEvent(
        new CustomEvent('hestridia:matrix-updated', { detail: cleanSnapshot })
      );
    }
  } catch {
    // Ignore cross-frame dispatch errors
  }
}
