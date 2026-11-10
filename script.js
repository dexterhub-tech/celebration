const CONFIG = {
  FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSfm-AXMSEtLmFb0CFwkSK8PC6xc2uHRBPumOTMDPB-w2NPKQg/formResponse",
  ENTRY_NAME: "entry.1909405241",
  ENTRY_MESSAGE: "entry.454516565",
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYtblVzJasxOOWU0N5wVrUjtB0eXmbjkIt8l4jAZ9i_86N78V_l33vTCYYU9-ea485sB1gTaJKAr7X/pub?gid=1356376876&single=true&output=csv"
};

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────
  const canvas      = document.getElementById('confetti-canvas');
  const ctx         = canvas.getContext('2d');
  const heading     = document.getElementById('heading');
  const giftArea    = document.getElementById('gift-area');
  const giftWrap    = document.getElementById('gift-wrap');
  const giftLid     = document.getElementById('gift-lid');
  const giftBox     = document.getElementById('gift-box');
  const tapHint     = document.getElementById('tap-hint');
  const photoLeft   = document.getElementById('photo-left');
  const photoCenter = document.getElementById('photo-center');
  const photoRight  = document.getElementById('photo-right');
  const balloonsDiv = document.getElementById('balloons');
  const soundtrack  = document.getElementById('soundtrack');

  // Wishes DOM refs
  const wishesStack     = document.getElementById('wishes-stack');
  const wishesBtn       = document.getElementById('wishes-btn');
  const formModal       = document.getElementById('wish-form-modal');
  const viewerModal     = document.getElementById('wish-viewer-modal');
  const wishForm        = document.getElementById('wish-form');
  const wishNameInput   = document.getElementById('wish-name');
  const wishMessageInput= document.getElementById('wish-message');
  const charCountEl     = document.getElementById('char-count');
  const cooldownMsgEl   = document.getElementById('form-cooldown-msg');
  const submitBtn       = document.getElementById('wish-submit-btn');
  const viewerCard      = document.getElementById('viewer-card');
  const viewerName      = document.getElementById('viewer-name');
  const viewerMessage   = document.getElementById('viewer-message');
  const viewerTime      = document.getElementById('viewer-time');
  const viewerCounter   = document.getElementById('viewer-counter');
  const viewerPrevBtn   = document.getElementById('viewer-prev');
  const viewerNextBtn   = document.getElementById('viewer-next');

  // ── Reduced-motion flag ───────────────────────────────────────
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Confetti config ───────────────────────────────────────────
  const MAX_PARTICLES = reduced ? 30 : (window.innerWidth > 600 ? 120 : 80);
  const COLORS = ['#e74c3c','#f39c12','#2ecc71','#3498db','#9b59b6','#1abc9c','#e67e22','#f1c40f'];
  const SHAPES = ['rect', 'circle', 'star'];

  let particles       = [];
  let burstParticles  = [];
  let confettiRunning = false;
  let rafId           = null;
  let isTabHidden     = false;

  // ── Audio context (lazy) ──────────────────────────────────────
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  // ── State ─────────────────────────────────────────────────────
  let sequenceStarted = false;
  let wishes = [];
  let currentWishIndex = 0;
  let pollingInterval = null;

  // =================================================================
  // INIT
  // =================================================================
  function init() {
    resizeCanvas();
    heading.classList.remove('visible');
    giftArea.classList.remove('slid-down');
    giftWrap.classList.remove('jolting');
    giftLid.classList.remove('popped');
    giftLid.classList.remove('idle');
    tapHint.classList.remove('hidden');
    photoLeft.classList.remove('landed');
    photoCenter.classList.remove('landed');
    photoRight.classList.remove('landed');
    photoLeft.style.cssText   = '';
    photoCenter.style.cssText = '';
    photoRight.style.cssText  = '';
    giftArea.style.animation  = '';
    giftArea.style.opacity    = '';
    giftLid.style.animation   = '';
    giftLid.style.opacity     = '';
    clearBalloons();
    stopConfetti();
    stopMusic();
    sequenceStarted = false;
    requestAnimationFrame(() => giftLid.classList.add('idle'));
  }

  // =================================================================
  // CANVAS
  // =================================================================
  function resizeCanvas() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);

  // =================================================================
  // CONFETTI ENGINE
  // =================================================================
  function createParticle(opts = {}) {
    const isBurst = !!opts.burst;
    const angle   = isBurst
      ? (opts.angle !== undefined ? opts.angle : Math.random() * Math.PI * 2)
      : 0;

    const speed  = isBurst ? (Math.random() * 12 + 6) : 0;
    const startX = opts.x !== undefined ? opts.x : Math.random() * canvas.width;
    const startY = opts.y !== undefined ? opts.y : -20;

    return {
      x: startX,
      y: startY,
      vx: isBurst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 2,
      vy: isBurst ? Math.sin(angle) * speed * -1 : Math.random() * 3 + 1,
      size: Math.random() * 8 + 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      alpha: 1,
      gravity: isBurst ? 0.35 : 0.08,
      drag: isBurst ? 0.97 : 1,
      isBurst,
      life: isBurst ? 1 : null,
    };
  }

  function drawStar(cx, cy, r, n, ratio) {
    ctx.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const ang = (Math.PI / n) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? r : r * ratio;
      ctx.lineTo(cx + Math.cos(ang) * rad, cy + Math.sin(ang) * rad);
    }
    ctx.closePath();
  }

  function drawParticle(p) {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = p.color;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);

    if (p.shape === 'rect') {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    } else if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      drawStar(0, 0, p.size / 2, 5, 0.5);
      ctx.fill();
    }
    ctx.restore();
  }

  function tickConfetti() {
    if (isTabHidden) { rafId = requestAnimationFrame(tickConfetti); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (confettiRunning && particles.length < MAX_PARTICLES) {
      particles.push(createParticle());
    }

    burstParticles = burstParticles.filter(p => {
      p.vx *= p.drag;
      p.vy  = p.vy * p.drag + p.gravity;
      p.x  += p.vx;
      p.y  += p.vy;
      p.rotation += p.rotSpeed;
      p.life -= 0.015;
      p.alpha = Math.max(0, p.life);
      drawParticle(p);
      return p.life > 0;
    });

    particles = particles.filter(p => {
      p.vx += (Math.random() - 0.5) * 0.05;
      p.x  += p.vx;
      p.y  += p.vy;
      p.rotation += p.rotSpeed;
      drawParticle(p);
      return p.y < canvas.height + 20;
    });

    if (burstParticles.length > 0 || confettiRunning || particles.length > 0) {
      rafId = requestAnimationFrame(tickConfetti);
    } else {
      rafId = null;
    }
  }

  function startRaf() {
    if (!rafId) rafId = requestAnimationFrame(tickConfetti);
  }

  function burstConfetti(x, y) {
    const count = reduced ? 30 : 80;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i;
      burstParticles.push(createParticle({ burst: true, x, y, angle }));
    }
    startRaf();
  }

  function startFallingConfetti() {
    confettiRunning = true;
    startRaf();
  }

  function stopConfetti() {
    confettiRunning = false;
    particles = [];
    burstParticles = [];
    if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  // =================================================================
  // AUDIO
  // =================================================================
  function playPopSound() {
    try {
      const ac  = getAudioCtx();
      const dur = 0.18;
      const bufSize = ac.sampleRate * dur;
      const buffer  = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data    = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      const src = ac.createBufferSource();
      src.buffer = buffer;
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass'; bp.frequency.value = 800; bp.Q.value = 0.5;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.6, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      src.connect(bp); bp.connect(gain); gain.connect(ac.destination);
      src.start();
    } catch (_) {}
  }

  function playShutterSound() {
    try {
      const ac  = getAudioCtx();
      const dur = 0.08;
      const bufSize = ac.sampleRate * dur;
      const buffer  = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data    = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.15));
      const src  = ac.createBufferSource();
      src.buffer = buffer;
      const hp   = ac.createBiquadFilter();
      hp.type    = 'highpass'; hp.frequency.value = 2000;
      const gain = ac.createGain();
      gain.gain.setValueAtTime(0.4, ac.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      src.connect(hp); hp.connect(gain); gain.connect(ac.destination);
      src.start();
    } catch (_) {}
  }

  let musicFadeRaf = null;
  function fadeInMusic() {
    soundtrack.volume = 0;
    soundtrack.play().catch(() => {});
    const duration = 2000;
    const start    = performance.now();
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      soundtrack.volume = t;
      if (t < 1) musicFadeRaf = requestAnimationFrame(tick);
    }
    musicFadeRaf = requestAnimationFrame(tick);
  }

  function stopMusic() {
    if (musicFadeRaf) { cancelAnimationFrame(musicFadeRaf); musicFadeRaf = null; }
    soundtrack.pause();
    soundtrack.currentTime = 0;
    soundtrack.volume = 0;
  }

  // =================================================================
  // BALLOONS (FLOATING & DRAGGABLE)
  // =================================================================
  const BALLOON_COUNT = reduced ? 4 : 8;

  function makeDraggable(balloonEl) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let initLeft = 0, initTop = 0;

    balloonEl.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      isDragging = true;
      balloonEl.classList.add('dragging');
      balloonEl.setPointerCapture(e.pointerId);

      startX = e.clientX;
      startY = e.clientY;

      const rect = balloonEl.getBoundingClientRect();
      initLeft = rect.left;
      initTop = rect.top;

      balloonEl.style.left = `${initLeft}px`;
      balloonEl.style.top = `${initTop}px`;
      e.preventDefault();
    });

    balloonEl.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      let newLeft = initLeft + dx;
      let newTop = initTop + dy;

      const w = balloonEl.offsetWidth || 60;
      const h = balloonEl.offsetHeight || 90;
      newLeft = Math.max(4, Math.min(window.innerWidth - w - 4, newLeft));
      newTop = Math.max(4, Math.min(window.innerHeight - h - 4, newTop));

      balloonEl.style.left = `${newLeft}px`;
      balloonEl.style.top = `${newTop}px`;
    });

    function stopDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      balloonEl.classList.remove('dragging');
      try {
        balloonEl.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    balloonEl.addEventListener('pointerup', stopDrag);
    balloonEl.addEventListener('pointercancel', stopDrag);
  }

  function spawnBalloons() {
    clearBalloons();

    const positions = [
      { left: 6,  top: 14, size: 68 },
      { left: 82, top: 10, size: 74 },
      { left: 5,  top: 42, size: 64 },
      { left: 84, top: 40, size: 70 },
      { left: 9,  top: 72, size: 66 },
      { left: 80, top: 68, size: 72 },
      { left: 48, top: 80, size: 65 },
      { left: 24, top: 85, size: 58 },
    ];

    const count = Math.min(positions.length, BALLOON_COUNT);

    for (let i = 0; i < count; i++) {
      const pos = positions[i];
      const el = document.createElement('div');
      el.className = 'balloon';

      const swayX = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 14);
      const swayY = -(18 + Math.random() * 22);
      const swayRot = (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 5);
      const bobDur = 4.5 + Math.random() * 3.5;
      const bobDelay = -(Math.random() * 5);

      el.style.width = `${pos.size}px`;
      el.style.left = `${pos.left}%`;
      el.style.top = `${pos.top}%`;
      el.style.setProperty('--sway-x', `${swayX}px`);
      el.style.setProperty('--sway-y', `${swayY}px`);
      el.style.setProperty('--sway-rot', `${swayRot}deg`);
      el.style.setProperty('--bob-duration', `${bobDur}s`);
      el.style.setProperty('--bob-delay', `${bobDelay}s`);

      const gradId = `b-grad-${i}-${Math.floor(Math.random() * 10000)}`;
      el.innerHTML = `
        <div class="balloon-inner">
          <svg viewBox="0 0 70 110" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="${gradId}" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stop-color="#ff7675"/>
                <stop offset="35%" stop-color="#e74c3c"/>
                <stop offset="85%" stop-color="#c0392b"/>
                <stop offset="100%" stop-color="#962d22"/>
              </radialGradient>
            </defs>
            <path d="M35 73 Q24 85 40 96 T34 112" stroke="#888" stroke-width="1.4" fill="none" stroke-linecap="round"/>
            <polygon points="31,71 39,71 37,76 33,76" fill="#962d22"/>
            <ellipse cx="35" cy="40" rx="30" ry="35" fill="url(#${gradId})"/>
            <ellipse cx="24" cy="26" rx="9" ry="6" fill="rgba(255,255,255,0.42)" transform="rotate(-25 24 26)"/>
          </svg>
        </div>
      `;

      balloonsDiv.appendChild(el);
      makeDraggable(el);

      setTimeout(() => {
        el.classList.add('visible');
      }, i * 140);
    }
  }

  function clearBalloons() {
    balloonsDiv.innerHTML = '';
  }

  // =================================================================
  // PHOTO DROP
  // =================================================================
  function dropPhoto(el, shutterDelay) {
    return new Promise(resolve => {
      setTimeout(() => {
        playShutterSound();
        el.classList.add('landed');
        setTimeout(resolve, 700);
      }, shutterDelay);
    });
  }

  // =================================================================
  // SEQUENCE ORCHESTRATOR
  // =================================================================
  async function runSequence() {
    sequenceStarted = true;

    giftWrap.removeEventListener('click',   onGiftTap);
    giftWrap.removeEventListener('keydown', onGiftKey);

    // ── STEP 2: BURST ──────────────────────────────────────────
    giftLid.classList.remove('idle');
    giftLid.classList.add('popped');
    giftWrap.classList.add('jolting');
    tapHint.classList.add('hidden');
    playPopSound();

    const boxRect = giftBox.getBoundingClientRect();
    const bx = boxRect.left + boxRect.width / 2;
    const by = boxRect.top  + boxRect.height / 3;
    burstConfetti(bx, by);

    // Heading emerges from center box and travels to top
    await delay(200);
    heading.classList.add('visible');

    // Box smoothly slides down to resting spot near bottom
    await delay(350);
    giftArea.classList.add('slid-down');

    // ── STEP 3: PHOTOS DROP ────────────────────────────────────
    // Drop order: celebrant-2 (left), celebrant-3 (right), celebrant-1 (center on top)
    await delay(450);
    await dropPhoto(photoLeft,   0);
    await dropPhoto(photoRight,  300);
    await dropPhoto(photoCenter, 300);

    // ── STEP 4: MUSIC + FALLING CONFETTI ──────────────────────
    await delay(500);
    fadeInMusic();
    startFallingConfetti();

    // ── STEP 5: BALLOONS ──────────────────────────────────────
    await delay(1800);
    spawnBalloons();
  }

  // =================================================================
  // GIFT TAP HANDLER
  // =================================================================
  function onGiftTap() {
    if (sequenceStarted) return;
    runSequence();
  }

  function onGiftKey(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onGiftTap();
    }
  }

  // =================================================================
  // WISHES FEATURE (CSV Parser, Google Form, Storage, Modals)
  // =================================================================
  const SESSION_KEY      = 'pastor_timi_pending_wishes';
  const LOCAL_BACKUP_KEY = 'pastor_timi_local_wishes';
  const COOLDOWN_KEY     = 'pastor_timi_wish_cooldown';

  // Robust CSV parser handling quotes, commas, newlines, escaped quotes
  function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
      const char = text[i];
      const next = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (next === '"') {
            field += '"';
            i += 2;
            continue;
          } else {
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          field += char;
          i++;
          continue;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
          i++;
          continue;
        } else if (char === ',') {
          row.push(field);
          field = '';
          i++;
          continue;
        } else if (char === '\r') {
          if (next === '\n') {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            i += 2;
            continue;
          } else {
            row.push(field);
            rows.push(row);
            row = [];
            field = '';
            i++;
            continue;
          }
        } else if (char === '\n') {
          row.push(field);
          rows.push(row);
          row = [];
          field = '';
          i++;
          continue;
        } else {
          field += char;
          i++;
          continue;
        }
      }
    }

    if (field !== '' || row.length > 0) {
      row.push(field);
      rows.push(row);
    }

    return rows;
  }

  function parseWishesFromCSV(csvText) {
    const rows = parseCSV(csvText);
    if (rows.length <= 1) return [];

    const parsed = [];
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 3) continue;
      const timestamp = (row[0] || '').trim();
      const name = (row[1] || '').trim().slice(0, 30);
      const message = (row[2] || '').trim().slice(0, 200);

      if (name && message) {
        parsed.push({ timestamp, name, message });
      }
    }

    // Google Sheets appends at bottom; reverse to show newest first
    parsed.reverse();
    return parsed.slice(0, 50);
  }

  function getPendingWishes() {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function savePendingWish(wish) {
    try {
      const list = getPendingWishes();
      list.unshift(wish);
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(list));
    } catch (_) {}
  }

  function getLocalFallbackWishes() {
    try {
      const raw = localStorage.getItem(LOCAL_BACKUP_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  function saveLocalFallbackWish(wish) {
    try {
      const list = getLocalFallbackWishes();
      list.unshift(wish);
      localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(list.slice(0, 50)));
    } catch (_) {}
  }

  function mergeWishes(fetchedWishes) {
    const seen = new Set();
    const combined = [];

    const pending = getPendingWishes();
    const stillPending = [];
    const fetchedKeys = new Set(fetchedWishes.map(w => `${w.name.toLowerCase()}::${w.message.toLowerCase()}`));

    for (const p of pending) {
      const key = `${p.name.toLowerCase()}::${p.message.toLowerCase()}`;
      if (!fetchedKeys.has(key)) {
        stillPending.push(p);
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(p);
        }
      }
    }

    if (stillPending.length !== pending.length) {
      try {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(stillPending));
      } catch (_) {}
    }

    for (const w of fetchedWishes) {
      const key = `${w.name.toLowerCase()}::${w.message.toLowerCase()}`;
      if (!seen.has(key)) {
        seen.add(key);
        combined.push(w);
      }
    }

    wishes = combined.slice(0, 50);
    renderWishStack();
    updateViewerControls();
  }

  async function fetchWishes() {
    if (!CONFIG.SHEET_CSV_URL || CONFIG.SHEET_CSV_URL.includes('PLACEHOLDER')) {
      mergeWishes(getLocalFallbackWishes());
      return;
    }

    try {
      const url = `${CONFIG.SHEET_CSV_URL}&_t=${Date.now()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      const parsed = parseWishesFromCSV(text);
      mergeWishes(parsed);
    } catch (_) {
      if (wishes.length === 0) {
        mergeWishes(getLocalFallbackWishes());
      }
    }
  }

  function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
      if (!document.hidden) {
        fetchWishes();
      }
    }, 60000);
  }

  function renderWishStack() {
    wishesStack.innerHTML = '';

    if (wishes.length === 0) {
      const emptyNote = document.createElement('div');
      emptyNote.className = 'stack-note';
      emptyNote.style.transform = 'rotate(-1deg)';
      emptyNote.innerHTML = `
        <div class="sticky-pin"></div>
        <div class="stack-empty">Leave the first birthday wish! ✍️</div>
      `;
      wishesStack.appendChild(emptyNote);
      return;
    }

    const count = Math.min(wishes.length, 4);
    const stackTransforms = [
      'rotate(4deg) translate(3px, -8px)',
      'rotate(-4deg) translate(-2px, -5px)',
      'rotate(2deg) translate(2px, -2px)',
      'rotate(-2deg) translate(0, 0)',
    ];

    for (let i = count - 1; i >= 0; i--) {
      const wish = wishes[i];
      const note = document.createElement('div');
      note.className = 'stack-note';
      note.style.transform = stackTransforms[count - 1 - i] || 'none';
      note.style.zIndex = (i === 0 ? 5 : 4 - i).toString();

      if (i === 0) {
        note.innerHTML = `
          <div class="sticky-pin"></div>
          <div class="stack-author"></div>
          <div class="stack-preview"></div>
        `;
        note.querySelector('.stack-author').textContent = wish.name;
        note.querySelector('.stack-preview').textContent = wish.message;
      } else {
        note.innerHTML = `<div class="sticky-pin"></div>`;
      }

      wishesStack.appendChild(note);
    }

    if (wishes.length > 4) {
      const badge = document.createElement('span');
      badge.className = 'stack-badge';
      badge.textContent = `+${wishes.length - 4}`;
      wishesStack.appendChild(badge);
    }
  }

  function openModal(modal) {
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal(modal) {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    if (!formModal.classList.contains('open') && !viewerModal.classList.contains('open')) {
      document.body.classList.remove('modal-open');
    }
  }

  async function handleWishSubmit(e) {
    e.preventDefault();

    const name = wishNameInput.value.trim().slice(0, 30);
    const message = wishMessageInput.value.trim().slice(0, 200);

    if (!name || !message) return;

    // 30-second per-device cooldown check
    const lastSent = parseInt(localStorage.getItem(COOLDOWN_KEY) || '0', 10);
    const now = Date.now();
    const elapsed = now - lastSent;
    if (elapsed < 30000) {
      const remaining = Math.ceil((30000 - elapsed) / 1000);
      cooldownMsgEl.textContent = `Please wait ${remaining}s before sending another wish! 😊`;
      return;
    }
    cooldownMsgEl.textContent = '';

    submitBtn.disabled = true;
    const btnText = submitBtn.querySelector('.btn-text');
    btnText.textContent = 'Sending...';

    const newWish = {
      timestamp: new Date().toLocaleString(),
      name,
      message,
    };

    if (CONFIG.FORM_URL && !CONFIG.FORM_URL.includes('PLACEHOLDER')) {
      try {
        const body = new URLSearchParams({
          [CONFIG.ENTRY_NAME]: name,
          [CONFIG.ENTRY_MESSAGE]: message,
        });

        await fetch(CONFIG.FORM_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });
      } catch (_) {}
    }

    savePendingWish(newWish);
    saveLocalFallbackWish(newWish);
    localStorage.setItem(COOLDOWN_KEY, now.toString());

    wishes.unshift(newWish);
    renderWishStack();

    wishForm.reset();
    charCountEl.textContent = '0';
    closeModal(formModal);
    submitBtn.disabled = false;
    btnText.textContent = 'Send Wish 💌';

    const topNote = wishesStack.querySelector('.stack-note:last-child');
    if (topNote) {
      topNote.style.animation = 'note-pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
    }
  }

  function showWishAt(index) {
    if (wishes.length === 0) return;
    if (index < 0) index = 0;
    if (index >= wishes.length) index = wishes.length - 1;
    currentWishIndex = index;

    const wish = wishes[currentWishIndex];

    viewerCard.style.opacity = '0';
    viewerCard.style.transform = 'scale(0.96) translateY(6px)';

    setTimeout(() => {
      viewerName.textContent = wish.name;
      viewerMessage.textContent = wish.message;
      viewerTime.textContent = wish.timestamp || '';
      viewerCounter.textContent = `${currentWishIndex + 1} of ${wishes.length}`;

      viewerPrevBtn.disabled = currentWishIndex === 0;
      viewerNextBtn.disabled = currentWishIndex === wishes.length - 1;

      viewerCard.style.opacity = '1';
      viewerCard.style.transform = 'scale(1) translateY(0)';
    }, 120);
  }

  function updateViewerControls() {
    if (viewerModal.classList.contains('open')) {
      if (wishes.length === 0) {
        closeModal(viewerModal);
        return;
      }
      if (currentWishIndex >= wishes.length) currentWishIndex = wishes.length - 1;
      showWishAt(currentWishIndex);
    }
  }

  // Swipe detection for viewer
  let touchStartX = 0;
  let touchStartY = 0;

  viewerModal.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  }, { passive: true });

  viewerModal.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;

    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) {
        if (currentWishIndex < wishes.length - 1) showWishAt(currentWishIndex + 1);
      } else {
        if (currentWishIndex > 0) showWishAt(currentWishIndex - 1);
      }
    }
  }, { passive: true });

  // Keyboard navigation & Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (formModal.classList.contains('open')) closeModal(formModal);
      if (viewerModal.classList.contains('open')) closeModal(viewerModal);
      return;
    }

    if (viewerModal.classList.contains('open')) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (currentWishIndex < wishes.length - 1) showWishAt(currentWishIndex + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (currentWishIndex > 0) showWishAt(currentWishIndex - 1);
      }
    }
  });

  // Wire Wishes UI events
  wishesBtn.addEventListener('click', () => {
    openModal(formModal);
    setTimeout(() => wishNameInput.focus(), 150);
  });

  wishesStack.addEventListener('click', () => {
    if (wishes.length === 0) {
      openModal(formModal);
    } else {
      showWishAt(0);
      openModal(viewerModal);
    }
  });

  wishesStack.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      wishesStack.click();
    }
  });

  document.querySelectorAll('[data-close-form]').forEach(el => {
    el.addEventListener('click', () => closeModal(formModal));
  });
  document.querySelectorAll('[data-close-viewer]').forEach(el => {
    el.addEventListener('click', () => closeModal(viewerModal));
  });

  viewerPrevBtn.addEventListener('click', () => {
    if (currentWishIndex > 0) showWishAt(currentWishIndex - 1);
  });
  viewerNextBtn.addEventListener('click', () => {
    if (currentWishIndex < wishes.length - 1) showWishAt(currentWishIndex + 1);
  });

  wishMessageInput.addEventListener('input', () => {
    charCountEl.textContent = wishMessageInput.value.length;
  });

  wishForm.addEventListener('submit', handleWishSubmit);

  // =================================================================
  // PAGE VISIBILITY — pause/resume
  // =================================================================
  document.addEventListener('visibilitychange', () => {
    isTabHidden = document.hidden;
    if (document.hidden) {
      if (!soundtrack.paused) soundtrack.pause();
    } else {
      if (confettiRunning && soundtrack.volume > 0) {
        soundtrack.play().catch(() => {});
      }
      if (confettiRunning || burstParticles.length > 0 || particles.length > 0) startRaf();
      fetchWishes();
    }
  });

  // =================================================================
  // UTILITY
  // =================================================================
  function delay(ms) {
    return new Promise(r => setTimeout(r, reduced ? Math.min(ms, 200) : ms));
  }

  // =================================================================
  // BOOTSTRAP
  // =================================================================
  init();
  giftWrap.addEventListener('click',   onGiftTap);
  giftWrap.addEventListener('keydown', onGiftKey);

  // Initial wish fetch & start background sync
  fetchWishes();
  startPolling();

})();
