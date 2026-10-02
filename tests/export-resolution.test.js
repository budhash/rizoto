const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { writeResolution, withResolution } = require('../export-resolution');
const png = fs.readFileSync(path.join(__dirname, 'fixtures/resolution-source.png'));
const jpg = fs.readFileSync(path.join(__dirname, 'fixtures/resolution-source.jpg'));
function chunks(bytes) {
  const buffer = Buffer.from(bytes), result = [];
  for (let pos = 8; pos + 12 <= buffer.length;) {
    const length = buffer.readUInt32BE(pos), type = buffer.toString('ascii', pos + 4, pos + 8);
    result.push({ type, data: buffer.subarray(pos + 8, pos + 8 + length), crc: buffer.readUInt32BE(pos + 8 + length) });
    pos += 12 + length;
  }
  return result;
}

test('PNG contains one valid 300 PPI physical-density chunk and unchanged pixel data', () => {
  const output = writeResolution(png, 'image/png', 300);
  const updated = chunks(output), density = updated.filter(c => c.type === 'pHYs');
  assert.equal(density.length, 1);
  assert.equal(density[0].data.readUInt32BE(0), 11811);
  assert.equal(density[0].data.readUInt32BE(4), 11811);
  assert.equal(density[0].data[8], 1);
  assert.equal(density[0].crc, 0x78a53f76);
  assert.deepEqual(updated.filter(c => c.type !== 'pHYs'), chunks(png).filter(c => c.type !== 'pHYs'));
  assert.equal(chunks(writeResolution(output, 'image/png', 144)).filter(c => c.type === 'pHYs').length, 1);
});
test('JPEG updates JFIF resolution while leaving all other encoded bytes untouched', () => {
  const output = Buffer.from(writeResolution(jpg, 'image/jpeg', 300));
  assert.equal(output[13], 1);
  assert.equal(output.readUInt16BE(14), 300); assert.equal(output.readUInt16BE(16), 300);
  assert.deepEqual(output.subarray(0, 13), jpg.subarray(0, 13));
  assert.deepEqual(output.subarray(18), jpg.subarray(18));
});
test('JPEG without an existing JFIF header gains a density header', () => {
  const withoutHeader = Buffer.concat([jpg.subarray(0, 2), jpg.subarray(20)]);
  const output = Buffer.from(writeResolution(withoutHeader, 'image/jpeg', 144));
  assert.equal(output.toString('ascii', 6, 11), 'JFIF\0');
  assert.equal(output.readUInt16BE(14), 144);
  assert.deepEqual(output.subarray(20), withoutHeader.subarray(2));
});
test('blob metadata export keeps the format and unsupported WebP blobs unchanged', async () => {
  const result = await withResolution(new Blob([png], { type: 'image/png' }), 300);
  assert.equal(result.type, 'image/png');
  assert.equal(chunks(await result.arrayBuffer()).find(c => c.type === 'pHYs').data.readUInt32BE(0), 11811);
  const webp = new Blob(['webp'], { type: 'image/webp' });
  assert.equal(await withResolution(webp, 300), webp);
});
test('invalid densities and malformed files fail instead of corrupting an export', () => {
  assert.throws(() => writeResolution(png, 'image/png', 0));
  assert.throws(() => writeResolution(new Uint8Array(20), 'image/png', 300));
  assert.throws(() => writeResolution(new Uint8Array(20), 'image/jpeg', 300));
  assert.throws(() => writeResolution(png.subarray(0, 30), 'image/png', 300));
});
