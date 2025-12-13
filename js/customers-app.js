/**
 * Customer & Vehicle Management Logic
 * Uses db.js and EnhancedSecurity
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
    // Check Auth
    if (!window.isSessionValid()) {
        window.location.href = 'index.html';
        return;
    }

    // User Info
    const user = window.getCurrentUser();
    if (user) {
        document.getElementById('currentUserName').textContent = user.fullName;
        document.getElementById('userRole').textContent = user.role;
    }

    // Initial Load
    renderApp();

    // Re-render when language changes
    window.addEventListener('languageChanged', () => {
        renderApp();
    });
});

// === RENDER ===
function renderApp() {
    const container = document.getElementById('customersContainer');
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();

    container.innerHTML = '';

    let customers = window.DB.getCustomers();
    const vehicles = window.DB.getVehicles();

    // Filter
    if (searchTerm) {
        customers = customers.filter(c => {
            const matchName = c.name.toLowerCase().includes(searchTerm);
            const matchMobile = c.mobile.includes(searchTerm);

            // Search in vehicles too
            const customerVehicles = vehicles.filter(v => v.customerId === c.id);
            const matchPlate = customerVehicles.some(v => v.plateNumber.toLowerCase().includes(searchTerm));

            return matchName || matchMobile || matchPlate;
        });
    }

    // Sort newest first
    customers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    if (customers.length === 0) {
        container.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#666;">${t('No customers found.', 'لا يوجد عملاء.')}</p>`;
        return;
    }

    customers.forEach(c => {
        const cVehicles = vehicles.filter(v => v.customerId === c.id);

        const card = document.createElement('div');
        card.className = 'customer-card';
        card.innerHTML = `
            <h3>${c.name}</h3>
            <p>📱 ${c.mobile}</p>
            ${c.notes ? `<p style="font-size:0.9em;">📝 ${c.notes}</p>` : ''}
            
            <div style="margin-top:10px;">
                ${cVehicles.length > 0 ?
                cVehicles.map(v => `<span class="vehicle-badge">🚗 ${v.brand} ${v.model} (${v.plateNumber})</span>`).join(' ')
                : `<span style="color:#999;font-size:0.8em;">${t('No vehicles', 'لا يوجد مركبات')}</span>`}
            </div>

            <div class="action-row">
                <button class="btn btn-sm btn-info" onclick="openDetails(${c.id})">📋 ${t('Details', 'التفاصيل')}</button>
                <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${c.id})">🗑️</button>
            </div>
        `;
        container.appendChild(card);
    });
}

// === CUSTOMER CRUD ===
function openAddCustomerModal() {
    document.getElementById('customerForm').reset();
    document.getElementById('customerId').value = '';
    document.getElementById('modalTitle').textContent = t('Add Customer', 'إضافة عميل'); // Simplified

    // Show the "First Vehicle" fieldset for new customers
    document.querySelector('#customerModal fieldset').style.display = 'block';

    document.getElementById('customerModal').style.display = 'flex';
}

function handleCustomerSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('customerId').value; // if empty, new
    const name = document.getElementById('custName').value.trim();
    const mobile = document.getElementById('custMobile').value.trim();
    const notes = document.getElementById('custNotes').value.trim();

    const customer = {
        id: id ? parseInt(id) : Date.now(),
        name,
        mobile,
        notes
    };

    window.DB.saveCustomer(customer);

    // If new customer, check if vehicle data entered
    if (!id) {
        const plate = document.getElementById('vehiclePlate').value.trim();
        const brand = document.getElementById('vehicleBrand').value.trim();

        if (plate || brand) {
            const vehicle = {
                customerId: customer.id,
                plateNumber: plate,
                brand: brand,
                model: document.getElementById('vehicleModel').value.trim(),
                year: document.getElementById('vehicleYear').value.trim()
            };
            window.DB.saveVehicle(vehicle);
        }
    }

    renderApp();
    closeModal('customerModal');
}

function deleteCustomer(id) {
    if (confirm(t('delete_customer_confirm'))) {
        window.DB.deleteCustomer(id);
        const vehicles = window.DB.getVehicles(id);
        vehicles.forEach(v => window.DB.deleteVehicle(v.id));
        renderApp();
    }
}

// === DETAILS & VEHICLES ===
function openDetails(customerId) {
    currentCustomerIdForDetails = customerId;
    const customers = window.DB.getCustomers();
    const c = customers.find(x => x.id === customerId);
    if (!c) return;

    // Show Customer Info
    const infoDiv = document.getElementById('customerInfoDisplay');
    infoDiv.innerHTML = `
        <h2 style="margin:0;">${c.name}</h2>
        <p>📱 ${c.mobile}</p>
        <p>📝 ${c.notes || 'No notes'}</p>
    `;

    renderVehiclesList(customerId);

    document.getElementById('detailsModal').style.display = 'flex';
}

function renderVehiclesList(customerId) {
    const list = document.getElementById('vehiclesList');
    list.innerHTML = '';

    const vehicles = window.DB.getVehicles(customerId);

    if (vehicles.length === 0) {
        list.innerHTML = `<p style="color:#777;">${t('No vehicles registered.', 'لا يوجد مركبات مسجلة.')}</p>`;
        return;
    }

    vehicles.forEach(v => {
        const item = document.createElement('div');
        item.className = 'vehicle-list-item';
        item.innerHTML = `
            <div class="vehicle-header">
                <span>${v.brand} ${v.model} (${v.year || '-'})</span>
                <span style="background:#333;color:#fff;padding:2px 5px;border-radius:3px;">${v.plateNumber}</span>
            </div>
            <div style="font-size:0.9em;color:#555;margin-top:5px;">
                <div>🎨 ${t('Color', 'اللون')}: ${v.color || '-'}</div>
                <div>🔢 VIN: ${v.vin || v.vChassis || '-'}</div>
                <div>⚙️ Engine: ${v.engineNo || v.vEngine || '-'}</div>
            </div>
            <div style="text-align:right;margin-top:5px;">
                <button class="btn btn-sm btn-danger" onclick="deleteVehicle(${v.id})">${t('Delete', 'حذف')}</button>
            </div>
        `;
        list.appendChild(item);
    });
}

// === VEHICLE CRUD ===
function openAddVehicleModal() {
    document.getElementById('vehicleForm').reset();
    document.getElementById('vehicleCustomerId').value = currentCustomerIdForDetails;
    document.getElementById('vehicleModal').style.display = 'flex';
}

function handleVehicleSubmit(e) {
    e.preventDefault();
    const customerId = parseInt(document.getElementById('vehicleCustomerId').value);

    const vehicle = {
        customerId: customerId,
        plateNumber: document.getElementById('vPlate').value.trim(),
        brand: document.getElementById('vBrand').value.trim(),
        model: document.getElementById('vModel').value.trim(),
        year: document.getElementById('vYear').value.trim(),
        color: document.getElementById('vColor').value.trim(),
        vin: document.getElementById('vChassis').value.trim(),
        engineNo: document.getElementById('vEngine').value.trim(),
    };

    window.DB.saveVehicle(vehicle);
    closeModal('vehicleModal');
    renderVehiclesList(customerId); // refresh list in details modal
    renderApp(); // refresh main grid badges
}

function deleteVehicle(id) {
    if (confirm(t('delete_vehicle_confirm'))) {
        window.DB.deleteVehicle(id);
        renderVehiclesList(currentCustomerIdForDetails);
        renderApp();
    }
}

// === UTILS ===
function closeModal(id) {
    document.getElementById(id).style.display = 'none';
}

function confirmLogout() {
    if (confirm(t('confirm_logout'))) {
        window.logout();
        window.location.href = 'index.html';
    }
}
