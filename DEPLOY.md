# How to Deploy

## Netlify drag-and-drop (easiest)

1. Open [netlify.com](https://app.netlify.com/drop) and sign in (free account is fine).
2. Drag the **entire `birthday-site` folder** onto the "Deploy manually" drop zone.
3. Netlify gives you a live URL in seconds (e.g. `https://hungry-muffin-123.netlify.app`).
4. Share the link — done!

> The folder must contain `index.html` at its root alongside `style.css`, `script.js`,
> and the `assets/` folder. The `/reference` folder is not needed in production but
> won't cause any harm if included.

## Any static host

The site is 100% static (no server, no build step). You can also host it on:
- **GitHub Pages** — push the folder to a repo → Settings → Pages → root
- **Vercel** — drag and drop or `vercel deploy`
- **Surge.sh** — `npx surge birthday-site/`

## Local preview

Open `index.html` directly from the filesystem with any modern browser.
Audio autoplay will be blocked on file:// in some browsers;
use a local server if the music doesn't start:

```bash
# Python 3
python -m http.server 8080
# then open http://localhost:8080
```
