import React, { useRef } from 'react';
import {
  Film,
  FolderOpen,
  Upload,
  Sparkles,
  X,
  ArrowRight,
  RotateCw,
  Image as ImageIcon,
  Check,
  Layers,
} from 'lucide-react';
import { MapMarker } from '../../types/map';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  candidateMarker: MapMarker | null;
  onConfirmMarker: (marker: MapMarker) => void;
  onOpenGallery: () => void;
  onImportLocalPng: (file: File) => void;
  onStartFromScratch: () => void;
  phaseMarkers?: MapMarker[];
  onSelectOtherMarker?: (marker: MapMarker) => void;
}

export const MotionCanvasStartupModal: React.FC<Props> = ({
  isOpen,
  onClose,
  candidateMarker,
  onConfirmMarker,
  onOpenGallery,
  onImportLocalPng,
  onStartFromScratch,
  phaseMarkers = [],
  onSelectOtherMarker,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const hasMotion =
    candidateMarker?.motionAsset === true ||
    (candidateMarker?.motionLayers && candidateMarker.motionLayers.length > 0);

  const markerPng =
    candidateMarker?.customIconPng || candidateMarker?.bannerImagePng || null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportLocalPng(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-fade-in">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-white/10 max-h-[90vh]">
        {/* Hidden File Input for Direct Local PNG Import */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/webp,image/jpeg"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Top Header */}
        <div className="px-6 py-4 bg-black border-b border-zinc-800/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-amber-400 shadow-sm">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Motion Canvas Hub
                </span>
                {hasMotion && (
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold px-2 py-0.5 rounded bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Reedição de Motion
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                {candidateMarker
                  ? hasMotion
                    ? 'Asset com Motion Selecionado'
                    : 'Objeto PNG Selecionado no Canvas'
                  : 'Inicialização do Motion Canvas'}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            title="Fechar e Voltar ao Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-5 scrollbar-thin">
          {/* SEÇÃO 1: OBJETO SELECIONADO NO EDITOR (SE HOUVER) */}
          {candidateMarker ? (
            <div className="p-4 rounded-2xl bg-zinc-900/90 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-zinc-300">Objeto Selecionado no Canvas:</span>
                <span className="font-mono text-[10px] text-amber-400">
                  ID: {candidateMarker.id}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/60 p-3 rounded-xl border border-zinc-800/80">
                {/* Thumbnail Preview */}
                <div className="w-20 h-20 bg-zinc-900 rounded-xl border border-zinc-800 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                  {markerPng ? (
                    <img
                      src={markerPng}
                      alt={candidateMarker.name}
                      className="w-full h-full object-contain filter drop-shadow-md"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-zinc-600" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <h3 className="text-sm font-bold text-white truncate">
                    {candidateMarker.name || 'Objeto do Mapa'}
                  </h3>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 mt-1">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Tipo: {candidateMarker.type || 'objeto'}
                    </span>
                    {hasMotion ? (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-sky-400" />
                        <span>{candidateMarker.motionLayers?.length || 1} camadas prontas</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                        Asset Estático PNG
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
                    {hasMotion
                      ? 'Este asset já possui movimento configurado. Deseja abrir suas camadas existentes para reeditar a animação?'
                      : 'Deseja utilizar a imagem PNG deste objeto como camada base e criar novos recortes/animações nele?'}
                  </p>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => onConfirmMarker(candidateMarker)}
                  className={`w-full sm:w-auto px-4 py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shrink-0 ${
                    hasMotion
                      ? 'bg-sky-500 hover:bg-sky-400 text-black shadow-sky-500/20 active:scale-95'
                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 active:scale-95'
                  }`}
                >
                  {hasMotion ? (
                    <>
                      <RotateCw className="w-4 h-4 font-bold" />
                      <span>Confirmar & Reeditar</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 font-bold" />
                      <span>Animar este Objeto</span>
                    </>
                  )}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <div className="h-px bg-zinc-800 flex-1" />
                <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                  Ou Escolha uma Opção Abaixo
                </span>
                <div className="h-px bg-zinc-800 flex-1" />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 text-center">
              <p className="text-xs text-zinc-400">
                Nenhum objeto estava selecionado no canvas principal. Escolha uma das opções abaixo para começar:
              </p>
            </div>
          )}

          {/* SEÇÃO 2: OPÇÕES UNIVERSAIS (GALERIA, IMPORTAR PNG, CRIAR DO ZERO) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Opção A: Galeria */}
            <div
              onClick={onOpenGallery}
              className="p-4 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                    🏛️ Escolher da Galeria
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Navegue pelos acervos da fase atual, compartilhados de outras fases ou composições Motion prontas para reedição.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 group-hover:bg-amber-500 group-hover:text-black text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Navegar no Acervo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Opção B: Importar PNG do PC */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                    📥 Importar PNG do PC
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Carregue qualquer arquivo PNG, WebP ou JPG do seu computador para iniciar a animação com liberdade total.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 group-hover:bg-emerald-500 group-hover:text-black text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Selecionar Arquivo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Opção C: Criar em Branco / do Zero */}
            <div
              onClick={onStartFromScratch}
              className="p-4 rounded-2xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-purple-500/50 transition-all cursor-pointer group flex flex-col justify-between space-y-3"
            >
              <div className="space-y-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors">
                    ✏️ Criar Livre do Zero
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                    Abra uma tela limpa e desenhe, recorte ou adicione peças soltas sem nenhum marcador inicial atrelado.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="w-full py-2 px-3 rounded-lg bg-zinc-800 group-hover:bg-purple-500 group-hover:text-black text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
              >
                <span>Criar em Branco</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* SEÇÃO 3: MARCADORES DA FASE ATUAL (SE HOUVER MAIS DE UM) */}
          {phaseMarkers.length > 0 && (
            <div className="pt-2 border-t border-zinc-800/80">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block mb-2 font-bold">
                Ou selecione um marcador da fase atual:
              </span>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {phaseMarkers.slice(0, 8).map((m) => {
                  const isCur = candidateMarker?.id === m.id;
                  const isMotion = m.motionAsset || (m.motionLayers && m.motionLayers.length > 0);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => onSelectOtherMarker?.(m)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer ${
                        isCur
                          ? 'bg-amber-500 text-black font-bold shadow-sm'
                          : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
                      }`}
                    >
                      {m.customIconPng && (
                        <img
                          src={m.customIconPng}
                          alt=""
                          className="w-4 h-4 object-contain rounded-xs"
                        />
                      )}
                      <span className="truncate max-w-[120px]">{m.name || 'Marcador'}</span>
                      {isMotion && (
                        <span className="text-[9px] font-mono font-bold text-sky-400">⚡</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-black border-t border-zinc-800/80 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-zinc-500">
            💡 Dica: Você pode trocar de asset a qualquer instante usando o botão "Trocar Asset" no estúdio.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Voltar ao Editor
          </button>
        </div>
      </div>
    </div>
  );
};
