const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the browser controller with a minimal DOM and canvas test double.
// The blob callback stays pending so edits during encoding can be tested.
function appHarness(imageWidth = 600, imageHeight = 600) {
  const elements = new Map();
  const created = [];
  const densities = [];
  function element() {
    const el = {
      value: '', style: {}, handlers: {}, disabled: false,
      clientWidth: 330, clientHeight: 424,
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener(type, fn) { this.handlers[type] = fn; },
      setAttribute() {},
      getBoundingClientRect() { return { width: 330, height: 424 }; },
      getContext() {
        return { clearRect() {}, setTransform() {}, resetTransform() {}, fillRect() {}, drawImage(...args) { el.draw = args; } };
      },
      click() { this.clicked = true; },
      toBlob(callback, type) { this.encode = () => callback({ type }); }
    };
    return el;
  }
  const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  for (const match of html.matchAll(/id="([^"]+)"/g)) elements.set(match[1], element());
  elements.get('width').value = '630'; elements.get('height').value = '810'; elements.get('format').value = 'image/png';
  elements.get('resolution').value = '300';
  elements.get('proportional').checked = true; elements.get('resample').checked = true;
  elements.get('stage').clientWidth = 700; elements.get('stage').clientHeight = 550;
  const context = vm.createContext({
    setTimeout() {}, clearTimeout() {},
    RizotoCrop: require('../crop-math'),
    RizotoSize: require('../resize-math'),
    RizotoDensity: { async withResolution(blob, ppi) { densities.push(ppi); return blob; } },
    getComputedStyle() { return { paddingLeft: '20', paddingRight: '20', paddingTop: '20', paddingBottom: '20' }; },
    ResizeObserver: class { observe() {} },
    URL: { createObjectURL() { return 'blob:local'; }, revokeObjectURL() {} },
    Image: class { constructor() { this.naturalWidth = imageWidth; this.naturalHeight = imageHeight; } async decode() {} },
    window: { devicePixelRatio: 1, addEventListener() {} },
    document: {
      getElementById(id) { return elements.get(id); }, querySelectorAll() { return []; },
      createElement(tag) { const el = element(); el.tag = tag; created.push(el); return el; }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
  return { elements, created, context, densities };
}

test('export canvas is exact size; filename stays correct if size changes during encoding', async () => {
  const { elements, created, context } = appHarness();
  await vm.runInContext("loadPhoto({type:'image/png',name:'portrait.png'})", context);
  assert.equal(elements.get('download').disabled, false);
  elements.get('download').handlers.click();
  const output = created.find(el => el.tag === 'canvas');
  assert.equal(output.width, 630); assert.equal(output.height, 810);
  assert.deepEqual(output.draw.slice(1), [-90, 0, 810, 810]);
  elements.get('width').value = '1080'; elements.get('height').value = '1080';
  elements.get('width').handlers.input();
  await output.encode();
  const link = created.find(el => el.tag === 'a');
  assert.equal(link.download, 'portrait-630x810.png');
  assert.equal(link.clicked, true);
});

test('invalid dimensions prevent export and show an actionable error', async () => {
  const { elements, created, context } = appHarness();
  await vm.runInContext("loadPhoto({type:'image/png',name:'portrait.png'})", context);
  elements.get('width').value = '0'; elements.get('width').handlers.input();
  assert.equal(elements.get('download').disabled, true);
  assert.equal(elements.get('dimensions-error').hidden, false);
  elements.get('download').handlers.click();
  assert.equal(created.length, 0);
});

test('custom print sizes produce the expected output dimensions', async () => {
  const { elements, created, context } = appHarness();
  await vm.runInContext("loadPhoto({type:'image/png',name:'portrait.png'})", context);
  for (const [id, width, height] of [['inch-square', 600, 600], ['mm-35-45', 413, 531], ['mm-50-70', 591, 827]]) {
    elements.get('size-preset').value = id;
    elements.get('size-preset').handlers.change({ target: elements.get('size-preset') });
    assert.equal(Number(elements.get('width').value), width);
    assert.equal(Number(elements.get('height').value), height);
    elements.get('download').handlers.click();
    const output = created.filter(el => el.tag === 'canvas').at(-1);
    assert.equal(output.width, width); assert.equal(output.height, height);
  }
});

test('manual changes clear a custom-size selection when its size no longer matches', () => {
  const { elements } = appHarness();
  elements.get('size-preset').value = 'mm-35-45';
  elements.get('size-preset').handlers.change({ target: elements.get('size-preset') });
  elements.get('width').value = '500'; elements.get('width').handlers.input();
  assert.equal(elements.get('size-preset').value, '');
});

function change(elements, id, value) {
  const el = elements.get(id);
  if (typeof value === 'boolean') el.checked = value;
  else el.value = String(value);
  el.handlers.change({ target: el });
}

test('whole-photo resize locks the original proportions on either dimension', async () => {
  const { elements, created, context } = appHarness(1200, 800);
  await vm.runInContext("loadPhoto({type:'image/png',name:'landscape.png'})", context);
  change(elements, 'operation', 'resize');
  elements.get('width').value = '900'; elements.get('width').handlers.input();
  assert.equal(Number(elements.get('height').value), 600);
  elements.get('height').value = '200'; elements.get('height').handlers.input();
  assert.equal(Number(elements.get('width').value), 300);
  elements.get('download').handlers.click();
  const output = created.find(el => el.tag === 'canvas');
  assert.deepEqual(output.draw.slice(1), [0, 0, 300, 200]);
  assert.equal(elements.get('crop-controls').hidden, true);
});

test('unlocked resizing includes the whole photo in independently chosen dimensions', async () => {
  const { elements, created, context } = appHarness(1200, 800);
  await vm.runInContext("loadPhoto({type:'image/png',name:'landscape.png'})", context);
  change(elements, 'operation', 'resize'); change(elements, 'proportional', false);
  elements.get('width').value = '630'; elements.get('height').value = '810'; elements.get('width').handlers.input();
  elements.get('download').handlers.click();
  assert.deepEqual(created.find(el => el.tag === 'canvas').draw.slice(1), [0, 0, 630, 810]);
});

test('print units and resolution determine output pixels when resampling is enabled', async () => {
  const { elements, created, context } = appHarness();
  await vm.runInContext("loadPhoto({type:'image/png',name:'portrait.png'})", context);
  change(elements, 'size-unit', 'in');
  elements.get('width').value = '2'; elements.get('height').value = '3'; elements.get('width').handlers.input();
  elements.get('resolution').value = '150'; elements.get('resolution').handlers.input();
  elements.get('download').handlers.click();
  const output = created.find(el => el.tag === 'canvas');
  assert.equal(output.width, 300); assert.equal(output.height, 450);
});

test('changing display units never changes pixel dimensions, even at high resolution', async () => {
  const { elements, created, context } = appHarness();
  await vm.runInContext("loadPhoto({type:'image/png',name:'portrait.png'})", context);
  elements.get('resolution').value = '2400'; elements.get('resolution').handlers.input();
  for (const unit of ['in', 'cm', 'mm', 'px']) change(elements, 'size-unit', unit);
  elements.get('download').handlers.click();
  const output = created.find(el => el.tag === 'canvas');
  assert.equal(output.width, 630); assert.equal(output.height, 810);
});

test('without resampling, print-size edits change resolution while retaining original pixels', async () => {
  const { elements, created, context } = appHarness(1200, 800);
  await vm.runInContext("loadPhoto({type:'image/png',name:'landscape.png'})", context);
  change(elements, 'operation', 'resize'); change(elements, 'resample', false);
  assert.equal(elements.get('size-unit').value, 'in');
  elements.get('resolution').value = '150'; elements.get('resolution').handlers.input();
  assert.equal(Number(elements.get('width').value), 8);
  elements.get('width').value = '4'; elements.get('width').handlers.input();
  assert.equal(Number(elements.get('resolution').value), 300);
  elements.get('download').handlers.click();
  const output = created.find(el => el.tag === 'canvas');
  assert.equal(output.width, 1200); assert.equal(output.height, 800);
  assert.deepEqual(output.draw.slice(1), [0, 0, 1200, 800]);
  assert.equal(elements.get('webp-option').disabled, true);
});

test('export retains the resolution chosen at click time while encoding asynchronously', async () => {
  const { elements, created, context, densities } = appHarness();
  await vm.runInContext("loadPhoto({type:'image/png',name:'portrait.png'})", context);
  elements.get('download').handlers.click();
  elements.get('resolution').value = '72'; elements.get('resolution').handlers.input();
  await created.find(el => el.tag === 'canvas').encode();
  assert.deepEqual(densities, [300]);
});

test('invalid resolution prevents exporting a mislabeled image', async () => {
  const { elements, context } = appHarness();
  await vm.runInContext("loadPhoto({type:'image/png',name:'portrait.png'})", context);
  elements.get('resolution').value = '0'; elements.get('resolution').handlers.input();
  assert.equal(elements.get('download').disabled, true);
  assert.match(elements.get('dimensions-error').textContent, /resolution/);
});
