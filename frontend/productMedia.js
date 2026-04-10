const SVG_IMAGE_COUNT = 6;
const SAFE_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='640' height='420' viewBox='0 0 640 420'%3E%3Crect width='640' height='420' fill='%23eef3ff'/%3E%3Ctext x='50%25' y='50%25' fill='%23546c9b' font-family='Inter%2CArial%2Csans-serif' font-size='28' text-anchor='middle' dominant-baseline='middle'%3ENexBasket Product%3C/text%3E%3C/svg%3E";

const REAL_IMAGE_BY_SKU = {
  "ELEC-001": "assets/products/real/ELEC-001.jpg",
  "ELEC-002": "assets/products/real/ELEC-002.jpg",
  "ELEC-003": "assets/products/real/ELEC-003.jpg",
  "ELEC-004": "assets/products/real/ELEC-004.jpg",
  "HOME-001": "assets/products/real/HOME-001.jpg",
  "HOME-002": "assets/products/real/HOME-002.jpg",
  "HOME-003": "assets/products/real/HOME-003.jpg",
  "HOME-004": "assets/products/real/HOME-004.jpg",
  "BOOK-001": "assets/products/real/BOOK-001.jpg",
  "BOOK-002": "assets/products/real/BOOK-002.jpg",
  "BOOK-003": "assets/products/real/BOOK-003.jpg",
  "BOOK-004": "assets/products/real/BOOK-004.jpg",
  "FASH-001": "assets/products/real/FASH-001.jpg",
  "FASH-002": "assets/products/real/FASH-002.jpg",
  "FASH-003": "assets/products/real/FASH-003.jpg",
  "FASH-004": "assets/products/real/FASH-004.jpg",
  "SPORT-001": "assets/products/real/SPORT-001.jpg",
  "SPORT-002": "assets/products/real/SPORT-002.jpg",
  "SPORT-003": "assets/products/real/SPORT-003.jpg",
  "SPORT-004": "assets/products/real/SPORT-004.jpg",
  "BEAU-001": "assets/products/real/BEAU-001.jpg",
  "BEAU-002": "assets/products/real/BEAU-002.jpg",
  "BEAU-003": "assets/products/real/BEAU-003.jpg",
  "BEAU-004": "assets/products/real/BEAU-004.jpg",
};

const CATEGORY_IMAGE_SETS = {
  electronics: [
    "assets/products/real/ELEC-001.jpg",
    "assets/products/real/ELEC-002.jpg",
    "assets/products/real/ELEC-003.jpg",
    "assets/products/real/ELEC-004.jpg",
  ],
  home: [
    "assets/products/real/HOME-001.jpg",
    "assets/products/real/HOME-002.jpg",
    "assets/products/real/HOME-003.jpg",
    "assets/products/real/HOME-004.jpg",
  ],
  books: [
    "assets/products/real/BOOK-001.jpg",
    "assets/products/real/BOOK-002.jpg",
    "assets/products/real/BOOK-003.jpg",
    "assets/products/real/BOOK-004.jpg",
  ],
  fashion: [
    "assets/products/real/FASH-001.jpg",
    "assets/products/real/FASH-002.jpg",
    "assets/products/real/FASH-003.jpg",
    "assets/products/real/FASH-004.jpg",
  ],
  sports: [
    "assets/products/real/SPORT-001.jpg",
    "assets/products/real/SPORT-002.jpg",
    "assets/products/real/SPORT-003.jpg",
    "assets/products/real/SPORT-004.jpg",
  ],
  beauty: [
    "assets/products/real/BEAU-001.jpg",
    "assets/products/real/BEAU-002.jpg",
    "assets/products/real/BEAU-003.jpg",
    "assets/products/real/BEAU-004.jpg",
  ],
};

function normalizedIndex(seed, count = SVG_IMAGE_COUNT) {
  const num = Number(seed || 1);
  return ((Math.abs(num) - 1) % count) + 1;
}

function normalizeSku(rawSku) {
  return String(rawSku || "").trim().toUpperCase();
}

function asProductRef(productLike) {
  if (typeof productLike === "number" || typeof productLike === "string") {
    return { product_id: Number(productLike || 1) };
  }
  return productLike || {};
}

function getSvgFallback(seed) {
  const idx = normalizedIndex(seed);
  return `assets/products/p${idx}.svg`;
}

function getCategoryKey(product) {
  const sku = normalizeSku(product.sku);
  if (sku.startsWith("ELEC-")) return "electronics";
  if (sku.startsWith("HOME-")) return "home";
  if (sku.startsWith("BOOK-")) return "books";
  if (sku.startsWith("FASH-")) return "fashion";
  if (sku.startsWith("SPORT-")) return "sports";
  if (sku.startsWith("BEAU-")) return "beauty";

  const text = `${product.category_name || ""} ${product.product_name || ""} ${product.description || ""}`.toLowerCase();
  if (text.includes("electr")) return "electronics";
  if (text.includes("home") || text.includes("kitchen")) return "home";
  if (text.includes("book") || text.includes("sql") || text.includes("dbms")) return "books";
  if (text.includes("fashion") || text.includes("shirt") || text.includes("jeans") || text.includes("shoes")) return "fashion";
  if (text.includes("sport") || text.includes("yoga") || text.includes("racket") || text.includes("football")) return "sports";
  if (text.includes("beauty") || text.includes("serum") || text.includes("sunscreen") || text.includes("lotion")) return "beauty";
  return null;
}

function categoryImageFallback(product) {
  const categoryKey = getCategoryKey(product);
  const set = categoryKey ? CATEGORY_IMAGE_SETS[categoryKey] : null;
  if (!set?.length) return null;
  const idx = normalizedIndex(product.product_id || product.product_name?.length || 1, set.length) - 1;
  return set[idx];
}

export function getProductImage(productLike) {
  const product = asProductRef(productLike);
  const sku = normalizeSku(product.sku);
  if (sku && REAL_IMAGE_BY_SKU[sku]) return REAL_IMAGE_BY_SKU[sku];
  return categoryImageFallback(product) || getSvgFallback(product.product_id || product.product_name?.length || 1);
}

export function getProductImageSources(productLike) {
  const product = asProductRef(productLike);
  const primary = getProductImage(product);
  const svgFallback = getSvgFallback(product.product_id || product.product_name?.length || 1);
  return [primary, svgFallback, SAFE_PLACEHOLDER];
}

export function getSafeProductPlaceholder() {
  return SAFE_PLACEHOLDER;
}

export function bindImageFallbacks(root = document) {
  root.querySelectorAll("img[data-fallback-chain]").forEach((img) => {
    if (img.dataset.fallbackBound === "true") return;
    img.dataset.fallbackBound = "true";
    const chain = img.dataset.fallbackChain.split("|").filter(Boolean);
    let idx = 0;
    img.addEventListener("error", () => {
      idx += 1;
      if (idx < chain.length) {
        img.src = chain[idx];
      }
    });
  });
}

export function getProductGallery(productLike) {
  const product = asProductRef(productLike);
  const primary = getProductImage(product);
  const categoryKey = getCategoryKey(product);
  const set = categoryKey ? CATEGORY_IMAGE_SETS[categoryKey] || [] : [];
  const gallery = [primary, ...set.filter((src) => src !== primary)];
  const svgSeed = product.product_id || product.product_name?.length || 1;
  for (let i = 0; gallery.length < 4; i += 1) {
    const idx = normalizedIndex(svgSeed + i);
    const svg = `assets/products/p${idx}.svg`;
    if (!gallery.includes(svg)) {
      gallery.push(svg);
    }
  }
  return gallery.slice(0, 4);
}
