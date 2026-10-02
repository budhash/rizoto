const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Exercise the browser controller with a minimal DOM and canvas test double.
// The blob callback stays pending so edits during encoding can be tested.
function appHarness() {
  const elements = new Map();
  const created = [];
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
  elements.get('stage').clientWidth = 700; elements.get('stage').clientHeight = 550;
  const context = vm.createContext({
    setTimeout() {}, clearTimeout() {},
    RizotoCrop: require('../crop-math'),
    getComputedStyle() { return { paddingLeft: '20', paddingRight: '20', paddingTop: '20', paddingBottom: '20' }; },
    ResizeObserver: class { observe() {} },
    URL: { createObjectURL() { return 'blob:local'; }, revokeObjectURL() {} },
    Image: class { constructor() { this.naturalWidth = 600; this.naturalHeight = 600; } async decode() {} },
    window: { devicePixelRatio: 1, addEventListener() {} },
    document: {
      getElementById(id) { return elements.get(id); }, querySelectorAll() { return []; },
      createElement(tag) { const el = element(); el.tag = tag; created.push(el); return el; }
    }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8'), context);
  return { elements, created, context };
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
  output.encode();
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

test('passport choices produce the correct country-specific output dimensions', async () => {
  const { elements, created, context } = appHarness();
  await vm.runInContext("loadPhoto({type:'image/png',name:'portrait.png'})", context);
  for (const [id, width, height] of [['us', 600, 600], ['uk', 413, 531], ['ca', 591, 827]]) {
    elements.get('passport-size').value = id;
    elements.get('passport-size').handlers.change({ target: elements.get('passport-size') });
    assert.equal(Number(elements.get('width').value), width);
    assert.equal(Number(elements.get('height').value), height);
    assert.equal(elements.get('passport-note').hidden, false);
    elements.get('download').handlers.click();
    const output = created.filter(el => el.tag === 'canvas').at(-1);
    assert.equal(output.width, width); assert.equal(output.height, height);
  }
});

test('manual changes clear a passport selection when its size no longer matches', () => {
  const { elements } = appHarness();
  elements.get('passport-size').value = 'uk';
  elements.get('passport-size').handlers.change({ target: elements.get('passport-size') });
  elements.get('width').value = '500'; elements.get('width').handlers.input();
  assert.equal(elements.get('passport-size').value, '');
  assert.equal(elements.get('passport-note').hidden, true);
});
