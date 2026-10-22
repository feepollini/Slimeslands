import React, { useState, useEffect } from 'react';
import type {
  MapProject,
  PlayerConfig,
  SavedLevel,
  GalleryAsset,
} from '../../types/map';
import {
  Users,
  User,
  Package,
  Images,
  Radio,
  Smartphone,
  ArrowLeft,
  Play,
  Save,
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Sparkles,
  Shield,
  Swords,
  Coins,
  Gem,
  Heart,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  Check,
  Star,
  Settings,
} from 'lucide-react';
import { PlayerStudio } from '../PlayerStudio';
import { PetStudio } from '../PetStudio';
import { InventoryManagerStudio } from '../inventory/InventoryManagerStudio';
import { InteractiveItemGalleryStudio } from '../inventory/InteractiveItemGalleryStudio';
import { AssetGalleryStudio } from '../AssetGalleryStudio';
import { EventGalleryStudio } from '../EventGalleryStudio';
import { ScreensStudio } from '../screens/ScreensStudio';
import { MotionAssetCanvas } from '../MotionAssetCanvas';
import { PortraitEmulator } from '../PortraitEmulator';
import { CharacterGrowthStudio } from './CharacterGrowthStudio';
import { TrendingUp } from 'lucide-react';
import {
  loadCharactersRoster,
  saveCharactersRosterToStorage,
  applyCharacterToPhase,
  DEFAULT_CHARACTERS,
} from '../../utils/characterHelpers';

interface CharactersSoloScreenProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels?: SavedLevel[];
  onGoToDashboard: () => void;
  onGoToEditor: () => void;
  onOpenQuests?: () => void;
  onPlayLevel?: () => void;
  showToast: (msg: string) => void;
}

type CharacterTab = 'visual' | 'pets' | 'inventario' | 'atributos' | 'crescimento' | 'assets' | 'telas' | 'emulador';

export const CharactersSoloScreen: React.FC<CharactersSoloScreenProps> = ({
  project,
  setProject,
  savedLevels = [],
  onGoToDashboard,
  onGoToEditor,
  onOpenQuests,
  onPlayLevel,
  showToast,
}) => {
  // 1. Carrega ou sincroniza a lista de múltiplos personagens
  const [characters, setCharacters] = useState<PlayerConfig[]>(() => {
    return loadCharactersRoster(project);
  });

  // ID do personagem atualmente selecionado para edição
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(() => {
    if (project.activeCharacterId) return project.activeCharacterId;
    if (project.player?.id) return project.player.id;
    return characters[0]?.id || 'char_hero_legendary';
  });

  const [activeTab, setActiveTab] = useState<CharacterTab>('visual');
  const [previewDirection, setPreviewDirection] = useState<'default' | 'up' | 'down' | 'left' | 'right'>('default');
  const [isPreviewWalking, setIsPreviewWalking] = useState<boolean>(true);
  const [sidePanelView, setSidePanelView] = useState<'emulator' | 'sprite_preview'>('emulator');
  const [emulatorOrientation, setEmulatorOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Personagem atualmente em foco no editor
  const selectedCharacter = characters.find((c) => c.id === selectedCharacterId) || characters[0] || DEFAULT_CHARACTERS[0];

  // Salva no storage quando a lista de personagens muda
  const handleSaveCharactersRoster = (updatedRoster: PlayerConfig[]) => {
    setCharacters(updatedRoster);
    saveCharactersRosterToStorage(updatedRoster);
    setProject((prev) => ({
      ...prev,
      savedCharacters: updatedRoster,
    }));
  };

  // Atualiza propriedades do personagem selecionado
  const handleUpdateCurrentCharacter = (updates: Partial<PlayerConfig>) => {
    const updated = characters.map((c) => {
      if (c.id === selectedCharacter.id) {
        return {
          ...c,
          ...updates,
        };
      }
      return c;
    });
    handleSaveCharactersRoster(updated);

    // Se este personagem for o ativo na fase atual, sincroniza também na fase
    if (project.activeCharacterId === selectedCharacter.id || project.player?.id === selectedCharacter.id) {
      setProject((prev) => applyCharacterToPhase({ ...selectedCharacter, ...updates }, prev, true));
    }
  };

  // Vincula o personagem selecionado à fase atual
  const handleApplyToActivePhase = (character: PlayerConfig) => {
    setProject((prev) => applyCharacterToPhase(character, prev, true));
    showToast(`⭐ Personagem "${character.name}" vinculado à fase com sucesso! Mochila ajustada para ${character.defaultInventorySlots || 30} slots.`);
  };

  // Cria um novo personagem
  const handleCreateNewCharacter = () => {
    const newId = `char_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newChar: PlayerConfig = {
      id: newId,
      characterId: newId,
      name: `Personagem #${characters.length + 1}`,
      description: 'Novo personagem customizado com mochila e atributos próprios.',
      role: 'Aventureiro',
      color: '#eab308',
      speed: 4,
      scale: 1.0,
      autoBounce: true,
      jellyStyle: 'spring',
      jellyIntensity: 1.0,
      jellyIdleIntensity: 0.35,
      jellySpeed: 1.0,
      x: 384,
      y: 100,
      defaultInventorySlots: 30,
      defaultCurrencies: { gold: 150, gems: 10 },
      stats: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 15,
        defense: 10,
      },
    };

    const nextRoster = [...characters, newChar];
    handleSaveCharactersRoster(nextRoster);
    setSelectedCharacterId(newId);
    showToast(`Novo personagem "${newChar.name}" criado!`);
  };

  // Duplica um personagem existente
  const handleDuplicateCharacter = (char: PlayerConfig) => {
    const newId = `char_copy_${Date.now()}`;
    const duplicated: PlayerConfig = {
      ...char,
      id: newId,
      characterId: newId,
      name: `${char.name} (Cópia)`,
    };
    const nextRoster = [...characters, duplicated];
    handleSaveCharactersRoster(nextRoster);
    setSelectedCharacterId(newId);
    showToast(`Personagem duplicado como "${duplicated.name}"!`);
  };

  // Exclui um personagem
  const handleDeleteCharacter = (charId: string) => {
    if (characters.length <= 1) {
      showToast('⚠️ Mantenha pelo menos um personagem na biblioteca.');
      return;
    }
    const nextRoster = characters.filter((c) => c.id !== charId);
    handleSaveCharactersRoster(nextRoster);
    if (selectedCharacterId === charId) {
      setSelectedCharacterId(nextRoster[0].id);
    }
    showToast('Personagem removido da biblioteca.');
  };

  // Determina qual PNG exibir no preview interativo
  const currentPreviewPng = (() => {
    if (previewDirection === 'up' && selectedCharacter.avatarUpPng) return selectedCharacter.avatarUpPng;
    if (previewDirection === 'down' && selectedCharacter.avatarDownPng) return selectedCharacter.avatarDownPng;
    if (previewDirection === 'left' && selectedCharacter.avatarLeftPng) return selectedCharacter.avatarLeftPng;
    if (previewDirection === 'right' && selectedCharacter.avatarRightPng) return selectedCharacter.avatarRightPng;
    return selectedCharacter.avatarPng || null;
  })();

  const isAppliedToPhase =
    project.activeCharacterId === selectedCharacter.id ||
    project.player?.id === selectedCharacter.id ||
    project.player?.name === selectedCharacter.name;

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-black text-white select-none">
      {/* 1. Header Unificado do Editor de Personagens (Compacto & Integrado) */}
      <header className="bg-black/95 backdrop-blur-md border-b border-zinc-850 shrink-0 z-40 px-5 py-2 flex flex-col gap-2">
        {/* Linha Superior: Navegação Principal, Seleção de Personagem & Ações Globais */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onGoToDashboard}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
              title="Voltar ao Dashboard"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
              <span>Dashboard</span>
            </button>

            <button
              type="button"
              onClick={onGoToEditor}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-300 hover:text-white font-medium transition-colors cursor-pointer"
              title="Voltar ao Editor de Fases"
            >
              <span>Editor de Fases</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-800" />

            {/* Carrossel Compacto de Personagens do Roster */}
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider shrink-0 hidden md:inline">
                Herói:
              </span>
              {characters.map((char) => {
                const isSelected = char.id === selectedCharacter.id;
                const isCharApplied =
                  project.activeCharacterId === char.id ||
                  project.player?.id === char.id ||
                  project.player?.name === char.name;

                return (
                  <button
                    key={char.id}
                    type="button"
                    onClick={() => setSelectedCharacterId(char.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-zinc-900 border-orange-500 text-white shadow-sm shadow-orange-500/10'
                        : 'bg-zinc-950 hover:bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded flex items-center justify-center shrink-0 text-white text-[9px] font-bold overflow-hidden"
                      style={{ backgroundColor: char.color || '#3b82f6' }}
                    >
                      {char.avatarPng ? (
                        <img src={char.avatarPng} alt={char.name} className="w-full h-full object-contain" />
                      ) : (
                        char.name.charAt(0)
                      )}
                    </div>
                    <span>{char.name}</span>
                    {isCharApplied && (
                      <span className="text-[9px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded px-1.5">
                        Ativo
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ações da Direita */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleApplyToActivePhase(selectedCharacter)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                isAppliedToPhase
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-orange-500 hover:bg-orange-600 text-black shadow-sm'
              }`}
              title="Vincular este herói à fase ativa"
            >
              {isAppliedToPhase ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline">Vinculado</span>
                </>
              ) : (
                <>
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span>Usar na Fase</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleCreateNewCharacter}
              className="px-2.5 py-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-black text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Novo Herói</span>
            </button>

            {onPlayLevel && (
              <button
                type="button"
                onClick={onPlayLevel}
                className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black flex items-center gap-1 transition-all cursor-pointer shadow-sm shadow-emerald-500/20"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                saveCharactersRosterToStorage(characters);
                showToast('💾 Personagens salvos com sucesso!');
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs text-zinc-200 hover:text-white font-medium flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Salvar</span>
            </button>
          </div>
        </div>

        {/* Linha Inferior: Sub-Abas Integradas e Ferramentas do Personagem */}
        <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-none pt-1 border-t border-zinc-850/60">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('visual')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'visual'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Visual & Sprites</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('pets')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'pets'
                  ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-amber-300 hover:text-amber-200 border border-amber-500/40'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>🐾 Pets & Deck (3 Slots)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('inventario')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'inventario'
                  ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Mochila ({selectedCharacter.defaultInventorySlots || 30} slots)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('atributos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'atributos'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Atributos & Status</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('crescimento')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'crescimento'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Crescimento & Níveis (XP)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'assets'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Images className="w-3.5 h-3.5" />
              <span>Acervo & Editor de Itens</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('telas')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'telas'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>HUD & Controles</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('emulador')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                activeTab === 'emulador'
                  ? 'bg-orange-500 text-black font-extrabold shadow-sm'
                  : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>📱 Emulador do Jogo</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-mono shrink-0">
            <button
              type="button"
              onClick={() => handleDuplicateCharacter(selectedCharacter)}
              className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200 hover:underline cursor-pointer"
              title="Duplicar este personagem"
            >
              <Copy className="w-3 h-3" />
              <span>Duplicar</span>
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleDeleteCharacter(selectedCharacter.id)}
              className="flex items-center gap-1 text-red-400 hover:text-red-300 hover:underline cursor-pointer"
              title="Excluir este personagem"
            >
              <Trash2 className="w-3 h-3" />
              <span>Excluir</span>
            </button>
          </div>
        </div>
      </header>

      {/* 4. Área Principal: Formulário de Edição do Personagem vs Preview */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel Esquerdo: Conteúdo da Sub-Aba Ativa */}
        <div className="flex-1 overflow-y-auto p-5 border-r border-zinc-850 bg-black/70">
          <div className="max-w-3xl mx-auto space-y-5">
            {/* Cabeçalho do Personagem em Edição */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-bold border-2 shrink-0 overflow-hidden"
                  style={{
                    backgroundColor: selectedCharacter.color || '#3b82f6',
                    borderColor: selectedCharacter.color || '#3b82f6',
                  }}
                >
                  {selectedCharacter.avatarPng ? (
                    <img src={selectedCharacter.avatarPng} alt={selectedCharacter.name} className="w-full h-full object-contain" />
                  ) : (
                    selectedCharacter.name.charAt(0)
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white tracking-tight">
                      {selectedCharacter.name}
                    </h2>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-750">
                      {selectedCharacter.role || 'Aventureiro'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {selectedCharacter.description || 'Configuração persistente do personagem.'}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-mono text-zinc-400 block uppercase">Capacidade da Mochila</span>
                <span className="text-sm font-bold text-amber-400 font-mono">
                  {selectedCharacter.defaultInventorySlots || 30} slots
                </span>
              </div>
            </div>

            {/* ABA 1: VISUAL & SPRITES */}
            {activeTab === 'visual' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-4">
                  <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wide flex items-center gap-1.5">
                    <User className="w-4 h-4" />
                    <span>Identidade e Dados Básicos</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                        Nome do Personagem
                      </label>
                      <input
                        type="text"
                        value={selectedCharacter.name || ''}
                        onChange={(e) => handleUpdateCurrentCharacter({ name: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-400"
                        placeholder="Ex: Guerreira Astral"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                        Classe / Papel
                      </label>
                      <input
                        type="text"
                        value={selectedCharacter.role || ''}
                        onChange={(e) => handleUpdateCurrentCharacter({ role: e.target.value })}
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-blue-400"
                        placeholder="Ex: Mago, Tanque, Ladina, Suporte"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                      Biografia / Descrição Curta
                    </label>
                    <textarea
                      value={selectedCharacter.description || ''}
                      onChange={(e) => handleUpdateCurrentCharacter({ description: e.target.value })}
                      rows={2}
                      className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-400"
                      placeholder="Histórico ou papel do personagem na narrativa..."
                    />
                  </div>
                </div>

                {/* Sub-componente PlayerStudio dedicado para os Sprites e Física do Personagem */}
                <PlayerStudio
                  player={selectedCharacter}
                  onUpdatePlayer={handleUpdateCurrentCharacter}
                  onCenterCameraOnPlayer={() => showToast('Preview focado!')}
                  onOpenPetStudio={() => setActiveTab('pets')}
                  galleryAssets={project.galleryAssets || []}
                  galleryCategories={project.galleryCategories || []}
                  onUploadNewAsset={(newAsset) => {
                    setProject((prev) => ({
                      ...prev,
                      galleryAssets: [newAsset, ...(prev.galleryAssets || [])],
                    }));
                  }}
                />
              </div>
            )}

            {/* ABA 1.5: EDITOR DEDICADO DE PETS & DECK */}
            {activeTab === 'pets' && (
              <PetStudio
                player={selectedCharacter}
                onUpdatePlayer={handleUpdateCurrentCharacter}
                project={project}
                showToast={showToast}
                galleryAssets={project.galleryAssets || []}
                galleryCategories={project.galleryCategories || []}
                onUploadNewAsset={(newAsset) => {
                  setProject((prev) => ({
                    ...prev,
                    galleryAssets: [newAsset, ...(prev.galleryAssets || [])],
                  }));
                }}
              />
            )}

            {/* ABA 2: MOCHILA & LIMITES DO PERSONAGEM */}
            {activeTab === 'inventario' && (
              <div className="space-y-4">
                <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide flex items-center gap-1.5">
                        <Package className="w-4 h-4" />
                        <span>Configuração da Mochila deste Personagem</span>
                      </h3>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Defina a capacidade máxima de slots que a mochila terá quando este personagem estiver em jogo.
                      </p>
                    </div>
                    <span className="text-xl font-bold font-mono text-amber-400">
                      {selectedCharacter.defaultInventorySlots || 30} slots
                    </span>
                  </div>

                  {/* Controle deslizante de slots */}
                  <div className="space-y-2 pt-2 border-t border-zinc-850">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Limite de Slots da Mochila:</span>
                      <div className="flex items-center gap-1.5">
                        {[16, 24, 30, 36, 48, 64].map((slots) => (
                          <button
                            key={slots}
                            type="button"
                            onClick={() => handleUpdateCurrentCharacter({ defaultInventorySlots: slots })}
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-colors ${
                              (selectedCharacter.defaultInventorySlots || 30) === slots
                                ? 'bg-amber-500 text-black'
                                : 'bg-zinc-900 text-zinc-400 hover:text-white'
                            }`}
                          >
                            {slots}
                          </button>
                        ))}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={80}
                      step={2}
                      value={selectedCharacter.defaultInventorySlots || 30}
                      onChange={(e) => handleUpdateCurrentCharacter({ defaultInventorySlots: parseInt(e.target.value) || 30 })}
                      className="w-full accent-amber-500 h-1.5 bg-zinc-900 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Moedas Iniciais */}
                  <div className="pt-3 border-t border-zinc-850 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ouro Inicial</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={selectedCharacter.defaultCurrencies?.gold ?? 150}
                        onChange={(e) =>
                          handleUpdateCurrentCharacter({
                            defaultCurrencies: {
                              gold: Math.max(0, parseInt(e.target.value) || 0),
                              gems: selectedCharacter.defaultCurrencies?.gems ?? 10,
                            },
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1 mb-1">
                        <Gem className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Gemas Iniciais</span>
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={selectedCharacter.defaultCurrencies?.gems ?? 10}
                        onChange={(e) =>
                          handleUpdateCurrentCharacter({
                            defaultCurrencies: {
                              gold: selectedCharacter.defaultCurrencies?.gold ?? 150,
                              gems: Math.max(0, parseInt(e.target.value) || 0),
                            },
                          })
                        }
                        className="w-full bg-zinc-900 border border-zinc-750 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-emerald-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Gestor do Catálogo de Itens da Engine */}
                <InventoryManagerStudio
                  project={project}
                  onUpdateProject={(updates: Partial<MapProject>) => setProject((prev) => ({ ...prev, ...updates }))}
                  galleryAssets={project.galleryAssets || []}
                  showToast={showToast}
                />
              </div>
            )}

            {/* ABA 3: ATRIBUTOS & STATUS */}
            {activeTab === 'atributos' && (
              <div className="p-4 bg-zinc-950 border border-zinc-850 rounded-xl space-y-4">
                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wide flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Atributos de Combate e Estatísticas</span>
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Valores base de vida, energia mágica, ataque e defesa deste personagem ao entrar nas fases.
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-1">
                    <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
                      <Heart className="w-3 h-3" />
                      <span>Vida Máxima (HP)</span>
                    </span>
                    <input
                      type="number"
                      min={10}
                      value={selectedCharacter.stats?.maxHp ?? 100}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 100;
                        handleUpdateCurrentCharacter({
                          stats: {
                            ...(selectedCharacter.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, attack: 15, defense: 10 }),
                            hp: val,
                            maxHp: val,
                          },
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded px-2.5 py-1 text-sm text-white font-mono font-bold"
                    />
                  </div>

                  <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-1">
                    <span className="text-[10px] font-semibold text-blue-400 uppercase tracking-wider flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      <span>Mana Máxima (MP)</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={selectedCharacter.stats?.maxMp ?? 50}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 50;
                        handleUpdateCurrentCharacter({
                          stats: {
                            ...(selectedCharacter.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, attack: 15, defense: 10 }),
                            mp: val,
                            maxMp: val,
                          },
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded px-2.5 py-1 text-sm text-white font-mono font-bold"
                    />
                  </div>

                  <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-1">
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <Swords className="w-3 h-3" />
                      <span>Poder de Ataque</span>
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={selectedCharacter.stats?.attack ?? 15}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 15;
                        handleUpdateCurrentCharacter({
                          stats: {
                            ...(selectedCharacter.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, attack: 15, defense: 10 }),
                            attack: val,
                          },
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded px-2.5 py-1 text-sm text-white font-mono font-bold"
                    />
                  </div>

                  <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-lg space-y-1">
                    <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span>Armadura / Defesa</span>
                    </span>
                    <input
                      type="number"
                      min={0}
                      value={selectedCharacter.stats?.defense ?? 10}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 10;
                        handleUpdateCurrentCharacter({
                          stats: {
                            ...(selectedCharacter.stats || { hp: 100, maxHp: 100, mp: 50, maxMp: 50, attack: 15, defense: 10 }),
                            defense: val,
                          },
                        });
                      }}
                      className="w-full bg-zinc-950 border border-zinc-750 rounded px-2.5 py-1 text-sm text-white font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Atalho direto para a seção Crescimento e Progressão */}
                <div className="pt-2 border-t border-zinc-850 flex items-center justify-between">
                  <span className="text-[11px] text-zinc-400">
                    Configure curvas de XP incremental/acumulado, crescimento % de atributos por nível e recompensas de level-up:
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTab('crescimento')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    <span>Abrir Crescimento & Progressão (XP)</span>
                  </button>
                </div>
              </div>
            )}

            {/* ABA 3.5: CRESCIMENTO E PROGRESSÃO (SEÇÃO 18) */}
            {activeTab === 'crescimento' && (
              <CharacterGrowthStudio
                selectedCharacter={selectedCharacter}
                project={project}
                onUpdateCharacter={(updates) => handleUpdateCurrentCharacter(updates)}
                onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
                onOpenQuestEditor={onOpenQuests}
                showToast={showToast}
              />
            )}

            {/* ABA 4: ACERVO DE ASSETS & ITENS INTERATIVOS */}
            {activeTab === 'assets' && (
              <InteractiveItemGalleryStudio
                project={project}
                selectedCharacter={selectedCharacter}
                onUpdateProject={(updates: Partial<MapProject>) => setProject((prev) => ({ ...prev, ...updates }))}
                onUpdateCurrentCharacter={(updates) => handleUpdateCurrentCharacter(updates)}
                showToast={showToast}
              />
            )}

            {/* ABA 5: TELAS E HUDS */}
            {activeTab === 'telas' && (
              <ScreensStudio
                project={project}
                onUpdateProject={(updates: Partial<MapProject>) => setProject((prev) => ({ ...prev, ...updates }))}
                galleryAssets={project.galleryAssets || []}
                showToast={showToast}
              />
            )}

            {/* ABA 6: EMULADOR DO JOGO COMPLETO */}
            {activeTab === 'emulador' && (
              <div className="flex flex-col items-center justify-center p-4 bg-zinc-950/80 rounded-2xl border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between w-full px-2 text-xs">
                  <span className="font-bold text-amber-400 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Emulador ao Vivo do Personagem: {selectedCharacter.name}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setEmulatorOrientation(emulatorOrientation === 'portrait' ? 'landscape' : 'portrait')}
                    className="px-2.5 py-1 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-zinc-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Smartphone className={`w-3.5 h-3.5 ${emulatorOrientation === 'landscape' ? 'rotate-90 text-amber-400' : 'text-blue-400'}`} />
                    <span>{emulatorOrientation === 'portrait' ? 'Modo Retrato (Vertical)' : 'Modo Paisagem (Horizontal)'}</span>
                  </button>
                </div>

                <div className="w-full flex justify-center overflow-auto p-2">
                  <PortraitEmulator
                    project={{
                      ...project,
                      player: {
                        ...(project.player || {}),
                        ...selectedCharacter,
                        id: selectedCharacter.id,
                        characterId: selectedCharacter.id,
                        name: selectedCharacter.name,
                        avatarPng: selectedCharacter.avatarPng,
                        avatarUpPng: selectedCharacter.avatarUpPng,
                        avatarDownPng: selectedCharacter.avatarDownPng,
                        avatarLeftPng: selectedCharacter.avatarLeftPng,
                        avatarRightPng: selectedCharacter.avatarRightPng,
                        scale: selectedCharacter.scale ?? 1.0,
                        speed: selectedCharacter.speed ?? 4,
                        color: selectedCharacter.color ?? '#3b82f6',
                        autoBounce: selectedCharacter.autoBounce ?? true,
                        jellyStyle: selectedCharacter.jellyStyle ?? 'spring',
                        jellyIntensity: selectedCharacter.jellyIntensity ?? 1.0,
                        jellyIdleIntensity: selectedCharacter.jellyIdleIntensity ?? 0.35,
                        jellySpeed: selectedCharacter.jellySpeed ?? 1.0,
                        showNameTag: selectedCharacter.showNameTag ?? false,
                        motionLayers: selectedCharacter.motionLayers,
                        defaultInventorySlots: selectedCharacter.defaultInventorySlots ?? 30,
                        stats: selectedCharacter.stats,
                      },
                      playerInventory: {
                        ...(project.playerInventory || {
                          enabled: true,
                          columns: 5,
                          items: [],
                          currencies: { gold: 150, gems: 10 },
                          maxSlots: 30,
                        }),
                        maxSlots: selectedCharacter.defaultInventorySlots || project.playerInventory?.maxSlots || 30,
                        currencies: {
                          gold: selectedCharacter.defaultCurrencies?.gold ?? project.playerInventory?.currencies.gold ?? 150,
                          gems: selectedCharacter.defaultCurrencies?.gems ?? project.playerInventory?.currencies.gems ?? 10,
                        },
                      },
                    }}
                    savedLevels={savedLevels}
                    activeMarkerId={null}
                    onSelectMarker={() => {}}
                    onUpdatePlayer={(updates) => handleUpdateCurrentCharacter(updates)}
                    onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
                    orientation={emulatorOrientation}
                    onToggleOrientation={setEmulatorOrientation}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: Menu Lateral com Emulador do Jogo e Preview do Sprite */}
        <div
          className={`${
            sidePanelView === 'emulator' && emulatorOrientation === 'landscape'
              ? 'w-[820px] 2xl:w-[940px]'
              : 'w-[560px] xl:w-[620px] 2xl:w-[680px]'
          } shrink-0 bg-zinc-950 flex flex-col border-l border-zinc-850 overflow-hidden transition-all duration-200 select-none`}
        >
          {/* Barra Superior Unificada do Menu Lateral */}
          <div className="flex items-center justify-between px-3 py-2 bg-black border-b border-zinc-850 shrink-0 gap-2">
            {/* Esquerda: Alternador de Visões + Status Compacto do Personagem */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1 p-0.5 bg-zinc-900 border border-zinc-850 rounded-lg shrink-0">
                <button
                  type="button"
                  onClick={() => setSidePanelView('emulator')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    sidePanelView === 'emulator'
                      ? 'bg-orange-500 text-black shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Emulador</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSidePanelView('sprite_preview')}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    sidePanelView === 'sprite_preview'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sprite & Física</span>
                </button>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900/80 border border-zinc-800 text-xs shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="font-bold text-white truncate max-w-[110px]">
                  {selectedCharacter.name}
                </span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 rounded shrink-0">
                  🎒 {selectedCharacter.defaultInventorySlots || 30}s
                </span>
              </div>
            </div>

            {/* Direita: Botão Vinculado + Alternador de Orientação (Retrato / Paisagem) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => handleApplyToActivePhase(selectedCharacter)}
                className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  isAppliedToPhase
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-orange-500 hover:bg-orange-600 text-black shadow-sm'
                }`}
                title="Vincular este personagem à fase ativa"
              >
                <Star className="w-3 h-3 fill-current" />
                <span>{isAppliedToPhase ? 'Vinculado' : 'Vincular'}</span>
              </button>

              {sidePanelView === 'emulator' && (
                <button
                  type="button"
                  onClick={() => setEmulatorOrientation(emulatorOrientation === 'portrait' ? 'landscape' : 'portrait')}
                  className="px-2.5 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-[11px] font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                  title="Alternar orientação do emulador (Retrato / Paisagem)"
                >
                  <Smartphone className={`w-3 h-3 ${emulatorOrientation === 'landscape' ? 'rotate-90 text-amber-400' : 'text-blue-400'}`} />
                  <span>{emulatorOrientation === 'portrait' ? 'Retrato' : 'Paisagem'}</span>
                </button>
              )}
            </div>
          </div>

          {/* VISTA 1: EMULADOR COMPLETO AO VIVO NA LATERAL */}
          {sidePanelView === 'emulator' && (
            <div className="flex-1 flex flex-col overflow-hidden bg-black/95">

              {/* Corpo do Emulador Mobile */}
              <div className="flex-1 flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4">
                <PortraitEmulator
                  project={{
                    ...project,
                    player: {
                      ...(project.player || {}),
                      ...selectedCharacter,
                      id: selectedCharacter.id,
                      characterId: selectedCharacter.id,
                      name: selectedCharacter.name,
                      avatarPng: selectedCharacter.avatarPng,
                      avatarUpPng: selectedCharacter.avatarUpPng,
                      avatarDownPng: selectedCharacter.avatarDownPng,
                      avatarLeftPng: selectedCharacter.avatarLeftPng,
                      avatarRightPng: selectedCharacter.avatarRightPng,
                      scale: selectedCharacter.scale ?? 1.0,
                      speed: selectedCharacter.speed ?? 4,
                      color: selectedCharacter.color ?? '#3b82f6',
                      autoBounce: selectedCharacter.autoBounce ?? true,
                      jellyStyle: selectedCharacter.jellyStyle ?? 'spring',
                      jellyIntensity: selectedCharacter.jellyIntensity ?? 1.0,
                      jellyIdleIntensity: selectedCharacter.jellyIdleIntensity ?? 0.35,
                      jellySpeed: selectedCharacter.jellySpeed ?? 1.0,
                      showNameTag: selectedCharacter.showNameTag ?? false,
                      motionLayers: selectedCharacter.motionLayers,
                      defaultInventorySlots: selectedCharacter.defaultInventorySlots ?? 30,
                      stats: selectedCharacter.stats,
                    },
                    playerInventory: {
                      ...(project.playerInventory || {
                        enabled: true,
                        columns: 5,
                        items: [],
                        currencies: { gold: 150, gems: 10 },
                        maxSlots: 30,
                      }),
                      maxSlots: selectedCharacter.defaultInventorySlots || project.playerInventory?.maxSlots || 30,
                      currencies: {
                        gold: selectedCharacter.defaultCurrencies?.gold ?? project.playerInventory?.currencies.gold ?? 150,
                        gems: selectedCharacter.defaultCurrencies?.gems ?? project.playerInventory?.currencies.gems ?? 10,
                      },
                    },
                  }}
                  savedLevels={savedLevels}
                  activeMarkerId={null}
                  onSelectMarker={() => {}}
                  onUpdatePlayer={(updates) => handleUpdateCurrentCharacter(updates)}
                  onUpdateProject={(updates) => setProject((prev) => ({ ...prev, ...updates }))}
                  orientation={emulatorOrientation}
                  onToggleOrientation={setEmulatorOrientation}
                />
              </div>
            </div>
          )}

          {/* VISTA 2: PREVIEW DE SPRITES E FÍSICA FOCADA */}
          {sidePanelView === 'sprite_preview' && (
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div className="p-4 rounded-xl bg-black border border-zinc-850 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                    Preview do Sprite
                  </span>
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${selectedCharacter.color || '#3b82f6'}20`,
                      color: selectedCharacter.color || '#3b82f6',
                      border: `1px solid ${selectedCharacter.color || '#3b82f6'}40`,
                    }}
                  >
                    {selectedCharacter.name}
                  </span>
                </div>

                {/* Stage do Preview */}
                <div className="h-64 w-full rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col items-center justify-center relative overflow-hidden group">
                  <div
                    className="absolute inset-0 opacity-20 pointer-events-none"
                    style={{
                      backgroundImage:
                        'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)',
                      backgroundSize: '20px 20px',
                    }}
                  />

                  {currentPreviewPng ? (
                    <div
                      className="transition-transform duration-150 flex items-center justify-center"
                      style={{
                        transform: `scale(${selectedCharacter.scale || 1.0})`,
                      }}
                    >
                      <MotionAssetCanvas
                        src={currentPreviewPng}
                        alt={selectedCharacter.name}
                        motionLayers={selectedCharacter.motionLayers}
                        isNpcBounce={selectedCharacter.autoBounce !== false && isPreviewWalking}
                        width={110}
                        height={110}
                        className="object-contain filter drop-shadow-xl"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-20 h-20 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-lg"
                      style={{ backgroundColor: selectedCharacter.color || '#3b82f6' }}
                    >
                      {selectedCharacter.name.charAt(0)}
                    </div>
                  )}

                  {/* Botão de Caminhada / Bounce no Preview */}
                  <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-zinc-400 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-zinc-800">
                    <span>Física: {selectedCharacter.jellyStyle || 'spring'}</span>
                    <button
                      type="button"
                      onClick={() => setIsPreviewWalking(!isPreviewWalking)}
                      className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                        isPreviewWalking ? 'text-emerald-400 hover:text-emerald-300' : 'text-zinc-500 hover:text-zinc-400'
                      }`}
                    >
                      {isPreviewWalking ? '▶ Animando' : '⏸ Parado'}
                    </button>
                  </div>
                </div>

                {/* Controles de Direção do Preview */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block text-center">
                    Testar Direções do Sprite
                  </span>
                  <div className="flex items-center justify-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPreviewDirection('left')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        previewDirection === 'left'
                          ? 'bg-orange-500 text-black border-orange-400'
                          : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                      }`}
                      title="Esquerda"
                    >
                      <ArrowLeftIcon className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() => setPreviewDirection('up')}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          previewDirection === 'up'
                            ? 'bg-orange-500 text-black border-orange-400'
                            : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                        }`}
                        title="Cima"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setPreviewDirection('down')}
                        className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          previewDirection === 'down'
                            ? 'bg-orange-500 text-black border-orange-400'
                            : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                        }`}
                        title="Baixo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => setPreviewDirection('right')}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        previewDirection === 'right'
                          ? 'bg-orange-500 text-black border-orange-400'
                          : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                      }`}
                      title="Direita"
                    >
                      <ArrowRightIcon className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setPreviewDirection('default')}
                      className={`px-2.5 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                        previewDirection === 'default'
                          ? 'bg-blue-600 text-white border-blue-400'
                          : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                      }`}
                      title="Idle Padrão"
                    >
                      Idle
                    </button>
                  </div>
                </div>

                {/* Ficha Resumida do Personagem */}
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Velocidade Base:</span>
                    <span className="font-mono font-bold text-white">{selectedCharacter.speed || 4} px/f</span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Capacidade Mochila:</span>
                    <span className="font-mono font-bold text-amber-300">
                      {selectedCharacter.defaultInventorySlots || 30} slots
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>HP / MP:</span>
                    <span className="font-mono font-bold text-red-300">
                      {selectedCharacter.stats?.maxHp ?? 100} / {selectedCharacter.stats?.maxMp ?? 50}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-zinc-400">
                    <span>Ouro / Gemas:</span>
                    <span className="font-mono font-bold text-emerald-300">
                      {selectedCharacter.defaultCurrencies?.gold ?? 150}g / {selectedCharacter.defaultCurrencies?.gems ?? 10}💎
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleApplyToActivePhase(selectedCharacter)}
                  className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-black font-extrabold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <Star className="w-4 h-4 fill-current" />
                  <span>Vincular este Personagem à Fase</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
