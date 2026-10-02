# Rizoto

**Resize + photo.** A private, browser-based photo resizer and cropper at **https://budhash.com/rizoto/**.

Choose a photo, enter any output dimensions (default: 630 × 810), and drag or zoom to compose the crop. Download an exact-size PNG, JPG, or WebP. Image processing stays in your browser.

## Run locally

Open `index.html` directly, or serve the directory with any static web server. No backend, dependencies, or build step is required. Python is an optional local preview tool, not part of deployment:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000. Arrow keys move the photo; hold Shift for larger steps. The crop always covers the frame, preserving the photo's proportions without empty edges. Output sizes support 1–8192 pixels per side, with a 32-megapixel total limit. Small source photos can be enlarged, though enlarging cannot add detail. JPG exports use white behind transparent areas.

## Validation

Node.js is used only for development checks; no dependency installation is required:

```sh
npm test
npm run check
```

## Design

`theme.css` is vendored from the canonical budhash.com theme. Keep it in sync with `../budhash/theme.css`. Page layout and cropper-specific styles live in `style.css`. Shared colors, system fonts, display headings, labels, panels, and pills use the same design tokens as the other tools.

## Deployment

This folder is the independent **`budhash/rizoto`** repository. GitHub Pages serves static files from `main` at `/` (root). Use a feature branch and PR for updates.

The `budhash/budhash.github.io` portfolio owns the `budhash.com` custom domain, so project Pages are served at `https://budhash.com/rizoto/`. Do not set a separate custom domain or add a `CNAME` here. The portfolio repository contains only Rizoto's card, sitemap entry, and a redirect from the former `/frame/` URL.

The repository is private; the deployed website and its browser assets are public. Photos are never uploaded. There are no external fonts, analytics, tracking scripts, or runtime dependencies.
