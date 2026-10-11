import { ForgeCore } from '../../../core/ForgeCore';

export class AssetsQuestsMain {
  private state: any;
  private core: ForgeCore;
  private callbacks: any;

  constructor(state: any, core: ForgeCore, callbacks: any) {
    this.state = state;
    this.core = core;
    this.callbacks = callbacks;
  }

  public render(isPopup: boolean = false): string {
    const currentMode = this.state.questAssetsMode || 'quest';
    let assets: any[] = [];
    if (currentMode === 'quest') assets = this.state.questAssets || [];
    else if (currentMode === 'general') assets = this.state.availableCards || [];
    else if (currentMode === 'sprites') assets = this.state.customSpritePacks || [];

    return `
      <div style="padding:${isPopup ? '10px' : '20px'}; display:flex; flex-direction:column; gap:20px; animation: fadeIn 0.3s ease; height:100%; background:${isPopup ? 'rgba(15,15,25,0.98)' : 'transparent'};">
         
         <!-- HEADER -->
         <div style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px; display:flex; justify-content:space-between; align-items:center;">
            <div style="display:flex; gap:20px; align-items:center;">
               <div>
                  <h2 style="color:#ffd700; margin:0; font-size:1.1rem; letter-spacing:2px;">ASSETS QUESTS</h2>
                  <p style="font-size:0.6rem; opacity:0.5; margin:3px 0 0 0;">REPOSITÓRIO DE MÍDIA</p>
               </div>
               <div style="display:flex; background:rgba(0,0,0,0.3); border-radius:10px; padding:4px;">
                  <button id="mode-quest" style="padding:6px 12px; font-size:0.55rem; font-weight:950; border-radius:6px; border:none; cursor:pointer; 
                          background:${currentMode === 'quest' ? '#51c5ff' : 'transparent'}; color:${currentMode === 'quest' ? '#000' : '#888'};">
                     QUESTS
                  </button>
                  <button id="mode-general" style="padding:6px 12px; font-size:0.55rem; font-weight:950; border-radius:6px; border:none; cursor:pointer; 
                          background:${currentMode === 'general' ? '#ffd700' : 'transparent'}; color:${currentMode === 'general' ? '#000' : '#888'};">
                     GERAIS
                  </button>
                  <button id="mode-sprites" style="padding:6px 12px; font-size:0.55rem; font-weight:950; border-radius:6px; border:none; cursor:pointer; 
                          background:${currentMode === 'sprites' ? '#4cff88' : 'transparent'}; color:${currentMode === 'sprites' ? '#000' : '#888'};">
                     SPRITES
                  </button>
               </div>
            </div>
            
            <div style="display:flex; gap:10px;">
               ${!isPopup ? `
                  <button id="btn-import-pc-quest" class="editor-btn-secondary" style="background:rgba(81,197,255,0.1); color:#51c5ff; border-color:#51c5ff; padding:8px 15px; font-size:0.6rem;">+ DO PC</button>
                  <input type="file" id="inp-file-quest" multiple accept="image/*,video/*" style="display:none">
               ` : `
                  <button id="btn-close-assets-popup" style="background:none; border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:50%; width:30px; height:30px; cursor:pointer;">✕</button>
               `}
            </div>
         </div>

         <!-- GRID -->
         <div id="quest-asset-grid" style="flex:1; display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:10px; overflow-y:auto; padding-right:10px;">
            ${assets.length > 0 ? assets.map((a: any) => {
               if (currentMode === 'sprites') {
                  const defaultAction = a.actions?.[0];
                  const previewDir = defaultAction?.directions?.down || defaultAction?.directions?.up || defaultAction?.directions?.left || defaultAction?.directions?.right;
                  const previewUrl = previewDir ? (previewDir.type === 'png' ? previewDir.frames?.[0] : (previewDir.type === 'gif' ? previewDir.gifUrl : previewDir.videoUrl)) : '';
                  return `
                     <div class="quest-sprite-card" data-id="${a.id}" 
                          style="aspect-ratio:1/1; background:rgba(255,255,255,0.03); border-radius:10px; border:1px solid rgba(76,255,136,0.2); cursor:pointer; transition:0.2s; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:5px; position:relative;">
                        <img src="${previewUrl}" style="max-width:80%; max-height:80%; image-rendering:pixelated; object-fit:contain;" onerror="this.outerHTML='<span style=%22font-size:2rem; opacity:0.1;%22>🎬</span>'">
                        <div style="position:absolute; bottom:0; left:0; width:100%; background:rgba(0,0,0,0.8); padding:5px; text-align:center; font-size:0.45rem; font-weight:900; color:#4cff88; border-bottom-left-radius:8px; border-bottom-right-radius:8px;">${a.name}</div>
                     </div>
                  `;
               } else {
                  return `
                     <div class="quest-asset-card" data-url="${a}" 
                          style="aspect-ratio:1/1; background:url('${a}') center/cover no-repeat; border-radius:10px; border:2px solid rgba(255,255,255,0.05); cursor:pointer; transition:0.2s;">
                     </div>
                  `;
               }
            }).join('') : `
               <div style="grid-column:1/-1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:60px; opacity:0.1; border:2px dashed rgba(255,255,255,0.2); border-radius:20px;">
                  <div style="font-size:2rem;">📦</div>
               </div>
            `}
         </div>

      </div>
    `;
  }

  private async handleUpload(files: FileList) {
    this.core.showToast(`Enviando ${files.length} arquivo(s)... `, '#51c5ff');
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('media', file);
      try {
        const resp = await fetch('/api/upload-media', { method: 'POST', body: formData });
        if (resp.ok) {
          const result = await resp.json();
          const newUrl = result.url;
          if (!this.state.questAssets) this.state.questAssets = [];
          if (!this.state.questAssets.includes(newUrl)) this.state.questAssets.push(newUrl);
          this.core.showToast(`✅ ${file.name} salvo!`, '#4cff88');
        }
      } catch (err) {}
    }
    this.callbacks.reRender();
  }

  public bind(container: HTMLElement) {
    container.querySelector('#mode-quest')?.addEventListener('click', () => { this.callbacks.setQuestAssetsMode('quest'); this.callbacks.reRender(); });
    container.querySelector('#mode-general')?.addEventListener('click', () => { this.callbacks.setQuestAssetsMode('general'); this.callbacks.reRender(); });
    container.querySelector('#mode-sprites')?.addEventListener('click', () => { this.callbacks.setQuestAssetsMode('sprites'); this.callbacks.reRender(); });
    container.querySelector('#btn-import-pc-quest')?.addEventListener('click', () => (container.querySelector('#inp-file-quest') as HTMLInputElement).click());
    container.querySelector('#inp-file-quest')?.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) this.handleUpload(files);
    });
    container.querySelector('#btn-close-assets-popup')?.addEventListener('click', () => {
       document.dispatchEvent(new CustomEvent('close-quest-assets-popup'));
    });

    container.querySelectorAll('.quest-asset-card').forEach(card => {
       card.addEventListener('click', () => {
          const url = (card as HTMLElement).dataset.url;
          document.dispatchEvent(new CustomEvent('quest-asset-selected', { detail: { url } }));
       });
    });

    container.querySelectorAll('.quest-sprite-card').forEach(card => {
       card.addEventListener('click', () => {
          const packId = (card as HTMLElement).dataset.id;
          const pack = (this.state.customSpritePacks || []).find((p:any) => p.id === packId);
          if (pack) {
             document.dispatchEvent(new CustomEvent('quick-insert-sprite', { detail: { pack } }));
          }
       });
    });
  }
}
