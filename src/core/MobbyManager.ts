import defaultMobbys from './mobbys.json';

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
  artifacts: string[]; // 4 artefatos
  dialogues: MobbyDialogue[];
  // Novos controles de escala, posição, rotação, fundo e som
  scale?: number; // Escala percentual (ex: 100 = 1x, 130 = 1.3x)
  offsetX?: number; // Deslocamento horizontal em px
  offsetY?: number; // Deslocamento vertical em px
  rotation?: number; // Rotação em graus (ex: 0, -25, 45, etc.)
  backgroundUrl?: string; // Imagem ou vídeo (mp4/webm) de fundo personalizado do duelo
  bgmUrl?: string; // Música tema do chefe
  attackSfxUrl?: string; // Som de ataque personalizado
}

const STORAGE_KEY = 'legends_mobbys_data';

export class MobbyManager {
  private static mobbys: Mobby[] = [];

  public static loadMobbys(): Mobby[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.mobbys = parsed;
          return this.mobbys;
        }
      }
    } catch (e) {
      console.warn('Erro ao carregar mobbys do localStorage:', e);
    }

    // Fallback para o arquivo inicial
    this.mobbys = JSON.parse(JSON.stringify(defaultMobbys));
    this.saveMobbys(this.mobbys);
    return this.mobbys;
  }

  public static getMobbys(): Mobby[] {
    if (!this.mobbys || this.mobbys.length === 0) {
      return this.loadMobbys();
    }
    return this.mobbys;
  }

  public static getMobbyById(id: string): Mobby | null {
    const list = this.getMobbys();
    const found = list.find(m => m.id === id);
    if (found) return JSON.parse(JSON.stringify(found));
    return list.length > 0 ? JSON.parse(JSON.stringify(list[0])) : null;
  }

  private static backendDebounceTimer: any = null;

  public static saveMobbys(list: Mobby[]): void {
    this.mobbys = list;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('Erro ao salvar mobbys no localStorage:', e);
    }

    // Debounce na gravação em disco para evitar I/O excessivo enquanto o usuário arrasta controles
    if (this.backendDebounceTimer) {
      clearTimeout(this.backendDebounceTimer);
    }
    this.backendDebounceTimer = setTimeout(() => {
      try {
        fetch('/api/save-mobbys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(list)
        }).catch(() => {});
      } catch (_) {}
    }, 2000);
  }

  public static upsertMobby(mobby: Mobby): void {
    const list = this.getMobbys();
    const idx = list.findIndex(m => m.id === mobby.id);
    if (idx >= 0) {
      list[idx] = mobby;
    } else {
      list.push(mobby);
    }
    this.saveMobbys(list);
  }

  public static deleteMobby(id: string): void {
    const list = this.getMobbys().filter(m => m.id !== id);
    this.saveMobbys(list);
  }
}
