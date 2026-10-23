import React, { useEffect, useMemo } from 'react';
import { MapMarker } from '../../types/map';
import {
  resolveNpcMatrixCard,
  resolveNpcBattleMode,
  resolveNpcDeckCards,
  getRarityRules,
  RolledCardVariation,
  NpcBattleOutcome,
  consumeLastNpcBattleOutcome,
} from '../../../../core/NpcCardBattleBridge';
import { renderMatrixCardSVG } from '../../../../ui/screens/forge_v2/utils/HestridiaMatrixRenderer';
import { Swords, Sparkles, X, Shield, Layers, CheckCircle2, Zap } from 'lucide-react';

interface NpcScanBattleDialogueModalProps {
  marker: MapMarker;
  isLandscape?: boolean;
  onStartBattle: (marker: MapMarker, mode: 'boss' | 'duel') => void;
  onDirectScan: (marker: MapMarker) => void;
  onClose: () => void;
}

export const NpcScanBattleDialogueModal: React.FC<NpcScanBattleDialogueModalProps> = ({
  marker,
  isLandscape = false,
  onStartBattle,
  onDirectScan,
  onClose,
}) => {
  const repCard = useMemo(() => resolveNpcMatrixCard(marker), [marker]);
  const primaryMode = useMemo(() => resolveNpcBattleMode(marker), [marker]);
  const npcDeck = useMemo(() => resolveNpcDeckCards(marker), [marker]);
  const rarityRules = useMemo(() => getRarityRules(), []);

  const cardSvgHtml = useMemo(() => {
    if (!repCard) return '';
    try {
      return renderMatrixCardSVG(repCard, { mode: 'thumb', animateChroma: false });
    } catch {
      return '';
    }
  }, [repCard]);

  const dialogueText =
    marker.actionNpc?.scanDialogueText ||
    marker.actionNpc?.speechPhrases?.find((s) => s && s.trim()) ||
    marker.npcPhrases?.find((s) => s && s.trim()) ||
    (primaryMode === 'boss'
      ? `"Argh! Minha matriz entrou em estado de escaneamento! Venha me enfrentar no tabuleiro se quiser capturar uma variação da minha carta!"`
      : `"Você me encontrou! Não sou um Mobby comum — vou enfrentar você com o meu Deck de Cartas! Se vencer, minha Carta Matriz será sua!"`);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-2 sm:inset-3 rounded-[30px] z-[999800] overflow-y-auto bg-slate-950/90 backdrop-blur-md border-2 border-amber-400/80 shadow-[0_0_50px_rgba(0,0,0,0.95)] flex flex-col justify-between p-3.5 sm:p-4 select-none pointer-events-auto"
    >
      {/* Top Bar: Status de Escaneamento */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-amber-500/30">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest text-cyan-300 truncate">
              📡 Fase de Escaneamento &amp; Duelo de Matriz
            </div>
            <div className="text-xs font-black text-white truncate">
              {marker.name} •{' '}
              <span className="text-amber-300">
                {primaryMode === 'boss'
                  ? '👹 Boss Battle (Asset no Tabuleiro)'
                  : '🃏 Duelo de Cartas (Deck do NPC)'}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-900 hover:bg-rose-600 border border-slate-700 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer shrink-0 transition-colors"
          title="Fechar diálogo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Center Content: NPC Asset + Linked Matrix Card Preview */}
      <div
        className={`my-2 grid ${
          isLandscape ? 'grid-cols-2 gap-3 items-center' : 'grid-cols-1 gap-2.5'
        }`}
      >
        {/* Coluna 1: Retrato do NPC + Balão de Diálogo de Boss Battle */}
        <div className="p-3 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950 border border-amber-500/40 flex flex-col items-center text-center space-y-2 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.14)_0%,transparent_70%)] pointer-events-none" />
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-slate-950/90 border-2 border-cyan-400/70 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(34,211,238,0.3)]">
            {marker.customIconPng ? (
              <img
                src={marker.customIconPng}
                alt={marker.name}
                className="w-full h-full object-contain filter drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)] animate-bounce"
              />
            ) : (
              <span className="text-4xl">👹</span>
            )}
            <span className="absolute -bottom-2 px-2 py-0.5 rounded-full bg-cyan-500 text-slate-950 font-black text-[8.5px] uppercase tracking-wider shadow">
              50% PV • ESCANEÁVEL
            </span>
          </div>

          <div className="pt-1 space-y-1">
            <div className="text-xs font-black text-amber-300">{marker.name}</div>
            <p className="text-[11px] font-semibold text-slate-200 italic leading-snug px-1">
              {dialogueText}
            </p>
          </div>

          {/* Info do Modo de Batalha */}
          {primaryMode === 'boss' ? (
            <div className="w-full px-2.5 py-1.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-[9.5px] text-rose-200 font-bold">
              👹 <strong>Modo Boss Battle:</strong> Você enfrentará o asset vivo de{' '}
              <strong>{marker.name}</strong> no topo do tabuleiro 3x1!
            </div>
          ) : (
            <div className="w-full px-2.5 py-1.5 rounded-xl bg-indigo-950/50 border border-cyan-500/40 text-[9.5px] text-cyan-200 font-bold">
              🃏 <strong>Modo Duelo de Cartas:</strong> {marker.name} jogará com seu Deck de{' '}
              {npcDeck.length} cartas nos slots do oponente!
            </div>
          )}
        </div>

        {/* Coluna 2: Carta Matriz Vinculada & Regras de Variação por Raridade */}
        <div className="p-3 rounded-2xl bg-gradient-to-b from-amber-950/30 via-slate-900/95 to-slate-950 border border-amber-400/50 flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Carta Matriz Representante</span>
            </span>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-[8.5px] font-black text-amber-200">
              Drop Garantido ao Vencer
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Render da Carta Matriz */}
            <div className="w-20 aspect-[680/990] rounded-xl overflow-hidden border-2 border-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.35)] shrink-0 bg-slate-950 relative">
              {cardSvgHtml ? (
                <div
                  className="w-full h-full"
                  dangerouslySetInnerHTML={{ __html: cardSvgHtml }}
                />
              ) : repCard?.image ? (
                <img
                  src={repCard.image}
                  alt={repCard.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">
                  🃏
                </div>
              )}
            </div>

            {/* Detalhes da Carta e Variações de Raridade */}
            <div className="flex-1 min-w-0 space-y-1.5">
              <div>
                <div className="text-xs font-black text-white truncate">
                  {repCard?.name || marker.name}
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono">
                  Base Matriz: ❤️ PV {repCard?.pv || 50} • ⚔️ ATK {repCard?.atk || 15}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-bold text-purple-300 uppercase block">
                  🎲 Variações Possíveis no Drop:
                </span>
                <div className="grid grid-cols-2 gap-1 text-[8.5px]">
                  {(['common', 'rare', 'epic', 'legendary'] as const).map((rKey) => {
                    const r = rarityRules[rKey];
                    return (
                      <div
                        key={rKey}
                        className="px-1.5 py-0.5 rounded bg-slate-950/90 border border-slate-800 flex items-center justify-between"
                      >
                        <span className="font-bold truncate" style={{ color: r.color }}>
                          {r.icon} {r.label}
                        </span>
                        <span className="font-mono text-slate-300">
                          {Math.round(r.atkBonus * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Action Buttons: Boss Battle, Card Duel, ou Scan Rápido */}
      <div className="space-y-2 pt-2 border-t border-slate-800">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onStartBattle(marker, 'boss')}
            className={`py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 shadow-lg cursor-pointer transition-transform active:scale-95 ${
              primaryMode === 'boss'
                ? 'bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 border-amber-300 text-white shadow-rose-600/30'
                : 'bg-slate-900 hover:bg-slate-800 border-rose-500/50 text-rose-200'
            }`}
          >
            <span>👹</span>
            <span>Boss Battle (Asset)</span>
          </button>

          <button
            type="button"
            onClick={() => onStartBattle(marker, 'duel')}
            className={`py-2.5 px-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 border-2 shadow-lg cursor-pointer transition-transform active:scale-95 ${
              primaryMode === 'duel'
                ? 'bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 border-cyan-300 text-white shadow-cyan-500/30'
                : 'bg-slate-900 hover:bg-slate-800 border-cyan-500/50 text-cyan-200'
            }`}
          >
            <span>🃏</span>
            <span>Duelo de Cartas (Deck)</span>
          </button>
        </div>

        <button
          type="button"
          onClick={() => onDirectScan(marker)}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500/25 to-teal-500/25 hover:from-emerald-500/35 hover:to-teal-500/35 border border-emerald-400/60 text-emerald-200 font-black text-[11px] flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-98"
        >
          <span>📡</span>
          <span>Escaneamento Rápido Direto (Capturar Variação s/ Tabuleiro)</span>
        </button>
      </div>
    </div>
  );
};

interface NpcEmbeddedBattleIframeModalProps {
  battleUrl: string;
  npcName: string;
  battleMode: 'boss' | 'duel';
  onBattleFinished: (outcome: NpcBattleOutcome) => void;
  onCancel: () => void;
}

export const NpcEmbeddedBattleIframeModal: React.FC<NpcEmbeddedBattleIframeModalProps> = ({
  battleUrl,
  npcName,
  battleMode,
  onBattleFinished,
  onCancel,
}) => {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SLIMELANDS_NPC_BATTLE_COMPLETED') {
        consumeLastNpcBattleOutcome();
        onBattleFinished(event.data.outcome as NpcBattleOutcome);
      }
    };

    const pollInterval = setInterval(() => {
      const outcome = consumeLastNpcBattleOutcome();
      if (outcome) {
        onBattleFinished(outcome);
      }
    }, 500);

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(pollInterval);
    };
  }, [onBattleFinished]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed inset-0 z-[999999] bg-slate-950 flex flex-col select-none pointer-events-auto"
    >
      {/* Top Bar Compacta da Arena Integrada */}
      <div className="h-10 px-4 bg-slate-950 border-b border-amber-500/40 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/60 text-[10px] font-black text-amber-300 uppercase">
            {battleMode === 'boss' ? '👹 Boss Battle 3x1' : '🃏 Duelo de Cartas'}
          </span>
          <span className="text-xs font-black text-white">
            Enfrentando: <strong className="text-amber-300">{npcName}</strong>
          </span>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-rose-600 border border-slate-700 text-[10px] font-black text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
          <span>Recuar p/ Fase</span>
        </button>
      </div>

      <iframe
        src={battleUrl}
        title={`Batalha contra ${npcName}`}
        className="w-full flex-1 border-0 bg-black"
      />
    </div>
  );
};

interface CardVariationDropShowcaseModalProps {
  variation: RolledCardVariation;
  goldEarned?: number;
  gemsEarned?: number;
  xpEarned?: number;
  onClose: () => void;
}

export const CardVariationDropShowcaseModal: React.FC<CardVariationDropShowcaseModalProps> = ({
  variation,
  goldEarned = 150,
  gemsEarned = 3,
  xpEarned = 180,
  onClose,
}) => {
  const cardSvgHtml = useMemo(() => {
    try {
      return renderMatrixCardSVG(
        {
          id: variation.baseCardId,
          name: variation.baseCardName,
          category: variation.category,
          pv: variation.rolledPv,
          maxPv: variation.rolledPv,
          atk: variation.rolledAtk,
          image: variation.image,
          _rawMatrixCard: variation.rawMatrixCard,
        },
        { mode: 'detail', animateChroma: true }
      );
    } catch {
      return '';
    }
  }, [variation]);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute inset-2 sm:inset-3 rounded-[30px] z-[999900] overflow-y-auto bg-slate-950/95 backdrop-blur-xl border-2 p-4 flex flex-col items-center justify-between text-center select-none pointer-events-auto shadow-[0_0_60px_rgba(0,0,0,0.95)]"
      style={{ borderColor: variation.rarityColor }}
    >
      <div className="space-y-1">
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-md"
          style={{
            backgroundColor: `${variation.rarityColor}25`,
            borderColor: variation.rarityColor,
            color: variation.rarityColor,
          }}
        >
          <span>{variation.rarityIcon}</span>
          <span>
            NOVA VARIAÇÃO CAPTURADA • {variation.rarityLabel.toUpperCase()} ({variation.serialNumber})
          </span>
        </div>
        <h3 className="text-sm sm:text-base font-black text-white">
          {variation.variationName}
        </h3>
        <p className="text-[10.5px] text-slate-400">
          Adicionada ao seu <strong>Arsenal / Deck de Cartas</strong> e à{' '}
          <strong>Mochila da Fase</strong>!
        </p>
      </div>

      {/* Carta Renderizada pela Matriz Absoluta Forja V2 */}
      <div
        className="my-2 w-40 sm:w-44 aspect-[680/990] rounded-2xl overflow-hidden border-2 shadow-2xl relative bg-slate-900"
        style={{
          borderColor: variation.rarityColor,
          boxShadow: `0 0 32px ${variation.rarityColor}55`,
        }}
      >
        {cardSvgHtml ? (
          <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: cardSvgHtml }}
          />
        ) : (
          <img
            src={variation.image}
            alt={variation.variationName}
            className="w-full h-full object-cover"
          />
        )}
      </div>

      {/* Comparativo de Atributos da Variação */}
      <div className="w-full max-w-xs p-2.5 rounded-2xl bg-slate-900/95 border border-slate-800 space-y-1.5">
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-300">
          <span>Traço Genético:</span>
          <span className="text-amber-300 font-black">{variation.variantTrait}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-xs">
          <div className="p-1.5 rounded-xl bg-slate-950 border border-emerald-500/30">
            <div className="text-[9px] text-slate-400 font-bold">❤️ VIDA (PV)</div>
            <div className="font-mono font-black text-emerald-300">
              {variation.basePv} ➔ {variation.rolledPv}{' '}
              <span className="text-[9px] text-emerald-400">
                ({variation.pvMultiplier}x)
              </span>
            </div>
          </div>
          <div className="p-1.5 rounded-xl bg-slate-950 border border-rose-500/30">
            <div className="text-[9px] text-slate-400 font-bold">⚔️ ATAQUE (ATK)</div>
            <div className="font-mono font-black text-rose-300">
              {variation.baseAtk} ➔ {variation.rolledAtk}{' '}
              <span className="text-[9px] text-rose-400">
                ({variation.atkMultiplier}x)
              </span>
            </div>
          </div>
        </div>
        <div className="pt-1 flex items-center justify-center gap-3 text-[10px] font-black text-amber-300">
          <span>🪙 +{goldEarned} Ouro</span>
          <span>💎 +{gemsEarned} Gemas</span>
          <span>⭐ +{xpEarned} XP</span>
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="w-full max-w-xs mt-2 py-2.5 px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 font-black text-xs shadow-lg cursor-pointer active:scale-95 transition-transform"
      >
        🙌 Equipar no Deck &amp; Continuar Explorando
      </button>
    </div>
  );
};
