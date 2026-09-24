import test from'node:test';import assert from'node:assert/strict';import{parseCSV,labelPlan,normalizeBarcodeType}from'../assets/js/label-core.mjs';
test('CSV parser handles quoted commas',()=>{const r=parseCSV('sku,name\n1,"Blue, Shirt"');assert.equal(r.records[0].name,'Blue, Shirt')});
test('Avery 5160 has 30 labels',()=>assert.equal(labelPlan('avery5160').perPage,30));
test('QR maps to qrcode',()=>assert.equal(normalizeBarcodeType('qr'),'qrcode'));
