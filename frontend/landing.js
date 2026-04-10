import { apiFetch, getActiveUser } from "./api.js";
import { bindImageFallbacks, getProductImageSources } from "./productMedia.js";
import { initRevealAnimations, refreshCartBadge, renderFooter, renderNavbar, showStatus } from "./ui.js";
import { bindWishlistHeartButtons } from "./wishlist.js";

renderNavbar("home");
renderFooter();
initRevealAnimations();

const featuredProductsEl = document.getElementById("featuredProducts");
const categoryChipsEl = document.getElementById("landingCategoryChips");
const newsletterForm = document.getElementById("newsletterForm");
const newsletterStatus = document.getElementById("newsletterStatus");

function ratingForProduct(productId) {
  return 3.8 + ((productId * 37) % 12) / 10;
}

function starRow(rating) {
  const rounded = Math.round(rating);
  return "★★★★★".slice(0, rounded) + "☆☆☆☆☆".slice(0, 5 - rounded);
}

function renderProductCard(product, userLoggedIn) {
  const rating = ratingForProduct(product.product_id);
  const [primaryImage, fallbackSvg, safePlaceholder] = getProductImageSources(product);
  return `
    <article class="product-card" data-reveal>
      <div class="product-media">
        <button class="wish-btn" data-product-id="${product.product_id}" aria-label="Add ${product.product_name} to wishlist">♡</button>
        <img
          class="product-image"
          src="${primaryImage}"
          alt="${product.product_name}"
          loading="lazy"
          data-fallback-chain="${primaryImage}|${fallbackSvg}|${safePlaceholder}"
        />
        <button class="btn btn-primary quick-add" data-action="quick-add" data-product-id="${product.product_id}">
          ${userLoggedIn ? "Add to cart" : "Login to add"}
        </button>
      </div>
      <div class="product-body">
        <div class="product-row">
          <strong>${product.product_name}</strong>
          <span class="pill">${product.category_name}</span>
        </div>
        <div class="product-row">
          <span class="stars" aria-label="${rating.toFixed(1)} stars">${starRow(rating)}</span>
          <span class="muted">${rating.toFixed(1)}</span>
        </div>
        <div class="product-row card-action-row">
          <strong>₹${Number(product.price).toFixed(2)}</strong>
          <a class="muted" href="product.html?id=${product.product_id}">View details</a>
        </div>
      </div>
    </article>
  `;
}

async function loadLandingData() {
  featuredProductsEl.innerHTML = `
    <div class="skeleton sk-card"></div>
    <div class="skeleton sk-card"></div>
    <div class="skeleton sk-card"></div>
  `;

  try {
    const [categoriesData, productsData] = await Promise.all([
      apiFetch("/categories"),
      apiFetch("/products?in_stock_only=true&sort=price_desc"),
    ]);

    const categories = categoriesData?.categories || [];
    const products = (productsData?.products || []).slice(0, 4);
    const user = getActiveUser();
    const featured = products.length
      ? products
      : [
          { product_name: "Signature Everyday Tote", category_name: "Fashion", price: 1499, product_id: 1 },
          { product_name: "Smart Desk Lamp", category_name: "Home", price: 2199, product_id: 2 },
          { product_name: "Wireless Earbuds", category_name: "Electronics", price: 3299, product_id: 3 },
          { product_name: "Hydration Bottle Pro", category_name: "Sports", price: 999, product_id: 4 },
        ];

    categoryChipsEl.innerHTML = categories
      .map((category, index) => {
        const iconSet = ["⌚", "📱", "🎧", "🧥", "🏠", "🧴", "💡", "🖥️"];
        return `<a class="chip" href="products.html?category_id=${category.category_id}">${iconSet[index % iconSet.length]} ${category.category_name}</a>`;
      })
      .join("");

    featuredProductsEl.innerHTML = featured.map((product) => renderProductCard(product, Boolean(user?.user_id))).join("");
    bindWishlistHeartButtons(featuredProductsEl, {
      onToggle: ({ active }) => {
        showStatus(newsletterStatus, active ? "Added to wishlist." : "Removed from wishlist.", "success");
      },
    });

    bindImageFallbacks(featuredProductsEl);

    featuredProductsEl.querySelectorAll("[data-action='quick-add']").forEach((button) => {
      button.addEventListener("click", async () => {
        const productId = Number(button.dataset.productId);
        if (!user?.user_id) {
          window.location.href = "login.html";
          return;
        }
        try {
          await apiFetch("/cart/items", {
            method: "POST",
            body: JSON.stringify({ product_id: productId, quantity: 1 }),
          });
          await refreshCartBadge();
          showStatus(newsletterStatus, "Added to cart successfully.", "success");
        } catch (error) {
          showStatus(newsletterStatus, error.message, "error");
        }
      });
    });

    initRevealAnimations();
  } catch (error) {
    const fallbackCards = [
      { product_name: "Signature Everyday Tote", category_name: "Fashion", price: 1499, product_id: 1 },
      { product_name: "Smart Desk Lamp", category_name: "Home", price: 2199, product_id: 2 },
      { product_name: "Wireless Earbuds", category_name: "Electronics", price: 3299, product_id: 3 },
      { product_name: "Hydration Bottle Pro", category_name: "Sports", price: 999, product_id: 4 },
    ];
    featuredProductsEl.innerHTML = fallbackCards.map((product) => renderProductCard(product, false)).join("");
    bindImageFallbacks(featuredProductsEl);
    showStatus(newsletterStatus, error.message, "error");
  }
}

newsletterForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  const email = document.getElementById("newsletterEmail").value.trim();
  if (!email.includes("@")) {
    showStatus(newsletterStatus, "Please enter a valid email address.", "error");
    return;
  }
  newsletterForm.reset();
  showStatus(newsletterStatus, "Subscribed. You will receive weekly product drops.", "success");
});

await loadLandingData();
