import React, { useState } from 'react';
import { MarkerModuleCommonProps } from '../types';
import { MessageSquare, Swords, Footprints } from 'lucide-react';
import { MarkerActionNpcModule } from './MarkerActionNpcModule';

export const MarkerNpcModule: React.FC<MarkerModuleCommonProps> = (props) => {
  const { marker, onUpdateMarker } = props;
  const [subTab, setSubTab] = useState<'patrol' | 'action_npc'>(
    marker.actionNpc?.enabled ? 'action_npc' : 'patrol'
  );

  return (
    <div className="space-y-3.5">
      {/* Seletor de Sub-Abas do NPC: Patrulha Padrão vs Modo Action NPC */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
        <button
          type="button"
          onClick={() => setSubTab('patrol')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            subTab === 'patrol'
              ? 'bg-teal-500/25 border border-teal-400 text-teal-100 shadow-xs'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Footprints className="w-3.5 h-3.5 text-teal-400" />
          <span>Patrulha & Falas</span>
        </button>

        <button
          type="button"
          onClick={() => setSubTab('action_npc')}
          className={`py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
            subTab === 'action_npc'
              ? 'bg-gradient-to-r from-red-600 to-rose-600 border border-red-400 text-white shadow-md'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Swords className="w-3.5 h-3.5 text-red-300" />
          <span>Action NPC</span>
          {marker.actionNpc?.enabled && (
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse ml-0.5" />
          )}
        </button>
      </div>

      {subTab === 'action_npc' ? (
        <MarkerActionNpcModule {...props} />
      ) : (
        <div className="space-y-3">

      {/* Auto-Caminhe / Patrulha */}
      <div className="p-3 bg-slate-950 border border-teal-500/30 rounded-xl space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
            <span>🚶</span>
            <span>Auto-Caminhe (Patrulha do NPC)</span>
          </span>
          <button
            type="button"
            onClick={() => {
              const cur = marker.npcPatrol || {
                enabled: false,
                preset: 'horizontal',
                walkStyle: 'jelly',
                speed: 2.5,
                distance: 160,
                pauseTime: 1.5,
                loop: true,
                customMode: 'points',
                waypoints: [],
              };
              onUpdateMarker(marker.id, {
                npcPatrol: { ...cur, enabled: !cur.enabled },
              });
            }}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors cursor-pointer ${
              marker.npcPatrol?.enabled
                ? 'bg-teal-500/30 border border-teal-400 text-teal-100 shadow-sm'
                : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {marker.npcPatrol?.enabled ? '🟢 Ativado' : '⚪ Desativado'}
          </button>
        </div>

        {marker.npcPatrol?.enabled && (
          <div className="space-y-3 pt-2 border-t border-slate-850">
            {/* Estilo de Caminhada */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">
                Estilo de Caminhada:
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const cur = marker.npcPatrol!;
                    onUpdateMarker(marker.id, {
                      npcPatrol: { ...cur, walkStyle: 'jelly' },
                    });
                  }}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                    (marker.npcPatrol.walkStyle || 'jelly') === 'jelly'
                      ? 'bg-teal-500/30 border-teal-400 text-teal-100 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-lg">🍮</span>
                  <div className="leading-tight">
                    <div className="text-[11px] font-bold">Gelatina</div>
                    <div className="text-[9px] text-slate-400">Igual ao herói</div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const cur = marker.npcPatrol!;
                    onUpdateMarker(marker.id, {
                      npcPatrol: { ...cur, walkStyle: 'slime_hop' },
                    });
                  }}
                  className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-colors cursor-pointer ${
                    marker.npcPatrol.walkStyle === 'slime_hop'
                      ? 'bg-teal-500/30 border-teal-400 text-teal-100 font-bold'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="text-lg">🟢</span>
                  <div className="leading-tight">
                    <div className="text-[11px] font-bold">Pulinho Slime</div>
                    <div className="text-[9px] text-slate-400">Hop elástico</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Presets de Trajeto */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-teal-200 uppercase tracking-wider block">
                Preset de Trajeto:
              </label>
              <div className="grid grid-cols-4 gap-1 text-[11px]">
                {[
                  { id: 'horizontal', label: 'Horizontal', icon: '↔️' },
                  { id: 'vertical', label: 'Vertical', icon: '↕️' },
                  { id: 'procedural', label: 'Procedural', icon: '🎲' },
                  { id: 'custom', label: 'Livre', icon: '🗺️' },
                ].map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => {
                      const cur = marker.npcPatrol!;
                      onUpdateMarker(marker.id, {
                        npcPatrol: { ...cur, preset: pr.id as any },
                      });
                    }}
                    className={`p-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors cursor-pointer ${
                      (marker.npcPatrol?.preset || 'horizontal') === pr.id
                        ? 'bg-teal-500/30 border-teal-400 text-teal-200 font-bold'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="text-sm">{pr.icon}</span>
                    <span className="text-[9px] leading-tight text-center">{pr.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Distância da Patrulha */}
            {((marker.npcPatrol.preset || 'horizontal') === 'horizontal' ||
              marker.npcPatrol.preset === 'vertical' ||
              marker.npcPatrol.preset === 'procedural') && (
              <div className="space-y-1.5 pt-1 border-t border-slate-850">
                <div className="flex items-center justify-between text-[10px] text-slate-300">
                  <span>
                    {marker.npcPatrol.preset === 'procedural'
                      ? 'Raio de Exploração (Procedural):'
                      : 'Distância da Patrulha:'}
                  </span>
                  <span className="font-mono text-teal-300 font-bold">
                    {marker.npcPatrol.distance || (marker.npcPatrol.preset === 'procedural' ? 100 : 160)}px
                  </span>
                </div>
                <input
                  type="range"
                  min={32}
                  max={600}
                  step={16}
                  value={marker.npcPatrol.distance || 160}
                  onChange={(e) => {
                    const cur = marker.npcPatrol!;
                    onUpdateMarker(marker.id, {
                      npcPatrol: { ...cur, distance: Number(e.target.value) },
                    });
                  }}
                  className="w-full accent-teal-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                />
                <div className="flex items-center gap-1">
                  {[64, 128, 180, 256, 400].map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        const cur = marker.npcPatrol!;
                        onUpdateMarker(marker.id, {
                          npcPatrol: { ...cur, distance: d },
                        });
                      }}
                      className={`flex-1 py-0.5 text-[9px] rounded border transition-colors cursor-pointer ${
                        (marker.npcPatrol?.distance || 160) === d
                          ? 'bg-teal-500/25 border-teal-400 text-teal-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}px
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trajeto Livre (Waypoints) */}
            {marker.npcPatrol.preset === 'custom' && (
              <div className="space-y-2 pt-1 border-t border-slate-850">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-bold">Modo do Traçado:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const cur = marker.npcPatrol!;
                        onUpdateMarker(marker.id, {
                          npcPatrol: { ...cur, customMode: 'points' },
                        });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                        (marker.npcPatrol.customMode || 'points') === 'points'
                          ? 'bg-teal-500/25 border-teal-400 text-teal-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      📍 Pontos
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const cur = marker.npcPatrol!;
                        onUpdateMarker(marker.id, {
                          npcPatrol: { ...cur, customMode: 'draw' },
                        });
                      }}
                      className={`px-2 py-0.5 rounded text-[10px] border transition-colors cursor-pointer ${
                        marker.npcPatrol.customMode === 'draw'
                          ? 'bg-teal-500/25 border-teal-400 text-teal-200 font-bold'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      ✏️ Lápis
                    </button>
                  </div>
                </div>

                <div className="p-2 bg-slate-900 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400 font-mono">
                      {(marker.npcPatrol.waypoints || []).length} ponto(s) cadastrado(s)
                    </span>
                    {(marker.npcPatrol.waypoints || []).length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const cur = marker.npcPatrol!;
                          onUpdateMarker(marker.id, {
                            npcPatrol: { ...cur, waypoints: [] },
                          });
                        }}
                        className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1 pt-1">
                    {[
                      { dx: 60, dy: 0, label: '➡️ +60px' },
                      { dx: -60, dy: 0, label: '⬅️ -60px' },
                      { dx: 0, dy: 60, label: '⬇️ +60px' },
                      { dx: 0, dy: -60, label: '⬆️ -60px' },
                    ].map((btn, bIdx) => (
                      <button
                        key={bIdx}
                        type="button"
                        onClick={() => {
                          const cur = marker.npcPatrol!;
                          const lastWp = (cur.waypoints || [])[(cur.waypoints || []).length - 1] || { x: 0, y: 0 };
                          const nextWp = { x: lastWp.x + btn.dx, y: lastWp.y + btn.dy };
                          onUpdateMarker(marker.id, {
                            npcPatrol: {
                              ...cur,
                              waypoints: [...(cur.waypoints || []), nextWp],
                            },
                          });
                        }}
                        className="flex-1 py-1 text-[9px] bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded text-slate-300 font-mono transition-colors cursor-pointer"
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Velocidade e Tempo de Pausa */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">⚡ Velocidade:</span>
                  <span className="font-mono text-teal-300 font-bold">
                    {(marker.npcPatrol.speed || 2.5).toFixed(1)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="8.0"
                  step="0.5"
                  value={marker.npcPatrol.speed || 2.5}
                  onChange={(e) => {
                    const cur = marker.npcPatrol!;
                    onUpdateMarker(marker.id, {
                      npcPatrol: { ...cur, speed: Number(e.target.value) },
                    });
                  }}
                  className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">⏱️ Pausa:</span>
                  <span className="font-mono text-teal-300 font-bold">
                    {(marker.npcPatrol.pauseTime ?? 1.5).toFixed(1)}s
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="5.0"
                  step="0.5"
                  value={marker.npcPatrol.pauseTime ?? 1.5}
                  onChange={(e) => {
                    const cur = marker.npcPatrol!;
                    onUpdateMarker(marker.id, {
                      npcPatrol: { ...cur, pauseTime: Number(e.target.value) },
                    });
                  }}
                  className="w-full accent-teal-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Falas e Balões do NPC */}
      <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
            <span>Falas Rápidas do Balão (até 3 frases):</span>
          </span>
          <span className="text-[10px] text-slate-500 font-mono">
            {(marker.npcPhrases || []).length}/3
          </span>
        </div>

        <div className="space-y-1.5">
          {Array.from({ length: 3 }).map((_, pIdx) => {
            const phrase = (marker.npcPhrases || [])[pIdx] || '';
            return (
              <div key={pIdx} className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-mono w-4">#{pIdx + 1}</span>
                <input
                  type="text"
                  placeholder={`Frase ${pIdx + 1} do balão...`}
                  value={phrase}
                  onChange={(e) => {
                    const nextPhrases = [...(marker.npcPhrases || [])];
                    while (nextPhrases.length <= pIdx) nextPhrases.push('');
                    nextPhrases[pIdx] = e.target.value;
                    onUpdateMarker(marker.id, {
                      npcPhrases: nextPhrases.filter((p, i) => i <= pIdx || p.trim().length > 0),
                    });
                  }}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Gelatina / Bounce ao Andar */}
      <label className="flex items-center justify-between gap-2 p-2.5 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer">
        <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
          <span>🍮</span>
          <span>Efeito Bounce / Gelatina ao Caminhar</span>
        </span>
        <input
          type="checkbox"
          checked={marker.npcBounce !== false && marker.effect !== 'none'}
          onChange={(e) => {
            const checked = e.target.checked;
            onUpdateMarker(marker.id, {
              npcBounce: checked,
              effect: checked ? 'jelly' : 'none',
            });
          }}
          className="w-4 h-4 accent-amber-400 rounded cursor-pointer"
        />
      </label>
        </div>
      )}
    </div>
  );
};

