import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
  X,
  Download,
  Film,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Sliders,
  HardDrive,
  Clock,
  Layers,
  Play,
  RotateCcw,
} from 'lucide-react';
import { useTimelineStore } from '../../store/useTimelineStore';
import type { TimelineProject, ToastNotification } from '../../types/timeline';
import {
  renderTimelineToVideo,
  downloadBlob,
  formatFileSize,
  getSupportedExportFormats,
  type ExportOptions,
} from '../../services/exportService';

export interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  canvasElement: HTMLCanvasElement | null;
  onNotify?: (notification: Omit<ToastNotification, 'id'>) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  canvasElement,
  onNotify,
}) => {
  const durationMs = useTimelineStore((state) => state.durationMs);
  const tracks = useTimelineStore((state) => state.tracks);

  // Configuration options
  const [resolution, setResolution] = useState<'720p' | '1080p' | '4k'>('1080p');
  const [fps, setFps] = useState<30 | 60>(30);
  const [format, setFormat] = useState<'webm' | 'mp4'>('webm');
  const [quality, setQuality] = useState<'high' | 'standard'>('high');
  const [exportRange, setExportRange] = useState<'full' | '10s' | '5s'>('full');

  // Export execution state
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Initializing Engine...');
  const [currentFrame, setCurrentFrame] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [exportedBlob, setExportedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Abort controller reference for cancellation
  const abortControllerRef = useRef<AbortController | null>(null);

  // Check supported formats
  const supportedFormats = useMemo(() => getSupportedExportFormats(), []);

  // Compute effective export duration in milliseconds
  const effectiveDurationMs = useMemo(() => {
    if (exportRange === '5s') return Math.min(5000, durationMs);
    if (exportRange === '10s') return Math.min(10000, durationMs);
    return durationMs;
  }, [exportRange, durationMs]);

  // Estimate file size based on bitrate and duration
  const estimatedSizeBytes = useMemo(() => {
    const videoBitrate = quality === 'high' ? 8_000_000 : 4_000_000;
    const audioBitrate = 192_000;
    const totalBitrate = videoBitrate + audioBitrate;
    const durationSec = effectiveDurationMs / 1000;
    return (totalBitrate * durationSec) / 8;
  }, [quality, effectiveDurationMs]);

  // Clean up preview URL when unmounting or changing blob
  useEffect(() => {
    if (exportedBlob) {
      const url = URL.createObjectURL(exportedBlob);
      setPreviewUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
    setPreviewUrl(null);
  }, [exportedBlob]);

  // Reset state when modal is closed
  const handleClose = useCallback(() => {
    if (isExporting) {
      if (!window.confirm('Export is in progress. Are you sure you want to cancel and exit?')) {
        return;
      }
      abortControllerRef.current?.abort();
      setIsExporting(false);
    }
    setExportedBlob(null);
    setErrorMessage(null);
    setProgress(0);
    onClose();
  }, [isExporting, onClose]);

  // Cancel running export safely
  const handleCancelExport = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExporting(false);
    setProgress(0);
    setStatusMessage('Export cancelled');
    onNotify?.({
      type: 'info',
      title: 'Export Cancelled',
      message: 'Video rendering was safely cancelled and timeline reset.',
    });
  }, [onNotify]);

  // Execute export pipeline
  const handleStartExport = async () => {
    setErrorMessage(null);
    setExportedBlob(null);
    setIsExporting(true);
    setProgress(0);
    setStatusMessage('Preparing rendering pipeline...');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const project: TimelineProject = {
      id: 'clipforce-current-project',
      title: 'ClipForce Master Video',
      durationMs: effectiveDurationMs,
      currentTimeMs: 0,
      isPlaying: false,
      zoomLevel: 1,
      tracks,
    };

    const targetCanvas =
      canvasElement || (document.getElementById('clipforce-preview-canvas') as HTMLCanvasElement);

    if (!targetCanvas) {
      setErrorMessage('Preview canvas not found. Please ensure the preview window is visible.');
      setIsExporting(false);
      return;
    }

    const options: ExportOptions = {
      resolution,
      fps,
      format,
      quality,
      exportDurationMs: effectiveDurationMs,
      abortSignal: abortController.signal,
    };

    try {
      const blob = await renderTimelineToVideo(
        project,
        targetCanvas,
        (prog, status, cFrame, tFrames) => {
          setProgress(prog);
          setStatusMessage(status);
          if (cFrame !== undefined) setCurrentFrame(cFrame);
          if (tFrames !== undefined) setTotalFrames(tFrames);
        },
        options
      );

      setExportedBlob(blob);
      setIsExporting(false);
      onNotify?.({
        type: 'success',
        title: 'Render Completed',
        message: `Successfully encoded ${format.toUpperCase()} video (${formatFileSize(blob.size)}).`,
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setIsExporting(false);
        return;
      }
      console.error('Export error:', err);
      setErrorMessage(
        (err as Error).message || 'An error occurred during video rendering and encoding.'
      );
      setIsExporting(false);
      onNotify?.({
        type: 'warning',
        title: 'Export Failed',
        message: (err as Error).message || 'Failed to render video stream.',
      });
    }
  };

  // Download exported video
  const handleDownload = () => {
    if (!exportedBlob) return;
    downloadBlob(exportedBlob);
    onNotify?.({
      type: 'success',
      title: 'Download Started',
      message: 'Master video file has been saved to your downloads.',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/90 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-amber-500 flex items-center justify-center shadow-lg shadow-indigo-950/60 ring-1 ring-white/20">
              <Film className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                Export Master Video
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                  Client Engine
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Hardware-accelerated canvas compositing & Web Audio pipeline
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-7 h-7 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs text-zinc-200">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2 text-[11px]">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* STATE 1: COMPLETION STATE */}
          {exportedBlob && !isExporting && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-bold text-emerald-200 text-sm">
                    Master Video Ready for Download
                  </h3>
                  <p className="text-[11px] text-emerald-300/80 mt-0.5">
                    Composited successfully with synchronized multi-track audio & kinetic titles.
                  </p>
                </div>
              </div>

              {/* Playable Video Preview */}
              {previewUrl && (
                <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black aspect-video relative group shadow-inner">
                  <video
                    src={previewUrl}
                    controls
                    autoPlay
                    playsInline
                    className="w-full h-full object-contain"
                  />
                </div>
              )}

              {/* Rendered Video Specs Summary */}
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] font-mono">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-sans">File Size</span>
                  <p className="font-bold text-white mt-0.5">{formatFileSize(exportedBlob.size)}</p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-sans">Format</span>
                  <p className="font-bold text-indigo-300 mt-0.5 uppercase">
                    {exportedBlob.type.includes('mp4') ? 'MP4 (H.264)' : 'WebM (VP9)'}
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-sans">Framerate</span>
                  <p className="font-bold text-zinc-300 mt-0.5">{fps} FPS</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:brightness-110 text-white shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Master Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setExportedBlob(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Export Another</span>
                </button>
              </div>
            </div>
          )}

          {/* STATE 2: RENDERING IN PROGRESS */}
          {isExporting && (
            <div className="py-6 space-y-6 text-center">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                {/* Glowing Spinner Background */}
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin"
                  style={{ animationDuration: '1.2s' }}
                />
                <span className="text-xl font-black text-white font-mono tracking-tighter">
                  {progress}%
                </span>
              </div>

              <div>
                <span className="inline-block px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-[11px] font-semibold tracking-wide uppercase">
                  {statusMessage}
                </span>
                <p className="text-[11px] text-zinc-400 mt-2">
                  Rendering frames onto canvas & mixing Web Audio destination stream...
                </p>
              </div>

              {/* Linear Progress Bar */}
              <div className="w-full bg-zinc-800/80 rounded-full h-2.5 overflow-hidden p-0.5 border border-zinc-700/60 shadow-inner">
                <div
                  className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-400 h-full rounded-full transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Rendering Stats Grid */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800 text-[11px] font-mono text-left">
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-sans">
                    Frames Rendered
                  </span>
                  <p className="text-zinc-200 font-medium mt-0.5">
                    {currentFrame} / {totalFrames} frames
                  </p>
                </div>
                <div>
                  <span className="text-zinc-500 text-[10px] uppercase font-sans">Encoding</span>
                  <p className="text-zinc-200 font-medium mt-0.5">
                    {format.toUpperCase()} @ {fps}fps
                  </p>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={handleCancelExport}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-colors cursor-pointer"
              >
                Cancel Export
              </button>
            </div>
          )}

          {/* STATE 3: CONFIGURATION BEFORE EXPORT */}
          {!isExporting && !exportedBlob && (
            <>
              {/* Resolution Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Resolution</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">Output Dimensions</span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {[
                    { id: '1080p', label: '1080p Full HD', dims: '1920×1080', recommended: true },
                    { id: '720p', label: '720p HD', dims: '1280×720', recommended: false },
                    { id: '4k', label: '4K Ultra HD', dims: '3840×2160', recommended: false },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setResolution(item.id as '720p' | '1080p' | '4k')}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                        resolution === item.id
                          ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-sm ring-1 ring-indigo-500/50'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      {item.recommended && (
                        <span className="absolute top-1.5 right-1.5 text-[9px] font-bold px-1 rounded bg-indigo-500 text-white uppercase tracking-wider">
                          Rec
                        </span>
                      )}
                      <p className="font-semibold text-xs text-zinc-200">{item.label}</p>
                      <p className="text-[10px] font-mono text-zinc-500 mt-0.5">{item.dims}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Framerate & Quality Presets */}
              <div className="grid grid-cols-2 gap-4">
                {/* Frame Rate */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-purple-400" />
                    <span>Frame Rate</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { val: 30, label: '30 FPS', note: 'Standard' },
                      { val: 60, label: '60 FPS', note: 'Ultra Smooth' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => setFps(item.val as 30 | 60)}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          fps === item.val
                            ? 'bg-purple-600/15 border-purple-500 text-purple-200 ring-1 ring-purple-500/50 font-bold'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <p className="text-xs">{item.label}</p>
                        <span className="text-[9px] text-zinc-500 block">{item.note}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality Bitrate */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quality Preset</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'high', label: 'High (~8M)', note: 'Master' },
                      { id: 'standard', label: 'Standard (~4M)', note: 'Web' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setQuality(item.id as 'high' | 'standard')}
                        className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                          quality === item.id
                            ? 'bg-amber-600/15 border-amber-500 text-amber-200 ring-1 ring-amber-500/50 font-bold'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <p className="text-xs">{item.label}</p>
                        <span className="text-[9px] text-zinc-500 block">{item.note}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Container Format & Duration Range */}
              <div className="grid grid-cols-2 gap-4">
                {/* Format (WebM vs MP4) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                    <span>Format</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('webm')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${
                        format === 'webm'
                          ? 'bg-teal-600/15 border-teal-500 text-teal-200 ring-1 ring-teal-500/50 font-bold'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <p className="text-xs">WebM</p>
                      <span className="text-[9px] text-zinc-500 block">VP9 / Opus</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormat('mp4')}
                      className={`p-2 rounded-xl border text-center transition-all cursor-pointer relative ${
                        format === 'mp4'
                          ? 'bg-indigo-600/15 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500/50 font-bold'
                          : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <p className="text-xs">MP4</p>
                      <span className="text-[9px] text-zinc-500 block">
                        {supportedFormats.mp4 ? 'Universal' : 'Fallback WebM'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Export Range */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Render Range</span>
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'full', label: 'Full', sec: `${(durationMs / 1000).toFixed(0)}s` },
                      { id: '10s', label: '10s Reel', sec: '10s' },
                      { id: '5s', label: '5s Test', sec: '5s' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setExportRange(item.id as 'full' | '10s' | '5s')}
                        className={`p-1.5 rounded-xl border text-center transition-all cursor-pointer ${
                          exportRange === item.id
                            ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        }`}
                      >
                        <p className="text-[11px]">{item.label}</p>
                        <span className="text-[9px] text-zinc-500 block">{item.sec}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Estimate & Hardware Stats Summary */}
              <div className="p-3.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Duration: {(effectiveDurationMs / 1000).toFixed(1)}s</span>
                  <span className="text-zinc-600">•</span>
                  <span>Est. Size: ~{formatFileSize(estimatedSizeBytes)}</span>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase">
                  Hardware VP9/Opus
                </span>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleStartExport}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-500 hover:brightness-110 text-white shadow-lg shadow-indigo-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start Video Render</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
