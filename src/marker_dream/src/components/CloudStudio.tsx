import React, { useRef } from 'react';
import { CloudConfig } from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import { Cloud, Upload, Trash2, Eye, EyeOff, Plus, Sparkles } from 'lucide-react';

interface Props {
  cloudConfig: CloudConfig;
  onUpdateCloudConfig: (updates: Partial<CloudConfig>) => void;
}

export const CloudStudio: React.FC<Props> = ({
  cloudConfig,
  onUpdateCloudConfig,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadCloudPNG = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const res = await readUploadedImage(files[i]);
        newUrls.push(res.dataUrl);
      }
      const existing = cloudConfig.customCloudPngs || (cloudConfig.customCloudPng ? [cloudConfig.customCloudPng] : []);
      onUpdateCloudConfig({
        customCloudPngs: [...existing, ...newUrls],
        customCloudPng: newUrls[0] // fallback
      });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleRemovePng = (index: number) => {
    const list = [...(cloudConfig.customCloudPngs || (cloudConfig.customCloudPng ? [cloudConfig.customCloudPng] : []))];
    list.splice(index, 1);
    onUpdateCloudConfig({
      customCloudPngs: list,
      customCloudPng: list.length > 0 ? list[0] : undefined
    });
  };

  const cloudList = cloudConfig.customCloudPngs || (cloudConfig.customCloudPng ? [cloudConfig.customCloudPng] : []);

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadCloudPNG}
      />

      {/* Header Info */}
      <div className="p-3 bg-gradient-to-r from-sky-950/80 to-slate-900 border border-sky-500/40 rounded-xl space-y-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-300">
          <Cloud className="w-4 h-4 text-sky-400" />
          <span>Atmosfera & Nuvens Procedurais em Parallax</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Configure a camada de nuvens fixada na tela. Envie múltiplos PNGs para geração procedural variada (tamanhos grandes e pequenos, velocidades aleatórias).
        </p>
      </div>

      {/* Controles Principais */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3.5 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-sky-400 uppercase tracking-wide flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gerenciador de Nuvens</span>
          </span>
          <button
            onClick={() => onUpdateCloudConfig({ enabled: !(cloudConfig.enabled !== false) })}
            className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 transition-colors ${
              cloudConfig.enabled !== false
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {cloudConfig.enabled !== false ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{cloudConfig.enabled !== false ? 'Ativado' : 'Desativado'}</span>
          </button>
        </div>

        {/* Upload Custom Cloud PNGs (Multipla Seleção) */}
        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Texturas PNG (Múltiplas Seleções)</span>
            <span className="text-[10px] text-sky-400 font-mono">{cloudList.length} PNG(s)</span>
          </div>

          {cloudList.length > 0 && (
            <div className="grid grid-cols-4 gap-2 py-1">
              {cloudList.map((url, idx) => (
                <div key={idx} className="relative group bg-slate-900 border border-slate-800 rounded-lg p-1 flex items-center justify-center">
                  <img src={url} alt={`Cloud ${idx}`} className="w-10 h-10 object-contain" />
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
            className="p-3 border-2 border-dashed border-sky-500/30 hover:border-sky-400 bg-sky-500/5 hover:bg-sky-500/10 rounded-xl cursor-pointer text-center transition-all flex items-center justify-center gap-2"
          >
            <div className="flex items-center gap-2 text-sky-400">
              <Plus className="w-4 h-4" />
              <span className="text-xs font-semibold">Adicionar PNGs de Nuvens</span>
            </div>
          </div>
        </div>

        {/* Quantidade & Opacidade */}
        <div className="space-y-3 pt-2 border-t border-slate-800 text-xs">
          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Densidade de Nuvens (1 a 10)</span>
              <span className="font-mono text-sky-300">{Math.max(1, Math.min(10, cloudConfig.cloudCount ?? 4))}</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={Math.max(1, Math.min(10, cloudConfig.cloudCount ?? 4))}
              onChange={(e) => onUpdateCloudConfig({ cloudCount: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-slate-500 mt-1">
              <button type="button" onClick={() => onUpdateCloudConfig({ cloudCount: 2 })} className="hover:text-sky-300 cursor-pointer">2 (Suave)</button>
              <button type="button" onClick={() => onUpdateCloudConfig({ cloudCount: 5 })} className="hover:text-sky-300 cursor-pointer">5 (Média)</button>
              <button type="button" onClick={() => onUpdateCloudConfig({ cloudCount: 8 })} className="hover:text-sky-300 cursor-pointer">8 (Densa)</button>
              <button type="button" onClick={() => onUpdateCloudConfig({ cloudCount: 10 })} className="hover:text-sky-300 cursor-pointer">10 (Máxima)</button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Random Scale (Variação % de Tamanho)</span>
              <span className="font-mono text-sky-300">{cloudConfig.randomScalePercent ?? 60}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={cloudConfig.randomScalePercent ?? 60}
              onChange={(e) => onUpdateCloudConfig({ randomScalePercent: parseInt(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Tamanho Base Geral</span>
              <span className="font-mono text-sky-300">{cloudConfig.baseCloudScale ?? 100}%</span>
            </div>
            <input
              type="range"
              min="40"
              max="300"
              step="10"
              value={cloudConfig.baseCloudScale ?? 100}
              onChange={(e) => onUpdateCloudConfig({ baseCloudScale: parseInt(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Opacidade das Bordas</span>
              <span className="font-mono text-sky-300">{Math.round((cloudConfig.edgeOpacity ?? 0.8) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={cloudConfig.edgeOpacity ?? 0.8}
              onChange={(e) => onUpdateCloudConfig({ edgeOpacity: parseFloat(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Transparência do Centro</span>
              <span className="font-mono text-sky-300">{Math.round((cloudConfig.centerTransparency ?? 0.1) * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="0.6"
              step="0.05"
              value={cloudConfig.centerTransparency ?? 0.1}
              onChange={(e) => onUpdateCloudConfig({ centerTransparency: parseFloat(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-300 mb-1">
              <span>Velocidade de Parallax (Flutuação)</span>
              <span className="font-mono text-sky-300">{cloudConfig.speed || 16}s</span>
            </div>
            <input
              type="range"
              min="4"
              max="40"
              step="2"
              value={cloudConfig.speed || 16}
              onChange={(e) => onUpdateCloudConfig({ speed: parseInt(e.target.value) })}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
