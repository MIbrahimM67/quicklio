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

## Run locally
```bash
npm test
python3 -m http.server 8000
```
Open `http://localhost:8000/`.

The PDF page loads `pdf-lib` 1.17.1 from jsDelivr with a pinned URL. The user's PDF itself is processed in the browser and is not uploaded by this code. For a fully self-hosted deployment, download the same UMD file into `assets/vendor/` and replace the script URL.

The Halloween candy calculator and payday planner can optionally store data in browser local storage. Image tools, social image fitting, pumpkin stencils, and PDF tools process selected files in the browser. Calculation-only tools do not require an account or server database.

## Repository strategy
Keep Quicklio as one repository while tools share the same domain, CSS, SEO structure, and deployment. Split a future tool only if it needs an independent backend/deployment.
