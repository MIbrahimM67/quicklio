export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
export function scaleToFit(width, height, maxWidth, maxHeight) {
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)), ratio };
}
export function luminance(r, g, b) {
  return Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
}
export function posterizeGray(gray, threshold = 128, tones = 2, invert = false) {
  gray = clamp(Math.round(gray), 0, 255);
  threshold = clamp(Math.round(threshold), 0, 255);
  tones = tones === 3 ? 3 : 2;
  let out;
  if (tones === 2) out = gray >= threshold ? 255 : 0;
  else {
    const lowCut = clamp(threshold - 42, 0, 255);
    const highCut = clamp(threshold + 42, 0, 255);
    if (gray < lowCut) out = 0;
    else if (gray > highCut) out = 255;
    else out = 127;
  }
  if (invert) out = 255 - out;
  return out;
}
export function transformPixels(data, opts = {}) {
  const threshold = Number(opts.threshold ?? 128);
  const tones = Number(opts.tones ?? 2) === 3 ? 3 : 2;
  const invert = !!opts.invert;
  const out = new Uint8ClampedArray(data.length);
  for (let i = 0; i < data.length; i += 4) {
    const gray = luminance(data[i], data[i + 1], data[i + 2]);
    const value = posterizeGray(gray, threshold, tones, invert);
    out[i] = value; out[i + 1] = value; out[i + 2] = value; out[i + 3] = data[i + 3];
  }
  return out;
}
export function paperDimensionsInches(kind = 'letter') {
  return kind === 'a4' ? { width: 8.27, height: 11.69, label: 'A4' } : { width: 8.5, height: 11, label: 'Letter' };
}
export function computeExportSize(imageWidth, imageHeight, stencilWidthInches, dpi = 300) {
  const widthPx = Math.max(1, Math.round(Number(stencilWidthInches) * dpi));
  const ratio = imageHeight / imageWidth;
  const heightPx = Math.max(1, Math.round(widthPx * ratio));
  return { widthPx, heightPx, dpi };
}
