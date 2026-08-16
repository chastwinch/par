> **Note:** this folder is a mirror of [`fodmap-checker/`](../fodmap-checker) — it exists solely because GitHub Pages can only deploy from a branch's `/(root)` or `/docs` folder, not an arbitrary subfolder. Make changes in `fodmap-checker/` and copy them here (`cp -r fodmap-checker/* docs/`) rather than editing this copy directly.

# FODMAP Food Checker

A small static web app: type in a food (or scan a packaged product's barcode) and get a verdict — **low / moderate / high FODMAP** — plus a suggested safe serving size and which FODMAP group is responsible (fructans, lactose, excess fructose, GOS, or polyols).

## Running it

No build step. Camera access requires a secure context (`https://` or `localhost`), so serve the folder rather than opening `index.html` directly:

```bash
cd fodmap-checker
python3 -m http.server 8000
# open http://localhost:8000
```

## How it works

- `data.js` — the curated food database (name, aliases, category, verdict, safe serving, contributing FODMAPs, notes).
- `app.js` — search/autocomplete, exact + fuzzy matching, result rendering, and the Search/Scan mode toggle.
- `scanner.js` — camera barcode scanning (via `vendor/zxing.min.js`) and manual barcode entry, product lookup against the [Open Food Facts](https://world.openfoodfacts.org/) API, and ingredient screening.
- `ingredients.js` — keyword list used to screen a scanned product's ingredient text for common FODMAP triggers. This is a much blunter heuristic than the curated database — a "no known triggers" result means nothing matched, not that the product is verified safe.
- `index.html` / `style.css` — layout and theme-aware styling (light/dark).

To add a food, add an entry to the `FODMAP_DATA` array in `data.js`. To improve barcode screening, add a keyword to `INGREDIENT_TRIGGERS` in `ingredients.js`.

## Disclaimer

This is general educational information, not medical advice. FODMAP tolerance is individual and dose-dependent. Serving sizes here are approximations distilled from widely published low-FODMAP guidance — for the authoritative, lab-tested reference use the [Monash University FODMAP app](https://www.monashfodmap.com/), and work with an accredited dietitian for the elimination/reintroduction process.
