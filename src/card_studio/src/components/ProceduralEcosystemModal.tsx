import React, { useState } from 'react';
import {
  X,
  Dices,
  PackageOpen,
  Users,
  Sliders,
  Shield,
  BarChart3,
  Plus,
  Check,
  Sparkles,
  Info,
  Copy,
} from 'lucide-react';
import { CardData } from '../types/card';
import {
  BaseCharacter,
  BoosterModel,
  CardClass,
  CardOrigin,
  CardRank,
  ClassBalanceTable,
  DeckCategory,
  ParryAttackerInput,
  SimulationSummary,
} from '../types/slimelands';
import {
  OFFICIAL_CLASSES,
  OFFICIAL_RANKS,
  ensureCoherentCharacterFields,
  evaluateParryDefense,
  generateBoosterPack,
  generateProceduralCard,
  runMonteCarloSimulation,
} from '../utils/proceduralEngine';
import { CardFrameSVG } from './CardFrameSVG';

interface ProceduralEcosystemModalProps {
  isOpen: boolean;
  initialSection?: 'generator' | 'boosters' | 'characters' | 'balance' | 'parry-sim';
  onClose: () => void;
  baseCharacters: BaseCharacter[];
  onUpdateBaseCharacters: (chars: BaseCharacter[]) => void;
  balanceTables: Record<CardClass, ClassBalanceTable>;
  onUpdateBalanceTables: (tables: Record<CardClass, ClassBalanceTable>) => void;
  boosterModels: BoosterModel[];
  onUpdateBoosterModels: (models: BoosterModel[]) => void;
  decks: DeckCategory[];
  onGrantCardsToInventory: (cards: CardData[], selectFirst?: boolean) => void;
  onInspectCard: (card: CardData) => void;
}

export const ProceduralEcosystemModal: React.FC<ProceduralEcosystemModalProps> = ({
  isOpen,
  initialSection = 'boosters',
  onClose,
  baseCharacters,
  onUpdateBaseCharacters,
  balanceTables,
  onUpdateBalanceTables,
  boosterModels,
  onUpdateBoosterModels,
  decks,
  onGrantCardsToInventory,
  onInspectCard,
}) => {
  const [activeSection, setActiveSection] = useState<
    'generator' | 'boosters' | 'characters' | 'balance' | 'parry-sim'
  >(initialSection);

  // 1. Instant Procedural Generator State
  const [selectedCharId, setSelectedCharId] = useState<string>('RANDOM');
  const [selectedOrigin, setSelectedOrigin] = useState<CardOrigin>('Escaneamento');
  const [selectedClassOverride, setSelectedClassOverride] = useState<string>('AUTO');
  const [selectedRankOverride, setSelectedRankOverride] = useState<string>('AUTO');
  const [targetDeckId, setTargetDeckId] = useState<string>(decks[0]?.id || 'deck-main');
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [stagedGeneratedCards, setStagedGeneratedCards] = useState<CardData[]>([]);

  // 2. Booster Generator & Slot Editor State
  const [activeBoosterId, setActiveBoosterId] = useState<string>(
    boosterModels[0]?.id || 'booster-standard-9'
  );
  const [boosterBatchCount, setBoosterBatchCount] = useState<number>(1);
  const [openedBoosterCards, setOpenedBoosterCards] = useState<CardData[]>([]);
  const [boosterGranted, setBoosterGranted] = useState(false);

  // 3. Base Character Editor State
  const [editingCharId, setEditingCharId] = useState<string>(
    baseCharacters[0]?.id || 'char-lumys'
  );

  // 4. Balance Table Editor State
  const [editingBalanceClass, setEditingBalanceClass] = useState<CardClass>('Comum');

  // 5. Combat Economy (Parry & Stamina 3/6/9) + Statistical Simulator State
  const [playerStamina, setPlayerStamina] = useState<number>(9);
  const [parryBlockEfficiency, setParryBlockEfficiency] = useState<number>(80);
  const [attackers, setAttackers] = useState<ParryAttackerInput[]>([
    {
      id: 'atk-a',
      attackerName: 'Agressor A · Slime Comum',
      abilityName: 'Pulso Arcano',
      manaUsed: 3,
      incomingDamage: 350,
      selectedToDefend: true,
    },
    {
      id: 'atk-b',
      attackerName: 'Agressor B · Slime Raro',
      abilityName: 'Torrente Ancestral',
      manaUsed: 6,
      incomingDamage: 780,
      selectedToDefend: true,
    },
    {
      id: 'atk-c',
      attackerName: 'Agressor C · Slime Mítico',
      abilityName: 'Explosão Celestial',
      manaUsed: 9,
      incomingDamage: 1850,
      selectedToDefend: true,
    },
  ]);

  const [simCount, setSimCount] = useState<number>(10000);
  const [simMode, setSimMode] = useState<'scan' | 'drop' | 'booster-special'>('booster-special');
  const [simReport, setSimReport] = useState<SimulationSummary | null>(() =>
    runMonteCarloSimulation(10000, 'booster-special', baseCharacters, balanceTables)
  );

  if (!isOpen) return null;

  const activeBooster =
    boosterModels.find((b) => b.id === activeBoosterId) || boosterModels[0];

  const activeEditingChar =
    baseCharacters.find((c) => c.id === editingCharId) || baseCharacters[0];

  const currentClassTable = balanceTables[editingBalanceClass];

  // Sum of rank probabilities for validation
  const rankProbSum = OFFICIAL_RANKS.reduce(
    (sum, r) => sum + (currentClassTable?.ranks[r]?.rankProbability ?? 0),
    0
  );

  // Handlers
  const handleRunProceduralRoll = () => {
    const chosenChar =
      selectedCharId === 'RANDOM'
        ? undefined
        : baseCharacters.find((c) => c.id === selectedCharId);

    const results: CardData[] = [];
    const count = Math.max(1, Math.min(24, batchQuantity));
    for (let i = 0; i < count; i++) {
      results.push(
        generateProceduralCard({
          character: chosenChar,
          charactersPool: baseCharacters,
          balanceTables,
          origin: selectedOrigin,
          forcedClass:
            selectedClassOverride === 'AUTO'
              ? undefined
              : (selectedClassOverride as CardClass),
          forcedRank:
            selectedRankOverride === 'AUTO'
              ? undefined
              : (selectedRankOverride as CardRank),
          deckId: targetDeckId,
        })
      );
    }
    setStagedGeneratedCards(results);
  };

  const handleOpenBoosterPacks = () => {
    const packs = Math.max(1, Math.min(10, boosterBatchCount));
    const allCards: CardData[] = [];
    for (let p = 0; p < packs; p++) {
      const pack = generateBoosterPack(
        activeBooster,
        baseCharacters,
        balanceTables,
        targetDeckId
      );
      allCards.push(...pack);
    }
    setOpenedBoosterCards(allCards);
    setBoosterGranted(false);
  };

  const parryResult = evaluateParryDefense(
    attackers,
    playerStamina,
    parryBlockEfficiency
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[88vh] bg-[#0B0D13] border border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* Top Modal Header & Navigation Tabs */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-[#10141D] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
            <span className="text-sm font-bold text-white whitespace-nowrap shrink-0">
              Worlds of Slimelands · Motor Procedural
            </span>

            <nav className="flex items-center gap-1">
              {[
                { id: 'boosters', label: 'Boosters (9 Cartas)', icon: PackageOpen },
                { id: 'generator', label: 'Escaneamento & Drops', icon: Dices },
                { id: 'characters', label: 'Personagens & Magias', icon: Users },
                { id: 'balance', label: 'Classes, Ranks & Regras', icon: Sliders },
                { id: 'parry-sim', label: 'Parry & Simulador (100k)', icon: BarChart3 },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeSection === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSection(tab.id as typeof activeSection)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* =================================================================
              TAB 1: BOOSTERS (9 CARTAS: 4 COMUNS, 2 RARAS, 2 MAGIAS, 1 ESPECIAL A/S)
             ================================================================= */}
          {activeSection === 'boosters' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#121621] border border-slate-800 rounded-xl p-4">
                <div className="lg:col-span-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">
                      {activeBooster.name}
                    </h3>
                    <span className="text-xs font-mono tabular-nums text-emerald-400">
                      9 Cartas por Pacote
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {activeBooster.description}
                  </p>

                  {/* Official 9-Slot Distribution Summary */}
                  <div className="grid grid-cols-4 gap-2 pt-2">
                    <div className="p-2.5 rounded-lg bg-[#0B0D13] border border-slate-800/80">
                      <div className="text-[11px] text-slate-400">Slots 1 a 4</div>
                      <div className="text-xs font-bold text-white mt-0.5">
                        4× Classe Comum
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0B0D13] border border-slate-800/80">
                      <div className="text-[11px] text-slate-400">Slots 5 a 6</div>
                      <div className="text-xs font-bold text-sky-400 mt-0.5">
                        2× Classe Rara
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0B0D13] border border-slate-800/80">
                      <div className="text-[11px] text-slate-400">Slots 7 a 8</div>
                      <div className="text-xs font-bold text-purple-400 mt-0.5">
                        2× Cartas de Magia
                      </div>
                    </div>
                    <div className="p-2.5 rounded-lg bg-[#0B0D13] border border-slate-800/80">
                      <div className="text-[11px] text-slate-400">Slot 9 · Especial</div>
                      <div className="text-xs font-bold text-amber-400 mt-0.5">
                        1× Rank Alto (A ou S)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Booster Execution Controls */}
                <div className="flex flex-col justify-between bg-[#0B0D13] border border-slate-800 rounded-lg p-3.5 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Qtd. de Boosters
                      </label>
                      <select
                        value={boosterBatchCount}
                        onChange={(e) => setBoosterBatchCount(Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                      >
                        <option value={1}>1 Booster (9 cartas)</option>
                        <option value={2}>2 Boosters (18 cartas)</option>
                        <option value={5}>Lote 5 Boosters (45 cartas)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Deck de Destino
                      </label>
                      <select
                        value={targetDeckId}
                        onChange={(e) => setTargetDeckId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                      >
                        {decks.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={handleOpenBoosterPacks}
                    className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                  >
                    <PackageOpen className="w-4 h-4" />
                    <span>Gerar Booster ({boosterBatchCount * 9} Cartas)</span>
                  </button>
                </div>
              </div>

              {/* Generated Booster Pack Visual Grid */}
              {openedBoosterCards.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#121621] border border-slate-800 rounded-lg px-4 py-2.5">
                    <span className="text-xs font-semibold text-slate-200">
                      Resultado da Abertura ({openedBoosterCards.length} instâncias geradas — clique em qualquer carta para ver o Informativo Completo)
                    </span>

                    <button
                      onClick={() => {
                        if (!boosterGranted) {
                          onGrantCardsToInventory(openedBoosterCards, true);
                          setBoosterGranted(true);
                        }
                      }}
                      disabled={boosterGranted}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                        boosterGranted
                          ? 'bg-slate-800 text-emerald-400 cursor-default'
                          : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>
                        {boosterGranted
                          ? 'Cartas Concedidas à Galeria'
                          : 'Confirmar & Enviar todas para a Galeria'}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2.5">
                    {openedBoosterCards.map((card, idx) => {
                      const slotNum = (idx % 9) + 1;
                      const isSlot9 = slotNum === 9;
                      return (
                        <div
                          key={card.id}
                          onClick={() => onInspectCard(card)}
                          className={`p-1.5 rounded-lg border cursor-pointer transition-transform hover:-translate-y-1 flex flex-col ${
                            isSlot9
                              ? 'bg-amber-950/25 border-amber-500/80'
                              : 'bg-[#121620] border-slate-800 hover:border-slate-600'
                          }`}
                        >
                          <div className="text-[10px] font-mono tabular-nums text-slate-400 mb-1 flex items-center justify-between">
                            <span>#{slotNum}</span>
                            <span className="font-bold text-white">
                              {card.cardClass} · {card.cardRank}
                            </span>
                          </div>
                          <div className="w-full aspect-[680/990] rounded overflow-hidden bg-black pointer-events-none">
                            <CardFrameSVG
                              card={card}
                              interactive={false}
                              animateChroma={false}
                              idScope={`modal-booster-${card.id}`}
                            />
                          </div>
                          <div className="mt-1.5 text-[10px] font-semibold text-white truncate">
                            {card.title}
                          </div>
                          <div className="text-[9px] font-mono tabular-nums text-slate-400">
                            {card.entityType === 'Magia'
                              ? `Magia · ${card.summonStaminaCost} Mana`
                              : `${card.pvText} · Máx ${card.maxDamage}`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 2: ESCANEAMENTO, DROPS NO MAPA & GERAÇÃO INSTANTÂNEA
             ================================================================= */}
          {activeSection === 'generator' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 bg-[#121621] border border-slate-800 rounded-xl p-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Personagem-Base / Encontro
                  </label>
                  <select
                    value={selectedCharId}
                    onChange={(e) => setSelectedCharId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="RANDOM">Sorteio Elegível do Mapa</option>
                    {baseCharacters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.entityType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Origem da Obtenção
                  </label>
                  <select
                    value={selectedOrigin}
                    onChange={(e) => setSelectedOrigin(e.target.value as CardOrigin)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                  >
                    <option value="Escaneamento">Escaneamento no Mapa</option>
                    <option value="Drop de Mapa">Drop de Combate</option>
                    <option value="Booster">Slot Especial de Booster</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Classe
                    </label>
                    <select
                      value={selectedClassOverride}
                      onChange={(e) => setSelectedClassOverride(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                    >
                      <option value="AUTO">Probabilidade Real</option>
                      {OFFICIAL_CLASSES.filter((c) => balanceTables[c]?.enabled).map(
                        (cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">
                      Rank
                    </label>
                    <select
                      value={selectedRankOverride}
                      onChange={(e) => setSelectedRankOverride(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white"
                    >
                      <option value="AUTO">Probabilidade Real</option>
                      {OFFICIAL_RANKS.map((r) => (
                        <option key={r} value={r}>
                          Rank {r}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex items-end gap-2">
                  <div className="w-24">
                    <label className="block text-xs text-slate-400 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(Number(e.target.value) || 1)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-white font-mono tabular-nums"
                    />
                  </div>
                  <button
                    onClick={handleRunProceduralRoll}
                    className="flex-1 py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Dices className="w-4 h-4" />
                    <span>Gerar Agora</span>
                  </button>
                </div>
              </div>

              {stagedGeneratedCards.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-[#121621] border border-slate-800 rounded-lg px-4 py-2.5">
                    <span className="text-xs text-slate-300">
                      {stagedGeneratedCards.length} versão(ões) gerada(s) pelo motor procedural
                    </span>
                    <button
                      onClick={() => {
                        onGrantCardsToInventory(stagedGeneratedCards, true);
                        onClose();
                      }}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                    >
                      Adicionar à Galeria & Abrir no Estúdio
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                    {stagedGeneratedCards.map((card) => (
                      <div
                        key={card.id}
                        onClick={() => onInspectCard(card)}
                        className="p-2 rounded-xl bg-[#121620] border border-slate-800 hover:border-emerald-500/70 cursor-pointer flex flex-col"
                      >
                        <div className="w-full aspect-[680/990] rounded overflow-hidden bg-black pointer-events-none">
                          <CardFrameSVG
                            card={card}
                            interactive={false}
                            animateChroma={false}
                            idScope={`modal-staged-${card.id}`}
                          />
                        </div>
                        <div className="mt-2 flex items-center justify-between text-xs font-bold text-white">
                          <span className="truncate">{card.title}</span>
                          <span className="text-amber-400 font-mono">
                            {card.cardClass} · {card.cardRank}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
                          {card.pvText} · Máx {card.maxDamage} · {card.summonStaminaCost} Est.
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              TAB 3: CADASTRO DE PERSONAGENS-BASE & CARTAS DE MAGIA
             ================================================================= */}
          {activeSection === 'characters' && activeEditingChar && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Character List */}
              <div className="bg-[#121621] border border-slate-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Personagens-Base ({baseCharacters.length})
                  </span>
                  <button
                    onClick={() => {
                      const created = ensureCoherentCharacterFields(
                        {},
                        baseCharacters.length
                      );
                      onUpdateBaseCharacters([...baseCharacters, created]);
                      setEditingCharId(created.id);
                    }}
                    className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Novo Personagem
                  </button>
                </div>

                <div className="space-y-1.5 max-h-[62vh] overflow-y-auto pr-1">
                  {baseCharacters.map((ch) => (
                    <div
                      key={ch.id}
                      onClick={() => setEditingCharId(ch.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer flex items-center justify-between gap-2 ${
                        ch.id === editingCharId
                          ? 'bg-slate-800 border-emerald-500/80'
                          : 'bg-[#0B0D13] border-slate-800/80 hover:border-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {ch.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {ch.entityType} · {ch.element} · {ch.abilities.length} hab.
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            const dup = ensureCoherentCharacterFields({
                              ...ch,
                              id: `char-dup-${Date.now()}`,
                              name: `${ch.name} (Variante)`,
                            });
                            onUpdateBaseCharacters([...baseCharacters, dup]);
                            setEditingCharId(dup.id);
                          }}
                          className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                          title="Duplicar cadastro"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Character Detail & 4 Abilities Editor */}
              <div className="lg:col-span-2 bg-[#121621] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">
                      Nome do Personagem / Magia
                    </label>
                    <input
                      type="text"
                      value={activeEditingChar.name}
                      onChange={(e) =>
                        onUpdateBaseCharacters(
                          baseCharacters.map((c) =>
                            c.id === activeEditingChar.id
                              ? { ...c, name: e.target.value, isProvisional: false }
                              : c
                          )
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Tipo
                      </label>
                      <select
                        value={activeEditingChar.entityType}
                        onChange={(e) =>
                          onUpdateBaseCharacters(
                            baseCharacters.map((c) =>
                              c.id === activeEditingChar.id
                                ? {
                                    ...c,
                                    entityType: e.target.value as 'Criatura' | 'Magia',
                                  }
                                : c
                            )
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                      >
                        <option value="Criatura">Criatura</option>
                        <option value="Magia">Magia</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Elemento
                      </label>
                      <input
                        type="text"
                        value={activeEditingChar.element}
                        maxLength={6}
                        onChange={(e) =>
                          onUpdateBaseCharacters(
                            baseCharacters.map((c) =>
                              c.id === activeEditingChar.id
                                ? { ...c, element: e.target.value.toUpperCase() }
                                : c
                            )
                          )
                        }
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Descrição Oficial
                  </label>
                  <textarea
                    rows={2}
                    value={activeEditingChar.description}
                    onChange={(e) =>
                      onUpdateBaseCharacters(
                        baseCharacters.map((c) =>
                          c.id === activeEditingChar.id
                            ? { ...c, description: e.target.value, isProvisional: false }
                            : c
                        )
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                {/* Availability Checkboxes */}
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 pt-1">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeEditingChar.active}
                      onChange={(e) =>
                        onUpdateBaseCharacters(
                          baseCharacters.map((c) =>
                            c.id === activeEditingChar.id
                              ? { ...c, active: e.target.checked }
                              : c
                          )
                        )
                      }
                    />
                    <span>Cadastro Ativo</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeEditingChar.availableForScan}
                      onChange={(e) =>
                        onUpdateBaseCharacters(
                          baseCharacters.map((c) =>
                            c.id === activeEditingChar.id
                              ? { ...c, availableForScan: e.target.checked }
                              : c
                          )
                        )
                      }
                    />
                    <span>Disponível para Escaneamento</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeEditingChar.availableForDrops}
                      onChange={(e) =>
                        onUpdateBaseCharacters(
                          baseCharacters.map((c) =>
                            c.id === activeEditingChar.id
                              ? { ...c, availableForDrops: e.target.checked }
                              : c
                          )
                        )
                      }
                    />
                    <span>Disponível para Drops</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={activeEditingChar.availableForBoosters}
                      onChange={(e) =>
                        onUpdateBaseCharacters(
                          baseCharacters.map((c) =>
                            c.id === activeEditingChar.id
                              ? { ...c, availableForBoosters: e.target.checked }
                              : c
                          )
                        )
                      }
                    />
                    <span>Disponível em Boosters</span>
                  </label>
                </div>

                {/* Character's 4 Abilities */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-200">
                    Habilidades do Personagem (Preservadas em todas as versões geradas)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeEditingChar.abilities.map((ab, idx) => (
                      <div
                        key={ab.id}
                        className="p-2.5 rounded-lg bg-[#0B0D13] border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>
                            Prioridade #{ab.unlockPriority} · {ab.tier}
                          </span>
                          {idx === activeEditingChar.abilities.length - 1 && (
                            <span className="text-fuchsia-400">
                              Gratuita (∞) nas Míticas
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={ab.name}
                          onChange={(e) => {
                            const updatedAbs = activeEditingChar.abilities.map(
                              (item, i) =>
                                i === idx ? { ...item, name: e.target.value } : item
                            );
                            onUpdateBaseCharacters(
                              baseCharacters.map((c) =>
                                c.id === activeEditingChar.id
                                  ? { ...c, abilities: updatedAbs }
                                  : c
                              )
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white"
                        />
                        <input
                          type="text"
                          value={ab.description}
                          onChange={(e) => {
                            const updatedAbs = activeEditingChar.abilities.map(
                              (item, i) =>
                                i === idx
                                  ? { ...item, description: e.target.value }
                                  : item
                            );
                            onUpdateBaseCharacters(
                              baseCharacters.map((c) =>
                                c.id === activeEditingChar.id
                                  ? { ...c, abilities: updatedAbs }
                                  : c
                              )
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 4: EDITOR DE BALANCEAMENTO (CLASSES × RANKS & INCREMENTOS)
             ================================================================= */}
          {activeSection === 'balance' && currentClassTable && (
            <div className="space-y-4">
              {/* Class Selector Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121621] border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5">
                  {OFFICIAL_CLASSES.map((cls) => {
                    const enabled = balanceTables[cls]?.enabled;
                    return (
                      <button
                        key={cls}
                        onClick={() => setEditingBalanceClass(cls)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                          editingBalanceClass === cls
                            ? 'bg-emerald-600 text-white'
                            : enabled
                            ? 'bg-slate-900 text-slate-300 hover:text-white'
                            : 'bg-slate-950 text-slate-600'
                        }`}
                      >
                        {cls} {!enabled && '(Inativa)'}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-200">
                    <input
                      type="checkbox"
                      checked={currentClassTable.enabled}
                      onChange={(e) =>
                        onUpdateBalanceTables({
                          ...balanceTables,
                          [editingBalanceClass]: {
                            ...currentClassTable,
                            enabled: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>Classe Habilitada no Jogo</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer text-fuchsia-300">
                    <input
                      type="checkbox"
                      checked={currentClassTable.guaranteedFreeAbility}
                      onChange={(e) =>
                        onUpdateBalanceTables({
                          ...balanceTables,
                          [editingBalanceClass]: {
                            ...currentClassTable,
                            guaranteedFreeAbility: e.target.checked,
                          },
                        })
                      }
                    />
                    <span>1 Habilidade Gratuita (0 Mana / ∞)</span>
                  </label>
                </div>
              </div>

              {/* 5 Ranks (S > A > B > C > D) Table for the Selected Class */}
              <div className="bg-[#121621] border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
                  <span className="font-bold text-white">
                    Tabela de Atributos & Incrementos — Classe {editingBalanceClass} (Ordem S &gt; A &gt; B &gt; C &gt; D)
                  </span>
                  <span
                    className={`font-mono tabular-nums font-bold ${
                      Math.abs(rankProbSum - 100) < 0.01
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    Soma das Probabilidades de Rank: {rankProbSum}%
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-[#0B0D13]">
                        <th className="p-3">Rank</th>
                        <th className="p-3">PV Mín</th>
                        <th className="p-3">PV Máx</th>
                        <th className="p-3">Incr. PV</th>
                        <th className="p-3">Dano Mín</th>
                        <th className="p-3">Dano Máx (Teto)</th>
                        <th className="p-3">Incr. Dano</th>
                        <th className="p-3">Invocação (Est.)</th>
                        <th className="p-3">Chance (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {OFFICIAL_RANKS.map((r) => {
                        const rule = currentClassTable.ranks[r];
                        const updateRankField = (
                          field: keyof typeof rule,
                          val: number
                        ) => {
                          onUpdateBalanceTables({
                            ...balanceTables,
                            [editingBalanceClass]: {
                              ...currentClassTable,
                              ranks: {
                                ...currentClassTable.ranks,
                                [r]: {
                                  ...rule,
                                  [field]: val,
                                },
                              },
                            },
                          });
                        };

                        return (
                          <tr key={r} className="hover:bg-slate-900/50">
                            <td className="p-3 font-bold text-amber-400">
                              Rank {r}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.pvMin}
                                onChange={(e) =>
                                  updateRankField('pvMin', Number(e.target.value))
                                }
                                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.pvMax}
                                onChange={(e) =>
                                  updateRankField('pvMax', Number(e.target.value))
                                }
                                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={rule.pvIncrement}
                                onChange={(e) =>
                                  updateRankField(
                                    'pvIncrement',
                                    Number(e.target.value)
                                  )
                                }
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400"
                              >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.damageMin}
                                onChange={(e) =>
                                  updateRankField(
                                    'damageMin',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-20 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.damageMax}
                                onChange={(e) =>
                                  updateRankField(
                                    'damageMax',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-24 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-rose-400 font-bold"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={rule.damageIncrement}
                                onChange={(e) =>
                                  updateRankField(
                                    'damageIncrement',
                                    Number(e.target.value)
                                  )
                                }
                                className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-emerald-400"
                              >
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                              </select>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={9}
                                  value={rule.summonCostMin}
                                  onChange={(e) =>
                                    updateRankField(
                                      'summonCostMin',
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300"
                                />
                                <span>a</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={9}
                                  value={rule.summonCostMax}
                                  onChange={(e) =>
                                    updateRankField(
                                      'summonCostMax',
                                      Number(e.target.value)
                                    )
                                  }
                                  className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-amber-300"
                                />
                              </div>
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={rule.rankProbability}
                                onChange={(e) =>
                                  updateRankField(
                                    'rankProbability',
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              TAB 5: ECONOMIA DE COMBATE (PARRY = MANA × 0,5) & SIMULADOR 100K
             ================================================================= */}
          {activeSection === 'parry-sim' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Parry & Stamina Economy Calculator (Section 9, 10, 11) */}
              <div className="bg-[#121621] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Shield className="w-4 h-4 text-amber-400" />
                      <span>Calculadora de Parry & Estamina (Marcos 3 / 6 / 9)</span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Fórmula oficial: Custo de Parry = Mana consumida pelo agressor × 0,5
                    </p>
                  </div>
                </div>

                {/* Stamina Bar (3, 6, 9 Milestones) */}
                <div className="p-3 rounded-lg bg-[#0B0D13] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">
                      Estamina Disponível do Defensor (Máx 9):
                    </span>
                    <div className="flex items-center gap-1.5 font-mono tabular-nums">
                      {[3, 6, 9].map((milestone) => (
                        <button
                          key={milestone}
                          onClick={() => setPlayerStamina(milestone)}
                          className={`px-2 py-0.5 rounded text-xs font-bold ${
                            playerStamina === milestone
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {milestone} Est.
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={9}
                    step={0.5}
                    value={playerStamina}
                    onChange={(e) => setPlayerStamina(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Multiple Attackers List */}
                <div className="space-y-2">
                  {parryResult.breakdown.map((atk, idx) => (
                    <div
                      key={atk.id}
                      className="p-2.5 rounded-lg bg-[#0B0D13] border border-slate-800 flex items-center justify-between gap-3 text-xs"
                    >
                      <label className="flex items-center gap-2 cursor-pointer min-w-0">
                        <input
                          type="checkbox"
                          checked={atk.selectedToDefend}
                          onChange={(e) =>
                            setAttackers(
                              attackers.map((item, i) =>
                                i === idx
                                  ? { ...item, selectedToDefend: e.target.checked }
                                  : item
                              )
                            )
                          }
                        />
                        <span className="font-semibold text-white truncate">
                          {atk.attackerName}
                        </span>
                      </label>

                      <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                        <span className="text-slate-400">Mana:</span>
                        <input
                          type="number"
                          min={1}
                          max={9}
                          value={atk.manaUsed}
                          onChange={(e) =>
                            setAttackers(
                              attackers.map((item, i) =>
                                i === idx
                                  ? {
                                      ...item,
                                      manaUsed: Math.max(
                                        1,
                                        Math.min(9, Number(e.target.value) || 1)
                                      ),
                                    }
                                  : item
                              )
                            )
                          }
                          className="w-12 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-sky-400 text-center"
                        />
                        <span className="text-amber-400 font-bold">
                          → Parry: {atk.parryStaminaCost.toFixed(1).replace('.0', '')} Est.
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Parry Verification Summary */}
                <div className="p-3 rounded-lg bg-[#0B0D13] border border-slate-800 flex items-center justify-between text-xs font-mono tabular-nums">
                  <div>
                    <div className="text-slate-400">
                      Custo Total de Parry:{' '}
                      <span className="text-amber-400 font-bold">
                        {parryResult.totalStaminaCost.toFixed(1).replace('.0', '')} / {playerStamina} Estamina
                      </span>
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Estamina Restante: {parryResult.remainingStamina.toFixed(1).replace('.0', '')} Est.
                    </div>
                  </div>
                  <div
                    className={`px-3 py-1.5 rounded font-bold ${
                      parryResult.canAffordAllSelected
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/60'
                        : 'bg-rose-950/80 text-rose-400 border border-rose-700/60'
                    }`}
                  >
                    {parryResult.canAffordAllSelected
                      ? 'Defesa Autorizada'
                      : 'Estamina Insuficiente'}
                  </div>
                </div>
              </div>

              {/* Right: Monte Carlo Statistical Simulator (Section 19) */}
              <div className="bg-[#121621] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Simulador Estatístico de Probabilidades
                    </h3>
                    <p className="text-xs text-slate-400">
                      Simula gerações em memória sem conceder cartas reais ao inventário
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[100, 1000, 10000, 100000].map((n) => (
                      <button
                        key={n}
                        onClick={() => {
                          setSimCount(n);
                          setSimReport(
                            runMonteCarloSimulation(
                              n,
                              simMode,
                              baseCharacters,
                              balanceTables
                            )
                          );
                        }}
                        className={`px-2 py-1 rounded text-xs font-mono tabular-nums font-bold ${
                          simCount === n
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-900 text-slate-300 hover:text-white'
                        }`}
                      >
                        {n >= 1000 ? `${n / 1000}k` : n}
                      </button>
                    ))}
                  </div>
                </div>

                {simReport && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-4 gap-2 text-center font-mono tabular-nums">
                      <div className="p-2 rounded bg-[#0B0D13] border border-slate-800">
                        <div className="text-[10px] text-slate-400">Média PV</div>
                        <div className="text-xs font-bold text-emerald-400">
                          {simReport.avgPv}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-[#0B0D13] border border-slate-800">
                        <div className="text-[10px] text-slate-400">Média Dano</div>
                        <div className="text-xs font-bold text-rose-400">
                          {simReport.avgMaxDamage}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-[#0B0D13] border border-slate-800">
                        <div className="text-[10px] text-slate-400">Míticas</div>
                        <div className="text-xs font-bold text-fuchsia-400">
                          {simReport.mythicCount}
                        </div>
                      </div>
                      <div className="p-2 rounded bg-[#0B0D13] border border-slate-800">
                        <div className="text-[10px] text-slate-400">Limitadas</div>
                        <div className="text-xs font-bold text-amber-400">
                          {simReport.limitedCount}
                        </div>
                      </div>
                    </div>

                    <table className="w-full text-left text-xs font-mono tabular-nums border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-1.5">Classe</th>
                          <th className="py-1.5">Configurado</th>
                          <th className="py-1.5">Observado</th>
                          <th className="py-1.5 text-right">Qtd ({simReport.totalCards})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {simReport.expectedVsObserved.map((row) => (
                          <tr key={row.cardClass}>
                            <td className="py-1.5 font-bold text-white">
                              {row.cardClass}
                            </td>
                            <td className="py-1.5 text-slate-400">
                              {row.configuredPct}%
                            </td>
                            <td className="py-1.5 text-emerald-400">
                              {row.observedPct}%
                            </td>
                            <td className="py-1.5 text-right text-slate-200">
                              {row.count}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
