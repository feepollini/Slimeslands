import { readUploadedImage } from './tileGenerator';

export type SpriteDirection4Way = 'up' | 'down' | 'left' | 'right';

export interface DirectionalSpritePack {
  folderName?: string;
  defaultPng?: string;
  avatarDownPng?: string;
  avatarUpPng?: string;
  avatarLeftPng?: string;
  avatarRightPng?: string;
  matchedByKeywordCount: number;
  totalImagesRead: number;
  loadedAssets: {
    name: string;
    dataUrl: string;
    width: number;
    height: number;
    assignedDir?: SpriteDirection4Way;
  }[];
}

/**
 * Identifica inteligentemente a qual das 4 direções (up, down, left, right)
 * um arquivo ou asset pertence com base no seu nome (PT-BR e EN).
 */
export function classifyDirectionFromName(rawName: string): SpriteDirection4Way | null {
  const clean = rawName
    .replace(/\.[^/.]+$/, '') // remove extensão
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  // 1. Checagem de palavras inteiras ou separadas por _, -, espaço ou camelCase
  // Direita (Right) — checado antes de "dir" genérico se houver palavra exata
  if (
    /(^|[\s_\-.])(direita|right|leste|east|lado[\s_\-]?dir|perfil[\s_\-]?dir)($|[\s_\-.0-9])/i.test(clean) ||
    /(^|[\s_\-.])(dir|r)$/i.test(clean)
  ) {
    return 'right';
  }

  // Esquerda (Left)
  if (
    /(^|[\s_\-.])(esquerda|esq|left|oeste|west|lado[\s_\-]?esq|perfil[\s_\-]?esq)($|[\s_\-.0-9])/i.test(clean) ||
    /(^|[\s_\-.])(l|e)$/i.test(clean)
  ) {
    return 'left';
  }

  // Cima / Costas (Up / Back)
  if (
    /(^|[\s_\-.])(cima|costas|costa|up|back|tras|rear|norte|north|top)($|[\s_\-.0-9])/i.test(clean) ||
    /(^|[\s_\-.])(u|b|c)$/i.test(clean)
  ) {
    return 'up';
  }

  // Baixo / Frente (Down / Front)
  if (
    /(^|[\s_\-.])(baixo|frente|down|front|forward|sul|south|bottom|idle|padrao|default)($|[\s_\-.0-9])/i.test(clean) ||
    /(^|[\s_\-.])(d|f)$/i.test(clean)
  ) {
    return 'down';
  }

  // 2. Checagem por substring caso o nome seja colado (ex: "goblinfrente", "goblincostas", "goblinesquerda", "goblindireita")
  if (clean.includes('direita') || clean.includes('right')) return 'right';
  if (clean.includes('esquerda') || clean.includes('left') || clean.includes('esq')) return 'left';
  if (clean.includes('costas') || clean.includes('cima') || clean.includes('back') || clean.includes('tras')) return 'up';
  if (clean.includes('frente') || clean.includes('baixo') || clean.includes('front') || clean.includes('down')) return 'down';

  return null;
}

/**
 * Mapeia uma lista de imagens (de uma pasta ou categoria da galeria) para as 4 direções.
 * 1º Passo: Atribui cada PNG cujo nome indique explicitamente a direção (frente/baixo, costas/cima, esquerda, direita).
 * 2º Passo: Caso sobrem PNGs sem palavra-chave (ex: 1.png, 2.png, 3.png, 4.png), preenche as direções restantes na ordem natural.
 */
export function mapAssetsTo4Directions(
  items: { name: string; dataUrl: string; width?: number; height?: number }[],
  folderName?: string
): DirectionalSpritePack {
  const sorted = [...items].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );

  const assigned: Partial<Record<SpriteDirection4Way, { name: string; dataUrl: string; width: number; height: number }>> = {};
  const unassigned: { name: string; dataUrl: string; width: number; height: number }[] = [];
  let matchedByKeywordCount = 0;

  for (const item of sorted) {
    const entry = {
      name: item.name,
      dataUrl: item.dataUrl,
      width: item.width || 128,
      height: item.height || 128,
    };
    const detected = classifyDirectionFromName(item.name);
    if (detected && !assigned[detected]) {
      assigned[detected] = entry;
      matchedByKeywordCount++;
    } else {
      unassigned.push(entry);
    }
  }

  // Ordem padrão de preenchimento caso os arquivos sejam numerados (ex: 1.png = Frente/Baixo, 2.png = Costas/Cima, 3.png = Esquerda, 4.png = Direita)
  const fallbackOrder: SpriteDirection4Way[] = ['down', 'up', 'left', 'right'];
  for (const dir of fallbackOrder) {
    if (!assigned[dir] && unassigned.length > 0) {
      assigned[dir] = unassigned.shift()!;
    }
  }

  const loadedAssets: DirectionalSpritePack['loadedAssets'] = [];
  (['down', 'up', 'left', 'right'] as SpriteDirection4Way[]).forEach((dir) => {
    const a = assigned[dir];
    if (a) {
      loadedAssets.push({ ...a, assignedDir: dir });
    }
  });

  const avatarDownPng = assigned.down?.dataUrl;
  const avatarUpPng = assigned.up?.dataUrl;
  const avatarLeftPng = assigned.left?.dataUrl;
  const avatarRightPng = assigned.right?.dataUrl;
  const defaultPng = avatarDownPng || avatarRightPng || avatarLeftPng || avatarUpPng || sorted[0]?.dataUrl;

  return {
    folderName,
    defaultPng,
    avatarDownPng,
    avatarUpPng,
    avatarLeftPng,
    avatarRightPng,
    matchedByKeywordCount,
    totalImagesRead: sorted.length,
    loadedAssets,
  };
}

/**
 * Lê uma pasta inteira (ou múltiplos arquivos selecionados/arrastados) e monta o pacote de 4 direções.
 */
export async function parseDirectionalFolderFiles(
  fileList: FileList | File[]
): Promise<DirectionalSpritePack> {
  const files = Array.from(fileList).filter(
    (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name)
  );

  if (files.length === 0) {
    return {
      matchedByKeywordCount: 0,
      totalImagesRead: 0,
      loadedAssets: [],
    };
  }

  // Descobre o nome da pasta a partir do webkitRelativePath
  let detectedFolderName: string | undefined;
  const firstRel = (files[0] as any).webkitRelativePath as string | undefined;
  if (firstRel && firstRel.includes('/')) {
    const parts = firstRel.split('/').filter(Boolean);
    if (parts.length >= 2) {
      detectedFolderName = parts[parts.length - 2];
    } else if (parts.length === 1) {
      detectedFolderName = parts[0];
    }
  }

  const loadedRaw: { name: string; dataUrl: string; width: number; height: number }[] = [];
  for (const file of files.slice(0, 12)) {
    try {
      const res = await readUploadedImage(file);
      loadedRaw.push({
        name: file.name.replace(/\.[^/.]+$/, ''),
        dataUrl: res.dataUrl,
        width: res.width,
        height: res.height,
      });
    } catch (err) {
      console.error('Erro ao ler imagem da pasta direcional:', file.name, err);
    }
  }

  return mapAssetsTo4Directions(loadedRaw, detectedFolderName);
}

export interface MasterFolderBatchResult {
  masterFolderName?: string;
  packs: DirectionalSpritePack[];
  totalFilesRead: number;
}

/**
 * Lê uma PASTA MESTRA contendo diversas subpastas (ex: PastaMestra/Aldeao1, PastaMestra/Guarda2, etc.)
 * e transforma cada subpasta em um DirectionalSpritePack independente com as 4 direções mapeadas.
 * Também suporta arquivos soltos agrupando-os por prefixo de nome quando aplicável.
 */
export async function parseMasterFolderSubfolders(
  fileList: FileList | File[]
): Promise<MasterFolderBatchResult> {
  const files = Array.from(fileList).filter(
    (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(f.name)
  );

  if (files.length === 0) {
    return {
      packs: [],
      totalFilesRead: 0,
    };
  }

  let masterFolderName: string | undefined;
  const folderGroups = new Map<string, { folderDisplayName: string; files: File[] }>();

  for (const file of files) {
    const relPath = ((file as any).webkitRelativePath || (file as any).relativePath || '') as string;
    const parts = relPath.split('/').filter(Boolean);

    if (parts.length >= 2) {
      if (!masterFolderName && parts.length >= 3) {
        masterFolderName = parts[0];
      } else if (!masterFolderName && parts.length === 2) {
        masterFolderName = parts[0];
      }
      const parentPathKey = parts.slice(0, -1).join('/');
      const immediateFolderName = parts[parts.length - 2];

      if (!folderGroups.has(parentPathKey)) {
        folderGroups.set(parentPathKey, {
          folderDisplayName: immediateFolderName,
          files: [],
        });
      }
      folderGroups.get(parentPathKey)!.files.push(file);
    } else {
      // Arquivos selecionados sem subpasta: tenta agrupar pelo prefixo antes da direção (ex: "aldeao_frente.png" -> "aldeao")
      const baseNoExt = file.name.replace(/\.[^/.]+$/, '');
      const prefixCleaned = baseNoExt
        .replace(
          /[\s_\-.]*(frente|baixo|down|front|costas|costa|cima|up|back|tras|esquerda|esq|left|direita|dir|right|[1-4])$/i,
          ''
        )
        .trim();
      const groupKey = prefixCleaned && files.length > 4 ? `prefix:${prefixCleaned.toLowerCase()}` : 'root_selection';
      const displayName = prefixCleaned && files.length > 4 ? prefixCleaned : 'Personagem Importado';

      if (!folderGroups.has(groupKey)) {
        folderGroups.set(groupKey, {
          folderDisplayName: displayName,
          files: [],
        });
      }
      folderGroups.get(groupKey)!.files.push(file);
    }
  }

  const packs: DirectionalSpritePack[] = [];
  let totalFilesRead = 0;

  for (const [, group] of folderGroups.entries()) {
    const loadedRaw: { name: string; dataUrl: string; width: number; height: number }[] = [];
    for (const file of group.files.slice(0, 12)) {
      try {
        const res = await readUploadedImage(file);
        loadedRaw.push({
          name: file.name.replace(/\.[^/.]+$/, ''),
          dataUrl: res.dataUrl,
          width: res.width,
          height: res.height,
        });
        totalFilesRead++;
      } catch (err) {
        console.error('Erro ao ler imagem da subpasta:', file.name, err);
      }
    }

    if (loadedRaw.length > 0) {
      const cleanName = group.folderDisplayName.replace(/[_-]+/g, ' ').trim();
      const pack = mapAssetsTo4Directions(loadedRaw, cleanName);
      if (pack.defaultPng) {
        packs.push(pack);
      }
    }
  }

  return {
    masterFolderName,
    packs,
    totalFilesRead,
  };
}

