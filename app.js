/**
 * Linacre Music Videos — Cinema Player Engine
 * Ambient frame glow, real-time interactive lyric teleprompter, responsive playlist, keyboard controls
 */

// Application State
let tracks = [];
let currentTrackIndex = 0;
let isTheaterMode = false;
let ambientInterval = null;

// DOM Elements
const video = document.getElementById('mainVideo');
const videoSource = document.getElementById('videoSource');
const ambientCanvas = document.getElementById('ambientCanvas');
const ambientCtx = ambientCanvas ? ambientCanvas.getContext('2d') : null;
const ambientBackdrop = document.getElementById('ambientBackdrop');

const trackTitleEl = document.getElementById('currentTrackTitle');
const trackStoryEl = document.getElementById('currentTrackStory');
const trackGenreEl = document.getElementById('trackGenreBadge');
const trackBpmEl = document.getElementById('trackBpmBadge');
const trackModelEl = document.getElementById('trackModelBadge');
const downloadBtn = document.getElementById('downloadVideoBtn');
const brandLogo = document.getElementById('brandLogo');

const playlistGrid = document.getElementById('playlistGrid');
const lyricsContainer = document.getElementById('lyricsContainer');
const theaterBtn = document.getElementById('theaterModeBtn');
const shortcutsBtn = document.getElementById('shortcutsModalBtn');
const shortcutsModal = document.getElementById('shortcutsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const copyShareBtn = document.getElementById('copyShareLinkBtn');
const toastEl = document.getElementById('toast');
const rateButtons = document.querySelectorAll('.rate-btn');

// Fetch or Initialize Tracks
async function initApp() {
  try {
    const res = await fetch('tracks.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    tracks = await res.json();
  } catch (err) {
    console.warn('Direct fetch failed, checking window.FALLBACK_TRACKS or fallback data...', err);
    if (window.FALLBACK_TRACKS && window.FALLBACK_TRACKS.length > 0) {
      tracks = window.FALLBACK_TRACKS;
    }
  }

  if (!tracks || tracks.length === 0) {
    console.error('No tracks found to load.');
    return;
  }

  renderPlaylist();
  setupEventListeners();

  // Check URL hash for direct track link (e.g. #penny or #crazy-rap)
  const hash = window.location.hash.replace('#', '').trim();
  const foundIndex = tracks.findIndex(t => t.id === hash);
  if (foundIndex >= 0) {
    loadTrack(foundIndex, false);
  } else {
    loadTrack(0, false);
  }

  initAmbientCanvas();
}

// Render the Playlist Cards
function renderPlaylist() {
  const countBadge = document.getElementById('trackCountBadge');
  if (countBadge) countBadge.textContent = `${tracks.length} Videos`;

  playlistGrid.innerHTML = '';
  tracks.forEach((track, index) => {
    const card = document.createElement('div');
    card.className = `track-card ${index === currentTrackIndex ? 'active' : ''}`;
    card.dataset.index = index;

    card.innerHTML = `
      <div class="track-card-thumb">
        <img src="${track.coverFile}" alt="${track.title} Cover" loading="lazy">
        <div class="thumb-play-overlay">
          <svg class="play-icon" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </div>
      </div>
      <div class="track-card-info">
        <h4 class="track-card-title">${track.title}</h4>
        <div class="track-card-sub">
          <span>${track.artist}</span>
          <span>•</span>
          <span>${track.duration}</span>
        </div>
        <div class="track-card-meta">
          <span class="mini-badge">${track.bpm}</span>
          <span class="mini-badge">${track.model}</span>
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      loadTrack(index, true);
    });

    playlistGrid.appendChild(card);
  });
}

// Load Selected Track
function loadTrack(index, autoPlay = true) {
  if (index < 0 || index >= tracks.length) return;
  currentTrackIndex = index;
  const track = tracks[index];

  // Update URL hash
  window.history.replaceState(null, '', `#${track.id}`);

  // Update Active Playlist Card
  document.querySelectorAll('.track-card').forEach((c, idx) => {
    c.classList.toggle('active', idx === index);
  });

  // Update Media Elements
  video.pause();
  video.poster = track.coverFile;
  videoSource.src = track.videoFile;
  video.load();

  if (autoPlay) {
    video.play().catch(e => console.log('Autoplay prevented by browser:', e));
  }

  // Update Info & Badges
  trackTitleEl.textContent = track.title;
  trackStoryEl.textContent = track.story;
  trackGenreEl.textContent = track.genre.split('/')[0].trim();
  trackBpmEl.textContent = track.bpm;
  trackModelEl.textContent = track.model;
  downloadBtn.href = track.videoFile;
  downloadBtn.setAttribute('download', `${track.title}.mp4`);
  brandLogo.src = track.coverFile;

  // Render Lyrics
  renderLyrics(track.lyrics);

  // Update Ambient Color Accent
  updateAmbientPalette(track.id);
}

// Render Interactive Lyrics Teleprompter
function renderLyrics(lyricsList) {
  lyricsContainer.innerHTML = '';
  if (!lyricsList || lyricsList.length === 0) {
    lyricsContainer.innerHTML = '<div class="lyrics-placeholder">No subtitle track available for this song.</div>';
    return;
  }

  lyricsList.forEach((item, idx) => {
    const lineEl = document.createElement('div');
    lineEl.className = 'lyric-line';
    lineEl.dataset.start = item.start;
    lineEl.dataset.end = item.end;
    lineEl.dataset.idx = idx;

    const formattedTime = formatSeconds(item.start);
    lineEl.innerHTML = `
      <span class="lyric-timestamp">${formattedTime}</span>
      <span class="lyric-text">${item.text}</span>
    `;

    // Click to seek video to that timestamp
    lineEl.addEventListener('click', () => {
      video.currentTime = item.start;
      if (video.paused) video.play();
    });

    lyricsContainer.appendChild(lineEl);
  });
}

// Real-time Lyrics Synchronization on TimeUpdate
function handleTimeUpdate() {
  const curTime = video.currentTime;
  const lines = lyricsContainer.querySelectorAll('.lyric-line');
  let activeFound = false;

  lines.forEach((line) => {
    const start = parseFloat(line.dataset.start);
    const end = parseFloat(line.dataset.end);

    // Give a small 0.15s buffer for smoother transitions
    if (curTime >= start && curTime <= (end + 0.2)) {
      if (!line.classList.contains('active')) {
        // Remove active from others
        lines.forEach(l => l.classList.remove('active'));
        line.classList.add('active');

        // Smooth scroll teleprompter to center active line
        line.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
      activeFound = true;
    }
  });

  // If between lines, keep previous active or fade
  if (!activeFound && curTime > 0) {
    // Find closest preceding line
    let closestLine = null;
    let closestDiff = Infinity;
    lines.forEach(line => {
      const start = parseFloat(line.dataset.start);
      if (curTime >= start) {
        const diff = curTime - start;
        if (diff < closestDiff) {
          closestDiff = diff;
          closestLine = line;
        }
      }
    });

    if (closestLine && closestDiff < 3.5) {
      if (!closestLine.classList.contains('active')) {
        lines.forEach(l => l.classList.remove('active'));
        closestLine.classList.add('active');
      }
    }
  }
}

// Ambient Video Frame Glow Canvas
function initAmbientCanvas() {
  if (!ambientCanvas || !ambientCtx) return;
  ambientCanvas.width = 64;
  ambientCanvas.height = 36;

  video.addEventListener('play', () => {
    if (ambientInterval) clearInterval(ambientInterval);
    ambientInterval = setInterval(drawAmbientFrame, 200);
  });

  video.addEventListener('pause', () => {
    if (ambientInterval) clearInterval(ambientInterval);
  });

  video.addEventListener('ended', () => {
    if (ambientInterval) clearInterval(ambientInterval);
  });
}

function drawAmbientFrame() {
  if (!ambientCtx || video.paused || video.ended) return;
  try {
    ambientCtx.drawImage(video, 0, 0, ambientCanvas.width, ambientCanvas.height);
  } catch (e) {
    // Security or cross-origin sandbox restrictions handled gracefully
  }
}

function updateAmbientPalette(trackId) {
  const palettes = {
    'barnsley-town': 'radial-gradient(circle at 50% 20%, rgba(0, 240, 255, 0.14) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'skint-dave': 'radial-gradient(circle at 50% 20%, rgba(255, 170, 0, 0.12) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'penny': 'radial-gradient(circle at 50% 20%, rgba(244, 63, 94, 0.12) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'dave-barnsley': 'radial-gradient(circle at 50% 20%, rgba(59, 130, 246, 0.12) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'crazy-rap': 'radial-gradient(circle at 50% 20%, rgba(168, 85, 247, 0.12) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'statistically': 'radial-gradient(circle at 50% 20%, rgba(16, 185, 129, 0.12) 0%, rgba(8, 9, 13, 0.95) 75%)'
  };

  if (ambientBackdrop && palettes[trackId]) {
    ambientBackdrop.style.background = palettes[trackId];
  }
}

// Utility: Format Seconds (MM:SS)
function formatSeconds(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

// Toast Notification
function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  setTimeout(() => {
    toastEl.classList.remove('show');
  }, 2800);
}

// Setup Event Listeners
function setupEventListeners() {
  video.addEventListener('timeupdate', handleTimeUpdate);

  // Playback Rate Buttons
  rateButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      rateButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const rate = parseFloat(btn.dataset.rate);
      video.playbackRate = rate;
      showToast(`Speed: ${rate}x`);
    });
  });

  // Theater Mode
  theaterBtn.addEventListener('click', () => {
    isTheaterMode = !isTheaterMode;
    document.querySelector('.app-layout').classList.toggle('theater-mode', isTheaterMode);
    theaterBtn.classList.toggle('active', isTheaterMode);
    showToast(isTheaterMode ? 'Cinema Theater Mode ON' : 'Cinema Theater Mode OFF');
  });

  // Shortcuts Modal
  shortcutsBtn.addEventListener('click', () => {
    shortcutsModal.classList.add('open');
    shortcutsModal.setAttribute('aria-hidden', 'false');
  });

  closeModalBtn.addEventListener('click', () => {
    shortcutsModal.classList.remove('open');
    shortcutsModal.setAttribute('aria-hidden', 'true');
  });

  shortcutsModal.addEventListener('click', (e) => {
    if (e.target === shortcutsModal) {
      shortcutsModal.classList.remove('open');
      shortcutsModal.setAttribute('aria-hidden', 'true');
    }
  });

  // Copy Share Link
  copyShareBtn.addEventListener('click', async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Track link copied to clipboard!');
    } catch (e) {
      prompt('Copy shareable link:', url);
    }
  });

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

    switch (e.code) {
      case 'Space':
      case 'KeyK':
        e.preventDefault();
        if (video.paused) video.play();
        else video.pause();
        break;
      case 'KeyF':
        e.preventDefault();
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          video.requestFullscreen().catch(() => {});
        }
        break;
      case 'KeyT':
        e.preventDefault();
        theaterBtn.click();
        break;
      case 'KeyM':
        e.preventDefault();
        video.muted = !video.muted;
        showToast(video.muted ? 'Muted' : 'Unmuted');
        break;
      case 'ArrowLeft':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        video.currentTime = Math.min(video.duration || 9999, video.currentTime + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        showToast(`Volume: ${Math.round(video.volume * 100)}%`);
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        showToast(`Volume: ${Math.round(video.volume * 100)}%`);
        break;
      case 'Escape':
        if (shortcutsModal.classList.contains('open')) {
          shortcutsModal.classList.remove('open');
          shortcutsModal.setAttribute('aria-hidden', 'true');
        }
        break;
      case 'Slash':
      case 'QuestionMark':
        shortcutsBtn.click();
        break;
      default:
        // Numeric keys 0-9 seek percentage
        if (e.key >= '0' && e.key <= '9') {
          const pct = parseInt(e.key, 10) / 10;
          if (video.duration) {
            video.currentTime = video.duration * pct;
            showToast(`Seek ${pct * 100}%`);
          }
        }
        break;
    }
  });
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);
