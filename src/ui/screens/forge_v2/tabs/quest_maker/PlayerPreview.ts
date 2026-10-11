import { PlayerPhaseInteractor } from './PlayerPhaseInteractor';

interface PhaseInfo {
  id: string;
  name: string;
  playerPos?: { x: number; y: number };
}

export class PlayerPreview {
  private _mode: 'phase' | 'game' = 'phase';
  private _phaseInteractor: PlayerPhaseInteractor | null = null;
  private _container: HTMLElement | null = null;
  private _iframe: HTMLIFrameElement | null = null;

  constructor() {
    this._phaseInteractor = new PlayerPhaseInteractor();
    
    window.addEventListener('message', (e) => {
      if (e.data?.type === 'PLAYERPREVIEW_LOAD_PHASE') {
        this.switchToPhase(e.data.phase?.id || e.data.phase?.name);
      }
    });
  }

  public render(state: any): string {
    return `
      <div class="player-preview-wrapper" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:10px; box-sizing:border-box;">
        <div class="pp-toolbar" style="width:90%; display:flex; gap:4px; margin-bottom:8px;">
          <button class="pp-mode-btn" data-mode="phase" style="flex:1; padding:8px; border-radius:6px; cursor:pointer; font-size:0.5rem; font-weight:900; background:${this._mode === 'phase' ? 'rgba(255,215,0,0.2)' : 'rgba(0,0,0,0.4)'}; border:1px solid ${this._mode === 'phase' ? 'rgba(255,215,0,0.5)' : 'rgba(255,255,255,0.1)'}; color:${this._mode === 'phase' ? '#ffd700' : '#888'};">🎮 FASE</button>
          <button class="pp-mode-btn" data-mode="game" style="flex:1; padding:8px; border-radius:6px; cursor:pointer; font-size:0.5rem; font-weight:900; background:${this._mode === 'game' ? 'rgba(81,197,255,0.2)' : 'rgba(0,0,0,0.4)'}; border:1px solid ${this._mode === 'game' ? 'rgba(81,197,255,0.5)' : 'rgba(255,255,255,0.1)'}; color:${this._mode === 'game' ? '#51c5ff' : '#888'};">🌐 GAME FULL</button>
        </div>

        <div id="pp-phone-area" style="width:90%; aspect-ratio:1/2; border:3px solid ${this._mode === 'game' ? 'rgba(81,197,255,0.5)' : 'rgba(255,215,0,0.3)'}; border-radius:24px; display:flex; align-items:center; justify-content:center; background:#000; box-shadow: 0 0 40px rgba(0,0,0,0.5); overflow:hidden; position:relative;">
          ${this._mode === 'phase' ? 
            this._phaseInteractor?.render(state) : 
            `<iframe id="pp-game-iframe" style="width:100%; height:100%; border:none; position:absolute; top:0; left:0;"></iframe>`
          }
        </div>

        <div class="pp-status" style="width:90%; margin-top:8px; display:flex; justify-content:space-between; font-size:0.45rem; color:rgba(255,255,255,0.4);">
          <span>${this._mode === 'phase' ? '🎮 Câmera 2D' : '🌐 Jogo Completo'}</span>
          <span>${this._mode === 'game' ? '🌐 RODANDO' : '🎮 ATIVO'}</span>
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any) {
    this._container = container;
    
    container.querySelectorAll('.pp-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._mode = (btn as HTMLElement).dataset.mode as 'phase' | 'game';
        
        // Stop phase render loop before switching
        if (this._mode === 'game') {
          this._phaseInteractor?.setActive(false);
        }
        
        this.rerender(state);
      });
    });

    if (this._mode === 'phase') {
      const phoneArea = container.querySelector('#pp-phone-area');
      if (phoneArea) {
        this._phaseInteractor?.bind(phoneArea as HTMLElement, state);
        // Start phase render loop
        this._phaseInteractor?.setActive(true);
      }
    } else {
      setTimeout(() => this.loadGame(), 100);
    }
  }

  private loadGame() {
    this._iframe = document.getElementById('pp-game-iframe') as HTMLIFrameElement;
    if (!this._iframe) return;
    
    const port = window.location.port || '3000';
    this._iframe.src = `http://localhost:${port}/`;
    
    this._iframe.onload = () => {
      setTimeout(() => this.injectPhaseLoader(), 1500);
    };
  }

  private injectPhaseLoader() {
    if (!this._iframe?.contentWindow) return;
    
    try {
      const doc = this._iframe.contentDocument;
      if (!doc) return;
      
      const mapContainer = doc.querySelector('.map-container, #map-view, [class*="map"]');
      if (mapContainer) {
        const phases = this.getSavedPhases();
        
        const phasesList = doc.createElement('div');
        phasesList.id = 'pp-phases-list';
        phasesList.innerHTML = `
          <div style="padding: 20px; background: rgba(0,0,0,0.9); height: 100%; overflow-y: auto;">
            <h3 style="color: #66bb6a; margin-bottom: 15px; font-size: 14px;">🗺️ FASES CRIADAS</h3>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${phases.length === 0 ? '<div style="color: #666; font-size: 12px;">Nenhuma fase salva</div>' : ''}
              ${phases.map(p => `
                <button data-phase-id="${p.id}" style="
                  padding: 12px; 
                  background: rgba(102,187,106,0.2); 
                  border: 1px solid rgba(102,187,106,0.5); 
                  border-radius: 8px; 
                  color: #66bb6a; 
                  cursor: pointer;
                  font-size: 12px;
                  text-align: left;
                ">
                  🎮 ${p.name}
                </button>
              `).join('')}
            </div>
          </div>
        `;
        
        phasesList.style.cssText = 'position: absolute; top: 0; right: 0; width: 200px; height: 100%; z-index: 1000;';
        
        const existingList = doc.getElementById('pp-phases-list');
        if (!existingList && mapContainer) {
          (mapContainer as HTMLElement).appendChild(phasesList);
          
          phasesList.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
              const phaseId = (btn as HTMLElement).dataset.phaseId;
              if (phaseId) {
                this.switchToPhase(phaseId);
              }
            });
          });
        }
      }
    } catch (e) {
      console.log('[PlayerPreview] Cannot inject to iframe:', e);
    }
  }

  private getSavedPhases(): PhaseInfo[] {
    try {
      const saved = localStorage.getItem('forge_phase_presets') || '[]';
      const phases = JSON.parse(saved);
      return phases.map((p: any, i: number) => ({
        id: p.id || `phase_${i}`,
        name: p.name || p.label || `Fase ${i + 1}`,
        playerPos: p.playerPos
      }));
    } catch {
      return [];
    }
  }

  private switchToPhase(phaseId: string) {
    this._mode = 'phase';
    const state = {};
    this.rerender(state);
    
    setTimeout(() => {
      (this._phaseInteractor as any)._currentPhase = this.getSavedPhases().find(p => p.id === phaseId);
      (this._phaseInteractor as any)._gameState = 'running';
      if ((this._phaseInteractor as any)._currentPhase?.playerPos) {
        (this._phaseInteractor as any)._playerPos = { ...(this._phaseInteractor as any)._currentPhase.playerPos };
      }
    }, 100);
  }

  public switchToGameFull(screen?: string) {
    this._mode = 'game';
    const state = {};
    this.rerender(state);
    
    setTimeout(() => {
      if (screen) {
        const urlParams = new URLSearchParams({ tab: screen });
        const port = window.location.port || '3000';
        if (this._iframe) {
          this._iframe.src = `http://localhost:${port}/hub.html?${urlParams.toString()}`;
        }
      } else {
        this.loadGame();
      }
    }, 200);
  }

  private rerender(state: any) {
    if (!this._container) return;
    this._container.innerHTML = this.render(state);
    this.bind(this._container, state);
  }

  public setWorldMapInstance(wm: any) {
    this._phaseInteractor?.setWorldMapInstance(wm);
    
    const phaseInteractor = this._phaseInteractor as any;
    if (phaseInteractor && wm) {
      const originalShowOverlay = phaseInteractor.showOverlay?.bind(phaseInteractor);
      phaseInteractor.showOverlay = (type: string, data?: any) => {
        if (type === 'screen' && data?.screenType) {
          if (data.screenType === 'map') {
            setTimeout(() => this.injectPhaseLoader(), 500);
          }
          this.switchToGameFull(data.screenType);
          return;
        }
        if (originalShowOverlay) {
          originalShowOverlay(type, data);
        }
      };
    }
  }

  public isPlaying(): boolean {
    return this._phaseInteractor?.isPlaying() || false;
  }

  public setActive(active: boolean) {
    this._phaseInteractor?.setActive(active);
  }

  public updateCameraView(objects: any[], playerPos: any, frameSize: any) {
    this._phaseInteractor?.updateCameraView(objects, playerPos, frameSize);
  }
}
