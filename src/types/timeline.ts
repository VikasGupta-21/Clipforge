export type ClipType = 'video' | 'audio' | 'caption';
export type AspectRatio = '16:9' | '9:16';
export type CaptionPosition = 'bottom' | 'middle' | 'top';

export interface ClipTransform {
  scale?: number;
  x?: number;
  y?: number;
  rotation?: number;
  opacity?: number;
}

export interface Clip {
  id: string;
  trackId: string;
  type: ClipType;
  sourceUrl: string;
  startAtMs: number;
  durationMs: number;
  trimInMs: number;
  title: string;
  volume: number;
  transform?: ClipTransform;
  textColor?: string;
  fontSize?: 'small' | 'medium' | 'large' | 'xlarge';
  subtitleText?: string;
}

export interface Track {
  id: string;
  type: ClipType;
  label: string;
  isMuted: boolean;
  isLocked: boolean;
  clips: Clip[];
}

export interface TimelineProject {
  id: string;
  title: string;
  durationMs: number;
  currentTimeMs: number;
  isPlaying: boolean;
  zoomLevel: number;
  tracks: Track[];
}

export interface TimelineState {
  currentTimeMs: number;
  isPlaying: boolean;
  durationMs: number;
  tracks: Track[];
  zoomLevel: number;
  selectedClipId: string | null;
  projectTitle: string;
  past: TimelineProject[];
  future: TimelineProject[];
  canUndo: boolean;
  canRedo: boolean;
}

export type CaptionStylePreset = 'classic' | 'tiktok' | 'minimalist';

export interface ToastNotification {
  id: string;
  type: 'success' | 'info' | 'warning';
  title: string;
  message: string;
}

export interface TimelineActions {
  setCurrentTime: (timeMs: number) => void;
  togglePlay: () => void;
  setIsPlaying: (playing: boolean) => void;
  splitClipAtCurrentTime: (clipId: string) => void;
  updateClipPosition: (clipId: string, newStartAtMs: number) => void;
  trimClip: (clipId: string, newDurationMs: number, newTrimInMs?: number) => void;
  deleteClip: (clipId: string) => void;
  setZoomLevel: (zoom: number) => void;
  setSelectedClipId: (clipId: string | null) => void;
  toggleTrackMute: (trackId: string) => void;
  toggleTrackLock: (trackId: string) => void;
  setTracks: (tracks: Track[], durationMs?: number) => void;
  loadProject: (project: Partial<TimelineProject> & { tracks: Track[] }) => void;
  addClip: (trackId: string, clip: Clip) => void;
  updateClipTransform: (
    clipId: string,
    transform: { scale?: number; x?: number; y?: number; rotation?: number; opacity?: number }
  ) => void;
  updateClipVolume: (clipId: string, volume: number) => void;
  updateClipText: (clipId: string, title: string, subtitleText?: string) => void;
  updateClipTiming: (clipId: string, startAtMs: number, durationMs: number) => void;
  // History & Project Persistence actions
  undo: () => void;
  redo: () => void;
  exportProjectJSON: () => string;
  importProjectJSON: (jsonString: string) => boolean;
  saveProjectFile: (customFilename?: string) => void;
}

export type TimelineStore = TimelineState & TimelineActions;
