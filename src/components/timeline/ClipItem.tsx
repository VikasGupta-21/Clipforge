import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Film, Music, Type, Trash2 } from 'lucide-react';
import type { Clip, ClipType } from '../../types/timeline';
import { useTimelineStore } from '../../store/useTimelineStore';
import {
  timeToPixels,
  pixelsToTime,
  formatDurationSeconds,
} from '../../utils/timelineUtils';

interface ClipItemProps {
  clip: Clip;
  isLocked?: boolean;
}

export const ClipItem: React.FC<ClipItemProps> = ({ clip, isLocked = false }) => {
  const zoomLevel = useTimelineStore((state) => state.zoomLevel);
  const selectedClipId = useTimelineStore((state) => state.selectedClipId);
  const setSelectedClipId = useTimelineStore((state) => state.setSelectedClipId);
  const updateClipPosition = useTimelineStore((state) => state.updateClipPosition);
  const trimClip = useTimelineStore((state) => state.trimClip);
  const deleteClip = useTimelineStore((state) => state.deleteClip);

  const [isHovered, setIsHovered] = useState(false);
  const [isTrimming, setIsTrimming] = useState(false);
  const clipRef = useRef<HTMLDivElement>(null);

  const isSelected = selectedClipId === clip.id;

  // Geometry
  const left = timeToPixels(clip.startAtMs, zoomLevel);
  const width = Math.max(28, timeToPixels(clip.durationMs, zoomLevel));

  // Handle selection and keyboard deletion
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedClipId(clip.id);
  };

  useEffect(() => {
    if (!isSelected || isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteClip(clip.id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, isLocked, clip.id, deleteClip]);

  // Drag to move clip position
  const handleBodyPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isLocked || (e.target as HTMLElement).closest('[data-trim-handle]')) {
        return;
      }
      e.preventDefault();
      e.stopPropagation();
      setSelectedClipId(clip.id);

      const startX = e.clientX;
      const initialStartAtMs = clip.startAtMs;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaMs = pixelsToTime(deltaX, zoomLevel);
        const newStartAt = Math.max(0, initialStartAtMs + deltaMs);
        updateClipPosition(clip.id, newStartAt);
      };

      const handlePointerUp = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [clip.id, clip.startAtMs, isLocked, setSelectedClipId, updateClipPosition, zoomLevel]
  );

  // Left trim handle drag
  const handleLeftTrimPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedClipId(clip.id);
      setIsTrimming(true);

      const startX = e.clientX;
      const initialStartAtMs = clip.startAtMs;
      const initialDurationMs = clip.durationMs;
      const initialTrimInMs = clip.trimInMs;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaMs = pixelsToTime(deltaX, zoomLevel);

        // Don't allow duration to fall below 100ms and startAt to be negative
        const maxDelta = initialDurationMs - 100;
        const clampedDelta = Math.min(maxDelta, Math.max(-initialStartAtMs, deltaMs));

        const newStartAt = initialStartAtMs + clampedDelta;
        const newDuration = initialDurationMs - clampedDelta;
        const newTrimIn = Math.max(0, initialTrimInMs + clampedDelta);

        updateClipPosition(clip.id, newStartAt);
        trimClip(clip.id, newDuration, newTrimIn);
      };

      const handlePointerUp = () => {
        setIsTrimming(false);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [clip.id, clip.startAtMs, clip.durationMs, clip.trimInMs, isLocked, setSelectedClipId, updateClipPosition, trimClip, zoomLevel]
  );

  // Right trim handle drag
  const handleRightTrimPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (isLocked) return;
      e.preventDefault();
      e.stopPropagation();
      setSelectedClipId(clip.id);
      setIsTrimming(true);

      const startX = e.clientX;
      const initialDurationMs = clip.durationMs;

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const deltaMs = pixelsToTime(deltaX, zoomLevel);
        const newDuration = Math.max(100, initialDurationMs + deltaMs);
        trimClip(clip.id, newDuration);
      };

      const handlePointerUp = () => {
        setIsTrimming(false);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [clip.id, clip.durationMs, isLocked, setSelectedClipId, trimClip, zoomLevel]
  );

  // Color theme by clip type
  const getTheme = (type: ClipType) => {
    switch (type) {
      case 'video':
        return {
          bg: 'bg-indigo-600/90 hover:bg-indigo-600 border-indigo-400/40 text-indigo-50',
          selectedRing: 'ring-2 ring-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.5)]',
          handle: 'bg-indigo-300 hover:bg-white',
          badge: 'bg-indigo-800/80 text-indigo-200',
          icon: <Film className="w-3.5 h-3.5 shrink-0 text-indigo-200" />,
        };
      case 'audio':
        return {
          bg: 'bg-emerald-600/90 hover:bg-emerald-600 border-emerald-400/40 text-emerald-50',
          selectedRing: 'ring-2 ring-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)]',
          handle: 'bg-emerald-300 hover:bg-white',
          badge: 'bg-emerald-800/80 text-emerald-200',
          icon: <Music className="w-3.5 h-3.5 shrink-0 text-emerald-200" />,
        };
      case 'caption':
        return {
          bg: 'bg-amber-600/90 hover:bg-amber-600 border-amber-400/40 text-amber-50',
          selectedRing: 'ring-2 ring-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)]',
          handle: 'bg-amber-300 hover:bg-white',
          badge: 'bg-amber-800/80 text-amber-200',
          icon: <Type className="w-3.5 h-3.5 shrink-0 text-amber-200" />,
        };
    }
  };

  const theme = getTheme(clip.type);

  return (
    <div
      ref={clipRef}
      onClick={handleSelect}
      onPointerDown={handleBodyPointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        left: `${left}px`,
        width: `${width}px`,
      }}
      className={`absolute top-1.5 h-12 rounded-md border flex items-center select-none overflow-hidden group transition-all ${
        theme.bg
      } ${
        isTrimming
          ? 'ring-2 ring-white scale-[1.01] shadow-lg shadow-white/10'
          : isSelected
          ? theme.selectedRing
          : 'shadow-sm'
      } ${
        isLocked ? 'cursor-not-allowed opacity-75' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
      {/* Visual background pattern (filmstrip/audio wave vibe) */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:16px_16px] pointer-events-none" />

      {/* Left Trim Handle */}
      {!isLocked && (
        <div
          data-trim-handle="left"
          onPointerDown={handleLeftTrimPointerDown}
          className="absolute left-0 top-0 bottom-0 w-2.5 z-20 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity bg-black/20 hover:bg-black/40"
          title="Drag to trim start"
        >
          <div className={`w-1 h-5 rounded-full ${theme.handle}`} />
        </div>
      )}

      {/* Clip Content Details */}
      <div className="flex-1 px-3 min-w-0 flex flex-col justify-center pointer-events-none z-10">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {theme.icon}
          <span className="text-xs font-semibold truncate tracking-tight">
            {clip.title}
          </span>
        </div>

        {width > 70 && (
          <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-white/80">
            <span>{formatDurationSeconds(clip.startAtMs)}</span>
            <span>•</span>
            <span className="font-semibold text-white">
              {formatDurationSeconds(clip.durationMs)}
            </span>
          </div>
        )}
      </div>

      {/* Quick Delete Button on Hover / Selection */}
      {!isLocked && (isHovered || isSelected) && width > 90 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteClip(clip.id);
          }}
          className="mr-2 p-1 rounded hover:bg-black/40 text-white/70 hover:text-white transition-colors z-20"
          title="Delete clip"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Right Trim Handle */}
      {!isLocked && (
        <div
          data-trim-handle="right"
          onPointerDown={handleRightTrimPointerDown}
          className="absolute right-0 top-0 bottom-0 w-2.5 z-20 cursor-ew-resize flex items-center justify-center opacity-0 group-hover:opacity-100 hover:!opacity-100 transition-opacity bg-black/20 hover:bg-black/40"
          title="Drag to trim end"
        >
          <div className={`w-1 h-5 rounded-full ${theme.handle}`} />
        </div>
      )}
    </div>
  );
};
