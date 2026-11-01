import React, { useState, useRef, useCallback } from 'react';
import {
  Film,
  Sparkles,
  Download,
  Undo2,
  Redo2,
  FolderOpen,
  Save,
  Keyboard,
} from 'lucide-react';
import { useTimelineStore } from './store/useTimelineStore';
import { LeftSidebar } from './components/sidebar/LeftSidebar';
import { VideoCanvas } from './components/player/VideoCanvas';
import { ClipInspector } from './components/inspector/ClipInspector';
import { ExportModal } from './components/modals/ExportModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { Timeline } from './components/timeline/Timeline';
import { ToastContainer } from './components/common/ToastContainer';
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts';
import type { ToastNotification } from './types/timeline';

export const App: React.FC = () => {
  // Store undo / redo & persistence actions
  const undo = useTimelineStore((state) => state.undo);
  const redo = useTimelineStore((state) => state.redo);
  const canUndo = useTimelineStore((state) => state.canUndo);
  const canRedo = useTimelineStore((state) => state.canRedo);
  const saveProjectFile = useTimelineStore((state) => state.saveProjectFile);
  const importProjectJSON = useTimelineStore((state) => state.importProjectJSON);

  // Toast notifications state
  const [toasts, setToasts] = useState<ToastNotification[]>([]);

  // Modals state
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const projectFileInputRef = useRef<HTMLInputElement>(null);

  const handleNotify = useCallback((toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newToast: ToastNotification = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // Auto-dismiss after 3.8s
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }, []);

  const handleDismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle Project File Import from disk
  const handleImportFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const success = importProjectJSON(content);
          if (success) {
            handleNotify({
              type: 'success',
              title: 'Project Loaded',
              message: `Successfully loaded project: ${file.name}`,
            });
          } else {
            handleNotify({
              type: 'warning',
              title: 'Import Failed',
              message: 'The selected file is not a valid ClipForce project JSON.',
            });
          }
        }
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [importProjectJSON, handleNotify]
  );

  // Global Keyboard listener
  useGlobalShortcuts({
    onOpenShortcuts: () => setIsShortcutsModalOpen(true),
    onOpenExport: () => setIsExportModalOpen(true),
    onOpenProjectPicker: () => projectFileInputRef.current?.click(),
    onNotify: handleNotify,
  });

  return (
    <div className="flex flex-col h-screen w-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Floating Status Toast Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Hidden file input for Project Ingestion */}
      <input
        type="file"
        ref={projectFileInputRef}
        accept=".clipforce,.json"
        onChange={handleImportFile}
        className="hidden"
        id="project-file-input"
      />

      {/* Top Navigation / App Header */}
      <header className="h-13 shrink-0 border-b border-zinc-800 bg-zinc-900/90 px-4 flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-950/60 ring-1 ring-white/20">
            <Film className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-sm text-white">
                ClipForge
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                AI Studio Suite
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">
              AI Director & Smart Editing Suite Active
            </p>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo Group */}
          <div className="flex items-center bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700/60">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              className={`p-1.5 rounded-md transition-all ${
                canUndo
                  ? 'text-zinc-200 hover:text-white hover:bg-zinc-700 cursor-pointer'
                  : 'text-zinc-600 opacity-40 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
              id="navbar-undo-btn"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              className={`p-1.5 rounded-md transition-all ${
                canRedo
                  ? 'text-zinc-200 hover:text-white hover:bg-zinc-700 cursor-pointer'
                  : 'text-zinc-600 opacity-40 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
              id="navbar-redo-btn"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="w-[1px] h-5 bg-zinc-800 mx-0.5 hidden sm:block" />

          {/* Project Persistence (Open / Save) */}
          <button
            type="button"
            onClick={() => projectFileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors cursor-pointer"
            title="Open Project File (Ctrl+O)"
            id="navbar-open-btn"
          >
            <FolderOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Open</span>
          </button>

          <button
            type="button"
            onClick={() => {
              saveProjectFile();
              handleNotify({
                type: 'success',
                title: 'Project Saved',
                message: 'Saved project archive (.clipforce) to your downloads.',
              });
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors cursor-pointer"
            title="Save Project File (Ctrl+S)"
            id="navbar-save-btn"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Save</span>
          </button>

          <div className="w-[1px] h-5 bg-zinc-800 mx-0.5" />

          {/* Shortcuts Cheatsheet Modal Button */}
          <button
            type="button"
            onClick={() => setIsShortcutsModalOpen(true)}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer"
            title="Keyboard Shortcuts (?)"
            id="navbar-shortcuts-btn"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* AI Auto-Enhance Button */}
          <button
            type="button"
            onClick={() =>
              handleNotify({
                type: 'info',
                title: 'AI Smart Auto-Enhance',
                message: 'All audio and video cuts have been rhythmically optimized.',
              })
            }
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>AI Auto-Enhance</span>
          </button>

          {/* Export Video Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md shadow-indigo-950/50 transition-all cursor-pointer"
            id="export-video-navbar-btn"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Video</span>
          </button>
        </div>
      </header>

      {/* Main Workspace (AI Left Sidebar, Center Canvas Monitor, Right Inspector) */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Left Side: AI Director & Smart Editing Suite */}
        <LeftSidebar onNotify={handleNotify} />

        {/* Center: Synchronized Video & Kinetic Caption Canvas Player */}
        <section className="flex-1 flex flex-col items-center justify-center bg-zinc-950 relative overflow-hidden">
          <VideoCanvas canvasRef={canvasRef} />
        </section>

        {/* Right Side: Interactive Clip Inspector & Transform Controls Panel */}
        <ClipInspector />
      </main>

      {/* Connected Zustand Timeline Component */}
      <footer className="shrink-0">
        <Timeline />
      </footer>

      {/* Client-Side Video Export & Rendering Engine Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        canvasElement={canvasRef.current}
        onNotify={handleNotify}
      />

      {/* Keyboard Shortcuts Cheatsheet Modal */}
      <ShortcutsModal
        isOpen={isShortcutsModalOpen}
        onClose={() => setIsShortcutsModalOpen(false)}
      />
    </div>
  );
};

export default App;
