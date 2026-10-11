/**
 * SpriteLibraryPanel.ts
 * Painel oficial de Sprite Assets (Packs e Folders) para o editor de fases.
 */

export class SpriteLibraryPanel {
  private state: any = null;

  public render(state: any): string {
    this.state = state;
    const packs = state.customSpritePacks || [];

    return `
      <div style="display:flex; flex-direction:column; height:100%; background:#08080c; overflow:hidden;">
        
        <!-- HEADER -->
        <div style="padding:15px; background:rgba(76,255,136,0.03); border-bottom:1px solid rgba(76,255,136,0.1); flex-shrink:0;">
          <h3 style="color:#4cff88; margin:0; font-size:0.7rem; font-weight:900; letter-spacing:2px;">OFFICIAL SPRITE LIBRARY</h3>
          <p style="font-size:0.45rem; color:#444; margin-top:4px;">PROJETOS CRIADOS NO SPRITE STUDIO</p>
        </div>

        <!-- GRID DE PASTAS/PACKS -->
        <div id="sprite-library-grid" style="flex:1; padding:12px; overflow-y:auto; display:grid; grid-template-columns:1fr; gap:12px;" class="custom-scroll">
          ${packs.length > 0 ? packs.map((p: any) => this.renderSpriteCard(p)).join('') : `
            <div style="padding:60px; text-align:center; opacity:0.1; display:flex; flex-direction:column; align-items:center; gap:20px;">
              <div style="font-size:3rem;">🎬</div>
              <div style="font-size:0.6rem; font-weight:900;">NENHUM PACK ENCONTRADO</div>
            </div>
          `}
        </div>

        <style>
          .custom-scroll::-webkit-scrollbar { width: 4px; }
          .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.05); border-radius:10px; }
        </style>
      </div>
    `;
  }

  private renderSpriteCard(p: any): string {
    const isPreset = p.isPreset;
    const accent = isPreset ? '#ffd700' : '#51c5ff';
    
    // Preview image
    let previewUrl = '';
    if (p.actions && p.actions.length > 0) {
      const firstAct = p.actions[0];
      const dir = firstAct.directions?.down || firstAct.directions?.up || firstAct.directions?.right || firstAct.directions?.left;
      if (dir) {
        previewUrl = dir.gifUrl || (dir.frames && dir.frames.length > 0 ? dir.frames[0] : '');
      }
    }

    return `
      <div class="sprite-pack-card" draggable="true" data-id="${p.id}" style="
        background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.05);
        border-radius:16px; padding:15px; cursor:pointer; transition:0.2s;
        display:flex; align-items:center; gap:15px; position:relative;
        overflow:hidden;
      " onmouseover="this.style.background='rgba(255,255,255,0.05)'; this.style.borderColor='${accent}'" onmouseout="this.style.background='rgba(255,255,255,0.02)'; this.style.borderColor='rgba(255,255,255,0.05)'">
        
        <!-- PREVIEW BOX -->
        <div style="
          width:60px; height:60px; background:rgba(0,0,0,0.4); border-radius:10px;
          display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden;
        ">
          ${previewUrl ? `<img src="${previewUrl}" style="max-width:80%; max-height:80%; image-rendering:pixelated;">` : `<span style="opacity:0.1; font-size:1.5rem;">🎭</span>`}
        </div>

        <!-- INFO -->
        <div style="flex:1;">
          <div style="font-size:0.45rem; color:${accent}; font-weight:900; letter-spacing:1px; margin-bottom:4px;">${isPreset ? 'NPC PRESET' : 'CUSTOM PACK'}</div>
          <div style="font-size:0.8rem; font-weight:900; color:#fff;">${p.name}</div>
          <div style="font-size:0.5rem; color:#555; margin-top:4px;">${p.actions?.length || 0} sequências</div>
        </div>

        <div style="font-size:0.8rem; opacity:0.1; position:absolute; right:15px;">📁</div>
      </div>
    `;
  }

  public bind(container: HTMLElement, state: any, onSelect: (pack: any) => void) {
    container.querySelectorAll('.sprite-pack-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = (card as HTMLElement).dataset.id;
        const pack = (state.customSpritePacks || []).find((p: any) => p.id === id);
        if (pack) onSelect(pack);
      });

      // Drag & Drop
      card.addEventListener('dragstart', (e: any) => {
        const id = (card as HTMLElement).dataset.id;
        const pack = (state.customSpritePacks || []).find((p: any) => p.id === id);
        if (pack) {
          // Send a special payload for Sprite Packs
          const payload = JSON.stringify({ type: 'sprite_pack', id: pack.id });
          e.dataTransfer.setData('text/plain', payload);
          e.dataTransfer.effectAllowed = 'copy';
        }
      });
    });
  }
}
