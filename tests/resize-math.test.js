const { test } = require('node:test');
const assert = require('node:assert/strict');
const { toPixels, fromPixels, validResolution, proportional, resolutionForSize } = require('../resize-math');

test('physical units convert to pixels at the requested resolution', () => {
  assert.equal(toPixels(2, 'in', 300), 600);
  assert.equal(toPixels(2.54, 'cm', 300), 300);
  assert.equal(toPixels(35, 'mm', 300), 413);
  assert.equal(toPixels(45, 'mm', 300), 531);
  assert.equal(fromPixels(600, 'in', 300), 2);
  assert.equal(fromPixels(300, 'cm', 300), 2.54);
});
test('pixel dimensions are independent of print resolution', () => {
  assert.equal(toPixels(630, 'px', 72), 630);
  assert.equal(toPixels(630, 'px', 300), 630);
  assert.equal(toPixels(630.5, 'px', 300), 630.5); // Validation must reject fractional pixels.
});
test('proportional edits use the source ratio and the edited axis', () => {
  assert.deepEqual(proportional(900, 800, 1.5, 'width'), { width: 900, height: 600 });
  assert.deepEqual(proportional(1200, 200, 1.5, 'height'), { width: 300, height: 200 });
});
test('print-size-only changes derive resolution without creating new pixels', () => {
  assert.equal(resolutionForSize(1200, 4, 'in'), 300);
  assert.equal(resolutionForSize(1200, 10.16, 'cm'), 300);
});
test('resolution rejects nonfinite, fractional, zero, and excessive values', () => {
  for (const ppi of [1, 72, 144, 300, 2400]) assert.equal(validResolution(ppi), true);
  for (const ppi of [0, -1, 300.5, 2401, NaN, Infinity]) assert.equal(validResolution(ppi), false);
});
