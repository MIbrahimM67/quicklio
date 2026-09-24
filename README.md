# Quicklio

Static, browser-only tools site. No framework and no build step.

## Tools
- `/en/candles/candle-fragrance-calculator/`
- `/en/pdf/add-binding-margin-to-pdf/`
- `/en/halloween/halloween-candy-calculator/`

## Run locally
```bash
npm test
python3 -m http.server 8000
```
Open `http://localhost:8000/`.

The PDF page loads `pdf-lib` 1.17.1 from jsDelivr with a pinned URL. The user's PDF itself is processed in the browser and is not uploaded by this code. For a fully self-hosted deployment, download the same UMD file into `assets/vendor/` and replace the script URL.

The Halloween candy calculator can optionally store one prior turnout count in browser local storage. No account or server database is used.

## Repository strategy
Keep Quicklio as one repository while tools share the same domain, CSS, SEO structure, and deployment. Split a future tool only if it needs an independent backend/deployment.
