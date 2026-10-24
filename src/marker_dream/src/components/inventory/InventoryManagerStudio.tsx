import React, { useState, useRef } from 'react';
import type {
  MapProject,
  PlayerInventoryConfig,
  PlayerInventoryItem,
  InventoryItemType,
  InventoryItemRarity,
  GalleryAsset,
  PlayerConfig,
} from '../../types/map';
import {
  getOrCreatePlayerInventory,
  processInventoryFolderFilesToDisk,
} from '../../utils/inventoryHelpers';
import { readUploadedImage } from '../../utils/tileGenerator';
import {
  Package,
  Plus,
  Trash2,
  Shield,
  X,
  Upload,
  FolderOpen,
} from 'lucide-react';

interface Props {
  project: MapProject;
  onUpdateProject: (updates: Partial<MapProject>) => void;
  player?: PlayerConfig;
  onUpdatePlayer?: (updates: Partial<PlayerConfig>) => void;
  galleryAssets?: GalleryAsset[];
  galleryCategories?: string[];
  showToast?: (message: string) => void;
  isCompact?: boolean;
}

const RARITY_COLORS: Record<InventoryItemRarity, { border: string; bg: string; text: string; label: string }> = {
  common: { border: 'border-zinc-700', bg: 'bg-zinc-800/60', text: 'text-zinc-300', label: 'Comum' },
  uncommon: { border: 'border-emerald-500/80', bg: 'bg-emerald-950/40', text: 'text-emerald-300', label: 'Incomum' },
  rare: { border: 'border-sky-500/80', bg: 'bg-sky-950/40', text: 'text-sky-300', label: 'Raro' },
  epic: { border: 'border-purple-500/80', bg: 'bg-purple-950/40', text: 'text-purple-300', label: 'Épico' },
  legendary: { border: 'border-amber-400', bg: 'bg-amber-950/50 shadow-[0_0_12px_rgba(245,158,11,0.3)]', text: 'text-amber-300', label: 'Lendário' },
};

const ITEM_TYPE_LABELS: Record<InventoryItemType, { label: string; icon: string }> = {
  weapon: { label: 'Arma', icon: '⚔️' },
  armor: { label: 'Armadura / Escudo', icon: '🛡️' },
  potion: { label: 'Poção / Consumível', icon: '🧪' },
  key: { label: 'Chave / Mecanismo', icon: '🔑' },
  collectible: { label: 'Coletável / Fruto', icon: '🍎' },
  currency: { label: 'Moeda / Tesouro', icon: '💰' },
  drop: { label: 'Drop de Inimigo', icon: '💀' },
  custom: { label: 'Personalizado', icon: '✨' },
};

export const InventoryManagerStudio: React.FC<Props> = ({
  project,
  onUpdateProject,
  galleryAssets = [],
  showToast,
  isCompact = false,
}) => {
  const inventory: PlayerInventoryConfig = getOrCreatePlayerInventory(project);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState<boolean>(false);

  // Refs e estados de Importação de Pasta / PNGs em Massa
  const folderInputRef = useRef<HTMLInputElement>(null);
  const multiFilesInputRef = useRef<HTMLInputElement>(null);
  const [isImportingFolder, setIsImportingFolder] = useState<boolean>(false);
  const [importProgressText, setImportProgressText] = useState<string>('');
  const [folderImportCategory, setFolderImportCategory] = useState<InventoryItemType | 'auto'>('auto');
  const [folderImportRarity, setFolderImportRarity] = useState<InventoryItemRarity | 'auto'>('auto');
  const [isDragOverGrid, setIsDragOverGrid] = useState<boolean>(false);

  // Formulário de Novo Item
  const [newItemName, setNewItemName] = useState<string>('Novo Artefato');
  const [newItemDescription, setNewItemDescription] = useState<string>('Item encontrado nas explorações do reino.');
  const [newItemType, setNewItemType] = useState<InventoryItemType>('weapon');
  const [newItemRarity, setNewItemRarity] = useState<InventoryItemRarity>('uncommon');
  const [newItemEmoji, setNewItemEmoji] = useState<string>('⚔️');
  const [newItemPng, setNewItemPng] = useState<string>('');
  const [newItemQuantity, setNewItemQuantity] = useState<number>(1);
  const [newItemAttack, setNewItemAttack] = useState<number>(10);
  const [newItemDefense, setNewItemDefense] = useState<number>(5);
  const [newItemHealthRestore, setNewItemHealthRestore] = useState<number>(25);

  const updateInventory = (updates: Partial<PlayerInventoryConfig>) => {
    const updated: PlayerInventoryConfig = {
      ...inventory,
      ...updates,
    };
    onUpdateProject({
      playerInventory: updated,
      player: {
        ...(project.player || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6', speed: 4 }),
        inventory: updated,
      },
    });
  };

  const selectedItem = inventory.items.find((i) => i.id === selectedItemId) || null;

  const filteredItems = inventory.items.filter((item) => {
    if (activeCategory === 'all') return true;
    return item.type === activeCategory;
  });

  const equippedWeapon = inventory.items.find((i) => i.id === inventory.equippedWeaponId);
  const equippedArmor = inventory.items.find((i) => i.id === inventory.equippedArmorId);
  const equippedAccessory = inventory.items.find((i) => i.id === inventory.equippedAccessoryId);

  // Equipar / Desequipar
  const handleToggleEquip = (item: PlayerInventoryItem) => {
    if (item.type === 'weapon') {
      const isEquipped = inventory.equippedWeaponId === item.id;
      const nextEquippedId = isEquipped ? null : item.id;
      const updatedItems = inventory.items.map((i) =>
        i.type === 'weapon' ? { ...i, equipped: i.id === nextEquippedId } : i
      );
      updateInventory({
        equippedWeaponId: nextEquippedId,
        items: updatedItems,
      });
      showToast?.(isEquipped ? `⚔️ "${item.name}" desequipada.` : `⚔️ "${item.name}" equipada como arma principal!`);
    } else if (item.type === 'armor') {
      const isEquipped = inventory.equippedArmorId === item.id;
      const nextEquippedId = isEquipped ? null : item.id;
      const updatedItems = inventory.items.map((i) =>
        i.type === 'armor' ? { ...i, equipped: i.id === nextEquippedId } : i
      );
      updateInventory({
        equippedArmorId: nextEquippedId,
        items: updatedItems,
      });
      showToast?.(isEquipped ? `🛡️ "${item.name}" desequipado.` : `🛡️ "${item.name}" equipado como armadura principal!`);
    } else {
      const isEquipped = inventory.equippedAccessoryId === item.id;
      const nextEquippedId = isEquipped ? null : item.id;
      const updatedItems = inventory.items.map((i) =>
        i.id === item.id ? { ...i, equipped: !isEquipped } : i
      );
      updateInventory({
        equippedAccessoryId: nextEquippedId,
        items: updatedItems,
      });
      showToast?.(isEquipped ? `💍 "${item.name}" desequipado.` : `💍 "${item.name}" equipado!`);
    }
  };

  // Remover Item
  const handleDeleteItem = (itemId: string) => {
    const updated = inventory.items.filter((i) => i.id !== itemId);
    const unequipped: Partial<PlayerInventoryConfig> = { items: updated };
    if (inventory.equippedWeaponId === itemId) unequipped.equippedWeaponId = null;
    if (inventory.equippedArmorId === itemId) unequipped.equippedArmorId = null;
    if (inventory.equippedAccessoryId === itemId) unequipped.equippedAccessoryId = null;
    updateInventory(unequipped);
    if (selectedItemId === itemId) setSelectedItemId(null);
    showToast?.('🗑️ Item removido do inventário.');
  };

  // Criar Novo Item
  const handleCreateNewItem = () => {
    if (!newItemName.trim()) return;
    const newItem: PlayerInventoryItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: newItemName.trim(),
      description: newItemDescription.trim(),
      type: newItemType,
      rarity: newItemRarity,
      iconEmoji: newItemPng ? undefined : newItemEmoji,
      iconPng: newItemPng || undefined,
      quantity: Math.max(1, newItemQuantity),
      equipped: false,
      slotIndex: inventory.items.length,
      stats: {
        attack: newItemType === 'weapon' ? newItemAttack : undefined,
        defense: newItemType === 'armor' ? newItemDefense : undefined,
        healthRestore: newItemType === 'potion' ? newItemHealthRestore : undefined,
      },
    };

    updateInventory({
      items: [...inventory.items, newItem],
    });
    setSelectedItemId(newItem.id);
    setIsAddItemModalOpen(false);
    showToast?.(`✨ "${newItem.name}" adicionado ao Inventário Geral!`);
  };

  // Importar Pasta ou Múltiplos PNGs direto para o Inventário (Mochila + Catálogo + Disco Local)
  const handleBulkFolderOrFilesImport = async (files: FileList | File[], isFolder: boolean) => {
    if (!files || files.length === 0) return;
    setIsImportingFolder(true);
    setImportProgressText('Iniciando importação para o disco...');

    try {
      const mappedOverrideCat =
        folderImportCategory === 'auto' || folderImportCategory === 'custom'
          ? 'auto'
          : folderImportCategory;

      const { folderName, newAssets, newCatalogItems, newBackpackItems } =
        await processInventoryFolderFilesToDisk(files, {
          sourceLabel: isFolder ? 'importação de pasta no inventário' : 'importação em massa no inventário',
          defaultBiomeId: project.biomes?.[0]?.id || 'forest',
          overrideCategory: mappedOverrideCat as any,
          overrideRarity: folderImportRarity,
          startingSlotIndex: inventory.items.length,
          onProgress: (cur, tot, name) => {
            setImportProgressText(`Salvando no disco (${cur}/${tot}): ${name}`);
          },
        });

      if (newBackpackItems.length === 0) {
        showToast?.('⚠️ Nenhuma imagem válida (.png, .jpg, .webp, .svg) encontrada na pasta selecionada.');
        return;
      }

      const combinedItems = [...inventory.items, ...newBackpackItems];
      const neededSlots = Math.min(60, Math.max(inventory.maxSlots, combinedItems.length));

      const nextInventory: PlayerInventoryConfig = {
        ...inventory,
        maxSlots: neededSlots,
        items: combinedItems,
      };

      const existingAssets = project.galleryAssets || galleryAssets || [];
      const existingCatalog = project.itemCatalog || [];

      onUpdateProject({
        playerInventory: nextInventory,
        galleryAssets: [...newAssets, ...existingAssets],
        itemCatalog: [...newCatalogItems, ...existingCatalog],
        player: {
          ...(project.player || { id: 'p1', name: 'Herói', x: 384, y: 100, color: '#3b82f6', speed: 4 }),
          inventory: nextInventory,
        },
      });

      setSelectedItemId(newBackpackItems[0].id);
      showToast?.(
        `📁 Pasta "${folderName}": ${newBackpackItems.length} itens importados para o disco local e adicionados à Mochila & Catálogo!`
      );
    } catch (err) {
      console.error('Erro ao importar pasta no inventário:', err);
      showToast?.('❌ Erro ao processar importação de pasta no inventário.');
    } finally {
      setIsImportingFolder(false);
      setImportProgressText('');
    }
  };

  return (
    <div
      className="space-y-4 text-white"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOverGrid(true);
      }}
      onDragLeave={() => setIsDragOverGrid(false)}
      onDrop={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOverGrid(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          await handleBulkFolderOrFilesImport(e.dataTransfer.files, false);
        }
      }}
    >
      {/* Inputs ocultos para Importar Pasta e Importar Múltiplos PNGs */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        {...({ webkitdirectory: '', directory: '' } as any)}
        className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            await handleBulkFolderOrFilesImport(e.target.files, true);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={multiFilesInputRef}
        type="file"
        multiple
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={async (e) => {
          if (e.target.files && e.target.files.length > 0) {
            await handleBulkFolderOrFilesImport(e.target.files, false);
          }
          e.target.value = '';
        }}
      />

      {/* Box de Arquitetura Global do Inventário + Importar Pasta */}
      <div
        className={`p-3.5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-950/40 border-2 rounded-2xl shadow-lg relative overflow-hidden transition-all ${
          isDragOverGrid ? 'border-emerald-400 ring-2 ring-emerald-500/40' : 'border-amber-500/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-inner">
              <Package className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white tracking-tight">
                  Inventário Geral do Jogador
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-black uppercase tracking-wider">
                  Global
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">
                Importe uma pasta inteira de sprites (salvos direto no disco local) ou crie itens individuais para a mochila.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              disabled={isImportingFolder}
              onClick={() => {
                if (folderInputRef.current) {
                  folderInputRef.current.value = '';
                  folderInputRef.current.click();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
              title="Importar uma pasta inteira de imagens PNG/JPG/WebP direto para o disco local e para a mochila"
            >
              <FolderOpen className="w-4 h-4 stroke-[2.5]" />
              <span>{isImportingFolder ? 'Importando Pasta...' : 'Importar Pasta'}</span>
            </button>

            <button
              type="button"
              disabled={isImportingFolder}
              onClick={() => {
                if (multiFilesInputRef.current) {
                  multiFilesInputRef.current.value = '';
                  multiFilesInputRef.current.click();
                }
              }}
              className="px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
              title="Selecionar múltiplos arquivos PNG/WebP de uma só vez"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Importar PNGs</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddItemModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Adicionar Novo Item</span>
            </button>
          </div>
        </div>

        {/* Barra de Configuração Rápida do Importar Pasta */}
        <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-amber-300 font-bold flex items-center gap-1">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Regra p/ Importar Pasta:</span>
            </span>

            <select
              value={folderImportCategory}
              onChange={(e) => setFolderImportCategory(e.target.value as any)}
              className="bg-black/70 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-200 font-semibold focus:outline-none focus:border-emerald-400 cursor-pointer"
              title="Categoria padrão ao importar uma pasta"
            >
              <option value="auto">🤖 Auto-Detectar Tipo (Nome/Subpasta)</option>
              {Object.entries(ITEM_TYPE_LABELS).map(([k, meta]) => (
                <option key={k} value={k}>
                  {meta.icon} Forçar: {meta.label}
                </option>
              ))}
            </select>

            <select
              value={folderImportRarity}
              onChange={(e) => setFolderImportRarity(e.target.value as any)}
              className="bg-black/70 border border-zinc-700 rounded-lg px-2 py-1 text-[11px] text-zinc-200 font-semibold focus:outline-none focus:border-emerald-400 cursor-pointer"
              title="Raridade padrão ao importar uma pasta"
            >
              <option value="auto">✨ Auto-Detectar Raridade</option>
              {Object.entries(RARITY_COLORS).map(([k, meta]) => (
                <option key={k} value={k}>
                  Forçar: {meta.label}
                </option>
              ))}
            </select>
          </div>

          {isImportingFolder && importProgressText ? (
            <span className="text-emerald-300 font-mono font-bold animate-pulse">
              ⚡ {importProgressText}
            </span>
          ) : (
            <span className="text-[10px] text-zinc-400 font-mono">
              💾 Salvo em /public/assets/engine/hud/ (Zero RAM Base64)
            </span>
          )}
        </div>

        {/* Métricas e Moedas Globais */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-amber-500/20">
          <div className="p-2.5 rounded-xl bg-black/60 border border-amber-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">🪙</span>
              <div>
                <span className="text-[9px] text-zinc-400 font-mono uppercase block">Ouro</span>
                <span className="text-sm font-black text-amber-300 font-mono">
                  {inventory.currencies.gold}
                </span>
              </div>
            </div>
            <input
              type="number"
              value={inventory.currencies.gold}
              onChange={(e) =>
                updateInventory({
                  currencies: {
                    ...inventory.currencies,
                    gold: Math.max(0, parseInt(e.target.value) || 0),
                  },
                })
              }
              className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-right font-mono text-amber-300"
              title="Ajustar Ouro"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-black/60 border border-emerald-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💎</span>
              <div>
                <span className="text-[9px] text-zinc-400 font-mono uppercase block">Gemas</span>
                <span className="text-sm font-black text-emerald-300 font-mono">
                  {inventory.currencies.gems}
                </span>
              </div>
            </div>
            <input
              type="number"
              value={inventory.currencies.gems}
              onChange={(e) =>
                updateInventory({
                  currencies: {
                    ...inventory.currencies,
                    gems: Math.max(0, parseInt(e.target.value) || 0),
                  },
                })
              }
              className="w-16 bg-zinc-900 border border-zinc-700 rounded px-1.5 py-0.5 text-xs text-right font-mono text-emerald-300"
              title="Ajustar Gemas"
            />
          </div>

          <div className="p-2.5 rounded-xl bg-black/60 border border-zinc-800 flex items-center justify-between col-span-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🎒</span>
              <div>
                <span className="text-[9px] text-zinc-400 font-mono uppercase block">Capacidade</span>
                <span className="text-xs font-bold text-white">
                  {inventory.items.length} / {inventory.maxSlots} Slots Ocupados
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[9px] text-zinc-400 font-mono">Máx:</span>
              <input
                type="number"
                min={10}
                max={60}
                value={inventory.maxSlots}
                onChange={(e) =>
                  updateInventory({
                    maxSlots: Math.min(60, Math.max(10, parseInt(e.target.value) || 20)),
                  })
                }
                className="w-12 bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5 text-xs text-center font-mono text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Seção de Equipamentos do Jogador */}
      <div className="p-3.5 bg-zinc-900/90 border border-zinc-800 rounded-2xl space-y-2">
        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-amber-400" />
          <span>Equipamentos em Uso</span>
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Arma Equipada */}
          <div className="p-2.5 rounded-xl bg-black/60 border border-red-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-500/50 flex items-center justify-center shrink-0 text-xl overflow-hidden">
                {equippedWeapon?.iconPng ? (
                  <img src={equippedWeapon.iconPng} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  equippedWeapon?.iconEmoji || '⚔️'
                )}
              </div>
              <div className="truncate">
                <span className="text-[9px] text-red-400 font-bold block uppercase">Arma Principal</span>
                <span className="text-xs font-bold text-white truncate block">
                  {equippedWeapon?.name || 'Nenhuma Equipada'}
                </span>
                {equippedWeapon?.stats?.attack && (
                  <span className="text-[10px] text-red-300 font-mono">
                    +{equippedWeapon.stats.attack} Ataque
                  </span>
                )}
              </div>
            </div>
            {equippedWeapon && (
              <button
                type="button"
                onClick={() => handleToggleEquip(equippedWeapon)}
                className="text-[10px] text-zinc-400 hover:text-rose-400 px-2 py-1 rounded border border-zinc-800 hover:border-rose-500/50 shrink-0"
              >
                Desequipar
              </button>
            )}
          </div>

          {/* Armadura Equipada */}
          <div className="p-2.5 rounded-xl bg-black/60 border border-blue-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-500/50 flex items-center justify-center shrink-0 text-xl overflow-hidden">
                {equippedArmor?.iconPng ? (
                  <img src={equippedArmor.iconPng} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  equippedArmor?.iconEmoji || '🛡️'
                )}
              </div>
              <div className="truncate">
                <span className="text-[9px] text-blue-400 font-bold block uppercase">Armadura / Escudo</span>
                <span className="text-xs font-bold text-white truncate block">
                  {equippedArmor?.name || 'Nenhum Equipado'}
                </span>
                {equippedArmor?.stats?.defense && (
                  <span className="text-[10px] text-blue-300 font-mono">
                    +{equippedArmor.stats.defense} Defesa
                  </span>
                )}
              </div>
            </div>
            {equippedArmor && (
              <button
                type="button"
                onClick={() => handleToggleEquip(equippedArmor)}
                className="text-[10px] text-zinc-400 hover:text-rose-400 px-2 py-1 rounded border border-zinc-800 hover:border-rose-500/50 shrink-0"
              >
                Desequipar
              </button>
            )}
          </div>

          {/* Acessório / Amuleto */}
          <div className="p-2.5 rounded-xl bg-black/60 border border-purple-500/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/50 flex items-center justify-center shrink-0 text-xl overflow-hidden">
                {equippedAccessory?.iconPng ? (
                  <img src={equippedAccessory.iconPng} alt="" className="w-full h-full object-contain p-1" />
                ) : (
                  equippedAccessory?.iconEmoji || '💍'
                )}
              </div>
              <div className="truncate">
                <span className="text-[9px] text-purple-400 font-bold block uppercase">Amuleto / Relíquia</span>
                <span className="text-xs font-bold text-white truncate block">
                  {equippedAccessory?.name || 'Vazio'}
                </span>
              </div>
            </div>
            {equippedAccessory && (
              <button
                type="button"
                onClick={() => handleToggleEquip(equippedAccessory)}
                className="text-[10px] text-zinc-400 hover:text-rose-400 px-2 py-1 rounded border border-zinc-800 hover:border-rose-500/50 shrink-0"
              >
                Desequipar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Filtros de Categoria */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeCategory === 'all'
              ? 'bg-amber-500 text-black shadow-md'
              : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800'
          }`}
        >
          Todos ({inventory.items.length})
        </button>
        {Object.entries(ITEM_TYPE_LABELS).map(([k, meta]) => {
          const count = inventory.items.filter((i) => i.type === k).length;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setActiveCategory(k)}
              className={`px-2.5 py-1 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer flex items-center gap-1 ${
                activeCategory === k
                  ? 'bg-amber-500 text-black font-bold shadow-md'
                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800'
              }`}
            >
              <span>{meta.icon}</span>
              <span>{meta.label}</span>
              <span className="text-[9px] opacity-70 font-mono">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Grade de Slots do Inventário */}
      <div className="p-4 bg-zinc-950/80 border border-zinc-850 rounded-2xl space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Clique em um item para inspecionar, equipar ou gerenciar:</span>
          <span className="font-mono text-[10px]">Grade de {inventory.columns} colunas</span>
        </div>

        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2.5">
          {Array.from({ length: inventory.maxSlots }).map((_, idx) => {
            const item = filteredItems[idx];
            const isSelected = item && item.id === selectedItemId;

            if (!item) {
              return (
                <div
                  key={`empty-slot-${idx}`}
                  className="aspect-square rounded-2xl bg-zinc-900/50 border border-zinc-800/80 flex items-center justify-center text-zinc-700 font-mono text-[10px] select-none shadow-inner"
                >
                  {idx + 1}
                </div>
              );
            }

            const rarity = RARITY_COLORS[item.rarity || 'common'];

            return (
              <div
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className={`aspect-square rounded-2xl border-2 flex flex-col items-center justify-center p-1.5 relative cursor-pointer transition-all hover:scale-105 select-none ${
                  rarity.border
                } ${rarity.bg} ${
                  isSelected ? 'ring-2 ring-amber-400 scale-105' : ''
                }`}
                title={`${item.name} (${rarity.label})`}
              >
                {/* Ícone */}
                <div className="w-full h-full flex items-center justify-center overflow-hidden">
                  {item.iconPng ? (
                    <img src={item.iconPng} alt="" className="w-full h-full object-contain filter drop-shadow" />
                  ) : (
                    <span className="text-2xl drop-shadow">{item.iconEmoji || '📦'}</span>
                  )}
                </div>

                {/* Quantidade */}
                {item.quantity > 1 && (
                  <span className="absolute bottom-1 right-1 px-1.5 py-0.2 rounded-md bg-black/90 text-[9px] font-black font-mono text-white shadow">
                    x{item.quantity}
                  </span>
                )}

                {/* Badge de Equipado */}
                {item.equipped && (
                  <span className="absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Painel do Item Selecionado */}
      {selectedItem && (
        <div className="p-4 bg-zinc-900 border-2 border-amber-500/40 rounded-2xl space-y-3 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-3xl shrink-0 p-1 bg-black/60 ${
                  RARITY_COLORS[selectedItem.rarity || 'common'].border
                }`}
              >
                {selectedItem.iconPng ? (
                  <img src={selectedItem.iconPng} alt="" className="w-full h-full object-contain" />
                ) : (
                  selectedItem.iconEmoji || '📦'
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-white">{selectedItem.name}</h4>
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      RARITY_COLORS[selectedItem.rarity || 'common'].text
                    } bg-black/60 border ${
                      RARITY_COLORS[selectedItem.rarity || 'common'].border
                    }`}
                  >
                    {RARITY_COLORS[selectedItem.rarity || 'common'].label}
                  </span>
                </div>
                <p className="text-xs text-zinc-300 mt-0.5 leading-snug">
                  {selectedItem.description || 'Nenhuma descrição fornecida.'}
                </p>
                <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-zinc-400">
                  <span>Tipo: {ITEM_TYPE_LABELS[selectedItem.type as InventoryItemType]?.label || selectedItem.type}</span>
                  <span>•</span>
                  <span>Qtd: {selectedItem.quantity}</span>
                  {selectedItem.stats?.attack && (
                    <>
                      <span>•</span>
                      <span className="text-red-400 font-bold">+{selectedItem.stats.attack} Atq</span>
                    </>
                  )}
                  {selectedItem.stats?.defense && (
                    <>
                      <span>•</span>
                      <span className="text-blue-400 font-bold">+{selectedItem.stats.defense} Def</span>
                    </>
                  )}
                  {selectedItem.stats?.healthRestore && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-400 font-bold">+{selectedItem.stats.healthRestore} Vida</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setSelectedItemId(null)}
              className="text-zinc-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
            {(selectedItem.type === 'weapon' || selectedItem.type === 'armor') && (
              <button
                type="button"
                onClick={() => handleToggleEquip(selectedItem)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedItem.equipped
                    ? 'bg-zinc-800 text-zinc-300 hover:text-rose-400 border border-zinc-700'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md'
                }`}
              >
                {selectedItem.equipped ? 'Desequipar' : 'Equipar no Herói'}
              </button>
            )}

            <button
              type="button"
              onClick={() => handleDeleteItem(selectedItem.id)}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover Item</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Criação de Novo Item */}
      {isAddItemModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div
            className="w-full max-w-lg bg-zinc-950 border-2 border-amber-500/50 rounded-3xl p-5 text-white shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Criar Novo Item para o Jogador</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="w-7 h-7 rounded-full bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Nome do Item
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-bold focus:border-amber-400 focus:outline-none"
                  placeholder="ex: Espada das Sombras"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Descrição
                </label>
                <textarea
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 focus:border-amber-400 focus:outline-none resize-none"
                  placeholder="Descrição do item..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Tipo de Item
                  </label>
                  <select
                    value={newItemType}
                    onChange={(e) => setNewItemType(e.target.value as InventoryItemType)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:border-amber-400 focus:outline-none"
                  >
                    {Object.entries(ITEM_TYPE_LABELS).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.icon} {meta.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Raridade
                  </label>
                  <select
                    value={newItemRarity}
                    onChange={(e) => setNewItemRarity(e.target.value as InventoryItemRarity)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-medium focus:border-amber-400 focus:outline-none"
                  >
                    {Object.entries(RARITY_COLORS).map(([k, meta]) => (
                      <option key={k} value={k}>
                        {meta.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Emoji do Ícone
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={newItemEmoji}
                      onChange={(e) => setNewItemEmoji(e.target.value)}
                      className="w-16 text-center text-xl px-2 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-white focus:border-amber-400 focus:outline-none"
                    />
                    <div className="flex gap-1 flex-wrap">
                      {['⚔️', '🛡️', '🧪', '🔑', '🍎', '💎', '🏹', '📜'].map((emo) => (
                        <button
                          key={emo}
                          type="button"
                          onClick={() => {
                            setNewItemEmoji(emo);
                            setNewItemPng('');
                          }}
                          className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center"
                        >
                          {emo}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Ou PNG Customizado
                  </label>
                  <label className="px-3 py-2 rounded-xl bg-zinc-900 border border-dashed border-zinc-700 hover:border-amber-400 flex items-center justify-center gap-2 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="text-[11px] text-zinc-300">
                      {newItemPng ? 'PNG Carregado ✓' : 'Carregar Imagem PNG'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          try {
                            const { dataUrl } = await readUploadedImage(f, 'hud');
                            setNewItemPng(dataUrl);
                          } catch (err) {
                            console.warn('Falha ao salvar PNG do item no disco:', err);
                          }
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>

              {/* Atributos Específicos */}
              {newItemType === 'weapon' && (
                <div>
                  <label className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">
                    Poder de Ataque (+ Dano)
                  </label>
                  <input
                    type="number"
                    value={newItemAttack}
                    onChange={(e) => setNewItemAttack(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono"
                  />
                </div>
              )}

              {newItemType === 'armor' && (
                <div>
                  <label className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                    Poder de Defesa (+ Armadura)
                  </label>
                  <input
                    type="number"
                    value={newItemDefense}
                    onChange={(e) => setNewItemDefense(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono"
                  />
                </div>
              )}

              {newItemType === 'potion' && (
                <div>
                  <label className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Recuperação de Vida (+ HP)
                  </label>
                  <input
                    type="number"
                    value={newItemHealthRestore}
                    onChange={(e) => setNewItemHealthRestore(parseInt(e.target.value) || 10)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white font-mono"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setIsAddItemModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateNewItem}
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-extrabold shadow-lg shadow-amber-500/20"
              >
                Adicionar ao Inventário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
