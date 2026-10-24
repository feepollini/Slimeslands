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

export async function clearMatrixStorage(): Promise<void> {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(SNAPSHOT_KEY);
    window.localStorage.removeItem('slimelands_matrix_drawer_ui_v1');
    window.localStorage.removeItem('slimelands_custom_decks_v1');
    window.localStorage.removeItem('arsenal_predeck');
    window.localStorage.removeItem('arsenal_predeck_s1');
    window.localStorage.removeItem('forge_active_deck_id');
    window.localStorage.removeItem('forja_v2_packs');
    window.localStorage.removeItem('forge_v2_persistence');
  } catch {}

  try {
    window.indexedDB.deleteDatabase(DB_NAME);
  } catch {}
}

if (typeof window !== 'undefined') {
  (window as any).clearSlimelandsMatrix = async () => {
    await clearMatrixStorage();
    window.location.href = window.location.pathname;
  };
}

export async function loadGameMatrixSnapshot(): Promise<SlimelandsGameMatrixSnapshot | null> {
  // Reset de emergência caso haja ?reset_matrix=1 ou ?clear_matrix=1 na URL
  if (
    typeof window !== 'undefined' &&
    (window.location.search.includes('reset_matrix=1') ||
      window.location.search.includes('clear_matrix=1') ||
      window.location.search.includes('limpar=1'))
  ) {
    await clearMatrixStorage();
    let defaultSnap: SlimelandsGameMatrixSnapshot | null = null;
    try {
      const res = await fetch('/src/core/matrix_snapshot.json');
      if (res.ok) {
        defaultSnap = (await res.json()) as SlimelandsGameMatrixSnapshot;
        if (defaultSnap) {
          await saveGameMatrixSnapshot(defaultSnap);
        }
      }
    } catch {}
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    return defaultSnap;
  }

  let snap: SlimelandsGameMatrixSnapshot | null = null;
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
    if (idbSnap) snap = idbSnap;
  } catch {
    // Fallback to localStorage below
  }

  if (!snap) {
    try {
      const raw = window.localStorage.getItem(SNAPSHOT_KEY);
      if (raw) snap = JSON.parse(raw) as SlimelandsGameMatrixSnapshot;
    } catch {
      // Ignore parse errors
    }
  }

  // Se estiver vazio ou for versão antiga (< 3), carrega o catálogo oficial com os 6 Decks Temáticos
  if (!snap || !snap.cards || snap.cards.length === 0 || !snap.version || snap.version < 3) {
    try {
      const res = await fetch('/src/core/matrix_snapshot.json');
      if (res.ok) {
        snap = (await res.json()) as SlimelandsGameMatrixSnapshot;
        if (snap) {
          saveGameMatrixSnapshot(snap).catch(() => {});
        }
      }
    } catch {}
  }

  // Sanitização automática ao carregar: se houver cartas com Base64 gigante do teste antigo, limpa na hora!
  if (snap && Array.isArray(snap.cards)) {
    let purgedBlobs = false;
    snap.cards = snap.cards.map((c) => {
      let img = c.imageUrl;
      if (img && img.startsWith('data:') && img.length > 512) {
        purgedBlobs = true;
        const cleanTitle = (c.title || 'card').replace(/[^a-zA-Z0-9_-]/g, '_');
        img = `/cards/${cleanTitle}.png`;
      }
      let back = c.backImageUrl;
      if (back && back.startsWith('data:') && back.length > 512) {
        purgedBlobs = true;
        back = '/backcard.jpg';
      }
      return { ...c, imageUrl: img, backImageUrl: back };
    });

    if (purgedBlobs) {
      saveGameMatrixSnapshot(snap).catch(() => {});
    }
  }

  return snap;
}

function sanitizeSnapshotForLocalStorage(snapshot: SlimelandsGameMatrixSnapshot): SlimelandsGameMatrixSnapshot {
  const safeCards = (snapshot.cards || []).map((c) => {
    let img = c.imageUrl;
    if (img && img.startsWith('data:') && img.length > 512) {
      img = `/cards/${(c.title || 'card').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
    }
    let back = c.backImageUrl;
    if (back && back.startsWith('data:') && back.length > 512) {
      back = '/backcard.jpg';
    }
    return { ...c, imageUrl: img, backImageUrl: back };
  });

  return {
    ...snapshot,
    cards: safeCards,
  };
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
    const cleanSnap = sanitizeSnapshotForLocalStorage(snapshot);
    window.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(cleanSnap));
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


