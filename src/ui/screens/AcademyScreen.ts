import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import '../../marker_dream/src/index.css';
import type { MapProject } from '../../marker_dream/src/types/map';
import { loadProject, saveProject } from '../../marker_dream/src/utils/storage';
import { createFaseMestraProject } from '../../marker_dream/src/data/masterTestPhase';
import { useBackpackScreenState } from './backpack_shared/useBackpackScreenState';
import { MobileBackpackTopBar } from './backpack_mobile/MobileBackpackTopBar';
import { MobileMochilaScreen } from './backpack_mobile/MobileMochilaScreen';
import { MobileDeckScreen } from './backpack_mobile/MobileDeckScreen';
import { MobileJornadaTarefasScreen } from './backpack_mobile/MobileJornadaTarefasScreen';

const MobileHubBackpackApp: React.FC = () => {
  const [project, setProject] = useState<MapProject>(() => createFaseMestraProject());
  const initialRequested = (window as any).__hubAcademyInitialTab as
    | 'backpack'
    | 'deck'
    | 'jornada'
    | 'tarefas'
    | undefined;

  const initialFolderTab =
    initialRequested === 'jornada'
      ? 'jornada'
      : initialRequested === 'tarefas'
      ? 'tarefas'
      : initialRequested === 'deck'
      ? 'deck'
      : 'equipamento';

  useEffect(() => {
    (window as any).__hubAcademyInitialTab = undefined;
    // Em Mobile Vertical: remove imediatamente o Header e a Barra de Navegação para aproveitar 100% da tela!
    document.body.classList.add('hub-scroll-hide-bars');

    let mounted = true;
    loadProject()
      .then((loaded) => {
        if (mounted && loaded) {
          setProject(loaded);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
      document.body.classList.remove('hub-scroll-hide-bars');
    };
  }, []);

  const handleUpdateProject = (updates: Partial<MapProject>) => {
    setProject((prev) => {
      const next: MapProject = { ...prev, ...updates };
      saveProject(next).catch(() => {});
      return next;
    });
  };

  const handleCloseToHub = () => {
    document.body.classList.remove('hub-scroll-hide-bars');
    const battleBtn = document.querySelector<HTMLElement>('[data-tab="battle"]');
    if (battleBtn) battleBtn.click();
  };

  const state = useBackpackScreenState({
    project,
    initialFolderTab,
    onClose: handleCloseToHub,
    onUpdateProject: handleUpdateProject,
  });

  const activeScreenNode =
    state.topFolderTab === 'jornada' || state.topFolderTab === 'tarefas'
      ? React.createElement(MobileJornadaTarefasScreen, {
          state,
          questTab: state.topFolderTab,
        })
      : state.topFolderTab === 'deck'
      ? React.createElement(MobileDeckScreen, { state })
      : React.createElement(MobileMochilaScreen, { state });

  return React.createElement(
    'div',
    {
      className: 'no-scrollbar select-none',
      style: {
        width: '100%',
        height: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '8px 8px 20px 8px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        gap: '6px',
        background: 'radial-gradient(ellipse at top, #0a2558 0%, #04122c 65%, #020a1a 100%)',
      },
    },
    state.statusToast
      ? React.createElement(
          'div',
          {
            style: {
              position: 'fixed',
              top: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 3000,
              padding: '6px 16px',
              borderRadius: '9999px',
              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
              border: '2px solid #d4af37',
              color: '#fff3c2',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: '10px',
              pointerEvents: 'none',
            },
          },
          state.statusToast
        )
      : null,
    React.createElement(MobileBackpackTopBar, {
      state,
      isHubFullScreen: true,
    }),
    activeScreenNode
  );
};

export class AcademyScreen {
  private _reactRoot: Root | null = null;

  public render(container: HTMLElement) {
    if (this._reactRoot) {
      try {
        this._reactRoot.unmount();
      } catch {}
      this._reactRoot = null;
    }

    document.body.classList.add('hub-scroll-hide-bars');

    container.innerHTML = `
      <div id="hub-backpack-mobile-mount" style="width: 100%; height: 100%; position: relative; overflow: hidden; background: transparent;"></div>
    `;
    const mountEl = container.querySelector('#hub-backpack-mobile-mount') as HTMLElement | null;
    if (mountEl) {
      this._reactRoot = createRoot(mountEl);
      this._reactRoot.render(React.createElement(MobileHubBackpackApp));
    }
  }

  public destroy() {
    document.body.classList.remove('hub-scroll-hide-bars');
    if (this._reactRoot) {
      try {
        this._reactRoot.unmount();
      } catch {}
      this._reactRoot = null;
    }
  }
}
