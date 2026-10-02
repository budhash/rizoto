const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validDimensions, coverScale, centered, clamp, zoomPosition } = require('../crop-math');

test('600×600 photo fills a 630×810 frame without stretching', () => {
  const scale = coverScale(600, 600, 630, 810);
  assert.equal(scale, 1.35);
  assert.deepEqual(centered(600, 600, 630, 810, scale), { x: -90, y: 0 });
  assert.equal(600 * scale, 810);
});
test('landscape output crops top and bottom instead', () => {
  const scale = coverScale(600, 600, 810, 630);
  assert.deepEqual(centered(600, 600, 810, 630, scale), { x: 0, y: -90 });
});
test('dragging cannot uncover the output frame', () => {
  assert.deepEqual(clamp(600, 600, 630, 810, 2.7, 9999, -9999), { x: 0, y: -810 });
  assert.deepEqual(clamp(600, 600, 630, 810, 1.35, -9999, 9999), { x: -180, y: 0 });
});
test('zoom preserves the source point at the center of the composition', () => {
  const position = zoomPosition(630, 810, -90, 0, 1.35, 2.7);
  assert.deepEqual(position, { x: -495, y: -405 });
  assert.equal((315 - position.x) / 2.7, (315 + 90) / 1.35);
  assert.equal((405 - position.y) / 2.7, 405 / 1.35);
});
test('pixel dimensions require valid integers within browser-safe limits', () => {
  for (const [w, h] of [[1, 1], [630, 810], [8192, 1], [4000, 8000]]) assert.equal(validDimensions(w, h), true);
  for (const [w, h] of [[0, 810], [630.5, 810], [NaN, 810], [Infinity, 810], [8193, 1], [8192, 8192], [-1, 810]]) assert.equal(validDimensions(w, h), false);
});
test('varied image and output shapes always cover every edge', () => {
  for (const [iw, ih] of [[600, 600], [4032, 3024], [3024, 4032], [1, 100], [100, 1]]) {
    for (const [w, h] of [[630, 810], [1080, 1920], [1920, 1080], [1, 8192]]) {
      for (const zoom of [1, 1.7, 4]) {
        const scale = coverScale(iw, ih, w, h, zoom);
        const pos = clamp(iw, ih, w, h, scale, -100000, 100000);
        assert.ok(pos.x <= 0 && pos.y <= 0);
        assert.ok(pos.x + iw * scale >= w - 1e-8);
        assert.ok(pos.y + ih * scale >= h - 1e-8);
      }
    }
  }
});
