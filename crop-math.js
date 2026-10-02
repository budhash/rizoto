/* Shared crop geometry, independent of the UI and browser. */
(function (root) {
  const validDimensions = (width, height) => [width, height].every(v => Number.isInteger(v) && v >= 1 && v <= 8192) && width * height <= 32000000;
  const coverScale = (imageWidth, imageHeight, width, height, zoom = 1) => Math.max(width / imageWidth, height / imageHeight) * zoom;
  function centered(imageWidth, imageHeight, width, height, scale) {
    return { x: (width - imageWidth * scale) / 2, y: (height - imageHeight * scale) / 2 };
  }
  function clamp(imageWidth, imageHeight, width, height, scale, x, y) {
    return {
      x: Math.max(Math.min(0, width - imageWidth * scale), Math.min(0, x)),
      y: Math.max(Math.min(0, height - imageHeight * scale), Math.min(0, y))
    };
  }
  function zoomPosition(width, height, x, y, oldScale, newScale) {
    return { x: width / 2 - (width / 2 - x) * newScale / oldScale, y: height / 2 - (height / 2 - y) * newScale / oldScale };
  }
  const api = { validDimensions, coverScale, centered, clamp, zoomPosition };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RizotoCrop = api;
})(globalThis);
