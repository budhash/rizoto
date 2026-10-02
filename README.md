# rizoto

**Resize + photo.** A private, browser-based photo resizer and cropper at **https://budhash.com/rizoto/**.

Choose a photo, enter any output dimensions (default: 630 × 810), and drag or zoom to compose the crop. Download an exact-size PNG, JPG, or WebP. Image processing stays in your browser.

## Run locally

Open `index.html` directly, or serve the directory with any static web server. No backend, dependencies, or build step is required. Python is an optional local preview tool, not part of deployment:

```sh
python3 -m http.server 8000
```

Then visit http://localhost:8000. Arrow keys move the photo; hold Shift for larger steps. The crop always covers the frame, preserving the photo's proportions without empty edges. Output sizes support 1–8192 pixels per side, with a 32-megapixel total limit. Small source photos can be enlarged, though enlarging cannot add detail. JPG exports use white behind transparent areas.

## Resize and print controls

Choose **Crop to fit** to fill a target frame while preserving the photo’s proportions, or **Resize whole photo** to retain the complete image. In resize mode, **Scale proportionally** links dimensions using the original photo’s aspect ratio. Turning it off allows independent width/height changes and can stretch the image.

Sizes can be entered in pixels, inches, centimeters, or millimeters. Physical dimensions are converted to whole output pixels using the selected 1–2400 pixels/inch resolution. Changing the displayed unit preserves the current output pixels. PNG and JPG exports store the chosen print resolution (PNG pHYs / JPEG JFIF); WebP exports remain pixel-based.

With **Resample image** off, output pixel dimensions remain equal to the original image. Changes to resolution or physical size affect print size only. Print-only mode uses PNG/JPG; choosing it from pixel units switches the controls to inches. Saving still encodes the image, so this is not a byte-for-byte copy of the source file.

## Mobile

Below 640px, the editor uses stacked panels with no nested adjustment-panel scrolling. Photo positioning uses pointer events for touch dragging; zoom has a touch-sized slider. Form controls use 16px text and 44px targets to reduce iPhone focus zoom and make inputs easier to tap. Mobile visual/device testing is manual; a physical-phone compatibility check has not been performed in this release.

## Passport size presets

The final preset dropdown offers print-dimension references:

| Preset | Physical print size | Output pixels at 300 pixels/inch |
| --- | --- | --- |
| [US](https://travel.state.gov/en/passports/apply/help/photos.html) | 2 × 2 inches | 600 × 600 |
| [UK](https://www.gov.uk/photos-for-passports/photo-requirements) | 35 × 45 mm | 413 × 531 |
| [Canada](https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html) | 50 × 70 mm | 591 × 827 |

Set the listed physical size in your printing software: pixel dimensions alone do not fix the printed size. These presets set dimensions only, not passport eligibility. Official rules also govern editing, head size, background, capture, and printing; the selected preset links to its authority’s requirements. These are not online-upload presets.

## Validation

Node.js is used only for development checks; no dependency installation is required:

```sh
npm test
npm run check
```

## Design

`theme.css` is vendored from the canonical budhash.com theme. Keep it in sync with `../budhash/theme.css`. Page layout and cropper-specific styles live in `style.css`. Shared colors, system fonts, display headings, labels, panels, and pills use the same design tokens as the other tools. The shell follows gomanize’s 1720px/94vw container and compact header, with a GitHub icon at the upper right. The desktop workspace fills available viewport space and grows with its controls on shorter screens, using page scrolling so settings stay visible. The empty-state prompt is centered in the preview stage independently of the crop aspect ratio. Select controls use a shared arrow instead of platform-specific decoration. Mobile uses stacked panels.

## Deployment

This folder is the independent **`budhash/rizoto`** repository. GitHub Pages serves static files from `main` at `/` (root). Use a feature branch and PR for updates.

The `budhash/budhash.github.io` portfolio owns the `budhash.com` custom domain, so project Pages are served at `https://budhash.com/rizoto/`. Do not set a separate custom domain or add a `CNAME` here. The portfolio repository contains only rizoto's card and sitemap entry.

The repository and deployed website are public. Photos are never uploaded. There are no external fonts, analytics, tracking scripts, or runtime dependencies.

## Search and sharing

The page includes a descriptive title and meta description, an HTTPS canonical URL, visible HTML describing the tool, WebApplication JSON-LD, and Open Graph / Twitter metadata with a local 1200 × 630 preview image. JavaScript loads with `defer`; the page’s descriptive content is available without executing it.

The central `https://budhash.com/robots.txt` allows crawling and points to `https://budhash.com/sitemap.xml`, which includes the canonical rizoto URL. A `robots.txt` inside this project path would not control domain crawling. Search Console indexing requests or sitemap submissions require the site owner’s Search Console access. These technical foundations do not guarantee indexing, rankings, or rich results.

CSS and script URLs contain content hashes so browsers fetch the matching assets after an update. After editing these files, run `npm run version:assets`; `npm run check` verifies that the URLs are current. This is a development helper only; the deployed app still needs no backend or build step.
