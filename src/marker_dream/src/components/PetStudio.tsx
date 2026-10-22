import React, { useRef, useState, useMemo } from 'react';
import {
  PlayerConfig,
  GalleryAsset,
  MapProject,
  PlayerPetCatalogItem,
  getResolvedPlayerPetConfig,
} from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import {
  Sparkles,
  Upload,
  FolderOpen,
  X,
  Plus,
  Trash2,
  Swords,
  Shield,
  Heart,
  Zap,
  CheckCircle2,
  Compass,
  HelpCircle,
  Layers,
  TrendingUp,
} from 'lucide-react';
import { AssetGalleryModal } from './AssetGalleryModal';

interface PetStudioProps {
  player: PlayerConfig;
  onUpdatePlayer: (updates: Partial<PlayerConfig>) => void;
  galleryAssets?: GalleryAsset[];
  galleryCategories?: string[];
  onUploadNewAsset?: (newAsset: GalleryAsset) => void;
  project?: MapProject;
  showToast?: (msg: string) => void;
}

type PetEditorStepTab = 'deck' | 'gallery' | 'ai_combat' | 'growth';

export const PetStudio: React.FC<PetStudioProps> = ({
  player,
  onUpdatePlayer,
  galleryAssets = [],
  galleryCategories = [],
  onUploadNewAsset,
  showToast,
}) => {
  const petFileInputRef = useRef<HTMLInputElement>(null);
  const [activeSubTab, setActiveSubTab] = useState<PetEditorStepTab>('deck');
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'equipped' | 'scanned'>('all');
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [showGuideBanner, setShowGuideBanner] = useState(true);

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
    setEditingPetId(petId);
    updatePetGalleryAndActive(resolvedPet.petGallery, petId, true, nextSlots, slotIdx);
    const petObj = resolvedPet.petGallery.find((p) => p.id === petId);
    showToast?.(`🐾 "${petObj?.name || 'Pet'}" equipado no Slot ${slotIdx + 1} do Deck!`);
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
      showToast?.(`🐾 Sprite PNG aplicado a "${editingPet.name}"!`);
    } catch (err) {
      console.error(err);
    }
    e.target.value = '';
  };

  const handleSelectGalleryAsset = (dataUrl: string) => {
    const matchedAsset = galleryAssets.find((a) => a.dataUrl === dataUrl);
    const baseLayer = matchedAsset?.motionLayers?.find((l: any) => l.isBaseAsset);
    const actualBasePng = baseLayer?.pngUrl || dataUrl;

    if (editingPet) {
      handleUpdateSinglePetInGallery(editingPet.id, { avatarPng: actualBasePng });
      showToast?.(`🐾 Asset da Galeria aplicado a "${editingPet.name}"!`);
    }
    setIsGalleryModalOpen(false);
  };

  const handleCreateNewPet = () => {
    const newId = `pet-custom-${Date.now()}`;
    const newPet: PlayerPetCatalogItem = {
      id: newId,
      name: `Novo Companheiro #${resolvedPet.petGallery.length + 1}`,
      iconEmoji: '🐉',
      rarity: 'epic',
      roleLabel: 'Guardião Custom',
      shortDescription: 'Criado no Editor Dedicado de Pets & Deck.',
      detailedLore: 'Monstro companheiro treinado para seguir o herói e atordoar Mobbys aos 50% de PV.',
      hp: 140,
      maxHp: 140,
      defense: 14,
      level: 1,
      xp: 0,
      maxXp: 100,
      growthPerLevel: 0.08,
      locomotionType: 'walker',
      attackStyle: 'walker_dash',
      aiAggroMode: 'command_auto',
      projectileEmoji: '🔥',
      attackDamage: 30,
      attackRange: 200,
      scale: 0.85,
      followLagSteps: 12,
      curiousRadius: 48,
      curiousSpeed: 1.0,
      color: '#f59e0b',
    };
    const nextGallery = [...resolvedPet.petGallery, newPet];
    setEditingPetId(newId);
    updatePetGalleryAndActive(nextGallery, newId, true);
    setActiveSubTab('gallery');
    showToast?.(`✨ "${newPet.name}" criado e selecionado!`);
  };

  const filteredGallery = useMemo(() => {
    return resolvedPet.petGallery.filter((pet) => {
      if (galleryFilter === 'equipped') {
        return resolvedPet.equippedPetIds.includes(pet.id);
      }
      if (galleryFilter === 'scanned') {
        return Boolean(pet.scannedFromMarkerId || pet.id.startsWith('pet-scanned-'));
      }
      return true;
    });
  }, [resolvedPet.petGallery, resolvedPet.equippedPetIds, galleryFilter]);

  return (
    <div className="space-y-4">
      <input
        ref={petFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp"
        className="hidden"
        onChange={handleUploadPetPng}
      />

      {/* CABEÇALHO CLEAN DO EDITOR DEDICADO DE PETS & DECK */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-br from-amber-950/60 via-zinc-900 to-zinc-950 border border-amber-500/40 shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-xl shadow-inner">
              🐾
            </div>
            <div>
              <h2 className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                <span>Estúdio de Pets &amp; Deck (3 Slots)</span>
              </h2>
              <p className="text-[10px] text-zinc-400">
                Gerencie seus 3 slots ativos, cartas escaneadas, IA de combate e evolução
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowGuideBanner((v) => !v)}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-300 text-[10px] cursor-pointer"
              title="Mostrar/ocultar passo a passo guiado"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            </button>
            <button
              type="button"
              onClick={() => {
                const nextEnabled = !resolvedPet.enabled;
                updatePetGalleryAndActive(
                  resolvedPet.petGallery,
                  nextEnabled ? resolvedPet.activePetId || resolvedPet.petGallery[0]?.id : null,
                  nextEnabled
                );
                showToast?.(
                  nextEnabled ? '🐾 Pet Companheiro ativado no mapa!' : '🐾 Pet recolhido.'
                );
              }}
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black border transition-all cursor-pointer ${
                resolvedPet.enabled
                  ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                  : 'bg-zinc-950 border-zinc-700 text-zinc-400 hover:text-white'
              }`}
            >
              {resolvedPet.enabled ? '🟢 Ativo no Jogo' : '⚪ Desativado'}
            </button>
          </div>
        </div>

        {/* GUIA RÁPIDO EM 3 PASSOS (INTUITIVO & CLEAN) */}
        {showGuideBanner && (
          <div className="p-2.5 rounded-xl bg-black/50 border border-amber-500/25 grid grid-cols-3 gap-2 text-[9.5px]">
            <div className="flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 font-black flex items-center justify-center shrink-0">
                1
              </span>
              <span className="text-zinc-300 leading-tight">
                <strong className="text-amber-300 block">Equipe 3 Slots</strong>
                Escolha até 3 cartas para a cápsula vertical do HUD e mochila.
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 font-black flex items-center justify-center shrink-0">
                2
              </span>
              <span className="text-zinc-300 leading-tight">
                <strong className="text-amber-300 block">Atordoe (50% PV)</strong>
                O pet ataca Mobbys até 50% PV, ativando 15s de tontura.
              </span>
            </div>
            <div className="flex items-start gap-1.5">
              <span className="w-4 h-4 rounded-full bg-amber-500/30 text-amber-300 font-black flex items-center justify-center shrink-0">
                3
              </span>
              <span className="text-zinc-300 leading-tight">
                <strong className="text-amber-300 block">Escaneie no Mapa</strong>
                Use <em>Escanear</em> para capturar a carta; o Mobby some e segue o respawn!
              </span>
            </div>
          </div>
        )}

        {/* NAVEGAÇÃO GUIADA EM 4 ABAS ORGANIZADAS */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          {(
            [
              { id: 'deck', label: '1. Deck (3 Slots)', icon: '🃏' },
              { id: 'gallery', label: '2. Cartas & PNG', icon: '🐾' },
              { id: 'ai_combat', label: '3. IA & Combate', icon: '🧠' },
              { id: 'growth', label: '4. Nível & PV', icon: '📈' },
            ] as const
          ).map((tab) => {
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`py-2 px-1.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-300 font-black shadow-md'
                    : 'bg-zinc-900/90 border-zinc-800 text-zinc-300 hover:border-amber-500/40 hover:text-white font-bold'
                }`}
              >
                <span className="text-sm leading-none">{tab.icon}</span>
                <span className="text-[9.5px] leading-tight tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* BARRA FIXA DO PET ATUALMENTE EM EDIÇÃO */}
      {editingPet && (
        <div className="px-3 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-xl bg-zinc-950 border-2 flex items-center justify-center shrink-0 overflow-hidden"
              style={{ borderColor: editingPet.color || '#f59e0b' }}
            >
              {editingPet.avatarPng ? (
                <img src={editingPet.avatarPng} alt={editingPet.name} className="w-full h-full object-contain" />
              ) : (
                <span className="text-lg">{editingPet.iconEmoji || '🐾'}</span>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-white truncate">{editingPet.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-[9px] font-mono font-bold text-amber-300">
                  Nv.{editingPet.level || 1}
                </span>
              </div>
              <span className="text-[10px] text-zinc-400 block truncate">
                ❤️ {editingPet.hp ?? editingPet.maxHp ?? 120} PV • ⚔️ {editingPet.attackDamage} Dano •{' '}
                {editingPet.locomotionType === 'flying' ? '🦅 Voador' : '🐾 Terrestre'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateNewPet}
            className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-200 text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Nova Carta</span>
          </button>
        </div>
      )}

      {/* ===================================================================
          ABA 1: DECK DE 3 SLOTS (SINCRONIZADO COM HUD VERTICAL E MOCHILA)
         =================================================================== */}
      {activeSubTab === 'deck' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-amber-500/35 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                  🃏 Seus 3 Slots de Invocação (HUD &amp; Mochila)
                </h3>
                <p className="text-[10px] text-zinc-400">
                  Clique em um slot para torná-lo o Pet ativo que caminha com o herói no mapa
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[9px] font-bold text-amber-300">
                Slot #{resolvedPet.activePetSlotIndex + 1} Ativo
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {([0, 1, 2] as const).map((slotIdx) => {
                const slotPet = resolvedPet.equippedPets[slotIdx];
                const isSlotActive = resolvedPet.enabled && resolvedPet.activePetSlotIndex === slotIdx;
                return (
                  <div
                    key={`deck-slot-${slotIdx}`}
                    onClick={() => {
                      if (slotPet) {
                        setEditingPetId(slotPet.id);
                        updatePetGalleryAndActive(
                          resolvedPet.petGallery,
                          slotPet.id,
                          true,
                          resolvedPet.equippedPetIds,
                          slotIdx
                        );
                        showToast?.(`🐾 Slot ${slotIdx + 1} (${slotPet.name}) ativado no mapa!`);
                      }
                    }}
                    className={`p-3 rounded-2xl border-2 transition-all cursor-pointer flex flex-col items-center text-center gap-2 relative ${
                      isSlotActive
                        ? 'bg-gradient-to-b from-amber-500/25 via-zinc-900 to-zinc-950 border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.25)]'
                        : 'bg-zinc-950/90 border-zinc-800 hover:border-amber-500/40'
                    }`}
                  >
                    <span
                      className={`px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase tracking-wider ${
                        isSlotActive
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-zinc-900 text-zinc-400 border border-zinc-800'
                      }`}
                    >
                      Slot {slotIdx + 1} {isSlotActive ? '• EM CAMPO' : ''}
                    </span>

                    <div
                      className="w-14 h-14 rounded-2xl bg-zinc-900 border-2 flex items-center justify-center overflow-hidden shadow-inner"
                      style={{ borderColor: slotPet?.color || '#52525b' }}
                    >
                      {slotPet?.avatarPng ? (
                        <img
                          src={slotPet.avatarPng}
                          alt={slotPet.name}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-2xl">{slotPet?.iconEmoji || '➕'}</span>
                      )}
                    </div>

                    <div className="w-full">
                      <span className="text-[11px] font-extrabold text-white block truncate">
                        {slotPet ? slotPet.name : 'Slot Vazio'}
                      </span>
                      {slotPet ? (
                        <span className="text-[9px] text-emerald-300 font-mono block mt-0.5">
                          Nv.{slotPet.level || 1} • ❤️ {slotPet.hp ?? slotPet.maxHp ?? 100}
                        </span>
                      ) : (
                        <span className="text-[9px] text-zinc-500 block mt-0.5">
                          Selecione abaixo
                        </span>
                      )}
                    </div>

                    {/* Seletor rápido de troca para este slot */}
                    <select
                      value={slotPet?.id || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleEquipPetToSlot(e.target.value, slotIdx);
                        }
                      }}
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-1.5 py-1 text-[9.5px] text-amber-200 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                    >
                      {resolvedPet.petGallery.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.iconEmoji || '🐾'} {p.name} (Nv.{p.level || 1})
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Atalho para ir editar Cartas ou IA */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('gallery')}
              className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-amber-300 block">
                  🐾 Galeria &amp; Visual PNG
                </span>
                <span className="text-[9.5px] text-zinc-400">
                  {resolvedPet.petGallery.length} cartas disponíveis
                </span>
              </div>
              <span className="text-amber-400 font-bold text-xs">➔</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('ai_combat')}
              className="p-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-left transition-all cursor-pointer flex items-center justify-between"
            >
              <div>
                <span className="text-[11px] font-bold text-sky-300 block">
                  🧠 IA &amp; Estilo de Ataque
                </span>
                <span className="text-[9.5px] text-zinc-400">
                  Voador, Dash, Orbe e Tontura
                </span>
              </div>
              <span className="text-sky-400 font-bold text-xs">➔</span>
            </button>
          </div>
        </div>
      )}

      {/* ===================================================================
          ABA 2: GALERIA DE CARTAS & CUSTOMIZAÇÃO VISUAL (PNG / NOME / EMOJI)
         =================================================================== */}
      {activeSubTab === 'gallery' && (
        <div className="space-y-3">
          {/* Filtros Clean da Galeria */}
          <div className="flex items-center justify-between gap-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800">
            <div className="flex items-center gap-1">
              {(
                [
                  { id: 'all', label: `Todas (${resolvedPet.petGallery.length})` },
                  { id: 'equipped', label: 'No Deck (3)' },
                  { id: 'scanned', label: '🔍 Escaneadas' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setGalleryFilter(f.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    galleryFilter === f.id
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleCreateNewPet}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/50 text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Criar Pet</span>
            </button>
          </div>

          {/* Grid de Cartas */}
          <div className="grid grid-cols-2 gap-2 max-h-[260px] overflow-y-auto pr-1">
            {filteredGallery.map((pet) => {
              const isEditing = editingPet?.id === pet.id;
              const slotIdx = resolvedPet.equippedPetIds.indexOf(pet.id);
              const isScanned = Boolean(pet.scannedFromMarkerId || pet.id.startsWith('pet-scanned-'));
              return (
                <div
                  key={pet.id}
                  onClick={() => setEditingPetId(pet.id)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                    isEditing
                      ? 'bg-amber-500/15 border-amber-400 ring-1 ring-amber-400/50'
                      : 'bg-zinc-900/90 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl bg-zinc-950 border flex items-center justify-center shrink-0 overflow-hidden relative"
                      style={{ borderColor: pet.color || '#f59e0b' }}
                    >
                      {pet.avatarPng ? (
                        <img src={pet.avatarPng} alt={pet.name} className="w-full h-full object-contain" />
                      ) : (
                        <span className="text-xl">{pet.iconEmoji || '🐾'}</span>
                      )}
                      <span className="absolute -bottom-0.5 -right-0.5 px-1 rounded bg-zinc-950 text-[7.5px] font-black text-amber-300 border border-amber-500/40">
                        Nv.{pet.level || 1}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-extrabold text-white truncate">
                          {pet.name}
                        </span>
                        {isScanned && (
                          <span className="text-[8px] px-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 shrink-0">
                            Scan
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-emerald-300 font-mono block">
                        ❤️ {pet.hp ?? pet.maxHp ?? 100} • ⚔️ {pet.attackDamage}
                      </span>
                      <span className="text-[8.5px] text-zinc-400 block truncate">
                        {slotIdx !== -1 ? `🃏 Equipado no Slot ${slotIdx + 1}` : 'Na coleção'}
                      </span>
                    </div>
                  </div>

                  {/* Botões rápidos para equipar no Slot 1, 2 ou 3 */}
                  <div className="flex items-center gap-1 pt-1.5 border-t border-zinc-800/80">
                    {([0, 1, 2] as const).map((sIdx) => {
                      const isEquippedHere = resolvedPet.equippedPetIds[sIdx] === pet.id;
                      return (
                        <button
                          key={`gal-eq-${pet.id}-${sIdx}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEquipPetToSlot(pet.id, sIdx);
                          }}
                          className={`flex-1 py-1 rounded text-[8.5px] font-black transition-all cursor-pointer ${
                            isEquippedHere
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-zinc-950 hover:bg-amber-500/25 text-amber-200 border border-amber-500/30'
                          }`}
                        >
                          {isEquippedHere ? `✓ Slot ${sIdx + 1}` : `Slot ${sIdx + 1}`}
                        </button>
                      );
                    })}
                    {resolvedPet.petGallery.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const nextGallery = resolvedPet.petGallery.filter((p) => p.id !== pet.id);
                          const nextActive =
                            resolvedPet.activePetId === pet.id
                              ? nextGallery[0]?.id || null
                              : resolvedPet.activePetId;
                          if (editingPetId === pet.id && nextGallery[0]) {
                            setEditingPetId(nextGallery[0].id);
                          }
                          updatePetGalleryAndActive(nextGallery, nextActive, resolvedPet.enabled);
                          showToast?.('Carta removida da galeria.');
                        }}
                        className="p-1 rounded bg-zinc-950 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 border border-zinc-800 cursor-pointer"
                        title="Excluir carta"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Editor de Identidade & Sprite PNG da Carta Selecionada */}
          {editingPet && (
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 block">
                🎨 Aparência &amp; Identidade de "{editingPet.name}"
              </span>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-[9px] font-semibold text-zinc-400 uppercase block mb-1">
                    Nome do Pet / Carta
                  </label>
                  <input
                    type="text"
                    value={editingPet.name}
                    onChange={(e) =>
                      handleUpdateSinglePetInGallery(editingPet.id, { name: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-semibold text-zinc-400 uppercase block mb-1">
                    Emoji / Ícone
                  </label>
                  <input
                    type="text"
                    value={editingPet.iconEmoji || '🐾'}
                    onChange={(e) =>
                      handleUpdateSinglePetInGallery(editingPet.id, { iconEmoji: e.target.value })
                    }
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-center text-sm focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Seleção rápida de Emojis */}
              <div className="flex items-center gap-1 flex-wrap">
                {['🐉', '💧', '👑', '🦊', '🐺', '🧚', '🦅', '🦄', '🔥', '❄️', '⚡', '🌿'].map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => handleUpdateSinglePetInGallery(editingPet.id, { iconEmoji: em })}
                    className={`w-6 h-6 rounded-md flex items-center justify-center text-xs border cursor-pointer ${
                      editingPet.iconEmoji === em
                        ? 'bg-amber-500/30 border-amber-400 scale-110'
                        : 'bg-zinc-950 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>

              {/* Upload de PNG ou Galeria Oficial */}
              <div className="flex items-center gap-3 p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl">
                <div
                  className="w-12 h-12 rounded-xl border-2 flex items-center justify-center overflow-hidden shrink-0 bg-zinc-900"
                  style={{ borderColor: editingPet.color || '#f59e0b' }}
                >
                  {editingPet.avatarPng ? (
                    <img
                      src={editingPet.avatarPng}
                      alt={editingPet.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-2xl">{editingPet.iconEmoji || '🐾'}</span>
                  )}
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => petFileInputRef.current?.click()}
                      className="py-1.5 px-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/40 text-blue-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload PNG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsGalleryModalOpen(true)}
                      className="py-1.5 px-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <FolderOpen className="w-3 h-3 text-amber-400" />
                      <span>Acervo Oficial</span>
                    </button>
                  </div>
                  {editingPet.avatarPng && (
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSinglePetInGallery(editingPet.id, { avatarPng: undefined })
                      }
                      className="text-[9px] text-rose-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                      <span>Remover PNG (usar Emoji)</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================================================================
          ABA 3: IA, ESTILO DE ATAQUE & SISTEMA DE TONTURA (50% PV)
         =================================================================== */}
      {activeSubTab === 'ai_combat' && editingPet && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                🧠 Inteligência &amp; Estilo de Ataque ({editingPet.name})
              </h3>
              <p className="text-[10px] text-zinc-400">
                Escolha como o Pet se move e ataca os Mobbys inimigos no mapa
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {(
                [
                  {
                    id: 'walker_dash',
                    loco: 'walker',
                    label: '🐾 Caminhante + Investida Dash',
                    desc: 'Corre pelo chão seguindo seus passos e avança com investida veloz contra o Mobby.',
                  },
                  {
                    id: 'flying_ranged',
                    loco: 'flying',
                    label: '🦅 Voador + Disparo à Distância',
                    desc: 'Flutua acima do chão com sombra suave e dispara projéteis mágicos à distância.',
                  },
                  {
                    id: 'flying_dive',
                    loco: 'flying',
                    label: '🐉 Voador + Mergulho Rasante',
                    desc: 'Voa em órbita protetora e dá rasantes velozes quando você aperta Atacar.',
                  },
                  {
                    id: 'walker_ranged',
                    loco: 'walker',
                    label: '🦊 Caminhante + Orbe Mágico',
                    desc: 'Acompanha no solo mantendo distância segura e lança orbes de energia.',
                  },
                  {
                    id: 'berserker_spin',
                    loco: 'walker',
                    label: '🐺 Giro Furioso Corpo-a-Corpo',
                    desc: 'Gira continuamente causando dano rápido ao redor do Mobby.',
                  },
                ] as const
              ).map((styleOpt) => {
                const isSel = (editingPet.attackStyle || 'walker_dash') === styleOpt.id;
                return (
                  <button
                    key={styleOpt.id}
                    type="button"
                    onClick={() =>
                      handleUpdateSinglePetInGallery(editingPet.id, {
                        attackStyle: styleOpt.id,
                        locomotionType: styleOpt.loco,
                      })
                    }
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                      isSel
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-[11px] font-extrabold text-amber-200">{styleOpt.label}</div>
                      <div className="text-[9.5px] text-zinc-400 leading-snug mt-0.5">
                        {styleOpt.desc}
                      </div>
                    </div>
                    {isSel && <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>

            {/* Modo de Engajamento */}
            <div className="pt-2 border-t border-zinc-800 space-y-1.5">
              <label className="text-[10px] font-bold text-zinc-300 uppercase block">
                Modo de Engajamento da IA:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {(
                  [
                    { id: 'command_auto', label: '🎯 Ao Atacar', sub: 'Foca seu alvo' },
                    { id: 'defensive_guard', label: '🛡️ Defensivo', sub: 'Protege de perto' },
                    { id: 'full_autonomous', label: '⚡ Autônomo', sub: 'Caça sozinho' },
                  ] as const
                ).map((aggro) => {
                  const isSel = (editingPet.aiAggroMode || 'command_auto') === aggro.id;
                  return (
                    <button
                      key={aggro.id}
                      type="button"
                      onClick={() =>
                        handleUpdateSinglePetInGallery(editingPet.id, { aiAggroMode: aggro.id })
                      }
                      className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                        isSel
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 font-black'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                      }`}
                    >
                      <div className="text-[10px]">{aggro.label}</div>
                      <div className="text-[8px] opacity-75">{aggro.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Explicação Visual da Regra de 50% PV -> Tontura 15s -> Scan c/ Zoom & Respawn */}
          <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/40 space-y-1 text-[10px] text-purple-200">
            <span className="font-black text-purple-300 block">
              💫 Como funciona a Captura / Scan aos 50% de PV:
            </span>
            <p className="text-zinc-300 leading-relaxed">
              Quando o Mobby atinge <strong>50% de PV</strong>, ele entra em <strong>Tontura por 15s</strong> e o Pet pausa o ataque. Surge a cápsula <strong>[⚔️ Batalhar]</strong> ou <strong>[🔍 Escanear]</strong>. Ao escanear, a câmera dá zoom com transição de tela preta, salva a carta no seu Deck e o Mobby desaparece até cumprir o tempo de Respawn!
            </p>
          </div>
        </div>
      )}

      {/* ===================================================================
          ABA 4: NÍVEL, PV, DANO, CRESCIMENTO & COMPORTAMENTO NA TRILHA
         =================================================================== */}
      {activeSubTab === 'growth' && editingPet && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                📈 Evolução, Atributos &amp; Tamanho ({editingPet.name})
              </span>
              <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-md border border-amber-500/30">
                Escala Real:{' '}
                {(
                  (editingPet.scale ?? 0.8) *
                  (1 + ((editingPet.level || 1) - 1) * (editingPet.growthPerLevel ?? 0.08))
                ).toFixed(2)}
                x
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Nível */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-amber-300 font-bold">⭐ Nível Inicial</span>
                  <span className="font-mono text-white font-bold">Nv.{editingPet.level || 1}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={editingPet.level || 1}
                  onChange={(e) =>
                    handleUpdateSinglePetInGallery(editingPet.id, { level: Number(e.target.value) })
                  }
                  className="w-full accent-amber-400 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* PV Máximo */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-emerald-300 font-bold">❤️ Vida Máxima (PV)</span>
                  <span className="font-mono text-white font-bold">{editingPet.maxHp ?? 120} PV</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="10"
                  value={editingPet.maxHp ?? 120}
                  onChange={(e) => {
                    const nextMax = Number(e.target.value);
                    handleUpdateSinglePetInGallery(editingPet.id, { maxHp: nextMax, hp: nextMax });
                  }}
                  className="w-full accent-emerald-400 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* Dano Base */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-rose-300 font-bold">⚔️ Dano por Golpe</span>
                  <span className="font-mono text-white font-bold">{editingPet.attackDamage} HP</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="150"
                  step="5"
                  value={editingPet.attackDamage}
                  onChange={(e) =>
                    handleUpdateSinglePetInGallery(editingPet.id, {
                      attackDamage: Number(e.target.value),
                    })
                  }
                  className="w-full accent-rose-500 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* Crescimento por Nível */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-purple-300 font-bold">🌱 Crescimento/Nv</span>
                  <span className="font-mono text-white font-bold">
                    +{Math.round((editingPet.growthPerLevel ?? 0.08) * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.02"
                  max="0.20"
                  step="0.01"
                  value={editingPet.growthPerLevel ?? 0.08}
                  onChange={(e) =>
                    handleUpdateSinglePetInGallery(editingPet.id, {
                      growthPerLevel: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-purple-400 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* Escala Base */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-amber-200 font-bold">📐 Tamanho Base</span>
                  <span className="font-mono text-white font-bold">
                    {(editingPet.scale ?? 0.8).toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="1.8"
                  step="0.05"
                  value={editingPet.scale ?? 0.8}
                  onChange={(e) =>
                    handleUpdateSinglePetInGallery(editingPet.id, {
                      scale: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-amber-400 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* Alcance de Ataque */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-sky-300 font-bold">🎯 Alcance de Combate</span>
                  <span className="font-mono text-white font-bold">{editingPet.attackRange}px</span>
                </div>
                <input
                  type="range"
                  min="90"
                  max="340"
                  step="10"
                  value={editingPet.attackRange}
                  onChange={(e) =>
                    handleUpdateSinglePetInGallery(editingPet.id, {
                      attackRange: Number(e.target.value),
                    })
                  }
                  className="w-full accent-sky-400 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* Distância na Trilha */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-300 font-bold">👣 Distância na Trilha</span>
                  <span className="font-mono text-white font-bold">
                    {editingPet.followLagSteps ?? 12} passos
                  </span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="28"
                  step="1"
                  value={editingPet.followLagSteps ?? 12}
                  onChange={(e) =>
                    handleUpdateSinglePetInGallery(editingPet.id, {
                      followLagSteps: Number(e.target.value),
                    })
                  }
                  className="w-full accent-zinc-400 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>

              {/* Raio Curioso ao Parar */}
              <div className="p-2.5 bg-zinc-950 rounded-xl border border-zinc-800 space-y-1">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-zinc-300 font-bold">🔍 Órbita Curiosa</span>
                  <span className="font-mono text-white font-bold">
                    {editingPet.curiousRadius ?? 48}px
                  </span>
                </div>
                <input
                  type="range"
                  min="24"
                  max="96"
                  step="4"
                  value={editingPet.curiousRadius ?? 48}
                  onChange={(e) =>
                    handleUpdateSinglePetInGallery(editingPet.id, {
                      curiousRadius: Number(e.target.value),
                    })
                  }
                  className="w-full accent-zinc-400 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
