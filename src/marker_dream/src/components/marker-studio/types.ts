import { MapMarker, MapProject, SavedLevel } from '../../types/map';

export interface MarkerModuleCommonProps {
  marker: MapMarker;
  onUpdateMarker: (id: string, updates: Partial<MapMarker>) => void;
  markers?: MapMarker[];
  project?: MapProject;
  savedLevels?: SavedLevel[];
  galleryAssets?: import('../../types/map').GalleryAsset[];
  galleryCategories?: string[];
  onUploadNewAsset?: (newAsset: import('../../types/map').GalleryAsset) => void;
  onTriggerImportPNG?: () => void;
}
