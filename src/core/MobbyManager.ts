import defaultMobbys from './mobbys.json';
import {
  dehydrateObjectAssetsToDisk,
  isBase64DataUrl,
  isVolatileBlobUrl,
  uploadDataUrlToDisk,
} from './DiskAssetEngine';

export interface MobbyDialogue {
  triggerType: 'hp_below' | 'turn_reached';
  triggerValue: number; // Porcentagem de HP (ex: 50) ou número do turno (ex: 2)
  speaker: 'mobby' | 'player';
  text: string;
  triggered?: boolean;
}

export interface Mobby {
  id: string;
  name: string;
  description: string;
  image: string;
  hp: number;
  maxHp: number;
  atk: number;
  rewardCardId: string;
  linkedCardId?: string; // ID ou Título da carta vinculada bidirecionalmente
  artifacts: string[]; // 4 artefatos
  dialogues: MobbyDialogue[];
  // Controles de escala, posição, rotação, fundo e som
  scale?: number; // Escala percentual (ex: 100 = 1x, 130 = 1.3x)
  offsetX?: number; // Deslocamento horizontal em px
  offsetY?: number; // Deslocamento vertical em px
  rotation?: number; // Rotação em graus (ex: 0, -25, 45, etc.)
  backgroundUrl?: string; // Imagem ou vídeo (mp4/webm) de fundo personalizado do duelo
  bgmUrl?: string; // Música tema do chefe
  attackSfxUrl?: string; // Som de ataque personalizado
}

const STORAGE_KEY = 'legends_mobbys_data';
const MATRIX_STORAGE_KEY = 'slimelands_active_matrix_v1';

export class MobbyManager {
  private static mobbys: Mobby[] = [];
  private static diskHydrated = false;

  public static loadMobbys(): Mobby[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.mobbys = parsed;
          this.hydrateFromDiskAsync();
          return this.mobbys;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar mobbys do localStorage:', e);
    }

    // Fallback para o arquivo em disco inicial (mobbys.json)
    this.mobbys = JSON.parse(JSON.stringify(defaultMobbys));
    this.saveMobbys(this.mobbys);
    this.hydrateFromDiskAsync();
    return this.mobbys;
  }

  private static hydrateFromDiskAsync(): void {
    if (this.diskHydrated || typeof window === 'undefined') return;
    this.diskHydrated = true;
    fetch('/api/mobbys')
      .then((r) => (r.ok ? r.json() : null))
      .then((diskList) => {
        if (Array.isArray(diskList) && diskList.length > 0) {
          // Se o localStorage estiver vazio ou desatualizado, sincroniza da unidade de disco
          if (!this.mobbys || this.mobbys.length === 0) {
            this.mobbys = diskList;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(diskList));
            } catch (_) {}
          }
        }
      })
      .catch(() => {});
  }

  public static getMobbys(): Mobby[] {
    if (!this.mobbys || this.mobbys.length === 0) {
      return this.loadMobbys();
    }
    return this.mobbys;
  }

  public static getMobbyById(id: string): Mobby | null {
    const list = this.getMobbys();
    const found = list.find((m) => m.id === id);
    if (found) return JSON.parse(JSON.stringify(found));
    return list.length > 0 ? JSON.parse(JSON.stringify(list[0])) : null;
  }

  public static getLinkedMobbyForCard(cardId?: string, cardTitle?: string): Mobby | null {
    const list = this.getMobbys();
    const normTitle = (cardTitle || '').trim().toLowerCase();
    const normId = (cardId || '').trim().toLowerCase();
    if (!normTitle && !normId) return null;

    const found = list.find((m) => {
      const mLinkedId = (m.linkedCardId || '').trim().toLowerCase();
      const mRewardId = (m.rewardCardId || '').trim().toLowerCase();
      if (normId && (mLinkedId === normId || mRewardId === normId)) return true;
      if (normTitle && (mRewardId === normTitle || mLinkedId === normTitle)) return true;
      return false;
    });
    return found ? JSON.parse(JSON.stringify(found)) : null;
  }

  /**
   * Vincula bidirecionalmente um Mobby e uma Carta tanto na lista de Mobbys quanto no Snapshot da Matriz.
   */
  public static setBidirectionalLink(
    mobbyId: string | null,
    cardId: string,
    cardTitle: string,
    syncImageUrl?: string
  ): void {
    const list = this.getMobbys();
    const normCardTitle = (cardTitle || '').trim();
    const normCardId = (cardId || '').trim();

    let targetMobby: Mobby | undefined;

    if (mobbyId) {
      targetMobby = list.find((m) => m.id === mobbyId);
      if (targetMobby) {
        targetMobby.rewardCardId = normCardTitle || normCardId;
        targetMobby.linkedCardId = normCardId || normCardTitle;
        if (syncImageUrl) {
          targetMobby.image = syncImageUrl;
        }
      }
    } else {
      // Desvincular Mobbys que apontavam para esta carta
      list.forEach((m) => {
        if (
          m.linkedCardId === normCardId ||
          m.rewardCardId.toLowerCase() === normCardTitle.toLowerCase()
        ) {
          m.linkedCardId = '';
        }
      });
    }

    this.saveMobbys(list);

    // Atualiza o snapshot da Matriz para refletir o vínculo na Carta
    try {
      const rawSnap = localStorage.getItem(MATRIX_STORAGE_KEY);
      if (rawSnap) {
        const snap = JSON.parse(rawSnap);
        if (Array.isArray(snap.cards)) {
          snap.cards = snap.cards.map((c: any) => {
            const isTargetCard =
              (normCardId && c.id === normCardId) ||
              (normCardTitle &&
                (c.title || '').trim().toLowerCase() === normCardTitle.toLowerCase());
            if (isTargetCard) {
              return {
                ...c,
                linkedMobbyId: targetMobby ? targetMobby.id : undefined,
                linkedMobbyName: targetMobby ? targetMobby.name : undefined,
                ...(syncImageUrl ? { imageUrl: syncImageUrl } : {}),
              };
            }
            return c;
          });
          localStorage.setItem(MATRIX_STORAGE_KEY, JSON.stringify(snap));
        }
      }
    } catch (err) {
      console.warn('Falha ao sincronizar vínculo Mobby-Carta no snapshot da Matriz:', err);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('slimelands:mobby-card-link-updated', {
          detail: {
            mobbyId: targetMobby?.id || null,
            mobbyName: targetMobby?.name || null,
            mobbyImage: targetMobby?.image || null,
            cardId: normCardId,
            cardTitle: normCardTitle,
            syncImageUrl,
          },
        })
      );
    }
  }

  private static backendDebounceTimer: any = null;

  public static saveMobbys(list: Mobby[]): void {
    this.mobbys = list;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar mobbys no localStorage:', e);
    }

    // Debounce na gravação em disco (com desidratação automática de Base64 para public/assets/engine/mobbys)
    if (this.backendDebounceTimer) {
      clearTimeout(this.backendDebounceTimer);
    }
    this.backendDebounceTimer = setTimeout(async () => {
      try {
        const cleanList = await dehydrateObjectAssetsToDisk(this.mobbys, 'mobbys');
        this.mobbys = cleanList;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanList));
        } catch (_) {}
        await fetch('/api/save-mobbys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(cleanList),
        });
      } catch (_) {}
    }, 600);
  }

  public static upsertMobby(mobby: Mobby): void {
    if (mobby.rewardCardId && !mobby.linkedCardId) {
      mobby.linkedCardId = mobby.rewardCardId;
    }
    // Se algum campo de mídia do Mobby vier em Base64 ou blob:, desidrata imediatamente para disco
    if (isBase64DataUrl(mobby.image) || isVolatileBlobUrl(mobby.image)) {
      uploadDataUrlToDisk(mobby.image, mobby.name || mobby.id, 'mobbys').then((url) => {
        mobby.image = url;
      });
    }
    const list = this.getMobbys();
    const idx = list.findIndex((m) => m.id === mobby.id);
    if (idx >= 0) {
      list[idx] = mobby;
    } else {
      list.push(mobby);
    }
    this.saveMobbys(list);
  }

  public static deleteMobby(id: string): void {
    const list = this.getMobbys().filter((m) => m.id !== id);
    this.saveMobbys(list);
  }
}
