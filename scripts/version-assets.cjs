const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const htmlPath = path.join(root, 'index.html');
const html = fs.readFileSync(htmlPath, 'utf8');
// Content hashes change URLs only when an asset changes, bypassing stale caches.
const updated = html.replace(/(href|src)="([\w-]+\.(?:css|js))(?:\?v=[\w.-]+)?"/g, (_, attribute, asset) => {
  const hash = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, asset))).digest('hex').slice(0, 12);
  return `${attribute}="${asset}?v=${hash}"`;
});
if (process.argv.includes('--check')) {
  if (updated !== html) {
    console.error('Asset versions are stale. Run npm run version:assets before publishing.');
    process.exitCode = 1;
  }
} else {
  fs.writeFileSync(htmlPath, updated);
}
