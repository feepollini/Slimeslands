import React from 'react';
import { MarkerModuleCommonProps } from '../types';
import { StationStudioPanel } from '../../station/StationStudioPanel';

export const MarkerStationModule: React.FC<MarkerModuleCommonProps> = ({
  marker,
  project,
  galleryAssets,
  onUpdateMarker,
}) => {
  return (
    <StationStudioPanel
      marker={marker}
      project={project}
      galleryAssets={galleryAssets}
      onUpdateMarker={onUpdateMarker}
    />
  );
};
