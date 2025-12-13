// salesmen-app.js

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('salesman-form');
  const targetForm = document.getElementById('target-form');
  const nameInput = document.getElementById('salesman-name');
  const salesmenTable = document.getElementById('salesmen-body');
  const targetSalesman = document.getElementById('target-salesman');
  const targetMonth = document.getElementById('target-month');
  const targetYear = document.getElementById('target-year');
  const targetValue = document.getElementById('target-value');
  const targetsTable = document.getElementById('monthly-targets-body');
  const performanceTable = document.getElementById('salesmen-performance-body');

  let lang = localStorage.getItem('pos_language') || 'en';
  const t = (en, ar) => lang === 'ar' ? ar : en;

  // === Language switcher ===
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const selectedLang = btn.dataset.lang;
      localStorage.setItem('pos_language', selectedLang);
      lang = selectedLang;
      applyTranslations();
    });
  });

  function applyTranslations() {
    document.querySelectorAll('[data-i18n-key]').forEach(el => {
      const ar = el.getAttribute('data-i18n-ar');
      const en = el.textContent; // fallback
      if (lang === 'ar' && ar) {
        el.textContent = ar;
        document.documentElement.setAttribute("dir", "rtl");
      } else {
        el.textContent = el.getAttribute('data-i18n-key');
        document.documentElement.setAttribute("dir", "ltr");
      }
    });
  }

  // ==== Populate month and year dropdowns ====
  for (let m = 1; m <= 12; m++) {
    const opt = document.createElement('option');
    opt.value = m;
    opt.textContent = m;
    targetMonth.appendChild(opt);
  }

  const currentYear = new Date().getFullYear();
  for (let y = currentYear - 3; y <= currentYear + 5; y++) {
    const opt = document.createElement('option');
    opt.value = y;
    opt.textContent = y;
    targetYear.appendChild(opt);
  }
  targetMonth.value = new Date().getMonth() + 1;
  targetYear.value = currentYear;

  // ==== Add salesman ====
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = nameInput.value.trim();
    if (!name) return;

    const salesmen = getSalesmen();
    salesmen.push({ id: Date.now(), name });
    localStorage.setItem('salesmen', JSON.stringify(salesmen));
    nameInput.value = '';
    renderSalesmen();
    renderSalesmanOptions();
    renderPerformance();
  });

  // ==== Add monthly target ====
  targetForm.addEventListener('submit', e => {
    e.preventDefault();
    const salesman = targetSalesman.value;
    const month = parseInt(targetMonth.value);
    const year = parseInt(targetYear.value);
    const target = parseFloat(targetValue.value);
    if (!salesman || isNaN(month) || isNaN(year) || isNaN(target)) return;

    const targets = getMonthlyTargets();
    const existing = targets.find(t => t.name === salesman && t.month === month && t.year === year);
    if (existing) {
      existing.target = target;
    } else {
      targets.push({ name: salesman, month, year, target });
    }
    localStorage.setItem('monthlyTargets', JSON.stringify(targets));
    renderMonthlyTargets();
    renderPerformance();
    targetForm.reset();
    targetMonth.value = new Date().getMonth() + 1;
    targetYear.value = currentYear;
  });

  function getSalesmen() {
    return JSON.parse(localStorage.getItem('salesmen') || '[]');
  }

  function getMonthlyTargets() {
    return JSON.parse(localStorage.getItem('monthlyTargets') || '[]');
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

  function renderSalesmen() {
    const salesmen = getSalesmen();
    salesmenTable.innerHTML = '';
    salesmen.forEach(s => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${s.name}</td>
        <td><button onclick="deleteSalesman(${s.id})">🗑️</button></td>
      `;
      salesmenTable.appendChild(row);
    });
  }

  window.deleteSalesman = function (id) {
    const salesmen = getSalesmen().filter(s => s.id !== id);
    localStorage.setItem('salesmen', JSON.stringify(salesmen));
    renderSalesmen();
    renderSalesmanOptions();
    renderPerformance();
  };

  function renderSalesmanOptions() {
    const salesmen = getSalesmen();
    targetSalesman.innerHTML = '<option value="">--</option>';
    salesmen.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.name;
      opt.textContent = s.name;
      targetSalesman.appendChild(opt);
    });
  }

  function renderMonthlyTargets() {
    const targets = getMonthlyTargets();
    targetsTable.innerHTML = '';
    targets.forEach(t => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.name}</td>
        <td>${t.month}</td>
        <td>${t.year}</td>
        <td>${t.target.toFixed(2)} EGP</td>
      `;
      targetsTable.appendChild(row);
    });
  }

  function renderPerformance() {
    const receipts = getAllReceipts();
    const targets = getMonthlyTargets();
    performanceTable.innerHTML = '';

    targets.forEach(t => {
      const achieved = receipts
        .filter(r => r.salesman === t.name && r.status === 'finished')
        .filter(r => {
          const d = new Date(r.date);
          return d.getMonth() + 1 === t.month && d.getFullYear() === t.year;
        })
        .reduce((sum, r) => {
          const gross = r.items.reduce((acc, i) => acc + (i.qty * i.price), 0);
          const discount = r.items.reduce((acc, i) => {
            if (i.discount?.type === 'percent') return acc + (i.price * i.discount.value / 100) * i.qty;
            return acc + (i.discount?.value || 0) * i.qty;
          }, 0);
          return sum + (gross - discount);
        }, 0);

      const percent = t.target > 0 ? (achieved / t.target * 100).toFixed(1) : '0.0';

      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${t.name}</td>
        <td>${t.month}</td>
        <td>${t.year}</td>
        <td>${t.target.toFixed(2)} EGP</td>
        <td>${achieved.toFixed(2)} EGP</td>
        <td>${percent} %</td>
      `;
      performanceTable.appendChild(row);
    });
  }

  // Initial rendering
  renderSalesmen();
  renderSalesmanOptions();
  renderMonthlyTargets();
  renderPerformance();
  applyTranslations(); // <== Apply language on load
});
