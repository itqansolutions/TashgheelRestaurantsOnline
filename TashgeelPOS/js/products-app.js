// Updated products-app.js

document.addEventListener("DOMContentLoaded", () => {
  loadProducts();
  loadCategories();

  document.getElementById("product-form").addEventListener("submit", handleAddProduct);
  document.getElementById("category-form").addEventListener("submit", handleAddCategory);
});

function loadProducts() {
  const products = JSON.parse(localStorage.getItem("products") || "[]");
  const tbody = document.getElementById("product-table-body");
  tbody.innerHTML = "";

  products.forEach((p, i) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.code}</td>
      <td>${p.name}</td>
      <td>${p.barcode || "-"}</td>
      <td>${p.category || "-"}</td>
      <td>${p.price?.toFixed(2) || "0.00"}</td>
      <td>${p.cost?.toFixed(2) || "0.00"}</td>
      <td>${p.stock || 0}</td>
      <td>
        <button class="btn btn-secondary btn-action" onclick="editProduct('${p.code.replace(/'/g, "\\'")}')">✏️</button>
        <button class="btn btn-danger btn-action" onclick="deleteProduct(${i})">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function handleAddProduct(e) {
  e.preventDefault();

  const form = e.target; // EDIT MODE
  const isEditing = form.dataset.editing === "true"; // EDIT MODE
  const originalCode = form.dataset.originalCode || null; // EDIT MODE

  const code = document.getElementById("product-code").value.trim();
  const name = document.getElementById("product-name").value.trim();
  const category = document.getElementById("product-category").value;
  const barcode = document.getElementById("product-barcode").value.trim();
  const price = parseFloat(document.getElementById("product-price").value);
  const cost = parseFloat(document.getElementById("product-cost").value) || 0;
  const stock = parseInt(document.getElementById("product-stock").value) || 0;

  if (!code || !name || isNaN(price)) return alert("Please fill required fields");

  const products = JSON.parse(localStorage.getItem("products") || "[]");
  const product = { code, name, category, barcode, price, cost, stock };

  if (isEditing && originalCode) {
    // تحديث نفس الصنف في وضع التعديل
    const idx = products.findIndex(p => p.code === originalCode);
    if (idx === -1) {
      // لو اختفى لسبب ما: نتعامل كإضافة مع فحص التكرار
      if (products.find(p => p.code === code)) {
        alert((localStorage.getItem('pos_language') || 'en') === 'ar' 
              ? 'هذا الكود موجود بالفعل، يرجى اختيار كود آخر'
              : 'This product code already exists, please choose another code');
        return;
      }
      products.push(product);
    } else {
      // لو غيّرت الكود، تأكد مفيش كود مستخدم عند صنف تاني
      if (code !== originalCode && products.some(p => p.code === code)) {
        alert((localStorage.getItem('pos_language') || 'en') === 'ar' 
              ? 'هذا الكود موجود بالفعل، يرجى اختيار كود آخر'
              : 'This product code already exists, please choose another code');
        return;
      }
      products[idx] = product;
    }
  } else {
    // إضافة جديدة مع فحص التكرار
    const existingIndex = products.findIndex(p => p.code === code);
    if (existingIndex >= 0) {
      alert((localStorage.getItem('pos_language') || 'en') === 'ar' 
            ? 'هذا الكود موجود بالفعل، يرجى اختيار كود آخر'
            : 'This product code already exists, please choose another code');
      return;
    }
    // ✅ الإضافة الناقصة: ضمّ الصنف الجديد قبل الحفظ
    products.push(product);
  }

  localStorage.setItem("products", JSON.stringify(products));

  // مسح وضع التعديل بعد الحفظ // EDIT MODE
  delete form.dataset.editing;       // EDIT MODE
  delete form.dataset.originalCode;  // EDIT MODE

  form.reset();
  loadProducts();
}

function deleteProduct(index) {
  const products = JSON.parse(localStorage.getItem("products") || "[]");
  products.splice(index, 1);
  localStorage.setItem("products", JSON.stringify(products));
  loadProducts();
}

function editProduct(code) {
  const products = JSON.parse(localStorage.getItem('products') || '[]');
  const product = products.find(p => p.code === code);
  if (!product) return alert("Product not found");

  document.getElementById('product-code').value = product.code;
  document.getElementById('product-name').value = product.name;
  document.getElementById('product-price').value = product.price;
  document.getElementById('product-cost').value = product.cost || 0;
  document.getElementById('product-stock').value = product.stock;
  document.getElementById('product-barcode').value = product.barcode || '';
  document.getElementById('product-category').value = product.category || '';

  // تفعيل وضع التعديل وتخزين الكود الأصلي // EDIT MODE
  const form = document.getElementById("product-form"); // EDIT MODE
  form.dataset.editing = "true";                         // EDIT MODE
  form.dataset.originalCode = product.code;              // EDIT MODE

  document.getElementById('product-code').focus();
}

function loadCategories() {
  const categories = JSON.parse(localStorage.getItem("categories") || "[]");
  const select = document.getElementById("product-category");
  const list = document.getElementById("category-list");

  select.innerHTML = '<option value="">--</option>';
  list.innerHTML = "";

  categories.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);

    const li = document.createElement("li");
    li.textContent = cat;
    list.appendChild(li);
  });
}

function openStockAudit() {
  const lang = localStorage.getItem('pos_language') || 'en';
  const t = (en, ar) => lang === 'ar' ? ar : en;

  const products = JSON.parse(localStorage.getItem('products') || '[]');
  const tbody = document.getElementById('auditTableBody');
  tbody.innerHTML = '';

  products.forEach((p, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.code}</td>
      <td>${p.name}</td>
      <td>${p.stock}</td>
      <td><input type="number" class="actual-stock-input" data-index="${index}" value="${p.stock}" style="width: 80px;"></td>
      <td class="diff-cell">0</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('auditModal').style.display = 'flex';
  calculateStockDifferences();
}

function calculateStockDifferences() {
  const inputs = document.querySelectorAll('.actual-stock-input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      const index = parseInt(input.dataset.index);
      const products = JSON.parse(localStorage.getItem('products') || '[]');
      const actual = parseInt(input.value) || 0;
      const expected = products[index]?.stock || 0;
      const diffCell = input.parentElement.nextElementSibling;
      const diff = actual - expected;
      diffCell.textContent = diff;
      diffCell.style.color = diff < 0 ? 'red' : diff > 0 ? 'green' : 'black';
    });
  });
}

function saveStockAudit() {
  const inputs = document.querySelectorAll('.actual-stock-input');
  const products = JSON.parse(localStorage.getItem('products') || '[]');

  inputs.forEach(input => {
    const index = parseInt(input.dataset.index);
    const actual = parseInt(input.value) || 0;
    if (!isNaN(actual)) {
      products[index].stock = actual;
    }
  });

  localStorage.setItem('products', JSON.stringify(products));
  alert((localStorage.getItem('pos_language') || 'en') === 'ar' ? 'تم حفظ الجرد بنجاح' : 'Stock audit saved successfully');
  closeStockAudit();
}

function closeStockAudit() {
  document.getElementById('auditModal').style.display = 'none';
}

function handleAddCategory(e) {
  e.preventDefault();
  const input = document.getElementById("new-category");
  const cat = input.value.trim();
  if (!cat) return;

  const categories = JSON.parse(localStorage.getItem("categories") || "[]");
  if (!categories.includes(cat)) {
    categories.push(cat);
    localStorage.setItem("categories", JSON.stringify(categories));
    loadCategories();
  }
  input.value = "";
}
