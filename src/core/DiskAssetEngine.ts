/**
 * DiskAssetEngine — Motor Unificado de Persistência Física de Assets no Disco Local do Projeto
 *
 * Em vez de acumular megabytes de strings Base64 (`data:image/...`) ou URLs voláteis (`blob:...`)
 * na memória RAM / V8 Heap / localStorage / IndexedDB, este motor envia qualquer arquivo binário
 * (PNG, JPG, WebP, GIF, SVG, MP4, WebM, MP3, WAV, OGG) diretamente para a unidade de armazenamento
 * física do projeto (`public/cards/` ou `public/assets/engine/<category>/`) e retorna apenas o
 * caminho estático leve (ex: `/cards/meu_card.png` ou `/assets/engine/phases/tile_abc123.png`).
 */

export type DiskAssetCategory =
  | 'cards'
  | 'mobbys'
  | 'maps'
  | 'phases'
  | 'characters'
  | 'biomes'
  | 'video'
  | 'audio'
  | 'ui'
  | 'hud'
  | 'items'
  | 'motion'
  | 'packs'
  | 'engine';

// Cache em memória (Hash/Assinatura -> URL física no disco) para evitar re-uploads redundantes na mesma sessão
const uploadedSignatureCache = new Map<string, string>();

function computeQuickSignature(input: string): string {
  const len = input.length;
  if (len <= 128) return input;
  let h = 0x811c9dc5;
  const step = Math.max(1, Math.floor(len / 96));
  for (let i = 0; i < len; i += step) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  for (let i = Math.max(0, len - 48); i < len; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `sig_${len}_${(h >>> 0).toString(36)}`;
}

/**
 * Verifica se uma string é um DataURL binário (Base64) que deve ser desidratado para arquivo físico em disco.
 */
export function isBase64DataUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  if (!url.startsWith('data:')) return false;
  // SVGs inline sem base64 não precisam ser desidratados para arquivos físicos
  if (url.startsWith('data:image/svg+xml')) {
    return url.includes(';base64,');
  }
  return url.includes(';base64,');
}

/**
 * Verifica se uma string é uma ObjectURL volátil (`blob:...`).
 */
export function isVolatileBlobUrl(url: unknown): url is string {
  return typeof url === 'string' && url.startsWith('blob:');
}

/**
 * Envia um arquivo `File` ou `Blob` diretamente para o disco local do projeto (`public/...`)
 * via endpoint `/api/upload-engine-asset` e retorna o caminho estático leve (ex: `/cards/...` ou `/assets/engine/...`).
 */
export async function uploadFileToDisk(
  file: File | Blob,
  category: DiskAssetCategory = 'engine',
  customFilename?: string
): Promise<string> {
  const fileName =
    customFilename ||
    (file instanceof File && file.name ? file.name : `asset_${Date.now()}.png`);

  const fileKey =
    file instanceof File
      ? `file:${category}:${file.name}:${file.size}:${file.lastModified}`
      : '';

  if (fileKey && uploadedSignatureCache.has(fileKey)) {
    return uploadedSignatureCache.get(fileKey)!;
  }

  try {
    const formData = new FormData();
    formData.append('category', category);
    formData.append('media', file, fileName);

    const response = await fetch(
      `/api/upload-engine-asset?category=${encodeURIComponent(category)}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (response.ok) {
      const json = await response.json();
      if (json && json.url) {
        if (fileKey) uploadedSignatureCache.set(fileKey, json.url);
        return json.url as string;
      }
    }
  } catch (err) {
    console.warn('[DiskAssetEngine] Falha no upload multipart, tentando fallback JSON:', err);
  }

  // Fallback via DataURL -> JSON POST
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

  return uploadDataUrlToDisk(dataUrl, fileName, category);
}

/**
 * Converte uma URL `data:...;base64,...` ou `blob:...` em arquivo físico no disco local do projeto
 * e retorna o caminho estático (`/cards/...` ou `/assets/engine/<category>/...`).
 */
export async function uploadDataUrlToDisk(
  urlOrData: string | undefined,
  filenameHint: string = 'asset.png',
  category: DiskAssetCategory = 'engine'
): Promise<string> {
  if (!urlOrData || typeof urlOrData !== 'string') return '';

  // Se já for um caminho físico de disco (`/cards/...`, `/assets/...`, `/sounds/...`, `http...`), retorna direto!
  if (
    urlOrData.startsWith('/') ||
    urlOrData.startsWith('http://') ||
    urlOrData.startsWith('https://')
  ) {
    return urlOrData;
  }

  // Se for uma URL volátil `blob:...`, busca o Blob real, faz upload para o disco e revoga o blob da RAM
  if (isVolatileBlobUrl(urlOrData)) {
    try {
      const res = await fetch(urlOrData);
      const blob = await res.blob();
      const ext = blob.type.split('/')[1]?.split(';')[0] || 'png';
      const safeHint = filenameHint.includes('.') ? filenameHint : `${filenameHint}.${ext}`;
      const diskUrl = await uploadFileToDisk(blob, category, safeHint);
      return diskUrl;
    } catch (err) {
      console.warn('[DiskAssetEngine] Erro ao persistir blob URL no disco:', err);
      return urlOrData;
    }
  }

  if (!isBase64DataUrl(urlOrData)) {
    return urlOrData;
  }

  const sig = `${category}:${computeQuickSignature(urlOrData)}`;
  const cached = uploadedSignatureCache.get(sig);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch('/api/upload-engine-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: filenameHint,
        category,
        data: urlOrData,
      }),
    });

    if (response.ok) {
      const json = await response.json();
      if (json && json.url) {
        uploadedSignatureCache.set(sig, json.url);
        return json.url as string;
      }
    }
  } catch (err) {
    console.warn('[DiskAssetEngine] Erro ao gravar DataURL no disco:', err);
  }

  return urlOrData;
}

/**
 * Registra no cache local um mapeamento `{ signature/dataUrl -> diskUrl }` retornado pelo servidor.
 */
export function registerServerDehydratedMap(map: Record<string, string> | undefined): void {
  if (!map || typeof map !== 'object') return;
  for (const [k, v] of Object.entries(map)) {
    if (k && v) {
      uploadedSignatureCache.set(k, v);
    }
  }
}

/**
 * Percorre recursivamente qualquer estrutura de dados (Carta, Snapshot da Matriz, Projeto de Mapa, Fase, Mobby)
 * e substitui na própria estrutura quaisquer strings `data:...;base64,...` ou `blob:...` pelos seus caminhos físicos no disco.
 */
export async function dehydrateObjectAssetsToDisk<T>(
  input: T,
  defaultCategory: DiskAssetCategory = 'engine'
): Promise<T> {
  if (!input) return input;

  if (typeof input === 'string') {
    if (isBase64DataUrl(input) || isVolatileBlobUrl(input)) {
      return (await uploadDataUrlToDisk(input, `asset_${Date.now()}`, defaultCategory)) as unknown as T;
    }
    return input;
  }

  if (Array.isArray(input)) {
    const result: any[] = new Array(input.length);
    for (let i = 0; i < input.length; i++) {
      result[i] = await dehydrateObjectAssetsToDisk(input[i], defaultCategory);
    }
    return result as unknown as T;
  }

  if (typeof input === 'object') {
    const out: Record<string, any> = {};
    for (const [key, val] of Object.entries(input as Record<string, any>)) {
      if (typeof val === 'string' && (isBase64DataUrl(val) || isVolatileBlobUrl(val))) {
        let cat: DiskAssetCategory = defaultCategory;
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('audio') || lowerKey.includes('bgm') || lowerKey.includes('sfx')) {
          cat = 'audio';
        } else if (lowerKey.includes('video')) {
          cat = 'video';
        } else if (lowerKey.includes('avatar') || lowerKey.includes('character')) {
          cat = defaultCategory === 'cards' ? 'cards' : 'characters';
        } else if (lowerKey.includes('tile') || lowerKey.includes('biome')) {
          cat = 'biomes';
        }
        out[key] = await uploadDataUrlToDisk(val, `${key}_${Date.now()}`, cat);
      } else if (val && typeof val === 'object') {
        out[key] = await dehydrateObjectAssetsToDisk(val, defaultCategory);
      } else {
        out[key] = val;
      }
    }
    return out as T;
  }

  return input;
}
