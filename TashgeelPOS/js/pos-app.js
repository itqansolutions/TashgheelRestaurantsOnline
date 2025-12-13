// POS JS with salesman support and fixed receipt printing (final version)
let allProducts = [];
let filteredProducts = [];
let cart = [];
let currentDiscountIndex = null;

// ===================== INIT =====================
document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadSalesmen();

  // يضمن ربط السيرش مرة واحدة حتى لو العنصر اتبدّل/اتأخر
  bindSearchOnce();
  // يضمن أن حقل السيرش قابل للكلك ومفيش طبقة مغطيّاه
  ensureSearchClickable();

  // يضمن الربط والتحديث عند الرجوع Back/Forward من صفحة تانية
  window.addEventListener("pageshow", () => {
    bindSearchOnce();
    ensureSearchClickable();
    loadProducts();
    const q = document.getElementById("productSearch")?.value?.trim();
    if (q) handleSearch();
  });

  // احتفاظ بالـ delegation كشبكة أمان
  document.getElementById("productSearch")?.addEventListener("input", handleSearch);
  document.addEventListener("input", (e) => {
    if (e.target && e.target.id === "productSearch") handleSearch();
  });

  document.getElementById("closeDayBtn")?.addEventListener("click", printDailySummary);
  updateCartSummary();
});

// يربط السيرش مرة واحدة فقط
function bindSearchOnce() {
  const el = document.getElementById("productSearch");
  if (el && !el.dataset.bound) {
    el.addEventListener("input", handleSearch);
    el.dataset.bound = "1";
  }
}

// يتأكد إن السيرش فوق أي طبقة ومش محجوب
function ensureSearchClickable() {
  const el = document.getElementById("productSearch");
  if (el) {
    el.style.pointerEvents = "auto";
    el.style.position = "relative";
    el.style.zIndex = "1000";
    // إطفاء أي مودال ممكن يكون لسه ظاهر بعد الرجوع
    ["discountModal", "auditModal"].forEach(id => {
      const m = document.getElementById(id);
      if (m && getComputedStyle(m).display !== "none") {
        m.style.display = "none";
      }
    });
    // ضمان التركيز أول ضغط في بعض البيئات
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
    grid.innerHTML = '<p style="text-align:center; color:#666;">No products found</p>';
    return;
  }

  filteredProducts.forEach((product) => {
    const div = document.createElement("div");
    div.className = "product-card";
    if (product.stock <= 0) div.classList.add("out-of-stock");
    div.onclick = () => addToCart(product);
    div.innerHTML = `
      <h4>${product.name}</h4>
      <p>${product.price.toFixed(2)} ج.م</p>
      <p>Stock: ${product.stock}</p>
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
      alert('Insufficient stock');
    }
  } else {
    if (product.stock > 0) {
      cart.push({ ...product, qty: 1, discount: { type: "none", value: 0 } });
    } else {
      alert('Product is out of stock');
    }
  }
  updateCartDisplay();
}

function updateCartDisplay() {
  const container = document.getElementById("cartItems");
  container.innerHTML = "";
  if (cart.length === 0) {
    container.innerHTML = '<p style="text-align:center; color:#666;">Cart is empty</p>';
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
      discountText = ` (-${item.discount.value} ج.م)`;
    }

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <span>${item.name} x${item.qty} ${discountText}</span>
      <span>${(finalPrice * item.qty).toFixed(2)} ج.م</span>
      <button onclick="openDiscountModal(${index})" title="خصم">💸</button>
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
  const lang = localStorage.getItem('pos_language') || 'en';
  const t = (en, ar) => (lang === 'ar' ? ar : en);

  document.getElementById("cartSubtotal").textContent = `${subtotal.toFixed(2)} ج.م`;
  document.getElementById("cartDiscount").textContent = `- ${discountTotal.toFixed(2)} ج.م`;
  document.getElementById("cartTotal").textContent = `${t("Total:", "الإجمالي الكلي:")} ${total.toFixed(2)} ج.م`;
  document.getElementById("subtotalLabel").textContent = t("Subtotal:", "الإجمالي الفرعي:");
  document.getElementById("discountLabel").textContent = t("Discount:", "الخصم:");
  document.getElementById("taxLabel").textContent = t("Tax (0%):", "الضريبة (٠٪):");
  document.getElementById("cartCounter").textContent = cart.length;
}

function toggleCartButtons(enable) {
  ["cashBtn", "cardBtn", "mobileBtn", "holdBtn", "clearCartBtn"].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) btn.disabled = !enable;
  });
}

function clearCart() {
  cart = [];
  updateCartDisplay();
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

  // حفظ التعديلات
  localStorage.setItem("products", JSON.stringify(allProducts));
  localStorage.setItem(receiptKey, JSON.stringify(receipt)); // (أزلنا التكرار)

  // تحديث شبكة المنتجات + الحفاظ على نتيجة البحث الحالية
  const q = (document.getElementById("productSearch")?.value || "").trim().toLowerCase();
  loadProducts();         // يعيد allProducts/filteredProducts + renderProducts
  if (q) handleSearch();  // لو فيه كويري نطبّقه تاني فورًا

  printReceipt(receipt);
  clearCart();
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
    alert('Print function not available');
  }
}

function getCurrentUser() {
  return JSON.parse(localStorage.getItem("currentUser") || '{"username":"User"}');
}

window.printStoredReceipt = function (receiptId) {
  const raw = localStorage.getItem(receiptId);
  if (!raw) {
    alert("Receipt not found: " + receiptId);
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
  const t = (en, ar) => (lang === 'ar' ? ar : 'en');
  const paymentMap = {
    cash: t("Cash", "نقدي"),
    card: t("Card", "بطاقة"),
    mobile: t("Mobile", "موبايل")
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
      discountStr = `${discountAmountPerUnit.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}`;
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
  <title>${t("Receipt", "الإيصال")}</title>
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

  th:nth-child(1), td:nth-child(1) { width: 14%; } /* الكود */
  th:nth-child(2), td:nth-child(2) { width: 28%; } /* الاسم */
  th:nth-child(3), td:nth-child(3) { width: 10%; } /* الكمية */
  th:nth-child(4), td:nth-child(4) { width: 14%; } /* سعر الوحدة */
  th:nth-child(5), td:nth-child(5) { width: 16%; } /* الإجمالي */
  th:nth-child(6), td:nth-child(6) { width: 18%; } /* الخصم */

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

  @media print {
    @page {
      size: 72mm auto;
      margin: 0;
    }
    body {
      margin: 0;
      padding: 0;
    }
    a {
      color: black;
      text-decoration: none;
    }
  }
</style>
</head>
<body>
  <div class="receipt-container">
    ${shopLogo ? `<img src="${shopLogo}" class="logo">` : ''}
    <h2 class="center">${shopName}</h2>
    <p class="center">${shopAddress}</p>
    <hr/>
    <p>${t("Receipt No", "رقم الفاتورة")}: ${receipt.id}</p>
    <p>${t("Cashier", "الكاشير")}: ${receipt.cashier}</p>
    <p>${t("Salesman", "البائع")}: ${receipt.salesman || '-'}</p>
    <p>${t("Date", "التاريخ")}: ${dateFormatted}</p>
    <p>${t("Payment Method", "طريقة الدفع")}: ${paymentMap[receipt.method] || '-'}</p>

    <table>
  <thead>
    <tr>
      <th>${t("Code", "الكود")}</th>
      <th>${t("Name", "الاسم")}</th>
      <th>${t("Qty", "الكمية")}</th>
      <th>${t("Unit Price", "سعر الوحدة")}</th>
      <th>${t("Total", "الإجمالي")}</th>
      <th>${t("Discount", "الخصم")}</th>
    </tr>
  </thead>
  <tbody>
    ${itemsHtml}
  </tbody>
</table>

    <div class="summary">
      <p>${t("Subtotal", "الإجمالي الفرعي")}: ${subtotal.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>
      <p>${t("Total Discount", "إجمالي الخصم")}: ${totalDiscount.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>
      <p>${t("Total", "الإجمالي النهائي")}: ${receipt.total.toFixed(2)} ${lang === 'ar' ? 'ج.م' : 'EGP'}</p>
    </div>
    <hr/>
    ${receiptFooterMessage ? `<p class="footer" style="font-size:13px; font-weight: bold;">${receiptFooterMessage}</p>` : ''}
    <p class="footer">
      <strong>Tashgheel POS &copy; 2025</strong><br>
      📞 <a href="tel:+201126522373">01126522373</a> / <a href="tel:+201155253886">01155253886</a><br>
      <span id="footerText">${t("Designed and developed by Itqan", "تصميم وتطوير Itqan")}</span>
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
  if (confirm("Are you sure you want to logout?")) {
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
      } catch {}
    }
  }

  const netAfterExpenses = total - expensesTotal;

  const lang = localStorage.getItem('pos_language') || 'en';
  const t = (en, ar) => lang === 'ar' ? ar : en;

  const summary = `
    <html><head><title>${t("Daily Summary", "ملخص اليومية")}</title></head>
    <body style="font-family:monospace;font-size:14px;text-align:center">
    <h2>${t("Daily Summary", "ملخص اليومية")}</h2>
    <p>${t("Date", "التاريخ")}: ${today}</p>
    <hr/>
    <p>💵 ${t("Cash", "نقدي")}: ${cash.toFixed(2)} ج.م</p>
    <p>💳 ${t("Card", "بطاقة")}: ${card.toFixed(2)} ج.م</p>
    <p>📱 ${t("Mobile", "موبايل")}: ${mobile.toFixed(2)} ج.م</p>
    <p>🔻 ${t("Discount", "الخصم")}: ${discount.toFixed(2)} ج.م</p>
    <p>🧾 ${t("Total Expenses", "إجمالي المصاريف")}: ${expensesTotal.toFixed(2)} ج.م</p>
    <p><strong>${t("Net before expenses", "الإجمالي قبل المصاريف")}: ${total.toFixed(2)} ج.م</strong></p>
    <p><strong style="color:green;">${t("Net After Expenses", "الصافي بعد المصاريف")}: ${netAfterExpenses.toFixed(2)} ج.م</strong></p>
    <hr/>
    <p>${t("Thanks", "شكرا لاستخدامك البرنامج")}</p>
    <script>window.onload = () => window.print()</script>
    </body></html>
  `;

  const win = window.open('', '', 'width=400,height=600');
  win.document.write(summary);
  win.document.close();
}
