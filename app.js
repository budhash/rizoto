const $ = id => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');
const state = { image: null, width: 630, height: 810, zoom: 1, x: 0, y: 0, name: 'photo', mode: 'crop', unit: 'px', ppi: 300, proportional: true, resample: true };
// Physical print dimensions converted to pixels at 300 pixels/inch.
const sizePresets = {
  'inch-square': { width: 600, height: 600 },
  'mm-35-45': { width: 413, height: 531 },
  'mm-50-70': { width: 591, height: 827 }
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
    ctx.setTransform(canvas.width / state.width, 0, 0, canvas.height / state.height, 0, 0);
    if (state.mode === 'resize') ctx.drawImage(state.image, 0, 0, state.width, state.height);
    else {
      clampPosition();
      const s = scale();
      ctx.drawImage(state.image, state.x, state.y, state.image.naturalWidth * s, state.image.naturalHeight * s);
    }
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
function metadataOnly() { return state.mode === 'resize' && !state.resample; }
function displayLength(pixels) {
  const value = RizotoSize.fromPixels(pixels, state.unit, state.ppi);
  return state.unit === 'px' ? String(value) : String(Number(value.toFixed(3)));
}
function writeDimensionFields() {
  $('width').value = displayLength(state.width); $('height').value = displayLength(state.height);
}
function syncModeUI() {
  const resize = state.mode === 'resize';
  $('crop-controls').hidden = resize; $('resize-controls').hidden = !resize;
  $('operation').value = state.mode; $('size-unit').value = state.unit;
  $('dimension-unit-label').textContent = state.unit.toUpperCase();
  $('proportional').checked = state.proportional; $('resample').checked = state.resample;
  $('proportional').disabled = metadataOnly(); $('resample').disabled = !state.image;
  $('swap').disabled = resize && (state.proportional || metadataOnly());
  ['width', 'height'].forEach(id => {
    $(id).disabled = metadataOnly() && state.unit === 'px';
    $(id).min = state.unit === 'px' ? '1' : '0.001';
    $(id).max = state.unit === 'px' ? '8192' : '';
    $(id).step = state.unit === 'px' ? '1' : '0.001';
  });
  ['zoom', 'center', 'reset'].forEach(id => $(id).disabled = resize || !state.image);
  $('webp-option').disabled = metadataOnly();
  if (metadataOnly() && $('format').value === 'image/webp') $('format').value = 'image/png';
  $('resize-hint').textContent = metadataOnly()
    ? 'Original pixel dimensions stay fixed. Change resolution or print size; PNG or JPG saves the print resolution.'
    : state.proportional ? 'Keep the whole photo and preserve its proportions.' : 'Keep the whole photo. Changing its proportions can stretch it.';
  canvas.classList.toggle('resize-preview', resize);
  $('preview-tip').textContent = !state.image ? 'Your canvas, your composition.'
    : resize ? metadataOnly() ? 'Original pixels · print size only' : 'Whole photo · no cropping' : 'Drag to reposition · Scroll to zoom';
}
function updateDimensions(changed = null) {
  let ppi = Number($('resolution').value);
  let width = RizotoSize.toPixels(Number($('width').value), state.unit, ppi);
  let height = RizotoSize.toPixels(Number($('height').value), state.unit, ppi);
  if (changed === 'unit') { width = state.width; height = state.height; }
  if (metadataOnly() && state.image) {
    width = state.image.naturalWidth; height = state.image.naturalHeight;
    if (['width', 'height'].includes(changed) && state.unit !== 'px') {
      ppi = RizotoSize.resolutionForSize(changed === 'width' ? width : height, Number($(changed).value), state.unit);
    }
  } else if (state.mode === 'resize' && state.proportional && state.image && ['width', 'height', 'proportional', 'operation'].includes(changed)) {
    ({ width, height } = RizotoSize.proportional(width, height, state.image.naturalWidth / state.image.naturalHeight, changed));
  }
  const validPpi = RizotoSize.validResolution(ppi);
  const valid = validPpi && RizotoCrop.validDimensions(width, height);
  const presetId = valid && state.mode === 'crop' && ppi === 300 && Object.keys(sizePresets).find(id => sizePresets[id].width === width && sizePresets[id].height === height);
  $('size-preset').value = presetId || '';
  ['width', 'height'].forEach(id => $(id).setAttribute('aria-invalid', String(!valid)));
  $('resolution').setAttribute('aria-invalid', String(!validPpi));
  $('dimensions-error').hidden = valid;
  if (!valid) {
    $('download').disabled = true;
    $('dimensions-error').textContent = !validPpi ? 'Enter a whole-number resolution from 1–2400 pixels/inch.' : 'Use 1–8192 output pixels per side, up to 32 megapixels. Pixel dimensions must be whole numbers.';
    $('export-info').textContent = 'Check your dimensions and resolution.';
    return;
  }
  const geometryChanged = width !== state.width || height !== state.height;
  state.width = width; state.height = height; state.ppi = ppi;
  if (metadataOnly() || changed === 'unit') { $('resolution').value = ppi; writeDimensionFields(); }
  else if (state.mode === 'resize' && state.proportional && ['width', 'height', 'proportional', 'operation'].includes(changed)) {
    $(changed === 'height' ? 'width' : 'height').value = displayLength(changed === 'height' ? width : height);
  }
  if (geometryChanged) { state.zoom = 1; $('zoom').value = 1; $('zoom-value').textContent = '100%'; center(); }
  $('preview-size').innerHTML = `${width} <span>×</span> ${height} <small>PX</small>`;
  $('export-info').textContent = `${width} × ${height} px${$('format').value === 'image/webp' ? '' : ` · ${ppi} pixels/inch`}`;
  $('size-summary').textContent = `${width} × ${height} px · ${(width / ppi).toFixed(2)} × ${(height / ppi).toFixed(2)} in at ${ppi} pixels/inch`;
  $('download').disabled = !state.image;
  document.querySelectorAll('[data-size]').forEach(b => b.classList.toggle('active', b.dataset.size === `${width},${height}`));
  syncModeUI(); layout();
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
    if (metadataOnly()) { state.width = img.naturalWidth; state.height = img.naturalHeight; writeDimensionFields(); }
    updateDimensions(state.mode === 'resize' ? 'operation' : null);
    center(); syncModeUI();
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
['width', 'height', 'resolution'].forEach(id => $(id).addEventListener('input', () => updateDimensions(id)));
$('size-unit').addEventListener('change', e => {
  state.unit = e.target.value;
  writeDimensionFields(); syncModeUI(); updateDimensions('unit');
});
$('operation').addEventListener('change', e => {
  state.mode = e.target.value; state.resample = true;
  syncModeUI(); updateDimensions('operation');
});
$('proportional').addEventListener('change', e => { state.proportional = e.target.checked; updateDimensions('proportional'); });
$('resample').addEventListener('change', e => {
  state.resample = e.target.checked;
  if (metadataOnly() && state.unit === 'px') state.unit = 'in';
  syncModeUI(); updateDimensions('resample');
});
$('format').addEventListener('change', () => { syncModeUI(); updateDimensions(); });
$('swap').addEventListener('click', () => { const w = $('width').value; $('width').value = $('height').value; $('height').value = w; updateDimensions(); });
function applyPreset(width, height, ppi = state.ppi) {
  state.mode = 'crop'; state.resample = true; state.unit = 'px';
  $('width').value = width; $('height').value = height; $('resolution').value = ppi;
  updateDimensions();
}
document.querySelectorAll('[data-size]').forEach(b => b.addEventListener('click', () => { const [w, h] = b.dataset.size.split(','); applyPreset(w, h); }));
$('size-preset').addEventListener('change', e => {
  const preset = sizePresets[e.target.value];
  if (!preset) return;
  applyPreset(preset.width, preset.height, 300);
});
function setZoom(value) {
  if (!state.image || state.mode !== 'crop') return;
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
  if (!state.image || state.mode !== 'crop') return;
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
canvas.addEventListener('wheel', e => { if (!state.image || state.mode !== 'crop') return; e.preventDefault(); setZoom(state.zoom * Math.exp(-e.deltaY * 0.001)); }, { passive: false });
canvas.addEventListener('keydown', e => {
  if (!state.image || state.mode !== 'crop' || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
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
  const snapshot = { width: state.width, height: state.height, name: state.name, ppi: state.ppi };
  const context = output.getContext('2d'); const type = $('format').value;
  if (type === 'image/jpeg') { context.fillStyle = '#fff'; context.fillRect(0, 0, output.width, output.height); }
  context.imageSmoothingQuality = 'high';
  if (state.mode === 'resize') context.drawImage(state.image, 0, 0, output.width, output.height);
  else { const s = scale(); context.drawImage(state.image, state.x, state.y, state.image.naturalWidth * s, state.image.naturalHeight * s); }
  output.toBlob(async blob => {
    if (!blob) { notice('The photo could not be exported. Try smaller dimensions.'); return; }
    try {
      const resolved = await RizotoDensity.withResolution(blob, snapshot.ppi);
      const url = URL.createObjectURL(resolved); const link = document.createElement('a');
      const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[blob.type] || 'png';
      link.href = url; link.download = `${snapshot.name}-${snapshot.width}x${snapshot.height}.${ext}`;
      link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
      notice(`Downloaded ${snapshot.width} × ${snapshot.height} photo.`);
    } catch { notice('The print resolution could not be saved. Please try again.'); }
  }, type, 0.95);
});
new ResizeObserver(layout).observe($('stage'));
syncModeUI(); layout();
const about = $('about');
$('about-open').addEventListener('click', () => about.showModal());
$('about-close').addEventListener('click', () => about.close());
about.addEventListener('click', e => { if (e.target === about && (e.clientX < about.getBoundingClientRect().left || e.clientX > about.getBoundingClientRect().right || e.clientY < about.getBoundingClientRect().top || e.clientY > about.getBoundingClientRect().bottom)) about.close(); });
