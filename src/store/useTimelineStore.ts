import { create } from 'zustand';
import type { Track, TimelineStore, Clip, TimelineProject } from '../types/timeline';

const generateId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const MAX_HISTORY = 40;

function takeProjectSnapshot(state: {
  projectTitle: string;
  durationMs: number;
  currentTimeMs: number;
  zoomLevel: number;
  tracks: Track[];
}): TimelineProject {
  return {
    id: `project-${Date.now()}`,
    title: state.projectTitle || 'ClipForce Master Project',
    durationMs: state.durationMs,
    currentTimeMs: state.currentTimeMs,
    isPlaying: false,
    zoomLevel: state.zoomLevel,
    tracks: JSON.parse(JSON.stringify(state.tracks)),
  };
}

function pushToPast(past: TimelineProject[], snapshot: TimelineProject): TimelineProject[] {
  const newPast = [...past, snapshot];
  if (newPast.length > MAX_HISTORY) {
    return newPast.slice(newPast.length - MAX_HISTORY);
  }
  return newPast;
}

/**
 * Initial sample tracks representing 1 Video, 1 Audio, and 1 Caption track
 */
export const INITIAL_TRACKS: Track[] = [
  {
    id: 'track-video-1',
    type: 'video',
    label: 'Video 1',
    isMuted: false,
    isLocked: false,
    clips: [
      {
        id: 'clip-video-1',
        trackId: 'track-video-1',
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        startAtMs: 0,
        durationMs: 12000,
        trimInMs: 0,
        title: 'Cinematic_Intro.mp4',
        volume: 1,
        transform: {
          scale: 1,
          x: 0,
          y: 0,
        },
      },
      {
        id: 'clip-video-2',
        trackId: 'track-video-1',
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        startAtMs: 12000,
        durationMs: 18000,
        trimInMs: 2000,
        title: 'Main_Scene.mp4',
        volume: 1,
        transform: {
          scale: 1,
          x: 0,
          y: 0,
        },
      },
    ],
  },
  {
    id: 'track-audio-1',
    type: 'audio',
    label: 'Audio 1',
    isMuted: false,
    isLocked: false,
    clips: [
      {
        id: 'clip-audio-1',
        trackId: 'track-audio-1',
        type: 'audio',
        sourceUrl: 'https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg',
        startAtMs: 0,
        durationMs: 30000,
        trimInMs: 0,
        title: 'Background_Ambience.mp3',
        volume: 0.8,
      },
    ],
  },
  {
    id: 'track-caption-1',
    type: 'caption',
    label: 'Captions 1',
    isMuted: false,
    isLocked: false,
    clips: [
      {
        id: 'clip-caption-1',
        trackId: 'track-caption-1',
        type: 'caption',
        sourceUrl: '',
        startAtMs: 1000,
        durationMs: 4500,
        trimInMs: 0,
        title: 'Welcome to ClipForce',
        volume: 1,
      },
      {
        id: 'clip-caption-2',
        trackId: 'track-caption-1',
        type: 'caption',
        sourceUrl: '',
        startAtMs: 6500,
        durationMs: 5000,
        trimInMs: 0,
        title: 'High Performance Video Editing',
        volume: 1,
      },
      {
        id: 'clip-caption-3',
        trackId: 'track-caption-1',
        type: 'caption',
        sourceUrl: '',
        startAtMs: 13000,
        durationMs: 6000,
        trimInMs: 0,
        title: 'Zustand-Powered Timeline State',
        volume: 1,
      },
    ],
  },
];

export const INITIAL_DURATION_MS = 30000; // 30 seconds default timeline duration

export const useTimelineStore = create<TimelineStore>((set, get) => ({
  currentTimeMs: 0,
  isPlaying: false,
  durationMs: INITIAL_DURATION_MS,
  tracks: INITIAL_TRACKS,
  zoomLevel: 1,
  selectedClipId: null,
  projectTitle: 'ClipForce Master Project',
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  setCurrentTime: (timeMs: number) => {
    set((state) => ({
      currentTimeMs: Math.max(0, Math.min(timeMs, state.durationMs)),
    }));
  },

  togglePlay: () => {
    set((state) => {
      const nextPlaying = !state.isPlaying;
      const nextTime =
        nextPlaying && state.currentTimeMs >= state.durationMs ? 0 : state.currentTimeMs;
      return {
        isPlaying: nextPlaying,
        currentTimeMs: nextTime,
      };
    });
  },

  setIsPlaying: (playing: boolean) => {
    set({ isPlaying: playing });
  },

  splitClipAtCurrentTime: (clipId: string) => {
    set((state) => {
      const { currentTimeMs, tracks } = state;

      let foundTrackIndex = -1;
      let foundClipIndex = -1;

      for (let t = 0; t < tracks.length; t++) {
        const cIndex = tracks[t].clips.findIndex((clip) => clip.id === clipId);
        if (cIndex !== -1) {
          foundTrackIndex = t;
          foundClipIndex = cIndex;
          break;
        }
      }

      if (foundTrackIndex === -1 || foundClipIndex === -1) {
        return state;
      }

      const targetTrack = tracks[foundTrackIndex];
      if (targetTrack.isLocked) {
        return state;
      }

      const originalClip = targetTrack.clips[foundClipIndex];
      const clipStart = originalClip.startAtMs;
      const clipEnd = originalClip.startAtMs + originalClip.durationMs;

      // Playhead must be strictly inside the clip to perform a split
      if (currentTimeMs <= clipStart || currentTimeMs >= clipEnd) {
        return state;
      }

      const splitOffsetMs = currentTimeMs - clipStart;
      const firstDurationMs = splitOffsetMs;
      const secondDurationMs = originalClip.durationMs - splitOffsetMs;

      const firstPart = {
        ...originalClip,
        durationMs: firstDurationMs,
      };

      const secondPart = {
        ...originalClip,
        id: generateId(`${originalClip.id}-split`),
        startAtMs: currentTimeMs,
        durationMs: secondDurationMs,
        trimInMs: originalClip.trimInMs + splitOffsetMs,
        title: `${originalClip.title} (Part 2)`,
        transform: originalClip.transform ? { ...originalClip.transform } : undefined,
      };

      const updatedClips = [
        ...targetTrack.clips.slice(0, foundClipIndex),
        firstPart,
        secondPart,
        ...targetTrack.clips.slice(foundClipIndex + 1),
      ];

      const updatedTracks = tracks.map((track, idx) =>
        idx === foundTrackIndex ? { ...track, clips: updatedClips } : track
      );

      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: updatedTracks,
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  updateClipPosition: (clipId: string, newStartAtMs: number) => {
    set((state) => {
      const sanitizedStart = Math.max(0, Math.round(newStartAtMs));
      let maxEndMs = state.durationMs;
      let clipUpdated = false;

      const updatedTracks = state.tracks.map((track) => {
        const hasClip = track.clips.some((c) => c.id === clipId);
        if (!hasClip || track.isLocked) {
          return track;
        }

        clipUpdated = true;
        const updatedClips = track.clips.map((clip) => {
          if (clip.id !== clipId) {
            return clip;
          }
          const endMs = sanitizedStart + clip.durationMs;
          if (endMs > maxEndMs) {
            maxEndMs = endMs;
          }
          return {
            ...clip,
            startAtMs: sanitizedStart,
          };
        });

        updatedClips.sort((a, b) => a.startAtMs - b.startAtMs);

        return {
          ...track,
          clips: updatedClips,
        };
      });

      if (!clipUpdated) {
        return state;
      }

      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: updatedTracks,
        durationMs: Math.max(state.durationMs, maxEndMs),
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  trimClip: (clipId: string, newDurationMs: number, newTrimInMs?: number) => {
    set((state) => {
      const sanitizedDuration = Math.max(50, Math.round(newDurationMs));
      let maxEndMs = state.durationMs;
      let clipUpdated = false;

      const updatedTracks = state.tracks.map((track) => {
        const hasClip = track.clips.some((c) => c.id === clipId);
        if (!hasClip || track.isLocked) {
          return track;
        }

        clipUpdated = true;
        const updatedClips = track.clips.map((clip) => {
          if (clip.id !== clipId) {
            return clip;
          }
          const endMs = clip.startAtMs + sanitizedDuration;
          if (endMs > maxEndMs) {
            maxEndMs = endMs;
          }
          return {
            ...clip,
            durationMs: sanitizedDuration,
            trimInMs:
              newTrimInMs !== undefined
                ? Math.max(0, Math.round(newTrimInMs))
                : clip.trimInMs,
          };
        });

        return {
          ...track,
          clips: updatedClips,
        };
      });

      if (!clipUpdated) {
        return state;
      }

      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: updatedTracks,
        durationMs: Math.max(state.durationMs, maxEndMs),
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  deleteClip: (clipId: string) => {
    set((state) => {
      let clipDeleted = false;

      const updatedTracks = state.tracks.map((track) => {
        if (track.isLocked) {
          return track;
        }

        const filteredClips = track.clips.filter((clip) => clip.id !== clipId);
        if (filteredClips.length !== track.clips.length) {
          clipDeleted = true;
          return {
            ...track,
            clips: filteredClips,
          };
        }

        return track;
      });

      if (!clipDeleted) {
        return state;
      }

      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: updatedTracks,
        selectedClipId: state.selectedClipId === clipId ? null : state.selectedClipId,
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  setZoomLevel: (zoom: number) => {
    set({
      zoomLevel: Math.max(0.1, Math.min(10, zoom)),
    });
  },

  setSelectedClipId: (clipId: string | null) => {
    set({ selectedClipId: clipId });
  },

  toggleTrackMute: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, isMuted: !track.isMuted } : track
      ),
    }));
  },

  toggleTrackLock: (trackId: string) => {
    set((state) => ({
      tracks: state.tracks.map((track) =>
        track.id === trackId ? { ...track, isLocked: !track.isLocked } : track
      ),
    }));
  },

  setTracks: (tracks: Track[], durationMs?: number) => {
    set((state) => {
      let calculatedDuration = durationMs ?? state.durationMs;
      if (!durationMs) {
        for (const track of tracks) {
          for (const clip of track.clips) {
            const end = clip.startAtMs + clip.durationMs;
            if (end > calculatedDuration) calculatedDuration = end;
          }
        }
      }
      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks,
        durationMs: calculatedDuration,
        currentTimeMs: Math.min(state.currentTimeMs, calculatedDuration),
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  loadProject: (project) => {
    set((state) => {
      let maxDuration = project.durationMs ?? 0;
      if (!project.durationMs) {
        for (const track of project.tracks) {
          for (const clip of track.clips) {
            const end = clip.startAtMs + clip.durationMs;
            if (end > maxDuration) maxDuration = end;
          }
        }
      }
      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: project.tracks,
        durationMs: Math.max(10000, maxDuration),
        currentTimeMs: 0,
        isPlaying: false,
        selectedClipId: null,
        zoomLevel: project.zoomLevel ?? state.zoomLevel,
        projectTitle: project.title || state.projectTitle,
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  addClip: (trackId: string, clip: Clip) => {
    set((state) => {
      let maxDuration = state.durationMs;
      const clipEnd = clip.startAtMs + clip.durationMs;
      if (clipEnd > maxDuration) {
        maxDuration = clipEnd;
      }

      const updatedTracks = state.tracks.map((track) => {
        if (track.id !== trackId || track.isLocked) return track;
        const newClips = [...track.clips, clip].sort((a, b) => a.startAtMs - b.startAtMs);
        return {
          ...track,
          clips: newClips,
        };
      });

      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: updatedTracks,
        durationMs: maxDuration,
        selectedClipId: clip.id,
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  updateClipTransform: (clipId, transform) => {
    set((state) => {
      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: state.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              transform: {
                scale: 1,
                x: 0,
                y: 0,
                rotation: 0,
                opacity: 1,
                ...clip.transform,
                ...transform,
              },
            };
          }),
        })),
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  updateClipVolume: (clipId, volume) => {
    set((state) => {
      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: state.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              volume: Math.max(0, Math.min(2, Number(volume.toFixed(2)))),
            };
          }),
        })),
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  updateClipText: (clipId, title, subtitleText) => {
    set((state) => {
      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: state.tracks.map((track) => ({
          ...track,
          clips: track.clips.map((clip) => {
            if (clip.id !== clipId) return clip;
            return {
              ...clip,
              title,
              subtitleText: subtitleText !== undefined ? subtitleText : clip.subtitleText,
            };
          }),
        })),
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  updateClipTiming: (clipId, startAtMs, durationMs) => {
    set((state) => {
      const sanitizedStart = Math.max(0, Math.round(startAtMs));
      const sanitizedDuration = Math.max(100, Math.round(durationMs));
      let maxDuration = state.durationMs;

      const updatedTracks = state.tracks.map((track) => {
        const hasClip = track.clips.some((c) => c.id === clipId);
        if (!hasClip || track.isLocked) return track;

        const updatedClips = track.clips.map((clip) => {
          if (clip.id !== clipId) return clip;
          const end = sanitizedStart + sanitizedDuration;
          if (end > maxDuration) maxDuration = end;
          return {
            ...clip,
            startAtMs: sanitizedStart,
            durationMs: sanitizedDuration,
          };
        });

        updatedClips.sort((a, b) => a.startAtMs - b.startAtMs);
        return {
          ...track,
          clips: updatedClips,
        };
      });

      const snapshot = takeProjectSnapshot(state);
      const past = pushToPast(state.past, snapshot);

      return {
        tracks: updatedTracks,
        durationMs: Math.max(state.durationMs, maxDuration),
        past,
        future: [],
        canUndo: true,
        canRedo: false,
      };
    });
  },

  // History Actions: Undo
  undo: () => {
    set((state) => {
      if (state.past.length === 0) return state;

      const previousSnapshot = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const currentSnapshot = takeProjectSnapshot(state);
      const newFuture = [currentSnapshot, ...state.future];

      return {
        tracks: previousSnapshot.tracks,
        durationMs: previousSnapshot.durationMs,
        zoomLevel: previousSnapshot.zoomLevel,
        projectTitle: previousSnapshot.title,
        past: newPast,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: newFuture.length > 0,
        selectedClipId: null,
      };
    });
  },

  // History Actions: Redo
  redo: () => {
    set((state) => {
      if (state.future.length === 0) return state;

      const nextSnapshot = state.future[0];
      const newFuture = state.future.slice(1);
      const currentSnapshot = takeProjectSnapshot(state);
      const newPast = pushToPast(state.past, currentSnapshot);

      return {
        tracks: nextSnapshot.tracks,
        durationMs: nextSnapshot.durationMs,
        zoomLevel: nextSnapshot.zoomLevel,
        projectTitle: nextSnapshot.title,
        past: newPast,
        future: newFuture,
        canUndo: newPast.length > 0,
        canRedo: newFuture.length > 0,
        selectedClipId: null,
      };
    });
  },

  // Project Ingestion: Export JSON string
  exportProjectJSON: () => {
    const state = get();
    const project = {
      id: `clipforce-proj-${Date.now()}`,
      title: state.projectTitle || 'ClipForce Master Project',
      durationMs: state.durationMs,
      currentTimeMs: state.currentTimeMs,
      isPlaying: false,
      zoomLevel: state.zoomLevel,
      tracks: state.tracks,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(project, null, 2);
  },

  // Project Ingestion: Trigger browser file download
  saveProjectFile: (customFilename?: string) => {
    const jsonString = get().exportProjectJSON();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    const timestamp = new Date()
      .toISOString()
      .replace(/T/, '_')
      .replace(/[:.]/g, '-')
      .slice(0, 19);
    const filename = customFilename || `ClipForce-Project-${timestamp}.clipforce`;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  },

  // Project Ingestion: Import and validate schema
  importProjectJSON: (jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') return false;
      if (!Array.isArray(parsed.tracks)) return false;

      const validTracks: Track[] = parsed.tracks.map((t: Track, tIdx: number) => ({
        id: t.id || `track-${tIdx}`,
        type: t.type || 'video',
        label: t.label || `Track ${tIdx + 1}`,
        isMuted: Boolean(t.isMuted),
        isLocked: Boolean(t.isLocked),
        clips: Array.isArray(t.clips)
          ? t.clips.map((c: Clip, cIdx: number) => ({
              id: c.id || `clip-${tIdx}-${cIdx}`,
              trackId: t.id || `track-${tIdx}`,
              type: c.type || t.type || 'video',
              sourceUrl: c.sourceUrl || '',
              startAtMs: Number(c.startAtMs) || 0,
              durationMs: Number(c.durationMs) || 5000,
              trimInMs: Number(c.trimInMs) || 0,
              title: c.title || `Clip ${cIdx + 1}`,
              volume: typeof c.volume === 'number' ? c.volume : 1,
              transform: c.transform ? { ...c.transform } : undefined,
              textColor: c.textColor,
              fontSize: c.fontSize,
              subtitleText: c.subtitleText,
            }))
          : [],
      }));

      set((state) => {
        const snapshot = takeProjectSnapshot(state);
        const past = pushToPast(state.past, snapshot);
        return {
          tracks: validTracks,
          durationMs: Number(parsed.durationMs) || state.durationMs,
          zoomLevel: Number(parsed.zoomLevel) || state.zoomLevel,
          currentTimeMs: 0,
          isPlaying: false,
          selectedClipId: null,
          projectTitle: parsed.title || 'Imported ClipForce Project',
          past,
          future: [],
          canUndo: true,
          canRedo: false,
        };
      });
      return true;
    } catch (err) {
      console.error('[TimelineStore] Failed to import project JSON:', err);
      return false;
    }
  },
}));
