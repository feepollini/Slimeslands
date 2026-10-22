import React from 'react';
import { MapProject, SubBiomeConfig, LimitsBrushMode } from '../types/map';
import { COLLISION_CELL } from '../utils/mapMath';
import { Paintbrush, Eraser, ShieldAlert, Trash2, Map, Ban, Footprints, ShieldCheck } from 'lucide-react';

interface Props {
  project: MapProject;
  subBiomes: SubBiomeConfig[];
  onUpdateSubBiome: (id: string, updates: Partial<SubBiomeConfig>) => void;
  limitsBrushMode: LimitsBrushMode;
  onUpdateLimitsBrushMode: (mode: LimitsBrushMode) => void;
  limitsBrushSize: number;
  onUpdateLimitsBrushSize: (size: number) => void;
  mirrorLimits: boolean;
  onUpdateMirrorLimits: (v: boolean) => void;
  canvasKind: 'vertical' | 'extended';
  onUpdateProject: (updates: Partial<MapProject>) => void;
  onSwitchToEditorTab: () => void;
}

export const LimitsStudio: React.FC<Props> = ({
  project,
  subBiomes,
  onUpdateSubBiome,
  limitsBrushMode,
  onUpdateLimitsBrushMode,
  limitsBrushSize,
  onUpdateLimitsBrushSize,
  mirrorLimits,
  onUpdateMirrorLimits,
  canvasKind,
  onUpdateProject,
  onSwitchToEditorTab,
}) => {
  const walkableCount = (project.walkableCells || []).length;
  const blockedCount = (project.blockedCells || []).length;
  const isRestricted = project.restrictPlayerToPaintedAreas || false;

  const handleClearBlocked = () => {
    if (window.confirm('Apagar todas as paredes/barreiras de colisão (vermelhas)?')) {
      onUpdateProject({ blockedCells: [] });
    }
  };

  const handleClearWalkable = () => {
    if (window.confirm('Apagar todas as áreas de circulação (verdes)?')) {
      onUpdateProject({ walkableCells: [] });
    }
  };

  const handleClearAllVertical = () => {
    if (window.confirm('Apagar TODA a pintura de limites (paredes + caminhos) deste mapa?')) {
      onUpdateProject({ walkableCells: [], blockedCells: [] });
    }
  };

  const handleFillAllWalkable = () => {
    const CELL_SIZE = COLLISION_CELL;
    const totalW = project.mapWidth || 768;
    const totalH = 2000;
    const cols = Math.ceil(totalW / CELL_SIZE);
    const rows = Math.ceil(totalH / CELL_SIZE);
    const allCells: string[] = [];
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        allCells.push(`${c},${r}`);
      }
    }
    onUpdateProject({ walkableCells: allCells });
  };

  const handleClearEverything = () => {
    const total =
      walkableCount +
      blockedCount +
      subBiomes.reduce(
        (a, sb) => a + (sb.walkableCells || []).length + (sb.blockedCells || []).length,
        0
      );
    if (total === 0) return;
    if (
      window.confirm(
        `Apagar TODA a pintura de colisão e circulação (${total} células no vertical + fases)? O herói volta a andar totalmente livre.`
      )
    ) {
      onUpdateProject({ walkableCells: [], blockedCells: [] });
      subBiomes.forEach((sb) => {
        if ((sb.walkableCells || []).length > 0 || (sb.blockedCells || []).length > 0) {
          onUpdateSubBiome(sb.id, { walkableCells: [], blockedCells: [] });
        }
      });
    }
  };

  const isVertical = canvasKind === 'vertical';

  return (
    <div className="space-y-4">
      {/* Box Explicativo com Destaque para o Modo Colisão / Barreiras */}
      <div className="p-3 bg-gradient-to-r from-red-500/10 via-amber-500/10 to-emerald-500/10 border border-red-500/30 rounded-xl space-y-2">
        <div className="flex items-center gap-2">
          <Ban className="w-4 h-4 text-red-400" />
          <span className="text-xs font-bold text-red-300">Modo Colisão & Circulação</span>
        </div>
        <p className="text-[11px] text-slate-300 leading-relaxed">
          Você pode escolher entre <strong>🛑 Paredes & Colisão</strong> (onde o herói bate e não passa) ou <strong>🟢 Circulação</strong> (caminho restrito onde só se pode andar nele).
        </p>
        <button
          onClick={onSwitchToEditorTab}
          className="w-full py-1.5 px-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Map className="w-3.5 h-3.5" />
          <span>Ir para o Mapa Interativo para Pintar 🎨</span>
        </button>
        <button
          onClick={handleClearEverything}
          className="w-full py-1.5 px-3 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>🧹 Apagar TODA a colisão e pintura</span>
        </button>
      </div>

      {/* Configurações do Pincel */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-md">
        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide block">
          Modo do Pincel
        </span>

        {/* 3 Modos: Colisão (Vermelho) | Circulação (Verde) | Borracha */}
        <div className="grid grid-cols-1 gap-2">
          {/* 1. Modo Colisão Sólida */}
          <button
            onClick={() => onUpdateLimitsBrushMode('block')}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
              limitsBrushMode === 'block'
                ? 'bg-rose-500/20 border-rose-400 text-rose-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
              limitsBrushMode === 'block' ? 'bg-rose-500 text-white' : 'bg-slate-800 text-rose-400'
            }`}>
              <Ban className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-rose-300">🛑 Paredes & Colisão</span>
                <span className="text-[9px] px-1.5 py-0.2 bg-rose-500/30 text-rose-200 rounded font-semibold uppercase">Recomendado</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-snug">
                Pinte árvores, pedras e paredes sólidas em <strong>vermelho</strong>. O mapa fica livre e o herói colide nelas!
              </p>
            </div>
          </button>

          {/* 2. Modo Circulação */}
          <button
            onClick={() => onUpdateLimitsBrushMode('paint')}
            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-left transition-all ${
              limitsBrushMode === 'paint'
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
              limitsBrushMode === 'paint' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-emerald-400'
            }`}>
              <Footprints className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-emerald-300">🟢 Área de Circulação</span>
              <p className="text-[10px] text-slate-400 leading-snug">
                Pinte os caminhos permitidos em <strong>verde</strong>. O herói só poderá andar sobre as áreas pintadas.
              </p>
            </div>
          </button>

          {/* 3. Borracha */}
          <button
            onClick={() => onUpdateLimitsBrushMode('erase')}
            className={`flex items-center gap-2 p-2 rounded-xl border text-left transition-all ${
              limitsBrushMode === 'erase'
                ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-md'
                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
            }`}
          >
            <div className={`p-1.5 rounded-lg shrink-0 ${
              limitsBrushMode === 'erase' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-400'
            }`}>
              <Eraser className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-300">🧹 Borracha / Apagar</span>
              <p className="text-[10px] text-slate-400">Apaga tanto paredes quanto áreas de circulação.</p>
            </div>
          </button>
        </div>

        {/* Tamanho do Pincel */}
        <div className="space-y-1.5 pt-2 border-t border-slate-800">
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
            Tamanho do Pincel
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: '1x1 (8px)', size: 1 },
              { label: '2x2 (16px)', size: 2 },
              { label: '3x3 (24px)', size: 3 },
              { label: '5x5 (40px)', size: 5 },
            ].map(({ label, size }) => (
              <button
                key={size}
                onClick={() => onUpdateLimitsBrushSize(size)}
                className={`py-1.5 rounded-lg border text-xs font-mono font-bold transition-colors ${
                  limitsBrushSize === size
                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Espelho nas repetições (só vertical: tiles repetidas do bioma) */}
        {isVertical && (
          <label className="flex items-center justify-between gap-2 cursor-pointer bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 hover:border-slate-700 transition-colors">
            <span className="text-[10px] font-bold text-slate-200">
              🪞 Espelhar pintura nas tiles iguais repetidas
            </span>
            <input
              type="checkbox"
              checked={mirrorLimits}
              onChange={(e) => onUpdateMirrorLimits(e.target.checked)}
              className="w-4 h-4 accent-amber-400 rounded cursor-pointer shrink-0"
            />
          </label>
        )}

        {isVertical && (
          <>
            {/* Restrição de Movimento (mapa vertical) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
                <div className="space-y-0.5 pr-2">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Restringir Jogador às Áreas Verdes</span>
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Se desativado, o herói anda livre por todo o mapa e respeita as <strong>paredes vermelhas</strong>.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isRestricted}
                  onChange={(e) => onUpdateProject({ restrictPlayerToPaintedAreas: e.target.checked })}
                  className="w-4 h-4 accent-emerald-400 rounded cursor-pointer shrink-0"
                />
              </label>
            </div>

            {/* Estatísticas e Ações em Lote — MAPA VERTICAL */}
            <div className="pt-2 border-t border-slate-800 space-y-2.5">
              <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider block">
                🗺️ Estatísticas de Colisão (Mapa Vertical)
              </span>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">Paredes (Vermelho)</span>
                    <b className="text-rose-400 font-mono">{blockedCount}</b>
                  </div>
                  {blockedCount > 0 && (
                    <button
                      onClick={handleClearBlocked}
                      className="w-full py-0.5 rounded bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[9px] font-semibold"
                    >
                      Limpar Paredes
                    </button>
                  )}
                </div>

                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[10px]">Caminhos (Verde)</span>
                    <b className="text-emerald-400 font-mono">{walkableCount}</b>
                  </div>
                  {walkableCount > 0 && (
                    <button
                      onClick={handleClearWalkable}
                      className="w-full py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[9px] font-semibold"
                    >
                      Limpar Caminhos
                    </button>
                  )}
                </div>
              </div>

              <button
                onClick={handleClearAllVertical}
                className="w-full py-1 rounded-lg bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 border border-slate-800 hover:border-rose-500/40 text-[10px] font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3 h-3" />
                <span>Limpar Toda a Colisão do Vertical</span>
              </button>
            </div>
          </>
        )}

        {!isVertical && (
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider block">
              💜 Fases Extended ({subBiomes.length})
            </span>
            {subBiomes.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">
                Nenhuma fase cadastrada nesta tela.
              </p>
            ) : (
              subBiomes.map((sb) => {
                const sbWalkable = (sb.walkableCells || []).length;
                const sbBlocked = (sb.blockedCells || []).length;
                return (
                  <div key={sb.id} className="p-2 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-purple-200 truncate">{sb.name}</span>
                      <div className="flex items-center gap-2 font-mono text-[10px]">
                        <span className="text-rose-400 font-bold">{sbBlocked} bloq.</span>
                        <span className="text-slate-600">|</span>
                        <span className="text-emerald-400 font-bold">{sbWalkable} liv.</span>
                      </div>
                    </div>
                    <label className="flex items-center justify-between gap-2 cursor-pointer">
                      <span className="text-[10px] text-slate-400">Restringir apenas às áreas verdes</span>
                      <input
                        type="checkbox"
                        checked={sb.restrictPlayerToPaintedAreas || false}
                        onChange={(e) => onUpdateSubBiome(sb.id, { restrictPlayerToPaintedAreas: e.target.checked })}
                        className="w-3.5 h-3.5 accent-emerald-400 rounded cursor-pointer shrink-0"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => {
                          if (window.confirm(`Apagar paredes de colisão de "${sb.name}"?`)) {
                            onUpdateSubBiome(sb.id, { blockedCells: [] });
                          }
                        }}
                        className="py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-[9px] font-semibold"
                      >
                        Limpar Paredes
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(`Apagar caminhos de "${sb.name}"?`)) {
                            onUpdateSubBiome(sb.id, { walkableCells: [] });
                          }
                        }}
                        className="py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[9px] font-semibold"
                      >
                        Limpar Caminhos
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
