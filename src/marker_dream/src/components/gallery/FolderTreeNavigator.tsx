import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FolderTree,
} from 'lucide-react';
import { FolderTreeNode } from '../../types/map';

interface Props {
  tree: FolderTreeNode | null;
  selectedPath: string; // '' para raiz, 'Personagens', 'Personagens/Slimes', etc.
  onSelectPath: (path: string) => void;
  includeSubfolders: boolean;
  onToggleIncludeSubfolders: (val: boolean) => void;
}

export const FolderTreeNavigator: React.FC<Props> = ({
  tree,
  selectedPath,
  onSelectPath,
  includeSubfolders,
  onToggleIncludeSubfolders,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['']));

  if (!tree) return null;

  const toggleExpand = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const renderNode = (node: FolderTreeNode) => {
    const isSelected = selectedPath === node.path;
    const isExpanded = expandedPaths.has(node.path) || selectedPath.startsWith(node.path);
    const hasChildren = node.subfolders.length > 0;

    return (
      <div key={node.path || '__root__'} className="space-y-0.5 select-none">
        <div
          onClick={() => {
            onSelectPath(node.path);
            setIsOpen(false);
          }}
          className={`group flex items-center justify-between px-2 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
            isSelected
              ? 'bg-amber-500/20 text-amber-200 border border-amber-500/40 shadow-sm font-bold'
              : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
          }`}
          style={{ paddingLeft: `${node.level * 12 + 6}px` }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleExpand(node.path, e)}
                className="p-0.5 rounded hover:bg-slate-700/60 text-slate-400 hover:text-amber-300 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
              </button>
            ) : (
              <span className="w-3 h-3 inline-block" />
            )}

            {isSelected ? (
              <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Folder className="w-3.5 h-3.5 text-slate-400 group-hover:text-amber-300 shrink-0" />
            )}

            <span className="truncate">{node.name || 'Raiz'}</span>
          </div>

          <span
            className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
              isSelected
                ? 'bg-amber-500/30 text-amber-200 font-bold'
                : 'bg-slate-850 text-slate-500 group-hover:text-slate-300'
            }`}
          >
            {node.fileCount}
          </span>
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 border-l border-slate-800/60 ml-2.5">
            {node.subfolders.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  const currentFolderLabel = selectedPath
    ? selectedPath.split('/').pop() || selectedPath
    : `${tree.name || 'Raiz'} (Todas)`;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/80 overflow-hidden text-xs">
      {/* Barra compacta sempre visível */}
      <div className="p-1.5 px-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1.5 font-bold text-slate-200 hover:text-amber-300 transition-colors truncate cursor-pointer text-xs"
        >
          {selectedPath ? <FolderOpen className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <FolderTree className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
          <span className="truncate">
            Pasta: <strong className="text-white">{currentFolderLabel}</strong>
          </span>
          <ChevronDown className={`w-3 h-3 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="flex items-center gap-2 shrink-0">
          {selectedPath && (
            <button
              type="button"
              onClick={() => onSelectPath('')}
              className="text-[10px] text-amber-400 hover:underline font-mono"
              title="Voltar para Raiz"
            >
              Raiz
            </button>
          )}
          <label className="flex items-center gap-1 text-[10px] text-slate-400 font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={includeSubfolders}
              onChange={(e) => onToggleIncludeSubfolders(e.target.checked)}
              className="w-3 h-3 accent-amber-400 rounded cursor-pointer"
            />
            <span>Subpastas</span>
          </label>
        </div>
      </div>

      {/* Árvore expansível (retrátil) */}
      {isOpen && (
        <div className="p-2 pt-1 border-t border-slate-850/80 max-h-56 overflow-y-auto space-y-0.5 animate-fadeIn">
          {renderNode(tree)}
        </div>
      )}
    </div>
  );
};
