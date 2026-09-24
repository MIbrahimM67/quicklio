import { scaleToFit, transformPixels, paperDimensionsInches, computeExportSize } from '/assets/js/pumpkin-stencil-core.mjs';
const $ = (s) => document.querySelector(s);
const sourceCanvas = $('#sourceCanvas');
const previewCanvas = $('#previewCanvas');
const srcCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
const prevCtx = previewCanvas.getContext('2d', { willReadFrequently: true });
const originalWrap = $('#originalWrap');
const processedWrap = $('#processedWrap');
const originalImgTag = $('#originalImage');
const state = { image: null, fileName: 'stencil' };
const controls = { threshold: $('#threshold'), thresholdOut: $('#thresholdOut'), contrast: $('#contrast'), contrastOut: $('#contrastOut'), blur: $('#blur'), blurOut: $('#blurOut'), tones: $('#tones'), invert: $('#invert'), paper: $('#paper'), stencilWidth: $('#stencilWidth'), stencilWidthOut: $('#stencilWidthOut') };
function syncLabels() {
  controls.thresholdOut.textContent = controls.threshold.value;
  controls.contrastOut.textContent = `${controls.contrast.value}%`;
  controls.blurOut.textContent = `${controls.blur.value}px`;
  controls.stencilWidthOut.textContent = `${controls.stencilWidth.value} in`;
}
function loadFile(file) {
  if (!file || !file.type.startsWith('image/')) { $('#status').textContent = 'Choose an image file.'; return; }
  state.fileName = file.name.replace(/\.[^.]+$/, '') || 'stencil';
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      state.image = img;
      originalImgTag.src = reader.result;
      originalWrap.hidden = false;
      processedWrap.hidden = false;
      renderPreview();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
function getFilterString() {
  return `grayscale(100%) contrast(${100 + Number(controls.contrast.value)}%) blur(${Number(controls.blur.value)}px)`;
}
function buildProcessedCanvas(targetWidth = null) {
  const img = state.image;
  if (!img) return null;
  const target = targetWidth ? { width: Math.max(1, Math.round(targetWidth)), height: Math.max(1, Math.round((img.height / img.width) * targetWidth)) } : scaleToFit(img.width, img.height, 900, 900);
  const work = document.createElement('canvas');
  work.width = target.width; work.height = target.height;
  const ctx = work.getContext('2d', { willReadFrequently: true });
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, work.width, work.height);
  ctx.filter = getFilterString(); ctx.drawImage(img, 0, 0, work.width, work.height); ctx.filter = 'none';
  const imageData = ctx.getImageData(0, 0, work.width, work.height);
  const out = transformPixels(imageData.data, { threshold: Number(controls.threshold.value), tones: Number(controls.tones.value), invert: controls.invert.value === 'true' });
  ctx.putImageData(new ImageData(out, work.width, work.height), 0, 0);
  return work;
}
function renderPreview() {
  syncLabels();
  if (!state.image) return;
  const preview = buildProcessedCanvas(); if (!preview) return;
  sourceCanvas.width = preview.width; sourceCanvas.height = preview.height;
  srcCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height); srcCtx.drawImage(state.image, 0, 0, preview.width, preview.height);
  previewCanvas.width = preview.width; previewCanvas.height = preview.height;
  prevCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height); prevCtx.drawImage(preview, 0, 0);
  $('#status').textContent = `Preview ready · ${preview.width} × ${preview.height}px`;
  const paper = paperDimensionsInches(controls.paper.value);
  $('#paperHint').textContent = `${paper.label}: ${paper.width} × ${paper.height} in`;
}
function downloadPng() {
  if (!state.image) return;
  const { widthPx } = computeExportSize(state.image.width, state.image.height, Number(controls.stencilWidth.value), 300);
  const canvas = buildProcessedCanvas(widthPx); if (!canvas) return;
  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = `${state.fileName}-pumpkin-stencil.png`;
  link.click();
}
function printOrSavePdf() {
  if (!state.image) return;
  const { widthPx } = computeExportSize(state.image.width, state.image.height, Number(controls.stencilWidth.value), 300);
  const canvas = buildProcessedCanvas(widthPx); if (!canvas) return;
  const paper = paperDimensionsInches(controls.paper.value);
  const dataUrl = canvas.toDataURL('image/png');
  const widthIn = Number(controls.stencilWidth.value);
  const heightIn = (canvas.height / canvas.width) * widthIn;
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1000,height=900'); if (!win) return;
  win.document.write(`<!doctype html><html><head><title>Pumpkin stencil</title><style>@page{size:${paper.label};margin:.5in}html,body{margin:0;background:#fff}.wrap{display:flex;justify-content:center;padding:.25in}.sheet img{display:block;width:${widthIn}in;height:${heightIn}in;object-fit:contain;image-rendering:pixelated}.note{font:12px system-ui;color:#555;padding:.25in .25in 0}</style></head><body><div class="note">Use the browser print dialog to print or Save as PDF.</div><div class="wrap"><div class="sheet"><img src="${dataUrl}" alt="Pumpkin stencil"></div></div><script>setTimeout(()=>window.print(),250)<\/script></body></html>`);
  win.document.close();
}
$('#fileInput').addEventListener('change', (e) => loadFile(e.target.files[0]));
$('#drop').addEventListener('dragover', (e) => e.preventDefault());
$('#drop').addEventListener('drop', (e) => { e.preventDefault(); loadFile(e.dataTransfer.files[0]); });
$('#drop').addEventListener('click', () => $('#fileInput').click());
Object.values(controls).forEach((el) => { el.addEventListener('input', renderPreview); el.addEventListener('change', renderPreview); });
$('#downloadPng').addEventListener('click', downloadPng);
$('#printPdf').addEventListener('click', printOrSavePdf);
syncLabels();
