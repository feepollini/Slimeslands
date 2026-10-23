import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Sparkles,
  User,
  PawPrint,
  MapPin,
  Palette,
  Save,
  FolderPlus,
  Layers,
  Check,
  ShoppingBag,
  Eye,
  EyeOff,
} from 'lucide-react';
import type {
  MapProject,
  MapMarker,
  MarkerMotionLayer,
  PlayerConfig,
  PlayerPetCatalogItem,
  GalleryAsset,
} from '../../types/map';
import { DEFAULT_PET_GALLERY } from '../../types/map';
import { MotionCanvasStudio, MotionCanvasTool } from '../MotionCanvasStudio';
import { MotionCanvasWorkspace } from '../MotionCanvasWorkspace';
import { MotionCanvasLayersPanel } from '../MotionCanvasLayersPanel';
import type { BrushMode, ExtractionAction } from '../MotionBrushStudio';
import {
  buildOrUpdateMotionCatalogItem,
  getOrCreateItemCatalog,
  getOrCreatePlayerInventory,
  addItemToPlayerInventory,
} from '../../utils/inventoryHelpers';
import {
  loadCharactersRoster,
  saveCharactersRosterToStorage,
  applyCharacterToPhase,
} from '../../utils/characterHelpers';

export type MotionTargetCategory = 'character' | 'pet' | 'marker' | 'free_asset';

interface MotionSoloScreenProps {
  project: MapProject;
  onUpdateProject: React.Dispatch<React.SetStateAction<MapProject>>;
  onBack?: () => void;
  onOpenInventoryEditor?: () => void;
  onOpenCharactersEditor?: () => void;
  /** Quando embutido dentro do Menu de Personagens (CharactersSoloScreen) */
  embeddedMode?: boolean;
  externalCharacter?: PlayerConfig;
  onUpdateExternalCharacter?: (updater: (prev: PlayerConfig) => PlayerConfig) => void;
}

const DEFAULT_HERO_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
      <defs>
        <radialGradient id="g" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#f59e0b"/>
          <stop offset="100%" stop-color="#7c2d12"/>
        </radialGradient>
      </defs>
      <circle cx="110" cy="70" r="36" fill="url(#g)" stroke="#fde68a" stroke-width="4"/>
      <rect x="68" y="112" width="84" height="78" rx="26" fill="#1e293b" stroke="#f59e0b" stroke-width="4"/>
      <circle cx="96" cy="66" r="5" fill="#fff"/>
      <circle cx="124" cy="66" r="5" fill="#fff"/>
    </svg>`
  );

function ensureBaseLayer(layers: MarkerMotionLayer[] | undefined, basePng?: string, baseName = 'Corpo Base'): MarkerMotionLayer[] {
  const effectivePng = basePng || DEFAULT_HERO_SVG;
  if (!layers || layers.length === 0) {
    return [
      {
        id: 'layer-base-1',
        name: `👑 ${baseName}`,
        visible: true,
        isBaseAsset: true,
        pngUrl: effectivePng,
        effect: 'jelly',
        physicsMode: 'breathe',
        speed: 1.0,
        intensity: 1.0,
        scale: 1.0,
        scaleX: 1.0,
        scaleY: 1.0,
        rotation: 0,
        pivotX: 0.5,
        pivotY: 0.85,
        brushSize: 28,
        strokes: [],
      },
    ];
  }
  const hasBase = layers.some((l) => l.isBaseAsset);
  if (!hasBase) {
    const copy = [...layers];
    copy[0] = {
      ...copy[0],
      isBaseAsset: true,
      pngUrl: copy[0].pngUrl || effectivePng,
    };
    return copy;
  }
  return layers.map((l) =>
    l.isBaseAsset && !l.pngUrl ? { ...l, pngUrl: effectivePng } : l
  );
}

export const MotionSoloScreen: React.FC<MotionSoloScreenProps> = ({
  project,
  onUpdateProject,
  onBack,
  onOpenInventoryEditor,
  onOpenCharactersEditor,
  embeddedMode = false,
  externalCharacter,
  onUpdateExternalCharacter,
}) => {
  const [targetCategory, setTargetCategory] = useState<MotionTargetCategory>('character');
  const [savedCharacters, setSavedCharacters] = useState<PlayerConfig[]>(() =>
    loadCharactersRoster(project)
  );
  const [selectedCharId, setSelectedCharId] = useState<string>(() => {
    if (externalCharacter) return externalCharacter.characterId || externalCharacter.id;
    const loaded = loadCharactersRoster(project);
    return loaded[0]?.characterId || loaded[0]?.id || 'char_hero_legendary';
  });

  // Sincroniza quando externalCharacter muda no modo embutido
  useEffect(() => {
    if (externalCharacter) {
      setSelectedCharId(externalCharacter.characterId || externalCharacter.id);
    }
  }, [externalCharacter?.characterId, externalCharacter?.id]);

  const activeCharacter: PlayerConfig = useMemo(() => {
    if (embeddedMode && externalCharacter) return externalCharacter;
    return (
      savedCharacters.find((c) => (c.characterId || c.id) === selectedCharId) ||
      project.player ||
      savedCharacters[0]
    );
  }, [embeddedMode, externalCharacter, savedCharacters, selectedCharId, project.player]);

  const petList: PlayerPetCatalogItem[] = useMemo(() => {
    const gal = activeCharacter?.petConfig?.petGallery;
    return gal && gal.length > 0 ? gal : DEFAULT_PET_GALLERY;
  }, [activeCharacter]);

  const [selectedPetId, setSelectedPetId] = useState<string>(() => petList[0]?.id || 'pet-drake-solar');
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(
    () => project.markers[0]?.id || null
  );
  const [freeCompositionTitle, setFreeCompositionTitle] = useState<string>('Novo Traje / Criatura Motion');
  const [freeBasePng, setFreeBasePng] = useState<string>(DEFAULT_HERO_SVG);

  // Estado local das camadas em edição no Motion Canvas
  const [layers, setLayers] = useState<MarkerMotionLayer[]>(() =>
    ensureBaseLayer(activeCharacter?.motionLayers, activeCharacter?.avatarPng, activeCharacter?.name || 'Herói')
  );
  const [activeLayerId, setActiveLayerId] = useState<string | null>(() => layers[0]?.id || null);

  // Ferramentas do Motion Canvas
  const [brushSize, setBrushSize] = useState<number>(28);
  const [brushMode, setBrushMode] = useState<BrushMode>('lasso_free');
  const [smoothLevel, setSmoothLevel] = useState<number>(2);
  const [activeTool, setActiveTool] = useState<MotionCanvasTool>('move');
  const [isPrimordialJelly, setIsPrimordialJelly] = useState<boolean>(true);
  const [extractionAction, setExtractionAction] = useState<ExtractionAction>('cut_inpaint');
  const [autoExtract, setAutoExtract] = useState<boolean>(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3200);
  };

  // Carrega as camadas certas ao trocar de alvo (Personagem / Pet / Marcador / Livre)
  useEffect(() => {
    if (targetCategory === 'character') {
      const nextLayers = ensureBaseLayer(
        activeCharacter?.motionLayers,
        activeCharacter?.avatarPng,
        activeCharacter?.name || 'Herói'
      );
      setLayers(nextLayers);
      setActiveLayerId(nextLayers[0]?.id || null);
    } else if (targetCategory === 'pet') {
      const pet = petList.find((p) => p.id === selectedPetId) || petList[0];
      const nextLayers = ensureBaseLayer(
        pet?.motionLayers,
        pet?.avatarPng,
        pet?.name || 'Pet'
      );
      setLayers(nextLayers);
      setActiveLayerId(nextLayers[0]?.id || null);
    } else if (targetCategory === 'marker') {
      const m = project.markers.find((mk) => mk.id === selectedMarkerId) || project.markers[0];
      if (m) {
        const nextLayers = ensureBaseLayer(m.motionLayers, m.customPngUrl, m.name || 'Marcador');
        setLayers(nextLayers);
        setActiveLayerId(nextLayers[0]?.id || null);
      }
    } else if (targetCategory === 'free_asset') {
      const nextLayers = ensureBaseLayer(undefined, freeBasePng, freeCompositionTitle);
      setLayers(nextLayers);
      setActiveLayerId(nextLayers[0]?.id || null);
    }
  }, [targetCategory, selectedCharId, selectedPetId, selectedMarkerId]);

  // Propaga alterações de camadas em tempo real para o alvo selecionado
  const handleUpdateLayers = (nextLayers: MarkerMotionLayer[]) => {
    setLayers(nextLayers);

    if (targetCategory === 'character') {
      const baseLayer = nextLayers.find((l) => l.isBaseAsset) || nextLayers[0];
      const nextAvatar = baseLayer?.pngUrl || activeCharacter?.avatarPng;

      if (embeddedMode && onUpdateExternalCharacter) {
        onUpdateExternalCharacter((prev) => ({
          ...prev,
          avatarPng: nextAvatar,
          motionLayers: nextLayers,
        }));
      } else {
        setSavedCharacters((prev) => {
          const updated = prev.map((c) =>
            (c.characterId || c.id) === (activeCharacter.characterId || activeCharacter.id)
              ? { ...c, avatarPng: nextAvatar, motionLayers: nextLayers }
              : c
          );
          saveCharactersRosterToStorage(updated);
          return updated;
        });
        onUpdateProject((prev) => ({
          ...prev,
          savedCharacters: prev.savedCharacters
            ? prev.savedCharacters.map((c) =>
                (c.characterId || c.id) === (activeCharacter.characterId || activeCharacter.id)
                  ? { ...c, avatarPng: nextAvatar, motionLayers: nextLayers }
                  : c
              )
            : undefined,
          player:
            (prev.player?.characterId || prev.player?.id) ===
              (activeCharacter.characterId || activeCharacter.id) || !prev.player
              ? {
                  ...(prev.player || activeCharacter),
                  avatarPng: nextAvatar,
                  motionLayers: nextLayers,
                }
              : prev.player,
        }));
      }
    } else if (targetCategory === 'pet') {
      const baseLayer = nextLayers.find((l) => l.isBaseAsset) || nextLayers[0];
      const updatePetInChar = (char: PlayerConfig): PlayerConfig => {
        const currentGallery =
          char.petConfig?.petGallery && char.petConfig.petGallery.length > 0
            ? char.petConfig.petGallery
            : DEFAULT_PET_GALLERY;
        const nextGallery = currentGallery.map((p) =>
          p.id === selectedPetId
            ? {
                ...p,
                avatarPng: baseLayer?.pngUrl || p.avatarPng,
                motionLayers: nextLayers,
              }
            : p
        );
        return {
          ...char,
          petConfig: {
            ...(char.petConfig || {}),
            petGallery: nextGallery,
          },
        };
      };

      if (embeddedMode && onUpdateExternalCharacter) {
        onUpdateExternalCharacter(updatePetInChar);
      } else {
        setSavedCharacters((prev) => {
          const updated = prev.map((c) =>
            (c.characterId || c.id) === (activeCharacter.characterId || activeCharacter.id)
              ? updatePetInChar(c)
              : c
          );
          saveCharactersRosterToStorage(updated);
          return updated;
        });
        onUpdateProject((prev) => ({
          ...prev,
          player: prev.player ? updatePetInChar(prev.player) : prev.player,
        }));
      }
    } else if (targetCategory === 'marker' && selectedMarkerId) {
      const baseLayer = nextLayers.find((l) => l.isBaseAsset) || nextLayers[0];
      onUpdateProject((prev) => ({
        ...prev,
        markers: prev.markers.map((m) =>
          m.id === selectedMarkerId
            ? {
                ...m,
                customPngUrl: baseLayer?.pngUrl || m.customPngUrl,
                motionLayers: nextLayers,
              }
            : m
        ),
      }));
    }
  };

  // Trocar PNG Base
  const handleReplaceBaseAssetPng = (newPngUrl: string) => {
    if (targetCategory === 'free_asset') {
      setFreeBasePng(newPngUrl);
    }
    const nextLayers = layers.map((l, idx) =>
      l.isBaseAsset || idx === 0 ? { ...l, isBaseAsset: true, pngUrl: newPngUrl } : l
    );
    handleUpdateLayers(nextLayers);
    showToast('🖼️ Imagem Base atualizada no Motion Canvas!');
  };

  // Sincroniza uma tag de camada (`inventoryItemTag`) direto para o Catálogo de Itens + Mochila do Herói!
  const handleSyncMotionItemToCatalog = (params: {
    tag: string;
    displayName: string;
    equipSlot?: MarkerMotionLayer['equipSlot'];
    iconPng?: string;
    buyPrice?: number;
  }) => {
    const currentCatalog = getOrCreateItemCatalog(project);
    const { updatedCatalog, itemDef } = buildOrUpdateMotionCatalogItem(currentCatalog, params);
    const currentInv = getOrCreatePlayerInventory(project);
    const { inventory: updatedInv } = addItemToPlayerInventory(
      currentInv,
      updatedCatalog,
      itemDef.id,
      1
    );

    // Equipa a tag no personagem para já visualizar funcionando
    const prevEquipped = activeCharacter?.equippedMotionTags || [];
    const nextEquipped = Array.from(new Set([...prevEquipped, params.tag.trim()]));

    if (embeddedMode && onUpdateExternalCharacter) {
      onUpdateExternalCharacter((prev) => ({
        ...prev,
        equippedMotionTags: nextEquipped,
        unlockedMotionTags: Array.from(
          new Set([...(prev.unlockedMotionTags || []), params.tag.trim()])
        ),
      }));
    }

    onUpdateProject((prev) => ({
      ...prev,
      itemCatalog: updatedCatalog,
      playerInventory: updatedInv,
      player: prev.player
        ? {
            ...prev.player,
            equippedMotionTags: Array.from(
              new Set([...(prev.player.equippedMotionTags || []), params.tag.trim()])
            ),
            unlockedMotionTags: Array.from(
              new Set([...(prev.player.unlockedMotionTags || []), params.tag.trim()])
            ),
            inventory: updatedInv,
          }
        : prev.player,
    }));

    showToast(
      `🎒 Motion Item "${itemDef.name}" (#${params.tag}) criado no Inventário, adicionado à Mochila e disponível para Lojas & Quests!`
    );
  };

  // Alterna equipar/desequipar uma Tag de Motion Item no personagem
  const handleToggleEquipMotionTag = (tag: string) => {
    const clean = tag.trim();
    if (!clean) return;
    const currentEquipped = activeCharacter?.equippedMotionTags || [];
    const exists = currentEquipped.some((t) => t.toLowerCase() === clean.toLowerCase());
    const nextEquipped = exists
      ? currentEquipped.filter((t) => t.toLowerCase() !== clean.toLowerCase())
      : [...currentEquipped, clean];

    if (embeddedMode && onUpdateExternalCharacter) {
      onUpdateExternalCharacter((prev) => ({
        ...prev,
        equippedMotionTags: nextEquipped,
      }));
    }

    onUpdateProject((prev) => ({
      ...prev,
      player: prev.player
        ? {
            ...prev.player,
            equippedMotionTags: nextEquipped,
          }
        : prev.player,
    }));
  };

  // Salvar composição atual na Galeria Global / Matriz de Assets
  const handleSaveCompositionToMatrix = () => {
    const baseLayer = layers.find((l) => l.isBaseAsset) || layers[0];
    const previewPng = baseLayer?.pngUrl || DEFAULT_HERO_SVG;
    const title =
      targetCategory === 'character'
        ? `${activeCharacter?.name || 'Herói'} (Rig Motion)`
        : targetCategory === 'pet'
        ? `${petList.find((p) => p.id === selectedPetId)?.name || 'Pet'} (Rig Motion)`
        : targetCategory === 'marker'
        ? `${project.markers.find((m) => m.id === selectedMarkerId)?.name || 'Marcador'} (Rig Motion)`
        : freeCompositionTitle;

    const newAsset: GalleryAsset = {
      id: `motion-comp-${Date.now()}`,
      name: `🎬 ${title}`,
      category: 'Motion & Rigging',
      dataUrl: previewPng,
      createdAt: new Date().toISOString(),
      motionLayers: JSON.parse(JSON.stringify(layers)),
      isPrimordialJelly,
    };

    onUpdateProject((prev) => ({
      ...prev,
      galleryAssets: [newAsset, ...(prev.galleryAssets || [])],
      galleryCategories: Array.from(
        new Set([...(prev.galleryCategories || []), 'Motion & Rigging', 'Peças Motion'])
      ),
    }));

    showToast(`✅ Composição "${title}" salva na Matriz Global de Assets!`);
  };

  // Constrói o Virtual MapMarker para alimentar o MotionCanvasWorkspace e MotionCanvasStudio
  const virtualMarker: MapMarker = useMemo(() => {
    const baseLayer = layers.find((l) => l.isBaseAsset) || layers[0];
    const png = baseLayer?.pngUrl || DEFAULT_HERO_SVG;
    const label =
      targetCategory === 'character'
        ? activeCharacter?.name || 'Personagem'
        : targetCategory === 'pet'
        ? petList.find((p) => p.id === selectedPetId)?.name || 'Pet Companheiro'
        : targetCategory === 'marker'
        ? project.markers.find((m) => m.id === selectedMarkerId)?.name || 'Marcador'
        : freeCompositionTitle;

    return {
      id: `virtual-motion-${targetCategory}-${selectedCharId}-${selectedPetId}`,
      name: label,
      type: 'npc',
      x: 200,
      y: 200,
      description: 'Alvo ativo no Estúdio Motion Canvas 2D',
      icon: '🎬',
      color: '#f59e0b',
      customPngUrl: png,
      scale: 1.0,
      motionLayers: layers,
      autoBounce: isPrimordialJelly,
    };
  }, [
    targetCategory,
    selectedCharId,
    selectedPetId,
    selectedMarkerId,
    freeCompositionTitle,
    layers,
    activeCharacter,
    petList,
    project.markers,
    isPrimordialJelly,
  ]);

  const activeLayer = useMemo(
    () => layers.find((l) => l.id === activeLayerId) || layers[0] || null,
    [layers, activeLayerId]
  );

  return (
    <div className="w-full h-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden select-none">
      {/* BARRA SUPERIOR DO ESTÚDIO MOTION (Compacta se embutida no Editor de Personagens, Completa se Independente) */}
      <div className="shrink-0 px-4 py-2.5 bg-slate-900/95 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {!embeddedMode && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-amber-400" />
              <span>Voltar ao Hub</span>
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-fuchsia-500/30 to-amber-500/30 border border-fuchsia-500/40 flex items-center justify-center text-base shadow-inner">
              🎬
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xs sm:text-sm font-black tracking-tight text-white uppercase">
                  {embeddedMode
                    ? `Motion & Rigging 2D — ${activeCharacter?.name || 'Personagem'}`
                    : 'Estúdio Motion Canvas 2D & Paper-Doll'}
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[9px] font-black uppercase">
                  Roupas & Itens Equipáveis
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Recorte peças, aplique física 2D e agrupe camadas por Tag para criar Roupas, Skins, Cintos e Armas equipáveis na Mochila!
              </p>
            </div>
          </div>
        </div>

        {/* SELETOR DE MODO DE ALVO (Personagem / Pets / Marcadores / Livre) */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setTargetCategory('character')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              targetCategory === 'character'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>🦸 Corpo & Roupas do Herói</span>
          </button>

          <button
            type="button"
            onClick={() => setTargetCategory('pet')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              targetCategory === 'pet'
                ? 'bg-emerald-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PawPrint className="w-3.5 h-3.5" />
            <span>🐾 Pets Companheiros</span>
          </button>

          {!embeddedMode && (
            <>
              <button
                type="button"
                onClick={() => setTargetCategory('marker')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  targetCategory === 'marker'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>📍 Marcadores da Fase</span>
              </button>

              <button
                type="button"
                onClick={() => setTargetCategory('free_asset')}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  targetCategory === 'free_asset'
                    ? 'bg-fuchsia-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>🎨 Composição Livre</span>
              </button>
            </>
          )}
        </div>

        {/* SELETOR ESPECÍFICO DO ITEM E AÇÕES RÁPIDAS */}
        <div className="flex items-center gap-2">
          {targetCategory === 'character' && !embeddedMode && (
            <select
              value={selectedCharId}
              onChange={(e) => setSelectedCharId(e.target.value)}
              className="bg-slate-950 border border-amber-500/40 rounded-xl px-2.5 py-1.5 text-xs font-bold text-amber-200"
            >
              {savedCharacters.map((c) => {
                const cid = c.characterId || c.id;
                return (
                  <option key={cid} value={cid}>
                    🦸 {c.name} ({c.role || 'Herói'})
                  </option>
                );
              })}
            </select>
          )}

          {targetCategory === 'pet' && (
            <select
              value={selectedPetId}
              onChange={(e) => setSelectedPetId(e.target.value)}
              className="bg-slate-950 border border-emerald-500/40 rounded-xl px-2.5 py-1.5 text-xs font-bold text-emerald-200"
            >
              {petList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.iconEmoji} {p.name}
                </option>
              ))}
            </select>
          )}

          {targetCategory === 'marker' && (
            <select
              value={selectedMarkerId || ''}
              onChange={(e) => setSelectedMarkerId(e.target.value)}
              className="bg-slate-950 border border-sky-500/40 rounded-xl px-2.5 py-1.5 text-xs font-bold text-sky-200 max-w-[200px]"
            >
              {project.markers.length === 0 ? (
                <option value="">Nenhum marcador na fase</option>
              ) : (
                project.markers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.icon || '📍'} {m.name}
                  </option>
                ))
              )}
            </select>
          )}

          {targetCategory === 'free_asset' && (
            <input
              type="text"
              value={freeCompositionTitle}
              onChange={(e) => setFreeCompositionTitle(e.target.value)}
              placeholder="Nome do Asset Motion..."
              className="bg-slate-950 border border-fuchsia-500/40 rounded-xl px-2.5 py-1.5 text-xs font-bold text-fuchsia-200 w-44"
            />
          )}

          <button
            type="button"
            onClick={handleSaveCompositionToMatrix}
            className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Salvar esta composição completa na Matriz Global de Assets do projeto"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Salvar na Matriz</span>
          </button>

          {onOpenInventoryEditor && (
            <button
              type="button"
              onClick={onOpenInventoryEditor}
              className="px-3 py-1.5 rounded-xl bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-200 border border-fuchsia-500/40 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Abrir o Editor de Inventário & Lojas para ver seus Motion Items"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Inventário & Lojas</span>
            </button>
          )}
        </div>
      </div>

      {/* ÁREA DE TRABALHO DE 3 COLUNAS DO MOTION STUDIO */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* COLUNA ESQUERDA: Ferramentas de Recorte, Pincel e Física 2D */}
        <div className="w-80 xl:w-88 shrink-0 h-full border-r border-slate-800 bg-slate-900/70 overflow-y-auto">
          <MotionCanvasStudio
            markers={targetCategory === 'marker' ? project.markers : [virtualMarker]}
            selectedMarkerId={
              targetCategory === 'marker' ? selectedMarkerId : virtualMarker.id
            }
            onSelectMarker={(id) => {
              if (targetCategory === 'marker') setSelectedMarkerId(id);
            }}
            activeLayerId={activeLayer?.id || null}
            onSelectLayer={(id) => setActiveLayerId(id)}
            layers={layers}
            onUpdateLayers={handleUpdateLayers}
            brushSize={brushSize}
            onBrushSizeChange={setBrushSize}
            brushMode={brushMode}
            onBrushModeChange={setBrushMode}
            smoothLevel={smoothLevel}
            onSmoothLevelChange={setSmoothLevel}
            activeTool={activeTool}
            onActiveToolChange={setActiveTool}
            onClearActiveLayerStrokes={() => {
              if (!activeLayer) return;
              handleUpdateLayers(
                layers.map((l) => (l.id === activeLayer.id ? { ...l, strokes: [] } : l))
              );
            }}
            onSaveToMarker={handleSaveCompositionToMatrix}
            onReplaceBaseAssetPng={handleReplaceBaseAssetPng}
            isPrimordialJelly={isPrimordialJelly}
            onTogglePrimordialJelly={() => setIsPrimordialJelly((v) => !v)}
            extractionAction={extractionAction}
            onExtractionActionChange={setExtractionAction}
            autoExtract={autoExtract}
            onAutoExtractChange={setAutoExtract}
            galleryAssets={project.galleryAssets || []}
            galleryCategories={project.galleryCategories || []}
            onSavePieceToGallery={(piece) => {
              const newPiece: GalleryAsset = {
                id: `piece-${Date.now()}`,
                name: piece.name,
                category: 'Peças Motion',
                dataUrl: piece.dataUrl,
                createdAt: new Date().toISOString(),
              };
              onUpdateProject((prev) => ({
                ...prev,
                galleryAssets: [newPiece, ...(prev.galleryAssets || [])],
                galleryCategories: Array.from(
                  new Set([...(prev.galleryCategories || []), 'Peças Motion'])
                ),
              }));
              showToast(`🧩 Peça "${piece.name}" salva na Matriz de Assets!`);
            }}
            onLoadMotionComposition={(asset) => {
              if (asset.motionLayers && asset.motionLayers.length > 0) {
                const cloned = JSON.parse(JSON.stringify(asset.motionLayers));
                handleUpdateLayers(cloned);
                setActiveLayerId(cloned[0]?.id || null);
                showToast(`🎬 Composição "${asset.name}" carregada!`);
              }
            }}
          />
        </div>

        {/* COLUNA CENTRAL: Palco Interativo Motion Canvas (Gizmos, Recorte Laço, Pinos e Simulação Física) */}
        <div className="flex-1 h-full min-w-0 relative overflow-hidden bg-slate-950">
          <MotionCanvasWorkspace
            marker={virtualMarker}
            activeLayer={activeLayer}
            layers={layers}
            brushSize={brushSize}
            brushMode={brushMode}
            onBrushModeChange={setBrushMode}
            smoothLevel={smoothLevel}
            activeTool={activeTool}
            onActiveToolChange={setActiveTool}
            onAddStroke={(stroke) => {
              if (!activeLayer) return;
              handleUpdateLayers(
                layers.map((l) =>
                  l.id === activeLayer.id
                    ? { ...l, strokes: [...(l.strokes || []), stroke] }
                    : l
                )
              );
            }}
            onUpdateActiveLayer={(updates) => {
              if (!activeLayer) return;
              handleUpdateLayers(
                layers.map((l) => (l.id === activeLayer.id ? { ...l, ...updates } : l))
              );
            }}
            onCreateCutoutPiece={(newPieceLayer) => {
              const next = [...layers, newPieceLayer];
              handleUpdateLayers(next);
              setActiveLayerId(newPieceLayer.id);
              showToast(
                `✂️ Peça "${newPieceLayer.name}" extraída! Você pode colocar uma Tag de Motion Item nela à direita.`
              );
            }}
            onReplaceBaseAssetPng={handleReplaceBaseAssetPng}
            onSelectLayer={(id) => setActiveLayerId(id)}
            isPrimordialJelly={isPrimordialJelly}
            onTogglePrimordialJelly={() => setIsPrimordialJelly((v) => !v)}
            extractionAction={extractionAction}
            onExtractionActionChange={setExtractionAction}
            autoExtract={autoExtract}
            onAutoExtractChange={setAutoExtract}
          />
        </div>

        {/* COLUNA DIREITA: Hierarquia Z-Index, Deforme e Agrupador de Motion Items (Roupas / Skins / Cinto / Armas) */}
        <div className="w-84 xl:w-92 shrink-0 h-full border-l border-slate-800 bg-slate-900/80 overflow-hidden flex flex-col">
          <MotionCanvasLayersPanel
            layers={layers}
            activeLayerId={activeLayer?.id || null}
            onSelectLayer={(id) => setActiveLayerId(id)}
            onUpdateLayers={handleUpdateLayers}
            onReplaceBaseAssetPng={handleReplaceBaseAssetPng}
            galleryAssets={project.galleryAssets || []}
            galleryCategories={project.galleryCategories || []}
            onSavePieceToGallery={(piece) => {
              const newPiece: GalleryAsset = {
                id: `piece-${Date.now()}`,
                name: piece.name,
                category: 'Peças Motion',
                dataUrl: piece.dataUrl,
                createdAt: new Date().toISOString(),
              };
              onUpdateProject((prev) => ({
                ...prev,
                galleryAssets: [newPiece, ...(prev.galleryAssets || [])],
                galleryCategories: Array.from(
                  new Set([...(prev.galleryCategories || []), 'Peças Motion'])
                ),
              }));
              showToast(`🧩 Peça "${piece.name}" salva na Matriz de Assets!`);
            }}
            onTriggerSave={handleSaveCompositionToMatrix}
            onSyncMotionItemToCatalog={handleSyncMotionItemToCatalog}
            equippedMotionTags={activeCharacter?.equippedMotionTags || []}
            onToggleEquipMotionTag={handleToggleEquipMotionTag}
          />
        </div>
      </div>

      {/* TOAST DE FEEDBACK */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900/95 border border-fuchsia-500/50 text-fuchsia-200 text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-none">
          <Sparkles className="w-4 h-4 text-fuchsia-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
};
