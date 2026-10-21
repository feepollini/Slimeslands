import React, { useRef, useState } from 'react';
import {
  FolderUp,
  ImagePlus,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Copy,
  Info,
  Layers,
  Maximize2,
  Minimize2,
  Grid,
  CheckSquare,
  Square,
  FolderKanban,
  Check,
  X,
  SlidersHorizontal,
  Tag,
  GitBranch,
  Lock,
  Unlock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Move,
  FileDown,
  Database,
  ShoppingBag,
  Workflow,
} from 'lucide-react';
import { CardData } from '../types/card';
import {
  BaseCharacter,
  CardClass,
  CardEntityType,
  CardRank,
  ClassBalanceTable,
  DeckCategory,
  SubgroupCatalog,
} from '../types/slimelands';
import { CardFrameSVG } from './CardFrameSVG';
import {
  OFFICIAL_CLASSES,
  OFFICIAL_RANKS,
  createNeutralMatrixCard,
  generateFromMatrix,
} from '../utils/proceduralEngine';
import {
  DEFAULT_PRESET_PALETTES,
  extractAdaptivePalettesFromImage,
} from '../utils/colorExtractor';
import { BLANK_TEMPLATE_CARD } from '../utils/defaultCards';

interface GalleryProductionDrawerProps {
  cards: CardData[];
  activeCardId: string;
  onSelectCard: (id: string) => void;
  onAddCards: (newCards: CardData[]) => void;
  onReplaceCards: (updatedCards: CardData[]) => void;
  onDeleteCard: (id: string) => void;
  onClearAllCards: () => void;
  onDuplicateCard: (card: CardData) => void;
  onAssignCardDeck: (cardId: string, deckId: string) => void;
  onAssignCardClass: (cardId: string, cardClass: CardClass) => void;
  onInspectCard: (card: CardData) => void;
  onOpenBoosterModal: () => void;
  globalBackImageUrl: string | null;
  onUploadGlobalBack: () => void;
  onClearGlobalBack: () => void;
  onFlipCardPreview: () => void;
  decks: DeckCategory[];
  onCreateDeck: (name: string) => string;
  onRenameDeck: (deckId: string, newName: string) => void;
  onDeleteDeck: (deckId: string, deleteCardsInside: boolean) => void;
  onClearDeckCards: (deckId: string) => void;
  onMoveAllDeckCards: (sourceDeckId: string, targetDeckId: string) => void;
  baseCharacters: BaseCharacter[];
  onAddBaseCharacters: (chars: BaseCharacter[]) => void;
  balanceTables: Record<CardClass, ClassBalanceTable>;
  subgroupCatalog: SubgroupCatalog;
  onUpdateSubgroupCatalog: (next: SubgroupCatalog) => void;
  isExpandedWide: boolean;
  onToggleExpandedWide: () => void;
}

type RarityNavFilter = 'ALL' | 'UNCLASSIFIED' | CardClass;
type GalleryFlowMode = 'guided' | 'free';
type PipelineStep = 1 | 2 | 3 | 4;

export const GalleryProductionDrawer: React.FC<GalleryProductionDrawerProps> = React.memo(({
  cards,
  activeCardId,
  onSelectCard,
  onAddCards,
  onReplaceCards,
  onDeleteCard,
  onClearAllCards,
  onDuplicateCard,
  onAssignCardDeck,
  onInspectCard,
  onOpenBoosterModal,
  globalBackImageUrl,
  onUploadGlobalBack,
  onClearGlobalBack,
  onFlipCardPreview,
  decks,
  onCreateDeck,
  onRenameDeck,
  onDeleteDeck,
  onClearDeckCards,
  onMoveAllDeckCards,
  balanceTables,
  subgroupCatalog,
  onUpdateSubgroupCatalog,
  isExpandedWide,
  onToggleExpandedWide,
}) => {
  // Mode switcher: Guided Pipeline (4 Steps) vs Free Matrix Grid
  const [galleryFlowMode, setGalleryFlowMode] = useState<GalleryFlowMode>('guided');
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>(1);

  // Drag and Drop State for Step 2 Triagem
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  // Section 7: Primary Navigation by Rarity ("Não classificadas", "Comum", "Rara", "Lendária", "Mítica", "Limitada", etc.)
  const [selectedRarityTab, setSelectedRarityTab] = useState<RarityNavFilter>('ALL');
  const [selectedDeckId, setSelectedDeckId] = useState<string>('ALL');

  // Combined Subgroup Filters (Section 5, 6 & 7)
  const [filterFamily, setFilterFamily] = useState<string>('ALL');
  const [filterBiome, setFilterBiome] = useState<string>('ALL');
  const [filterCollection, setFilterCollection] = useState<string>('ALL');
  const [filterEntityType, setFilterEntityType] = useState<string>('ALL');
  const [filterRecordState, setFilterRecordState] = useState<string>('ALL');
  const [filterSourceMatrixId, setFilterSourceMatrixId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Step 2 specific filter: show unclassified only vs all
  const [step2ShowOnlyUnclassified, setStep2ShowOnlyUnclassified] = useState<boolean>(true);

  // Multi-selection for Batch Classification & Version generation
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);

  // Batch / Individual Classification Draft controls
  const [batchRarity, setBatchRarity] = useState<CardClass | 'UNCLASSIFIED' | ''>('');
  const [batchFamily, setBatchFamily] = useState<string>('');
  const [batchBiome, setBatchBiome] = useState<string>('');
  const [batchCollection, setBatchCollection] = useState<string>('');
  const [batchEntityType, setBatchEntityType] = useState<CardEntityType | ''>('');
  const [versionTargetRank, setVersionTargetRank] = useState<CardRank | 'AUTO'>('AUTO');

  // Adding new shared subgroups on the fly (Section 5 & 6)
  const [newSubgroupKind, setNewSubgroupKind] = useState<'family' | 'biome' | 'collection' | null>(null);
  const [newSubgroupValue, setNewSubgroupValue] = useState('');

  const [gridCols, setGridCols] = useState<3 | 4 | 5 | 6>(4);
  const [isAddingDeck, setIsAddingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [isManagingDecks, setIsManagingDecks] = useState(false);
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingDeckName, setEditingDeckName] = useState<string>('');
  const [isImportingFolder, setIsImportingFolder] = useState(false);
  const [showSubgroupFilters, setShowSubgroupFilters] = useState(true);

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const multiFilesInputRef = useRef<HTMLInputElement | null>(null);

  const validSelectedCardIds = selectedCardIds.filter((id) =>
    cards.some((c) => c.id === id)
  );

  // Enabled rarities read dynamically from project configuration (Section 4)
  const enabledRarities = OFFICIAL_CLASSES.filter(
    (cls) => balanceTables[cls]?.enabled || cards.some((c) => c.cardClass === cls)
  );

  const isCardUnclassified = (c: CardData) =>
    c.classificationState === 'Não classificada' ||
    c.isNeutralMatrix === true ||
    !c.cardClass;

  const unclassifiedCount = cards.filter(isCardUnclassified).length;
  const classifiedCount = cards.length - unclassifiedCount;

  const toggleCardSelection = (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
  };

  // Drag and drop handlers for Step 2
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedCardId(cardId);
  };

  const handleDragOverCategory = (e: React.DragEvent, zoneKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropZone !== zoneKey) {
      setActiveDropZone(zoneKey);
    }
  };

  const handleDragLeaveCategory = () => {
    setActiveDropZone(null);
  };

  const handleDropOnCategory = (e: React.DragEvent, targetRarity: CardClass | 'Magia') => {
    e.preventDefault();
    setActiveDropZone(null);
    const droppedId = e.dataTransfer.getData('text/plain') || draggedCardId;
    setDraggedCardId(null);
    if (!droppedId) return;

    // If multiple cards are checked, apply to all of them; otherwise just the dragged card
    const targetIds = validSelectedCardIds.includes(droppedId)
      ? validSelectedCardIds
      : [droppedId];

    if (targetRarity === 'Magia') {
      onReplaceCards(
        cards.map((c) => {
          if (!targetIds.includes(c.id)) return c;
          const manaCost = c.magicManaCost ?? 3;
          return {
            ...c,
            entityType: 'Magia',
            cardClass: c.cardClass || 'Rara',
            magicManaCost: manaCost,
            summonStaminaCost: undefined,
            pvText:
              c.pvText && !c.pvText.startsWith('MANA')
                ? c.pvText
                : c.pvNumber
                ? `PV${c.pvNumber}`
                : 'PV—',
            showSummonCostPill: true,
            summonCostPill: {
              id: 'pill-summon-cost',
              mode: 'stat',
              badgeValue: String(manaCost),
              badgeColor: '#0084FF',
              mainText: 'MANA',
              isSummonCost: true,
              costResource: 'mana',
            },
            magicAbilityKind: c.magicAbilityKind || 'passive',
            linkedPassiveId: c.linkedPassiveId || 'first_strike',
            classificationState: 'Classificada',
            editState: 'Classificada',
            isNeutralMatrix: false,
          };
        })
      );
    } else {
      onReplaceCards(
        cards.map((c) =>
          targetIds.includes(c.id)
            ? applyRarityToCardRecord(c, targetRarity)
            : c
        )
      );
    }
    // Clear selection after moving
    setSelectedCardIds([]);
  };

  /**
   * SECTION 3: IMPORTAÇÃO DE CARTAS NEUTRAS
   * Imports folder or image files into the Matrix as neutral records ("Não classificadas").
   */
  const processImportedFilesNeutral = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsImportingFolder(true);

    try {
      const files = Array.from(fileList).filter((f) =>
        f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name)
      );

      if (files.length === 0) {
        setIsImportingFolder(false);
        return;
      }

      // Sort natural order by filename
      files.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );

      const targetDeck = selectedDeckId !== 'ALL' ? selectedDeckId : 'deck-main';
      const createdCards: CardData[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const rawName = file.name.replace(/\.[^/.]+$/, '').trim();
        const baseTitle =
          rawName
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^\d+[\s.-]*/, '')
            .trim() || `Carta Matriz ${cards.length + i + 1}`;

        let extractedPalettes = DEFAULT_PRESET_PALETTES;
        try {
          const palettes = await extractAdaptivePalettesFromImage(dataUrl);
          if (palettes && palettes.length > 0) {
            extractedPalettes = palettes;
          }
        } catch {
          // fallback
        }

        const neutralMatrix = createNeutralMatrixCard({
          title: baseTitle,
          imageUrl: dataUrl,
          deckId: targetDeck,
          palette: extractedPalettes[0],
        });
        if (globalBackImageUrl) {
          neutralMatrix.backImageUrl = globalBackImageUrl;
        }

        createdCards.push(neutralMatrix);
      }

      onAddCards(createdCards);
      if (createdCards.length > 0) {
        onSelectCard(createdCards[0].id);
        // Direct guided flow to triage if currently on Step 1
        if (pipelineStep === 1) {
          setPipelineStep(2);
        }
      }
    } finally {
      setIsImportingFolder(false);
      if (folderInputRef.current) folderInputRef.current.value = '';
      if (multiFilesInputRef.current) multiFilesInputRef.current.value = '';
    }
  };

  const handleCreateNeutralMatrix = () => {
    const targetDeck = selectedDeckId !== 'ALL' ? selectedDeckId : 'deck-main';
    const newBlank: CardData = {
      ...BLANK_TEMPLATE_CARD,
      id: `mtx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `Nova Matriz ${cards.length + 1}`,
      deckId: targetDeck,
      origin: 'Manual',
      backImageUrl: globalBackImageUrl || null,
      createdAt: new Date().toISOString(),
    };
    onAddCards([newBlank]);
    onSelectCard(newBlank.id);
  };

  /**
   * Helper: Applies classification updates to a single card (or batch of selected cards)
   */
  const updateTargetCards = (
    targetIds: string[],
    updater: (card: CardData) => CardData
  ) => {
    if (targetIds.length === 0) return;
    const updated = cards.map((card) =>
      targetIds.includes(card.id) ? updater(card) : card
    );
    onReplaceCards(updated);
  };

  const applyRarityToCardRecord = (
    card: CardData,
    nextRarity: CardClass | 'UNCLASSIFIED'
  ): CardData => {
    if (nextRarity === 'UNCLASSIFIED') {
      return {
        ...card,
        cardClass: undefined,
        classificationState: 'Não classificada',
        editState: 'Importada / Neutra',
        isNeutralMatrix: true,
        isPremium: false,
        loreHeader: `${card.title} · Matriz Não Classificada`,
      };
    }

    const isAutoPremium =
      nextRarity === 'Lendária' ||
      nextRarity === 'Mítica' ||
      nextRarity === 'Limitada';

    return {
      ...card,
      cardClass: nextRarity,
      classificationState: 'Classificada',
      editState:
        card.editState === 'Importada / Neutra'
          ? 'Classificada'
          : card.editState || 'Classificada',
      isNeutralMatrix: false,
      isPremium: isAutoPremium ? true : card.isPremium,
      isRankChromatic: isAutoPremium ? true : card.isRankChromatic,
      isPvChromatic: isAutoPremium ? true : card.isPvChromatic,
      loreHeader: `${card.title} · Matriz ${nextRarity}${
        card.biome ? ` · ${card.biome}` : ''
      }`,
    };
  };

  const handleApplyBatchClassifications = () => {
    const targetIds =
      validSelectedCardIds.length > 0
        ? validSelectedCardIds
        : activeCardId
        ? [activeCardId]
        : [];
    if (targetIds.length === 0) return;

    updateTargetCards(targetIds, (card) => {
      let next = { ...card };

      if (batchRarity) {
        next = applyRarityToCardRecord(next, batchRarity);
      }
      if (batchFamily) {
        next.family = batchFamily === '__CLEAR__' ? undefined : batchFamily;
      }
      if (batchBiome) {
        next.biome = batchBiome === '__CLEAR__' ? undefined : batchBiome;
        if (next.biome && next.elementText === 'NEUTRA') {
          next.elementText = next.biome.slice(0, 6).toUpperCase();
        }
      }
      if (batchCollection) {
        if (batchCollection === '__CLEAR__') {
          next.collections = [];
        } else {
          const current = next.collections || [];
          next.collections = current.includes(batchCollection)
            ? current.filter((c) => c !== batchCollection)
            : [...current, batchCollection];
        }
      }
      if (batchEntityType) {
        next.entityType = batchEntityType;
        if (batchEntityType === 'Magia') {
          const manaCost = next.magicManaCost ?? 3;
          next.cardClass = next.cardClass || 'Rara';
          next.summonStaminaCost = undefined;
          next.magicManaCost = manaCost;
          next.pvText =
            next.pvText && !next.pvText.startsWith('MANA')
              ? next.pvText
              : next.pvNumber
              ? `PV${next.pvNumber}`
              : 'PV—';
          next.showSummonCostPill = true;
          next.summonCostPill = {
            id: 'pill-summon-cost',
            mode: 'stat',
            badgeValue: String(manaCost),
            badgeColor: '#0084FF',
            mainText: 'MANA',
            isSummonCost: true,
            costResource: 'mana',
          };
          next.magicAbilityKind = next.magicAbilityKind || 'passive';
          next.linkedPassiveId = next.linkedPassiveId || 'first_strike';
        } else if (batchEntityType === 'Item') {
          next.pvNumber = undefined;
          next.summonStaminaCost = undefined;
          next.showSummonCostPill = false;
          next.pvText = 'ITEM';
        } else if (batchEntityType === 'Criatura') {
          const stamCost = next.summonStaminaCost ?? 3;
          next.showSummonCostPill = true;
          next.summonCostPill = {
            id: 'pill-summon-cost',
            mode: 'stat',
            badgeValue: String(stamCost),
            badgeColor: '#F59E0B',
            mainText: 'INVOC.',
            isSummonCost: true,
            costResource: 'stamina',
          };
        }
      }
      return next;
    });

    setBatchRarity('');
    setBatchFamily('');
    setBatchBiome('');
    setBatchCollection('');
    setBatchEntityType('');
  };

  const handleGenerateRandomVersionForCards = (targetMatrices: CardData[]) => {
    const classifiedTargets = targetMatrices.filter(
      (m) => !isCardUnclassified(m) && m.cardClass
    );
    if (classifiedTargets.length === 0) return;

    const newVersions: CardData[] = classifiedTargets.map((mtx) => {
      const sourceMatrix =
        mtx.recordKind === 'version' && mtx.sourceMatrixId
          ? cards.find((c) => c.id === mtx.sourceMatrixId) || mtx
          : mtx;

      return generateFromMatrix({
        matrix: sourceMatrix,
        balanceTables,
        targetRecordKind: 'version',
        origin: 'Manual',
        forcedRank: versionTargetRank === 'AUTO' ? undefined : versionTargetRank,
        deckId: sourceMatrix.deckId || 'deck-main',
      });
    });

    onAddCards(newVersions);
    if (newVersions.length > 0) {
      onSelectCard(newVersions[0].id);
    }
  };

  const handleSaveNewSubgroup = () => {
    const val = newSubgroupValue.trim();
    if (!val || !newSubgroupKind) return;

    if (newSubgroupKind === 'family') {
      if (!subgroupCatalog.families.includes(val)) {
        onUpdateSubgroupCatalog({
          ...subgroupCatalog,
          families: [...subgroupCatalog.families, val],
        });
      }
      setBatchFamily(val);
    } else if (newSubgroupKind === 'biome') {
      if (!subgroupCatalog.biomes.includes(val)) {
        onUpdateSubgroupCatalog({
          ...subgroupCatalog,
          biomes: [...subgroupCatalog.biomes, val],
        });
      }
      setBatchBiome(val);
    } else if (newSubgroupKind === 'collection') {
      if (!subgroupCatalog.collections.includes(val)) {
        onUpdateSubgroupCatalog({
          ...subgroupCatalog,
          collections: [...subgroupCatalog.collections, val],
        });
      }
      setBatchCollection(val);
    }
    setNewSubgroupValue('');
    setNewSubgroupKind(null);
  };

  const handleExportMatrixJson = () => {
    const jsonStr = JSON.stringify(cards, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `worlds_of_slimelands_matriz_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Matrix Health Diagnostic (Step 4)
  const commonCount = cards.filter((c) => c.cardClass === 'Comum').length;
  const rareCount = cards.filter((c) => c.cardClass === 'Rara').length;
  const magicCount = cards.filter((c) => c.entityType === 'Magia').length;
  const highRankCount = cards.filter(
    (c) => c.cardRank === 'A' || c.cardRank === 'S' || (c.cardClass && ['Lendária', 'Mítica'].includes(c.cardClass))
  ).length;

  const cardsWithImage = cards.filter((c) => Boolean(c.imageUrl)).length;
  const cardsWithBiome = cards.filter((c) => Boolean(c.biome)).length;
  const cardsWithFamily = cards.filter((c) => Boolean(c.family)).length;

  const isBoosterReady =
    commonCount >= 4 && rareCount >= 2 && magicCount >= 2 && highRankCount >= 1;

  // Filtered Cards logic
  const filteredCards = cards.filter((c) => {
    // In Guided Mode Step 2 with "Show unclassified only"
    if (galleryFlowMode === 'guided' && pipelineStep === 2 && step2ShowOnlyUnclassified) {
      if (!isCardUnclassified(c)) return false;
    }

    // Free Mode / Step 3 Primary Rarity Navigation
    if (selectedRarityTab === 'UNCLASSIFIED') {
      if (!isCardUnclassified(c)) return false;
    } else if (selectedRarityTab !== 'ALL') {
      if (isCardUnclassified(c) || c.cardClass !== selectedRarityTab) return false;
    }

    if (selectedDeckId !== 'ALL' && (c.deckId || 'deck-main') !== selectedDeckId) {
      return false;
    }
    if (filterFamily !== 'ALL' && (c.family || '') !== filterFamily) {
      return false;
    }
    if (filterBiome !== 'ALL' && (c.biome || '') !== filterBiome) {
      return false;
    }
    if (
      filterCollection !== 'ALL' &&
      (!c.collections || !c.collections.includes(filterCollection))
    ) {
      return false;
    }
    if (filterEntityType !== 'ALL' && (c.entityType || 'Criatura') !== filterEntityType) {
      return false;
    }
    if (filterRecordState === 'MATRICES_ONLY' && c.recordKind === 'version') {
      return false;
    }
    if (filterRecordState === 'VERSIONS_ONLY' && c.recordKind !== 'version') {
      return false;
    }
    if (filterRecordState === 'FIXED_PACK' && !c.useFixedVersionInPacks) {
      return false;
    }
    if (
      filterSourceMatrixId !== 'ALL' &&
      c.id !== filterSourceMatrixId &&
      c.sourceMatrixId !== filterSourceMatrixId
    ) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchFamily = (c.family || '').toLowerCase().includes(q);
      const matchBiome = (c.biome || '').toLowerCase().includes(q);
      const matchElem = c.elementText.toLowerCase().includes(q);
      if (!matchTitle && !matchFamily && !matchBiome && !matchElem) return false;
    }

    return true;
  });

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredCards.map((c) => c.id);
    const allAlreadySelected =
      filteredIds.length > 0 &&
      filteredIds.every((id) => validSelectedCardIds.includes(id));

    if (allAlreadySelected) {
      setSelectedCardIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedCardIds((prev) => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const gridColsClass =
    gridCols === 3
      ? 'grid-cols-2 md:grid-cols-3'
      : gridCols === 4
      ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
      : gridCols === 5
      ? 'grid-cols-3 md:grid-cols-4 xl:grid-cols-5'
      : 'grid-cols-3 md:grid-cols-4 xl:grid-cols-6';

  const categoryTriageBoxes: {
    key: CardClass | 'Magia';
    label: string;
    sublabel: string;
    bgClass: string;
    borderClass: string;
    textClass: string;
    count: number;
  }[] = [
    {
      key: 'Comum',
      label: 'Comum',
      sublabel: 'Base do baralho · Slots 1-4',
      bgClass: 'bg-slate-900/80',
      borderClass: 'border-slate-700',
      textClass: 'text-slate-300',
      count: cards.filter((c) => c.cardClass === 'Comum').length,
    },
    {
      key: 'Rara',
      label: 'Rara',
      sublabel: 'Poder superior · Slots 5-6',
      bgClass: 'bg-emerald-950/40',
      borderClass: 'border-emerald-600/50',
      textClass: 'text-emerald-300',
      count: cards.filter((c) => c.cardClass === 'Rara').length,
    },
    {
      key: 'Magia',
      label: 'Magia',
      sublabel: 'Feitiços e Auras · Slots 7-8',
      bgClass: 'bg-sky-950/40',
      borderClass: 'border-sky-500/50',
      textClass: 'text-sky-300',
      count: cards.filter((c) => c.entityType === 'Magia').length,
    },
    {
      key: 'Épica',
      label: 'Épica',
      sublabel: 'Raridade intermediária',
      bgClass: 'bg-purple-950/40',
      borderClass: 'border-purple-600/50',
      textClass: 'text-purple-300',
      count: cards.filter((c) => c.cardClass === 'Épica').length,
    },
    {
      key: 'Lendária',
      label: 'Lendária',
      sublabel: 'Alto impacto de combate',
      bgClass: 'bg-amber-950/40',
      borderClass: 'border-amber-500/50',
      textClass: 'text-amber-300',
      count: cards.filter((c) => c.cardClass === 'Lendária').length,
    },
    {
      key: 'Mítica',
      label: 'Mítica',
      sublabel: 'Habilidade grátis garantida',
      bgClass: 'bg-rose-950/40',
      borderClass: 'border-rose-500/50',
      textClass: 'text-rose-300',
      count: cards.filter((c) => c.cardClass === 'Mítica').length,
    },
    {
      key: 'Limitada',
      label: 'Limitada',
      sublabel: 'Edições sazonais de evento',
      bgClass: 'bg-yellow-950/40',
      borderClass: 'border-yellow-500/50',
      textClass: 'text-yellow-300',
      count: cards.filter((c) => c.cardClass === 'Limitada').length,
    },
  ];

  return (
    <aside
      className={`${
        isExpandedWide
          ? 'w-[74vw] min-w-[780px] max-w-[1440px]'
          : 'w-[54vw] min-w-[600px] max-w-[1020px]'
      } h-full max-h-full min-h-0 overflow-hidden bg-[#0B0D13] border-r border-slate-800/80 flex flex-col shrink-0 select-none transition-[width] duration-200`}
    >
      {/* Hidden Folder & Multi-File Inputs */}
      <input
        ref={folderInputRef}
        type="file"
        // @ts-expect-error webkitdirectory is standard for folder selection in browsers
        webkitdirectory=""
        directory=""
        multiple
        onChange={(e) => processImportedFilesNeutral(e.target.files)}
        className="hidden"
      />
      <input
        ref={multiFilesInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => processImportedFilesNeutral(e.target.files)}
        className="hidden"
      />

      {/* =====================================================================
          1. BARRA DE TOPO DA MATRIZ: ALTERNADOR MODO GUIADO X GRADE LIVRE
         ===================================================================== */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-[#0E1118] flex items-center justify-between gap-2 flex-wrap shrink-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold text-white whitespace-nowrap">
              Matriz de Cartas
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap">
              · {cards.length} cartas ({unclassifiedCount} pendentes)
            </span>
          </div>

          {/* Flow Mode Switcher */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setGalleryFlowMode('guided')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                galleryFlowMode === 'guided'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Modo Guiado (Passo a Passo)</span>
            </button>
            <button
              onClick={() => setGalleryFlowMode('free')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                galleryFlowMode === 'free'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grade Livre</span>
            </button>
          </div>
        </div>

        {/* Right Tools: Verso Global + Grid Zoom + Expand */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1 bg-purple-950/30 border border-purple-500/35 rounded-lg px-2 py-1">
            {globalBackImageUrl && (
              <img
                src={globalBackImageUrl}
                alt="Verso Global"
                className="w-3.5 h-5 object-fill rounded-[1px] border border-purple-400/50 shrink-0"
              />
            )}
            <button
              onClick={onUploadGlobalBack}
              className="text-xs font-semibold text-purple-200 hover:text-white flex items-center gap-1 whitespace-nowrap"
              title="Definir Verso Global"
            >
              <ImagePlus className="w-3.5 h-3.5 text-purple-400" />
              <span>{globalBackImageUrl ? 'Verso' : 'Importar Verso'}</span>
            </button>
            <button
              onClick={onFlipCardPreview}
              className="px-1.5 py-0.5 rounded bg-purple-600/80 hover:bg-purple-500 text-[10px] font-bold text-white whitespace-nowrap"
            >
              Ver
            </button>
            {globalBackImageUrl && (
              <button
                onClick={onClearGlobalBack}
                className="text-[10px] text-rose-300 hover:text-rose-200 px-0.5"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <Grid className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-0.5" />
            {([3, 4, 5, 6] as const).map((cols) => (
              <button
                key={cols}
                onClick={() => setGridCols(cols)}
                className={`px-1.5 py-0.5 rounded text-[11px] font-mono tabular-nums font-bold transition-colors ${
                  gridCols === cols
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {cols}x
              </button>
            ))}
          </div>

          {cards.length > 0 && (
            <button
              onClick={onClearAllCards}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 text-xs font-medium text-slate-400 hover:text-rose-300 transition-colors whitespace-nowrap"
            >
              Limpar
            </button>
          )}

          <button
            onClick={onToggleExpandedWide}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 transition-colors whitespace-nowrap"
          >
            {isExpandedWide ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Reduzir</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Expandir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. ESTEIRA GUIADA: PIPELINE DE 4 ETAPAS (QUANDO MODO GUIADO ATIVO)
         ===================================================================== */}
      {galleryFlowMode === 'guided' && (
        <div className="px-4 py-2.5 border-b border-slate-800/90 bg-[#0B0F17] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-2 min-w-max">
            {/* Step 1 */}
            <button
              onClick={() => setPipelineStep(1)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                pipelineStep === 1
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
                1
              </span>
              <span>1. Ingestão & Base</span>
              {unclassifiedCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 text-[10px] font-black">
                  {unclassifiedCount}
                </span>
              )}
            </button>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 2 */}
            <button
              onClick={() => setPipelineStep(2)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                pipelineStep === 2
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
                2
              </span>
              <span>2. Triagem de Raridades</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                {classifiedCount}/{cards.length}
              </span>
            </button>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 3 */}
            <button
              onClick={() => setPipelineStep(3)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                pipelineStep === 3
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
                3
              </span>
              <span>3. Subgrupos & Regras</span>
            </button>

            <ArrowRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

            {/* Step 4 */}
            <button
              onClick={() => setPipelineStep(4)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                pipelineStep === 4
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-500/30'
                  : 'bg-slate-900/90 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-black">
                4
              </span>
              <span>4. Diagnóstico & Packs</span>
              {isBoosterReady ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300" />
              )}
            </button>
          </div>

          {/* Quick step progress indicators */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-slate-400 font-mono">
              Etapa {pipelineStep} de 4
            </span>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. PAINÉIS ESPECÍFICOS DE CADA ETAPA DO MODO GUIADO
         ===================================================================== */}
      {galleryFlowMode === 'guided' && pipelineStep === 1 && (
        <div className="p-4 bg-[#0A0D14] border-b border-slate-800/80 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span>Etapa 1: Ingestão de Base de Cartas</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Alimente o banco com ilustrações locais ou crie matrizes neutras. Elas entram como Não Classificadas sem sortear atributos precipitados.
              </p>
            </div>
            <button
              onClick={() => setPipelineStep(2)}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md shrink-0"
            >
              <span>Avançar para Triagem</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 3 Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={isImportingFolder}
              className="p-3 rounded-xl bg-gradient-to-b from-amber-950/20 to-slate-900 border border-amber-500/40 hover:border-amber-400 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                <FolderUp className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Importar Pasta Completa</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Carrega todos os arquivos de imagem de uma pasta local de uma vez em estado neutro.
              </p>
            </button>

            <button
              onClick={() => multiFilesInputRef.current?.click()}
              className="p-3 rounded-xl bg-gradient-to-b from-sky-950/20 to-slate-900 border border-sky-500/40 hover:border-sky-400 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                <ImagePlus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Adicionar Imagens Locais</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Selecione uma ou mais imagens avulsas para registrar na Matriz.
              </p>
            </button>

            <button
              onClick={handleCreateNeutralMatrix}
              className="p-3 rounded-xl bg-gradient-to-b from-emerald-950/20 to-slate-900 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
                <span>Criar Matriz em Branco</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Cria uma matriz vazia para configurar arte, nome e lore manualmente no estúdio.
              </p>
            </button>
          </div>
        </div>
      )}

      {galleryFlowMode === 'guided' && pipelineStep === 2 && (
        <div className="p-4 bg-[#0A0D14] border-b border-slate-800/80 space-y-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Move className="w-4 h-4 text-emerald-400" />
                <span>Etapa 2: Triagem & Distribuição de Raridades</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Arraste as cartas pendentes para as caixas de raridade abaixo, ou selecione cartas e clique na categoria para mover em lote.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPipelineStep(1)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
              <button
                onClick={() => setPipelineStep(3)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>Avançar para Subgrupos</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Drag & Drop Target Zones */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-1">
            {categoryTriageBoxes.map((cat) => {
              const isOver = activeDropZone === cat.key;
              const hasChecked = validSelectedCardIds.length > 0;
              return (
                <div
                  key={cat.key}
                  onDragOver={(e) => handleDragOverCategory(e, cat.key)}
                  onDragLeave={handleDragLeaveCategory}
                  onDrop={(e) => handleDropOnCategory(e, cat.key)}
                  onClick={() => {
                    if (hasChecked) {
                      // Move all checked cards to this category on click!
                      if (cat.key === 'Magia') {
                        onReplaceCards(
                          cards.map((c) => {
                            if (!validSelectedCardIds.includes(c.id)) return c;
                            const manaCost = c.magicManaCost ?? 3;
                            return {
                              ...c,
                              entityType: 'Magia',
                              cardClass: c.cardClass || 'Rara',
                              magicManaCost: manaCost,
                              summonStaminaCost: undefined,
                              pvText:
                                c.pvText && !c.pvText.startsWith('MANA')
                                  ? c.pvText
                                  : c.pvNumber
                                  ? `PV${c.pvNumber}`
                                  : 'PV—',
                              showSummonCostPill: true,
                              summonCostPill: {
                                id: 'pill-summon-cost',
                                mode: 'stat',
                                badgeValue: String(manaCost),
                                badgeColor: '#0084FF',
                                mainText: 'MANA',
                                isSummonCost: true,
                                costResource: 'mana',
                              },
                              magicAbilityKind: c.magicAbilityKind || 'passive',
                              linkedPassiveId: c.linkedPassiveId || 'first_strike',
                              classificationState: 'Classificada',
                              editState: 'Classificada',
                              isNeutralMatrix: false,
                            };
                          })
                        );
                      } else {
                        onReplaceCards(
                          cards.map((c) =>
                            validSelectedCardIds.includes(c.id)
                              ? applyRarityToCardRecord(c, cat.key as CardClass)
                              : c
                          )
                        );
                      }
                      setSelectedCardIds([]);
                    }
                  }}
                  className={`p-2 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    cat.bgClass
                  } ${
                    isOver
                      ? 'border-emerald-400 ring-2 ring-emerald-400/60 scale-[1.03] shadow-lg'
                      : hasChecked
                      ? `${cat.borderClass} hover:border-white hover:scale-[1.02]`
                      : cat.borderClass
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${cat.textClass}`}>
                        {cat.label}
                      </span>
                      <span className="px-1.5 py-0.2 rounded-full bg-slate-950/80 border border-slate-700 text-[10px] font-mono tabular-nums text-white">
                        {cat.count}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {cat.sublabel}
                    </p>
                  </div>

                  <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">
                      {isOver ? 'Solte para mover!' : hasChecked ? 'Clique p/ Mover' : 'Solte aqui'}
                    </span>
                    {hasChecked && (
                      <span className="text-emerald-400 font-bold">
                        +{validSelectedCardIds.length}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Step 2 filter toggle */}
          <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-300">Visualizar na Grade:</span>
              <button
                onClick={() => setStep2ShowOnlyUnclassified(true)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                  step2ShowOnlyUnclassified
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Apenas Pendentes ({unclassifiedCount})
              </button>
              <button
                onClick={() => setStep2ShowOnlyUnclassified(false)}
                className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors ${
                  !step2ShowOnlyUnclassified
                    ? 'bg-slate-200 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                Todas as Cartas ({cards.length})
              </button>
            </div>

            <div className="text-[11px] text-slate-400">
              💡 Segure e arraste qualquer carta até a caixa de raridade.
            </div>
          </div>
        </div>
      )}

      {galleryFlowMode === 'guided' && pipelineStep === 3 && (
        <div className="p-4 bg-[#0A0D14] border-b border-slate-800/80 space-y-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-400" />
                <span>Etapa 3: Subgrupos & Tags Temáticas</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Atribua Famílias, Biomas, Coleções e Tipos independentemente da raridade.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPipelineStep(2)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>
              <button
                onClick={() => setPipelineStep(4)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all shadow-md"
              >
                <span>Avançar para Diagnóstico</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Quick Subgroups Batch Assignment Row */}
          <div className="flex items-center gap-2 flex-wrap pt-1 bg-slate-900/80 border border-slate-800 rounded-xl p-2.5">
            <span className="text-xs font-bold text-slate-300">
              Atribuir aos Selecionados ({validSelectedCardIds.length || (activeCardId ? '1' : '0')}):
            </span>

            {/* Biome Select */}
            <select
              value={batchBiome}
              onChange={(e) => setBatchBiome(e.target.value)}
              className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-emerald-300 font-semibold"
            >
              <option value="">Bioma...</option>
              {subgroupCatalog.biomes.map((b) => (
                <option key={b} value={b}>
                  Bioma: {b}
                </option>
              ))}
              <option value="__CLEAR__">(Remover Bioma)</option>
            </select>

            {/* Family Select */}
            <select
              value={batchFamily}
              onChange={(e) => setBatchFamily(e.target.value)}
              className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-slate-200"
            >
              <option value="">Família...</option>
              {subgroupCatalog.families.map((f) => (
                <option key={f} value={f}>
                  Família: {f}
                </option>
              ))}
              <option value="__CLEAR__">(Remover Família)</option>
            </select>

            {/* Collection Select */}
            <select
              value={batchCollection}
              onChange={(e) => setBatchCollection(e.target.value)}
              className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-purple-300"
            >
              <option value="">Coleção...</option>
              {subgroupCatalog.collections.map((col) => (
                <option key={col} value={col}>
                  Coleção: {col}
                </option>
              ))}
              <option value="__CLEAR__">(Limpar Coleções)</option>
            </select>

            {/* Entity Type Select */}
            <select
              value={batchEntityType}
              onChange={(e) => setBatchEntityType(e.target.value as CardEntityType | '')}
              className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs text-sky-300 font-semibold"
            >
              <option value="">Tipo...</option>
              <option value="Criatura">Criatura</option>
              <option value="Magia">Magia</option>
              <option value="Item">Item</option>
            </select>

            <button
              onClick={handleApplyBatchClassifications}
              disabled={!batchBiome && !batchFamily && !batchCollection && !batchEntityType}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-xs font-bold text-white transition-all shadow"
            >
              Aplicar Tags
            </button>

            {/* Create new subgroup tag button */}
            <div className="flex items-center gap-1 ml-auto">
              {(['biome', 'family', 'collection'] as const).map((kind) => (
                <button
                  key={kind}
                  onClick={() => setNewSubgroupKind(kind)}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 hover:text-white transition-colors"
                >
                  + Novo {kind === 'biome' ? 'Bioma' : kind === 'family' ? 'Família' : 'Coleção'}
                </button>
              ))}
            </div>
          </div>

          {/* Quick Create Subgroup Inline Modal */}
          {newSubgroupKind && (
            <div className="p-2.5 rounded-lg bg-slate-900 border border-emerald-500/50 flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-400">
                Criar novo {newSubgroupKind === 'biome' ? 'Bioma' : newSubgroupKind === 'family' ? 'Família' : 'Coleção'}:
              </span>
              <input
                type="text"
                value={newSubgroupValue}
                onChange={(e) => setNewSubgroupValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNewSubgroup()}
                placeholder="Ex: Slimes Vulcânicos..."
                autoFocus
                className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-xs text-white flex-1"
              />
              <button
                onClick={handleSaveNewSubgroup}
                className="px-3 py-1 rounded bg-emerald-600 text-xs font-bold text-white"
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setNewSubgroupKind(null);
                  setNewSubgroupValue('');
                }}
                className="px-2 py-1 rounded bg-slate-800 text-xs text-slate-400"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      )}

      {galleryFlowMode === 'guided' && pipelineStep === 4 && (
        <div className="p-4 bg-[#0A0D14] border-b border-slate-800/80 space-y-3 shrink-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Etapa 4: Diagnóstico de Saúde & Validação de Boosters</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Checagem automática para abertura de Boosters de 9 Cartas oficiais e integridade do catálogo.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPipelineStep(3)}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Voltar</span>
              </button>

              <button
                onClick={handleExportMatrixJson}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-sky-300 flex items-center gap-1.5 transition-colors"
                title="Exportar arquivo JSON com todos os dados da Matriz"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Exportar JSON</span>
              </button>

              <button
                onClick={onOpenBoosterModal}
                className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-xs font-black text-slate-950 flex items-center gap-1.5 transition-all shadow-md"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Abrir Loja & Testar Boosters</span>
              </button>
            </div>
          </div>

          {/* Diagnostic Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
            {/* Booster Requirements Check */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Requisitos de Booster (9 Cartas)</span>
                  {isBoosterReady ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/50 text-[10px] font-bold text-emerald-300">
                      Apto
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-500/50 text-[10px] font-bold text-amber-300">
                      Incompleto
                    </span>
                  )}
                </div>

                <div className="space-y-1 mt-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>• Comuns (min 4):</span>
                    <span className={commonCount >= 4 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {commonCount}/4 {commonCount >= 4 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>• Raras (min 2):</span>
                    <span className={rareCount >= 2 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {rareCount}/2 {rareCount >= 2 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>• Magias (min 2):</span>
                    <span className={magicCount >= 2 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {magicCount}/2 {magicCount >= 2 ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>• Rank Alto A/S (min 1):</span>
                    <span className={highRankCount >= 1 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {highRankCount}/1 {highRankCount >= 1 ? '✓' : '✗'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Metadata Integrity Check */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200">Integridade dos Metadados</span>
                <div className="space-y-1 mt-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>• Ilustração vinculada:</span>
                    <span className={cardsWithImage === cards.length ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {cardsWithImage}/{cards.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>• Bioma catalogado:</span>
                    <span className="text-slate-200 font-mono">
                      {cardsWithBiome}/{cards.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>• Família catalogada:</span>
                    <span className="text-slate-200 font-mono">
                      {cardsWithFamily}/{cards.length}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>• Não Classificadas restantes:</span>
                    <span className={unclassifiedCount === 0 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {unclassifiedCount}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Distribution Summary */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200">Distribuição do Baralho</span>
                <div className="grid grid-cols-3 gap-1 mt-2 text-center text-[10px]">
                  <div className="p-1 rounded bg-slate-800">
                    <div className="text-slate-400">Comum</div>
                    <div className="font-bold text-white mt-0.5">{commonCount}</div>
                  </div>
                  <div className="p-1 rounded bg-emerald-950/40">
                    <div className="text-emerald-400">Rara</div>
                    <div className="font-bold text-white mt-0.5">{rareCount}</div>
                  </div>
                  <div className="p-1 rounded bg-sky-950/40">
                    <div className="text-sky-400">Magia</div>
                    <div className="font-bold text-white mt-0.5">{magicCount}</div>
                  </div>
                  <div className="p-1 rounded bg-purple-950/40">
                    <div className="text-purple-400">Épica</div>
                    <div className="font-bold text-white mt-0.5">
                      {cards.filter((c) => c.cardClass === 'Épica').length}
                    </div>
                  </div>
                  <div className="p-1 rounded bg-amber-950/40">
                    <div className="text-amber-400">Lendária</div>
                    <div className="font-bold text-white mt-0.5">
                      {cards.filter((c) => c.cardClass === 'Lendária').length}
                    </div>
                  </div>
                  <div className="p-1 rounded bg-rose-950/40">
                    <div className="text-rose-400">Mítica</div>
                    <div className="font-bold text-white mt-0.5">
                      {cards.filter((c) => c.cardClass === 'Mítica').length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          4. NAVEGAÇÃO DE FILTROS TRADICIONAIS (MODO LIVRE OU ETAPA 3)
         ===================================================================== */}
      {(galleryFlowMode === 'free' || pipelineStep === 3) && (
        <div className="px-4 py-2 border-b border-slate-800/80 bg-[#0D1017] flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1">
            <button
              onClick={() => setSelectedRarityTab('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                selectedRarityTab === 'ALL'
                  ? 'bg-white text-slate-950'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Todas ({cards.length})
            </button>

            <button
              onClick={() => setSelectedRarityTab('UNCLASSIFIED')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                selectedRarityTab === 'UNCLASSIFIED'
                  ? 'bg-amber-400 text-slate-950'
                  : 'bg-amber-950/40 text-amber-300 border border-amber-500/40 hover:bg-amber-950/70'
              }`}
            >
              <span>Não Classificadas</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-950/80 text-[10px] font-mono tabular-nums text-amber-300">
                {unclassifiedCount}
              </span>
            </button>

            {enabledRarities.map((rarity) => {
              const count = cards.filter((c) => c.cardClass === rarity).length;
              const isSelected = selectedRarityTab === rarity;
              return (
                <button
                  key={rarity}
                  onClick={() => setSelectedRarityTab(rarity)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  <span>{rarity}</span>
                  <span className="text-[10px] opacity-75 font-mono tabular-nums">
                    ({count})
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nome, bioma..."
                className="pl-7 pr-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-44"
              />
            </div>

            <button
              onClick={() => setShowSubgroupFilters((prev) => !prev)}
              className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-colors ${
                showSubgroupFilters
                  ? 'bg-slate-800 border-slate-700 text-white'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Alternar filtros secundários de subgrupos"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Subgroup Filters Bar (Section 5 & 6) */}
      {(galleryFlowMode === 'free' || pipelineStep === 3) && showSubgroupFilters && (
        <div className="px-4 py-2 border-b border-slate-800/80 bg-[#0A0D14] flex items-center gap-2 flex-wrap text-xs shrink-0">
          <span className="font-semibold text-slate-400 text-[11px]">Subgrupos:</span>

          <select
            value={filterBiome}
            onChange={(e) => setFilterBiome(e.target.value)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-emerald-300 font-semibold"
          >
            <option value="ALL">Todos os Biomas</option>
            {subgroupCatalog.biomes.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={filterFamily}
            onChange={(e) => setFilterFamily(e.target.value)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-slate-200"
          >
            <option value="ALL">Todas as Famílias</option>
            {subgroupCatalog.families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={filterCollection}
            onChange={(e) => setFilterCollection(e.target.value)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-purple-300"
          >
            <option value="ALL">Todas as Coleções</option>
            {subgroupCatalog.collections.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>

          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-xs text-sky-300"
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="Criatura">Criatura</option>
            <option value="Magia">Magia</option>
            <option value="Item">Item</option>
          </select>
        </div>
      )}

      {/* Batch Selection Action Bar */}
      <div className="px-4 py-1.5 border-b border-slate-800/80 bg-[#0C0F17] flex items-center justify-between gap-2 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMultiSelectMode((prev) => !prev)}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors ${
              isMultiSelectMode
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            {isMultiSelectMode ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            <span>{isMultiSelectMode ? 'Modo Lote Ativo' : 'Seleção em Lote'}</span>
          </button>

          {isMultiSelectMode && (
            <>
              <button
                onClick={handleSelectAllFiltered}
                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
              >
                {filteredCards.length > 0 &&
                filteredCards.every((c) => validSelectedCardIds.includes(c.id))
                  ? 'Desmarcar Todos'
                  : 'Selecionar Todos'}
              </button>
              {validSelectedCardIds.length > 0 && (
                <span className="text-amber-400 font-bold font-mono">
                  {validSelectedCardIds.length} selecionados
                </span>
              )}
            </>
          )}
        </div>

        <div className="text-slate-400 font-mono text-[11px]">
          Exibindo {filteredCards.length} de {cards.length}
        </div>
      </div>

      {/* =====================================================================
          5. GRADE PRINCIPAL DE CARTAS (CARDS GRID)
         ===================================================================== */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 bg-[#080A0F]">
        {filteredCards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <Layers className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
            <p className="text-sm font-semibold text-slate-400">Nenhuma carta encontrada nesta exibição</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              Alterne os filtros acima ou utilize a Etapa 1 para carregar uma pasta ou criar novas cartas.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedRarityTab('ALL');
                  setStep2ShowOnlyUnclassified(false);
                  setSearchQuery('');
                  setFilterBiome('ALL');
                  setFilterFamily('ALL');
                  setFilterCollection('ALL');
                  setFilterEntityType('ALL');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Limpar Todos os Filtros
              </button>
              <button
                onClick={handleCreateNeutralMatrix}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Criar Matriz</span>
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid ${gridColsClass} gap-3`}>
            {filteredCards.map((card) => {
              const unclassified = isCardUnclassified(card);
              const isSelectedOnStage = card.id === activeCardId;
              const isChecked = validSelectedCardIds.includes(card.id);
              const multiSelectIndex = validSelectedCardIds.indexOf(card.id);
              const isVersion = card.recordKind === 'version';
              const isDraggingThis = draggedCardId === card.id;

              return (
                <div
                  key={card.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, card.id)}
                  onClick={(e) => {
                    if (isMultiSelectMode || e.shiftKey || e.ctrlKey || e.metaKey) {
                      toggleCardSelection(card.id);
                      return;
                    }
                    onSelectCard(card.id);
                  }}
                  className={`group relative rounded-xl p-2.5 transition-all cursor-pointer border flex flex-col ${
                    isDraggingThis
                      ? 'opacity-40 scale-95 border-emerald-400'
                      : isChecked
                      ? 'bg-amber-950/25 border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                      : isSelectedOnStage
                      ? 'bg-slate-800/90 border-emerald-500 shadow-lg'
                      : unclassified
                      ? 'bg-[#14131A] border-amber-500/35 hover:border-amber-400/70'
                      : 'bg-[#121620] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Batch Selection Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleCardSelection(card.id, e)}
                    className={`absolute top-4 left-4 z-20 px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-extrabold transition-all shadow-md ${
                      isChecked
                        ? 'bg-amber-400 text-slate-950 border border-amber-200'
                        : 'bg-slate-950/85 text-slate-300 hover:text-white border border-slate-700/90 opacity-85 group-hover:opacity-100'
                    }`}
                    title="Selecionar para ações em lote"
                  >
                    {isChecked ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>#{multiSelectIndex + 1}</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5 shrink-0" />
                        <span>Lote</span>
                      </>
                    )}
                  </button>

                  {/* Top-Right Tag Badge */}
                  <div className="absolute top-4 right-4 z-20 flex items-center gap-1">
                    {unclassified ? (
                      <span className="px-2 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold uppercase shadow">
                        Não Classificada
                      </span>
                    ) : isVersion ? (
                      <span className="px-2 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-extrabold uppercase shadow">
                        Versão
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-slate-950/90 border border-emerald-500/50 text-emerald-300 text-[9px] font-extrabold uppercase shadow">
                        {card.cardClass || 'Matriz'}
                      </span>
                    )}
                  </div>

                  {/* Thumbnail Card Render */}
                  <div className="w-full aspect-[680/990] rounded-[7px] overflow-hidden bg-black relative pointer-events-none">
                    <CardFrameSVG
                      card={card}
                      interactive={false}
                      animateChroma={false}
                      idScope={`thumb-${card.id}`}
                    />
                  </div>

                  {/* Title & Rank Row */}
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">
                      {card.title}
                    </span>
                    <span className="text-xs font-mono tabular-nums font-bold text-amber-400 shrink-0">
                      {unclassified ? 'NEUTRA' : `Rank ${card.cardRank || card.rankBadgeText || '—'}`}
                    </span>
                  </div>

                  {/* Subgroup Tags */}
                  <div className="mt-1 flex items-center gap-1 flex-wrap min-h-[20px]">
                    <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[9px] font-semibold text-sky-300">
                      {card.entityType || 'Criatura'}
                    </span>
                    {card.biome && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/50 border border-emerald-500/30 text-[9px] font-semibold text-emerald-300">
                        {card.biome}
                      </span>
                    )}
                    {card.family && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[9px] text-slate-300 truncate max-w-[110px]">
                        {card.family}
                      </span>
                    )}
                  </div>

                  {/* Rarity Selector Row */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 flex items-center justify-between gap-1 text-[11px] text-slate-400 font-mono tabular-nums"
                  >
                    <select
                      value={unclassified ? 'UNCLASSIFIED' : card.cardClass || 'UNCLASSIFIED'}
                      onChange={(e) => {
                        const nextVal = e.target.value as CardClass | 'UNCLASSIFIED';
                        updateTargetCards([card.id], (c) => applyRarityToCardRecord(c, nextVal));
                      }}
                      className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-200"
                    >
                      <option value="UNCLASSIFIED">Não Classificada</option>
                      {OFFICIAL_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          {cls}
                        </option>
                      ))}
                    </select>

                    <span className="truncate text-[10px]">
                      {unclassified
                        ? 'Sem Atributos'
                        : card.entityType === 'Magia'
                        ? `${card.pvText} · ${card.magicManaCost ?? 3} Mana`
                        : `${card.pvText} · ${card.summonStaminaCost ?? '—'} Est.`}
                    </span>
                  </div>

                  {/* Card Footer Actions */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1"
                  >
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onInspectCard(card)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Informativo da Carta"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleGenerateRandomVersionForCards([card])}
                        disabled={unclassified}
                        className="p-1 rounded hover:bg-indigo-900/50 text-indigo-400 disabled:opacity-30"
                        title="Gerar Versão Aleatória"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicateCard(card)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Duplicar"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCard(card.id)}
                        className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-500 font-mono">
                      #{card.id.slice(-4)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
});
