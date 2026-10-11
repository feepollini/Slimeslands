import os

file_content = r"""
  private renderTabEfeitos(): string {
    const t = this.templates[this.selectedIndex];
    const p = t.particles || { type: 'none', color: '#ffaa00', count: 20 };
    return `
      <div style="background:rgba(163,53,238,0.05); border:1px solid rgba(163,53,238,0.2); border-radius:12px; padding:15px; margin-bottom:15px;">
          <div style="color:#a335ee; font-weight:900; font-size:0.75rem; margin-bottom:15px; text-transform:uppercase; letter-spacing:1px;">✨ PARTÍCULAS AMBIENTAIS (PREMIUM)</div>
          <div class="form-group">
            <label>Tipo de Emissor</label>
            <select id="inp-particles-type" class="editor-input">
               <option value="none" ${p.type === 'none' ? 'selected' : ''}>Nenhum</option>
               <option value="sparks" ${p.type === 'sparks' ? 'selected' : ''}>🔥 Fagulhas de Alma (Soul Sparks)</option>
               <option value="fog" ${p.type === 'fog' ? 'selected' : ''}>🌫️ Névoa Atmosférica (Fog)</option>
               <option value="swirl" ${p.type === 'swirl' ? 'selected' : ''}>🌀 Redemoinho Mágico (Magic Swirl)</option>
            </select>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:1">
               <label>Cor do Brilho</label>
               <input type="color" id="inp-particles-color" class="editor-input" value="${p.color || '#ffaa00'}">
            </div>
            <div class="form-group" style="flex:1">
               <label>Densidade (${p.count || 20})</label>
               <input type="range" id="inp-particles-count" min="5" max="100" value="${p.count || 20}">
            </div>
          </div>
      </div>
    `;
  }

  public bind(container: HTMLElement) {
    const t = this.templates[this.selectedIndex];
    if (!t) return;

    // Sub-Tabs Switching
    container.querySelectorAll('.card-sub-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.cardSubMode = (btn as HTMLElement).dataset.sub as any;
        this.reRender();
      });
    });

    // Switch Card in List
    container.querySelectorAll('.editor-list-item').forEach(el => {
      el.addEventListener('click', (e) => {
        const idx = parseInt((e.currentTarget as HTMLElement).dataset.idx!);
        this.selectedIndex = idx;
        this.reRender();
      });
    });

    // Add / Delete Card
    container.querySelector('#btn-add-card')?.addEventListener('click', () => {
      this.templates.push({ name: 'Nova Carta', baseAtk: 100, basePv: 100, image: this.availableCards[0] || '' });
      this.selectedIndex = this.templates.length - 1;
      this.reRender();
    });

    container.querySelector('#btn-delete-card')?.addEventListener('click', () => {
      if (this.templates.length <= 1) return;
      if (confirm('Deseja excluir esta carta PERMANENTEMENTE?')) {
        this.templates.splice(this.selectedIndex, 1);
        this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        this.reRender();
      }
    });

    const updateObj = () => {
      const nameInp = container.querySelector('#inp-name') as HTMLInputElement;
      if (nameInp) t.name = nameInp.value;
      const atkInp_ = container.querySelector('#inp-atk') as HTMLInputElement;
      if (atkInp_) t.baseAtk = parseInt(atkInp_.value) || 0;
      const pvInp_ = container.querySelector('#inp-pv') as HTMLInputElement;
      if (pvInp_) t.basePv = parseInt(pvInp_.value) || 0;
      const manaInp = container.querySelector('#inp-mana') as HTMLInputElement;
      if (manaInp) t.manaCost = parseInt(manaInp.value) || 1;
      const stamInp = container.querySelector('#inp-stam') as HTMLInputElement;
      if (stamInp) t.staminaCost = parseInt(stamInp.value) || 1;
      const rarInp = container.querySelector('#inp-rarity') as HTMLSelectElement;
      if (rarInp) t.preferredRarity = rarInp.value as any;
      const flavorInp = container.querySelector('#inp-flavor') as HTMLTextAreaElement;
      if (flavorInp) t.flavorText = flavorInp.value;
      const vStart = container.querySelector('#inp-vid-start') as HTMLInputElement;
      if (vStart) t.videoStart = parseFloat(vStart.value);
      const vEnd = container.querySelector('#inp-vid-end') as HTMLInputElement;
      if (vEnd) t.videoEnd = parseFloat(vEnd.value);
      const fColor = container.querySelector('#inp-color-txt') as HTMLInputElement;
      if (fColor) t.fontColor = fColor.value;
      const fSize = container.querySelector('#inp-fsize') as HTMLInputElement;
      if (fSize) t.fontSizeBase = parseInt(fSize.value);
      const bColor = container.querySelector('#inp-border-color') as HTMLInputElement;
      if (bColor) t.borderColor = bColor.value;
      const gColor = container.querySelector('#inp-glow-color') as HTMLInputElement;
      if (gColor) t.glowColor = gColor.value;
      const bWidth = container.querySelector('#inp-border-width') as HTMLInputElement;
      if (bWidth) t.borderWidth = parseInt(bWidth.value);
      const gIntensity = container.querySelector('#inp-glow-intensity') as HTMLInputElement;
      if (gIntensity) t.glowIntensity = parseInt(gIntensity.value);
      const patType = container.querySelector('#inp-card-pattern') as HTMLSelectElement;
      if (patType) t.patternType = patType.value;
      const patColor = container.querySelector('#inp-card-pattern-color') as HTMLInputElement;
      if (patColor) t.patternColor = patColor.value;
      const filterType = container.querySelector('#inp-card-filter') as HTMLSelectElement;
      if (filterType) t.imageFilter = filterType.value;
      const filterInt = container.querySelector('#inp-card-filter-intensity') as HTMLInputElement;
      if (filterInt) t.imageFilterIntensity = parseInt(filterInt.value);

      if (t.patternType) t.patternOverlay = generateSvgPattern(t.patternType, t.patternColor || '#ffffff', 20);
      else t.patternOverlay = '';

      if (this.selectedParallaxLayerIdx !== null && t.parallaxLayers) {
        const ly = t.parallaxLayers[this.selectedParallaxLayerIdx];
        const zInp = container.querySelector('#parallax-z') as HTMLInputElement;
        if (zInp) ly.z = parseInt(zInp.value);
        const sInp = container.querySelector('#parallax-speed') as HTMLInputElement;
        if (sInp) ly.speed = parseFloat(sInp.value);
        const scInp = container.querySelector('#parallax-scale') as HTMLInputElement;
        if (scInp) ly.scale = parseFloat(scInp.value);
        const opInp = container.querySelector('#parallax-opacity') as HTMLInputElement;
        if (opInp) ly.opacity = parseFloat(opInp.value);
        const bInp = container.querySelector('#parallax-blend') as HTMLSelectElement;
        if (bInp) ly.blendMode = bInp.value;
        const xInp = container.querySelector('#parallax-x') as HTMLInputElement;
        if (xInp) ly.initialX = parseInt(xInp.value);
        const yInp = container.querySelector('#parallax-y') as HTMLInputElement;
        if (yInp) ly.initialY = parseInt(yInp.value);
        const fInp = container.querySelector('#parallax-filter') as HTMLSelectElement;
        if (fInp) ly.imageFilter = fInp.value;
        const fiInp = container.querySelector('#parallax-filter-intensity') as HTMLInputElement;
        if (fiInp) ly.imageFilterIntensity = parseInt(fiInp.value);
      }
      this.updatePreview();
    };

    container.querySelectorAll('.editor-input, input[type="checkbox"]').forEach(inp => {
       inp.addEventListener('input', updateObj);
       inp.addEventListener('change', updateObj);
    });

    container.querySelectorAll('.btn-add-atk, .btn-del-atk').forEach(btn => {
      btn.addEventListener('click', () => {
         const idx = parseInt((btn as HTMLElement).dataset.idx!);
         if (btn.classList.contains('btn-add-atk')) {
           if (!t.attacks) t.attacks = [];
           t.attacks[idx] = { name: 'NOVO ATAQUE', damage: t.baseAtk, cost: 1, costType: 'stamina' };
         } else t.attacks.splice(idx, 1);
         this.reRender();
      });
    });

    const updateAttacks = () => {
       container.querySelectorAll('.attack-entry').forEach(entry => {
          const idx = parseInt((entry as HTMLElement).querySelector('.inp-atk-name')?.getAttribute('data-idx') || '-1');
          if (idx === -1 || !t.attacks[idx]) return;
          t.attacks[idx].name = (entry.querySelector('.inp-atk-name') as HTMLInputElement).value;
          t.attacks[idx].damage = parseInt((entry.querySelector('.inp-atk-dmg') as HTMLInputElement).value) || 0;
          t.attacks[idx].costType = (entry.querySelector('.inp-atk-res') as HTMLSelectElement).value as any;
          t.attacks[idx].cost = parseInt((entry.querySelector('.inp-atk-cost') as HTMLInputElement).value) || 1;
       });
       this.updatePreview();
    };
    container.querySelectorAll('.inp-atk-name, .inp-atk-dmg, .inp-atk-res, .inp-atk-cost').forEach(inp => {
       inp.addEventListener('input', updateAttacks);
    });

    container.querySelector('#btn-pick-card-media')?.addEventListener('click', () => {
      this.openMediaPicker(url => {
        const isVid = /\.(mp4|webm)$/i.test(url);
        if (isVid) { t.animationUrl = url; t.videoStart = 0; t.videoEnd = 5; delete t.image; }
        else { t.image = url; delete t.animationUrl; }
        this.reRender();
      });
    });

    container.querySelector('#btn-add-parallax')?.addEventListener('click', () => {
      if (!t.parallaxLayers) t.parallaxLayers = [];
      this.openMediaPicker(url => {
        t.parallaxLayers!.push({ id: `lyr_${Date.now()}`, url, z: t.parallaxLayers!.length + 1, speed: 1, scale: 1, initialX: 0, initialY: 0, opacity: 1, blendMode: 'normal' });
        this.selectedParallaxLayerIdx = t.parallaxLayers!.length - 1;
        this.reRender();
      });
    });

    container.querySelectorAll('.parallax-list-item').forEach(item => {
      item.addEventListener('click', (e) => {
          if ((e.target as HTMLElement).classList.contains('btn-del-parallax')) return;
          this.selectedParallaxLayerIdx = parseInt((item as HTMLElement).dataset.idx!);
          this.reRender();
      });
    });

    container.querySelectorAll('.btn-del-parallax').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt((btn as HTMLElement).dataset.idx!);
        t.parallaxLayers!.splice(idx, 1);
        this.selectedParallaxLayerIdx = null;
        this.reRender();
      });
    });

    this.updatePreview();
  }

  private updatePreview() {
    const t = this.templates[this.selectedIndex];
    const wrapper = document.getElementById('preview-wrapper');
    const pHand = document.getElementById('preview-hand');
    const pBoard = document.getElementById('preview-board');
    if (!t || !wrapper) return;

    const mockCard: Card = { ...t, id: 'preview', owner: 'p', rarity: t.preferredRarity || 'common' } as unknown as Card;
    if (this.previewMode === 'video') mockCard.animationUrl = t.animationUrl;
    else delete mockCard.animationUrl;

    wrapper.innerHTML = this.boardRenderer.renderFullscreenCard(mockCard);
    animateParallaxLayers(wrapper, mockCard.parallaxLayers || []);
    const pLayer = wrapper.querySelector('.card-particle-layer') as HTMLElement;
    if (pLayer && mockCard.particles) {
        const count = mockCard.particles.count || 20;
        if (mockCard.particles.type === 'sparks') spawnSparkParticles(pLayer, mockCard.particles.color, count);
        else if (mockCard.particles.type === 'fog') spawnAtmosphericFog(pLayer, mockCard.particles.color, Math.ceil(count/3));
        else if (mockCard.particles.type === 'swirl') {
            spawnMagicSwirl(pLayer, mockCard.particles.color || '#a335ee', count);
        }
    }
    if (pHand) pHand.innerHTML = this.boardRenderer.renderHandCard(mockCard);
    if (pBoard) pBoard.innerHTML = this.boardRenderer.renderCard(mockCard);
  }
}
"""

target_file = r"c:\Users\FELIP\legends of winter\src\ui\screens\forge_v2\tabs\TabCards.ts"

with open(target_file, "r", encoding="utf-8") as f:
    lines = f.readlines()

# find private renderTabEfeitos(): string {
start_line = -1
for i, line in enumerate(lines):
    if "private renderTabEfeitos(): string {" in line:
        start_line = i
        break

if start_line != -1:
    new_lines = [lines[i] for i in range(start_line)]
    with open(target_file, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        f.write(file_content.replace(r'\${', '${'))

print("done")
