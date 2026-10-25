import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getResolvedPlayerPetConfig, type MapProject } from '../../../marker_dream/src/types/map';
import {
  getOrderedPhaseQuests,
  type EquipmentSlotKey,
  type UnifiedBackpackSlotItem,
  type UnifiedHudQuestEntry,
} from '../../../marker_dream/src/components/screens/HudStatusAndQuestsWidgets';

export const DEMO_SEED_ITEM_IDS = new Set([
  'inv_item_1',
  'inv_item_2',
  'inv_item_3',
  'inv_item_4',
  'inv_item_5',
  'def_sword_starter',
  'def_shield_oak',
  'def_potion_hp',
  'def_key_gold',
  'def_apple_fresh',
  'item-sword-starter',
  'item-shield-starter',
  'item-potion-health',
  'item-key-bronze',
  'item-apple-mystic',
  'item-wood-oak',
  'item-herb-emerald',
  'item-crystal-mana',
]);

export const DEMO_SEED_PET_IDS = new Set([
  'pet-drake-solar',
  'pet-fox-mystic',
  'pet-wolf-frost',
  'pet-pixie-light',
  'pet-tiger-thunder',
  'pet-slime-royal',
]);

export const ConceptStar: React.FC<{ size?: number }> = ({ size = 12 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    style={{
      flexShrink: 0,
      display: 'inline-block',
      filter: 'drop-shadow(0 1px 1px rgba(120,70,10,0.3))',
    }}
  >
    <path
      d="M12 1 L14.8 9.2 L23 12 L14.8 14.8 L12 23 L9.2 14.8 L1 12 L9.2 9.2 Z"
      fill="#f59e0b"
      stroke="#92400e"
      strokeWidth="1.5"
    />
  </svg>
);

export const ConceptGoldCoinSvg: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
    <defs>
      <radialGradient id="cGoldShared" cx="35%" cy="30%" r="70%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="55%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </radialGradient>
    </defs>
    <circle cx="16" cy="16" r="14" fill="url(#cGoldShared)" stroke="#78350f" strokeWidth="2" />
    <circle cx="16" cy="16" r="10.5" fill="none" stroke="#fde68a" strokeWidth="1.2" />
    <path
      d="M16 9 L16 23 M13 12 L19 12 M13 20 L19 20"
      stroke="#78350f"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const ConceptBlueGemSvg: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="cGemShared" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#60a5fa" />
        <stop offset="50%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#1e3a8a" />
      </linearGradient>
    </defs>
    <polygon
      points="16,2 27,9 27,23 16,30 5,23 5,9"
      fill="url(#cGemShared)"
      stroke="#172554"
      strokeWidth="1.8"
    />
    <polygon points="16,6 23,11 23,21 16,26 9,21 9,11" fill="#93c5fd" fillOpacity="0.35" />
  </svg>
);

export const ConceptLeatherBagSvg: React.FC<{ size?: number }> = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" style={{ flexShrink: 0 }}>
    <defs>
      <radialGradient id="cBagShared" cx="40%" cy="35%" r="70%">
        <stop offset="0%" stopColor="#b45309" />
        <stop offset="65%" stopColor="#78350f" />
        <stop offset="100%" stopColor="#451a03" />
      </radialGradient>
    </defs>
    <path
      d="M11 8 C11 5, 21 5, 21 8 L25 14 C27 19, 26 27, 20 28 L12 28 C6 27, 5 19, 7 14 Z"
      fill="url(#cBagShared)"
      stroke="#271202"
      strokeWidth="1.8"
    />
    <path d="M10 11 L22 11" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
    <rect x="14" y="15" width="4" height="5" rx="1" fill="#f59e0b" />
  </svg>
);

export const HeroSlimeSilhouetteSvg: React.FC<{ width?: number; height?: number }> = ({
  width = 88,
  height = 80,
}) => (
  <svg viewBox="0 0 140 120" width={width} height={height} style={{ flexShrink: 0 }}>
    <defs>
      <linearGradient id="slimeSilGradShared" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#c5cbd6" />
        <stop offset="70%" stopColor="#b0b7c4" />
        <stop offset="100%" stopColor="#9fa7b6" />
      </linearGradient>
    </defs>
    <ellipse cx="70" cy="105" rx="46" ry="6" fill="rgba(160, 145, 118, 0.25)" />
    <path
      d="M 24 92 C 20 80, 28 32, 70 32 C 112 32, 120 80, 116 92 C 112 100, 92 102, 70 102 C 48 102, 28 100, 24 92 Z"
      fill="url(#slimeSilGradShared)"
      stroke="#d8dce3"
      strokeWidth="2"
    />
  </svg>
);

export const ConceptSectionHeader: React.FC<{ title: string; compact?: boolean }> = ({
  title,
  compact = false,
}) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: compact ? '5px' : '8px',
      width: '100%',
      marginBottom: compact ? '4px' : '6px',
      minWidth: 0,
    }}
  >
    <div
      style={{
        flex: 1,
        height: '1.5px',
        maxWidth: compact ? '40px' : '95px',
        background: 'linear-gradient(90deg, rgba(212,175,55,0) 0%, rgba(212,175,55,0.85) 100%)',
      }}
    />
    <ConceptStar size={compact ? 10 : 12} />
    <span
      style={{
        fontFamily: "'Cinzel', serif",
        fontWeight: 900,
        fontSize: compact ? '10.5px' : '12.5px',
        letterSpacing: compact ? '0.05em' : '0.1em',
        color: '#0f172a',
        textTransform: 'uppercase',
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </span>
    <ConceptStar size={compact ? 10 : 12} />
    <div
      style={{
        flex: 1,
        height: '1.5px',
        maxWidth: compact ? '40px' : '95px',
        background: 'linear-gradient(90deg, rgba(212,175,55,0.85) 0%, rgba(212,175,55,0) 100%)',
      }}
    />
  </div>
);

export interface BackpackScreenStateProps {
  project: MapProject;
  initialFolderTab?: 'equipamento' | 'inventario_geral' | 'deck' | 'jornada' | 'tarefas';
  mapCollectedInventory?: Record<string, number>;
  onClose: () => void;
  onUpdateProject?: (updates: Partial<MapProject>) => void;
  onDropItemToMap?: (item: UnifiedBackpackSlotItem) => void;
}

export function useBackpackScreenState({
  project,
  initialFolderTab = 'equipamento',
  mapCollectedInventory = {},
  onClose,
  onUpdateProject,
  onDropItemToMap,
}: BackpackScreenStateProps) {
  const [topFolderTab, setTopFolderTab] = useState<'equipamento' | 'deck' | 'jornada' | 'tarefas'>(
    initialFolderTab === 'inventario_geral' ? 'equipamento' : initialFolderTab
  );

  useEffect(() => {
    if (initialFolderTab) {
      setTopFolderTab(initialFolderTab === 'inventario_geral' ? 'equipamento' : initialFolderTab);
    }
  }, [initialFolderTab]);

  const [activeCategory, setActiveCategory] = useState<
    'todos' | 'pets' | 'item_pet' | 'equipaveis' | 'artefatos' | 'consumiveis' | 'livros' | 'outros'
  >('todos');

  const [selectDropMode, setSelectDropMode] = useState(false);
  const [cardSearchQuery, setCardSearchQuery] = useState('');
  const [cardRarityFilter, setCardRarityFilter] = useState<string>('all');
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);

  const resolvedPetConfig = useMemo(
    () => getResolvedPlayerPetConfig(project.player),
    [project.player]
  );

  const realPetGallery = useMemo(() => {
    const rawGallery = project.player?.petConfig?.petGallery || [];
    return rawGallery.filter((p) => !DEMO_SEED_PET_IDS.has(p.id));
  }, [project.player?.petConfig?.petGallery]);

  const realEquippedPets = useMemo(() => {
    const rawEq = project.player?.petConfig?.equippedPetIds || [null, null, null];
    return [0, 1, 2].map((idx) => {
      const pid = rawEq[idx];
      if (!pid || DEMO_SEED_PET_IDS.has(pid)) return null;
      return realPetGallery.find((p) => p.id === pid) || null;
    });
  }, [project.player?.petConfig?.equippedPetIds, realPetGallery]);

  const [targetPetSlotIdx, setTargetPetSlotIdx] = useState<number>(0);
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);

  const [equippedBySlot, setEquippedBySlot] = useState<Record<EquipmentSlotKey, string | null>>({
    head: null,
    armor: null,
    boots: null,
    pet1: null,
    pet2: null,
    pet3: null,
    accessory: null,
    pet: null,
    weapon: null,
  });

  const equipPetInSlot = (petId: string | null, slotIdx: number, summonImmediately = true) => {
    const clampedIdx = Math.max(0, Math.min(2, slotIdx));
    const currentRaw = project.player?.petConfig?.equippedPetIds || [null, null, null];
    const nextEquippedIds: (string | null)[] = [
      currentRaw[0] && !DEMO_SEED_PET_IDS.has(currentRaw[0]) ? currentRaw[0] : null,
      currentRaw[1] && !DEMO_SEED_PET_IDS.has(currentRaw[1]) ? currentRaw[1] : null,
      currentRaw[2] && !DEMO_SEED_PET_IDS.has(currentRaw[2]) ? currentRaw[2] : null,
    ];
    if (petId) {
      const existingIdx = nextEquippedIds.findIndex((id, i) => id === petId && i !== clampedIdx);
      if (existingIdx >= 0) {
        nextEquippedIds[existingIdx] = nextEquippedIds[clampedIdx];
      }
    }
    nextEquippedIds[clampedIdx] = petId;

    const nextActiveSlot = summonImmediately ? clampedIdx : targetPetSlotIdx;
    const nextActivePetId = nextEquippedIds[nextActiveSlot] || nextEquippedIds.find(Boolean) || null;
    const catalogPet = nextActivePetId
      ? realPetGallery.find((p) => p.id === nextActivePetId)
      : null;

    if (onUpdateProject && project.player) {
      onUpdateProject({
        player: {
          ...project.player,
          petConfig: {
            ...(project.player.petConfig || {}),
            enabled: !!nextActivePetId,
            equippedPetIds: nextEquippedIds,
            activePetSlotIndex: nextActiveSlot,
            activePetId: nextActivePetId,
            ...(catalogPet
              ? {
                  name: catalogPet.name,
                  iconEmoji: catalogPet.iconEmoji,
                  avatarPng: catalogPet.avatarPng,
                  hp: catalogPet.hp ?? catalogPet.maxHp ?? 140,
                  maxHp: catalogPet.maxHp ?? 140,
                  defense: catalogPet.defense ?? 16,
                  level: catalogPet.level ?? 1,
                  xp: catalogPet.xp ?? 0,
                  maxXp: catalogPet.maxXp ?? 100,
                }
              : {}),
            petGallery: realPetGallery,
          },
        },
      });
    }
  };

  const [removedIds, setRemovedIds] = useState<Record<string, number>>({});
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [balloonExpandedLore, setBalloonExpandedLore] = useState<boolean>(false);
  const [activeEquipSlotFilter, setActiveEquipSlotFilter] = useState<EquipmentSlotKey | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const itemsScrollRef = useRef<HTMLDivElement | null>(null);
  const cardsScrollRef = useRef<HTMLDivElement | null>(null);
  const catScrollRef = useRef<HTMLDivElement | null>(null);

  const triggerToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  const customHeroSpritePng = useMemo(() => {
    const raw = project.player?.avatarDownPng || project.player?.avatarPng || '';
    if (!raw || raw.startsWith('data:image/svg+xml')) return '';
    return raw;
  }, [project.player?.avatarDownPng, project.player?.avatarPng]);

  const heroDisplayName = useMemo(() => {
    const rawName = project.player?.name?.trim() || '';
    if (!rawName || rawName.toLowerCase().includes('aurelius')) {
      return 'NOME DO HERÓI';
    }
    return rawName.toUpperCase();
  }, [project.player?.name]);

  const allUnifiedItems = useMemo<UnifiedBackpackSlotItem[]>(() => {
    const list: UnifiedBackpackSlotItem[] = [];

    for (const pItem of project.playerInventory?.items || []) {
      if (
        DEMO_SEED_ITEM_IDS.has(pItem.id) ||
        (pItem.definitionId && DEMO_SEED_ITEM_IDS.has(pItem.definitionId))
      ) {
        continue;
      }

      const catRaw = (pItem.category || pItem.type || '').toLowerCase();
      let category: UnifiedBackpackSlotItem['category'] = 'outros';
      let equipSlot: EquipmentSlotKey | undefined = undefined;

      const catalogDef = (project.itemCatalog || []).find(
        (c) =>
          c.id === pItem.definitionId ||
          c.id === pItem.id ||
          c.name.toLowerCase() === pItem.name.toLowerCase()
      );
      const motionTag = pItem.motionLayerTag || catalogDef?.motionLayerTag || '';
      const allTags = [
        ...(pItem.stateTags || []),
        ...(catalogDef?.stateTags || []),
        motionTag,
        catRaw,
      ]
        .join(' ')
        .toLowerCase();

      const isMotionItem =
        Boolean(motionTag) ||
        (pItem.stateTags || []).includes('motion_item') ||
        (catalogDef?.stateTags || []).includes('motion_item');

      const isArtifactItem =
        allTags.includes('artefato') ||
        allTags.includes('artifact') ||
        allTags.includes('relic') ||
        allTags.includes('reliquia') ||
        allTags.includes('accessory') ||
        allTags.includes('amulet') ||
        allTags.includes('ring') ||
        pItem.motionEquipSlot === 'accessory' ||
        pItem.motionEquipSlot === 'boots' ||
        catalogDef?.motionEquipSlot === 'accessory' ||
        catalogDef?.motionEquipSlot === 'boots';

      if (catRaw.includes('item_pet') || catRaw.includes('pet')) {
        category = 'item_pet';
      } else if (isArtifactItem) {
        category = 'equipaveis';
        equipSlot = 'accessory';
      } else if (
        isMotionItem ||
        catRaw.includes('equip') ||
        catRaw.includes('weapon') ||
        catRaw.includes('armor')
      ) {
        category = 'equipaveis';
        const mSlot = pItem.motionEquipSlot || catalogDef?.motionEquipSlot;
        if (mSlot === 'head' || catRaw.includes('helm') || catRaw.includes('head')) {
          equipSlot = 'head';
        } else if (mSlot === 'skin' || mSlot === 'armor' || catRaw.includes('armor')) {
          equipSlot = 'armor';
        } else {
          equipSlot = 'accessory';
        }
      } else if (catRaw.includes('consum') || catRaw.includes('potion') || catRaw.includes('food')) {
        category = 'consumiveis';
      } else if (catRaw.includes('read') || catRaw.includes('book') || catRaw.includes('scroll')) {
        category = 'livros';
      }

      const rem = removedIds[pItem.id] || 0;
      const finalQty = Math.max(0, (pItem.quantity || 1) - rem);
      if (finalQty <= 0) continue;

      list.push({
        id: pItem.id,
        name: pItem.name,
        iconEmoji: pItem.iconEmoji || '📦',
        iconPng: pItem.iconPng || catalogDef?.iconPng,
        quantity: finalQty,
        category,
        equipSlot,
        rarity: pItem.rarity || catalogDef?.rarity || 'common',
        shortDescription:
          pItem.description || catalogDef?.shortDescription || 'Item do inventário.',
        detailedLore:
          pItem.detailedDescription ||
          catalogDef?.detailedDescription ||
          pItem.description ||
          'Artefato catalogado na mochila.',
        statsText:
          [
            motionTag ? `🎬 #${motionTag}` : '',
            pItem.stats?.attack ? `+${pItem.stats.attack} ATQ` : '',
            pItem.stats?.defense ? `+${pItem.stats.defense} DEF` : '',
            pItem.stats?.healthRestore ? `+${pItem.stats.healthRestore} PV` : '',
          ]
            .filter(Boolean)
            .join(' • ') || undefined,
        pages: pItem.readableContent?.pages?.map((pg) => ({
          title: pg.title,
          text: pg.text,
        })),
        sourceKind: 'project_item',
        motionLayerTag: motionTag || undefined,
      });
    }

    for (const [resName, qty] of Object.entries(mapCollectedInventory)) {
      const rem = removedIds[`map-${resName}`] || 0;
      const finalQty = Math.max(0, qty - rem);
      if (finalQty <= 0) continue;
      list.push({
        id: `map-${resName}`,
        name: resName,
        iconEmoji: '💎',
        quantity: finalQty,
        category: 'outros',
        equipSlot: 'accessory',
        rarity: 'uncommon',
        shortDescription: `Coletado na fase (×${finalQty}).`,
        detailedLore: `Recurso autêntico recolhido durante a exploração.`,
        statsText: `Quantidade: ×${finalQty}`,
        sourceKind: 'map_resource',
      });
    }

    for (const pet of realPetGallery) {
      const slotItemId = `bp-pet-${pet.id}`;
      const rem = removedIds[slotItemId] || 0;
      if (rem >= 1) continue;
      const petLv = pet.level ?? 1;
      const petHp = pet.hp ?? pet.maxHp ?? 140;
      const petMaxHp = pet.maxHp ?? 140;
      list.push({
        id: slotItemId,
        petId: pet.id,
        name: `${pet.name}`,
        iconEmoji: pet.iconEmoji || '🐾',
        iconPng: pet.avatarPng,
        quantity: 1,
        category: 'pets',
        equipSlot: 'pet',
        rarity: pet.rarity || 'epic',
        shortDescription: pet.shortDescription || 'Pet Companheiro.',
        detailedLore: pet.detailedLore || 'Companheiro da galeria de pets.',
        statsText: `Nv.${petLv} • PV ${petHp}/${petMaxHp} • ATQ ${pet.attackDamage}`,
        sourceKind: 'pet_gallery',
      });
    }

    return list;
  }, [
    project.playerInventory?.items,
    project.itemCatalog,
    mapCollectedInventory,
    removedIds,
    realPetGallery,
  ]);

  const filteredItems = useMemo(() => {
    return allUnifiedItems.filter((item) => {
      if (activeEquipSlotFilter && item.equipSlot !== activeEquipSlotFilter) {
        return false;
      }
      if (activeCategory === 'todos') return true;
      if (activeCategory === 'artefatos') {
        return (
          item.equipSlot === 'accessory' ||
          item.equipSlot === 'boots' ||
          item.category === 'outros'
        );
      }
      if (activeCategory === 'equipaveis') {
        return item.category === 'equipaveis' || item.category === 'pets';
      }
      return item.category === activeCategory;
    });
  }, [allUnifiedItems, activeCategory, activeEquipSlotFilter]);

  const GRID_COLS = 5;
  const totalSlotsCount = 25;

  const selectedItem: UnifiedBackpackSlotItem | null =
    selectedSlotIndex !== null ? filteredItems[selectedSlotIndex] || null : null;

  const isSelectedItemEquipped = useMemo(() => {
    if (!selectedItem) return false;
    if (selectedItem.motionLayerTag) {
      const eqTags = (project.player?.equippedMotionTags || []).map((t) => t.toLowerCase());
      if (eqTags.includes(selectedItem.motionLayerTag.toLowerCase())) return true;
    }
    return Object.values(equippedBySlot).includes(selectedItem.id);
  }, [selectedItem, equippedBySlot, project.player?.equippedMotionTags]);

  const handlePrimaryEquipOrUse = (targetOverride?: UnifiedBackpackSlotItem | null) => {
    const item = targetOverride ?? selectedItem;
    if (!item) {
      triggerToast('Selecione um slot com item primeiro!');
      return;
    }

    if (item.category === 'pets' || item.equipSlot === 'pet') {
      const targetPetId = item.petId || item.id.replace(/^bp-pet-/, '');
      const existingSlotIdx = realEquippedPets.findIndex((p) => p?.id === targetPetId);
      if (existingSlotIdx === targetPetSlotIdx) {
        equipPetInSlot(null, targetPetSlotIdx, false);
        triggerToast(`Removido do Slot P${targetPetSlotIdx + 1}: ${item.name}`);
      } else {
        equipPetInSlot(targetPetId, targetPetSlotIdx, true);
        triggerToast(`Equipado em P${targetPetSlotIdx + 1}: ${item.name}`);
      }
      return;
    }

    if (item.category === 'equipaveis' || item.equipSlot) {
      const targetSlot: EquipmentSlotKey = item.equipSlot || 'accessory';
      const currentlyEquippedId = equippedBySlot[targetSlot];
      const shouldUnequip = currentlyEquippedId === item.id;
      setEquippedBySlot((prev) => ({
        ...prev,
        [targetSlot]: shouldUnequip ? null : item.id,
      }));
      triggerToast(shouldUnequip ? `Desequipado: ${item.name}` : `Equipado: ${item.name}`);
      return;
    }

    if (item.category === 'item_pet' || item.category === 'consumiveis') {
      setRemovedIds((prev) => ({
        ...prev,
        [item.id]: (prev[item.id] || 0) + 1,
      }));
      triggerToast(`Usou ${item.name}!`);
      return;
    }

    setBalloonExpandedLore((v) => !v);
  };

  const handleDropSelectedItem = (itemToDrop?: UnifiedBackpackSlotItem | null) => {
    const target = itemToDrop ?? selectedItem;
    if (!target) {
      triggerToast('Selecione um item para soltar!');
      return;
    }
    setRemovedIds((prev) => ({
      ...prev,
      [target.id]: (prev[target.id] || 0) + 1,
    }));
    if (target.quantity <= 1) {
      setEquippedBySlot((prev) => {
        const next = { ...prev };
        (Object.keys(next) as EquipmentSlotKey[]).forEach((k) => {
          if (next[k] === target.id) next[k] = null;
        });
        return next;
      });
    }
    onDropItemToMap?.(target);
    triggerToast(`Soltou 1x ${target.name}`);
  };

  const filteredDeckCards = useMemo(() => {
    return realPetGallery.filter((c) => {
      if (cardRarityFilter !== 'all' && (c.rarity || 'common') !== cardRarityFilter) {
        return false;
      }
      if (
        cardSearchQuery.trim() &&
        !c.name.toLowerCase().includes(cardSearchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [realPetGallery, cardRarityFilter, cardSearchQuery]);

  const selectedDeckCard =
    selectedCardIdx !== null ? filteredDeckCards[selectedCardIdx] || null : null;

  const { jornada: jornadaQuests, tarefas: tarefasQuests } = useMemo(
    () => getOrderedPhaseQuests(project, true),
    [project]
  );

  return {
    project,
    onClose,
    topFolderTab,
    setTopFolderTab,
    activeCategory,
    setActiveCategory,
    selectDropMode,
    setSelectDropMode,
    cardSearchQuery,
    setCardSearchQuery,
    cardRarityFilter,
    setCardRarityFilter,
    selectedQuestId,
    setSelectedQuestId,
    resolvedPetConfig,
    realPetGallery,
    realEquippedPets,
    targetPetSlotIdx,
    setTargetPetSlotIdx,
    selectedCardIdx,
    setSelectedCardIdx,
    equippedBySlot,
    setEquippedBySlot,
    equipPetInSlot,
    selectedSlotIndex,
    setSelectedSlotIndex,
    balloonExpandedLore,
    setBalloonExpandedLore,
    activeEquipSlotFilter,
    setActiveEquipSlotFilter,
    statusToast,
    triggerToast,
    itemsScrollRef,
    cardsScrollRef,
    catScrollRef,
    customHeroSpritePng,
    heroDisplayName,
    allUnifiedItems,
    filteredItems,
    GRID_COLS,
    totalSlotsCount,
    selectedItem,
    isSelectedItemEquipped,
    handlePrimaryEquipOrUse,
    handleDropSelectedItem,
    filteredDeckCards,
    selectedDeckCard,
    jornadaQuests,
    tarefasQuests,
  };
}

export type BackpackScreenState = ReturnType<typeof useBackpackScreenState>;
