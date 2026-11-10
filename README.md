# Birthday website for our director, "Pastor Timi, Sir!"

Build a mobile-first, extremely lightweight birthday website.
Vanilla HTML + CSS + JS only. No frameworks, no libraries, no build step.
Target: under ~300KB total excluding the MP3.

## Reference

Look at the 5 images in /reference. They are my Figma prototype frames,
one per step. Match the layout, colors and typography. They are a visual
guide ONLY. Do not use them as images in the site.

## Real assets (the only non-code items)

- /assets/images/celebrant-1-top-center.png (center, top of the stack)
- /assets/images/celebrant-2-left.png (left, tilted, behind)
- /assets/images/celebrant-3-right.png (right, tilted, behind)
  These are already polaroid-style frames. Use them as-is.
- /assets/audio/soundtrack.mp3 (subtle jazz, loops forever)

## Everything else must be built in code (no image files)

Gift box (white, red ribbon and bow), confetti, balloons, and the shutter
sound (synthesize with the Web Audio API). Use inline SVG, CSS, and a
single <canvas> for confetti.

## Sequence

1. LOAD: white page, gift box centered low (see view-1). Text below reads
   "Tap the gift to open" with a gentle pulse/wiggle on the box.
   (A tap is required because browsers block audio without a user gesture.)
2. BURST: on tap, the lid pops off with force, like a champagne cork,
   spinning up and away, and the box jolts. Confetti shoots out of it.
   The text "HAPPY BIRTHDAY / Pastor Timi, Sir!" comes out of the box and
   settles at the top (see view-2). Red bold serif heading with a soft
   white outline/shadow; black subtitle.
3. PHOTOS: the three photos drop from the sky one after another, each
   landing with a small bounce and a camera-shutter sound. Final layout:
   center photo on top, left and right photos tilted and overlapping
   behind it (see view-3).
4. MUSIC + CONFETTI: the soundtrack starts (loop forever, fade in over ~2s)
   and confetti falls continuously across the whole page (see view-4).
5. BALLOONS: red SVG balloons float in from the top and drift around with
   gentle sway (see view-5). Keep about 6-8 on mobile.
6. RELOAD BUTTON: a small, tasteful "Replay" button fixed at the bottom.
   It resets the state, stops the music, clears confetti and balloons, and
   replays the whole sequence from step 1 without a hard page reload.

## Performance rules

- Animate only transform and opacity. Use requestAnimationFrame for confetti.
- Cap confetti at ~80 particles on mobile, scale up slightly on desktop.
- Pause animations and music when the tab is hidden.
- Respect prefers-reduced-motion with a calmer version (fewer particles).
- Preload only what's needed. Use loading="eager" and explicit
  width/height on the photos to avoid layout shift.
- Use a system serif font stack or one subsetted font. No heavy web fonts.
- Fully responsive. Design for ~390px wide first, then scale up gracefully.

## Configuration

The Google Form & Google Sheet CSV configuration block lives at the very top of [`script.js`](file:///c:/Users/Abiodun/Desktop/birthday-site/script.js#L1-L6):

```javascript
const CONFIG = {
  FORM_URL: "https://docs.google.com/forms/d/e/1FAIpQLSfm-AXMSEtLmFb0CFwkSK8PC6xc2uHRBPumOTMDPB-w2NPKQg/formResponse",
  ENTRY_NAME: "entry.1909405241",
  ENTRY_MESSAGE: "entry.454516565",
  SHEET_CSV_URL: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQYtblVzJasxOOWU0N5wVrUjtB0eXmbjkIt8l4jAZ9i_86N78V_l33vTCYYU9-ea485sB1gTaJKAr7X/pub?gid=1356376876&single=true&output=csv"
};
```

## Deliverable

index.html, style.css, script.js in the project root, plus a short note on
how to deploy (Netlify drag-and-drop folder is fine). Test the full sequence
in the browser preview, including the Replay button, and tell me anything