# Quicklio

Static, browser-only tools site. No framework and no build step.

## Tools
- `/en/candles/candle-fragrance-calculator/`
- `/en/pdf/add-binding-margin-to-pdf/`
- `/en/halloween/halloween-candy-calculator/`
- `/en/halloween/pumpkin-stencil-maker/`
- `/en/christmas/christmas-lights-calculator/`

- `/en/images/resize-image-to-exact-kb/`
- `/en/pdf/pdf-booklet-signature-maker/`
- `/en/images/photo-to-line-drawing/`
- `/en/social/instagram-no-crop-image-resizer/`
- `/en/finance/payday-bills-planner/`
- `/en/crafts/yarn-amount-calculator/`

- `/en/images/passport-photo-maker/`
- `/en/print/split-image-for-printing/`
- `/en/pdf/add-bleed-and-crop-marks/`
- `/en/labels/barcode-label-sheet-generator/`
- `/en/images/photo-contact-sheet-maker/`
- `/en/pdf/resize-shipping-label-to-4x6/`
- `/en/images/dpi-print-size-calculator/`

- `/en/images/online-image-editor/`
- `/en/pdf/online-pdf-editor/`

- `/en/pdf/merge-pdf/`
- `/en/pdf/split-pdf/`
- `/en/pdf/compress-pdf/`
- `/en/pdf/pdf-to-jpg/`
- `/en/pdf/image-to-pdf/`
- `/en/pdf/add-watermark-to-pdf/`
- `/en/pdf/add-page-numbers-to-pdf/`
- `/en/pdf/crop-pdf/`

## Run locally
```bash
npm test
python3 -m http.server 8000
```
Open `http://localhost:8000/`.

PDF-producing tools load `pdf-lib` 1.17.1 from jsDelivr with a pinned URL. The barcode/QR label tool additionally loads pinned `bwip-js` 4.11.4 in the browser. The user's PDF itself is processed in the browser and is not uploaded by this code. For a fully self-hosted deployment, download the same UMD file into `assets/vendor/` and replace the script URL.

The Halloween candy calculator and payday planner can optionally store data in browser local storage. Image tools, photo-sheet tools, poster tiling, social image fitting, pumpkin stencils, barcode CSV data, and PDF tools process selected files/data in the browser. Calculation-only tools do not require an account or server database.

## Repository strategy
Keep Quicklio as one repository while tools share the same domain, CSS, SEO structure, and deployment. Split a future tool only if it needs an independent backend/deployment.

## Editors
The browser editors use Fabric.js 7.4.0 for interactive canvas objects. The PDF editor additionally uses PDF.js 6.3.289 for page rendering and pdf-lib for PDF export. Untouched PDF pages are copied from the original file; edited or rotated pages are flattened for predictable output.

## Free PDF suite
Quicklio provides browser-side merge, split/extract, compression, PDF-to-JPG, images-to-PDF, watermark, page-number, crop, and annotation/editing workflows. Compression is intentionally raster-based and warns that selectable text, forms, links, and vector fidelity may be lost.
