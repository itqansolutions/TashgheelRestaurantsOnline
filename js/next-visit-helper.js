// Add this to visits-app.js - Next Visit Scheduling Functions

// Toggle next visit fields visibility
window.toggleNextVisitFields = function () {
    const checkbox = document.getElementById('scheduleNextVisit');
    const fields = document.getElementById('nextVisitFields');
    if (fields && checkbox) {
        fields.style.display = checkbox.checked ? 'block' : 'none';
    }
};

// Save next visit data when saving visit
// Add this code to your existing saveVisit function after line 404:
/*
    // Next visit scheduling (optional)
    const scheduleNext = document.getElementById('scheduleNextVisit')?.checked || false;
    if (scheduleNext) {
        currentVisit.nextVisit = {
            date: document.getElementById('nextVisitDate')?.value || '',
            service: document.getElementById('nextVisitService')?.value || '',
            notes: document.getElementById('nextVisitNotes')?.value || ''
        };
    } else {
        currentVisit.nextVisit = null;
    }
*/

// Render upcoming visits on customers page
window.renderUpcomingVisits = function () {
    const card = document.getElementById('upcomingVisitsCard');
    const list = document.getElementById('upcomingVisitsList');

    if (!card || !list) return;

    // Get all visits with next visit scheduled
    const visits = window.DB ? window.DB.getVisits() : [];
    const upcomingVisits = visits
        .filter(v => v.nextVisit && v.nextVisit.date)
        .map(v => {
            const customer = window.DB.getCustomers().find(c => c.id === v.customerId);
            const vehicle = window.DB.getVehicles().find(veh => veh.id === v.vehicleId);
            return {
                ...v.nextVisit,
                customerName: customer?.name || 'Unknown',
                customerMobile: customer?.mobile || '',
                vehiclePlate: vehicle?.plateNumber || '',
                visitId: v.id
            };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (upcomingVisits.length === 0) {
        card.style.display = 'none';
        return;
    }

    card.style.display = 'block';
    list.innerHTML = upcomingVisits.map(uv => {
        const visitDate = new Date(uv.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const daysUntil = Math.ceil((visitDate - today) / (1000 * 60 * 60 * 24));

        let urgencyColor = '#2196f3';
        let urgencyText = `in ${daysUntil} days`;

        if (daysUntil < 0) {
            urgencyColor = '#f44336';
            urgencyText = `${Math.abs(daysUntil)} days overdue`;
        } else if (daysUntil === 0) {
            urgencyColor = '#ff9800';
            urgencyText = 'Today';
        } else if (daysUntil <= 3) {
            urgencyColor = '#ff9800';
        }

        return `
            <div style="padding:12px; margin-bottom:10px; background:white; border-radius:6px; border-left:4px solid ${urgencyColor}; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                <div style="display:flex; justify-content:space-between; align-items:start; gap:15px;">
                    <div style="flex:1;">
                        <div style="margin-bottom:6px;">
                            <strong style="color:#1976d2; font-size:1.1em;">${uv.customerName}</strong>
                            <span style="color:#666; margin-left:12px; font-size:0.9em;">📱 ${uv.customerMobile}</span>
                            <span style="color:#666; margin-left:12px; font-size:0.9em;">🚗 ${uv.vehiclePlate}</span>
                        </div>
                        <div style="color:#666; font-size:0.95em; margin-bottom:4px;">
                            📅 ${visitDate.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                        <div style="margin-top:8px;">
                            <strong style="color:#333;">Service:</strong> 
                            <span style="color:#2196f3; font-weight:500;">${uv.service || 'Not specified'}</span>
                        </div>
                        ${uv.notes ? `<div style="margin-top:6px; padding:8px; background:#f5f5f5; border-radius:4px; font-size:0.9em; color:#666;"><em>${uv.notes}</em></div>` : ''}
                    </div>
                    <div style="text-align:center; min-width:90px;">
                        <div style="padding:6px 12px; background:${urgencyColor}; color:white; border-radius:20px; font-size:0.85em; font-weight:600; white-space:nowrap; margin-bottom:8px;">
                            ${urgencyText}
                        </div>
                        ${daysUntil <= 3 && daysUntil >= 0 ? '<div style="font-size:0.75em; color:#ff9800;">⚠️ Soon</div>' : ''}
                        ${daysUntil < 0 ? '<div style="font-size:0.75em; color:#f44336;">⚠️ Overdue</div>' : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');
};

// Call this on customers page load
if (document.getElementById('upcomingVisitsCard')) {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof window.renderUpcomingVisits === 'function') {
            window.renderUpcomingVisits();
        }
    });
}
