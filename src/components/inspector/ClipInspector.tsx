import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Sliders,
  Trash2,
  Edit2,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Type,
  Clock,
  Layers,
  Move,
  RotateCw,
  Sun,
  X,
} from 'lucide-react';
import { useTimelineStore } from '../../store/useTimelineStore';
import type { Clip } from '../../types/timeline';

export const ClipInspector: React.FC = () => {
  const tracks = useTimelineStore((state) => state.tracks);
  const selectedClipId = useTimelineStore((state) => state.selectedClipId);
  const setSelectedClipId = useTimelineStore((state) => state.setSelectedClipId);
  const deleteClip = useTimelineStore((state) => state.deleteClip);
  const updateClipTransform = useTimelineStore((state) => state.updateClipTransform);
  const updateClipVolume = useTimelineStore((state) => state.updateClipVolume);
  const updateClipText = useTimelineStore((state) => state.updateClipText);
  const updateClipTiming = useTimelineStore((state) => state.updateClipTiming);

  // Inline editing state for clip title
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');

  // Find the selected clip and its parent track
  const selectedData = useMemo<{ clip: Clip; isLocked: boolean } | null>(() => {
    if (!selectedClipId) return null;
    for (const track of tracks) {
      const clip = track.clips.find((c) => c.id === selectedClipId);
      if (clip) return { clip, isLocked: track.isLocked };
    }
    return null;
  }, [tracks, selectedClipId]);

  // Sync title input when clip selection changes
  useEffect(() => {
    if (selectedData?.clip) {
      setEditedTitle(selectedData.clip.title);
      setIsEditingTitle(false);
    }
  }, [selectedData?.clip?.id]);

  // Global hotkeys: Delete/Backspace to delete clip, Esc to deselect
  useEffect(() => {
    if (!selectedClipId || selectedData?.isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      if (e.key === 'Escape') {
        setSelectedClipId(null);
        return;
      }

      if (!isInput && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        deleteClip(selectedClipId);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipId, selectedData?.isLocked, deleteClip, setSelectedClipId]);

  // Handle Title Save
  const handleSaveTitle = useCallback(() => {
    if (!selectedData?.clip || !editedTitle.trim()) return;
    updateClipText(selectedData.clip.id, editedTitle.trim());
    setIsEditingTitle(false);
  }, [selectedData?.clip, editedTitle, updateClipText]);

  if (!selectedData) {
    return (
      <aside className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/90 flex flex-col items-center justify-center p-6 text-center select-none z-20">
        <div className="w-14 h-14 rounded-2xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-500 shadow-inner mb-3">
          <Layers className="w-7 h-7" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
          No Clip Selected
        </h3>
        <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px] leading-relaxed">
          Click any clip on the timeline lanes to adjust timing, transform, audio, or subtitles.
        </p>

        <div className="mt-6 pt-4 border-t border-zinc-800/80 w-full flex flex-col gap-1.5 text-[10px] font-mono text-zinc-500 text-left">
          <div className="flex justify-between">
            <span>Select Clip:</span>
            <span className="text-zinc-400">Click lane</span>
          </div>
          <div className="flex justify-between">
            <span>Deselect:</span>
            <span className="text-zinc-400">Esc</span>
          </div>
          <div className="flex justify-between">
            <span>Delete Clip:</span>
            <span className="text-zinc-400">Del / Backspace</span>
          </div>
        </div>
      </aside>
    );
  }

  const { clip, isLocked } = selectedData;
  const isVideo = clip.type === 'video';
  const isAudio = clip.type === 'audio';
  const isCaption = clip.type === 'caption';

  const transform = clip.transform || {
    scale: 1,
    x: 0,
    y: 0,
    rotation: 0,
    opacity: 1,
  };

  const scale = transform.scale ?? 1;
  const posX = transform.x ?? 0;
  const posY = transform.y ?? 0;
  const rotation = transform.rotation ?? 0;
  const opacity = transform.opacity ?? 1;
  const volume = clip.volume ?? 1;

  // Decibel calculation
  const decibels =
    volume === 0
      ? '-∞ dB'
      : `${(20 * Math.log10(volume)).toFixed(1)} dB`;

  return (
    <aside className="w-80 shrink-0 border-l border-zinc-800 bg-zinc-900/90 flex flex-col h-full overflow-hidden select-none z-20">
      {/* Inspector Top Header */}
      <div className="h-11 border-b border-zinc-800 px-3.5 flex items-center justify-between bg-zinc-950/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">
            Clip Inspector
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Deselect button */}
          <button
            type="button"
            onClick={() => setSelectedClipId(null)}
            className="p-1.5 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Deselect (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          {/* Delete clip button */}
          <button
            type="button"
            disabled={isLocked}
            onClick={() => deleteClip(clip.id)}
            className="p-1.5 rounded-md hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors disabled:opacity-40"
            title="Delete Clip (Del)"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inspector Scrollable Settings */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* ================= SECTION: CLIP INFO & TITLE ================= */}
        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span
              className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                isVideo
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  : isAudio
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {clip.type} Clip
            </span>

            {isLocked && (
              <span className="text-[10px] text-red-400 font-mono font-medium">
                Locked Track
              </span>
            )}
          </div>

          {/* Editable Title */}
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={editedTitle}
                autoFocus
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle();
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                className="flex-1 bg-zinc-900 border border-indigo-500 rounded px-2 py-1 text-xs text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={handleSaveTitle}
                className="p-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between group">
              <p className="text-xs font-semibold text-white truncate max-w-[200px]" title={clip.title}>
                {clip.title}
              </p>
              <button
                type="button"
                onClick={() => setIsEditingTitle(true)}
                className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-opacity"
                title="Edit clip name"
              >
                <Edit2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* ================= SECTION: TIMING & DURATION ================= */}
        <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-bold uppercase tracking-wider">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Timing & Alignment</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-medium">Start Time (sec)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={Number((clip.startAtMs / 1000).toFixed(2))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    updateClipTiming(clip.id, val * 1000, clip.durationMs);
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-medium">Duration (sec)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={Number((clip.durationMs / 1000).toFixed(2))}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    updateClipTiming(clip.id, clip.startAtMs, val * 1000);
                  }
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* ================= SECTION: TRANSFORM (VIDEO & CAPTION) ================= */}
        {(isVideo || isCaption) && (
          <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                <Move className="w-3.5 h-3.5 text-indigo-400" />
                <span>Transform</span>
              </div>
              <button
                type="button"
                onClick={() =>
                  updateClipTransform(clip.id, {
                    scale: 1,
                    x: 0,
                    y: 0,
                    rotation: 0,
                    opacity: 1,
                  })
                }
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
                title="Reset all transforms"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>

            {/* Scale Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Scale</span>
                <span className="font-mono text-zinc-200 font-semibold">{scale.toFixed(2)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.1"
                  max="3.0"
                  step="0.05"
                  value={scale}
                  onChange={(e) =>
                    updateClipTransform(clip.id, { scale: parseFloat(e.target.value) })
                  }
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => updateClipTransform(clip.id, { scale: 1 })}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  title="Reset Scale"
                >
                  1x
                </button>
              </div>
            </div>

            {/* Position X and Y Sliders */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Pos X</span>
                  <span className="font-mono text-zinc-200">{posX}px</span>
                </div>
                <input
                  type="range"
                  min="-600"
                  max="600"
                  step="10"
                  value={posX}
                  onChange={(e) =>
                    updateClipTransform(clip.id, { x: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-zinc-400">
                  <span>Pos Y</span>
                  <span className="font-mono text-zinc-200">{posY}px</span>
                </div>
                <input
                  type="range"
                  min="-600"
                  max="600"
                  step="10"
                  value={posY}
                  onChange={(e) =>
                    updateClipTransform(clip.id, { y: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
              </div>
            </div>

            {/* Rotation Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400 flex items-center gap-1">
                  <RotateCw className="w-3 h-3 text-zinc-500" />
                  <span>Rotation</span>
                </span>
                <span className="font-mono text-zinc-200">{rotation}°</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={rotation}
                  onChange={(e) =>
                    updateClipTransform(clip.id, { rotation: parseInt(e.target.value, 10) })
                  }
                  className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => updateClipTransform(clip.id, { rotation: 0 })}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                  title="Reset Rotation"
                >
                  0°
                </button>
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400 flex items-center gap-1">
                  <Sun className="w-3 h-3 text-zinc-500" />
                  <span>Opacity</span>
                </span>
                <span className="font-mono text-zinc-200 font-semibold">
                  {Math.round(opacity * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={opacity}
                onChange={(e) =>
                  updateClipTransform(clip.id, { opacity: parseFloat(e.target.value) })
                }
                className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
            </div>
          </div>
        )}

        {/* ================= SECTION: AUDIO (VIDEO & AUDIO) ================= */}
        {(isVideo || isAudio) && (
          <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-bold uppercase tracking-wider">
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Audio Levels</span>
              </div>
              <button
                type="button"
                onClick={() => updateClipVolume(clip.id, volume === 0 ? 1 : 0)}
                className={`p-1 rounded text-xs transition-colors ${
                  volume === 0
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'text-zinc-500 hover:text-zinc-200'
                }`}
                title={volume === 0 ? 'Unmute' : 'Mute'}
              >
                {volume === 0 ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px]">
                <span className="text-zinc-400">Volume</span>
                <span className="font-mono text-zinc-200 font-semibold">
                  {Math.round(volume * 100)}% ({decibels})
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.05"
                value={volume}
                onChange={(e) => updateClipVolume(clip.id, parseFloat(e.target.value))}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-zinc-800 rounded-lg"
              />
              <div className="flex justify-between text-[9px] font-mono text-zinc-500">
                <span>0%</span>
                <span className="text-zinc-400">100% (0dB)</span>
                <span>200% (+6dB)</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= SECTION: CAPTIONS (CAPTION ONLY) ================= */}
        {isCaption && (
          <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800/80 space-y-3">
            <div className="flex items-center gap-1.5 text-zinc-300 text-xs font-bold uppercase tracking-wider">
              <Type className="w-3.5 h-3.5 text-amber-400" />
              <span>Subtitle Text & Styling</span>
            </div>

            {/* Live Textarea Editor */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-medium">Text Content</label>
              <textarea
                rows={3}
                value={clip.title}
                onChange={(e) => updateClipText(clip.id, e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors resize-none leading-relaxed"
                placeholder="Enter subtitle text..."
              />
            </div>

            {/* Quick Color Palette */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 font-medium">Color Palette</label>
              <div className="flex items-center gap-2">
                {[
                  { name: 'Yellow', hex: '#FACC15' },
                  { name: 'White', hex: '#FFFFFF' },
                  { name: 'Cyan', hex: '#22D3EE' },
                  { name: 'Green', hex: '#4ADE80' },
                  { name: 'Rose', hex: '#F43F5E' },
                ].map((color) => (
                  <button
                    key={color.name}
                    type="button"
                    onClick={() => {
                      updateClipText(clip.id, clip.title);
                      useTimelineStore.setState((s) => ({
                        tracks: s.tracks.map((t) => ({
                          ...t,
                          clips: t.clips.map((c) =>
                            c.id === clip.id ? { ...c, textColor: color.hex } : c
                          ),
                        })),
                      }));
                    }}
                    style={{ backgroundColor: color.hex }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 shadow-sm ${
                      clip.textColor === color.hex ? 'border-white scale-110' : 'border-black/50'
                    }`}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Font Size Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-zinc-400 font-medium">Font Size</label>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-medium">
                {(['small', 'medium', 'large', 'xlarge'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      useTimelineStore.setState((s) => ({
                        tracks: s.tracks.map((t) => ({
                          ...t,
                          clips: t.clips.map((c) =>
                            c.id === clip.id ? { ...c, fontSize: size } : c
                          ),
                        })),
                      }));
                    }}
                    className={`py-1 rounded capitalize border transition-all ${
                      (clip.fontSize || 'medium') === size
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {size[0].toUpperCase() + size.slice(1, 3)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
