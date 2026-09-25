import test from'node:test';
import assert from'node:assert/strict';
import{analyzeSvgText,CRICUT_SVG_PATH_LIMIT}from'../assets/js/cricut-svg-core.mjs';

test('simple SVG passes documented Cricut checks',()=>{
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="2in" height="1in" viewBox="0 0 200 100"><g><path d="M0 0 L20 0 Z"/><rect x="30" y="10" width="20" height="20"/></g></svg>';
  const r=analyzeSvgText(svg,{fileSize:321});
  assert.equal(r.state,'pass');
  assert.equal(r.counts.path,1);
  assert.equal(r.counts.geometry,2);
  assert.equal(r.counts.group,1);
  assert.equal(r.dimensions.viewBox.width,200);
  assert.equal(r.fileSize,321);
});

test('exactly 5000 explicit paths is not over the published limit',()=>{
  const svg='<svg viewBox="0 0 10 10">'+('<path d="M0 0Z"/>'.repeat(CRICUT_SVG_PATH_LIMIT))+'</svg>';
  const r=analyzeSvgText(svg);
  assert.equal(r.counts.path,5000);
  assert.equal(r.summary.overBy,0);
  assert.equal(r.blockers.some(x=>x.code==='path-limit'),false);
});

test('more than 5000 explicit paths is a blocker',()=>{
  const svg='<svg viewBox="0 0 10 10">'+('<path d="M0 0Z"/>'.repeat(CRICUT_SVG_PATH_LIMIT+1))+'</svg>';
  const r=analyzeSvgText(svg);
  assert.equal(r.state,'fail');
  assert.equal(r.summary.overBy,1);
  assert.ok(r.blockers.some(x=>x.code==='path-limit'));
});

test('documented unsupported SVG items are detected',()=>{
  const svg='<svg viewBox="0 0 100 100"><defs><clipPath id="c"><path d="M0 0Z"/></clipPath><linearGradient id="g"><stop offset="0"/></linearGradient></defs><text>Hi</text><rect fill="url(#g)" width="10" height="10" clip-path="url(#c)"/><image href="data:image/png;base64,AA=="/></svg>';
  const r=analyzeSvgText(svg);
  const codes=new Set(r.blockers.map(x=>x.code));
  assert.equal(r.state,'fail');
  assert.ok(codes.has('clipping-path'));
  assert.ok(codes.has('editable-text'));
  assert.ok(codes.has('gradient'));
  assert.ok(codes.has('embedded-image'));
});

test('advanced but not explicitly documented features are warnings',()=>{
  const svg='<svg viewBox="0 0 100 100"><defs><mask id="m"><rect width="100" height="100"/></mask><filter id="f"/></defs><path mask="url(#m)" filter="url(#f)" d="M0 0L10 10"/></svg>';
  const r=analyzeSvgText(svg);
  assert.equal(r.state,'review');
  assert.ok(r.warnings.some(x=>x.code==='mask'));
  assert.ok(r.warnings.some(x=>x.code==='filter'));
  assert.equal(r.blockers.length,0);
});

test('missing viewBox is a review warning rather than a Cricut blocker',()=>{
  const r=analyzeSvgText('<svg width="100" height="50"><path d="M0 0L1 1"/></svg>');
  assert.equal(r.state,'review');
  assert.ok(r.warnings.some(x=>x.code==='viewbox'));
});

test('non-SVG text is rejected',()=>{
  assert.throws(()=>analyzeSvgText('<html></html>'),/SVG root/i);
});
