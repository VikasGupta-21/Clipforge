import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Monitor,
  Smartphone,
  RotateCcw,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Film,
  Sparkles,
} from 'lucide-react';
import { useTimelineStore } from '../../store/useTimelineStore';
import type { AspectRatio, CaptionPosition, Clip } from '../../types/timeline';
import { formatTimecode } from '../../utils/timelineUtils';

export interface VideoCanvasProps {
  canvasRef?: React.RefObject<HTMLCanvasElement | null>;
}

export const VideoCanvas: React.FC<VideoCanvasProps> = ({ canvasRef: externalCanvasRef }) => {
  const tracks = useTimelineStore((state) => state.tracks);
  const currentTimeMs = useTimelineStore((state) => state.currentTimeMs);
  const durationMs = useTimelineStore((state) => state.durationMs);
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const togglePlay = useTimelineStore((state) => state.togglePlay);
  const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);

  // Aspect ratio state (16:9 landscape vs 9:16 vertical reel)
  const [aspectRatio, setAspectRation] = useState<AspectRatio>('16:9');

  // Caption positioning state (bottom, middle, top)
  const [captionPosition, setCaptionPosition] = useState<CaptionPosition>('bottom');

  // Fullscreen state for player container
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const internalCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const canvasRef = externalCanvasRef || internalCanvasRef;

  // Check if media source is an image
  const isImageSource = useCallback((url: string, title?: string): boolean => {
    if (url.startsWith('data:image/')) return true;
    if (/\.(png|jpe?g|webp|gif|svg)(\?.*)?$/i.test(url)) return true;
    if (title && /\.(png|jpe?g|webp|gif|svg)$/i.test(title)) return true;
    return false;
  }, []);

  // Pools of pre-instantiated media elements
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const imageElementsRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());

  // Locate active video clip at currentTimeMs
  const activeVideoClip = useMemo<Clip | null>(() => {
    const videoTrack = tracks.find((t) => t.type === 'video' && !t.isMuted);
    if (!videoTrack) return null;
    return (
      videoTrack.clips.find(
        (c) =>
          currentTimeMs >= c.startAtMs &&
          currentTimeMs < c.startAtMs + c.durationMs
      ) || null
    );
  }, [tracks, currentTimeMs]);

  // Locate active caption clip at currentTimeMs
  const activeCaptionClip = useMemo<Clip | null>(() => {
    const captionTrack = tracks.find((t) => t.type === 'caption' && !t.isMuted);
    if (!captionTrack) return null;
    return (
      captionTrack.clips.find(
        (c) =>
          currentTimeMs >= c.startAtMs &&
          currentTimeMs < c.startAtMs + c.durationMs
      ) || null
    );
  }, [tracks, currentTimeMs]);

  // Prepare and synchronize HTMLVideoElements & HTMLImageElements
  useEffect(() => {
    const videoTrack = tracks.find((t) => t.type === 'video');
    if (videoTrack) {
      videoTrack.clips.forEach((clip) => {
        if (!clip.sourceUrl) return;

        if (isImageSource(clip.sourceUrl, clip.title)) {
          if (!imageElementsRef.current.has(clip.sourceUrl)) {
            const img = new Image();
            if (!clip.sourceUrl.startsWith('blob:')) {
              img.crossOrigin = 'anonymous';
            }
            img.src = clip.sourceUrl;
            imageElementsRef.current.set(clip.sourceUrl, img);
          }
        } else {
          if (!videoElementsRef.current.has(clip.sourceUrl)) {
            const video = document.createElement('video');
            video.src = clip.sourceUrl;
            // Only set crossOrigin on non-blob URLs
            if (!clip.sourceUrl.startsWith('blob:')) {
              video.crossOrigin = 'anonymous';
            }
            video.playsInline = true;
            video.muted = true;
            video.preload = 'auto';
            videoElementsRef.current.set(clip.sourceUrl, video);
          }
        }
      });
    }

    const audioTrack = tracks.find((t) => t.type === 'audio');
    if (audioTrack) {
      audioTrack.clips.forEach((clip) => {
        if (clip.sourceUrl && !audioElementsRef.current.has(clip.sourceUrl)) {
          const audio = document.createElement('audio');
          audio.src = clip.sourceUrl;
          if (!clip.sourceUrl.startsWith('blob:')) {
            audio.crossOrigin = 'anonymous';
          }
          audio.preload = 'auto';
          audioElementsRef.current.set(clip.sourceUrl, audio);
        }
      });
    }
  }, [tracks, isImageSource]);

  // Synchronize active video playback and seeking
  useEffect(() => {
    if (!activeVideoClip?.sourceUrl || isImageSource(activeVideoClip.sourceUrl, activeVideoClip.title)) {
      videoElementsRef.current.forEach((video) => {
        if (!video.paused) video.pause();
      });
      return;
    }

    const video = videoElementsRef.current.get(activeVideoClip.sourceUrl);
    if (!video) return;

    const clipOffsetMs = currentTimeMs - activeVideoClip.startAtMs + activeVideoClip.trimInMs;
    const targetTimeSec = Math.max(0, clipOffsetMs / 1000);

    if (Math.abs(video.currentTime - targetTimeSec) > 0.12) {
      video.currentTime = targetTimeSec;
    }

    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [activeVideoClip, currentTimeMs, isPlaying, isImageSource]);

  // Synchronize background audio playback with timeline
  useEffect(() => {
    const audioTrack = tracks.find((t) => t.type === 'audio');
    if (!audioTrack || audioTrack.isMuted) {
      audioElementsRef.current.forEach((audio) => {
        if (!audio.paused) audio.pause();
      });
      return;
    }

    const activeAudioClip = audioTrack.clips.find(
      (c) => currentTimeMs >= c.startAtMs && currentTimeMs < c.startAtMs + c.durationMs
    );

    if (!activeAudioClip?.sourceUrl) {
      audioElementsRef.current.forEach((audio) => {
        if (!audio.paused) audio.pause();
      });
      return;
    }

    const audio = audioElementsRef.current.get(activeAudioClip.sourceUrl);
    if (!audio) return;

    const audioOffsetMs = currentTimeMs - activeAudioClip.startAtMs + activeAudioClip.trimInMs;
    const targetAudioSec = Math.max(0, audioOffsetMs / 1000);

    audio.volume = Math.max(0, Math.min(1, activeAudioClip.volume ?? 0.8));

    if (Math.abs(audio.currentTime - targetAudioSec) > 0.15) {
      audio.currentTime = targetAudioSec;
    }

    if (isPlaying && audio.paused) {
      audio.play().catch(() => {});
    } else if (!isPlaying && !audio.paused) {
      audio.pause();
    }
  }, [tracks, currentTimeMs, isPlaying]);

  // Master Canvas Render Loop via requestAnimationFrame
  useEffect(() => {
    let animFrameId: number;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        animFrameId = requestAnimationFrame(render);
        return;
      }

      const isLandscape = aspectRatio === '16:9';
      const width = isLandscape ? 1920 : 1080;
      const height = isLandscape ? 1080 : 1920;

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      // Check current state from store
      const state = useTimelineStore.getState();
      const currentMs = state.currentTimeMs;
      const vTrack = state.tracks.find((t) => t.type === 'video' && !t.isMuted);
      const currentActiveClip = vTrack?.clips.find(
        (c) => currentMs >= c.startAtMs && currentMs < c.startAtMs + c.durationMs
      );

      ctx.clearRect(0, 0, width, height);

      if (currentActiveClip?.sourceUrl) {
        const isImg = isImageSource(currentActiveClip.sourceUrl, currentActiveClip.title);

        try {
          if (isImg) {
            const img = imageElementsRef.current.get(currentActiveClip.sourceUrl);
            if (img && img.complete && img.naturalWidth > 0) {
              if (!isLandscape && img.naturalWidth > img.naturalHeight) {
                ctx.save();
                ctx.filter = 'blur(40px) brightness(0.55)';
                ctx.drawImage(img, 0, 0, width, height);
                ctx.restore();
              } else {
                ctx.fillStyle = '#09090b';
                ctx.fillRect(0, 0, width, height);
              }

              const userScale = currentActiveClip.transform?.scale ?? 1;
              const userX = currentActiveClip.transform?.x ?? 0;
              const userY = currentActiveClip.transform?.y ?? 0;
              const userRotation = ((currentActiveClip.transform?.rotation ?? 0) * Math.PI) / 180;
              const userOpacity = Math.max(0, Math.min(1, currentActiveClip.transform?.opacity ?? 1));

              const baseScale = Math.min(width / img.naturalWidth, height / img.naturalHeight);
              const baseW = img.naturalWidth * baseScale;
              const baseH = img.naturalHeight * baseScale;

              ctx.save();
              ctx.globalAlpha = userOpacity;
              ctx.translate(width / 2 + userX, height / 2 + userY);
              if (userRotation !== 0) ctx.rotate(userRotation);
              ctx.scale(userScale, userScale);
              ctx.drawImage(img, -baseW / 2, -baseH / 2, baseW, baseH);
              ctx.restore();
            }
          } else {
            const video = videoElementsRef.current.get(currentActiveClip.sourceUrl);

            if (video && video.readyState >= 2 && video.videoWidth > 0) {
              if (!isLandscape && video.videoWidth > video.videoHeight) {
                ctx.save();
                ctx.filter = 'blur(40px) brightness(0.55)';
                ctx.drawImage(video, 0, 0, width, height);
                ctx.restore();
              } else {
                ctx.fillStyle = '#09090b';
                ctx.fillRect(0, 0, width, height);
              }

              const userScale = currentActiveClip.transform?.scale ?? 1;
              const userX = currentActiveClip.transform?.x ?? 0;
              const userY = currentActiveClip.transform?.y ?? 0;
              const userRotation = ((currentActiveClip.transform?.rotation ?? 0) * Math.PI) / 180;
              const userOpacity = Math.max(0, Math.min(1, currentActiveClip.transform?.opacity ?? 1));

              const baseScale = Math.min(width / video.videoWidth, height / video.videoHeight);
              const baseW = video.videoWidth * baseScale;
              const baseH = video.videoHeight * baseScale;

              ctx.save();
              ctx.globalAlpha = userOpacity;
              ctx.translate(width / 2 + userX, height / 2 + userY);
              if (userRotation !== 0) ctx.rotate(userRotation);
              ctx.scale(userScale, userScale);
              ctx.drawImage(video, -baseW / 2, -baseH / 2, baseW, baseH);
              ctx.restore();
            } else {
              // Visual placeholder while video loads or buffers
              const grad = ctx.createLinearGradient(0, 0, width, height);
              grad.addColorStop(0, '#1e1b4b');
              grad.addColorStop(0.5, '#0f172a');
              grad.addColorStop(1, '#020617');
              ctx.fillStyle = grad;
              ctx.fillRect(0, 0, width, height);

              ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
              ctx.lineWidth = 2;
              ctx.strokeRect(width * 0.08, height * 0.08, width * 0.84, height * 0.84);

              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 44px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
              ctx.textAlign = 'center';
              ctx.fillText(`🎬 ${currentActiveClip.title}`, width / 2, height / 2 - 20);

              ctx.fillStyle = '#a5b4fc';
              ctx.font = '500 28px monospace';
              const localSec = (currentMs - currentActiveClip.startAtMs + currentActiveClip.trimInMs) / 1000;
              ctx.fillText(`TIMECODE: ${localSec.toFixed(2)}s • CLIP READY`, width / 2, height / 2 + 35);
            }
          }
        } catch {
          // Catch canvas draw exceptions gracefully
        }
      } else {
        // No active clip at playhead position: render smooth dark background with subtle timecode indicator
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#0c0a09');
        bgGrad.addColorStop(1, '#09090b');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Aspect ratio safe margin guides
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(width * 0.1, height * 0.1, width * 0.8, height * 0.8);

        // Crosshairs in the center
        const crosshairSize = 16;
        ctx.beginPath();
        ctx.moveTo(width / 2 - crosshairSize, height / 2);
        ctx.lineTo(width / 2 + crosshairSize, height / 2);
        ctx.moveTo(width / 2, height / 2 - crosshairSize);
        ctx.lineTo(width / 2, height / 2 + crosshairSize);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.stroke();

        // Subtle timecode indicator
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '600 24px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`NO CLIP AT PLAYHEAD`, width / 2, height / 2 - 15);

        ctx.fillStyle = '#f87171';
        ctx.font = '700 32px monospace';
        ctx.fillText(formatTimecode(currentMs), width / 2, height / 2 + 30);
      }

      // Render active kinetic captions directly onto canvas context for preview and video stream capture
      const captionTrack = state.tracks.find((t) => t.type === 'caption' && !t.isMuted);
      const activeCaption = captionTrack?.clips.find(
        (c) => currentMs >= c.startAtMs && currentMs < c.startAtMs + c.durationMs
      );

      if (activeCaption) {
        const text = (activeCaption.subtitleText || activeCaption.title || '').trim();
        if (text) {
          const rawWords = text.split(/\s+/).filter(Boolean);
          if (rawWords.length > 0) {
            const elapsedMs = Math.max(0, currentMs - activeCaption.startAtMs);
            const wordDurationMs = activeCaption.durationMs / rawWords.length;
            const activeIndex = Math.min(
              rawWords.length - 1,
              Math.floor(elapsedMs / wordDurationMs)
            );

            ctx.save();
            let capY = height * 0.84;
            if (captionPosition === 'top') capY = height * 0.16;
            else if (captionPosition === 'middle') capY = height * 0.5;

            let fontSizePx = isLandscape ? 40 : 46;
            if (activeCaption.fontSize === 'small') fontSizePx = isLandscape ? 28 : 34;
            else if (activeCaption.fontSize === 'large') fontSizePx = isLandscape ? 52 : 58;
            else if (activeCaption.fontSize === 'xlarge') fontSizePx = isLandscape ? 64 : 72;

            ctx.font = `bold ${fontSizePx}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const fullText = rawWords.join(' ');
            const textMetrics = ctx.measureText(fullText);
            const textWidth = textMetrics.width;
            const paddingX = 36;
            const paddingY = 18;
            const boxW = Math.min(width * 0.92, textWidth + paddingX * 2);
            const boxH = fontSizePx * 1.5 + paddingY * 2;

            // Rounded background pill
            ctx.fillStyle = 'rgba(0, 0, 0, 0.82)';
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
              ctx.roundRect(width / 2 - boxW / 2, capY - boxH / 2, boxW, boxH, 20);
            } else {
              ctx.rect(width / 2 - boxW / 2, capY - boxH / 2, boxW, boxH);
            }
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw kinetic words
            const activeColor = activeCaption.textColor || '#FACC15';
            const wordSpacing = ctx.measureText(' ').width;
            let startX = width / 2 - textWidth / 2;

            rawWords.forEach((word, idx) => {
              const wordW = ctx.measureText(word).width;
              const isCurrent = idx === activeIndex;
              const isPast = idx < activeIndex;

              ctx.save();
              if (isCurrent) {
                ctx.fillStyle = activeColor;
                ctx.shadowColor = activeColor;
                ctx.shadowBlur = 16;
                ctx.font = `900 ${Math.round(fontSizePx * 1.08)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
                ctx.fillText(word, startX + wordW / 2, capY);
              } else {
                ctx.fillStyle = isPast ? '#ffffff' : 'rgba(228, 228, 231, 0.82)';
                ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                ctx.shadowBlur = 6;
                ctx.fillText(word, startX + wordW / 2, capY);
              }
              ctx.restore();

              startX += wordW + wordSpacing;
            });

            ctx.restore();
          }
        }
      }

      animFrameId = requestAnimationFrame(render);
    };

    animFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameId);
  }, [aspectRatio, captionPosition]);

  // Compute Word-Level Kinetic Highlighting for the active caption clip
  const kineticWords = useMemo(() => {
    if (!activeCaptionClip) return [];

    const rawWords = activeCaptionClip.title.trim().split(/\s+/).filter(Boolean);
    if (rawWords.length === 0) return [];

    const elapsedMs = Math.max(0, currentTimeMs - activeCaptionClip.startAtMs);
    const wordDurationMs = activeCaptionClip.durationMs / rawWords.length;
    const activeIndex = Math.min(
      rawWords.length - 1,
      Math.floor(elapsedMs / wordDurationMs)
    );

    return rawWords.map((word, idx) => ({
      text: word,
      isActive: idx === activeIndex,
      isPast: idx < activeIndex,
    }));
  }, [activeCaptionClip, currentTimeMs]);

  // Dynamic CSS classes for caption positions
  const captionPositionClass = useMemo(() => {
    switch (captionPosition) {
      case 'top':
        return 'top-10 inset-x-6 justify-center';
      case 'middle':
        return 'top-1/2 -translate-y-1/2 inset-x-6 justify-center';
      case 'bottom':
      default:
        return 'bottom-10 inset-x-6 justify-center';
    }
  }, [captionPosition]);

  // Toggle fullscreen mode
  const handleToggleFullscreen = useCallback(() => {
    if (!playerContainerRef.current) return;
    if (!document.fullscreenElement) {
      playerContainerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }, []);

  return (
    <div
      ref={playerContainerRef}
      className={`flex flex-col items-center justify-between w-full h-full bg-zinc-950 p-3 select-none relative overflow-hidden ${
        isFullscreen ? 'p-6 bg-black' : ''
      }`}
    >
      {/* Background ambient lighting aura */}
      <div className="absolute w-[500px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Player Header Toolbar: Timecode, Aspect Ratio & Caption Position toggles */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-3 z-20 px-1 gap-2">
        {/* Live Playback Timecode Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 backdrop-blur-md shadow-sm">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isPlaying ? 'bg-red-500 animate-pulse' : 'bg-zinc-600'
            }`}
          />
          <span className="font-mono text-xs font-bold text-red-400 tracking-wider">
            {formatTimecode(currentTimeMs)}
          </span>
          <span className="text-zinc-600 font-mono text-xs">/</span>
          <span className="font-mono text-xs text-zinc-400 tracking-wider">
            {formatTimecode(durationMs)}
          </span>
        </div>

        {/* Center / Right Toggles: Aspect Ratio & Caption Preset Position */}
        <div className="flex items-center gap-2">
          {/* Aspect Ratio Switcher: 16:9 vs 9:16 */}
          <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setAspectRation('16:9')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                aspectRatio === '16:9'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="16:9 Landscape Video"
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>16:9</span>
            </button>
            <button
              type="button"
              onClick={() => setAspectRation('9:16')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                aspectRatio === '9:16'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="9:16 Vertical Reel / Shorts"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>9:16</span>
            </button>
          </div>

          {/* Caption Position Preset Selector */}
          <div className="flex items-center bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-800 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setCaptionPosition('top')}
              className={`p-1.5 rounded-md transition-all ${
                captionPosition === 'top'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Captions at Top"
            >
              <AlignVerticalJustifyStart className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCaptionPosition('middle')}
              className={`p-1.5 rounded-md transition-all ${
                captionPosition === 'middle'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Captions at Middle (Kinetic Reel)"
            >
              <AlignVerticalJustifyCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setCaptionPosition('bottom')}
              className={`p-1.5 rounded-md transition-all ${
                captionPosition === 'bottom'
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Captions at Bottom (Default)"
            >
              <AlignVerticalJustifyEnd className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="p-1.5 rounded-lg bg-zinc-900/90 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Preview Screen Wrapper */}
      <div className="flex-1 w-full flex items-center justify-center min-h-0 relative">
        <div
          className={`relative bg-black rounded-xl border border-zinc-800/90 shadow-2xl overflow-hidden group flex items-center justify-center transition-all duration-300 ${
            aspectRatio === '16:9'
              ? 'w-full max-w-3xl aspect-video'
              : 'h-full max-h-[440px] md:max-h-[500px] aspect-[9/16]'
          }`}
        >
          {/* HTML5 Master Rendering Canvas */}
          <canvas
            ref={(el) => {
              internalCanvasRef.current = el;
              if (externalCanvasRef && 'current' in externalCanvasRef) {
                (externalCanvasRef as React.MutableRefObject<HTMLCanvasElement | null>).current = el;
              }
            }}
            id="clipforce-preview-canvas"
            className="w-full h-full object-contain block select-none pointer-events-none"
          />

          {/* Dynamic Kinetic Subtitles Overlay */}
          {activeCaptionClip && kineticWords.length > 0 && (
            <div
              className={`absolute flex pointer-events-none z-20 ${captionPositionClass}`}
            >
              <div className="bg-black/85 backdrop-blur-md px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl flex flex-wrap items-center justify-center gap-x-2 gap-y-1 max-w-xl text-center transform transition-all">
                {kineticWords.map((wordObj, i) => (
                  <span
                    key={`${wordObj.text}-${i}`}
                    className={`inline-block font-sans transition-all duration-100 ${
                      wordObj.isActive
                        ? 'text-[#FACC15] font-black text-lg md:text-xl scale-115 drop-shadow-[0_0_14px_rgba(250,204,21,0.85)] bg-yellow-400/20 px-1.5 py-0.5 rounded-md'
                        : wordObj.isPast
                        ? 'text-white font-bold text-base md:text-lg opacity-90 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                        : 'text-zinc-300/80 font-bold text-base md:text-lg drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
                    }`}
                  >
                    {wordObj.text}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Large Center Play/Pause Button on Canvas Hover */}
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer z-30"
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center text-white shadow-2xl hover:scale-110 active:scale-95 transition-all">
              {isPlaying ? (
                <Pause className="w-7 h-7 fill-current" />
              ) : (
                <Play className="w-7 h-7 fill-current ml-1" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Bottom Transport Controls Bar */}
      <div className="w-full max-w-xl flex items-center justify-center gap-3 mt-3 px-4 py-2 rounded-xl bg-zinc-900/90 border border-zinc-800 backdrop-blur-md z-20 shadow-md">
        {/* Reset to Start */}
        <button
          type="button"
          onClick={() => setCurrentTime(0)}
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Jump to Start (0:00)"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        {/* Step Back -100ms */}
        <button
          type="button"
          onClick={() => setCurrentTime(Math.max(0, currentTimeMs - 100))}
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Step Backward -100ms"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Main Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={`flex items-center justify-center w-10 h-10 rounded-full transition-all shadow-lg ${
            isPlaying
              ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-amber-950/40'
              : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/40'
          }`}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current ml-0.5" />
          )}
        </button>

        {/* Step Forward +100ms */}
        <button
          type="button"
          onClick={() => setCurrentTime(Math.min(durationMs, currentTimeMs + 100))}
          className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          title="Step Forward +100ms"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="w-[1px] h-5 bg-zinc-800 mx-1" />

        {/* Active Clip Status Pill */}
        <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
          <Film className="w-3.5 h-3.5 text-indigo-400" />
          <span className="truncate max-w-[130px]">
            {activeVideoClip ? activeVideoClip.title : 'No Clip Active'}
          </span>
          {activeCaptionClip && (
            <span className="flex items-center gap-1 text-amber-400 font-sans ml-1 text-[11px]">
              <Sparkles className="w-3 h-3" />
              <span>CC</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
