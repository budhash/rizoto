/* Embed print resolution in canvas-encoded PNG/JPEG, without changing pixels. */
(function (root) {
  function concat(parts) {
    const output = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
    let position = 0;
    for (const part of parts) { output.set(part, position); position += part.length; }
    return output;
  }
  function crc32(bytes) {
    let crc = 0xffffffff;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }
  function pngResolution(bytes, ppi) {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    if (!signature.every((value, index) => bytes[index] === value)) throw new Error('Invalid PNG');
    const density = new Uint8Array(21);
    const densityView = new DataView(density.buffer);
    densityView.setUint32(0, 9);
    density.set([112, 72, 89, 115], 4); // pHYs
    const pixelsPerMeter = Math.round(ppi / 0.0254);
    densityView.setUint32(8, pixelsPerMeter); densityView.setUint32(12, pixelsPerMeter);
    density[16] = 1; // Meter units, not an arbitrary pixel aspect ratio.
    densityView.setUint32(17, crc32(density.subarray(4, 17)));
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const parts = [bytes.subarray(0, 8)];
    let position = 8, inserted = false, ended = false;
    while (position + 12 <= bytes.length) {
      const length = view.getUint32(position);
      const end = position + length + 12;
      if (end > bytes.length) throw new Error('Truncated PNG');
      const type = String.fromCharCode(...bytes.subarray(position + 4, position + 8));
      if (type !== 'pHYs') parts.push(bytes.subarray(position, end));
      if (type === 'IHDR') { parts.push(density); inserted = true; }
      position = end;
      if (type === 'IEND') { ended = true; break; }
    }
    if (!inserted || !ended) throw new Error('Incomplete PNG');
    return concat(parts);
  }
  function updateExifResolution(bytes, start, end, ppi) {
    if (start + 8 > end) return;
    const little = bytes[start] === 73 && bytes[start + 1] === 73;
    if (!little && !(bytes[start] === 77 && bytes[start + 1] === 77)) return;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint16(start + 2, little) !== 42) return;
    const ifd = start + view.getUint32(start + 4, little);
    if (ifd < start + 8 || ifd + 2 > end) return;
    const count = view.getUint16(ifd, little);
    if (ifd + 2 + count * 12 > end) return;
    for (let index = 0; index < count; index++) {
      const entry = ifd + 2 + index * 12;
      const tag = view.getUint16(entry, little), type = view.getUint16(entry + 2, little);
      if (view.getUint32(entry + 4, little) !== 1) continue;
      if ((tag === 0x011a || tag === 0x011b) && type === 5) {
        const value = start + view.getUint32(entry + 8, little);
        if (value < start + 8 || value + 8 > end) continue;
        view.setUint32(value, ppi, little); view.setUint32(value + 4, 1, little);
      }
      if (tag === 0x0128 && type === 3) view.setUint16(entry + 8, 2, little);
    }
  }
  function jpegResolution(bytes, ppi) {
    if (bytes[0] !== 255 || bytes[1] !== 216) throw new Error('Invalid JPEG');
    const output = new Uint8Array(bytes);
    const view = new DataView(output.buffer, output.byteOffset, output.byteLength);
    let hasJfif = false;
    for (let position = 2; position + 4 <= output.length;) {
      if (output[position] !== 255) throw new Error('Invalid JPEG marker');
      if (output[position + 1] === 255) { position++; continue; }
      const marker = output[position + 1];
      if (marker === 218 || marker === 217) break; // Scan or end.
      const length = view.getUint16(position + 2);
      if (length < 2 || position + 2 + length > output.length) throw new Error('Truncated JPEG');
      if (marker === 224 && length >= 16 &&
          [74, 70, 73, 70, 0].every((value, index) => output[position + 4 + index] === value)) {
        output[position + 11] = 1; // Pixels per inch.
        view.setUint16(position + 12, ppi); view.setUint16(position + 14, ppi);
        hasJfif = true;
      }
      if (marker === 225 && length >= 16 &&
          [69, 120, 105, 102, 0, 0].every((value, index) => output[position + 4 + index] === value)) {
        updateExifResolution(output, position + 10, position + 2 + length, ppi);
      }
      position += length + 2;
    }
    if (hasJfif) return output;
    const app0 = new Uint8Array([255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, ppi >> 8, ppi & 255, ppi >> 8, ppi & 255, 0, 0]);
    return concat([output.subarray(0, 2), app0, output.subarray(2)]);
  }
  function writeResolution(data, type, ppi) {
    if (!Number.isInteger(ppi) || ppi < 1 || ppi > 2400) throw new Error('Resolution must be 1–2400 pixels/inch');
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (type === 'image/png') return pngResolution(bytes, ppi);
    if (type === 'image/jpeg') return jpegResolution(bytes, ppi);
    return bytes;
  }
  async function withResolution(blob, ppi) {
    if (!['image/png', 'image/jpeg'].includes(blob.type)) return blob;
    return new Blob([writeResolution(await blob.arrayBuffer(), blob.type, ppi)], { type: blob.type });
  }
  const api = { writeResolution, withResolution };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RizotoDensity = api;
})(globalThis);
