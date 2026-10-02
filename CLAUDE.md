# Rizoto

Independent static photo resizer and cropper for budhash.com. Local directory: `rizoto`; GitHub repository: `budhash/rizoto`; production URL: `https://budhash.com/rizoto/`.

- No backend, runtime dependencies, bundler, or build step. Browser entry point: `index.html`.
- `theme.css` is an exact vendored copy of `../budhash/theme.css`. Use its shared tokens and primitives; keep cropper layout in `style.css`.
- Photo data stays in browser memory. Do not introduce upload, analytics, or external-font requests.
- Crop geometry lives in `crop-math.js`; browser controls and canvas export live in `app.js`.
- Validate changes with `npm test` and `npm run check`. No install is needed.
- Work on a feature branch and open a PR, rather than committing directly to `main`.
- GitHub Pages deploys from `main`, repository root. Never add a `CNAME` or project-level custom domain; the portfolio user site owns budhash.com.
- The portfolio repository should contain only the tool card, sitemap entry, and old-URL redirect. Do not copy the app back into it.
