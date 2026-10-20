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
  Dices,
  Layers,
  Maximize2,
  Minimize2,
  PackageOpen,
  Grid,
  RefreshCw,
  CheckSquare,
  Square,
  FolderKanban,
  Pencil,
  Check,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { CardData } from '../types/card';
import {
  BaseCharacter,
  CardClass,
  CardEntityType,
  CardOrigin,
  CardRank,
  ClassBalanceTable,
  DeckCategory,
  MatrixRarity,
} from '../types/slimelands';
import { CardFrameSVG } from './CardFrameSVG';
import {
  OFFICIAL_CLASSES,
  OFFICIAL_RANKS,
  ensureCoherentCharacterFields,
  generateProceduralCard,
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
  isExpandedWide: boolean;
  onToggleExpandedWide: () => void;
}

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
  onAssignCardClass,
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
  baseCharacters,
  onAddBaseCharacters,
  balanceTables,
  isExpandedWide,
  onToggleExpandedWide,
}) => {
  const [selectedDeckId, setSelectedDeckId] = useState<string>('ALL');
  // Dedicated Rarity & Rank target for Folder/Category & Multi-Select Pack Randomization
  const [targetRarity, setTargetRarity] = useState<CardClass | 'AUTO'>('Lendária');
  const [targetRank, setTargetRank] = useState<CardRank | 'AUTO'>('AUTO');

  // Multi-card selection state & Pack Quantity override
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState<boolean>(false);
  const [customPackQty, setCustomPackQty] = useState<number | null>(null);

  const [filterCharacterId, setFilterCharacterId] = useState<string>('ALL');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterRank, setFilterRank] = useState<string>('ALL');
  const [filterOrigin, setFilterOrigin] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gridCols, setGridCols] = useState<3 | 4 | 5 | 6>(4);
  const [isAddingDeck, setIsAddingDeck] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [isManagingDecks, setIsManagingDecks] = useState(false);
  const [deckManagerFilter, setDeckManagerFilter] = useState<'ALL' | 'PACKS' | 'CUSTOM'>('ALL');
  const [editingDeckId, setEditingDeckId] = useState<string | null>(null);
  const [editingDeckName, setEditingDeckName] = useState<string>('');
  const [isImportingFolder, setIsImportingFolder] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Subgroup filters (Section 5 & 7)
  const [filterFamily, setFilterFamily] = useState<string>('ALL');
  const [filterBiome, setFilterBiome] = useState<string>('ALL');
  const [filterThemeCollection, setFilterThemeCollection] = useState<string>('ALL');
  const [filterEntityType, setFilterEntityType] = useState<string>('ALL');

  // Classification toolbar state for selected cards
  const [batchAssignRarity, setBatchAssignRarity] = useState<CardClass>('Comum');
  const [batchAssignFamily, setBatchAssignFamily] = useState<string>('');
  const [batchAssignBiome, setBatchAssignBiome] = useState<string>('');
  const [batchAssignCollection, setBatchAssignCollection] = useState<string>('');
  const [batchAssignEntityType, setBatchAssignEntityType] = useState<CardEntityType>('Criatura');

  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const multiFilesInputRef = useRef<HTMLInputElement | null>(null);

  // Clean up any stale selected card IDs if cards are deleted
  const validSelectedCardIds = selectedCardIds.filter((id) =>
    cards.some((c) => c.id === id)
  );

  // Effective quantity of cards to generate in the Pack:
  // Defaults to the number of selected cards (when >= 1), or 1 when none selected, unless customized by the user
  const effectivePackCount =
    customPackQty !== null && customPackQty >= 1
      ? customPackQty
      : validSelectedCardIds.length > 0
      ? validSelectedCardIds.length
      : 1;

  const rarityDisplayLabel =
    targetRarity === 'AUTO' ? 'Misto' : targetRarity;

  // Compute the next sequential number (1, 2, 3...) for `Pack (<Nome da Raridade>) <Nº>`
  const getNextPackSequenceNumber = (rarityName: string): number => {
    const prefix = `pack (${rarityName.toLowerCase()})`;
    const matchingNumbers = decks
      .filter((d) => d.name.toLowerCase().startsWith(prefix))
      .map((d) => {
        const remainder = d.name.slice(prefix.length).trim();
        const match = remainder.match(/^#?(\d+)/);
        return match ? parseInt(match[1], 10) : 1;
      });
    return matchingNumbers.length > 0 ? Math.max(...matchingNumbers) + 1 : 1;
  };

  const nextPackNumberPreview = getNextPackSequenceNumber(rarityDisplayLabel);

  const createSequentialPackDeck = (rarityName: string, cardCount: number): string => {
    const seqNum = getNextPackSequenceNumber(rarityName);
    const qtyLabel = `${cardCount} ${cardCount === 1 ? 'Carta' : 'Cartas'}`;
    const packDeckName = `Pack (${rarityName}) ${seqNum} (${qtyLabel})`;
    return onCreateDeck(packDeckName);
  };

  const toggleCardSelection = (cardId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedCardIds((prev) => {
      const exists = prev.includes(cardId);
      const next = exists ? prev.filter((id) => id !== cardId) : [...prev, cardId];
      return next;
    });
  };

  // Long-press timer for mobile contextual info popover (Section 16)
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const handleCardPointerDown = (card: CardData) => {
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true;
      onInspectCard(card);
    }, 520);
  };

  const handleCardPointerUpOrLeave = () => {
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Ensure the selected rarity is enabled in balanceTables when forced (even if Épica was off)
  const getEffectiveBalanceTables = (rarity: CardClass | 'AUTO') => {
    if (rarity === 'AUTO') return balanceTables;
    return {
      ...balanceTables,
      [rarity]: {
        ...balanceTables[rarity],
        enabled: true,
      },
    };
  };

  // Process Folder / Batch Image Import -> Auto-create Category from Folder Name + Roll within Selected Rarity!
  const processImportedFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsImportingFolder(true);

    const imageFiles = Array.from(fileList).filter((f) =>
      f.type.startsWith('image/')
    );

    // Detect folder name from webkitRelativePath if available (e.g. "Slimes_Fogo/slime1.png" -> "Pasta: Slimes Fogo")
    let destinationDeckId = selectedDeckId === 'ALL' ? 'deck-main' : selectedDeckId;
    const firstRelPath = (imageFiles[0] as File & { webkitRelativePath?: string })
      ?.webkitRelativePath;
    if (firstRelPath && firstRelPath.includes('/')) {
      const folderName = firstRelPath.split('/')[0].replace(/[_-]+/g, ' ').trim();
      if (folderName) {
        const existingDeck = decks.find(
          (d) => d.name.toLowerCase() === folderName.toLowerCase()
        );
        if (existingDeck) {
          destinationDeckId = existingDeck.id;
        } else {
          destinationDeckId = onCreateDeck(folderName);
        }
        setSelectedDeckId(destinationDeckId);
      }
    }

    const createdCharacters: BaseCharacter[] = [];
    const createdCards: CardData[] = [];

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve((ev.target?.result as string) || '');
        reader.readAsDataURL(file);
      });
      if (!dataUrl) continue;

      const rawName = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]+/g, ' ')
        .trim();
      const formattedName =
        rawName.length > 2
          ? rawName.charAt(0).toUpperCase() + rawName.slice(1)
          : undefined;

      const charId = `matrix-char-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      const cardId = `matrix-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;

      let palettes = DEFAULT_PRESET_PALETTES;
      try {
        palettes = await extractAdaptivePalettesFromImage(dataUrl);
      } catch {
        palettes = DEFAULT_PRESET_PALETTES;
      }
      const primary = palettes[0] || DEFAULT_PRESET_PALETTES[0];

      // Section 3: Neutral BaseCharacter without rolled stats
      const newChar: BaseCharacter = {
        id: charId,
        name: formattedName || `Matriz ${baseCharacters.length + i + 1}`,
        description: 'Matriz neutra importada aguardando classificação e configuração de habilidades.',
        imageUrl: dataUrl,
        rarity: 'Não classificada',
        isClassified: false,
        entityType: 'Criatura',
        element: 'Neutro',
        abilities: [],
        allowedClasses: ['Comum', 'Rara', 'Lendária', 'Mítica', 'Limitada', 'Épica'],
        availableForDrops: false,
        availableForScan: false,
        availableForBoosters: false,
        active: true,
        isProvisional: true,
      };
      createdCharacters.push(newChar);

      // Section 3: Neutral CardData Blueprint in "Não classificadas"
      const neutralCard: CardData = {
        id: cardId,
        matrixId: charId,
        baseCharacterId: charId,
        isMatrixBlueprint: true,
        isClassified: false,
        rarity: 'Não classificada',
        cardClass: 'Não classificada',
        cardRank: 'D',
        title: newChar.name,
        pvText: '-',
        elementText: 'NEUTRO',
        rankBadgeText: '-',
        loreHeader: `${newChar.name} · Não classificada`,
        loreBody: newChar.description,
        magicPrefix: '',
        magicDescription: '',
        showLoreBox: true,
        loreBoxOpacity: 92,
        loreBoxY: 724,
        pillCount: 4,
        dockAutoFit: true,
        pills: [
          { id: 'p1', mode: 'stat', badgeValue: '-', badgeColor: '#334155', mainText: '-' },
          { id: 'p2', mode: 'stat', badgeValue: '-', badgeColor: '#334155', mainText: '-' },
          { id: 'p3', mode: 'stat', badgeValue: '-', badgeColor: '#334155', mainText: '-' },
          { id: 'p4', mode: 'stat', badgeValue: '-', badgeColor: '#334155', mainText: '-' },
        ],
        imageUrl: dataUrl,
        videoUrl: null,
        mediaType: 'image',
        imageScale: 1,
        imageOffsetX: 0,
        imageOffsetY: 0,
        backgroundFill: 'dark',
        autoAdaptColors: true,
        frameTopColor: primary.frameTopColor,
        frameMidColor: primary.frameMidColor,
        frameBottomColor: primary.frameBottomColor,
        strokeColor: primary.strokeColor,
        strokeWidth: 2,
        strokeGlow: 100,
        elementTextColor: primary.elementTextColor,
        rankCircleColor: primary.rankCircleColor,
        extractedSwatches: palettes,
        isPremium: false,
        prismaticIntensity: 100,
        microGlitterIntensity: 100,
        contourLightSpeed: 1.8,
        parallaxDepth: 100,
        autoShowcaseEnabled: false,
        showcaseDurationSec: 5,
        isRankChromatic: false,
        isPvChromatic: false,
        invertElementCapsule: true,
        showcaseVfx: 'none',
        showcaseVfxIntensity: 85,
        vfxPlayOnNormalView: false,
        backImageUrl: globalBackImageUrl || null,
        backImageScale: 1,
        backImageOffsetX: 0,
        backImageOffsetY: 0,
        entityType: 'Criatura',
        origin: 'Pasta Importada',
        deckId: destinationDeckId,
        createdAt: new Date().toISOString(),
        rulesVersion: '1',
      };
      createdCards.push(neutralCard);
    }

    if (createdCharacters.length > 0) {
      onAddBaseCharacters(createdCharacters);
    }
    if (createdCards.length > 0) {
      onAddCards(createdCards);
      onSelectCard(createdCards[0].id);
      setFilterClass('Não classificada');
    }

    setIsImportingFolder(false);
    if (folderInputRef.current) folderInputRef.current.value = '';
    if (multiFilesInputRef.current) multiFilesInputRef.current.value = '';
  };

  /**
   * 1. Sortear / Gerar Pack Random a partir das Cartas Selecionadas (ou da Pasta/Categoria ativa)
   * obedecendo às regras da Raridade escolhida e criando automaticamente a categoria:
   * `Pack (<Nome da Raridade>) <Número 1, 2, 3...> (<Quantidade> Cartas)`
   */
  const handleRollRandomPackFromSelectionOrCategory = (
    overrideCount?: number,
    forceCreatePackCategory = true
  ) => {
    const effectiveTables = getEffectiveBalanceTables(targetRarity);

    // Source pool: prioritize explicitly multi-selected cards! Otherwise use cards in the active category.
    const selectedCardsPool =
      validSelectedCardIds.length > 0
        ? cards.filter((c) => validSelectedCardIds.includes(c.id))
        : [];

    const categoryCardsPool =
      selectedDeckId === 'ALL'
        ? cards
        : cards.filter((c) => (c.deckId || 'deck-main') === selectedDeckId);

    const activePool =
      selectedCardsPool.length > 0 ? selectedCardsPool : categoryCardsPool;

    const totalToGenerate =
      overrideCount !== undefined
        ? overrideCount
        : effectivePackCount;

    // Create the sequential Pack category whenever cards are selected or when creating a Pack
    const shouldCreatePackCategory =
      forceCreatePackCategory ||
      selectedCardsPool.length > 0 ||
      totalToGenerate > 1;

    const destinationDeckId = shouldCreatePackCategory
      ? createSequentialPackDeck(rarityDisplayLabel, totalToGenerate)
      : selectedDeckId === 'ALL'
      ? 'deck-main'
      : selectedDeckId;

    const generated: CardData[] = [];

    for (let i = 0; i < totalToGenerate; i++) {
      // When cards are selected, use each selected card in order first so every selected card is rolled,
      // and if totalToGenerate > selectedCardsPool.length, pick randomly from the selected pool for the extras!
      const sourceCard =
        selectedCardsPool.length > 0
          ? i < selectedCardsPool.length
            ? selectedCardsPool[i]
            : selectedCardsPool[Math.floor(Math.random() * selectedCardsPool.length)]
          : activePool.length > 0
          ? activePool[Math.floor(Math.random() * activePool.length)]
          : null;

      const sourceChar = sourceCard
        ? baseCharacters.find((ch) => ch.id === sourceCard.baseCharacterId)
        : undefined;

      const rolled = generateProceduralCard({
        character: sourceChar,
        charactersPool: baseCharacters,
        balanceTables: effectiveTables,
        origin: shouldCreatePackCategory ? 'Booster' : 'Escaneamento',
        forcedClass: targetRarity === 'AUTO' ? undefined : targetRarity,
        forcedRank: targetRank === 'AUTO' ? undefined : targetRank,
        deckId: destinationDeckId,
      });

      if (sourceCard) {
        generated.push({
          ...rolled,
          title: sourceCard.title,
          imageUrl: sourceCard.imageUrl,
          videoUrl: sourceCard.videoUrl,
          mediaType: sourceCard.mediaType,
          imageScale: sourceCard.imageScale,
          imageOffsetX: sourceCard.imageOffsetX,
          imageOffsetY: sourceCard.imageOffsetY,
          frameTopColor: sourceCard.frameTopColor,
          frameMidColor: sourceCard.frameMidColor,
          frameBottomColor: sourceCard.frameBottomColor,
          strokeColor: sourceCard.strokeColor,
          elementTextColor: sourceCard.elementTextColor,
          rankCircleColor: sourceCard.rankCircleColor,
          extractedSwatches: sourceCard.extractedSwatches,
          backImageUrl:
            sourceCard.backImageUrl || globalBackImageUrl || null,
          backImageScale: sourceCard.backImageScale,
          backImageOffsetX: sourceCard.backImageOffsetX,
          backImageOffsetY: sourceCard.backImageOffsetY,
        });
      } else {
        generated.push({
          ...rolled,
          backImageUrl: globalBackImageUrl || rolled.backImageUrl || null,
        });
      }
    }

    onAddCards(generated);
    if (shouldCreatePackCategory) {
      setSelectedDeckId(destinationDeckId);
    }
    if (generated[0]) {
      onSelectCard(generated[0].id);
    }
    // Clear selection after generating the Pack so the user immediately sees their new Pack cleanly
    if (selectedCardsPool.length > 0) {
      setSelectedCardIds([]);
      setCustomPackQty(null);
    }
  };

  /**
   * 1b. Re-sortear as próprias cartas selecionadas e movê-las diretamente para o novo Pack (sem duplicar)
   */
  const handleRerollAndMoveSelectedToNewPack = () => {
    if (validSelectedCardIds.length === 0) return;
    const effectiveTables = getEffectiveBalanceTables(targetRarity);
    const packDeckId = createSequentialPackDeck(
      rarityDisplayLabel,
      validSelectedCardIds.length
    );

    const updated = cards.map((card) => {
      if (!validSelectedCardIds.includes(card.id)) return card;
      const char = baseCharacters.find((c) => c.id === card.baseCharacterId);
      const rolled = generateProceduralCard({
        character: char,
        charactersPool: baseCharacters,
        balanceTables: effectiveTables,
        origin: 'Booster',
        forcedClass: targetRarity === 'AUTO' ? undefined : targetRarity,
        forcedRank: targetRank === 'AUTO' ? undefined : targetRank,
        deckId: packDeckId,
      });

      return {
        ...rolled,
        id: card.id,
        title: card.title,
        imageUrl: card.imageUrl,
        videoUrl: card.videoUrl,
        mediaType: card.mediaType,
        imageScale: card.imageScale,
        imageOffsetX: card.imageOffsetX,
        imageOffsetY: card.imageOffsetY,
        frameTopColor: card.frameTopColor,
        frameMidColor: card.frameMidColor,
        frameBottomColor: card.frameBottomColor,
        strokeColor: card.strokeColor,
        elementTextColor: card.elementTextColor,
        rankCircleColor: card.rankCircleColor,
        extractedSwatches: card.extractedSwatches,
        backImageUrl: card.backImageUrl || globalBackImageUrl || null,
        backImageScale: card.backImageScale,
        backImageOffsetX: card.backImageOffsetX,
        backImageOffsetY: card.backImageOffsetY,
      };
    });

    onReplaceCards(updated);
    setSelectedDeckId(packDeckId);
    onSelectCard(validSelectedCardIds[0]);
    setSelectedCardIds([]);
    setCustomPackQty(null);
  };

  /**
   * Atribuir Raridade e Subgrupos para as cartas selecionadas (individual ou em lote) - Sections 3, 5, 7
   */
  const handleApplyBatchClassification = () => {
    if (validSelectedCardIds.length === 0) return;

    const updatedCards = cards.map((c) => {
      if (!validSelectedCardIds.includes(c.id)) return c;
      const collections = batchAssignCollection.trim()
        ? [batchAssignCollection.trim()]
        : c.themeCollections || [];

      return {
        ...c,
        cardClass: batchAssignRarity,
        rarity: batchAssignRarity,
        isClassified: true,
        family: batchAssignFamily.trim() || c.family,
        biome: batchAssignBiome || c.biome,
        themeCollections: collections,
        entityType: batchAssignEntityType,
        loreHeader: `${c.title} · ${batchAssignRarity}`,
      };
    });

    const updatedChars = baseCharacters.map((char) => {
      const isReferenced = validSelectedCardIds.some(
        (id) => cards.find((c) => c.id === id)?.baseCharacterId === char.id
      );
      if (!isReferenced) return char;

      const collections = batchAssignCollection.trim()
        ? [batchAssignCollection.trim()]
        : char.themeCollections || [];

      return {
        ...char,
        rarity: batchAssignRarity,
        isClassified: true,
        family: batchAssignFamily.trim() || char.family,
        biome: batchAssignBiome || char.biome,
        themeCollections: collections,
        entityType: batchAssignEntityType,
        availableForBoosters: true,
      };
    });

    onReplaceCards(updatedCards);
    onAddBaseCharacters(updatedChars);
    setSelectedCardIds([]);
  };

  /**
   * Gerar Atributos Procedurais (Versão) para as cartas selecionadas na Matriz - Sections 7 & 8
   */
  const handleGenerateProceduralAttributesForSelected = () => {
    if (validSelectedCardIds.length === 0) return;
    const effectiveTables = getEffectiveBalanceTables(batchAssignRarity || targetRarity);

    const updatedCards = cards.map((c) => {
      if (!validSelectedCardIds.includes(c.id)) return c;
      const char = baseCharacters.find((ch) => ch.id === c.baseCharacterId);
      const chosenRarity = (c.rarity && c.rarity !== 'Não classificada'
        ? c.rarity
        : batchAssignRarity) as CardClass;

      const rolled = generateProceduralCard({
        character: char,
        charactersPool: baseCharacters,
        balanceTables: effectiveTables,
        origin: 'Manual',
        forcedClass: chosenRarity,
        deckId: c.deckId || (selectedDeckId === 'ALL' ? 'deck-main' : selectedDeckId),
      });

      return {
        ...c,
        ...rolled,
        id: c.id,
        imageUrl: c.imageUrl,
        backImageUrl: c.backImageUrl || globalBackImageUrl || null,
        isClassified: true,
        isMatrixBlueprint: true,
        cardClass: chosenRarity,
        rarity: chosenRarity,
        family: c.family || char?.family,
        biome: c.biome || char?.biome,
        themeCollections: c.themeCollections || char?.themeCollections,
        entityType: c.entityType || char?.entityType || 'Criatura',
      };
    });

    onReplaceCards(updatedCards);
  };

  /**
   * 2. Re-Randomizar TODAS as cartas da Pasta/Categoria selecionada dentro das regras da Raridade escolhida!
   * Mantém a arte e cores de cada carta da pasta/categoria, mas sorteia novamente seus atributos
   * (Rank, PV, Dano das Habilidades, Mana, Custo de Invocação e Habilidade Gratuita ∞) na Raridade escolhida.
   */
  const handleRerollEntireCategoryInRarity = () => {
    const effectiveTables = getEffectiveBalanceTables(targetRarity);
    if (cards.length === 0) {
      handleRollRandomPackFromSelectionOrCategory(6, true);
      return;
    }

    const updated = cards.map((card) => {
      const belongsToCategory =
        selectedDeckId === 'ALL' ||
        (card.deckId || 'deck-main') === selectedDeckId;
      if (!belongsToCategory) return card;

      const char = baseCharacters.find((c) => c.id === card.baseCharacterId);
      const rolled = generateProceduralCard({
        character: char,
        charactersPool: baseCharacters,
        balanceTables: effectiveTables,
        origin: card.origin || 'Escaneamento',
        forcedClass: targetRarity === 'AUTO' ? undefined : targetRarity,
        forcedRank: targetRank === 'AUTO' ? undefined : targetRank,
        deckId: card.deckId || 'deck-main',
      });

      return {
        ...rolled,
        id: card.id,
        title: card.title,
        imageUrl: card.imageUrl,
        videoUrl: card.videoUrl,
        mediaType: card.mediaType,
        imageScale: card.imageScale,
        imageOffsetX: card.imageOffsetX,
        imageOffsetY: card.imageOffsetY,
        frameTopColor: card.frameTopColor,
        frameMidColor: card.frameMidColor,
        frameBottomColor: card.frameBottomColor,
        strokeColor: card.strokeColor,
        elementTextColor: card.elementTextColor,
        rankCircleColor: card.rankCircleColor,
        extractedSwatches: card.extractedSwatches,
        backImageUrl: card.backImageUrl || globalBackImageUrl || null,
        backImageScale: card.backImageScale,
        backImageOffsetX: card.backImageOffsetX,
        backImageOffsetY: card.backImageOffsetY,
      };
    });

    onReplaceCards(updated);
  };

  // Create a new blank card
  const handleCreateBlankCard = () => {
    const targetDeck = selectedDeckId === 'ALL' ? 'deck-main' : selectedDeckId;
    const newBlank: CardData = {
      ...BLANK_TEMPLATE_CARD,
      id: `card-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: `Nova Carta ${cards.length + 1}`,
      deckId: targetDeck,
      origin: 'Manual',
      backImageUrl: globalBackImageUrl || null,
      createdAt: new Date().toISOString(),
    };
    onAddCards([newBlank]);
    onSelectCard(newBlank.id);
  };

  // Re-roll a single card within the currently selected targetRarity (or its own rarity)
  const handleRescanCharacterVersion = (card: CardData, e: React.MouseEvent) => {
    e.stopPropagation();
    const effectiveTables = getEffectiveBalanceTables(targetRarity);
    const char = baseCharacters.find((c) => c.id === card.baseCharacterId);
    const newVersion = generateProceduralCard({
      character: char,
      charactersPool: baseCharacters,
      balanceTables: effectiveTables,
      origin: 'Escaneamento',
      forcedClass: targetRarity === 'AUTO' ? undefined : targetRarity,
      forcedRank: targetRank === 'AUTO' ? undefined : targetRank,
      deckId: card.deckId || 'deck-main',
    });

    const merged: CardData = {
      ...newVersion,
      title: card.title,
      imageUrl: card.imageUrl || newVersion.imageUrl,
      frameTopColor: card.frameTopColor,
      frameMidColor: card.frameMidColor,
      frameBottomColor: card.frameBottomColor,
      strokeColor: card.strokeColor,
      elementTextColor: card.elementTextColor,
      rankCircleColor: card.rankCircleColor,
      extractedSwatches: card.extractedSwatches,
      backImageUrl: card.backImageUrl,
    };

    onAddCards([merged]);
    onSelectCard(merged.id);
  };

  // Distinct Subgroups for Filter Options (Section 5 & 7)
  const distinctFamilies = Array.from(
    new Set(
      [
        ...cards.map((c) => c.family),
        ...baseCharacters.map((c) => c.family),
      ].filter(Boolean) as string[]
    )
  );

  const distinctBiomes = Array.from(
    new Set(
      [
        'Floresta',
        'Deserto',
        'Neve',
        'Vulcânico',
        'Pântano',
        'Reino Sombrio',
        ...cards.map((c) => c.biome),
        ...baseCharacters.map((c) => c.biome),
      ].filter(Boolean) as string[]
    )
  );

  const distinctCollections = Array.from(
    new Set(
      [
        'Halloween',
        'Criaturas Sombrias',
        'Coleção Oriental',
        'Coleção dos Deuses',
        'Festival de Inverno',
        'Coleção de Aniversário',
        ...cards.flatMap((c) => c.themeCollections || []),
        ...baseCharacters.flatMap((c) => c.themeCollections || []),
      ].filter(Boolean) as string[]
    )
  );

  const unclassifiedCount = cards.filter(
    (c) =>
      c.cardClass === 'Não classificada' ||
      c.rarity === 'Não classificada' ||
      c.isClassified === false
  ).length;

  // Filtered Cards with combined criteria (Section 7)
  const filteredCards = cards.filter((c) => {
    if (selectedDeckId !== 'ALL' && (c.deckId || 'deck-main') !== selectedDeckId) {
      return false;
    }
    if (filterCharacterId !== 'ALL' && c.baseCharacterId !== filterCharacterId) {
      return false;
    }
    if (filterClass !== 'ALL') {
      if (filterClass === 'Não classificada') {
        const isUnclass =
          c.cardClass === 'Não classificada' ||
          c.rarity === 'Não classificada' ||
          c.isClassified === false;
        if (!isUnclass) return false;
      } else {
        const effectiveRarity = c.cardClass || c.rarity || 'Comum';
        if (effectiveRarity !== filterClass) return false;
      }
    }
    if (filterRank !== 'ALL' && (c.cardRank || c.rankBadgeText) !== filterRank) {
      return false;
    }
    if (filterOrigin !== 'ALL' && (c.origin || 'Manual') !== filterOrigin) {
      return false;
    }
    if (filterFamily !== 'ALL' && c.family !== filterFamily) {
      return false;
    }
    if (filterBiome !== 'ALL' && c.biome !== filterBiome) {
      return false;
    }
    if (filterThemeCollection !== 'ALL') {
      const hasColl = c.themeCollections?.includes(filterThemeCollection);
      if (!hasColl) return false;
    }
    if (filterEntityType !== 'ALL' && (c.entityType || 'Criatura') !== filterEntityType) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchLore = c.loreHeader.toLowerCase().includes(q);
      const matchElem = c.elementText.toLowerCase().includes(q);
      const matchFamily = (c.family || '').toLowerCase().includes(q);
      const matchBiome = (c.biome || '').toLowerCase().includes(q);
      if (!matchTitle && !matchLore && !matchElem && !matchFamily && !matchBiome) return false;
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

  const activeDeckObj = decks.find((d) => d.id === selectedDeckId);
  const activeDeckLabel =
    selectedDeckId === 'ALL'
      ? `Todas as Categorias (${cards.length})`
      : activeDeckObj
      ? activeDeckObj.name
      : 'Deck Principal';

  const activeDropdownFiltersCount =
    (filterCharacterId !== 'ALL' ? 1 : 0) +
    (filterClass !== 'ALL' ? 1 : 0) +
    (filterRank !== 'ALL' ? 1 : 0) +
    (filterOrigin !== 'ALL' ? 1 : 0) +
    (filterFamily !== 'ALL' ? 1 : 0) +
    (filterBiome !== 'ALL' ? 1 : 0) +
    (filterThemeCollection !== 'ALL' ? 1 : 0) +
    (filterEntityType !== 'ALL' ? 1 : 0);

  const hasActiveFilters =
    activeDropdownFiltersCount > 0 || searchQuery.trim() !== '';

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
        onChange={(e) => processImportedFiles(e.target.files)}
        className="hidden"
      />
      <input
        ref={multiFilesInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => processImportedFiles(e.target.files)}
        className="hidden"
      />

      {/* =====================================================================
          1. BARRA DE TOPO: ENTRADA DE CARTAS (CRIAR/IMPORTAR) + VISUALIZAÇÃO
         ===================================================================== */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-[#0E1118] flex items-center justify-between gap-2 flex-wrap shrink-0">
        {/* Left: Title + Counter + Unified Creation/Import Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-sm font-bold text-white whitespace-nowrap">
              Galeria
            </span>
            <span className="text-xs font-mono tabular-nums text-slate-400 whitespace-nowrap">
              · {filteredCards.length}/{cards.length}
            </span>
          </div>

          {/* Unified Add/Import Group */}
          <div className="flex items-center gap-0.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={handleCreateBlankCard}
              className="px-2.5 py-1 rounded-md hover:bg-slate-800 text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1 transition-colors whitespace-nowrap"
              title="Criar uma nova carta em branco na categoria atual"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nova</span>
            </button>

            <div className="w-[1px] h-3.5 bg-slate-800" />

            <button
              onClick={() => multiFilesInputRef.current?.click()}
              className="px-2.5 py-1 rounded-md hover:bg-slate-800 text-xs font-semibold text-sky-300 hover:text-sky-200 flex items-center gap-1 transition-colors whitespace-nowrap"
              title="Importar uma ou várias imagens do computador"
            >
              <ImagePlus className="w-3.5 h-3.5 text-sky-400" />
              <span>+ Imagens</span>
            </button>

            <div className="w-[1px] h-3.5 bg-slate-800" />

            <button
              onClick={() => folderInputRef.current?.click()}
              disabled={isImportingFolder}
              className="px-2.5 py-1 rounded-md hover:bg-slate-800 text-xs font-semibold text-amber-300 hover:text-amber-200 flex items-center gap-1 transition-colors whitespace-nowrap"
              title="Importar pasta inteira do computador (cria a categoria automaticamente e gera as cartas na Raridade escolhida)"
            >
              <FolderUp className="w-3.5 h-3.5 text-amber-400" />
              <span>{isImportingFolder ? 'Importando...' : '+ Pasta'}</span>
            </button>
          </div>
        </div>

        {/* Right: Global Card Back + Grid Columns + Clear + Expand */}
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
              title="Definir ou trocar a imagem do Verso Global (aplicado a todas as cartas)"
            >
              <ImagePlus className="w-3.5 h-3.5 text-purple-400" />
              <span>{globalBackImageUrl ? 'Verso' : 'Importar Verso'}</span>
            </button>
            <button
              onClick={onFlipCardPreview}
              className="px-1.5 py-0.5 rounded bg-purple-600/80 hover:bg-purple-500 text-[10px] font-bold text-white whitespace-nowrap"
              title="Virar a carta em destaque no palco para ver o Verso"
            >
              Ver
            </button>
            {globalBackImageUrl && (
              <button
                onClick={onClearGlobalBack}
                className="text-[10px] text-rose-300 hover:text-rose-200 px-0.5"
                title="Remover Verso Global"
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
                title={`Exibir ${cols} colunas na grade`}
              >
                {cols}x
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              if (
                window.confirm(
                  'Deseja limpar totalmente todas as cartas e biblioteca da Matriz? Isso é ABSOLUTO e purgará imediatamente a aba booster e todos os pacotes.'
                )
              ) {
                onClearAllCards();
              }
            }}
            className="px-2.5 py-1 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 border border-rose-800/60 text-xs font-semibold text-rose-300 hover:text-white transition-colors whitespace-nowrap flex items-center gap-1 shadow-sm"
            title="Limpar absolutamente todas as cartas e biblioteca da Matriz (atinge também a aba booster)"
          >
            <span>🗑️ Limpar Biblioteca</span>
          </button>

          <button
            onClick={onToggleExpandedWide}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 transition-colors whitespace-nowrap"
            title={
              isExpandedWide
                ? 'Voltar ao tamanho padrão da galeria'
                : 'Expandir largura da galeria para 75% da tela'
            }
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
          2. GERADOR DE PACK RANDOM GUIADO (① ORIGEM → ② REGRAS → ③ GERAR PACK)
         ===================================================================== */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-[#101520] flex items-center justify-between gap-2 flex-wrap shrink-0">
        {/* Passo 1 & 2: Origem (Seleção) + Raridade/Rank/Qtd */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* ① Origem / Seleção de Cartas */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 rounded-lg p-0.5">
            <span className="text-[10px] font-mono font-bold text-slate-400 pl-2 pr-1 whitespace-nowrap">
              ① Origem:
            </span>
            <button
              onClick={() => setIsMultiSelectMode((prev) => !prev)}
              className={`px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1 transition-colors whitespace-nowrap ${
                isMultiSelectMode || validSelectedCardIds.length > 0
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Clique para ativar a seleção de várias cartas na grade ou sortear da aba atual"
            >
              <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              <span>
                {validSelectedCardIds.length > 0
                  ? `${validSelectedCardIds.length} Selecionada(s)`
                  : isMultiSelectMode
                  ? 'Clique nas Cartas...'
                  : 'Selecionar Cartas'}
              </span>
            </button>

            {filteredCards.length > 0 && (
              <button
                onClick={handleSelectAllFiltered}
                className="px-2 py-1 rounded-md hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors whitespace-nowrap"
                title="Selecionar ou desmarcar todas as cartas visíveis nesta aba"
              >
                {filteredCards.every((c) => validSelectedCardIds.includes(c.id))
                  ? 'Desmarcar Aba'
                  : `Todas (${filteredCards.length})`}
              </button>
            )}

            {validSelectedCardIds.length > 0 && (
              <button
                onClick={() => {
                  setSelectedCardIds([]);
                  setCustomPackQty(null);
                }}
                className="px-1.5 py-1 rounded-md text-[11px] font-bold text-rose-300 hover:text-rose-200 transition-colors whitespace-nowrap"
                title="Limpar seleção de cartas"
              >
                ✕
              </button>
            )}
          </div>

          {/* ② Raridade do Pack */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-amber-500/45 rounded-lg px-2.5 py-1">
            <span className="text-[10px] font-mono font-bold text-amber-300/90 whitespace-nowrap">
              ② Pack:
            </span>
            <select
              value={targetRarity}
              onChange={(e) =>
                setTargetRarity(e.target.value as CardClass | 'AUTO')
              }
              className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none cursor-pointer"
              title="Nível de Raridade para gerar o Pack ou re-rolar"
            >
              <option value="Comum" className="bg-slate-900 text-slate-200">
                Comum (1–2 hab)
              </option>
              <option value="Rara" className="bg-slate-900 text-sky-300">
                Rara (3 hab)
              </option>
              <option value="Épica" className="bg-slate-900 text-purple-300">
                Épica (3 hab)
              </option>
              <option value="Lendária" className="bg-slate-900 text-amber-300">
                Lendária (4 hab · Premium)
              </option>
              <option value="Mítica" className="bg-slate-900 text-rose-300">
                Mítica (4 hab + ∞ · Premium)
              </option>
              <option value="Limitada" className="bg-slate-900 text-emerald-300">
                Limitada (Evento · Premium)
              </option>
              <option value="AUTO" className="bg-slate-900 text-white">
                Automático (Misto)
              </option>
            </select>
          </div>

          {/* Rank Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-700/90 rounded-lg px-2 py-1">
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
              Rank:
            </span>
            <select
              value={targetRank}
              onChange={(e) =>
                setTargetRank(e.target.value as CardRank | 'AUTO')
              }
              className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
            >
              <option value="AUTO" className="bg-slate-900">
                Auto
              </option>
              {OFFICIAL_RANKS.map((r) => (
                <option key={r} value={r} className="bg-slate-900">
                  Rank {r}
                </option>
              ))}
            </select>
          </div>

          {/* Quantity Stepper */}
          <div
            className="flex items-center gap-1 bg-slate-900 border border-emerald-500/40 rounded-lg px-2 py-0.5"
            title="Quantidade de cartas que serão geradas na nova categoria Pack"
          >
            <span className="text-[11px] font-semibold text-emerald-300 mr-0.5 whitespace-nowrap">
              Qtd:
            </span>
            <button
              type="button"
              onClick={() =>
                setCustomPackQty(Math.max(1, effectivePackCount - 1))
              }
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center"
            >
              -
            </button>
            <input
              type="number"
              min={1}
              max={60}
              value={effectivePackCount}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val) && val >= 1) {
                  setCustomPackQty(Math.min(60, val));
                } else {
                  setCustomPackQty(null);
                }
              }}
              className="w-8 bg-transparent text-center text-xs font-mono tabular-nums font-bold text-emerald-300 focus:outline-none"
            />
            <button
              type="button"
              onClick={() =>
                setCustomPackQty(Math.min(60, effectivePackCount + 1))
              }
              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 flex items-center justify-center"
            >
              +
            </button>
          </div>
        </div>

        {/* ③ Ações de Sorteio (Criar Novo Pack vs Re-Rolar Existentes) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() =>
              handleRollRandomPackFromSelectionOrCategory(
                effectivePackCount,
                true
              )
            }
            className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-sm"
            title={`Sortear ${effectivePackCount} carta(s) na raridade ${rarityDisplayLabel} e criar automaticamente a categoria "Pack (${rarityDisplayLabel}) ${nextPackNumberPreview} (${effectivePackCount} ${
              effectivePackCount === 1 ? 'Carta' : 'Cartas'
            })"`}
          >
            <Dices className="w-3.5 h-3.5 shrink-0" />
            <span>
              ③ Sortear → Pack ({rarityDisplayLabel}) #{nextPackNumberPreview} ({effectivePackCount})
            </span>
          </button>

          {validSelectedCardIds.length > 0 ? (
            <button
              onClick={handleRerollAndMoveSelectedToNewPack}
              className="py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-1 transition-colors whitespace-nowrap"
              title="Re-sorteia os atributos das próprias cartas selecionadas na Raridade escolhida e move elas para o novo Pack (sem duplicar)"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Mover & Re-Rolar ({validSelectedCardIds.length})</span>
            </button>
          ) : (
            <button
              onClick={handleRerollEntireCategoryInRarity}
              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-amber-500 hover:text-slate-950 border border-slate-700 text-xs font-semibold text-amber-300 flex items-center gap-1 transition-colors whitespace-nowrap"
              title="Re-sorteia os atributos de todas as cartas da aba atual dentro da Raridade escolhida"
            >
              <RefreshCw className="w-3.5 h-3.5 shrink-0" />
              <span>Re-Rolar Aba</span>
            </button>
          )}
        </div>
      </div>

      {/* =====================================================================
          3. NAVEGAÇÃO PRINCIPAL DA MATRIZ (SECTION 7) + CATEGORIAS & FILTROS
         ===================================================================== */}
      <div className="px-4 py-2 border-b border-slate-800/80 bg-[#0B0D13] space-y-2 shrink-0">
        {/* ===================================================================
            OFICIAL: NAVEGAÇÃO PRINCIPAL DA MATRIZ DE CARTAS (SECTION 7)
           =================================================================== */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 border-b border-slate-800/60 pb-2">
          <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider shrink-0 mr-1 flex items-center gap-1">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            Matriz:
          </span>

          <button
            onClick={() => setFilterClass('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
              filterClass === 'ALL'
                ? 'bg-white text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            Todas ({cards.length})
          </button>

          {/* Seção Não classificadas (Section 3 & 7) */}
          <button
            onClick={() => setFilterClass('Não classificada')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 ${
              filterClass === 'Não classificada'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : unclassifiedCount > 0
                ? 'bg-amber-950/40 border border-amber-500/60 text-amber-300 hover:bg-amber-900/50'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <span>Não classificadas</span>
            {unclassifiedCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  filterClass === 'Não classificada'
                    ? 'bg-slate-950 text-amber-400'
                    : 'bg-amber-500 text-slate-950'
                }`}
              >
                {unclassifiedCount}
              </span>
            )}
          </button>

          {/* Raridades Principais */}
          {OFFICIAL_CLASSES.map((cls) => {
            const count = cards.filter(
              (c) => (c.cardClass || c.rarity) === cls
            ).length;
            const isActive = filterClass === cls;
            return (
              <button
                key={cls}
                onClick={() => setFilterClass(cls)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cls} ({count})
              </button>
            );
          })}
        </div>

        {/* ===================================================================
            BARRA ADMINISTRATIVA DE CLASSIFICAÇÃO (INDIVIDUAL OU EM LOTE)
           =================================================================== */}
        {validSelectedCardIds.length > 0 && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 via-[#131a29] to-slate-900 border border-amber-500/50 shadow-xl space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-xs font-bold text-amber-300">
                  Classificar Matriz ({validSelectedCardIds.length}{' '}
                  {validSelectedCardIds.length === 1
                    ? 'carta selecionada'
                    : 'cartas selecionadas'})
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedCardIds([]);
                  setIsMultiSelectMode(false);
                }}
                className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
              >
                Cancelar seleção
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 items-center">
              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-0.5">
                  Raridade Principal
                </label>
                <select
                  value={batchAssignRarity}
                  onChange={(e) =>
                    setBatchAssignRarity(e.target.value as CardClass)
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-amber-400"
                >
                  {OFFICIAL_CLASSES.map((cls) => (
                    <option key={cls} value={cls}>
                      {cls}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-0.5">
                  Família / Classe
                </label>
                <input
                  type="text"
                  placeholder="Ex: Slimes Tóxicos"
                  value={batchAssignFamily}
                  onChange={(e) => setBatchAssignFamily(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-0.5">
                  Bioma
                </label>
                <select
                  value={batchAssignBiome}
                  onChange={(e) => setBatchAssignBiome(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">Selecione um Bioma...</option>
                  <option value="Floresta">Floresta</option>
                  <option value="Deserto">Deserto</option>
                  <option value="Neve">Neve</option>
                  <option value="Vulcânico">Vulcânico</option>
                  <option value="Pântano">Pântano</option>
                  <option value="Reino Sombrio">Reino Sombrio</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-0.5">
                  Coleção Temática
                </label>
                <input
                  type="text"
                  placeholder="Ex: Halloween, Deuses"
                  value={batchAssignCollection}
                  onChange={(e) => setBatchAssignCollection(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-mono mb-0.5">
                  Tipo de Entidade
                </label>
                <select
                  value={batchAssignEntityType}
                  onChange={(e) =>
                    setBatchAssignEntityType(e.target.value as CardEntityType)
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="Criatura">Criatura</option>
                  <option value="Magia">Magia</option>
                  <option value="Item">Item</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1 flex-wrap">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `Excluir ${validSelectedCardIds.length} cartas selecionadas da Matriz e remover de qualquer booster?`
                    )
                  ) {
                    validSelectedCardIds.forEach((id) => onDeleteCard(id));
                    setSelectedCardIds([]);
                    setIsMultiSelectMode(false);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/80 text-rose-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Exclui todas as cartas selecionadas e limpa referências no jogo"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Selecionadas</span>
              </button>

              <button
                onClick={handleGenerateProceduralAttributesForSelected}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Gera atributos de combate (PV, Ataques, Mana) para esta versão na Matriz"
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Gerar Versão Procedural</span>
              </button>

              <button
                onClick={handleApplyBatchClassification}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Aplicar Classificação</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Navigation Row: Category Tabs (Left) + Category Actions & Search/Filter Toggle (Right) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          {/* Scrollable Category & Pack Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 flex-1 min-w-[220px]">
            <button
              onClick={() => setSelectedDeckId('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedDeckId === 'ALL'
                  ? 'bg-white text-slate-950 font-bold'
                  : 'bg-slate-900 text-slate-400 hover:text-white'
              }`}
            >
              Todas ({cards.length})
            </button>
            {decks.map((d) => {
              const count = cards.filter(
                (c) => (c.deckId || 'deck-main') === d.id
              ).length;
              const isPackCategory = d.name.toLowerCase().startsWith('pack (');
              const alreadyHasQtyInName = d.name
                .toLowerCase()
                .includes('carta');
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDeckId(d.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    selectedDeckId === d.id
                      ? isPackCategory
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'bg-emerald-600 text-white'
                      : isPackCategory
                      ? 'bg-amber-950/30 border border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {alreadyHasQtyInName ? d.name : `${d.name} (${count})`}
                </button>
              );
            })}
          </div>

          {/* Right Controls: Compact Search + Filter Toggle + New/Manage Categories */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <div className="relative w-44 sm:w-52">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar nome ou elemento..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-600"
              />
            </div>

            <button
              onClick={() => setShowAdvancedFilters((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors whitespace-nowrap ${
                showAdvancedFilters || activeDropdownFiltersCount > 0
                  ? 'bg-sky-500/20 border-sky-400/60 text-sky-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-300'
              }`}
              title="Mostrar ou ocultar filtros avançados da galeria (Personagem, Raridade, Rank, Origem)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-sky-400" />
              <span>
                Filtros
                {activeDropdownFiltersCount > 0
                  ? ` (${activeDropdownFiltersCount})`
                  : ''}
              </span>
            </button>

            <button
              onClick={() => setIsAddingDeck((prev) => !prev)}
              className="px-2 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-emerald-400 flex items-center gap-1 whitespace-nowrap"
              title="Criar uma nova Categoria ou Deck personalizado"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Categoria</span>
            </button>

            <button
              onClick={() => setIsManagingDecks((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 whitespace-nowrap border transition-colors ${
                isManagingDecks
                  ? 'bg-emerald-600/25 border-emerald-400 text-emerald-200'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-800 text-slate-200'
              }`}
              title="Abrir painel para renomear, transferir, esvaziar ou excluir Categorias, Pastas e Packs"
            >
              <FolderKanban className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gerenciar ({decks.length})</span>
            </button>
          </div>
        </div>

        {isAddingDeck && (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newDeckName}
              onChange={(e) => setNewDeckName(e.target.value)}
              placeholder="Nome da nova Categoria / Deck..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
            <button
              onClick={() => {
                if (newDeckName.trim()) {
                  const newId = onCreateDeck(newDeckName.trim());
                  setSelectedDeckId(newId);
                  setNewDeckName('');
                  setIsAddingDeck(false);
                }
              }}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white"
            >
              Criar Categoria
            </button>
          </div>
        )}

        {/* ===================================================================
            DEDICATED CATEGORY, FOLDER & PACK MANAGEMENT LIST
           =================================================================== */}
        {isManagingDecks && (
          <div className="p-3 rounded-xl bg-[#10141F] border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white">
                  Lista de Gerenciamento de Categorias, Pastas & Packs ({decks.length})
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {(
                  [
                    { id: 'ALL', label: `Todas (${decks.length})` },
                    {
                      id: 'PACKS',
                      label: `Packs (${
                        decks.filter((d) =>
                          d.name.toLowerCase().startsWith('pack (')
                        ).length
                      })`,
                    },
                    {
                      id: 'CUSTOM',
                      label: `Decks & Pastas (${
                        decks.filter(
                          (d) => !d.name.toLowerCase().startsWith('pack (')
                        ).length
                      })`,
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setDeckManagerFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                      deckManagerFilter === tab.id
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-52 overflow-y-auto overscroll-contain space-y-1.5 pr-1">
              {decks
                .filter((d) => {
                  const isPack = d.name.toLowerCase().startsWith('pack (');
                  if (deckManagerFilter === 'PACKS') return isPack;
                  if (deckManagerFilter === 'CUSTOM') return !isPack;
                  return true;
                })
                .map((deck) => {
                  const deckCards = cards.filter(
                    (c) => (c.deckId || 'deck-main') === deck.id
                  );
                  const isPack = deck.name.toLowerCase().startsWith('pack (');
                  const isSystemDefault = deck.id === 'deck-main';
                  const isActiveFilter = selectedDeckId === deck.id;
                  const isEditingThis = editingDeckId === deck.id;

                  // Summarize rarities inside this category
                  const rarityCounts: Partial<Record<CardClass, number>> = {};
                  deckCards.forEach((c) => {
                    const cls = (c.cardClass || 'Lendária') as CardClass;
                    rarityCounts[cls] = (rarityCounts[cls] || 0) + 1;
                  });

                  return (
                    <div
                      key={deck.id}
                      className={`p-2 rounded-lg border flex items-center justify-between gap-2 flex-wrap transition-colors ${
                        isActiveFilter
                          ? 'bg-slate-800/90 border-emerald-500/70'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* Left: Type + Editable Name + Card & Rarity Breakdown */}
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span
                          className={`text-[10px] font-extrabold uppercase shrink-0 ${
                            isPack
                              ? 'text-amber-300'
                              : isSystemDefault
                              ? 'text-emerald-300'
                              : 'text-sky-300'
                          }`}
                        >
                          {isPack ? 'Pack' : isSystemDefault ? 'Padrão' : 'Deck/Pasta'} ·
                        </span>

                        {isEditingThis ? (
                          <div className="flex items-center gap-1 flex-1 min-w-[160px]">
                            <input
                              type="text"
                              value={editingDeckName}
                              onChange={(e) => setEditingDeckName(e.target.value)}
                              className="flex-1 bg-slate-950 border border-emerald-500 rounded px-2 py-0.5 text-xs text-white focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                if (editingDeckName.trim()) {
                                  onRenameDeck(deck.id, editingDeckName.trim());
                                }
                                setEditingDeckId(null);
                              }}
                              className="p-1 rounded bg-emerald-600 text-white hover:bg-emerald-500"
                              title="Salvar novo nome"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => setEditingDeckId(null)}
                              className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
                              title="Cancelar"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedDeckId(deck.id)}
                            className="text-xs font-bold text-white hover:text-emerald-300 truncate text-left"
                            title="Clique para filtrar as cartas desta categoria"
                          >
                            {deck.name}
                          </button>
                        )}

                        <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
                          ({deckCards.length}{' '}
                          {deckCards.length === 1 ? 'carta' : 'cartas'})
                        </span>

                        <div className="hidden xl:flex items-center gap-1.5 text-[10px] text-slate-400 font-mono tabular-nums">
                          {Object.entries(rarityCounts).map(([rName, rCount], idx) => (
                            <span key={rName}>
                              {idx > 0 ? '· ' : ''}
                              {rCount} {rName}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Right: Direct Management Actions for this Category/Deck */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setSelectedDeckId(deck.id)}
                          className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                            isActiveFilter
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                          }`}
                        >
                          {isActiveFilter ? 'Aberta' : 'Ver'}
                        </button>

                        <button
                          onClick={() => {
                            setEditingDeckId(deck.id);
                            setEditingDeckName(deck.name);
                          }}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
                          title="Renomear esta Categoria / Pack"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>

                        {deckCards.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedDeckId(deck.id);
                              const ids = deckCards.map((c) => c.id);
                              setSelectedCardIds(ids);
                            }}
                            className="px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[10px] font-bold text-amber-300"
                            title="Selecionar todas as cartas desta categoria para gerar um novo Pack Random"
                          >
                            Selecionar ({deckCards.length})
                          </button>
                        )}

                        {deckCards.length > 0 && deck.id !== 'deck-main' && (
                          <button
                            onClick={() =>
                              onMoveAllDeckCards(deck.id, 'deck-main')
                            }
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-semibold text-slate-300"
                            title="Mover todas as cartas desta categoria para o Deck Principal"
                          >
                            Mover p/ Principal
                          </button>
                        )}

                        {deckCards.length > 0 && (
                          <button
                            onClick={() => onClearDeckCards(deck.id)}
                            className="px-2 py-1 rounded bg-rose-950/50 hover:bg-rose-900/70 border border-rose-800/50 text-[10px] font-semibold text-rose-300"
                            title="Excluir apenas as cartas de dentro desta categoria"
                          >
                            Esvaziar
                          </button>
                        )}

                        {!isSystemDefault && (
                          <button
                            onClick={() => {
                              if (selectedDeckId === deck.id) {
                                setSelectedDeckId('ALL');
                              }
                              onDeleteDeck(deck.id, true);
                            }}
                            className="p-1 rounded bg-rose-950/60 hover:bg-rose-600 text-rose-300 hover:text-white transition-colors"
                            title="Excluir esta Categoria/Pack e suas cartas"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Collapsible Secondary Filters (Only shown when clicked or when a filter is active) */}
        {(showAdvancedFilters || activeDropdownFiltersCount > 0) && (
          <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-slate-800/60">
            <span className="text-[11px] font-semibold text-sky-300">
              Filtrar Exibição:
            </span>

            <select
              value={filterCharacterId}
              onChange={(e) => setFilterCharacterId(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Personagem: Todos</option>
              {baseCharacters.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  {ch.name.split(',')[0]}
                </option>
              ))}
            </select>

            <select
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Raridade: Todas</option>
              <option value="Não classificada">
                Não classificada ({unclassifiedCount})
              </option>
              {OFFICIAL_CLASSES.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>

            {distinctFamilies.length > 0 && (
              <select
                value={filterFamily}
                onChange={(e) => setFilterFamily(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              >
                <option value="ALL">Família: Todas</option>
                {distinctFamilies.map((fam) => (
                  <option key={fam} value={fam}>
                    {fam}
                  </option>
                ))}
              </select>
            )}

            <select
              value={filterBiome}
              onChange={(e) => setFilterBiome(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Bioma: Todos</option>
              {distinctBiomes.map((bio) => (
                <option key={bio} value={bio}>
                  {bio}
                </option>
              ))}
            </select>

            <select
              value={filterThemeCollection}
              onChange={(e) => setFilterThemeCollection(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Coleção: Todas</option>
              {distinctCollections.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>

            <select
              value={filterEntityType}
              onChange={(e) => setFilterEntityType(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Tipo: Todos</option>
              <option value="Criatura">Criatura</option>
              <option value="Magia">Magia</option>
              <option value="Item">Item</option>
            </select>

            <select
              value={filterRank}
              onChange={(e) => setFilterRank(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Rank: Todos</option>
              {OFFICIAL_RANKS.map((r) => (
                <option key={r} value={r}>
                  Rank {r}
                </option>
              ))}
            </select>

            <select
              value={filterOrigin}
              onChange={(e) => setFilterOrigin(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="ALL">Origem: Todas</option>
              {(
                [
                  'Escaneamento',
                  'Drop de Mapa',
                  'Booster',
                  'Pasta Importada',
                  'Manual',
                ] as CardOrigin[]
              ).map((orig) => (
                <option key={orig} value={orig}>
                  {orig}
                </option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  setFilterCharacterId('ALL');
                  setFilterClass('ALL');
                  setFilterRank('ALL');
                  setFilterOrigin('ALL');
                  setFilterFamily('ALL');
                  setFilterBiome('ALL');
                  setFilterThemeCollection('ALL');
                  setFilterEntityType('ALL');
                  setSearchQuery('');
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-400 transition-colors whitespace-nowrap cursor-pointer"
              >
                Limpar Filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* 3. Massive Multi-Column Live Card Grid (Bounded Vertical Scroll) */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4">
        {cards.length === 0 ? (
          /* Clean Empty Gallery Hub */
          <div className="h-full min-h-[300px] rounded-2xl border border-dashed border-slate-800 bg-[#0E1118]/60 flex flex-col items-center justify-center p-6 text-center">
            <Layers className="w-10 h-10 text-emerald-400 mb-3 opacity-80" />
            <h3 className="text-base font-bold text-white">
              Galeria Pronta para Produção
            </h3>
            <p className="text-xs text-slate-400 max-w-md mt-1 leading-relaxed">
              Escolha a <strong>Raridade desejada</strong> e a <strong>Qtd. de Cartas</strong> na barra acima e clique em <strong>Dar Random</strong> para já criar seu <strong>Pack ({rarityDisplayLabel}) #1</strong>, ou importe uma <strong>Pasta</strong>.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
              <button
                onClick={() => folderInputRef.current?.click()}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white flex items-center gap-2 transition-colors"
              >
                <FolderUp className="w-4 h-4 text-amber-400" />
                <span>
                  Importar Pasta em {targetRarity === 'AUTO' ? 'Raridade Auto' : targetRarity}
                </span>
              </button>

              <button
                onClick={() =>
                  handleRollRandomPackFromSelectionOrCategory(6, true)
                }
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-2 transition-colors"
              >
                <Dices className="w-4 h-4" />
                <span>
                  Gerar Pack ({rarityDisplayLabel}) #1 (6 Cartas)
                </span>
              </button>

              <button
                onClick={onOpenBoosterModal}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-2 transition-colors"
              >
                <PackageOpen className="w-4 h-4" />
                <span>Abrir Booster (9 Cartas)</span>
              </button>
            </div>
          </div>
        ) : filteredCards.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center px-4 text-slate-500 text-xs">
            <p>Nenhuma carta encontrada nesta categoria/filtro.</p>
            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={() =>
                  handleRollRandomPackFromSelectionOrCategory(4, true)
                }
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
              >
                Gerar Pack ({rarityDisplayLabel}) #{nextPackNumberPreview} (4 Cartas)
              </button>
              <button
                onClick={() => {
                  setSelectedDeckId('ALL');
                  setFilterCharacterId('ALL');
                  setFilterClass('ALL');
                  setFilterRank('ALL');
                  setFilterOrigin('ALL');
                  setSearchQuery('');
                }}
                className="text-emerald-400 hover:underline font-medium"
              >
                Limpar filtros
              </button>
            </div>
          </div>
        ) : (
          <div className={`grid gap-3.5 pb-6 ${gridColsClass}`}>
            {filteredCards.map((card) => {
              const isSelectedOnStage = card.id === activeCardId;
              const multiSelectIndex = validSelectedCardIds.indexOf(card.id);
              const isCheckedForPack = multiSelectIndex !== -1;
              const cls = card.cardClass || 'Lendária';
              const rnk = card.cardRank || card.rankBadgeText || 'S';
              const stamina = card.summonStaminaCost ?? 5;

              return (
                <div
                  key={card.id}
                  onPointerDown={() => handleCardPointerDown(card)}
                  onPointerUp={handleCardPointerUpOrLeave}
                  onPointerLeave={handleCardPointerUpOrLeave}
                  onClick={(e) => {
                    if (longPressTriggeredRef.current) return;
                    if (
                      isMultiSelectMode ||
                      e.shiftKey ||
                      e.ctrlKey ||
                      e.metaKey
                    ) {
                      toggleCardSelection(card.id);
                      return;
                    }
                    onSelectCard(card.id);
                  }}
                  style={{
                    contentVisibility: 'auto',
                    containIntrinsicSize: '220px 360px',
                  }}
                  className={`group relative rounded-xl p-2.5 transition-colors cursor-pointer border flex flex-col ${
                    isCheckedForPack
                      ? 'bg-amber-950/25 border-amber-400 ring-2 ring-amber-400/50 shadow-lg'
                      : isSelectedOnStage
                      ? 'bg-slate-800/90 border-emerald-500 shadow-lg'
                      : 'bg-[#121620] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Multi-Select Checkbox Overlay (Top-Left of Card) */}
                  <button
                    type="button"
                    onClick={(e) => toggleCardSelection(card.id, e)}
                    className={`absolute top-4 left-4 z-20 px-2 py-1 rounded-md flex items-center gap-1 text-[10px] font-extrabold transition-all shadow-md ${
                      isCheckedForPack
                        ? 'bg-amber-400 text-slate-950 border border-amber-200'
                        : 'bg-slate-950/80 text-slate-300 hover:text-white border border-slate-700/90 opacity-85 group-hover:opacity-100'
                    }`}
                    title="Selecionar carta para gerar Pack Random na raridade escolhida"
                  >
                    {isCheckedForPack ? (
                      <>
                        <CheckSquare className="w-3.5 h-3.5 shrink-0" />
                        <span>#{multiSelectIndex + 1}</span>
                      </>
                    ) : (
                      <>
                        <Square className="w-3.5 h-3.5 shrink-0" />
                        <span>Pack</span>
                      </>
                    )}
                  </button>

                  {/* Live Miniature Card Render (Softened outer corners, static visual without SMIL churn) */}
                  <div className="w-full aspect-[680/990] rounded-[7px] overflow-hidden bg-black relative pointer-events-none">
                    <CardFrameSVG
                      card={card}
                      interactive={false}
                      animateChroma={false}
                      idScope={`thumb-${card.id}`}
                    />
                  </div>

                  {/* Clean Metadata Row */}
                  <div className="mt-2.5 flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">
                      {card.title}
                    </span>
                    <span className="text-xs font-mono tabular-nums font-bold text-amber-400 shrink-0">
                      {rnk}
                    </span>
                  </div>

                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 flex items-center justify-between gap-1 text-[11px] text-slate-400 font-mono tabular-nums"
                  >
                    <select
                      value={cls}
                      onChange={(e) =>
                        onAssignCardClass(card.id, e.target.value as CardClass)
                      }
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] font-sans font-semibold text-amber-300 focus:outline-none"
                      title="Mudar Raridade Manualmente (Lendária e Mítica ativam Modo Premium automaticamente)"
                    >
                      {OFFICIAL_CLASSES.map((cName) => (
                        <option key={cName} value={cName}>
                          {cName}
                        </option>
                      ))}
                    </select>
                    <span className="truncate">
                      {card.pvText} · {stamina} Est.
                    </span>
                  </div>

                  {/* Card Management Footer: Deck selector + Info, Re-scan in selected Rarity, Duplicate, Delete */}
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="mt-1.5 pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-1"
                  >
                    <select
                      value={card.deckId || 'deck-main'}
                      onChange={(e) => onAssignCardDeck(card.id, e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 max-w-[95px] truncate focus:outline-none"
                      title="Mover para outra Categoria / Deck"
                    >
                      {decks.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => onInspectCard(card)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Abrir Informativo Completo"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleRescanCharacterVersion(card, e)}
                        className="p-1 rounded hover:bg-emerald-900/50 text-emerald-400"
                        title={`Gerar nova versão random desta carta na raridade ${
                          targetRarity === 'AUTO' ? 'Automática' : targetRarity
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDuplicateCard(card)}
                        className="p-1 rounded hover:bg-slate-700 text-slate-300 hover:text-white"
                        title="Duplicar Carta"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteCard(card.id)}
                        className="p-1 rounded hover:bg-rose-950/60 text-slate-400 hover:text-rose-400"
                        title="Excluir Carta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
