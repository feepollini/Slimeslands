import React, { useRef } from 'react';
import { FogConfig } from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import { CloudFog, Eye, EyeOff, Plus, Trash2, Sparkles, Wind } from 'lucide-react';

interface Props {
  fogConfig: FogConfig;
  onUpdateFogConfig: (updates: Partial<FogConfig>) => void;
}

export const FogStudio: React.FC<Props> = ({
  fogConfig,
  onUpdateFogConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadFogPNG = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await readUploadedImage(files[i]);
        newUrls.push(res.dataUrl);
      }
      const existing = fogConfig.customFogPngs || (fogConfig.customFogPng ? [fogConfig.customFogPng] : []);
      onUpdateFogConfig({
        customFogPngs: [...existing, ...newUrls],
        customFogPng: newUrls[0],
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleRemovePng = (index: number) => {
    const list = [...(fogConfig.customFogPngs || (fogConfig.customFogPng ? [fogConfig.customFogPng] : []))];
    list.splice(index, 1);
    onUpdateFogConfig({
      customFogPngs: list,
      customFogPng: list.length > 0 ? list[0] : undefined,
    });
  };

  const fogList = fogConfig.customFogPngs || (fogConfig.customFogPng ? [fogConfig.customFogPng] : []);

  const TINT_PRESETS = [
    { label: 'Branco Etéreo', color: '#ffffff', bg: 'bg-white/20 text-white border-white/40' },
    { label: 'Azul Místico', color: '#60a5fa', bg: 'bg-blue-500/20 text-blue-300 border-blue-500/40' },
    { label: 'Pântano Esmeralda', color: '#34d399', bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    { label: 'Arcano Roxo', color: '#c084fc', bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40' },
    { label: 'Cinza Sépia', color: '#94a3b8', bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40' },
  ];

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadFogPNG}
      />

      {/* Header Info */}
      <div className="p-3 bg-gradient-to-r from-teal-950/80 via-slate-900 to-slate-900 border border-teal-500/40 rounded-xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300">
          <CloudFog className="w-4 h-4 text-teal-400" />
          <span>Neblina Rasteira & Névoa de Chão (Solo)</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Camada rasteira volumétrica renderizada <b>abaixo do jogador</b> e acima das texturas do piso, deslizando suavemente pela base dos cenários.
        </p>
      </div>

      {/* Controles Principais */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-teal-400 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gerenciador de Neblina</span>
          </span>
          <button
            onClick={() => onUpdateFogConfig({ enabled: !(fogConfig.enabled !== false) })}
            className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
              fogConfig.enabled !== false
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {fogConfig.enabled !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{fogConfig.enabled !== false ? 'Ativado' : 'Desativado'}</span>
          </button>
        </div>

        {/* Upload Custom Fog PNGs */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Texturas PNG de Névoa</span>
            <span className="text-[10px] text-teal-400 font-mono">{fogList.length} PNG(s)</span>
          </div>

          {fogList.length > 0 && (
            <div className="grid grid-cols-4 gap-2 py-1">
              {fogList.map((url, idx) => (
                <div key={idx} className="relative group bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center justify-center">
                  <img src={url} alt={`Fog ${idx}`} className="w-10 h-10 object-contain" />
                  <button
                    onClick={() => handleRemovePng(idx)}
                    className="absolute -top-1 -right-1 bg-rose-600 hover:bg-rose-500 text-white rounded-full p-0.5 shadow transition-transform group-hover:scale-110"
                    title="Remover PNG"
                  >
                    <Trash2 className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div
            onClick={() => fileInputRef.current?.click()}
            className="p-3 border-2 border-dashed border-teal-500/30 hover:border-teal-400 bg-teal-500/5 hover:bg-teal-500/10 rounded-xl cursor-pointer text-center transition-all flex items-center justify-center gap-2"
          >
            <div className="flex items-center gap-2 text-teal-400">
              <Plus className="w-4 h-4" />
              <span className="text-xs font-semibold">Adicionar PNGs de Neblina</span>
            </div>
          </div>
        </div>

        {/* Parâmetros Individuais da Neblina */}
        <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
          {/* Densidade da Neblina (1 a 10) */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Densidade de Bancos de Névoa (1 a 10)</span>
              <span className="font-mono text-teal-300">{Math.max(1, Math.min(10, fogConfig.fogCount ?? 5))}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={Math.max(1, Math.min(10, fogConfig.fogCount ?? 5))}
              onChange={(e) => onUpdateFogConfig({ fogCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
              className="w-full accent-teal-400 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <button type="button" onClick={() => onUpdateFogConfig({ fogCount: 2 })} className="hover:text-teal-300 cursor-pointer">2 (Suave)</button>
              <button type="button" onClick={() => onUpdateFogConfig({ fogCount: 5 })} className="hover:text-teal-300 cursor-pointer">5 (Média)</button>
              <button type="button" onClick={() => onUpdateFogConfig({ fogCount: 8 })} className="hover:text-teal-300 cursor-pointer">8 (Densa)</button>
              <button type="button" onClick={() => onUpdateFogConfig({ fogCount: 10 })} className="hover:text-teal-300 cursor-pointer">10 (Máxima)</button>
            </div>
          </div>

          {/* Opacidade */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Opacidade da Névoa</span>
              <span className="font-mono text-teal-300">{Math.round((fogConfig.opacity ?? 0.22) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={fogConfig.opacity ?? 0.22}
              onChange={(e) => onUpdateFogConfig({ opacity: parseFloat(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Velocidade de Deriva */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Velocidade de Deriva (Duração)</span>
              <span className="font-mono text-teal-300">{fogConfig.speed || 32}s</span>
            </div>
            <input
              type="range"
              min="10"
              max="60"
              step="2"
              value={fogConfig.speed || 32}
              onChange={(e) => onUpdateFogConfig({ speed: parseInt(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Altura / Cobertura no Solo */}
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Nível de Cobertura no Solo</span>
              <span className="font-mono text-teal-300">{fogConfig.groundLevelPercent ?? 60}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              step="5"
              value={fogConfig.groundLevelPercent ?? 60}
              onChange={(e) => onUpdateFogConfig({ groundLevelPercent: parseInt(e.target.value) })}
              className="w-full accent-teal-400 cursor-pointer"
            />
          </div>

          {/* Presets de Cor / Tonalidade */}
          <div>
            <span className="text-[10px] text-slate-400 block mb-1.5">Tonalidade / Atmosfera da Névoa:</span>
            <div className="grid grid-cols-3 gap-1.5">
              {TINT_PRESETS.map((tint) => {
                const isSel = (fogConfig.tintColor || '#ffffff').toLowerCase() === tint.color.toLowerCase();
                return (
                  <button
                    key={tint.color}
                    type="button"
                    onClick={() => onUpdateFogConfig({ tintColor: tint.color })}
                    className={`py-1.5 px-1 rounded border text-[10px] font-bold text-center transition-all ${
                      isSel ? `${tint.bg} shadow-sm ring-1 ring-white/30` : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {tint.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
