import { LocalFolderAsset, FolderTreeNode, GalleryAsset } from '../types/map';
import { readUploadedImage } from '../utils/tileGenerator';
import { readUploadedVideo } from '../utils/videoUtils';

const DB_NAME = 'TileScrollDB';
const STORE_NAME = 'projects';
const FOLDER_HANDLE_KEY = 'local_assets_folder_handle_v1';
const FOLDER_NAME_KEY = 'local_assets_folder_name_v1';

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'syncing' | 'error';

export interface LocalSyncState {
  status: SyncStatus;
  folderName: string | null;
  assets: LocalFolderAsset[];
  tree: FolderTreeNode | null;
  totalAssets: number;
  totalFolders: number;
  lastSyncedAt: Date | null;
  errorMessage: string | null;
  isWatching: boolean;
  hasStoredHandle: boolean;
}

type Listener = (state: LocalSyncState) => void;

class LocalAssetSyncService {
  private dirHandle: any = null; // FileSystemDirectoryHandle
  private pollInterval: any = null;
  private focusHandler: (() => void) | null = null;
  private listeners = new Set<Listener>();

  // Caches para performance e evitar re-renderizações desnecessárias
  private fileSnapshot = new Map<string, string>(); // relativePath -> `${lastModified}-${size}`
  private objectUrlCache = new Map<string, string>(); // relativePath -> blob:url
  private base64Cache = new Map<string, string>(); // relativePath -> data:url permanente

  private state: LocalSyncState = {
    status: 'disconnected',
    folderName: null,
    assets: [],
    tree: null,
    totalAssets: 0,
    totalFolders: 0,
    lastSyncedAt: null,
    errorMessage: null,
    isWatching: false,
    hasStoredHandle: false,
  };

  constructor() {
    this.checkStoredHandleAvailability();
  }

  public getState(): LocalSyncState {
    return this.state;
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Erro em listener do LocalAssetSyncService:', err);
      }
    });
  }

  // =========================================================================
  // INDEXEDDB: Armazenamento e Recuperação Segura do FileSystemDirectoryHandle
  // =========================================================================
  private async getDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB não suportado'));
        return;
      }
      const request = window.indexedDB.open(DB_NAME);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async saveHandleToStorage(handle: any, folderName: string): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(handle, FOLDER_HANDLE_KEY);
      store.put(folderName, FOLDER_NAME_KEY);
    } catch (err) {
      console.warn('Não foi possível persistir FileSystemDirectoryHandle no IndexedDB:', err);
    }
  }

  private async clearHandleFromStorage(): Promise<void> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(FOLDER_HANDLE_KEY);
      store.delete(FOLDER_NAME_KEY);
    } catch (err) {
      console.warn('Erro ao limpar handle do IndexedDB:', err);
    }
  }

  public async checkStoredHandleAvailability(): Promise<boolean> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      return new Promise((resolve) => {
        const reqHandle = store.get(FOLDER_HANDLE_KEY);
        const reqName = store.get(FOLDER_NAME_KEY);
        tx.oncomplete = () => {
          const handle = reqHandle.result;
          const name = reqName.result;
          const available = !!(handle && name);
          this.state = {
            ...this.state,
            hasStoredHandle: available,
            folderName: available ? name : this.state.folderName,
          };
          this.notify();
          resolve(available);
        };
        tx.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }

  // =========================================================================
  // CONEXÃO COM A PASTA LOCAL
  // =========================================================================
  public async connectLocalFolder(): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    // 1. Modern File System Access API
    if ('showDirectoryPicker' in window) {
      try {
        this.state = { ...this.state, status: 'connecting', errorMessage: null };
        this.notify();

        const dirHandle = await (window as any).showDirectoryPicker({
          id: 'create-phase-assets-dir',
          mode: 'read',
        });

        if (!dirHandle) {
          this.state = { ...this.state, status: 'disconnected' };
          this.notify();
          return false;
        }

        const folderName = dirHandle.name || 'Assets';
        this.dirHandle = dirHandle;
        await this.saveHandleToStorage(dirHandle, folderName);

        this.state = {
          ...this.state,
          status: 'connected',
          folderName,
          hasStoredHandle: true,
          errorMessage: null,
        };
        this.notify();

        // Faz scan inicial
        await this.performSync();
        this.startWatcher();
        return true;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          // Usuário cancelou a janela de seleção
          this.state = { ...this.state, status: this.dirHandle ? 'connected' : 'disconnected' };
          this.notify();
          return false;
        }
        console.error('Erro ao conectar pasta com File System Access API:', err);
        this.state = {
          ...this.state,
          status: 'error',
          errorMessage: err.message || 'Falha ao acessar pasta local',
        };
        this.notify();
        return false;
      }
    }

    return false;
  }

  /**
   * Reconecta automaticamente caso o handle já esteja no IndexedDB e o usuário conceda permissão
   */
  public async reconnectStoredFolder(): Promise<boolean> {
    try {
      const db = await this.getDB();
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const handle: any = await new Promise((resolve) => {
        const req = store.get(FOLDER_HANDLE_KEY);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });

      const folderName: string = await new Promise((resolve) => {
        const req = store.get(FOLDER_NAME_KEY);
        req.onsuccess = () => resolve(req.result || 'Assets');
        req.onerror = () => resolve('Assets');
      });

      if (!handle) return false;

      // Verifica ou solicita permissão de leitura
      let perm = 'prompt';
      if (typeof handle.queryPermission === 'function') {
        perm = await handle.queryPermission({ mode: 'read' });
      }

      if (perm !== 'granted' && typeof handle.requestPermission === 'function') {
        perm = await handle.requestPermission({ mode: 'read' });
      }

      if (perm === 'granted') {
        this.dirHandle = handle;
        this.state = {
          ...this.state,
          status: 'connected',
          folderName,
          hasStoredHandle: true,
          errorMessage: null,
        };
        this.notify();

        await this.performSync();
        this.startWatcher();
        return true;
      } else {
        this.state = {
          ...this.state,
          status: 'disconnected',
          errorMessage: 'Permissão para acessar a pasta não concedida.',
        };
        this.notify();
        return false;
      }
    } catch (err: any) {
      console.warn('Não foi possível reconectar pasta salva:', err);
      return false;
    }
  }

  /**
   * Fallback: Conecta via input com webkitdirectory caso File System Access API não esteja disponível
   */
  public async connectViaFileInput(files: FileList): Promise<boolean> {
    if (!files || files.length === 0) return false;

    this.state = { ...this.state, status: 'connecting' };
    this.notify();

    // Infere o nome da pasta-base a partir do primeiro arquivo
    const firstRel = (files[0] as any).webkitRelativePath || '';
    const folderName = firstRel.split('/')[0] || 'Assets Local';

    const assets: LocalFolderAsset[] = [];
    const newSnapshot = new Map<string, string>();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!this.isCompatibleAssetFile(file.name)) continue;

      const relPath = (file as any).webkitRelativePath || file.name;
      const parts = relPath.split('/').filter(Boolean);
      // Remove o nome da raiz se houver subpastas
      const subParts = parts.length > 1 ? parts.slice(1) : parts;
      const categories = subParts.slice(0, -1);
      const filename = subParts[subParts.length - 1] || file.name;
      const cleanRelativePath = subParts.join('/');
      const directory = categories.length > 0 ? categories.join('/') : 'Raiz';

      const snapshotKey = `${file.lastModified}-${file.size}`;
      newSnapshot.set(cleanRelativePath, snapshotKey);

      let previewUrl = this.objectUrlCache.get(cleanRelativePath);
      if (!previewUrl) {
        previewUrl = URL.createObjectURL(file);
        this.objectUrlCache.set(cleanRelativePath, previewUrl);
      }

      assets.push({
        id: `local-${cleanRelativePath.replace(/[\/\s.]/g, '_')}`,
        name: filename.replace(/\.[^/.]+$/, '').trim(),
        filename,
        relativePath: cleanRelativePath,
        directory,
        categories: categories.length > 0 ? categories : ['Geral'],
        extension: filename.split('.').pop()?.toLowerCase() || '',
        size: file.size,
        lastModified: file.lastModified,
        type: this.getAssetType(filename),
        previewUrl,
        file,
      });
    }

    const tree = this.buildFolderTree(assets, folderName);
    this.fileSnapshot = newSnapshot;

    this.state = {
      ...this.state,
      status: 'connected',
      folderName,
      assets,
      tree,
      totalAssets: assets.length,
      totalFolders: this.countFolders(tree),
      lastSyncedAt: new Date(),
      isWatching: false, // Fallback não permite polling nativo contínuo sem re-seleção
      errorMessage: null,
    };
    this.notify();
    return true;
  }

  public disconnectFolder(): void {
    this.stopWatcher();
    this.dirHandle = null;
    this.clearHandleFromStorage();

    // Revoga object URLs em cache para liberar memória
    this.objectUrlCache.forEach((url) => URL.revokeObjectURL(url));
    this.objectUrlCache.clear();
    this.fileSnapshot.clear();

    this.state = {
      status: 'disconnected',
      folderName: null,
      assets: [],
      tree: null,
      totalAssets: 0,
      totalFolders: 0,
      lastSyncedAt: null,
      errorMessage: null,
      isWatching: false,
      hasStoredHandle: false,
    };
    this.notify();
  }

  // =========================================================================
  // SINCRONIZAÇÃO EM TEMPO REAL & VARREDURA RECURSIVA
  // =========================================================================
  public async performSync(): Promise<void> {
    if (!this.dirHandle) return;

    try {
      const scannedAssets: LocalFolderAsset[] = [];
      const newSnapshot = new Map<string, string>();

      // Varredura recursiva de diretórios sem limite de profundidade
      await this.scanDirectoryRecursive(this.dirHandle, '', [], scannedAssets, newSnapshot);

      // Verificação de alteração (Diffing rápido com base em lastModified e size)
      let hasChanges = scannedAssets.length !== this.fileSnapshot.size;
      if (!hasChanges) {
        for (const [path, snapshotVal] of newSnapshot.entries()) {
          if (this.fileSnapshot.get(path) !== snapshotVal) {
            hasChanges = true;
            break;
          }
        }
      }

      // Se nada mudou, não dispara re-renderizações na aplicação!
      if (!hasChanges && this.state.assets.length > 0) {
        this.state = { ...this.state, lastSyncedAt: new Date() };
        this.notify();
        return;
      }

      // Limpa URLs de arquivos excluídos
      for (const [cachedPath, url] of this.objectUrlCache.entries()) {
        if (!newSnapshot.has(cachedPath)) {
          URL.revokeObjectURL(url);
          this.objectUrlCache.delete(cachedPath);
          this.base64Cache.delete(cachedPath);
        }
      }

      this.fileSnapshot = newSnapshot;
      const folderName = this.state.folderName || this.dirHandle.name || 'Assets';
      const tree = this.buildFolderTree(scannedAssets, folderName);

      this.state = {
        ...this.state,
        status: 'connected',
        assets: scannedAssets,
        tree,
        totalAssets: scannedAssets.length,
        totalFolders: this.countFolders(tree),
        lastSyncedAt: new Date(),
        errorMessage: null,
      };
      this.notify();
    } catch (err: any) {
      console.warn('Erro durante sincronização da pasta local:', err);
      // Se perdeu a permissão
      if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
        this.state = {
          ...this.state,
          status: 'error',
          errorMessage: 'Permissão de acesso à pasta expirou ou foi revogada.',
        };
        this.notify();
      }
    }
  }

  private async scanDirectoryRecursive(
    dirHandle: any,
    currentPath: string,
    categories: string[],
    result: LocalFolderAsset[],
    newSnapshot: Map<string, string>
  ): Promise<void> {
    for await (const [name, handle] of (dirHandle as any).entries()) {
      // Ignora pastas/arquivos ocultos ou de sistema
      if (
        name.startsWith('.') ||
        name === 'node_modules' ||
        name === 'Thumbs.db' ||
        name === 'desktop.ini'
      ) {
        continue;
      }

      if (handle.kind === 'directory') {
        const subPath = currentPath ? `${currentPath}/${name}` : name;
        await this.scanDirectoryRecursive(handle, subPath, [...categories, name], result, newSnapshot);
      } else if (handle.kind === 'file') {
        if (!this.isCompatibleAssetFile(name)) continue;

        try {
          const fileHandle = handle;
          const file = await fileHandle.getFile();
          const relativePath = currentPath ? `${currentPath}/${name}` : name;
          const snapshotKey = `${file.lastModified}-${file.size}`;
          newSnapshot.set(relativePath, snapshotKey);

          // Verifica se o arquivo foi modificado para atualizar a pré-visualização
          const oldSnapshotKey = this.fileSnapshot.get(relativePath);
          let previewUrl = this.objectUrlCache.get(relativePath);

          if (!previewUrl || oldSnapshotKey !== snapshotKey) {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            previewUrl = URL.createObjectURL(file);
            this.objectUrlCache.set(relativePath, previewUrl);
            this.base64Cache.delete(relativePath); // Limpa cache base64 desatualizado
          }

          result.push({
            id: `local-${relativePath.replace(/[\/\s.]/g, '_')}`,
            name: name.replace(/\.[^/.]+$/, '').trim(),
            filename: name,
            relativePath,
            directory: currentPath || 'Raiz',
            categories: categories.length > 0 ? categories : ['Geral'],
            extension: name.split('.').pop()?.toLowerCase() || '',
            size: file.size,
            lastModified: file.lastModified,
            type: this.getAssetType(name),
            previewUrl,
            fileHandle,
            file,
          });
        } catch (fileErr) {
          console.warn('Erro ao ler arquivo da pasta:', name, fileErr);
        }
      }
    }
  }

  // =========================================================================
  // MONITORAMENTO CONTÍNUO (Watcher) & FOCO DE JANELA
  // =========================================================================
  public startWatcher(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);

    // Polling contínuo a cada 2.5 segundos
    this.pollInterval = setInterval(() => {
      if (this.dirHandle && document.visibilityState === 'visible') {
        this.performSync();
      }
    }, 2500);

    // Atualização imediata no retorno de foco (quando o usuário salva no Photoshop/Aseprite e clica no navegador)
    if (!this.focusHandler) {
      this.focusHandler = () => {
        if (this.dirHandle) {
          this.performSync();
        }
      };
      window.addEventListener('focus', this.focusHandler);
    }

    this.state = { ...this.state, isWatching: true };
    this.notify();
  }

  public stopWatcher(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }
    this.state = { ...this.state, isWatching: false };
    this.notify();
  }

  // =========================================================================
  // CONSTRUÇÃO DA ÁRVORE DE DIRETÓRIOS E SUBCATEGORIAS
  // =========================================================================
  private buildFolderTree(assets: LocalFolderAsset[], rootName: string): FolderTreeNode {
    const root: FolderTreeNode = {
      name: rootName,
      path: '',
      fullPath: '',
      level: 0,
      subfolders: [],
      fileCount: assets.length,
      directFileCount: assets.filter((a) => !a.directory || a.directory === 'Raiz').length,
    };

    // Mapeia todas as pastas
    const folderMap = new Map<string, FolderTreeNode>();
    folderMap.set('', root);

    // Cria os nós de diretório
    assets.forEach((asset) => {
      let currentPath = '';
      asset.categories.forEach((cat, index) => {
        const nextPath = currentPath ? `${currentPath}/${cat}` : cat;
        if (!folderMap.has(nextPath)) {
          const parentNode = folderMap.get(currentPath) || root;
          const newNode: FolderTreeNode = {
            name: cat,
            path: nextPath,
            fullPath: nextPath,
            level: index + 1,
            subfolders: [],
            fileCount: 0,
            directFileCount: 0,
          };
          parentNode.subfolders.push(newNode);
          folderMap.set(nextPath, newNode);
        }
        currentPath = nextPath;
      });
    });

    // Contabiliza os arquivos em cada nó (direto e recursivo)
    assets.forEach((asset) => {
      const dirPath = asset.categories.length > 0 ? asset.categories.join('/') : '';
      let curr = dirPath;
      const node = folderMap.get(curr);
      if (node) node.directFileCount += 1;

      // Incrementa contagem recursiva nos pais
      while (curr) {
        const n = folderMap.get(curr);
        if (n) n.fileCount += 1;
        const lastSlash = curr.lastIndexOf('/');
        curr = lastSlash !== -1 ? curr.slice(0, lastSlash) : '';
      }
    });

    // Ordena pastas filhas alfabeticamente
    const sortSubfolders = (node: FolderTreeNode) => {
      node.subfolders.sort((a, b) => a.name.localeCompare(b.name));
      node.subfolders.forEach(sortSubfolders);
    };
    sortSubfolders(root);

    return root;
  }

  private countFolders(node: FolderTreeNode | null): number {
    if (!node) return 0;
    let count = node.subfolders.length;
    for (const child of node.subfolders) {
      count += this.countFolders(child);
    }
    return count;
  }

  // =========================================================================
  // PERSISTÊNCIA PERMANENTE NA MATRIZ DA FASE
  // =========================================================================
  public getCachedBase64(relativePath: string): string | undefined {
    return this.base64Cache.get(relativePath);
  }

  public getAssetByPath(relativePath: string): LocalFolderAsset | undefined {
    return this.state.assets.find((a) => a.relativePath === relativePath);
  }

  /**
   * Converte um asset local da pasta em um registro permanente embutido (Base64),
   * garantindo que a fase funcione de forma 100% autônoma mesmo se o arquivo
   * for excluído, renomeado ou se a pasta for desconectada!
   */
  public async makeAssetPersistent(asset: LocalFolderAsset): Promise<GalleryAsset> {
    let dataUrl = this.base64Cache.get(asset.relativePath) || asset.dataUrl;

    if (!dataUrl) {
      if (asset.file) {
        dataUrl = await this.readFileAsDataUrl(asset.file);
      } else if (asset.fileHandle) {
        const file = await asset.fileHandle.getFile();
        dataUrl = await this.readFileAsDataUrl(file);
      } else {
        // Fallback: fetch blob url
        const res = await fetch(asset.previewUrl);
        const blob = await res.blob();
        dataUrl = await this.readBlobAsDataUrl(blob);
      }
      this.base64Cache.set(asset.relativePath, dataUrl);
    }

    // Calcula dimensões caso seja imagem
    let width = 64;
    let height = 64;
    if (asset.type === 'image' && dataUrl) {
      try {
        const imgMeta = await this.getImageDimensions(dataUrl);
        width = imgMeta.width;
        height = imgMeta.height;
      } catch {
        // Fallback
      }
    }

    const categoryName =
      asset.categories[asset.categories.length - 1] || asset.directory || 'Geral';

    // Se for arquivo de vídeo, gera snapshot embutido e configura vídeo permanente
    if (asset.type === 'video') {
      try {
        let fileObj = asset.file;
        if (!fileObj && asset.fileHandle) {
          fileObj = await asset.fileHandle.getFile();
        }
        if (fileObj) {
          const vidRes = await readUploadedVideo(fileObj);
          return {
            id: `asset-local-perm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: asset.name,
            dataUrl: vidRes.dataUrl,
            mediaType: 'video',
            videoUrl: vidRes.videoUrl,
            videoChromaKey: {
              enabled: true,
              color: '#00ff00',
              tolerance: 35,
              smoothness: 12,
              cropSquare: true,
              cropOffsetX: 0.5,
              cropOffsetY: 0.5,
              videoSpeed: 1.0,
              scale: 1.0,
              flipH: false,
            },
            pivotX: 0.5,
            pivotY: 0.5,
            width: vidRes.width,
            height: vidRes.height,
            category: categoryName,
            subCategoryPath: asset.directory !== 'Raiz' ? asset.directory : undefined,
            tags: ['pasta-local', 'video', 'chroma', ...asset.categories],
            sourcePath: asset.relativePath,
            isPersistentPhaseAsset: true,
            createdAt: new Date().toISOString(),
          };
        }
      } catch (vidErr) {
        console.warn('Erro ao processar vídeo para persistência:', vidErr);
      }
    }

    return {
      id: `asset-local-perm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: asset.name,
      dataUrl,
      width,
      height,
      category: categoryName,
      subCategoryPath: asset.directory !== 'Raiz' ? asset.directory : undefined,
      tags: ['pasta-local', ...asset.categories],
      sourcePath: asset.relativePath,
      isPersistentPhaseAsset: true,
      createdAt: new Date().toISOString(),
    };
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  private readBlobAsDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  private getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // =========================================================================
  // UTILS
  // =========================================================================
  private isCompatibleAssetFile(filename: string): boolean {
    return /\.(png|jpe?g|webp|svg|gif|mp4|webm|ogg|mov|mkv|mp3|wav|m4a)$/i.test(filename);
  }

  private getAssetType(filename: string): 'image' | 'video' | 'audio' | 'other' {
    if (/\.(png|jpe?g|webp|svg|gif)$/i.test(filename)) return 'image';
    if (/\.(mp4|webm|mov|mkv)$/i.test(filename)) return 'video';
    if (/\.(mp3|wav|ogg|m4a)$/i.test(filename)) return 'audio';
    return 'other';
  }
}

export const localAssetSyncService = new LocalAssetSyncService();
