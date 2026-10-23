import React, { useMemo, useState } from 'react';
import { MapMarker } from '../../../types/map';
import {
  getAvailableMatrixCards,
  resolveNpcMatrixCard,
  resolveNpcBattleMode,
  resolveNpcDeckCards,
  getRarityRules,
  getAvailablePassiveAbilities,
  getAvailableActiveArtifacts,
  getAvailableBattleScenarios,
  getAvailableForgeSounds,
  RarityKey,
} from '../../../../../core/NpcCardBattleBridge';
import { SoundManager } from '../../../../../ui/utils/SoundManager';
import { Sparkles, Layers, X, Shuffle, Volume2, Zap, Shield, Image, Music } from 'lucide-react';

interface NpcMatrixCardLinkPanelProps {
  marker: MapMarker;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  compact?: boolean;
}

export const NpcMatrixCardLinkPanel: React.FC<NpcMatrixCardLinkPanelProps> = ({
  marker,
  onUpdateMarker,
  compact = false,
}) => {
  const allMatrixCards = useMemo(() => getAvailableMatrixCards(), []);
  const rarityRules = useMemo(() => getRarityRules(), []);
  const allPassives = useMemo(() => getAvailablePassiveAbilities(), []);
  const allArtifacts = useMemo(() => getAvailableActiveArtifacts(), []);
  const allScenarios = useMemo(() => getAvailableBattleScenarios(), []);
  const allSounds = useMemo(() => getAvailableForgeSounds(), []);

  const linkedCard = useMemo(() => resolveNpcMatrixCard(marker), [marker, allMatrixCards]);
  const currentBattleMode = resolveNpcBattleMode(marker);
  const currentDeckCards = useMemo(() => resolveNpcDeckCards(marker), [marker, allMatrixCards]);
  const [showDeckPicker, setShowDeckPicker] = useState(false);

  const currentRarityRule =
    marker.actionNpc?.rarityDropRule || marker.rarityDropRule || 'auto';
  const currentPassiveId =
    marker.actionNpc?.passiveAbilityId || marker.passiveAbilityId || '';
  const currentArtifactId =
    marker.actionNpc?.activeArtifactId || marker.activeArtifactId || '';
  const currentScenarioKey =
    marker.actionNpc?.battleScenarioKey || marker.battleScenarioKey || '';
  const currentBgmUrl =
    marker.actionNpc?.battleBgmUrl || marker.battleBgmUrl || '';

  const updateLinkFields = (patch: {
    matrixCardId?: string;
    battleMode?: 'boss' | 'duel';
    deckCardIds?: string[];
    rarityDropRule?: 'auto' | RarityKey;
    scanDialogueText?: string;
    passiveAbilityId?: string;
    activeArtifactId?: string;
    battleScenarioKey?: string;
    battleBgmUrl?: string;
  }) => {
    const nextActionNpc = marker.actionNpc
      ? {
          ...marker.actionNpc,
          ...(patch.matrixCardId !== undefined ? { matrixCardId: patch.matrixCardId } : {}),
          ...(patch.battleMode !== undefined ? { battleMode: patch.battleMode } : {}),
          ...(patch.deckCardIds !== undefined ? { deckCardIds: patch.deckCardIds } : {}),
          ...(patch.rarityDropRule !== undefined ? { rarityDropRule: patch.rarityDropRule } : {}),
          ...(patch.scanDialogueText !== undefined ? { scanDialogueText: patch.scanDialogueText } : {}),
          ...(patch.passiveAbilityId !== undefined ? { passiveAbilityId: patch.passiveAbilityId } : {}),
          ...(patch.activeArtifactId !== undefined ? { activeArtifactId: patch.activeArtifactId } : {}),
          ...(patch.battleScenarioKey !== undefined ? { battleScenarioKey: patch.battleScenarioKey } : {}),
          ...(patch.battleBgmUrl !== undefined ? { battleBgmUrl: patch.battleBgmUrl } : {}),
        }
      : undefined;

    onUpdateMarker(marker.id, {
      ...(patch.matrixCardId !== undefined ? { matrixCardId: patch.matrixCardId } : {}),
      ...(patch.battleMode !== undefined ? { battleMode: patch.battleMode } : {}),
      ...(patch.deckCardIds !== undefined ? { deckCardIds: patch.deckCardIds } : {}),
      ...(patch.rarityDropRule !== undefined ? { rarityDropRule: patch.rarityDropRule } : {}),
      ...(patch.passiveAbilityId !== undefined ? { passiveAbilityId: patch.passiveAbilityId } : {}),
      ...(patch.activeArtifactId !== undefined ? { activeArtifactId: patch.activeArtifactId } : {}),
      ...(patch.battleScenarioKey !== undefined ? { battleScenarioKey: patch.battleScenarioKey } : {}),
      ...(patch.battleBgmUrl !== undefined ? { battleBgmUrl: patch.battleBgmUrl } : {}),
      ...(nextActionNpc ? { actionNpc: nextActionNpc } : {}),
    });
  };

  return (
    <div className="p-3 bg-gradient-to-br from-amber-950/35 via-slate-950 to-indigo-950/35 border border-amber-500/40 rounded-xl space-y-3 shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-black text-amber-200 uppercase tracking-wide truncate">
              🃏 Matriz de Cartas, Artefatos, Cenários &amp; Sons
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              Conecta este NPC à Forja V2 (Carta Matriz, Passiva, Ativa, Cenário e Trilha)
            </div>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[9.5px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
          Forja V2 Conectada
        </span>
      </div>

      {/* 1. Carta Matriz Representante */}
      <div className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl space-y-2">
        <div className="flex items-center justify-between text-[10.5px]">
          <span className="font-bold text-amber-300 uppercase tracking-wider">
            1. Carta Matriz Representante do NPC:
          </span>
          <button
            type="button"
            onClick={() => {
              if (allMatrixCards.length === 0) return;
              const randomCard =
                allMatrixCards[Math.floor(Math.random() * allMatrixCards.length)];
              updateLinkFields({ matrixCardId: String(randomCard.name || randomCard.id) });
            }}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9.5px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
            title="Sortear outra carta da Matriz"
          >
            <Shuffle className="w-3 h-3" />
            <span>Sortear</span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Mini Preview da Carta Matriz */}
          <div className="w-12 h-16 rounded-lg bg-slate-950 border-2 border-amber-400/70 overflow-hidden shrink-0 flex flex-col items-center justify-between relative shadow-md">
            {linkedCard?.image ? (
              <img
                src={linkedCard.image}
                alt={linkedCard.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg">🃏</div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-slate-950/90 px-1 py-0.5 flex items-center justify-between text-[8px] font-mono font-black">
              <span className="text-emerald-300">❤️{linkedCard?.pv || 50}</span>
              <span className="text-rose-300">⚔️{linkedCard?.atk || 15}</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <select
              value={
                marker.actionNpc?.matrixCardId ||
                marker.matrixCardId ||
                linkedCard?.name ||
                ''
              }
              onChange={(e) => updateLinkFields({ matrixCardId: e.target.value })}
              className="w-full bg-slate-950 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-xs font-bold text-amber-100 focus:outline-none focus:border-amber-400"
            >
              {allMatrixCards.map((c, idx) => {
                const keyVal = String(c.name || c.id || idx);
                return (
                  <option key={`${keyVal}-${idx}`} value={keyVal}>
                    🃏 {c.name} — (PV {c.pv || 50} / ATK {c.atk || 15}) [{c.category || 'GUARDIÃO'}]
                  </option>
                );
              })}
            </select>

            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span>
                Representante atual:{' '}
                <strong className="text-white">{linkedCard?.name || 'Auto'}</strong>
              </span>
              <span className="font-mono text-amber-300">
                {allMatrixCards.length} cartas na Matriz
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Modo de Batalha ao Escanear / Desafiar */}
      <div className="space-y-1.5">
        <label className="text-[10.5px] font-bold text-cyan-300 uppercase tracking-wider block">
          2. Modo de Batalha ao Entrar em Fase de Escanear / Evento:
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => updateLinkFields({ battleMode: 'boss' })}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
              currentBattleMode === 'boss'
                ? 'bg-gradient-to-br from-rose-600/30 to-amber-600/20 border-rose-400 text-white shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg shrink-0">👹</span>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-rose-200 leading-tight">
                Boss Battle (Asset no Tabuleiro)
              </div>
              <div className="text-[9.5px] text-slate-400 leading-snug mt-0.5">
                Luta contra o NPC vendo o sprite/vídeo dele no topo do tabuleiro 3x1
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateLinkFields({ battleMode: 'duel' })}
            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
              currentBattleMode === 'duel'
                ? 'bg-gradient-to-br from-indigo-600/30 to-cyan-600/20 border-cyan-400 text-white shadow-md'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className="text-lg shrink-0">🃏</span>
            <div className="min-w-0">
              <div className="text-[11px] font-black text-cyan-200 leading-tight">
                Duelo de Cartas (Deck do NPC)
              </div>
              <div className="text-[9.5px] text-slate-400 leading-snug mt-0.5">
                NPC não-Mobby enfrenta você jogando as cartas do deck dele nos 3 slots
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* 2.1 Se Modo Duelo de Cartas estiver ativo, permite editar o Deck do NPC */}
      {currentBattleMode === 'duel' && (
        <div className="p-2.5 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-cyan-300 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              <span>Deck do NPC Oponente ({currentDeckCards.length} cartas):</span>
            </span>
            <button
              type="button"
              onClick={() => setShowDeckPicker((v) => !v)}
              className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 text-[9.5px] font-bold cursor-pointer"
            >
              {showDeckPicker ? 'Concluir Deck' : '+ Editar Deck do NPC'}
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {currentDeckCards.map((c, idx) => (
              <div
                key={`${c.name}-${idx}`}
                className="px-2 py-1 rounded-lg bg-slate-950 border border-cyan-500/40 flex items-center gap-1.5 shrink-0"
              >
                <span className="text-[10px] font-black text-cyan-200">
                  {idx === 0 ? '👑' : `#${idx + 1}`} {c.name}
                </span>
                {(marker.actionNpc?.deckCardIds || marker.deckCardIds || []).includes(
                  c.name
                ) && (
                  <button
                    type="button"
                    onClick={() => {
                      const cur =
                        marker.actionNpc?.deckCardIds || marker.deckCardIds || [];
                      updateLinkFields({
                        deckCardIds: cur.filter((item) => item !== c.name),
                      });
                    }}
                    className="text-slate-500 hover:text-rose-400 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {showDeckPicker && (
            <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pt-1 border-t border-slate-800">
              {allMatrixCards.map((c, idx) => {
                const curList =
                  marker.actionNpc?.deckCardIds || marker.deckCardIds || [];
                const isAdded = curList.includes(c.name);
                return (
                  <button
                    key={`${c.name}-pick-${idx}`}
                    type="button"
                    onClick={() => {
                      const next = isAdded
                        ? curList.filter((i) => i !== c.name)
                        : [...curList, c.name].slice(0, 5);
                      updateLinkFields({ deckCardIds: next });
                    }}
                    className={`p-1.5 rounded-lg border text-left text-[10px] flex items-center justify-between cursor-pointer ${
                      isAdded
                        ? 'bg-cyan-500/25 border-cyan-400 text-cyan-100 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    <span className="font-mono text-[9px] shrink-0">
                      {isAdded ? '✓' : '+'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Regra de Raridade & Variação de Drop */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[10.5px]">
          <span className="font-bold text-purple-300 uppercase tracking-wider">
            3. Regra de Variação &amp; Raridade no Drop:
          </span>
          <span className="text-[9.5px] text-slate-400">
            Cada duelo gera atributos variados dentro da regra
          </span>
        </div>

        <div className="grid grid-cols-5 gap-1">
          {[
            { id: 'auto', label: '🎲 Sorteio', color: '#94a3b8', bonus: '1.0x~1.2x' },
            {
              id: 'common',
              label: `${rarityRules.common.icon} ${rarityRules.common.label}`,
              color: rarityRules.common.color,
              bonus: `${rarityRules.common.atkBonus}x`,
            },
            {
              id: 'rare',
              label: `${rarityRules.rare.icon} ${rarityRules.rare.label}+`,
              color: rarityRules.rare.color,
              bonus: `${rarityRules.rare.atkBonus}x`,
            },
            {
              id: 'epic',
              label: `${rarityRules.epic.icon} ${rarityRules.epic.label}+`,
              color: rarityRules.epic.color,
              bonus: `${rarityRules.epic.atkBonus}x`,
            },
            {
              id: 'legendary',
              label: `${rarityRules.legendary.icon} ${rarityRules.legendary.label}`,
              color: rarityRules.legendary.color,
              bonus: `${rarityRules.legendary.atkBonus}x`,
            },
          ].map((r) => {
            const active = currentRarityRule === r.id;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() =>
                  updateLinkFields({ rarityDropRule: r.id as 'auto' | RarityKey })
                }
                className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer ${
                  active
                    ? 'bg-purple-500/25 border-purple-400 text-white font-bold shadow-xs'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <div className="text-[9.5px] truncate">{r.label}</div>
                <div className="text-[8.5px] font-mono text-amber-300">{r.bonus}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Artefatos (Ativas) & Passivas da Forja V2 */}
      <div className="p-2.5 bg-slate-900/90 border border-indigo-500/35 rounded-xl space-y-2">
        <div className="text-[10.5px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>4. Artefatos (Ativas) &amp; Passivas da Forja V2:</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Passiva */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-slate-300 flex items-center gap-1">
              <Shield className="w-3 h-3 text-emerald-400" />
              <span>Passiva da Carta / Boss:</span>
            </label>
            <select
              value={currentPassiveId}
              onChange={(e) => updateLinkFields({ passiveAbilityId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[10.5px] font-bold text-emerald-200 focus:outline-none focus:border-emerald-400"
            >
              <option value="">🎲 Sorteio Automático (Rara+)</option>
              {allPassives.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.icon} {p.name} — {p.description}
                </option>
              ))}
            </select>
          </div>

          {/* Artefato Ativo (usado pelo NPC e dropado para o Arsenal) */}
          <div className="space-y-1">
            <label className="text-[9.5px] font-bold text-slate-300 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Artefato Ativo (Usa &amp; Dropa):</span>
            </label>
            <select
              value={currentArtifactId}
              onChange={(e) => updateLinkFields({ activeArtifactId: e.target.value })}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[10.5px] font-bold text-amber-200 focus:outline-none focus:border-amber-400"
            >
              <option value="">— Nenhum Artefato Fixo —</option>
              {allArtifacts.map((art) => (
                <option key={art.id} value={art.id}>
                  {art.icon} {art.name} ({art.description})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 5. Cenário de Batalha & Trilha Sonora da Forja V2 */}
      {!compact && (
        <div className="p-2.5 bg-slate-900/90 border border-amber-500/30 rounded-xl space-y-2">
          <div className="text-[10.5px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Image className="w-3.5 h-3.5 text-cyan-400" />
            <span>5. Cenário &amp; Som de Batalha (Forja V2):</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Cenário da Forja V2 */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-slate-300 block">
                🌌 Cenário de Fundo do Tabuleiro:
              </label>
              <select
                value={currentScenarioKey}
                onChange={(e) => updateLinkFields({ battleScenarioKey: e.target.value })}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[10.5px] font-bold text-cyan-200 focus:outline-none focus:border-cyan-400"
              >
                <option value="">✨ Padrão do Modo (Battle / Boss)</option>
                {allScenarios.map((scn) => (
                  <option key={scn.key} value={scn.key}>
                    {scn.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Trilha Sonora da Central de Sons */}
            <div className="space-y-1">
              <label className="text-[9.5px] font-bold text-slate-300 flex items-center gap-1">
                <Music className="w-3 h-3 text-pink-400" />
                <span>Trilha Sonora (Central de Sons):</span>
              </label>
              <div className="flex items-center gap-1">
                <select
                  value={currentBgmUrl}
                  onChange={(e) => updateLinkFields({ battleBgmUrl: e.target.value })}
                  className="flex-1 min-w-0 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[10.5px] font-bold text-pink-200 focus:outline-none focus:border-pink-400"
                >
                  <option value="">🎵 Trilha Padrão de Batalha</option>
                  {allSounds.map((snd, i) => (
                    <option key={`${snd.url}-${i}`} value={snd.url}>
                      🔊 {snd.name}
                    </option>
                  ))}
                </select>
                {currentBgmUrl && (
                  <button
                    type="button"
                    onClick={() => SoundManager.preview(currentBgmUrl)}
                    className="p-1.5 rounded-lg bg-pink-500/20 hover:bg-pink-500/35 border border-pink-400/50 text-pink-200 cursor-pointer shrink-0"
                    title="Ouvir prévia da trilha"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Fala de Desafio ao Entrar na Fase de Escaneamento */}
      {!compact && (
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-300 block">
            💬 Diálogo de Desafio na Fase de Escaneamento (50% PV / Evento):
          </label>
          <input
            type="text"
            placeholder={`Ex: "Você abalou minha matriz! Venha me enfrentar para escanear minha carta!"`}
            value={marker.actionNpc?.scanDialogueText || ''}
            onChange={(e) => updateLinkFields({ scanDialogueText: e.target.value })}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
          />
        </div>
      )}
    </div>
  );
};

