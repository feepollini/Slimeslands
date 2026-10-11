import { ForgeCore } from '../../../core/ForgeCore';

export class ScenesMain {
  private state: any;
  private core: ForgeCore;

  constructor(state: any, core: ForgeCore, _callbacks: any) {
    this.state = state;
    this.core = core;
    void _callbacks;
  }

  public render(): string {
    return `
      <div style="padding:20px; display:flex; flex-direction:column; gap:20px; animation: fadeIn 0.3s ease;">
         <div style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:15px;">
            <h2 style="color:#ffd700; margin:0; font-size:1.2rem; letter-spacing:2px;">SCENES EDITOR</h2>
            <p style="font-size:0.7rem; opacity:0.6; margin:5px 0 0 0;">TODAS AS CENAS SERÃO GRAVADAS NO CÓDIGO (JSON) DO PROJETO.</p>
         </div>

         <div style="flex:1; display:flex; align-items:center; justify-content:center; border:2px dashed rgba(255,255,255,0.05); border-radius:20px; min-height:300px; opacity:0.4;">
            <div style="text-align:center;">
               <div style="font-size:2rem; margin-bottom:10px;">🎬</div>
               <div style="font-size:0.75rem; font-weight:900; letter-spacing:1px;">AGUARDANDO DEFINIÇÃO DE LÓGICA DE CENAS</div>
            </div>
         </div>

         <div style="display:flex; justify-content:flex-end; margin-top:20px;">
            <button id="btn-save-scenes" class="editor-btn-secondary" style="border-color:#ffd700; color:#ffd700; padding:10px 30px;">[GRAVAR CENAS NO CÓDIGO]</button>
         </div>
      </div>
    `;
  }

  public async saveScenes() {
    // Sincronizado com o sistema de arquivos do Forge Core
    const ok = await this.core.saveJson('/api/save-scenes', this.state.scenes || []);
    if (ok) this.core.showToast('✅ CENAS GRAVADAS NO CÓDIGO!', '#ffd700');
    else this.core.showToast('❌ ERRO AO GRAVAR CENAS', '#ff4444');
  }

  public bind(container: HTMLElement) {
    container.querySelector('#btn-save-scenes')?.addEventListener('click', () => this.saveScenes());
  }
}
