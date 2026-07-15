# Accessible Media Studio

**Open Source · Browser-Only · Accessible**

**An accessibility-first media studio that lets anyone edit audio and video entirely with a keyboard.**

- **Fully local — No Server**
- **NVDA / JAWS / VoiceOver**
- 🎹 **Keyboard First**
- **Persistent Library**
- 🎚️ **Live Mixer (Super Merger)**

---

## Why This Project?

Most media editing tools — whether desktop software or online services — are visually driven. Their interfaces rely heavily on timelines you drag, waveforms you click on, and menus that open with a right-click. For people who are blind or have low vision and rely on screen readers like **NVDA**, **JAWS**, or **VoiceOver**, these tools are essentially unusable.

This project was built to answer a simple question: _What if a media studio was designed for keyboard and screen reader users from day one — not as an afterthought?_

- **Accessibility First**: Every feature was designed to work fully via keyboard. No drag-and-drop. No visual-only controls. Every element has a label.
- **Privacy by Default**: Your files never leave your device. No uploads, no accounts, no cloud. Everything is processed locally in your browser.
- 🚫 **No Installation Required**: Open a single HTML file and it works. No Python, no Node.js, no app stores. Just your browser.
- **Live Mixer for Everyone**: Super Merger lets you perform a live audio mix using only keyboard shortcuts — something no other accessible tool offers.

> ** Note:** This project was built iteratively with real accessibility feedback in mind — every announcement, focus behavior, and keyboard shortcut was shaped by actual screen reader usage patterns.

---

## ✨ Features at a Glance

- [**Super Merger**](#-super-merger---live-mixer): Live-mix audio with keyboard shortcuts. Auto-records and exports as perfectly synced WAV.
- [**Super Trim**](#-super-trim---live-audio-cropper): Live-trim audio with keyboard shortcuts. Set start and end points instantly.
- [**Super Clean**](#-super-clean---live-audio-cleaner): Remove multiple mistakes or unwanted sections seamlessly while listening.
- [**Merge Audio**](#1-merge-audio): Mix unlimited tracks with custom timing, crop ranges, and volume.
- [**Merge Video**](#2-merge-video): Concatenate video clips in sequence with optional crop ranges.
- [**Audio → Video**](#3-audio--video-slideshow): Turn images + a music file into a timed slideshow video.
- [**Video → Audio**](#4-video--audio-extract): Extract the audio track from any video as a clean WAV file.
- [**Trim Audio**](#5-trim-audio): Crop audio to exact in/out points. Preview before you download.
- [**Trim Video**](#6-trim-video): Crop video to exact timestamps and export as WebM.
- [**Persistent Library**](#-the-media-library): Files saved locally in IndexedDB — survive page refresh.

---

## Getting Started

### Option A — Play Online (Easiest)
You can use the studio directly in your browser without downloading anything:
🔗 **[Accessible Media Studio - Live Version](https://saifeldeen377.github.io/accessible_media_studio/)**

### Option B — Open locally
1. Download or clone this project folder.
2. Double-click `index.html` to open in Chrome, Edge, or Firefox.
3. Done. No setup, no installation, no internet needed after first load.

### Option C — Local server
```bash
# Using Python (built into most systems)
python -m http.server 3000

# Then open your browser and go to:
# http://localhost:3000
```

### Browser Compatibility

| Browser | Status | Notes |
| :--- | :--- | :--- |
| Google Chrome 90+ | Full | Recommended |
| Microsoft Edge 90+ | Full | Recommended |
| Firefox 88+ | Full | All features work |
| Safari 15+ | Partial | WebM export may not work |

---

## The Media Library

The Media Library is the central hub. Upload once, and every tool can immediately access the file.

### How to add a file
1. Click **" Choose File"** and pick your audio, video, or image.
2. Give it a short name (e.g., `background_music`).
3. Click **" Add to Library"**. It immediately appears in all tool dropdowns.

### Persistence
Files are saved automatically to your browser's **IndexedDB**. Refresh the page and they're still there. The status badge below the library title always shows the current state:

| Badge Text | Meaning |
| :--- | :--- |
| ✓ Library autosaved to browser | All files are safely stored |
| ✓ 3 file(s) restored from browser | Files reloaded after page refresh |
| ✗ Database unavailable | Storage blocked — app still works, files won't persist |

### Supported File Types
| Type | Formats |
| :--- | :--- |
| Audio | MP3, WAV, OGG, AAC, M4A, FLAC, OPUS |
| Video | MP4, WebM, OGG, AVI, MOV, MKV |
| Image | PNG, JPG, JPEG, WebP, GIF, SVG, BMP |

---

## Super Merger — Live Mixer

Super Merger lets you **perform a live audio mix in real time** using keyboard shortcuts, then **automatically records and exports** everything as a perfectly timed WAV — exactly matching what you heard during your performance.

### Why Super Merger Exists
Traditional editors require you to carefully place audio clips on a visual timeline using a mouse. If you can't see the screen, this is impossible. 
**Super Merger solves this by turning your keyboard into a live instrument.** You play a base track, and whenever you want an overlay sound to play, you just press its key. It captures your exact timing in real-time, builds a mix, and exports it as a perfectly synced WAV file.

### Quick Start
1. Press `M` anywhere on the page - or click **" Super Merger"** in the header. Focus jumps directly to the dialog.
2. **Step 1:** Select your base audio (the backbone of your mix). Adjust its **Base Audio Volume** (0-100%) to ensure it sits well in the mix. Lastly, configure the **Base Audio End Behavior** and **Undo Behavior** (see below).
3. **Step 2:** For each overlay sound you want to trigger during the live performance:
 - Select the audio file from your library.
 - Type a single shortcut key (e.g., `d`).
 - Adjust the **Overlay Volume** (0-100%) for this specific sound.
 - Select the **Trigger Behavior** (Overlap or Cutoff) for this sound (see below).
 - Click **" Add to Super Mix"**.
4. Click **" Go Now - Start Live Mixer"**.

### Keyboard Shortcuts in Super Merger
| Key | Action |
| :--- | :--- |
| `Space` | Restart playback from 0.0s (Replay mode). During replay, any new overlays you trigger will be overdubbed/layered onto the mix without erasing your previous recordings. |
| `Shift` + `Space` | Hard Pause / Resume all tracks (pauses base, timeline, and all active overlays, seamlessly resuming them together) |
| `Ctrl` + `Space` | Soft-Pause / **Punch-In**. If you use this during replay, it deletes any future base segments and starts recording a new one. Can also be used to create silent gaps in the base audio where the timeline continues ticking. |
| `Ctrl` + `Shift` + `Space` | **Cancel Gap.** If in a soft-pause mid-track: rewinds timeline to where the gap started and resumes the base, as if the gap never happened. Behavior depends on the **Cancel Gap** setting. |
| `←` / `→` | Seek timeline back or forward by 5 seconds. |
| `Ctrl` + `←` / `→` | Delete the previous/next recorded overlay clip and jump to its position on the timeline. (Does not affect currently active live clips) |
| `[Your Key]` | Play overlay from beginning (restarts if already playing) |
| `Shift` + `[Your Key]` | Pause / Resume that overlay from current position in both listening and the final track |
| `Alt` + `Shift` + `[Your Key]` | Stop, delete, and erase the currently playing overlay clip from the log and timeline |

> ** Note:** Overlays are only **recorded** when the timeline is actively running. This includes when the base audio is playing naturally, when overdubbing during a replay, and during a **Soft-Pause** gap. Triggering an overlay while the timeline is fully paused lets you audition the sound without it appearing in the final mix.

### ⚙️ Advanced Settings

#### Base Audio End Behavior
Under the Base Audio File selection, you can configure what happens when the base audio ends physically:
- **Stop Timeline (Default):** Playback stops and recording is capped immediately. If you decide you want to continue recording, simply press `Ctrl` + `Space` to manually restart the timeline. Press it again when you are finished.
- **Auto-Continue Timeline:** Automatically transitions into a soft-paused state so the virtual timeline continues to tick, allowing you to seamlessly record extra overlay sounds at the end.

#### Undo Behavior
Choose how `Ctrl` + `←` / `→` behaves when deleting an overlay clip:
- **Delete & Seek (Default):** Deletes the clip and immediately jumps the timeline back to where that clip started, allowing you to seamlessly re-record it in context.
- **Delete Only:** Deletes the clip but keeps the timeline playing exactly where it is. Useful if you made a mistake but don't want to break the flow of your live recording session.

#### Ctrl+Shift+Space — Cancel Gap Behavior
Choose how the **Cancel Gap** shortcut works when you are inside a soft-pause silent period:
- **Only when gap has no overlays (Default):** The gap is cancelled only if no overlay clips were triggered during it. If overlays exist in the gap, the shortcut does nothing and announces a warning.
- **Always:** Cancels the gap regardless — any overlays that were triggered during the gap are stopped and deleted along with it.

#### Trigger Behavior (Cutoff vs Overlap)
When assigning a shortcut key to an overlay, you can configure how it behaves when pressed rapidly:
- **Overlap (Default):** If you press the key multiple times, the sound will play on top of itself. This is ideal for sounds with long tails (like crash cymbals or pads) where you want the sound to ring out naturally without being cut short.
- **Cutoff:** If you press the key multiple times, the currently playing instance of the sound will instantly stop, and a new one will begin. This acts as a " Choke Group" and is perfect for percussive hits, vocal chops, or melodic samples. **Note:** This choke behavior applies both during live recording and when playing back previously recorded overlays (overdubbing).

### Live Session Actions
During the live performance, you can use the actions located in the **Super Merger Header** (right next to the Close button):
- ** Download WAV:** Click this button to render and download your current live mix. The app processes the base audio and overlays via `OfflineAudioContext` (much faster than real-time) and downloads a WAV file with exact timing.
- ** Reset & Restart:** Click this to clear all recorded overlays, base track segments, and logs, seek the base audio back to 0.0s, and restart the recording from scratch.

---

## Super Trim — Live Audio Cropper

Super Trim is the fastest, most precise way to crop audio files using only your keyboard. It was designed to solve the problem of visual timeline dependency in traditional editors.

### How to use
1. Press `T` anywhere on the page, or click **" Super Trim"** in the header. Focus jumps directly to the dialog.
2. Select your audio file and press `Space` to start playing.
3. Listen to the audio. Exactly when you hear the start point, press **`s`** (or `[`).
4. Exactly when you hear the end point, press **`e`** (or `]`).
5. (Optional) You can also `Tab` to the **" Set Start"** and **" Set End"** buttons and press `Space` to capture the time precisely.
6. Click **" Preview Trimmed Range"** to hear the exact cut.
7. Click **" Download Trimmed WAV"**.

### Keyboard Shortcuts in Super Trim
| Key | Action |
| :--- | :--- |
| `Space` | Play / Pause main audio and Preview |
| `S` or `[` | Set Start point at current playback time |
| `E` or `]` | Set End point at current playback time |
| `←` / `→` | Skip backward or forward by 5 seconds (Works during Preview as well) |
| `Escape` | Exit Super Trim |

### Why Super Trim is Unique
- **100% Sample-Accurate Sync:** Super Trim bypasses the standard browser audio player and uses the raw `Web Audio API` for playback. This means the time you capture during playback is guaranteed to have **0ms of drift** compared to the final exported file (a common issue when playing MP3s in Chrome/Edge).
- **International Keyboard Support:** The shortcuts `s` / `[` for start and `e` / `]` for end read physical key codes, meaning they work perfectly on any layout.
- **Screen Reader Fail-safes:** If your screen reader ever intercepts a keyboard shortcut, the dedicated " Set Start" and " Set End" buttons provide a guaranteed, accessible fallback.

---

## Super Clean — Live Audio Cleaner

Super Clean allows you to listen to an audio file and seamlessly "cut out" multiple mistakes, long pauses, or unwanted sections in real time using simple keyboard shortcuts.

### How to use
1. Press `C` anywhere on the page to open **" Super Clean"**.
2. Select your audio file and press `Space` to start playing.
3. When you hear a mistake or something you want to remove, press **`s`** (or `[`). This sets the start of the cut.
4. When the mistake ends and the good audio resumes, press **`e`** (or `]`). This sets the end of the cut and finalizes the removal region.
5. The audio will continue playing. You can repeat this process (press `s` then `e`) as many times as you want to remove all mistakes in a single pass.
6. Click **" Preview Cleaned Audio"** to hear the file with all your defined cuts automatically skipped.
7. Click **" Download Cleaned WAV"**.

### Keyboard Shortcuts in Super Clean
| Key | Action |
| :--- | :--- |
| `Space` | Play / Pause main audio and Preview |
| `S` or `[` | Set Start point (beginning of a mistake) |
| `E` or `]` | Set End point (end of a mistake) |
| `←` / `→` | Skip backward or forward by 5 seconds (Works during Preview as well) |
| `Escape` | Exit Super Clean |

### Smart Edge Cases
Super Clean's state machine is designed to be forgiving:
- **Missing End**: If you press `s` to mark a start but never press `e`, it assumes you want to cut everything from that point to the end of the file.
- **Missing Start**: If you press `e` without ever pressing `s`, it assumes you want to cut everything from the very beginning up to that point.
- **Modifications**: If you press `s` twice in a row, it just updates the start point of your current cut. If you press `e` twice in a row, it extends or shortens the end point of the cut you just made, without creating a duplicate.

---

## Tools Guide

Use the **tab bar** to switch between tools. Press `←` `→` Arrow Keys when the tab bar is focused to navigate between tabs.

### 1. Merge Audio
Mix multiple audio tracks into one WAV file. All tracks play simultaneously, positioned by time.
1. Select a file from the library dropdown.
2. Set **" Start at"** — when this track begins in the final mix (seconds).
3. Optionally set **" Crop from"** and **" Crop until"** to use a portion of the file.
4. Set the **Volume** (0–100%).
5. Click **" Add to Mix"**. Repeat for each track.
6. Click **" Preview Mix"** to listen, then **" Export WAV"** to download.

> ** Tip:** You can add the same file multiple times with different start times to create loops or layered echoes.

### 2. Merge Video
Join multiple video clips one after another into a single WebM file.
1. Select a video, optionally set crop range, click **" Add to Queue"**.
2. Repeat for all clips (they play in the order you added them).
3. Click **" Export Video"** to start and download.

> ** Warning:** **Real-time export:** A 5-minute video takes ~5 minutes to process. Don't close the tab during export.

### 3. Audio → Video (Slideshow)
Combine a music track with images to create a timed slideshow video.
1. Select your audio/music file in Step 1.
2. For each slide: select an image, set " Show from" and " Show until"(seconds), click **" Add Image Slide"**.
3. Click **" Generate Slideshow Video"**.

### 4. Video → Audio (Extract)
Strip the audio track out of a video and save it as a WAV file.
1. Select a video from the library.
2. Click **" Extract Audio as WAV"**.

> ** Warning:** **Memory note:** Files over 50MB will trigger a warning on systems with 4GB RAM before decoding begins.

### 5. Trim Audio
1. Select an audio file. Set Start and End times.
2. Click **" Preview Trim"** to hear the result.
3. Click **" Export Trimmed WAV"** to download.

### 6. Trim Video
1. Select a video file. Set **" Trim Start"** and **" Trim End"** (seconds).
2. Click **" Download Trimmed Video (WebM)"** to process and download.

---

## Accessibility

Accessibility is not a feature here — it's the foundation.

### Screen Reader Support
- ARIA live regions (`aria-live=" polite"` and `aria-live=" assertive"`) announce all events.
- Every button, input, and element has a descriptive `aria-label`.
- Super Merger dialog receives **automatic focus** on open — no need to scroll or search.
- Live mixing is **screen-reader-silent by design** — no announcements during key presses so you can focus on listening.

### Keyboard Navigation
| Key | Action |
| :--- | :--- |
| `Tab` / `Shift+Tab` | Move between all interactive elements |
| `←` `→` | Navigate between tabs in the tab bar |
| `Enter` / `Space` | Activate buttons and checkboxes |
| `M` | Open Super Merger from anywhere |
| `T` | Open Super Trim from anywhere |
| `C` | Open Super Clean from anywhere |

### Comparison

| Feature | Accessible Media Studio | Traditional Editors |
| ------- | ----------------------- | ------------------- |
| **Workflow** | Keyboard-centric & Live Mixing | Mouse-centric Visual Timelines |
| **Accessibility** | Designed for screen readers | Primarily designed for visual workflows |
| **Installation** | Zero (Runs entirely in browser) | Heavy desktop installations |
| **Privacy** | Fully offline (No uploads) | Often requires cloud uploads |

---

## Data & Privacy

- **All processing happens in your browser.** No files are ever sent to any server.
- Files are stored in your browser's **IndexedDB** — sandboxed, local, private.
- Clearing browser site data will erase the stored library.
- **No cookies. No analytics. No tracking of any kind.**

---

## Known Limitations

| Limitation | Reason |
| :--- | :--- |
| Video export is WebM only | Browsers only encode WebM natively. MP4 needs ffmpeg.wasm (~30MB) — too heavy for low-RAM systems. |
| Video export is real-time | MediaRecorder works in real time; a 5-min video takes 5 minutes to export. |
| Large files may slow the tab | `decodeAudioData` loads the full file into RAM. Files over 50MB trigger a warning. |
| Library is per-browser | IndexedDB is scoped to the browser. Switching browsers or going incognito starts fresh. |

---

## ⚙️ Technical Notes

### Stack
- **Pure HTML, CSS, JavaScript** — zero frameworks, zero build tools, zero dependencies.
- **Web Audio API** — audio decoding, mixing, and WAV rendering via `OfflineAudioContext`.
- **MediaRecorder API** — video capture and concatenation.
- **IndexedDB** — persistent local file storage.
- **Google Fonts (Outfit)** — requires a one-time internet connection for typography.

### File Structure
```text
accessible_media_studio/
├── index.html # App structure, ARIA markup, all tool panels
├── readme.md # Documentation (Markdown format)
├── readme.html # Documentation (HTML format)
├── style.css # Dark theme, layout, animations, component styles
├── script_globals.js # Base utilities, db, library, tabs
├── script_main.js # Main initialization script
└── script_*.js # Tool scripts (merge, trim, super-merger)
```

### WAV Encoder
A custom 16-bit PCM WAV encoder (`audioBufferToWav`) is written from scratch and handles:
- Multi-channel audio (stereo and mono).
- Correct RIFF/WAVE header generation.
- Float32 → Int16 sample conversion with clamping.

### Super Merger Recording Engine
The live mixer uses a **timeline-based clip log** (`smRecordedClips`). Each overlay trigger creates a clip with:
- `timelineStart` — when in the base timeline this clip begins.
- `cropStart` — where in the overlay file playback starts.
- `cropEnd` — where it stops (set on pause or retrigger).

The exporter replays all clips through an `OfflineAudioContext` — faster than real-time for audio-only exports.
