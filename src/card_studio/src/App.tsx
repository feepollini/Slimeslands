import React, { useEffect, useRef, useState } from 'react';
import {
  Upload,
  Download,
  RotateCcw,
  Trash2,
  Palette,
  ZoomIn,
  ZoomOut,
  Video,
  Maximize2,
  Minimize2,
  Play,
  Wand2,
  RefreshCw,
  Dices,
  PackageOpen,
  Info,
  Sliders,
} from 'lucide-react';
import { CardData, CardColorPalette, BottomStatPill } from './types/card';
import { ShowcaseVfxType } from './types/vfx';
import {
  BaseCharacter,
  BoosterModel,
  BoosterOpenHistoryEntry,
  CardClass,
  ClassBalanceTable,
  DeckCategory,
  SubgroupCatalog,
} from './types/slimelands';
import {
  INITIAL_CARDS,
  BLANK_TEMPLATE_CARD,
  createInitialPlayerInventory,
} from './utils/defaultCards';
import {
  DEFAULT_PRESET_PALETTES,
  extractAdaptivePalettesFromImage,
} from './utils/colorExtractor';
import {
  extractAdaptivePalettesFromVideo,
  createSampleAnimatedVideoBlobUrl,
} from './utils/videoHelper';
import {
  DEFAULT_BOOSTER_MODELS,
  DEFAULT_CLASS_BALANCE_TABLES,
  DEFAULT_DECK_CATEGORIES,
  DEFAULT_SUBGROUP_CATALOG,
  INITIAL_BASE_CHARACTERS,
  OFFICIAL_CLASSES,
  ensureCoherentCharacterFields,
  generateProceduralCard,
} from './utils/proceduralEngine';
import { CardFrameSVG } from './components/CardFrameSVG';
import { CardBackSVG } from './components/CardBackSVG';
import { VfxSelectorPanel } from './components/VfxSelectorPanel';
import { GalleryProductionDrawer } from './components/GalleryProductionDrawer';
import { ProceduralEcosystemModal } from './components/ProceduralEcosystemModal';
import { CardInfoPopover } from './components/CardInfoPopover';
import { HeaderSidesTab } from './components/inspector/HeaderSidesTab';
import { LoreMagicTab } from './components/inspector/LoreMagicTab';
import { BottomStatsTab } from './components/inspector/BottomStatsTab';
import { exportCardAsPng, exportCardAsSvg } from './utils/exportCard';
import {
  loadGameMatrixSnapshot,
  saveGameMatrixSnapshot,
} from './utils/matrixPersistence';

type EditorTab = 'art-colors' | 'header-sides' | 'lore-magic' | 'bottom-stats';

export default function App() {
  const [cards, setCards] = useState<CardData[]>(INITIAL_CARDS);
  const [stageDraftCard, setStageDraftCard] = useState<CardData>(BLANK_TEMPLATE_CARD);
  const [activeCardId, setActiveCardId] = useState<string>(
    INITIAL_CARDS[0]?.id || BLANK_TEMPLATE_CARD.id
  );
  const [globalBackImageUrl, setGlobalBackImageUrl] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('art-colors');
  const [isExporting, setIsExporting] = useState(false);
  const [previewZoom, setPreviewZoom] = useState<number>(100);
  const [isGeneratingDemoVideo, setIsGeneratingDemoVideo] = useState(false);

  // Worlds of Slimelands Production Ecosystem State (Game Matrix)
  const [decks, setDecks] = useState<DeckCategory[]>(DEFAULT_DECK_CATEGORIES);
  const [baseCharacters, setBaseCharacters] = useState<BaseCharacter[]>(
    INITIAL_BASE_CHARACTERS
  );
  const [balanceTables, setBalanceTables] = useState<
    Record<CardClass, ClassBalanceTable>
  >(DEFAULT_CLASS_BALANCE_TABLES);
  const [boosterModels, setBoosterModels] = useState<BoosterModel[]>(
    DEFAULT_BOOSTER_MODELS
  );
  const [subgroupCatalog, setSubgroupCatalog] = useState<SubgroupCatalog>(
    DEFAULT_SUBGROUP_CATALOG
  );
  const [playerInventory, setPlayerInventory] = useState<CardData[]>(() =>
    createInitialPlayerInventory(INITIAL_CARDS)
  );
  const [playerCoins, setPlayerCoins] = useState<number>(1000);
  const [boosterStock, setBoosterStock] = useState<Record<string, number>>({
    'booster-standard-9': 2,
    'booster-floresta-9': 1,
    'booster-pantano-sombrio-9': 1,
  });
  const [boosterHistory, setBoosterHistory] = useState<BoosterOpenHistoryEntry[]>([]);
  const [isMatrixHydrated, setIsMatrixHydrated] = useState(false);
  const [activeCustomDeckName, setActiveCustomDeckName] = useState<string>('');

  useEffect(() => {
    const updateActiveDeckName = () => {
      try {
        const activeId = localStorage.getItem('forge_active_deck_id');
        const raw = localStorage.getItem('slimelands_custom_decks_v1');
        if (raw) {
          const list = JSON.parse(raw);
          const d = list.find((item: any) => item.id === activeId || item.isActive);
          if (d) setActiveCustomDeckName(d.name);
        }
      } catch {}
    };
    updateActiveDeckName();
    window.addEventListener('slimelands:decks-updated', updateActiveDeckName);
    return () => window.removeEventListener('slimelands:decks-updated', updateActiveDeckName);
  }, []);

  useEffect(() => {
    const onMobbyLinkUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const targetId = (detail.cardId || '').trim();
      const targetTitle = (detail.cardTitle || '').trim().toLowerCase();
      setCards((prev) =>
        prev.map((c) => {
          const match =
            (targetId && c.id === targetId) ||
            (targetTitle && (c.title || '').trim().toLowerCase() === targetTitle);
          if (!match) return c;
          return {
            ...c,
            linkedMobbyId: detail.mobbyId || undefined,
            linkedMobbyName: detail.mobbyName || undefined,
            ...(detail.syncImageUrl ? { imageUrl: detail.syncImageUrl } : {}),
          };
        })
      );
    };
    window.addEventListener('slimelands:mobby-card-link-updated', onMobbyLinkUpdated);
    return () => window.removeEventListener('slimelands:mobby-card-link-updated', onMobbyLinkUpdated);
  }, []);

  // Hydrate persistent Game Matrix on startup so nothing is lost on reload
  useEffect(() => {
    let cancelled = false;
    loadGameMatrixSnapshot().then((snapshot) => {
      if (cancelled) return;
      if (snapshot) {
        if (snapshot.isLibraryCleared) {
          setCards([]);
          setBaseCharacters([]);
        } else {
          if (Array.isArray(snapshot.cards) && snapshot.cards.length > 0) {
            setCards(snapshot.cards);
          }
          if (
            Array.isArray(snapshot.baseCharacters) &&
            snapshot.baseCharacters.length > 0
          ) {
            setBaseCharacters(snapshot.baseCharacters);
          }
        }
        if (snapshot.stageDraftCard) {
          setStageDraftCard(snapshot.stageDraftCard);
        }
        if (snapshot.activeCardId) {
          setActiveCardId(snapshot.activeCardId);
        }
        if (snapshot.globalBackImageUrl !== undefined) {
          setGlobalBackImageUrl(snapshot.globalBackImageUrl);
        }
        if (Array.isArray(snapshot.decks) && snapshot.decks.length > 0) {
          setDecks(snapshot.decks);
        }
        if (snapshot.balanceTables) {
          setBalanceTables(snapshot.balanceTables);
        }
        if (
          Array.isArray(snapshot.boosterModels) &&
          snapshot.boosterModels.length > 0
        ) {
          setBoosterModels(snapshot.boosterModels);
        }
        if (snapshot.subgroupCatalog) {
          setSubgroupCatalog(snapshot.subgroupCatalog);
        }
        if (Array.isArray(snapshot.playerInventory)) {
          setPlayerInventory(snapshot.playerInventory);
        }
        if (typeof snapshot.playerCoins === 'number') {
          setPlayerCoins(snapshot.playerCoins);
        }
        if (snapshot.boosterStock) {
          setBoosterStock(snapshot.boosterStock);
        }
        if (Array.isArray(snapshot.boosterHistory)) {
          setBoosterHistory(snapshot.boosterHistory);
        }
      }
      setIsMatrixHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Automatically persist Game Matrix whenever cards, inventory, settings change
  useEffect(() => {
    if (!isMatrixHydrated) return;
    const timer = window.setTimeout(() => {
      saveGameMatrixSnapshot({
        version: 1,
        updatedAt: new Date().toISOString(),
        cards,
        stageDraftCard,
        activeCardId,
        globalBackImageUrl,
        decks,
        baseCharacters,
        balanceTables,
        boosterModels,
        subgroupCatalog,
        playerInventory,
        playerCoins,
        boosterStock,
        boosterHistory,
        isLibraryCleared: cards.length === 0 && baseCharacters.length === 0,
      });
    }, 180);
    return () => window.clearTimeout(timer);
  }, [
    isMatrixHydrated,
    cards,
    stageDraftCard,
    activeCardId,
    globalBackImageUrl,
    decks,
    baseCharacters,
    balanceTables,
    boosterModels,
    subgroupCatalog,
    playerInventory,
    playerCoins,
    boosterStock,
    boosterHistory,
  ]);

  // Ensure any generated or edited card with artwork is registered in the Game Matrix baseCharacters pool
  const syncCardsIntoGameMatrixCharacters = (incomingCards: CardData[]) => {
    setBaseCharacters((prevChars) => {
      const nextChars = [...prevChars];
      let changed = false;
      for (const c of incomingCards) {
        if (!c.imageUrl) continue;
        const charId = c.baseCharacterId || `char-matrix-${c.id}`;
        const alreadyExists = nextChars.some(
          (ch) =>
            ch.id === charId ||
            (ch.imageUrl === c.imageUrl && ch.name === c.title)
        );
        if (!alreadyExists) {
          const newChar = ensureCoherentCharacterFields(
            {
              id: charId,
              name: c.title,
              description: c.loreBody || 'Personagem registrado na Matriz do Jogo.',
              imageUrl: c.imageUrl,
              element: c.elementText || 'ARCANO',
              entityType: c.entityType || 'Criatura',
            },
            nextChars.length
          );
          nextChars.push(newChar);
          changed = true;
        }
      }
      return changed ? nextChars : prevChars;
    });
  };

  // Lateral Gallery Grid Expansion & Procedural Modal / Popover State
  const [isGalleryExpandedWide, setIsGalleryExpandedWide] = useState(false);
  const [ecosystemModalOpen, setEcosystemModalOpen] = useState(false);
  const [ecosystemModalSection, setEcosystemModalSection] = useState<
    | 'boosters'
    | 'inventory-board'
    | 'packs-admin'
    | 'characters'
    | 'balance'
    | 'parry-sim'
    | 'generator'
  >('boosters');
  const [inspectedCard, setInspectedCard] = useState<CardData | null>(null);

  // Card Front / Back (Verso) 3D Flip State
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFlipAnimating, setIsFlipAnimating] = useState(false);

  // Parallax & 3D Tilt state (-1 to +1 normalized coordinates)
  const [parallaxOffset, setParallaxOffset] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isPointerOverCard, setIsPointerOverCard] = useState(false);
  const parallaxRafRef = useRef<number | null>(null);

  // Fullscreen Showcase Mode State (2s countdown -> expand & hide UI -> stay 3 to 8s fullscreen)
  const [isFullscreenShowcase, setIsFullscreenShowcase] = useState(false);
  const [showcaseCountdownMs, setShowcaseCountdownMs] = useState<number | null>(null);
  const [showcaseRemainingSec, setShowcaseRemainingSec] = useState<number>(0);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backFileInputRef = useRef<HTMLInputElement | null>(null);

  const rawActiveCard =
    cards.find((c) => c.id === activeCardId) || cards[0] || stageDraftCard;

  const activeCard: CardData = {
    ...rawActiveCard,
    backImageUrl: rawActiveCard.backImageUrl || globalBackImageUrl || null,
  };

  const updateActiveCard = (updater: (prev: CardData) => CardData) => {
    if (cards.length === 0) {
      setStageDraftCard((prev) => updater(prev));
      return;
    }
    setCards((prevCards) =>
      prevCards.map((c) => (c.id === activeCard.id ? updater(c) : c))
    );
  };

  // Trigger elaborate 3D card flip between Front and Back (Verso)
  const handleTriggerFlip = () => {
    setIsFlipAnimating(true);
    setIsFlipped((prev) => !prev);
    window.setTimeout(() => {
      setIsFlipAnimating(false);
    }, 820);
  };

  // Cleanup any pending parallax RAF on unmount
  useEffect(() => {
    return () => {
      if (parallaxRafRef.current !== null) {
        cancelAnimationFrame(parallaxRafRef.current);
      }
    };
  }, []);

  // Trigger the 2-second delay before expanding to Fullscreen Showcase
  const triggerShowcaseSequence = (durationOverride?: number) => {
    const staySeconds = Math.max(
      3,
      Math.min(8, durationOverride ?? activeCard.showcaseDurationSec ?? 5)
    );
    setIsFullscreenShowcase(false);
    setShowcaseCountdownMs(2000);
    setShowcaseRemainingSec(staySeconds);
  };

  // Immediately launch Fullscreen Showcase with an optional VFX override
  const handleTriggerShowcaseWithVfx = (vfxOverride?: ShowcaseVfxType) => {
    setIsFlipped(false);
    if (vfxOverride && vfxOverride !== 'none') {
      updateActiveCard((prev) => ({
        ...prev,
        showcaseVfx: vfxOverride,
      }));
    } else if (!activeCard.showcaseVfx || activeCard.showcaseVfx === 'none') {
      updateActiveCard((prev) => ({
        ...prev,
        showcaseVfx: 'dimensional-slash',
      }));
    }
    setShowcaseCountdownMs(null);
    setShowcaseRemainingSec(
      Math.max(3, Math.min(8, activeCard.showcaseDurationSec ?? 6))
    );
    setIsFullscreenShowcase(true);
  };

  // Handle the 2-second pre-expansion timer
  useEffect(() => {
    if (showcaseCountdownMs === null) return;
    if (showcaseCountdownMs <= 0) {
      setShowcaseCountdownMs(null);
      setIsFullscreenShowcase(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowcaseCountdownMs((prev) => (prev !== null ? prev - 200 : null));
    }, 200);

    return () => window.clearTimeout(timer);
  }, [showcaseCountdownMs]);

  // Handle the 3 to 8 second Fullscreen Showcase duration timer
  useEffect(() => {
    if (!isFullscreenShowcase) return;
    if (showcaseRemainingSec <= 0) {
      setIsFullscreenShowcase(false);
      return;
    }

    const timer = window.setTimeout(() => {
      setShowcaseRemainingSec((prev) => prev - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [isFullscreenShowcase, showcaseRemainingSec]);

  // Allow ESC key to exit Fullscreen Showcase early
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'Escape' &&
        (isFullscreenShowcase || showcaseCountdownMs !== null)
      ) {
        setShowcaseCountdownMs(null);
        setIsFullscreenShowcase(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreenShowcase, showcaseCountdownMs]);

  const applyPaletteToCard = (palette: CardColorPalette) => {
    updateActiveCard((prev) => ({
      ...prev,
      frameTopColor: palette.frameTopColor,
      frameMidColor: palette.frameMidColor,
      frameBottomColor: palette.frameBottomColor,
      strokeColor: palette.strokeColor,
      elementTextColor: palette.elementTextColor,
      rankCircleColor: palette.rankCircleColor,
    }));
  };

  // Load image and automatically extract adaptive palettes
  const handleLoadImageUrl = async (url: string) => {
    const palettes = await extractAdaptivePalettesFromImage(url);
    const primary = palettes[0] || DEFAULT_PRESET_PALETTES[0];

    updateActiveCard((prev) => ({
      ...prev,
      imageUrl: url,
      videoUrl: null,
      mediaType: 'image',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      backgroundFill: 'dark',
      extractedSwatches: palettes,
      ...(prev.autoAdaptColors
        ? {
            frameTopColor: primary.frameTopColor,
            frameMidColor: primary.frameMidColor,
            frameBottomColor: primary.frameBottomColor,
            strokeColor: primary.strokeColor,
            elementTextColor: primary.elementTextColor,
            rankCircleColor: primary.rankCircleColor,
          }
        : {}),
    }));
  };

  const handleLoadVideoUrl = async (url: string) => {
    const palettes = await extractAdaptivePalettesFromVideo(url);
    const primary = palettes[0] || DEFAULT_PRESET_PALETTES[0];

    updateActiveCard((prev) => ({
      ...prev,
      videoUrl: url,
      mediaType: 'video',
      imageScale: 1,
      imageOffsetX: 0,
      imageOffsetY: 0,
      backgroundFill: 'dark',
      extractedSwatches: palettes,
      ...(prev.autoAdaptColors
        ? {
            frameTopColor: primary.frameTopColor,
            frameMidColor: primary.frameMidColor,
            frameBottomColor: primary.frameBottomColor,
            strokeColor: primary.strokeColor,
            elementTextColor: primary.elementTextColor,
            rankCircleColor: primary.rankCircleColor,
          }
        : {}),
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('video/')) {
      const objectUrl = URL.createObjectURL(file);
      handleLoadVideoUrl(objectUrl);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleLoadImageUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleGenerateAnimatedVideo = async () => {
    if (isGeneratingDemoVideo) return;
    setIsGeneratingDemoVideo(true);
    try {
      const theme =
        activeCard.elementText.includes('AGUA') ? 'sapphire' : 'crimson';
      const videoBlobUrl = await createSampleAnimatedVideoBlobUrl(theme);
      if (videoBlobUrl) {
        await handleLoadVideoUrl(videoBlobUrl);
      }
    } finally {
      setIsGeneratingDemoVideo(false);
    }
  };

  const applyRarityClassToCard = (
    prev: CardData,
    nextClass: CardData['cardClass']
  ): CardData => {
    const resolvedClass = nextClass || 'Lendária';
    const isAutoPremiumRarity =
      resolvedClass === 'Lendária' ||
      resolvedClass === 'Mítica' ||
      resolvedClass === 'Limitada';

    const nextPills = [...prev.pills] as CardData['pills'];
    if (
      isAutoPremiumRarity &&
      !nextPills.slice(0, prev.pillCount || 4).some((p) => p.isChromaticSpecial)
    ) {
      const specialIdx = Math.min(3, (prev.pillCount || 4) - 1);
      nextPills[specialIdx] = {
        ...nextPills[specialIdx],
        mode: 'stat',
        badgeValue: '∞',
        isChromaticSpecial: true,
      };
    }

    // Update loreHeader class label if it follows standard format
    const updatedLoreHeader = prev.loreHeader.includes('·')
      ? `${prev.loreHeader.split('·')[0].trim()} · ${resolvedClass} (Estamina ${
          prev.summonStaminaCost ?? 5
        })`
      : prev.loreHeader;

    return {
      ...prev,
      cardClass: resolvedClass,
      loreHeader: updatedLoreHeader,
      pills: nextPills,
      ...(isAutoPremiumRarity
        ? {
            isPremium: true,
            isRankChromatic: true,
            isPvChromatic: true,
            invertElementCapsule: true,
            strokeWidth: prev.strokeWidth || 2,
            strokeGlow: 100,
            prismaticIntensity: 100,
            microGlitterIntensity: 100,
            parallaxDepth: 100,
            contourLightSpeed: 1.8,
          }
        : {}),
    };
  };

  const handleTogglePremium = (nextPremium: boolean) => {
    updateActiveCard((prev) => {
      const nextPills = [...prev.pills] as CardData['pills'];
      if (nextPremium && !nextPills.some((p) => p.isChromaticSpecial)) {
        const specialIdx = Math.min(3, (prev.pillCount || 4) - 1);
        nextPills[specialIdx] = {
          ...nextPills[specialIdx],
          mode: 'stat',
          badgeValue: '∞',
          isChromaticSpecial: true,
        };
      }

      return {
        ...prev,
        isPremium: nextPremium,
        pills: nextPills,
        ...(nextPremium
          ? {
              isRankChromatic: true,
              isPvChromatic: true,
              invertElementCapsule: true,
              strokeGlow: 100,
              prismaticIntensity: 100,
              microGlitterIntensity: 100,
              parallaxDepth: 100,
              contourLightSpeed: 1.8,
            }
          : {}),
      };
    });

    if (nextPremium && activeCard.autoShowcaseEnabled) {
      triggerShowcaseSequence(activeCard.showcaseDurationSec);
    } else {
      setShowcaseCountdownMs(null);
      setIsFullscreenShowcase(false);
    }
  };

  const handleImageDrag = (dx: number, dy: number) => {
    updateActiveCard((prev) => ({
      ...prev,
      imageOffsetX: Math.round(prev.imageOffsetX + dx * 1.35),
      imageOffsetY: Math.round(prev.imageOffsetY + dy * 1.35),
    }));
  };

  const handleBackImageDrag = (dx: number, dy: number) => {
    updateActiveCard((prev) => ({
      ...prev,
      backImageOffsetX: Math.round((prev.backImageOffsetX ?? 0) + dx * 1.35),
      backImageOffsetY: Math.round((prev.backImageOffsetY ?? 0) + dy * 1.35),
    }));
  };

  const handleBackFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const uploadedUrl = reader.result as string;
        // Set as Global Card Back (Verso Global) AND apply to all cards!
        setGlobalBackImageUrl(uploadedUrl);
        setStageDraftCard((prev) => ({
          ...prev,
          backImageUrl: uploadedUrl,
          backImageScale: 1,
          backImageOffsetX: 0,
          backImageOffsetY: 0,
        }));
        setCards((prevCards) =>
          prevCards.map((c) => ({
            ...c,
            backImageUrl: uploadedUrl,
            backImageScale: 1,
            backImageOffsetX: 0,
            backImageOffsetY: 0,
          }))
        );
        if (!isFlipped) {
          handleTriggerFlip();
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleClearGlobalBack = () => {
    setGlobalBackImageUrl(null);
    setStageDraftCard((prev) => ({
      ...prev,
      backImageUrl: null,
      backImageScale: 1,
      backImageOffsetX: 0,
      backImageOffsetY: 0,
    }));
    setCards((prevCards) =>
      prevCards.map((c) => ({
        ...c,
        backImageUrl: null,
        backImageScale: 1,
        backImageOffsetX: 0,
        backImageOffsetY: 0,
      }))
    );
  };

  const handleCardPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activeCard.isPremium) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    if (parallaxRafRef.current !== null) {
      cancelAnimationFrame(parallaxRafRef.current);
    }
    parallaxRafRef.current = requestAnimationFrame(() => {
      const normX = ((clientX - rect.left) / rect.width - 0.5) * 2;
      const normY = ((clientY - rect.top) / rect.height - 0.5) * 2;
      setParallaxOffset({
        x: Math.max(-1, Math.min(1, normX)),
        y: Math.max(-1, Math.min(1, normY)),
      });
      parallaxRafRef.current = null;
    });
  };

  const handleUpdatePill = (
    index: number,
    changes: Partial<BottomStatPill>
  ) => {
    updateActiveCard((prev) => {
      const nextPills = [...prev.pills] as CardData['pills'];
      nextPills[index] = { ...nextPills[index], ...changes };
      return { ...prev, pills: nextPills };
    });
  };

  const handleDuplicateCard = (card: CardData) => {
    const newId = `card-${Date.now()}`;
    const cloned: CardData = {
      ...card,
      id: newId,
      title: `${card.title} II`,
      pills: card.pills.map((p) => ({
        ...p,
        id: `${p.id}-${Date.now()}`,
      })) as CardData['pills'],
    };
    setCards((prev) => [cloned, ...prev]);
    setActiveCardId(newId);
  };

  const handleDeleteCard = (id: string) => {
    const cardToDelete = cards.find((c) => c.id === id);
    const filtered = cards.filter((c) => c.id !== id);
    setCards(filtered);
    if (activeCardId === id && filtered[0]) {
      setActiveCardId(filtered[0].id);
    }

    if (cardToDelete) {
      const titleLower = (cardToDelete.title || '').toLowerCase().trim();
      setBaseCharacters((prev) =>
        prev.filter(
          (bc) =>
            bc.id !== `char-matrix-${id}` &&
            bc.id !== cardToDelete.baseCharacterId &&
            bc.name.toLowerCase().trim() !== titleLower
        )
      );

      try {
        const purgeFromPacks = (packs: any[]) => {
          packs.forEach((p: any) => {
            if (Array.isArray(p.fixedCards)) {
              p.fixedCards = p.fixedCards.filter(
                (name: string) => name.toLowerCase().trim() !== titleLower
              );
            }
          });
        };
        const forgePersistRaw = localStorage.getItem('forge_v2_persistence');
        if (forgePersistRaw) {
          const forgeData = JSON.parse(forgePersistRaw);
          if (forgeData.packs) {
            purgeFromPacks(forgeData.packs);
            localStorage.setItem('forge_v2_persistence', JSON.stringify(forgeData));
          }
        }
        const packsRaw = localStorage.getItem('forja_v2_packs');
        if (packsRaw) {
          const packs = JSON.parse(packsRaw);
          if (Array.isArray(packs)) {
            purgeFromPacks(packs);
            localStorage.setItem('forja_v2_packs', JSON.stringify(packs));
          }
        }
      } catch (_) {}

      window.dispatchEvent(
        new CustomEvent('matrix_card_deleted', {
          detail: { id, title: cardToDelete.title },
        })
      );
    }
  };

  const handleClearAllCardsAndAssets = () => {
    setCards([]);
    setBaseCharacters([]);
    setDecks(DEFAULT_DECK_CATEGORIES);
    setStageDraftCard(BLANK_TEMPLATE_CARD);
    setActiveCardId(BLANK_TEMPLATE_CARD.id);

    saveGameMatrixSnapshot({
      version: 1,
      updatedAt: new Date().toISOString(),
      cards: [],
      stageDraftCard: BLANK_TEMPLATE_CARD,
      activeCardId: BLANK_TEMPLATE_CARD.id,
      globalBackImageUrl,
      decks: DEFAULT_DECK_CATEGORIES,
      baseCharacters: [],
      balanceTables,
      boosterModels,
      subgroupCatalog,
      playerInventory: [],
      playerCoins,
      boosterStock,
      boosterHistory,
      isLibraryCleared: true,
    });

    try {
      const forgePersistRaw = localStorage.getItem('forge_v2_persistence');
      if (forgePersistRaw) {
        const forgeData = JSON.parse(forgePersistRaw);
        if (forgeData.packs && Array.isArray(forgeData.packs)) {
          forgeData.packs.forEach((p: any) => {
            p.fixedCards = [];
            p.cardGroups = { common: [], rare: [], legendary: [] };
          });
          localStorage.setItem('forge_v2_persistence', JSON.stringify(forgeData));
        }
      }
      const packsRaw = localStorage.getItem('forja_v2_packs');
      if (packsRaw) {
        const packs = JSON.parse(packsRaw);
        if (Array.isArray(packs)) {
          packs.forEach((p: any) => {
            p.fixedCards = [];
            p.cardGroups = { common: [], rare: [], legendary: [] };
          });
          localStorage.setItem('forja_v2_packs', JSON.stringify(packs));
        }
      }
    } catch (_) {}

    try {
      fetch('/src/core/store.json')
        .then((res) => res.json())
        .then((storeData) => {
          if (storeData && Array.isArray(storeData.packs)) {
            storeData.packs.forEach((p: any) => {
              p.fixedCards = [];
              p.cardGroups = { common: [], rare: [], legendary: [] };
            });
            fetch('/api/save-store', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(storeData),
            }).catch(() => {});
          }
        })
        .catch(() => {});
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('matrix_library_cleared'));
  };

  const handleInstantRandomRoll = () => {
    const newCard = generateProceduralCard({
      charactersPool: baseCharacters,
      balanceTables,
      origin: 'Escaneamento',
      deckId: activeCard.deckId || 'deck-main',
    });
    const cardWithGlobalBack: CardData = {
      ...newCard,
      backImageUrl: globalBackImageUrl || newCard.backImageUrl || null,
    };
    setCards((prev) => [cardWithGlobalBack, ...prev]);
    setActiveCardId(cardWithGlobalBack.id);
    setIsFlipped(false);
  };

  const handleExportPng = async (scale = 2) => {
    if (!svgRef.current || isExporting) return;
    setIsExporting(true);
    try {
      await exportCardAsPng(svgRef.current, activeCard, scale);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportSvg = () => {
    if (!svgRef.current) return;
    exportCardAsSvg(svgRef.current, activeCard);
  };

  const handleSectionSelectFromCanvas = (
    section: 'title' | 'image' | 'sides' | 'lore' | 'bottom'
  ) => {
    if (isFullscreenShowcase) return;
    if (section === 'image') setActiveTab('art-colors');
    if (section === 'title' || section === 'sides') setActiveTab('header-sides');
    if (section === 'lore') setActiveTab('lore-magic');
    if (section === 'bottom') setActiveTab('bottom-stats');
  };

  // Calculate 3D tilt angles when Premium is active
  const tiltFactor = activeCard.isPremium
    ? (activeCard.parallaxDepth ?? 100) / 100
    : 0;
  const rotateY = parallaxOffset.x * 8 * tiltFactor;
  const rotateX = -parallaxOffset.y * 8 * tiltFactor;

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-[#08090C] text-slate-100 flex flex-col font-['Plus_Jakarta_Sans',sans-serif] selection:bg-emerald-500/30">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/mp4,video/webm,video/quicktime"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={backFileInputRef}
        type="file"
        accept="image/*"
        onChange={handleBackFileChange}
        className="hidden"
      />

      {/* =====================================================================
          TOP BAR (Retracts completely in Full Mode)
         ===================================================================== */}
      <header
        className={`border-b bg-[#0D0F14] px-5 flex items-center justify-between gap-8 shrink-0 z-30 transition-all duration-500 ease-out ${
          isFullscreenShowcase
            ? 'h-0 max-h-0 py-0 opacity-0 -translate-y-full border-transparent pointer-events-none overflow-hidden'
            : 'h-14 border-slate-800/80 opacity-100 translate-y-0'
        }`}
      >
        {/* Zone 1: Brand Title & Cohesion Deck Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap font-['Outfit',sans-serif]">
            Worlds of Slimelands
          </span>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('forge:switch-tab', { detail: 'decks' }));
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 transition-all text-xs font-bold cursor-pointer"
            title="Voltar para a Galeria de Decks"
          >
            <span>🎴</span>
            <span>Deck: {activeCustomDeckName || 'Principal'}</span>
            <span className="text-[10px] text-emerald-400 opacity-70">◀ Decks</span>
          </button>
        </div>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
          <button
            onClick={() => setIsGalleryExpandedWide((prev) => !prev)}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            {isGalleryExpandedWide ? 'Compactar Galeria' : 'Expandir Galeria'}
          </button>
          <button
            onClick={() => {
              setEcosystemModalSection('boosters');
              setEcosystemModalOpen(true);
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 text-amber-300 font-bold"
          >
            Loja & Boosters (9 Cartas)
          </button>
          <button
            onClick={() => {
              setEcosystemModalSection('inventory-board');
              setEcosystemModalOpen(true);
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0 text-emerald-400 font-bold"
          >
            Inventário & Tabuleiro ({playerInventory.length})
          </button>
          <button
            onClick={() => {
              setEcosystemModalSection('balance');
              setEcosystemModalOpen(true);
            }}
            className="hover:text-white transition-colors whitespace-nowrap shrink-0"
          >
            Regras & Balanceamento
          </button>
        </nav>

        {/* Zone 3: Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              setEcosystemModalSection('boosters');
              setEcosystemModalOpen(true);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-extrabold text-slate-950 transition-colors whitespace-nowrap shrink-0"
          >
            Abrir Booster (9 Cartas)
          </button>
        </div>
      </header>

      {/* =====================================================================
          MAIN PRODUCTION WORKSPACE (Bounded 100vh Height + Internal Scroll)
         ===================================================================== */}
      <div className="flex-1 min-h-0 flex overflow-hidden">
        {/* 1. LEFT LATERAL PRODUCTION GALLERY (Retracts completely in Full Mode) */}
        <div
          className={`h-full min-h-0 flex shrink-0 transition-all duration-500 ease-out ${
            isFullscreenShowcase
              ? 'w-0 min-w-0 max-w-0 opacity-0 -translate-x-full pointer-events-none overflow-hidden'
              : 'opacity-100 translate-x-0'
          }`}
        >
          <GalleryProductionDrawer
            cards={cards}
            activeCardId={activeCard.id}
            onSelectCard={(id) => {
              setActiveCardId(id);
              setIsFlipped(false);
            }}
            onAddCards={(newCards) => {
              const cardsWithBack = newCards.map((c) => ({
                ...c,
                backImageUrl: c.backImageUrl || globalBackImageUrl || null,
              }));
              syncCardsIntoGameMatrixCharacters(cardsWithBack);
              setCards((prev) => [...cardsWithBack, ...prev]);
            }}
            onReplaceCards={(updatedCards) => {
              syncCardsIntoGameMatrixCharacters(updatedCards);
              setCards(updatedCards);
            }}
            onDeleteCard={handleDeleteCard}
            onClearAllCards={handleClearAllCardsAndAssets}
            onDuplicateCard={handleDuplicateCard}
            onAssignCardDeck={(cardId, deckId) => {
              const targetDeckObj = decks.find((d) => d.id === deckId);
              const deckNameLower = (targetDeckObj?.name || '').toLowerCase();
              const isMythicOrLegendaryDeck =
                deckId === 'deck-mythic' ||
                deckNameLower.includes('mítica') ||
                deckNameLower.includes('mitica') ||
                deckNameLower.includes('lendária') ||
                deckNameLower.includes('lendaria');

              setCards((prev) =>
                prev.map((c) => {
                  if (c.id !== cardId) return c;
                  const updated = { ...c, deckId };
                  if (isMythicOrLegendaryDeck) {
                    return applyRarityClassToCard(
                      updated,
                      c.cardClass === 'Mítica' || c.cardClass === 'Lendária'
                        ? c.cardClass
                        : 'Mítica'
                    );
                  }
                  return updated;
                })
              );
            }}
            onAssignCardClass={(cardId, cardClass) => {
              if (cards.length === 0 && stageDraftCard.id === cardId) {
                setStageDraftCard((prev) =>
                  applyRarityClassToCard(prev, cardClass)
                );
                return;
              }
              setCards((prev) =>
                prev.map((c) =>
                  c.id === cardId ? applyRarityClassToCard(c, cardClass) : c
                )
              );
            }}
            onInspectCard={(card) => setInspectedCard(card)}
            onOpenBoosterModal={() => {
              setEcosystemModalSection('boosters');
              setEcosystemModalOpen(true);
            }}
            globalBackImageUrl={globalBackImageUrl}
            onUploadGlobalBack={() => backFileInputRef.current?.click()}
            onClearGlobalBack={handleClearGlobalBack}
            onFlipCardPreview={handleTriggerFlip}
            decks={decks}
            onCreateDeck={(name) => {
              const newId = `deck-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 5)}`;
              setDecks((prev) => [
                ...prev,
                {
                  id: newId,
                  name,
                  description: 'Coleção personalizada',
                  accentColor: '#10B981',
                },
              ]);
              return newId;
            }}
            onRenameDeck={(deckId, newName) => {
              setDecks((prev) =>
                prev.map((d) =>
                  d.id === deckId ? { ...d, name: newName } : d
                )
              );
            }}
            onDeleteDeck={(deckId, deleteCardsInside) => {
              setDecks((prev) => prev.filter((d) => d.id !== deckId));
              if (deleteCardsInside) {
                setCards((prev) => prev.filter((c) => c.deckId !== deckId));
              } else {
                const fallbackDeckId =
                  decks.find((d) => d.id !== deckId)?.id || 'deck-main';
                setCards((prev) =>
                  prev.map((c) =>
                    c.deckId === deckId ? { ...c, deckId: fallbackDeckId } : c
                  )
                );
              }
            }}
            onClearDeckCards={(deckId) => {
              const toDelete = cards.filter((c) => c.deckId === deckId);
              setCards((prev) => prev.filter((c) => c.deckId !== deckId));
              toDelete.forEach((c) => handleDeleteCard(c.id));
            }}
            onMoveAllDeckCards={(fromDeckId, toDeckId) => {
              setCards((prev) =>
                prev.map((c) =>
                  c.deckId === fromDeckId ? { ...c, deckId: toDeckId } : c
                )
              );
            }}
            baseCharacters={baseCharacters}
            onAddBaseCharacters={(newChars) =>
              setBaseCharacters((prev) => [...prev, ...newChars])
            }
            balanceTables={balanceTables}
            subgroupCatalog={subgroupCatalog}
            onUpdateSubgroupCatalog={setSubgroupCatalog}
            isExpandedWide={isGalleryExpandedWide}
            onToggleExpandedWide={() =>
              setIsGalleryExpandedWide((prev) => !prev)
            }
          />
        </div>

        {/* 2. CENTER INTERACTIVE CARD VIEWPORT (In Full Mode: entire UI & frame retract, leaving only artwork/video) */}
        <main
          onClick={() => {
            if (isFullscreenShowcase) {
              setShowcaseCountdownMs(null);
              setIsFullscreenShowcase(false);
            } else {
              handleTriggerFlip();
            }
          }}
          className={`flex-1 min-h-0 h-full bg-[#07080B] relative flex flex-col items-center justify-between overflow-y-auto overscroll-contain cursor-pointer select-none transition-all duration-500 ${
            isFullscreenShowcase ? 'p-0 justify-center' : 'p-3'
          }`}
          style={{
            backgroundImage: isFullscreenShowcase
              ? 'none'
              : `radial-gradient(circle at 50% 45%, ${activeCard.strokeColor}22 0%, ${activeCard.frameTopColor}18 38%, transparent 72%)`,
          }}
        >
          {/* Compact Workspace Toolbar above Card (Retracts in Full Mode) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-2 bg-[#11141C]/90 backdrop-blur-md border px-3 rounded-xl z-10 cursor-default flex-wrap justify-center transition-all duration-500 ease-out ${
              isFullscreenShowcase
                ? 'max-h-0 py-0 my-0 opacity-0 -translate-y-8 border-transparent pointer-events-none overflow-hidden'
                : 'py-1.5 border-slate-800/80 opacity-100 translate-y-0'
            }`}
          >
            <button
              onClick={handleTriggerFlip}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                isFlipped
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 transition-transform duration-500 ${
                  isFlipped ? 'rotate-180' : ''
                }`}
              />
              <span>{isFlipped ? 'Ver Frente' : 'Virar Verso'}</span>
            </button>

            <button
              onClick={() => setInspectedCard(activeCard)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
              title="Abrir informativo detalhado da carta (PV, Dano, Mana e Parry)"
            >
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Informativo</span>
            </button>

            <button
              onClick={() => {
                if (isFullscreenShowcase || showcaseCountdownMs !== null) {
                  setShowcaseCountdownMs(null);
                  setIsFullscreenShowcase(false);
                } else {
                  setIsFlipped(false);
                  setShowcaseCountdownMs(null);
                  setShowcaseRemainingSec(9999);
                  setIsFullscreenShowcase(true);
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
                isFullscreenShowcase
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
              }`}
              title="Retrair toda a UI e o Frame para exibir apenas a Arte (Imagem ou Vídeo). Clique em qualquer lugar ou pressione ESC para voltar."
            >
              <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Modo Full</span>
            </button>

            <div className="h-3.5 w-[1px] bg-slate-800" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 text-xs font-mono tabular-nums text-slate-300">
              <button
                onClick={() => setPreviewZoom((z) => Math.max(65, z - 10))}
                className="p-1 rounded hover:bg-slate-800"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center">{previewZoom}%</span>
              <button
                onClick={() => setPreviewZoom((z) => Math.min(135, z + 10))}
                className="p-1 rounded hover:bg-slate-800"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="h-3.5 w-[1px] bg-slate-800" />

            {/* Export SVG & PNG */}
            <button
              onClick={handleExportSvg}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors whitespace-nowrap shrink-0"
            >
              SVG
            </button>
            <button
              onClick={() => handleExportPng(2)}
              disabled={isExporting}
              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExporting ? '...' : 'PNG HD'}</span>
            </button>
          </div>

          {/* 3D FLIPPABLE CARD CANVAS (Expands cleanly in Full Mode with all frame/UI retracted) */}
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center w-full relative">
            <div
              onClick={(e) => {
                if (isFullscreenShowcase) {
                  e.stopPropagation();
                  setShowcaseCountdownMs(null);
                  setIsFullscreenShowcase(false);
                  return;
                }
                e.stopPropagation();
              }}
              onPointerEnter={() => setIsPointerOverCard(true)}
              onPointerMove={handleCardPointerMove}
              onPointerLeave={() => {
                setIsPointerOverCard(false);
                setParallaxOffset({ x: 0, y: 0 });
              }}
              style={{
                width: isFullscreenShowcase
                  ? 'min(92vw, calc(96vh * (680 / 990)))'
                  : `min(${Math.round(
                      410 * (previewZoom / 100)
                    )}px, calc((100vh - 176px) * (680 / 990)))`,
                aspectRatio: '680 / 990',
                perspective: '1600px',
                transition: 'width 550ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className={`relative ${
                isFullscreenShowcase ? 'cursor-zoom-out' : 'cursor-default'
              }`}
              title={
                isFullscreenShowcase
                  ? 'Clique ou pressione ESC para sair do Modo Full'
                  : undefined
              }
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  willChange: 'transform',
                  transform: `scale(${
                    isFlipAnimating ? 1.055 : 1
                  }) rotateX(${rotateX.toFixed(2)}deg) rotateY(${(
                    (isFlipped ? 180 : 0) + rotateY
                  ).toFixed(2)}deg)`,
                  transition: isFlipAnimating
                    ? 'transform 780ms cubic-bezier(0.22, 1, 0.36, 1)'
                    : isPointerOverCard
                    ? 'transform 90ms ease-out'
                    : 'transform 520ms cubic-bezier(0.16, 1, 0.3, 1)',
                }}
              >
                {/* FRONT FACE */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                  }}
                  className="absolute inset-0 shadow-[0_28px_90px_rgba(0,0,0,0.9)] rounded-[10px] overflow-hidden"
                >
                  {activeCard.backgroundFill === 'transparent' &&
                    !activeCard.imageUrl &&
                    !activeCard.videoUrl && (
                      <div
                        className="absolute inset-0 pointer-events-none opacity-25"
                        style={{
                          backgroundImage:
                            'conic-gradient(#334155 90deg, #1e293b 90deg 180deg, #334155 180deg 270deg, #1e293b 270deg)',
                          backgroundSize: '24px 24px',
                        }}
                      />
                    )}

                  <CardFrameSVG
                    card={activeCard}
                    svgRef={svgRef}
                    interactive={!isFullscreenShowcase && !isFlipped}
                    animateChroma={true}
                    idScope={`stage-${activeCard.id}`}
                    onSelectSection={handleSectionSelectFromCanvas}
                    onImageDrag={handleImageDrag}
                    parallaxOffset={parallaxOffset}
                    artOnlyShowcase={isFullscreenShowcase}
                  />
                </div>

                {/* BACK FACE (VERSO) - Frameless 1:1 with Rim Backlight */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    boxShadow: activeCard.isPremium
                      ? `0 0 28px 3px rgba(0, 240, 255, 0.52), 0 0 54px 8px rgba(255, 0, 122, 0.36), 0 28px 95px rgba(0,0,0,0.95)`
                      : `0 0 26px 3px ${activeCard.strokeColor}88, 0 0 52px 6px ${activeCard.strokeColor}44, 0 28px 95px rgba(0,0,0,0.95)`,
                  }}
                  className="absolute inset-0 rounded-[10px] overflow-hidden"
                >
                  <CardBackSVG
                    card={activeCard}
                    interactive={isFlipped}
                    onBackImageDrag={handleBackImageDrag}
                    parallaxOffset={parallaxOffset}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: Quick Capsule Count (1, 2, 3, 4) & Booster Shortcut (Retracts in Full Mode) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`flex items-center gap-3 bg-[#11141C]/90 backdrop-blur-md border px-4 rounded-xl z-10 cursor-default shrink-0 transition-all duration-500 ease-out ${
              isFullscreenShowcase
                ? 'max-h-0 py-0 my-0 opacity-0 translate-y-8 border-transparent pointer-events-none overflow-hidden'
                : 'py-1.5 border-slate-800/80 opacity-100 translate-y-0'
            }`}
          >
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-400 mr-1">Cápsulas:</span>
              {([1, 2, 3, 4] as const).map((count) => (
                <button
                  key={count}
                  onClick={() =>
                    updateActiveCard((prev) => ({ ...prev, pillCount: count }))
                  }
                  className={`w-7 h-7 rounded-lg text-xs font-bold font-mono tabular-nums transition-colors ${
                    (activeCard.pillCount || 4) === count
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800/80 text-slate-400 hover:text-white'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            <div className="h-4 w-[1px] bg-slate-800" />

            <button
              onClick={() => {
                setEcosystemModalSection('boosters');
                setEcosystemModalOpen(true);
              }}
              className="px-3 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
            >
              <PackageOpen className="w-3.5 h-3.5" />
              <span>Abrir Booster (9 Cartas)</span>
            </button>
          </div>
        </main>

        {/* 3. RIGHT INSPECTOR PANEL (Retracts completely in Full Mode) */}
        <aside
          className={`h-full max-h-full min-h-0 overflow-hidden bg-[#0D0F14] flex flex-col shrink-0 transition-all duration-500 ease-out ${
            isFullscreenShowcase
              ? 'w-0 min-w-0 max-w-0 opacity-0 translate-x-full border-transparent pointer-events-none'
              : 'w-[360px] xl:w-[390px] opacity-100 translate-x-0 border-l border-slate-800/80'
          }`}
        >
          {/* Inspector Section Tabs */}
          <div className="grid grid-cols-4 border-b border-slate-800/80 bg-[#090B0E] p-1 gap-1 shrink-0">
            {[
              { id: 'art-colors', label: 'Arte & VFX' },
              { id: 'header-sides', label: 'Topo & PV' },
              { id: 'lore-magic', label: 'Descrição' },
              { id: 'bottom-stats', label: 'Habilidades' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as EditorTab)}
                className={`py-2 px-2 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === t.id
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab Body */}
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4">
            {activeTab === 'art-colors' && (
              <>
                {/* 1. Fast Media Upload Row (Front Artwork + Global Card Back Verso) */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Arte da Frente</span>
                    </button>

                    <button
                      onClick={() => backFileInputRef.current?.click()}
                      className="py-2 px-3 rounded-lg bg-purple-950/50 hover:bg-purple-900/60 border border-purple-500/40 text-xs font-semibold text-purple-200 flex items-center justify-center gap-1.5 transition-colors"
                      title="Importar Verso Global que vale para TODAS as cartas"
                    >
                      <Upload className="w-3.5 h-3.5 text-purple-400" />
                      <span>Verso (Todas)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleGenerateAnimatedVideo}
                      disabled={isGeneratingDemoVideo}
                      className="py-1.5 px-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Video className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {isGeneratingDemoVideo ? 'Gerando...' : 'Animar em Vídeo'}
                      </span>
                    </button>

                    <button
                      onClick={() =>
                        updateActiveCard((prev) => ({
                          ...prev,
                          imageScale: 1,
                          imageOffsetX: 0,
                          imageOffsetY: 0,
                          backImageScale: 1,
                          backImageOffsetX: 0,
                          backImageOffsetY: 0,
                        }))
                      }
                      className="py-1.5 px-2.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 text-[11px] font-medium text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Encaixe 1:1 Exato</span>
                    </button>
                  </div>
                </div>

                {/* 2. Rarity + Premium & Lateral Badges Toggle (Streamlined) */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3">
                  {/* Manual Rarity / Class Selector (Lendária & Mítica auto-enable Premium & Chroma) */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-300">
                        Categoria de Raridade Manual
                      </span>
                      <span className="text-[10px] text-amber-400 font-semibold">
                        Lendária/Mítica = Premium Padrão
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {OFFICIAL_CLASSES.map((clsName) => {
                        const isCurrent =
                          (activeCard.cardClass || 'Lendária') === clsName;
                        return (
                          <button
                            key={clsName}
                            onClick={() =>
                              updateActiveCard((prev) =>
                                applyRarityClassToCard(prev, clsName)
                              )
                            }
                            className={`py-1 px-2 rounded-lg text-[11px] font-bold border transition-colors ${
                              isCurrent
                                ? clsName === 'Mítica' ||
                                  clsName === 'Lendária' ||
                                  clsName === 'Limitada'
                                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                                  : 'bg-emerald-600 text-white border-emerald-500'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {clsName}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Modo Carta Premium</span>
                    </span>

                    <button
                      onClick={() => handleTogglePremium(!activeCard.isPremium)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                        activeCard.isPremium
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {activeCard.isPremium ? 'ATIVO' : 'ATIVAR'}
                    </button>
                  </div>

                  {/* Quick Toggles for Rank S Chromatic, PV Chromatic & Element Capsule */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      onClick={() =>
                        updateActiveCard((prev) => ({
                          ...prev,
                          isRankChromatic: !prev.isRankChromatic,
                        }))
                      }
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                        activeCard.isRankChromatic
                          ? 'bg-fuchsia-950/60 border-fuchsia-500/70 text-fuchsia-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Rank Cromático
                    </button>

                    <button
                      onClick={() =>
                        updateActiveCard((prev) => ({
                          ...prev,
                          isPvChromatic: !prev.isPvChromatic,
                        }))
                      }
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                        activeCard.isPvChromatic
                          ? 'bg-cyan-950/60 border-cyan-500/70 text-cyan-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      PV Cromático
                    </button>

                    <button
                      onClick={() =>
                        updateActiveCard((prev) => ({
                          ...prev,
                          invertElementCapsule: !prev.invertElementCapsule,
                        }))
                      }
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors ${
                        activeCard.invertElementCapsule
                          ? 'bg-emerald-950/60 border-emerald-500/70 text-emerald-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400'
                      }`}
                    >
                      Elemento Cor
                    </button>
                  </div>

                  {/* RETRACTED / COLLAPSED ACCORDION FOR FINE CONTOUR & SHINE SLIDERS (Locked at 2px & 100% by default!) */}
                  <details className="group pt-1 border-t border-slate-800/80">
                    <summary className="list-none cursor-pointer flex items-center justify-between text-[11px] font-medium text-slate-400 hover:text-slate-200 py-1">
                      <span className="flex items-center gap-1.5">
                        <Sliders className="w-3 h-3 text-slate-500" />
                        <span>
                          Traçado & Brilhos (Padrão: {activeCard.strokeWidth}px · 100%)
                        </span>
                      </span>
                      <span className="text-[10px] text-slate-500 group-open:rotate-180 transition-transform">
                        ▼
                      </span>
                    </summary>

                    <div className="pt-3 space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Traçado do Contorno</span>
                          <span className="font-mono tabular-nums text-white">
                            {activeCard.strokeWidth}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="8"
                          step="0.5"
                          value={activeCard.strokeWidth}
                          onChange={(e) =>
                            updateActiveCard((prev) => ({
                              ...prev,
                              strokeWidth: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Brilho de Contorno</span>
                          <span className="font-mono tabular-nums text-white">
                            {activeCard.strokeGlow}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={activeCard.strokeGlow}
                          onChange={(e) =>
                            updateActiveCard((prev) => ({
                              ...prev,
                              strokeGlow: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Reflexo Prismático</span>
                          <span className="font-mono tabular-nums text-white">
                            {activeCard.prismaticIntensity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={activeCard.prismaticIntensity}
                          onChange={(e) =>
                            updateActiveCard((prev) => ({
                              ...prev,
                              prismaticIntensity: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Micro-Glitter de Borda</span>
                          <span className="font-mono tabular-nums text-white">
                            {activeCard.microGlitterIntensity}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={activeCard.microGlitterIntensity}
                          onChange={(e) =>
                            updateActiveCard((prev) => ({
                              ...prev,
                              microGlitterIntensity: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Parallax 3D</span>
                          <span className="font-mono tabular-nums text-white">
                            {activeCard.parallaxDepth}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={activeCard.parallaxDepth}
                          onChange={(e) =>
                            updateActiveCard((prev) => ({
                              ...prev,
                              parallaxDepth: parseInt(e.target.value, 10),
                            }))
                          }
                          className="w-full accent-emerald-500"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span className="text-slate-400">Ciclo de Key Lights</span>
                          <span className="font-mono tabular-nums text-white">
                            {Math.round(
                              ((10 - Math.min(10, Math.max(1.8, activeCard.contourLightSpeed))) /
                                8.2) *
                                100
                            )}
                            %
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1.8"
                          max="8"
                          step="0.2"
                          value={activeCard.contourLightSpeed}
                          onChange={(e) =>
                            updateActiveCard((prev) => ({
                              ...prev,
                              contourLightSpeed: parseFloat(e.target.value),
                            }))
                          }
                          className="w-full accent-emerald-500"
                        />
                      </div>
                    </div>
                  </details>
                </div>

                {/* 3. Adaptive Frame Colors */}
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Palette className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Cor do Frame & Contorno</span>
                    </span>
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeCard.autoAdaptColors}
                        onChange={(e) =>
                          updateActiveCard((prev) => ({
                            ...prev,
                            autoAdaptColors: e.target.checked,
                          }))
                        }
                      />
                      <span>Auto-Destaque</span>
                    </label>
                  </div>

                  {/* Extracted Swatches */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {activeCard.extractedSwatches.map((pal) => (
                      <button
                        key={pal.id}
                        onClick={() => applyPaletteToCard(pal)}
                        className="p-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-600 flex flex-col items-center gap-1 transition-colors"
                        title={pal.name}
                      >
                        <div className="w-full h-4 rounded overflow-hidden flex">
                          <span
                            className="flex-1 h-full"
                            style={{ backgroundColor: pal.frameTopColor }}
                          />
                          <span
                            className="w-2.5 h-full"
                            style={{ backgroundColor: pal.strokeColor }}
                          />
                        </div>
                        <span className="text-[9px] text-slate-400 truncate w-full text-center">
                          {pal.name.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Quick Color Pickers */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
                      <span className="text-[11px] text-slate-400">Contorno</span>
                      <input
                        type="color"
                        value={activeCard.strokeColor}
                        onChange={(e) =>
                          updateActiveCard((prev) => ({
                            ...prev,
                            strokeColor: e.target.value,
                          }))
                        }
                        className="w-6 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                    <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5">
                      <span className="text-[11px] text-slate-400">Frame Topo</span>
                      <input
                        type="color"
                        value={activeCard.frameTopColor}
                        onChange={(e) =>
                          updateActiveCard((prev) => ({
                            ...prev,
                            frameTopColor: e.target.value,
                          }))
                        }
                        className="w-6 h-5 rounded cursor-pointer bg-transparent border-0"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Procedural Full-Art VFX Selector */}
                <VfxSelectorPanel
                  card={activeCard}
                  onUpdateCard={updateActiveCard}
                  onTriggerShowcaseWithVfx={handleTriggerShowcaseWithVfx}
                />
              </>
            )}

            {activeTab === 'header-sides' && (
              <HeaderSidesTab
                activeCard={activeCard}
                updateActiveCard={updateActiveCard}
              />
            )}

            {activeTab === 'lore-magic' && (
              <LoreMagicTab
                activeCard={activeCard}
                updateActiveCard={updateActiveCard}
              />
            )}

            {activeTab === 'bottom-stats' && (
              <BottomStatsTab
                activeCard={activeCard}
                updateActiveCard={updateActiveCard}
                handleUpdatePill={handleUpdatePill}
              />
            )}
          </div>
        </aside>
      </div>

      {/* =====================================================================
          REUSABLE CONTEXTUAL CARD INFO POPOVER (Long-Press Mobile / Click Desktop)
         ===================================================================== */}
      <CardInfoPopover
        card={inspectedCard}
        onClose={() => setInspectedCard(null)}
        onLoadIntoEditor={(card) => {
          setActiveCardId(card.id);
          setIsFlipped(false);
        }}
      />

      {/* =====================================================================
          CENTRAL WORLDS OF SLIMELANDS PROCEDURAL ECOSYSTEM MODAL
         ===================================================================== */}
      <ProceduralEcosystemModal
        isOpen={ecosystemModalOpen}
        initialSection={ecosystemModalSection}
        onClose={() => setEcosystemModalOpen(false)}
        matrixCards={cards}
        playerInventory={playerInventory}
        onUpdatePlayerInventory={(nextInv) => {
          const resolved =
            typeof nextInv === 'function' ? nextInv(playerInventory) : nextInv;
          setPlayerInventory(resolved);
          // Sync newly obtained cards into Matrix gallery & game store_owned so Deck/Store/Battle have them
          setCards((prevCards) => {
            const existingIds = new Set(prevCards.map((c) => c.id));
            const existingTitles = new Set(
              prevCards.map((c) => (c.title || '').trim().toLowerCase())
            );
            const brandNew = resolved.filter(
              (c) =>
                !existingIds.has(c.id) &&
                !existingTitles.has((c.title || '').trim().toLowerCase())
            );
            if (brandNew.length === 0) return prevCards;
            const withBack = brandNew.map((c) => ({
              ...c,
              backImageUrl: c.backImageUrl || globalBackImageUrl || null,
            }));
            syncCardsIntoGameMatrixCharacters(withBack);
            try {
              const rawOwned = localStorage.getItem('store_owned');
              const owned = rawOwned
                ? JSON.parse(rawOwned)
                : { cards: [], decks: [], artifacts: [] };
              if (!Array.isArray(owned.cards)) owned.cards = [];
              withBack.forEach((c) => {
                if (c.title && !owned.cards.includes(c.title)) {
                  owned.cards.push(c.title);
                }
              });
              localStorage.setItem('store_owned', JSON.stringify(owned));
            } catch (_) {}
            return [...withBack, ...prevCards];
          });
        }}
        playerCoins={playerCoins}
        onUpdatePlayerCoins={setPlayerCoins}
        boosterStock={boosterStock}
        onUpdateBoosterStock={setBoosterStock}
        boosterHistory={boosterHistory}
        onUpdateBoosterHistory={setBoosterHistory}
        baseCharacters={baseCharacters}
        onUpdateBaseCharacters={setBaseCharacters}
        balanceTables={balanceTables}
        onUpdateBalanceTables={setBalanceTables}
        boosterModels={boosterModels}
        onUpdateBoosterModels={setBoosterModels}
        decks={decks}
        subgroupCatalog={subgroupCatalog}
        onUpdateSubgroupCatalog={setSubgroupCatalog}
        onInspectCard={(card) => setInspectedCard(card)}
        onSelectCardForStudio={(cardId) => {
          setActiveCardId(cardId);
          setIsFlipped(false);
        }}
      />
    </div>
  );
}
