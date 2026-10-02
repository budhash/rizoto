const $ = id => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');
const state = { image: null, width: 630, height: 810, zoom: 1, x: 0, y: 0, name: 'photo' };
// Physical print sizes converted to pixels at 300 pixels/inch.
// These are dimension references, not a guarantee of passport acceptance.
const passportPresets = {
  us: { width: 600, height: 600, printSize: '2 × 2 in', source: 'https://travel.state.gov/en/passports/apply/help/photos.html' },
  uk: { width: 413, height: 531, printSize: '35 × 45 mm', source: 'https://www.gov.uk/photos-for-passports/photo-requirements' },
  ca: { width: 591, height: 827, printSize: '50 × 70 mm', source: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html' }
};
let noticeTimer;
function notice(message) {
  $('status').textContent = message;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { $('status').textContent = ''; }, 4500);
}
function scale() { return RizotoCrop.coverScale(state.image.naturalWidth, state.image.naturalHeight, state.width, state.height, state.zoom); }
function clampPosition() {
  if (!state.image) return;
  const s = scale();
  Object.assign(state, RizotoCrop.clamp(state.image.naturalWidth, state.image.naturalHeight, state.width, state.height, s, state.x, state.y));
}
function center() {
  if (!state.image) return;
  const s = scale();
  Object.assign(state, RizotoCrop.centered(state.image.naturalWidth, state.image.naturalHeight, state.width, state.height, s));
  render();
}
function render() {
  const rect = $('crop-frame').getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(rect.width * dpr));
  canvas.height = Math.max(1, Math.round(rect.height * dpr));
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (state.image) {
    clampPosition();
    ctx.setTransform(canvas.width / state.width, 0, 0, canvas.height / state.height, 0, 0);
    const s = scale();
    ctx.drawImage(state.image, state.x, state.y, state.image.naturalWidth * s, state.image.naturalHeight * s);
    ctx.resetTransform();
  }
}
function layout() {
  const stage = $('stage');
  const styles = getComputedStyle(stage);
  const availableWidth = stage.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
  const availableHeight = stage.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
  const factor = Math.min(availableWidth / state.width, availableHeight / state.height);
  $('crop-frame').style.width = `${Math.max(1, state.width * factor)}px`;
  $('crop-frame').style.height = `${Math.max(1, state.height * factor)}px`;
  render();
}
function updateDimensions() {
  const width = Number($('width').value), height = Number($('height').value);
  const valid = RizotoCrop.validDimensions(width, height);
  const passportId = valid && Object.keys(passportPresets).find(id => passportPresets[id].width === width && passportPresets[id].height === height);
  $('passport-size').value = passportId || '';
  $('passport-note').hidden = !passportId;
  if (passportId) {
    const preset = passportPresets[passportId];
    $('passport-details').textContent = `${preset.printSize} at 300 px/in. Set this size when printing. Dimensions only; editing rules also apply.`;
    $('passport-source').href = preset.source;
  }
  ['width', 'height'].forEach(id => $(id).setAttribute('aria-invalid', String(!valid)));
  $('dimensions-error').hidden = valid;
  if (!valid) {
    $('download').disabled = true;
    $('dimensions-error').textContent = 'Enter whole numbers from 1–8192 px, up to 32 megapixels total.';
    $('export-info').textContent = 'Use 1–8192 px per side, up to 32 megapixels.';
    return;
  }
  state.width = width; state.height = height;
  state.zoom = 1; $('zoom').value = 1; $('zoom-value').textContent = '100%';
  $('preview-size').innerHTML = `${width} <span>×</span> ${height} <small>PX</small>`;
  $('export-info').textContent = `${width} × ${height} px · Full-resolution export`;
  $('download').disabled = !state.image;
  document.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === `${width},${height}`));
  center(); layout();
}
let uploadId = 0;
async function loadPhoto(file) {
  if (!file) return;
  if (!file.type.startsWith('image/')) { notice('Please choose an image file.'); return; }
  const id = ++uploadId;
  const url = URL.createObjectURL(file);
  const img = new Image();
  try {
    img.src = url;
    await img.decode();
    if (id !== uploadId) return;
    state.image = img; state.name = file.name.replace(/\.[^.]+$/, ''); state.zoom = 1;
    $('upload-title').textContent = file.name;
    $('upload-description').textContent = 'Click or drop to replace photo';
    $('photo-info').hidden = false;
    $('photo-info').textContent = `${img.naturalWidth} × ${img.naturalHeight} px · Original photo`;
    $('empty-state').hidden = true;
    ['zoom', 'center', 'reset'].forEach(id => $(id).disabled = false);
    $('preview-tip').textContent = 'Drag to reposition · Scroll to zoom';
    updateDimensions();
  } catch { notice('This image could not be opened. Try a JPG, PNG, or WebP file.'); }
  finally { URL.revokeObjectURL(url); }
}
$('file').addEventListener('change', e => { loadPhoto(e.target.files[0]); e.target.value = ''; });
$('choose-photo').addEventListener('click', () => $('file').click());
const zone = $('upload-zone');
zone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
['dragenter', 'dragover'].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.add('dragover'); }));
['dragleave', 'drop'].forEach(type => zone.addEventListener(type, e => { e.preventDefault(); zone.classList.remove('dragover'); }));
zone.addEventListener('drop', e => loadPhoto(e.dataTransfer.files[0]));
// Prevent the browser from navigating away when a file is dropped outside the upload area.
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('drop', e => e.preventDefault());
['width', 'height'].forEach(id => $(id).addEventListener('input', updateDimensions));
$('swap').addEventListener('click', () => { const w = $('width').value; $('width').value = $('height').value; $('height').value = w; updateDimensions(); });
document.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => { const [w, h] = b.dataset.size.split(','); $('width').value = w; $('height').value = h; updateDimensions(); }));
$('passport-size').addEventListener('change', e => {
  const preset = passportPresets[e.target.value];
  if (!preset) return;
  $('width').value = preset.width; $('height').value = preset.height;
  updateDimensions();
});
function setZoom(value) {
  if (!state.image) return;
  const oldScale = scale();
  state.zoom = Math.max(1, Math.min(4, value));
  const newScale = scale();
  Object.assign(state, RizotoCrop.zoomPosition(state.width, state.height, state.x, state.y, oldScale, newScale));
  $('zoom').value = state.zoom; $('zoom-value').textContent = `${Math.round(state.zoom * 100)}%`;
  render();
}
$('zoom').addEventListener('input', e => setZoom(Number(e.target.value)));
$('center').addEventListener('click', center);
$('reset').addEventListener('click', () => { setZoom(1); center(); });
$('grid-toggle').addEventListener('change', e => { $('grid').hidden = !e.target.checked; });
let drag = null;
canvas.addEventListener('pointerdown', e => {
  if (!state.image) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: state.x, startY: state.y };
  canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging'); canvas.focus();
});
canvas.addEventListener('pointermove', e => {
  if (!drag || drag.id !== e.pointerId) return;
  const rect = canvas.getBoundingClientRect();
  state.x = drag.startX + (e.clientX - drag.x) * state.width / rect.width;
  state.y = drag.startY + (e.clientY - drag.y) * state.height / rect.height;
  render();
});
['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, () => { drag = null; canvas.classList.remove('dragging'); }));
canvas.addEventListener('wheel', e => { if (!state.image) return; e.preventDefault(); setZoom(state.zoom * Math.exp(-e.deltaY * 0.001)); }, { passive: false });
canvas.addEventListener('keydown', e => {
  if (!state.image || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault(); const amount = (e.shiftKey ? 10 : 1) * state.width / canvas.clientWidth;
  if (e.key === 'ArrowLeft') state.x -= amount;
  if (e.key === 'ArrowRight') state.x += amount;
  if (e.key === 'ArrowUp') state.y -= amount;
  if (e.key === 'ArrowDown') state.y += amount;
  render();
});
$('download').addEventListener('click', () => {
  if (!state.image || $('download').disabled) return;
  const output = document.createElement('canvas'); output.width = state.width; output.height = state.height;
  const snapshot = { width: state.width, height: state.height, name: state.name };
  const context = output.getContext('2d'); const type = $('format').value;
  if (type === 'image/jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, output.width, output.height); }
  const s = scale(); context.drawImage(state.image, state.x, state.y, state.image.naturalWidth * s, state.image.naturalHeight * s);
  output.toBlob(blob => {
    if (!blob) { notice('The photo could not be exported. Try smaller dimensions.'); return; }
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[blob.type] || 'png';
    link.href = url; link.download = `${snapshot.name}-${snapshot.width}x${snapshot.height}.${ext}`;
    link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notice(`Downloaded ${snapshot.width} × ${snapshot.height} photo.`);
  }, type, 0.95);
});
new ResizeObserver(layout).observe($('stage'));
layout();
const about = $('about');
$('about-open').addEventListener('click', () => about.showModal());
$('about-close').addEventListener('click', () => about.close());
about.addEventListener('click', e => { if (e.target === about && (e.clientX < about.getBoundingClientRect().left || e.clientX > about.getBoundingClientRect().right || e.clientY < about.getBoundingClientRect().top || e.clientY > about.getBoundingClientRect().bottom)) about.close(); });
