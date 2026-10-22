import React, { useRef } from 'react';
import {
  FolderOpen,
  RefreshCw,
  Unplug,
  FolderSync,
  Zap,
} from 'lucide-react';
import { LocalSyncState, localAssetSyncService } from '../../services/localAssetSyncService';

interface Props {
  syncState: LocalSyncState;
  onRefreshSync?: () => void;
}

export const LocalFolderConnectionBanner: React.FC<Props> = ({ syncState, onRefreshSync }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleConnectFolder = async () => {
    // Tenta primeiro File System Access API
    if ('showDirectoryPicker' in window) {
      await localAssetSyncService.connectLocalFolder();
    } else {
      // Fallback para input de pasta
      fileInputRef.current?.click();
    }
  };

  const handleReconnect = async () => {
    await localAssetSyncService.reconnectStoredFolder();
  };

  const handleDisconnect = () => {
    localAssetSyncService.disconnectFolder();
  };

  const handleManualSync = async () => {
    onRefreshSync?.();
    await localAssetSyncService.performSync();
  };

  const handleFallbackFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      localAssetSyncService.connectViaFileInput(e.target.files);
    }
  };

  // =========================================================================
  // 1. ESTADO: DESCONECTADO
  // =========================================================================
  if (syncState.status === 'disconnected') {
    return (
      <div className="p-2 px-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between gap-2 text-xs">
        <input
          ref={fileInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory=""
          directory=""
          multiple
          className="hidden"
          onChange={handleFallbackFiles}
        />

        <div className="flex items-center gap-2 min-w-0">
          <FolderSync className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span className="font-bold text-slate-200 truncate">Pasta do PC</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {syncState.hasStoredHandle && syncState.folderName && (
            <button
              type="button"
              onClick={handleReconnect}
              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer"
              title={`Reconectar à pasta: ${syncState.folderName}`}
            >
              <Zap className="w-3 h-3" />
              <span>Reconectar</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleConnectFolder}
            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] transition-all cursor-pointer"
          >
            Conectar Pasta
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // 2. ESTADO: CONECTADO & SINCRONIZANDO (Linha Única Compacta)
  // =========================================================================
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-200">
      <input
        ref={fileInputRef}
        type="file"
        // @ts-ignore
        webkitdirectory=""
        directory=""
        multiple
        className="hidden"
        onChange={handleFallbackFiles}
      />

      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-xs font-bold text-slate-200 truncate">
          📁 {syncState.folderName || 'Assets'}
        </span>
        <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
          {syncState.totalAssets}
        </span>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={handleManualSync}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-emerald-300 transition-colors cursor-pointer"
          title="Sincronizar modificações agora"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={handleConnectFolder}
          className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 text-[10px] font-semibold transition-colors cursor-pointer flex items-center gap-1"
          title="Trocar pasta conectada"
        >
          <FolderOpen className="w-3 h-3 text-amber-400" />
          <span>Trocar</span>
        </button>

        <button
          type="button"
          onClick={handleDisconnect}
          className="p-1 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
          title="Desconectar pasta"
        >
          <Unplug className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
