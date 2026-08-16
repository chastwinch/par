(function () {
  const searchInput = document.getElementById("search");
  const suggestionsEl = document.getElementById("suggestions");
  const resultEl = document.getElementById("result");
  const emptyStateEl = document.getElementById("empty-state");

  const VERDICT_META = {
    low: { label: "Low FODMAP", icon: "✅", className: "verdict-low", summary: "Generally safe at the serving below." },
    moderate: { label: "Moderate FODMAP", icon: "⚠️", className: "verdict-moderate", summary: "Fine in a limited amount — the serving below is the ceiling." },
    high: { label: "High FODMAP", icon: "🚫", className: "verdict-high", summary: "Best avoided or kept to a token amount during an elimination phase." },
  };

  function normalize(str) {
    return str.toLowerCase().trim();
  }

  function searchableTerms(item) {
    return [item.name, ...(item.aliases || [])].map(normalize);
  }

  function matches(item, query) {
    return searchableTerms(item).some((term) => term.includes(query));
  }

  function scoreMatch(item, query) {
    const terms = searchableTerms(item);
    let best = Infinity;
    for (const term of terms) {
      const idx = term.indexOf(query);
      if (idx === -1) continue;
      // Prefer exact matches, then prefix matches, then substring matches.
      const score = term === query ? 0 : idx === 0 ? 1 : 2 + idx * 0.01;
      if (score < best) best = score;
    }
    return best;
  }

  function findMatches(query) {
    if (!query) return [];
    return FODMAP_DATA
      .filter((item) => matches(item, query))
      .sort((a, b) => scoreMatch(a, query) - scoreMatch(b, query))
      .slice(0, 8);
  }

  // Lightweight fuzzy fallback for typos: rank by shared-character overlap with the query.
  function findClosest(query, max = 5) {
    const scored = FODMAP_DATA.map((item) => {
      const name = normalize(item.name);
      let overlap = 0;
      for (const ch of new Set(query)) {
        if (name.includes(ch)) overlap++;
      }
      const lengthPenalty = Math.abs(name.length - query.length) * 0.05;
      return { item, score: overlap - lengthPenalty };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, max).map((s) => s.item);
  }

  function renderSuggestions(items) {
    suggestionsEl.innerHTML = "";
    if (items.length === 0) {
      suggestionsEl.hidden = true;
      return;
    }
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = item.name;
      li.className = "suggestion-item";
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        searchInput.value = item.name;
        selectItem(item);
      });
      suggestionsEl.appendChild(li);
    }
    suggestionsEl.hidden = false;
  }

  function renderResult(item) {
    emptyStateEl.hidden = true;
    const meta = VERDICT_META[item.verdict];
    const fodmapsHtml = item.fodmaps && item.fodmaps.length
      ? `<div class="detail-row"><span class="detail-label">Contains</span><span>${item.fodmaps.join(", ")}</span></div>`
      : "";
    const notesHtml = item.notes
      ? `<div class="detail-row"><span class="detail-label">Notes</span><span>${item.notes}</span></div>`
      : "";

    resultEl.innerHTML = `
      <div class="result-card ${meta.className}">
        <div class="result-header">
          <span class="verdict-badge">${meta.icon} ${meta.label}</span>
          <span class="category-tag">${item.category}</span>
        </div>
        <h2 class="food-name">${item.name}</h2>
        <p class="verdict-summary">${meta.summary}</p>
        <div class="detail-row"><span class="detail-label">Safe serving</span><span>${item.serving}</span></div>
        ${fodmapsHtml}
        ${notesHtml}
      </div>
    `;
    resultEl.hidden = false;
  }

  function renderNotFound(query) {
    emptyStateEl.hidden = true;
    const suggestions = findClosest(normalize(query));
    const list = suggestions
      .map((item) => `<li class="closest-item" data-name="${item.name.replace(/"/g, "&quot;")}">${item.name}</li>`)
      .join("");
    resultEl.innerHTML = `
      <div class="result-card verdict-unknown">
        <div class="result-header">
          <span class="verdict-badge">❔ Not in database</span>
        </div>
        <p class="verdict-summary">"${query}" isn't in this list yet. Did you mean:</p>
        <ul class="closest-list">${list}</ul>
        <p class="hint">Check the <a href="https://www.monashfodmap.com/" target="_blank" rel="noopener noreferrer">Monash FODMAP app</a> for foods not covered here.</p>
      </div>
    `;
    resultEl.hidden = false;
    resultEl.querySelectorAll(".closest-item").forEach((li) => {
      li.addEventListener("click", () => {
        const item = FODMAP_DATA.find((f) => f.name === li.dataset.name);
        if (item) {
          searchInput.value = item.name;
          selectItem(item);
        }
      });
    });
  }

  function selectItem(item) {
    suggestionsEl.hidden = true;
    renderResult(item);
  }

  function handleInput() {
    const raw = searchInput.value;
    const query = normalize(raw);

    if (!query) {
      suggestionsEl.hidden = true;
      resultEl.hidden = true;
      emptyStateEl.hidden = false;
      return;
    }

    const matchList = findMatches(query);
    renderSuggestions(matchList);

    const exact = FODMAP_DATA.find((item) => searchableTerms(item).includes(query));
    if (exact) {
      renderResult(exact);
    } else if (matchList.length === 1) {
      renderResult(matchList[0]);
    } else if (matchList.length === 0) {
      renderNotFound(raw.trim());
    } else {
      emptyStateEl.hidden = true;
      resultEl.hidden = true;
    }
  }

  function handleEnter(e) {
    if (e.key !== "Enter") return;
    const query = normalize(searchInput.value);
    if (!query) return;
    const matchList = findMatches(query);
    if (matchList.length > 0) {
      searchInput.value = matchList[0].name;
      selectItem(matchList[0]);
    } else {
      renderNotFound(searchInput.value.trim());
    }
  }

  searchInput.addEventListener("input", handleInput);
  searchInput.addEventListener("keydown", handleEnter);
  searchInput.addEventListener("blur", () => {
    setTimeout(() => (suggestionsEl.hidden = true), 100);
  });
  searchInput.addEventListener("focus", handleInput);

  // ---- Search / Scan mode toggle ----
  const modeSearchBtn = document.getElementById("mode-search");
  const modeScanBtn = document.getElementById("mode-scan");
  const searchPanel = document.getElementById("search-panel");
  const scanPanel = document.getElementById("scan-panel");

  function setMode(mode) {
    const isSearch = mode === "search";
    modeSearchBtn.classList.toggle("active", isSearch);
    modeScanBtn.classList.toggle("active", !isSearch);
    modeSearchBtn.setAttribute("aria-selected", String(isSearch));
    modeScanBtn.setAttribute("aria-selected", String(!isSearch));
    searchPanel.hidden = !isSearch;
    scanPanel.hidden = isSearch;
    resultEl.hidden = true;

    if (isSearch) {
      handleInput();
    } else if (window.stopBarcodeScanning) {
      window.stopBarcodeScanning();
    }
  }

  modeSearchBtn.addEventListener("click", () => setMode("search"));
  modeScanBtn.addEventListener("click", () => setMode("scan"));
})();
