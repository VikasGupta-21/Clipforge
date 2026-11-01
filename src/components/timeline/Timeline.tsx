import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  Scissors,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Volume2,
  VolumeX,
  Lock,
  Unlock,
  Film,
  Music,
  Type,
} from 'lucide-react';
import { useTimelineStore } from '../../store/useTimelineStore';
import { TimeRuler } from './TimeRuler';
import { ClipItem } from './ClipItem';
import {
  timeToPixels,
  pixelsToTime,
  formatTimecode,
  getRulerIntervals,
} from '../../utils/timelineUtils';

export const Timeline: React.FC = () => {
  const tracks = useTimelineStore((state) => state.tracks);
  const currentTimeMs = useTimelineStore((state) => state.currentTimeMs);
  const durationMs = useTimelineStore((state) => state.durationMs);
  const isPlaying = useTimelineStore((state) => state.isPlaying);
  const zoomLevel = useTimelineStore((state) => state.zoomLevel);
  const selectedClipId = useTimelineStore((state) => state.selectedClipId);

  const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);
  const togglePlay = useTimelineStore((state) => state.togglePlay);
  const setIsPlaying = useTimelineStore((state) => state.setIsPlaying);
  const setZoomLevel = useTimelineStore((state) => state.setZoomLevel);
  const splitClipAtCurrentTime = useTimelineStore(
    (state) => state.splitClipAtCurrentTime
  );
  const deleteClip = useTimelineStore((state) => state.deleteClip);
  const setSelectedClipId = useTimelineStore((state) => state.setSelectedClipId);
  const toggleTrackMute = useTimelineStore((state) => state.toggleTrackMute);
  const toggleTrackLock = useTimelineStore((state) => state.toggleTrackLock);
  const addClip = useTimelineStore((state) => state.addClip);

  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1000);

  // Drag and drop asset from media library onto timeline track
  const handleTrackDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>, track: (typeof tracks)[0]) => {
      e.preventDefault();
      setDragOverTrackId(null);
      if (track.isLocked) return;

      const data = e.dataTransfer.getData('application/json');
      if (!data) return;

      try {
        const asset = JSON.parse(data);

        // Validate type compatibility
        if (track.type === 'video' && asset.type !== 'video' && asset.type !== 'image') {
          return;
        }
        if (track.type === 'audio' && asset.type !== 'audio') {
          return;
        }
        if (track.type === 'caption') {
          return;
        }

        const rect = e.currentTarget.getBoundingClientRect();
        const dropPixelX = e.clientX - rect.left;
        const dropTimeMs = Math.max(0, pixelsToTime(dropPixelX, zoomLevel));

        addClip(track.id, {
          id: `clip-${track.type[0]}-${Date.now()}`,
          trackId: track.id,
          type: track.type,
          sourceUrl: asset.url,
          startAtMs: dropTimeMs,
          durationMs: asset.durationMs || 5000,
          trimInMs: 0,
          title: asset.name,
          volume: track.type === 'audio' ? 0.8 : 1,
          transform: track.type === 'video' ? { scale: 1, x: 0, y: 0 } : undefined,
        });
      } catch (err) {
        console.error('Error handling track drop:', err);
      }
    },
    [zoomLevel, addClip]
  );

  // Resize observer to get visible width
  useEffect(() => {
    const updateWidth = () => {
      if (scrollContainerRef.current) {
        setContainerWidth(scrollContainerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Compute total timeline pixel width (at least the visible container width)
  const contentWidth = useMemo(() => {
    const rawWidth = timeToPixels(durationMs, zoomLevel);
    return Math.max(containerWidth, rawWidth + 120);
  }, [durationMs, zoomLevel, containerWidth]);

  // Height for playhead and lanes
  const rulerHeight = 32;
  const trackRowHeight = 64;
  const totalTimelineHeight = rulerHeight + tracks.length * trackRowHeight + 40;

  // Real-time smooth playback ticker
  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let lastTimestamp = performance.now();

    const loop = (currentTimestamp: number) => {
      const deltaMs = currentTimestamp - lastTimestamp;
      lastTimestamp = currentTimestamp;

      const current = useTimelineStore.getState().currentTimeMs;
      const duration = useTimelineStore.getState().durationMs;
      const nextTime = current + deltaMs;

      if (nextTime >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
      } else {
        setCurrentTime(nextTime);
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, setCurrentTime, setIsPlaying]);

  // Spacebar shortcut to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay]);

  // Check if selected clip can be split at current playhead position
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) return { clip, isLocked: track.isLocked };
    }
    return null;
  }, [tracks, selectedClipId]);

  const canSplitSelectedClip = useMemo(() => {
    if (!selectedClip || selectedClip.isLocked) return false;
    const { startAtMs, durationMs } = selectedClip.clip;
    return currentTimeMs > startAtMs && currentTimeMs < startAtMs + durationMs;
  }, [selectedClip, currentTimeMs]);

  // Zoom helpers
  const handleZoomIn = () => setZoomLevel(zoomLevel * 1.25);
  const handleZoomOut = () => setZoomLevel(zoomLevel / 1.25);
  const handleResetZoom = () => setZoomLevel(1);

  // Split action
  const handleSplit = useCallback(() => {
    if (selectedClipId && canSplitSelectedClip) {
      splitClipAtCurrentTime(selectedClipId);
    }
  }, [selectedClipId, canSplitSelectedClip, splitClipAtCurrentTime]);

  // Delete action
  const handleDelete = useCallback(() => {
    if (selectedClipId && selectedClip && !selectedClip.isLocked) {
      deleteClip(selectedClipId);
    }
  }, [selectedClipId, selectedClip, deleteClip]);

  // Track Type Icons
  const getTrackIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Film className="w-4 h-4 text-indigo-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-emerald-400" />;
      case 'caption':
        return <Type className="w-4 h-4 text-amber-400" />;
      default:
        return <Film className="w-4 h-4 text-zinc-400" />;
    }
  };

  // Background guide ticks for track lanes
  const { majorStepMs } = getRulerIntervals(zoomLevel);
  const totalSteps = Math.ceil(durationMs / majorStepMs);
  const gridLines = useMemo(() => {
    const lines = [];
    for (let i = 0; i <= totalSteps; i++) {
      const timeMs = i * majorStepMs;
      if (timeMs > durationMs) break;
      lines.push(timeToPixels(timeMs, zoomLevel));
    }
    return lines;
  }, [durationMs, majorStepMs, zoomLevel, totalSteps]);

  return (
    <div className="w-full flex flex-col bg-zinc-950 border-t border-zinc-800 text-zinc-100 select-none shadow-2xl">
      {/* Timeline Toolbar */}
      <div className="h-12 border-b border-zinc-800 bg-zinc-900/90 px-4 flex items-center justify-between gap-4">
        {/* Left Toolbar Controls: Play, Split, Delete */}
        <div className="flex items-center gap-2">
          {/* Play/Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950 hover:bg-amber-400 shadow-md shadow-amber-950/40'
                : 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-md shadow-indigo-950/40'
            }`}
            title="Play / Pause (Space)"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          <div className="w-[1px] h-5 bg-zinc-800 mx-1" />

          {/* Split Button */}
          <button
            type="button"
            disabled={!canSplitSelectedClip}
            onClick={handleSplit}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              canSplitSelectedClip
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white shadow-sm'
                : 'opacity-40 bg-zinc-900 text-zinc-500 cursor-not-allowed'
            }`}
            title={
              canSplitSelectedClip
                ? 'Split selected clip at playhead'
                : 'Select a clip and place playhead inside it to split'
            }
          >
            <Scissors className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>

          {/* Delete Button */}
          <button
            type="button"
            disabled={!selectedClip || selectedClip.isLocked}
            onClick={handleDelete}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
              selectedClip && !selectedClip.isLocked
                ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/30'
                : 'opacity-40 bg-zinc-900 text-zinc-500 cursor-not-allowed border border-transparent'
            }`}
            title="Delete selected clip (Del / Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
          </button>
        </div>

        {/* Center: Formatted Timecode Display */}
        <div className="flex items-center gap-2 font-mono text-xs px-3 py-1 rounded bg-zinc-950 border border-zinc-800/80 shadow-inner">
          <span className="text-red-400 font-bold tracking-wider">
            {formatTimecode(currentTimeMs)}
          </span>
          <span className="text-zinc-600 font-bold">/</span>
          <span className="text-zinc-400 tracking-wider">
            {formatTimecode(durationMs)}
          </span>
        </div>

        {/* Right Toolbar Controls: Zoom In/Out & Reset */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-zinc-400">
            {Math.round(zoomLevel * 100)}%
          </span>

          <div className="flex items-center bg-zinc-800/80 rounded-md border border-zinc-700/60 p-0.5">
            <button
              type="button"
              onClick={handleZoomOut}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleResetZoom}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Reset Zoom (100%)"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              className="p-1 rounded hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Multi-Track Viewport: Track Headers on Left, Scrollable Timeline on Right */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Track Headers Column (Fixed on left) */}
        <div className="w-56 shrink-0 flex flex-col border-r border-zinc-800 bg-zinc-900/95 z-30 shadow-md">
          {/* Header Row aligning with Time Ruler */}
          <div className="h-8 border-b border-zinc-800 px-3 flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
            <span>Tracks</span>
            <span className="text-[10px] text-zinc-500 font-mono">
              {tracks.length} active
            </span>
          </div>

          {/* Track Header Items */}
          {tracks.map((track) => (
            <div
              key={track.id}
              className={`h-16 border-b border-zinc-800/80 px-3 flex items-center justify-between transition-colors ${
                track.isLocked ? 'bg-zinc-900/40' : 'bg-zinc-900/70 hover:bg-zinc-900/90'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1.5 rounded bg-zinc-800/80 border border-zinc-700/50">
                  {getTrackIcon(track.type)}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-zinc-200 truncate">
                    {track.label}
                  </div>
                  <div className="text-[10px] text-zinc-500 capitalize">
                    {track.type} • {track.clips.length} clip{track.clips.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Mute and Lock Action Toggles */}
              <div className="flex items-center gap-1">
                {/* Mute Toggle */}
                <button
                  type="button"
                  onClick={() => toggleTrackMute(track.id)}
                  className={`p-1.5 rounded transition-colors ${
                    track.isMuted
                      ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={track.isMuted ? 'Unmute Track' : 'Mute Track'}
                >
                  {track.isMuted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2 className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Lock Toggle */}
                <button
                  type="button"
                  onClick={() => toggleTrackLock(track.id)}
                  className={`p-1.5 rounded transition-colors ${
                    track.isLocked
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                  }`}
                  title={track.isLocked ? 'Unlock Track' : 'Lock Track'}
                >
                  {track.isLocked ? (
                    <Lock className="w-3.5 h-3.5" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Scrollable Timeline Area (Ruler + Lanes + Playhead) */}
        <div
          ref={scrollContainerRef}
          onClick={() => setSelectedClipId(null)}
          className="flex-1 overflow-x-auto overflow-y-hidden relative bg-zinc-950 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-zinc-900"
        >
          <div
            style={{ width: `${contentWidth}px` }}
            className="relative min-w-full"
          >
            {/* Top Time Ruler */}
            <TimeRuler
              totalWidth={contentWidth}
              timelineHeight={totalTimelineHeight}
            />

            {/* Track Lanes */}
            <div className="flex flex-col relative">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'copy';
                    if (dragOverTrackId !== track.id) {
                      setDragOverTrackId(track.id);
                    }
                  }}
                  onDragLeave={() => {
                    setDragOverTrackId((current) => (current === track.id ? null : current));
                  }}
                  onDrop={(e) => handleTrackDrop(e, track)}
                  className={`h-16 border-b border-zinc-800/80 relative transition-all ${
                    track.isMuted ? 'opacity-40' : 'opacity-100'
                  } ${
                    dragOverTrackId === track.id
                      ? 'ring-2 ring-indigo-500 bg-indigo-500/15'
                      : track.isLocked
                      ? 'bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.015)_10px,rgba(255,255,255,0.015)_20px)]'
                      : 'hover:bg-zinc-900/30'
                  }`}
                >
                  {/* Vertical Guide Ticks corresponding to major seconds */}
                  {gridLines.map((lineX, idx) => (
                    <div
                      key={`grid-${idx}`}
                      style={{ left: `${lineX}px` }}
                      className="absolute top-0 bottom-0 w-[1px] bg-zinc-800/40 pointer-events-none"
                    />
                  ))}

                  {/* Clips in this track */}
                  {track.clips.map((clip) => (
                    <ClipItem
                      key={clip.id}
                      clip={clip}
                      isLocked={track.isLocked}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
