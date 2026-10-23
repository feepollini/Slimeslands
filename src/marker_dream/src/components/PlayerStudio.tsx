import React, { useRef, useState, useMemo } from 'react';
import { PlayerConfig, GalleryAsset, MapProject, PlayerPetCatalogItem, getResolvedPlayerPetConfig } from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import { User, Users, Upload, X, Shield, Move, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, FolderOpen, CheckCircle2, Package, Sparkles, Crosshair, Plus, Trash2, Zap, Swords } from 'lucide-react';
import { AssetGalleryModal } from './AssetGalleryModal';
import { MotionAssetCanvas } from './MotionAssetCanvas';
import { loadCharactersRoster, applyCharacterToPhase } from '../utils/characterHelpers';
import { InteractiveItemGalleryStudio } from './inventory/InteractiveItemGalleryStudio';
import { parseDirectionalFolderFiles } from '../utils/directionalSpriteImporter';

interface Props {
  player: PlayerConfig;
  onUpdatePlayer: (updates: Partial<PlayerConfig>) => void;
  onCenterCameraOnPlayer: () => void;
  galleryAssets?: GalleryAsset[];
  galleryCategories?: string[];
  onUploadNewAsset?: (newAsset: GalleryAsset) => void;
  project?: MapProject;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
  onApplyCharacter?: (character: PlayerConfig) => void;
  onOpenCharactersEditor?: () => void;
  onOpenInventoryEditor?: () => void;
  onOpenPetStudio?: () => void;
  showToast?: (msg: string) => void;
}

export const PlayerStudio: React.FC<Props> = ({
  player,
  onUpdatePlayer,
  onCenterCameraOnPlayer,
  galleryAssets = [],
  galleryCategories = [],
  onUploadNewAsset,
  project,
  onUpdateProject,
  onApplyCharacter,
  onOpenCharactersEditor,
  onOpenInventoryEditor,
  onOpenPetStudio,
  showToast,
}) => {
  const characters = useMemo(() => loadCharactersRoster(project), [project]);
  const activeChar = characters.find((c) => c.id === player.id || c.name === player.name) || characters[0];

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const petFileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingDirection, setUploadingDirection] = useState<'default' | 'up' | 'down' | 'left' | 'right'>('default');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryTargetDirection, setGalleryTargetDirection] = useState<'default' | 'up' | 'down' | 'left' | 'right' | 'pet'>('default');
  const [isTestSpawnExpanded, setIsTestSpawnExpanded] = useState(true);

  const resolvedPet = useMemo(() => getResolvedPlayerPetConfig(player), [player]);
  const [editingPetId, setEditingPetId] = useState<string>(
    () => resolvedPet.activePetId || resolvedPet.petGallery[0]?.id || 'pet-drake-solar'
  );

  const editingPet: PlayerPetCatalogItem = useMemo(() => {
    return (
      resolvedPet.petGallery.find((p) => p.id === editingPetId) ||
      resolvedPet.activePet ||
      resolvedPet.petGallery[0]
    );
  }, [resolvedPet.petGallery, resolvedPet.activePet, editingPetId]);

  const updatePetGalleryAndActive = (
    updatedGallery: PlayerPetCatalogItem[],
    nextActiveId?: string | null,
    nextEnabled?: boolean,
    customEquippedIds?: [string | null, string | null, string | null],
    customActiveSlotIdx?: 0 | 1 | 2
  ) => {
    const targetActiveId =
      nextActiveId !== undefined ? nextActiveId : resolvedPet.activePetId || updatedGallery[0]?.id || null;
    const activeCatalogItem = targetActiveId
      ? updatedGallery.find((p) => p.id === targetActiveId) || updatedGallery[0]
      : null;
    const isEnabled = nextEnabled !== undefined ? nextEnabled : resolvedPet.enabled;

    const nextEquippedIds: [string | null, string | null, string | null] = customEquippedIds
      ? [...customEquippedIds]
      : [...resolvedPet.equippedPetIds];
    const nextSlotIdx: 0 | 1 | 2 =
      customActiveSlotIdx !== undefined ? customActiveSlotIdx : resolvedPet.activePetSlotIndex;

    if (targetActiveId && !customEquippedIds) {
      const existingIdx = nextEquippedIds.indexOf(targetActiveId);
      if (existingIdx === -1) {
        nextEquippedIds[nextSlotIdx] = targetActiveId;
      }
    }

    onUpdatePlayer({
      petConfig: {
        ...(player.petConfig || {}),
        enabled: isEnabled,
        activePetId: targetActiveId,
        equippedPetIds: nextEquippedIds,
        activePetSlotIndex: nextSlotIdx,
        petGallery: updatedGallery,
        ...(activeCatalogItem
          ? {
              name: activeCatalogItem.name,
              iconEmoji: activeCatalogItem.iconEmoji,
              avatarPng: activeCatalogItem.avatarPng,
              scale: activeCatalogItem.scale,
              followLagSteps: activeCatalogItem.followLagSteps ?? 12,
              curiousRadius: activeCatalogItem.curiousRadius ?? 48,
              curiousSpeed: activeCatalogItem.curiousSpeed ?? 1.0,
              attackDamage: activeCatalogItem.attackDamage,
              attackRange: activeCatalogItem.attackRange,
              color: activeCatalogItem.color || '#f59e0b',
            }
          : {}),
      },
    });
  };

  const handleEquipPetToSlot = (petId: string, slotIdx: 0 | 1 | 2) => {
    const nextSlots: [string | null, string | null, string | null] = [...resolvedPet.equippedPetIds];
    const existingIdx = nextSlots.indexOf(petId);
    if (existingIdx !== -1 && existingIdx !== slotIdx) {
      nextSlots[existingIdx] = nextSlots[slotIdx];
    }
    nextSlots[slotIdx] = petId;
    updatePetGalleryAndActive(resolvedPet.petGallery, petId, true, nextSlots, slotIdx);
    const petObj = resolvedPet.petGallery.find((p) => p.id === petId);
    showToast?.(`🐾 "${petObj?.name || 'Pet'}" equipado no Slot ${slotIdx + 1} do Deck/Mochila!`);
  };

  const handleUpdateSinglePetInGallery = (petId: string, patch: Partial<PlayerPetCatalogItem>) => {
    const nextGallery = resolvedPet.petGallery.map((p) =>
      p.id === petId ? { ...p, ...patch } : p
    );
    updatePetGalleryAndActive(nextGallery);
  };

  const handleUploadPetPng = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPet) return;
    try {
      const res = await readUploadedImage(file);
      handleUpdateSinglePetInGallery(editingPet.id, { avatarPng: res.dataUrl });
      showToast?.(`🐾 PNG aplicado ao pet ${editingPet.name}!`);
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleUploadAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await readUploadedImage(file);
      if (uploadingDirection === 'up') onUpdatePlayer({ avatarUpPng: res.dataUrl });
      else if (uploadingDirection === 'down') onUpdatePlayer({ avatarDownPng: res.dataUrl });
      else if (uploadingDirection === 'left') onUpdatePlayer({ avatarLeftPng: res.dataUrl });
      else if (uploadingDirection === 'right') onUpdatePlayer({ avatarRightPng: res.dataUrl });
      else onUpdatePlayer({ avatarPng: res.dataUrl });
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleImportPlayerFolder4Directions = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const res = await parseDirectionalFolderFiles(files);
      if (res.assignedCount > 0) {
        onUpdatePlayer({
          avatarDownPng: res.down || player.avatarDownPng,
          avatarUpPng: res.up || player.avatarUpPng,
          avatarLeftPng: res.left || player.avatarLeftPng,
          avatarRightPng: res.right || player.avatarRightPng,
          avatarPng: res.down || res.up || res.left || res.right || player.avatarPng,
        });
        showToast?.(
          `📂 Pasta "${res.folderName || 'Herói'}" importada: ${res.assignedCount} direção(ões) encaixada(s) automaticamente!`
        );
      }
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleSelectGalleryAsset = (dataUrl: string) => {
    const matchedAsset = galleryAssets.find((a) => a.dataUrl === dataUrl);
    const motionLayers =
      matchedAsset?.motionLayers && matchedAsset.motionLayers.length > 0
        ? JSON.parse(JSON.stringify(matchedAsset.motionLayers))
        : undefined;

    const baseLayer = motionLayers?.find((l: any) => l.isBaseAsset);
    const actualBasePng = baseLayer?.pngUrl || dataUrl;

    if (galleryTargetDirection === 'pet') {
      if (editingPet) {
        handleUpdateSinglePetInGallery(editingPet.id, { avatarPng: actualBasePng });
        showToast?.(`🐾 Asset da Galeria aplicado ao pet ${editingPet.name}!`);
      }
      setIsGalleryModalOpen(false);
      return;
    }

    if (galleryTargetDirection === 'up') {
      onUpdatePlayer({ avatarUpPng: actualBasePng });
    } else if (galleryTargetDirection === 'down') {
      onUpdatePlayer({ avatarDownPng: actualBasePng });
    } else if (galleryTargetDirection === 'left') {
      onUpdatePlayer({ avatarLeftPng: actualBasePng });
    } else if (galleryTargetDirection === 'right') {
      onUpdatePlayer({ avatarRightPng: actualBasePng });
    } else {
      // Padrão / Geral: aplica o asset base e as camadas de motion para todas as direções
      onUpdatePlayer({
        avatarPng: actualBasePng,
        avatarDownPng: undefined,
        avatarUpPng: undefined,
        avatarLeftPng: undefined,
        avatarRightPng: undefined,
        motionLayers: motionLayers || undefined,
      });
    }
    setIsGalleryModalOpen(false);
  };

  const AVATAR_COLORS = [
    '#3b82f6', // Blue
    '#eab308', // Amber
    '#ef4444', // Red
    '#10b981', // Emerald
    '#8b5cf6', // Purple
    '#ec4899', // Pink
  ];

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadAvatar}
      />
      <input
        ref={folderInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        multiple
        {...({ webkitdirectory: '', directory: '' } as any)}
        className="hidden"
        onChange={handleImportPlayerFolder4Directions}
      />
      <input
        ref={petFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadPetPng}
      />

      {/* SELETOR DO PERSONAGEM NA FASE (ROSTER MULTI-PERSONAGENS) */}
      <div className="p-3.5 bg-gradient-to-r from-blue-950/60 via-purple-950/40 to-zinc-950 border border-blue-500/40 rounded-xl space-y-2.5 shadow-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5 uppercase tracking-wide">
            <Users className="w-4 h-4 text-blue-400" />
            <span>Personagem Vinculado à Fase</span>
          </span>
          <div className="flex items-center gap-1.5">
            {onOpenInventoryEditor && (
              <button
                type="button"
                onClick={onOpenInventoryEditor}
                className="text-[10px] text-amber-300 hover:text-white bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Abrir o Editor Dedicado de Inventários & Itens do Game"
              >
                <Package className="w-3 h-3 text-amber-400" />
                <span>Editor de Itens</span>
              </button>
            )}
            {onOpenCharactersEditor && (
              <button
                type="button"
                onClick={onOpenCharactersEditor}
                className="text-[10px] text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 px-2.5 py-1 rounded-md font-bold transition-all flex items-center gap-1 cursor-pointer"
                title="Abrir o Editor de Personagens para criar ou customizar múltiplos heróis"
              >
                <span>Personagens</span>
                <span>➔</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={player.characterId || player.id}
            onChange={(e) => {
              const selected = characters.find((c) => c.id === e.target.value);
              if (selected) {
                if (onApplyCharacter) {
                  onApplyCharacter(selected);
                } else {
                  onUpdatePlayer({
                    ...selected,
                    id: selected.id,
                    characterId: selected.id,
                    name: selected.name,
                    avatarPng: selected.avatarPng,
                    avatarUpPng: selected.avatarUpPng,
                    avatarDownPng: selected.avatarDownPng,
                    avatarLeftPng: selected.avatarLeftPng,
                    avatarRightPng: selected.avatarRightPng,
                    scale: selected.scale ?? 1.0,
                    speed: selected.speed ?? 4,
                    color: selected.color ?? '#3b82f6',
                    autoBounce: selected.autoBounce ?? true,
                    jellyStyle: selected.jellyStyle ?? 'spring',
                    defaultInventorySlots: selected.defaultInventorySlots ?? 30,
                    stats: selected.stats,
                  });
                }
              }
            }}
            className="flex-1 bg-zinc-950 border border-blue-500/50 rounded-lg px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-blue-400 cursor-pointer"
          >
            {characters.map((char) => (
              <option key={char.id} value={char.id}>
                {char.name} ({char.role || 'Aventureiro'} • {char.defaultInventorySlots || 30} slots mochila)
              </option>
            ))}
          </select>
        </div>

        {/* Badge de Pré-preenchimento Automático */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono text-zinc-300">
          <span className="flex items-center gap-1 text-emerald-400 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Pré-preenchido:</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-amber-300 font-bold">
            🎒 {player.defaultInventorySlots || project?.playerInventory?.maxSlots || 30} slots de mochila
          </span>
          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-blue-300">
            ⚡ Vel: {player.speed || 4}
          </span>
          {player.stats && (
            <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-red-300">
              ❤️ {player.stats.maxHp} HP
            </span>
          )}
        </div>
        <p className="text-[10px] text-zinc-400">
          Na fase você apenas refina o que precisar (posição inicial, ajustes específicos). Os assets e limites de inventário já vêm pré-preenchidos pelo personagem!
        </p>
      </div>

      {/* MODO TEST SPAWN & SPAWN MANUAL 1 A 1 DE ITENS DE INVENTÁRIO */}
      {project && onUpdateProject && (
        <div className="p-3.5 bg-zinc-900 border border-amber-500/40 rounded-xl space-y-3 shadow-md">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsTestSpawnExpanded((v) => !v)}
              className="flex items-center gap-2 text-left cursor-pointer"
            >
              <span className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                <Crosshair className="w-3.5 h-3.5" />
              </span>
              <div>
                <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wide block">
                  ⚡ Modo Test Spawn &amp; Spawn Manual (1 a 1)
                </span>
                <span className="text-[10px] text-zinc-400 block">
                  Crie itens ao redor do herói ({Math.round(player.x)}, {Math.round(player.y)}) para testar coleta
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIsTestSpawnExpanded((v) => !v)}
              className="px-2 py-1 rounded bg-zinc-950 border border-zinc-800 text-[10px] font-mono text-zinc-300 hover:text-white cursor-pointer"
            >
              {isTestSpawnExpanded ? 'Recolher ▲' : 'Expandir ▼'}
            </button>
          </div>

          {isTestSpawnExpanded && (
            <InteractiveItemGalleryStudio
              project={project}
              onUpdateProject={(updates) => {
                onUpdateProject(updates);
                onCenterCameraOnPlayer();
              }}
              player={player}
              showToast={showToast}
              compactMode={true}
              initialTab="test_spawn"
              onOpenFullInventoryEditor={onOpenInventoryEditor}
            />
          )}
        </div>
      )}

      {/* Editor do Jogador */}
      <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl space-y-3 shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" />
            <span>Perfil do Jogador</span>
          </span>
          <button
            onClick={onCenterCameraOnPlayer}
            className="text-[10px] font-semibold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 rounded px-2 py-0.5 transition-colors"
          >
            Focar Câmera 🎯
          </button>
        </div>

        {/* Nome do Jogador */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Nome do Jogador
          </label>
          <input
            type="text"
            value={player.name || 'Herói'}
            onChange={(e) => onUpdatePlayer({ name: e.target.value })}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-semibold focus:outline-none focus:border-blue-400"
            placeholder="Nome do personagem..."
          />
        </div>

        {/* Avatar / PNG do Jogador */}
        <div className="p-2.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-300">Avatar / Sprite PNG (Padrão)</span>
            {player.avatarPng && (
              <button
                onClick={() => onUpdatePlayer({ avatarPng: undefined })}
                className="text-[10px] text-rose-400 hover:underline flex items-center gap-0.5"
              >
                <X className="w-3 h-3" />
                <span>Remover Padrão</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Thumbnail (qualquer PNG vale: padrão ou direcional) */}
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border-2 shadow-inner shrink-0"
              style={{
                backgroundColor: (player.avatarPng || player.avatarDownPng || player.avatarUpPng || player.avatarLeftPng || player.avatarRightPng) ? 'transparent' : player.color || '#3b82f6',
                borderColor: player.color || '#3b82f6',
              }}
            >
              {(player.avatarPng || player.avatarDownPng || player.avatarUpPng || player.avatarLeftPng || player.avatarRightPng) ? (
                <MotionAssetCanvas
                  src={player.avatarPng || player.avatarDownPng || player.avatarUpPng || player.avatarLeftPng || player.avatarRightPng || ''}
                  alt={player.name}
                  motionLayers={player.motionLayers}
                  isNpcBounce={player.autoBounce !== false}
                  width={48}
                  height={48}
                  className="w-full h-full object-contain"
                />
              ) : (
                <User className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="flex-1 space-y-1.5">
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setUploadingDirection('default');
                    fileInputRef.current?.click();
                  }}
                  className="py-1.5 px-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Carregar imagem PNG local do computador"
                >
                  <Upload className="w-3 h-3" />
                  <span>Enviar PNG</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setGalleryTargetDirection('default');
                    setIsGalleryModalOpen(true);
                  }}
                  className="py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  title="Escolher asset ou composição do acervo oficial da Galeria"
                >
                  <FolderOpen className="w-3 h-3 text-amber-400" />
                  <span>Galeria</span>
                </button>
              </div>
              <span className="text-[9px] text-slate-500 block text-center">
                Sprite ou composição Motion Canvas
              </span>
            </div>
          </div>

          {/* Assets por Direção do Joystick */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-slate-300 block">
                🕹️ Assets por Direção do Joystick
              </span>
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-2 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-[9px] font-extrabold flex items-center gap-1 transition-colors cursor-pointer"
                title="Importar pasta com os 4 PNGs direcionais de uma vez"
              >
                <FolderOpen className="w-3 h-3 text-cyan-400" />
                <span>📂 Importar Pasta (4 PNGs)</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Cima */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
                  {player.avatarUpPng ? (
                    <img src={player.avatarUpPng} alt="Up" className="w-full h-full object-contain" />
                  ) : (
                    <ArrowUp className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-semibold text-slate-300 block truncate">Cima (Up)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadingDirection('up');
                        fileInputRef.current?.click();
                      }}
                      className="text-[9px] text-blue-400 hover:underline cursor-pointer"
                    >
                      {player.avatarUpPng ? 'Upload' : 'PNG'}
                    </button>
                    <span className="text-slate-600 text-[8px]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryTargetDirection('up');
                        setIsGalleryModalOpen(true);
                      }}
                      className="text-[9px] text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                    >
                      <FolderOpen className="w-2.5 h-2.5" />
                      <span>Galeria</span>
                    </button>
                  </div>
                </div>
                {player.avatarUpPng && (
                  <button
                    onClick={() => onUpdatePlayer({ avatarUpPng: undefined })}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Baixo */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
                  {player.avatarDownPng ? (
                    <img src={player.avatarDownPng} alt="Down" className="w-full h-full object-contain" />
                  ) : (
                    <ArrowDown className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-semibold text-slate-300 block truncate">Baixo (Down)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadingDirection('down');
                        fileInputRef.current?.click();
                      }}
                      className="text-[9px] text-blue-400 hover:underline cursor-pointer"
                    >
                      {player.avatarDownPng ? 'Upload' : 'PNG'}
                    </button>
                    <span className="text-slate-600 text-[8px]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryTargetDirection('down');
                        setIsGalleryModalOpen(true);
                      }}
                      className="text-[9px] text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                    >
                      <FolderOpen className="w-2.5 h-2.5" />
                      <span>Galeria</span>
                    </button>
                  </div>
                </div>
                {player.avatarDownPng && (
                  <button
                    onClick={() => onUpdatePlayer({ avatarDownPng: undefined })}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Esquerda */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
                  {player.avatarLeftPng ? (
                    <img src={player.avatarLeftPng} alt="Left" className="w-full h-full object-contain" />
                  ) : (
                    <ArrowLeft className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-semibold text-slate-300 block truncate">Esquerda (Left)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadingDirection('left');
                        fileInputRef.current?.click();
                      }}
                      className="text-[9px] text-blue-400 hover:underline cursor-pointer"
                    >
                      {player.avatarLeftPng ? 'Upload' : 'PNG'}
                    </button>
                    <span className="text-slate-600 text-[8px]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryTargetDirection('left');
                        setIsGalleryModalOpen(true);
                      }}
                      className="text-[9px] text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                    >
                      <FolderOpen className="w-2.5 h-2.5" />
                      <span>Galeria</span>
                    </button>
                  </div>
                </div>
                {player.avatarLeftPng && (
                  <button
                    onClick={() => onUpdatePlayer({ avatarLeftPng: undefined })}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Direita */}
              <div className="flex items-center gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-lg">
                <div className="w-8 h-8 rounded bg-slate-950 flex items-center justify-center shrink-0 border border-slate-700 overflow-hidden">
                  {player.avatarRightPng ? (
                    <img src={player.avatarRightPng} alt="Right" className="w-full h-full object-contain" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-blue-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-semibold text-slate-300 block truncate">Direita (Right)</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setUploadingDirection('right');
                        fileInputRef.current?.click();
                      }}
                      className="text-[9px] text-blue-400 hover:underline cursor-pointer"
                    >
                      {player.avatarRightPng ? 'Upload' : 'PNG'}
                    </button>
                    <span className="text-slate-600 text-[8px]">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setGalleryTargetDirection('right');
                        setIsGalleryModalOpen(true);
                      }}
                      className="text-[9px] text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                    >
                      <FolderOpen className="w-2.5 h-2.5" />
                      <span>Galeria</span>
                    </button>
                  </div>
                </div>
                {player.avatarRightPng && (
                  <button
                    onClick={() => onUpdatePlayer({ avatarRightPng: undefined })}
                    className="text-rose-400 hover:text-rose-300 p-1"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-[9px] text-slate-500 leading-relaxed">
            🦸 O tamanho do herói agora é por bioma: ajuste “Escala do Herói” em cada Bioma / fase Extended.
          </p>

          {/* Chaves de Efeito: Auto Bounce e Exibir Nome */}
          <div className="pt-2 border-t border-slate-800 grid grid-cols-2 gap-2 text-[10px]">
            <button
              onClick={() => onUpdatePlayer({ autoBounce: player.autoBounce === false ? true : false })}
              className={`p-1.5 rounded-lg border text-left transition-colors ${
                player.autoBounce !== false
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400'
              }`}
            >
              <span className="font-bold block">🍮 Efeito Gelatina</span>
              <span className="text-[9px] opacity-80 block">Squish & Stretch 2D</span>
            </button>

            {(() => {
              const hasPng = !!(
                player.avatarPng ||
                player.avatarDownPng ||
                player.avatarUpPng ||
                player.avatarLeftPng ||
                player.avatarRightPng
              );
              const effectiveShow =
                player.showNameTag === true || (player.showNameTag !== false && !hasPng);
              return (
                <button
                  onClick={() => onUpdatePlayer({ showNameTag: !effectiveShow })}
                  className={`p-1.5 rounded-lg border text-left transition-colors ${
                    effectiveShow
                      ? 'bg-blue-500/15 border-blue-500/40 text-blue-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="font-bold block">🏷️ Tag de Nome</span>
                  <span className="text-[9px] opacity-80 block">{effectiveShow ? 'Exibido' : 'Oculto'}</span>
                </button>
              );
            })()}
          </div>

          {/* Parâmetros do Efeito Gelatina / Tremor Físico */}
          {player.autoBounce !== false && (
            <div className="mt-2.5 p-2.5 bg-slate-900 border border-amber-500/30 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between text-[11px] font-bold text-amber-300">
                <span>🍮 Variações de Física &amp; Tremor</span>
                <span className="text-[9px] font-mono bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200">
                  {player.jellyStyle === 'pulse_beat' ? 'Pulso 1, 1, 1' : player.jellyStyle === 'spring' ? 'Mola Física' : player.jellyStyle === 'step_walk' ? 'Passo Físico' : player.jellyStyle === 'squash_intense' ? 'Hiper-Gelatina' : player.jellyStyle === 'organic_jitter' ? 'Tremor Orgânico' : 'Clássico'}
                </span>
              </div>

              {/* Botões das Variações */}
              <div className="grid grid-cols-1 gap-1">
                {[
                  { id: 'pulse_beat', label: '💓 Batida / Pulso (1, 1, 1, 1, 1)', desc: 'Batida rítmica unidirecional reta (sem ciclo 1-2 ou balanço de lados)' },
                  { id: 'classic', label: '🍮 Clássico (Original)', desc: 'Squash & stretch suave padrão' },
                  { id: 'spring', label: '🌀 Mola Física (Spring)', desc: 'Oscilação elástica com amortecimento e inércia' },
                  { id: 'step_walk', label: '👟 Passo Físico (Step Walk)', desc: 'Cadência com impacto de passos e peso' },
                  { id: 'organic_jitter', label: '🍃 Tremor Orgânico (Sem Loop Rígido)', desc: 'Micro-vibração fluida natural sem ciclo mecânico' },
                  { id: 'squash_intense', label: '💥 Hiper-Gelatina (Elástica)', desc: 'Deformação pronunciada de alta elasticidade' },
                ].map((v) => {
                  const isSel = (player.jellyStyle || 'classic') === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => onUpdatePlayer({ jellyStyle: v.id as any })}
                      className={`p-1.5 rounded-lg border text-left transition-all ${
                        isSel
                          ? 'bg-amber-500/20 border-amber-400 text-amber-200 ring-1 ring-amber-400/50 font-bold'
                          : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] leading-tight">{v.label}</div>
                      <div className="text-[8px] opacity-75 mt-0.5 leading-tight">{v.desc}</div>
                    </button>
                  );
                })}
              </div>

              {/* Slider de Velocidade */}
              <div className="pt-1.5 border-t border-slate-800/80 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-medium">⚡ Velocidade da Oscilação:</span>
                  <span className="font-mono text-sky-300 font-bold">
                    {(player.jellySpeed ?? 1.0).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={player.jellySpeed ?? 1.0}
                  onChange={(e) => onUpdatePlayer({ jellySpeed: parseFloat(e.target.value) })}
                  className="w-full accent-sky-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider de Intensidade ao Caminhar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-medium">💥 Intensidade ao Caminhar:</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {(player.jellyIntensity ?? 1.0).toFixed(1)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="3.0"
                  step="0.1"
                  value={player.jellyIntensity ?? 1.0}
                  onChange={(e) => onUpdatePlayer({ jellyIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-amber-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
              </div>

              {/* Slider de Intensidade Parado (Idle) */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-300 font-medium">🍃 Intensidade Parado (Idle):</span>
                  <span className="font-mono text-emerald-300 font-bold">
                    {(player.jellyIdleIntensity ?? 0.35).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.05"
                  value={player.jellyIdleIntensity ?? 0.35}
                  onChange={(e) => onUpdatePlayer({ jellyIdleIntensity: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-400 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                />
                <span className="text-[8px] text-slate-500 block">
                  Ajuste para 0x se preferir o personagem completamente estático quando parado.
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cores do Marcador */}
        <div>
          <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
            Cor do Marcador
          </label>
          <div className="flex items-center gap-1.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => onUpdatePlayer({ color: c })}
                className={`w-6 h-6 rounded-full transition-transform ${
                  (player.color || '#3b82f6') === c
                    ? 'scale-125 ring-2 ring-white shadow-md'
                    : 'hover:scale-110 opacity-75'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Coordenadas X e Y do Jogador */}
        <div className="pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs">
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Posição X (px)</label>
            <input
              type="number"
              value={Math.round(player.x)}
              onChange={(e) => onUpdatePlayer({ x: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-blue-400"
            />
          </div>
          <div>
            <label className="text-[10px] text-slate-400 block mb-0.5">Posição Y (px)</label>
            <input
              type="number"
              value={Math.round(player.y)}
              onChange={(e) => onUpdatePlayer({ y: Number(e.target.value) })}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-amber-300 font-mono focus:outline-none focus:border-blue-400"
            />
          </div>
        </div>

        {/* Dica de Controles */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
          <span className="font-semibold text-amber-300 block flex items-center gap-1">
            <Move className="w-3.5 h-3.5 text-amber-400" />
            Como Mover no Celular:
          </span>
          <p className="leading-tight">
            Use o 🕹️ <strong>Joystick Digital</strong> na parte inferior da tela do celular (Preview). O mapa e a câmera sobem e descem sincronizados ao caminhar na vertical!
          </p>
        </div>
      </div>

      {/* =====================================================================
          RESUMO CLEAN DE PETS & DECK (3 SLOTS) + ATALHO PARA O EDITOR DEDICADO
         ===================================================================== */}
      <div className="p-3.5 bg-gradient-to-b from-amber-950/45 via-slate-900 to-slate-900 border border-amber-500/45 rounded-xl space-y-3 shadow-md">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-base">
              🐾
            </span>
            <div>
              <span className="text-xs font-extrabold text-amber-300 uppercase tracking-wide block">
                Companheiros Pets &amp; Deck (3 Slots)
              </span>
              <span className="text-[10px] text-slate-400 block">
                {resolvedPet.petGallery.length} cartas na coleção • Slot #{resolvedPet.activePetSlotIndex + 1} ativo
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              const nextEnabled = !resolvedPet.enabled;
              updatePetGalleryAndActive(
                resolvedPet.petGallery,
                nextEnabled ? (resolvedPet.activePetId || resolvedPet.petGallery[0]?.id) : null,
                nextEnabled
              );
              showToast?.(
                nextEnabled
                  ? '🐾 Pet Companheiro ativado no jogo!'
                  : '🐾 Pet Companheiro recolhido.'
              );
            }}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black border transition-all cursor-pointer ${
              resolvedPet.enabled
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.25)]'
                : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {resolvedPet.enabled ? '🟢 Pet Ativo' : '⚪ Desativado'}
          </button>
        </div>

        {/* Resumo rápido dos 3 Slots Equipados */}
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((slotIdx) => {
            const slotPet = resolvedPet.equippedPets[slotIdx as 0 | 1 | 2];
            const isSlotActive = resolvedPet.enabled && resolvedPet.activePetSlotIndex === slotIdx;
            return (
              <button
                key={`studio-slot-${slotIdx}`}
                type="button"
                onClick={() => {
                  if (slotPet) {
                    setEditingPetId(slotPet.id);
                    updatePetGalleryAndActive(
                      resolvedPet.petGallery,
                      slotPet.id,
                      true,
                      resolvedPet.equippedPetIds,
                      slotIdx as 0 | 1 | 2
                    );
                    showToast?.(`🐾 Slot ${slotIdx + 1} (${slotPet.name}) ativo no mapa!`);
                  }
                }}
                className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2 ${
                  isSlotActive
                    ? 'bg-amber-500/25 border-amber-400 ring-1 ring-amber-300/60 shadow-sm'
                    : 'bg-slate-950/90 border-slate-800 hover:border-amber-500/40'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-slate-900 border border-amber-500/40 flex items-center justify-center shrink-0 overflow-hidden">
                  {slotPet?.avatarPng ? (
                    <img src={slotPet.avatarPng} alt={slotPet.name} className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-base">{slotPet?.iconEmoji || '➕'}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-[8px] font-black uppercase text-amber-300 block">
                    Slot {slotIdx + 1} {isSlotActive ? '• ATIVO' : ''}
                  </span>
                  <span className="text-[10px] font-bold text-white truncate block">
                    {slotPet ? slotPet.name : 'Vazio'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {onOpenPetStudio && (
          <button
            type="button"
            onClick={onOpenPetStudio}
            className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all"
          >
            <span>🐾 Abrir Editor Dedicado de Pets &amp; Deck (3 Slots)</span>
            <span>➔</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          CONFIGURAÇÃO DO DASH DO JOGADOR (SUBSTITUI O BOTÃO DE PULO)
         ===================================================================== */}
      <div className="p-3.5 bg-gradient-to-b from-sky-950/45 via-slate-900 to-slate-900 border border-sky-500/40 rounded-xl space-y-2.5 shadow-md">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/50 flex items-center justify-center text-sky-300">
            <Zap className="w-4 h-4" />
          </span>
          <div>
            <span className="text-xs font-extrabold text-sky-300 uppercase tracking-wide block">
              💨 Dash Rápido do Jogador (Botão Dash / Espaço)
            </span>
            <span className="text-[10px] text-slate-400 block">
              Impulsiona na direção atual do joystick ou mantém a última direção quando parado
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-sky-300 font-bold">Distância</span>
              <span className="font-mono text-white font-bold">{player.dashConfig?.distance ?? 115}px</span>
            </div>
            <input
              type="range"
              min="60"
              max="220"
              step="5"
              value={player.dashConfig?.distance ?? 115}
              onChange={(e) =>
                onUpdatePlayer({
                  dashConfig: { ...(player.dashConfig || {}), distance: Number(e.target.value) },
                })
              }
              className="w-full accent-sky-400 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
            />
          </div>

          <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-amber-300 font-bold">Duração</span>
              <span className="font-mono text-white font-bold">{player.dashConfig?.durationMs ?? 180}ms</span>
            </div>
            <input
              type="range"
              min="100"
              max="350"
              step="10"
              value={player.dashConfig?.durationMs ?? 180}
              onChange={(e) =>
                onUpdatePlayer({
                  dashConfig: { ...(player.dashConfig || {}), durationMs: Number(e.target.value) },
                })
              }
              className="w-full accent-amber-400 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
            />
          </div>

          <div className="p-2 bg-slate-950 border border-slate-800 rounded-lg space-y-1">
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-emerald-300 font-bold">Recarga</span>
              <span className="font-mono text-white font-bold">{player.dashConfig?.cooldownMs ?? 420}ms</span>
            </div>
            <input
              type="range"
              min="150"
              max="1200"
              step="30"
              value={player.dashConfig?.cooldownMs ?? 420}
              onChange={(e) =>
                onUpdatePlayer({
                  dashConfig: { ...(player.dashConfig || {}), cooldownMs: Number(e.target.value) },
                })
              }
              className="w-full accent-emerald-400 h-1.5 bg-slate-900 rounded-lg cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Modal da Galeria Oficial de Assets para o Jogador e Pets */}
      {isGalleryModalOpen && (
        <AssetGalleryModal
          isOpen={isGalleryModalOpen}
          onClose={() => setIsGalleryModalOpen(false)}
          onSelectAsset={handleSelectGalleryAsset}
          galleryAssets={galleryAssets}
          categories={galleryCategories}
          onUploadNewAsset={onUploadNewAsset}
        />
      )}
    </div>
  );
};
