import { ForgeCore } from '../../../core/ForgeCore';
import { PixelEditor } from './PixelEditor';
import { VirtualJoystick } from '../world_map/VirtualJoystick';
import { SoundCentralScreen } from '../../SoundCentralScreen';

export interface AnimationData {
  type: 'png' | 'video' | 'gif';
  videoUrl: string | null;
  gifUrl: string | null;
  frames: string[];
  frameRate: number;
}

export interface SpriteAction {
  id: string; 
  name: string;
  directions: {
    up: AnimationData | null;
    down: AnimationData | null;
    left: AnimationData | null;
    right: AnimationData | null;
  };
  linkedSoundUrl?: string;
}

export interface SpriteFolder {
  id: string;
  name: string;
  isPreset: boolean;
  actions: SpriteAction[];
  globalSoundUrl?: string;
}

export interface GalleryItem {
    id: string;
    name: string;
    type: 'pixel' | 'imported';
    frames: string[]; // Base64 sequence
    frameRate: number;
    previewUrl: string; // GIF or First Frame
    createdAt: number;
}

export class SpritesMain {
  private callbacks: any;
  private state: any;
  private core: ForgeCore;
  
  // Interaction State
  private editorMode: 'pack' | 'pixel' = 'pack';
  private pixelEditor: PixelEditor | null = null;
  private isHubOpen: boolean = true;
  private hubTab: 'projects' | 'gallery' = 'projects';
  private unsavedChanges: boolean = false;
  
  // Navigation State
  private activeFolderId: string | null = null;
  private activeActionId: string | null = null;
  private activeDirection: 'up' | 'down' | 'left' | 'right' = 'down';
  
  // Utilities
  private joystick: VirtualJoystick | null = null;
  private animationInterval: any = null;
  private currentFrameIdx: number = 0;
  private soundBrowser: SoundCentralScreen | null = null;

  constructor(_state: any, _core: ForgeCore, callbacks: any) {
    this.state = _state;
    this.core = _core;
    this.callbacks = callbacks;
    
    // Initialize global storage if missing
    if (!this.state.customSpritePacks) this.state.customSpritePacks = [];
    if (!this.state.customGallerySprites) this.state.customGallerySprites = [];
  }

  public updateRefs(state: any, callbacks: any) {
    this.state = state;
    this.callbacks = callbacks;
    if (this.pixelEditor) this.pixelEditor.updateRefs(state, callbacks);
    if (this.soundBrowser) this.soundBrowser.updateRefs(state, callbacks);
  }

  private getActiveFolder(): SpriteFolder | null {
    if (!this.activeFolderId) return null;
    return this.state.customSpritePacks.find((f: SpriteFolder) => f.id === this.activeFolderId) || null;
  }

  private getActiveAction(): SpriteAction | null {
    const folder = this.getActiveFolder();
    if (!folder || !this.activeActionId) return null;
    return folder.actions.find(a => a.id === this.activeActionId) || null;
  }

  private markDirty() {
    this.unsavedChanges = true;
  }

  public render(): string {
    return `
      <div style="width:100%; height:100%; display:flex; background:#0c0c12; color:#fff; position:relative; font-family:'Outfit', sans-serif; overflow:hidden;">
         
         <!-- MAIN AREA -->
         <div style="flex:1; display:flex; filter:${this.isHubOpen ? 'blur(10px)' : 'none'}; transition:filter 0.4s ease;">
            ${this.editorMode === 'pack' ? this.renderEditor() : (this.pixelEditor ? this.pixelEditor.render() : '')}
         </div>

         <!-- PREMIUM HUB OVERLAY (PRO VERSION) -->
         ${this.isHubOpen ? `
            <div style="position:absolute; inset:0; z-index:9000; display:flex; align-items:center; justify-content:center; background:rgba(4, 4, 8, 0.85); backdrop-filter:blur(15px); animation: hubEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
               <div style="width:95%; max-width:1200px; height:85vh; background:linear-gradient(135deg, #121320 0%, #08080c 100%); border:1px solid rgba(255,255,255,0.08); border-radius:32px; padding:60px; box-shadow:0 50px 150px rgba(0,0,0,1); display:flex; flex-direction:column; position:relative; overflow:hidden;">
                  
                  ${(this.state.customSpritePacks.length > 0 || this.state.customGallerySprites.length > 0) ? `
                    <button id="btn-close-hub" style="position:absolute; top:35px; right:35px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:50%; width:44px; height:44px; color:#fff; font-size:1.2rem; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:0.3s;" onmouseover="this.style.background='rgba(255,68,68,0.2)'; this.style.borderColor='rgba(255,68,68,0.4)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'; this.style.borderColor='rgba(255,255,255,0.1)'">✕</button>
                  ` : ''}

                  <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:50px;">
                    <div>
                        <h1 style="color:#ffd700; margin:0; font-size:3rem; font-weight:900; letter-spacing:6px; text-shadow:0 0 30px rgba(255,215,0,0.3);">SPRITE STUDIO PRO</h1>
                        <p style="color:#555; font-size:0.9rem; margin-top:15px; font-weight:700; text-transform:uppercase; letter-spacing:2px;">Advanced Asset Ecosystem & Frame Engine</p>
                    </div>
                    
                    <!-- TAB NAVIGATION -->
                    <div style="display:flex; background:rgba(0,0,0,0.4); padding:6px; border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
                        <button id="tab-projects" style="padding:10px 25px; border-radius:8px; border:none; background:${this.hubTab==='projects'?'#51c5ff':'transparent'}; color:${this.hubTab==='projects'?'#000':'#666'}; font-weight:900; font-size:0.75rem; cursor:pointer; transition:0.2s;">PROJETOS (PACKS)</button>
                        <button id="tab-gallery" style="padding:10px 25px; border-radius:8px; border:none; background:${this.hubTab==='gallery'?'#ff8c42':'transparent'}; color:${this.hubTab==='gallery'?'#000':'#666'}; font-weight:900; font-size:0.75rem; cursor:pointer; transition:0.2s;">GALERIA DE ASSETS</button>
                    </div>
                  </div>

                  <div style="flex:1; overflow-y:auto; padding-right:15px;" class="custom-scroll">
                    ${this.renderHubContent()}
                  </div>
               </div>
            </div>
         ` : ''}

         <style>
            @keyframes hubEnter { from { opacity:0; transform: scale(1.05); } to { opacity:1; transform: scale(1); } }
            .custom-scroll::-webkit-scrollbar { width: 6px; }
            .custom-scroll::-webkit-scrollbar-track { background: transparent; }
            .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius: 10px; }
            .sc-pack-preview img { width:100%; height:100%; object-fit:contain; image-rendering:pixelated; }
         </style>
      </div>
    `;
  }

  private renderHubContent(): string {
      if (this.hubTab === 'projects') {
          return `
            <div style="display:flex; gap:25px; margin-bottom:60px;">
               ${this.renderHubCard('btn-create-preset', '👤', 'NPC PRESET', 'Lógica direcional pronta para personagens.', 'rgba(255,215,0,0.03)', '#ffd700')}
               ${this.renderHubCard('btn-create-free', '🌀', 'CUSTOM PACK', 'Criação livre de sequências e nomes.', 'rgba(81,197,255,0.03)', '#51c5ff')}
               ${this.renderHubCard('btn-create-canvas', '🖌️', 'PIXEL STUDIO', 'Começar arte do zero no canvas.', 'rgba(255,140,66,0.03)', '#ff8c42')}
            </div>

            <div>
               <h3 style="color:#aaa; margin:0 0 25px 0; font-size:0.8rem; font-weight:900; letter-spacing:1px; display:flex; align-items:center; gap:12px;">
                  <span style="display:inline-block; width:30px; height:1px; background:#ffd700;"></span> 
                  LIBRARY PROJECTS
               </h3>
               <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:20px;">
                  ${this.state.customSpritePacks.map((p: SpriteFolder) => this.renderPackGridItem(p)).join('')}
                  ${this.state.customSpritePacks.length === 0 ? `<div style="grid-column:1/-1; padding:60px; text-align:center; color:#333; font-weight:900; font-style:italic;">Nenhum pack encontrado no código. Comece um acima ✨</div>` : ''}
               </div>
            </div>
          `;
      } else {
         return `
            <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(200px, 1fr)); gap:20px;">
               ${this.state.customGallerySprites.map((s: GalleryItem) => `
                    <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:20px; overflow:hidden; cursor:pointer;" class="sc-gal-item" data-id="${s.id}">
                        <div style="height:160px; background:#000; display:flex; align-items:center; justify-content:center; position:relative;">
                            <img src="${s.previewUrl}" style="max-width:80%; max-height:80%; image-rendering:pixelated; transform:scale(2.5);">
                        </div>
                        <div style="padding:15px; text-align:center;">
                            <div style="font-size:0.8rem; font-weight:900; color:#fff;">${s.name}</div>
                            <div style="font-size:0.55rem; color:#555; margin-top:5px;">${s.type.toUpperCase()} • ${new Date(s.createdAt).toLocaleDateString()}</div>
                        </div>
                    </div>
               `).join('')}
               ${this.state.customGallerySprites.length === 0 ? `<div style="grid-column:1/-1; padding:100px; text-align:center; color:#333; font-weight:900;">A galeria está vazia. Salve artes via "Canvas Livre" para preencher este espaço.</div>` : ''}
            </div>
         `;
      }
  }

  private renderPackGridItem(p: SpriteFolder): string {
      // Find a representative preview image
      let previewUrl = '';
      if (p.actions.length > 0) {
          const firstAction = p.actions[0];
          const firstSlot = firstAction.directions.down || firstAction.directions.up || firstAction.directions.left || firstAction.directions.right;
          if (firstSlot) {
              previewUrl = firstSlot.gifUrl || (firstSlot.frames.length > 0 ? firstSlot.frames[0] : '');
          }
      }

      return `
        <div class="shub-gal-item" data-id="${p.id}" style="
          background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:24px; padding:25px; cursor:pointer; transition:all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display:flex; flex-direction:column;
        " onmouseover="this.style.transform='translateY(-5px)'; this.style.borderColor='${p.isPreset ? '#ffd700' : '#51c5ff'}'; this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.transform='none'; this.style.borderColor='rgba(255,255,255,0.05)'; this.style.background='rgba(255,255,255,0.02)'">
           
           <div style="height:120px; background:rgba(0,0,0,0.5); border-radius:16px; margin-bottom:20px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
              ${previewUrl ? `<img src="${previewUrl}" style="max-width:70%; max-height:70%; image-rendering:pixelated; transform:scale(2);">` : `<div style="font-size:2rem; opacity:0.1;">🎬</div>`}
           </div>

           <div style="font-size:0.55rem; color:${p.isPreset ? '#ffd700' : '#51c5ff'}; font-weight:900; letter-spacing:1px; margin-bottom:8px;">${p.isPreset ? 'PERSONAGEM PRESET' : 'CUSTOM ASSET PACK'}</div>
           <div style="font-size:1.2rem; color:#fff; font-weight:900; margin-bottom:5px;">${p.name}</div>
           <div style="font-size:0.65rem; color:#555; display:flex; justify-content:space-between;">
              <span>${p.actions.length} Sequências</span>
              <span>ID: ${p.id.slice(1)}</span>
           </div>
        </div>
      `;
  }

  private renderHubCard(id: string, icon: string, title: string, desc: string, bg: string, color: string): string {
      return `
        <div id="${id}" style="
           flex:1; background:${bg}; border:1px solid ${color + '22'}; border-radius:24px; padding:35px;
           display:flex; flex-direction:column; align-items:center; text-align:center; cursor:pointer; transition:0.3s;
        " onmouseover="this.style.transform='scale(1.02)'; this.style.background='${color + '15'}'; this.style.borderColor='${color}'" onmouseout="this.style.transform='none'; this.style.background='${bg}'; this.style.borderColor='${color + '22'}'">
           <div style="font-size:3.5rem; margin-bottom:20px;">${icon}</div>
           <h4 style="color:${color}; margin:0 0 10px 0; font-size:1rem; font-weight:900; letter-spacing:1px;">${title}</h4>
           <p style="font-size:0.75rem; color:#555; line-height:1.5; font-weight:500;">${desc}</p>
        </div>
      `;
  }

  private renderEditor(): string {
     const folder = this.getActiveFolder();
     return `
        <div style="flex:1; display:flex;">
           <!-- Sidebar 1: Project Hierarchy -->
           <div style="width:340px; background:#08080c; border-right:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column;">
              <div style="padding:30px; border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(255,140,66,0.02);">
                 <button id="btn-back-hub" style="width:100%; padding:12px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.02); color:#fff; font-weight:800; font-size:0.65rem; cursor:pointer; margin-bottom:25px; transition:0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'">« VOLTAR AO HUB STUDIO</button>
                 <div style="font-size:0.55rem; color:#ffd700; font-weight:900; letter-spacing:2px; opacity:0.6; text-transform:uppercase;">Project Properties</div>
                 <h2 style="margin:8px 0 0 0; font-size:1.6rem; color:#fff; font-weight:900; letter-spacing:-1px;">${folder?.name || 'Untitled Project'}</h2>
                 
                 ${folder?.globalSoundUrl ? `
                    <div style="margin-top:15px; background:rgba(76,255,136,0.1); padding:10px; border-radius:10px; display:flex; align-items:center; gap:10px; border:1px solid rgba(76,255,136,0.2);">
                        <span style="font-size:1rem;">🎵</span>
                        <div style="font-size:0.6rem; color:#4cff88; font-weight:900;">SOUND LINKED</div>
                    </div>
                 ` : ''}
              </div>

              <div style="flex:1; overflow-y:auto; padding:25px;" class="custom-scroll">
                 <div style="font-size:0.6rem; color:#555; font-weight:900; margin-bottom:20px; letter-spacing:1px; text-transform:uppercase;">Master Action List</div>
                 ${folder?.actions.map(a => `
                   <div class="sc-action-item" data-id="${a.id}" style="
                     padding:18px; margin-bottom:12px; border-radius:16px; cursor:pointer; transition:all 0.3s;
                     background:${this.activeActionId === a.id ? 'rgba(81,197,255,0.08)' : 'rgba(255,255,255,0.01)'};
                     border:1px solid ${this.activeActionId === a.id ? 'rgba(81,197,255,0.3)' : 'rgba(255,255,255,0.03)'};
                     display:flex; justify-content:space-between; align-items:center;
                   ">
                      <div style="flex:1;">
                         <div style="font-size:0.95rem; font-weight:900; color:${this.activeActionId === a.id ? '#fff' : '#888'};"># ${a.name}</div>
                      </div>
                      <button class="sc-del-action" data-id="${a.id}" style="background:none; border:none; color:#ff3366; font-size:0.9rem; cursor:pointer; opacity:0.1; transition:0.2s;" onmouseover="this.style.opacity='1'">✕</button>
                   </div>
                 `).join('')}
                 <button id="sc-new-action" style="width:100%; padding:15px; border-radius:12px; border:1px dashed rgba(81,197,255,0.3); background:rgba(81,197,255,0.02); color:#51c5ff; font-weight:900; font-size:0.75rem; cursor:pointer; transition:0.2s;" onmouseover="this.style.background='rgba(81,197,255,0.05)'">+ ADD NEW SEQUENCE</button>
              </div>

              <div style="padding:25px; background:rgba(0,0,0,0.4); border-top:1px solid rgba(255,255,255,0.05);">
                 <button id="sc-btn-linksound" style="width:100%; padding:15px; border-radius:12px; border:1px solid rgba(255,215,0,0.3); background:rgba(255,215,0,0.05); color:#ffd700; font-weight:900; font-size:0.75rem; cursor:pointer; margin-bottom:15px;">🔗 LINK GLOBAL SOUND</button>
                 <button id="btn-save-permanently" style="width:100%; padding:20px; border-radius:14px; border:none; background:${this.unsavedChanges ? 'linear-gradient(135deg, #ff8c42, #ff3e3e)' : 'linear-gradient(135deg, #4cff88, #009688)'}; color:#fff; font-weight:900; font-size:0.85rem; cursor:pointer; box-shadow:0 10px 30px rgba(0,0,0,0.4); text-transform:uppercase; letter-spacing:1px;">
                    ${this.unsavedChanges ? 'COMMIT CHANGES' : 'CODEBASE SYNCED'}
                 </button>
              </div>
           </div>

           <!-- Sidebar 2: Frame Engine -->
           <div style="flex:1; background:#0c0c12; display:flex; flex-direction:column; position:relative;">
              ${this.activeActionId ? this.renderActionView() : this.renderEmptyPlaceholder()}
           </div>
        </div>
     `;
  }

  private renderActionView(): string {
      const action = this.getActiveAction();
      const slotData = action?.directions[this.activeDirection];
      
      return `
        <div style="flex:1; display:flex; padding:40px; gap:40px;">
           <!-- CENTRAL STAGE -->
           <div style="flex:1; background:rgba(0,0,0,0.5); border-radius:32px; border:1px solid rgba(255,255,255,0.05); display:flex; flex-direction:column; overflow:hidden; position:relative; box-shadow:0 30px 60px rgba(0,0,0,0.3);">
              <div style="padding:25px; border-bottom:1px solid rgba(255,255,255,0.03); display:flex; justify-content:space-between; align-items:center;">
                 <div style="display:flex; align-items:center; gap:12px;">
                    <span style="background:#ffd700; width:10px; height:10px; border-radius:50%; box-shadow:0 0 10px #ffd700;"></span>
                    <span style="font-size:0.75rem; font-weight:900; color:#fff; letter-spacing:1px; text-transform:uppercase;">ULTRA-HD PREVIEW : ${this.activeDirection}</span>
                 </div>
                 <div style="font-size:0.6rem; color:#444; font-weight:900;">ENGINE: ${slotData?.type?.toUpperCase() || 'STANDBY'}</div>
              </div>

              <div style="flex:1; display:flex; align-items:center; justify-content:center; position:relative; background-image: radial-gradient(rgba(255,255,255,0.02) 1px, transparent 1px); background-size: 30px 30px;">
                  <div style="width:400px; height:400px; background-image: linear-gradient(45deg, #111 25%, transparent 25%), linear-gradient(-45deg, #111 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #111 75%), linear-gradient(-45deg, transparent 75%, #111 75%); background-size: 20px 20px; background-position: 0 0, 0 10px, 10px -10px, -10px 0px; background-color: #08080c; border-radius:24px; box-shadow:0 0 80px rgba(0,0,0,0.8); display:flex; align-items:center; justify-content:center; overflow:hidden;">
                     ${this.renderPreview(slotData)}
                  </div>
              </div>

              <div style="height:180px; background:rgba(0,0,0,0.4); border-top:1px solid rgba(255,255,255,0.05); display:flex; align-items:center; justify-content:center;">
                  <div id="sc-official-joystick" style="transform:scale(0.9); opacity:0.8;"></div>
              </div>
           </div>

           <!-- ASSET CONFIGURATION -->
           <div style="width:380px; display:flex; flex-direction:column; gap:25px;">
              <div style="background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:24px; padding:25px;">
                 <div style="font-size:0.65rem; color:#555; font-weight:900; margin-bottom:20px; letter-spacing:1px;">DIRETIONAL AXIS</div>
                 <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                    ${this.renderDirectionButton('up', 'TOP AXIS', action!)}
                    ${this.renderDirectionButton('down', 'BOTTOM AXIS', action!)}
                    ${this.renderDirectionButton('left', 'LEFT AXIS', action!)}
                    ${this.renderDirectionButton('right', 'RIGHT AXIS', action!)}
                 </div>
              </div>

              <div style="flex:1; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05); border-radius:24px; padding:25px; display:flex; flex-direction:column;">
                 <div style="font-size:0.65rem; color:#555; font-weight:900; margin-bottom:20px; letter-spacing:1px;">MEDIA PIPELINE</div>
                 
                 <div style="display:flex; gap:10px; margin-bottom:25px; background:rgba(0,0,0,0.5); padding:6px; border-radius:16px;">
                    <button class="sc-mode-btn" data-mode="gif" style="flex:1; padding:12px; border-radius:10px; border:none; background:${slotData?.type==='gif'?'#ffd700':'transparent'}; color:${slotData?.type==='gif'?'#000':'#444'}; font-size:0.65rem; font-weight:900; cursor:pointer;">GIF</button>
                    <button class="sc-mode-btn" data-mode="png" style="flex:1; padding:12px; border-radius:10px; border:none; background:${slotData?.type==='png'?'#51c5ff':'transparent'}; color:${slotData?.type==='png'?'#000':'#444'}; font-size:0.65rem; font-weight:900; cursor:pointer;">PIXELS</button>
                    <button class="sc-mode-btn" data-mode="video" style="flex:1; padding:12px; border-radius:10px; border:none; background:${slotData?.type==='video'?'#ff4444':'transparent'}; color:${slotData?.type==='video'?'#000':'#444'}; font-size:0.65rem; font-weight:900; cursor:pointer;">WEBM</button>
                 </div>

                 <div style="flex:1;">
                    ${this.renderMediaUploader(slotData)}
                 </div>

                 ${slotData ? `
                    <div style="margin-top:25px; display:flex; flex-direction:column; gap:12px;">
                       <button id="sc-edit-canvas" style="width:100%; padding:20px; border-radius:16px; background:linear-gradient(135deg, #ff8c42, #ff5e3a); color:#fff; font-size:0.85rem; font-weight:900; border:none; cursor:pointer; box-shadow:0 15px 30px rgba(255,140,66,0.3);">🖌️ OPEN PIXEL STUDIO PRO</button>
                       <button id="sc-clear-direction" style="width:100%; padding:14px; border-radius:12px; background:transparent; color:#ff3366; border:1px solid rgba(255,51,102,0.2); font-size:0.7rem; font-weight:900; cursor:pointer;">WIPE DIRECTION DATA</button>
                    </div>
                 ` : ''}
              </div>
           </div>
        </div>
      `;
  }

  private renderDirectionButton(dir: string, label: string, action: SpriteAction): string {
      const active = this.activeDirection === dir;
      const data = (action.directions as any)[dir];
      const hasMedia = !!data;
      return `
        <button class="sc-dir-step" data-dir="${dir}" style="
           padding:16px; border-radius:16px; background:${active ? 'rgba(81,197,255,0.1)' : 'rgba(0,0,0,0.3)'};
           border:1px solid ${active ? '#51c5ff' : 'rgba(255,255,255,0.05)'};
           color:${active ? '#fff' : '#444'}; font-size:0.7rem; font-weight:900; cursor:pointer; transition:0.3s;
           position:relative;
        ">
           ${label} 
           ${hasMedia ? `<span style="position:absolute; top:8px; right:8px; width:8px; height:8px; background:#4cff88; border-radius:50%; box-shadow:0 0 12px #4cff88;"></span>` : ''}
        </button>
      `;
  }

  private renderMediaUploader(data: AnimationData | undefined): string {
      const mode = data?.type || 'gif';
      if (mode === 'gif') {
          return `<div id="sc-drop-gif" style="height:120px; border:2px dashed rgba(255,215,0,0.2); border-radius:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; background:rgba(255,215,0,0.01);" onmouseover="this.style.background='rgba(255,215,0,0.03)'" onmouseout="this.style.background='rgba(255,215,0,0.01)'">
              <span style="font-size:2.5rem; margin-bottom:12px;">📄</span>
              <span style="font-size:0.7rem; color:#ffd700; font-weight:900;">INJECT GIF SOURCE</span>
              <input type="file" id="inp-gif" accept="image/gif" style="display:none;">
          </div>`;
      }
      if (mode === 'video') {
        return `<div id="sc-drop-video" style="height:120px; border:2px dashed rgba(255,51,102,0.2); border-radius:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; background:rgba(255,51,102,0.01);">
            <span style="font-size:2.5rem; margin-bottom:12px;">🎞️</span>
            <span style="font-size:0.7rem; color:#ff3366; font-weight:900;">INJECT ALPHA WEBM</span>
            <input type="file" id="inp-video" accept="video/webm,video/mp4" style="display:none;">
        </div>`;
      }
      return `
        <div id="sc-drop-png" style="height:120px; border:2px dashed rgba(81,197,255,0.2); border-radius:20px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; background:rgba(81,197,255,0.01);">
          <span style="font-size:2.5rem; margin-bottom:12px;">🖼️</span>
          <span style="font-size:0.7rem; color:#51c5ff; font-weight:900;">LOAD PIXEL SEQUENCE</span>
          <input type="file" id="inp-png" multiple accept="image/png" style="display:none;">
        </div>
        <div style="margin-top:20px; background:rgba(0,0,0,0.3); padding:15px; border-radius:12px;">
            <label style="font-size:0.55rem; color:#555; text-transform:uppercase; font-weight:900; letter-spacing:1px;">Playback Timing (ms)</label>
            <input type="number" id="inp-rate" value="${data?.frameRate || 100}" style="width:100%; background:transparent; border:none; color:#ffd700; font-size:1.4rem; font-weight:900; margin-top:5px; outline:none;">
        </div>
      `;
  }

  private renderPreview(data: AnimationData | undefined): string {
      if (!data) return `<div style="text-align:center; opacity:0.05;"><div style="font-size:6rem;">🎬</div></div>`;
      if (data.type === 'gif' && data.gifUrl) return `<img src="${data.gifUrl}" style="max-width:90%; max-height:90%; image-rendering:pixelated; transform:scale(2.5);">`;
      if (data.type === 'video' && data.videoUrl) return `<video src="${data.videoUrl}" autoplay loop muted style="max-width:90%; max-height:90%; transform:scale(2.5);"></video>`;
      if (data.type === 'png' && data.frames.length > 0) return `<img id="sc-png-preview" src="${data.frames[0]}" style="max-width:90%; max-height:90%; image-rendering:pixelated; transform:scale(2.5);">`;
      return `<div style="opacity:0.1; font-size:0.7rem; font-weight:900;">NO DATA STREAM</div>`;
  }

  private renderEmptyPlaceholder(): string {
      return `
        <div style="flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; opacity:0.03;">
          <div style="font-size:15rem;">🧱</div>
          <div style="font-size:2rem; font-weight:100; letter-spacing:20px; margin-top:40px;">IDLE STAGE</div>
        </div>
      `;
  }

  public bind(container: HTMLElement) {
    if (this.isHubOpen) {
       this.bindHub(container);
       return;
    }

    if (this.editorMode === 'pixel' && this.pixelEditor) {
       this.pixelEditor.bind(container);
       return;
    }

    // Main Global Binds
    container.querySelector('#btn-back-hub')?.addEventListener('click', () => { this.isHubOpen = true; this.callbacks.reRender(); });
    container.querySelector('#btn-save-permanently')?.addEventListener('click', async () => {
       const ok = await this.core.saveJson('/api/save-sprites', { packs: this.state.customSpritePacks, gallery: this.state.customGallerySprites });
       if(ok) { this.core.showToast('Project State Committed to Codebase!', '#4cff88'); this.unsavedChanges = false; this.callbacks.reRender(); }
    });

    container.querySelector('#sc-new-action')?.addEventListener('click', () => {
       const folder = this.getActiveFolder(); if(!folder) return;
       const name = prompt('Action Alias:');
       if(name) {
          const actionId = folder.id + '-act-' + Date.now();
          folder.actions.push({ id: actionId, name, directions: { up:null, down:null, left:null, right:null } });
          this.activeActionId = actionId; this.markDirty(); this.callbacks.reRender();
       }
    });

    container.querySelector('#sc-btn-linksound')?.addEventListener('click', async () => {
        if (!this.soundBrowser) {
           this.soundBrowser = new SoundCentralScreen(this.state.soundConfig || { library:[], actions:{}, screens:{}, transitions:{} }, []);
           await this.soundBrowser!.load();
        }
        this.openSoundModal();
    });

    container.querySelectorAll('.sc-action-item').forEach(el => {
       el.addEventListener('click', (e: any) => {
          if (e.target.classList.contains('sc-del-action')) return;
          this.activeActionId = e.currentTarget.dataset.id;
          this.callbacks.reRender();
       });
    });

    container.querySelectorAll('.sc-del-action').forEach(btn => {
       btn.addEventListener('click', (e:any) => {
          const id = e.currentTarget.dataset.id;
          const folder = this.getActiveFolder();
          if(folder && confirm('Permanently delete this behavior/action?')) {
             folder.actions = folder.actions.filter(a => a.id !== id);
             if(this.activeActionId===id) this.activeActionId = null;
             this.markDirty(); this.callbacks.reRender();
          }
       });
    });

    // Integrated Official Joystick
    const joyAnchor = container.querySelector('#sc-official-joystick');
    if (joyAnchor) {
       this.joystick = new VirtualJoystick();
       joyAnchor.innerHTML = this.joystick.render();
       this.joystick.bind(joyAnchor as HTMLElement);
       this.joystick.setCallback((input) => {
          if (!input.active) return;
          let newDir = this.activeDirection;
          if (input.y < -0.5) newDir = 'up';
          else if (input.y > 0.5) newDir = 'down';
          else if (input.x < -0.5) newDir = 'left';
          else if (input.x > 0.5) newDir = 'right';

          if (newDir !== this.activeDirection) {
             this.activeDirection = newDir;
             this.callbacks.reRender();
          }
       });
    }

    container.querySelectorAll('.sc-dir-step').forEach(btn => {
       btn.addEventListener('click', (e:any) => {
          this.activeDirection = e.currentTarget.dataset.dir;
          this.callbacks.reRender();
       });
    });

    // Media Pipeline Binds
    const action = this.getActiveAction();
    if (action) {
       container.querySelectorAll('.sc-mode-btn').forEach(btn => {
          btn.addEventListener('click', (e:any) => {
             const m = e.currentTarget.dataset.mode as any;
             if (!action.directions[this.activeDirection]) {
                action.directions[this.activeDirection] = { type: m, frames:[], frameRate: 100, gifUrl: null, videoUrl: null };
             } else {
                action.directions[this.activeDirection]!.type = m;
             }
             this.markDirty(); this.callbacks.reRender();
          });
       });

       container.querySelector('#sc-drop-gif')?.addEventListener('click', () => container.querySelector('#inp-gif')?.dispatchEvent(new MouseEvent('click')));
       container.querySelector('#sc-drop-png')?.addEventListener('click', () => container.querySelector('#inp-png')?.dispatchEvent(new MouseEvent('click')));
       container.querySelector('#sc-drop-video')?.addEventListener('click', () => container.querySelector('#inp-video')?.dispatchEvent(new MouseEvent('click')));

       container.querySelector('#inp-gif')?.addEventListener('change', async (e:any) => {
          const file = e.target.files?.[0]; if(!file) return;
          this.core.showToast('Enviando GIF para o servidor...', '#51c5ff');
          
          const reader = new FileReader();
          reader.onload = async () => {
              const data = reader.result as string;
              const name = `imported_${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
              try {
                  const resp = await fetch('/api/upload-sprite-frame', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name, data })
                  });
                  const json = await resp.json();
                  if (json.success) {
                      if (!action.directions[this.activeDirection]) action.directions[this.activeDirection] = { type: 'gif', frames:[], frameRate:100, gifUrl: json.url, videoUrl: null };
                      else action.directions[this.activeDirection]!.gifUrl = json.url;
                      this.markDirty(); this.callbacks.reRender();
                  }
              } catch (err) { console.error('Upload failed', err); }
          };
          reader.readAsDataURL(file);
       });

       container.querySelector('#inp-png')?.addEventListener('change', async (e:any) => {
          const files = e.target.files; if(!files) return;
          this.core.showToast('Enviando frames para o servidor...', '#51c5ff');
          
          const uploadedUrls: string[] = [];
          for (const file of Array.from(files as File[])) {
              const data = await new Promise<string>(r => { const rd = new FileReader(); rd.onload = () => r(rd.result as string); rd.readAsDataURL(file); });
              const name = `frame_${Date.now()}_${file.name.replace(/\s+/g,'_')}`;
              try {
                  const resp = await fetch('/api/upload-sprite-frame', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name, data })
                  });
                  const json = await resp.json();
                  if (json.success) uploadedUrls.push(json.url);
              } catch {}
          }

          if (uploadedUrls.length > 0) {
              if (!action.directions[this.activeDirection]) action.directions[this.activeDirection] = { type: 'png', frames:uploadedUrls, frameRate:100, gifUrl: null, videoUrl: null };
              else action.directions[this.activeDirection]!.frames = uploadedUrls;
              this.markDirty(); this.callbacks.reRender();
          }
       });

       container.querySelector('#inp-rate')?.addEventListener('change', (e:any) => {
          if (action.directions[this.activeDirection]) {
             action.directions[this.activeDirection]!.frameRate = parseInt(e.target.value) || 100;
             this.markDirty(); this.startPlayback(container, action.directions[this.activeDirection]!);
          }
       });

       container.querySelector('#sc-edit-canvas')?.addEventListener('click', () => {
          if(!this.pixelEditor) this.pixelEditor = new PixelEditor(this.state, this.core, { onBack: () => { this.editorMode='pack'; this.callbacks.reRender(); }, reRender: () => this.callbacks.reRender() });
          this.pixelEditor.setEditingSlot(action.directions[this.activeDirection]);
          this.editorMode = 'pixel'; this.callbacks.reRender();
       });

       if (action.directions[this.activeDirection]?.type === 'png' && action.directions[this.activeDirection]!.frames.length > 0) {
          this.startPlayback(container, action.directions[this.activeDirection]!);
       }
    }
  }

  private startPlayback(parent: HTMLElement, data: AnimationData) {
      if (this.animationInterval) clearInterval(this.animationInterval);
      if (data.frames.length < 2) return;
      this.currentFrameIdx = 0;
      this.animationInterval = setInterval(() => {
          this.currentFrameIdx = (this.currentFrameIdx + 1) % data.frames.length;
          const img = parent.querySelector('#sc-png-preview') as HTMLImageElement;
          if (img) img.src = data.frames[this.currentFrameIdx];
      }, data.frameRate);
  }

  private bindHub(container: HTMLElement) {
      container.querySelector('#btn-close-hub')?.addEventListener('click', () => { 
          this.isHubOpen = false; this.editorMode='pack'; this.callbacks.reRender(); 
      });

      container.querySelector('#tab-projects')?.addEventListener('click', () => { this.hubTab = 'projects'; this.callbacks.reRender(); });
      container.querySelector('#tab-gallery')?.addEventListener('click', () => { this.hubTab = 'gallery'; this.callbacks.reRender(); });

      container.querySelector('#btn-create-preset')?.addEventListener('click', () => {
         const name = prompt('NPC Blueprint Alias:');
         if(name) {
            const folderId = '#pk-' + Date.now();
            const pack: SpriteFolder = {
               id: folderId, name, isPreset: true, actions: [
                  { id: folderId+'-a1', name: 'IDLE_STATIC', directions:{up:null, down:null, left:null, right:null} },
                  { id: folderId+'-a2', name: 'MOVE_WALK', directions:{up:null, down:null, left:null, right:null} },
                  { id: folderId+'-a3', name: 'MOVE_RUN', directions:{up:null, down:null, left:null, right:null} },
                  { id: folderId+'-a4', name: 'INTERACT_UP', directions:{up:null, down:null, left:null, right:null} }
               ]
            };
            this.state.customSpritePacks.push(pack); this.activeFolderId = folderId; this.activeActionId = pack.actions[0].id;
            this.editorMode = 'pack'; this.isHubOpen = false; this.markDirty(); this.callbacks.reRender();
         }
      });

      container.querySelector('#btn-create-free')?.addEventListener('click', () => {
         const name = prompt('Collection Alias:');
         if(name) {
             const folderId = '#fr-' + Date.now();
             this.state.customSpritePacks.push({ id: folderId, name, isPreset: false, actions: [] });
             this.activeFolderId = folderId; this.activeActionId = null;
             this.editorMode = 'pack'; this.isHubOpen = false; this.markDirty(); this.callbacks.reRender();
         }
      });

      container.querySelector('#btn-create-canvas')?.addEventListener('click', () => {
         this.isHubOpen = false; this.editorMode = 'pixel';
         if (!this.pixelEditor) this.pixelEditor = new PixelEditor(this.state, this.core, { onBack: () => { this.isHubOpen = true; this.callbacks.reRender(); }, reRender: () => this.callbacks.reRender() });
         this.pixelEditor.setEditingSlot(null);
         this.callbacks.reRender();
      });

      container.querySelectorAll('.shub-gal-item').forEach(el => {
         el.addEventListener('click', (e:any) => {
            this.activeFolderId = e.currentTarget.dataset.id;
            const folder = this.getActiveFolder();
            this.activeActionId = folder?.actions[0]?.id || null;
            this.editorMode = 'pack'; this.isHubOpen = false; this.callbacks.reRender();
         });
      });

      container.querySelectorAll('.sc-gal-item').forEach(el => {
        el.addEventListener('click', (e:any) => {
            const id = e.currentTarget.dataset.id;
            const asset = this.state.customGallerySprites.find((s:any) => s.id === id);
            if (asset) {
                if(!this.pixelEditor) this.pixelEditor = new PixelEditor(this.state, this.core, { onBack: () => { this.isHubOpen = true; this.callbacks.reRender(); }, reRender: () => this.callbacks.reRender() });
                this.pixelEditor.loadFromGallery(asset);
                this.editorMode = 'pixel'; this.isHubOpen = false; this.callbacks.reRender();
            }
        });
      });
  }

  private openSoundModal() {
      const modal = document.createElement('div');
      modal.style.cssText = `position:fixed; inset:0; z-index:999999; background:rgba(0,0,0,0.85); backdrop-filter:blur(10px); display:flex; align-items:center; justify-content:center;`;
      modal.innerHTML = `
        <div style="background:#0a0a0f; border:1px solid rgba(255,255,255,0.08); border-radius:32px; width:800px; height:700px; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 50px 100px rgba(0,0,0,0.8);">
            <div style="padding:25px 35px; border-bottom:1px solid rgba(255,255,255,0.05); display:flex; justify-content:space-between; align-items:center;">
               <span style="color:#ffd700; font-weight:900; font-size:0.85rem; letter-spacing:2px;">AUDIO LIBRARY SYNC</span>
               <button id="close-sound-modal" style="background:rgba(255,255,255,0.05); border:none; color:#fff; cursor:pointer; width:36px; height:36px; border-radius:50%;">✕</button>
            </div>
            <div id="sound-modal-anchor" style="flex:1; overflow:hidden;"></div>
        </div>
      `;
      document.body.appendChild(modal);
      const anchor = modal.querySelector('#sound-modal-anchor') as HTMLElement;
      this.soundBrowser!.subMode = 'library';
      anchor.innerHTML = this.soundBrowser!.render();
      this.soundBrowser!.bind(anchor, () => { anchor.innerHTML = this.soundBrowser!.render(); this.soundBrowser!.bind(anchor, ()=>{}, ()=>{}); }, (msg) => this.core.showToast(msg));

      anchor.querySelectorAll('.snd-lib-item').forEach(item => {
          item.addEventListener('click', () => {
              const url = (item as HTMLElement).dataset.sndUrl;
              const folder = this.getActiveFolder();
              if (url && folder) {
                 folder.globalSoundUrl = url;
                 this.core.showToast('Global sound link established!', '#4cff88');
                 this.markDirty(); this.callbacks.reRender();
                 modal.remove();
              }
          });
      });

      modal.querySelector('#close-sound-modal')?.addEventListener('click', () => modal.remove());
  }
}
