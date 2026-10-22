import React from 'react';
import {
  Upload,
  ZoomIn,
  ZoomOut,
  Grid,
  RotateCcw,
  RotateCw,
} from 'lucide-react';

interface Props {
  onImportPNG: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  gridType: 'squares' | 'hex' | 'none';
  onCycleGrid: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
}

export const Toolbar: React.FC<Props> = ({
  onImportPNG,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  gridType,
  onCycleGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-black border-b border-zinc-850 text-xs text-zinc-300 select-none">
      {/* Import & History */}
      <div className="flex items-center gap-2">
        {/* Import PNG Button */}
        <button
          onClick={onImportPNG}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-200 hover:text-white font-medium transition-colors cursor-pointer"
          title="Importar imagem PNG"
        >
          <Upload className="w-3.5 h-3.5 text-zinc-400" />
          <span>Importar PNG</span>
        </button>

        {/* Undo / Redo */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`p-1.5 rounded transition-colors ${
              canUndo
                ? 'hover:bg-zinc-850 text-zinc-300 hover:text-white cursor-pointer'
                : 'text-zinc-600 cursor-not-allowed opacity-40'
            }`}
            title="Desfazer (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className={`p-1.5 rounded transition-colors ${
              canRedo
                ? 'hover:bg-zinc-850 text-zinc-300 hover:text-white cursor-pointer'
                : 'text-zinc-600 cursor-not-allowed opacity-40'
            }`}
            title="Refazer (Ctrl+Shift+Z ou Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* View Options & Zoom */}
      <div className="flex items-center gap-2">
        {/* Grid Toggle */}
        <button
          onClick={onCycleGrid}
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            gridType !== 'none'
              ? 'bg-zinc-850 border-zinc-700 text-white'
              : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
          }`}
          title={`Grade: ${gridType === 'squares' ? 'Quadrada' : gridType === 'hex' ? 'Hexagonal' : 'Desativada'}`}
        >
          <Grid className="w-3.5 h-3.5" />
        </button>

        {/* Zoom Controls */}
        <div className="flex items-center bg-zinc-950 border border-zinc-800 rounded-md p-0.5 font-mono">
          <button
            onClick={onZoomOut}
            className="p-1 hover:text-white text-zinc-400 cursor-pointer"
            title="Diminuir Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            className="px-1.5 text-[11px] text-zinc-300 hover:text-white cursor-pointer"
            title="Redefinir Zoom 100%"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={onZoomIn}
            className="p-1 hover:text-white text-zinc-400 cursor-pointer"
            title="Aumentar Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
