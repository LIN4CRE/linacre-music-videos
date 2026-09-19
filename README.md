# Linacre — Official Lyric Videos & Cinema Player 🎬🎵

[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-ffaa00?style=for-the-badge&logo=github)](https://lin4cre.github.io/linacre-music-videos/)
[![Resolution](https://img.shields.io/badge/Quality-1080p%20FHD%2060fps-00f0ff?style=for-the-badge)](https://lin4cre.github.io/linacre-music-videos/)
[![Model](https://img.shields.io/badge/Model-Suno%20V6--MINI-a855f7?style=for-the-badge)](https://suno.com)
[![License](https://img.shields.io/badge/Release-Master%20Edition-10b981?style=for-the-badge)](https://github.com/LIN4CRE/linacre-music-videos/releases)

A dedicated, high-performance web cinema player and repository hosting the official master 1080p lyric videos for **Linacre's** *Proper Mad* collection.

🌐 **Live Cinema Web App**: [https://lin4cre.github.io/linacre-music-videos/](https://lin4cre.github.io/linacre-music-videos/)  
🌐 **Official Artist Domain**: [https://linacre.site](https://linacre.site)

---

## 📽️ Featured Master Videos

| # | Track Title | Genre | BPM | Duration | Video File | Subtitles |
|---|-------------|-------|-----|----------|------------|-----------|
| 1 | **Barnsley Town** | UK Comedy Pop-Rap / Garage | 132 BPM | 3:01 | [`videos/Barnsley Town.mp4`](videos/Barnsley%20Town.mp4) | [SRT](subtitles/barnsley-town.srt) / [ASS](subtitles/barnsley-town.ass) |
| 2 | **Skint Dave from Barnsley** | British Indie Rock / Pub-Singalong | 96 BPM | 3:41 | [`videos/Skint Dave from Barnsley.mp4`](videos/Skint%20Dave%20from%20Barnsley.mp4) | [SRT](subtitles/skint-dave.srt) / [ASS](subtitles/skint-dave.ass) |
| 3 | **Penny, You're Still Here** | Contemporary Folk-Pop / Heartfelt | 112 BPM | 3:58 | [`videos/Penny, You're Still Here.mp4`](videos/Penny,%20You're%20Still%20Here.mp4) | [SRT](subtitles/penny.srt) / [ASS](subtitles/penny.ass) |
| 4 | **Dave from Barnsley** | UK Boom-Bap / Comedy Rap | 94 BPM | 3:20 | [`videos/Dave from Barnsley.mp4`](videos/Dave%20from%20Barnsley.mp4) | [SRT](subtitles/dave-barnsley.srt) / [ASS](subtitles/dave-barnsley.ass) |
| 5 | **Crazy Rap** | UK Comedy Rap / Garage Hip-Hop | 130 BPM | 2:04 | [`videos/Crazy Rap.mp4`](videos/Crazy%20Rap.mp4) | [SRT](subtitles/crazy-rap.srt) / [ASS](subtitles/crazy-rap.ass) |
| 6 | **Statistically, We're Fine** | UK Alternative Comedy Hip-Hop | 94 BPM | 2:22 | [`videos/Statistically, We're Fine.mp4`](videos/Statistically,%20We're%20Fine.mp4) | [SRT](subtitles/statistically.srt) / [ASS](subtitles/statistically.ass) |

---

## ✨ Web App Features

- **Ambient Backdrop Glow**: Dynamic color aura extracted from video playback frames and track artwork, creating an immersive theater glow.
- **Interactive Lyric Teleprompter**:
  - Auto-scrolls in real-time synchronized to the vocal track.
  - **Click-to-Seek**: Click any lyric line to instantly jump the video to that exact timestamp.
- **Cinema Theater Mode (`T`)**: Expand the video player to full viewport width for distraction-free listening.
- **Hardware-Accelerated 1080p FHD**: Optimized MP4 containers with FastStart (`moov` atom at file beginning) for instantaneous web streaming.
- **Variable Playback Speed**: 0.75x, 1.0x, 1.25x, and 1.5x speed toggles.
- **URL Hash Routing**: Direct track sharing support (e.g. `https://lin4cre.github.io/linacre-music-videos/#penny`).
- **Comprehensive Keyboard Shortcuts**:
  - `Space` / `K` — Play / Pause
  - `F` — Fullscreen toggle
  - `T` — Cinema theater mode toggle
  - `M` — Mute / unmute audio
  - `←` / `→` — Seek backward / forward 5s
  - `↑` / `↓` — Volume adjustments
  - `0` – `9` — Jump to 0% – 90% in video

---

## 🛠️ Production Pipeline

1. **Audio Synthesis**: High-fidelity master stereo mix synthesized with **Suno V6-MINI**.
2. **Karaoke Word-Level Transcription**: Transcribed and force-aligned with **Whisper AI** into micro-timestamped `.ass` and `.srt` subtitle streams with bold outline styling.
3. **Cinema Render**: High-definition 1920x1080 canvas composited with artwork backdrop, progressive blurred overlays, and burned-in karaoke subtitles at 60fps via **FFmpeg**.

---

## 📂 Repository Structure

```
linacre-music-videos/
├── covers/                      # Square album artwork (1080x1080)
│   ├── crazy-rap.jpg
│   ├── dave-barnsley.jpg
│   ├── penny.jpg
│   ├── skint-dave.jpg
│   └── statistically.jpg
├── subtitles/                   # Clean SRT and ASS subtitle files
│   ├── crazy-rap.srt / .ass
│   ├── dave-barnsley.srt / .ass
│   ├── penny.srt / .ass
│   ├── skint-dave.srt / .ass
│   └── statistically.srt / .ass
├── videos/                      # 1080p master MP4 renders (<50 MB each)
│   ├── Crazy Rap.mp4
│   ├── Dave from Barnsley.mp4
│   ├── Penny, You're Still Here.mp4
│   ├── Skint Dave from Barnsley.mp4
│   └── Statistically, We're Fine.mp4
├── app.js                       # Player engine, ambient glow, synced teleprompter
├── index.html                   # Responsive cinema player portal
├── style.css                    # Glassmorphism dark aesthetic styling
├── tracks.json                  # Parsed lyric timestamps and metadata
└── README.md                    # Project documentation
```

---

## 🚀 Running Locally

You can serve this repository locally using any HTTP server:

```bash
# Using Python
python -m http.server 8080

# Using Node / npx
npx serve .
```

Then visit [http://localhost:8080](http://localhost:8080) in any modern browser.

---

© 2026 Linacre. All rights reserved.
