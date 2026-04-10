const IMAGE_COUNT = 6;

function normalizedIndex(seed) {
  const num = Number(seed || 1);
  return ((Math.abs(num) - 1) % IMAGE_COUNT) + 1;
}

export function getProductImage(productId) {
  const idx = normalizedIndex(productId);
  return `assets/products/p${idx}.svg`;
}

export function getProductGallery(productId) {
  const base = normalizedIndex(productId);
  const result = [];
  for (let i = 0; i < 4; i += 1) {
    const idx = ((base + i - 1) % IMAGE_COUNT) + 1;
    result.push(`assets/products/p${idx}.svg`);
  }
  return result;
}
