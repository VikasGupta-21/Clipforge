export type MediaType = 'video' | 'audio' | 'image';
export type MediaFilter = 'all' | 'video' | 'audio' | 'image';

export interface MediaAsset {
  id: string;
  name: string;
  type: MediaType;
  url: string;
  blob: Blob | File;
  durationMs: number;
  width?: number;
  height?: number;
  sizeFormatted: string;
  thumbnail?: string;
}

export interface MediaStoreState {
  assets: MediaAsset[];
  isUploading: boolean;
  activeFilter: MediaFilter;
}

export interface MediaStoreActions {
  addAsset: (asset: MediaAsset) => void;
  removeAsset: (id: string) => void;
  setFilter: (filter: MediaFilter) => void;
  extractMediaMetadata: (file: File) => Promise<MediaAsset>;
}

export type MediaStore = MediaStoreState & MediaStoreActions;
