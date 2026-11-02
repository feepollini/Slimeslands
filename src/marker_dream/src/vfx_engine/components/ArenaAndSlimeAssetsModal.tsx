import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  FolderOpen,
  Grid,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Users,
  X,
  FlaskConical,
} from 'lucide-react';
import { VFX_PRESETS, VFX_TAGS } from '../vfx/presets';
import {
  clearPotionCustomAsset,
  getAllPotionConfigs,
  getPaintedPotionBottleDataUrl,
  registerPotionBatchFiles,
  registerPotionCustomAsset,
} from '../vfx/modules/potionAlchemyModule';
import {
  getPresetsForAllowedTags,
  getVisualsForClassTags,
  resolveEffectivePersonality,
} from '../vfx/modules/slimeActorModule';
import {
  ArenaBackgroundConfig,
  ArenaFloorPresetId,
  SlimeActor,
  SlimeDirection,
  SlimeDirectionalSprites,
  SlimePersonality,
  VfxTag,
} from '../vfx/types';

interface ArenaAndSlimeAssetsModalProps {
  isOpen: boolean;
  slimes: SlimeActor[];
  arenaBg: ArenaBackgroundConfig;
  onUpdateSlimeSprites: (
    slimeId: string,
    sprites: SlimeDirectionalSprites | undefined
  ) => void;
  onUpdateSlimeTagsAndMeta: (
    slimeId: string,
    updates: {
      allowedTags?: VfxTag[];
      name?: string;
      team?: 0 | 1;
      personality?: SlimePersonality;
    }
  ) => void;
  onCreateNewCharacter: (options: {
    name: string;
    team: 0 | 1;
    allowedTags: VfxTag[];
    personality?: SlimePersonality;
    customSprites?: SlimeDirectionalSprites;
  }) => void;
  onRemoveCharacter: (slimeId: string) => void;
  onUpdateArenaBg: (nextBg: ArenaBackgroundConfig) => void;
  onClose: () => void;
}

const PERSONALITY_OPTIONS: Array<{
  id: SlimePersonality;
  label: string;
  desc: string;
}> = [
  {
    id: 'auto',
    label: 'Auto (Pela Tag)',
    desc: 'Define automaticamente a personalidade pelas tags (ex: Flecheiro -> Kiter, Invocador -> Enxame).',
  },
  {
    id: 'flecheiro_kiter',
    label: '🏹 Flecheiro Kiter (Posiciona → Atira → Recua)',
    desc: 'Posiciona, dispara e reposiciona; se o inimigo vier na direção dele, corre até ganhar distância segura e atira!',
  },
  {
    id: 'invocador_enxame',
    label: '🐝 Invocador de Enxame (Tático à Distância)',
    desc: 'Mantém distância segura, foge de investidas e invoca enxames de insetos, colmeias e escaravelhos.',
  },
  {
    id: 'mago_artilheiro',
    label: '✨ Mago Artilheiro (Longo Alcance)',
    desc: 'Mantém espaçamento de artilharia, recua se pressionado e alterna posicionamento com magias pesadas.',
  },
  {
    id: 'assassino_flanco',
    label: '🗡️ Assassino Hit & Run (Flanqueador)',
    desc: 'Avança rapidamente quando as skills estão prontas para atacar e recua enquanto recarrega.',
  },
  {
    id: 'berserker_frontal',
    label: '🔥 Berserker Linha de Frente',
    desc: 'Avança agressivamente para cima dos arqueiros e magos inimigos tentando encurtar distância.',
  },
];

const DIRECTION_META: Array<{
  dir: SlimeDirection;
  label: string;
  short: string;
  hint: string;
}> = [
  { dir: 'up', label: 'Cima (Norte)', short: 'CIMA', hint: 'up / cima / north / back' },
  { dir: 'down', label: 'Baixo (Sul)', short: 'BAIXO', hint: 'down / baixo / south / front' },
  { dir: 'left', label: 'Esquerda (Oeste)', short: 'ESQ', hint: 'left / esq / west' },
  { dir: 'right', label: 'Direita (Leste)', short: 'DIR', hint: 'right / dir / east' },
];

const ARENA_FLOOR_PRESETS: Array<{
  id: ArenaFloorPresetId;
  name: string;
  desc: string;
  swatch: string;
}> = [
  {
    id: 'obsidian_grid',
    name: 'Obsidiana Tática',
    desc: 'Piso escuro de alto contraste ideal para leitura de shaders e partículas.',
    swatch: 'linear-gradient(135deg, #101522 0%, #04060A 100%)',
  },
  {
    id: 'magma_colosseum',
    name: 'Coliseu de Magma',
    desc: 'Cratera vulcânica com fissuras térmicas e iluminação âmbar subterrânea.',
    swatch: 'linear-gradient(135deg, #451208 0%, #120402 100%)',
  },
  {
    id: 'glacial_sanctuary',
    name: 'Santuário Glacial',
    desc: 'Permafrost cristalino com refração azul-celeste e escarcha profunda.',
    swatch: 'linear-gradient(135deg, #0E3452 0%, #030911 100%)',
  },
  {
    id: 'chemtech_lab',
    name: 'Laboratório Quimtec',
    desc: 'Câmara industrial com poças cáusticas radioativas em verde-néon.',
    swatch: 'linear-gradient(135deg, #0F3822 0%, #020805 100%)',
  },
  {
    id: 'eden_courtyard',
    name: 'Jardim Bioluminescente',
    desc: 'Santuário botânico esmeralda com ondas harmônicas aquáticas.',
    swatch: 'linear-gradient(135deg, #163826 0%, #040906 100%)',
  },
  {
    id: 'checker_void',
    name: 'Vazio Xadrez (QA)',
    desc: 'Malha quadriculada de calibração de escala, paralaxe e alcance.',
    swatch: 'linear-gradient(135deg, #252538 0%, #08080E 100%)',
  },
];

function loadFileAsImage(file: File): Promise<{ img: HTMLImageElement; url: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = (err) => reject(err);
    img.src = url;
  });
}

/**
 * Matches a filename to a cardinal movement direction ('up' | 'down' | 'left' | 'right')
 */
function detectDirectionFromFilename(filename: string): SlimeDirection | null {
  const base = filename
    .toLowerCase()
    .replace(/\.[^/.]+$/, '')
    .trim();

  if (/(^|[_\-\s])(up|north|cima|costas|back|top|norte|u|n)($|[_\-\s\d])/i.test(base)) {
    return 'up';
  }
  if (/(^|[_\-\s])(down|south|baixo|frente|front|bottom|sul|d|s)($|[_\-\s\d])/i.test(base)) {
    return 'down';
  }
  if (/(^|[_\-\s])(left|west|esquerda|esq|oeste|l|w)($|[_\-\s\d])/i.test(base)) {
    return 'left';
  }
  if (/(^|[_\-\s])(right|east|direita|dir|leste|r|e)($|[_\-\s\d])/i.test(base)) {
    return 'right';
  }

  if (
    base.includes('up') ||
    base.includes('cima') ||
    base.includes('back') ||
    base.includes('costas') ||
    base.includes('north')
  ) {
    return 'up';
  }
  if (
    base.includes('down') ||
    base.includes('baixo') ||
    base.includes('front') ||
    base.includes('frente') ||
    base.includes('south')
  ) {
    return 'down';
  }
  if (base.includes('left') || base.includes('esq') || base.includes('west')) {
    return 'left';
  }
  if (base.includes('right') || base.includes('dir') || base.includes('east')) {
    return 'right';
  }

  return null;
}

/**
 * Builds a 4-directional sprite set from an array of image Files belonging to a single folder
 */
async function buildDirectionalSpritesFromFiles(
  imageFiles: File[],
  folderName: string,
  existingSprites?: SlimeDirectionalSprites
): Promise<SlimeDirectionalSprites> {
  const nextSprites: SlimeDirectionalSprites = {
    ...(existingSprites || {}),
    scale: existingSprites?.scale ?? 1.25,
    folderName: folderName || `${imageFiles.length} PNGs`,
  };

  const assignedDirs = new Set<SlimeDirection>();
  const unmatchedFiles: File[] = [];

  for (const file of imageFiles) {
    const detected = detectDirectionFromFilename(file.name);
    if (detected && !assignedDirs.has(detected)) {
      assignedDirs.add(detected);
      const { img, url } = await loadFileAsImage(file);
      if (detected === 'up') {
        nextSprites.up = img;
        nextSprites.upUrl = url;
      } else if (detected === 'down') {
        nextSprites.down = img;
        nextSprites.downUrl = url;
      } else if (detected === 'left') {
        nextSprites.left = img;
        nextSprites.leftUrl = url;
      } else if (detected === 'right') {
        nextSprites.right = img;
        nextSprites.rightUrl = url;
      }
    } else {
      unmatchedFiles.push(file);
    }
  }

  unmatchedFiles.sort((a, b) => a.name.localeCompare(b.name));
  const fallbackOrder: SlimeDirection[] = ['down', 'left', 'right', 'up'];
  for (const file of unmatchedFiles) {
    const nextDir = fallbackOrder.find((d) => !assignedDirs.has(d));
    if (!nextDir) break;
    assignedDirs.add(nextDir);
    const { img, url } = await loadFileAsImage(file);
    if (nextDir === 'up') {
      nextSprites.up = img;
      nextSprites.upUrl = url;
    } else if (nextDir === 'down') {
      nextSprites.down = img;
      nextSprites.downUrl = url;
    } else if (nextDir === 'left') {
      nextSprites.left = img;
      nextSprites.leftUrl = url;
    } else if (nextDir === 'right') {
      nextSprites.right = img;
      nextSprites.rightUrl = url;
    }
  }

  return nextSprites;
}

/**
 * Groups files from a single folder, a parent folder with multiple subfolders,
 * or multiple dragged-and-dropped folders into distinct character folder buckets!
 */
function groupFilesByCharacterFolder(
  items: Array<{ file: File; relPath: string }>
): Array<{ folderName: string; files: File[] }> {
  const imageItems = items.filter((it) =>
    /\.(png|webp|gif|jpg|jpeg)$/i.test(it.file.name)
  );
  const map = new Map<string, { folderName: string; files: File[] }>();

  for (const it of imageItems) {
    const cleanPath = it.relPath.replace(/\\/g, '/');
    const parts = cleanPath.split('/').filter(Boolean);
    // Remove filename
    parts.pop();
    const folderKey = parts.length > 0 ? parts.join('/') : 'Personagem_Importado';
    const folderName = parts.length > 0 ? parts[parts.length - 1] : it.file.name.replace(/\.[^/.]+$/, '');

    let group = map.get(folderKey);
    if (!group) {
      group = { folderName, files: [] };
      map.set(folderKey, group);
    }
    group.files.push(it.file);
  }

  return Array.from(map.values()).filter((g) => g.files.length > 0);
}

/**
 * Reads all files recursively from dragged-and-dropped folders (supports dropping 1 or 20 folders at once!)
 */
async function readDroppedEntries(
  dataTransfer: DataTransfer
): Promise<Array<{ file: File; relPath: string }>> {
  const results: Array<{ file: File; relPath: string }> = [];

  const traverseEntry = async (entry: any, pathPrefix: string): Promise<void> => {
    if (!entry) return;
    if (entry.isFile) {
      await new Promise<void>((resolve) => {
        entry.file(
          (file: File) => {
            results.push({ file, relPath: `${pathPrefix}${file.name}` });
            resolve();
          },
          () => resolve()
        );
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const readAllBatch = async (): Promise<any[]> => {
        const batch: any[] = await new Promise((resolve) => {
          reader.readEntries(
            (entries: any[]) => resolve(entries || []),
            () => resolve([])
          );
        });
        if (batch.length === 0) return [];
        const rest = await readAllBatch();
        return [...batch, ...rest];
      };
      const children = await readAllBatch();
      for (const child of children) {
        await traverseEntry(child, `${pathPrefix}${entry.name}/`);
      }
    }
  };

  if (dataTransfer.items && dataTransfer.items.length > 0) {
    const entries: any[] = [];
    for (let i = 0; i < dataTransfer.items.length; i++) {
      const item = dataTransfer.items[i] as any;
      const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
      if (entry) entries.push(entry);
    }
    if (entries.length > 0) {
      for (const entry of entries) {
        await traverseEntry(entry, '');
      }
      return results;
    }
  }

  // Fallback to standard FileList
  for (let i = 0; i < dataTransfer.files.length; i++) {
    const f = dataTransfer.files[i] as File & { webkitRelativePath?: string };
    results.push({ file: f, relPath: f.webkitRelativePath || f.name });
  }
  return results;
}

/**
 * Infers tags and personality from a folder name if possible, otherwise falls back to defaults
 */
function inferTagsFromFolderName(
  folderName: string,
  fallbackTags: VfxTag[]
): VfxTag[] {
  const lower = folderName.toLowerCase();
  const matched: VfxTag[] = [];

  const keywordMap: Array<{ tag: VfxTag; keys: string[] }> = [
    { tag: 'flecheiro', keys: ['flech', 'arch', 'arco', 'bow', 'ranger', 'sniper', 'atirador', 'cacador', 'hunter'] },
    { tag: 'invocador', keys: ['invoc', 'summon', 'enxame', 'swarm', 'inseto', 'bug', 'hive', 'colmeia', 'scarab'] },
    { tag: 'fogo', keys: ['fogo', 'fire', 'ignis', 'magma', 'pyro', 'chama', 'lava'] },
    { tag: 'agua', keys: ['agua', 'water', 'hydro', 'aqua', 'mar', 'ocean'] },
    { tag: 'gelo', keys: ['gelo', 'ice', 'cryo', 'frost', 'neve', 'glacial'] },
    { tag: 'terra', keys: ['terra', 'earth', 'rock', 'pedra', 'geo', 'rocha'] },
    { tag: 'ar', keys: ['ar', 'wind', 'vento', 'aero', 'tempest', 'storm'] },
    { tag: 'planta', keys: ['planta', 'plant', 'nature', 'flora', 'eden', 'folha', 'silvestre'] },
    { tag: 'luz', keys: ['luz', 'light', 'solar', 'holy', 'celest', 'seraph', 'sol'] },
    { tag: 'energia', keys: ['energia', 'energy', 'tesla', 'raio', 'thunder', 'volt', 'shock'] },
    { tag: 'magia', keys: ['magia', 'magic', 'arcane', 'arcano', 'mage', 'mago'] },
    { tag: 'trevas', keys: ['trevas', 'dark', 'void', 'vazio', 'shadow', 'sombra', 'abismo'] },
    { tag: 'toxico', keys: ['toxico', 'toxic', 'poison', 'veneno', 'acid', 'acido', 'necro'] },
    { tag: 'cura', keys: ['cura', 'heal', 'vida', 'cleric', 'sacerdote'] },
    { tag: 'buffs', keys: ['buff', 'escudo', 'shield', 'tank', 'guard'] },
  ];

  for (const item of keywordMap) {
    if (item.keys.some((k) => lower.includes(k))) {
      matched.push(item.tag);
    }
  }

  return matched.length > 0 ? matched : fallbackTags.length > 0 ? [...fallbackTags] : ['fogo'];
}

/**
 * Generates a clean, well-proportioned 4-directional sprite sheet set (with zero sideways distortion)
 */
function createDemoDirectionalSprites(
  primaryColor: string,
  coreColor: string,
  darkColor: string
): Promise<SlimeDirectionalSprites> {
  const dirs: SlimeDirection[] = ['up', 'down', 'left', 'right'];
  const result: SlimeDirectionalSprites = {
    scale: 1.25,
    folderName: 'Kit_4Dir_Gerado',
  };

  const promises = dirs.map(
    (dir) =>
      new Promise<void>((resolve) => {
        const c = document.createElement('canvas');
        c.width = 128;
        c.height = 128;
        const ctx = c.getContext('2d')!;
        const cx = 64;
        const cy = 72;

        ctx.save();
        ctx.translate(cx, cy);

        // Symmetrical armored body silhouette in all 4 directions (no weird sideways triangle!)
        ctx.fillStyle = darkColor;
        ctx.strokeStyle = primaryColor;
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(0, -8, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        const grad = ctx.createRadialGradient(0, -16, 6, 0, -8, 36);
        grad.addColorStop(0, coreColor);
        grad.addColorStop(0.58, primaryColor);
        grad.addColorStop(1, darkColor);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, -8, 33, 0, Math.PI * 2);
        ctx.fill();

        // Crown / Helmet Crest
        ctx.fillStyle = '#FFD747';
        ctx.beginPath();
        ctx.moveTo(0, -52);
        ctx.lineTo(11, -36);
        ctx.lineTo(0, -30);
        ctx.lineTo(-11, -36);
        ctx.closePath();
        ctx.fill();

        if (dir === 'up') {
          // Back emblem rune
          ctx.strokeStyle = coreColor;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(0, -8, 13, 0, Math.PI * 2);
          ctx.stroke();
        } else if (dir === 'down') {
          // Front 2 eyes
          [-11, 11].forEach((ox) => {
            ctx.fillStyle = '#090D16';
            ctx.beginPath();
            ctx.ellipse(ox, -7, 5.5, 7, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ox - 1.5, -9, 2.4, 0, Math.PI * 2);
            ctx.fill();
          });
        } else {
          // Clean side-facing eyes & visor (shifted toward movement direction)
          const sign = dir === 'right' ? 1 : -1;
          [sign * 6, sign * 19].forEach((ox, idx) => {
            ctx.fillStyle = '#090D16';
            ctx.beginPath();
            ctx.ellipse(ox, -7, idx === 0 ? 4.5 : 5.2, 6.8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(ox + sign * 1.2, -9, 2.2, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        ctx.restore();

        const dataUrl = c.toDataURL('image/png');
        const img = new Image();
        img.onload = () => {
          if (dir === 'up') {
            result.up = img;
            result.upUrl = dataUrl;
          } else if (dir === 'down') {
            result.down = img;
            result.downUrl = dataUrl;
          } else if (dir === 'left') {
            result.left = img;
            result.leftUrl = dataUrl;
          } else {
            result.right = img;
            result.rightUrl = dataUrl;
          }
          resolve();
        };
        img.src = dataUrl;
      })
  );

  return Promise.all(promises).then(() => result);
}

export const ArenaAndSlimeAssetsModal: React.FC<ArenaAndSlimeAssetsModalProps> = ({
  isOpen,
  slimes,
  arenaBg,
  onUpdateSlimeSprites,
  onUpdateSlimeTagsAndMeta,
  onCreateNewCharacter,
  onRemoveCharacter,
  onUpdateArenaBg,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'slimes' | 'arena' | 'potions'>('slimes');
  const [newCharName, setNewCharName] = useState<string>('');
  const [newCharTeam, setNewCharTeam] = useState<0 | 1>(0);
  const [newCharTags, setNewCharTags] = useState<VfxTag[]>(['flecheiro', 'ar']);
  const [newCharPersonality, setNewCharPersonality] =
    useState<SlimePersonality>('auto');
  const [batchMode, setBatchMode] = useState<'create_new' | 'replace_existing'>(
    'create_new'
  );
  const [importStatusMsg, setImportStatusMsg] = useState<string>('');
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [, setTick] = useState(0);

  if (!isOpen) return null;

  const forceRefresh = () => setTick((t) => t + 1);

  const toggleNewCharTag = (tag: VfxTag) => {
    setNewCharTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  /**
   * Processes 1 or multiple character folders at once!
   */
  const processGroupedCharacterFolders = async (
    groups: Array<{ folderName: string; files: File[] }>,
    modeOverride?: 'create_new' | 'replace_existing'
  ) => {
    if (groups.length === 0) return;
    const effectiveMode = modeOverride || batchMode;

    for (let i = 0; i < groups.length; i++) {
      const grp = groups[i];
      const sprites = await buildDirectionalSpritesFromFiles(
        grp.files,
        grp.folderName
      );
      const inferredTags = inferTagsFromFolderName(grp.folderName, newCharTags);
      const cleanName =
        groups.length === 1 && newCharName.trim()
          ? newCharName.trim()
          : grp.folderName.replace(/[_\-]+/g, ' ').trim() ||
            `PERSONAGEM-${slimes.length + i + 1}`;

      if (effectiveMode === 'replace_existing' && i < slimes.length) {
        const targetSlime = slimes[i];
        onUpdateSlimeSprites(targetSlime.id, sprites);
        onUpdateSlimeTagsAndMeta(targetSlime.id, {
          name: cleanName,
          allowedTags: inferredTags,
          personality: newCharPersonality,
        });
      } else {
        const assignedTeam: 0 | 1 =
          groups.length > 1 ? ((i % 2) as 0 | 1) : newCharTeam;
        onCreateNewCharacter({
          name: cleanName,
          team: assignedTeam,
          allowedTags: inferredTags,
          personality: newCharPersonality,
          customSprites: sprites,
        });
      }
    }

    setNewCharName('');
    setImportStatusMsg(
      `${groups.length} pasta(s) de personagem importada(s) com sucesso: ${groups
        .map((g) => g.folderName)
        .join(', ')}`
    );
    forceRefresh();
  };

  const handleMultiFolderInput = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const items = Array.from(fileList).map((file) => ({
      file,
      relPath:
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ||
        file.name,
    }));
    const groups = groupFilesByCharacterFolder(items);
    await processGroupedCharacterFolders(groups);
  };

  const handleDropMultiFolders = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const items = await readDroppedEntries(e.dataTransfer);
    const groups = groupFilesByCharacterFolder(items);
    await processGroupedCharacterFolders(groups);
  };

  const handleCreateWithGeneratedDemo = async () => {
    const vis = getVisualsForClassTags(newCharTags);
    const demoSprites = await createDemoDirectionalSprites(
      vis.color,
      vis.coreColor,
      vis.darkColor
    );
    const tagSuffix =
      newCharTags.length > 0 ? newCharTags[0].toUpperCase() : 'ARCANE';
    const finalName =
      newCharName.trim() || `${tagSuffix}-${slimes.length + 1}`;

    onCreateNewCharacter({
      name: finalName,
      team: newCharTeam,
      allowedTags: [...newCharTags],
      personality: newCharPersonality,
      customSprites: demoSprites,
    });
    setNewCharName('');
    forceRefresh();
  };

  const handleFolderOrMultiImportForSingleSlime = async (
    slime: SlimeActor,
    fileList: FileList | null
  ) => {
    if (!fileList || fileList.length === 0) return;
    const imageFiles = Array.from(fileList).filter((f) =>
      /\.(png|webp|gif|jpg|jpeg)$/i.test(f.name)
    );
    if (imageFiles.length === 0) return;
    const firstRel =
      (imageFiles[0] as File & { webkitRelativePath?: string })
        .webkitRelativePath || '';
    const folderName = firstRel.includes('/')
      ? firstRel.split('/')[0]
      : slime.name;
    const sprites = await buildDirectionalSpritesFromFiles(
      imageFiles,
      folderName,
      slime.customSprites
    );
    onUpdateSlimeSprites(slime.id, sprites);
    forceRefresh();
  };

  const handleSingleDirectionUpload = async (
    slime: SlimeActor,
    dir: SlimeDirection,
    file: File | undefined
  ) => {
    if (!file) return;
    const { img, url } = await loadFileAsImage(file);
    const nextSprites: SlimeDirectionalSprites = {
      ...(slime.customSprites || {}),
      scale: slime.customSprites?.scale ?? 1.25,
    };
    if (dir === 'up') {
      nextSprites.up = img;
      nextSprites.upUrl = url;
    } else if (dir === 'down') {
      nextSprites.down = img;
      nextSprites.downUrl = url;
    } else if (dir === 'left') {
      nextSprites.left = img;
      nextSprites.leftUrl = url;
    } else {
      nextSprites.right = img;
      nextSprites.rightUrl = url;
    }
    onUpdateSlimeSprites(slime.id, nextSprites);
    forceRefresh();
  };

  const toggleCharacterTag = (slime: SlimeActor, tag: VfxTag) => {
    const current = slime.allowedTags || [];
    const exists = current.includes(tag);
    const next = exists ? current.filter((t) => t !== tag) : [...current, tag];
    onUpdateSlimeTagsAndMeta(slime.id, { allowedTags: next });
    forceRefresh();
  };

  const handleArenaImageUpload = async (file: File | undefined) => {
    if (!file) return;
    const { img, url } = await loadFileAsImage(file);
    onUpdateArenaBg({
      ...arenaBg,
      customImage: img,
      customImageUrl: url,
      customImageName: file.name,
    });
  };

  const newCharMatchingSpells = getPresetsForAllowedTags(newCharTags);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3">
      <div className="w-full max-w-6xl bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-900/75">
          <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 rounded">
              {slimes.length} Personagens na Arena
            </span>
            <h2 className="text-sm font-bold tracking-wide text-white uppercase">
              Importar Múltiplas Pastas de Personagens (4 PNGs), Personalidades (Flecheiro/Invocador) & Fundo
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-5 pt-2.5 border-b border-slate-800 bg-slate-900/40">
          <button
            onClick={() => setActiveTab('slimes')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase border-b-2 transition cursor-pointer ${
              activeTab === 'slimes'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            1. Personagens ({slimes.length}), Importar Múltiplas Pastas & Personalidades IA
          </button>
          <button
            onClick={() => setActiveTab('arena')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase border-b-2 transition cursor-pointer ${
              activeTab === 'arena'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            2. Fundo da Arena (Imagem Customizada & Biomas)
          </button>
          <button
            onClick={() => setActiveTab('potions')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-mono font-bold uppercase border-b-2 transition cursor-pointer ${
              activeTab === 'potions'
                ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            3. Poções Arremessáveis (10 Skills de Alquimia & Assets)
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'slimes' ? (
            <>
              {/* MULTI-FOLDER BATCH IMPORTER & CHARACTER CREATOR */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingOver(true);
                }}
                onDragLeave={() => setIsDraggingOver(false)}
                onDrop={handleDropMultiFolders}
                className={`border-2 border-dashed rounded-lg p-3.5 space-y-3 transition ${
                  isDraggingOver
                    ? 'bg-sky-950/60 border-sky-400 shadow-xl'
                    : 'bg-slate-900/95 border-sky-500/50 shadow-lg'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-mono font-bold uppercase text-emerald-300">
                      Importação Simples de Múltiplas Pastas (Arraste Várias Pastas Aqui ou Selecione Pasta Mãe)
                    </span>
                  </div>

                  {/* Mode Switch: Create New vs Replace Existing */}
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800">
                    <button
                      onClick={() => setBatchMode('create_new')}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded cursor-pointer ${
                        batchMode === 'create_new'
                          ? 'bg-emerald-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      + Criar Novos (1 por Pasta)
                    </button>
                    <button
                      onClick={() => setBatchMode('replace_existing')}
                      className={`px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded cursor-pointer ${
                        batchMode === 'replace_existing'
                          ? 'bg-sky-500 text-slate-950'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Substituir Atuais em Sequência
                    </button>
                  </div>
                </div>

                {importStatusMsg && (
                  <div className="px-3 py-1.5 bg-emerald-950/70 border border-emerald-500/50 rounded text-[11px] font-mono text-emerald-300">
                    ✓ {importStatusMsg}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
                  {/* Name, Team & Personality */}
                  <div className="md:col-span-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newCharName}
                        onChange={(e) => setNewCharName(e.target.value)}
                        placeholder="Nome (vazio = usa o nome de cada pasta)..."
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-400 rounded px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                      />
                      <div className="flex rounded border border-slate-800 overflow-hidden shrink-0">
                        <button
                          onClick={() => setNewCharTeam(0)}
                          className={`px-2 py-1.5 text-[10px] font-mono font-bold uppercase cursor-pointer ${
                            newCharTeam === 0
                              ? 'bg-sky-500 text-slate-950'
                              : 'bg-slate-950 text-slate-400'
                          }`}
                        >
                          Time Azul
                        </button>
                        <button
                          onClick={() => setNewCharTeam(1)}
                          className={`px-2 py-1.5 text-[10px] font-mono font-bold uppercase cursor-pointer ${
                            newCharTeam === 1
                              ? 'bg-rose-500 text-slate-950'
                              : 'bg-slate-950 text-slate-400'
                          }`}
                        >
                          Time Rubro
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold uppercase text-sky-400 whitespace-nowrap">
                        Personalidade IA:
                      </span>
                      <select
                        value={newCharPersonality}
                        onChange={(e) =>
                          setNewCharPersonality(e.target.value as SlimePersonality)
                        }
                        className="flex-1 bg-slate-950 border border-slate-800 focus:border-sky-400 rounded px-2 py-1 text-[11px] font-mono text-white outline-none"
                      >
                        {PERSONALITY_OPTIONS.map((po) => (
                          <option key={po.id} value={po.id}>
                            {po.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Default Class Tags */}
                  <div className="md:col-span-4 flex flex-wrap items-center gap-1">
                    <span className="text-[10px] font-mono font-bold text-slate-400 uppercase mr-1">
                      Tags Padrão ({newCharMatchingSpells.length} skills):
                    </span>
                    {VFX_TAGS.map((t) => {
                      const active = newCharTags.includes(t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleNewCharTag(t.id)}
                          className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded border transition cursor-pointer ${
                            active
                              ? 'bg-amber-500 text-slate-950 border-amber-300'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          {t.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Multi-Folder Action Buttons */}
                  <div className="md:col-span-3 flex flex-col gap-1.5">
                    <label
                      className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-[11px] uppercase rounded transition cursor-pointer shadow"
                      title="Selecione uma pasta de personagem (4 PNGs) OU uma Pasta Mãe contendo várias subpastas de personagens para importar todos de uma só vez!"
                    >
                      <FolderOpen className="w-4 h-4 shrink-0" />
                      <span>Selecionar Pasta(s) / Pasta Mãe</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        {...({ webkitdirectory: '', directory: '' } as any)}
                        onChange={(e) => {
                          handleMultiFolderInput(e.target.files);
                          e.target.value = '';
                        }}
                        className="hidden"
                      />
                    </label>

                    <button
                      onClick={handleCreateWithGeneratedDemo}
                      className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/50 text-sky-300 font-mono font-bold text-[10px] uppercase rounded transition cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      + Criar Personagem Rápido
                    </button>
                  </div>
                </div>
              </div>

              {/* ALL ACTIVE CHARACTERS IN THE ARENA */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {slimes.map((slime, idx) => {
                  const cs = slime.customSprites;
                  const hasCustom = Boolean(
                    cs && (cs.up || cs.down || cs.left || cs.right)
                  );
                  const curScale = cs?.scale ?? 1.25;
                  const activeTags = slime.allowedTags || [];
                  const matchingSpells = getPresetsForAllowedTags(activeTags);
                  const effPersonality = resolveEffectivePersonality(slime);

                  return (
                    <div
                      key={slime.id}
                      className="bg-slate-900/85 border border-slate-800 rounded-lg p-3.5 flex flex-col gap-2.5"
                    >
                      {/* Slime Identity, Team Switch & Delete Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-4 h-4 rounded-full border border-white/40 shrink-0"
                            style={{
                              background: `radial-gradient(circle at 35% 35%, ${slime.coreColor}, ${slime.color})`,
                            }}
                          />
                          <input
                            type="text"
                            value={slime.name}
                            onChange={(e) => {
                              onUpdateSlimeTagsAndMeta(slime.id, {
                                name: e.target.value,
                              });
                              forceRefresh();
                            }}
                            className="bg-slate-950/80 border border-slate-800 focus:border-sky-400 rounded px-2 py-0.5 font-mono font-bold text-xs text-white w-36 outline-none"
                          />
                          <button
                            onClick={() => {
                              onUpdateSlimeTagsAndMeta(slime.id, {
                                team: slime.team === 0 ? 1 : 0,
                              });
                              forceRefresh();
                            }}
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded cursor-pointer ${
                              slime.team === 0
                                ? 'bg-sky-500/20 border border-sky-500/50 text-sky-300'
                                : 'bg-rose-500/20 border border-rose-500/50 text-rose-300'
                            }`}
                          >
                            {slime.team === 0 ? 'Time Azul' : 'Time Rubro'}
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 text-[10px] font-mono text-emerald-300 bg-emerald-950/60 border border-emerald-700/40 rounded">
                            {matchingSpells.length} magias
                          </span>

                          {slimes.length > 2 && (
                            <button
                              onClick={() => {
                                onRemoveCharacter(slime.id);
                                forceRefresh();
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 hover:bg-rose-950/50 rounded cursor-pointer"
                              title="Remover personagem da arena"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* PERSONALITY SELECTOR (KITER ARCHER / SWARM SUMMONER / ARTILLERY / BERSERKER) */}
                      <div className="flex items-center gap-2 bg-slate-950/90 border border-slate-800/90 rounded px-2.5 py-1.5">
                        <span className="text-[10px] font-mono font-bold uppercase text-sky-400 whitespace-nowrap">
                          Comportamento IA:
                        </span>
                        <select
                          value={slime.personality || 'auto'}
                          onChange={(e) => {
                            onUpdateSlimeTagsAndMeta(slime.id, {
                              personality: e.target.value as SlimePersonality,
                            });
                            forceRefresh();
                          }}
                          className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-[10px] font-mono text-white outline-none"
                        >
                          {PERSONALITY_OPTIONS.map((po) => (
                            <option key={po.id} value={po.id}>
                              {po.label}
                            </option>
                          ))}
                        </select>
                        <span className="text-[9px] font-mono text-emerald-400 uppercase whitespace-nowrap">
                          Ativo: {effPersonality.replace('_', ' ')}
                        </span>
                      </div>

                      {/* CLASS TAG FILTER BAR */}
                      <div className="bg-slate-950/80 border border-slate-800/90 rounded p-2 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1 text-[10px] font-mono font-bold uppercase text-amber-400">
                            <Tag className="w-3 h-3" />
                            Tags da Classe (Usa somente as tags marcadas):
                          </span>
                          <button
                            onClick={() => {
                              onUpdateSlimeTagsAndMeta(slime.id, {
                                allowedTags: [],
                              });
                              forceRefresh();
                            }}
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded cursor-pointer ${
                              activeTags.length === 0
                                ? 'bg-sky-500 text-slate-950 font-bold'
                                : 'bg-slate-900 text-slate-400 hover:text-white'
                            }`}
                          >
                            Todas ({VFX_PRESETS.length})
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {VFX_TAGS.map((t) => {
                            const isSelected = activeTags.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                onClick={() => toggleCharacterTag(slime, t.id)}
                                onDoubleClick={() => {
                                  onUpdateSlimeTagsAndMeta(slime.id, {
                                    allowedTags: [t.id],
                                  });
                                  forceRefresh();
                                }}
                                className={`px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase rounded border transition cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-sm'
                                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                }`}
                                title={`Clique para ativar/desativar ${t.label} (Duplo clique: usar SOMENTE ${t.label})`}
                              >
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Folder Import & Quick Actions Row */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <label className="flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono font-bold text-[10px] uppercase rounded transition cursor-pointer shadow">
                          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                          <span>Importar Pasta (4 PNGs)</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            {...({ webkitdirectory: '', directory: '' } as any)}
                            onChange={(e) => {
                              handleFolderOrMultiImportForSingleSlime(
                                slime,
                                e.target.files
                              );
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>

                        <label
                          className="flex items-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono text-[10px] uppercase rounded transition cursor-pointer"
                          title="Selecionar os 4 arquivos PNG diretamente"
                        >
                          <Upload className="w-3 h-3" />
                          <span>4 PNGs</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={(e) => {
                              handleFolderOrMultiImportForSingleSlime(
                                slime,
                                e.target.files
                              );
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                        </label>

                        <button
                          onClick={async () => {
                            const demo = await createDemoDirectionalSprites(
                              slime.color,
                              slime.coreColor,
                              slime.darkColor
                            );
                            onUpdateSlimeSprites(slime.id, demo);
                            forceRefresh();
                          }}
                          className="flex items-center gap-1 px-2 py-1.5 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/60 text-purple-200 font-mono text-[10px] uppercase rounded transition cursor-pointer"
                        >
                          <Sparkles className="w-3 h-3 text-purple-300" />
                          Kit 4-Dir
                        </button>

                        {hasCustom && (
                          <button
                            onClick={() => {
                              onUpdateSlimeSprites(slime.id, undefined);
                              forceRefresh();
                            }}
                            className="p-1.5 bg-rose-950/80 hover:bg-rose-900 border border-rose-700/60 text-rose-300 rounded cursor-pointer"
                            title="Restaurar Slime Procedural"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* 4 Directional PNG Slots (Up, Down, Left, Right) */}
                      <div className="grid grid-cols-4 gap-1.5">
                        {DIRECTION_META.map((d) => {
                          const url =
                            d.dir === 'up'
                              ? cs?.upUrl
                              : d.dir === 'down'
                              ? cs?.downUrl
                              : d.dir === 'left'
                              ? cs?.leftUrl
                              : cs?.rightUrl;

                          const isCurrentDir = (slime.moveDirection || 'down') === d.dir;

                          return (
                            <label
                              key={d.dir}
                              className={`group relative flex flex-col items-center justify-between p-1.5 rounded border transition cursor-pointer ${
                                isCurrentDir
                                  ? 'bg-sky-950/40 border-sky-500/70'
                                  : 'bg-slate-950/90 border-slate-800 hover:border-slate-600'
                              }`}
                              title={`Clique para trocar o PNG da direção ${d.label} (${d.hint})`}
                            >
                              <div className="flex items-center gap-0.5 text-[8px] font-mono font-bold text-slate-300 uppercase">
                                {d.dir === 'up' && <ArrowUp className="w-2.5 h-2.5 text-sky-400" />}
                                {d.dir === 'down' && (
                                  <ArrowDown className="w-2.5 h-2.5 text-sky-400" />
                                )}
                                {d.dir === 'left' && (
                                  <ArrowLeft className="w-2.5 h-2.5 text-sky-400" />
                                )}
                                {d.dir === 'right' && (
                                  <ArrowRight className="w-2.5 h-2.5 text-sky-400" />
                                )}
                                <span>{d.short}</span>
                              </div>

                              <div className="w-12 h-12 my-0.5 flex items-center justify-center bg-slate-900/90 rounded border border-slate-800/80 overflow-hidden">
                                {url ? (
                                  <img
                                    src={url}
                                    alt={`${slime.name} ${d.dir}`}
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <span className="text-[8px] font-mono text-slate-500 text-center px-1">
                                    PNG {d.short}
                                  </span>
                                )}
                              </div>

                              <span className="text-[8px] font-mono text-sky-400 group-hover:underline">
                                {url ? 'Trocar' : '+ PNG'}
                              </span>

                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                  handleSingleDirectionUpload(
                                    slime,
                                    d.dir,
                                    e.target.files?.[0]
                                  );
                                  e.target.value = '';
                                }}
                                className="hidden"
                              />
                            </label>
                          );
                        })}
                      </div>

                      {/* Sprite Scale Slider (Default 1.25x, up to 3.5x) */}
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">
                          Tamanho PNG (#{idx + 1}):
                        </span>
                        <input
                          type="range"
                          min="0.6"
                          max="3.5"
                          step="0.05"
                          value={curScale}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            onUpdateSlimeSprites(slime.id, {
                              ...(slime.customSprites || {}),
                              scale: val,
                            });
                            forceRefresh();
                          }}
                          className="flex-1 accent-sky-400"
                        />
                        <span className="text-[10px] font-mono font-bold text-sky-400 w-10 text-right">
                          {curScale.toFixed(2)}x
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : activeTab === 'arena' ? (
            /* TAB 2: ARENA BACKGROUND CUSTOMIZER */
            <div className="space-y-5">
              {/* Custom Image Upload Card */}
              <div className="bg-slate-900/85 border border-slate-800 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-mono font-bold uppercase text-sky-400">
                    Upload de Imagem / Mapa Customizado para o Fundo da Arena
                  </div>
                  <p className="text-xs text-slate-300">
                    Envie qualquer cenário PNG, JPG ou WebP (ex: mapa de arena 2D/isométrico,
                    dungeon, textura de piso).
                  </p>
                  {arenaBg.customImageName && (
                    <div className="text-[11px] font-mono text-emerald-400">
                      Imagem Ativa: <strong>{arenaBg.customImageName}</strong>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono font-bold text-xs uppercase rounded transition cursor-pointer shadow">
                    <Upload className="w-4 h-4" />
                    <span>Carregar Imagem de Fundo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        handleArenaImageUpload(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  {arenaBg.customImage && (
                    <button
                      onClick={() =>
                        onUpdateArenaBg({
                          ...arenaBg,
                          customImage: null,
                          customImageUrl: null,
                          customImageName: null,
                        })
                      }
                      className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/90 hover:bg-rose-900 border border-rose-700/70 text-rose-200 font-mono text-xs uppercase rounded cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Remover Imagem
                    </button>
                  )}
                </div>
              </div>

              {/* Fit Mode, Dimness & Tactical Grid Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/70 border border-slate-800 rounded-lg p-4">
                <div>
                  <label className="block text-[11px] font-mono font-bold uppercase text-slate-300 mb-2">
                    Ajuste da Imagem Customizada
                  </label>
                  <div className="flex gap-1.5">
                    {(
                      [
                        { id: 'cover', label: 'Preencher' },
                        { id: 'contain', label: 'Inteira' },
                        { id: 'tile', label: 'Mosaico' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        onClick={() => onUpdateArenaBg({ ...arenaBg, fitMode: m.id })}
                        className={`flex-1 py-1.5 px-2 text-[11px] font-mono font-bold uppercase rounded border transition cursor-pointer ${
                          arenaBg.fitMode === m.id
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] font-mono font-bold uppercase text-slate-300 mb-2">
                    <span>Contraste Escuro (Destaque VFX)</span>
                    <span className="text-sky-400">{Math.round(arenaBg.dimness * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.85"
                    step="0.05"
                    value={arenaBg.dimness}
                    onChange={(e) =>
                      onUpdateArenaBg({
                        ...arenaBg,
                        dimness: parseFloat(e.target.value),
                      })
                    }
                    className="w-full accent-sky-400"
                  />
                </div>

                <div className="flex flex-col justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-slate-300 mb-2">
                    Grade Tática da Arena
                  </span>
                  <button
                    onClick={() =>
                      onUpdateArenaBg({
                        ...arenaBg,
                        showTacticalGrid: !arenaBg.showTacticalGrid,
                      })
                    }
                    className={`flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-mono font-bold uppercase rounded border transition cursor-pointer ${
                      arenaBg.showTacticalGrid
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <Grid className="w-3.5 h-3.5" />
                    {arenaBg.showTacticalGrid ? 'Grade Tática: Visível' : 'Grade Tática: Oculta'}
                  </button>
                </div>
              </div>

              {/* 6 Procedural Arena Floor Biomes */}
              <div>
                <div className="text-xs font-mono font-bold uppercase text-slate-300 mb-2.5">
                  Biomas Procedurais da Arena (Selecionar Piso Nativo)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {ARENA_FLOOR_PRESETS.map((biome) => {
                    const isSelected =
                      !arenaBg.customImage && arenaBg.presetId === biome.id;
                    return (
                      <button
                        key={biome.id}
                        onClick={() =>
                          onUpdateArenaBg({
                            ...arenaBg,
                            presetId: biome.id,
                            customImage: null,
                            customImageUrl: null,
                            customImageName: null,
                          })
                        }
                        className={`p-3 rounded-lg border text-left transition flex items-start gap-3 cursor-pointer ${
                          isSelected
                            ? 'bg-sky-950/40 border-sky-400 shadow-md'
                            : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div
                          className="w-11 h-11 rounded border border-white/20 shrink-0"
                          style={{ background: biome.swatch }}
                        />
                        <div>
                          <div className="text-xs font-bold text-white">{biome.name}</div>
                          <div className="text-[10px] text-slate-400 leading-snug mt-0.5">
                            {biome.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* TAB 3: POÇÕES ARREMESSÁVEIS (#86 - #95) & ASSETS CUSTOMIZADOS */
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/90 border border-sky-500/30 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-bold text-sky-300">
                    <FlaskConical className="w-4 h-4 text-sky-400" />
                    Arsenal Alquímico: 10 Poções Arremessáveis (#86 a #95)
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    Todas as 10 poções já contam com <strong>frascos ilustrados de alta resolução</strong>,
                    trajetória parabólica com <strong>giro 3D end-over-end</strong> e <strong>poças dinâmicas multi-texturizadas</strong>.
                    Você também pode importar seus <strong>10 PNGs de uma só vez</strong> (reconhecimento automático por nome <code className="text-sky-300">01_nevoa_venenosa.png</code> até <code className="text-sky-300">10_fumaca_ofuscante.png</code>):
                  </p>
                </div>

                <label className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs uppercase rounded-lg cursor-pointer transition shadow-lg shrink-0">
                  <Upload className="w-4 h-4" />
                  <span>Importar 10 PNGs em Lote</span>
                  <input
                    type="file"
                    multiple
                    accept="image/png,image/webp,image/gif,image/jpeg"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        registerPotionBatchFiles(e.target.files, () => {
                          forceRefresh();
                        });
                      }
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {getAllPotionConfigs().map((pot, idx) => {
                  const presetNum = 86 + idx;
                  const hasCustomAsset = Boolean(pot.userAssetUrl);
                  const previewSrc =
                    hasCustomAsset && pot.userAssetUrl
                      ? pot.userAssetUrl
                      : getPaintedPotionBottleDataUrl(pot.id);

                  return (
                    <div
                      key={pot.id}
                      className="p-3.5 bg-slate-900/95 border border-slate-800 hover:border-slate-700 rounded-xl space-y-2.5 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* High-Res Bottle Sprite or Custom Asset Image */}
                          <div
                            className="w-14 h-14 rounded-lg border border-white/20 flex items-center justify-center shrink-0 overflow-hidden relative"
                            style={{
                              background: `radial-gradient(circle at 35% 35%, ${pot.coreColor}33 0%, ${pot.fluidColor}22 60%, #090D16 100%)`,
                            }}
                          >
                            <img
                              src={previewSrc}
                              alt={pot.name}
                              className="w-12 h-12 object-contain drop-shadow"
                            />
                          </div>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs font-bold text-sky-400">
                                #{presetNum}
                              </span>
                              <span className="text-xs font-bold text-white">
                                {pot.name}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-medium">
                              {pot.subtitle} · <span style={{ color: pot.fluidColor }}>{pot.element}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-500">
                              Arquivo: {pot.fileSlug}
                            </div>
                          </div>
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold border ${
                            hasCustomAsset
                              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                              : 'bg-sky-500/15 border-sky-500/35 text-sky-300'
                          }`}
                        >
                          {hasCustomAsset ? 'PNG CUSTOM ATIVO' : 'ARTE HD NATIVA'}
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug">
                        {pot.description}
                      </p>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400">
                        <div className="flex items-center gap-2">
                          <span>Raio AoE: <strong className="text-white">{pot.impactRadius}px</strong></span>
                          <span>·</span>
                          <span>Alcance: <strong className="text-white">{pot.throwRange}px</strong></span>
                          <span>·</span>
                          <span>Duração: <strong className="text-white">{pot.puddleDuration}s</strong></span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {hasCustomAsset && (
                            <button
                              onClick={() => {
                                clearPotionCustomAsset(pot.id);
                                forceRefresh();
                              }}
                              className="px-2 py-1 text-[10px] font-mono text-rose-400 hover:text-white hover:bg-rose-950/40 rounded transition cursor-pointer"
                              title="Remover PNG customizado e voltar à arte HD nativa"
                            >
                              Resetar
                            </button>
                          )}

                          <label className="flex items-center gap-1 px-2.5 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded cursor-pointer transition">
                            <Upload className="w-3 h-3" />
                            <span>{hasCustomAsset ? 'Trocar PNG' : 'Subir PNG'}</span>
                            <input
                              type="file"
                              accept="image/png,image/webp,image/gif,image/jpeg"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = () => {
                                  if (typeof reader.result === 'string') {
                                    registerPotionCustomAsset(pot.id, reader.result, true);
                                    forceRefresh();
                                  }
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between text-xs">
          <span className="text-slate-400 font-mono text-[11px]">
            Dica: Você pode selecionar uma Pasta Mãe com várias pastas de personagens ou arrastar várias pastas de uma vez!
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-mono font-bold uppercase rounded cursor-pointer"
          >
            Concluir e Voltar à Arena
          </button>
        </div>
      </div>
    </div>
  );
};
