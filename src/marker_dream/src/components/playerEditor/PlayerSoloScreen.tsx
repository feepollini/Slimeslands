import React from 'react';
import type { MapProject, SavedLevel } from '../../types/map';
import { CharactersSoloScreen } from './CharactersSoloScreen';

export { CharactersSoloScreen };

interface PlayerSoloScreenProps {
  project: MapProject;
  setProject: React.Dispatch<React.SetStateAction<MapProject>>;
  savedLevels?: SavedLevel[];
  onGoToDashboard: () => void;
  onGoToEditor: () => void;
  onPlayLevel?: () => void;
  showToast: (msg: string) => void;
}

export const PlayerSoloScreen: React.FC<PlayerSoloScreenProps> = (props) => {
  return <CharactersSoloScreen {...props} />;
};
