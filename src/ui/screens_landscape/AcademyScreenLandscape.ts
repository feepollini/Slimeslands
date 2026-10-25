import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import '../../marker_dream/src/index.css';
import type { MapProject } from '../../marker_dream/src/types/map';
import { loadProject, saveProject } from '../../marker_dream/src/utils/storage';
import { createFaseMestraProject } from '../../marker_dream/src/data/masterTestPhase';
import {
  useBackpackScreenState,
  ConceptStar,
} from '../screens/backpack_shared/useBackpackScreenState';
import { LandscapeBackpackTopBar } from './backpack_landscape/LandscapeBackpackTopBar';
import { LandscapeMochilaScreen } from './backpack_landscape/LandscapeMochilaScreen';
import { LandscapeDeckScreen } from './backpack_landscape/LandscapeDeckScreen';
import { LandscapeJornadaTarefasScreen } from './backpack_landscape/LandscapeJornadaTarefasScreen';

const LandscapeHubBackpackApp: React.FC = () => {
  const [project, setProject] = useState<MapProject>(() => createFaseMestraProject());
  const [compactLandscape, setCompactLandscape] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerHeight < 540 : false
  );

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
    // Oculta header e barra de navegação do Hub ao entrar na Mochila para aproveitar 100% da tela
    document.body.classList.add('hub-scroll-hide-bars');

    const handleResize = () => {
      setCompactLandscape(window.innerHeight < 540);
    };
    window.addEventListener('resize', handleResize, { passive: true });

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
      window.removeEventListener('resize', handleResize);
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
      ? React.createElement(LandscapeJornadaTarefasScreen, {
          state,
          questTab: state.topFolderTab,
          compactLandscape,
        })
      : state.topFolderTab === 'deck'
      ? React.createElement(LandscapeDeckScreen, { state, compactLandscape })
      : React.createElement(LandscapeMochilaScreen, { state, compactLandscape });

  return React.createElement(
    'div',
    {
      className: 'no-scrollbar select-none',
      style: {
        width: '100%',
        height: '100%',
        maxHeight: '100dvh',
        overflow: 'hidden',
        padding: compactLandscape ? '4px 8px' : '8px 18px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
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
              padding: '6px 18px',
              borderRadius: '9999px',
              background: 'linear-gradient(180deg, #0b3778 0%, #041b42 100%)',
              border: '2px solid #d4af37',
              color: '#fff3c2',
              fontFamily: "'Cinzel', serif",
              fontWeight: 900,
              fontSize: '11px',
              pointerEvents: 'none',
              boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
            },
          },
          state.statusToast
        )
      : null,
    React.createElement(
      'div',
      {
        style: {
          width: '100%',
          maxWidth: '1240px',
          height: '100%',
          maxHeight: '100%',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: compactLandscape ? '4px' : '6px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        },
      },
      // Moldura Principal Dourada Ornamentada ocupando 100% da área útil sem rolagem externa
      React.createElement(
        'div',
        {
          style: {
            position: 'relative',
            flex: 1,
            minHeight: 0,
            height: '100%',
            borderRadius: compactLandscape ? '20px' : '26px',
            padding: compactLandscape ? '6px' : '10px',
            background: 'linear-gradient(180deg, #fffdf9 0%, #f5ebd6 100%)',
            border: '3px solid #d4af37',
            outline: '1.5px solid #784808',
            boxShadow:
              '0 0 28px rgba(212, 175, 55, 0.28), 0 14px 36px rgba(0, 6, 18, 0.7), inset 0 1px 0 #ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: compactLandscape ? '6px' : '8px',
            boxSizing: 'border-box',
            overflow: 'hidden',
          },
        },
        React.createElement(LandscapeBackpackTopBar, {
          state,
          isHubFullScreen: true,
          compactLandscape,
        }),
        activeScreenNode
      )
    )
  );
};

export class AcademyScreenLandscape {
  private _reactRoot: Root | null = null;

  public render(container: HTMLElement) {
    if (this._reactRoot) {
      try {
        this._reactRoot.unmount();
      } catch {}
      this._reactRoot = null;
    }

    container.innerHTML = `
      <div id="hub-backpack-landscape-mount" style="width: 100%; height: 100%; position: relative; overflow: hidden; background: transparent;"></div>
    `;
    const mountEl = container.querySelector('#hub-backpack-landscape-mount') as HTMLElement | null;
    if (mountEl) {
      this._reactRoot = createRoot(mountEl);
      this._reactRoot.render(React.createElement(LandscapeHubBackpackApp));
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
