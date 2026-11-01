import React, { useRef, useState, useCallback } from 'react';
import { useTimelineStore } from '../../store/useTimelineStore';
import {
  timeToPixels,
  pixelsToTime,
  getRulerIntervals,
  formatTimecode,
} from '../../utils/timelineUtils';

interface TimeRulerProps {
  totalWidth: number;
  timelineHeight?: number;
}

export const TimeRuler: React.FC<TimeRulerProps> = ({
  totalWidth,
  timelineHeight = 350,
}) => {
  const durationMs = useTimelineStore((state) => state.durationMs);
  const currentTimeMs = useTimelineStore((state) => state.currentTimeMs);
  const zoomLevel = useTimelineStore((state) => state.zoomLevel);
  const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);

  const rulerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Playhead horizontal position
  const playheadX = timeToPixels(currentTimeMs, zoomLevel);

  // Handle clicking and dragging on the ruler
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);

      const updateTime = (clientX: number) => {
        if (!rulerRef.current) return;
        const rect = rulerRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const newTimeMs = Math.max(0, Math.min(durationMs, pixelsToTime(offsetX, zoomLevel)));
        setCurrentTime(newTimeMs);
      };

      updateTime(e.clientX);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        updateTime(moveEvent.clientX);
      };

      const handlePointerUp = () => {
        setIsDragging(false);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [durationMs, zoomLevel, setCurrentTime]
  );

  // Generate ruler markers
  const { majorStepMs, minorTicksCount } = getRulerIntervals(zoomLevel);
  const totalSteps = Math.ceil(durationMs / majorStepMs);
  const markers: Array<{ key: string; timeMs: number; left: number; label: string }> = [];

  for (let i = 0; i <= totalSteps; i++) {
    const timeMs = i * majorStepMs;
    if (timeMs > durationMs) break;

    const left = timeToPixels(timeMs, zoomLevel);
    const seconds = Math.floor(timeMs / 1000);
    const mins = Math.floor(seconds / 60);
    const remSecs = seconds % 60;
    const label = `${mins}:${String(remSecs).padStart(2, '0')}`;

    markers.push({
      key: `major-${i}`,
      timeMs,
      left,
      label,
    });
  }

  return (
    <div
      ref={rulerRef}
      onPointerDown={handlePointerDown}
      style={{ width: `${totalWidth}px` }}
      className="relative h-8 bg-zinc-900/95 border-b border-zinc-800 select-none cursor-pointer group"
    >
      {/* Ticks & Labels */}
      {markers.map((marker, idx) => {
        const nextMarker = markers[idx + 1];
        const stepWidth = nextMarker ? nextMarker.left - marker.left : 80;

        return (
          <div
            key={marker.key}
            style={{ left: `${marker.left}px` }}
            className="absolute top-0 bottom-0 pointer-events-none"
          >
            {/* Major tick mark */}
            <div className="w-[1px] h-3 bg-zinc-500 absolute bottom-0 left-0" />

            {/* Time label */}
            <span className="absolute top-1 left-1.5 text-[10px] font-mono font-medium text-zinc-400 tracking-tight">
              {marker.label}
            </span>

            {/* Minor sub-ticks */}
            {Array.from({ length: minorTicksCount - 1 }).map((_, subIdx) => {
              const subOffset = (stepWidth / minorTicksCount) * (subIdx + 1);
              return (
                <div
                  key={`sub-${subIdx}`}
                  style={{ left: `${subOffset}px` }}
                  className="w-[1px] h-1.5 bg-zinc-700/70 absolute bottom-0"
                />
              );
            })}
          </div>
        );
      })}

      {/* Red vertical playhead with scrubber handle spanning across ruler and all tracks */}
      <div
        style={{
          transform: `translateX(${playheadX}px)`,
          height: `${timelineHeight}px`,
        }}
        className="absolute top-0 left-0 z-40 pointer-events-none transition-transform duration-75 ease-out"
      >
        {/* Scrubber handle at the top */}
        <div
          className={`pointer-events-auto -translate-x-1/2 flex flex-col items-center cursor-ew-resize ${
            isDragging ? 'scale-110' : ''
          }`}
        >
          {/* Badge indicator */}
          <div className="bg-red-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg shadow-red-950/60 whitespace-nowrap">
            {formatTimecode(currentTimeMs)}
          </div>
          {/* Arrow pointer */}
          <div className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] border-t-red-500 -mt-0.5" />
        </div>

        {/* Vertical line through ruler and all tracks down */}
        <div className="w-[2px] bg-red-500/90 shadow-[0_0_8px_rgba(239,68,68,0.8)] h-full -translate-x-1/2 pointer-events-none" />
      </div>
    </div>
  );
};
