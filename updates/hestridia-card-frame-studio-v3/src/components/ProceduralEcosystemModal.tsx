import React, { useState } from 'react';
import {
  X,
  PackageOpen,
  ShoppingBag,
  History,
  Shield,
  Swords,
  Layers,
  Sparkles,
  Sliders,
  Users,
  BarChart3,
  Check,
  RotateCcw,
  Plus,
  Coins,
  ArrowRight,
} from 'lucide-react';
import { CardData } from '../types/card';
import {
  BaseCharacter,
  BoosterModel,
  BoosterOpenHistoryEntry,
  CardClass,
  ClassBalanceTable,
  DeckCategory,
  ParryAttackerInput,
  SimulationSummary,
  SubgroupCatalog,
} from '../types/slimelands';
import {
  OFFICIAL_CLASSES,
  OFFICIAL_RANKS,
  evaluateParryDefense,
  generateBoosterPack,
  getEligibleMatricesForPack,
  runMonteCarloSimulation,
  ensureCoherentCharacterFields,
} from '../utils/proceduralEngine';
import { CardFrameSVG } from './CardFrameSVG';

interface ProceduralEcosystemModalProps {
  isOpen: boolean;
  initialSection?:
    | 'boosters'
    | 'inventory-board'
    | 'packs-admin'
    | 'characters'
    | 'balance'
    | 'parry-sim'
    | 'generator';
  onClose: () => void;
  matrixCards: CardData[];
  playerInventory: CardData[];
  onUpdatePlayerInventory: (inventory: CardData[]) => void;
  playerCoins: number;
  onUpdatePlayerCoins: (coins: number) => void;
  boosterStock: Record<string, number>;
  onUpdateBoosterStock: (stock: Record<string, number>) => void;
  boosterHistory: BoosterOpenHistoryEntry[];
  onUpdateBoosterHistory: (history: BoosterOpenHistoryEntry[]) => void;
  baseCharacters: BaseCharacter[];
  onUpdateBaseCharacters: (chars: BaseCharacter[]) => void;
  balanceTables: Record<CardClass, ClassBalanceTable>;
  onUpdateBalanceTables: (tables: Record<CardClass, ClassBalanceTable>) => void;
  boosterModels: BoosterModel[];
  onUpdateBoosterModels: (models: BoosterModel[]) => void;
  decks: DeckCategory[];
  subgroupCatalog: SubgroupCatalog;
  onUpdateSubgroupCatalog: (catalog: SubgroupCatalog) => void;
  onInspectCard: (card: CardData) => void;
  onSelectCardForStudio?: (cardId: string) => void;
}

export const ProceduralEcosystemModal: React.FC<ProceduralEcosystemModalProps> = ({
  isOpen,
  initialSection = 'boosters',
  onClose,
  matrixCards,
  playerInventory,
  onUpdatePlayerInventory,
  playerCoins,
  onUpdatePlayerCoins,
  boosterStock,
  onUpdateBoosterStock,
  boosterHistory,
  onUpdateBoosterHistory,
  baseCharacters,
  onUpdateBaseCharacters,
  balanceTables,
  onUpdateBalanceTables,
  boosterModels,
  onUpdateBoosterModels,
  decks,
  subgroupCatalog,
  onInspectCard,
  onSelectCardForStudio,
}) => {
  const [activeSection, setActiveSection] = useState<
    | 'boosters'
    | 'inventory-board'
    | 'packs-admin'
    | 'characters'
    | 'balance'
    | 'parry-sim'
  >(initialSection === 'generator' ? 'packs-admin' : initialSection);

  // Active selected Booster for Opening / Shop
  const [activeBoosterId, setActiveBoosterId] = useState<string>(
    boosterModels[0]?.id || 'booster-standard-9'
  );

  // Active 9-Card Reveal Screen State (Section 14)
  const [activeRevealEntry, setActiveRevealEntry] = useState<BoosterOpenHistoryEntry | null>(null);
  const [revealedSlotIndex, setRevealedSlotIndex] = useState<number>(9); // 9 = all revealed

  // Player Board Combat Simulator State (Section 11, 16 & 17)
  const [deployedBoardCardId, setDeployedBoardCardId] = useState<string | null>(null);
  const [boardStamina, setBoardStamina] = useState<number>(9);
  const [boardMana, setBoardMana] = useState<number>(9);
  const [parryEfficiency, setParryEfficiency] = useState<number>(80);

  const [attackers, setAttackers] = useState<ParryAttackerInput[]>([
    {
      id: 'atk-1',
      attackerName: 'Slime Verde Agressor',
      abilityName: 'Impacto Viscoso',
      manaUsed: 3, // Parry cost = 1.5 Stamina
      incomingDamage: 380,
      selectedToDefend: true,
    },
    {
      id: 'atk-2',
      attackerName: 'Slime Tóxico de Pântano',
      abilityName: 'Torrente Venenosa',
      manaUsed: 6, // Parry cost = 3.0 Stamina
      incomingDamage: 850,
      selectedToDefend: true,
    },
    {
      id: 'atk-3',
      attackerName: 'Herisdia Corrompida',
      abilityName: 'Cataclismo Astral',
      manaUsed: 9, // Parry cost = 4.5 Stamina
      incomingDamage: 1950,
      selectedToDefend: false,
    },
  ]);

  // Admin Editors State
  const [editingPackId, setEditingPackId] = useState<string>(
    boosterModels[0]?.id || 'booster-standard-9'
  );
  const [editingCharId, setEditingCharId] = useState<string>(
    baseCharacters[0]?.id || 'char-slime-verde'
  );
  const [editingBalanceClass, setEditingBalanceClass] = useState<CardClass>('Comum');

  // Monte Carlo Simulator State
  const [simCount, setSimCount] = useState<number>(10000);
  const [simMode, setSimMode] = useState<'scan' | 'drop' | 'booster-special'>('booster-special');
  const [simReport, setSimReport] = useState<SimulationSummary | null>(() =>
    runMonteCarloSimulation(10000, 'booster-special', baseCharacters, balanceTables)
  );

  if (!isOpen) return null;

  const activeBooster =
    boosterModels.find((b) => b.id === activeBoosterId) || boosterModels[0];

  const stockCount = boosterStock[activeBooster.id] ?? 0;
  const boosterPrice = activeBooster.priceCoins ?? 150;

  const deployedCard =
    playerInventory.find((c) => c.id === deployedBoardCardId) ||
    playerInventory[0] ||
    null;

  const activeEditingChar =
    baseCharacters.find((c) => c.id === editingCharId) || baseCharacters[0];

  const currentClassTable = balanceTables[editingBalanceClass];

  const rankProbSum = OFFICIAL_RANKS.reduce(
    (sum, r) => sum + (currentClassTable?.ranks[r]?.rankProbability ?? 0),
    0
  );

  /**
   * SECTION 14: FLUXO CORRETO DOS BOOSTERS
   * 1. Jogador seleciona o booster.
   * 2. Clica em Abrir.
   * 3. O sistema consulta o pack.
   * 4. O pack seleciona as matrizes elegíveis.
   * 5. O motor gera as instâncias individuais (9 cartas com IDs únicos).
   * 6. O sistema registra o resultado no histórico.
   * 7. Consome o booster.
   * 8. Concede as nove cartas ao inventário do jogador.
   * 9. Apresenta a revelação (sem menus administrativos, sem re-sorteios durante a animação).
   */
  const handleOpenBoosterDirect = (boosterToOpen: BoosterModel) => {
    // Check if player has stock; if not, check coins and auto-buy
    const currentStock = boosterStock[boosterToOpen.id] ?? 0;
    const price = boosterToOpen.priceCoins ?? 150;

    if (currentStock <= 0) {
      if (playerCoins < price) {
        alert(
          `Você precisa de ${price} moedas para adquirir este booster (Saldo atual: ${playerCoins} moedas). Ganhe moedas ou selecione outro pacote.`
        );
        return;
      }
      // Deduct coins & open
      onUpdatePlayerCoins(playerCoins - price);
    } else {
      // Consume 1 from stock
      onUpdateBoosterStock({
        ...boosterStock,
        [boosterToOpen.id]: Math.max(0, currentStock - 1),
      });
    }

    // Step 3, 4, 5: Generate 9 instances using Matrix references and procedural engine
    const nineInstances = generateBoosterPack(
      boosterToOpen,
      baseCharacters,
      balanceTables,
      'deck-main',
      matrixCards
    );

    // Step 6: Register confirmed result in history
    const historyEntry: BoosterOpenHistoryEntry = {
      id: `open-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      boosterId: boosterToOpen.id,
      boosterName: boosterToOpen.name,
      openedAt: new Date().toISOString(),
      instanceIds: nineInstances.map((c) => c.id),
      cards: nineInstances,
    };

    onUpdateBoosterHistory([historyEntry, ...boosterHistory]);

    // Step 8: Grant instances to player inventory
    onUpdatePlayerInventory([...nineInstances, ...playerInventory]);

    // Step 9: Present reveal
    setActiveRevealEntry(historyEntry);
    setRevealedSlotIndex(9);
  };

  const handleBuyBoosterStock = (booster: BoosterModel) => {
    const price = booster.priceCoins ?? 150;
    if (playerCoins < price) {
      alert(`Moedas insuficientes! Preço: ${price} moedas, Saldo: ${playerCoins}.`);
      return;
    }
    onUpdatePlayerCoins(playerCoins - price);
    onUpdateBoosterStock({
      ...boosterStock,
      [booster.id]: (boosterStock[booster.id] ?? 0) + 1,
    });
  };

  const parryCalculation = evaluateParryDefense(
    attackers,
    boardStamina,
    parryEfficiency
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[92vh] bg-[#0A0D14] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100"
      >
        {/* =====================================================================
            TOP MODAL HEADER & DUAL MODE NAVIGATION (PLAYER / ADMIN)
           ===================================================================== */}
        <div className="px-5 py-3 border-b border-slate-800 bg-[#0F131D] flex items-center justify-between gap-4 shrink-0 flex-wrap">
          {/* Left: Brand + Navigation Tabs */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white tracking-wide font-['Outfit',sans-serif]">
                Worlds of Slimelands
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Packs & Ecossistema
              </span>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => {
                  setActiveSection('boosters');
                  setActiveRevealEntry(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeSection === 'boosters'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <PackageOpen className="w-3.5 h-3.5" />
                <span>Loja & Boosters (9 Cartas)</span>
              </button>

              <button
                onClick={() => setActiveSection('inventory-board')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                  activeSection === 'inventory-board'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                <span>Inventário & Tabuleiro ({playerInventory.length})</span>
              </button>

              <div className="w-[1px] h-4 bg-slate-800 mx-1" />

              <button
                onClick={() => setActiveSection('packs-admin')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeSection === 'packs-admin'
                    ? 'bg-slate-800 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Configurar regras e filtros dos Packs de distribuição (Seção 12)"
              >
                <Sliders className="w-3 h-3 text-emerald-400" />
                <span>Filtros de Packs</span>
              </button>

              <button
                onClick={() => setActiveSection('balance')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeSection === 'balance'
                    ? 'bg-slate-800 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sliders className="w-3 h-3 text-sky-400" />
                <span>Classes & Balanceamento</span>
              </button>

              <button
                onClick={() => setActiveSection('characters')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeSection === 'characters'
                    ? 'bg-slate-800 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-3 h-3 text-purple-400" />
                <span>Modelos Base</span>
              </button>

              <button
                onClick={() => setActiveSection('parry-sim')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  activeSection === 'parry-sim'
                    ? 'bg-slate-800 text-emerald-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <BarChart3 className="w-3 h-3 text-amber-400" />
                <span>Simulador 100k</span>
              </button>
            </nav>
          </div>

          {/* Right: Player Coins & Close */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-amber-950/40 border border-amber-500/40 rounded-xl px-3 py-1.5 text-xs font-extrabold text-amber-300 font-mono">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{playerCoins} Moedas</span>
              <button
                onClick={() => onUpdatePlayerCoins(playerCoins + 500)}
                className="ml-1 text-[10px] text-amber-400 hover:text-amber-200 underline"
                title="Adicionar moedas de teste"
              >
                +500
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* =================================================================
              1. PLAYER BOOSTER OPENING & SHOP (SEÇÕES 13, 14, 15 & 17)
              Clean, direct flow without administrative menus!
             ================================================================= */}
          {activeSection === 'boosters' && !activeRevealEntry && (
            <div className="space-y-6">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-[#121624] via-[#0E131F] to-[#121624] border border-slate-800 rounded-2xl p-5 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <PackageOpen className="w-5 h-5 text-amber-400" />
                    <h2 className="text-lg font-extrabold text-white">
                      Loja & Abertura Oficial de Boosters
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    Cada pacote contém <strong>9 cartas</strong> oficiais: <strong>4 Comuns</strong>, <strong>2 Raras</strong>, <strong>2 Magias</strong> e <strong>1 Carta Especial garantida de Rank Alto (A ou S)</strong>. Ao abrir, o motor procedural consulta a Matriz e gera atributos únicos para seu inventário.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[11px] text-slate-400">Total no Inventário</div>
                    <div className="text-base font-extrabold text-emerald-400 font-mono">
                      {playerInventory.length} Cartas
                    </div>
                  </div>
                  {boosterHistory.length > 0 && (
                    <button
                      onClick={() => setActiveRevealEntry(boosterHistory[0])}
                      className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-colors"
                      title="Ver o último booster aberto"
                    >
                      <History className="w-3.5 h-3.5 text-sky-400" />
                      <span>Último Aberto</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Booster Packs Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {boosterModels.map((booster) => {
                  const stock = boosterStock[booster.id] ?? 0;
                  const price = booster.priceCoins ?? 150;
                  const isSelected = activeBoosterId === booster.id;
                  const eligibleCount = getEligibleMatricesForPack(
                    booster,
                    matrixCards,
                    balanceTables
                  ).length;

                  return (
                    <div
                      key={booster.id}
                      onClick={() => setActiveBoosterId(booster.id)}
                      className={`relative rounded-2xl p-4 border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'bg-[#141A28] border-amber-400 ring-2 ring-amber-400/40 shadow-xl'
                          : 'bg-[#101420] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Top Badges */}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                            {booster.themeLabel || 'Geral'}
                          </span>
                          <span className="text-xs font-bold text-amber-300 font-mono">
                            {stock > 0 ? `${stock} em estoque` : `${price} Moedas`}
                          </span>
                        </div>

                        <h3 className="text-base font-extrabold text-white">
                          {booster.name}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {booster.description}
                        </p>

                        {/* Filter Badges Preview */}
                        <div className="mt-3 flex items-center gap-1 flex-wrap text-[10px]">
                          {booster.filters?.biomes && booster.filters.biomes.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold">
                              Bioma: {booster.filters.biomes.join(', ')}
                            </span>
                          )}
                          {booster.filters?.families && booster.filters.families.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300">
                              {booster.filters.families.join(', ')}
                            </span>
                          )}
                          {booster.filters?.collections &&
                            booster.filters.collections.length > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-purple-950/60 border border-purple-500/40 text-purple-300">
                                {booster.filters.collections.join(', ')}
                              </span>
                            )}
                          <span className="px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 font-mono">
                            {eligibleCount} matrizes elegíveis
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons for this Booster */}
                      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBuyBoosterStock(booster);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1 transition-colors"
                          title="Comprar mais um pacote para seu estoque de boosters"
                        >
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                          <span>Comprar ({price} M.)</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenBoosterDirect(booster);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md"
                          title="Abrir este Booster de 9 cartas imediatamente"
                        >
                          <PackageOpen className="w-4 h-4" />
                          <span>Abrir Booster</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* History of Confirmed Booster Openings (Section 14: "O resultado já confirmado deverá permanecer recuperável.") */}
              {boosterHistory.length > 0 && (
                <div className="bg-[#101420] border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-white flex items-center gap-1.5">
                      <History className="w-4 h-4 text-sky-400" />
                      <span>Histórico de Boosters Abertos ({boosterHistory.length})</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Resultados confirmados gravados sem re-sorteios
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
                    {boosterHistory.map((hist, idx) => {
                      const slot9Card = hist.cards[8];
                      return (
                        <div
                          key={hist.id}
                          onClick={() => setActiveRevealEntry(hist)}
                          className="p-2.5 rounded-xl bg-[#0B0E17] border border-slate-800 hover:border-slate-700 cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div>
                            <div className="text-xs font-bold text-white">
                              {hist.boosterName} #{boosterHistory.length - idx}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {new Date(hist.openedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })} · Especial: {slot9Card?.title} ({slot9Card?.cardClass} · {slot9Card?.cardRank})
                            </div>
                          </div>
                          <button className="px-2 py-1 rounded bg-slate-800 text-[10px] font-bold text-sky-300 hover:bg-slate-700">
                            Ver 9
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =================================================================
              1b. 9-CARD REVEAL SCREEN (SEÇÃO 14)
              Displays the 9 generated instances with zero extra rolls
             ================================================================= */}
          {activeSection === 'boosters' && activeRevealEntry && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-[#121624] border border-slate-800 rounded-xl px-4 py-3 flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-extrabold text-white">
                      Revelação: {activeRevealEntry.boosterName} (9 Cartas Concedidas)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Todas as 9 instâncias foram adicionadas diretamente ao seu inventário com atributos próprios.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setActiveSection('inventory-board');
                      setActiveRevealEntry(null);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Ver no Inventário & Tabuleiro</span>
                  </button>
                  <button
                    onClick={() => setActiveRevealEntry(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
                  >
                    Voltar aos Boosters
                  </button>
                </div>
              </div>

              {/* 9 Card Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
                {activeRevealEntry.cards.map((card, idx) => {
                  const slotNum = idx + 1;
                  const isSpecialSlot = slotNum === 9;
                  const isRevealed = slotNum <= revealedSlotIndex;

                  return (
                    <div
                      key={card.id}
                      onClick={() => onInspectCard(card)}
                      className={`rounded-xl p-2 border cursor-pointer transition-all flex flex-col ${
                        isSpecialSlot
                          ? 'bg-amber-950/20 border-amber-500/80 ring-2 ring-amber-400/40 shadow-lg'
                          : 'bg-[#101420] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {/* Slot Header */}
                      <div className="flex items-center justify-between text-[10px] font-mono tabular-nums mb-1">
                        <span className="text-slate-400">Slot {slotNum}</span>
                        <span
                          className={`font-bold ${
                            isSpecialSlot ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {card.cardClass} · {card.cardRank}
                        </span>
                      </div>

                      {/* Card Thumbnail */}
                      <div className="w-full aspect-[680/990] rounded overflow-hidden bg-black relative pointer-events-none">
                        <CardFrameSVG
                          card={card}
                          interactive={false}
                          animateChroma={false}
                          idScope={`reveal-${card.id}`}
                        />
                      </div>

                      {/* Card Stats */}
                      <div className="mt-2 text-[11px] font-bold text-white truncate">
                        {card.title}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {card.entityType === 'Magia'
                          ? `Magia · Mana ${card.summonStaminaCost || 3}`
                          : card.entityType === 'Item'
                          ? 'Item'
                          : `${card.pvText} · ${card.summonStaminaCost} Est.`}
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeployedBoardCardId(card.id);
                          setActiveSection('inventory-board');
                        }}
                        className="mt-2 w-full py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-emerald-300"
                      >
                        Tabuleiro →
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              2. INVENTÁRIO DO JOGADOR & SIMULADOR DE TABULEIRO
              (SEÇÕES 11, 14, 16 & 17)
             ================================================================= */}
          {activeSection === 'inventory-board' && (
            <div className="space-y-6">
              {/* Combat Board HUD */}
              <div className="bg-[#121624] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Swords className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-base font-extrabold text-white">
                      Tabuleiro de Combate & Economia de Parry
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 font-mono text-xs font-bold">
                    <div className="px-3 py-1.5 rounded-xl bg-sky-950/50 border border-sky-500/40 text-sky-300">
                      Mana Máx: 9 (Atual: {boardMana})
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-300">
                      Estamina Máx: 9 (Atual: {boardStamina})
                    </div>
                  </div>
                </div>

                {deployedCard ? (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 bg-[#0B0D13] border border-slate-800/80 rounded-xl p-4 items-center">
                    {/* Deployed Card Overview */}
                    <div className="flex items-center gap-3">
                      <div className="w-20 aspect-[680/990] rounded overflow-hidden bg-black shrink-0 pointer-events-none">
                        <CardFrameSVG
                          card={deployedCard}
                          interactive={false}
                          animateChroma={false}
                          idScope={`board-${deployedCard.id}`}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase font-bold text-emerald-400">
                          Carta em Campo (Instância)
                        </div>
                        <div className="text-sm font-extrabold text-white truncate">
                          {deployedCard.title}
                        </div>
                        <div className="text-xs text-slate-300 font-mono">
                          {deployedCard.cardClass} · Rank {deployedCard.cardRank} ·{' '}
                          {deployedCard.pvText}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          ID: {deployedCard.id.slice(0, 14)}...
                        </div>
                      </div>
                    </div>

                    {/* Attacks / Abilities of this Instance */}
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">
                        Ataques Disponíveis (Consumo de Mana)
                      </span>
                      <div className="space-y-1">
                        {deployedCard.generatedAbilities?.map((ab) => (
                          <div
                            key={ab.id}
                            className="flex items-center justify-between text-xs bg-slate-900 px-2.5 py-1 rounded"
                          >
                            <span className="font-semibold text-white truncate">
                              {ab.name}
                            </span>
                            <span className="font-mono text-amber-300 font-bold shrink-0 ml-2">
                              {ab.isFree ? '0 Mana (∞)' : `${ab.manaCost} Mana`} ·{' '}
                              {ab.damage} Dano
                            </span>
                          </div>
                        )) || (
                          <div className="text-xs text-slate-500">
                            Nenhuma habilidade gerada.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Parry Defense Breakdown against incoming attackers (Section 11) */}
                    <div className="space-y-1 bg-slate-900/80 border border-slate-800 p-2.5 rounded-lg text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Parry (50% da Mana do Agressor)</span>
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            parryCalculation.canAffordAllSelected
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          Custo: {parryCalculation.totalStaminaCost} Est.
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {parryCalculation.canAffordAllSelected
                          ? `Defesa viável! Sobram ${parryCalculation.remainingStamina} de estamina.`
                          : 'Estamina insuficiente para parry de todos os selecionados!'}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-300">
                        Dano Bloqueado: {parryCalculation.totalBlockedDamage} · Passou:{' '}
                        {parryCalculation.totalUnblockedDamage}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-[#0B0D13] border border-slate-800 text-center text-xs text-slate-400">
                    Selecione uma carta do seu inventário abaixo para enviar ao Tabuleiro.
                  </div>
                )}
              </div>

              {/* Complete Player Inventory Cards Grid (Section 7, 8 & 17) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-extrabold text-white">
                      Instâncias no Inventário do Jogador ({playerInventory.length})
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    Clique em qualquer carta para abrir o Informativo Oficial com seus dados individuais
                  </span>
                </div>

                {playerInventory.length === 0 ? (
                  <div className="p-8 rounded-xl bg-[#101420] border border-dashed border-slate-800 text-center">
                    <p className="text-xs text-slate-400">
                      Seu inventário de jogador ainda está vazio.
                    </p>
                    <button
                      onClick={() => setActiveSection('boosters')}
                      className="mt-3 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950"
                    >
                      Abrir Booster de 9 Cartas
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
                    {playerInventory.map((instance) => {
                      const isDeployed = deployedBoardCardId === instance.id;

                      return (
                        <div
                          key={instance.id}
                          onClick={() => onInspectCard(instance)}
                          className={`rounded-xl p-2 border cursor-pointer transition-all flex flex-col ${
                            isDeployed
                              ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400/40'
                              : 'bg-[#101420] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="text-[10px] font-mono text-slate-400 flex items-center justify-between mb-1">
                            <span className="font-bold text-white">
                              {instance.cardClass} · {instance.cardRank}
                            </span>
                            <span>{instance.pvText}</span>
                          </div>

                          <div className="w-full aspect-[680/990] rounded overflow-hidden bg-black pointer-events-none">
                            <CardFrameSVG
                              card={instance}
                              interactive={false}
                              animateChroma={false}
                              idScope={`inv-${instance.id}`}
                            />
                          </div>

                          <div className="mt-2 text-[11px] font-bold text-white truncate">
                            {instance.title}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {instance.entityType || 'Criatura'}
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeployedBoardCardId(instance.id);
                            }}
                            className={`mt-2 w-full py-1 rounded text-[10px] font-bold transition-colors ${
                              isDeployed
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                            }`}
                          >
                            {isDeployed ? 'Em Campo ✓' : 'Enviar Tabuleiro'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* =================================================================
              3. ADMIN: FILTROS & CONFIGURAÇÃO DE PACKS (SEÇÃO 12)
             ================================================================= */}
          {activeSection === 'packs-admin' && (
            <div className="space-y-4">
              <div className="bg-[#121624] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Configuração de Packs de Distribuição (Admin)
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Os packs consultam as matrizes cadastradas sem duplicá-las, filtrando por Raridade, Bioma, Família, Coleção e Tipo (Seção 12).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {boosterModels.map((b) => {
                  const eligible = getEligibleMatricesForPack(
                    b,
                    matrixCards,
                    balanceTables
                  );
                  return (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-[#101420] border border-slate-800 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{b.name}</span>
                        <span className="text-xs text-emerald-400 font-mono">
                          {eligible.length} Matrizes Elegíveis
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">{b.description}</div>

                      <div className="space-y-1.5 pt-2 border-t border-slate-800 text-xs">
                        <div className="text-slate-300 font-semibold">Filtros do Pack:</div>
                        <div className="text-slate-400">
                          Biomas: {b.filters?.biomes?.join(', ') || 'Todos'}
                        </div>
                        <div className="text-slate-400">
                          Famílias: {b.filters?.families?.join(', ') || 'Todas'}
                        </div>
                        <div className="text-slate-400">
                          Coleções: {b.filters?.collections?.join(', ') || 'Todas'}
                        </div>
                        <div className="text-slate-400">
                          Tipos: {b.filters?.types?.join(', ') || 'Todos'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =================================================================
              4. ADMIN: PERSONAGENS-BASE & MAGIAS
             ================================================================= */}
          {activeSection === 'characters' && activeEditingChar && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
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
                    <Plus className="w-3 h-3" /> Novo
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
                          {ch.entityType} · {ch.element} · {ch.matrixRarity || 'Comum'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Character Details */}
              <div className="lg:col-span-2 bg-[#121621] border border-slate-800 rounded-xl p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-slate-400 mb-1">Nome</label>
                    <input
                      type="text"
                      value={activeEditingChar.name}
                      onChange={(e) =>
                        onUpdateBaseCharacters(
                          baseCharacters.map((c) =>
                            c.id === activeEditingChar.id
                              ? { ...c, name: e.target.value }
                              : c
                          )
                        )
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Tipo</label>
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
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">Descrição</label>
                  <textarea
                    rows={2}
                    value={activeEditingChar.description}
                    onChange={(e) =>
                      onUpdateBaseCharacters(
                        baseCharacters.map((c) =>
                          c.id === activeEditingChar.id
                            ? { ...c, description: e.target.value }
                            : c
                        )
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="text-xs font-bold text-slate-200">Habilidades</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {activeEditingChar.abilities.map((ab, idx) => (
                      <div
                        key={ab.id}
                        className="p-2.5 rounded-lg bg-[#0B0D13] border border-slate-800 space-y-1.5"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Prioridade #{ab.unlockPriority}</span>
                          <span className="text-fuchsia-400">{ab.tier}</span>
                        </div>
                        <input
                          type="text"
                          value={ab.name}
                          onChange={(e) => {
                            const updated = activeEditingChar.abilities.map((item, i) =>
                              i === idx ? { ...item, name: e.target.value } : item
                            );
                            onUpdateBaseCharacters(
                              baseCharacters.map((c) =>
                                c.id === activeEditingChar.id
                                  ? { ...c, abilities: updated }
                                  : c
                              )
                            );
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-bold text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* =================================================================
              5. ADMIN: CLASSES, RANKS & BALANCEAMENTO (SEÇÃO 10)
             ================================================================= */}
          {activeSection === 'balance' && currentClassTable && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-[#121621] border border-slate-800 rounded-xl p-3.5">
                <div className="flex items-center gap-1.5">
                  {OFFICIAL_CLASSES.map((cls) => (
                    <button
                      key={cls}
                      onClick={() => setEditingBalanceClass(cls)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                        editingBalanceClass === cls
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-900 text-slate-300 hover:text-white'
                      }`}
                    >
                      {cls}
                    </button>
                  ))}
                </div>
                <div className="text-xs font-mono font-bold text-emerald-400">
                  Soma Probabilidades de Rank: {rankProbSum}%
                </div>
              </div>

              <div className="bg-[#121621] border border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs font-mono tabular-nums">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 bg-[#0B0D13]">
                        <th className="p-3">Rank</th>
                        <th className="p-3">PV Mín</th>
                        <th className="p-3">PV Máx</th>
                        <th className="p-3">Incr. PV</th>
                        <th className="p-3">Dano Mín</th>
                        <th className="p-3">Dano Máx</th>
                        <th className="p-3">Incr. Dano</th>
                        <th className="p-3">Invocação (Est.)</th>
                        <th className="p-3">Chance (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {OFFICIAL_RANKS.map((r) => {
                        const rule = currentClassTable.ranks[r];
                        const updateField = (field: keyof typeof rule, val: number) => {
                          onUpdateBalanceTables({
                            ...balanceTables,
                            [editingBalanceClass]: {
                              ...currentClassTable,
                              ranks: {
                                ...currentClassTable.ranks,
                                [r]: { ...rule, [field]: val },
                              },
                            },
                          });
                        };
                        return (
                          <tr key={r} className="hover:bg-slate-900/50">
                            <td className="p-3 font-bold text-amber-400">Rank {r}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.pvMin}
                                onChange={(e) => updateField('pvMin', Number(e.target.value))}
                                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.pvMax}
                                onChange={(e) => updateField('pvMax', Number(e.target.value))}
                                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                              />
                            </td>
                            <td className="p-3">{rule.pvIncrement}</td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.damageMin}
                                onChange={(e) =>
                                  updateField('damageMin', Number(e.target.value))
                                }
                                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                              />
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.damageMax}
                                onChange={(e) =>
                                  updateField('damageMax', Number(e.target.value))
                                }
                                className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-white"
                              />
                            </td>
                            <td className="p-3">{rule.damageIncrement}</td>
                            <td className="p-3">
                              {rule.summonCostMin}–{rule.summonCostMax}
                            </td>
                            <td className="p-3">
                              <input
                                type="number"
                                value={rule.rankProbability}
                                onChange={(e) =>
                                  updateField('rankProbability', Number(e.target.value))
                                }
                                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-emerald-400 font-bold"
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
              6. ADMIN: SIMULADOR ESTATÍSTICO (100k)
             ================================================================= */}
          {activeSection === 'parry-sim' && (
            <div className="space-y-4">
              <div className="bg-[#121624] border border-slate-800 rounded-2xl p-4 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Simulador Estatístico de Monte Carlo
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Executa 10.000 a 100.000 simulações matemáticas sem poluir o inventário para verificar balanceamento.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={simCount}
                    onChange={(e) => setSimCount(Number(e.target.value))}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    <option value={1000}>1.000 Cartas</option>
                    <option value={10000}>10.000 Cartas</option>
                    <option value={50000}>50.000 Cartas</option>
                    <option value={100000}>100.000 Cartas</option>
                  </select>
                  <button
                    onClick={() =>
                      setSimReport(
                        runMonteCarloSimulation(
                          simCount,
                          simMode,
                          baseCharacters,
                          balanceTables
                        )
                      )
                    }
                    className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
                  >
                    Executar Simulação
                  </button>
                </div>
              </div>

              {simReport && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-[#101420] border border-slate-800">
                    <div className="text-xs text-slate-400">Total Simulado</div>
                    <div className="text-base font-bold text-white font-mono">
                      {simReport.totalCards.toLocaleString()} Cartas
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#101420] border border-slate-800">
                    <div className="text-xs text-slate-400">PV Médio</div>
                    <div className="text-base font-bold text-emerald-400 font-mono">
                      {simReport.avgPv}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#101420] border border-slate-800">
                    <div className="text-xs text-slate-400">Dano Médio</div>
                    <div className="text-base font-bold text-amber-400 font-mono">
                      {simReport.avgMaxDamage}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-[#101420] border border-slate-800">
                    <div className="text-xs text-slate-400">Míticas Obtidas</div>
                    <div className="text-base font-bold text-fuchsia-400 font-mono">
                      {simReport.mythicCount}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
