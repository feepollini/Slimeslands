import React from 'react';
import {
  Brush,
  Lasso,
  Sliders,
  Sparkles,
  Scissors,
  Info,
  Eraser,
  Copy,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Check,
  X,
} from 'lucide-react';

export type BrushMode = 'brush' | 'lasso' | 'erase_strokes' | 'erase_png' | 'sponge';
export type ExtractionAction = 'copy' | 'cut' | 'cut_repair';

interface Props {
  brushMode: BrushMode;
  onBrushModeChange: (mode: BrushMode) => void;
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  smoothLevel: number;
  onSmoothLevelChange: (level: number) => void;
  extractionAction?: ExtractionAction;
  onExtractionActionChange?: (action: ExtractionAction) => void;
  autoExtract?: boolean;
  onAutoExtractChange?: (auto: boolean) => void;
  hasPendingPoints?: boolean;
  onConfirmPendingExtraction?: () => void;
  onCancelPendingPoints?: () => void;
  onClearStrokes?: () => void;
}

export const MotionBrushStudio: React.FC<Props> = ({
  brushMode,
  onBrushModeChange,
  brushSize,
  onBrushSizeChange,
  smoothLevel,
  onSmoothLevelChange,
  extractionAction = 'copy',
  onExtractionActionChange,
  autoExtract = true,
  onAutoExtractChange,
  hasPendingPoints = false,
  onConfirmPendingExtraction,
  onCancelPendingPoints,
  onClearStrokes,
}) => {
  return (
    <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl space-y-3.5 text-slate-200">
      {/* 1. SELETOR DE FERRAMENTA (Pincel, Laço, Borracha Traço, Borracha PNG) */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-fuchsia-300 mb-2">
          <span className="flex items-center gap-1.5">
            <Scissors className="w-4 h-4 text-fuchsia-400" />
            <span>Ferramentas de Traço & Recorte</span>
          </span>
          <span className="text-[10px] font-mono text-fuchsia-400/90 uppercase px-1.5 py-0.5 rounded bg-fuchsia-950/60 border border-fuchsia-500/30">
            {brushMode === 'brush'
              ? 'Pincel Livre'
              : brushMode === 'lasso'
              ? 'Laço Poligonal'
              : brushMode === 'sponge'
              ? '🧽 Esponja Reparo'
              : brushMode === 'erase_strokes'
              ? 'Borracha Traços'
              : 'Borracha PNG'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={() => onBrushModeChange('brush')}
            className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              brushMode === 'brush'
                ? 'bg-fuchsia-600 text-white border-fuchsia-400 shadow-md shadow-fuchsia-950/40'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Pincel de Traço Livre: pinte diretamente para definir a área de recorte"
          >
            <Brush className="w-4 h-4 text-fuchsia-200" />
            <span>Pincel</span>
          </button>

          <button
            type="button"
            onClick={() => onBrushModeChange('lasso')}
            className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              brushMode === 'lasso'
                ? 'bg-pink-600 text-white border-pink-400 shadow-md shadow-pink-950/40'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Laço de Seleção: contorne uma forma fechada para recortar"
          >
            <Lasso className="w-4 h-4 text-pink-200" />
            <span>Laço</span>
          </button>

          <button
            type="button"
            onClick={() => onBrushModeChange('sponge')}
            className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              brushMode === 'sponge'
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/40'
                : 'bg-slate-950 border-slate-800 text-emerald-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Esponja / Pincel de Reparo (Photoshop Healing): pinte para cicatrizar e preencher a área com textura ao redor"
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>🧽 Esponja</span>
          </button>

          <button
            type="button"
            onClick={() => onBrushModeChange('erase_strokes')}
            className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              brushMode === 'erase_strokes'
                ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-950/40'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Borracha para apagar traços desenhados no canvas (Pen Motion)"
          >
            <Eraser className="w-4 h-4 text-amber-200" />
            <span>Borracha Traço</span>
          </button>

          <button
            type="button"
            onClick={() => onBrushModeChange('erase_png')}
            className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              brushMode === 'erase_png'
                ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-950/40'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
            title="Borracha para esculpir transparência na imagem PNG da camada"
          >
            <ImageIcon className="w-4 h-4 text-rose-200" />
            <span>Borracha PNG</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. MENU DEDICADO DA ESPONJA DE REPARO */}
      {/* ========================================================= */}
      {brushMode === 'sponge' && (
        <div className="space-y-3 p-3 bg-slate-950/80 rounded-2xl border border-emerald-500/40 shadow-inner">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>🧽 Esponja / Pincel de Reparo</span>
            </span>
            <span className="text-[10px] text-emerald-400/80 font-mono">Spot Healing</span>
          </div>

          <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                <span>Raio da Esponja</span>
              </span>
              <span className="font-mono text-emerald-300 font-bold">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="6"
              max="120"
              step="2"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[12, 24, 42, 68].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onBrushSizeChange(sz)}
                  className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    brushSize === sz
                      ? 'bg-emerald-500/30 border-emerald-400 text-emerald-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed bg-emerald-950/20 p-2 rounded-xl border border-emerald-500/20">
            💡 <b>Como funciona:</b> Pinte sobre manchas, furos ou bordas indesejadas na imagem. O algoritmo analisa os pixels adjacentes e preenche com a cor e textura ao redor, idêntico ao Photoshop.
          </p>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. MENU DEDICADO DO PINCEL (LÁPIS) */}
      {/* ========================================================= */}
      {brushMode === 'brush' && (
        <div className="space-y-3 p-3 bg-slate-950/80 rounded-2xl border border-fuchsia-500/30">
          <div className="flex items-center justify-between text-xs font-bold text-fuchsia-300">
            <span className="flex items-center gap-1.5">
              <Brush className="w-4 h-4 text-fuchsia-400" />
              <span>Menu do Pincel</span>
            </span>
            <span className="text-[10px] text-slate-400">Traço Livre</span>
          </div>

          {/* Tamanho do Pincel + Presets */}
          <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>Espessura do Traço</span>
              </span>
              <span className="font-mono text-fuchsia-300 font-bold">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="4"
              max="100"
              step="2"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full accent-fuchsia-500 cursor-pointer"
            />
            <div className="grid grid-cols-4 gap-1 pt-1">
              {[8, 20, 36, 64].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onBrushSizeChange(sz)}
                  className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    brushSize === sz
                      ? 'bg-fuchsia-500/30 border-fuchsia-400 text-fuchsia-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          {/* Suavização de Traço (Smooth / Feather) */}
          <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Suavizar Curva</span>
              </span>
              <span className="font-mono text-sky-300 font-bold">
                {smoothLevel === 0 ? 'Preciso (0)' : `Nível ${smoothLevel}`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={smoothLevel}
              onChange={(e) => onSmoothLevelChange(Number(e.target.value))}
              className="w-full accent-sky-500 cursor-pointer"
            />
          </div>

          {/* CHAVE DE MODO: COPY vs CUT vs CUT_REPAIR */}
          <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Modo de Geração da Camada:</span>
              <span className="font-mono text-[10px] text-fuchsia-400 uppercase font-bold">
                {extractionAction === 'cut_repair'
                  ? '🩹 Reparar & Preencher'
                  : extractionAction === 'cut'
                  ? '✂️ Cut (Arrancar)'
                  : '📋 Copy (Clonar)'}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => onExtractionActionChange?.('copy')}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  extractionAction === 'copy'
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Copia o pedaço em uma nova camada mantendo o corpo original intacto"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>📋 Copiar</span>
              </button>

              <button
                type="button"
                onClick={() => onExtractionActionChange?.('cut')}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  extractionAction === 'cut'
                    ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Recorta e apaga o pedaço da imagem original deixando transparência no lugar"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>✂️ Recortar</span>
              </button>

              <button
                type="button"
                onClick={() => onExtractionActionChange?.('cut_repair')}
                className={`py-2 px-1.5 rounded-lg text-[11px] font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                  extractionAction === 'cut_repair'
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-950/40'
                    : 'text-emerald-400 hover:text-emerald-200'
                }`}
                title="Recorta a peça para cima e preenche o buraco na imagem pai com inpainting inteligente (Photoshop Healing)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>🩹 Reparar</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
              {extractionAction === 'cut_repair'
                ? '🩹 Cria a peça em nova camada no topo e cicatriza o buraco na camada pai preenchendo com a textura ao redor.'
                : extractionAction === 'cut'
                ? '✂️ O pedaço vira uma nova camada e é apagado com transparência da arte original.'
                : '📋 O pedaço é duplicado em uma nova camada sem alterar o corpo original.'}
            </p>
          </div>

          {/* CHAVE AUTO EXTRACT (ON / OFF) */}
          <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                {autoExtract ? <Zap className="w-3.5 h-3.5 text-amber-400" /> : <ZapOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>Auto Extrair ao Soltar</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {autoExtract ? 'Gera a camada automaticamente' : 'Mantém traço para confirmação'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAutoExtractChange?.(!autoExtract)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                autoExtract
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {autoExtract ? 'LIGADO (ON)' : 'DESLIGADO (OFF)'}
            </button>
          </div>

          {/* Se autoExtract estiver OFF e houver traço desenhado */}
          {hasPendingPoints && !autoExtract && (
            <div className="p-2.5 bg-fuchsia-950/50 border border-fuchsia-400 rounded-xl space-y-2 animate-pulse">
              <div className="text-xs font-bold text-fuchsia-200 flex items-center justify-between">
                <span>Traço pronto para extração!</span>
                <span className="text-[10px] uppercase font-mono">{extractionAction}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onConfirmPendingExtraction}
                  className="flex-1 py-2 px-3 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{extractionAction === 'cut' ? '✂️ Recortar Agora (Cut)' : '📋 Copiar Agora (Copy)'}</span>
                </button>
                <button
                  type="button"
                  onClick={onCancelPendingPoints}
                  className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer border border-slate-800"
                  title="Cancelar seleção"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. MENU DEDICADO DO LAÇO (SELEÇÃO POLIGONAL) */}
      {/* ========================================================= */}
      {brushMode === 'lasso' && (
        <div className="space-y-3 p-3 bg-slate-950/80 rounded-2xl border border-pink-500/30">
          <div className="flex items-center justify-between text-xs font-bold text-pink-300">
            <span className="flex items-center gap-1.5">
              <Lasso className="w-4 h-4 text-pink-400" />
              <span>Menu do Laço de Seleção</span>
            </span>
            <span className="text-[10px] text-slate-400">Contorno Fechado</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            🎯 <strong>Como usar:</strong> Desenhe contornando a parte desejada (ex: braço, capa, arma). Ao soltar, o laço fecha unindo a ponta final com a inicial.
          </p>

          {/* Suavização de Curva do Laço */}
          <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Arredondamento do Contorno</span>
              </span>
              <span className="font-mono text-pink-300 font-bold">
                {smoothLevel === 0 ? 'Fiel (0)' : `Suavizado (${smoothLevel})`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={smoothLevel}
              onChange={(e) => onSmoothLevelChange(Number(e.target.value))}
              className="w-full accent-pink-500 cursor-pointer"
            />
          </div>

          {/* CHAVE DE MODO: COPY vs CUT */}
          <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Ação ao Fechar Laço:</span>
              <span className="font-mono text-[10px] text-pink-400 uppercase font-bold">
                {extractionAction === 'cut' ? '✂️ Cut (Arrancar)' : '📋 Copy (Clonar)'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => onExtractionActionChange?.('copy')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  extractionAction === 'copy'
                    ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Clona a área laçada para uma nova camada mantendo o corpo original intacto"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>📋 Copiar (Copy)</span>
              </button>

              <button
                type="button"
                onClick={() => onExtractionActionChange?.('cut')}
                className={`py-2 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  extractionAction === 'cut'
                    ? 'bg-rose-500 text-white font-black shadow-md shadow-rose-950/40'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Arranca a área laçada da arte original com transparência e cria a nova camada"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>✂️ Recortar (Cut)</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed pt-0.5">
              {extractionAction === 'cut'
                ? '✂️ A área laçada é arrancada do corpo deixando um vazio transparente.'
                : '📋 A área laçada é copiada sem alterar o corpo base original.'}
            </p>
          </div>

          {/* CHAVE AUTO EXTRACT LAÇO (ON / OFF) */}
          <div className="flex items-center justify-between p-2.5 bg-slate-900 rounded-xl border border-slate-800">
            <div>
              <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                {autoExtract ? <Zap className="w-3.5 h-3.5 text-pink-400" /> : <ZapOff className="w-3.5 h-3.5 text-slate-500" />}
                <span>Auto Extrair Laço</span>
              </div>
              <div className="text-[10px] text-slate-400">
                {autoExtract ? 'Gera a peça assim que fecha o laço' : 'Exibe contorno para confirmação'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAutoExtractChange?.(!autoExtract)}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer border ${
                autoExtract
                  ? 'bg-pink-500/25 border-pink-400 text-pink-300'
                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              {autoExtract ? 'LIGADO (ON)' : 'DESLIGADO (OFF)'}
            </button>
          </div>

          {/* Se autoExtract estiver OFF e houver laço desenhado */}
          {hasPendingPoints && !autoExtract && (
            <div className="p-2.5 bg-pink-950/50 border border-pink-400 rounded-xl space-y-2 animate-pulse">
              <div className="text-xs font-bold text-pink-200 flex items-center justify-between">
                <span>Laço fechado pronto para extrair!</span>
                <span className="text-[10px] uppercase font-mono">{extractionAction}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onConfirmPendingExtraction}
                  className="flex-1 py-2 px-3 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{extractionAction === 'cut' ? '✂️ Recortar Laço (Cut)' : '📋 Copiar Laço (Copy)'}</span>
                </button>
                <button
                  type="button"
                  onClick={onCancelPendingPoints}
                  className="py-2 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-bold cursor-pointer border border-slate-800"
                  title="Cancelar seleção"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. MENU DA BORRACHA DE TRAÇOS (PEN MOTION) */}
      {/* ========================================================= */}
      {brushMode === 'erase_strokes' && (
        <div className="space-y-3 p-3 bg-slate-950/80 rounded-2xl border border-amber-500/30">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span className="flex items-center gap-1.5">
              <Eraser className="w-4 h-4 text-amber-400" />
              <span>Borracha de Traços (Pen Motion)</span>
            </span>
            <span className="text-[10px] text-slate-400">Apagar Linhas</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            🧹 Apaga traços e linhas desenhados livremente sobre o canvas na camada ativa.
          </p>

          <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Diâmetro da Borracha</span>
              <span className="font-mono text-amber-300 font-bold">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="8"
              max="90"
              step="2"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          {onClearStrokes && (
            <button
              type="button"
              onClick={onClearStrokes}
              className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 border border-slate-800 transition-colors cursor-pointer"
            >
              <Eraser className="w-3.5 h-3.5 text-rose-400" />
              <span>Limpar Todos os Traços da Camada</span>
            </button>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* 5. MENU DA BORRACHA DE PIXELS PNG (TRANSPARÊNCIA) */}
      {/* ========================================================= */}
      {brushMode === 'erase_png' && (
        <div className="space-y-3 p-3 bg-slate-950/80 rounded-2xl border border-rose-500/30">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-rose-400" />
              <span>Borracha de Pixels PNG</span>
            </span>
            <span className="text-[10px] text-slate-400">Transparência Alfa</span>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            🧽 Apaga pixels com canal alfa transparente diretamente na imagem PNG da camada selecionada. Perfeito para esculpir detalhes e limpar contornos.
          </p>

          <div className="space-y-1.5 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Tamanho da Ponta de Apagamento</span>
              <span className="font-mono text-rose-300 font-bold">{brushSize}px</span>
            </div>
            <input
              type="range"
              min="4"
              max="90"
              step="2"
              value={brushSize}
              onChange={(e) => onBrushSizeChange(Number(e.target.value))}
              className="w-full accent-rose-500 cursor-pointer"
            />
            <div className="grid grid-cols-3 gap-1 pt-1">
              {[8, 24, 48].map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => onBrushSizeChange(sz)}
                  className={`py-1 text-[10px] font-bold rounded-lg border transition-all cursor-pointer ${
                    brushSize === sz
                      ? 'bg-rose-500/30 border-rose-400 text-rose-200'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
