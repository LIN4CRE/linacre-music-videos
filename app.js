/**
 * Linacre Music Videos — Cinema Player Engine
 * Ambient frame glow, real-time interactive lyric teleprompter, responsive playlist,
 * instant search, shuffle & repeat modes, localStorage persistence, MediaSession API, keyboard controls
 */

// Application State
let tracks = [];
let currentTrackIndex = 0;
let isTheaterMode = false;
let isAutoplay = true;
let isShuffle = false;
let repeatMode = 'all'; // 'all' | 'one' | 'off'
let searchQuery = '';
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

const autoplayBtn = document.getElementById('autoplayToggleBtn');
const autoplayText = document.getElementById('autoplayText');
const prevTrackBtn = document.getElementById('prevTrackBtn');
const nextTrackBtn = document.getElementById('nextTrackBtn');

const playlistSearchInput = document.getElementById('playlistSearchInput');
const shuffleToggleBtn = document.getElementById('shuffleToggleBtn');
const shuffleBtnText = document.getElementById('shuffleBtnText');
const repeatToggleBtn = document.getElementById('repeatToggleBtn');
const repeatBtnText = document.getElementById('repeatBtnText');

const playlistGrid = document.getElementById('playlistGrid');
const lyricsContainer = document.getElementById('lyricsContainer');
const theaterBtn = document.getElementById('theaterModeBtn');
const shortcutsBtn = document.getElementById('shortcutsModalBtn');
const shortcutsModal = document.getElementById('shortcutsModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const copyShareBtn = document.getElementById('copyShareLinkBtn');
const toastEl = document.getElementById('toast');
const rateButtons = document.querySelectorAll('.rate-btn');

// Preferences Persistence
function loadPreferences() {
  try {
    const savedVol = localStorage.getItem('linacre_volume');
    if (savedVol !== null) video.volume = Math.max(0, Math.min(1, parseFloat(savedVol)));

    const savedSpeed = localStorage.getItem('linacre_speed');
    if (savedSpeed !== null) {
      const speed = parseFloat(savedSpeed);
      video.playbackRate = speed;
      rateButtons.forEach(b => b.classList.toggle('active', parseFloat(b.dataset.rate) === speed));
    }

    const savedAutoplay = localStorage.getItem('linacre_autoplay');
    if (savedAutoplay !== null) {
      isAutoplay = savedAutoplay === '1';
      if (autoplayBtn) autoplayBtn.classList.toggle('active', isAutoplay);
      if (autoplayText) autoplayText.textContent = isAutoplay ? 'Autoplay: ON' : 'Autoplay: OFF';
    }

    const savedShuffle = localStorage.getItem('linacre_shuffle');
    if (savedShuffle !== null) {
      isShuffle = savedShuffle === '1';
      if (shuffleToggleBtn) shuffleToggleBtn.classList.toggle('active', isShuffle);
      if (shuffleBtnText) shuffleBtnText.textContent = isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF';
    }

    const savedRepeat = localStorage.getItem('linacre_repeat');
    if (savedRepeat && ['all', 'one', 'off'].includes(savedRepeat)) {
      repeatMode = savedRepeat;
      updateRepeatButtonUI();
    }
  } catch (e) {
    // localStorage might be unavailable in sandboxed environments
  }
}

function savePreferences() {
  try {
    localStorage.setItem('linacre_volume', video.volume);
    localStorage.setItem('linacre_speed', video.playbackRate);
    localStorage.setItem('linacre_autoplay', isAutoplay ? '1' : '0');
    localStorage.setItem('linacre_shuffle', isShuffle ? '1' : '0');
    localStorage.setItem('linacre_repeat', repeatMode);
  } catch (e) {}
}

function updateRepeatButtonUI() {
  if (!repeatToggleBtn || !repeatBtnText) return;
  repeatToggleBtn.classList.toggle('active', repeatMode !== 'off');
  if (repeatMode === 'all') {
    repeatBtnText.textContent = 'Repeat: ALL';
    repeatToggleBtn.title = 'Repeat Playlist (Click for Track / Off)';
  } else if (repeatMode === 'one') {
    repeatBtnText.textContent = 'Repeat: ONE';
    repeatToggleBtn.title = 'Repeat Current Track (Click for Off)';
  } else {
    repeatBtnText.textContent = 'Repeat: OFF';
    repeatToggleBtn.title = 'Repeat Disabled (Click for All)';
  }
}

function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m]);
}

// Fetch or Initialize Tracks
async function initApp() {
  loadPreferences();

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

  // Check URL hash for direct track link (e.g. #penny or #the-road-beyond)
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
  const q = searchQuery.toLowerCase().trim();

  const filtered = tracks.map((track, originalIndex) => ({ track, originalIndex }))
    .filter(({ track }) => {
      if (!q) return true;
      const titleMatch = track.title && track.title.toLowerCase().includes(q);
      const genreMatch = track.genre && track.genre.toLowerCase().includes(q);
      const artistMatch = track.artist && track.artist.toLowerCase().includes(q);
      const storyMatch = track.story && track.story.toLowerCase().includes(q);
      const lyricsMatch = track.lyrics && track.lyrics.some(l => l.text && l.text.toLowerCase().includes(q));
      return titleMatch || genreMatch || artistMatch || storyMatch || lyricsMatch;
    });

  if (countBadge) {
    countBadge.textContent = q ? `${filtered.length} of ${tracks.length} Videos` : `${tracks.length} Videos`;
  }

  playlistGrid.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'playlist-empty-state';
    empty.innerHTML = `
      <strong>No tracks matching "${escapeHtml(searchQuery)}"</strong>
      <p>Try searching by song title, genre, artist, or lyrics.</p>
    `;
    playlistGrid.appendChild(empty);
    return;
  }

  filtered.forEach(({ track, originalIndex }) => {
    const isActive = originalIndex === currentTrackIndex;
    const card = document.createElement('div');
    card.className = `track-card ${isActive ? 'active' : ''}`;
    card.dataset.index = originalIndex;

    const trackNum = String(originalIndex + 1).padStart(2, '0');
    const eqBars = isActive ? `
      <span class="now-playing-bars ${video.paused ? 'paused' : ''}">
        <span></span><span></span><span></span>
      </span>
    ` : '';

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
        <h4 class="track-card-title">
          <span class="track-index-num">#${trackNum}</span>${track.title}${eqBars}
        </h4>
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
      loadTrack(originalIndex, true);
    });

    playlistGrid.appendChild(card);
  });
}

// Media Session API for Hardware & Lockscreen controls
function updateMediaSession(track) {
  if (!('mediaSession' in navigator)) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: track.artist || 'Linacre',
      album: 'Proper Mad (Deluxe)',
      artwork: [
        { src: track.coverFile, sizes: '512x512', type: 'image/jpeg' }
      ]
    });

    navigator.mediaSession.setActionHandler('play', () => video.play());
    navigator.mediaSession.setActionHandler('pause', () => video.pause());
    navigator.mediaSession.setActionHandler('previoustrack', () => playPrevTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => playNextTrack(false));
    navigator.mediaSession.setActionHandler('seekto', (details) => {
      if (details.seekTime !== undefined) video.currentTime = details.seekTime;
    });
  } catch (e) {
    // Unsupported mediaSession features silently ignored
  }
}

// Load Selected Track
function loadTrack(index, autoPlay = true) {
  if (index < 0 || index >= tracks.length) return;
  currentTrackIndex = index;
  const track = tracks[index];

  // Update URL hash
  window.history.replaceState(null, '', `#${track.id}`);

  // Re-render playlist cards to update active indicator and equalizer bars
  renderPlaylist();

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

  // Update OS Media Session
  updateMediaSession(track);
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
    'jessica-hold-your-head-up': 'radial-gradient(circle at 50% 20%, rgba(251, 146, 60, 0.16) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'the-road-beyond': 'radial-gradient(circle at 50% 20%, rgba(129, 140, 248, 0.16) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'barnsley-town': 'radial-gradient(circle at 50% 20%, rgba(0, 240, 255, 0.14) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'your-voice-beside-my-hand': 'radial-gradient(circle at 50% 20%, rgba(245, 158, 11, 0.15) 0%, rgba(8, 9, 13, 0.95) 75%)',
    'nic-on-donny-road': 'radial-gradient(circle at 50% 20%, rgba(20, 184, 166, 0.15) 0%, rgba(8, 9, 13, 0.95) 75%)',
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

// Playlist Navigation & Autoplay
function playNextTrack(isAuto = false) {
  if (!tracks || tracks.length === 0) return;

  if (isAuto && repeatMode === 'one') {
    video.currentTime = 0;
    video.play().catch(e => console.log(e));
    showToast(`Repeating: ${tracks[currentTrackIndex].title}`);
    return;
  }

  let nextIndex;
  if (isShuffle && tracks.length > 1) {
    let rand = Math.floor(Math.random() * (tracks.length - 1));
    if (rand >= currentTrackIndex) rand += 1;
    nextIndex = rand;
  } else {
    nextIndex = currentTrackIndex + 1;
    if (nextIndex >= tracks.length) {
      if (repeatMode === 'all') {
        nextIndex = 0;
      } else {
        showToast('Playlist finished.');
        return;
      }
    }
  }

  showToast(isAuto ? `Autoplaying next: ${tracks[nextIndex].title}` : `Next: ${tracks[nextIndex].title}`);
  loadTrack(nextIndex, true);
}

function playPrevTrack() {
  if (!tracks || tracks.length === 0) return;
  let prevIndex;
  if (isShuffle && tracks.length > 1) {
    let rand = Math.floor(Math.random() * (tracks.length - 1));
    if (rand >= currentTrackIndex) rand += 1;
    prevIndex = rand;
  } else {
    prevIndex = (currentTrackIndex - 1 + tracks.length) % tracks.length;
  }
  showToast(`Previous: ${tracks[prevIndex].title}`);
  loadTrack(prevIndex, true);
}

function toggleAutoplay() {
  isAutoplay = !isAutoplay;
  if (autoplayBtn) {
    autoplayBtn.classList.toggle('active', isAutoplay);
  }
  if (autoplayText) {
    autoplayText.textContent = isAutoplay ? 'Autoplay: ON' : 'Autoplay: OFF';
  }
  savePreferences();
  showToast(isAutoplay ? 'Continuous Autoplay: ON' : 'Continuous Autoplay: OFF');
}

function toggleShuffle() {
  isShuffle = !isShuffle;
  if (shuffleToggleBtn) {
    shuffleToggleBtn.classList.toggle('active', isShuffle);
  }
  if (shuffleBtnText) {
    shuffleBtnText.textContent = isShuffle ? 'Shuffle: ON' : 'Shuffle: OFF';
  }
  savePreferences();
  showToast(isShuffle ? 'Shuffle Mode: ON' : 'Shuffle Mode: OFF');
}

function cycleRepeatMode() {
  if (repeatMode === 'all') repeatMode = 'one';
  else if (repeatMode === 'one') repeatMode = 'off';
  else repeatMode = 'all';

  updateRepeatButtonUI();
  savePreferences();
  showToast(`Repeat Mode: ${repeatMode.toUpperCase()}`);
}

// Setup Event Listeners
function setupEventListeners() {
  video.addEventListener('timeupdate', handleTimeUpdate);

  // Equalizer animation & ambient canvas triggers
  video.addEventListener('play', () => {
    document.querySelectorAll('.now-playing-bars').forEach(el => el.classList.remove('paused'));
    if (ambientInterval) clearInterval(ambientInterval);
    ambientInterval = setInterval(drawAmbientFrame, 200);
  });

  video.addEventListener('pause', () => {
    document.querySelectorAll('.now-playing-bars').forEach(el => el.classList.add('paused'));
    if (ambientInterval) clearInterval(ambientInterval);
  });

  // Continuous Autoplay when video finishes
  video.addEventListener('ended', () => {
    if (ambientInterval) clearInterval(ambientInterval);
    if (isAutoplay) {
      playNextTrack(true);
    }
  });

  // Volume & Speed change persistence
  video.addEventListener('volumechange', () => {
    savePreferences();
  });

  video.addEventListener('ratechange', () => {
    savePreferences();
  });

  // Next / Previous Track Buttons
  if (nextTrackBtn) {
    nextTrackBtn.addEventListener('click', () => playNextTrack(false));
  }
  if (prevTrackBtn) {
    prevTrackBtn.addEventListener('click', playPrevTrack);
  }

  // Autoplay Toggle Button
  if (autoplayBtn) {
    autoplayBtn.addEventListener('click', toggleAutoplay);
  }

  // Shuffle & Repeat Toggle Buttons
  if (shuffleToggleBtn) {
    shuffleToggleBtn.addEventListener('click', toggleShuffle);
  }
  if (repeatToggleBtn) {
    repeatToggleBtn.addEventListener('click', cycleRepeatMode);
  }

  // Search Input Listener
  if (playlistSearchInput) {
    playlistSearchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderPlaylist();
    });

    playlistSearchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        playlistSearchInput.value = '';
        searchQuery = '';
        playlistSearchInput.blur();
        renderPlaylist();
      }
    });
  }

  // Playback Rate Buttons
  rateButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      rateButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const rate = parseFloat(btn.dataset.rate);
      video.playbackRate = rate;
      savePreferences();
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
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') {
        document.activeElement.blur();
      }
      return;
    }

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
      case 'KeyN':
        e.preventDefault();
        playNextTrack(false);
        break;
      case 'KeyP':
        e.preventDefault();
        playPrevTrack();
        break;
      case 'KeyA':
        e.preventDefault();
        toggleAutoplay();
        break;
      case 'KeyS':
        e.preventDefault();
        toggleShuffle();
        break;
      case 'KeyR':
        e.preventDefault();
        cycleRepeatMode();
        break;
      case 'Slash':
        e.preventDefault();
        if (playlistSearchInput) {
          playlistSearchInput.focus();
          playlistSearchInput.select();
        }
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
        savePreferences();
        showToast(`Volume: ${Math.round(video.volume * 100)}%`);
        break;
      case 'ArrowDown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        savePreferences();
        showToast(`Volume: ${Math.round(video.volume * 100)}%`);
        break;
      case 'Escape':
        if (shortcutsModal.classList.contains('open')) {
          shortcutsModal.classList.remove('open');
          shortcutsModal.setAttribute('aria-hidden', 'true');
        }
        break;
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
