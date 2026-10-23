import React, { useRef, useState, useMemo, useEffect } from 'react';
import { PlayerConfig, MapProject, GalleryAsset } from '../../types/map';
import {
  parseMasterFolderSubfolders,
  parseDirectionalFolderFiles,
  SpriteDirection4Way,
} from '../../utils/directionalSpriteImporter';
import {
  CharacterNpcPresetMode,
  createCharacterFromDirectionalPack,
  createNpcMarkerFromCharacter,
  buildCharacterNpcBehavior,
} from '../../utils/characterHelpers';
import {
  FolderPlus,
  FolderOpen,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Search,
  Edit3,
  Footprints,
  Star,
  UserCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';

interface CharacterGalleryStudioProps {
  characters: PlayerConfig[];
  selectedCharacterId: string;
  project: MapProject;
  onSelectCharacter: (charId: string, openTab?: 'visual' | 'motion_rig') => void;
  onSaveCharactersRoster: (nextRoster: PlayerConfig[]) => void;
  onApplyAsPlayer: (char: PlayerConfig) => void;
  onUpdateProject: React.Dispatch<React.SetStateAction<MapProject>>;
  showToast: (msg: string) => void;
}

const PRESET_MODES: {
  id: CharacterNpcPresetMode;
  label: string;
  shortLabel: string;
  desc: string;
}[] = [
  {
    id: 'passive_action_procedural',
    label: 'Passivo Procedural',
    shortLabel: 'Passivo',
    desc: 'Caminha livremente nas 4 direções com reação pacífica.',
  },
  {
    id: 'curious_action_procedural',
    label: 'Curioso Procedural',
    shortLabel: 'Curioso',
    desc: 'Explora o mapa e aproxima-se do jogador.',
  },
  {
    id: 'hostile_action',
    label: 'Action Hostil',
    shortLabel: 'Hostil',
    desc: 'Patrulha a área e inicia combate ao detectar o jogador.',
  },
  {
    id: 'patrol_procedural',
    label: 'Apenas Caminhada',
    shortLabel: 'Patrulha',
    desc: 'Caminha proceduralmente nas 4 direções com diálogo.',
  },
];

const DIRECTIONS_ORDER: SpriteDirection4Way[] = ['down', 'left', 'right', 'up'];
const DIRECTION_LABELS: Record<SpriteDirection4Way, string> = {
  down: 'Frente',
  left: 'Esq',
  right: 'Dir',
  up: 'Costas',
};

export const CharacterGalleryStudio: React.FC<CharacterGalleryStudioProps> = ({
  characters,
  selectedCharacterId,
  project,
  onSelectCharacter,
  onSaveCharactersRoster,
  onApplyAsPlayer,
  onUpdateProject,
  showToast,
}) => {
  const masterFolderInputRef = useRef<HTMLInputElement>(null);
  const singleFolderInputRef = useRef<HTMLInputElement>(null);

  const [defaultImportMode, setDefaultImportMode] = useState<CharacterNpcPresetMode>(
    'passive_action_procedural'
  );
  const [autoSpawnOnImport, setAutoSpawnOnImport] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | CharacterNpcPresetMode | 'on_map'>('all');
  const [hoveredCardId, setHoveredCardId] = useState<string | null>(null);
  const [hoverTick, setHoverTick] = useState<number>(0);
  const [manualDirectionByCard, setManualDirectionByCard] = useState<
    Record<string, SpriteDirection4Way>
  >({});
  const [lastImportSummary, setLastImportSummary] = useState<{
    masterName: string;
    count: number;
    totalPngs: number;
    spawnedCount: number;
  } | null>(null);

  // Anima automaticamente as 4 direções apenas no card que está sob o mouse (se o usuário não fixou uma direção)
  useEffect(() => {
    if (!hoveredCardId) return;
    const timer = window.setInterval(() => {
      setHoverTick((t) => (t + 1) % 4);
    }, 520);
    return () => window.clearInterval(timer);
  }, [hoveredCardId]);

  const selectedCharacter = useMemo(
    () => characters.find((c) => c.id === selectedCharacterId) || characters[0],
    [characters, selectedCharacterId]
  );

  // Importa Pasta Mestra (várias subpastas -> cada subpasta vira 1 personagem 4 direções)
  const handleMasterFolderFiles = async (fileList: FileList | File[]) => {
    setIsImporting(true);
    try {
      const result = await parseMasterFolderSubfolders(fileList);
      if (result.packs.length === 0) {
        showToast('Nenhuma imagem PNG/WebP encontrada nas pastas selecionadas.');
        setIsImporting(false);
        return;
      }

      const createdCharacters: PlayerConfig[] = [];
      const newGalleryAssets: GalleryAsset[] = [];

      result.packs.forEach((pack, idx) => {
        const newChar = createCharacterFromDirectionalPack(
          pack,
          characters.length + idx,
          defaultImportMode
        );
        createdCharacters.push(newChar);

        for (const item of pack.loadedAssets) {
          newGalleryAssets.push({
            id: `asset-charfolder-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            name: `${newChar.name} (${item.assignedDir || 'sprite'})`,
            dataUrl: item.dataUrl,
            width: item.width,
            height: item.height,
            category: newChar.name,
            tags: ['personagem', 'npc-action', '4-direcoes', item.assignedDir || 'down'],
            createdAt: new Date().toISOString(),
          });
        }
      });

      const nextRoster = [...createdCharacters, ...characters];
      onSaveCharactersRoster(nextRoster);

      let spawnedCount = 0;
      const basePlayerX = project.player?.x ?? 384;
      const basePlayerY = project.player?.y ?? 200;
      const isExtended =
        project.canvasKind === 'extended' ||
        ((project.subBiomes || []).length > 0 && (project.biomes || []).length === 0);
      const defaultSubBiomeId = isExtended ? project.subBiomes?.[0]?.id : undefined;
      const defaultBiomeId = !isExtended ? project.biomes?.[0]?.id : undefined;
      const defaultLayerId =
        project.activeMarkerLayerId || project.markerLayers?.[0]?.id || 'layer-default';

      const spawnedMarkers = autoSpawnOnImport
        ? createdCharacters.map((char, idx) => {
            spawnedCount++;
            const col = idx % 4;
            const row = Math.floor(idx / 4);
            const offsetX = (col - 1.5) * 105;
            const offsetY = 95 + row * 105;
            const spawnX = Math.max(64, Math.min(700, Math.round(basePlayerX + offsetX)));
            const spawnY = Math.max(80, Math.round(basePlayerY + offsetY));

            return createNpcMarkerFromCharacter(char, {
              x: spawnX,
              y: spawnY,
              biomeId: defaultBiomeId,
              subBiomeId: defaultSubBiomeId,
              layerId: defaultLayerId,
              presetMode: defaultImportMode,
            });
          })
        : [];

      onUpdateProject((prev) => ({
        ...prev,
        savedCharacters: nextRoster,
        galleryAssets: [...newGalleryAssets, ...(prev.galleryAssets || [])],
        ...(spawnedMarkers.length > 0
          ? { markers: [...prev.markers, ...spawnedMarkers] }
          : {}),
      }));

      if (createdCharacters[0]) {
        onSelectCharacter(createdCharacters[0].id);
      }

      setLastImportSummary({
        masterName: result.masterFolderName || 'Pasta Mestra',
        count: createdCharacters.length,
        totalPngs: result.totalFilesRead,
        spawnedCount,
      });

      showToast(
        `${createdCharacters.length} personagens importados de "${result.masterFolderName}"!`
      );
    } catch (err) {
      console.error('Erro ao importar Pasta Mestra:', err);
      showToast('Erro ao ler subpastas da Pasta Mestra.');
    } finally {
      setIsImporting(false);
    }
  };

  // Importa 1 pasta única com 4 PNGs
  const handleSingleFolderImport = async (fileList: FileList | File[]) => {
    setIsImporting(true);
    try {
      const pack = await parseDirectionalFolderFiles(fileList);
      if (!pack.defaultPng) {
        showToast('Nenhuma imagem PNG encontrada na pasta.');
        setIsImporting(false);
        return;
      }
      const newChar = createCharacterFromDirectionalPack(
        pack,
        characters.length,
        defaultImportMode
      );
      const nextRoster = [newChar, ...characters];
      onSaveCharactersRoster(nextRoster);
      onSelectCharacter(newChar.id);
      showToast(`"${newChar.name}" importado com ${pack.loadedAssets.length}/4 direções.`);
    } finally {
      setIsImporting(false);
    }
  };

  // Insere 1 personagem no mapa atual como NPC Action Procedural
  const handleSpawnCharacterAsNpcInPhase = (
    char: PlayerConfig,
    modeOverride?: CharacterNpcPresetMode
  ) => {
    const basePlayerX = project.player?.x ?? 384;
    const basePlayerY = project.player?.y ?? 200;
    const isExtended =
      project.canvasKind === 'extended' ||
      ((project.subBiomes || []).length > 0 && (project.biomes || []).length === 0);
    const defaultSubBiomeId = isExtended ? project.subBiomes?.[0]?.id : undefined;
    const defaultBiomeId = !isExtended ? project.biomes?.[0]?.id : undefined;
    const defaultLayerId =
      project.activeMarkerLayerId || project.markerLayers?.[0]?.id || 'layer-default';

    const existingSameCount = (project.markers || []).filter(
      (m) => m.type === 'npc' && m.name.toLowerCase().startsWith(char.name.toLowerCase())
    ).length;
    const angle = existingSameCount * 1.15;
    const radius = 75 + existingSameCount * 28;
    const spawnX = Math.max(56, Math.min(710, Math.round(basePlayerX + Math.cos(angle) * radius)));
    const spawnY = Math.max(70, Math.round(basePlayerY + 80 + Math.sin(angle) * radius));

    const npcMarker = createNpcMarkerFromCharacter(char, {
      x: spawnX,
      y: spawnY,
      biomeId: defaultBiomeId,
      subBiomeId: defaultSubBiomeId,
      layerId: defaultLayerId,
      presetMode: modeOverride || char.npcPresetMode || 'passive_action_procedural',
    });

    onUpdateProject((prev) => ({
      ...prev,
      markers: [...prev.markers, npcMarker],
    }));

    showToast(`"${char.name}" adicionado na fase (X:${spawnX}, Y:${spawnY}).`);
  };

  // Espalha os personagens filtrados na fase atual
  const handleSpawnAllFilteredInPhase = () => {
    if (filteredCharacters.length === 0) return;
    const basePlayerX = project.player?.x ?? 384;
    const basePlayerY = project.player?.y ?? 200;
    const isExtended =
      project.canvasKind === 'extended' ||
      ((project.subBiomes || []).length > 0 && (project.biomes || []).length === 0);
    const defaultSubBiomeId = isExtended ? project.subBiomes?.[0]?.id : undefined;
    const defaultBiomeId = !isExtended ? project.biomes?.[0]?.id : undefined;
    const defaultLayerId =
      project.activeMarkerLayerId || project.markerLayers?.[0]?.id || 'layer-default';

    const newMarkers = filteredCharacters.map((char, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const spawnX = Math.max(64, Math.min(700, Math.round(basePlayerX + (col - 1.5) * 115)));
      const spawnY = Math.max(80, Math.round(basePlayerY + 95 + row * 110));

      return createNpcMarkerFromCharacter(char, {
        x: spawnX,
        y: spawnY,
        biomeId: defaultBiomeId,
        subBiomeId: defaultSubBiomeId,
        layerId: defaultLayerId,
        presetMode: char.npcPresetMode || defaultImportMode,
      });
    });

    onUpdateProject((prev) => ({
      ...prev,
      markers: [...prev.markers, ...newMarkers],
    }));

    showToast(`${newMarkers.length} NPCs posicionados na fase com caminhada procedural.`);
  };

  // Atualiza o modo de comportamento padrão de um personagem
  const handleChangeCharacterPresetMode = (char: PlayerConfig, nextMode: CharacterNpcPresetMode) => {
    const { actionNpc, npcPatrol } = buildCharacterNpcBehavior(
      char,
      char.x || 384,
      char.y || 180,
      nextMode
    );
    const nextRoster = characters.map((c) =>
      c.id === char.id
        ? {
            ...c,
            npcPresetMode: nextMode,
            role:
              nextMode === 'hostile_action'
                ? 'Action Hostil'
                : nextMode === 'curious_action_procedural'
                ? 'Action Curioso'
                : nextMode === 'patrol_procedural'
                ? 'Patrulha'
                : 'Passivo Procedural',
            defaultActionNpc: actionNpc,
            defaultNpcPatrol: npcPatrol,
          }
        : c
    );
    onSaveCharactersRoster(nextRoster);
  };

  // Remove um personagem da galeria
  const handleDeleteCharacterCard = (char: PlayerConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    if (characters.length <= 1) {
      showToast('Mantenha pelo menos 1 personagem na galeria.');
      return;
    }
    const nextRoster = characters.filter((c) => c.id !== char.id);
    onSaveCharactersRoster(nextRoster);
    if (selectedCharacterId === char.id && nextRoster[0]) {
      onSelectCharacter(nextRoster[0].id);
    }
    showToast(`"${char.name}" removido da galeria.`);
  };

  // Mapa rápido de quantos NPCs de cada nome estão na fase
  const mapCountsByName = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of project.markers || []) {
      if (m.type === 'npc' && m.name) {
        const key = m.name.toLowerCase();
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [project.markers]);

  const filteredCharacters = useMemo(() => {
    return characters.filter((c) => {
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchName = c.name.toLowerCase().includes(q);
        const matchRole = (c.role || '').toLowerCase().includes(q);
        const matchSub = (c.sourceSubfolder || '').toLowerCase().includes(q);
        if (!matchName && !matchRole && !matchSub) return false;
      }
      if (filterMode === 'on_map') {
        return (mapCountsByName[c.name.toLowerCase()] || 0) > 0;
      }
      if (filterMode !== 'all') {
        return (c.npcPresetMode || 'passive_action_procedural') === filterMode;
      }
      return true;
    });
  }, [characters, searchQuery, filterMode, mapCountsByName]);

  const getCharDirectionalSprite = (
    char: PlayerConfig,
    dir: SpriteDirection4Way
  ): string | undefined => {
    if (dir === 'down') return char.avatarDownPng || char.avatarPng;
    if (dir === 'up') return char.avatarUpPng || char.avatarPng;
    if (dir === 'left') return char.avatarLeftPng || char.avatarPng;
    if (dir === 'right') return char.avatarRightPng || char.avatarPng;
    return char.avatarPng;
  };

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingOver(true);
        }
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={(e) => {
        setIsDraggingOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleMasterFolderFiles(e.dataTransfer.files);
        }
      }}
      className="space-y-3"
    >
      {/* Inputs ocultos de arquivo/pasta */}
      <input
        ref={masterFolderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleMasterFolderFiles(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={singleFolderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleSingleFolderImport(e.target.files);
          }
          e.target.value = '';
        }}
      />

      {/* 1. BARRA SUPERIOR COMPACTA: IMPORTAÇÃO DE PASTA MESTRA + BUSCA + FILTROS */}
      <div
        className={`p-3 rounded-xl border transition-colors space-y-2.5 ${
          isDraggingOver
            ? 'bg-emerald-950/40 border-emerald-400'
            : 'bg-zinc-950 border-zinc-800/90'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Busca Rápida */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Buscar em ${characters.length} personagens...`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Botões de Importação e Ação em Lote */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isImporting}
              onClick={() => masterFolderInputRef.current?.click()}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Selecione uma Pasta Mestra com várias subpastas (cada subpasta vira 1 personagem com 4 direções)"
            >
              <FolderPlus className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>
                {isImporting ? 'Importando...' : 'Importar Pasta Mestra'}
              </span>
            </button>

            <button
              type="button"
              disabled={isImporting}
              onClick={() => singleFolderInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Importar uma única pasta contendo os 4 PNGs direcionais de 1 personagem"
            >
              <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
              <span>1 Pasta (4 PNGs)</span>
            </button>

            <button
              type="button"
              onClick={handleSpawnAllFilteredInPhase}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-300 font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
              title="Insere todos os personagens listados abaixo na fase atual com caminhada procedural"
            >
              <Footprints className="w-3.5 h-3.5 text-amber-400" />
              <span>Espalhar na Fase ({filteredCharacters.length})</span>
            </button>
          </div>
        </div>

        {/* Segunda Linha Compacta: Filtros de Visualização + Padrão de Importação */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-900 text-xs">
          {/* Abas de Filtro */}
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {[
              { id: 'all', label: `Todos (${characters.length})` },
              { id: 'on_map', label: 'Na Fase Atual' },
              { id: 'passive_action_procedural', label: 'Passivos' },
              { id: 'curious_action_procedural', label: 'Curiosos' },
              { id: 'hostile_action', label: 'Hostis' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterMode(tab.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  filterMode === tab.id
                    ? 'bg-zinc-800 text-white font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Padrão ao Importar */}
          <div className="flex items-center gap-3 text-[11px] text-zinc-400">
            <label className="flex items-center gap-1.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoSpawnOnImport}
                onChange={(e) => setAutoSpawnOnImport(e.target.checked)}
                className="accent-emerald-500 rounded cursor-pointer"
              />
              <span>Auto-inserir na fase ao importar</span>
            </label>

            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 hidden sm:inline">Padrão do lote:</span>
              <select
                value={defaultImportMode}
                onChange={(e) =>
                  setDefaultImportMode(e.target.value as CharacterNpcPresetMode)
                }
                className="bg-zinc-900 border border-zinc-800 rounded-md px-2 py-0.5 text-[11px] text-zinc-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {PRESET_MODES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Aviso enxuto de importação concluída */}
        {lastImportSummary && (
          <div className="px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/30 flex items-center justify-between gap-2 text-xs text-emerald-200">
            <div className="flex items-center gap-2 truncate">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="truncate">
                Pasta <strong>{lastImportSummary.masterName}</strong>: {lastImportSummary.count} personagens criados ({lastImportSummary.totalPngs} PNGs).
              </span>
            </div>
            <button
              type="button"
              onClick={() => setLastImportSummary(null)}
              className="text-emerald-300 hover:text-white text-[11px] font-semibold px-1.5 cursor-pointer shrink-0"
            >
              Fechar
            </button>
          </div>
        )}
      </div>

      {/* 2. BARRA DO PERSONAGEM SELECIONADO (INSPETOR COMPACTO EM 1 LINHA) */}
      {selectedCharacter && (
        <div className="px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800/90 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-lg bg-zinc-900 border border-zinc-700/80 flex items-center justify-center p-1 shrink-0">
              {selectedCharacter.avatarDownPng || selectedCharacter.avatarPng ? (
                <img
                  src={selectedCharacter.avatarDownPng || selectedCharacter.avatarPng}
                  alt={selectedCharacter.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-sm font-bold text-zinc-400">
                  {selectedCharacter.name.charAt(0)}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white truncate">
                  {selectedCharacter.name}
                </span>
                <span className="text-xs text-zinc-500">·</span>
                <span className="text-xs text-zinc-400 tabular-nums whitespace-nowrap">
                  {[
                    selectedCharacter.avatarDownPng,
                    selectedCharacter.avatarUpPng,
                    selectedCharacter.avatarLeftPng,
                    selectedCharacter.avatarRightPng,
                  ].filter(Boolean).length || 1}
                  /4 direções
                </span>
              </div>

              {/* Mini-preview das 4 direções do personagem selecionado */}
              <div className="flex items-center gap-2 mt-1">
                {DIRECTIONS_ORDER.map((dir) => {
                  const sprite = getCharDirectionalSprite(selectedCharacter, dir);
                  return (
                    <div
                      key={dir}
                      className="flex items-center gap-1 text-[10px] text-zinc-500"
                      title={`Sprite: ${DIRECTION_LABELS[dir]}`}
                    >
                      <div className="w-4 h-4 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                        {sprite ? (
                          <img
                            src={sprite}
                            alt={dir}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span>-</span>
                        )}
                      </div>
                      <span>{DIRECTION_LABELS[dir]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Controles do Personagem Selecionado */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
              <SlidersHorizontal className="w-3 h-3 text-zinc-400" />
              <select
                value={selectedCharacter.npcPresetMode || 'passive_action_procedural'}
                onChange={(e) =>
                  handleChangeCharacterPresetMode(
                    selectedCharacter,
                    e.target.value as CharacterNpcPresetMode
                  )
                }
                className="bg-transparent text-xs text-zinc-200 font-medium focus:outline-none cursor-pointer"
                title="Comportamento ao inserir como NPC na fase"
              >
                {PRESET_MODES.map((pm) => (
                  <option key={pm.id} value={pm.id} className="bg-zinc-900 text-white">
                    IA: {pm.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleSpawnCharacterAsNpcInPhase(selectedCharacter)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Inserir NPC na Fase</span>
            </button>

            <button
              type="button"
              onClick={() => onApplyAsPlayer(selectedCharacter)}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-200 font-medium text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            >
              <UserCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Usar como Player</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectCharacter(selectedCharacter.id, 'visual')}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Edit3 className="w-3.5 h-3.5 text-sky-400" />
              <span>Sprites</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectCharacter(selectedCharacter.id, 'motion_rig')}
              className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white text-xs flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
              <span>Motion</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. GRADE VISUAL ASSET-FIRST (FOCO TOTAL NOS SPRITES) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
        {filteredCharacters.map((char) => {
          const isSelected = char.id === selectedCharacterId;
          const isCurrentHero =
            project.activeCharacterId === char.id ||
            project.player?.id === char.id ||
            project.player?.name === char.name;
          const isHovered = hoveredCardId === char.id;
          const manualDir = manualDirectionByCard[char.id];
          const activeDir: SpriteDirection4Way =
            manualDir || (isHovered ? DIRECTIONS_ORDER[hoverTick] : 'down');
          const previewUrl = getCharDirectionalSprite(char, activeDir);

          const presetMode: CharacterNpcPresetMode =
            char.npcPresetMode || 'passive_action_procedural';
          const presetMeta =
            PRESET_MODES.find((m) => m.id === presetMode) || PRESET_MODES[0];
          const mapCount = mapCountsByName[char.name.toLowerCase()] || 0;

          return (
            <div
              key={char.id}
              onClick={() => onSelectCharacter(char.id)}
              onMouseEnter={() => setHoveredCardId(char.id)}
              onMouseLeave={() => setHoveredCardId((prev) => (prev === char.id ? null : prev))}
              className={`group rounded-xl border transition-all cursor-pointer flex flex-col overflow-hidden ${
                isSelected
                  ? 'bg-zinc-900/95 border-emerald-400 ring-1 ring-emerald-400/30'
                  : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {/* PALCO DO ASSET (GRANDE, LIMPO, SEM POLUIÇÃO) */}
              <div className="relative aspect-square w-full bg-zinc-900/60 flex items-center justify-center p-4 overflow-hidden">
                {previewUrl ? (
                  <img
                    src={previewUrl}
                    alt={char.name}
                    referrerPolicy="no-referrer"
                    className={`w-full h-full object-contain transition-transform duration-150 ${
                      isHovered ? 'scale-110 animate-jelly-step-moving' : ''
                    }`}
                    style={isHovered ? { animationDuration: '0.62s' } : undefined}
                  />
                ) : (
                  <span className="text-3xl font-bold text-zinc-600">
                    {char.name.charAt(0)}
                  </span>
                )}

                {/* Indicador discreto de Player ou quantidade no mapa */}
                {(isCurrentHero || mapCount > 0) && (
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 text-[10px] font-medium text-zinc-300 bg-zinc-950/85 px-2 py-0.5 rounded">
                    {isCurrentHero && <span className="text-amber-400">Player</span>}
                    {isCurrentHero && mapCount > 0 && <span>·</span>}
                    {mapCount > 0 && (
                      <span className="text-emerald-400 tabular-nums">{mapCount} no mapa</span>
                    )}
                  </div>
                )}

                {/* Botão discreto de excluir (apenas no hover) */}
                {characters.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCharacterCard(char, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-md bg-zinc-950/80 hover:bg-red-950/90 text-zinc-400 hover:text-red-300 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Remover personagem da galeria"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Strip das 4 Direções (aparece suavemente no rodapé da imagem apenas no hover) */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute inset-x-2 bottom-2 grid grid-cols-4 gap-1 bg-zinc-950/90 p-1 rounded-lg border border-zinc-800/80 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {DIRECTIONS_ORDER.map((dir) => {
                    const thumb = getCharDirectionalSprite(char, dir);
                    const isDirActive = activeDir === dir;
                    return (
                      <button
                        key={dir}
                        type="button"
                        onClick={() =>
                          setManualDirectionByCard((prev) => ({
                            ...prev,
                            [char.id]: dir,
                          }))
                        }
                        className={`h-7 rounded flex items-center justify-center p-0.5 cursor-pointer transition-colors ${
                          isDirActive
                            ? 'bg-emerald-500/25 ring-1 ring-emerald-400'
                            : 'hover:bg-zinc-800'
                        }`}
                        title={`Direção: ${DIRECTION_LABELS[dir]}`}
                      >
                        {thumb ? (
                          <img
                            src={thumb}
                            alt={dir}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] text-zinc-500">
                            {DIRECTION_LABELS[dir][0]}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RODAPÉ LIMPO DO CARD: NOME + 1 AÇÃO DIRETA */}
              <div className="p-2.5 border-t border-zinc-900 flex flex-col gap-2">
                <div className="min-w-0">
                  <h4
                    className="text-xs font-semibold text-zinc-100 truncate"
                    title={char.name}
                  >
                    {char.name}
                  </h4>
                  <div className="flex items-center gap-1.5 text-[10px] text-zinc-500 mt-0.5">
                    <span>{presetMeta.shortLabel}</span>
                    <span>·</span>
                    <span className="tabular-nums">4 dir</span>
                  </div>
                </div>

                {/* Linha única de ação rápida */}
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-1.5"
                >
                  <button
                    type="button"
                    onClick={() => handleSpawnCharacterAsNpcInPhase(char)}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500 text-emerald-300 hover:text-zinc-950 border border-emerald-500/30 hover:border-emerald-400 font-semibold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                    title="Inserir na fase atual como NPC com caminhada procedural"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.2]" />
                    <span>Na Fase</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onApplyAsPlayer(char)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isCurrentHero
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-zinc-900 hover:bg-zinc-800 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                    title="Usar como Player da Fase"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectCharacter(char.id, 'visual')}
                    className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                    title="Editar Sprites e Física"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
