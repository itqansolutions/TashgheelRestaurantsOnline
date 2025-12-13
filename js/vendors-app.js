/**
 * Vendor Management Logic
 */

// Hybrid Translation Helper
const t = (keyOrEn, ar) => {
    const lang = localStorage.getItem('pos_language') || 'en';
    if (ar) return lang === 'ar' ? ar : keyOrEn;
    if (window.translations && window.translations[keyOrEn]) {
        return window.translations[keyOrEn][lang];
    }
    return keyOrEn;
};

document.addEventListener('DOMContentLoaded', () => {
    console.log('Vendors page loading...');

    if (!window.isSessionValid()) {
        console.log('Session invalid, redirecting...');
        window.location.href = 'index.html';
        return;
    }

    console.log('Session valid, rendering vendors...');
    try {
        renderVendors();
    } catch (error) {
        console.error('Error rendering vendors:', error);
        alert(t('vendor_load_error') + error.message);
    }

    // Re-render when language changes
    window.addEventListener('languageChanged', () => {
        renderVendors();
    });
});

function renderVendors() {
    console.log('renderVendors called');
    const container = document.getElementById('vendorsContainer');

    if (!container) {
        console.error('vendorsContainer element not found!');
        return;
    }

    const vendors = window.DB.getVendors();
    console.log('Vendors loaded:', vendors.length);

    container.innerHTML = '';

    if (vendors.length === 0) {
        container.innerHTML = `<p style="text-align:center;color:#666;">${t('No vendors yet. Add one to get started.', 'لا يوجد موردين بعد. أضف مورد للبدء.')}</p>`;
        return;
    }

    vendors.forEach(v => {
        const card = document.createElement('div');
        card.className = 'vendor-card';

        const creditClass = v.credit > 0 ? 'credit-negative' : v.credit < 0 ? 'credit-positive' : '';
        const creditLabel = v.credit > 0 ? t('We Owe', 'علينا') : v.credit < 0 ? t('They Owe', 'لنا') : t('Settled', 'خالص');

        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h3>${v.name}</h3>
                    <p style="margin:5px 0; color:#666;">📱 ${v.mobile || 'N/A'}</p>
                    <p style="margin:5px 0; color:#666;">📍 ${v.address || 'N/A'}</p>
                </div>
                <div style="text-align:right;">
                    <div class="${creditClass}" style="font-size:1.2em; margin-bottom:10px;">
                        ${creditLabel}: ${Math.abs(v.credit || 0).toFixed(2)}
                    </div>
                    <button class="btn btn-sm btn-success" onclick="openPaymentModal(${v.id})" ${v.credit <= 0 ? 'disabled' : ''}>💰 ${t('Pay', 'دفع')}</button>
                    <button class="btn btn-sm btn-info" onclick="printVendorReport('${v.id}')">📄 ${t('Report', 'تقرير')}</button>
                    <button class="btn btn-sm btn-secondary" onclick="editVendor(${v.id})">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteVendor(${v.id})">🗑️</button>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function openAddVendorModal() {
    document.getElementById('vendorForm').reset();
    document.getElementById('vendorId').value = '';
    document.getElementById('vendorModalTitle').textContent = t('Add Vendor', 'إضافة مورد');
    document.getElementById('vendorModal').style.display = 'flex';
}

function editVendor(id) {
    const vendor = window.DB.getVendors().find(v => v.id === id);
    if (!vendor) return;

    document.getElementById('vendorId').value = vendor.id;
    document.getElementById('vendorName').value = vendor.name;
    document.getElementById('vendorMobile').value = vendor.mobile || '';
    document.getElementById('vendorAddress').value = vendor.address || '';
    document.getElementById('vendorModalTitle').textContent = t('Edit Vendor', 'تعديل مورد');
    document.getElementById('vendorModal').style.display = 'flex';
}

function handleVendorSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('vendorId').value;
    const vendor = {
        id: id ? parseInt(id) : Date.now(),
        name: document.getElementById('vendorName').value.trim(),
        mobile: document.getElementById('vendorMobile').value.trim(),
        address: document.getElementById('vendorAddress').value.trim()
    };

    console.log('Saving vendor:', vendor);
    const success = window.DB.saveVendor(vendor);
    console.log('Save result:', success);

    closeModal('vendorModal');
    renderVendors();

    if (!id) {
        alert(t('vendor_added'));
    } else {
        alert(t('vendor_updated'));
    }
}

function deleteVendor(id) {
    if (confirm(t('delete_vendor_confirm'))) {
        window.DB.deleteVendor(id);
        renderVendors();
    }
}

function openPaymentModal(vendorId) {
    const vendor = window.DB.getVendors().find(v => v.id === vendorId);
    if (!vendor) return;

    document.getElementById('paymentVendorId').value = vendor.id;
    document.getElementById('paymentVendorName').value = vendor.name;
    document.getElementById('paymentCurrentCredit').value = (vendor.credit || 0).toFixed(2);
    document.getElementById('paymentAmount').value = '';
    document.getElementById('paymentNotes').value = '';

    document.getElementById('paymentModal').style.display = 'flex';
}

function handlePaymentSubmit(e) {
    e.preventDefault();

    const vendorId = parseInt(document.getElementById('paymentVendorId').value);
    const amount = parseFloat(document.getElementById('paymentAmount').value);
    const notes = document.getElementById('paymentNotes').value.trim();

    if (amount <= 0) {
        alert(t('payment_amount_error'));
        return;
    }

    window.DB.recordVendorPayment(vendorId, amount, notes);

    alert(t('payment_recorded'));
    closeModal('paymentModal');
    renderVendors();
}

// Print Vendor Transaction Report
window.printVendorReport = function printVendorReport(vendorId) {
    console.log('printVendorReport called with vendorId:', vendorId);
    const vendor = window.DB.getVendor(vendorId);
    if (!vendor) {
        console.error('Vendor not found:', vendorId);
        return;
    }

    const payments = window.DB.getVendorPayments(vendorId);

    // Get all transactions (purchases from parts + payments)
    const parts = window.DB.getParts();
    console.log('All parts:', parts);
    console.log('Looking for vendorId:', vendorId);

    const vendorParts = parts.filter(p => p.vendorId == vendorId);
    console.log('Vendor parts found:', vendorParts);

    const purchases = vendorParts.map(p => {
        // Use initialStock if available (original purchase), otherwise current stock
        const quantity = p.initialStock || p.stock || 0;
        const unitCost = p.cost || 0;
        const amount = unitCost * quantity;

        console.log(`Part: ${p.name}, cost: ${unitCost}, quantity: ${quantity}, amount: ${amount}`);

        return {
            date: p.createdAt || p.lastRestockDate || new Date().toISOString(),
            type: 'Purchase',
            amount: amount,
            description: `${p.name} - ${quantity} units @ ${unitCost.toFixed(2)}`
        };
    }).filter(p => p.amount > 0);

    console.log('Purchase transactions:', purchases);
    console.log('Payment transactions:', payments);

    // Combine and sort all transactions
    const allTransactions = [
        ...purchases,
        ...payments.map(pay => ({
            date: pay.date,
            type: 'Payment',
            amount: -pay.amount,
            description: pay.notes || 'Payment'
        }))
    ].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate running balance
    let balance = 0;
    const transactionsWithBalance = allTransactions.map(t => {
        balance += t.amount;
        return {
            ...t,
            balance,
            displayDate: t.date ? new Date(t.date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            }) : 'N/A'
        };
    });

    // Get shop settings
    const shopName = localStorage.getItem('shopName') || 'Tashgheel Services';
    const shopLogo = localStorage.getItem('shopLogo') || '';

    const lang = localStorage.getItem('pos_language') || 'en';
    const isRTL = lang === 'ar';

    const reportHTML = `
        <!DOCTYPE html>
        <html lang="${lang}" dir="${isRTL ? 'rtl' : 'ltr'}">
        <head>
            <title>Vendor Report - ${vendor.name}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 20px; direction: ${isRTL ? 'rtl' : 'ltr'}; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #2c3e50; padding-bottom: 20px; }
                .header img { max-height: 80px; margin-bottom: 10px; }
                .header h1 { margin: 10px 0; color: #2c3e50; }
                .vendor-info { background: #f8f9fa; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
                .vendor-info p { margin: 5px 0; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background: #34495e; color: white; padding: 12px; text-align: ${isRTL ? 'right' : 'left'}; }
                td { border: 1px solid #ddd; padding: 10px; }
                tr:nth-child(even) { background: #f8f9fa; }
                .purchase { color: #e74c3c; }
                .payment { color: #27ae60; }
                .balance { font-weight: bold; }
                .total-row { background: #ecf0f1; font-weight: bold; font-size: 1.1em; }
                .footer { margin-top: 30px; padding: 15px; background: #2c3e50; color: white; text-align: center; border-radius: 6px; }
                @media print {
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                ${shopLogo ? `<img src="${shopLogo}" alt="Logo">` : ''}
                <h1>${shopName}</h1>
                <h2>${t('Vendor Transaction Report', 'تقرير معاملات المورد')}</h2>
            </div>

            <div class="vendor-info">
                <h3>${t('Vendor', 'المورد')}: ${vendor.name}</h3>
                <p><strong>${t('Contact', 'جهة الاتصال')}:</strong> ${vendor.contact || 'N/A'}</p>
                <p><strong>${t('Phone', 'الهاتف')}:</strong> ${vendor.phone || 'N/A'}</p>
                <p><strong>${t('Report Date', 'تاريخ التقرير')}:</strong> ${new Date().toLocaleDateString()}</p>
            </div>

            <table>
                <thead>
                    <tr>
                        <th>${t('Date', 'التاريخ')}</th>
                        <th>${t('Type', 'النوع')}</th>
                        <th>${t('Description', 'الوصف')}</th>
                        <th>${t('Amount', 'المبلغ')}</th>
                        <th>${t('Balance', 'الرصيد')}</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactionsWithBalance.map(tr => `
                        <tr>
                            <td>${tr.displayDate}</td>
                            <td class="${tr.type.toLowerCase()}">${t(tr.type, tr.type === 'Purchase' ? 'شراء' : 'دفع')}</td>
                            <td>${tr.description}</td>
                            <td class="${tr.type === 'Purchase' ? 'purchase' : 'payment'}">
                                ${tr.type === 'Purchase' ? '+' : ''}${tr.amount.toFixed(2)}
                            </td>
                            <td class="balance">${tr.balance.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                    <tr class="total-row">
                        <td colspan="4" style="text-align: ${isRTL ? 'left' : 'right'};">${t('Current Balance:', 'الرصيد الحالي:')}</td>
                        <td class="balance">${vendor.credit.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="footer">
                <p><strong>Tashgheel Services</strong> - Powered by itqan solutions</p>
                <p>📧 info@itqansolutions.org | 📱 +201126522373 / +201155253886</p>
            </div>

            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; font-size: 1.1em; cursor: pointer;">🖨️ ${t('Print Report', 'طباعة التقرير')}</button>
                <button onclick="window.close()" style="padding: 10px 20px; font-size: 1.1em; cursor: pointer; margin-left: 10px;">${t('Close', 'إغلاق')}</button>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(reportHTML);
    printWindow.document.close();
}

function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

// setLanguage and handleLogout are now handled globally
