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

export async function loadGameMatrixSnapshot(): Promise<SlimelandsGameMatrixSnapshot | null> {
  try {
    const db = await openMatrixDB();
    const idbSnap = await new Promise<SlimelandsGameMatrixSnapshot | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(SNAPSHOT_KEY);
      req.onsuccess = () => {
        const result = req.result as SlimelandsGameMatrixSnapshot | undefined;
        resolve(result || null);
      };
      req.onerror = () => resolve(null);
    });
    if (idbSnap) return idbSnap;
  } catch {
    // Fallback to localStorage below
  }

  try {
    const raw = window.localStorage.getItem(SNAPSHOT_KEY);
    if (raw) return JSON.parse(raw) as SlimelandsGameMatrixSnapshot;
  } catch {
    // Ignore parse errors
  }

  return null;
}

export async function saveGameMatrixSnapshot(
  snapshot: SlimelandsGameMatrixSnapshot
): Promise<void> {
  try {
    const db = await openMatrixDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(snapshot, SNAPSHOT_KEY);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Fallback handled below
  }

  try {
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Ignore quota errors if localStorage fallback is full
  }

  try {
    window.dispatchEvent(new CustomEvent('hestridia:matrix-updated', { detail: snapshot }));
    if (window.parent && window.parent !== window) {
      window.parent.dispatchEvent(new CustomEvent('hestridia:matrix-updated', { detail: snapshot }));
    }
  } catch {
    // Ignore cross-frame dispatch errors
  }
}

