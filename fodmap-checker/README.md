# FODMAP Food Checker

A small static web app: type in a food and get a verdict — **low / moderate / high FODMAP** — plus a suggested safe serving size and which FODMAP group is responsible (fructans, lactose, excess fructose, GOS, or polyols).

## Running it

No build step. Open `index.html` directly in a browser, or serve the folder:

```bash
cd fodmap-checker
python3 -m http.server 8000
# open http://localhost:8000
```

## How it works

- `data.js` — the food database (name, aliases, category, verdict, safe serving, contributing FODMAPs, notes).
- `app.js` — search/autocomplete, exact + fuzzy matching, and result rendering.
- `index.html` / `style.css` — layout and theme-aware styling (light/dark).

To add a food, add an entry to the `FODMAP_DATA` array in `data.js`.

## Disclaimer

This is general educational information, not medical advice. FODMAP tolerance is individual and dose-dependent. Serving sizes here are approximations distilled from widely published low-FODMAP guidance — for the authoritative, lab-tested reference use the [Monash University FODMAP app](https://www.monashfodmap.com/), and work with an accredited dietitian for the elimination/reintroduction process.
