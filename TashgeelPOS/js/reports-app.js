// reports-app.js

// === تغيير اللغة (لازم يكون برا DOMContentLoaded) ===
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const lang = btn.dataset.lang;
    localStorage.setItem('pos_language', lang);
    location.reload(); // إعادة تحميل الصفحة بعد تغيير اللغة
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const lang = localStorage.getItem('pos_language') || 'en';
  const t = (en, ar) => lang === 'ar' ? ar : en;
  const safe = n => Math.max(0, n);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  const fromDateInput = document.getElementById('from-date');
  const toDateInput = document.getElementById('to-date');

  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.report-tab').forEach(btn => btn.classList.remove('active'));
      tab.classList.add('active');
      const selected = tab.dataset.tab;
      document.querySelectorAll('.report-card').forEach(card => card.style.display = 'none');
      document.getElementById('card-' + selected).style.display = 'block';
      runReport(selected);
      updateHeaders();
    });
  });

  document.getElementById('from-date').addEventListener('change', refreshReports);
  document.getElementById('to-date').addEventListener('change', refreshReports);

  function refreshReports() {
    const activeTab = document.querySelector('.report-tab.active')?.dataset.tab || 'sales';
    runReport(activeTab);
  }

  function normalizeMethod(method) {
    method = (method || '').toLowerCase();
    if (method.includes('cash') || method.includes('نقد')) return 'cash';
    if (method.includes('card') || method.includes('بطاق')) return 'card';
    if (method.includes('mobile') || method.includes('موبايل')) return 'mobile';
    return 'unknown';
  }

  function runReport(type) {
    const fromDate = fromDateInput.value ? new Date(fromDateInput.value) : null;
    const toDate = toDateInput.value ? new Date(toDateInput.value) : null;
    if (toDate) toDate.setHours(23, 59, 59, 999);

    const receipts = getAllReceipts().filter(r => {
      const d = new Date(r.date);
      return (!fromDate || d >= fromDate) && (!toDate || d <= toDate);
    });

    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const productMap = {};
    products.forEach(p => productMap[String(p.code)] = p);

    const finished = receipts.filter(r => r.status === 'finished');
    const returns = receipts.filter(r => r.status === 'full_return' || r.status === 'partial_return');
  if (type === 'stock-value') {
    generateStockValueReport();
  }
    if (type === 'sales') {
      let totalCash = 0, totalCard = 0, totalMobile = 0, totalDiscount = 0;

      const calcTotals = (arr, sign = 1) => {
        arr.forEach(r => {
          let gross = 0, discount = 0;
          r.items.forEach(i => {
            const d = i.discount?.type === 'percent'
              ? i.price * i.discount.value / 100 * i.qty
              : (i.discount?.value || 0) * i.qty;
            discount += d;
            gross += i.qty * i.price;
          });

          totalDiscount += sign * discount;
          const net = gross - discount;
          const method = normalizeMethod(r.method);

          if (method === 'cash') totalCash += sign * net;
          if (method === 'card') totalCard += sign * net;
          if (method === 'mobile') totalMobile += sign * net;
        });
      };

      calcTotals(finished, 1);
      calcTotals(returns, -1);

      document.getElementById('total-sales-cash').textContent = safe(totalCash).toFixed(2) + ' EGP';
      document.getElementById('total-sales-card').textContent = safe(totalCard).toFixed(2) + ' EGP';
      document.getElementById('total-sales-mobile').textContent = safe(totalMobile).toFixed(2) + ' EGP';
      document.getElementById('total-discounts').textContent = safe(totalDiscount).toFixed(2) + ' EGP';
    }

    if (type === 'cogs') {
      let totalCost = 0;
      finished.forEach(r => {
        r.items.forEach(i => {
          const cost = productMap[String(i.code)]?.cost || i.cost || 0;
          totalCost += i.qty * cost;
        });
      });
      returns.forEach(r => {
        r.items.forEach(i => {
          const cost = productMap[String(i.code)]?.cost || i.cost || 0;
          totalCost -= i.qty * cost;
        });
      });
      document.getElementById('total-cogs').textContent = safe(totalCost).toFixed(2) + ' EGP';
    }

    if (type === 'profit') {
      let profit = 0;
      const calcProfit = (arr, sign = 1) => {
        arr.forEach(r => {
          r.items.forEach(i => {
            const cost = productMap[String(i.code)]?.cost || i.cost || 0;
            const discount = i.discount?.type === 'percent' ? (i.price * i.discount.value / 100) : i.discount?.value || 0;
            const net = i.price - discount;
            profit += sign * i.qty * (net - cost);
          });
        });
      };
      calcProfit(finished, 1);
      calcProfit(returns, -1);
      document.getElementById('total-profit').textContent = safe(profit).toFixed(2) + ' EGP';
    }

    if (type === 'returns') {
      const total = returns.reduce((sum, r) => {
        let d = 0;
        r.items.forEach(i => {
          const discount = i.discount?.type === 'percent' ? i.price * i.discount.value / 100 : i.discount?.value || 0;
          const net = i.price - discount;
          d += i.qty * net;
        });
        return sum + d;
      }, 0);
      document.getElementById('total-returns').textContent = safe(total).toFixed(2) + ' EGP';
    }

    if (type === 'by-product') {
  const map = {};
  receipts.forEach(r => {
    r.items.forEach(i => {
      const code = String(i.code);
      if (!map[code]) {
        const product = productMap[code];
        map[code] = {
          code,
          name: product?.name || i.name || t("Unknown", "غير معروف"),
          category: product?.category || t("Uncategorized", "بدون تصنيف"),
          stock: product?.stock || 0,
          qty: 0,
          totalBefore: 0,
          discount: 0,
          totalAfter: 0
        };
      }

      const discountValue = i.discount?.type === 'percent'
        ? i.price * i.discount.value / 100
        : i.discount?.value || 0;

      const net = i.price - discountValue;

      map[code].qty += i.qty;
      map[code].totalBefore += i.qty * i.price;
      map[code].discount += discountValue * i.qty;
      map[code].totalAfter += i.qty * net;
    });
  });

  renderTable('table-by-product', map,
    ['code', 'name', 'stock', 'qty', 'totalBefore', 'discount', 'totalAfter'],
    [
      t("Code", "الكود"),
      t("Name", "الاسم"),
      t("Stock Quantity", "الكمية بالمخزون"),
      t("Sold Quantity", "الكمية المباعة"),
      t("Total Before Discount", "الإجمالي قبل الخصم"),
      t("Discount", "الخصم"),
      t("Net Sales", "الصافي بعد الخصم")
    ]);
}


    if (type === 'by-category') {
      const categoryMap = {};
      receipts.forEach(r => {
        r.items.forEach(i => {
          const code = String(i.code);
          const category = productMap[code]?.category || t("Uncategorized", "بدون تصنيف");
          if (!categoryMap[category]) categoryMap[category] = { category, qty: 0, total: 0 };
          const discount = i.discount?.type === 'percent'
            ? i.price * i.discount.value / 100
            : i.discount?.value || 0;
          const net = i.price - discount;
          categoryMap[category].qty += i.qty;
          categoryMap[category].total += i.qty * net;
        });
      });
      renderTable('table-by-category', categoryMap, ['category', 'qty', 'total'], [
        t("Category", "التصنيف"),
        t("Saled Quantity", "الكمية المباعة"),
        t("Total Sales EGP", "إجمالي المبيعات")
      ]);
    }

    if (type === 'by-user') {
      const map = {};
      receipts.forEach(r => {
        const cashier = r.cashier || t("Unknown", "غير معروف");
        if (!map[cashier]) map[cashier] = { cashier, total: 0, discount: 0, net: 0 };

        r.items.forEach(i => {
          const discount = i.discount?.type === 'percent'
            ? i.price * i.discount.value / 100 * i.qty
            : i.discount?.value * i.qty || 0;

          const total = i.qty * i.price;
          map[cashier].total += total;
          map[cashier].discount += discount;
          map[cashier].net += (total - discount);
        });
      });

      renderTable('table-by-user', map, ['cashier', 'total', 'discount', 'net'], [
        t("Cashier", "الكاشير"),
        t("Total Sales EGP", "إجمالي المبيعات"),
        t("Total Discount EGP", "إجمالي الخصومات"),
        t("Net Sales EGP", "صافي المبيعات")
      ]);
    }
  }
function generateStockValueReport() {
    const products = JSON.parse(localStorage.getItem('products') || '[]');
    const table = document.getElementById('table-stock-value');
    table.innerHTML = '';

    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
      <th>${t('Category', 'التصنيف')}</th>
      <th>${t('Total Stock Cost', 'إجمالي تكلفة المخزون')} (ج.م)</th>
    `;
    table.appendChild(headerRow);

    const categoryMap = {};
    let grandTotal = 0;

    products.forEach(p => {
      const category = p.category || t('Uncategorized', 'غير مصنف');
      const cost = parseFloat(p.cost || 0);
      const stock = parseFloat(p.stock || 0);
      const total = cost * stock;
      if (!categoryMap[category]) categoryMap[category] = 0;
      categoryMap[category] += total;
      grandTotal += total;
    });

    for (const category in categoryMap) {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${category}</td>
        <td>${categoryMap[category].toFixed(2)}</td>
      `;
      table.appendChild(row);
    }

    const finalRow = document.createElement('tr');
    finalRow.innerHTML = `
      <td><strong>${t('Total', 'الإجمالي')}</strong></td>
      <td><strong>${grandTotal.toFixed(2)}</strong></td>
    `;
    table.appendChild(finalRow);
  }
  function renderTable(tableId, dataMap, fields, headers) {
    const table = document.getElementById(tableId);
    table.innerHTML = '';
    const thead = table.insertRow();
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      thead.appendChild(th);
    });

    Object.values(dataMap).forEach(row => {
      const tr = table.insertRow();
      fields.forEach(field => {
        const td = tr.insertCell();
        td.textContent = (row[field] || 0).toFixed ? row[field].toFixed(2) : row[field];
      });
    });
  }

  function getAllReceipts() {
    const receipts = [];
    for (let key in localStorage) {
      if (key.startsWith('receipt_')) {
        try {
          const r = JSON.parse(localStorage.getItem(key));
          if (r && typeof r === 'object') receipts.push(r);
        } catch {}
      }
    }
    return receipts;
  }

  function updateHeaders() {
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
      const key = el.dataset.i18nKey;
      if (Array.isArray(key)) return;
      el.textContent = t(key, el.dataset.i18nAr);
    });
  }

  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  if (currentUser.role === 'admin') {
    document.querySelectorAll('.admin-only').forEach(e => e.style.display = 'block');
  }

  updateHeaders();
  runReport('sales');
});
