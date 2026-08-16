(function () {
  const videoWrap = document.getElementById("scan-video-wrap");
  const videoEl = document.getElementById("scan-video");
  const startStateEl = document.getElementById("scan-start-state");
  const startBtn = document.getElementById("scan-start");
  const cancelBtn = document.getElementById("scan-cancel");
  const manualForm = document.getElementById("manual-barcode-form");
  const manualInput = document.getElementById("manual-barcode");
  const statusEl = document.getElementById("scan-status");
  const resultEl = document.getElementById("result");
  const showIngredientsBtn = document.getElementById("show-manual-ingredients");
  const ingredientsForm = document.getElementById("manual-ingredients-form");
  const ingredientsTextarea = document.getElementById("manual-ingredients-text");
  const ingredientsBarcodeInput = document.getElementById("manual-ingredients-barcode");

  let reader = null;

  // Local, per-browser cache of barcode -> product info, so a product looked up once
  // (from Open Food Facts, or typed in by hand) doesn't need re-fetching or re-typing
  // next time the same barcode is scanned. This never leaves the device — it's not
  // shared with Open Food Facts or anyone else.
  const CACHE_KEY = "fodmap-checker:barcode-cache:v1";

  function loadCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function getCachedProduct(code) {
    return loadCache()[code] || null;
  }

  function setCachedProduct(code, product) {
    if (!code) return;
    const cache = loadCache();
    cache[code] = {
      product_name: product.product_name || "",
      brands: product.brands || "",
      ingredients_text_en: product.ingredients_text_en || product.ingredients_text || "",
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      // localStorage full or unavailable (e.g. private browsing) — the lookup still
      // works this session, it just won't be remembered for next time.
    }
  }

  function forgetCachedProduct(code) {
    const cache = loadCache();
    delete cache[code];
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (e) {
      /* ignore */
    }
  }

  function setStatus(text, isError) {
    if (!text) {
      statusEl.hidden = true;
      return;
    }
    statusEl.hidden = false;
    statusEl.textContent = text;
    statusEl.className = "scan-status" + (isError ? " scan-status-error" : "");
  }

  function stopScanning() {
    if (reader) {
      try { reader.reset(); } catch (e) { /* already stopped */ }
    }
    videoWrap.hidden = true;
    startStateEl.hidden = false;
  }

  async function startScanning() {
    if (typeof ZXing === "undefined") {
      setStatus("Barcode scanner failed to load. Try the manual entry field below.", true);
      return;
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("Camera access isn't available in this browser. Use the manual entry field below.", true);
      return;
    }

    setStatus("");
    startStateEl.hidden = true;
    videoWrap.hidden = false;

    reader = new ZXing.BrowserMultiFormatReader();
    try {
      await reader.decodeFromVideoDevice(null, videoEl, (result, err) => {
        if (result) {
          const code = result.getText();
          stopScanning();
          lookupBarcode(code);
        }
        // NotFoundException fires continuously while no barcode is in frame — ignore it.
      });
    } catch (err) {
      setStatus("Couldn't access the camera: " + (err && err.message ? err.message : "permission denied"), true);
      stopScanning();
    }
  }

  function renderProductResult(product, code, opts) {
    opts = opts || {};
    resultEl.hidden = false;
    document.getElementById("empty-state") && (document.getElementById("empty-state").hidden = true);

    if (!product) {
      resultEl.innerHTML = `
        <div class="result-card verdict-unknown">
          <div class="result-header"><span class="verdict-badge">❔ Product not found</span></div>
          <p class="verdict-summary">Barcode ${escapeHtml(code)} isn't in the Open Food Facts database.</p>
          <p class="hint">Coverage is crowdsourced, so store-brand and regional products are often missing. Paste the ingredient list from the packaging below — it'll be saved so this exact barcode shows instantly next time.</p>
        </div>`;
      // Prefill and reveal the ingredients form with this barcode already attached,
      // so submitting it saves against the exact code that just failed to look up.
      ingredientsBarcodeInput.value = code || "";
      ingredientsForm.hidden = false;
      ingredientsTextarea.focus();
      return;
    }

    const ingredientsText = product.ingredients_text_en || product.ingredients_text || "";
    const screen = screenIngredients(ingredientsText);

    const VERDICT_META = {
      low: { label: "No known triggers found", icon: "✅", className: "verdict-low", summary: "No listed ingredient matched a common FODMAP trigger — but this is a keyword scan, not a verified rating." },
      moderate: { label: "Possible moderate FODMAP", icon: "⚠️", className: "verdict-moderate", summary: "Contains an ingredient that's moderate FODMAP in typical amounts." },
      high: { label: "Likely high FODMAP", icon: "🚫", className: "verdict-high", summary: "Contains an ingredient commonly high in FODMAPs." },
      unknown: { label: "No ingredient list available", icon: "❔", className: "verdict-unknown", summary: "This product doesn't have an ingredient list on file to screen." },
    };
    const meta = VERDICT_META[screen.verdict];
    const hits = dedupeSubstringHits(screen.hits);

    const hitsHtml = hits.length
      ? `<div class="detail-row"><span class="detail-label">Why</span><span class="tag-row">${hits
          .map((h) => `<span class="fodmap-tag tag-${h.verdict}" title="${escapeHtml(h.fodmap)}">${escapeHtml(h.keyword)}</span>`)
          .join("")}</span></div>`
      : "";
    const ingredientsHtml = ingredientsText
      ? `<div class="detail-row"><span class="detail-label">Ingredients</span><span>${highlightIngredients(ingredientsText, hits)}</span></div>`
      : "";

    const savedNoteHtml = opts.fromCache
      ? `<p class="saved-note">📋 Loaded from your saved ingredients for barcode ${escapeHtml(code)}.</p>
         <button type="button" class="forget-btn" data-forget-code="${escapeHtml(code)}">Forget this saved entry</button>`
      : opts.justSaved
      ? `<p class="saved-note">✓ Saved — barcode ${escapeHtml(code)} will show this instantly next time, even offline.</p>`
      : "";

    resultEl.innerHTML = `
      <div class="result-card ${meta.className}">
        <div class="result-header">
          <span class="verdict-badge">${meta.icon} ${meta.label}</span>
          <span class="category-tag">${code ? "Packaged food" : "Manual check"}</span>
        </div>
        <h2 class="food-name">${escapeHtml(product.product_name || "Unknown product")}</h2>
        ${product.brands ? `<p class="verdict-summary">${escapeHtml(product.brands)}</p>` : ""}
        <p class="verdict-summary">${meta.summary}</p>
        ${hitsHtml}
        ${ingredientsHtml}
        ${savedNoteHtml}
      </div>`;

    const forgetBtn = resultEl.querySelector("[data-forget-code]");
    if (forgetBtn) {
      forgetBtn.addEventListener("click", () => {
        forgetCachedProduct(forgetBtn.dataset.forgetCode);
        setStatus("Saved entry removed.");
      });
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Drops hits whose keyword is just a substring of another hit's keyword (e.g. "milk"
  // inside "milk powder") so the flagged list doesn't list the same ingredient twice.
  function dedupeSubstringHits(hits) {
    const keywords = [...new Set(hits.map((h) => h.keyword))].sort((a, b) => b.length - a.length);
    const kept = [];
    for (const kw of keywords) {
      if (!kept.some((longer) => longer.includes(kw))) kept.push(kw);
    }
    const keptSet = new Set(kept);
    const seen = new Set();
    return hits.filter((h) => {
      if (!keptSet.has(h.keyword) || seen.has(h.keyword)) return false;
      seen.add(h.keyword);
      return true;
    });
  }

  // Wraps each flagged trigger word in the ingredient text with a colored <mark>,
  // so the reason for the verdict is visible in context, not just listed separately.
  function highlightIngredients(text, hits) {
    const escaped = escapeHtml(text);
    if (!hits.length) return escaped;

    const verdictByKeyword = new Map();
    for (const hit of hits) {
      if (!verdictByKeyword.has(hit.keyword)) verdictByKeyword.set(hit.keyword, hit.verdict);
    }
    // Longest keyword first so e.g. "milk powder" is matched (and highlighted whole)
    // before the shorter "milk" keyword can split it.
    const keywords = [...verdictByKeyword.keys()].sort((a, b) => b.length - a.length);
    const pattern = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    const re = new RegExp(`(${pattern})`, "gi");

    return escaped.replace(re, (match) => {
      const verdict = verdictByKeyword.get(match.toLowerCase()) || "moderate";
      return `<mark class="hl-${verdict}">${match}</mark>`;
    });
  }

  async function lookupBarcode(code) {
    const cached = getCachedProduct(code);
    if (cached) {
      renderProductResult(cached, code, { fromCache: true });
      return;
    }

    setStatus("Looking up barcode " + code + "…");
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
      const data = await res.json();
      setStatus("");
      if (data.status === 1 && data.product) {
        setCachedProduct(code, data.product);
        renderProductResult(data.product, code);
      } else {
        renderProductResult(null, code);
      }
    } catch (err) {
      setStatus("Lookup failed — check your connection and try again.", true);
    }
  }

  startBtn.addEventListener("click", startScanning);
  cancelBtn.addEventListener("click", stopScanning);
  manualForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const code = manualInput.value.trim();
    if (!code) return;
    stopScanning();
    lookupBarcode(code);
  });

  showIngredientsBtn.addEventListener("click", () => {
    ingredientsForm.hidden = !ingredientsForm.hidden;
    if (!ingredientsForm.hidden) ingredientsTextarea.focus();
  });

  ingredientsForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = ingredientsTextarea.value.trim();
    if (!text) return;
    const code = ingredientsBarcodeInput.value.trim() || null;
    stopScanning();

    const product = { product_name: "Pasted ingredients", ingredients_text_en: text };
    if (code) setCachedProduct(code, product);
    renderProductResult(product, code, { justSaved: !!code });

    ingredientsForm.reset();
    ingredientsForm.hidden = true;
  });

  window.stopBarcodeScanning = stopScanning;
})();
