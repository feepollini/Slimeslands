import React, { useRef, useState, useMemo, useEffect } from 'react';
import { MapMarker, GalleryAsset, MapProject } from '../../../types/map';
import { pickMarkerDirectionalPng } from '../../../types/map';
import { readUploadedImage } from '../../../utils/tileGenerator';
import {
  parseDirectionalFolderFiles,
  mapAssetsTo4Directions,
  SpriteDirection4Way,
} from '../../../utils/directionalSpriteImporter';
import {
  loadCharactersRoster,
  applyCharacterToExistingMarker,
} from '../../../utils/characterHelpers';
import { localAssetSyncService, LocalSyncState } from '../../../services/localAssetSyncService';
import { AssetGalleryModal } from '../../AssetGalleryModal';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Upload,
  FolderOpen,
  FolderPlus,
  X,
  RefreshCw,
  CheckCircle2,
  Sparkles,
  Users,
  Images,
} from 'lucide-react';

interface NpcDirectionalSpritesPanelProps {
  marker: MapMarker;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  galleryAssets?: GalleryAsset[];
  galleryCategories?: string[];
  onUploadNewAsset?: (newAsset: GalleryAsset) => void;
  project?: MapProject;
  savedLevels?: import('../../../types/map').SavedLevel[];
  compactDefault?: boolean;
}

const DIRECTION_SLOTS: {
  dir: SpriteDirection4Way;
  field: 'avatarDownPng' | 'avatarUpPng' | 'avatarLeftPng' | 'avatarRightPng';
  label: string;
  shortLabel: string;
  hint: string;
  emoji: string;
}[] = [
  {
    dir: 'down',
    field: 'avatarDownPng',
    label: 'Baixo / Frente (Down)',
    shortLabel: '⬇️ Frente',
    hint: 'frente, baixo, down, sul',
    emoji: '⬇️',
  },
  {
    dir: 'up',
    field: 'avatarUpPng',
    label: 'Cima / Costas (Up)',
    shortLabel: '⬆️ Costas',
    hint: 'costas, cima, up, back',
    emoji: '⬆️',
  },
  {
    dir: 'left',
    field: 'avatarLeftPng',
    label: 'Esquerda (Left)',
    shortLabel: '⬅️ Esquerda',
    hint: 'esquerda, esq, left',
    emoji: '⬅️',
  },
  {
    dir: 'right',
    field: 'avatarRightPng',
    label: 'Direita (Right)',
    shortLabel: '➡️ Direita',
    hint: 'direita, dir, right',
    emoji: '➡️',
  },
];

export const NpcDirectionalSpritesPanel: React.FC<NpcDirectionalSpritesPanelProps> = ({
  marker,
  onUpdateMarker,
  galleryAssets = [],
  galleryCategories = [],
  onUploadNewAsset,
  project,
  savedLevels = [],
  compactDefault = false,
}) => {
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const multiFilesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [uploadingSlot, setUploadingSlot] = useState<SpriteDirection4Way>('down');
  const [galleryTargetSlot, setGalleryTargetSlot] = useState<SpriteDirection4Way | null>(null);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);
  const [draggedSlotDir, setDraggedSlotDir] = useState<SpriteDirection4Way | null>(null);
  const [isDraggingOverDropzone, setIsDraggingOverDropzone] = useState(false);

  const configuredCount = [
    marker.avatarDownPng || marker.actionNpc?.avatarDownPng,
    marker.avatarUpPng || marker.actionNpc?.avatarUpPng,
    marker.avatarLeftPng || marker.actionNpc?.avatarLeftPng,
    marker.avatarRightPng || marker.actionNpc?.avatarRightPng,
  ].filter(Boolean).length;

  const [isExpanded, setIsExpanded] = useState<boolean>(() => !compactDefault || configuredCount > 0);

  // Sincronização com pastas locais conectadas via LocalAssetSyncService
  const [syncState, setSyncState] = useState<LocalSyncState>(localAssetSyncService.getState());
  useEffect(() => {
    return localAssetSyncService.subscribe((st) => setSyncState(st));
  }, []);

  const characters = useMemo(() => loadCharactersRoster(project), [project]);

  // Agrupa pastas/categorias disponíveis que tenham 2 ou mais imagens para importação 1-clique
  const availableFolderPacks = useMemo(() => {
    const groups = new Map<string, { label: string; items: { name: string; dataUrl: string }[] }>();

    // 1. Categorias da Galeria do Projeto
    for (const asset of galleryAssets) {
      if (asset.mediaType === 'video' || !asset.dataUrl) continue;
      const cat = (asset.category || '').trim();
      if (!cat || cat === 'Geral' || cat === 'Carimbos' || cat === 'Telas Interativas') continue;
      const key = `gal:${cat}`;
      if (!groups.has(key)) {
        groups.set(key, { label: `📁 Galeria: ${cat}`, items: [] });
      }
      groups.get(key)!.items.push({ name: asset.name, dataUrl: asset.dataUrl });
    }

    // 2. Pastas locais sincronizadas no LocalAssetSyncService
    if (syncState.assets && syncState.assets.length > 0) {
      for (const localAsset of syncState.assets) {
        if (localAsset.mediaType === 'video' || !localAsset.previewUrl) continue;
        const folderKey = localAsset.folderPath || localAsset.category || 'Raiz';
        const key = `sync:${folderKey}`;
        if (!groups.has(key)) {
          groups.set(key, { label: `📂 Pasta Local: ${folderKey}`, items: [] });
        }
        groups.get(key)!.items.push({
          name: localAsset.name,
          dataUrl: localAsset.previewUrl,
        });
      }
    }

    return Array.from(groups.entries())
      .filter(([, grp]) => grp.items.length >= 2)
      .map(([key, grp]) => ({
        key,
        label: `${grp.label} (${grp.items.length} PNGs)`,
        rawFolderName: grp.label.replace(/^.*?:\s*/, ''),
        items: grp.items,
      }));
  }, [galleryAssets, syncState.assets]);

  const showQuickFeedback = (msg: string) => {
    setStatusFeedback(msg);
    setTimeout(() => {
      setStatusFeedback((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const getSlotPng = (dir: SpriteDirection4Way): string | undefined => {
    if (dir === 'up') return marker.avatarUpPng || marker.actionNpc?.avatarUpPng;
    if (dir === 'down') return marker.avatarDownPng || marker.actionNpc?.avatarDownPng;
    if (dir === 'left') return marker.avatarLeftPng || marker.actionNpc?.avatarLeftPng;
    if (dir === 'right') return marker.avatarRightPng || marker.actionNpc?.avatarRightPng;
    return undefined;
  };

  const applyDirectionalUpdates = (updates: {
    avatarDownPng?: string;
    avatarUpPng?: string;
    avatarLeftPng?: string;
    avatarRightPng?: string;
    customIconPng?: string;
    facingDirection?: SpriteDirection4Way;
    name?: string;
  }) => {
    const nextActionNpc = marker.actionNpc
      ? {
          ...marker.actionNpc,
          ...(updates.avatarDownPng !== undefined ? { avatarDownPng: updates.avatarDownPng } : {}),
          ...(updates.avatarUpPng !== undefined ? { avatarUpPng: updates.avatarUpPng } : {}),
          ...(updates.avatarLeftPng !== undefined ? { avatarLeftPng: updates.avatarLeftPng } : {}),
          ...(updates.avatarRightPng !== undefined ? { avatarRightPng: updates.avatarRightPng } : {}),
          ...(updates.facingDirection !== undefined ? { facingDirection: updates.facingDirection } : {}),
        }
      : undefined;

    onUpdateMarker(marker.id, {
      ...updates,
      ...(nextActionNpc ? { actionNpc: nextActionNpc } : {}),
    });
  };

  const handleSetSingleSlot = (dir: SpriteDirection4Way, dataUrl: string | undefined) => {
    const patch: Record<string, any> = {};
    if (dir === 'down') patch.avatarDownPng = dataUrl;
    if (dir === 'up') patch.avatarUpPng = dataUrl;
    if (dir === 'left') patch.avatarLeftPng = dataUrl;
    if (dir === 'right') patch.avatarRightPng = dataUrl;

    // Se ainda não tinha customIconPng principal, usa o sprite aplicado como base também
    if (dataUrl && !marker.customIconPng) {
      patch.customIconPng = dataUrl;
    } else if (dir === 'down' && dataUrl) {
      patch.customIconPng = dataUrl;
    }
    patch.facingDirection = dir;
    applyDirectionalUpdates(patch);
  };

  const handleUploadSingleSlot = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await readUploadedImage(file);
      handleSetSingleSlot(uploadingSlot, res.dataUrl);
      showQuickFeedback(`✅ Sprite aplicado na direção ${uploadingSlot.toUpperCase()}!`);
    } catch (err) {
      console.error('Erro ao carregar PNG direcional:', err);
    }
    e.target.value = '';
  };

  // Importação Rápida de Pasta Completa ou Múltiplos PNGs (4 Direções Automáticas)
  const handleBatchFilesOrFolder = async (fileList: FileList | File[]) => {
    const pack = await parseDirectionalFolderFiles(fileList);
    if (pack.totalImagesRead === 0) {
      showQuickFeedback('⚠️ Nenhuma imagem PNG/WebP encontrada na seleção.');
      return;
    }

    const isGenericName =
      !marker.name ||
      marker.name.trim() === '' ||
      /^(marcador|npc|novo npc|chefe|ponto)$/i.test(marker.name.trim());

    const cleanFolderTitle = pack.folderName
      ? pack.folderName.replace(/[_-]+/g, ' ').trim()
      : undefined;

    applyDirectionalUpdates({
      customIconPng: pack.defaultPng || marker.customIconPng,
      avatarDownPng: pack.avatarDownPng,
      avatarUpPng: pack.avatarUpPng,
      avatarLeftPng: pack.avatarLeftPng,
      avatarRightPng: pack.avatarRightPng,
      facingDirection: 'down',
      ...(isGenericName && cleanFolderTitle ? { name: cleanFolderTitle } : {}),
    });

    // Registra também na galeria do projeto para reutilização rápida
    if (onUploadNewAsset && pack.loadedAssets.length > 0) {
      const categoryName = cleanFolderTitle || marker.name || 'NPCs 4 Direções';
      for (const item of pack.loadedAssets) {
        const alreadyExists = galleryAssets.some((g) => g.dataUrl === item.dataUrl);
        if (!alreadyExists) {
          onUploadNewAsset({
            id: `asset-npcdir-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: item.name,
            dataUrl: item.dataUrl,
            width: item.width,
            height: item.height,
            category: categoryName,
            tags: ['npc', '4-direcoes', item.assignedDir || 'sprite'],
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    setIsExpanded(true);
    showQuickFeedback(
      `🎉 Pasta "${cleanFolderTitle || '4 Direções'}" importada! (${pack.loadedAssets.length} direções preenchidas automaticamente)`
    );
  };

  const handleApplyFolderPackFromGallery = (packKey: string) => {
    const found = availableFolderPacks.find((p) => p.key === packKey);
    if (!found) return;

    // Se for da pasta local sincronizada, converte para DataURL permanente se possível
    const pack = mapAssetsTo4Directions(found.items, found.rawFolderName);
    const isGenericName =
      !marker.name ||
      marker.name.trim() === '' ||
      /^(marcador|npc|novo npc|chefe|ponto)$/i.test(marker.name.trim());

    applyDirectionalUpdates({
      customIconPng: pack.defaultPng || marker.customIconPng,
      avatarDownPng: pack.avatarDownPng,
      avatarUpPng: pack.avatarUpPng,
      avatarLeftPng: pack.avatarLeftPng,
      avatarRightPng: pack.avatarRightPng,
      facingDirection: 'down',
      ...(isGenericName && found.rawFolderName ? { name: found.rawFolderName } : {}),
    });

    showQuickFeedback(`✅ 4 Direções aplicadas da pasta "${found.rawFolderName}"!`);
  };

  // Troca rápida entre dois slots (arrastar um slot sobre outro)
  const handleSwapSlots = (fromDir: SpriteDirection4Way, toDir: SpriteDirection4Way) => {
    if (fromDir === toDir) return;
    const fromPng = getSlotPng(fromDir);
    const toPng = getSlotPng(toDir);
    const nextMap: Record<SpriteDirection4Way, string | undefined> = {
      down: getSlotPng('down'),
      up: getSlotPng('up'),
      left: getSlotPng('left'),
      right: getSlotPng('right'),
    };
    nextMap[fromDir] = toPng;
    nextMap[toDir] = fromPng;

    applyDirectionalUpdates({
      avatarDownPng: nextMap.down,
      avatarUpPng: nextMap.up,
      avatarLeftPng: nextMap.left,
      avatarRightPng: nextMap.right,
      customIconPng: nextMap.down || marker.customIconPng,
      facingDirection: toDir,
    });
    showQuickFeedback(`🔄 Direções ${fromDir.toUpperCase()} ↔ ${toDir.toUpperCase()} trocadas!`);
  };

  // Rotaciona a ordem das 4 direções em 1 clique caso a pasta tivesse nomes genéricos (1, 2, 3, 4)
  const handleRotateOrder = () => {
    const d = getSlotPng('down');
    const u = getSlotPng('up');
    const l = getSlotPng('left');
    const r = getSlotPng('right');
    applyDirectionalUpdates({
      avatarDownPng: u,
      avatarUpPng: l,
      avatarLeftPng: r,
      avatarRightPng: d,
      customIconPng: u || marker.customIconPng,
    });
    showQuickFeedback('🔄 Ordem das 4 direções alternada!');
  };

  const activeFacing: SpriteDirection4Way =
    marker.facingDirection || marker.actionNpc?.facingDirection || 'down';
  const resolvedPreview = pickMarkerDirectionalPng(marker, activeFacing);

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsDraggingOverDropzone(true);
        }
      }}
      onDragLeave={() => setIsDraggingOverDropzone(false)}
      onDrop={(e) => {
        setIsDraggingOverDropzone(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          handleBatchFilesOrFolder(e.dataTransfer.files);
        }
      }}
      className={`p-3 rounded-xl border transition-all space-y-2.5 ${
        isDraggingOverDropzone
          ? 'bg-sky-950/60 border-sky-400 ring-2 ring-sky-400/50 shadow-lg'
          : 'bg-gradient-to-b from-slate-950 via-slate-900/95 to-slate-950 border-sky-500/35 shadow-sm'
      }`}
    >
      {/* Inputs Ocultos: Pasta Completa, 4 Arquivos Simultâneos e Slot Individual */}
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: '', directory: '' } as any)}
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleBatchFilesOrFolder(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={multiFilesInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            handleBatchFilesOrFolder(e.target.files);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={singleFileInputRef}
        type="file"
        accept="image/png, image/jpeg, image/webp, image/gif, image/svg+xml"
        className="hidden"
        onChange={handleUploadSingleSlot}
      />

      {/* Cabeçalho com Contador e Botão de Importar Pasta Rápida */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setIsExpanded((v) => !v)}
          className="flex items-center gap-2 text-left cursor-pointer"
        >
          <span className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sm shrink-0">
            🧭
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-extrabold text-sky-200 tracking-tight">
                Sprites 4 Direções (NPC / Action NPC)
              </span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold border ${
                  configuredCount > 0
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {configuredCount}/4 {configuredCount === 0 ? 'Opcional' : 'Ativos'}
              </span>
            </div>
            <span className="text-[9.5px] text-slate-400 block">
              Importe a pasta do NPC e cada PNG entra na sua direção automaticamente
            </span>
          </div>
        </button>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-black text-[10px] shadow-md flex items-center gap-1 cursor-pointer transition-all active:scale-95 border border-sky-300/40"
            title="Selecione a pasta do seu NPC com os 4 PNGs (ex: frente, costas, esquerda, direita) e o sistema preenche tudo sozinho!"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>📂 Importar Pasta (4 PNGs)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-bold text-slate-300 hover:text-white cursor-pointer"
          >
            {isExpanded ? '▾' : '▸'}
          </button>
        </div>
      </div>

      {/* Feedback Rápido de Auto-Alocação */}
      {statusFeedback && (
        <div className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 border border-emerald-400/50 text-emerald-200 text-[10px] font-bold flex items-center gap-1.5 animate-pulse">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>{statusFeedback}</span>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-2.5 pt-2 border-t border-slate-800/90">
          {/* Barra de Atalhos Rápidos: Selecionar 4 Arquivos, Aplicar Pasta da Galeria ou Copiar de Personagem */}
          <div className="grid grid-cols-1 gap-1.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => multiFilesInputRef.current?.click()}
                className="flex-1 py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-sky-500/30 text-sky-300 text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                title="Selecionar os 4 arquivos PNG soltos de uma vez"
              >
                <Images className="w-3.5 h-3.5 text-sky-400" />
                <span>Selecionar 4 PNGs Juntos</span>
              </button>

              {configuredCount > 0 && (
                <>
                  <button
                    type="button"
                    onClick={handleRotateOrder}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Alternar/girar a ordem dos 4 PNGs caso os arquivos tivessem nomes numéricos (1, 2, 3, 4)"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Girar Ordem</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      applyDirectionalUpdates({
                        avatarDownPng: undefined,
                        avatarUpPng: undefined,
                        avatarLeftPng: undefined,
                        avatarRightPng: undefined,
                      });
                      showQuickFeedback('🧹 Direções limpas (usando apenas o asset padrão).');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 border border-rose-500/30 text-rose-300 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                    title="Limpar os 4 sprites direcionais e voltar a usar só o PNG padrão"
                  >
                    <X className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                </>
              )}
            </div>

            {/* Seletor 1-Clique de Pastas já Importadas na Galeria ou Pasta Local Sincronizada */}
            {availableFolderPacks.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  defaultValue=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    handleApplyFolderPackFromGallery(e.target.value);
                    e.target.value = '';
                  }}
                  className="w-full bg-slate-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 text-[10.5px] text-amber-200 font-bold focus:outline-none focus:border-amber-400 cursor-pointer"
                >
                  <option value="">
                    ⚡ Aplicar Pasta já Importada na Galeria / Pasta Local ({availableFolderPacks.length} pastas)...
                  </option>
                  {availableFolderPacks.map((pack) => (
                    <option key={pack.key} value={pack.key}>
                      {pack.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Seletor 1-Clique para Espelhar de um Personagem do Roster */}
            {characters.length > 0 && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                <select
                  defaultValue=""
                  onChange={(e) => {
                    const char = characters.find((c) => c.id === e.target.value);
                    if (char) {
                      const patch = applyCharacterToExistingMarker(char, marker);
                      onUpdateMarker(marker.id, patch);
                      showQuickFeedback(
                        `👤 "${char.name}" aplicado com 4 Direções + Action NPC Passivo Procedural!`
                      );
                    }
                    e.target.value = '';
                  }}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[10px] text-slate-300 font-semibold focus:outline-none focus:border-purple-400 cursor-pointer"
                >
                  <option value="">👤 Usar Personagem da Galeria (4 Direções + Action Procedural)...</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({[c.avatarDownPng, c.avatarUpPng, c.avatarLeftPng, c.avatarRightPng].filter(Boolean).length || 1}/4 dir • {c.role || 'Action Passivo'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Preview Interativo da Direção Ativa + Testador 4 Botões */}
          <div className="p-2 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-11 h-11 rounded-lg bg-slate-900 border border-sky-500/40 flex items-center justify-center shrink-0 overflow-hidden p-1 relative">
                {resolvedPreview.png ? (
                  <img
                    src={resolvedPreview.png}
                    alt={marker.name}
                    className="w-full h-full object-contain transition-transform"
                    style={{
                      transform: resolvedPreview.autoMirrorX ? 'scaleX(-1)' : undefined,
                    }}
                  />
                ) : (
                  <Sparkles className="w-4 h-4 text-sky-400" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] font-bold text-slate-200 block truncate">
                  Testar Direção no Mapa:
                </span>
                <span className="text-[9px] text-sky-400 font-mono block">
                  {resolvedPreview.hasDedicatedDirectional
                    ? resolvedPreview.autoMirrorX
                      ? '🪞 Espelhado Automaticamente'
                      : '✅ Sprite Direcional Dedicado'
                    : '⚪ Usando Asset Base Padrão'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {DIRECTION_SLOTS.map((s) => {
                const isActive = activeFacing === s.dir;
                return (
                  <button
                    key={s.dir}
                    type="button"
                    onClick={() => applyDirectionalUpdates({ facingDirection: s.dir })}
                    className={`w-7 h-7 rounded-lg border text-xs flex items-center justify-center transition-all cursor-pointer ${
                      isActive
                        ? 'bg-sky-500 text-slate-950 border-sky-300 font-black shadow-sm scale-105'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={`Virar NPC para: ${s.label}`}
                  >
                    {s.emoji}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grade 2x2 das 4 Direções (Suporta Upload, Galeria e Drag-and-Drop para Trocar de Posição!) */}
          <div className="grid grid-cols-2 gap-2">
            {DIRECTION_SLOTS.map((slot) => {
              const directPng = getSlotPng(slot.dir);
              const oppositePng =
                slot.dir === 'left'
                  ? getSlotPng('right')
                  : slot.dir === 'right'
                  ? getSlotPng('left')
                  : undefined;
              const isAutoMirrored = !directPng && Boolean(oppositePng);

              return (
                <div
                  key={slot.dir}
                  draggable={Boolean(directPng)}
                  onDragStart={() => setDraggedSlotDir(slot.dir)}
                  onDragOver={(e) => {
                    e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (draggedSlotDir && draggedSlotDir !== slot.dir) {
                      handleSwapSlots(draggedSlotDir, slot.dir);
                      setDraggedSlotDir(null);
                      return;
                    }
                    if (e.dataTransfer.files && e.dataTransfer.files.length === 1) {
                      const file = e.dataTransfer.files[0];
                      readUploadedImage(file).then((res) => {
                        handleSetSingleSlot(slot.dir, res.dataUrl);
                        showQuickFeedback(`✅ ${slot.shortLabel} atualizado!`);
                      });
                    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 1) {
                      handleBatchFilesOrFolder(e.dataTransfer.files);
                    }
                  }}
                  className={`flex items-center gap-2 p-2 rounded-xl border transition-all ${
                    directPng
                      ? 'bg-slate-900/95 border-sky-500/40 hover:border-sky-400 cursor-grab active:cursor-grabbing'
                      : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                  }`}
                  title={
                    directPng
                      ? 'Arraste este card sobre outra direção para trocar os dois de lugar!'
                      : `Reconhece arquivos na pasta com: ${slot.hint}`
                  }
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800 overflow-hidden relative">
                    {directPng ? (
                      <img src={directPng} alt={slot.label} className="w-full h-full object-contain" />
                    ) : isAutoMirrored && oppositePng ? (
                      <img
                        src={oppositePng}
                        alt="Auto-Espelho"
                        className="w-full h-full object-contain opacity-55"
                        style={{ transform: 'scaleX(-1)' }}
                      />
                    ) : (
                      <>
                        {slot.dir === 'up' && <ArrowUp className="w-4 h-4 text-sky-400" />}
                        {slot.dir === 'down' && <ArrowDown className="w-4 h-4 text-sky-400" />}
                        {slot.dir === 'left' && <ArrowLeft className="w-4 h-4 text-sky-400" />}
                        {slot.dir === 'right' && <ArrowRight className="w-4 h-4 text-sky-400" />}
                      </>
                    )}
                    {isAutoMirrored && (
                      <span className="absolute bottom-0 inset-x-0 bg-amber-500/90 text-slate-950 text-[7px] font-black text-center leading-tight">
                        ESPELHO
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-slate-200 block truncate">
                      {slot.shortLabel}
                    </span>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUploadingSlot(slot.dir);
                          singleFileInputRef.current?.click();
                        }}
                        className="text-[9.5px] text-sky-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                      >
                        <Upload className="w-2.5 h-2.5" />
                        <span>{directPng ? 'Trocar' : 'PNG'}</span>
                      </button>
                      <span className="text-slate-600 text-[8px]">•</span>
                      <button
                        type="button"
                        onClick={() => setGalleryTargetSlot(slot.dir)}
                        className="text-[9.5px] text-amber-400 hover:underline flex items-center gap-0.5 cursor-pointer font-bold"
                      >
                        <FolderOpen className="w-2.5 h-2.5" />
                        <span>Galeria</span>
                      </button>
                    </div>
                  </div>

                  {directPng && (
                    <button
                      type="button"
                      onClick={() => handleSetSingleSlot(slot.dir, undefined)}
                      className="text-rose-400 hover:text-rose-300 p-1 cursor-pointer"
                      title="Remover este sprite direcional"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-[9.5px] text-slate-400 leading-relaxed">
            💡 <strong>Dica de Pasta:</strong> Nomeie os arquivos na pasta do NPC com{' '}
            <code className="text-sky-300">frente/baixo</code>,{' '}
            <code className="text-sky-300">costas/cima</code>,{' '}
            <code className="text-sky-300">esquerda</code> e{' '}
            <code className="text-sky-300">direita</code> (ou <code className="text-sky-300">down, up, left, right</code>).
            Se os nomes forem numéricos (1, 2, 3, 4), basta clicar em <strong>Girar Ordem</strong> ou arrastar um card sobre o outro para trocar!
          </p>
        </div>
      )}

      {/* Modal da Galeria para selecionar 1 direção específica */}
      <AssetGalleryModal
        isOpen={galleryTargetSlot !== null}
        onClose={() => setGalleryTargetSlot(null)}
        galleryAssets={galleryAssets}
        categories={galleryCategories}
        onUploadNewAsset={onUploadNewAsset}
        savedLevels={savedLevels}
        title={`Escolher Sprite (${galleryTargetSlot?.toUpperCase() || ''}) para "${marker.name}"`}
        subtitle="Selecione um PNG na galeria ou conecte sua pasta de NPCs"
        onSelectAsset={(dataUrl) => {
          if (galleryTargetSlot) {
            handleSetSingleSlot(galleryTargetSlot, dataUrl);
            showQuickFeedback(`✅ Direção ${galleryTargetSlot.toUpperCase()} definida pela Galeria!`);
          }
          setGalleryTargetSlot(null);
        }}
      />
    </div>
  );
};
