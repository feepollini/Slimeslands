import React, { useState } from 'react';
import {
  X,
  Layers,
  Upload,
  Maximize2,
  Check,
  Grid,
  Smartphone,
  ArrowRight,
  FileImage,
} from 'lucide-react';
import { generateCustomCanvasPNG, readUploadedImage } from '../../utils/tileGenerator';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreateCustomLevel: (params: {
    name: string;
    description?: string;
    canvasKind: 'vertical' | 'extended';
    width: number;
    height: number;
    tilePng: string;
    baseColor?: string;
    repeatCount?: number;
  }) => void;
  onImportPNGFiles?: (files: FileList | File[]) => void;
}

type CreationMode = 'custom_canvas' | 'import_png';

const RESOLUTION_PRESETS = [
  { label: 'Mobile Vertical', width: 768, height: 3072, desc: 'Padrão longo 1:4' },
  { label: 'Smartphone 9:16', width: 1080, height: 1920, desc: 'Full HD' },
  { label: 'Arena Quadrada', width: 1000, height: 1000, desc: '1:1 Sala / Batalha' },
  { label: 'Sala Clássica', width: 800, height: 600, desc: '4:3 Retrô' },
  { label: 'Extended Panorâmico', width: 2400, height: 1200, desc: '2:1 Exploração' },
];

const BASE_STYLES = [
  { id: 'white', label: 'Branco Puro', bg: '#ffffff', pattern: 'blank' as const, textDark: true },
  { id: 'slate', label: 'Preto Profundo', bg: '#000000', pattern: 'blank' as const },
  { id: 'blueprint', label: 'Azul Técnico', bg: '#082f49', pattern: 'blueprint' as const },
  { id: 'dots', label: 'Grid Pontilhado', bg: '#18181b', pattern: 'dots' as const },
  { id: 'grass', label: 'Verde Base', bg: '#166534', pattern: 'blank' as const },
  { id: 'sand', label: 'Laranja Areia', bg: '#7c2d12', pattern: 'blank' as const },
];

export const CreatePhaseModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onCreateCustomLevel,
  onImportPNGFiles,
}) => {
  const [mode, setMode] = useState<CreationMode>('custom_canvas');
  const [phaseName, setPhaseName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [canvasKind, setCanvasKind] = useState<'vertical' | 'extended'>('vertical');
  const [width, setWidth] = useState<number>(768);
  const [height, setHeight] = useState<number>(3072);
  const [selectedStyleIndex, setSelectedStyleIndex] = useState<number>(0);
  const [repeatCount, setRepeatCount] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleApplyPreset = (w: number, h: number) => {
    setWidth(w);
    setHeight(h);
  };

  const handleCreate = () => {
    setIsGenerating(true);
    try {
      const selectedStyle = BASE_STYLES[selectedStyleIndex] || BASE_STYLES[0];
      const result = generateCustomCanvasPNG({
        width,
        height,
        backgroundColor: selectedStyle.bg,
        patternStyle: selectedStyle.pattern,
      });

      const finalName = phaseName.trim() || `Fase ${canvasKind === 'extended' ? 'Extended' : 'Vertical'} (${width}x${height})`;

      onCreateCustomLevel({
        name: finalName,
        description: description.trim() || undefined,
        canvasKind,
        width,
        height,
        tilePng: result.dataUrl,
        baseColor: selectedStyle.bg,
        repeatCount: canvasKind === 'vertical' ? repeatCount : 1,
      });

      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (onImportPNGFiles) {
      onImportPNGFiles(files);
      onClose();
      return;
    }

    const firstFile = files[0];
    try {
      const imgRes = await readUploadedImage(firstFile);
      const name = phaseName.trim() || firstFile.name.replace(/\.[^/.]+$/, '');
      onCreateCustomLevel({
        name,
        canvasKind,
        width: imgRes.width,
        height: imgRes.height,
        tilePng: imgRes.dataUrl,
        baseColor: imgRes.dominantColor || '#ffffff',
      });
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const aspectRatio = (width / height).toFixed(2);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm select-none">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Linha técnica superior */}
        <div className="w-full h-[2px] flex">
          <div className="h-full flex-1 bg-red-600" />
          <div className="h-full flex-1 bg-orange-500" />
          <div className="h-full flex-1 bg-emerald-500" />
          <div className="h-full flex-1 bg-blue-600" />
        </div>

        {/* Modal Header */}
        <div className="p-5 border-b border-zinc-850 flex items-center justify-between bg-zinc-950">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-750 flex items-center justify-center text-white">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Criar Nova Fase</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-800">
                  Custom
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Resolução personalizada em pixels ou importação direta de PNG.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas do Menu */}
        <div className="flex border-b border-zinc-850 bg-black px-5 pt-2 gap-2">
          <button
            type="button"
            onClick={() => setMode('custom_canvas')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 ${
              mode === 'custom_canvas'
                ? 'border-orange-500 text-white bg-zinc-950'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Canvas Personalizado</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('import_png')}
            className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-colors cursor-pointer border-b-2 ${
              mode === 'import_png'
                ? 'border-orange-500 text-white bg-zinc-950'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Importar Imagens PNG</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-zinc-950">
          {mode === 'custom_canvas' ? (
            <>
              {/* 1. Escolha da Arquitetura */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center justify-between">
                  <span>1. Arquitetura do Canvas</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {canvasKind === 'vertical' ? 'Rolagem Contínua' : 'Navegação 2D'}
                  </span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCanvasKind('vertical');
                      if (width === 1000 && height === 1000) {
                        setWidth(768);
                        setHeight(3072);
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex gap-3 ${
                      canvasKind === 'vertical'
                        ? 'bg-blue-950/40 border-blue-500 text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>Vertical de Rolagem Repetida</span>
                        {canvasKind === 'vertical' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Mapa vertical contínuo com repetição de fatias e rolagem de câmera top-down.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCanvasKind('extended');
                      if (width === 768 && height === 3072) {
                        setWidth(1200);
                        setHeight(1200);
                      }
                    }}
                    className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex gap-3 ${
                      canvasKind === 'extended'
                        ? 'bg-zinc-900 border-white text-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="w-8 h-8 rounded bg-zinc-800 text-white flex items-center justify-center shrink-0">
                      <Layers className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                        <span>Fixo Extended Biomes</span>
                        {canvasKind === 'extended' && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        Área delimitada ou arena com navegação bidirecional livre em qualquer direção.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 2. Resolução do Canvas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-zinc-400" />
                    <span>2. Resolução do Canvas (Pixels)</span>
                  </label>
                  <span className="text-[11px] font-mono text-zinc-400">
                    {width} x {height} px ({aspectRatio})
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Largura (Máx 5000px):</span>
                    <div className="relative">
                      <input
                        type="number"
                        min={32}
                        max={5000}
                        step={16}
                        value={width}
                        onChange={(e) => setWidth(Math.max(32, Math.min(5000, Number(e.target.value) || 32)))}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-white focus:outline-none focus:border-white"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-zinc-500 font-mono">px</span>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-500 uppercase">Altura (Máx 5000px):</span>
                    <div className="relative">
                      <input
                        type="number"
                        min={32}
                        max={5000}
                        step={16}
                        value={height}
                        onChange={(e) => setHeight(Math.max(32, Math.min(5000, Number(e.target.value) || 32)))}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs font-mono text-white focus:outline-none focus:border-white"
                      />
                      <span className="absolute right-3 top-2 text-[10px] text-zinc-500 font-mono">px</span>
                    </div>
                  </div>
                </div>

                {/* Presets Rápidos */}
                <div className="space-y-1.5">
                  <span className="text-[10px] text-zinc-500">Atalhos:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {RESOLUTION_PRESETS.map((preset) => {
                      const isSelected = width === preset.width && height === preset.height;
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => handleApplyPreset(preset.width, preset.height)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-white text-black font-semibold border-white'
                              : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'
                          }`}
                        >
                          {preset.label} ({preset.width}x{preset.height})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 3. Estilo Visual da Base */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Grid className="w-3.5 h-3.5 text-zinc-400" />
                  <span>3. Estilo da Imagem Base</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {BASE_STYLES.map((style, idx) => {
                    const isSelected = selectedStyleIndex === idx;
                    return (
                      <button
                        key={style.id}
                        type="button"
                        onClick={() => setSelectedStyleIndex(idx)}
                        className={`p-2 rounded-md border flex items-center gap-2 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-zinc-900 border-white text-white font-semibold'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <div
                          className="w-4 h-4 rounded border border-zinc-700 shrink-0"
                          style={{ backgroundColor: style.bg }}
                        />
                        <span className="text-xs truncate">{style.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Nome da Fase */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  <span>4. Nome da Fase</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fase 1"
                  value={phaseName}
                  onChange={(e) => setPhaseName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 rounded-md text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-white"
                />
              </div>
            </>
          ) : (
            /* Modo Importar Imagens PNG */
            <div className="p-8 border-2 border-dashed border-zinc-800 hover:border-zinc-600 rounded-xl bg-zinc-900/40 flex flex-col items-center justify-center text-center transition-colors">
              <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-750 flex items-center justify-center text-zinc-300 mb-3">
                <FileImage className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-semibold text-white mb-1">
                Importar Arquivo PNG
              </h4>
              <p className="text-[11px] text-zinc-400 max-w-sm mb-4">
                A fase será criada preservando a resolução nativa do arquivo selecionado.
              </p>
              <label className="px-4 py-2 rounded-md bg-white hover:bg-zinc-200 text-black font-semibold text-xs cursor-pointer transition-colors shadow-sm">
                <span>Selecionar PNG</span>
                <input
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleFileInputChange}
                />
              </label>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-zinc-850 bg-black flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          {mode === 'custom_canvas' && (
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleCreate}
              className="px-4 py-2 rounded-md bg-orange-500 hover:bg-orange-600 text-black font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <span>Criar Fase e Abrir Editor</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
