import type { Clip, Track, TimelineProject } from '../types/timeline';

export interface AITemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  durationMs: number;
  samplePrompt: string;
}

export const AI_TEMPLATES: AITemplate[] = [
  {
    id: 'tech-showcase',
    name: 'Tech Showcase',
    description: '3 dynamic scene cuts with futuristic tech beats and neon kinetic subtitles.',
    icon: '⚡',
    durationMs: 28000,
    samplePrompt: 'Create a 30s high-tech gadget review reel with explosive intro beats and sleek transitions.',
  },
  {
    id: 'story-reel',
    name: 'Story Reel',
    description: 'Creator talking-head with warm ambient lo-fi music and centered pop-in captions.',
    icon: '🎙️',
    durationMs: 25000,
    samplePrompt: 'Personal storytelling clip with relaxed lo-fi background audio and punchy pop-up captions.',
  },
  {
    id: 'fitness-motivation',
    name: 'Fitness Motivation',
    description: 'Fast-paced rhythmic jump cuts, high-tempo workout beats, and bold top kinetic titles.',
    icon: '🔥',
    durationMs: 24000,
    samplePrompt: 'High-intensity fitness workout reel with fast jump cuts, heavy bass beats, and bold uppercase captions.',
  },
];

// Helper to generate reliable unique IDs
const makeId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`;

/**
 * AI Director engine that translates user prompt or selected template into
 * a fully sequenced, structured multi-track TimelineProject.
 */
export async function generateTimelineFromPrompt(
  prompt: string,
  templateId?: string,
  onProgress?: (progress: number, step: string) => void
): Promise<TimelineProject> {
  // Step 1: Sentiment and prompt classification
  onProgress?.(15, 'Analyzing prompt intent, mood, and target cadence...');
  await new Promise((r) => setTimeout(r, 400));

  const lowerPrompt = (prompt + ' ' + (templateId || '')).toLowerCase();

  // Classify into matching template
  let matchedType: 'tech' | 'fitness' | 'story' = 'tech';
  if (
    lowerPrompt.includes('fitness') ||
    lowerPrompt.includes('workout') ||
    lowerPrompt.includes('gym') ||
    lowerPrompt.includes('intense') ||
    templateId === 'fitness-motivation'
  ) {
    matchedType = 'fitness';
  } else if (
    lowerPrompt.includes('story') ||
    lowerPrompt.includes('podcast') ||
    lowerPrompt.includes('talk') ||
    lowerPrompt.includes('vlog') ||
    templateId === 'story-reel'
  ) {
    matchedType = 'story';
  }

  // Step 2: Media sourcing and clip sequencing
  onProgress?.(45, 'Synthesizing scene cuts, b-roll footage, and video pacing...');
  await new Promise((r) => setTimeout(r, 500));

  // Step 3: Sound design and audio ducking preparation
  onProgress?.(70, 'Composing audio soundscape and rhythmic beat alignment...');
  await new Promise((r) => setTimeout(r, 450));

  // Step 4: Kinetic caption synthesis
  onProgress?.(90, 'Generating kinetic word-level subtitle alignments...');
  await new Promise((r) => setTimeout(r, 350));

  let tracks: Track[];
  let durationMs: number;
  let title: string;

  if (matchedType === 'fitness') {
    title = '🔥 High-Impact Fitness Reel';
    durationMs = 24000;
    const videoTrackId = makeId('track-v');
    const audioTrackId = makeId('track-a');
    const captionTrackId = makeId('track-c');

    const videoClips: Clip[] = [
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        startAtMs: 0,
        durationMs: 6000,
        trimInMs: 500,
        title: 'Explosive_Power_Set.mp4',
        volume: 1,
        transform: { scale: 1.05, x: 0, y: 0 },
      },
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        startAtMs: 6000,
        durationMs: 6000,
        trimInMs: 3000,
        title: 'Heavy_Deadlift_Focus.mp4',
        volume: 1,
      },
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        startAtMs: 12000,
        durationMs: 6000,
        trimInMs: 7000,
        title: 'Sprint_Cardio_Rush.mp4',
        volume: 1,
        transform: { scale: 1.1, x: 0, y: 0 },
      },
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        startAtMs: 18000,
        durationMs: 6000,
        trimInMs: 12000,
        title: 'Finisher_Victory_Climax.mp4',
        volume: 1,
      },
    ];

    const audioClips: Clip[] = [
      {
        id: makeId('clip-a'),
        trackId: audioTrackId,
        type: 'audio',
        sourceUrl: 'https://actions.google.com/sounds/v1/sports/roller_blade_fast_pass.ogg',
        startAtMs: 0,
        durationMs: 24000,
        trimInMs: 0,
        title: 'Heavy_Bass_Beats_140BPM.mp3',
        volume: 0.85,
      },
    ];

    const captionClips: Clip[] = [
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 500,
        durationMs: 5000,
        trimInMs: 0,
        title: 'DISCIPLINE OVER MOTIVATION',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 6500,
        durationMs: 5000,
        trimInMs: 0,
        title: 'EVERY SINGLE REP COUNTS',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 12500,
        durationMs: 5000,
        trimInMs: 0,
        title: 'BREAK THROUGH YOUR LIMITS',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 18500,
        durationMs: 5000,
        trimInMs: 0,
        title: 'BECOME UNSTOPPABLE TODAY',
        volume: 1,
      },
    ];

    tracks = [
      { id: videoTrackId, type: 'video', label: 'Main Cuts', isMuted: false, isLocked: false, clips: videoClips },
      { id: audioTrackId, type: 'audio', label: 'Bass Beats', isMuted: false, isLocked: false, clips: audioClips },
      { id: captionTrackId, type: 'caption', label: 'Kinetic Titles', isMuted: false, isLocked: false, clips: captionClips },
    ];
  } else if (matchedType === 'story') {
    title = '🎙️ Creator Story Reel';
    durationMs = 25000;
    const videoTrackId = makeId('track-v');
    const audioTrackId = makeId('track-a');
    const captionTrackId = makeId('track-c');

    const videoClips: Clip[] = [
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        startAtMs: 0,
        durationMs: 12500,
        trimInMs: 2000,
        title: 'Creator_Hook_Story.mp4',
        volume: 1,
      },
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        startAtMs: 12500,
        durationMs: 12500,
        trimInMs: 6000,
        title: 'Story_Climax_Lesson.mp4',
        volume: 1,
      },
    ];

    const audioClips: Clip[] = [
      {
        id: makeId('clip-a'),
        trackId: audioTrackId,
        type: 'audio',
        sourceUrl: 'https://actions.google.com/sounds/v1/ambiences/daytime_forest_bonfire.ogg',
        startAtMs: 0,
        durationMs: 25000,
        trimInMs: 0,
        title: 'Chill_Lofi_Acoustic_Guitar.mp3',
        volume: 0.65,
      },
    ];

    const captionClips: Clip[] = [
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 1000,
        durationMs: 5000,
        trimInMs: 0,
        title: 'Here is the secret nobody talks about',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 6500,
        durationMs: 5500,
        trimInMs: 0,
        title: 'Consistency will always beat sheer talent',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 13000,
        durationMs: 5500,
        trimInMs: 0,
        title: 'Show up every day and build in public',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 19500,
        durationMs: 5000,
        trimInMs: 0,
        title: 'Save this reel for tomorrow',
        volume: 1,
      },
    ];

    tracks = [
      { id: videoTrackId, type: 'video', label: 'Story Cam', isMuted: false, isLocked: false, clips: videoClips },
      { id: audioTrackId, type: 'audio', label: 'Lo-Fi Chill', isMuted: false, isLocked: false, clips: audioClips },
      { id: captionTrackId, type: 'caption', label: 'Captions', isMuted: false, isLocked: false, clips: captionClips },
    ];
  } else {
    // Default: Tech Showcase
    title = '⚡ Tech Showcase 2026';
    durationMs = 28000;
    const videoTrackId = makeId('track-v');
    const audioTrackId = makeId('track-a');
    const captionTrackId = makeId('track-c');

    const videoClips: Clip[] = [
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        startAtMs: 0,
        durationMs: 9000,
        trimInMs: 0,
        title: 'Product_Teaser_Hero.mp4',
        volume: 1,
        transform: { scale: 1, x: 0, y: 0 },
      },
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        startAtMs: 9000,
        durationMs: 10000,
        trimInMs: 4000,
        title: 'Architecture_Deep_Dive.mp4',
        volume: 1,
        transform: { scale: 1.05, x: 0, y: 0 },
      },
      {
        id: makeId('clip-v'),
        trackId: videoTrackId,
        type: 'video',
        sourceUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
        startAtMs: 19000,
        durationMs: 9000,
        trimInMs: 8000,
        title: 'Future_Tech_Launch.mp4',
        volume: 1,
      },
    ];

    const audioClips: Clip[] = [
      {
        id: makeId('clip-a'),
        trackId: audioTrackId,
        type: 'audio',
        sourceUrl: 'https://actions.google.com/sounds/v1/science_fiction/alien_spaceship_flyby.ogg',
        startAtMs: 0,
        durationMs: 28000,
        trimInMs: 0,
        title: 'Cyberpunk_Synthwave_Pulse.mp3',
        volume: 0.8,
      },
    ];

    const captionClips: Clip[] = [
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 800,
        durationMs: 4200,
        trimInMs: 0,
        title: 'Meet the Next Evolution in Video Editing',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 5500,
        durationMs: 4500,
        trimInMs: 0,
        title: 'Hardware-Accelerated In-Browser Canvas',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 10500,
        durationMs: 5000,
        trimInMs: 0,
        title: 'Instant AI Director Timeline Generation',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 16500,
        durationMs: 5500,
        trimInMs: 0,
        title: 'Smart Audio Ducking and Jump-Cut Removal',
        volume: 1,
      },
      {
        id: makeId('clip-c'),
        trackId: captionTrackId,
        type: 'caption',
        sourceUrl: '',
        startAtMs: 22500,
        durationMs: 5000,
        trimInMs: 0,
        title: 'Try ClipForce Today - Built for Creators',
        volume: 1,
      },
    ];

    tracks = [
      { id: videoTrackId, type: 'video', label: 'Visual Cuts', isMuted: false, isLocked: false, clips: videoClips },
      { id: audioTrackId, type: 'audio', label: 'Electro Beat', isMuted: false, isLocked: false, clips: audioClips },
      { id: captionTrackId, type: 'caption', label: 'Tech Captions', isMuted: false, isLocked: false, clips: captionClips },
    ];
  }

  onProgress?.(100, 'Timeline assembled and ready!');
  await new Promise((r) => setTimeout(r, 200));

  return {
    id: makeId('project'),
    title,
    durationMs,
    currentTimeMs: 0,
    isPlaying: false,
    zoomLevel: 1,
    tracks,
  };
}
