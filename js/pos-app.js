// POS JS with salesman support and fixed receipt printing (final version)
let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentDiscountIndex = null;

// Translation Helper using global translations
const t = (key) => {
  const lang = localStorage.getItem('pos_language') || 'en';
  if (window.translations && window.translations[key]) {
    return window.translations[key][lang];
  }
  return key; // Fallback to key if not found
};

// ===================== INIT =====================
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadSalesmen();

  // Bind search once
  bindSearchOnce();
  ensureSearchClickable();

  window.addEventListener("pageshow", () => {
    bindSearchOnce();
    ensureSearchClickable();
    loadProducts();
    const q = document.getElementById("productSearch")?.value?.trim();
    if (q) handleSearch();
  });

  document.getElementById("productSearch")?.addEventListener("input", handleSearch);
  document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "productSearch") handleSearch();
  });

  document.getElementById("closeDayBtn")?.addEventListener("click", printDailySummary);

  // Listen for language change to update dynamic content
  window.addEventListener('languageChanged', () => {
    renderProducts();
    updateCartDisplay();
    loadSalesmen(); // In case we want to translate 'Select Salesman' default option
  });

  updateCartSummary();
});

function bindSearchOnce() {
  const el = document.getElementById("productSearch");
  if (el && !el.dataset.bound) {
    el.addEventListener("input", handleSearch);
    el.dataset.bound = "1";
  }
}

function ensureSearchClickable() {
  const el = document.getElementById("productSearch");
  if (el) {
    el.style.pointerEvents = "auto";
    el.style.position = "relative";
    el.style.zIndex = "1000";
    ["discountModal", "auditModal"].forEach(id => {
      const m = document.getElementById(id);
      if (m && getComputedStyle(m).display !== "none") {
        m.style.display = "none";
      }
    });
    el.addEventListener("mousedown", () => el.focus(), { once: true });
  }
}

// ===================== LOAD PRODUCTS =====================
function loadProducts() {
  const products = JSON.parse(localStorage.getItem("products") || "[]");
  allProducts = products;
  filteredProducts = products;
  renderProducts();
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  if (!grid) return;
  grid.innerHTML = "";

  if (filteredProducts.length === 0) {
    grid.innerHTML = `<p style="text-align:center; color:#666;">${t('no_products_found') || 'No products found'}</p>`;
    return;
  }

  filteredProducts.forEach((product) => {
    const div = document.createElement("div");
    div.className = "product-card";
    if (product.stock <= 0) div.classList.add("out-of-stock");
    div.onclick = () => addToCart(product);
    div.innerHTML = `
      <h4>${product.name}</h4>
      <p>${product.price.toFixed(2)} ${t('currency') || 'EGP'}</p>
      <p>${t('stock') || 'Stock'}: ${product.stock}</p>
    `;
    grid.appendChild(div);
  });
}

function handleSearch() {
  const query = document.getElementById("productSearch")?.value?.trim().toLowerCase() || "";
  filteredProducts = allProducts.filter(p =>
    (p.name && p.name.toLowerCase().includes(query)) ||
    (p.code && String(p.code).toLowerCase().includes(query)) ||
    (p.barcode && String(p.barcode).toLowerCase().includes(query))
  );
  renderProducts();
}

function searchProductByBarcode(barcode) {
  const found = allProducts.find(p => p.barcode === barcode);
  if (found) {
    addToCart(found);
    return true;
  }
  return false;
}

function loadSalesmen() {
  const salesmen = JSON.parse(localStorage.getItem("salesmen") || "[]");
  const select = document.getElementById("salesmanSelect");
  if (!select) return;
  select.innerHTML = `<option value="">--</option>`;
  salesmen.forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.name;
    opt.textContent = s.name;
    select.appendChild(opt);
  });
}

// ===================== DISCOUNT MODAL =====================
function openDiscountModal(index) {
  currentDiscountIndex = index;
  const item = cart[index];
  document.getElementById('discountType').value = item.discount?.type || 'none';
  document.getElementById('discountValue').value = item.discount?.value || 0;
  document.getElementById('discountModal').style.display = 'flex';
}

function closeDiscountModal() {
  currentDiscountIndex = null;
  document.getElementById('discountModal').style.display = 'none';
}

function saveDiscount() {
  const type = document.getElementById('discountType').value;
  const value = parseFloat(document.getElementById('discountValue').value);
  if (!cart[currentDiscountIndex]) return;
  cart[currentDiscountIndex].discount = { type, value: isNaN(value) ? 0 : value };
  updateCartDisplay();
  closeDiscountModal();
}

// ===================== CART =====================
function addToCart(product) {
  const existingItem = cart.find(i => i.code === product.code);
  if (existingItem) {
    if (existingItem.qty < product.stock) {
      existingItem.qty++;
    } else {
      alert(t('insufficient_stock'));
    }
  } else {
    if (product.stock > 0) {
      cart.push({ ...product, qty: 1, discount: { type: "none", value: 0 } });
    } else {
      alert(t('product_out_of_stock'));
    }
  }
  updateCartDisplay();
}

function updateCartDisplay() {
  const container = document.getElementById("cartItems");
  container.innerHTML = "";
  if (cart.length === 0) {
    container.innerHTML = `<p style="text-align:center; color:#666;">${t('cart_empty')}</p>`;
    toggleCartButtons(false);
    updateCartSummary();
    return;
  }

  cart.forEach((item, index) => {
    let discountText = "";
    let finalPrice = item.price;

    if (item.discount?.type === "percent") {
      finalPrice *= (1 - item.discount.value / 100);
      discountText = ` (-${item.discount.value}%)`;
    } else if (item.discount?.type === "value") {
      finalPrice -= item.discount.value;
      discountText = ` (-${item.discount.value})`; // Currency handled in summary
    }

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <span>${item.name} x${item.qty} ${discountText}</span>
      <span>${(finalPrice * item.qty).toFixed(2)}</span>
      <button onclick="openDiscountModal(${index})" title="${t('discount')}">💸</button>
    `;
    container.appendChild(div);
  });

  toggleCartButtons(true);
  updateCartSummary();
}

function updateCartSummary() {
  let subtotal = 0;
  let discountTotal = 0;

  cart.forEach(item => {
    let itemTotal = item.qty * item.price;
    let discount = 0;

    if (item.discount) {
      if (item.discount.type === "percent") {
        discount = itemTotal * (item.discount.value / 100);
      } else if (item.discount.type === "value") {
        discount = item.discount.value;
      }
    }

    subtotal += itemTotal;
    discountTotal += discount;
  });

  const total = subtotal - discountTotal;
  const currency = t('currency') || 'EGP'; // Simplified currency handling

  document.getElementById("cartSubtotal").textContent = `${subtotal.toFixed(2)}`;
  document.getElementById("cartDiscount").textContent = `- ${discountTotal.toFixed(2)}`;
  document.getElementById("cartTotal").textContent = `${t('total') || 'Total'}: ${total.toFixed(2)}`;
  document.getElementById("subtotalLabel").textContent = t('subtotal');
  document.getElementById("discountLabel").textContent = t('discount');
  document.getElementById("taxLabel").textContent = t('tax');
  document.getElementById("cartCounter").textContent = cart.length;
}

function toggleCartButtons(enable) {
  ["cashBtn", "cardBtn", "mobileBtn", "holdBtn", "clearCartBtn"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enable;
  });
}

function clearCart() {
  if (cart.length > 0 && confirm(t('confirm_clear_cart'))) {
    cart = [];
    updateCartDisplay();
  } else if (cart.length === 0) {
    cart = []; // Just to be safe or if forceful
    updateCartDisplay();
  }
}

// ===================== SALE =====================
function getProductCost(code) {
  const product = allProducts.find(p => p.code === code);
  return product?.cost || 0;
}

function processSale(method) {
  if (cart.length === 0) return;
  let lastNum = parseInt(localStorage.getItem("lastReceiptNumber") || "0", 10);
  lastNum++;
  const id = Date.now();
  const receiptKey = "receipt_" + id;
  const salesman = document.getElementById('salesmanSelect')?.value || '-';

  const receipt = {
    id: receiptKey,
    date: new Date().toISOString(),
    method,
    cashier: getCurrentUser().username,
    salesman,
    status: "finished",
    total: calculateTotal(cart),
    items: cart.map(item => ({
      code: item.code,
      name: item.name,
      qty: item.qty,
      price: item.price,
      discount: item.discount,
      cost: getProductCost(item.code)
    }))
  };

  cart.forEach(item => {
    const index = allProducts.findIndex(p => p.code === item.code);
    if (index !== -1) {
      allProducts[index].stock -= item.qty;
      if (allProducts[index].stock < 0) allProducts[index].stock = 0;
    }
  });

  localStorage.setItem("products", JSON.stringify(allProducts));
  localStorage.setItem(receiptKey, JSON.stringify(receipt));

  const q = (document.getElementById("productSearch")?.value || "").trim().toLowerCase();
  loadProducts();
  if (q) handleSearch();

  printReceipt(receipt);
  cart = []; // Direct clear
  updateCartDisplay();
}

function calculateTotal(items) {
  return items.reduce((sum, i) => {
    let finalPrice = i.price;
    if (i.discount?.type === "percent") finalPrice *= (1 - i.discount.value / 100);
    else if (i.discount?.type === "value") finalPrice -= i.discount.value;
    return sum + (finalPrice * i.qty);
  }, 0);
}

// ===================== PRINT RECEIPT =====================
function printReceipt(receipt) {
  if (typeof printStoredReceipt === 'function') {
    printStoredReceipt(receipt.id);
  } else {
    alert(t('print_function_not_available') || 'Print function not available');
  }
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || '{"username":"User"}');
}

window.printStoredReceipt = function (receiptId) {
  const raw = localStorage.getItem(receiptId);
  if (!raw) {
    alert(t('receipt_not_found') + ": " + receiptId);
    return;
  }
  const receipt = JSON.parse(raw);
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  const shopName = localStorage.getItem('shopName') || 'My Shop';
  const shopAddress = localStorage.getItem('shopAddress') || '';
  const shopFooter = localStorage.getItem('shopFooter') || '';
  const shopLogo = localStorage.getItem('shopLogo') || '';
  const receiptFooterMessage = localStorage.getItem('footerMessage') || '';

  const lang = localStorage.getItem('pos_language') || 'en';
  // const t = ... using global t

  const paymentMap = {
    cash: t('cash'),
    card: t('card'),
    mobile: t('mobile')
  };

  let totalDiscount = 0;
  let subtotal = 0;

  const itemsHtml = receipt.items.map(item => {
    const product = products.find(p => p.code === item.code) || {};
    const originalTotal = item.price * item.qty;
    let discountStr = "-";
    let discountAmountPerUnit = 0;

    if (item.discount?.type === "percent") {
      discountAmountPerUnit = item.price * (item.discount.value / 100);
      discountStr = `${item.discount.value}%`;
    } else if (item.discount?.type === "value") {
      discountAmountPerUnit = item.discount.value;
      discountStr = `${discountAmountPerUnit.toFixed(2)}`;
    }

    const itemDiscountTotal = discountAmountPerUnit * item.qty;
    totalDiscount += itemDiscountTotal;
    subtotal += originalTotal;

    return `
      <tr>
        <td>${item.code}</td>
        <td>${product.name || item.name || '-'}</td>
        <td>${item.qty}</td>
        <td>${item.price.toFixed(2)}</td>
        <td>${originalTotal.toFixed(2)}</td>
        <td>${discountStr}</td>
      </tr>
    `;
  }).join('');

  const dateFormatted = new Date(receipt.date).toLocaleString(lang === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  const html = `
    <html>
<head>
  <title>${t('receipt') || 'Receipt'}</title>
<style>
  body {
    font-family: Arial, sans-serif;
    font-size: 11.5px;
    font-weight: bold;
    line-height: 1.7;
    direction: ${lang === 'ar' ? 'rtl' : 'ltr'};
    margin: 0;
    padding: 0;
  }

  .receipt-container {
    width: 72mm;
    margin: 0;
    padding: 5px 0;
    background: #fff;
    box-sizing: border-box;
  }

  .center {
    text-align: center;
  }

  img.logo {
    max-height: 70px;
    display: block;
    margin: 0 auto 5px;
  }

  h2 {
    margin: 3px 0;
    font-size: 15px;
    font-weight: bold;
  }

  p {
    margin: 2px 8px;
    font-weight: bold;
  }

  table {
    width: 98%;
    border-collapse: collapse;
    margin: 8px auto 4px;
    table-layout: fixed;
  }

  th, td {
    border: 1px dashed #444;
    padding: 4px 5px;
    text-align: center;
    font-size: 11px;
    white-space: normal;
    word-break: break-word;
    font-weight: bold;
  }

  th:nth-child(1), td:nth-child(1) { width: 14%; } /* Code */
  th:nth-child(2), td:nth-child(2) { width: 28%; } /* Name */
  th:nth-child(3), td:nth-child(3) { width: 10%; } /* Qty */
  th:nth-child(4), td:nth-child(4) { width: 14%; } /* Price */
  th:nth-child(5), td:nth-child(5) { width: 16%; } /* Total */
  th:nth-child(6), td:nth-child(6) { width: 18%; } /* Discount */

  .summary {
    margin: 10px 8px 0;
    font-size: 12px;
    font-weight: bold;
  }

  .footer {
    text-align: center;
    margin: 12px 0 0;
    font-size: 10.5px;
    border-top: 1px dashed #ccc;
    padding-top: 6px;
    font-weight: bold;
  }
</style>
</head>
<body>
  <div class="receipt-container">
    ${shopLogo ? `<img src="${shopLogo}" class="logo">` : ''}
    <h2 class="center">${shopName}</h2>
    <p class="center">${shopAddress}</p>
    <hr/>
    <p>${t('receipt_no') || 'Receipt No'}: ${receipt.id}</p>
    <p>${t('cashier') || 'Cashier'}: ${receipt.cashier}</p>
    <p>${t('salesman') || 'Salesman'}: ${receipt.salesman || '-'}</p>
    <p>${t('date') || 'Date'}: ${dateFormatted}</p>
    <p>${t('method') || 'Method'}: ${paymentMap[receipt.method] || '-'}</p>

    <table>
  <thead>
    <tr>
      <th>${t('code') || 'Code'}</th>
      <th>${t('name') || 'Name'}</th>
      <th>${t('qty') || 'Qty'}</th>
      <th>${t('unit_price') || 'Price'}</th>
      <th>${t('total') || 'Total'}</th>
      <th>${t('discount') || 'Disc'}</th>
    </tr>
  </thead>
  <tbody>
    ${itemsHtml}
  </tbody>
</table>

    <div class="summary">
      <p>${t('subtotal')}: ${subtotal.toFixed(2)}</p>
      <p>${t('total_discounts')}: ${totalDiscount.toFixed(2)}</p>
      <p>${t('total')}: ${receipt.total.toFixed(2)}</p>
    </div>
    <hr/>
    ${receiptFooterMessage ? `<p class="footer" style="font-size:13px; font-weight: bold;">${receiptFooterMessage}</p>` : ''}
    <p class="footer">
      <strong>Tashgheel POS &copy; 2025</strong><br>
      <span id="footerText">${t('enhanced_security')}</span>
    </p>
  </div>
  <script>window.onload = () => window.print();</script>
</body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
};

function confirmLogout() {
  if (confirm(t('logout_confirm'))) {
    localStorage.removeItem("pos_user");
    location.href = "index.html";
  }
}

function printDailySummary() {
  const receipts = Object.keys(localStorage)
    .filter(k => k.startsWith("receipt_"))
    .map(k => JSON.parse(localStorage.getItem(k)))
    .filter(r => r.status === "finished");

  const today = new Date().toISOString().slice(0, 10);
  const todayReceipts = receipts.filter(r => r.date.startsWith(today));

  let cash = 0, card = 0, mobile = 0, discount = 0, total = 0;

  todayReceipts.forEach(r => {
    if (r.method === "cash") cash += r.total;
    else if (r.method === "card") card += r.total;
    else if (r.method === "mobile") mobile += r.total;
    r.items.forEach(i => {
      if (i.discount) {
        if (i.discount.type === "percent") discount += (i.qty * i.price) * (i.discount.value / 100);
        else if (i.discount.type === "value") discount += i.qty * i.discount.value;
      }
    });
    total += r.total;
  });

  // 🔹 حساب المصاريف اليومية 🔹
  let expensesTotal = 0;
  for (let key in localStorage) {
    if (key.startsWith("expense_")) {
      try {
        const e = JSON.parse(localStorage.getItem(key));
        if (e.date === today) expensesTotal += parseFloat(e.amount) || 0;
      } catch { }
    }
  }

  const netAfterExpenses = total - expensesTotal;

  const lang = localStorage.getItem('pos_language') || 'en';
  // const t = ...

  const summary = `
    <html><head><title>${t('day_summary_title')}</title></head>
    <body style="font-family:monospace;font-size:14px;text-align:center;direction:${lang === 'ar' ? 'rtl' : 'ltr'}">
    <h2>${t('day_summary_title')}</h2>
    <p>${t('date')}: ${today}</p>
    <hr/>
    <p>💵 ${t('cash')}: ${cash.toFixed(2)}</p>
    <p>💳 ${t('card')}: ${card.toFixed(2)}</p>
    <p>📱 ${t('mobile')}: ${mobile.toFixed(2)}</p>
    <p>🔻 ${t('total_discounts')}: ${discount.toFixed(2)}</p>
    <p>🧾 ${t('total_expenses')}: ${expensesTotal.toFixed(2)}</p>
    <p><strong>${t('net_before_expenses') || 'Net before expenses'}: ${total.toFixed(2)}</strong></p>
    <p><strong style="color:green;">${t('net_after_expenses') || 'Net After Expenses'}: ${netAfterExpenses.toFixed(2)}</strong></p>
    <hr/>
    <script>window.onload = () => window.print()</script>
    </body></html>
  `;

  const win = window.open('', '', 'width=400,height=600');
  win.document.write(summary);
  win.document.close();
}
