// Keyword-based FODMAP screening for packaged-food ingredient lists (used by the
// barcode scanner). This is a much blunter tool than the curated FODMAP_DATA
// database: it just flags known high/moderate-FODMAP ingredient names if they
// appear in a product's ingredient text. A "clean" result means no known trigger
// words were found — it does NOT mean the product has been verified low FODMAP.
const INGREDIENT_TRIGGERS = [
  { keyword: "garlic", verdict: "high", fodmap: "Fructans" },
  { keyword: "onion", verdict: "high", fodmap: "Fructans" },
  { keyword: "shallot", verdict: "high", fodmap: "Fructans" },
  { keyword: "leek", verdict: "high", fodmap: "Fructans" },
  { keyword: "chicory", verdict: "high", fodmap: "Fructans (inulin)" },
  { keyword: "inulin", verdict: "high", fodmap: "Fructans" },
  { keyword: "fructo-oligosaccharide", verdict: "high", fodmap: "Fructans" },
  { keyword: "fos", verdict: "high", fodmap: "Fructans" },
  { keyword: "wheat", verdict: "high", fodmap: "Fructans" },
  { keyword: "rye", verdict: "high", fodmap: "Fructans" },
  { keyword: "barley", verdict: "high", fodmap: "Fructans" },
  { keyword: "honey", verdict: "high", fodmap: "Excess fructose" },
  { keyword: "high fructose corn syrup", verdict: "high", fodmap: "Excess fructose" },
  { keyword: "agave", verdict: "high", fodmap: "Excess fructose" },
  { keyword: "sorbitol", verdict: "high", fodmap: "Polyols" },
  { keyword: "mannitol", verdict: "high", fodmap: "Polyols" },
  { keyword: "xylitol", verdict: "high", fodmap: "Polyols" },
  { keyword: "maltitol", verdict: "high", fodmap: "Polyols" },
  { keyword: "isomalt", verdict: "high", fodmap: "Polyols" },
  { keyword: "milk", verdict: "moderate", fodmap: "Lactose" },
  { keyword: "milk powder", verdict: "moderate", fodmap: "Lactose" },
  { keyword: "whey", verdict: "moderate", fodmap: "Lactose" },
  { keyword: "lactose", verdict: "high", fodmap: "Lactose" },
  { keyword: "cream", verdict: "moderate", fodmap: "Lactose" },
  { keyword: "condensed milk", verdict: "high", fodmap: "Lactose" },
  { keyword: "soy flour", verdict: "moderate", fodmap: "GOS" },
  { keyword: "chickpea flour", verdict: "moderate", fodmap: "GOS" },
  { keyword: "lentil flour", verdict: "moderate", fodmap: "GOS" },
  { keyword: "cashew", verdict: "moderate", fodmap: "GOS" },
  { keyword: "pistachio", verdict: "moderate", fodmap: "Fructans" },
  { keyword: "apple juice concentrate", verdict: "high", fodmap: "Excess fructose" },
  { keyword: "pear juice concentrate", verdict: "high", fodmap: "Excess fructose" },
];

// Products flagged "moderate" only tip to a concern if the keyword shows up early
// in the ingredient list (i.e. it's a major component, not a trace flavoring).
function screenIngredients(ingredientsText) {
  const text = (ingredientsText || "").toLowerCase();
  if (!text) return { verdict: "unknown", hits: [] };

  const hits = [];
  for (const trigger of INGREDIENT_TRIGGERS) {
    const idx = text.indexOf(trigger.keyword);
    if (idx !== -1) {
      hits.push({ ...trigger, position: idx });
    }
  }

  if (hits.length === 0) {
    return { verdict: "low", hits: [] };
  }

  const hasHigh = hits.some((h) => h.verdict === "high");
  return { verdict: hasHigh ? "high" : "moderate", hits };
}
