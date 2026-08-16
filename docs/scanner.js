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

  let reader = null;

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

  function renderProductResult(product, code) {
    resultEl.hidden = false;
    document.getElementById("empty-state") && (document.getElementById("empty-state").hidden = true);

    if (!product) {
      resultEl.innerHTML = `
        <div class="result-card verdict-unknown">
          <div class="result-header"><span class="verdict-badge">❔ Product not found</span></div>
          <p class="verdict-summary">Barcode ${escapeHtml(code)} isn't in the Open Food Facts database.</p>
          <p class="hint">Try searching for the food by name in the Search tab instead.</p>
        </div>`;
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

    resultEl.innerHTML = `
      <div class="result-card ${meta.className}">
        <div class="result-header">
          <span class="verdict-badge">${meta.icon} ${meta.label}</span>
          <span class="category-tag">Packaged food</span>
        </div>
        <h2 class="food-name">${escapeHtml(product.product_name || "Unknown product")}</h2>
        ${product.brands ? `<p class="verdict-summary">${escapeHtml(product.brands)}</p>` : ""}
        <p class="verdict-summary">${meta.summary}</p>
        ${hitsHtml}
        ${ingredientsHtml}
      </div>`;
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
    setStatus("Looking up barcode " + code + "…");
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json`);
      const data = await res.json();
      setStatus("");
      if (data.status === 1 && data.product) {
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

  window.stopBarcodeScanning = stopScanning;
})();
