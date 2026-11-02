# 🎬 ClipForge — Browser-Native AI Video Studio

[![React 19](https://img.shields.io/badge/React-19.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Zustand](https://img.shields.io/badge/Zustand-5.x-orange?style=for-the-badge&logo=zustand&logoColor=white)](https://github.com/pmndrs/zustand)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg?style=for-the-badge)](LICENSE)

> **A browser-native, AI-assisted video editing studio featuring multi-track timelines, synchronized canvas compositing, smart audio processing, and client-side media rendering.**

ClipForge is an experimental, high-performance web-based video editing platform that runs entirely in the browser without server-side transcoding dependencies. Combining modern HTML5 Canvas, Web Audio API, and Zustand state orchestration, ClipForge delivers real-time playback, AI-driven timeline automation, kinetic captions, and hardware-accelerated video export.

---

## ✨ Key Architectural Highlights

### 1. Synchronized 60fps HTML5 Canvas Compositor
- **Dual Aspect Ratios**: Native switching between **16:9 widescreen** ($1920\times 1080$) and **9:16 vertical reels** ($1080\times 1920$) with smart pillarbox/letterbox and blurred background fills.
- **Transform Engine**: Real-time canvas matrix manipulation (`scale`, position offsets `x`/`y`, rotation, and `globalAlpha` opacity) applied per clip with hardware acceleration.
- **Dynamic Kinetic Subtitles**: Word-level active highlighting, rounded container pill compositing, and font scale presets burned directly into the canvas context for synchronized preview and video export.

### 2. Zustand Timeline State Engine
- **Sub-Millisecond Tracking**: Synchronized playhead tracking with chronological lane management across video, audio, and subtitle tracks.
- **History Snapshot Architecture**: Complete Undo/Redo stack (`past` and `future` project states) with deep snapshotting before destructive actions (splits, trims, volume adjustments, and track reordering).
- **Interactive Multi-Track Lanes**: Draggable scrub head, visual trimming handles, clip splitting (`S`), ripple repositioning, track locking, and mute states.

### 3. AI Director & Smart Editing Suite
- **Prompt-to-Timeline Generator**: Translates natural language prompts (e.g., *"Create a 30s tech showcase reel with energetic beats"*) into structured multi-track cuts with pre-timed kinetic titles.
- **Smart Audio Ducking**: Real-time sidechain-style gain attenuation that automatically lowers background music whenever voiceover clips are detected.
- **Jump-Cut Silence Removal**: Automatic dead-air detection and automated timeline compaction.
- **Speech-to-Subtitles**: Kinetic subtitle generator with customizable visual color palettes (Yellow, Cyan, Emerald, White, Rose).

### 4. Client-Side Hardware-Accelerated Video Export
- **MediaStream Recording**: Uses `HTMLCanvasElement.captureStream(fps)` piped directly into `MediaRecorder` with automatic codec fallback (`VP9/Opus` WebM and `H.264/AAC` MP4).
- **Web Audio Multi-Track Mixing**: Master audio destination stream routing with sub-millisecond audio buffer scheduling, hardware gain staging, and live carrier keep-alives.
- **Customizable Export Presets**: Resolution ($720\text{p}$, $1080\text{p}$, $4\text{K}$), Framerates ($30\text{ fps}$ / $60\text{ fps}$), Bitrates (High $8\text{ Mbps}$ / Standard $4\text{ Mbps}$), and custom timeline render ranges.

### 5. Project Persistence & Portability
- **`.clipforce` Archive Ingestion**: Full project schema export and import enabling offline storage and project portability without cloud lock-in.

---

## 🛠️ Tech Stack Breakdown

| Technology | Purpose |
| :--- | :--- |
| **React 19** | Concurrent UI layer, portal modals, and optimized component lifecycles |
| **TypeScript 5** | Strict type safety across timeline models, tracks, clips, and transforms |
| **Tailwind CSS v4** | Dark-mode studio aesthetic, glassmorphic overlays, and micro-interactions |
| **Zustand 5** | Centralized reactive timeline state, scrub sync, and immutable history |
| **HTML5 Canvas 2D API** | Real-time compositing, matrix transforms, and kinetic typography rendering |
| **Web Audio API** | Hardware multi-track audio mixing, sidechain ducking, and stream destinations |
| **MediaRecorder API** | Client-side video encoding directly to downloadable WebM and MP4 Blobs |
| **Lucide React** | Consistent iconography across editor toolbars and timeline tracks |

---

## 🚀 Local Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- `npm` or `pnpm`

### 1. Clone the Repository
```bash
git clone https://github.com/VikasGupta-21/Clipforge.git
cd Clipforge
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Development Server
```bash
npm run dev
```
The application will launch locally at `http://localhost:5173`.

### 4. Production Build
```bash
npm run build
```
Generates a type-checked and minified client bundle in the `/dist` directory.

---

## ⌨️ Studio Keyboard Shortcuts

Press <kbd>?</kbd> anywhere in the application to display the interactive shortcuts cheatsheet:

| Category | Shortcut | Action |
| :--- | :--- | :--- |
| **Playback** | <kbd>Space</kbd> | Toggle Play / Pause |
| | <kbd>Home</kbd> | Return Playhead to Start ($0:00$) |
| | <kbd>←</kbd> / <kbd>→</kbd> | Step Playhead $100\text{ms}$ Backward / Forward |
| | <kbd>Shift</kbd> + <kbd>←</kbd> / <kbd>→</kbd> | Step Playhead $1.0\text{s}$ Backward / Forward |
| **Timeline** | <kbd>S</kbd> | Split Selected Clip at Playhead |
| | <kbd>Del</kbd> / <kbd>Backspace</kbd> | Delete Selected Clip |
| | <kbd>+</kbd> / <kbd>-</kbd> | Zoom In / Zoom Out Timeline Scale |
| **History & File** | <kbd>Ctrl</kbd> + <kbd>Z</kbd> | Undo Last Action |
| | <kbd>Ctrl</kbd> + <kbd>Y</kbd> / <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd> | Redo Action |
| | <kbd>Ctrl</kbd> + <kbd>S</kbd> | Save Project Archive (`.clipforce`) |
| | <kbd>Ctrl</kbd> + <kbd>O</kbd> | Open / Ingest Project File |
| | <kbd>Ctrl</kbd> + <kbd>E</kbd> | Open Master Video Export Dialog |
| **Selection** | <kbd>Esc</kbd> | Deselect Active Clip |
| | <kbd>?</kbd> | Toggle Hotkeys Modal |

---

## 📁 Repository Structure

```text
clipforge/
├── src/
│   ├── components/
│   │   ├── common/           # Toast notifications & alert banners
│   │   ├── inspector/        # Clip properties, transform controls & audio sliders
│   │   ├── modals/           # Export master dialog & shortcuts cheatsheet
│   │   ├── player/           # HTML5 Canvas compositor & playback monitor
│   │   ├── sidebar/          # AI Director, Smart Editing & Media Asset Library
│   │   └── timeline/         # Multi-track lanes, TimeRuler & draggable clips
│   ├── hooks/                # Global keyboard hotkeys & system events
│   ├── services/             # Client-side video export, AI Director engine & audio ducking
│   ├── store/                # Zustand timeline store (history stack) & media store
│   ├── types/                # Strict TypeScript domain interfaces
│   ├── utils/                # Timecode formatting, ruler math & aspect calculations
│   ├── App.tsx               # Studio layout container & top navigation
│   └── main.tsx              # Application entry point
├── package.json
└── README.md
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
