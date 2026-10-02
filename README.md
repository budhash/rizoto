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

## Custom size presets

Square, Story, Landscape, and Custom share one preset row. Custom offers 2 × 2 inches (600 × 600 pixels), 35 × 45 mm (413 × 531), and 50 × 70 mm (591 × 827), each at 300 pixels/inch. Width and height also accept arbitrary values. On very narrow screens the preset row scrolls horizontally rather than wrapping.

## Validation

Node.js is used only for development checks; no dependency installation is required:

```sh
npm test
npm run check
```

## Design

`theme.css` is vendored from the canonical budhash.com theme. Keep it in sync with `../budhash/theme.css`. Page layout and cropper-specific styles live in `style.css`. Shared colors, system fonts, display headings, labels, panels, and pills use the same design tokens as the other tools. The shell follows gomanize’s 1720px/94vw container and compact header, with a GitHub icon at the upper right. The desktop workspace fills available viewport space and grows with its controls on shorter screens, using page scrolling so settings stay visible. The empty-state prompt is centered in the preview stage independently of the crop aspect ratio. Select controls use a shared arrow instead of platform-specific decoration. Mobile uses stacked panels.

## WebMCP (experimental)

In browsers that expose `document.modelContext.registerTool`, rizoto registers four tools automatically. Other browsers continue to use the normal editor without loading a polyfill or making extra network requests.

| Tool | Action |
| --- | --- |
| `rizoto_get_state` | Read source dimensions, committed output settings, crop position, and export readiness. |
| `rizoto_set_output` | Set pixel or physical dimensions, crop/resize mode, proportions, and print resolution; refresh the visible controls and preview. |
| `rizoto_set_crop` | Set zoom (1–4) and horizontal/vertical crop position (0–1). |
| `rizoto_prepare_export` | Choose PNG, JPG, or WebP and report readiness; the user reviews and clicks Download photo. |

Choose a photo first. Tools return metadata only, never image bytes, filenames, file paths, or download URLs. Invalid requests are rejected before changing settings. Output changes enable resampling; proportional resize derives height from width. Crop coordinates use 0 for the left/top edge, 1 for right/bottom, and 0.5 for center. No tool selects local files or downloads automatically.

To try it, use a Chrome version with WebMCP support, enable `chrome://flags/#enable-webmcp-testing`, relaunch, and visit rizoto. Use Chrome's [Model Context Tool Inspector](https://developer.chrome.com/docs/ai/webmcp#imitate-agent-chat-with-the-inspector-extension) to discover and invoke the tools. For example, after choosing a photo, request “Crop this to 630 × 810 pixels, zoom to 1.2, center it, and prepare a PNG.” The browser/agent handles the conversation; rizoto contains no model or API key.

WebMCP is currently experimental. No origin-trial token is installed. [Chrome documentation](https://developer.chrome.com/docs/ai/webmcp) and the [current imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api) describe availability and inspector setup. Tool behavior is covered by runtime/controller tests and browser checks with a registration shim; native WebMCP/agent testing remains manual.

## Deployment

This folder is the independent **`budhash/rizoto`** repository. GitHub Pages serves static files from `main` at `/` (root). Use a feature branch and PR for updates.

The `budhash/budhash.github.io` portfolio owns the `budhash.com` custom domain, so project Pages are served at `https://budhash.com/rizoto/`. Do not set a separate custom domain or add a `CNAME` here. The portfolio repository contains only rizoto's card and sitemap entry.

The repository and deployed website are public. Photos are never uploaded. There are no external fonts, analytics, tracking scripts, or runtime dependencies.

## Search and sharing

The page includes a descriptive title and meta description, an HTTPS canonical URL, visible HTML describing the tool, WebApplication JSON-LD, and Open Graph / Twitter metadata with a local 1200 × 630 preview image. JavaScript loads with `defer`; the page’s descriptive content is available without executing it.

The central `https://budhash.com/robots.txt` allows crawling and points to `https://budhash.com/sitemap.xml`, which includes the canonical rizoto URL. A `robots.txt` inside this project path would not control domain crawling. Search Console indexing requests or sitemap submissions require the site owner’s Search Console access. These technical foundations do not guarantee indexing, rankings, or rich results.

CSS and script URLs contain content hashes so browsers fetch the matching assets after an update. After editing these files, run `npm run version:assets`; `npm run check` verifies that the URLs are current. This is a development helper only; the deployed app still needs no backend or build step.
