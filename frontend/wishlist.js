const WISHLIST_KEY = "wishlistProductIds";

function normalizeIds(value) {
  if (!Array.isArray(value)) return [];
  const unique = new Set();
  value.forEach((id) => {
    const num = Number(id);
    if (Number.isInteger(num) && num > 0) unique.add(num);
  });
  return Array.from(unique);
}

function saveWishlistIds(ids) {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(normalizeIds(ids)));
}

export function getWishlistIds() {
  const raw = localStorage.getItem(WISHLIST_KEY);
  if (!raw) return [];
  try {
    return normalizeIds(JSON.parse(raw));
  } catch (_) {
    return [];
  }
}

export function isWishlisted(productId) {
  const id = Number(productId);
  return getWishlistIds().includes(id);
}

export function toggleWishlist(productId) {
  const id = Number(productId);
  if (!Number.isInteger(id) || id <= 0) return { active: false, ids: getWishlistIds() };

  const ids = new Set(getWishlistIds());
  if (ids.has(id)) {
    ids.delete(id);
    const next = Array.from(ids);
    saveWishlistIds(next);
    return { active: false, ids: next };
  }

  ids.add(id);
  const next = Array.from(ids);
  saveWishlistIds(next);
  return { active: true, ids: next };
}

function applyHeartState(button, active) {
  button.classList.toggle("is-active", active);
  button.textContent = active ? "♥" : "♡";
  button.setAttribute("aria-pressed", String(active));
}

export function bindWishlistHeartButtons(root = document, options = {}) {
  const { onToggle } = options;
  root.querySelectorAll(".wish-btn[data-product-id]").forEach((button) => {
    const productId = Number(button.dataset.productId || 0);
    applyHeartState(button, isWishlisted(productId));
    if (button.dataset.wishlistBound === "true") return;

    button.dataset.wishlistBound = "true";
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const result = toggleWishlist(productId);
      applyHeartState(button, result.active);
      if (typeof onToggle === "function") {
        onToggle({ productId, active: result.active, count: result.ids.length });
      }
    });
  });
}

export function setWishlistCtaState(button, productId) {
  const active = isWishlisted(productId);
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
  button.textContent = active ? "Wishlisted" : "Add to Wishlist";
}
