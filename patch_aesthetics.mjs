import { readFileSync, writeFileSync } from 'fs';

let src = readFileSync('src/ui/screens/CardEditorScreen.ts', 'utf8');

const START_MARKER = '<div class="form-group aesthetics-box"';
const END_MARKER = '        <div style="margin-top:20px; display:flex; gap:10px;">';

const si = src.indexOf(START_MARKER);
const ei = src.indexOf(END_MARKER);
if (si === -1 || ei === -1) {
  console.error('MARKERS NOT FOUND', si, ei);
  process.exit(1);
}

// New aesthetics section — uses template literal vars already in scope in renderCardsMode:
// 't' = current template, ns/ds/abs/sts = zone style objects
const newSection = `        <div class="aesthetics-box" style="padding:15px;border:1px solid rgba(255,215,0,0.3);border-radius:12px;margin-top:20px;background:rgba(0,0,0,0.35);display:flex;flex-direction:column;gap:14px;">
           <label style="color:#ffd700;font-weight:900;letter-spacing:1px;font-size:0.85rem;">🎨 ESTÉTICA DA CARTA</label>

           \${(['name','desc','ability','stats']).map(zone => {
             const labels = { name:'🏷️ NOME', desc:'📄 DESCRIÇÃO', ability:'⚡ HABILIDADE', stats:'📊 STATS (ATK/PVP)' };
             const zs = (this.templates[this.selectedIndex]?.[zone+'Style']) || {};
             const defaults = { name:{bg:'#373a4b',bg2:'#1a1a2e',opacity:0.92}, desc:{bg:'#1a1c28',bg2:'#0d0d1a',opacity:0.90}, ability:{bg:'#14163a',bg2:'#0a0a20',opacity:0.95}, stats:{bg:'#28293a',bg2:'#1a1a2e',opacity:0.97} };
             const d = defaults[zone] || {};
             return \`
             <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,0.08);">
               <div style="font-size:0.7rem;font-weight:900;color:#aaa;letter-spacing:1px;margin-bottom:10px;">\${labels[zone]}</div>
               <div class="form-row">
                 <div class="form-group" style="flex:1"><label>Cor 1</label><input type="color" id="inp-\${zone}-bg" class="editor-input" style="height:36px;padding:2px;cursor:pointer" value="\${zs.bg||d.bg}"></div>
                 <div class="form-group" style="flex:1"><label>Cor 2 (Grad.)</label><input type="color" id="inp-\${zone}-bg2" class="editor-input" style="height:36px;padding:2px;cursor:pointer" value="\${zs.bg2||d.bg2}"></div>
                 <div class="form-group" style="flex:0.8"><label>Opac. (\${Math.round((zs.opacity??d.opacity)*100)}%)</label><input type="range" id="inp-\${zone}-opacity" min="0" max="1" step="0.05" class="editor-input" value="\${zs.opacity??d.opacity}"></div>
               </div>
               <label style="display:flex;align-items:center;gap:6px;font-size:0.78rem;cursor:pointer;margin-top:8px;"><input type="checkbox" id="inp-\${zone}-grad" \${zs.isGradient?'checked':''} style="width:14px;height:14px;"> GRADIENTE</label>
             </div>\`;
           }).join('')}

           <div style="background:rgba(81,197,255,0.05);border-radius:10px;padding:12px;border:1px solid rgba(81,197,255,0.2);">
             <div style="font-size:0.7rem;font-weight:900;color:#51c5ff;letter-spacing:1px;margin-bottom:10px;">🔲 BORDA E BRILHO</div>
             <div class="form-row">
               <div class="form-group" style="flex:1"><label>Cor da Borda</label><input type="color" id="inp-border-color" class="editor-input" style="height:36px;padding:2px;cursor:pointer" value="\${this.templates[this.selectedIndex]?.borderColor||'#ffffff'}"></div>
               <div class="form-group" style="flex:1"><label>Espessura (\${this.templates[this.selectedIndex]?.borderWidth??0}px)</label><input type="range" id="inp-border-width" min="0" max="8" step="1" class="editor-input" value="\${this.templates[this.selectedIndex]?.borderWidth??0}"></div>
               <div class="form-group" style="flex:1"><label>Raio (\${this.templates[this.selectedIndex]?.borderRadius??20}px)</label><input type="range" id="inp-border-radius" min="0" max="40" step="2" class="editor-input" value="\${this.templates[this.selectedIndex]?.borderRadius??20}"></div>
             </div>
             <div class="form-row" style="margin-top:8px;">
               <div class="form-group" style="flex:1"><label>Cor do Brilho</label><input type="color" id="inp-glow-color" class="editor-input" style="height:36px;padding:2px;cursor:pointer" value="\${this.templates[this.selectedIndex]?.glowColor||'#51c5ff'}"></div>
               <div class="form-group" style="flex:1"><label>Intensidade (\${this.templates[this.selectedIndex]?.glowIntensity??0}px)</label><input type="range" id="inp-glow-intensity" min="0" max="30" step="2" class="editor-input" value="\${this.templates[this.selectedIndex]?.glowIntensity??0}"></div>
             </div>
             <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:0.78rem;margin-top:8px;"><input type="checkbox" id="inp-glow-anim" \${this.templates[this.selectedIndex]?.glowAnimated?'checked':''} style="width:14px;height:14px;"> BRILHO PULSANTE (Animado)</label>
           </div>

           <div style="background:rgba(255,255,255,0.03);border-radius:10px;padding:12px;border:1px solid rgba(255,255,255,0.08);">
             <div style="font-size:0.7rem;font-weight:900;color:#ffd700;letter-spacing:1px;margin-bottom:10px;">✏️ TIPOGRAFIA</div>
             <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;">
               \${[['Outfit','Outfit'],['Cinzel','Cinzel'],['Orbitron','Orbitron'],['Bebas Neue','Bebas'],['Playfair Display','Playfair'],['Rajdhani','Rajdhani'],['Exo 2','Exo 2'],['UnifrakturMaguntia','Fraktur']].map(([fam,lbl])=>\`
                 <button class="font-picker-btn" data-font="\${fam}" style="font-family:'\${fam}',sans-serif;background:\${this.templates[this.selectedIndex]?.fontFamily===fam?'rgba(255,215,0,0.2)':'rgba(255,255,255,0.05)'};border:1px solid \${this.templates[this.selectedIndex]?.fontFamily===fam?'#ffd700':'rgba(255,255,255,0.15)'};color:white;padding:5px 9px;border-radius:7px;cursor:pointer;font-size:0.72rem;">\${lbl}</button>\`).join('')}
             </div>
             <div class="form-row">
               <div class="form-group" style="flex:1"><label>Cor do Texto</label><input type="color" id="inp-font-color" class="editor-input" style="height:36px;padding:2px;cursor:pointer" value="\${this.templates[this.selectedIndex]?.fontColor||'#ffffff'}"></div>
               <div class="form-group" style="flex:1"><label>Tamanho (\${this.templates[this.selectedIndex]?.fontSizeBase||100}%)</label><input type="range" id="inp-fsize" min="70" max="150" step="5" class="editor-input" value="\${this.templates[this.selectedIndex]?.fontSizeBase||100}"></div>
             </div>
           </div>
        </div>

        <div style="margin-top:20px; display:flex; gap:10px;">
`;

const result = src.slice(0, si) + newSection + src.slice(ei + END_MARKER.length);
writeFileSync('src/ui/screens/CardEditorScreen.ts', result, 'utf8');
console.log('Patched OK. si=' + si + ' ei=' + ei);
