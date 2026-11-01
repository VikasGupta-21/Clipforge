import React, { useState, useRef, useMemo } from 'react';
import {
  FolderOpen,
  Wand2,
  Type,
  Volume2,
  Sparkles,
  Loader2,
  Scissors,
  Check,
  Zap,
  ArrowRight,
  Radio,
  UploadCloud,
  Film,
  Music,
  Image as ImageIcon,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { useTimelineStore } from '../../store/useTimelineStore';
import { useMediaStore } from '../../store/useMediaStore';
import {
  AI_TEMPLATES,
  generateTimelineFromPrompt,
} from '../../services/aiDirectorService';
import {
  applyAudioDucking,
  detectAndRemoveSilence,
  generateSubtitlesFromAudio,
} from '../../services/smartAudioService';
import { formatDurationSeconds, formatTimecode } from '../../utils/timelineUtils';
import type { CaptionStylePreset, ToastNotification, Clip } from '../../types/timeline';
import type { MediaAsset, MediaFilter } from '../../types/media';

interface LeftSidebarProps {
  onNotify: (toast: Omit<ToastNotification, 'id'>) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ onNotify }) => {
  const [activeTab, setActiveTab] = useState<'media' | 'director' | 'captions' | 'audio'>('media');

  // Media Store state & actions
  const assets = useMediaStore((state) => state.assets);
  const activeFilter = useMediaStore((state) => state.activeFilter);
  const setFilter = useMediaStore((state) => state.setFilter);
  const addAsset = useMediaStore((state) => state.addAsset);
  const removeAsset = useMediaStore((state) => state.removeAsset);
  const extractMediaMetadata = useMediaStore((state) => state.extractMediaMetadata);

  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingOverDropzone, setIsDraggingOverDropzone] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Director state
  const [prompt, setPrompt] = useState(
    'Create a 30s tech review reel with high-energy beats'
  );
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tech-showcase');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');

  // Captions state
  const [captionStyle, setCaptionStyle] = useState<CaptionStylePreset>('tiktok');
  const [isTranscribing, setIsTranscribing] = useState(false);

  // Audio state
  const [isDuckingActive, setIsDuckingActive] = useState(false);
  const [isRemovingSilence, setIsRemovingSilence] = useState(false);

  const tracks = useTimelineStore((state) => state.tracks);
  const currentTimeMs = useTimelineStore((state) => state.currentTimeMs);
  const loadProject = useTimelineStore((state) => state.loadProject);
  const setTracks = useTimelineStore((state) => state.setTracks);
  const addClip = useTimelineStore((state) => state.addClip);

  // Quick prompt tags for AI Director
  const styleTags = [
    { label: '⚡ Cinematic', text: 'Cinematic widescreen reel with dramatic intro and high contrast grade' },
    { label: '🔥 Viral Short', text: 'Fast-paced vertical viral short with jump cuts and punchy hooks' },
    { label: '🎙️ Podcast Clip', text: 'Engaging talk show highlight with ambient lo-fi music and subtitles' },
    { label: '💪 Fitness', text: 'Motivational fitness workout reel with explosive drop beats and kinetic captions' },
  ];

  // Process uploaded files
  const processFiles = async (files: FileList | File[]) => {
    if (files.length === 0) return;
    setIsUploading(true);

    let count = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const asset = await extractMediaMetadata(file);
        addAsset(asset);
        count++;
      } catch (err) {
        console.error('Failed to process file:', file.name, err);
      }
    }

    setIsUploading(false);
    if (count > 0) {
      onNotify({
        type: 'success',
        title: 'Media Uploaded',
        message: `Successfully processed ${count} asset(s) with duration & thumbnail metadata.`,
      });
    }
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingOverDropzone(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  // Filtered asset list
  const filteredAssets = useMemo(() => {
    if (activeFilter === 'all') return assets;
    return assets.filter((a) => a.type === activeFilter);
  }, [assets, activeFilter]);

  // Add Asset directly to timeline at current playhead position
  const handleAddAssetToTimeline = (asset: MediaAsset) => {
    if (asset.type === 'video' || asset.type === 'image') {
      const videoTrack = tracks.find((t) => t.type === 'video');
      if (!videoTrack) {
        onNotify({
          type: 'warning',
          title: 'No Video Track',
          message: 'Please create or unlock a video track to insert video/image clips.',
        });
        return;
      }

      const newClip: Clip = {
        id: `clip-v-${Date.now()}`,
        trackId: videoTrack.id,
        type: 'video',
        sourceUrl: asset.url,
        startAtMs: currentTimeMs,
        durationMs: asset.durationMs || 5000,
        trimInMs: 0,
        title: asset.name,
        volume: 1,
        transform: { scale: 1, x: 0, y: 0 },
      };

      addClip(videoTrack.id, newClip);
      onNotify({
        type: 'success',
        title: 'Clip Added to Timeline',
        message: `Added "${asset.name}" to Video Track at ${formatTimecode(currentTimeMs)}.`,
      });
    } else if (asset.type === 'audio') {
      const audioTrack = tracks.find((t) => t.type === 'audio');
      if (!audioTrack) {
        onNotify({
          type: 'warning',
          title: 'No Audio Track',
          message: 'Please create or unlock an audio track to insert audio clips.',
        });
        return;
      }

      const newClip: Clip = {
        id: `clip-a-${Date.now()}`,
        trackId: audioTrack.id,
        type: 'audio',
        sourceUrl: asset.url,
        startAtMs: currentTimeMs,
        durationMs: asset.durationMs || 15000,
        trimInMs: 0,
        title: asset.name,
        volume: 0.8,
      };

      addClip(audioTrack.id, newClip);
      onNotify({
        type: 'success',
        title: 'Audio Added to Timeline',
        message: `Added "${asset.name}" to Audio Track at ${formatTimecode(currentTimeMs)}.`,
      });
    }
  };

  // Handle AI Director generation
  const handleGenerateTimeline = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerationProgress(5);
    setGenerationStep('Initializing AI Director Engine...');

    try {
      const generatedProject = await generateTimelineFromPrompt(
        prompt,
        selectedTemplateId,
        (progress, step) => {
          setGenerationProgress(progress);
          setGenerationStep(step);
        }
      );

      loadProject(generatedProject);

      onNotify({
        type: 'success',
        title: 'Timeline Generated Successfully!',
        message: `Assembled ${generatedProject.tracks.length} tracks with ${generatedProject.title}.`,
      });
    } catch {
      onNotify({
        type: 'warning',
        title: 'Generation Failed',
        message: 'Could not generate timeline. Please try again.',
      });
    } finally {
      setIsGenerating(false);
      setGenerationProgress(0);
      setGenerationStep('');
    }
  };

  // Handle Auto-Transcribe Speech
  const handleAutoTranscribe = async () => {
    if (isTranscribing) return;
    setIsTranscribing(true);

    try {
      await new Promise((r) => setTimeout(r, 650));

      const audioTrack = tracks.find((t) => t.type === 'audio') || tracks.find((t) => t.type === 'video');
      const sampleClip = audioTrack?.clips[0] || {
        id: 'clip-virtual',
        trackId: 'track-audio-1',
        type: 'audio' as const,
        sourceUrl: '',
        startAtMs: 0,
        durationMs: 25000,
        trimInMs: 0,
        title: 'Virtual Voiceover',
        volume: 1,
      };

      const newCaptionClips = generateSubtitlesFromAudio(sampleClip, captionStyle);

      let captionTrackExists = false;
      const updatedTracks = tracks.map((track) => {
        if (track.type === 'caption') {
          captionTrackExists = true;
          return {
            ...track,
            clips: [...track.clips, ...newCaptionClips],
          };
        }
        return track;
      });

      if (!captionTrackExists) {
        updatedTracks.push({
          id: 'track-caption-auto',
          type: 'caption',
          label: 'Auto Captions',
          isMuted: false,
          isLocked: false,
          clips: newCaptionClips,
        });
      }

      setTracks(updatedTracks);

      onNotify({
        type: 'success',
        title: 'Speech Transcribed!',
        message: `Generated ${newCaptionClips.length} kinetic caption clips using '${captionStyle}' style.`,
      });
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle Silence Removal
  const handleSilenceRemoval = async () => {
    if (isRemovingSilence) return;
    setIsRemovingSilence(true);

    try {
      await new Promise((r) => setTimeout(r, 550));

      const videoTrack = tracks.find((t) => t.type === 'video');
      if (!videoTrack || videoTrack.clips.length === 0) {
        onNotify({
          type: 'warning',
          title: 'No Video Clips Found',
          message: 'Add video clips to the timeline before removing pauses.',
        });
        return;
      }

      const { updatedClips, removedCount, savedMs } = detectAndRemoveSilence(
        videoTrack.clips,
        400
      );

      const updatedTracks = tracks.map((track) =>
        track.id === videoTrack.id ? { ...track, clips: updatedClips } : track
      );

      setTracks(updatedTracks);

      onNotify({
        type: 'success',
        title: 'Jump-Cuts Applied!',
        message: `Removed ${removedCount} pauses (>400ms), tightening timeline by ${(
          savedMs / 1000
        ).toFixed(1)}s.`,
      });
    } finally {
      setIsRemovingSilence(false);
    }
  };

  // Handle Smart Audio Ducking
  const handleToggleDucking = () => {
    const audioTrack = tracks.find((t) => t.type === 'audio');
    const videoTrack = tracks.find((t) => t.type === 'video');

    if (!audioTrack || audioTrack.clips.length === 0) {
      onNotify({
        type: 'warning',
        title: 'No Audio Clips Found',
        message: 'Add background audio to the timeline to apply smart ducking.',
      });
      return;
    }

    if (isDuckingActive) {
      const restoredClips = audioTrack.clips.map((clip) => ({
        ...clip,
        volume: 0.8,
        title: clip.title.replace(' (Ducked 70%)', ''),
      }));
      setTracks(
        tracks.map((t) => (t.id === audioTrack.id ? { ...t, clips: restoredClips } : t))
      );
      setIsDuckingActive(false);
      onNotify({
        type: 'info',
        title: 'Smart Ducking Disabled',
        message: 'Background music volumes restored to standard levels.',
      });
    } else {
      const voiceSegments = videoTrack ? videoTrack.clips : [];
      const duckedClips = applyAudioDucking(audioTrack.clips, voiceSegments);

      setTracks(
        tracks.map((t) => (t.id === audioTrack.id ? { ...t, clips: duckedClips } : t))
      );
      setIsDuckingActive(true);
      onNotify({
        type: 'success',
        title: 'Smart Ducking Active!',
        message: 'Lowered background audio by 70% during active voiceover segments.',
      });
    }
  };

  return (
    <aside className="w-80 shrink-0 border-r border-zinc-800 bg-zinc-900/90 flex flex-col h-full overflow-hidden select-none z-20">
      {/* Sidebar Navigation Tabs */}
      <div className="h-11 border-b border-zinc-800 flex items-center px-2 bg-zinc-950/60 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('media')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'media'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          title="Media Library & Local Uploader"
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>Media</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('director')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'director'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-indigo-950/50'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          title="AI Director Studio"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>Director</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('captions')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'captions'
              ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          title="Smart Captions & Subtitles"
        >
          <Type className="w-3.5 h-3.5" />
          <span>Captions</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audio')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === 'audio'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/50'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
          }`}
          title="Smart Audio Suite"
        >
          <Volume2 className="w-3.5 h-3.5" />
          <span>Audio</span>
        </button>
      </div>

      {/* Tab Panels Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-4">
        {/* ==================== TAB 1: MEDIA UPLOADER & ASSETS ==================== */}
        {activeTab === 'media' && (
          <div className="space-y-3.5 animate-in fade-in-50 duration-150">
            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="video/mp4,video/webm,video/ogg,video/quicktime,audio/mp3,audio/wav,audio/ogg,audio/mpeg,image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* Drag-and-Drop Dropzone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverDropzone(true);
              }}
              onDragLeave={() => setIsDraggingOverDropzone(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2 ${
                isDraggingOverDropzone
                  ? 'border-indigo-400 bg-indigo-500/15 scale-[1.02]'
                  : 'border-zinc-700/80 hover:border-indigo-500/60 bg-zinc-950/60 hover:bg-zinc-950/80'
              }`}
            >
              <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">
                  {isUploading ? 'Extracting Metadata & Thumbnails...' : 'Drop media files or browse'}
                </p>
                <p className="text-[10px] text-zinc-400 mt-0.5">
                  MP4, WebM, MP3, WAV, PNG, JPG (Local Object URLs)
                </p>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-lg border border-zinc-800 text-[11px]">
              {(['all', 'video', 'audio', 'image'] as MediaFilter[]).map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setFilter(filter)}
                  className={`flex-1 py-1 rounded capitalize font-medium transition-all ${
                    activeFilter === filter
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Media Asset Cards Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-zinc-400 px-0.5">
                <span>{filteredAssets.length} asset(s) ready</span>
                <span className="text-[10px] text-zinc-500 font-mono">Drag card onto track</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {filteredAssets.map((asset) => {
                  const isVideo = asset.type === 'video';
                  const isAudio = asset.type === 'audio';

                  return (
                    <div
                      key={asset.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          'application/json',
                          JSON.stringify({
                            assetId: asset.id,
                            type: asset.type,
                            name: asset.name,
                            url: asset.url,
                            durationMs: asset.durationMs,
                            width: asset.width,
                            height: asset.height,
                          })
                        );
                        e.dataTransfer.effectAllowed = 'copyMove';
                      }}
                      className="group p-2 rounded-xl bg-zinc-950/80 border border-zinc-800/80 hover:border-zinc-700 flex items-center gap-2.5 transition-all hover:shadow-lg cursor-grab active:cursor-grabbing relative overflow-hidden"
                    >
                      {/* Drag Grip Handle */}
                      <div className="text-zinc-600 group-hover:text-zinc-400 cursor-grab shrink-0">
                        <GripVertical className="w-3.5 h-3.5" />
                      </div>

                      {/* Thumbnail or Fallback Icon */}
                      <div className="w-14 h-12 rounded-lg bg-zinc-900 border border-zinc-800/80 overflow-hidden shrink-0 flex items-center justify-center relative">
                        {asset.thumbnail ? (
                          <img
                            src={asset.thumbnail}
                            alt={asset.name}
                            className="w-full h-full object-cover"
                          />
                        ) : isVideo ? (
                          <Film className="w-5 h-5 text-indigo-400" />
                        ) : isAudio ? (
                          <Music className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-amber-400" />
                        )}

                        {/* Duration Pill */}
                        <div className="absolute bottom-0.5 right-0.5 px-1 py-0.2 bg-black/80 rounded text-[9px] font-mono text-zinc-300">
                          {formatDurationSeconds(asset.durationMs)}
                        </div>
                      </div>

                      {/* Asset Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-mono font-bold px-1 rounded uppercase ${
                              isVideo
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : isAudio
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {asset.type}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            {asset.sizeFormatted}
                          </span>
                        </div>
                        <p
                          className="text-xs font-semibold text-zinc-200 truncate mt-0.5"
                          title={asset.name}
                        >
                          {asset.name}
                        </p>
                      </div>

                      {/* Actions: Add to Playhead & Delete */}
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddAssetToTimeline(asset);
                          }}
                          className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer shadow-sm"
                          title={`Insert at ${formatTimecode(currentTimeMs)}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeAsset(asset.id);
                          }}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete asset from bin"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: AI DIRECTOR ==================== */}
        {activeTab === 'director' && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  AI Director Prompt Engine
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Describe the video you want. The AI Director will assemble cuts, background audio, and kinetic titles.
              </p>
            </div>

            {/* Prompt Input Box */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
                Video Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
                placeholder="e.g. Create a 30s tech review reel with high-energy beats..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none leading-relaxed"
              />
            </div>

            {/* Quick Style Tags */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
                Quick Styles
              </span>
              <div className="flex flex-wrap gap-1.5">
                {styleTags.map((tag) => (
                  <button
                    key={tag.label}
                    type="button"
                    onClick={() => setPrompt(tag.text)}
                    className="px-2 py-1 rounded-md text-[10px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-zinc-700/50 transition-colors cursor-pointer"
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Preset Templates */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
                Preset Templates
              </span>
              <div className="grid grid-cols-1 gap-2">
                {AI_TEMPLATES.map((tmpl) => (
                  <button
                    key={tmpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tmpl.id);
                      setPrompt(tmpl.samplePrompt);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                      selectedTemplateId === tmpl.id
                        ? 'bg-indigo-600/15 border-indigo-500 shadow-sm'
                        : 'bg-zinc-950/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="text-xl shrink-0 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
                      {tmpl.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">
                          {tmpl.name}
                        </span>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {Math.round(tmpl.durationMs / 1000)}s
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2 leading-snug">
                        {tmpl.description}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Progress Bar (when generating) */}
            {isGenerating && (
              <div className="bg-zinc-950 p-3 rounded-xl border border-indigo-500/30 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{generationStep}</span>
                  </span>
                  <span className="font-mono text-indigo-300 font-bold">
                    {generationProgress}%
                  </span>
                </div>
                <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${generationProgress}%` }}
                    className="bg-gradient-to-r from-indigo-500 via-purple-500 to-amber-500 h-full transition-all duration-300 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateTimeline}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isGenerating
                  ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-amber-600 hover:brightness-110 shadow-lg shadow-indigo-950/60 active:scale-[0.99]'
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing Multi-Track...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Timeline</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                </>
              )}
            </button>
          </div>
        )}

        {/* ==================== TAB 3: CAPTIONS ==================== */}
        {activeTab === 'captions' && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <div>
              <div className="flex items-center gap-2">
                <Type className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Smart Captions & Subtitles
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                One-click speech-to-text with word-level timestamps and kinetic highlights.
              </p>
            </div>

            {/* One-Click Auto Transcribe Button */}
            <div className="bg-gradient-to-br from-amber-500/10 to-transparent p-3.5 rounded-xl border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">AI Voice Transcription</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Detects voice audio, generates synced subtitles, and renders them onto the Caption track.
              </p>
              <button
                type="button"
                disabled={isTranscribing}
                onClick={handleAutoTranscribe}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isTranscribing
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-amber-600 hover:bg-amber-500 shadow-md shadow-amber-950/50'
                }`}
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing Audio Waves...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Transcribe Speech</span>
                  </>
                )}
              </button>
            </div>

            {/* Font Style Presets */}
            <div className="space-y-2">
              <span className="text-[10px] font-semibold uppercase text-zinc-500 tracking-wider">
                Font & Kinetic Style Presets
              </span>
              <div className="space-y-1.5">
                {[
                  {
                    id: 'tiktok' as CaptionStylePreset,
                    name: 'TikTok Pop',
                    desc: 'Vibrant uppercase text with bright yellow active word highlight.',
                  },
                  {
                    id: 'classic' as CaptionStylePreset,
                    name: 'Classic Film',
                    desc: 'Clean sentence-case subtitle badge with high-contrast backdrop.',
                  },
                  {
                    id: 'minimalist' as CaptionStylePreset,
                    name: 'Minimalist Clean',
                    desc: 'Monochrome sleek typography for corporate and tutorial reels.',
                  },
                ].map((style) => (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setCaptionStyle(style.id)}
                    className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between cursor-pointer ${
                      captionStyle === style.id
                        ? 'bg-amber-500/15 border-amber-500 text-white'
                        : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{style.name}</div>
                      <div className="text-[10px] text-zinc-400 mt-0.5">{style.desc}</div>
                    </div>
                    {captionStyle === style.id && (
                      <Check className="w-4 h-4 text-amber-400 shrink-0 ml-2" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 4: SMART AUDIO ==================== */}
        {activeTab === 'audio' && (
          <div className="space-y-4 animate-in fade-in-50 duration-150">
            <div>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Smart Audio Suite
                </h3>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1">
                Automated audio leveling, jump-cut silence removal, and speech-aware ducking.
              </p>
            </div>

            {/* Jump Cut Silence Removal */}
            <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-2.5">
              <div className="flex items-center gap-2">
                <Scissors className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Silence Removal & Jump Cuts</span>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Detects pauses longer than 400ms and ripples clips forward to create engaging pacing.
              </p>
              <button
                type="button"
                disabled={isRemovingSilence}
                onClick={handleSilenceRemoval}
                className={`w-full py-2 px-3 rounded-lg text-xs font-semibold text-white flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  isRemovingSilence
                    ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-950/40'
                }`}
              >
                {isRemovingSilence ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Rippling Jump Cuts...</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-3.5 h-3.5" />
                    <span>Remove Pauses & Jump Cuts</span>
                  </>
                )}
              </button>
            </div>

            {/* Smart Audio Ducking Toggle */}
            <div className="bg-zinc-950/70 p-3.5 rounded-xl border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radio className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">Auto-Ducking</span>
                </div>
                <button
                  type="button"
                  onClick={handleToggleDucking}
                  className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                    isDuckingActive ? 'bg-emerald-500' : 'bg-zinc-800'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      isDuckingActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug">
                Automatically lowers background music volume by 70% whenever speech or dialogue is active.
              </p>
              <div className="text-[10px] font-mono p-2 rounded bg-zinc-900 border border-zinc-800 flex items-center justify-between text-zinc-400">
                <span>Ducking Reduction:</span>
                <span className="text-emerald-400 font-bold">-70% (0.24 vol)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
