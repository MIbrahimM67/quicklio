import test from'node:test';
import assert from'node:assert/strict';
import{scanPdfColorSpaces,summarizePageOperatorNames,classifyColorFindings,buildColorReport,reportToCsv}from'../assets/js/pdf-color-space-core.mjs';

test('detects standard declared PDF color spaces',()=>{
  const raw=scanPdfColorSpaces('<< /ColorSpace /DeviceRGB /Alt /DeviceCMYK /Other /DeviceGray /Profile /ICCBased >>');
  assert.equal(raw.declared.rgb,true);
  assert.equal(raw.declared.cmyk,true);
  assert.equal(raw.declared.gray,true);
  assert.equal(raw.declared.icc,true);
  assert.equal(raw.counts.DeviceRGB,1);
});

test('extracts Separation and DeviceN spot names',()=>{
  const raw=scanPdfColorSpaces('<< /CS [/Separation /PANTONE#20300#20C /DeviceCMYK 1 0 R] /CS2 [/DeviceN [/Orange /Varnish] /DeviceCMYK 2 0 R] >>');
  assert.deepEqual(raw.spots,['PANTONE 300 C','Orange','Varnish']);
  assert.equal(raw.declared.spot,true);
});

test('detects output intent and PDF/X markers',()=>{
  const raw=scanPdfColorSpaces('<< /OutputIntents [3 0 R] /GTS_PDFXVersion (PDF/X-4) /GTS_PDFXConformance (PDF/X-4) >>');
  assert.equal(raw.hasOutputIntent,true);
  assert.equal(raw.pdfxVersion,'PDF/X-4');
  assert.equal(raw.pdfxConformance,'PDF/X-4');
});

test('summarizes direct page paint operators',()=>{
  const page=summarizePageOperatorNames(['save','setFillRGBColor','setStrokeRGBColor','setFillCMYKColor','setFillGray','restore']);
  assert.deepEqual(page,{rgb:2,cmyk:1,gray:1,colorSpaceOps:0});
});

test('classifies mixed RGB and CMYK findings conservatively',()=>{
  const verdict=classifyColorFindings({declared:{rgb:true,cmyk:false,gray:false,icc:false,spot:false},pages:[{rgb:0,cmyk:2,gray:0}]});
  assert.equal(verdict.label,'Mixed RGB + CMYK signals');
  assert.equal(verdict.tone,'warning');
  assert.equal(verdict.rgb,true);
  assert.equal(verdict.cmyk,true);
});

test('reports CMYK with spot colors without calling it a certification',()=>{
  const verdict=classifyColorFindings({declared:{rgb:false,cmyk:true,gray:false,icc:false,spot:true},pages:[]});
  assert.equal(verdict.label,'CMYK + spot-color signals');
  assert.equal(verdict.tone,'good');
});

test('returns undetermined when no useful signal exists',()=>{
  const verdict=classifyColorFindings({declared:{},pages:[]});
  assert.equal(verdict.label,'Undetermined');
});

test('builds report and CSV page rows',()=>{
  const raw=scanPdfColorSpaces('/DeviceRGB');
  const report=buildColorReport({fileName:'sample.pdf',pageCount:1,raw,pages:[{page:1,rgb:3,cmyk:0,gray:0,colorSpaceOps:0}]});
  assert.equal(report.verdict.rgb,true);
  const csv=reportToCsv(report);
  assert.match(csv,/"Page","RGB operators"/);
  assert.match(csv,/"1","3","0","0","0"/);
});
