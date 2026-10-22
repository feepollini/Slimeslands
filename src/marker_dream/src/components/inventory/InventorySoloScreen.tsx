import React, { useState, useMemo, useEffect } from 'react';
import type {
  MapProject,
  SavedLevel,
  PlayerConfig,
  MapMarker,
  InventoryProject,
} from '../../types/map';
import {
  ArrowLeft,
  Package,
  Play,
  Users,
  Layers,
  Crosshair,
  FolderOpen,
  Trash2,
  CheckCircle2,
  Coins,
  Gem,
  Plus,
  Copy,
  Edit3,
  FolderKanban,
  Check,
  X,
  Map as MapIcon,
  GitBranch,
} from 'lucide-react';
import { InteractiveItemGalleryStudio } from './InteractiveItemGalleryStudio';
import { InventoryManagerStudio } from './InventoryManagerStudio';
import { PortraitEmulator } from '../PortraitEmulator';
import {
  getOrCreateItemCatalog,
  getOrCreatePlayerInventory,
  loadInventoryProjects,
  saveInventoryProjectsToStorage,
} from '../../utils/inventoryHelpers';
import { loadSingleLevelSlot } from '../../utils/storage';

interface InventorySoloScreenProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels: SavedLevel[];
  onGoToDashboard: () => void;
  onGoToEditor: () => void;
  onOpenCharacters?: () => void;
  onOpenQuests?: () => void;
  onPlayLevel: () => void;
  showToast: (msg: string) => void;
}

const PROJECT_THEME_COLORS = [
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#ec4899', // Pink
];

export const InventorySoloScreen: React.FC<InventorySoloScreenProps> = ({
  project,
  setProject,
  savedLevels,
  onGoToDashboard,
  onGoToEditor,
  onOpenCharacters,
  onOpenQuests,
  onPlayLevel,
  showToast,
}) => {
  const [inventoryProjects, setInventoryProjects] = useState<InventoryProject[]>(() =>
    loadInventoryProjects(project)
  );

  const [selectedInvProjectId, setSelectedInvProjectId] = useState<string>(() => {
    const list = loadInventoryProjects(project);
    return project.activeInventoryProjectId || list[0]?.id || 'inv_proj_rpg_main';
  });

  const [activeMainSection, setActiveMainSection] = useState<'interactive_items' | 'backpack_rules'>(
    'interactive_items'
  );
  const [scrollTargetY, setScrollTargetY] = useState<number | null>(null);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [selectedEmulatorLevelId, setSelectedEmulatorLevelId] = useState<string>(
    () => savedLevels[0]?.id || 'current'
  );
  const [isSwitchingEmulatorLevel, setIsSwitchingEmulatorLevel] = useState(false);
  const [emulatorWidthMode, setEmulatorWidthMode] = useState<'wide' | 'xwide'>('wide');

  // Modal de criação/edição de Projeto de Inventário
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [newProjColor, setNewProjColor] = useState('#10b981');
  const [newProjTemplate, setNewProjTemplate] = useState<'empty' | 'starter'>('empty');

  const [editingMetaId, setEditingMetaId] = useState<string | null>(null);
  const [editMetaName, setEditMetaName] = useState('');
  const [editMetaDesc, setEditMetaDesc] = useState('');

  const activeInvProject = useMemo(
    () =>
      inventoryProjects.find((p) => p.id === selectedInvProjectId) ||
      inventoryProjects[0],
    [inventoryProjects, selectedInvProjectId]
  );

  // Sincroniza quando o usuário seleciona outro Projeto de Inventário na barra lateral
  const handleSelectInventoryProject = (targetProj: InventoryProject) => {
    setSelectedInvProjectId(targetProj.id);

    // Mescla os assets do projeto selecionado com os assets de cenário da fase (preservando os que não são itens de outro projeto)
    const nonItemAssets = (project.galleryAssets || []).filter(
      (a) =>
        a.category !== 'Itens de Inventário/Exploração' &&
        a.category !== 'Itens Interativos' &&
        !a.id.startsWith('asset-item-')
    );

    setProject((prev) => ({
      ...prev,
      activeInventoryProjectId: targetProj.id,
      savedInventoryProjects: inventoryProjects,
      itemCatalog: targetProj.itemCatalog,
      playerInventory: targetProj.playerInventory,
      galleryAssets: [...(targetProj.interactiveAssets || []), ...nonItemAssets],
    }));

    showToast(`📦 Projeto "${targetProj.name}" carregado no Editor de Inventários!`);
  };

  // Garante que na primeira montagem o projeto ativo esteja espelhado no MapProject
  useEffect(() => {
    if (!activeInvProject) return;
    if (project.activeInventoryProjectId !== activeInvProject.id) {
      const nonItemAssets = (project.galleryAssets || []).filter(
        (a) =>
          a.category !== 'Itens de Inventário/Exploração' &&
          a.category !== 'Itens Interativos' &&
          !a.id.startsWith('asset-item-')
      );
      setProject((prev) => ({
        ...prev,
        activeInventoryProjectId: activeInvProject.id,
        savedInventoryProjects: inventoryProjects,
        itemCatalog: activeInvProject.itemCatalog,
        playerInventory: activeInvProject.playerInventory,
        galleryAssets: [...(activeInvProject.interactiveAssets || []), ...nonItemAssets],
      }));
    }
  }, []);

  const catalog = useMemo(() => getOrCreateItemCatalog(project), [project.itemCatalog]);
  const inventory = useMemo(() => getOrCreatePlayerInventory(project), [project.playerInventory]);

  const activeTestSpawnsCount = useMemo(
    () =>
      (project.markers || []).filter(
        (m) =>
          m.type === 'collectible' &&
          (m.id.startsWith('marker-collectible-spawn-') ||
            m.id.startsWith('marker-test-spawn-') ||
            m.id.startsWith('marker-biome-natural-spawn-'))
      ).length,
    [project.markers]
  );

  // Troca a Fase carregada no Emulador para Teste de Spawn (preservando o Inventário e Catálogo do Projeto de Inventário ativo)
  const handleSelectEmulatorTestLevel = async (levelId: string) => {
    setSelectedEmulatorLevelId(levelId);
    const targetStub = savedLevels.find((l) => l.id === levelId);
    if (!targetStub) return;

    setIsSwitchingEmulatorLevel(true);
    try {
      let fullLevel = targetStub;
      if (targetStub.isColdStub || !targetStub.projectData?.strips?.length) {
        const loaded = await loadSingleLevelSlot(levelId);
        if (loaded && loaded.projectData) {
          fullLevel = loaded;
        }
      }

      if (fullLevel?.projectData) {
        const currentInvProj = activeInvProject;
        const itemAssets =
          currentInvProj?.interactiveAssets ||
          (project.galleryAssets || []).filter(
            (a) =>
              a.category === 'Itens de Inventário/Exploração' ||
              a.category === 'Itens Interativos' ||
              a.id.startsWith('asset-item-')
          );

        const levelNonItemAssets = (fullLevel.projectData.galleryAssets || []).filter(
          (a) =>
            a.category !== 'Itens de Inventário/Exploração' &&
            a.category !== 'Itens Interativos' &&
            !a.id.startsWith('asset-item-')
        );

        setProject((prev) => ({
          ...fullLevel.projectData,
          activeInventoryProjectId: currentInvProj?.id || prev.activeInventoryProjectId,
          savedInventoryProjects: inventoryProjects,
          itemCatalog: currentInvProj?.itemCatalog || prev.itemCatalog,
          playerInventory: currentInvProj?.playerInventory || prev.playerInventory,
          galleryAssets: [...itemAssets, ...levelNonItemAssets],
        }));

        showToast(
          `🗺️ Fase "${fullLevel.name}" carregada no Emulador para Teste de Spawn (${fullLevel.projectData.biomes?.length || 0} biomas)!`
        );
      }
    } catch (e) {
      console.warn('Falha ao trocar fase no emulador de inventário:', e);
    } finally {
      setIsSwitchingEmulatorLevel(false);
    }
  };

  // Quando qualquer alteração ocorre nos itens interativos ou na mochila, atualiza tanto o Projeto de Inventário ativo quanto o MapProject
  const handleUpdateProject = (updates: Partial<MapProject>) => {
    setProject((prev) => {
      const nextMapProj: MapProject = {
        ...prev,
        ...updates,
      };

      const updatedItemAssets = (nextMapProj.galleryAssets || []).filter(
        (a) =>
          a.category === 'Itens de Inventário/Exploração' ||
          a.category === 'Itens Interativos' ||
          a.id.startsWith('asset-item-')
      );

      const nextInvProjects = inventoryProjects.map((invP) => {
        if (invP.id !== selectedInvProjectId) return invP;
        return {
          ...invP,
          updatedAt: new Date().toISOString(),
          itemCatalog: nextMapProj.itemCatalog || invP.itemCatalog,
          playerInventory: nextMapProj.playerInventory || invP.playerInventory,
          interactiveAssets: updatedItemAssets,
        };
      });

      setInventoryProjects(nextInvProjects);
      saveInventoryProjectsToStorage(nextInvProjects);

      return {
        ...nextMapProj,
        activeInventoryProjectId: selectedInvProjectId,
        savedInventoryProjects: nextInvProjects,
      };
    });
  };

  // Criar Novo Projeto de Inventário
  const handleCreateInventoryProject = () => {
    const cleanName = newProjName.trim() || `Projeto de Inventário #${inventoryProjects.length + 1}`;
    const newId = `inv_proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newProj: InventoryProject = {
      id: newId,
      name: cleanName,
      description:
        newProjDesc.trim() ||
        'Inventário dedicado de itens interativos, coletáveis, consumíveis e equipamentos.',
      themeColor: newProjColor,
      createdAt: now,
      updatedAt: now,
      itemCatalog:
        newProjTemplate === 'starter'
          ? [
              {
                id: `item-starter-potion-${Date.now()}`,
                name: 'Poção de Energia Vital',
                shortDescription: 'Restaura 50 HP ao ser consumida na mochila.',
                iconEmoji: '🧪',
                category: 'potion',
                rarity: 'common',
                stackable: true,
                maxStack: 20,
                buyPrice: 30,
                sellPrice: 15,
                usableActions: ['use', 'inspect', 'drop'],
                consumableEffect: { hpRestore: 50 },
              },
              {
                id: `item-starter-coin-${Date.now()}`,
                name: 'Relíquia Antiga Coletável',
                shortDescription: 'Item interativo de exploração e coleta no mapa.',
                iconEmoji: '🪙',
                category: 'collectible',
                rarity: 'rare',
                stackable: true,
                maxStack: 99,
                buyPrice: 100,
                sellPrice: 50,
                usableActions: ['inspect', 'drop'],
              },
            ]
          : [],
      interactiveAssets: [],
      playerInventory: {
        enabled: true,
        maxSlots: 25,
        columns: 5,
        currencies: { gold: 100, gems: 10 },
        equippedWeaponId: null,
        equippedArmorId: null,
        equippedAccessoryId: null,
        items: [],
      },
    };

    const nextList = [newProj, ...inventoryProjects];
    setInventoryProjects(nextList);
    saveInventoryProjectsToStorage(nextList);
    setSelectedInvProjectId(newProj.id);

    const nonItemAssets = (project.galleryAssets || []).filter(
      (a) =>
        a.category !== 'Itens de Inventário/Exploração' &&
        a.category !== 'Itens Interativos' &&
        !a.id.startsWith('asset-item-')
    );

    setProject((prev) => ({
      ...prev,
      activeInventoryProjectId: newProj.id,
      savedInventoryProjects: nextList,
      itemCatalog: newProj.itemCatalog,
      playerInventory: newProj.playerInventory,
      galleryAssets: [...newProj.interactiveAssets, ...nonItemAssets],
    }));

    setIsCreatingProject(false);
    setNewProjName('');
    setNewProjDesc('');
    showToast(`✨ Projeto de Inventário "${cleanName}" criado com seu próprio inventário de itens interativos!`);
  };

  // Duplicar Projeto de Inventário
  const handleDuplicateInventoryProject = (proj: InventoryProject) => {
    const copyId = `inv_proj_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const duplicated: InventoryProject = {
      ...JSON.parse(JSON.stringify(proj)),
      id: copyId,
      name: `${proj.name} (Cópia)`,
      createdAt: now,
      updatedAt: now,
    };

    const nextList = [duplicated, ...inventoryProjects];
    setInventoryProjects(nextList);
    saveInventoryProjectsToStorage(nextList);
    handleSelectInventoryProject(duplicated);
    showToast(`📋 Projeto "${proj.name}" duplicado com todos os itens interativos!`);
  };

  // Excluir Projeto de Inventário
  const handleDeleteInventoryProject = (projId: string) => {
    if (inventoryProjects.length <= 1) {
      showToast('⚠️ É necessário manter pelo menos 1 Projeto de Inventário.');
      return;
    }
    const target = inventoryProjects.find((p) => p.id === projId);
    const nextList = inventoryProjects.filter((p) => p.id !== projId);
    setInventoryProjects(nextList);
    saveInventoryProjectsToStorage(nextList);

    if (selectedInvProjectId === projId && nextList[0]) {
      handleSelectInventoryProject(nextList[0]);
    } else {
      setProject((prev) => ({
        ...prev,
        savedInventoryProjects: nextList,
      }));
    }
    showToast(`🗑️ Projeto "${target?.name || 'Inventário'}" removido.`);
  };

  // Salvar Edição de Nome/Descrição do Projeto
  const handleSaveProjectMeta = (projId: string) => {
    const nextList = inventoryProjects.map((p) =>
      p.id === projId
        ? {
            ...p,
            name: editMetaName.trim() || p.name,
            description: editMetaDesc.trim(),
            updatedAt: new Date().toISOString(),
          }
        : p
    );
    setInventoryProjects(nextList);
    saveInventoryProjectsToStorage(nextList);
    setProject((prev) => ({
      ...prev,
      savedInventoryProjects: nextList,
    }));
    setEditingMetaId(null);
    showToast('✅ Nome e descrição do Projeto de Inventário atualizados!');
  };

  const handleUpdatePlayer = (updates: Partial<PlayerConfig>) => {
    setProject((prev) => ({
      ...prev,
      player: {
        ...(prev.player || { id: 'p1', name: 'Herói', x: 384, y: 180, color: '#3b82f6', speed: 4 }),
        ...updates,
      },
    }));
  };

  const handleUpdateMarker = (id: string, updates: Partial<MapMarker>) => {
    setProject((prev) => ({
      ...prev,
      markers: prev.markers.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };

  const handleClearTestSpawns = () => {
    setProject((prev) => ({
      ...prev,
      markers: (prev.markers || []).filter(
        (m) =>
          !(
            m.type === 'collectible' &&
            (m.id.startsWith('marker-collectible-spawn-') ||
              m.id.startsWith('marker-test-spawn-') ||
              m.id.startsWith('marker-biome-natural-spawn-'))
          )
      ),
    }));
    showToast('🧹 Todos os spawns de teste e de biomas foram removidos do mapa!');
  };

  const handleCenterOnHero = () => {
    const py = project.player?.y ?? 180;
    setScrollTargetY(py);
  };

  return (
    <div className="h-screen w-screen bg-zinc-950 text-white flex flex-col overflow-hidden select-none">
      {/* Top Technical Accent Line */}
      <div className="w-full h-[2px] flex shrink-0">
        <div className="h-full flex-1 bg-emerald-500" />
        <div className="h-full flex-1 bg-amber-500" />
        <div className="h-full flex-1 bg-blue-500" />
        <div className="h-full flex-1 bg-purple-500" />
      </div>

      {/* Header Superior do Editor Dedicado */}
      <header className="px-5 py-2.5 bg-black/95 border-b border-zinc-850 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onGoToDashboard}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dashboard</span>
          </button>

          <button
            type="button"
            onClick={onGoToEditor}
            className="px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-orange-400" />
            <span>Editor da Fase</span>
          </button>

          {onOpenCharacters && (
            <button
              type="button"
              onClick={onOpenCharacters}
              className="px-2.5 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-xs font-semibold text-blue-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-blue-400" />
              <span>Personagens</span>
            </button>
          )}

          {onOpenQuests && (
            <button
              type="button"
              onClick={onOpenQuests}
              className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-xs font-semibold text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <GitBranch className="w-3.5 h-3.5 text-amber-400" />
              <span>Quests (V2)</span>
            </button>
          )}

          <div className="h-5 w-[1px] bg-zinc-800 mx-1" />

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white tracking-tight">
                  4. Editor de Inventários &amp; Projetos de Itens Interativos
                </h1>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {inventoryProjects.length} PROJETOS
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono">
                Projetos de Inventário • Inventário de Itens Interativos por Projeto • Test Spawn &amp; Coleta ao Vivo
              </p>
            </div>
          </div>
        </div>

        {/* Métricas Rápidas e Ações */}
        <div className="flex items-center gap-2.5">
          <div className="hidden xl:flex items-center gap-2 bg-zinc-900/90 border border-zinc-800 rounded-lg px-3 py-1.5 text-[11px] font-mono">
            <span className="text-zinc-400">Projeto Ativo:</span>
            <span className="text-emerald-300 font-bold">{activeInvProject?.name}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-400">Itens Interativos:</span>
            <span className="text-blue-300 font-bold tabular-nums">{catalog.length}</span>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-400">Na Mochila:</span>
            <span className="text-amber-300 font-bold tabular-nums">
              {inventory.items.length}/{inventory.maxSlots}
            </span>
          </div>

          {activeTestSpawnsCount > 0 && (
            <button
              type="button"
              onClick={handleClearTestSpawns}
              className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Limpar todos os itens de teste gerados no mapa"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpar {activeTestSpawnsCount} Spawns</span>
            </button>
          )}

          <button
            type="button"
            onClick={onPlayLevel}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Fase</span>
          </button>
        </div>
      </header>

      {/* Corpo Principal em 3 Colunas:
          1. Sidebar de Projetos de Inventário
          2. Inventário de Itens Interativos do Projeto Selecionado
          3. Emulador de Coleta ao Vivo */}
      <div className="flex-1 flex overflow-hidden">
        {/* COLUNA 1: LISTA DE PROJETOS DE INVENTÁRIO */}
        <aside className="w-[275px] 2xl:w-[305px] shrink-0 bg-zinc-950 border-r border-zinc-850 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-850 bg-zinc-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-white">
                  Projetos de Inventário
                </span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 font-bold">
                {inventoryProjects.length} salvos
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Crie múltiplos projetos e organize em cada um o seu próprio <strong>inventário de itens interativos</strong>, assets PNG e mochila.
            </p>

            <button
              type="button"
              onClick={() => setIsCreatingProject((v) => !v)}
              className="w-full py-2 px-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Novo Projeto de Inventário</span>
            </button>

            {/* Formulário Rápido de Criação de Projeto */}
            {isCreatingProject && (
              <div className="p-3 rounded-xl bg-zinc-950 border border-emerald-500/40 space-y-2.5 shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">
                    Criar Projeto de Inventário
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingProject(false)}
                    className="text-zinc-400 hover:text-white cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  type="text"
                  value={newProjName}
                  onChange={(e) => setNewProjName(e.target.value)}
                  placeholder="Nome do projeto (ex: Masmorra Gelo)..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />

                <input
                  type="text"
                  value={newProjDesc}
                  onChange={(e) => setNewProjDesc(e.target.value)}
                  placeholder="Descrição curta do inventário..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-2.5 py-1.5 text-[11px] text-zinc-300 focus:outline-none focus:border-emerald-400"
                />

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-zinc-400">Cor do Projeto:</span>
                  <div className="flex items-center gap-1.5">
                    {PROJECT_THEME_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewProjColor(c)}
                        className={`w-4 h-4 rounded-full cursor-pointer transition-transform ${
                          newProjColor === c ? 'scale-125 ring-2 ring-white' : 'opacity-70'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setNewProjTemplate('empty')}
                    className={`py-1.5 px-2 rounded-lg border font-bold cursor-pointer ${
                      newProjTemplate === 'empty'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    📦 Inventário Vazio
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewProjTemplate('starter')}
                    className={`py-1.5 px-2 rounded-lg border font-bold cursor-pointer ${
                      newProjTemplate === 'starter'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    ✨ Kit Inicial (2 Itens)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCreateInventoryProject}
                  className="w-full py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs cursor-pointer transition-colors"
                >
                  Criar e Abrir Projeto
                </button>
              </div>
            )}
          </div>

          {/* Lista de Cards dos Projetos de Inventário */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {inventoryProjects.map((invProj) => {
              const isSelected = invProj.id === activeInvProject?.id;
              const itemsCount = invProj.itemCatalog?.length || 0;
              const assetsCount = invProj.interactiveAssets?.length || 0;
              const bagCount = invProj.playerInventory?.items?.length || 0;
              const maxSlots = invProj.playerInventory?.maxSlots || 25;

              return (
                <div
                  key={invProj.id}
                  onClick={() => handleSelectInventoryProject(invProj)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-zinc-900 border-emerald-500/60 shadow-md ring-1 ring-emerald-500/30'
                      : 'bg-zinc-900/50 border-zinc-800/90 hover:border-zinc-700 hover:bg-zinc-900'
                  }`}
                >
                  {editingMetaId === invProj.id ? (
                    <div
                      className="space-y-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="text"
                        value={editMetaName}
                        onChange={(e) => setEditMetaName(e.target.value)}
                        className="w-full bg-zinc-950 border border-emerald-500/50 rounded px-2 py-1 text-xs font-bold text-white"
                      />
                      <input
                        type="text"
                        value={editMetaDesc}
                        onChange={(e) => setEditMetaDesc(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-700 rounded px-2 py-1 text-[11px] text-zinc-300"
                      />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleSaveProjectMeta(invProj.id)}
                          className="flex-1 py-1 rounded bg-emerald-500 text-black font-bold text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingMetaId(null)}
                          className="py-1 px-2 rounded bg-zinc-800 text-zinc-300 text-[10px] cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: invProj.themeColor || '#10b981' }}
                          />
                          <h4 className="text-xs font-bold text-white truncate">
                            {invProj.name}
                          </h4>
                        </div>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold shrink-0">
                            ATIVO
                          </span>
                        )}
                      </div>

                      {invProj.description && (
                        <p className="text-[11px] text-zinc-400 mt-1 line-clamp-2 leading-snug">
                          {invProj.description}
                        </p>
                      )}

                      {/* Mini Preview dos Ícones do Inventário deste Projeto */}
                      <div className="mt-2.5 flex items-center gap-1 flex-wrap">
                        {(invProj.itemCatalog || []).slice(0, 6).map((it) => (
                          <div
                            key={it.id}
                            className="w-6 h-6 rounded bg-zinc-950 border border-zinc-800 flex items-center justify-center text-xs overflow-hidden"
                            title={it.name}
                          >
                            {it.iconPng ? (
                              <img
                                src={it.iconPng}
                                alt={it.name}
                                className="w-full h-full object-contain"
                              />
                            ) : (
                              <span>{it.iconEmoji || '📦'}</span>
                            )}
                          </div>
                        ))}
                        {itemsCount === 0 && (
                          <span className="text-[10px] text-zinc-500 italic">
                            Sem itens — importe PNGs ou crie itens
                          </span>
                        )}
                      </div>

                      {/* Contadores e Ações do Projeto */}
                      <div className="mt-2.5 pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                        <div className="flex items-center gap-2">
                          <span className="text-amber-300 font-bold tabular-nums">
                            {itemsCount} itens
                          </span>
                          <span>•</span>
                          <span className="text-blue-300 tabular-nums">
                            {bagCount}/{maxSlots} mochila
                          </span>
                          {assetsCount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-300 tabular-nums">
                                {assetsCount} PNGs
                              </span>
                            </>
                          )}
                        </div>

                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMetaId(invProj.id);
                              setEditMetaName(invProj.name);
                              setEditMetaDesc(invProj.description || '');
                            }}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white cursor-pointer"
                            title="Renomear projeto"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateInventoryProject(invProj)}
                            className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-blue-300 cursor-pointer"
                            title="Duplicar projeto de inventário"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {inventoryProjects.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteInventoryProject(invProj.id)}
                              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 cursor-pointer"
                              title="Excluir projeto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </aside>

        {/* COLUNA 2: INVENTÁRIO DE ITENS INTERATIVOS DO PROJETO ATIVO */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-850 bg-zinc-950 overflow-hidden">
          {/* Sub-barra do Projeto Selecionado */}
          <div className="px-6 py-3 bg-zinc-900/70 border-b border-zinc-850 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-950 border border-emerald-500/40">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: activeInvProject?.themeColor || '#10b981' }}
                />
                <span className="text-xs font-extrabold text-white">
                  {activeInvProject?.name}
                </span>
              </div>

              <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveMainSection('interactive_items')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeMainSection === 'interactive_items'
                      ? 'bg-amber-500 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Inventário de Itens Interativos &amp; Test Spawn ({catalog.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMainSection('backpack_rules')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeMainSection === 'backpack_rules'
                      ? 'bg-blue-500 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                  }`}
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Mochila &amp; Slots deste Projeto ({inventory.items.length}/{inventory.maxSlots})</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-amber-300 flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span className="tabular-nums font-bold">{inventory.currencies.gold}</span>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-cyan-300 flex items-center gap-1.5">
                <Gem className="w-3.5 h-3.5 text-cyan-400" />
                <span className="tabular-nums font-bold">{inventory.currencies.gems}</span>
              </span>
              <button
                type="button"
                onClick={handleCenterOnHero}
                className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-sans font-bold text-[11px] cursor-pointer transition-colors"
              >
                🎯 Focar Herói
              </button>
            </div>
          </div>

          {/* Área Rolável com o Inventário de Itens Interativos do Projeto Selecionado */}
          <div className="flex-1 overflow-y-auto p-5">
            <div className="max-w-4xl mx-auto space-y-5">
              {activeMainSection === 'interactive_items' ? (
                <InteractiveItemGalleryStudio
                  key={activeInvProject?.id}
                  project={project}
                  onUpdateProject={handleUpdateProject}
                  player={project.player}
                  showToast={showToast}
                  initialTab="acervo"
                />
              ) : (
                <InventoryManagerStudio
                  key={activeInvProject?.id}
                  project={project}
                  onUpdateProject={handleUpdateProject}
                  player={project.player}
                  onUpdatePlayer={handleUpdatePlayer}
                  galleryAssets={project.galleryAssets || []}
                  galleryCategories={project.galleryCategories || []}
                  showToast={showToast}
                />
              )}
            </div>
          </div>
        </div>

        {/* COLUNA 3: EMULADOR DE COLETA EM TEMPO REAL COM SELETOR DE FASES (MAIS LARGO) */}
        <div
          className={`${
            emulatorWidthMode === 'xwide'
              ? 'w-[600px] xl:w-[680px] 2xl:w-[760px]'
              : 'w-[510px] xl:w-[560px] 2xl:w-[640px]'
          } shrink-0 bg-black flex flex-col border-l border-zinc-850 overflow-hidden transition-all duration-200`}
        >
          <div className="px-4 py-2.5 bg-zinc-900/90 border-b border-zinc-850 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Emulador de Teste de Spawn
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() =>
                  setEmulatorWidthMode((prev) => (prev === 'wide' ? 'xwide' : 'wide'))
                }
                className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 px-2 py-0.5 rounded cursor-pointer transition-colors"
                title="Alternar largura do painel do Emulador (Largo / Extra Largo)"
              >
                {emulatorWidthMode === 'xwide' ? '↔ Extra Largo' : '↔ Largo +'}
              </button>
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded">
                WASD / Joystick
              </span>
            </div>
          </div>

          {/* Seletor de Fases Disponíveis no Emulador para Teste de Spawn */}
          <div className="px-3.5 py-2.5 bg-zinc-950 border-b border-zinc-850 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                <MapIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Fase no Emulador (Teste de Spawn):</span>
              </span>
              <span className="font-mono text-zinc-400">
                {project.biomes?.length || 0} biomas ativos
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={selectedEmulatorLevelId}
                disabled={isSwitchingEmulatorLevel}
                onChange={(e) => handleSelectEmulatorTestLevel(e.target.value)}
                className="flex-1 bg-zinc-900 border border-zinc-750 hover:border-amber-500/50 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {savedLevels.length === 0 ? (
                  <option value="current">Fase Atual do Editor</option>
                ) : (
                  savedLevels.map((lvl) => (
                    <option key={lvl.id} value={lvl.id}>
                      🗺️ {lvl.name} ({lvl.stats?.biomesCount ?? lvl.projectData?.biomes?.length ?? 1} biomas)
                    </option>
                  ))
                )}
              </select>

              <button
                type="button"
                onClick={handleCenterOnHero}
                className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs cursor-pointer whitespace-nowrap transition-colors"
                title="Centralizar câmera na posição atual do Herói"
              >
                🎯 Herói
              </button>
            </div>
          </div>

          <div className="px-4 py-1.5 bg-amber-950/25 border-b border-amber-500/20 text-[11px] text-amber-200/90">
            💡 Spawne itens do projeto <strong>{activeInvProject?.name}</strong> em <strong>Anel</strong>, <strong>1 a 1</strong> ou <strong>Spawn Natural por Bioma</strong> na fase selecionada!
          </div>

          <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-zinc-950">
            <PortraitEmulator
              project={project}
              activeMarkerId={selectedMarkerId}
              onSelectMarker={setSelectedMarkerId}
              onUpdateMarker={handleUpdateMarker}
              onUpdatePlayer={handleUpdatePlayer}
              onUpdateProject={handleUpdateProject}
              scrollTargetY={scrollTargetY}
              savedLevels={savedLevels}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
