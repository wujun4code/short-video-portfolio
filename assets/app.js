(() => {
  'use strict';

  // ── State ────────────────────────────────────────────────────
  let videos = [];
  let currentIndex = 0;
  let isMuted = true;
  let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const feed = document.getElementById('feed');
  const dotWrap = document.getElementById('dot-indicator');
  const muteBtn = document.getElementById('btn-mute');
  const iconMuted = document.getElementById('icon-muted');
  const iconUnmuted = document.getElementById('icon-unmuted');

  // ── Load manifest ────────────────────────────────────────────
  async function init() {
    try {
      const res = await fetch('data/videos.json');
      videos = await res.json();
    } catch {
      console.error('Failed to load data/videos.json');
      return;
    }
    buildSlides();
    buildDots();
    observeSlides();
    handleKeyboard();
    jumpToHash();
  }

  // ── Build DOM ────────────────────────────────────────────────
  function buildSlides() {
    videos.forEach((v, i) => {
      const slide = document.createElement('div');
      slide.className = 'slide';
      slide.id = v.id;
      slide.dataset.index = i;
      slide.dataset.type = v.type;

      const inner = document.createElement('div');
      inner.className = 'slide-inner';

      // Poster
      const poster = document.createElement('div');
      poster.className = 'slide-poster';
      if (v.poster) poster.style.backgroundImage = `url('${v.poster}')`;

      // Media
      let media;
      if (v.type === 'video') {
        media = document.createElement('video');
        media.muted = true;
        media.loop = true;
        media.playsInline = true;
        media.preload = 'metadata';
        if (v.poster) media.poster = v.poster;
        media.addEventListener('canplay', () => poster.classList.add('hidden'));
        media.addEventListener('timeupdate', () => updateProgress(slide, media));
        media.addEventListener('click', () => togglePlay(media, slide));
      } else {
        media = document.createElement('iframe');
        media.src = v.src;
        media.allow = 'autoplay';
        media.setAttribute('sandbox', 'allow-scripts allow-same-origin');
        media.addEventListener('load', () => poster.classList.add('hidden'));
      }
      media.className = 'slide-media';
      // Lazy: only set src for first 2 slides on init
      if (v.type === 'video' && i > 1) {
        media.dataset.lazySrc = v.src;
      } else if (v.type === 'video') {
        media.src = v.src;
      }

      // Play icon overlay
      const playIcon = document.createElement('div');
      playIcon.className = 'play-icon';
      playIcon.innerHTML = `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`;

      // Top overlay
      const overlayTop = document.createElement('div');
      overlayTop.className = 'overlay-top';
      overlayTop.innerHTML = `
        <span class="site-name">Portfolio</span>
      `;

      // Bottom overlay
      const typeBadge = `<span class="slide-type-badge ${v.type}">${v.type === 'html' ? 'storyboard' : 'video'}</span>`;
      const progressHTML = v.type === 'video' ? `
        <div class="progress-wrap">
          <div class="progress-track" data-progress-track>
            <div class="progress-fill" data-progress-fill></div>
          </div>
          <span class="progress-time" data-progress-time>0:00</span>
        </div>` : '';

      const overlayBottom = document.createElement('div');
      overlayBottom.className = 'overlay-bottom';
      overlayBottom.innerHTML = `
        ${typeBadge}
        <div class="slide-title">${escHtml(v.title || '')}</div>
        <div class="slide-desc">${escHtml(v.description || '')}</div>
        ${progressHTML}
      `;

      // Progress bar click
      if (v.type === 'video') {
        const track = overlayBottom.querySelector('[data-progress-track]');
        track.addEventListener('click', e => {
          const rect = track.getBoundingClientRect();
          const ratio = (e.clientX - rect.left) / rect.width;
          if (media.duration) media.currentTime = ratio * media.duration;
        });
      }

      inner.append(poster, media, playIcon, overlayTop, overlayBottom);
      slide.append(inner);
      feed.append(slide);
    });
  }

  function buildDots() {
    dotWrap.innerHTML = '';
    videos.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'dot' + (i === 0 ? ' active' : '');
      dotWrap.append(d);
    });
  }

  // ── Intersection Observer ────────────────────────────────────
  function observeSlides() {
    const opts = { root: feed, threshold: 0.6 };
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const slide = entry.target;
        const idx = +slide.dataset.index;
        activateSlide(idx);
      });
    }, opts);

    document.querySelectorAll('.slide').forEach(s => obs.observe(s));
  }

  function activateSlide(idx) {
    if (idx === currentIndex && idx !== 0) return;
    const prev = currentIndex;
    currentIndex = idx;

    // Update dots
    document.querySelectorAll('.dot').forEach((d, i) => {
      d.classList.toggle('active', i === idx);
    });

    // Update URL hash
    if (videos[idx]) {
      history.replaceState(null, '', `#${videos[idx].id}`);
    }

    // Pause previous
    pauseSlideAt(prev);

    // Load lazy src
    lazyLoadAround(idx);

    // Autoplay current
    if (!reducedMotion) playSlideAt(idx);
  }

  function playSlideAt(idx) {
    const slide = feed.children[idx];
    if (!slide) return;
    const media = slide.querySelector('.slide-media');
    if (media && media.tagName === 'VIDEO') {
      media.muted = isMuted;
      media.play().catch(() => {});
    }
  }

  function pauseSlideAt(idx) {
    const slide = feed.children[idx];
    if (!slide) return;
    const media = slide.querySelector('.slide-media');
    if (media && media.tagName === 'VIDEO') media.pause();
  }

  function lazyLoadAround(idx) {
    [-1, 0, 1].forEach(offset => {
      const i = idx + offset;
      if (i < 0 || i >= videos.length) return;
      const slide = feed.children[i];
      const media = slide?.querySelector('.slide-media');
      if (media && media.tagName === 'VIDEO' && !media.src && media.dataset.lazySrc) {
        media.src = media.dataset.lazySrc;
      }
      // Lazy iframe
      if (media && media.tagName === 'IFRAME' && !media.src && videos[i].src) {
        media.src = videos[i].src;
      }
    });
  }

  // ── Toggle play/pause on tap ─────────────────────────────────
  function togglePlay(video, slide) {
    const icon = slide.querySelector('.play-icon');
    if (video.paused) {
      video.play().catch(() => {});
      // Briefly show pause icon — keep it simple, just hide quickly
    } else {
      video.pause();
      if (icon) {
        icon.classList.add('show');
        setTimeout(() => icon.classList.remove('show'), 600);
      }
    }
  }

  // ── Progress ─────────────────────────────────────────────────
  function updateProgress(slide, video) {
    const fill = slide.querySelector('[data-progress-fill]');
    const time = slide.querySelector('[data-progress-time]');
    if (!fill || !video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    fill.style.width = pct + '%';
    if (time) time.textContent = formatTime(video.currentTime);
  }

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  // ── Mute ─────────────────────────────────────────────────────
  muteBtn.addEventListener('click', () => {
    isMuted = !isMuted;
    iconMuted.style.display = isMuted ? 'block' : 'none';
    iconUnmuted.style.display = isMuted ? 'none' : 'block';
    const current = feed.children[currentIndex];
    const v = current?.querySelector('video');
    if (v) v.muted = isMuted;
  });

  // ── Keyboard navigation ──────────────────────────────────────
  function handleKeyboard() {
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' || e.key === 'j') navigateTo(currentIndex + 1);
      if (e.key === 'ArrowUp'   || e.key === 'k') navigateTo(currentIndex - 1);
      if (e.key === 'm') muteBtn.click();
      if (e.key === ' ') {
        e.preventDefault();
        const v = feed.children[currentIndex]?.querySelector('video');
        if (v) { v.paused ? v.play() : v.pause(); }
      }
    });
  }

  function navigateTo(idx) {
    if (idx < 0 || idx >= videos.length) return;
    feed.children[idx].scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ── Deep link via hash ───────────────────────────────────────
  function jumpToHash() {
    const hash = location.hash.slice(1);
    if (!hash) return;
    const idx = videos.findIndex(v => v.id === hash);
    if (idx > 0) setTimeout(() => navigateTo(idx), 300);
  }

  // ── Util ─────────────────────────────────────────────────────
  function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ── Boot ─────────────────────────────────────────────────────
  init();
})();
