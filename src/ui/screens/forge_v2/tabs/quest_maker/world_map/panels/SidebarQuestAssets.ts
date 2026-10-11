/**
 * SidebarQuestAssets.ts
 * Wrapper adaptado do AssetsQuestsMain para o menu lateral do World Map.
 * Lê questAssets do estado global, com botão de upload e inserção direta no canvas.
 */
export class SidebarQuestAssets {

  public render(state: any): string {
    const assets: string[] = state.questAssets || [];

    return `
      <div style="display:flex; flex-direction:column; height:100%; overflow:hidden;">

        <!-- HEADER -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding:8px 10px; background:#0d0d15; border-bottom:1px solid #1a1a2e; flex-shrink:0;">
          <span style="font-size:0.5rem; font-weight:900; color:#ffd700; letter-spacing:1px;">QUEST ASSETS</span>
          <div style="display:flex; gap:6px;">
            <button id="sqa-btn-upload" style="background:rgba(255,215,0,0.1); border:1px solid #ffd70033; color:#ffd700; border-radius:4px; padding:3px 8px; font-size:0.45rem; cursor:pointer;">+ PC</button>
            <input type="file" id="sqa-file-input" multiple accept="image/*,video/*" style="display:none;">
          </div>
        </div>

        <!-- CONTAGEM -->
        <div style="padding:4px 10px; font-size:0.45rem; color:#444; flex-shrink:0;">${assets.length} ativos</div>

        <!-- GRADE -->
        <div id="sqa-asset-grid" style="flex:1; display:grid; grid-template-columns: repeat(3, 1fr); gap:4px; padding:8px; overflow-y:auto;">
          ${assets.length > 0 ? assets.map((url: string) => {
            const isVid = /\.(mp4|webm)$/i.test(url);
            return `
              <div class="sqa-asset-item" data-url="${url}" style="
                aspect-ratio:1/1; border-radius:6px; border:1px solid rgba(255,215,0,0.1);
                background:${isVid ? '#000' : `url('${url}') center/cover no-repeat`};
                cursor:pointer; position:relative; transition:0.15s; overflow:hidden;
              " title="${url}">
                ${isVid ? `<video src="${url}" style="width:100%;height:100%;object-fit:cover;" muted></video>` : ''}
              </div>
            `;
          }).join('') : `
            <div style="grid-column:1/-1; padding:30px; text-align:center; opacity:0.2; font-size:0.6rem;">
              📦<br>Nenhum asset<br>adicionado
            </div>
          `}
        </div>
      </div>
    `;
  }

  public bind(container: HTMLElement, _state: any, onSelect: (url: string) => void, onUpload: (files: FileList) => void) {
    // Upload
    container.querySelector('#sqa-btn-upload')?.addEventListener('click', () => {
      (container.querySelector('#sqa-file-input') as HTMLInputElement).click();
    });
    container.querySelector('#sqa-file-input')?.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) onUpload(files);
    });

    // Seleção
    container.querySelectorAll('.sqa-asset-item').forEach(item => {
      item.addEventListener('click', () => {
        const url = (item as HTMLElement).dataset.url!;
        onSelect(url);
      });

      item.setAttribute('draggable', 'true');
      item.addEventListener('dragstart', (e: any) => {
        e.dataTransfer.setData('text/plain', (item as HTMLElement).dataset.url!);
      });
    });
  }
}
