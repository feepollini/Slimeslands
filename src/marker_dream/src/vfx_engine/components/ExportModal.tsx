import React, { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Play, Pause, X } from 'lucide-react';
import { ElementalPalette, ShaderParams, VfxPresetMeta } from '../vfx/types';
import { generateSpritesheetCanvas } from '../vfx/vfxEngine';
import { GLSL_SHADER_REFERENCE } from '../vfx/presets';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  preset: VfxPresetMeta;
  palette: ElementalPalette;
  params: ShaderParams;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  preset,
  palette,
  params,
}) => {
  const [activeTab, setActiveTab] = useState<'spritesheet' | 'glsl' | 'json'>('spritesheet');
  const [copied, setCopied] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(true);
  const [previewFrame, setPreviewFrame] = useState(0);
  const [frameResolution, setFrameResolution] = useState<256 | 384>(256);

  const sheetPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const animPreviewRef = useRef<HTMLCanvasElement | null>(null);
  const generatedSheetRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const sheet = generateSpritesheetCanvas(
      preset.id,
      palette,
      params,
      4,
      4,
      frameResolution
    );
    generatedSheetRef.current = sheet;

    if (sheetPreviewRef.current) {
      const ctx = sheetPreviewRef.current.getContext('2d');
      if (ctx) {
        sheetPreviewRef.current.width = sheet.width;
        sheetPreviewRef.current.height = sheet.height;
        ctx.clearRect(0, 0, sheet.width, sheet.height);
        ctx.drawImage(sheet, 0, 0);
      }
    }
  }, [isOpen, preset.id, palette, params, frameResolution]);

  useEffect(() => {
    if (!isOpen || !isPlayingPreview) return;
    const interval = setInterval(() => {
      setPreviewFrame((prev) => (prev + 1) % 16);
    }, 55);
    return () => clearInterval(interval);
  }, [isOpen, isPlayingPreview]);

  useEffect(() => {
    if (!isOpen || !generatedSheetRef.current || !animPreviewRef.current) return;
    const animCanvas = animPreviewRef.current;
    const ctx = animCanvas.getContext('2d');
    if (!ctx) return;

    const col = previewFrame % 4;
    const row = Math.floor(previewFrame / 4);
    ctx.clearRect(0, 0, animCanvas.width, animCanvas.height);
    ctx.drawImage(
      generatedSheetRef.current,
      col * frameResolution,
      row * frameResolution,
      frameResolution,
      frameResolution,
      0,
      0,
      animCanvas.width,
      animCanvas.height
    );
  }, [isOpen, previewFrame, frameResolution, preset.id, palette, params]);

  if (!isOpen) return null;

  const jsonConfig = JSON.stringify(
    {
      effectId: preset.id,
      effectName: preset.name,
      category: preset.category,
      tags: preset.tags,
      palette: {
        id: palette.id,
        core: palette.core,
        primary: palette.primary,
        secondary: palette.secondary,
        accent: palette.accent,
        dark: palette.dark,
      },
      shaderAndPerformance: {
        effectScale: params.effectScale,
        erosionSharpness: params.erosionSharpness,
        bloomIntensity: params.bloomIntensity,
        chromaticAberrationPx: params.chromaticAberration,
        hitstopDurationMs: params.hitstopMs,
        particleDensityMultiplier: params.particleMultiplier,
        architecture: 'Zero-Allocation LUT + Pre-baked Offscreen Sprite Cache + O(1) Swap-and-Pop',
      },
      spritesheetLayout: {
        columns: 4,
        rows: 4,
        totalFrames: 16,
        frameWidth: frameResolution,
        frameHeight: frameResolution,
        recommendedFps: 24,
      },
    },
    null,
    2
  );

  const handleDownloadPng = () => {
    if (!generatedSheetRef.current) return;
    const dataUrl = generatedSheetRef.current.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `vfx_${preset.id}_${palette.id}_16f.png`;
    a.click();
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-4xl rounded-xl bg-[#0C121E] border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-100 font-display tracking-tight">
              Exportar VFX — {preset.name}
            </h2>
            <p className="text-xs text-slate-400">
              {palette.name} · 16 Quadros PNG Transparente · Shader GLSL Otimizado
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-between px-6 py-2.5 bg-[#080C14] border-b border-slate-800/80">
          <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveTab('spritesheet')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'spritesheet'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Spritesheet PNG (16f)
            </button>
            <button
              onClick={() => setActiveTab('glsl')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'glsl'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Shader GLSL (Branchless)
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'json'
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              JSON
            </button>
          </div>

          {activeTab === 'spritesheet' && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
                <button
                  onClick={() => setFrameResolution(256)}
                  className={`px-2 py-1 text-xs font-mono-tabular rounded transition-colors whitespace-nowrap shrink-0 ${
                    frameResolution === 256
                      ? 'bg-slate-800 text-sky-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  1024px
                </button>
                <button
                  onClick={() => setFrameResolution(384)}
                  className={`px-2 py-1 text-xs font-mono-tabular rounded transition-colors whitespace-nowrap shrink-0 ${
                    frameResolution === 384
                      ? 'bg-slate-800 text-sky-400 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  1536px
                </button>
              </div>

              <button
                onClick={handleDownloadPng}
                className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar PNG
              </button>
            </div>
          )}
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'spritesheet' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-8 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Grade 4×4 Transparente</span>
                  <span className="font-mono-tabular">
                    {frameResolution * 4} × {frameResolution * 4} px
                  </span>
                </div>
                <div
                  className="relative rounded-lg border border-slate-800 overflow-hidden aspect-square flex items-center justify-center"
                  style={{
                    backgroundImage:
                      'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 0)',
                    backgroundSize: '16px 16px',
                    backgroundColor: '#060911',
                  }}
                >
                  <canvas
                    ref={sheetPreviewRef}
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              <div className="lg:col-span-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Preview 24 FPS</span>
                  <span className="font-mono-tabular text-sky-400">
                    Quadro {String(previewFrame + 1).padStart(2, '0')} / 16
                  </span>
                </div>

                <div
                  className="rounded-lg border border-slate-800 aspect-square flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundImage:
                      'radial-gradient(rgba(255,255,255,0.07) 1px, transparent 0)',
                    backgroundSize: '14px 14px',
                    backgroundColor: '#060911',
                  }}
                >
                  <canvas
                    ref={animPreviewRef}
                    width={256}
                    height={256}
                    className="w-full h-full object-contain"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPlayingPreview(!isPlayingPreview)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    {isPlayingPreview ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pausar
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Reproduzir
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsPlayingPreview(false);
                      setPreviewFrame((prev) => (prev + 1) % 16);
                    }}
                    className="py-2 px-3 text-xs font-medium bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition-colors whitespace-nowrap shrink-0"
                  >
                    +1 Quadro
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'glsl' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Shader Branchless Otimizado para GPU Mobile &amp; Desktop
                </p>
                <button
                  onClick={() => handleCopyCode(GLSL_SHADER_REFERENCE)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar GLSL
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-[#060911] border border-slate-800 text-xs font-mono-tabular text-slate-200 overflow-x-auto leading-relaxed">
                {GLSL_SHADER_REFERENCE}
              </pre>
            </div>
          )}

          {activeTab === 'json' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400">
                  Parâmetros serializados
                </p>
                <button
                  onClick={() => handleCopyCode(jsonConfig)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copiar JSON
                    </>
                  )}
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-[#060911] border border-slate-800 text-xs font-mono-tabular text-sky-300 overflow-x-auto leading-relaxed">
                {jsonConfig}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
