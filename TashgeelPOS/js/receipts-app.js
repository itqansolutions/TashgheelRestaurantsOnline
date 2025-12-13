// receipts-app.js (كامل بعد التعديلات: دعم التوتال بعد الخصم + أسباب المرتجع)

// receipts-app.js (كامل بعد التعديلات: دعم التوتال بعد الخصم + أسباب المرتجع + بحث برقم الفاتورة + عرض رقم الفاتورة الحقيقي)

function loadReceipts() {
  const receipts = [];
  for (let key in localStorage) {
    if (key.startsWith('receipt_')) {
      try {
        const receipt = JSON.parse(localStorage.getItem(key));
        receipt._key = key;
        receipts.push(receipt);
      } catch (e) {
        console.warn("Error parsing receipt", key, e);
      }
    }
  }
  return receipts.sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderReceiptsTable() {
  const tbody = document.getElementById('receiptsTableBody');
  if (!tbody) return;

  const receipts = loadReceipts();
  const searchTerm = document.getElementById('receiptSearch')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('statusFilter')?.value || '';

  tbody.innerHTML = '';

  const filtered = receipts.filter(r => {
    const matchText = `${r.cashier || ''} ${r._key || ''} ${r.id || ''}`.toLowerCase();
    const matchStatus = !statusFilter || r.status === statusFilter;
    return matchText.includes(searchTerm) && matchStatus;
  });

  if (filtered.length === 0) {
    const lang = localStorage.getItem('pos_language') || 'en';
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center">${lang === 'ar' ? 'لا توجد مستندات' : 'No receipts found'}</td></tr>`;
    return;
  }

  filtered.forEach((r) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${r.id || '-'}</td>
      <td>${formatDate(r.date)}</td>
      <td>${r.cashier || '-'}</td>
      <td>${r.method || '-'}</td>
      <td>${calculateReceiptNetTotal(r).toFixed(2)} ج.م</td>
      <td>${translateStatus(r.status || 'finished')}</td>
      <td>${r.returnReason || '-'}</td>
      <td>
        <div style="display:flex; flex-wrap: wrap; gap:5px; justify-content:center;">
          <button class="btn btn-secondary btn-action" title="Print" onclick="printReceipt('${r._key}')">🖨️</button>
          <button class="btn btn-warning btn-action" title="Full Return" onclick="returnFullReceipt('${r._key}')">↩️</button>
          <button class="btn btn-primary btn-action" title="Partial Return" onclick="openPartialReturnModal('${r._key}')">🔁</button>
          <button class="btn btn-danger btn-action" title="Cancel" onclick="cancelReceipt('${r._key}')">❌</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleString();
}

function calculateReceiptNetTotal(receipt) {
  return receipt.items.reduce((sum, item) => {
    const discount = item.discount?.type === 'percent' ? (item.price * item.discount.value / 100) : item.discount?.value || 0;
    const net = item.price - discount;
    return sum + item.qty * net;
  }, 0);
}

function translateStatus(status) {
  const lang = localStorage.getItem('pos_language') || 'en';
  const map = {
    finished: { en: 'Finished', ar: 'مكتمل' },
    returned: { en: 'Returned', ar: 'مردود' },
    partial_return: { en: 'Partially Returned', ar: 'مردود جزئي' },
    full_return: { en: 'Fully Returned', ar: 'مردود كلي' },
    cancelled: { en: 'Cancelled', ar: 'ملغي' },
  };
  return map[status]?.[lang] || status;
}

function printReceipt(receiptId) {
  if (typeof window.printStoredReceipt === "function") {
    window.printStoredReceipt(receiptId);
  } else {
    alert("Print function not available");
  }
}

// باقي الكود كما هو دون تغيير

function returnFullReceipt(key) {
  const receipt = JSON.parse(localStorage.getItem(key));
  if (!receipt) return;

  const products = JSON.parse(localStorage.getItem('products') || '[]');
  receipt.items.forEach(item => {
    const index = products.findIndex(p => p.code === item.code);
    if (index !== -1) {
      products[index].stock += item.qty;
    }
  });

  receipt.status = 'full_return';
  receipt.returnReason = prompt('سبب المرتجع؟') || '';
  localStorage.setItem('products', JSON.stringify(products));
  localStorage.setItem(key, JSON.stringify(receipt));
  renderReceiptsTable();
  alert("✅ Full return processed.");
}

function cancelReceipt(key) {
  const receipt = JSON.parse(localStorage.getItem(key));
  if (!receipt) return;

  const products = JSON.parse(localStorage.getItem('products') || '[]');
  receipt.items.forEach(item => {
    const index = products.findIndex(p => p.code === item.code);
    if (index !== -1) {
      products[index].stock += item.qty;
    }
  });

  receipt.status = 'cancelled';
  localStorage.setItem('products', JSON.stringify(products));
  localStorage.setItem(key, JSON.stringify(receipt));
  renderReceiptsTable();
  alert("❌ Receipt cancelled.");
}

function openPartialReturnModal(key) {
  const receipt = JSON.parse(localStorage.getItem(key));
  if (!receipt) return;

  const form = document.getElementById('returnForm');
  form.innerHTML = '';
  form.dataset.receiptKey = key;

  receipt.items.forEach((item, i) => {
    form.innerHTML += `
      <div style="margin-bottom:10px;">
        <label>${item.name} (${item.qty})</label>
        <input type="number" name="return_qty_${i}" data-index="${i}" max="${item.qty}" min="0" value="0" style="width:60px; margin-left:10px;">
      </div>
    `;
  });

  document.getElementById('returnModal').style.display = 'flex';
}

function confirmPartialReturn() {
  const form = document.getElementById('returnForm');
  const key = form.dataset.receiptKey;
  const receipt = JSON.parse(localStorage.getItem(key));
  if (!receipt) return;

  const products = JSON.parse(localStorage.getItem('products') || '[]');
  let anyReturned = false;

  receipt.items.forEach((item, i) => {
    const input = form.querySelector(`[name="return_qty_${i}"]`);
    const qtyToReturn = parseInt(input.value || 0);
    if (qtyToReturn > 0 && qtyToReturn <= item.qty) {
      const index = products.findIndex(p => p.code === item.code);
      if (index !== -1) {
        products[index].stock += qtyToReturn;
      }
      item.qty -= qtyToReturn;
      anyReturned = true;
    }
  });

  if (anyReturned) {
    receipt.status = 'partial_return';
    receipt.returnReason = document.getElementById('returnReason').value || '';
    localStorage.setItem('products', JSON.stringify(products));
    localStorage.setItem(key, JSON.stringify(receipt));
    renderReceiptsTable();
    alert('✅ Partial return saved.');
  } else {
    alert('⚠️ No valid quantities entered.');
  }
  closeReturnModal();
}

function closeReturnModal() {
  document.getElementById('returnModal').style.display = 'none';
  document.getElementById('returnForm').innerHTML = '';
  document.getElementById('returnReason').value = '';
}

function updateReceiptsLanguage(lang) {
  const search = document.getElementById('receiptSearch');
  if (search) {
    search.placeholder = lang === 'ar' ? 'بحث بالكاشير أو رقم المستند...' : 'Search by cashier or code...';
  }
  const filter = document.getElementById('statusFilter');
  if (filter) {
    filter.options[0].textContent = lang === 'ar' ? 'كل الحالات' : 'All Status';
    filter.options[1].textContent = lang === 'ar' ? 'مكتمل' : 'Finished';
    filter.options[2].textContent = lang === 'ar' ? 'مردود جزئي' : 'Partial Return';
    filter.options[3].textContent = lang === 'ar' ? 'مردود كلي' : 'Full Return';
    filter.options[4].textContent = lang === 'ar' ? 'ملغي' : 'Cancelled';
  }
}

// ============== INIT ==============
window.addEventListener('DOMContentLoaded', () => {
  renderReceiptsTable();
  const searchInput = document.getElementById('receiptSearch');
  const statusFilter = document.getElementById('statusFilter');

  if (searchInput) {
    searchInput.addEventListener('input', renderReceiptsTable);
  }
  if (statusFilter) {
    statusFilter.addEventListener('change', renderReceiptsTable);
  }

  const lang = localStorage.getItem('pos_language') || 'en';
  updateReceiptsLanguage(lang);
});
