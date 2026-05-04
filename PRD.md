# PRD: Personal Short Video Portfolio Site

**Author:** wujun4code  
**Date:** 2026-05-04  
**Version:** 1.0  

---

## 1. Overview

A personal portfolio website for showcasing self-produced short videos. The site mimics the core interaction pattern of Instagram Reels / TikTok: full-screen portrait mode, swipe/scroll to navigate between videos. Media assets are hosted on Cloudflare R2. No backend required — the site is a fully static deployment on GitHub Pages.

---

## 2. Goals

- Provide an immersive, mobile-first video viewing experience.
- Support two content types: **multimedia videos** (MP4/WebM) and **HTML storyboards** (interactive HTML pages embedded via iframe).
- Allow visitors to navigate videos by swiping up/down (touch) or scrolling (desktop).
- Keep the stack simple: pure HTML + CSS + JavaScript, zero build tools, deployable to GitHub Pages.

---

## 3. User Stories

| ID | Role | Story | Priority |
|----|------|-------|----------|
| US-1 | Visitor | I open the site and see the first video/storyboard full-screen | P0 |
| US-2 | Visitor | I swipe up to go to the next video | P0 |
| US-3 | Visitor | I swipe down to go to the previous video | P0 |
| US-4 | Visitor | Videos auto-play when scrolled into view and pause when out of view | P0 |
| US-5 | Visitor | HTML storyboards render correctly inside the player | P0 |
| US-6 | Visitor | I can mute/unmute video audio | P1 |
| US-7 | Visitor | I see a progress indicator showing which video I'm on | P1 |
| US-8 | Visitor | The site looks good on both mobile portrait and desktop | P1 |
| US-9 | Owner | I add a new video by editing a single JSON config file | P1 |
| US-10 | Visitor | I can see the video title and a short description | P2 |
| US-11 | Visitor | I can share a direct link to a specific video via URL hash | P2 |

---

## 4. Content Types

### 4.1 Multimedia Video
- Format: MP4 (H.264) or WebM (VP9), hosted on Cloudflare R2.
- Rendered via native `<video>` element.
- Autoplay (muted by default), looped.
- User can tap to toggle mute.

### 4.2 HTML Storyboard
- A self-contained HTML file hosted on Cloudflare R2 (or bundled in the repo).
- Rendered inside a sandboxed `<iframe>`.
- The iframe is sized to fill the viewport height (portrait: 100vh × auto width capped at 480px).

---

## 5. Data Model

Video metadata is stored in `data/videos.json`:

```json
[
  {
    "id": "video-001",
    "type": "video",           // "video" | "html"
    "src": "https://r2.example.com/videos/001.mp4",
    "poster": "https://r2.example.com/posters/001.jpg",
    "title": "First Short",
    "description": "A brief description",
    "duration": 30             // seconds, informational
  },
  {
    "id": "story-001",
    "type": "html",
    "src": "https://r2.example.com/stories/001.html",
    "poster": "https://r2.example.com/posters/story-001.jpg",
    "title": "Interactive Story",
    "description": "An HTML+canvas storyboard"
  }
]
```

---

## 6. UI / UX Specification

### 6.1 Layout

```
┌──────────────────────────────┐
│  [Logo / name]   [Mute btn]  │  ← top overlay (translucent)
│                              │
│                              │
│       VIDEO / IFRAME         │  ← full viewport
│                              │
│                              │
│  [Title]  [Description]      │  ← bottom overlay (gradient)
│  ──●────────────────── 0:15  │  ← progress bar (video only)
└──────────────────────────────┘
   ●  ●  ●  ●                    ← dot indicator (right side)
```

### 6.2 Navigation

| Gesture / Input | Action |
|-----------------|--------|
| Swipe up / scroll down | Next video |
| Swipe down / scroll up | Previous video |
| Click / tap center | Play / Pause (video) |
| Click / tap mute icon | Toggle mute |
| URL hash `#video-001` | Jump directly to that video on load |

### 6.3 Snap Behavior
- Each video occupies exactly 100vh.
- Scroll snapping via CSS `scroll-snap-type: y mandatory`.
- Intersection Observer API activates/deactivates video playback as slides enter/leave the viewport.

### 6.4 Responsive Design
- Mobile portrait (< 480px wide): video fills full width, height = 100vh.
- Desktop: video/iframe centered, max-width 480px, height 100vh, dark background on sides.

---

## 7. Technical Architecture

```
GitHub Repo (static site)
├── index.html          ← shell, imports CSS + JS
├── data/
│   └── videos.json     ← content manifest
├── assets/
│   ├── style.css
│   └── app.js
└── .github/
    └── workflows/
        └── pages.yml   ← GitHub Actions for Pages deploy
```

**Hosting:**
- Site: GitHub Pages (via `gh-pages` branch or `/docs` folder, or GitHub Actions).
- Media: Cloudflare R2 (public bucket or presigned URLs).

**No dependencies / no bundler** — vanilla ES2020, no framework.

---

## 8. Performance Requirements

| Metric | Target |
|--------|--------|
| First Contentful Paint (mobile 4G) | < 2s |
| Time to first video playback | < 3s |
| Lighthouse Performance score | ≥ 85 |

Techniques:
- Lazy-load video `src` — only set `src` for visible ±1 slide.
- Use `poster` image as placeholder.
- Videos preload `metadata` only.

---

## 9. Accessibility

- All interactive elements keyboard-accessible.
- Arrow keys navigate between videos.
- Videos respect `prefers-reduced-motion` (disable autoplay if set).
- Alt text on poster images.

---

## 10. Out of Scope (v1)

- User authentication or comments.
- Video upload UI (owner edits JSON directly).
- Analytics dashboard.
- PWA / offline support.

---

## 11. Milestones

| Milestone | Deliverable |
|-----------|-------------|
| M1 | PRD approved |
| M2 | Static site with video player (MP4 type working) |
| M3 | HTML storyboard iframe support |
| M4 | Polish: mute, progress bar, dot indicator, deep links |
| M5 | GitHub repo created, Pages deployed |
