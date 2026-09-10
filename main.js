/* =====================================================================
   HYP3 PERFUME — main.js
   Single source of truth for the product catalog + all site behaviour:
   rendering, cart, favorites, search, mobile nav, auth, WhatsApp checkout.
   ===================================================================== */

/* ---------------------------------------------------------------------
   CONFIG — edit these two lines to point checkout at your real number
   --------------------------------------------------------------------- */
const WHATSAPP_NUMBER = "201002207754"; // international format, no + or 00
// Shipping is now location-based (see LOCATION-BASED SHIPPING section
// below) — this flat value is only the fallback used if a visitor
// somehow reaches a page with no location saved yet.
const SHIPPING_FEE_FALLBACK = 100; // EGP

// Your shop's coordinates — set these precisely to your real address.
// Default below is an approximate Ain Shams, Cairo location; replace it.
const SHOP_LOCATION = { lat: 30.1288, lng: 31.3196 };

// Delivery pricing formula: base fee + per-km rate, straight-line distance.
const SHIPPING_BASE_FEE = 30;   // EGP, flat part of every delivery
const SHIPPING_PER_KM = 2.5;    // EGP per km from the shop
const SHIPPING_MIN_FEE = 50;    // EGP, floor even for very close addresses

// Manual fallback for visitors who deny location access — rough
// per-governorate flat rates. Adjust freely.
const CITY_SHIPPING_FALLBACK = {
  "Cairo": 60,
  "Giza": 65,
  "Alexandria": 90,
  "Qalyubia": 70,
  "Other": 120,
};

/* ---------------------------------------------------------------------
   LOCATION-BASED SHIPPING
   --------------------------------------------------------------------- */
function haversineDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getShippingFee() {
  const saved = JSON.parse(localStorage.getItem("HYP3_shipping") || "null");
  if (saved && typeof saved.fee === "number") return saved.fee;
  return SHIPPING_FEE_FALLBACK;
}

function setShippingFromCoords(lat, lng) {
  const distanceKm = haversineDistanceKm(SHOP_LOCATION.lat, SHOP_LOCATION.lng, lat, lng);
  const fee = Math.max(SHIPPING_MIN_FEE, SHIPPING_BASE_FEE + distanceKm * SHIPPING_PER_KM);
  const rounded = Math.round(fee);
  localStorage.setItem("HYP3_shipping", JSON.stringify({
    fee: rounded, distanceKm: Math.round(distanceKm * 10) / 10, method: "gps",
  }));
  return rounded;
}

function setShippingFromCity(city) {
  const fee = CITY_SHIPPING_FALLBACK[city] ?? CITY_SHIPPING_FALLBACK["Other"];
  localStorage.setItem("HYP3_shipping", JSON.stringify({ fee, city, method: "manual" }));
  return fee;
}

function hasShippingSet() {
  return !!localStorage.getItem("HYP3_shipping");
}

function returnAfterLocation() {
  const dest = sessionStorage.getItem("HYP3_return_to") || "index.html";
  sessionStorage.removeItem("HYP3_return_to");
  window.location.href = dest;
}

function locateMe() {
  const statusEl = document.getElementById("location-status");
  if (!navigator.geolocation) {
    if (statusEl) statusEl.innerText = "Location isn't supported on this device — pick your city manually below.";
    return;
  }
  if (statusEl) statusEl.innerText = "Getting your location...";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const fee = setShippingFromCoords(pos.coords.latitude, pos.coords.longitude);
      if (statusEl) statusEl.innerText = `Delivery fee set: ${fee} EGP. Redirecting...`;
      toast(`Delivery fee set to ${fee} EGP based on your location.`, "fa-solid fa-location-dot");
      setTimeout(returnAfterLocation, 900);
    },
    () => {
      if (statusEl) statusEl.innerText = "Couldn't get your location — pick your city manually below instead.";
    }
  );
}

function selectCityManually() {
  const select = document.getElementById("city-select");
  if (!select || !select.value) return;
  const fee = setShippingFromCity(select.value);
  toast(`Delivery fee set to ${fee} EGP for ${select.value}.`, "fa-solid fa-location-dot");
  setTimeout(returnAfterLocation, 700);
}

function enforceLocationGate() {
  const onLoginPage = window.location.pathname.endsWith("login.html");
  const onCartPage = window.location.pathname.endsWith("cart.html");
  // Browsing the shop, product pages, about, contact, etc. never requires
  // a location — only checking out does, since that's the only place the
  // delivery fee actually matters.
  if (onCartPage && !onLoginPage && !hasShippingSet()) {
    sessionStorage.setItem("HYP3_return_to", window.location.pathname.split("/").pop());
    window.location.href = "login.html";
  }
}

/* ---------------------------------------------------------------------
   PROMO CODES — add more codes here as needed: "CODE": discount fraction
   --------------------------------------------------------------------- */
const PROMO_CODES = {
  "ALIX99": 0.20, // 20% off
};
let appliedPromo = JSON.parse(localStorage.getItem("HYP3_promo")) || null;

/* ---------------------------------------------------------------------
   PRODUCT CATALOG — single source of truth for every page
   --------------------------------------------------------------------- */
const PRODUCTS = [
  // Women's and Men's fragrances alternating, as requested — 12 of each.
  { id: 1, name: "HYP3 Rose", category: "Women", image: "img/products/hyp3-rose.svg",
    rating: 5, notes: ["Damask Rose", "Vanilla"],
    desc: "A soft embrace of damask rose warmed by vanilla — romantic, warm, and effortlessly feminine.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 2, name: "Billionaire", category: "Men", image: "img/products/billionaire.svg",
    rating: 5, notes: ["Warm Cinnamon", "Aged Wood"],
    desc: "Warm cinnamon settling over aged, noble woods — heavy, oriental, and unmistakably confident.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 3, name: "Rosyer", category: "Women", image: "img/products/rosyer.svg",
    rating: 4, notes: ["Dewy Rose Petals", "Cranberry"],
    desc: "Dew-kissed rose petals brightened with tart cranberry — a fresh, modern take on a classic rose.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 4, name: "Velkris", category: "Men", image: "img/products/velkris.svg",
    rating: 4, notes: ["Fresh Pineapple", "Smoked Cedar"],
    desc: "Fresh pineapple over smoked cedarwood — a fruity-woody scent built for summer.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 5, name: "Aurelia Bloom", category: "Women", image: "img/products/aurelia-bloom.svg",
    rating: 5, notes: ["Pure Jasmine", "White Frangipani"],
    desc: "Pure jasmine in full bloom, softened by white frangipani — intoxicating without being heavy.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 6, name: "Zenthro", category: "Men", image: "img/products/zenthro.svg",
    rating: 4, notes: ["Sea Salt", "Lemon"],
    desc: "Refreshing sea salt and lemon — clean, aquatic, and effortlessly cool.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 7, name: "Celestia", category: "Women", image: "img/products/celestia.svg",
    rating: 5, notes: ["Liquid Amber", "Velvet Musk"],
    desc: "Warm liquid amber wrapped in velvet musk — a heavy, luxurious scent built for evening.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 8, name: "Targenix", category: "Men", image: "img/products/targenix.svg",
    rating: 4, notes: ["Fresh Grapefruit", "Vetiver"],
    desc: "Sharp grapefruit grounded in vetiver — citrus energy with real depth.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 9, name: "Luvira", category: "Women", image: "img/products/luvira.svg",
    rating: 4, notes: ["Iris Powder", "Warm Caramel"],
    desc: "Powdery iris meets warm caramel — sweet, soft, and lingering.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 10, name: "Luxeron", category: "Men", image: "img/products/luxeron.svg",
    rating: 5, notes: ["Oriental Oud", "Fine Leather"],
    desc: "Rich oud layered over fine leather — heavy, opulent, made for occasions that matter.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 11, name: "Sweet Berry", category: "Women", image: "img/products/sweet-berry.svg",
    rating: 4, notes: ["Wild Strawberry", "Red Berries"],
    desc: "Crisp wild strawberry and red berries — a bright, playful summer fruit blend.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 12, name: "Silvaris", category: "Men", image: "img/products/silvaris.svg",
    rating: 4, notes: ["Green Tea Leaves", "Calm Sandalwood"],
    desc: "Green tea and calm sandalwood — quiet, composed, ideal for the office.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 13, name: "Elivara", category: "Women", image: "img/products/elivara.svg",
    rating: 4, notes: ["French Lavender", "Orange Blossom"],
    desc: "French lavender fields meet delicate orange blossom — herbal, floral, and calming.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 14, name: "HYP3 Men", category: "Men", image: "img/products/hyp3-men.svg",
    rating: 4, notes: ["Cool Mint", "Cedar Smoke"],
    desc: "Cool mint over smoky cedar — sharp, magnetic, unmistakably present.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 15, name: "Aryra", category: "Women", image: "img/products/aryra.svg",
    rating: 5, notes: ["Coconut Milk", "White Florals"],
    desc: "Silky coconut milk layered with white florals — creamy, warm, and comforting.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 16, name: "Noctyron", category: "Men", image: "img/products/noctyron.svg",
    rating: 5, notes: ["Cardamom", "Aromatic Woods"],
    desc: "Warm cardamom and aromatic woods — a spiced, nocturnal scent for late nights.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 17, name: "Florayne", category: "Women", image: "img/products/florayne.svg",
    rating: 5, notes: ["Peony", "Water Pear"],
    desc: "Peony in bloom with juicy water pear — feminine, fresh, and effortlessly elegant.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 18, name: "Dravonix", category: "Men", image: "img/products/dravonix.svg",
    rating: 4, notes: ["Black Pepper", "Woody Resins"],
    desc: "Fiery black pepper over woody resins — bold, spiced, not for the faint-hearted.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 19, name: "Blush Era", category: "Women", image: "img/products/blush-era.svg",
    rating: 5, notes: ["Clean Powder", "Creamy White Musk"],
    desc: "Clean powder and creamy white musk — soft as skin, perfect for every day.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 20, name: "Xyron Black", category: "Men", image: "img/products/xyron-black.svg",
    rating: 5, notes: ["Bitter Almond", "Dark Berries"],
    desc: "Bitter almond and dark berries — mysterious and magnetic, built for the night.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 21, name: "White Valley", category: "Women", image: "img/products/white-valley.svg",
    rating: 4, notes: ["Clean Cotton", "Pure Musk"],
    desc: "Clean cotton and pure musk — simple, fresh, and effortlessly put-together.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 22, name: "Krylonis", category: "Men", image: "img/products/krylonis.svg",
    rating: 4, notes: ["Green Mint", "Sweet Tonka Bean"],
    desc: "Green mint and sweet tonka bean — fresh and warm at the same time.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 23, name: "Suger Cube", category: "Women", image: "img/products/suger-cube.svg",
    rating: 4, notes: ["Burnt Sugar", "Cotton Candy", "Vanilla"],
    desc: "Burnt sugar, cotton candy, and vanilla — a sweet, playful gourmand.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
  { id: 24, name: "Azureon", category: "Men", image: "img/products/azureon.svg",
    rating: 4, notes: ["Salty Sea Breeze", "Green Juniper"],
    desc: "Salty sea breeze and green juniper — loud, aquatic, built for summer.",
    sizes: [{ label: "30 ML", price: 96.03 }, { label: "50 ML", price: 143.33 }] },
];

function getProduct(id) { return PRODUCTS.find(p => p.id == id); }
function starIcons(rating) {
  let html = "";
  for (let i = 0; i < 5; i++) html += `<i class="fa-solid fa-star" style="opacity:${i < rating ? 1 : .25}"></i>`;
  return html;
}

/* ---------------------------------------------------------------------
   STORAGE
   --------------------------------------------------------------------- */
let cart = JSON.parse(localStorage.getItem("HYP3_cart")) || [];
let favorites = JSON.parse(localStorage.getItem("HYP3_favs")) || [];
let users = JSON.parse(localStorage.getItem("HYP3_users")) || [];

function saveCart() { localStorage.setItem("HYP3_cart", JSON.stringify(cart)); updateCartBadge(); }
function saveFavs() { localStorage.setItem("HYP3_favs", JSON.stringify(favorites)); }

/* ---------------------------------------------------------------------
   TOAST — replaces alert() with a small on-brand notice
   --------------------------------------------------------------------- */
function toast(message, icon = "fa-solid fa-circle-check") {
  let stack = document.getElementById("toast-stack");
  if (!stack) {
    stack = document.createElement("div");
    stack.id = "toast-stack";
    document.body.appendChild(stack);
  }
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<i class="${icon}"></i><span>${message}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.classList.add("fade");
    setTimeout(() => el.remove(), 320);
  }, 2600);
}

/* ---------------------------------------------------------------------
   CART BADGE (nav icon count)
   --------------------------------------------------------------------- */
function updateCartBadge() {
  const totalQty = cart.reduce((sum, i) => sum + i.quantity, 0);
  document.querySelectorAll(".cart-count").forEach(el => {
    el.textContent = totalQty;
    el.style.display = totalQty > 0 ? "flex" : "none";
  });
}

/* ---------------------------------------------------------------------
   CART OPERATIONS
   --------------------------------------------------------------------- */
function addToCart(cartKey, name, price, image, quantity) {
  quantity = parseInt(quantity) || 1;
  const existing = cart.find(item => item.cartKey === cartKey);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ cartKey, name, price, image, quantity });
  }
  saveCart();
  toast(`${name} added to your bag`);
  if (document.getElementById("cart-content")) renderCart();
}

function removeFromCart(cartKey) {
  cart = cart.filter(item => item.cartKey !== cartKey);
  saveCart();
  renderCart();
}

function updateQuantity(cartKey, newQty) {
  newQty = parseInt(newQty);
  if (newQty < 1) newQty = 1;
  const item = cart.find(i => i.cartKey === cartKey);
  if (item) { item.quantity = newQty; saveCart(); renderCart(); }
}

function renderCart() {
  const el = document.getElementById("cart-content");
  if (!el) return;

  const statusEl = document.getElementById("promo-status");

  if (cart.length === 0) {
    el.innerHTML = `<tr><td colspan="6"><div class="empty-state"><i class="fa-solid fa-basket-shopping"></i>Your bag is waiting for its first HYP3 bottle.</div></td></tr>`;
    document.getElementById("items-subtotal").innerText = "0 EG";
    if (document.getElementById("shipping-fee")) document.getElementById("shipping-fee").innerText = getShippingFee() + " EG";
    document.getElementById("final-total").innerText = getShippingFee() + " EG";
    return;
  }

  let subtotal = 0;
  el.innerHTML = cart.map(item => {
    const lineTotal = item.price * item.quantity;
    subtotal += lineTotal;
    return `<tr>
      <td><i class="fa-regular fa-circle-xmark" onclick="removeFromCart('${item.cartKey}')"></i></td>
      <td><img src="${item.image}" alt="${item.name}"></td>
      <td class="p-name">${item.name}</td>
      <td>${item.price} EG</td>
      <td><input type="number" value="${item.quantity}" min="1" onchange="updateQuantity('${item.cartKey}', this.value)"></td>
      <td>${lineTotal} EG</td>
    </tr>`;
  }).join("");

  let discount = 0;
  if (appliedPromo && PROMO_CODES[appliedPromo.code]) {
    discount = subtotal * PROMO_CODES[appliedPromo.code];
  }

  document.getElementById("items-subtotal").innerText = subtotal.toFixed(2) + " EG";
  if (document.getElementById("shipping-fee")) document.getElementById("shipping-fee").innerText = getShippingFee() + " EG";
  document.getElementById("final-total").innerText = (subtotal - discount + getShippingFee()).toFixed(2) + " EG";

  if (statusEl) {
    if (appliedPromo && PROMO_CODES[appliedPromo.code]) {
      statusEl.innerHTML = `<span style="color:var(--mint)"><i class="fa-solid fa-circle-check"></i> Code "${appliedPromo.code}" applied — ${(PROMO_CODES[appliedPromo.code] * 100)}% off (−${discount.toFixed(2)} EG)</span> <a href="#" onclick="removePromoCode(); return false;" style="color:var(--ink-faint);text-decoration:underline;margin-left:8px;">Remove</a>`;
    } else {
      statusEl.innerHTML = "";
    }
  }
}

function applyPromoCode() {
  const input = document.getElementById("promo-input");
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  if (!code) { toast("Enter a promo code first.", "fa-solid fa-triangle-exclamation"); return; }

  if (PROMO_CODES[code]) {
    appliedPromo = { code };
    localStorage.setItem("HYP3_promo", JSON.stringify(appliedPromo));
    toast(`Promo code applied — ${PROMO_CODES[code] * 100}% off!`, "fa-solid fa-tag");
    renderCart();
  } else {
    toast("That promo code isn't valid.", "fa-solid fa-triangle-exclamation");
  }
}

function removePromoCode() {
  appliedPromo = null;
  localStorage.removeItem("HYP3_promo");
  renderCart();
}

/* ---------------------------------------------------------------------
   FAVORITES
   --------------------------------------------------------------------- */
function isFav(cartKey) { return favorites.some(f => f.cartKey === cartKey); }

function toggleFav(cartKey, name, price, image, el) {
  const idx = favorites.findIndex(f => f.cartKey === cartKey);
  if (idx === -1) {
    favorites.push({ cartKey, name, price, image });
    if (el) el.classList.add("active");
    toast(`${name} saved to favorites`, "fa-solid fa-heart");
  } else {
    favorites.splice(idx, 1);
    if (el) el.classList.remove("active");
    toast(`${name} removed from favorites`, "fa-regular fa-heart");
  }
  saveFavs();
  if (document.getElementById("fav-content")) renderFavorites();
}

function removeFromFav(cartKey) {
  favorites = favorites.filter(f => f.cartKey !== cartKey);
  saveFavs();
  renderFavorites();
}

function renderFavorites() {
  const el = document.getElementById("fav-content");
  if (!el) return;
  if (favorites.length === 0) {
    el.innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="fa-solid fa-heart"></i>Nothing saved yet — tap the heart on any scent you love.</div></td></tr>`;
    return;
  }
  el.innerHTML = favorites.map(item => `
    <tr>
      <td><i class="fa-regular fa-circle-xmark" onclick="removeFromFav('${item.cartKey}')"></i></td>
      <td><img src="${item.image}" alt="${item.name}"></td>
      <td class="p-name">${item.name}</td>
      <td>${item.price} EG</td>
      <td><button class="normal" onclick="addToCart('${item.cartKey}', '${item.name}', ${item.price}, '${item.image}', 1)">Add to Cart</button></td>
    </tr>`).join("");
}

/* ---------------------------------------------------------------------
   RENDER: product cards (home + shop)
   --------------------------------------------------------------------- */
function productCardHTML(p, size) {
  size = size || p.sizes[0];
  const cartKey = `${p.id}-${size.label}`;
  return `
    <div class="pro" onclick="window.location.href='product.html?id=${p.id}'">
      <div class="img-wrap"><img src="${p.image}" alt="${p.name}"></div>
      <div class="des">
        <span>HYP3 · ${p.category}</span>
        <h5>${p.name}</h5>
        <div class="star">${starIcons(p.rating)}</div>
        <h4>${size.price} EG</h4>
      </div>
      <a href="#" class="quick-add" onclick="event.stopPropagation(); event.preventDefault(); addToCart('${cartKey}', '${p.name} (${size.label})', ${size.price}, '${p.image}', 1)">
        <i class="fa fa-shopping-cart cart"></i>
      </a>
    </div>`;
}

function renderProductGrid(containerId, list) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = list.map(p => productCardHTML(p)).join("");
}

/* ---------------------------------------------------------------------
   SINGLE PRODUCT PAGE
   --------------------------------------------------------------------- */
let currentProduct = null;
let currentSizeIndex = 0;

function renderProductPage() {
  const container = document.getElementById("prodetails");
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get("id")) || PRODUCTS[0].id;
  currentProduct = getProduct(id) || PRODUCTS[0];
  currentSizeIndex = 0;

  document.title = `HYP3 Perfume — ${currentProduct.name}`;
  paintProductDetails();

  // related products: same category, excluding current
  const related = PRODUCTS.filter(p => p.category === currentProduct.category && p.id !== currentProduct.id).slice(0, 4);
  const fallback = related.length ? related : PRODUCTS.filter(p => p.id !== currentProduct.id).slice(0, 4);
  renderProductGrid("related-products", fallback);
}

function paintProductDetails() {
  const p = currentProduct;
  const size = p.sizes[currentSizeIndex];
  const cartKey = `${p.id}-${size.label}`;

  document.getElementById("mainimg").src = p.image;
  document.getElementById("mainimg").alt = p.name;
  document.getElementById("p-category").innerText = `${p.category} / Perfume`;
  document.getElementById("p-title").innerText = p.name;
  document.getElementById("p-rating").innerHTML = starIcons(p.rating) + `<span>(${p.rating}.0)</span>`;
  document.getElementById("dynamic-price").innerText = size.price.toFixed(2) + " EG";
  document.getElementById("p-desc").innerText = p.desc;
  document.getElementById("notes-row").innerHTML = p.notes.map(n => `<span class="note-chip">${n}</span>`).join("");

  const select = document.getElementById("bottle-select");
  select.innerHTML = p.sizes.map((s, i) =>
    `<option value="${i}" ${i === currentSizeIndex ? "selected" : ""}>Bottle - ${s.label} (${s.price} EG)</option>`
  ).join("");

  const favIcon = document.getElementById("fav-toggle-icon");
  favIcon.classList.toggle("active", isFav(cartKey));
  favIcon.onclick = () => toggleFav(cartKey, `${p.name} (${size.label})`, size.price, p.image, favIcon);
}

function updatePerfumeDetails() {
  currentSizeIndex = parseInt(document.getElementById("bottle-select").value);
  paintProductDetails();
}

function handleAddToCart() {
  const p = currentProduct;
  const size = p.sizes[currentSizeIndex];
  const cartKey = `${p.id}-${size.label}`;
  const qty = parseInt(document.getElementById("product-quantity").value) || 1;
  addToCart(cartKey, `${p.name} (${size.label})`, size.price, p.image, qty);
}

/* ---------------------------------------------------------------------
   WHATSAPP CHECKOUT
   --------------------------------------------------------------------- */
/* ---------------------------------------------------------------------
   DASHBOARD TRACKING — fire-and-forget calls to the Pages Functions.
   These fail silently if the /api endpoints aren't deployed yet, so
   the site works normally even before the dashboard is set up.
   --------------------------------------------------------------------- */
function trackVisit() {
  try {
    fetch("/api/track-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: window.location.pathname, referrer: document.referrer }),
    }).catch(() => {});
  } catch (e) {}
}

function trackOrder(subtotal, discount, total, promoCode) {
  try {
    const sizeMatch = (name) => {
      const m = /\((30|50) ML\)/.exec(name || "");
      return m ? `${m[1]} ML` : null;
    };
    fetch("/api/track-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map(i => `${i.name} x${i.quantity}`).join(", "),
        itemsDetail: cart.map(i => ({ name: i.name, size: sizeMatch(i.name), qty: i.quantity, price: i.price })),
        subtotal, discount, shipping: getShippingFee(), total, promoCode,
      }),
    }).catch(() => {});
  } catch (e) {}
}

function sendCartToWhatsApp() {
  if (cart.length === 0) {
    toast("Your bag is empty — add a scent first.", "fa-solid fa-triangle-exclamation");
    return;
  }

  let itemsSubtotal = 0;
  let body = "Hi HYP3 ✨%0AI'd like to order the following:%0A%0A";

  cart.forEach((item, i) => {
    const lineTotal = item.price * item.quantity;
    itemsSubtotal += lineTotal;
    body += `${i + 1}. *${item.name}*%0A   Qty: ${item.quantity} — ${lineTotal} EGP%0A%0A`;
  });

  let discount = 0;
  if (appliedPromo && PROMO_CODES[appliedPromo.code]) {
    discount = itemsSubtotal * PROMO_CODES[appliedPromo.code];
  }

  const finalTotal = itemsSubtotal - discount + getShippingFee();
  body += `--------------------------%0A`;
  body += `Subtotal: ${itemsSubtotal.toFixed(2)} EGP%0A`;
  if (discount > 0) {
    body += `Promo (${appliedPromo.code}, ${PROMO_CODES[appliedPromo.code] * 100}% off): -${discount.toFixed(2)} EGP%0A`;
  }
  body += `Shipping: ${getShippingFee()} EGP%0A`;
  body += `*Total: ${finalTotal.toFixed(2)} EGP*%0A%0A`;
  body += `Please confirm my order.`;

  trackOrder(itemsSubtotal, discount, finalTotal, appliedPromo ? appliedPromo.code : null);
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${body}`, "_blank");
}

/* ---------------------------------------------------------------------
   AUTH (localStorage-simulated, matches original login.html)
   --------------------------------------------------------------------- */
function switchForm() {
  document.getElementById("login-form").classList.toggle("hidden");
  document.getElementById("signup-form").classList.toggle("hidden");
}

function togglePassword(inputId, iconEl) {
  const input = document.getElementById(inputId);
  if (input.type === "password") { input.type = "text"; iconEl.classList.replace("fa-eye", "fa-eye-slash"); }
  else { input.type = "password"; iconEl.classList.replace("fa-eye-slash", "fa-eye"); }
}

function handleSignup() {
  const name = document.getElementById("sign-name").value.trim();
  const email = document.getElementById("sign-email").value.trim();
  const pass = document.getElementById("sign-pass").value;
  if (!name || !email || !pass) { toast("Please fill all fields.", "fa-solid fa-triangle-exclamation"); return; }
  if (users.find(u => u.email === email)) { toast("This email is already registered.", "fa-solid fa-triangle-exclamation"); return; }
  users.push({ name, email, pass });
  localStorage.setItem("HYP3_users", JSON.stringify(users));
  toast("Account created — you can log in now.");
  switchForm();
}

function handleLogin() {
  const email = document.getElementById("login-email").value.trim();
  const pass = document.getElementById("login-pass").value;
  if (!email || !pass) { toast("Please enter your email and password.", "fa-solid fa-triangle-exclamation"); return; }
  const user = users.find(u => u.email === email);
  if (!user) { toast("No account with that email — sign up first.", "fa-solid fa-triangle-exclamation"); switchForm(); return; }
  if (user.pass !== pass) { toast("Wrong password.", "fa-solid fa-triangle-exclamation"); return; }
  localStorage.setItem("isLoggedIn", "true");
  localStorage.setItem("HYP3_currentUser", user.name);
  window.location.href = "index.html";
}

function logoutUser() {
  localStorage.removeItem("isLoggedIn");
  window.location.href = "index.html";
}

function manageAuth() {
  const status = localStorage.getItem("isLoggedIn");
  const loginIcon = document.getElementById("login-icon-item");
  const logoutIcon = document.getElementById("logout-icon-item");
  if (loginIcon && logoutIcon) {
    loginIcon.style.display = status === "true" ? "none" : "block";
    logoutIcon.style.display = status === "true" ? "block" : "none";
  }
}

/* ---------------------------------------------------------------------
   SEARCH (injected into navbar)
   --------------------------------------------------------------------- */
function ensureSearchBox() {
  const navbar = document.getElementById("navbar");
  if (!navbar || navbar.querySelector("#search-input")) return;
  const item = document.createElement("li");
  item.className = "search-box";
  item.innerHTML = `<input type="text" id="search-input" placeholder="Search scents..." aria-label="Search scents">`;
  navbar.insertBefore(item, navbar.firstElementChild);
  item.querySelector("#search-input").addEventListener("input", searchProducts);
}

function searchProducts() {
  const input = document.getElementById("search-input");
  if (!input) return;
  const query = input.value.toLowerCase().trim();
  const box = input.closest(".search-box");
  if (box) box.classList.toggle("is-searching", query.length > 0);

  document.querySelectorAll(".pro").forEach(card => {
    const title = card.querySelector(".des h5");
    const text = title ? title.innerText.toLowerCase() : card.innerText.toLowerCase();
    card.style.display = text.includes(query) ? "" : "none";
  });
}

/* ---------------------------------------------------------------------
   MOBILE NAV
   --------------------------------------------------------------------- */
function setupMobileNav() {
  const bar = document.getElementById("bar");
  const close = document.getElementById("close");
  const nav = document.getElementById("navbar");

  if (bar) bar.addEventListener("click", () => { nav?.classList.add("active"); document.body.classList.add("nav-open"); });
  if (close) close.addEventListener("click", () => { nav?.classList.remove("active"); document.body.classList.remove("nav-open"); });

  document.addEventListener("click", (e) => {
    if (!nav || !nav.classList.contains("active")) return;
    const insideNav = nav.contains(e.target);
    const onBar = bar && bar.contains(e.target);
    if (!insideNav && !onBar) { nav.classList.remove("active"); document.body.classList.remove("nav-open"); }
  });
}

/* ---------------------------------------------------------------------
   SHOP FILTER CHIPS
   --------------------------------------------------------------------- */
function setupShopFilters() {
  const chips = document.querySelectorAll(".filter-chip");
  if (!chips.length) return;
  chips.forEach(chip => {
    chip.addEventListener("click", () => {
      chips.forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      const cat = chip.dataset.filter;
      const list = cat === "all" ? PRODUCTS : PRODUCTS.filter(p => p.category === cat);
      renderProductGrid("shop-grid", list);
    });
  });
}

/* ---------------------------------------------------------------------
   BOOT
   --------------------------------------------------------------------- */
window.addEventListener("DOMContentLoaded", () => {
  enforceLocationGate();
  trackVisit();
  manageAuth();
  setupMobileNav();
  ensureSearchBox();
  updateCartBadge();

  if (document.getElementById("featured-products")) {
    renderProductGrid("featured-products", PRODUCTS.slice(0, 4));
  }
  if (document.getElementById("new-arrivals")) {
    renderProductGrid("new-arrivals", PRODUCTS.slice(4, 8));
  }
  if (document.getElementById("shop-grid")) {
    renderProductGrid("shop-grid", PRODUCTS);
    setupShopFilters();
  }
  if (document.getElementById("prodetails")) {
    renderProductPage();
  }
  if (document.getElementById("cart-content")) {
    renderCart();
  }
  if (document.getElementById("fav-content")) {
    renderFavorites();
  }

  const input = document.getElementById("search-input");
  if (input) input.addEventListener("input", searchProducts);

  const contactForm = document.getElementById("contact-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      toast("Message sent — we'll get back to you soon.");
      contactForm.reset();
    });
  }

  const newsletterForms = document.querySelectorAll(".form");
  newsletterForms.forEach(form => {
    const btn = form.querySelector("button");
    const input = form.querySelector("input");
    if (btn && input && !form.closest("#contact-form")) {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!input.value.trim()) { toast("Enter your e-mail first.", "fa-solid fa-triangle-exclamation"); return; }
        toast("You're subscribed to HYP3 updates.");
        input.value = "";
      });
    }
  });
});
