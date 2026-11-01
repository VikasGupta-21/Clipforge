import type { TimelineProject, Clip } from '../types/timeline';
import { useTimelineStore } from '../store/useTimelineStore';

export interface ExportOptions {
  resolution?: '720p' | '1080p' | '4k';
  fps?: 30 | 60;
  format?: 'webm' | 'mp4';
  quality?: 'high' | 'standard';
  exportDurationMs?: number;
  abortSignal?: AbortSignal;
}

export type ProgressCallback = (
  progress: number,
  status: string,
  currentFrame?: number,
  totalFrames?: number
) => void;

/**
 * Checks browser support for WebM and MP4 MediaRecorder output
 */
export function getSupportedExportFormats(): { webm: boolean; mp4: boolean } {
  if (typeof MediaRecorder === 'undefined') {
    return { webm: false, mp4: false };
  }

  const mp4Mimes = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4;codecs=h264,aac',
    'video/mp4',
  ];
  const webmMimes = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  const mp4Supported = mp4Mimes.some((mime) => MediaRecorder.isTypeSupported(mime));
  const webmSupported = webmMimes.some((mime) => MediaRecorder.isTypeSupported(mime));

  return {
    webm: webmSupported,
    mp4: mp4Supported,
  };
}

/**
 * Renders the timeline project frame-by-frame and exports as a synchronized WebM or MP4 video Blob.
 */
export async function renderTimelineToVideo(
  project: TimelineProject,
  canvasElement: HTMLCanvasElement,
  onProgress: ProgressCallback,
  options?: ExportOptions
): Promise<Blob> {
  // Check MediaRecorder API availability
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder API is not supported in this browser.');
  }

  // Fallback to DOM canvas element if ref was not yet populated
  const activeCanvas =
    canvasElement || (document.getElementById('clipforce-preview-canvas') as HTMLCanvasElement);

  if (!activeCanvas) {
    throw new Error('Canvas element is not available for video compositing.');
  }

  const fps = options?.fps || 30;
  const quality = options?.quality || 'high';
  const durationMs = options?.exportDurationMs || project.durationMs || 30000;
  const totalFrames = Math.max(1, Math.ceil((durationMs / 1000) * fps));
  const abortSignal = options?.abortSignal;

  if (abortSignal?.aborted) {
    throw new DOMException('Export cancelled before starting', 'AbortError');
  }

  // 1. Determine optimal MIME type based on requested format and browser capability
  const requestedFormat = options?.format || 'webm';
  const candidateMimes =
    requestedFormat === 'mp4'
      ? [
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4;codecs=h264,aac',
          'video/mp4',
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
        ]
      : [
          'video/webm;codecs=vp9,opus',
          'video/webm;codecs=vp8,opus',
          'video/webm',
          'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
          'video/mp4',
        ];

  let selectedMime = '';
  for (const mime of candidateMimes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      selectedMime = mime;
      break;
    }
  }

  onProgress(2, 'Mixing Audio Tracks', 0, totalFrames);

  // 2. Set up Web Audio API routing & project audio mixing
  type AudioContextConstructor = typeof AudioContext;
  const AudioContextClass: AudioContextConstructor =
    window.AudioContext ||
    ((window as unknown as { webkitAudioContext: AudioContextConstructor }).webkitAudioContext);

  const audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume();
  }

  const audioDest = audioCtx.createMediaStreamDestination();

  // Create keep-alive carrier oscillator to guarantee live audio stream track
  const silentOsc = audioCtx.createOscillator();
  const silentGain = audioCtx.createGain();
  silentGain.gain.value = 0.00001; // virtually silent
  silentOsc.connect(silentGain);
  silentGain.connect(audioDest);
  silentOsc.start();

  // Extract all active audio and video clips for mixing
  const audioClipsToMix: Clip[] = [];
  project.tracks.forEach((track) => {
    if (!track.isMuted) {
      track.clips.forEach((clip) => {
        if (clip.sourceUrl && (track.type === 'audio' || track.type === 'video')) {
          audioClipsToMix.push(clip);
        }
      });
    }
  });

  interface ScheduledSource {
    source: AudioBufferSourceNode;
    startDelaySec: number;
    offsetSec: number;
    durationSec: number;
  }
  const scheduledSources: ScheduledSource[] = [];

  // Pre-load audio buffers if CORS permits for sample-accurate scheduling
  await Promise.all(
    audioClipsToMix.map(async (clip) => {
      try {
        const resp = await fetch(clip.sourceUrl, { mode: 'cors' });
        if (resp.ok) {
          const arrayBuffer = await resp.arrayBuffer();
          const decoded = await audioCtx.decodeAudioData(arrayBuffer);

          const source = audioCtx.createBufferSource();
          source.buffer = decoded;

          const gainNode = audioCtx.createGain();
          gainNode.gain.value = Math.max(0, clip.volume ?? 1);
          source.connect(gainNode);
          gainNode.connect(audioDest);

          const startDelaySec = Math.max(0, clip.startAtMs / 1000);
          const offsetSec = Math.max(0, clip.trimInMs / 1000);
          const durationSec = clip.durationMs / 1000;

          scheduledSources.push({
            source,
            startDelaySec,
            offsetSec,
            durationSec,
          });
        }
      } catch {
        // Silently continue if cross-origin audio cannot be fetched
      }
    })
  );

  // 3. Capture canvas stream and combine with audio destination
  const canvasStream = activeCanvas.captureStream(fps);
  const combinedTracks: MediaStreamTrack[] = [
    ...canvasStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks(),
  ];
  const combinedStream = new MediaStream(combinedTracks);

  // 4. Initialize MediaRecorder with configured bitrate
  const videoBitsPerSecond = quality === 'high' ? 8_000_000 : 4_000_000;
  const recorderOptions: MediaRecorderOptions = {
    videoBitsPerSecond,
    audioBitsPerSecond: 192_000,
  };
  if (selectedMime) {
    recorderOptions.mimeType = selectedMime;
  }

  const recorder = new MediaRecorder(combinedStream, recorderOptions);
  const recordedChunks: Blob[] = [];

  recorder.ondataavailable = (event: BlobEvent) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  // 5. Save previous timeline state and pause user playback
  const previousTimeMs = useTimelineStore.getState().currentTimeMs;
  const previousIsPlaying = useTimelineStore.getState().isPlaying;

  useTimelineStore.getState().setIsPlaying(false);
  useTimelineStore.getState().setCurrentTime(0);

  // Brief warm-up for canvas frame initialization
  await new Promise((r) => setTimeout(r, 120));

  if (abortSignal?.aborted) {
    silentOsc.stop();
    audioCtx.close().catch(() => {});
    combinedStream.getTracks().forEach((t) => t.stop());
    canvasStream.getTracks().forEach((t) => t.stop());
    useTimelineStore.getState().setCurrentTime(previousTimeMs);
    useTimelineStore.getState().setIsPlaying(previousIsPlaying);
    throw new DOMException('Export cancelled', 'AbortError');
  }

  // 6. Start recorder and schedule audio playback
  recorder.start(250);
  const audioStartTime = audioCtx.currentTime;

  scheduledSources.forEach(({ source, startDelaySec, offsetSec, durationSec }) => {
    try {
      source.start(audioStartTime + startDelaySec, offsetSec, durationSec);
    } catch {
      // Audio source start catch
    }
  });

  onProgress(5, 'Compositing Frames', 0, totalFrames);

  // Enable store playback for smooth real-time video element advancement
  useTimelineStore.getState().setIsPlaying(true);

  const startWallClock = performance.now();

  // Clean-up helper for abort or error
  const cleanupAll = () => {
    try {
      useTimelineStore.getState().setIsPlaying(false);
      useTimelineStore.getState().setCurrentTime(previousTimeMs);
      if (previousIsPlaying) {
        useTimelineStore.getState().setIsPlaying(true);
      }
    } catch {
      // Ignore
    }

    scheduledSources.forEach(({ source }) => {
      try {
        source.stop();
      } catch {
        // Ignore
      }
    });

    try {
      silentOsc.stop();
    } catch {
      // Ignore
    }

    audioCtx.close().catch(() => {});
    combinedStream.getTracks().forEach((t) => t.stop());
    canvasStream.getTracks().forEach((t) => t.stop());
  };

  // 7. Master rendering progress loop
  await new Promise<void>((resolve, reject) => {
    const handleAbort = () => {
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Ignore
        }
      }
      cleanupAll();
      reject(new DOMException('Export cancelled by user', 'AbortError'));
    };

    if (abortSignal) {
      abortSignal.addEventListener('abort', handleAbort, { once: true });
    }

    const intervalId = setInterval(() => {
      if (abortSignal?.aborted) {
        clearInterval(intervalId);
        handleAbort();
        return;
      }

      const elapsedMs = performance.now() - startWallClock;
      const currentFrame = Math.min(totalFrames, Math.round((elapsedMs / 1000) * fps));
      const rawProgress = (elapsedMs / durationMs) * 94;
      const progress = Math.min(95, Math.max(5, Math.round(rawProgress)));

      let stage = 'Compositing Frames';
      if (progress < 8) stage = 'Mixing Audio Tracks';
      else if (progress >= 88) stage = 'Encoding Final Stream';

      onProgress(progress, stage, currentFrame, totalFrames);

      if (elapsedMs >= durationMs) {
        clearInterval(intervalId);
        if (abortSignal) {
          abortSignal.removeEventListener('abort', handleAbort);
        }
        resolve();
      }
    }, 1000 / fps);
  });

  // 8. Finalize encoding and gather stream chunks
  onProgress(97, 'Encoding Final Stream', totalFrames, totalFrames);
  useTimelineStore.getState().setIsPlaying(false);

  const finalBlob = await new Promise<Blob>((resolve) => {
    recorder.onstop = () => {
      const mime = selectedMime || (requestedFormat === 'mp4' ? 'video/mp4' : 'video/webm');
      const blob = new Blob(recordedChunks, { type: mime });
      resolve(blob);
    };

    try {
      recorder.stop();
    } catch {
      const mime = selectedMime || 'video/webm';
      resolve(new Blob(recordedChunks, { type: mime }));
    }
  });

  cleanupAll();
  onProgress(100, 'Export Complete', totalFrames, totalFrames);

  return finalBlob;
}

/**
 * Triggers a browser download with a clean, sanitized filename
 */
export function downloadBlob(blob: Blob, customFilename?: string): void {
  const isMp4 = blob.type.includes('mp4');
  const extension = isMp4 ? 'mp4' : 'webm';
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, '_')
    .replace(/[:.]/g, '-')
    .slice(0, 19);

  const defaultFilename = `ClipForce-Render-${timestamp}.${extension}`;
  const filename = (customFilename || defaultFilename).trim();

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 2000);
}

/**
 * Formats bytes to readable MB / KB representation
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(2)} MB`;
  }
  const kb = bytes / 1024;
  return `${kb.toFixed(1)} KB`;
}
