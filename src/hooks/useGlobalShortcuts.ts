import { useEffect } from 'react';
import { useTimelineStore } from '../store/useTimelineStore';

export interface GlobalShortcutsOptions {
  onOpenShortcuts?: () => void;
  onOpenExport?: () => void;
  onOpenProjectPicker?: () => void;
  onNotify?: (notification: { type: 'success' | 'info' | 'warning'; title: string; message: string }) => void;
}

/**
 * Global keyboard shortcuts listener for ClipForce studio
 */
export function useGlobalShortcuts(options?: GlobalShortcutsOptions): void {
  const undo = useTimelineStore((state) => state.undo);
  const redo = useTimelineStore((state) => state.redo);
  const canUndo = useTimelineStore((state) => state.canUndo);
  const canRedo = useTimelineStore((state) => state.canRedo);
  const togglePlay = useTimelineStore((state) => state.togglePlay);
  const setCurrentTime = useTimelineStore((state) => state.setCurrentTime);
  const currentTimeMs = useTimelineStore((state) => state.currentTimeMs);
  const durationMs = useTimelineStore((state) => state.durationMs);
  const selectedClipId = useTimelineStore((state) => state.selectedClipId);
  const setSelectedClipId = useTimelineStore((state) => state.setSelectedClipId);
  const deleteClip = useTimelineStore((state) => state.deleteClip);
  const splitClipAtCurrentTime = useTimelineStore((state) => state.splitClipAtCurrentTime);
  const zoomLevel = useTimelineStore((state) => state.zoomLevel);
  const setZoomLevel = useTimelineStore((state) => state.setZoomLevel);
  const saveProjectFile = useTimelineStore((state) => state.saveProjectFile);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;

      // Never intercept hotkeys when user is typing in inputs / textareas
      if (isInput) return;

      const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      // 1. Undo: Ctrl+Z / Cmd+Z
      if (modKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (canUndo) {
          undo();
          options?.onNotify?.({
            type: 'info',
            title: 'Undo',
            message: 'Reverted previous timeline action.',
          });
        }
        return;
      }

      // 2. Redo: Ctrl+Y or Ctrl+Shift+Z
      if (
        (modKey && e.key.toLowerCase() === 'y') ||
        (modKey && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        if (canRedo) {
          redo();
          options?.onNotify?.({
            type: 'info',
            title: 'Redo',
            message: 'Restored timeline action.',
          });
        }
        return;
      }

      // 3. Quick Save Project: Ctrl+S / Cmd+S
      if (modKey && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProjectFile();
        options?.onNotify?.({
          type: 'success',
          title: 'Project Saved',
          message: 'Saved project archive (.clipforce) to your downloads.',
        });
        return;
      }

      // 4. Open Project: Ctrl+O / Cmd+O
      if (modKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        options?.onOpenProjectPicker?.();
        return;
      }

      // 5. Open Master Export: Ctrl+E / Cmd+E
      if (modKey && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        options?.onOpenExport?.();
        return;
      }

      // 6. Help / Shortcuts Modal: ? or Shift+/
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        options?.onOpenShortcuts?.();
        return;
      }

      // 7. Play / Pause: Space
      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
        return;
      }

      // 8. Delete selected clip: Delete or Backspace
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          deleteClip(selectedClipId);
          options?.onNotify?.({
            type: 'info',
            title: 'Clip Deleted',
            message: 'Removed clip from timeline.',
          });
        }
        return;
      }

      // 9. Deselect clip: Escape
      if (e.key === 'Escape') {
        if (selectedClipId) {
          e.preventDefault();
          setSelectedClipId(null);
        }
        return;
      }

      // 10. Split clip at current playhead: S
      if (!modKey && e.key.toLowerCase() === 's') {
        if (selectedClipId) {
          e.preventDefault();
          splitClipAtCurrentTime(selectedClipId);
          options?.onNotify?.({
            type: 'info',
            title: 'Clip Split',
            message: 'Split clip at current playhead position.',
          });
        }
        return;
      }

      // 11. Jump to start: Home
      if (e.key === 'Home') {
        e.preventDefault();
        setCurrentTime(0);
        return;
      }

      // 12. Frame Stepping: ArrowLeft / ArrowRight
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const step = e.shiftKey ? 1000 : 100;
        setCurrentTime(Math.max(0, currentTimeMs - step));
        return;
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        const step = e.shiftKey ? 1000 : 100;
        setCurrentTime(Math.min(durationMs, currentTimeMs + step));
        return;
      }

      // 13. Zoom in / Zoom out: + / = and -
      if (!modKey && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        setZoomLevel(Math.min(5, zoomLevel * 1.25));
        return;
      }
      if (!modKey && (e.key === '-' || e.key === '_')) {
        e.preventDefault();
        setZoomLevel(Math.max(0.2, zoomLevel / 1.25));
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    undo,
    redo,
    canUndo,
    canRedo,
    togglePlay,
    setCurrentTime,
    currentTimeMs,
    durationMs,
    selectedClipId,
    setSelectedClipId,
    deleteClip,
    splitClipAtCurrentTime,
    zoomLevel,
    setZoomLevel,
    saveProjectFile,
    options,
  ]);
}
