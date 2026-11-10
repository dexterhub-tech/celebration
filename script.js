/* =================================================================
   script.js — Birthday Site Sequencer
   Vanilla JS, no dependencies.
   ================================================================= */

(function () {
  'use strict';

  // ── DOM refs ──────────────────────────────────────────────────
  const canvas      = document.getElementById('confetti-canvas');
  const ctx         = canvas.getContext('2d');
  const heading     = document.getElementById('heading');
  const giftArea    = document.getElementById('gift-area');
  const giftWrap    = document.getElementById('gift-wrap');
  const giftLid     = document.getElementById('gift-lid');
  const giftBox     = document.getElementById('gift-box');   // the SVG element (used for burst position)
  const tapHint     = document.getElementById('tap-hint');
  const photoLeft   = document.getElementById('photo-left');
  const photoCenter = document.getElementById('photo-center');
  const photoRight  = document.getElementById('photo-right');
  const balloonsDiv = document.getElementById('balloons');
  const soundtrack  = document.getElementById('soundtrack');
  const replayBtn   = document.getElementById('replay-btn');

  // ── Reduced-motion flag ───────────────────────────────────────
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Confetti config ───────────────────────────────────────────
  const MAX_PARTICLES = reduced ? 30 : (window.innerWidth > 600 ? 120 : 80);
  const COLORS = ['#e74c3c','#f39c12','#2ecc71','#3498db','#9b59b6','#1abc9c','#e67e22','#f1c40f'];
  const SHAPES = ['rect', 'circle', 'star'];

  let particles     = [];
  let burstParticles = []; // the initial burst from the box
  let confettiRunning = false;
  let rafId         = null;
  let isTabHidden   = false;

  // ── Audio context (lazy) ──────────────────────────────────────
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  // ── State ─────────────────────────────────────────────────────
  let sequenceStarted = false;

  // =================================================================
  // INIT
  // =================================================================
  function init() {
    resizeCanvas();
    // Reset classes (order matters: remove before re-adding)
    heading.classList.remove('visible');
    giftArea.classList.remove('burst-done');
    giftWrap.classList.remove('jolting');
    giftLid.classList.remove('popped');
    giftLid.classList.remove('idle');   // remove first so re-add re-triggers animation
    tapHint.classList.remove('hidden');
    photoLeft.classList.remove('landed');
    photoCenter.classList.remove('landed');
    photoRight.classList.remove('landed');
    // Reset inline styles so CSS default (translateY(-140vh)) takes over
    photoLeft.style.cssText   = '';
    photoCenter.style.cssText = '';
    photoRight.style.cssText  = '';
    giftArea.style.animation    = '';
    giftArea.style.opacity      = '';
    giftArea.style.pointerEvents = '';
    giftLid.style.animation     = '';
    giftLid.style.opacity       = '';
    replayBtn.classList.remove('visible');
    clearBalloons();
    stopConfetti();
    stopMusic();
    sequenceStarted = false;
    // Add idle wiggle after a tick so the animation restarts cleanly
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
      : 0; // gravity-fall: no initial angle needed

    const speed  = isBurst ? (Math.random() * 12 + 6) : 0;
    const startX = opts.x !== undefined ? opts.x : Math.random() * canvas.width;
    const startY = opts.y !== undefined ? opts.y : -20;

    return {
      x:    startX,
      y:    startY,
      vx:   isBurst ? Math.cos(angle) * speed : (Math.random() - 0.5) * 2,
      vy:   isBurst ? Math.sin(angle) * speed * -1 : Math.random() * 3 + 1,
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

  function tickConfetti(ts) {
    if (isTabHidden) { rafId = requestAnimationFrame(tickConfetti); return; }
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // spawn new falling particles continuously (after confetti phase starts)
    if (confettiRunning && particles.length < MAX_PARTICLES) {
      particles.push(createParticle());
    }

    // update and draw burst particles
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

    // update and draw falling particles
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
      // Noise burst
      const bufSize  = ac.sampleRate * dur;
      const buffer   = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data     = buffer.getChannelData(0);
      for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
      const src = ac.createBufferSource();
      src.buffer = buffer;
      // Band-pass to shape it
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
      // Very short click
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
  // BALLOONS
  // =================================================================
  const BALLOON_COUNT = reduced ? 4 : 7;

  function spawnBalloon(index) {
    const el   = document.createElement('div');
    el.className = 'balloon';

    // Build SVG use
    el.innerHTML = `<svg viewBox="0 0 60 90" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="30" cy="35" rx="26" ry="30" fill="#e74c3c"/>
      <ellipse cx="20" cy="22" rx="8" ry="6" fill="rgba(255,255,255,0.3)"/>
      <path d="M28 65 Q30 70 32 65" stroke="#c0392b" stroke-width="2" fill="#c0392b"/>
      <path d="M30 67 Q25 78 30 90" stroke="#888" stroke-width="1.2" fill="none" stroke-linecap="round"/>
    </svg>`;

    const size  = 50 + Math.random() * 30; // 50–80 px wide
    const leftPct = 5 + (index / BALLOON_COUNT) * 90; // spread across width
    const delay = index * (reduced ? 400 : 300);       // stagger
    const duration = reduced ? 0 : (12000 + Math.random() * 6000);
    const sway  = (Math.random() > 0.5 ? 1 : -1) * (10 + Math.random() * 20);

    el.style.cssText = `
      width: ${size}px;
      left: ${leftPct}%;
      top: -${size * 1.6}px;
      --sway: ${sway}px;
      animation: balloon-float ${duration}ms ${delay}ms ease-in-out forwards;
      opacity: 0;
    `;

    if (reduced) {
      // just show them statically scattered
      el.style.top  = `${10 + Math.random() * 60}%`;
      el.style.opacity = '0.85';
      el.style.animation = 'none';
    }

    balloonsDiv.appendChild(el);
  }

  function spawnBalloons() {
    for (let i = 0; i < BALLOON_COUNT; i++) spawnBalloon(i);
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
        // Resolve after animation completes (~650ms)
        setTimeout(resolve, 700);
      }, shutterDelay);
    });
  }

  // =================================================================
  // SEQUENCE ORCHESTRATOR
  // =================================================================
  async function runSequence() {
    sequenceStarted = true;

    // Disable tap to prevent double-firing
    giftWrap.removeEventListener('click',    onGiftTap);
    giftWrap.removeEventListener('keydown',  onGiftKey);

    // ── STEP 2: BURST ──────────────────────────────────────────
    giftLid.classList.remove('idle');
    giftLid.classList.add('popped');
    giftWrap.classList.add('jolting');
    tapHint.classList.add('hidden');
    playPopSound();

    // Confetti bursts from the box position
    const boxRect = giftBox.getBoundingClientRect();
    const bx = boxRect.left + boxRect.width / 2;
    const by = boxRect.top  + boxRect.height / 3;
    burstConfetti(bx, by);

    // Heading emerges after short delay
    await delay(200);
    heading.classList.add('visible');

    await delay(500);
    giftArea.classList.add('burst-done');

    // ── STEP 3: PHOTOS DROP ────────────────────────────────────
    await delay(400); // let heading settle

    // Position photos absolutely within the stage (left anchor = 50%)
    photoLeft.style.left   = '50%';
    photoLeft.style.bottom = '230px';
    photoCenter.style.left = '50%';
    photoCenter.style.bottom = '230px';
    photoRight.style.left  = '50%';
    photoRight.style.bottom = '230px';

    await dropPhoto(photoLeft,   0);
    await dropPhoto(photoCenter, 300);
    await dropPhoto(photoRight,  300);

    // ── STEP 4: MUSIC + FALLING CONFETTI ──────────────────────
    await delay(500);
    fadeInMusic();
    startFallingConfetti();

    // ── STEP 5: BALLOONS ──────────────────────────────────────
    await delay(1800);
    spawnBalloons();

    // ── STEP 6: REPLAY BUTTON ─────────────────────────────────
    await delay(reduced ? 400 : 2000);
    replayBtn.classList.add('visible');
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
  // REPLAY
  // =================================================================
  replayBtn.addEventListener('click', () => {
    init();
    // Re-attach gift listener
    giftWrap.addEventListener('click',   onGiftTap);
    giftWrap.addEventListener('keydown', onGiftKey);
  });

  // =================================================================
  // PAGE VISIBILITY — pause/resume
  // =================================================================
  document.addEventListener('visibilitychange', () => {
    isTabHidden = document.hidden;
    if (document.hidden) {
      if (!soundtrack.paused) soundtrack.pause();
    } else {
      // Resume music if it was playing (volume > 0 means it was active)
      if (confettiRunning && soundtrack.volume > 0) {
        soundtrack.play().catch(() => {});
      }
      if (confettiRunning || burstParticles.length > 0 || particles.length > 0) startRaf();
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

})();
