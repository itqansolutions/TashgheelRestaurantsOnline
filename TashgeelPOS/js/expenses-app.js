document.addEventListener('DOMContentLoaded', () => {
  const lang = localStorage.getItem('pos_language') || 'en';
  const t = (en, ar) => lang === 'ar' ? ar : en;

  const expenseDateInput = document.getElementById('expenseDate');
  const sellerSelect = document.getElementById('expenseSeller');
  const filterSeller = document.getElementById('filterSeller');
  const expensesTableBody = document.getElementById('expensesTableBody');
  const totalExpenses = document.getElementById('totalExpenses');

  // === إعداد التاريخ الحالي ===
  expenseDateInput.valueAsDate = new Date();
  document.getElementById('filterDate').valueAsDate = new Date();

  // === تحميل البياعين ===
  function loadSellers() {
    const salesmen = JSON.parse(localStorage.getItem("salesmen") || "[]");
    if (!sellerSelect || !filterSeller) return;

    sellerSelect.innerHTML = '<option value="">--</option>';
    filterSeller.innerHTML = '<option value="">--</option>';

    salesmen.forEach(s => {
      const name = s.name;
      if (!name) return;

      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      sellerSelect.appendChild(opt);

      const opt2 = opt.cloneNode(true);
      filterSeller.appendChild(opt2);
    });
  }

  loadSellers();
  renderExpenses();

  // === إضافة مصروف جديد ===
  window.addExpense = function () {
    const date = expenseDateInput.value;
    const seller = sellerSelect.value;
    const desc = document.getElementById('expenseDesc').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const method = document.getElementById('expenseMethod').value;

    if (!date || !seller || !desc || isNaN(amount) || amount <= 0) {
      alert(t("Please fill all fields correctly", "يرجى ملء جميع الحقول بشكل صحيح"));
      return;
    }

    const id = generateExpenseId();
    const expense = { id, date, seller, description: desc, amount, method };

    localStorage.setItem('expense_' + id, JSON.stringify(expense));
    renderExpenses();
    clearForm();
  };

  function generateExpenseId() {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    let counter = 1;
    while (localStorage.getItem('expense_' + today + '_' + String(counter).padStart(4, '0'))) {
      counter++;
    }
    return today + '_' + String(counter).padStart(4, '0');
  }

  function clearForm() {
    document.getElementById('expenseDesc').value = '';
    document.getElementById('expenseAmount').value = '';
    document.getElementById('expenseMethod').value = 'cash';
  }

  function getFilteredExpenses() {
    const all = [];
    for (let key in localStorage) {
      if (key.startsWith('expense_')) {
        try {
          const e = JSON.parse(localStorage.getItem(key));
          all.push(e);
        } catch {}
      }
    }

    const selectedDate = document.getElementById('filterDate').value;
    const selectedSeller = filterSeller.value;

    return all.filter(e => {
      const matchDate = selectedDate ? e.date === selectedDate : true;
      const matchSeller = selectedSeller ? e.seller === selectedSeller : true;
      return matchDate && matchSeller;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }

  function renderExpenses() {
    const expenses = getFilteredExpenses();
    expensesTableBody.innerHTML = '';
    let total = 0;

    expenses.forEach((e, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td>${e.date}</td>
        <td>${e.seller}</td>
        <td>${e.description}</td>
        <td>${e.amount.toFixed(2)}</td>
        <td>${t(methodLabel(e.method, 'en'), methodLabel(e.method, 'ar'))}</td>
        <td><button onclick="deleteExpense('${e.id}')">🗑️</button></td>
      `;
      expensesTableBody.appendChild(tr);
      total += e.amount;
    });

    totalExpenses.innerHTML = `💰 ${t("Total", "الإجمالي")}: ${total.toFixed(2)} ج.م`;
  }

  function methodLabel(method, language) {
    const labels = {
      en: { cash: "Cash", card: "Card", mobile: "Mobile" },
      ar: { cash: "نقدي", card: "بطاقة", mobile: "موبايل" }
    };
    return labels[language][method] || method;
  }

  window.deleteExpense = function (id) {
    if (confirm(t("Delete this expense?", "هل تريد حذف هذا المصروف؟"))) {
      localStorage.removeItem('expense_' + id);
      renderExpenses();
    }
  };

  window.filterExpenses = renderExpenses;

  window.resetFilter = function () {
    document.getElementById('filterDate').valueAsDate = new Date();
    document.getElementById('filterSeller').value = '';
    renderExpenses();
  };
});
