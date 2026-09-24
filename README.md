# Quicklio

Static, browser-only tools site. No framework and no build step.

## Tools
- `/en/candles/candle-fragrance-calculator/`
- `/en/pdf/add-binding-margin-to-pdf/`

## Run locally
```bash
npm test
python3 -m http.server 8000
```
Open `http://localhost:8000/`.

The PDF page loads `pdf-lib` 1.17.1 from jsDelivr with a pinned URL. The user's PDF itself is processed in the browser and is not uploaded by this code. For a fully self-hosted deployment, download the same UMD file into `assets/vendor/` and replace the script URL.

## Repository strategy
Keep Quicklio as one repository while tools share the same domain, CSS, SEO structure, and deployment. Split a future tool only if it needs an independent backend/deployment.
