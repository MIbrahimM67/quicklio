import test from 'node:test';
import assert from 'node:assert/strict';
import {searchToolCatalog} from '../assets/js/tool-search.mjs';

const catalog=[
  {title:'Online Image Editor',description:'Crop, resize and draw',keywords:'image photo editor',category:'image',path:'/en/images/online-image-editor/'},
  {title:'Passport & ID Photo Maker',description:'Print passport photos',keywords:'passport visa',category:'image',path:'/en/images/passport-photo-maker/'},
  {title:'Resize Image to Exact KB',description:'File size for image uploads',keywords:'compress photo 50kb',category:'image',path:'/en/images/resize-image-to-exact-kb/'},
  {title:'Images to PDF',description:'Combine images into one PDF',keywords:'images pdf',category:'pdf',path:'/en/pdf/image-to-pdf/'},
  {title:'PDF to JPG',description:'Render PDF pages as JPG',keywords:'pdf to jpeg',category:'pdf',path:'/en/pdf/pdf-to-jpg/'},
  {title:'Compress PDF',description:'Reduce image-heavy scan PDF',keywords:'compress pdf',category:'pdf',path:'/en/pdf/compress-pdf/'},
  {title:'Split Image for Printing',description:'Tile a picture across pages',keywords:'poster image printing',category:'pdf',path:'/en/print/split-image-for-printing/'},
  {title:'Cross Stitch Pattern Maker',description:'Turn a photo into stitch chart',keywords:'image pattern',category:'crafts',path:'/en/crafts/cross-stitch-pattern-maker/'},
  {title:'Candle Fragrance Calculator',description:'Estimate fragrance amounts',keywords:'wax candle',category:'candle',path:'/en/candles/candle-fragrance-calculator/'}
];
const names=query=>searchToolCatalog(catalog,query).map(item=>item.tool.title);

test('image includes image tools and relevant cross-category workflows',()=>{
  const results=names('image');
  for(const name of ['Passport & ID Photo Maker','Images to PDF','PDF to JPG','Cross Stitch Pattern Maker'])
    assert.ok(results.includes(name),name);
  assert.ok(!results.includes('Compress PDF'));
  assert.ok(!results.includes('Candle Fragrance Calculator'));
});

test('image aliases find the same tools',()=>{
  for(const alias of ['photo','picture','pics'])
    assert.deepEqual(new Set(names(alias)),new Set(names('image')));
});

test('multiword searches match every meaningful token and rank exact titles',()=>{
  assert.equal(names('PDF to JPG')[0],'PDF to JPG');
  assert.deepEqual(names('passport photo'),['Passport & ID Photo Maker']);
  assert.equal(names('resize image')[0],'Resize Image to Exact KB');
});

test('tolerates common typos, ignores case and rejects unrelated searches',()=>{
  assert.equal(names('Passprot')[0],'Passport & ID Photo Maker');
  assert.deepEqual(names('CANDLE'),['Candle Fragrance Calculator']);
  assert.deepEqual(names('unknown nonsense'),[]);
});

test('blank search preserves the original list order',()=>{
  assert.deepEqual(names(''),catalog.map(tool=>tool.title));
});
