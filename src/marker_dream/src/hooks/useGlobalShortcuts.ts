import { useEffect } from 'react';

export interface GlobalShortcutsHandlers {
  activeTab: string;
  // Fase / Canvas principal
  onSavePhase: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCopy: () => void;
  onPaste: () => void;
  // Motion Canvas
  onMotionUndo?: () => void;
  onMotionRedo?: () => void;
  onMotionCopy?: () => void;
  onMotionPaste?: () => void;
  onMotionDuplicate?: () => void;
  onMotionSave?: () => void;
  onMotionDelete?: () => void;
  onMotionNudge?: (dx: number, dy: number) => void;
}

export function useGlobalShortcuts(handlers: GlobalShortcutsHandlers) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable
      ) {
        return;
      }

      const isCtrl = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      // Se estiver no Motion Canvas, os atalhos controlam as camadas do Motion
      if (handlers.activeTab === 'motion_canvas') {
        if (isCtrl && key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handlers.onMotionUndo?.();
          return;
        }
        if (isCtrl && ((key === 'z' && e.shiftKey) || key === 'y')) {
          e.preventDefault();
          handlers.onMotionRedo?.();
          return;
        }
        if (isCtrl && key === 'c') {
          e.preventDefault();
          handlers.onMotionCopy?.();
          return;
        }
        if (isCtrl && key === 'v') {
          e.preventDefault();
          handlers.onMotionPaste?.();
          return;
        }
        if (isCtrl && key === 'd') {
          e.preventDefault();
          handlers.onMotionDuplicate?.();
          return;
        }
        if (isCtrl && key === 's') {
          e.preventDefault();
          handlers.onMotionSave ? handlers.onMotionSave() : handlers.onSavePhase();
          return;
        }
        if (e.key === 'Delete' || e.key === 'Backspace') {
          e.preventDefault();
          handlers.onMotionDelete?.();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handlers.onMotionNudge?.(0, e.shiftKey ? -10 : -1);
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          handlers.onMotionNudge?.(0, e.shiftKey ? 10 : 1);
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlers.onMotionNudge?.(e.shiftKey ? -10 : -1, 0);
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          handlers.onMotionNudge?.(e.shiftKey ? 10 : 1, 0);
          return;
        }
        return;
      }

      // Atalhos no editor principal
      if (!isCtrl) return;

      // Salvar fase: Ctrl+S / Cmd+S
      if (key === 's') {
        e.preventDefault();
        e.stopPropagation();
        handlers.onSavePhase();
        return;
      }

      // Desfazer: Ctrl+Z (sem Shift)
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handlers.onUndo();
        return;
      }

      // Refazer: Ctrl+Shift+Z ou Ctrl+Y
      if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        handlers.onRedo();
        return;
      }

      // Copiar: Ctrl+C
      if (key === 'c') {
        e.preventDefault();
        handlers.onCopy();
        return;
      }

      // Colar: Ctrl+V
      if (key === 'v') {
        e.preventDefault();
        handlers.onPaste();
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handlers]);
}
