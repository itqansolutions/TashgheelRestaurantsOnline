// Spare Parts Management Logic
// Refactored from products-app.js to use db.js and EnhancedSecurity

// Translation Helper
const t = (key) => {
  const lang = localStorage.getItem('pos_language') || 'en';
  if (window.translations && window.translations[key]) {
    return window.translations[key][lang];
  }
  return key;
};

document.addEventListener("DOMContentLoaded", () => {
  // Security Check
  if (!window.isSessionValid()) {
    window.location.href = 'index.html';
    return;
  }

  loadParts();
  loadCategories();
  loadVendors(); // Load vendors for dropdown

  document.getElementById("product-form").addEventListener("submit", handleAddPart);
  document.getElementById("category-form").addEventListener("submit", handleAddCategory);
});

// Logout handler
function handleLogout() {
  if (confirm(t('confirm_logout'))) {
    window.logout();
  }
}

function loadVendors() {
  const vendors = window.DB.getVendors();
  const select = document.getElementById("product-vendor");

  // Clear existing options except first
  select.innerHTML = '<option value="">-- Select Vendor --</option>';

  vendors.forEach(v => {
    const opt = document.createElement("option");
    opt.value = v.id;
    opt.textContent = v.name;
    select.appendChild(opt);
  });
}

function loadParts() {
  const parts = window.DB.getParts();
  const vendors = window.DB.getVendors();
  const tbody = document.getElementById("product-table-body");
  tbody.innerHTML = "";

  if (parts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;">No spare parts found.</td></tr>';
    return;
  }

  parts.forEach((p) => {
    const vendor = vendors.find(v => v.id == p.vendorId);
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.partNumber || '-'}</td>
      <td>${p.name}</td>
      <td>${vendor?.name || '-'}</td>
      <td>${p.barcode || "-"}</td>
      <td>${p.category || "-"}</td>
      <td>${parseFloat(p.price || 0).toFixed(2)}</td>
      <td>${parseFloat(p.cost || 0).toFixed(2)}</td>
      <td>${p.stock || 0}</td>
      <td>
        <button class="btn btn-secondary btn-action" onclick="editPart(${p.id})">✏️</button>
        <button class="btn btn-danger btn-action" onclick="deletePart(${p.id})">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

function handleAddPart(e) {
  e.preventDefault();

  const id = document.getElementById("product-id").value; // Hidden ID field
  const partNumber = document.getElementById("product-code").value.trim();
  const name = document.getElementById("product-name").value.trim();
  const category = document.getElementById("product-category").value;
  const vendorId = document.getElementById("product-vendor").value;
  const barcode = document.getElementById("product-barcode").value.trim();
  const price = parseFloat(document.getElementById("product-price").value);
  const cost = parseFloat(document.getElementById("product-cost").value) || 0;
  const stock = parseInt(document.getElementById("product-stock").value) || 0;

  if (!partNumber || !name || isNaN(price)) return alert(t('fill_required_fields'));

  const part = {
    id: id ? parseInt(id) : Date.now(),
    partNumber,
    name,
    category,
    vendorId: vendorId || null,
    barcode,
    price,
    cost,
    stock,
    initialStock: id ? undefined : parseInt(stock), // Only set for new parts
    createdAt: id ? undefined : new Date().toISOString(), // Only set for new parts
    lastRestockDate: new Date().toISOString()
  };

  // Check for duplicate Part Number if new
  const existing = window.DB.getParts();
  const duplicate = existing.find(p => p.partNumber === partNumber && p.id !== part.id);
  if (duplicate) {
    alert(t('part_exists'));
    return;
  }

  // If adding new stock (not editing), add cost to vendor credit
  if (!id && vendorId && stock > 0) {
    const totalCost = cost * stock;
    window.DB.updateVendorCredit(vendorId, totalCost);
  }

  window.DB.savePart(part);

  e.target.reset();
  document.getElementById("product-id").value = "";
  loadParts();
  alert(t('part_saved'));
}

function deletePart(id) {
  if (confirm(t('delete_part_confirm'))) {
    window.DB.deletePart(id);
    loadParts();
  }
}

function editPart(id) {
  const part = window.DB.getPart(id);
  if (!part) return alert(t('part_not_found'));

  document.getElementById("product-id").value = part.id;
  document.getElementById("product-code").value = part.partNumber;
  document.getElementById("product-name").value = part.name;
  document.getElementById("product-category").value = part.category || "";
  document.getElementById("product-vendor").value = part.vendorId || "";
  document.getElementById("product-barcode").value = part.barcode || "";
  document.getElementById("product-price").value = part.price;
  document.getElementById("product-cost").value = part.cost;
  document.getElementById("product-stock").value = part.stock;

  document.getElementById("product-name").focus();
}

function loadCategories() {
  const categories = JSON.parse(localStorage.getItem("categories") || "[]");
  const select = document.getElementById("product-category");
  const list = document.getElementById("category-list");

  select.innerHTML = '<option value="">-- Select --</option>';
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

// Stock Audit functions can stay similar but need to use DB
function openStockAudit() {
  const parts = window.DB.getParts();
  const tbody = document.getElementById('auditTableBody');
  tbody.innerHTML = '';

  parts.forEach((p, index) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.partNumber}</td>
      <td>${p.name}</td>
      <td>${p.stock}</td>
      <td><input type="number" class="actual-stock-input" data-id="${p.id}" value="${p.stock}" style="width: 80px;"></td>
      <td class="diff-cell">0</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('auditModal').style.display = 'flex';

  // Re-attach listeners
  document.querySelectorAll('.actual-stock-input').forEach(input => {
    input.addEventListener('input', updateAuditDiff);
  });
}

function updateAuditDiff(e) {
  const input = e.target;
  const id = parseInt(input.dataset.id);
  const part = window.DB.getPart(id);
  if (!part) return;

  const actual = parseInt(input.value) || 0;
  const diff = actual - part.stock;
  const diffCell = input.parentElement.nextElementSibling;
  diffCell.textContent = diff;
  diffCell.style.color = diff < 0 ? 'red' : diff > 0 ? 'green' : 'black';
}

function saveStockAudit() {
  const inputs = document.querySelectorAll('.actual-stock-input');

  inputs.forEach(input => {
    const id = parseInt(input.dataset.id);
    const actual = parseInt(input.value);
    if (!isNaN(actual)) {
      const part = window.DB.getPart(id);
      if (part) {
        part.stock = actual;
        window.DB.savePart(part);
      }
    }
  });

  alert(t('stock_audit_saved'));
  closeStockAudit();
  loadParts();
}

function closeStockAudit() {
  document.getElementById('auditModal').style.display = 'none';
}

// Expose globally
window.openStockAudit = openStockAudit;
window.saveStockAudit = saveStockAudit;
window.closeStockAudit = closeStockAudit;
window.editPart = editPart;
window.deletePart = deletePart;
