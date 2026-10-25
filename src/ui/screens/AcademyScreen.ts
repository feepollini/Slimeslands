import React, { useState, useEffect } from 'react';
import { createRoot, Root } from 'react-dom/client';
import '../../marker_dream/src/index.css';
import type { MapProject } from '../../marker_dream/src/types/map';
import { loadProject, saveProject } from '../../marker_dream/src/utils/storage';
import { createFaseMestraProject } from '../../marker_dream/src/data/masterTestPhase';
import {
  GameBackpackPopupModal,
  QuestJourneyPopupModal,
} from '../../marker_dream/src/components/screens/HudStatusAndQuestsWidgets';
import { OrientationManager } from '../OrientationManager';

const HubPhaseBackpackBridge: React.FC<{ forceLandscape?: boolean }> = ({ forceLandscape }) => {
  const [project, setProject] = useState<MapProject>(() => createFaseMestraProject());
  const [activeModal, setActiveModal] = useState<'backpack' | 'quests'>('backpack');
  const [isLandscape, setIsLandscape] = useState<boolean>(
    () => Boolean(forceLandscape) || OrientationManager.isLandscape()
  );

  useEffect(() => {
    let mounted = true;
    loadProject()
      .then((loaded) => {
        if (mounted && loaded) {
          setProject(loaded);
        }
      })
      .catch(() => {});

    const onResize = () => {
      setIsLandscape(Boolean(forceLandscape) || OrientationManager.isLandscape());
    };
    window.addEventListener('resize', onResize);
    return () => {
      mounted = false;
      window.removeEventListener('resize', onResize);
      document.body.classList.remove('hub-scroll-hide-bars');
    };
  }, [forceLandscape]);

  const handleUpdateProject = (updates: Partial<MapProject>) => {
    setProject((prev) => {
      const next: MapProject = { ...prev, ...updates };
      saveProject(next).catch(() => {});
      return next;
    });
  };

  return React.createElement(
    'div',
    {
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: 'transparent',
      },
    },
    activeModal === 'backpack'
      ? React.createElement(GameBackpackPopupModal, {
          project,
          isInsideEmulator: true,
          isHubFullScreen: true,
          isLandscape,
          onClose: () => {
            const battleBtn = document.querySelector<HTMLElement>('[data-tab="battle"]');
            if (battleBtn) battleBtn.click();
          },
          onSwitchToQuests: () => {
            document.body.classList.remove('hub-scroll-hide-bars');
            setActiveModal('quests');
          },
          onUpdateProject: handleUpdateProject,
        })
      : React.createElement(QuestJourneyPopupModal, {
          project,
          isInsideEmulator: true,
          isHubFullScreen: true,
          isLandscape,
          onClose: () => {
            document.body.classList.remove('hub-scroll-hide-bars');
            setActiveModal('backpack');
          },
          onSwitchToBackpack: () => {
            document.body.classList.remove('hub-scroll-hide-bars');
            setActiveModal('backpack');
          },
          onUpdateProject: handleUpdateProject,
        })
  );
};

export class AcademyScreen {
  private _reactRoot: Root | null = null;
  protected isLandscapeLayout = false;

  public render(container: HTMLElement) {
    if (this._reactRoot) {
      try {
        this._reactRoot.unmount();
      } catch {}
      this._reactRoot = null;
    }

    container.innerHTML = `
      <div id="hub-backpack-mount" style="width: 100%; height: 100%; position: relative; overflow: hidden; background: transparent;"></div>
    `;
    const mountEl = container.querySelector('#hub-backpack-mount') as HTMLElement | null;
    if (mountEl) {
      this._reactRoot = createRoot(mountEl);
      this._reactRoot.render(
        React.createElement(HubPhaseBackpackBridge, {
          forceLandscape: this.isLandscapeLayout,
        })
      );
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
