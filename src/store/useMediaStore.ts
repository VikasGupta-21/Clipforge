import { create } from 'zustand';
import type { MediaAsset, MediaFilter, MediaStore, MediaType } from '../types/media';

const generateId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;
};

/**
 * Formats raw file byte count into human-readable string (e.g. 14.5 MB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Initial sample media assets for instant testing and demonstration
 */
const INITIAL_ASSETS: MediaAsset[] = [
  {
    id: 'asset-sample-v1',
    name: 'ForBiggerBlazes.mp4',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    blob: new Blob([], { type: 'video/mp4' }),
    durationMs: 12000,
    width: 1920,
    height: 1080,
    sizeFormatted: '15.4 MB',
    thumbnail: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=320&auto=format&fit=crop&q=60',
  },
  {
    id: 'asset-sample-v2',
    name: 'BigBuckBunny.mp4',
    type: 'video',
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    blob: new Blob([], { type: 'video/mp4' }),
    durationMs: 18000,
    width: 1920,
    height: 1080,
    sizeFormatted: '22.1 MB',
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=320&auto=format&fit=crop&q=60',
  },
  {
    id: 'asset-sample-a1',
    name: 'Daytime_Forest_Bonfire.ogg',
    type: 'audio',
    url: 'https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg',
    blob: new Blob([], { type: 'audio/ogg' }),
    durationMs: 30000,
    sizeFormatted: '3.8 MB',
  },
  {
    id: 'asset-sample-i1',
    name: 'Cyberpunk_Neon_City.jpg',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=800&auto=format&fit=crop&q=80',
    blob: new Blob([], { type: 'image/jpeg' }),
    durationMs: 5000, // Standard 5s duration for image slides on timeline
    width: 1920,
    height: 1080,
    sizeFormatted: '1.2 MB',
    thumbnail: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=320&auto=format&fit=crop&q=60',
  },
];

export const useMediaStore = create<MediaStore>((set) => ({
  assets: INITIAL_ASSETS,
  isUploading: false,
  activeFilter: 'all',

  addAsset: (asset: MediaAsset) => {
    set((state) => ({
      assets: [asset, ...state.assets],
    }));
  },

  removeAsset: (id: string) => {
    set((state) => ({
      assets: state.assets.filter((a) => a.id !== id),
    }));
  },

  setFilter: (filter: MediaFilter) => {
    set({ activeFilter: filter });
  },

  extractMediaMetadata: async (file: File): Promise<MediaAsset> => {
    const fileUrl = URL.createObjectURL(file);
    const sizeFormatted = formatBytes(file.size);
    const mime = file.type.toLowerCase();

    let mediaType: MediaType = 'image';
    if (mime.startsWith('video/') || /\.(mp4|webm|mov|mkv)$/i.test(file.name)) {
      mediaType = 'video';
    } else if (mime.startsWith('audio/') || /\.(mp3|wav|ogg|aac|m4a)$/i.test(file.name)) {
      mediaType = 'audio';
    }

    // 1. Process Video Asset
    if (mediaType === 'video') {
      return new Promise<MediaAsset>((resolve) => {
        const video = document.createElement('video');
        video.src = fileUrl;
        video.preload = 'metadata';
        video.muted = true;
        video.playsInline = true;

        let resolved = false;

        const cleanup = () => {
          video.removeEventListener('loadedmetadata', onLoaded);
          video.removeEventListener('seeked', onSeeked);
          video.removeEventListener('error', onError);
        };

        const onSeeked = () => {
          if (resolved) return;
          resolved = true;
          let thumbnail: string | undefined = undefined;
          try {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 180;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              thumbnail = canvas.toDataURL('image/jpeg', 0.8);
            }
          } catch {
            // If canvas capture fails, continue without thumbnail
          }

          cleanup();
          resolve({
            id: generateId('asset-v'),
            name: file.name,
            type: 'video',
            url: fileUrl,
            blob: file,
            durationMs: Math.max(1000, Math.round((video.duration || 10) * 1000)),
            width: video.videoWidth || 1920,
            height: video.videoHeight || 1080,
            sizeFormatted,
            thumbnail,
          });
        };

        const onLoaded = () => {
          // Seek halfway into the video or at 1s to grab a thumbnail
          const seekTime = Math.min(1.5, (video.duration || 2) / 2);
          video.currentTime = seekTime;
        };

        const onError = () => {
          if (resolved) return;
          resolved = true;
          cleanup();
          resolve({
            id: generateId('asset-v'),
            name: file.name,
            type: 'video',
            url: fileUrl,
            blob: file,
            durationMs: 10000,
            width: 1920,
            height: 1080,
            sizeFormatted,
          });
        };

        video.addEventListener('loadedmetadata', onLoaded);
        video.addEventListener('seeked', onSeeked);
        video.addEventListener('error', onError);

        // Fallback safety timeout
        setTimeout(() => {
          if (!resolved) {
            onError();
          }
        }, 4000);
      });
    }

    // 2. Process Audio Asset
    if (mediaType === 'audio') {
      return new Promise<MediaAsset>((resolve) => {
        const audio = document.createElement('audio');
        audio.src = fileUrl;
        audio.preload = 'metadata';

        let resolved = false;

        const onLoaded = () => {
          if (resolved) return;
          resolved = true;
          const durationMs = Math.max(1000, Math.round((audio.duration || 15) * 1000));
          resolve({
            id: generateId('asset-a'),
            name: file.name,
            type: 'audio',
            url: fileUrl,
            blob: file,
            durationMs,
            sizeFormatted,
          });
        };

        const onError = () => {
          if (resolved) return;
          resolved = true;
          resolve({
            id: generateId('asset-a'),
            name: file.name,
            type: 'audio',
            url: fileUrl,
            blob: file,
            durationMs: 15000,
            sizeFormatted,
          });
        };

        audio.addEventListener('loadedmetadata', onLoaded);
        audio.addEventListener('error', onError);

        setTimeout(() => {
          if (!resolved) {
            onError();
          }
        }, 3000);
      });
    }

    // 3. Process Image Asset
    return new Promise<MediaAsset>((resolve) => {
      const img = new Image();
      img.src = fileUrl;

      let resolved = false;

      const onLoaded = () => {
        if (resolved) return;
        resolved = true;
        let thumbnail: string | undefined = undefined;
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Draw aspect cover or contain
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            const scale = Math.min(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
            const dw = img.naturalWidth * scale;
            const dh = img.naturalHeight * scale;
            ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
            thumbnail = canvas.toDataURL('image/jpeg', 0.85);
          }
        } catch {
          // Ignore canvas thumbnail errors
        }

        resolve({
          id: generateId('asset-i'),
          name: file.name,
          type: 'image',
          url: fileUrl,
          blob: file,
          durationMs: 5000, // Standard 5s image clip duration
          width: img.naturalWidth || 1920,
          height: img.naturalHeight || 1080,
          sizeFormatted,
          thumbnail: thumbnail || fileUrl,
        });
      };

      const onError = () => {
        if (resolved) return;
        resolved = true;
        resolve({
          id: generateId('asset-i'),
          name: file.name,
          type: 'image',
          url: fileUrl,
          blob: file,
          durationMs: 5000,
          width: 1920,
          height: 1080,
          sizeFormatted,
          thumbnail: fileUrl,
        });
      };

      img.onload = onLoaded;
      img.onerror = onError;

      setTimeout(() => {
        if (!resolved) {
          onError();
        }
      }, 3000);
    });
  },
}));
