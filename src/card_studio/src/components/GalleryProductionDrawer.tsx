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
import { MobbyManager } from '../../../core/MobbyManager';
import { uploadFileToDisk } from '../../../core/DiskAssetEngine';

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
  // Load persisted drawer UI state so reloading the page never resets the active step
  const loadPersistedDrawerUI = () => {
    try {
      const raw = localStorage.getItem('slimelands_matrix_drawer_ui_v1');
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return null;
  };
  const persistedUI = loadPersistedDrawerUI();

  // Mode switcher: Guided Pipeline (4 Steps) vs Free Matrix Grid
  const [galleryFlowMode, setGalleryFlowMode] = useState<GalleryFlowMode>(
    persistedUI?.galleryFlowMode === 'free' ? 'free' : 'guided'
  );
  const [pipelineStep, setPipelineStep] = useState<PipelineStep>(
    persistedUI?.pipelineStep === 2 || persistedUI?.pipelineStep === 3 || persistedUI?.pipelineStep === 4
      ? persistedUI.pipelineStep
      : 1
  );

  // Target entity type when importing files/folders in Step 1 (Criatura vs Magia)
  const [ingestionEntityType, setIngestionEntityType] = useState<'Criatura' | 'Magia'>(
    persistedUI?.ingestionEntityType === 'Magia' ? 'Magia' : 'Criatura'
  );

  // Drag and Drop State for Step 2 Triagem
  const [draggedCardId, setDraggedCardId] = useState<string | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);

  // Section 7: Primary Navigation by Rarity ("Não classificadas", "Comum", "Rara", "Lendária", "Mítica", "Limitada", etc.)
  const [selectedRarityTab, setSelectedRarityTab] = useState<RarityNavFilter>(
    persistedUI?.selectedRarityTab || 'ALL'
  );
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    persistedUI?.selectedDeckId || 'ALL'
  );

  // Combined Subgroup Filters (Section 5, 6 & 7)
  const [filterFamily, setFilterFamily] = useState<string>('ALL');
  const [filterBiome, setFilterBiome] = useState<string>('ALL');
  const [filterCollection, setFilterCollection] = useState<string>('ALL');
  const [filterEntityType, setFilterEntityType] = useState<string>(
    persistedUI?.filterEntityType || 'ALL'
  );
  const [filterRecordState, setFilterRecordState] = useState<string>('ALL');
  const [filterSourceMatrixId, setFilterSourceMatrixId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Step 2 specific filter: show unclassified only vs all
  const [step2ShowOnlyUnclassified, setStep2ShowOnlyUnclassified] = useState<boolean>(
    typeof persistedUI?.step2ShowOnlyUnclassified === 'boolean'
      ? persistedUI.step2ShowOnlyUnclassified
      : true
  );

  // Step 3 visual triage dimension & pending queue filter (works like Step 2!)
  const [step3TriageDimension, setStep3TriageDimension] = useState<
    'biome' | 'family' | 'type_class' | 'collection'
  >(persistedUI?.step3TriageDimension || 'biome');
  const [step3PendingFilter, setStep3PendingFilter] = useState<
    'ALL' | 'NO_BIOME' | 'NO_FAMILY' | 'NO_COLLECTION'
  >(persistedUI?.step3PendingFilter || 'ALL');
  const [showStep3ComboBar, setShowStep3ComboBar] = useState<boolean>(false);

  React.useEffect(() => {
    try {
      localStorage.setItem(
        'slimelands_matrix_drawer_ui_v1',
        JSON.stringify({
          galleryFlowMode,
          pipelineStep,
          ingestionEntityType,
          selectedRarityTab,
          selectedDeckId,
          filterEntityType,
          step2ShowOnlyUnclassified,
          step3TriageDimension,
          step3PendingFilter,
        })
      );
    } catch {
      // ignore storage quota errors
    }
  }, [
    galleryFlowMode,
    pipelineStep,
    ingestionEntityType,
    selectedRarityTab,
    selectedDeckId,
    filterEntityType,
    step2ShowOnlyUnclassified,
    step3TriageDimension,
    step3PendingFilter,
  ]);

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
  const [showSubgroupFilters, setShowSubgroupFilters] = useState(false);
  const [isStepDockCollapsed, setIsStepDockCollapsed] = useState(false);

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

  // Converts a card between Criatura, Magia, and Item while preserving its rarity classification state!
  const convertCardToEntityType = (c: CardData, targetEntity: CardEntityType): CardData => {
    const rawNum =
      c.pvNumber ||
      parseInt((c.pvText || '').replace(/\D/g, ''), 10) ||
      300;
    if (targetEntity === 'Magia') {
      const manaCost = c.magicManaCost ?? 3;
      return {
        ...c,
        entityType: 'Magia',
        pvNumber: rawNum,
        pvText: c.isNeutralMatrix ? 'DF—' : `DF${rawNum}`,
        magicManaCost: manaCost,
        summonStaminaCost: undefined,
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
      };
    } else if (targetEntity === 'Item') {
      return {
        ...c,
        entityType: 'Item',
        pvNumber: undefined,
        summonStaminaCost: undefined,
        showSummonCostPill: false,
        pvText: 'ITEM',
      };
    } else {
      const stamCost = c.summonStaminaCost ?? 2;
      return {
        ...c,
        entityType: 'Criatura',
        pvNumber: rawNum,
        pvText: c.isNeutralMatrix ? 'PV—' : `PV${rawNum}`,
        summonStaminaCost: stamCost,
        showSummonCostPill: true,
        summonCostPill: {
          id: 'pill-summon-cost',
          mode: 'stat',
          badgeValue: String(stamCost),
          badgeColor: '#F59E0B',
          mainText: 'EST',
          isSummonCost: true,
          costResource: 'stamina',
        },
      };
    }
  };

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
      // Converts card(s) to Magia WITHOUT overwriting rarity or removing them from unclassified rarity triage!
      onReplaceCards(
        cards.map((c) =>
          targetIds.includes(c.id) ? convertCardToEntityType(c, 'Magia') : c
        )
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
        const tempPreviewUrl = URL.createObjectURL(file);

        const rawName = file.name.replace(/\.[^/.]+$/, '').trim();
        const baseTitle =
          rawName
            .replace(/[_-]+/g, ' ')
            .replace(/\s+/g, ' ')
            .replace(/^\d+[\s.-]*/, '')
            .trim() || `Carta Matriz ${cards.length + i + 1}`;

        let extractedPalettes = DEFAULT_PRESET_PALETTES;
        try {
          const palettes = await extractAdaptivePalettesFromImage(tempPreviewUrl);
          if (palettes && palettes.length > 0) {
            extractedPalettes = palettes;
          }
        } catch {
          // fallback
        } finally {
          URL.revokeObjectURL(tempPreviewUrl);
        }

        // Persist physical file to project disk unit (/public/cards/...)
        const diskImageUrl = await uploadFileToDisk(file, 'cards');

        let neutralMatrix = createNeutralMatrixCard({
          title: baseTitle,
          imageUrl: diskImageUrl,
          deckId: targetDeck,
          palette: extractedPalettes[0],
        });
        if (ingestionEntityType === 'Magia') {
          neutralMatrix = convertCardToEntityType(neutralMatrix, 'Magia');
        }
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
          if (ingestionEntityType === 'Magia') {
            setFilterEntityType('Magia');
          }
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
    let newBlank: CardData = {
      ...BLANK_TEMPLATE_CARD,
      id: `mtx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: `Nova Matriz ${cards.length + 1}`,
      deckId: targetDeck,
      origin: 'Manual',
      backImageUrl: globalBackImageUrl || null,
      createdAt: new Date().toISOString(),
    };
    if (ingestionEntityType === 'Magia') {
      newBlank = convertCardToEntityType(newBlank, 'Magia');
    }
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
          const numDf =
            next.pvNumber ||
            parseInt((next.pvText || '').replace(/\D/g, ''), 10) ||
            300;
          next.cardClass = next.cardClass || 'Rara';
          next.summonStaminaCost = undefined;
          next.magicManaCost = manaCost;
          next.pvNumber = numDf;
          next.pvText = next.isNeutralMatrix ? 'DF—' : `DF${numDf}`;
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
          const numPv =
            next.pvNumber ||
            parseInt((next.pvText || '').replace(/\D/g, ''), 10) ||
            300;
          next.pvNumber = numPv;
          next.pvText = next.isNeutralMatrix ? 'PV—' : `PV${numPv}`;
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
  const missingBiomeCount = cards.length - cardsWithBiome;
  const missingFamilyCount = cards.length - cardsWithFamily;
  const missingCollectionCount = cards.filter(
    (c) => !c.collections || c.collections.length === 0
  ).length;

  const isBoosterReady =
    commonCount >= 4 && rareCount >= 2 && magicCount >= 2 && highRankCount >= 1;

  // Apply 1-click or drag-and-drop action in Step 3 visual boxes
  const applyStep3BoxToCards = (
    targetIds: string[],
    kind: 'biome' | 'family' | 'collection' | 'entity' | 'rarity' | 'deck',
    value: string
  ) => {
    if (targetIds.length === 0) return;

    if (kind === 'deck') {
      targetIds.forEach((id) => onAssignCardDeck(id, value));
      setSelectedCardIds([]);
      return;
    }

    updateTargetCards(targetIds, (card) => {
      if (kind === 'biome') {
        const nextBiome = value === '__CLEAR__' ? undefined : value;
        const nextElem =
          nextBiome && (!card.elementText || card.elementText === 'NEUTRA')
            ? nextBiome.slice(0, 6).toUpperCase()
            : card.elementText;
        return {
          ...card,
          biome: nextBiome,
          elementText: nextElem,
        };
      }
      if (kind === 'family') {
        return {
          ...card,
          family: value === '__CLEAR__' ? undefined : value,
        };
      }
      if (kind === 'collection') {
        if (value === '__CLEAR__') {
          return { ...card, collections: [] };
        }
        const current = card.collections || [];
        return {
          ...card,
          collections: current.includes(value) ? current : [...current, value],
        };
      }
      if (kind === 'entity') {
        return convertCardToEntityType(card, value as CardEntityType);
      }
      if (kind === 'rarity') {
        return applyRarityToCardRecord(card, value as CardClass | 'UNCLASSIFIED');
      }
      return card;
    });
    setSelectedCardIds([]);
  };

  const handleDropOnStep3Box = (
    e: React.DragEvent,
    kind: 'biome' | 'family' | 'collection' | 'entity' | 'rarity' | 'deck',
    value: string
  ) => {
    e.preventDefault();
    setActiveDropZone(null);
    const droppedId = e.dataTransfer.getData('text/plain') || draggedCardId;
    setDraggedCardId(null);
    if (!droppedId) return;

    const targetIds = validSelectedCardIds.includes(droppedId)
      ? validSelectedCardIds
      : [droppedId];
    applyStep3BoxToCards(targetIds, kind, value);
  };

  // Filtered Cards logic
  const filteredCards = cards.filter((c) => {
    // In Guided Mode Step 2 with "Show unclassified only"
    if (galleryFlowMode === 'guided' && pipelineStep === 2 && step2ShowOnlyUnclassified) {
      if (!isCardUnclassified(c)) return false;
    }

    // In Guided Mode Step 3 with Pending Queue Filter ("Sem Bioma", "Sem Família", "Sem Coleção")
    if (galleryFlowMode === 'guided' && pipelineStep === 3) {
      if (step3PendingFilter === 'NO_BIOME' && c.biome) return false;
      if (step3PendingFilter === 'NO_FAMILY' && c.family) return false;
      if (
        step3PendingFilter === 'NO_COLLECTION' &&
        c.collections &&
        c.collections.length > 0
      ) {
        return false;
      }
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
      label: '🔮 Converter p/ Magia',
      sublabel: 'Define tipo Magia (Mantém Triagem)',
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
          1. BARRA UNIFICADA DE TOPO: ETAPAS INLINE + IMPORTAÇÃO RÁPIDA + LAYOUT
         ===================================================================== */}
      <div className="px-2.5 py-1.5 border-b border-slate-800/80 bg-[#0E1118] flex items-center justify-between gap-1.5 flex-wrap shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Pipeline Steps & Free Grid Switcher Inline */}
          <div className="flex items-center gap-0.5 bg-slate-950/90 border border-slate-800 rounded-lg p-0.5">
            {([
              { step: 1 as const, label: '1. Importar' },
              {
                step: 2 as const,
                label: '2. Raridades',
                badge: unclassifiedCount > 0 ? `${unclassifiedCount}` : undefined,
              },
              {
                step: 3 as const,
                label: '3. Bioma & Tipo',
                badge:
                  missingBiomeCount > 0
                    ? `${cardsWithBiome}/${cards.length}`
                    : undefined,
              },
              {
                step: 4 as const,
                label: '4. Diagnóstico',
                ok: isBoosterReady,
              },
            ]).map((item) => {
              const active =
                galleryFlowMode === 'guided' && pipelineStep === item.step;
              return (
                <button
                  key={item.step}
                  type="button"
                  onClick={() => {
                    setGalleryFlowMode('guided');
                    setPipelineStep(item.step);
                    setIsStepDockCollapsed(false);
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                    active
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`px-1 rounded text-[9px] font-mono ${
                        active
                          ? 'bg-black/30 text-amber-200 font-black'
                          : 'bg-slate-800 text-amber-300'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

            <button
              type="button"
              onClick={() => setGalleryFlowMode('free')}
              className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 whitespace-nowrap ${
                galleryFlowMode === 'free'
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Grade Livre sem caixas de etapa"
            >
              <Grid className="w-3 h-3" />
              <span>Livre</span>
            </button>

            {galleryFlowMode === 'guided' && (
              <button
                type="button"
                onClick={() => setIsStepDockCollapsed((prev) => !prev)}
                className="px-1.5 py-1 rounded-md text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800"
                title={
                  isStepDockCollapsed
                    ? 'Mostrar barra de caixas da etapa atual'
                    : 'Recolher barra de caixas para ganhar mais espaço vertical nas cartas'
                }
              >
                {isStepDockCollapsed ? '▼ Caixas' : '▲ Ocultar'}
              </button>
            )}
          </div>

          {/* Instant Import Shortcuts */}
          <div className="flex items-center gap-0.5 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() =>
                setIngestionEntityType((prev) =>
                  prev === 'Magia' ? 'Criatura' : 'Magia'
                )
              }
              title="Tipo padrão ao importar novas imagens ou pastas (Clique para alternar)"
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                ingestionEntityType === 'Magia'
                  ? 'bg-purple-600/80 text-white'
                  : 'bg-emerald-600/80 text-white'
              }`}
            >
              {ingestionEntityType === 'Magia' ? '🔮 Magia' : '🐉 Criatura'}
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-[10px] font-bold text-amber-300 flex items-center gap-0.5"
              title="Importar pasta inteira de imagens direto na Matriz"
            >
              <FolderUp className="w-3 h-3" />
              <span>+Pasta</span>
            </button>
            <button
              type="button"
              onClick={() => multiFilesInputRef.current?.click()}
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-[10px] font-bold text-sky-300 flex items-center gap-0.5"
              title="Importar imagens avulsas direto na Matriz"
            >
              <ImagePlus className="w-3 h-3" />
              <span>+Imgs</span>
            </button>
            <button
              type="button"
              onClick={handleCreateNeutralMatrix}
              className="px-1.5 py-0.5 rounded hover:bg-slate-800 text-[10px] font-bold text-emerald-300 flex items-center gap-0.5"
              title="Criar nova carta Matriz em branco"
            >
              <Plus className="w-3 h-3" />
              <span>Nova</span>
            </button>
          </div>
        </div>

        {/* Right Tools: Verso Global + Grid Zoom + Limpar + Expand */}
        <div className="flex items-center gap-1 flex-wrap">
          <div className="flex items-center gap-1 bg-purple-950/30 border border-purple-500/35 rounded-lg px-1.5 py-0.5">
            {globalBackImageUrl && (
              <img
                src={globalBackImageUrl}
                alt="Verso Global"
                className="w-3 h-4 object-fill rounded-[1px] border border-purple-400/50 shrink-0"
              />
            )}
            <button
              onClick={onUploadGlobalBack}
              className="text-[10px] font-semibold text-purple-200 hover:text-white flex items-center gap-1 whitespace-nowrap"
              title="Definir Verso Global"
            >
              <span>{globalBackImageUrl ? 'Verso' : '+Verso'}</span>
            </button>
            <button
              onClick={onFlipCardPreview}
              className="px-1 py-0.2 rounded bg-purple-600/80 hover:bg-purple-500 text-[9px] font-bold text-white"
            >
              Ver
            </button>
            {globalBackImageUrl && (
              <button
                onClick={onClearGlobalBack}
                className="text-[9px] text-rose-300 hover:text-rose-200 px-0.5"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            {([3, 4, 5, 6] as const).map((cols) => (
              <button
                key={cols}
                onClick={() => setGridCols(cols)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono tabular-nums font-bold transition-colors ${
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
              className="px-1.5 py-0.5 rounded-lg bg-slate-900 hover:bg-rose-950/60 border border-slate-800 text-[10px] font-medium text-slate-400 hover:text-rose-300 transition-colors"
            >
              Limpar
            </button>
          )}

          <button
            onClick={onToggleExpandedWide}
            className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-200 flex items-center gap-1 transition-colors"
          >
            {isExpandedWide ? (
              <>
                <Minimize2 className="w-3 h-3" />
                <span>Reduzir</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3 h-3" />
                <span>Expandir</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. FAIXA COMPACTA DE CAIXAS DA ETAPA ATUAL (OCUPA ~48px EM VEZ DE 280px)
         ===================================================================== */}
      {galleryFlowMode === 'guided' && !isStepDockCollapsed && pipelineStep === 1 && (
        <div className="px-3 py-2 bg-[#0A0D14] border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-300">
              Importar como:
            </span>
            <button
              type="button"
              onClick={() => {
                setIngestionEntityType('Criatura');
                setFilterEntityType('ALL');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                ingestionEntityType === 'Criatura'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🐉 Criaturas (PV)
            </button>
            <button
              type="button"
              onClick={() => {
                setIngestionEntityType('Magia');
                setFilterEntityType('Magia');
              }}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                ingestionEntityType === 'Magia'
                  ? 'bg-purple-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              🔮 Magias (+DF no PV do Player)
            </button>

            <div className="w-[1px] h-4 bg-slate-800 mx-1" />

            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={isImportingFolder}
              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-[11px] flex items-center gap-1"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Importar Pasta</span>
            </button>
            <button
              onClick={() => multiFilesInputRef.current?.click()}
              className="px-2.5 py-1 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/40 text-sky-300 font-bold text-[11px] flex items-center gap-1"
            >
              <ImagePlus className="w-3.5 h-3.5" />
              <span>Adicionar Imagens</span>
            </button>
            <button
              onClick={handleCreateNeutralMatrix}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 font-bold text-[11px] flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Criar em Branco</span>
            </button>
          </div>

          <button
            onClick={() => setPipelineStep(2)}
            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-bold text-white flex items-center gap-1"
          >
            <span>Etapa 2: Raridades ({unclassifiedCount} pend.)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      {galleryFlowMode === 'guided' && !isStepDockCollapsed && pipelineStep === 2 && (
        <div className="px-3 py-1.5 bg-[#0A0D14] border-b border-slate-800/80 space-y-1.5 shrink-0">
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400">
              <strong className="text-white">Etapa 2 (Raridades):</strong> Arraste cartas ou selecione em lote e clique na caixa:
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPipelineStep(3)}
                className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white flex items-center gap-1"
              >
                <span>Etapa 3: Biomas & Tipos</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Compact Single-Row Drop Chips for Rarity */}
          <div className="grid grid-cols-3 sm:grid-cols-7 gap-1.5">
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
                    const targets =
                      validSelectedCardIds.length > 0
                        ? validSelectedCardIds
                        : activeCardId
                        ? [activeCardId]
                        : [];
                    if (targets.length === 0) return;
                    if (cat.key === 'Magia') {
                      onReplaceCards(
                        cards.map((c) =>
                          targets.includes(c.id)
                            ? convertCardToEntityType(c, 'Magia')
                            : c
                        )
                      );
                    } else {
                      onReplaceCards(
                        cards.map((c) =>
                          targets.includes(c.id)
                            ? applyRarityToCardRecord(c, cat.key as CardClass)
                            : c
                        )
                      );
                    }
                    setSelectedCardIds([]);
                  }}
                  title={`${cat.label} — Arraste uma carta ou clique para aplicar às selecionadas`}
                  className={`px-2 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-1 ${
                    cat.bgClass
                  } ${
                    isOver
                      ? 'border-emerald-400 ring-2 ring-emerald-400/60 scale-[1.02]'
                      : hasChecked
                      ? `${cat.borderClass} hover:border-white`
                      : `${cat.borderClass} hover:border-slate-500`
                  }`}
                >
                  <span className={`text-[11px] font-bold truncate ${cat.textClass}`}>
                    {cat.key === 'Magia' ? '🔮 Magia (DF)' : cat.label}
                  </span>
                  <span className="px-1.5 py-0.2 rounded-full bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-white shrink-0">
                    {cat.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {galleryFlowMode === 'guided' && !isStepDockCollapsed && pipelineStep === 3 && (
        <div className="px-3 py-1.5 bg-[#0A0D14] border-b border-slate-800/80 space-y-1.5 shrink-0">
          {/* Compact Dimension Tabs + Actions on ONE slim line */}
          <div className="flex items-center justify-between gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => setStep3TriageDimension('biome')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                  step3TriageDimension === 'biome'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <span>🌍 Biomas ({subgroupCatalog.biomes.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStep3TriageDimension('family')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                  step3TriageDimension === 'family'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <span>🧬 Famílias ({subgroupCatalog.families.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStep3TriageDimension('type_class')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                  step3TriageDimension === 'type_class'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <span>⚡ Tipo & Classe</span>
              </button>
              <button
                type="button"
                onClick={() => setStep3TriageDimension('collection')}
                className={`px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                  step3TriageDimension === 'collection'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800/80 text-slate-300 hover:text-white'
                }`}
              >
                <span>🎴 Decks & Coleções</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setNewSubgroupKind(
                    step3TriageDimension === 'family'
                      ? 'family'
                      : step3TriageDimension === 'collection'
                      ? 'collection'
                      : 'biome'
                  )
                }
                className="px-2 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold"
              >
                + Criar {step3TriageDimension === 'family' ? 'Família' : step3TriageDimension === 'collection' ? 'Coleção' : 'Bioma'}
              </button>
              <button
                type="button"
                onClick={() => setShowStep3ComboBar((prev) => !prev)}
                className={`px-2 py-1 rounded-md border text-[10px] font-semibold ${
                  showStep3ComboBar
                    ? 'bg-slate-700 border-slate-500 text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
              >
                Combo Multi-Tags
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPipelineStep(4)}
                className="px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-[10px] font-bold text-white flex items-center gap-1"
              >
                <span>Diagnóstico</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Quick Create Subgroup Inline Modal */}
          {newSubgroupKind && (
            <div className="p-1.5 rounded-lg bg-slate-900 border border-emerald-500/50 flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-emerald-400">
                Novo {newSubgroupKind === 'biome' ? 'Bioma' : newSubgroupKind === 'family' ? 'Família' : 'Coleção'}:
              </span>
              <input
                type="text"
                value={newSubgroupValue}
                onChange={(e) => setNewSubgroupValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveNewSubgroup()}
                placeholder="Nome..."
                autoFocus
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-xs text-white flex-1"
              />
              <button
                onClick={handleSaveNewSubgroup}
                className="px-2.5 py-0.5 rounded bg-emerald-600 text-[11px] font-bold text-white"
              >
                Salvar
              </button>
              <button
                onClick={() => {
                  setNewSubgroupKind(null);
                  setNewSubgroupValue('');
                }}
                className="px-2 py-0.5 rounded bg-slate-800 text-[11px] text-slate-400"
              >
                ✕
              </button>
            </div>
          )}

          {/* ULTRA-COMPACT 1-LINE DROP CHIPS FOR STEP 3 */}
          {step3TriageDimension === 'biome' && (
            <div className="flex items-center gap-1.5 flex-wrap max-h-20 overflow-y-auto">
              {subgroupCatalog.biomes.map((biome) => {
                const zoneKey = `biome:${biome}`;
                const isOver = activeDropZone === zoneKey;
                const count = cards.filter((c) => c.biome === biome).length;
                const hasChecked = validSelectedCardIds.length > 0;
                return (
                  <div
                    key={biome}
                    onDragOver={(e) => handleDragOverCategory(e, zoneKey)}
                    onDragLeave={handleDragLeaveCategory}
                    onDrop={(e) => handleDropOnStep3Box(e, 'biome', biome)}
                    onClick={() => {
                      const targets =
                        validSelectedCardIds.length > 0
                          ? validSelectedCardIds
                          : activeCardId
                          ? [activeCardId]
                          : [];
                      applyStep3BoxToCards(targets, 'biome', biome);
                    }}
                    title={`Arraste cartas ou clique para aplicar Bioma: ${biome}`}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-950/35 ${
                      isOver
                        ? 'border-emerald-400 ring-2 ring-emerald-400/60 scale-[1.03]'
                        : hasChecked
                        ? 'border-emerald-500/70 hover:border-white'
                        : 'border-emerald-600/40 hover:border-emerald-400'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-emerald-300 whitespace-nowrap">
                      🌍 {biome}
                    </span>
                    <span className="px-1.5 py-0.1 rounded-full bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-white">
                      {count}
                    </span>
                  </div>
                );
              })}

              <div
                onDragOver={(e) => handleDragOverCategory(e, 'biome:__CLEAR__')}
                onDragLeave={handleDragLeaveCategory}
                onDrop={(e) => handleDropOnStep3Box(e, 'biome', '__CLEAR__')}
                onClick={() => {
                  const targets =
                    validSelectedCardIds.length > 0
                      ? validSelectedCardIds
                      : activeCardId
                      ? [activeCardId]
                      : [];
                  applyStep3BoxToCards(targets, 'biome', '__CLEAR__');
                }}
                title="Remover Bioma das cartas selecionadas"
                className="px-2.5 py-1 rounded-lg border border-rose-500/40 hover:border-rose-400 bg-rose-950/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="text-[11px] font-bold text-rose-300 whitespace-nowrap">
                  🚫 Sem Bioma
                </span>
                <span className="px-1.5 py-0.1 rounded-full bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-white">
                  {missingBiomeCount}
                </span>
              </div>
            </div>
          )}

          {step3TriageDimension === 'family' && (
            <div className="flex items-center gap-1.5 flex-wrap max-h-20 overflow-y-auto">
              {subgroupCatalog.families.map((fam) => {
                const zoneKey = `family:${fam}`;
                const isOver = activeDropZone === zoneKey;
                const count = cards.filter((c) => c.family === fam).length;
                const hasChecked = validSelectedCardIds.length > 0;
                return (
                  <div
                    key={fam}
                    onDragOver={(e) => handleDragOverCategory(e, zoneKey)}
                    onDragLeave={handleDragLeaveCategory}
                    onDrop={(e) => handleDropOnStep3Box(e, 'family', fam)}
                    onClick={() => {
                      const targets =
                        validSelectedCardIds.length > 0
                          ? validSelectedCardIds
                          : activeCardId
                          ? [activeCardId]
                          : [];
                      applyStep3BoxToCards(targets, 'family', fam);
                    }}
                    title={`Arraste cartas ou clique para aplicar Família: ${fam}`}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 bg-sky-950/35 ${
                      isOver
                        ? 'border-sky-400 ring-2 ring-sky-400/60 scale-[1.03]'
                        : hasChecked
                        ? 'border-sky-500/70 hover:border-white'
                        : 'border-sky-600/40 hover:border-sky-400'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-sky-300 whitespace-nowrap">
                      🧬 {fam}
                    </span>
                    <span className="px-1.5 py-0.1 rounded-full bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-white">
                      {count}
                    </span>
                  </div>
                );
              })}

              <div
                onDragOver={(e) => handleDragOverCategory(e, 'family:__CLEAR__')}
                onDragLeave={handleDragLeaveCategory}
                onDrop={(e) => handleDropOnStep3Box(e, 'family', '__CLEAR__')}
                onClick={() => {
                  const targets =
                    validSelectedCardIds.length > 0
                      ? validSelectedCardIds
                      : activeCardId
                      ? [activeCardId]
                      : [];
                  applyStep3BoxToCards(targets, 'family', '__CLEAR__');
                }}
                className="px-2.5 py-1 rounded-lg border border-rose-500/40 hover:border-rose-400 bg-rose-950/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className="text-[11px] font-bold text-rose-300 whitespace-nowrap">
                  🚫 Sem Família
                </span>
                <span className="px-1.5 py-0.1 rounded-full bg-slate-950/90 border border-slate-700 text-[10px] font-mono text-white">
                  {missingFamilyCount}
                </span>
              </div>
            </div>
          )}

          {step3TriageDimension === 'type_class' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  {
                    kind: 'entity' as const,
                    val: 'Criatura',
                    label: '🐉 Criatura (PV)',
                    cls: 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300',
                    count: cards.filter((c) => (c.entityType || 'Criatura') === 'Criatura').length,
                  },
                  {
                    kind: 'entity' as const,
                    val: 'Magia',
                    label: '🔮 Magia (+DF)',
                    cls: 'bg-purple-950/40 border-purple-500/50 text-purple-300',
                    count: cards.filter((c) => c.entityType === 'Magia').length,
                  },
                  {
                    kind: 'entity' as const,
                    val: 'Item',
                    label: '🛡️ Item',
                    cls: 'bg-sky-950/40 border-sky-500/50 text-sky-300',
                    count: cards.filter((c) => c.entityType === 'Item').length,
                  },
                  ...OFFICIAL_CLASSES.map((r) => ({
                    kind: 'rarity' as const,
                    val: r,
                    label: `⭐ ${r}`,
                    cls: 'bg-slate-900/90 border-slate-700 text-amber-300',
                    count: cards.filter((c) => c.cardClass === r).length,
                  })),
                ]
              ).map((box) => {
                const zoneKey = `${box.kind}:${box.val}`;
                const isOver = activeDropZone === zoneKey;
                const hasChecked = validSelectedCardIds.length > 0;
                return (
                  <div
                    key={zoneKey}
                    onDragOver={(e) => handleDragOverCategory(e, zoneKey)}
                    onDragLeave={handleDragLeaveCategory}
                    onDrop={(e) => handleDropOnStep3Box(e, box.kind, box.val)}
                    onClick={() => {
                      const targets =
                        validSelectedCardIds.length > 0
                          ? validSelectedCardIds
                          : activeCardId
                          ? [activeCardId]
                          : [];
                      applyStep3BoxToCards(targets, box.kind, box.val);
                    }}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${box.cls} ${
                      isOver
                        ? 'ring-2 ring-emerald-400 scale-[1.03]'
                        : hasChecked
                        ? 'hover:border-white'
                        : 'hover:border-slate-400'
                    }`}
                  >
                    <span className="text-[11px] font-bold whitespace-nowrap">{box.label}</span>
                    <span className="px-1.5 py-0.1 rounded-full bg-slate-950/80 text-[10px] font-mono text-white">
                      {box.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {step3TriageDimension === 'collection' && (
            <div className="flex items-center gap-1.5 flex-wrap max-h-20 overflow-y-auto">
              {decks.map((d) => {
                const zoneKey = `deck:${d.id}`;
                const isOver = activeDropZone === zoneKey;
                const count = cards.filter((c) => (c.deckId || 'deck-main') === d.id).length;
                return (
                  <div
                    key={zoneKey}
                    onDragOver={(e) => handleDragOverCategory(e, zoneKey)}
                    onDragLeave={handleDragLeaveCategory}
                    onDrop={(e) => handleDropOnStep3Box(e, 'deck', d.id)}
                    onClick={() => {
                      const targets =
                        validSelectedCardIds.length > 0
                          ? validSelectedCardIds
                          : activeCardId
                          ? [activeCardId]
                          : [];
                      applyStep3BoxToCards(targets, 'deck', d.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 bg-amber-950/25 ${
                      isOver
                        ? 'border-amber-400 ring-2 ring-amber-400/60 scale-[1.03]'
                        : 'border-amber-500/40 hover:border-amber-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-amber-300 whitespace-nowrap">
                      🎴 {d.name}
                    </span>
                    <span className="px-1.5 py-0.1 rounded-full bg-slate-950/80 text-[10px] font-mono text-white">
                      {count}
                    </span>
                  </div>
                );
              })}

              {subgroupCatalog.collections.map((col) => {
                const zoneKey = `collection:${col}`;
                const isOver = activeDropZone === zoneKey;
                const count = cards.filter(
                  (c) => c.collections && c.collections.includes(col)
                ).length;
                return (
                  <div
                    key={zoneKey}
                    onDragOver={(e) => handleDragOverCategory(e, zoneKey)}
                    onDragLeave={handleDragLeaveCategory}
                    onDrop={(e) => handleDropOnStep3Box(e, 'collection', col)}
                    onClick={() => {
                      const targets =
                        validSelectedCardIds.length > 0
                          ? validSelectedCardIds
                          : activeCardId
                          ? [activeCardId]
                          : [];
                      applyStep3BoxToCards(targets, 'collection', col);
                    }}
                    className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 bg-purple-950/30 ${
                      isOver
                        ? 'border-purple-400 ring-2 ring-purple-400/60 scale-[1.03]'
                        : 'border-purple-500/40 hover:border-purple-300'
                    }`}
                  >
                    <span className="text-[11px] font-bold text-purple-300 whitespace-nowrap">
                      📚 {col}
                    </span>
                    <span className="px-1.5 py-0.1 rounded-full bg-slate-950/80 text-[10px] font-mono text-white">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Optional Multi-Tag Combo Bar */}
          {showStep3ComboBar && (
            <div className="flex items-center gap-1.5 flex-wrap bg-slate-900/80 border border-slate-800 rounded-lg p-1.5">
              <span className="text-[11px] font-bold text-slate-300">
                Combo ({validSelectedCardIds.length || (activeCardId ? '1' : '0')}):
              </span>
              <select
                value={batchBiome}
                onChange={(e) => setBatchBiome(e.target.value)}
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-emerald-300 font-semibold"
              >
                <option value="">Bioma...</option>
                {subgroupCatalog.biomes.map((b) => (
                  <option key={b} value={b}>
                    Bioma: {b}
                  </option>
                ))}
                <option value="__CLEAR__">(Remover Bioma)</option>
              </select>

              <select
                value={batchFamily}
                onChange={(e) => setBatchFamily(e.target.value)}
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
              >
                <option value="">Família...</option>
                {subgroupCatalog.families.map((f) => (
                  <option key={f} value={f}>
                    Família: {f}
                  </option>
                ))}
                <option value="__CLEAR__">(Remover Família)</option>
              </select>

              <select
                value={batchCollection}
                onChange={(e) => setBatchCollection(e.target.value)}
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-purple-300"
              >
                <option value="">Coleção...</option>
                {subgroupCatalog.collections.map((col) => (
                  <option key={col} value={col}>
                    Coleção: {col}
                  </option>
                ))}
                <option value="__CLEAR__">(Limpar Coleções)</option>
              </select>

              <select
                value={batchEntityType}
                onChange={(e) => setBatchEntityType(e.target.value as CardEntityType | '')}
                className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[11px] text-sky-300 font-semibold"
              >
                <option value="">Tipo...</option>
                <option value="Criatura">Criatura (PV)</option>
                <option value="Magia">Magia (+DF)</option>
                <option value="Item">Item</option>
              </select>

              <button
                onClick={handleApplyBatchClassifications}
                disabled={!batchBiome && !batchFamily && !batchCollection && !batchEntityType}
                className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-[11px] font-bold text-white transition-all"
              >
                Aplicar Combo
              </button>
            </div>
          )}
        </div>
      )}

      {galleryFlowMode === 'guided' && !isStepDockCollapsed && pipelineStep === 4 && (
        <div className="px-3 py-2 bg-[#0A0D14] border-b border-slate-800/80 flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="font-bold text-white flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              Diagnóstico Pack 9 Cartas:
            </span>
            <span className={commonCount >= 4 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              Comum {commonCount}/4
            </span>
            <span className="text-slate-600">·</span>
            <span className={rareCount >= 2 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              Rara {rareCount}/2
            </span>
            <span className="text-slate-600">·</span>
            <span className={magicCount >= 2 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              Magia(DF) {magicCount}/2
            </span>
            <span className="text-slate-600">·</span>
            <span className={highRankCount >= 1 ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              Rank A/S {highRankCount}/1
            </span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-300">
              Biomas {cardsWithBiome}/{cards.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExportMatrixJson}
              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-semibold text-sky-300 flex items-center gap-1"
            >
              <FileDown className="w-3 h-3" />
              <span>Exportar JSON</span>
            </button>
            <button
              onClick={onOpenBoosterModal}
              className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-[11px] font-black text-slate-950 flex items-center gap-1"
            >
              <ShoppingBag className="w-3 h-3" />
              <span>Testar Boosters</span>
            </button>
          </div>
        </div>
      )}

      {/* =====================================================================
          3. BARRA ÚNICA DE FILTROS, BUSCA E AÇÕES EM LOTE (SEM DUPLICIDADE!)
         ===================================================================== */}
      <div className="px-2.5 py-1.5 border-b border-slate-800/80 bg-[#0C0F17] flex items-center justify-between gap-1.5 flex-wrap shrink-0 text-xs">
        {/* Left: Active Mode Queue / Rarity Tabs + Lote Selection */}
        <div className="flex items-center gap-1 flex-wrap">
          <button
            onClick={() => setIsMultiSelectMode((prev) => !prev)}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              isMultiSelectMode
                ? 'bg-amber-400 text-slate-950 font-bold'
                : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
            }`}
            title="Ativar seleção múltipla com 1 clique nas cartas"
          >
            {isMultiSelectMode ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
            <span>Lote</span>
          </button>

          <button
            onClick={handleSelectAllFiltered}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold"
          >
            {filteredCards.length > 0 &&
            filteredCards.every((c) => validSelectedCardIds.includes(c.id))
              ? 'Desmarcar'
              : `Sel. (${filteredCards.length})`}
          </button>

          <div className="w-[1px] h-3.5 bg-slate-800 mx-0.5" />

          {/* Context-aware Queue Filter Pills (No duplicate bars!) */}
          {galleryFlowMode === 'guided' && pipelineStep === 2 ? (
            <>
              <button
                onClick={() => setStep2ShowOnlyUnclassified(true)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  step2ShowOnlyUnclassified
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Pendentes ({unclassifiedCount})
              </button>
              <button
                onClick={() => setStep2ShowOnlyUnclassified(false)}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  !step2ShowOnlyUnclassified
                    ? 'bg-white text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Todas ({cards.length})
              </button>
            </>
          ) : galleryFlowMode === 'guided' && pipelineStep === 3 ? (
            <>
              <button
                type="button"
                onClick={() => setStep3PendingFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  step3PendingFilter === 'ALL'
                    ? 'bg-white text-slate-950 font-bold'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Todas ({cards.length})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep3PendingFilter('NO_BIOME');
                  setStep3TriageDimension('biome');
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  step3PendingFilter === 'NO_BIOME'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-emerald-300 hover:text-white'
                }`}
              >
                S/ Bioma ({missingBiomeCount})
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep3PendingFilter('NO_FAMILY');
                  setStep3TriageDimension('family');
                }}
                className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                  step3PendingFilter === 'NO_FAMILY'
                    ? 'bg-sky-500 text-slate-950 font-bold'
                    : 'bg-slate-900 text-sky-300 hover:text-white'
                }`}
              >
                S/ Família ({missingFamilyCount})
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedRarityTab('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  selectedRarityTab === 'ALL'
                    ? 'bg-white text-slate-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Todas ({cards.length})
              </button>
              <button
                onClick={() => setSelectedRarityTab('UNCLASSIFIED')}
                className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  selectedRarityTab === 'UNCLASSIFIED'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-amber-950/40 text-amber-300 border border-amber-500/40'
                }`}
              >
                S/ Raridade ({unclassifiedCount})
              </button>
              {enabledRarities.map((rarity) => {
                const count = cards.filter((c) => c.cardClass === rarity).length;
                return (
                  <button
                    key={rarity}
                    onClick={() => setSelectedRarityTab(rarity)}
                    className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      selectedRarityTab === rarity
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {rarity} ({count})
                  </button>
                );
              })}
            </>
          )}

          {/* Batch quick actions when cards are checked */}
          {validSelectedCardIds.length > 0 && (
            <>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-300 font-bold font-mono text-[10px]">
                {validSelectedCardIds.length} sel.
              </span>
              <button
                type="button"
                onClick={() => {
                  updateTargetCards(validSelectedCardIds, (c) =>
                    convertCardToEntityType(c, 'Criatura')
                  );
                  setSelectedCardIds([]);
                }}
                className="px-1.5 py-0.5 rounded bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 text-[10px] font-bold"
              >
                🐉 Criatura (PV)
              </button>
              <button
                type="button"
                onClick={() => {
                  updateTargetCards(validSelectedCardIds, (c) =>
                    convertCardToEntityType(c, 'Magia')
                  );
                  setSelectedCardIds([]);
                }}
                className="px-1.5 py-0.5 rounded bg-purple-950/70 hover:bg-purple-900 border border-purple-500/50 text-purple-300 text-[10px] font-bold"
              >
                🔮 Magia (+DF)
              </button>
              <button
                type="button"
                onClick={() =>
                  handleGenerateRandomVersionForCards(
                    cards.filter((c) => validSelectedCardIds.includes(c.id))
                  )
                }
                className="px-1.5 py-0.5 rounded bg-indigo-950/70 hover:bg-indigo-900 border border-indigo-500/50 text-indigo-300 text-[10px] font-bold"
              >
                ✨ Gerar Versões
              </button>
              <button
                type="button"
                onClick={() => setSelectedCardIds([])}
                className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white text-[10px]"
              >
                ✕
              </button>
            </>
          )}
        </div>

        {/* Right: Search + Toggle Subgroup Dropdowns */}
        <div className="flex items-center gap-1">
          <select
            value={filterEntityType}
            onChange={(e) => setFilterEntityType(e.target.value)}
            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-sky-300 font-semibold"
          >
            <option value="ALL">Todos Tipos</option>
            <option value="Criatura">🐉 Criaturas</option>
            <option value="Magia">🔮 Magias (DF)</option>
            <option value="Item">🛡️ Itens</option>
          </select>

          <div className="relative">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar carta..."
              className="pl-6 pr-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-32"
            />
          </div>

          <button
            onClick={() => setShowSubgroupFilters((prev) => !prev)}
            className={`px-1.5 py-0.5 rounded border text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              showSubgroupFilters
                ? 'bg-slate-800 border-slate-600 text-white'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title="Filtrar por Bioma, Família ou Coleção"
          >
            <SlidersHorizontal className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Collapsible Subgroup Filters Bar (Only shown when filter icon is clicked) */}
      {showSubgroupFilters && (
        <div className="px-3 py-1 border-b border-slate-800/80 bg-[#0A0D14] flex items-center gap-1.5 flex-wrap text-[11px] shrink-0">
          <span className="font-semibold text-slate-400">Filtros:</span>
          <select
            value={filterBiome}
            onChange={(e) => setFilterBiome(e.target.value)}
            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-emerald-300"
          >
            <option value="ALL">Todos Biomas</option>
            {subgroupCatalog.biomes.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={filterFamily}
            onChange={(e) => setFilterFamily(e.target.value)}
            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-200"
          >
            <option value="ALL">Todas Famílias</option>
            {subgroupCatalog.families.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>

          <select
            value={filterCollection}
            onChange={(e) => setFilterCollection(e.target.value)}
            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[11px] text-purple-300"
          >
            <option value="ALL">Todas Coleções</option>
            {subgroupCatalog.collections.map((col) => (
              <option key={col} value={col}>
                {col}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* =====================================================================
          5. GRADE PRINCIPAL DE CARTAS (CARDS GRID)
         ===================================================================== */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 bg-[#080A0F]">
        {filteredCards.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500">
            <Layers className="w-10 h-10 mb-2 opacity-30 text-slate-400" />
            <p className="text-sm font-semibold text-slate-400">Nenhuma carta encontrada nesta exibição</p>
            <p className="text-xs text-slate-600 mt-1 max-w-sm">
              Alterne os filtros acima ou utilize os botões + Pasta / + Imagens no topo para adicionar cartas.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedRarityTab('ALL');
                  setStep2ShowOnlyUnclassified(false);
                  setStep3PendingFilter('ALL');
                  setSearchQuery('');
                  setFilterBiome('ALL');
                  setFilterFamily('ALL');
                  setFilterCollection('ALL');
                  setFilterEntityType('ALL');
                }}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
              >
                Mostrar Todas as Cartas ({cards.length})
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

                  {/* Inline Editable Title & Rank Row */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 flex items-center justify-between gap-1"
                  >
                    <input
                      type="text"
                      value={card.title}
                      onChange={(e) => {
                        const nextTitle = e.target.value;
                        updateTargetCards([card.id], (c) => ({
                          ...c,
                          title: nextTitle,
                        }));
                      }}
                      title="Clique para renomear a carta diretamente na grade"
                      className="text-xs font-bold text-white bg-transparent hover:bg-slate-900/90 focus:bg-slate-900 px-1 py-0.5 rounded border border-transparent focus:border-emerald-500/60 focus:outline-none truncate flex-1 min-w-0"
                    />
                    <span className="text-[11px] font-mono tabular-nums font-bold text-amber-400 shrink-0">
                      {unclassified ? 'NEUTRA' : `R:${card.cardRank || card.rankBadgeText || '—'}`}
                    </span>
                  </div>

                  {/* Row 1: 1-Click Entity Type + Rarity Selector */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 grid grid-cols-2 gap-1"
                  >
                    <select
                      value={card.entityType || 'Criatura'}
                      onChange={(e) => {
                        const nextEntity = e.target.value as CardEntityType;
                        updateTargetCards([card.id], (c) =>
                          convertCardToEntityType(c, nextEntity)
                        );
                      }}
                      title="Alterar Tipo da Carta (Criatura, Magia ou Item)"
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-bold truncate cursor-pointer ${
                        card.entityType === 'Magia'
                          ? 'bg-purple-950/80 border-purple-500/60 text-purple-200'
                          : card.entityType === 'Item'
                          ? 'bg-sky-950/80 border-sky-500/60 text-sky-200'
                          : 'bg-slate-900 border-slate-700 text-emerald-300'
                      }`}
                    >
                      <option value="Criatura">🐉 Criatura</option>
                      <option value="Magia">🔮 Magia</option>
                      <option value="Item">🛡️ Item</option>
                    </select>

                    <select
                      value={unclassified ? 'UNCLASSIFIED' : card.cardClass || 'UNCLASSIFIED'}
                      onChange={(e) => {
                        const nextVal = e.target.value as CardClass | 'UNCLASSIFIED';
                        updateTargetCards([card.id], (c) => applyRarityToCardRecord(c, nextVal));
                      }}
                      title="Alterar Classe / Raridade da Carta"
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-bold truncate cursor-pointer ${
                        unclassified
                          ? 'bg-amber-950/50 border-amber-500/50 text-amber-300'
                          : 'bg-slate-900 border-slate-700 text-slate-200'
                      }`}
                    >
                      <option value="UNCLASSIFIED">⏳ S/ Raridade</option>
                      {OFFICIAL_CLASSES.map((cls) => (
                        <option key={cls} value={cls}>
                          ⭐ {cls}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Row 2: 1-Click Inline Biome & Family Selectors directly on the Card Tile */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 grid grid-cols-2 gap-1"
                  >
                    <select
                      value={card.biome || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        applyStep3BoxToCards([card.id], 'biome', val || '__CLEAR__');
                      }}
                      title="Definir Bioma diretamente no card"
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold truncate cursor-pointer ${
                        card.biome
                          ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400'
                      }`}
                    >
                      <option value="">🌍 Bioma...</option>
                      {subgroupCatalog.biomes.map((b) => (
                        <option key={b} value={b}>
                          🌍 {b}
                        </option>
                      ))}
                    </select>

                    <select
                      value={card.family || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        applyStep3BoxToCards([card.id], 'family', val || '__CLEAR__');
                      }}
                      title="Definir Família diretamente no card"
                      className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold truncate cursor-pointer ${
                        card.family
                          ? 'bg-sky-950/60 border-sky-500/50 text-sky-300'
                          : 'bg-slate-900/70 border-slate-800 text-slate-400'
                      }`}
                    >
                      <option value="">🧬 Família...</option>
                      {subgroupCatalog.families.map((f) => (
                        <option key={f} value={f}>
                          🧬 {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bidirectional Mobby Link Parameter Row */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1 flex items-center gap-1"
                  >
                    {(() => {
                      const mobbysList = MobbyManager.getMobbys();
                      const linkedMobby =
                        mobbysList.find((m) => m.id === card.linkedMobbyId) ||
                        MobbyManager.getLinkedMobbyForCard(card.id, card.title);
                      return (
                        <select
                          value={linkedMobby?.id || ''}
                          onChange={(e) => {
                            const nextMobbyId = e.target.value;
                            const found = mobbysList.find((m) => m.id === nextMobbyId);
                            MobbyManager.setBidirectionalLink(
                              nextMobbyId || null,
                              card.id,
                              card.title
                            );
                            updateTargetCards([card.id], (c) => ({
                              ...c,
                              linkedMobbyId: found ? found.id : undefined,
                              linkedMobbyName: found ? found.name : undefined,
                            }));
                          }}
                          title="Parâmetro de Vínculo Bidirecional: Vincular esta Carta a um Mobby de Mobbys Duelos"
                          className={`w-full px-1.5 py-0.5 rounded border text-[9px] font-bold truncate cursor-pointer ${
                            linkedMobby
                              ? 'bg-amber-950/60 border-amber-500/60 text-amber-300'
                              : 'bg-slate-900/80 border-slate-800 text-slate-400'
                          }`}
                        >
                          <option value="">👾 Vincular Mobby (Duelos)...</option>
                          {mobbysList.map((m) => (
                            <option key={m.id} value={m.id}>
                              👾 {m.name} (HP {m.hp})
                            </option>
                          ))}
                        </select>
                      );
                    })()}
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
