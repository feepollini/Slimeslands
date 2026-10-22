import React, { useState } from 'react';
import type { SavedLevel, MapProject } from '../../types/map';
import {
  Play,
  Edit3,
  Copy,
  Trash2,
  Download,
  Calendar,
  Layers,
  MapPin,
  User,
  Shield,
  Smartphone,
  Check,
  X,
} from 'lucide-react';
import { PhasePreviewCanvas } from './PhasePreviewCanvas';

interface Props {
  level: SavedLevel;
  isActive: boolean;
  onOpenInEditor: (level: SavedLevel) => void;
  onDuplicate: (level: SavedLevel) => void;
  onDelete: (levelId: string) => void;
  onRename?: (levelId: string, newName: string) => void;
  onExportJSON?: (level: SavedLevel) => void;
  onPlayInEmulator?: (level: SavedLevel) => void;
}

export const PhasePreviewCard: React.FC<Props> = ({
  level,
  isActive,
  onOpenInEditor,
  onDuplicate,
  onDelete,
  onRename,
  onExportJSON,
  onPlayInEmulator,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(level.name);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const proj = level.projectData || ({} as MapProject);
  const isExtended =
    proj.canvasKind === 'extended' ||
    ((proj.subBiomes || []).length > 0 && (!proj.biomes || proj.biomes.length === 0));

  const biomesCount = isExtended ? (proj.subBiomes || []).length : (proj.biomes || []).length;
  const markersCount = (proj.markers || []).length;
  const npcsCount = (proj.markers || []).filter((m) => m.type === 'npc').length;
  const collisionCellsCount = isExtended
    ? (proj.subBiomes || []).reduce((acc, sb) => acc + (sb.walkableCells?.length || 0) + (sb.blockedCells?.length || 0), 0)
    : (proj.walkableCells?.length || 0) + (proj.blockedCells?.length || 0);

  // Calcula largura e altura para badge
  let mapW = proj.mapWidth || 768;
  let mapH = 0;
  if (isExtended) {
    let maxH = 400;
    let sumW = 0;
    (proj.subBiomes || []).forEach((sb) => {
      sumW += (sb.tileWidth || 400) + 20;
      if ((sb.tileHeight || 400) > maxH) maxH = sb.tileHeight || 400;
    });
    mapW = Math.max(300, sumW);
    mapH = Math.max(300, maxH);
  } else {
    (proj.biomes || []).forEach((b) => {
      mapH += (b.tileHeight || 256) * (b.tileRepeatCount || 1);
    });
    if (mapH === 0) mapH = 1000;
  }

  const handleSaveRename = () => {
    if (tempName.trim() && tempName.trim() !== level.name) {
      onRename?.(level.id, tempName.trim());
    }
    setIsEditingName(false);
  };

  const formattedDate = (() => {
    try {
      const d = new Date(level.updatedAt || level.createdAt);
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recente';
    }
  })();

  return (
    <div
      className={`group relative rounded-xl border bg-zinc-950 overflow-hidden flex flex-col transition-all duration-200 ${
        isActive
          ? 'border-emerald-500 shadow-sm ring-1 ring-emerald-500/40'
          : 'border-zinc-850 hover:border-zinc-700'
      }`}
    >
      {/* 1. Área de Preview Visual */}
      <div
        className="relative aspect-[16/9] w-full bg-black overflow-hidden cursor-pointer"
        onClick={() => onOpenInEditor(level)}
      >
        <PhasePreviewCanvas
          projectData={proj}
          thumbnailPng={level.thumbnailPng}
          className="w-full h-full"
        />

        {/* Badges de Status sobre o Preview */}
        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10 pointer-events-none">
          {isActive && (
            <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-bold text-[10px] tracking-wide flex items-center gap-1 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-black" />
              <span>Ativa</span>
            </span>
          )}

          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border shadow-xs flex items-center gap-1 ${
              isExtended
                ? 'bg-zinc-900 border-zinc-750 text-zinc-300'
                : 'bg-blue-950/90 border-blue-700 text-blue-300'
            }`}
          >
            {isExtended ? <Layers className="w-3 h-3 text-zinc-400" /> : <Smartphone className="w-3 h-3 text-blue-400" />}
            <span>{isExtended ? 'Fixo Extended' : 'Vertical'}</span>
          </span>
        </div>

        {/* Resolução no canto superior direito */}
        <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
          <span className="px-2 py-0.5 rounded bg-black/85 text-zinc-300 text-[10px] font-mono border border-zinc-800">
            {mapW}x{mapH} px
          </span>
        </div>

        {/* Overlay hover para jogar ou abrir no editor */}
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2.5">
          {onPlayInEmulator && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onPlayInEmulator(level);
              }}
              className="px-3.5 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-transform hover:scale-105 cursor-pointer shadow-lg flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Jogar Fase</span>
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenInEditor(level);
            }}
            className="px-3.5 py-1.5 rounded-md bg-white text-black font-semibold text-xs transition-transform hover:scale-105 cursor-pointer shadow-lg flex items-center gap-1.5"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Abrir no Editor</span>
          </button>
        </div>
      </div>

      {/* 2. Informações e Cabeçalho do Card */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
        <div>
          {/* Título & Renomeação */}
          <div className="flex items-center justify-between gap-2">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename();
                    if (e.key === 'Escape') setIsEditingName(false);
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-xs text-white focus:outline-none focus:border-white font-semibold"
                />
                <button
                  type="button"
                  onClick={handleSaveRename}
                  className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer"
                  title="Salvar"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingName(false)}
                  className="p-1 rounded bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                  title="Cancelar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 min-w-0 group/title">
                <h3
                  onClick={() => onOpenInEditor(level)}
                  className="text-sm font-semibold text-white truncate cursor-pointer hover:text-orange-400 transition-colors"
                  title={level.name}
                >
                  {level.name}
                </h3>
                {onRename && (
                  <button
                    type="button"
                    onClick={() => {
                      setTempName(level.name);
                      setIsEditingName(true);
                    }}
                    className="opacity-0 group-hover/title:opacity-100 p-0.5 text-zinc-500 hover:text-white transition-opacity cursor-pointer"
                    title="Renomear fase"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}

            <div className="flex items-center gap-1 text-[10px] text-zinc-500 font-mono shrink-0">
              <Calendar className="w-3 h-3 text-zinc-500" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Descrição */}
          <p className="text-[11px] text-zinc-400 mt-1 line-clamp-1" title={level.description || 'Fase sem descrição'}>
            {level.description || 'Fase configurada no Marker Dream'}
          </p>
        </div>

        {/* 3. Métricas Técnicas em P&B com Acentos sutis */}
        <div className="grid grid-cols-4 gap-1.5 py-2 px-2.5 rounded-lg bg-zinc-900 border border-zinc-850 text-center">
          <div className="flex flex-col items-center">
            <span className="text-[9px] uppercase font-mono text-zinc-500">Biomas</span>
            <span className="text-xs font-semibold text-zinc-200 mt-0.5">{biomesCount}</span>
          </div>

          <div className="flex flex-col items-center border-l border-zinc-800">
            <span className="text-[9px] uppercase font-mono text-zinc-500">Marcadores</span>
            <span className="text-xs font-semibold text-orange-400 mt-0.5">{markersCount}</span>
          </div>

          <div className="flex flex-col items-center border-l border-zinc-800">
            <span className="text-[9px] uppercase font-mono text-zinc-500">NPCs</span>
            <span className="text-xs font-semibold text-emerald-400 mt-0.5">{npcsCount}</span>
          </div>

          <div className="flex flex-col items-center border-l border-zinc-800">
            <span className="text-[9px] uppercase font-mono text-zinc-500">Colisão</span>
            <span className="text-xs font-semibold text-blue-400 mt-0.5">{collisionCellsCount}</span>
          </div>
        </div>

        {/* 4. Barra de Ações Rápidas */}
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 gap-2">
          {/* Ações Secundárias */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onDuplicate(level)}
              className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Duplicar fase"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>

            {onExportJSON && (
              <button
                type="button"
                onClick={() => onExportJSON(level)}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Exportar backup JSON"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}

            {isConfirmingDelete ? (
              <div className="flex items-center gap-1 bg-red-950/80 border border-red-800 px-1.5 py-0.5 rounded">
                <span className="text-[10px] text-red-300 font-semibold">Excluir?</span>
                <button
                  type="button"
                  onClick={() => onDelete(level.id)}
                  className="px-1.5 py-0.5 rounded bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold cursor-pointer"
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[10px] cursor-pointer"
                >
                  Não
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                title="Excluir fase"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botões de Ação Primária: PLAY + EDITOR lado a lado */}
          <div className="flex items-center gap-1.5">
            {onPlayInEmulator && (
              <button
                type="button"
                onClick={() => onPlayInEmulator(level)}
                className="px-3 py-1.5 rounded-md bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
                title="Jogar esta fase no Modo Play (sem o editor em primeiro plano)"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenInEditor(level)}
              className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-xs font-semibold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Abrir fase no Editor"
            >
              <Edit3 className="w-3 h-3 text-orange-400" />
              <span>Editor</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
