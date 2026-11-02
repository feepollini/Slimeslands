import '../vfx_theme.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart2,
  Check,
  CheckSquare,
  ChevronDown,
  Copy,
  Download,
  FileSpreadsheet,
  FolderPlus,
  Heart,
  KeyRound,
  Layers,
  Loader2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  Upload,
  Volume2,
  Wand2,
  X,
} from 'lucide-react';
import {
  AGENT_CSV_AND_TAGS_SPECIFICATION,
  applyFavoriteCategoryToVoices,
  autoInsertFishAudioTags,
  buildContinuousTaggedScriptFromCsvRows,
  buildContinuousTaggedScriptFromText,
  convertTextTagsSyntax,
  fetchFishAudioPortugueseVoices,
  fetchFishVoiceByIdToFavorites,
  FISH_AUDIO_EXPRESSION_TAGS,
  FISH_AUDIO_MODELS,
  FishAudioModelId,
  FishCsvBatchRow,
  FishGeneratedAudioItem,
  FishGenerationProgressInfo,
  FishPortugueseVoice,
  formatFishCountK,
  formatFishTag,
  generateFishAudioClip,
  loadFishAudioGallery,
  loadLocalFavoriteVoiceIds,
  loadRecentVoiceIds,
  loadSavedFishApiKey,
  loadVoiceCollectionAssignments,
  loadVoiceCollections,
  parseFishBatchCsv,
  parseImportedFishConfigFile,
  PORTUGUESE_FISH_VOICES,
  pushRecentVoiceId,
  SAMPLE_CSV_TEMPLATE_CONTENT,
  saveFishApiKeyConfig,
  saveFishAudioGallery,
  saveLocalFavoriteVoiceIds,
  saveVoiceCollectionAssignments,
  saveVoiceCollections,
  speakPortugueseWithExpressionsPreview,
  stripFishAudioTags,
} from '../extra_modules/FishAudioStudio';

interface FishAudioAppProps {
  onSwitchToArena: () => void;
}

type MainScreenId = 'studio' | 'voices' | 'gallery' | 'api_config';
type StudioSubScreenId = 'single' | 'csv_batch' | 'agent_template';
type VoiceSelectorTabId = 'recent' | 'explore' | 'default' | 'self' | 'favorites' | string;
type TagCategoryTab = 'tone' | 'pause' | 'emotion' | 'vocal' | 'all';

const FILTER_VOICE_TAGS = [
  'TODAS',
  'Masculino',
  'Feminino',
  'Jovem',
  'Meia Idade',
  'Idoso',
  'Narrador',
  'Calma',
  'Animada',
  'Grave',
  'Personagem',
];

export const FishAudioApp: React.FC<FishAudioAppProps> = ({ onSwitchToArena }) => {
  // Navigation: Screens & Sub-Screens
  const [activeScreen, setActiveScreen] = useState<MainScreenId>('studio');
  const [studioSubScreen, setStudioSubScreen] = useState<StudioSubScreenId>('single');
  const [tagCategoryTab, setTagCategoryTab] = useState<TagCategoryTab>('tone');

  // Official Fish Audio "Selecionar voz" Modal & Tab State
  const [isVoicePickerModalOpen, setIsVoicePickerModalOpen] = useState<boolean>(false);
  const [voiceSelectorTab, setVoiceSelectorTab] = useState<VoiceSelectorTabId>('explore');
  const [voiceLanguageFilter, setVoiceLanguageFilter] = useState<string>('pt');
  const [voiceSortBy, setVoiceSortBy] = useState<'task_count' | 'score' | 'like_count'>('task_count');
  const [showAdvancedVoiceFilters, setShowAdvancedVoiceFilters] = useState<boolean>(false);

  // Custom Voice Collections ("+ Criar coleção de voz")
  const [voiceCollections, setVoiceCollections] = useState<string[]>(() => loadVoiceCollections());
  const [voiceCollectionMap, setVoiceCollectionMap] = useState<Record<string, string>>(() =>
    loadVoiceCollectionAssignments()
  );
  const [isCreatingCollection, setIsCreatingCollection] = useState<boolean>(false);
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [recentVoiceIds, setRecentVoiceIds] = useState<string[]>(() => loadRecentVoiceIds());

  // 1. API Configuration State
  const [apiKeyInput, setApiKeyInput] = useState<string>(() => loadSavedFishApiKey());
  const [apiKeySavedStatus, setApiKeySavedStatus] = useState<string>(
    'Chave API ativa e pronta (modelo padrão: s2.1-pro-free)'
  );
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(false);
  const [voicesLoadMessage, setVoicesLoadMessage] = useState<string>('');
  const configFileInputRef = useRef<HTMLInputElement | null>(null);
  const didAutoLoadRef = useRef<boolean>(false);

  // 2. Voices & Favorites State
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => loadLocalFavoriteVoiceIds());
  const [voices, setVoices] = useState<FishPortugueseVoice[]>(() =>
    applyFavoriteCategoryToVoices(PORTUGUESE_FISH_VOICES, loadLocalFavoriteVoiceIds())
  );
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>(PORTUGUESE_FISH_VOICES[0].id);
  const [customReferenceId] = useState<string>('');
  const [addFavIdInput, setAddFavIdInput] = useState<string>('');
  const [isAddingFavById, setIsAddingFavById] = useState<boolean>(false);
  const [selectedModelId, setSelectedModelId] = useState<FishAudioModelId>('s2.1-pro-free');
  const [speed, setSpeed] = useState<number>(1.0);

  const [voiceTagFilter, setVoiceTagFilter] = useState<string>('TODAS');
  const [groupVoicesByCategory, setGroupVoicesByCategory] = useState<boolean>(false);
  const [voiceSearchQuery, setVoiceSearchQuery] = useState<string>('');
  const [playingSampleVoiceId, setPlayingSampleVoiceId] = useState<string | null>(null);
  const [failedCoverIds, setFailedCoverIds] = useState<Record<string, boolean>>({});
  const sampleAudioRef = useRef<HTMLAudioElement | null>(null);

  // 3. Studio Single Generation State — Starts EMPTY so no tokens are ever wasted
  const [text, setText] = useState<string>('');
  const [customItemCategory, setCustomItemCategory] = useState<string>('');
  const [customItemTagInput, setCustomItemTagInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [latestGeneratedItem, setLatestGeneratedItem] = useState<FishGeneratedAudioItem | null>(
    null
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // 4. Studio CSV Batch & Continuous Generation State — Starts EMPTY until user imports CSV or pastes rows
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [autoTagCsvMissing, setAutoTagCsvMissing] = useState<boolean>(false);
  const [continuousPauseBetweenPhrases, setContinuousPauseBetweenPhrases] = useState<boolean>(true);
  const [batchCategoryName, setBatchCategoryName] = useState<string>('Lote CSV');
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [isContinuousGenerating, setIsContinuousGenerating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0,
  });
  // Real-time Loading Progress State (works for Single Audio, Continuous Audio, Split Phrases & CSV Batch)
  const [liveProgress, setLiveProgress] = useState<{
    active: boolean;
    modeType: 'single' | 'continuous' | 'parts';
    modeTitle: string;
    currentPart: number;
    totalParts: number;
    partLabel: string;
    clipPercent: number;
    overallPercent: number;
    phaseLabel: string;
    receivedBytes: number;
    startedAt: number;
    elapsedSec: number;
    textSnippet: string;
  }>({
    active: false,
    modeType: 'single',
    modeTitle: '',
    currentPart: 1,
    totalParts: 1,
    partLabel: '',
    clipPercent: 0,
    overallPercent: 0,
    phaseLabel: '',
    receivedBytes: 0,
    startedAt: 0,
    elapsedSec: 0,
    textSnippet: '',
  });
  const [copiedAgentSpec, setCopiedAgentSpec] = useState<boolean>(false);
  const csvFileInputRef = useRef<HTMLInputElement | null>(null);

  // 5. Gallery & Studio Session Mirror State
  const [gallery, setGallery] = useState<FishGeneratedAudioItem[]>(() => loadFishAudioGallery());
  const [sessionGeneratedIds, setSessionGeneratedIds] = useState<string[]>([]);
  const [studioMirrorScope, setStudioMirrorScope] = useState<'session' | 'all'>('session');
  const [playingItemId, setPlayingItemId] = useState<string | null>(null);
  const [galleryGroupBy, setGalleryGroupBy] = useState<'none' | 'category' | 'tag' | 'voice'>(
    'none'
  );
  const [galleryCategoryFilter, setGalleryCategoryFilter] = useState<string>('TODAS');
  const [galleryTagFilter, setGalleryTagFilter] = useState<string>('TODAS');
  const [selectedGalleryIds, setSelectedGalleryIds] = useState<string[]>([]);
  const [bulkCategoryAssign, setBulkCategoryAssign] = useState<string>('');
  const [bulkTagAssign, setBulkTagAssign] = useState<string>('');
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    saveFishAudioGallery(gallery);
  }, [gallery]);

  useEffect(() => {
    if (!liveProgress.active || !liveProgress.startedAt) return;
    const interval = setInterval(() => {
      setLiveProgress((prev) => {
        if (!prev.active) return prev;
        return {
          ...prev,
          elapsedSec: Number(((Date.now() - prev.startedAt) / 1000).toFixed(1)),
        };
      });
    }, 100);
    return () => clearInterval(interval);
  }, [liveProgress.active, liveProgress.startedAt]);

  useEffect(() => {
    return () => {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.pause();
      }
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
      }
    };
  }, []);

  const handleLoadPortugueseVoices = async (
    langOverride?: string,
    sortOverride?: 'task_count' | 'score' | 'like_count',
    searchOverride?: string
  ) => {
    const activeSearch = searchOverride !== undefined ? searchOverride : voiceSearchQuery;
    setIsLoadingVoices(true);
    setVoicesLoadMessage(
      activeSearch.trim()
        ? `Pesquisando "${activeSearch.trim()}" na Fish Audio API...`
        : 'Sincronizando vozes da comunidade e Favoritas da Fish Audio...'
    );
    try {
      if (apiKeyInput.trim()) {
        await saveFishApiKeyConfig(apiKeyInput.trim());
      }
      const res = await fetchFishAudioPortugueseVoices(
        apiKeyInput.trim(),
        activeSearch.trim(),
        langOverride ?? voiceLanguageFilter,
        sortOverride ?? voiceSortBy
      );
      setVoices(res.voices);
      if (res.voices.length > 0 && !activeSearch.trim()) {
        const currentExists = res.voices.some((v) => v.id === selectedVoiceId);
        if (!currentExists || selectedVoiceId.startsWith('pt-br-')) {
          setSelectedVoiceId(res.voices[0].id);
        }
      }
      if (res.liveApiAvailable) {
        setVoicesLoadMessage(
          activeSearch.trim()
            ? `${res.liveLoadedCount} vozes encontradas para "${activeSearch.trim()}".`
            : `${res.favoritesCount} vozes Favoritas da conta e ${res.liveLoadedCount} vozes carregadas da Fish Audio.`
        );
      } else if (res.errorMsg) {
        setVoicesLoadMessage(res.errorMsg);
      } else {
        setVoicesLoadMessage(`${res.voices.length} vozes carregadas.`);
      }
    } finally {
      setIsLoadingVoices(false);
    }
  };

  useEffect(() => {
    if (!didAutoLoadRef.current) {
      didAutoLoadRef.current = true;
      handleLoadPortugueseVoices('pt', 'task_count', '');
      return;
    }
    const timer = setTimeout(() => {
      handleLoadPortugueseVoices(voiceLanguageFilter, voiceSortBy, voiceSearchQuery);
    }, 320);
    return () => clearTimeout(timer);
  }, [voiceSearchQuery]);

  const selectedVoice = useMemo(
    () => voices.find((v) => v.id === selectedVoiceId) || voices[0] || PORTUGUESE_FISH_VOICES[0],
    [voices, selectedVoiceId]
  );

  const selectedModel = useMemo(
    () => FISH_AUDIO_MODELS.find((m) => m.id === selectedModelId) || FISH_AUDIO_MODELS[0],
    [selectedModelId]
  );

  const favoriteVoicesList = useMemo(
    () =>
      voices.filter(
        (v) =>
          v.category === 'Favoritas' ||
          v.isFavorite ||
          v.liked ||
          v.isMarked ||
          favoriteIds.includes(v.id) ||
          favoriteIds.includes(v.referenceId)
      ),
    [voices, favoriteIds]
  );

  // Filter voices according to the active Fish Audio Selector Tab:
  // 'recent' | 'explore' | 'default' | 'self' | 'favorites' | custom collection name
  const filteredVoices = useMemo(() => {
    let sourceList: FishPortugueseVoice[] = voices;

    if (voiceSelectorTab === 'recent') {
      const byRefOrId = new Map<string, FishPortugueseVoice>();
      voices.forEach((v) => {
        byRefOrId.set(v.id, v);
        byRefOrId.set(v.referenceId, v);
      });
      sourceList = recentVoiceIds
        .map((id) => byRefOrId.get(id))
        .filter((v): v is FishPortugueseVoice => Boolean(v));
    } else if (voiceSelectorTab === 'explore') {
      sourceList = voices.filter((v) => !v.isDefaultVoice);
      if (sourceList.length === 0) sourceList = voices;
    } else if (voiceSelectorTab === 'default') {
      sourceList = voices.filter((v) => v.isDefaultVoice);
    } else if (voiceSelectorTab === 'self') {
      sourceList = voices.filter(
        (v) => v.isSelf || v.isFavorite || favoriteIds.includes(v.id) || favoriteIds.includes(v.referenceId)
      );
    } else if (voiceSelectorTab === 'favorites') {
      sourceList = favoriteVoicesList;
    } else {
      // Custom collection tab
      sourceList = voices.filter(
        (v) =>
          voiceCollectionMap[v.referenceId] === voiceSelectorTab ||
          voiceCollectionMap[v.id] === voiceSelectorTab ||
          v.category === voiceSelectorTab
      );
    }

    const filtered = sourceList.filter((v) => {
      if (voiceTagFilter !== 'TODAS') {
        const matchTag =
          (v.tags || []).includes(voiceTagFilter) ||
          v.genderLabel === voiceTagFilter ||
          v.ageLabel === voiceTagFilter;
        if (!matchTag) return false;
      }
      if (voiceSearchQuery.trim()) {
        const terms = voiceSearchQuery
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .split(/\s+/)
          .filter(Boolean);
        const haystack = `${v.name} ${v.authorName || ''} ${v.description || ''}`
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        const matchesAllTerms = terms.every((term) => haystack.includes(term));
        // Keep items that match all search terms OR were returned directly by the live API search for Explore
        if (!matchesAllTerms && v.isDefaultVoice) return false;
        if (!matchesAllTerms && voiceSelectorTab !== 'explore') return false;
      }
      return true;
    });

    if (voiceSelectorTab === 'recent') {
      return filtered;
    }

    // Apply client-side sort matching the dropdown ('task_count' | 'like_count' | 'score')
    return [...filtered].sort((a, b) => {
      if (voiceSortBy === 'like_count') {
        return (b.likeCount || 0) - (a.likeCount || 0);
      }
      if (voiceSortBy === 'task_count') {
        return (b.taskCount || 0) - (a.taskCount || 0);
      }
      return 0;
    });
  }, [
    voices,
    favoriteVoicesList,
    voiceSelectorTab,
    recentVoiceIds,
    favoriteIds,
    voiceCollectionMap,
    voiceTagFilter,
    voiceSearchQuery,
    voiceSortBy,
  ]);

  const groupedVoices = useMemo(() => {
    if (!groupVoicesByCategory) {
      return { 'Todas as Vozes': filteredVoices };
    }
    const groups: Record<string, FishPortugueseVoice[]> = {};
    for (const v of filteredVoices) {
      const col =
        voiceCollectionMap[v.referenceId] ||
        voiceCollectionMap[v.id] ||
        (v.isFavorite ? 'Marcado como favorito' : v.isDefaultVoice ? 'Vozes Padrão' : 'Explorar PT');
      if (!groups[col]) groups[col] = [];
      groups[col].push(v);
    }
    return groups;
  }, [filteredVoices, groupVoicesByCategory, voiceCollectionMap]);

  const visibleExpressionTags = useMemo(() => {
    if (tagCategoryTab === 'all') return FISH_AUDIO_EXPRESSION_TAGS;
    return FISH_AUDIO_EXPRESSION_TAGS.filter((t) => t.category === tagCategoryTab);
  }, [tagCategoryTab]);

  const parsedCsvRows = useMemo<FishCsvBatchRow[]>(
    () => parseFishBatchCsv(csvRawText, autoTagCsvMissing, selectedModel.tagSyntax),
    [csvRawText, autoTagCsvMissing, selectedModel.tagSyntax]
  );

  // Gallery Categories & Tags
  const allGalleryCategories = useMemo(() => {
    const set = new Set<string>();
    gallery.forEach((item) => {
      set.add(item.category || 'Geral');
    });
    return ['TODAS', ...Array.from(set)];
  }, [gallery]);

  const allGalleryTags = useMemo(() => {
    const set = new Set<string>();
    gallery.forEach((item) => {
      item.tagsUsed.forEach((t) => set.add(t));
      (item.customTags || []).forEach((t) => set.add(t));
    });
    return ['TODAS', ...Array.from(set)];
  }, [gallery]);

  const filteredGallery = useMemo(() => {
    return gallery.filter((item) => {
      const cat = item.category || 'Geral';
      if (galleryCategoryFilter !== 'TODAS' && cat !== galleryCategoryFilter) return false;
      if (galleryTagFilter !== 'TODAS') {
        const hasExpTag = item.tagsUsed.includes(galleryTagFilter);
        const hasCustomTag = (item.customTags || []).includes(galleryTagFilter);
        if (!hasExpTag && !hasCustomTag) return false;
      }
      return true;
    });
  }, [gallery, galleryCategoryFilter, galleryTagFilter]);

  const groupedGallery = useMemo(() => {
    if (galleryGroupBy === 'none') {
      return { 'Todos os Áudios': filteredGallery };
    }
    const map: Record<string, FishGeneratedAudioItem[]> = {};
    for (const item of filteredGallery) {
      if (galleryGroupBy === 'category') {
        const key = item.category || 'Geral';
        if (!map[key]) map[key] = [];
        map[key].push(item);
      } else if (galleryGroupBy === 'voice') {
        const key = item.voiceName || 'Voz Padrão';
        if (!map[key]) map[key] = [];
        map[key].push(item);
      } else if (galleryGroupBy === 'tag') {
        const allTags = [...item.tagsUsed, ...(item.customTags || [])];
        const primary = allTags[0] || 'Sem Tag';
        if (!map[primary]) map[primary] = [];
        map[primary].push(item);
      }
    }
    return map;
  }, [filteredGallery, galleryGroupBy]);

  const sessionGalleryItems = useMemo(
    () => gallery.filter((item) => sessionGeneratedIds.includes(item.id)),
    [gallery, sessionGeneratedIds]
  );

  const studioMirrorBaseItems = useMemo(
    () => (studioMirrorScope === 'session' ? sessionGalleryItems : gallery),
    [studioMirrorScope, sessionGalleryItems, gallery]
  );

  const filteredStudioMirror = useMemo(() => {
    return studioMirrorBaseItems.filter((item) => {
      const cat = item.category || 'Geral';
      if (galleryCategoryFilter !== 'TODAS' && cat !== galleryCategoryFilter) return false;
      if (galleryTagFilter !== 'TODAS') {
        const hasExpTag = item.tagsUsed.includes(galleryTagFilter);
        const hasCustomTag = (item.customTags || []).includes(galleryTagFilter);
        if (!hasExpTag && !hasCustomTag) return false;
      }
      return true;
    });
  }, [studioMirrorBaseItems, galleryCategoryFilter, galleryTagFilter]);

  const groupedStudioMirror = useMemo(() => {
    if (galleryGroupBy === 'none') {
      return {
        [studioMirrorScope === 'session'
          ? 'Gerações Desta Sessão'
          : 'Todos os Áudios da Galeria']: filteredStudioMirror,
      };
    }
    const map: Record<string, FishGeneratedAudioItem[]> = {};
    for (const item of filteredStudioMirror) {
      if (galleryGroupBy === 'category') {
        const key = item.category || 'Geral';
        if (!map[key]) map[key] = [];
        map[key].push(item);
      } else if (galleryGroupBy === 'voice') {
        const key = item.voiceName || 'Voz Padrão';
        if (!map[key]) map[key] = [];
        map[key].push(item);
      } else if (galleryGroupBy === 'tag') {
        const allTags = [...item.tagsUsed, ...(item.customTags || [])];
        const primary = allTags[0] || 'Sem Tag';
        if (!map[primary]) map[primary] = [];
        map[primary].push(item);
      }
    }
    return map;
  }, [filteredStudioMirror, galleryGroupBy, studioMirrorScope]);

  // --- Handlers ---
  const handleSelectVoice = (voice: FishPortugueseVoice, closeModalIfOpen = true) => {
    setSelectedVoiceId(voice.id);
    const updatedRecents = pushRecentVoiceId(voice.referenceId || voice.id);
    setRecentVoiceIds(updatedRecents);
    if (closeModalIfOpen) {
      setIsVoicePickerModalOpen(false);
    }
  };

  const handlePlayVoiceSample = (e: React.MouseEvent, voice: FishPortugueseVoice) => {
    e.stopPropagation();
    if (playingSampleVoiceId === voice.id) {
      if (sampleAudioRef.current) {
        sampleAudioRef.current.pause();
      }
      setPlayingSampleVoiceId(null);
      return;
    }

    if (sampleAudioRef.current) {
      sampleAudioRef.current.pause();
    }

    if (voice.sampleAudioUrl) {
      const audio = new Audio(voice.sampleAudioUrl);
      sampleAudioRef.current = audio;
      setPlayingSampleVoiceId(voice.id);
      audio.onended = () => setPlayingSampleVoiceId(null);
      audio.onerror = () => {
        setPlayingSampleVoiceId(null);
        speakPortugueseWithExpressionsPreview(
          'Olá, esta é uma prévia da minha voz.',
          voice,
          speed
        );
      };
      audio.play().catch(() => {
        setPlayingSampleVoiceId(null);
        speakPortugueseWithExpressionsPreview(
          'Olá, esta é uma prévia da minha voz.',
          voice,
          speed
        );
      });
    } else {
      setPlayingSampleVoiceId(voice.id);
      speakPortugueseWithExpressionsPreview(
        'Olá, esta é uma prévia da minha voz.',
        voice,
        speed
      );
      setTimeout(() => setPlayingSampleVoiceId(null), 2600);
    }
  };

  const handleToggleFavoriteVoice = (e: React.MouseEvent, voice: FishPortugueseVoice) => {
    e.stopPropagation();
    const isCurrentlyFav =
      favoriteIds.includes(voice.id) ||
      favoriteIds.includes(voice.referenceId) ||
      voice.isFavorite ||
      voice.liked ||
      voice.category === 'Favoritas';

    let nextFavs: string[];
    if (isCurrentlyFav) {
      nextFavs = favoriteIds.filter((id) => id !== voice.id && id !== voice.referenceId);
    } else {
      nextFavs = Array.from(new Set([...favoriteIds, voice.id, voice.referenceId]));
    }
    setFavoriteIds(nextFavs);
    saveLocalFavoriteVoiceIds(nextFavs);

    setVoices((prev) =>
      prev.map((v) => {
        if (v.id !== voice.id) return v;
        if (isCurrentlyFav) {
          return {
            ...v,
            isFavorite: false,
            liked: false,
            likeCount: Math.max(0, (v.likeCount || 1) - 1),
            category: v.category === 'Favoritas' ? 'Explorar PT' : v.category,
            tags: (v.tags || []).filter((t) => t !== 'Favorita'),
          };
        }
        return {
          ...v,
          isFavorite: true,
          liked: true,
          likeCount: (v.likeCount || 0) + 1,
          category: 'Favoritas',
          tags: Array.from(new Set(['Favorita', ...(v.tags || [])])),
        };
      })
    );
  };

  const handleCreateVoiceCollection = () => {
    const clean = newCollectionName.trim();
    if (!clean) return;
    const next = Array.from(new Set([...voiceCollections, clean]));
    setVoiceCollections(next);
    saveVoiceCollections(next);
    setNewCollectionName('');
    setIsCreatingCollection(false);
    setVoiceSelectorTab(clean);
  };

  const handleAssignVoiceToCollection = (
    e: React.ChangeEvent<HTMLSelectElement>,
    voice: FishPortugueseVoice
  ) => {
    e.stopPropagation();
    const col = e.target.value;
    const nextMap = { ...voiceCollectionMap };
    if (!col) {
      delete nextMap[voice.referenceId];
      delete nextMap[voice.id];
    } else {
      nextMap[voice.referenceId] = col;
      nextMap[voice.id] = col;
    }
    setVoiceCollectionMap(nextMap);
    saveVoiceCollectionAssignments(nextMap);
  };

  const handleAddVoiceByIdToFavorites = async () => {
    if (!addFavIdInput.trim() || isAddingFavById) return;
    setIsAddingFavById(true);
    try {
      const voice = await fetchFishVoiceByIdToFavorites(addFavIdInput, apiKeyInput);
      if (voice) {
        const nextFavs = Array.from(new Set([...favoriteIds, voice.id, voice.referenceId]));
        setFavoriteIds(nextFavs);
        saveLocalFavoriteVoiceIds(nextFavs);
        setVoices((prev) => [
          voice,
          ...prev.filter((v) => v.referenceId !== voice.referenceId),
        ]);
        setSelectedVoiceId(voice.id);
        setAddFavIdInput('');
      }
    } finally {
      setIsAddingFavById(false);
    }
  };

  const handleImportConfigFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const content = String(reader.result || '');
      const extracted = parseImportedFishConfigFile(content);
      if (extracted) {
        setApiKeyInput(extracted);
        await saveFishApiKeyConfig(extracted);
        setApiKeySavedStatus('Arquivo importado e chave salva com sucesso.');
      } else {
        setApiKeySavedStatus('Nenhuma chave válida encontrada no arquivo.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleSaveApiConfig = async () => {
    await saveFishApiKeyConfig(apiKeyInput);
    setApiKeySavedStatus('Chave API salva no servidor. Agora clique no Passo 3 para sincronizar.');
  };

  /**
   * Inserts ONLY the tag string (e.g. "[in a hurry tone]") at cursor position — NEVER adds any sample sentence!
   */
  const handleInsertTagOnly = (rawKey: string) => {
    const formatted = formatFishTag(rawKey, selectedModel.tagSyntax);
    const el = textareaRef.current;
    if (!el) {
      setText((prev) => (prev ? `${prev} ${formatted} ` : `${formatted} `));
      return;
    }
    const start = el.selectionStart ?? text.length;
    const end = el.selectionEnd ?? text.length;
    const before = text.slice(0, start);
    const after = text.slice(end);
    const needSpaceBefore = before.length > 0 && !before.endsWith(' ') && !before.endsWith('\n');
    const needSpaceAfter = after.length === 0 || (!after.startsWith(' ') && !after.startsWith('\n'));
    const inserted = `${needSpaceBefore ? ' ' : ''}${formatted}${needSpaceAfter ? ' ' : ''}`;
    const updated = before + inserted + after;
    setText(updated);
    setTimeout(() => {
      el.focus();
      const pos = start + inserted.length;
      el.setSelectionRange(pos, pos);
    }, 10);
  };

  const handleAutoInsertTags = () => {
    if (!text.trim()) return;
    setText(autoInsertFishAudioTags(text, selectedModel.tagSyntax));
  };

  const playGalleryItem = (item: FishGeneratedAudioItem) => {
    if (playingItemId === item.id && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setPlayingItemId(null);
      return;
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    const audio = new Audio(item.audioDataUrl);
    audioPlayerRef.current = audio;
    setPlayingItemId(item.id);
    audio.onended = () => setPlayingItemId(null);
    audio.onerror = () => setPlayingItemId(null);
    audio.play().catch(() => setPlayingItemId(null));
  };

  const startLiveProgressSession = (
    modeType: 'single' | 'continuous' | 'parts',
    modeTitle: string,
    totalParts: number,
    partLabel: string,
    textSnippet: string
  ) => {
    const now = Date.now();
    setLiveProgress({
      active: true,
      modeType,
      modeTitle,
      currentPart: 1,
      totalParts: Math.max(1, totalParts),
      partLabel,
      clipPercent: 4,
      overallPercent: Math.round(4 / Math.max(1, totalParts)),
      phaseLabel: 'Iniciando síntese neural em tempo real...',
      receivedBytes: 0,
      startedAt: now,
      elapsedSec: 0,
      textSnippet: textSnippet.slice(0, 140),
    });
  };

  const updateLiveProgressFromClip = (
    partIndexZeroBased: number,
    totalParts: number,
    partLabel: string,
    textSnippet: string,
    info: FishGenerationProgressInfo
  ) => {
    const safeTotal = Math.max(1, totalParts);
    const overall = Math.min(
      100,
      Math.max(1, Math.round(((partIndexZeroBased * 100 + info.percent) / (safeTotal * 100)) * 100))
    );
    setLiveProgress((prev) => ({
      ...prev,
      currentPart: partIndexZeroBased + 1,
      totalParts: safeTotal,
      partLabel,
      clipPercent: info.percent,
      overallPercent: overall,
      phaseLabel: info.phaseLabel,
      receivedBytes: info.receivedBytes,
      elapsedSec: Number(((Date.now() - (prev.startedAt || Date.now())) / 1000).toFixed(1)),
      textSnippet: textSnippet.slice(0, 140),
    }));
  };

  const finishLiveProgressSession = () => {
    setLiveProgress((prev) => ({
      ...prev,
      clipPercent: 100,
      overallPercent: 100,
      phaseLabel: 'Concluído!',
    }));
    setTimeout(() => {
      setLiveProgress((prev) => ({ ...prev, active: false }));
    }, 450);
  };

  const handleGenerateSingleAudio = async () => {
    if (!text.trim() || isGenerating || isContinuousGenerating || isBatchGenerating) return;
    const cleanText = text.trim();
    setIsGenerating(true);
    startLiveProgressSession(
      'single',
      'Áudio Único (Fala Direta)',
      1,
      'Áudio Único (1/1)',
      cleanText
    );
    try {
      const parsedCustomTags = customItemTagInput
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const mergedTags = Array.from(new Set([...(selectedVoice.tags || []), ...parsedCustomTags]));

      const item = await generateFishAudioClip({
        taggedText: cleanText,
        voice: selectedVoice,
        customReferenceId,
        modelId: selectedModelId,
        speed,
        apiKey: apiKeyInput,
        category: customItemCategory.trim() || selectedVoice.category,
        customTags: mergedTags,
        onProgress: (info) =>
          updateLiveProgressFromClip(0, 1, 'Áudio Único (1/1)', cleanText, info),
      });

      setLatestGeneratedItem(item);
      setSessionGeneratedIds((prev) => [item.id, ...prev]);
      setStudioMirrorScope('session');
      setGallery((prev) => [item, ...prev]);
      const updatedRecents = pushRecentVoiceId(selectedVoice.referenceId || selectedVoice.id);
      setRecentVoiceIds(updatedRecents);
      playGalleryItem(item);
    } finally {
      finishLiveProgressSession();
      setIsGenerating(false);
    }
  };

  /**
   * Continuous Generation in Studio "Fala Única & Expressões" mode:
   * Unifies multi-line scripts, multiple sentences, or pasted CSV lines into ONE single continuous audio file.
   */
  const handleGenerateContinuousStudioText = async () => {
    if (!text.trim() || isGenerating || isContinuousGenerating || isBatchGenerating) return;
    const unifiedScript = buildContinuousTaggedScriptFromText(
      text,
      false,
      selectedModel.tagSyntax,
      continuousPauseBetweenPhrases
    );
    if (!unifiedScript) return;

    const lineCount = text
      .split(/\r?\n+/)
      .map((l) => l.trim())
      .filter(Boolean).length;
    const labelStr = `Áudio Contínuo Unificado (${lineCount} ${lineCount === 1 ? 'bloco' : 'frases'})`;

    setIsContinuousGenerating(true);
    startLiveProgressSession(
      'continuous',
      'Geração Contínua (Áudio Único)',
      1,
      labelStr,
      unifiedScript
    );
    try {
      const parsedCustomTags = customItemTagInput
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const mergedTags = Array.from(
        new Set([...(selectedVoice.tags || []), ...parsedCustomTags, 'Áudio-Contínuo'])
      );

      const item = await generateFishAudioClip({
        taggedText: unifiedScript,
        voice: selectedVoice,
        customReferenceId,
        modelId: selectedModelId,
        speed,
        apiKey: apiKeyInput,
        batchLabel: `Contínuo (${lineCount} ${lineCount === 1 ? 'bloco' : 'frases'})`,
        category: customItemCategory.trim() || selectedVoice.category || 'Geração Contínua',
        customTags: mergedTags,
        onProgress: (info) =>
          updateLiveProgressFromClip(0, 1, labelStr, unifiedScript, info),
      });

      setLatestGeneratedItem(item);
      setSessionGeneratedIds((prev) => [item.id, ...prev]);
      setStudioMirrorScope('session');
      setGallery((prev) => [item, ...prev]);
      const updatedRecents = pushRecentVoiceId(selectedVoice.referenceId || selectedVoice.id);
      setRecentVoiceIds(updatedRecents);
      playGalleryItem(item);
    } finally {
      finishLiveProgressSession();
      setIsContinuousGenerating(false);
    }
  };

  /**
   * Separate Phrases Generation in Studio "Fala Única & Expressões" mode:
   * Splits multi-line or multi-sentence text into separate audio items if the user wants individual clips.
   */
  const handleGenerateSplitStudioPhrases = async () => {
    if (!text.trim() || isGenerating || isContinuousGenerating || isBatchGenerating) return;
    const phrases = text
      .split(/\r?\n+|(?<=[.!?…])\s+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (phrases.length <= 1) {
      await handleGenerateSingleAudio();
      return;
    }

    setIsGenerating(true);
    setStudioMirrorScope('session');
    startLiveProgressSession(
      'parts',
      `Geração em Partes (${phrases.length} Frases Separadas)`,
      phrases.length,
      `Parte 1 de ${phrases.length}`,
      phrases[0]
    );
    try {
      const parsedCustomTags = customItemTagInput
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean);
      const mergedTags = Array.from(new Set([...(selectedVoice.tags || []), ...parsedCustomTags]));

      for (let i = 0; i < phrases.length; i++) {
        const partLabel = `Frase ${i + 1} de ${phrases.length}`;
        const item = await generateFishAudioClip({
          taggedText: phrases[i],
          voice: selectedVoice,
          customReferenceId,
          modelId: selectedModelId,
          speed,
          apiKey: apiKeyInput,
          batchLabel: `frase_${String(i + 1).padStart(2, '0')}`,
          category: customItemCategory.trim() || selectedVoice.category,
          customTags: mergedTags,
          onProgress: (info) =>
            updateLiveProgressFromClip(i, phrases.length, partLabel, phrases[i], info),
        });
        setSessionGeneratedIds((prev) => [item.id, ...prev]);
        setGallery((prev) => [item, ...prev]);
        setLatestGeneratedItem(item);
      }
    } finally {
      finishLiveProgressSession();
      setIsGenerating(false);
    }
  };

  const handleImportCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      setCsvRawText(content);
      const baseName = file.name.replace(/\.[^.]+$/, '');
      if (baseName) setBatchCategoryName(`Planilha: ${baseName}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDownloadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_TEMPLATE_CONTENT], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo_vozes_fish_audio.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAgentSpec = () => {
    navigator.clipboard.writeText(AGENT_CSV_AND_TAGS_SPECIFICATION);
    setCopiedAgentSpec(true);
    setTimeout(() => setCopiedAgentSpec(false), 2500);
  };

  const handleGenerateBatchCsv = async () => {
    if (parsedCsvRows.length === 0 || isBatchGenerating || isContinuousGenerating || isGenerating)
      return;
    setIsBatchGenerating(true);
    setStudioMirrorScope('session');
    setBatchProgress({ current: 0, total: parsedCsvRows.length });
    startLiveProgressSession(
      'parts',
      `Lote CSV em Partes (${parsedCsvRows.length} Vozes Separadas)`,
      parsedCsvRows.length,
      `${parsedCsvRows[0].label} (1/${parsedCsvRows.length})`,
      parsedCsvRows[0].taggedText
    );

    try {
      for (let i = 0; i < parsedCsvRows.length; i++) {
        const row = parsedCsvRows[i];
        setBatchProgress({ current: i + 1, total: parsedCsvRows.length });
        const partLabel = `${row.label} (${i + 1}/${parsedCsvRows.length})`;

        const clip = await generateFishAudioClip({
          taggedText: row.taggedText,
          voice: selectedVoice,
          customReferenceId,
          modelId: selectedModelId,
          speed: row.speed || speed,
          apiKey: apiKeyInput,
          batchLabel: row.label,
          category: batchCategoryName.trim() || selectedVoice.category || 'Lote CSV',
          customTags: [...(selectedVoice.tags || []), 'CSV-Lote'],
          onProgress: (info) =>
            updateLiveProgressFromClip(
              i,
              parsedCsvRows.length,
              partLabel,
              row.taggedText,
              info
            ),
        });
        // Add each clip live to the Studio Session Mirror & Gallery without leaving the Studio screen
        setSessionGeneratedIds((prev) => [clip.id, ...prev]);
        setGallery((prev) => [clip, ...prev]);
        setLatestGeneratedItem(clip);
      }
    } finally {
      finishLiveProgressSession();
      setIsBatchGenerating(false);
    }
  };

  /**
   * Continuous Generation in "Importar Planilha CSV (Lote)" mode:
   * Instead of generating N separate audios from the spreadsheet rows, joins all rows into ONE single continuous audio!
   */
  const handleGenerateContinuousBatchCsv = async () => {
    if (parsedCsvRows.length === 0 || isBatchGenerating || isContinuousGenerating || isGenerating)
      return;
    const continuousTaggedScript = buildContinuousTaggedScriptFromCsvRows(
      parsedCsvRows,
      selectedModel.tagSyntax,
      continuousPauseBetweenPhrases
    );
    if (!continuousTaggedScript) return;

    const partLabel = `Planilha Unificada (1 Áudio c/ ${parsedCsvRows.length} Frases)`;
    setIsContinuousGenerating(true);
    setStudioMirrorScope('session');
    startLiveProgressSession(
      'continuous',
      `Geração Contínua CSV (${parsedCsvRows.length} Frases em 1 Áudio Único)`,
      1,
      partLabel,
      continuousTaggedScript
    );

    try {
      const clip = await generateFishAudioClip({
        taggedText: continuousTaggedScript,
        voice: selectedVoice,
        customReferenceId,
        modelId: selectedModelId,
        speed,
        apiKey: apiKeyInput,
        batchLabel: `Planilha Contínua (${parsedCsvRows.length} falas unificadas)`,
        category: batchCategoryName.trim() || selectedVoice.category || 'Planilha Contínua',
        customTags: [...(selectedVoice.tags || []), 'CSV-Contínuo', 'Áudio-Único'],
        onProgress: (info) =>
          updateLiveProgressFromClip(0, 1, partLabel, continuousTaggedScript, info),
      });

      setSessionGeneratedIds((prev) => [clip.id, ...prev]);
      setGallery((prev) => [clip, ...prev]);
      setLatestGeneratedItem(clip);
      const updatedRecents = pushRecentVoiceId(selectedVoice.referenceId || selectedVoice.id);
      setRecentVoiceIds(updatedRecents);
      playGalleryItem(clip);
    } finally {
      finishLiveProgressSession();
      setIsContinuousGenerating(false);
    }
  };

  const toggleSelectGalleryItem = (id: string) => {
    setSelectedGalleryIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleSelectAllFiltered = () => {
    if (selectedGalleryIds.length === filteredGallery.length && filteredGallery.length > 0) {
      setSelectedGalleryIds([]);
    } else {
      setSelectedGalleryIds(filteredGallery.map((i) => i.id));
    }
  };

  const toggleSelectAllStudioMirror = () => {
    const mirrorIds = filteredStudioMirror.map((i) => i.id);
    const allSelected =
      mirrorIds.length > 0 && mirrorIds.every((id) => selectedGalleryIds.includes(id));
    if (allSelected) {
      setSelectedGalleryIds((prev) => prev.filter((id) => !mirrorIds.includes(id)));
    } else {
      setSelectedGalleryIds((prev) => Array.from(new Set([...prev, ...mirrorIds])));
    }
  };

  const handleApplyBulkCategoryAndTag = () => {
    if (selectedGalleryIds.length === 0) return;
    const newCat = bulkCategoryAssign.trim();
    const newTag = bulkTagAssign.trim();
    if (!newCat && !newTag) return;

    setGallery((prev) =>
      prev.map((item) => {
        if (!selectedGalleryIds.includes(item.id)) return item;
        const updatedTags = newTag
          ? Array.from(new Set([...(item.customTags || []), newTag]))
          : item.customTags;
        return {
          ...item,
          category: newCat || item.category,
          customTags: updatedTags,
        };
      })
    );
    setBulkCategoryAssign('');
    setBulkTagAssign('');
  };

  const downloadAudioItem = (item: FishGeneratedAudioItem) => {
    const ext = item.audioDataUrl.startsWith('data:audio/mpeg') ? 'mp3' : 'wav';
    const safeLabel = (item.batchLabel || item.voiceName || 'fish_audio')
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/gi, '_');
    const a = document.createElement('a');
    a.href = item.audioDataUrl;
    a.download = `${safeLabel}_${item.id.slice(-4)}.${ext}`;
    a.click();
  };

  const handleDownloadSelectedGallery = () => {
    const items = gallery.filter((i) => selectedGalleryIds.includes(i.id));
    items.forEach((item, idx) => {
      setTimeout(() => downloadAudioItem(item), idx * 180);
    });
  };

  const handleDeleteSelectedGallery = () => {
    setGallery((prev) => prev.filter((i) => !selectedGalleryIds.includes(i.id)));
    setSelectedGalleryIds([]);
  };

  /**
   * Renders the Circular Cover Avatar with Play/Pause sample button overlay
   */
  const renderVoiceAvatar = (voice: FishPortugueseVoice, sizeClass = 'w-12 h-12') => {
    const hasCover = Boolean(voice.coverImage && !failedCoverIds[voice.id]);
    const isPlayingSample = playingSampleVoiceId === voice.id;
    const initials = (voice.name || 'VF')
      .replace(/[^A-Za-zÀ-ÿ0-9 ]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

    return (
      <div
        onClick={(e) => handlePlayVoiceSample(e, voice)}
        className={`relative ${sizeClass} rounded-full overflow-hidden shrink-0 liquid-glass border border-white/25 group cursor-pointer flex items-center justify-center`}
        title="Clique na foto para ouvir uma amostra da voz"
      >
        {hasCover ? (
          <img
            src={voice.coverImage}
            alt={voice.name}
            referrerPolicy="no-referrer"
            onError={() => setFailedCoverIds((prev) => ({ ...prev, [voice.id]: true }))}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-bold text-white select-none">{initials || 'PT'}</span>
        )}

        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            isPlayingSample
              ? 'bg-black/65 opacity-100'
              : 'bg-black/50 opacity-0 group-hover:opacity-100'
          }`}
        >
          {isPlayingSample ? (
            <Pause className="w-4 h-4 text-white fill-white" />
          ) : (
            <Play className="w-4 h-4 text-white fill-white ml-0.5" />
          )}
        </div>
      </div>
    );
  };

  /**
   * Official Fish Audio "Selecionar voz" Selector Component
   * Used both in the Modal popup from the Studio AND in the "Biblioteca de Vozes" screen.
   */
  const renderFishVoiceSelector = (isModalMode: boolean) => {
    const tabSubtitle =
      voiceSelectorTab === 'recent'
        ? 'Vozes que você utilizou ou selecionou recentemente.'
        : voiceSelectorTab === 'explore'
        ? 'Vozes da comunidade partilhadas por criadores.'
        : voiceSelectorTab === 'default'
        ? 'Vozes padrão otimizadas para síntese expressiva.'
        : voiceSelectorTab === 'self'
        ? 'Vozes criadas ou salvas na sua conta Fish Audio.'
        : voiceSelectorTab === 'favorites'
        ? 'Vozes marcadas como favoritas na plataforma ou localmente.'
        : `Coleção personalizada: ${voiceSelectorTab}`;

    return (
      <div className="space-y-5">
        {/* Top Navigation Tabs (Identical to Fish Audio UI in Monochrome Liquid Glass) */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
          {(
            [
              { id: 'recent', label: 'Recentemente Usado' },
              { id: 'explore', label: 'Explorar' },
              { id: 'default', label: 'Vozes Padrão' },
              { id: 'self', label: 'Minhas Vozes' },
              {
                id: 'favorites',
                label: `Marcado como favorito (${favoriteVoicesList.length})`,
              },
            ] as const
          ).map((tab) => {
            const isActive = voiceSelectorTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setVoiceSelectorTab(tab.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'btn-monochrome-primary'
                    : 'btn-liquid-glass text-zinc-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          {/* Custom User Collections */}
          {voiceCollections.map((col) => {
            const isActive = voiceSelectorTab === col;
            return (
              <button
                key={col}
                type="button"
                onClick={() => setVoiceSelectorTab(col)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'btn-monochrome-primary'
                    : 'btn-liquid-glass text-zinc-400 hover:text-white'
                }`}
              >
                {col}
              </button>
            );
          })}

          <span className="text-zinc-700 mx-1">|</span>

          {isCreatingCollection ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={newCollectionName}
                onChange={(e) => setNewCollectionName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateVoiceCollection();
                }}
                placeholder="Nome da coleção..."
                className="px-3 py-1 liquid-glass-well rounded-full text-xs text-white focus:outline-none w-40"
                autoFocus
              />
              <button
                type="button"
                onClick={handleCreateVoiceCollection}
                className="px-3 py-1 btn-monochrome-primary text-xs rounded-full cursor-pointer"
              >
                Criar
              </button>
              <button
                type="button"
                onClick={() => setIsCreatingCollection(false)}
                className="p-1 text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsCreatingCollection(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full btn-liquid-glass text-xs font-medium cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              Criar coleção de voz
            </button>
          )}
        </div>

        {/* Subtitle */}
        <div className="text-xs text-zinc-400">{tabSubtitle}</div>

        {/* Search + Language Pill + Sort Pill + Filter Icon Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Rounded-full Search Bar Connected to Live Fish Audio API */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={voiceSearchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setVoiceSearchQuery(val);
                if (val.trim() && voiceSelectorTab !== 'explore' && voiceSelectorTab !== 'favorites') {
                  setVoiceSelectorTab('explore');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (voiceSelectorTab !== 'explore' && voiceSelectorTab !== 'favorites') {
                    setVoiceSelectorTab('explore');
                  }
                  handleLoadPortugueseVoices(voiceLanguageFilter, voiceSortBy, voiceSearchQuery);
                }
              }}
              placeholder="Pesquisar qualquer voz na Fish Audio por nome ou criador (ex: Bob Esponja, Goku, Lula)..."
              className="w-full pl-11 pr-24 py-2.5 liquid-glass-well rounded-full text-sm text-white placeholder-zinc-500 focus:outline-none"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {voiceSearchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setVoiceSearchQuery('');
                    handleLoadPortugueseVoices(voiceLanguageFilter, voiceSortBy, '');
                  }}
                  className="p-1.5 text-zinc-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                  title="Limpar pesquisa"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (voiceSelectorTab !== 'explore' && voiceSelectorTab !== 'favorites') {
                    setVoiceSelectorTab('explore');
                  }
                  handleLoadPortugueseVoices(voiceLanguageFilter, voiceSortBy, voiceSearchQuery);
                }}
                className="px-3.5 py-1 btn-monochrome-primary text-xs rounded-full cursor-pointer"
              >
                Buscar
              </button>
            </div>
          </div>

          {/* Language Selector */}
          <div className="relative">
            <select
              value={voiceLanguageFilter}
              onChange={(e) => {
                const nextLang = e.target.value;
                setVoiceLanguageFilter(nextLang);
                handleLoadPortugueseVoices(nextLang, voiceSortBy, voiceSearchQuery);
              }}
              className="appearance-none pl-4 pr-9 py-2.5 liquid-glass-well rounded-full text-xs font-medium text-zinc-100 focus:outline-none cursor-pointer"
            >
              <option value="pt" className="bg-[#09090D] text-white">Português (PT)</option>
              <option value="all" className="bg-[#09090D] text-white">Todos os Idiomas</option>
              <option value="en" className="bg-[#09090D] text-white">Inglês (EN)</option>
              <option value="es" className="bg-[#09090D] text-white">Espanhol (ES)</option>
              <option value="ja" className="bg-[#09090D] text-white">Japonês (JA)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              value={voiceSortBy}
              onChange={(e) => {
                const nextSort = e.target.value as 'task_count' | 'score' | 'like_count';
                setVoiceSortBy(nextSort);
                handleLoadPortugueseVoices(voiceLanguageFilter, nextSort, voiceSearchQuery);
              }}
              className="appearance-none pl-4 pr-9 py-2.5 liquid-glass-well rounded-full text-xs font-medium text-zinc-100 focus:outline-none cursor-pointer"
            >
              <option value="task_count" className="bg-[#09090D] text-white">Recomendado (Mais Usadas)</option>
              <option value="like_count" className="bg-[#09090D] text-white">Mais Curtidas</option>
              <option value="score" className="bg-[#09090D] text-white">Tendências</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Filter Icon Button */}
          <button
            type="button"
            onClick={() => setShowAdvancedVoiceFilters((v) => !v)}
            className={`p-2.5 rounded-full transition-colors cursor-pointer ${
              showAdvancedVoiceFilters || voiceTagFilter !== 'TODAS' || groupVoicesByCategory
                ? 'btn-monochrome-primary'
                : 'btn-liquid-glass'
            }`}
            title="Filtrar por Gênero, Idade, Tags, Agrupar por Categoria ou Importar Voz por ID"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Collapsible Filter & Tag Bar */}
        {showAdvancedVoiceFilters && (
          <div className="p-4 liquid-glass chromatic-border-subtle rounded-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-zinc-400 mr-1">Filtrar Perfil:</span>
                {FILTER_VOICE_TAGS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setVoiceTagFilter(tag)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                      voiceTagFilter === tag
                        ? 'btn-monochrome-primary'
                        : 'btn-liquid-glass text-zinc-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setGroupVoicesByCategory((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer ${
                  groupVoicesByCategory
                    ? 'btn-monochrome-primary'
                    : 'btn-liquid-glass text-zinc-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                {groupVoicesByCategory ? 'Agrupado por Categoria' : 'Agrupar por Categoria'}
              </button>
            </div>

            {/* Import Specific Fish Audio Voice by ID or Link */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/10">
              <input
                type="text"
                value={addFavIdInput}
                onChange={(e) => setAddFavIdInput(e.target.value)}
                placeholder="Importar voz específica por ID ou Link Fish Audio (ex: https://fish.audio/m/...)..."
                className="flex-1 min-w-[240px] px-3.5 py-1.5 liquid-glass-well rounded-full text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddVoiceByIdToFavorites}
                disabled={isAddingFavById || !addFavIdInput.trim()}
                className="flex items-center gap-1.5 px-4 py-1.5 btn-monochrome-primary disabled:opacity-40 text-xs rounded-full cursor-pointer whitespace-nowrap"
              >
                {isAddingFavById ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                Importar para Favoritas
              </button>
            </div>
          </div>
        )}

        {/* 3-Column Fish Audio Voice Grid */}
        {isLoadingVoices ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-white" />
            <span className="text-xs">Carregando vozes da comunidade Fish Audio...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedVoices).map(([groupTitle, groupItems]) => (
              <div key={groupTitle} className="space-y-3">
                {groupVoicesByCategory && (
                  <h3 className="text-xs font-semibold text-zinc-300">
                    {groupTitle} ({groupItems.length})
                  </h3>
                )}

                {groupItems.length === 0 ? (
                  <div className="p-10 liquid-glass chromatic-border-subtle rounded-xl text-center text-sm text-zinc-400">
                    Nenhuma voz encontrada nesta aba ou filtro.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
                    {groupItems.map((voice) => {
                      const isSelected = voice.id === selectedVoice.id;
                      const isFav =
                        voice.category === 'Favoritas' ||
                        voice.isFavorite ||
                        voice.liked ||
                        voice.isMarked ||
                        favoriteIds.includes(voice.id) ||
                        favoriteIds.includes(voice.referenceId);
                      const assignedCol =
                        voiceCollectionMap[voice.referenceId] || voiceCollectionMap[voice.id] || '';

                      return (
                        <div
                          key={voice.id}
                          onClick={() => handleSelectVoice(voice, isModalMode)}
                          className={`group flex items-start gap-3.5 p-4 rounded-xl transition-all cursor-pointer ${
                            isSelected
                              ? 'liquid-glass-elevated chromatic-border'
                              : 'liquid-glass chromatic-border-subtle'
                          }`}
                        >
                          {/* Left: Circular Cover Avatar with Play Sample Overlay */}
                          {renderVoiceAvatar(voice, 'w-12 h-12')}

                          {/* Right: Title · Author, Description, Metadata, Stats */}
                          <div className="flex-1 min-w-0">
                            {/* Line 1: Title · Author */}
                            <div className="flex items-baseline gap-1.5 min-w-0">
                              <span className="font-semibold text-[15px] text-white truncate">
                                {voice.name}
                              </span>
                              {voice.authorName && (
                                <span className="text-xs text-zinc-400 truncate shrink-0 max-w-[115px]">
                                  · {voice.authorName}
                                </span>
                              )}
                            </div>

                            {/* Line 2: 1-line Description */}
                            <p className="text-xs text-zinc-400 truncate mt-0.5">
                              {voice.description}
                            </p>

                            {/* Line 3: Clean Unboxed Metadata with Typographic Separators */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-2 text-[11px] text-zinc-300">
                              <span className="font-medium text-white">
                                {voice.languageCode || 'PT'}
                              </span>
                              <span aria-hidden="true" className="text-zinc-600">·</span>
                              <span>
                                {voice.genderLabel || (voice.gender === 'F' ? 'Feminino' : 'Masculino')}
                              </span>
                              <span aria-hidden="true" className="text-zinc-600">·</span>
                              <span className="text-zinc-400">
                                {voice.ageLabel || 'Meia Idade'}
                              </span>
                              {assignedCol && (
                                <>
                                  <span aria-hidden="true" className="text-zinc-600">·</span>
                                  <span className="text-white font-medium">{assignedCol}</span>
                                </>
                              )}
                            </div>

                            {/* Line 4: Metrics (Task Count K & Heart Like Count K) + Collection Assign */}
                            <div className="flex items-center justify-between gap-2 mt-2.5 text-xs text-zinc-400">
                              <div className="flex items-center gap-4">
                                <span
                                  className="inline-flex items-center gap-1 font-mono text-[11px] text-zinc-300 tabular-nums"
                                  title="Total de gerações com esta voz"
                                >
                                  <BarChart2 className="w-3.5 h-3.5 text-zinc-500" />
                                  {formatFishCountK(voice.taskCount)}
                                </span>

                                <button
                                  type="button"
                                  onClick={(e) => handleToggleFavoriteVoice(e, voice)}
                                  className={`inline-flex items-center gap-1 font-mono text-[11px] transition-colors cursor-pointer tabular-nums ${
                                    isFav
                                      ? 'text-white font-semibold'
                                      : 'text-zinc-400 hover:text-white'
                                  }`}
                                  title={
                                    isFav
                                      ? 'Marcado como favorito (clique para remover)'
                                      : 'Marcar como favorito'
                                  }
                                >
                                  <Heart
                                    className={`w-3.5 h-3.5 ${
                                      isFav ? 'text-white fill-white' : 'text-zinc-400'
                                    }`}
                                  />
                                  {formatFishCountK(voice.likeCount)}
                                </button>
                              </div>

                              {voiceCollections.length > 0 && (
                                <div onClick={(e) => e.stopPropagation()}>
                                  <select
                                    value={assignedCol}
                                    onChange={(e) => handleAssignVoiceToCollection(e, voice)}
                                    className="px-2 py-0.5 liquid-glass-well rounded text-[10px] text-zinc-300 hover:text-white cursor-pointer"
                                    title="Mover voz para uma coleção/categoria"
                                  >
                                    <option value="" className="bg-[#09090D]">+ Coleção</option>
                                    {voiceCollections.map((c) => (
                                      <option key={c} value={c} className="bg-[#09090D]">
                                        {c}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-screen h-screen obsidian-canvas text-zinc-100 font-sans overflow-hidden">
      {/* LEFT SIDEBAR NAVIGATION + COMPLETE MINI VOICE SELECTOR (360px - 385px) */}
      <aside className="w-[360px] xl:w-[385px] shrink-0 liquid-glass border-r border-white/10 flex flex-col h-full overflow-hidden">
        {/* Top Brand + Compact Navigation */}
        <div className="shrink-0">
          <div className="px-4 py-3.5 border-b border-white/10 flex items-center justify-between gap-2">
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white whitespace-nowrap">
                Fish Audio Studio
              </h1>
              <p className="text-[11px] text-zinc-400">Central de Vozes & Expressões</p>
            </div>
            <button
              onClick={onSwitchToArena}
              className="px-2.5 py-1.5 btn-liquid-glass rounded-lg text-[11px] font-medium cursor-pointer whitespace-nowrap"
              title="Voltar ao Dashboard Central"
            >
              ← Dashboard
            </button>
          </div>

          {/* Primary Screen Navigation (2x2 Compact Grid so the Mini Voice Selector gets maximum height) */}
          <nav className="p-2.5 grid grid-cols-2 gap-1.5 border-b border-white/10">
            <button
              onClick={() => setActiveScreen('studio')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeScreen === 'studio'
                  ? 'btn-monochrome-primary'
                  : 'btn-liquid-glass text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Wand2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Estúdio TTS</span>
              </span>
            </button>

            <button
              onClick={() => setActiveScreen('voices')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeScreen === 'voices'
                  ? 'btn-monochrome-primary'
                  : 'btn-liquid-glass text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Vozes (Tela)</span>
              </span>
              <span
                className={`text-[10px] font-mono tabular-nums ml-1 ${
                  activeScreen === 'voices' ? 'text-black font-bold' : 'text-zinc-400'
                }`}
              >
                {voices.length}
              </span>
            </button>

            <button
              onClick={() => setActiveScreen('gallery')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeScreen === 'gallery'
                  ? 'btn-monochrome-primary'
                  : 'btn-liquid-glass text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <FolderPlus className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Galeria Áudios</span>
              </span>
              <span
                className={`text-[10px] font-mono tabular-nums ml-1 ${
                  activeScreen === 'gallery' ? 'text-black font-bold' : 'text-zinc-400'
                }`}
              >
                {gallery.length}
              </span>
            </button>

            <button
              onClick={() => setActiveScreen('api_config')}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                activeScreen === 'api_config'
                  ? 'btn-monochrome-primary'
                  : 'btn-liquid-glass text-zinc-300'
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <KeyRound className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Config API</span>
              </span>
            </button>
          </nav>
        </div>

        {/* COMPLETE MINI VOICE SELECTOR IN SIDEBAR */}
        <div className="flex-1 min-h-0 flex flex-col p-3 gap-2.5 overflow-hidden">
          {/* Active Voice Compact Card */}
          <div className="p-3 liquid-glass-elevated chromatic-border rounded-xl shrink-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] font-semibold text-white">
                Voz Ativa no Estúdio
              </span>
              <button
                onClick={() => setIsVoicePickerModalOpen(true)}
                className="px-2.5 py-0.5 btn-liquid-glass rounded-md text-[10px] font-medium cursor-pointer whitespace-nowrap"
                title="Abrir seletor de vozes em tela cheia (3 colunas)"
              >
                Expandir ({voices.length})
              </button>
            </div>
            <div className="flex items-center gap-2.5">
              {renderVoiceAvatar(selectedVoice, 'w-11 h-11')}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-white truncate">
                    {selectedVoice.name}
                  </span>
                  {selectedVoice.authorName && (
                    <span className="text-[11px] text-zinc-400 truncate">
                      · {selectedVoice.authorName}
                    </span>
                  )}
                </div>
                <div className="flex items-center flex-wrap gap-1.5 mt-1 text-[10px] text-zinc-300">
                  <span className="font-medium text-white">
                    {selectedVoice.languageCode || 'PT'}
                  </span>
                  {selectedVoice.genderLabel && (
                    <>
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <span>{selectedVoice.genderLabel}</span>
                    </>
                  )}
                  <span aria-hidden="true" className="text-zinc-600">·</span>
                  <span className="inline-flex items-center gap-0.5 text-zinc-300 font-mono tabular-nums">
                    <BarChart2 className="w-3 h-3 text-zinc-500" />
                    {formatFishCountK(selectedVoice.taskCount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Mini Selector Header + Search Input */}
          <div className="space-y-2 shrink-0">
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-[11px] font-semibold text-zinc-200 tabular-nums">
                Mini Seletor de Vozes ({filteredVoices.length})
              </span>
              <div className="flex items-center gap-1">
                <select
                  value={voiceLanguageFilter}
                  onChange={(e) => {
                    const lang = e.target.value;
                    setVoiceLanguageFilter(lang);
                    handleLoadPortugueseVoices(lang, voiceSortBy, voiceSearchQuery);
                  }}
                  className="px-2 py-1 liquid-glass-well rounded-lg text-[10px] text-zinc-100 focus:outline-none cursor-pointer"
                  title="Filtrar idioma na API Fish Audio"
                >
                  <option value="pt" className="bg-[#09090D]">PT</option>
                  <option value="all" className="bg-[#09090D]">Todos</option>
                  <option value="en" className="bg-[#09090D]">EN</option>
                  <option value="es" className="bg-[#09090D]">ES</option>
                  <option value="ja" className="bg-[#09090D]">JA</option>
                </select>
                <button
                  onClick={() =>
                    handleLoadPortugueseVoices(
                      voiceLanguageFilter,
                      voiceSortBy,
                      voiceSearchQuery
                    )
                  }
                  disabled={isLoadingVoices}
                  className="p-1.5 btn-liquid-glass rounded-lg cursor-pointer disabled:opacity-50"
                  title="Sincronizar vozes com a Fish Audio API"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingVoices ? 'animate-spin text-white' : ''}`} />
                </button>
              </div>
            </div>

            {/* Search Input with Live Fish Audio API Query */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={voiceSearchQuery}
                onChange={(e) => setVoiceSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleLoadPortugueseVoices(
                      voiceLanguageFilter,
                      voiceSortBy,
                      voiceSearchQuery
                    );
                  }
                }}
                placeholder="Pesquisar voz por nome, autor ou tag..."
                className="w-full pl-8 pr-14 py-1.5 liquid-glass-well rounded-lg text-xs text-white placeholder:text-zinc-500 focus:outline-none"
              />
              {voiceSearchQuery && (
                <button
                  onClick={() => setVoiceSearchQuery('')}
                  className="p-1 text-zinc-400 hover:text-white absolute right-7 cursor-pointer"
                  title="Limpar busca"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() =>
                  handleLoadPortugueseVoices(
                    voiceLanguageFilter,
                    voiceSortBy,
                    voiceSearchQuery
                  )
                }
                disabled={isLoadingVoices}
                className="p-1 text-zinc-200 hover:text-white absolute right-2 cursor-pointer disabled:opacity-50"
                title="Buscar na API Fish Audio"
              >
                {isLoadingVoices ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Filter Tabs in Mini Selector */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              {[
                { id: 'explore', label: 'Explorar' },
                { id: 'favorites', label: `Favoritas (${favoriteIds.length})` },
                { id: 'recent', label: 'Recentes' },
                { id: 'default', label: 'Padrão' },
                { id: 'self', label: 'Minhas' },
              ].map((tab) => {
                const active = voiceSelectorTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setVoiceSelectorTab(tab.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'btn-monochrome-primary'
                        : 'btn-liquid-glass text-zinc-400'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
              {voiceCollections.map((col) => {
                const active = voiceSelectorTab === col;
                return (
                  <button
                    key={col}
                    onClick={() => setVoiceSelectorTab(col)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer whitespace-nowrap ${
                      active
                        ? 'btn-monochrome-primary'
                        : 'btn-liquid-glass text-zinc-400'
                    }`}
                  >
                    {col}
                  </button>
                );
              })}
            </div>

            {/* Quick Tag Filter Buttons */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
              {FILTER_VOICE_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setVoiceTagFilter(tag)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                    voiceTagFilter === tag
                      ? 'btn-monochrome-primary'
                      : 'btn-liquid-glass text-zinc-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Mini Voice List */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-1 space-y-1.5">
            {filteredVoices.length === 0 ? (
              <div className="py-8 px-3 text-center liquid-glass chromatic-border-subtle rounded-xl space-y-2">
                <p className="text-xs text-zinc-400">
                  {isLoadingVoices
                    ? 'Buscando vozes na API Fish Audio...'
                    : 'Nenhuma voz encontrada neste filtro.'}
                </p>
                {voiceSearchQuery.trim() && !isLoadingVoices && (
                  <button
                    onClick={() =>
                      handleLoadPortugueseVoices(
                        'all',
                        voiceSortBy,
                        voiceSearchQuery
                      )
                    }
                    className="px-3 py-1.5 btn-monochrome-primary rounded-lg text-[11px] cursor-pointer"
                  >
                    Buscar &ldquo;{voiceSearchQuery.trim()}&rdquo; em Todos os Idiomas
                  </button>
                )}
              </div>
            ) : (
              filteredVoices.map((voice) => {
                const isSelected = voice.id === selectedVoiceId;
                const isFav = favoriteIds.includes(voice.id) || Boolean(voice.isFavorite);
                return (
                  <div
                    key={voice.id}
                    onClick={() => handleSelectVoice(voice, false)}
                    className={`group flex items-start gap-2.5 p-2.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'liquid-glass-elevated chromatic-border'
                        : 'liquid-glass chromatic-border-subtle'
                    }`}
                  >
                    {/* Circular Avatar with Play Sample Overlay */}
                    {renderVoiceAvatar(voice, 'w-11 h-11')}

                    {/* Voice Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span className="text-xs font-bold text-white truncate">
                            {voice.name}
                          </span>
                          {voice.authorName && (
                            <span className="text-[10px] text-zinc-400 truncate">
                              · {voice.authorName}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-white shrink-0">
                            Ativa
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {voice.description || voice.category}
                      </p>

                      {/* Clean Unboxed Metadata & Metrics Row */}
                      <div className="flex items-center justify-between gap-1.5 mt-1.5">
                        <div className="flex items-center flex-wrap gap-1 min-w-0 text-[10px] text-zinc-300">
                          <span className="font-medium text-white">
                            {voice.languageCode || 'PT'}
                          </span>
                          {voice.genderLabel && (
                            <>
                              <span aria-hidden="true" className="text-zinc-600">·</span>
                              <span>{voice.genderLabel}</span>
                            </>
                          )}
                          {voice.ageLabel && (
                            <>
                              <span aria-hidden="true" className="text-zinc-600">·</span>
                              <span className="text-zinc-400">{voice.ageLabel}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-zinc-300 font-mono tabular-nums">
                            <BarChart2 className="w-3 h-3 text-zinc-500" />
                            {formatFishCountK(voice.taskCount)}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavoriteVoice(e, voice)}
                            className={`inline-flex items-center gap-0.5 text-[10px] font-mono transition-colors cursor-pointer tabular-nums ${
                              isFav
                                ? 'text-white font-semibold'
                                : 'text-zinc-400 hover:text-white'
                            }`}
                            title={isFav ? 'Remover dos favoritos' : 'Marcar como favorito'}
                          >
                            <Heart
                              className={`w-3 h-3 ${
                                isFav ? 'text-white fill-white' : 'text-zinc-400'
                              }`}
                            />
                            {formatFishCountK(voice.likeCount)}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Add Voice by ID/URL Footer inside Sidebar */}
          <div className="pt-2 border-t border-white/10 flex items-center gap-1.5 shrink-0">
            <input
              type="text"
              value={addFavIdInput}
              onChange={(e) => setAddFavIdInput(e.target.value)}
              placeholder="Colar ID ou URL Fish Audio..."
              className="flex-1 min-w-0 px-2.5 py-1.5 liquid-glass-well rounded-lg text-[11px] text-white placeholder:text-zinc-500 focus:outline-none font-mono"
            />
            <button
              onClick={handleAddVoiceByIdToFavorites}
              disabled={isAddingFavById || !addFavIdInput.trim()}
              className="px-2.5 py-1.5 btn-monochrome-primary disabled:opacity-40 rounded-lg text-[11px] cursor-pointer whitespace-nowrap"
              title="Importar voz por ID ou link para Favoritas"
            >
              {isAddingFavById ? '...' : '+ ID'}
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN VIEWPORT CONTENT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* TOP HEADER BAR — 3-Zone Contract with Liquid Glass & Chromatic Divider */}
        <header className="shrink-0 liquid-glass border-b border-white/10">
          <div className="flex items-center justify-between gap-8 px-8 py-4">
            <div className="text-sm font-semibold text-white whitespace-nowrap shrink-0">
              {activeScreen === 'studio' && 'Estúdio de Criação de Vozes'}
              {activeScreen === 'voices' && 'Selecionar voz (Comunidade, Favoritas & Coleções)'}
              {activeScreen === 'gallery' && 'Galeria de Áudios Gerados'}
              {activeScreen === 'api_config' && 'Configuração da Chave Fish Audio API'}
            </div>

            {/* Sub-screen navigation tabs depending on active screen */}
            <nav className="flex items-center gap-2">
              {activeScreen === 'studio' && (
                <div className="flex items-center gap-1 p-1 liquid-glass-well rounded-xl">
                  <button
                    onClick={() => setStudioSubScreen('single')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      studioSubScreen === 'single'
                        ? 'btn-monochrome-primary'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Fala Única & Expressões
                  </button>
                  <button
                    onClick={() => setStudioSubScreen('csv_batch')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      studioSubScreen === 'csv_batch'
                        ? 'btn-monochrome-primary'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Importar Planilha CSV (Lote)
                  </button>
                  <button
                    onClick={() => setStudioSubScreen('agent_template')}
                    className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                      studioSubScreen === 'agent_template'
                        ? 'btn-monochrome-primary'
                        : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Modelo & Tags para Agente
                  </button>
                </div>
              )}
            </nav>

            {/* Right Primary Action */}
            <div className="shrink-0">
              <button
                onClick={() => handleLoadPortugueseVoices()}
                disabled={isLoadingVoices}
                className="flex items-center gap-2 px-4 py-2 text-xs font-medium btn-liquid-glass rounded-lg cursor-pointer whitespace-nowrap"
              >
                {isLoadingVoices ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Sincronizar Vozes
              </button>
            </div>
          </div>
          <div className="chromatic-divider" />
        </header>

        {/* SCROLLABLE SCREEN BODY */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* ==============================================================
                TELA 1: ESTÚDIO DE CRIAÇÃO (SEÇÃO ÚNICA COMPACTA + ESPELHO ABAIXO)
               ============================================================== */}
            {activeScreen === 'studio' && (
              <>
                <div className="p-4 liquid-glass chromatic-border-subtle rounded-2xl space-y-3.5">
                  {/* LINHA SUPERIOR COMPACTA: Voz Ativa + Modelo + Velocidade na mesma barra */}
                  <div className="flex flex-wrap lg:flex-nowrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                    {/* Compact Voice Trigger */}
                    <div
                      onClick={() => setIsVoicePickerModalOpen(true)}
                      className="flex items-center justify-between gap-3 px-3 py-2 liquid-glass-elevated chromatic-border rounded-xl cursor-pointer transition-all min-w-0 flex-1"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {renderVoiceAvatar(selectedVoice, 'w-9 h-9')}
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-1.5">
                            <span className="font-semibold text-xs text-white truncate">
                              {selectedVoice.name}
                            </span>
                            {selectedVoice.authorName && (
                              <span className="text-[11px] text-zinc-400 truncate">
                                · {selectedVoice.authorName}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-zinc-300">
                            <span className="font-medium text-white">
                              {selectedVoice.languageCode || 'PT'}
                            </span>
                            <span aria-hidden="true" className="text-zinc-600">·</span>
                            <span>{selectedVoice.genderLabel || 'Masculino'}</span>
                            <span aria-hidden="true" className="text-zinc-600">·</span>
                            <span className="inline-flex items-center gap-0.5 font-mono text-zinc-300 tabular-nums">
                              <BarChart2 className="w-2.5 h-2.5 text-zinc-500" />
                              {formatFishCountK(selectedVoice.taskCount)}
                            </span>
                            <span className="inline-flex items-center gap-0.5 font-mono text-white tabular-nums">
                              <Heart className="w-2.5 h-2.5 fill-white text-white" />
                              {formatFishCountK(selectedVoice.likeCount)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsVoicePickerModalOpen(true);
                        }}
                        className="px-3 py-1.5 btn-monochrome-primary text-[11px] rounded-full shrink-0 cursor-pointer whitespace-nowrap"
                      >
                        Selecionar voz
                      </button>
                    </div>

                    {/* Compact Model Selector */}
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-zinc-400 whitespace-nowrap">Modelo:</span>
                      <select
                        value={selectedModelId}
                        onChange={(e) => {
                          const nextId = e.target.value as FishAudioModelId;
                          setSelectedModelId(nextId);
                          const nextModel =
                            FISH_AUDIO_MODELS.find((m) => m.id === nextId) || FISH_AUDIO_MODELS[0];
                          if (text.trim()) {
                            setText((prev) => convertTextTagsSyntax(prev, nextModel.tagSyntax));
                          }
                        }}
                        className="px-3 py-2 liquid-glass-well rounded-xl text-xs font-medium text-white focus:outline-none cursor-pointer"
                      >
                        {FISH_AUDIO_MODELS.map((m) => (
                          <option key={m.id} value={m.id} className="bg-[#09090D] text-white">
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Compact Speed Control */}
                    <div className="flex items-center gap-2.5 px-3 py-1.5 liquid-glass-well rounded-xl shrink-0">
                      <span className="text-[11px] text-zinc-400 font-mono tabular-nums whitespace-nowrap">
                        Vel: <strong className="text-white">{speed.toFixed(2)}x</strong>
                      </span>
                      <input
                        type="range"
                        min={0.7}
                        max={1.4}
                        step={0.05}
                        value={speed}
                        onChange={(e) => setSpeed(parseFloat(e.target.value))}
                        className="w-24 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* SUB-TELA 1.1: FALA ÚNICA & EXPRESSÕES (COMPACTADA NA MESMA SEÇÃO) */}
                  {studioSubScreen === 'single' && (
                    <div className="space-y-3">
                      {/* Expression Tags Row */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-zinc-200">
                            Tags de Expressão{' '}
                            <span className="text-[11px] font-normal text-zinc-400">
                              (clique para inserir no cursor)
                            </span>
                          </span>

                          <div className="flex flex-wrap items-center gap-1 p-0.5 liquid-glass-well rounded-lg">
                            {(
                              [
                                { id: 'tone', label: 'Entonação (14)' },
                                { id: 'pause', label: 'Pausas (3)' },
                                { id: 'emotion', label: 'Emoções (24)' },
                                { id: 'vocal', label: 'Efeitos (11)' },
                                { id: 'all', label: 'Todas (52)' },
                              ] as const
                            ).map((tab) => (
                              <button
                                key={tab.id}
                                onClick={() => setTagCategoryTab(tab.id)}
                                className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                                  tagCategoryTab === tab.id
                                    ? 'btn-monochrome-primary'
                                    : 'text-zinc-400 hover:text-white'
                                }`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                          {visibleExpressionTags.map((t) => {
                            const formattedTag = formatFishTag(t.rawKey, selectedModel.tagSyntax);
                            return (
                              <button
                                key={t.id}
                                type="button"
                                onClick={() => handleInsertTagOnly(t.rawKey)}
                                className="px-2.5 py-1 btn-liquid-glass rounded-md text-[11px] cursor-pointer whitespace-nowrap"
                                title={t.description}
                              >
                                <span className="font-medium text-white">{t.labelPt}</span>
                                <span className="ml-1 font-mono text-zinc-400">{formattedTag}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Text Editor + Actions in same compact block */}
                      <div className="space-y-2.5 pt-2 border-t border-white/10">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <label className="text-xs font-semibold text-zinc-200">
                            Texto para Gerar Áudio
                          </label>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={handleAutoInsertTags}
                              disabled={!text.trim()}
                              className="flex items-center gap-1 px-2.5 py-1 btn-liquid-glass disabled:opacity-40 text-[11px] font-semibold rounded-md cursor-pointer whitespace-nowrap"
                            >
                              <Sparkles className="w-3 h-3 text-white" />
                              Auto-Inserir Tags
                            </button>
                            <button
                              type="button"
                              onClick={() => setText(stripFishAudioTags(text))}
                              disabled={!text.trim()}
                              className="px-2.5 py-1 btn-liquid-glass disabled:opacity-40 text-[11px] font-medium rounded-md cursor-pointer whitespace-nowrap"
                            >
                              Remover Tags
                            </button>
                            <button
                              type="button"
                              onClick={() => setText('')}
                              disabled={!text.trim()}
                              className="px-2.5 py-1 btn-liquid-glass disabled:opacity-40 text-[11px] font-medium rounded-md cursor-pointer whitespace-nowrap"
                            >
                              Limpar
                            </button>
                          </div>
                        </div>

                        <textarea
                          ref={textareaRef}
                          rows={3}
                          value={text}
                          onChange={(e) => setText(e.target.value)}
                          placeholder="Digite aqui a frase que deseja gerar..."
                          className="w-full p-3 liquid-glass-well rounded-xl text-sm text-white placeholder-zinc-500 leading-relaxed focus:outline-none"
                        />

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={customItemCategory}
                              onChange={(e) => setCustomItemCategory(e.target.value)}
                              placeholder={`Categoria (padrão: ${selectedVoice.category})`}
                              className="px-3 py-1.5 liquid-glass-well rounded-lg text-xs text-white placeholder-zinc-500 w-44 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={customItemTagInput}
                              onChange={(e) => setCustomItemTagInput(e.target.value)}
                              placeholder="Tags opcionais (ex: NPC, Vilão)"
                              className="px-3 py-1.5 liquid-glass-well rounded-lg text-xs text-white placeholder-zinc-500 w-44 focus:outline-none"
                            />
                            <label
                              className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10"
                              title="Quando ativado, insere uma breve pausa [break] ao unir múltiplas linhas ou frases em um único áudio contínuo"
                            >
                              <input
                                type="checkbox"
                                checked={continuousPauseBetweenPhrases}
                                onChange={(e) => setContinuousPauseBetweenPhrases(e.target.checked)}
                                className="accent-white"
                              />
                              Pausa [break] entre frases
                            </label>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={handleGenerateContinuousStudioText}
                              disabled={
                                isGenerating ||
                                isContinuousGenerating ||
                                isBatchGenerating ||
                                !text.trim()
                              }
                              className="flex items-center gap-2 px-4 py-2 btn-monochrome-primary disabled:opacity-40 text-xs rounded-xl cursor-pointer whitespace-nowrap tabular-nums"
                              title="Une todas as frases/linhas digitadas e gera em 1 ÚNICO ÁUDIO CONTÍNUO sem dividir em arquivos separados"
                            >
                              {isContinuousGenerating ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Gerando Áudio Único ({liveProgress.overallPercent}%)...
                                </>
                              ) : (
                                <>
                                  <Layers className="w-3.5 h-3.5" />
                                  Geração Contínua (Áudio Único)
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={handleGenerateSingleAudio}
                              disabled={
                                isGenerating ||
                                isContinuousGenerating ||
                                isBatchGenerating ||
                                !text.trim()
                              }
                              className="flex items-center gap-2 px-4 py-2 btn-liquid-glass disabled:opacity-40 text-xs font-semibold text-white rounded-xl cursor-pointer whitespace-nowrap tabular-nums"
                              title="Gera o áudio diretamente do texto atual"
                            >
                              {isGenerating && liveProgress.modeType === 'single' ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  Gerando ({liveProgress.overallPercent}%)...
                                </>
                              ) : (
                                <>
                                  <Volume2 className="w-3.5 h-3.5" />
                                  Gerar Áudio Direto
                                </>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={handleGenerateSplitStudioPhrases}
                              disabled={
                                isGenerating ||
                                isContinuousGenerating ||
                                isBatchGenerating ||
                                !text.trim()
                              }
                              className="flex items-center gap-1.5 px-3 py-2 btn-liquid-glass disabled:opacity-40 text-[11px] text-zinc-300 hover:text-white rounded-xl cursor-pointer whitespace-nowrap tabular-nums"
                              title="Divide o texto por frases/linhas e gera múltiplos áudios separados"
                            >
                              {isGenerating && liveProgress.modeType === 'parts' ? (
                                <>
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  Partes ({liveProgress.currentPart}/{liveProgress.totalParts} ·{' '}
                                  {liveProgress.overallPercent}%)
                                </>
                              ) : (
                                'Separar Frases'
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUB-TELA 1.2: IMPORTAR PLANILHA CSV EM MASSA (COMPACTADA NA MESMA SEÇÃO) */}
                  {studioSubScreen === 'csv_batch' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-semibold text-white">
                            Lote CSV (id;texto_com_tags;velocidade)
                          </span>
                          <label className="flex items-center gap-1.5 text-[11px] text-zinc-400 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={autoTagCsvMissing}
                              onChange={(e) => setAutoTagCsvMissing(e.target.checked)}
                              className="accent-white"
                            />
                            Auto-inserir tags se ausente
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            ref={csvFileInputRef}
                            type="file"
                            accept=".csv,.tsv,.txt"
                            onChange={handleImportCsvFile}
                            className="hidden"
                          />
                          <button
                            onClick={() => csvFileInputRef.current?.click()}
                            className="flex items-center gap-1.5 px-3 py-1.5 btn-monochrome-primary text-xs rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            Importar .CSV
                          </button>
                          <button
                            onClick={() => setStudioSubScreen('agent_template')}
                            className="px-3 py-1.5 btn-liquid-glass text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            Modelo p/ Agente
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <textarea
                          rows={4}
                          value={csvRawText}
                          onChange={(e) => setCsvRawText(e.target.value)}
                          placeholder="Importe um .CSV ou cole linhas aqui (ex: fala_01;[excited] Olá mundo!;1.0)"
                          className="w-full p-2.5 liquid-glass-well rounded-xl text-xs font-mono text-zinc-100 placeholder-zinc-500 focus:outline-none"
                        />

                        <div className="liquid-glass-well rounded-xl h-[98px] overflow-y-auto divide-y divide-white/10">
                          {parsedCsvRows.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-[11px] text-zinc-500 px-4 text-center">
                              0 falas reconhecidas. Importe um arquivo .CSV ou cole as linhas ao lado.
                            </div>
                          ) : (
                            parsedCsvRows.map((row) => (
                              <div
                                key={`${row.rowNumber}-${row.label}`}
                                className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs"
                              >
                                <span className="font-mono font-semibold text-white shrink-0">
                                  {row.label}
                                </span>
                                <span className="text-zinc-300 truncate flex-1">
                                  {row.taggedText}
                                </span>
                                <span className="font-mono tabular-nums text-zinc-500 shrink-0">
                                  {row.speed || speed}x
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs text-zinc-400">Categoria do Lote:</label>
                          <input
                            type="text"
                            value={batchCategoryName}
                            onChange={(e) => setBatchCategoryName(e.target.value)}
                            className="px-2.5 py-1 liquid-glass-well rounded-lg text-xs text-white focus:outline-none w-40"
                          />
                          <span className="text-[11px] text-zinc-400 font-mono tabular-nums">
                            ({parsedCsvRows.length} falas reconhecidas)
                          </span>
                          <label
                            className="flex items-center gap-1.5 text-[11px] text-zinc-300 cursor-pointer px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10"
                            title="Insere [break] entre cada linha da planilha ao gerar em 1 único áudio contínuo"
                          >
                            <input
                              type="checkbox"
                              checked={continuousPauseBetweenPhrases}
                              onChange={(e) => setContinuousPauseBetweenPhrases(e.target.checked)}
                              className="accent-white"
                            />
                            Pausa [break] entre frases
                          </label>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={handleGenerateContinuousBatchCsv}
                            disabled={
                              isBatchGenerating ||
                              isContinuousGenerating ||
                              isGenerating ||
                              parsedCsvRows.length === 0
                            }
                            className="flex items-center gap-2 px-4 py-2 btn-monochrome-primary disabled:opacity-40 text-xs rounded-xl cursor-pointer whitespace-nowrap tabular-nums"
                            title="Ao invés de gerar cada linha separadamente, une todas as frases da planilha e gera 1 ÚNICO ÁUDIO CONTÍNUO"
                          >
                            {isContinuousGenerating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Unindo {parsedCsvRows.length} Frases ({liveProgress.overallPercent}%)...
                              </>
                            ) : (
                              <>
                                <Layers className="w-3.5 h-3.5" />
                                Geração Contínua (1 Áudio Único c/ {parsedCsvRows.length} Frases)
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={handleGenerateBatchCsv}
                            disabled={
                              isBatchGenerating ||
                              isContinuousGenerating ||
                              isGenerating ||
                              parsedCsvRows.length === 0
                            }
                            className="flex items-center gap-2 px-4 py-2 btn-liquid-glass text-white font-semibold disabled:opacity-40 text-xs rounded-xl cursor-pointer whitespace-nowrap tabular-nums"
                            title="Gera cada linha da planilha como um áudio individual separado"
                          >
                            {isBatchGenerating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Gerando {batchProgress.current}/{batchProgress.total} (
                                {liveProgress.overallPercent}%)...
                              </>
                            ) : (
                              <>
                                <FileSpreadsheet className="w-3.5 h-3.5" />
                                Gerar {parsedCsvRows.length} Vozes Separadas
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* PAINEL DE LOADING EM TEMPO REAL (ÁUDIO ÚNICO, CONTÍNUO OU EM PARTES) */}
                  {liveProgress.active && (
                    <div className="mt-3 p-3.5 liquid-glass-elevated chromatic-border rounded-xl space-y-2.5 animate-pulse">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                          <span className="text-xs font-bold text-white truncate">
                            {liveProgress.modeTitle}
                          </span>
                          <span className="text-[11px] font-mono text-zinc-300 tabular-nums shrink-0">
                            · {liveProgress.partLabel}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums shrink-0">
                          {liveProgress.receivedBytes > 0 && (
                            <span className="text-zinc-300">
                              {(liveProgress.receivedBytes / 1024).toFixed(1)} KB
                            </span>
                          )}
                          <span className="text-zinc-400">{liveProgress.elapsedSec.toFixed(1)}s</span>
                          <span className="text-sm font-bold text-white">
                            {liveProgress.overallPercent}%
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso Principal (Geral) */}
                      <div className="w-full h-2 liquid-glass-well rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white transition-all duration-150 ease-out rounded-full"
                          style={{ width: `${Math.max(4, liveProgress.overallPercent)}%` }}
                        />
                      </div>

                      {/* Quando for Geração em Partes (totalParts > 1), exibe também a sub-barra da parte atual */}
                      {liveProgress.totalParts > 1 && (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 tabular-nums">
                            <span>
                              Progresso da Parte {liveProgress.currentPart} de{' '}
                              {liveProgress.totalParts}
                            </span>
                            <span>{liveProgress.clipPercent}%</span>
                          </div>
                          <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-zinc-300 transition-all duration-100 ease-out rounded-full"
                              style={{ width: `${Math.max(4, liveProgress.clipPercent)}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-between gap-3 text-[11px]">
                        <span className="text-zinc-300 font-medium truncate">
                          {liveProgress.phaseLabel}
                        </span>
                        <span className="text-zinc-400 font-mono truncate max-w-[55%]">
                          &ldquo;{liveProgress.textSnippet}&rdquo;
                        </span>
                      </div>
                    </div>
                  )}

                  {/* SUB-TELA 1.3: MODELO & TAGS PARA AGENTE IA (COMPACTADA NA MESMA SEÇÃO) */}
                  {studioSubScreen === 'agent_template' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-xs font-semibold text-white">
                            Prompt, Regras e Lista de Tags para o seu Agente
                          </h2>
                          <p className="text-[11px] text-zinc-400">
                            Copie esta especificação para o seu Agente gerar o .CSV formatado.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleCopyAgentSpec}
                            className="flex items-center gap-1.5 px-3 py-1.5 btn-monochrome-primary text-xs rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            {copiedAgentSpec ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copiar Instruções
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleDownloadSampleCsv}
                            className="flex items-center gap-1.5 px-3 py-1.5 btn-liquid-glass text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" /> Baixar .CSV Modelo
                          </button>
                        </div>
                      </div>

                      <pre className="p-3 liquid-glass-well rounded-xl text-[11px] font-mono text-zinc-200 max-h-56 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                        {AGENT_CSV_AND_TAGS_SPECIFICATION}
                      </pre>
                    </div>
                  )}
                </div>

                {/* ==============================================================
                    ESPELHO DA GALERIA NO ESTÚDIO (GERAÇÕES DESTA SESSÃO)
                   ============================================================== */}
                <div className="pt-2 space-y-5">
                  <div className="chromatic-divider" />

                  <div className="p-5 liquid-glass chromatic-border-subtle rounded-2xl space-y-4">
                    {/* Top Row: Title + Scope Switch (Gerações Desta Sessão vs Toda a Galeria) + Grouping */}
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <h2 className="text-base font-bold text-white tracking-tight">
                            Espelho da Galeria no Estúdio
                          </h2>
                          <div className="flex items-center gap-1 p-1 liquid-glass-well rounded-xl">
                            <button
                              type="button"
                              onClick={() => setStudioMirrorScope('session')}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                                studioMirrorScope === 'session'
                                  ? 'btn-monochrome-primary'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              Gerações Desta Sessão ({sessionGalleryItems.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setStudioMirrorScope('all')}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                                studioMirrorScope === 'all'
                                  ? 'btn-monochrome-primary'
                                  : 'text-zinc-400 hover:text-white'
                              }`}
                            >
                              Histórico Completo ({gallery.length})
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400">
                          Todas as falas geradas nesta sessão aparecem aqui abaixo instantaneamente, sem precisar sair do Estúdio.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs text-zinc-400">Agrupar:</span>
                        {(
                          [
                            { id: 'none', label: 'Lista Simples' },
                            { id: 'category', label: 'Categoria' },
                            { id: 'voice', label: 'Voz' },
                            { id: 'tag', label: 'Tag' },
                          ] as const
                        ).map((mode) => (
                          <button
                            key={mode.id}
                            type="button"
                            onClick={() => setGalleryGroupBy(mode.id)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                              galleryGroupBy === mode.id
                                ? 'btn-monochrome-primary'
                                : 'btn-liquid-glass text-zinc-300'
                            }`}
                          >
                            {mode.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter & Bulk Action Controls inside Studio Mirror */}
                    {studioMirrorBaseItems.length > 0 && (
                      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
                        <div className="flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            onClick={toggleSelectAllStudioMirror}
                            className="flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer tabular-nums"
                          >
                            {filteredStudioMirror.length > 0 &&
                            filteredStudioMirror.every((i) =>
                              selectedGalleryIds.includes(i.id)
                            ) ? (
                              <CheckSquare className="w-4 h-4 text-white" />
                            ) : (
                              <Square className="w-4 h-4 text-zinc-500" />
                            )}
                            Selecionar Todos ({filteredStudioMirror.length})
                          </button>

                          <div className="flex items-center gap-2">
                            <span className="text-xs text-zinc-400">Categoria:</span>
                            <select
                              value={galleryCategoryFilter}
                              onChange={(e) => setGalleryCategoryFilter(e.target.value)}
                              className="px-2.5 py-1 liquid-glass-well rounded-lg text-xs text-white focus:outline-none"
                            >
                              {allGalleryCategories.map((c) => (
                                <option key={c} value={c} className="bg-[#09090D]">
                                  {c}
                                </option>
                              ))}
                            </select>

                            <span className="text-xs text-zinc-400 ml-1">Tag:</span>
                            <select
                              value={galleryTagFilter}
                              onChange={(e) => setGalleryTagFilter(e.target.value)}
                              className="px-2.5 py-1 liquid-glass-well rounded-lg text-xs text-white focus:outline-none"
                            >
                              {allGalleryTags.map((t) => (
                                <option key={t} value={t} className="bg-[#09090D]">
                                  {t}
                                </option>
                              ))}
                            </select>
                          </div>

                          {selectedGalleryIds.length > 0 && (
                            <>
                              <input
                                type="text"
                                value={bulkCategoryAssign}
                                onChange={(e) => setBulkCategoryAssign(e.target.value)}
                                placeholder="Mover para Categoria..."
                                className="px-3 py-1 liquid-glass-well rounded-lg text-xs text-white w-40 focus:outline-none"
                              />
                              <input
                                type="text"
                                value={bulkTagAssign}
                                onChange={(e) => setBulkTagAssign(e.target.value)}
                                placeholder="Adicionar Tag..."
                                className="px-3 py-1 liquid-glass-well rounded-lg text-xs text-white w-32 focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={handleApplyBulkCategoryAndTag}
                                className="px-3 py-1 btn-monochrome-primary text-xs rounded-lg cursor-pointer whitespace-nowrap"
                              >
                                Aplicar ({selectedGalleryIds.length})
                              </button>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {selectedGalleryIds.length > 0 && (
                            <>
                              <button
                                type="button"
                                onClick={handleDownloadSelectedGallery}
                                className="flex items-center gap-1.5 px-3 py-1.5 btn-monochrome-primary text-xs rounded-lg cursor-pointer whitespace-nowrap tabular-nums"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Baixar Selecionados ({selectedGalleryIds.length})
                              </button>
                              <button
                                type="button"
                                onClick={handleDeleteSelectedGallery}
                                className="flex items-center gap-1.5 px-3 py-1.5 btn-liquid-glass text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap tabular-nums"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir ({selectedGalleryIds.length})
                              </button>
                            </>
                          )}

                          {studioMirrorScope === 'session' && sessionGalleryItems.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setSessionGeneratedIds([])}
                              className="px-3 py-1.5 btn-liquid-glass text-xs text-zinc-300 hover:text-white rounded-lg cursor-pointer whitespace-nowrap"
                              title="Limpar visualização da sessão atual (mantém os áudios salvos no Histórico da Galeria)"
                            >
                              Limpar Sessão
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Studio Mirror Audio List */}
                  {filteredStudioMirror.length === 0 ? (
                    <div className="p-8 liquid-glass chromatic-border-subtle rounded-2xl text-center space-y-2">
                      <div className="text-sm font-medium text-zinc-300">
                        {studioMirrorScope === 'session'
                          ? 'Nenhum áudio gerado nesta sessão ainda.'
                          : 'Nenhum áudio encontrado na galeria com este filtro.'}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {studioMirrorScope === 'session'
                          ? 'Assim que você clicar em "Gerar Áudio" ou "Gerar Vozes em Massa", os áudios aparecerão aqui mesmo abaixo para ouvir e baixar.'
                          : 'Altere o filtro acima ou gere novas falas no Estúdio.'}
                      </p>
                      {studioMirrorScope === 'session' && gallery.length > 0 && (
                        <div className="pt-2">
                          <button
                            type="button"
                            onClick={() => setStudioMirrorScope('all')}
                            className="px-4 py-1.5 btn-liquid-glass text-xs font-medium rounded-lg cursor-pointer"
                          >
                            Mostrar Histórico Completo ({gallery.length} áudios salvos)
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {Object.entries(groupedStudioMirror).map(([groupTitle, items]) => (
                        <div key={groupTitle} className="space-y-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-300 px-1 tabular-nums">
                            {groupTitle} ({items.length})
                          </h3>
                          <div className="liquid-glass chromatic-border-subtle rounded-2xl divide-y divide-white/10 overflow-hidden">
                            {items.map((item) => {
                              const isPlaying = playingItemId === item.id;
                              const isChecked = selectedGalleryIds.includes(item.id);
                              const isFromCurrentSession = sessionGeneratedIds.includes(item.id);
                              return (
                                <div
                                  key={item.id}
                                  className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-4 px-4 py-3.5 hover:bg-white/[0.04] transition-colors"
                                >
                                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => toggleSelectGalleryItem(item.id)}
                                      className="text-zinc-400 hover:text-white cursor-pointer shrink-0"
                                    >
                                      {isChecked ? (
                                        <CheckSquare className="w-4 h-4 text-white" />
                                      ) : (
                                        <Square className="w-4 h-4" />
                                      )}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => playGalleryItem(item)}
                                      className={`p-2.5 rounded-full cursor-pointer shrink-0 transition-colors ${
                                        isPlaying
                                          ? 'btn-monochrome-primary'
                                          : 'btn-liquid-glass'
                                      }`}
                                      title={isPlaying ? 'Pausar áudio' : 'Ouvir áudio'}
                                    >
                                      {isPlaying ? (
                                        <Pause className="w-4 h-4" />
                                      ) : (
                                        <Play className="w-4 h-4" />
                                      )}
                                    </button>

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-sm font-medium text-white truncate">
                                          {item.taggedText}
                                        </span>
                                        {isFromCurrentSession && (
                                          <span className="text-[10px] font-mono text-white/80 shrink-0">
                                            · Sessão Atual
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                                        {item.batchLabel ? `${item.batchLabel} · ` : ''}
                                        <span className="text-zinc-200">{item.voiceName}</span> ·{' '}
                                        {item.category || 'Geral'} · {item.modelId} ·{' '}
                                        {item.durationSec}s
                                        {item.tagsUsed.length > 0
                                          ? ` · ${item.tagsUsed.join(' ')}`
                                          : ''}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setText(item.taggedText);
                                        setStudioSubScreen('single');
                                        textareaRef.current?.focus();
                                      }}
                                      className="px-2.5 py-1.5 btn-liquid-glass text-xs text-zinc-300 hover:text-white rounded-lg cursor-pointer whitespace-nowrap"
                                      title="Carregar este texto de volta no editor do Estúdio"
                                    >
                                      Usar Texto
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => downloadAudioItem(item)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 btn-monochrome-primary text-xs rounded-lg cursor-pointer whitespace-nowrap"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      Baixar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setGallery((prev) =>
                                          prev.filter((x) => x.id !== item.id)
                                        )
                                      }
                                      className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                                      title="Excluir áudio"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ==============================================================
                TELA 2: SELECIONAR VOZ (LAYOUT IDÊNTICO AO FISH AUDIO)
               ============================================================== */}
            {activeScreen === 'voices' && (
              <div className="p-6 liquid-glass chromatic-border-subtle rounded-2xl">
                {renderFishVoiceSelector(false)}
              </div>
            )}

            {/* ==============================================================
                TELA 3: GALERIA DE ÁUDIOS GERADOS (CATEGORIAS & TAGS)
               ============================================================== */}
            {activeScreen === 'gallery' && (
              <div className="space-y-6">
                {/* Filter & Grouping Bar */}
                <div className="p-5 liquid-glass chromatic-border-subtle rounded-2xl space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Agrupar Galeria por:</span>
                      {(
                        [
                          { id: 'category', label: 'Categoria' },
                          { id: 'tag', label: 'Tag de Expressão' },
                          { id: 'voice', label: 'Voz' },
                          { id: 'none', label: 'Lista Simples' },
                        ] as const
                      ).map((mode) => (
                        <button
                          key={mode.id}
                          onClick={() => setGalleryGroupBy(mode.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer whitespace-nowrap ${
                            galleryGroupBy === mode.id
                              ? 'btn-monochrome-primary'
                              : 'btn-liquid-glass text-zinc-300'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-400">Categoria:</span>
                      <select
                        value={galleryCategoryFilter}
                        onChange={(e) => setGalleryCategoryFilter(e.target.value)}
                        className="px-3 py-1.5 liquid-glass-well rounded-lg text-xs text-white focus:outline-none"
                      >
                        {allGalleryCategories.map((c) => (
                          <option key={c} value={c} className="bg-[#09090D]">
                            {c}
                          </option>
                        ))}
                      </select>

                      <span className="text-xs text-zinc-400 ml-2">Tag:</span>
                      <select
                        value={galleryTagFilter}
                        onChange={(e) => setGalleryTagFilter(e.target.value)}
                        className="px-3 py-1.5 liquid-glass-well rounded-lg text-xs text-white focus:outline-none"
                      >
                        {allGalleryTags.map((t) => (
                          <option key={t} value={t} className="bg-[#09090D]">
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Bulk Actions Bar */}
                  {gallery.length > 0 && (
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={toggleSelectAllFiltered}
                          className="flex items-center gap-2 text-xs font-medium text-zinc-300 hover:text-white cursor-pointer"
                        >
                          {selectedGalleryIds.length === filteredGallery.length &&
                          filteredGallery.length > 0 ? (
                            <CheckSquare className="w-4 h-4 text-white" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-500" />
                          )}
                          Selecionar Todos ({filteredGallery.length})
                        </button>

                        {selectedGalleryIds.length > 0 && (
                          <>
                            <input
                              type="text"
                              value={bulkCategoryAssign}
                              onChange={(e) => setBulkCategoryAssign(e.target.value)}
                              placeholder="Mover para Categoria..."
                              className="px-3 py-1 liquid-glass-well rounded-lg text-xs text-white w-44 focus:outline-none"
                            />
                            <input
                              type="text"
                              value={bulkTagAssign}
                              onChange={(e) => setBulkTagAssign(e.target.value)}
                              placeholder="Adicionar Tag..."
                              className="px-3 py-1 liquid-glass-well rounded-lg text-xs text-white w-36 focus:outline-none"
                            />
                            <button
                              onClick={handleApplyBulkCategoryAndTag}
                              className="px-3 py-1 btn-monochrome-primary text-xs rounded-lg cursor-pointer whitespace-nowrap"
                            >
                              Aplicar ({selectedGalleryIds.length})
                            </button>
                          </>
                        )}
                      </div>

                      {selectedGalleryIds.length > 0 && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={handleDownloadSelectedGallery}
                            className="flex items-center gap-1.5 px-3 py-1 btn-monochrome-primary text-xs rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Baixar ({selectedGalleryIds.length})
                          </button>
                          <button
                            onClick={handleDeleteSelectedGallery}
                            className="flex items-center gap-1.5 px-3 py-1 btn-liquid-glass text-white text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir ({selectedGalleryIds.length})
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Gallery List */}
                {filteredGallery.length === 0 ? (
                  <div className="p-12 liquid-glass chromatic-border-subtle rounded-2xl text-center space-y-3">
                    <div className="text-sm text-zinc-400">
                      Nenhum áudio encontrado na galeria.
                    </div>
                    <button
                      onClick={() => setActiveScreen('studio')}
                      className="px-4 py-2 btn-monochrome-primary text-xs rounded-lg cursor-pointer"
                    >
                      Ir para o Estúdio de Criação
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(groupedGallery).map(([groupTitle, items]) => (
                      <div key={groupTitle} className="space-y-2">
                        <h3 className="text-sm font-semibold text-zinc-200">
                          {groupTitle} ({items.length})
                        </h3>
                        <div className="liquid-glass chromatic-border-subtle rounded-2xl divide-y divide-white/10 overflow-hidden">
                          {items.map((item) => {
                            const isPlaying = playingItemId === item.id;
                            const isChecked = selectedGalleryIds.includes(item.id);
                            return (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-white/[0.04] transition-colors"
                              >
                                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                                  <button
                                    onClick={() => toggleSelectGalleryItem(item.id)}
                                    className="text-zinc-400 hover:text-white cursor-pointer shrink-0"
                                  >
                                    {isChecked ? (
                                      <CheckSquare className="w-4 h-4 text-white" />
                                    ) : (
                                      <Square className="w-4 h-4" />
                                    )}
                                  </button>

                                  <button
                                    onClick={() => playGalleryItem(item)}
                                    className={`p-2.5 rounded-full cursor-pointer shrink-0 transition-colors ${
                                      isPlaying
                                        ? 'btn-monochrome-primary'
                                        : 'btn-liquid-glass'
                                    }`}
                                  >
                                    {isPlaying ? (
                                      <Pause className="w-4 h-4" />
                                    ) : (
                                      <Play className="w-4 h-4" />
                                    )}
                                  </button>

                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium text-white truncate">
                                      {item.taggedText}
                                    </div>
                                    <div className="text-xs text-zinc-400 mt-0.5 font-mono tabular-nums">
                                      {item.batchLabel ? `${item.batchLabel} · ` : ''}
                                      {item.voiceName} · {item.category || 'Geral'} · {item.modelId} ·{' '}
                                      {item.durationSec}s
                                      {item.tagsUsed.length > 0
                                        ? ` · ${item.tagsUsed.join(' ')}`
                                        : ''}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => downloadAudioItem(item)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 btn-liquid-glass text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                    Baixar
                                  </button>
                                  <button
                                    onClick={() =>
                                      setGallery((prev) => prev.filter((x) => x.id !== item.id))
                                    }
                                    className="p-1.5 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                                    title="Excluir áudio"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==============================================================
                TELA 4: CONFIGURAÇÃO SEQUENCIAL DA API FISH AUDIO
               ============================================================== */}
            {activeScreen === 'api_config' && (
              <div className="p-6 liquid-glass chromatic-border-subtle rounded-2xl space-y-6">
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Fluxo Sequencial de Configuração Fish Audio API
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Importe ou edite sua chave, salve a configuração e carregue suas vozes Favoritas e em Português.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Passo 1 */}
                  <div className="p-4 liquid-glass-well rounded-xl space-y-3">
                    <div className="text-xs font-semibold text-zinc-200">
                      01. Importar Arquivo de Chave (.env, .json, .txt) ou Colar Chave API
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={configFileInputRef}
                        type="file"
                        accept=".env,.json,.txt"
                        onChange={handleImportConfigFile}
                        className="hidden"
                      />
                      <button
                        onClick={() => configFileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 btn-liquid-glass text-xs font-medium rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        <Upload className="w-4 h-4 text-white" />
                        Importar Arquivo API
                      </button>

                      <input
                        type="text"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder="sk-fish-..."
                        className="flex-1 min-w-[240px] px-3.5 py-2 liquid-glass-well rounded-lg text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Passo 2 e 3 na sequência */}
                  <div className="p-4 liquid-glass-well rounded-xl flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-zinc-200">
                        02. Salvar Chave e Sincronizar Vozes da Conta
                      </div>
                      <div className="text-xs text-zinc-400">
                        {voicesLoadMessage || apiKeySavedStatus}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleSaveApiConfig}
                        className="flex items-center gap-2 px-4 py-2 btn-liquid-glass text-xs font-semibold rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        <Check className="w-4 h-4 text-white" />
                        Salvar API
                      </button>

                      <button
                        onClick={async () => {
                          await handleLoadPortugueseVoices();
                          setActiveScreen('voices');
                        }}
                        disabled={isLoadingVoices}
                        className="flex items-center gap-2 px-5 py-2 btn-monochrome-primary disabled:opacity-40 text-xs rounded-lg cursor-pointer whitespace-nowrap"
                      >
                        {isLoadingVoices ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Carregar Vozes & Abrir Seletor ({voices.length})
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ====================================================================
          MODAL "SELECIONAR VOZ" IDÊNTICO AO FISH AUDIO (LIQUID GLASS + CHROMATIC CONTOUR)
         ==================================================================== */}
      {isVoicePickerModalOpen && (
        <div
          onClick={() => setIsVoicePickerModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl max-h-[90vh] liquid-glass-elevated chromatic-border rounded-2xl flex flex-col overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-white/10 shrink-0">
              <h2 className="text-lg font-bold text-white">Selecionar voz</h2>
              <button
                type="button"
                onClick={() => setIsVoicePickerModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-7">
              {renderFishVoiceSelector(true)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const FishAudioModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;
  return <FishAudioApp onSwitchToArena={onClose} />;
};
