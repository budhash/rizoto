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
  assert.equal(jpg.readUInt16BE(14), 96); // Source bytes are never mutated.
});
test('JPEG without an existing JFIF header gains a density header', () => {
  const withoutHeader = Buffer.concat([jpg.subarray(0, 2), jpg.subarray(20)]);
  const output = Buffer.from(writeResolution(withoutHeader, 'image/jpeg', 144));
  assert.equal(output.toString('ascii', 6, 11), 'JFIF\0');
  assert.equal(output.readUInt16BE(14), 144);
  assert.deepEqual(output.subarray(20), withoutHeader.subarray(2));
});
test('JPEG synchronizes existing EXIF resolution as well as JFIF density', () => {
  const source = fs.readFileSync(path.join(__dirname, 'fixtures/resolution-exif.jpg'));
  const output = Buffer.from(writeResolution(source, 'image/jpeg', 300));
  const start = output.indexOf(Buffer.from('Exif\0\0')) + 6;
  const little = output.toString('ascii', start, start + 2) === 'II';
  const u16 = offset => little ? output.readUInt16LE(offset) : output.readUInt16BE(offset);
  const u32 = offset => little ? output.readUInt32LE(offset) : output.readUInt32BE(offset);
  const ifd = start + u32(start + 4), values = {};
  for (let index = 0; index < u16(ifd); index++) {
    const entry = ifd + 2 + index * 12, tag = u16(entry);
    if (tag === 282 || tag === 283) { const position = start + u32(entry + 8); values[tag] = u32(position) / u32(position + 4); }
    if (tag === 296) values[tag] = u16(entry + 8);
  }
  assert.deepEqual(values, { 282: 300, 283: 300, 296: 2 });
  assert.equal(output.readUInt16BE(14), 300);
  const scan = source.indexOf(Buffer.from([255, 218]));
  assert.deepEqual(output.subarray(scan), source.subarray(scan));
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
