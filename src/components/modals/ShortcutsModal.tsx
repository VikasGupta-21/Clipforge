import React, { useState, useMemo } from 'react';
import {
  X,
  Keyboard,
  Play,
  Scissors,
  RotateCcw,
  MousePointer,
  Download,
  Search,
  Command,
} from 'lucide-react';

export interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'playback' | 'timeline' | 'history' | 'selection' | 'export';
}

const SHORTCUTS_DATA: ShortcutItem[] = [
  // Playback
  { keys: ['Space'], description: 'Play / Pause Timeline Playback', category: 'playback' },
  { keys: ['Home'], description: 'Jump to Beginning (0:00)', category: 'playback' },
  { keys: ['←', '→'], description: 'Step Backward / Forward (100ms)', category: 'playback' },
  { keys: ['Shift', '← / →'], description: 'Step Backward / Forward (1.0s)', category: 'playback' },

  // Timeline
  { keys: ['S'], description: 'Split Clip at Current Playhead', category: 'timeline' },
  { keys: ['Del'], description: 'Delete Selected Clip', category: 'timeline' },
  { keys: ['Backspace'], description: 'Delete Selected Clip', category: 'timeline' },
  { keys: ['+'], description: 'Zoom In Timeline Scale', category: 'timeline' },
  { keys: ['-'], description: 'Zoom Out Timeline Scale', category: 'timeline' },

  // History & Project
  { keys: ['Ctrl', 'Z'], description: 'Undo Last Timeline Action', category: 'history' },
  { keys: ['Ctrl', 'Y'], description: 'Redo Previous Action', category: 'history' },
  { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo Previous Action (Mac / Windows)', category: 'history' },
  { keys: ['Ctrl', 'S'], description: 'Quick Save Project File (.clipforce)', category: 'history' },
  { keys: ['Ctrl', 'O'], description: 'Open / Ingest Project File', category: 'history' },

  // Selection & Tools
  { keys: ['Esc'], description: 'Deselect Active Clip', category: 'selection' },
  { keys: ['?'], description: 'Toggle Keyboard Shortcuts Cheatsheet', category: 'selection' },

  // Export
  { keys: ['Ctrl', 'E'], description: 'Open Master Video Export Dialog', category: 'export' },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) return SHORTCUTS_DATA;
    const q = searchQuery.toLowerCase();
    return SHORTCUTS_DATA.filter(
      (item) =>
        item.description.toLowerCase().includes(q) ||
        item.keys.some((k) => k.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const categories = useMemo(
    () => [
      {
        id: 'playback',
        title: 'Playback & Scrubbing',
        icon: Play,
        color: 'text-indigo-400',
        items: filteredShortcuts.filter((s) => s.category === 'playback'),
      },
      {
        id: 'timeline',
        title: 'Timeline & Editing',
        icon: Scissors,
        color: 'text-purple-400',
        items: filteredShortcuts.filter((s) => s.category === 'timeline'),
      },
      {
        id: 'history',
        title: 'History & Project Persistence',
        icon: RotateCcw,
        color: 'text-amber-400',
        items: filteredShortcuts.filter((s) => s.category === 'history'),
      },
      {
        id: 'selection',
        title: 'Selection & Tools',
        icon: MousePointer,
        color: 'text-emerald-400',
        items: filteredShortcuts.filter((s) => s.category === 'selection'),
      },
      {
        id: 'export',
        title: 'Production Export',
        icon: Download,
        color: 'text-teal-400',
        items: filteredShortcuts.filter((s) => s.category === 'export'),
      },
    ],
    [filteredShortcuts]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-950/60 ring-1 ring-white/20">
              <Keyboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Keyboard Shortcuts Cheatsheet
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Hotkeys
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Studio-grade hotkeys for seamless editing and composition
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-6 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search shortcuts (e.g. split, undo, zoom, play)..."
              className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Modal Body: Categorized Grid */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {categories
            .filter((c) => c.items.length > 0)
            .map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.id} className="space-y-2.5">
                  <div className="flex items-center gap-2 text-zinc-300 font-semibold text-[11px] uppercase tracking-wider">
                    <Icon className={`w-3.5 h-3.5 ${cat.color}`} />
                    <span>{cat.title}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {cat.items.map((item, idx) => (
                      <div
                        key={`${item.description}-${idx}`}
                        className="p-2.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700/80 flex items-center justify-between gap-3 transition-colors"
                      >
                        <span className="text-zinc-300 text-xs truncate">
                          {item.description}
                        </span>

                        <div className="flex items-center gap-1 shrink-0 font-mono">
                          {item.keys.map((key, kIdx) => (
                            <kbd
                              key={`${key}-${kIdx}`}
                              className="px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 text-[11px] font-semibold shadow-sm"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-xs">No shortcuts matching &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-[11px] text-zinc-500 shrink-0">
          <div className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-zinc-400" />
            <span>Tip: Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">?</kbd> anywhere to toggle this panel</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-xs transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
