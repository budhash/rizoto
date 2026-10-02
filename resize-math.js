/* Size conversions shared by the browser controls and development tests. */
(function (root) {
  const inchesPerUnit = { in: 1, cm: 1 / 2.54, mm: 1 / 25.4 };
  const validResolution = ppi => Number.isInteger(ppi) && ppi >= 1 && ppi <= 2400;
  function toPixels(value, unit, ppi) {
    if (!Number.isFinite(value) || value <= 0) return NaN;
    return unit === 'px' ? value : Math.round(value * inchesPerUnit[unit] * ppi);
  }
  function fromPixels(value, unit, ppi) {
    return unit === 'px' ? value : value / (inchesPerUnit[unit] * ppi);
  }
  function proportional(width, height, ratio, changed) {
    return changed === 'height'
      ? { width: Math.round(height * ratio), height }
      : { width, height: Math.round(width / ratio) };
  }
  function resolutionForSize(pixels, value, unit) {
    return Math.round(pixels / (value * inchesPerUnit[unit]));
  }
  const api = { validResolution, toPixels, fromPixels, proportional, resolutionForSize };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RizotoSize = api;
})(globalThis);
